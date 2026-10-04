import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { AqhiCommunity, AqhiReading, AreaReading } from './aqhi.ts';
import { PIN_MAX_AGE_HOURS, inView, isCurrent, mapPins, nearPins, regionFor } from './map-pins.ts';
import type { Prefs } from './rating.ts';

const NOW = Date.parse('2026-10-04T20:30:00Z');
const HOUR = 3_600_000;

const NORTH_OKANAGAN: AqhiCommunity = {
  locationId: 'JBOAP',
  name: 'North Okanagan',
  latitude: 50.258,
  longitude: -119.267,
  zone: 'pyr',
};
const KAMLOOPS: AqhiCommunity = {
  locationId: 'JAFNW',
  name: 'Kamloops',
  latitude: 50.673,
  longitude: -120.327,
  zone: 'pyr',
};

function obs(community: AqhiCommunity, value: number | null, hoursAgo: number): AqhiReading {
  return {
    kind: 'observation',
    timestamp: new Date(NOW - hoursAgo * HOUR).toISOString(),
    value,
    isAboveTen: value !== null && Math.round(value) > 10,
    category: null,
    community: community.name,
    locationId: community.locationId,
    distanceKm: 0,
    publishedAt: null,
    specialNotes: null,
  };
}

const PREFS: Prefs = {
  activity: 'Running',
  sensitivity: 'Normal',
  rainTol: 1,
  windTol: 24,
  heatTol: 32,
};

describe('isCurrent', () => {
  test('a reading within the window is current', () => {
    assert.equal(isCurrent(obs(KAMLOOPS, 3, 1), NOW), true);
    assert.equal(isCurrent(obs(KAMLOOPS, 3, PIN_MAX_AGE_HOURS), NOW), true);
  });

  test('a reading past the window is not', () => {
    assert.equal(isCurrent(obs(KAMLOOPS, 3, PIN_MAX_AGE_HOURS + 0.1), NOW), false);
    assert.equal(isCurrent(obs(KAMLOOPS, 3, 23), NOW), false);
  });

  test('a null value or a missing reading is not current', () => {
    assert.equal(isCurrent(obs(KAMLOOPS, null, 0), NOW), false);
    assert.equal(isCurrent(null, NOW), false);
  });
});

describe('mapPins', () => {
  const area: AreaReading[] = [
    { community: NORTH_OKANAGAN, distanceKm: 1, observation: obs(NORTH_OKANAGAN, 4.4, 0.5) },
    { community: KAMLOOPS, distanceKm: 87, observation: obs(KAMLOOPS, 7, 22) },
  ];

  test('a current reading shows its published value and a level', () => {
    const [pin] = mapPins(area, PREFS, NOW);
    assert.equal(pin.value, '4');
    assert.notEqual(pin.level, null);
    assert.equal(pin.latitude, NORTH_OKANAGAN.latitude);
  });

  test('a stale reading shows "—" with no level, never the old number', () => {
    const [, pin] = mapPins(area, PREFS, NOW);
    assert.equal(pin.value, '—');
    assert.equal(pin.level, null);
    assert.equal(pin.observation, null);
  });

  test('a community with no observation is kept, as "—"', () => {
    const pins = mapPins([{ community: KAMLOOPS, distanceKm: 87, observation: null }], PREFS, NOW);
    assert.equal(pins.length, 1);
    assert.equal(pins[0].value, '—');
  });

  test('a preferred observation replaces that community only', () => {
    const preferred = obs(NORTH_OKANAGAN, 8, 0.2);
    const pins = mapPins(area, PREFS, NOW, { locationId: 'JBOAP', observation: preferred });
    assert.equal(pins[0].value, '8');
    assert.equal(pins[1].value, '—');
  });

  test('values above ten read "10+"', () => {
    const pins = mapPins(
      [{ community: KAMLOOPS, distanceKm: 87, observation: obs(KAMLOOPS, 12, 0) }],
      PREFS,
      NOW,
    );
    assert.equal(pins[0].value, '10+');
  });
});

describe('regionFor', () => {
  const VERNON = { latitude: 50.27, longitude: -119.27 };

  test('is centred on the place', () => {
    const r = regionFor(VERNON, [KAMLOOPS]);
    assert.equal(r.latitude, VERNON.latitude);
    assert.equal(r.longitude, VERNON.longitude);
  });

  test('is wide enough to contain every point', () => {
    const r = regionFor(VERNON, [NORTH_OKANAGAN, KAMLOOPS]);
    assert.ok(r.latitudeDelta / 2 >= Math.abs(KAMLOOPS.latitude - VERNON.latitude));
    assert.ok(r.longitudeDelta / 2 >= Math.abs(KAMLOOPS.longitude - VERNON.longitude));
  });

  test('never zooms in past the minimum, even with no points', () => {
    const r = regionFor(VERNON, []);
    assert.ok(r.latitudeDelta >= 1.2);
    // Same distance east-west as north-south at this latitude.
    assert.ok(r.longitudeDelta > r.latitudeDelta);
  });
});

describe('nearPins', () => {
  test('keeps the pins within the Map range and drops the rest', () => {
    const pins = mapPins(
      [
        { community: NORTH_OKANAGAN, distanceKm: 1, observation: null },
        { community: KAMLOOPS, distanceKm: 200, observation: null },
        { community: KAMLOOPS, distanceKm: 201, observation: null },
      ],
      PREFS,
      NOW,
    );
    assert.deepEqual(
      nearPins(pins).map((p) => p.distanceKm),
      [1, 200],
    );
  });
});

describe('inView', () => {
  const view = { latitude: 50, longitude: -119, latitudeDelta: 2, longitudeDelta: 3 };

  test('a point inside the view is drawn', () => {
    assert.equal(inView({ latitude: 50.5, longitude: -118 }, view), true);
  });

  test('a point just past the edge is drawn, so it slides in with a pan', () => {
    // Half-height is 1°; the margin adds a quarter of the view (0.5°) per side.
    assert.equal(inView({ latitude: 51.4, longitude: -119 }, view), true);
  });

  test('a point well outside the view is not', () => {
    assert.equal(inView({ latitude: 51.6, longitude: -119 }, view), false);
    assert.equal(inView({ latitude: 50, longitude: -123 }, view), false);
  });
});
