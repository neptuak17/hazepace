/// <reference types="node" />
/**
 * Tests for the data layer's pure parts.
 *
 * No network: these cover the join, the rounding and the slicing, which are
 * the pieces that can go wrong silently. The live endpoints are exercised
 * separately by `npm run check:conditions`.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  OPEN_METEO_ATTRIBUTION,
  hoursFrom,
  joinByTime,
  roundCoordinate,
  type ConditionsSnapshot,
  type HourlyConditions,
} from './open-meteo.ts';

const weatherAt = (temp: number | null): Partial<HourlyConditions> => ({
  temperatureC: temp,
  windSpeedKmh: 10,
});

const airAt = (pm: number | null): Partial<HourlyConditions> => ({ pm25: pm, usAqi: 30 });

describe('roundCoordinate', () => {
  test('rounds to two decimal places', () => {
    assert.equal(roundCoordinate(50.2712345), 50.27);
    assert.equal(roundCoordinate(-119.2789), -119.28);
  });

  test('does not send more precision than it was given', () => {
    assert.equal(roundCoordinate(50), 50);
    assert.equal(roundCoordinate(-119.2), -119.2);
  });
});

describe('joinByTime', () => {
  test('pairs readings by timestamp, not by position', () => {
    // Air quality starts an hour later than weather. Joining by index would
    // attach 09:00 air to 08:00 weather.
    const weather = new Map([
      ['2026-09-10T08:00', weatherAt(12)],
      ['2026-09-10T09:00', weatherAt(15)],
    ]);
    const air = new Map([['2026-09-10T09:00', airAt(4.2)]]);

    const hours = joinByTime(weather, air);

    assert.equal(hours.length, 2);
    assert.deepEqual(
      hours.map((h) => [h.time, h.temperatureC, h.pm25]),
      [
        ['2026-09-10T08:00', 12, null],
        ['2026-09-10T09:00', 15, 4.2],
      ],
    );
  });

  test('keeps hours only one source reported, with the other side null', () => {
    const weather = new Map([['2026-09-10T08:00', weatherAt(12)]]);
    const air = new Map([['2026-09-10T23:00', airAt(9)]]);

    const hours = joinByTime(weather, air);

    assert.equal(hours.length, 2, 'the union, not the intersection');
    assert.equal(hours[0].pm25, null, 'no air for the weather-only hour');
    assert.equal(hours[1].temperatureC, null, 'no weather for the air-only hour');
  });

  test('returns hours in ascending time order regardless of insertion order', () => {
    const weather = new Map([
      ['2026-09-10T22:00', weatherAt(9)],
      ['2026-09-10T08:00', weatherAt(12)],
      ['2026-09-11T03:00', weatherAt(7)],
    ]);

    const hours = joinByTime(weather, new Map());

    assert.deepEqual(hours.map((h) => h.time), [
      '2026-09-10T08:00',
      '2026-09-10T22:00',
      '2026-09-11T03:00',
    ]);
  });

  test('a null reading stays null and is never filled in', () => {
    const weather = new Map([
      ['2026-09-10T08:00', weatherAt(12)],
      ['2026-09-10T09:00', weatherAt(null)],
    ]);
    const air = new Map([
      ['2026-09-10T08:00', airAt(4.2)],
      ['2026-09-10T09:00', airAt(null)],
    ]);

    const hours = joinByTime(weather, air);

    assert.equal(hours[1].temperatureC, null, 'not carried forward from 08:00');
    assert.equal(hours[1].pm25, null, 'not substituted with zero');
    assert.notEqual(hours[1].pm25, 0, 'a null must never read as clean air');
  });

  test('every field is present on an hour neither source covered fully', () => {
    const hours = joinByTime(new Map([['2026-09-10T08:00', {}]]), new Map());
    const h = hours[0];
    // The shape is complete even when the content is not, so callers can read
    // any field without a guard.
    assert.deepEqual(Object.keys(h).sort(), [
      'apparentTemperatureC',
      'pm10',
      'pm25',
      'precipitationMm',
      'precipitationProbabilityPct',
      'relativeHumidityPct',
      'temperatureC',
      'time',
      'usAqi',
      'uvIndex',
      'windDirectionDeg',
      'windGustsKmh',
      'windSpeedKmh',
    ]);
    assert.equal(h.usAqi, null);
  });

  test('handles both sources being empty', () => {
    assert.deepEqual(joinByTime(new Map(), new Map()), []);
  });
});

describe('hoursFrom', () => {
  const snapshot = (times: string[]): ConditionsSnapshot => ({
    latitude: 50.27,
    longitude: -119.27,
    timezone: 'America/Vancouver',
    utcOffsetSeconds: -25200,
    fetchedAt: 0,
    hours: joinByTime(new Map(times.map((t) => [t, weatherAt(10)])), new Map()),
  });

  test('drops hours before the cutoff', () => {
    const s = snapshot(['2026-09-10T06:00', '2026-09-10T07:00', '2026-09-10T08:00']);
    const ahead = hoursFrom(s, '2026-09-10T07:00');
    assert.deepEqual(ahead.map((h) => h.time), ['2026-09-10T07:00', '2026-09-10T08:00']);
  });

  test('limits to count when given', () => {
    const s = snapshot(['2026-09-10T06:00', '2026-09-10T07:00', '2026-09-10T08:00']);
    assert.equal(hoursFrom(s, '2026-09-10T06:00', 2).length, 2);
  });

  test('returns empty rather than throwing when everything is in the past', () => {
    const s = snapshot(['2026-09-10T06:00']);
    assert.deepEqual(hoursFrom(s, '2026-09-11T00:00'), []);
  });
});

describe('attribution', () => {
  test('is the exact string the licence requires', () => {
    assert.equal(
      OPEN_METEO_ATTRIBUTION,
      'Weather and air quality data by Open-Meteo.com (CC BY 4.0)',
    );
  });
});
