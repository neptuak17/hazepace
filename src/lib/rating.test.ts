/// <reference types="node" />
/**
 * Tests for the rating model.
 *
 * Run with `npm test`. These use Node's built-in test runner and its
 * TypeScript type stripping — no test framework is installed, because
 * `rating.ts` has no runtime imports and needs no bundler to execute.
 *
 * Note this covers the model only. Testing components would need a real React
 * Native test environment (jest-expo), which is not set up.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  SLOTS,
  band,
  bestWindow,
  effectiveAqhi,
  factorLevels,
  formatHour,
  formatTick,
  judge,
  judgeDay,
  longestRun,
  quality,
  ventilation,
  windowLabel,
  type Level,
  type Prefs,
  type Reading,
} from './rating.ts';

/** The app's defaults: Cycling, Normal sensitivity, ceiling 5, Light rain, 32 km/h. */
const DEFAULTS: Prefs = {
  activity: 'Cycling',
  sensitivity: 'Normal',
  ceiling: 5,
  rainTol: 1,
  windTol: 32,
};

const prefs = (over: Partial<Prefs> = {}): Prefs => ({ ...DEFAULTS, ...over });

/** A reading that is benign on every factor except what a test varies. */
const calm = (over: Partial<Reading> = {}): Reading => ({
  aqhi: 1,
  rainMmH: 0,
  tempC: 18,
  windKmh: 5,
  ...over,
});

describe('ventilation', () => {
  test('multiplies activity by sensitivity', () => {
    assert.equal(ventilation(prefs({ activity: 'Hiking / Walking', sensitivity: 'Normal' })), 1);
    assert.equal(ventilation(prefs({ activity: 'Running', sensitivity: 'Normal' })), 1.7);
    // 1.5 * 1.25 in floating point, so compare with tolerance.
    assert.ok(
      Math.abs(ventilation(prefs({ activity: 'Cycling', sensitivity: 'Reactive' })) - 1.875) < 1e-9,
    );
  });

  test('effective AQHI scales the raw reading', () => {
    assert.equal(effectiveAqhi(4, prefs({ activity: 'Hiking / Walking' })), 4);
    assert.equal(effectiveAqhi(4, prefs({ activity: 'Cycling' })), 6);
  });
});

describe('band', () => {
  test('bands every AQHI at the defaults', () => {
    const expected: Record<number, Level> = { 2: 0, 3: 0, 4: 1, 5: 1, 6: 1, 7: 1, 8: 2, 9: 2 };
    for (const [aqhi, level] of Object.entries(expected)) {
      assert.equal(band(Number(aqhi), prefs()), level, `AQHI ${aqhi}`);
    }
  });

  test('the ceiling can push a level up on its own', () => {
    // Walking, so effective AQHI equals the reading and only the ceiling bites.
    const walking = prefs({ activity: 'Hiking / Walking', ceiling: 2 });
    assert.equal(band(2, walking), 0, 'at the ceiling is still fine');
    assert.equal(band(3, walking), 1, 'one over the ceiling is amber');
    assert.equal(band(5, walking), 1, 'three over is still amber');
    assert.equal(band(6, walking), 2, 'more than three over is red');
  });

  test('a higher ceiling keeps the effective-AQHI limits in force', () => {
    // Ceiling 9 cannot save Cycling from a reading of 8: 8 * 1.5 = 12 > 10.5.
    assert.equal(band(8, prefs({ ceiling: 9 })), 2);
    // The same reading walking is under both limits.
    assert.equal(band(8, prefs({ ceiling: 9, activity: 'Hiking / Walking' })), 1);
  });

  test('sensitivity moves the boundary', () => {
    // 4 * 1.5 = 6, over the green max of 5.5.
    assert.equal(band(4, prefs()), 1);
    // 4 * 1.5 * 0.85 = 5.1, back under it — but the ceiling of 5 still allows it.
    assert.equal(band(4, prefs({ sensitivity: 'Low' })), 0);
    // 4 * 1.5 * 1.25 = 7.5, still amber rather than red.
    assert.equal(band(4, prefs({ sensitivity: 'Reactive' })), 1);
  });
});

