import { mockScanResponse } from '@/api/mocks/scan';
import {
  getNotificationPermission,
  requestNotificationPermission,
  scheduleTestNotification,
} from '@/logic/notifications';
import { useSettings } from '@/logic/settings';
import { formatDollars } from '@/logic/prices';
import { useFridge } from '@/logic/store';
import { colors, space } from '@/theme';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { AppText } from './AppText';
import { UiIcon, type FluentIconName } from './FoodIcon';
import { BottomSheet } from './BottomSheet';
import { ProfilePicture } from './ProfilePicture';
import { ProfileSheet } from './ProfileSheet';
import { useNudge, useTextMe } from './NudgeBanner';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Open scrolled to the demo tools (title long-press). */
  demoFirst?: boolean;
  /** Demo: opens the fridge manager with a blocked phrase to show the refusal. */
  onTestSafety?: () => void;
  /** Open with the 'Profile picture' sheet already up (dev link). */
  pictureFirst?: boolean;
}

/** Every control in one place: profile, sounds, stats, help, reset, about, and the demo tools. */
export function SettingsSheet({
  visible,
  onClose,
  demoFirst = false,
  onTestSafety,
  pictureFirst = false,
}: Props) {
  const settings = useSettings();
  const { scoreboard, loadDemo, addScanned, skipDay, clearAll, dayOffset, characters } = useFridge();
  const textMe = useTextMe();
  const { showToast } = useNudge();
  const [pictureOpen, setPictureOpen] = useState(false);
  const [name, setName] = useState(settings.fridgeName);
  useEffect(() => {
    const id = setTimeout(() => setName(settings.fridgeName), 0);
    return () => clearTimeout(id);
  }, [settings.fridgeName]);
  useEffect(() => {
    if (!visible || !pictureFirst) return;
    const id = setTimeout(() => setPictureOpen(true), 500);
    return () => clearTimeout(id);
  }, [visible, pictureFirst]);
  function saveName() {
    const trimmed = name.trim() || 'My fridge';
    setName(trimmed);
    settings.set('fridgeName', trimmed);
  }

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
      <View style={styles.profileHead}>
        <ProfilePicture
          size={56}
          onPress={() => setPictureOpen(true)}
          accessibilityLabel="Change profile picture"
        />
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={saveName}
          onSubmitEditing={saveName}
          maxLength={24}
          returnKeyType="done"
          accessibilityLabel="Fridge name"
          accessibilityHint="Tap to rename your fridge"
          placeholder="My fridge"
          placeholderTextColor={colors.inkMuted}
          style={styles.nameInput}
        />
      </View>
      <ProfileSheet visible={pictureOpen} onClose={() => setPictureOpen(false)} />

      <Section title="Sound">
        <Group>
          <ToggleRow
            icon="bell"
            label="Sounds"
            hint="Pops, sighs and confetti"
            value={settings.sounds}
            onChange={(v) => settings.set('sounds', v)}
          />
          <ToggleRow
            icon="mobile-phone"
            label="Notifications"
            hint="At most two a day, never at night"
            value={settings.notifications}
            onChange={(v) => void toggleNotifications(v)}
          />
        </Group>
      </Section>

      <Section title="Your stats">
        <View
          style={styles.stats}
          accessible
          accessibilityLabel={`${scoreboard.rescued} rescued, ${scoreboard.lost} lost, about ${formatDollars(scoreboard.savedDollars)} saved`}
        >
          <Stat value={String(scoreboard.rescued)} label="rescued" color={colors.successText} />
          <Stat value={String(scoreboard.lost)} label="lost" color={colors.dangerStrong} />
          <Stat value={formatDollars(scoreboard.savedDollars)} label="saved" color={colors.ink} />
        </View>
      </Section>

      <Section title="Help">
        <Group>
          <LinkRow
            icon="waving-hand"
            label="How FridgeMates works"
            hint="See the intro again"
            onPress={after(() => router.push('/welcome?replay=1'))}
          />
          <LinkRow
            icon="broom"
            label="Reset fridge"
            hint="Empty everything"
            onPress={confirmReset}
            tone="danger"
          />
        </Group>
      </Section>

      <AppText variant="caption" color={colors.inkMuted} align="center" style={styles.about}>
        v1.0 · Made at Fall Hacks 2026 by Rainier, Kenneth and Kerwin.
        {'\n'}Mascot courtesy of the Fall Hacks organizers.
        {'\n'}Food icons: Microsoft Fluent Emoji (MIT).
      </AppText>

      <View
        style={styles.demoRow}
        accessible
        accessibilityRole="switch"
        accessibilityLabel="Demo mode"
        accessibilityState={{ checked: settings.demoMode }}
      >
        <UiIcon icon="clapper-board" size={16} />
        <AppText style={styles.demoLabel} color={colors.inkMuted}>
          Demo mode
        </AppText>
        <View style={{ flex: 1 }} />
        <Switch
          value={settings.demoMode}
          onValueChange={(v) => {
            Haptics.selectionAsync();
            settings.set('demoMode', v);
          }}
          trackColor={{ true: colors.brandDark, false: colors.inkMuted }}
          thumbColor={colors.surface}
          style={styles.demoSwitch}
        />
      </View>
      {settings.demoMode && (
        <View style={styles.tools}>
          <Tool icon="ice" label="Load demo fridge" onPress={after(loadDemo)} />
          <Tool icon="camera" label="Add a scan" onPress={after(() => addScanned(mockScanResponse.items))} />
          <Tool
            icon="fast-forward-button"
            label={dayOffset ? `Skip a day (+${dayOffset})` : 'Skip a day'}
            onPress={after(skipDay)}
          />
          <Tool icon="speech-balloon" label="Text me" onPress={after(textMe)} />
          <Tool
            icon="bell"
            label="Test notification"
            hint="Lock the phone: a real one lands in 5 seconds, or a banner if denied"
            onPress={after(async () => {
              const ok = await scheduleTestNotification(characters[0]);
              if (ok) showToast('Lock your phone. It arrives in 5 seconds.');
              else textMe();
            })}
          />
          {onTestSafety && (
            <Tool
              icon="shield"
              label="Test safety filter"
              hint="Sends a blocked phrase; shows the friendly refusal"
              onPress={after(onTestSafety)}
            />
          )}
        </View>
      )}
    </BottomSheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="sectionLabel" color={colors.inkMuted}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

/** Cream card that groups rows with 1pt dividers inset past the icon. */
function Group({ children }: { children: React.ReactNode }) {
  const rows = React.Children.toArray(children);
  return (
    <View style={styles.group}>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={styles.divider} />}
          {row}
        </React.Fragment>
      ))}
    </View>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  value,
  onChange,
}: {
  icon: FluentIconName;
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
    >
      <RowIcon icon={icon} />
      <AppText style={styles.rowLabel} numberOfLines={1}>
        {label}
      </AppText>
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
  hint,
  onPress,
  tone = 'default',
}: {
  icon: FluentIconName;
  label: string;
  hint: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <RowIcon icon={icon} />
      <AppText
        style={styles.rowLabel}
        color={tone === 'danger' ? colors.dangerStrong : colors.ink}
        numberOfLines={1}
      >
        {label}
      </AppText>
      <AppText variant="heading" color={colors.inkFaint}>
        ›
      </AppText>
    </Pressable>
  );
}

