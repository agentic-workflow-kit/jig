import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const provider = await import('../dist/index.js');
const routing = JSON.parse(readFileSync(resolve(import.meta.dirname, './fixtures/local-file-artifact-routing.json')));
const zero = '0'.repeat(64);
const bytes = new TextEncoder().encode('immutable artifact bytes');
const artifactDigest = createHash('sha256').update(bytes).digest('hex');
const scope = 'resource/artifact-local/v1';
const pins = Object.freeze({
  temporary: { holder: 'EV-ARTIFACT-FACT', tuple: 'event/artifact/1' },
  intended: { holder: 'SCH-EVIDENCE', tuple: 'evidence/holder/1' },
});
const base = Object.freeze({
  resourceScope: scope,
  subject: 'artifact/one',
  digest: artifactDigest,
  fence: 'fence/one',
});
const put = Object.freeze({
  ...base,
  holder: 'SCH-EVIDENCE',
  operation: 'operation/put/one',
  mode: 'put',
  bytes,
  pins,
});
const disposalFacts = Object.freeze({
  owner: 'owner/one',
  settlement: 'settled',
  preservation: 'preserved',
  retention: 'expired',
  obligations: 'none',
});

function harness(t) {
  const root = mkdtempSync(join(tmpdir(), 'jig-artifact-provider-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  let currency = { position: -1, headDigest: zero, protectedPosition: -1, protectedHead: zero };
  const intents = new Set();
  const options = {
    protectedRoot: join(root, 'protected'),
    disposableRoot: join(root, 'disposable'),
    resourceScope: scope,
    witness: { read: () => currency },
    intent: { recorded: (operation, mode) => intents.has(`${operation}/${mode}`) },
  };
  const created = provider.createLocalFileArtifactConformanceOracle(options);
  assert.equal(created.ok, true);
  return {
    root,
    options,
    store: created.value,
    authorize(operation, mode) {
      intents.add(`${operation}/${mode}`);
    },
    sync(store = created.value) {
      currency = structuredClone(store.snapshot().state.currency);
    },
    setCurrency(value) {
      currency = value;
    },
  };
}

function registration(request = put) {
  return JSON.stringify({
    resourceScope: request.resourceScope,
    subject: request.subject,
    digest: request.digest,
    fence: request.fence,
    holder: request.holder,
    putOperation: request.operation,
    pins: request.pins,
  });
}

function proof(role, fact, request = put) {
  const pin = request.pins[role];
  const basis = {
    transition: `transition/${role}/${fact.position}`,
    registration: registration(request),
    role,
    holder: pin.holder,
    tuple: pin.tuple,
    subject: request.subject,
    fence: request.fence,
    fact,
  };
  return { ...basis, digest: createHash('sha256').update(JSON.stringify(basis)).digest('hex') };
}

function adoption(fact, request = put) {
  return {
    ...base,
    holder: request.holder,
    operation: request.operation,
    mode: 'put',
    putOperation: request.operation,
    pins: request.pins,
    fact,
    proof: proof('temporary', fact, request),
  };
}

function retirement(fact, request = put) {
  return {
    ...base,
    holder: request.holder,
    operation: request.operation,
    mode: 'put',
    putOperation: request.operation,
    pins: request.pins,
    fact,
    proof: proof('intended', fact, request),
  };
}

function release(operation, pin) {
  return {
    ...base,
    holder: put.holder,
    operation,
    mode: 'release-pin',
    pin,
    putOperation: put.operation,
    pins,
  };
}

function dispose(operation = 'operation/dispose/one') {
  return {
    ...base,
    holder: put.holder,
    operation,
    mode: 'dispose-bytes',
    facts: disposalFacts,
    putOperation: put.operation,
    pins,
  };
}

test('selected manifest and mechanism bounds are exact and construction remains unavailable', () => {
  assert.equal(
    createHash('sha256').update(provider.LOCAL_FILE_ARTIFACT_MANIFEST).digest('hex'),
    '7381945e9ecb91a1e80b6a9f1fba8e6829590bc0ee6f7df3510fc81273304c1f',
  );
  assert.equal(
    provider.LOCAL_FILE_ARTIFACT_MANIFEST_DIGEST,
    '7381945e9ecb91a1e80b6a9f1fba8e6829590bc0ee6f7df3510fc81273304c1f',
  );
  assert.equal(provider.ARTIFACT_WAIT_DEFAULT_MS, 900_000);
  assert.deepEqual([provider.ARTIFACT_WAIT_MIN_MS, provider.ARTIFACT_WAIT_MAX_MS], [5_000, 7_200_000]);
  assert.deepEqual(
    [provider.ARTIFACT_RETRY_MIN, provider.ARTIFACT_RETRY_DEFAULT, provider.ARTIFACT_RETRY_MAX],
    [1, 3, 5],
  );
  assert.deepEqual(
    [
      provider.ARTIFACT_WITNESS_WAIT_MIN_MS,
      provider.ARTIFACT_WITNESS_WAIT_DEFAULT_MS,
      provider.ARTIFACT_WITNESS_WAIT_MAX_MS,
    ],
    [1_000, 30_000, 300_000],
  );
  assert.deepEqual(
    [provider.ARTIFACT_RECOVERY_MIN, provider.ARTIFACT_RECOVERY_DEFAULT, provider.ARTIFACT_RECOVERY_MAX],
    [1, 3, 5],
  );
  assert.deepEqual(provider.createQualifiedLocalFileArtifactProvider(), {
    ok: false,
    error: { family: 'FC-MECHANISM', code: 'PROVIDER_UNAVAILABLE_UNQUALIFIED_WITNESS' },
  });
  for (const forbidden of ['advanceWitness', 'writeLedger', 'writeRegistry', 'configureProvider'])
    assert.equal(forbidden in provider, false);
});

test('five protected and six disposable holders route to physically disjoint roots', (t) => {
  const fixture = harness(t);
  for (const holder of routing.protected)
    assert.deepEqual(fixture.store.contextFor(holder), { ok: true, value: 'protected' });
  for (const holder of routing.disposable)
    assert.deepEqual(fixture.store.contextFor(holder), { ok: true, value: 'disposable' });
  assert.notEqual(fixture.store.roots.protected, fixture.store.roots.disposable);
  assert.equal(fixture.store.contextFor('SCH-UNKNOWN').ok, false);

  const protectedPut = {
    ...base,
    holder: 'SCH-CONFIG-ARTIFACT',
    operation: 'operation/protected/one',
    mode: 'put',
    bytes,
  };
  fixture.authorize(protectedPut.operation, protectedPut.mode);
  assert.equal(fixture.store.putProtected(protectedPut).ok, true);
  fixture.sync();
  assert.deepEqual(
    fixture.store.getProtected({
      ...base,
      holder: protectedPut.holder,
      operation: 'operation/read/protected',
      mode: 'get',
    }),
    { ok: true, value: { bytes, digest: artifactDigest } },
  );

  fixture.authorize(put.operation, put.mode);
  assert.equal(fixture.store.putDisposable(put).ok, true);
  assert.equal(existsSync(join(fixture.store.roots.protected, `${artifactDigest}.artifact`)), true);
  assert.equal(existsSync(join(fixture.store.roots.disposable, `${artifactDigest}.artifact`)), true);
  assert.equal(fixture.store.putProtected({ ...protectedPut, holder: 'SCH-EVIDENCE' }).ok, false);
  assert.equal(fixture.store.putDisposable({ ...put, holder: 'SCH-CONFIG-ARTIFACT' }).ok, false);
});

test('physical put, get, two-pin retirement, release and guarded disposal preserve ordering', (t) => {
  const fixture = harness(t);
  assert.deepEqual(fixture.store.putDisposable(put), {
    ok: false,
    error: { family: 'FC-AUTHORITY', code: 'DURABLE_INTENT_REQUIRED' },
  });
  fixture.authorize(put.operation, put.mode);
  assert.deepEqual(fixture.store.putDisposable(put, 'crash-before-effect'), {
    ok: false,
    error: { family: 'FC-MECHANISM', code: 'PROVED_ABSENT_BEFORE_EFFECT' },
  });
  assert.equal(existsSync(join(fixture.store.roots.disposable, `${artifactDigest}.artifact`)), false);
  const written = fixture.store.putDisposable(put);
  assert.equal(written.ok, true);
  assert.deepEqual(fixture.store.adopt(adoption(written.value)), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'WITNESS_NOT_CURRENT' },
  });
  fixture.sync();
  assert.equal(fixture.store.adopt(adoption(written.value)).ok, true);
  assert.deepEqual(
    fixture.store.get({
      ...base,
      holder: put.holder,
      operation: 'operation/get/one',
      mode: 'get',
      putOperation: put.operation,
      pins,
    }),
    { ok: true, value: { bytes, digest: artifactDigest } },
  );

  const temporaryRelease = release('operation/release/temporary', pins.temporary.tuple);
  fixture.authorize(temporaryRelease.operation, temporaryRelease.mode);
  const first = fixture.store.release(temporaryRelease);
  assert.equal(first.ok, true);
  fixture.sync();
  assert.equal(fixture.store.acknowledge(first.value).ok, true);
  assert.equal(fixture.store.retire(retirement(first.value)).ok, true);

  const intendedRelease = release('operation/release/intended', pins.intended.tuple);
  fixture.authorize(intendedRelease.operation, intendedRelease.mode);
  const second = fixture.store.release(intendedRelease);
  assert.equal(second.ok, true);
  fixture.sync();
  assert.equal(
    existsSync(join(fixture.store.roots.disposable, `${artifactDigest}.artifact`)),
    true,
    'release is not deletion',
  );
  const disposal = dispose();
  assert.deepEqual(fixture.store.dispose(disposal), {
    ok: false,
    error: { family: 'FC-AUTHORITY', code: 'DURABLE_INTENT_REQUIRED' },
  });
  fixture.authorize(disposal.operation, disposal.mode);
  const removed = fixture.store.dispose(disposal);
  assert.equal(removed.ok, true);
  fixture.sync();
  assert.equal(fixture.store.acknowledge(removed.value).ok, true);
  assert.equal(existsSync(join(fixture.store.roots.disposable, `${artifactDigest}.artifact`)), false);
  assert.equal(existsSync(join(fixture.store.roots.protected, `${artifactDigest}.artifact`)), false);
});

