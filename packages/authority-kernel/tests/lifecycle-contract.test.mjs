import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const kernel = await import('../dist/index.js');
const operation = await import('../dist/operation.js');
const runtime = await import('../../runtime-contracts/dist/index.js');
const oracle = JSON.parse(readFileSync(resolve(import.meta.dirname, './fixtures/lifecycle-oracle.json'), 'utf8'));

const run = 'run-000000000001-aaaaaaaaaaaaaaaa';
const basisDigest = 'a'.repeat(64);
const generation = `${run}/gen/1|controller`;
const operationManifest = `provider/${'e'.repeat(64)}/authority/${'f'.repeat(64)}`;
const operationFence = Object.freeze({
  generation,
  basis: basisDigest,
  candidateContentDigest: '1'.repeat(64),
  targetBasisDigest: '2'.repeat(64),
});
const intake = Object.freeze({
  schema: 'jig.intake-ack.v1',
  terminalAck: 'accepted',
  run,
  compositionDigest: 'b'.repeat(64),
  acknowledgementDigest: 'c'.repeat(64),
  position: 0,
  witnessedHeadDigest: 'd'.repeat(64),
});
const intakeWitness = Object.freeze({
  readback: () => ({
    ok: true,
    value: {
      result: {
        kind: 'acknowledged',
        position: intake.position,
        compositionDigest: intake.compositionDigest,
        acknowledgementDigest: intake.acknowledgementDigest,
        run,
      },
      witnessedHeadDigest: intake.witnessedHeadDigest,
    },
  }),
});
const subject = (key) => Object.freeze({ run, story: `${run}/story/${key}`, basis: basisDigest });
const state = (key, storyState = 'Pending', runPhase = 'Preflighting', fenceGeneration = generation) =>
  Object.freeze({
    storyState,
    runPhase,
    subject: subject(key),
    fence: Object.freeze({ generation: fenceGeneration, basis: basisDigest }),
    catalogVersion: 'jig.authority-kernel.v1',
  });

