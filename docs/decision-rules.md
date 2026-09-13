# HazePace decision rules

This file is the specification for `src/lib/rating.ts`. The code implements
what is written here, and the tests in `src/lib/rating.test.ts` pin the
worked examples in section 5. When the rules change, change this file first;
the code and tests follow it.

**Status:** the **air** rule (section 3.1) was decided on 2026-09-13: it
follows Environment and Climate Change Canada's published AQHI guidance and
has no user-set ceiling. The rain, heat and wind rules are still the design
prototype's placeholders; the intent is for the user's settings to become the
limits above which they will not train, with a caution band derived below
each — the size of that band is not yet decided.

Air is judged by relaying ECCC's guidance for the user's sport and
sensitivity; rain, heat and wind are measured against limits the user set
themselves. In both cases the app presents conditions, thresholds and
timing; it does not make health or safety claims, and nothing added to this
file should either.

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
| Sensitivity | Normal · Reactive | Normal |
| Rain tolerance | None · Light · Moderate · Heavy | Light |
| Wind tolerance | 8–40 km/h, in steps of 4 | 32 |
| Heat tolerance | 22–38 °C, in steps of 2 | 30 |

There is no air-quality ceiling. The air rule is ECCC's, keyed by the two
settings above; see 3.1.

The two settings map onto the two populations ECCC writes its AQHI guidance
for, and the activities onto whether ECCC would call them strenuous:

| Sensitivity | ECCC population |
| --- | --- |
| Normal | General population |
| Reactive | At-risk population |

| Activity | Strenuous |
| --- | --- |
| Running | yes |
| Cycling | yes |
| Hiking / Walking | no |

"Hiking / Walking" is classed as not strenuous because it is the design's
baseline activity. If hiking should count as strenuous, split the activity
or move it — this table is the only place the classification lives.

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

| Level | Word | Meaning — air | Meaning — rain, heat, wind |
| --- | --- | --- | --- |
| 0 | GREEN | ECCC guidance does not mention this activity at this AQHI | within the user's limits |
| 1 | AMBER | ECCC guidance says *consider reducing or rescheduling* | past a limit |
| 2 | RED | ECCC guidance says *reduce or reschedule* / *avoid* | well past a limit |

---

## 3. Hourly verdict

### 3.1 Air — ECCC's AQHI guidance as a lookup

The AQHI is first placed in ECCC's category on its **published value** (the
reading rounded to the nearest whole number; "10+" is anything that rounds
above 10):

| Category | Published AQHI |
| --- | --- |
| Low | 1–3 |
| Moderate | 4–6 |
| High | 7–10 |
| Very High | above 10 |

The air level is then read from this table, by category, ECCC population
(from sensitivity) and whether the activity is strenuous (both from 1.2):

| Category | General · strenuous | General · not strenuous | At risk · strenuous | At risk · not strenuous |
| --- | --- | --- | --- | --- |
| Low | 0 | 0 | 0 | 0 |
| Moderate | 0 | 0 | 1 | 0 |
| High | 1 | 0 | 2 | 1 |
| Very High | 2 | 2 | 2 | 2 |

Each cell follows the corresponding line of ECCC's *AQHI health messages*
table: level 1 where ECCC says *consider reducing or rescheduling strenuous
activities*, level 2 where it says *reduce or reschedule* or *avoid*, and
level 0 where the guidance does not apply to that population and activity.
One explicit override: **Very High is level 2 for everyone**, including
non-strenuous activity by the general population, where ECCC's wording is
only "reduce or reschedule strenuous activities". Above 10 the app does not
show green to anyone.

There are no multipliers. The prototype's ventilation (1.0 / 1.5 / 1.7) and
sensitivity (0.85 / 1.0 / 1.25) factors, and its fixed 5.5 / 10.5 lines, are
gone: every number in the air rule is ECCC's.

