import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const kernel = await import('../dist/index.js');
const operation = await import('../dist/operation.js');
const oracle = JSON.parse(readFileSync(resolve(import.meta.dirname, './fixtures/authority-oracle.json'), 'utf8'));

const run = 'run-000000000001-aaaaaaaaaaaaaaaa';
const digest = 'a'.repeat(64);
const candidateContentDigest = 'b'.repeat(64);
const targetBasisDigest = 'c'.repeat(64);
const payloadBasisDigest = 'd'.repeat(64);
const manifest = `provider/${'e'.repeat(64)}/authority/${'f'.repeat(64)}`;
const ids = Object.freeze({
  story: `${run}/story/story-1`,
  transaction: `${run}/txn/1/${run}/gen/1|generation|${digest}`,
  event: `${run}/event/1`,
  operation: `${run}/txn/1/${run}/gen/1|generation|${digest}/op/1`,
  generation: `${run}/gen/1|generation`,
});
const subject = Object.freeze({ run, story: ids.story, basis: digest });
const fence = Object.freeze({
  generation: ids.generation,
  basis: digest,
});
const operationFence = Object.freeze({
  generation: ids.generation,
  basis: digest,
  candidateContentDigest,
  targetBasisDigest,
});
const state = Object.freeze({
  storyState: 'Pending',
  runPhase: 'Received',
  subject,
  fence,
  catalogVersion: 'jig.authority-kernel.v1',
});
const event = Object.freeze({
  type: 'EV-WAKE-DEPENDENCY',
  edge: 'pending-eligible',
  id: ids.event,
  subject,
  fence,
  catalogVersion: 'jig.authority-kernel.v1',
});
const operationEffect = (type) =>
  [
    'OPC-SESSION-COLLECT',
    'OPC-WS-OBSERVE',
    'OPC-VERIFY-EXECUTE',
    'OPC-REV-STATUS',
    'OPC-REV-RETIRE-STATUS',
    'OPC-DEL-STATUS',
    'OPC-DEL-OBSERVE',
    'OPC-ART-GET',
  ].includes(type)
    ? 'observation'
    : 'effectful';
const operationBindings = (type = 'OPC-SESSION-OPEN', ordinal = 1) => {
  const transaction = `${run}/txn/${ordinal}/${run}/gen/1|generation|${digest}`;
  const eventId = `${run}/event/${ordinal}`;
  const route = operation.operationCapabilityRoute(type);
  const unsignedCapability = {
    kind: route.kind,
    port: route.port,
    operationClass: type,
    subject: ids.story,
    fence: operationFence,
    resourceScope: 'repository/main',
    manifest,
  };
  const capabilityDigest = operation.deriveOperationCapabilityDigest(unsignedCapability);
  assert.equal(capabilityDigest.ok, true);
  return Object.freeze({
    transaction,
    event: eventId,
    operation: `${transaction}/op/1`,
    subject,
    fence: operationFence,
    catalogVersion: 'jig.authority-kernel.v1',
    payloadBasisDigest,
    capability: Object.freeze({ ...unsignedCapability, digest: capabilityDigest.value }),
    authority: type.startsWith('OPC-DEL-')
      ? Object.freeze({
          authority: `target/repository-main/auth/1`,
          registry: `registry/${'1'.repeat(64)}`,
          basis: targetBasisDigest,
        })
      : null,
    role: type.startsWith('OPC-DEL-') ? 'finalizer' : 'worker',
    lifecycle: 'Finalizing',
    effect: operationEffect(type),
    purpose: 'semantic',
    predecessor: null,
    bounds: Object.freeze({ waitMs: 900000, retryLimit: 3, recoveryLimit: 3 }),
  });
};
const bindings = operationBindings();
const ordered = (ordinal, type, edge, operationType = 'OPC-SESSION-OPEN') => {
  const operation = operationBindings(operationType, ordinal);
  return {
    event: { type, edge, id: operation.event, subject, fence, catalogVersion: 'jig.authority-kernel.v1' },
    bindings: operation,
  };
};

