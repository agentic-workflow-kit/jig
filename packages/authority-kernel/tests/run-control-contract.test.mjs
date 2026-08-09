import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const kernel = await import('../dist/index.js');
const codec = await import('@agentic-workflow-kit/jig-codec');
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
const stagedDigest = (domain, value) => codec.stageDigest({ domain, excludePaths: [], value }).value.digest;

const proof = (position, ordinal = position + 1, generation = gen(ordinal)) => ({
  position,
  transaction: txn(ordinal, generation),
  recordDigest: digest('e'),
  witnessDigest: digest('e'),
  witnessed: true,
});

const witness = (ledger, position = ledger.records().length - 1) => {
  const record = ledger.records()[position];
  assert.ok(record);
  return {
    position,
    transaction: record.transaction,
    recordDigest: record.contentDigest,
    witnessDigest: record.contentDigest,
    witnessed: true,
  };
};

const seededLedger = ({ event: seededEvent, payload, generation = gen(1), ordinal = 1 }) =>
  kernel.createScriptedRunControlLedger({
    seed: [
      {
        requestKey: `seed-${ordinal}`,
        event: seededEvent,
        transaction: txn(ordinal, generation),
        payload,
      },
    ],
  });

const appendDurable = (ledger, { requestKey, event: durableEvent, payload, generation, ordinal }) => {
  const position = ledger.records().length;
  const transaction = txn(ordinal, generation);
  const result = ledger.append({
    requestKey,
    expectedPosition: position,
    transaction,
    content: {
      schema: kernel.RUN_CONTROL_EVENT_SCHEMA,
      controller: kernel.RUN_CONTROL_CONTROLLER,
      requestKey,
      event: durableEvent,
      position,
      transaction,
      before: null,
      after: null,
      payload,
    },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
};

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
  settlementDuties = null,
} = {}) => {
  const generation = gen(1);
  const stories = [
    { story: story('one'), state: 'Implementing', businessDigest: digest('f'), basisDigest: basis },
    { story: story('two'), state: 'Waiting', businessDigest: digest('8'), basisDigest: basis },
  ];
  const finalizationFences = [
    { story: story('one'), operation: `${txn(1)}/op/1`, basisDigest: basis, generation, status: 'retained-fenced' },
  ];
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
    stories,
    finalizationFences,
    settlementDuties: settlementDuties ?? kernel.createSettlementDuties(run, basis, stories, finalizationFences),
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

  assert.deepEqual(
    makeController({ phase: 'Stopped' }).controller.touchRuleSurface({
      requestKey: 'touch-stopped',
      eventId: event(3),
      observedRuleSurfaceDigest: touchedRule,
      changedSubjects: [story('one')],
      basisDigest: basis,
      generation: gen(1),
      candidateDigest: candidate,
      reapprovalDigest: null,
    }).error,
    { family: 'FC-RULES', code: 'RULE_SURFACE_TOUCH_ORIGIN_NOT_ALLOWED' },
  );

  const suspended = makeController().controller;
  assert.equal(suspended.suspend(suspendInput('touch-suspend')).ok, true);
  assert.deepEqual(
    suspended.touchRuleSurface({
      requestKey: 'touch-suspended',
      eventId: event(3),
      observedRuleSurfaceDigest: touchedRule,
      changedSubjects: [story('one')],
      basisDigest: basis,
      generation: gen(1),
      candidateDigest: candidate,
      reapprovalDigest: null,
    }).error,
    { family: 'FC-RULES', code: 'RULE_SURFACE_TOUCH_ORIGIN_NOT_ALLOWED' },
  );

  const fresh = makeController().controller;
  const invalidTouch = {
    requestKey: 'touch-empty-subjects',
    eventId: event(4),
    observedRuleSurfaceDigest: touchedRule,
    changedSubjects: [],
    basisDigest: basis,
    generation: gen(1),
    candidateDigest: candidate,
    reapprovalDigest: null,
  };
  assert.deepEqual(fresh.touchRuleSurface(invalidTouch).error, {
    family: 'FC-RULES',
    code: 'INVALID_RULE_SURFACE_TOUCH',
  });
  assert.deepEqual(
    fresh.touchRuleSurface({
      ...invalidTouch,
      requestKey: 'touch-foreign-subject',
      changedSubjects: [story('foreign')],
    }).error,
    {
      family: 'FC-RULES',
      code: 'INVALID_RULE_SURFACE_TOUCH',
    },
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
    reapprovalBasis: null,
  };
  const rejected = controller.resume({ ...base, integrity: null });
  assert.equal(rejected.ok, true, JSON.stringify(rejected));
  assert.equal(rejected.value.phase, 'Parked');

  const ledger = seededLedger({
    event: 'EV-RUN-SUSPEND-DECISION',
    generation: gen(1),
    ordinal: 2,
    payload: { kind: 'current-durable-head', run, basisDigest: basis, generation: gen(1) },
  });
  const { controller: successful } = makeController({ phase: 'Suspended', ledger });
  const resumed = successful.resume({
    ...base,
    requestKey: 'resume-2',
    integrity: {
      schema: 'jig.resume-integrity.v1',
      run,
      basisDigest: basis,
      oldGeneration: gen(1),
      newGeneration: gen(2),
      head: witness(ledger),
      acceptedSuccessor: false,
      status: 'passed',
    },
  });
  assert.equal(resumed.ok, true, JSON.stringify(resumed));
  assert.equal(resumed.value.phase, 'Active');
  assert.equal(resumed.value.generation, gen(2));
  assert.equal(resumed.value.currentGrant.generation, gen(2));
  assert.equal(ledger.records().filter((record) => record.event === 'EV-RUN-RESUME-DECISION').length, 1);
  assert.equal(ledger.records().at(-1)?.content.before.phase, 'Suspended');
  assert.equal(ledger.records().at(-1)?.content.after.phase, 'Active');

  const historicalTriggerLedger = seededLedger({
    event: 'EV-RUN-RESUME-DECISION',
    generation: gen(1),
    payload: { kind: 'resume-integrity', run, basisDigest: basis, oldGeneration: gen(1), newGeneration: gen(2) },
  });
  const historicalTrigger = makeController({ phase: 'Suspended', ledger: historicalTriggerLedger }).controller;
  const historicalResume = historicalTrigger.resume({
    ...base,
    requestKey: 'resume-historical-trigger',
    integrity: {
      schema: 'jig.resume-integrity.v1',
      run,
      basisDigest: basis,
      oldGeneration: gen(1),
      newGeneration: gen(2),
      head: witness(historicalTriggerLedger),
      acceptedSuccessor: false,
      status: 'passed',
    },
  });
  assert.equal(historicalResume.ok, true, JSON.stringify(historicalResume));
  assert.equal(historicalResume.value.phase, 'Parked');

  const staleLedger = kernel.createScriptedRunControlLedger({
    seed: [
      {
        requestKey: 'seed-stale-head',
        event: 'EV-RUN-SUSPEND-DECISION',
        transaction: txn(1, gen(1)),
        payload: { kind: 'current-durable-head', run, basisDigest: basis, generation: gen(1) },
      },
      {
        requestKey: 'seed-current-other',
        event: 'EV-RULE-SURFACE-TOUCHED',
        transaction: txn(2, gen(1)),
        payload: { kind: 'other-durable-fact', run, basisDigest: basis, generation: gen(1) },
      },
    ],
  });
  const stale = makeController({ phase: 'Suspended', ledger: staleLedger }).controller;
  const staleResume = stale.resume({
    ...base,
    requestKey: 'resume-stale-head',
    integrity: {
      schema: 'jig.resume-integrity.v1',
      run,
      basisDigest: basis,
      oldGeneration: gen(1),
      newGeneration: gen(2),
      head: witness(staleLedger, 0),
      acceptedSuccessor: false,
      status: 'passed',
    },
  });
  assert.equal(staleResume.ok, true, JSON.stringify(staleResume));
  assert.equal(staleResume.value.phase, 'Parked');

  const unbound = makeController({ phase: 'Suspended' }).controller;
  const unboundResume = unbound.resume({
    ...base,
    requestKey: 'resume-unbound',
    integrity: {
      schema: 'jig.resume-integrity.v1',
      run,
      basisDigest: basis,
      oldGeneration: gen(1),
      newGeneration: gen(2),
      head: proof(0, 2),
      acceptedSuccessor: false,
      status: 'passed',
    },
  });
  assert.equal(unboundResume.ok, true, JSON.stringify(unboundResume));
  assert.equal(unboundResume.value.phase, 'Parked');

  const touchedLedger = seededLedger({
    event: 'EV-RUN-SUSPEND-DECISION',
    generation: gen(1),
    ordinal: 1,
    payload: { kind: 'current-durable-head', run, basisDigest: basis, generation: gen(1) },
  });
  const touched = makeController({ ledger: touchedLedger }).controller;
  assert.equal(
    touched.touchRuleSurface({
      requestKey: 'touch-before-resume',
      eventId: event(3),
      observedRuleSurfaceDigest: touchedRule,
      changedSubjects: [story('one')],
      basisDigest: basis,
      generation: gen(1),
      candidateDigest: candidate,
      reapprovalDigest: null,
    }).ok,
    true,
  );
  assert.equal(touched.suspend(suspendInput('touch-suspend-after')).ok, true);
  appendDurable(touchedLedger, {
    requestKey: 'durable-unapproved-head',
    event: 'EV-RUN-SUSPEND-DECISION',
    generation: gen(1),
    ordinal: 3,
    payload: { kind: 'current-durable-head', run, basisDigest: basis, generation: gen(1) },
  });
  const unapproved = touched.resume({
    ...base,
    requestKey: 'touch-unapproved-resume',
    reapprovalDigest: touchedRule,
    integrity: {
      schema: 'jig.resume-integrity.v1',
      run,
      basisDigest: basis,
      oldGeneration: gen(1),
      newGeneration: gen(2),
      head: witness(touchedLedger),
      acceptedSuccessor: false,
      status: 'passed',
    },
  });
  assert.equal(unapproved.ok, true, JSON.stringify(unapproved));
  assert.equal(unapproved.value.phase, 'Parked');

  const approvalWithoutDigest = {
    kind: 'rule-reapproval',
    run,
    basisDigest: basis,
    generation: gen(1),
    ruleSurfaceDigest: touchedRule,
    candidateDigest: candidate,
    principal,
    grant,
  };
  const approvedLedger = kernel.createScriptedRunControlLedger({
    seed: [
      {
        requestKey: 'seed-approval',
        event: 'EV-RULE-SURFACE-TOUCHED',
        transaction: txn(1, gen(1)),
        payload: { ...approvalWithoutDigest, approvalDigest: stagedDigest('RULE-REAPPROVAL', approvalWithoutDigest) },
      },
      {
        requestKey: 'seed-resume-integrity',
        event: 'EV-RUN-SUSPEND-DECISION',
        transaction: txn(2, gen(1)),
        payload: { kind: 'current-durable-head', run, basisDigest: basis, generation: gen(1) },
      },
    ],
  });
  const approved = makeController({ ledger: approvedLedger }).controller;
  assert.equal(
    approved.touchRuleSurface({
      requestKey: 'touch-approved',
      eventId: event(4),
      observedRuleSurfaceDigest: touchedRule,
      changedSubjects: [story('one')],
      basisDigest: basis,
      generation: gen(1),
      candidateDigest: candidate,
      reapprovalDigest: null,
    }).ok,
    true,
  );
  assert.equal(approved.suspend(suspendInput('approved-suspend')).ok, true);
  appendDurable(approvedLedger, {
    requestKey: 'durable-approved-head',
    event: 'EV-RUN-SUSPEND-DECISION',
    generation: gen(1),
    ordinal: 3,
    payload: { kind: 'current-durable-head', run, basisDigest: basis, generation: gen(1) },
  });
  const approvedResume = approved.resume({
    ...base,
    requestKey: 'approved-resume',
    reapprovalDigest: stagedDigest('RULE-REAPPROVAL', approvalWithoutDigest),
    reapprovalBasis: witness(approvedLedger, 0),
    integrity: {
      schema: 'jig.resume-integrity.v1',
      run,
      basisDigest: basis,
      oldGeneration: gen(1),
      newGeneration: gen(2),
      head: witness(approvedLedger),
      acceptedSuccessor: false,
      status: 'passed',
    },
  });
  assert.equal(approvedResume.ok, true, JSON.stringify(approvedResume));
  assert.equal(approvedResume.value.phase, 'Active', JSON.stringify(approvedResume));
});

