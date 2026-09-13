/**
 * The place precedence: override > manual > device > fallback.
 *
 * Run with `npm test`. Pure module, so no native stubs are needed.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { FALLBACK_PLACE } from './live.ts';
import type { LocationResult } from './location.ts';
import { needsDeviceLocation, resolvePlace, type ManualPlace } from './place.ts';

const revelstoke: ManualPlace = {
  name: 'Revelstoke',
  region: 'British Columbia, Canada',
  latitude: 50.9981,
  longitude: -118.1957,
};

const granted: LocationResult = {
  status: 'granted',
  coordinate: { latitude: 49.89, longitude: -119.5 },
  source: 'current',
};
const denied: LocationResult = { status: 'denied', canAskAgain: false };
const unavailable: LocationResult = {
  status: 'unavailable',
  reason: 'timeout',
  detail: 'no fix within 8000 ms',
};

describe('needsDeviceLocation', () => {
  test('only when there is neither an override nor a manual place', () => {
    assert.equal(needsDeviceLocation({ override: null, manual: null }), true);
    assert.equal(needsDeviceLocation({ override: null, manual: revelstoke }), false);
    assert.equal(needsDeviceLocation({ override: { latitude: 1, longitude: 2 }, manual: null }), false);
    assert.equal(
      needsDeviceLocation({ override: { latitude: 1, longitude: 2 }, manual: revelstoke }),
      false,
    );
  });
});

describe('resolvePlace', () => {
  test('override wins over everything, even a granted device fix', () => {
    const r = resolvePlace({
      override: { latitude: 57.5, longitude: -126 },
      manual: revelstoke,
      location: granted,
    });
    assert.equal(r.source, 'override');
    assert.deepEqual(r.coordinate, { latitude: 57.5, longitude: -126 });
    assert.equal(r.label, '57.5, -126');
    assert.equal(r.fallbackReason, null);
  });

  test('a manual place wins over a granted device fix', () => {
    const r = resolvePlace({ override: null, manual: revelstoke, location: granted });
    assert.equal(r.source, 'manual');
    assert.equal(r.label, 'Revelstoke');
    assert.equal(r.fallbackReason, null);
  });

  test('a manual place is rounded to two decimals', () => {
    const r = resolvePlace({ override: null, manual: revelstoke, location: null });
    assert.deepEqual(r.coordinate, { latitude: 51, longitude: -118.2 });
  });

  test('the device is used when nothing else applies', () => {
    const r = resolvePlace({ override: null, manual: null, location: granted });
    assert.equal(r.source, 'device');
    assert.deepEqual(r.coordinate, { latitude: 49.89, longitude: -119.5 });
    assert.equal(r.label, null);
    assert.equal(r.fallbackReason, null);
  });

  test('denied permission falls back, and says so', () => {
    const r = resolvePlace({ override: null, manual: null, location: denied });
    assert.equal(r.source, 'fallback');
    assert.equal(r.label, FALLBACK_PLACE.name);
    assert.deepEqual(r.coordinate, {
      latitude: FALLBACK_PLACE.latitude,
      longitude: FALLBACK_PLACE.longitude,
    });
    assert.equal(r.fallbackReason, 'denied');
  });

  test('a fix that could not be obtained falls back as unavailable', () => {
    const r = resolvePlace({ override: null, manual: null, location: unavailable });
    assert.equal(r.source, 'fallback');
    assert.equal(r.fallbackReason, 'unavailable');
  });

  test('a device that was never asked is treated as unavailable, not denied', () => {
    const r = resolvePlace({ override: null, manual: null, location: null });
    assert.equal(r.source, 'fallback');
    assert.equal(r.fallbackReason, 'unavailable');
  });
});
