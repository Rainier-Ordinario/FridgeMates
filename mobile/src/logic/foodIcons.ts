import type { FluentIconName } from '../../assets/icons/fluent.generated';

/**
 * Food name → Fluent Emoji icon. Keyword match on the item name (first hit wins), category fallback,
 * then the generic plate. Order matters: specific before general ("greek yogurt" → jar before milk).
 */
const rules: [RegExp, FluentIconName][] = [
  // compound names first, so "orange juice", "ice cream", "eggplant", "pineapple", "peanut butter" win over their parts
  [/juice|smoothie|lemonade|oat milk|almond milk|soy milk|kombucha/i, 'beverage-box'],
  [/ice cream|gelato|sorbet/i, 'ice-cream'],
  [/eggplant|aubergine/i, 'eggplant'],
  [/pineapple/i, 'pineapple'],
  [/peanut butter|honey|jam|jelly|marmalade|nutella|syrup|hummus/i, 'honey-pot'],
  [/chocolate|cocoa/i, 'chocolate-bar'],
  [/coconut/i, 'coconut'],
  // dairy & eggs
  [/yogurt|yoghurt|kefir|sour cream|cottage/i, 'jar'],
  [/butter|ghee|margarine/i, 'butter'],
  [/mozzarella|cheddar|feta|brie|parmesan|gouda|cheese|paneer|halloumi/i, 'cheese-wedge'],
  [/milk|cream|half.and.half/i, 'glass-of-milk'],
  [/egg/i, 'egg'],
  // produce
  [/avocado/i, 'avocado'],
  [/tomato/i, 'tomato'],
  [/spinach|lettuce|kale|arugula|greens|cabbage|bok choy|chard|salad mix/i, 'leafy-green'],
  [/strawberr/i, 'strawberry'],
  [/blueberr|raspberr|blackberr|berr/i, 'blueberries'],
  [/grape/i, 'grapes'],
  [/apple/i, 'red-apple'],
  [/banana|plantain/i, 'banana'],
  [/lemon|lime/i, 'lemon'],
  [/orange|tangerine|clementine|mandarin/i, 'tangerine'],
  [/peach|nectarine|apricot/i, 'peach'],
  [/mango|papaya/i, 'mango'],
  [/watermelon/i, 'watermelon'],
  [/melon|cantaloupe|honeydew/i, 'melon'],
  [/kiwi/i, 'kiwi-fruit'],
  [/cherr/i, 'cherries'],
  [/\bpear/i, 'pear'],
  [/carrot/i, 'carrot'],
  [/broccoli|cauliflower/i, 'broccoli'],
  [/onion|leek|scallion|shallot|chive/i, 'onion'],
  [/garlic/i, 'garlic'],
  [/potato|yam/i, 'potato'],
  [/mushroom/i, 'mushroom'],
  [/cucumber|zucchini|pickle/i, 'cucumber'],
  [/bell pepper|capsicum|pepper(?!oni)/i, 'bell-pepper'],
  [/chili|chilli|jalape|hot pepper/i, 'hot-pepper'],
  [/\bcorn/i, 'ear-of-corn'],
  [/basil|cilantro|parsley|mint|dill|rosemary|thyme|herb|celery|asparagus|green bean/i, 'herb'],
  [/olive/i, 'olive'],
  // condiments & jars
  [
    /ketchup|mustard|mayo|sauce|salsa|dressing|relish|soy|canned|can of|beans|chickpea|tinned/i,
    'canned-food',
  ],
  // bakery
  [/croissant|pastry/i, 'croissant'],
  [/bagel/i, 'bagel'],
  [/bread|toast|loaf|\bbun|\broll|tortilla|pita|naan|baguette|wrap/i, 'bread'],
  // leftovers & meals
  [/pizza/i, 'pizza'],
  [/burger|hamburger/i, 'hamburger'],
  [/sandwich|\bsub\b/i, 'sandwich'],
  [/taco/i, 'taco'],
  [/burrito/i, 'burrito'],
  [/sushi|poke|sashimi/i, 'sushi'],
  [/curry/i, 'curry-rice'],
  [/pasta|spaghetti|noodle|lasagna|mac and|macaroni/i, 'spaghetti'],
  [/rice|risotto|biryani|quinoa/i, 'cooked-rice'],
  [/soup|stew|ramen|pho|broth/i, 'steaming-bowl'],
  [/salad/i, 'green-salad'],
  [/bento|lunch box|meal prep|tofu|tempeh/i, 'bento-box'],
  [/leftover|takeout|take-out|pad thai|chow mein|lo mein|dumpling|stir/i, 'takeout-box'],
  [/casserole|pot roast|hot pot/i, 'pot-of-food'],
  // meat & fish
  [/bacon/i, 'bacon'],
  [/chicken|turkey|poultry|wing|drumstick/i, 'poultry-leg'],
  [/\brib|lamb|bone/i, 'meat-on-bone'],
  [/beef|steak|pork|\bham\b|sausage|mince|ground|meat|salami|pepperoni|deli/i, 'cut-of-meat'],
  [/shrimp|prawn|crab|lobster|scallop|clam|mussel|oyster/i, 'shrimp'],
  [/salmon|tuna|cod\b|tilapia|fish|trout|anchov|sardine/i, 'fish'],
  // drinks
  [/wine|champagne|prosecco/i, 'wine-glass'],
  [/beer|\bale\b|lager|cider/i, 'beer-mug'],
  [/coffee|espresso|latte|cold brew/i, 'hot-beverage'],
  [/\btea\b/i, 'teapot'],
  [/boba|bubble tea/i, 'bubble-tea'],
  [/soda|\bcola\b|sparkling|seltzer|water|drink|\bpop\b/i, 'cup-with-straw'],
  // sweets
  [/cookie|biscuit/i, 'cookie'],
  [/cake|cupcake|muffin|brownie/i, 'cupcake'],
  // fridge / ice
  [/\bice\b|fridge|frozen/i, 'ice'],
];

export const GENERIC_FOOD_ICON: FluentIconName = 'fork-and-knife-with-plate';

export function foodIconFor(name: string): FluentIconName {
  for (const [re, icon] of rules) if (re.test(name)) return icon;
  return GENERIC_FOOD_ICON;
}

/** True when a name has no specific icon (falls back to the generic plate). */
export function isGenericFood(name: string): boolean {
  return foodIconFor(name) === GENERIC_FOOD_ICON;
}
