import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { stageDigest } from '@agentic-workflow-kit/jig-codec';

const runtime = await import('../dist/index.js');
const kernel = await import('@agentic-workflow-kit/jig-authority-kernel');

const d = (character) => character.repeat(64);
const run = 'run-000000000043-0123456789abcdef';
const generation = `${run}/gen/1|controller`;
const basis = d('a');
const operation = (ordinal) => `${run}/txn/${ordinal}/${generation}|${d('b')}/op/1`;
const binding = Object.freeze({ descriptor: d('c'), registry: `registry/${d('c')}`, target: 'target/finalizer' });
const policy = runtime.createFinalizerPolicy({
  posture: 'deterministic',
  requiredClasses: ['test'],
  waitCapacitySeconds: 3_600,
  waitTargetSeconds: 3_600,
  refreshLimit: 2,
}).value;
const emptyDeterministicPolicy = runtime.createFinalizerPolicy({
  posture: 'deterministic',
  requiredClasses: [],
  waitCapacitySeconds: 3_600,
  waitTargetSeconds: 3_600,
  refreshLimit: 2,
}).value;
const nonePolicy = runtime.createFinalizerPolicy({
  posture: 'none',
  requiredClasses: [],
  waitCapacitySeconds: 3_600,
  waitTargetSeconds: 3_600,
  refreshLimit: 2,
}).value;

const makeWaiter = (key, ordinal, finalizerPolicy, candidateChar = 'e', waitedAt = 10) => {
  const story = `${run}/story/${key}`;
  const candidateContentDigest = stageDigest({
    domain: 'CANDIDATE-CONTENT',
    excludePaths: [],
    value: { targetBasisDigest: d('f'), changedPaths: [], treeDigest: d(candidateChar), workspaceCommit: null },
  }).value.digest;
  return {
    operation: operation(ordinal),
    run,
    story,
    candidate: `${story}/cand/1|${candidateContentDigest}`,
    candidateContentDigest,
    treeDigest: d(candidateChar),
    targetBasisDigest: d('f'),
    generation,
    comparator: { priority: 1, ordinal, story },
    eligibilityBasis: basis,
    acceptedPackageDigest: d('1'),
    policy: finalizerPolicy,
    waitedAt,
  };
};

const hash = (value) => createHash('sha256').update(value).digest('hex');
const manifestFor = (candidate, contentDigest, session) => {
  const basis = {
    configurationDigest: d('0'),
    schemaVersion: 'jig.evidence.v1',
    policy: {
      kind: 'fixture-policy',
      version: 'fixture-policy/v1',
      digest: d('e'),
      scanPolicyVersion: 'scan/v1',
      scanPolicyDigest: d('f'),
    },
    subjectKind: 'ID-CAND',
    subjectIdentity: candidate,
    subject: `evidence://${candidate}/claim/candidate-content`,
    claim: 'candidate-content',
    producer: { kind: 'principal', principal: 'principal/implementer', session },
    providerManifest: null,
    contentType: 'text/plain',
    contentClass: 'completeness-critical',
    completeness: 'complete',
    originalDigest: d('2'),
    artifactDigest: contentDigest,
    originalSize: 1,
    retainedSize: 1,
    loss: null,
    redaction: { policyVersion: 'scan/v1', status: 'none' },
    retention: { class: 'fixture', windowDays: 1, hold: null },
  };
  const artifactFact = { operation: operation(91), mode: 'put', position: 1, headDigest: d('4'), binding: 'binding' };
  return {
    ...basis,
    manifestDigest: hash(JSON.stringify({ basis, artifactFact, adoptionTransition: `${candidate}/transition` })),
    disposition: 'admitted',
    artifactFact,
    adoptionTransition: `${candidate}/transition`,
  };
};

