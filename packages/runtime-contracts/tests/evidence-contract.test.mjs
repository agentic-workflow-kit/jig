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
const principals = Object.freeze([
  {
    principal: oracle.principal,
    sessions: [oracle.session],
  },
]);
const scanPolicyBasis = Object.freeze({
  version: oracle.scanPolicyVersion,
  detectors: oracle.scanDetectors,
});
const secretScan = Object.freeze({ ...scanPolicyBasis, digest: hash(JSON.stringify(scanPolicyBasis)) });
const evidencePolicy = (basis) => Object.freeze({ ...basis, digest: hash(JSON.stringify(basis)) });
const criticalPolicy = evidencePolicy({
  kind: oracle.criticalEvidenceKind,
  version: oracle.criticalPolicyVersion,
  scanPolicyVersion: secretScan.version,
  scanPolicyDigest: secretScan.digest,
  maxBytes: oracle.defaultMaxBytes,
  oversizeBehavior: 'reject',
  completenessCritical: true,
  contentType: 'text/plain',
  redactionStatus: 'source-redacted',
  retention: oracle.retention,
});
const supportingTextPolicy = evidencePolicy({
  kind: oracle.supportingTextEvidenceKind,
  version: oracle.supportingTextPolicyVersion,
  scanPolicyVersion: secretScan.version,
  scanPolicyDigest: secretScan.digest,
  maxBytes: oracle.minimumMaxBytes,
  oversizeBehavior: 'truncate-with-recorded-loss',
  completenessCritical: false,
  contentType: 'text/plain',
  redactionStatus: 'source-redacted',
  retention: oracle.retention,
});
const supportingJsonPolicy = evidencePolicy({
  kind: oracle.supportingJsonEvidenceKind,
  version: oracle.supportingJsonPolicyVersion,
  scanPolicyVersion: secretScan.version,
  scanPolicyDigest: secretScan.digest,
  maxBytes: oracle.minimumMaxBytes,
  oversizeBehavior: 'truncate-with-recorded-loss',
  completenessCritical: false,
  contentType: 'application/json',
  redactionStatus: 'source-redacted',
  retention: oracle.retention,
});
const upperBoundPolicy = evidencePolicy({
  kind: oracle.upperBoundEvidenceKind,
  version: oracle.upperBoundPolicyVersion,
  scanPolicyVersion: secretScan.version,
  scanPolicyDigest: secretScan.digest,
  maxBytes: oracle.maximumMaxBytes,
  oversizeBehavior: 'reject',
  completenessCritical: false,
  contentType: 'text/plain',
  redactionStatus: 'source-redacted',
  retention: oracle.retention,
});
const evidenceKinds = Object.freeze([criticalPolicy, supportingTextPolicy, supportingJsonPolicy, upperBoundPolicy]);
const makeConfig = ({
  configuredSubjects = subjects,
  configuredPrincipals = principals,
  configuredSecretScan = secretScan,
  configuredEvidenceKinds = evidenceKinds,
} = {}) =>
  Object.freeze({
    subjects: configuredSubjects,
    principals: configuredPrincipals,
    secretScan: configuredSecretScan,
    evidenceKinds: configuredEvidenceKinds,
  });
