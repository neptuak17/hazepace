/**
 * The bottom tab bar, and the tab navigator it belongs to.
 *
 * The design's bar is a rounded, tinted control that a native UITabBar cannot
 * produce, so this uses expo-router's headless tabs (`expo-router/ui`) instead
 * of the native tab layout: `TabList` and `TabTrigger` handle routing while
 * every pixel here is ours. Routing is still file-based.
 *
 * The navigator and the bar live in one component on purpose. `Tabs` discovers
 * its screens by walking its own children for `TabList` — it sees through
 * fragments and through the extra layer `asChild` adds, but not through a
 * custom component. Extracting the bar into its own element would leave the
 * navigator with no screens at all.
 */
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Accent, Neutral, Palette, Radius, Space, Type } from '@/constants/design-tokens';
import { TabStrings } from '@/constants/strings';

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
      {...props}
      // After the spread: the trigger slot passes its own props through, and a
      // style arriving from it (even undefined) would otherwise replace ours.
      style={StyleSheet.flatten([styles.item, isFocused && styles.itemSelected])}>
      <Icon name={icon} size={21} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
});
TabButton.displayName = 'TabButton';

export function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs>
      <TabSlot />
      <TabList asChild>
        {/*
          The design pads the bar 30px at the bottom to clear the home
          indicator. On a real device that measurement comes from the safe
          area, so the inset wins where it is larger and the design value is
          the floor on devices without an indicator.
        */}
        <View style={StyleSheet.flatten([styles.bar, { paddingBottom: Math.max(insets.bottom, Space.two) }])}>
          <TabTrigger name="today" href="/" asChild>
            <TabButton icon="tabToday" label={TabStrings.today} />
          </TabTrigger>
          <TabTrigger name="map" href="/map" asChild>
            <TabButton icon="tabMap" label={TabStrings.map} />
          </TabTrigger>
          <TabTrigger name="forecast" href="/forecast" asChild>
            <TabButton icon="tabForecast" label={TabStrings.forecast} />
          </TabTrigger>

          {/*
            Not shown in the bar. The design keeps the tab bar visible on the
            settings screens with no tab selected, so these routes belong to
            the tab navigator rather than to a stack pushed over it. A trigger
            has to be a direct child of TabList to register its route, so it is
            hidden rather than omitted.
          */}
          <TabTrigger name="thresholds" href="/thresholds" style={styles.hidden} />
          <TabTrigger name="about" href="/about" style={styles.hidden} />
          <TabTrigger name="how-it-works" href="/how-it-works" style={styles.hidden} />
        </View>
      </TabList>
    </Tabs>
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
  hidden: {
    display: 'none',
  },
  itemSelected: {
    backgroundColor: Accent[200],
  },
  label: {
    ...Type.tabLabel,
    letterSpacing: 11 * 0.02,
  },
});
