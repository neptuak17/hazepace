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