const config = makeConfig();
const producer = Object.freeze({
  kind: 'principal',
  principal: oracle.principal,
  session: oracle.session,
});
const base = Object.freeze({
  schemaVersion: oracle.evidenceSchemaVersion,
  evidenceKind: criticalPolicy.kind,
  policy: {
    version: criticalPolicy.version,
    digest: criticalPolicy.digest,
  },
  subject: oracle.evidenceSubject,
  producer,
  providerManifest: null,
  contentDigest: oracle.digest,
  bytes,
  artifact: {
    resourceScope: oracle.resourceScope,
    operation: oracle.operation,
    fence: oracle.fence,
    temporaryTuple: oracle.temporaryTuple,
  },
});
const requestFor = (selectedPolicy, overrides = {}) => ({
  ...base,
  evidenceKind: selectedPolicy.kind,
  policy: {
    version: selectedPolicy.version,
    digest: selectedPolicy.digest,
  },
  ...overrides,
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
  });
  assert.equal(rejected.ok, true);
  assert.equal(rejected.value.kind, 'rejected');
  assert.equal(rejected.value.reason, 'OVERSIZE_REJECTED');
  assert.equal('artifactRequest' in rejected.value, false);

  const supportingOversize = new Uint8Array(oracle.minimumMaxBytes + 1);
  supportingOversize.fill(97);
  const supportingDigest = hash(supportingOversize);
  const truncated = fixture().prepare(
    requestFor(supportingTextPolicy, {
      bytes: supportingOversize,
      contentDigest: supportingDigest,
    }),
  );
  assert.equal(truncated.ok, true);
  assert.equal(truncated.value.kind, 'prepared');
  assert.equal(truncated.value.artifactRequest.bytes.byteLength, oracle.minimumMaxBytes);
  assert.equal(truncated.value.manifestBasis.originalSize, oracle.minimumMaxBytes + 1);
  assert.equal(truncated.value.manifestBasis.retainedSize, oracle.minimumMaxBytes);
  assert.equal(truncated.value.manifestBasis.completeness, 'partial');
  assert.deepEqual(truncated.value.manifestBasis.loss, {
    kind: 'truncated',
    omittedBytes: 1,
  });

  assert.equal(
    fixture().prepare({ ...base, oversizeBehavior: 'truncate-with-recorded-loss' }).ok,
    false,
    'callers cannot override the selected critical policy',
  );
  for (const maxBytes of [oracle.minimumMaxBytes, oracle.maximumMaxBytes]) {
    const selected = evidencePolicy({
      ...criticalPolicy,
      kind: `bound-${maxBytes}`,
      version: `jig.evidence-kind.bound-${maxBytes}.v1`,
      maxBytes,
      digest: undefined,
    });
    const boundedConfig = makeConfig({ configuredEvidenceKinds: [selected] });
    const bounded = evidence
      .createScriptedEvidenceFixture(boundedConfig)
      .prepare(requestFor(selected, { bytes, contentDigest: oracle.digest }));
    assert.equal(bounded.ok, true, `configured max ${maxBytes}`);
  }
  for (const maxBytes of [oracle.minimumMaxBytes - 1, oracle.maximumMaxBytes + 1]) {
    const basis = {
      ...criticalPolicy,
      kind: `invalid-bound-${maxBytes}`,
      version: `jig.evidence-kind.invalid-bound-${maxBytes}.v1`,
      maxBytes,
    };
    delete basis.digest;
    const selected = evidencePolicy(basis);
    const boundedConfig = makeConfig({ configuredEvidenceKinds: [selected] });
    assert.deepEqual(evidence.createScriptedEvidenceFixture(boundedConfig).prepare(requestFor(selected)), {
      ok: false,
      error: { family: 'FC-INPUT', code: 'INVALID_CONFIGURATION' },
    });
  }
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
  assert.deepEqual(admission.admit({ key: prepared.value.key, fact: fact.value, proof }, artifactFixture.store), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'ARTIFACT_ADOPTION_NOT_RECORDED' },
  });
  assert.deepEqual(
    admission.admit(
      {
        key: prepared.value.key,
        fact: fact.value,
        proof: { ...proof, digest: '0'.repeat(64) },
      },
      artifactFixture.store,
    ),
    {
      ok: false,
      error: { family: 'FC-FENCE', code: 'INVALID_ADOPTION_BINDING' },
    },
  );
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
        snapshot: () => artifactFixture.store.snapshot(),
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

