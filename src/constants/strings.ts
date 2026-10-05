/**
 * Every user-facing string in the app.
 *
 * Centralised so that copy can be reviewed in one pass. That matters here more
 * than in most apps: this project must never make a health or safety claim,
 * and keeping the words in one file turns that audit into reading a single
 * module rather than grepping nine.
 *
 * Rules for anything added here:
 *   - No health or safety claim. Not "safe", "healthy", "risk", "unhealthy",
 *     "harmful", or symptoms. Describe conditions, thresholds and timing, and
 *     let the reader decide.
 *   - Say what a setting *is*, not what the reader should do about it.
 *   - Naming an external authority ("follow local government advisories") is
 *     fine. Speaking as one is not.
 *
 * Strings that interpolate live values are functions, so the sentence stays
 * here in one piece rather than being assembled at the call site.
 */
import { categoryFor, isAboveTen, publishedValue } from '@/lib/aqhi';
import {
  RAIN_TOL,
  type Activity,
  type Driver,
  type Judgement,
  type Level,
  type Prefs,
  type Reading,
  type Sensitivity,
} from '@/lib/rating';
import type { AppearanceChoice } from '@/lib/settings';

/* ── Shared ──────────────────────────────────────────────────────────────── */

export const Common = {
  done: 'Done',
  close: 'Close',
  aqhi: 'AQHI',
} as const;

/* ── Live data ───────────────────────────────────────────────────────────── */

/**
 * Anything the reader sees about where a number came from, how old it is,
 * and what to do when it did not arrive. Nothing here interprets a value.
 */
export const DataStrings = {
  /** The universal absent-value marker. Never a zero, never a blank. */
  unavailable: '—',

  communityLine: (name: string, km: number) =>
    `${name} · ${km < 1 ? '<1' : Math.round(km)} km`,
  /** The far-away form, for the reading's headline rather than its footnote. */
  communityFar: (name: string, km: number) => `${name}, ${Math.round(km)} km away`,
  /** The distance on its own, for a line beneath the community's name. */
  distance: (km: number) => `${km < 1 ? '<1' : Math.round(km)} km`,
  distanceFar: (km: number) => `${Math.round(km)} km away`,
  /** In the distance's place for the model, which is for the coordinate itself. */
  thisLocation: 'this location',
  observedAge: (age: string) => `observed ${age}`,
  /** Both the clock time and the age: "observed 06:00 · 37 min ago". */
  observedAt: (clock: string, age: string) => `observed ${clock} · ${age}`,
  forecastFor: (time: string) => `forecast for ${time}`,

  /**
   * The source named wherever an AQHI came from Open-Meteo's air quality
   * model rather than from ECCC. It takes the place a community name has
   * for an ECCC reading, so every AQHI on screen says where it is from.
   */
  modelSource: 'Open-Meteo air quality model',
  /** Appended to a day's AQHI span when either end came from the model. */
  estimateMark: 'est.',
  fetchedAge: (age: string) => `updated ${age}`,

  /** The header's meta line when the app is not using the device's location. */
  fixedPlace: (name: string) => `${name} · fixed location`,
  chosenPlace: (name: string) => `${name} · chosen place`,
  overridePlace: (label: string) => `${label} · test coordinate`,

  /** A card on Today explaining why the fixed place is showing. */
  fallbackTitle: (name: string) => `Showing ${name}`,
  fallbackDenied:
    'Location access is off for this app. Choose a place instead, or allow location in Settings to see conditions where you are.',
  fallbackUnavailable: 'Your location could not be determined right now. You can choose a place instead.',
  /** The action on that card; opens the places sheet. */
  choosePlace: 'Choose a place',

  errorTitle: 'Conditions could not be loaded',
  errorSource: {
    weather: 'The weather service did not respond.',
    aqhi: 'The AQHI service did not respond.',
    both: 'Neither the weather nor the AQHI service responded.',
  } as Record<'weather' | 'aqhi' | 'both', string>,
  errorNote: 'Nothing is shown rather than something out of date.',
  retry: 'Try again',
  retrying: 'Trying…',

  hourIncomplete: 'Not enough data for this hour',
} as const;

/* ── Tab bar ────────────────────────────────────────────────────────────── */

export const TabStrings = {
  today: 'Today',
  map: 'Map',
  forecast: 'Forecast',
} as const;

