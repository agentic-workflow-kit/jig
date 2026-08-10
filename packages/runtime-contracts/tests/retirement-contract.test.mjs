import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const retirement = await import('../dist/retirement.js');
const obligation = await import('../dist/obligation.js');
const { stageDigest } = await import('@agentic-workflow-kit/jig-codec');
const evidenceRuntime = await import('../dist/evidence.js');
const artifactRuntime = await import('../dist/artifact.js');
const ledgerRuntime = await import('../dist/ledger.js');
const evidenceOracle = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/evidence-contract-oracle.json'), 'utf8'),
);

const digest = (character) => character.repeat(64);
const run = 'run-000000000046-0123456789abcdef';
const story = `${run}/story/gf046`;
const generation = `${run}/gen/1|controller`;
const retirementDeadline = 1000 + 72 * 60 * 60;
const transition = `${run}/txn/1/${digest('a')}`;
const fence = Object.freeze({
  generation,
  authority: `${run}/auth/1`,
  basis: digest('b'),
});

const hash = (value) => createHash('sha256').update(value).digest('hex');
const admittedEvidence = (() => {
  const scanBasis = { version: evidenceOracle.scanPolicyVersion, detectors: evidenceOracle.scanDetectors };
  const secretScan = { ...scanBasis, digest: hash(JSON.stringify(scanBasis)) };
  const policyBasis = {
    kind: evidenceOracle.criticalEvidenceKind,
    version: evidenceOracle.criticalPolicyVersion,
    scanPolicyVersion: secretScan.version,
    scanPolicyDigest: secretScan.digest,
    maxBytes: evidenceOracle.defaultMaxBytes,
    oversizeBehavior: 'reject',
    completenessCritical: true,
    contentType: 'text/plain',
    redactionStatus: 'source-redacted',
    retention: evidenceOracle.retention,
  };
  const evidenceConfig = {
    subjects: [
      { kind: evidenceOracle.subjectKind, identity: evidenceOracle.subjectIdentity, claims: [evidenceOracle.claim] },
    ],
    principals: [{ principal: evidenceOracle.principal, sessions: [evidenceOracle.session] }],
    secretScan,
    evidenceKinds: [{ ...policyBasis, digest: hash(JSON.stringify(policyBasis)) }],
  };
  const authority = evidenceRuntime.createScriptedEvidenceFixture(evidenceConfig);
  const artifacts = artifactRuntime.createScriptedArtifactFixture();
  const prepared = authority.prepare({
    schemaVersion: evidenceOracle.evidenceSchemaVersion,
    evidenceKind: evidenceOracle.criticalEvidenceKind,
    policy: { version: evidenceOracle.criticalPolicyVersion, digest: evidenceConfig.evidenceKinds[0].digest },
    subject: evidenceOracle.evidenceSubject,
    producer: { kind: 'principal', principal: evidenceOracle.principal, session: evidenceOracle.session },
    providerManifest: null,
    contentDigest: evidenceOracle.digest,
    bytes: new TextEncoder().encode(evidenceOracle.bytes),
    artifact: {
      resourceScope: evidenceOracle.resourceScope,
      operation: evidenceOracle.operation,
      fence: evidenceOracle.fence,
      temporaryTuple: evidenceOracle.temporaryTuple,
    },
  });
  assert.equal(prepared.ok, true, JSON.stringify(prepared));
  const fact = artifacts.store.putDisposable(prepared.value.artifactRequest);
  assert.equal(fact.ok, true, JSON.stringify(fact));
  assert.equal(artifacts.witness.advance(fact.value).ok, true);
  const request = prepared.value.artifactRequest;
  const registration = JSON.stringify({
    resourceScope: request.resourceScope,
    subject: request.subject,
    digest: request.digest,
    fence: request.fence,
    holder: request.holder,
    putOperation: request.operation,
    pins: request.pins,
  });
  const canonical = JSON.stringify({
    transition: `transition/evidence/${prepared.value.key}/temporary`,
    registration,
    role: 'temporary',
    holder: request.pins.temporary.holder,
    tuple: request.pins.temporary.tuple,
    subject: request.subject,
    fence: request.fence,
    fact: fact.value,
  });
  const proof = {
    transition: `transition/evidence/${prepared.value.key}/temporary`,
    registration,
    role: 'temporary',
    holder: request.pins.temporary.holder,
    tuple: request.pins.temporary.tuple,
    subject: request.subject,
    fence: request.fence,
    fact: fact.value,
    digest: hash(canonical),
  };
  const { bytes: _bytes, ...putBasis } = request;
  assert.equal(
    artifacts.store.adopt({ ...putBasis, putOperation: request.operation, fact: fact.value, proof }).ok,
    true,
  );
  const admitted = authority.admit({ key: prepared.value.key, fact: fact.value, proof }, artifacts.store);
  assert.equal(admitted.ok, true, JSON.stringify(admitted));
  return { authority, key: prepared.value.key, manifest: admitted.value.manifest };
})();

const obligationEvidence = Object.freeze({
  key: admittedEvidence.key,
  subject: admittedEvidence.manifest.subject,
  claim: admittedEvidence.manifest.claim,
});
const obligationOptions = () => ({
  obligation: obligation.createScriptedObligationController({
    dependencies: { ledger: ledgerRuntime.createScriptedLedger(), evidence: admittedEvidence.authority },
  }),
  obligationEvidence,
});

const inventory = (kind, overrides = {}) => ({
  resource: `${story}/resource/${kind}`,
  kind,
  holder: kind === 'workspace' ? 'SCH-WORKSPACE' : `SCH-${kind.toUpperCase()}`,
  resourceIdentity: `${story}/${kind}/1`,
  outcome: 'Blocked',
  dependencyRelease: Object.freeze([]),
  retention: 'active',
  pin: 'held',
  destructionEligibility: 'ineligible',
  reviewIdentity: `${story}/review/1`,
  fence,
  witness: Object.freeze({
    head: digest('c'),
    lineage: digest('d'),
    currency: 'current',
  }),
  ...overrides,
});

const baseInput = (overrides = {}) => ({
  schema: retirement.RETIREMENT_SCHEMA,
  run,
  story,
  generation,
  storyState: 'Retiring',
  runPhase: 'Active',
  outcome: 'Blocked',
  dependencyRelease: Object.freeze([]),
  releaseDigest: digest('e'),
  transition: Object.freeze({
    controller: 'RT-CONTROLLER',
    writer: 'CP-TRANSITION',
    transaction: transition,
    event: `${run}/event/1`,
    position: 1,
    fence,
  }),
  bound: Object.freeze({
    startedAt: 1000,
    deadline: retirementDeadline,
    attempts: 0,
  }),
  resources: Object.freeze([
    inventory('session'),
    inventory('workspace'),
    inventory('review-ref'),
    inventory('review-request'),
    inventory('review-status'),
    inventory('review-comment'),
    inventory('artifact'),
  ]),
  ...overrides,
});

const holderTransition = (resource, operation) => ({
  controller: 'RT-CONTROLLER',
  writer: 'CP-TRANSITION',
  transaction: `${transition}/holder/${resource.resourceIdentity}`,
  event: `${run}/event/holder-retirement/${resource.kind}`,
  position: 2,
  fence,
  resource: resource.resource,
  resourceIdentity: resource.resourceIdentity,
  operation,
  committed: true,
});

