import type { ChatItem, MatchRequest, MatchResponse } from '../types';

/**
 * Matchmaking mock. The recipe is built from the two items it actually pairs, so the
 * match card, the steps and the rescued items always agree.
 */
interface Recipe {
  title: string;
  minutes: number;
  steps: (a: string, b: string) => string[];
}

const is = (re: RegExp) => (i: ChatItem) => re.test(i.name);
const tomato = is(/tomato/i);
const cheese = is(/mozzarella|cheese|feta|cheddar/i);
const dairy = is(/milk|yogurt|yoghurt|cream/i);
const fruit = is(/berr|banana|mango|apple|peach|fruit/i);
const egg = is(/egg/i);
const greens = is(/spinach|kale|lettuce|greens|arugula|herb|basil|cilantro/i);

const recipes: { when: (a: ChatItem, b: ChatItem) => boolean; recipe: Recipe }[] = [
  {
    when: (a, b) => (tomato(a) && cheese(b)) || (cheese(a) && tomato(b)),
    recipe: {
      title: 'Caprese date night',
      minutes: 15,
      steps: (a, b) => [
        `Slice ${a} and ${b} into thick rounds.`,
        'Layer them on a plate, alternating, like they are holding hands.',
        'Tear basil over the top if you have it.',
        'Olive oil, a little balsamic, salt and pepper.',
        `Serve. ${a} and ${b} have waited long enough.`,
      ],
    },
  },
  {
    when: (a, b) => (dairy(a) && fruit(b)) || (fruit(a) && dairy(b)),
    recipe: {
      title: 'Smoothie first date',
      minutes: 5,
      steps: (a, b) => [
        `Drop ${b} into the blender, then pour ${a} over the top.`,
        'Add a spoon of honey and a handful of ice.',
        'Blend until smooth and a little dramatic.',
        `Pour, sip, and tell ${a} and ${b} they did great.`,
      ],
    },
  },
  {
    when: (a, b) => egg(a) || egg(b),
    recipe: {
      title: 'Breakfast scramble',
      minutes: 10,
      steps: (a, b) => [
        `Chop ${egg({ name: a } as ChatItem) ? b : a} into small pieces.`,
        'Warm a pan with a knob of butter.',
        `Whisk ${egg({ name: a } as ChatItem) ? a : b}, pour in, and fold gently.`,
        `Add the ${egg({ name: a } as ChatItem) ? b : a} pieces near the end. Salt, pepper, done.`,
      ],
    },
  },
  {
    when: (a, b) => greens(a) || greens(b),
    recipe: {
      title: 'Green goodbye salad',
      minutes: 8,
      steps: (a, b) => [
        `Rinse ${greens({ name: a } as ChatItem) ? a : b} and spin it dry.`,
        `Chop ${greens({ name: a } as ChatItem) ? b : a} into bite-size pieces.`,
        'Toss with olive oil, lemon, salt and pepper.',
        `Eat straight away. ${a} and ${b} are not getting any younger.`,
      ],
    },
  },
];

const fallback: Recipe = {
  title: 'Quick skillet for two',
  minutes: 12,
  steps: (a, b) => [
    `Cut ${a} and ${b} into bite-size pieces.`,
    'Heat a pan with a little oil until it shimmers.',
    `Toss in ${a} first, then ${b}. Salt, pepper, a squeeze of lemon.`,
    `Plate it up. ${a} and ${b} are finally together.`,
  ],
};

export function mockMatchResponse(req: MatchRequest): MatchResponse {
  // Only unexpired items can date; the two most urgent go first, but a known pairing wins.
  const alive = req.items.filter((i) => i.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft);
  if (alive.length < 2) return { title: 'No sparks yet', minutes: 0, rescues: [], steps: [], thankYou: '' };

  let pair: [ChatItem, ChatItem] = [alive[0], alive[1]];
  let recipe: Recipe = fallback;
  outer: for (const { when, recipe: r } of recipes) {
    for (const a of alive)
      for (const b of alive) {
        if (a.id !== b.id && when(a, b)) {
          pair = [a, b];
          recipe = r;
          break outer;
        }
      }
  }
  const [a, b] = pair;
  return {
    title: recipe.title,
    minutes: recipe.minutes,
    rescues: [a.id, b.id],
    steps: recipe.steps(a.characterName, b.characterName),
    thankYou: `You saved me. ${b.characterName} says hi too.`,
  };
}
