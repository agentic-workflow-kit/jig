import assert from 'node:assert/strict';
import test from 'node:test';

const bounds = await import('../dist/index.js');

const d = (character) => character.repeat(64);
const hd = (number) => number.toString(16).padStart(64, '0');
const run = 'run-bounds-000000000000000000000000';
const story = `${run}/story/bounds`;
const subject = { run, story, basis: d('a') };
const generation = `${run}/gen/1|controller`;
const clock = (at, _character = 'b', clockGeneration = generation) => {
  const body = {
    schema: bounds.CLOCK_FACT_VERSION,
    kind: 'witnessed',
    generation: clockGeneration,
    at,
    digest: '',
  };
  return { ...body, digest: bounds.witnessedClockDigest(body) };
};
const livenessObservation = (at, kind, factDigest, factKind = kind === 'heartbeat' ? 'heartbeat' : 'SCH-CANDIDATE') => {
  const body = {
    schema: bounds.BOUNDS_VERSION,
    event: 'EV-LIVENESS-OBSERVED',
    subject,
    generation,
    at,
    source: 'mechanism',
    durable: true,
    committed: true,
    observer: 'CP-MEDIATOR',
    position: at,
    kind,
    factKind,
    factDigest,
  };
  return { ...body, commitDigest: bounds.livenessObservationDigest(body) };
};
const policy = () => bounds.defaultBoundPolicy();
const start = (journal, surface, at = 0, character = '0') =>
  journal.start({
    surface,
    subject,
    generation,
    policy: policy(),
    startedAt: at,
    clock: clock(at, character),
    factDigest: d(character),
  });

test('CF-BOUNDS: the twelve classes retain the exact DR-9 defaults, ranges, units, and fixed dispositions', () => {
  assert.deepEqual(
    [...bounds.BOUND_CLASSES],
    [
      'BND-REWORK',
      'BND-RETRY',
      'BND-REFRESH',
      'BND-WAIT-DECISION',
      'BND-WAIT-MECHANISM',
      'BND-WAIT-CAPACITY',
      'BND-WAIT-LEDGER',
      'BND-WAIT-TARGET',
      'BND-IDLE',
      'BND-SILENCE',
      'BND-RECOVERY',
      'BND-RETIRE',
    ],
  );
  assert.deepEqual(bounds.BOUND_DEFINITIONS['BND-REWORK'], {
    default: 2,
    lower: 1,
    upper: 5,
    unit: 'count',
    exhaustion: 'block',
  });
  assert.deepEqual(bounds.BOUND_DEFINITIONS['BND-WAIT-LEDGER'], {
    default: 30,
    lower: 1,
    upper: 300,
    unit: 'seconds',
    exhaustion: 'recover',
  });
  assert.deepEqual(bounds.BOUND_DEFINITIONS['BND-RETIRE'], {
    default: 3,
    lower: 1,
    upper: 5,
    unit: 'count',
    exhaustion: 'residual-obligation',
  });
  assert.equal(bounds.BOUND_CLASSES.length, 12);
});

test('CF-BOUNDS: policy digest and boundaries fail closed', () => {
  const valid = policy();
  assert.equal(bounds.validateBoundPolicy(valid).ok, true);
  const omitted = structuredClone(valid);
  delete omitted.values['BND-RETRY'];
  assert.equal(bounds.validateBoundPolicy(omitted).error.code, 'MALFORMED_BOUND_POLICY');
  const outOfRange = structuredClone(valid);
  outOfRange.values['BND-IDLE'] = bounds.BOUND_DEFINITIONS['BND-IDLE'].upper + 1;
  outOfRange.digest = bounds.boundPolicyDigest(outOfRange);
  assert.equal(bounds.validateBoundPolicy(outOfRange).error.code, 'BND-IDLE_OUT_OF_RANGE');
  const forged = { ...valid, digest: d('f') };
  assert.equal(bounds.validateBoundPolicy(forged).error.code, 'BOUND_POLICY_DIGEST_MISMATCH');
  const ambiguousClock = { ...clock(1), at: 2 };
  assert.notEqual(bounds.witnessedClockDigest(ambiguousClock), ambiguousClock.digest);
});

