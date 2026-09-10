/**
 * The header shared by Today, Map and Forecast.
 *
 * In the design this sits above the tab content rather than inside any one
 * screen, so it keeps the place and the clock in the same position as the tabs
 * change underneath it.
 */
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Accent, Accent2, Neutral, Palette, Space, Type } from '@/constants/design-tokens';
import { NOW, PLACE_LABEL } from '@/lib/fixtures';
import { formatHour } from '@/lib/rating';
import { useSettings } from '@/lib/settings';

export function AppHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();

  return (
    <View style={[styles.header, { paddingTop: insets.top + Space.two }]}>
      <View style={styles.place}>
        <View style={styles.pinBadge}>
          <Icon name="mapPin" size={17} color={Palette.bg} />
        </View>
        <View style={styles.placeText}>
          <Text style={styles.placeName} numberOfLines={1}>
            {settings.place}
          </Text>
          <Text style={styles.placeMeta} numberOfLines={1}>
            {PLACE_LABEL} · {formatHour(NOW, settings.timeFmt)}
          </Text>
        </View>
        <Icon name="chevronDown" size={15} color={Neutral[600]} />
      </View>

      <Pressable
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="Your thresholds"
        onPress={() => router.navigate('/thresholds')}>
        <Icon name="settings" size={20} color={Accent.base} />
      </Pressable>
      <Pressable
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel="About yourself"
        onPress={() => router.navigate('/about')}>
        <Icon name="person" size={20} color={Accent.base} />
      </Pressable>
      <Pressable style={styles.iconButton} accessibilityLabel="How this works">
        <Icon name="help" size={20} color={Accent.base} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    minHeight: 44,
  },
  pinBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Accent2[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeText: { flex: 1, minWidth: 0 },
  placeName: { ...Type.rowLabel, fontSize: 17, color: Palette.text },
  placeMeta: { ...Type.caption, color: Neutral[600] },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
