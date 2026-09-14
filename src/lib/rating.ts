/**
 * The rating model. Specified by docs/decision-rules.md; that file leads and
 * this one follows it.
 *
 * One rule set judges every hour the app rates — today's hours and forecast
 * slots alike — so a change to any preference re-derives everything at once.
 * Kept pure, with no React or platform imports, so it can be unit tested
 * directly.
 *
 * Levels are 0 / 1 / 2 (the design's GREEN / AMBER / RED). For air they
 * relay Environment and Climate Change Canada's published AQHI guidance for
 * the user's sport and sensitivity; for rain, heat and wind they describe
 * conditions against limits the user set themselves. Neither is a judgement
 * about the user.
 */
import { categoryFor, type AqhiCategory } from './aqhi.ts';

export type Level = 0 | 1 | 2;

export type Activity = 'Running' | 'Cycling' | 'Hiking / Walking';
/** Normal maps to ECCC's general population, Reactive to its at-risk one. */
export type Sensitivity = 'Normal' | 'Reactive';
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

/**
 * Everything the user controls. Changing any of it re-derives every verdict.
 *
 * The three weather values are the user's limits. Amber is a band centred
 * on each — see decision-rules.md §3.2 and the margins below.
 */
export interface Prefs {
  activity: Activity;
  sensitivity: Sensitivity;
  /** Index into RAIN_TOL. 0–3. */
  rainTol: number;
  /** km/h, 8–36 in steps of 4; WIND_NO_LIMIT means wind never sets the level. */
  windTol: number;
  /** °C, 22–38 in steps of 2. */
  heatTol: number;
}

/** Half-width of the amber band either side of the heat limit. */
export const HEAT_MARGIN_C = 2;
/** Half-width of the amber band either side of the wind limit. */
export const WIND_MARGIN_KMH = 6;
/** The wind slider's top position: no limit, wind is always level 0. */
export const WIND_NO_LIMIT = 40;

/**
 * Whether ECCC's guidance would call the activity strenuous. Its AQHI
 * messages turn on this word; "Hiking / Walking" is the design's baseline
 * and is classed as not strenuous. See decision-rules.md §1.2.
 */
export const STRENUOUS: Record<Activity, boolean> = {
  Running: true,
  Cycling: true,
  'Hiking / Walking': false,
};

/**
 * ECCC's AQHI health messages, reduced to a level.
 *
 * Indexed [category][population][strenuous]. Level 1 where ECCC says
 * "consider reducing or rescheduling strenuous activities", level 2 where it
 * says "reduce or reschedule" or "avoid", 0 where the guidance does not
 * reach that population and activity. Very High is 2 for everyone — the
 * only cells that go beyond ECCC's wording, so that nothing above 10 is
 * green. Checked against ECCC's page on 2026-09-14.
 * The full table, with its sourcing, is decision-rules.md §3.1.
 */
const AIR_LEVEL: Record<AqhiCategory, Record<Sensitivity, { strenuous: Level; other: Level }>> = {
  Low: { Normal: { strenuous: 0, other: 0 }, Reactive: { strenuous: 0, other: 0 } },
  Moderate: { Normal: { strenuous: 0, other: 0 }, Reactive: { strenuous: 1, other: 0 } },
  High: { Normal: { strenuous: 1, other: 0 }, Reactive: { strenuous: 2, other: 0 } },
  'Very High': { Normal: { strenuous: 2, other: 2 }, Reactive: { strenuous: 2, other: 2 } },
};

/**
 * The rain limits, each with the edges of its amber band written out.
 *
 * The band is a ratio either side of the limit (÷ 1.6 below, × 1.6 above)
 * because the limits span 0.2 to 8 mm/h. The edges are literals rather than
 * computed so no floating-point product can land a hair past a reading that
 * should tie with it; decision-rules.md §1.2 lists the same numbers.
 */
export const RAIN_TOL = [
  { name: 'None', mm: 0.2, amberFrom: 0.13, redFrom: 0.32, note: 'only dry weather' },
  { name: 'Light', mm: 1.5, amberFrom: 0.94, redFrom: 2.4, note: 'drizzle is fine' },
  { name: 'Moderate', mm: 3.5, amberFrom: 2.19, redFrom: 5.6, note: 'steady rain is fine' },
  { name: 'Heavy', mm: 8, amberFrom: 5, redFrom: 12.8, note: 'only a downpour stops you' },
] as const;

/**
 * Air-quality level on its own, before the weather factors are considered.
 *
 * The reading is placed in ECCC's category on its published (rounded) value
 * — the same banding the screens use to name a category — and the level is
 * read from the table above.
 */
export function band(aqhi: number, prefs: Prefs): Level {
  const category = categoryFor(aqhi);
  // categoryFor is null only for a null reading, which cannot reach here.
  if (category === null) return 0;
  const row = AIR_LEVEL[category][prefs.sensitivity];
  return STRENUOUS[prefs.activity] ? row.strenuous : row.other;
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
  const rain = RAIN_TOL[prefs.rainTol];
  const heatRed = prefs.heatTol + HEAT_MARGIN_C;
  const heatAmber = prefs.heatTol - HEAT_MARGIN_C;
  const windRed = prefs.windTol + WIND_MARGIN_KMH;
  const windAmber = prefs.windTol - WIND_MARGIN_KMH;
  return {
    air: band(r.aqhi, prefs),
    rain: r.rainMmH >= rain.redFrom ? 2 : r.rainMmH >= rain.amberFrom ? 1 : 0,
    heat: r.tempC >= heatRed ? 2 : r.tempC >= heatAmber ? 1 : 0,
    wind:
      prefs.windTol >= WIND_NO_LIMIT
        ? 0
        : r.windKmh >= windRed
          ? 2
          : r.windKmh >= windAmber
            ? 1
            : 0,
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
 * Floors at 6 rather than 0 so a bar is always visible. Uses the raw AQHI, so
 * it does not vary with sport or sensitivity — only the colours do.
 */
export function quality(r: Reading): number {
  const q =
    100 - (r.aqhi - 1) * 12 - Math.min(45, r.rainMmH * 7) - Math.max(0, (r.tempC - 28) * 4);
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
