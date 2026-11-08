import { colors, motion, radius, shadow, space } from '@/theme';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './AppText';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Scroll to the bottom when opened (e.g. to the demo section). */
  scrollToEnd?: boolean;
}

/** Cream bottom sheet with a grabber, a title and scrollable content. */
export function BottomSheet({ visible, onClose, title, children, scrollToEnd = false }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View
        entering={FadeIn.duration(motion.fast)}
        exiting={FadeOut.duration(motion.fast)}
        style={styles.backdrop}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <Animated.View
          entering={SlideInDown.springify().damping(16).duration(300)}
          exiting={SlideOutDown.duration(motion.fast)}
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 24), maxHeight: Math.min(640, height * 0.9) },
          ]}
        >
          <View style={styles.grabber} />
          <AppText variant="heading" align="center" accessibilityRole="header">
            {title}
          </AppText>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            onContentSizeChange={(_w, _h) => undefined}
            ref={(r) => {
              if (r && scrollToEnd) setTimeout(() => r.scrollToEnd({ animated: false }), 50);
            }}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    gap: space.sm,
    ...shadow.card,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.line,
    marginBottom: space.xs,
  },
  content: { gap: space.sm, paddingTop: space.sm },
});
