"""Read paths for the local CEREJÁ web service."""

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from threading import Lock
from time import monotonic
import logging

REGION = "CACOAL_R20"
UF = "RO"
SEASON_MONTHS = (10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9)
PHASES = ("implantacao", "formacao", "producao", "recepa")
WATER = ("sequeiro", "irrigado")
POWER_METRICS = ("temp_mean_c", "temp_min_c", "temp_max_c", "humidity_pct",
                 "wind_2m_m_s", "solar_mj_m2_day", "precip_power_mm")
LOG = logging.getLogger(__name__)


def local_today():
    return datetime.now(timezone(timedelta(hours=-4))).date()


class CellCache:
    def __init__(self, ttl=300, size=512):
        self.ttl, self.size = ttl, size
        self.entries = {}
        self.lock = Lock()

    def snapshot(self):
        with self.lock:
            now = monotonic()
            self.entries = {key: item for key, item in self.entries.items() if item[0] > now}
            return {key: item[1] for key, item in self.entries.items()}

    def put(self, key, value):
        if self.ttl <= 0:
            return
        with self.lock:
            if key not in self.entries and len(self.entries) >= self.size:
                del self.entries[next(iter(self.entries))]
            self.entries[key] = (monotonic() + self.ttl, value)


LOCATION = """
WITH point AS (
  SELECT extensions.ST_Transform(
    extensions.ST_SetSRID(extensions.ST_MakePoint(%(lon)s, %(lat)s),4326),32720) AS geom
), located AS (
  SELECT r.region_id, r.geom, p.geom AS point,
    extensions.ST_Distance(r.center,p.geom) AS meters,
    extensions.ST_Covers(r.geom,p.geom) AS covered
  FROM agro.regions r CROSS JOIN point p WHERE r.region_id = 'CACOAL_R20'
), resolved AS MATERIALIZED (
  SELECT r.meters, r.point, r.covered AND r.meters <= %(radius)s * 1000 AS inside, c.cell_id
  FROM located r LEFT JOIN LATERAL (
    SELECT cell_id FROM agro.grid_cells
    WHERE r.covered AND r.meters <= %(radius)s * 1000 AND region_id = r.region_id AND level = 2
      AND extensions.ST_Covers(geom,r.point)
    ORDER BY cell_id LIMIT 1
  ) c ON true
)
"""

MUNICIPAL_SCOPE = """
LEFT JOIN LATERAL (
  SELECT CASE WHEN count(*)=1 THEN min(m.ibge) END AS municipality
  FROM agro.cereja_municipalities m
  WHERE r.inside AND extensions.ST_Contains(m.geom,r.point)
) geo ON true
"""

DIAGNOSIS = LOCATION + """
SELECT r.meters,r.inside,r.cell_id,geo.municipality, latest.daily, fixed.static
FROM resolved r
""" + MUNICIPAL_SCOPE + """
LEFT JOIN LATERAL (
  SELECT jsonb_agg(to_jsonb(x) ORDER BY x.source_id,x.metric) AS daily
  FROM (
    SELECT d.*,s.provider,s.product,s.native_resolution,s.url
    FROM (
      SELECT DISTINCT ON (p.source_id,p.metric) p.*
      FROM (
        SELECT s.source_id, k.metric, d.value*m.weight AS value, d.unit,
          d.observed_on,d.quality,'sample'::text AS method
        FROM agro.cell_sample_map m
        JOIN agro.source_samples s ON s.sample_id=m.sample_id AND s.source_id='POWER'
        CROSS JOIN unnest(%(metrics)s::text[]) k(metric)
        CROSS JOIN LATERAL (
          SELECT value,unit,observed_on,quality FROM agro.sample_daily
          WHERE sample_id=m.sample_id AND metric=k.metric ORDER BY observed_on DESC LIMIT 1
        ) d
        WHERE m.cell_id=r.cell_id AND NOT (r.cell_id = ANY(%(cached)s::text[]))
        UNION ALL
        (SELECT source_id,metric,value,unit,observed_on,quality,'zonal_mean'::text
        FROM agro.cell_daily
        WHERE cell_id=r.cell_id AND source_id='IMERG_FINAL' AND metric='precip_mm'
          AND NOT (r.cell_id = ANY(%(cached)s::text[]))
        ORDER BY observed_on DESC LIMIT 1)
      ) p ORDER BY p.source_id,p.metric,p.observed_on DESC
    ) d JOIN agro.data_sources s USING (source_id)
  ) x
) latest ON true
LEFT JOIN LATERAL (
  SELECT jsonb_agg(to_jsonb(x) ORDER BY x.source_id,x.metric,x.depth_top_cm,x.depth_bottom_cm) AS static
  FROM (
    SELECT p.source_id,s.provider,s.product,s.native_resolution,s.url,p.metric,p.value,
      p.unit,p.depth_top_cm,p.depth_bottom_cm,p.quality
    FROM agro.static_properties p JOIN agro.data_sources s USING (source_id)
    WHERE p.cell_id=r.cell_id AND NOT (r.cell_id = ANY(%(cached)s::text[]))
  ) x
) fixed ON true
"""

