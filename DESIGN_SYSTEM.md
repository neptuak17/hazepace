# HazePace design system

What is actually in the code, as of commit `449753b` (2026-09-15). Every value
below is copied from a file in this repo and cited. Nothing is aspirational.
Where the code is inconsistent, every variant is listed and the dominant one
named. Where something is not determinable from the repo, it says **TODO**.

The reference for a sibling app ("Snowpace") is section 13, the theming
contract. Sections 2–12 are the evidence it rests on.

Files that matter most:

| File | Holds |
| --- | --- |
| `src/constants/design-tokens.ts` | every palette, ramp, spacing, radius, shadow, font and type token |
| `src/constants/strings.ts` | every user-facing string |
| `src/components/*.tsx` | the nine shared components |
| `src/app/*.tsx` | the six screens and the root layout |
| `app.json` | splash colour, icon, orientation, `userInterfaceStyle` |
| `assets/fonts/` | the two typefaces, five files |

The Expo template's own components (`src/components/animated-icon.*`,
`app-tabs.*`, `themed-*`, `web-badge`, `hint-row`, `ui/collapsible`,
`external-link`, `src/hooks/*`, `src/constants/theme.ts`, `src/global.css`,
`src/app/explore.tsx`) are kept in the repo as reference for a future web
target and are **not part of this design system**. Nothing the app renders
imports them. They are not documented here.

---

## 1. Design intent

Warm, flat and paper-like. One light palette — a cream page (`#f5ead8`) with
darker cream cards sitting flat on it, no shadows on cards, dividers that are
the ink at 16% opacity. Two accent hues carry all the meaning: terracotta for
actions and the two caution levels, sage for "clear" and for anything about
the user's own settings. Display type is a single soft slab (Caprasimo) used
for every number and title; everything else is Figtree. Corners are large
(16–32) and pills are everywhere. Motion is confined to the launch overlay and
the sheet; the screens themselves do not animate. There is no dark mode, no
haptics, and no imagery beyond seventeen stroked line icons.
(`design-tokens.ts:1–8`, `app.json:10`.)

---

## 2. Color

The app has **one theme**. `app.json:10` sets `"userInterfaceStyle": "light"`,
`_layout.tsx:78–80` forces the status bar to `dark` content, and the token
file's header says "the design is a single warm light palette; it has no dark
variant" (`design-tokens.ts:5–7`). **Dark-mode column below is therefore
"none" throughout. TODO: a sibling app wanting dark mode has no dark tokens
to start from.**

### 2.1 Raw palettes (`design-tokens.ts:11–56`)

Three ramps plus a four-entry `Palette`. All hex, all opaque except the
divider.

| Ramp | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | base |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Accent` (terracotta) | `#fff2eb` | `#ffe1d0` | `#ffc6a5` | `#f6a06b` | `#d67f48` | `#b2622d` | `#8c491a` | `#643312` | `#402310` | `#c67139` |
| `Accent2` (sage) | `#f0fae1` | `#e1eecc` | `#ccdbb2` | `#aebf92` | `#8fa073` | `#728157` | `#56633f` | `#3d472b` | `#272e1b` | `#7a8a5e` |
| `Neutral` (warm grey) | `#f9f4ed` | `#eee7db` | `#dcd3c4` | `#c0b6a5` | `#a19786` | `#82796a` | `#645c50` | `#474238` | `#2e2b25` | — |

| `Palette` | Value |
| --- | --- |
| `bg` | `#f5ead8` |
| `surface` | `#ebddc5` |
| `text` | `#201e1d` |
| `divider` | `rgba(32,30,29,0.16)` (= `text` at 16%) |

Neutral ramp lightness (CIE L*): 96.4 · 91.9 · 84.9 · 74.4 · 62.9 · 51.2 ·
39.5 · 28.2 · 17.7 — steps of roughly 8–12 L*, evenly spaced. Every neutral
sits at hue 35–40° (warm), saturation falling from 50% at 100 to 11% at 900.

Usage counts across `src/app` and `src/components` (a measure of what the
system leans on): `Neutral[600]` ×32, `Neutral[700]` ×15, `Neutral[200]` ×12,
`Neutral[100]` ×11, `Accent.base` ×15, `Accent[700]` ×8, `Accent2[600]` ×6,
`Accent2[800]` ×5. `Accent[100]`, `Accent[400]`, `Accent[900]`,
`Accent2.base`, `Accent2[100]`, `Accent2[400]`, `Accent2[500]`,
`Accent2[700]` and `Neutral[900]` are defined but **never referenced** by a
screen or component.

### 2.2 Semantic roles

Roles are not named in code; they are inferred from consistent use. Light
value is the only value.

| Role | Token | Value | Dark | Where used |
| --- | --- | --- | --- | --- |
| Page background | `Palette.bg` | `#f5ead8` | none | every screen's `screen` style (`index.tsx:471`, `map.tsx:185`, `forecast.tsx:149`, `thresholds.tsx:108`, `about.tsx:147`, `how-it-works.tsx:181`), root view (`_layout.tsx:93`), launch overlay (`launch-overlay.tsx:241`), splash (`app.json:35`) |
| Card surface | `Palette.surface` via `Card` | `#ebddc5` | none | every `styles.card = Card` (`design-tokens.ts:139–143`); the verdict card when no verdict (`index.tsx:121`) |
| Inset surface (a panel inside a card, sheet tiles, tab bar) | `Neutral[200]` | `#eee7db` | none | Today readout (`index.tsx:566`), Forecast detail (`forecast.tsx:180`), Map plate (`map.tsx:201`), launch step pills (`launch-overlay.tsx:287`), sheet search box and tiles (`sheets.tsx:337,356,366`), HIW vent tiles (`how-it-works.tsx:254`), unjudged factor tile (`how-it-works.tsx:111`) |
| Raised surface (sheet panel, tab bar) | `Neutral[100]` | `#f9f4ed` | none | sheet panel (`sheet.tsx:106`), tab bar (`tab-bar.tsx:91`); also **text on filled pills/chips** (see below) |
| Track / empty / unjudged | `Neutral[300]` | `#dcd3c4` | none | chart bar with no reading (`index.tsx:318`), forecast block with no level (`forecast.tsx:83`), slider track (`slider.tsx:161`), launch progress track (`launch-overlay.tsx:299`), off-chip border (`index.tsx:514`, `about.tsx:195`), Map plate border (`map.tsx:200`) |
| Unavailable pill fill | `Neutral[400]` | `#c0b6a5` | none | verdict pill when no verdict (`index.tsx:378`, `forecast.tsx:111`) |
| Primary text | `Palette.text` | `#201e1d` | none | titles, card titles, values, hour labels, day names (everywhere) |
| Secondary text | `Neutral[700]` | `#645c50` | none | card notes and captions that explain (`index.tsx:538`, `thresholds.tsx:123`, `how-it-works.tsx:193–194`, `about.tsx:198–199`, `sheets.tsx:331,387`) |
| Tertiary text (metadata, ticks, attribution, unselected tab) | `Neutral[600]` | `#82796a` | none | every `caption`-role line: attribution (`index.tsx:595`), provenance (`index.tsx:579`), ticks (`index.tsx:359`), stat keys (`index.tsx:584`), kickers (`map.tsx:234`), tab label unselected (`tab-bar.tsx:30`), header meta (`app-header.tsx:133`) |
| Text on tinted/filled chips | `Neutral[100]` | `#f9f4ed` | none | on-chip text (`index.tsx:290`, `about.tsx:66`), verdict pill text (`index.tsx:493,576`, `forecast.tsx:190`, `how-it-works.tsx:222`) |
| Chip text, off state | `Neutral[800]` | `#474238` | none | `index.tsx:290`, `about.tsx:66`, launch step label (`launch-overlay.tsx:293`), closing line (`how-it-works.tsx:276`), AQHI category in sheet (`sheets.tsx:361`) |
| Divider | `Palette.divider` | `rgba(32,30,29,0.16)` | none | row rules at 1.5 px (`map.tsx:243`, `forecast.tsx:164`, `sheets.tsx:318,385`), tab bar top rule (`tab-bar.tsx:93`) |
| Primary action fill | `Accent.base` | `#c67139` | none | Done / Retry buttons (`thresholds.tsx:150`, `about.tsx:223`, `how-it-works.tsx:283`, `error-panel.tsx:64`), slider fill and thumb (`slider.tsx:167,174`), launch core and progress fill (`launch-overlay.tsx:267,302`), header icon buttons (`app-header.tsx:86,93,100`), sheet close (`sheet.tsx:88`), pull-to-refresh spinner (`index.tsx:230`) |
| Primary action, pressed | `Accent[700]` | `#8c491a` | none | `donePressed` / `retryPressed` (`thresholds.tsx:155`, `about.tsx:228`, `how-it-works.tsx:288`, `error-panel.tsx:69`) |
| Text on primary action | `Palette.bg` | `#f5ead8` | none | `doneText`, `retryText` (`thresholds.tsx:159`, `error-panel.tsx:71`) |
| Selected chip (activity, on Today) | `Accent[600]` fill + border | `#b2622d` | none | `index.tsx:513` |
| Selected chip (settings, on About) | `Accent2[600]` fill + border | `#728157` | none | `about.tsx:194` — the code comment says "all three groups here use the sage voice" |
| Selected tab | `Accent[200]` fill, `Accent[700]` icon+label | `#ffe1d0` / `#8c491a` | none | `tab-bar.tsx:109,30` |
| Link / emphasised value | `Accent[700]` | `#8c491a` | none | "What's in the air" link (`index.tsx:591`), limit values on Thresholds (`thresholds.tsx:144`), HIW vent tile value (`how-it-works.tsx:258`) |
| Inline text action | `Accent.base` | `#c67139` | none | "Choose a place" on the location card (`index.tsx:540`) — **the only place `Accent.base` is used as text; contrast 2.69:1 on the card** |
| "Your settings" accent fill | `Accent2[200]` | `#e1eecc` | none | best-window pill (`index.tsx:521`), About tiles (`about.tsx:208`), HIW page badge (`how-it-works.tsx:202`) |
| "Your settings" accent ink | `Accent2[800]` | `#3d472b` | none | best-window text + icon (`index.tsx:299,527`), tile icons + labels (`about.tsx:127,217`), page-badge icons (`how-it-works.tsx:78`) |
| "Your settings" accent ink, strongest | `Accent2[900]` | `#272e1b` | none | tile value (`about.tsx:213`) — single use |
| Place / location marker | `Accent2[600]` | `#728157` | none | header pin badge (`app-header.tsx:127`), device row circle in places sheet (`sheets.tsx:183`), source-list dots (`how-it-works.tsx:267`), launch step dots (`launch-overlay.tsx:292`) |
| Launch halo | `Accent2[300]` | `#ccdbb2` | none | expanding rings (`launch-overlay.tsx:261`) — single use |
| Scrim | literal `rgba(46,43,37,0.42)` | = `Neutral[900]` at 42% | none | `sheet.tsx:108` — **hardcoded** |
| Legend pill | literal `rgba(249,244,237,0.8)` | = `Neutral[100]` at 80% | none | `map.tsx:221` — **hardcoded** |
| Shadow colour | literal `#2e2b25` | = `Neutral[900]` | none | all three `Shadow` presets (`design-tokens.ts:101,105,109`) |

