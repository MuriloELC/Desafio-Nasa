from datetime import date
from io import BytesIO
import zipfile

from agro.extractors import imerg
from agro.extractors.imerg import select_daily_zip

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
        text='<a href="3B-DAY-GIS.V07.zip">zip</a>'
        def __enter__(self): return self
        def __exit__(self,*args): pass
        def raise_for_status(self): pass
        def iter_content(self,_size): yield archive.getvalue()

    class Session:
        def get(self,url,**_kwargs): return Response()

    assert imerg.download(Session(),day)==cached
    assert zipfile.is_zipfile(cached)
    assert not cached.with_suffix('.zip.part').exists()
