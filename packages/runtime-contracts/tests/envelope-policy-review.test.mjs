import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const runtime = await import('../dist/index.js');
const bounds = JSON.parse(readFileSync(resolve(import.meta.dirname, 'fixtures/envelope-bounds-oracle.json'), 'utf8'));
const digest = (c) => c.repeat(64);
const plan = () => ({
  version: 'jig.plan.v1',
  track: 'track/default',
  policy: { frozenCheckClasses: ['check/unit'], capacities: { 'rc-session': 3 }, reserves: { 'rc-session': 1 } },
  stories: [
    {
      key: 'story/one',
      track: 'track/default',
      dependsOn: [],
      done: { kind: 'checks-pass', checkClasses: ['check/unit'] },
      requirements: ['req'],
      acceptanceCriteria: ['accept'],
      demand: { 'rc-session': 1 },
    },
  ],
});
const input = () => ({
  plan: plan(),
  policy: {
    track: 'track/default',
    floors: { review: 2 },
    selections: { review: 2 },
    bounds: Object.fromEntries(Object.entries(runtime.ENVELOPE_BOUNDS).map(([id, value]) => [id, value.default])),
    capacities: { 'RC-SESSION': 2, 'RC-FINALIZER': 1 },
    reserves: { 'RC-SESSION': 1 },
  },
  profile: {
    track: 'track/default',
    version: 'v1',
    model: 'model/default',
    provider: 'provider/declarative',
    effort: 'standard',
    cost: 'balanced',
    promptStrategy: { artifact: 'strategy/default', version: 'v1', digest: digest('a') },
    promptDigest: digest('a'),
    roles: [{ role: 'implementer', prompt: 'prompt/one' }],
  },
  artifacts: [
    { track: 'track/default', kind: 'role-prompt', version: 'v1', digest: digest('a'), id: 'prompt/one' },
    { track: 'track/default', kind: 'prompt-strategy', version: 'v1', digest: digest('a'), id: 'strategy/default' },
  ],
  setup: {
    track: 'track/default',
    recipeDigest: digest('c'),
    inputFingerprintRule: 'workspace-v1',
    pathManifest: ['src'],
    ruleManifest: ['review'],
  },
  ruleSurface: { track: 'track/default', version: 'v1', entries: [{ path: 'src', rule: 'review' }] },
  guidance: { rationale: 'why', suitableUse: 'when', tradeoffs: 'cost' },
});

test('R01 RED: full GF-019 plan is reused and approved plan digest is bound', () => {
  const result = runtime.composeEnvelope(input());
  assert.equal(result.ok, true);
  assert.match(result.value.digests.plan, /^[0-9a-f]{64}$/);
});
test('R02 RED: profile references exact artifacts and guidance has no authority', () => {
  const result = runtime.composeEnvelope(input());
  assert.equal(result.ok, true);
  assert.equal('guidance' in result.value.policy, false);
});
test('R03 RED: hostile proxy array is rejected without its get trap', () => {
  let reads = 0;
  const value = input();
  value.plan.stories = new Proxy(value.plan.stories, {
    get() {
      reads += 1;
      throw new Error('must not read');
    },
    ownKeys() {
      throw new Error('reject proxy');
    },
  });
  assert.equal(runtime.composeEnvelope(value).ok, false);
  assert.equal(reads, 0);
});
test('R04 RED: independent literal bounds oracle is the catalogue', () => {
  assert.deepEqual(
    runtime.ENVELOPE_BOUNDS,
    Object.fromEntries(Object.entries(bounds).filter(([key]) => key !== 'version')),
  );
});

test('R02 second-review RED: prompt digest must bind the referenced prompt artifact and guidance changes proposal', () => {
  const value = input();
  value.profile.promptDigest = digest('f');
  assert.equal(runtime.composeEnvelope(value).ok, false);
});

test('R05 RED: generic approved-plan resources are composition-incompatible', () => {
  const value = input();
  value.plan.policy.capacities = { cpu: 3 };
  value.plan.policy.reserves = { cpu: 1 };
  value.plan.stories[0].demand = { cpu: 1 };
  assert.equal(runtime.composeEnvelope(value).ok, false);
});
test('R05: composition rejects cumulative dependency demand that exhausts the reserve', () => {
  const value = input();
  value.plan.stories.push({
    ...value.plan.stories[0],
    key: 'story/two',
    dependsOn: ['story/one'],
    demand: { 'rc-session': 1 },
  });
  assert.equal(runtime.composeEnvelope(value).ok, false);
});
test('R06 RED: floor mutation changes proposal identity', () => {
  const a = input();
  const b = input();
  b.policy.floors.review = 1;
  const left = runtime.composeEnvelope(a);
  const right = runtime.composeEnvelope(b);
  assert.equal(left.ok, true);
  assert.equal(right.ok, true);
  assert.notEqual(left.value.proposalDigest, right.value.proposalDigest);
});
test('R07 RED: declarative model profile is accepted but no provider authority appears', () => {
  const value = input();
  value.profile.model = 'model/x';
  const result = runtime.composeEnvelope(value);
  assert.equal(result.ok, true);
  assert.equal('provider' in result.value, false);
});
test('R08 RED: bearer credential-shaped guidance rejects without disclosure', () => {
  const value = input();
  value.guidance.rationale = 'Bearer abc.def.ghi';
  const result = runtime.composeEnvelope(value);
  assert.equal(result.ok, false);
  assert.equal('message' in result.error, false);
});
test('R08: benign prose mentioning a token remains accepted', () => {
  const value = input();
  value.guidance.rationale = 'A token budget is part of the cost tradeoff.';
  assert.equal(runtime.composeEnvelope(value).ok, true);
});
test('R09 RED: guidance-only mutation changes proposal digest', () => {
  const a = input();
  const b = input();
  b.guidance.rationale = 'different';
  const left = runtime.composeEnvelope(a);
  const right = runtime.composeEnvelope(b);
  assert.equal(left.ok, true);
  assert.equal(right.ok, true);
  assert.notEqual(left.value.proposalDigest, right.value.proposalDigest);
});