const trustEvidence = (plan, resource) => ({
  kind: 'witness-fork',
  expectedHead: resource.witness.head,
  observedHead: digest('9'),
  expectedLineage: resource.witness.lineage,
  observedLineage: resource.witness.lineage,
  expectedPosition: plan.transition.position,
  observedPosition: plan.transition.position,
  expectedRoot: plan.transition.fence.basis,
  observedRoot: plan.transition.fence.basis,
  observedCurrency: 'current',
  proofDigest: digest('8'),
});

const receipt = (plan, resource, overrides = {}) => ({
  schema: retirement.PRESERVATION_RECEIPT_SCHEMA,
  event: `${run}/event/preserved/${resource.resourceIdentity}`,
  resource: resource.resource,
  resourceIdentity: resource.resourceIdentity,
  kind: resource.kind === 'workspace' ? 'EV-WORKSPACE-PRESERVED' : 'EV-RESOURCE-PRESERVED',
  status: 'preserved',
  contentDigest: digest('f'),
  readbackDigest: digest('f'),
  evidenceKey: obligationEvidence.key,
  evidenceSubject: obligationEvidence.subject,
  evidenceClaim: obligationEvidence.claim,
  witness: resource.witness,
  transition: plan.transition,
  ...overrides,
});

const script = (witnessAdvanced = false, lookupCertainty = 'confirmed-effect') => {
  const calls = [];
  let nextLookupCertainty = lookupCertainty;
  const lookupAttestation = (input, certainty = lookupCertainty) => {
    const priorWitness = input.preservationReceipt?.witness ?? input.preservationWitness;
    const attestation = {
      schema: retirement.RETIREMENT_LOOKUP_ATTESTATION_SCHEMA,
      capability: retirement.RETIREMENT_LOOKUP_CAPABILITY,
      resource: input.resource,
      resourceIdentity: input.resourceIdentity,
      operation: input.operation,
      port: input.port,
      mode: input.mode,
      transition: input.transition,
      holderTransition: input.holderTransition,
      preservationWitness: priorWitness,
      priorHead: priorWitness.head,
      priorLineage: priorWitness.lineage,
      newHead: certainty === 'confirmed-effect' ? digest('1') : null,
      newLineage: certainty === 'confirmed-effect' ? digest('2') : null,
      witnessAdvance:
        certainty === 'confirmed-effect'
          ? {
              previousHead: priorWitness.head,
              previousLineage: priorWitness.lineage,
              head: digest('1'),
              lineage: digest('2'),
              currency: 'current',
            }
          : null,
      certainty,
      digest: '',
    };
    const staged = stageDigest({ domain: 'GF046-RETIREMENT-LOOKUP', excludePaths: ['digest'], value: attestation });
    assert.equal(staged.ok, true, JSON.stringify(staged));
    return Object.freeze({ ...attestation, digest: staged.value.digest });
  };
  return {
    calls,
    invoke(input) {
      calls.push(Object.freeze({ ...input }));
      const priorWitness = input.preservationReceipt?.witness ?? input.preservationWitness;
      return {
        ok: true,
        value: Object.freeze({
          port: input.port,
          operation: input.operation,
          mode: input.mode,
          resource: input.resource,
          resourceIdentity: input.resourceIdentity,
          head: witnessAdvanced ? digest('1') : priorWitness.head,
          witness: witnessAdvanced ? digest('2') : priorWitness.lineage,
          witnessAdvance: {
            previousHead: priorWitness.head,
            previousLineage: priorWitness.lineage,
            head: witnessAdvanced ? digest('1') : priorWitness.head,
            lineage: witnessAdvanced ? digest('2') : priorWitness.lineage,
            currency: 'current',
          },
          certainty: 'confirmed-effect',
          lookupAttestation: lookupAttestation(input, 'confirmed-effect'),
        }),
      };
    },
    setLookupCertainty(certainty) {
      nextLookupCertainty = certainty;
    },
    attestLookup(input, certainty = nextLookupCertainty) {
      return lookupAttestation(input, certainty);
    },
    lookup(input) {
      calls.push(Object.freeze({ ...input, lookup: true }));
      return { ok: true, value: lookupAttestation(input, nextLookupCertainty) };
    },
  };
};

test('GF046-MC-01..05: plan freezes outcome baseline, inventory, bound, and controller authority', () => {
  const result = retirement.createRetirementController({});
  const planned = result.plan(baseInput());
  assert.equal(planned.ok, true, JSON.stringify(planned));
  assert.equal(planned.value.controller, 'RT-CONTROLLER');
  assert.equal(planned.value.writer, 'CP-TRANSITION');
  assert.equal(planned.value.bound.name, 'BND-RETIRE');
  assert.equal(planned.value.bound.maxAttempts, 3);
  assert.equal(planned.value.baseline.outcome, 'Blocked');
  assert.equal(planned.value.baseline.releaseDigest, digest('e'));
  assert.equal(planned.value.resources.length, 7);
  assert.equal(Object.isFrozen(planned.value), true);
  assert.equal(Object.isFrozen(planned.value.resources[0]), true);
});

test('GF046-MC-08: accepted retirement attempts never exceed the assigned default bound', () => {
  const controller = retirement.createRetirementController({});
  assert.deepEqual(
    controller.plan(
      baseInput({ bound: Object.freeze({ startedAt: 1000, deadline: retirementDeadline, attempts: 4 }) }),
    ),
    { ok: false, error: { family: 'FC-INPUT', code: 'INVALID_RETIREMENT_PLAN' } },
  );
  const planned = controller.plan(
    baseInput({ bound: Object.freeze({ startedAt: 1000, deadline: retirementDeadline, attempts: 3 }) }),
  );
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const snapshot = controller.snapshot();
  const restored = retirement.restoreRetirementController({
    ...snapshot,
    dutyAttempts: [{ resourceIdentity: planned.value.resources[0].resourceIdentity, attempts: 4 }],
  });
  assert.equal(restored.ok, false);
});

test('GF046-MC-01/05: every holder family requires its own preservation receipt before retirement or release-pin', () => {
  const controller = retirement.createRetirementController(obligationOptions());
  const planned = controller.plan(baseInput());
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const operations = new Map([
    ['session', ['OPC-SESSION-CLOSE', 'PORT-SESSION', 'retire']],
    ['workspace', ['OPC-WS-RETIRE', 'PORT-WORKSPACE', 'retire']],
    ['review-ref', ['OPC-REV-RETIRE-REF', 'PORT-DELIVERY', 'retire']],
    ['review-request', ['OPC-REV-RETIRE-REQUEST', 'PORT-DELIVERY', 'retire']],
    ['review-status', ['OPC-REV-RETIRE-STATUS', 'PORT-DELIVERY', 'retire']],
    ['review-comment', ['OPC-REV-RETIRE-COMMENT', 'PORT-DELIVERY', 'retire']],
    ['artifact', ['OPC-ART-DISPOSE', 'PORT-ARTIFACT', 'release-pin']],
  ]);
  for (const resource of planned.value.resources) {
    const [operation, port, mode] = operations.get(resource.kind);
    assert.deepEqual(
      controller.authorize({
        resource: resource.resource,
        resourceIdentity: resource.resourceIdentity,
        operation,
        port,
        mode,
        holderTransition: holderTransition(resource, operation),
      }),
      { ok: false, error: { family: 'FC-EVIDENCE', code: 'PRESERVATION_REQUIRED_BEFORE_RETIREMENT' } },
    );
  }
});

