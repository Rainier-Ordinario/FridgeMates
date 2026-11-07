import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeItems } from './scan.js';

test('maps model output to the contract and fills character fields', () => {
  const [item] = sanitizeItems({ items: [{ name: ' Milk ', emoji: '🥛', daysLeft: 5.6, dateSource: 'printed' }] });
  assert.deepEqual(item, {
    name: 'Milk', emoji: '🥛', characterName: 'Milk', personality: '', daysLeft: 6, dateSource: 'printed', intro: '',
  });
});

test('clamps days, defaults emoji and dateSource', () => {
  const out = sanitizeItems({ items: [
    { name: 'Rice', emoji: '', daysLeft: 9999, dateSource: 'weird' },
    { name: 'Old', emoji: '🍞', daysLeft: -50, dateSource: 'estimated' },
  ] });
  assert.equal(out[0].daysLeft, 365);
  assert.equal(out[0].emoji, '🍽️');
  assert.equal(out[0].dateSource, 'estimated');
  assert.equal(out[1].daysLeft, -3);
});

test('drops junk and survives bad input', () => {
  assert.deepEqual(sanitizeItems(null), []);
  assert.deepEqual(sanitizeItems({ items: 'nope' }), []);
  assert.deepEqual(sanitizeItems({ items: [{ name: '', daysLeft: 2 }, { name: 'X' }, { name: 'Y', daysLeft: NaN }] }), []);
});
