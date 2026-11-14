"""IMERG V07 daily Final GIS ZIP => spatial mean for Cacoal 5-km cells.
PPS authorization is required. Uses day-by-day directory listing (no guessed filename).
"""
from datetime import date
from html.parser import HTMLParser
from urllib.parse import urljoin
from pathlib import Path
from math import floor, ceil
import zipfile
import requests
import numpy as np
import rasterio
from rasterio.mask import mask
from rasterio.features import geometry_mask
from rasterio.warp import transform_geom
from rasterio.windows import from_bounds, Window
from shapely.geometry import mapping
from agro.config import env,data_dir
from agro.grid import subcells
from agro.storage import store
from agro.http_range import HTTPRangeReader

BASE='https://arthurhouhttps.pps.eosdis.nasa.gov/gpmdata/'
class Hrefs(HTMLParser):
    def __init__(self): super().__init__();self.hrefs=[]
    def handle_starttag(self,tag,attrs):
        if tag=='a':
            href=dict(attrs).get('href')
            if href: self.hrefs.append(href)

def select_daily_zip(html):
    h=Hrefs();h.feed(html)
    files=[p for p in h.hrefs if '3B-DAY-GIS' in p and '.V07' in p and p.lower().endswith('.zip')]
    if not files: raise FileNotFoundError('IMERG Final V07 daily GIS ZIP not present in directory')
    return sorted(files)[-1]

def download(session,day:date,filename=None):
    directory=f'{BASE}{day:%Y/%m/%d}/gis/'
    if filename is None:
        response=session.get(directory,timeout=60)
        response.raise_for_status()
        filename=select_daily_zip(response.text)
    if f'.{day:%Y%m%d}-' not in filename or not filename.startswith('3B-DAY-GIS') or '/' in filename:
        raise ValueError(f'Unexpected IMERG daily filename for {day}: {filename}')
    remote=urljoin(directory,filename)
    target=data_dir()/'raw'/'imerg'/f'{day:%Y%m%d}.zip'
    target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists() and zipfile.is_zipfile(target): return target
    target.unlink(missing_ok=True)
    partial=target.with_suffix('.zip.part')
    try:
        with session.get(remote,timeout=300,stream=True) as r:
            r.raise_for_status()
            with partial.open('wb') as f:
                for chunk in r.iter_content(1024*1024):
                    if chunk: f.write(chunk)
        if not zipfile.is_zipfile(partial):
            raise ValueError('Downloaded file is not a ZIP (PPS authorization may be required)')
        partial.replace(target)
    finally:
        partial.unlink(missing_ok=True)
    return target

def extract_total_tif(zip_path):
    target=zip_path.with_suffix('.total.accum.tif')
    if target.exists() and target.stat().st_size>0:
        try:
            with rasterio.open(target) as ds:
                if ds.count and ds.crs: return target
        except rasterio.errors.RasterioIOError:
            pass
    target.unlink(missing_ok=True)
    partial=target.with_suffix(target.suffix+'.part')
    with zipfile.ZipFile(zip_path) as z:
        matches=[n for n in z.namelist() if n.lower().endswith('.total.accum.tif')]
        if len(matches)!=1: raise ValueError(f'Expected one total.accum.tif; got {matches}')
        with z.open(matches[0]) as f, partial.open('wb') as dest:
            import shutil
            shutil.copyfileobj(f,dest)
    partial.replace(target)
    return target


def extract_total_tif_remote(session,day,filename):
    target=data_dir()/'raw'/'imerg'/f'{day:%Y%m%d}.total.accum.tif'
    target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists() and target.stat().st_size>0:
        try:
            with rasterio.open(target) as ds:
                if ds.count and ds.crs: return target
        except rasterio.errors.RasterioIOError:
            pass
    target.unlink(missing_ok=True)
    partial=target.with_suffix(target.suffix+'.part')
    remote=urljoin(f'{BASE}{day:%Y/%m/%d}/gis/',filename)
    try:
        with HTTPRangeReader(session,remote) as reader, zipfile.ZipFile(reader) as archive:
            matches=[name for name in archive.namelist()
                     if name.lower().endswith('.total.accum.tif')]
            if len(matches)!=1:
                raise ValueError(f'Expected one total.accum.tif; got {matches}')
            with archive.open(matches[0]) as source, partial.open('wb') as dest:
                import shutil
                shutil.copyfileobj(source,dest)
        partial.replace(target)
    finally:
        partial.unlink(missing_ok=True)
    return target

