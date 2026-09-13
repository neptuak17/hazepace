# HazePace decision rules

This file is the specification for `src/lib/rating.ts`. The code implements
what is written here, and the tests in `src/lib/rating.test.ts` pin the
worked examples in section 5. When the rules change, change this file first;
the code and tests follow it.

**Status:** these are the design prototype's rules, transcribed as-is. They
are placeholders until replaced.

Everything here is measured against limits the user set themselves. The app
presents conditions, thresholds and timing; it does not make health or safety
claims, and nothing added to this file should either.

---

## 1. Inputs

### 1.1 Readings — per hour

The model runs only on hours where **every** reading it uses is present. An
hour missing any of them gets no verdict. That gate lives outside the model
(`src/lib/live.ts`) and does not need restating here.

| Reading | Unit | Used today | Available but unused |
| --- | --- | --- | --- |
| AQHI | Canadian index, 1–10+ | ✅ | |
| Temperature | °C | ✅ | |
| Wind speed | km/h | ✅ | |
| Rain | mm/h | ✅ | |
| PM2.5 | µg/m³ | | ✅ |
| PM10 | µg/m³ | | ✅ |
| Ozone | µg/m³ | | ✅ |
| NO₂ | µg/m³ | | ✅ |
| Wind gusts | km/h | | ✅ |
| Wind direction | degrees | | ✅ |
| Apparent temperature | °C | | ✅ |
| Relative humidity | % | | ✅ |
| Precipitation probability | % | | ✅ |
| UV index | — | | ✅ |
| AQHI category | Low / Moderate / High / Very High | | ✅ |

Everything in the right-hand column is already fetched and sits on every
hour. Using any of it means adding it to the model's `Reading` type and to the
completeness gate — say so in this section if a rule below depends on it.

**Where the AQHI comes from.** ECCC's reading is used for any hour it has a
value. For the rest — beyond ECCC's ~36-hour forecast, and everywhere no
community is within 100 km — the AQHI is *estimated* from Open-Meteo's
modelled PM2.5, ozone and NO₂ using ECCC's published formula on three-hour
means (`src/lib/aqhi-estimate.ts`). The model sees one number either way; the
screens label an estimate as such. British Columbia's AQHI-Plus (a PM2.5-only
override during smoke) is not applied to the estimate. If a rule below should
treat an estimate differently from a measurement, say so here.

### 1.2 Settings — per user

| Setting | Values | Default |
| --- | --- | --- |
| Activity | Running · Cycling · Hiking / Walking | Cycling |
| Sensitivity | Low · Normal · Reactive | Normal |
| Ceiling | 2–9 (AQHI the user will not train above) | 5 |
| Rain tolerance | None · Light · Moderate · Heavy | Light |
| Wind tolerance | 8–40 km/h, in steps of 4 | 32 |

Rain tolerance names map to rates:

| Name | mm/h |
| --- | --- |
| None | 0.2 |
| Light | 1.5 |
| Moderate | 3.5 |
| Heavy | 8 |

---

## 2. Levels

Every factor, every hour and every day resolves to one of three levels.

| Level | Word | Meaning |
| --- | --- | --- |
| 0 | GREEN | within the user's limits |
| 1 | AMBER | past a limit |
| 2 | RED | well past a limit |

---

## 3. Hourly verdict

### 3.1 Effective AQHI

The raw AQHI is scaled by how hard the sport breathes and by the user's
sensitivity before it is compared to anything.

```
effective = aqhi × VENT[activity] × SENS[sensitivity]
```

| Activity | VENT |  | Sensitivity | SENS |
| --- | --- | --- | --- | --- |
| Running | 1.7 |  | Low | 0.85 |
| Cycling | 1.5 |  | Normal | 1.0 |
| Hiking / Walking | 1.0 |  | Reactive | 1.25 |

### 3.2 Four factors

Each factor is rated on its own. Boundaries are stated exactly — `>` and `≥`
are different, and the worked examples pin which is which.

| Factor | Level 2 if | Level 1 if | Otherwise |
| --- | --- | --- | --- |
| **Air** | effective **>** 10.5 **or** aqhi **>** ceiling + 3 | effective **>** 5.5 **or** aqhi **>** ceiling | 0 |
| **Rain** | rain **≥** tolerance × 2.6 | rain **≥** tolerance | 0 |
| **Heat** | temp **≥** 34 | temp **≥** 30 | 0 |
| **Wind** | wind **≥** tolerance + 14 | wind **≥** tolerance | 0 |

Notes:

- Air has two routes to each level: the effective value, or the raw AQHI
  against the ceiling. Either is enough. This means a low ceiling can push an
  hour up even when the effective value is fine (example 5), and a high
  ceiling cannot rescue a high effective value (example 6).
