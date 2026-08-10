import assert from 'node:assert/strict';
import test from 'node:test';

const retirement = await import('../dist/retirement.js');

const digest = (character) => character.repeat(64);
const run = 'run-000000000046-0123456789abcdef';
const story = `${run}/story/gf046`;
const generation = `${run}/gen/1|controller`;
const transition = `${run}/txn/1/${digest('a')}`;
const fence = Object.freeze({
  generation,
  authority: `${run}/auth/1`,
  basis: digest('b'),
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
    deadline: 1000 + 3,
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
  transaction: transition + '/holder/' + resource.resourceIdentity,
  event: run + '/event/holder-retirement/' + resource.kind,
  position: 2,
  fence,
  resource: resource.resource,
  resourceIdentity: resource.resourceIdentity,
  operation,
  committed: true,
});

const obligationAllocator = () => ({
  openAllocated(input) {
    return {
      ok: true,
      value: {
        ...input,
        id: input.resourceIdentity + '/obligation/1',
        status: 'open',
      },
    };
  },
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
  witness: resource.witness,
  transition: plan.transition,
  ...overrides,
});

const script = (witnessAdvanced = false) => {
  const calls = [];
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
        }),
      };
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

test('GF046-MC-01/05: every holder family requires its own preservation receipt before retirement or release-pin', () => {
  const controller = retirement.createRetirementController({ obligation: obligationAllocator() });
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
  const controller = retirement.createRetirementController({ obligation: obligationAllocator() });
  const planned = controller.plan(baseInput());
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const workspace = planned.value.resources.find((resource) => resource.kind === 'workspace');
  assert.ok(workspace);
  assert.deepEqual(controller.recordPreservation(receipt(planned.value, workspace, { readbackDigest: digest('0') })), {
    ok: false,
    error: { family: 'FC-EVIDENCE', code: 'PRESERVATION_READBACK_MISMATCH' },
  });
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
  const controller = retirement.createRetirementController({ mechanism, obligation: obligationAllocator() });
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
  const controller = retirement.createRetirementController({ mechanism, obligation: obligationAllocator() });
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
  const controller = retirement.createRetirementController({ mechanism, obligation: obligationAllocator() });
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
  assert.equal(
    controller.reconcile({
      operation: 'OPC-ART-DISPOSE',
      resourceIdentity: artifactResource.resourceIdentity,
      mode: 'release-pin',
      certainty: 'confirmed-absence',
    }).ok,
    true,
  );
  assert.equal(
    controller.reauthorize({
      resourceIdentity: artifactResource.resourceIdentity,
      operation: 'OPC-ART-DISPOSE',
      mode: 'release-pin',
    }).ok,
    true,
  );
  assert.equal(
    controller.dispatch({
      operation: 'OPC-ART-DISPOSE',
      resourceIdentity: artifactResource.resourceIdentity,
      resource: artifactResource.resource,
      port: 'PORT-ARTIFACT',
      mode: 'release-pin',
    }).ok,
    true,
  );
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
    controller.snapshot().pins.find((pin) => pin.resourceIdentity === artifactResource.resourceIdentity).status,
    'held',
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

test('GF046-MC-07/08: uncertain effects cannot retry before absence plus reauthorization, and bounds do not reset', () => {
  const mechanism = script(true);
  const controller = retirement.createRetirementController({ mechanism, obligation: obligationAllocator() });
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
  assert.equal(
    controller.reconcile({
      operation: 'OPC-SESSION-CLOSE',
      resourceIdentity: session.resourceIdentity,
      mode: 'retire',
      certainty: 'confirmed-absence',
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
  assert.equal(mechanism.calls.length, 1);
  assert.deepEqual(controller.exhaust({ resourceIdentity: session.resourceIdentity, at: 1001 }), {
    ok: false,
    error: { family: 'FC-BOUND', code: 'BND_RETIRE_NOT_EXHAUSTED' },
  });
  assert.equal(controller.snapshot().plan.bound.startedAt, 1000);
  assert.equal(controller.snapshot().plan.bound.deadline, 1003);
});

test('GF046-MC-01/08: Stopped overlay is accepted without rewriting outcome, dependencies, or resource position', () => {
  const controller = retirement.createRetirementController({ obligation: obligationAllocator() });
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
  assert.equal(controller.snapshot().obligations[0].deadline, 1003);
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
    obligation: obligationAllocator(),
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
  const opened = [];
  const controller = retirement.createRetirementController({
    obligation: {
      openAllocated(input) {
        opened.push(input);
        return { ok: true, value: Object.freeze({ id: `${run}/obligation/1`, status: 'open', ...input }) };
      },
    },
  });
  const planned = controller.plan(baseInput());
  assert.equal(planned.ok, true, JSON.stringify(planned));
  const first = controller.exhaust({ resourceIdentity: planned.value.resources[0].resourceIdentity, at: 2000 });
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(first.value.status, 'open');
  assert.equal(opened.length, 1);
  assert.equal(opened[0].duty, 'retirement');
  assert.equal(opened[0].startedAt, 1000);
  assert.equal(opened[0].deadline, 1003);
  assert.deepEqual(
    controller.exhaust({ resourceIdentity: planned.value.resources[0].resourceIdentity, at: 3000 }),
    first,
  );
  assert.equal(controller.snapshot().plan.storyState, 'Retiring');
  assert.equal(controller.snapshot().plan.runPhase, 'Active');
});
