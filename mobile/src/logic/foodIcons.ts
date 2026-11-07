import type { FluentIconName } from '../../assets/icons/fluent.generated';

/**
 * Food name → Fluent Emoji icon. Keyword match on the item name (first hit wins), category fallback,
 * then the generic plate. Order matters: specific before general ("greek yogurt" → jar before milk).
 */
const rules: [RegExp, FluentIconName][] = [
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
  [/pineapple/i, 'pineapple'],
  [/kiwi/i, 'kiwi-fruit'],
  [/cherr/i, 'cherries'],
  [/pear/i, 'pear'],
  [/coconut/i, 'coconut'],
  [/carrot/i, 'carrot'],
  [/broccoli|cauliflower/i, 'broccoli'],
  [/onion|leek|scallion|shallot|chive/i, 'onion'],
  [/garlic/i, 'garlic'],
  [/potato|yam/i, 'potato'],
  [/mushroom/i, 'mushroom'],
  [/cucumber|zucchini|pickle/i, 'cucumber'],
  [/bell pepper|capsicum|pepper(?!oni)/i, 'bell-pepper'],
  [/chili|chilli|jalape|hot pepper/i, 'hot-pepper'],
  [/corn/i, 'ear-of-corn'],
  [/eggplant|aubergine/i, 'eggplant'],
  [/basil|cilantro|parsley|mint|dill|rosemary|thyme|herb|celery|asparagus|green bean/i, 'herb'],
  [/olive/i, 'olive'],
  // condiments & jars
  [
    /ketchup|mustard|mayo|sauce|salsa|dressing|relish|soy|canned|can of|beans|chickpea|tuna can|tinned/i,
    'canned-food',
  ],
  [/honey|jam|jelly|marmalade|peanut butter|nutella|syrup/i, 'honey-pot'],
  // bakery
  [/croissant|pastry/i, 'croissant'],
  [/bagel/i, 'bagel'],
  [/bread|toast|loaf|bun|roll|tortilla|pita|naan|baguette|wrap/i, 'bread'],
  // leftovers & meals
  [/pizza/i, 'pizza'],
  [/burger|hamburger/i, 'hamburger'],
  [/sandwich|sub/i, 'sandwich'],
  [/taco/i, 'taco'],
  [/burrito/i, 'burrito'],
  [/sushi|poke|sashimi/i, 'sushi'],
  [/curry/i, 'curry-rice'],
  [/pasta|spaghetti|noodle|lasagna|mac/i, 'spaghetti'],
  [/rice|fried rice|risotto|biryani/i, 'cooked-rice'],
  [/soup|stew|ramen|pho|broth|chili con/i, 'steaming-bowl'],
  [/salad/i, 'green-salad'],
  [/bento|lunch box|meal prep/i, 'bento-box'],
  [/leftover|takeout|take-out|pad thai|chow mein|lo mein|dumpling|stir/i, 'takeout-box'],
  [/casserole|pot roast|hot pot|chili/i, 'pot-of-food'],
  // meat & fish
  [/bacon/i, 'bacon'],
  [/chicken|turkey|poultry|wing|drumstick/i, 'poultry-leg'],
  [/rib|lamb|bone/i, 'meat-on-bone'],
  [/beef|steak|pork|ham|sausage|mince|ground|meat|salami|pepperoni|deli/i, 'cut-of-meat'],
  [/shrimp|prawn|crab|lobster|scallop|clam|mussel|oyster/i, 'shrimp'],
  [/salmon|tuna|cod|tilapia|fish|trout|anchov|sardine/i, 'fish'],
  // drinks
  [/wine|champagne|prosecco/i, 'wine-glass'],
  [/beer|ale|lager|cider/i, 'beer-mug'],
  [/coffee|espresso|latte|cold brew/i, 'hot-beverage'],
  [/tea(?!k)/i, 'teapot'],
  [/boba|bubble tea/i, 'bubble-tea'],
  [/juice|smoothie|lemonade|oat milk|almond milk|soy milk|kombucha/i, 'beverage-box'],
  [/soda|cola|sparkling|seltzer|water|drink|pop\b/i, 'cup-with-straw'],
  // sweets
  [/chocolate/i, 'chocolate-bar'],
  [/cookie|biscuit/i, 'cookie'],
  [/ice cream|gelato|sorbet/i, 'ice-cream'],
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
