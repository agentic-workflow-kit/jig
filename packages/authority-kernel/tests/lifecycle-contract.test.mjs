import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const kernel = await import('../dist/index.js');
const runtime = await import('../../runtime-contracts/dist/index.js');
const oracle = JSON.parse(readFileSync(resolve(import.meta.dirname, './fixtures/lifecycle-oracle.json'), 'utf8'));

const run = 'run-000000000001-aaaaaaaaaaaaaaaa';
const basisDigest = 'a'.repeat(64);
const generation = `${run}/gen/1|controller`;
const subject = (key) => Object.freeze({ run, story: `${run}/story/${key}`, basis: basisDigest });
const state = (key, storyState = 'Pending', runPhase = 'Active', fenceGeneration = generation) =>
  Object.freeze({
    storyState,
    runPhase,
    subject: subject(key),
    fence: Object.freeze({ generation: fenceGeneration, basis: basisDigest }),
    catalogVersion: 'jig.authority-kernel.v1',
  });

const basisInput = (stories) => ({ run, basis: basisDigest, generation, stories });
const basisRecord = (basis) => {
  const prepared = runtime.createLedgerRecord({
    run,
    generation,
    transaction: `${run}/txn/1/${generation}|${basisDigest}`,
    position: 0,
    previousDigest: '0'.repeat(64),
    content: basis,
  });
  assert.equal(prepared.ok, true);
  return Object.freeze({ ...prepared.value, event: `${run}/event/1` });
};

const transitionRecord = (candidate, previousDigest) => {
  const prepared = runtime.createLedgerRecord({
    run,
    generation: candidate.bindings.fence.generation,
    transaction: candidate.bindings.transaction,
    position: candidate.position - 1,
    previousDigest,
    content: candidate,
  });
  assert.equal(prepared.ok, true);
  return Object.freeze({ ...prepared.value, event: candidate.event.id });
};

const controllerFor = (basis, records = [], readbackRecord = undefined) =>
  kernel.createLifecycleController({
    basisRecord: basisRecord(basis),
    records,
    ledger: { readback: () => ({ ok: true, value: { kind: 'committed', record: readbackRecord } }) },
  });

const binding = (key, ordinal, fenceGeneration = generation) => ({
  transaction: `${run}/txn/${ordinal}/${fenceGeneration}|${basisDigest}`,
  event: `${run}/event/${ordinal}`,
  operation: `${run}/txn/${ordinal}/${fenceGeneration}|${basisDigest}/op/1`,
  subject: subject(key),
  fence: { generation: fenceGeneration, basis: basisDigest },
  catalogVersion: 'jig.authority-kernel.v1',
});

test('lifecycle oracle is versioned and retains the exact governed surface', () => {
  assert.deepEqual(oracle.schemas, [
    kernel.RUN_BASIS_SCHEMA,
    kernel.LIFECYCLE_TRANSITION_SCHEMA,
    kernel.GENERATION_CLAIM_SCHEMA,
    kernel.RESUME_INTEGRITY_SCHEMA,
    kernel.LEDGER_RECORD_SCHEMA,
  ]);
  assert.equal(oracle.storyStates, kernel.STORY_STATES.length);
  assert.equal(oracle.runPhases, kernel.RUN_PHASES.length);
});

test('CF-RELEASE: only a witnessed Landed basis fact releases a Pending dependency', () => {
  const basis = kernel.createRunBasis(
    basisInput([
      { story: subject('landed').story, dependencies: [], initial: state('landed', 'Landed') },
      { story: subject('pending').story, dependencies: [subject('landed').story], initial: state('pending') },
    ]),
  );
  assert.equal(basis.ok, true);
  const witnessed = basisRecord(basis.value);
  const projection = kernel.projectLifecycle({ basisRecord: witnessed, records: [] });
  assert.equal(projection.ok, true);
  assert.deepEqual(projection.value.releasedStories, [subject('landed').story]);

  const controller = kernel.createLifecycleController({
    basisRecord: witnessed,
    records: [],
    ledger: { readback: () => ({ ok: false, error: { kind: 'absent' } }) },
  });
  const proposed = controller.value.propose({
    event: {
      type: 'EV-WAKE-DEPENDENCY',
      edge: 'pending-eligible',
      id: `${run}/event/2`,
      subject: subject('pending'),
      fence: { generation, basis: basisDigest },
      catalogVersion: 'jig.authority-kernel.v1',
    },
    bindings: binding('pending', 2),
    decision: { kind: 'none' },
  });
  assert.equal(proposed.ok, true);
  const record = transitionRecord(proposed.value, witnessed.contentDigest);
  const adopted = kernel.projectLifecycle({ basisRecord: witnessed, records: [record] });
  assert.equal(adopted.ok, true);
  assert.equal(adopted.value.states[subject('pending').story].storyState, 'Eligible');

  const unlandedBasis = kernel.createRunBasis(
    basisInput([
      { story: subject('accepted').story, dependencies: [], initial: state('accepted', 'Pending') },
      { story: subject('dependent').story, dependencies: [subject('accepted').story], initial: state('dependent') },
    ]),
  );
  assert.equal(unlandedBasis.ok, true);
  const unlandedWitness = basisRecord(unlandedBasis.value);
  const unlandedController = kernel.createLifecycleController({
    basisRecord: unlandedWitness,
    records: [],
    ledger: { readback: () => ({ ok: false }) },
  });
  const forgedEligibility = unlandedController.value.propose({
    event: {
      type: 'EV-WAKE-DEPENDENCY',
      edge: 'pending-eligible',
      id: `${run}/event/2`,
      subject: subject('dependent'),
      fence: { generation, basis: basisDigest },
      catalogVersion: 'jig.authority-kernel.v1',
    },
    bindings: binding('dependent', 2),
    decision: { kind: 'none' },
  });
  assert.equal(forgedEligibility.ok, true);
  const forgedRecord = transitionRecord(forgedEligibility.value, unlandedWitness.contentDigest);
  assert.equal(kernel.projectLifecycle({ basisRecord: unlandedWitness, records: [forgedRecord] }).ok, false);
});

