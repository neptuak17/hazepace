/**
 * The launch / update overlay.
 *
 * The app stores no readings between sessions, so every open re-reads air and
 * weather and this covers the wait.
 *
 * Animated with RN's own Animated rather than Reanimated. Every motion here is
 * a plain timing curve on transform or opacity, which the native driver runs
 * on the UI thread — the one exception is the progress width, which cannot be
 * native-driven and is the only animation still stepped from JS. That matters
 * on this screen in particular, because it plays while the rest of the app is
 * still mounting.
 *
 * There is no fetch to drive it yet: readings are fixtures, so the sequence
 * runs on the prototype's timings. When the real sources land, RUN_MS becomes
 * "however long the fetch took, but at least ~600ms so it cannot flash", and
 * the error state the design never specified has to be designed.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Accent, Accent2, Neutral, Palette, Radius, Shadow, Type } from '@/constants/design-tokens';

/** Prototype timings. */
const RUN_MS = 2400;
const FADE_MS = 400;
const RING_MS = 2600;
const RING_STAGGER = [0, 850, 1700];
const CORE_MS = 2600;
const DRIFT_MS = 3400;
const STEP_MS = 500;
const STEP_DELAYS = [100, 450, 800];

const STEPS = ['Air quality stations', 'Wildfire smoke plume', 'Hourly weather'];

const STACK = 168;
const CORE = 92;

interface LaunchOverlayProps {
  /** Called once the fade-out has finished and the overlay can be unmounted. */
  onDone: () => void;
}

export function LaunchOverlay({ onDone }: LaunchOverlayProps) {
  // One driver per animation; refs so they survive re-renders.
  const rings = useRef(RING_STAGGER.map(() => new Animated.Value(0))).current;
  const core = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  const steps = useRef(STEP_DELAYS.map(() => new Animated.Value(0))).current;
  const fill = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const loops = rings.map((v, i) =>
      // The stagger is applied once, then the loop runs unbroken.
      Animated.sequence([
        Animated.delay(RING_STAGGER[i]),
        Animated.loop(
          Animated.timing(v, {
            toValue: 1,
            duration: RING_MS,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ),
      ]),
    );

    const coreLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(core, {
          toValue: 1,
          duration: CORE_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(core, {
          toValue: 0,
          duration: CORE_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: DRIFT_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: DRIFT_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const stepIns = steps.map((v, i) =>
      Animated.timing(v, {
        toValue: 1,
        duration: STEP_MS,
        delay: STEP_DELAYS[i],
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );

    // Width cannot be native-driven.
    const fillIn = Animated.timing(fill, {
      toValue: 1,
      duration: RUN_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    });

    const all = [...loops, coreLoop, driftLoop, ...stepIns, fillIn];
    all.forEach((a) => a.start());

    const timer = setTimeout(() => {
      Animated.timing(fade, {
        toValue: 0,
        duration: FADE_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => doneRef.current());
    }, RUN_MS);

    return () => {
      clearTimeout(timer);
      all.forEach((a) => a.stop());
    };
  }, [rings, core, drift, steps, fill, fade]);

  return (
    <Animated.View style={[styles.root, { opacity: fade }]} pointerEvents="auto">
      <View style={styles.stack}>
        {rings.map((v, i) => (
          <Animated.View
            key={i}
            style={[
              styles.ring,
              {
                opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.55, 0, 0] }),
                transform: [
                  { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.5] }) },
                ],
              },
            ]}
          />
        ))}

        <Animated.View
          style={[
            styles.core,
            {
              transform: [
                { scale: core.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) },
              ],
            },
          ]}>
          <Animated.View
            style={{
              transform: [
                { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-14, 14] }) },
              ],
            }}>
            <Icon name="hazeLarge" size={46} color={Neutral[100]} />
          </Animated.View>
        </Animated.View>
      </View>

      <Text style={styles.title}>Updating your forecast</Text>

      <View style={styles.steps}>
        {STEPS.map((s, i) => (
          <Animated.View
            key={s}
            style={[
              styles.stepPill,
              {
                opacity: steps[i],
                transform: [
                  { translateY: steps[i].interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) },
                ],
              },
            ]}>
            <View style={styles.stepDot} />
            <Text style={styles.stepLabel}>{s}</Text>
          </Animated.View>
        ))}
      </View>

      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: fill.interpolate({
                inputRange: [0, 0.45, 1],
                outputRange: ['6%', '62%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    paddingHorizontal: 34,
  },

  stack: {
    width: STACK,
    height: STACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: STACK / 2,
    backgroundColor: Accent2[300],
  },
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    backgroundColor: Accent.base,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Shadow.md,
  },

  title: {
    fontFamily: Type.pageTitle.fontFamily,
    fontSize: 27,
    lineHeight: 27 * 1.15,
    color: Palette.text,
    textAlign: 'center',
  },

  steps: { alignSelf: 'stretch', gap: 10 },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Neutral[200],
    borderRadius: Radius.pill,
    paddingVertical: 11,
    paddingHorizontal: 15,
  },
  stepDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: Accent2[600] },
  stepLabel: { ...Type.pillLabel, color: Neutral[800] },

  track: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Neutral[300],
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: Radius.pill, backgroundColor: Accent.base },
});
