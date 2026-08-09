import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const kernel = await import('../dist/index.js');
const oracle = JSON.parse(readFileSync(resolve(import.meta.dirname, './fixtures/run-control-oracle.json'), 'utf8'));

const run = 'run-000000000001-aaaaaaaaaaaaaaaa';
const basis = 'a'.repeat(64);
const candidate = 'b'.repeat(64);
const frozenRule = 'c'.repeat(64);
const touchedRule = 'd'.repeat(64);
const gen = (ordinal) => `${run}/gen/${ordinal}|controller-token-${ordinal}`;
const txn = (ordinal, generation = gen(ordinal)) => `${run}/txn/${ordinal}/${generation}|${basis}`;
const event = (ordinal) => `${run}/event/${ordinal}`;
const story = (key) => `${run}/story/${key}`;
const principal = 'principal/owner';
const grant = `${run}/grant/1`;
const digest = (letter) => letter.repeat(64);

const proof = (position, ordinal = position + 1, generation = gen(ordinal)) => ({
  position,
  transaction: txn(ordinal, generation),
  recordDigest: digest('e'),
  witnessDigest: digest('e'),
  witnessed: true,
});

const duty = (ordinal, kind = 'preserve-story', key = 'one') => ({
  id: `duty-${ordinal}`,
  kind,
  story: story(key),
  ordinal,
  basisDigest: basis,
  status: 'open',
  nextIntent: {
    kind,
    duty: `duty-${ordinal}`,
    basisDigest: basis,
    authorizationBasis: `basis-${ordinal}`,
  },
});