Source: Environment and Climate Change Canada, "Understanding Air Quality
Health Index messages" (the health-messages table by category and
population). The category thresholds are the same ones `aqhi.ts` uses to
band a reading for display, so the two cannot drift apart.

### 3.2 Four factors

Each factor is rated on its own. Boundaries are stated exactly — `>` and `≥`
are different, and the worked examples pin which is which.

| Factor | Level 2 if | Level 1 if | Otherwise |
| --- | --- | --- | --- |
| **Air** | lookup in 3.1 gives 2 | lookup in 3.1 gives 1 | 0 |
| **Rain** | rain **≥** tolerance × 2.6 | rain **≥** tolerance | 0 |
| **Heat** | temp **≥** tolerance + 4 | temp **≥** tolerance | 0 |
| **Wind** | wind **≥** tolerance + 14 | wind **≥** tolerance | 0 |

Notes:

- Air boundaries are on the *published* AQHI, so they fall at .5: 3.4 rounds
  to 3 (Low) and 3.5 to 4 (Moderate); 10.4 rounds to 10 (High) and 10.5 to
  11 (Very High). The model's estimate (1.1) is unrounded and goes through
  the same rounding.
- The heat and wind red margins (+4 °C, +14 km/h) and the rain red multiplier
  (× 2.6) are fixed and not shown to the user. The heat default of 30 °C with
  a +4 margin reproduces the prototype's fixed 30 / 34 lines, so a user who
  never touches the slider sees what they saw before it existed.
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
quality = 100 − (aqhi − 1) × 12
              − min(45, rain × 7)
              − max(0, (temp − 28) × 4)
