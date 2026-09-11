/**
 * Today — the now-verdict and the shape of the day.
 *
 * Every value on this screen is derived from the rating model at render time,
 * so changing the activity chip (or any threshold, from another screen)
 * re-rates the card, the chart and the window together. There is no separate
 * "apply" step.
 *
 * The model runs only on hours it has every input for. An hour missing any of
 * them shows "—" and takes no colour: the screen never invents a judgment to
 * fill a gap, and a gap never reads as clean air.
 */
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader } from '@/components/app-header';
import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { ActivitySheetBody, AirSheetBody } from '@/components/sheets';
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
import { Attribution, Common, DataStrings, SheetStrings, TodayStrings } from '@/constants/strings';
import { ECCC_ATTRIBUTION } from '@/lib/aqhi';
import { useConditions } from '@/lib/conditions';
import {
  compass,
  currentHour,
  formatAge,
  formatAqhi,
  formatClock,
  formatValue,
  fractionalHour,
  readingOf,
  todayHours,
  type LiveHour,
} from '@/lib/live';
import { OPEN_METEO_ATTRIBUTION } from '@/lib/open-meteo';
import {
  bestWindow,
  effectiveAqhi,
  formatHour,
  formatTick,
  judge,
  quality,
  type Activity,
  type HourReading,
} from '@/lib/rating';
import { useSettings } from '@/lib/settings';

const ACTIVITIES: Activity[] = ['Running', 'Cycling', 'Hiking / Walking'];

/** Chart geometry, from the design. */
const CHART_HEIGHT = 140;
const BAR_BASE = 16;
const BAR_SCALE = 1.16;