const rechain = (snapshot) => {
  const changed = structuredClone(snapshot);
  let previousDigest = '0'.repeat(64);
  for (let position = 0; position < changed.journal.length; position += 1) {
    const entry = changed.journal[position];
    entry.position = position;
    entry.previousDigest = previousDigest;
    entry.digest = hash(`${previousDigest}\0${JSON.stringify(entry.record)}`);
    previousDigest = entry.digest;
  }
  changed.head = {
    position: changed.journal.length - 1,
    headDigest: previousDigest,
  };
  return changed;
};

const policyVariant = (source, changes) => {
  const basis = structuredClone(source);
  delete basis.digest;
  Object.assign(basis, changes);
  return evidencePolicy(basis);
};

test('GF-014 correction F01: configured secret absence scans every durable value and quarantine is opaque', () => {
  const hostilePayloads = [
    '{"apiKey":"synthetic-material"}',
    'Authorization: Bearer synthetic-material',
    'api%5Fkey%3Dsynthetic-material',
    Buffer.from('credential=synthetic-material').toString('base64'),
    'a p i _ k e y = synthetic-material',
  ];
  for (const material of hostilePayloads) {
    const admission = fixture();
    const hostileBytes = new TextEncoder().encode(material);
    const result = admission.prepare({
      ...base,
      bytes: hostileBytes,
      contentDigest: hash(hostileBytes),
    });
    assert.equal(result.ok, true, material);
    assert.deepEqual(Object.keys(result.value).sort(), ['key', 'kind', 'reason']);
    assert.equal(result.value.kind, 'quarantined');
    const durable = JSON.stringify({ result: result.value, snapshot: admission.snapshot() });
    assert.equal(durable.includes(material), false);
    assert.equal(durable.includes('synthetic-material'), false);
    assert.equal(durable.includes(hash(hostileBytes)), false);
  }

  for (const [name, artifactChanges] of [
    ['resource', { resourceScope: 'Authorization: Bearer synthetic-material' }],
    ['fence', { fence: 'apiKey=synthetic-material' }],
    ['operation', { operation: 'credential:synthetic-material' }],
    ['tuple', { temporaryTuple: 'secret=synthetic-material' }],
  ]) {
    const admission = fixture();
    const result = admission.prepare({
      ...base,
      artifact: { ...base.artifact, ...artifactChanges },
    });
    assert.equal(result.ok, true, name);
    assert.equal(result.value.kind, 'quarantined', name);
    const durable = JSON.stringify({ result: result.value, snapshot: admission.snapshot() });
    assert.equal(durable.includes('synthetic-material'), false, name);
  }

  const hostileConfigurations = [
    makeConfig({
      configuredSubjects: [
        ...subjects.slice(0, -1),
        {
          kind: 'ID-TARGET',
          identity: 'target/authorization-bearer-synthetic-material',
          claims: ['target-fact'],
        },
      ],
    }),
    makeConfig({
      configuredSubjects: [
        ...subjects.slice(0, -1),
        {
          kind: 'ID-TARGET',
          identity: 'target/repository-main',
          claims: ['api-key-synthetic-material'],
        },
      ],
    }),
    makeConfig({
      configuredPrincipals: [
        {
          principal: 'principal/authorization-bearer-synthetic-material',
          sessions: [
            'run-000000000001-0123456789abcdef/story/plan-a/session/authorization-bearer-synthetic-material/1',
          ],
        },
      ],
    }),
    makeConfig({
      configuredEvidenceKinds: [policyVariant(criticalPolicy, { version: 'authorization-bearer-synthetic-material' })],
    }),
    makeConfig({
      configuredEvidenceKinds: [
        policyVariant(criticalPolicy, {
          retention: { ...oracle.retention, class: 'api-key-synthetic-material' },
        }),
      ],
    }),
    makeConfig({
      configuredEvidenceKinds: [
        policyVariant(criticalPolicy, {
          retention: {
            ...oracle.retention,
            hold: { ...oracle.retention.hold, basis: 'credential=synthetic-material' },
          },
        }),
      ],
    }),
  ];
  for (const hostileConfig of hostileConfigurations) {
    const admission = evidence.createScriptedEvidenceFixture(hostileConfig);
    assert.deepEqual(admission.prepare(base), {
      ok: false,
      error: { family: 'FC-INPUT', code: 'INVALID_CONFIGURATION' },
    });
    assert.equal(JSON.stringify(admission.snapshot()).includes('synthetic-material'), false);
  }
});

