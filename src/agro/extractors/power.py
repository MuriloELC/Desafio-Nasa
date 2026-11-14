"""NASA POWER daily API; uses one request per 0.5-degree representative point per year."""
import datetime as dt
import time
import requests
from agro.config import env
from agro.grid import register_power_samples

PARAMETERS = ['T2M','T2M_MIN','T2M_MAX','RH2M','WS2M','ALLSKY_SFC_SW_DWN','PRECTOTCORR']
METRICS = {
 'T2M':('temp_mean_c','C'), 'T2M_MIN':('temp_min_c','C'),
 'T2M_MAX':('temp_max_c','C'),'RH2M':('humidity_pct','%'),
 'WS2M':('wind_2m_m_s','m/s'),'ALLSKY_SFC_SW_DWN':('solar_mj_m2_day','MJ/m2/day'),
 'PRECTOTCORR':('precip_power_mm','mm')
}
URL='https://power.larc.nasa.gov/api/temporal/daily/point'

def fetch_point(session,lon,lat,start,end):
    params={'parameters':','.join(PARAMETERS),'community':'AG', 'longitude':lon,
            'latitude':lat,'start':start.strftime('%Y%m%d'), 'end':end.strftime('%Y%m%d'),
            'format':'JSON','time-standard':'UTC'}
    for attempt in range(5):
        try:
            resp=session.get(env('POWER_BASE',default=URL),params=params,timeout=120)
            if resp.status_code in (429,500,502,503,504):
                raise requests.HTTPError(f'POWER temporary HTTP {resp.status_code}')
            resp.raise_for_status()
            data=resp.json()
            if 'properties' not in data or 'parameter' not in data['properties']:
                raise ValueError('POWER returned unexpected JSON schema')
            return data
        except (requests.RequestException,ValueError):
            if attempt==4: raise
            time.sleep(min(2**attempt,16))

def parse(data,sample_id,run_id):
    result=[]
    for param,dates in data['properties']['parameter'].items():
        if param not in METRICS: continue
        metric,unit=METRICS[param]
        for date_str,val in dates.items():
            if val is None or float(val)<=-900: continue
            day=dt.datetime.strptime(date_str,'%Y%m%d').date()
            result.append((sample_id,day,metric,float(val),unit,'estimated',run_id))
    return result

UPSERT='''INSERT INTO agro.sample_daily(sample_id,observed_on,metric,value,unit,quality,run_id)
VALUES (%s,%s,%s,%s,%s,%s,%s)
ON CONFLICT(sample_id,observed_on,metric) DO UPDATE
 SET value=excluded.value,unit=excluded.unit,quality=excluded.quality,run_id=excluded.run_id'''

def load(conn,start,end):
    from agro.db import batch_execute,run_start,run_finish
    register_power_samples(conn)
    run_id=run_start(conn,'power_daily','POWER',start,end)
    count=0
    try:
        records=conn.execute("SELECT sample_id,lon,lat FROM agro.source_samples WHERE source_id='POWER' ORDER BY sample_id").fetchall()
        with requests.Session() as session:
            for rec in records:
                data=fetch_point(session,rec['lon'],rec['lat'],start,end)
                count+=batch_execute(conn,UPSERT,parse(data,rec['sample_id'],run_id))
        run_finish(conn,run_id,count)
        return count
    except Exception as e:
        conn.rollback();run_finish(conn,run_id,count,e)
        raise
