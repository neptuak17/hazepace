/**
 * The one place the app fetches from.
 *
 * Screens call `useConditions()` and never touch the services directly, so
 * there is exactly one request in flight per source, one loading state, and
 * one place to put a manual refresh. A context rather than a per-screen hook
 * because Today, Map and Forecast all show the same snapshot — three fetches
 * of the same data would triple the load on two APIs that ask not to be
 * polled hard.
 *
 * Three states, kept distinct on purpose:
 *   loading — nothing to show yet; the launch overlay covers this
 *   ready   — both snapshots present, or weather present and AQHI reporting
 *             no coverage (which is an answer, not a failure)
 *   error   — something failed; the screens do not render partial data
 *
 * The place is resolved here too (see place.ts for the precedence). A change
 * of place — the user picking one in the sheet, or going back to the device —
 * reloads with the previous data left on screen behind the refresh spinner,
 * and the new place name lands in the same render as its data, so the header
 * never names one place above another place's numbers.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  MAX_COMMUNITY_DISTANCE_KM,
  clearAqhiCache,
  fetchAqhi,
  type AqhiSnapshot,
} from '@/lib/aqhi';
import { COORDINATE_OVERRIDE, MAP_COMMUNITY_DISTANCE_KM, joinLive, type LiveHour } from '@/lib/live';
import { locate } from '@/lib/location';
import {
  clearConditionsCache,
  fetchConditions,
  type ConditionsSnapshot,
} from '@/lib/open-meteo';
import { needsDeviceLocation, resolvePlace, type PlaceResolution } from '@/lib/place';
import { useSettings } from '@/lib/settings';

export type ConditionsStatus = 'loading' | 'ready' | 'error';

export interface ConditionsFailure {
  /** Which source failed. "both" when neither answered. */
  source: 'weather' | 'aqhi' | 'both';
  /** For logs and for the retry panel. Not copy-edited. */
  detail: string;
}

export type { PlaceResolution } from '@/lib/place';

export interface ConditionsValue {
  status: ConditionsStatus;
  /** Null until the first load has resolved where to look. */
  place: PlaceResolution | null;
  weather: ConditionsSnapshot | null;
  aqhi: AqhiSnapshot | null;
  /**
   * Null while loading or on error. 'none' means ECCC has no community within
   * the model's range — the weather still loaded and the screens still
   * render, with the AQHI coming from the estimate.
   */
  aqhiCoverage: 'ok' | 'none' | null;
  /**
   * A community beyond the model's range but within the Map's (see
   * MAP_COMMUNITY_DISTANCE_KM), with its readings. Context only: nothing
   * that feeds a verdict reads this. Null whenever `aqhi` is set.
   */
  aqhiFar: AqhiSnapshot | null;
  failure: ConditionsFailure | null;
  /** The two snapshots joined by instant. Empty until ready. */
  live: LiveHour[];
  /** When the current snapshots were fetched. */
  fetchedAt: number | null;
  /** True during a manual refresh; the previous data stays on screen. */
  refreshing: boolean;
  /**
   * The current time, as React state.
   *
   * Screens must use this rather than call Date.now() in render. The React
   * Compiler treats render as pure, so a Date.now() with no reactive inputs
   * is computed once per mount and cached — which froze every "observed N
   * min ago" and the header clock at whatever the first render saw. State
   * is something the compiler knows can change. Ticks every 30 s and resets
   * after each fetch.
   */
  now: number;
  /** Drops both caches and fetches again. */
  refresh: () => Promise<void>;
}

const ConditionsContext = createContext<ConditionsValue | null>(null);

/**
 * Below this, a refresh completes before the overlay has finished fading in
 * and the screen appears to flash. Applies to the initial load only.
 */
const MIN_INITIAL_LOAD_MS = 600;

