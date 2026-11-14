-- Coordinates converted from 12°22'45.8"S, 60°57'38.2"W using EPSG:32720.
-- Prefer calculating at runtime if changing the center.
INSERT INTO agro.regions(region_id,description,center,geom)
VALUES (
  'RO_250', '250 km square centered at -12.379388889,-60.960611111',
  extensions.ST_SetSRID(extensions.ST_MakePoint(721733.5247490548,8630647.445790818),32720),
  extensions.ST_MakeEnvelope(596733.5247490548,8505647.445790818,846733.5247490548,8755647.445790818,32720)
) ON CONFLICT(region_id) DO NOTHING;

INSERT INTO agro.grid_cells(cell_id,region_id,parent_id,level,row_index,col_index,geom)
SELECT format('M_%s_%s',lpad(r::text,2,'0'),lpad(c::text,2,'0')),
       'RO_250',NULL,1,r,c,
       extensions.ST_MakeEnvelope(
         596733.5247490548+c*25000,8505647.445790818+r*25000,
         596733.5247490548+(c+1)*25000,8505647.445790818+(r+1)*25000,32720)
FROM generate_series(0,9) r CROSS JOIN generate_series(0,9) c
ON CONFLICT DO NOTHING;

INSERT INTO agro.grid_cells(cell_id,region_id,parent_id,level,row_index,col_index,geom)
SELECT format('S_%s_%s',lpad(r::text,2,'0'),lpad(c::text,2,'0')),
       'RO_250',format('M_%s_%s',lpad((r/2)::text,2,'0'),lpad((c/2)::text,2,'0')),
       2,r,c,
       extensions.ST_MakeEnvelope(
         596733.5247490548+c*12500,8505647.445790818+r*12500,
         596733.5247490548+(c+1)*12500,8505647.445790818+(r+1)*12500,32720)
FROM generate_series(0,19) r CROSS JOIN generate_series(0,19) c
ON CONFLICT DO NOTHING;

INSERT INTO agro.data_sources(source_id,provider,product,version,url,native_resolution,description) VALUES
 ('POWER','NASA','POWER daily AG',NULL,'https://power.larc.nasa.gov/','~0.5° meteorological','Daily point time series'),
 ('IMERG_FINAL','NASA','IMERG PPS Final Run GIS','V07','https://gpm.nasa.gov/data/directory/imerg-final-run-pps-research-gis','0.1°','Final daily total accumulation GeoTIFF'),
 ('SRTM','NASA/USGS','SRTM elevation',NULL,'https://earthexplorer.usgs.gov/','~30m','Static terrain properties'),
 ('SOILGRIDS','ISRIC','SoilGrids',NULL,'https://files.isric.org/soilgrids/latest/data/','250m','Static soil properties by depth'),
 ('SMAP_L4','NASA','SMAP SPL4SMGP','007','https://nsidc.org/data/spl4smgp','9km','Planned: not ingested by this MVP'),
 ('GLDAS','NASA','GLDAS Noah 0.25','2.1','https://ldas.gsfc.nasa.gov/gldas','0.25°','Planned: not ingested by this MVP'),
 ('FAO_HWSD','FAO','Harmonized World Soil Database',NULL,'https://www.fao.org/soils-portal/','varies','Planned: validate classification fields')
ON CONFLICT(source_id) DO NOTHING;