test('authority kernel catalog is literal, immutable, and exhaustive', () => {
  assert.equal(oracle.storyStates.length, 17);
  assert.equal(oracle.runPhases.length, 10);
  assert.equal(oracle.events.length, 32);
  assert.equal(oracle.operations.length, 29);
  assert.equal(oracle.failures.length, 12);
  assert.deepEqual(kernel.STORY_STATES, oracle.storyStates);
  assert.deepEqual(kernel.RUN_PHASES, oracle.runPhases);
  assert.deepEqual(kernel.EVENT_TYPES, oracle.events);
  assert.deepEqual(operation.OPERATION_TYPES, oracle.operations);
  assert.deepEqual(kernel.FAILURE_CLASSES, oracle.failures);
  assert.equal(new Set(kernel.STORY_STATES).size, 17);
  assert.equal(new Set(kernel.EVENT_TYPES).size, 32);
  assert.equal(Object.isFrozen(kernel.EVENT_TYPES), true);
  assert.deepEqual(kernel.RUN_PHASES, [
    'Received',
    'Preflighting',
    'Active',
    'Parked',
    'Interrupted / Recovering',
    'Suspended',
    'Settling',
    'Completed',
    'Rejected',
    'Stopped',
  ]);
  assert.deepEqual(kernel.STORY_STATES, [
    'Pending',
    'Eligible',
    'Preparing',
    'Implementing',
    'Reviewing',
    'Reworking',
    'Accepted',
    'Waiting',
    'Finalizing',
    'Refreshing',
    'RefreshPark',
    'Landed',
    'Blocked',
    'Rejected',
    'NotRun',
    'Retiring',
    'Closed',
  ]);
  assert.equal(kernel.validateEvent(event).ok, true);
  for (const type of kernel.EVENT_TYPES)
    assert.equal(
      kernel.validateEvent({ ...event, type }).ok,
      true,
      `${type} must remain a valid SCH-EVENT discriminant`,
    );
  for (const type of operation.OPERATION_TYPES)
    assert.equal(
      kernel.validateOperation({ type, ...operationBindings(type) }).ok,
      true,
      `${type} must remain a valid SCH-OPERATION discriminant`,
    );
  assert.equal(kernel.validateEvent({ ...event, extra: true }).error.failure, 'FC-INPUT');
  const { id: eventId, ...eventWithoutId } = event;
  const bindingsWithoutOperation = Object.fromEntries(Object.entries(bindings).filter(([key]) => key !== 'operation'));
  assert.equal(kernel.validateEvent(eventWithoutId).error.failure, 'FC-INPUT');
  assert.equal(kernel.validateAuthorityState({ ...state, extra: true }).error.failure, 'FC-INPUT');
  assert.equal(kernel.reduceAuthority(state, event, bindingsWithoutOperation).error.failure, 'FC-INPUT');
  assert.equal(kernel.validateOperation({ type: 'OPC-SESSION-OPEN', ...bindings }).ok, true);
  assert.equal(kernel.validateOperation({ type: 'OPC-NOT-A-CATALOG-ENTRY', ...bindings }).error.failure, 'FC-INPUT');
});

test('authority kernel reducer is total, deterministic, immutable, and fail closed', () => {
  const first = kernel.reduceAuthority(state, event, bindings);
  const second = kernel.reduceAuthority(structuredClone(state), structuredClone(event), structuredClone(bindings));
  assert.equal(first.ok, true);
  assert.deepEqual(first, second);
  assert.equal(first.value.next.storyState, 'Eligible');
  assert.equal(first.value.record.status, 'required');
  assert.equal(Object.isFrozen(first.value), true);
  assert.equal(Object.isFrozen(first.value.operations), true);
  assert.equal(
    kernel.reduceAuthority(state, { ...event, type: 'EV-SESSION-RESULT' }, bindings).error.failure,
    'FC-AUTHORITY',
  );
  assert.equal(kernel.reduceAuthority({ ...state, storyState: 'unknown' }, event, bindings).error.failure, 'FC-INPUT');
  assert.equal(
    kernel.reduceAuthority(state, { ...event, subject: { ...subject, story: `${run}/story/story-2` } }, bindings).error
      .failure,
    'FC-SUBJECT',
  );
  assert.equal(
    kernel.reduceAuthority(state, { ...event, fence: { ...fence, generation: `${run}/gen/2|generation` } }, bindings)
      .error.failure,
    'FC-FENCE',
  );
  const outOfOrder = ordered(2, 'EV-WAKE-DEPENDENCY', 'pending-eligible');
  assert.equal(
    kernel.reduceAuthority(state, outOfOrder.event, { ...outOfOrder.bindings, transaction: ids.transaction }).error
      .failure,
    'FC-INPUT',
  );
});

