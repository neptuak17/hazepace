/**
 * The bridge between the two data services and the screens.
 *
 * Neither service knows about the other, and neither knows what the rating
 * model wants. This module joins their snapshots hour by hour, shapes the
 * result for each screen, and decides — on one rule only — whether an hour is
 * complete enough for the model to look at.
 *
 * That rule: the model runs on an hour only when every input it needs is
 * present. An hour missing its AQHI, or its temperature, or anything else,
 * gets no verdict at all. Running the model on a partial hour would produce a
 * judgment from data that does not exist, and the screens must show that hour
 * as unavailable instead.
 *
 * Time is handled once, here. Open-Meteo reports local naive time for the
 * coordinate ("2026-09-11T17:00"); ECCC reports UTC. Both are converted to
 * epoch milliseconds for joining, and every display formats from epoch in the
 * device's own zone.
 *
 * The model is imported by relative path with its extension rather than the
 * @/ alias: the alias is Metro's, and this module also has to load under plain
 * Node for its tests.
 */
import type { AqhiReading, AqhiSnapshot } from '@/lib/aqhi';
import type { ConditionsSnapshot, HourlyConditions } from '@/lib/open-meteo';
import {
  judge,
  longestRun,
  type HourReading,
  type Level,
  type Prefs,
  type TimeFormat,
} from './rating.ts';

/* ── Location ────────────────────────────────────────────────────────────── */

/**
 * Hardcoded for this pass. Device location comes later.
 *
 * EXPO_PUBLIC_LAT / EXPO_PUBLIC_LON override it at bundle time, which is how
 * the no-coverage and error paths are exercised without editing code:
 * a remote coordinate for no coverage, an impossible one (999) for an HTTP
 * error from both sources. Metro inlines these, so change them by restarting
 * it with --clear.
 */
const envNumber = (raw: string | undefined): number | null => {
  const n = Number(raw);
  return raw !== undefined && raw !== '' && Number.isFinite(n) ? n : null;
};

export const VERNON = {
  latitude: envNumber(process.env.EXPO_PUBLIC_LAT) ?? 50.27,
  longitude: envNumber(process.env.EXPO_PUBLIC_LON) ?? -119.27,
  name: 'Vernon',
} as const;

/* ── Time ────────────────────────────────────────────────────────────────── */

const HOUR_MS = 3_600_000;

/**
 * Epoch milliseconds for a naive local ISO stamp in a named zone.
 *
 * There is no library for this and Date has no zone parameter, so the offset
 * is measured: format the same instant in the target zone and in UTC, and the
 * difference is the zone's offset at that instant. If Intl is unavailable the
 * stamp is read as device-local, which is right whenever the device is in the
 * same zone as the coordinate.
 */
export function epochOfLocalIso(iso: string, timeZone: string | null): number {
  const asUtc = Date.parse(iso.length === 16 ? `${iso}:00Z` : `${iso}Z`);
  if (Number.isNaN(asUtc)) return NaN;
  if (!timeZone) return asUtc + new Date(asUtc).getTimezoneOffset() * 60_000;

  try {
    const probe = new Date(asUtc);
    const inZone = new Date(probe.toLocaleString('en-US', { timeZone }));
    const inUtc = new Date(probe.toLocaleString('en-US', { timeZone: 'UTC' }));
    return asUtc + (inUtc.getTime() - inZone.getTime());
  } catch {
    return asUtc + new Date(asUtc).getTimezoneOffset() * 60_000;
  }
}

/** Device-local hour of day as a fraction, e.g. 07:40 → 7.66. */
export function fractionalHour(epochMs: number): number {
  const d = new Date(epochMs);
  return d.getHours() + d.getMinutes() / 60;
}

