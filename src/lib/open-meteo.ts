/**
 * The data layer: hourly weather and air quality from Open-Meteo.
 *
 * Two keyless endpoints are fetched concurrently and joined on their
 * timestamps. Nothing here knows about screens, and nothing here interprets
 * the numbers — it reports what the sources returned, including what they
 * did not return.
 *
 * The central rule: a value that is missing stays missing. Nothing is
 * substituted with zero, carried forward from a previous hour, or
 * interpolated. A reading of `null` means "not reported", which is a
 * different thing from a low number, and only the caller can decide how to
 * present that difference.
 *
 * This module deliberately has no imports. That keeps it runnable directly
 * under Node (see `scripts/check-conditions.mjs`) without a bundler, which is
 * how the verification script exercises it against the live API.
 */

/* ── Attribution ─────────────────────────────────────────────────────────── */

/**
 * Required by Open-Meteo's CC BY 4.0 licence. This is a condition of use, not
 * a nicety — it has to be visible wherever this data is shown.
 */
export const OPEN_METEO_ATTRIBUTION = 'Weather and air quality data by Open-Meteo.com (CC BY 4.0)';

/* ── Model ───────────────────────────────────────────────────────────────── */

/**
 * One hour of conditions, weather and air quality together.
 *
 * Every reading is `number | null` with no exceptions, because either source
 * can omit any variable for any hour. Units follow Open-Meteo's metric
 * defaults, which happen to match what this project uses throughout.
 */
export interface HourlyConditions {
  /** ISO 8601 local time for the requested coordinate, e.g. "2026-09-10T14:00". */
  time: string;

  /** °C */
  temperatureC: number | null;
  /** °C, the "feels like" value */
  apparentTemperatureC: number | null;
  /** % */
  relativeHumidityPct: number | null;
  /** mm for the hour */
  precipitationMm: number | null;
  /** % */
  precipitationProbabilityPct: number | null;
  /** km/h at 10 m */
  windSpeedKmh: number | null;
  /** km/h at 10 m */
  windGustsKmh: number | null;
  /** degrees, meteorological (the direction wind comes from) */
  windDirectionDeg: number | null;
  /** dimensionless index */
  uvIndex: number | null;

  /** µg/m³ */
  pm25: number | null;
  /** µg/m³ */
  pm10: number | null;
  /** µg/m³. With NO₂ and PM2.5, an input to the AQHI estimate (aqhi-estimate.ts). */
  ozoneUgm3: number | null;
  /** µg/m³ */
  nitrogenDioxideUgm3: number | null;
  /** The United States AQI scale. Not the Canadian AQHI — see the note below. */
  usAqi: number | null;
}

/** A joined snapshot for one coordinate at one moment. */
export interface ConditionsSnapshot {
  /** The coordinate actually sent, after rounding. */
  latitude: number;
  longitude: number;
  /** IANA zone the timestamps are expressed in, when the API reported one. */
  timezone: string | null;
  /**
   * Offset of that zone from UTC at the time of the response, in seconds.
   * This is what converts the naive local stamps to instants: the API states
   * it outright, so nothing has to be derived from the zone name.
   */
  utcOffsetSeconds: number | null;
  /** Epoch milliseconds when this snapshot was fetched. */
  fetchedAt: number;
  /** Ascending by time. May contain hours where one source had nothing. */
  hours: HourlyConditions[];
}

/* ── Result ──────────────────────────────────────────────────────────────── */

export type ConditionsErrorKind =
  /** The request did not complete: offline, DNS, TLS, connection reset. */
  | 'network'
  /** The request exceeded the timeout. */
  | 'timeout'
  /** The server answered with a non-2xx status. */
  | 'http'
  /** The body parsed but was not the shape this module expects. */
  | 'malformed';

export interface ConditionsError {
  kind: ConditionsErrorKind;
  /** Intended for logs, not for end users. */
  message: string;
  /** Which endpoint failed, when that is known. */
  source?: 'weather' | 'airQuality';
  /** Present for `http`. */
  status?: number;
}

