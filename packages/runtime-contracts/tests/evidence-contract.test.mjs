import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const artifact = await import('../dist/artifact.js');
const evidence = await import('../dist/evidence.js');
const oracle = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/evidence-contract-oracle.json'), 'utf8'),
);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const bytes = new TextEncoder().encode(oracle.bytes);
const subjects = Object.freeze([
  {
    kind: 'ID-RUN',
    identity: 'run-000000000001-0123456789abcdef',
    claims: ['run-summary'],
  },
  {
    kind: 'ID-STORY',
    identity: 'run-000000000001-0123456789abcdef/story/plan-a',
    claims: ['story-result'],
  },
  {
    kind: oracle.subjectKind,
    identity: oracle.subjectIdentity,
    claims: [oracle.claim],
  },
  {
    kind: 'ID-OP',
    identity: oracle.operation,
    claims: ['artifact-observation'],
  },
  {
    kind: 'ID-TARGET',
    identity: 'target/repository-main',
    claims: ['target-fact'],
  },
]);
const config = Object.freeze({
  subjects,
  principals: [
    {
      principal: oracle.principal,
      sessions: [oracle.session],
    },
  ],
});
const producer = Object.freeze({
  kind: 'principal',
  principal: oracle.principal,
  session: oracle.session,
});
const base = Object.freeze({
  schemaVersion: oracle.evidenceSchemaVersion,
  subject: oracle.evidenceSubject,
  producer,
  providerManifest: null,
  contentType: oracle.contentType,
  contentClass: 'completeness-critical',
  completeness: 'complete',
  contentDigest: oracle.digest,
  bytes,
  redaction: {
    policyVersion: oracle.scanPolicyVersion,
    status: 'source-redacted',
  },
  oversizeBehavior: 'reject',
  retention: oracle.retention,
  artifact: {
    resourceScope: oracle.resourceScope,
    operation: oracle.operation,
    fence: oracle.fence,
    temporaryTuple: oracle.temporaryTuple,
  },
});

function fixture() {
  return evidence.createScriptedEvidenceFixture(config);
}

function artifactProof(prepared, fact, role = 'temporary') {
  const request = prepared.artifactRequest;
  const registration = JSON.stringify({
    resourceScope: request.resourceScope,
    subject: request.subject,
    digest: request.digest,
    fence: request.fence,
    holder: request.holder,
    putOperation: request.operation,
    pins: request.pins,
  });
  const pin = request.pins[role];
  const transition = `transition/evidence/${prepared.key}/${role}`;
  const canonical = JSON.stringify({
    transition,
    registration,
    role,
    holder: pin.holder,
    tuple: pin.tuple,
    subject: request.subject,
    fence: request.fence,
    fact,
  });
  return {
    transition,
    registration,
    role,
    holder: pin.holder,
    tuple: pin.tuple,
    subject: request.subject,
    fence: request.fence,
    fact,
    digest: hash(canonical),
  };
}

function persistPrepared(prepared, evidenceFixture, artifactFixture, fault) {
  const fact = artifactFixture.store.putDisposable(prepared.artifactRequest);
  assert.equal(fact.ok, true);
  assert.equal(artifactFixture.witness.advance(fact.value).ok, true);
  const proof = artifactProof(prepared, fact.value);
  assert.equal(
    artifactFixture.store.adopt({
      ...prepared.artifactRequest,
      bytes: undefined,
      putOperation: prepared.artifactRequest.operation,
      fact: fact.value,
      proof,
    }).ok,
    false,
    'the artifact adoption request must not retain an extra bytes field',
  );
  const { bytes: _discarded, ...putBasis } = prepared.artifactRequest;
  assert.equal(
    artifactFixture.store.adopt({
      ...putBasis,
      putOperation: prepared.artifactRequest.operation,
      fact: fact.value,
      proof,
    }).ok,
    true,
  );
  return evidenceFixture.admit({ key: prepared.key, fact: fact.value, proof }, artifactFixture.store, fault);
}

