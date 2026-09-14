/**
 * The Air Quality Health Index service: Environment and Climate Change Canada.
 *
 * Deliberately separate from the Open-Meteo layer. AQHI is tied to named
 * communities rather than a coordinate grid, publishes on its own cadence, and
 * comes from a different authority — merging the two models would hide all
 * three differences. Nothing here combines an AQHI value with anything else,
 * and nothing produces a single blended score.
 *
 * Source: https://api.weather.gc.ca, an OGC API Features service.
 *
 * Field names below were read from the live `queryables` endpoints rather than
 * assumed. Two things worth knowing, because they differ from how AQHI is
 * usually described:
 *
 *   - `aqhi` is always a number. The "10+" seen in published material is a
 *     display convention; the API returns 11 and above as plain numbers, and
 *     observations carry decimals (2.46) while forecasts are whole numbers.
 *   - There is no category field in either collection. See `AqhiCategory`.
 *
 * This module has no imports so it can be run directly under Node without a
 * bundler, which is how `scripts/check-conditions.mjs` exercises it live.
 */

/* ── Attribution ─────────────────────────────────────────────────────────── */

/** Required whenever this data is shown. */
export const ECCC_ATTRIBUTION =
  'Air Quality Health Index data provided by Environment and Climate Change Canada.';

/* ── Model ───────────────────────────────────────────────────────────────── */

/**
 * The band a value falls in.
 *
 * DERIVED, NOT RECEIVED. The API returns no category field of any kind — this
 * is computed here from ECCC's published thresholds (1-3, 4-6, 7-10, above
 * 10). ECCC extends each of these labels with a further phrase that this
 * project does not state, so the band name alone is used. Treat these as names
 * for ranges of the index, not as advice.
 */
export type AqhiCategory = 'Low' | 'Moderate' | 'High' | 'Very High';

/** An AQHI community. Identified by a 5-letter CGNDB code, e.g. "JBOAP". */
export interface AqhiCommunity {
  /** `location_id` — the CGNDB code. */
  locationId: string;
  /** `location_name_en`. */
  name: string;
  latitude: number;
  longitude: number;
  /** `eccc_administrative-zone`, e.g. "pyr". */
  zone: string | null;
}

/**
 * One AQHI value, observed or forecast.
 *
 * The community, the distance to it and the timestamp travel with every
 * reading rather than sitting on a wrapper, so a value can never be read
 * without its provenance. A four-hour-old number from 80 km away and a current
 * local one are the same shape, and only these fields tell them apart.
 */
export interface AqhiReading {
  kind: 'observation' | 'forecast';
  /** The hour this reading describes. ISO 8601 UTC, e.g. "2026-09-11T00:00:00Z". */
  timestamp: string;
  /** null when the source reported nothing. Never substituted. */
  value: number | null;
  /** True above 10, where the index is conventionally shown as "10+". */
  isAboveTen: boolean;
  /** Derived from `value`. Null whenever `value` is null. */
  category: AqhiCategory | null;
  /** Community name, verbatim from `location_name_en`. */
  community: string;
  locationId: string;
  /** Great-circle distance from the requested coordinate. */
  distanceKm: number;
  /** When the forecast issue was published. Null for observations. */
  publishedAt: string | null;
  /** ECCC's `special_notes_en`, verbatim. Null when they sent nothing. */
  specialNotes: string | null;
}

/** Everything held for one coordinate at one moment. */
export interface AqhiSnapshot {
  community: AqhiCommunity;
  distanceKm: number;
  /** The most recent observation, or null if none was published. */
  observation: AqhiReading | null;
  /** Hourly, ascending, all from the single newest forecast issue. */
  forecast: AqhiReading[];
  fetchedAt: number;
}

/* ── Result ──────────────────────────────────────────────────────────────── */

export interface AqhiError {
  kind: 'network' | 'timeout' | 'http' | 'malformed';
  message: string;
  status?: number;
}

/**
 * Three outcomes, not two.
 *
 * "No community within range" is a legitimate answer rather than a failure —
 * much of the BC interior has no AQHI community near it — and it carries
 * different information to the caller than a network error does. Making it a
 * third variant means a screen cannot accidentally treat one as the other.
 */
export type AqhiResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'no-coverage'; nearestName: string | null; nearestKm: number | null }
  | { status: 'error'; error: AqhiError };

/* ── Configuration ───────────────────────────────────────────────────────── */

const BASE = 'https://api.weather.gc.ca/collections';
const STATIONS = `${BASE}/aqhi-stations/items`;
const OBSERVATIONS = `${BASE}/aqhi-observations-realtime/items`;
const FORECASTS = `${BASE}/aqhi-forecasts-realtime/items`;

