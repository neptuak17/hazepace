/**
 * Which coordinate the app looks at, and why.
 *
 * Four candidates, in a fixed order of precedence:
 *
 *   override — EXPO_PUBLIC_LAT/LON, for exercising the no-coverage and error
 *              paths without touching code; wins over everything
 *   manual   — a place the user chose in the places sheet; wins over the
 *              device while it is set, so the app never switches places on
 *              its own. "Use my location" clears it.
 *   device   — the phone's own position, rounded to a kilometre
 *   fallback — the fixed place, when location was denied or unavailable
 *
 * This module is pure so the precedence is unit-testable under Node. The
 * caller does the one impure step — asking the device — and only when it
 * is needed: with an override or a manual place set, the device is never
 * asked and the permission dialog is never shown.
 */
import { FALLBACK_PLACE } from './live.ts';
import type { Coordinate, LocationResult } from './location.ts';
import { roundCoordinate } from './open-meteo.ts';

/** A place the user chose. Persisted in settings. */
export interface ManualPlace {
  name: string;
  /** "British Columbia, Canada" — for the row's second line. Null if unknown. */
  region: string | null;
  latitude: number;
  longitude: number;
}

export type PlaceSource = 'device' | 'manual' | 'fallback' | 'override';

/** The coordinate the current snapshots describe, and how it was chosen. */
export interface PlaceResolution {
  coordinate: Coordinate;
  source: PlaceSource;
  /** Name to show for anything that is not the device; null for the device. */
  label: string | null;
  /** Why the fallback was used. Null for every other source. */
  fallbackReason: 'denied' | 'unavailable' | null;
}

export interface PlaceInputs {
  override: { latitude: number; longitude: number } | null;
  manual: ManualPlace | null;
  /**
   * The device's answer, or null when it was not asked. It is only consulted
   * when neither an override nor a manual place applies.
   */
  location: LocationResult | null;
}

/** True when the device must be asked to resolve the place. */
export function needsDeviceLocation(inputs: Pick<PlaceInputs, 'override' | 'manual'>): boolean {
  return inputs.override === null && inputs.manual === null;
}

function rounded(c: { latitude: number; longitude: number }): Coordinate {
  return { latitude: roundCoordinate(c.latitude), longitude: roundCoordinate(c.longitude) };
}

export function resolvePlace(inputs: PlaceInputs): PlaceResolution {
  if (inputs.override) {
    return {
      coordinate: rounded(inputs.override),
      source: 'override',
      label: `${inputs.override.latitude}, ${inputs.override.longitude}`,
      fallbackReason: null,
    };
  }

  if (inputs.manual) {
    // Rounded here as well as on receipt, so a stored place from any source
    // can never carry more precision than a device fix would.
    return {
      coordinate: rounded(inputs.manual),
      source: 'manual',
      label: inputs.manual.name,
      fallbackReason: null,
    };
  }

  if (inputs.location?.status === 'granted') {
    return {
      coordinate: inputs.location.coordinate,
      source: 'device',
      label: null,
      fallbackReason: null,
    };
  }

  return {
    coordinate: { latitude: FALLBACK_PLACE.latitude, longitude: FALLBACK_PLACE.longitude },
    source: 'fallback',
    label: FALLBACK_PLACE.name,
    fallbackReason: inputs.location?.status === 'denied' ? 'denied' : 'unavailable',
  };
}
