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
  assert.deepEqual(lost, { ok: false, error: { family: 'FC-MECHANISM', code: 'RESULT_UNAVAILABLE' } });
  const replay = provider.value.recover(request, oracle.request.deadline - 1);
  assert.deepEqual(replay, delivered);
  const crashed = provider.value.exchange(request, { kind: 'crash', observedAt: oracle.request.deadline - 1 });
  assert.deepEqual(crashed, { ok: false, error: { family: 'FC-MECHANISM', code: 'RESULT_UNAVAILABLE' } });
  assert.deepEqual(provider.value.recover(request, oracle.request.deadline - 1), delivered);
  assert.deepEqual(provider.value.exchange(request, { kind: 'return', observedAt: oracle.request.deadline }), {
    ok: false,
    error: { family: 'FC-BOUND', code: 'BND_WAIT_MECHANISM_EXHAUSTED' },
  });

  const exhausted = requestInput();
  exhausted.retry.ordinal = exhausted.retry.limit;
  const exhaustedFrame = runtime.encodeSourceRequest(exhausted);
  assert.equal(exhaustedFrame.ok, true);
  assert.deepEqual(
    provider.value.exchange(exhaustedFrame.value, { kind: 'return', observedAt: exhausted.deadline - 1 }),
    {
      ok: false,
      error: { family: 'FC-BOUND', code: 'BND_RETRY_EXHAUSTED' },
    },
  );
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