const admissionFor = (waiter) => {
  const workspaceTransition = runtime.createWorkspaceTransitionRecorder();
  const workspaceController = runtime.createWorkspaceController({
    transition: workspaceTransition,
    fixture: runtime.createScriptedWorkspaceFixture(),
  });
  const workspaceOperation = operation(90 + waiter.comparator.ordinal);
  const workspaceBinding = {
    operation: workspaceOperation,
    operationType: 'OPC-WS-OBSERVE',
    subject: { run, story: waiter.story, basis: waiter.eligibilityBasis },
    repository: 'repository/finalizer-fixture',
    path: '/workspace/finalizer-fixture',
    basis: waiter.eligibilityBasis,
    recipeDigest: d('8'),
    inputFingerprintDigest: d('9'),
    host: 'host/finalizer-fixture',
    manifest: `provider/${d('3')}/authority/${d('4')}`,
  };
  const observed = workspaceController.observe({ binding: workspaceBinding });
  assert.equal(observed.ok, true, JSON.stringify(observed));
  const candidate = {
    schema: 'jig.sch-candidate.v1',
    id: waiter.candidate,
    run,
    story: waiter.story,
    role: 'implementer',
    session: `${waiter.story}/session/implementer/1`,
    principal: 'principal/implementer',
    sessionOrdinal: 1,
    assignmentOrdinal: 1,
    source: 'session-result',
    sourceEventKey: d('1'),
    sourceEvent: {
      event: 'EV-SESSION-RESULT',
      operation: `${operation(waiter.comparator.ordinal).slice(0, operation(waiter.comparator.ordinal).lastIndexOf('/op/'))}/op/1`,
      sessionOrdinal: 1,
      assignmentOrdinal: 1,
      commitProof: {
        kind: 'committed-witnessed',
        position: waiter.comparator.ordinal - 1,
        event: `${run}/event/${waiter.comparator.ordinal}`,
        transaction: operation(waiter.comparator.ordinal).slice(
          0,
          operation(waiter.comparator.ordinal).lastIndexOf('/op/'),
        ),
        recordDigest: d('5'),
        witnessDigest: d('5'),
      },
    },
    candidateCreationKey: '',
    runBasisDigest: waiter.eligibilityBasis,
    targetBasisDigest: waiter.targetBasisDigest,
    changedPaths: [],
    treeDigest: waiter.treeDigest,
    workspaceCommit: null,
    deliveryMetadata: {
      changedPaths: [],
      commitMessage: null,
      workspaceCommit: null,
      session: `${waiter.story}/session/implementer/1`,
    },
    deliveryMetadataDigest: '',
    evidenceManifestDigest: '',
    workspaceFingerprint: observed.value.workspaceFingerprint,
    workspaceFactDigest: observed.value.contentDigest,
    candidateContentDigest: waiter.candidateContentDigest,
    posture: waiter.policy.posture,
    generation: waiter.generation,
    authorizingTransition: operation(waiter.comparator.ordinal).slice(
      0,
      operation(waiter.comparator.ordinal).lastIndexOf('/op/'),
    ),
    commitProof: {
      kind: 'committed-witnessed',
      position: waiter.comparator.ordinal - 1,
      event: `${run}/event/${waiter.comparator.ordinal}`,
      transaction: operation(waiter.comparator.ordinal).slice(
        0,
        operation(waiter.comparator.ordinal).lastIndexOf('/op/'),
      ),
      recordDigest: d('5'),
      witnessDigest: d('5'),
    },
  };
  candidate.candidateCreationKey = stageDigest({
    domain: 'CANDIDATE-CREATION-KEY',
    excludePaths: [],
    value: {
      source: candidate.source,
      story: candidate.story,
      session: candidate.session,
      producerKey: candidate.sourceEventKey,
      candidateContentDigest: candidate.candidateContentDigest,
    },
  }).value.digest;
  candidate.deliveryMetadataDigest = stageDigest({
    domain: 'CANDIDATE-DELIVERY-METADATA',
    excludePaths: [],
    value: candidate.deliveryMetadata,
  }).value.digest;
  const manifest = manifestFor(candidate.id, candidate.candidateContentDigest, candidate.session);
  candidate.evidenceManifestDigest = manifest.manifestDigest;
  const evidenceDigest = runtime.deriveAcceptanceEvidenceDigest({
    schema: runtime.ACCEPTANCE_EVIDENCE_SCHEMA,
    manifest,
    manifestDigest: manifest.manifestDigest,
    candidate: candidate.id,
    candidateContentDigest: candidate.candidateContentDigest,
    targetBasisDigest: candidate.targetBasisDigest,
    disposition: 'admitted',
    availability: 'available',
  });
  assert.equal(evidenceDigest.ok, true, JSON.stringify(evidenceDigest));
  const publication = runtime.createExplicitAbsenceObservation({
    mode: 'no-venue',
    subject: {
      run,
      story: waiter.story,
      basis: waiter.eligibilityBasis,
      repository: 'repository/finalizer-fixture',
      candidate: candidate.id,
      candidateContentDigest: candidate.candidateContentDigest,
      targetBasisDigest: candidate.targetBasisDigest,
    },
  });
  assert.equal(publication.ok, true, JSON.stringify(publication));
  const requirementsDigest = runtime.deriveFrozenRequirementsDigest({
    requirements: ['finalize'],
    acceptanceCriteria: ['exact'],
  });
  const policyDigest = runtime.deriveAcceptancePolicyDigest({
    posture: waiter.policy.posture,
    reviewMode: 'no-venue',
    ruleSurfaceDigest: d('6'),
  });
  assert.equal(requirementsDigest.ok && policyDigest.ok, true);
  const acceptanceController = runtime.createScriptedAcceptanceController({ reworkLimit: 2 }).value;
  const assembled = acceptanceController.assemble({
    candidate,
    requirements: {
      schema: 'jig.frozen-requirements.v1',
      requirements: ['finalize'],
      acceptanceCriteria: ['exact'],
      digest: requirementsDigest.value,
    },
    evidence: {
      schema: runtime.ACCEPTANCE_EVIDENCE_SCHEMA,
      manifest,
      manifestDigest: manifest.manifestDigest,
      candidate: candidate.id,
      candidateContentDigest: candidate.candidateContentDigest,
      targetBasisDigest: candidate.targetBasisDigest,
      disposition: 'admitted',
      availability: 'available',
      integrityDigest: evidenceDigest.value,
    },
    publicationObservation: publication.value,
    policy: {
      schema: 'jig.acceptance-policy.v1',
      posture: waiter.policy.posture,
      reviewMode: 'no-venue',
      ruleSurfaceDigest: d('6'),
      digest: policyDigest.value,
    },
    findings: [],
    contributorPrincipals: [],
  });
  assert.equal(assembled.ok, true, JSON.stringify(assembled));
  const assignment = acceptanceController.assign({
    package: assembled.value,
    session: `${waiter.story}/session/reviewer/1`,
    principal: 'principal/reviewer',
  });
  assert.equal(assignment.ok, true, JSON.stringify(assignment));
  const verdict = acceptanceController.receiveVerdict({
    assignment: assignment.value,
    verdict: 'approve',
    findings: [],
  });
  assert.equal(verdict.ok, true, JSON.stringify(verdict));
  return { candidateCarrier: candidate, acceptanceController, workspaceController };
};

