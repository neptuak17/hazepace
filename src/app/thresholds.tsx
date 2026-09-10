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
import { RAIN_TOL, type Sensitivity } from '@/lib/rating';
import { useSettings } from '@/lib/settings';

const SENSITIVITIES: Sensitivity[] = ['Low', 'Normal', 'Reactive'];

/**
 * How permissive the chosen ceiling is.
 *
 * The design labelled the top of the range "not recommended", which is advice
 * about a limit rather than a description of it. These describe where the
 * setting sits and leave the judgement to the user.
 */
function ceilingWord(ceiling: number): string {
  if (ceiling <= 3) return 'cautious';
  if (ceiling <= 5) return 'typical';
  if (ceiling <= 7) return 'permissive';
  return 'very permissive';
}

function windLabel(windTol: number): string {
  return windTol >= 40 ? 'any wind' : `${windTol} km/h`;
}

function windNote(windTol: number): string {
  if (windTol <= 16) return 'a breeze turns it amber';
  if (windTol >= 36) return 'only a gale stops you';
  return 'typical tolerance';
}

export default function ThresholdsScreen() {
  const router = useRouter();
  const { settings, update } = useSettings();

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView style={styles.pane} contentContainerStyle={styles.paneContent}>
        <Text style={styles.title}>Your thresholds</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Air quality limits</Text>
          <Text style={styles.caption}>
            Your tolerance for air quality. Always follow local government recommendations and
            advisories.
          </Text>

          <View style={styles.valueRow}>
            <Text style={styles.bigValue}>{settings.ceiling}</Text>
            <Text style={styles.valueMeta}>AQHI · {ceilingWord(settings.ceiling)}</Text>
          </View>

          <Slider
            value={settings.ceiling}
            min={2}
            max={9}
            step={1}
            onChange={(ceiling) => update({ ceiling })}
            label="Air quality ceiling"
            valueLabel={`AQHI ${settings.ceiling}, ${ceilingWord(settings.ceiling)}`}
            style={styles.sliderTop}
          />

          <Text style={styles.subLabel}>Air quality sensitivity</Text>
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
          <Text style={styles.cardTitle}>Weather limits</Text>
          <Text style={styles.caption}>How much rain and wind you will train in.</Text>

          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>Rain</Text>
            <Text style={styles.limitValue}>{RAIN_TOL[settings.rainTol].name}</Text>
          </View>
          <Slider
            value={settings.rainTol}
            min={0}
            max={3}
            step={1}
            onChange={(rainTol) => update({ rainTol })}
            label="Rain tolerance"
            valueLabel={RAIN_TOL[settings.rainTol].name}
            style={styles.sliderTight}
          />
          <Text style={styles.note}>{RAIN_TOL[settings.rainTol].note}</Text>

          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>Wind</Text>
            <Text style={styles.limitValue}>{windLabel(settings.windTol)}</Text>
          </View>
          <Slider
            value={settings.windTol}
            min={8}
            max={40}
            step={4}
            onChange={(windTol) => update({ windTol })}
            label="Wind tolerance"
            valueLabel={windLabel(settings.windTol)}
            style={styles.sliderTight}
          />
          <Text style={styles.note}>{windNote(settings.windTol)}</Text>
        </View>

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
  caption: {
    ...Type.bodySmall,
    color: Neutral[700],
    lineHeight: 13 * 1.35,
    marginTop: 3,
  },

  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: Space.three,
  },
  bigValue: { ...Type.ceiling, lineHeight: 44, color: Accent[700] },
  valueMeta: { ...Type.pillLabel, fontFamily: Type.body.fontFamily, color: Neutral[700] },

  sliderTop: { marginTop: Space.three },
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
