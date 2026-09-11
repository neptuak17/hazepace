/**
 * Fetches live conditions and prints the next 12 hours.
 *
 *   npm run check:conditions
 *   node scripts/check-conditions.mjs 50.27 -119.27
 *
 * Hits the real Open-Meteo API, so it needs a network connection. It imports
 * the TypeScript module directly — Node strips the types — which means this
 * exercises the same code the app will run, not a copy of it.
 */
import {
  OPEN_METEO_ATTRIBUTION,
  fetchConditions,
  hoursFrom,
} from '../src/lib/open-meteo.ts';

const DEFAULT_LAT = 50.27;
const DEFAULT_LON = -119.27;
const ROWS = 12;

/** Renders a value, or a visible marker when the source reported nothing. */
function cell(value, digits = 0) {
  return value === null ? '—' : value.toFixed(digits);
}

function pad(text, width, align = 'right') {
  const s = String(text);
  if (s.length >= width) return s;
  const fill = ' '.repeat(width - s.length);
  return align === 'left' ? s + fill : fill + s;
}

const lat = Number(process.argv[2] ?? DEFAULT_LAT);
const lon = Number(process.argv[3] ?? DEFAULT_LON);

if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
  console.error('Usage: node scripts/check-conditions.mjs [latitude] [longitude]');
  process.exit(1);
}

console.log(`Requesting ${lat}, ${lon} …`);

const started = Date.now();
const result = await fetchConditions(lat, lon);
const elapsed = Date.now() - started;

if (!result.ok) {
  console.error(`\nFAILED after ${elapsed} ms`);
  console.error(`  kind:   ${result.error.kind}`);
  console.error(`  source: ${result.error.source ?? '(both)'}`);
  console.error(`  detail: ${result.error.message}`);
  process.exit(1);
}

const snapshot = result.value;

// The API returns local time for the coordinate, so "now" has to be formed in
// the same shape rather than taken from the machine's clock as UTC.
const now = new Date();
const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  .toISOString()
  .slice(0, 13);

let rows = hoursFrom(snapshot, localNow, ROWS);
if (rows.length === 0) {
  console.log('(no hours at or after now — showing the first rows returned)');
  rows = snapshot.hours.slice(0, ROWS);
}

console.log(`\nOK in ${elapsed} ms`);
console.log(`  coordinate sent : ${snapshot.latitude}, ${snapshot.longitude}  (rounded)`);
console.log(`  timezone        : ${snapshot.timezone ?? '(not reported)'}`);
console.log(`  hours returned  : ${snapshot.hours.length}`);
console.log(`  first / last    : ${snapshot.hours[0]?.time} … ${snapshot.hours.at(-1)?.time}`);

const header =
  pad('time', 17, 'left') +
  pad('temp°C', 8) +
  pad('wind km/h', 11) +
  pad('gust', 7) +
  pad('rain mm', 9) +
  pad('PM2.5', 8) +
  pad('US AQI', 8);

console.log('\n' + header);
console.log('─'.repeat(header.length));

for (const h of rows) {
  console.log(
    pad(h.time, 17, 'left') +
      pad(cell(h.temperatureC, 1), 8) +
      pad(cell(h.windSpeedKmh, 1), 11) +
      pad(cell(h.windGustsKmh, 1), 7) +
      pad(cell(h.precipitationMm, 1), 9) +
      pad(cell(h.pm25, 1), 8) +
      pad(cell(h.usAqi, 0), 8),
  );
}

// A second call should be served from the cache, which is the quickest way to
// see that the TTL is wired up at all.
const cachedStart = Date.now();
const again = await fetchConditions(lat, lon);
const cachedMs = Date.now() - cachedStart;
console.log(
  `\ncache: second call ${again.ok ? 'ok' : 'failed'} in ${cachedMs} ms ` +
    `(${cachedMs < 50 ? 'served from cache' : 'appears to have re-fetched'})`,
);

const nulls = snapshot.hours.reduce(
  (n, h) => n + Object.values(h).filter((v) => v === null).length,
  0,
);
console.log(`nulls: ${nulls} across ${snapshot.hours.length} hours (shown as — above)`);

console.log(`\n${OPEN_METEO_ATTRIBUTION}`);
