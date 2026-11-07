import { api } from '@/api/client';
import { toChatItem } from '@/api/types';
import { AppText } from '@/components/AppText';
import { Chip } from '@/components/Buttons';
import { SendIcon, SpeakerIcon, StopIcon } from '@/components/Icons';
import { Face } from '@/components/Face';
import { useNudge } from '@/components/NudgeBanner';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { TypingDots } from '@/components/TypingDots';
import { FRIDGE_FRIENDLY_LINE, isBlocked, withSafetyRule } from '@/logic/safety';
import { useSettings } from '@/logic/settings';
import { useFridge, type Character } from '@/logic/store';
import { voiceFor } from '@/logic/voices';
import { colors, hit, moods, radius, shadow, space } from '@/theme';
import * as Haptics from 'expo-haptics';
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
import Animated, {
  Easing,
  FadeInUp,
  cancelAnimation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface Msg {
  key: string;
  /** item id, or 'me' for the user */
  from: string;
  text: string;
}

/** Fridge group chat: characters gossip in mood-tinted bubbles; "Play voices" reads them aloud on tap. */
export default function ChatScreen() {
  const { characters, ghosts } = useFridge();
  const { voices } = useSettings();
  const { showToast } = useNudge();
  const members = useMemo(() => [...characters, ...ghosts], [characters, ghosts]);
  const byId = useCallback((id: string) => members.find((m) => m.id === id), [members]);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const speaking = speakingKey !== null;
  const seq = useRef(0);
  const session = useRef(0);
  const listRef = useRef<FlatList<Msg>>(null);

  const ask = useCallback(
    async (userMessage?: string) => {
      if (members.length === 0) return;
      setLoading(true);
      try {
        const res = await api.chat({
          items: members.map((m) => toChatItem(m, m.daysLeft)),
          userMessage: withSafetyRule(userMessage ?? ''),
        });
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

  function sendText(text: string) {
    setDraft('');
    setMsgs((prev) => [...prev, { key: `m${seq.current++}`, from: 'me', text }]);
    // Organizers' rule: nothing vulgar reaches the API; the fridge nudges toward the chips instead.
    if (isBlocked(text)) {
      setMsgs((prev) => [...prev, { key: `m${seq.current++}`, from: 'fridge', text: FRIDGE_FRIENDLY_LINE }]);
      return;
    }
    // "Roast my fridge" and friends: the food gets teased, never the user.
    ask(/roast|judge|insult/i.test(text) ? `${text} (Roast the food only, never me.)` : text);
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    Haptics.selectionAsync();
    sendText(text);
  }

  const data = useMemo(() => [...msgs].reverse(), [msgs]);

  function stopVoices() {
    session.current += 1;
    Speech.stop();
    setSpeakingKey(null);
  }

  /** Reads every character line in order, each with its own pitch/rate, with a short breath between speakers. */
  function playVoices() {
    if (speaking) {
      stopVoices();
      return;
    }
    const lines = msgs.filter((m) => m.from !== 'me');
    if (lines.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const id = ++session.current;
    let i = 0;
    const next = () => {
      if (session.current !== id) return;
      if (i >= lines.length) {
        setSpeakingKey(null);
        return;
      }
      const m = lines[i++];
      const who = byId(m.from);
      const v = voiceFor(who ?? { characterName: 'The Fridge' });
      setSpeakingKey(m.key);
      const index = data.findIndex((d) => d.key === m.key);
      if (index >= 0) {
        try {
          listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
        } catch {
          // ref not ready; the line still plays
        }
      }
      const after = () => {
        setTimeout(next, 250);
      };
      const failed = () => {
        showToast('They lost their voice. Reading it out instead.');
        after();
      };
      Speech.speak(m.text, {
        pitch: v.pitch,
        rate: v.rate,
        language: v.language,
        onDone: after,
        onError: failed,
        onStopped: () => {
          if (session.current === id) setSpeakingKey(null);
        },
      });
    };
    next();
  }

  return (
    <Screen edges={['top', 'left', 'right']}>
      <TopBar
        title={
          <View style={styles.headerText}>
            <AppText variant="heading" numberOfLines={1} accessibilityRole="header" style={styles.chatTitle}>
              Fridge chat
            </AppText>
            <View style={styles.avatars} accessible accessibilityLabel={`${members.length} members`}>
              {members.slice(0, 6).map((m, i) => (
                <View key={m.id} style={[styles.avatar, { marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }]}>
                  <Face
                    food={m.name}
                    emoji={m.emoji}
                    mood={m.mood}
                    size={32}
                    animated={false}
                    showBadge={false}
                  />
                </View>
              ))}
            </View>
          </View>
        }
        right={
          voices ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={speaking ? 'Stop voices' : 'Play voices'}
              onPress={playVoices}
              style={({ pressed }) => [styles.playChip, pressed && styles.pressed]}
            >
              <View style={[styles.playDot, speaking && { backgroundColor: colors.danger }]}>
                {speaking ? <StopIcon /> : <SpeakerIcon size={18} />}
              </View>
              <AppText variant="caption">{speaking ? 'Stop' : 'Play voices'}</AppText>
            </Pressable>
          ) : undefined
        }
      />

      <AppText variant="caption" color={colors.inkMuted} align="center" style={styles.dayCaption}>
        Today · {members.length} members
        {ghosts.length ? `, ${ghosts.length} ghost${ghosts.length > 1 ? 's' : ''}` : ''}
      </AppText>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={data}
          inverted
          onScrollToIndexFailed={() => {}}
          keyExtractor={(m) => m.key}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !loading && msgs[msgs.length - 1]?.from === 'fridge' ? (
              <View style={styles.retryRow}>
                <Chip emoji="🔁" label="Try again" onPress={() => ask()} />
              </View>
            ) : loading ? (
              <View style={styles.typingRow}>
                <View style={styles.faceCol}>
                  <AppText style={{ fontSize: 24 }}>🧊</AppText>
                </View>
                <TypingDots />
              </View>
            ) : undefined
          }
          ListFooterComponent={
            msgs.length < 3 && members.length > 0 ? (
              <View style={styles.intro}>
                <View style={styles.introFaces}>
                  {members.slice(0, 5).map((m, i) => (
                    <View
                      key={m.id}
                      style={[styles.introFace, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}
                    >
                      <Face
                        food={m.name}
                        emoji={m.emoji}
                        mood={m.mood}
                        size={44}
                        animated={false}
                        showBadge={false}
                        label={m.characterName}
                      />
                    </View>
                  ))}
                </View>
                <AppText style={styles.introText} align="center">
                  Your food has opinions. Ask it anything.
                </AppText>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            !loading && members.length === 0 ? (
              <AppText variant="body" color={colors.inkMuted} align="center" style={styles.typing}>
                Your food has opinions. Ask it anything.
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

        {members.length > 0 && (
          <View style={styles.promptRow} accessibilityLabel="Suggested questions">
            {['Who goes first?', 'What can I cook?', 'Roast my fridge'].map((q) => (
              <Pressable
                key={q}
                accessibilityRole="button"
                accessibilityLabel={`Ask: ${q}`}
                onPress={() => {
                  Haptics.selectionAsync();
                  sendText(q);
                }}
                style={({ pressed }) => [styles.prompt, pressed && styles.pressed]}
              >
                <AppText style={styles.promptText}>{q}</AppText>
              </Pressable>
            ))}
          </View>
        )}
        <View style={styles.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            placeholder="Say something to your food..."
            placeholderTextColor={colors.inkMuted}
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
            <SendIcon color={draft.trim() ? colors.ink : colors.inkMuted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Bubble({ msg, who, active }: { msg: Msg; who?: Character; active: boolean }) {
  const reduceMotion = useReducedMotion();
  const mood = who?.mood ?? 'chill';
  const m = moods[mood];
  const isGhost = mood === 'ghost';
  const isMe = msg.from === 'me';

  // Eases in/out instead of snapping, so the hand-off between speakers feels smooth.
  const hot = useSharedValue(0);
  const bounce = useSharedValue(0);
  useEffect(() => {
    hot.value = withTiming(active ? 1 : 0, { duration: 180, easing: Easing.out(Easing.quad) });
    if (active && !reduceMotion) {
      bounce.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 300, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(bounce);
      bounce.value = withTiming(0, { duration: 180 });
    }
  }, [active, reduceMotion, hot, bounce]);
  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(hot.value, [0, 1], [1, 1.03]) }],
    borderColor: interpolateColor(hot.value, [0, 1], ['rgba(0,0,0,0)', m.color]),
  }));
  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));

  if (isMe) {
    return (
      <Animated.View entering={FadeInUp.springify().damping(16)} style={styles.rowMe}>
        <View style={[styles.bubble, styles.bubbleMe]}>
          <AppText variant="body">{msg.text}</AppText>
        </View>
      </Animated.View>
    );
  }
  return (
    <Animated.View
      entering={FadeInUp.springify().damping(16)}
      style={[styles.row, isGhost && { opacity: m.opacity }]}
    >
      <Animated.View style={[styles.faceCol, faceStyle]}>
        {who ? (
          <Face
            food={who.name}
            emoji={who.emoji}
            mood={mood}
            size={40}
            showBadge={false}
            animated={active}
            label={`${who.characterName}, ${m.label}`}
          />
        ) : (
          <AppText style={{ fontSize: 28 }}>🧊</AppText>
        )}
      </Animated.View>
      <View style={styles.bubbleCol}>
        <AppText variant="caption" color={active ? m.text : colors.inkMuted}>
          {who?.characterName ?? 'The Fridge'}
        </AppText>
        <Animated.View style={[styles.bubble, { backgroundColor: m.tint }, bubbleStyle]}>
          <AppText variant="body">{msg.text}</AppText>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerText: { flex: 1, gap: space.xs },
  chatTitle: { fontFamily: 'Nunito_800ExtraBold' },
  dayCaption: { paddingBottom: space.sm },
  avatars: { flexDirection: 'row' },
  avatar: { borderRadius: 18, borderWidth: 1.5, borderColor: colors.bg },
  playChip: {
    flexShrink: 0,
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
  list: { paddingHorizontal: space.xl, paddingVertical: space.md, gap: 10 },
  typing: { paddingVertical: space.sm, paddingLeft: 52 },
  retryRow: { paddingLeft: 52, paddingVertical: space.xs },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, maxWidth: 302 },
  rowMe: { alignSelf: 'flex-end', maxWidth: 262 },
  faceCol: { width: 40, alignItems: 'center' },
  bubbleCol: { flex: 1, gap: 4 },
  bubble: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0)',
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
  intro: { alignItems: 'center', gap: space.md, paddingVertical: space.xl },
  introFaces: { flexDirection: 'row' },
  introFace: { borderRadius: 24, borderWidth: 2, borderColor: colors.bg },
  introText: { fontFamily: 'Nunito_700Bold', fontSize: 17, lineHeight: 22 },
  promptRow: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    flexWrap: 'wrap',
  },
  prompt: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    justifyContent: 'center',
  },
  promptText: { fontFamily: 'Nunito_700Bold', fontSize: 15, lineHeight: 20 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
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
  sendDisabled: { backgroundColor: colors.line },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
