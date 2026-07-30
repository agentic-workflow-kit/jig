import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const registry = await import('../dist/registry.js');
const fixture = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/registry-contract-oracle.json'), 'utf8'),
);
const digest = (character) => character.repeat(64);
const descriptor = fixture.registryDescriptor;
const target = `target/${fixture.targetKey}`;
const registryId = `registry/${descriptor}`;
const canonicalBinding = registry.createRegistryBinding({ descriptor, targetKey: fixture.targetKey }).value;
const candidate = (suffix, contentDigest = fixture.digests.candidateA) =>
  `${fixture.story}/cand/${suffix}|${contentDigest}`;
const waiter = ({
  story = fixture.story,
  candidateId = candidate(1),
  candidateContentDigest = fixture.digests.candidateA,
  basis = fixture.digests.basisA,
  priority = 2,
  ordinal = 1,
  waitedAt = 10,
} = {}) => ({
  run: fixture.run,
  story,
  generation: fixture.generation,
  candidate: candidateId,
  candidateContentDigest,
  eligibilityBasis: basis,
  comparator: { priority, ordinal, story },
  waitedAt,
});
const structuralProof = (grant) => ({
  kind: 'structural-no-effect',
  authority: grant.authority,
  candidate: grant.content.candidate,
  generation: grant.content.fence.generation,
  registry: grant.content.fence.registry,
  target: grant.content.fence.target,
});

test('registry IDs and records are canonical, realization-bound, and expected-head-plus-one staged', () => {
  assert.equal(registry.REGISTRY_VERSION, 'jig.registry.v1');
  assert.deepEqual(registry.createRegistryBinding({ descriptor, targetKey: fixture.targetKey }), {
    ok: true,
    value: canonicalBinding,
  });
  const store = registry.createScriptedRegistry();
  const appended = store.waiter({
    binding: canonicalBinding,
    expectedPosition: -1,
    expectedDigest: digest('0'),
    waiter: waiter(),
  });
  assert.equal(appended.ok, true);
  assert.equal(appended.value.position, 0);
  assert.equal(appended.value.previousDigest, digest('0'));
  assert.equal(appended.value.registry, registryId);
  assert.equal(appended.value.target, target);
  assert.equal(appended.value.variant, 'waiter');
  assert.equal(appended.value.content.waiter.waitedAt, 10);
  assert.equal(store.snapshot(canonicalBinding).value.position, 0);
});

test('least eligible unwithdrawn waiter grants without preemption and allocates the only authority', () => {
  const store = registry.createScriptedRegistry();
  const binding = canonicalBinding;
  const later = store.waiter({
    binding,
    expectedPosition: -1,
    expectedDigest: digest('0'),
    waiter: waiter({ priority: 9, ordinal: 9 }),
  });
  const earlier = store.waiter({
    binding,
    expectedPosition: 0,
    expectedDigest: later.value.contentDigest,
    waiter: waiter({
      story: `${fixture.run}/story/earlier`,
      priority: 1,
      ordinal: 1,
      candidateId: `${fixture.run}/story/earlier/cand/1|${fixture.digests.candidateB}`,
      candidateContentDigest: fixture.digests.candidateB,
      basis: fixture.digests.basisB,
    }),
  });
  const denied = store.grant({
    binding,
    expectedPosition: 1,
    expectedDigest: earlier.value.contentDigest,
    waiter: later.value.handle,
    eligibilityBasis: fixture.digests.basisA,
  });
  assert.deepEqual(denied, { ok: false, error: { family: 'FC-AUTHORITY', code: 'NOT_LEAST_ELIGIBLE_WAITER' } });
  const grant = store.grant({
    binding,
    expectedPosition: 1,
    expectedDigest: earlier.value.contentDigest,
    waiter: earlier.value.handle,
    eligibilityBasis: fixture.digests.basisB,
  });
  assert.equal(grant.ok, true);
  assert.equal(grant.value.variant, 'grant');
  assert.equal(grant.value.authority, `${target}/auth/1`);
  assert.equal(
    store.grant({
      binding,
      expectedPosition: 2,
      expectedDigest: grant.value.contentDigest,
      waiter: later.value.handle,
      eligibilityBasis: fixture.digests.basisA,
    }).error.code,
    'AUTHORITY_ALREADY_HELD',
  );
  assert.deepEqual(
    store.release({
      binding,
      expectedPosition: 1,
      expectedDigest: earlier.value.contentDigest,
      authority: grant.value.authority,
      proof: structuralProof(grant.value),
    }),
    { ok: false, error: { family: 'FC-FENCE', code: 'EXPECTED_HEAD_MISMATCH' } },
  );
});

