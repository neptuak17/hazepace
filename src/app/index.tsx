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
import { usePlacesSheet } from '@/components/places-sheet';
import { Sheet } from '@/components/sheet';
import { AirSheetBody } from '@/components/sheets';
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
import {
  Attribution,
  Common,
  DataStrings,
  HowItWorksStrings,
  SheetStrings,
  TodayStrings,
} from '@/constants/strings';
import { ECCC_ATTRIBUTION, categoryFor } from '@/lib/aqhi';
import { useConditions } from '@/lib/conditions';
import {
  aqhiOf,
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
  factorLevels,
  formatHour,
  formatTick,
  judge,
  quality,
  type Activity,
  type FactorLevels,
  type HourReading,
  type Level,
} from '@/lib/rating';
import { useSettings } from '@/lib/settings';

const ACTIVITIES: Activity[] = ['Running', 'Cycling', 'Hiking / Walking'];

/** Chart geometry, from the design. */
const CHART_HEIGHT = 140;
const BAR_BASE = 16;
const BAR_SCALE = 1.16;
/** The selection ring's stroke, and how far outside the bar it sits. */
const RING_WIDTH = 2.5;

export default function TodayScreen() {
  const { settings, activity, setActivity, prefs } = useSettings();
  const { live, aqhi, fetchedAt, refreshing, refresh, now: nowMs, place } = useConditions();
  const placesSheet = usePlacesSheet();
  const [airOpen, setAirOpen] = useState(false);

  const now = fractionalHour(nowMs);
  const hours = todayHours(live, nowMs);
  const nowHour = currentHour(live, nowMs);

  const [selectedHour, setSelectedHour] = useState(() => {
    const h = Math.floor(now);
    return h >= 5 && h <= 21 ? h : 11;
  });

  // The hero's AQHI, in order of preference: ECCC's observation (measured),
  // ECCC's forecast for this hour, then the Open-Meteo estimate. None is a
  // substitute for another — each carries its own caption, so a reader can
  // always tell a measurement from a forecast from a model.
  const observation = aqhi?.observation ?? null;
  const nowEccc = nowHour?.aqhi && nowHour.aqhi.value !== null ? nowHour.aqhi : null;
  const nowEstimate = nowHour?.aqhiEstimate ?? null;
  const heroReading = observation?.value !== null && observation ? observation : (nowEccc ?? nowEstimate);
  const nowAqhi = heroReading?.value ?? null;
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

  let heroCaption: string | null = null;
  if (heroReading === observation && observation) {
    heroCaption = TodayStrings.heroCaption(
      observation.community,
      DataStrings.observedAt(
        formatClock(Date.parse(observation.timestamp), settings.timeFmt),
        formatAge(Date.parse(observation.timestamp), nowMs),
      ),
    );
  } else if (heroReading === nowEccc && nowEccc && nowHour) {
    heroCaption = TodayStrings.heroCaption(
      nowEccc.community,
      DataStrings.forecastFor(formatClock(nowHour.epoch, settings.timeFmt)),
    );
  } else if (heroReading === nowEstimate && nowEstimate && nowHour) {
    heroCaption = TodayStrings.heroCaption(
      DataStrings.modelSource,
      DataStrings.forecastFor(formatClock(nowHour.epoch, settings.timeFmt)),
    );
  }

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
  // Each factor's own level, so the stat that is driving the verdict can be
  // tinted. Null when the model could not run on this hour.
  const selectedFactors: FactorLevels | null = selectedReading
    ? factorLevels(selectedReading, prefs)
    : null;
  const w = selected.weather;
  const selectedAqhi = aqhiOf(selected);

  // A stat's `level` is its factor's level when the model judged it; stats
  // the model does not read (humidity, the category) have none. Only amber
  // and red draw a chip — a clean stat says nothing, on purpose.
  const stats: { k: string; v: string; level: Level | null }[] = [
    {
      k: TodayStrings.statKeys.aqhi,
      v: formatAqhi(selectedAqhi?.source === 'estimate' ? selected.aqhiEstimate : selected.aqhi),
      level: selectedFactors?.air ?? null,
    },
    {
      k: TodayStrings.statKeys.temp,
      v: formatValue(w?.temperatureC ?? null, 0, '°C'),
      level: selectedFactors?.heat ?? null,
    },
    {
      k: TodayStrings.statKeys.wind,
      v:
        w?.windSpeedKmh === null || w?.windSpeedKmh === undefined
          ? DataStrings.unavailable
          : `${compass(w.windDirectionDeg) ?? ''} ${Math.round(w.windSpeedKmh)}`.trim(),
      level: selectedFactors?.wind ?? null,
    },
    {
      k: TodayStrings.statKeys.rain,
      v: formatValue(w?.precipitationMm ?? null, 1, ' mm'),
      level: selectedFactors?.rain ?? null,
    },
    {
      k: TodayStrings.statKeys.humidity,
      v: formatValue(w?.relativeHumidityPct ?? null, 0, '%'),
      level: null,
    },
    {
      k: TodayStrings.statKeys.category,
      v: categoryFor(selectedAqhi?.value ?? null) ?? DataStrings.unavailable,
      level: null,
    },
  ];

  const pillText = !selectedVerdict
    ? DataStrings.unavailable
    : selectedVerdict.driver
      ? TodayStrings.pillWithDriver(
          Verdict.word[selectedVerdict.level],
          HowItWorksStrings.driverWord[selectedVerdict.driver],
        )
      : Verdict.word[selectedVerdict.level];

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
            <Pressable
              onPress={placesSheet.open}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.cardAction}>
              <Text style={styles.cardActionText}>{DataStrings.choosePlace}</Text>
            </Pressable>
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
                  {formatAqhi(heroReading)}
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
              const height = reading ? BAR_BASE + quality(reading) * BAR_SCALE : BAR_BASE;
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
                    aqhiOf(hr)?.value ?? NaN,
                  )}>
                  <View
                    style={[
                      styles.bar,
                      { height, backgroundColor: colour, opacity: past ? 0.28 : 1 },
                    ]}
                  />
                  {/* The design rings the selected bar with a box-shadow spread.
                      RN has no outline, so the ring is a sibling inset outward
                      by its own width on every side — the height is the bar's
                      plus one ring width top and bottom, to match the
                      left/right/bottom offsets — so it sits outside the bar
                      rather than eating into it. */}
                  {isSelected && (
                    <View
                      pointerEvents="none"
                      style={[styles.barRing, { height: height + RING_WIDTH * 2 }]}
                    />
                  )}
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
                <Text style={styles.readoutPillText}>{pillText}</Text>
              </View>
            </View>

            <View style={styles.statGrid}>
              {stats.map((s) => {
                // Every stat carries the same padding so a chip appearing
                // changes only its colour, never the grid's layout.
                const flagged = s.level !== null && s.level > 0;
                return (
                  <View
                    key={s.k}
                    accessible
                    accessibilityLabel={TodayStrings.statLabel(
                      s.k,
                      s.v,
                      flagged ? Verdict.word[s.level as Level] : null,
                    )}
                    style={[
                      styles.stat,
                      flagged && { backgroundColor: Verdict.tint[s.level as Level] },
                    ]}>
                    <Text
                      style={[
                        styles.statKey,
                        flagged && { color: Verdict.deepInk[s.level as Level] },
                      ]}>
                      {s.k}
                    </Text>
                    <Text
                      style={[
                        styles.statValue,
                        flagged && { color: Verdict.deepInk[s.level as Level] },
                      ]}>
                      {s.v}
                    </Text>
                  </View>
                );
              })}
            </View>

            {selectedAqhi?.source === 'eccc' && selected.aqhi && (
              <Text style={styles.readoutProvenance}>
                {DataStrings.communityLine(selected.aqhi.community, selected.aqhi.distanceKm)} ·{' '}
                {DataStrings.forecastFor(formatClock(selected.epoch, settings.timeFmt))}
              </Text>
            )}
            {selectedAqhi?.source === 'estimate' && (
              <Text style={styles.readoutProvenance}>
                {DataStrings.modelSource} ·{' '}
                {DataStrings.forecastFor(formatClock(selected.epoch, settings.timeFmt))}
              </Text>
            )}

            <Pressable onPress={() => setAirOpen(true)} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.airLink}>{TodayStrings.airLink}</Text>
            </Pressable>
          </View>
        </View>

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

      <Sheet
        visible={airOpen}
        title={SheetStrings.airTitle(formatHour(selected.hour, settings.timeFmt))}
        onClose={() => setAirOpen(false)}>
        <AirSheetBody
          hour={selected}
          isCurrentHour={Math.floor(now) === selected.hour}
          observation={observation}
          timeFmt={settings.timeFmt}
          nowMs={nowMs}
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
  cardAction: { alignSelf: 'flex-start', marginTop: Space.two, minHeight: 32, justifyContent: 'center' },
  cardActionText: { ...Type.rowLabel, color: Accent.base },

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
    left: -RING_WIDTH,
    right: -RING_WIDTH,
    bottom: -RING_WIDTH,
    borderWidth: RING_WIDTH,
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

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, columnGap: 10, marginTop: 10 },
  // Padded and rounded whether or not it is tinted, so the grid never moves.
  stat: { minWidth: 62, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  statKey: { ...Type.capsLabel, letterSpacing: tracking(11, 0.06), color: Neutral[600] },
  statValue: { ...Type.cardTitle, color: Palette.text },

  airLink: {
    marginTop: 12,
    ...Type.bodySmall,
    fontFamily: Type.rowLabel.fontFamily,
    color: Accent[700],
  },

  attributionBlock: { gap: 4 },
  attribution: { ...Type.caption, color: Neutral[600], lineHeight: 12 * 1.4 },
});