State colours beyond the verdict ramp: there are none. No error red, no
success green, no warning yellow outside the ramp. The error panel uses the
ordinary card and the ordinary primary button (`error-panel.tsx:56–71`). A
disabled/busy primary button is the same fill at `opacity: 0.45`
(`error-panel.tsx:70`). Past hours in the chart are the same colour at
`opacity: 0.28` (`index.tsx:333`).

### 2.3 The verdict ramp (`design-tokens.ts:58–69`)

This is the severity scale. It is **three steps**, not a gradient, and every
step is drawn from the two accent ramps rather than being a separate colour.

```ts
export const Verdict = {
  word: { 0: 'GREEN', 1: 'AMBER', 2: 'RED' },
  /** Line/figure colour. */
  ink: { 0: '#728157', 1: '#d67f48', 2: '#8c491a' },
  /** Card and pill fills. */
  tint: { 0: '#e1eecc', 1: '#ffe1d0', 2: '#ffc6a5' },
  /** Text sitting on a tint fill. */
  deepInk: { 0: '#3d472b', 1: '#8c491a', 2: '#643312' },
} as const satisfies Record<string, Record<Level, string>>;
```

Each step has three coordinated values, and each is a named ramp entry:

| Level | Word | `ink` | `tint` | `deepInk` |
| --- | --- | --- | --- | --- |
| 0 | GREEN | `Accent2[600]` `#728157` | `Accent2[200]` `#e1eecc` | `Accent2[800]` `#3d472b` |
| 1 | AMBER | `Accent[500]` `#d67f48` | `Accent[200]` `#ffe1d0` | `Accent[700]` `#8c491a` |
| 2 | RED | `Accent[700]` `#8c491a` | `Accent[300]` `#ffc6a5` | `Accent[800]` `#643312` |

**Structure.** Level 0 is a different hue (sage, 81–83°) from levels 1 and 2
(terracotta, 22–25°). Levels 1 and 2 are the *same hue* and differ by
lightness only. So the ramp says "clear" with hue and "how far past clear"
with darkness. Measured:

| Level | `ink` HSL | `ink` L* | `tint` L* | `deepInk` L* |
| --- | --- | --- | --- | --- |
| 0 | 81° 19% 42% | 51.8 | 92.4 | 28.6 |
| 1 | 23° 63% 56% | 61.6 | 91.5 | 38.6 |
| 2 | 25° 69% 33% | 38.6 | 84.2 | 27.1 |

- The **tints** are near-equal lightness for 0 and 1 (92.4, 91.5) and drop
  ~7 L* for 2. On a page at L* 93.1 the tints are barely lighter than the
  surface (88.6) — they are read by hue, not by lightness.
- The **inks** are not monotonic in lightness: amber (61.6) is *lighter* than
  green (51.8). Amber is distinguished by saturation (63% vs 19%) and hue.
  Red is amber's hue at 23 L* darker and 6 points more saturated.
- `deepInk[1]` and `ink[2]` are the **same colour** (`#8c491a`,
  `Accent[700]`). Text on an amber tint is the same ink that draws a red bar.
  This is in the code and is not an accident of rounding; it is worth knowing
  before re-skinning.

**Where each of the three values is applied** (the rule is consistent across
files):

| Value | Used for |
| --- | --- |
| `ink` | filled pills that carry the verdict word (`index.tsx:377`, `forecast.tsx:111`, `how-it-works.tsx:95`), chart bar fill (`index.tsx:318`), forecast strip blocks (`forecast.tsx:83`), factor bar and factor name (`how-it-works.tsx:112`), zone-circle number (`map.tsx`, ZoneRow), band-row text on its own tint (`how-it-works.tsx:98`), winner text on tint (`how-it-works.tsx:131`) |
| `tint` | the verdict card background (`index.tsx:121`), flagged stat chips (`index.tsx:401`), band rows (`how-it-works.tsx:94`), factor tiles (`how-it-works.tsx:111`), zone circle / place circle fills (`map.tsx`, `sheets.tsx:43`) |
| `deepInk` | every piece of text placed on a `tint`: the whole verdict card's text (`index.tsx:122`), flagged stat text (`index.tsx:406,413`), zone-circle caps (`map.tsx`), place-circle text (`sheets.tsx:44`) |

Two exceptions where `ink` (not `deepInk`) is text on a `tint`:
`how-it-works.tsx:98` (band description) and `:131` (winner line), and the
zone-circle number (`map.tsx` ZoneRow). Contrast for those pairs is in 2.5.

**What maps to each step.** The step is the model's `Level` (0 | 1 | 2),
produced by `judge()` in `src/lib/rating.ts` and specified in
`docs/decision-rules.md`. In brief:

- Air: ECCC's AQHI category on the rounded value (Low 1–3, Moderate 4–6, High
  7–10, Very High 10+) looked up against the user's sensitivity and whether
  the sport is strenuous (`rating.ts:AIR_LEVEL`). Very High is 2 for everyone.
- Rain / heat / wind: the user's limit with an amber band centred on it —
  ±2 °C, ±6 km/h, ÷/×1.6 for rain (`rating.ts:factorLevels`).
- Hour level = worst factor. Day level = best contiguous run.

The four ECCC category names are shown as *text only* (`Common.aqhi` tiles,
"Category" stat); they have no colour of their own. **The colour scale is the
three verdict levels, never the four AQHI categories.**

**Anything without a level** (an hour the model could not judge) takes
`Neutral[300]` for fills and `Neutral[400]`/`Neutral[500]`/`Neutral[600]` for
ink, and the word "—" (`DataStrings.unavailable`). It is never drawn in level
0's colour (`index.tsx:9–11`).

### 2.4 Chart-only colour behaviour

Chart bars use `ink`; bars for hours already finished keep their colour at
`opacity: 0.28` (`index.tsx:333`). Forecast strip blocks are `ink` at
`opacity: 0.9` (`forecast.tsx:172`). The selected chart bar's ring is
`Palette.text` (`index.tsx:557`).

### 2.5 Measured contrast (WCAG 2.x relative luminance)

Every text-on-background pairing found in the code. ≥ 4.5:1 passes AA for
body text; ≥ 3:1 passes AA for large text (≥ 18 pt regular / 14 pt bold)
and for non-text UI. **Nothing in the app fails only by a hair — the fails
are structural and listed at the end.**

| Foreground | Background | Ratio | Where | Result |
| --- | --- | --- | --- | --- |
| `text` `#201e1d` | `bg` `#f5ead8` | 13.95 | screen titles | pass |
| `text` | `surface` `#ebddc5` | 12.40 | card titles, values | pass |
| `text` | `Neutral[200]` | 13.51 | readout hour, sheet values | pass |
| `text` | `Neutral[100]` | 15.17 | sheet title | pass |
| `Neutral[800]` `#474238` | `bg` | 8.38 | closing line | pass |
| `Neutral[800]` | `surface` | 7.45 | off-chip text (About) | pass |
| `Neutral[800]` | `Neutral[200]` | 8.12 | launch step label, sheet category | pass |
| `Neutral[700]` `#645c50` | `bg` | 5.53 | — | pass |
| `Neutral[700]` | `surface` | 4.92 | card notes, captions | pass |
| `Neutral[700]` | `Neutral[200]` | 5.36 | plate title, sheet kv keys | pass |
| `Neutral[600]` `#82796a` | `bg` | 3.61 | attribution, header meta | **fails AA body (12 px)**; passes large/UI |
| `Neutral[600]` | `surface` | 3.21 | stat keys, provenance, kickers, ticks (9–12 px) | **fails AA body** |
| `Neutral[600]` | `Neutral[200]` | 3.49 | readout provenance, sheet stat keys | **fails AA body** |
| `Neutral[600]` | `Neutral[100]` | 3.92 | unselected tab label (11 px bold) | **fails AA body** |
| `Neutral[500]` `#a19786` | `Neutral[200]` | 2.35 | unjudged factor-tile name (11 px) | **fails** |
| `Accent[700]` `#8c491a` | `bg` | 5.72 | — | pass |
| `Accent[700]` | `surface` | 5.09 | limit values, air link | pass |
| `Accent[700]` | `Accent[200]` | 5.49 | selected tab label | pass |
| `Accent[700]` | `Neutral[200]` | 5.54 | vent tile value | pass |
| `Accent.base` `#c67139` | `surface` | 2.69 | "Choose a place" text action | **fails** |
| `bg` `#f5ead8` | `Accent.base` | 3.03 | Done / Retry button label (14 px display) | passes large-text only, **fails body** |
| `bg` | `Accent[700]` | 5.72 | Done / Retry, pressed | pass |
| `Neutral[100]` | `Accent[600]` `#b2622d` | 4.10 | selected activity chip text (13 px bold) | **fails AA body**; passes large |
| `Neutral[100]` | `Accent2[600]` `#728157` | 3.84 | selected settings chip text (14 px bold) | **fails AA body**; passes large |
| `Neutral[100]` | `Neutral[400]` | 1.83 | "—" on the unavailable pill | **fails** |
| `Neutral[100]` | `ink[0]` `#728157` | 3.84 | GREEN pill text | **fails AA body** |
| `Neutral[100]` | `ink[1]` `#d67f48` | 2.75 | AMBER pill text | **fails** |
| `Neutral[100]` | `ink[2]` `#8c491a` | 6.22 | RED pill text | pass |
| `deepInk[0]` | `tint[0]` | 8.11 | verdict card text, green | pass |
| `deepInk[1]` | `tint[1]` | 5.49 | verdict card text, amber | pass |
| `deepInk[2]` | `tint[2]` | 6.85 | verdict card text, red | pass |
| `Accent2[900]` | `Accent2[200]` | 11.59 | About tile value | pass |
| `ink[0]` | `tint[0]` | 3.47 | HIW band text (green), zone number | **fails AA body** |
| `ink[1]` | `tint[1]` | 2.42 | HIW band text (amber), zone number | **fails** |
| `ink[2]` | `tint[2]` | 4.50 | HIW band text (red) | pass (exactly) |
| `ink[0]` | `bg` | 3.53 | chart bar vs page (non-text) | pass UI |
| `ink[1]` | `bg` | 2.52 | chart bar vs page (non-text) | **fails 3:1 UI** |
| `ink[2]` | `bg` | 5.72 | chart bar vs page | pass |