/* ── Header ──────────────────────────────────────────────────────────────── */

export const HeaderStrings = {
  about: 'About yourself',
  howItWorks: 'How this works',
  changePlace: (place: string) => `Place: ${place}. Change place.`,
  /** The headline when the device's location is in use and no AQHI community names it. */
  deviceHeadline: 'Your location',
} as const;

/* ── Today ───────────────────────────────────────────────────────────────── */

/** How a rain limit reads in a sentence, by RAIN_TOL index. */
const RAIN_LIMIT_NAMES: Record<number, string> = Object.fromEntries(
  RAIN_TOL.map((t, i) => [
    i,
    { None: 'dry-only', Light: 'light-rain', Moderate: 'moderate-rain', Heavy: 'heavy-rain' }[t.name],
  ]),
);

export const TodayStrings = {
  kicker: (time: string, activity: Activity) => `Conditions at ${time} · ${activity}`,
  ofTen: 'of 10+',
  /** Under the hero number: where it came from and how old it is. */
  heroCaption: (community: string, age: string) => `${community} · ${age}`,

  /**
   * The line under the verdict: the factor setting it, its reading, and the
   * reader's own limit. Built only from those values (decision-rules.md §6),
   * so it can never describe weather the data does not show, and it states
   * a reading and a limit rather than telling anyone what to do.
   */
  verdictSentence: (j: Judgement, r: Reading, prefs: Prefs): string => {
    if (j.level === 0 || j.driver === null) return 'All four within your limits.';
    const where = j.level === 2 ? 'past' : 'near';
    switch (j.driver) {
      case 'smoke': {
        const shown = isAboveTen(r.aqhi) ? '10+' : String(publishedValue(r.aqhi));
        return `AQHI ${shown}, ${categoryFor(r.aqhi)} — rated under ECCC's guidance for your sensitivity and sport.`;
      }
      case 'rainfall':
        return `Rain ${r.rainMmH.toFixed(1)} mm/h, ${where} your ${RAIN_LIMIT_NAMES[prefs.rainTol]} limit.`;
      case 'heat':
        return `Heat ${Math.round(r.tempC)} °C, ${where} your ${prefs.heatTol} °C limit.`;
      case 'wind':
        return `Wind ${Math.round(r.windKmh)} km/h, ${where} your ${prefs.windTol} km/h limit.`;
    }
  },

  bestWindow: (window: string) => `Best window today · ${window}`,
  noWindow: 'nothing clean today',
  windowSpan: (from: string, to: string, hours: number) => `${from} – ${to} · ${hours} h`,

  chartTitle: 'Hour by hour',
  barLabel: (time: string, aqhi: number) => `${time}, AQHI ${aqhi}`,
  now: ' · now',
  /** The verdict pill in the readout names the driver: "AMBER · wind". */
  pillWithDriver: (word: string, driver: string) => `${word} · ${driver}`,
  /** Spoken form of a stat, with its factor's level when it has one. */
  statLabel: (key: string, value: string, level: string | null) =>
    level ? `${key}, ${value}, ${level}` : `${key}, ${value}`,

  statKeys: {
    aqhi: 'AQHI',
    temp: 'Temp',
    wind: 'Wind',
    rain: 'Rain',
    humidity: 'Humidity',
    category: 'Category',
  },

  airLink: "What's in the air →",
} as const;

/* ── Map ─────────────────────────────────────────────────────────────────── */

export const MapStrings = {
  title: 'Local conditions',
  zonesKicker: 'Rating by zone',
  legend: (community: string, time: string) => `${community} · ${time}`,
  communityKicker: 'AQHI community',

  /** A pin's callout when its community has no current observation. */
  pinNoReading: 'No current reading',
  /** A group pin, for VoiceOver: how many, the highest reading, what a tap does. */
  groupLabel: (count: number, value: string) =>
    value === '—'
      ? `${count} AQHI communities, no current readings. Zoom in.`
      : `${count} AQHI communities, highest AQHI ${value}. Zoom in.`,
  /** Over the plate when the area request failed; the list still loads. */
  areaUnavailable: 'Community readings unavailable',
  mapLabel: (place: string, communities: number) =>
    communities === 1
      ? `Map around ${place} with 1 AQHI community`
      : `Map around ${place} with ${communities} AQHI communities`,
} as const;

/* ── Forecast ────────────────────────────────────────────────────────────── */

