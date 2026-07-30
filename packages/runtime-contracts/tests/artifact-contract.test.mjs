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
  temporary: { holder: 'SCH-EVIDENCE', tuple: 'event/1' },
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
    store.adopt({ ...base, holder: put.holder, operation: put.operation, mode: put.mode, pins, fact: result.value }),
    {
      ok: false,
      error: { family: 'FC-TRUST', code: 'WITNESS_ABSENT' },
    },
  );
  assert.equal(fixtureStore.witness.advance(result.value).ok, true);
  assert.equal(
    store.adopt({ ...base, holder: put.holder, operation: put.operation, mode: put.mode, pins, fact: result.value }).ok,
    true,
  );
  const release = store.release({
    ...base,
    holder: put.holder,
    operation: 'op-2',
    mode: 'release-pin',
    pin: pins.temporary.tuple,
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
    store.adopt({ ...base, holder: put.holder, operation: put.operation, mode: put.mode, pins, fact: written.value })
      .ok,
    true,
  );
  const lost = store.release(
    { ...base, holder: put.holder, operation: 'op-2', mode: 'release-pin', pin: pins.temporary.tuple },
    'lost-ack',
  );
  assert.equal(lost.ok, false);
  assert.equal(
    store.release({ ...base, holder: put.holder, operation: 'op-2', mode: 'release-pin', pin: pins.temporary.tuple })
      .ok,
    false,
  );
  const reconciled = store.reconcile({
    ...base,
    holder: put.holder,
    operation: 'op-2',
    mode: 'release-pin',
    pin: pins.temporary.tuple,
  });
  assert.equal(reconciled.ok, true);
  assert.equal(
    store.reconcile({ ...base, holder: put.holder, operation: 'op-2', mode: 'release-pin', pin: pins.intended.tuple })
      .ok,
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
    true,
  );
});