Summary of the structural fails, for section 12: (a) `Neutral[600]` is the
metadata colour everywhere and sits at 3.2–3.9:1 on every surface;
(b) `Neutral[100]` text on `ink[0]`/`ink[1]`/`Accent[600]`/`Accent2[600]`
fills is 2.75–4.1:1; (c) `ink` used as text on its own `tint` is 2.4–3.5:1
for levels 0 and 1; (d) the amber bar against the page is 2.52:1.

---

## 3. Typography

### 3.1 Families

Two typefaces, five files, all bundled (`assets/fonts/`), loaded by
`useFonts` in `_layout.tsx:50–56`. If loading fails the app still starts and
falls back to system faces (`_layout.tsx:60–63`).

| Token (`design-tokens.ts:115–121`) | Family name | File |
| --- | --- | --- |
| `Font.display` | `Caprasimo_400Regular` | `Caprasimo-Regular.ttf` |
| `Font.body` | `Figtree_400Regular` | `Figtree-Regular.ttf` |
| `Font.bodySemibold` | `Figtree_600SemiBold` | `Figtree-SemiBold.ttf` |
| `Font.bodyBold` | `Figtree_700Bold` | `Figtree-Bold.ttf` |
| `Font.bodyExtrabold` | `Figtree_800ExtraBold` | `Figtree-ExtraBold.ttf` |

Weights are separate files because RN cannot synthesise weight from one
face (`_layout.tsx:47–48`). `Font.bodySemibold` is defined and **never used**
by a screen; one style asks for `fontWeight: '600'` on the regular family
instead (`how-it-works.tsx:224`), which on iOS will not select the SemiBold
file — **inconsistency**.

No system font is used anywhere in the app's own screens.

### 3.2 The token scale (`design-tokens.ts:146–178`)

| Token | Family | Size | Line height | Tracking | Case | Used |
| --- | --- | --- | --- | --- | --- | --- |
| `heroNumber` | display | 76 | 76 × 0.92 = 69.9 | — | — | Today hero (`index.tsx:485`) |
| `ceiling` | display | 44 | — | — | — | **unused** (slider removed) |
| `pageTitle` | display | 32 | — | — | — | never at 32; its `fontFamily` is borrowed 9× for other sizes |
| `loaderTitle` | display | 27 | 27 × 1.15 | — | — | **unused as a token**; the launch title restates the same values inline (`launch-overlay.tsx:274–280`) |
| `verdictHeadline` | display | 30 | — | — | — | **unused** |
| `sectionTitle` | display | 24 | — | — | — | screen titles (Map, Forecast, Thresholds, About, HIW), error title |
| `tile` | display | 20 | — | — | — | About tile value, HIW vent value |
| `dayRow` | display | 19 | — | — | — | Today chart card title, Map plate title |
| `zoneNumber` | display | 18 | (overridden to 18) | — | — | zone / place circle number |
| `hourLabel` | display | 17 | — | — | — | readout hour, Today verdict pill |
| `body` | Figtree 400 | 15 | — | — | — | search input, error body |
| `bodySmall` | Figtree 400 | 13 | — | — | — | notes, captions, chip text (×18) |
| `cardTitle` | Figtree 700 | 16 | — | — | — | card titles, stat values |
| `rowLabel` | Figtree 700 | 15 | — | — | — | row names, day names, values (×20) |
| `pillLabel` | Figtree 700 | 14 | — | — | — | chip text, window pill, sources |
| `kicker` | Figtree 800 | 14 | — | 1.4 (0.1 em) | upper | Today kicker |
| `capsLabel` | Figtree 800 | 11 | — | 1.1 (0.1 em) | upper | stat keys, tile labels, section labels |
| `tabLabel` | Figtree 700 | 11 | — | — | — | tab bar |
| `caption` | Figtree 400 | 12 | — | — | — | metadata, attribution (×23) |
| `zoneCaps` | Figtree 800 | 9.5 | — | 0.95 (0.1 em) | — | "AQHI" under a circle number |
| `tick` | Figtree 700 | 9 | — | — | — | chart axis |

Tracking is computed by `tracking(fontSize, em = 0.1)` (`design-tokens.ts:127`)
because RN `letterSpacing` is in px. The tokens use 0.1 em; screens frequently
override to 0.04, 0.06 or 0.08 em (see 3.3).

### 3.3 Sizes actually rendered (the real scale)

Every distinct family/size/line-height combination in `src/app` and
`src/components`, including inline overrides. **Dominant** = most instances.

**Display (Caprasimo)**

| Size | Line height | Where | Note |
| --- | --- | --- | --- |
| 76 | 69.9 | hero number | token |
| 27 | 31.05 | launch title (`launch-overlay.tsx:274–277`) | inline, duplicates `loaderTitle` |
| 26 | 28.6 | air-sheet AQHI value (`sheets.tsx:394–398`) | inline |
| 24 | default | screen titles ×5, error title | token, **dominant title size** |
| 21 | default | sheet title (`sheet.tsx:120`) | inline |
| 20 | 20 / 22 | About tile value (lineHeight 20, `about.tsx:213`); air-sheet pollutant value (lineHeight 22, `sheets.tsx:370–374`); HIW vent value (default) | token + two inline line-heights |
| 19 | default | Today card title, Map plate title | token |
| 18 | 18 | circle numbers (`map.tsx:254`, `sheets.tsx:328`) | token |
| 17 | default | readout hour; **Today verdict pill text** (`index.tsx:492`) with 0.68 px tracking | token |
| 14 | default | Done / Retry button label ×4 (`thresholds.tsx:157`, `about.tsx:230`, `how-it-works.tsx:289`, `error-panel.tsx:71`) | inline, same four times — **a de-facto `button` step with no token** |
| 12 | default | HIW band pill text (`how-it-works.tsx:219–221`) with 0.72 px tracking | inline |

**Body (Figtree)**

| Weight | Size | Line height | Where |
| --- | --- | --- | --- |
| 700 | 17 | default | header place name (`app-header.tsx:132`) — `rowLabel` with `fontSize: 17` override |
| 700 | 16 | default | `cardTitle` |
| 400 | 16 | 23.2 | verdict sentence (`index.tsx:497–499`) — inline, no token |
| 700 | 15 | default | `rowLabel` |
| 400 | 15 | default / 21.75 | `body`; error body at 15 × 1.45 |
| 700 | 14 | default | `pillLabel` |
| 800 | 14 | default | `kicker` |
| 700 | 13 | default | chip text on Today (`index.tsx:515`), air link, winner text, closing line — `bodySmall` size with `rowLabel` family |
| 400 | 13 | default / 18.2 / 17.55 / 18.85 | `bodySmall`; notes at ×1.4 (`index.tsx:538`, `how-it-works.tsx:193`), ×1.35 (`thresholds.tsx:124`), ×1.45 (`about.tsx:199`, `sheets.tsx:377`) — **three competing note line-heights; ×1.4 dominant** |
| 400 + `fontWeight: '600'` | 13 | default | HIW band description (`how-it-works.tsx:224`) — see 3.1 |
| 700 | 12 | default | readout / forecast pill text, zone word, kickers, group labels, limit labels — `caption` size with `rowLabel` family, tracking 0.48–0.96 px |
| 400 | 12 | default / 16.8 / 17.4 | `caption`; attribution at ×1.4; sheet source lines at ×1.45 |
| 800 | 11 | default | `capsLabel` (tracking 1.1 by token, overridden to 0.66 at `index.tsx:584`, `sheets.tsx:351,391` and 0.44 at `about.tsx:216`; tracking 0 with case off at `map.tsx:218–219`, `how-it-works.tsx:238–239,259`, `index.tsx:487` hero caps) |
| 700 | 11 | default | `tabLabel`, tracking 0.22 (`tab-bar.tsx:113`) |
| 800 | 9.5 | 10 | `zoneCaps`, tracking 0.38 |
| 700 | 9 | default | `tick`, tracking −0.18 (`index.tsx:562`) |

**Semantic mapping** (what a sibling should copy):

| Role | Step |
| --- | --- |
| Screen title | display 24 (`sectionTitle`) |
| Hero numeric readout | display 76 / 0.92 |
| Secondary numeric readout (circle, tile, sheet) | display 18–26, tight line-height (1.0–1.1) |
| Card title | Figtree 700 16 (`cardTitle`) or display 19 (`dayRow`) — **two competing card-title treatments**; Figtree 700 16 is used on 4 screens, display 19 on Today's chart card and the Map plate |
| Section / group label | Figtree 700 12 uppercase 0.08 em, or Figtree 800 11 uppercase 0.06 em — **two competing treatments** (`about.tsx:159`, `thresholds.tsx:136`, `map.tsx:229` vs `index.tsx:584`, `sheets.tsx:349`) |
| Kicker (over a hero) | Figtree 800 14 uppercase 0.1 em |
| Row / list item primary | Figtree 700 15 (`rowLabel`) |
| Body | Figtree 400 15 |
| Note / explanatory | Figtree 400 13 × 1.4 |
| Caption / metadata | Figtree 400 12 |
| Pill / chip label | Figtree 700 12–14 |
| Button label | display 14 |
| Axis tick | Figtree 700 9 |

### 3.4 Dynamic Type

No `Text` in the app sets `allowFontScaling`, `maxFontSizeMultiplier` or
`adjustsFontSizeToFit` (grep of `src/app`, `src/components`: no matches). React
Native's default therefore applies: every `Text` scales with the iOS text-size
setting, with no cap, and every fixed-height container around text (chart 140,
tab item 50, chip 44, plate 340, circles 46) does not. **TODO: behaviour at
accessibility text sizes has not been tested on device; expect clipping in
the tab bar, chips and circles.**

