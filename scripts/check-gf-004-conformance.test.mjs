import assert from 'node:assert/strict';
import test from 'node:test';
import { validateConformanceSurface } from './check-gf-004-conformance.mjs';

test('GF-004 conformance surface has no provider, effect, or configuration capability', () =>
  assert.deepEqual(validateConformanceSurface(), []));
test('GF-004 conformance guard rejects six capability mutations', () => {
  const cases = [
    "import x from 'node:fs'",
    'export function register() {}',
    'export function dispatch() {}',
    'export const token = 1',
    'export class Adapter {}',
    'export const x = fetch',
  ];
  assert.equal(cases.length, 6);
  for (const source of cases)
    assert.deepEqual(
      validateConformanceSurface(process.cwd(), source),
      source.includes('node:') ? ['forbidden effect import'] : ['forbidden capability surface'],
    );
});
