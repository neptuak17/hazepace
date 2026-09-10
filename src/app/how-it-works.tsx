/**
 * How this works — what the app is doing and where the numbers come from.
 *
 * Mostly static, with one live section: the four factor tiles and the line
 * beneath them read the current conditions, so the screen shows the rule and
 * the rule's current outcome at the same time.
 */
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Icon, type IconName } from '@/components/icon';
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
  type Level,
} from '@/constants/design-tokens';
import { NOW, hourAt } from '@/lib/fixtures';
import { factorLevels, judge, type Driver } from '@/lib/rating';
import { useSettings } from '@/lib/settings';

const PAGES: { name: string; icon: IconName; what: string }[] = [
  {
    name: 'Today',
    icon: 'tabToday',
    what: 'Can I go out right now? Current conditions plus a per hour view of the day so you can plan your activity in the best window.',
  },
  {
    name: 'Map',
    icon: 'tabMap',
    what: 'Where the smoke in your area is right now so you can plan where to ride today.',
  },
  {
    name: 'Forecast',
    icon: 'tabForecast',
    what: 'The next five days, so you can plan when conditions are suitable for your outdoor activity.',
  },
];

const BANDS: { level: Level; what: string }[] = [
  { level: 0, what: 'Train as planned.' },
  { level: 1, what: 'Go easy, or go shorter.' },
  { level: 2, what: 'Take it indoors.' },
];

const VENT_TILES = [
  { name: 'Walking', mult: '1.0×' },
  { name: 'Cycling', mult: '1.5×' },
  { name: 'Running', mult: '1.7×' },
];

const SOURCES = [
  {
    name: 'Environment and Climate Change Canada',
    what: 'AQHI observations and forecasts, plus hourly temperature, wind and precipitation.',
  },
  {
    name: 'FireSmoke.ca — BlueSky Canada',
    what: 'The wildfire smoke plume model behind the map and the forward scrub.',
  },
  {
    name: 'BC Ministry of Environment air monitoring',
    what: 'The reference PM2.5 stations that anchor the valley readings.',
  },
  {
    name: 'PurpleAir community sensors',
    what: 'Fills the gaps between stations so zones a few kilometres apart read separately.',
  },
  {
    name: 'BC Wildfire Service',
    what: 'Active fire perimeters and advisories shown on the map.',
  },
];

const DRIVER_WORD: Record<Exclude<Driver, null>, string> = {
  smoke: 'smoke',
  rainfall: 'rain',
  heat: 'heat',
  wind: 'wind',
};

/** The design's factor bar: 14, 27 or 40px by level. */
const factorBarHeight = (level: Level) => 14 + level * 13;

