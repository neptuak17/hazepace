/**
 * The header shared by every screen.
 *
 * In the design this sits above the tab content rather than inside any one
 * screen, so it keeps the place and the clock in the same position as the
 * screens change underneath it. It owns the saved-places sheet, because the
 * place row is what opens it and that row lives here.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { PlacesSheetBody } from '@/components/sheets';
import { Accent, Accent2, Neutral, Palette, Space, Type } from '@/constants/design-tokens';
import { DataStrings, HeaderStrings, SheetStrings } from '@/constants/strings';
import { useConditions } from '@/lib/conditions';
import { FAR_COMMUNITY_KM, formatAqhi, formatClock, formatDate } from '@/lib/live';
import { band } from '@/lib/rating';
import { useSettings } from '@/lib/settings';

export function AppHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, prefs, update } = useSettings();
  const { aqhi, now, place } = useConditions();
  const [placesOpen, setPlacesOpen] = useState(false);

  // For the sheet: the reading in use, banded by the user's own thresholds.
  const observation = aqhi?.observation ?? null;
  const currentAqhi = observation ? formatAqhi(observation) : null;
  const currentLevel =
    observation && observation.value !== null ? band(observation.value, prefs) : null;

  // The place row names where the AQHI reading is from. Beyond the cutoff the
  // distance moves up into the headline rather than staying in the grey meta
  // line, because "this number is from 40 km away" is the headline.
  const community = aqhi?.community.name ?? null;
  const km = aqhi?.distanceKm ?? null;
  const far = km !== null && km > FAR_COMMUNITY_KM;

  let headline: string;
  if (community && km !== null) {
    headline = far ? DataStrings.communityFar(community, km) : community;
  } else if (place?.label) {
    headline = place.label;
  } else {
    headline = HeaderStrings.deviceHeadline;
  }

  // The meta line says how the coordinate was chosen whenever it was not the
  // device: a fixed or chosen place must never read as "where you are".
  const clock = formatClock(now, settings.timeFmt);
  let meta: string;
  if (place?.source === 'fallback' && place.label) {
    meta = `${DataStrings.fixedPlace(place.label)} · ${clock}`;
  } else if (place?.source === 'manual' && place.label) {
    meta = `${DataStrings.chosenPlace(place.label)} · ${clock}`;
  } else if (place?.source === 'override' && place.label) {
    meta = `${DataStrings.overridePlace(place.label)} · ${clock}`;
  } else if (community && km !== null && !far) {
    meta = `${DataStrings.communityLine(community, km)} · ${clock}`;
  } else {
    meta = `${formatDate(now)} · ${clock}`;
  }

  return (
    <View style={[styles.header, { paddingTop: insets.top + Space.two }]}>
      <Pressable
        style={styles.place}
        accessibilityRole="button"
        accessibilityLabel={HeaderStrings.changePlace(headline)}
        onPress={() => setPlacesOpen(true)}>
        <View style={styles.pinBadge}>
          <Icon name="mapPin" size={17} color={Palette.bg} />
        </View>
        <View style={styles.placeText}>
          <Text style={styles.placeName} numberOfLines={1}>
            {headline}
          </Text>
          <Text style={styles.placeMeta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <Icon name="chevronDown" size={15} color={Neutral[600]} />
      </Pressable>

      <Pressable
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel={HeaderStrings.thresholds}
        onPress={() => router.navigate('/thresholds')}>
        <Icon name="settings" size={20} color={Accent.base} />
      </Pressable>
      <Pressable
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel={HeaderStrings.about}
        onPress={() => router.navigate('/about')}>
        <Icon name="person" size={20} color={Accent.base} />
      </Pressable>
      <Pressable
        style={styles.iconButton}
        accessibilityRole="button"
        accessibilityLabel={HeaderStrings.howItWorks}
        onPress={() => router.navigate('/how-it-works')}>
        <Icon name="help" size={20} color={Accent.base} />
      </Pressable>

      <Sheet visible={placesOpen} title={SheetStrings.placesTitle} onClose={() => setPlacesOpen(false)}>
        <PlacesSheetBody
          manualPlace={settings.manualPlace}
          currentAqhi={currentAqhi}
          currentLevel={currentLevel}
          onUseDevice={() => {
            update({ manualPlace: null });
            setPlacesOpen(false);
          }}
          onPick={(manualPlace) => {
            update({ manualPlace });
            setPlacesOpen(false);
          }}
        />
      </Sheet>
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
