import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const artifact = await import('../dist/artifact.js');
const fixture = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/artifact-contract-oracle.json'), 'utf8'),
);
const bytes = new TextEncoder().encode(fixture.bytes);
const op = 'op-1';
const tuples = Object.freeze({ temporary: 'event/1', intended: 'holder/1' });
const facts = Object.freeze({
  owner: 'owner/1',
  settlement: 'settled',
  preservation: 'preserved',
  retention: 'expired',
  obligations: 'none',
});

test('GF-013: all eleven holder classes route to isolated fixed contexts', () => {
  const store = artifact.createScriptedArtifactStore({ resourceScope: fixture.resource_scope });
  for (const holder of fixture.protected_holders)
    assert.deepEqual(store.contextFor(holder), { ok: true, value: 'protected' });
  for (const holder of fixture.disposable_holders)
    assert.deepEqual(store.contextFor(holder), { ok: true, value: 'disposable' });
  assert.deepEqual(store.contextFor('unknown'), {
    ok: false,
    error: { family: 'FC-SUBJECT', code: 'UNKNOWN_HOLDER_CLASS' },
  });
  assert.equal(store.protectedContext === store.disposableContext, false);
  assert.deepEqual(store.moveProtected('configuration'), {
    ok: false,
    error: { family: 'FC-AUTHORITY', code: 'PROTECTED_CONTEXT' },
  });
  assert.deepEqual(store.aliasProtected('configuration'), {
    ok: false,
    error: { family: 'FC-AUTHORITY', code: 'PROTECTED_CONTEXT' },
  });
  assert.deepEqual(store.disposeProtected('configuration'), {
    ok: false,
    error: { family: 'FC-AUTHORITY', code: 'PROTECTED_CONTEXT' },
  });
});

test('GF-013: immutable SHA-256 put/get and protected copies do not alias', () => {
  const store = artifact.createScriptedArtifactStore({ resourceScope: fixture.resource_scope });
  const protectedPut = store.putProtected({ holder: 'configuration', bytes, digest: fixture.digest });
  assert.equal(protectedPut.ok, true);
  const read = store.get({ holder: 'configuration', digest: fixture.digest });
  assert.equal(read.ok, true);
  assert.deepEqual(read.value.bytes, bytes);
  assert.notEqual(read.value.bytes, bytes);
  assert.equal(store.putProtected({ holder: 'configuration', bytes, digest: fixture.digest }).ok, true);
});

test('GF-013: disposable put requires an exact two-pin set and flushes before its fact', () => {
  const store = artifact.createScriptedArtifactStore({ resourceScope: fixture.resource_scope });
  for (const pins of [
    { temporary: tuples.temporary },
    { intended: tuples.intended },
    { temporary: tuples.temporary, intended: tuples.intended, extra: 'x' },
  ]) {
    assert.deepEqual(
      store.putDisposable({ holder: 'work-product', operation: op, bytes, digest: fixture.digest, pins }),
      {
        ok: false,
        error: { family: 'FC-EVIDENCE', code: 'EXACT_TWO_PIN_REQUIRED' },
      },
    );
  }
  const put = store.putDisposable({
    holder: 'work-product',
    operation: op,
    bytes,
    digest: fixture.digest,
    pins: tuples,
  });
  assert.equal(put.ok, true);
  assert.equal(put.value.position, 0);
  assert.equal(store.adopt({ holder: 'work-product', digest: fixture.digest, pins: tuples }), true);
  assert.deepEqual(store.lookup(fixture.digest), { temporary: tuples.temporary, intended: tuples.intended });
  const adoptedRelease = store.release({ holder: 'work-product', digest: fixture.digest, pin: tuples.temporary });
  assert.equal(adoptedRelease.ok, true);
  assert.deepEqual(store.release({ holder: 'work-product', digest: fixture.digest, pin: tuples.intended }), {
    ok: false,
    error: { family: 'FC-AUTHORITY', code: 'RELEASE_NOT_RETIRED' },
  });
  assert.deepEqual(store.acknowledge(adoptedRelease.value), { ok: true, value: undefined });
});

