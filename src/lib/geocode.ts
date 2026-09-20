/**
 * Place search: a typed name to a coordinate, via Open-Meteo's geocoding
 * endpoint.
 *
 * The same provider and the same CC BY 4.0 licence as the weather, so the
 * attribution already on screen covers it, and no key or new dependency is
 * needed. What leaves the device is the text the user typed — a place name,
 * not a position — and what comes back is rounded to two decimal places on
 * the line it is received, the same as a device fix.
 *
 * No retry: a search is superseded by the next keystroke, not repeated. The
 * caller passes an AbortSignal and cancels the previous request itself.
 */
import { roundCoordinate } from './open-meteo.ts';
import type { ManualPlace } from './place.ts';
import { USER_AGENT } from './user-agent.ts';

const SEARCH_URL = 'https://geocoding-api.open-meteo.com/v1/search';
/** The endpoint returns nothing for a single character. */
export const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 10;
/** Shorter than a data fetch: a search that takes longer than this is stale. */
const REQUEST_TIMEOUT_MS = 6_000;

export interface GeocodeError {
  kind: 'http' | 'network' | 'timeout' | 'aborted' | 'parse';
  message: string;
}

export type GeocodeResult =
  | { ok: true; places: ManualPlace[] }
  | { ok: false; error: GeocodeError };

/** Trims and collapses whitespace; the string that is actually sent. */
export function normaliseQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * "British Columbia, Canada" from the parts the endpoint provides. Either can
 * be absent; both absent gives null rather than an empty string.
 */
function regionOf(entry: Record<string, unknown>): string | null {
  const parts = [entry.admin1, entry.country].filter(
    (p): p is string => typeof p === 'string' && p.length > 0,
  );
  return parts.length ? parts.join(', ') : null;
}

/**
 * Reads the response body into places.
 *
 * The endpoint omits `results` entirely when there are none, which is a
 * successful empty search, not an error. Entries missing a name or a finite
 * coordinate are dropped. Two entries that round to the same kilometre with
 * the same name and region are one place to the user, so only the first is
 * kept.
 */
export function parseGeocodeBody(body: unknown): ManualPlace[] {
  if (!body || typeof body !== 'object') return [];
  const results = (body as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];

  const seen = new Set<string>();
  const places: ManualPlace[] = [];
  for (const raw of results) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Record<string, unknown>;
    const { name, latitude, longitude } = entry;
    if (typeof name !== 'string' || !name) continue;
    if (typeof latitude !== 'number' || !Number.isFinite(latitude)) continue;
    if (typeof longitude !== 'number' || !Number.isFinite(longitude)) continue;

    const place: ManualPlace = {
      name,
      region: regionOf(entry),
      latitude: roundCoordinate(latitude),
      longitude: roundCoordinate(longitude),
    };
    const key = `${place.name}|${place.region ?? ''}|${place.latitude}|${place.longitude}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push(place);
  }
  return places;
}

export function buildSearchUrl(query: string): string {
  const params = new URLSearchParams({
    name: query,
    count: String(MAX_RESULTS),
    language: 'en',
    format: 'json',
  });
  return `${SEARCH_URL}?${params.toString()}`;
}

/**
 * Searches for places matching `query`.
 *
 * A query shorter than MIN_QUERY_LENGTH resolves to no places without a
 * request. Aborting via `signal` resolves to an 'aborted' error, which the
 * caller should treat as "ignore this result", not as a failure to show.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeocodeResult> {
  const q = normaliseQuery(query);
  if (q.length < MIN_QUERY_LENGTH) return { ok: true, places: [] };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  signal?.addEventListener('abort', onOuterAbort);

  try {
    const response = await fetch(buildSearchUrl(q), {
      signal: controller.signal,
      headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    });
    if (!response.ok) {
      return {
        ok: false,
        error: { kind: 'http', message: `place search responded ${response.status}` },
      };
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch (cause) {
      return {
        ok: false,
        error: {
          kind: 'parse',
          message: `place search returned unreadable JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
        },
      };
    }
    return { ok: true, places: parseGeocodeBody(body) };
  } catch (cause) {
    if (signal?.aborted) {
      return { ok: false, error: { kind: 'aborted', message: 'place search cancelled' } };
    }
    if (controller.signal.aborted) {
      return {
        ok: false,
        error: { kind: 'timeout', message: `place search timed out after ${REQUEST_TIMEOUT_MS} ms` },
      };
    }
    return {
      ok: false,
      error: {
        kind: 'network',
        message: `place search failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      },
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onOuterAbort);
  }
}
