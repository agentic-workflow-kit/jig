import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { stageDigest } from '@agentic-workflow-kit/jig-codec';

const runtime = await import('../dist/index.js');

const digest = (character) => character.repeat(64);
const run = 'run-000000000045-0123456789abcdef';
const story = `${run}/story/gf045`;
const generation = `${run}/gen/1|controller`;
const candidate = `${story}/cand/1|${digest('b')}`;
const transaction = (ordinal) => `${run}/txn/${ordinal}/${run}/gen/1|controller|${digest('a')}`;
const operation = (ordinal) => `${transaction(ordinal)}/op/1`;
const request = operation(2);
const marker = Object.freeze({ kind: 'status', identity: 'marker/block/gf045', context: 'jig-blocked-v1' });
const subject = Object.freeze({
  run,
  story,
  generation,
  outcome: 'Blocked',
  scope: 'review-publication',
  candidate,
  request,
  ref: 'refs/heads/feature',
  authority: null,
  fence: null,
  dependencyStories: Object.freeze([]),
  owner: 'principal/arye',
  reason: 'dependency remains blocked after bounded delivery attempts',
  startedAt: 1_000,
  deadline: 2_000,
});
const reviewBindingOperation = operation(5);
const reviewBindingTransition = transaction(5);
const reviewBinding = Object.freeze({
  operation: reviewBindingOperation,
  operationType: 'OPC-REV-STATUS',
  mode: 'required-venue',
  subject: Object.freeze({
    run,
    story,
    basis: digest('c'),
    repository: 'repository/fixture-main',
    candidate,
    candidateContentDigest: digest('b'),
    targetBasisDigest: digest('d'),
  }),
  repository: 'repository/fixture-main',
  candidate,
  candidateContentDigest: digest('b'),
  targetBasisDigest: digest('d'),
  providerIdentity: 'fixture-provider/v1',
  sourceRef: 'refs/heads/feature',
  targetRef: 'refs/heads/main',
  reviewRef: 'refs/jig/review/gf045',
  request: { identity: request, marker: 'jig-review-request-gf045', draft: true, mergeable: false },
  markers: { status: marker.context, comment: 'jig-blocked-comment' },
  explanationDigest: digest('e'),
  fence: {
    generation,
    basis: digest('c'),
    candidateContentDigest: digest('b'),
    targetBasisDigest: digest('d'),
  },
  generation,
  manifest: `provider/${digest('f')}/authority/${digest('e')}`,
  transition: {
    kind: 'review-publication-transition',
    authorizer: 'CP-TRANSITION',
    controller: 'RT-CONTROLLER',
    lifecycle: 'Blocked',
    operation: reviewBindingOperation,
    proof: {
      kind: 'committed-witnessed',
      position: 4,
      event: `${run}/event/5`,
      transaction: reviewBindingTransition,
      operation: reviewBindingOperation,
      recordDigest: digest('a'),
      witnessDigest: digest('a'),
    },
  },
  authority: null,
});
const reviewScope = Object.freeze({ kind: 'review-publication', binding: reviewBinding });
const finalAuthority = 'target/finalizer/auth/1';
const finalOperation = `${transaction(2)}/op/2`;
const finalBindingDescriptor = digest('a');
const finalBindingRegistry = `registry/${finalBindingDescriptor}`;
const finalBindingTarget = 'target/finalizer';
const finalAcceptedPackageDigest = digest('e');
const finalRemoteGateBasis = {
  schema: 'jig.delivery-gate-requirement.v1',
  required: false,
  subject: null,
  correlationKey: null,
  resourceIdentity: null,
  maxAgeSeconds: null,
  asOf: null,
  acceptedPackageDigest: finalAcceptedPackageDigest,
  candidate,
  targetBasisDigest: digest('d'),
  generation,
  authority: finalAuthority,
  registry: finalBindingRegistry,
  target: finalBindingTarget,
};
const realPredecessor = (() => {
  const durableCandidateContentDigest = stageDigest({
    domain: 'CANDIDATE-CONTENT',
    excludePaths: [],
    value: { targetBasisDigest: digest('d'), changedPaths: [], treeDigest: digest('a'), workspaceCommit: null },
  }).value.digest;
  const candidate = `${story}/cand/1|${durableCandidateContentDigest}`;
  const candidateRecord = {
    schema: 'jig.sch-candidate.v1',
    id: candidate,
    run,
    story,
    role: 'implementer',
    session: `${story}/session/implementer/1`,
    principal: 'principal/arye',
    sessionOrdinal: 1,
    assignmentOrdinal: 1,
    source: 'session-result',
    sourceEventKey: digest('1'),
    sourceEvent: {
      event: 'EV-SESSION-RESULT',
      operation: operation(1),
      sessionOrdinal: 1,
      assignmentOrdinal: 1,
      commitProof: {
        kind: 'committed-witnessed',
        position: 0,
        event: `${run}/event/1`,
        transaction: transaction(1),
        recordDigest: digest('5'),
        witnessDigest: digest('5'),
      },
    },
    candidateCreationKey: '',
    runBasisDigest: digest('0'),
    targetBasisDigest: digest('d'),
    changedPaths: [],
    treeDigest: digest('a'),
    workspaceCommit: null,
    deliveryMetadata: {
      changedPaths: [],
      commitMessage: null,
      workspaceCommit: null,
      session: `${story}/session/implementer/1`,
    },
    deliveryMetadataDigest: '',
    evidenceManifestDigest: digest('f'),
    workspaceFingerprint: digest('1'),
    workspaceFactDigest: digest('2'),
    candidateContentDigest: durableCandidateContentDigest,
    posture: 'none',
    generation,
    authorizingTransition: transaction(1),
    commitProof: {
      kind: 'committed-witnessed',
      position: 0,
      event: `${run}/event/1`,
      transaction: transaction(1),
      recordDigest: digest('5'),
      witnessDigest: digest('5'),
    },
  };
  candidateRecord.deliveryMetadataDigest = stageDigest({
    domain: 'CANDIDATE-DELIVERY-METADATA',
    excludePaths: [],
    value: candidateRecord.deliveryMetadata,
  }).value.digest;
  candidateRecord.candidateCreationKey = stageDigest({
    domain: 'CANDIDATE-CREATION-KEY',
    excludePaths: [],
    value: {
      source: candidateRecord.source,
      story,
      session: candidateRecord.session,
      producerKey: candidateRecord.sourceEventKey,
      candidateContentDigest: durableCandidateContentDigest,
    },
  }).value.digest;
  const workspaceTransition = runtime.createWorkspaceTransitionRecorder();
  const workspaceController = runtime.createWorkspaceController({
    transition: workspaceTransition,
    fixture: runtime.createScriptedWorkspaceFixture(),
  });
  const workspaceObservation = workspaceController.observe({
    binding: {
      operation: operation(90),
      operationType: 'OPC-WS-OBSERVE',
      subject: { run, story, basis: digest('0') },
      repository: 'repository/fixture-main',
      path: '/workspace/fixture-main',
      basis: digest('0'),
      recipeDigest: digest('8'),
      inputFingerprintDigest: digest('9'),
      host: 'host/fixture-main',
      manifest: `provider/${digest('3')}/authority/${digest('4')}`,
    },
  });
  assert.equal(workspaceObservation.ok, true, JSON.stringify(workspaceObservation));
  candidateRecord.workspaceFingerprint = workspaceObservation.value.workspaceFingerprint;
  candidateRecord.workspaceFactDigest = workspaceObservation.value.contentDigest;
  const manifestBasis = {
    configurationDigest: digest('0'),
    schemaVersion: 'jig.evidence.v1',
    policy: {
      kind: 'fixture-policy',
      version: 'fixture-policy/v1',
      digest: digest('e'),
      scanPolicyVersion: 'scan/v1',
      scanPolicyDigest: digest('f'),
    },
    subjectKind: 'ID-CAND',
    subjectIdentity: candidate,
    subject: `evidence://${candidate}/claim/candidate-content`,
    claim: 'candidate-content',
    producer: { kind: 'principal', principal: 'principal/arye', session: candidateRecord.session },
    providerManifest: null,
    contentType: 'text/plain',
    contentClass: 'completeness-critical',
    completeness: 'complete',
    originalDigest: digest('2'),
    artifactDigest: durableCandidateContentDigest,
    originalSize: 1,
    retainedSize: 1,
    loss: null,
    redaction: { policyVersion: 'scan/v1', status: 'none' },
    retention: { class: 'fixture', windowDays: 1, hold: null },
  };
  const artifactFact = {
    operation: operation(91),
    mode: 'put',
    position: 1,
    headDigest: digest('4'),
    binding: 'binding',
  };
  const manifestDigest = createHash('sha256')
    .update(JSON.stringify({ basis: manifestBasis, artifactFact, adoptionTransition: `${candidate}/transition` }))
    .digest('hex');
  const manifest = {
    ...manifestBasis,
    manifestDigest,
    disposition: 'admitted',
    artifactFact,
    adoptionTransition: `${candidate}/transition`,
  };
  candidateRecord.evidenceManifestDigest = manifestDigest;
  const acceptance = runtime.createScriptedAcceptanceController({ reworkLimit: 2 }).value;
  const requirementsDigest = runtime.deriveFrozenRequirementsDigest({
    requirements: ['finalize'],
    acceptanceCriteria: ['exact'],
  }).value;
  const policyDigest = runtime.deriveAcceptancePolicyDigest({
    posture: 'none',
    reviewMode: 'no-venue',
    ruleSurfaceDigest: digest('6'),
  }).value;
  const evidenceDigest = runtime.deriveAcceptanceEvidenceDigest({
    schema: runtime.ACCEPTANCE_EVIDENCE_SCHEMA,
    manifest,
    manifestDigest,
    candidate,
    candidateContentDigest: durableCandidateContentDigest,
    targetBasisDigest: digest('d'),
    disposition: 'admitted',
    availability: 'available',
  }).value;
  const publication = runtime.createExplicitAbsenceObservation({
    mode: 'no-venue',
    subject: {
      run,
      story,
      basis: digest('c'),
      repository: 'repository/fixture-main',
      candidate,
      candidateContentDigest: durableCandidateContentDigest,
      targetBasisDigest: digest('d'),
    },
  }).value;
  const assembled = acceptance.assemble({
    candidate: candidateRecord,
    requirements: {
      schema: 'jig.frozen-requirements.v1',
      requirements: ['finalize'],
      acceptanceCriteria: ['exact'],
      digest: requirementsDigest,
    },
    evidence: {
      schema: runtime.ACCEPTANCE_EVIDENCE_SCHEMA,
      manifest,
      manifestDigest,
      candidate,
      candidateContentDigest: durableCandidateContentDigest,
      targetBasisDigest: digest('d'),
      disposition: 'admitted',
      availability: 'available',
      integrityDigest: evidenceDigest,
    },
    publicationObservation: publication,
    policy: {
      schema: 'jig.acceptance-policy.v1',
      posture: 'none',
      reviewMode: 'no-venue',
      ruleSurfaceDigest: digest('6'),
      digest: policyDigest,
    },
    findings: [],
    contributorPrincipals: [],
  });
  assert.equal(assembled.ok, true, JSON.stringify(assembled));
  const assignment = acceptance.assign({
    package: assembled.value,
    session: `${story}/session/reviewer/1`,
    principal: 'principal/reviewer',
  });
  assert.equal(assignment.ok, true, JSON.stringify(assignment));
  assert.equal(acceptance.receiveVerdict({ assignment: assignment.value, verdict: 'approve', findings: [] }).ok, true);
  const verification = runtime.createScriptedVerificationFixture({
    recordDispatch: () => ({ ok: false, error: { family: 'FC-AUTHORITY', code: 'NOT_AUTHORIZED' } }),
  });
  const registry = runtime.createScriptedRegistry();
  const finalizerPolicy = runtime.createFinalizerPolicy({
    posture: 'none',
    requiredClasses: [],
    waitCapacitySeconds: 3_600,
    waitTargetSeconds: 1_800,
    refreshLimit: 2,
  }).value;
  const finalizer = runtime.createScriptedFinalizerController({
    binding: { descriptor: finalBindingDescriptor, registry: finalBindingRegistry, target: finalBindingTarget },
    registry,
    verification,
  }).value;
  const waiter = finalizer.enqueue({
    operation: operation(1),
    run,
    story,
    comparator: { priority: 1, ordinal: 1, story },
    policy: finalizerPolicy,
    waitedAt: 10,
    candidateCarrier: candidateRecord,
    acceptanceController: acceptance,
    workspaceController,
  });
  assert.equal(waiter.ok, true, JSON.stringify(waiter));
  const granted = finalizer.grant({ operation: operation(2), story, waitedAt: 10 });
  assert.equal(granted.ok, true, JSON.stringify(granted));
  const entry = finalizer.enterFinalizing({
    operation: operation(3),
    origin: 'Waiting',
    verificationRequests: [
      {
        schema: runtime.VERIFICATION_REQUEST_SCHEMA,
        version: runtime.VERIFICATION_CONTRACT_VERSION,
        type: runtime.VERIFICATION_OPERATION,
        port: runtime.VERIFICATION_PORT,
        capability: runtime.VERIFICATION_CAPABILITY,
        operation: operation(4),
        subject: {
          candidate,
          candidateContentDigest: durableCandidateContentDigest,
          basisDigest: digest('0'),
          checkClasses: [],
          configurationDigest: runtime.deriveVerificationConfigurationDigest({ bindings: [] }).value,
          environmentDigest: runtime.deriveVerificationEnvironmentDigest({
            fingerprint: 'environment/fixture',
            declaredNames: [],
          }).value,
          cleanReceiptDigest: runtime.deriveVerificationCleanReceiptDigest({
            candidateContentDigest: durableCandidateContentDigest,
            targetBasisDigest: digest('d'),
          }).value,
        },
        fence: {
          generation,
          basis: digest('0'),
          candidateContentDigest: durableCandidateContentDigest,
          targetBasisDigest: digest('d'),
        },
        policy: {
          posture: 'none',
          required: [],
          digest: runtime.deriveVerificationPolicyDigest({ posture: 'none', required: [] }).value,
        },
        configuration: { bindings: [], digest: runtime.deriveVerificationConfigurationDigest({ bindings: [] }).value },
        environment: {
          fingerprint: 'environment/fixture',
          declaredNames: [],
          digest: runtime.deriveVerificationEnvironmentDigest({ fingerprint: 'environment/fixture', declaredNames: [] })
            .value,
        },
        cleanReceipt: {
          candidateContentDigest: durableCandidateContentDigest,
          targetBasisDigest: digest('d'),
          receiptDigest: runtime.deriveVerificationCleanReceiptDigest({
            candidateContentDigest: durableCandidateContentDigest,
            targetBasisDigest: digest('d'),
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
      },
    ],
  });
  assert.equal(entry.ok, true, JSON.stringify(entry));
  const anchor = finalizer.authorizeAnchor({ operation: request, authority: granted.value });
  assert.equal(anchor.ok, true, JSON.stringify(anchor));
  const authority = finalizer.projection().authority.authority;
  const effect = (op, type, result = {}) => ({
    schema: runtime.DELIVERY_EVENT_SCHEMA,
    kind: 'EV-EFFECT-CERTAINTY',
    operation: op,
    type,
    target: finalBindingTarget,
    registry: finalBindingRegistry,
    generation,
    authority,
    candidate,
    candidateContentDigest: durableCandidateContentDigest,
    targetBasisDigest: digest('d'),
    correlationKey: `correlation/${type.toLowerCase()}`,
    resourceIdentity: `resource/${type.toLowerCase()}`,
    outcome: 'success',
    observedAt: 100,
    failurePhase: null,
    result,
  });
  const operationFor = (ordinal) => `${transaction(ordinal)}/op/1`;
  const statusOperation = finalOperation;
  const effects = [
    effect(request, 'OPC-DEL-ANCHOR', { anchorRegistry: finalBindingRegistry }),
    effect(operationFor(7), 'OPC-DEL-PUBLISH'),
    effect(operationFor(8), 'OPC-DEL-REQUEST'),
    effect(statusOperation, 'OPC-DEL-STATUS'),
  ];
  const intent = (op, type) => ({
    operation: op,
    type,
    target: finalBindingTarget,
    registry: finalBindingRegistry,
    candidate,
    candidateContentDigest: durableCandidateContentDigest,
    targetBasisDigest: digest('d'),
    generation,
    authority,
    transition: op.slice(0, op.lastIndexOf('/op/')),
    strategy: 'squash',
    subject: 'target',
    correlationKey: `correlation/${type.toLowerCase()}`,
    resourceIdentity: `resource/${type.toLowerCase()}`,
  });
  const mechanism = runtime.createScriptedDeliveryMechanism({ effects, observations: [] }).value;
  const controller = runtime.createScriptedDeliveryController({
    acceptanceSnapshot: acceptance.snapshot(),
    binding: { descriptor: finalBindingDescriptor, registry: finalBindingRegistry, target: finalBindingTarget },
    candidateCarrier: candidateRecord,
    finalizerSnapshot: finalizer.snapshot(),
    registry,
    remoteGate: {
      ...finalRemoteGateBasis,
      acceptedPackageDigest: acceptance.projection().acceptedPackageDigest,
      candidate,
      digest: runtime.deriveDeliveryGateRequirementDigest({
        ...finalRemoteGateBasis,
        acceptedPackageDigest: acceptance.projection().acceptedPackageDigest,
        candidate,
      }),
    },
    strategy: { mode: 'squash', digest: runtime.deriveDeliveryStrategyDigest('squash') },
    verificationAuthorizer: {
      recordDispatch: () => ({ ok: false, error: { family: 'FC-AUTHORITY', code: 'NOT_AUTHORIZED' } }),
    },
    mechanism,
    initialSnapshot: undefined,
  });
  assert.equal(controller.ok, true, JSON.stringify(controller));
  for (const [op, type] of [
    [request, 'OPC-DEL-ANCHOR'],
    [operationFor(7), 'OPC-DEL-PUBLISH'],
    [operationFor(8), 'OPC-DEL-REQUEST'],
  ]) {
    assert.equal(controller.value.authorize(intent(op, type)).ok, true);
    assert.equal(controller.value.dispatch({ operation: op }).ok, true);
  }
  const snapshot = controller.value.snapshot();
  const restored = runtime.restoreScriptedDeliveryController(snapshot, {
    acceptanceSnapshot: acceptance.snapshot(),
    binding: { descriptor: finalBindingDescriptor, registry: finalBindingRegistry, target: finalBindingTarget },
    candidateCarrier: candidateRecord,
    finalizerSnapshot: snapshot.finalizerSnapshot,
    registry,
    remoteGate: snapshot.carrier.remoteGate,
    strategy: snapshot.carrier.strategy,
    verificationAuthorizer: {
      recordDispatch: () => ({ ok: false, error: { family: 'FC-AUTHORITY', code: 'NOT_AUTHORIZED' } }),
    },
    mechanism,
  });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.equal(restored.value.authorize(intent(statusOperation, 'OPC-DEL-STATUS')).ok, true);
  const statusAuthorizedSnapshot = restored.value.snapshot();
  assert.equal(restored.value.dispatch({ operation: statusOperation }).ok, true);
  return Object.freeze({ snapshot: statusAuthorizedSnapshot, appliedStatusSnapshot: restored.value.snapshot() });
})();
const finalDeliverySnapshot = realPredecessor.snapshot;
const appliedStatusSnapshot = realPredecessor.appliedStatusSnapshot;
const finalCarrier = finalDeliverySnapshot.carrier;
const finalSubject = Object.freeze({
  ...subject,
  run: finalCarrier.run,
  story: finalCarrier.story,
  generation: finalCarrier.generation,
  candidate: finalCarrier.candidate,
  request: finalCarrier.anchorOperation,
  outcome: 'held',
  scope: 'final-delivery',
  authority: finalCarrier.authority,
  fence: finalCarrier.authority,
});
const journal = (domain, records) => {
  let previousDigest = digest('0');
  return Object.freeze(
    records.map((record, index) => {
      const basis = { position: index + 1, previousDigest, record };
      const current = stageDigest({ domain, excludePaths: [], value: basis }).value.digest;
      previousDigest = current;
      return Object.freeze({ ...basis, digest: current });
    }),
  );
};
const finalizerSnapshot = finalDeliverySnapshot.finalizerSnapshot;
const finalizerProjection = finalizerSnapshot.projection;
const finalizerEntry = finalizerProjection.entry;
const requestEffect = finalDeliverySnapshot.projection.effects.find((fact) => fact.type === 'OPC-DEL-REQUEST');
const finalDeliveryIntent = finalDeliverySnapshot.projection.intents.find((intent) => intent.type === 'OPC-DEL-STATUS');
const finalDeliveryProjection = finalDeliverySnapshot.projection;
const finalScope = Object.freeze({
  kind: 'final-delivery',
  carrier: finalCarrier,
  deliverySnapshot: finalDeliverySnapshot,
  operation: finalDeliveryIntent.operation,
  operationType: 'OPC-DEL-STATUS',
  requestIdentity: request,
  transition: finalDeliveryIntent.transition,
});
const obligationId = `${run}/obligation/1`;
const criteria = Object.freeze({
  schema: 'jig.obligation-criteria.v1',
  subject: `evidence://${story}/claim/block`,
  claim: 'block-surfacing',
  digest: digest('c'),
});
const obligation = Object.freeze({
  schema: 'jig.sch-obligation.v1',
  id: obligationId,
  event: `${run}/event/1`,
  type: 'SCH-OBLIGATION',
  controller: 'RT-CONTROLLER',
  port: 'PORT-DECIDE',
  run,
  generation,
  resource: 'resource/gf045-block-marker',
  duty: 'surfacing',
  origin: `${run}/event/2`,
  reason: subject.reason,
  preservationEvidence: Object.freeze({
    schema: 'jig.obligation-evidence.v1',
    key: 'evidence-key',
    subject: criteria.subject,
    claim: criteria.claim,
    manifestDigest: digest('d'),
    artifactDigest: digest('e'),
    trustRoot: digest('f'),
    referenceDigest: digest('0'),
  }),
  accountableOwner: 'principal/arye',
  criteria,
  bound: 'BND-WAIT-DECISION',
  startedAt: subject.startedAt,
  deadline: subject.deadline,
  policyDigest: digest('1'),
  boundDigest: digest('2'),
  status: 'open',
  exhaustionCount: 0,
  lastExhaustionEvent: null,
  lastExhaustedAt: null,
  handoffEvent: null,
  handoffResponder: null,
  handoffCriteriaDigest: null,
  handoffReason: null,
  resolutionEvent: null,
  resolutionResponder: null,
  resolutionGrant: null,
  resolutionCriteriaDigest: null,
  resolutionEvidence: null,
});

function fakeObligationController() {
  let current = obligation;
  const snapshot = () =>
    Object.freeze({
      schema: 'jig.obligation-contract.v1',
      nextEventOrdinal: 3,
      ledgerBinding: null,
      ledgerHead: null,
      obligations: Object.freeze([current]),
      grants: Object.freeze([]),
      intents: Object.freeze([]),
      facts: Object.freeze([]),
      ledgerFacts: Object.freeze([]),
    });
  return {
    openAllocated: () => ({ ok: true, value: current }),
    get: () => ({ ok: true, value: current }),
    expire: ({ observedAt }) => {
      if (current.exhaustionCount > 0) return { ok: true, value: current };
      current = Object.freeze({
        ...current,
        exhaustionCount: 1,
        lastExhaustionEvent: `${run}/event/9`,
        lastExhaustedAt: observedAt,
      });
      return { ok: true, value: current };
    },
    snapshot,
  };
}

function controller(options = {}) {
  const finalDelivery = options.finalDelivery === true;
  const mechanismOptions = { ...options };
  delete mechanismOptions.finalDelivery;
  const activeSubject = finalDelivery ? finalSubject : subject;
  const activeScope = finalDelivery ? finalScope : reviewScope;
  const mechanism = runtime.createScriptedBlockSurfacingMechanism({
    effectOutcomes: [],
    observationOutcomes: [],
    unavailable: false,
    ...mechanismOptions,
  });
  assert.equal(mechanism.ok, true, JSON.stringify(mechanism));
  const obligations = fakeObligationController();
  const result = runtime.createScriptedBlockSurfacingController({
    mechanism: mechanism.value,
    obligationController: obligations,
    obligationBasis: {
      run,
      generation,
      resource: obligation.resource,
      duty: 'surfacing',
      origin: obligation.origin,
      reason: obligation.reason,
      preservationEvidence: obligation.preservationEvidence,
      accountableOwner: 'principal/arye',
      criteria,
      startedAt: activeSubject.startedAt,
      deadline: activeSubject.deadline,
      policyDigest: obligation.policyDigest,
    },
    subject: activeSubject,
    marker,
    scope: activeScope,
    waitTargetSeconds: 60,
    observationLimit: 2,
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  return { controller: result.value, obligations };
}

const authorization = (overrides = {}, finalDelivery = false) => {
  const activeSubject = finalDelivery ? finalSubject : subject;
  const activeScope = finalDelivery ? finalScope : reviewScope;
  return {
    authority: activeSubject.authority,
    fence: activeSubject.fence,
    explanation: 'blocked: dependency remains held',
    marker,
    operation: finalDelivery ? finalScope.operation : reviewBindingOperation,
    requestIdentity: request,
    scope: activeScope,
    subject: activeSubject,
    transition: finalDelivery ? finalScope.transition : reviewBindingTransition,
    type: finalDelivery ? 'OPC-DEL-STATUS' : 'OPC-REV-STATUS',
    ...overrides,
  };
};
const dispatch = (operationId = reviewBindingOperation, observedAt = 1_001, overrides = {}) => ({
  operation: operationId,
  observedAt,
  ...overrides,
});
const observation = (
  operationId = reviewBindingOperation,
  observationOperation = operation(6),
  observedAt = 1_010,
  finalDelivery = false,
) => ({
  authority: finalDelivery ? finalSubject.authority : subject.authority,
  fence: finalDelivery ? finalSubject.fence : subject.fence,
  observedAt,
  observationOperation,
  operation: operationId,
  requestIdentity: request,
});

test('GF045 source fact, exact subject, one idempotent marker, and no release capability', () => {
  const { controller: instance } = controller();
  assert.deepEqual(instance.reachability(), {
    providerEnabled: false,
    dispatchEnabled: false,
    externalEffects: false,
    noticeChannelEnabled: false,
  });
  assert.equal(instance.projection().subject.outcome, 'Blocked');
  assert.equal(instance.projection().source.obligation, obligationId);
  const authorized = instance.authorize(authorization());
  assert.equal(authorized.ok, true, JSON.stringify(authorized));
  const surfaced = instance.dispatch(dispatch());
  assert.equal(surfaced.ok, true, JSON.stringify(surfaced));
  assert.equal(surfaced.value.status, 'surfaced');
  assert.equal(surfaced.value.effect.outcome, 'created');
  assert.deepEqual(surfaced.value.releasedStories, []);
  assert.deepEqual(instance.authorize(authorization()), authorized);
  const recordCount = instance.records().length;
  assert.deepEqual(instance.dispatch(dispatch()), surfaced);
  assert.equal(instance.records().length, recordCount);
  assert.equal(instance.records().filter((entry) => entry.record.kind === 'effect').length, 1);
});

test('GF045 uncertain effect re-observes by correlation, then retries only after absence and reauthorization', () => {
  const { controller: instance } = controller({
    effectOutcomes: ['uncertain', 'created'],
    observationOutcomes: ['absent'],
  });
  assert.equal(instance.authorize(authorization()).ok, true);
  assert.equal(instance.dispatch(dispatch()).value.status, 'reconciling');
  assert.equal(instance.dispatch(dispatch()).ok, false);
  const absent = instance.observe(observation());
  assert.equal(absent.ok, true, JSON.stringify(absent));
  assert.equal(absent.value.status, 'pending');
  const retried = instance.dispatch(
    dispatch(operation(5), 1_020, {
      reauthorization: {
        authority: subject.authority,
        fence: subject.fence,
        reason: 'confirmed marker absence by exact request lookup',
        requestIdentity: request,
      },
    }),
  );
  assert.equal(retried.ok, true, JSON.stringify(retried));
  assert.equal(retried.value.status, 'surfaced');
  assert.equal(instance.records().filter((entry) => entry.record.kind === 'reauthorization').length, 1);
  assert.equal(instance.dispatch(dispatch(operation(5), 1_021)).ok, true);
});

test('GF045 uncertain effect remains fenced across restore until exact absence observation', () => {
  const { controller: instance, obligations } = controller({ effectOutcomes: ['uncertain'] });
  assert.equal(instance.authorize(authorization()).ok, true);
  assert.equal(instance.dispatch(dispatch()).value.status, 'reconciling');
  const restored = runtime.restoreScriptedBlockSurfacingController(instance.snapshot(), {
    mechanism: runtime.createScriptedBlockSurfacingMechanism().value,
    obligationController: obligations,
    obligationBasis: {
      run,
      generation,
      resource: obligation.resource,
      duty: 'surfacing',
      origin: obligation.origin,
      reason: obligation.reason,
      preservationEvidence: obligation.preservationEvidence,
      accountableOwner: 'principal/arye',
      criteria,
      startedAt: subject.startedAt,
      deadline: subject.deadline,
      policyDigest: obligation.policyDigest,
    },
    subject,
    marker,
    scope: reviewScope,
  });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.equal(restored.value.dispatch(dispatch()).ok, false);
});

test('GF045 held integration is bounded, re-observed without merge re-request, and expires one obligation', () => {
  assert.equal(
    finalDeliverySnapshot.projection.effects.some(
      (fact) => fact.operation === finalOperation && fact.type === 'OPC-DEL-STATUS',
    ),
    false,
  );
  const { controller: instance, obligations } = controller({
    finalDelivery: true,
    effectOutcomes: ['held'],
    observationOutcomes: ['held', 'held'],
  });
  assert.equal(instance.authorize(authorization({}, true)).ok, true);
  assert.equal(instance.dispatch(dispatch(finalOperation)).value.status, 'target-wait');
  assert.equal(instance.records().filter((entry) => entry.record.kind === 'intent').length, 1);
  assert.equal(instance.records().filter((entry) => entry.record.kind === 'effect').length, 1);
  assert.equal(instance.wake(observation(finalOperation, operation(6), 1_050, true)).value.status, 'target-wait');
  const overdue = instance.wake(observation(finalOperation, operation(7), 1_061, true));
  assert.equal(overdue.ok, true, JSON.stringify(overdue));
  assert.equal(overdue.value.status, 'parked');
  assert.equal(obligations.snapshot().obligations[0].exhaustionCount, 1);
  assert.equal(instance.records().filter((entry) => entry.record.kind === 'exhausted').length, 1);
  assert.equal(instance.records().filter((entry) => entry.record.kind === 'intent').length, 1);
});

test('GF045 confirmed present retires the held wait without exhausting the obligation', () => {
  const { controller: instance, obligations } = controller({
    finalDelivery: true,
    effectOutcomes: ['held'],
    observationOutcomes: ['present'],
  });
  assert.equal(instance.authorize(authorization({}, true)).ok, true);
  assert.equal(instance.dispatch(dispatch(finalOperation)).value.status, 'target-wait');
  const present = instance.wake(observation(finalOperation, operation(6), 1_010, true));
  assert.equal(present.ok, true, JSON.stringify(present));
  assert.equal(present.value.status, 'surfaced');
  assert.equal(present.value.wait, null);
  assert.equal(instance.wake(observation(finalOperation, operation(7), 9_999, true)).ok, false);
  assert.equal(instance.records().filter((entry) => entry.record.kind === 'exhausted').length, 0);
  assert.equal(obligations.snapshot().obligations[0].exhaustionCount, 0);
});

test('GF045 scripted unavailable posture records no publication claim and redacts hostile explanation text', () => {
  const { controller: instance } = controller({ unavailable: true });
  assert.equal(
    instance.authorize(authorization({ explanation: 'provider password=do-not-store https://secret.example/token' }))
      .ok,
    true,
  );
  const result = instance.dispatch(dispatch());
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.status, 'parked');
  assert.equal(result.value.effect.outcome, 'unavailable');
  assert.equal(result.value.effect.providerText, '[unavailable]');
  assert.equal(JSON.stringify(instance.snapshot()).includes('do-not-store'), false);
  assert.equal(JSON.stringify(instance.snapshot()).includes('secret.example'), false);
});

test('GF045 rejects stale or cross-scope authority and wrong operation class', () => {
  const { controller: instance } = controller();
  assert.equal(instance.authorize(authorization({ authority: 'target/other/auth/1' })).ok, false);
  assert.equal(instance.authorize(authorization({ type: 'OPC-DEL-COMMENT' })).ok, false);
  assert.equal(instance.authorize(authorization({ requestIdentity: operation(8) })).ok, false);
  assert.equal(instance.authorize(authorization({ scope: finalScope, type: 'OPC-DEL-STATUS' })).ok, false);

  const { controller: heldWithPriorStatus } = controller({ finalDelivery: true });
  assert.equal(
    heldWithPriorStatus.authorize(
      authorization(
        {
          scope: Object.freeze({ ...finalScope, deliverySnapshot: appliedStatusSnapshot }),
        },
        true,
      ),
    ).ok,
    false,
  );
  assert.equal(
    heldWithPriorStatus.authorize(
      authorization(
        {
          scope: Object.freeze({
            ...finalScope,
            deliverySnapshot: Object.freeze({
              ...appliedStatusSnapshot,
              projection: Object.freeze({
                ...appliedStatusSnapshot.projection,
                effects: finalDeliverySnapshot.projection.effects,
              }),
            }),
          }),
        },
        true,
      ),
    ).ok,
    false,
  );

  const { controller: held } = controller({ finalDelivery: true });
  assert.equal(held.authorize(authorization({}, true)).ok, true);
  assert.equal(held.authorize(authorization({ scope: reviewScope, type: 'OPC-REV-STATUS' }, true)).ok, false);
  assert.equal(
    held.authorize(
      authorization(
        {
          scope: Object.freeze({ ...finalScope, deliverySnapshot: undefined }),
        },
        true,
      ),
    ).ok,
    false,
  );
  assert.equal(
    held.authorize(
      authorization(
        {
          scope: Object.freeze({
            ...finalScope,
            deliverySnapshot: Object.freeze({
              ...finalDeliverySnapshot,
              projection: Object.freeze({
                ...finalDeliveryProjection,
                effects: Object.freeze([
                  Object.freeze({ ...requestEffect, candidate: `${story}/cand/2|${digest('c')}` }),
                ]),
              }),
            }),
          }),
        },
        true,
      ),
    ).ok,
    false,
  );
  assert.equal(
    held.authorize(
      authorization(
        {
          scope: Object.freeze({
            ...finalScope,
            deliverySnapshot: Object.freeze({
              ...finalDeliverySnapshot,
              records: journal('DELIVERY-RECORD', [
                {
                  kind: 'effect',
                  fact: Object.freeze({ ...requestEffect, targetBasisDigest: digest('f') }),
                },
                { kind: 'intent', intent: finalDeliveryIntent },
              ]),
            }),
          }),
        },
        true,
      ),
    ).ok,
    false,
  );
  assert.equal(
    held.authorize(
      authorization(
        {
          scope: Object.freeze({
            ...finalScope,
            deliverySnapshot: Object.freeze({
              ...finalDeliverySnapshot,
              finalizerSnapshot: Object.freeze({
                ...finalizerSnapshot,
                projection: Object.freeze({
                  ...finalizerProjection,
                  entry: Object.freeze({ ...finalizerEntry, operation: operation(8) }),
                }),
              }),
            }),
          }),
        },
        true,
      ),
    ).ok,
    false,
  );
  assert.equal(
    held.authorize(
      authorization(
        {
          scope: Object.freeze({
            ...finalScope,
            carrier: Object.freeze({
              ...finalCarrier,
              binding: Object.freeze({ ...finalCarrier.binding, target: 'target/other' }),
            }),
          }),
        },
        true,
      ),
    ).ok,
    false,
  );
});

test('GF045 surface boundary rejects hostile nested dispatch containers before reading them', () => {
  const { controller: instance } = controller();
  const hostile = new Proxy(
    { operation: operation(5), observedAt: 1_001 },
    {
      getOwnPropertyDescriptor: () => {
        throw new Error('hostile nested dispatch read');
      },
    },
  );
  assert.equal(instance.surface({ authorization: authorization(), dispatch: hostile }).ok, false);
});

test('GF045 snapshot replay retains durable intent, source, and effect state', () => {
  const { controller: instance } = controller();
  assert.equal(instance.authorize(authorization()).ok, true);
  assert.equal(instance.dispatch(dispatch()).ok, true);
  const restored = runtime.restoreScriptedBlockSurfacingController(instance.snapshot(), {
    mechanism: runtime.createScriptedBlockSurfacingMechanism().value,
    obligationController: fakeObligationController(),
    obligationBasis: {
      run,
      generation,
      resource: obligation.resource,
      duty: 'surfacing',
      origin: obligation.origin,
      reason: obligation.reason,
      preservationEvidence: obligation.preservationEvidence,
      accountableOwner: 'principal/arye',
      criteria,
      startedAt: subject.startedAt,
      deadline: subject.deadline,
      policyDigest: obligation.policyDigest,
    },
    subject,
    marker,
    scope: reviewScope,
  });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.projection(), instance.projection());
});

test('GF045 digest derivation fails closed on circular hostile input', () => {
  const circular = {};
  circular.self = circular;
  assert.equal(runtime.deriveBlockSurfacingSubjectDigest(circular), undefined);
  assert.equal(runtime.deriveBlockSurfacingScopeDigest(circular), undefined);
  assert.equal(
    runtime.deriveBlockSurfacingSourceDigest({
      subject: circular,
      operation: operation(8),
      authority: null,
      fence: null,
    }),
    undefined,
  );
});