test('GF046-MC-04/07: preservation receipt requires exact readback and selects FC-EVIDENCE for ordinary gaps', () => {
  const controller = retirement.createRetirementController(obligationOptions());
  const planned = controller.plan(baseInput());
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const workspace = planned.value.resources.find((resource) => resource.kind === 'workspace');
  assert.ok(workspace);
  assert.deepEqual(controller.recordPreservation(receipt(planned.value, workspace, { readbackDigest: digest('0') })), {
    ok: false,
    error: { family: 'FC-EVIDENCE', code: 'PRESERVATION_READBACK_MISMATCH' },
  });
  const mismatchController = retirement.createRetirementController(obligationOptions());
  const mismatchPlan = mismatchController.plan(baseInput());
  assert.equal(mismatchPlan.ok, true, JSON.stringify(mismatchPlan));
  const mismatchWorkspace = mismatchPlan.value.resources.find((resource) => resource.kind === 'workspace');
  assert.ok(mismatchWorkspace);
  assert.deepEqual(
    mismatchController.recordPreservation(
      receipt(mismatchPlan.value, mismatchWorkspace, {
        evidenceKey: digest('a'),
      }),
    ),
    { ok: false, error: { family: 'FC-EVIDENCE', code: 'PRESERVATION_EVIDENCE_REFERENCE_MISMATCH' } },
  );
  assert.equal(mismatchController.snapshot().obligations.length, 1);
  assert.equal(mismatchController.snapshot().obligations[0].resource, mismatchWorkspace.resource);
  assert.equal(mismatchController.snapshot().obligations[0].deadline, retirementDeadline);
  const mismatchRestored = retirement.restoreRetirementController(mismatchController.snapshot(), obligationOptions());
  assert.equal(mismatchRestored.ok, true, JSON.stringify(mismatchRestored));
  assert.deepEqual(mismatchRestored.value.snapshot(), mismatchController.snapshot());
  const preserved = controller.recordPreservation(receipt(planned.value, workspace));
  assert.equal(preserved.ok, true, JSON.stringify(preserved));
  assert.equal(preserved.value.kind, 'EV-WORKSPACE-PRESERVED');
  assert.deepEqual(
    controller.recordPreservation(receipt(planned.value, workspace, { event: 'https://secret.example/token' })),
    {
      ok: false,
      error: { family: 'FC-EVIDENCE', code: 'HOSTILE_PRESERVATION_RECEIPT' },
    },
  );
  assert.deepEqual(
    controller.recordPreservation(
      receipt(planned.value, workspace, {
        witness: { ...workspace.witness, currency: 'stale' },
      }),
    ),
    {
      ok: false,
      error: { family: 'FC-TRUST', code: 'PRESERVATION_WITNESS_UNTRUSTED' },
    },
  );
});

test('GF046-MC-05: workspace preservation and retirement are separate exact controller operations', () => {
  const mechanism = script(true);
  const controller = retirement.createRetirementController({ ...obligationOptions(), mechanism });
  const planned = controller.plan(baseInput());
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const workspace = planned.value.resources.find((resource) => resource.kind === 'workspace');
  assert.ok(workspace);
  assert.equal(
    controller.authorize({
      resource: workspace.resource,
      resourceIdentity: workspace.resourceIdentity,
      operation: 'OPC-WS-PRESERVE',
      port: 'PORT-WORKSPACE',
      mode: 'retire',
      holderTransition: null,
    }).ok,
    true,
  );
  assert.equal(
    controller.dispatch({
      resource: workspace.resource,
      resourceIdentity: workspace.resourceIdentity,
      operation: 'OPC-WS-PRESERVE',
      port: 'PORT-WORKSPACE',
      mode: 'retire',
    }).ok,
    true,
  );
  assert.equal(controller.recordPreservation(receipt(planned.value, workspace)).ok, true);
  assert.equal(
    controller.authorize({
      resource: workspace.resource,
      resourceIdentity: workspace.resourceIdentity,
      operation: 'OPC-WS-RETIRE',
      port: 'PORT-WORKSPACE',
      mode: 'retire',
      holderTransition: holderTransition(workspace, 'OPC-WS-RETIRE'),
    }).ok,
    true,
  );
});

test('GF046-MC-05/06: controller commits exact retirement before scripted dispatch and rejects dispose-bytes at every boundary', () => {
  const mechanism = script(true);
  const controller = retirement.createRetirementController({ ...obligationOptions(), mechanism });
  const planned = controller.plan(baseInput());
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const session = planned.value.resources.find((resource) => resource.kind === 'session');
  assert.ok(session);
  assert.equal(controller.recordPreservation(receipt(planned.value, session)).ok, true);
  const authorized = controller.authorize({
    resource: session.resource,
    resourceIdentity: session.resourceIdentity,
    operation: 'OPC-SESSION-CLOSE',
    port: 'PORT-SESSION',
    mode: 'retire',
    holderTransition: holderTransition(session, 'OPC-SESSION-CLOSE'),
  });
  assert.equal(authorized.ok, true, JSON.stringify(authorized));
  assert.equal(mechanism.calls.length, 0);
  const dispatched = controller.dispatch({
    resource: session.resource,
    resourceIdentity: session.resourceIdentity,
    operation: 'OPC-SESSION-CLOSE',
    port: 'PORT-SESSION',
    mode: 'retire',
  });
  assert.equal(dispatched.ok, true, JSON.stringify(dispatched));
  assert.equal(mechanism.calls.length, 1);
  assert.deepEqual(
    controller.dispatch({
      resource: session.resource,
      resourceIdentity: session.resourceIdentity,
      operation: 'OPC-ART-DISPOSE',
      port: 'PORT-ARTIFACT',
      mode: 'dispose-bytes',
    }),
    {
      ok: false,
      error: { family: 'FC-AUTHORITY', code: 'DISPOSE_BYTES_FORBIDDEN' },
    },
  );
  assert.deepEqual(
    controller.authorize({
      resource: session.resource,
      resourceIdentity: session.resourceIdentity,
      operation: 'OPC-ART-DISPOSE',
      port: 'PORT-LEDGER',
      mode: 'release-pin',
      holderTransition: holderTransition(session, 'OPC-ART-DISPOSE'),
    }),
    {
      ok: false,
      error: { family: 'FC-AUTHORITY', code: 'LEDGER_NOT_DISPATCH_PORT' },
    },
  );
});

