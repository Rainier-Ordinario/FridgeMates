import { api } from '@/api/client';
import { toChatItem } from '@/api/types';
import { AppText } from '@/components/AppText';
import { RoundButton } from '@/components/Buttons';
import { Face } from '@/components/Face';
import { Screen } from '@/components/Screen';
import { useFridge, type Character } from '@/logic/store';
import { voiceFor } from '@/logic/voices';
import { colors, hit, moods, radius, shadow, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface Msg {
  key: string;
  /** item id, or 'me' for the user */
  from: string;
  text: string;
}

/** Fridge group chat: characters gossip in mood-tinted bubbles; "Play voices" reads them aloud on tap. */
export default function ChatScreen() {
  const { characters, ghosts } = useFridge();
  const members = useMemo(() => [...characters, ...ghosts], [characters, ghosts]);
  const byId = useCallback((id: string) => members.find((m) => m.id === id), [members]);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const speaking = speakingKey !== null;
  const seq = useRef(0);

  const ask = useCallback(
    async (userMessage?: string) => {
      if (members.length === 0) return;
      setLoading(true);
      try {
        const res = await api.chat({ items: members.map((m) => toChatItem(m, m.daysLeft)), userMessage });
        setMsgs((prev) => [
          ...prev,
          ...res.lines
            .filter((l) => byId(l.id))
            .map((l) => ({ key: `m${seq.current++}`, from: l.id, text: l.text })),
        ]);
      } catch {
        setMsgs((prev) => [
          ...prev,
          { key: `m${seq.current++}`, from: 'fridge', text: 'The fridge is offline. Awkward silence.' },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [members, byId],
  );

  // Opening gossip. Deferred a tick so the effect itself doesn't set state synchronously.
  useEffect(() => {
    const id = setTimeout(() => ask(), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Never leave speech running when the screen goes away.
  useEffect(() => () => void Speech.stop(), []);

  function send() {
    const text = draft.trim();
    if (!text) return;
    Haptics.selectionAsync();
    setDraft('');
    setMsgs((prev) => [...prev, { key: `m${seq.current++}`, from: 'me', text }]);
    ask(text);
  }

  /** Reads every character line in order, each with its own pitch/rate. Starts only from this tap. */
  function playVoices() {
    if (speaking) {
      Speech.stop();
      setSpeakingKey(null);
      return;
    }
    const lines = msgs.filter((m) => m.from !== 'me');
    if (lines.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let i = 0;
    const next = () => {
      if (i >= lines.length) {
        setSpeakingKey(null);
        return;
      }
      const m = lines[i++];
      const who = byId(m.from);
      const v = voiceFor(who ?? { characterName: 'The Fridge' });
      setSpeakingKey(m.key);
      Speech.speak(m.text, {
        pitch: v.pitch,
        rate: v.rate,
        language: v.language,
        onDone: next,
        onError: next,
        onStopped: () => setSpeakingKey(null),
      });
    };
    next();
  }

  const data = useMemo(() => [...msgs].reverse(), [msgs]);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <RoundButton emoji="←" label="Back" size={48} onPress={() => router.back()} />
        <View style={styles.headerText}>
          <AppText variant="heading" style={styles.headerTitle}>
            Fridge group chat
          </AppText>
          <View style={styles.memberRow}>
            <View style={styles.avatars}>
              {members.slice(0, 6).map((m, i) => (
                <View key={m.id} style={[styles.avatar, { marginLeft: i === 0 ? 0 : -6, zIndex: 10 - i }]}>
                  <Face emoji={m.emoji} mood={m.mood} size={22} animated={false} showBadge={false} />
                </View>
              ))}
            </View>
            <AppText variant="caption" color={colors.inkMuted}>
              Today · {members.length} members
              {ghosts.length ? `, ${ghosts.length} ghost${ghosts.length > 1 ? 's' : ''}` : ''}
            </AppText>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={speaking ? 'Stop voices' : 'Play voices'}
          onPress={playVoices}
          style={({ pressed }) => [styles.playChip, pressed && styles.pressed]}
        >
          <View style={[styles.playDot, speaking && { backgroundColor: colors.danger }]}>
            <AppText style={styles.playIcon} color={speaking ? colors.surface : colors.ink}>
              {speaking ? '■' : '▶'}
            </AppText>
          </View>
          <AppText variant="caption">{speaking ? 'Stop' : 'Play voices'}</AppText>
        </Pressable>
      </View>

      <AppText variant="caption" color={colors.inkMuted} align="center" style={styles.dayCaption}>
        Today · {members.length} members
        {ghosts.length ? `, ${ghosts.length} ghost${ghosts.length > 1 ? 's' : ''}` : ''}
      </AppText>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={data}
          inverted
          keyExtractor={(m) => m.key}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            loading ? (
              <AppText variant="caption" color={colors.inkMuted} style={styles.typing}>
                the fridge is typing…
              </AppText>
            ) : undefined
          }
          ListEmptyComponent={
            !loading && members.length === 0 ? (
              <AppText variant="body" color={colors.inkMuted} align="center" style={styles.typing}>
                Nobody’s home. Scan some food first.
              </AppText>
            ) : undefined
          }
          renderItem={({ item }) => (
            <Bubble
              msg={item}
              who={item.from === 'me' ? undefined : byId(item.from)}
              active={item.key === speakingKey}
            />
          )}
        />

        <View style={styles.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            placeholder="Talk to the fridge…"
            placeholderTextColor={colors.inkFaint}
            returnKeyType="send"
            style={styles.input}
            accessibilityLabel="Message the fridge"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            onPress={send}
            disabled={!draft.trim()}
            style={({ pressed }) => [
              styles.send,
              !draft.trim() && styles.sendDisabled,
              pressed && styles.pressed,
            ]}
          >
            <AppText style={styles.sendIcon} color={colors.ink}>
              ➤
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Bubble({ msg, who, active }: { msg: Msg; who?: Character; active: boolean }) {
  if (msg.from === 'me') {
    return (
      <Animated.View entering={FadeInUp.springify().damping(16)} style={styles.rowMe}>
        <View style={[styles.bubble, styles.bubbleMe]}>
          <AppText variant="body">{msg.text}</AppText>
        </View>
      </Animated.View>
    );
  }
  const mood = who?.mood ?? 'chill';
  const m = moods[mood];
  const isGhost = mood === 'ghost';
  return (
    <Animated.View
      entering={FadeInUp.springify().damping(16)}
      style={[styles.row, isGhost && { opacity: m.opacity }]}
    >
      <View style={styles.faceCol}>
        {who ? (
          <Face emoji={who.emoji} mood={mood} size={40} showBadge={false} animated={active} />
        ) : (
          <AppText style={{ fontSize: 28 }}>🧊</AppText>
        )}
      </View>
      <View style={styles.bubbleCol}>
        <AppText variant="caption" color={colors.inkMuted}>
          {who?.characterName ?? 'The Fridge'}
        </AppText>
        <View
          style={[
            styles.bubble,
            { backgroundColor: m.tint },
            active && { borderWidth: 2, borderColor: m.color },
          ]}
        >
          <AppText variant="body">{msg.text}</AppText>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xs,
  },
  headerText: { flex: 1, gap: space.xs },
  headerTitle: { fontSize: 18, lineHeight: 24, fontFamily: 'Nunito_800ExtraBold' },
  dayCaption: { paddingBottom: space.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  avatars: { flexDirection: 'row' },
  avatar: { borderRadius: 13, borderWidth: 1.5, borderColor: colors.bg },
  playChip: {
    flexShrink: 0,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 40,
    paddingLeft: space.xs,
    paddingRight: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  playDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 13, lineHeight: 16 },
  list: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: 10 },
  typing: { paddingVertical: space.sm, paddingLeft: 52 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, maxWidth: 302 },
  rowMe: { alignSelf: 'flex-end', maxWidth: 262 },
  faceCol: { width: 40, alignItems: 'center' },
  bubbleCol: { flex: 1, gap: 4 },
  bubble: {
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    borderBottomLeftRadius: 6,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    maxWidth: 262,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: colors.brand,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: 6,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.xl,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    height: hit.primary,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: space.xl,
    fontFamily: 'Nunito_500Medium',
    fontSize: 16,
    color: colors.ink,
    ...shadow.card,
  },
  send: {
    width: hit.min,
    height: hit.min,
    borderRadius: hit.min / 2,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  sendIcon: { fontSize: 20, lineHeight: 24 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
