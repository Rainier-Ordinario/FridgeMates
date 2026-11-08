import { timingSafeEqual } from 'node:crypto';

/**
 * Shared app token: a simple gate so strangers who find the deployed URL can't spend the Gemini quota.
 * It ships inside the app, so it only stops casual abuse. If APP_TOKEN is unset, everything is allowed
 * (local development).
 */
export function isAuthorized(expected: string | undefined, header: string | undefined): boolean {
  if (!expected) return true;
  if (!header) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