const verificationRequest = (waiter, ordinal, posture = 'deterministic', checkClass = 'test') => {
  const classes = checkClass === null ? [] : [{ name: checkClass, evidenceKind: 'test-report', bindingDigest: d('2') }];
  const policyDigest = runtime.deriveVerificationPolicyDigest({ posture, required: classes }).value;
  const configuration = {
    bindings: checkClass === null ? [] : [{ checkClass, bindingDigest: d('2') }],
    digest: runtime.deriveVerificationConfigurationDigest({
      bindings: checkClass === null ? [] : [{ checkClass, bindingDigest: d('2') }],
    }).value,
  };
  const environment = {
    fingerprint: 'environment/finalizer-fixture',
    declaredNames: [],
    digest: runtime.deriveVerificationEnvironmentDigest({
      fingerprint: 'environment/finalizer-fixture',
      declaredNames: [],
    }).value,
  };
  const cleanReceipt = {
    candidateContentDigest: waiter.candidateContentDigest,
    targetBasisDigest: waiter.targetBasisDigest,
    receiptDigest: runtime.deriveVerificationCleanReceiptDigest({
      candidateContentDigest: waiter.candidateContentDigest,
      targetBasisDigest: waiter.targetBasisDigest,
    }).value,
    checkout: 'read-only',
    scratch: 'discarded',
    network: 'none',
  };
  const fence = {
    generation: waiter.generation,
    basis: waiter.eligibilityBasis,
    candidateContentDigest: waiter.candidateContentDigest,
    targetBasisDigest: waiter.targetBasisDigest,
  };
  return Object.freeze({
    schema: runtime.VERIFICATION_REQUEST_SCHEMA,
    version: runtime.VERIFICATION_CONTRACT_VERSION,
    type: runtime.VERIFICATION_OPERATION,
    port: runtime.VERIFICATION_PORT,
    capability: runtime.VERIFICATION_CAPABILITY,
    operation: operation(ordinal),
    subject: {
      candidate: waiter.candidate,
      candidateContentDigest: waiter.candidateContentDigest,
      basisDigest: waiter.eligibilityBasis,
      checkClasses: classes.map((entry) => entry.name),
      configurationDigest: configuration.digest,
      environmentDigest: environment.digest,
      cleanReceiptDigest: cleanReceipt.receiptDigest,
    },
    fence,
    policy: { posture, required: classes, digest: policyDigest },
    configuration,
    environment,
    cleanReceipt,
    checkClass,
    lifecycle: 'Finalizing',
    retryOrdinal: 1,
    predecessor: null,
    bounds: { waitMs: 5_000, retryLimit: 2 },
  });
};

