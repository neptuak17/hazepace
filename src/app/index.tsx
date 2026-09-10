/**
 * Today — the now-verdict and the shape of the day.
 *
 * Every value on this screen is derived from the rating model at render time,
 * so changing the activity chip (or any threshold, from another screen)
 * re-rates the card, the chart and the window together. There is no separate
 * "apply" step.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Icon } from '@/components/icon';
import {
  Accent,
  Accent2,
  Card,
  Neutral,
  Palette,
  Radius,
  Space,
  Type,
  Verdict,
  tracking,
} from '@/constants/design-tokens';
import { HOURS, NOW, hourAt } from '@/lib/fixtures';
import {
  bestWindow,
  effectiveAqhi,
  formatHour,
  formatTick,
  judge,
  quality,
  type Activity,
  type Driver,
  type Level,
} from '@/lib/rating';
import { useSettings } from '@/lib/settings';

const ACTIVITIES: Activity[] = ['Running', 'Cycling', 'Hiking / Walking'];

/**
 * The line under the verdict, naming what is limiting the session.
 *
 * These describe conditions against the user's own thresholds. They do not
 * make a claim about the user's health, and must not start doing so.
 */
const SENTENCES: Partial<Record<Exclude<Driver, null>, Partial<Record<Level, string>>>> = {
  smoke: {
    2: 'Smoke is pooled on the valley floor. Well past your ceiling for hard efforts.',
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
};

/** Chart geometry, from the design. */
const CHART_HEIGHT = 140;
const BAR_BASE = 16;
const BAR_SCALE = 1.16;

export default function TodayScreen() {
  const { settings, activity, setActivity, prefs } = useSettings();
  const [selectedHour, setSelectedHour] = useState(11);

  const nowHour = hourAt(NOW);
  const now = judge(nowHour, prefs);
  const tint = Verdict.tint[now.level];
  const ink = Verdict.deepInk[now.level];

  const sentence =
    now.level === 0
      ? 'Clear enough for a full session at your usual intensity.'
      : ((now.driver && SENTENCES[now.driver]?.[now.level]) ??
        'Conditions are against you right now.');

  const selected = hourAt(selectedHour);
  const selectedJudgement = judge(selected, prefs);
  const window = bestWindow(HOURS, NOW, prefs);
  const windowText = window
    ? `${formatHour(window.start, settings.timeFmt)} – ${formatHour(window.end, settings.timeFmt)} · ${window.end - window.start} h`
    : 'nothing clean today';

  const stats = [
    { k: 'AQHI', v: String(selected.aqhi) },
    { k: 'Temp', v: `${Math.round(selected.tempC)}°C` },
    { k: 'Wind', v: `${selected.dir} ${Math.round(selected.windKmh)}` },
    { k: 'Rain', v: `${selected.rainMmH.toFixed(1)} mm` },
    { k: 'Humidity', v: `${selected.humidity}%` },
    { k: 'Effective', v: effectiveAqhi(selected.aqhi, prefs).toFixed(1) },
  ];

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView style={styles.pane} contentContainerStyle={styles.paneContent}>
        <View style={[styles.verdictCard, { backgroundColor: tint }]}>
          <View style={styles.verdictTop}>
            <View style={styles.verdictLeft}>
              <Text style={[styles.kicker, { color: ink }]}>
                Conditions at {formatHour(NOW, settings.timeFmt)} · {activity}
              </Text>
              <View style={styles.heroRow}>
                <Text style={[styles.hero, { color: ink }]}>{nowHour.aqhi}</Text>
                <View style={styles.heroCaption}>
                  <Text style={[styles.heroCapsLabel, { color: ink }]}>AQHI</Text>
                  <Text style={[styles.heroOf, { color: ink }]}>of 10+</Text>
                </View>
              </View>
            </View>
            <View style={[styles.verdictPill, { backgroundColor: ink }]}>
              <Text style={styles.verdictPillText}>{Verdict.word[now.level]}</Text>
            </View>
          </View>
          <Text style={[styles.verdictSentence, { color: ink }]}>{sentence}</Text>
        </View>

        <View style={styles.chipRow}>
          {ACTIVITIES.filter((a) => settings.sports.includes(a)).map((a) => {
            const on = a === activity;
            return (
              <Pressable
                key={a}
                onPress={() => setActivity(a)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
                <Text style={[styles.chipText, { color: on ? Neutral[100] : Neutral[800] }]}>
                  {a}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.windowPill}>
          <Icon name="bars" size={18} color={Accent2[800]} />
          <Text style={styles.windowText}>Best window today · {windowText}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Hour by hour</Text>
            <Text style={styles.cardHint}>taller is better</Text>
          </View>

          <View style={styles.chart}>
            {HOURS.map((hr) => {
              const level = judge(hr, prefs).level;
              const past = hr.hour + 1 <= NOW;
              const height = BAR_BASE + quality(hr, prefs) * BAR_SCALE;
              const isSelected = hr.hour === Math.floor(selectedHour);
              return (
                <Pressable
                  key={hr.hour}
                  style={styles.barColumn}
                  onPress={() => setSelectedHour(hr.hour)}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatHour(hr.hour, settings.timeFmt)}, AQHI ${hr.aqhi}`}>
                  <View
                    style={[
                      styles.bar,
                      { height, backgroundColor: Verdict.ink[level], opacity: past ? 0.28 : 1 },
                    ]}
                  />
                  {/* The design rings the selected bar with a box-shadow spread.
                      RN has no outline, so the ring is a sibling inset outward
                      by its own width to sit outside the bar rather than eat
                      into it. */}
                  {isSelected && <View pointerEvents="none" style={[styles.barRing, { height }]} />}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.tickRow}>
            {HOURS.map((hr) => (
              <Text
                key={hr.hour}
                style={[
                  styles.tick,
                  { color: hr.hour === Math.floor(selectedHour) ? Palette.text : Neutral[600] },
                ]}>
                {hr.hour % 3 === 2 ? formatTick(hr.hour, settings.timeFmt) : ''}
              </Text>
            ))}
          </View>

          <View style={styles.readout}>
            <View style={styles.readoutHead}>
              <Text style={styles.readoutHour}>
                {formatHour(selected.hour, settings.timeFmt)}
                {Math.floor(NOW) === selected.hour ? ' · now' : ''}
              </Text>
              <View
                style={[
                  styles.readoutPill,
                  { backgroundColor: Verdict.ink[selectedJudgement.level] },
                ]}>
                <Text style={styles.readoutPillText}>{Verdict.word[selectedJudgement.level]}</Text>
              </View>
            </View>

            <View style={styles.statGrid}>
              {stats.map((s) => (
                <View key={s.k} style={styles.stat}>
                  <Text style={styles.statKey}>{s.k}</Text>
                  <Text style={styles.statValue}>{s.v}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.airLink}>What&apos;s in the air →</Text>
          </View>
        </View>

        <Text style={styles.attribution}>
          Air data follows the Canadian AQHI. Sources: Environment and Climate Change Canada,
          FireSmoke.ca — BlueSky Canada, BC Ministry of Environment, PurpleAir, BC Wildfire Service.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    minHeight: 44,
  },
  pinBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Accent2[600],
    alignItems: 'center',
    justifyContent: 'center',
  },

  pane: { flex: 1 },
  paneContent: {
    paddingTop: 6,
    paddingHorizontal: Space.four,
    paddingBottom: 116,
    gap: Space.three,
  },

  verdictCard: { borderRadius: Radius.lg, padding: Space.four },
  verdictTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.three },
  verdictLeft: { flex: 1, minWidth: 0 },
  kicker: Type.kicker,
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 },
  hero: Type.heroNumber,
  heroCaption: { gap: 1, paddingBottom: 10 },
  heroCapsLabel: { ...Type.capsLabel, textTransform: 'none' },
  heroOf: { ...Type.bodySmall, opacity: 0.75 },
  verdictPill: { borderRadius: Radius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  verdictPillText: {
    ...Type.hourLabel,
    color: Neutral[100],
    letterSpacing: tracking(17, 0.04),
  },
  verdictSentence: {
    fontFamily: Type.body.fontFamily,
    fontSize: 16,
    lineHeight: 16 * 1.45,
    marginTop: Space.two,
  },

  chipRow: { flexDirection: 'row', gap: 7 },
  chip: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  chipOn: { backgroundColor: Accent[600], borderColor: Accent[600] },
  chipOff: { backgroundColor: 'transparent', borderColor: Neutral[300] },
  chipText: { ...Type.bodySmall, fontFamily: Type.rowLabel.fontFamily, textAlign: 'center' },

  windowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Accent2[200],
    borderRadius: Radius.pill,
    paddingVertical: 12,
    paddingHorizontal: Space.four,
    minHeight: 44,
  },
  windowText: { ...Type.pillLabel, flex: 1, color: Accent2[800] },

  card: Card,
  cardHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: { ...Type.dayRow, color: Palette.text },
  cardHint: { ...Type.caption, color: Neutral[600] },

  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: CHART_HEIGHT,
    marginTop: Space.three,
  },
  barColumn: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { borderRadius: Radius.pill },
  barRing: {
    position: 'absolute',
    left: -2.5,
    right: -2.5,
    bottom: -2.5,
    borderWidth: 2.5,
    borderColor: Palette.text,
    borderRadius: Radius.pill,
  },

  tickRow: { flexDirection: 'row', gap: 3, marginTop: 7 },
  tick: { ...Type.tick, flex: 1, textAlign: 'center', letterSpacing: -0.18 },

  readout: {
    marginTop: Space.three,
    backgroundColor: Neutral[200],
    borderRadius: Radius.md,
    padding: Space.three,
  },
  readoutHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readoutHour: { ...Type.hourLabel, color: Palette.text, flex: 1 },
  readoutPill: { borderRadius: Radius.pill, paddingHorizontal: 11, paddingVertical: 4 },
  readoutPillText: {
    ...Type.caption,
    fontFamily: Type.rowLabel.fontFamily,
    color: Neutral[100],
    letterSpacing: tracking(12, 0.04),
  },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 18, marginTop: 10 },
  stat: { minWidth: 62 },
  statKey: { ...Type.capsLabel, letterSpacing: tracking(11, 0.06), color: Neutral[600] },
  statValue: { ...Type.cardTitle, color: Palette.text },

  airLink: {
    marginTop: 12,
    ...Type.bodySmall,
    fontFamily: Type.rowLabel.fontFamily,
    color: Accent[700],
  },

  attribution: { ...Type.caption, color: Neutral[600], lineHeight: 12 * 1.4 },
});
