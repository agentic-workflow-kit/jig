import assert from 'node:assert/strict';
import test from 'node:test';

const runtime = await import('../dist/index.js');

const digest = (character) => character.repeat(64);
const run = 'run-000000000045-0123456789abcdef';
const story = `${run}/story/gf045`;
const generation = `${run}/gen/1|controller`;
const candidate = `${story}/cand/1|${digest('b')}`;
const transaction = (ordinal) => `${run}/txn/${ordinal}/${run}/gen/1|controller|${digest('a')}`;
const operation = (ordinal) => `${transaction(ordinal)}/op/1`;
const authority = 'target/finalizer/auth/1';
const fence = authority;
const request = operation(2);
const transition = transaction(3);
const marker = Object.freeze({ kind: 'status', identity: 'marker/block/gf045', context: 'jig-blocked-v1' });
const subject = Object.freeze({
  run,
  story,
  generation,
  outcome: 'Blocked',
  candidate,
  request,
  ref: 'refs/heads/feature',
  authority,
  fence,
  dependencyStories: Object.freeze([]),
  owner: 'principal/arye',
  reason: 'dependency remains blocked after bounded delivery attempts',
  startedAt: 1_000,
  deadline: 2_000,
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
  const mechanism = runtime.createScriptedBlockSurfacingMechanism({
    effectOutcomes: [],
    observationOutcomes: [],
    unavailable: false,
    ...options,
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
      startedAt: subject.startedAt,
      deadline: subject.deadline,
      policyDigest: obligation.policyDigest,
    },
    subject,
    marker,
    waitTargetSeconds: 60,
    observationLimit: 2,
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  return { controller: result.value, obligations };
}

const authorization = (overrides = {}) => ({
  authority,
  fence,
  explanation: 'blocked: dependency remains held',
  marker,
  operation: operation(5),
  requestIdentity: request,
  subject,
  transition,
  type: 'OPC-DEL-STATUS',
  ...overrides,
});
const dispatch = (operationId = operation(5), observedAt = 1_001, overrides = {}) => ({
  operation: operationId,
  observedAt,
  ...overrides,
});
const observation = (operationId = operation(5), observationOperation = operation(6), observedAt = 1_010) => ({
  authority,
  fence,
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
  const absent = instance.observe(observation());
  assert.equal(absent.ok, true, JSON.stringify(absent));
  assert.equal(absent.value.status, 'pending');
  const retried = instance.dispatch(
    dispatch(operation(5), 1_020, {
      reauthorization: {
        authority,
        fence,
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

test('GF045 held integration is bounded, re-observed without merge re-request, and expires one obligation', () => {
  const { controller: instance, obligations } = controller({
    effectOutcomes: ['held'],
    observationOutcomes: ['held', 'held'],
  });
  assert.equal(instance.authorize(authorization()).ok, true);
  assert.equal(instance.dispatch(dispatch()).value.status, 'target-wait');
  assert.equal(instance.wake(observation(operation(5), operation(6), 1_050)).value.status, 'target-wait');
  const overdue = instance.wake(observation(operation(5), operation(7), 1_061));
  assert.equal(overdue.ok, true, JSON.stringify(overdue));
  assert.equal(overdue.value.status, 'parked');
  assert.equal(obligations.snapshot().obligations[0].exhaustionCount, 1);
  assert.equal(instance.records().filter((entry) => entry.record.kind === 'exhausted').length, 1);
  assert.equal(instance.records().filter((entry) => entry.record.kind === 'intent').length, 1);
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
  });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.projection(), instance.projection());
});