test('GF046-MC-06/08: release-pin is exact-mode, post-retirement, and uncertain effects retain the conservative pin', () => {
  const mechanism = script(true);
  const controller = retirement.createRetirementController({ ...obligationOptions(), mechanism });
  const planned = controller.plan(baseInput());
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const artifactResource = planned.value.resources.find((resource) => resource.kind === 'artifact');
  assert.ok(artifactResource);
  assert.equal(controller.recordPreservation(receipt(planned.value, artifactResource)).ok, true);
  assert.equal(
    controller.authorize({
      resource: artifactResource.resource,
      resourceIdentity: artifactResource.resourceIdentity,
      operation: 'OPC-ART-DISPOSE',
      port: 'PORT-ARTIFACT',
      mode: 'release-pin',
      holderTransition: holderTransition(artifactResource, 'OPC-ART-DISPOSE'),
    }).ok,
    true,
  );
  assert.equal(
    controller.dispatch({
      resource: artifactResource.resource,
      resourceIdentity: artifactResource.resourceIdentity,
      operation: 'OPC-ART-DISPOSE',
      port: 'PORT-ARTIFACT',
      mode: 'release-pin',
      fault: 'uncertain',
    }).error.family,
    'FC-EFFECT',
  );
  assert.equal(
    controller.snapshot().pins.find((pin) => pin.resourceIdentity === artifactResource.resourceIdentity).status,
    'held',
  );
  mechanism.setLookupCertainty('confirmed-absence');
  const absenceReconcile = controller.reconcile({
    operation: 'OPC-ART-DISPOSE',
    resourceIdentity: artifactResource.resourceIdentity,
    mode: 'release-pin',
  });
  assert.equal(absenceReconcile.ok, true, JSON.stringify(absenceReconcile));
  assert.equal(
    controller.reauthorize({
      resourceIdentity: artifactResource.resourceIdentity,
      operation: 'OPC-ART-DISPOSE',
      mode: 'release-pin',
    }).ok,
    true,
  );
  const confirmed = controller.dispatch({
    operation: 'OPC-ART-DISPOSE',
    resourceIdentity: artifactResource.resourceIdentity,
    resource: artifactResource.resource,
    port: 'PORT-ARTIFACT',
    mode: 'release-pin',
  });
  assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
  assert.equal(
    controller.adopt({
      operation: 'OPC-ART-DISPOSE',
      resourceIdentity: artifactResource.resourceIdentity,
      mode: 'release-pin',
      certainty: 'confirmed-effect',
      head: confirmed.value.head,
      witness: confirmed.value.witness,
      witnessAdvance: confirmed.value.witnessAdvance,
    }).ok,
    true,
  );
  assert.equal(
    controller.snapshot().pins.find((pin) => pin.resourceIdentity === artifactResource.resourceIdentity).status,
    'released',
  );
});

test('GF046-MC-06: release-pin adopts only the witnessed scripted result and never forms dispose-bytes', () => {
  const mechanism = script(true);
  const controller = retirement.createRetirementController({ mechanism });
  const planned = controller.plan(baseInput());
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const artifactResource = planned.value.resources.find((resource) => resource.kind === 'artifact');
  assert.ok(artifactResource);
  assert.equal(controller.recordPreservation(receipt(planned.value, artifactResource)).ok, true);
  assert.equal(
    controller.authorize({
      resource: artifactResource.resource,
      resourceIdentity: artifactResource.resourceIdentity,
      operation: 'OPC-ART-DISPOSE',
      port: 'PORT-ARTIFACT',
      mode: 'release-pin',
      holderTransition: holderTransition(artifactResource, 'OPC-ART-DISPOSE'),
    }).ok,
    true,
  );
  const result = controller.dispatch({
    resource: artifactResource.resource,
    resourceIdentity: artifactResource.resourceIdentity,
    operation: 'OPC-ART-DISPOSE',
    port: 'PORT-ARTIFACT',
    mode: 'release-pin',
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.witnessAdvance.currency, 'current');
  assert.deepEqual(
    controller.adopt({
      operation: 'OPC-ART-DISPOSE',
      resourceIdentity: artifactResource.resourceIdentity,
      mode: 'release-pin',
      certainty: 'confirmed-effect',
      witnessAdvanced: true,
    }),
    { ok: false, error: { family: 'FC-TRUST', code: 'RETIREMENT_RESULT_NOT_WITNESSED' } },
  );
  assert.equal(
    controller.adopt({
      operation: 'OPC-ART-DISPOSE',
      resourceIdentity: artifactResource.resourceIdentity,
      mode: 'release-pin',
      certainty: 'confirmed-effect',
      head: result.value.head,
      witness: result.value.witness,
      witnessAdvance: result.value.witnessAdvance,
    }).ok,
    true,
  );
  assert.equal(
    controller.snapshot().pins.find((pin) => pin.resourceIdentity === artifactResource.resourceIdentity).status,
    'released',
  );
  assert.equal(
    mechanism.calls.some((call) => Object.values(call).includes('dispose-bytes')),
    false,
  );
});

test('GF046-MC-07/08: confirmed-effect reconciliation restores the witnessed release-pin across restart', () => {
  const mechanism = script(true);
  const controller = retirement.createRetirementController({ ...obligationOptions(), mechanism });
  const planned = controller.plan(baseInput());
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const artifactResource = planned.value.resources.find((resource) => resource.kind === 'artifact');
  assert.ok(artifactResource);
  assert.equal(controller.recordPreservation(receipt(planned.value, artifactResource)).ok, true);
  assert.equal(
    controller.authorize({
      resource: artifactResource.resource,
      resourceIdentity: artifactResource.resourceIdentity,
      operation: 'OPC-ART-DISPOSE',
      port: 'PORT-ARTIFACT',
      mode: 'release-pin',
      holderTransition: holderTransition(artifactResource, 'OPC-ART-DISPOSE'),
    }).ok,
    true,
  );
  assert.deepEqual(
    controller.dispatch({
      resource: artifactResource.resource,
      resourceIdentity: artifactResource.resourceIdentity,
      operation: 'OPC-ART-DISPOSE',
      port: 'PORT-ARTIFACT',
      mode: 'release-pin',
      fault: 'uncertain',
    }),
    { ok: false, error: { family: 'FC-EFFECT', code: 'RETIREMENT_EFFECT_UNCERTAIN' } },
  );
  mechanism.setLookupCertainty('indeterminate');
  const indeterminate = controller.reconcile({
    operation: 'OPC-ART-DISPOSE',
    resourceIdentity: artifactResource.resourceIdentity,
    mode: 'release-pin',
  });
  assert.deepEqual(indeterminate, {
    ok: false,
    error: { family: 'FC-EFFECT', code: 'RETIREMENT_EFFECT_INDETERMINATE' },
  });
  assert.equal(controller.snapshot().authorizations[0].status, 'uncertain');
  mechanism.setLookupCertainty('confirmed-effect');
  assert.equal(
    controller.reconcile({
      operation: 'OPC-ART-DISPOSE',
      resourceIdentity: artifactResource.resourceIdentity,
      mode: 'release-pin',
    }).ok,
    true,
  );
  assert.equal(controller.snapshot().authorizations[0].status, 'confirmed-effect');
  const witnessAdvance = controller.snapshot().authorizations[0].witnessAdvance;
  const unavailable = retirement.restoreRetirementController(controller.snapshot(), obligationOptions());
  assert.deepEqual(unavailable, {
    ok: false,
    error: { family: 'FC-MECHANISM', code: 'RETIREMENT_LOOKUP_UNAVAILABLE' },
  });
  const restored = retirement.restoreRetirementController(controller.snapshot(), { ...obligationOptions(), mechanism });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.snapshot(), controller.snapshot());
  const forgedSnapshot = structuredClone(controller.snapshot());
  const forgedAuthorization = forgedSnapshot.authorizations[0];
  forgedAuthorization.lookupAttestation.newHead = digest('9');
  forgedAuthorization.lookupAttestation.witnessAdvance.head = digest('9');
  forgedAuthorization.witnessAdvance = forgedAuthorization.lookupAttestation.witnessAdvance;
  const forgedAttestationDigest = stageDigest({
    domain: 'GF046-RETIREMENT-LOOKUP',
    excludePaths: ['digest'],
    value: { ...forgedAuthorization.lookupAttestation, digest: '' },
  });
  assert.equal(forgedAttestationDigest.ok, true, JSON.stringify(forgedAttestationDigest));
  forgedAuthorization.lookupAttestation.digest = forgedAttestationDigest.value.digest;
  assert.deepEqual(retirement.restoreRetirementController(forgedSnapshot, { ...obligationOptions(), mechanism }), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'RETIREMENT_LOOKUP_JOURNAL_BINDING_INVALID' },
  });
  assert.equal(
    forgedSnapshot.pins.find((pin) => pin.resourceIdentity === artifactResource.resourceIdentity).status,
    'held',
  );
  assert.equal(
    restored.value.adopt({
      operation: 'OPC-ART-DISPOSE',
      resourceIdentity: artifactResource.resourceIdentity,
      mode: 'release-pin',
      certainty: 'confirmed-effect',
      head: witnessAdvance.head,
      witness: witnessAdvance.lineage,
      witnessAdvance,
    }).ok,
    true,
  );
  assert.equal(
    restored.value.snapshot().pins.find((pin) => pin.resourceIdentity === artifactResource.resourceIdentity).status,
    'released',
  );
});