export function ConditionsProvider({ children }: { children: ReactNode }) {
  const { settings, ready: settingsReady } = useSettings();
  const manualPlace = settings.manualPlace;

  const [status, setStatus] = useState<ConditionsStatus>('loading');
  const [weather, setWeather] = useState<ConditionsSnapshot | null>(null);
  const [aqhi, setAqhi] = useState<AqhiSnapshot | null>(null);
  const [aqhiCoverage, setAqhiCoverage] = useState<'ok' | 'none' | null>(null);
  const [aqhiFar, setAqhiFar] = useState<AqhiSnapshot | null>(null);
  const [failure, setFailure] = useState<ConditionsFailure | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [place, setPlace] = useState<PlaceResolution | null>(null);

  // A later request must not be overwritten by an earlier one that finished
  // late, so each load carries a sequence number and only the newest lands.
  const sequence = useRef(0);
  const started = useRef(false);

  /**
   * `prompt` — whether the system permission dialog may be shown. True on
   * the initial load and when the user switches back to the device, both of
   * which are the user's own doing; false on a pull-to-refresh, so a denial
   * is never nagged. Moot when a manual place is set: the device is not
   * asked at all.
   */
  const load = useCallback(
    async (options: { initial: boolean; prompt: boolean }) => {
      const seq = ++sequence.current;
      const startedAt = Date.now();

      const inputs = { override: COORDINATE_OVERRIDE, manual: manualPlace };
      const location = needsDeviceLocation(inputs)
        ? await locate({ prompt: options.prompt })
        : null;
      if (seq !== sequence.current) return;
      const resolved = resolvePlace({ ...inputs, location });

      const { latitude, longitude } = resolved.coordinate;
      // AQHI is fetched at the Map's wider range in one go; the split by
      // distance happens below so the model only ever sees the near one.
      const [w, a] = await Promise.all([
        fetchConditions(latitude, longitude),
        fetchAqhi(latitude, longitude, { maxDistanceKm: MAP_COMMUNITY_DISTANCE_KM }),
      ]);

      if (options.initial) {
        const remaining = MIN_INITIAL_LOAD_MS - (Date.now() - startedAt);
        if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
      }
      if (seq !== sequence.current) return;

      // The place lands with its data, never ahead of it.
      setPlace(resolved);

      const weatherFailed = !w.ok;
      const aqhiFailed = a.status === 'error';

      if (weatherFailed || aqhiFailed) {
        const details: string[] = [];
        if (!w.ok) details.push(`weather: ${w.error.message}`);
        if (a.status === 'error') details.push(`AQHI: ${a.error.message}`);
        setFailure({
          source: weatherFailed && aqhiFailed ? 'both' : weatherFailed ? 'weather' : 'aqhi',
          detail: details.join(' · '),
        });
        // On a failed refresh the previous snapshots are dropped too: a screen
        // must not keep showing numbers the user just asked to replace.
        setWeather(null);
        setAqhi(null);
        setAqhiCoverage(null);
        setAqhiFar(null);
        setStatus('error');
        return;
      }

      setWeather(w.value);
      if (a.status === 'ok' && a.value.distanceKm <= MAX_COMMUNITY_DISTANCE_KM) {
        setAqhi(a.value);
        setAqhiCoverage('ok');
        setAqhiFar(null);
      } else {
        setAqhi(null);
        setAqhiCoverage('none');
        setAqhiFar(a.status === 'ok' ? a.value : null);
      }
      setFailure(null);
      const done = Date.now();
      setFetchedAt(done);
      setNow(done);
      setStatus('ready');
    },
    [manualPlace],
  );

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, []);

  // The first load waits for the stored settings, so a saved manual place is
  // honoured from the start rather than loading the device first and then
  // the place. Every later run of this effect is a change of place: `load`
  // is rebuilt whenever the manual place changes.
  useEffect(() => {
    if (!settingsReady) return;
    if (!started.current) {
      started.current = true;
      load({ initial: true, prompt: true });
      return;
    }
    setRefreshing(true);
    load({ initial: false, prompt: true }).finally(() => setRefreshing(false));
  }, [settingsReady, load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    clearConditionsCache();
    clearAqhiCache();
    try {
      await load({ initial: false, prompt: false });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const live = useMemo(() => joinLive(weather, aqhi), [weather, aqhi]);

  const value = useMemo<ConditionsValue>(
    () => ({
      status,
      place,
      weather,
      aqhi,
      aqhiCoverage,
      aqhiFar,
      failure,
      live,
      fetchedAt,
      refreshing,
      now,
      refresh,
    }),
    [status, place, weather, aqhi, aqhiCoverage, aqhiFar, failure, live, fetchedAt, refreshing, now, refresh],
  );

  return <ConditionsContext.Provider value={value}>{children}</ConditionsContext.Provider>;
}

export function useConditions(): ConditionsValue {
  const ctx = useContext(ConditionsContext);
  if (!ctx) throw new Error('useConditions must be used inside a ConditionsProvider');
  return ctx;
}
