import { API_URL, MOCK_DELAY_MS, MOCK_SCAN_DELAY_MS, USE_MOCK } from './config';
import { mockChatResponse } from './mocks/chat';
import { mockGhostResponse } from './mocks/ghost';
import { mockMatchResponse } from './mocks/match';
import { mockMessagesResponse } from './mocks/messages';
import { mockScanResponse } from './mocks/scan';
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

/** Most calls are quick text. Scan sends a photo to Gemini, so it gets longer (cold starts can take ~10s+). */
async function post<TReq, TRes>(path: string, body: TReq, timeoutMs = 15_000): Promise<TRes> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status} ${await res.text().catch(() => '')}`);
  }
  return (await res.json()) as TRes;
}

function arr<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return [];
}

function str(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  return fallback;
}

function num(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

function dateSource(value: unknown): 'printed' | 'estimated' {
  if (value === 'printed') {
    return 'printed';
  }
  return 'estimated';
}

/** Live responses are normalized so a partial or odd backend reply never crashes a screen. */
const normalize = {
  scan(r: Partial<ScanResponse> | null | undefined): ScanResponse {
    return {
      items: arr<Partial<ScanResponse['items'][number]>>(r?.items)
        .filter((i) => i && typeof i.name === 'string')
        .map((i) => ({
          name: str(i.name),
          emoji: str(i.emoji, '🍽️'),
          characterName: str(i.characterName, str(i.name)),
          personality: str(i.personality, 'mysterious'),
          daysLeft: Math.max(0, Math.round(num(i.daysLeft, 3))),
          dateSource: dateSource(i.dateSource),
          intro: str(i.intro, 'Hi. I live here now.'),
        })),
    };
  },
  chat(r: Partial<ChatResponse> | null | undefined): ChatResponse {
    return {
      lines: arr<ChatResponse['lines'][number]>(r?.lines).filter((l) => l && typeof l.text === 'string'),
    };
  },
  match(r: Partial<MatchResponse> | null | undefined): MatchResponse {
    return {
      title: str(r?.title, 'A surprise date'),
      minutes: num(r?.minutes, 15),
      rescues: arr<string>(r?.rescues),
      steps: arr<string>(r?.steps),
      thankYou: str(r?.thankYou, 'You saved me. I will never forget this.'),
    };
  },
  ghost(r: Partial<GhostResponse> | null | undefined): GhostResponse {
    return { epitaph: str(r?.epitaph, 'Gone too soon. Bought with good intentions.') };
  },
  messages(r: Partial<MessagesResponse> | null | undefined): MessagesResponse {
    return {
      messages: arr<MessagesResponse['messages'][number]>(r?.messages).filter(
        (m) => m && typeof m.text === 'string',
      ),
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
    return normalize.scan(await post('/scan', req, 30_000));
  },
  async chat(req: ChatRequest): Promise<ChatResponse> {
    if (USE_MOCK) {
      await sleep(MOCK_DELAY_MS);
      return mockChatResponse(req);
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
