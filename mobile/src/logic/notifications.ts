import type { FoodItem } from '@/api/types';

/**
 * Local "your food texts you" notifications.
 *
 * TODO(ios-logic): owned by the notifications teammate. Implement with
 * expo-notifications: request permission once, then schedule one nudge per
 * nervous/dramatic item using text from POST /messages. No-op stub for now.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}

export async function scheduleNudges(_items: FoodItem[]): Promise<void> {
  // intentionally empty
}

export async function cancelAllNudges(): Promise<void> {
  // intentionally empty
}
