import assert from 'node:assert/strict';
import test from 'node:test';

const provider = await import('../dist/index.js');
const runtime = await import('@agentic-workflow-kit/jig-runtime-contracts');
const request = (deadline, limit) =>
  runtime.encodeSourceRequest({
    version: 'jig.source.v1',
    sourceIdentity: 'source/structured-json-file-source',
    basis: { track: 'track/one' },
    track: 'track/one',
    deadline,
    retry: { ordinal: 0, limit },
    predecessor: null,
  }).value;

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

test('the adapter boundary retains the fixed wait and retry ranges', () => {
  assert.equal(provider.validateStructuredFileSourceRequest(request(900_000, 3)).ok, true);
  for (const [wait, retry] of [
    [4_999, 3],
    [7_200_001, 3],
    [900_000, 0],
    [900_000, 6],
  ])
    assert.equal(provider.validateStructuredFileSourceRequest(request(wait, retry)).ok, false);
});
