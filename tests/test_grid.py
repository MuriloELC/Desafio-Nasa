from agro.grid import subcells,sample_map,region_polygon,E,N,CENTER_LAT,CENTER_LON,RADIUS_M

def test_grid_dimensions():
    cells=list(subcells())
    assert len(cells)==60
    assert len(set(cid for cid,_ in cells))==60
    assert all(cid.startswith('CAC_S_') for cid,_ in cells)
    assert abs(sum(poly.area for _,poly in cells)-region_polygon().area)<1
    assert abs(region_polygon().area/1e6-1256.6)<1
    assert (CENTER_LAT,CENTER_LON)==(-11.44,-61.45)
    assert RADIUS_M==20_000

def test_power_deduplicated():
    samples,mapping=sample_map()
    assert len(mapping)==60
    assert 1<=len(samples)<60
    assert all(k in samples for k in mapping.values())
