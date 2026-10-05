/**
 * The Map plate's pins and the region that frames them.
 *
 * Pure, so the two rules that matter — which readings are current enough to
 * colour a pin, and how the view is framed — run under Node with the rest of
 * the model's tests. The screen only draws what this returns.
 */
import type { AqhiReading, AreaReading } from './aqhi.ts';
import { MAP_COMMUNITY_DISTANCE_KM, formatAqhi } from './live.ts';
import { band, type Level, type Prefs } from './rating.ts';

/**
 * A pin shows a value only if the observation is at most this old. ECCC
 * publishes hourly, so anything older means the community has stopped
 * reporting; its "latest" row can be a day old. A pin carries no time, so
 * unlike the list below the map it cannot show the age beside the number,
 * and an old number would read as a current one.
 */
export const PIN_MAX_AGE_HOURS = 3;

const HOUR_MS = 3_600_000;

export interface MapPin {
  /** The community's `location_id`. */
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** From the place. */
  distanceKm: number;
  /** As published ("4", "10+"), or "—" when absent or too old. */
  value: string;
  /** Null when `value` is "—". */
  level: Level | null;
  /** The observation behind the value. Null when `value` is "—". */
  observation: AqhiReading | null;
}

/** True when the reading has a value and is no older than PIN_MAX_AGE_HOURS. */
export function isCurrent(reading: AqhiReading | null, nowMs: number): reading is AqhiReading {
  if (!reading || reading.value === null) return false;
  const at = Date.parse(reading.timestamp);
  if (Number.isNaN(at)) return false;
  return nowMs - at <= PIN_MAX_AGE_HOURS * HOUR_MS;
}

/**
 * One pin per community in the area.
 *
 * `prefer` replaces one community's observation with the one the list below
 * the map is showing, so a pin and its row can never disagree when the two
 * requests land either side of ECCC's hourly publication.
 */
export function mapPins(
  area: AreaReading[],
  prefs: Prefs,
  nowMs: number,
  prefer: { locationId: string; observation: AqhiReading | null } | null = null,
): MapPin[] {
  return area.map((a) => {
    const observation =
      prefer && prefer.locationId === a.community.locationId ? prefer.observation : a.observation;
    const current = isCurrent(observation, nowMs) ? observation : null;
    return {
      id: a.community.locationId,
      name: a.community.name,
      latitude: a.community.latitude,
      longitude: a.community.longitude,
      distanceKm: a.distanceKm,
      value: formatAqhi(current),
      level: current && current.value !== null ? band(current.value, prefs) : null,
      observation: current,
    };
  });
}

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/**
 * Smallest view, in degrees of latitude: about 130 km, so a place with no
 * community nearby still shows the valley it sits in, not a street map.
 */
const MIN_SPAN_DEG = 1.2;
/** Room around the outermost pin so it is not drawn on the plate's edge. */
const PADDING = 1.3;

/** The pins the map opens on: those within the Map's range of the place. */
export function nearPins(pins: MapPin[]): MapPin[] {
  return pins.filter((p) => p.distanceKm <= MAP_COMMUNITY_DISTANCE_KM);
}

/**
 * Centred on the place, wide enough for every point given — the Map passes
 * nearPins(), so it opens on the 200 km area and the rest is a pan away.
 *
 * Centred rather than fitted to the pins' bounding box: the place is what
 * the page is about, and keeping it in the middle means the view does not
 * jump sideways when a far community starts or stops reporting.
 */
export function regionFor(
  center: { latitude: number; longitude: number },
  points: { latitude: number; longitude: number }[],
): Region {
  let maxDLat = 0;
  let maxDLon = 0;
  for (const p of points) {
    maxDLat = Math.max(maxDLat, Math.abs(p.latitude - center.latitude));
    maxDLon = Math.max(maxDLon, Math.abs(p.longitude - center.longitude));
  }
  // A degree of longitude shrinks with latitude; the minimum is set in
  // kilometres, so the longitude minimum grows to match.
  const lonScale = Math.cos((center.latitude * Math.PI) / 180);
  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: Math.max(MIN_SPAN_DEG, maxDLat * 2 * PADDING),
    longitudeDelta: Math.max(MIN_SPAN_DEG / lonScale, maxDLon * 2 * PADDING),
  };
}

/**
 * How far past each edge of the view a pin is still drawn, as a share of
 * the view. A pin just off-screen is drawn already, so it slides in with
 * the pan instead of appearing when the pan stops.
 */
const VIEW_MARGIN = 0.25;

/**
 * True when the point is inside the region or within VIEW_MARGIN of it.
 *
 * Only what is near the view is drawn: zoomed in on one valley, the other
 * hundred-odd communities would be views the map lays out and never shows.
 */
