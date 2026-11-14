-- Run with a privileged database role. Requires postgis in extensions schema.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS agro;

CREATE TABLE IF NOT EXISTS agro.regions (
  region_id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  center extensions.geometry(Point, 32720) NOT NULL,
  geom extensions.geometry(Polygon, 32720) NOT NULL,
  epsg INTEGER NOT NULL DEFAULT 32720,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS agro.grid_cells (
  cell_id TEXT PRIMARY KEY,
  region_id TEXT NOT NULL REFERENCES agro.regions(region_id),
  parent_id TEXT REFERENCES agro.grid_cells(cell_id),
  level SMALLINT NOT NULL CHECK (level IN (1,2)),
  row_index SMALLINT NOT NULL,
  col_index SMALLINT NOT NULL,
  geom extensions.geometry(Polygon,32720) NOT NULL,
  UNIQUE(region_id,level,row_index,col_index)
);
CREATE INDEX IF NOT EXISTS idx_agro_grid_geom ON agro.grid_cells USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_agro_grid_parent ON agro.grid_cells(parent_id);

CREATE TABLE IF NOT EXISTS agro.data_sources (
  source_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  product TEXT NOT NULL,
  version TEXT,
  url TEXT,
  native_resolution TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS agro.etl_runs (
  run_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  command TEXT NOT NULL,
  source_id TEXT REFERENCES agro.data_sources(source_id),
  period_start DATE,
  period_end DATE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed')),
  records_written INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Climate source sampling; each sample is queried only once per day.
CREATE TABLE IF NOT EXISTS agro.source_samples (
  sample_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES agro.data_sources(source_id),
  native_key TEXT NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  UNIQUE(source_id,native_key)
);
CREATE TABLE IF NOT EXISTS agro.cell_sample_map (
  cell_id TEXT NOT NULL REFERENCES agro.grid_cells(cell_id),
  sample_id BIGINT NOT NULL REFERENCES agro.source_samples(sample_id),
  weight DOUBLE PRECISION NOT NULL DEFAULT 1 CHECK(weight > 0 AND weight <= 1),
  PRIMARY KEY(cell_id,sample_id)
);
CREATE TABLE IF NOT EXISTS agro.sample_daily (
  sample_id BIGINT NOT NULL REFERENCES agro.source_samples(sample_id),
  observed_on DATE NOT NULL,
  metric TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL,
  quality TEXT NOT NULL DEFAULT 'estimated',
  run_id BIGINT REFERENCES agro.etl_runs(run_id),
  PRIMARY KEY(sample_id,observed_on,metric)
);
CREATE INDEX IF NOT EXISTS idx_sample_daily_date ON agro.sample_daily(observed_on,metric);

-- Products that are spatially rasterised / averaged into the destination grid.
CREATE TABLE IF NOT EXISTS agro.cell_daily (
  cell_id TEXT NOT NULL REFERENCES agro.grid_cells(cell_id),
  source_id TEXT NOT NULL REFERENCES agro.data_sources(source_id),
  observed_on DATE NOT NULL,
  metric TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL,
  quality TEXT NOT NULL DEFAULT 'estimated',
  valid_fraction DOUBLE PRECISION CHECK(valid_fraction BETWEEN 0 AND 1),
  run_id BIGINT REFERENCES agro.etl_runs(run_id),
  PRIMARY KEY(cell_id,source_id,observed_on,metric)
);
CREATE INDEX IF NOT EXISTS idx_cell_daily_date ON agro.cell_daily(observed_on,metric);

CREATE TABLE IF NOT EXISTS agro.static_properties (
  cell_id TEXT NOT NULL REFERENCES agro.grid_cells(cell_id),
  source_id TEXT NOT NULL REFERENCES agro.data_sources(source_id),
  metric TEXT NOT NULL,
  depth_top_cm INTEGER NOT NULL DEFAULT 0,
  depth_bottom_cm INTEGER NOT NULL DEFAULT 0,
  value DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL,
  quality TEXT NOT NULL DEFAULT 'estimated',
  run_id BIGINT REFERENCES agro.etl_runs(run_id),
  PRIMARY KEY(cell_id,source_id,metric,depth_top_cm,depth_bottom_cm)
);

CREATE TABLE IF NOT EXISTS agro.raster_assets (
  asset_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES agro.data_sources(source_id),
  observed_on DATE,
  object_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  bytes BIGINT NOT NULL,
  format TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Explicit permissions: no public API access by default.
REVOKE ALL ON SCHEMA agro FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA agro FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA agro REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