test('GF-014 R01: canonical ID-EVSUBJ values bind one existing identity and one configured claim', () => {
  for (const subject of subjects) {
    const admission = fixture();
    const request = {
      ...base,
      subject: `evidence://${subject.identity}/claim/${subject.claims[0]}`,
      contentDigest: oracle.digest,
    };
    const prepared = admission.prepare(request);
    assert.equal(prepared.ok, true, subject.kind);
    assert.equal(prepared.value.kind, 'prepared');
    assert.equal(prepared.value.subjectKind, subject.kind);
    assert.equal(prepared.value.subjectIdentity, subject.identity);
    assert.equal(prepared.value.claim, subject.claims[0]);
  }

  const admission = fixture();
  for (const subject of [
    'evidence://free-form/claim/anything',
    `evidence://${oracle.subjectIdentity}/claim/wrong-claim`,
    `evidence://${oracle.subjectIdentity.replace('/cand/1|', '/cand/2|')}/claim/${oracle.claim}`,
  ]) {
    const result = admission.prepare({ ...base, subject });
    assert.equal(result.ok, false);
    assert.equal(result.error.family, 'FC-SUBJECT');
  }
  assert.deepEqual(admission.prepare({ ...base, schemaVersion: 'jig.evidence.v2' }), {
    ok: false,
    error: { family: 'FC-INPUT', code: 'UNKNOWN_SCHEMA_VERSION' },
  });
  assert.equal(admission.prepare({ ...base, extra: true }).ok, false);
});

test('GF-014 R02: attribution is exact and provider manifests stay unavailable before GF-022', () => {
  assert.equal(fixture().prepare(base).ok, true);
  for (const request of [
    { ...base, producer: { ...producer, principal: 'principal/other' } },
    { ...base, producer: { ...producer, session: 'session/free-form' } },
    { ...base, providerManifest: `provider/${'1'.repeat(64)}/authority/${'2'.repeat(64)}` },
  ])
    assert.equal(fixture().prepare(request).ok, false);

  const mechanism = fixture().prepare({
    ...base,
    producer: {
      kind: 'mechanism',
      principal: oracle.principal,
      session: oracle.session,
      manifest: `provider/${'1'.repeat(64)}/authority/${'2'.repeat(64)}`,
    },
    providerManifest: `provider/${'1'.repeat(64)}/authority/${'2'.repeat(64)}`,
  });
  assert.deepEqual(mechanism, {
    ok: false,
    error: { family: 'FC-EVIDENCE', code: 'PROVIDER_MANIFEST_UNAVAILABLE' },
  });

  const hostile = new Proxy(
    {},
    {
      ownKeys() {
        throw new Error('hostile');
      },
    },
  );
  assert.equal(fixture().prepare(hostile).ok, false);
});

test('GF-014 R03: secret scanning precedes persistence and durable quarantine never echoes payloads', () => {
  for (const value of [
    'api_key=synthetic-forbidden-value',
    'password: synthetic-forbidden-value',
    'credential=synthetic-forbidden-value',
    'token: synthetic-forbidden-value',
    'secret=synthetic-forbidden-value',
  ]) {
    const admission = fixture();
    const secretBytes = new TextEncoder().encode(value);
    const result = admission.prepare({ ...base, bytes: secretBytes, contentDigest: hash(secretBytes) });
    assert.equal(result.ok, true);
    assert.equal(result.value.kind, 'quarantined');
    const durable = JSON.stringify(admission.snapshot());
    assert.equal(durable.includes(value), false);
    assert.equal(durable.includes('synthetic-forbidden-value'), false);
    assert.equal(durable.includes(hash(secretBytes)), false);
    assert.equal('artifactRequest' in result.value, false);
  }

  const invalidUtf8 = new Uint8Array([0xc3, 0x28]);
  assert.deepEqual(fixture().prepare({ ...base, bytes: invalidUtf8, contentDigest: hash(invalidUtf8) }), {
    ok: false,
    error: { family: 'FC-INPUT', code: 'INVALID_TEXT_ENCODING' },
  });
  assert.equal(fixture().prepare(base).value.kind, 'prepared', 'clean source-redacted bytes remain admissible');
});

