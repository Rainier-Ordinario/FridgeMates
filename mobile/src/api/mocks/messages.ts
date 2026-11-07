import type { MessagesRequest, MessagesResponse } from '../types';

export function mockMessagesResponse(req: MessagesRequest): MessagesResponse {
  return {
    messages: req.items
      .filter((i) => i.daysLeft <= 2)
      .map((i) => ({
        id: i.id,
        text:
          i.daysLeft <= 0
            ? `it's today. it's literally today. — ${i.characterName}`
            : `u up? it's about tomorrow`,
      })),
  };
}
