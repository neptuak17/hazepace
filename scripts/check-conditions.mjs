/**
 * Fetches live conditions from both sources and prints them side by side.
 *
 *   npm run check:conditions
 *   node scripts/check-conditions.mjs 50.27 -119.27
 *   node scripts/check-conditions.mjs --all     (runs the three sample sites)
 *
 * Hits the real Open-Meteo and ECCC APIs, so it needs a network connection.
 * It imports the TypeScript modules directly — Node strips the types — so this
 * exercises the same code the app will run, not a copy of it.
 */
import {
  OPEN_METEO_ATTRIBUTION,
  fetchConditions,
  hoursFrom,
} from '../src/lib/open-meteo.ts';
import {
  ECCC_ATTRIBUTION,
  MAX_COMMUNITY_DISTANCE_KM,
  fetchAqhi,
  forecastFrom,
} from '../src/lib/aqhi.ts';

const ROWS = 12;

const SITES = [
  { name: 'Vernon BC', lat: 50.27, lon: -119.27 },
  { name: 'Kelowna BC (control)', lat: 49.89, lon: -119.5 },
  { name: 'Remote BC interior', lat: 57.5, lon: -126.0 },
];

const cell = (v, digits = 0) => (v === null || v === undefined ? '—' : v.toFixed(digits));

function pad(text, width, align = 'right') {
  const s = String(text);
  if (s.length >= width) return s;
  const fill = ' '.repeat(width - s.length);
  return align === 'left' ? s + fill : fill + s;
}

/**
 * Open-Meteo returns local naive time ("2026-09-10T17:00"); ECCC returns UTC
 * with a Z. They cannot be string-compared, so AQHI hours are indexed by their
 * epoch value and each weather hour is looked up by its own epoch.
 */
function epochOfLocal(localIso, timeZone) {
  // Interpret the naive local stamp in the snapshot's zone.
  const asUtc = Date.parse(localIso + 'Z');
  if (Number.isNaN(asUtc) || !timeZone) return asUtc;
  const probe = new Date(asUtc);
  const shown = new Date(probe.toLocaleString('en-US', { timeZone }));
  const actual = new Date(probe.toLocaleString('en-US', { timeZone: 'UTC' }));
  return asUtc + (actual.getTime() - shown.getTime());
}

async function report(site) {
  console.log('\n' + '='.repeat(78));
  console.log(`${site.name}  (${site.lat}, ${site.lon})`);
  console.log('='.repeat(78));

  const [weather, aqhi] = await Promise.all([
    fetchConditions(site.lat, site.lon),
    fetchAqhi(site.lat, site.lon),
  ]);

  /* ── AQHI ── */
  console.log('\nAQHI — Environment and Climate Change Canada');
  let aqhiByEpoch = new Map();

  if (aqhi.status === 'no-coverage') {
    console.log(`  NO COVERAGE — nothing within ${MAX_COMMUNITY_DISTANCE_KM} km`);
    console.log(
      `  nearest community: ${aqhi.nearestName ?? '(none)'}` +
        (aqhi.nearestKm === null ? '' : ` at ${aqhi.nearestKm.toFixed(1)} km`),
    );
    console.log('  no reading is reported for this coordinate');
  } else if (aqhi.status === 'error') {
    console.log(`  ERROR ${aqhi.error.kind}: ${aqhi.error.message}`);
  } else {
    const s = aqhi.value;
    console.log(`  community      : ${s.community.name}  [${s.community.locationId}]`);
    console.log(`  distance       : ${s.distanceKm.toFixed(1)} km`);

    const o = s.observation;
    if (!o) {
      console.log('  observation    : none published');
    } else {
      const age = (Date.now() - Date.parse(o.timestamp)) / 3_600_000;
      console.log(
        `  observation    : ${o.value === null ? '—' : o.value}` +
          `   isAboveTen=${o.isAboveTen}   category=${o.category ?? '—'}`,
      );
      console.log(`  observed at    : ${o.timestamp}  (${age.toFixed(1)} h ago)`);
      if (o.specialNotes) console.log(`  special notes  : ${o.specialNotes}`);
    }

    const issue = s.forecast[0]?.publishedAt;
    console.log(`  forecast issue : ${issue ?? '—'}  (${s.forecast.length} hourly rows)`);

    for (const r of s.forecast) aqhiByEpoch.set(Date.parse(r.timestamp), r);
  }

  /* ── Weather + joined table ── */
  if (!weather.ok) {
    console.log(`\nOpen-Meteo ERROR ${weather.error.kind}: ${weather.error.message}`);
    return;
  }

  const snapshot = weather.value;
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 13);

  let rows = hoursFrom(snapshot, localNow, ROWS);
  if (rows.length === 0) rows = snapshot.hours.slice(0, ROWS);

  console.log(`\nOpen-Meteo — ${snapshot.timezone ?? '(no timezone)'}, ${snapshot.hours.length} hours`);

  const header =
    pad('time (local)', 18, 'left') +
    pad('temp°C', 8) +
    pad('wind', 7) +
    pad('rain', 7) +
    pad('PM2.5', 8) +
    pad('US AQI', 8) +
    pad('AQHI', 7) +
    pad('category', 12);

  console.log('\n' + header);
  console.log('─'.repeat(header.length));

  for (const h of rows) {
    const match = aqhiByEpoch.get(epochOfLocal(h.time, snapshot.timezone));
    console.log(
      pad(h.time, 18, 'left') +
        pad(cell(h.temperatureC, 1), 8) +
        pad(cell(h.windSpeedKmh, 0), 7) +
        pad(cell(h.precipitationMm, 1), 7) +
        pad(cell(h.pm25, 1), 8) +
        pad(cell(h.usAqi, 0), 8) +
        pad(match ? cell(match.value, 0) : '—', 7) +
        pad(match?.category ?? '—', 12),
    );
  }
}

const args = process.argv.slice(2);
const sites =
  args[0] === '--all' || args.length === 0
    ? args[0] === '--all'
      ? SITES
      : [SITES[0]]
    : [{ name: 'Custom', lat: Number(args[0]), lon: Number(args[1]) }];

if (sites.some((s) => !Number.isFinite(s.lat) || !Number.isFinite(s.lon))) {
  console.error('Usage: node scripts/check-conditions.mjs [latitude longitude | --all]');
  process.exit(1);
}

for (const site of sites) {
  await report(site);
}

console.log('\n' + '─'.repeat(78));
console.log(OPEN_METEO_ATTRIBUTION);
console.log(ECCC_ATTRIBUTION);
