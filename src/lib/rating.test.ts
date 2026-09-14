/// <reference types="node" />
/**
 * Tests for the rating model.
 *
 * Run with `npm test`. These use Node's built-in test runner and its
 * TypeScript type stripping — no test framework is installed, because
 * `rating.ts` has no platform imports and needs no bundler to execute.
 *
 * Note this covers the model only. Testing components would need a real React
 * Native test environment (jest-expo), which is not set up.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  HEAT_MARGIN_C,
  RAIN_TOL,
  SLOTS,
  STRENUOUS,
  WIND_MARGIN_KMH,
  WIND_NO_LIMIT,
  band,
  bestWindow,
  factorLevels,
  formatHour,
  formatTick,
  judge,
  judgeDay,
  longestRun,
  quality,
  windowLabel,
  type Activity,
  type Level,
  type Prefs,
  type Reading,
  type Sensitivity,
} from './rating.ts';

/** The app's defaults: Cycling, Normal sensitivity, Light rain, 32 km/h, 32 °C. */
const DEFAULTS: Prefs = {
  activity: 'Cycling',
  sensitivity: 'Normal',
  rainTol: 1,
  windTol: 32,
  heatTol: 32,
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

describe('band — ECCC lookup (decision-rules.md §3.1)', () => {
  test('Hiking / Walking is the one non-strenuous activity', () => {
    assert.deepEqual(STRENUOUS, { Running: true, Cycling: true, 'Hiking / Walking': false });
  });

  /** One representative published value per ECCC category. */
  const CATEGORY_VALUES = { Low: 2, Moderate: 5, High: 8, 'Very High': 11 } as const;

  test('every cell of the table', () => {
    // [Normal strenuous, Normal other, Reactive strenuous, Reactive other]
    const table: Record<keyof typeof CATEGORY_VALUES, [Level, Level, Level, Level]> = {
      Low: [0, 0, 0, 0],
      Moderate: [0, 0, 1, 0],
      High: [1, 0, 2, 1],
      'Very High': [2, 2, 2, 2],
    };
    const cells: [Sensitivity, Activity][] = [
      ['Normal', 'Cycling'],
      ['Normal', 'Hiking / Walking'],
      ['Reactive', 'Cycling'],
      ['Reactive', 'Hiking / Walking'],
    ];
    for (const [category, expected] of Object.entries(table)) {
      const aqhi = CATEGORY_VALUES[category as keyof typeof CATEGORY_VALUES];
      cells.forEach(([sensitivity, activity], i) => {
        assert.equal(
          band(aqhi, prefs({ sensitivity, activity })),
          expected[i],
          `${category} · ${sensitivity} · ${activity}`,
        );
      });
    }
  });

  test('Running and Cycling are the same column', () => {
    for (const aqhi of [2, 5, 8, 11]) {
      for (const sensitivity of ['Normal', 'Reactive'] as const) {
        assert.equal(
          band(aqhi, prefs({ activity: 'Running', sensitivity })),
          band(aqhi, prefs({ activity: 'Cycling', sensitivity })),
          `AQHI ${aqhi} · ${sensitivity}`,
        );
      }
    }
  });

  test('bands every whole AQHI at the defaults', () => {
    const expected: Record<number, Level> = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 1, 8: 1, 9: 1, 10: 1, 11: 2, 12: 2,
    };
    for (const [aqhi, level] of Object.entries(expected)) {
      assert.equal(band(Number(aqhi), prefs()), level, `AQHI ${aqhi}`);
    }
  });

  test('category boundaries are on the published (rounded) value', () => {
    const reactiveWalk = prefs({ sensitivity: 'Reactive', activity: 'Hiking / Walking' });
    // Moderate starts at 4: Reactive strenuous is the row that moves there.
    const reactive = prefs({ sensitivity: 'Reactive' });
    assert.equal(band(3.4, reactive), 0, '3.4 rounds to 3, Low');
    assert.equal(band(3.5, reactive), 1, '3.5 rounds to 4, Moderate');
    // High starts at 7: Normal strenuous moves there.
    assert.equal(band(6.4, prefs()), 0, '6.4 rounds to 6, Moderate');
    assert.equal(band(6.5, prefs()), 1, '6.5 rounds to 7, High');
    // Very High starts above 10: everyone is 2 there.
    assert.equal(band(10.4, reactiveWalk), 1, '10.4 rounds to 10, High');
    assert.equal(band(10.5, reactiveWalk), 2, '10.5 rounds to 11, Very High');
    assert.equal(band(10.5, prefs({ activity: 'Hiking / Walking' })), 2, 'Very High is red for everyone');
  });

  test('Very High is level 2 for every combination', () => {
    for (const sensitivity of ['Normal', 'Reactive'] as const) {
      for (const activity of ['Running', 'Cycling', 'Hiking / Walking'] as const) {
        assert.equal(band(11, prefs({ sensitivity, activity })), 2, `${sensitivity} · ${activity}`);
        assert.equal(band(15, prefs({ sensitivity, activity })), 2, `${sensitivity} · ${activity} · 15`);
      }
    }
  });
});