test('GF-014 correction F02: evidence-kind policy selection is immutable, digest-bound, and non-downgradable', () => {
  const prepared = fixture().prepare(base);
  assert.equal(prepared.ok, true);
  assert.deepEqual(prepared.value.manifestBasis.policy, {
    kind: criticalPolicy.kind,
    version: criticalPolicy.version,
    digest: criticalPolicy.digest,
    scanPolicyVersion: secretScan.version,
    scanPolicyDigest: secretScan.digest,
  });
  assert.equal(prepared.value.manifestBasis.contentType, criticalPolicy.contentType);
  assert.equal(prepared.value.manifestBasis.contentClass, 'completeness-critical');
  assert.deepEqual(prepared.value.manifestBasis.retention, criticalPolicy.retention);

  for (const request of [
    { ...base, policy: { ...base.policy, version: 'jig.evidence-kind.other.v1' } },
    { ...base, policy: { ...base.policy, digest: 'f'.repeat(64) } },
    { ...base, contentType: 'application/json' },
    { ...base, maxBytes: oracle.maximumMaxBytes },
    { ...base, oversizeBehavior: 'truncate-with-recorded-loss' },
    { ...base, completenessCritical: false },
    { ...base, redaction: { policyVersion: secretScan.version, status: 'none' } },
    { ...base, retention: { ...oracle.retention, windowDays: 7 } },
  ])
    assert.equal(fixture().prepare(request).ok, false);

  const stalePolicy = { ...criticalPolicy, digest: 'f'.repeat(64) };
  assert.deepEqual(
    evidence
      .createScriptedEvidenceFixture(makeConfig({ configuredEvidenceKinds: [stalePolicy] }))
      .prepare(requestFor(stalePolicy)),
    {
      ok: false,
      error: { family: 'FC-INPUT', code: 'INVALID_CONFIGURATION' },
    },
  );
});

