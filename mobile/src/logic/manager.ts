import type { Character, Scoreboard } from './store';
import { plainTimeLabel } from './mood';
import { pickPair } from './matchmaking';
import { formatDollars } from './prices';
import { toChatItem } from '@/api/types';

/**
 * The fridge manager's local answers: instant, correct, offline. Pure functions over the store.
 * TODO(ios-logic): if you add more stats to the store, surface them here.
 */
export type ManagerQuestion = 'eatFirst' | 'cookTonight' | 'expiring' | 'saved' | 'longest';
export type ManagerTone = 'answering' | 'goodNews' | 'badNews';

export interface ManagerAnswer {
  text: string;
  tone: ManagerTone;
  /** Characters to show as tappable faces under the answer. */
  faces: Character[];
  /** An optional follow-up action. */
  action?: 'match';
}

export const managerChips: { id: ManagerQuestion; label: string }[] = [
  { id: 'eatFirst', label: 'What should I eat first?' },
  { id: 'cookTonight', label: 'What can I cook tonight?' },
  { id: 'expiring', label: "What's about to expire?" },
  { id: 'saved', label: 'How much have I saved?' },
  { id: 'longest', label: "Who's been here the longest?" },
];

interface Snapshot {
  characters: Character[];
  ghosts: Character[];
  scoreboard: Scoreboard;
}

const list = (cs: Character[]) =>
  cs.map((c) => `${c.characterName} (${plainTimeLabel(c.daysLeft).toLowerCase()})`).join(', ');

export function answerLocally(q: ManagerQuestion, snap: Snapshot): ManagerAnswer {
  const { characters, ghosts, scoreboard } = snap;
  switch (q) {
    case 'eatFirst': {
      if (characters.length === 0)
        return {
          text: ghosts.length
            ? 'Only ghosts in here. Toss them, then scan something fresh.'
            : 'Nothing to eat yet. Scan your fridge and I will rank everyone.',
          tone: 'badNews',
          faces: ghosts.slice(0, 3),
        };
      const top = characters.slice(0, 3);
      const urgent = top.some((c) => c.daysLeft <= 0);
      return {
        text: urgent
          ? `Today, no excuses: ${list(top)}.`
          : `Start with ${list(top)}. Everyone else can wait.`,
        tone: urgent ? 'badNews' : 'answering',
        faces: top,
      };
    }
    case 'cookTonight': {
      if (characters.length < 2)
        return {
          text: 'I need at least two in here to set up a date. Scan a bit more.',
          tone: 'badNews',
          faces: characters,
        };
      // Same local matchmaker as the Match screen, so the manager and the date card agree.
      const picked = pickPair(characters.map((c) => toChatItem(c, c.daysLeft)));
      const ids = picked ? picked.pair.map((p) => p.id) : characters.slice(0, 2).map((c) => c.id);
      const pair = ids.map((id) => characters.find((c) => c.id === id)).filter((c): c is Character => !!c);
      const dish = picked ? ` ${picked.recipe.title}.` : '';
      return {
        text: `${pair[0].characterName} and ${pair[1].characterName} should date tonight:${dish} Want me to set it up?`,
        tone: 'goodNews',
        faces: pair,
        action: 'match',
      };
    }
    case 'expiring': {
      const soon = characters.filter((c) => c.daysLeft <= 2);
      if (soon.length === 0 && ghosts.length === 0)
        return { text: 'Nothing for the next two days. Enjoy the calm.', tone: 'goodNews', faces: [] };
      const parts = [];
      if (soon.length) parts.push(`${list(soon)}`);
      if (ghosts.length)
        parts.push(
          `${ghosts.length === 1 ? 'one ghost' : `${ghosts.length} ghosts`} still haunting the shelf`,
        );
      return {
        text: `Keep an eye on ${parts.join(', and ')}.`,
        tone: 'badNews',
        faces: [...soon, ...ghosts].slice(0, 4),
      };
    }
    case 'saved': {
      if (scoreboard.rescued === 0)
        return {
          text: 'No rescues yet. Eat something before it turns and I will start counting.',
          tone: 'answering',
          faces: [],
        };
      return {
        text: `${scoreboard.rescued} rescued so far, about ${formatDollars(scoreboard.savedDollars)} saved. ${scoreboard.lost ? `${scoreboard.lost} lost, but who is counting. (Me.)` : 'Nothing lost. Impressive.'}`,
        tone: 'goodNews',
        faces: [],
      };
    }
    case 'longest': {
      const all = [...characters, ...ghosts];
      if (all.length === 0)
        return {
          text: 'Nobody lives here yet. Scan your fridge to move someone in.',
          tone: 'answering',
          faces: [],
        };
      const oldest = [...all].sort((a, b) => a.addedAt.localeCompare(b.addedAt))[0];
      const since = oldest.addedAt;
      return {
        text: `${oldest.characterName} has been here since ${since}. ${oldest.mood === 'ghost' ? 'Too long, honestly.' : 'Settled in nicely.'}`,
        tone: 'answering',
        faces: [oldest],
      };
    }
  }
}

/** Fallback for free-text questions in mock mode or when the backend is unreachable. */
export function managerFallback(question: string): string {
  const q = question.toLowerCase();
  if (/eat|first|urgent/.test(q)) return 'Try "What should I eat first?" and I will rank everyone.';
  if (/cook|dinner|recipe/.test(q)) return 'Tap "What can I cook tonight?" and I will set up a date.';
  if (/expire|expiring|bad|old/.test(q)) return 'Tap "What\'s about to expire?" for the worry list.';
  if (/save|money|\$/.test(q)) return 'Tap "How much have I saved?" and I will do the math.';
  return 'I am better with the questions below. Pick one and I will answer right away.';
}
