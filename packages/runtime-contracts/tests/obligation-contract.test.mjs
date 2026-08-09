import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const obligation = await import('../dist/obligation.js');
const artifact = await import('../dist/artifact.js');
const evidenceRuntime = await import('../dist/evidence.js');
const ledgerRuntime = await import('../dist/ledger.js');
const oracle = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/obligation-contract-oracle.json'), 'utf8'),
);

const digest = (character) => (({ p: 'd', t: 'e', w: 'f', x: '0', z: '1' })[character] ?? character).repeat(64);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const evidenceOracle = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/evidence-contract-oracle.json'), 'utf8'),
);
const run = 'run-000000000038-0123456789abcdef';
const generation = `${run}/gen/1|controller`;
const origin = `${run}/event/1`;
const resource = 'resource/protected-retirement';
const evidenceSubject = evidenceOracle.evidenceSubject;
const criteriaClaim = evidenceOracle.claim;
const evidenceConfig = (() => {
  const scanBasis = { version: evidenceOracle.scanPolicyVersion, detectors: evidenceOracle.scanDetectors };
  const secretScan = { ...scanBasis, digest: hash(JSON.stringify(scanBasis)) };
  const policyBasis = {
    kind: evidenceOracle.criticalEvidenceKind,
    version: evidenceOracle.criticalPolicyVersion,
    scanPolicyVersion: secretScan.version,
    scanPolicyDigest: secretScan.digest,
    maxBytes: evidenceOracle.defaultMaxBytes,
    oversizeBehavior: 'reject',
    completenessCritical: true,
    contentType: 'text/plain',
    redactionStatus: 'source-redacted',
    retention: evidenceOracle.retention,
  };
  const policy = { ...policyBasis, digest: hash(JSON.stringify(policyBasis)) };
  return {
    subjects: [{ kind: evidenceOracle.subjectKind, identity: evidenceOracle.subjectIdentity, claims: [criteriaClaim] }],
    principals: [{ principal: evidenceOracle.principal, sessions: [evidenceOracle.session] }],
    secretScan,
    evidenceKinds: [policy],
  };
})();
const artifactProof = (prepared, fact) => {
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
  const pin = request.pins.temporary;
  const transition = `transition/evidence/${prepared.key}/temporary`;
  const canonical = JSON.stringify({
    transition,
    registration,
    role: 'temporary',
    holder: pin.holder,
    tuple: pin.tuple,
    subject: request.subject,
    fence: request.fence,
    fact,
  });
  return {
    transition,
    registration,
    role: 'temporary',
    holder: pin.holder,
    tuple: pin.tuple,
    subject: request.subject,
    fence: request.fence,
    fact,
    digest: hash(canonical),
  };
};
const admittedEvidence = (() => {
  const authority = evidenceRuntime.createScriptedEvidenceFixture(evidenceConfig);
  const artifacts = artifact.createScriptedArtifactFixture();
  const prepared = authority.prepare({
    schemaVersion: evidenceOracle.evidenceSchemaVersion,
    evidenceKind: evidenceOracle.criticalEvidenceKind,
    policy: { version: evidenceOracle.criticalPolicyVersion, digest: evidenceConfig.evidenceKinds[0].digest },
    subject: evidenceSubject,
    producer: { kind: 'principal', principal: evidenceOracle.principal, session: evidenceOracle.session },
    providerManifest: null,
    contentDigest: evidenceOracle.digest,
    bytes: new TextEncoder().encode(evidenceOracle.bytes),
    artifact: {
      resourceScope: evidenceOracle.resourceScope,
      operation: evidenceOracle.operation,
      fence: evidenceOracle.fence,
      temporaryTuple: evidenceOracle.temporaryTuple,
    },
  });
  assert.equal(prepared.ok, true, JSON.stringify(prepared));
  const fact = artifacts.store.putDisposable(prepared.value.artifactRequest);
  assert.equal(fact.ok, true, JSON.stringify(fact));
  assert.equal(artifacts.witness.advance(fact.value).ok, true);
  const proof = artifactProof(prepared.value, fact.value);
  const { bytes: _bytes, ...putBasis } = prepared.value.artifactRequest;
  assert.equal(
    artifacts.store.adopt({
      ...putBasis,
      putOperation: prepared.value.artifactRequest.operation,
      fact: fact.value,
      proof,
    }).ok,
    true,
  );
  const admitted = authority.admit({ key: prepared.value.key, fact: fact.value, proof }, artifacts.store);
  assert.equal(admitted.ok, true, JSON.stringify(admitted));
  return { authority, key: prepared.value.key, manifest: admitted.value.manifest };
})();
const evidence = () => ({ key: admittedEvidence.key });
const criteria = (overrides = {}) => ({
  subject: evidenceSubject,
  claim: criteriaClaim,
  ...overrides,
});
const dependencies = () => ({ ledger: ledgerRuntime.createScriptedLedger(), evidence: admittedEvidence.authority });
const openInput = (overrides = {}) => ({
  obligationOrdinal: 1,
  run,
  generation,
  resource,
  duty: 'retirement',
  origin,
  reason: 'automatic retirement duty failed after bounded attempts',
  preservationEvidence: evidence(),
  accountableOwner: 'principal/arye',
  criteria: criteria(),
  startedAt: 1000,
  deadline: 1000 + 72 * 60 * 60,
  policyDigest: digest('p'),
  ...overrides,
});