test('GF-005 authorized operation intents are complete and reject omission or caller widening', () => {
  const operationType = 'OPC-WS-PROVISION';
  const operationInput = operationBindings(operationType);
  const decision = kernel.reduceAuthority(
    { ...state, storyState: 'Eligible' },
    { ...event, type: 'EV-WAKE-CAPACITY', edge: 'eligible-preparing' },
    operationInput,
  );
  assert.equal(decision.ok, true);
  const authorized = decision.value.operations[0];
  assert.equal(authorized.type, operationType);
  for (const field of [
    'transaction',
    'event',
    'operation',
    'subject',
    'payloadBasisDigest',
    'fence',
    'capability',
    'authority',
    'role',
    'lifecycle',
    'effect',
    'purpose',
    'predecessor',
    'bounds',
  ]) {
    const omitted = structuredClone(decision.value);
    delete omitted.operations[0][field];
    assert.equal(kernel.validateTransition(omitted).ok, false, `omitted ${field} must fail closed`);
  }

  const forgedPayload = structuredClone(decision.value);
  forgedPayload.operations[0].payloadBasisDigest = 'e'.repeat(64);
  assert.equal(kernel.validateTransition(forgedPayload).ok, false, 'forged payload basis must fail closed');

  const forgedRole = structuredClone(decision.value);
  forgedRole.operations[0].role = 'attacker';
  assert.equal(kernel.validateTransition(forgedRole).ok, false, 'forged role must fail closed');

  const forgedCapability = structuredClone(decision.value);
  const unsignedCapability = { ...forgedCapability.operations[0].capability, resourceScope: 'workspace/other' };
  delete unsignedCapability.digest;
  const capabilityDigest = operation.deriveOperationCapabilityDigest(unsignedCapability);
  assert.equal(capabilityDigest.ok, true);
  forgedCapability.operations[0].capability = { ...unsignedCapability, digest: capabilityDigest.value };
  assert.equal(kernel.validateTransition(forgedCapability).ok, false, 'forged capability must fail closed');

  const forgedFence = structuredClone(decision.value);
  forgedFence.operations[0].fence.candidateContentDigest = 'f'.repeat(64);
  assert.equal(kernel.validateTransition(forgedFence).ok, false, 'forged fence must fail closed');
});

test('authority kernel rejects bindings whose transaction was proposed by a stale generation', () => {
  const staleGeneration = `${run}/gen/2|replacement`;
  const staleFence = { ...fence, generation: staleGeneration };
  const staleOperationFence = { ...operationFence, generation: staleGeneration };
  const staleState = { ...state, fence: staleFence };
  const staleEvent = { ...event, fence: staleFence };
  const staleBindings = { ...bindings, fence: staleOperationFence };
  const result = kernel.reduceAuthority(staleState, staleEvent, staleBindings);
  assert.equal(result.ok, false);
  assert.equal(result.error.failure, 'FC-INPUT');
});

