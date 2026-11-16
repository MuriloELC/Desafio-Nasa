from agro.http_range import HTTPRangeReader


def test_seek_and_read_across_blocks():
    payload=bytes(range(100))

    class Response:
        def __init__(self, content=b'', status=200, headers=None):
            self.content=content
            self.status_code=status
            self.headers=headers or {}
        def raise_for_status(self): pass

    class Session:
        def head(self,_url,**_kwargs):
            return Response(headers={'Content-Length':str(len(payload))})
        def get(self,_url,headers,**_kwargs):
            start,end=map(int,headers['Range'].removeprefix('bytes=').split('-'))
            return Response(payload[start:end+1],206)

    reader=HTTPRangeReader(Session(),'https://example.test/file.zip',block_size=16)
    reader.seek(13)
    assert reader.read(8)==payload[13:21]
    assert reader.seek(-3,2)==97
    assert reader.read()==payload[97:]
    assert reader.downloaded_bytes==36