TERRITORY_SUMMARY = """
WITH mapped AS (
  SELECT m.sample_id,m.weight FROM agro.cell_sample_map m
  JOIN agro.source_samples s ON s.sample_id=m.sample_id AND s.source_id='POWER'
  WHERE m.cell_id=%(cell)s ORDER BY m.weight DESC,m.sample_id LIMIT 1
), specs(source_metric,metric,aggregation,unit) AS (VALUES
  ('precip_power_mm','precip_30d_mm','sum','mm'),
  ('temp_mean_c','temp_mean_30d_c','mean','C')
), power AS (
  SELECT spec.metric,'POWER'::text AS source_id,spec.unit,
    (latest.end_on - 29) AS start_on,latest.end_on,current.days_available,
    CASE WHEN current.days_available=30 THEN current.value END AS value,
    history.baseline,history.period_count,NULL::double precision AS spread
  FROM specs spec
  CROSS JOIN LATERAL (
    SELECT max(d.observed_on) AS end_on FROM mapped m
    JOIN agro.sample_daily d ON d.sample_id=m.sample_id AND d.metric=spec.source_metric
  ) latest
  CROSS JOIN LATERAL (
    SELECT count(*)::int AS days_available,
      CASE spec.aggregation WHEN 'sum' THEN sum(d.value*m.weight) ELSE avg(d.value*m.weight) END AS value
    FROM mapped m JOIN agro.sample_daily d ON d.sample_id=m.sample_id AND d.metric=spec.source_metric
    WHERE d.observed_on BETWEEN latest.end_on-29 AND latest.end_on
  ) current
  LEFT JOIN LATERAL (
    SELECT avg(period.value) AS baseline,count(*)::int AS period_count
    FROM generate_series(1,5) years(n)
    CROSS JOIN LATERAL (
      SELECT count(*)::int AS days_available,
        CASE spec.aggregation WHEN 'sum' THEN sum(d.value*m.weight) ELSE avg(d.value*m.weight) END AS value
      FROM mapped m JOIN agro.sample_daily d ON d.sample_id=m.sample_id AND d.metric=spec.source_metric
      WHERE d.observed_on BETWEEN
        ((latest.end_on-29) - make_interval(years=>years.n))::date AND
        (latest.end_on - make_interval(years=>years.n))::date
    ) period
    WHERE period.days_available=30
  ) history ON true
), soil AS (
  SELECT 'soil_ph'::text AS metric,'SOILGRIDS'::text AS source_id,p.unit,
    NULL::date AS start_on,NULL::date AS end_on,1 AS days_available,p.value,
    regional.baseline,regional.period_count,regional.spread
  FROM agro.static_properties p
  CROSS JOIN LATERAL (
    SELECT avg(all_p.value) AS baseline,count(*)::int AS period_count,stddev_pop(all_p.value) AS spread
    FROM agro.static_properties all_p JOIN agro.grid_cells c ON c.cell_id=all_p.cell_id
    WHERE all_p.source_id='SOILGRIDS' AND all_p.metric='soil_ph'
      AND all_p.depth_top_cm=p.depth_top_cm AND all_p.depth_bottom_cm=p.depth_bottom_cm
      AND c.region_id='CACOAL_R20' AND c.level=2
  ) regional
  WHERE p.cell_id=%(cell)s AND p.source_id='SOILGRIDS' AND p.metric='soil_ph'
  ORDER BY p.depth_top_cm LIMIT 1
)
SELECT to_jsonb(summary) FROM (
  SELECT * FROM power UNION ALL SELECT * FROM soil
) summary ORDER BY metric
"""

CLIMATE = """
WITH periods AS (
  SELECT 'recent' AS kind, %(reference)s::date - 29 AS start_on, %(reference)s::date AS end_on
  UNION ALL
  SELECT 'seasonal', start_on, (start_on + interval '1 month - 1 day')::date
  FROM (SELECT (date_trunc('month', %(reference)s::date) - n * interval '1 year')::date AS start_on
        FROM generate_series(1,5) n) history
), mapped AS (
  SELECT m.sample_id,m.weight FROM agro.cell_sample_map m
  JOIN agro.source_samples s ON s.sample_id=m.sample_id AND s.source_id='POWER'
  WHERE m.cell_id=%(cell)s ORDER BY m.weight DESC,m.sample_id LIMIT 1
)
SELECT p.*, p.end_on-p.start_on+1 AS days_expected, ms.source_id, ms.metric,
  s.product,s.native_resolution,s.url,v.days_available,
  CASE WHEN v.days_available=p.end_on-p.start_on+1 THEN v.value END AS value
FROM periods p CROSS JOIN (VALUES
  ('POWER','precip_power_mm'),('POWER','temp_mean_c'),('IMERG_FINAL','precip_mm')
) ms(source_id,metric)
JOIN agro.data_sources s USING (source_id)
CROSS JOIN LATERAL (
  SELECT count(*) AS days_available,
    CASE WHEN ms.metric='temp_mean_c' THEN avg(x.value) ELSE sum(x.value) END AS value
  FROM (
    SELECT d.value*m.weight AS value
    FROM mapped m JOIN agro.sample_daily d ON d.sample_id=m.sample_id AND d.metric=ms.metric
    WHERE ms.source_id='POWER' AND d.observed_on BETWEEN p.start_on AND p.end_on
    UNION ALL
    SELECT d.value FROM agro.cell_daily d
    WHERE ms.source_id='IMERG_FINAL' AND d.cell_id=%(cell)s AND d.source_id=ms.source_id
      AND d.metric=ms.metric AND d.observed_on BETWEEN p.start_on AND p.end_on
  ) x
) v
WHERE p.kind='recent' OR ms.metric <> 'temp_mean_c'
ORDER BY p.start_on,ms.source_id,ms.metric
"""


