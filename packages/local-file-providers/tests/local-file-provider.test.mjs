import assert from 'node:assert/strict';
import test from 'node:test';

const provider = await import('../dist/index.js');

test('the live provider is structurally unavailable before qualification', () =>
  assert.deepEqual(provider.createQualifiedStructuredFileSource(), {
    ok: false,
    error: { family: 'FC-MECHANISM', code: 'PROVIDER_UNAVAILABLE_UNQUALIFIED' },
  }));

test('the package exposes no caller-directed file probe or provider registration surface', () => {
  for (const forbidden of [
    'probeStructuredFileSource',
    'readStructuredFileSource',
    'registerProvider',
    'configureProvider',
  ])
    assert.equal(forbidden in provider, false);
});