const makeController = ({
  phase = 'Active',
  ledger = kernel.createScriptedRunControlLedger(),
  settlementDuties = [duty(1), duty(2, 'reconcile-operation')],
} = {}) => {
  const generation = gen(1);
  const result = kernel.createRunControlController({
    run,
    phase,
    generation,
    basisDigest: basis,
    frozenRuleSurface: {
      schema: kernel.RULE_SURFACE_SCHEMA,
      run,
      basisDigest: basis,
      ruleSurfaceDigest: frozenRule,
      candidateDigest: candidate,
      generation,
      approved: true,
    },
    stories: [
      { story: story('one'), state: 'Implementing', businessDigest: digest('f'), basisDigest: basis },
      { story: story('two'), state: 'Waiting', businessDigest: digest('8'), basisDigest: basis },
    ],
    finalizationFences: [
      { story: story('one'), operation: `${txn(1)}/op/1`, basisDigest: basis, generation, status: 'retained-fenced' },
    ],
    settlementDuties,
    currentGrant: { principal, grant, run, basisDigest: basis, generation, scope: 'run-control' },
    ledger,
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  return { controller: result.value, ledger };
};

const suspendInput = (requestKey = 'suspend-1') => ({
  requestKey,
  eventId: event(1),
  principal,
  grant,
  run,
  basisDigest: basis,
  generation: gen(1),
  reason: 'owner-pause',
});

test('GF-037 oracle is versioned and exposes the closed event/terminal surface', () => {
  assert.equal(oracle.contract, kernel.RUN_CONTROL_CONTRACT_VERSION);
  assert.deepEqual(oracle.schemas, [
    kernel.RULE_SURFACE_SCHEMA,
    kernel.RULE_SURFACE_EVENT_SCHEMA,
    kernel.RUN_CONTROL_EVENT_SCHEMA,
    kernel.SETTLEMENT_SCHEMA,
  ]);
  assert.deepEqual(oracle.events, [...kernel.RUN_CONTROL_EVENTS]);
});

test('MC-037-01: touched frozen rule surface invalidates authority and parks before dispatch', () => {
  const { controller } = makeController();
  const result = controller.touchRuleSurface({
    requestKey: 'touch-1',
    eventId: event(1),
    observedRuleSurfaceDigest: touchedRule,
    changedSubjects: [story('one')],
    basisDigest: basis,
    generation: gen(1),
    candidateDigest: candidate,
    reapprovalDigest: null,
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.phase, 'Parked');
  assert.equal(result.value.dispatchEnabled, false);
  assert.equal(result.value.candidateAuthority, 'invalidated');
  assert.equal(result.value.ruleReapprovalRequired, true);
  assert.deepEqual(
    controller.touchRuleSurface({
      requestKey: 'touch-2',
      eventId: event(2),
      observedRuleSurfaceDigest: touchedRule,
      changedSubjects: [story('one')],
      basisDigest: basis,
      generation: gen(1),
      candidateDigest: candidate,
      reapprovalDigest: null,
    }).error,
    { family: 'FC-RULES', code: 'INVALID_RULE_SURFACE_TOUCH' },
  );
});

test('MC-037-02: only exact owner/current-grant suspension is accepted and fences dispatch', () => {
  const { controller } = makeController();
  assert.deepEqual(controller.suspend({ ...suspendInput(), grant: `${run}/grant/2` }).error, {
    family: 'FC-AUTHORITY',
    code: 'EXACT_CURRENT_GRANT_REQUIRED',
  });
  const result = controller.suspend(suspendInput());
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.phase, 'Suspended');
  assert.equal(result.value.dispatchEnabled, false);
  assert.equal(result.value.finalizationAuthorityFenced, true);
  assert.equal(result.value.stories[0].state, 'Implementing');
});

test('MC-037-03: resume requires integrity, accepted-successor exclusion, a new generation, and exact reapproval', () => {
  const { controller } = makeController();
  assert.equal(controller.suspend(suspendInput()).ok, true);
  const base = {
    requestKey: 'resume-1',
    eventId: event(2),
    principal,
    grant,
    run,
    basisDigest: basis,
    generation: gen(1),
    newGeneration: gen(2),
    targetPhase: 'Active',
    reapprovalDigest: null,
  };
  const rejected = controller.resume({ ...base, integrity: null });
  assert.equal(rejected.ok, true, JSON.stringify(rejected));
  assert.equal(rejected.value.phase, 'Parked');

  const { controller: successful } = makeController();
  assert.equal(successful.suspend(suspendInput()).ok, true);
  const resumed = successful.resume({
    ...base,
    requestKey: 'resume-2',
    integrity: {
      schema: 'jig.resume-integrity.v1',
      run,
      basisDigest: basis,
      oldGeneration: gen(1),
      newGeneration: gen(2),
      head: proof(1, 2),
      acceptedSuccessor: false,
      status: 'passed',
    },
  });
  assert.equal(resumed.ok, true, JSON.stringify(resumed));
  assert.equal(resumed.value.phase, 'Active');
  assert.equal(resumed.value.generation, gen(2));
  assert.equal(resumed.value.currentGrant.generation, gen(2));
});

test('MC-037-04: terminal stop has exactly two guarded origins', () => {
  const { controller } = makeController();
  const common = {
    requestKey: 'stop-1',
    eventId: event(2),
    run,
    basisDigest: basis,
    generation: gen(1),
    principal,
    grant,
    resumable: false,
    reason: 'owner-stop',
    confirmation: 'no-resumable-transition',
    observation: null,
    appendBasis: proof(1, 1),
  };
  assert.deepEqual(controller.terminalStop(common).error, {
    family: 'FC-AUTHORITY',
    code: 'TERMINAL_STOP_ORIGIN_NOT_ALLOWED',
  });
  assert.equal(controller.suspend(suspendInput()).ok, true);
  assert.deepEqual(
    controller.terminalStop({ ...common, requestKey: 'stop-2', eventId: event(2), resumable: true }).error,
    {
      family: 'FC-AUTHORITY',
      code: 'RESUMABLE_SUSPENDED_CANNOT_STOP',
    },
  );
  const stopped = controller.terminalStop({ ...common, requestKey: 'stop-3', eventId: event(2) });
  assert.equal(stopped.ok, true, JSON.stringify(stopped));
  assert.equal(stopped.value.phase, 'Stopped');
  assert.equal(stopped.value.settlement?.openedBy, 'EV-RUN-TERMINAL-STOP-DECISION');

  for (const phase of ['Active', 'Parked', 'Settling']) {
    const fresh = makeController({ phase }).controller;
    assert.deepEqual(fresh.terminalStop(common).error, {
      family: 'FC-AUTHORITY',
      code: 'TERMINAL_STOP_ORIGIN_NOT_ALLOWED',
    });
  }
});

test('MC-037-05: absent or untrustworthy trust basis creates only an external fence', () => {
  const { controller, ledger } = makeController({ phase: 'Interrupted / Recovering' });
  const input = {
    requestKey: 'trust-stop-1',
    eventId: event(1),
    run,
    basisDigest: basis,
    generation: gen(1),
    principal: null,
    grant: null,
    resumable: null,
    reason: 'witness-loss',
    confirmation: null,
    observation: null,
    appendBasis: null,
  };
  assert.deepEqual(controller.terminalStop(input).error, { family: 'FC-TRUST', code: 'TRUST_APPEND_BASIS_REQUIRED' });
  assert.equal(controller.snapshot().phase, 'Interrupted / Recovering');
  assert.equal(controller.snapshot().settlement, null);
  assert.equal(controller.events().length, 0);
  assert.equal(ledger.records().length, 0);
  assert.equal(controller.snapshot().externalFence?.kind, 'FC-TRUST');
});

test('MC-037-06/07/08: qualified FC-TRUST recovery atomically opens one zero-progress preserved overlay', () => {
  const { controller, ledger } = makeController({ phase: 'Interrupted / Recovering' });
  const result = controller.terminalStop({
    requestKey: 'trust-stop-2',
    eventId: event(1),
    run,
    basisDigest: basis,
    generation: gen(1),
    principal: null,
    grant: null,
    resumable: null,
    reason: 'witness-loss',
    confirmation: null,
    appendBasis: proof(0, 1),
    observation: {
      kind: 'FC-TRUST',
      run,
      basisDigest: basis,
      generation: gen(1),
      reason: 'witness-loss',
      appendBasis: proof(0, 1),
    },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  const overlay = result.value.settlement;
  assert.equal(overlay?.id, `${run}/settlement/terminal-stop`);
  assert.equal(overlay?.status, 'opened');
  assert.equal(overlay?.advancedDuties, 0);
  assert.equal(overlay?.completedDuties, 0);
  assert.equal(overlay?.duties.length, 2);
  assert.deepEqual(
    overlay?.nextIntents.map((intent) => intent.duty),
    ['duty-1', 'duty-2'],
  );
  assert.equal(result.value.stories[0].state, 'Implementing');
  assert.equal(result.value.finalizationAuthorityFenced, true);
  assert.equal(ledger.records().length, 1);
  assert.deepEqual(
    controller.terminalStop({
      requestKey: 'trust-stop-3',
      eventId: event(2),
      run,
      basisDigest: basis,
      generation: gen(1),
      principal: null,
      grant: null,
      resumable: null,
      reason: 'second',
      confirmation: null,
      appendBasis: proof(0, 1),
      observation: {
        kind: 'FC-TRUST',
        run,
        basisDigest: basis,
        generation: gen(1),
        reason: 'second',
        appendBasis: proof(0, 1),
      },
    }).error,
    { family: 'FC-AUTHORITY', code: 'SETTLEMENT_ALREADY_OPEN' },
  );
  assert.equal('advance' in controller, false);
  assert.equal('accept' in controller, false);
  assert.equal('release' in controller, false);
});

test('crash/replay and idempotency remain conservative and deterministic', () => {
  const ledger = kernel.createScriptedRunControlLedger({ fault: 'lost-response' });
  const { controller } = makeController({ ledger });
  const input = suspendInput('replay-1');
  const first = controller.suspend(input);
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(controller.events().length, 1);
  const replay = controller.suspend(input);
  assert.equal(replay.ok, true, JSON.stringify(replay));
  assert.deepEqual(controller.suspend({ ...input, reason: 'different' }).error, {
    family: 'FC-FENCE',
    code: 'IDEMPOTENCY_KEY_COLLISION',
  });
  const unwitnessed = makeController({ ledger: kernel.createScriptedRunControlLedger({ fault: 'unwitnessed' }) });
  assert.deepEqual(unwitnessed.controller.suspend(suspendInput()).error, {
    family: 'FC-TRUST',
    code: 'ATOMIC_APPEND_UNCERTAIN',
  });
  assert.equal(unwitnessed.controller.snapshot().phase, 'Active');
});

test('descriptor-safe validation rejects accessors, unknown fields, and hostile external objects', () => {
  const value = { ...makeController().controller };
  void value;
  const hostile = { ...suspendInput(), extra: true };
  const { controller } = makeController();
  assert.deepEqual(controller.suspend(hostile).error, { family: 'FC-INPUT', code: 'INVALID_SUSPEND_DECISION' });
  const accessor = {};
  Object.defineProperty(accessor, 'requestKey', { enumerable: true, get: () => 'x' });
  for (const field of Object.keys(suspendInput()))
    if (!(field in accessor))
      Object.defineProperty(accessor, field, { enumerable: true, value: suspendInput()[field] });
  assert.deepEqual(controller.suspend(accessor).error, { family: 'FC-INPUT', code: 'INVALID_SUSPEND_DECISION' });
});