/** Device-local calendar key, e.g. "2026-09-11". */
export function localDateKey(epochMs: number): string {
  const d = new Date(epochMs);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Thu 11 Sep", device-local. */
export function formatDate(epochMs: number): string {
  const d = new Date(epochMs);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

/** "Thu", device-local. */
export function formatDayName(epochMs: number): string {
  return DAY_NAMES[new Date(epochMs).getDay()];
}

/** "11 Sep", device-local. */
export function formatShortDate(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

/** Clock time in the chosen format, device-local. */
export function formatClock(epochMs: number, fmt: TimeFormat): string {
  const d = new Date(epochMs);
  const h = d.getHours();
  const m = d.getMinutes();
  if (fmt === '12-hour') {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''}${h >= 12 ? ' pm' : ' am'}`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * How old a reading is, as text.
 *
 * Deliberately coarse. "2 h ago" is what a reader needs to decide whether to
 * trust a number; "1 h 47 min ago" is precision nobody uses.
 */
export function formatAge(epochMs: number, nowMs: number): string {
  // Floored throughout: an age reads as "at least this old", never rounded
  // younger.
  const minutes = Math.floor((nowMs - epochMs) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/* ── Wind ────────────────────────────────────────────────────────────────── */

const COMPASS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

/** Degrees to a 16-point compass label. A lookup, not a judgment. */
export function compass(degrees: number | null): string | null {
  if (degrees === null || !Number.isFinite(degrees)) return null;
  const index = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS[index];
}

/* ── Joined hours ────────────────────────────────────────────────────────── */

/** One hour with everything both services said about it. */
export interface LiveHour {
  epoch: number;
  /** Device-local hour of day, 0–23. */
  hour: number;
  weather: HourlyConditions | null;
  aqhi: AqhiReading | null;
}

/**
 * Joins the two snapshots by instant.
 *
 * Both are keyed by epoch after zone conversion, so an hour is matched by
 * when it is rather than by how either service wrote it down.
 */
export function joinLive(weather: ConditionsSnapshot | null, aqhi: AqhiSnapshot | null): LiveHour[] {
  const byEpoch = new Map<number, LiveHour>();

  for (const h of weather?.hours ?? []) {
    const epoch = epochOfLocalIso(h.time, weather?.timezone ?? null);
    if (Number.isNaN(epoch)) continue;
    byEpoch.set(epoch, { epoch, hour: new Date(epoch).getHours(), weather: h, aqhi: null });
  }

  for (const r of aqhi?.forecast ?? []) {
    const epoch = Date.parse(r.timestamp);
    if (Number.isNaN(epoch)) continue;
    const existing = byEpoch.get(epoch);
    if (existing) existing.aqhi = r;
    else byEpoch.set(epoch, { epoch, hour: new Date(epoch).getHours(), weather: null, aqhi: r });
  }

  return [...byEpoch.values()].sort((a, b) => a.epoch - b.epoch);
}

/**
 * The model's input for an hour, or null if any input is missing.
 *
 * This is the only place the completeness rule is applied. Every screen that
 * wants a verdict goes through here, so no screen can run the model on a gap.
 */
export function readingOf(h: LiveHour): HourReading | null {
  const w = h.weather;
  const aqhi = h.aqhi?.value ?? null;
  if (
    !w ||
    aqhi === null ||
    w.temperatureC === null ||
    w.windSpeedKmh === null ||
    w.precipitationMm === null
  ) {
    return null;
  }
  return {
    hour: h.hour,
    aqhi,
    tempC: w.temperatureC,
    windKmh: w.windSpeedKmh,
    rainMmH: w.precipitationMm,
  };
}

/* ── Today ───────────────────────────────────────────────────────────────── */

/** The design's hourly chart spans 05:00–21:00 of the current local day. */
export const CHART_FIRST_HOUR = 5;
export const CHART_LAST_HOUR = 21;

/**
 * The hours the Today chart shows: 05:00 through 21:00 of the device's
 * current local date. Hours the sources did not cover are still present, with
 * both sides null, so the chart always has seventeen positions.
 */
export function todayHours(live: LiveHour[], nowMs: number): LiveHour[] {
  const today = localDateKey(nowMs);
  const byHour = new Map<number, LiveHour>();
  for (const h of live) {
    if (localDateKey(h.epoch) === today) byHour.set(h.hour, h);
  }

  const start = new Date(nowMs);
  start.setHours(0, 0, 0, 0);

  const out: LiveHour[] = [];
  for (let hour = CHART_FIRST_HOUR; hour <= CHART_LAST_HOUR; hour++) {
    out.push(
      byHour.get(hour) ?? { epoch: start.getTime() + hour * HOUR_MS, hour, weather: null, aqhi: null },
    );
  }
  return out;
}

/** The hour containing `nowMs`, from the joined series, if the sources covered it. */
export function currentHour(live: LiveHour[], nowMs: number): LiveHour | null {
  const floor = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
  return live.find((h) => h.epoch === floor) ?? null;
}

/* ── Forecast ────────────────────────────────────────────────────────────── */

/** The two-hourly slots a forecast day is sampled at, matching the design. */
export const DAY_SLOTS = [5, 7, 9, 11, 13, 15, 17, 19] as const;

export interface LiveDay {
  /** Local midnight, device zone. */
  epoch: number;
  isToday: boolean;
  /** One entry per DAY_SLOTS position; null when the sources had nothing. */
  slots: (LiveHour | null)[];
  /** Per-slot level, null where the model could not run. */
  blocks: (Level | null)[];
  /** Null when no slot was complete enough to judge. */
  level: Level | null;
  /** The run backing the level, as slot indices, or null. */
  run: { start: number; end: number } | null;
  /** Aggregated from every hour of the day the weather covered. */
  hiC: number | null;
  loC: number | null;
  rainMm: number | null;
  windMaxKmh: number | null;
  windDir: string | null;
  /** First and last AQHI the forecast covered, or null. */
  aqhiFirst: number | null;
  aqhiLast: number | null;
}

/**
 * Judges a day whose slots may be missing.
 *
 * A missing slot breaks a run — an unknown hour cannot be part of a clean
 * stretch — but it never sets the day's level on its own. The level comes
 * only from slots the model actually ran on; a day with no complete slot has
 * no level at all.
 */
export function judgeLiveDay(
  slots: (LiveHour | null)[],
  prefs: Prefs,
): Pick<LiveDay, 'blocks' | 'level' | 'run'> {
  const blocks: (Level | null)[] = slots.map((s) => {
    const r = s ? readingOf(s) : null;
    return r ? judge(r, prefs).level : null;
  });

  if (blocks.every((b) => b === null)) return { blocks, level: null, run: null };

  // Unknown slots are mapped above any cap so they end a run without ever
  // qualifying for one.
  const forRuns = blocks.map((b) => (b === null ? 3 : b)) as Level[];
  const green = longestRun(forRuns, 0);
  const amber = green ? null : longestRun(forRuns, 1);
  const run = green ?? amber;
  return { blocks, level: green ? 0 : amber ? 1 : 2, run };
}

const max = (xs: number[]) => (xs.length ? Math.max(...xs) : null);
const min = (xs: number[]) => (xs.length ? Math.min(...xs) : null);

/**
 * Groups the joined series into calendar days, starting today.
 *
 * Aggregates are arithmetic over what the weather covered: a day with no
 * temperature at all gets null, not zero. AQHI first/last come from whichever
 * slots the 48-hour AQHI forecast reached.
 */
export function liveDays(live: LiveHour[], nowMs: number, prefs: Prefs, count = 5): LiveDay[] {
  const todayKey = localDateKey(nowMs);
  const byDate = new Map<string, LiveHour[]>();
  for (const h of live) {
    const key = localDateKey(h.epoch);
    if (key < todayKey) continue;
    const list = byDate.get(key) ?? [];
    list.push(h);
    byDate.set(key, list);
  }

  const start = new Date(nowMs);
  start.setHours(0, 0, 0, 0);

  const days: LiveDay[] = [];
  for (let i = 0; i < count; i++) {
    const epoch = start.getTime() + i * 24 * HOUR_MS;
    const hours = byDate.get(localDateKey(epoch)) ?? [];
    const byHour = new Map(hours.map((h) => [h.hour, h]));

    const slots = DAY_SLOTS.map((hour) => byHour.get(hour) ?? null);
    const temps = hours.map((h) => h.weather?.temperatureC).filter((v): v is number => v !== null && v !== undefined);
    const rains = hours.map((h) => h.weather?.precipitationMm).filter((v): v is number => v !== null && v !== undefined);
    const winds = hours.map((h) => h.weather?.windSpeedKmh).filter((v): v is number => v !== null && v !== undefined);
    const aqhis = hours.map((h) => h.aqhi?.value).filter((v): v is number => v !== null && v !== undefined);

    // Direction at the hour of peak wind, since a daily "average" direction
    // is meaningless when it swings.
    const windMax = max(winds);
    const peak = windMax === null ? null : hours.find((h) => h.weather?.windSpeedKmh === windMax);

    days.push({
      epoch,
      isToday: i === 0,
      slots,
      ...judgeLiveDay(slots, prefs),
      hiC: max(temps),
      loC: min(temps),
      rainMm: rains.length ? rains.reduce((a, b) => a + b, 0) : null,
      windMaxKmh: windMax,
      windDir: compass(peak?.weather?.windDirectionDeg ?? null),
      aqhiFirst: aqhis.length ? aqhis[0] : null,
      aqhiLast: aqhis.length ? aqhis[aqhis.length - 1] : null,
    });
  }
  return days;
}

/* ── Display ─────────────────────────────────────────────────────────────── */

/**
 * An AQHI value as it is published: whole number, "10+" above ten, "—" when
 * absent. The one place the display convention lives.
 */
export function formatAqhi(reading: AqhiReading | null): string {
  if (!reading || reading.value === null) return '—';
  if (reading.isAboveTen) return '10+';
  return String(Math.round(reading.value));
}

/** A number with a unit, or "—". Never a zero standing in for nothing. */
export function formatValue(value: number | null, digits: number, unit = ''): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}${unit}`;
}

/** Beyond this the reading describes somewhere else and the UI must say so. */
export const FAR_COMMUNITY_KM = 25;