test('CF-BOUNDS: all sixteen surfaces have one fixed bound, owner, reset rule, and wake selector', () => {
  assert.equal(bounds.WAIT_SURFACES.length, 16);
  const journal = bounds.createBoundJournal();
  const records = [];
  for (const [index, surface] of bounds.WAIT_SURFACES.entries()) {
    const character = ((index + 1) % 16).toString(16);
    const result = start(journal, surface, 0, character);
    assert.equal(result.ok, true, surface);
    records.push(result.value);
  }
  assert.equal(records.length, 16);
  assert.equal(new Set(records.map((record) => record.surface)).size, 16);
  assert.ok(
    records.every(
      (record) => record.startAt === 0 && record.status === 'active' && record.lastFactDigest.length === 64,
    ),
  );
  assert.equal(records.find((record) => record.surface === 'ledger-registry-intake').disposition, 'recover');
  assert.equal(records.find((record) => record.surface === 'retirement-settlement').disposition, 'residual-obligation');
});

test('CF-BOUNDS: operation-scoped retry instances retain independent fences and consumption', () => {
  const journal = bounds.createBoundJournal();
  const operationOne = { ...subject, operation: `${run}/txn/1/op/1` };
  const operationTwo = { ...subject, operation: `${run}/txn/1/op/2` };
  const startFor = (operationSubject, factCharacter) =>
    journal.start({
      surface: 'operation-source-retry',
      subject: operationSubject,
      generation,
      policy: policy(),
      startedAt: 0,
      clock: clock(0, factCharacter),
      factDigest: d(factCharacter),
    });
  assert.equal(startFor(operationOne, '1').ok, true);
  assert.equal(startFor(operationTwo, '2').ok, true);
  assert.equal(startFor(operationOne, '1').ok, true);
  const first = journal.consume({
    surface: 'operation-source-retry',
    generation,
    subject: operationOne,
    at: 0,
    clock: clock(0, '3'),
    factDigest: d('3'),
  });
  const second = journal.consume({
    surface: 'operation-source-retry',
    generation,
    subject: operationTwo,
    at: 0,
    clock: clock(0, '4'),
    factDigest: d('4'),
  });
  assert.equal(first.value.consumed, 1);
  assert.equal(second.value.consumed, 1);
  const crossKind = journal.wake({
    surface: 'operation-source-retry',
    generation,
    subject: operationOne,
    at: 0,
    clock: clock(0, '3'),
    conditionDigest: d('5'),
    selector: 'EV-WAKE-TIMER',
    factDigest: d('3'),
  });
  assert.equal(crossKind.error.code, 'DUPLICATE_FACT_DIGEST');
  assert.equal(journal.snapshot().facts.filter((fact) => fact.kind === 'start').length, 2);
});

test('CF-BOUNDS: every finite surface reaches its catalogued deadline or consumption exhaustion', () => {
  for (const [index, surface] of bounds.WAIT_SURFACES.entries()) {
    const journal = bounds.createBoundJournal();
    const initial = journal.start({
      surface,
      subject,
      generation,
      policy: policy(),
      startedAt: 0,
      clock: clock(0, '0'),
      factDigest: hd(index + 1),
    });
    assert.equal(initial.ok, true, surface);
    let terminal = initial.value;
    if (terminal.unit === 'count') {
      for (let attempt = 0; attempt < terminal.limit; attempt += 1) {
        terminal = journal.consume({
          surface,
          generation,
          subject,
          at: 0,
          clock: clock(0, '1'),
          factDigest: hd(100 + index * 10 + attempt),
        }).value;
      }
    } else {
      terminal = journal.evaluate({ surface, generation, subject, clock: clock(terminal.deadlineAt, '2') }).value;
    }
    assert.equal(terminal.status, 'exhausted', surface);
    assert.equal(terminal.exhaustion.disposition, terminal.disposition, surface);
  }
});

