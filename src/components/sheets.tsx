/**
 * The three sheet bodies: saved places, air detail, and the activity
 * comparison.
 *
 * All three take their numbers from the caller. A sheet never fetches, and
 * never fills a gap: a value the caller did not have renders as "—".
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
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
import type { AqhiReading } from '@/lib/aqhi';
import { formatAge, formatAqhi, formatClock, formatValue } from '@/lib/live';
import type { HourlyConditions } from '@/lib/open-meteo';
import { band, type Activity, type Prefs, type TimeFormat } from '@/lib/rating';

/* ── Saved places ────────────────────────────────────────────────────────── */

/**
 * The prototype's saved places. They carry no coordinates, and AQHI is one
 * value per community, so there is no reading to show for any of them yet.
 * Kept as names only; the circles read "—" until places have locations.
 */
const PLACE_NAMES = [
  { name: 'East Hill', note: 'The bench, 480 m' },
  { name: 'Kal Lake Road', note: 'Lakeshore, 350 m' },
  { name: 'Silver Star', note: 'Summit road, 1,610 m' },
  { name: 'Predator Ridge', note: 'Rolling, 600 m' },
];

export function PlacesSheetBody({
  onPick,
}: {
  prefs: Prefs;
  onPick: (place: string) => void;
}) {
  return (
    <View style={styles.rows}>
      {PLACE_NAMES.map((p) => (
        <Pressable
          key={p.name}
          onPress={() => onPick(p.name)}
          accessibilityRole="button"
          style={styles.placeRow}>
          <View style={[styles.circle, { backgroundColor: Neutral[200] }]}>
            <Text style={[styles.circleNumber, { color: Neutral[600] }]}>
              {DataStrings.unavailable}
            </Text>
            <Text style={[styles.circleCaps, { color: Neutral[600] }]}>{Common.aqhi}</Text>
          </View>
          <View style={styles.grow}>
            <Text style={styles.rowName}>{p.name}</Text>
            <Text style={styles.rowNote}>{p.note}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

/* ── What's in the air ───────────────────────────────────────────────────── */

export function AirSheetBody({
  observation,
  weather,
  timeFmt,
  nowMs,
}: {
  observation: AqhiReading | null;
  weather: HourlyConditions | null;
  timeFmt: TimeFormat;
  nowMs: number;
}) {
  const stats = [
    {
      k: SheetStrings.airStatKeys.pm25,
      v: formatValue(weather?.pm25 ?? null, 1),
      u: SheetStrings.airStatUnits.pm25,
    },
    {
      k: SheetStrings.airStatKeys.aqhi,
      v: formatAqhi(observation),
      u: observation?.category ?? DataStrings.unavailable,
    },
    {
      k: SheetStrings.airStatKeys.rain,
      v: formatValue(weather?.precipitationMm ?? null, 1),
      u: SheetStrings.airStatUnits.rain,
    },
  ];

  const provenance = observation
    ? `${DataStrings.communityLine(observation.community, observation.distanceKm)} · ${DataStrings.observedAt(formatClock(Date.parse(observation.timestamp), timeFmt), formatAge(Date.parse(observation.timestamp), nowMs))}`
    : DataStrings.unavailable;

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
