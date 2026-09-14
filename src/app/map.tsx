/**
 * Map — where the smoke is.
 *
 * The map plate itself is not built. The design's plate is a CSS stand-in and
 * production needs a real tile layer plus the BlueSky Canada plume raster;
 * until both exist the area is left as a labelled placeholder rather than
 * approximated, because a fake plume would be a fake reading.
 *
 * The design had three sub-community zones. AQHI is one value per community
 * and no finer source exists, so the zone card holds one row: the community
 * the reading is from, how far away it is, and how old it is.
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
import { Common, DataStrings, HeaderStrings, MapStrings } from '@/constants/strings';
import { ECCC_ATTRIBUTION } from '@/lib/aqhi';
import { useConditions } from '@/lib/conditions';
import { FAR_COMMUNITY_KM, currentHour, formatAge, formatAqhi, formatClock } from '@/lib/live';
import { OPEN_METEO_ATTRIBUTION } from '@/lib/open-meteo';
import { band } from '@/lib/rating';
import { useSettings } from '@/lib/settings';

/**
 * The plume scrub hours from the design. There is no plume data to scrub, so
 * these chips select nothing yet; they stay so the layout matches.
 */
const PLUME_HOURS = [8, 11, 14, 17];

export default function MapScreen() {
  const { settings, prefs } = useSettings();
  const { aqhi, aqhiCoverage, live, now: nowMs, place } = useConditions();
  const [plume, setPlume] = useState(0);

  const observation = aqhi?.observation ?? null;
  const level = observation?.value === null || observation === null ? null : band(observation.value, prefs);

  // With no ECCC community in range, the row is the model's AQHI for this
  // hour, named as such, and banded like any other.
  const nowHour = currentHour(live, nowMs);
  const estimate = nowHour?.aqhiEstimate ?? null;
  const estimateLevel = estimate ? band(estimate.value, prefs) : null;
  const far = aqhi !== null && aqhi.distanceKm > FAR_COMMUNITY_KM;

  const legendTime = formatClock(nowMs, settings.timeFmt);
  // The legend names where the air reading is for: the ECCC community when
  // there is one, otherwise the place itself — the same rule as the header.
  const legendPlace = aqhi?.community.name ?? place?.label ?? HeaderStrings.deviceHeadline;

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView style={styles.pane} contentContainerStyle={styles.paneContent}>
        <Text style={styles.title}>{MapStrings.title}</Text>

        <View style={styles.chipRow}>
          {PLUME_HOURS.map((h, i) => {
            const on = i === plume;
            const label = formatClock(new Date(nowMs).setHours(h, 0, 0, 0), settings.timeFmt);
            return (
              <Pressable
                key={h}
                onPress={() => setPlume(i)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.chip, on ? styles.chipOn : styles.chipOff]}>
                <Text style={[styles.chipText, { color: on ? Neutral[100] : Neutral[800] }]}>
                  {label}
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
            {MapStrings.legend(legendPlace, legendTime)}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardKicker}>{MapStrings.communityKicker}</Text>
          <View style={styles.zoneList}>
            {aqhiCoverage === 'none' ? (
              <View style={styles.zoneRow}>
                <View
                  style={[
                    styles.zoneCircle,
                    { backgroundColor: estimateLevel === null ? Neutral[200] : Verdict.tint[estimateLevel] },
                  ]}>
                  <Text
                    style={[
                      styles.zoneNumber,
                      { color: estimateLevel === null ? Neutral[600] : Verdict.ink[estimateLevel] },
                    ]}>
                    {formatAqhi(estimate)}
                  </Text>
                  <Text
                    style={[
                      styles.zoneCaps,
                      { color: estimateLevel === null ? Neutral[600] : Verdict.deepInk[estimateLevel] },
                    ]}>
                    {Common.aqhi}
                  </Text>
                </View>
                <View style={styles.zoneNameWrap}>
                  <Text style={styles.zoneName}>{DataStrings.modelSource}</Text>
                  <Text style={styles.zoneMeta}>
                    {estimate && nowHour
                      ? DataStrings.forecastFor(formatClock(nowHour.epoch, settings.timeFmt))
                      : DataStrings.unavailable}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.zoneRow}>
                <View
                  style={[
                    styles.zoneCircle,
                    { backgroundColor: level === null ? Neutral[200] : Verdict.tint[level] },
                  ]}>
                  <Text
                    style={[
                      styles.zoneNumber,
                      { color: level === null ? Neutral[600] : Verdict.ink[level] },
                    ]}>
                    {formatAqhi(observation)}
                  </Text>
                  <Text
                    style={[
                      styles.zoneCaps,
                      { color: level === null ? Neutral[600] : Verdict.deepInk[level] },
                    ]}>
                    {Common.aqhi}
                  </Text>
                </View>
                <View style={styles.zoneNameWrap}>
                  <Text style={styles.zoneName}>
                    {aqhi
                      ? far
                        ? DataStrings.communityFar(aqhi.community.name, aqhi.distanceKm)
                        : DataStrings.communityLine(aqhi.community.name, aqhi.distanceKm)
                      : DataStrings.unavailable}
                  </Text>
                  <Text style={styles.zoneMeta}>
                    {observation
                      ? DataStrings.observedAt(
                          formatClock(Date.parse(observation.timestamp), settings.timeFmt),
                          formatAge(Date.parse(observation.timestamp), nowMs),
                        )
                      : DataStrings.unavailable}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.zoneWord,
                    { color: level === null ? Neutral[600] : Verdict.ink[level] },
                  ]}>
                  {level === null ? DataStrings.unavailable : Verdict.word[level]}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.attributionBlock}>
          <Text style={styles.attribution}>{OPEN_METEO_ATTRIBUTION}</Text>
          <Text style={styles.attribution}>{ECCC_ATTRIBUTION}</Text>
        </View>
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
  zoneMeta: { ...Type.caption, color: Neutral[600], marginTop: 2 },
  zoneWord: { ...Type.caption, fontFamily: Type.rowLabel.fontFamily, letterSpacing: tracking(12, 0.04) },

  attributionBlock: { gap: 4 },
  attribution: { ...Type.caption, color: Neutral[600], lineHeight: 12 * 1.4 },
});
