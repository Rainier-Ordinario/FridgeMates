import type { ChatRequest, ChatResponse } from '../types';

const openers = [
  "Don't trust him, he said that to the last avocado.",
  "I've been here four days and nobody has even LOOKED at me.",
  'Relax. I have a printed date. Some of us plan ahead.',
  "If I go, I'm taking the hummus with me.",
  'u up? asking because tomorrow is… a lot for me.',
  "Nobody panic. I'm panicking enough for all of us.",
];

export function mockChatResponse(req: ChatRequest): ChatResponse {
  const items = req.items.slice(0, 4);
  const lines = items.map((item, i) => ({
    id: item.id,
    text: req.userMessage
      ? replyTo(req.userMessage, item.characterName, item.daysLeft)
      : openers[i % openers.length],
  }));
  return { lines };
}

function replyTo(message: string, who: string, daysLeft: number): string {
  if (/eat|cook|dinner|lunch/i.test(message)) {
    return daysLeft <= 1
      ? `PICK ME. I'm literally begging. — ${who}`
      : `Oh, no rush for me. Take the tomato first, he's unwell.`;
  }
  if (/hi|hello|hey/i.test(message)) {
    return `Oh, hello. Nice of you to visit. We've been talking about you.`;
  }
  return `Noted. Does this mean someone is finally eating me, or…?`;
}
