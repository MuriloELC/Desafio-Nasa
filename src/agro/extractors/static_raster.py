"""Import locally obtained ISRIC SoilGrids GeoTIFFs.
No fabricated download URL or silent unit conversion. Specify multiplier explicitly.
"""
from datetime import datetime
from pathlib import Path
from math import floor, ceil
import rasterio
import numpy as np
from rasterio.features import geometry_mask
from rasterio.warp import transform_geom
from rasterio.windows import from_bounds, Window
from shapely.geometry import mapping,shape
from agro.grid import subcells
from agro.storage import store

UPSERT='''INSERT INTO agro.static_properties(cell_id,source_id,metric,depth_top_cm,depth_bottom_cm,value,unit,quality,run_id)
VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT
(cell_id,source_id,metric,depth_top_cm,depth_bottom_cm) DO UPDATE SET
value=excluded.value,unit=excluded.unit,run_id=excluded.run_id'''

def means(path):
    with rasterio.open(path) as ds:
        if not ds.crs: raise ValueError('Raster missing CRS')
        for cid,cell in subcells():
            geo=transform_geom('EPSG:32720',ds.crs.to_string(),mapping(cell))
            bounds=shape(geo).bounds
            try:
                raw=from_bounds(*bounds,transform=ds.transform)
                win=Window(floor(raw.col_off),floor(raw.row_off),
                           ceil(raw.col_off+raw.width)-floor(raw.col_off),
                           ceil(raw.row_off+raw.height)-floor(raw.row_off))
                win=win.intersection(Window(0,0,ds.width,ds.height))
            except rasterio.errors.WindowError:
                continue
            if win.width<=0 or win.height<=0: continue
            values=ds.read(1,window=win,masked=True)
            mask=geometry_mask([geo],out_shape=values.shape,transform=ds.window_transform(win),invert=True,all_touched=True)
            good=mask & ~np.ma.getmaskarray(values) & np.isfinite(values.data)
            if good.any(): yield cid,float(np.mean(values.data[good]))

def load(conn,path,source,metric,unit,scale=1.0,top=0,bottom=0):
    from agro.db import run_start,run_finish,batch_execute
    if source != 'SOILGRIDS':
        raise ValueError('Source must be SOILGRIDS')
    path=Path(path)
    if not path.is_file(): raise FileNotFoundError(path)
    run_id=run_start(conn,'static_raster',source)
    count=0
    try:
        store(path,source,f'{source.lower()}/{path.name}',conn)
        rows=[(cid,source,metric,top,bottom,val*scale,unit,'estimated',run_id)
              for cid,val in means(path)]
        count=batch_execute(conn,UPSERT,rows)
        run_finish(conn,run_id,count)
        return count
    except Exception as e:
        conn.rollback();run_finish(conn,run_id,count,e)
        raise