---

## 4. Spacing and layout

### 4.1 Scale (`design-tokens.ts:76–83`)

"The design's 4.4px-based scale, rounded to integers."

| Token | px | Uses |
| --- | --- | --- |
| `Space.one` | 4 | 1 |
| `Space.two` | 9 | 19 |
| `Space.three` | 13 | 24 |
| `Space.four` | 18 | 17 |
| `Space.five` | 26 | 1 (Map plate horizontal padding) |
| `Space.six` | 35 | 0 |

Literal pixel values are used at least as often as tokens. Distinct literals
found in padding/margin/gap: 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 15, 16, 30,
34. The most common literals are **10** (row gaps, margins, tile padding),
**8** (gaps), **6** (paddingTop, gaps) and **12** (pill padding). Section 13
lists them by file.

### 4.2 Screen frame

Identical on all six screens (`index.tsx:471–478` and the same block in each
screen file):

```ts
screen: { flex: 1, backgroundColor: Palette.bg },
pane: { flex: 1 },
paneContent: {
  paddingTop: 6,
  paddingHorizontal: Space.four,   // 18
  paddingBottom: 116,              // clears the tab bar
  gap: Space.three,                // 13 between sections
},
```

- Horizontal screen margin: **18 px** (`Space.four`). The header uses **16**
  (`app-header.tsx:112`) — inconsistent by 2 px.
- Gap between stacked sections/cards: **13 px** (`Space.three`).
- Bottom padding 116 px is a literal that assumes the tab bar's height.
- Card internal padding: **18 px** all sides (`Card.padding = Space.four`,
  `design-tokens.ts:142`); the Forecast card overrides to 13 vertical / 18
  horizontal (`forecast.tsx:160`); the error card adds `gap: Space.two`.

### 4.3 Safe areas

`SafeAreaProvider` wraps the app (`_layout.tsx:68`). Only two places read
insets:

- Header: `paddingTop: insets.top + Space.two` (`app-header.tsx:61`).
- Tab bar: `paddingBottom: Math.max(insets.bottom, Space.two)`
  (`tab-bar.tsx:60`), so the design's floor of 9 applies on devices without a
  home indicator.
- Sheet: `paddingBottom: Math.max(insets.bottom, 46)` (`sheet.tsx:76`).

Screen content does not read insets; it relies on the header above and the
116 px bottom padding.

### 4.4 Lists and rows

| Pattern | Vertical padding | Rule | Gap between rows | Where |
| --- | --- | --- | --- | --- |
| Zone row (Map) | 11 | 1.5 px top, divider | 2 | `map.tsx:237–245` |
| Place row (sheet) | 12 | 1.5 px top, divider | 2 | `sheets.tsx:312–319` |
| Key/value row (sheet) | 8 | 1.5 px top, divider | 2 | `sheets.tsx:379–386` |
| Forecast day row | 13 | 1.5 px top, divider (transparent on first) | 0 | `forecast.tsx:162–164` |
| Source row (HIW) | — | none | 12 | `how-it-works.tsx:261` |
| Page row (HIW) | — | none | 18 | `how-it-works.tsx:196` |

Row minimum height where set: 44 (`map.tsx:244`). Circle-to-text gap in rows:
13 (`Space.three`).

### 4.5 Grids and columns

- Activity chips: equal-flex row, gap 7 (`index.tsx:503`).
- Settings chips (About): equal-flex row, gap 7, `marginTop: 10`
  (`about.tsx:184`); sport chips wrap with gap 8 (`about.tsx:175`).
- Stat grid (Today readout): wrapping row, `rowGap: 6`, `columnGap: 10`, each
  cell `minWidth: 62` (`index.tsx:581–583`).
- Four-up tile rows (pollutants, factors, vent): equal-flex, gap 6–9.
- Three-up tile row (About): equal-flex, gap 8.
- Forecast row: fixed `dayCol` 58 · flexible strip · fixed `tempCol` 66,
  gap 10 (`forecast.tsx:166–174`).
- Sheet panel width: full width; `maxHeight: 78%` of the window
  (`sheet.tsx:75`).

### 4.6 Fixed heights

| What | Height | Source |
| --- | --- | --- |
| Chart | 140 | `index.tsx:74` |
| Chart bar minimum | 16 | `index.tsx:75` |
| Forecast strip | 26 | `forecast.tsx:171` |
| Map plate | 340 | `map.tsx:197` |
| Chip / touch targets | 44 min | `index.tsx:506`, `about.tsx:177,187`, `app-header.tsx:121,134`, `sheets.tsx:340`, `slider.tsx:28` |
| Done / Retry button | 46 min | `thresholds.tsx:148` etc. |
| Tab item | 50 min | `tab-bar.tsx:99` |
| Circles: zone/place 46, HIW badge 34, header pin 30 | — | `map.tsx:247`, `how-it-works.tsx:199`, `app-header.tsx:124` |
| Slider track 8, thumb 22 | — | `slider.tsx:26–27` |
| Launch stack 168, core 92, progress track 8 | — | `launch-overlay.tsx:39–40,297` |
| Sheet close button 40 × 40 | — | `sheet.tsx:127` |

---

## 5. Shape and depth

### 5.1 Corner radii (`design-tokens.ts:85–91`)

| Token | px | Applied to |
| --- | --- | --- |
| `Radius.sm` | 8 | stat chips in the readout (`index.tsx:583`) — single use |
| `Radius.md` | 16 | inset panels (readout, forecast detail, sheet tiles, search box), tiles (About, HIW), tab items |
| `Radius.lg` | 28 | verdict card, Map plate, sheet top corners |
| `Radius.lg * 1.15` | **32.2** | every standard card (`Card.borderRadius`, `design-tokens.ts:141`) |
| `Radius.pill` | 999 | chips, all pills, buttons, chart bars, strip blocks, slider, progress |

So cards are **32.2** while the verdict card and the plate are **28** —
two card radii. The token comment (`design-tokens.ts:130–137`) explains the
32.2 comes from the design's stylesheet overriding the README's 28. Circles
use explicit `size / 2` (23, 17, 15, 4.5, 3.5) rather than `Radius.pill`,
except the slider thumb which uses `Radius.pill` (`slider.tsx:173`).

### 5.2 Borders

- Every border in the app is **1.5 px**: chips (`index.tsx:508`), the Map
  plate (`map.tsx:199`), every row rule, the tab bar top (`tab-bar.tsx:92`).
  There is no border-width token.
- Off-state chip border: `Neutral[300]`. On-state: same colour as the fill.
- Row rules and tab bar: `Palette.divider`.
- The selected chart bar's ring is a 2.5 px `Palette.text` border on a
  sibling view (`index.tsx:78,551–559`).

### 5.3 Shadows (`design-tokens.ts:99–112`)

iOS shadow props with Android `elevation` fallbacks the token comment calls
"rough matches". Colour is always `#2e2b25` (`Neutral[900]`), never black.

| Token | iOS | Android | Used by |
| --- | --- | --- | --- |
| `Shadow.sm` | 0 / 1, opacity 0.14, radius 2 | elevation 1 | slider thumb |
| `Shadow.md` | 0 / 3, opacity 0.16, radius 10 | elevation 4 | launch core |
| `Shadow.lg` | 0 / 12, opacity 0.22, radius 32 | elevation 12 | sheet panel |

**Cards have no shadow** (`Card` omits it; comment at `design-tokens.ts:133–137`).
Nothing else in the app casts one.

### 5.4 Blur and materials

None. The scrim is a flat `rgba(46,43,37,0.42)` (`sheet.tsx:108`); the Map
legend pill is `Neutral[100]` at 80% (`map.tsx:221`). No `BlurView`, no
`backdropFilter`.

### 5.5 Dividers

`Palette.divider` at 1.5 px, always as a `borderTop` on the row, never as a
separate view. The first Forecast row keeps the 1.5 px but paints it
transparent so rows do not jump (`forecast.tsx:163`).

---

## 6. Component inventory

Nine shared components in `src/components/`. Each screen also defines local
styles that recur (chips, the Done button, cards, pills); those recurring
local patterns are listed after the shared ones as "screen-level patterns".

### 6.1 `Icon` — `src/components/icon.tsx`

Seventeen Lucide glyphs with path data vendored inline (no icon package),
24 × 24 viewBox, stroked, no fill, colour from the caller.

- Default size **21**, default stroke **2.75** (`icon.tsx:86–88`). Four glyphs
  (`mapPin`, `wind`, `droplet`, `windAlt`) declare stroke 2.5.
- Round caps and joins (`icon.tsx:108–109`).
- Names: `haze`, `hazeLarge`, `mapPin`, `chevronDown`, `chevronRight`,
  `close`, `search`, `settings`, `person`, `help`, `bars`, `flame`, `wind`,
  `droplet`, `windAlt`, `tabToday`, `tabMap`, `tabForecast`.
- No states. Sizes used: 15, 17, 18, 19, 20, 21, 46 (see §11).

```tsx
<Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
  {glyph.paths.map((d, i) => (
    <Path key={`p${i}`} d={d} stroke={color} strokeWidth={width}
          strokeLinecap="round" strokeLinejoin="round" />
  ))}
</Svg>
```

Use for every icon. Do not add an icon font.

### 6.2 `AppHeader` — `src/components/app-header.tsx`

The row above every screen: place pin + two-line place/meta text (tappable,
opens the places sheet) and three 44 × 44 icon buttons (thresholds, about,
how-it-works).

- Container: row, `gap: 2`, `paddingHorizontal: 16`, `paddingBottom: 10`,
  `paddingTop: insets.top + 9` (`:108–114,61`).
- Pin badge: 30 circle, `Accent2[600]`, `mapPin` 17 in `Palette.bg` (`:123–130,68`).
- Place name: `rowLabel` at **17** (`:132`), one line; meta: `caption`
  `Neutral[600]` (`:133`), one line. Chevron `chevronDown` 15 `Neutral[600]`.
- Icon buttons: 44 × 44, glyphs at 20 in `Accent.base` (`:86–100,134`).
- States: none visual (no pressed style). Headline/meta content changes with
  place source; see `app-header.tsx:37–58`.