```

Clamped to **6–100**. The floor is 6 rather than 0 so a bar is always visible.
The prototype used the effective AQHI here; with the multipliers gone it uses
the raw reading, so the bar heights no longer change with sport or
sensitivity — only the colours do.

| Case | AQHI | Temp | Rain | Quality |
| --- | --- | --- | --- | --- |
| Clean | 2 | 20 | 0 | 88.0 |
| AQHI 6 | 6 | 20 | 0 | 40.0 |
| Heavy rain | 2 | 20 | 8 | 43.0 |
| 32 °C | 2 | 32 | 0 | 72.0 |
| Everything bad | 11 | 40 | 20 | 6.0 |

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

Unless a cell says otherwise: **Cycling · Normal · Light · 32 km/h · 30 °C**.
Base readings are AQHI 2, 20 °C, 10 km/h, 0 mm/h. The "Wind tol" column
reads "wind · heat" where heat is not the default.

| # | Case | AQHI | Temp | Wind | Rain | Activity | Sens | Rain tol | Wind tol | Category | Level | Driver |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Clean hour, defaults | 2 | 20 | 10 | 0 | Cycling | Normal | Light | 32 | Low | **0** | — |
| 2 | Air: Moderate (AQHI 5) — general strenuous stays 0 | 5 | 20 | 10 | 0 | Cycling | Normal | Light | 32 | Moderate | **0** | — |
| 3 | Air: Moderate (AQHI 5) — at-risk strenuous is 1 | 5 | 20 | 10 | 0 | Cycling | Reactive | Light | 32 | Moderate | **1** | smoke |
| 4 | Air: Moderate (AQHI 5) — at-risk walking is 0 | 5 | 20 | 10 | 0 | Hiking / Walking | Reactive | Light | 32 | Moderate | **0** | — |
| 5 | Air: High (AQHI 8) — general strenuous is 1 | 8 | 20 | 10 | 0 | Cycling | Normal | Light | 32 | High | **1** | smoke |
| 6 | Air: High (AQHI 8) — general walking is 0 | 8 | 20 | 10 | 0 | Hiking / Walking | Normal | Light | 32 | High | **0** | — |
| 7 | Air: High (AQHI 8) — at-risk strenuous is 2 | 8 | 20 | 10 | 0 | Cycling | Reactive | Light | 32 | High | **2** | smoke |
| 8 | Air: High (AQHI 8) — at-risk walking is 1 | 8 | 20 | 10 | 0 | Hiking / Walking | Reactive | Light | 32 | High | **1** | smoke |
| 9 | Air: Very High (AQHI 11) — general walking is 2 (the override) | 11 | 20 | 10 | 0 | Hiking / Walking | Normal | Light | 32 | Very High | **2** | smoke |
| 10 | Air: boundary 6.4 rounds to 6, Moderate | 6.4 | 20 | 10 | 0 | Cycling | Normal | Light | 32 | Moderate | **0** | — |
| 11 | Air: boundary 6.5 rounds to 7, High | 6.5 | 20 | 10 | 0 | Cycling | Normal | Light | 32 | High | **1** | smoke |
| 12 | Air: boundary 10.4 rounds to 10, High — at-risk walking | 10.4 | 20 | 10 | 0 | Hiking / Walking | Reactive | Light | 32 | High | **1** | smoke |
| 13 | Air: boundary 10.5 rounds to 11, Very High | 10.5 | 20 | 10 | 0 | Hiking / Walking | Reactive | Light | 32 | Very High | **2** | smoke |
| 14 | Rain: just under Light tolerance (1.4 < 1.5) | 2 | 20 | 10 | 1.4 | Cycling | Normal | Light | 32 | Low | **0** | — |
| 15 | Rain: exactly at Light tolerance | 2 | 20 | 10 | 1.5 | Cycling | Normal | Light | 32 | Low | **1** | rainfall |
| 16 | Rain: past 2.6 × Light tolerance | 2 | 20 | 10 | 4 | Cycling | Normal | Light | 32 | Low | **2** | rainfall |
| 17 | Rain: 4.0 mm/h with Heavy tolerance | 2 | 20 | 10 | 4 | Cycling | Normal | Heavy | 32 | Low | **0** | — |
| 18 | Heat: 29 °C, tolerance 30 | 2 | 29 | 10 | 0 | Cycling | Normal | Light | 32 · 30 | Low | **0** | — |
| 19 | Heat: exactly at tolerance | 2 | 30 | 10 | 0 | Cycling | Normal | Light | 32 · 30 | Low | **1** | heat |
| 20 | Heat: tolerance + 4 | 2 | 34 | 10 | 0 | Cycling | Normal | Light | 32 · 30 | Low | **2** | heat |
| 20a | Heat: 34 °C with tolerance 36 | 2 | 34 | 10 | 0 | Cycling | Normal | Light | 32 · 36 | Low | **0** | — |
| 21 | Wind: 31 km/h, tolerance 32 | 2 | 20 | 31 | 0 | Cycling | Normal | Light | 32 | Low | **0** | — |
| 22 | Wind: exactly at tolerance | 2 | 20 | 32 | 0 | Cycling | Normal | Light | 32 | Low | **1** | wind |
| 23 | Wind: tolerance + 14 | 2 | 20 | 46 | 0 | Cycling | Normal | Light | 32 | Low | **2** | wind |
| 24 | Worst wins: heat 1, wind 2 | 2 | 30 | 46 | 0 | Cycling | Normal | Light | 32 | Low | **2** | wind |
| 25 | Tie at 1: all four amber — air named first | 7 | 30 | 32 | 1.5 | Cycling | Normal | Light | 32 | High | **1** | smoke |
| 26 | Tie at 1: rain and heat, clean air — rain named | 2 | 30 | 10 | 1.5 | Cycling | Normal | Light | 32 | Low | **1** | rainfall |
| 27 | Tie at 1: heat and wind, clean air — heat named | 2 | 30 | 32 | 0 | Cycling | Normal | Light | 32 | Low | **1** | heat |

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
| smoke | Heavy smoke. Past the level ECCC's guidance sets for strenuous activity. | Thin smoke. Steady work is fine; save the intervals. |
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
