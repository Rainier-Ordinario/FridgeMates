import type { MessagesRequest, MessagesResponse } from '../types';

/** "Your food texts you": one line for the most urgent items. */
export function mockMessagesResponse(req: MessagesRequest): MessagesResponse {
  const sorted = [...req.items].sort((a, b) => a.daysLeft - b.daysLeft);
  const urgent = sorted.filter((i) => i.daysLeft <= 2);
  const pick = urgent.length ? urgent : sorted.slice(0, 1);
  return {
    messages: pick.map((i) => ({
      id: i.id,
      text:
        i.daysLeft <= 0
          ? "it's today. it's literally today."
          : i.daysLeft <= 2
            ? "u up? it's about tomorrow"
            : 'thinking about you. also about my expiry date.',
    })),
  };
}
