import assert from 'node:assert/strict';
import test from 'node:test';

const runtime = await import('../dist/doorbell.js');

const digest = (character) => character.repeat(64);
const run = 'run-000000000034-0123456789abcdef';
const story = `${run}/story/implementer-doorbell`;
const candidate = `${story}/cand/1|${digest('c')}`;
const session = `${story}/session/implementer/1`;
const principal = 'principal/agent-one';
const delegate = 'principal/agent-two';
const generation = `${run}/gen/1|controller`;
const deadline = 1000 + 72 * 60 * 60;
const operation = `${run}/txn/1/${generation}|${digest('e')}/op/1`;

const binding = (overrides = {}) => ({
  run,
  story,
  candidate,
  session,
  principal,
  assignmentOrdinal: 1,
  assignmentBasis: digest('a'),
  generation,
  ...overrides,
});

const requestInput = (overrides = {}) => ({
  parkOrdinal: 1,
  binding: binding(),
  kind: 'permission',
  action: 'allow',
  scope: 'workspace:read',
  promptDigest: digest('b'),
  observedAt: 1000,
  deadline,
  ...overrides,
});

const grantInput = (request, overrides = {}) => ({
  grantOrdinal: 1,
  request: request.id,
  grantor: 'principal/arye',
  delegate,
  action: 'allow',
  scope: 'workspace:read',
  issuedAt: 1001,
  expiresAt: 1001 + 60 * 60,
  generation,
  supersedes: null,
  grantorProof: digest('a'),
  ...overrides,
});

const decisionInput = (request, overrides = {}) => ({
  decisionOrdinal: 1,
  request: request.id,
  responder: 'principal/arye',
  responderProof: digest('a'),
  binding: binding(),
  grant: null,
  action: 'allow',
  scope: 'workspace:read',
  answerDigest: digest('d'),
  observedAt: 1002,
  generation,
  ...overrides,
});

test('GF-036 topology is private and provider/dispatch paths stay disabled', () => {
  assert.equal(runtime.DOORBELL_PORT, 'PORT-DECIDE');
  assert.equal(runtime.DOORBELL_CONTROLLER, 'RT-CONTROLLER');
  assert.equal(runtime.DOORBELL_BOUND.name, 'BND-WAIT-DECISION');
  assert.deepEqual(
    runtime
      .createScriptedDoorbellController({
        internalProviderDecisions: ['allowed', 'rejected'],
      })
      .fixtureEvidence(),
    {
      providerEnabled: false,
      dispatchEnabled: false,
      mechanism: 'scripted-doorbell.v1',
      internalProviderDecisions: ['allowed', 'rejected'],
      responseInvocations: [],
    },
  );
});

test('durable request and exact owner/delegate decision are idempotent and controller-owned', () => {
  const controller = runtime.createScriptedDoorbellController();
  const request = controller.escalate(requestInput());
  assert.equal(request.ok, true, JSON.stringify(request));
  assert.deepEqual(controller.escalate(requestInput()), request);
  const grant = controller.issueGrant(grantInput(request.value));
  assert.equal(grant.ok, true, JSON.stringify(grant));
  const decision = controller.decide(
    decisionInput(request.value, {
      responder: delegate,
      responderProof: digest('b'),
      grant: grant.value.id,
    }),
  );
  assert.equal(decision.ok, true, JSON.stringify(decision));
  assert.deepEqual(
    controller.decide(
      decisionInput(request.value, {
        responder: delegate,
        responderProof: digest('b'),
        grant: grant.value.id,
      }),
    ),
    decision,
  );
  const intent = controller.respond({ operation, request: request.value.id, decision: decision.value.event });
  assert.equal(intent.ok, true, JSON.stringify(intent));
  assert.equal(intent.value.status, 'recorded');
  assert.deepEqual(
    controller.respond({ operation, request: request.value.id, decision: decision.value.event }),
    intent,
  );
  assert.deepEqual(controller.fixtureEvidence().responseInvocations, []);
});