class Repository:
    def __init__(self, conninfo, ttl=300):
        from psycopg.rows import dict_row
        from psycopg_pool import ConnectionPool

        self.pool = ConnectionPool(conninfo, min_size=1, max_size=6, timeout=3,
            open=False, kwargs={"row_factory": dict_row, "connect_timeout": 5,
                                "options": "-c statement_timeout=4000"})
        self.cache = CellCache(ttl, 60)
        self.climate_cache = CellCache(ttl, 256)

    @contextmanager
    def connection(self, operation):
        started = monotonic()
        with self.pool.connection() as conn:
            acquired = monotonic()
            try:
                yield conn
            finally:
                LOG.info("db op=%s wait_ms=%.1f sql_ms=%.1f", operation,
                         (acquired-started)*1000, (monotonic()-acquired)*1000)

    def diagnosis(self, lat, lon, radius):
        cached = self.cache.snapshot()
        with self.connection("diagnostico") as conn:
            row = conn.execute(DIAGNOSIS, {"lat": lat, "lon": lon, "radius": radius,
                               "metrics": list(POWER_METRICS), "cached": list(cached)}).fetchone()
        if not row:
            raise RuntimeError("Região de Cacoal não cadastrada")
        cell = row["cell_id"]
        if cell in cached:
            daily, static = cached[cell]
        else:
            daily, static = row["daily"] or [], row["static"] or []
            if cell:
                self.cache.put(cell, (daily, static))
        LOG.info("diagnostico cache=%s", "hit" if cell in cached else "miss")
        summary = []
        if cell:
            with self.connection("resumo_territorial") as conn:
                summary = [row["to_jsonb"] for row in conn.execute(TERRITORY_SUMMARY, {"cell": cell}).fetchall()]
        return {"latitude": lat, "longitude": lon, "radius_km": radius,
                "distance_km": round(row["meters"] / 1000, 2), "inside": row["inside"],
                "cell_id": cell, "daily": daily, "static": static, "cell_grid_km": 5, "municipality": row["municipality"],
                "summary": summary,
                "missing": [label for key, label in (
                    (daily, "observações climáticas"), (static, "solo e relevo na malha"),
                ) if not key]}

    def locate(self, lat, lon):
        with self.connection("localizacao") as conn:
            return conn.execute(LOCATION + "SELECT r.inside,r.cell_id,geo.municipality FROM resolved r" + MUNICIPAL_SCOPE,
                                {"lat": lat, "lon": lon, "radius": 20}).fetchone()

    def reference_data(self, for_engine=False, municipality=None):
        with self.connection("catalogo" if for_engine else "calendario") as conn:
            data = conn.execute("""
              SELECT ARRAY(SELECT to_jsonb(c) FROM agro.cereja_cultures c ORDER BY name) AS cultures,
                     ARRAY(SELECT to_jsonb(r) || jsonb_build_object('source',to_jsonb(s) - 'source_id')
                           FROM agro.cereja_rules r JOIN agro.cereja_sources s USING (source_id)
                           WHERE r.status='validada' AND (r.uf IS NULL OR r.uf='RO')
                             AND (r.municipality IS NULL OR r.municipality=%s)
                             AND NOT EXISTS (SELECT FROM agro.cereja_rules newer
                               WHERE newer.rule_id=r.rule_id AND newer.version>r.version
                                 AND newer.status IN ('validada','arquivada'))
                           ORDER BY r.rule_id) AS rules,
                     ARRAY(SELECT to_jsonb(q) || jsonb_build_object('source',to_jsonb(s) - 'source_id')
                           FROM agro.cereja_requirements q JOIN agro.cereja_sources s USING (source_id)
                           WHERE %s AND q.reviewed ORDER BY q.culture_id,q.metric,q.band,q.reviewed_at DESC,q.version DESC) AS requirements
            """, (municipality, for_engine)).fetchone()
        return data

    def climate(self, cell, reference):
        key = cell, reference
        cached = self.climate_cache.snapshot().get(key)
        if cached is not None:
            return cached
        with self.connection("clima") as conn:
            rows = conn.execute(CLIMATE, {"cell": cell, "reference": reference}).fetchall()
        self.climate_cache.put(key, rows)
        return rows
