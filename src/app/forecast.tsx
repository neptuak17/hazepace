/**
 * Forecast — the next five days.
 *
 * Nothing here is authored. Each day is sampled at eight 2-hour slots; every
 * slot the sources covered runs through the model, and the day's verdict is
 * the best contiguous run it contains — an all-green run if there is one,
 * otherwise an all-amber one. A missing slot breaks a run but never sets the
 * level on its own; a day with no complete slot has no verdict at all.
 *
 * AQHI forecasts reach 48 hours, weather reaches five days. From the third
 * day on, expect the strip and the verdict to be mostly "—" while the
 * temperature and rain still show. That is the data, not a fault.
 *
 * One row is open at a time.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
import { DataStrings, ForecastStrings } from '@/constants/strings';
import { useConditions } from '@/lib/conditions';
import { DAY_SLOTS, formatDayName, formatShortDate, liveDays } from '@/lib/live';
import { formatHour } from '@/lib/rating';
import { useSettings } from '@/lib/settings';

export default function ForecastScreen() {
  const { settings, prefs } = useSettings();
  const { live, now: nowMs } = useConditions();
  const [openDay, setOpenDay] = useState(0);

  const days = liveDays(live, nowMs, prefs);

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView style={styles.pane} contentContainerStyle={styles.paneContent}>
        <Text style={styles.title}>{ForecastStrings.title}</Text>

        <View style={styles.card}>
          {days.map((day, i) => {
            const open = i === openDay;
            const window =
              day.run === null
                ? ForecastStrings.noWindow
                : `${formatHour(DAY_SLOTS[day.run.start], settings.timeFmt)} – ${formatHour(DAY_SLOTS[day.run.end] + 2, settings.timeFmt)}`;

            return (
              <Pressable
                key={day.epoch}
                onPress={() => setOpenDay(open ? -1 : i)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={[styles.row, i === 0 ? styles.rowFirst : styles.rowRuled]}>
                <View style={styles.rowHead}>
                  <View style={styles.dayCol}>
                    <Text style={styles.dayName}>
                      {day.isToday ? 'Today' : formatDayName(day.epoch)}
                    </Text>
                    <Text style={styles.dayDate}>{formatShortDate(day.epoch)}</Text>
                  </View>

                  <View style={styles.strip}>
                    {day.blocks.map((level, slot) => (
                      <View
                        key={slot}
                        style={[
                          styles.block,
                          // A slot the model could not judge takes the track
                          // colour, so a gap in the forecast is visibly a gap.
                          { backgroundColor: level === null ? Neutral[300] : Verdict.ink[level] },
                        ]}
                      />
                    ))}
                  </View>

                  <View style={styles.tempCol}>
                    <Text style={styles.temp}>
                      {day.hiC === null || day.loC === null
                        ? DataStrings.unavailable
                        : ForecastStrings.temp(Math.round(day.hiC), Math.round(day.loC))}
                    </Text>
                    <Text style={styles.rain}>
                      {day.rainMm === null
                        ? DataStrings.unavailable
                        : ForecastStrings.rainTotal(Math.round(day.rainMm))}
                    </Text>
                  </View>
                </View>

                {open && (
                  <View style={styles.detail}>
                    <View style={styles.detailHead}>
                      <View
                        style={[
                          styles.wordPill,
                          {
                            backgroundColor:
                              day.level === null ? Neutral[400] : Verdict.ink[day.level],
                          },
                        ]}>
                        <Text style={styles.wordPillText}>
                          {day.level === null ? DataStrings.unavailable : Verdict.word[day.level]}
                        </Text>
                      </View>
                      <Text style={styles.window}>{window}</Text>
                    </View>
                    <Text style={styles.meta}>
                      {day.aqhiFirst === null || day.aqhiLast === null
                        ? `AQHI ${DataStrings.unavailable}`
                        : ForecastStrings.meta(
                            Math.round(day.aqhiFirst),
                            Math.round(day.aqhiLast),
                            day.rainMm !== null && day.rainMm >= 0.5 ? Math.round(day.rainMm) : null,
                            day.windDir,
                            day.windMaxKmh === null ? null : Math.round(day.windMaxKmh),
                            day.aqhiEstimated,
                          )}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
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

  card: { ...Card, paddingVertical: Space.three, paddingHorizontal: Space.four },

  row: { paddingVertical: Space.three },
  rowFirst: { borderTopWidth: 1.5, borderTopColor: 'transparent' },
  rowRuled: { borderTopWidth: 1.5, borderTopColor: Palette.divider },

  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayCol: { width: 58 },
  dayName: { ...Type.rowLabel, color: Palette.text },
  dayDate: { ...Type.caption, color: Neutral[600] },

  strip: { flex: 1, flexDirection: 'row', gap: 2, height: 26 },
  block: { flex: 1, borderRadius: Radius.pill, opacity: 0.9 },

  tempCol: { width: 66, alignItems: 'flex-end' },
  temp: { ...Type.rowLabel, color: Palette.text },
  rain: { ...Type.caption, color: Neutral[600] },

  detail: {
    marginTop: 10,
    backgroundColor: Neutral[200],
    borderRadius: Radius.md,
    padding: Space.three,
    gap: 7,
  },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  wordPill: { borderRadius: Radius.pill, paddingHorizontal: 11, paddingVertical: 4 },
  wordPillText: {
    ...Type.caption,
    fontFamily: Type.rowLabel.fontFamily,
    color: Neutral[100],
    letterSpacing: tracking(12, 0.04),
  },
  window: { ...Type.pillLabel, color: Palette.text },
  meta: { ...Type.caption, color: Neutral[600] },

});