test('wrong principal, stale generation, scope, and provider-shaped input fail closed', () => {
  const controller = runtime.createScriptedDoorbellController({ internalProviderDecisions: ['allowed'] });
  const request = controller.escalate(requestInput());
  assert.equal(request.ok, true);
  const grant = controller.issueGrant(grantInput(request.value));
  assert.equal(grant.ok, true);
  assert.deepEqual(
    controller.decide(
      decisionInput(request.value, {
        responder: 'principal/other',
        responderProof: digest('a'),
        grant: grant.value.id,
      }),
    ).error,
    { family: 'FC-AUTHORITY', code: 'RESPONDER_NOT_AUTHENTICATED' },
  );
  assert.deepEqual(
    controller.decide(
      decisionInput(request.value, {
        responder: delegate,
        responderProof: digest('b'),
        grant: grant.value.id,
        action: 'reject',
      }),
    ).error,
    { family: 'FC-AUTHORITY', code: 'GRANT_SCOPE_MISMATCH' },
  );
  assert.deepEqual(
    controller.decide(
      decisionInput(request.value, {
        responder: delegate,
        responderProof: digest('b'),
        grant: grant.value.id,
        binding: binding({ generation: `${run}/gen/2|controller` }),
      }),
    ).error,
    { family: 'FC-FENCE', code: 'DECISION_BINDING_MISMATCH' },
  );
  assert.deepEqual(controller.escalate(requestInput({ kind: 'provider-allowed' })).error, {
    family: 'FC-INPUT',
    code: 'INVALID_REQUEST_KIND',
  });
});

test('exhaustion stores immutable event-time grant binding through later revocation and replay', () => {
  const controller = runtime.createScriptedDoorbellController();
  const request = controller.escalate(requestInput());
  assert.equal(request.ok, true);
  const grant = controller.issueGrant(grantInput(request.value));
  assert.equal(grant.ok, true);
  const exhausted = controller.expire({ request: request.value.id, observedAt: deadline });
  assert.equal(exhausted.ok, true, JSON.stringify(exhausted));
  const exhaustion = controller.facts().find((fact) => fact.type === 'EV-BOUND-EXHAUSTED');
  assert.equal(exhaustion.grant, grant.value.id);
  assert.deepEqual(exhaustion.grantBinding, {
    id: grant.value.id,
    request: grant.value.request,
    run,
    generation,
    delegate,
    action: 'allow',
    scope: 'workspace:read',
    issuedAt: grant.value.issuedAt,
    expiresAt: grant.value.expiresAt,
    status: 'active',
    grantDigest: grant.value.grantDigest,
  });
  const revoked = controller.revokeGrant({
    grant: grant.value.id,
    revoker: 'principal/arye',
    revokerProof: digest('a'),
    reason: 'owner-revocation',
    observedAt: deadline + 1,
  });
  assert.equal(revoked.ok, true, JSON.stringify(revoked));
  assert.deepEqual(runtime.restoreScriptedDoorbellController(controller.snapshot()).error, undefined);
  assert.deepEqual(runtime.restoreScriptedDoorbellController(controller.snapshot()).value.facts(), controller.facts());
});

test('revoke then reissue cannot rewrite the prior exhaustion grant carrier', () => {
  const controller = runtime.createScriptedDoorbellController();
  const request = controller.escalate(requestInput());
  const grant = controller.issueGrant(grantInput(request.value));
  assert.equal(grant.ok, true);
  assert.equal(
    controller.revokeGrant({
      grant: grant.value.id,
      revoker: 'principal/arye',
      revokerProof: digest('a'),
      reason: 'rotate-delegate',
      observedAt: 1500,
    }).ok,
    true,
  );
  assert.equal(controller.expire({ request: request.value.id, observedAt: deadline }).ok, true);
  const successor = controller.issueGrant(
    grantInput(request.value, {
      grantOrdinal: 2,
      issuedAt: 2000,
      expiresAt: 3000,
      supersedes: grant.value.id,
    }),
  );
  assert.equal(successor.ok, true, JSON.stringify(successor));
  assert.equal(
    controller.revokeGrant({
      grant: successor.value.id,
      revoker: 'principal/arye',
      revokerProof: digest('a'),
      reason: 'close-successor',
      observedAt: 3001,
    }).ok,
    true,
  );
  const exhaustion = controller.facts().find((fact) => fact.type === 'EV-BOUND-EXHAUSTED');
  assert.equal(exhaustion.grant, grant.value.id);
  assert.equal(exhaustion.grantBinding.status, 'revoked');
  assert.deepEqual(runtime.restoreScriptedDoorbellController(controller.snapshot()).error, undefined);
});