const permit = (request, ordinal) => {
  const capability = {
    kind: 'CB-VERIFY',
    port: 'PORT-VERIFY',
    operationClass: 'OPC-VERIFY-EXECUTE',
    subject: request.subject.candidate.split('/cand/')[0],
    fence: request.fence,
    resourceScope: 'verify/finalizer-fixture',
    manifest: `provider/${d('3')}/authority/${d('4')}`,
  };
  const derived = kernel.deriveOperationCapabilityDigest(capability);
  assert.equal(derived.ok, true);
  const transaction = request.operation.slice(0, request.operation.lastIndexOf('/op/'));
  return {
    version: 'jig.operation.v1',
    operation: request.operation,
    ordinal: 1,
    type: 'OPC-VERIFY-EXECUTE',
    subject: { run, story: request.subject.candidate.split('/cand/')[0], basis },
    fence: request.fence,
    capability: { ...capability, digest: derived.value },
    authority: null,
    role: 'controller',
    lifecycle: 'Finalizing',
    proof: {
      kind: 'committed-witnessed',
      position: ordinal - 1,
      event: `${run}/event/${ordinal}`,
      transaction,
      recordDigest: d('5'),
      witnessDigest: d('5'),
    },
    purpose: request.retryOrdinal > 1 ? 'replacement' : 'semantic',
    predecessor: request.predecessor,
  };
};

const attestation = (request, outcome = 'pass', overrides = {}) => ({
  schema: runtime.VERIFICATION_OBSERVATION_SCHEMA,
  version: runtime.VERIFICATION_CONTRACT_VERSION,
  kind: 'EV-CHECK-OBSERVATION',
  mechanism: runtime.VERIFICATION_MECHANISM,
  provider: 'fixture-only',
  operation: request.operation,
  subject: request.subject,
  fence: request.fence,
  checkClass: request.checkClass,
  outcome,
  evidenceKind: 'test-report',
  evidenceDigest: d('7'),
  artifactDigests: [],
  environmentDigest: request.environment.digest,
  cleanReceiptDigest: request.cleanReceipt.receiptDigest,
  effectFree: true,
  observedAt: 42,
  ...overrides,
});

const controllerFor = (waiter, requests = []) => {
  const permits = requests.map((request, index) => permit(request, index + 1));
  const verificationAuthorizer = {
    recordDispatch(input) {
      const value = permits.find((candidate) => candidate.operation === input.operation);
      return value ? { ok: true, value } : { ok: false, error: { family: 'FC-AUTHORITY', code: 'NOT_AUTHORIZED' } };
    },
  };
  const verification = runtime.createScriptedVerificationFixture(verificationAuthorizer);
  const registry = runtime.createScriptedRegistry();
  const controller = runtime.createScriptedFinalizerController({ binding, registry, verification });
  assert.equal(controller.ok, true);
  const admission = admissionFor(waiter);
  const enqueued = controller.value.enqueue({
    operation: waiter.operation,
    run: waiter.run,
    story: waiter.story,
    comparator: waiter.comparator,
    policy: waiter.policy,
    waitedAt: waiter.waitedAt,
    ...admission,
  });
  assert.equal(enqueued.ok, true, JSON.stringify(enqueued));
  const granted = controller.value.grant({
    operation: operation(waiter.comparator.ordinal + 100),
    story: waiter.story,
    waitedAt: waiter.waitedAt,
  });
  assert.equal(granted.ok, true, JSON.stringify(granted));
  return { controller: controller.value, verification, verificationAuthorizer, registry, authority: granted.value };
};

const targetFact = (
  operationId,
  outcome,
  anchorRegistry = null,
  targetBasisDigest = d('f'),
  target = binding.target,
) => ({
  schema: runtime.FINALIZER_EVENT_SCHEMA,
  kind: 'EV-TARGET-FACT',
  operation: operationId,
  target,
  registry: binding.registry,
  targetBasisDigest,
  anchorRegistry,
  outcome,
  observedAt: 2,
});

