/**
 * The Map plate: Apple Maps with the place and the ECCC communities around it.
 *
 * Apple's map rather than Google's because react-native-maps draws it with
 * no API key and no extra SDK, and it runs in Expo Go. The phone's own
 * location dot is off: the page is about the place the conditions are for,
 * which may be one the user picked, and the dot would put a precise
 * position on screen that nothing else in the app uses.
 *
 * Each pin is a community's latest observation in its verdict colour — the
 * same tint and ink as the list below the map. Tapping one shows its name
 * and when it was observed.
 */
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Accent, Font, Neutral, Palette, Shadow, Verdict } from '@/constants/design-tokens';
import { inView, type MapPin, type Region } from '@/lib/map-pins';

export interface AirMapPin extends MapPin {
  /** The callout's second line: when it was observed, or that it was not. */
  detail: string;
}

interface AirMapProps {
  /** Where the map opens. Later changes are ignored; remount to re-centre. */
  region: Region;
  place: { latitude: number; longitude: number; label: string };
  /** Every community. Only those in or near the view are drawn. */
  pins: AirMapPin[];
  accessibilityLabel: string;
}

export function AirMap({ region, place, pins, accessibilityLabel }: AirMapProps) {
  // What the user is looking at, updated when a pan or zoom settles.
  const [visible, setVisible] = useState<Region>(region);
  const drawn = pins.filter((p) => inView(p, visible));

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={region}
      onRegionChangeComplete={(r) => setVisible(r)}
      mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsPointsOfInterests={false}
      showsBuildings={false}
      showsCompass={false}
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      accessibilityLabel={accessibilityLabel}>
      {drawn.map((p) => (
        <Marker
          key={p.id}
          coordinate={{ latitude: p.latitude, longitude: p.longitude }}
          title={p.name}
          description={p.detail}>
          <View
            style={[
              styles.pin,
              { backgroundColor: p.level === null ? Neutral[200] : Verdict.tint[p.level] },
            ]}>
            <Text
              style={[
                styles.pinValue,
                { color: p.level === null ? Neutral[600] : Verdict.ink[p.level] },
              ]}>
              {p.value}
            </Text>
          </View>
        </Marker>
      ))}

      <Marker
        coordinate={{ latitude: place.latitude, longitude: place.longitude }}
        title={place.label}
        zIndex={1}>
        <View style={styles.placeDot} />
      </Marker>
    </MapView>
  );
}

const styles = StyleSheet.create({
  pin: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: Palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  pinValue: { fontFamily: Font.display, fontSize: 15, lineHeight: 18 },
  placeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: Palette.bg,
    backgroundColor: Accent.base,
    ...Shadow.sm,
  },
});
