/**
 * The user's settings, and the one place they are persisted.
 *
 * Readings are never cached — every open re-fetches air and weather — but the
 * user's own limits are stored, so the app opens with the thresholds they set
 * last time.
 *
 * Persisted with AsyncStorage. Note for the iOS privacy manifest: AsyncStorage
 * is backed by NSUserDefaults, which needs an NSPrivacyAccessedAPICategory
 * declaration (reason CA92.1 — accessing values written by this app only).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { ManualPlace } from '@/lib/place';
import type { Activity, Prefs, Sensitivity, TimeFormat } from '@/lib/rating';

export interface Settings {
  /** Every activity the user does. Drives which chips appear on Today. */
  sports: Activity[];
  sensitivity: Sensitivity;
  /** AQHI the user will not train above. 2-9. */
  ceiling: number;
  /** Index into RAIN_TOL. 0-3. */
  rainTol: number;
  /** km/h, 8-40 in steps of 4. */
  windTol: number;
  timeFmt: TimeFormat;
  /**
   * A place the user chose instead of the device's location. Null means
   * "use my location". Wins over the device while set — see place.ts.
   */
  manualPlace: ManualPlace | null;
}

const DEFAULTS: Settings = {
  sports: ['Cycling', 'Running'],
  sensitivity: 'Normal',
  ceiling: 5,
  rainTol: 1,
  windTol: 32,
  timeFmt: '24-hour',
  manualPlace: null,
};

const STORAGE_KEY = 'hazepace.settings.v1';

interface SettingsValue {
  settings: Settings;
  /** The activity Today is currently rating. Session-only, not persisted. */
  activity: Activity;
  setActivity: (a: Activity) => void;
  update: (patch: Partial<Settings>) => void;
  /** Adds or removes a sport, refusing to empty the list. */
  toggleSport: (a: Activity) => void;
  /** Settings shaped for the rating model. */
  prefs: Prefs;
  /** False until the stored settings have been read. */
  ready: boolean;
}

const SettingsContext = createContext<SettingsValue | null>(null);

/** A stored manual place, or null if the shape is not one. */
function manualPlaceOf(raw: unknown): ManualPlace | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<ManualPlace>;
  if (typeof p.name !== 'string' || !p.name) return null;
  if (typeof p.latitude !== 'number' || !Number.isFinite(p.latitude)) return null;
  if (typeof p.longitude !== 'number' || !Number.isFinite(p.longitude)) return null;
  return {
    name: p.name,
    region: typeof p.region === 'string' ? p.region : null,
    latitude: p.latitude,
    longitude: p.longitude,
  };
}

/** Narrows stored JSON back to Settings, ignoring anything unrecognised. */
function merge(stored: unknown): Settings {
  if (!stored || typeof stored !== 'object') return DEFAULTS;
  const s = stored as Partial<Settings>;
  return {
    sports: Array.isArray(s.sports) && s.sports.length ? s.sports : DEFAULTS.sports,
    sensitivity: s.sensitivity ?? DEFAULTS.sensitivity,
    ceiling: typeof s.ceiling === 'number' ? s.ceiling : DEFAULTS.ceiling,
    rainTol: typeof s.rainTol === 'number' ? s.rainTol : DEFAULTS.rainTol,
    windTol: typeof s.windTol === 'number' ? s.windTol : DEFAULTS.windTol,
    timeFmt: s.timeFmt ?? DEFAULTS.timeFmt,
    manualPlace: manualPlaceOf(s.manualPlace),
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [activity, setActivity] = useState<Activity>(DEFAULTS.sports[0]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const next = merge(JSON.parse(raw));
        setSettings(next);
        setActivity(next.sports[0]);
      })
      .catch(() => {
        // A failed read means the defaults stand. Nothing here is worth
        // interrupting the user over.
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((cur) => {
        const next = { ...cur, ...patch };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const toggleSport = useCallback((a: Activity) => {
    setSettings((cur) => {
      const next = cur.sports.includes(a)
        ? cur.sports.filter((x) => x !== a)
        : [...cur.sports, a];
      // At least one sport must stay selected.
      if (!next.length) return cur;
      const updated = { ...cur, sports: next };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  // Deselecting the sport Today is rating moves the verdict to another.
  useEffect(() => {
    if (!settings.sports.includes(activity)) setActivity(settings.sports[0]);
  }, [settings.sports, activity]);

  const value = useMemo<SettingsValue>(
    () => ({
      settings,
      activity,
      setActivity,
      update,
      toggleSport,
      prefs: {
        activity,
        sensitivity: settings.sensitivity,
        ceiling: settings.ceiling,
        rainTol: settings.rainTol,
        windTol: settings.windTol,
      },
      ready,
    }),
    [settings, activity, update, toggleSport, ready],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside a SettingsProvider');
  return ctx;
}

export { DEFAULTS as DEFAULT_SETTINGS };
