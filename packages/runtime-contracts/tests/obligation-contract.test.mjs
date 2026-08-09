import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const obligation = await import('../dist/obligation.js');
const oracle = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/obligation-contract-oracle.json'), 'utf8'),
);

const digest = (character) => (({ p: 'd', t: 'e', w: 'f', x: '0', z: '1' })[character] ?? character).repeat(64);
const run = 'run-000000000038-0123456789abcdef';
const generation = `${run}/gen/1|controller`;
const origin = `${run}/event/1`;
const resource = 'resource/protected-retirement';
const evidenceSubject = `evidence://${run}/story/retiring/claim/preservation`;
const evidence = (character = 'b') => ({
  subject: evidenceSubject,
  digest: digest(character),
  trustRoot: digest('t'),
  referenceDigest: obligation.obligationEvidenceDigest({
    subject: evidenceSubject,
    digest: digest(character),
    trustRoot: digest('t'),
  }),
});
const criteria = (overrides = {}) => ({
  subject: `evidence://${run}/story/retiring/claim/retirement-complete`,
  claim: 'resource-retirement-complete',
  ...overrides,
});
const openInput = (overrides = {}) => ({
  obligationOrdinal: 1,
  run,
  generation,
  resource,
  duty: 'retirement',
  origin,
  reason: 'automatic retirement duty failed after bounded attempts',
  preservationEvidence: evidence(),
  accountableOwner: 'principal/arye',
  criteria: criteria(),
  startedAt: 1000,
  deadline: 1000 + 72 * 60 * 60,
  policyDigest: digest('p'),
  ...overrides,
});

const ownerProof = digest('a');

test('GF038 oracle retains the private bounded contract and excluded capabilities', () => {
  assert.equal(oracle.contractVersion, obligation.OBLIGATION_CONTRACT_VERSION);
  assert.equal(oracle.schema, obligation.OBLIGATION_SCHEMA);
  assert.equal(oracle.criteriaSchema, obligation.OBLIGATION_CRITERIA_SCHEMA);
  assert.equal(oracle.evidenceSchema, obligation.OBLIGATION_EVIDENCE_SCHEMA);
  assert.equal(oracle.bound, obligation.OBLIGATION_BOUND.name);
  assert.deepEqual(oracle.statuses, ['open', 'accepted-handoff', 'resolved']);
  assert.deepEqual(oracle.duties, [...obligation.AUTOMATIC_DUTIES]);
  assert.deepEqual(oracle.events, [
    'EV-OWNER-DECISION',
    'EV-OBLIGATION-RESOLVED',
    'EV-BOUND-EXHAUSTED',
    'EV-WAKE-SETTLEMENT',
  ]);
});

test('GF038-MC-01: opening mints one immutable obligation with exact bindings', () => {
  const controller = obligation.createScriptedObligationController();
  const opened = controller.open(openInput());
  assert.equal(opened.ok, true, JSON.stringify(opened));
  assert.equal(opened.value.id, `${run}/obligation/1`);
  assert.equal(opened.value.status, 'open');
  assert.equal(opened.value.duty, 'retirement');
  assert.equal(opened.value.resource, resource);
  assert.equal(opened.value.origin, origin);
  assert.equal(opened.value.accountableOwner, 'principal/arye');
  assert.equal(opened.value.startedAt, 1000);
  assert.equal(opened.value.deadline, 1000 + 72 * 60 * 60);
  assert.equal(opened.value.bound, 'BND-WAIT-DECISION');
  assert.equal(opened.value.boundDigest.length, 64);
  assert.equal(opened.value.criteria.digest.length, 64);
  assert.equal(Object.isFrozen(opened.value), true);
  assert.deepEqual(controller.open(openInput()), opened);
  assert.equal(controller.open(openInput({ reason: 'different failure' })).error.code, 'OBLIGATION_ID_REUSE_MISMATCH');
  assert.equal(controller.facts().filter((fact) => fact.type === 'SCH-OBLIGATION').length, 1);
});

