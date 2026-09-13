/**
 * Your thresholds — the limits every verdict in the app is measured against.
 *
 * Changing anything here re-rates Today, the hourly chart, the map zones and
 * all five forecast days immediately. There is no apply step, because the
 * settings are the model's inputs rather than a saved query.
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
import { Common, ThresholdsStrings } from '@/constants/strings';
import { RAIN_TOL, type Sensitivity } from '@/lib/rating';
import { useSettings } from '@/lib/settings';

const SENSITIVITIES: Sensitivity[] = ['Normal', 'Reactive'];

export default function ThresholdsScreen() {
  const router = useRouter();
  const { settings, update } = useSettings();

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView style={styles.pane} contentContainerStyle={styles.paneContent}>
        <Text style={styles.title}>{ThresholdsStrings.title}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{ThresholdsStrings.airCardTitle}</Text>
          <Text style={styles.caption}>{ThresholdsStrings.airCardCaption}</Text>

          <Text style={styles.subLabel}>{ThresholdsStrings.sensitivityLabel}</Text>
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
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{ThresholdsStrings.weatherCardTitle}</Text>
          <Text style={styles.caption}>{ThresholdsStrings.weatherCardCaption}</Text>

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

  sliderTight: { marginTop: 6 },

  subLabel: {
    ...Type.caption,
    fontFamily: Type.rowLabel.fontFamily,
    letterSpacing: tracking(12, 0.08),
    textTransform: 'uppercase',
    color: Neutral[600],
    marginTop: Space.four,
  },

  chipRow: { flexDirection: 'row', gap: 7, marginTop: 8 },
  chip: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sensitivity uses the sage voice, not the terracotta one.
  chipOn: { backgroundColor: Accent2[600], borderColor: Accent2[600] },
  chipOff: { backgroundColor: 'transparent', borderColor: Neutral[300] },
  chipText: { ...Type.pillLabel },

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