- Heat has no user setting. The thresholds are fixed.
- The rain level-2 threshold is computed in floating point. Light tolerance is
  1.5, and 1.5 × 2.6 is 3.9000000000000004, so a reading of exactly 3.9 mm/h
  is level 1, not 2. Moderate (3.5 × 2.6 = 9.1) lands exactly. This is
  inherited from the prototype; decide whether to keep it.

### 3.3 Worst factor wins

```
level = max(air, rain, heat, wind)
```

### 3.4 The driver

The factor named in the verdict sentence is the **first** factor at the winning
level, in this order:

```
air → rain → heat → wind
```

So when air and rain are both amber, the sentence talks about smoke. At level
0 there is no driver.

---

## 4. Derived values

### 4.1 Quality score — chart bar heights only

Not a verdict. It gives the hourly bars shape within a level so the chart is
not three flat bands.

```
quality = 100 − (effective − 1) × 12
              − min(45, rain × 7)
              − max(0, (temp − 28) × 4)
```

Clamped to **6–100**. The floor is 6 rather than 0 so a bar is always visible.

| Case | AQHI | Temp | Rain | Effective | Quality |
| --- | --- | --- | --- | --- | --- |
| Clean | 2 | 20 | 0 | 3.0 | 76.0 |
| AQHI 6, cycling | 6 | 20 | 0 | 9.0 | 6.0 |
| Heavy rain | 2 | 20 | 8 | 3.0 | 31.0 |
| 32 °C | 2 | 32 | 0 | 3.0 | 60.0 |
| Everything bad | 11 | 40 | 20 | 16.5 | 6.0 |

(All at Cycling / Normal / ceiling 5.)

### 4.2 Day verdict — Forecast screen

A day is sampled at eight two-hour slots: **05, 07, 09, 11, 13, 15, 17, 19**.
Each slot is judged as an hour (section 3).

The day's level is **not** its worst slot. It is the best contiguous run it
contains:

1. If any run of level-0 slots exists → the day is **0**, and the longest such
   run is its window.
2. Else if any run of level-1-or-better slots exists → the day is **1**, with
   the longest such run as its window.
3. Else → **2**, no window.

When two runs tie on length, the earlier one wins. A single slot is a run of
one.

The window is displayed as `start of first slot – start of last slot + 2 h`,
so a run over slots 11 and 13 reads "11:00 – 15:00".

A slot the sources did not cover breaks a run but never sets the level. A day
with no complete slot has no level. (This lives outside the model.)

### 4.3 Best window today — Today screen

The longest run of level-0 hours from now onward, over the hours 05:00–21:00.
An hour counts as past once it has finished, so the hour currently underway is
still available.

---

## 5. Worked examples

These are the test cases. Every row was produced by running the current model,
and `src/lib/rating.test.ts` asserts them. Add rows for any boundary a new rule
introduces — the value exactly at the threshold and one just below — and the
tests will be written from them.

Unless a cell says otherwise: **Cycling · Normal · ceiling 5 · Light · 32**.
Base readings are AQHI 2, 20 °C, 10 km/h, 0 mm/h.

