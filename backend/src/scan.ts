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

// Models are tried in order. 3.1 is fast (~2s) but sometimes returns 503 "high demand"; 3.5 is slower but a good fallback.
// Override with GEMINI_MODELS="a,b" (or a single GEMINI_MODEL).
const MODELS = (process.env.GEMINI_MODELS ?? process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite,gemini-3.5-flash-lite')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
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
  let list: unknown;
  if (raw && typeof raw === 'object') {
    list = (raw as { items?: unknown }).items;
  }
  if (!Array.isArray(list)) return [];
  const out: ScanItem[] = [];
  for (const r of list as Partial<RawItem>[]) {
    let name = '';
    if (typeof r?.name === 'string') {
      name = r.name.trim();
    }
    if (!name || typeof r.daysLeft !== 'number' || !Number.isFinite(r.daysLeft)) continue;
    const daysLeft = Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(r.daysLeft)));
    out.push({
      name,
      emoji: getEmoji(r),
      // Character fields are kept only to satisfy the shared contract. Characters are paused for now.
      characterName: name,
      personality: '',
      daysLeft,
      dateSource: getDateSource(r),
      intro: '',
    });
    if (out.length >= MAX_ITEMS) break;
  }
  return out;
}

function getEmoji(item: Partial<RawItem>): string {
  if (typeof item.emoji === 'string' && item.emoji.trim()) {
    return item.emoji.trim();
  }
  return '🍽️';
}

function getDateSource(item: Partial<RawItem>): RawItem['dateSource'] {
  if (item.dateSource === 'printed') {
    return 'printed';
  }
  return 'estimated';
}

/** Gemini said we're out of quota (HTTP 429 / RESOURCE_EXHAUSTED). The route turns this into a clear 429. */
export class QuotaError extends Error {
  constructor() {
    super('Gemini quota reached');
    this.name = 'QuotaError';
  }
}

/** Gemini took too long. Kept under the app's 45s scan timeout so the server answers first. */
export class ScanTimeoutError extends Error {
  constructor() {
    super('Gemini took too long');
    this.name = 'ScanTimeoutError';
  }
}

// Total time we spend on one scan across all models. Must stay under the app's scan timeout (45s).
const TOTAL_BUDGET_MS = 40_000;
// A model that hasn't answered by now is probably overloaded, so move on to the next one.
const FIRST_ATTEMPT_MS = 12_000;

export function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: unknown; code?: unknown; message?: unknown };
  if (e.status === 429 || e.code === 429) return true;
  const message = typeof e.message === 'string' ? e.message : '';
  return /\b429\b|RESOURCE_EXHAUSTED|quota/i.test(message);
}

let client: GoogleGenAI | null = null;

export async function scanImage(imageBase64: string, today: string): Promise<ScanItem[]> {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set (see backend/.env.example)');
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  const gemini = client;
  const started = Date.now();
  let lastError: unknown = new Error('No Gemini models configured');

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    const remaining = TOTAL_BUDGET_MS - (Date.now() - started);
    if (remaining < 3_000) break;
    const isLast = i === MODELS.length - 1;
    const timeoutMs = isLast ? remaining : Math.min(FIRST_ATTEMPT_MS, remaining);

    const request = gemini.interactions.create({
      model,
      input: [
        { type: 'text', text: buildPrompt(today) },
        { type: 'image', data: imageBase64, mime_type: 'image/jpeg' },
      ],
      response_format: { type: 'text', mime_type: 'application/json', schema: SCHEMA },
      // Don't let Google keep the user's fridge photo around.
      store: false,
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ScanTimeoutError()), timeoutMs);
    });
    try {
      const interaction = await Promise.race([request, timeout]);
      const parsed: unknown = JSON.parse(interaction.output_text || '');
      console.log(`gemini ${model} answered in ${Date.now() - started}ms`);
      return sanitizeItems(parsed);
    } catch (err) {
      request.catch(() => {}); // a late failure after the timeout must not crash the server
      lastError = err instanceof SyntaxError ? new Error('Gemini returned something that was not valid JSON') : err;
      console.warn(`gemini ${model} failed after ${Date.now() - started}ms:`, String((err as Error)?.message ?? err).slice(0, 200));
    } finally {
      clearTimeout(timer);
    }
  }

  if (isQuotaError(lastError)) throw new QuotaError();
  throw lastError;
}
