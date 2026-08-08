import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const workspace = await import('../dist/workspace.js');
const oracle = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/workspace-contract-oracle.json'), 'utf8'),
);
const faultCorpus = JSON.parse(
  readFileSync(resolve(import.meta.dirname, './fixtures/workspace-fault-corpus.json'), 'utf8'),
);

const digest = (character) => character.repeat(64);
const operationOrdinals = new Map();
const operationId = (label) => {
  if (label.startsWith('run-')) return label;
  const ordinal = operationOrdinals.get(label) ?? operationOrdinals.size + 1;
  operationOrdinals.set(label, ordinal);
  return `${oracle.run}/txn/${ordinal}/${oracle.run}/gen/2|controller-token-1|${digest('a')}/op/${ordinal}`;
};
const binding = (operation, operationType, overrides = {}) =>
  Object.freeze({
    operation: operationId(operation),
    operationType,
    subject: Object.freeze({ run: oracle.run, story: oracle.story, basis: oracle.basis }),
    repository: 'repository/scripted',
    path: '/workspace/scripted',
    basis: oracle.basis,
    recipeDigest: oracle.recipeDigest,
    inputFingerprintDigest: oracle.inputFingerprintDigest,
    host: 'host/scripted',
    manifest: oracle.manifest,
    ...overrides,
  });

const controller = (fixture = workspace.createScriptedWorkspaceFixture()) => {
  const transition = workspace.createWorkspaceTransitionRecorder();
  return { transition, fixture, controller: workspace.createWorkspaceController({ transition, fixture }) };
};

test('workspace contract: exact five-operation route is witnessed before scripted dispatch and remains unavailable as a provider', () => {
  const events = [];
  const fixture = workspace.createScriptedWorkspaceFixture();
  const baseTransition = workspace.createWorkspaceTransitionRecorder();
  const transition = Object.freeze({
    recordIntent: (intent) => {
      events.push(`intent:${intent.operation}`);
      return baseTransition.recordIntent(intent);
    },
  });
  const observedFixture = Object.freeze({
    ...fixture,
    dispatch: (input) => {
      events.push(`dispatch:${input.operation}`);
      return fixture.dispatch(input);
    },
  });
  const state = {
    transition: baseTransition,
    fixture: observedFixture,
    controller: workspace.createWorkspaceController({ transition, fixture: observedFixture }),
  };
  const operations = ['OPC-WS-PROVISION', 'OPC-WS-SETUP', 'OPC-WS-OBSERVE', 'OPC-WS-PRESERVE'];
  assert.deepEqual(state.fixture.reachability(), {
    providerEnabled: false,
    dispatchEnabled: false,
    status: 'unavailable',
  });
  assert.equal(state.controller.provision({ binding: binding('op-provision', 'OPC-WS-PROVISION') }).ok, true);
  const setup = state.controller.setup({ binding: binding('op-setup', 'OPC-WS-SETUP'), receipt: null });
  assert.equal(setup.ok, true);
  assert.equal(state.controller.observe({ binding: binding('op-observe', 'OPC-WS-OBSERVE') }).ok, true);
  assert.equal(state.controller.preserve({ binding: binding('op-preserve', 'OPC-WS-PRESERVE') }).ok, true);
  assert.deepEqual(
    state.transition.intents().map((intent) => intent.operationType),
    operations,
  );
  assert.deepEqual(
    state.fixture.invocations().map((entry) => entry.operationType),
    ['OPC-WS-PROVISION', 'OPC-WS-SETUP', 'OPC-WS-OBSERVE', 'OPC-WS-PRESERVE'],
  );
  assert.deepEqual(
    events.map((event) => event.split(':', 1)[0]),
    ['intent', 'dispatch', 'intent', 'dispatch', 'intent', 'dispatch', 'intent', 'dispatch'],
  );
  assert.equal(
    state.controller.facts().every((fact) => fact.proof.kind === 'committed-witnessed'),
    true,
  );
});

test('workspace contract: returned cross-repository/path/basis/recipe/host/manifest/operation bindings and secret inputs fail closed', () => {
  const cases = [
    ['repository', { repository: 'repository/other' }],
    ['path', { path: '/workspace/other' }],
    ['basis', { basis: digest('a'), subject: { run: oracle.run, story: oracle.story, basis: digest('a') } }],
    ['recipe', { recipeDigest: digest('b') }],
    ['host', { host: 'host/other' }],
    ['manifest', { manifest: `provider/${digest('c')}/authority/${digest('d')}` }],
    ['operation', { operation: 'op-other' }],
  ];
  for (const [label, overrides] of cases) {
    const base = workspace.createScriptedWorkspaceFixture();
    const fixture = Object.freeze({
      ...base,
      dispatch: (input) => {
        const result = base.dispatch(input);
        return result.ok
          ? { ok: true, value: Object.freeze({ ...result.value, binding: { ...result.value.binding, ...overrides } }) }
          : result;
      },
    });
    const state = controller(fixture);
    const candidate = binding(`op-${label}`, 'OPC-WS-OBSERVE');
    const result = state.controller.observe({ binding: candidate });
    assert.equal(result.ok, false, label);
    assert.equal(state.controller.facts().length, 0, label);
  }
  const secretState = controller();
  assert.equal(
    secretState.controller.observe({
      binding: binding('op-secret', 'OPC-WS-OBSERVE', { path: '/workspace/token-value' }),
    }).ok,
    false,
  );
  const state = controller();
  assert.deepEqual(
    state.controller.observe({
      binding: { ...binding('op-hostile', 'OPC-WS-OBSERVE'), operationType: 'OPC-WS-RETIRE' },
    }),
    {
      ok: false,
      error: { family: 'FC-SUBJECT', code: 'OPERATION_BINDING_MISMATCH' },
    },
  );
});