test('CF-CONTAINMENT: count exhaustion is durable, fixed, and idempotent; stale fences cannot consume it', () => {
  const journal = bounds.createBoundJournal();
  assert.equal(start(journal, 'review-rework').ok, true);
  const first = journal.consume({
    surface: 'review-rework',
    generation,
    subject,
    at: 0,
    clock: clock(0, 'd'),
    factDigest: d('d'),
  });
  assert.equal(first.ok, true);
  assert.equal(first.value.consumed, 1);
  assert.equal(first.value.status, 'active');
  const exhausted = journal.consume({
    surface: 'review-rework',
    generation,
    subject,
    at: 0,
    clock: clock(0, 'e'),
    factDigest: d('e'),
  });
  assert.equal(exhausted.ok, true);
  assert.equal(exhausted.value.status, 'exhausted');
  assert.equal(exhausted.value.exhaustion.disposition, 'block');
  assert.equal(exhausted.value.exhaustion.failure, 'FC-BOUND');
  const beforeDuplicate = journal.snapshot().facts.length;
  const duplicate = journal.consume({
    surface: 'review-rework',
    generation,
    subject,
    at: 0,
    clock: clock(0, 'e'),
    factDigest: d('e'),
  });
  assert.deepEqual(duplicate.value, exhausted.value);
  assert.equal(journal.snapshot().facts.length, beforeDuplicate);
  const staleGeneration = `${run}/gen/2|controller`;
  const stale = journal.consume({
    surface: 'review-rework',
    generation: staleGeneration,
    subject,
    at: 0,
    clock: clock(0, 'f', staleGeneration),
    factDigest: d('f'),
  });
  assert.equal(stale.error.family, 'FC-FENCE');
});

test('CF-BOUNDS: idle and silence reset only from their catalogued durable facts and late facts cannot reset a missed deadline', () => {
  const journal = bounds.createBoundJournal();
  assert.equal(start(journal, 'qualifying-progress-idle').ok, true);
  const progress = journal.observe({
    surface: 'qualifying-progress-idle',
    generation,
    subject,
    observation: livenessObservation(100, 'progress', d('d')),
    clock: clock(100, 'd'),
  });
  assert.equal(progress.ok, true);
  assert.equal(progress.value.startAt, 0);
  assert.equal(progress.value.resetCount, 1);
  assert.equal(progress.value.deadlineAt, 100 + 30 * 60 * 1000);
  const late = journal.observe({
    surface: 'qualifying-progress-idle',
    generation,
    subject,
    observation: livenessObservation(progress.value.deadlineAt, 'progress', d('e')),
    clock: clock(progress.value.deadlineAt, 'e'),
  });
  assert.equal(late.error.code, 'BOUND_DEADLINE_MISSED');

  const silent = bounds.createBoundJournal();
  assert.equal(start(silent, 'session-silence').ok, true);
  const heartbeat = silent.observe({
    surface: 'session-silence',
    generation,
    subject,
    observation: livenessObservation(10, 'heartbeat', d('d')),
    clock: clock(10, 'd'),
  });
  assert.equal(heartbeat.ok, true);
  assert.equal(heartbeat.value.resetCount, 1);
  const wrongReset = silent.observe({
    surface: 'session-silence',
    generation,
    subject,
    observation: livenessObservation(20, 'progress', d('e')),
    clock: clock(20, 'e'),
  });
  assert.equal(wrongReset.error.code, 'RESET_NOT_CATALOGUED');

  const capacity = bounds.createBoundJournal();
  assert.equal(start(capacity, 'capacity-admission').ok, true);
  const forbiddenReset = capacity.observe({
    surface: 'capacity-admission',
    generation,
    subject,
    observation: livenessObservation(1, 'progress', d('d')),
    clock: clock(1, 'd'),
  });
  assert.equal(forbiddenReset.error.code, 'RESET_NOT_CATALOGUED');
  const providerObservation = journal.observe({
    surface: 'qualifying-progress-idle',
    generation,
    subject,
    observation: { ...livenessObservation(1, 'progress', d('e')), source: 'provider' },
    clock: clock(1, 'e'),
  });
  assert.equal(providerObservation.error.code, 'MALFORMED_BOUND_OBSERVATION');
});

