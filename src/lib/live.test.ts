/// <reference types="node" />
/**
 * Tests for the live-data adapter.
 *
 * The two rules that matter most are that the model runs only on complete
 * hours, and that a missing slot can break a run without ever producing a
 * level of its own. Everything else here is formatting.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { AqhiEstimate } from './aqhi-estimate.ts';
import type { AqhiReading, AqhiSnapshot } from './aqhi.ts';
import {
  aqhiOf,
  compass,
  epochOfLocalIso,
  formatAge,
  formatAqhi,
  formatValue,
  joinLive,
  judgeLiveDay,
  readingOf,
  type LiveHour,
} from './live.ts';
import type { ConditionsSnapshot, HourlyConditions } from './open-meteo.ts';
import type { Prefs } from './rating.ts';

const PREFS: Prefs = {
  activity: 'Cycling',
  sensitivity: 'Normal',
  rainTol: 1,
  windTol: 32,
  heatTol: 32,
};

const weather = (over: Partial<HourlyConditions> = {}): HourlyConditions => ({
  time: '2026-09-11T12:00',
  temperatureC: 20,
  apparentTemperatureC: 20,
  relativeHumidityPct: 50,
  precipitationMm: 0,
  precipitationProbabilityPct: 0,
  windSpeedKmh: 10,
  windGustsKmh: 15,
  windDirectionDeg: 315,
  uvIndex: 3,
  pm25: 4,
  pm10: 8,
  ozoneUgm3: 60,
  nitrogenDioxideUgm3: 8,
  usAqi: 30,
  ...over,
});

const aqhiReading = (value: number | null, over: Partial<AqhiReading> = {}): AqhiReading => ({
  kind: 'forecast',
  timestamp: '2026-09-11T19:00:00Z',
  value,
  isAboveTen: value !== null && value > 10,
  category: null,
  community: 'North Okanagan',
  locationId: 'JBOAP',
  distanceKm: 1.3,
  publishedAt: '2026-09-11T00:00:00Z',
  specialNotes: null,
  ...over,
});

const hour = (
  w: HourlyConditions | null,
  a: AqhiReading | null,
  h = 12,
  estimate: AqhiEstimate | null = null,
): LiveHour => ({
  epoch: 0,
  hour: h,
  weather: w,
  aqhi: a,
  aqhiEstimate: estimate,
});

const estimate = (value: number): AqhiEstimate => ({
  value,
  isAboveTen: value > 10.5,
  category: 'Low',
  meanHours: 3,
});

describe('readingOf — the completeness rule', () => {
  test('produces a reading when every input is present', () => {
    const r = readingOf(hour(weather(), aqhiReading(3)));
    assert.deepEqual(r, { hour: 12, aqhi: 3, tempC: 20, windKmh: 10, rainMmH: 0 });
  });

  test('is null with no AQHI from either source, even with perfect weather', () => {
    assert.equal(readingOf(hour(weather(), null)), null);
    assert.equal(readingOf(hour(weather(), aqhiReading(null))), null);
  });

  test('uses the estimate when ECCC has nothing', () => {
    const r = readingOf(hour(weather(), null, 12, estimate(4.2)));
    assert.equal(r?.aqhi, 4.2);
    const r2 = readingOf(hour(weather(), aqhiReading(null), 12, estimate(4.2)));
    assert.equal(r2?.aqhi, 4.2);
  });

  test('prefers the ECCC reading over the estimate when both are present', () => {
    const r = readingOf(hour(weather(), aqhiReading(3), 12, estimate(7)));
    assert.equal(r?.aqhi, 3);
  });

  test('is null with no weather, even with an AQHI', () => {
    assert.equal(readingOf(hour(null, aqhiReading(3))), null);
  });

  test('is null if any single weather input the model needs is missing', () => {
    assert.equal(readingOf(hour(weather({ temperatureC: null }), aqhiReading(3))), null);
    assert.equal(readingOf(hour(weather({ windSpeedKmh: null }), aqhiReading(3))), null);
    assert.equal(readingOf(hour(weather({ precipitationMm: null }), aqhiReading(3))), null);
  });

  test('does not require inputs the model does not use', () => {
    // Humidity and PM2.5 are displayed but not judged.
    const r = readingOf(hour(weather({ relativeHumidityPct: null, pm25: null }), aqhiReading(3)));
    assert.notEqual(r, null);
  });
});

describe('judgeLiveDay — missing slots', () => {
  const slot = (aqhi: number | null) =>
    aqhi === null ? null : hour(weather(), aqhiReading(aqhi));

  test('has no level when no slot is complete', () => {
    const v = judgeLiveDay([null, null, null, null, null, null, null, null], PREFS);
    assert.equal(v.level, null);
    assert.equal(v.run, null);
    assert.ok(v.blocks.every((b) => b === null));
  });

  test('a missing slot breaks a run', () => {
    // Clean on both sides of a gap: two runs of two, not one run of five.
    const v = judgeLiveDay(
      [slot(2), slot(2), null, slot(2), slot(2), slot(9), slot(9), slot(9)],
      PREFS,
    );
    assert.equal(v.level, 0);
    assert.deepEqual(v.run, { start: 0, end: 1 }, 'the first of the two equal runs');
  });

  test('a missing slot never contributes a level', () => {
    // One complete amber slot (AQHI 8 is High: amber at the defaults), seven
    // missing. The day is amber from that slot
    // alone — the gaps do not drag it to red.
    const v = judgeLiveDay([null, null, null, slot(8), null, null, null, null], PREFS);
    assert.equal(v.level, 1);
    assert.deepEqual(v.run, { start: 3, end: 3 });
  });

  test('reports null per slot so the strip can show the gap', () => {
    const v = judgeLiveDay([slot(2), null, slot(2), null, null, null, null, null], PREFS);
    assert.deepEqual(v.blocks, [0, null, 0, null, null, null, null, null]);
  });
});

describe('joinLive', () => {
  const snapshotW = (times: string[]): ConditionsSnapshot => ({
    latitude: 50.27,
    longitude: -119.27,
    timezone: 'UTC',
    utcOffsetSeconds: 0,
    fetchedAt: 0,
    hours: times.map((time) => weather({ time })),
  });
  const snapshotA = (stamps: string[]): AqhiSnapshot => ({
    community: { locationId: 'JBOAP', name: 'North Okanagan', latitude: 50.258, longitude: -119.267, zone: 'pyr' },
    distanceKm: 1.3,
    observation: null,
    forecast: stamps.map((timestamp) => aqhiReading(3, { timestamp })),
    fetchedAt: 0,
  });

  test('matches an AQHI hour to a weather hour by instant, across formats', () => {
    // Weather is naive local in UTC here; AQHI is explicit UTC. Same instant.
    const live = joinLive(snapshotW(['2026-09-11T12:00']), snapshotA(['2026-09-11T12:00:00Z']));
    assert.equal(live.length, 1);
    assert.notEqual(live[0].weather, null);
    assert.notEqual(live[0].aqhi, null);
  });

  test('keeps hours only one source covered', () => {
    const live = joinLive(snapshotW(['2026-09-11T12:00']), snapshotA(['2026-09-11T15:00:00Z']));
    assert.equal(live.length, 2);
    assert.equal(live[0].aqhi, null);
    assert.equal(live[1].weather, null);
  });

  test('is empty with nothing from either side', () => {
    assert.deepEqual(joinLive(null, null), []);
  });

  test('estimates an AQHI for every weather hour with pollutants, and not for ECCC-only hours', () => {
    const live = joinLive(snapshotW(['2026-09-11T12:00']), snapshotA(['2026-09-11T15:00:00Z']));
    assert.notEqual(live[0].aqhiEstimate, null);
    assert.equal(live[1].aqhiEstimate, null);
  });

  test('aqhiOf: ECCC wins where it has a value; the estimate fills where it does not', () => {
    const live = joinLive(
      snapshotW(['2026-09-11T12:00', '2026-09-11T13:00']),
      snapshotA(['2026-09-11T12:00:00Z']),
    );
    assert.deepEqual(aqhiOf(live[0]), { value: 3, source: 'eccc' });
    const filled = aqhiOf(live[1]);
    assert.equal(filled?.source, 'estimate');
    assert.equal(filled?.value, live[1].aqhiEstimate?.value);
  });

  test('aqhiOf: an ECCC reading with a null value does not block the estimate', () => {
    const w = snapshotW(['2026-09-11T12:00']);
    const a = snapshotA(['2026-09-11T12:00:00Z']);
    a.forecast[0] = aqhiReading(null, { timestamp: '2026-09-11T12:00:00Z' });
    const live = joinLive(w, a);
    assert.equal(aqhiOf(live[0])?.source, 'estimate');
  });

  test('aqhiOf: no pollutants and no ECCC value is null', () => {
    const w = snapshotW(['2026-09-11T12:00']);
    w.hours[0] = weather({ time: '2026-09-11T12:00', pm25: null });
    const live = joinLive(w, null);
    assert.equal(live[0].aqhiEstimate, null);
    assert.equal(aqhiOf(live[0]), null);
  });
});

describe('epochOfLocalIso', () => {
  test('applies the stated offset', () => {
    // 12:00 in Vancouver on this date is 19:00 UTC (PDT, offset -25200 s).
    const epoch = epochOfLocalIso('2026-09-11T12:00', -25200);
    assert.equal(new Date(epoch).toISOString(), '2026-09-11T19:00:00.000Z');
  });

  test('a zero offset is UTC', () => {
    const epoch = epochOfLocalIso('2026-09-11T12:00', 0);
    assert.equal(new Date(epoch).toISOString(), '2026-09-11T12:00:00.000Z');
  });

  test('uses no Intl or locale parsing', () => {
    // The device-side failure was toLocaleString not round-tripping through
    // Date. Pin that this function never calls it.
    const original = Date.prototype.toLocaleString;
    Date.prototype.toLocaleString = () => {
      throw new Error('toLocaleString must not be used for zone conversion');
    };
    try {
      assert.ok(Number.isFinite(epochOfLocalIso('2026-09-11T12:00', -25200)));
    } finally {
      Date.prototype.toLocaleString = original;
    }
  });
});

describe('display helpers', () => {
  test('formatAqhi shows 10+ above ten and — for nothing', () => {
    assert.equal(formatAqhi(aqhiReading(11)), '10+');
    assert.equal(formatAqhi(aqhiReading(2.46)), '2');
    assert.equal(formatAqhi(aqhiReading(null)), '—');
    assert.equal(formatAqhi(null), '—');
  });

  test('formatValue never renders null as 0', () => {
    assert.equal(formatValue(null, 1, ' mm'), '—');
    assert.equal(formatValue(0, 1, ' mm'), '0.0 mm', 'a real zero still shows');
  });

  test('compass maps degrees to sixteen points', () => {
    assert.equal(compass(0), 'N');
    assert.equal(compass(90), 'E');
    assert.equal(compass(315), 'NW');
    assert.equal(compass(359), 'N');
    assert.equal(compass(null), null);
  });

  test('formatAge is coarse and honest', () => {
    const now = Date.parse('2026-09-11T12:00:00Z');
    assert.equal(formatAge(now - 30_000, now), 'just now');
    assert.equal(formatAge(now - 12 * 60_000, now), '12 min ago');
    assert.equal(formatAge(now - 3 * 3_600_000, now), '3 h ago');
    assert.equal(formatAge(now - 2 * 86_400_000, now), '2 d ago');
  });
});