function RowIcon({ icon }: { icon: FluentIconName }) {
  return (
    <View style={styles.rowIcon}>
      <UiIcon icon={icon} size={18} />
    </View>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <AppText style={styles.statValue} color={color} numberOfLines={1}>
        {value}
      </AppText>
      <AppText variant="caption" color={colors.inkMuted}>
        {label}
      </AppText>
    </View>
  );
}

/** Demo tool: a 36pt chip inside a 44pt hit area, two per row. */
function Tool({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: FluentIconName;
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => [styles.toolHit, pressed && styles.pressed]}
    >
      <View style={styles.tool}>
        <UiIcon icon={icon} size={16} />
        <AppText style={styles.toolText} numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: 6, marginTop: 6 },
  profileHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  nameInput: {
    flex: 1,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 20,
    lineHeight: 26,
    color: colors.ink,
    minHeight: 44,
    paddingVertical: 0,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.line,
  },
  group: { backgroundColor: colors.bg, borderRadius: 16, paddingHorizontal: 12 },
  divider: { height: 1, backgroundColor: colors.line, marginLeft: 42 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 15, lineHeight: 20 },
  pressed: { opacity: 0.85 },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderRadius: 16,
  },
  statValue: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 17,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
  about: { marginTop: 6 },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44, marginTop: 6 },
  demoLabel: { fontFamily: 'Nunito_700Bold', fontSize: 13, lineHeight: 18 },
  demoSwitch: { transform: [{ scale: 0.86 }] },
  tools: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.sm },
  toolHit: { width: '48%', flexGrow: 1, height: 44, justifyContent: 'center' },
  tool: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: '#FFD3B3',
    borderStyle: 'dashed',
  },
  toolText: { fontFamily: 'Nunito_700Bold', fontSize: 13, lineHeight: 18, flexShrink: 1 },
});