test('CF-LIVENESS: durable deadline facts classify thinking, stuck, dead, and human-input-overdue deterministically', () => {
  const journal = bounds.createBoundJournal();
  const idle = start(journal, 'qualifying-progress-idle').value;
  const silence = start(journal, 'session-silence', 0, 'd').value;
  const thinking = bounds.classifyLiveness({ subject, generation, at: 1, idle, silence, observations: [] });
  assert.equal(thinking.value.classification, 'thinking');
  const stuck = bounds.classifyLiveness({
    subject,
    generation,
    at: idle.deadlineAt,
    idle: {
      ...idle,
      status: 'exhausted',
      exhaustion: { failure: 'FC-LIVENESS', disposition: 'park', at: idle.deadlineAt, reason: 'idle deadline' },
    },
    silence: { ...silence, deadlineAt: idle.deadlineAt + 1 },
    observations: [],
  });
  assert.equal(stuck.value.classification, 'stuck');
  const dead = bounds.classifyLiveness({
    subject,
    generation,
    at: silence.deadlineAt,
    idle,
    silence: {
      ...silence,
      status: 'exhausted',
      exhaustion: { failure: 'FC-LIVENESS', disposition: 'park', at: silence.deadlineAt, reason: 'silence deadline' },
    },
    observations: [],
  });
  assert.equal(dead.value.classification, 'dead');
  const overdue = bounds.classifyLiveness({
    subject,
    generation,
    at: 1,
    idle,
    silence,
    observations: [],
    humanInputOverdue: true,
  });
  assert.equal(overdue.value.classification, 'human-input-overdue');
  const selfReport = bounds.classifyLiveness({
    subject,
    generation,
    at: 1,
    idle,
    silence,
    observations: [
      {
        schema: bounds.BOUNDS_VERSION,
        event: 'EV-LIVENESS-OBSERVED',
        subject,
        generation,
        at: 1,
        source: 'provider',
        durable: true,
        kind: 'progress',
        factKind: 'SCH-CANDIDATE',
        factDigest: d('e'),
      },
    ],
  });
  assert.equal(selfReport.error.code, 'MALFORMED_LIVENESS_OBSERVATION');
  const validReplacement = bounds.validateSilenceReplacement({
    subject,
    generation,
    successorGeneration: `${run}/gen/2|replacement`,
    attestedLoss: true,
    samePrincipal: true,
    successorLineage: true,
    factDigest: hd(999),
  });
  assert.equal(validReplacement.value.allowed, true);
  const forgedReplacement = bounds.validateSilenceReplacement({
    subject,
    generation,
    successorGeneration: `${run}/gen/2|replacement`,
    attestedLoss: true,
    samePrincipal: false,
    successorLineage: true,
    factDigest: hd(1000),
  });
  assert.equal(forgedReplacement.error.code, 'SILENCE_REPLACEMENT_GUARD_FAILED');
});

test('CF-CONTAINMENT: six durable wake selectors are distinct; timer wake only causes a reread', () => {
  assert.equal(bounds.WAKE_SELECTORS.length, 6);
  const journal = bounds.createBoundJournal();
  assert.equal(start(journal, 'target-stability').ok, true);
  for (const [index, selector] of bounds.WAKE_SELECTORS.entries()) {
    const result = journal.wake({
      surface: 'target-stability',
      generation,
      subject,
      at: index,
      clock: clock(index, (index + 1).toString(16)),
      conditionDigest: d((index + 1).toString(16)),
      selector,
      factDigest: d((index + 10).toString(16)),
    });
    assert.equal(result.ok, true, selector);
    assert.equal(result.value.timerOnly, selector === 'EV-WAKE-TIMER');
  }
  const unchanged = journal.snapshot().facts.find((fact) => fact.event === 'EV-WAKE-TIMER').record;
  assert.equal(unchanged.status, 'active');
  const before = journal.snapshot().facts.length;
  const duplicate = journal.wake({
    surface: 'target-stability',
    generation,
    subject,
    at: 2,
    clock: clock(2, '3'),
    conditionDigest: d('3'),
    selector: 'EV-WAKE-TIMER',
    factDigest: d('c'),
  });
  assert.equal(duplicate.ok, true);
  assert.equal(journal.snapshot().facts.length, before);
});

