import { useFridge } from '@/logic/store';
import { colors, moods, space } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { PrimaryButton, SecondaryButton } from './Buttons';
import { Face } from './Face';
import { Screen } from './Screen';

interface State {
  error: Error | null;
}

/** Last line of defense: a render crash shows Avo panicking, not a red screen. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.warn('[FridgeMates] render crash:', error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return <CrashScreen onRetry={this.reset} />;
  }
}

function CrashScreen({ onRetry }: { onRetry: () => void }) {
  const { loadDemo } = useFridge();
  return (
    <Screen padded>
      <View style={styles.center}>
        <Face emoji="🥑" mood="dramatic" size={120} label="Avo, panicking" />
        <AppText variant="title" align="center">
          Avo panicked and dropped something.
        </AppText>
        <AppText variant="body" color={colors.inkMuted} align="center">
          Nothing is lost. Your fridge is saved on this phone.
        </AppText>
        <View style={styles.buttons}>
          <PrimaryButton emoji="🔁" label="Try again" onPress={onRetry} />
          <SecondaryButton
            emoji="🧊"
            label="Use demo fridge"
            onPress={() => {
              loadDemo();
              onRetry();
            }}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
  },
  buttons: {
    alignSelf: 'stretch',
    gap: space.sm,
    marginTop: space.lg,
    backgroundColor: moods.dramatic.tint,
    borderRadius: 28,
    padding: space.md,
  },
});
