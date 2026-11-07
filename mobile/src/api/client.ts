import { API_URL, MOCK_DELAY_MS, USE_MOCK } from './config';
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

async function post<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status} ${await res.text().catch(() => '')}`);
  }
  return (await res.json()) as TRes;
}

/** Thin client. Every call falls back to mocks when USE_MOCK is on, so all screens work offline. */
export const api = {
  async scan(req: ScanRequest): Promise<ScanResponse> {
    if (USE_MOCK) {
      await sleep(MOCK_DELAY_MS * 2);
      return mockScanResponse;
    }
    return post('/scan', req);
  },
  async chat(req: ChatRequest): Promise<ChatResponse> {
    if (USE_MOCK) {
      await sleep(MOCK_DELAY_MS);
      return mockChatResponse(req);
    }
    return post('/chat', req);
  },
  async match(req: MatchRequest): Promise<MatchResponse> {
    if (USE_MOCK) {
      await sleep(MOCK_DELAY_MS);
      return mockMatchResponse(req);
    }
    return post('/match', req);
  },
  async ghost(req: GhostRequest): Promise<GhostResponse> {
    if (USE_MOCK) {
      await sleep(MOCK_DELAY_MS / 2);
      return mockGhostResponse(req);
    }
    return post('/ghost', req);
  },
  async messages(req: MessagesRequest): Promise<MessagesResponse> {
    if (USE_MOCK) {
      await sleep(MOCK_DELAY_MS / 2);
      return mockMessagesResponse(req);
    }
    return post('/messages', req);
  },
};
