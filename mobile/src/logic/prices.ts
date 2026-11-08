/**
 * Rough grocery prices (CAD) by keyword, for "$ saved". No API; good enough for a smile, not a receipt.
 * TODO(ios-logic): swap for real receipt data if we ever scan receipts.
 */
const table: [RegExp, number][] = [
  [/chicken|beef|pork|steak|meat|salmon|fish|shrimp/i, 10],
  [/leftover|pasta|curry|rice bowl|takeout|pad thai/i, 6],
  [/cheese|mozzarella|cheddar|feta|brie/i, 6],
  [/yogurt|yoghurt/i, 5],
  [/egg/i, 5],
  [/berr|strawberr|raspberr|blueberr/i, 5],
  [/milk|oat milk|almond milk|cream/i, 4],
  [/spinach|lettuce|kale|greens|arugula|salad|cilantro|parsley|basil|herb/i, 3],
  [/bread|bagel|tortilla/i, 3],
  [/tomato|avocado|cucumber|pepper|onion|carrot|apple|banana|lemon|lime|orange/i, 2],
];

export function estimatePrice(name: string): number {
  for (const [re, price] of table) if (re.test(name)) return price;
  return 3;
}

export function formatDollars(n: number): string {
  return `$${Math.round(n)}`;
}
