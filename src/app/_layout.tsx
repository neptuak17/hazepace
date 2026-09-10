import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TabNavigator } from '@/components/tab-bar';
import { Palette } from '@/constants/design-tokens';
import { SettingsProvider } from '@/lib/settings';

SplashScreen.preventAutoHideAsync();

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
        <View style={styles.root}>
          <TabNavigator />
        </View>
        {/* The design is a single warm light palette, so the status bar is
            always dark-on-light. */}
        <StatusBar style="dark" />
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
