import { api } from '@/api/client';
import { toChatItem } from '@/api/types';
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
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function dayLabel(dayOffset: number): string {
  if (dayOffset === 0) return 'Skip a day';
  return `Day +${dayOffset}`;
}

function sectionLabel(characterCount: number): string {
  if (characterCount === 0) return 'Your fridge is quiet. Suspiciously quiet.';
  return 'MOST URGENT FIRST';
}

export default function FridgeScreen() {
  const { characters, ghosts, gone, scoreboard, dayOffset, skipDay, setEpitaph } = useFridge();
  const insets = useSafeAreaInsets();

  const openCharacter = useCallback((character: Character) => {
    Alert.alert(character.characterName, `${character.personality}\n${character.daysLeft} days left`);
  }, []);

  const showMemorial = useCallback(() => {
    if (gone.length === 0) {
      Alert.alert('Memorial', 'No fridge mates have left yet.');
      return;
    }
    const names = gone.map((item) => item.characterName).join('\n');
    Alert.alert('Memorial', names);
  }, [gone]);

  const openGhost = useCallback(async (ghost: Character) => {
    try {
      const response = await api.ghost({ item: toChatItem(ghost, ghost.daysLeft) });
      setEpitaph(ghost.id, response.epitaph);
      Alert.alert(ghost.characterName, response.epitaph);
    } catch {
      Alert.alert('Ghost offline', 'The ghost could not speak yet.');
    }
  }, [setEpitaph]);

  const openChat = useCallback(async () => {
    try {
      const response = await api.chat({
        items: characters.map((item) => toChatItem(item, item.daysLeft)),
      });
      const lines = response.lines.map((line) => line.text).join('\n');
      Alert.alert('Fridge group chat', lines);
    } catch {
      Alert.alert('Chat offline', 'The fridge group chat is unavailable.');
    }
  }, [characters]);

  const openMatch = useCallback(async () => {
    try {
      const response = await api.match({
        items: characters.map((item) => toChatItem(item, item.daysLeft)),
      });
      Alert.alert(response.title, response.steps.join('\n'));
    } catch {
      Alert.alert('Matchmaking offline', 'No recipe could be matched yet.');
    }
  }, [characters]);

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
          <Chip emoji="⏭" label={dayLabel(dayOffset)} tone="debug" onPress={skipDay} />
        </View>
        <Scoreboard data={scoreboard} onPressLost={showMemorial} />
      </View>

      <View style={styles.listArea}>
        <FlatList
          data={characters}
          keyExtractor={(character) => character.id}
          renderItem={({ item }) => <CharacterCard character={item} onPress={openCharacter} />}
          contentContainerStyle={[styles.list, { paddingBottom: 140 + insets.bottom }]}
          ListHeaderComponent={
            <AppText variant="caption" color={colors.inkMuted} style={styles.sectionLabel}>
              {sectionLabel(characters.length)}
            </AppText>
          }
          showsVerticalScrollIndicator={false}
        />
        <GhostLayer ghosts={ghosts} onPress={openGhost} />
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,247,236,0)', colors.bg, colors.bg]}
        locations={[0, 0.45, 1]}
        style={[styles.fade, { height: 150 + insets.bottom }]}
      />
      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <RoundButton emoji="💬" label="Fridge group chat" onPress={openChat} />
        <PrimaryButton emoji="📷" label="Scan food" onPress={() => router.push('/scan')} style={styles.scan} />
        <RoundButton emoji="💘" label="Matchmaking" onPress={openMatch} />
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