const ownerProof = digest('a');

test('GF038 oracle retains the private bounded contract and excluded capabilities', () => {
  assert.equal(oracle.contractVersion, obligation.OBLIGATION_CONTRACT_VERSION);
  assert.equal(oracle.schema, obligation.OBLIGATION_SCHEMA);
  assert.equal(oracle.criteriaSchema, obligation.OBLIGATION_CRITERIA_SCHEMA);
  assert.equal(oracle.evidenceSchema, obligation.OBLIGATION_EVIDENCE_SCHEMA);
  assert.equal(oracle.factSchema, obligation.OBLIGATION_FACT_SCHEMA);
  assert.equal(oracle.ledgerVersion, 'jig.ledger.v1');
  assert.equal(oracle.bound, obligation.OBLIGATION_BOUND.name);
  assert.deepEqual(oracle.statuses, ['open', 'accepted-handoff', 'resolved']);
  assert.deepEqual(oracle.duties, [...obligation.AUTOMATIC_DUTIES]);
  assert.deepEqual(oracle.events, [
    'EV-OWNER-DECISION',
    'EV-OBLIGATION-RESOLVED',
    'EV-BOUND-EXHAUSTED',
    'EV-WAKE-SETTLEMENT',
  ]);
});

test('GF038-MC-01: opening mints one immutable obligation with exact bindings', () => {
  const controller = obligation.createScriptedObligationController({ dependencies: dependencies() });
  const opened = controller.open(openInput());
  assert.equal(opened.ok, true, JSON.stringify(opened));
  assert.equal(opened.value.id, `${run}/obligation/1`);
  assert.equal(opened.value.status, 'open');
  assert.equal(opened.value.duty, 'retirement');
  assert.equal(opened.value.resource, resource);
  assert.equal(opened.value.origin, origin);
  assert.equal(opened.value.accountableOwner, 'principal/arye');
  assert.equal(opened.value.startedAt, 1000);
  assert.equal(opened.value.deadline, 1000 + 72 * 60 * 60);
  assert.equal(opened.value.bound, 'BND-WAIT-DECISION');
  assert.equal(opened.value.boundDigest.length, 64);
  assert.equal(opened.value.criteria.digest.length, 64);
  assert.equal(Object.isFrozen(opened.value), true);
  assert.deepEqual(controller.open(openInput()), opened);
  assert.equal(controller.open(openInput({ reason: 'different failure' })).error.code, 'OBLIGATION_ID_REUSE_MISMATCH');
  assert.equal(controller.facts().filter((fact) => fact.type === 'SCH-OBLIGATION').length, 1);
});

