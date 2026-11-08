import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sanitizeItems } from './scan.js';

test('maps model output to the contract and fills character fields', () => {
  const [item] = sanitizeItems({ items: [{ name: ' Milk ', emoji: '🥛', daysLeft: 5.6, dateSource: 'printed' }] });
  assert.deepEqual(item, {
    name: 'Milk', emoji: '🥛', quantity: 1, characterName: 'Milk', personality: '', daysLeft: 6, dateSource: 'printed', intro: '',
  });
});

test('preserves scanned quantities and combines duplicate names', () => {
  const out = sanitizeItems({ items: [
    { name: ' Milk ', emoji: '🥛', quantity: 2, daysLeft: 5, dateSource: 'estimated' },
    { name: 'milk', emoji: '🥛', quantity: 3, daysLeft: 2, dateSource: 'printed' },
    { name: 'Eggs', emoji: '🥚', quantity: 0, daysLeft: 12, dateSource: 'estimated' },
  ] });
  assert.equal(out.length, 2);
  assert.equal(out[0].quantity, 5);
  assert.equal(out[0].daysLeft, 2);
  assert.equal(out[0].dateSource, 'printed');
  assert.equal(out[1].quantity, 1);
});

test('caps quantities at the supported maximum', () => {
  const [item] = sanitizeItems({ items: [{ name: 'Apples', quantity: 500, daysLeft: 3 }] });
  assert.equal(item.quantity, 99);
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

import { isQuotaError } from './scan.js';

test('recognises quota errors, ignores others', () => {
  assert.equal(isQuotaError({ status: 429 }), true);
  assert.equal(isQuotaError(new Error('RESOURCE_EXHAUSTED: quota exceeded')), true);
  assert.equal(isQuotaError(new Error('got 429 from upstream')), true);
  assert.equal(isQuotaError(new Error('network down')), false);
  assert.equal(isQuotaError(null), false);
});
