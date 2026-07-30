import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const artifact = await import('../dist/artifact.js');
const fixture = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/artifact-contract-oracle.json'), 'utf8'),
);
const bytes = new TextEncoder().encode(fixture.bytes);
const base = Object.freeze({
  resourceScope: fixture.resource_scope,
  subject: 'artifact/one',
  digest: fixture.digest,
  fence: 'fence/1',
});
const pins = Object.freeze({
  temporary: { holder: 'EV-ARTIFACT-FACT', tuple: 'event/1' },
  intended: { holder: 'SCH-EVIDENCE', tuple: 'holder/1' },
});
const put = Object.freeze({ ...base, holder: 'SCH-EVIDENCE', operation: 'op-1', mode: 'put', bytes, pins });
const facts = Object.freeze({
  owner: 'owner/1',
  settlement: 'settled',
  preservation: 'preserved',
  retention: 'expired',
  obligations: 'none',
});

test('GF-013 R01: exact governing holder matrix and fixed CB-STORE binding fail closed', () => {
  const store = artifact.createScriptedArtifactStore();
  assert.equal(store.resourceScope, fixture.resource_scope);
  for (const holder of fixture.protected_holders)
    assert.deepEqual(store.contextFor(holder), { ok: true, value: 'protected' });
  for (const holder of fixture.disposable_holders)
    assert.deepEqual(store.contextFor(holder), { ok: true, value: 'disposable' });
  assert.equal(store.putDisposable(put).ok, true);
  assert.equal(
    store.putDisposable({ ...put, operation: 'op-digest', bytes: new TextEncoder().encode('different bytes') }).ok,
    false,
  );
  for (const request of [
    { ...put, resourceScope: 'other' },
    { ...put, subject: 'artifact/two' },
    { ...put, fence: 'fence/2' },
    { ...put, holder: 'SCH-ENVELOPE' },
    { ...put, pins: { temporary: pins.temporary } },
    { ...put, pins: { temporary: { ...pins.temporary, holder: 'SCH-AUDIT-EXPORT' }, intended: pins.intended } },
  ])
    assert.equal(store.putDisposable(request).ok, false);
  assert.equal(
    store.putProtected({ ...base, holder: 'SCH-CONFIG-ARTIFACT', operation: 'p-1', mode: 'put', bytes }).ok,
    true,
  );
  assert.equal(store.putProtected({ ...base, holder: 'SCH-EVIDENCE', operation: 'p-2', mode: 'put', bytes }).ok, false);
  assert.equal(store.putDisposable({ ...put, bytes: new Uint8Array(bytes), fence: 'fence/2' }).ok, false);
});

test('GF-013 R02: only external fixture witness gates adoption and release acknowledgement', () => {
  const fixtureStore = artifact.createScriptedArtifactFixture();
  const store = fixtureStore.store;
  assert.equal('advanceWitness' in store, false);
  const result = store.putDisposable(put);
  assert.equal(result.ok, true);
  assert.deepEqual(
    store.adopt({
      ...base,
      holder: put.holder,
      operation: put.operation,
      mode: put.mode,
      putOperation: put.operation,
      pins,
      fact: result.value,
    }),
    {
      ok: false,
      error: { family: 'FC-TRUST', code: 'WITNESS_NOT_CURRENT' },
    },
  );
  assert.equal(fixtureStore.witness.advance(result.value).ok, true);
  assert.equal(
    store.adopt({
      ...base,
      holder: put.holder,
      operation: put.operation,
      mode: put.mode,
      putOperation: put.operation,
      pins,
      fact: result.value,
    }).ok,
    true,
  );
  const release = store.release({
    ...base,
    holder: put.holder,
    operation: 'op-2',
    mode: 'release-pin',
    pin: pins.temporary.tuple,
    putOperation: put.operation,
    pins,
  });
  assert.equal(release.ok, true);
  assert.equal(store.acknowledge(release.value).ok, false);
  assert.equal(fixtureStore.witness.advance(release.value).ok, true);
  assert.equal(store.acknowledge(release.value).ok, true);
});

