import assert from 'node:assert/strict';
import test from 'node:test';

const kernel = await import('../dist/index.js');

const d = (c) => c.charCodeAt(0).toString(16).padStart(2, '0').repeat(32);
const run = 'run-000000000035-0123456789abcdef';
const story = `${run}/story/implementer-candidates`;
const dependent = `${run}/story/dependent-story`;
const transitiveDependent = `${run}/story/transitive-dependent-story`;
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
  { story: transitiveDependent, state: 'Implementing', dependencies: [dependent], directBlocker: false, blocker: null },
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
  const selectedGraph =
    options.graph ??
    graph.map((entry) =>
      entry.story === story && options.storyState ? { ...entry, state: options.storyState } : entry,
    );
  const created = kernel.createCandidateController({
    run,
    basisDigest: basis,
    generation,
    graph: selectedGraph,
    ledger,
  });
  assert.equal(created.ok, true, JSON.stringify(created));
  return { controller: created.value, ledger };
};

const createCandidate = (state, overrides = {}) => {
  const result = state.controller.createCandidate(makeObservation(overrides));
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
  const {
    boundConsumed = 0,
    reworkOrdinal = boundConsumed + 1,
    transitionOrdinal = reworkOrdinal + 1,
    sessionOrdinal = reworkOrdinal + 1,
    ...inputOverrides
  } = overrides;
  const authorizingTransition = tx(transitionOrdinal);
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
    story,
    role: 'implementer',
    priorCandidate: candidate.id,
    failedBasisDigest,
    generation,
    posture: 'default',
    authorizingTransition,
    bound: makeBound(boundConsumed),
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
      commitProof: proof(1, transitionOrdinal, d('o')),
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
      commitProof: proof(1, transitionOrdinal, d('q')),
      committed: true,
    },
    freshSession: {
      schema: 'jig.fresh-session-fact.v1',
      run,
      story,
      role: 'implementer',
      session: `${story}/session/implementer/${sessionOrdinal}`,
      sessionOrdinal,
      assignmentOrdinal: reworkOrdinal + 1,
      principal,
      assignmentBasisDigest,
      generation,
      posture: 'default',
      state: 'active',
      predecessor: candidate.session,
      authorizingTransition,
      commitProof: proof(1, transitionOrdinal, d('r')),
      committed: true,
    },
    ...inputOverrides,
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
  assert.equal(candidate.sourceEvent.operation, op(1));
  assert.equal(candidate.sourceEvent.commitProof.event, `${run}/event/1`);
  assert.equal(candidate.targetBasisDigest, d('e'));
  assert.equal(candidate.deliveryMetadata.session, session);
  assert.equal(Object.isFrozen(candidate), true);
  assert.equal(state.controller.candidates().length, 1);
});

test('controller-only minting, stale basis, hostile input, and duplicate creation keys fail closed', () => {
  const state = makeController();
  assert.deepEqual(state.controller.createCandidate({ controller: 'P-IMPLEMENTER', ...makeObservation() }).error, {
    family: 'FC-INPUT',
    code: 'INVALID_CANDIDATE_OBSERVATION',
  });
  const candidate = createCandidate(state);
  const replay = state.controller.createCandidate(makeObservation());
  assert.equal(replay.ok, true);
  assert.equal(replay.value.id, candidate.id);
  assert.equal(state.controller.candidates().length, 1);
  assert.deepEqual(state.controller.createCandidate(makeObservation({ runBasisDigest: d('z') })).error, {
    family: 'FC-FENCE',
    code: 'STALE_CANDIDATE_BASIS',
  });
  assert.deepEqual(state.controller.createCandidate(makeObservation({ commitMessage: 'password=not-allowed' })).error, {
    family: 'FC-INPUT',
    code: 'INVALID_CANDIDATE_OBSERVATION',
  });
});

