/**
 * Fixture readings, copied from the design prototype.
 *
 * THESE ARE NOT REAL OBSERVATIONS. They are the prototype's sample day for
 * Vernon, BC, and exist only so the screens have something to render while the
 * data layer is unbuilt. Nothing here is interpolated from a model grid and
 * nothing here should ship.
 *
 * When the real sources land (ECCC for weather, FireSmoke.ca / BlueSky Canada
 * for smoke), this module goes away: readings are re-fetched on every open and
 * are never cached. A missing reading must render as "unavailable" — never as
 * zero, and never as a clean-air value.
 */
import type { Reading } from '@/lib/rating';

export interface HourFixture extends Reading {
  /** Hour of day, 5-21. */
  hour: number;
  /** Wind direction, as a compass abbreviation. */
  dir: string;
  /** Relative humidity, %. */
  humidity: number;
}

/** The hour the prototype treats as "now". */
export const NOW = 7.66;

export const PLACE_LABEL = 'Tue 2 Sep';

export const HOURS: HourFixture[] = [
  { hour: 5, aqhi: 9, tempC: 12, windKmh: 3, dir: 'NE', humidity: 78, rainMmH: 0 },
  { hour: 6, aqhi: 9, tempC: 12, windKmh: 3, dir: 'NE', humidity: 80, rainMmH: 0 },
  { hour: 7, aqhi: 8, tempC: 13, windKmh: 4, dir: 'NE', humidity: 76, rainMmH: 0 },
  { hour: 8, aqhi: 8, tempC: 15, windKmh: 6, dir: 'N', humidity: 70, rainMmH: 0 },
  { hour: 9, aqhi: 6, tempC: 18, windKmh: 9, dir: 'N', humidity: 62, rainMmH: 0 },
  { hour: 10, aqhi: 5, tempC: 21, windKmh: 12, dir: 'NW', humidity: 54, rainMmH: 0 },
  { hour: 11, aqhi: 3, tempC: 23, windKmh: 16, dir: 'NW', humidity: 47, rainMmH: 0 },
  { hour: 12, aqhi: 3, tempC: 25, windKmh: 18, dir: 'NW', humidity: 42, rainMmH: 0 },
  { hour: 13, aqhi: 2, tempC: 27, windKmh: 19, dir: 'NW', humidity: 38, rainMmH: 0 },
  { hour: 14, aqhi: 3, tempC: 28, windKmh: 17, dir: 'W', humidity: 36, rainMmH: 0 },
  { hour: 15, aqhi: 4, tempC: 29, windKmh: 14, dir: 'SW', humidity: 35, rainMmH: 0.4 },
  { hour: 16, aqhi: 5, tempC: 27, windKmh: 22, dir: 'SW', humidity: 48, rainMmH: 6.2 },
  { hour: 17, aqhi: 4, tempC: 23, windKmh: 26, dir: 'S', humidity: 66, rainMmH: 9.1 },
  { hour: 18, aqhi: 3, tempC: 21, windKmh: 14, dir: 'S', humidity: 72, rainMmH: 2.0 },
  { hour: 19, aqhi: 2, tempC: 19, windKmh: 8, dir: 'S', humidity: 74, rainMmH: 0 },
  { hour: 20, aqhi: 2, tempC: 17, windKmh: 6, dir: 'S', humidity: 76, rainMmH: 0 },
  { hour: 21, aqhi: 2, tempC: 16, windKmh: 5, dir: 'S', humidity: 78, rainMmH: 0 },
];

export function hourAt(h: number): HourFixture {
  return HOURS.find((x) => x.hour === Math.floor(h)) ?? HOURS[0];
}

/**
 * Five forecast days, each sampled at the eight 2-hour slots in SLOTS.
 * Fixtures, exactly as above — not real forecasts.
 *
 * Verdicts are never authored here: every slot runs through the model and the
 * day's verdict is derived from the runs it produces.
 */
export interface DayFixture {
  day: string;
  date: string;
  /** Prevailing wind direction. */
  dir: string;
  hi: number;
  lo: number;
  aqhi: number[];
  rainMmH: number[];
  tempC: number[];
  windKmh: number[];
}

export const DAYS: DayFixture[] = [
  {
    day: 'Today',
    date: 'Tue 2',
    dir: 'NW',
    hi: 29,
    lo: 12,
    aqhi: [9, 8, 6, 3, 2, 3, 4, 2],
    rainMmH: [0, 0, 0, 0, 0, 5.5, 1.2, 0],
    tempC: [12, 17, 22, 26, 29, 27, 22, 17],
    windKmh: [6, 8, 12, 14, 18, 26, 14, 8],
  },
  {
    day: 'Wed',
    date: '3 Sep',
    dir: 'S',
    hi: 24,
    lo: 11,
    aqhi: [4, 4, 3, 3, 4, 5, 6, 5],
    rainMmH: [0, 0, 0, 0, 0, 0, 0, 0],
    tempC: [11, 15, 19, 22, 24, 23, 19, 15],
    windKmh: [8, 10, 12, 12, 12, 10, 8, 6],
  },
  {
    day: 'Thu',
    date: '4 Sep',
    dir: 'SW',
    hi: 29,
    lo: 14,
    aqhi: [5, 5, 6, 6, 7, 8, 8, 7],
    rainMmH: [0, 0, 0, 0, 0, 0, 0, 0],
    tempC: [14, 18, 23, 27, 29, 28, 24, 19],
    windKmh: [6, 8, 9, 9, 9, 8, 6, 5],
  },
  {
    day: 'Fri',
    date: '5 Sep',
    dir: 'NE',
    hi: 31,
    lo: 17,
    aqhi: [8, 8, 9, 9, 9, 9, 9, 8],
    rainMmH: [0, 0, 0, 0, 0, 0, 0, 0],
    tempC: [17, 21, 26, 30, 31, 30, 26, 21],
    windKmh: [4, 5, 6, 6, 6, 5, 4, 4],
  },
  {
    day: 'Sat',
    date: '6 Sep',
    dir: 'W',
    hi: 26,
    lo: 15,
    aqhi: [6, 7, 7, 6, 5, 3, 3, 2],
    rainMmH: [0, 0, 0, 2.5, 4.2, 1, 0, 0],
    tempC: [15, 18, 22, 25, 26, 23, 19, 16],
    windKmh: [12, 16, 18, 20, 20, 18, 14, 10],
  },
];

/** Turns a day fixture into the per-slot readings the model rates. */
export function daySlots(d: DayFixture): Reading[] {
  return d.aqhi.map((aqhi, i) => ({
    aqhi,
    rainMmH: d.rainMmH[i],
    tempC: d.tempC[i],
    windKmh: d.windKmh[i],
  }));
}

/** Total rainfall across a day, in mm. Each slot covers two hours. */
export function dayRainTotal(d: DayFixture): number {
  return d.rainMmH.reduce((sum, r) => sum + r * 2, 0);
}
