/**
 * The fetch-failure state.
 *
 * The design handoff has no error state — it says so, and flags it as needed
 * before ship. This is the minimum: what failed, in plain words, and a retry.
 * It is built from the design's own card and button so it does not read as a
 * different app, but it is not from the handoff and should be treated as a
 * placeholder for a designed one.
 *
 * It replaces the screen rather than sitting inside it. A partial screen with
 * empty numbers looks like conditions; this cannot be mistaken for them.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Accent, Card, Neutral, Palette, Radius, Space, Type } from '@/constants/design-tokens';
import { DataStrings } from '@/constants/strings';
import type { ConditionsFailure } from '@/lib/conditions';

interface ErrorPanelProps {
  failure: ConditionsFailure;
  retrying: boolean;
  onRetry: () => void;
}

export function ErrorPanel({ failure, retrying, onRetry }: ErrorPanelProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>{DataStrings.errorTitle}</Text>
        <Text style={styles.body}>{DataStrings.errorSource[failure.source]}</Text>
        <Text style={styles.note}>{DataStrings.errorNote}</Text>
        <Text style={styles.detail} numberOfLines={3}>
          {failure.detail}
        </Text>
        <Pressable
          onPress={onRetry}
          disabled={retrying}
          accessibilityRole="button"
          accessibilityState={{ disabled: retrying, busy: retrying }}
          style={({ pressed }) => [
            styles.retry,
            pressed && styles.retryPressed,
            retrying && styles.retryBusy,
          ]}>
          <Text style={styles.retryText}>
            {retrying ? DataStrings.retrying : DataStrings.retry}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', paddingHorizontal: Space.four },
  card: { ...Card, gap: Space.two },
  title: { ...Type.sectionTitle, color: Palette.text },
  body: { ...Type.body, color: Palette.text, lineHeight: 15 * 1.45 },
  note: { ...Type.bodySmall, color: Neutral[700], lineHeight: 13 * 1.4 },
  detail: { ...Type.caption, color: Neutral[600], lineHeight: 12 * 1.4, marginTop: Space.one },
  retry: {
    minHeight: 46,
    borderRadius: Radius.pill,
    backgroundColor: Accent.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Space.two,
  },
  retryPressed: { backgroundColor: Accent[700] },
  retryBusy: { opacity: 0.45 },
  retryText: { fontFamily: Type.pageTitle.fontFamily, fontSize: 14, color: Palette.bg },
});