test('lost acknowledgements never replay effects and reconcile only the exact operation binding', (t) => {
  const fixture = harness(t);
  fixture.authorize(put.operation, put.mode);
  assert.deepEqual(fixture.store.putDisposable(put, 'lost-ack'), {
    ok: false,
    error: { family: 'FC-EFFECT', code: 'ACK_LOST_RECONCILE_REQUIRED' },
  });
  assert.equal(fixture.store.putDisposable(put).ok, false);
  const recoveredPut = fixture.store.reconcile(put);
  assert.equal(recoveredPut.ok, true);
  assert.equal(recoveredPut.value.mode, 'put');
  assert.equal(fixture.store.reconcile({ ...put, fence: 'fence/substituted' }).ok, false);
  fixture.sync();
  assert.equal(fixture.store.acknowledge(recoveredPut.value).ok, true);
  assert.equal(fixture.store.adopt(adoption(recoveredPut.value)).ok, true);

  const temporaryRelease = release('operation/release/lost', pins.temporary.tuple);
  fixture.authorize(temporaryRelease.operation, temporaryRelease.mode);
  assert.equal(fixture.store.release(temporaryRelease, 'lost-ack').ok, false);
  assert.equal(fixture.store.release(temporaryRelease).ok, false);
  const recoveredRelease = fixture.store.reconcile(temporaryRelease);
  assert.equal(recoveredRelease.ok, true);
  assert.equal(fixture.store.reconcile({ ...temporaryRelease, pin: pins.intended.tuple }).ok, false);
  fixture.sync();
  assert.equal(fixture.store.acknowledge(recoveredRelease.value).ok, true);
});

