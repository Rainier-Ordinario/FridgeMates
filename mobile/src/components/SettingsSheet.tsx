import { mockScanResponse } from '@/api/mocks/scan';
import { useFirstRun } from '@/logic/firstRun';
import {
  getNotificationPermission,
  requestNotificationPermission,
  scheduleTestNotification,
} from '@/logic/notifications';
import { useSettings } from '@/logic/settings';
import { formatDollars } from '@/logic/prices';
import { useFridge } from '@/logic/store';
import { colors, radius, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppText } from './AppText';
import { UiIcon, type FluentIconName } from './FoodIcon';
import { BottomSheet } from './BottomSheet';
import { ProfilePicture } from './ProfilePicture';
import { useNudge, useTextMe } from './NudgeBanner';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Open scrolled to the demo tools (title long-press). */
  demoFirst?: boolean;
  /** Demo: opens the fridge manager with a blocked phrase to show the refusal. */
  onTestSafety?: () => void;
}

/** Every control in one place: voices, sounds, stats, help, reset, about, and the demo tools. */
export function SettingsSheet({ visible, onClose, demoFirst = false, onTestSafety }: Props) {
  const settings = useSettings();
  const { scoreboard, loadDemo, addScanned, skipDay, clearAll, dayOffset, characters } = useFridge();
  const { welcomed } = useFirstRun();
  const textMe = useTextMe();
  const { showToast } = useNudge();

  async function toggleNotifications(on: boolean) {
    if (!on) {
      settings.set('notifications', false);
      return;
    }
    settings.set('notificationsAsked', true);
    const status = await getNotificationPermission();
    const granted =
      status === 'granted' || (status === 'undetermined' && (await requestNotificationPermission()));
    settings.set('notifications', granted);
    if (!granted) showToast('Allow notifications for FridgeMates in iOS Settings.');
  }

  const after = (fn: () => void) => () => {
    Haptics.selectionAsync();
    onClose();
    setTimeout(fn, 120);
  };

  function confirmReset() {
    Alert.alert('Reset your fridge?', "Everyone moves out. This can't be undone.", [
      { text: 'Keep them', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: after(clearAll) },
    ]);
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Settings" scrollToEnd={demoFirst}>
      <Section title="Sound">
        <ToggleRow
          icon="bell"
          label="Sounds"
          caption="Pops, sighs and confetti"
          value={settings.sounds}
          onChange={(v) => settings.set('sounds', v)}
        />
        <ToggleRow
          icon="mobile-phone"
          label="Notifications"
          caption="Max 2 a day, never at night"
          value={settings.notifications}
          onChange={(v) => void toggleNotifications(v)}
        />
      </Section>

      <Section title="Your stats">
        <View style={styles.statsHead}>
          <ProfilePicture size={40} accessibilityLabel="Your profile picture" />
          <AppText variant="bodyBold">{settings.fridgeName}</AppText>
        </View>
        <View
          style={styles.stats}
          accessible
          accessibilityLabel={`${scoreboard.rescued} rescued, ${scoreboard.lost} lost, about ${formatDollars(scoreboard.savedDollars)} saved`}
        >
          <Stat
            icon="party-popper"
            value={String(scoreboard.rescued)}
            label="rescued"
            color={colors.successText}
          />
          <Stat icon="headstone" value={String(scoreboard.lost)} label="lost" color={colors.dangerStrong} />
          <Stat
            icon="money-with-wings"
            value={formatDollars(scoreboard.savedDollars)}
            label="saved"
            color={colors.ink}
          />
        </View>
      </Section>

      <Section title="Help">
        <LinkRow
          icon="waving-hand"
          label="How FridgeMates works"
          caption="See the intro again"
          onPress={after(() => router.push('/welcome?replay=1'))}
        />
        <LinkRow
          icon="broom"
          label="Reset fridge"
          caption="Empty everything"
          onPress={confirmReset}
          tone="danger"
        />
      </Section>

      <AppText variant="caption" color={colors.inkMuted} align="center" style={styles.about}>
        v1.0 · Made at Fall Hacks 2026 by Rainier, Kenneth and Kerwin.
        {'\n'}Mascot courtesy of the Fall Hacks organizers.
        {'\n'}Food icons: Microsoft Fluent Emoji (MIT).
      </AppText>

      <Section title="Demo mode">
        <ToggleRow
          icon="clapper-board"
          label="Demo mode"
          caption="Shows the stage tools and a Skip ahead a day chip"
          value={settings.demoMode}
          onChange={(v) => settings.set('demoMode', v)}
        />
        {settings.demoMode && (
          <>
            <LinkRow
              icon="ice"
              label="Load demo fridge"
              caption="The full cast, one per mood, plus a ghost"
              onPress={after(loadDemo)}
            />
            <LinkRow
              icon="camera"
              label="Add a scan"
              caption="Three new characters, highlighted"
              onPress={after(() => addScanned(mockScanResponse.items))}
            />
            <LinkRow
              icon="fast-forward-button"
              label="Skip a day"
              caption={dayOffset ? `Today +${dayOffset}` : 'Moods shift as the clock moves'}
              onPress={after(skipDay)}
            />
            <LinkRow
              icon="speech-balloon"
              label="Text me"
              caption="The most urgent character sends a message"
              onPress={after(textMe)}
            />
            <LinkRow
              icon="bell"
              label="Send test notification"
              caption="Lock the phone: a real one lands in 5 seconds (banner if denied)"
              onPress={after(async () => {
                const ok = await scheduleTestNotification(characters[0]);
                if (ok) showToast('Lock your phone. It arrives in 5 seconds.');
                else textMe();
              })}
            />
            {onTestSafety && (
              <LinkRow
                icon="shield"
                label="Test safety filter"
                caption="Sends a blocked phrase; shows the friendly refusal"
                onPress={after(onTestSafety)}
              />
            )}
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
  icon,
  label,
  caption,
  value,
  onChange,
}: {
  icon: FluentIconName;
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
      <RowEmoji icon={icon} />
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
        trackColor={{ true: colors.brandDark, false: colors.inkMuted }}
        thumbColor={colors.surface}
      />
    </View>
  );
}

function LinkRow({
  icon,
  label,
  caption,
  onPress,
  tone = 'default',
}: {
  icon: FluentIconName;
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
      <RowEmoji icon={icon} />
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

function RowEmoji({ icon }: { icon: FluentIconName }) {
  return (
    <View style={styles.rowEmoji}>
      <UiIcon icon={icon} size={22} />
    </View>
  );
}

function Stat({
  icon,
  value,
  label,
  color,
}: {
  icon: FluentIconName;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.stat}>
      <UiIcon icon={icon} size={18} />
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
    backgroundColor: colors.bg,
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
  statsHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingBottom: space.xs },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingVertical: space.md,
    gap: 2,
  },
  statEmoji: { fontSize: 18, lineHeight: 22 },
  about: { marginVertical: space.xs },
});