describe('judge', () => {
  test('clean air and mild weather is level 0 with no driver', () => {
    const j = judge(calm(), prefs());
    assert.equal(j.level, 0);
    assert.equal(j.driver, null);
  });

  // Rain, heat and wind: the limit is the middle of the amber band
  // (decision-rules.md §3.2). Each test walks below the band, onto its
  // lower edge, just under its upper edge, and onto the upper edge.

  test('rain: amber and red edges are the literals in RAIN_TOL', () => {
    // Light: amber from 0.94, red from 2.4.
    assert.equal(judge(calm({ rainMmH: 0.93 }), prefs()).level, 0);
    assert.equal(judge(calm({ rainMmH: 0.94 }), prefs()).level, 1);
    assert.equal(judge(calm({ rainMmH: 2.39 }), prefs()).level, 1);
    assert.equal(judge(calm({ rainMmH: 2.4 }), prefs()).level, 2);
    // Heavy shrugs off what stops Light: amber from 5, red from 12.8.
    assert.equal(judge(calm({ rainMmH: 2.4 }), prefs({ rainTol: 3 })).level, 0);
    assert.equal(judge(calm({ rainMmH: 5 }), prefs({ rainTol: 3 })).level, 1);
    assert.equal(judge(calm({ rainMmH: 12.8 }), prefs({ rainTol: 3 })).level, 2);
    // None: any measurable rain is at least amber.
    assert.equal(judge(calm({ rainMmH: 0.1 }), prefs({ rainTol: 0 })).level, 0);
    assert.equal(judge(calm({ rainMmH: 0.2 }), prefs({ rainTol: 0 })).level, 1);
    assert.equal(judge(calm({ rainMmH: 0.4 }), prefs({ rainTol: 0 })).level, 2);
  });

  test('rain: a reading exactly on an edge is on the higher side, with no float drift', () => {
    // The edges are stored, not multiplied, so 1.5 × 1.6 = 2.4000000000000004
    // cannot push a reading of exactly 2.4 back to amber.
    for (const [i, t] of RAIN_TOL.entries()) {
      assert.equal(judge(calm({ rainMmH: t.amberFrom }), prefs({ rainTol: i })).level, 1, t.name);
      assert.equal(judge(calm({ rainMmH: t.redFrom }), prefs({ rainTol: i })).level, 2, t.name);
    }
  });

  test('heat: amber from limit − 2, red from limit + 2', () => {
    // Default 32 reproduces the prototype's fixed 30 / 34.
    assert.equal(judge(calm({ tempC: 29 }), prefs()).level, 0);
    assert.equal(judge(calm({ tempC: 30 }), prefs()).level, 1);
    assert.equal(judge(calm({ tempC: 33 }), prefs()).level, 1);
    assert.equal(judge(calm({ tempC: 34 }), prefs()).level, 2);
    // The band moves with the limit.
    assert.equal(judge(calm({ tempC: 34 }), prefs({ heatTol: 38 })).level, 0);
    assert.equal(judge(calm({ tempC: 36 }), prefs({ heatTol: 38 })).level, 1);
    assert.equal(judge(calm({ tempC: 40 }), prefs({ heatTol: 38 })).level, 2);
    assert.equal(HEAT_MARGIN_C, 2);
  });

  test('wind: amber from limit − 6, red from limit + 6', () => {
    assert.equal(judge(calm({ windKmh: 25 }), prefs()).level, 0);
    assert.equal(judge(calm({ windKmh: 26 }), prefs()).level, 1);
    assert.equal(judge(calm({ windKmh: 37 }), prefs()).level, 1);
    assert.equal(judge(calm({ windKmh: 38 }), prefs()).level, 2);
    assert.equal(judge(calm({ windKmh: 38 }), prefs({ windTol: 8 })).level, 2);
    assert.equal(judge(calm({ windKmh: 1 }), prefs({ windTol: 8 })).level, 0);
    assert.equal(judge(calm({ windKmh: 2 }), prefs({ windTol: 8 })).level, 1);
    assert.equal(WIND_MARGIN_KMH, 6);
  });

  test('wind: the top of the slider is no limit and never raises the level', () => {
    assert.equal(WIND_NO_LIMIT, 40);
    for (const windKmh of [0, 34, 46, 90]) {
      const f = factorLevels(calm({ windKmh }), prefs({ windTol: WIND_NO_LIMIT }));
      assert.equal(f.wind, 0, `${windKmh} km/h`);
    }
    // Everything else still judges as normal.
    assert.equal(judge(calm({ tempC: 34, windKmh: 90 }), prefs({ windTol: WIND_NO_LIMIT })).level, 2);
    assert.equal(judge(calm({ tempC: 34, windKmh: 90 }), prefs({ windTol: WIND_NO_LIMIT })).driver, 'heat');
  });

  test('the worst factor sets the level', () => {
    const j = judge(calm({ tempC: 30, windKmh: 46 }), prefs());
    assert.equal(j.level, 2);
    assert.equal(j.driver, 'wind', 'wind is the only factor at the winning level');
  });

  test('ties are named air, then rain, then heat, then wind', () => {
    // Every factor amber at once. AQHI 7 is High: amber for Normal · Cycling.
    const all = judge({ aqhi: 7, rainMmH: 1.5, tempC: 30, windKmh: 32 }, prefs());
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
    const r = { aqhi: 11, rainMmH: 1.6, tempC: 31, windKmh: 33 };
    const f = factorLevels(r, prefs());
    assert.deepEqual(f, { air: 2, rain: 1, heat: 1, wind: 1 });
    assert.equal(judge(r, prefs()).level, Math.max(f.air, f.rain, f.heat, f.wind));
  });
});