test('CF-BOUNDS: missed durable deadline chooses the fixed surface disposition; timer timing is irrelevant', () => {
  const journal = bounds.createBoundJournal();
  assert.equal(start(journal, 'ledger-registry-intake').ok, true);
  const earlyWake = journal.wake({
    surface: 'ledger-registry-intake',
    generation,
    subject,
    at: 1,
    clock: clock(1, 'd'),
    conditionDigest: d('d'),
    selector: 'EV-WAKE-TIMER',
    factDigest: d('d'),
  });
  assert.equal(earlyWake.ok, true);
  const timerResult = journal.evaluate({
    surface: 'ledger-registry-intake',
    generation,
    subject,
    clock: clock(1, 'e'),
  });
  assert.equal(timerResult.value.status, 'active');
  const deadline = journal.evaluate({
    surface: 'ledger-registry-intake',
    generation,
    subject,
    clock: clock(30 * 1000, 'f'),
  });
  assert.equal(deadline.value.status, 'exhausted');
  assert.equal(deadline.value.disposition, 'recover');
  assert.equal(deadline.value.exhaustion.failure, 'FC-BOUND');
});

test('CF-CONTAINMENT: uncertain effect reconciliation retains its fixed fence-bound escalation and never creates a semantic retry', () => {
  const journal = bounds.createBoundJournal();
  const initial = start(journal, 'effect-reconciliation');
  assert.equal(initial.ok, true);
  assert.equal(initial.value.bound, 'BND-RECOVERY');
  assert.equal(initial.value.disposition, 'escalate');
  assert.equal(
    journal.consume({
      surface: 'effect-reconciliation',
      generation,
      subject,
      at: 0,
      clock: clock(0, 'd'),
      factDigest: hd(901),
    }).ok,
    true,
  );
  assert.equal(
    journal.consume({
      surface: 'effect-reconciliation',
      generation,
      subject,
      at: 0,
      clock: clock(0, 'e'),
      factDigest: hd(902),
    }).ok,
    true,
  );
  const result = journal.consume({
    surface: 'effect-reconciliation',
    generation,
    subject,
    at: 0,
    clock: clock(0, 'f'),
    factDigest: hd(903),
  });
  assert.equal(result.value.status, 'exhausted');
  assert.equal(result.value.exhaustion.disposition, 'escalate');
  assert.equal(journal.snapshot().facts.filter((fact) => fact.event === 'EV-BOUND-EXHAUSTED').length, 1);
});

test('CF-BOUNDS: replay reconstructs the same bound epoch and disposition under fact permutation', () => {
  const journal = bounds.createBoundJournal();
  assert.equal(start(journal, 'retirement-settlement').ok, true);
  assert.equal(
    journal.wake({
      surface: 'retirement-settlement',
      generation,
      subject,
      at: 1,
      clock: clock(1, 'd'),
      conditionDigest: d('d'),
      selector: 'EV-WAKE-SETTLEMENT',
      factDigest: d('d'),
    }).ok,
    true,
  );
  assert.equal(
    journal.consume({
      surface: 'retirement-settlement',
      generation,
      subject,
      at: 1,
      clock: clock(1, 'e'),
      factDigest: d('e'),
    }).ok,
    true,
  );
  assert.equal(
    journal.consume({
      surface: 'retirement-settlement',
      generation,
      subject,
      at: 1,
      clock: clock(1, 'f'),
      factDigest: d('f'),
    }).ok,
    true,
  );
  const exhausted = journal.consume({
    surface: 'retirement-settlement',
    generation,
    subject,
    at: 1,
    clock: clock(1, '1'),
    factDigest: d('1'),
  });
  assert.equal(exhausted.ok, true);
  const snapshot = journal.snapshot();
  const replayed = bounds.replayBoundFacts({ ...snapshot, facts: [...snapshot.facts].reverse() });
  assert.equal(replayed.ok, true);
  assert.deepEqual(replayed.value.facts, snapshot.facts);
  assert.equal(replayed.value.digest, snapshot.digest);
  assert.equal(replayed.value.facts.at(-1).record.exhaustion.disposition, 'residual-obligation');
  const forged = bounds.replayBoundFacts({ ...snapshot, digest: d('f') });
  assert.equal(forged.error.family, 'FC-TRUST');
});
