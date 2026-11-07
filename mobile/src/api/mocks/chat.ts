import type { ChatItem, ChatRequest, ChatResponse } from '../types';

/** Lines fit the speaker's mood: cocky = confident, chill = relaxed, nervous = worried, dramatic = begging, ghost = haunting. */
const pools = {
  cocky: [
    "Relax. I've outlived three fridges.",
    'Some of us have printed dates. Some of us plan ahead.',
    'Wake me when something interesting expires.',
  ],
  chill: [
    'No rush on my end. Enjoy your week.',
    'Must you all be so loud before breakfast.',
    "I'm good for days. Take care of the loud ones first.",
  ],
  nervous: [
    'Is it hot in here or is it just me?',
    'u up? asking because tomorrow is… a lot for me.',
    'Not to be clingy, but has anyone checked on me?',
  ],
  dramatic: [
    'Tonight is my one perfect day. TONIGHT.',
    'Nobody panic. I am panicking enough for everyone.',
    'If I go, I am taking the hummus with me.',
  ],
  ghost: [
    'Still here. Nobody tossed me. Rude.',
    'The back of the fridge is a cold, cold place.',
    'Boo. Also, the bin is right there.',
  ],
} as const;

type MoodKey = keyof typeof pools;

function moodOf(i: ChatItem): MoodKey {
  if (i.daysLeft < 0) return 'ghost';
  if (i.daysLeft === 0) return 'dramatic';
  if (i.daysLeft <= 2) return 'nervous';
  if (i.daysLeft <= 5) return 'chill';
  return 'cocky';
}

function hash(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function mockChatResponse(req: ChatRequest): ChatResponse {
  // The most urgent speak first; up to four lines per round.
  const items = [...req.items].sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 4);
  const used = new Set<string>();
  const lines = items.map((item) => {
    const mood = moodOf(item);
    const pool = pools[mood];
    let text: string;
    if (req.userMessage) {
      text = replyTo(req.userMessage, item, mood);
    } else {
      // No two characters repeat a line in the same round.
      const start = hash(item.id) % pool.length;
      let pick = pool[start];
      for (let k = 0; k < pool.length && used.has(pick); k++) pick = pool[(start + k + 1) % pool.length];
      text = pick;
    }
    used.add(text);
    return { id: item.id, text };
  });
  return { lines };
}

function replyTo(message: string, item: ChatItem, mood: MoodKey): string {
  const m = message.toLowerCase();
  if (/who goes first|first|urgent/.test(m)) {
    return mood === 'dramatic'
      ? 'ME. Obviously me. Tonight.'
      : mood === 'nervous'
        ? 'Me, please. Soon-ish?'
        : mood === 'ghost'
          ? 'Too late for me. Learn from this.'
          : 'Not me. I have time.';
  }
  if (/cook|eat|dinner|lunch|recipe|hungry/.test(m)) {
    return mood === 'dramatic'
      ? 'PICK ME. I am literally begging.'
      : mood === 'nervous'
        ? "I'd be great in a salad. Just saying."
        : mood === 'cocky'
          ? 'Take the worried ones first. I can wait.'
          : mood === 'ghost'
            ? 'I would have been delicious. Once.'
            : 'No rush for me, but I am open to it.';
  }
  if (/roast|insult|mess|judge/.test(m)) {
    return mood === 'cocky'
      ? 'This fridge is a cry for help, and I am the only adult in it.'
      : mood === 'ghost'
        ? 'A fridge that forgot me cannot be trusted.'
        : 'Honestly? The crisper drawer is a crime scene.';
  }
  if (/hi|hello|hey/.test(m)) {
    return mood === 'nervous'
      ? 'Oh hi! Hi. Everything is fine. Is it?'
      : mood === 'dramatic'
        ? 'Hello? HELLO. Finally.'
        : 'Oh, hello. We were just talking about you.';
  }
  return mood === 'dramatic'
    ? 'Does this mean someone is finally eating me?'
    : mood === 'ghost'
      ? 'Noted. From beyond the shelf.'
      : 'Noted. Does this mean dinner?';
}