test('authority kernel fixed-field bindings accept semantically identical insertion-order variants', () => {
  const reorderedSubject = { basis: digest, story: ids.story, run };
  const reorderedFence = {
    basis: digest,
    generation: ids.generation,
  };
  const reorderedOperationFence = {
    targetBasisDigest,
    candidateContentDigest,
    basis: digest,
    generation: ids.generation,
  };
  const reorderedEvent = { ...event, subject: reorderedSubject, fence: reorderedFence };
  const reorderedCapability = {
    ...bindings.capability,
    fence: reorderedOperationFence,
    subject: ids.story,
  };
  delete reorderedCapability.digest;
  const reorderedCapabilityDigest = operation.deriveOperationCapabilityDigest(reorderedCapability);
  assert.equal(reorderedCapabilityDigest.ok, true);
  const reorderedBindings = {
    ...bindings,
    operation: ids.operation,
    fence: reorderedOperationFence,
    event: ids.event,
    catalogVersion: 'jig.authority-kernel.v1',
    subject: reorderedSubject,
    transaction: ids.transaction,
    capability: { ...reorderedCapability, digest: reorderedCapabilityDigest.value },
  };
  assert.equal(kernel.validateEvent(reorderedEvent).ok, true);
  assert.equal(kernel.reduceAuthority(state, reorderedEvent, reorderedBindings).ok, true);
});

test('authority kernel rejects a descriptor-valid event whose ordinary type read throws', () => {
  const hostileEvent = new Proxy(
    { ...event },
    {
      get(_target, key) {
        throw new Error(`get:${String(key)}`);
      },
    },
  );
  const validate = () => kernel.validateEvent(hostileEvent);
  assert.doesNotThrow(validate);
  assert.equal(validate().error.failure, 'FC-INPUT');
});

test('authority kernel exported validators reject throwing hostile Proxies as FC-INPUT without escape', () => {
  const hostile = new Proxy(
    {},
    {
      getPrototypeOf() {
        throw new Error('getPrototypeOf');
      },
      get() {
        throw new Error('get');
      },
      ownKeys() {
        throw new Error('ownKeys');
      },
      getOwnPropertyDescriptor() {
        throw new Error('getOwnPropertyDescriptor');
      },
    },
  );
  const validators = [
    () => kernel.validateAuthorityState(hostile),
    () => kernel.validateEvent(hostile),
    () => kernel.validateOperation(hostile),
    () => kernel.validateTransition(hostile),
    () => kernel.reduceAuthority(hostile, event, bindings),
    () => kernel.reduceAuthority(state, hostile, bindings),
    () => kernel.reduceAuthority(state, event, hostile),
    () => kernel.replayAuthority(hostile, []),
    () => kernel.replayAuthority(state, [{ event: hostile, bindings }]),
  ];
  for (const validate of validators) {
    assert.doesNotThrow(validate);
    assert.equal(validate().error.failure, 'FC-INPUT');
  }
});