test('stale eligibility cannot mint authority after a conditional head re-read', () => {
  const store = registry.createScriptedRegistry();
  const binding = canonicalBinding;
  const queued = store.waiter({ binding, expectedPosition: -1, expectedDigest: digest('0'), waiter: waiter() });
  assert.deepEqual(
    store.grant({
      binding,
      expectedPosition: 0,
      expectedDigest: queued.value.contentDigest,
      waiter: queued.value.handle,
      eligibilityBasis: fixture.digests.basisB,
    }),
    { ok: false, error: { family: 'FC-AUTHORITY', code: 'STALE_ELIGIBILITY' } },
  );
});

test('withdrawal wins a grant race, release requires proof, and atomic rebind has no unowned interval', () => {
  const store = registry.createScriptedRegistry();
  const binding = canonicalBinding;
  const queued = store.waiter({ binding, expectedPosition: -1, expectedDigest: digest('0'), waiter: waiter() });
  const withdrawn = store.withdrawal({
    binding,
    expectedPosition: 0,
    expectedDigest: queued.value.contentDigest,
    waiter: queued.value.handle,
    eligibilityBasis: fixture.digests.basisA,
    reason: 'invalidated',
  });
  assert.equal(
    store.grant({
      binding,
      expectedPosition: 1,
      expectedDigest: withdrawn.value.contentDigest,
      waiter: queued.value.handle,
      eligibilityBasis: fixture.digests.basisA,
    }).error.code,
    'WAITER_WITHDRAWN',
  );
  const next = store.waiter({
    binding,
    expectedPosition: 1,
    expectedDigest: withdrawn.value.contentDigest,
    waiter: waiter({
      story: `${fixture.run}/story/next`,
      candidateId: `${fixture.run}/story/next/cand/1|${fixture.digests.candidateB}`,
      candidateContentDigest: fixture.digests.candidateB,
      basis: fixture.digests.basisB,
    }),
  });
  const grant = store.grant({
    binding,
    expectedPosition: 2,
    expectedDigest: next.value.contentDigest,
    waiter: next.value.handle,
    eligibilityBasis: fixture.digests.basisB,
  });
  assert.equal(
    store.release({
      binding,
      expectedPosition: 3,
      expectedDigest: grant.value.contentDigest,
      authority: grant.value.authority,
      proof: '',
    }).error.code,
    'INVALID_RELEASE_PROOF',
  );
  const rebound = store.atomicRebind({
    binding,
    expectedPosition: 3,
    expectedDigest: grant.value.contentDigest,
    authority: grant.value.authority,
    releaseProof: structuralProof(grant.value),
    candidate: `${fixture.run}/story/next/cand/2|${fixture.digests.candidateA}`,
    candidateContentDigest: fixture.digests.candidateA,
    eligibilityBasis: fixture.digests.basisA,
    generation: fixture.generation,
  });
  assert.equal(rebound.ok, true);
  assert.equal(rebound.value.variant, 'atomic-rebind');
  assert.equal(rebound.value.authority, `${target}/auth/2`);
  assert.deepEqual(rebound.value.content.oldAuthority.authority, grant.value.authority);
  assert.deepEqual(rebound.value.content.newAuthority, {
    authority: `${target}/auth/2`,
    candidate: `${fixture.run}/story/next/cand/2|${fixture.digests.candidateA}`,
    candidateContentDigest: fixture.digests.candidateA,
    eligibilityBasis: fixture.digests.basisA,
    generation: fixture.generation,
    registry: registryId,
    target,
    story: `${fixture.run}/story/next`,
    fence: { registry: registryId, target, generation: fixture.generation },
  });
});

test('witness flushes before acknowledgement; crashes, lost ack, fork, rollback, mismatch, and missing witness stop trust', () => {
  const binding = canonicalBinding;
  for (const fault of ['after-flush', 'after-witness', 'lost-ack']) {
    const store = registry.createScriptedRegistry();
    const result = store.waiter({
      binding,
      expectedPosition: -1,
      expectedDigest: digest('0'),
      waiter: waiter(),
      fault,
    });
    assert.deepEqual(result, { ok: false, error: { family: 'FC-TRUST', code: 'ACK_LOST' } });
    const readback = store.readback({ binding, position: 0 });
    if (fault === 'after-flush')
      assert.deepEqual(readback, { ok: false, error: { family: 'FC-TRUST', code: 'WITNESS_ABSENT' } });
    else assert.equal(readback.ok, true);
  }
  for (const fault of ['witness-absent', 'witness-ahead', 'witness-contradiction', 'fork', 'rollback']) {
    const store = registry.createScriptedRegistry();
    const created = store.waiter({ binding, expectedPosition: -1, expectedDigest: digest('0'), waiter: waiter() });
    assert.equal(store.injectFault(binding, fault).ok, true);
    const read = store.readback({ binding, position: created.value.position });
    assert.deepEqual(read, { ok: false, error: { family: 'FC-TRUST', code: registry.faultCode(fault) } });
  }
});

