/**
 * Runtime config. Values come from EXPO_PUBLIC_* env vars (see .env.example).
 * The app NEVER holds the Gemini key; only the backend does.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

/** Shared token the deployed backend checks (header x-app-token). Leave empty for a local backend. Not the Gemini key. */
export const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';

/** Default to mock data until the backend is deployed. Set EXPO_PUBLIC_USE_MOCK=false to go live. */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

export type Endpoint = 'scan' | 'chat' | 'match' | 'ghost' | 'messages';

/**
 * Endpoints the deployed backend actually serves. In live mode only these are called;
 * everything else uses the local/mock logic until it is added here.
 */
export const LIVE_ENDPOINTS: Endpoint[] = ['scan'];

export function isLive(endpoint: Endpoint): boolean {
  return !USE_MOCK && LIVE_ENDPOINTS.includes(endpoint);
}

/** Simulated network latency for mocks, so loading states are visible. */
export const MOCK_DELAY_MS = 900;

/** Scan is slower on purpose so the loader is seen. */
export const MOCK_SCAN_DELAY_MS = 1500;
