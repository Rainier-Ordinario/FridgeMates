import { mockScanResponse } from '@/api/mocks/scan';
import { useFirstRun } from '@/logic/firstRun';
import { useSettings } from '@/logic/settings';
import { formatDollars } from '@/logic/prices';
import { useFridge } from '@/logic/store';
import { colors, radius, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { useTextMe } from './NudgeBanner';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Open scrolled to the demo tools (title long-press). */
  demoFirst?: boolean;
}

/** Every control in one place: voices, sounds, stats, help, reset, about, and the demo tools. */
export function SettingsSheet({ visible, onClose, demoFirst = false }: Props) {
  const settings = useSettings();
  const { scoreboard, loadDemo, addScanned, skipDay, clearAll, dayOffset } = useFridge();
  const { welcomed } = useFirstRun();
  const textMe = useTextMe();

  const after = (fn: () => void) => () => {
    Haptics.selectionAsync();
    onClose();
    setTimeout(fn, 120);
  };

  function confirmReset() {
    Alert.alert('Empty the fridge?', 'Every character goes. Your rescued and lost counts stay.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: after(clearAll) },
    ]);
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Settings" scrollToEnd={demoFirst}>
      <Section title="Sound">
        <ToggleRow
          emoji="🗣️"
          label="Voices"
          caption="Read the fridge chat aloud"
          value={settings.voices}
          onChange={(v) => settings.set('voices', v)}
        />
        <ToggleRow
          emoji="🔔"
          label="Sounds"
          caption="Pops and cheers"
          value={settings.sounds}
          onChange={(v) => settings.set('sounds', v)}
        />
      </Section>

      <Section title="Your stats">
        <View
          style={styles.stats}
          accessible
          accessibilityLabel={`${scoreboard.rescued} rescued, ${scoreboard.lost} lost, about ${formatDollars(scoreboard.savedDollars)} saved`}
        >
          <Stat emoji="🎉" value={String(scoreboard.rescued)} label="rescued" color={colors.success} />
          <Stat emoji="🪦" value={String(scoreboard.lost)} label="lost" color={colors.danger} />
          <Stat emoji="💸" value={formatDollars(scoreboard.savedDollars)} label="saved" color={colors.ink} />
        </View>
      </Section>

      <Section title="Help">
        <LinkRow
          emoji="👋"
          label="How FridgeMates works"
          caption="See the intro again"
          onPress={after(() => router.push('/welcome?replay=1'))}
        />
        <LinkRow
          emoji="🧹"
          label="Reset fridge"
          caption="Empty everything"
          onPress={confirmReset}
          tone="danger"
        />
      </Section>

      <AppText variant="caption" color={colors.inkMuted} align="center" style={styles.about}>
        Made at Fall Hacks 2026 by Rainier, Kenneth and Kerwin.
      </AppText>

      <Section title="Demo mode">
        <ToggleRow
          emoji="🎬"
          label="Demo mode"
          caption="Shows the stage tools and a Skip ahead a day chip"
          value={settings.demoMode}
          onChange={(v) => settings.set('demoMode', v)}
        />
        {settings.demoMode && (
          <>
            <LinkRow
              emoji="🧊"
              label="Load demo fridge"
              caption="The full cast, one per mood, plus a ghost"
              onPress={after(loadDemo)}
            />
            <LinkRow
              emoji="📷"
              label="Add a scan"
              caption="Three new characters, highlighted"
              onPress={after(() => addScanned(mockScanResponse.items))}
            />
            <LinkRow
              emoji="⏭"
              label="Skip a day"
              caption={dayOffset ? `Today +${dayOffset}` : 'Moods shift as the clock moves'}
              onPress={after(skipDay)}
            />
            <LinkRow
              emoji="💬"
              label="Text me"
              caption="The most urgent character sends a message"
              onPress={after(textMe)}
            />
            {!welcomed ? null : null}
          </>
        )}
      </Section>
    </BottomSheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="caption" color={colors.inkMuted} style={styles.sectionTitle}>
        {title.toUpperCase()}
      </AppText>
      {children}
    </View>
  );
}

function ToggleRow({
  emoji,
  label,
  caption,
  value,
  onChange,
}: {
  emoji: string;
  label: string;
  caption: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
    >
      <RowEmoji emoji={emoji} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyBold">{label}</AppText>
        <AppText variant="caption" color={colors.inkMuted}>
          {caption}
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          Haptics.selectionAsync();
          onChange(v);
        }}
        trackColor={{ true: colors.brand, false: colors.line }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

function LinkRow({
  emoji,
  label,
  caption,
  onPress,
  tone = 'default',
}: {
  emoji: string;
  label: string;
  caption: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={caption}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <RowEmoji emoji={emoji} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyBold" color={tone === 'danger' ? colors.dangerStrong : colors.ink}>
          {label}
        </AppText>
        <AppText variant="caption" color={colors.inkMuted}>
          {caption}
        </AppText>
      </View>
      <AppText variant="heading" color={colors.inkFaint}>
        ›
      </AppText>
    </Pressable>
  );
}

function RowEmoji({ emoji }: { emoji: string }) {
  return (
    <View style={styles.rowEmoji}>
      <AppText style={styles.rowEmojiText}>{emoji}</AppText>
    </View>
  );
}

function Stat({
  emoji,
  value,
  label,
  color,
}: {
  emoji: string;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.stat}>
      <AppText style={styles.statEmoji}>{emoji}</AppText>
      <AppText variant="title" color={color}>
        {value}
      </AppText>
      <AppText variant="caption" color={colors.inkMuted}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  sectionTitle: { letterSpacing: 1, marginTop: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  rowEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowEmojiText: { fontSize: 20, lineHeight: 26 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: space.md,
    gap: 2,
  },
  statEmoji: { fontSize: 18, lineHeight: 22 },
  about: { marginVertical: space.xs },
});