test('CF-CONTAINMENT / CF-RUN-CONTROL: Stopped is a Run overlay and preserves Story state', () => {
  const basis = kernel.createRunBasis(
    basisInput([
      { story: subject('one').story, dependencies: [], initial: state('one') },
      { story: subject('two').story, dependencies: [], initial: state('two') },
    ]),
  );
  assert.equal(basis.ok, true);
  const witnessed = basisRecord(basis.value);
  const firstController = controllerFor(basis.value);
  assert.equal(firstController.ok, true);
  const suspend = firstController.value.propose({
    event: {
      type: 'EV-RUN-SUSPEND-DECISION',
      edge: 'active-suspended',
      id: `${run}/event/2`,
      subject: subject('one'),
      fence: { generation, basis: basisDigest },
      catalogVersion: 'jig.authority-kernel.v1',
    },
    bindings: binding('one', 2),
    decision: { kind: 'none' },
  });
  assert.equal(suspend.ok, true);
  const suspendRecord = transitionRecord(suspend.value, witnessed.contentDigest);
  const suspendedProjection = kernel.projectLifecycle({ basisRecord: witnessed, records: [suspendRecord] });
  assert.equal(suspendedProjection.ok, true);
  assert.equal(suspendedProjection.value.states[subject('one').story].runPhase, 'Suspended');
  assert.equal(suspendedProjection.value.states[subject('two').story].storyState, 'Pending');

  const secondController = controllerFor(basis.value, [suspendRecord]);
  assert.equal(secondController.ok, true);
  const stop = secondController.value.propose({
    event: {
      type: 'EV-RUN-TERMINAL-STOP-DECISION',
      edge: 'suspended-stopped',
      id: `${run}/event/3`,
      subject: subject('one'),
      fence: { generation, basis: basisDigest },
      catalogVersion: 'jig.authority-kernel.v1',
    },
    bindings: binding('one', 3),
    decision: { kind: 'none' },
  });
  assert.equal(stop.ok, true);
  const stopRecord = transitionRecord(stop.value, suspendRecord.contentDigest);
  const stoppedProjection = kernel.projectLifecycle({ basisRecord: witnessed, records: [suspendRecord, stopRecord] });
  assert.equal(stoppedProjection.ok, true);
  assert.deepEqual(
    Object.values(stoppedProjection.value.states).map((value) => [value.storyState, value.runPhase]),
    [
      ['Pending', 'Stopped'],
      ['Pending', 'Stopped'],
    ],
  );
  assert.equal(Object.hasOwn(secondController.value, 'dispatch'), false);
});

test('CF-BLOCKERS: transition-local dependency and root claims cannot author NotRun', () => {
  const basis = kernel.createRunBasis(
    basisInput([
      { story: subject('a').story, dependencies: [], initial: state('a') },
      { story: subject('b').story, dependencies: [subject('a').story], initial: state('b') },
    ]),
  );
  assert.equal(basis.ok, true);
  const witnessed = basisRecord(basis.value);
  const forged = {
    basisRecord: witnessed,
    records: [],
  };
  assert.equal(kernel.projectLifecycle(forged).ok, true);
  const controller = kernel.createLifecycleController({
    basisRecord: witnessed,
    records: [],
    ledger: { readback: () => ({ ok: false }) },
  });
  assert.equal(controller.ok, true);
  const attempt = controller.value.propose({
    event: {
      type: 'EV-WAKE-DEPENDENCY',
      edge: 'pending-not-run',
      id: `${run}/event/2`,
      subject: subject('b'),
      fence: { generation, basis: basisDigest },
      catalogVersion: 'jig.authority-kernel.v1',
    },
    bindings: binding('b', 2),
    decision: { kind: 'none' },
  });
  assert.equal(attempt.ok, true);
  const record = transitionRecord(attempt.value, witnessed.contentDigest);
  assert.deepEqual(kernel.projectLifecycle({ basisRecord: witnessed, records: [record] }).ok, false);
});
