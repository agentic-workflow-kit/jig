import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const runtime = await import('../dist/index.js');
const codec = await import('@agentic-workflow-kit/jig-codec');
const oracle = JSON.parse(readFileSync(resolve(import.meta.dirname, './fixtures/source-contract-oracle.json'), 'utf8'));
const hostile = JSON.parse(readFileSync(resolve(import.meta.dirname, './fixtures/hostile-source-corpus.json'), 'utf8'));
const syntheticDigest = (character) => character.repeat(64);

const requestInput = () => structuredClone(oracle.request);
const candidateInput = () => structuredClone(oracle.candidate);
const requestFrame = () => {
  const encoded = runtime.encodeSourceRequest(requestInput());
  assert.equal(encoded.ok, true);
  return encoded.value;
};
const candidateFrame = (request = requestFrame(), input = candidateInput()) => {
  const encoded = runtime.encodeSourceCandidate(request, input);
  assert.equal(encoded.ok, true);
  return encoded.value;
};

test('source contract: canonical request identity and exchange bindings are stable under permutation', () => {
  const one = runtime.encodeSourceRequest(requestInput());
  const two = runtime.encodeSourceRequest(Object.fromEntries(Object.entries(requestInput()).reverse()));
  assert.equal(one.ok, true);
  assert.deepEqual(two, one);
  const request = runtime.decodeSourceRequest(one.value);
  assert.equal(request.ok, true);
  assert.match(request.value.requestId, /^source\/[0-9a-f]{64}\/request\/[0-9a-f]{64}$/);

  const result = runtime.validateSourceExchange(one.value, candidateFrame(one.value));
  assert.equal(result.ok, true);
  assert.equal(result.value.requestId, request.value.requestId);
  assert.equal(result.value.requestBasisDigest, request.value.requestBasisDigest);
  assert.equal(result.value.retry.ordinal, request.value.retry.ordinal);
  assert.equal(result.value.retry.limit, request.value.retry.limit);
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.plan), true);
  assert.match(result.value.contentDigest, /^[0-9a-f]{64}$/);
  assert.match(result.value.exchangeDigest, /^[0-9a-f]{64}$/);
});

test('source contract: plan validation preserves the design-owned one-track hard input', () => {
  const request = requestFrame();
  assert.equal(runtime.validateSourceExchange(request, candidateFrame(request)).ok, true);
  const invalid = [
    [
      'cycle',
      (plan) => {
        plan.stories[0].dependsOn = [plan.stories[1].key];
      },
    ],
    [
      'dangling',
      (plan) => {
        plan.stories[0].dependsOn = ['missing'];
      },
    ],
    [
      'malformed-done',
      (plan) => {
        plan.stories[0].done = { kind: 'unknown', checkClasses: [] };
      },
    ],
    [
      'unfrozen-check',
      (plan) => {
        plan.stories[0].done.checkClasses = ['check/unknown'];
      },
    ],
    [
      'missing-requirements',
      (plan) => {
        plan.stories[0].requirements = [];
      },
    ],
    [
      'missing-acceptance',
      (plan) => {
        plan.stories[0].acceptanceCriteria = [];
      },
    ],
    [
      'reserve',
      (plan) => {
        plan.policy.reserves.cpu = plan.policy.capacities.cpu;
      },
    ],
    [
      'demand',
      (plan) => {
        plan.stories[0].demand.cpu = 0;
      },
    ],
    [
      'feasibility',
      (plan) => {
        plan.stories[0].demand.cpu = plan.policy.capacities.cpu;
      },
    ],
    [
      'cross-track',
      (plan) => {
        plan.stories[0].track = 'track/other';
      },
    ],
  ];
  for (const [name, mutate] of invalid) {
    const input = candidateInput();
    mutate(input.plan);
    const result = runtime.encodeSourceCandidate(request, input);
    assert.equal(result.ok, false, name);
    assert.equal(result.error.family, 'FC-INPUT', name);
  }
});

