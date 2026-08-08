import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const scheduler = await import('../dist/index.js');
const oracle = JSON.parse(readFileSync(resolve(import.meta.dirname, './fixtures/scheduler-oracle.json'), 'utf8'));

const run = 'run-000000000031-aaaaaaaaaaaaaaaa';
const basis = 'a'.repeat(64);
const generation = `${run}/gen/1|controller`;
const tx = (ordinal) => `${run}/txn/${ordinal}/${generation}|${basis}`;
const resources = scheduler.RESOURCE_CLASSES;
const emptyDemand = () => Object.fromEntries(resources.map((resource) => [resource, 0]));
const demand = (overrides = {}) => ({ ...emptyDemand(), ...overrides });
const policyBase = {
  version: scheduler.CAPACITY_RANGE_VERSION,
  capacities: Object.fromEntries(resources.map((resource) => [resource, resource === 'RC-FINALIZER' ? 1 : 2])),
  reserves: Object.fromEntries(scheduler.CONFIGURABLE_RESOURCE_CLASSES.map((resource) => [resource, 1])),
  waitSeconds: 3600,
  waitRangeVersion: scheduler.WAIT_CAPACITY_RANGE_VERSION,
};
const policy = () => ({ ...policyBase, digest: scheduler.capacityPolicyDigest(policyBase) });
const story = (key, changes = {}) => ({
  run,
  story: `${run}/story/${key}`,
  state: 'Eligible',
  runPhase: 'Active',
  dependencies: [],
  directBlocker: false,
  order: { priority: 1, ordinal: 1, story: `${run}/story/${key}` },
  demand: demand(),
  finalizerCandidate: false,
  ...changes,
});
const reserveIntent = (key, resource, ordinal = 1, amount = 1) => ({
  schema: scheduler.RESERVATION_SCHEMA,
  scheduler: scheduler.SCHEDULER_VERSION,
  variant: 'reserve',
  run,
  story: `${run}/story/${key}`,
  resource,
  amount,
  comparator: { priority: 1, ordinal, story: `${run}/story/${key}` },
  generation,
  authorizingTransition: tx(ordinal),
  policyDigest: policy().digest,
});
const reserveRequest = (reservation, ledger, controller = scheduler.CONTROLLER_ROLE) => {
  const head = ledger.snapshot().value;
  return { controller, expectedPosition: head.position, expectedDigest: head.digest, policy: policy(), reservation };
};
const scheduleInput = (stories, reservations = [], waits = [], now = 0) => ({
  run,
  now,
  policy: policy(),
  stories,
  reservations,
  waits,
});

test('GF-031 oracle freezes the seven classes, comparator, bound, and proof suites', () => {
  assert.deepEqual([...scheduler.RESOURCE_CLASSES], oracle.resources);
  assert.deepEqual(oracle.comparator, ['priority', 'ordinal', 'story']);
  assert.equal(scheduler.CONTROLLER_ROLE, oracle.controller);
  assert.deepEqual(oracle.wait, {
    class: 'BND-WAIT-CAPACITY',
    defaultSeconds: 86400,
    lowerSeconds: 3600,
    upperSeconds: 2592000,
    exhaustion: 'FC-CAPACITY',
  });
});

test('CF-ORDER: comparator is immutable priority, ordinal, ID-STORY and arrival order cannot change selection', () => {
  const first = story('first', {
    order: { priority: 2, ordinal: 1, story: `${run}/story/first` },
    demand: demand({ 'RC-SESSION': 1 }),
  });
  const second = story('second', {
    order: { priority: 1, ordinal: 9, story: `${run}/story/second` },
    demand: demand({ 'RC-SESSION': 1 }),
  });
  const tied = story('tied', {
    order: { priority: 1, ordinal: 9, story: `${run}/story/tied` },
    demand: demand({ 'RC-SESSION': 1 }),
  });
  assert.equal(scheduler.compareSchedulerOrder(second.order, tied.order) < 0, true);
  const left = scheduler.selectSchedule(scheduleInput([first, second, tied]));
  const right = scheduler.selectSchedule(scheduleInput([tied, first, second]));
  assert.equal(left.ok, true);
  assert.deepEqual(right, left);
  assert.deepEqual(
    left.value.admissions.map((entry) => entry.story),
    [`${run}/story/second`, `${run}/story/tied`, `${run}/story/first`],
  );
  assert.equal(left.value.admissions[2].kind, 'wait');
});

