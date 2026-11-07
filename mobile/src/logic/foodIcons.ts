import type { FluentIconName } from '../../assets/icons/fluent.generated';
import { categoryOf, type Category } from './categories';

/**
 * Food name → Fluent Emoji icon. Keyword match on the item name (first hit wins), then a neutral icon for the
 * item's category, then the generic plate. Never a system emoji: the backend's `emoji` field is ignored.
 * Order matters: compound and specific names come before their parts ("orange juice" → juice, not orange).
 */
const rules: [RegExp, FluentIconName][] = [
  // compound names first
  [
    /orange juice|apple juice|juice|lemonade|oat milk|almond milk|soy milk|kombucha|iced tea/i,
    'beverage-box',
  ],
  [/smoothie|shake\b/i, 'tropical-drink'],
  [/ice cream|gelato|sorbet/i, 'ice-cream'],
  [/frozen yog|soft serve|froyo/i, 'soft-ice-cream'],
  [/shaved ice|snow cone|slush/i, 'shaved-ice'],
  [/eggplant|aubergine/i, 'eggplant'],
  [/pineapple/i, 'pineapple'],
  [/sweet potato|\byam/i, 'roasted-sweet-potato'],
  [/peanut butter|honey|jam\b|jelly|marmalade|nutella|syrup|hummus|tahini/i, 'honey-pot'],
  [/olive oil|\boil\b|vinegar/i, 'pouring-liquid'],
  [/chocolate|cocoa/i, 'chocolate-bar'],
  [/coconut/i, 'coconut'],
  [/fish cake|kamaboko|naruto|surimi|crab stick/i, 'fish-cake-with-swirl'],
  [/oden/i, 'oden'],
  [/hot dog|frankfurter|wiener|bratwurst/i, 'hot-dog'],
  [/french fries|fries|tater tot|hash brown/i, 'french-fries'],
  [/fortune cookie/i, 'fortune-cookie'],
  [/rice cracker|cracker/i, 'rice-cracker'],
  [/birthday cake/i, 'birthday-cake'],
  [/cheesecake|tiramisu|cake slice|shortcake|strawberry cake/i, 'shortcake'],
  // dairy & eggs
  [/yogurt|yoghurt|kefir|skyr|sour cream|cottage|cream cheese|creme fraiche|crème fraîche/i, 'jar'],
  [/pudding|custard|flan|creme brulee|crème brûlée|panna cotta/i, 'custard'],
  [/butter|ghee|margarine/i, 'butter'],
  [/fondue|raclette/i, 'fondue'],
  [/mozzarella|cheddar|feta|brie|parmesan|gouda|cheese|paneer|halloumi|ricotta|camembert/i, 'cheese-wedge'],
  [/formula/i, 'baby-bottle'],
  [/milk|cream|half.and.half/i, 'glass-of-milk'],
  [/egg/i, 'egg'],
  // produce
  [/avocado|guacamole/i, 'avocado'],
  [/tomato/i, 'tomato'],
  [/sprout|microgreen/i, 'seedling'],
  [
    /spinach|lettuce|kale|arugula|rocket|greens|cabbage|bok choy|chard|salad mix|collard|romaine/i,
    'leafy-green',
  ],
  [/strawberr/i, 'strawberry'],
  [/blueberr|raspberr|blackberr|cranberr|berr/i, 'blueberries'],
  [/grape/i, 'grapes'],
  [/green apple|granny smith/i, 'green-apple'],
  [/apple/i, 'red-apple'],
  [/banana|plantain/i, 'banana'],
  [/lime/i, 'lime'],
  [/lemon|citron/i, 'lemon'],
  [/orange|tangerine|clementine|mandarin/i, 'tangerine'],
  [/peach|nectarine|apricot|plum/i, 'peach'],
  [/mango|papaya/i, 'mango'],
  [/watermelon/i, 'watermelon'],
  [/melon|cantaloupe|honeydew/i, 'melon'],
  [/kiwi/i, 'kiwi-fruit'],
  [/cherr/i, 'cherries'],
  [/\bpear/i, 'pear'],
  [/chestnut/i, 'chestnut'],
  [/peanut|almond|cashew|walnut|pistachio|pecan|hazelnut|\bnuts?\b|trail mix/i, 'peanuts'],
  [/\bpeas?\b|edamame|snap pea|snow pea|green bean/i, 'pea-pod'],
  [/beans?\b|lentil|chickpea|garbanzo|black bean|kidney/i, 'beans'],
  [/ginger/i, 'ginger-root'],
  [/carrot|parsnip/i, 'carrot'],
  [/broccoli|cauliflower|brussels/i, 'broccoli'],
  [/onion|leek|scallion|shallot|chive/i, 'onion'],
  [/garlic/i, 'garlic'],
  [/potato/i, 'potato'],
  [/shiitake|portobello|cremini|porcini|oyster mushroom/i, 'brown-mushroom'],
  [/mushroom/i, 'mushroom'],
  [/cucumber|zucchini|courgette|pickle|gherkin/i, 'cucumber'],
  [/bell pepper|capsicum|pepper(?!oni)/i, 'bell-pepper'],
  [/chili|chilli|jalape|hot pepper|habanero|sriracha/i, 'hot-pepper'],
  [/\bcorn/i, 'ear-of-corn'],
  [/basil|cilantro|parsley|mint|dill|rosemary|thyme|herb|celery|asparagus|oregano|sage/i, 'herb'],
  [/olive/i, 'olive'],
  [/salt|spice|seasoning|cumin|paprika|curry powder/i, 'salt'],
  // condiments & jars
  [/ketchup|mustard|mayo|sauce|salsa|dressing|relish|soy|canned|can of|tinned|broth|stock/i, 'canned-food'],
  // bakery & sweets
  [/croissant|pastry|danish/i, 'croissant'],
  [/bagel/i, 'bagel'],
  [/baguette/i, 'baguette-bread'],
  [/pretzel/i, 'pretzel'],
  [/pita|naan|tortilla|flatbread|roti|chapati/i, 'flatbread'],
  [/pancake|crepe|crêpe/i, 'pancakes'],
  [/waffle/i, 'waffle'],
  [/\bpie\b|quiche|tart/i, 'pie'],
  [/donut|doughnut/i, 'doughnut'],
  [/lollipop/i, 'lollipop'],
  [/candy|gummy|gummies|sweets|toffee|caramel/i, 'candy'],
  [/popcorn/i, 'popcorn'],
  [/bread|toast|loaf|\bbun|\broll|wrap|sourdough|brioche/i, 'bread'],
  [/cookie|biscuit/i, 'cookie'],
  [/cake|cupcake|muffin|brownie/i, 'cupcake'],
  // leftovers & meals
  [/pizza/i, 'pizza'],
  [/burger|hamburger/i, 'hamburger'],
  [/sandwich|\bsub\b|panini/i, 'sandwich'],
  [/taco/i, 'taco'],
  [/burrito/i, 'burrito'],
  [/gyro|shawarma|kebab|doner|döner|souvlaki/i, 'stuffed-flatbread'],
  [/falafel/i, 'falafel'],
  [/tamale/i, 'tamale'],
  [/dumpling|gyoza|pierogi|wonton|momo|potsticker|bao\b/i, 'dumpling'],
  [/onigiri|rice ball|sticky rice/i, 'rice-ball'],
  [/mooncake|moon cake/i, 'moon-cake'],
  [/tempura|fried shrimp|popcorn shrimp/i, 'fried-shrimp'],
  [/sushi|poke|sashimi|nigiri|maki/i, 'sushi'],
  [/curry/i, 'curry-rice'],
  [/pasta|spaghetti|noodle|lasagna|mac and|macaroni|penne|ravioli|gnocchi/i, 'spaghetti'],
  [/rice|risotto|biryani|quinoa|couscous/i, 'cooked-rice'],
  [/soup|stew|ramen|pho|chili con|chowder/i, 'steaming-bowl'],
  [/cereal|oatmeal|porridge|granola|oats|muesli/i, 'bowl-with-spoon'],
  [/salad|coleslaw|slaw/i, 'green-salad'],
  [/bento|lunch box|meal prep|tofu|tempeh/i, 'bento-box'],
  [/leftover|takeout|take-out|pad thai|chow mein|lo mein|stir|fried rice/i, 'takeout-box'],
  [/casserole|pot roast|hot pot|chili\b|goulash/i, 'pot-of-food'],
  // meat & fish
  [/bacon|pancetta/i, 'bacon'],
  [/chicken|turkey|poultry|wing|drumstick|duck/i, 'poultry-leg'],
  [/\brib|lamb|bone|chop\b/i, 'meat-on-bone'],
  [
    /beef|steak|pork|\bham\b|sausage|chorizo|mince|ground|meat|salami|pepperoni|deli|prosciutto|brisket/i,
    'cut-of-meat',
  ],
  [/lobster|crayfish|crawfish/i, 'lobster'],
  [/\bcrab/i, 'crab'],
  [/squid|calamari|octopus/i, 'squid'],
  [/oyster|clam|mussel|scallop/i, 'oyster'],
  [/shrimp|prawn/i, 'shrimp'],
  [/salmon|tuna|cod\b|tilapia|fish|trout|anchov|sardine|halibut|mackerel|snapper/i, 'fish'],
  // drinks
  [/champagne|prosecco|cava|sparkling wine/i, 'bottle-with-popping-cork'],
  [/wine|sangria/i, 'wine-glass'],
  [/beer|\bale\b|lager|cider|stout|ipa\b/i, 'beer-mug'],
  [/sake|soju/i, 'sake'],
  [/whisk|bourbon|\brum\b|vodka|gin\b|tequila|scotch|brandy/i, 'tumbler-glass'],
  [/cocktail|margarita|martini|mojito/i, 'cocktail-glass'],
  [/matcha|green tea|oolong/i, 'teacup-without-handle'],
  [/yerba|mate\b/i, 'mate'],
  [/coffee|espresso|latte|cold brew|cappuccino/i, 'hot-beverage'],
  [/\btea\b|chai/i, 'teapot'],
  [/boba|bubble tea/i, 'bubble-tea'],
  [/soda|\bcola\b|sparkling|seltzer|water|drink|\bpop\b|energy/i, 'cup-with-straw'],
  // fridge / ice
  [/\bice\b|fridge|frozen/i, 'ice'],
];

export const GENERIC_FOOD_ICON: FluentIconName = 'fork-and-knife-with-plate';

/** A neutral icon per category, for names no rule knows. */
const categoryIcon: Record<Category, FluentIconName> = {
  Produce: 'leafy-green',
  Dairy: 'glass-of-milk',
  'Meat & fish': 'cut-of-meat',
  Leftovers: 'takeout-box',
  Drinks: 'cup-with-straw',
  Other: GENERIC_FOOD_ICON,
};

export function foodIconFor(name: string): FluentIconName {
  for (const [re, icon] of rules) if (re.test(name)) return icon;
  return categoryIcon[categoryOf(name)];
}

/** True when a name has no specific icon (falls back to a category icon or the generic plate). */
export function isGenericFood(name: string): boolean {
  return !rules.some(([re]) => re.test(name));
}