```tsx
<Pressable style={styles.place} accessibilityRole="button"
  accessibilityLabel={HeaderStrings.changePlace(headline)} onPress={placesSheet.open}>
  <View style={styles.pinBadge}><Icon name="mapPin" size={17} color={Palette.bg} /></View>
  <View style={styles.placeText}>
    <Text style={styles.placeName} numberOfLines={1}>{headline}</Text>
    <Text style={styles.placeMeta} numberOfLines={1}>{meta}</Text>
  </View>
  <Icon name="chevronDown" size={15} color={Neutral[600]} />
</Pressable>
```

Rule: present on all six screens, above the scroll pane, never inside it.

### 6.3 `TabNavigator` — `src/components/tab-bar.tsx`

Headless `expo-router/ui` tabs with a custom bar. Three visible triggers,
three hidden (`display: none`) so settings routes stay in the tab navigator
with no tab selected (`:71–80`).

- Bar: row, `gap: 6`, `Neutral[100]`, 1.5 px `Palette.divider` top rule,
  `paddingTop: 9`, `paddingHorizontal: 18`, `paddingBottom: max(inset, 9)`.
- Item: flex 1, `minHeight: 50`, `Radius.md`, icon 21 above label with gap 3.
- Selected: `Accent[200]` fill, `Accent[700]` icon + label. Unselected:
  transparent, `Neutral[600]`.
- Label: `tabLabel` (Figtree 700 11) with tracking 0.22.
- States: selected / not. No pressed style, no badge.

```tsx
<Pressable ref={ref} accessibilityRole="tab" accessibilityState={{ selected: !!isFocused }}
  {...props} style={StyleSheet.flatten([styles.item, isFocused && styles.itemSelected])}>
  <Icon name={icon} size={21} color={color} />
  <Text style={[styles.label, { color }]}>{label}</Text>
</Pressable>
```

### 6.4 `Sheet` — `src/components/sheet.tsx`

A bottom sheet on `Modal`, no gestures. Scrim and panel animate separately.

- Scrim: `rgba(46,43,37,0.42)`, tappable to close.
- Panel: `Neutral[100]`, top corners `Radius.lg` (28), `paddingHorizontal`
  and `paddingTop` 18, `paddingBottom: max(inset, 46)`, `maxHeight: 78%`,
  `Shadow.lg`.
- Head: title (display **21**, `Palette.text`) + 40 × 40 close button with
  `close` 19 in `Accent.base`; `gap: 10`, `marginBottom: 13`.
- Body: a `ScrollView` with `bounces={false}` and
  `keyboardShouldPersistTaps="handled"`; the whole panel sits in a
  `KeyboardAvoidingView` (`behavior="padding"` on iOS).
- Motion: see §9.
- States: visible / hidden only.

```tsx
<Animated.View style={[styles.panel, { maxHeight: height * 0.78,
    paddingBottom: Math.max(insets.bottom, 46), transform: [{ translateY }] }]}>
  <View style={styles.head}>
    <Text style={styles.title}>{title}</Text>
    <Pressable onPress={onClose} accessibilityRole="button"
      accessibilityLabel={Common.close} style={styles.close}>
      <Icon name="close" size={19} color={Accent.base} />
    </Pressable>
  </View>
  <ScrollView bounces={false} keyboardShouldPersistTaps="handled">{children}</ScrollView>
</Animated.View>
```

Rule: every modal surface in the app is this sheet. There are no alerts,
action sheets or full-screen modals.

### 6.5 `PlacesSheetBody` and `AirSheetBody` — `src/components/sheets.tsx`

The two sheet contents.

**PlacesSheetBody** (`:66–200`): a search box, a "Use my location" row, then
either the chosen place or search results.

- Search box: row, `Neutral[200]`, `Radius.md`, `paddingHorizontal: 13`,
  `minHeight: 44`, `search` icon 17 `Neutral[600]`, `TextInput` in `body`
  15 `Palette.text`, clear button 28 × 28 with `close` 15.
- Rows: `placeRow` — 12 vertical padding, 1.5 px divider top, gap 13.
- `PlaceCircle` (`:41–51`): 46 circle; in use → `Verdict.tint[level]` fill,
  `deepInk[level]` text; otherwise `Neutral[200]` / `Neutral[600]`; number in
  `zoneNumber` 18/18, "AQHI" in `zoneCaps` 9.5/10 tracking 0.38.
- Device row when not in use: 46 circle `Accent2[600]` with `mapPin` 20 in
  `Palette.bg`.
- States: idle / searching (`ActivityIndicator` `Accent.base` + "Searching…")
  / results / empty ("No places found for …") / error. Rows carry
  `accessibilityState={{ selected }}`.

**AirSheetBody** (`:200–306`): the selected hour's detail.

- AQHI tile: `Neutral[200]`, `Radius.md`, padding 13; value in display 26
  with category in `rowLabel` `Neutral[800]` on the same baseline; provenance
  in `caption` `Neutral[700]`.
- Section labels: `capsLabel` tracking 0.66, `Neutral[600]`, `marginTop: 9`.
- Pollutant tiles: four-up, `Neutral[200]`, `Radius.md`, padding 9, value in
  display 20/22.
- Key/value list: rows padded 8, 1.5 px divider, key `bodySmall`
  `Neutral[700]`, value `rowLabel` `Palette.text`.
- Source lines: `caption` `Neutral[600]` × 1.45.

### 6.6 `PlacesSheetProvider` — `src/components/places-sheet.tsx`

Not visual. Mounts one `Sheet` with `PlacesSheetBody` above the screens and
exposes `open()` so the header and the Today location card share it.

### 6.7 `Slider` — `src/components/slider.tsx`

A stepped slider on `PanResponder`.

- Touch area 44 tall; track 8 tall, `Neutral[300]`, pill; fill `Accent.base`;
  thumb 22, `Accent.base`, `Shadow.sm`, positioned absolutely.
- Children are `pointerEvents="none"`; the gesture reads `locationX` once at
  grant and adds `dx` (`:78–93`).
- `onChange` fires only when the snapped step changes (`:70–76`).
- Accessibility: `role="adjustable"`, `accessibilityValue` with min/max/now
  and optional text, increment/decrement actions (`:117–131`).
- States: none visual (no pressed/disabled style). **TODO: no disabled
  variant exists.**

```tsx
<View style={[styles.touch, style]} onLayout={onLayout} accessible
  accessibilityRole="adjustable" accessibilityLabel={label}
  accessibilityValue={{ min, max, now: value, ...(valueLabel ? { text: valueLabel } : null) }}
  accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
  onAccessibilityAction={...} {...responder.panHandlers}>
  <View style={styles.track} pointerEvents="none">
    <View style={[styles.fill, { width: thumbLeft + THUMB_SIZE / 2 }]} />
  </View>
  <View style={[styles.thumb, { left: thumbLeft }]} pointerEvents="none" />
</View>
```

### 6.8 `LaunchOverlay` — `src/components/launch-overlay.tsx`

Full-screen loading cover. See §9 for motion.

- Root: absolute fill, `Palette.bg`, centred column, `gap: 30`,
  `paddingHorizontal: 34`.
- Stack 168: three rings (`Accent2[300]`, absolute fill, radius 84) + core 92
  (`Accent.base`, `Shadow.md`) holding `hazeLarge` 46 in `Neutral[100]`.
- Title: display 27 / 31.05, centred, `Palette.text`.
- Step pills: row, `Neutral[200]`, pill, padding 11 / 15, gap 10; 9 px dot
  `Accent2[600]`; label `pillLabel` `Neutral[800]`.
- Progress: 8 px track `Neutral[300]` with `Accent.base` fill.
- Driven by `finished`; calls `onDone` after the fade.

### 6.9 `ErrorPanel` — `src/components/error-panel.tsx`

Replaces the screens on fetch failure. The file's header calls it "a
placeholder for a designed one".

- Wrap: flex 1, centred, `paddingHorizontal: 18`.
- Card: `Card` + `gap: 9`. Title `sectionTitle`; body `body` × 1.45; note
  `bodySmall` `Neutral[700]` × 1.4; detail `caption` `Neutral[600]` × 1.4,
  3 lines max.
- Retry: the primary button (see 6.10); busy → `opacity: 0.45` and label
  "Retrying…"; `accessibilityState={{ disabled, busy }}`.

### 6.10 Screen-level patterns (repeated inline, no shared component)

**Primary button ("Done" / "Retry")** — identical in `thresholds.tsx:147–160`,
`about.tsx:220–233`, `how-it-works.tsx:280–289`, `error-panel.tsx:61–71`:

```ts
done: { minHeight: 46, borderRadius: Radius.pill, backgroundColor: Accent.base,
        alignItems: 'center', justifyContent: 'center', marginTop: Space.two },
donePressed: { backgroundColor: Accent[700] },
doneText: { fontFamily: Type.pageTitle.fontFamily, fontSize: 14, color: Palette.bg },
```

States: default, pressed (`Accent[700]`), busy (`opacity: 0.45`, error panel
only). No disabled style elsewhere. Full width.

**Chip (segmented choice)** — `index.tsx:504–515`, `about.tsx:176–196`:

```ts
chip: { flex: 1, minHeight: 44, borderRadius: Radius.pill, borderWidth: 1.5,
        alignItems: 'center', justifyContent: 'center' },
chipOn:  { backgroundColor: Accent[600],  borderColor: Accent[600] },   // Today
chipOn:  { backgroundColor: Accent2[600], borderColor: Accent2[600] },  // About
chipOff: { backgroundColor: 'transparent', borderColor: Neutral[300] },
```

Text: `Neutral[100]` on, `Neutral[800]` off; Figtree 700 at 13 (Today) or 14
(About) — **two sizes**. Rule in the code comments: terracotta for the
activity being rated, sage for the user's settings. States: selected / not
(`accessibilityState.selected`); no pressed style.

**Card** — `Card` token everywhere; title either `cardTitle` (Figtree 700 16)
or `dayRow` (display 19). Cards never nest more than one inset panel
(`Neutral[200]`, `Radius.md`, padding 13).

**Verdict pill** — small (`readoutPill`, `wordPill`, `bandPill`: pill,
padding 4 / 11, text Figtree 700 12 or display 12 in `Neutral[100]`, fill
`Verdict.ink[level]` or `Neutral[400]` when none) and large (Today
`verdictPill`: padding 9 / 16, display 17 `Neutral[100]`, fill
`deepInk[level]`). **Two fills for the same concept: `ink` on the small
pills, `deepInk` on the hero pill.**

