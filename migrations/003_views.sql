-- Resolve daily observations by keeping source provenance. Level-2 cells only.
CREATE OR REPLACE VIEW agro.v_cell_daily AS
SELECT m.cell_id,s.source_id,d.observed_on,d.metric,d.value*m.weight AS value,
       d.unit,d.quality,'sample'::text AS method
FROM agro.sample_daily d
JOIN agro.source_samples s ON s.sample_id=d.sample_id
JOIN agro.cell_sample_map m ON m.sample_id=d.sample_id
JOIN agro.grid_cells c ON c.cell_id=m.cell_id AND c.level=2
UNION ALL
SELECT d.cell_id,d.source_id,d.observed_on,d.metric,d.value,d.unit,d.quality,
       'zonal_mean'::text AS method
FROM agro.cell_daily d
JOIN agro.grid_cells c ON c.cell_id=d.cell_id AND c.level=2;

-- Metrics with suffix _mm (precipitation) are aggregated by sum, others by mean.
-- Month completeness is exposed as number of available daily observations.
CREATE OR REPLACE VIEW agro.v_cell_monthly AS
SELECT cell_id,source_id,date_trunc('month',observed_on)::date AS month,
       metric,unit,COUNT(*) AS days_available,
       CASE WHEN metric IN ('precip_mm','precip_power_mm') THEN SUM(value)
            ELSE AVG(value) END AS value,
       CASE WHEN metric IN ('precip_mm','precip_power_mm') THEN 'sum' ELSE 'mean' END AS aggregation
FROM agro.v_cell_daily
GROUP BY cell_id,source_id,date_trunc('month',observed_on)::date,metric,unit;

-- Basic validation example, execute manually after migration:
-- SELECT level,count(*),sum(extensions.ST_Area(geom))/1e6 AS km2 FROM agro.grid_cells GROUP BY level;