test('GF-014 R04: the 10 MiB default, allowed bounds, rejection, and supporting-only truncation are explicit', () => {
  assert.equal(evidence.EVIDENCE_POLICY.defaultMaxBytes, oracle.defaultMaxBytes);
  assert.equal(evidence.EVIDENCE_POLICY.minimumMaxBytes, oracle.minimumMaxBytes);
  assert.equal(evidence.EVIDENCE_POLICY.maximumMaxBytes, oracle.maximumMaxBytes);
  assert.equal(evidence.EVIDENCE_POLICY.defaultRetentionDays, oracle.defaultRetentionDays);

  const oversize = new Uint8Array(oracle.defaultMaxBytes + 1);
  oversize.fill(97);
  const oversizeDigest = hash(oversize);
  const rejected = fixture().prepare({
    ...base,
    bytes: oversize,
    contentDigest: oversizeDigest,
    contentClass: 'supporting',
    completeness: 'partial',
  });
  assert.equal(rejected.ok, true);
  assert.equal(rejected.value.kind, 'rejected');
  assert.equal(rejected.value.reason, 'OVERSIZE_REJECTED');
  assert.equal('artifactRequest' in rejected.value, false);

  const truncated = fixture().prepare({
    ...base,
    bytes: oversize,
    contentDigest: oversizeDigest,
    contentClass: 'supporting',
    completeness: 'complete',
    oversizeBehavior: 'truncate-with-recorded-loss',
  });
  assert.equal(truncated.ok, true);
  assert.equal(truncated.value.kind, 'prepared');
  assert.equal(truncated.value.artifactRequest.bytes.byteLength, oracle.defaultMaxBytes);
  assert.equal(truncated.value.manifestBasis.originalSize, oracle.defaultMaxBytes + 1);
  assert.equal(truncated.value.manifestBasis.retainedSize, oracle.defaultMaxBytes);
  assert.equal(truncated.value.manifestBasis.completeness, 'partial');
  assert.deepEqual(truncated.value.manifestBasis.loss, {
    kind: 'truncated',
    omittedBytes: 1,
  });

  assert.deepEqual(
    fixture().prepare({
      ...base,
      bytes: oversize,
      contentDigest: oversizeDigest,
      oversizeBehavior: 'truncate-with-recorded-loss',
    }),
    {
      ok: false,
      error: { family: 'FC-EVIDENCE', code: 'COMPLETENESS_CRITICAL_TRUNCATION' },
    },
  );
  const wrongDigest = fixture().prepare({ ...base, contentDigest: '0'.repeat(64) });
  assert.deepEqual(wrongDigest, {
    ok: false,
    error: { family: 'FC-EVIDENCE', code: 'CONTENT_DIGEST_MISMATCH' },
  });
});

test('GF-014 R05: admission follows exact witnessed GF-013 put, adoption, and immutable readback', () => {
  const admission = fixture();
  const artifactFixture = artifact.createScriptedArtifactFixture();
  const prepared = admission.prepare(base);
  assert.equal(prepared.ok, true);
  const fact = artifactFixture.store.putDisposable(prepared.value.artifactRequest);
  assert.equal(fact.ok, true);
  const proof = artifactProof(prepared.value, fact.value);
  assert.deepEqual(admission.admit({ key: prepared.value.key, fact: fact.value, proof }, artifactFixture.store), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'ARTIFACT_WITNESS_NOT_CURRENT' },
  });
  assert.equal(artifactFixture.witness.advance(fact.value).ok, true);
  const { bytes: _discarded, ...putBasis } = prepared.value.artifactRequest;
  assert.equal(
    artifactFixture.store.adopt({
      ...putBasis,
      putOperation: prepared.value.artifactRequest.operation,
      fact: fact.value,
      proof,
    }).ok,
    true,
  );
  const admitted = admission.admit({ key: prepared.value.key, fact: fact.value, proof }, artifactFixture.store);
  assert.equal(admitted.ok, true);
  assert.equal(admitted.value.kind, 'admitted');
  assert.equal(admitted.value.manifest.subject, oracle.evidenceSubject);
  assert.equal(admitted.value.manifest.artifactDigest, oracle.digest);
  assert.deepEqual(admitted.value.manifest.retention, oracle.retention);
  assert.deepEqual(admitted.value.manifest.artifactFact, fact.value);
  assert.equal(Object.isFrozen(admitted.value.manifest), true);

  const substitution = structuredClone(fact.value);
  substitution.headDigest = 'f'.repeat(64);
  assert.equal(
    admission.admit({ key: prepared.value.key, fact: substitution, proof }, artifactFixture.store).ok,
    false,
  );
  assert.equal(
    admission.admit(
      { key: prepared.value.key, fact: fact.value, proof },
      {
        acknowledge: () => ({ ok: true, value: undefined }),
        get: () => ({ ok: true, value: { digest: oracle.digest, bytes: new TextEncoder().encode('tampered') } }),
      },
    ).ok,
    false,
  );
});

