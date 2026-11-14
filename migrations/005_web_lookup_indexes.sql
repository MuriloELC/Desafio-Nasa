-- Latest observation per metric for one representative sample or grid cell.
CREATE INDEX IF NOT EXISTS idx_sample_daily_latest
  ON agro.sample_daily(sample_id, metric, observed_on DESC);

CREATE INDEX IF NOT EXISTS idx_cell_daily_latest
  ON agro.cell_daily(cell_id, source_id, metric, observed_on DESC);