test('workspace contract: exact fresh setup receipt is a no-op and stale receipt authorizes once under frozen inputs', () => {
  const first = controller();
  const initial = first.controller.setup({ binding: binding('op-setup-fresh', 'OPC-WS-SETUP'), receipt: null });
  assert.equal(initial.ok, true);
  assert.equal(initial.value.kind, 'setup-fact');
  const receipt = initial.value.setupReceipt;
  assert.notEqual(receipt, null);
  const fresh = first.controller.setup({ binding: binding('op-setup-fresh', 'OPC-WS-SETUP'), receipt });
  assert.deepEqual(fresh, { ok: true, value: { status: 'no-op' } });
  assert.equal(first.transition.intents().length, 1);

  const staleBinding = binding('op-setup-stale', 'OPC-WS-SETUP');
  const staleTransaction = staleBinding.operation.slice(0, staleBinding.operation.lastIndexOf('/op/'));
  const staleReceipt = Object.freeze({
    ...receipt,
    operation: staleBinding.operation,
    binding: staleBinding,
    proof: Object.freeze({
      ...receipt.proof,
      event: `${oracle.run}/event/1`,
      transaction: staleTransaction,
      operation: staleBinding.operation,
    }),
    freshnessFingerprint: digest('e'),
  });
  const stale = first.controller.setup({ binding: staleBinding, receipt: staleReceipt });
  assert.equal(stale.ok, true);
  assert.equal(first.transition.intents().length, 2);
  assert.deepEqual(first.controller.setup({ binding: staleBinding, receipt: staleReceipt }), {
    ok: false,
    error: { family: 'FC-EFFECT', code: 'DUPLICATE_SETUP_INTENT' },
  });
  const wrong = first.controller.setup({
    binding: staleBinding,
    receipt: { ...staleReceipt, binding: binding('op-wrong', 'OPC-WS-SETUP') },
  });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.error.family, 'FC-FENCE');
});

test('workspace contract: dirty and ambiguous observations fail closed without writing facts', () => {
  for (const cleanliness of ['dirty', 'ambiguous']) {
    const base = workspace.createScriptedWorkspaceFixture();
    const fixture = Object.freeze({
      ...base,
      dispatch: (input) => {
        const result = base.dispatch(input);
        return result.ok ? { ok: true, value: Object.freeze({ ...result.value, cleanliness }) } : result;
      },
    });
    const state = controller(fixture);
    const result = state.controller.observe({ binding: binding(`op-${cleanliness}`, 'OPC-WS-OBSERVE') });
    assert.deepEqual(result, {
      ok: false,
      error: {
        family: 'FC-SUBJECT',
        code: cleanliness === 'dirty' ? 'WORKSPACE_DIRTY' : 'WORKSPACE_CLEANLINESS_AMBIGUOUS',
      },
    });
    assert.equal(state.controller.facts().length, 0);
  }
});

test('workspace contract: lost, uncertain, duplicate, and crash effects reconcile by stable operation or remain contained', () => {
  for (const fault of faultCorpus.faults) {
    const state = controller();
    const operation = `op-${fault}`;
    const candidate = binding(operation, 'OPC-WS-PROVISION');
    if (fault === 'duplicate') {
      assert.equal(state.controller.provision({ binding: candidate }).ok, true);
      assert.equal(state.controller.provision({ binding: candidate }).ok, false);
      continue;
    }
    const result = state.controller.provision({ binding: candidate, fault });
    assert.equal(result.ok, false, fault);
    assert.equal(state.controller.facts().length, 0, fault);
    assert.deepEqual(
      state.controller.reconcile({
        operation: candidate.operation,
        binding: { ...candidate, path: '/workspace/other' },
      }),
      {
        ok: false,
        error: { family: 'FC-FENCE', code: 'LOOKUP_BINDING_MISMATCH' },
      },
    );
    const reconciled = state.controller.reconcile({ operation: candidate.operation, binding: candidate });
    assert.equal(reconciled.ok, true, fault);
  }
});