test('GF046-ATTEST-02: direct dispatch recovery re-verifies the mechanism receipt before release-pin adoption', () => {
  const mechanism = script(true);
  const controller = retirement.createRetirementController({ ...obligationOptions(), mechanism });
  const planned = controller.plan(baseInput());
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const artifactResource = planned.value.resources.find((resource) => resource.kind === 'artifact');
  assert.ok(artifactResource);
  assert.equal(controller.recordPreservation(receipt(planned.value, artifactResource)).ok, true);
  assert.equal(
    controller.authorize({
      resource: artifactResource.resource,
      resourceIdentity: artifactResource.resourceIdentity,
      operation: 'OPC-ART-DISPOSE',
      port: 'PORT-ARTIFACT',
      mode: 'release-pin',
      holderTransition: holderTransition(artifactResource, 'OPC-ART-DISPOSE'),
    }).ok,
    true,
  );
  const dispatched = controller.dispatch({
    resource: artifactResource.resource,
    resourceIdentity: artifactResource.resourceIdentity,
    operation: 'OPC-ART-DISPOSE',
    port: 'PORT-ARTIFACT',
    mode: 'release-pin',
  });
  assert.equal(dispatched.ok, true, JSON.stringify(dispatched));
  const snapshot = controller.snapshot();
  assert.equal(snapshot.authorizations[0].lookupAttestation?.capability, 'CAP-RETIREMENT-LOOKUP');

  assert.deepEqual(retirement.restoreRetirementController(snapshot, obligationOptions()), {
    ok: false,
    error: { family: 'FC-MECHANISM', code: 'RETIREMENT_LOOKUP_UNAVAILABLE' },
  });
  const restored = retirement.restoreRetirementController(snapshot, { ...obligationOptions(), mechanism });
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.snapshot(), snapshot);
  assert.equal(
    restored.value.adopt({
      operation: 'OPC-ART-DISPOSE',
      resourceIdentity: artifactResource.resourceIdentity,
      mode: 'release-pin',
      certainty: 'confirmed-effect',
      head: dispatched.value.head,
      witness: dispatched.value.witness,
      witnessAdvance: dispatched.value.witnessAdvance,
    }).ok,
    true,
  );

  const forgedSnapshot = structuredClone(snapshot);
  const forgedAuthorization = forgedSnapshot.authorizations[0];
  const forgedWitnessAdvance = {
    ...forgedAuthorization.lookupAttestation.witnessAdvance,
    head: digest('9'),
    lineage: digest('8'),
  };
  const forgedAttestation = {
    ...forgedAuthorization.lookupAttestation,
    newHead: digest('9'),
    newLineage: digest('8'),
    witnessAdvance: forgedWitnessAdvance,
    digest: '',
  };
  const forgedAttestationDigest = stageDigest({
    domain: 'GF046-RETIREMENT-LOOKUP',
    excludePaths: ['digest'],
    value: forgedAttestation,
  });
  assert.equal(forgedAttestationDigest.ok, true, JSON.stringify(forgedAttestationDigest));
  forgedAttestation.digest = forgedAttestationDigest.value.digest;
  forgedAuthorization.lookupAttestation = forgedAttestation;
  forgedAuthorization.witnessAdvance = forgedWitnessAdvance;
  const forgedJournal = forgedSnapshot.journal.find((entry) => entry.kind === 'dispatch-result');
  assert.ok(forgedJournal);
  forgedJournal.lookupAttestation = structuredClone(forgedAttestation);
  forgedJournal.lookupAttestationDigest = forgedAttestation.digest;
  forgedJournal.lookupHead = forgedAttestation.newHead;
  forgedJournal.lookupLineage = forgedAttestation.newLineage;
  forgedJournal.lookupWitnessAdvance = structuredClone(forgedWitnessAdvance);
  forgedJournal.result.lookupAttestation = structuredClone(forgedAttestation);
  forgedJournal.result.head = forgedAttestation.newHead;
  forgedJournal.result.witness = forgedAttestation.newLineage;
  forgedJournal.result.witnessAdvance = structuredClone(forgedWitnessAdvance);
  forgedSnapshot.journal[forgedSnapshot.journal.indexOf(forgedJournal)] = JSON.parse(JSON.stringify(forgedJournal));
  const forgedJournalDigest = stageDigest({
    domain: 'GF046-RETIREMENT-JOURNAL',
    excludePaths: [],
    value: forgedSnapshot.journal,
  });
  assert.equal(forgedJournalDigest.ok, true, JSON.stringify(forgedJournalDigest));
  forgedSnapshot.journalDigest = forgedJournalDigest.value.digest;
  assert.deepEqual(retirement.restoreRetirementController(forgedSnapshot, { ...obligationOptions(), mechanism }), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'RETIREMENT_LOOKUP_REVALIDATION_FAILED' },
  });
  assert.equal(
    forgedSnapshot.pins.find((pin) => pin.resourceIdentity === artifactResource.resourceIdentity).status,
    'held',
  );

  mechanism.setLookupCertainty('indeterminate');
  assert.deepEqual(retirement.restoreRetirementController(snapshot, { ...obligationOptions(), mechanism }), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'RETIREMENT_LOOKUP_REVALIDATION_FAILED' },
  });
  mechanism.setLookupCertainty('confirmed-effect');
  const mismatchingMechanism = {
    ...mechanism,
    lookup(input) {
      const result = mechanism.lookup(input);
      if (!result.ok) return result;
      return { ...result, value: { ...result.value, newHead: digest('7') } };
    },
  };
  assert.deepEqual(
    retirement.restoreRetirementController(snapshot, { ...obligationOptions(), mechanism: mismatchingMechanism }),
    {
      ok: false,
      error: { family: 'FC-TRUST', code: 'RETIREMENT_LOOKUP_REVALIDATION_FAILED' },
    },
  );
});