test('GF-013 R03: reconciliation is full-binding and uncertain disposal preserves then blocks', () => {
  const fixtureStore = artifact.createScriptedArtifactFixture();
  const store = fixtureStore.store;
  const written = store.putDisposable(put);
  assert.equal(written.ok, true);
  assert.equal(fixtureStore.witness.advance(written.value).ok, true);
  assert.equal(
    store.adopt({
      ...base,
      holder: put.holder,
      operation: put.operation,
      mode: put.mode,
      putOperation: put.operation,
      pins,
      fact: written.value,
    }).ok,
    true,
  );
  const lost = store.release(
    {
      ...base,
      holder: put.holder,
      operation: 'op-2',
      mode: 'release-pin',
      pin: pins.temporary.tuple,
      putOperation: put.operation,
      pins,
    },
    'lost-ack',
  );
  assert.equal(lost.ok, false);
  assert.equal(
    store.release({
      ...base,
      holder: put.holder,
      operation: 'op-2',
      mode: 'release-pin',
      pin: pins.temporary.tuple,
      putOperation: put.operation,
      pins,
    }).ok,
    false,
  );
  const reconciled = store.reconcile({
    ...base,
    holder: put.holder,
    operation: 'op-2',
    mode: 'release-pin',
    pin: pins.temporary.tuple,
    putOperation: put.operation,
    pins,
  });
  assert.equal(reconciled.ok, true);
  assert.equal(
    store.reconcile({
      ...base,
      holder: put.holder,
      operation: 'op-2',
      mode: 'release-pin',
      pin: pins.intended.tuple,
      putOperation: put.operation,
      pins,
    }).ok,
    false,
  );
  assert.equal(
    store.dispose({ ...base, holder: put.holder, operation: 'op-3', mode: 'dispose-bytes', facts }, 'lost-ack').ok,
    false,
  );
  assert.equal(
    store.dispose({ ...base, holder: put.holder, operation: 'op-3', mode: 'dispose-bytes', facts }).ok,
    false,
  );
  assert.equal(
    store.reconcile({ ...base, holder: put.holder, operation: 'op-3', mode: 'dispose-bytes', facts }).ok,
    false,
  );
});

test('GF-013 R03/R04: read-only get, exact two-pin release, and guarded deletion are witnessed', () => {
  const fixtureStore = artifact.createScriptedArtifactFixture();
  const store = fixtureStore.store;
  const written = store.putDisposable(put);
  assert.equal(written.ok, true);
  assert.equal(fixtureStore.witness.advance(written.value).ok, true);
  const registration = { putOperation: put.operation, pins };
  assert.equal(store.get({ ...base, holder: put.holder, operation: 'read-1', mode: 'get', ...registration }).ok, true);
  assert.equal(store.get({ ...base, holder: put.holder, operation: 'read-1', mode: 'get', ...registration }).ok, true);
  assert.equal(
    store.release({
      ...base,
      holder: put.holder,
      operation: 'blocked',
      mode: 'release-pin',
      pin: pins.temporary.tuple,
      ...registration,
    }).ok,
    false,
  );
  assert.equal(
    store.adopt({
      ...base,
      holder: put.holder,
      operation: put.operation,
      mode: 'put',
      fact: written.value,
      ...registration,
    }).ok,
    true,
  );
  const first = store.release({
    ...base,
    holder: put.holder,
    operation: 'release-1',
    mode: 'release-pin',
    pin: pins.temporary.tuple,
    ...registration,
  });
  assert.equal(first.ok, true);
  assert.equal(fixtureStore.witness.advance(first.value).ok, true);
  assert.equal(
    store.retire({
      ...base,
      holder: put.holder,
      operation: put.operation,
      mode: 'put',
      fact: first.value,
      ...registration,
    }).ok,
    true,
  );
  const second = store.release({
    ...base,
    holder: put.holder,
    operation: 'release-2',
    mode: 'release-pin',
    pin: pins.intended.tuple,
    ...registration,
  });
  assert.equal(second.ok, true);
  assert.equal(fixtureStore.witness.advance(second.value).ok, true);
  const disposed = store.dispose({
    ...base,
    holder: put.holder,
    operation: 'dispose-1',
    mode: 'dispose-bytes',
    facts,
    ...registration,
  });
  assert.equal(disposed.ok, true);
  assert.equal(fixtureStore.witness.advance(disposed.value).ok, true);
  assert.deepEqual(store.get({ ...base, holder: put.holder, operation: 'read-2', mode: 'get', ...registration }), {
    ok: false,
    error: { family: 'FC-EVIDENCE', code: 'ARTIFACT_ABSENT' },
  });
});

test('GF-013 R05: hostile containers, unsafe bytes, and recovery mismatch fail closed', () => {
  const store = artifact.createScriptedArtifactFixture().store;
  assert.equal(store.putDisposable({ ...put, bytes: new Uint8Array(65_537) }).ok, false);
  assert.equal(store.putDisposable({ ...put, bytes: new TextEncoder().encode('api_key=forbidden') }).ok, false);
  const hostile = new Proxy(
    {},
    {
      ownKeys() {
        throw new Error('hostile');
      },
    },
  );
  assert.equal(store.reconcile(hostile).ok, false);
  const fixtureStore = artifact.createScriptedArtifactFixture();
  const written = fixtureStore.store.putDisposable(put);
  assert.equal(written.ok, true);
  assert.equal(fixtureStore.witness.advance(written.value).ok, true);
  const snapshot = fixtureStore.store.snapshot();
  assert.equal(
    artifact.restoreScriptedArtifactFixture(
      snapshot,
      { position: 0, headDigest: fixture.digest },
      { position: 0, headDigest: fixture.digest },
    ).ok,
    false,
  );
});