describe('judge', () => {
  test('clean air and mild weather is level 0 with no driver', () => {
    const j = judge(calm(), prefs());
    assert.equal(j.level, 0);
    assert.equal(j.driver, null);
  });

  test('rain thresholds key off the tolerance', () => {
    // rainTol 1 is Light: 1.5 mm/h, and 2.6x that is the red threshold.
    assert.equal(judge(calm({ rainMmH: 1.4 }), prefs()).level, 0);
    assert.equal(judge(calm({ rainMmH: 1.5 }), prefs()).level, 1);
    assert.equal(judge(calm({ rainMmH: 4 }), prefs()).level, 2);
    // Heavy tolerance shrugs off what stops a Light one.
    assert.equal(judge(calm({ rainMmH: 4 }), prefs({ rainTol: 3 })).level, 0);
  });

  test('the red rain threshold is computed in floating point', () => {
    // 1.5 * 2.6 is 3.9000000000000004, not 3.9, so a reading of exactly 3.9
    // stays amber. This is inherited from the prototype and is asserted here
    // so the behaviour is deliberate rather than accidental; the products
    // differ per tolerance, so the boundary is not uniformly off by one ulp.
    assert.ok(1.5 * 2.6 > 3.9);
    assert.equal(judge(calm({ rainMmH: 3.9 }), prefs()).level, 1);
    // Moderate, by contrast, lands exactly: 3.5 * 2.6 is 9.1.
    assert.equal(3.5 * 2.6, 9.1);
    assert.equal(judge(calm({ rainMmH: 9.1 }), prefs({ rainTol: 2 })).level, 2);
  });

  test('heat thresholds are fixed, not preference-driven', () => {
    assert.equal(judge(calm({ tempC: 29 }), prefs()).level, 0);
    assert.equal(judge(calm({ tempC: 30 }), prefs()).level, 1);
    assert.equal(judge(calm({ tempC: 34 }), prefs()).level, 2);
  });

  test('wind thresholds key off the tolerance', () => {
    assert.equal(judge(calm({ windKmh: 31 }), prefs()).level, 0);
    assert.equal(judge(calm({ windKmh: 32 }), prefs()).level, 1);
    assert.equal(judge(calm({ windKmh: 46 }), prefs()).level, 2);
  });

  test('the worst factor sets the level', () => {
    const j = judge(calm({ tempC: 30, windKmh: 46 }), prefs());
    assert.equal(j.level, 2);
    assert.equal(j.driver, 'wind', 'wind is the only factor at the winning level');
  });

  test('ties are named air, then rain, then heat, then wind', () => {
    // Every factor amber at once.
    const all = judge({ aqhi: 4, rainMmH: 1.5, tempC: 30, windKmh: 32 }, prefs());
    assert.equal(all.level, 1);
    assert.equal(all.driver, 'smoke');

    // Rain and heat tie with clean air.
    const noAir = judge(calm({ rainMmH: 1.5, tempC: 30 }), prefs());
    assert.equal(noAir.driver, 'rainfall');

    // Heat and wind tie with clean air and no rain.
    const heatWind = judge(calm({ tempC: 30, windKmh: 32 }), prefs());
    assert.equal(heatWind.driver, 'heat');
  });

  test('factorLevels agrees with the level judge reduces to', () => {
    const r = { aqhi: 8, rainMmH: 1.6, tempC: 31, windKmh: 33 };
    const f = factorLevels(r, prefs());
    assert.deepEqual(f, { air: 2, rain: 1, heat: 1, wind: 1 });
    assert.equal(judge(r, prefs()).level, Math.max(f.air, f.rain, f.heat, f.wind));
  });
});

describe('quality', () => {
  test('floors at 6 rather than 0 so a bar stays visible', () => {
    assert.equal(quality(calm({ aqhi: 11, tempC: 40, rainMmH: 20 }), prefs()), 6);
  });

  test('caps at 100', () => {
    assert.equal(quality(calm({ aqhi: 0 }), prefs()), 100);
  });

  test('falls as the air worsens', () => {
    const clean = quality(calm({ aqhi: 2 }), prefs());
    const dirty = quality(calm({ aqhi: 6 }), prefs());
    assert.ok(dirty < clean, `${dirty} should be below ${clean}`);
  });

  test('rain contributes at most 45 points', () => {
    // Beyond ~6.4 mm/h the rain term is pinned, so more rain changes nothing.
    const a = quality(calm({ aqhi: 3, rainMmH: 7 }), prefs());
    const b = quality(calm({ aqhi: 3, rainMmH: 30 }), prefs());
    assert.equal(a, b);
  });
});

describe('longestRun', () => {
  const L = (...xs: number[]) => xs as Level[];

  test('returns null when nothing is at or below the cap', () => {
    assert.equal(longestRun(L(2, 2, 2), 1), null);
  });

  test('finds the longest run, not the first', () => {
    assert.deepEqual(longestRun(L(0, 2, 0, 0, 0), 0), { start: 2, end: 4 });
  });

  test('keeps the earlier run when two tie on length', () => {
    assert.deepEqual(longestRun(L(0, 0, 2, 0, 0), 0), { start: 0, end: 1 });
  });

  test('handles a single passing slot and a fully passing set', () => {
    assert.deepEqual(longestRun(L(2, 0, 2), 0), { start: 1, end: 1 });
    assert.deepEqual(longestRun(L(1, 1, 1), 1), { start: 0, end: 2 });
  });
});