test('MC-037-04: terminal stop has exactly two guarded origins', () => {
  const ledger = seededLedger({
    event: 'EV-RUN-SUSPEND-DECISION',
    payload: { kind: 'current-durable-head', run, basisDigest: basis, generation: gen(1) },
  });
  const { controller } = makeController({ phase: 'Suspended', ledger });
  const common = {
    requestKey: 'stop-1',
    eventId: event(2),
    run,
    basisDigest: basis,
    generation: gen(1),
    principal,
    grant,
    resumable: false,
    remainingResumableTransitions: 0,
    reason: 'owner-stop',
    confirmation: 'no-resumable-transition',
    observation: null,
    appendBasis: witness(ledger),
  };
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
  assert.equal(ledger.records().filter((record) => record.event === 'EV-RUN-TERMINAL-STOP-DECISION').length, 1);
  assert.equal(ledger.records().at(-1)?.content.before.phase, 'Suspended');
  assert.equal(ledger.records().at(-1)?.content.after.phase, 'Stopped');
  const replayedStop = controller.terminalStop({ ...common, requestKey: 'stop-3' });
  assert.equal(replayedStop.ok, true, JSON.stringify(replayedStop));
  assert.equal(ledger.records().filter((record) => record.event === 'EV-RUN-TERMINAL-STOP-DECISION').length, 1);

  const crashLedger = kernel.createScriptedRunControlLedger({
    fault: 'lost-response',
    seed: [
      {
        requestKey: 'seed-crash-head',
        event: 'EV-RUN-SUSPEND-DECISION',
        transaction: txn(1, gen(1)),
        payload: { kind: 'current-durable-head', run, basisDigest: basis, generation: gen(1) },
      },
    ],
  });
  const crashed = makeController({ phase: 'Suspended', ledger: crashLedger }).controller;
  const crashResult = crashed.terminalStop({ ...common, requestKey: 'stop-crash', appendBasis: witness(crashLedger) });
  assert.equal(crashResult.ok, true, JSON.stringify(crashResult));
  assert.equal(crashLedger.records().length, 2);
  assert.equal(crashLedger.records().filter((record) => record.event === 'EV-RUN-TERMINAL-STOP-DECISION').length, 1);

  const historicalTrigger = seededLedger({
    event: 'EV-RUN-TERMINAL-STOP-DECISION',
    payload: { kind: 'terminal-owner-decision', run, basisDigest: basis, generation: gen(1) },
  });
  const historical = makeController({ phase: 'Suspended', ledger: historicalTrigger }).controller;
  assert.deepEqual(historical.terminalStop({ ...common, appendBasis: witness(historicalTrigger) }).error, {
    family: 'FC-TRUST',
    code: 'TRUST_APPEND_BASIS_REQUIRED',
  });

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
    remainingResumableTransitions: null,
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

  const forged = makeController({ phase: 'Interrupted / Recovering' });
  const forgedResult = forged.controller.terminalStop({
    requestKey: 'trust-stop-forged',
    eventId: event(2),
    run,
    basisDigest: basis,
    generation: gen(1),
    principal: null,
    grant: null,
    resumable: null,
    remainingResumableTransitions: null,
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
  assert.deepEqual(forgedResult.error, { family: 'FC-TRUST', code: 'TRUST_APPEND_BASIS_REQUIRED' });
  assert.equal(forged.controller.snapshot().phase, 'Interrupted / Recovering');
  assert.equal(forged.controller.events().length, 0);

  const genericLedger = seededLedger({
    event: 'EV-RUN-SUSPEND-DECISION',
    payload: { kind: 'current-durable-head', run, basisDigest: basis, generation: gen(1) },
  });
  const generic = makeController({ phase: 'Interrupted / Recovering', ledger: genericLedger });
  const genericResult = generic.controller.terminalStop({
    ...input,
    requestKey: 'trust-stop-generic',
    appendBasis: witness(genericLedger),
    observation: {
      kind: 'FC-TRUST',
      run,
      basisDigest: basis,
      generation: gen(1),
      reason: 'witness-loss',
      appendBasis: witness(genericLedger),
    },
  });
  assert.deepEqual(genericResult.error, { family: 'FC-TRUST', code: 'TRUST_OBSERVATION_REQUIRED' });
  assert.equal(generic.controller.snapshot().phase, 'Interrupted / Recovering');
});

test('MC-037-06: incomplete or foreign settlement inventory is rejected before controller creation', () => {
  const stories = [{ story: story('one'), state: 'Implementing', businessDigest: digest('f'), basisDigest: basis }];
  const fences = [];
  const invalid = kernel.createRunControlController({
    run,
    phase: 'Active',
    generation: gen(1),
    basisDigest: basis,
    frozenRuleSurface: {
      schema: kernel.RULE_SURFACE_SCHEMA,
      run,
      basisDigest: basis,
      ruleSurfaceDigest: frozenRule,
      candidateDigest: candidate,
      generation: gen(1),
      approved: true,
    },
    stories,
    finalizationFences: fences,
    settlementDuties: [duty(1)],
    currentGrant: { principal, grant, run, basisDigest: basis, generation: gen(1), scope: 'run-control' },
    ledger: kernel.createScriptedRunControlLedger(),
  });
  assert.deepEqual(invalid.error, { family: 'FC-AUTHORITY', code: 'INCOMPLETE_SETTLEMENT_DUTY_INVENTORY' });
});

test('MC-037-06/07/08: qualified FC-TRUST recovery atomically opens one zero-progress preserved overlay', () => {
  const ledger = seededLedger({
    event: 'EV-RUN-SUSPEND-DECISION',
    payload: { kind: 'current-durable-head', run, basisDigest: basis, generation: gen(1) },
  });
  const { controller } = makeController({ phase: 'Interrupted / Recovering', ledger });
  const result = controller.terminalStop({
    requestKey: 'trust-stop-2',
    eventId: event(1),
    run,
    basisDigest: basis,
    generation: gen(1),
    principal: null,
    grant: null,
    resumable: null,
    remainingResumableTransitions: null,
    reason: 'witness-loss',
    confirmation: null,
    appendBasis: witness(ledger),
    observation: {
      kind: 'FC-TRUST',
      run,
      basisDigest: basis,
      generation: gen(1),
      reason: 'witness-loss',
      trustClass: 'FC-TRUST',
      appendBasis: witness(ledger),
    },
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  const overlay = result.value.settlement;
  assert.equal(overlay?.id, `${run}/settlement/terminal-stop`);
  assert.equal(overlay?.status, 'opened');
  assert.equal(overlay?.advancedDuties, 0);
  assert.equal(overlay?.completedDuties, 0);
  assert.equal(ledger.records().filter((record) => record.event === 'EV-RECOVERY-OBSERVATION').length, 1);
  assert.equal(ledger.records().at(-1)?.content.before.phase, 'Interrupted / Recovering');
  assert.equal(ledger.records().at(-1)?.content.after.phase, 'Stopped');
  assert.equal(overlay?.duties.length, 10);
  assert.equal(
    overlay?.nextIntents.every((intent) => intent.basisDigest === basis),
    true,
  );
  assert.equal(result.value.stories[0].state, 'Implementing');
  assert.equal(result.value.finalizationAuthorityFenced, true);
  assert.equal(ledger.records().length, 2);
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
      remainingResumableTransitions: null,
      reason: 'second',
      confirmation: null,
      appendBasis: witness(ledger),
      observation: {
        kind: 'FC-TRUST',
        run,
        basisDigest: basis,
        generation: gen(1),
        reason: 'second',
        appendBasis: witness(ledger),
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