test('source contract: bounded scripted recovery returns the same candidate or typed unavailable', () => {
  const request = requestFrame();
  const candidate = candidateFrame(request);
  const provider = runtime.createScriptedWorkSource(candidate);
  assert.equal(provider.ok, true);
  const delivered = provider.value.exchange(request, { kind: 'return', observedAt: oracle.request.deadline - 1 });
  assert.equal(delivered.ok, true);
  const lost = provider.value.exchange(request, { kind: 'lost-result', observedAt: oracle.request.deadline - 1 });
  assert.equal(lost.ok, false);
  assert.equal(lost.error.family, 'FC-MECHANISM');
  assert.equal(lost.error.code, 'RESULT_UNAVAILABLE');
  assert.equal(typeof lost.error.retryRecord, 'object');
  const replay = provider.value.recover(request, oracle.request.deadline - 1);
  assert.deepEqual(replay, delivered);
  const crashed = provider.value.exchange(request, { kind: 'crash', observedAt: oracle.request.deadline - 1 });
  assert.equal(crashed.ok, false);
  assert.equal(crashed.error.family, 'FC-MECHANISM');
  assert.equal(crashed.error.code, 'RESULT_UNAVAILABLE');
  assert.equal(typeof crashed.error.retryRecord, 'object');
  assert.deepEqual(provider.value.recover(request, oracle.request.deadline - 1), delivered);
  const expired = provider.value.exchange(request, { kind: 'return', observedAt: oracle.request.deadline });
  assert.equal(expired.ok, false);
  assert.equal(expired.error.family, 'FC-BOUND');
  assert.equal(expired.error.code, 'BND_WAIT_MECHANISM_EXHAUSTED');
  assert.equal(typeof expired.error.retryRecord, 'object');

  const exhausted = requestInput();
  exhausted.retry.ordinal = exhausted.retry.limit;
  assert.deepEqual(runtime.encodeSourceRequest(exhausted), {
    ok: false,
    error: { family: 'FC-INPUT', code: 'RETRY_RECEIPT_REQUIRED' },
  });
});

test('source contract: changed content is a distinct candidate and invalid bindings cannot replace it', () => {
  const request = requestFrame();
  const first = runtime.validateSourceExchange(request, candidateFrame(request));
  assert.equal(first.ok, true);
  const changed = candidateInput();
  changed.content.title = 'Changed candidate';
  changed.revision = 'rev-2';
  const second = runtime.validateSourceExchange(request, candidateFrame(request, changed));
  assert.equal(second.ok, true);
  assert.notEqual(second.value.contentDigest, first.value.contentDigest);
  assert.notEqual(second.value.exchangeDigest, first.value.exchangeDigest);

  const decoded = codec.decodeFrame(candidateFrame(request));
  assert.equal(decoded.ok, true);
  const tampered = codec.encodeFrame({
    ...decoded.value,
    requestId: `source/${'0'.repeat(64)}/request/${'1'.repeat(64)}`,
  });
  assert.equal(tampered.ok, true);
  assert.deepEqual(runtime.validateSourceExchange(request, tampered.value), {
    ok: false,
    error: { family: 'FC-SUBJECT', code: 'REQUEST_BINDING_MISMATCH' },
  });
});

test('source contract: hostile inputs fail closed without candidate disclosure or authority widening', () => {
  for (const bytes of hostile.frames) {
    const input = new TextEncoder().encode(bytes);
    const result = runtime.decodeSourceRequest(input);
    assert.equal(result.ok, false);
    assert.equal(result.error.family, 'FC-INPUT');
    assert.equal(JSON.stringify(result).includes('candidate'), false);
  }
  for (const bytes of [new Uint8Array(65_537), new TextEncoder().encode(`{"payload":{"basis":${'['.repeat(33)}`)]) {
    const result = runtime.decodeSourceRequest(bytes);
    assert.equal(result.ok, false);
    assert.equal(result.error.family, 'FC-INPUT');
  }
  let getterCalled = false;
  const accessor = {};
  Object.defineProperty(accessor, 'byteLength', {
    get: () => {
      getterCalled = true;
      return 1;
    },
  });
  const proxy = new Proxy(new Uint8Array([1]), {
    get() {
      throw new Error('must not execute');
    },
  });
  for (const value of [accessor, proxy, {}, null, []]) {
    assert.doesNotThrow(() => runtime.decodeSourceRequest(value));
    assert.equal(runtime.decodeSourceRequest(value).ok, false);
  }
  assert.equal(getterCalled, false);
  const unknownVersion = requestInput();
  unknownVersion.version = 'jig.source.v9';
  assert.equal(runtime.encodeSourceRequest(unknownVersion).ok, false);
  const credentialed = candidateInput();
  credentialed.credential = 'not-accepted';
  assert.equal(runtime.encodeSourceCandidate(requestFrame(), credentialed).ok, false);
  assert.deepEqual(runtime.validateDeniedEdge('builder-to-controller').error, {
    family: 'FC-AUTHORITY',
    code: 'DENIED_EDGE',
    edge: 'builder-to-controller',
  });
  assert.equal('configureWorkSource' in runtime, false);
  assert.equal('createSourceProvider' in runtime, false);
  assert.equal('createRunFromSource' in runtime, false);
});