test('GF-030 eligibility facts gate admission before comparator or capacity are considered', () => {
  const dependency = story('dependency', { state: 'Preparing' });
  const blocked = story('blocked', { dependencies: [dependency.story] });
  const directBlocked = story('direct-blocked', { directBlocker: true });
  const suspended = story('suspended', { runPhase: 'Suspended' });
  let result = scheduler.selectSchedule(scheduleInput([dependency, blocked, directBlocked, suspended]));
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.admissions, []);
  result = scheduler.selectSchedule(
    scheduleInput([{ ...dependency, state: 'Landed' }, blocked, directBlocked, suspended]),
  );
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.value.admissions.map((entry) => entry.story),
    [blocked.story],
  );
});

test('CF-CAPACITY: all classes are counted, reserve minimum is non-waivable, and infeasible demand fails closed', () => {
  const all = demand(Object.fromEntries(resources.map((resource) => [resource, 1])));
  const result = scheduler.selectSchedule(
    scheduleInput([
      story('one', { demand: all }),
      story('two', { order: { priority: 2, ordinal: 2, story: `${run}/story/two` }, demand: all }),
    ]),
  );
  assert.equal(result.ok, true);
  assert.deepEqual(
    Object.fromEntries(resources.map((resource) => [resource, result.value.used[resource]])),
    Object.fromEntries(resources.map((resource) => [resource, 1])),
  );
  assert.equal(result.value.admissions[1].kind, 'wait');
  assert.equal(result.value.admissions[1].wait.resource, 'RC-ISOLATION');
  assert.equal(scheduler.validateCapacityFeasibility(policy(), [demand({ 'RC-SESSION': 2 })]).ok, false);
  const malformed = structuredClone(policy());
  malformed.capacities['RC-SESSION'] = 1;
  assert.equal(scheduler.validateCapacityPolicy(malformed).ok, false);
  const finalizerReserve = structuredClone(policy());
  finalizerReserve.reserves['RC-FINALIZER'] = 1;
  assert.equal(scheduler.validateCapacityPolicy(finalizerReserve).ok, false);
});

test('BND-WAIT-CAPACITY preserves continuous starvation and attributes exhaustion', () => {
  const constrained = story('waiting', { demand: demand({ 'RC-SESSION': 1 }) });
  const ledger = scheduler.createScriptedReservationLedger();
  const held = scheduler.reserveCapacity(ledger, reserveRequest(reserveIntent('holder', 'RC-SESSION'), ledger));
  assert.equal(held.ok, true);
  const reservations = ledger.snapshot().value.records;
  const prior = {
    schema: scheduler.SCHEDULER_VERSION,
    kind: 'admission',
    run,
    story: constrained.story,
    comparator: constrained.order,
    resource: 'RC-SESSION',
    startedAt: 100,
    deadlineAt: 3_700_100,
    reason: 'capacity',
    exhausted: false,
    attribution: 'admission-starvation',
  };
  const later = scheduler.selectSchedule(scheduleInput([constrained], reservations, [prior], 200));
  assert.equal(later.ok, true);
  assert.equal(later.value.waits[0].startedAt, 100);
  assert.equal(later.value.waits[0].deadlineAt, 3_600_100);
  const exhausted = scheduler.selectSchedule(scheduleInput([constrained], reservations, [prior], 3_600_100));
  assert.equal(exhausted.ok, true);
  assert.deepEqual(exhausted.value.waits[0].failure, { family: 'FC-CAPACITY', code: 'BND_WAIT_CAPACITY_EXHAUSTED' });
  assert.equal(exhausted.value.waits[0].attribution, 'admission-starvation');
  const malformedWait = structuredClone(prior);
  malformedWait.startedAt = -1;
  assert.deepEqual(scheduler.selectSchedule(scheduleInput([constrained], reservations, [malformedWait], 200)), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'INVALID_CAPACITY_WAIT' },
  });
});

