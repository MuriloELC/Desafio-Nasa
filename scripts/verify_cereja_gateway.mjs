// Probe the integrated gateway and, optionally, capture real public API responses.
// Usage: node scripts/verify_cereja_gateway.mjs http://127.0.0.1:8000 [--capture]
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:8000');
const capture = process.argv.includes('--capture');
const point = {lat: -11.44, lon: -61.45};

async function request(path, options) {
  const response = await fetch(new URL(path, base), {
    ...options,
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.text();
  assert(response.ok, `${path}: HTTP ${response.status}: ${body.slice(0, 300)}`);
  return {response, body};
}

async function json(path, options) {
  const {response, body} = await request(path, options);
  assert(response.headers.get('content-type')?.includes('application/json'), `${path}: expected JSON`);
  return JSON.parse(body);
}

const home = await request('/');
assert(home.body.includes('Solo forte. Café que vai mais longe'), 'Gateway did not serve the React landing page');
const config = await json('/api/config');
assert.equal(typeof config.minha_lavoura, 'boolean');

const query = new URLSearchParams({...point, raio: '20'});
const diagnosis = await json(`/api/consulta?${query}`);
assert.equal(diagnosis.inside, true, 'Pilot center must be inside the 20 km circle');
assert.equal(typeof diagnosis.cell_id, 'string');
assert(Array.isArray(diagnosis.daily) && Array.isArray(diagnosis.static));
for (const item of [...diagnosis.daily, ...diagnosis.static]) {
  assert.equal(typeof item.source_id, 'string');
  assert.equal(typeof item.metric, 'string');
  assert.equal(typeof item.value, 'number');
  assert.equal(typeof item.native_resolution, 'string');
}
for (const [metric, unit] of [['soil_ph', 'pH'], ['clay_pct', '%']]) {
  const soil = diagnosis.static.find(item => item.source_id === 'SOILGRIDS' && item.metric === metric);
  assert(soil, `SoilGrids ${metric} is missing from the pilot cell`);
  assert.equal(soil.unit, unit);
  assert.equal(soil.quality, 'estimated');
  assert.equal(soil.depth_top_cm, 0);
  assert.equal(soil.depth_bottom_cm, 5);
}

const outside = await json('/api/consulta?lat=0&lon=0&raio=20');
assert.equal(outside.inside, false);
assert.equal(outside.cell_id, null);

const calendarPath = diagnosis.municipality
  ? `/api/calendario?${new URLSearchParams({municipio: diagnosis.municipality})}`
  : '/api/calendario';
const calendar = await json(calendarPath);
assert(Array.isArray(calendar.months) && Array.isArray(calendar.rules));
assert.equal(calendar.months.length, 12);
assert(calendar.rules.length > 0, 'The published calendar must contain rules');
for (const rule of calendar.rules) {
  assert.equal(typeof rule.version, 'number');
  assert.equal(typeof rule.orientation, 'string');
  assert.equal(typeof rule.source?.url, 'string');
}

const field = {
  strategy: 'rotacao',
  phase: 'formacao', water: 'sequeiro', age_years: 2, spacing_m: 3,
  goal: 'produzir_biomassa',
  soil_ph: null, nematodes: null, can_manage: true,
};
const recommendation = await json('/api/recomendacoes', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({...point, field}),
});
assert.equal(recommendation.inside, true);
assert(Array.isArray(recommendation.candidates) && recommendation.candidates.length > 0,
  'The published catalog must produce candidates');
assert(Array.isArray(recommendation.coverage));
for (const candidate of recommendation.candidates) {
  assert(['favoravel', 'atencao', 'sem_dados', 'desfavoravel'].includes(candidate.state));
  assert(Array.isArray(candidate.reasons) && Array.isArray(candidate.missing));
  assert(Number.isInteger(candidate.rank) && typeof candidate.tie === 'boolean');
  assert(['insuficiente', 'baixa', 'media', 'alta'].includes(candidate.confidence));
  assert(candidate.score_components && Array.isArray(candidate.rules_used) && Array.isArray(candidate.data_used));
}
assert(recommendation.candidates.every(candidate => !candidate.missing.includes('pH medido em análise de solo')),
  'Regional SoilGrids pH must fill the gap when field soil analysis is absent');
assert(recommendation.candidates.every(candidate => candidate.data_used.some(item =>
  item.criterion === 'soil_ph' && item.origin === 'SOILGRIDS')),
  'Candidates must identify SoilGrids as the origin of regional pH');
for (const period of recommendation.coverage) {
  if (period.days_available !== period.days_expected) {
    assert.equal(period.value, null, 'Incomplete periods must not carry a value');
  }
}

const permanent = await json('/api/recomendacoes', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({...point, field: {...field, strategy: 'permanente'}}),
});
assert.equal(permanent.candidates.length, 4, 'Permanent strategy must retain all perennial candidates');
assert(permanent.candidates.every(candidate =>
  ['Amendoim-forrageiro', 'Braquiária-ruziziensis', 'Guandu-anão', 'Lablab'].includes(candidate.name)),
  'Permanent strategy returned a non-perennial candidate');
assert.equal(permanent.ranking_available, true, 'Accepted operational evidence must enable ranking');
assert.equal(permanent.method_version, 'cereja-regras-5');
assert(permanent.candidates.some(candidate => candidate.rank > 1),
  'Management answers must differentiate at least one permanent candidate');

const conventional = await json('/api/recomendacoes', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({...point, field: {...field, strategy: 'convencional'}}),
});
assert.equal(conventional.candidates.length, 0, 'Conventional strategy must not prescribe a planted species');

if (capture) {
  const dir = join('tests', 'fixtures', 'api_real');
  await mkdir(dir, {recursive: true});
  for (const [name, value] of Object.entries({diagnosis, calendar, recommendation})) {
    await writeFile(join(dir, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  }
}

console.log(`Gateway OK: ${diagnosis.cell_id}, ${calendar.rules.length} rules, ${recommendation.candidates.length} candidates${capture ? '; real fixtures captured' : ''}.`);
