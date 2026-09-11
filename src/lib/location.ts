/**
 * Where the user is, to the kilometre.
 *
 * The one place the app touches the device's location. It asks for
 * foreground permission only — the app has no reason to know where the phone
 * is while it is closed — and requests low accuracy, because the result is
 * rounded to two decimal places (about a kilometre) before this module returns
 * it. A precise coordinate is never held, stored, logged or sent anywhere: the
 * rounding happens on the line it is received.
 *
 * Three outcomes, not two. Denied permission is a choice the user made and is
 * reported as such, so the caller can say "showing Vernon" rather than "an
 * error occurred". A fix that could not be obtained — services off, a
 * timeout, no last-known position — is the third.
 */
import * as Location from 'expo-location';

import { roundCoordinate } from '@/lib/open-meteo';

export interface Coordinate {
  /** Rounded to two decimal places. Never more precise than this. */
  latitude: number;
  longitude: number;
}

export type LocationResult =
  | { status: 'granted'; coordinate: Coordinate; source: 'current' | 'lastKnown' }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'unavailable'; reason: 'servicesOff' | 'timeout' | 'noFix' | 'error'; detail: string };

/** Longer than a cold GPS fix, shorter than a user's patience. */
const FIX_TIMEOUT_MS = 8_000;

/** Reject after a delay; used to race the platform call. */
function timeout<T>(ms: number): Promise<T> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

function round(loc: Location.LocationObject): Coordinate {
  return {
    latitude: roundCoordinate(loc.coords.latitude),
    longitude: roundCoordinate(loc.coords.longitude),
  };
}

/**
 * Reads the current permission without prompting.
 *
 * Used on refresh: if the user denied once, a refresh must not nag. If they
 * have since granted it in Settings, this picks that up.
 */
export async function currentPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    const p = await Location.getForegroundPermissionsAsync();
    if (p.granted) return 'granted';
    return p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'undetermined';
  }
}

/**
 * Obtains a rounded coordinate, prompting for permission if it has not been
 * decided yet.
 *
 * `prompt: false` never shows the system dialog — it uses whatever the user
 * already decided. The initial load prompts; a pull-to-refresh does not.
 */
export async function locate(options: { prompt: boolean }): Promise<LocationResult> {
  let permission: Location.LocationPermissionResponse;
  try {
    permission = options.prompt
      ? await Location.requestForegroundPermissionsAsync()
      : await Location.getForegroundPermissionsAsync();
  } catch (cause) {
    return {
      status: 'unavailable',
      reason: 'error',
      detail: cause instanceof Error ? cause.message : String(cause),
    };
  }

  if (!permission.granted) {
    return { status: 'denied', canAskAgain: permission.canAskAgain };
  }

  try {
    if (!(await Location.hasServicesEnabledAsync())) {
      return { status: 'unavailable', reason: 'servicesOff', detail: 'location services are off' };
    }
  } catch {
    // Not every platform answers this; treat silence as "try anyway".
  }

  // Low accuracy is all that is useful at a kilometre of rounding, and it is
  // faster and lighter on the battery than a full fix.
  try {
    const current = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
      timeout<Location.LocationObject>(FIX_TIMEOUT_MS),
    ]);
    return { status: 'granted', coordinate: round(current), source: 'current' };
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.message === 'timeout';

    // A recent fix the OS already has is better than nothing, and is still
    // rounded to the same kilometre.
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) return { status: 'granted', coordinate: round(last), source: 'lastKnown' };
    } catch {
      // fall through to the unavailable result below
    }

    return {
      status: 'unavailable',
      reason: timedOut ? 'timeout' : 'noFix',
      detail: timedOut
        ? `no fix within ${FIX_TIMEOUT_MS} ms`
        : cause instanceof Error
          ? cause.message
          : String(cause),
    };
  }
}
