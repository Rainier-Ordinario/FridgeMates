import type { ChatItem, MatchResponse } from '@/api/types';

/**
 * Local matchmaking: no backend needed. Picks the two most urgent items that go together
 * (small pairing table), with a generic "Use-it-up stir fry" fallback. The card, the recipe
 * and the rescued ids always come from the same pair.
 */
interface Recipe {
  title: string;
  minutes: number;
  steps: (a: string, b: string) => string[];
}

const is = (re: RegExp) => (i: ChatItem) => re.test(i.name);
const tomato = is(/tomato/i);
const cheese = is(/mozzarella|cheese|feta|cheddar|paneer/i);
const egg = is(/egg/i);
const greens = is(/spinach|kale|lettuce|greens|arugula|chard/i);
const rice = is(/rice|quinoa/i);
const leftovers = is(/leftover|chicken|beef|pork|tofu|takeout|veg|broccoli|pepper|carrot|mushroom/i);
const banana = is(/banana|berr|mango|peach/i);
const yogurt = is(/yogurt|yoghurt|milk|kefir/i);
const bread = is(/bread|bagel|tortilla|pita|wrap/i);
const avocado = is(/avocado/i);
const pasta = is(/pasta|spaghetti|noodle/i);
const sauce = is(/tomato|sauce|pesto/i);

const pairings: { when: (a: ChatItem, b: ChatItem) => boolean; recipe: Recipe }[] = [
  {
    when: (a, b) => tomato(a) && cheese(b),
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
    when: (a, b) => egg(a) && greens(b),
    recipe: {
      title: 'Green omelette',
      minutes: 10,
      steps: (a, b) => [
        `Rinse ${b} and chop it roughly.`,
        `Whisk ${a} with a pinch of salt.`,
        `Wilt ${b} in a buttered pan, pour ${a} over, and fold when just set.`,
        'Cheese on top if any is hanging around.',
      ],
    },
  },
  {
    when: (a, b) => rice(a) && leftovers(b),
    recipe: {
      title: 'Use-it-up fried rice',
      minutes: 12,
      steps: (a, b) => [
        `Chop ${b} into small pieces.`,
        'Heat a pan very hot with a little oil.',
        `Fry ${b} first, then add ${a} and press it flat so it crisps.`,
        'Soy sauce, a fried egg on top if you have one.',
      ],
    },
  },
  {
    when: (a, b) => banana(a) && yogurt(b),
    recipe: {
      title: 'Smoothie first date',
      minutes: 5,
      steps: (a, b) => [
        `Drop ${a} into the blender, then pour ${b} over the top.`,
        'Add a spoon of honey and a handful of ice.',
        'Blend until smooth and a little dramatic.',
        `Pour, sip, and tell ${a} and ${b} they did great.`,
      ],
    },
  },
  {
    when: (a, b) => avocado(a) && bread(b),
    recipe: {
      title: 'Avocado toast, obviously',
      minutes: 6,
      steps: (a, b) => [
        `Toast ${b} until golden.`,
        `Mash ${a} with lemon, salt and chili flakes.`,
        `Spread, bite, and tell ${a} it was worth it.`,
      ],
    },
  },
  {
    when: (a, b) => pasta(a) && sauce(b),
    recipe: {
      title: 'Weeknight pasta',
      minutes: 15,
      steps: (a, b) => [
        `Boil ${a} in well-salted water.`,
        `Warm ${b} in a pan with a splash of the pasta water.`,
        `Toss ${a} through ${b}. Cheese, pepper, done.`,
      ],
    },
  },
  {
    when: (a, b) => egg(a) && cheese(b),
    recipe: {
      title: 'Cheesy scramble',
      minutes: 8,
      steps: (a, b) => [
        `Whisk ${a} with a pinch of salt.`,
        'Melt butter in a pan on low heat.',
        `Pour ${a} in, stir slowly, and fold ${b} through at the end.`,
      ],
    },
  },
];

const fallback: Recipe = {
  title: 'Use-it-up stir fry',
  minutes: 12,
  steps: (a, b) => [
    `Cut ${a} and ${b} into bite-size pieces.`,
    'Heat a pan with a little oil until it shimmers.',
    `Toss in ${a} first, then ${b}. Soy sauce, garlic, a squeeze of lime.`,
    `Plate it up. ${a} and ${b} are finally together.`,
  ],
};

/** The two most urgent items that go together (either order), else the two most urgent. */
export function pickPair(items: ChatItem[]): { pair: [ChatItem, ChatItem]; recipe: Recipe } | null {
  const alive = items.filter((i) => i.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft);
  if (alive.length < 2) return null;
  // Pairs ordered by urgency (sum of days left), so a less urgent perfect match never beats an urgent one by much.
  const pairs: [ChatItem, ChatItem][] = [];
  for (let i = 0; i < alive.length; i++)
    for (let j = i + 1; j < alive.length; j++) pairs.push([alive[i], alive[j]]);
  pairs.sort((x, y) => x[0].daysLeft + x[1].daysLeft - (y[0].daysLeft + y[1].daysLeft));
  for (const [a, b] of pairs) {
    for (const { when, recipe } of pairings) {
      if (when(a, b)) return { pair: [a, b], recipe };
      if (when(b, a)) return { pair: [b, a], recipe };
    }
  }
  return { pair: [alive[0], alive[1]], recipe: fallback };
}

export function buildLocalMatch(items: ChatItem[]): MatchResponse {
  const picked = pickPair(items);
  if (!picked) return { title: 'No sparks yet', minutes: 0, rescues: [], steps: [], thankYou: '' };
  const { pair, recipe } = picked;
  const [a, b] = pair;
  return {
    title: recipe.title,
    minutes: recipe.minutes,
    rescues: [a.id, b.id],
    steps: recipe.steps(a.characterName, b.characterName),
    thankYou: `You saved me. ${b.characterName} says hi too.`,
  };
}
