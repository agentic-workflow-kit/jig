import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { stageDigest } from '@agentic-workflow-kit/jig-codec';

const runtime = await import('../dist/index.js');
const kernel = await import('@agentic-workflow-kit/jig-authority-kernel');

const d = (character) => character.repeat(64);
const run = 'run-000000000044-0123456789abcdef';
const generation = `${run}/gen/1|controller`;
const basis = d('a');
const binding = Object.freeze({ descriptor: d('c'), registry: `registry/${d('c')}`, target: 'target/finalizer' });
const transition = (ordinal) => `${run}/txn/${ordinal}/${generation}|${basis}`;
const operation = (ordinal) => `${transition(ordinal)}/op/1`;
const policy = runtime.createFinalizerPolicy({
  posture: 'none',
  requiredClasses: [],
  waitCapacitySeconds: 3_600,
  waitTargetSeconds: 1_800,
  refreshLimit: 2,
}).value;

const hash = (value) => createHash('sha256').update(value).digest('hex');
const manifestFor = (candidate, contentDigest, session) => {
  const basisValue = {
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
    ...basisValue,
    manifestDigest: hash(
      JSON.stringify({ basis: basisValue, artifactFact, adoptionTransition: `${candidate}/transition` }),
    ),
    disposition: 'admitted',
    artifactFact,
    adoptionTransition: `${candidate}/transition`,
  };
};

const makeCandidate = (key, workspaceCommit = null) => {
  const story = `${run}/story/${key}`;
  const targetBasisDigest = d('f');
  const changedPaths = [];
  const treeDigest = d('e');
  const candidateContentDigest = stageDigest({
    domain: 'CANDIDATE-CONTENT',
    excludePaths: [],
    value: { targetBasisDigest, changedPaths, treeDigest, workspaceCommit },
  }).value.digest;
  const candidate = {
    schema: 'jig.sch-candidate.v1',
    id: `${story}/cand/1|${candidateContentDigest}`,
    run,
    story,
    role: 'implementer',
    session: `${story}/session/implementer/1`,
    principal: 'principal/implementer',
    sessionOrdinal: 1,
    assignmentOrdinal: 1,
    source: 'session-result',
    sourceEventKey: d('1'),
    sourceEvent: {
      event: 'EV-SESSION-RESULT',
      operation: `${transition(1)}/op/1`,
      sessionOrdinal: 1,
      assignmentOrdinal: 1,
      commitProof: {
        kind: 'committed-witnessed',
        position: 0,
        event: `${run}/event/1`,
        transaction: transition(1),
        recordDigest: d('5'),
        witnessDigest: d('5'),
      },
    },
    candidateCreationKey: '',
    runBasisDigest: basis,
    targetBasisDigest,
    changedPaths,
    treeDigest,
    workspaceCommit,
    deliveryMetadata: { changedPaths, commitMessage: null, workspaceCommit, session: `${story}/session/implementer/1` },
    deliveryMetadataDigest: '',
    evidenceManifestDigest: '',
    workspaceFingerprint: '',
    workspaceFactDigest: '',
    candidateContentDigest,
    posture: 'none',
    generation,
    authorizingTransition: transition(1),
    commitProof: {
      kind: 'committed-witnessed',
      position: 0,
      event: `${run}/event/1`,
      transaction: transition(1),
      recordDigest: d('5'),
      witnessDigest: d('5'),
    },
  };
  candidate.candidateCreationKey = stageDigest({
    domain: 'CANDIDATE-CREATION-KEY',
    excludePaths: [],
    value: {
      source: candidate.source,
      story,
      session: candidate.session,
      producerKey: candidate.sourceEventKey,
      candidateContentDigest,
    },
  }).value.digest;
  candidate.deliveryMetadataDigest = stageDigest({
    domain: 'CANDIDATE-DELIVERY-METADATA',
    excludePaths: [],
    value: candidate.deliveryMetadata,
  }).value.digest;
  return { candidate, targetBasisDigest, changedPaths, candidateContentDigest, story };
};

