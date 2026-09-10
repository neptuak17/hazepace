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
import { Attribution, Common, HowItWorksStrings } from '@/constants/strings';
import { NOW, hourAt } from '@/lib/fixtures';
import { factorLevels, judge, type Driver } from '@/lib/rating';
import { useSettings } from '@/lib/settings';

/** Icons for HowItWorksStrings.pages, paired by position. */
const PAGE_ICONS: IconName[] = ['tabToday', 'tabMap', 'tabForecast'];

const BAND_LEVELS: Level[] = [0, 1, 2];

/** The design's factor bar: 14, 27 or 40px by level. */
const factorBarHeight = (level: Level) => 14 + level * 13;

export default function HowItWorksScreen() {
  const router = useRouter();
  const { prefs } = useSettings();

  const nowHour = hourAt(NOW);
  const now = judge(nowHour, prefs);
  const factors = factorLevels(nowHour, prefs);

  const factorTiles: { name: string; level: Level }[] = [
    { name: HowItWorksStrings.factorNames.smoke, level: factors.air },
    { name: HowItWorksStrings.factorNames.rain, level: factors.rain },
    { name: HowItWorksStrings.factorNames.heat, level: factors.heat },
    { name: HowItWorksStrings.factorNames.wind, level: factors.wind },
  ];

  const winner = now.driver
    ? HowItWorksStrings.winner(HowItWorksStrings.driverWord[now.driver])
    : HowItWorksStrings.noWinner;

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView style={styles.pane} contentContainerStyle={styles.paneContent}>
        <Text style={styles.title}>{HowItWorksStrings.title}</Text>

        <View style={[styles.card, styles.pagesCard]}>
          {HowItWorksStrings.pages.map((p, i) => (
            <View key={p.name} style={styles.pageRow}>
              <View style={styles.pageBadge}>
                <Icon name={PAGE_ICONS[i]} size={19} color={Accent2[800]} />
              </View>
              <View style={styles.pageText}>
                <Text style={styles.cardTitle}>{p.name}</Text>
                <Text style={styles.body}>{p.what}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{HowItWorksStrings.verdictTitle}</Text>
          <View style={styles.bandList}>
            {BAND_LEVELS.map((level) => (
              <View
                key={level}
                style={[styles.bandRow, { backgroundColor: Verdict.tint[level] }]}>
                <View style={[styles.bandPill, { backgroundColor: Verdict.ink[level] }]}>
                  <Text style={styles.bandPillText}>{Verdict.word[level]}</Text>
                </View>
                <Text style={[styles.bandWhat, { color: Verdict.ink[level] }]}>
                  {HowItWorksStrings.bands[level]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{HowItWorksStrings.factorsTitle}</Text>
          <Text style={styles.caption}>{HowItWorksStrings.factorsCaption}</Text>
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
          <Text style={styles.cardTitle}>{HowItWorksStrings.ventTitle}</Text>
          <Text style={styles.caption}>{HowItWorksStrings.ventCaption}</Text>
          <View style={styles.ventRow}>
            {HowItWorksStrings.ventTiles.map((v) => (
              <View key={v.name} style={styles.ventTile}>
                <Text style={styles.ventMult}>{v.mult}</Text>
                <Text style={styles.ventName}>{v.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{HowItWorksStrings.sourcesTitle}</Text>
          <View style={styles.sourceList}>
            {Attribution.sources.map((s) => (
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

        <Text style={styles.closing}>{HowItWorksStrings.closing}</Text>

        <Pressable
          onPress={() => router.navigate('/')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.done, pressed && styles.donePressed]}>
          <Text style={styles.doneText}>{Common.done}</Text>
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