test('obligation facts cannot append across a hydrated ledger binding', () => {
  const controller = obligation.createScriptedObligationController({
    dependencies: dependencies(),
    hydrate: {
      nextEventOrdinal: 1,
      ledgerBinding: { kind: 'run', run: `${run}-foreign`, generation },
      ledgerHead: null,
      obligations: [],
      grants: [],
      intents: [],
      facts: [],
    },
  });
  assert.deepEqual(controller.open(openInput()), {
    ok: false,
    error: { family: 'FC-FENCE', code: 'OBLIGATION_LEDGER_BINDING_MISMATCH' },
  });
});

test('allocated obligations use durable monotonic readback across replay', () => {
  const runtimeDependencies = dependencies();
  const controller = obligation.createScriptedObligationController({ dependencies: runtimeDependencies });
  const { obligationOrdinal: _ordinal, ...allocationInput } = openInput();
  const first = controller.openAllocated(allocationInput);
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(first.value.id, `${run}/obligation/1`);
  assert.deepEqual(controller.openAllocated(allocationInput), first);
  const second = controller.openAllocated({
    ...allocationInput,
    origin: `${run}/event/2`,
    startedAt: 2000,
    deadline: 2000 + 72 * 60 * 60,
  });
  assert.equal(second.ok, true, JSON.stringify(second));
  assert.equal(second.value.id, `${run}/obligation/2`);
  assert.deepEqual(controller.openAllocated({ ...allocationInput, reason: 'different failure' }), {
    ok: false,
    error: { family: 'FC-SUBJECT', code: 'OBLIGATION_ALLOCATION_COLLISION' },
  });

  const restored = obligation.restoreScriptedObligationController(controller.snapshot(), runtimeDependencies);
  assert.equal(restored.ok, true, JSON.stringify(restored));
  const replayed = restored.value.openAllocated({
    ...allocationInput,
    origin: `${run}/event/2`,
    startedAt: 2000,
    deadline: 2000 + 72 * 60 * 60,
  });
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.value.id, `${run}/obligation/2`);
});

test('legacy obligation facts contribute ordinals but cannot satisfy allocation replay', () => {
  const runtimeDependencies = dependencies();
  const binding = { kind: 'run', run, generation };
  const legacyContent = {
    schema: obligation.OBLIGATION_FACT_SCHEMA,
    type: 'SCH-OBLIGATION',
    obligation: `${run}/obligation/1`,
    status: 'open',
    generation,
    criteriaDigest: digest('c'),
    evidenceDigest: digest('e'),
    grant: null,
    boundDigest: obligation.obligationBoundDigest({
      id: `${run}/obligation/1`,
      generation,
      policyDigest: digest('p'),
      startedAt: 1000,
      deadline: 1000 + 72 * 60 * 60,
    }),
    observedAt: 1000,
  };
  const prepared = ledgerRuntime.createLedgerRecord({
    run,
    generation,
    transaction: `${run}/txn/1/${generation}|${digest('0')}`,
    position: 0,
    previousDigest: '0'.repeat(64),
    content: legacyContent,
  });
  assert.equal(prepared.ok, true, JSON.stringify(prepared));
  assert.equal(runtimeDependencies.ledger.append({ binding, expectedPosition: -1, record: prepared.value }).ok, true);

  const controller = obligation.createScriptedObligationController({ dependencies: runtimeDependencies });
  const { obligationOrdinal: _ordinal, ...allocationInput } = openInput();
  const allocated = controller.openAllocated(allocationInput);
  assert.equal(allocated.ok, true, JSON.stringify(allocated));
  assert.equal(allocated.value.id, `${run}/obligation/2`);
  assert.equal(allocated.value.event, `${run}/event/2`);
  assert.equal(
    controller.facts().some((fact) => fact.allocationVersion === obligation.OBLIGATION_ALLOCATION_CLAIM_SCHEMA),
    true,
  );
  assert.equal(controller.openAllocated(allocationInput).value.id, `${run}/obligation/2`);
  const restored = obligation.restoreScriptedObligationController(controller.snapshot(), runtimeDependencies);
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.equal(restored.value.openAllocated(allocationInput).value.id, `${run}/obligation/2`);
});

