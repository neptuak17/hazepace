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
 *
 * Pins that would overlap at the current zoom are drawn as one group pin
 * showing the highest of their readings and a count (see groupPins).
 * Tapping a group zooms in until its members separate. Grouping is redone
 * when a pan or zoom settles, so pins can overlap briefly mid-gesture.
 */
import { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Accent, Font, Neutral, Palette, Shadow, Verdict } from '@/constants/design-tokens';
import { MapStrings } from '@/constants/strings';
import {
  groupPins,
  inView,
  regionFitting,
  type MapPin,
  type Region,
} from '@/lib/map-pins';

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
  const mapRef = useRef<MapView>(null);
  // What the user is looking at, updated when a pan or zoom settles.
  const [visible, setVisible] = useState<Region>(region);
  // The map's size in points, which grouping needs to know what overlaps.
  const [size, setSize] = useState({ width: 0, height: 0 });
  const groups = groupPins(
    pins.filter((p) => inView(p, visible)),
    visible,
    size,
  );

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={region}
      onLayout={(e) =>
        setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }
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
      {groups.map(({ key, lead, members }) =>
        members.length === 1 ? (
          <Marker
            key={key}
            coordinate={{ latitude: lead.latitude, longitude: lead.longitude }}
            title={lead.name}
            description={lead.detail}>
            <PinFace pin={lead} />
          </Marker>
        ) : (
          // No title, so a tap zooms instead of opening a callout.
          <Marker
            key={key}
            coordinate={{ latitude: lead.latitude, longitude: lead.longitude }}
            onPress={() => mapRef.current?.animateToRegion(regionFitting(members), 350)}>
            <View
              style={styles.groupFrame}
              accessible
              accessibilityRole="button"
              accessibilityLabel={MapStrings.groupLabel(members.length, lead.value)}>
              <PinFace pin={lead} />
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{members.length}</Text>
              </View>
            </View>
          </Marker>
        ),
      )}

      <Marker
        coordinate={{ latitude: place.latitude, longitude: place.longitude }}
        title={place.label}
        zIndex={1}>
        <View style={styles.placeDot} />
      </Marker>
    </MapView>
  );
}

/** The round pin itself: the value in its verdict colour, or a grey "—". */
function PinFace({ pin }: { pin: MapPin }) {
  return (
    <View
      style={[
        styles.pin,
        { backgroundColor: pin.level === null ? Neutral[200] : Verdict.tint[pin.level] },
      ]}>
      <Text
        style={[
          styles.pinValue,
          { color: pin.level === null ? Neutral[600] : Verdict.ink[pin.level] },
        ]}>
        {pin.value}
      </Text>
    </View>
  );
}

/** Room on every side for the badge, so the pin stays centred on its point. */
const BADGE_ROOM = 8;

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
  // The badge hangs off the pin's corner. A marker's view is clipped to its
  // own bounds, so the frame is padded evenly to hold the badge inside them
  // and keep the pin centred on the community.
  groupFrame: { padding: BADGE_ROOM },
  countBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: Palette.bg,
    backgroundColor: Neutral[800],
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontFamily: Font.bodyExtrabold, fontSize: 10, lineHeight: 12, color: Palette.bg },
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