export default function HowItWorksScreen() {
  const router = useRouter();
  const { prefs } = useSettings();

  const nowHour = hourAt(NOW);
  const now = judge(nowHour, prefs);
  const factors = factorLevels(nowHour, prefs);

  const factorTiles: { name: string; level: Level }[] = [
    { name: 'Smoke', level: factors.air },
    { name: 'Rain', level: factors.rain },
    { name: 'Heat', level: factors.heat },
    { name: 'Wind', level: factors.wind },
  ];

  const winner = now.driver
    ? `Right now, the ${DRIVER_WORD[now.driver]} is setting the verdict`
    : 'Right now, nothing is holding you back';

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView style={styles.pane} contentContainerStyle={styles.paneContent}>
        <Text style={styles.title}>How this works</Text>

        <View style={[styles.card, styles.pagesCard]}>
          {PAGES.map((p) => (
            <View key={p.name} style={styles.pageRow}>
              <View style={styles.pageBadge}>
                <Icon name={p.icon} size={19} color={Accent2[800]} />
              </View>
              <View style={styles.pageText}>
                <Text style={styles.cardTitle}>{p.name}</Text>
                <Text style={styles.body}>{p.what}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>The verdict</Text>
          <View style={styles.bandList}>
            {BANDS.map((b) => (
              <View
                key={b.level}
                style={[styles.bandRow, { backgroundColor: Verdict.tint[b.level] }]}>
                <View style={[styles.bandPill, { backgroundColor: Verdict.ink[b.level] }]}>
                  <Text style={styles.bandPillText}>{Verdict.word[b.level]}</Text>
                </View>
                <Text style={[styles.bandWhat, { color: Verdict.ink[b.level] }]}>{b.what}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Worst factor wins</Text>
          <Text style={styles.caption}>
            Four factors are checked with the worst factor setting the verdict (based on your
            preferences.)
          </Text>
          <View style={styles.factorRow}>
            {factorTiles.map((f) => (
              <View
                key={f.name}
                style={[styles.factorTile, { backgroundColor: Verdict.tint[f.level] }]}>
                <View
                  style={[
                    styles.factorBar,
                    { height: factorBarHeight(f.level), backgroundColor: Verdict.ink[f.level] },
                  ]}
                />
                <Text style={[styles.factorName, { color: Verdict.ink[f.level] }]}>{f.name}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.winnerPill, { backgroundColor: Verdict.tint[now.level] }]}>
            <Text style={[styles.winnerText, { color: Verdict.ink[now.level] }]}>{winner}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Why your verdict differs</Text>
          {/*
            The design said "move far more air through your lungs". Anatomical
            framing is a health claim, so this states the same mechanism as a
            rate of air moved.
          */}
          <Text style={styles.caption}>
            Hard efforts move far more air per minute, so the same reading meets you differently on
            a bike than on a walk. Your sport, your sensitivity and your limits all shift the
            thresholds — set them in Thresholds.
          </Text>
          <View style={styles.ventRow}>
            {VENT_TILES.map((v) => (
              <View key={v.name} style={styles.ventTile}>
                <Text style={styles.ventMult}>{v.mult}</Text>
                <Text style={styles.ventName}>{v.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Where the data comes from</Text>
          <View style={styles.sourceList}>
            {SOURCES.map((s) => (
              <View key={s.name} style={styles.sourceRow}>
                <View style={styles.sourceDot} />
                <View style={styles.pageText}>
                  <Text style={styles.sourceName}>{s.name}</Text>
                  <Text style={styles.body}>{s.what}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.closing}>
          Air data follows the Canadian AQHI. HazePace is guidance for training decisions — always
          follow local advisories.
        </Text>

        <Pressable
          onPress={() => router.navigate('/')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.done, pressed && styles.donePressed]}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.bg },
  pane: { flex: 1 },
  paneContent: {
    paddingTop: 6,
    paddingHorizontal: Space.four,
    paddingBottom: 116,
    gap: Space.three,
  },

  title: { ...Type.sectionTitle, color: Palette.text },
  card: Card,
  cardTitle: { ...Type.cardTitle, color: Palette.text },
  body: { ...Type.bodySmall, color: Neutral[700], lineHeight: 13 * 1.4 },
  caption: { ...Type.bodySmall, color: Neutral[700], lineHeight: 13 * 1.4, marginTop: 3 },

  pagesCard: { gap: Space.four },
  pageRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  pageBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Accent2[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageText: { flex: 1, minWidth: 0 },

  bandList: { gap: 8, marginTop: Space.three },
  bandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  bandPill: { borderRadius: Radius.pill, paddingVertical: 3, paddingHorizontal: 11 },
  bandPillText: {
    fontFamily: Type.pageTitle.fontFamily,
    fontSize: 12,
    letterSpacing: tracking(12, 0.06),
    color: Neutral[100],
  },
  bandWhat: { ...Type.bodySmall, fontFamily: Type.body.fontFamily, fontWeight: '600', flex: 1 },

  factorRow: { flexDirection: 'row', gap: 6, marginTop: Space.three },
  factorTile: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
  },
  factorBar: { width: 8, borderRadius: Radius.pill },
  factorName: {
    ...Type.capsLabel,
    textTransform: 'none',
    letterSpacing: 0,
    textAlign: 'center',
  },
  winnerPill: {
    marginTop: Space.three,
    borderRadius: Radius.pill,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  winnerText: { ...Type.bodySmall, fontFamily: Type.rowLabel.fontFamily },

  ventRow: { flexDirection: 'row', gap: 6, marginTop: Space.three },
  ventTile: {
    flex: 1,
    borderRadius: Radius.md,
    backgroundColor: Neutral[200],
    padding: 10,
    alignItems: 'center',
  },
  ventMult: { ...Type.tile, color: Accent[700] },
  ventName: { ...Type.capsLabel, textTransform: 'none', letterSpacing: 0, color: Neutral[700] },

  sourceList: { gap: 12, marginTop: Space.three },
  sourceRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  sourceDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Accent2[600],
    marginTop: 6,
  },
  sourceName: { ...Type.pillLabel, color: Palette.text },

  closing: {
    ...Type.bodySmall,
    fontFamily: Type.rowLabel.fontFamily,
    color: Neutral[800],
    lineHeight: 13 * 1.4,
  },

  done: {
    minHeight: 46,
    borderRadius: Radius.pill,
    backgroundColor: Accent.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Space.two,
  },
  donePressed: { backgroundColor: Accent[700] },
  doneText: { fontFamily: Type.pageTitle.fontFamily, fontSize: 14, color: Palette.bg },
});
