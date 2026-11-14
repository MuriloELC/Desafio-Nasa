from datetime import date
from io import BytesIO
import zipfile
import numpy as np
import rasterio
from rasterio.transform import from_origin

from agro.extractors import imerg
from agro.extractors.imerg import select_daily_zip
from agro.grid import E,N

def test_select_daily_zip():
    html='<a href="3B-DAY-GIS.MS.MRG.3IMERG.20261101-S000000-E235959.0000.V07.zip">zip</a>'
    assert select_daily_zip(html).endswith('V07.zip')


def test_download_replaces_corrupt_cached_zip(tmp_path, monkeypatch):
    day=date(2026,11,1)
    cached=tmp_path/'raw'/'imerg'/'20261101.zip'
    cached.parent.mkdir(parents=True)
    cached.write_bytes(b'incomplete download')
    monkeypatch.setattr(imerg,'data_dir',lambda:tmp_path)
    archive=BytesIO()
    with zipfile.ZipFile(archive,'w') as z:
        z.writestr('test.total.accum.tif',b'data')

    class Response:
        text='<a href="3B-DAY-GIS.MS.MRG.3IMERG.20261101-S000000-E235959.0000.V07B.zip">zip</a>'
        def __enter__(self): return self
        def __exit__(self,*args): pass
        def raise_for_status(self): pass
        def iter_content(self,_size): yield archive.getvalue()

    class Session:
        def get(self,url,**_kwargs): return Response()

    assert imerg.download(Session(),day)==cached
    assert zipfile.is_zipfile(cached)
    assert not cached.with_suffix('.zip.part').exists()


def test_cell_means_scales_daily_accumulation(tmp_path):
    path=tmp_path/'daily.total.accum.tif'
    with rasterio.open(path,'w',driver='GTiff',height=20,width=20,count=1,
                       dtype='uint16',crs='EPSG:32720',
                       transform=from_origin(E-125000,N+125000,12500,12500)) as ds:
        ds.write(np.full((20,20),10,dtype='uint16'),1)
    rows=list(imerg.cell_means(path))
    assert len(rows)==400
    assert all(value==1.0 and fraction==1.0 for _,value,fraction in rows)


def test_cell_means_excludes_pps_missing_value(tmp_path):
    path=tmp_path/'missing.total.accum.tif'
    values=np.full((20,20),10,dtype='uint16')
    values[10,10]=29999
    with rasterio.open(path,'w',driver='GTiff',height=20,width=20,count=1,
                       dtype='uint16',crs='EPSG:32720',
                       transform=from_origin(E-125000,N+125000,12500,12500)) as ds:
        ds.write(values,1)
    rows=list(imerg.cell_means(path))
    assert len(rows)==399
    assert all(value==1.0 for _,value,_ in rows)