test('allocated duty readback replays an uncertain append and rejects a durable collision', () => {
  const runtimeDependencies = dependencies();
  const { obligationOrdinal: _ordinal, ...allocationInput } = openInput();
  const controller = obligation.createScriptedObligationController({
    dependencies: runtimeDependencies,
    ledgerFaultPlan: [{ append: 'after-witness', readback: 'indeterminate-read' }],
  });
  const uncertain = controller.openAllocated(allocationInput);
  assert.deepEqual(uncertain, {
    ok: false,
    error: { family: 'FC-TRUST', code: 'OBLIGATION_APPEND_UNCERTAIN' },
  });

  const replayed = controller.openAllocated(allocationInput);
  assert.equal(replayed.ok, true, JSON.stringify(replayed));
  assert.equal(replayed.value.id, `${run}/obligation/1`);
  assert.equal(runtimeDependencies.ledger.records({ kind: 'run', run, generation }).value.length, 1);
  assert.deepEqual(controller.openAllocated({ ...allocationInput, reason: 'different failure' }), {
    ok: false,
    error: { family: 'FC-SUBJECT', code: 'OBLIGATION_ALLOCATION_COLLISION' },
  });

  const independentReplay = obligation.createScriptedObligationController({ dependencies: runtimeDependencies });
  const replayedAgain = independentReplay.openAllocated(allocationInput);
  assert.equal(replayedAgain.ok, true, JSON.stringify(replayedAgain));
  assert.equal(replayedAgain.value.id, `${run}/obligation/1`);
});

test('GF038-MC-02: only the closed lifecycle edges are accepted and replay is idempotent', () => {
  const runtimeDependencies = dependencies();
  const controller = obligation.createScriptedObligationController({ dependencies: runtimeDependencies });
  const opened = controller.open(openInput());
  assert.equal(opened.ok, true);
  const handoff = controller.acceptHandoff({
    obligation: opened.value.id,
    responder: 'principal/arye',
    responderProof: ownerProof,
    criteriaDigest: opened.value.criteria.digest,
    generation,
    reason: 'owner accepts the exact residual duty',
    observedAt: 2000,
  });
  assert.equal(handoff.ok, true, JSON.stringify(handoff));
  assert.equal(handoff.value.status, 'accepted-handoff');
  assert.deepEqual(
    controller.acceptHandoff({
      obligation: opened.value.id,
      responder: 'principal/arye',
      responderProof: ownerProof,
      criteriaDigest: opened.value.criteria.digest,
      generation,
      reason: 'owner accepts the exact residual duty',
      observedAt: 2000,
    }),
    handoff,
  );
  assert.equal(
    controller.acceptHandoff({
      obligation: opened.value.id,
      responder: 'principal/arye',
      responderProof: ownerProof,
      criteriaDigest: opened.value.criteria.digest,
      generation,
      reason: 'owner accepts the exact residual duty',
      observedAt: 2001,
    }).ok,
    true,
  );
  assert.equal(controller.get(opened.value.id).value.status, 'accepted-handoff');
  assert.equal(
    controller.resolve({
      obligation: opened.value.id,
      responder: 'principal/arye',
      responderProof: ownerProof,
      grant: null,
      generation,
      criteriaDigest: opened.value.criteria.digest,
      evidence: evidence(),
      observedAt: 3000,
    }).value.status,
    'resolved',
  );
  assert.equal(
    controller.resolve({
      obligation: opened.value.id,
      responder: 'principal/arye',
      responderProof: ownerProof,
      grant: null,
      generation,
      criteriaDigest: opened.value.criteria.digest,
      evidence: evidence(),
      observedAt: 3000,
    }).value.status,
    'resolved',
  );
  const restored = obligation.restoreScriptedObligationController(controller.snapshot(), runtimeDependencies);
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.get(opened.value.id), controller.get(opened.value.id));
  assert.deepEqual(restored.value.intents(), controller.intents());
  assert.equal(controller.facts().filter((fact) => fact.type === 'EV-OBLIGATION-RESOLVED').length, 1);
  assert.equal(
    controller.acceptHandoff({
      obligation: opened.value.id,
      responder: 'principal/arye',
      responderProof: ownerProof,
      criteriaDigest: opened.value.criteria.digest,
      generation,
      reason: 'late mutation',
      observedAt: 4000,
    }).error.code,
    'OBLIGATION_TERMINAL',
  );
});

