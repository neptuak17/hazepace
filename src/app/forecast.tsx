/**
 * Forecast — the next five days.
 *
 * Nothing here is authored. Each day holds raw readings for eight 2-hour
 * slots; every slot runs through the model, and the day's verdict is the best
 * contiguous run it contains — an all-green run if there is one, otherwise an
 * all-amber one. That is deliberately not the worst slot: a day with one clear
 * stretch is a day you can train in.
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
import { Attribution, ForecastStrings } from '@/constants/strings';
import { DAYS, dayRainTotal, daySlots } from '@/lib/fixtures';
import { judgeDay, windowLabel } from '@/lib/rating';
import { useSettings } from '@/lib/settings';

export default function ForecastScreen() {
  const { settings, prefs } = useSettings();
  const [openDay, setOpenDay] = useState(0);

  return (
    <View style={styles.screen}>
      <AppHeader />

      <ScrollView style={styles.pane} contentContainerStyle={styles.paneContent}>
        <Text style={styles.title}>{ForecastStrings.title}</Text>

        <View style={styles.card}>
          {DAYS.map((day, i) => {
            const verdict = judgeDay(daySlots(day), prefs);
            const open = i === openDay;
            const rainTotal = dayRainTotal(day);
            const window = windowLabel(verdict.run, settings.timeFmt) ?? ForecastStrings.noWindow;

            return (
              <Pressable
                key={day.day}
                onPress={() => setOpenDay(open ? -1 : i)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={[styles.row, i === 0 ? styles.rowFirst : styles.rowRuled]}>
                <View style={styles.rowHead}>
                  <View style={styles.dayCol}>
                    <Text style={styles.dayName}>{day.day}</Text>
                    <Text style={styles.dayDate}>{day.date}</Text>
                  </View>

                  <View style={styles.strip}>
                    {verdict.blocks.map((level, slot) => (
                      <View
                        key={slot}
                        style={[styles.block, { backgroundColor: Verdict.ink[level] }]}
                      />
                    ))}
                  </View>

                  <View style={styles.tempCol}>
                    <Text style={styles.temp}>{ForecastStrings.temp(day.hi, day.lo)}</Text>
                    <Text style={styles.rain}>{ForecastStrings.rainTotal(Math.round(rainTotal))}</Text>
                  </View>
                </View>

                {open && (
                  <View style={styles.detail}>
                    <View style={styles.detailHead}>
                      <View
                        style={[styles.wordPill, { backgroundColor: Verdict.ink[verdict.level] }]}>
                        <Text style={styles.wordPillText}>{Verdict.word[verdict.level]}</Text>
                      </View>
                      <Text style={styles.window}>{window}</Text>
                    </View>
                    <Text style={styles.meta}>
                      {ForecastStrings.meta(
                        day.aqhi[0],
                        day.aqhi[day.aqhi.length - 1],
                        rainTotal >= 0.5 ? Math.round(rainTotal) : null,
                        day.dir,
                        Math.max(...day.windKmh),
                      )}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.attribution}>{Attribution.forecast}</Text>
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

  attribution: { ...Type.caption, color: Neutral[600], lineHeight: 12 * 1.4 },
});
