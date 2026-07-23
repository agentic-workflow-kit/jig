import assert from 'node:assert/strict';
import test from 'node:test';
import { validateActiveRepository } from './check-active-repository.mjs';

test('validateActiveRepository passes on current active repository', () => {
  const errors = validateActiveRepository();
  assert.equal(errors.length, 0, `Expected 0 structure check errors, got: ${errors.join(', ')}`);
});