export function inView(point: { latitude: number; longitude: number }, region: Region): boolean {
  const halfLat = (region.latitudeDelta / 2) * (1 + 2 * VIEW_MARGIN);
  const halfLon = (region.longitudeDelta / 2) * (1 + 2 * VIEW_MARGIN);
  return (
    Math.abs(point.latitude - region.latitude) <= halfLat &&
    Math.abs(point.longitude - region.longitude) <= halfLon
  );
}

/* ── Grouping ────────────────────────────────────────────────────────────── */

/**
 * Two pins closer than this on screen become one group. A pin is 32 px
 * across, so at 40 px apart two pins have a few pixels between them.
 */
export const GROUP_RADIUS_PX = 40;

/** Pins that would overlap at the current zoom, drawn as one. */
export interface PinGroup<T extends MapPin> {
  /** Stable while the membership is: the lone id, or every member's id. */
  key: string;
  /**
   * The member with the highest current reading — the one the group pin
   * shows, by the same rule as the verdict: the worst reading wins. A group
   * where none has a current reading leads with its first member and
   * shows "—".
   */
  lead: T;
  members: T[];
}

/** Web Mercator's y, which is what MapKit draws latitude on. */
function mercatorY(latitude: number): number {
  const rad = (latitude * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

/**
 * Where a point falls on a map of `size` points showing `region`, from the
 * top-left corner. Longitude is linear; latitude is not — at the zoom
 * where grouping matters, a flat projection would misplace pins by tens of
 * pixels between the top and bottom of the plate.
 */
export function toScreen(
  point: { latitude: number; longitude: number },
  region: Region,
  size: { width: number; height: number },
): { x: number; y: number } {
  const top = mercatorY(region.latitude + region.latitudeDelta / 2);
  const bottom = mercatorY(region.latitude - region.latitudeDelta / 2);
  const left = region.longitude - region.longitudeDelta / 2;
  return {
    x: ((point.longitude - left) / region.longitudeDelta) * size.width,
    y: ((top - mercatorY(point.latitude)) / (top - bottom)) * size.height,
  };
}

/** Higher first. A pin with no current reading ranks below every reading. */
function severity(p: MapPin): number {
  return p.observation?.value ?? -1;
}

/**
 * Groups pins that would overlap at this zoom.
 *
 * Greedy, highest reading first: the highest pin not yet grouped takes
 * every ungrouped pin within GROUP_RADIUS_PX of it. Starting from the
 * highest means a group is always drawn at, and shows, its highest member,
 * so zooming out can hide a low reading behind a high one but never the
 * other way round. Ties fall back to the id, so the same view groups the
 * same way every time.
 *
 * Before the map has a size, nothing is grouped.
 */
export function groupPins<T extends MapPin>(
  pins: T[],
  region: Region,
  size: { width: number; height: number },
  radiusPx: number = GROUP_RADIUS_PX,
): PinGroup<T>[] {
  if (size.width <= 0 || size.height <= 0) {
    return pins.map((p) => ({ key: p.id, lead: p, members: [p] }));
  }
  const placed = pins
    .map((pin) => ({ pin, ...toScreen(pin, region, size) }))
    .sort((a, b) => severity(b.pin) - severity(a.pin) || a.pin.id.localeCompare(b.pin.id));

  const taken = new Set<string>();
  const groups: PinGroup<T>[] = [];
  for (const seed of placed) {
    if (taken.has(seed.pin.id)) continue;
    const members = placed.filter(
      (o) => !taken.has(o.pin.id) && Math.hypot(o.x - seed.x, o.y - seed.y) < radiusPx,
    );
    for (const m of members) taken.add(m.pin.id);
    groups.push({
      key:
        members.length === 1
          ? seed.pin.id
          : `group:${members
              .map((m) => m.pin.id)
              .sort()
              .join(',')}`,
      lead: seed.pin,
      members: members.map((m) => m.pin),
    });
  }
  return groups;
}

/** The narrowest view a group zooms to, in degrees: about 15 km. */
const MIN_FIT_SPAN_DEG = 0.15;
/** Room around a zoomed-to group, so its members land well inside the plate. */
const FIT_PADDING = 1.8;

/**
 * The view that spreads a group's members apart: centred on their bounds,
 * with room around them. Tapping a group zooms here.
 */
export function regionFitting(points: { latitude: number; longitude: number }[]): Region {
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latitude = (minLat + maxLat) / 2;
  const lonScale = Math.cos((latitude * Math.PI) / 180);
  return {
    latitude,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(MIN_FIT_SPAN_DEG, (maxLat - minLat) * FIT_PADDING),
    longitudeDelta: Math.max(MIN_FIT_SPAN_DEG / lonScale, (maxLon - minLon) * FIT_PADDING),
  };
}