test('workspace contract: preservation precedes retire and retire has no real destructive reachability', () => {
  const state = controller();
  const retireBinding = binding('op-retire', 'OPC-WS-RETIRE');
  assert.deepEqual(state.controller.retire({ binding: retireBinding }), {
    ok: false,
    error: { family: 'FC-AUTHORITY', code: 'PRESERVATION_REQUIRED' },
  });
  assert.equal(state.fixture.invocations().length, 0);
  const preserveBinding = binding('op-preserve', 'OPC-WS-PRESERVE');
  assert.equal(state.controller.preserve({ binding: preserveBinding }).ok, true);
  assert.deepEqual(state.controller.retire({ binding: retireBinding }), {
    ok: false,
    error: { family: 'FC-AUTHORITY', code: 'REAL_RETIRE_DISABLED' },
  });
  assert.deepEqual(
    state.fixture.invocations().map((entry) => entry.operationType),
    ['OPC-WS-PRESERVE', 'OPC-WS-RETIRE'],
  );
  assert.equal(
    state.controller.facts().some((fact) => fact.operationType === 'OPC-WS-RETIRE'),
    false,
  );
});

test('workspace contract: hostile adapter output and duplicate dispatch cannot widen authority', () => {
  const base = workspace.createScriptedWorkspaceFixture();
  const fixture = Object.freeze({
    ...base,
    dispatch: (input) => {
      const result = base.dispatch(input);
      return result.ok
        ? {
            ok: true,
            value: Object.freeze({
              ...result.value,
              binding: { ...result.value.binding, repository: 'repository/other' },
            }),
          }
        : result;
    },
  });
  const state = controller(fixture);
  const result = state.controller.observe({ binding: binding('op-hostile-output', 'OPC-WS-OBSERVE') });
  assert.deepEqual(result, { ok: false, error: { family: 'FC-MECHANISM', code: 'INVALID_WORKSPACE_ATTESTATION' } });
  assert.equal(state.controller.facts().length, 0);

  const forgedPreservationBase = workspace.createScriptedWorkspaceFixture();
  const forgedPreservationFixture = Object.freeze({
    ...forgedPreservationBase,
    dispatch: (input) => {
      const dispatched = forgedPreservationBase.dispatch(input);
      return dispatched.ok ? { ok: true, value: Object.freeze({ ...dispatched.value, preserved: true }) } : dispatched;
    },
  });
  const forgedPreservationState = controller(forgedPreservationFixture);
  assert.deepEqual(
    forgedPreservationState.controller.observe({ binding: binding('op-forged-preserve', 'OPC-WS-OBSERVE') }),
    { ok: false, error: { family: 'FC-FENCE', code: 'PRESERVATION_FACT_OPERATION_MISMATCH' } },
  );
  assert.deepEqual(
    forgedPreservationState.controller.retire({ binding: binding('op-forged-retire', 'OPC-WS-RETIRE') }),
    { ok: false, error: { family: 'FC-AUTHORITY', code: 'PRESERVATION_REQUIRED' } },
  );

  const hostileReceiptBase = workspace.createScriptedWorkspaceFixture();
  const hostileReceiptFixture = Object.freeze({
    ...hostileReceiptBase,
    dispatch: (input) => {
      const dispatched = hostileReceiptBase.dispatch(input);
      if (!dispatched.ok || dispatched.value.setupReceipt === null) return dispatched;
      return {
        ok: true,
        value: Object.freeze({
          ...dispatched.value,
          setupReceipt: Object.freeze({ ...dispatched.value.setupReceipt, recipeDigest: digest('f') }),
        }),
      };
    },
  });
  const hostileReceiptState = controller(hostileReceiptFixture);
  assert.deepEqual(
    hostileReceiptState.controller.setup({ binding: binding('op-hostile-receipt', 'OPC-WS-SETUP'), receipt: null }),
    { ok: false, error: { family: 'FC-FENCE', code: 'SETUP_RECEIPT_BINDING_MISMATCH' } },
  );

  const direct = workspace.createScriptedWorkspaceFixture();
  const directBinding = binding('op-direct', 'OPC-WS-OBSERVE');
  const directTransaction = directBinding.operation.slice(0, directBinding.operation.lastIndexOf('/op/'));
  const proof = {
    kind: 'committed-witnessed',
    position: 0,
    event: `${oracle.run}/event/1`,
    transaction: directTransaction,
    operation: directBinding.operation,
    recordDigest: digest('f'),
    witnessDigest: digest('f'),
  };
  const request = {
    operation: directBinding.operation,
    operationType: directBinding.operationType,
    binding: directBinding,
    proof,
  };
  assert.equal(direct.dispatch(request).ok, true);
  assert.deepEqual(direct.dispatch(request), {
    ok: false,
    error: { family: 'FC-EFFECT', code: 'DUPLICATE_WORKSPACE_OPERATION' },
  });
});