test('MC-043-INPUT: finalizer digest boundaries fail closed for circular, accessor, and proxy inputs', () => {
  const circularClasses = [];
  circularClasses.push(circularClasses);
  const circularInput = {
    posture: 'deterministic',
    requiredClasses: circularClasses,
    waitCapacitySeconds: 3_600,
    waitTargetSeconds: 3_600,
    refreshLimit: 2,
  };
  assert.doesNotThrow(() => runtime.deriveFinalizerPolicyDigest(circularInput));
  assert.equal(runtime.deriveFinalizerPolicyDigest(circularInput), undefined);

  const accessorClasses = [];
  Object.defineProperty(accessorClasses, 0, {
    enumerable: true,
    get() {
      throw new Error('hostile accessor');
    },
  });
  accessorClasses.length = 1;
  const accessorInput = { ...circularInput, requiredClasses: accessorClasses };
  assert.doesNotThrow(() => runtime.deriveFinalizerPolicyDigest(accessorInput));
  assert.equal(runtime.deriveFinalizerPolicyDigest(accessorInput), undefined);

  const hostileAuthority = new Proxy(
    {},
    {
      getPrototypeOf() {
        return Object.prototype;
      },
      ownKeys() {
        throw new Error('hostile proxy');
      },
    },
  );
  const waiter = makeWaiter('hostile-digest', 1, nonePolicy);
  const { controller } = controllerFor(waiter);
  const release = { authority: hostileAuthority, operation: operation(900), reason: 'rework' };
  let result;
  assert.doesNotThrow(() => {
    result = controller.release(release);
  });
  assert.deepEqual(result, {
    ok: false,
    error: { family: 'FC-FENCE', code: 'STALE_FINALIZER_RELEASE' },
  });
});

test('GF-043 entry consumes exact GF-042 request/observation and fences forged local lookalikes', () => {
  const waiter = makeWaiter('verify', 1, policy);
  const request = verificationRequest(waiter, 4);
  const { controller, authority } = controllerFor(waiter, [request]);
  const entry = controller.enterFinalizing({
    operation: operation(5),
    origin: 'Waiting',
    verificationRequests: [request],
  });
  assert.equal(entry.ok, true, JSON.stringify(entry));
  assert.equal(controller.authorizeAnchor({ operation: operation(6), authority }).ok, false);
  assert.equal(
    controller.observeVerification({
      authority,
      observation: { kind: 'EV-CHECK-OBSERVATION', operation: request.operation, checkClass: 'test' },
    }).ok,
    false,
  );
  const observed = controller.observeVerification({ authority, observation: attestation(request) });
  assert.equal(observed.ok, true, JSON.stringify(observed));
  assert.equal(controller.authorizeAnchor({ operation: operation(6), authority }).ok, true);
});

test('MC-043-ORDER/MC-043-FENCE: fully shaped forged candidate cannot enter before durable acceptance readback', () => {
  const waiter = makeWaiter('forged-admission', 1, nonePolicy);
  const admission = admissionFor(waiter);
  const forged = {
    ...admission.candidateCarrier,
    id: `${waiter.story}/cand/9|${d('z')}`,
    candidateContentDigest: d('z'),
  };
  const created = runtime.createScriptedFinalizerController({
    binding,
    verification: runtime.createScriptedVerificationFixture({ recordDispatch: () => ({ ok: false }) }),
  });
  assert.equal(created.ok, true);
  assert.equal(
    created.value.enqueue({
      operation: waiter.operation,
      run: waiter.run,
      story: waiter.story,
      comparator: waiter.comparator,
      policy: waiter.policy,
      waitedAt: waiter.waitedAt,
      candidateCarrier: forged,
      acceptanceController: admission.acceptanceController,
      workspaceController: admission.workspaceController,
    }).ok,
    false,
  );
});

test('CF-ORDER/CF-CAPACITY: comparator-least grant and durable waiter start enforce one holder and individual bounds', () => {
  const high = makeWaiter('high', 2, nonePolicy, '8', 100);
  const low = makeWaiter('low', 1, nonePolicy, '9', 10);
  const verification = runtime.createScriptedVerificationFixture({ recordDispatch: () => ({ ok: false }) });
  const created = runtime.createScriptedFinalizerController({ binding, verification });
  assert.equal(created.ok, true);
  const enqueue = (waiter) => {
    const admission = admissionFor(waiter);
    return created.value.enqueue({
      operation: waiter.operation,
      run: waiter.run,
      story: waiter.story,
      comparator: waiter.comparator,
      policy: waiter.policy,
      waitedAt: waiter.waitedAt,
      ...admission,
    });
  };
  assert.equal(enqueue(high).ok, true);
  assert.equal(enqueue(low).ok, true);
  assert.equal(created.value.grant({ operation: operation(10), story: high.story, waitedAt: 100 }).ok, false);
  assert.equal(created.value.grant({ operation: operation(11), story: low.story, waitedAt: 10 }).ok, true);
  assert.equal(created.value.grant({ operation: operation(12), story: high.story, waitedAt: 100 }).ok, false);
  assert.deepEqual(created.value.projection().authority.story, low.story);
});