test('GF-013: rejection retires both before release, release cannot delete, and deletion is fully guarded', () => {
  const store = artifact.createScriptedArtifactStore({ resourceScope: fixture.resource_scope });
  const put = store.putDisposable({
    holder: 'audit-evidence',
    operation: op,
    bytes,
    digest: fixture.digest,
    pins: tuples,
  });
  assert.equal(put.ok, true);
  assert.equal(store.reject({ holder: 'audit-evidence', digest: fixture.digest, pins: tuples }), true);
  const release = store.dispose({
    holder: 'audit-evidence',
    operation: 'op-2',
    digest: fixture.digest,
    mode: 'release-pin',
    pin: tuples.temporary,
  });
  assert.equal(release.ok, true);
  assert.equal(store.get({ holder: 'audit-evidence', digest: fixture.digest }).ok, true);
  assert.deepEqual(
    store.dispose({
      holder: 'audit-evidence',
      operation: 'op-3',
      digest: fixture.digest,
      mode: 'dispose-bytes',
      facts: {},
    }),
    {
      ok: false,
      error: { family: 'FC-AUTHORITY', code: 'DISPOSAL_GUARDS_REQUIRED' },
    },
  );
  assert.equal(
    store.dispose({ holder: 'audit-evidence', operation: 'op-3', digest: fixture.digest, mode: 'dispose-bytes', facts })
      .ok,
    false,
  );
  const finalRelease = store.release({ holder: 'audit-evidence', digest: fixture.digest, pin: tuples.intended });
  assert.equal(finalRelease.ok, true);
  assert.equal(store.acknowledge(finalRelease.value).ok, true);
  const deleted = store.dispose({
    holder: 'audit-evidence',
    operation: 'op-4',
    digest: fixture.digest,
    mode: 'dispose-bytes',
    facts,
  });
  assert.equal(deleted.ok, true);
  assert.equal(store.get({ holder: 'audit-evidence', digest: fixture.digest }).ok, false);
});

test('GF-013: crash, lost acknowledgement, absence, uncertainty and restore trust all preserve or stop', () => {
  for (const fault of ['after-flush', 'lost-ack']) {
    const store = artifact.createScriptedArtifactStore({ resourceScope: fixture.resource_scope });
    const put = store.putDisposable(
      { holder: 'review-record', operation: op, bytes, digest: fixture.digest, pins: tuples },
      fault,
    );
    assert.deepEqual(put, { ok: false, error: { family: 'FC-TRUST', code: 'ACK_LOST' } });
    assert.equal(store.reconcile({ operation: op, mode: 'put' }).ok, true);
  }
  const store = artifact.createScriptedArtifactStore({ resourceScope: fixture.resource_scope });
  assert.deepEqual(store.reconcile({ operation: op, mode: 'put' }), { ok: true, value: { kind: 'absent' } });
  assert.deepEqual(store.restore(), { ok: false, error: { family: 'FC-TRUST', code: 'WITNESS_ABSENT' } });
  const put = store.putDisposable({
    holder: 'review-record',
    operation: op,
    bytes,
    digest: fixture.digest,
    pins: tuples,
  });
  assert.equal(put.ok, true);
  assert.equal(store.acknowledge(put.value).ok, true);
  for (const fault of ['behind', 'fork', 'rollback', 'missing']) {
    assert.equal(store.injectFault(fault).ok, true);
    assert.equal(store.restore().ok, false, fault);
  }
});

test('GF-013: hostile input fails closed without executing raw bytes getters', () => {
  const store = artifact.createScriptedArtifactStore({ resourceScope: fixture.resource_scope });
  let reads = 0;
  const hostile = new Proxy(
    {},
    {
      get() {
        reads += 1;
        throw new Error('raw getter');
      },
    },
  );
  assert.doesNotThrow(() => store.putProtected(hostile));
  assert.equal(store.putProtected(hostile).ok, false);
  assert.equal(reads, 0);
  assert.equal(
    store.putProtected({ holder: 'configuration', bytes: new Uint8Array(1_048_577), digest: fixture.digest }).ok,
    false,
  );
  assert.equal(store.putProtected({ holder: 'configuration', bytes, digest: fixture.digest.toUpperCase() }).ok, false);
  assert.equal(
    store.putProtected({
      holder: 'configuration',
      bytes: new TextEncoder().encode('secret=abc'),
      digest: fixture.digest,
    }).ok,
    false,
  );
});