test('authority kernel rejects descriptor-valid ordinary-read traps at every authority boundary', () => {
  const getThrows = (value, label) =>
    new Proxy(value, {
      get(_target, key) {
        throw new Error(`${label}:get:${String(key)}`);
      },
    });
  const transition = kernel.reduceAuthority(state, event, bindings).value;
  const replayStep = { event, bindings };
  const inputFailure = (label, invoke) => {
    assert.doesNotThrow(invoke, label);
    const result = invoke();
    assert.equal(result.ok, false, label);
    assert.equal(result.error.failure, 'FC-INPUT', label);
  };
  const cases = [
    ['validateEvent outer', () => kernel.validateEvent(getThrows({ ...event }, 'event'))],
    ['validateEvent subject', () => kernel.validateEvent({ ...event, subject: getThrows({ ...subject }, 'subject') })],
    ['validateEvent fence', () => kernel.validateEvent({ ...event, fence: getThrows({ ...fence }, 'fence') })],
    [
      'validateOperation outer',
      () => kernel.validateOperation(getThrows({ type: 'OPC-SESSION-OPEN', ...bindings }, 'operation')),
    ],
    [
      'validateOperation subject',
      () =>
        kernel.validateOperation({
          type: 'OPC-SESSION-OPEN',
          ...bindings,
          subject: getThrows({ ...subject }, 'subject'),
        }),
    ],
    [
      'validateOperation fence',
      () =>
        kernel.validateOperation({
          type: 'OPC-SESSION-OPEN',
          ...bindings,
          fence: getThrows({ ...operationFence }, 'fence'),
        }),
    ],
    ['validateAuthorityState outer', () => kernel.validateAuthorityState(getThrows({ ...state }, 'state'))],
    [
      'validateAuthorityState subject',
      () => kernel.validateAuthorityState({ ...state, subject: getThrows({ ...subject }, 'subject') }),
    ],
    [
      'validateAuthorityState fence',
      () => kernel.validateAuthorityState({ ...state, fence: getThrows({ ...fence }, 'fence') }),
    ],
    ['validateTransition outer', () => kernel.validateTransition(getThrows({ ...transition }, 'transition'))],
    [
      'validateTransition previous',
      () => kernel.validateTransition({ ...transition, previous: getThrows({ ...state }, 'previous') }),
    ],
    [
      'validateTransition trigger',
      () => kernel.validateTransition({ ...transition, trigger: getThrows({ ...event }, 'trigger') }),
    ],
    [
      'validateTransition trigger subject',
      () =>
        kernel.validateTransition({
          ...transition,
          trigger: { ...event, subject: getThrows({ ...subject }, 'subject') },
        }),
    ],
    [
      'validateTransition trigger fence',
      () =>
        kernel.validateTransition({ ...transition, trigger: { ...event, fence: getThrows({ ...fence }, 'fence') } }),
    ],
    [
      'validateTransition bindings',
      () => kernel.validateTransition({ ...transition, bindings: getThrows({ ...bindings }, 'bindings') }),
    ],
    [
      'validateTransition bindings subject',
      () =>
        kernel.validateTransition({
          ...transition,
          bindings: { ...bindings, subject: getThrows({ ...subject }, 'subject') },
        }),
    ],
    [
      'validateTransition bindings fence',
      () =>
        kernel.validateTransition({
          ...transition,
          bindings: { ...bindings, fence: getThrows({ ...fence }, 'fence') },
        }),
    ],
    [
      'validateTransition record',
      () => kernel.validateTransition({ ...transition, record: getThrows({ status: 'required' }, 'record') }),
    ],
    [
      'validateTransition operations',
      () => kernel.validateTransition({ ...transition, operations: getThrows([], 'operations') }),
    ],
    [
      'validateTransition operation element',
      () =>
        kernel.validateTransition({
          ...transition,
          operations: [getThrows({ type: 'OPC-SESSION-OPEN', ...bindings }, 'element')],
        }),
    ],
    ['reduceAuthority state', () => kernel.reduceAuthority(getThrows({ ...state }, 'state'), event, bindings)],
    ['reduceAuthority event', () => kernel.reduceAuthority(state, getThrows({ ...event }, 'event'), bindings)],
    ['reduceAuthority bindings', () => kernel.reduceAuthority(state, event, getThrows({ ...bindings }, 'bindings'))],
    [
      'reduceAuthority state subject',
      () => kernel.reduceAuthority({ ...state, subject: getThrows({ ...subject }, 'subject') }, event, bindings),
    ],
    [
      'reduceAuthority state fence',
      () => kernel.reduceAuthority({ ...state, fence: getThrows({ ...fence }, 'fence') }, event, bindings),
    ],
    [
      'reduceAuthority event subject',
      () => kernel.reduceAuthority(state, { ...event, subject: getThrows({ ...subject }, 'subject') }, bindings),
    ],
    [
      'reduceAuthority event fence',
      () => kernel.reduceAuthority(state, { ...event, fence: getThrows({ ...fence }, 'fence') }, bindings),
    ],
    [
      'reduceAuthority bindings subject',
      () => kernel.reduceAuthority(state, event, { ...bindings, subject: getThrows({ ...subject }, 'subject') }),
    ],
    [
      'reduceAuthority bindings fence',
      () => kernel.reduceAuthority(state, event, { ...bindings, fence: getThrows({ ...fence }, 'fence') }),
    ],
    ['replayAuthority initial state', () => kernel.replayAuthority(getThrows({ ...state }, 'state'), [])],
    [
      'replayAuthority initial subject',
      () => kernel.replayAuthority({ ...state, subject: getThrows({ ...subject }, 'subject') }, []),
    ],
    [
      'replayAuthority initial fence',
      () => kernel.replayAuthority({ ...state, fence: getThrows({ ...fence }, 'fence') }, []),
    ],
    ['replayAuthority steps', () => kernel.replayAuthority(state, getThrows([], 'steps'))],
    ['replayAuthority step', () => kernel.replayAuthority(state, [getThrows({ ...replayStep }, 'step')])],
    [
      'replayAuthority step event',
      () => kernel.replayAuthority(state, [{ ...replayStep, event: getThrows({ ...event }, 'event') }]),
    ],
    [
      'replayAuthority step bindings',
      () => kernel.replayAuthority(state, [{ ...replayStep, bindings: getThrows({ ...bindings }, 'bindings') }]),
    ],
    [
      'replayAuthority event subject',
      () =>
        kernel.replayAuthority(state, [
          { ...replayStep, event: { ...event, subject: getThrows({ ...subject }, 'subject') } },
        ]),
    ],
    [
      'replayAuthority event fence',
      () =>
        kernel.replayAuthority(state, [
          { ...replayStep, event: { ...event, fence: getThrows({ ...fence }, 'fence') } },
        ]),
    ],
    [
      'replayAuthority bindings subject',
      () =>
        kernel.replayAuthority(state, [
          { ...replayStep, bindings: { ...bindings, subject: getThrows({ ...subject }, 'subject') } },
        ]),
    ],
    [
      'replayAuthority bindings fence',
      () =>
        kernel.replayAuthority(state, [
          { ...replayStep, bindings: { ...bindings, fence: getThrows({ ...fence }, 'fence') } },
        ]),
    ],
  ];
  for (const [label, invoke] of cases) inputFailure(label, invoke);
});