test('MC-043-ENTRY: empty deterministic policy is a complete no-op distinct from none posture', () => {
  assert.equal(emptyDeterministicPolicy !== undefined, true);
  const waiter = makeWaiter('empty', 1, emptyDeterministicPolicy);
  const { controller, authority } = controllerFor(waiter);
  const entry = controller.enterFinalizing({ operation: operation(20), origin: 'Waiting', verificationRequests: [] });
  assert.equal(entry.ok, true);
  assert.equal(entry.value.noOp, false);
  assert.equal(entry.value.readyForDelivery, true);
  assert.deepEqual(entry.value.verificationOperations, []);
  assert.equal(controller.authorizeAnchor({ operation: operation(21), authority }).ok, true);
});

test('MC-043-VERIFY-GATE and release scope: failed exact observation creates the only rework prerequisite', () => {
  const waiter = makeWaiter('failure', 1, policy);
  const request = verificationRequest(waiter, 30);
  const { controller, authority } = controllerFor(waiter, [request]);
  const entry = controller.enterFinalizing({
    operation: operation(31),
    origin: 'Waiting',
    verificationRequests: [request],
  });
  assert.equal(entry.ok, true);
  assert.deepEqual(controller.release({ operation: operation(32), authority, reason: 'rework' }).error, {
    family: 'FC-AUTHORITY',
    code: 'RELEASE_PREREQUISITE_REQUIRED',
  });
  const observed = controller.observeVerification({ authority, observation: attestation(request, 'fail') });
  assert.equal(observed.ok, true, JSON.stringify(observed));
  assert.equal(controller.projection().status, 'Reworking');
  assert.equal(controller.release({ operation: operation(33), authority, reason: 'rework' }).ok, true);
});

test('MC-043-VERIFY-GATE/MC-043-RECOVERY: retry failure derives bounds and stages only an exact new-ID GF-042 request', () => {
  const waiter = makeWaiter('retry', 1, policy);
  const request = verificationRequest(waiter, 70);
  const replacement = {
    ...verificationRequest(waiter, 71),
    retryOrdinal: 2,
    predecessor: request.operation,
  };
  const { controller, verification, verificationAuthorizer, registry } = controllerFor(waiter, [request, replacement]);
  assert.equal(
    controller.enterFinalizing({ operation: operation(72), origin: 'Waiting', verificationRequests: [request] }).ok,
    true,
  );
  const failure = controller.recordVerificationFailure({
    operation: request.operation,
    reason: 'timeout',
    replacementRequest: replacement,
  });
  assert.equal(failure.ok, true, JSON.stringify(failure));
  assert.equal(
    controller.projection().entry.verificationOperations.some((item) => item.operation === replacement.operation),
    true,
  );
  const snapshot = controller.snapshot();
  const restored = runtime.restoreScriptedFinalizerController(snapshot, {
    binding,
    registry,
    verificationAuthorizer,
  });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.equal(
    restored.value.observeVerification({
      authority: restored.value.projection().authority,
      observation: attestation(replacement),
    }).ok,
    true,
  );
  assert.equal(verification.failures()[0].supersededBy, replacement.operation);
});

test('MC-043-RECOVERY: snapshot carries GF-042 state and registry witnesses; tampered local projection is rejected', () => {
  const waiter = makeWaiter('recovery', 1, nonePolicy);
  const request = verificationRequest(waiter, 40, 'none', null);
  const { controller, verification, verificationAuthorizer, registry } = controllerFor(waiter, [request]);
  const authority = controller.projection().authority;
  const entry = controller.enterFinalizing({
    operation: operation(41),
    origin: 'Waiting',
    verificationRequests: [request],
  });
  assert.equal(entry.ok, true);
  assert.equal(entry.value.noOp, true);
  assert.deepEqual(entry.value.verificationOperations, []);
  const snapshot = controller.snapshot();
  const restored = runtime.restoreScriptedFinalizerController(snapshot, {
    binding,
    registry,
    verificationAuthorizer,
  });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  const forgedVerificationSnapshot = {
    ...snapshot.verificationSnapshot,
    finalization: { ...snapshot.verificationSnapshot.finalization, readyForDelivery: false },
  };
  let originalPreviousDigest = d('0');
  const redigestedOriginal = snapshot.records.map((item) => {
    const previousDigest = originalPreviousDigest;
    const digestValue = stageDigest({
      domain: 'FINALIZER-RECORD',
      excludePaths: [],
      value: { position: item.position, previousDigest, record: item.record },
    }).value.digest;
    originalPreviousDigest = digestValue;
    return { ...item, previousDigest, digest: digestValue };
  });
  assert.equal(
    runtime.restoreScriptedFinalizerController(
      { ...snapshot, records: redigestedOriginal, verificationSnapshot: forgedVerificationSnapshot },
      { binding, registry, verificationAuthorizer },
    ).ok,
    false,
  );
  const changedRecords = snapshot.records.map((item) =>
    item.record.kind === 'grant'
      ? {
          ...item,
          record: {
            ...item.record,
            authority: { ...item.record.authority, candidate: `${waiter.story}/cand/9|${d('z')}` },
          },
        }
      : item,
  );
  let previousDigest = d('0');
  const redigested = changedRecords.map((item, index) => {
    const position = index + 1;
    const digestValue = stageDigest({
      domain: 'FINALIZER-RECORD',
      excludePaths: [],
      value: { position, previousDigest, record: item.record },
    }).value.digest;
    const result = { position, previousDigest, digest: digestValue, record: item.record };
    previousDigest = digestValue;
    return result;
  });
  const tampered = {
    ...snapshot,
    records: redigested,
    projection: {
      ...snapshot.projection,
      authority: redigested.find((item) => item.record.kind === 'grant').record.authority,
    },
  };
  assert.equal(
    runtime.restoreScriptedFinalizerController(tampered, { binding, registry, verificationAuthorizer }).ok,
    false,
  );
  assert.equal(verification.snapshot().finalization.state, 'Finalizing');
  assert.equal(authority !== null, true);
});