test('source contract: conformance evidence binds the exchange, corpus, build, suite, probe, bound, and candidate', () => {
  const request = requestFrame();
  const candidate = candidateFrame(request);
  const exchange = runtime.validateSourceExchange(request, candidate);
  assert.equal(exchange.ok, true);
  const evidence = runtime.createSourceConformanceEvidence({
    request: request,
    result: candidate,
    corpusDigest: syntheticDigest('1'),
    buildDigest: syntheticDigest('2'),
    suiteDigest: syntheticDigest('3'),
    probeDigest: syntheticDigest('4'),
    boundDigest: syntheticDigest('5'),
    candidateDigest: syntheticDigest('6'),
  });
  assert.equal(evidence.ok, true);
  assert.equal(evidence.value.exchangeDigest, exchange.value.exchangeDigest);
  for (const field of ['corpusDigest', 'buildDigest', 'suiteDigest', 'probeDigest', 'boundDigest', 'candidateDigest']) {
    const tampered = { ...evidence.value, [field]: 'f'.repeat(64) };
    assert.equal(runtime.validateSourceConformanceEvidence(tampered).ok, false, field);
  }
});

test('source contract: retry progression consumes an opaque fixture receipt with the original binding', () => {
  const request = requestFrame();
  const candidate = candidateFrame(request);
  const expected = runtime.validateSourceExchange(request, candidate);
  assert.equal(expected.ok, true);
  const first = runtime.createScriptedWorkSource(candidate);
  const second = runtime.createScriptedWorkSource(candidate);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);

  const terminal = first.value.exchange(request, { kind: 'lost-result', observedAt: oracle.request.deadline - 1 });
  assert.equal(terminal.ok, false);
  assert.equal(terminal.error.family, 'FC-MECHANISM');
  assert.equal(terminal.error.code, 'RESULT_UNAVAILABLE');
  const receipt = terminal.error.retryRecord;
  assert.equal(typeof receipt, 'object');
  assert.notEqual(receipt, null);
  assert.equal(Object.isFrozen(receipt), true);

  const fabricated = Object.freeze({ ...receipt });
  assert.deepEqual(first.value.retry(fabricated, { kind: 'return', observedAt: oracle.request.deadline - 1 }), {
    ok: false,
    error: { family: 'FC-INPUT', code: 'INVALID_RETRY_RECEIPT' },
  });
  assert.deepEqual(second.value.retry(receipt, { kind: 'return', observedAt: oracle.request.deadline - 1 }), {
    ok: false,
    error: { family: 'FC-INPUT', code: 'INVALID_RETRY_RECEIPT' },
  });

  const legal = first.value.retry(receipt, { kind: 'return', observedAt: oracle.request.deadline - 1 });
  assert.equal(legal.ok, true);
  assert.equal(legal.value.retry.ordinal, 1);
  assert.equal(legal.value.requestId, expected.value.requestId);
  assert.equal(legal.value.requestBasisDigest, expected.value.requestBasisDigest);
  assert.equal(legal.value.track, expected.value.track);
  assert.equal(legal.value.deadline, expected.value.deadline);
  assert.equal(legal.value.retry.limit, expected.value.retry.limit);
  assert.notEqual(legal.value.exchangeDigest, expected.value.exchangeDigest);
  assert.equal(legal.value.attestation, expected.value.attestation);
  assert.equal(legal.value.contentDigest, expected.value.contentDigest);

  const nextTerminal = first.value.retry(receipt, { kind: 'crash', observedAt: oracle.request.deadline - 1 });
  assert.equal(nextTerminal.ok, false);
  assert.equal(nextTerminal.error.family, 'FC-MECHANISM');
  const nextReceipt = nextTerminal.error.retryRecord;
  assert.equal(typeof nextReceipt, 'object');
  assert.deepEqual(first.value.retry(nextReceipt, { kind: 'return', observedAt: oracle.request.deadline - 1 }), {
    ok: false,
    error: { family: 'FC-BOUND', code: 'BND_RETRY_EXHAUSTED' },
  });

  const changed = requestInput();
  changed.basis.repository = 'repo/changed';
  const changedFrame = runtime.encodeSourceRequest(changed);
  assert.equal(changedFrame.ok, true);
  assert.deepEqual(
    first.value.exchange(changedFrame.value, { kind: 'lost-result', observedAt: changed.deadline - 1 }),
    {
      ok: false,
      error: { family: 'FC-SUBJECT', code: 'REQUEST_BINDING_MISMATCH' },
    },
  );
});

