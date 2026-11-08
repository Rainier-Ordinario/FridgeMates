/** Simple local keyword map from a food name to a category. No API. */
export type Category = 'Produce' | 'Dairy' | 'Meat & fish' | 'Leftovers' | 'Drinks' | 'Other';

export const CATEGORIES: Category[] = ['Produce', 'Dairy', 'Meat & fish', 'Leftovers', 'Drinks', 'Other'];

const table: [RegExp, Category][] = [
  [
    /chicken|beef|pork|steak|meat|turkey|lamb|bacon|ham|sausage|salmon|tuna|fish|shrimp|prawn/i,
    'Meat & fish',
  ],
  [/leftover|pasta|curry|rice|takeout|pad thai|soup|stew|pizza|noodle|casserole/i, 'Leftovers'],
  [/juice|soda|cola|beer|wine|kombucha|lemonade|iced tea|water|smoothie/i, 'Drinks'],
  [/milk|yogurt|yoghurt|cream|cheese|mozzarella|cheddar|feta|brie|butter|egg/i, 'Dairy'],
  [
    /spinach|lettuce|kale|greens|arugula|salad|cilantro|parsley|basil|herb|tomato|avocado|cucumber|pepper|onion|carrot|apple|banana|lemon|lime|orange|berr|grape|mango|peach|broccoli|potato|mushroom|celery|garlic/i,
    'Produce',
  ],
];

export function categoryOf(name: string): Category {
  for (const [re, cat] of table) if (re.test(name)) return cat;
  return 'Other';
}