test('disposal requires complete policy facts, current witness and zero live pins', (t) => {
  const fixture = harness(t);
  fixture.authorize(put.operation, put.mode);
  const written = fixture.store.putDisposable(put);
  assert.equal(written.ok, true);
  fixture.sync();
  assert.equal(fixture.store.adopt(adoption(written.value)).ok, true);
  const disposal = dispose('operation/dispose/guarded');
  fixture.authorize(disposal.operation, disposal.mode);
  assert.equal(fixture.store.dispose(disposal).ok, false, 'the intended pin is still live');
  for (const facts of [
    { ...disposalFacts, settlement: 'open' },
    { ...disposalFacts, preservation: 'missing' },
    { ...disposalFacts, retention: 'active' },
    { ...disposalFacts, obligations: 'open' },
    { ...disposalFacts, owner: '' },
  ])
    assert.equal(fixture.store.dispose({ ...disposal, facts }).ok, false);
  assert.equal(fixture.store.dispose({ ...disposal, holder: 'SCH-CONFIG-ARTIFACT' }).ok, false);
});

test('restore is bound to physical bytes, exact snapshot chain and independent currency', (t) => {
  const fixture = harness(t);
  fixture.authorize(put.operation, put.mode);
  const written = fixture.store.putDisposable(put);
  assert.equal(written.ok, true);
  fixture.sync();
  const snapshot = fixture.store.snapshot();
  const restored = provider.restoreLocalFileArtifactConformanceOracle(fixture.options, snapshot);
  assert.equal(restored.ok, true);
  assert.equal(
    restored.value.get({
      ...base,
      holder: put.holder,
      operation: 'operation/get/restored',
      mode: 'get',
      putOperation: put.operation,
      pins,
    }).ok,
    true,
  );

  const stale = { ...snapshot.state.currency, position: snapshot.state.currency.position - 1 };
  fixture.setCurrency(stale);
  assert.deepEqual(provider.restoreLocalFileArtifactConformanceOracle(fixture.options, snapshot), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'RECOVERY_HEAD_MISMATCH' },
  });
  fixture.setCurrency(snapshot.state.currency);
  const tampered = structuredClone(snapshot);
  tampered.state.operations[0][1].fact.position = 7;
  assert.equal(provider.restoreLocalFileArtifactConformanceOracle(fixture.options, tampered).ok, false);
  writeFileSync(join(fixture.store.roots.disposable, `${artifactDigest}.artifact`), 'tampered');
  assert.deepEqual(provider.restoreLocalFileArtifactConformanceOracle(fixture.options, snapshot), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'RESTORED_ARTIFACT_MISMATCH' },
  });
});

