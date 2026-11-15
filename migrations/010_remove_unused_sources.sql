-- Keep only environmental sources used by the CEREJÁ pilot.
-- These catalog entries had no samples, observations, assets, runs or static properties.
DELETE FROM agro.data_sources
WHERE source_id IN ('SMAP_L4', 'GLDAS', 'FAO_HWSD', 'SRTM');
