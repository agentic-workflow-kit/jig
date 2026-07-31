import assert from 'node:assert/strict';
import test from 'node:test';

const runtime = await import('../dist/index.js');

const policy = {
  track: 'track/default',
  floors: { review: 2, checks: 1 },
  bounds: {},
  capacities: { 'RC-SESSION': 2, 'RC-FINALIZER': 1 },
  reserves: { 'RC-SESSION': 1 },
};

const input = () => ({
  plan: {
    track: 'track/default',
    stories: [{ key: 'story/one', track: 'track/default', demand: { 'RC-SESSION': 1, 'RC-FINALIZER': 1 } }],
  },
  policy,
  profile: { track: 'track/default', version: 'v1', promptDigest: 'a'.repeat(64) },
  artifacts: [{ track: 'track/default', kind: 'preset', version: 'v1', digest: 'b'.repeat(64) }],
  setup: { track: 'track/default', recipeDigest: 'c'.repeat(64), inputFingerprintRule: 'workspace-v1' },
  ruleSurface: { track: 'track/default', version: 'v1', rules: { review: 3, checks: 1 } },
});

test('GF-021: composition preserves floors, pins defaults, one track, and is replayable', () => {
  const first = runtime.composeEnvelope(input());
  const replay = runtime.composeEnvelope(input());
  assert.equal(first.ok, true);
  assert.deepEqual(replay, first);
  assert.equal(first.value.track, 'track/default');
  assert.equal(first.value.policy.review, 3);
  assert.equal(first.value.bounds['BND-REWORK'].value, 2);
  assert.equal(first.value.bounds['BND-WAIT-DECISION'].value, 72 * 60 * 60);
  assert.equal(Object.isFrozen(first.value), true);
  assert.equal(Object.isFrozen(first.value.policy), true);
  assert.match(first.value.proposalDigest, /^[0-9a-f]{64}$/);
});

test('GF-021: rejects weakened floors, unsafe reserve, cross-track input, and range edge violations', () => {
  for (const mutate of [
    (value) => {
      value.ruleSurface.rules.review = 1;
    },
    (value) => {
      value.policy.reserves = { 'RC-SESSION': 0 };
    },
    (value) => {
      value.profile.track = 'track/other';
    },
    (value) => {
      value.policy.bounds = { 'BND-REWORK': 6 };
    },
  ]) {
    const value = input();
    mutate(value);
    assert.equal(runtime.composeEnvelope(value).ok, false);
  }
});
