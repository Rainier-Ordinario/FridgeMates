import { GoogleGenAI } from '@google/genai';

/** Mirrors ScanItem in mobile/src/api/types.ts (the README contract). */
export interface ScanItem {
  name: string;
  emoji: string;
  characterName: string;
  personality: string;
  daysLeft: number;
  dateSource: 'printed' | 'estimated';
  intro: string;
}

/** What we ask Gemini for. Deliberately small: just identify items and estimate shelf life. */
interface RawItem {
  name: string;
  emoji: string;
  daysLeft: number;
  dateSource: 'printed' | 'estimated';
}

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
const MAX_ITEMS = 25;
const MIN_DAYS = -3;
const MAX_DAYS = 365;

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Short common name, e.g. "Greek yogurt", "Spinach", "Leftover pasta"' },
          emoji: { type: 'string', description: 'One emoji that best matches the food' },
          daysLeft: { type: 'integer', description: 'Estimated whole days until it should be used by, from today' },
          dateSource: { type: 'string', enum: ['printed', 'estimated'] },
        },
        required: ['name', 'emoji', 'daysLeft', 'dateSource'],
      },
    },
  },
  required: ['items'],
};

function buildPrompt(today: string): string {
  return `You are the food-expiry estimator for a fridge-tracking app. Today is ${today}.
Look at this photo and list every distinct food or drink item you can identify. Group identical items (e.g. 6 eggs = one "Eggs" item).

For each item, give "daysLeft": the whole number of days from today until it should be used by, assuming it is stored in a fridge.
- If a use-by / best-before date is clearly legible on the package, compute daysLeft from it and set dateSource to "printed".
- Otherwise estimate from typical fridge shelf life for that food and set dateSource to "estimated".
- Adjust for visible condition (wilting, browning, mold, open or half-empty containers => fewer days). Be conservative: when unsure, pick the shorter time.
- Use 0 for "use today" and a negative number only if the item clearly looks past its date.
- Condiments and sealed long-life items can be large (e.g. 90+). Never exceed ${MAX_DAYS}.

Only include real food or drink. Ignore shelves, containers that are empty, and anything you cannot identify. If the photo has no food, return an empty list. Return at most ${MAX_ITEMS} items.`;
}

/** Defensive cleanup of model output so a bad response can't crash the app. */
export function sanitizeItems(raw: unknown): ScanItem[] {
  const list = (raw as { items?: unknown })?.items;
  if (!Array.isArray(list)) return [];
  const out: ScanItem[] = [];
  for (const r of list as Partial<RawItem>[]) {
    const name = typeof r?.name === 'string' ? r.name.trim() : '';
    if (!name || typeof r.daysLeft !== 'number' || !Number.isFinite(r.daysLeft)) continue;
    const daysLeft = Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(r.daysLeft)));
    out.push({
      name,
      emoji: typeof r.emoji === 'string' && r.emoji.trim() ? r.emoji.trim() : '🍽️',
      // Character fields are kept only to satisfy the shared contract. Characters are paused for now.
      characterName: name,
      personality: '',
      daysLeft,
      dateSource: r.dateSource === 'printed' ? 'printed' : 'estimated',
      intro: '',
    });
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

let client: GoogleGenAI | null = null;

export async function scanImage(imageBase64: string, today: string): Promise<ScanItem[]> {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set (see backend/.env.example)');
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const interaction = await client.interactions.create({
    model: MODEL,
    input: [
      { type: 'text', text: buildPrompt(today) },
      { type: 'image', data: imageBase64, mime_type: 'image/jpeg' },
    ],
    response_format: { type: 'text', mime_type: 'application/json', schema: SCHEMA },
    // Don't let Google keep the user's fridge photo around.
    store: false,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(interaction.output_text ?? '');
  } catch {
    throw new Error('Gemini returned something that was not valid JSON');
  }
  return sanitizeItems(parsed);
}
