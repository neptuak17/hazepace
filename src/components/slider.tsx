/**
 * A stepped slider.
 *
 * React Native has no slider primitive, and the project keeps its dependency
 * list minimal, so this is built on PanResponder from core. Every slider in the
 * app is stepped and coarse — eight positions at most — so there is no
 * continuous motion to animate and no need for a gesture/worklet stack.
 *
 * The prototype used `<input type="range">` with `accent-color`, which means
 * its unfilled track in the screenshots is a browser default rather than a
 * design decision. The track here uses neutral-300, which is what the design
 * system's own progress track (on the launch screen) uses.
 *
 * Touch position: `locationX` is relative to whichever view the finger is
 * over, and the thumb is a child view that moves under the finger — so
 * reading it on every move made the value jump between "relative to the
 * track" and "relative to the thumb" and the thumb flickered. The children
 * are therefore not touch targets, `locationX` is read once at the start of
 * the gesture (when it is relative to this view), and every move is that
 * start plus the gesture's `dx`.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Accent, Neutral, Radius, Shadow } from '@/constants/design-tokens';

const TRACK_HEIGHT = 8;
const THUMB_SIZE = 22;
/** Apple's minimum comfortable target; the visible track is much thinner. */
const TOUCH_HEIGHT = 44;

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  /** Spoken description, e.g. "Wind tolerance". */
  label: string;
  /** Spoken form of the current value, when the bare number is unhelpful. */
  valueLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
  valueLabel,
  style,
}: SliderProps) {
  const [width, setWidth] = useState(0);
  // PanResponder closes over its callbacks once, so the live values it needs
  // are held in refs rather than captured from the render scope.
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  /** Where the gesture began, relative to this view. */
  const startX = useRef(0);
  /** The last value emitted, so a move within one step is silent. */
  const lastEmitted = useRef<number | null>(null);

  const snap = useCallback(
    (raw: number) => {
      const clamped = Math.max(min, Math.min(max, raw));
      const stepped = Math.round((clamped - min) / step) * step + min;
      // Re-clamp: rounding up from the last step can overshoot the max.
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step],
  );

  const emit = useCallback(
    (x: number) => {
      const w = widthRef.current - THUMB_SIZE;
      if (w <= 0) return;
      const ratio = Math.max(0, Math.min(1, (x - THUMB_SIZE / 2) / w));
      const next = snap(min + ratio * (max - min));
      // Every move event would otherwise re-render and re-persist the same
      // value; the parent only hears about a change of step.
      if (next === lastEmitted.current) return;
      lastEmitted.current = next;
      onChangeRef.current(next);
    },
    [min, max, snap],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Claim the gesture so the enclosing ScrollView does not steal a drag.
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          startX.current = e.nativeEvent.locationX;
          lastEmitted.current = null;
          emit(startX.current);
        },
        onPanResponderMove: (_e, gesture) => emit(startX.current + gesture.dx),
      }),
    [emit],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  };

  const ratio = max === min ? 0 : (value - min) / (max - min);
  const travel = Math.max(0, width - THUMB_SIZE);
  const thumbLeft = ratio * travel;

  return (
    <View
      style={[styles.touch, style]}
      onLayout={onLayout}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{
        min,
        max,
        now: value,
        ...(valueLabel ? { text: valueLabel } : null),
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onChange(snap(value + step));
        else if (e.nativeEvent.actionName === 'decrement') onChange(snap(value - step));
      }}
      {...responder.panHandlers}>
      {/* Not touch targets: see the note on locationX above. */}
      <View style={styles.track} pointerEvents="none">
        <View style={[styles.fill, { width: thumbLeft + THUMB_SIZE / 2 }]} />
      </View>
      <View style={[styles.thumb, { left: thumbLeft }]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  touch: {
    height: TOUCH_HEIGHT,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: Neutral[300],
    overflow: 'hidden',
  },
  fill: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: Accent.base,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: Radius.pill,
    backgroundColor: Accent.base,
    ...Shadow.sm,
  },
});
