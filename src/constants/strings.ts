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
import type { Activity, Driver, Level, Sensitivity } from '@/lib/rating';

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
  /** Also the Thresholds screen title, so the two cannot drift apart. */
  thresholds: 'Your thresholds',
  about: 'About yourself',
  howItWorks: 'How this works',
  changePlace: (place: string) => `Place: ${place}. Change place.`,
  /** The headline when the device's location is in use and no AQHI community names it. */
  deviceHeadline: 'Your location',
} as const;

/* ── Today ───────────────────────────────────────────────────────────────── */

export const TodayStrings = {
  kicker: (time: string, activity: Activity) => `Conditions at ${time} · ${activity}`,
  ofTen: 'of 10+',
  /** Under the hero number: where it came from and how old it is. */
  heroCaption: (community: string, age: string) => `${community} · ${age}`,

  /**
   * The line under the verdict, naming what is limiting the session.
   *
   * These describe conditions against the reader's own thresholds. They do not
   * make a claim about anyone's health, and must not start doing so.
   */
  sentences: {
    smoke: {
      2: "Heavy smoke. Past the level ECCC's guidance sets for strenuous activity.",
      1: 'Thin smoke. Steady work is fine; save the intervals.',
    },
    rainfall: {
      2: 'Thunderstorm over the valley — heavy rain and gusts.',
      1: 'Steady rain, but the air behind it is the cleanest today.',
    },
    heat: {
      2: 'Heat is the limit now, not the air.',
      1: 'Hot enough to cost you. Shorten it or move it later.',
    },
    wind: {
      1: 'Gusty. The air is fine; the handling is not.',
    },
  } as Partial<Record<Exclude<Driver, null>, Partial<Record<Level, string>>>>,
  clearSentence: 'Clear enough for a full session at your usual intensity.',
  fallbackSentence: 'Conditions are against you right now.',

  bestWindow: (window: string) => `Best window today · ${window}`,
  noWindow: 'nothing clean today',
  windowSpan: (from: string, to: string, hours: number) => `${from} – ${to} · ${hours} h`,

  chartTitle: 'Hour by hour',
  chartHint: 'taller is better',
  barLabel: (time: string, aqhi: number) => `${time}, AQHI ${aqhi}`,
  now: ' · now',

  statKeys: {
    aqhi: 'AQHI',
    temp: 'Temp',
    wind: 'Wind',
    rain: 'Rain',
    humidity: 'Humidity',
    category: 'Category',
  },

  airLink: "What's in the air →",
  comparisonRow: 'Same air, three verdicts',
} as const;

/* ── Map ─────────────────────────────────────────────────────────────────── */

