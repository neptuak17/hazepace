/**
 * About yourself — what you do, how smoke affects you, your weather limits,
 * and how the app shows time.
 *
 * Everything every verdict depends on is set here: the sports decide which
 * activity chips appear on Today, the sensitivity picks which row of ECCC's
 * AQHI guidance the air level is read from, and the three limits are what
 * rain, wind and heat are measured against. A change re-rates Today, the
 * chart, the map and all five forecast days at once; there is no apply step.
 */
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Slider } from '@/components/slider';
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
import { useSettings, type AppearanceChoice } from '@/lib/settings';

const ACTIVITIES: Activity[] = ['Running', 'Cycling', 'Hiking / Walking'];
const SENSITIVITIES: Sensitivity[] = ['Normal', 'Reactive'];
const TIME_FORMATS: TimeFormat[] = ['24-hour', '12-hour'];
const APPEARANCES: AppearanceChoice[] = ['system', 'light', 'dark'];

export default function AboutScreen() {
  const router = useRouter();
  const { settings, update, toggleSport } = useSettings();

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

          <Text style={styles.groupLabelSpaced}>{AboutStrings.appearanceLabel}</Text>
          <View style={styles.chipRow}>
            {APPEARANCES.map((a) => {
              const on = a === settings.appearance;
              return (
                <Pressable
                  key={a}
                  onPress={() => update({ appearance: a })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
                  <Text style={[styles.chipText, { color: on ? Neutral[100] : Neutral[800] }]}>
                    {AboutStrings.appearanceNames[a]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* On this page rather than one of its own, where it was easy to
            miss: the limits sit beside the sports and sensitivity they work
            with. */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{ThresholdsStrings.title}</Text>
          <Text style={styles.caption}>{ThresholdsStrings.caption}</Text>

          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>{ThresholdsStrings.rainLabel}</Text>
            <Text style={styles.limitValue}>{RAIN_TOL[settings.rainTol].name}</Text>
          </View>
          <Slider
            value={settings.rainTol}
            min={0}
            max={3}
            step={1}
            onChange={(rainTol) => update({ rainTol })}
            label={ThresholdsStrings.rainSliderLabel}
            valueLabel={RAIN_TOL[settings.rainTol].name}
            style={styles.sliderTight}
          />
          <Text style={styles.note}>{RAIN_TOL[settings.rainTol].note}</Text>

          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>{ThresholdsStrings.windLabel}</Text>
            <Text style={styles.limitValue}>{ThresholdsStrings.windValue(settings.windTol)}</Text>
          </View>
          <Slider
            value={settings.windTol}
            min={8}
            max={40}
            step={4}
            onChange={(windTol) => update({ windTol })}
            label={ThresholdsStrings.windSliderLabel}
            valueLabel={ThresholdsStrings.windValue(settings.windTol)}
            style={styles.sliderTight}
          />
          <Text style={styles.note}>{ThresholdsStrings.windNote(settings.windTol)}</Text>

          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>{ThresholdsStrings.heatLabel}</Text>
            <Text style={styles.limitValue}>{ThresholdsStrings.heatValue(settings.heatTol)}</Text>
          </View>
          <Slider
            value={settings.heatTol}
            min={22}
            max={38}
            step={2}
            onChange={(heatTol) => update({ heatTol })}
            label={ThresholdsStrings.heatSliderLabel}
            valueLabel={ThresholdsStrings.heatValue(settings.heatTol)}
            style={styles.sliderTight}
          />
          <Text style={styles.note}>{ThresholdsStrings.heatNote(settings.heatTol)}</Text>
        </View>

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
  caption: {
    ...Type.bodySmall,
    color: Neutral[700],
    lineHeight: 13 * 1.35,
    marginTop: 3,
  },

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

  sliderTight: { marginTop: 6 },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: Space.four,
  },
  limitLabel: {
    ...Type.caption,
    fontFamily: Type.rowLabel.fontFamily,
    letterSpacing: tracking(12, 0.08),
    textTransform: 'uppercase',
    color: Neutral[600],
    flex: 1,
  },
  limitValue: { ...Type.pillLabel, color: Accent[700] },
  note: { ...Type.caption, color: Neutral[600] },

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