test('GF-014 correction F03: recovery binds configuration and revalidates every durable disposition', () => {
  const artifactFixture = artifact.createScriptedArtifactFixture();
  const admittedFixture = fixture();
  const admittedPrepared = admittedFixture.prepare(base);
  assert.equal(admittedPrepared.ok, true);
  assert.equal(persistPrepared(admittedPrepared.value, admittedFixture, artifactFixture).ok, true);
  const admittedSnapshot = admittedFixture.snapshot();

  const changedConfigurations = [
    makeConfig({ configuredSubjects: [] }),
    makeConfig({
      configuredSubjects: subjects.map((subject) =>
        subject.identity === oracle.subjectIdentity
          ? { ...subject, identity: oracle.subjectIdentity.replace('/cand/1|', '/cand/2|') }
          : subject,
      ),
    }),
    makeConfig({
      configuredSubjects: subjects.map((subject) =>
        subject.identity === oracle.subjectIdentity ? { ...subject, claims: ['changed-claim'] } : subject,
      ),
    }),
    makeConfig({
      configuredSubjects: subjects.map((subject) =>
        subject.identity === oracle.subjectIdentity ? { ...subject, claims: [] } : subject,
      ),
    }),
    makeConfig({ configuredPrincipals: [] }),
    makeConfig({
      configuredPrincipals: [{ principal: 'principal/other', sessions: [oracle.session] }],
    }),
    makeConfig({ configuredEvidenceKinds: [] }),
    makeConfig({
      configuredEvidenceKinds: [
        policyVariant(criticalPolicy, { version: 'jig.evidence-kind.candidate-content-critical.v2' }),
        supportingTextPolicy,
        supportingJsonPolicy,
        upperBoundPolicy,
      ],
    }),
    makeConfig({
      configuredEvidenceKinds: [
        policyVariant(criticalPolicy, {
          retention: {
            ...oracle.retention,
            hold: { ...oracle.retention.hold, id: 'hold/preservation/changed' },
          },
        }),
        supportingTextPolicy,
        supportingJsonPolicy,
        upperBoundPolicy,
      ],
    }),
    makeConfig({
      configuredEvidenceKinds: [
        policyVariant(criticalPolicy, {
          retention: { ...oracle.retention, hold: null },
        }),
        supportingTextPolicy,
        supportingJsonPolicy,
        upperBoundPolicy,
      ],
    }),
  ];
  for (const changedConfig of changedConfigurations)
    assert.equal(
      evidence.restoreScriptedEvidenceFixture(
        admittedSnapshot,
        admittedSnapshot.head,
        changedConfig,
        artifactFixture.store,
      ).ok,
      false,
    );

  const invalidIntent = structuredClone(admittedSnapshot);
  invalidIntent.journal[0].record.basis.schemaVersion = 'jig.evidence.v2';
  const rechainedIntent = rechain(invalidIntent);
  assert.equal(
    evidence.restoreScriptedEvidenceFixture(rechainedIntent, rechainedIntent.head, config, artifactFixture.store).ok,
    false,
  );

  const invalidAdmission = structuredClone(admittedSnapshot);
  invalidAdmission.journal[1].record.manifest.disposition = 'accepted';
  const rechainedAdmission = rechain(invalidAdmission);
  assert.equal(
    evidence.restoreScriptedEvidenceFixture(rechainedAdmission, rechainedAdmission.head, config, artifactFixture.store)
      .ok,
    false,
  );

  const quarantineFixture = fixture();
  const secretBytes = new TextEncoder().encode('apiKey=synthetic-material');
  assert.equal(
    quarantineFixture.prepare({ ...base, bytes: secretBytes, contentDigest: hash(secretBytes) }).value.kind,
    'quarantined',
  );
  const invalidQuarantine = structuredClone(quarantineFixture.snapshot());
  invalidQuarantine.journal[0].record.binding.subjectIndex = 999;
  const rechainedQuarantine = rechain(invalidQuarantine);
  assert.equal(
    evidence.restoreScriptedEvidenceFixture(
      rechainedQuarantine,
      rechainedQuarantine.head,
      config,
      artifactFixture.store,
    ).ok,
    false,
  );

  const rejectionFixture = fixture();
  const oversize = new Uint8Array(oracle.defaultMaxBytes + 1);
  oversize.fill(97);
  assert.equal(
    rejectionFixture.prepare({ ...base, bytes: oversize, contentDigest: hash(oversize) }).value.kind,
    'rejected',
  );
  const invalidRejection = structuredClone(rejectionFixture.snapshot());
  invalidRejection.journal[0].record.binding.policyIndex = 999;
  const rechainedRejection = rechain(invalidRejection);
  assert.equal(
    evidence.restoreScriptedEvidenceFixture(rechainedRejection, rechainedRejection.head, config, artifactFixture.store)
      .ok,
    false,
  );
});

