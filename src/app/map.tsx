/**
 * Map — where the smoke is.
 *
 * The map plate itself is not built. The design's plate is a CSS stand-in and
 * production needs a real tile layer plus the BlueSky Canada plume raster;
 * until both exist the area is left as a labelled placeholder rather than
 * approximated, because a fake plume would be a fake reading.
 *
 * The scrub chips and the zone ratings are real: each zone's AQHI is banded
 * through the same model as every other screen, so a threshold change re-rates
 * these rows too.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import {
  Accent,
  Card,
  Neutral,
  Palette,
  Radius,
  Space,
  Type,
  Verdict,
  tracking,
} from '@/constants/design-tokens';
import { Attribution, Common, MapStrings } from '@/constants/strings';
import { band, formatHour } from '@/lib/rating';
import { useSettings } from '@/lib/settings';

/** The hours the plume model is sampled at. */
const PLUME_HOURS = [8, 11, 14, 17];

/**
 * Zone fixtures, from the design prototype. NOT REAL OBSERVATIONS — see
 * `lib/fixtures.ts`. Each zone holds one AQHI per plume hour.
 */
const ZONES = [
  { key: 'lake', name: 'Kal Lake Road · lakeshore', aqhi: [8, 5, 3, 4] },
  { key: 'bench', name: 'The Bench · East Hill', aqhi: [7, 4, 3, 3] },
  { key: 'star', name: 'Silver Star · 1,610 m', aqhi: [3, 2, 2, 2] },
];

export default function MapScreen() {
  const { settings, prefs } = useSettings();
  const [plume, setPlume] = useState(0);

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView style={styles.pane} contentContainerStyle={styles.paneContent}>
        <Text style={styles.title}>{MapStrings.title}</Text>

        <View style={styles.chipRow}>
          {PLUME_HOURS.map((h, i) => {
            const on = i === plume;
            return (
              <Pressable
                key={h}
                onPress={() => setPlume(i)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
                <Text style={[styles.chipText, { color: on ? Neutral[100] : Neutral[800] }]}>
                  {formatHour(h, settings.timeFmt)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.plate}>
          <Text style={styles.plateTitle}>{MapStrings.plateTitle}</Text>
          <Text style={styles.plateNote}>{MapStrings.plateNote}</Text>
        </View>

        <View style={styles.legendRow}>
          <Text style={styles.legend}>
            {MapStrings.legend(formatHour(PLUME_HOURS[plume], settings.timeFmt))}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardKicker}>{MapStrings.zonesKicker}</Text>
          <View style={styles.zoneList}>
            {ZONES.map((zone) => {
              const aqhi = zone.aqhi[plume];
              const level = band(aqhi, prefs);
              return (
                <View key={zone.key} style={styles.zoneRow}>
                  <View style={[styles.zoneCircle, { backgroundColor: Verdict.tint[level] }]}>
                    <Text style={[styles.zoneNumber, { color: Verdict.ink[level] }]}>{aqhi}</Text>
                    <Text style={[styles.zoneCaps, { color: Verdict.deepInk[level] }]}>{Common.aqhi}</Text>
                  </View>
                  <View style={styles.zoneNameWrap}>
                    <Text style={styles.zoneName}>{zone.name}</Text>
                  </View>
                  <Text style={[styles.zoneWord, { color: Verdict.ink[level] }]}>
                    {Verdict.word[level]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={styles.attribution}>{Attribution.map}</Text>
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

  chipRow: { flexDirection: 'row', gap: 6 },
  chip: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: Accent[600], borderColor: Accent[600] },
  chipOff: { backgroundColor: 'transparent', borderColor: Neutral[300] },
  chipText: { ...Type.bodySmall, fontFamily: Type.rowLabel.fontFamily },

  plate: {
    height: 340,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Neutral[300],
    backgroundColor: Neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.five,
    gap: Space.two,
  },
  plateTitle: { ...Type.dayRow, color: Neutral[700] },
  plateNote: {
    ...Type.bodySmall,
    color: Neutral[600],
    textAlign: 'center',
    lineHeight: 13 * 1.4,
  },

  legendRow: { flexDirection: 'row' },
  legend: {
    ...Type.capsLabel,
    textTransform: 'none',
    letterSpacing: 0,
    color: Neutral[700],
    backgroundColor: 'rgba(249,244,237,0.8)',
    borderRadius: Radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
    overflow: 'hidden',
  },

  card: Card,
  cardKicker: {
    ...Type.caption,
    fontFamily: Type.rowLabel.fontFamily,
    letterSpacing: tracking(12),
    textTransform: 'uppercase',
    color: Neutral[600],
  },
  zoneList: { gap: 2, marginTop: 8 },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.three,
    paddingVertical: 11,
    borderTopWidth: 1.5,
    borderTopColor: Palette.divider,
    minHeight: 44,
  },
  zoneCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  zoneNumber: { ...Type.zoneNumber, lineHeight: 18 },
  zoneCaps: { ...Type.zoneCaps, letterSpacing: tracking(9.5, 0.04), lineHeight: 10 },
  zoneNameWrap: { flex: 1, minWidth: 0 },
  zoneName: { ...Type.rowLabel, color: Palette.text },
  zoneWord: { ...Type.caption, fontFamily: Type.rowLabel.fontFamily, letterSpacing: tracking(12, 0.04) },

  attribution: { ...Type.caption, color: Neutral[600], lineHeight: 12 * 1.4 },
});