test('restore rejects exhaustion rebinding to mutable current grant and detects ordinal collisions', () => {
  const controller = runtime.createScriptedDoorbellController();
  const request = controller.escalate(requestInput());
  const grant = controller.issueGrant(grantInput(request.value));
  assert.equal(grant.ok, true);
  assert.equal(controller.expire({ request: request.value.id, observedAt: deadline }).ok, true);
  const forged = structuredClone(controller.snapshot());
  const exhaustion = forged.facts.find((fact) => fact.type === 'EV-BOUND-EXHAUSTED');
  exhaustion.grantBinding.status = 'revoked';
  assert.deepEqual(runtime.restoreScriptedDoorbellController(forged).error, {
    family: 'FC-TRUST',
    code: 'INVALID_DOORBELL_SNAPSHOT',
  });
  const collision = structuredClone(controller.snapshot());
  collision.nextEventOrdinal = 1;
  assert.deepEqual(runtime.restoreScriptedDoorbellController(collision).error, {
    family: 'FC-TRUST',
    code: 'INVALID_DOORBELL_SNAPSHOT',
  });
});

test('restore requires every durable record fact and preserves grant expiry independently', () => {
  const controller = runtime.createScriptedDoorbellController();
  const request = controller.escalate(requestInput());
  const grant = controller.issueGrant(grantInput(request.value, { expiresAt: 2000 }));
  assert.equal(grant.ok, true);
  const expiredDecision = controller.decide(
    decisionInput(request.value, {
      responder: delegate,
      responderProof: digest('b'),
      grant: grant.value.id,
      observedAt: 2000,
    }),
  );
  assert.deepEqual(expiredDecision.error, { family: 'FC-FENCE', code: 'GRANT_NOT_CURRENT' });
  const snapshot = structuredClone(controller.snapshot());
  snapshot.facts = snapshot.facts.filter((fact) => fact.type !== 'EV-DELEGATION-EXPIRED');
  assert.deepEqual(runtime.restoreScriptedDoorbellController(snapshot).error, {
    family: 'FC-TRUST',
    code: 'INVALID_DOORBELL_SNAPSHOT',
  });
  assert.equal(runtime.restoreScriptedDoorbellController(controller.snapshot()).ok, true);
});

test('restore rejects cross-run events, detached decisions, and active-grant projection drift', () => {
  const controller = runtime.createScriptedDoorbellController();
  const request = controller.escalate(requestInput());
  const grant = controller.issueGrant(grantInput(request.value));
  assert.equal(grant.ok, true);
  const foreignEvent = structuredClone(controller.snapshot());
  foreignEvent.grants[0].event = `${'run-000000000099-0123456789abcdef'}/event/2`;
  assert.deepEqual(runtime.restoreScriptedDoorbellController(foreignEvent).error, {
    family: 'FC-TRUST',
    code: 'INVALID_DOORBELL_SNAPSHOT',
  });
  const detached = runtime.createScriptedDoorbellController();
  const answered = detached.escalate(requestInput());
  const decision = detached.decide(decisionInput(answered.value));
  assert.equal(decision.ok, true);
  const detachedSnapshot = structuredClone(detached.snapshot());
  detachedSnapshot.requests[0].status = 'open';
  detachedSnapshot.requests[0].response = null;
  assert.deepEqual(runtime.restoreScriptedDoorbellController(detachedSnapshot).error, {
    family: 'FC-TRUST',
    code: 'INVALID_DOORBELL_SNAPSHOT',
  });
  const projection = structuredClone(controller.snapshot());
  projection.requests[0].currentGrant = null;
  assert.deepEqual(runtime.restoreScriptedDoorbellController(projection).error, {
    family: 'FC-TRUST',
    code: 'INVALID_DOORBELL_SNAPSHOT',
  });
});

