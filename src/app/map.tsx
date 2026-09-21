/**
 * Map — where the smoke is.
 *
 * The map plate itself is not built. The design's plate is a CSS stand-in and
 * production needs a real tile layer plus the BlueSky Canada plume raster;
 * until both exist the area is left as a labelled placeholder rather than
 * approximated, because a fake plume would be a fake reading.
 *
 * The design had three sub-community zones and a plume time scrubber. AQHI
 * is one value per community and no finer source exists, and there is no
 * plume to scrub, so the page shows current conditions only: a card with
 * the AQHI the verdict is using, and — when that is the model's number — the
 * nearest ECCC community within the Map's wider range, for context.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import {
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
import { ECCC_ATTRIBUTION, type AqhiSnapshot } from '@/lib/aqhi';
import { useConditions } from '@/lib/conditions';
import { FAR_COMMUNITY_KM, currentHour, formatAge, formatAqhi, formatClock } from '@/lib/live';
import { OPEN_METEO_ATTRIBUTION } from '@/lib/open-meteo';
import { band, type Level, type Prefs, type TimeFormat } from '@/lib/rating';
import { useSettings } from '@/lib/settings';

/** One row of the card: a banded AQHI circle, a name, a line of provenance. */
function ZoneRow({
  value,
  level,
  name,
  meta,
}: {
  value: string;
  level: Level | null;
  name: string;
  meta: string;
}) {
  const ink = level === null ? Neutral[600] : Verdict.ink[level];
  return (
    <View style={styles.zoneRow}>
      <View
        style={[
          styles.zoneCircle,
          { backgroundColor: level === null ? Neutral[200] : Verdict.tint[level] },
        ]}>
        <Text style={[styles.zoneNumber, { color: ink }]}>{value}</Text>
        <Text
          style={[
            styles.zoneCaps,
            { color: level === null ? Neutral[600] : Verdict.deepInk[level] },
          ]}>
          {Common.aqhi}
        </Text>
      </View>
      <View style={styles.zoneNameWrap}>
        <Text style={styles.zoneName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.zoneMeta} numberOfLines={2}>
          {meta}
        </Text>
      </View>
      <Text style={[styles.zoneWord, { color: ink }]}>
        {level === null ? DataStrings.unavailable : Verdict.word[level]}
      </Text>
    </View>
  );
}

/**
 * The row for an ECCC community: its observation, how far, how old. The
 * name has the line to itself; the distance sits with the time beneath it,
 * so a long community name cannot push the distance off the end.
 */
function communityRow(
  snapshot: AqhiSnapshot,
  prefs: Prefs,
  timeFmt: TimeFormat,
  nowMs: number,
): { value: string; level: Level | null; name: string; meta: string } {
  const observation = snapshot.observation;
  const level = observation && observation.value !== null ? band(observation.value, prefs) : null;
  const distance =
    snapshot.distanceKm > FAR_COMMUNITY_KM
      ? DataStrings.distanceFar(snapshot.distanceKm)
      : DataStrings.distance(snapshot.distanceKm);
  const observed = observation
    ? DataStrings.observedAt(
        formatClock(Date.parse(observation.timestamp), timeFmt),
        formatAge(Date.parse(observation.timestamp), nowMs),
      )
    : DataStrings.unavailable;
  return {
    value: formatAqhi(observation),
    level,
    name: snapshot.community.name,
    meta: `${distance} · ${observed}`,
  };
}

export default function MapScreen() {
  const { settings, prefs } = useSettings();
  const { aqhi, aqhiCoverage, aqhiFar, live, now: nowMs, place } = useConditions();

  // The rows, in order: the AQHI the verdict is using first, then the
  // nearest community for context when that is not the same thing.
  //   ≤ 100 km   community row only (it is what the verdict uses)
  //   100–200 km model row, then the community row
  //   > 200 km   model row only
  const rows: { key: string; value: string; level: Level | null; name: string; meta: string }[] = [];

  if (aqhiCoverage === 'none') {
    const nowHour = currentHour(live, nowMs);
    const estimate = nowHour?.aqhiEstimate ?? null;
    rows.push({
      key: 'model',
      value: formatAqhi(estimate),
      level: estimate ? band(estimate.value, prefs) : null,
      name: DataStrings.modelSource,
      // Same shape as the community row's meta — where, then when — with
      // "this location" where a community would have a distance.
      meta:
        estimate && nowHour
          ? `${DataStrings.thisLocation} · ${DataStrings.forecastFor(formatClock(nowHour.epoch, settings.timeFmt))}`
          : DataStrings.unavailable,
    });
  }

  const community = aqhi ?? aqhiFar;
  if (community) {
    rows.push({ key: 'community', ...communityRow(community, prefs, settings.timeFmt, nowMs) });
  }

  const legendTime = formatClock(nowMs, settings.timeFmt);
  // The legend names where the air reading is for: the ECCC community when
  // there is one in the model's range, otherwise the place itself — the
  // same rule as the header.
  const legendPlace = aqhi?.community.name ?? place?.label ?? HeaderStrings.deviceHeadline;

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView style={styles.pane} contentContainerStyle={styles.paneContent}>
        <Text style={styles.title}>{MapStrings.title}</Text>

        <View style={styles.plate}>
          <Text style={styles.plateTitle}>{MapStrings.plateTitle}</Text>
          <Text style={styles.plateNote}>{MapStrings.plateNote}</Text>
        </View>

        <View style={styles.legendRow}>
          <Text style={styles.legend}>{MapStrings.legend(legendPlace, legendTime)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardKicker}>{MapStrings.communityKicker}</Text>
          <View style={styles.zoneList}>
            {rows.map((r) => (
              <ZoneRow key={r.key} value={r.value} level={r.level} name={r.name} meta={r.meta} />
            ))}
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
    backgroundColor: Palette.veil,
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
