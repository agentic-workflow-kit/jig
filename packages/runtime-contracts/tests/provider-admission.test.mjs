import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const runtime = await import('../dist/index.js');
const manifestBytes = readFileSync(resolve(import.meta.dirname, './fixtures/provider-authority-manifest.json'));
const manifest = JSON.parse(manifestBytes);
const manifestDigest = '53568c156d6ee898dc1ba32897d22f8abf47afa4bad86d35ffc6bcd7ce9067df';
const providerDigest = 'c18ba0c266f04abcf220a39edd23c54599894dbf36d8d024db4b93aacb70308b';
const manifestId = `provider/${providerDigest}/authority/${manifestDigest}`;
const basis = Object.freeze({
  providerIdentity: manifest.providerIdentity,
  providerBuild: 'build/fixture-1',
  environment: 'environment/semantic-fixture',
  capability: 'capability/proof-only',
  policyMinimum: 'minimum/fixture-1',
  manifestId,
  manifestDigest,
  scope: manifest.scope,
});
const approval = Object.freeze({ principal: 'principal/arye', manifestId, manifestDigest, scope: manifest.scope });
const start = Object.freeze({
  basis,
  ordinal: 1,
  deadline: 2_000,
  observedAt: 1_000,
  retryLimit: 2,
  predecessor: null,
});

test('provider admission: exact Arye manifest approval and positive exact-subject proof are necessary but never configure a provider', () => {
  assert.equal(typeof runtime.createProviderAdmissionFixture, 'function');
  const fixture = runtime.createProviderAdmissionFixture({ manifest, approval });
  assert.equal(fixture.approve(approval).ok, true);
  const started = fixture.start(start);
  assert.equal(started.ok, true);
  const completed = fixture.result({
    ...start,
    predecessor: started.value.digest,
    outcome: 'positive',
    observedAt: 1_100,
  });
  assert.equal(completed.ok, true);
  const admission = fixture.admit({ basis, proof: completed.value, observedAt: 1_200, maxAgeMs: 86_400_000 });
  assert.deepEqual(admission, { ok: true, value: { kind: 'eligible', manifestId, providerEnabled: false } });
  assert.deepEqual(fixture.reachability(), { ok: true, value: { kind: 'unavailable', providerEnabled: false } });
});

test('provider admission: approval and evidence substitutions, hostile values, stale/negative/timeout/exhausted proofs fail closed', () => {
  const fixture = runtime.createProviderAdmissionFixture({ manifest, approval });
  const rejected = [
    { ...approval, principal: 'principal/other' },
    { ...approval, scope: { ...manifest.scope, purpose: 'wider' } },
    { ...approval, proposalApproval: true },
    new Proxy(
      {},
      {
        get() {
          throw new Error('hostile');
        },
      },
    ),
  ];
  for (const input of rejected) assert.equal(fixture.approve(input).ok, false);
  const started = fixture.start(start);
  assert.equal(started.ok, true);
  for (const outcome of ['negative', 'timeout', 'exhausted']) {
    const bounded = runtime.createProviderAdmissionFixture({ manifest, approval });
    const started = bounded.start(start);
    assert.equal(started.ok, true);
    const proof = bounded.result({ ...start, predecessor: started.value.digest, outcome, observedAt: 1_100 });
    assert.equal(proof.ok, true);
    assert.equal(bounded.admit({ basis, proof: proof.value, observedAt: 1_200, maxAgeMs: 1 }).ok, false, outcome);
  }
  assert.equal(fixture.admit({ basis: { ...basis, capability: 'capability/other' }, proof: started.value }).ok, false);
});

test('provider admission: variant replay, predecessor, ordinal, deadline, readback and secret rejection are immutable', () => {
  const fixture = runtime.createProviderAdmissionFixture({ manifest, approval });
  const one = fixture.start(start);
  assert.equal(one.ok, true);
  assert.deepEqual(fixture.start(start), one);
  assert.equal(fixture.start({ ...start, deadline: 2_001 }).ok, false);
  assert.equal(
    fixture.result({ ...start, predecessor: '0'.repeat(64), outcome: 'positive', observedAt: 1_100 }).ok,
    false,
  );
  assert.equal(fixture.start({ ...start, ordinal: 2, predecessor: one.value.digest }).ok, false);
  assert.equal(fixture.start({ ...start, ordinal: 2, predecessor: one.value.digest, observedAt: 2_001 }).ok, false);
  assert.equal(fixture.start({ ...start, basis: { ...basis, credentialName: 'SECRET=not-durable' } }).ok, false);
  assert.deepEqual(fixture.readback({ basis, ordinal: 1, variant: 'start' }), one);
});

test('provider admission: malformed, oversize, special-key and unapproved inputs cannot produce a proof or leak secrets', () => {
  const unapproved = runtime.createProviderAdmissionFixture({
    manifest,
    approval: { ...approval, principal: 'principal/nope' },
  });
  assert.equal(unapproved.start(start).ok, false);
  const fixture = runtime.createProviderAdmissionFixture({ manifest, approval });
  const hostile = [
    { ...start, extra: true },
    { ...start, basis: { ...basis, __proto__: { widened: true } } },
    { ...start, basis: { ...basis, providerBuild: 'x'.repeat(257) } },
    new Proxy(start, {
      ownKeys() {
        throw new Error('hostile keys');
      },
    }),
  ];
  for (const input of hostile) {
    const result = fixture.start(input);
    assert.equal(result.ok, false);
    assert.equal(JSON.stringify(result).includes('not-durable'), false);
  }
});
