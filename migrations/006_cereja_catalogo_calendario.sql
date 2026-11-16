-- Reference data only. No changes to NASA time series or geography.
CREATE TABLE agro.cereja_sources (
  source_id text PRIMARY KEY,
  title text NOT NULL,
  url text NOT NULL CHECK (url LIKE 'https://%'),
  version text NOT NULL
);

CREATE TABLE agro.cereja_cultures (
  culture_id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  scientific_name text,
  kind text NOT NULL CHECK (kind IN ('cafe', 'entrelinha')),
  catalog_species boolean NOT NULL DEFAULT false CHECK (NOT catalog_species OR kind = 'entrelinha'),
  life_cycle text,
  notes jsonb NOT NULL DEFAULT '{}',
  import_version text,
  UNIQUE (culture_id, kind)
);

CREATE TABLE agro.cereja_requirements (
  culture_id text NOT NULL REFERENCES agro.cereja_cultures,
  metric text NOT NULL CHECK (metric IN ('air_temperature_c', 'annual_rain_mm', 'soil_ph', 'recent_rain_mm', 'seasonal_rain_mm')),
  band text NOT NULL CHECK (band IN ('optimal', 'tolerated')),
  unit text NOT NULL CHECK (unit = CASE WHEN metric = 'soil_ph' THEN 'pH' WHEN metric = 'air_temperature_c' THEN 'C' ELSE 'mm' END),
  minimum double precision,
  maximum double precision,
  version text NOT NULL,
  source_id text REFERENCES agro.cereja_sources,
  source_detail text,
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  CHECK (minimum IS NULL OR (minimum > '-Infinity'::float8 AND minimum < 'Infinity'::float8)),
  CHECK (maximum IS NULL OR (maximum > '-Infinity'::float8 AND maximum < 'Infinity'::float8)),
  CHECK (minimum <= maximum),
  CHECK (NOT reviewed OR (reviewed_at IS NOT NULL AND source_id IS NOT NULL AND source_detail IS NOT NULL AND (minimum IS NOT NULL OR maximum IS NOT NULL))),
  PRIMARY KEY (culture_id, metric, band, version)
);

CREATE TABLE agro.cereja_rules (
  rule_id text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  culture_id text NOT NULL REFERENCES agro.cereja_cultures,
  activity text NOT NULL CHECK (activity IN ('plantio', 'colheita', 'corte', 'rocada', 'manejo', 'monitoramento')),
  kind text NOT NULL CHECK (kind IN ('sazonal', 'apos_plantio', 'condicional')),
  uf text,
  municipality text CHECK (municipality IS NULL OR (uf IS NOT NULL AND municipality ~ '^[0-9]{7}$')),
  phase text NOT NULL CHECK (phase IN ('qualquer', 'implantacao', 'formacao', 'producao', 'recepa')),
  water text NOT NULL CHECK (water IN ('ambos', 'sequeiro', 'irrigado')),
  start_month int CHECK (start_month BETWEEN 1 AND 12),
  end_month int CHECK (end_month BETWEEN 1 AND 12),
  start_day int CHECK (start_day >= 0),
  end_day int CHECK (end_day BETWEEN start_day AND 3650),
  orientation text NOT NULL,
  source_id text NOT NULL REFERENCES agro.cereja_sources,
  source_detail text NOT NULL,
  status text NOT NULL CHECK (status IN ('rascunho', 'validada', 'arquivada')),
  checks jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(checks) = 'array'),
  CHECK (
    (kind='sazonal' AND start_month IS NOT NULL AND end_month IS NOT NULL AND start_day IS NULL AND end_day IS NULL) OR
    (kind='apos_plantio' AND start_day IS NOT NULL AND end_day IS NOT NULL AND start_month IS NULL AND end_month IS NULL) OR
    (kind='condicional' AND start_month IS NULL AND end_month IS NULL AND start_day IS NULL AND end_day IS NULL)
  ),
  PRIMARY KEY (rule_id, version)
);

CREATE INDEX cereja_rules_filter ON agro.cereja_rules (culture_id, uf, municipality, phase, water) WHERE status = 'validada';

INSERT INTO agro.cereja_sources VALUES
 ('embrapa-ct125', 'Gerenciamento anual da produção de Coffea canephora em Rondônia',
  'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/999518/1/ct125cafeicultura.pdf', 'Circular Técnica 125'),
 ('embrapa-entrelinhas', 'Cultivos intercalares em cafezais',
  'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1023762/1/17431.pdf', 'Café na Amazônia, 2015');

INSERT INTO agro.cereja_cultures (culture_id, name, scientific_name, kind) VALUES
 ('cafe-conilon', 'Café Conilon', 'Coffea canephora', 'cafe'),
 ('cafe-robusta', 'Café Robusta', 'Coffea canephora', 'cafe'),
 ('milheto', 'Milheto', 'Cenchrus americanus', 'entrelinha'),
 ('feijao-comum', 'Feijão-comum', 'Phaseolus vulgaris', 'entrelinha');

INSERT INTO agro.cereja_rules
 (rule_id, version, culture_id, activity, kind, uf, phase, water, start_month, end_month, orientation, source_id, source_detail, status)
VALUES
 ('conilon-plantio-ro', 1, 'cafe-conilon', 'plantio', 'sazonal', 'RO', 'implantacao', 'sequeiro', 10, 12,
  'Referência regional para sequeiro. Verifique a regularidade das chuvas e as condições locais antes de implantar.', 'embrapa-ct125', 'p. 1–2', 'validada'),
 ('robusta-plantio-ro', 1, 'cafe-robusta', 'plantio', 'sazonal', 'RO', 'implantacao', 'sequeiro', 10, 12,
  'Referência regional para sequeiro. Verifique a regularidade das chuvas e as condições locais antes de implantar.', 'embrapa-ct125', 'p. 1–2', 'validada'),
 ('conilon-colheita-ro', 1, 'cafe-conilon', 'colheita', 'sazonal', 'RO', 'producao', 'sequeiro', 4, 6,
  'Referência para lavouras clonais de sequeiro, reunindo clones precoces, médios e tardios. Confirme a maturação.', 'embrapa-ct125', 'p. 1 e 3', 'validada'),
 ('robusta-colheita-ro', 1, 'cafe-robusta', 'colheita', 'sazonal', 'RO', 'producao', 'sequeiro', 6, 7,
  'Referência para lavouras clonais de sequeiro do grupo Robusta. Confirme a maturação antes de colher.', 'embrapa-ct125', 'p. 1 e 3', 'validada');

INSERT INTO agro.cereja_rules
 (rule_id, version, culture_id, activity, kind, uf, phase, water, orientation, source_id, source_detail, status, checks)
SELECT culture_id || '-plantio-ro-' || phase, 1, culture_id, 'plantio', 'condicional', 'RO', phase, 'ambos',
 'Avalie umidade, espaço livre e competição com o café. Ajuste a implantação e o manejo às condições locais.',
 'embrapa-entrelinhas', 'p. 169–173', CASE WHEN culture_id='feijao-comum' THEN 'validada' ELSE 'rascunho' END,
 '[{"field":"can_manage","equals":true,"severity":"atencao","reason":"Confirme a capacidade de manejar a cobertura sem competição com o café."}]'::jsonb
FROM (VALUES ('milheto'), ('feijao-comum')) AS cultures(culture_id)
CROSS JOIN (VALUES ('formacao'), ('recepa')) AS phases(phase);
