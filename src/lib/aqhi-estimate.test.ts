/**
 * The AQHI estimate: ECCC's formula, unit conversion, and the trailing mean.
 *
 * Reference values were computed independently of this code from the
 * published formula. Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  MEAN_WINDOW_HOURS,
  NO2_UGM3_PER_PPB,
  O3_UGM3_PER_PPB,
  aqhiFromPollutants,
  estimateAqhiSeries,
} from './aqhi-estimate.ts';
import type { HourlyConditions } from './open-meteo.ts';

const near = (actual: number, expected: number, tolerance = 0.001) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${expected} ± ${tolerance}, got ${actual}`,
  );

describe('aqhiFromPollutants', () => {
  test('clean air is zero', () => {
    assert.equal(aqhiFromPollutants(0, 0, 0), 0);
  });

  test('matches the published formula', () => {
    // (NO₂ ppb, O₃ ppb, PM2.5 µg/m³) → AQHI, computed separately.
    near(aqhiFromPollutants(10, 30, 5), 2.6372);
    near(aqhiFromPollutants(20, 40, 12), 4.341);
    near(aqhiFromPollutants(30, 60, 50), 8.0642);
    near(aqhiFromPollutants(5, 25, 2), 1.8129);
  });

  test('exceeds ten under heavy smoke', () => {
    near(aqhiFromPollutants(60, 80, 150), 16.6664);
  });

  test('is monotonic in each pollutant', () => {
    const base = aqhiFromPollutants(10, 30, 5);
    assert.ok(aqhiFromPollutants(11, 30, 5) > base);
    assert.ok(aqhiFromPollutants(10, 31, 5) > base);
    assert.ok(aqhiFromPollutants(10, 30, 6) > base);
  });
});

describe('unit conversion', () => {
  test('µg/m³ per ppb at 25 °C', () => {
    near(NO2_UGM3_PER_PPB, 1.8816, 0.0005);
    near(O3_UGM3_PER_PPB, 1.9631, 0.0005);
  });
});

/* ── Series ──────────────────────────────────────────────────────────────── */

const hour = (
  time: string,
  pm25: number | null,
  ozoneUgm3: number | null,
  nitrogenDioxideUgm3: number | null,
): HourlyConditions => ({
  time,
  temperatureC: null,
  apparentTemperatureC: null,
  relativeHumidityPct: null,
  precipitationMm: null,
  precipitationProbabilityPct: null,
  windSpeedKmh: null,
  windGustsKmh: null,
  windDirectionDeg: null,
  uvIndex: null,
  pm25,
  pm10: null,
  ozoneUgm3,
  nitrogenDioxideUgm3,
  usAqi: null,
});

const at = (h: number) => `2026-09-13T${String(h).padStart(2, '0')}:00`;

describe('estimateAqhiSeries', () => {
  test('a steady series gives the formula value every hour, means widening to three', () => {
    // 5 µg/m³ PM2.5, 30 ppb O₃, 10 ppb NO₂, expressed in Open-Meteo's units.
    const o3 = 30 * O3_UGM3_PER_PPB;
    const no2 = 10 * NO2_UGM3_PER_PPB;
    const series = [0, 1, 2, 3].map((h) => hour(at(h), 5, o3, no2));
    const out = estimateAqhiSeries(series);
    assert.equal(out.length, 4);
    for (const e of out) {
      assert.ok(e);
      near(e.value, 2.6372);
      assert.equal(e.category, 'Low');
      assert.equal(e.isAboveTen, false);
    }
    assert.deepEqual(
      out.map((e) => e?.meanHours),
      [1, 2, 3, 3],
    );
    assert.equal(MEAN_WINDOW_HOURS, 3);
  });

  test('the mean is over the trailing three hours, not the hour alone', () => {
    // PM2.5 jumps at hour 2; the mean smooths it.
    const series = [
      hour(at(0), 0, 0, 0),
      hour(at(1), 0, 0, 0),
      hour(at(2), 30, 0, 0),
      hour(at(3), 30, 0, 0),
      hour(at(4), 30, 0, 0),
    ];
    const out = estimateAqhiSeries(series);
    near(out[2]!.value, aqhiFromPollutants(0, 0, 10));
    near(out[3]!.value, aqhiFromPollutants(0, 0, 20));
    near(out[4]!.value, aqhiFromPollutants(0, 0, 30));
  });

  test('an hour missing any pollutant has no estimate', () => {
    const series = [
      hour(at(0), 5, 60, 10),
      hour(at(1), null, 60, 10),
      hour(at(2), 5, null, 10),
      hour(at(3), 5, 60, null),
      hour(at(4), 5, 60, 10),
    ];
    const out = estimateAqhiSeries(series);
    assert.ok(out[0]);
    assert.equal(out[1], null);
    assert.equal(out[2], null);
    assert.equal(out[3], null);
    assert.ok(out[4]);
  });

  test('a gap earlier in the window shortens the mean rather than reaching past it', () => {
    const series = [
      hour(at(0), 30, 0, 0),
      hour(at(1), null, 0, 0),
      hour(at(2), 0, 0, 0),
    ];
    const out = estimateAqhiSeries(series);
    // Hour 2's PM mean stops at the null in hour 1: it is 0, not (30 + 0) / 2.
    assert.equal(out[2]!.value, 0);
    assert.equal(out[2]!.meanHours, 1);
  });

  test('non-consecutive hours are not averaged together', () => {
    const series = [hour(at(0), 30, 0, 0), hour(at(5), 0, 0, 0)];
    const out = estimateAqhiSeries(series);
    assert.equal(out[1]!.value, 0);
    assert.equal(out[1]!.meanHours, 1);
  });

  test('heavy smoke is flagged above ten', () => {
    const e = estimateAqhiSeries([hour(at(0), 150, 80 * O3_UGM3_PER_PPB, 60 * NO2_UGM3_PER_PPB)])[0];
    assert.ok(e);
    assert.equal(e.isAboveTen, true);
    assert.equal(e.category, 'Very High');
  });

  test('an empty series is an empty result', () => {
    assert.deepEqual(estimateAqhiSeries([]), []);
  });
});