const makeAdmission = (key, workspaceCommit = null) => {
  const data = makeCandidate(key, workspaceCommit);
  const workspaceTransition = runtime.createWorkspaceTransitionRecorder();
  const workspaceController = runtime.createWorkspaceController({
    transition: workspaceTransition,
    fixture: runtime.createScriptedWorkspaceFixture(),
  });
  const observed = workspaceController.observe({
    binding: {
      operation: operation(90),
      operationType: 'OPC-WS-OBSERVE',
      subject: { run, story: data.story, basis },
      repository: 'repository/finalizer-fixture',
      path: '/workspace/finalizer-fixture',
      basis,
      recipeDigest: d('8'),
      inputFingerprintDigest: d('9'),
      host: 'host/finalizer-fixture',
      manifest: `provider/${d('3')}/authority/${d('4')}`,
    },
  });
  assert.equal(observed.ok, true, JSON.stringify(observed));
  data.candidate.workspaceFingerprint = observed.value.workspaceFingerprint;
  data.candidate.workspaceFactDigest = observed.value.contentDigest;
  const manifest = manifestFor(data.candidate.id, data.candidateContentDigest, data.candidate.session);
  data.candidate.evidenceManifestDigest = manifest.manifestDigest;
  const evidenceDigest = runtime.deriveAcceptanceEvidenceDigest({
    schema: runtime.ACCEPTANCE_EVIDENCE_SCHEMA,
    manifest,
    manifestDigest: manifest.manifestDigest,
    candidate: data.candidate.id,
    candidateContentDigest: data.candidateContentDigest,
    targetBasisDigest: data.targetBasisDigest,
    disposition: 'admitted',
    availability: 'available',
  });
  assert.equal(evidenceDigest.ok, true, JSON.stringify(evidenceDigest));
  const publication = runtime.createExplicitAbsenceObservation({
    mode: 'no-venue',
    subject: {
      run,
      story: data.story,
      basis,
      repository: 'repository/finalizer-fixture',
      candidate: data.candidate.id,
      candidateContentDigest: data.candidateContentDigest,
      targetBasisDigest: data.targetBasisDigest,
    },
  });
  assert.equal(publication.ok, true, JSON.stringify(publication));
  const requirementsDigest = runtime.deriveFrozenRequirementsDigest({
    requirements: ['finalize'],
    acceptanceCriteria: ['exact'],
  });
  const policyDigest = runtime.deriveAcceptancePolicyDigest({
    posture: 'none',
    reviewMode: 'no-venue',
    ruleSurfaceDigest: d('6'),
  });
  assert.equal(requirementsDigest.ok && policyDigest.ok, true);
  const acceptanceController = runtime.createScriptedAcceptanceController({ reworkLimit: 2 }).value;
  const assembled = acceptanceController.assemble({
    candidate: data.candidate,
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
      candidate: data.candidate.id,
      candidateContentDigest: data.candidateContentDigest,
      targetBasisDigest: data.targetBasisDigest,
      disposition: 'admitted',
      availability: 'available',
      integrityDigest: evidenceDigest.value,
    },
    publicationObservation: publication.value,
    policy: {
      schema: 'jig.acceptance-policy.v1',
      posture: 'none',
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
    session: `${data.story}/session/reviewer/1`,
    principal: 'principal/reviewer',
  });
  assert.equal(assignment.ok, true, JSON.stringify(assignment));
  const verdict = acceptanceController.receiveVerdict({
    assignment: assignment.value,
    verdict: 'approve',
    findings: [],
  });
  assert.equal(verdict.ok, true, JSON.stringify(verdict));
  const verificationRequest = {
    schema: runtime.VERIFICATION_REQUEST_SCHEMA,
    version: runtime.VERIFICATION_CONTRACT_VERSION,
    type: runtime.VERIFICATION_OPERATION,
    port: runtime.VERIFICATION_PORT,
    capability: runtime.VERIFICATION_CAPABILITY,
    operation: operation(4),
    subject: {
      candidate: data.candidate.id,
      candidateContentDigest: data.candidateContentDigest,
      basisDigest: basis,
      checkClasses: [],
      configurationDigest: runtime.deriveVerificationConfigurationDigest({ bindings: [] }).value,
      environmentDigest: runtime.deriveVerificationEnvironmentDigest({
        fingerprint: 'environment/delivery-fixture',
        declaredNames: [],
      }).value,
      cleanReceiptDigest: runtime.deriveVerificationCleanReceiptDigest({
        candidateContentDigest: data.candidateContentDigest,
        targetBasisDigest: data.targetBasisDigest,
      }).value,
    },
    fence: {
      generation,
      basis,
      candidateContentDigest: data.candidateContentDigest,
      targetBasisDigest: data.targetBasisDigest,
    },
    policy: {
      posture: 'none',
      required: [],
      digest: runtime.deriveVerificationPolicyDigest({ posture: 'none', required: [] }).value,
    },
    configuration: { bindings: [], digest: runtime.deriveVerificationConfigurationDigest({ bindings: [] }).value },
    environment: {
      fingerprint: 'environment/delivery-fixture',
      declaredNames: [],
      digest: runtime.deriveVerificationEnvironmentDigest({
        fingerprint: 'environment/delivery-fixture',
        declaredNames: [],
      }).value,
    },
    cleanReceipt: {
      candidateContentDigest: data.candidateContentDigest,
      targetBasisDigest: data.targetBasisDigest,
      receiptDigest: runtime.deriveVerificationCleanReceiptDigest({
        candidateContentDigest: data.candidateContentDigest,
        targetBasisDigest: data.targetBasisDigest,
      }).value,
      checkout: 'read-only',
      scratch: 'discarded',
      network: 'none',
    },
    checkClass: null,
    lifecycle: 'Finalizing',
    retryOrdinal: 1,
    predecessor: null,
    bounds: { waitMs: 5_000, retryLimit: 2 },
  };
  const capability = {
    kind: 'CB-VERIFY',
    port: 'PORT-VERIFY',
    operationClass: 'OPC-VERIFY-EXECUTE',
    subject: data.story,
    fence: verificationRequest.fence,
    resourceScope: 'verify/delivery-fixture',
    manifest: `provider/${d('3')}/authority/${d('4')}`,
  };
  const capDigest = kernel.deriveOperationCapabilityDigest(capability);
  assert.equal(capDigest.ok, true);
  const permit = {
    version: 'jig.operation.v1',
    operation: verificationRequest.operation,
    ordinal: 1,
    type: 'OPC-VERIFY-EXECUTE',
    subject: { run, story: data.story, basis },
    fence: verificationRequest.fence,
    capability: { ...capability, digest: capDigest.value },
    authority: null,
    role: 'controller',
    lifecycle: 'Finalizing',
    proof: {
      kind: 'committed-witnessed',
      position: 3,
      event: `${run}/event/4`,
      transaction: transition(4),
      recordDigest: d('5'),
      witnessDigest: d('5'),
    },
    purpose: 'semantic',
    predecessor: null,
  };
  const verificationAuthorizer = {
    recordDispatch: (input) =>
      input.operation === verificationRequest.operation
        ? { ok: true, value: permit }
        : { ok: false, error: { family: 'FC-AUTHORITY', code: 'NOT_AUTHORIZED' } },
  };
  const verification = runtime.createScriptedVerificationFixture(verificationAuthorizer);
  const registry = runtime.createScriptedRegistry();
  const finalizer = runtime.createScriptedFinalizerController({ binding, registry, verification });
  assert.equal(finalizer.ok, true, JSON.stringify(finalizer));
  const enqueued = finalizer.value.enqueue({
    operation: operation(1),
    run,
    story: data.story,
    comparator: { priority: 1, ordinal: 1, story: data.story },
    policy,
    waitedAt: 10,
    candidateCarrier: data.candidate,
    acceptanceController,
    workspaceController,
  });
  assert.equal(enqueued.ok, true, JSON.stringify(enqueued));
  const granted = finalizer.value.grant({ operation: operation(2), story: data.story, waitedAt: 10 });
  assert.equal(granted.ok, true, JSON.stringify(granted));
  const entry = finalizer.value.enterFinalizing({
    operation: operation(3),
    origin: 'Waiting',
    verificationRequests: [verificationRequest],
  });
  assert.equal(entry.ok, true, JSON.stringify(entry));
  const anchorCarrier = finalizer.value.authorizeAnchor({ operation: operation(6), authority: granted.value });
  assert.equal(anchorCarrier.ok, true, JSON.stringify(anchorCarrier));
  return {
    ...data,
    candidate: data.candidate,
    acceptanceController,
    finalizer: finalizer.value,
    registry,
    verificationAuthorizer,
    strategy: null,
  };
};