test('MC-043-RECOVERY/BND-WAIT-TARGET: wakes reread and append durable per-waiter park transitions', () => {
  const waiter = makeWaiter('wake', 1, nonePolicy, 'a', 100);
  const { controller } = controllerFor(waiter);
  const within = controller.wake({
    operation: operation(50),
    event: 'EV-WAKE-FINALIZATION',
    story: waiter.story,
    observedAt: 101,
  });
  assert.equal(within.ok, true);
  const exhausted = controller.wake({
    operation: operation(51),
    event: 'EV-WAKE-FINALIZATION',
    story: waiter.story,
    observedAt: 3_701,
  });
  assert.equal(exhausted.ok, true);
  assert.equal(controller.projection().status, 'TargetPark');
  assert.equal(
    controller.wake({ operation: operation(52), event: 'EV-WAKE-FINALIZATION', story: waiter.story, observedAt: 99 })
      .ok,
    false,
  );
});

test('MC-043-REFRESH: forged GF-040/workspace lookalikes and stale basis cannot rebind authority', () => {
  const waiter = makeWaiter('refresh', 1, nonePolicy);
  const admission = admissionFor(waiter);
  const request = verificationRequest(waiter, 60, 'none', null);
  const { controller, authority } = controllerFor(waiter, [request]);
  assert.equal(
    controller.enterFinalizing({ operation: operation(61), origin: 'Waiting', verificationRequests: [request] }).ok,
    true,
  );
  const anchor = controller.authorizeAnchor({ operation: operation(62), authority });
  assert.equal(anchor.ok, true);
  assert.equal(
    controller.recordTargetFact({
      authority,
      fact: targetFact(anchor.value.operation, 'conflict', `registry/${d('d')}`),
    }).ok,
    true,
  );
  const nextCandidate = { id: `${waiter.story}/cand/2|${d('b')}` };
  assert.equal(
    controller.refresh({
      operation: operation(63),
      authority,
      candidateCarrier: nextCandidate,
      acceptanceController: { projection: () => ({ state: 'Accepted' }), packages: () => [] },
      workspaceController: { facts: () => [] },
    }).ok,
    false,
  );
  const alteredCarrier = {
    ...admission.candidateCarrier,
    id: `${waiter.story}/cand/2|${waiter.candidateContentDigest}`,
    sourceEvent: {
      ...admission.candidateCarrier.sourceEvent,
      operation: `${d('z')}/op/1`,
    },
  };
  assert.equal(
    controller.refresh({
      operation: operation(64),
      authority,
      candidateCarrier: alteredCarrier,
      acceptanceController: admission.acceptanceController,
      workspaceController: admission.workspaceController,
    }).ok,
    false,
  );
  assert.equal(controller.projection().authority.targetBasisDigest, waiter.targetBasisDigest);
});

