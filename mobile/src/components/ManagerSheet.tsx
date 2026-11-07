import { api } from '@/api/client';
import { USE_MOCK } from '@/api/config';
import { toChatItem } from '@/api/types';
import {
  answerLocally,
  managerChips,
  managerFallback,
  type ManagerAnswer,
  type ManagerQuestion,
} from '@/logic/manager';
import { FRIDGE_FRIENDLY_LINE, isBlocked, safeText, withSafetyRule } from '@/logic/safety';
import { useFridge, type Character } from '@/logic/store';
import { colors, hit, radius, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { SecondaryButton } from './Buttons';
import { Face } from './Face';
import { SendIcon } from './Icons';
import { Mascot, type MascotExpression, type MascotState } from './Mascot';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Asked automatically when the sheet opens (demo: Test safety filter). */
  initialQuestion?: string | null;
}

const INTRO = 'I keep an eye on everyone in here. Ask me anything.';
const THINK_MS = 600;

/** Types a string in, ~18 ms per character. Instant under Reduce Motion. */
function useTypewriter(text: string): string {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(reduceMotion ? text : '');
  useEffect(() => {
    if (reduceMotion) {
      const id = setTimeout(() => setShown(text), 0);
      return () => clearTimeout(id);
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [text, reduceMotion]);
  return shown;
}

/** "Ask the fridge manager": chips answer locally from the store; free text asks the backend. */
export function ManagerSheet({ visible, onClose, initialQuestion = null }: Props) {
  const { characters, ghosts, scoreboard } = useFridge();
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'answer'>('idle');
  const [answer, setAnswer] = useState<ManagerAnswer | null>(null);
  const [hopKey, setHopKey] = useState(0);
  const [draft, setDraft] = useState('');
  const [highlightChips, setHighlightChips] = useState(false);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const session = useRef(0);

  useEffect(() => () => void (pending.current && clearTimeout(pending.current)), []);

  useEffect(() => {
    if (!visible || !initialQuestion) return;
    const id = setTimeout(() => askFree(initialQuestion), 450);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialQuestion]);

  const typed = useTypewriter(phase === 'answer' && answer ? answer.text : INTRO);

  function deliver(a: ManagerAnswer) {
    setAnswer(a);
    setPhase('answer');
    setHopKey((k) => k + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function ask(q: ManagerQuestion) {
    Haptics.selectionAsync();
    const id = ++session.current;
    setPhase('thinking');
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => {
      if (session.current !== id) return;
      deliver(answerLocally(q, { characters, ghosts, scoreboard }));
    }, THINK_MS);
  }

  async function askFree(text: string) {
    const q = text.trim();
    if (!q) return;
    Haptics.selectionAsync();
    setDraft('');
    const id = ++session.current;
    setPhase('thinking');
    const fallback = (): ManagerAnswer => ({ text: managerFallback(q), tone: 'answering', faces: [] });
    // Organizers' rule: blocked input never reaches the API; the manager points at the chips.
    if (isBlocked(q)) {
      pending.current = setTimeout(() => {
        if (session.current !== id) return;
        deliver({ text: FRIDGE_FRIENDLY_LINE, tone: 'answering', faces: [] });
        setHighlightChips(true);
        setTimeout(() => setHighlightChips(false), 1600);
      }, 300);
      return;
    }
    if (USE_MOCK) {
      pending.current = setTimeout(() => session.current === id && deliver(fallback()), THINK_MS);
      return;
    }
    try {
      const items = [...characters, ...ghosts].map((c) => toChatItem(c, c.daysLeft));
      const res = await api.chat({
        items,
        userMessage: withSafetyRule(
          `You are the fridge manager, a friendly caretaker who speaks for the whole fridge (not as any single food). If asked to roast or judge, tease the food, never the person. Answer in one or two short sentences: ${q}`,
        ),
      });
      const first = res.lines[0]?.text;
      if (session.current !== id) return;
      deliver(
        first ? { text: safeText(first, managerFallback(q)), tone: 'answering', faces: [] } : fallback(),
      );
    } catch {
      if (session.current === id) deliver(fallback());
    }
  }

  function openCharacter(c: Character) {
    onClose();
    setTimeout(() => router.push({ pathname: '/item/[id]', params: { id: c.id } }), 120);
  }

  const total = characters.length + ghosts.length;
  const baseExpression: MascotExpression = total === 0 ? 'sleepy' : ghosts.length ? 'sad' : 'happy';
  const state: MascotState =
    phase === 'thinking'
      ? 'thinking'
      : phase === 'answer' && answer
        ? answer.tone
        : total === 0
          ? 'empty'
          : 'idle';
  const expression: MascotExpression | undefined =
    phase === 'answer' && answer?.tone === 'badNews' && answer.faces.some((f) => f.mood === 'ghost')
      ? 'shocked'
      : phase === 'idle'
        ? baseExpression
        : undefined;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Your fridge manager">
      <View style={styles.stage}>
        <Mascot
          size={120}
          state={state}
          expression={expression}
          line={phase === 'thinking' ? null : typed}
          hopKey={hopKey}
          interactive={phase !== 'thinking'}
          accessibilityLabel="The fridge manager. Tap for a hello."
        />
      </View>

      {phase === 'answer' && answer && (answer.faces.length > 0 || answer.action) && (
        <View style={styles.answerRow}>
          {answer.faces.length > 0 && (
            <View style={styles.faces}>
              {answer.faces.map((c) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${c.characterName}`}
                  onPress={() => openCharacter(c)}
                  hitSlop={6}
                >
                  <Face food={c.name} emoji={c.emoji} mood={c.mood} size={44} />
                </Pressable>
              ))}
            </View>
          )}
          {answer.action === 'match' && (
            <SecondaryButton
              emoji="🍳"
              label="Find a match"
              outlined
              onPress={() => {
                onClose();
                setTimeout(() => router.push('/match'), 120);
              }}
            />
          )}
        </View>
      )}

      <View style={styles.chips} accessibilityLabel="Suggested questions">
        {managerChips.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={`Ask: ${c.label}`}
            onPress={() => ask(c.id)}
            style={({ pressed }) => [
              styles.chip,
              highlightChips && styles.chipHighlight,
              pressed && styles.pressed,
            ]}
          >
            <AppText style={styles.chipText}>{c.label}</AppText>
          </Pressable>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => askFree(draft)}
          placeholder="Ask about your fridge..."
          placeholderTextColor={colors.inkMuted}
          returnKeyType="send"
          accessibilityLabel="Ask the fridge manager"
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          accessibilityState={{ disabled: !draft.trim() }}
          disabled={!draft.trim()}
          onPress={() => askFree(draft)}
          style={({ pressed }) => [
            styles.send,
            !draft.trim() && styles.sendDisabled,
            pressed && styles.pressed,
          ]}
        >
          <SendIcon color={draft.trim() ? colors.ink : colors.inkMuted} />
        </Pressable>
      </View>
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
  answerRow: { alignItems: 'center', gap: space.md },
  faces: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingTop: space.sm },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.line,
    justifyContent: 'center',
  },
  chipHighlight: { borderColor: colors.brand, backgroundColor: colors.surfaceAlt },
  chipText: { fontFamily: 'Nunito_700Bold', fontSize: 15, lineHeight: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.sm },
  input: {
    flex: 1,
    height: hit.primary,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.line,
    paddingHorizontal: space.xl,
    fontFamily: 'Nunito_500Medium',
    fontSize: 16,
    color: colors.ink,
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
