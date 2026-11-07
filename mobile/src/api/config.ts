/**
 * Runtime config. Values come from EXPO_PUBLIC_* env vars (see .env.example).
 * The app NEVER holds the Gemini key; only the backend does.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

/** Default to mock data until the backend is deployed. Set EXPO_PUBLIC_USE_MOCK=false to go live. */
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

/** Simulated network latency for mocks, so loading states are visible. */
export const MOCK_DELAY_MS = 900;

/** Scan is slower on purpose so the "bringing your food to life…" loader is seen. */
export const MOCK_SCAN_DELAY_MS = 1500;