const factEffect = (data, op, type, outcome, result = {}, observedAt = 10, failurePhase = null) => ({
  schema: runtime.DELIVERY_EVENT_SCHEMA,
  kind: 'EV-EFFECT-CERTAINTY',
  operation: op,
  type,
  target: binding.target,
  registry: binding.registry,
  candidate: data.candidate.id,
  candidateContentDigest: data.candidateContentDigest,
  targetBasisDigest: data.targetBasisDigest,
  correlationKey: `corr/${op.split('/').at(-4)}`,
  outcome,
  observedAt,
  failurePhase,
  result,
});
const factObservation = (data, op, subject, outcome, resolvesOperation, result = {}, observedAt = 20) => ({
  schema: runtime.DELIVERY_EVENT_SCHEMA,
  kind: subject === 'target' ? 'EV-TARGET-FACT' : 'EV-DELIVERY-OBSERVATION',
  operation: op,
  subject,
  target: binding.target,
  registry: binding.registry,
  candidate: data.candidate.id,
  candidateContentDigest: data.candidateContentDigest,
  targetBasisDigest: data.targetBasisDigest,
  correlationKey: `corr/${op.split('/').at(-4)}`,
  resolvesOperation,
  outcome,
  observedAt,
  result,
});
const request = (data, op, type, ordinal) => ({
  operation: op,
  type,
  target: binding.target,
  registry: binding.registry,
  candidate: data.candidate.id,
  candidateContentDigest: data.candidateContentDigest,
  targetBasisDigest: data.targetBasisDigest,
  generation,
  authority: data.finalizer.projection().authority.authority,
  transition: transition(100 + ordinal),
  strategy: data.strategy,
  correlationKey: `corr/${op.split('/').at(-4)}`,
});

