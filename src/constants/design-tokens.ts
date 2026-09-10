/**
 * "Organic" design system tokens, ported from the HazePace design handoff.
 *
 * These are transcribed from the design, not derived — do not recompute or
 * round them. The design is a single warm light palette; it has no dark
 * variant, so these are flat values rather than the light/dark pairs in
 * `theme.ts`.
 */
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const Palette = {
  bg: '#f5ead8',
  surface: '#ebddc5',
  text: '#201e1d',
  divider: 'rgba(32,30,29,0.16)',
} as const;

/** Terracotta. 100 (lightest) → 900 (darkest). */
export const Accent = {
  base: '#c67139',
  100: '#fff2eb',
  200: '#ffe1d0',
  300: '#ffc6a5',
  400: '#f6a06b',
  500: '#d67f48',
  600: '#b2622d',
  700: '#8c491a',
  800: '#643312',
  900: '#402310',
} as const;

/** Sage — the second voice, not just a highlight. */
export const Accent2 = {
  base: '#7a8a5e',
  100: '#f0fae1',
  200: '#e1eecc',
  300: '#ccdbb2',
  400: '#aebf92',
  500: '#8fa073',
  600: '#728157',
  700: '#56633f',
  800: '#3d472b',
  900: '#272e1b',
} as const;

export const Neutral = {
  100: '#f9f4ed',
  200: '#eee7db',
  300: '#dcd3c4',
  400: '#c0b6a5',
  500: '#a19786',
  600: '#82796a',
  700: '#645c50',
  800: '#474238',
  900: '#2e2b25',
} as const;

/** The three-level scale used on every screen. Index is the level. */
export type Level = 0 | 1 | 2;

export const Verdict = {
  word: { 0: 'GREEN', 1: 'AMBER', 2: 'RED' },
  /** Line/figure colour. */
  ink: { 0: '#728157', 1: '#d67f48', 2: '#8c491a' },
  /** Card and pill fills. */
  tint: { 0: '#e1eecc', 1: '#ffe1d0', 2: '#ffc6a5' },
  /** Text sitting on a tint fill. */
  deepInk: { 0: '#3d472b', 1: '#8c491a', 2: '#643312' },
} as const satisfies Record<string, Record<Level, string>>;

/**
 * The design's 4.4px-based scale, rounded to integers as the handoff permits.
 * Kept separate from `Spacing` in `theme.ts`, which the Expo template screens
 * still use.
 */
export const Space = {
  one: 4,
  two: 9,
  three: 13,
  four: 18,
  five: 26,
  six: 35,
} as const;

export const Radius = {
  sm: 8,
  md: 16,
  lg: 28,
  /** Pills: the design's `border-radius: 999px`. Prefer `height / 2`. */
  pill: 999,
} as const;

/**
 * iOS shadow props. Android uses `elevation`, which is a different API and
 * cannot express colour or offset — the values below are rough matches, and
 * the design's soft warm shadows will read differently there. iOS is the
 * shipping target.
 */
export const Shadow = {
  sm: Platform.select({
    ios: { shadowColor: '#2e2b25', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.14, shadowRadius: 2 },
    default: { elevation: 1 },
  }) as ViewStyle,
  md: Platform.select({
    ios: { shadowColor: '#2e2b25', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 10 },
    default: { elevation: 4 },
  }) as ViewStyle,
  lg: Platform.select({
    ios: { shadowColor: '#2e2b25', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 32 },
    default: { elevation: 12 },
  }) as ViewStyle,
} as const;

/** Caprasimo (display) and Figtree (body). Registered by the font loader. */
export const Font = {
  display: 'Caprasimo_400Regular',
  body: 'Figtree_400Regular',
  bodySemibold: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
  bodyExtrabold: 'Figtree_800ExtraBold',
} as const;

/**
 * RN `letterSpacing` is in px, not em. The design specifies `.1em` on kickers
 * and small caps labels, so it has to be resolved against each font size.
 */
export const tracking = (fontSize: number, em = 0.1): number => fontSize * em;

/**
 * The `.card` surface.
 *
 * Taken from the design system's own stylesheet, not the handoff README — the
 * README describes this as neutral-100 with radius 28 and shadow-sm, but
 * `.card` in styles.css is `--color-surface` with no shadow, and the sheet's
 * rounded-frame rule overrides the radius to `--radius-lg * 1.15`. The
 * screenshots agree with the stylesheet: cards read darker than the page and
 * sit flat on it.
 */
export const Card = {
  backgroundColor: Palette.surface,
  borderRadius: Radius.lg * 1.15,
  padding: Space.four,
} satisfies ViewStyle;

/** The design's type ramp, in the sizes it actually uses. */
export const Type = {
  heroNumber: { fontFamily: Font.display, fontSize: 76, lineHeight: 76 * 0.92 },
  ceiling: { fontFamily: Font.display, fontSize: 44 },
  pageTitle: { fontFamily: Font.display, fontSize: 32 },
  loaderTitle: { fontFamily: Font.display, fontSize: 27, lineHeight: 27 * 1.15 },
  verdictHeadline: { fontFamily: Font.display, fontSize: 30 },
  sectionTitle: { fontFamily: Font.display, fontSize: 24 },
  tile: { fontFamily: Font.display, fontSize: 20 },
  dayRow: { fontFamily: Font.display, fontSize: 19 },
  hourLabel: { fontFamily: Font.display, fontSize: 17 },
  zoneNumber: { fontFamily: Font.display, fontSize: 18 },
  body: { fontFamily: Font.body, fontSize: 15 },
  bodySmall: { fontFamily: Font.body, fontSize: 13 },
  cardTitle: { fontFamily: Font.bodyBold, fontSize: 16 },
  rowLabel: { fontFamily: Font.bodyBold, fontSize: 15 },
  pillLabel: { fontFamily: Font.bodyBold, fontSize: 14 },
  kicker: {
    fontFamily: Font.bodyExtrabold,
    fontSize: 14,
    letterSpacing: tracking(14),
    textTransform: 'uppercase',
  },
  capsLabel: {
    fontFamily: Font.bodyExtrabold,
    fontSize: 11,
    letterSpacing: tracking(11),
    textTransform: 'uppercase',
  },
  tabLabel: { fontFamily: Font.bodyBold, fontSize: 11 },
  caption: { fontFamily: Font.body, fontSize: 12 },
  zoneCaps: { fontFamily: Font.bodyExtrabold, fontSize: 9.5, letterSpacing: tracking(9.5) },
  tick: { fontFamily: Font.bodyBold, fontSize: 9 },
} as const satisfies Record<string, TextStyle>;