export const ForecastStrings = {
  title: 'Next five days',
  noWindow: 'No usable window',
  temp: (hi: number, lo: number) => `${hi}° / ${lo}°`,
  rainTotal: (mm: number) => `${mm} mm`,
  /**
   * The rain clause is dropped entirely on a dry day rather than reading
   * "0 mm", and never states timing.
   */
  meta: (
    from: number,
    to: number,
    rainMm: number | null,
    dir: string | null,
    windKmh: number | null,
    estimated = false,
  ) => {
    const aqhi = `AQHI ${from} → ${to}${estimated ? ` ${DataStrings.estimateMark}` : ''}`;
    const rain = rainMm === null ? '' : ` · rain ${rainMm} mm`;
    const wind =
      windKmh === null ? ' · wind —' : ` · wind ${dir ? dir + ' ' : ''}${windKmh} km/h`;
    return `${aqhi}${rain}${wind}`;
  },
} as const;

/* ── Thresholds (the limits card on About yourself) ───────────────────────── */

/**
 * There is no air limit to set: the air level follows ECCC's published AQHI
 * guidance for the user's sensitivity and sport (decision-rules.md §3.1),
 * both chosen in the card above this one. Only the weather has limits.
 */
export const ThresholdsStrings = {
  title: 'Activity thresholds',
  /** The one place the amber band is explained; the margins are not shown. */
  caption:
    'Your limits for rain, wind and heat. Conditions near a limit read amber; past it, red.',
  rainLabel: 'Rain',
  rainSliderLabel: 'Rain limit',
  windLabel: 'Wind',
  windSliderLabel: 'Wind limit',
  windValue: (windTol: number) => (windTol >= 40 ? 'no limit' : `${windTol} km/h`),
  windNote: (windTol: number): string => {
    if (windTol >= 40) return 'wind never sets the verdict';
    if (windTol <= 16) return 'a breeze reads amber';
    if (windTol >= 36) return 'only a gale reads red';
    return 'typical limit';
  },
  heatLabel: 'Heat',
  heatSliderLabel: 'Heat limit',
  heatValue: (heatTol: number) => `${heatTol} °C`,
  heatNote: (heatTol: number): string => {
    if (heatTol <= 24) return 'a warm afternoon reads amber';
    if (heatTol >= 36) return 'only a heatwave reads red';
    return 'typical limit';
  },
} as const;

/* ── About yourself ──────────────────────────────────────────────────────── */

export const AboutStrings = {
  title: HeaderStrings.about,
  sportsLabel: 'What you do',
  sensitivityLabel: 'How smoke affects you',
  advisory: 'Always follow local government advisories.',
  timeFormatLabel: 'Preferred time format',
  appearanceLabel: 'Appearance',
  appearanceNames: {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
  } as Record<AppearanceChoice, string>,

  /**
   * What each sensitivity means, as a description of the setting.
   *
   * The design's Reactive note listed symptoms, which is medical framing. This
   * says what the setting does to the thresholds instead.
   */
  sensitivityNote: {
    Normal: "Air levels follow ECCC's guidance for the general population.",
    Reactive: "Air levels follow ECCC's guidance for people more affected by smoke.",
  } as Record<Sensitivity, string>,
} as const;

/* ── How this works ──────────────────────────────────────────────────────── */

