import assert from 'node:assert/strict';
import test from 'node:test';

const kernel = await import('../dist/index.js');

const d = (c) => c.charCodeAt(0).toString(16).padStart(2, '0').repeat(32);
const run = 'run-000000000035-0123456789abcdef';
const story = `${run}/story/implementer-candidates`;
const dependent = `${run}/story/dependent-story`;
const basis = d('a');
const generation = `${run}/gen/1|controller-token`;
const principal = 'principal/implementer';
const session = `${story}/session/implementer/1`;
const tx = (n) => `${run}/txn/${n}/${generation}|${basis}`;
const op = (n, ordinal = 1) => `${tx(n)}/op/${ordinal}`;
const proof = (position, n, record = d('p')) => ({
  kind: 'committed-witnessed',
  position,
  event: `${run}/event/${position + 1}`,
  transaction: tx(n),
  recordDigest: record,
  witnessDigest: record,
});
const paths = [
  { path: 'packages/a.ts', contentDigest: d('b') },
  { path: 'packages/z.ts', contentDigest: d('c') },
];
const graph = [
  { story, state: 'Implementing', dependencies: [], directBlocker: false, blocker: null },
  { story: dependent, state: 'Reviewing', dependencies: [story], directBlocker: false, blocker: null },
];

const makeObservation = (overrides = {}) => ({
  schema: kernel.CANDIDATE_EVENT_SCHEMA,
  event: 'EV-SESSION-RESULT',
  source: 'session-result',
  run,
  story,
  role: 'implementer',
  session,
  principal,
  sessionOrdinal: 1,
  assignmentOrdinal: 1,
  operation: op(1),
  operationType: 'OPC-SESSION-COLLECT',
  producerKey: d('d'),
  runBasisDigest: basis,
  targetBasisDigest: d('e'),
  changedPaths: paths,
  treeDigest: d('f'),
  workspaceCommit: null,
  commitMessage: 'candidate implementation',
  evidenceManifestDigest: d('g'),
  workspaceFingerprint: d('h'),
  workspaceFactDigest: d('i'),
  posture: 'default',
  generation,
  authorizingTransition: tx(1),
  commitProof: proof(0, 1),
  committed: true,
  ...overrides,
});

const makeController = (options = {}) => {
  const ledger = options.ledger ?? kernel.createScriptedCandidateLedger(options.ledgerOptions);
  const created = kernel.createCandidateController({ run, basisDigest: basis, generation, graph, ledger });
  assert.equal(created.ok, true, JSON.stringify(created));
  return { controller: created.value, ledger };
};

