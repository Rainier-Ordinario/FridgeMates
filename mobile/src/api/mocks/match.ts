import type { MatchRequest, MatchResponse } from '../types';

export function mockMatchResponse(req: MatchRequest): MatchResponse {
  const tomato = req.items.find((i) => /tomato/i.test(i.name));
  const mozz = req.items.find((i) => /mozzarella|cheese/i.test(i.name));
  const pair = [tomato, mozz].filter(Boolean) as MatchRequest['items'];
  let selected = pair;
  if (pair.length !== 2) {
    selected = req.items.slice(0, 2);
  }
  const rescues = selected.map((i) => i.id);
  return {
    title: 'Caprese date night',
    minutes: 15,
    rescues,
    steps: [
      'Slice the tomato and mozzarella into thick rounds.',
      'Layer them on a plate, alternating, like they are holding hands.',
      'Tear basil over the top if you have it.',
      'Drizzle olive oil, a little balsamic, salt and pepper.',
      'Serve immediately. They have waited long enough.',
    ],
    thankYou: "You saved me. I'll never forget this.",
  };
}