**Tinted info pill** (best window, HIW winner, HIW band row): pill, padding
8–12 / 12–18, `Accent2[200]` or `Verdict.tint[level]` fill, ink `Accent2[800]`
or `Verdict.ink[level]`, optional leading icon 18.

**Circle stat** (zone / place circle): 46 circle, tint fill, display 18
number over 9.5 caps.

**Tile** (About, HIW): `Radius.md`, padding 10–11, `Accent2[200]` or
`Neutral[200]` fill, display 20 value, `capsLabel` label.

**Attribution block**: `caption` `Neutral[600]` × 1.4, `gap: 4`, last child of
every scroll pane.

---

## 7. Screen archetypes

All six screens share the frame in §4.2: `AppHeader`, then a `ScrollView`
whose content is a vertical stack with 13 px gaps, 18 px side margins, 116 px
bottom padding, ending in the attribution block. Screen title (display 24,
`Palette.text`) is the first child on every screen except Today.

### 7.1 Today (`src/app/index.tsx`) — "hero verdict + timeline"

Order: optional location card (fallback only) → verdict card → activity chips
→ best-window pill → chart card (bars, ticks, readout, link) → attribution.

- Verdict card: `Radius.lg`, padding 18, fill `Verdict.tint[level]` (or
  `Palette.surface` with no verdict), all text `deepInk[level]`. Left column:
  kicker → hero number 76 with "AQHI / of 10+" caption beside it on the
  baseline → provenance (2 lines max). Right: the large pill. Sentence
  below in Figtree 16 / 23.2.
- Pull-to-refresh via `RefreshControl` tinted `Accent.base`.
- Density: one number dominates; everything else is 12–14 px.
- Generalised: *a full-bleed status card whose colour is the state, one giant
  figure, a one-line verdict, a timeline card beneath with a tap-to-inspect
  readout.*

### 7.2 Map / Local conditions (`src/app/map.tsx`) — "plate + list"

Order: title → 340 px plate (placeholder: `Neutral[200]`, 1.5 px `Neutral[300]`
border, `Radius.lg`, centred title + note) → legend pill (caption, `Neutral[100]`
80%, pill) → card with kicker + zone rows → attribution.

- Generalised: *a fixed-height visual plate, a legend chip, a ruled list of
  circle-stat rows beneath.*

### 7.3 Forecast (`src/app/forecast.tsx`) — "accordion list"

Order: title → one card containing five day rows → attribution. One row open
at a time; the open row grows an inset detail panel (`Neutral[200]`,
`Radius.md`, padding 13, gap 7) with a small verdict pill, the window string
and a meta line.

- Row: 58 px day column · 26 px strip of eight pill blocks (gap 2, opacity
  0.9) · 66 px right-aligned temp column.
- Generalised: *a single card of ruled rows, each with a compact severity
  strip, expanding in place.*

### 7.4 Your thresholds (`src/app/thresholds.tsx`) — "settings form"

Order: title → air card (title + caption only) → weather card (three
label/value rows each followed by a `Slider` and a note) → Done → attribution
absent.

- Limit row: uppercase Figtree 700 12 label, `Accent[700]` `pillLabel` value,
  `marginTop: 18`; slider `marginTop: 6`; note `caption` `Neutral[600]`.
- Generalised: *cards of labelled sliders with the value echoed in the accent
  colour, a full-width primary Done at the bottom.*

### 7.5 About yourself (`src/app/about.tsx`) — "settings groups + summary tile card"

Order: title → card with three chip groups (sports wrap; sensitivity and time
format equal-flex), each under an uppercase group label → tappable card with a
link row and a three-up tile row → Done.

- Generalised: *chip groups for enumerated settings; a summary card that
  doubles as a link.*

### 7.6 How this works (`src/app/how-it-works.tsx`) — "explainer"

Order: title → pages card (icon badge + title + body rows) → verdict card
(three tinted band rows) → factors card (four tiles with 8 px bars at
14/27/40 px by level + winner pill) → vent card (three tiles) → sources card
(dot + name + body rows) → closing line → attribution → Done.

- Generalised: *stacked explainer cards; the live data appears only in the
  factors card so the page doubles as a legend.*

### 7.7 Overlay and error

Launch overlay (§6.8) covers the tab screens until the first fetch settles,
then fades out; the screens are mounted beneath it the whole time
(`_layout.tsx:20–46`). On fetch error the `ErrorPanel` *replaces* the
navigator (`_layout.tsx:34–36`) — "a partial screen with empty numbers looks
like conditions; this cannot be mistaken for them" (`error-panel.tsx:10–11`).

---

## 8. Navigation and chrome

- **Structure:** expo-router file routes under `src/app/`; one headless
  `Tabs` navigator (`tab-bar.tsx`) with three visible tabs — Today (`/`), Map
  (`/map`), Forecast (`/forecast`) — and three hidden routes — `/thresholds`,
  `/about`, `/how-it-works` — reached from the header buttons via
  `router.navigate` (`app-header.tsx:85,92,99`). The tab bar stays visible on
  the hidden routes with no tab selected (`tab-bar.tsx:71–76`).
- **Back:** the settings screens end in a Done button that navigates to `/`
  (`thresholds.tsx:96`, `about.tsx:136`, `how-it-works.tsx:170`). There is no
  back chevron and no swipe-back; the tab bar also works from those screens.
- **Header:** custom `AppHeader` on every screen (§6.2); no native navigation
  bar. Status bar content is `dark` (`_layout.tsx:80`).
- **Tab bar styling:** §6.3.
- **Modals:** only the custom `Sheet` (§6.4); presented over the current
  screen, dismissed by scrim tap or the close button, `onRequestClose` wired
  for Android back.
- **Typed routes** are on (`app.json:53`).
- `explore.tsx` (template) remains a routable file but is not linked from the
  bar or any button.

---

## 9. Motion and feedback

### 9.1 Animations

All on RN `Animated`; no Reanimated, no Lottie.

| Where | Trigger | Property | Duration | Easing | Native driver |
| --- | --- | --- | --- | --- | --- |
| Launch rings ×3 (`launch-overlay.tsx:62–75,161–174`) | mount, looped | scale 0.55→1.5; opacity 0.55→0 by 70% | 2600 ms, staggered 0 / 850 / 1700 | `Easing.out(ease)` | yes |
| Launch core (`:77–92,176–184`) | mount, looped | scale 1→1.07→1 | 1300 + 1300 ms | `Easing.inOut(ease)` | yes |
| Launch glyph drift (`:94–109,185–190`) | mount, looped | translateX −14→14→−14 | 1700 + 1700 ms | `Easing.inOut(ease)` | yes |
| Launch step pills ×3 (`:111–119,200–213`) | mount, once | opacity 0→1, translateY 7→0 | 500 ms, delays 100 / 450 / 800 | `Easing.out(ease)` | yes |
| Launch progress, indeterminate (`:121–128`) | mount | width 6%→62% | 2400 ms | `Easing.inOut(ease)` | **no** (width) |
| Launch progress, complete (`:138–146`) | `finished` | width →100% | 300 ms | `Easing.out(ease)` | no |
| Launch fade-out (`:147–155`) | after complete | opacity 1→0 | 400 ms | `Easing.out(ease)` | yes |
| Sheet open/close (`sheet.tsx:41–49,58`) | `visible` | scrim opacity 0↔1; panel translateY `height × 0.78`↔0 | 220 ms | `Easing.out(cubic)` | yes |

Nothing else animates. Chart bars, chip selection, tab selection, forecast
row expansion and stat chips change instantly. There is no `LayoutAnimation`.

### 9.2 Haptics

None. No `expo-haptics` import in the app (the package is not installed).

### 9.3 Loading, refresh, skeletons

- Initial load: the launch overlay, with a 600 ms minimum enforced by the
  data provider (`conditions.tsx: MIN_INITIAL_LOAD_MS`) so a fast fetch does not
  flash.
- Pull-to-refresh on Today only (`index.tsx:229–231`), spinner `Accent.base`;
  previous data stays on screen while refreshing.
- Place change: reloads behind the same refresh spinner; the new place name
  lands with its data (`conditions.tsx`, header comment).
- Search: inline `ActivityIndicator` in `Accent.base` (`sheets.tsx:120`).
- No skeletons. Absent values render "—" (`DataStrings.unavailable`).

### 9.4 Pressed states

Only the primary button (`Accent[700]`) and the error panel's retry show a
pressed state. Chips, tabs, rows, chart bars, header buttons and links have
none.

### 9.5 Reduce motion

Not consulted anywhere (no `AccessibilityInfo`). **TODO.**

---

## 10. Data visualization

### 10.1 Hour-by-hour chart (`index.tsx:73–78, 309–364, 542–562`)

Hand-built with `View`s; no chart library.

- Container 140 px tall, row, `alignItems: 'flex-end'`, gap 3, `marginTop: 13`.
- One `Pressable` column per hour 05:00–21:00 (`todayHours`), flex 1.
- Bar: pill; height `16 + quality × 1.16` px where `quality` is the model's
  6–100 score (so 23–132 px), or 16 px with no reading; fill
  `Verdict.ink[level]` or `Neutral[300]` with no reading; past hours at
  opacity 0.28.
- Selected bar: a 2.5 px `Palette.text` ring on a sibling view offset 2.5 px
  outside the bar on all sides.
- **No axes, no gridlines.** Ticks: a row under the chart, gap 3,
  `marginTop: 7`, one `Text` per hour (Figtree 700 9, tracking −0.18,
  centred), showing a label only every third hour (`hour % 3 === 2`); the
  selected hour's tick is `Palette.text`, others `Neutral[600]`.
- Readout beneath: §6.10 / §7.1.
- Empty/insufficient: bar at minimum height in track colour; pill "—";
  sentence "Not enough data for this hour".

### 10.2 Forecast strip (`forecast.tsx:75–87, 171–172`)

Eight equal-flex pill blocks, 26 px tall, gap 2, opacity 0.9;
`Verdict.ink[level]` or `Neutral[300]` per slot. No labels on the strip; the
slots are 05, 07, … 19 (`DAY_SLOTS`).

### 10.3 Factor bars (`how-it-works.tsx:39–40, 109–125, 226–241`)

Four tiles; each holds an 8 px wide pill bar of height `14 + level × 13`
(14 / 27 / 40) in `Verdict.ink[level]` on `Verdict.tint[level]`, or the
minimum height in `Neutral[500]` on `Neutral[200]` when unjudged.