def cell_means(tif_path):
    """Area fraction approximated by pixel-center masking; null/negative excluded.
    Native IMERG daily GIS accumulation is encoded 0.1 mm / integer count.
    """
    with rasterio.open(tif_path) as ds:
        for cid,geom in subcells():
            geo=transform_geom('EPSG:32720',ds.crs.to_string(),mapping(geom))
            from shapely.geometry import shape
            polygon=shape(geo)
            bounds=polygon.bounds
            raw=from_bounds(*bounds,transform=ds.transform)
            win=Window(floor(raw.col_off),floor(raw.row_off),
                       ceil(raw.col_off+raw.width)-floor(raw.col_off),
                       ceil(raw.row_off+raw.height)-floor(raw.row_off))
            try:
                win=win.intersection(Window(0,0,ds.width,ds.height))
            except rasterio.errors.WindowError:
                continue
            if win.width<=0 or win.height<=0: continue
            values=ds.read(1,window=win,masked=True)
            inside=geometry_mask([geo],out_shape=values.shape,transform=ds.window_transform(win),invert=True,all_touched=True)
            # PPS uses 29999 as missing data in the two-byte accumulation TIFF.
            valid=inside & ~np.ma.getmaskarray(values) & (values.data>=0) & (values.data!=29999)
            covered=int(inside.sum())
            if not valid.any(): continue
            yield cid,float(np.mean(values.data[valid])/10.0),float(valid.sum()/covered) if covered else 0

UPSERT='''INSERT INTO agro.cell_daily(cell_id,source_id,observed_on,metric,value,unit,quality,valid_fraction,run_id)
VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s)
ON CONFLICT(cell_id,source_id,observed_on,metric) DO UPDATE SET
 value=excluded.value,valid_fraction=excluded.valid_fraction,run_id=excluded.run_id'''

def load(conn,day,archive_raw=True,cleanup=False,filename=None,prepared_path=None):
    from agro.db import run_start,run_finish,batch_execute
    run_id=run_start(conn,'imerg_daily','IMERG_FINAL',day,day)
    count=0
    try:
        if prepared_path is not None:
            if archive_raw: raise ValueError('Prepared TIFF cannot archive the source ZIP')
            zip_path=None
            tif_path=Path(prepared_path)
        else:
            auth=None
            if env('PPS_USERNAME') and env('PPS_PASSWORD'):
                auth=(env('PPS_USERNAME'),env('PPS_PASSWORD'))
            with requests.Session() as session:
                if auth: session.auth=auth
                if filename and not archive_raw:
                    zip_path=None
                    tif_path=extract_total_tif_remote(session,day,filename)
                else:
                    zip_path=download(session,day,filename)
                    tif_path=extract_total_tif(zip_path)
        if archive_raw:
            store(zip_path,'IMERG_FINAL',f'imerg_final/{day:%Y/%m/%d}/source.zip',conn,day)
        rows=[(cid,'IMERG_FINAL',day,'precip_mm',val,'mm','estimated',coverage,run_id)
              for cid,val,coverage in cell_means(tif_path)]
        count=batch_execute(conn,UPSERT,rows)
        run_finish(conn,run_id,count)
        if cleanup:
            for path in (zip_path,tif_path):
                if path is None: continue
                try: path.unlink(missing_ok=True)
                except OSError: pass
        return count
    except Exception as e:
        conn.rollback();run_finish(conn,run_id,count,e)
        raise