const createCandidate = (state, overrides = {}) => {
  const result = state.controller.createCandidate({
    controller: kernel.CANDIDATE_CONTROLLER,
    observation: makeObservation(overrides),
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
};

const makeBound = (consumed = 0, status = 'active') => ({
  schema: 'jig.rework-bound.v1',
  bound: 'BND-REWORK',
  surface: 'review-rework',
  run,
  story,
  generation,
  policyDigest: d('j'),
  limit: 2,
  consumed,
  status,
  factDigest: d('k'),
  committed: true,
});

const makeRework = (candidate, overrides = {}) => {
  const authorizingTransition = tx(2);
  const reworkOrdinal = 1;
  const reservationKey = kernel.deriveReworkReservationKey({ story, reworkOrdinal, transition: authorizingTransition });
  const failedBasisDigest = d('l');
  const assignmentBasisDigest = kernel.deriveReworkAssignmentBasisDigest({
    story,
    role: 'implementer',
    reworkOrdinal,
    priorCandidate: candidate.id,
    failedBasisDigest,
    generation,
    posture: 'default',
    transition: authorizingTransition,
  });
  return {
    controller: kernel.CANDIDATE_CONTROLLER,
    story,
    role: 'implementer',
    priorCandidate: candidate.id,
    failedBasisDigest,
    generation,
    posture: 'default',
    authorizingTransition,
    bound: makeBound(),
    reservation: {
      schema: kernel.RESERVATION_SCHEMA,
      scheduler: kernel.SCHEDULER_VERSION,
      variant: 'reserve',
      run,
      story,
      resource: 'RC-IMPL-TURN',
      amount: 1,
      generation,
      authorizingTransition,
      reservationKey,
      policyDigest: d('m'),
      position: 1,
      previousDigest: d('n'),
      contentDigest: d('o'),
      commitProof: proof(1, 2, d('o')),
      committed: true,
    },
    priorFence: {
      schema: 'jig.assignment-fence.v1',
      run,
      story,
      role: 'implementer',
      session: candidate.session,
      assignmentOrdinal: candidate.assignmentOrdinal,
      generation,
      status: 'fenced',
      fenceDigest: d('q'),
      reason: 'rework',
      authorizingTransition,
      commitProof: proof(1, 2, d('q')),
      committed: true,
    },
    freshSession: {
      schema: 'jig.fresh-session-fact.v1',
      run,
      story,
      role: 'implementer',
      session: `${story}/session/implementer/2`,
      sessionOrdinal: 2,
      assignmentOrdinal: 2,
      principal,
      assignmentBasisDigest,
      generation,
      posture: 'default',
      state: 'active',
      predecessor: candidate.session,
      authorizingTransition,
      commitProof: proof(1, 2, d('r')),
      committed: true,
    },
    ...overrides,
  };
};

test('GF-035 exports only candidate/rework semantics and no downstream authority', () => {
  assert.equal(kernel.CANDIDATE_CONTROLLER, 'RT-CONTROLLER');
  assert.deepEqual([...kernel.CANDIDATE_SOURCES], ['session-result', 'workspace-refresh']);
  const state = makeController();
  for (const forbidden of ['accept', 'publish', 'verify', 'finalize', 'land', 'retire', 'release'])
    assert.equal(forbidden in state.controller, false, forbidden);
});

test('CF-BINDING: exact content/tree/basis/evidence/workspace/session/posture/generation values mint immutable ID-CAND', () => {
  const state = makeController();
  const candidate = createCandidate(state);
  assert.match(candidate.id, new RegExp(`^${story}/cand/1\\|[0-9a-f]{64}$`));
  assert.equal(candidate.source, 'session-result');
  assert.equal(candidate.targetBasisDigest, d('e'));
  assert.equal(candidate.deliveryMetadata.session, session);
  assert.equal(Object.isFrozen(candidate), true);
  assert.equal(state.controller.candidates().length, 1);
});

test('controller-only minting, stale basis, hostile input, and duplicate creation keys fail closed', () => {
  const state = makeController();
  assert.deepEqual(
    state.controller.createCandidate({ controller: 'P-IMPLEMENTER', observation: makeObservation() }).error,
    {
      family: 'FC-AUTHORITY',
      code: 'CANDIDATE_CONTROLLER_REQUIRED',
    },
  );
  const candidate = createCandidate(state);
  const replay = state.controller.createCandidate({
    controller: kernel.CANDIDATE_CONTROLLER,
    observation: makeObservation(),
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.value.id, candidate.id);
  assert.equal(state.controller.candidates().length, 1);
  assert.deepEqual(
    state.controller.createCandidate({
      controller: kernel.CANDIDATE_CONTROLLER,
      observation: makeObservation({ runBasisDigest: d('z') }),
    }).error,
    {
      family: 'FC-FENCE',
      code: 'STALE_CANDIDATE_BASIS',
    },
  );
  assert.deepEqual(
    state.controller.createCandidate({
      controller: kernel.CANDIDATE_CONTROLLER,
      observation: makeObservation({ commitMessage: 'password=not-allowed' }),
    }).error,
    {
      family: 'FC-INPUT',
      code: 'INVALID_CANDIDATE_OBSERVATION',
    },
  );
});

test('CF-RUN-CONTROL: rework commits one ordinal with capacity, prior fence, and fresh logical session', () => {
  const state = makeController();
  const candidate = createCandidate(state);
  const assignment = state.controller.admitRework(makeRework(candidate));
  assert.equal(assignment.ok, true, JSON.stringify(assignment));
  assert.equal(assignment.value.reworkOrdinal, 1);
  assert.equal(assignment.value.session, `${story}/session/implementer/2`);
  assert.equal(assignment.value.priorSession, candidate.session);
  assert.equal(state.controller.assignments().length, 1);
  assert.equal(state.controller.stories().find((entry) => entry.story === story)?.state, 'Reworking');
  const replay = state.controller.admitRework(makeRework(candidate));
  assert.equal(replay.ok, true);
  assert.equal(replay.value.session, assignment.value.session);
  assert.equal(state.controller.assignments().length, 1);
});

test('reconnect is not rework: active/stale prior assignments, capacity waits, and same-session reuse fail closed', () => {
  const state = makeController();
  const candidate = createCandidate(state);
  const active = makeRework(candidate, {
    priorFence: { ...makeRework(candidate).priorFence, status: 'terminal', session: `${story}/session/implementer/9` },
  });
  assert.deepEqual(state.controller.admitRework(active).error, {
    family: 'FC-FENCE',
    code: 'PRIOR_ASSIGNMENT_MISMATCH',
  });
  assert.deepEqual(state.controller.admitRework(makeRework(candidate, { reservation: null })).error, {
    family: 'FC-CAPACITY',
    code: 'REWORK_CAPACITY_RESERVATION_REQUIRED',
  });
  const same = makeRework(candidate);
  same.freshSession = { ...same.freshSession, session: candidate.session, sessionOrdinal: 1 };
  assert.deepEqual(state.controller.admitRework(same).error, { family: 'FC-FENCE', code: 'FRESH_SESSION_REQUIRED' });
});

test('BND-REWORK exhaustion blocks the story, derives dependent NotRun, and preserves the prior candidate', () => {
  const state = makeController();
  const candidate = createCandidate(state);
  assert.deepEqual(state.controller.admitRework(makeRework(candidate, { bound: makeBound(2, 'exhausted') })).error, {
    family: 'FC-BOUND',
    code: 'REWORK_EXHAUSTED',
  });
  assert.equal(state.controller.candidate(candidate.id).ok, true);
  assert.equal(state.controller.stories().find((entry) => entry.story === story)?.state, 'Blocked');
  assert.equal(state.controller.stories().find((entry) => entry.story === dependent)?.state, 'NotRun');
});

test('crash/replay recovery is conservative: witnessed ACK loss resolves once, unwitnessed flush does not mint', () => {
  const witnessed = makeController({ ledgerOptions: { fault: 'after-witness' } });
  assert.equal(createCandidate(witnessed).id, witnessed.controller.candidates()[0].id);
  const flushed = makeController({ ledgerOptions: { fault: 'after-flush' } });
  const uncertain = flushed.controller.createCandidate({
    controller: kernel.CANDIDATE_CONTROLLER,
    observation: makeObservation(),
  });
  assert.deepEqual(uncertain.error, { family: 'FC-TRUST', code: 'WITNESS_MISMATCH' });
  assert.equal(flushed.controller.candidates().length, 0);

  const assignmentState = makeController();
  const candidate = createCandidate(assignmentState);
  const assignment = assignmentState.controller.admitRework(makeRework(candidate));
  assert.equal(assignment.ok, true, JSON.stringify(assignment));
  const recovered = assignmentState.controller.recoverRework(makeRework(candidate));
  assert.equal(recovered.ok, true, JSON.stringify(recovered));
  assert.equal(recovered.value.session, assignment.value.session);
  assert.equal(assignmentState.controller.assignments().length, 1);
});

test('workspace refresh uses the same immutable carrier without acceptance or landing authority', () => {
  const state = makeController();
  const result = state.controller.createCandidate({
    controller: kernel.CANDIDATE_CONTROLLER,
    observation: makeObservation({
      event: 'EV-WORKSPACE-FACT',
      source: 'workspace-refresh',
      operation: op(1, 2),
      operationType: 'OPC-WS-OBSERVE',
    }),
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.source, 'workspace-refresh');
});