### 10.4 Launch progress (`launch-overlay.tsx:217–229, 295–302`)

8 px pill track `Neutral[300]`, fill `Accent.base`, width animated (§9).

### 10.5 Slider (`§6.7`)

8 px track, 22 px thumb; the fill is the accent, not a severity colour.

### 10.6 Gauges

None. The circle stat (§6.10) is a number in a tinted disc, not a gauge.

---

## 11. Iconography and imagery

### 11.1 Icons

Custom stroked SVGs via `react-native-svg` (§6.1); not SF Symbols, not an icon
font. Stroke 2.75 (four glyphs 2.5), round caps/joins, 24-unit grid.

Sizes in use and their pairings:

| Size | Where | Beside text |
| --- | --- | --- |
| 15 | header chevron, search clear | `caption` / input |
| 17 | header pin (on a 30 badge), search glyph, About chevron | `rowLabel` 17 / `body` |
| 18 | best-window `bars` | `pillLabel` 14 |
| 19 | About tile icons, HIW page badges (34), sheet close | `capsLabel` / `cardTitle` |
| 20 | header action buttons (44 targets), places device row (46) | — |
| 21 | tab bar (default) | `tabLabel` 11 |
| 46 | launch `hazeLarge` (92 core) | — |

Icons are vertically centred with text by flex `alignItems: 'center'` on the
row; there is no baseline alignment.

### 11.2 Brand mark

`haze` / `hazeLarge`: three horizontal strokes with curled ends
(`icon.tsx:23–25`). Used only in the launch core. **The brand mark does not
appear on the app icon or splash** (see 11.3).

### 11.3 App icon and splash — TODO

All three are the create-expo-app defaults and are placeholders:

- `assets/images/icon.png` 1024 × 1024 and `assets/images/splash-icon.png`
  228 × 213 were added in the initial commit and never replaced; the splash
  shows the Expo mark on `#f5ead8` at 76 px wide (`app.json:33–37`).
- `assets/expo.icon/icon.json` (iOS Icon Composer) is the Expo symbol on a
  blue automatic gradient (`0.000, 0.478, 1.000`) with a neutral shadow.
- Android adaptive icon background is `#E6F4FE` (`app.json:16`), a blue
  outside the palette.

Only the splash *background* is on-system. **TODO: icon and splash artwork.**

### 11.4 Other imagery

None in the app's own screens. The Map plate is a labelled placeholder
(`map.tsx:157–160`).

---

## 12. Accessibility

### 12.1 Contrast

See §2.5. Passing: all primary text, all secondary (`Neutral[700]`) text,
`deepInk` on tints, `Accent[700]` everywhere, red pills. Failing AA for text
at their sizes:

1. `Neutral[600]` on any surface (3.2–3.9:1) — the app's entire metadata
   layer: captions, attribution, ticks, stat keys, kickers, unselected tabs.
2. `Neutral[100]` on `Accent[600]` / `Accent2[600]` selected chips (4.1 / 3.8).
3. `Neutral[100]` on GREEN and AMBER pills (3.8 / 2.75) and on the "—" pill
   (1.8).
4. `Verdict.ink` as text on its own tint for levels 0 and 1 (3.5 / 2.4) —
   HIW band rows and winner line, zone-circle numbers.
5. `Accent.base` as text ("Choose a place", 2.7) and as the Done button fill
   under `Palette.bg` text (3.0, large-text pass only).
6. `Neutral[500]` on `Neutral[200]` unjudged factor names (2.35).
7. Non-text: the amber bar against the page (2.5:1 < 3:1).

### 12.2 Dynamic Type

Unconstrained default scaling; no caps; fixed-height containers. See §3.4.
**TODO: untested.**

### 12.3 VoiceOver

Roles and labels found:

- `accessibilityRole="button"` on every `Pressable` that is not a tab or
  slider; tabs are `role="tab"` with `selected`; chips and place rows carry
  `accessibilityState.selected`; forecast rows carry `expanded`; retry carries
  `disabled` and `busy`.
- Labels: header place row (`HeaderStrings.changePlace`), header buttons,
  sheet close (`Common.close`), scrim (`Common.close`), chart bars
  (`TodayStrings.barLabel` — time + AQHI), readout stats (key, value, level
  word — `TodayStrings.statLabel`), About link, slider (`label`,
  `accessibilityValue`, increment/decrement actions), search input
  (`SheetStrings.searchLabel`), clear button.
- Gaps: forecast day rows have no label beyond their text; the Map zone rows
  are not marked `accessible` as a unit; the verdict card is not grouped;
  `hitSlop={8}` on the two text links but they are 13 px text with no
  minimum height.

### 12.4 Reduce motion

Not handled. The launch overlay's three loops run regardless. **TODO.**

### 12.5 Tap targets

44 px minimum is respected by chips, header buttons, the slider, search box
and the place rows; Done/Retry are 46; tab items 50. Below 44: the chart
bars (width = (screen − 36 − 16 × 3) / 17 ≈ 17–20 px, 140 px tall), the
"What's in the air" and "Choose a place" text links (13–15 px text, `hitSlop`
8 / `minHeight` 32), the sheet's clear-search button (28 + hitSlop 8), the
Forecast rows (full width, ≥ 52 tall — fine).

---

## 13. Theming contract

### 13.1 Files to change, files not to touch

**Change to re-skin:**

| File | What it carries |
| --- | --- |
| `src/constants/design-tokens.ts` | every colour, ramp, spacing, radius, shadow, font name, type step |
| `assets/fonts/*.ttf` and the `useFonts` map in `src/app/_layout.tsx:50–56` | the typefaces (names in `Font` must match the loaded keys) |
| `app.json` — `splash.backgroundColor`, `icon`, `ios.icon`, `android.adaptiveIcon.*`, `web.favicon`, `name`, `slug`, `scheme` | launch colour and artwork |
| `assets/images/icon.png`, `splash-icon.png`, `android-icon-*.png`, `favicon.png`, `assets/expo.icon/` | artwork |
| `src/components/icon.tsx` — `GLYPHS.haze`, `hazeLarge` | the brand mark; the other fifteen glyphs are generic |
| `src/constants/strings.ts` | every word; `Verdict.word` lives in the token file |

**Must not change for the re-skin** (they consume tokens; changing them is a
redesign, not a re-skin): `src/components/*.tsx` other than the two glyphs,
`src/app/*.tsx`, `src/lib/*`.

But see 13.3 — those files contain literals that will *not* follow the
tokens, so a clean re-skin is not currently possible without touching them.

### 13.2 Token checklist a new app must supply

Colour (every one used by a screen; unused entries can be any value but must
exist because the ramps are typed as complete):

- [ ] `Palette.bg`, `Palette.surface`, `Palette.text`, `Palette.divider`
- [ ] `Accent.base`, `Accent[200]`, `[300]`, `[500]`, `[600]`, `[700]`, `[800]` (+ 100, 400, 900 defined)
- [ ] `Accent2[200]`, `[300]`, `[600]`, `[800]`, `[900]` (+ base, 100, 400, 500, 700 defined)
- [ ] `Neutral[100]`–`[800]` all used; `[900]` defined
- [ ] `Verdict.ink[0..2]`, `Verdict.tint[0..2]`, `Verdict.deepInk[0..2]`, `Verdict.word[0..2]`
- [ ] shadow colour (currently `#2e2b25` × 3 inside `Shadow`)

Type and layout:

- [ ] `Font.display`, `Font.body`, `Font.bodyBold`, `Font.bodyExtrabold` (`bodySemibold` defined, unused)
- [ ] all 21 `Type` steps (17 used; `ceiling`, `loaderTitle`, `verdictHeadline`, `pageTitle`-at-32 unused)
- [ ] `Space.one`–`five` (`six` unused)
- [ ] `Radius.sm`, `md`, `lg`, `pill`
- [ ] `Shadow.sm`, `md`, `lg`
- [ ] `Card` (surface, radius, padding)

App shell:

- [ ] `app.json` splash background (must equal `Palette.bg` — it is a
      separate literal)
- [ ] icon, splash image, adaptive icon background

### 13.3 Hardcoded values outside the token layer — the blockers

Every colour, size, radius or font literal that lives in a view file rather
than `design-tokens.ts`. Grouped by kind, then file. (Circle radii that are
exactly `size / 2` are listed once, as a pattern.)

**Colours**

| File:line | Literal | Should be |
| --- | --- | --- |
| `src/components/sheet.tsx:108` | `'rgba(46,43,37,0.42)'` scrim | a `Palette.scrim` token (= `Neutral[900]` @ 42%) |
| `src/app/map.tsx:221` | `'rgba(249,244,237,0.8)'` legend pill | a token (= `Neutral[100]` @ 80%) |
| `app.json:35` | `"#f5ead8"` splash | must be kept equal to `Palette.bg` by hand |
| `app.json:16` | `"#E6F4FE"` Android icon background | off-palette; placeholder |
| `assets/expo.icon/icon.json` | blue gradient `0,0.478,1` | placeholder |

**Font sizes / line heights set inline** (display family via
`Type.pageTitle.fontFamily`):

