/**
 * The rating model, ported verbatim from the HazePace design prototype.
 *
 * One rule set judges every hour the app rates — today's hours and forecast
 * slots alike — so a change to any preference re-derives everything at once.
 * Kept as a pure module with no React or platform imports so it can be unit
 * tested directly.
 *
 * Levels are 0 / 1 / 2 (the design's GREEN / AMBER / RED). They describe
 * conditions measured against limits the user set themselves; they are not a
 * judgement about the user.
 */

export type Level = 0 | 1 | 2;

export type Activity = 'Running' | 'Cycling' | 'Hiking / Walking';
export type Sensitivity = 'Low' | 'Normal' | 'Reactive';
export type TimeFormat = '24-hour' | '12-hour';

/** Which factor set the level. `null` when nothing did. */
export type Driver = 'smoke' | 'rainfall' | 'heat' | 'wind' | null;

/** Raw readings for a single hour or forecast slot. Metric throughout. */
export interface Reading {
  /** Air Quality Health Index, the Canadian scale. */
  aqhi: number;
  /** Rainfall rate, mm/h. */
  rainMmH: number;
  /** Temperature, °C. */
  tempC: number;
  /** Wind speed, km/h. */
  windKmh: number;
}

/** Everything the user controls. Changing any of it re-derives every verdict. */
export interface Prefs {
  activity: Activity;
  sensitivity: Sensitivity;
  /** AQHI the user will not train above. 2–9. */
  ceiling: number;
  /** Index into RAIN_TOL. 0–3. */
  rainTol: number;
  /** km/h, 8–40 in steps of 4. */
  windTol: number;
}

/** Air moved per minute, relative to walking. */
export const VENT: Record<Activity, number> = {
  Running: 1.7,
  Cycling: 1.5,
  'Hiking / Walking': 1.0,
};

export const SENS: Record<Sensitivity, number> = {
  Low: 0.85,
  Normal: 1,
  Reactive: 1.25,
};

export const RAIN_TOL = [
  { name: 'None', mm: 0.2, note: 'only dry weather' },
  { name: 'Light', mm: 1.5, note: 'drizzle is fine' },
  { name: 'Moderate', mm: 3.5, note: 'steady rain is fine' },
  { name: 'Heavy', mm: 8, note: 'only a downpour stops you' },
] as const;

const GREEN_MAX = 5.5;
const AMBER_MAX = 10.5;

/** The multiplier applied to a raw AQHI before it is banded. */
export function ventilation(prefs: Prefs): number {
  return VENT[prefs.activity] * SENS[prefs.sensitivity];
}

/** Effective AQHI: the reading as this user, doing this activity, meets it. */
export function effectiveAqhi(aqhi: number, prefs: Prefs): number {
  return aqhi * ventilation(prefs);
}

/** Air-quality level on its own, before the weather factors are considered. */
export function band(aqhi: number, prefs: Prefs): Level {
  const e = effectiveAqhi(aqhi, prefs);
  if (e > AMBER_MAX || aqhi > prefs.ceiling + 3) return 2;
  if (e > GREEN_MAX || aqhi > prefs.ceiling) return 1;
  return 0;
}

export interface Judgement {
  level: Level;
  /** The factor that set the level. Null at level 0. */
  driver: Driver;
}

/** Each factor rated on its own, before the worst one is picked. */
export interface FactorLevels {
  air: Level;
  rain: Level;
  heat: Level;
  wind: Level;
}

/**
 * The four factors, each against its own threshold.
 *
 * Exposed separately because "How this works" shows all four side by side;
 * `judge` is the same numbers reduced to their worst.
 */
export function factorLevels(r: Reading, prefs: Prefs): FactorLevels {
  const rainAt = RAIN_TOL[prefs.rainTol].mm;
  return {
    air: band(r.aqhi, prefs),
    rain: r.rainMmH >= rainAt * 2.6 ? 2 : r.rainMmH >= rainAt ? 1 : 0,
    heat: r.tempC >= 34 ? 2 : r.tempC >= 30 ? 1 : 0,
    wind: r.windKmh >= prefs.windTol + 14 ? 2 : r.windKmh >= prefs.windTol ? 1 : 0,
  };
}

/**
 * The worst factor wins. Order matters: when two factors tie at the same
 * level, air is named first, then rain, then heat, then wind.
 */