test('GF038-MC-03: handoff is owner-only and exact-subject/fence bound', () => {
  const controller = obligation.createScriptedObligationController({ dependencies: dependencies() });
  const opened = controller.open(openInput());
  assert.equal(opened.ok, true);
  const handoff = (overrides = {}) =>
    controller.acceptHandoff({
      obligation: opened.value.id,
      responder: 'principal/agent-one',
      responderProof: ownerProof,
      criteriaDigest: opened.value.criteria.digest,
      generation,
      reason: 'delegated answer',
      observedAt: 2000,
      ...overrides,
    });
  assert.deepEqual(handoff().error, { family: 'FC-AUTHORITY', code: 'OWNER_ONLY_HANDOFF' });
  assert.deepEqual(handoff({ responder: 'principal/arye', responderProof: digest('x') }).error, {
    family: 'FC-AUTHORITY',
    code: 'RESPONDER_NOT_AUTHENTICATED',
  });
  assert.deepEqual(
    handoff({ generation: `${run}/gen/2|controller`, responder: 'principal/arye', responderProof: ownerProof }).error,
    {
      family: 'FC-FENCE',
      code: 'STALE_OBLIGATION_GENERATION',
    },
  );
  assert.deepEqual(
    handoff({ criteriaDigest: digest('z'), responder: 'principal/arye', responderProof: ownerProof }).error,
    {
      family: 'FC-SUBJECT',
      code: 'CRITERIA_MISMATCH',
    },
  );
});

test('GF038-MC-04: delegated resolution requires a current exact grant and trusted criteria evidence', () => {
  const controller = obligation.createScriptedObligationController({ dependencies: dependencies() });
  const opened = controller.open(openInput());
  assert.equal(opened.ok, true);
  const grant = controller.issueGrant({
    grantOrdinal: 1,
    obligation: opened.value.id,
    delegate: 'principal/agent-one',
    grantorProof: ownerProof,
    generation,
    issuedAt: 1500,
    expiresAt: 5000,
  });
  assert.equal(grant.ok, true, JSON.stringify(grant));
  const resolution = {
    obligation: opened.value.id,
    responder: 'principal/agent-one',
    responderProof: digest('b'),
    grant: grant.value.id,
    generation,
    criteriaDigest: opened.value.criteria.digest,
    evidence: evidence(),
    observedAt: 3000,
  };
  assert.equal(controller.resolve(resolution).value.status, 'resolved');

  const wrongGrantController = obligation.createScriptedObligationController({ dependencies: dependencies() });
  const wrongOpened = wrongGrantController.open(openInput());
  assert.equal(wrongOpened.ok, true);
  assert.deepEqual(
    wrongGrantController.resolve({ ...resolution, obligation: wrongOpened.value.id, grant: `${run}/grant/2` }).error,
    {
      family: 'FC-FENCE',
      code: 'CURRENT_GRANT_REQUIRED',
    },
  );
  const criteriaController = obligation.createScriptedObligationController({ dependencies: dependencies() });
  const criteriaOpened = criteriaController.open(openInput());
  assert.equal(criteriaOpened.ok, true);
  assert.deepEqual(
    criteriaController.resolve({
      ...resolution,
      obligation: criteriaOpened.value.id,
      grant: null,
      responder: 'principal/arye',
      responderProof: ownerProof,
      criteriaDigest: digest('z'),
    }).error,
    { family: 'FC-SUBJECT', code: 'CRITERIA_MISMATCH' },
  );
  assert.deepEqual(criteriaController.intents(), []);
  assert.deepEqual(
    criteriaController.facts().filter((fact) => fact.type === 'EV-OBLIGATION-RESOLVED'),
    [],
  );
  assert.deepEqual(
    criteriaController.resolve({
      ...resolution,
      obligation: criteriaOpened.value.id,
      grant: null,
      responder: 'principal/arye',
      responderProof: ownerProof,
      evidence: { subject: evidenceSubject, digest: digest('c'), trustRoot: digest('x'), referenceDigest: digest('z') },
      criteriaDigest: criteriaOpened.value.criteria.digest,
    }).error,
    { family: 'FC-INPUT', code: 'INVALID_EVIDENCE_REFERENCE' },
  );
});

