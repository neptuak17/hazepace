/**
 * Web stand-in for the Map plate. react-native-maps has no web build, so
 * without this file a web bundle would fail at the import. The app ships
 * on iOS only; this keeps the template's web target building.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Neutral, Type } from '@/constants/design-tokens';
import type { AirMapPin } from './air-map';
import type { Region } from '@/lib/map-pins';

interface AirMapProps {
  region: Region;
  place: { latitude: number; longitude: number; label: string };
  pins: AirMapPin[];
  accessibilityLabel: string;
}

export function AirMap({ place }: AirMapProps) {
  return (
    <View style={styles.fill}>
      <Text style={styles.text}>{place.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  text: { ...Type.dayRow, color: Neutral[700] },
});
