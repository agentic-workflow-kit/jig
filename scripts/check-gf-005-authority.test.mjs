import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAuthorityKernelSurface } from './check-gf-005-authority.mjs';

test('GF-005 static capability guard rejects effect and dispatch surfaces', () => {
  assert.deepEqual(validateAuthorityKernelSurface('.', 'export const safe = true;'), []);
  assert.deepEqual(validateAuthorityKernelSurface('.', "import { readFileSync } from 'node:fs';"), [
    'forbidden effect import',
  ]);
  assert.deepEqual(validateAuthorityKernelSurface('.', 'export function dispatch() {}'), [
    'forbidden capability surface',
  ]);
});
