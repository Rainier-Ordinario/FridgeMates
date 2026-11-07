import { useFridge } from '@/logic/store';
import { colors, space } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Mascot } from './Mascot';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const INTRO = 'I keep an eye on everyone in here. Ask me anything.';

/** "Ask the fridge manager": the mascot answers questions about the fridge. */
export function ManagerSheet({ visible, onClose }: Props) {
  const { characters, ghosts } = useFridge();
  const expression = characters.length + ghosts.length === 0 ? 'sleepy' : ghosts.length ? 'sad' : 'happy';
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Your fridge manager">
      <View style={styles.stage}>
        <Mascot
          size={120}
          state="idle"
          expression={expression}
          line={INTRO}
          interactive
          accessibilityLabel="The fridge manager. Tap for a hello."
        />
      </View>
      <AppText variant="caption" color={colors.inkMuted} align="center">
        Questions coming right up.
      </AppText>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    paddingTop: space.lg,
    paddingBottom: space.sm,
    minHeight: 230,
    justifyContent: 'flex-end',
  },
});
