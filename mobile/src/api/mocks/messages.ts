import type { MessagesRequest, MessagesResponse } from '../types';

export function mockMessagesResponse(req: MessagesRequest): MessagesResponse {
  return {
    messages: req.items
      .filter((i) => i.daysLeft <= 2)
      .map((i) => ({
        id: i.id,
        text: getMessage(i),
      })),
  };
}

function getMessage(item: MessagesRequest['items'][number]): string {
  if (item.daysLeft <= 0) {
    return `it's today. it's literally today. — ${item.characterName}`;
  }
  return `u up? it's about tomorrow`;
}
