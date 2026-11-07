import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAuthorized } from './auth.js';

test('allows everything when no token is configured', () => {
  assert.equal(isAuthorized(undefined, undefined), true);
  assert.equal(isAuthorized('', 'anything'), true);
});

test('requires the exact token when configured', () => {
  assert.equal(isAuthorized('secret', 'secret'), true);
  assert.equal(isAuthorized('secret', 'wrong!'), false);
  assert.equal(isAuthorized('secret', 'secre'), false);
  assert.equal(isAuthorized('secret', undefined), false);
});
