/** Forecast — not ported yet. Placeholder so the tab route resolves. */
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Neutral, Palette, Space, Type } from '@/constants/design-tokens';

export default function ForecastScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top + Space.five }]}>
      <Text style={styles.title}>Forecast</Text>
      <Text style={styles.note}>Not built yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.bg, paddingHorizontal: Space.four, gap: Space.two },
  title: { ...Type.pageTitle, color: Palette.text },
  note: { ...Type.body, color: Neutral[600] },
});
