import type { MatchRequest, MatchResponse } from '../types';
import { buildLocalMatch } from '@/logic/matchmaking';

/** Mock /match delegates to the local matchmaker, so mock, offline and live-fallback all agree. */
export function mockMatchResponse(req: MatchRequest): MatchResponse {
  return buildLocalMatch(req.items);
}
