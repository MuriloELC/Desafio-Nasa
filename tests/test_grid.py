from agro.grid import subcells,sample_map,E,N,CENTER_LAT,CENTER_LON

def test_grid_dimensions():
    cells=list(subcells())
    assert len(cells)==400
    assert len(set(cid for cid,_ in cells))==400
    assert all(abs(poly.area-156_250_000)<1e-4 for _,poly in cells)
    assert abs(E-721733.5247490548)<.01
    assert abs(N-8630647.445790818)<.01

def test_power_deduplicated():
    samples,mapping=sample_map()
    assert len(mapping)==400
    assert 1<len(samples)<400
    assert all(k in samples for k in mapping.values())