test('GF038-MC-05: first timeout re-escalates once without changing identity, owner, or deadline', () => {
  const controller = obligation.createScriptedObligationController({ dependencies: dependencies() });
  const opened = controller.open(openInput());
  assert.equal(opened.ok, true);
  assert.deepEqual(controller.expire({ obligation: opened.value.id, observedAt: opened.value.deadline - 1 }).error, {
    family: 'FC-BOUND',
    code: 'WAIT_NOT_EXHAUSTED',
  });
  const exhausted = controller.expire({ obligation: opened.value.id, observedAt: opened.value.deadline });
  assert.equal(exhausted.ok, true, JSON.stringify(exhausted));
  assert.equal(exhausted.value.status, 'open');
  assert.equal(exhausted.value.exhaustionCount, 1);
  assert.equal(exhausted.value.startedAt, opened.value.startedAt);
  assert.equal(exhausted.value.deadline, opened.value.deadline);
  assert.equal(exhausted.value.accountableOwner, opened.value.accountableOwner);
  const factCount = controller.facts().length;
  assert.deepEqual(
    controller.expire({ obligation: opened.value.id, observedAt: opened.value.deadline + 1 }),
    exhausted,
  );
  assert.equal(controller.facts().length, factCount);
  assert.equal(controller.facts().filter((fact) => fact.type === 'EV-BOUND-EXHAUSTED').length, 1);
});

test('GF038-MC-06/08: settlement wake is observation-only and no prohibited capability exists', () => {
  const controller = obligation.createScriptedObligationController({ dependencies: dependencies() });
  const opened = controller.open(openInput());
  assert.equal(opened.ok, true);
  const before = controller.get(opened.value.id).value;
  const wake = controller.wakeSettlement({
    obligation: opened.value.id,
    conditionDigest: digest('w'),
    observedAt: 5000,
  });
  assert.equal(wake.ok, true, JSON.stringify(wake));
  assert.equal(wake.value.type, 'EV-WAKE-SETTLEMENT');
  assert.deepEqual(controller.get(opened.value.id).value, before);
  assert.equal(controller.fixtureEvidence().providerEnabled, false);
  assert.equal(controller.fixtureEvidence().dispatchEnabled, false);
  assert.equal(controller.fixtureEvidence().settlementOverlayEnabled, false);
  assert.equal(controller.fixtureEvidence().cleanupEnabled, false);
  assert.equal(controller.fixtureEvidence().noticeChannelEnabled, false);
});