test('hostile, cross-scope, cross-subject, cross-holder and unsafe file inputs fail closed', (t) => {
  const fixture = harness(t);
  fixture.authorize(put.operation, put.mode);
  for (const invalid of [
    { ...put, resourceScope: 'resource/other' },
    { ...put, holder: 'SCH-CONFIG-ARTIFACT' },
    { ...put, digest: zero },
    { ...put, bytes: new TextEncoder().encode('api_key=forbidden') },
    { ...put, bytes: new Uint8Array(65_537) },
    { ...put, pins: { temporary: pins.temporary } },
    { ...put, pins: { ...pins, intended: { ...pins.intended, holder: 'SCH-VERDICT' } } },
    { ...put, pins: { temporary: pins.temporary, intended: { ...pins.intended, tuple: pins.temporary.tuple } } },
  ])
    assert.equal(fixture.store.putDisposable(invalid).ok, false);
  assert.equal(fixture.store.putDisposable(put).ok, true);
  assert.equal(fixture.store.putDisposable({ ...put, subject: 'artifact/two' }).ok, false);
  const hostile = new Proxy(
    {},
    {
      ownKeys: () => {
        throw new Error('hostile');
      },
    },
  );
  assert.equal(fixture.store.putDisposable(hostile).ok, false);
  assert.equal(fixture.store.reconcile(hostile).ok, false);

  const unsafeRoot = join(fixture.root, 'unsafe-root');
  symlinkSync(fixture.store.roots.protected, unsafeRoot);
  assert.equal(
    provider.createLocalFileArtifactConformanceOracle({ ...fixture.options, protectedRoot: unsafeRoot }).ok,
    false,
  );
  assert.equal(
    provider.createLocalFileArtifactConformanceOracle({
      ...fixture.options,
      disposableRoot: fixture.store.roots.protected,
    }).ok,
    false,
  );
  assert.equal(
    provider.createLocalFileArtifactConformanceOracle({
      ...fixture.options,
      protectedRoot: provider.LOCAL_FILE_ARTIFACT_ROOTS.protected,
    }).ok,
    false,
  );
});

test('a current fact from another registration cannot retire either exact pin', (t) => {
  const fixture = harness(t);
  fixture.authorize(put.operation, put.mode);
  const first = fixture.store.putDisposable(put);
  assert.equal(first.ok, true);
  const other = { ...put, subject: 'artifact/two', operation: 'operation/put/two' };
  fixture.authorize(other.operation, other.mode);
  const second = fixture.store.putDisposable(other);
  assert.equal(second.ok, true);
  fixture.sync();
  assert.equal(
    fixture.store.adopt({
      ...adoption(second.value, other),
      ...base,
      fact: second.value,
      proof: proof('temporary', second.value, other),
    }).ok,
    false,
  );
});
