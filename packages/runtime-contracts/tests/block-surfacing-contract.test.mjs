import assert from 'node:assert/strict';
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
const finalSubject = Object.freeze({
  ...subject,
  outcome: 'held',
  scope: 'final-delivery',
  authority: finalAuthority,
  fence: finalAuthority,
});
const finalCarrier = Object.freeze({
  binding: { descriptor: finalBindingDescriptor, registry: finalBindingRegistry, target: finalBindingTarget },
  run,
  story,
  candidate,
  candidatePrincipal: 'principal/arye',
  candidateContentDigest: digest('b'),
  targetBasisDigest: digest('d'),
  generation,
  authority: finalAuthority,
  anchorOperation: request,
  anchorTransition: transaction(2),
  remoteGate: {
    ...finalRemoteGateBasis,
    digest: runtime.deriveDeliveryGateRequirementDigest(finalRemoteGateBasis),
  },
  acceptedPackageDigest: finalAcceptedPackageDigest,
  strategy: { mode: 'squash', digest: runtime.deriveDeliveryStrategyDigest('squash') },
  waitTargetSeconds: 60,
  recoveryLimit: 3,
  changedPaths: [],
  workspaceCommit: null,
  treeDigest: digest('a'),
});
const finalizerAuthority = Object.freeze({
  authority: finalAuthority,
  authorityGeneration: 1,
  registry: finalBindingRegistry,
  target: finalBindingTarget,
  story,
  candidate,
  candidateContentDigest: digest('b'),
  targetBasisDigest: digest('d'),
  eligibilityBasis: digest('c'),
  generation,
});
const finalizerEntry = Object.freeze({
  operation: request,
  origin: 'Accepted',
  authority: finalizerAuthority,
  posture: 'deterministic',
  requiredClasses: Object.freeze([]),
  verificationOperations: Object.freeze([]),
  observations: Object.freeze([]),
  noOp: false,
  readyForDelivery: true,
});
const finalizerProjection = Object.freeze({
  status: 'Finalizing',
  waiters: Object.freeze([]),
  authority: finalizerAuthority,
  entry: finalizerEntry,
  pendingDeliveryOperations: Object.freeze([request]),
  anchorRegistry: finalBindingRegistry,
  refreshCount: 0,
});
const finalizerRecord = Object.freeze({
  kind: 'delivery-intent',
  operation: request,
  type: 'OPC-DEL-ANCHOR',
  authority: finalizerAuthority,
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
const finalizerSnapshot = Object.freeze({
  schema: 'jig.finalizer-snapshot.v1',
  binding: finalCarrier.binding,
  registryHead: Object.freeze({ position: 0, digest: digest('0') }),
  records: journal('FINALIZER-RECORD', [finalizerRecord]),
  projection: finalizerProjection,
  verificationSnapshot: Object.freeze({}),
});
const requestEffect = Object.freeze({
  schema: 'jig.delivery-event.v1',
  kind: 'EV-EFFECT-CERTAINTY',
  operation: operation(7),
  type: 'OPC-DEL-REQUEST',
  target: finalBindingTarget,
  registry: finalBindingRegistry,
  generation,
  authority: finalAuthority,
  candidate,
  candidateContentDigest: digest('b'),
  targetBasisDigest: digest('d'),
  correlationKey: 'delivery/request/gf045',
  resourceIdentity: 'resource/gf045-request',
  outcome: 'success',
  observedAt: 1_000,
  failurePhase: null,
  result: Object.freeze({}),
});
const finalDeliveryIntent = Object.freeze({
  schema: 'jig.delivery-event.v1',
  kind: 'OPERATION-INTENT',
  operation: finalOperation,
  type: 'OPC-DEL-STATUS',
  target: finalBindingTarget,
  registry: finalBindingRegistry,
  candidate,
  candidateContentDigest: digest('b'),
  targetBasisDigest: digest('d'),
  subject: 'target',
  generation,
  authority: finalAuthority,
  transition: transaction(2),
  correlationKey: 'delivery/status/gf045',
  resourceIdentity: 'resource/gf045-status',
  strategy: 'squash',
});
const finalDeliveryProjection = Object.freeze({
  status: 'Ready',
  carrier: finalCarrier,
  intents: Object.freeze([finalDeliveryIntent]),
  effects: Object.freeze([requestEffect]),
  observations: Object.freeze([]),
  landing: null,
  releasedStories: Object.freeze([]),
  recovery: null,
  targetWait: null,
  finalizer: finalizerProjection,
});
const finalDeliverySnapshot = Object.freeze({
  schema: 'jig.delivery-snapshot.v1',
  carrier: finalCarrier,
  status: 'Ready',
  records: journal('DELIVERY-RECORD', [
    { kind: 'effect', fact: requestEffect },
    { kind: 'intent', intent: finalDeliveryIntent },
  ]),
  projection: finalDeliveryProjection,
  finalizerSnapshot,
});
const finalScope = Object.freeze({
  kind: 'final-delivery',
  carrier: finalCarrier,
  deliverySnapshot: finalDeliverySnapshot,
  operation: finalOperation,
  operationType: 'OPC-DEL-STATUS',
  requestIdentity: request,
  transition: transaction(2),
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
  const { controller: instance, obligations } = controller({
    finalDelivery: true,
    effectOutcomes: ['held'],
    observationOutcomes: ['held', 'held'],
  });
  assert.equal(instance.authorize(authorization({}, true)).ok, true);
  assert.equal(instance.dispatch(dispatch(finalOperation)).value.status, 'target-wait');
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
