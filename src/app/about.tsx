/**
 * About yourself — what you do, how smoke affects you, and how you read time.
 *
 * The sports selected here decide which activity chips appear on Today, and
 * the sensitivity feeds straight into the model's ventilation multiplier, so
 * this screen changes every verdict in the app as directly as Thresholds does.
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
  tracking,
} from '@/constants/design-tokens';
import { AboutStrings, Common, ThresholdsStrings } from '@/constants/strings';
import { RAIN_TOL, type Activity, type Sensitivity, type TimeFormat } from '@/lib/rating';
import { useSettings } from '@/lib/settings';

const ACTIVITIES: Activity[] = ['Running', 'Cycling', 'Hiking / Walking'];
const SENSITIVITIES: Sensitivity[] = ['Low', 'Normal', 'Reactive'];
const TIME_FORMATS: TimeFormat[] = ['24-hour', '12-hour'];

export default function AboutScreen() {
  const router = useRouter();
  const { settings, update, toggleSport } = useSettings();

  const tiles: { icon: IconName; value: string; label: string }[] = [
    { icon: 'wind', value: String(settings.ceiling), label: AboutStrings.tileLabels.ceiling },
    { icon: 'droplet', value: RAIN_TOL[settings.rainTol].name, label: AboutStrings.tileLabels.rain },
    {
      icon: 'windAlt',
      value: ThresholdsStrings.windValue(settings.windTol),
      label: AboutStrings.tileLabels.wind,
    },
  ];

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView style={styles.pane} contentContainerStyle={styles.paneContent}>
        <Text style={styles.title}>{AboutStrings.title}</Text>

        <View style={styles.card}>
          <Text style={styles.groupLabel}>{AboutStrings.sportsLabel}</Text>
          <View style={styles.sportRow}>
            {ACTIVITIES.map((a) => {
              const on = settings.sports.includes(a);
              return (
                <Pressable
                  key={a}
                  onPress={() => toggleSport(a)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.sportChip, on ? styles.chipOn : styles.chipOff]}>
                  <Text style={[styles.chipText, { color: on ? Neutral[100] : Neutral[800] }]}>
                    {a}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.groupLabelSpaced}>{AboutStrings.sensitivityLabel}</Text>
          <Text style={styles.advisory}>{AboutStrings.advisory}</Text>
          <View style={styles.chipRow}>
            {SENSITIVITIES.map((s) => {
              const on = s === settings.sensitivity;
              return (
                <Pressable
                  key={s}
                  onPress={() => update({ sensitivity: s })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
                  <Text style={[styles.chipText, { color: on ? Neutral[100] : Neutral[800] }]}>
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.sensNote}>{AboutStrings.sensitivityNote[settings.sensitivity]}</Text>

          <Text style={styles.groupLabelSpaced}>{AboutStrings.timeFormatLabel}</Text>
          <View style={styles.chipRow}>
            {TIME_FORMATS.map((f) => {
              const on = f === settings.timeFmt;
              return (
                <Pressable
                  key={f}
                  onPress={() => update({ timeFmt: f })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
                  <Text style={[styles.chipText, { color: on ? Neutral[100] : Neutral[800] }]}>
                    {f}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={() => router.navigate('/thresholds')}
          accessibilityRole="button"
          accessibilityLabel={AboutStrings.thresholdsLink}
          style={styles.card}>
          <View style={styles.linkRow}>
            <Text style={styles.linkLabel}>{AboutStrings.thresholdsLink}</Text>
            <Icon name="chevronRight" size={17} color={Neutral[600]} />
          </View>
          <View style={styles.tileRow}>
            {tiles.map((t) => (
              <View key={t.label} style={styles.tile}>
                <Icon name={t.icon} size={19} color={Accent2[800]} />
                <Text style={styles.tileValue}>{t.value}</Text>
                <Text style={styles.tileLabel}>{t.label}</Text>
              </View>
            ))}
          </View>
        </Pressable>

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

  groupLabel: {
    ...Type.caption,
    fontFamily: Type.rowLabel.fontFamily,
    letterSpacing: tracking(12, 0.08),
    textTransform: 'uppercase',
    color: Neutral[600],
  },
  groupLabelSpaced: {
    ...Type.caption,
    fontFamily: Type.rowLabel.fontFamily,
    letterSpacing: tracking(12, 0.08),
    textTransform: 'uppercase',
    color: Neutral[600],
    marginTop: Space.four,
  },

  sportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  sportChip: {
    minHeight: 44,
    paddingHorizontal: Space.four,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    justifyContent: 'center',
  },

  chipRow: { flexDirection: 'row', gap: 7, marginTop: 10 },
  chip: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // All three groups here use the sage voice.
  chipOn: { backgroundColor: Accent2[600], borderColor: Accent2[600] },
  chipOff: { backgroundColor: 'transparent', borderColor: Neutral[300] },
  chipText: { ...Type.pillLabel },

  advisory: { ...Type.caption, color: Neutral[700], lineHeight: 12 * 1.4, marginTop: 5 },
  sensNote: { ...Type.bodySmall, color: Neutral[700], lineHeight: 13 * 1.45, marginTop: 10 },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkLabel: { ...Type.rowLabel, flex: 1, color: Palette.text },

  tileRow: { flexDirection: 'row', gap: 8, marginTop: Space.three },
  tile: {
    flex: 1,
    borderRadius: Radius.md,
    backgroundColor: Accent2[200],
    paddingVertical: 11,
    paddingHorizontal: 10,
    gap: 7,
  },
  tileValue: { ...Type.tile, lineHeight: 20, color: Accent2[900] },
  tileLabel: {
    ...Type.capsLabel,
    letterSpacing: tracking(11, 0.04),
    color: Accent2[800],
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
  doneText: {
    fontFamily: Type.pageTitle.fontFamily,
    fontSize: 14,
    color: Palette.bg,
  },
});