| File:line | Literal |
| --- | --- |
| `src/app/index.tsx:497–499` | verdict sentence: `fontSize: 16, lineHeight: 16 * 1.45` |
| `src/app/index.tsx:494` | verdict pill tracking `tracking(17, 0.04)` |
| `src/app/thresholds.tsx:156–160`, `about.tsx:229–233`, `how-it-works.tsx:289`, `components/error-panel.tsx:71` | button label `fontSize: 14` (display) ×4 |
| `src/components/sheet.tsx:120` | sheet title `fontSize: 21` (display) |
| `src/components/launch-overlay.tsx:274–277` | launch title `fontSize: 27, lineHeight: 27 * 1.15` (duplicates unused `Type.loaderTitle`) |
| `src/components/sheets.tsx:370–374` | pollutant value `fontSize: 20, lineHeight: 22` |
| `src/components/sheets.tsx:394–398` | AQHI value `fontSize: 26, lineHeight: 28.6` |
| `src/app/how-it-works.tsx:219–221` | band pill `fontSize: 12` (display), tracking 0.72 |
| `src/app/how-it-works.tsx:224` | `fontWeight: '600'` on the regular family |
| `src/components/app-header.tsx:132` | place name `fontSize: 17` over `rowLabel` |
| `src/app/about.tsx:213` | tile value `lineHeight: 20` |
| `src/app/map.tsx:254`, `components/sheets.tsx:328` | circle number `lineHeight: 18` |
| `src/app/map.tsx:255`, `components/sheets.tsx:329` | circle caps `lineHeight: 10`, tracking `(9.5, 0.04)` |
| `src/app/index.tsx:562` | tick `letterSpacing: -0.18` |
| `src/components/tab-bar.tsx:113` | tab label `letterSpacing: 11 * 0.02` |
| note line-heights | `13 * 1.4` (×6 files), `13 * 1.35` (`thresholds.tsx:124`), `13 * 1.45` (`about.tsx:199`, `sheets.tsx:377`), `12 * 1.4` (attribution ×5), `12 * 1.45` (`sheets.tsx:330,395`), `15 * 1.45` (`error-panel.tsx:58`) |
| tracking overrides | `tracking(11, 0.06)` (`index.tsx:584`, `sheets.tsx:351,391`), `tracking(11, 0.04)` (`about.tsx:216`), `tracking(12, 0.08)` (`about.tsx:162,169`, `thresholds.tsx:139`), `tracking(12, 0.04)` (`index.tsx:577`, `forecast.tsx:191`, `map.tsx:259`), `tracking(12)` (`map.tsx:232`), `tracking(12, 0.06)` (`how-it-works.tsx:221`) |

**Spacing literals** (padding/margin/gap not from `Space`):

| File | Literals |
| --- | --- |
| `src/app/index.tsx` | paddingTop 6, paddingBottom 116, gap 8 (hero row), marginTop 2, paddingBottom 10, pill padding 16/9 and 11/4, gap 7 (chips), paddingHorizontal 6, gap 10 & padding 12 (window pill), gap 10 (card head), marginTop 3, gap 3 (chart, ticks), marginTop 7, gap 8, marginTop 10 ×3, rowGap 6, columnGap 10, minWidth 62, padding 8/4 (stat), marginTop 12, gap 4 |
| `src/app/map.tsx` | paddingTop 6, paddingBottom 116, padding 11/5 (legend), marginTop 8, paddingVertical 11, gap 1, marginTop 2, gap 4 |
| `src/app/forecast.tsx` | paddingTop 6, paddingBottom 116, gap 10, width 58, width 66, gap 2, marginTop 10, gap 7, gap 9, padding 11/4, gap 4 |
| `src/app/thresholds.tsx` | paddingTop 6, paddingBottom 116, marginTop 3, marginTop 6, gap 8 |
| `src/app/about.tsx` | paddingTop 6, paddingBottom 116, gap 8, marginTop 10 ×3, gap 7, marginTop 5, gap 10, paddingVertical 11, paddingHorizontal 10, gap 7 |
| `src/app/how-it-works.tsx` | paddingTop 6, paddingBottom 116, marginTop 3, gap 12, gap 8, gap 10, padding 8/12, padding 3/11, gap 6 ×2, padding 10/6, padding 9/13, padding 10, gap 12, gap 10, marginTop 6 |
| `src/components/app-header.tsx` | gap 2, paddingHorizontal 16, paddingBottom 10, gap 8 |
| `src/components/tab-bar.tsx` | gap 6, gap 3 |
| `src/components/sheet.tsx` | gap 10, paddingBottom floor 46 |
| `src/components/sheets.tsx` | gap 2, paddingVertical 12 ×2, gap 1, paddingVertical 10, marginTop 4, paddingVertical 8, gap 2, marginTop 2 |
| `src/components/launch-overlay.tsx` | gap 30, paddingHorizontal 34, gap 10 ×2, padding 11/15 |
| `src/components/error-panel.tsx` | none beyond tokens |

**Sizes and geometry literals**

| File | Literals |
| --- | --- |
| `src/app/index.tsx:74–78` | `CHART_HEIGHT 140`, `BAR_BASE 16`, `BAR_SCALE 1.16`, `RING_WIDTH 2.5` |
| `src/app/map.tsx:197` | plate height 340 |
| `src/app/forecast.tsx:171` | strip height 26 |
| `src/app/how-it-works.tsx:40` | factor bar `14 + level × 13`, width 8 |
| `src/components/slider.tsx:26–28` | track 8, thumb 22, touch 44 |
| `src/components/launch-overlay.tsx:39–40` | stack 168, core 92; ring scale 0.55→1.5; drift ±14; step rise 7 |
| `src/components/sheet.tsx:27,58,75` | duration 220, `height × 0.78` twice, close 40 |
| `src/components/tab-bar.tsx:99` | item minHeight 50 |
| circles | 46 / 34 / 30 / 28 / 9 / 7 with `borderRadius: size / 2` — `map.tsx`, `sheets.tsx`, `how-it-works.tsx`, `app-header.tsx`, `launch-overlay.tsx` |
| every `borderWidth: 1.5` | `index.tsx:508`, `about.tsx:180,190`, `map.tsx:199,242`, `forecast.tsx:163–164`, `sheets.tsx:317,384`, `tab-bar.tsx:92` — no token |
| minHeights 44 / 46 / 32 / 50 | chips, buttons, link, tab item — no token |
| icon sizes 15 / 17 / 18 / 19 / 20 / 21 / 46 | per call site (§11.1) |
| opacities 0.28, 0.45, 0.75, 0.85, 0.9 | `index.tsx:333,488,489`, `error-panel.tsx:70`, `forecast.tsx:172` |
| `Radius.lg * 1.15` | `design-tokens.ts:141` — a derived radius with no name |

**Duplicated components** (same code in several files; a re-skin must edit
each): the primary button (×4), the chip (×2 with different fills and text
sizes), the small verdict pill (×3), the screen frame block (×6), the
attribution block (×5).

### 13.4 Domain-specific parts needing conceptual replacement

Not just recolouring:

- **The three-level `Verdict` ramp and its words** (`GREEN / AMBER / RED`).
  The step count (3) is the design's; a snow app could keep three levels but
  the *thresholds* come from `src/lib/rating.ts` and `docs/decision-rules.md`,
  which are entirely about AQHI, rain, wind and heat.
- **"AQHI" as the hero unit** — the caps label beside the 76 px number, the
  "of 10+" caption, the circle-stat caps, the "Category" stat and the ECCC
  category names (`Common.aqhi`, `TodayStrings.ofTen`, `categoryFor`).
- **The four factors** (smoke / rain / heat / wind) in the readout stat grid,
  the HIW factor tiles, the driver names in pills and sentences
  (`HowItWorksStrings.driverWord`, `factorNames`).
- **The hour-by-hour chart's height source** — `quality()` is an AQHI/rain/
  temperature formula; the bar geometry (16 + score × 1.16) assumes a 6–100
  score.
- **The forecast strip's eight 2-hour slots** (`DAY_SLOTS` 05…19) and the
  "best contiguous run" day verdict.
- **The brand mark** (`haze`, `hazeLarge`) and the launch overlay's copy
  (`LaunchStrings`).
- **Attribution** — the Open-Meteo CC BY 4.0 line and the ECCC line are
  licence requirements for *these* sources, rendered on every screen.
- **The places sheet's circle** shows an AQHI; the header's headline is an
  AQHI community name.
- **Settings**: sensitivity → ECCC population, sports → strenuous, the three
  limit sliders and `RAIN_TOL`.
- All copy in `strings.ts`.

### 13.5 Constraints a new palette must respect

Derived from what the current one does, so the sibling reads as a sibling:

1. **One light theme, warm neutrals.** Every neutral shares one hue (here
   35–40°) with saturation falling from ~50% to ~10% down the ramp, and
   L* spaced ~8–12 apart: 96 · 92 · 85 · 74 · 63 · 51 · 40 · 28 · 18. Page,
   surface and inset surface must be three *distinguishable* lightnesses
   (currently L* 93.1 / 88.6 / 91.9 — note the inset panel is lighter than
   the card it sits in and darker than the page).
2. **Two accents, each a 9-step ramp plus `base`**, where `base` sits between
   500 and 600. Accent 1 is the action/caution hue; Accent 2 is the
   clear/settings hue. They must be far apart in hue (here 23° vs 81°).
3. **The verdict ramp is three steps, built from the two accents**: level 0
   = Accent2 (200 tint / 600 ink / 800 deep ink); levels 1 and 2 = Accent 1
   at (200 / 500 / 700) and (300 / 700 / 800). Keep: 0 differs by *hue*, 1→2
   differs by *lightness only* (~23 L* darker ink, ~7 L* darker tint). Keep
   `deepInk` ≥ 4.5:1 on its tint (currently 5.5–8.1). If you want the GREEN
   and AMBER small pills and the `ink`-on-`tint` text to pass AA — they do
   not today — choose inks with L* ≤ ~45.
4. **Contrast targets actually met today** (the floor a sibling should not go
   below): primary text ≥ 12:1 on every surface; secondary text
   (`Neutral[700]`) ≥ 4.9:1; `Accent[700]` ≥ 5:1 on all surfaces and on
   `Accent[200]`; pressed button ≥ 5.7:1. Targets **not** met today and worth
   fixing in the sibling: tertiary text ≥ 4.5:1 (choose a `600` at L* ≤ ~46
   instead of 51); chip/pill text on `600` fills ≥ 4.5:1.
5. **Roles that must stay distinct**: page vs card surface; card surface vs
   inset panel; `Neutral[300]` (track/empty) vs `ink[0]` (clear) — an unjudged
   bar must never look like a green one; `Neutral[400]` (no verdict pill) vs
   all three `ink`s; selected-tab fill (`Accent[200]`) vs `tint[1]` (they are
   the **same colour** today — `#ffe1d0` — which a sibling may want to
   separate); `Accent2[600]` (place markers) vs `ink[0]` (also the same colour
   today).
6. **Text on a filled control is always `Neutral[100]`**, never white, and
   text on the primary button is `Palette.bg`, never `Neutral[100]` — two
   different near-whites; keep both or unify deliberately.
7. **Shadows use `Neutral[900]`**, not black, at 14–22% opacity; cards cast
   none.
8. **Radii**: keep the 8 / 16 / 28 (/ 32.2) / pill set and the rule that
   inset panels are `md`, cards `lg`+, controls pill.
9. **Type**: one display face for every number, title and button; one text
   face in 400 / 700 / 800. Display sizes cluster at 17–27 for secondary
   readouts and one hero at 76 × 0.92.
