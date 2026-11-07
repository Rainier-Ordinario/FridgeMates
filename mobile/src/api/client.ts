import { API_URL, APP_TOKEN, MOCK_DELAY_MS, MOCK_SCAN_DELAY_MS, USE_MOCK } from './config';
import { mockGhostResponse } from './mocks/ghost';
import { mockMatchResponse } from './mocks/match';
import { mockMessagesResponse } from './mocks/messages';
import { mockScanResponse } from './mocks/scan';
import { safeText } from '@/logic/safety';
import type {
  ChatRequest,
  ChatResponse,
  GhostRequest,
  GhostResponse,
  MatchRequest,
  MatchResponse,
  MessagesRequest,
  MessagesResponse,
  ScanRequest,
  ScanResponse,
} from './types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type ApiErrorKind = 'timeout' | 'offline' | 'http' | 'bad-response';

/** Every failure the screens see is one of these, so they can pick an in-character message. */
export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function apiErrorKind(err: unknown): ApiErrorKind {
  return err instanceof ApiError ? err.kind : 'bad-response';
}

/** Most calls are quick text. Scan sends a photo to Gemini, so it gets longer (cold starts can take ~10s+). */
async function post<TReq, TRes>(path: string, body: TReq, timeoutMs = 15_000): Promise<TRes> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: APP_TOKEN
        ? { 'Content-Type': 'application/json', 'x-app-token': APP_TOKEN }
        : { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    throw new ApiError(aborted ? 'timeout' : 'offline', `${path}: ${aborted ? 'timed out' : 'unreachable'}`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new ApiError('http', `${path} failed: ${res.status}`);
  try {
    return (await res.json()) as TRes;
  } catch {
    throw new ApiError('bad-response', `${path}: not JSON`);
  }
}

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/** Live responses are normalized so a partial or odd backend reply never crashes a screen. */
const normalize = {
  scan(r: Partial<ScanResponse> | null | undefined): ScanResponse {
    return {
      items: arr<Partial<ScanResponse['items'][number]>>(r?.items)
        .filter((i) => i && typeof i.name === 'string')
        .map((i) => ({
          name: str(i.name),
          emoji: str(i.emoji, '🍽️'),
          characterName: safeText(str(i.characterName) || str(i.name), str(i.name)),
          personality: safeText(str(i.personality) || 'mysterious', 'mysterious'),
          // The backend sends negatives for visibly spoiled food; keep them so it arrives as a ghost.
          daysLeft: Math.max(-30, Math.min(365, Math.round(num(i.daysLeft, 3)))),
          dateSource: i.dateSource === 'printed' ? 'printed' : 'estimated',
          intro: safeText(str(i.intro) || 'Hi. I live here now.', 'Hi. I live here now.'),
        })),
    };
  },
  chat(r: Partial<ChatResponse> | null | undefined): ChatResponse {
    return {
      lines: arr<ChatResponse['lines'][number]>(r?.lines)
        .filter((l) => l && typeof l.text === 'string')
        .map((l) => ({
          ...l,
          text: safeText(l.text, 'I had a thought, but it was not fridge-friendly. Anyway, eat me soon.'),
        })),
    };
  },
  match(r: Partial<MatchResponse> | null | undefined): MatchResponse {
    return {
      title: safeText(str(r?.title, 'A surprise date'), 'A surprise date'),
      minutes: num(r?.minutes, 15),
      rescues: arr<string>(r?.rescues),
      steps: arr<string>(r?.steps).map((step) => safeText(String(step), 'Cook it with love.')),
      thankYou: safeText(str(r?.thankYou, 'You saved me. I will never forget this.'), 'You saved me.'),
    };
  },
  ghost(r: Partial<GhostResponse> | null | undefined): GhostResponse {
    return {
      epitaph: safeText(
        str(r?.epitaph, 'Gone too soon. Bought with good intentions.'),
        'Gone too soon. Bought with good intentions.',
      ),
    };
  },
  messages(r: Partial<MessagesResponse> | null | undefined): MessagesResponse {
    return {
      messages: arr<MessagesResponse['messages'][number]>(r?.messages)
        .filter((m) => m && typeof m.text === 'string')
        .map((m) => ({ ...m, text: safeText(m.text, "u up? it's about tomorrow") })),
    };
  },
};

/** Thin client. Every call falls back to mocks when USE_MOCK is on, so all screens work offline. */
export const api = {
  async scan(req: ScanRequest): Promise<ScanResponse> {
    if (USE_MOCK) {
      await sleep(MOCK_SCAN_DELAY_MS);
      return mockScanResponse;
    }
    return normalize.scan(await post('/scan', req, 45_000));
  },
  async chat(req: ChatRequest): Promise<ChatResponse> {
    if (USE_MOCK) {
      await sleep(MOCK_DELAY_MS);
      // Mock mode: the only chat left is the fridge manager, which answers locally.
      return { lines: [] };
    }
    return normalize.chat(await post('/chat', req));
  },
  async match(req: MatchRequest): Promise<MatchResponse> {
    if (USE_MOCK) {
      await sleep(MOCK_DELAY_MS);
      return mockMatchResponse(req);
    }
    return normalize.match(await post('/match', req));
  },
  async ghost(req: GhostRequest): Promise<GhostResponse> {
    if (USE_MOCK) {
      await sleep(MOCK_DELAY_MS / 2);
      return mockGhostResponse(req);
    }
    return normalize.ghost(await post('/ghost', req));
  },
  async messages(req: MessagesRequest): Promise<MessagesResponse> {
    if (USE_MOCK) {
      await sleep(MOCK_DELAY_MS / 2);
      return mockMessagesResponse(req);
    }
    return normalize.messages(await post('/messages', req));
  },
};
