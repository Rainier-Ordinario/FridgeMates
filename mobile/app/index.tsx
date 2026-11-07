import { AppText } from '@/components/AppText';
import { Chip, PrimaryButton, RoundButton } from '@/components/Buttons';
import { CharacterCard } from '@/components/CharacterCard';
import { GhostLayer } from '@/components/GhostLayer';
import { Scoreboard } from '@/components/Scoreboard';
import { Screen } from '@/components/Screen';
import { useFridge, type Character } from '@/logic/store';
import { colors, space } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Fridge (home): characters sorted by fewest days left, scoreboard, big scan button. */
export default function FridgeScreen() {
  const { characters, ghosts, scoreboard, dayOffset, skipDay } = useFridge();
  const insets = useSafeAreaInsets();

  const openCharacter = useCallback((c: Character) => {
    // TODO(step 3): navigate to /item/[id] once the detail screen exists.
    console.log('open', c.characterName);
  }, []);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="display">FridgeMates</AppText>
            <AppText variant="body" color={colors.inkMuted}>
              Spoil alert: your food has feelings.
            </AppText>
          </View>
          <Chip
            emoji="⏭"
            label={dayOffset === 0 ? 'Skip a day' : `Day +${dayOffset}`}
            tone="debug"
            onPress={skipDay}
          />
        </View>
        <Scoreboard data={scoreboard} onPressLost={() => console.log('TODO memorial')} />
      </View>

      <View style={styles.listArea}>
        <FlatList
          data={characters}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CharacterCard character={item} onPress={openCharacter} />}
          contentContainerStyle={[styles.list, { paddingBottom: 140 + insets.bottom }]}
          ListHeaderComponent={
            <AppText variant="caption" color={colors.inkMuted} style={styles.sectionLabel}>
              {characters.length === 0 ? 'Your fridge is quiet. Suspiciously quiet.' : 'MOST URGENT FIRST'}
            </AppText>
          }
          showsVerticalScrollIndicator={false}
        />
        <GhostLayer ghosts={ghosts} onPress={(g) => console.log('TODO ghost', g.characterName)} />
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,247,236,0)', colors.bg, colors.bg]}
        locations={[0, 0.45, 1]}
        style={[styles.fade, { height: 150 + insets.bottom }]}
      />
      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <RoundButton emoji="💬" label="Fridge group chat" onPress={() => console.log('TODO chat')} />
        <PrimaryButton
          emoji="📷"
          label="Scan food"
          onPress={() => router.push('/scan')}
          style={styles.scan}
        />
        <RoundButton emoji="💘" label="Matchmaking" onPress={() => console.log('TODO match')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  sectionLabel: { marginBottom: space.sm, letterSpacing: 1 },
  listArea: { flex: 1 },
  list: { paddingHorizontal: space.lg, paddingTop: space.xl },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 15 },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    zIndex: 20,
  },
  scan: { flex: 1 },
});