/**
 * A discriminated union rather than a thrown exception.
 *
 * Callers have to look at `ok` before they can reach `value`, so TypeScript
 * will not let a screen render a snapshot it has not checked. A thrown error
 * is easy to forget to catch; this one is impossible to forget to handle.
 */
export type Result<T> = { ok: true; value: T } | { ok: false; error: ConditionsError };

const ok = <T,>(value: T): Result<T> => ({ ok: true, value });
const err = <T,>(error: ConditionsError): Result<T> => ({ ok: false, error });

/* ── Configuration ───────────────────────────────────────────────────────── */

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const WEATHER_HOURLY = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'precipitation_probability',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'uv_index',
] as const;

const AIR_QUALITY_HOURLY = ['pm2_5', 'pm10', 'ozone', 'nitrogen_dioxide', 'us_aqi'] as const;

/** Five, to match the Forecast screen. Open-Meteo allows up to 16. */
const FORECAST_DAYS = 5;
const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * One retry, and only for failures that a second attempt could plausibly fix.
 * A 404 or a malformed body will be identical next time, so retrying those
 * just doubles the user's wait before the same error.
 */
const MAX_RETRIES = 1;

/* ── Coordinates ─────────────────────────────────────────────────────────── */

/**
 * Two decimal places is roughly a kilometre.
 *
 * Applied before the coordinate is sent as well as before it is used as a
 * cache key, so a precise device location never leaves the app. It also means
 * small movements reuse the same cache entry instead of re-fetching.
 */
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

/* ── Cache ───────────────────────────────────────────────────────────────── */

interface CacheEntry {
  expiresAt: number;
  snapshot: ConditionsSnapshot;
}

/**
 * In-memory only. Nothing is written to disk in this pass, so the cache dies
 * with the process and every cold start re-reads the sources.
 */
const cache = new Map<string, CacheEntry>();

/** Drops all cached snapshots. Used by a manual refresh, and by tests. */
export function clearConditionsCache(): void {
  cache.clear();
}

/* ── HTTP ────────────────────────────────────────────────────────────────── */

/**
 * Defeats the operating system's URL cache.
 *
 * This module already caches on its own terms. iOS's NSURLCache sits beneath
 * fetch, survives JavaScript reloads, and has been seen serving a stale body
 * for an identical GET URL — so a refresh that cleared this module's cache
 * could still come back with the old response. A per-request query value
 * makes every URL unique, and cache: 'no-store' asks politely as well.
 */
function bustCache(url: string): string {
  return `${url}&_=${Date.now()}`;
}

/**
 * Fetches JSON with a timeout.
 *
 * The timeout uses an AbortController rather than `AbortSignal.timeout`,
 * because the latter is not reliably present in React Native's fetch
 * implementation.
 */