test('source contract: requested track is canonical request basis and binds the returned plan', () => {
  const input = { ...requestInput(), track: 'track/one', predecessor: null };
  const first = runtime.encodeSourceRequest(input);
  const reordered = runtime.encodeSourceRequest(Object.fromEntries(Object.entries(input).reverse()));
  assert.equal(first.ok, true);
  assert.deepEqual(reordered, first);
  const mismatchedBasis = structuredClone(input);
  mismatchedBasis.track = 'track/other';
  assert.deepEqual(runtime.encodeSourceRequest(mismatchedBasis), {
    ok: false,
    error: { family: 'FC-SUBJECT', code: 'REQUEST_TRACK_MISMATCH' },
  });
  const changedPlan = candidateInput();
  changedPlan.plan.track = 'track/other';
  for (const story of changedPlan.plan.stories) story.track = 'track/other';
  const candidate = runtime.encodeSourceCandidate(first.value, changedPlan);
  assert.deepEqual(candidate, { ok: false, error: { family: 'FC-SUBJECT', code: 'PLAN_TRACK_MISMATCH' } });
});

test('source contract: every public raw boundary rejects hostile containers before semantic processing', () => {
  const request = requestFrame();
  const candidate = candidateFrame(request);
  const provider = runtime.createScriptedWorkSource(candidate);
  assert.equal(provider.ok, true);
  const evidence = {
    request,
    result: candidate,
    corpusDigest: syntheticDigest('1'),
    buildDigest: syntheticDigest('2'),
    suiteDigest: syntheticDigest('3'),
    probeDigest: syntheticDigest('4'),
    boundDigest: syntheticDigest('5'),
    candidateDigest: syntheticDigest('6'),
  };
  const validEvidence = runtime.createSourceConformanceEvidence(evidence);
  assert.equal(validEvidence.ok, true);
  const hostile = [
    new Proxy(
      {},
      {
        get() {
          throw new Error('proxy getter');
        },
      },
    ),
    Object.create({ request }),
    Object.defineProperty({ ...evidence }, 'request', {
      enumerable: true,
      get() {
        throw new Error('getter');
      },
    }),
    Object.defineProperty({ ...evidence }, 'request', { enumerable: false, value: request }),
    { ...evidence, credential: 'rejected' },
  ];
  for (const input of hostile) {
    assert.doesNotThrow(() => runtime.createSourceConformanceEvidence(input));
    assert.equal(runtime.createSourceConformanceEvidence(input).ok, false);
    assert.doesNotThrow(() => runtime.validateSourceConformanceEvidence(input));
    assert.equal(runtime.validateSourceConformanceEvidence(input).ok, false);
    assert.doesNotThrow(() => runtime.encodeSourceRequest(input));
    assert.equal(runtime.encodeSourceRequest(input).ok, false);
    assert.doesNotThrow(() => runtime.encodeSourceCandidate(request, input));
    assert.equal(runtime.encodeSourceCandidate(request, input).ok, false);
    assert.doesNotThrow(() => runtime.validateSourceExchange(request, input));
    assert.equal(runtime.validateSourceExchange(request, input).ok, false);
    assert.doesNotThrow(() => runtime.createScriptedWorkSource(input));
    assert.equal(runtime.createScriptedWorkSource(input).ok, false);
  }
  const hostileObservation = new Proxy(
    {},
    {
      get() {
        throw new Error('observation getter');
      },
    },
  );
  assert.doesNotThrow(() => provider.value.exchange(request, hostileObservation));
  assert.deepEqual(provider.value.exchange(request, hostileObservation), {
    ok: false,
    error: { family: 'FC-INPUT', code: 'INVALID_OBSERVATION' },
  });
  assert.equal(
    runtime.encodeSourceRequest({ ...requestInput(), track: 'track/one', predecessor: null, credential: 'rejected' })
      .ok,
    false,
  );

  const poisoned = candidateFrame(request);
  Object.defineProperty(poisoned, 'slice', {
    configurable: true,
    get() {
      throw new Error('caller-owned slice accessor');
    },
  });
  assert.doesNotThrow(() => runtime.createScriptedWorkSource(poisoned));
  assert.deepEqual(runtime.createScriptedWorkSource(poisoned), {
    ok: false,
    error: { family: 'FC-INPUT', code: 'INVALID_FIXTURE_FRAME' },
  });
});