test('GF046-MC-07: reconciliation is only legal for uncertain operations and terminal calls are inert', () => {
  const prepare = (lookupCertainty = 'confirmed-effect') => {
    const mechanism = script(true, lookupCertainty);
    const controller = retirement.createRetirementController({
      ...obligationOptions(),
      mechanism,
    });
    const planned = controller.plan(baseInput());
    assert.equal(planned.ok, true, JSON.stringify(planned));
    const artifactResource = planned.value.resources.find((resource) => resource.kind === 'artifact');
    assert.ok(artifactResource);
    assert.equal(controller.recordPreservation(receipt(planned.value, artifactResource)).ok, true);
    assert.equal(
      controller.authorize({
        resource: artifactResource.resource,
        resourceIdentity: artifactResource.resourceIdentity,
        operation: 'OPC-ART-DISPOSE',
        port: 'PORT-ARTIFACT',
        mode: 'release-pin',
        holderTransition: holderTransition(artifactResource, 'OPC-ART-DISPOSE'),
      }).ok,
      true,
    );
    assert.deepEqual(
      controller.dispatch({
        resource: artifactResource.resource,
        resourceIdentity: artifactResource.resourceIdentity,
        operation: 'OPC-ART-DISPOSE',
        port: 'PORT-ARTIFACT',
        mode: 'release-pin',
        fault: 'uncertain',
      }),
      { ok: false, error: { family: 'FC-EFFECT', code: 'RETIREMENT_EFFECT_UNCERTAIN' } },
    );
    return { controller, artifactResource, mechanism };
  };
  const reconcileInput = (artifactResource) => ({
    operation: 'OPC-ART-DISPOSE',
    resourceIdentity: artifactResource.resourceIdentity,
    mode: 'release-pin',
  });

  const committed = retirement.createRetirementController(obligationOptions());
  const committedPlan = committed.plan(baseInput());
  assert.equal(committedPlan.ok, true, JSON.stringify(committedPlan));
  const committedArtifact = committedPlan.value.resources.find((resource) => resource.kind === 'artifact');
  assert.ok(committedArtifact);
  assert.equal(committed.recordPreservation(receipt(committedPlan.value, committedArtifact)).ok, true);
  assert.equal(
    committed.authorize({
      resource: committedArtifact.resource,
      resourceIdentity: committedArtifact.resourceIdentity,
      operation: 'OPC-ART-DISPOSE',
      port: 'PORT-ARTIFACT',
      mode: 'release-pin',
      holderTransition: holderTransition(committedArtifact, 'OPC-ART-DISPOSE'),
    }).ok,
    true,
  );
  const committedBefore = committed.snapshot();
  assert.deepEqual(committed.reconcile(reconcileInput(committedArtifact)), {
    ok: false,
    error: { family: 'FC-EFFECT', code: 'RETIREMENT_RECONCILIATION_NOT_UNCERTAIN' },
  });
  assert.deepEqual(committed.snapshot(), committedBefore);

  const effect = prepare();
  const forgedBefore = effect.controller.snapshot();
  const forgedLookupInput = {
    resource: effect.artifactResource.resource,
    resourceIdentity: effect.artifactResource.resourceIdentity,
    operation: 'OPC-ART-DISPOSE',
    port: 'PORT-ARTIFACT',
    mode: 'release-pin',
    transition: forgedBefore.plan.transition,
    holderTransition: holderTransition(effect.artifactResource, 'OPC-ART-DISPOSE'),
    preservationWitness: effect.artifactResource.witness,
  };
  const forgedBasis = effect.mechanism.attestLookup(forgedLookupInput);
  const forgedAdvance = { ...forgedBasis.witnessAdvance, head: digest('9') };
  const forgedWithDigest = { ...forgedBasis, newHead: digest('9'), witnessAdvance: forgedAdvance, digest: '' };
  const forgedDigest = stageDigest({
    domain: 'GF046-RETIREMENT-LOOKUP',
    excludePaths: ['digest'],
    value: forgedWithDigest,
  });
  assert.equal(forgedDigest.ok, true, JSON.stringify(forgedDigest));
  const structurallyValidForgedAttestation = { ...forgedWithDigest, digest: forgedDigest.value.digest };
  assert.deepEqual(
    effect.controller.reconcile({
      ...reconcileInput(effect.artifactResource),
      certainty: 'confirmed-effect',
      head: digest('1'),
      witness: digest('2'),
      witnessAdvance: {
        previousHead: effect.artifactResource.witness.head,
        previousLineage: effect.artifactResource.witness.lineage,
        head: digest('1'),
        lineage: digest('2'),
        currency: 'current',
      },
      lookupAttestation: structurallyValidForgedAttestation,
    }),
    { ok: false, error: { family: 'FC-SUBJECT', code: 'RETIREMENT_RECONCILIATION_BINDING_MISMATCH' } },
  );
  assert.deepEqual(effect.controller.snapshot(), forgedBefore);
  assert.equal(effect.controller.reconcile(reconcileInput(effect.artifactResource)).ok, true);
  const effectBefore = effect.controller.snapshot();
  assert.deepEqual(effect.controller.reconcile(reconcileInput(effect.artifactResource)), {
    ok: false,
    error: { family: 'FC-EFFECT', code: 'RETIREMENT_RECONCILIATION_NOT_UNCERTAIN' },
  });
  assert.deepEqual(effect.controller.snapshot(), effectBefore);
  assert.equal(
    effect.controller.adopt({
      operation: 'OPC-ART-DISPOSE',
      resourceIdentity: effect.artifactResource.resourceIdentity,
      mode: 'release-pin',
      certainty: 'confirmed-effect',
      head: digest('1'),
      witness: digest('2'),
      witnessAdvance: effect.controller.snapshot().authorizations[0].witnessAdvance,
    }).ok,
    true,
  );
  assert.equal(
    effect.controller.snapshot().pins.find((pin) => pin.resourceIdentity === effect.artifactResource.resourceIdentity)
      .status,
    'released',
  );
  assert.deepEqual(
    effect.controller.dispatch({
      resource: effect.artifactResource.resource,
      resourceIdentity: effect.artifactResource.resourceIdentity,
      operation: 'OPC-ART-DISPOSE',
      port: 'PORT-ARTIFACT',
      mode: 'release-pin',
    }),
    { ok: false, error: { family: 'FC-EFFECT', code: 'SEMANTIC_EFFECT_ALREADY_CONFIRMED' } },
  );

  const absence = prepare('confirmed-absence');
  assert.equal(absence.controller.reconcile(reconcileInput(absence.artifactResource)).ok, true);
  const absenceBefore = absence.controller.snapshot();
  assert.deepEqual(absence.controller.reconcile(reconcileInput(absence.artifactResource)), {
    ok: false,
    error: { family: 'FC-EFFECT', code: 'RETIREMENT_RECONCILIATION_NOT_UNCERTAIN' },
  });
  assert.deepEqual(absence.controller.snapshot(), absenceBefore);
  const absenceRestored = retirement.restoreRetirementController(absence.controller.snapshot(), {
    ...obligationOptions(),
    mechanism: absence.mechanism,
  });
  assert.equal(absenceRestored.ok, true, JSON.stringify(absenceRestored));
  assert.equal(
    absence.controller.reauthorize({
      resourceIdentity: absence.artifactResource.resourceIdentity,
      operation: 'OPC-ART-DISPOSE',
      mode: 'release-pin',
    }).ok,
    true,
  );
});