test('authority kernel preserves a nested FC-FENCE transition failure', () => {
  const stale = {
    ...state,
    fence: { ...fence, basis: 'b'.repeat(64) },
  };
  const transition = {
    previous: stale,
    next: { ...state, storyState: 'Eligible' },
    trigger: event,
    bindings,
    operations: [],
    record: { status: 'required' },
  };
  assert.equal(kernel.validateAuthorityState(stale).error.failure, 'FC-FENCE');
  assert.equal(kernel.validateTransition(transition).error.failure, 'FC-FENCE');
});

test('authority kernel replay is total and fail-closed at its external step-array boundary', () => {
  const hostileStep = new Proxy(
    {},
    {
      get() {
        throw new Error('step get');
      },
      getPrototypeOf() {
        throw new Error('step prototype');
      },
      ownKeys() {
        throw new Error('step keys');
      },
    },
  );
  const hostileSteps = new Proxy([], {
    get() {
      throw new Error('steps get');
    },
    getPrototypeOf() {
      throw new Error('steps prototype');
    },
    ownKeys() {
      throw new Error('steps keys');
    },
  });
  for (const steps of [null, {}, hostileSteps, [null], [hostileStep]]) {
    const replay = () => kernel.replayAuthority(state, steps);
    assert.doesNotThrow(replay);
    assert.equal(replay().error.failure, 'FC-INPUT');
  }
});

test('authority kernel transition rejects a hostile operations array without escape', () => {
  const hostileOperations = new Proxy([], {
    get() {
      throw new Error('operations get');
    },
    getPrototypeOf() {
      throw new Error('operations prototype');
    },
  });
  const transition = {
    previous: state,
    next: { ...state, storyState: 'Eligible' },
    trigger: event,
    bindings,
    operations: hostileOperations,
    record: { status: 'required' },
  };
  const validate = () => kernel.validateTransition(transition);
  assert.doesNotThrow(validate);
  assert.equal(validate().error.failure, 'FC-INPUT');
});

