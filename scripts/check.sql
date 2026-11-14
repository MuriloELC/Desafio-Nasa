SELECT level,count(*) AS cells,round((sum(extensions.ST_Area(geom))/1e6)::numeric,2) AS area_km2
FROM agro.grid_cells WHERE region_id='CACOAL_R20' GROUP BY level ORDER BY level;
SELECT source_id,count(*) AS samples FROM agro.source_samples GROUP BY source_id;
SELECT source_id,metric,min(observed_on) AS first_day,max(observed_on) AS last_day,count(*) AS observations
FROM agro.v_cell_daily GROUP BY source_id,metric ORDER BY source_id,metric;
SELECT * FROM agro.v_cell_monthly WHERE cell_id='CAC_S_04_04' ORDER BY month DESC, metric LIMIT 30;