test('GF046-MC-07/08: uncertain effects cannot retry before absence plus reauthorization, and bounds do not reset', () => {
  const mechanism = script(true);
  const controller = retirement.createRetirementController({ ...obligationOptions(), mechanism });
  const planned = controller.plan(baseInput());
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const session = planned.value.resources.find((resource) => resource.kind === 'session');
  assert.ok(session);
  assert.equal(controller.recordPreservation(receipt(planned.value, session)).ok, true);
  assert.equal(
    controller.authorize({
      resource: session.resource,
      resourceIdentity: session.resourceIdentity,
      operation: 'OPC-SESSION-CLOSE',
      port: 'PORT-SESSION',
      mode: 'retire',
      holderTransition: holderTransition(session, 'OPC-SESSION-CLOSE'),
    }).ok,
    true,
  );
  assert.deepEqual(
    controller.dispatch({
      resource: session.resource,
      resourceIdentity: session.resourceIdentity,
      operation: 'OPC-SESSION-CLOSE',
      port: 'PORT-SESSION',
      mode: 'retire',
      fault: 'uncertain',
    }),
    {
      ok: false,
      error: { family: 'FC-EFFECT', code: 'RETIREMENT_EFFECT_UNCERTAIN' },
    },
  );
  assert.equal(controller.snapshot().obligations.length, 1);
  assert.equal(controller.snapshot().obligations[0].status, 'open');
  assert.deepEqual(
    controller.dispatch({
      resource: session.resource,
      resourceIdentity: session.resourceIdentity,
      operation: 'OPC-SESSION-CLOSE',
      port: 'PORT-SESSION',
      mode: 'retire',
    }),
    {
      ok: false,
      error: { family: 'FC-EFFECT', code: 'RECONCILIATION_REQUIRED' },
    },
  );
  mechanism.setLookupCertainty('confirmed-absence');
  assert.equal(
    controller.reconcile({
      operation: 'OPC-SESSION-CLOSE',
      resourceIdentity: session.resourceIdentity,
      mode: 'retire',
    }).ok,
    true,
  );
  assert.equal(
    controller.reauthorize({
      resourceIdentity: session.resourceIdentity,
      operation: 'OPC-SESSION-CLOSE',
      mode: 'retire',
    }).ok,
    true,
  );
  assert.equal(
    controller.dispatch({
      resource: session.resource,
      resourceIdentity: session.resourceIdentity,
      operation: 'OPC-SESSION-CLOSE',
      port: 'PORT-SESSION',
      mode: 'retire',
    }).ok,
    true,
  );
  assert.equal(mechanism.calls.length, 2);
  assert.deepEqual(controller.exhaust({ resourceIdentity: session.resourceIdentity, at: 1001 }), {
    ok: false,
    error: { family: 'FC-BOUND', code: 'BND_RETIRE_NOT_EXHAUSTED' },
  });
  assert.equal(controller.snapshot().plan.bound.startedAt, 1000);
  assert.equal(controller.snapshot().plan.bound.deadline, retirementDeadline);
});

test('GF046-MC-01/08: Stopped overlay is accepted without rewriting outcome, dependencies, or resource position', () => {
  const controller = retirement.createRetirementController(obligationOptions());
  const planned = controller.plan(baseInput({ storyState: 'Stopped', runPhase: 'Stopped' }));
  assert.equal(planned.ok, true, JSON.stringify(planned));
  assert.equal(planned.value.storyState, 'Stopped');
  assert.equal(planned.value.runPhase, 'Stopped');
  assert.equal(planned.value.baseline.outcome, 'Blocked');
  assert.deepEqual(planned.value.baseline.dependencyRelease, []);
  assert.equal(
    controller.failure({
      phase: 'retiring',
      resourceIdentity: planned.value.resources[0].resourceIdentity,
      reason: 'preservation unavailable',
      ownerActionAvailable: false,
    }).value.containment,
    'retain',
  );
  assert.equal(controller.snapshot().plan.storyState, 'Stopped');
  assert.equal(controller.snapshot().plan.baseline.outcome, 'Blocked');
  assert.equal(controller.snapshot().obligations.length, 1);
  assert.equal(controller.snapshot().obligations[0].status, 'open');
  assert.equal(controller.snapshot().obligations[0].deadline, retirementDeadline);
  assert.equal(
    controller.failure({
      phase: 'stopped',
      resourceIdentity: planned.value.resources[0].resourceIdentity,
      reason: 'preservation still unavailable',
      ownerActionAvailable: false,
    }).ok,
    true,
  );
  assert.equal(controller.snapshot().obligations.length, 1);
});

test('GF046-MC-09: hostile mechanism receipts are rejected and never adopted', () => {
  const controller = retirement.createRetirementController({
    ...obligationOptions(),
    mechanism: {
      invoke() {
        return { ok: true, value: { head: 'https://provider.invalid/head', witness: digest('2') } };
      },
    },
  });
  const planned = controller.plan(baseInput());
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const session = planned.value.resources.find((resource) => resource.kind === 'session');
  assert.ok(session);
  assert.equal(controller.recordPreservation(receipt(planned.value, session)).ok, true);
  assert.equal(
    controller.authorize({
      resource: session.resource,
      resourceIdentity: session.resourceIdentity,
      operation: 'OPC-SESSION-CLOSE',
      port: 'PORT-SESSION',
      mode: 'retire',
      holderTransition: holderTransition(session, 'OPC-SESSION-CLOSE'),
    }).ok,
    true,
  );
  assert.deepEqual(
    controller.dispatch({
      resource: session.resource,
      resourceIdentity: session.resourceIdentity,
      operation: 'OPC-SESSION-CLOSE',
      port: 'PORT-SESSION',
      mode: 'retire',
    }),
    {
      ok: false,
      error: { family: 'FC-MECHANISM', code: 'INVALID_ADAPTER_RECEIPT' },
    },
  );
  assert.equal(controller.snapshot().authorizations[0].status, 'committed');
});

test('GF046-MC-07/08/09: trust faults fence, preterminal evidence faults park/block, and restore replays without effects', () => {
  const controller = retirement.createRetirementController({});
  const planned = controller.plan(baseInput());
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const workspace = planned.value.resources.find((resource) => resource.kind === 'workspace');
  assert.ok(workspace);
  assert.deepEqual(
    controller.failure({
      phase: 'preterminal',
      resourceIdentity: workspace.resourceIdentity,
      reason: 'receipt missing',
      ownerActionAvailable: true,
    }),
    { ok: true, value: { containment: 'park', failure: 'FC-EVIDENCE' } },
  );
  assert.deepEqual(
    controller.failure({
      phase: 'preterminal',
      resourceIdentity: workspace.resourceIdentity,
      reason: 'receipt missing',
      ownerActionAvailable: false,
    }),
    { ok: true, value: { containment: 'block', failure: 'FC-EVIDENCE' } },
  );
  assert.deepEqual(
    controller.failure({
      phase: 'retiring',
      resourceIdentity: workspace.resourceIdentity,
      reason: 'ordinary missing receipt',
      ownerActionAvailable: false,
      trustCompromise: true,
    }),
    { ok: false, error: { family: 'FC-INPUT', code: 'INVALID_RETIREMENT_FAILURE' } },
  );
  assert.deepEqual(
    controller.failure({
      phase: 'retiring',
      resourceIdentity: workspace.resourceIdentity,
      reason: 'witness fork',
      ownerActionAvailable: false,
      trustEvidence: trustEvidence(planned.value, workspace),
    }),
    { ok: false, error: { family: 'FC-TRUST', code: 'RETIREMENT_TRUST_COMPROMISED' } },
  );
  assert.equal(controller.snapshot().dispatchFenced, true);
  const restored = retirement.restoreRetirementController(controller.snapshot(), {});
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.snapshot(), controller.snapshot());
  const tampered = controller.snapshot();
  const tamperedJournal = [...tampered.journal, { kind: 'forged-dispose-bytes' }];
  assert.deepEqual(retirement.restoreRetirementController({ ...tampered, journal: tamperedJournal }), {
    ok: false,
    error: { family: 'FC-TRUST', code: 'RETIREMENT_SNAPSHOT_INVALID' },
  });
});