const makeController = (
  mode = 'merge-commit',
  key = `delivery-${mode}`,
  workspaceCommit = null,
  offset = 0,
  uncertainMerge = false,
  heldMerge = false,
) => {
  const data = makeAdmission(key, workspaceCommit);
  data.strategy = mode;
  const digest = runtime.deriveDeliveryStrategyDigest(mode);
  const effects = [];
  const addEffect = (ordinal, type, outcome = 'success', result = {}, observedAt = 10, failurePhase = null) =>
    effects.push(factEffect(data, operation(offset + ordinal), type, outcome, result, observedAt, failurePhase));
  addEffect(1, 'OPC-DEL-ANCHOR', 'success', { anchorRegistry: binding.registry });
  addEffect(2, 'OPC-DEL-PUBLISH');
  addEffect(3, 'OPC-DEL-REQUEST');
  addEffect(4, 'OPC-DEL-STATUS');
  addEffect(5, 'OPC-DEL-COMMENT');
  addEffect(6, 'OPC-DEL-MERGE', uncertainMerge ? 'uncertain' : heldMerge ? 'held' : 'success', {}, 10);
  const changedPathsDigest = runtime.deriveDeliveryChangeSetDigest({
    targetBasisDigest: data.targetBasisDigest,
    changedPaths: [],
  });
  const targetResult =
    mode === 'direct-fast-forward'
      ? { commit: workspaceCommit, contentDigest: data.candidateContentDigest }
      : { treeDigest: data.candidateContentDigest, changedPathsDigest };
  const observations = uncertainMerge
    ? [factObservation(data, operation(offset + 7), 'effect', 'absent', operation(offset + 6), {}, 20)]
    : heldMerge
      ? [
          factObservation(data, operation(offset + 7), 'target', 'held', operation(offset + 6), {}, 100),
          factObservation(data, operation(offset + 8), 'target', 'held', operation(offset + 6), {}, 1_900),
        ]
      : [factObservation(data, operation(offset + 7), 'target', 'ready', operation(offset + 6), targetResult, 20)];
  const mechanism = runtime.createScriptedDeliveryMechanism({ effects, observations });
  assert.equal(mechanism.ok, true, JSON.stringify(mechanism));
  const controller = runtime.createScriptedDeliveryController({
    acceptanceSnapshot: data.acceptanceController.snapshot(),
    binding,
    finalizerSnapshot: data.finalizer.snapshot(),
    registry: data.registry,
    strategy: { mode, digest: digest },
    verificationAuthorizer: data.verificationAuthorizer,
    mechanism: mechanism.value,
    initialSnapshot: undefined,
  });
  assert.equal(controller.ok, true, JSON.stringify(controller));
  return {
    ...data,
    controller: controller.value,
    mechanism: mechanism.value,
    operations: {
      anchor: operation(offset + 1),
      publish: operation(offset + 2),
      request: operation(offset + 3),
      status: operation(offset + 4),
      comment: operation(offset + 5),
      merge: operation(offset + 6),
      observe: operation(offset + 7),
      observe2: operation(offset + 8),
    },
    mode,
    changedPathsDigest,
    targetResult,
  };
};