async function getJson(
  url: string,
  source: 'weather' | 'airQuality',
): Promise<Result<unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(bustCache(url), {
      signal: controller.signal,
      cache: 'no-store',
      headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    });

    if (!response.ok) {
      return err({
        kind: 'http',
        message: `${source} responded ${response.status}`,
        source,
        status: response.status,
      });
    }

    return ok((await response.json()) as unknown);
  } catch (cause) {
    const aborted = controller.signal.aborted;
    return err({
      kind: aborted ? 'timeout' : 'network',
      message: aborted
        ? `${source} timed out after ${REQUEST_TIMEOUT_MS} ms`
        : `${source} request failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      source,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** True for failures where a second attempt might succeed. */
function isRetryable(error: ConditionsError): boolean {
  if (error.kind === 'network' || error.kind === 'timeout') return true;
  // 5xx is the server's problem and may be transient; 4xx is ours and will not
  // change on a retry.
  return error.kind === 'http' && error.status !== undefined && error.status >= 500;
}

async function getJsonWithRetry(
  url: string,
  source: 'weather' | 'airQuality',
): Promise<Result<unknown>> {
  let attempt = 0;
  let last = await getJson(url, source);

  while (!last.ok && attempt < MAX_RETRIES && isRetryable(last.error)) {
    attempt += 1;
    last = await getJson(url, source);
  }

  return last;
}

/* ── Parsing ─────────────────────────────────────────────────────────────── */

/**
 * Reads one variable array out of an `hourly` block.
 *
 * Anything that is not a finite number becomes null — that covers the API's
 * own nulls, a shorter array than `time`, and a variable the response omitted
 * entirely. It never invents a value to fill a gap.
 */
function numberAt(hourly: Record<string, unknown>, key: string, index: number): number | null {
  const column = hourly[key];
  if (!Array.isArray(column)) return null;
  const raw: unknown = column[index];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function readHourlyBlock(body: unknown): Result<{ times: string[]; hourly: Record<string, unknown> }> {
  if (typeof body !== 'object' || body === null) {
    return err({ kind: 'malformed', message: 'response was not an object' });
  }
  const hourly = (body as { hourly?: unknown }).hourly;
  if (typeof hourly !== 'object' || hourly === null) {
    return err({ kind: 'malformed', message: 'response had no hourly block' });
  }
  const times = (hourly as { time?: unknown }).time;
  if (!Array.isArray(times) || !times.every((t) => typeof t === 'string')) {
    return err({ kind: 'malformed', message: 'hourly.time was not an array of strings' });
  }
  return ok({ times: times as string[], hourly: hourly as Record<string, unknown> });
}

function readTimezone(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const tz = (body as { timezone?: unknown }).timezone;
  return typeof tz === 'string' ? tz : null;
}

function readUtcOffset(body: unknown): number | null {
  if (typeof body !== 'object' || body === null) return null;
  const raw = (body as { utc_offset_seconds?: unknown }).utc_offset_seconds;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

/* ── Endpoints ───────────────────────────────────────────────────────────── */

function buildUrl(base: string, latitude: number, longitude: number, hourly: readonly string[]): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    timezone: 'auto',
    forecast_days: String(FORECAST_DAYS),
    hourly: hourly.join(','),
  });
  return `${base}?${params.toString()}`;
}

/** The weather half, keyed by timestamp. */
export async function fetchWeather(
  latitude: number,
  longitude: number,
): Promise<
  Result<{
    timezone: string | null;
    utcOffsetSeconds: number | null;
    byTime: Map<string, Partial<HourlyConditions>>;
  }>
> {
  const lat = roundCoordinate(latitude);
  const lon = roundCoordinate(longitude);

  const body = await getJsonWithRetry(buildUrl(WEATHER_URL, lat, lon, WEATHER_HOURLY), 'weather');
  if (!body.ok) return body;

  const block = readHourlyBlock(body.value);
  if (!block.ok) return err({ ...block.error, source: 'weather' });

  const { times, hourly } = block.value;
  const byTime = new Map<string, Partial<HourlyConditions>>();

  times.forEach((time, i) => {
    byTime.set(time, {
      temperatureC: numberAt(hourly, 'temperature_2m', i),
      apparentTemperatureC: numberAt(hourly, 'apparent_temperature', i),
      relativeHumidityPct: numberAt(hourly, 'relative_humidity_2m', i),
      precipitationMm: numberAt(hourly, 'precipitation', i),
      precipitationProbabilityPct: numberAt(hourly, 'precipitation_probability', i),
      windSpeedKmh: numberAt(hourly, 'wind_speed_10m', i),
      windGustsKmh: numberAt(hourly, 'wind_gusts_10m', i),
      windDirectionDeg: numberAt(hourly, 'wind_direction_10m', i),
      uvIndex: numberAt(hourly, 'uv_index', i),
    });
  });

  return ok({
    timezone: readTimezone(body.value),
    utcOffsetSeconds: readUtcOffset(body.value),
    byTime,
  });
}

/** The air-quality half, keyed by timestamp. */
export async function fetchAirQuality(
  latitude: number,
  longitude: number,
): Promise<
  Result<{
    timezone: string | null;
    utcOffsetSeconds: number | null;
    byTime: Map<string, Partial<HourlyConditions>>;
  }>
> {
  const lat = roundCoordinate(latitude);
  const lon = roundCoordinate(longitude);

  const body = await getJsonWithRetry(
    buildUrl(AIR_QUALITY_URL, lat, lon, AIR_QUALITY_HOURLY),
    'airQuality',
  );
  if (!body.ok) return body;

  const block = readHourlyBlock(body.value);
  if (!block.ok) return err({ ...block.error, source: 'airQuality' });

  const { times, hourly } = block.value;
  const byTime = new Map<string, Partial<HourlyConditions>>();

  times.forEach((time, i) => {
    byTime.set(time, {
      pm25: numberAt(hourly, 'pm2_5', i),
      pm10: numberAt(hourly, 'pm10', i),
      ozoneUgm3: numberAt(hourly, 'ozone', i),
      nitrogenDioxideUgm3: numberAt(hourly, 'nitrogen_dioxide', i),
      usAqi: numberAt(hourly, 'us_aqi', i),
    });
  });

  return ok({
    timezone: readTimezone(body.value),
    utcOffsetSeconds: readUtcOffset(body.value),
    byTime,
  });
}

/* ── Join ────────────────────────────────────────────────────────────────── */

/** Every field null. The starting point for an hour only one source reported. */
function emptyHour(time: string): HourlyConditions {
  return {
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
    pm25: null,
    pm10: null,
    ozoneUgm3: null,
    nitrogenDioxideUgm3: null,
    usAqi: null,
  };
}

/**
 * Joins the two halves on their timestamps.
 *
 * The result is the union of both sets of hours, not the intersection and not
 * one side's array. The endpoints can start at different hours or return
 * different lengths, so pairing by array position would silently mislabel
 * readings — an hour of air quality attached to a different hour's weather.
 * Matching on the timestamp string makes that impossible, and an hour only one
 * source covered still appears, with the other source's fields null.
 */
export function joinByTime(
  weather: Map<string, Partial<HourlyConditions>>,
  airQuality: Map<string, Partial<HourlyConditions>>,
): HourlyConditions[] {
  const times = new Set<string>([...weather.keys(), ...airQuality.keys()]);

  return [...times]
    .sort()
    .map((time) => ({ ...emptyHour(time), ...weather.get(time), ...airQuality.get(time) }));
}

/* ── Public API ──────────────────────────────────────────────────────────── */

/**
 * Fetches both sources concurrently and returns one joined snapshot.
 *
 * Both requests start together rather than in sequence, so the wait is the
 * slower of the two rather than their sum.
 *
 * If either source fails the whole call fails. The alternative — returning
 * weather with every air field null — would be indistinguishable at a glance
 * from a genuinely clean hour, and this app exists to report air. Callers get
 * an explicit error they must handle instead. Relaxing that is a change to
 * this function alone.
 */
export async function fetchConditions(
  latitude: number,
  longitude: number,
  options: { force?: boolean } = {},
): Promise<Result<ConditionsSnapshot>> {
  const lat = roundCoordinate(latitude);
  const lon = roundCoordinate(longitude);
  const key = cacheKey(lat, lon);

  if (!options.force) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return ok(hit.snapshot);
  }

  const [weather, airQuality] = await Promise.all([
    fetchWeather(lat, lon),
    fetchAirQuality(lat, lon),
  ]);

  if (!weather.ok) return weather;
  if (!airQuality.ok) return airQuality;

  const snapshot: ConditionsSnapshot = {
    latitude: lat,
    longitude: lon,
    timezone: weather.value.timezone ?? airQuality.value.timezone,
    utcOffsetSeconds: weather.value.utcOffsetSeconds ?? airQuality.value.utcOffsetSeconds,
    fetchedAt: Date.now(),
    hours: joinByTime(weather.value.byTime, airQuality.value.byTime),
  };

  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, snapshot });
  return ok(snapshot);
}

/**
 * The hours at or after `from`, in order.
 *
 * Compares the ISO strings directly, which is reliable because both sides are the
 * same fixed-width local-time format from the same response.
 */
export function hoursFrom(
  snapshot: ConditionsSnapshot,
  from: string,
  count?: number,
): HourlyConditions[] {
  const ahead = snapshot.hours.filter((h) => h.time >= from);
  return count === undefined ? ahead : ahead.slice(0, count);
}