const basisInput = (stories) => ({
  run,
  basis: basisDigest,
  generation,
  intake,
  stories: stories.map((story, index) => ({
    ...story,
    order: story.order ?? { priority: index + 1, ordinal: index + 1, story: story.story },
  })),
});
const basisRecord = (basis) => {
  const genesis = kernel.createRunGenesis({ basis });
  assert.equal(genesis.ok, true);
  const prepared = runtime.createLedgerRecord({
    run,
    generation,
    transaction: genesis.value.transition.bindings.transaction,
    position: 0,
    previousDigest: '0'.repeat(64),
    content: genesis.value,
  });
  assert.equal(prepared.ok, true);
  return Object.freeze({ ...prepared.value, event: genesis.value.transition.event.id });
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

const ledgerFor = (basis, records = [], extra = []) => ({
  readback: ({ position, contentDigest }) => {
    const record = [basis, ...records, ...extra].find(
      (candidate) => candidate.position === position && candidate.contentDigest === contentDigest,
    );
    return record ? { ok: true, value: { kind: 'committed', record } } : { ok: false, error: { kind: 'absent' } };
  },
});

const controllerFor = (basis, records = [], readbackRecord = undefined) => {
  const witnessed = basisRecord(basis);
  return kernel.createLifecycleController({
    basisRecord: witnessed,
    records,
    intakeWitness,
    ledger: ledgerFor(witnessed, records, readbackRecord ? [readbackRecord] : []),
  });
};

const binding = (key, ordinal, fenceGeneration = generation) => ({
  transaction: `${run}/txn/${ordinal}/${fenceGeneration}|${basisDigest}`,
  event: `${run}/event/${ordinal}`,
  operation: `${run}/txn/${ordinal}/${fenceGeneration}|${basisDigest}/op/1`,
  subject: subject(key),
  fence: { generation: fenceGeneration, basis: basisDigest },
  catalogVersion: 'jig.authority-kernel.v1',
});

const operationBinding = (key, ordinal, type = 'OPC-WS-PROVISION') => {
  const transaction = `${run}/txn/${ordinal}/${generation}|${basisDigest}`;
  const route = operation.operationCapabilityRoute(type);
  const unsignedCapability = {
    kind: route.kind,
    port: route.port,
    operationClass: type,
    subject: subject(key).story,
    fence: operationFence,
    resourceScope: 'repository/main',
    manifest: operationManifest,
  };
  const capabilityDigest = operation.deriveOperationCapabilityDigest(unsignedCapability);
  assert.equal(capabilityDigest.ok, true);
  return {
    transaction,
    event: `${run}/event/${ordinal}`,
    operation: `${transaction}/op/1`,
    subject: subject(key),
    fence: operationFence,
    catalogVersion: 'jig.authority-kernel.v1',
    payloadBasisDigest: '3'.repeat(64),
    capability: { ...unsignedCapability, digest: capabilityDigest.value },
    authority: null,
    role: 'worker',
    lifecycle: 'Active',
    effect: 'effectful',
    purpose: 'semantic',
    predecessor: null,
    bounds: { waitMs: 900000, retryLimit: 3, recoveryLimit: 3 },
  };
};

test('lifecycle oracle is versioned and retains the exact governed surface', () => {
  assert.deepEqual(oracle.schemas, [
    kernel.RUN_BASIS_SCHEMA,
    kernel.INTAKE_ACK_SCHEMA,
    kernel.RUN_GENESIS_SCHEMA,
    kernel.LIFECYCLE_TRANSITION_SCHEMA,
    kernel.GENERATION_CLAIM_SCHEMA,
    kernel.RESUME_INTEGRITY_SCHEMA,
    kernel.LEDGER_RECORD_SCHEMA,
  ]);
  assert.equal(oracle.storyStates, kernel.STORY_STATES.length);
  assert.equal(oracle.runPhases, kernel.RUN_PHASES.length);
  assert.deepEqual(oracle.outcomes, ['Landed', 'Blocked', 'Rejected', 'NotRun']);
  assert.deepEqual(oracle.runOverlays, ['Parked', 'Suspended', 'Interrupted / Recovering', 'Settling', 'Stopped']);
  assert.deepEqual(oracle.cfSuites, ['CF-BLOCKERS', 'CF-RELEASE', 'CF-CONTAINMENT', 'CF-RUN-CONTROL']);
});

test('CF-RUN-BASIS: genesis is Preflighting and C-ORDER facts are immutable', () => {
  const mixed = kernel.createRunBasis(
    basisInput([
      { story: subject('first').story, dependencies: [], initial: state('first') },
      { story: subject('second').story, dependencies: [], initial: state('second', 'Pending', 'Active') },
    ]),
  );
  assert.equal(mixed.ok, false);
  const stopped = kernel.createRunBasis(
    basisInput([
      { story: subject('stopped').story, dependencies: [], initial: state('stopped', 'Pending', 'Stopped') },
    ]),
  );
  assert.equal(stopped.ok, false);

  const ordered = kernel.createRunBasis(
    basisInput([
      {
        story: subject('lexically-later').story,
        dependencies: [],
        initial: state('lexically-later'),
        order: { priority: 2, ordinal: 1, story: subject('lexically-later').story },
      },
      {
        story: subject('lexically-first').story,
        dependencies: [],
        initial: state('lexically-first'),
        order: { priority: 1, ordinal: 2, story: subject('lexically-first').story },
      },
    ]),
  );
  assert.equal(ordered.ok, true);
  assert.deepEqual(
    ordered.value.stories.map((story) => [story.story, story.order.priority, story.order.ordinal]),
    [
      [subject('lexically-later').story, 2, 1],
      [subject('lexically-first').story, 1, 2],
    ],
  );
});

test('CF-RELEASE: only a witnessed Landed basis fact releases a Pending dependency', () => {
  const forgedLandedBasis = kernel.createRunBasis(
    basisInput([
      { story: subject('landed').story, dependencies: [], initial: state('landed', 'Landed') },
      { story: subject('pending').story, dependencies: [subject('landed').story], initial: state('pending') },
    ]),
  );
  assert.equal(forgedLandedBasis.ok, false);

  const basis = kernel.createRunBasis(
    basisInput([
      { story: subject('landed').story, dependencies: [], initial: state('landed') },
      { story: subject('pending').story, dependencies: [subject('landed').story], initial: state('pending') },
    ]),
  );
  assert.equal(basis.ok, true);
  const witnessed = basisRecord(basis.value);
  const projection = kernel.projectLifecycle({
    basisRecord: witnessed,
    records: [],
    intakeWitness,
    ledger: ledgerFor(witnessed),
  });
  assert.equal(projection.ok, true);
  assert.deepEqual(projection.value.releasedStories, []);

  const controller = kernel.createLifecycleController({
    basisRecord: witnessed,
    records: [],
    intakeWitness,
    ledger: ledgerFor(witnessed),
  });
  assert.equal(controller.ok, true);
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
  assert.equal(proposed.ok, false);

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
    intakeWitness,
    ledger: ledgerFor(unlandedWitness),
  });
  assert.equal(unlandedController.ok, true);
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
  assert.equal(forgedEligibility.ok, false);
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
  const suspendedProjection = kernel.projectLifecycle({
    basisRecord: witnessed,
    records: [suspendRecord],
    intakeWitness,
    ledger: ledgerFor(witnessed, [suspendRecord]),
  });
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
  const stoppedProjection = kernel.projectLifecycle({
    basisRecord: witnessed,
    records: [suspendRecord, stopRecord],
    intakeWitness,
    ledger: ledgerFor(witnessed, [suspendRecord, stopRecord]),
  });
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

test('resume proposals resolve the witnessed generation claim and integrity records', () => {
  const basis = kernel.createRunBasis(
    basisInput([{ story: subject('one').story, dependencies: [], initial: state('one') }]),
  );
  assert.equal(basis.ok, true);
  const witnessed = basisRecord(basis.value);
  const first = controllerFor(basis.value);
  const suspended = first.value.propose({
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
  assert.equal(suspended.ok, true, JSON.stringify(suspended));
  const suspendRecord = transitionRecord(suspended.value, witnessed.contentDigest);
  const nextGeneration = `${run}/gen/2|controller`;
  const claimPrepared = runtime.createLedgerRecord({
    run,
    generation: nextGeneration,
    transaction: `${run}/txn/3/${nextGeneration}|${basisDigest}`,
    position: 2,
    previousDigest: suspendRecord.contentDigest,
    content: {
      schema: kernel.GENERATION_CLAIM_SCHEMA,
      run,
      basis: basisDigest,
      generation: nextGeneration,
      token: 'e'.repeat(64),
    },
  });
  assert.equal(claimPrepared.ok, true);
  const claim = Object.freeze({ ...claimPrepared.value, event: `${run}/event/3` });
  const integrityPrepared = runtime.createLedgerRecord({
    run,
    generation: nextGeneration,
    transaction: `${run}/txn/4/${nextGeneration}|${basisDigest}`,
    position: 3,
    previousDigest: claim.contentDigest,
    content: {
      schema: kernel.RESUME_INTEGRITY_SCHEMA,
      run,
      basis: basisDigest,
      oldGeneration: generation,
      newGeneration: nextGeneration,
      head: { position: claim.position, digest: claim.contentDigest },
    },
  });
  assert.equal(integrityPrepared.ok, true);
  const integrity = Object.freeze({ ...integrityPrepared.value, event: `${run}/event/4` });
  const controller = controllerFor(basis.value, [suspendRecord, claim, integrity]);
  assert.equal(controller.ok, true, JSON.stringify(controller));
  const resumed = controller.value.propose({
    event: {
      type: 'EV-RUN-RESUME-DECISION',
      edge: 'suspended-active',
      id: `${run}/event/5`,
      subject: subject('one'),
      fence: { generation: nextGeneration, basis: basisDigest },
      catalogVersion: 'jig.authority-kernel.v1',
    },
    bindings: binding('one', 5, nextGeneration),
    decision: { kind: 'none' },
  });
  assert.equal(resumed.ok, true, JSON.stringify(resumed));
  assert.equal(resumed.value.next.runPhase, 'Active');
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
    intakeWitness,
    ledger: ledgerFor(witnessed),
  };
  assert.equal(kernel.projectLifecycle(forged).ok, true);
  const untrustedController = controllerFor(basis.value);
  assert.equal(untrustedController.ok, true);
  const untrustedProposal = untrustedController.value.propose({
    event: {
      type: 'EV-WAKE-DEPENDENCY',
      edge: 'pending-eligible',
      id: `${run}/event/2`,
      subject: subject('a'),
      fence: { generation, basis: basisDigest },
      catalogVersion: 'jig.authority-kernel.v1',
    },
    bindings: binding('a', 2),
    decision: { kind: 'none' },
  });
  assert.equal(untrustedProposal.ok, true);
  const untrustedRecord = transitionRecord(untrustedProposal.value, witnessed.contentDigest);
  assert.deepEqual(
    kernel.projectLifecycle({
      basisRecord: witnessed,
      records: [untrustedRecord],
      intakeWitness,
      ledger: ledgerFor(witnessed),
    }),
    { ok: false, error: { failure: 'FC-TRUST', code: 'RUN_LEDGER_WITNESS_MISMATCH' } },
  );
  const controller = kernel.createLifecycleController({
    basisRecord: witnessed,
    records: [],
    intakeWitness,
    ledger: ledgerFor(witnessed),
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
  assert.equal(attempt.ok, false);
});

test('CF-BLOCKERS / C-ORDER: NotRun retains every direct root in governed order', () => {
  const basis = kernel.createRunBasis(
    basisInput([
      {
        story: subject('a').story,
        dependencies: [],
        initial: state('a'),
        order: { priority: 2, ordinal: 2, story: subject('a').story },
      },
      {
        story: subject('b').story,
        dependencies: [],
        initial: state('b'),
        order: { priority: 1, ordinal: 1, story: subject('b').story },
      },
      {
        story: subject('dependent').story,
        dependencies: [subject('a').story, subject('b').story],
        initial: state('dependent'),
        order: { priority: 3, ordinal: 3, story: subject('dependent').story },
      },
    ]),
  );
  assert.equal(basis.ok, true);
  const witnessed = basisRecord(basis.value);
  let records = [];
  let previousDigest = witnessed.contentDigest;

  const append = (key, ordinal, eventType, edge, bindings = binding(key, ordinal)) => {
    const controller = controllerFor(basis.value, records);
    assert.equal(controller.ok, true);
    const proposal = controller.value.propose({
      event: {
        type: eventType,
        edge,
        id: `${run}/event/${ordinal}`,
        subject: subject(key),
        fence: { generation, basis: basisDigest },
        catalogVersion: 'jig.authority-kernel.v1',
      },
      bindings,
      decision: { kind: 'none' },
    });
    assert.equal(proposal.ok, true);
    const record = transitionRecord(proposal.value, previousDigest);
    records = [...records, record];
    previousDigest = record.contentDigest;
    return proposal.value;
  };

  append('a', 2, 'EV-WAKE-DEPENDENCY', 'pending-eligible');
  append('a', 3, 'EV-WAKE-CAPACITY', 'eligible-preparing', operationBinding('a', 3));
  const aBlocked = append('a', 4, 'EV-SESSION-FAULT', 'preparing-session-blocked');
  assert.equal(aBlocked.next.storyState, 'Blocked');
  append('b', 5, 'EV-WAKE-DEPENDENCY', 'pending-eligible');
  append('b', 6, 'EV-WAKE-CAPACITY', 'eligible-preparing', operationBinding('b', 6));
  const bBlocked = append('b', 7, 'EV-SESSION-FAULT', 'preparing-session-blocked');
  assert.equal(bBlocked.next.storyState, 'Blocked');
  const notRun = append('dependent', 8, 'EV-WAKE-DEPENDENCY', 'pending-not-run');
  assert.deepEqual(
    notRun.directRoots.map((root) => root.story),
    [subject('b').story, subject('a').story],
  );

  const projection = kernel.projectLifecycle({
    basisRecord: witnessed,
    records,
    intakeWitness,
    ledger: ledgerFor(witnessed, records),
  });
  assert.equal(projection.ok, true);
  assert.deepEqual(
    projection.value.directRoots.map((root) => [root.story, root.outcome]),
    [
      [subject('b').story, 'Blocked'],
      [subject('a').story, 'Blocked'],
    ],
  );
});

test('CF-RESTART: a pending generation claim fences every non-integrity record', () => {
  const basis = kernel.createRunBasis(
    basisInput([{ story: subject('only').story, dependencies: [], initial: state('only') }]),
  );
  assert.equal(basis.ok, true);
  const witnessed = basisRecord(basis.value);
  const newerGeneration = `${run}/gen/2|controller`;
  const claimPrepared = runtime.createLedgerRecord({
    run,
    generation: newerGeneration,
    transaction: `${run}/txn/2/${newerGeneration}|${basisDigest}`,
    position: 1,
    previousDigest: witnessed.contentDigest,
    content: {
      schema: kernel.GENERATION_CLAIM_SCHEMA,
      run,
      basis: basisDigest,
      generation: newerGeneration,
      token: 'e'.repeat(64),
    },
  });
  assert.equal(claimPrepared.ok, true);
  const claim = Object.freeze({ ...claimPrepared.value, event: `${run}/event/2` });
  const unrelatedPrepared = runtime.createLedgerRecord({
    run,
    generation: newerGeneration,
    transaction: `${run}/txn/3/${newerGeneration}|${basisDigest}`,
    position: 2,
    previousDigest: claim.contentDigest,
    content: { schema: 'jig.unrelated.v1', value: 'not-integrity' },
  });
  assert.equal(unrelatedPrepared.ok, true);
  const unrelated = Object.freeze({ ...unrelatedPrepared.value, event: `${run}/event/3` });
  const result = kernel.projectLifecycle({
    basisRecord: witnessed,
    records: [claim, unrelated],
    intakeWitness,
    ledger: ledgerFor(witnessed, [claim, unrelated]),
  });
  assert.deepEqual(result, {
    ok: false,
    error: { failure: 'FC-FENCE', code: 'RC_RESUME_INTEGRITY_REQUIRED' },
  });
});