const authorizeAndDispatch = (data, type, op, ordinal) => {
  const authorized = data.controller.authorize(request(data, op, type, ordinal));
  assert.equal(authorized.ok, true, JSON.stringify(authorized));
  const dispatched = data.controller.dispatch({ operation: op });
  assert.equal(dispatched.ok, true, JSON.stringify(dispatched));
};

test('CF-MECH-DELIVERY/MC-044-02: all final-delivery operations are fenced, durable, and provider-attested', () => {
  const data = makeController();
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
  authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
  authorizeAndDispatch(data, 'OPC-DEL-STATUS', data.operations.status, 4);
  authorizeAndDispatch(data, 'OPC-DEL-COMMENT', data.operations.comment, 5);
  authorizeAndDispatch(data, 'OPC-DEL-MERGE', data.operations.merge, 6);
  const observed = data.controller.authorize(request(data, data.operations.observe, 'OPC-DEL-OBSERVE', 7));
  assert.equal(observed.ok, true, JSON.stringify(observed));
  assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'target' }).ok, true);
  const landed = data.controller.recordLanded({
    operation: operation(99),
    mergeOperation: data.operations.merge,
    targetObservationOperation: data.operations.observe,
  });
  assert.equal(landed.ok, true, JSON.stringify(landed));
  assert.equal(data.controller.projection().status, 'Landed');
  assert.deepEqual(data.controller.projection().releasedStories, [data.story]);
  assert.equal(data.controller.reachability().landingEnabled, false);
});

test('GF044-MC-01/MC-03/CF-DOUBLE-EFFECT: wrong binding, exact intent replay, and response uncertainty fail closed', () => {
  const data = makeController('merge-commit', 'delivery-uncertain', null, 100, true);
  const bad = data.controller.authorize({
    ...request(data, data.operations.anchor, 'OPC-DEL-ANCHOR', 1),
    target: 'target/other',
  });
  assert.deepEqual(bad.error, { family: 'FC-FENCE', code: 'DELIVERY_OPERATION_FENCE_MISMATCH' });
  const first = data.controller.authorize(request(data, data.operations.anchor, 'OPC-DEL-ANCHOR', 1));
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(data.controller.authorize(request(data, data.operations.anchor, 'OPC-DEL-ANCHOR', 1)).ok, true);
  assert.equal(data.controller.dispatch({ operation: data.operations.anchor }).ok, true);
  assert.equal(data.controller.dispatch({ operation: data.operations.anchor }).ok, false);
  authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
  authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
  const merge = data.controller.authorize(request(data, data.operations.merge, 'OPC-DEL-MERGE', 6));
  assert.equal(merge.ok, true, JSON.stringify(merge));
  assert.equal(data.controller.dispatch({ operation: data.operations.merge }).ok, true);
  assert.equal(data.controller.projection().status, 'Recovering');
  assert.equal(data.controller.authorize(request(data, data.operations.status, 'OPC-DEL-STATUS', 4)).ok, false);
});

test('GF044-MC-04: crash/replay reconciles an uncertain effect with an effect-free observation and permits only a new ID-OP', () => {
  const data = makeController('merge-commit', 'delivery-recovery', null, 200, true);
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
  authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
  const merge = data.controller.authorize(request(data, data.operations.merge, 'OPC-DEL-MERGE', 6));
  assert.equal(merge.ok, true);
  assert.equal(data.controller.dispatch({ operation: data.operations.merge }).ok, true);
  const recovered = runtime.restoreScriptedDeliveryController(data.controller.snapshot(), {
    acceptanceSnapshot: data.acceptanceController.snapshot(),
    binding,
    finalizerSnapshot: data.finalizer.snapshot(),
    registry: data.registry,
    strategy: { mode: data.mode, digest: runtime.deriveDeliveryStrategyDigest(data.mode) },
    verificationAuthorizer: data.verificationAuthorizer,
    mechanism: data.mechanism,
  });
  assert.equal(recovered.ok, true, JSON.stringify(recovered));
  const observation = recovered.value.authorize(request(data, data.operations.observe, 'OPC-DEL-OBSERVE', 7));
  assert.equal(observation.ok, true, JSON.stringify(observation));
  const recoveredObservation = recovered.value.observe({ operation: data.operations.observe, subject: 'effect' });
  assert.equal(recoveredObservation.ok, true, JSON.stringify(recoveredObservation));
  assert.equal(recovered.value.projection().status, 'Ready');
  const replacement = operation(209);
  assert.equal(recovered.value.authorize(request(data, replacement, 'OPC-DEL-MERGE', 9)).ok, true);
  assert.equal(recovered.value.authorize(request(data, data.operations.merge, 'OPC-DEL-MERGE', 6)).ok, true);
  assert.equal(recovered.value.dispatch({ operation: data.operations.merge }).ok, false);
});