test('MC-043-FENCE: hostile nested acceptance manifest cannot escape finalizer readback validation', () => {
  const waiter = makeWaiter('hostile-acceptance-readback', 1, nonePolicy);
  const admission = admissionFor(waiter);
  const snapshot = admission.acceptanceController.snapshot();
  const circularBasis = {};
  circularBasis.self = circularBasis;
  const packageRecord = snapshot.records.find((entry) => entry.record.kind === 'package').record.package;
  const hostileBases = [
    circularBasis,
    {
      toJSON: () => {
        throw new Error('hostile manifest basis');
      },
    },
  ];
  const verification = runtime.createScriptedVerificationFixture({
    recordDispatch: () => ({ ok: false, error: { family: 'FC-AUTHORITY', code: 'NOT_AUTHORIZED' } }),
  });
  const created = runtime.createScriptedFinalizerController({
    binding,
    registry: runtime.createScriptedRegistry(),
    verification,
  });
  assert.equal(created.ok, true, JSON.stringify(created));
  for (const [index, hostileBasis] of hostileBases.entries()) {
    const hostileManifest = {
      ...packageRecord.evidenceManifest,
      retention: {
        ...packageRecord.evidenceManifest.retention,
        hold: { id: `hold/${index + 1}`, basis: hostileBasis, status: 'active' },
      },
    };
    const hostileSnapshot = {
      ...snapshot,
      records: snapshot.records.map((entry) =>
        entry.record.kind === 'package'
          ? {
              ...entry,
              record: { ...entry.record, package: { ...entry.record.package, evidenceManifest: hostileManifest } },
            }
          : entry,
      ),
    };
    assert.doesNotThrow(() => {
      const enqueued = created.value.enqueue({
        operation: waiter.operation,
        run: waiter.run,
        story: waiter.story,
        comparator: waiter.comparator,
        policy: waiter.policy,
        waitedAt: waiter.waitedAt,
        ...admission,
        acceptanceController: { snapshot: () => hostileSnapshot },
      });
      assert.equal(enqueued.ok, false);
    });
  }
});

test('MC-043-FENCE: configured non-default target is admitted and cross-target facts fail closed', () => {
  const waiter = makeWaiter('configured-target', 1, nonePolicy);
  const configuredBinding = Object.freeze({
    descriptor: d('d'),
    registry: `registry/${d('d')}`,
    target: 'target/configured',
  });
  const verification = runtime.createScriptedVerificationFixture({ recordDispatch: () => ({ ok: false }) });
  const registry = runtime.createScriptedRegistry();
  const created = runtime.createScriptedFinalizerController({ binding: configuredBinding, registry, verification });
  assert.equal(created.ok, true, JSON.stringify(created));
  const admission = admissionFor(waiter);
  assert.equal(
    created.value.enqueue({
      operation: waiter.operation,
      run: waiter.run,
      story: waiter.story,
      comparator: waiter.comparator,
      policy: waiter.policy,
      waitedAt: waiter.waitedAt,
      ...admission,
    }).ok,
    true,
  );
  const granted = created.value.grant({ operation: operation(101), story: waiter.story, waitedAt: waiter.waitedAt });
  assert.equal(granted.ok, true, JSON.stringify(granted));
  const request = verificationRequest(waiter, 103, 'none', null);
  assert.equal(
    created.value.enterFinalizing({ operation: operation(104), origin: 'Waiting', verificationRequests: [request] }).ok,
    true,
  );
  const anchor = created.value.authorizeAnchor({ operation: operation(102), authority: granted.value });
  assert.equal(anchor.ok, true, JSON.stringify(anchor));
  assert.equal(
    created.value.recordTargetFact({
      authority: granted.value,
      fact: targetFact(anchor.value.operation, 'same-registry', configuredBinding.registry, d('f'), binding.target),
    }).ok,
    false,
  );
});

test('MC-043-FENCE: finalizer stageDigest derivation fails closed on circular input', () => {
  const circular = [];
  circular.push(circular);
  assert.equal(
    runtime.deriveFinalizerPolicyDigest({
      posture: 'none',
      requiredClasses: circular,
      waitCapacitySeconds: 3_600,
      waitTargetSeconds: 3_600,
      refreshLimit: 2,
    }),
    undefined,
  );
});

test('MC-043-FENCE: finalizer stageDigest comparison fails closed during hostile restore', () => {
  const waiter = makeWaiter('hostile-digest-restore', 1, nonePolicy);
  const data = controllerFor(waiter);
  const circular = {};
  circular.self = circular;
  const snapshot = data.controller.snapshot();
  const restored = runtime.restoreScriptedFinalizerController(
    { ...snapshot, projection: { ...snapshot.projection, hostile: circular } },
    {
      binding,
      registry: data.registry,
      verificationAuthorizer: data.verificationAuthorizer,
    },
  );
  assert.deepEqual(restored.error, { family: 'FC-TRUST', code: 'FINALIZER_PROJECTION_DRIFT' });
});