test('registry-first mirror reconciliation is audit-only and hostile inputs fail closed without getters', () => {
  const store = registry.createScriptedRegistry();
  const binding = canonicalBinding;
  const created = store.waiter({ binding, expectedPosition: -1, expectedDigest: digest('0'), waiter: waiter() });
  assert.deepEqual(store.reconcileMirror({ binding, mirrorDigest: digest('f') }), {
    ok: true,
    value: { kind: 'repair-required', authoritativeDigest: created.value.contentDigest },
  });
  let gets = 0;
  const hostile = new Proxy(
    {},
    {
      get() {
        gets += 1;
        throw new Error('getter');
      },
    },
  );
  for (const operation of [
    () => store.snapshot(hostile),
    () => store.waiter({ binding: hostile, expectedPosition: -1, expectedDigest: digest('0'), waiter: hostile }),
    () => store.readback({ binding: hostile, position: 0 }),
  ]) {
    assert.doesNotThrow(operation);
    assert.equal(operation().ok, false);
  }
  assert.equal(gets, 0);
});

test('regression R1-R4: descriptor-bound adoption, one-time waiter consumption, typed release proof, and staged head facts', () => {
  const expected = registry.createRegistryBinding({ descriptor, targetKey: fixture.targetKey });
  assert.equal(expected.ok, true);
  assert.equal(expected.value.descriptor, descriptor);
  const foreign = { ...expected.value, registry: `registry/${digest('f')}` };
  const store = registry.createScriptedRegistry();
  assert.equal(
    store.waiter({
      binding: foreign,
      expectedPosition: -1,
      expectedDigest: digest('0'),
      waiter: waiter(),
    }).error.code,
    'FOREIGN_REGISTRY_BINDING',
  );
  const queued = store.waiter({
    binding: expected.value,
    expectedPosition: -1,
    expectedDigest: digest('0'),
    waiter: waiter(),
  });
  assert.equal(queued.value.expectedHeadPosition, -1);
  assert.equal(queued.value.expectedHeadDigest, digest('0'));
  assert.equal(queued.value.predecessorDigest, digest('0'));
  assert.equal(
    store.waiter({ binding: expected.value, expectedPosition: -1, waiter: waiter() }).error.code,
    'INVALID_EXPECTED_HEAD',
  );
  for (const operation of [
    () => store.snapshot(foreign),
    () => store.readback({ binding: foreign, position: 0 }),
    () => store.reconcileMirror({ binding: foreign, mirrorDigest: digest('0') }),
  ])
    assert.equal(operation().error.code, 'FOREIGN_REGISTRY_BINDING');
});

test('regression R2-R3: grants consume the exact handle and typed proofs bind every authority fact', () => {
  const store = registry.createScriptedRegistry();
  const first = store.waiter({
    binding: canonicalBinding,
    expectedPosition: -1,
    expectedDigest: digest('0'),
    waiter: waiter(),
  });
  const grant = store.grant({
    binding: canonicalBinding,
    expectedPosition: 0,
    expectedDigest: first.value.contentDigest,
    waiter: first.value.handle,
    eligibilityBasis: fixture.digests.basisA,
  });
  assert.equal(grant.ok, true);
  const released = store.release({
    binding: canonicalBinding,
    expectedPosition: 1,
    expectedDigest: grant.value.contentDigest,
    authority: grant.value.authority,
    proof: structuralProof(grant.value),
  });
  assert.equal(released.ok, true);
  assert.equal(
    store.grant({
      binding: canonicalBinding,
      expectedPosition: 2,
      expectedDigest: released.value.contentDigest,
      waiter: first.value.handle,
      eligibilityBasis: fixture.digests.basisA,
    }).error.code,
    'WAITER_ALREADY_CONSUMED',
  );
  const alternate = store.waiter({
    binding: canonicalBinding,
    expectedPosition: 2,
    expectedDigest: released.value.contentDigest,
    waiter: waiter({ candidateId: candidate(2), candidateContentDigest: fixture.digests.candidateB }),
  });
  assert.equal(
    store.grant({
      binding: canonicalBinding,
      expectedPosition: 3,
      expectedDigest: alternate.value.contentDigest,
      waiter: alternate.value.handle,
      eligibilityBasis: fixture.digests.basisA,
    }).error.code,
    'STORY_ALREADY_GRANTED',
  );
  assert.equal(
    store.release({
      binding: canonicalBinding,
      expectedPosition: 3,
      expectedDigest: alternate.value.contentDigest,
      authority: grant.value.authority,
      proof: digest('f'),
    }).error.code,
    'STALE_AUTHORITY',
  );
});