| # | Case | AQHI | Temp | Wind | Rain | Activity | Sens | Ceiling | Rain tol | Wind tol | Effective | Level | Driver |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Clean hour, defaults | 2 | 20 | 10 | 0 | Cycling | Normal | 5 | Light | 32 | 3.00 | **0** | — |
| 2 | Air: effective crosses 5.5 (4 × 1.5 = 6) | 4 | 20 | 10 | 0 | Cycling | Normal | 5 | Light | 32 | 6.00 | **1** | smoke |
| 3 | Air: same reading walking (4 × 1.0) stays under | 4 | 20 | 10 | 0 | Hiking / Walking | Normal | 5 | Light | 32 | 4.00 | **0** | — |
| 4 | Air: same reading, Low sensitivity (4 × 1.5 × 0.85 = 5.1) | 4 | 20 | 10 | 0 | Cycling | Low | 5 | Light | 32 | 5.10 | **0** | — |
| 5 | Air: ceiling alone — walking, ceiling 2, AQHI 3 | 3 | 20 | 10 | 0 | Hiking / Walking | Normal | 2 | Light | 32 | 3.00 | **1** | smoke |
| 6 | Air: effective crosses 10.5 (8 × 1.5 = 12) | 8 | 20 | 10 | 0 | Cycling | Normal | 5 | Light | 32 | 12.00 | **2** | smoke |
| 7 | Air: AQHI 7 cycling — effective exactly 10.5, not over | 7 | 20 | 10 | 0 | Cycling | Normal | 5 | Light | 32 | 10.50 | **1** | smoke |
| 8 | Air: ceiling + 3 alone — walking, ceiling 2, AQHI 6 | 6 | 20 | 10 | 0 | Hiking / Walking | Normal | 2 | Light | 32 | 6.00 | **2** | smoke |
| 9 | Rain: just under Light tolerance (1.4 < 1.5) | 2 | 20 | 10 | 1.4 | Cycling | Normal | 5 | Light | 32 | 3.00 | **0** | — |
| 10 | Rain: exactly at Light tolerance | 2 | 20 | 10 | 1.5 | Cycling | Normal | 5 | Light | 32 | 3.00 | **1** | rainfall |
| 11 | Rain: past 2.6 × Light tolerance | 2 | 20 | 10 | 4 | Cycling | Normal | 5 | Light | 32 | 3.00 | **2** | rainfall |
| 12 | Rain: 4.0 mm/h with Heavy tolerance | 2 | 20 | 10 | 4 | Cycling | Normal | 5 | Heavy | 32 | 3.00 | **0** | — |
| 13 | Heat: 29 °C | 2 | 29 | 10 | 0 | Cycling | Normal | 5 | Light | 32 | 3.00 | **0** | — |
| 14 | Heat: exactly 30 °C | 2 | 30 | 10 | 0 | Cycling | Normal | 5 | Light | 32 | 3.00 | **1** | heat |
| 15 | Heat: exactly 34 °C | 2 | 34 | 10 | 0 | Cycling | Normal | 5 | Light | 32 | 3.00 | **2** | heat |
| 16 | Wind: 31 km/h, tolerance 32 | 2 | 20 | 31 | 0 | Cycling | Normal | 5 | Light | 32 | 3.00 | **0** | — |
| 17 | Wind: exactly at tolerance | 2 | 20 | 32 | 0 | Cycling | Normal | 5 | Light | 32 | 3.00 | **1** | wind |
| 18 | Wind: tolerance + 14 | 2 | 20 | 46 | 0 | Cycling | Normal | 5 | Light | 32 | 3.00 | **2** | wind |
| 19 | Worst wins: heat 1, wind 2 | 2 | 30 | 46 | 0 | Cycling | Normal | 5 | Light | 32 | 3.00 | **2** | wind |
| 20 | Tie at 1: all four amber — air named first | 4 | 30 | 32 | 1.5 | Cycling | Normal | 5 | Light | 32 | 6.00 | **1** | smoke |
| 21 | Tie at 1: rain and heat, clean air — rain named | 2 | 30 | 10 | 1.5 | Cycling | Normal | 5 | Light | 32 | 3.00 | **1** | rainfall |
| 22 | Tie at 1: heat and wind, clean air — heat named | 2 | 30 | 32 | 0 | Cycling | Normal | 5 | Light | 32 | 3.00 | **1** | heat |

### 5.1 Day verdict examples

Slot levels in order 05 … 19. `·` is a slot the sources did not cover.

| Slots | Day level | Window | Why |
| --- | --- | --- | --- |
| `2 2 1 0 0 2 1 0` | 0 | 11:00 – 15:00 | longest green run is slots 11 and 13 |
| `1 1 0 0 1 1 1 1` | 0 | 09:00 – 13:00 | green run of two |
| `1 1 1 1 1 2 2 1` | 1 | 05:00 – 15:00 | no green; longest amber run is the first five |
| `2 2 2 2 2 2 2 2` | 2 | none | nothing clears |
| `9 2 2 2 2 2 2 2` → `2 0 0 0 0 0 0 0` | 0 | 07:00 – 21:00 | one red slot does not drag a clear day down |
| `0 0 · 0 0 2 2 2` | 0 | 05:00 – 09:00 | the gap breaks the run; first of two equal runs wins |
| `· · · 1 · · · ·` | 1 | 11:00 – 13:00 | one complete amber slot; gaps set nothing |
| `· · · · · · · ·` | — | — | no complete slot, no level |

---

## 6. Copy that depends on the rules

The verdict sentence on Today is chosen by driver and level. These strings
live in `src/constants/strings.ts` (`TodayStrings.sentences`) and are listed
here because a new driver or level needs a sentence to go with it.

| Driver | Level 2 | Level 1 |
| --- | --- | --- |
| smoke | Smoke is pooled on the valley floor. Well past your ceiling for hard efforts. | Thin smoke. Steady work is fine; save the intervals. |
| rainfall | Thunderstorm over the valley — heavy rain and gusts. | Steady rain, but the air behind it is the cleanest today. |
| heat | Heat is the limit now, not the air. | Hot enough to cost you. Shorten it or move it later. |
| wind | *(none — falls back)* | Gusty. The air is fine; the handling is not. |

Level 0: "Clear enough for a full session at your usual intensity."
Fallback when no sentence matches: "Conditions are against you right now."

The same language rule applies to these as to everything else in the app.

---

## 7. Changing the rules

1. Edit the sections above. Be explicit about `>` versus `≥`.
2. Add worked examples for every new boundary — at the threshold and just
   below it.
3. Say whether sections 4.1, 4.2 and 4.3 change. They are easy to forget
   because they are not "the verdict", but each is a decision.
4. If a rule uses a reading from the unused column of 1.1, note it there.

The code and tests are then updated to match this file.
