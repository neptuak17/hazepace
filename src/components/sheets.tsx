/**
 * The three sheet bodies: places, air detail, and the activity comparison.
 *
 * All three take their numbers from the caller, and none fills a gap: a value
 * the caller did not have renders as "—". The places sheet is the one that
 * fetches anything, and only its own search.
 */
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import {
  Accent,
  Accent2,
  Neutral,
  Palette,
  Radius,
  Space,
  Type,
  Verdict,
  tracking,
} from '@/constants/design-tokens';
import { Common, DataStrings, SheetStrings } from '@/constants/strings';
import type { AqhiEstimate } from '@/lib/aqhi-estimate';
import type { AqhiReading } from '@/lib/aqhi';
import { formatAge, formatAqhi, formatClock, formatValue } from '@/lib/live';
import type { HourlyConditions } from '@/lib/open-meteo';
import type { ManualPlace } from '@/lib/place';
import { band, type Activity, type Level, type Prefs, type TimeFormat } from '@/lib/rating';
import { usePlaceSearch } from '@/lib/use-place-search';

/* ── Places ──────────────────────────────────────────────────────────────── */

const samePlace = (a: ManualPlace | null, b: ManualPlace | null) =>
  a !== null && b !== null && a.latitude === b.latitude && a.longitude === b.longitude;

/**
 * The circle shows the AQHI for the place currently in use, coloured by the
 * user's thresholds, and "—" for every other row: the app fetches one place
 * at a time and does not pretend to know the others.
 */
function PlaceCircle({ aqhi, level }: { aqhi: string | null; level: Level | null }) {
  const bg = level === null ? Neutral[200] : Verdict.tint[level];
  const ink = level === null ? Neutral[600] : Verdict.deepInk[level];
  return (
    <View style={[styles.circle, { backgroundColor: bg }]}>
      <Text style={[styles.circleNumber, { color: ink }]}>{aqhi ?? DataStrings.unavailable}</Text>
      <Text style={[styles.circleCaps, { color: ink }]}>{Common.aqhi}</Text>
    </View>
  );
}

function PlaceRow({
  place,
  inUse,
  currentAqhi,
  currentLevel,
  onPress,
}: {
  place: ManualPlace;
  inUse: boolean;
  currentAqhi: string | null;
  currentLevel: Level | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: inUse }}
      accessibilityHint={inUse ? SheetStrings.placeInUse : undefined}
      style={styles.placeRow}>
      <PlaceCircle aqhi={inUse ? currentAqhi : null} level={inUse ? currentLevel : null} />
      <View style={styles.grow}>
        <Text style={styles.rowName} numberOfLines={1}>
          {place.name}
        </Text>
        <Text style={styles.rowNote} numberOfLines={1}>
          {place.region ?? DataStrings.unavailable}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * The one sheet that fetches: a place search, debounced, via Open-Meteo's
 * geocoder (see geocode.ts). Below the search box the device row is always
 * present; beneath it, the chosen place while the box is empty, or the
 * results while it is not.
 */