test('hostile containers are rejected without invoking accessors', () => {
  const controller = runtime.createScriptedDoorbellController();
  let accessed = false;
  const hostile = requestInput();
  Object.defineProperty(hostile, 'scope', {
    get() {
      accessed = true;
      throw new Error('getter');
    },
    enumerable: true,
  });
  assert.deepEqual(controller.escalate(hostile).error, { family: 'FC-INPUT', code: 'INVALID_ESCALATION_INPUT' });
  assert.equal(accessed, false);
});

test('cancel and reissue preserves lineage while fencing the predecessor grant', () => {
  const controller = runtime.createScriptedDoorbellController();
  const request = controller.escalate(requestInput());
  const grant = controller.issueGrant(grantInput(request.value));
  assert.equal(grant.ok, true);
  const cancelled = controller.cancelAndReissue({
    request: request.value.id,
    reason: 'context-not-restorable',
    observedAt: 1100,
    successorParkOrdinal: 2,
    successorBinding: binding({ session: `${story}/session/replacement/2` }),
    successorProof: digest('a'),
  });
  assert.equal(cancelled.ok, true, JSON.stringify(cancelled));
  assert.equal(controller.request(request.value.id).value.status, 'cancelled');
  assert.equal(controller.request(`${run}/park/2`).value.predecessorRequest, request.value.id);
  assert.deepEqual(
    controller.decide(
      decisionInput(request.value, {
        responder: delegate,
        responderProof: digest('b'),
        grant: grant.value.id,
      }),
    ).error,
    { family: 'FC-FENCE', code: 'REQUEST_NOT_OPEN' },
  );
  assert.equal(runtime.restoreScriptedDoorbellController(controller.snapshot()).ok, true);
});

test('cancel and reissue requires an actual replacement session', () => {
  const controller = runtime.createScriptedDoorbellController();
  const request = controller.escalate(requestInput());
  assert.equal(request.ok, true);
  assert.deepEqual(
    controller.cancelAndReissue({
      request: request.value.id,
      reason: 'same-session-rejected',
      observedAt: 1100,
      successorParkOrdinal: 2,
      successorBinding: binding(),
      successorProof: digest('a'),
    }).error,
    { family: 'FC-FENCE', code: 'REISSUE_SESSION_NOT_REPLACED' },
  );
});

test('uncertain response is reconciled without blind resend', () => {
  const controller = runtime.createScriptedDoorbellController();
  const request = controller.escalate(requestInput());
  const decision = controller.decide(decisionInput(request.value));
  assert.equal(decision.ok, true);
  assert.equal(controller.respond({ operation, request: request.value.id, decision: decision.value.event }).ok, true);
  const uncertain = controller.reconcileResponse({
    operation,
    outcome: 'indeterminate',
    observationDigest: digest('f'),
  });
  assert.equal(uncertain.ok, true, JSON.stringify(uncertain));
  assert.equal(uncertain.value.status, 'uncertain');
  assert.deepEqual(controller.respond({ operation, request: request.value.id, decision: decision.value.event }).error, {
    family: 'FC-EFFECT',
    code: 'UNCERTAIN_RESPONSE_REQUIRES_RECONCILIATION',
  });
  const secondOperation = operation.replace('/op/1', '/op/2');
  assert.deepEqual(
    controller.respond({ operation: secondOperation, request: request.value.id, decision: decision.value.event }).error,
    {
      family: 'FC-EFFECT',
      code: 'UNCERTAIN_RESPONSE_REQUIRES_RECONCILIATION',
    },
  );
  const absent = controller.reconcileResponse({
    operation,
    outcome: 'confirmed-absence',
    observationDigest: null,
  });
  assert.equal(absent.ok, true);
  assert.deepEqual(
    controller.respond({ operation: secondOperation, request: request.value.id, decision: decision.value.event }).error,
    {
      family: 'FC-FENCE',
      code: 'RESPONSE_ALREADY_RECORDED',
    },
  );
});
