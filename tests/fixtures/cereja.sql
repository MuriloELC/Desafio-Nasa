-- Synthetic climate observations for a disposable integration database only.
INSERT INTO agro.sample_daily (sample_id,observed_on,metric,value,unit)
SELECT sample_id,day::date,metric,value,unit
FROM agro.source_samples
CROSS JOIN generate_series('2000-01-01'::date,current_date,'1 day') day
CROSS JOIN (VALUES ('temp_mean_c',25,'C'),('temp_min_c',22,'C'),('temp_max_c',30,'C'),
    ('humidity_pct',75,'%'),('wind_2m_m_s',2,'m/s'),('solar_mj_m2_day',18,'MJ/m2/day'),
    ('precip_power_mm',5,'mm')) metrics(metric,value,unit)
WHERE source_id='POWER' ON CONFLICT DO NOTHING;

INSERT INTO agro.cell_daily (cell_id,source_id,observed_on,metric,value,unit)
SELECT cell_id,'IMERG_FINAL',day::date,'precip_mm',7,'mm'
FROM agro.grid_cells CROSS JOIN generate_series('2017-10-01'::date,'2025-09-30'::date,'1 day') day
WHERE region_id='CACOAL_R20' AND level=2 ON CONFLICT DO NOTHING;

INSERT INTO agro.static_properties(cell_id,source_id,metric,depth_top_cm,depth_bottom_cm,value,unit)
SELECT cell_id,'SOILGRIDS','soil_ph',0,5,5.8,'pH' FROM agro.grid_cells
WHERE cell_id='CAC_S_03_03' ON CONFLICT DO NOTHING;