export function judge(r: Reading, prefs: Prefs): Judgement {
  const { air, rain, heat, wind } = factorLevels(r, prefs);

  const level = Math.max(air, rain, heat, wind) as Level;
  if (level === 0) return { level, driver: null };

  const driver: Driver =
    air === level ? 'smoke' : rain === level ? 'rainfall' : heat === level ? 'heat' : 'wind';
  return { level, driver };
}

/**
 * A separate 0–100 score, used only for the height of the hourly bars. It is
 * deliberately not the same thing as the level — it varies within a level so
 * the chart has shape.
 *
 * Floors at 6 rather than 0 so a bar is always visible.
 */
export function quality(r: Reading, prefs: Prefs): number {
  const e = effectiveAqhi(r.aqhi, prefs);
  const q =
    100 - (e - 1) * 12 - Math.min(45, r.rainMmH * 7) - Math.max(0, (r.tempC - 28) * 4);
  return Math.max(6, Math.min(100, q));
}

/** A contiguous run of slots, as inclusive indices. */
export interface Run {
  start: number;
  end: number;
}

/** Longest contiguous run of slots at or below `cap`. */
export function longestRun(levels: Level[], cap: Level): Run | null {
  let best: Run | null = null;
  let cur: Run | null = null;

  levels.forEach((lv, i) => {
    if (lv <= cap) {
      cur = cur ? { start: cur.start, end: i } : { start: i, end: i };
      if (!best || cur.end - cur.start > best.end - best.start) best = { ...cur };
    } else {
      cur = null;
    }
  });

  return best;
}

/** The 2-hour slots a forecast day is sampled at. */
export const SLOTS = [5, 7, 9, 11, 13, 15, 17, 19] as const;

export interface DayVerdict {
  /** Level of each slot, in SLOTS order. */
  blocks: Level[];
  level: Level;
  /** The run backing the verdict, or null when there is none. */
  run: Run | null;
}

/**
 * A day's verdict is the best contiguous run it contains — an all-green run if
 * there is one, otherwise an all-amber run. This is not the max of the slots:
 * a day with one clear stretch reads better than its worst hour.
 */
export function judgeDay(slots: Reading[], prefs: Prefs): DayVerdict {
  const blocks = slots.map((r) => judge(r, prefs).level);
  const green = longestRun(blocks, 0);
  const amber = green ? null : longestRun(blocks, 1);
  const run = green ?? amber;
  return { blocks, level: green ? 0 : amber ? 1 : 2, run };
}

/** Formats an hour (possibly fractional) in the user's chosen format. */
export function formatHour(x: number, fmt: TimeFormat): string {
  const h = Math.floor(x);
  const m = Math.round((x - h) * 60);
  if (fmt === '12-hour') {
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''}${h >= 12 ? ' pm' : ' am'}`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** The short form used for chart tick labels. */
export function formatTick(h: number, fmt: TimeFormat): string {
  if (fmt === '12-hour') return `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? 'p' : 'a'}`;
  return String(h).padStart(2, '0');
}

/** The window string for a day, e.g. "09:00 – 15:00". */
export function windowLabel(run: Run | null, fmt: TimeFormat): string | null {
  if (!run) return null;
  return `${formatHour(SLOTS[run.start], fmt)} – ${formatHour(SLOTS[run.end] + 2, fmt)}`;
}

/** An hour that can be rated, carrying the hour of day alongside its readings. */
export interface HourReading extends Reading {
  hour: number;
}

/**
 * The longest run of level-0 hours still ahead of `now`.
 *
 * An hour counts as past once it has finished, so the run that is currently
 * underway still offers whatever is left of it.
 */
export function bestWindow(
  hours: HourReading[],
  now: number,
  prefs: Prefs,
): { start: number; end: number } | null {
  let best: { start: number; end: number } | null = null;
  let cur: { start: number; end: number } | null = null;

  for (const hr of hours) {
    if (hr.hour + 1 <= now) {
      cur = null;
      continue;
    }
    if (judge(hr, prefs).level === 0) {
      cur = cur ? { start: cur.start, end: hr.hour + 1 } : { start: hr.hour, end: hr.hour + 1 };
      if (!best || cur.end - cur.start > best.end - best.start) best = { ...cur };
    } else {
      cur = null;
    }
  }

  return best;
}