export function PlacesSheetBody({
  manualPlace,
  currentAqhi,
  currentLevel,
  onUseDevice,
  onPick,
}: {
  /** The place in use, or null when it is the device. */
  manualPlace: ManualPlace | null;
  /** The AQHI showing right now, already formatted, for the row in use. */
  currentAqhi: string | null;
  currentLevel: Level | null;
  onUseDevice: () => void;
  onPick: (place: ManualPlace) => void;
}) {
  const [query, setQuery] = useState('');
  const search = usePlaceSearch(query);
  const deviceInUse = manualPlace === null;

  let body: ReactNode;
  if (search.status === 'idle') {
    body = manualPlace ? (
      <PlaceRow
        place={manualPlace}
        inUse
        currentAqhi={currentAqhi}
        currentLevel={currentLevel}
        onPress={() => onPick(manualPlace)}
      />
    ) : null;
  } else if (search.status === 'error') {
    body = <Text style={styles.searchNote}>{SheetStrings.searchError}</Text>;
  } else if (search.status === 'searching' && search.places.length === 0) {
    body = (
      <View style={styles.searchStatus}>
        <ActivityIndicator color={Accent.base} />
        <Text style={styles.searchNote}>{SheetStrings.searching}</Text>
      </View>
    );
  } else if (search.places.length === 0) {
    body = <Text style={styles.searchNote}>{SheetStrings.searchEmpty(search.query)}</Text>;
  } else {
    body = search.places.map((p) => (
      <PlaceRow
        key={`${p.name}|${p.region ?? ''}|${p.latitude}|${p.longitude}`}
        place={p}
        inUse={samePlace(p, manualPlace)}
        currentAqhi={currentAqhi}
        currentLevel={currentLevel}
        onPress={() => onPick(p)}
      />
    ));
  }

  return (
    <View style={styles.rows}>
      <View style={styles.searchBox}>
        <Icon name="search" size={17} color={Neutral[600]} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={SheetStrings.searchPlaceholder}
          placeholderTextColor={Neutral[600]}
          accessibilityLabel={SheetStrings.searchLabel}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel={SheetStrings.clearSearch}
            hitSlop={8}
            style={styles.searchClear}>
            <Icon name="close" size={15} color={Neutral[600]} />
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={onUseDevice}
        accessibilityRole="button"
        accessibilityState={{ selected: deviceInUse }}
        accessibilityHint={deviceInUse ? SheetStrings.placeInUse : undefined}
        style={styles.placeRow}>
        {deviceInUse ? (
          <PlaceCircle aqhi={currentAqhi} level={currentLevel} />
        ) : (
          <View style={[styles.circle, { backgroundColor: Accent2[600] }]}>
            <Icon name="mapPin" size={20} color={Palette.bg} />
          </View>
        )}
        <View style={styles.grow}>
          <Text style={styles.rowName}>{SheetStrings.useMyLocation}</Text>
          <Text style={styles.rowNote}>{SheetStrings.useMyLocationNote}</Text>
        </View>
      </Pressable>

      {body}
    </View>
  );
}

/* ── What's in the air ───────────────────────────────────────────────────── */

export function AirSheetBody({
  observation,
  estimate,
  estimateEpoch,
  weather,
  timeFmt,
  nowMs,
}: {
  observation: AqhiReading | null;
  /** Shown only when there is no observation; labelled as a model value. */
  estimate: AqhiEstimate | null;
  estimateEpoch: number | null;
  weather: HourlyConditions | null;
  timeFmt: TimeFormat;
  nowMs: number;
}) {
  const aqhi = observation ?? estimate;
  const stats = [
    {
      k: SheetStrings.airStatKeys.pm25,
      v: formatValue(weather?.pm25 ?? null, 1),
      u: SheetStrings.airStatUnits.pm25,
    },
    {
      k: SheetStrings.airStatKeys.aqhi,
      v: formatAqhi(aqhi),
      u: aqhi?.category ?? DataStrings.unavailable,
    },
    {
      k: SheetStrings.airStatKeys.rain,
      v: formatValue(weather?.precipitationMm ?? null, 1),
      u: SheetStrings.airStatUnits.rain,
    },
  ];

  let provenance: string = DataStrings.unavailable;
  if (observation) {
    provenance = `${DataStrings.communityLine(observation.community, observation.distanceKm)} · ${DataStrings.observedAt(formatClock(Date.parse(observation.timestamp), timeFmt), formatAge(Date.parse(observation.timestamp), nowMs))}`;
  } else if (estimate && estimateEpoch !== null) {
    provenance = `${DataStrings.modelSource} · ${DataStrings.forecastFor(formatClock(estimateEpoch, timeFmt))}`;
  }

  return (
    <View style={styles.airBody}>
      <View style={styles.statRow}>
        {stats.map((s) => (
          <View key={s.k} style={styles.statTile}>
            <Text style={styles.statKey}>{s.k}</Text>
            <Text style={styles.statValue}>{s.v}</Text>
            <Text style={styles.statUnit}>{s.u}</Text>
          </View>
        ))}
      </View>

      {/*
        The prototype drew composition bars here (PM2.5 / ozone / NO2 as a
        share of the index). Neither source provides that breakdown, and a
        share of an index is a derivation in any case, so they are not drawn.
      */}

      <Text style={styles.sourceLine}>{provenance}</Text>
      <Text style={styles.sourceLine}>
        {SheetStrings.airSource(formatClock(nowMs, timeFmt))}
      </Text>
    </View>
  );
}

