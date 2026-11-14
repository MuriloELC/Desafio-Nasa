from datetime import date
from agro.extractors.power import parse

def test_parse_skips_fill_values():
    data={'properties':{'parameter':{'T2M':{'20261101':23.6,'20261102':-999},'PRECTOTCORR':{'20261101':8.2}}}}
    rows=parse(data,7,4)
    assert len(rows)==2
    assert rows[0]==(7,date(2026,11,1),'temp_mean_c',23.6,'C','estimated',4)
    assert rows[1][2]=='precip_power_mm'
