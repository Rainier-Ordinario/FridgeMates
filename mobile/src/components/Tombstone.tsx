import { colors, moods, space } from '@/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { Face } from './Face';

interface Props {
  emoji: string;
  name: string;
  /** "Nov 1 – Nov 4" */
  dates: string;
  epitaph: string;
}

/** Memorial-wall stone: arched top, ghost tint, epitaph from /ghost. */
export function Tombstone({ emoji, name, dates, epitaph }: Props) {
  const g = moods.ghost;
  return (
    <View style={[styles.stone, { backgroundColor: g.tint, borderColor: g.color }]}>
      <Face emoji={emoji} mood="ghost" size={48} showBadge={false} animated={false} />
      <AppText variant="bodyBold" align="center" style={styles.name}>
        {name}
      </AppText>
      <AppText style={styles.dates} color={g.text} align="center">
        {dates}
      </AppText>
      <AppText style={styles.epitaph} color={g.text} align="center">
        {epitaph}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  stone: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 2,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingTop: 20,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  name: { marginTop: space.xs },
  dates: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, lineHeight: 16 },
  epitaph: {
    fontFamily: 'Nunito_500Medium',
    fontSize: 13,
    lineHeight: 18,
    marginTop: space.xs,
    color: colors.inkMuted,
  },
});
