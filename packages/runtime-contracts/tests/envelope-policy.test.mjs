import assert from 'node:assert/strict';
import test from 'node:test';

const runtime = await import('../dist/index.js');

const policy = {
  track: 'track/default',
  floors: { review: 2, checks: 1 },
  selections: { review: 3, checks: 1 },
  bounds: Object.fromEntries(Object.entries(runtime.ENVELOPE_BOUNDS).map(([id, value]) => [id, value.default])),
  capacities: { 'RC-SESSION': 2, 'RC-FINALIZER': 1 },
  reserves: { 'RC-SESSION': 1 },
};

const input = () => ({
  plan: {
    version: 'jig.plan.v1',
    track: 'track/default',
    policy: { frozenCheckClasses: ['check/unit'], capacities: { cpu: 3 }, reserves: { cpu: 1 } },
    stories: [
      {
        key: 'story/one',
        track: 'track/default',
        dependsOn: [],
        done: { kind: 'checks-pass', checkClasses: ['check/unit'] },
        requirements: ['req'],
        acceptanceCriteria: ['accept'],
        demand: { cpu: 1 },
      },
    ],
  },
  policy: structuredClone(policy),
  profile: {
    track: 'track/default',
    version: 'v1',
    promptDigest: 'a'.repeat(64),
    roles: [{ role: 'implementer', prompt: 'prompt/one' }],
  },
  artifacts: [{ track: 'track/default', kind: 'role-prompt', version: 'v1', digest: 'a'.repeat(64), id: 'prompt/one' }],
  setup: {
    track: 'track/default',
    recipeDigest: 'c'.repeat(64),
    inputFingerprintRule: 'workspace-v1',
    pathManifest: ['src'],
    ruleManifest: ['review'],
  },
  ruleSurface: { track: 'track/default', version: 'v1', entries: [{ path: 'src', rule: 'review' }] },
  guidance: { rationale: 'why', suitableUse: 'when', tradeoffs: 'cost' },
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
      value.policy.selections.review = 1;
    },
    (value) => {
      value.policy.reserves = { 'RC-SESSION': 0 };
    },
    (value) => {
      value.profile.track = 'track/other';
    },
    (value) => {
      value.policy.bounds['BND-REWORK'] = 6;
    },
  ]) {
    const value = input();
    mutate(value);
    assert.equal(runtime.composeEnvelope(value).ok, false);
  }
});

test('GF-021: every design-owned bound accepts lower/default/upper and rejects just outside', () => {
  for (const [id, definition] of Object.entries(runtime.ENVELOPE_BOUNDS)) {
    for (const selected of [definition.lower, definition.default, definition.upper]) {
      const value = input();
      value.policy.bounds[id] = selected;
      const result = runtime.composeEnvelope(value);
      assert.equal(result.ok, true, `${id}:${selected}`);
      assert.equal(result.value.bounds[id].rangeVersion, 'jig.envelope-bounds.v1');
    }
    for (const selected of [definition.lower - 1, definition.upper + 1]) {
      const value = input();
      value.policy.bounds[id] = selected;
      assert.equal(runtime.composeEnvelope(value).ok, false, `${id}:${selected}`);
    }
  }
});

test('GF-021: hostile or hidden input is rejected without invoking getters', () => {
  let reads = 0;
  const hostile = input();
  Object.defineProperty(hostile, 'credential', {
    enumerable: true,
    get() {
      reads += 1;
      throw new Error('no read');
    },
  });
  const variants = [
    hostile,
    new Proxy(input(), {
      ownKeys() {
        throw new Error('no proxy read');
      },
    }),
    { ...input(), extra: true },
  ];
  for (const value of variants) {
    const result = runtime.composeEnvelope(value);
    assert.equal(result.ok, false);
    assert.equal(result.error.family, 'FC-INPUT');
    assert.equal('message' in result.error, false);
  }
  assert.equal(reads, 0);
});

test('GF-021: changed validated input creates a new proposal and result contains no authority surface', () => {
  const first = runtime.composeEnvelope(input());
  const changed = input();
  changed.policy.selections.review = 4;
  const second = runtime.composeEnvelope(changed);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.notEqual(first.value.proposalDigest, second.value.proposalDigest);
  for (const forbidden of ['run', 'approve', 'preview', 'intake', 'dispatch', 'provider', 'receipt', 'execute'])
    assert.equal(forbidden in first.value, false);
});
