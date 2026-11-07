import { CATEGORIES, categoryOf, type Category } from './categories';
import { estimatePrice } from './prices';
import type { Character } from './store';

/** Pure helpers for the My Fridge overview. */
export type Urgency = 'today' | 'week' | 'good' | 'expired';

export interface UrgencyBuckets {
  today: Character[];
  week: Character[];
  good: Character[];
  expired: Character[];
}

export function urgencyOf(c: Character): Urgency {
  if (c.mood === 'ghost' || c.daysLeft < 0) return 'expired';
  if (c.daysLeft === 0) return 'today';
  if (c.daysLeft <= 6) return 'week';
  return 'good';
}

export function urgencyBuckets(characters: Character[], ghosts: Character[]): UrgencyBuckets {
  const b: UrgencyBuckets = { today: [], week: [], good: [], expired: [...ghosts] };
  for (const c of characters) b[urgencyOf(c)].push(c);
  return b;
}

export const urgencyLabel: Record<Urgency, string> = {
  today: 'Eat today',
  week: 'This week',
  good: 'Good for now',
  expired: 'Expired',
};

export interface CategoryGroup {
  category: Category;
  count: number;
  faces: Character[];
}

export function categoryGroups(characters: Character[]): CategoryGroup[] {
  return CATEGORIES.map((category) => {
    const members = characters.filter((c) => categoryOf(c.name) === category);
    return { category, count: members.length, faces: members.slice(0, 4) };
  });
}

/** Rough value of what is in the fridge now (unexpired items), from the local price table. */
export function fridgeValue(characters: Character[]): number {
  return characters.reduce((sum, c) => sum + estimatePrice(c.name), 0);
}

/** One line from the fridge manager, and whether it is happy or sad about it. */
export function summaryLine(b: UrgencyBuckets): { text: string; happy: boolean } {
  const n = (k: keyof UrgencyBuckets) => b[k].length;
  const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);
  if (n('expired') > 0) {
    return {
      text: `${n('expired')} ${plural(n('expired'), 'ghost', 'ghosts')} haunting the shelf. Toss them and start fresh.`,
      happy: false,
    };
  }
  if (n('today') > 0) {
    return {
      text: `${n('today')} ${plural(n('today'), 'roommate needs', 'roommates need')} you today. Start with ${b.today[0].characterName}.`,
      happy: false,
    };
  }
  if (n('week') > 0) {
    return { text: `${n('week')} to eat this week. ${b.week[0].characterName} first.`, happy: true };
  }
  return { text: 'All calm in here. Nice work.', happy: true };
}
