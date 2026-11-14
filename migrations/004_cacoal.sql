-- Replace the former RO_250 study area and its ingested observations.
-- The source catalog and schema migration history remain.
ALTER TABLE agro.etl_runs ADD COLUMN IF NOT EXISTS region_id TEXT REFERENCES agro.regions(region_id);

DELETE FROM agro.sample_daily
WHERE sample_id IN (
  SELECT DISTINCT m.sample_id FROM agro.cell_sample_map m
  JOIN agro.grid_cells c ON c.cell_id=m.cell_id WHERE c.region_id='RO_250'
);
DELETE FROM agro.cell_daily WHERE cell_id IN
  (SELECT cell_id FROM agro.grid_cells WHERE region_id='RO_250');
DELETE FROM agro.static_properties WHERE cell_id IN
  (SELECT cell_id FROM agro.grid_cells WHERE region_id='RO_250');
DELETE FROM agro.cell_sample_map WHERE cell_id IN
  (SELECT cell_id FROM agro.grid_cells WHERE region_id='RO_250');
DELETE FROM agro.source_samples s WHERE NOT EXISTS
  (SELECT 1 FROM agro.cell_sample_map m WHERE m.sample_id=s.sample_id);
DELETE FROM agro.raster_assets;
DELETE FROM agro.etl_runs WHERE region_id IS NULL;
DELETE FROM agro.grid_cells WHERE region_id='RO_250' AND level=2;
DELETE FROM agro.grid_cells WHERE region_id='RO_250' AND level=1;
DELETE FROM agro.regions WHERE region_id='RO_250';

WITH center AS (
  SELECT extensions.ST_Transform(
    extensions.ST_SetSRID(extensions.ST_MakePoint(-61.45,-11.44),4326),32720) AS point
)
INSERT INTO agro.regions(region_id,description,center,geom)
SELECT 'CACOAL_R20',
       '20 km radius around Cacoal municipal seat (IBGE 2022, -11.44, -61.45)',
       point,
       extensions.ST_Buffer(point,20000,'quad_segs=64')
FROM center
ON CONFLICT(region_id) DO NOTHING;

WITH parameters AS (
  SELECT geom AS circle,extensions.ST_X(center) AS e,extensions.ST_Y(center) AS n
  FROM agro.regions WHERE region_id='CACOAL_R20'
), candidates AS (
  SELECT r,c,extensions.ST_Intersection(
    extensions.ST_MakeEnvelope(e-20000+c*10000,n-20000+r*10000,
                               e-20000+(c+1)*10000,n-20000+(r+1)*10000,32720),circle) AS geom
  FROM parameters CROSS JOIN generate_series(0,3) r CROSS JOIN generate_series(0,3) c
)
INSERT INTO agro.grid_cells(cell_id,region_id,parent_id,level,row_index,col_index,geom)
SELECT format('CAC_M_%s_%s',lpad(r::text,2,'0'),lpad(c::text,2,'0')),
       'CACOAL_R20',NULL,1,r,c,geom
FROM candidates WHERE extensions.ST_Area(geom)>0
ON CONFLICT(cell_id) DO NOTHING;

WITH parameters AS (
  SELECT geom AS circle,extensions.ST_X(center) AS e,extensions.ST_Y(center) AS n
  FROM agro.regions WHERE region_id='CACOAL_R20'
), candidates AS (
  SELECT r,c,extensions.ST_Intersection(
    extensions.ST_MakeEnvelope(e-20000+c*5000,n-20000+r*5000,
                               e-20000+(c+1)*5000,n-20000+(r+1)*5000,32720),circle) AS geom
  FROM parameters CROSS JOIN generate_series(0,7) r CROSS JOIN generate_series(0,7) c
)
INSERT INTO agro.grid_cells(cell_id,region_id,parent_id,level,row_index,col_index,geom)
SELECT format('CAC_S_%s_%s',lpad(r::text,2,'0'),lpad(c::text,2,'0')),
       'CACOAL_R20',format('CAC_M_%s_%s',lpad((r/2)::text,2,'0'),lpad((c/2)::text,2,'0')),
       2,r,c,geom
FROM candidates WHERE extensions.ST_Area(geom)>0
ON CONFLICT(cell_id) DO NOTHING;

CREATE OR REPLACE VIEW agro.v_cell_daily AS
SELECT m.cell_id,s.source_id,d.observed_on,d.metric,d.value*m.weight AS value,
       d.unit,d.quality,'sample'::text AS method
FROM agro.sample_daily d
JOIN agro.source_samples s ON s.sample_id=d.sample_id
JOIN agro.cell_sample_map m ON m.sample_id=d.sample_id
JOIN agro.grid_cells c ON c.cell_id=m.cell_id AND c.level=2 AND c.region_id='CACOAL_R20'
UNION ALL
SELECT d.cell_id,d.source_id,d.observed_on,d.metric,d.value,d.unit,d.quality,
       'zonal_mean'::text AS method
FROM agro.cell_daily d
JOIN agro.grid_cells c ON c.cell_id=d.cell_id AND c.level=2 AND c.region_id='CACOAL_R20';
