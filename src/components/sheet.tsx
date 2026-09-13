/**
 * A bottom sheet.
 *
 * Built on RN's Modal rather than a sheet library. The design specifies no
 * gesture-driven motion — sheets open, close on the scrim or the X, and do not
 * drag — so a Modal with a scrim fade and a panel slide covers it without a
 * dependency.
 *
 * Modal's own `animationType="slide"` would move the scrim with the panel, so
 * the two are animated separately here.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Accent, Neutral, Palette, Radius, Shadow, Space, Type } from '@/constants/design-tokens';
import { Common } from '@/constants/strings';

const DURATION = 220;

interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [height * 0.78, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent>
      {/* The panel sits on the keyboard when a sheet has a text input, so
          the rows under the input stay reachable. Inert otherwise. */}
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
          <Pressable
            style={styles.scrim}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={Common.close}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            { maxHeight: height * 0.78, paddingBottom: Math.max(insets.bottom, 46), transform: [{ translateY }] },
          ]}>
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={Common.close}
              style={styles.close}>
              <Icon name="close" size={19} color={Accent.base} />
            </Pressable>
          </View>
          {/* Taps on rows must land while the keyboard is up, not dismiss it. */}
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { flex: 1, backgroundColor: 'rgba(46,43,37,0.42)' },
  panel: {
    backgroundColor: Neutral[100],
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Space.four,
    paddingTop: Space.four,
    ...Shadow.lg,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: Space.three,
  },
  title: { fontFamily: Type.pageTitle.fontFamily, fontSize: 21, color: Palette.text, flex: 1 },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
