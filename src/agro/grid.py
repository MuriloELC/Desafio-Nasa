from pyproj import Transformer
from shapely.geometry import box
from shapely.ops import transform
CENTER_LAT = -(12+22/60+45.8/3600)
CENTER_LON = -(60+57/60+38.2/3600)
UTM = 32720
E,N = Transformer.from_crs(4326,UTM,always_xy=True).transform(CENTER_LON,CENTER_LAT)
TO_WGS = Transformer.from_crs(UTM,4326,always_xy=True).transform

def subcells():
    for row in range(20):
        for col in range(20):
            x0=E-125000+col*12500
            y0=N-125000+row*12500
            yield f'S_{row:02d}_{col:02d}',box(x0,y0,x0+12500,y0+12500)

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
