import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const runtime = await import('../dist/index.js');
const manifestBytes = readFileSync(resolve(import.meta.dirname, './fixtures/provider-authority-manifest.json'));
const manifest = JSON.parse(manifestBytes);
const approvedBytes = Buffer.from(
  '{"credentialAuthority":[],"externalServiceAuthority":[],"filesystemAuthority":[],"lineage":{"kind":"genesis"},"manifestVersion":"provider-authority/v1","nativePermissionPostures":[],"networkAuthority":[],"providerIdentity":"scripted-capability-proof-fixture/v1","runtimeAuthority":{"kind":"in-process-pure-fixture"},"scope":{"phase":2,"purpose":"semantic-admission-fixture","story":"GF-022"},"subprocessAuthority":[]}',
);
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
const configured = (ledger = runtime.createScriptedLedger()) => ({ manifestBytes: approvedBytes, approval, ledger });

test('provider admission: exact Arye manifest approval and positive exact-subject proof are necessary but never configure a provider', () => {
  assert.equal(typeof runtime.createProviderAdmissionFixture, 'function');
  const fixture = runtime.createProviderAdmissionFixture(configured());
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
  const fixture = runtime.createProviderAdmissionFixture(configured());
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
    const bounded = runtime.createProviderAdmissionFixture(configured());
    const started = bounded.start(start);
    assert.equal(started.ok, true);
    const proof = bounded.result({ ...start, predecessor: started.value.digest, outcome, observedAt: 1_100 });
    assert.equal(proof.ok, true);
    assert.equal(bounded.admit({ basis, proof: proof.value, observedAt: 1_200, maxAgeMs: 1 }).ok, false, outcome);
  }
  assert.equal(fixture.admit({ basis: { ...basis, capability: 'capability/other' }, proof: started.value }).ok, false);
});

test('provider admission: variant replay, predecessor, ordinal, deadline, readback and secret rejection are immutable', () => {
  const fixture = runtime.createProviderAdmissionFixture(configured());
  const one = fixture.start(start);
  assert.equal(one.ok, true);
  assert.deepEqual(fixture.start(start), one);
  assert.equal(fixture.start({ ...start, deadline: 2_001 }).ok, false);
  assert.equal(
    fixture.result({ ...start, predecessor: '0'.repeat(64), outcome: 'positive', observedAt: 1_100 }).ok,
    false,
  );
  assert.equal(
    fixture.result({ ...start, predecessor: one.value.digest, outcome: 'positive', deadline: 2_001, observedAt: 1_100 })
      .ok,
    false,
  );
  const exhausted = fixture.result({
    ...start,
    predecessor: one.value.digest,
    outcome: 'exhausted',
    observedAt: 1_100,
  });
  assert.equal(exhausted.ok, true);
  assert.equal(fixture.start({ ...start, ordinal: 2, predecessor: exhausted.value.digest }).ok, false);
  assert.equal(fixture.start({ ...start, ordinal: 2, predecessor: one.value.digest }).ok, false);
  assert.equal(fixture.start({ ...start, ordinal: 2, predecessor: one.value.digest, observedAt: 2_001 }).ok, false);
  assert.equal(fixture.start({ ...start, basis: { ...basis, credentialName: 'SECRET=not-durable' } }).ok, false);
  assert.deepEqual(fixture.readback({ basis, ordinal: 1, variant: 'start' }), one);
});