describe('judgeDay', () => {
  /** Builds a day from per-slot AQHI, everything else benign. */
  const dayOf = (aqhi: number[]): Reading[] => aqhi.map((a) => calm({ aqhi: a }));

  test('prefers a green run over a longer amber one', () => {
    // Slots: one green pair at the end, a long amber stretch before it.
    const v = judgeDay(dayOf([4, 4, 4, 4, 4, 4, 2, 2]), prefs());
    assert.equal(v.level, 0, 'a green run exists, so the day is green');
    assert.deepEqual(v.run, { start: 6, end: 7 });
  });

  test('falls back to the amber run when no green one exists', () => {
    // Deliberately asymmetric: a single longest amber stretch, so this asserts
    // the fallback rather than the tie-break.
    const v = judgeDay(dayOf([8, 8, 4, 4, 4, 4, 8, 8]), prefs());
    assert.equal(v.level, 1);
    assert.deepEqual(v.run, { start: 2, end: 5 });
  });

  test('is red with no run when nothing clears', () => {
    const v = judgeDay(dayOf([8, 8, 8, 8, 8, 8, 8, 8]), prefs());
    assert.equal(v.level, 2);
    assert.equal(v.run, null);
    assert.equal(windowLabel(v.run, '24-hour'), null);
  });

  test('the verdict is the best run, not the worst slot', () => {
    // One red slot must not drag down a day that is otherwise clear.
    const v = judgeDay(dayOf([9, 2, 2, 2, 2, 2, 2, 2]), prefs());
    assert.equal(v.level, 0);
    assert.equal(v.blocks[0], 2, 'the red slot is still reported');
  });

  test('re-derives when the ceiling changes', () => {
    const day = dayOf([6, 6, 6, 6, 6, 6, 6, 6]);
    assert.equal(judgeDay(day, prefs({ ceiling: 5 })).level, 1);
    assert.equal(judgeDay(day, prefs({ ceiling: 2 })).level, 2, 'a low ceiling makes it red');
  });
});

describe('windowLabel', () => {
  test('spans from the run start to two hours past its last slot', () => {
    assert.equal(windowLabel({ start: 3, end: 4 }, '24-hour'), '11:00 – 15:00');
    assert.equal(SLOTS[3], 11);
    assert.equal(SLOTS[4], 13);
  });

  test('follows the chosen time format', () => {
    assert.equal(windowLabel({ start: 0, end: 0 }, '12-hour'), '5 am – 7 am');
  });
});

describe('bestWindow', () => {
  const hours = (spec: { hour: number; aqhi: number }[]) =>
    spec.map((s) => ({ ...calm({ aqhi: s.aqhi }), hour: s.hour }));

  test('ignores hours that have already finished', () => {
    // 05:00 and 06:00 are clean but past; 08:00 onward is the only real window.
    const w = bestWindow(
      hours([
        { hour: 5, aqhi: 2 },
        { hour: 6, aqhi: 2 },
        { hour: 7, aqhi: 9 },
        { hour: 8, aqhi: 2 },
        { hour: 9, aqhi: 2 },
      ]),
      7.66,
      prefs(),
    );
    assert.deepEqual(w, { start: 8, end: 10 });
  });

  test('returns null when nothing ahead is clear', () => {
    const w = bestWindow(
      hours([
        { hour: 8, aqhi: 9 },
        { hour: 9, aqhi: 9 },
      ]),
      7.66,
      prefs(),
    );
    assert.equal(w, null);
  });

  test('an hour still running is not counted as past', () => {
    // At 07:66 the 07:00 hour has not finished, so it remains available.
    const w = bestWindow(hours([{ hour: 7, aqhi: 2 }]), 7.66, prefs());
    assert.deepEqual(w, { start: 7, end: 8 });
  });
});

describe('time formatting', () => {
  test('24-hour pads and includes minutes', () => {
    assert.equal(formatHour(7.66, '24-hour'), '07:40');
    assert.equal(formatHour(0, '24-hour'), '00:00');
    assert.equal(formatHour(21, '24-hour'), '21:00');
  });

  test('12-hour drops :00 and wraps midnight and noon', () => {
    assert.equal(formatHour(7.66, '12-hour'), '7:40 am');
    assert.equal(formatHour(0, '12-hour'), '12 am');
    assert.equal(formatHour(12, '12-hour'), '12 pm');
    assert.equal(formatHour(13, '12-hour'), '1 pm');
  });

  test('ticks are short forms of the same clock', () => {
    assert.equal(formatTick(5, '24-hour'), '05');
    assert.equal(formatTick(20, '24-hour'), '20');
    assert.equal(formatTick(0, '12-hour'), '12a');
    assert.equal(formatTick(12, '12-hour'), '12p');
    assert.equal(formatTick(20, '12-hour'), '8p');
  });
});