/* ── Same air, three verdicts ────────────────────────────────────────────── */

const ACTIVITIES: Activity[] = ['Running', 'Cycling', 'Hiking / Walking'];

export function ActivitySheetBody({
  aqhi,
  prefs,
  onPick,
}: {
  /** The current AQHI, or null when there is none to compare against. */
  aqhi: number | null;
  prefs: Prefs;
  onPick: (activity: Activity) => void;
}) {
  return (
    <View style={styles.rows}>
      {ACTIVITIES.map((a) => {
        // Each row is rated as if that sport were the active one.
        const level = aqhi === null ? null : band(aqhi, { ...prefs, activity: a });
        const ink = level === null ? Neutral[500] : Verdict.ink[level];
        return (
          <Pressable
            key={a}
            onPress={() => onPick(a)}
            accessibilityRole="button"
            style={styles.actRow}>
            <View style={[styles.actDot, { backgroundColor: ink }]} />
            <View style={styles.grow}>
              <View style={styles.actHead}>
                <Text style={styles.rowName}>{a}</Text>
                <Text style={[styles.actWord, { color: ink }]}>
                  {level === null ? DataStrings.unavailable : Verdict.word[level]}
                </Text>
              </View>
              <Text style={styles.actNote}>{SheetStrings.activityNote[a]}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 2 },
  grow: { flex: 1, minWidth: 0 },

  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.three,
    paddingVertical: 12,
    borderTopWidth: 1.5,
    borderTopColor: Palette.divider,
  },
  circle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  circleNumber: { ...Type.zoneNumber, lineHeight: 18 },
  circleCaps: { ...Type.zoneCaps, letterSpacing: tracking(9.5, 0.04), lineHeight: 10 },
  rowName: { ...Type.rowLabel, flex: 1, color: Palette.text },
  rowNote: { ...Type.bodySmall, color: Neutral[700] },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.two,
    backgroundColor: Neutral[200],
    borderRadius: Radius.md,
    paddingHorizontal: Space.three,
    minHeight: 44,
    marginBottom: Space.two,
  },
  searchInput: { ...Type.body, flex: 1, minWidth: 0, color: Palette.text, paddingVertical: 10 },
  searchClear: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  searchStatus: { flexDirection: 'row', alignItems: 'center', gap: Space.two, paddingVertical: 12 },
  searchNote: { ...Type.bodySmall, color: Neutral[700], paddingVertical: 12 },

  airBody: { gap: Space.three },
  statRow: { flexDirection: 'row', gap: Space.three },
  statTile: {
    flex: 1,
    backgroundColor: Neutral[200],
    borderRadius: Radius.md,
    padding: Space.three,
  },
  statKey: {
    ...Type.capsLabel,
    letterSpacing: tracking(11, 0.06),
    color: Neutral[600],
  },
  statValue: {
    fontFamily: Type.pageTitle.fontFamily,
    fontSize: 26,
    lineHeight: 26 * 1.1,
    color: Palette.text,
    marginTop: 4,
  },
  statUnit: { ...Type.caption, color: Neutral[700] },
  sourceLine: { ...Type.caption, color: Neutral[600], lineHeight: 12 * 1.45 },

  actRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Space.three,
    paddingVertical: 13,
    borderTopWidth: 1.5,
    borderTopColor: Palette.divider,
  },
  actDot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  actHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  actWord: { ...Type.caption, fontFamily: Type.rowLabel.fontFamily, letterSpacing: tracking(12, 0.04) },
  actNote: { ...Type.bodySmall, color: Neutral[700], lineHeight: 13 * 1.4, marginTop: 2 },
});
