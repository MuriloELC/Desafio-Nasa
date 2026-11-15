-- Official ISRIC SoilGrids 2.0 mean predictions, 0–5 cm, subset for CACOAL_R20.
-- Retrieved through WCS 2.0.1; extraction details and SHA-256 in docs/soilgrids_cacoal.md.
UPDATE agro.data_sources
SET product = 'SoilGrids 2.0 mean, 0–5 cm',
    version = '2.0',
    url = 'https://docs.isric.org/globaldata/soilgrids/wcs.html',
    native_resolution = '250 m',
    description = 'ISRIC regional soil predictions (pH in water and clay), not a field soil analysis'
WHERE source_id = 'SOILGRIDS';