test('GF038-MC-02: only the closed lifecycle edges are accepted and replay is idempotent', () => {
  const controller = obligation.createScriptedObligationController();
  const opened = controller.open(openInput());
  assert.equal(opened.ok, true);
  const handoff = controller.acceptHandoff({
    obligation: opened.value.id,
    responder: 'principal/arye',
    responderProof: ownerProof,
    criteriaDigest: opened.value.criteria.digest,
    generation,
    reason: 'owner accepts the exact residual duty',
    observedAt: 2000,
  });
  assert.equal(handoff.ok, true, JSON.stringify(handoff));
  assert.equal(handoff.value.status, 'accepted-handoff');
  assert.deepEqual(
    controller.acceptHandoff({
      obligation: opened.value.id,
      responder: 'principal/arye',
      responderProof: ownerProof,
      criteriaDigest: opened.value.criteria.digest,
      generation,
      reason: 'owner accepts the exact residual duty',
      observedAt: 2000,
    }),
    handoff,
  );
  assert.equal(
    controller.acceptHandoff({
      obligation: opened.value.id,
      responder: 'principal/arye',
      responderProof: ownerProof,
      criteriaDigest: opened.value.criteria.digest,
      generation,
      reason: 'owner accepts the exact residual duty',
      observedAt: 2001,
    }).ok,
    true,
  );
  assert.equal(controller.get(opened.value.id).value.status, 'accepted-handoff');
  assert.equal(
    controller.resolve({
      obligation: opened.value.id,
      responder: 'principal/arye',
      responderProof: ownerProof,
      grant: null,
      generation,
      criteriaDigest: opened.value.criteria.digest,
      evidence: evidence('c'),
      observedAt: 3000,
    }).value.status,
    'resolved',
  );
  assert.equal(
    controller.resolve({
      obligation: opened.value.id,
      responder: 'principal/arye',
      responderProof: ownerProof,
      grant: null,
      generation,
      criteriaDigest: opened.value.criteria.digest,
      evidence: evidence('c'),
      observedAt: 3000,
    }).value.status,
    'resolved',
  );
  assert.equal(controller.facts().filter((fact) => fact.type === 'EV-OBLIGATION-RESOLVED').length, 1);
  assert.equal(
    controller.acceptHandoff({
      obligation: opened.value.id,
      responder: 'principal/arye',
      responderProof: ownerProof,
      criteriaDigest: opened.value.criteria.digest,
      generation,
      reason: 'late mutation',
      observedAt: 4000,
    }).error.code,
    'OBLIGATION_TERMINAL',
  );
});

test('GF038-MC-03: handoff is owner-only and exact-subject/fence bound', () => {
  const controller = obligation.createScriptedObligationController();
  const opened = controller.open(openInput());
  assert.equal(opened.ok, true);
  const handoff = (overrides = {}) =>
    controller.acceptHandoff({
      obligation: opened.value.id,
      responder: 'principal/agent-one',
      responderProof: ownerProof,
      criteriaDigest: opened.value.criteria.digest,
      generation,
      reason: 'delegated answer',
      observedAt: 2000,
      ...overrides,
    });
  assert.deepEqual(handoff().error, { family: 'FC-AUTHORITY', code: 'OWNER_ONLY_HANDOFF' });
  assert.deepEqual(handoff({ responder: 'principal/arye', responderProof: digest('x') }).error, {
    family: 'FC-AUTHORITY',
    code: 'RESPONDER_NOT_AUTHENTICATED',
  });
  assert.deepEqual(
    handoff({ generation: `${run}/gen/2|controller`, responder: 'principal/arye', responderProof: ownerProof }).error,
    {
      family: 'FC-FENCE',
      code: 'STALE_OBLIGATION_GENERATION',
    },
  );
  assert.deepEqual(
    handoff({ criteriaDigest: digest('z'), responder: 'principal/arye', responderProof: ownerProof }).error,
    {
      family: 'FC-SUBJECT',
      code: 'CRITERIA_MISMATCH',
    },
  );
});

test('GF038-MC-04: delegated resolution requires a current exact grant and trusted criteria evidence', () => {
  const controller = obligation.createScriptedObligationController();
  const opened = controller.open(openInput());
  assert.equal(opened.ok, true);
  const grant = controller.issueGrant({
    grantOrdinal: 1,
    obligation: opened.value.id,
    delegate: 'principal/agent-one',
    grantorProof: ownerProof,
    generation,
    issuedAt: 1500,
    expiresAt: 5000,
  });
  assert.equal(grant.ok, true, JSON.stringify(grant));
  const resolution = {
    obligation: opened.value.id,
    responder: 'principal/agent-one',
    responderProof: digest('b'),
    grant: grant.value.id,
    generation,
    criteriaDigest: opened.value.criteria.digest,
    evidence: evidence('c'),
    observedAt: 3000,
  };
  assert.equal(controller.resolve(resolution).value.status, 'resolved');

  const wrongGrantController = obligation.createScriptedObligationController();
  const wrongOpened = wrongGrantController.open(openInput());
  assert.equal(wrongOpened.ok, true);
  assert.deepEqual(wrongGrantController.resolve({ ...resolution, grant: `${run}/grant/2` }).error, {
    family: 'FC-FENCE',
    code: 'CURRENT_GRANT_REQUIRED',
  });
  const criteriaController = obligation.createScriptedObligationController();
  const criteriaOpened = criteriaController.open(openInput());
  assert.equal(criteriaOpened.ok, true);
  assert.deepEqual(
    criteriaController.resolve({
      ...resolution,
      obligation: criteriaOpened.value.id,
      grant: null,
      responder: 'principal/arye',
      responderProof: ownerProof,
      criteriaDigest: digest('z'),
    }).error,
    { family: 'FC-SUBJECT', code: 'CRITERIA_MISMATCH' },
  );
  assert.deepEqual(
    criteriaController.resolve({
      ...resolution,
      obligation: criteriaOpened.value.id,
      grant: null,
      responder: 'principal/arye',
      responderProof: ownerProof,
      evidence: { ...evidence('c'), trustRoot: digest('x') },
      criteriaDigest: criteriaOpened.value.criteria.digest,
    }).error,
    { family: 'FC-TRUST', code: 'EVIDENCE_DIGEST_MISMATCH' },
  );
});

