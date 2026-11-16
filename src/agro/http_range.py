"""Seekable, block-cached HTTP reader for ZIP members on range-capable servers."""
from collections import OrderedDict
from io import RawIOBase
import time
import requests


class HTTPRangeReader(RawIOBase):
    def __init__(self, session, url, block_size=1024 * 1024, max_blocks=8):
        self.session = session
        self.url = url
        self.block_size = block_size
        self.max_blocks = max_blocks
        response = self._request('head', timeout=30)
        self.size = int(response.headers['Content-Length'])
        self.position = 0
        self.blocks = OrderedDict()
        self.downloaded_bytes = 0

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.position

    def seek(self, offset, whence=0):
        if whence == 0:
            position = offset
        elif whence == 1:
            position = self.position + offset
        elif whence == 2:
            position = self.size + offset
        else:
            raise ValueError('Invalid seek mode')
        if position < 0:
            raise ValueError('Negative seek position')
        self.position = position
        return position

    def _block(self, number):
        if number in self.blocks:
            self.blocks.move_to_end(number)
            return self.blocks[number]
        start = number * self.block_size
        end = min(self.size, start + self.block_size) - 1
        response = self._request('get',
                                 headers={'Range': f'bytes={start}-{end}'},
                                 timeout=60)
        if response.status_code != 206 or len(response.content) != end - start + 1:
            raise IOError('Server did not honor HTTP byte range')
        self.downloaded_bytes += len(response.content)
        self.blocks[number] = response.content
        while len(self.blocks) > self.max_blocks:
            self.blocks.popitem(last=False)
        return response.content

    def _request(self, method, **kwargs):
        for attempt in range(3):
            try:
                response = getattr(self.session, method)(self.url, **kwargs)
                response.raise_for_status()
                return response
            except requests.RequestException:
                if attempt == 2:
                    raise
                time.sleep(attempt + 1)

    def read(self, size=-1):
        if size is None or size < 0:
            size = self.size - self.position
        size = min(size, self.size - self.position)
        chunks = []
        while size > 0:
            number, offset = divmod(self.position, self.block_size)
            block = self._block(number)
            chunk = block[offset:offset + size]
            chunks.append(chunk)
            self.position += len(chunk)
            size -= len(chunk)
        return b''.join(chunks)