describe('quality', () => {
  test('floors at 6 rather than 0 so a bar stays visible', () => {
    assert.equal(quality(calm({ aqhi: 11, tempC: 40, rainMmH: 20 })), 6);
  });

  test('caps at 100', () => {
    assert.equal(quality(calm({ aqhi: 0 })), 100);
  });

  test('falls as the air worsens', () => {
    const clean = quality(calm({ aqhi: 2 }));
    const dirty = quality(calm({ aqhi: 6 }));
    assert.ok(dirty < clean, `${dirty} should be below ${clean}`);
  });

  test('matches the worked values in decision-rules.md §4.1', () => {
    assert.equal(quality({ aqhi: 2, tempC: 20, rainMmH: 0, windKmh: 10 }), 88);
    assert.equal(quality({ aqhi: 6, tempC: 20, rainMmH: 0, windKmh: 10 }), 40);
    assert.equal(quality({ aqhi: 2, tempC: 20, rainMmH: 8, windKmh: 10 }), 43);
    assert.equal(quality({ aqhi: 2, tempC: 32, rainMmH: 0, windKmh: 10 }), 72);
    assert.equal(quality({ aqhi: 11, tempC: 40, rainMmH: 20, windKmh: 10 }), 6);
  });

  test('rain contributes at most 45 points', () => {
    // Beyond ~6.4 mm/h the rain term is pinned, so more rain changes nothing.
    const a = quality(calm({ aqhi: 3, rainMmH: 7 }));
    const b = quality(calm({ aqhi: 3, rainMmH: 30 }));
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
    const v = judgeDay(dayOf([7, 7, 7, 7, 7, 7, 2, 2]), prefs());
    assert.equal(v.level, 0, 'a green run exists, so the day is green');
    assert.deepEqual(v.run, { start: 6, end: 7 });
  });

  test('falls back to the amber run when no green one exists', () => {
    // Deliberately asymmetric: a single longest amber stretch, so this asserts
    // the fallback rather than the tie-break.
    const v = judgeDay(dayOf([11, 11, 7, 7, 7, 7, 11, 11]), prefs());
    assert.equal(v.level, 1);
    assert.deepEqual(v.run, { start: 2, end: 5 });
  });

  test('is red with no run when nothing clears', () => {
    const v = judgeDay(dayOf([11, 11, 11, 11, 11, 11, 11, 11]), prefs());
    assert.equal(v.level, 2);
    assert.equal(v.run, null);
    assert.equal(windowLabel(v.run, '24-hour'), null);
  });

  test('the verdict is the best run, not the worst slot', () => {
    // One red slot must not drag down a day that is otherwise clear.
    const v = judgeDay(dayOf([11, 2, 2, 2, 2, 2, 2, 2]), prefs());
    assert.equal(v.level, 0);
    assert.equal(v.blocks[0], 2, 'the red slot is still reported');
  });

  test('re-derives when the sensitivity changes', () => {
    // Moderate all day: nothing for the general population, amber for at-risk.
    const day = dayOf([5, 5, 5, 5, 5, 5, 5, 5]);
    assert.equal(judgeDay(day, prefs({ sensitivity: 'Normal' })).level, 0);
    assert.equal(judgeDay(day, prefs({ sensitivity: 'Reactive' })).level, 1);
    // High all day: amber for general strenuous, red for at-risk strenuous.
    const high = dayOf([8, 8, 8, 8, 8, 8, 8, 8]);
    assert.equal(judgeDay(high, prefs({ sensitivity: 'Normal' })).level, 1);
    assert.equal(judgeDay(high, prefs({ sensitivity: 'Reactive' })).level, 2);
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
