import assert from 'node:assert/strict';
import test from 'node:test';

const runtime = await import('../dist/session.js');

const digest = (character) => character.repeat(64);
const run = 'run-000000000034-0123456789abcdef';
const story = `${run}/story/implementer-session`;
const principal = 'principal/agent-one';
const generation = `${run}/gen/1|controller`;
const manifest = runtime.scriptedSessionManifest();
let operationOrdinal = 0;

const operation = () => {
  operationOrdinal += 1;
  const transaction = `${run}/txn/${operationOrdinal}/${run}/gen/1|controller|${digest(String(operationOrdinal % 10))}`;
  return `${transaction}/op/1`;
};

const makeBinding = ({
  role = 'implementer',
  sessionOrdinal = 1,
  assignmentOrdinal = 1,
  session = `${story}/session/${role}/${sessionOrdinal}`,
  principalValue = principal,
  response = null,
  assignmentBasis = digest('a'),
  inputDigest = digest('b'),
  posture = 'scripted',
  manifestValue = manifest,
} = {}) => {
  const result = runtime.createSessionBinding({
    schema: runtime.SESSION_BINDING_SCHEMA,
    run,
    story,
    role,
    principal: principalValue,
    session,
    sessionOrdinal,
    assignmentOrdinal,
    assignmentBasis,
    inputDigest,
    generation,
    manifest: manifestValue,
    posture,
    response,
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
};

const openAndBind = (controller, binding = makeBinding()) => {
  const opened = controller.open({ operation: operation(), binding, requestDigest: digest('c') });
  assert.equal(opened.ok, true, JSON.stringify(opened));
  const bound = controller.bind({ session: binding.session, binding });
  assert.equal(bound.ok, true, JSON.stringify(bound));
  return binding;
};

const assign = (controller, binding) => {
  const result = controller.assign({ operation: operation(), binding, requestDigest: digest('d') });
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
};

const lossAttestation = (binding, observedAt) => {
  const result = runtime.scriptedSessionLossAttestation({ binding, observedAt });
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
};

test('GF-034 exports the closed session contract and development fixture remains unreachable', () => {
  assert.deepEqual(runtime.SESSION_OPERATION_TYPES, [
    'OPC-SESSION-OPEN',
    'OPC-SESSION-RESPOND',
    'OPC-SESSION-ASSIGN',
    'OPC-SESSION-COLLECT',
    'OPC-SESSION-CLOSE',
  ]);
  assert.deepEqual(runtime.SESSION_SILENCE, {
    token: 'session_silence',
    defaultMs: 300000,
    minimumMs: 10000,
    maximumMs: 1800000,
  });
  const controller = runtime.createScriptedSessionController();
  assert.deepEqual(controller.fixtureEvidence(), {
    providerEnabled: false,
    dispatchEnabled: false,
    mechanism: 'scripted-session.v1',
    internalDecisions: [],
    invocations: [],
  });
});

test('all five Operations follow controller-owned open, bind, assign, collect, respond, and close lifecycle', () => {
  const controller = runtime.createScriptedSessionController();
  const binding = openAndBind(controller);
  const active = assign(controller, binding);
  assert.equal(active.state, 'active');
  const collected = controller.collect({ operation: operation(), binding, requestDigest: digest('e') });
  assert.equal(collected.ok, true, JSON.stringify(collected));
  assert.equal(collected.value.request, null);
  assert.equal(collected.value.record.collected, true);
  const closed = controller.close({ operation: operation(), binding, requestDigest: digest('f') });
  assert.equal(closed.ok, true, JSON.stringify(closed));
  assert.equal(closed.value.state, 'terminal');
  assert.equal(closed.value.terminalCause, 'completed-close');
  assert.deepEqual(
    controller.fixtureEvidence().invocations.map((entry) => entry.type),
    ['OPC-SESSION-OPEN', 'OPC-SESSION-ASSIGN', 'OPC-SESSION-COLLECT', 'OPC-SESSION-CLOSE'],
  );
  assert.deepEqual(
    controller
      .facts()
      .filter((fact) => fact.type === 'EV-SESSION-FACT')
      .map((fact) => fact.kind),
    ['open', 'bind', 'assignment-acknowledged', 'collect', 'close'],
  );
});

test('bind-before-assign and active-before-collect fail closed, while stale and reused ordinals stay fenced', () => {
  const controller = runtime.createScriptedSessionController();
  const binding = makeBinding();
  const opened = controller.open({ operation: operation(), binding, requestDigest: digest('c') });
  assert.equal(opened.ok, true);
  const prebind = controller.assign({ operation: operation(), binding, requestDigest: digest('d') });
  assert.deepEqual(prebind.error, { family: 'FC-ORDERING', code: 'ASSIGN_REQUIRES_BOUND' });
  const preactive = controller.collect({ operation: operation(), binding, requestDigest: digest('e') });
  assert.deepEqual(preactive.error, { family: 'FC-ORDERING', code: 'COLLECT_REQUIRES_ACTIVE_ASSIGNMENT' });
  assert.equal(controller.bind({ session: binding.session, binding }).ok, true);
  assert.equal(controller.open({ operation: operation(), binding, requestDigest: digest('c') }).ok, false);
  assert.equal(assign(controller, binding).state, 'active');
  const stale = { ...binding, posture: 'different' };
  assert.deepEqual(controller.collect({ operation: operation(), binding: stale, requestDigest: digest('e') }).error, {
    family: 'FC-TRUST',
    code: 'SESSION_BINDING_DIGEST_MISMATCH',
  });
  const reused = makeBinding({ sessionOrdinal: 1 });
  assert.deepEqual(controller.open({ operation: operation(), binding: reused, requestDigest: digest('c') }).error, {
    family: 'FC-FENCE',
    code: 'SESSION_ORDINAL_REUSED',
  });
});

test('human-needed request crosses the seam, provider allow/reject does not mint Jig authority', () => {
  const park = `${run}/park/1`;
  const controller = runtime.createScriptedSessionController({ nativeDecision: 'human-needed', humanRequest: park });
  const binding = openAndBind(controller);
  assign(controller, binding);
  const requested = controller.collect({ operation: operation(), binding, requestDigest: digest('e') });
  assert.equal(requested.ok, true, JSON.stringify(requested));
  assert.equal(requested.value.request, park);
  assert.equal(requested.value.record.pendingRequest, park);
  const responseBinding = makeBinding({
    response: {
      request: park,
      originatingPrincipal: principal,
      originatingSession: binding.session,
      assignmentOrdinal: 1,
      answerDigest: digest('9'),
      lineage: null,
    },
  });
  const responded = controller.respond({
    operation: operation(),
    binding: responseBinding,
    requestDigest: digest('9'),
  });
  assert.equal(responded.ok, true, JSON.stringify(responded));
  assert.equal(responded.value.pendingRequest, null);
  assert.equal(
    controller.facts().some((fact) => Object.hasOwn(fact, 'nativeDecision')),
    false,
  );

  const rejected = runtime.createScriptedSessionController({ nativeDecision: 'rejected' });
  const rejectedBinding = openAndBind(rejected);
  assign(rejected, rejectedBinding);
  const rejectedCollection = rejected.collect({
    operation: operation(),
    binding: rejectedBinding,
    requestDigest: digest('e'),
  });
  assert.equal(rejectedCollection.ok, true);
  assert.equal(rejectedCollection.value.request, null);
  assert.deepEqual(rejected.fixtureEvidence().internalDecisions, ['allowed', 'allowed', 'rejected']);
});

test('reconnect retains logical ID-SESSION; only attested loss permits same-principal replacement', () => {
  const controller = runtime.createScriptedSessionController();
  const binding = openAndBind(controller);
  assign(controller, binding);
  const reconnect = controller.reconnect({ session: binding.session, binding, observedAt: 1000 });
  assert.equal(reconnect.ok, true, JSON.stringify(reconnect));
  assert.equal(reconnect.value.binding.session, binding.session);
  const lost = controller.attestLoss({
    session: binding.session,
    binding,
    observedAt: 2000,
    attestation: lossAttestation(binding, 2000),
  });
  assert.equal(lost.ok, true, JSON.stringify(lost));
  const forgedLossSnapshot = {
    ...controller.snapshot(),
    sessions: controller.snapshot().sessions.map((record) => ({
      ...record,
      facts: record.facts.map((fact) => (fact.kind === 'loss' ? { ...fact, attestationDigest: digest('9') } : fact)),
    })),
  };
  assert.deepEqual(runtime.restoreScriptedSessionController(forgedLossSnapshot).error, {
    family: 'FC-TRUST',
    code: 'INVALID_SESSION_SNAPSHOT',
  });
  assert.equal(lost.value.terminalCause, 'lost-attested');
  const replacement = makeBinding({ sessionOrdinal: 2 });
  const replacementResult = controller.replace({
    operation: operation(),
    predecessor: binding.session,
    binding: replacement,
    requestDigest: digest('9'),
  });
  assert.equal(replacementResult.ok, true, JSON.stringify(replacementResult));
  assert.equal(replacementResult.value.state, 'open');
  assert.equal(replacementResult.value.predecessor, binding.session);
  assert.notEqual(replacementResult.value.binding.session, binding.session);
  assert.equal(replacementResult.value.binding.principal, binding.principal);
  assert.equal(controller.bind({ session: replacement.session, binding: replacement }).ok, true);
  assert.equal(assign(controller, replacement).state, 'active');
  const wrongPrincipal = makeBinding({ sessionOrdinal: 3, principalValue: 'principal/other' });
  assert.deepEqual(
    controller.replace({
      operation: operation(),
      predecessor: binding.session,
      binding: wrongPrincipal,
      requestDigest: digest('9'),
    }).error,
    {
      family: 'FC-SUBJECT',
      code: 'INVALID_REPLACEMENT_LINEAGE',
    },
  );
  assert.deepEqual(controller.collect({ operation: operation(), binding, requestDigest: digest('e') }).error, {
    family: 'FC-FENCE',
    code: 'SESSION_TERMINAL',
  });

  const pendingController = runtime.createScriptedSessionController({
    nativeDecision: 'human-needed',
    humanRequest: `${run}/park/2`,
  });
  const pendingBinding = openAndBind(pendingController);
  assign(pendingController, pendingBinding);
  const pending = pendingController.collect({
    operation: operation(),
    binding: pendingBinding,
    requestDigest: digest('e'),
  });
  assert.equal(pending.ok, true, JSON.stringify(pending));
  const pendingLoss = pendingController.attestLoss({
    session: pendingBinding.session,
    binding: pendingBinding,
    observedAt: 2000,
    attestation: lossAttestation(pendingBinding, 2000),
  });
  assert.equal(pendingLoss.ok, true, JSON.stringify(pendingLoss));
  const pendingReplacement = makeBinding({ sessionOrdinal: 2 });
  assert.equal(
    pendingController.replace({
      operation: operation(),
      predecessor: pendingBinding.session,
      binding: pendingReplacement,
      requestDigest: digest('9'),
    }).ok,
    true,
  );
  const pendingRestored = runtime.restoreScriptedSessionController(pendingController.snapshot());
  assert.equal(pendingRestored.ok, true, JSON.stringify(pendingRestored));
  const reboundController = pendingRestored.value;
  assert.equal(reboundController.bind({ session: pendingReplacement.session, binding: pendingReplacement }).ok, true);
  assign(reboundController, pendingReplacement);
  const response = makeBinding({
    sessionOrdinal: 2,
    response: {
      request: `${run}/park/2`,
      originatingPrincipal: principal,
      originatingSession: pendingBinding.session,
      assignmentOrdinal: 1,
      answerDigest: digest('8'),
      lineage: pendingBinding.session,
    },
  });
  assert.equal(
    reboundController.respond({ operation: operation(), binding: response, requestDigest: digest('8') }).ok,
    true,
  );

  const cancelController = runtime.createScriptedSessionController({
    nativeDecision: 'human-needed',
    humanRequest: `${run}/park/3`,
  });
  const cancelBinding = openAndBind(cancelController);
  assign(cancelController, cancelBinding);
  assert.equal(
    cancelController.collect({ operation: operation(), binding: cancelBinding, requestDigest: digest('e') }).ok,
    true,
  );
  assert.equal(
    cancelController.attestLoss({
      session: cancelBinding.session,
      binding: cancelBinding,
      observedAt: 2000,
      attestation: lossAttestation(cancelBinding, 2000),
    }).ok,
    true,
  );
  const cancelled = cancelController.cancelAndReissue({ session: cancelBinding.session, binding: cancelBinding });
  assert.equal(cancelled.ok, true, JSON.stringify(cancelled));
  assert.equal(cancelled.value.terminalCause, 'cancelled');
  assert.equal(cancelled.value.pendingRequest, null);
  assert.match(cancelled.value.successorRequest, new RegExp(`^${run}/park/[0-9]+$`));
  assert.equal(cancelled.value.facts.at(-1)?.kind, 'cancel-and-reissue');
  assert.equal(cancelled.value.facts.at(-1)?.request, `${run}/park/3`);
  assert.equal(cancelled.value.facts.at(-1)?.reason, 'context-not-restorable');
  assert.equal(cancelled.value.facts.at(-1)?.successorRequest, cancelled.value.successorRequest);
  assert.equal(runtime.restoreScriptedSessionController(cancelController.snapshot()).ok, true);
});

test('silence records SCH-LIVENESS and fences dispatch until attested loss; hostile identity cannot cross bindings', () => {
  const controller = runtime.createScriptedSessionController();
  const binding = openAndBind(controller);
  assign(controller, binding);
  const heartbeat = controller.observeLiveness({ session: binding.session, binding, observedAt: 1000 });
  assert.equal(heartbeat.ok, true, JSON.stringify(heartbeat));
  assert.equal(heartbeat.value.classification, 'thinking');
  assert.deepEqual(controller.classifySilence({ session: binding.session, binding, observedAt: 999 }).error, {
    family: 'FC-INPUT',
    code: 'INVALID_SILENCE_BOUND',
  });
  assert.equal(runtime.restoreScriptedSessionController(controller.snapshot()).ok, true);
  const dead = controller.classifySilence({ session: binding.session, binding, observedAt: 301001 });
  assert.equal(dead.ok, true, JSON.stringify(dead));
  assert.equal(dead.value.classification, 'dead');
  assert.deepEqual(controller.collect({ operation: operation(), binding, requestDigest: digest('e') }).error, {
    family: 'FC-LIVENESS',
    code: 'SESSION_SILENCE_FENCED',
  });
  const otherStory = makeBinding({ inputDigest: digest('9') });
  assert.deepEqual(controller.reconnect({ session: binding.session, binding: otherStory, observedAt: 301002 }).error, {
    family: 'FC-FENCE',
    code: 'RECONNECT_BINDING_MISMATCH',
  });
  assert.equal(
    controller.facts().some((fact) => fact.type === 'SCH-LIVENESS' && fact.classification === 'dead'),
    true,
  );
});

test('lost response and crash are preserved by stable Operation identity; close remains parked for retirement', () => {
  const controller = runtime.createScriptedSessionController({ faults: { 'OPC-SESSION-COLLECT': 'lost-response' } });
  const binding = openAndBind(controller);
  assign(controller, binding);
  const collectOperation = operation();
  const uncertain = controller.collect({ operation: collectOperation, binding, requestDigest: digest('e') });
  assert.deepEqual(uncertain.error, { family: 'FC-EFFECT', code: 'SESSION_RESULT_UNCERTAIN' });
  const close = controller.close({ operation: operation(), binding, requestDigest: digest('f') });
  assert.deepEqual(close.error, { family: 'FC-EFFECT', code: 'UNCERTAIN_SESSION_EFFECT_RETIRED' });
  const restored = runtime.restoreScriptedSessionController(controller.snapshot(), {
    faults: { 'OPC-SESSION-COLLECT': 'lost-response' },
  });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.collect({ operation: collectOperation, binding, requestDigest: digest('e') }).error, {
    family: 'FC-EFFECT',
    code: 'UNCERTAIN_OPERATION_PARKED',
  });

  const successful = runtime.createScriptedSessionController();
  const successfulBinding = openAndBind(successful);
  assign(successful, successfulBinding);
  const successfulOperation = operation();
  assert.equal(
    successful.collect({ operation: successfulOperation, binding: successfulBinding, requestDigest: digest('e') }).ok,
    true,
  );
  const successfulRestore = runtime.restoreScriptedSessionController(successful.snapshot());
  assert.equal(successfulRestore.ok, true, JSON.stringify(successfulRestore));
  assert.deepEqual(
    successfulRestore.value.collect({
      operation: successfulOperation,
      binding: successfulBinding,
      requestDigest: digest('e'),
    }).error,
    { family: 'FC-EFFECT', code: 'OPERATION_ALREADY_USED' },
  );
});

test('loss requires fixture mechanism evidence and recovery rejects impossible lifecycle snapshots', () => {
  const controller = runtime.createScriptedSessionController();
  const binding = openAndBind(controller);
  assign(controller, binding);
  const forged = lossAttestation(binding, 2000);
  assert.deepEqual(
    controller.attestLoss({
      session: binding.session,
      binding,
      observedAt: 2000,
      attestation: { ...forged, digest: digest('9') },
    }).error,
    { family: 'FC-MECHANISM', code: 'INVALID_LOSS_ATTESTATION' },
  );
  const lost = controller.attestLoss({
    session: binding.session,
    binding,
    observedAt: 2000,
    attestation: forged,
  });
  assert.equal(lost.ok, true, JSON.stringify(lost));

  const active = runtime.createScriptedSessionController();
  const activeBinding = openAndBind(active);
  assign(active, activeBinding);
  const snapshot = active.snapshot();
  const impossible = {
    ...snapshot,
    sessions: snapshot.sessions.map((record) => ({
      ...record,
      facts: record.facts.filter((fact) => fact.kind !== 'assignment-acknowledged'),
    })),
  };
  assert.deepEqual(runtime.restoreScriptedSessionController(impossible).error, {
    family: 'FC-TRUST',
    code: 'INVALID_SESSION_SNAPSHOT',
  });
});

test('binding schema makes forge/delivery credentials and port authority unrepresentable, and rejects hostile inputs', () => {
  const binding = makeBinding();
  for (const hostile of [
    { ...binding, credentialClass: 'forge' },
    { ...binding, credentialClass: 'privileged-delivery' },
    { ...binding, port: 'PORT-DELIVERY' },
    new Proxy(binding, {
      ownKeys: () => {
        throw new Error('hostile');
      },
    }),
  ]) {
    assert.equal(runtime.createSessionBinding(hostile).ok, false);
  }
  const wrongPosture = { ok: true, value: makeBinding({ posture: 'different' }) };
  const controller = runtime.createScriptedSessionController();
  openAndBind(controller, binding);
  assert.deepEqual(controller.bind({ session: binding.session, binding: wrongPosture.value }).error, {
    family: 'FC-FENCE',
    code: 'SESSION_BINDING_STALE',
  });
});