test('GF038-MC-07: snapshot recovery preserves open state and rejects hostile or corrupted snapshots', () => {
  const runtimeDependencies = dependencies();
  const controller = obligation.createScriptedObligationController({ dependencies: runtimeDependencies });
  const opened = controller.open(openInput());
  assert.equal(opened.ok, true);
  assert.equal(controller.expire({ obligation: opened.value.id, observedAt: opened.value.deadline }).ok, true);
  const restored = obligation.restoreScriptedObligationController(controller.snapshot(), runtimeDependencies);
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.get(opened.value.id), controller.get(opened.value.id));
  assert.deepEqual(restored.value.facts(), controller.facts());
  assert.deepEqual(
    restored.value.expire({ obligation: opened.value.id, observedAt: opened.value.deadline + 1 }),
    controller.get(opened.value.id),
  );

  const forged = structuredClone(controller.snapshot());
  forged.obligations[0].deadline += 1;
  assert.deepEqual(obligation.restoreScriptedObligationController(forged, runtimeDependencies).error, {
    family: 'FC-TRUST',
    code: 'INVALID_OBLIGATION_SNAPSHOT',
  });
  assert.equal(
    runtimeDependencies.ledger.injectFault(controller.snapshot().ledgerBinding, 'witness-contradiction').ok,
    true,
  );
  assert.deepEqual(obligation.restoreScriptedObligationController(controller.snapshot(), runtimeDependencies).error, {
    family: 'FC-TRUST',
    code: 'WITNESS_NOT_CURRENT',
  });
  assert.deepEqual(controller.open({ ...openInput(), resource: 'api-token=super-secret' }).error, {
    family: 'FC-TRUST',
    code: 'HOSTILE_RESOURCE',
  });
  assert.deepEqual(controller.open({ ...openInput(), origin: `${run}/event/0` }).error, {
    family: 'FC-SUBJECT',
    code: 'INVALID_ORIGIN',
  });

  const uncertainDependencies = dependencies();
  const uncertainController = obligation.createScriptedObligationController({
    dependencies: uncertainDependencies,
    ledgerFaultPlan: [{}, { append: 'lost-ack', readback: 'indeterminate-read' }],
  });
  const uncertainOpened = uncertainController.open(openInput({ obligationOrdinal: 2 }));
  assert.equal(uncertainOpened.ok, true);
  const uncertainResolution = {
    obligation: uncertainOpened.value.id,
    responder: 'principal/arye',
    responderProof: ownerProof,
    grant: null,
    generation,
    criteriaDigest: uncertainOpened.value.criteria.digest,
    evidence: evidence(),
    observedAt: 3000,
  };
  assert.deepEqual(uncertainController.resolve(uncertainResolution).error, {
    family: 'FC-TRUST',
    code: 'OBLIGATION_APPEND_UNCERTAIN',
  });
  assert.equal(uncertainController.intents()[0]?.status, 'uncertain');
  const beforeBlindRetry = uncertainController.snapshot();
  assert.deepEqual(uncertainController.resolve(uncertainResolution).error, {
    family: 'FC-TRUST',
    code: 'UNCERTAIN_RESOLUTION_REQUIRES_RECONCILIATION',
  });
  assert.deepEqual(uncertainController.snapshot(), beforeBlindRetry);
  const recoveredUncertain = obligation.restoreScriptedObligationController(beforeBlindRetry, uncertainDependencies);
  assert.equal(recoveredUncertain.ok, true, JSON.stringify(recoveredUncertain));
  const uncertainIntentKey = recoveredUncertain.value.intents()[0].key;
  assert.deepEqual(
    recoveredUncertain.value.reconcileResolution({
      obligation: uncertainOpened.value.id,
      intentKey: uncertainIntentKey,
      outcome: 'indeterminate',
    }).error,
    { family: 'FC-TRUST', code: 'UNCERTAIN_RESOLUTION_REQUIRES_RECONCILIATION' },
  );
  const reconciled = recoveredUncertain.value.reconcileResolution({
    obligation: uncertainOpened.value.id,
    intentKey: uncertainIntentKey,
    outcome: 'confirmed',
  });
  assert.equal(reconciled.ok, true, JSON.stringify(reconciled));
  assert.equal(reconciled.value.status, 'confirmed');
  const resolvedAfterRecovery = recoveredUncertain.value.resolve(uncertainResolution);
  assert.equal(resolvedAfterRecovery.ok, true, JSON.stringify(resolvedAfterRecovery));
  assert.equal(resolvedAfterRecovery.value.status, 'resolved');
  const resolvedReplay = obligation.restoreScriptedObligationController(
    recoveredUncertain.value.snapshot(),
    uncertainDependencies,
  );
  assert.equal(resolvedReplay.ok, true, JSON.stringify(resolvedReplay));
  assert.deepEqual(resolvedReplay.value.intents(), recoveredUncertain.value.intents());
});

