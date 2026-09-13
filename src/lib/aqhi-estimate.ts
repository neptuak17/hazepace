/**
 * An AQHI estimated from modelled pollutants, for hours ECCC does not cover.
 *
 * ECCC publishes the index for about a hundred communities and forecasts it
 * roughly 36 hours ahead. Everywhere else, and every hour beyond that, the
 * app would otherwise have no air input and no verdict. This module fills
 * those gaps with ECCC's own formula applied to Open-Meteo's air quality
 * model (CAMS), so the rating model still receives an AQHI and nothing in
 * the decision rules has to know the difference.
 *
 * The user must, though. An estimate is never mixed into an ECCC reading:
 * it lives in its own field on the joined hour, it is only consulted when
 * the ECCC value is null, and every screen that shows one labels it. It is
 * a model, not a monitor — it carries wildfire emissions but tends to
 * under-read peaks close to a fire.
 *
 * The formula (Stieb et al., 2008; Environment and Climate Change Canada):
 *
 *   AQHI = (10 / 10.4) × 100 × [ (e^(0.000871 × NO₂) − 1)
 *                              + (e^(0.000537 × O₃)  − 1)
 *                              + (e^(0.000487 × PM2.5) − 1) ]
 *
 * with NO₂ and O₃ in ppb and PM2.5 in µg/m³, each a three-hour mean. Open-
 * Meteo reports the gases in µg/m³, so they are converted at 25 °C and
 * 101.325 kPa. British Columbia's AQHI-Plus (a PM2.5-only override during
 * smoke) is deliberately not applied — see docs/decision-rules.md.
 */
import { categoryFor, isAboveTen, type AqhiCategory } from './aqhi.ts';
import type { HourlyConditions } from './open-meteo.ts';

/* ── Formula ─────────────────────────────────────────────────────────────── */

const NO2_COEFFICIENT = 0.000871;
const O3_COEFFICIENT = 0.000537;
const PM25_COEFFICIENT = 0.000487;
const SCALE = (10 / 10.4) * 100;

/** µg/m³ per ppb at 25 °C, 101.325 kPa: molar mass / 24.45. */
export const NO2_UGM3_PER_PPB = 46.0055 / 24.45;
export const O3_UGM3_PER_PPB = 47.9982 / 24.45;

/** Hours in the mean. ECCC's definition. */
export const MEAN_WINDOW_HOURS = 3;

/** The unrounded index for three-hour means already in the formula's units. */
export function aqhiFromPollutants(no2Ppb: number, o3Ppb: number, pm25Ugm3: number): number {
  return (
    SCALE *
    (Math.exp(NO2_COEFFICIENT * no2Ppb) -
      1 +
      (Math.exp(O3_COEFFICIENT * o3Ppb) - 1) +
      (Math.exp(PM25_COEFFICIENT * pm25Ugm3) - 1))
  );
}

/* ── Series ──────────────────────────────────────────────────────────────── */

export interface AqhiEstimate {
  /** Unrounded. Round for display as ECCC would: see formatAqhi. */
  value: number;
  isAboveTen: boolean;
  category: AqhiCategory;
  /** How many hours the means covered, 1 to MEAN_WINDOW_HOURS. */
  meanHours: number;
}

const HOUR_MS = 3_600_000;

/** Epoch of a naive ISO hour read as UTC — only differences matter here. */
function naiveEpoch(time: string): number {
  return Date.parse(time.length === 16 ? `${time}:00Z` : `${time}Z`);
}

/**
 * Mean of the values at index `i` and the hours immediately before it,
 * looking back up to `window` hours. The hour itself must be present; an
 * earlier hour that is missing, or not exactly one hour before its
 * successor, ends the window early rather than being skipped over.
 */
function trailingMean(
  hours: HourlyConditions[],
  i: number,
  pick: (h: HourlyConditions) => number | null,
  window: number,
): { mean: number; count: number } | null {
  const own = pick(hours[i]);
  if (own === null) return null;

  let sum = own;
  let count = 1;
  let expected = naiveEpoch(hours[i].time) - HOUR_MS;
  for (let j = i - 1; j >= 0 && count < window; j--) {
    const h = hours[j];
    const v = pick(h);
    if (v === null || naiveEpoch(h.time) !== expected) break;
    sum += v;
    count++;
    expected -= HOUR_MS;
  }
  return { mean: sum / count, count };
}

/**
 * One estimate per hour of the series, or null where any pollutant is
 * missing for that hour. The series must be in time order, as joinByTime
 * leaves it.
 */
export function estimateAqhiSeries(hours: HourlyConditions[]): (AqhiEstimate | null)[] {
  return hours.map((_, i) => {
    const no2 = trailingMean(hours, i, (h) => h.nitrogenDioxideUgm3, MEAN_WINDOW_HOURS);
    const o3 = trailingMean(hours, i, (h) => h.ozoneUgm3, MEAN_WINDOW_HOURS);
    const pm = trailingMean(hours, i, (h) => h.pm25, MEAN_WINDOW_HOURS);
    if (!no2 || !o3 || !pm) return null;

    const value = aqhiFromPollutants(
      no2.mean / NO2_UGM3_PER_PPB,
      o3.mean / O3_UGM3_PER_PPB,
      pm.mean,
    );
    const category = categoryFor(value);
    if (category === null) return null;
    return {
      value,
      isAboveTen: isAboveTen(value),
      category,
      meanHours: Math.min(no2.count, o3.count, pm.count),
    };
  });
}