test('GF038-MC-05: first timeout re-escalates once without changing identity, owner, or deadline', () => {
  const controller = obligation.createScriptedObligationController();
  const opened = controller.open(openInput());
  assert.equal(opened.ok, true);
  assert.deepEqual(controller.expire({ obligation: opened.value.id, observedAt: opened.value.deadline - 1 }).error, {
    family: 'FC-BOUND',
    code: 'WAIT_NOT_EXHAUSTED',
  });
  const exhausted = controller.expire({ obligation: opened.value.id, observedAt: opened.value.deadline });
  assert.equal(exhausted.ok, true, JSON.stringify(exhausted));
  assert.equal(exhausted.value.status, 'open');
  assert.equal(exhausted.value.exhaustionCount, 1);
  assert.equal(exhausted.value.startedAt, opened.value.startedAt);
  assert.equal(exhausted.value.deadline, opened.value.deadline);
  assert.equal(exhausted.value.accountableOwner, opened.value.accountableOwner);
  const factCount = controller.facts().length;
  assert.deepEqual(
    controller.expire({ obligation: opened.value.id, observedAt: opened.value.deadline + 1 }),
    exhausted,
  );
  assert.equal(controller.facts().length, factCount);
  assert.equal(controller.facts().filter((fact) => fact.type === 'EV-BOUND-EXHAUSTED').length, 1);
});

test('GF038-MC-06/08: settlement wake is observation-only and no prohibited capability exists', () => {
  const controller = obligation.createScriptedObligationController();
  const opened = controller.open(openInput());
  assert.equal(opened.ok, true);
  const before = controller.get(opened.value.id).value;
  const wake = controller.wakeSettlement({
    obligation: opened.value.id,
    conditionDigest: digest('w'),
    observedAt: 5000,
  });
  assert.equal(wake.ok, true, JSON.stringify(wake));
  assert.equal(wake.value.type, 'EV-WAKE-SETTLEMENT');
  assert.deepEqual(controller.get(opened.value.id).value, before);
  assert.equal(controller.fixtureEvidence().providerEnabled, false);
  assert.equal(controller.fixtureEvidence().dispatchEnabled, false);
  assert.equal(controller.fixtureEvidence().settlementOverlayEnabled, false);
  assert.equal(controller.fixtureEvidence().cleanupEnabled, false);
  assert.equal(controller.fixtureEvidence().noticeChannelEnabled, false);
});

test('GF038-MC-07: snapshot recovery preserves open state and rejects hostile or corrupted snapshots', () => {
  const controller = obligation.createScriptedObligationController();
  const opened = controller.open(openInput());
  assert.equal(opened.ok, true);
  assert.equal(controller.expire({ obligation: opened.value.id, observedAt: opened.value.deadline }).ok, true);
  const restored = obligation.restoreScriptedObligationController(controller.snapshot());
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.get(opened.value.id), controller.get(opened.value.id));
  assert.deepEqual(restored.value.facts(), controller.facts());
  assert.deepEqual(
    restored.value.expire({ obligation: opened.value.id, observedAt: opened.value.deadline + 1 }),
    controller.get(opened.value.id),
  );

  const forged = structuredClone(controller.snapshot());
  forged.obligations[0].deadline += 1;
  assert.deepEqual(obligation.restoreScriptedObligationController(forged).error, {
    family: 'FC-TRUST',
    code: 'INVALID_OBLIGATION_SNAPSHOT',
  });
  assert.deepEqual(controller.open({ ...openInput(), resource: 'api-token=super-secret' }).error, {
    family: 'FC-TRUST',
    code: 'HOSTILE_RESOURCE',
  });
  assert.deepEqual(controller.open({ ...openInput(), origin: `${run}/event/0` }).error, {
    family: 'FC-SUBJECT',
    code: 'INVALID_ORIGIN',
  });
});