export const MapStrings = {
  title: 'Local conditions',
  zonesKicker: 'Rating by zone',
  legend: (community: string, time: string) => `${community} · ${time}`,
  communityKicker: 'AQHI community',

  /** Shown in place of the plate. States why, rather than drawing nothing. */
  plateTitle: 'Map unavailable',
  plateNote:
    'The plume view needs a tile layer and the BlueSky Canada smoke raster. Neither is wired up yet, so nothing is drawn here.',
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

/* ── Thresholds ──────────────────────────────────────────────────────────── */

export const ThresholdsStrings = {
  title: HeaderStrings.thresholds,

  airCardTitle: 'Air quality',
  /**
   * There is no air limit to set. The air level follows ECCC's published
   * AQHI guidance for the user's sensitivity and sport (decision-rules.md
   * §3.1), so this card only holds the sensitivity.
   */
  airCardCaption:
    "Air levels follow Environment and Climate Change Canada's AQHI guidance for your sensitivity and sport. Always follow local advisories.",

  sensitivityLabel: 'Air quality sensitivity',

  weatherCardTitle: 'Weather limits',
  weatherCardCaption: 'How much rain, wind and heat you will train in.',
  rainLabel: 'Rain',
  rainSliderLabel: 'Rain tolerance',
  windLabel: 'Wind',
  windSliderLabel: 'Wind tolerance',
  windValue: (windTol: number) => (windTol >= 40 ? 'any wind' : `${windTol} km/h`),
  windNote: (windTol: number): string => {
    if (windTol <= 16) return 'a breeze turns it amber';
    if (windTol >= 36) return 'only a gale stops you';
    return 'typical tolerance';
  },
  heatLabel: 'Heat',
  heatSliderLabel: 'Heat tolerance',
  heatValue: (heatTol: number) => `${heatTol} °C`,
  heatNote: (heatTol: number): string => {
    if (heatTol <= 24) return 'a warm afternoon turns it amber';
    if (heatTol >= 36) return 'only a heatwave stops you';
    return 'typical tolerance';
  },
} as const;

/* ── About yourself ──────────────────────────────────────────────────────── */

export const AboutStrings = {
  title: HeaderStrings.about,
  sportsLabel: 'What you do',
  sensitivityLabel: 'How smoke affects you',
  advisory: 'Always follow local government advisories.',
  timeFormatLabel: 'Preferred time format',
  thresholdsLink: 'Activity thresholds',

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

  tileLabels: {
    sensitivity: 'Smoke',
    rain: 'Rain',
    wind: 'Wind',
  },
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
  closing:
    'Air data follows the Canadian AQHI. HazePace is guidance for training decisions — always follow local advisories.',
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
  airTitle: "What's in the air",
  activityTitle: 'Same air, three verdicts',

  airStatKeys: {
    pm25: 'PM2.5',
    aqhi: 'AQHI',
    rain: 'Rain',
    visibility: 'Visibility',
  },
  airStatUnits: {
    pm25: 'µg/m³, 1 h mean',
    rain: 'mm/h, washing out',
    visibility: 'km, hazy',
  },

  /**
   * The AQHI band name.
   *
   * The design called these "risk bands". That is health framing, so the band
   * is named without it — the number and its band, not a claim about what it
   * does to the reader.
   */
  aqhiBandName: (aqhi: number): string => {
    if (aqhi <= 3) return 'low band';
    if (aqhi <= 6) return 'moderate band';
    if (aqhi <= 10) return 'high band';
    return 'very high band';
  },

  airBars: [
    { k: 'PM2.5 (wildfire smoke)', v: '86% of the index', pct: 86 },
    { k: 'Ozone', v: '9%', pct: 9 },
    { k: 'NO₂ (traffic)', v: '5%', pct: 5 },
  ],
  airSource: (time: string) =>
    `FireSmoke.ca (BlueSky) plume model · Environment Canada AQHI & hourly weather · PurpleAir #4412, Vernon Bench. Updated ${time}.`,

  /**
   * Why the same air rates differently per sport.
   *
   * The design's cycling note ended "the biggest total dose". Exposure framing
   * is a health claim, so it names the time spent instead.
   */
  activityNote: {
    Running: 'Strenuous — the row ECCC writes its guidance for. Not before the inversion lifts.',
    Cycling: 'Strenuous, and for hours at a time — a long ride spends the most time in it.',
    'Hiking / Walking': 'Not strenuous. An hour on the bench is defensible.',
  } as Record<Activity, string>,
} as const;

/* ── Launch ──────────────────────────────────────────────────────────────── */

export const LaunchStrings = {
  title: 'Updating your forecast',
  steps: ['Air quality stations', 'Wildfire smoke plume', 'Hourly weather'],
} as const;

/* ── Attribution ─────────────────────────────────────────────────────────── */

/**
 * Source attribution, which the project requires to stay visible in the UI.
 * All of it is public government data plus one community sensor network.
 */
export const Attribution = {
  today:
    'Air data follows the Canadian AQHI. Sources: Environment and Climate Change Canada, FireSmoke.ca — BlueSky Canada, BC Ministry of Environment, PurpleAir, BC Wildfire Service.',
  map: 'Smoke plume model: FireSmoke.ca — BlueSky Canada. Air quality: Environment and Climate Change Canada, BC Ministry of Environment, PurpleAir. Fire perimeters: BC Wildfire Service.',
  forecast:
    'Forecasts: Environment and Climate Change Canada. Smoke plume model: FireSmoke.ca — BlueSky Canada.',
  sources: [
    {
      name: 'Environment and Climate Change Canada',
      what: 'AQHI observations and forecasts, plus hourly temperature, wind and precipitation.',
    },
    {
      name: 'FireSmoke.ca — BlueSky Canada',
      what: 'The wildfire smoke plume model behind the map and the forward scrub.',
    },
    {
      name: 'BC Ministry of Environment air monitoring',
      what: 'The reference PM2.5 stations that anchor the valley readings.',
    },
    {
      name: 'PurpleAir community sensors',
      what: 'Fills the gaps between stations so zones a few kilometres apart read separately.',
    },
    {
      name: 'BC Wildfire Service',
      what: 'Active fire perimeters and advisories shown on the map.',
    },
  ],
} as const;
