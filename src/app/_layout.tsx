import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorPanel } from '@/components/error-panel';
import { LaunchOverlay } from '@/components/launch-overlay';
import { PlacesSheetProvider } from '@/components/places-sheet';
import { TabNavigator } from '@/components/tab-bar';
import { Palette } from '@/constants/design-tokens';
import { ConditionsProvider, useConditions } from '@/lib/conditions';
import { SettingsProvider } from '@/lib/settings';

SplashScreen.preventAutoHideAsync();

/**
 * Everything under the providers.
 *
 * Split out so it can call `useConditions`; the root component renders the
 * provider and therefore cannot. Three states, three renders:
 *
 *   loading — the tab screens mount underneath the overlay so they are ready
 *             the instant it lifts
 *   ready   — the overlay fades and unmounts; the screens are already there
 *   error   — the screens are replaced, not overlaid, so nothing partial shows
 */
function Shell() {
  const { status, failure, refreshing, refresh } = useConditions();
  const [overlayDone, setOverlayDone] = useState(false);

  // A retry that fails again re-shows the panel; a retry that succeeds lands
  // on the screens with no overlay, since they were never unmounted.
  if (status === 'error' && failure) {
    return <ErrorPanel failure={failure} retrying={refreshing} onRetry={refresh} />;
  }

  return (
    <>
      <TabNavigator />
      {!overlayDone && (
        <LaunchOverlay finished={status !== 'loading'} onDone={() => setOverlayDone(true)} />
      )}
    </>
  );
}

export default function RootLayout() {
  // Caprasimo is the only display voice; Figtree carries four body weights.
  // RN cannot synthesise weights from a single face, so each is a real file.
  const [fontsLoaded, fontError] = useFonts({
    Caprasimo_400Regular: require('@/assets/fonts/Caprasimo-Regular.ttf'),
    Figtree_400Regular: require('@/assets/fonts/Figtree-Regular.ttf'),
    Figtree_600SemiBold: require('@/assets/fonts/Figtree-SemiBold.ttf'),
    Figtree_700Bold: require('@/assets/fonts/Figtree-Bold.ttf'),
    Figtree_800ExtraBold: require('@/assets/fonts/Figtree-ExtraBold.ttf'),
  });

  useEffect(() => {
    // Hide on error too — falling back to system faces beats never starting.
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ConditionsProvider>
          <PlacesSheetProvider>
            <View style={styles.root}>
              <Shell />
            </View>
          </PlacesSheetProvider>
          {/* Follows the appearance: dark content on the light page, light
              content on the dark one. */}
          <StatusBar style="auto" />
        </ConditionsProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.bg,
  },
});
