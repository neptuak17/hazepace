/**
 * The bottom tab bar.
 *
 * The design's bar is a rounded, tinted control that a native UITabBar cannot
 * produce, so this uses expo-router's headless tabs (`expo-router/ui`) instead
 * of the native tab layout: `TabList` and `TabTrigger` handle routing while
 * every pixel here is ours. Routing is still file-based.
 */
import { TabList, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Accent, Neutral, Palette, Radius, Space, Type } from '@/constants/design-tokens';

type TabButtonProps = TabTriggerSlotProps & {
  icon: IconName;
  label: string;
};

const TabButton = forwardRef<View, TabButtonProps>(({ icon, label, isFocused, ...props }, ref) => {
  const color = isFocused ? Accent[700] : Neutral[600];
  return (
    <Pressable
      ref={ref}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      style={[styles.item, isFocused && styles.itemSelected]}
      {...props}>
      <Icon name={icon} size={21} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
});
TabButton.displayName = 'TabButton';

export function TabBar() {
  const insets = useSafeAreaInsets();

  return (
    <TabList asChild>
      {/*
        The design pads the bar 30px at the bottom to clear the home
        indicator. On a real device that measurement comes from the safe area,
        so the inset wins where it is larger and the design value is the floor
        on devices without an indicator.
      */}
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, Space.two) }]}>
        <TabTrigger name="today" href="/" asChild>
          <TabButton icon="tabToday" label="Today" />
        </TabTrigger>
        <TabTrigger name="map" href="/map" asChild>
          <TabButton icon="tabMap" label="Map" />
        </TabTrigger>
        <TabTrigger name="forecast" href="/forecast" asChild>
          <TabButton icon="tabForecast" label="Forecast" />
        </TabTrigger>
      </View>
    </TabList>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: Neutral[100],
    borderTopWidth: 1.5,
    borderTopColor: Palette.divider,
    paddingTop: Space.two,
    paddingHorizontal: Space.four,
  },
  item: {
    flex: 1,
    minHeight: 50,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  itemSelected: {
    backgroundColor: Accent[200],
  },
  label: {
    ...Type.tabLabel,
    letterSpacing: 11 * 0.02,
  },
});