test('GF038-MC-07: every resolution append stage fences uncertainty and reconciles exact absence/readback', () => {
  const stages = [
    { name: 'intent', index: 1 },
    { name: 'resolution-fact', index: 2 },
    { name: 'confirmation', index: 3 },
  ];
  const faults = [
    { append: 'before-append', outcome: 'confirmed-absence' },
    { append: 'lost-ack', outcome: 'confirmed' },
    { append: 'lost-ack', readback: 'indeterminate-read', outcome: 'confirmed' },
  ];
  for (const stage of stages) {
    for (const fault of faults) {
      const runtimeDependencies = dependencies();
      const ledgerFaultPlan = [{}, {}, {}, {}];
      ledgerFaultPlan[stage.index] = { append: fault.append, ...(fault.readback ? { readback: fault.readback } : {}) };
      const controller = obligation.createScriptedObligationController({
        dependencies: runtimeDependencies,
        ledgerFaultPlan,
      });
      const opened = controller.open(openInput({ obligationOrdinal: 10 + stage.index }));
      assert.equal(opened.ok, true);
      const resolution = {
        obligation: opened.value.id,
        responder: 'principal/arye',
        responderProof: ownerProof,
        grant: null,
        generation,
        criteriaDigest: opened.value.criteria.digest,
        evidence: evidence(),
        observedAt: 3000,
      };
      const attempted = controller.resolve(resolution);
      if (fault.append === 'lost-ack' && !fault.readback) {
        assert.equal(attempted.ok, true, `${stage.name} lost ACK should be witnessed`);
        assert.equal(attempted.value.status, 'resolved');
        assert.equal(controller.facts().filter((fact) => fact.type === 'EV-OBLIGATION-RESOLVED').length, 1);
        continue;
      }
      assert.deepEqual(attempted.error, {
        family: 'FC-TRUST',
        code: 'OBLIGATION_APPEND_UNCERTAIN',
      });
      const uncertain = controller.snapshot();
      const restored = obligation.restoreScriptedObligationController(uncertain, runtimeDependencies);
      assert.equal(
        restored.ok,
        true,
        `${stage.name} ${fault.append} ${fault.readback ?? ''} restore: ${JSON.stringify(restored)}`,
      );
      const freshOperation = restored.value.resolve({ ...resolution, observedAt: 3001 });
      assert.deepEqual(freshOperation.error, {
        family: 'FC-TRUST',
        code: 'UNCERTAIN_RESOLUTION_REQUIRES_RECONCILIATION',
      });
      const intentKey = restored.value.intents()[0].key;
      const reconciled = restored.value.reconcileResolution({
        obligation: opened.value.id,
        intentKey,
        outcome: fault.outcome,
      });
      assert.equal(reconciled.ok, true, `${stage.name} ${fault.append} reconcile: ${JSON.stringify(reconciled)}`);
      assert.equal(reconciled.value.status, 'confirmed');
      assert.equal(restored.value.get(opened.value.id).value.status, 'resolved');
      assert.equal(restored.value.facts().filter((fact) => fact.type === 'EV-OBLIGATION-RESOLVED').length, 1);
      const replay = obligation.restoreScriptedObligationController(restored.value.snapshot(), runtimeDependencies);
      assert.equal(replay.ok, true, `${stage.name} ${fault.append} final restore: ${JSON.stringify(replay)}`);
      assert.deepEqual(replay.value.intents(), restored.value.intents());
    }
  }
});
