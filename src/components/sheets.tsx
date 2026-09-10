/**
 * The three sheet bodies: saved places, air detail, and the activity
 * comparison.
 *
 * All three rate their rows through the model rather than showing stored
 * verdicts, so they answer to the user's current thresholds like every other
 * surface.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
import { Common, SheetStrings } from '@/constants/strings';
import { NOW, PLACES, hourAt } from '@/lib/fixtures';
import { band, formatHour, type Activity, type Prefs, type TimeFormat } from '@/lib/rating';

/* ── Saved places ────────────────────────────────────────────────────────── */

export function PlacesSheetBody({
  prefs,
  onPick,
}: {
  prefs: Prefs;
  onPick: (place: string) => void;
}) {
  return (
    <View style={styles.rows}>
      {PLACES.map((p) => {
        const level = band(p.aqhi, prefs);
        return (
          <Pressable
            key={p.name}
            onPress={() => onPick(p.name)}
            accessibilityRole="button"
            style={styles.placeRow}>
            <View style={[styles.circle, { backgroundColor: Verdict.tint[level] }]}>
              <Text style={[styles.circleNumber, { color: Verdict.ink[level] }]}>{p.aqhi}</Text>
              <Text style={[styles.circleCaps, { color: Verdict.deepInk[level] }]}>{Common.aqhi}</Text>
            </View>
            <View style={styles.grow}>
              <Text style={styles.rowName}>{p.name}</Text>
              <Text style={styles.rowNote}>{p.note}</Text>
            </View>
            <Text style={[styles.rowWord, { color: Verdict.ink[level] }]}>
              {Verdict.word[level]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── What's in the air ───────────────────────────────────────────────────── */

/** Bar colours, paired by position with SheetStrings.airBars. */
const AIR_BAR_COLORS = [Accent[600], Accent2[500], Neutral[500]];

export function AirSheetBody({ timeFmt }: { timeFmt: TimeFormat }) {
  const nowHour = hourAt(NOW);
  const pm = Math.round(nowHour.aqhi * 8.6);

  const stats = [
    { k: SheetStrings.airStatKeys.pm25, v: String(pm), u: SheetStrings.airStatUnits.pm25 },
    {
      k: SheetStrings.airStatKeys.aqhi,
      v: String(nowHour.aqhi),
      u: SheetStrings.aqhiBandName(nowHour.aqhi),
    },
    nowHour.rainMmH >= 0.1
      ? {
          k: SheetStrings.airStatKeys.rain,
          v: nowHour.rainMmH.toFixed(1),
          u: SheetStrings.airStatUnits.rain,
        }
      : {
          k: SheetStrings.airStatKeys.visibility,
          v: '4.5',
          u: SheetStrings.airStatUnits.visibility,
        },
  ];

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

      <View style={styles.barList}>
        {SheetStrings.airBars.map((b, i) => (
          <View key={b.k}>
            <View style={styles.barHead}>
              <Text style={styles.barKey}>{b.k}</Text>
              <Text style={styles.barKey}>{b.v}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${b.pct}%`, backgroundColor: AIR_BAR_COLORS[i] }]} />
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.sourceLine}>{SheetStrings.airSource(formatHour(NOW, timeFmt))}</Text>
    </View>
  );
}

/* ── Same air, three verdicts ────────────────────────────────────────────── */

const ACTIVITIES: Activity[] = ['Running', 'Cycling', 'Hiking / Walking'];

export function ActivitySheetBody({
  prefs,
  onPick,
}: {
  prefs: Prefs;
  onPick: (activity: Activity) => void;
}) {
  const nowHour = hourAt(NOW);

  return (
    <View style={styles.rows}>
      {ACTIVITIES.map((a) => {
        // Each row is rated as if that sport were the active one.
        const level = band(nowHour.aqhi, { ...prefs, activity: a });
        return (
          <Pressable
            key={a}
            onPress={() => onPick(a)}
            accessibilityRole="button"
            style={styles.actRow}>
            <View style={[styles.actDot, { backgroundColor: Verdict.ink[level] }]} />
            <View style={styles.grow}>
              <View style={styles.actHead}>
                <Text style={styles.rowName}>{a}</Text>
                <Text style={[styles.actWord, { color: Verdict.ink[level] }]}>
                  {Verdict.word[level]}
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
  rowWord: { ...Type.caption, fontFamily: Type.rowLabel.fontFamily },

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

  barList: { gap: 9 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between' },
  barKey: { ...Type.bodySmall, fontFamily: Type.rowLabel.fontFamily, color: Neutral[800] },
  barTrack: {
    height: 9,
    borderRadius: Radius.pill,
    backgroundColor: Neutral[300],
    marginTop: 5,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: Radius.pill },
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