export const HowItWorksStrings = {
  title: HeaderStrings.howItWorks,

  pages: [
    {
      name: 'Today',
      what: 'Can I go out right now? Current conditions plus a per hour view of the day so you can plan your activity in the best window.',
    },
    {
      name: 'Map',
      what: 'Where the smoke in your area is right now so you can plan where to ride today.',
    },
    {
      name: 'Forecast',
      what: 'The next five days, so you can plan when conditions are suitable for your outdoor activity.',
    },
  ],

  verdictTitle: 'The verdict',
  bands: {
    0: 'Train as planned.',
    1: 'Go easy, or go shorter.',
    2: 'Take it indoors.',
  } as Record<Level, string>,

  factorsTitle: 'Worst factor wins',
  factorsCaption:
    'Four factors are checked with the worst factor setting the verdict (based on your preferences.)',
  factorNames: {
    smoke: 'Smoke',
    rain: 'Rain',
    heat: 'Heat',
    wind: 'Wind',
  },
  driverWord: {
    smoke: 'smoke',
    rainfall: 'rain',
    heat: 'heat',
    wind: 'wind',
  } as Record<Exclude<Driver, null>, string>,
  winner: (driver: string) => `Right now, the ${driver} is setting the verdict`,
  noWinner: 'Right now, nothing is holding you back',

  ventTitle: 'Why your verdict differs',
  /**
   * The air level is ECCC's guidance, which turns on whether an activity is
   * strenuous and on which population the reader is in; the tiles show the
   * classification the app applies. Rain, heat and wind are the reader's own
   * limits.
   */
  ventCaption:
    "ECCC's AQHI guidance distinguishes strenuous activity from the rest, and people more affected by smoke from the general population. Your sport and sensitivity pick the row. Rain, wind and heat are measured against your own limits — set them in Thresholds.",
  ventTiles: [
    { name: 'Walking', mult: 'not strenuous' },
    { name: 'Cycling', mult: 'strenuous' },
    { name: 'Running', mult: 'strenuous' },
  ],

  sourcesTitle: 'Where the data comes from',
  privacyLink: 'Privacy policy',
  closing:
    'Air data follows the Canadian AQHI. Hazepace is guidance for training decisions — always follow local advisories.',
} as const;

/* ── Sheets ──────────────────────────────────────────────────────────────── */

export const SheetStrings = {
  placesTitle: 'Where to look',
  /** The first row of the places sheet: back to the device's own position. */
  useMyLocation: 'Use my location',
  useMyLocationNote: 'Conditions where the phone is',
  /** Accessibility hint on the row that is currently in use. */
  placeInUse: 'in use',
  searchPlaceholder: 'Search for a town or city',
  searchLabel: 'Place search',
  clearSearch: 'Clear search',
  searching: 'Searching…',
  searchEmpty: (query: string) => `No places found for “${query}”`,
  searchError: 'Place search did not respond. Check your connection and try again.',
  /** The air sheet follows the hour selected in the hour-by-hour chart. */
  airTitle: (time: string) => `What's in the air · ${time}`,
  airAqhiKey: 'AQHI',
  airPollutantsLabel: 'Pollutants',
  airPollutantKeys: {
    pm25: 'PM2.5',
    pm10: 'PM10',
    ozone: 'Ozone',
    no2: 'NO₂',
  },
  airPollutantUnit: 'µg/m³',
  /** Why those three pollutants are listed together. A statement of method. */
  airFormulaNote: "ECCC's AQHI is calculated from three-hour means of NO₂, ozone and PM2.5.",
  /** Heading over ECCC's own notes, shown verbatim when they publish any. */
  airNotesLabel: 'Notes from Environment and Climate Change Canada',
  airOtherLabel: 'Also this hour',
  airOtherKeys: {
    feelsLike: 'Feels like',
    gusts: 'Wind gusts',
    rainChance: 'Chance of rain',
    uv: 'UV index',
  },
  airSourcesLabel: 'Sources',
} as const;

/* ── Launch ──────────────────────────────────────────────────────────────── */

export const LaunchStrings = {
  title: 'Updating your forecast',
  steps: ['Air quality stations', 'Wildfire smoke plume', 'Hourly weather'],
} as const;

/* ── Attribution ─────────────────────────────────────────────────────────── */

/**
 * Source attribution, which the project requires to stay visible in the UI.
 *
 * The licence lines themselves — OPEN_METEO_ATTRIBUTION (CC BY 4.0) and
 * ECCC_ATTRIBUTION — live beside the code that fetches from each source and
 * are rendered on every data screen. What is here is the prose around them.
 * Two sources only; nothing else feeds the app.
 */
export const Attribution = {
  sources: [
    {
      name: 'Environment and Climate Change Canada',
      what: 'AQHI observations and hourly AQHI forecasts for the nearest reporting community, and the AQHI formula and guidance the app applies.',
    },
    {
      name: 'Open-Meteo — weather',
      what: 'Hourly temperature, wind, gusts, precipitation, humidity and UV for the exact coordinate.',
    },
    {
      name: 'Open-Meteo — air quality',
      what: 'Hourly PM2.5, PM10, ozone and NO₂ from the Copernicus CAMS model, and the AQHI estimated from them where ECCC has no reading.',
    },
    {
      name: 'Open-Meteo — place search',
      what: 'Turns a typed town or city into a coordinate when you choose a place.',
    },
  ],
} as const;
