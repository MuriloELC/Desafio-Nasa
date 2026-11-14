"""Compare the old and new consultation over HTTP on the same populated database."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from contextlib import ExitStack, contextmanager
from math import ceil
from threading import Thread
from time import perf_counter
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json

from agro.config import env
from agro.cereja_data import LOCATION, Repository
from agro.recommendation import local_today
from agro.web import Service, make_server

DAILY = """
SELECT DISTINCT ON (d.source_id,d.metric) d.source_id,s.provider,s.product,d.metric,
 d.value,d.unit,d.observed_on,d.quality,d.method
FROM agro.v_cell_daily d JOIN agro.data_sources s ON s.source_id=d.source_id
WHERE d.cell_id=%s ORDER BY d.source_id,d.metric,d.observed_on DESC
"""
STATIC = """
SELECT p.source_id,s.provider,s.product,p.metric,p.value,p.unit,p.depth_top_cm,p.depth_bottom_cm,p.quality
FROM agro.static_properties p JOIN agro.data_sources s USING (source_id)
WHERE p.cell_id=%s ORDER BY p.source_id,p.metric,p.depth_top_cm,p.depth_bottom_cm
"""


class Legacy:
    def __init__(self, conninfo):
        self.conninfo = conninfo

    def diagnosis(self, lat, lon, radius):
        import psycopg
        from psycopg.rows import dict_row

        with psycopg.connect(self.conninfo, row_factory=dict_row, connect_timeout=5) as conn:
            location = conn.execute(LOCATION + "SELECT * FROM resolved",
                                    {"lat":lat,"lon":lon,"radius":radius}).fetchone()
            cid = location["cell_id"]
            return {"cell_id": cid, "daily": conn.execute(DAILY, (cid,)).fetchall() if cid else [],
                    "static": conn.execute(STATIC, (cid,)).fetchall() if cid else []}


@contextmanager
def serve(repository):
    with make_server(("127.0.0.1",0), Service(repository)) as server:
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{server.server_port}"
        finally:
            server.shutdown()
            thread.join()


def fetch(base, path, body=None):
    start = perf_counter()
    data = json.dumps(body).encode() if body is not None else None
    req = Request(base+path, data=data, headers={"Content-Type":"application/json"} if data else {})
    with urlopen(req, timeout=20) as response:
        result = json.load(response)
    return 1000*(perf_counter()-start), result


def summarize(times):
    sample = sorted(times)
    return {key: round(sample[ceil(len(sample)*quantile)-1],1)
            for key,quantile in (("p50_ms",.50),("p95_ms",.95))}


def parity(legacy, current):
    assert legacy["cell_id"] == current["cell_id"]
    for group in ("daily","static"):
        old, new = legacy[group], current[group]
        assert len(old) == len(new)
        assert old == [{key:item[key] for key in previous} for previous,item in zip(old,new,strict=True)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--requests", type=int, default=50)
    parser.add_argument("--workers", type=int, default=5)
    args = parser.parse_args()
    if min(args.requests, args.workers) < 1:
        parser.error("Requests and workers must be positive")
    conninfo = env("DATABASE_URL", required=True)
    points = [(-11.4386,-61.4472),(-11.50,-61.40),(-11.32,-61.49),(-11.55,-61.49),(-11.40,-61.56)]
    locations = ["/api/consulta?"+urlencode({"lat":lat,"lon":lon}) for lat,lon in points]
    bodies = [{"lat":lat,"lon":lon,"reference_date":str(local_today()),"field":{"phase":"formacao","water":"sequeiro"}}
              for lat,lon in points]
    with ExitStack() as stack:
        old = stack.enter_context(serve(Legacy(conninfo)))
        miss = Repository(conninfo, ttl=0)
        warm = Repository(conninfo, ttl=300)
        for repository in (miss,warm):
            repository.pool.open(wait=True)
            stack.callback(repository.pool.close)
        uncached = stack.enter_context(serve(miss))
        cached = stack.enter_context(serve(warm))
        executor = stack.enter_context(ThreadPoolExecutor(max_workers=args.workers))
        for target in (old,uncached,cached):
            list(executor.map(lambda p: fetch(target,p), locations))
        for path in locations:
            parity(fetch(old,path)[1],fetch(cached,path)[1])
        results = {}
        for name,base,path,body in (("anterior",old,locations,None),("sem_cache",uncached,locations,None),
                                    ("com_cache",cached,locations,None),
                                    ("recomendacao",uncached,["/api/recomendacoes"],bodies)):
            times = executor.map(lambda i: fetch(base,path[i%len(path)], body[i%len(body)] if body else None)[0],
                                 range(args.requests))
            results[name] = summarize(times)
    print(json.dumps({"requests_per_case":args.requests,"workers":args.workers,"parity_cells":len(points),
                      "results":results},indent=2))
    if any(results[key]["p95_ms"] > limit for key,limit in (("sem_cache",1000),("com_cache",300),("recomendacao",1500))):
        raise SystemExit("Uma ou mais metas de p95 não foram cumpridas.")


if __name__ == "__main__":
    main()
