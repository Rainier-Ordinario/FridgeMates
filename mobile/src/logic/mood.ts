import type { FoodItem, ScanItem } from '@/api/types';
import type { Mood } from '@/theme/moods';
import { addDays, daysBetween, todayISO } from './dates';

/**
 * Expiry → mood engine.
 *
 * TODO(ios-logic): owned by the data-model teammate. This is a working stub
 * that implements the README table so the UI can render. Keep `moodFor` and
 * `daysLeftFor` signatures stable; the UI depends on them.
 *
 *  6+ cocky · 3–5 chill · 1–2 nervous · 0 dramatic · <0 ghost
 */
export function moodFor(daysLeft: number): Mood {
  if (daysLeft < 0) return 'ghost';
  if (daysLeft === 0) return 'dramatic';
  if (daysLeft <= 2) return 'nervous';
  if (daysLeft <= 5) return 'chill';
  return 'cocky';
}

export function daysLeftFor(item: Pick<FoodItem, 'expiresAt'>, dayOffset = 0): number {
  return daysBetween(todayISO(dayOffset), item.expiresAt);
}

/** Human label for the countdown pill. Never a food-safety verdict, just a "use soon" nudge. */
export function daysLeftLabel(daysLeft: number): string {
  if (daysLeft < -1) return `${-daysLeft} days ago`;
  if (daysLeft === -1) return 'yesterday';
  if (daysLeft === 0) return 'use today!';
  if (daysLeft === 1) return '1 day left';
  return `${daysLeft} days left`;
}

/** Plain-language time for cards and pills: what to do, not a number. */
export function plainTimeLabel(daysLeft: number): string {
  if (daysLeft < 0) return 'Expired';
  if (daysLeft === 0) return 'Eat today!';
  if (daysLeft === 1) return 'Eat by tomorrow';
  if (daysLeft <= 5) return `Eat within ${daysLeft} days`;
  if (daysLeft <= 13) return 'Good for a week';
  if (daysLeft <= 27) return 'Good for 2 weeks';
  return 'Good for a month+';
}

export function dateSourceLabel(source: FoodItem['dateSource']): string {
  switch (source) {
    case 'printed':
      return 'from the label';
    case 'estimated':
      return 'estimated';
    case 'adjusted':
      return 'adjusted by you';
  }
}

let counter = 0;
export function newLocalId(prefix = 'item'): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

/** The app assigns each scanned item a local id and converts daysLeft into a calendar date. */
export function scanItemToFoodItem(scan: ScanItem, dayOffset = 0): FoodItem {
  const today = todayISO(dayOffset);
  return {
    id: newLocalId(),
    name: scan.name,
    emoji: scan.emoji,
    characterName: scan.characterName,
    personality: scan.personality,
    intro: scan.intro,
    dateSource: scan.dateSource,
    addedAt: today,
    expiresAt: addDays(today, scan.daysLeft),
    status: 'inFridge',
  };
}
