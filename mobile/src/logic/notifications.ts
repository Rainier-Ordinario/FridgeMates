import type { Character } from './store';
import { safeText } from './safety';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * "Your food texts you": tight local notifications, no push server.
 * Rules: at most 2 per day (09:00 and 19:00 slots), never between 21:00 and 09:00,
 * one the evening before an item is due and one the morning it is due, grouped when several
 * items share a day. Everything is rescheduled from scratch whenever the fridge changes.
 */
export type NudgeData = { itemId: string } | { urgency: 'today' | 'week' };

export interface PlannedNudge {
  date: Date;
  title: string;
  body: string;
  data: NudgeData;
}

const MORNING_HOUR = 9;
const EVENING_HOUR = 19;
const HORIZON_DAYS = 14;
const MAX_SCHEDULED = 28;
const FALLBACK_BODY = 'Eat me soon, please.';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function at(day: Date, hour: number): Date {
  const d = new Date(day);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function startOfToday(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

function morningBody(c: Character): string {
  switch (c.mood) {
    case 'dramatic':
      return "Today's my last perfect day. Don't waste it.";
    case 'nervous':
      return "It's today. I'm trying to stay calm.";
    default:
      return "Today's the day. Dinner plans?";
  }
}

function eveningBody(c: Character): string {
  switch (c.mood) {
    case 'nervous':
      return "Tomorrow's the day. Save me a spot at dinner?";
    default:
      return 'Tomorrow is my day. Think of me.';
  }
}

/** Pure planner, easy to test: which notifications should exist for this fridge, from `now`. */
export function planNudges(characters: Character[], now = new Date()): PlannedNudge[] {
  const today = startOfToday(now);
  const bySlot = new Map<number, { date: Date; items: Character[]; kind: 'morning' | 'evening' }>();
  const alive = characters.filter((c) => c.mood !== 'ghost' && c.daysLeft >= 0 && c.daysLeft <= HORIZON_DAYS);
  for (const c of alive) {
    const due = new Date(today);
    due.setDate(due.getDate() + c.daysLeft);
    const morning = at(due, MORNING_HOUR);
    const eveBefore = at(new Date(due.getTime() - 86_400_000), EVENING_HOUR);
    for (const [date, kind] of [
      [morning, 'morning'],
      [eveBefore, 'evening'],
    ] as const) {
      if (date.getTime() <= now.getTime()) continue;
      const key = date.getTime();
      const slot = bySlot.get(key) ?? { date, items: [], kind };
      slot.items.push(c);
      bySlot.set(key, slot);
    }
  }
  const planned: PlannedNudge[] = [];
  for (const slot of [...bySlot.values()].sort((a, b) => a.date.getTime() - b.date.getTime())) {
    const items = [...slot.items].sort((a, b) => a.daysLeft - b.daysLeft);
    const first = items[0];
    if (items.length === 1) {
      const body = slot.kind === 'morning' ? morningBody(first) : eveningBody(first);
      planned.push({
        date: slot.date,
        title: first.characterName,
        body: safeText(body, FALLBACK_BODY).slice(0, 60),
        data: { itemId: first.id },
      });
    } else {
      const title = `${first.characterName} and ${items.length - 1} other${items.length > 2 ? 's' : ''}`;
      const body =
        slot.kind === 'morning'
          ? `We all need you today. Start with ${first.characterName}.`
          : `${items.length} of us are counting on you tomorrow.`;
      planned.push({
        date: slot.date,
        title: safeText(title, 'Your fridge').slice(0, 60),
        body: safeText(body, FALLBACK_BODY).slice(0, 60),
        data: { urgency: slot.kind === 'morning' ? 'today' : 'week' },
      });
    }
  }
  return planned.slice(0, MAX_SCHEDULED);
}

export async function getNotificationPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) return 'granted';
    return p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const p = await Notifications.requestPermissionsAsync();
    return p.granted;
  } catch {
    return false;
  }
}

/** Cancels everything and schedules the current plan. Safe to call often; never throws. */
export async function syncNudges(characters: Character[], enabled: boolean): Promise<number> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return 0;
    if ((await getNotificationPermission()) !== 'granted') return 0;
    const plan = planNudges(characters);
    for (const n of plan) {
      await Notifications.scheduleNotificationAsync({
        content: { title: n.title, body: n.body, data: n.data as Record<string, unknown>, sound: false },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.date },
      });
    }
    return plan.length;
  } catch {
    return 0;
  }
}

/** Demo: a real notification in 5 seconds, so the phone can be locked on stage. */
export async function scheduleTestNotification(c: Character | undefined): Promise<boolean> {
  try {
    if ((await getNotificationPermission()) !== 'granted') return false;
    const title = c?.characterName ?? 'Your fridge';
    const body = c ? safeText(morningBody(c), FALLBACK_BODY) : 'Everyone in here says hi.';
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: body.slice(0, 60),
        data: (c ? { itemId: c.id } : { urgency: 'today' }) as Record<string, unknown>,
        sound: false,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, repeats: false },
    });
    return true;
  } catch {
    return false;
  }
}

export const notificationsSupported = Platform.OS !== 'web';

// Kept for the data-model owner: these names were the original stub API.
export const scheduleNudges = (items: Character[]) => syncNudges(items, true);
export const cancelAllNudges = () => Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