export default function TodayScreen() {
  const { settings, activity, setActivity, prefs } = useSettings();
  const { live, aqhi, aqhiCoverage, aqhiNearest, fetchedAt, refreshing, refresh, now: nowMs, place } =
    useConditions();
  const [airOpen, setAirOpen] = useState(false);
  const [actsOpen, setActsOpen] = useState(false);

  const now = fractionalHour(nowMs);
  const hours = todayHours(live, nowMs);
  const nowHour = currentHour(live, nowMs);

  const [selectedHour, setSelectedHour] = useState(() => {
    const h = Math.floor(now);
    return h >= 5 && h <= 21 ? h : 11;
  });

  // The observation is the measured value; the hour's forecast is the fallback
  // when ECCC has not published one. Both are real readings, neither is a
  // substitute, and a reader can tell them apart from the caption.
  const observation = aqhi?.observation ?? null;
  const nowAqhi = observation?.value ?? nowHour?.aqhi?.value ?? null;
  const nowWeather = nowHour?.weather ?? null;
  const nowReading: HourReading | null =
    nowAqhi !== null &&
    nowWeather &&
    nowWeather.temperatureC !== null &&
    nowWeather.windSpeedKmh !== null &&
    nowWeather.precipitationMm !== null
      ? {
          hour: Math.floor(now),
          aqhi: nowAqhi,
          tempC: nowWeather.temperatureC,
          windKmh: nowWeather.windSpeedKmh,
          rainMmH: nowWeather.precipitationMm,
        }
      : null;
  const verdict = nowReading ? judge(nowReading, prefs) : null;

  const tint = verdict ? Verdict.tint[verdict.level] : Palette.surface;
  const ink = verdict ? Verdict.deepInk[verdict.level] : Palette.text;

  const sentence = !verdict
    ? DataStrings.hourIncomplete
    : verdict.level === 0
      ? TodayStrings.clearSentence
      : ((verdict.driver && TodayStrings.sentences[verdict.driver]?.[verdict.level]) ??
        TodayStrings.fallbackSentence);

  const heroCaption = observation
    ? TodayStrings.heroCaption(
        observation.community,
        DataStrings.observedAt(
          formatClock(Date.parse(observation.timestamp), settings.timeFmt),
          formatAge(Date.parse(observation.timestamp), nowMs),
        ),
      )
    : nowHour?.aqhi
      ? TodayStrings.heroCaption(
          nowHour.aqhi.community,
          DataStrings.forecastFor(formatClock(nowHour.epoch, settings.timeFmt)),
        )
      : null;

  const complete = hours.map(readingOf).filter((r): r is HourReading => r !== null);
  const window = bestWindow(complete, now, prefs);
  const windowText = window
    ? TodayStrings.windowSpan(
        formatHour(window.start, settings.timeFmt),
        formatHour(window.end, settings.timeFmt),
        window.end - window.start,
      )
    : TodayStrings.noWindow;

  const selected: LiveHour =
    hours.find((h) => h.hour === selectedHour) ?? hours[0];
  const selectedReading = readingOf(selected);
  const selectedVerdict = selectedReading ? judge(selectedReading, prefs) : null;
  const w = selected.weather;

  const stats = [
    { k: TodayStrings.statKeys.aqhi, v: formatAqhi(selected.aqhi) },
    { k: TodayStrings.statKeys.temp, v: formatValue(w?.temperatureC ?? null, 0, '°C') },
    {
      k: TodayStrings.statKeys.wind,
      v:
        w?.windSpeedKmh === null || w?.windSpeedKmh === undefined
          ? DataStrings.unavailable
          : `${compass(w.windDirectionDeg) ?? ''} ${Math.round(w.windSpeedKmh)}`.trim(),
    },
    { k: TodayStrings.statKeys.rain, v: formatValue(w?.precipitationMm ?? null, 1, ' mm') },
    { k: TodayStrings.statKeys.humidity, v: formatValue(w?.relativeHumidityPct ?? null, 0, '%') },
    {
      k: TodayStrings.statKeys.effective,
      v: selectedReading
        ? effectiveAqhi(selectedReading.aqhi, prefs).toFixed(1)
        : DataStrings.unavailable,
    },
  ];

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView
        style={styles.pane}
        contentContainerStyle={styles.paneContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Accent.base} />
        }>
        {place?.source === 'fallback' && place.label && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{DataStrings.fallbackTitle(place.label)}</Text>
            <Text style={styles.cardNote}>
              {place.fallbackReason === 'denied'
                ? DataStrings.fallbackDenied
                : DataStrings.fallbackUnavailable}
            </Text>
          </View>
        )}

        {aqhiCoverage === 'none' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{DataStrings.noCoverageTitle}</Text>
            <Text style={styles.cardNote}>
              {DataStrings.noCoverageNote(aqhiNearest?.name ?? null, aqhiNearest?.km ?? null)}
            </Text>
          </View>
        )}

        <View style={[styles.verdictCard, { backgroundColor: tint }]}>
          <View style={styles.verdictTop}>
            <View style={styles.verdictLeft}>
              <Text style={[styles.kicker, { color: ink }]}>
                {TodayStrings.kicker(formatClock(nowMs, settings.timeFmt), activity)}
              </Text>
              <View style={styles.heroRow}>
                <Text style={[styles.hero, { color: ink }]}>
                  {observation ? formatAqhi(observation) : formatAqhi(nowHour?.aqhi ?? null)}
                </Text>
                <View style={styles.heroCaption}>
                  <Text style={[styles.heroCapsLabel, { color: ink }]}>{Common.aqhi}</Text>
                  <Text style={[styles.heroOf, { color: ink }]}>{TodayStrings.ofTen}</Text>
                </View>
              </View>
              {heroCaption && (
                <Text style={[styles.heroProvenance, { color: ink }]} numberOfLines={2}>
                  {heroCaption}
                </Text>
              )}
            </View>
            <View style={[styles.verdictPill, { backgroundColor: ink }]}>
              <Text style={styles.verdictPillText}>
                {verdict ? Verdict.word[verdict.level] : DataStrings.unavailable}
              </Text>
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
          <Text style={styles.windowText}>{TodayStrings.bestWindow(windowText)}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>{TodayStrings.chartTitle}</Text>
            <Text style={styles.cardHint}>{TodayStrings.chartHint}</Text>
          </View>

          <View style={styles.chart}>
            {hours.map((hr) => {
              const reading = readingOf(hr);
              const level = reading ? judge(reading, prefs).level : null;
              const past = hr.hour + 1 <= now;
              // An hour the model could not judge is drawn at the minimum
              // height in the neutral track colour — present, but plainly
              // not a reading.
              const height = reading ? BAR_BASE + quality(reading, prefs) * BAR_SCALE : BAR_BASE;
              const colour = level === null ? Neutral[300] : Verdict.ink[level];
              const isSelected = hr.hour === selectedHour;
              return (
                <Pressable
                  key={hr.hour}
                  style={styles.barColumn}
                  onPress={() => setSelectedHour(hr.hour)}
                  accessibilityRole="button"
                  accessibilityLabel={TodayStrings.barLabel(
                    formatHour(hr.hour, settings.timeFmt),
                    hr.aqhi?.value ?? NaN,
                  )}>
                  <View
                    style={[
                      styles.bar,
                      { height, backgroundColor: colour, opacity: past ? 0.28 : 1 },
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
            {hours.map((hr) => (
              <Text
                key={hr.hour}
                style={[
                  styles.tick,
                  { color: hr.hour === selectedHour ? Palette.text : Neutral[600] },
                ]}>
                {hr.hour % 3 === 2 ? formatTick(hr.hour, settings.timeFmt) : ''}
              </Text>
            ))}
          </View>

          <View style={styles.readout}>
            <View style={styles.readoutHead}>
              <Text style={styles.readoutHour}>
                {formatHour(selected.hour, settings.timeFmt)}
                {Math.floor(now) === selected.hour ? TodayStrings.now : ''}
              </Text>
              <View
                style={[
                  styles.readoutPill,
                  {
                    backgroundColor: selectedVerdict
                      ? Verdict.ink[selectedVerdict.level]
                      : Neutral[400],
                  },
                ]}>
                <Text style={styles.readoutPillText}>
                  {selectedVerdict ? Verdict.word[selectedVerdict.level] : DataStrings.unavailable}
                </Text>
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

            {selected.aqhi && (
              <Text style={styles.readoutProvenance}>
                {DataStrings.communityLine(selected.aqhi.community, selected.aqhi.distanceKm)} ·{' '}
                {DataStrings.forecastFor(formatClock(selected.epoch, settings.timeFmt))}
              </Text>
            )}

            <Pressable onPress={() => setAirOpen(true)} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.airLink}>{TodayStrings.airLink}</Text>
            </Pressable>
          </View>
        </View>

        {/*
          The prototype defines this sheet but never wires a trigger to it. The
          handoff describes a comparison row on Today that opens it, so that is
          what this is; its treatment follows the best-window pill.
        */}
        <Pressable
          onPress={() => setActsOpen(true)}
          accessibilityRole="button"
          style={styles.comparisonRow}>
          <Icon name="bars" size={18} color={Neutral[700]} />
          <Text style={styles.comparisonText}>{TodayStrings.comparisonRow}</Text>
          <Icon name="chevronRight" size={17} color={Neutral[600]} />
        </Pressable>

        <View style={styles.attributionBlock}>
          <Text style={styles.attribution}>{Attribution.today}</Text>
          <Text style={styles.attribution}>{OPEN_METEO_ATTRIBUTION}</Text>
          <Text style={styles.attribution}>{ECCC_ATTRIBUTION}</Text>
          {fetchedAt !== null && (
            <Text style={styles.attribution}>
              {DataStrings.fetchedAge(formatAge(fetchedAt, nowMs))}
            </Text>
          )}
        </View>
      </ScrollView>

      <Sheet visible={airOpen} title={SheetStrings.airTitle} onClose={() => setAirOpen(false)}>
        <AirSheetBody
          observation={observation}
          weather={nowWeather}
          timeFmt={settings.timeFmt}
          nowMs={nowMs}
        />
      </Sheet>

      <Sheet
        visible={actsOpen}
        title={SheetStrings.activityTitle}
        onClose={() => setActsOpen(false)}>
        <ActivitySheetBody
          aqhi={nowAqhi}
          prefs={prefs}
          onPick={(a) => {
            setActivity(a);
            setActsOpen(false);
          }}
        />
      </Sheet>
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

  verdictCard: { borderRadius: Radius.lg, padding: Space.four },
  verdictTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.three },
  verdictLeft: { flex: 1, minWidth: 0 },
  kicker: Type.kicker,
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 },
  hero: Type.heroNumber,
  heroCaption: { gap: 1, paddingBottom: 10 },
  heroCapsLabel: { ...Type.capsLabel, textTransform: 'none' },
  heroOf: { ...Type.bodySmall, opacity: 0.75 },
  heroProvenance: { ...Type.bodySmall, opacity: 0.85, marginTop: 2 },
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
  cardNote: { ...Type.bodySmall, color: Neutral[700], lineHeight: 13 * 1.4, marginTop: 3 },

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
  readoutProvenance: { ...Type.caption, color: Neutral[600], marginTop: 10 },

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

  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Neutral[200],
    borderRadius: Radius.pill,
    paddingVertical: 12,
    paddingHorizontal: Space.four,
    minHeight: 44,
  },
  comparisonText: { ...Type.pillLabel, flex: 1, color: Neutral[800] },

  attributionBlock: { gap: 4 },
  attribution: { ...Type.caption, color: Neutral[600], lineHeight: 12 * 1.4 },
});