test('authority kernel accepts every explicit legal edge and rejects its event complement', () => {
  const trace = (edge) => [edge.id, edge.from, edge.event, edge.to, edge.operation ?? ''].join('|');
  assert.equal(oracle.storyEdges.length, 80);
  assert.deepEqual(kernel.LEGAL_EDGES.map(trace), oracle.storyEdges);
  for (const edge of kernel.LEGAL_EDGES) {
    const input = { ...state, storyState: edge.from };
    const trigger = { ...event, type: edge.event, edge: edge.id };
    const edgeBindings = operationBindings(edge.operation ?? 'OPC-SESSION-OPEN');
    const result = kernel.reduceAuthority(input, trigger, edgeBindings);
    assert.equal(result.ok, true, `${edge.from}/${edge.event}`);
    assert.equal(result.value.next.storyState, edge.to);
    for (const illegal of kernel.EVENT_TYPES.filter((candidate) => candidate !== edge.event))
      assert.equal(
        kernel.reduceAuthority(input, { ...trigger, type: illegal }, edgeBindings).ok,
        false,
        `${edge.from}/${illegal}`,
      );
  }
});

test('authority kernel covers the normative phase-preserving lifecycle catalog', () => {
  const phasePreserving = [
    ['preparing-workspace-fact', 'Preparing', 'EV-WORKSPACE-FACT'],
    ['preparing-setup-fact', 'Preparing', 'EV-SETUP-FACT'],
    ['preparing-session-fact', 'Preparing', 'EV-SESSION-FACT'],
    ['implementing-session-fact', 'Implementing', 'EV-SESSION-FACT'],
    ['implementing-artifact-fact', 'Implementing', 'EV-ARTIFACT-FACT'],
    ['reviewing-session-fact', 'Reviewing', 'EV-SESSION-FACT'],
    ['reviewing-target-fact', 'Reviewing', 'EV-TARGET-FACT'],
    ['reviewing-artifact-fact', 'Reviewing', 'EV-ARTIFACT-FACT'],
    ['reworking-open', 'Reworking', 'EV-WAKE-CAPACITY'],
    ['reworking-assign', 'Reworking', 'EV-SESSION-FACT'],
    ['refreshing-session-fact', 'Refreshing', 'EV-SESSION-FACT'],
    ['refreshing-workspace-fact', 'Refreshing', 'EV-WORKSPACE-FACT'],
    ['finalizing-check-observation', 'Finalizing', 'EV-CHECK-OBSERVATION'],
    ['finalizing-target-fact', 'Finalizing', 'EV-TARGET-FACT'],
    ['finalizing-artifact-fact', 'Finalizing', 'EV-ARTIFACT-FACT'],
    ['finalizing-effect-certainty', 'Finalizing', 'EV-EFFECT-CERTAINTY'],
    ['finalizing-recovery-observation', 'Finalizing', 'EV-RECOVERY-OBSERVATION'],
    ['retiring-wake-settlement', 'Retiring', 'EV-WAKE-SETTLEMENT'],
    ['retiring-workspace-preserved', 'Retiring', 'EV-WORKSPACE-PRESERVED'],
    ['retiring-session-fact', 'Retiring', 'EV-SESSION-FACT'],
    ['retiring-target-fact', 'Retiring', 'EV-TARGET-FACT'],
    ['retiring-artifact-fact', 'Retiring', 'EV-ARTIFACT-FACT'],
  ];
  for (const [id, storyState, type] of phasePreserving) {
    const result = kernel.reduceAuthority(
      { ...state, storyState },
      { ...event, id: `${run}/event/2`, edge: id, type },
      ordered(2, type, id, kernel.LEGAL_EDGES.find((candidate) => candidate.id === id)?.operation).bindings,
    );
    assert.equal(result.ok, true, id);
    assert.equal(result.value.next.storyState, storyState, id);
  }
  for (const storyState of kernel.STORY_STATES.filter((candidate) => candidate !== 'Closed')) {
    const id = `${storyState.toLowerCase()}-owner-decision`;
    const result = kernel.reduceAuthority(
      { ...state, storyState },
      { ...event, id: `${run}/event/2`, edge: id, type: 'EV-OWNER-DECISION' },
      operationBindings('OPC-SESSION-RESPOND', 2),
    );
    assert.equal(result.ok, true, id);
    assert.equal(result.value.next.storyState, storyState, id);
    assert.deepEqual(
      result.value.operations.map((operation) => operation.type),
      ['OPC-SESSION-RESPOND'],
      id,
    );
  }
});