test('GF046-MC-08: exhaustion opens one exact residual obligation without changing Retiring position', () => {
  const controller = retirement.createRetirementController(obligationOptions());
  const planned = controller.plan(baseInput());
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const first = controller.exhaust({
    resourceIdentity: planned.value.resources[0].resourceIdentity,
    at: retirementDeadline,
  });
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(first.value.status, 'open');
  assert.equal(controller.snapshot().obligations.length, 1);
  assert.equal(first.value.duty, 'retirement');
  assert.equal(first.value.resource, planned.value.resources[0].resource);
  assert.equal(first.value.startedAt, 1000);
  assert.equal(first.value.deadline, retirementDeadline);
  assert.equal('resourceIdentity' in first.value, false);
  assert.deepEqual(
    controller.exhaust({ resourceIdentity: planned.value.resources[0].resourceIdentity, at: retirementDeadline + 1 }),
    first,
  );
  const restored = retirement.restoreRetirementController(controller.snapshot(), obligationOptions());
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.snapshot(), controller.snapshot());
  assert.equal(controller.snapshot().plan.storyState, 'Retiring');
  assert.equal(controller.snapshot().plan.runPhase, 'Active');
});

test('GF046-MC-08: residual-obligation origins are resource-kind stable and accept legacy index facts', () => {
  const expectedOrigin = new Map([
    ['session', `${run}/event/2`],
    ['workspace', `${run}/event/3`],
    ['review-ref', `${run}/event/4`],
    ['review-request', `${run}/event/5`],
    ['review-status', `${run}/event/6`],
    ['review-comment', `${run}/event/7`],
    ['artifact', `${run}/event/8`],
  ]);
  const reversedResources = Object.freeze([...baseInput().resources].reverse());
  for (const [kind, origin] of expectedOrigin) {
    const controller = retirement.createRetirementController(obligationOptions());
    const planned = controller.plan(baseInput({ resources: reversedResources }));
    assert.equal(planned.ok, true, JSON.stringify(planned));
    const resource = planned.value.resources.find((candidate) => candidate.kind === kind);
    assert.ok(resource);
    const failed = controller.failure({
      phase: 'retiring',
      resourceIdentity: resource.resourceIdentity,
      reason: `preservation unavailable for ${kind}`,
      ownerActionAvailable: false,
    });
    assert.equal(failed.ok, true, JSON.stringify(failed));
    assert.equal(controller.snapshot().obligations[0].origin, origin);
  }

  const controller = retirement.createRetirementController(obligationOptions());
  const planned = controller.plan(baseInput({ resources: reversedResources }));
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const session = planned.value.resources.find((resource) => resource.kind === 'session');
  assert.ok(session);
  assert.equal(
    controller.failure({
      phase: 'retiring',
      resourceIdentity: session.resourceIdentity,
      reason: 'legacy durable index origin',
      ownerActionAvailable: false,
    }).ok,
    true,
  );
  const snapshot = controller.snapshot();
  const legacyObligation = { ...snapshot.obligations[0], origin: `${run}/event/8` };
  const legacyJournal = snapshot.journal.map((entry) =>
    entry.kind === 'obligation' ? { ...entry, obligation: legacyObligation } : entry,
  );
  const stagedJournal = stageDigest({ domain: 'GF046-RETIREMENT-JOURNAL', excludePaths: [], value: legacyJournal });
  assert.equal(stagedJournal.ok, true, JSON.stringify(stagedJournal));
  const restored = retirement.restoreRetirementController(
    {
      ...snapshot,
      obligations: [legacyObligation],
      journal: legacyJournal,
      journalDigest: stagedJournal.value.digest,
    },
    obligationOptions(),
  );
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.equal(restored.value.snapshot().obligations[0].origin, `${run}/event/8`);
});

test('GF038 integration: exact allocation carrier admits, replays, and rejects substituted duties', () => {
  const resource = inventory('session').resource;
  const exactInput = {
    run,
    generation,
    resource,
    duty: 'retirement',
    origin: `${run}/event/2`,
    reason: 'preservation-safe retirement duty failed after bounded attempts',
    preservationEvidence: { key: obligationEvidence.key },
    accountableOwner: 'principal/arye',
    criteria: { subject: obligationEvidence.subject, claim: obligationEvidence.claim },
    startedAt: 1000,
    deadline: retirementDeadline,
    policyDigest: digest('a'),
  };
  assert.deepEqual(Object.keys(exactInput).sort(), [
    'accountableOwner',
    'criteria',
    'deadline',
    'duty',
    'generation',
    'origin',
    'policyDigest',
    'preservationEvidence',
    'reason',
    'resource',
    'run',
    'startedAt',
  ]);
  const dependencies = {
    ledger: ledgerRuntime.createScriptedLedger(),
    evidence: admittedEvidence.authority,
  };
  const firstController = obligation.createScriptedObligationController({ dependencies });
  const reconciled = admittedEvidence.authority.reconcile(obligationEvidence.key);
  assert.equal(reconciled.ok, true, JSON.stringify(reconciled));
  assert.deepEqual(
    { subject: reconciled.value.manifest.subject, claim: reconciled.value.manifest.claim },
    { subject: obligationEvidence.subject, claim: obligationEvidence.claim },
  );
  const first = firstController.openAllocated(exactInput);
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(first.value.resource, resource);
  assert.equal(first.value.startedAt, 1000);
  assert.equal(first.value.deadline, retirementDeadline);
  assert.equal('resourceIdentity' in first.value, false);
  assert.deepEqual(firstController.openAllocated(exactInput), first);
  assert.equal(firstController.snapshot().obligations.length, 1);
  const restored = obligation.restoreScriptedObligationController(firstController.snapshot(), dependencies);
  assert.equal(restored.ok, true, JSON.stringify(restored));
  assert.deepEqual(restored.value.openAllocated(exactInput), first);

  const extraField = obligationOptions().obligation.openAllocated({ ...exactInput, resourceIdentity: `${resource}/1` });
  assert.deepEqual(extraField, {
    ok: false,
    error: { family: 'FC-INPUT', code: 'INVALID_OBLIGATION_ALLOCATION_INPUT' },
  });
  const crossRun = obligationOptions().obligation.openAllocated({
    ...exactInput,
    run: 'run-000000000047-0123456789abcdef',
  });
  assert.deepEqual(crossRun, {
    ok: false,
    error: { family: 'FC-SUBJECT', code: 'INVALID_OBLIGATION_ALLOCATION_SCOPE' },
  });
  const crossGeneration = obligationOptions().obligation.openAllocated({
    ...exactInput,
    generation: 'run-000000000047-0123456789abcdef/gen/2|foreign',
  });
  assert.deepEqual(crossGeneration, {
    ok: false,
    error: { family: 'FC-SUBJECT', code: 'INVALID_OBLIGATION_ALLOCATION_SCOPE' },
  });
  const malformedCriteria = obligationOptions().obligation.openAllocated({
    ...exactInput,
    criteria: { subject: 'not-an-evidence-subject', claim: obligationEvidence.claim },
  });
  assert.deepEqual(malformedCriteria, {
    ok: false,
    error: { family: 'FC-INPUT', code: 'INVALID_OBLIGATION_ALLOCATION_INPUT' },
  });
  const unadmittedEvidence = obligationOptions().obligation.openAllocated({
    ...exactInput,
    preservationEvidence: { key: digest('a') },
  });
  assert.deepEqual(unadmittedEvidence, {
    ok: false,
    error: { family: 'FC-INPUT', code: 'INVALID_OBLIGATION_ALLOCATION_INPUT' },
  });
  const staleBound = obligationOptions().obligation.openAllocated({ ...exactInput, deadline: 1001 });
  assert.deepEqual(staleBound, {
    ok: false,
    error: { family: 'FC-INPUT', code: 'INVALID_OBLIGATION_ALLOCATION_INPUT' },
  });
});
