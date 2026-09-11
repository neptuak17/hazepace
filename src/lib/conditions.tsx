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

import { clearAqhiCache, fetchAqhi, type AqhiSnapshot } from '@/lib/aqhi';
import { VERNON, joinLive, type LiveHour } from '@/lib/live';
import {
  clearConditionsCache,
  fetchConditions,
  type ConditionsSnapshot,
} from '@/lib/open-meteo';

export type ConditionsStatus = 'loading' | 'ready' | 'error';

export interface ConditionsFailure {
  /** Which source failed. "both" when neither answered. */
  source: 'weather' | 'aqhi' | 'both';
  /** For logs and for the retry panel. Not copy-edited. */
  detail: string;
}

export interface ConditionsValue {
  status: ConditionsStatus;
  weather: ConditionsSnapshot | null;
  aqhi: AqhiSnapshot | null;
  /**
   * Null while loading or on error. 'none' means ECCC has no community within
   * range — the weather still loaded and the screens still render, with every
   * AQHI field unavailable.
   */
  aqhiCoverage: 'ok' | 'none' | null;
  /** How far the nearest community is when coverage is 'none'. */
  aqhiNearest: { name: string | null; km: number | null } | null;
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
  const [status, setStatus] = useState<ConditionsStatus>('loading');
  const [weather, setWeather] = useState<ConditionsSnapshot | null>(null);
  const [aqhi, setAqhi] = useState<AqhiSnapshot | null>(null);
  const [aqhiCoverage, setAqhiCoverage] = useState<'ok' | 'none' | null>(null);
  const [aqhiNearest, setAqhiNearest] = useState<ConditionsValue['aqhiNearest']>(null);
  const [failure, setFailure] = useState<ConditionsFailure | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // A later request must not be overwritten by an earlier one that finished
  // late, so each load carries a sequence number and only the newest lands.
  const sequence = useRef(0);

  const load = useCallback(async (initial: boolean) => {
    const seq = ++sequence.current;
    const started = Date.now();

    const [w, a] = await Promise.all([
      fetchConditions(VERNON.latitude, VERNON.longitude),
      fetchAqhi(VERNON.latitude, VERNON.longitude),
    ]);

    if (initial) {
      const remaining = MIN_INITIAL_LOAD_MS - (Date.now() - started);
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
    }
    if (seq !== sequence.current) return;

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
      setAqhiNearest(null);
      setStatus('error');
      return;
    }

    setWeather(w.value);
    if (a.status === 'ok') {
      setAqhi(a.value);
      setAqhiCoverage('ok');
      setAqhiNearest(null);
    } else {
      setAqhi(null);
      setAqhiCoverage('none');
      setAqhiNearest({ name: a.nearestName, km: a.nearestKm });
    }
    setFailure(null);
    const done = Date.now();
    setFetchedAt(done);
    setNow(done);
    setStatus('ready');
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    clearConditionsCache();
    clearAqhiCache();
    try {
      await load(false);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const live = useMemo(() => joinLive(weather, aqhi), [weather, aqhi]);

  const value = useMemo<ConditionsValue>(
    () => ({
      status,
      weather,
      aqhi,
      aqhiCoverage,
      aqhiNearest,
      failure,
      live,
      fetchedAt,
      refreshing,
      now,
      refresh,
    }),
    [status, weather, aqhi, aqhiCoverage, aqhiNearest, failure, live, fetchedAt, refreshing, now, refresh],
  );

  return <ConditionsContext.Provider value={value}>{children}</ConditionsContext.Provider>;
}

export function useConditions(): ConditionsValue {
  const ctx = useContext(ConditionsContext);
  if (!ctx) throw new Error('useConditions must be used inside a ConditionsProvider');
  return ctx;
}