test('provider admission: malformed, oversize, special-key and unapproved inputs cannot produce a proof or leak secrets', () => {
  const unapproved = runtime.createProviderAdmissionFixture({
    manifestBytes: approvedBytes,
    approval: { ...approval, principal: 'principal/nope' },
  });
  assert.equal(unapproved.start(start).ok, false);
  const fixture = runtime.createProviderAdmissionFixture(configured());
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

test('review regression: approved authority is exact bytes and proof storage survives fixture recreation', () => {
  const ledger = runtime.createScriptedLedger();
  const fixture = runtime.createProviderAdmissionFixture({ manifestBytes: approvedBytes, approval, ledger });
  assert.equal(fixture.approve(approval).ok, true);
  assert.equal(
    runtime
      .createProviderAdmissionFixture({
        manifestBytes: Buffer.concat([approvedBytes, Buffer.from(' ')]),
        approval,
        ledger,
      })
      .approve(approval).ok,
    false,
  );
  const first = runtime.createProviderAdmissionFixture(configured(ledger));
  const persistedStart = first.start(start);
  assert.equal(persistedStart.ok, true);
  const persistedResult = first.result({
    ...start,
    predecessor: persistedStart.value.digest,
    outcome: 'positive',
    observedAt: 1_100,
  });
  assert.equal(persistedResult.ok, true);
  const recovered = runtime.createProviderAdmissionFixture(configured(ledger));
  const recoveredStart = recovered.start(start);
  assert.deepEqual(recoveredStart, persistedStart, 'exact start bytes replay from protected preflight storage');
  const recoveredResult = recovered.result({
    ...start,
    predecessor: recoveredStart.value.digest,
    outcome: 'positive',
    observedAt: 1_100,
  });
  assert.deepEqual(recoveredResult, persistedResult, 'exact result bytes replay from protected preflight storage');
  assert.equal(
    recovered.admit({
      basis,
      proof: { ...recoveredResult.value, outcome: 'negative' },
      observedAt: 1_200,
      maxAgeMs: 1_000,
    }).ok,
    false,
  );
  assert.equal(recovered.admit({ basis, proof: recoveredResult.value, observedAt: 1_200, maxAgeMs: 1_000 }).ok, true);
  assert.equal(
    recovered.start({ ...start, ordinal: 2, predecessor: recoveredResult.value.digest }).ok,
    false,
    'positive proof consumes the retry chain',
  );
});

test('provider admission: only a system-created protected ledger is admitted and every readback is durable', () => {
  const fakeLedger = {
    preflight: () => ({ ok: true, value: { key: 'forged', digest: '0'.repeat(64), bytes: {}, deadline: 1 } }),
    readPreflight: () => ({ ok: true, value: { kind: 'absent' } }),
  };
  for (const ledger of [fakeLedger, new Proxy(runtime.createScriptedLedger(), {})]) {
    const fixture = runtime.createProviderAdmissionFixture({ manifestBytes: approvedBytes, approval, ledger });
    assert.equal(fixture.start(start).ok, false);
    assert.equal(fixture.readback({ basis, ordinal: 1, variant: 'start' }).ok, false);
  }

  const ledger = runtime.createScriptedLedger();
  const fixture = runtime.createProviderAdmissionFixture(configured(ledger));
  assert.deepEqual(fixture.readback({ basis, ordinal: 1, variant: 'start' }), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'ATTEMPT_ABSENT' },
  });
  const committed = fixture.start(start);
  assert.equal(committed.ok, true);
  const read = fixture.readback({ basis, ordinal: 1, variant: 'start' });
  assert.deepEqual(read, committed);
  assert.throws(() => {
    read.value.deadline = 1;
  }, TypeError);
  assert.deepEqual(fixture.readback({ basis, ordinal: 1, variant: 'start' }), committed);
});

test('provider admission: durable lineage preserves retry bound, time order, terminal consumption, and fresh recovery', () => {
  const ledger = runtime.createScriptedLedger();
  const first = runtime.createProviderAdmissionFixture(configured(ledger));
  const started = first.start(start);
  assert.equal(started.ok, true);
  const negative = first.result({
    ...start,
    predecessor: started.value.digest,
    outcome: 'negative',
    observedAt: 1_100,
  });
  assert.equal(negative.ok, true);

  const recovered = runtime.createProviderAdmissionFixture(configured(ledger));
  assert.deepEqual(recovered.readback({ basis, ordinal: 1, variant: 'result' }), negative);
  assert.equal(
    recovered.start({ ...start, ordinal: 2, predecessor: negative.value.digest, retryLimit: 3, observedAt: 1_101 }).ok,
    false,
    'a successor cannot widen its original retry limit',
  );
  assert.equal(
    recovered.start({ ...start, ordinal: 2, predecessor: negative.value.digest, observedAt: 1_099 }).ok,
    false,
    'a successor cannot observe before its terminal predecessor',
  );
  const second = recovered.start({ ...start, ordinal: 2, predecessor: negative.value.digest, observedAt: 1_101 });
  assert.equal(second.ok, true);
  assert.equal(
    recovered.result({ ...start, ordinal: 2, predecessor: second.value.digest, outcome: 'positive', observedAt: 1_100 })
      .ok,
    false,
    'a result cannot observe before its start',
  );

  for (const outcome of ['positive', 'exhausted']) {
    const terminalLedger = runtime.createScriptedLedger();
    const terminal = runtime.createProviderAdmissionFixture(configured(terminalLedger));
    const opened = terminal.start(start);
    assert.equal(opened.ok, true);
    const closed = terminal.result({ ...start, predecessor: opened.value.digest, outcome, observedAt: 1_100 });
    assert.equal(closed.ok, true);
    const fresh = runtime.createProviderAdmissionFixture(configured(terminalLedger));
    assert.equal(
      fresh.start({ ...start, ordinal: 2, predecessor: closed.value.digest, observedAt: 1_101 }).ok,
      false,
      outcome,
    );
  }
});