test('GF-014 R06: recovery replays immutable facts, preserves holds, and never infers admission from bytes', () => {
  const admission = fixture();
  const artifactFixture = artifact.createScriptedArtifactFixture();
  const prepared = admission.prepare(base);
  assert.equal(prepared.ok, true);
  const lost = persistPrepared(prepared.value, admission, artifactFixture, 'lost-ack');
  assert.deepEqual(lost, {
    ok: false,
    error: { family: 'FC-TRUST', code: 'ACK_LOST' },
  });
  const reconciled = admission.reconcile(prepared.value.key);
  assert.equal(reconciled.ok, true);
  assert.equal(reconciled.value.kind, 'admitted');
  assert.deepEqual(reconciled.value.manifest.retention.hold, oracle.retention.hold);

  const snapshot = admission.snapshot();
  const witness = snapshot.head;
  assert.equal(JSON.stringify(snapshot).includes(oracle.bytes), false);
  const restored = evidence.restoreScriptedEvidenceFixture(snapshot, witness, config, artifactFixture.store);
  assert.equal(restored.ok, true);
  assert.equal(restored.value.reconcile(prepared.value.key).value.kind, 'admitted');
  assert.deepEqual(restored.value.reconcile(prepared.value.key).value.manifest.retention, oracle.retention);

  for (const changedWitness of [
    undefined,
    { position: witness.position - 1, headDigest: witness.headDigest },
    { position: witness.position + 1, headDigest: witness.headDigest },
    { position: witness.position, headDigest: 'f'.repeat(64) },
  ])
    assert.equal(
      evidence.restoreScriptedEvidenceFixture(snapshot, changedWitness, config, artifactFixture.store).ok,
      false,
    );
  const tampered = structuredClone(snapshot);
  tampered.journal[0].record.basis.subject = `evidence://${oracle.subjectIdentity}/claim/wrong-claim`;
  assert.equal(evidence.restoreScriptedEvidenceFixture(tampered, witness, config, artifactFixture.store).ok, false);

  const pending = fixture();
  const pendingPrepared = pending.prepare(base);
  const pendingSnapshot = pending.snapshot();
  const pendingRestored = evidence.restoreScriptedEvidenceFixture(
    pendingSnapshot,
    pendingSnapshot.head,
    config,
    artifactFixture.store,
  );
  assert.equal(pendingRestored.ok, true);
  assert.equal(pendingRestored.value.reconcile(pendingPrepared.value.key).value.kind, 'pending');
});

test('GF-014 R07: the evidence seam exposes no acceptance, lifecycle, provider, release, or disposal authority', () => {
  const admission = fixture();
  for (const forbidden of [
    'accept',
    'verdict',
    'transition',
    'dispatch',
    'selectProvider',
    'release',
    'dispose',
    'delete',
    'publish',
  ])
    assert.equal(forbidden in admission, false);
  const prepared = admission.prepare(base);
  assert.equal(prepared.ok, true);
  for (const forbidden of ['accept', 'verdict', 'release', 'dispose', 'provider', 'credential', 'secret'])
    assert.equal(forbidden in prepared.value, false);
});
