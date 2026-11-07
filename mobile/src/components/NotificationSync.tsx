import { syncNudges, type NudgeData } from '@/logic/notifications';
import { useSettings } from '@/logic/settings';
import { useFridge } from '@/logic/store';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

/**
 * Keeps scheduled notifications in step with the fridge (debounced), and routes taps:
 * a single item opens its detail, a grouped one opens the Fridge filtered to "Eat today".
 */
export function NotificationSync() {
  const { characters, hydrated } = useFridge();
  const { notifications } = useSettings();

  useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => void syncNudges(characters, notifications), 600);
    return () => clearTimeout(id);
  }, [characters, notifications, hydrated]);

  useEffect(() => {
    const open = (data: NudgeData | undefined) => {
      if (!data) return;
      if ('itemId' in data) router.push({ pathname: '/item/[id]', params: { id: data.itemId } });
      else router.navigate({ pathname: '/', params: { urgency: data.urgency, t: String(Date.now()) } });
    };
    const sub = Notifications.addNotificationResponseReceivedListener((r) =>
      open(r.notification.request.content.data as NudgeData),
    );
    Notifications.getLastNotificationResponseAsync()
      .then((r) => r && open(r.notification.request.content.data as NudgeData))
      .catch(() => {});
    return () => sub.remove();
  }, []);

  return null;
}