test('GF044-MC-05/MC-06/LP-EQUIV: all four frozen integration strategies require authoritative post-effect content proof', () => {
  for (const [index, mode] of ['direct-fast-forward', 'merge-commit', 'squash', 'merge-queue'].entries()) {
    const data = makeController(
      mode,
      `delivery-${mode}`,
      mode === 'direct-fast-forward' ? 'commit/workspace' : null,
      300 + index * 20,
    );
    authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
    authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
    authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
    authorizeAndDispatch(data, 'OPC-DEL-MERGE', data.operations.merge, 6);
    assert.equal(data.controller.authorize(request(data, data.operations.observe, 'OPC-DEL-OBSERVE', 7)).ok, true);
    assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'target' }).ok, true);
    assert.equal(
      data.controller.recordLanded({
        operation: operation(399 + index),
        mergeOperation: data.operations.merge,
        targetObservationOperation: data.operations.observe,
      }).ok,
      true,
    );
  }
});

test('GF044-MC-08/BND-WAIT-TARGET: held integration re-observes and parks at the governed bound without re-requesting merge', () => {
  const data = makeController('merge-commit', 'delivery-held', null, 500, false, true);
  authorizeAndDispatch(data, 'OPC-DEL-ANCHOR', data.operations.anchor, 1);
  authorizeAndDispatch(data, 'OPC-DEL-PUBLISH', data.operations.publish, 2);
  authorizeAndDispatch(data, 'OPC-DEL-REQUEST', data.operations.request, 3);
  authorizeAndDispatch(data, 'OPC-DEL-MERGE', data.operations.merge, 6);
  assert.equal(data.controller.authorize(request(data, data.operations.observe, 'OPC-DEL-OBSERVE', 7)).ok, true);
  assert.equal(data.controller.observe({ operation: data.operations.observe, subject: 'target' }).ok, true);
  assert.equal(data.controller.authorize(request(data, operation(509), 'OPC-DEL-MERGE', 9)).ok, false);
  assert.equal(data.controller.authorize(request(data, data.operations.observe2, 'OPC-DEL-OBSERVE', 8)).ok, true);
  assert.equal(data.controller.observe({ operation: data.operations.observe2, subject: 'target' }).ok, true);
  assert.equal(data.controller.projection().status, 'Parked');
  assert.equal(data.controller.wake({ operation: data.operations.observe2, at: 1_900 }).ok, false);
});

test('GF044-MC-07: GF-043 target wait bounds are corrected to 1 minute through 24 hours', () => {
  assert.equal(
    runtime.createFinalizerPolicy({
      posture: 'none',
      requiredClasses: [],
      waitCapacitySeconds: 3_600,
      waitTargetSeconds: 59,
      refreshLimit: 1,
    }).ok,
    false,
  );
  assert.equal(
    runtime.createFinalizerPolicy({
      posture: 'none',
      requiredClasses: [],
      waitCapacitySeconds: 3_600,
      waitTargetSeconds: 60,
      refreshLimit: 1,
    }).ok,
    true,
  );
  assert.equal(
    runtime.createFinalizerPolicy({
      posture: 'none',
      requiredClasses: [],
      waitCapacitySeconds: 3_600,
      waitTargetSeconds: 86_400,
      refreshLimit: 1,
    }).ok,
    true,
  );
  assert.equal(
    runtime.createFinalizerPolicy({
      posture: 'none',
      requiredClasses: [],
      waitCapacitySeconds: 3_600,
      waitTargetSeconds: 86_401,
      refreshLimit: 1,
    }).ok,
    false,
  );
});