test('authority kernel Run catalog validates all V3a phases and realizes every controller-owned Run edge', () => {
  const trace = (edge) => [edge.id, edge.from, edge.event, edge.to].join('|');
  assert.equal(kernel.PRE_CONTROLLER_RUN_EDGES.length, 3);
  assert.equal(oracle.runEdges.length, 47);
  assert.equal(oracle.preControllerRunEdges.length, 3);
  assert.deepEqual(kernel.RUN_LEGAL_EDGES.map(trace), oracle.runEdges);
  assert.deepEqual(
    kernel.PRE_CONTROLLER_RUN_EDGES.map((edge) => [edge.id, edge.from, edge.to, edge.controllerOwned].join('|')),
    oracle.preControllerRunEdges,
  );
  assert.equal(
    kernel.PRE_CONTROLLER_RUN_EDGES.every((edge) => edge.controllerOwned === false),
    true,
  );
  for (const phase of kernel.RUN_PHASES)
    assert.equal(kernel.validateAuthorityState({ ...state, runPhase: phase }).ok, true, `${phase} must validate`);
  for (const edge of kernel.RUN_LEGAL_EDGES) {
    const input = { ...state, runPhase: edge.from };
    const trigger = { ...event, type: edge.event, edge: edge.id };
    const result = kernel.reduceAuthority(input, trigger, operationBindings('OPC-SESSION-OPEN'));
    assert.equal(result.ok, true, `${edge.from}/${edge.event}`);
    assert.equal(result.value.next.runPhase, edge.to);
    assert.equal(result.value.next.storyState, input.storyState);
    for (const illegal of kernel.EVENT_TYPES.filter((candidate) => candidate !== edge.event))
      assert.equal(
        kernel.reduceAuthority(input, { ...trigger, type: illegal }, operationBindings('OPC-SESSION-OPEN')).ok,
        false,
      );
  }
  assert.equal(
    kernel.reduceAuthority({ ...state, runPhase: 'Received' }, { ...event, edge: 'received-preflighting' }, bindings)
      .error.failure,
    'FC-AUTHORITY',
  );
});

test('authority kernel has no forgeable promotion or dispatch capability', () => {
  const decision = kernel.reduceAuthority(state, event, bindings);
  assert.equal(decision.ok, true);
  assert.equal('dispatch' in decision.value, false);
  assert.equal('adopted' in decision.value, false);
  assert.equal('confirmRecordedTransition' in kernel, false);
});

test('authority kernel replay is byte-stable and rejects descending, duplicate, and gapped committed positions', () => {
  const first = ordered(1, 'EV-WORKSPACE-PRESERVED', 'stopped-progress-workspace-preserved');
  const second = ordered(2, 'EV-ARTIFACT-FACT', 'stopped-progress-artifact-fact');
  const initial = { ...state, runPhase: 'Stopped' };
  const replay = kernel.replayAuthority(initial, [first, second]);
  const sameReplay = kernel.replayAuthority(structuredClone(initial), [
    structuredClone(first),
    structuredClone(second),
  ]);
  const descending = kernel.replayAuthority(initial, [second, first]);
  const duplicate = kernel.replayAuthority(initial, [first, first]);
  const gapped = kernel.replayAuthority(initial, [second]);
  assert.equal(replay.ok, true);
  assert.equal(sameReplay.ok, true);
  assert.equal(descending.ok, false);
  assert.equal(duplicate.ok, false);
  assert.equal(gapped.ok, false);
  assert.equal(JSON.stringify(replay), JSON.stringify(sameReplay));
});