/** Beyond this, a reading describes somewhere else. */
export const MAX_COMMUNITY_DISTANCE_KM = 100;

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;

/**
 * Government endpoints carry an acceptable-use policy, so these are long.
 * Observations publish hourly at about 40 past; forecasts twice a day.
 */
const COMMUNITIES_TTL_MS = 24 * 60 * 60 * 1000;
const OBSERVATION_TTL_MS = 30 * 60 * 1000;
const FORECAST_TTL_MS = 3 * 60 * 60 * 1000;

/** One issue is 48 hourly rows; 200 comfortably spans the newest plus spill. */
const FORECAST_FETCH_LIMIT = 200;

/* ── Derivations ─────────────────────────────────────────────────────────── */

/**
 * The published index, which is the raw value rounded to a whole number.
 *
 * Observations arrive with decimals (2.46) but ECCC's bands are defined on
 * whole numbers, and the index is published as one. Banding the raw value
 * instead would put 3.6 in a different band from the 4 a reader would see.
 * The raw value is never overwritten — this is only used for derivations.
 */
export function publishedValue(value: number | null): number | null {
  return value === null ? null : Math.round(value);
}

/** See `AqhiCategory` — these thresholds are ECCC's, the mapping is ours. */
export function categoryFor(value: number | null): AqhiCategory | null {
  const published = publishedValue(value);
  if (published === null) return null;
  if (published > 10) return 'Very High';
  if (published >= 7) return 'High';
  if (published >= 4) return 'Moderate';
  return 'Low';
}

/** The index is shown as "10+" above ten, on the published whole number. */
export function isAboveTen(value: number | null): boolean {
  const published = publishedValue(value);
  return published !== null && published > 10;
}

const EARTH_RADIUS_KM = 6371;
const toRadians = (deg: number) => (deg * Math.PI) / 180;

/**
 * Great-circle distance.
 *
 * Haversine rather than a flat approximation: communities can be hundreds of
 * kilometres apart in the north, where a flat model's error grows with
 * latitude, and the 100 km cutoff has to mean the same thing everywhere.
 */
export function distanceKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/* ── HTTP ────────────────────────────────────────────────────────────────── */

type Fetched<T> = { status: 'ok'; value: T } | { status: 'error'; error: AqhiError };

/**
 * Unlike open-meteo.ts, this cannot append a throwaway query value: an OGC
 * API treats every unknown parameter as a property filter, so `&_=123`
 * matches nothing and comes back 200 with zero features. The request asks
 * the OS cache to stand aside through the fetch options instead.
 */
function bustCache(url: string): string {
  return url;
}

