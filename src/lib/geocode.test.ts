/**
 * The geocoding parser and request shape, against a captured response.
 *
 * Run with `npm test`. The live endpoint is not called here; `searchPlaces`
 * is exercised with a stubbed `fetch` for the short-query and abort paths.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import {
  MIN_QUERY_LENGTH,
  buildSearchUrl,
  normaliseQuery,
  parseGeocodeBody,
  searchPlaces,
} from './geocode.ts';

/** Trimmed from a real response for "Revelstoke", 2026-09-13. */
const REVELSTOKE = {
  results: [
    {
      id: 6121621,
      name: 'Revelstoke',
      latitude: 50.99712,
      longitude: -118.1953,
      feature_code: 'PPL',
      country_code: 'CA',
      country: 'Canada',
      admin1: 'British Columbia',
      admin2: 'Columbia-Shuswap Regional District',
    },
    {
      id: 6121620,
      name: 'Revelstoke',
      latitude: 45.35397,
      longitude: -75.69537,
      feature_code: 'PPL',
      country: 'Canada',
      admin1: 'Ontario',
    },
    {
      id: 6121622,
      name: 'Revelstoke Dam',
      latitude: 51.04987,
      longitude: -118.19397,
      feature_code: 'DAM',
      country: 'Canada',
      admin1: 'British Columbia',
    },
  ],
  generationtime_ms: 0.9,
};

describe('normaliseQuery', () => {
  test('trims and collapses whitespace', () => {
    assert.equal(normaliseQuery('  Salmon   Arm '), 'Salmon Arm');
    assert.equal(normaliseQuery('\tV\n'), 'V');
  });
});

describe('buildSearchUrl', () => {
  test('encodes the query and asks for English JSON', () => {
    const url = new URL(buildSearchUrl('Salmon Arm'));
    assert.equal(url.origin + url.pathname, 'https://geocoding-api.open-meteo.com/v1/search');
    assert.equal(url.searchParams.get('name'), 'Salmon Arm');
    assert.equal(url.searchParams.get('language'), 'en');
    assert.equal(url.searchParams.get('format'), 'json');
    assert.equal(url.searchParams.get('count'), '10');
  });
});

describe('parseGeocodeBody', () => {
  test('reads name, region and a rounded coordinate', () => {
    const places = parseGeocodeBody(REVELSTOKE);
    assert.equal(places.length, 3);
    assert.deepEqual(places[0], {
      name: 'Revelstoke',
      region: 'British Columbia, Canada',
      latitude: 51,
      longitude: -118.2,
    });
    assert.deepEqual(places[1], {
      name: 'Revelstoke',
      region: 'Ontario, Canada',
      latitude: 45.35,
      longitude: -75.7,
    });
    assert.equal(places[2].name, 'Revelstoke Dam');
  });

  test('never carries more than two decimals', () => {
    for (const p of parseGeocodeBody(REVELSTOKE)) {
      assert.equal(p.latitude, Math.round(p.latitude * 100) / 100);
      assert.equal(p.longitude, Math.round(p.longitude * 100) / 100);
    }
  });

  test('a body with no results key is an empty search, not an error', () => {
    assert.deepEqual(parseGeocodeBody({ generationtime_ms: 0.1 }), []);
    assert.deepEqual(parseGeocodeBody(null), []);
    assert.deepEqual(parseGeocodeBody('nope'), []);
    assert.deepEqual(parseGeocodeBody({ results: 'nope' }), []);
  });

  test('region is null when neither admin1 nor country is present', () => {
    const [p] = parseGeocodeBody({ results: [{ name: 'X', latitude: 1, longitude: 2 }] });
    assert.equal(p.region, null);
  });

  test('region is whichever part is present', () => {
    const [a, b] = parseGeocodeBody({
      results: [
        { name: 'A', latitude: 1, longitude: 2, country: 'Canada' },
        { name: 'B', latitude: 1, longitude: 2, admin1: 'Yukon' },
      ],
    });
    assert.equal(a.region, 'Canada');
    assert.equal(b.region, 'Yukon');
  });

  test('entries missing a name or a finite coordinate are dropped', () => {
    const places = parseGeocodeBody({
      results: [
        { name: '', latitude: 1, longitude: 2 },
        { latitude: 1, longitude: 2 },
        { name: 'NoLat', longitude: 2 },
        { name: 'BadLon', latitude: 1, longitude: 'east' },
        { name: 'Inf', latitude: Infinity, longitude: 2 },
        null,
        'junk',
        { name: 'Good', latitude: 1, longitude: 2 },
      ],
    });
    assert.equal(places.length, 1);
    assert.equal(places[0].name, 'Good');
  });

  test('two entries that round to the same place are one', () => {
    const places = parseGeocodeBody({
      results: [
        { name: 'Twin', latitude: 50.001, longitude: -119.001, country: 'Canada' },
        { name: 'Twin', latitude: 50.004, longitude: -119.004, country: 'Canada' },
        { name: 'Twin', latitude: 50.004, longitude: -119.004, country: 'Chile' },
      ],
    });
    assert.equal(places.length, 2);
    assert.equal(places[1].region, 'Chile');
  });
});

describe('searchPlaces', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test('a query below the minimum length makes no request', async () => {
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response('{}');
    }) as typeof fetch;
    const r = await searchPlaces('V'.repeat(MIN_QUERY_LENGTH - 1));
    assert.deepEqual(r, { ok: true, places: [] });
    assert.equal(called, false);
  });

  test('whitespace alone is below the minimum', async () => {
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response('{}');
    }) as typeof fetch;
    await searchPlaces('    ');
    assert.equal(called, false);
  });

  test('a successful response is parsed', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(REVELSTOKE), { status: 200 })) as typeof fetch;
    const r = await searchPlaces('Revelstoke');
    assert.ok(r.ok);
    assert.equal(r.places.length, 3);
  });

  test('an HTTP failure is reported, not thrown', async () => {
    globalThis.fetch = (async () => new Response('', { status: 503 })) as typeof fetch;
    const r = await searchPlaces('Revelstoke');
    assert.ok(!r.ok);
    assert.equal(r.error.kind, 'http');
  });

  test('unreadable JSON is a parse error', async () => {
    globalThis.fetch = (async () => new Response('<html>', { status: 200 })) as typeof fetch;
    const r = await searchPlaces('Revelstoke');
    assert.ok(!r.ok);
    assert.equal(r.error.kind, 'parse');
  });

  test('a caller abort resolves as aborted', async () => {
    globalThis.fetch = ((_: string, init?: RequestInit) =>
      new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      })) as unknown as typeof fetch;
    const controller = new AbortController();
    const pending = searchPlaces('Revelstoke', controller.signal);
    controller.abort();
    const r = await pending;
    assert.ok(!r.ok);
    assert.equal(r.error.kind, 'aborted');
  });

  test('a network failure is reported', async () => {
    globalThis.fetch = (async () => {
      throw new TypeError('Network request failed');
    }) as typeof fetch;
    const r = await searchPlaces('Revelstoke');
    assert.ok(!r.ok);
    assert.equal(r.error.kind, 'network');
  });
});
