import { fluentIcons, type FluentIconName } from '../../assets/icons/fluent.generated';
import { foodIconFor } from '@/logic/foodIcons';
import React from 'react';
import { SvgXml } from 'react-native-svg';

/** Renders one bundled Microsoft Fluent Emoji (flat) icon. Works offline; MIT licensed. */
export function UiIcon({ icon, size = 24 }: { icon: FluentIconName; size?: number }) {
  const def = fluentIcons[icon];
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${def.w} ${def.h}">${def.body}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}

/** The icon for a food item, chosen from its name ("greek yogurt" → jar). */
export function FoodIcon({ name, size = 24 }: { name: string; size?: number }) {
  return <UiIcon icon={foodIconFor(name)} size={size} />;
}

export type { FluentIconName };
