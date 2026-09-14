/// <reference types="node" />
/**
 * Tests for the AQHI service's pure parts.
 *
 * No network: the distance calculation, the band derivation and the
 * nearest-community search. The live endpoints are exercised by
 * `npm run check:conditions`.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  ECCC_ATTRIBUTION,
  MAX_COMMUNITY_DISTANCE_KM,
  categoryFor,
  distanceKm,
  isAboveTen,
  nearestCommunity,
  publishedValue,
  withinRange,
  type AqhiCommunity,
} from './aqhi.ts';

/** Real coordinates, read from the live stations collection. */
const NORTH_OKANAGAN: AqhiCommunity = {
  locationId: 'JBOAP',
  name: 'North Okanagan',
  latitude: 50.258,
  longitude: -119.267,
  zone: 'pyr',
};
const CENTRAL_OKANAGAN: AqhiCommunity = {
  locationId: 'JAFUV',
  name: 'Central Okanagan',
  latitude: 49.883,
  longitude: -119.483,
  zone: 'pyr',
};
const KAMLOOPS: AqhiCommunity = {
  locationId: 'JAFNW',
  name: 'Kamloops',
  latitude: 50.673,
  longitude: -120.327,
  zone: 'pyr',
};

const ALL = [NORTH_OKANAGAN, CENTRAL_OKANAGAN, KAMLOOPS];

const VERNON = { lat: 50.27, lon: -119.27 };
const KELOWNA = { lat: 49.89, lon: -119.5 };

describe('distanceKm', () => {
  test('is zero for the same point', () => {
    assert.equal(distanceKm(50.27, -119.27, 50.27, -119.27), 0);
  });

  test('matches a known separation', () => {
    // Vernon to Kelowna is roughly 45 km as the crow flies.
    const km = distanceKm(VERNON.lat, VERNON.lon, KELOWNA.lat, KELOWNA.lon);
    assert.ok(km > 40 && km < 50, `expected 40-50 km, got ${km.toFixed(1)}`);
  });

  test('is symmetric', () => {
    const there = distanceKm(50.27, -119.27, 49.89, -119.5);
    const back = distanceKm(49.89, -119.5, 50.27, -119.27);
    assert.ok(Math.abs(there - back) < 1e-9);
  });

  test('handles longitude convergence near the pole', () => {
    // One degree of longitude is far shorter at 80°N than at the equator; a
    // flat approximation would report these as equal.
    const equator = distanceKm(0, 0, 0, 1);
    const arctic = distanceKm(80, 0, 80, 1);
    assert.ok(arctic < equator / 4, `${arctic.toFixed(1)} should be well under ${equator.toFixed(1)}`);
  });
});

describe('publishedValue', () => {
  test('rounds the raw reading to the whole number ECCC publishes', () => {
    assert.equal(publishedValue(2.46), 2);
    assert.equal(publishedValue(3.6), 4);
    assert.equal(publishedValue(null), null);
  });
});

describe('categoryFor', () => {
  test('bands on the published whole number, not the raw decimal', () => {
    // 3.6 is published as 4, so it bands as 4 does — not as 3 would.
    assert.equal(categoryFor(3.6), 'Moderate');
    assert.equal(categoryFor(3.4), 'Low');
  });

  test('covers every band boundary', () => {
    assert.equal(categoryFor(1), 'Low');
    assert.equal(categoryFor(3), 'Low');
    assert.equal(categoryFor(4), 'Moderate');
    assert.equal(categoryFor(6), 'Moderate');
    assert.equal(categoryFor(7), 'High');
    assert.equal(categoryFor(10), 'High');
    assert.equal(categoryFor(11), 'Very High');
  });

  test('is null when there is no value, never a default band', () => {
    assert.equal(categoryFor(null), null);
  });
});

describe('isAboveTen', () => {
  test('is false at exactly ten and true above it', () => {
    assert.equal(isAboveTen(10), false);
    assert.equal(isAboveTen(11), true);
  });

  test('follows the published rounding', () => {
    assert.equal(isAboveTen(10.4), false, 'publishes as 10');
    assert.equal(isAboveTen(10.6), true, 'publishes as 11');
  });

  test('is false for a missing value rather than throwing', () => {
    assert.equal(isAboveTen(null), false);
  });
});

describe('nearestCommunity', () => {
  test('picks the closest, not the first', () => {
    const near = nearestCommunity(ALL, VERNON.lat, VERNON.lon);
    assert.equal(near?.community.locationId, 'JBOAP');
    assert.ok(near !== null && near.distanceKm < 5, `${near?.distanceKm.toFixed(1)} km`);
  });

  test('resolves Kelowna to Central Okanagan', () => {
    const near = nearestCommunity(ALL, KELOWNA.lat, KELOWNA.lon);
    assert.equal(near?.community.locationId, 'JAFUV');
    assert.ok(near !== null && near.distanceKm < 5);
  });

  test('still returns the closest when it is far away', () => {
    // The caller applies the cutoff; this function only ranks.
    const remote = nearestCommunity(ALL, 57.5, -126);
    assert.notEqual(remote, null);
    assert.ok(
      remote !== null && remote.distanceKm > MAX_COMMUNITY_DISTANCE_KM,
      'a remote coordinate is beyond the cutoff',
    );
  });

  test('returns null for an empty list rather than throwing', () => {
    assert.equal(nearestCommunity([], VERNON.lat, VERNON.lon), null);
  });
});

describe('withinRange — the distance cutoff', () => {
  const at = (km: number) => ({ community: NORTH_OKANAGAN, distanceKm: km });

  test('inside the cutoff is ok', () => {
    const r = withinRange(at(99.9), MAX_COMMUNITY_DISTANCE_KM);
    assert.equal(r.status, 'ok');
  });

  test('exactly at the cutoff is still ok; just past it is not', () => {
    assert.equal(withinRange(at(100), 100).status, 'ok');
    const past = withinRange(at(100.1), 100);
    assert.equal(past.status, 'no-coverage');
    assert.ok(past.status === 'no-coverage' && past.nearestName === 'North Okanagan');
    assert.ok(past.status === 'no-coverage' && past.nearestKm === 100.1);
  });

  test('a wider cutoff admits a community the default refuses', () => {
    assert.equal(withinRange(at(150), MAX_COMMUNITY_DISTANCE_KM).status, 'no-coverage');
    assert.equal(withinRange(at(150), 200).status, 'ok');
    assert.equal(withinRange(at(250), 200).status, 'no-coverage');
  });

  test('no community at all is no-coverage with nothing to name', () => {
    assert.deepEqual(withinRange(null, 100), {
      status: 'no-coverage',
      nearestName: null,
      nearestKm: null,
    });
  });
});

describe('attribution', () => {
  test('is the exact required string', () => {
    assert.equal(
      ECCC_ATTRIBUTION,
      'Air Quality Health Index data provided by Environment and Climate Change Canada.',
    );
  });
});