test('finalizer queue is deterministic, single-holder, and never preempts the holder', () => {
  const alpha = story('alpha', {
    state: 'Accepted',
    finalizerCandidate: true,
    order: { priority: 2, ordinal: 2, story: `${run}/story/alpha` },
  });
  const beta = story('beta', {
    state: 'Accepted',
    finalizerCandidate: true,
    order: { priority: 1, ordinal: 1, story: `${run}/story/beta` },
  });
  let result = scheduler.selectSchedule(scheduleInput([alpha, beta]));
  assert.equal(result.ok, true);
  assert.equal(result.value.finalizerWaiter, beta.story);
  assert.deepEqual(
    result.value.finalizerQueue.map((wait) => wait.story),
    [alpha.story],
  );
  const ledger = scheduler.createScriptedReservationLedger();
  const held = scheduler.reserveCapacity(ledger, reserveRequest(reserveIntent('beta', 'RC-FINALIZER', 1), ledger));
  assert.equal(held.ok, true);
  const reservations = ledger.snapshot().value.records;
  result = scheduler.selectSchedule(scheduleInput([alpha, beta], reservations));
  assert.equal(result.ok, true);
  assert.equal(result.value.finalizerWaiter, null);
  assert.deepEqual(
    result.value.finalizerQueue.map((wait) => wait.story),
    [beta.story, alpha.story],
  );
});

test('fenced durable reserve/release is concurrent-safe and only release append frees capacity', () => {
  const ledger = scheduler.createScriptedReservationLedger();
  const first = reserveIntent('one', 'RC-SESSION');
  assert.equal(
    scheduler.reserveCapacity(ledger, reserveRequest(first, ledger, 'NOT-RT-CONTROLLER')).error.code,
    'INVALID_RESERVE_REQUEST',
  );
  const reserved = scheduler.reserveCapacity(ledger, reserveRequest(first, ledger));
  assert.equal(reserved.ok, true);
  const nextGeneration = `${run}/gen/2|controller`;
  const staleGeneration = {
    ...reserveIntent('stale-generation', 'RC-SESSION'),
    generation: nextGeneration,
    authorizingTransition: `${run}/txn/2/${nextGeneration}|${basis}`,
  };
  assert.equal(
    scheduler.reserveCapacity(ledger, reserveRequest(staleGeneration, ledger)).error.code,
    'STALE_GENERATION',
  );
  assert.equal(scheduler.reserveCapacity(ledger, reserveRequest(first, ledger)).error.code, 'DUPLICATE_RESERVATION');
  assert.equal(
    scheduler.reserveCapacity(ledger, {
      ...reserveRequest(reserveIntent('two', 'RC-SESSION'), ledger),
      expectedPosition: -1,
    }).error.code,
    'EXPECTED_HEAD_MISMATCH',
  );
  const release = scheduler.releaseCapacity(ledger, {
    controller: scheduler.CONTROLLER_ROLE,
    ...(() => {
      const head = ledger.snapshot().value;
      return { expectedPosition: head.position, expectedDigest: head.digest };
    })(),
    releaseTransition: tx(2),
    reservation: { ...first, contentDigest: reserved.value.contentDigest },
  });
  assert.equal(release.ok, true);
  const after = ledger.snapshot();
  assert.equal(after.ok, true);
  assert.equal(
    scheduler.selectSchedule(
      scheduleInput([story('one', { demand: demand({ 'RC-SESSION': 1 }) })], after.value.records),
    ).value.admissions[0].kind,
    'admission',
  );
  assert.equal(
    scheduler.releaseCapacity(ledger, {
      controller: scheduler.CONTROLLER_ROLE,
      expectedPosition: after.value.position,
      expectedDigest: after.value.digest,
      releaseTransition: tx(3),
      reservation: { ...first, contentDigest: reserved.value.contentDigest },
    }).error.code,
    'STALE_RESERVATION',
  );
});

test('crash/readback stays durable and does not silently retry an uncertain append', () => {
  const ledger = scheduler.createScriptedReservationLedger({ fault: 'after-witness' });
  const result = scheduler.reserveCapacity(ledger, reserveRequest(reserveIntent('crashed', 'RC-VERIFY'), ledger));
  assert.deepEqual(result, { ok: false, error: { family: 'FC-TRUST', code: 'ACK_LOST_READBACK_REQUIRED' } });
  const head = ledger.snapshot().value;
  const readback = scheduler.reservationReadback(ledger, {
    position: head.position,
    contentDigest: head.records[0].contentDigest,
  });
  assert.equal(readback.ok, true);
  assert.equal(readback.value.variant, 'reserve');
  const flushedOnly = scheduler.createScriptedReservationLedger({ fault: 'after-flush' });
  assert.equal(
    scheduler.reserveCapacity(flushedOnly, reserveRequest(reserveIntent('unwitnessed', 'RC-VERIFY'), flushedOnly)).ok,
    false,
  );
  assert.equal(flushedOnly.snapshot().ok, false);
});