test('GF-014 correction F04: recovery separates historical adoption from current artifact currency', () => {
  const admission = fixture();
  const artifactFixture = artifact.createScriptedArtifactFixture();
  const prepared = admission.prepare(base);
  assert.equal(prepared.ok, true);
  assert.equal(persistPrepared(prepared.value, admission, artifactFixture).ok, true);
  const evidenceSnapshot = admission.snapshot();

  const request = prepared.value.artifactRequest;
  const { bytes: _discarded, ...putBasis } = request;
  const released = artifactFixture.store.release({
    ...putBasis,
    operation: `${request.operation}/release-temporary`,
    mode: 'release-pin',
    pin: request.pins.temporary.tuple,
    putOperation: request.operation,
  });
  assert.equal(released.ok, true);
  assert.equal(artifactFixture.witness.advance(released.value).ok, true);

  const unrelatedBytes = new TextEncoder().encode('unrelated immutable bytes');
  const unrelated = artifactFixture.store.putDisposable({
    resourceScope: oracle.resourceScope,
    subject: 'artifact/evidence/unrelated',
    digest: hash(unrelatedBytes),
    fence: 'generation/2|candidate/1|artifact-provider/unavailable',
    holder: 'SCH-EVIDENCE',
    operation: `${request.operation}/unrelated`,
    mode: 'put',
    bytes: unrelatedBytes,
    pins: {
      temporary: { holder: 'EV-ARTIFACT-FACT', tuple: 'unrelated/event/1' },
      intended: { holder: 'SCH-EVIDENCE', tuple: 'unrelated/manifest/1' },
    },
  });
  assert.equal(unrelated.ok, true);
  assert.equal(artifactFixture.witness.advance(unrelated.value).ok, true);

  assert.equal(
    evidence.restoreScriptedEvidenceFixture(evidenceSnapshot, evidenceSnapshot.head, config, artifactFixture.store).ok,
    true,
  );

  const portWithSnapshot = (change) => ({
    acknowledge: (fact) => artifactFixture.store.acknowledge(fact),
    get: (artifactRequest) => artifactFixture.store.get(artifactRequest),
    snapshot: () => change(structuredClone(artifactFixture.store.snapshot())),
  });
  for (const changedPort of [
    portWithSnapshot((snapshot) => {
      snapshot.lookup.position -= 1;
      return snapshot;
    }),
    portWithSnapshot((snapshot) => {
      snapshot.lookup.headDigest = 'f'.repeat(64);
      return snapshot;
    }),
    portWithSnapshot((snapshot) => {
      snapshot.journal.pop();
      return snapshot;
    }),
    portWithSnapshot((snapshot) => {
      snapshot.journal.at(-1).fact.headDigest = 'f'.repeat(64);
      return snapshot;
    }),
  ])
    assert.equal(
      evidence.restoreScriptedEvidenceFixture(evidenceSnapshot, evidenceSnapshot.head, config, changedPort).ok,
      false,
    );
});

test('GF-014 correction F05: retained bytes remain valid for their declared content type', () => {
  const invalidJson = `"${'a'.repeat(oracle.minimumMaxBytes)}"`;
  const invalidJsonBytes = new TextEncoder().encode(invalidJson);
  assert.deepEqual(
    fixture().prepare(
      requestFor(supportingJsonPolicy, {
        bytes: invalidJsonBytes,
        contentDigest: hash(invalidJsonBytes),
      }),
    ),
    {
      ok: false,
      error: { family: 'FC-EVIDENCE', code: 'TRUNCATED_CONTENT_INVALID' },
    },
  );

  const splitUtf8 = new TextEncoder().encode(`${'a'.repeat(oracle.minimumMaxBytes - 1)}€`);
  assert.deepEqual(
    fixture().prepare(
      requestFor(supportingTextPolicy, {
        bytes: splitUtf8,
        contentDigest: hash(splitUtf8),
      }),
    ),
    {
      ok: false,
      error: { family: 'FC-EVIDENCE', code: 'TRUNCATED_CONTENT_INVALID' },
    },
  );

  const jsonBytes = new TextEncoder().encode('{"clean":"immutable"}');
  const jsonAdmission = fixture();
  const jsonPrepared = jsonAdmission.prepare(
    requestFor(supportingJsonPolicy, {
      bytes: jsonBytes,
      contentDigest: hash(jsonBytes),
    }),
  );
  assert.equal(jsonPrepared.ok, true);
  const artifactFixture = artifact.createScriptedArtifactFixture();
  assert.equal(persistPrepared(jsonPrepared.value, jsonAdmission, artifactFixture).ok, true);
  const snapshot = jsonAdmission.snapshot();
  assert.equal(
    evidence.restoreScriptedEvidenceFixture(snapshot, snapshot.head, config, artifactFixture.store).ok,
    true,
  );
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
