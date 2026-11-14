"""Cacoal study area: a 20 km circle partitioned into clipped 5 km cells."""
from pyproj import Transformer
from shapely.geometry import box, Point
from shapely.ops import transform

REGION_ID = 'CACOAL_R20'
# Municipal seat on the IBGE 2022 municipal statistical map (rounded coordinates).
CENTER_LAT = -11.44
CENTER_LON = -61.45
UTM = 32720
RADIUS_M = 20_000
CELL_M = 5_000
E, N = Transformer.from_crs(4326, UTM, always_xy=True).transform(CENTER_LON, CENTER_LAT)
TO_WGS = Transformer.from_crs(UTM, 4326, always_xy=True).transform

def region_polygon():
    return Point(E, N).buffer(RADIUS_M, quad_segs=64)


def subcells():
    circle = region_polygon()
    for row in range(8):
        for col in range(8):
            x0 = E - RADIUS_M + col * CELL_M
            y0 = N - RADIUS_M + row * CELL_M
            geom = box(x0, y0, x0 + CELL_M, y0 + CELL_M).intersection(circle)
            if geom.area > 0:
                yield f'CAC_S_{row:02d}_{col:02d}', geom

def sample_map():
    """Deduplicate approximate 0.5-degree POWER cells by centroid.
    POWER chooses the source grid cell; grouping bins are representative only.
    Repeated values in neighboring bins remain possible near boundaries.
    """
    mapping={}
    samples={}
    for cid,geom in subcells():
        pt=transform(TO_WGS,geom.centroid)
        # 0.5-degree centers. Record the requested coordinate and native_key;
        # POWER may internally select a different closest native cell.
        qlon=round((pt.x-0.25)/0.5)*0.5+0.25
        qlat=round((pt.y-0.25)/0.5)*0.5+0.25
        key=f'power_{qlat:+08.3f}_{qlon:+09.3f}'
        samples[key]=(qlon,qlat)
        mapping[cid]=key
    return samples,mapping

def register_power_samples(conn):
    samples,mapping=sample_map()
    with conn.cursor() as cur:
        cur.execute('''INSERT INTO agro.source_samples(source_id,native_key,lon,lat)
            SELECT 'POWER',v.native_key,v.lon,v.lat
            FROM unnest(%s::text[],%s::double precision[],%s::double precision[])
                AS v(native_key,lon,lat)
            ON CONFLICT(source_id,native_key) DO UPDATE
            SET lon=excluded.lon,lat=excluded.lat''',
            (list(samples),[p[0] for p in samples.values()],[p[1] for p in samples.values()]))
        cur.execute('''INSERT INTO agro.cell_sample_map(cell_id,sample_id,weight)
            SELECT v.cell_id,s.sample_id,1
            FROM unnest(%s::text[],%s::text[]) AS v(cell_id,native_key)
            JOIN agro.source_samples s ON s.source_id='POWER' AND s.native_key=v.native_key
            ON CONFLICT(cell_id,sample_id) DO NOTHING''',
            (list(mapping),list(mapping.values())))
    conn.commit()
    return len(samples),len(mapping)