test('source lifecycle and generation transitions are exact and fail closed', () => {
  const implementing = makeController();
  assert.deepEqual(
    implementing.controller.createCandidate(
      makeObservation({
        generation: `${run}/gen/2|controller-token`,
        authorizingTransition: `${run}/txn/1/${run}/gen/2|controller-token|${basis}`,
        operation: `${run}/txn/1/${run}/gen/2|controller-token|${basis}/op/1`,
      }),
    ).error,
    { family: 'FC-INPUT', code: 'INVALID_CANDIDATE_OBSERVATION' },
  );
  assert.deepEqual(
    implementing.controller.createCandidate(
      makeObservation({ event: 'EV-WORKSPACE-FACT', source: 'workspace-refresh', operationType: 'OPC-WS-OBSERVE' }),
    ).error,
    { family: 'FC-AUTHORITY', code: 'CANDIDATE_STATE_NOT_CREATABLE' },
  );

  const reviewing = makeController({ storyState: 'Reviewing' });
  assert.deepEqual(reviewing.controller.createCandidate(makeObservation()).error, {
    family: 'FC-AUTHORITY',
    code: 'CANDIDATE_STATE_NOT_CREATABLE',
  });

  const refreshing = makeController({ storyState: 'Refreshing' });
  assert.deepEqual(refreshing.controller.createCandidate(makeObservation()).error, {
    family: 'FC-AUTHORITY',
    code: 'CANDIDATE_STATE_NOT_CREATABLE',
  });
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

test('replacement lineage keeps session ordinals independent and recovers the next rework', () => {
  const first = makeController();
  const original = createCandidate(first);
  assert.equal(first.controller.admitRework(makeRework(original)).ok, true);

  const replacementState = makeController({ ledger: first.ledger });
  const replacement = createCandidate(replacementState, {
    session: `${story}/session/implementer/3`,
    sessionOrdinal: 3,
    assignmentOrdinal: 2,
    operation: op(3),
    authorizingTransition: tx(3),
    commitProof: proof(2, 3),
    producerKey: d('t'),
    targetBasisDigest: d('r'),
    treeDigest: d('s'),
  });
  const next = makeRework(replacement, {
    boundConsumed: 1,
    reworkOrdinal: 2,
    transitionOrdinal: 4,
    sessionOrdinal: 4,
  });
  const assignment = replacementState.controller.admitRework(next);
  assert.equal(assignment.ok, true, JSON.stringify(assignment));
  assert.equal(assignment.value.session, `${story}/session/implementer/4`);

  const recovered = makeController({ ledger: replacementState.ledger, storyState: 'Reworking' });
  const replay = recovered.controller.recoverRework(next);
  assert.equal(replay.ok, true, JSON.stringify(replay));
  assert.equal(replay.value.sessionOrdinal, 4);
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
  assert.equal(state.controller.stories().find((entry) => entry.story === transitiveDependent)?.state, 'NotRun');
});

test('crash/replay recovery is conservative: witnessed ACK loss resolves once, unwitnessed flush does not mint', () => {
  const witnessed = makeController({ ledgerOptions: { fault: 'after-witness' } });
  assert.equal(createCandidate(witnessed).id, witnessed.controller.candidates()[0].id);
  const flushed = makeController({ ledgerOptions: { fault: 'after-flush' } });
  const uncertain = flushed.controller.createCandidate({
    ...makeObservation(),
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

test('recovery rejects a synthetic source proof even when the candidate append chain is otherwise intact', () => {
  const state = makeController();
  createCandidate(state);
  const snapshot = structuredClone(state.ledger.snapshot().value);
  snapshot.records[0].sourceFact.commitProof.recordDigest = d('z');
  snapshot.records[0].sourceFact.commitProof.witnessDigest = d('z');
  const tamperedLedger = {
    snapshot: () => ({ ok: true, value: snapshot }),
    append: () => ({ ok: false, error: { family: 'FC-TRUST', code: 'UNEXPECTED_APPEND' } }),
    readCandidate: () => ({ ok: false, error: { family: 'FC-TRUST', code: 'UNEXPECTED_READ' } }),
    readRework: () => ({ ok: false, error: { family: 'FC-TRUST', code: 'UNEXPECTED_READ' } }),
  };
  const recovered = kernel.createCandidateController({
    run,
    basisDigest: basis,
    generation,
    graph,
    ledger: tamperedLedger,
  });
  assert.deepEqual(recovered.error, { family: 'FC-TRUST', code: 'INVALID_CANDIDATE_RECORD' });
});

test('workspace refresh uses the same immutable carrier without acceptance or landing authority', () => {
  const state = makeController({ storyState: 'Refreshing' });
  const result = state.controller.createCandidate(
    makeObservation({
      event: 'EV-WORKSPACE-FACT',
      source: 'workspace-refresh',
      operation: op(1, 2),
      operationType: 'OPC-WS-OBSERVE',
    }),
  );
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.source, 'workspace-refresh');
});
