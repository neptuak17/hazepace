/**
 * The four factors the verdict weighs, on one line: "AQHI 2 · 18 °C · NW
 * 12 km/h · dry". Today's hero shows the current hour; Forecast's day detail
 * shows the day's range and extremes. Same order, same marks, so the two read
 * as the same thing at two scales.
 *
 * A factor at amber or red is set in bold with a leading "●"
 * (decision-rules.md §4.4). Colour is left to the caller, which sets it for
 * the surface the line sits on; the mark is weight and shape, not hue, so it
 * reads on a verdict-tinted card as well as a neutral panel.
 */
import { Fragment } from 'react';
import { StyleSheet, Text, type ColorValue, type StyleProp, type TextStyle } from 'react-native';

import { Type, Verdict, type Level } from '@/constants/design-tokens';

export interface FactorItem {
  key: 'air' | 'heat' | 'wind' | 'rain';
  /** As drawn: "NW 12 km/h". */
  text: string;
  /** As VoiceOver reads it: "wind NW 12 km/h". */
  spoken: string;
  /** Null when the model could not judge it; then it is never marked. */
  level: Level | null;
}

export function FactorLine({
  items,
  color,
  style,
}: {
  items: FactorItem[];
  color: ColorValue;
  style?: StyleProp<TextStyle>;
}) {
  const label = items
    .map((f) =>
      f.level !== null && f.level > 0 ? `${f.spoken}, ${Verdict.word[f.level]}` : f.spoken,
    )
    .join('; ');

  return (
    <Text style={[styles.line, { color }, style]} accessibilityLabel={label}>
      {items.map((f, i) => {
        const flagged = f.level !== null && f.level > 0;
        return (
          <Fragment key={f.key}>
            {i > 0 ? '  ·  ' : ''}
            <Text style={flagged ? styles.flagged : undefined}>
              {flagged ? '● ' : ''}
              {f.text}
            </Text>
          </Fragment>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: { ...Type.body, lineHeight: 15 * 1.4 },
  flagged: { fontFamily: Type.rowLabel.fontFamily },
});