async function getJson(url: string): Promise<Fetched<unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(bustCache(url), {
      signal: controller.signal,
      cache: 'no-store',
      headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    });
    if (!response.ok) {
      return {
        status: 'error',
        error: { kind: 'http', message: `ECCC responded ${response.status}`, status: response.status },
      };
    }
    return { status: 'ok', value: (await response.json()) as unknown };
  } catch (cause) {
    const aborted = controller.signal.aborted;
    return {
      status: 'error',
      error: {
        kind: aborted ? 'timeout' : 'network',
        message: aborted
          ? `ECCC timed out after ${REQUEST_TIMEOUT_MS} ms`
          : `ECCC request failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

function retryable(error: AqhiError): boolean {
  if (error.kind === 'network' || error.kind === 'timeout') return true;
  return error.kind === 'http' && error.status !== undefined && error.status >= 500;
}

async function getJsonWithRetry(url: string): Promise<Fetched<unknown>> {
  let attempt = 0;
  let last = await getJson(url);
  while (last.status === 'error' && attempt < MAX_RETRIES && retryable(last.error)) {
    attempt += 1;
    last = await getJson(url);
  }
  return last;
}

/* ── Parsing ─────────────────────────────────────────────────────────────── */

interface Feature {
  geometry?: { coordinates?: unknown } | null;
  properties?: Record<string, unknown> | null;
}

function featuresOf(body: unknown): Fetched<Feature[]> {
  if (typeof body !== 'object' || body === null) {
    return { status: 'error', error: { kind: 'malformed', message: 'response was not an object' } };
  }
  const features = (body as { features?: unknown }).features;
  if (!Array.isArray(features)) {
    return { status: 'error', error: { kind: 'malformed', message: 'response had no features array' } };
  }
  return { status: 'ok', value: features as Feature[] };
}

/** A finite number, or null. Anything else — including a string — is null. */
function numberOrNull(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function stringOrNull(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/* ── Communities ─────────────────────────────────────────────────────────── */

let communitiesCache: { expiresAt: number; value: AqhiCommunity[] } | null = null;

/** Drops every cached response. Used by a manual refresh, and by tests. */
export function clearAqhiCache(): void {
  communitiesCache = null;
  observationCache.clear();
  forecastCache.clear();
}

/**
 * The full community list, cached for a day.
 *
 * There are around 134 of them and the set changes rarely, so this is fetched
 * once and reused rather than queried per lookup. Fetching the whole list also
 * means the nearest-community search happens locally, with no request per
 * candidate.
 */
export async function fetchCommunities(): Promise<Fetched<AqhiCommunity[]>> {
  if (communitiesCache && communitiesCache.expiresAt > Date.now()) {
    return { status: 'ok', value: communitiesCache.value };
  }

  const body = await getJsonWithRetry(`${STATIONS}?f=json&limit=500`);
  if (body.status === 'error') return body;

  const features = featuresOf(body.value);
  if (features.status === 'error') return features;

  const communities: AqhiCommunity[] = [];
  for (const f of features.value) {
    const p = f.properties ?? {};
    const coords = f.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;

    const longitude = numberOrNull(coords[0]);
    const latitude = numberOrNull(coords[1]);
    const locationId = stringOrNull(p['location_id']);
    const name = stringOrNull(p['location_name_en']);
    if (longitude === null || latitude === null || locationId === null || name === null) continue;

    communities.push({
      locationId,
      name,
      latitude,
      longitude,
      zone: stringOrNull(p['eccc_administrative-zone']),
    });
  }

  if (communities.length === 0) {
    return { status: 'error', error: { kind: 'malformed', message: 'no usable communities returned' } };
  }

  communitiesCache = { expiresAt: Date.now() + COMMUNITIES_TTL_MS, value: communities };
  return { status: 'ok', value: communities };
}

export interface NearestCommunity {
  community: AqhiCommunity;
  distanceKm: number;
}

/** The closest community to a coordinate, whatever the distance. */
export function nearestCommunity(
  communities: AqhiCommunity[],
  latitude: number,
  longitude: number,
): NearestCommunity | null {
  let best: NearestCommunity | null = null;
  for (const community of communities) {
    const km = distanceKm(latitude, longitude, community.latitude, community.longitude);
    if (!best || km < best.distanceKm) best = { community, distanceKm: km };
  }
  return best;
}

/**
 * Applies the distance cutoff to a ranked nearest community.
 *
 * Past the cutoff the community is named so the caller can say how far
 * the nearest one is, but no reading is fetched for it: it describes
 * somewhere else.
 */
export function withinRange(
  nearest: NearestCommunity | null,
  maxDistanceKm: number,
): AqhiResult<NearestCommunity> {
  if (!nearest) {
    return { status: 'no-coverage', nearestName: null, nearestKm: null };
  }
  if (nearest.distanceKm > maxDistanceKm) {
    return {
      status: 'no-coverage',
      nearestName: nearest.community.name,
      nearestKm: nearest.distanceKm,
    };
  }
  return { status: 'ok', value: nearest };
}

/**
 * The closest community, or a no-coverage result past the cutoff.
 *
 * The cutoff defaults to MAX_COMMUNITY_DISTANCE_KM, the rule the rating
 * model lives by. A caller may widen it for context it will label as such —
 * the Map does — but the reading it gets back is then not one the model
 * should see; the provider keeps the two apart.
 */
export async function findNearestCommunity(
  latitude: number,
  longitude: number,
  maxDistanceKm: number = MAX_COMMUNITY_DISTANCE_KM,
): Promise<AqhiResult<NearestCommunity>> {
  const communities = await fetchCommunities();
  if (communities.status === 'error') return communities;
  return withinRange(nearestCommunity(communities.value, latitude, longitude), maxDistanceKm);
}

/* ── Readings ────────────────────────────────────────────────────────────── */

const observationCache = new Map<string, { expiresAt: number; value: AqhiReading | null }>();
const forecastCache = new Map<string, { expiresAt: number; value: AqhiReading[] }>();

function toReading(
  kind: 'observation' | 'forecast',
  p: Record<string, unknown>,
  timestampField: string,
  nearest: NearestCommunity,
): AqhiReading | null {
  const timestamp = stringOrNull(p[timestampField]);
  if (timestamp === null) return null;

  const value = numberOrNull(p['aqhi']);
  return {
    kind,
    timestamp,
    value,
    isAboveTen: isAboveTen(value),
    category: categoryFor(value),
    community: stringOrNull(p['location_name_en']) ?? nearest.community.name,
    locationId: nearest.community.locationId,
    distanceKm: nearest.distanceKm,
    publishedAt: kind === 'forecast' ? stringOrNull(p['publication_datetime']) : null,
    specialNotes: stringOrNull(p['special_notes_en']),
  };
}

/**
 * The most recent observation for a community.
 *
 * `latest=true` is ECCC's own flag for the current hour, so the newest row is
 * chosen by the source rather than by sorting timestamps here.
 */
export async function fetchObservation(
  nearest: NearestCommunity,
): Promise<Fetched<AqhiReading | null>> {
  const key = nearest.community.locationId;
  const hit = observationCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return { status: 'ok', value: hit.value };

  const url = `${OBSERVATIONS}?f=json&location_id=${encodeURIComponent(key)}&latest=true&limit=1`;
  const body = await getJsonWithRetry(url);
  if (body.status === 'error') return body;

  const features = featuresOf(body.value);
  if (features.status === 'error') return features;

  const first = features.value[0];
  const reading = first?.properties
    ? toReading('observation', first.properties, 'observation_datetime', nearest)
    : null;

  observationCache.set(key, { expiresAt: Date.now() + OBSERVATION_TTL_MS, value: reading });
  return { status: 'ok', value: reading };
}

/**
 * The hourly forecast for a community, from the newest issue only.
 *
 * The collection has no `latest` flag and holds every issue, so one community
 * returns hundreds of rows spanning several publications. Rows are fetched
 * newest-issue-first, then filtered to the single newest `publication_datetime`
 * — without that, a stale morning issue and the current evening one would
 * interleave and the series would contradict itself.
 */
export async function fetchForecast(nearest: NearestCommunity): Promise<Fetched<AqhiReading[]>> {
  const key = nearest.community.locationId;
  const hit = forecastCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return { status: 'ok', value: hit.value };

  const url =
    `${FORECASTS}?f=json&location_id=${encodeURIComponent(key)}` +
    `&sortby=-publication_datetime&limit=${FORECAST_FETCH_LIMIT}`;
  const body = await getJsonWithRetry(url);
  if (body.status === 'error') return body;

  const features = featuresOf(body.value);
  if (features.status === 'error') return features;

  const rows = features.value
    .map((f) => (f.properties ? toReading('forecast', f.properties, 'forecast_datetime', nearest) : null))
    .filter((r): r is AqhiReading => r !== null);

  const newestIssue = rows.reduce<string | null>(
    (max, r) => (r.publishedAt && (max === null || r.publishedAt > max) ? r.publishedAt : max),
    null,
  );

  const forecast = rows
    .filter((r) => r.publishedAt === newestIssue)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  forecastCache.set(key, { expiresAt: Date.now() + FORECAST_TTL_MS, value: forecast });
  return { status: 'ok', value: forecast };
}

/* ── Public API ──────────────────────────────────────────────────────────── */

/**
 * Everything AQHI knows about a coordinate.
 *
 * Resolves the community first, then fetches the observation and the forecast
 * concurrently. A missing observation is not an error — ECCC sometimes has a
 * forecast and no current reading — so it comes back as null and the forecast
 * still arrives.
 */
export async function fetchAqhi(
  latitude: number,
  longitude: number,
  options: { maxDistanceKm?: number } = {},
): Promise<AqhiResult<AqhiSnapshot>> {
  const nearest = await findNearestCommunity(
    latitude,
    longitude,
    options.maxDistanceKm ?? MAX_COMMUNITY_DISTANCE_KM,
  );
  if (nearest.status !== 'ok') return nearest;

  const [observation, forecast] = await Promise.all([
    fetchObservation(nearest.value),
    fetchForecast(nearest.value),
  ]);

  if (observation.status === 'error') return observation;
  if (forecast.status === 'error') return forecast;

  return {
    status: 'ok',
    value: {
      community: nearest.value.community,
      distanceKm: nearest.value.distanceKm,
      observation: observation.value,
      forecast: forecast.value,
      fetchedAt: Date.now(),
    },
  };
}

/** Forecast hours at or after `from`, in order. */
export function forecastFrom(
  snapshot: AqhiSnapshot,
  from: string,
  count?: number,
): AqhiReading[] {
  const ahead = snapshot.forecast.filter((r) => r.timestamp >= from);
  return count === undefined ? ahead : ahead.slice(0, count);
}
