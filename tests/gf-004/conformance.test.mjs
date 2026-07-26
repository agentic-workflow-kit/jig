import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { encodeFrame } from '../../packages/codec/dist/index.js';

const conformance = await import('../../packages/conformance/dist/index.js');
const oracleText = readFileSync(resolve(import.meta.dirname, '../fixtures/gf-004/oracle.json'), 'utf8');
const oracle = JSON.parse(oracleText);
const hash = 'a'.repeat(64);
const subject = Object.freeze({
  candidateContentDigest: hash,
  candidateCommit: 'c',
  candidateTree: hash,
  executionBaseCommit: 'b',
  executionBaseTree: hash,
  mergeBaseCommit: 'm',
  buildDigest: hash,
  toolchainDigest: hash,
  catalogDigest: hash,
  topologyVersion: 'jig.runtime-topology.v1',
  suiteVersion: 'v1',
  probeVersion: 'v1',
  fixtureDigest: hash,
  clockId: 'clock',
  seed: 'seed',
  recorderIdentity: 'independent',
  recordedAt: 1,
  providerId: 'fixture-provider',
  providerBuildDigest: hash,
  manifestDigest: hash,
  environmentDigest: hash,
});
const rawInput = (suite, changes = {}) => ({
  key: `${suite}-1`,
  bytes: `${suite}:1`,
  suite,
  status: 'pass',
  subject,
  independentRecorder: 'independent',
  complete: true,
  attempt: 1,
  ...changes,
});
const input = (suite, changes = {}) => {
  const encoded = encodeFrame(rawInput(suite, changes));
  assert.equal(encoded.ok, true);
  return encoded.value;
};
test('GF-004 red contract: catalog is fixed, literal, and exactly 39 entries', () => {
  assert.equal(conformance.SUITES.length, 39);
  assert.equal(new Set(conformance.SUITES).size, 39);
  assert.equal(conformance.SUITES[0], 'CF-DETERMINISM');
  assert.equal(conformance.SUITES.at(-1), 'CF-MECH-DELIVERY');
  assert.equal(conformance.PRODUCT_ROUTE_IDS.length, 44);
  assert.deepEqual(conformance.SUITES, oracle.catalog);
  assert.deepEqual(conformance.REALIZATION_SUITES, oracle.realization);
  assert.deepEqual(conformance.PRODUCT_ROUTE_IDS, oracle.routes);
  assert.equal(createHash('sha256').update(oracleText).digest('hex').length, 64);
  assert.deepEqual(
    conformance.PRODUCT_ROUTE_ORACLE.slice(0, 15).map((route) => ({
      id: route.id,
      elements: route.elements.map((element) => [element.kind, element.id]),
    })),
    oracle.routeElementsBatch1.map(({ id, elements }) => ({ id, elements })),
  );
  assert.deepEqual(
    conformance.PRODUCT_ROUTE_ORACLE.slice(15, 30).map((route) => ({
      id: route.id,
      elements: route.elements.map((element) => [element.kind, element.id]),
    })),
    oracle.routeElementsBatch2.map(({ id, elements }) => ({ id, elements })),
  );
  assert.deepEqual(
    conformance.PRODUCT_ROUTE_ORACLE.slice(30).map((route) => ({
      id: route.id,
      elements: route.elements.map((element) => [element.kind, element.id]),
    })),
    oracle.routeElementsBatch3.map(({ id, elements }) => ({ id, elements })),
  );
  const routeFixtures = [...oracle.routeElementsBatch1, ...oracle.routeElementsBatch2, ...oracle.routeElementsBatch3];
  assert.equal(routeFixtures.length, 44);
  for (const route of routeFixtures) {
    const candidate = { id: route.id, elements: route.elements };
    assert.equal(
      createHash('sha256').update(JSON.stringify(candidate)).digest('hex'),
      route.digest ?? route.routeDigest,
      `${route.id} route digest must bind its complete literal element list`,
    );
  }
  const tamperedElement = { ...oracle.routeElementsBatch1[0], elements: [['suite', 'CF-FENCE']] };
  assert.notEqual(
    createHash('sha256')
      .update(JSON.stringify({ id: tamperedElement.id, elements: tamperedElement.elements }))
      .digest('hex'),
    oracle.routeElementsBatch1[0].digest,
  );
  assert.notEqual(`${oracle.routeElementsBatch1[0].digest.slice(0, -1)}0`, oracle.routeElementsBatch1[0].digest);
});
test('GF-004 recorder rejects non-frame, proxy-adjacent object, self-attestation, collision, and incomplete artifacts', () => {
  assert.equal(conformance.parseRecordFrame({}).ok, false);
  const encoded = input('CF-DETERMINISM');
  assert.equal(conformance.parseRecordFrame(encoded).ok, true);
  assert.equal(conformance.parseRecordFrame(new TextDecoder().decode(encoded)).ok, true);
  const first = conformance.append(
    [],
    input('CF-MECH-LEDGER', {
      subject: {
        ...subject,
        providerId: 'p',
        providerBuildDigest: hash,
        manifestDigest: hash,
        environmentDigest: hash,
      },
    }),
  );
  assert.equal(first.status, 'pass');
  assert.equal(
    conformance.append(
      first.records,
      input('CF-MECH-LEDGER', {
        bytes: 'other',
        subject: {
          ...subject,
          providerId: 'p',
          providerBuildDigest: hash,
          manifestDigest: hash,
          environmentDigest: hash,
        },
      }),
    ).status,
    'not-recordable',
  );
  assert.equal(
    conformance.append(
      [],
      input('CF-MECH-LEDGER', {
        independentRecorder: 'p',
        subject: {
          ...subject,
          providerId: 'p',
          providerBuildDigest: hash,
          manifestDigest: hash,
          environmentDigest: hash,
        },
      }),
    ).status,
    'not-recordable',
  );
  assert.equal(conformance.append([], input('CF-DETERMINISM', { complete: false })).status, 'not-recordable');
});
test('GF-004 hostile frame inputs are rejected without reflecting on a Proxy', () => {
  const traps = { get: 0, getPrototypeOf: 0, has: 0, ownKeys: 0, getOwnPropertyDescriptor: 0 };
  const hostile = new Proxy(
    {},
    {
      get() {
        traps.get += 1;
        return undefined;
      },
      getPrototypeOf() {
        traps.getPrototypeOf += 1;
        return null;
      },
      has() {
        traps.has += 1;
        return false;
      },
      ownKeys() {
        traps.ownKeys += 1;
        return [];
      },
      getOwnPropertyDescriptor() {
        traps.getOwnPropertyDescriptor += 1;
        return undefined;
      },
    },
  );

  assert.equal(conformance.parseRecordFrame(hostile).ok, false);
  assert.deepEqual(traps, { get: 0, getPrototypeOf: 0, has: 0, ownKeys: 0, getOwnPropertyDescriptor: 0 });
});
test('GF-004 exact subjects reject extra, missing, partial, and malformed field values', () => {
  const { providerId, providerBuildDigest, manifestDigest, environmentDigest, ...realizationSubject } = subject;
  const { candidateCommit, ...subjectWithoutCommit } = subject;
  const { environmentDigest: omittedEnvironment, ...partialProviderSubject } = subject;
  assert.equal(conformance.parseRecordFrame(input('CF-DETERMINISM', { subject: realizationSubject })).ok, true);

  const invalidSubjects = [
    { ...subject, extra: true },
    subjectWithoutCommit,
    partialProviderSubject,
    { ...subject, candidateCommit: 1 },
    { ...subject, executionBaseCommit: false },
    { ...subject, mergeBaseCommit: true },
    { ...subject, candidateTree: false },
    { ...subject, suiteVersion: true },
    { ...subject, probeVersion: 1 },
    { ...subject, clockId: 1 },
    { ...subject, seed: false },
    { ...subject, recorderIdentity: 1 },
    { ...subject, recordedAt: true },
    { ...subject, recordedAt: -1 },
    { ...subject, providerId: false },
    { ...subject, providerBuildDigest: 'not-a-digest' },
    { ...subject, manifestDigest: true },
    { ...subject, environmentDigest: 1 },
  ];
  for (const invalidSubject of invalidSubjects)
    assert.equal(conformance.parseRecordFrame(input('CF-DETERMINISM', { subject: invalidSubject })).ok, false);
});
test('GF-004 product gate retains total input checks while provider qualification remains unavailable', () => {
  const records = conformance.SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  assert.equal(conformance.evaluateRealization(records.slice(0, 32), subject).passed, true);
  const complete = conformance.evaluateProduct(records, routes, subject);
  assert.equal(complete.passed, false);
  assert.equal(complete.failureClass, 'FC-EVIDENCE');
  assert.deepEqual(
    complete.reasons,
    Object.values(conformance.MECHANISM_PORTS).map((port) => `provider-proof:${port}`),
  );
  const providerBypass = records.map((record) =>
    record.suite === 'CF-MECH-LEDGER'
      ? { ...record, subject: { ...record.subject, providerBuildDigest: 'b'.repeat(64) } }
      : record,
  );
  assert.equal(conformance.evaluateProduct(providerBypass, routes, subject).passed, false);
  assert.equal(conformance.evaluateProduct(records.slice(1), routes, subject).passed, false);
  assert.equal(conformance.evaluateProduct(records, routes.slice(1), subject).passed, false);
  assert.equal(
    conformance.evaluateProduct(
      records.map((record) => ({ ...record, subject: { ...subject, environmentDigest: 'b'.repeat(64) } })),
      routes,
      subject,
    ).passed,
    false,
  );
});
test('GF-004 provider gate binds the exact port mechanism but remains unqualified in Phase 0', () => {
  const providerSubject = {
    ...subject,
    providerId: 'fixture',
    providerBuildDigest: hash,
    manifestDigest: hash,
    environmentDigest: hash,
  };
  const record = conformance.append([], input('CF-MECH-LEDGER', { subject: providerSubject })).records;
  const bound = conformance.evaluateProvider('PORT-LEDGER', record, providerSubject);
  assert.equal(bound.passed, false);
  assert.deepEqual(bound.reasons, ['missing:independent-recorder-provenance']);
  assert.equal(bound.failureClass, 'FC-EVIDENCE');
  const wrongPort = conformance.evaluateProvider('PORT-ARTIFACT', record, providerSubject);
  assert.equal(wrongPort.passed, false);
  assert.ok(wrongPort.reasons.includes('missing:CF-MECH-ARTIFACT'));
  assert.ok(wrongPort.reasons.includes('missing:independent-recorder-provenance'));
});
test('GF-004 claimed independent recorder labels cannot qualify a provider or product', () => {
  const claimedIndependentSubject = {
    ...subject,
    providerId: 'provider-controlled',
    recorderIdentity: 'claimed-independent',
  };
  const providerRecords = conformance.append(
    [],
    input('CF-MECH-LEDGER', {
      subject: claimedIndependentSubject,
      independentRecorder: 'claimed-independent',
    }),
  ).records;
  const provider = conformance.evaluateProvider('PORT-LEDGER', providerRecords, claimedIndependentSubject);
  assert.equal(provider.passed, false);
  assert.deepEqual(provider.reasons, ['missing:independent-recorder-provenance']);
  assert.equal(provider.failureClass, 'FC-EVIDENCE');

  const records = conformance.SUITES.map(
    (suite) =>
      conformance.append(
        [],
        input(suite, { subject: claimedIndependentSubject, independentRecorder: 'claimed-independent' }),
      ).records[0],
  );
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  const product = conformance.evaluateProduct(records, routes, claimedIndependentSubject);
  assert.equal(product.passed, false);
  assert.equal(product.failureClass, 'FC-EVIDENCE');
  assert.deepEqual(
    product.reasons,
    Object.values(conformance.MECHANISM_PORTS).map((port) => `provider-proof:${port}`),
  );
});
test('GF-004 direct evaluators reject forged, schema-less, self-attested, and malformed records', () => {
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  const complete = conformance.SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  const gates = [
    [
      'realization',
      complete.filter((record) => conformance.REALIZATION_SUITES.includes(record.suite)),
      (records) => conformance.evaluateRealization(records, subject),
    ],
    [
      'provider',
      complete.filter((record) => record.suite === 'CF-MECH-LEDGER'),
      (records) => conformance.evaluateProvider('PORT-LEDGER', records, subject),
    ],
    ['product', complete, (records) => conformance.evaluateProduct(records, routes, subject)],
  ];
  const forgeries = [
    ['schema-less', (records) => records.map(({ schemaVersion, ...record }) => record), 'invalid:'],
    [
      'self-attested',
      (records) => records.map((record) => ({ ...record, independentRecorder: record.subject.providerId })),
      'self-attestation:',
    ],
    ['extra-record-key', (records) => records.map((record) => ({ ...record, extra: true })), 'invalid:'],
    [
      'malformed-subject',
      (records) => records.map((record) => ({ ...record, subject: { ...record.subject, recordedAt: false } })),
      'invalid:',
    ],
  ];
  assert.equal(gates.length, 3);
  assert.equal(forgeries.length, 4);
  for (const [, records, evaluate] of gates)
    for (const [, forge, reason] of forgeries) {
      const result = evaluate(forge(records));
      assert.equal(result.passed, false);
      assert.ok(result.reasons.some((entry) => entry.startsWith(reason)));
      assert.equal(result.failureClass, 'FC-EVIDENCE');
    }
});
test('GF-004 provider missing-binding closure reports evidence failure', () => {
  const { providerId, providerBuildDigest, manifestDigest, environmentDigest, ...realizationSubject } = subject;
  const records = conformance.append([], input('CF-MECH-LEDGER', { subject: realizationSubject })).records;
  const result = conformance.evaluateProvider('PORT-LEDGER', records, realizationSubject);
  assert.equal(result.passed, false);
  assert.ok(result.reasons.includes('missing:provider-binding'));
  assert.equal(result.failureClass, 'FC-EVIDENCE');
});
test('GF-004 direct gates close canonical-invalid subjects in records and expected input', () => {
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  const complete = conformance.SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  const gates = [
    ['realization', complete.slice(0, 32), (records, expected) => conformance.evaluateRealization(records, expected)],
    [
      'provider',
      complete.filter((record) => record.suite === 'CF-MECH-LEDGER'),
      (records, expected) => conformance.evaluateProvider('PORT-LEDGER', records, expected),
    ],
    ['product', complete, (records, expected) => conformance.evaluateProduct(records, routes, expected)],
  ];
  const invalid = [
    { candidateContentDigest: 'A'.repeat(64) },
    { buildDigest: 'short' },
    { candidateCommit: '' },
    { suiteVersion: '' },
    { clockId: '' },
    { seed: '' },
    { recorderIdentity: '' },
    { topologyVersion: 'wrong' },
    { recordedAt: -1 },
    { environmentDigest: undefined },
  ];
  for (const [, records, evaluate] of gates)
    for (const change of invalid) {
      const invalidSubject = { ...subject, ...change };
      const result = evaluate(
        records.map((record) => ({ ...record, subject: invalidSubject })),
        invalidSubject,
      );
      assert.equal(result.passed, false);
      assert.equal(result.reasons[0], 'invalid:subject');
      assert.equal(result.failureClass, 'FC-EVIDENCE');
      const expectedOnly = evaluate(records, invalidSubject);
      assert.equal(expectedOnly.passed, false);
      assert.equal(expectedOnly.reasons[0], 'invalid:subject');
    }
});
test('GF-004 deterministic replay, crash, timeout, and resume remain append-only and closed', () => {
  const first = conformance.deterministicHarness(10, 'seed');
  const second = conformance.deterministicHarness(10, 'seed');
  assert.equal(first.nextId('probe'), second.nextId('probe'));
  const before = conformance.runAttempt([], 'k', 'b', 'before-record');
  const after = conformance.runAttempt(before, 'k', 'b', 'after-record');
  const resumed = conformance.runAttempt(after, 'k', 'b');
  assert.deepEqual(
    before.map((entry) => entry.state),
    ['incomplete'],
  );
  assert.deepEqual(
    after.map((entry) => entry.state),
    ['incomplete', 'recorded'],
  );
  assert.equal(resumed.at(-1).attempt, 3);
  assert.equal(resumed.at(-1).state, 'evaluated');
  assert.equal(
    conformance.runAttempt([], 'k', 'b', 'before-evaluation').at(-1).state,
    oracle.faults['before-evaluation'],
  );
  assert.equal(conformance.runAttempt([], 'k', 'b', 'before-record').at(-1).state, oracle.faults['before-record']);
});
test('GF-004 closed gate renderer cannot emit false green', () => {
  assert.equal(conformance.renderGate(conformance.evaluateProduct([], [], subject)), 'closed');
});
test('GF-004 fixed crash and replay corpus is append-only and never passing', () => {
  const stages = ['before-record', 'after-record', 'before-evaluation'];
  assert.equal(stages.length, 3);
  for (const stage of stages) {
    const log = conformance.runAttempt([], 'k', 'bytes', stage);
    assert.notEqual(log.at(-1).state, 'evaluated');
    assert.equal(conformance.renderGate(conformance.evaluateProduct([], [], subject)), 'closed');
  }
  const partial = conformance.runAttempt([], 'k', 'bytes', 'before-record');
  const resumed = conformance.runAttempt(partial, 'k', 'bytes');
  assert.equal(partial.length, 1);
  assert.equal(resumed.at(-1).attempt, 2);
  assert.deepEqual(conformance.runAttempt([], 'x', 'b'), conformance.runAttempt([], 'x', 'b'));
});
test('GF-004 negative corpus closes every substituted, stale, duplicate, partial, and false-green input', () => {
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  const complete = conformance.SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  const closed = (records) =>
    conformance.evaluateProduct(records, routes, subject).passed === false ? 'closed' : 'open';
  for (const name of [
    'absent-suite',
    'duplicate-suite',
    'unknown-suite',
    'stale-evidence',
    'candidate-substitution',
    'basis-substitution',
    'build-substitution',
    'provider-substitution',
    'manifest-substitution',
    'environment-substitution',
    'clock-drift',
    'probe-substitution',
    'fixture-substitution',
    'false-green',
  ]) {
    const records =
      name === 'absent-suite'
        ? complete.slice(1)
        : name === 'duplicate-suite'
          ? [...complete, complete[0]]
          : name === 'unknown-suite'
            ? [...complete, { ...complete[0], suite: 'CF-UNKNOWN' }]
            : complete.map((record) => ({
                ...record,
                subject: {
                  ...record.subject,
                  [name === 'stale-evidence'
                    ? 'recordedAt'
                    : name === 'candidate-substitution'
                      ? 'candidateContentDigest'
                      : name === 'basis-substitution'
                        ? 'executionBaseTree'
                        : name === 'build-substitution'
                          ? 'buildDigest'
                          : name === 'provider-substitution'
                            ? 'providerId'
                            : name === 'manifest-substitution'
                              ? 'manifestDigest'
                              : name === 'environment-substitution'
                                ? 'environmentDigest'
                                : name === 'clock-drift'
                                  ? 'clockId'
                                  : name === 'probe-substitution'
                                    ? 'probeVersion'
                                    : 'fixtureDigest']: name === 'stale-evidence' ? -1 : name,
                },
              }));
    assert.equal(closed(records), oracle.negativeExpected[name]);
  }
  assert.equal(
    conformance.append([], input('CF-DETERMINISM', { complete: false })).status,
    oracle.negativeExpected['partial-artifact'],
  );
  assert.equal(Object.keys(oracle.negativeExpected).length, 17);
  const tamperedRoute = routes.map((route, index) =>
    index === 0 ? { ...route, elements: route.elements.slice(1) } : route,
  );
  assert.equal(conformance.evaluateProduct(complete, tamperedRoute, subject).passed, false);
  assert.equal(conformance.evaluateProduct([...complete].reverse(), routes, subject).passed, false);
});
test('GF-004 exact-subject N1 substitutions reach binding validation', () => {
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  const complete = conformance.SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  const fields = [
    ['catalogDigest', 'FC-SUBJECT'],
    ['candidateContentDigest', 'FC-SUBJECT'],
    ['executionBaseTree', 'FC-SUBJECT'],
    ['buildDigest', 'FC-SUBJECT'],
    ['providerId', 'FC-SUBJECT'],
    ['manifestDigest', 'FC-SUBJECT'],
    ['environmentDigest', 'FC-TRUST'],
    ['clockId', 'FC-TRUST'],
  ];
  assert.equal(fields.length, 8);
  for (const [field] of fields) {
    const mutated = complete.map((record) => ({
      ...record,
      subject: { ...record.subject, [field]: `mutated-${field}` },
    }));
    const result = conformance.evaluateProduct(mutated, routes, subject);
    assert.equal(result.passed, false);
    assert.ok(['FC-SUBJECT', 'FC-EVIDENCE', 'FC-TRUST'].includes(result.failureClass));
  }
  const precedence = complete.map((record) => ({
    ...record,
    subject: { ...record.subject, candidateContentDigest: 'b'.repeat(64), buildDigest: 'c'.repeat(64) },
  }));
  assert.equal(
    conformance.evaluateProduct(precedence, routes, subject).reasons[0],
    'mismatched:CF-DETERMINISM:candidateContentDigest',
  );
});
test('GF-004 N2 structural fences close fixed valid adversarial corpus', () => {
  const routes = conformance.PRODUCT_ROUTE_ORACLE.map((route) => ({
    route: route.id,
    elements: route.elements.map((element) => ({ ...element, status: 'pass' })),
  }));
  const complete = conformance.SUITES.map((suite) => conformance.append([], input(suite)).records[0]);
  const cases = [
    ['absent', complete.slice(1), 'missing:', 'FC-INPUT'],
    ['duplicate', [...complete, complete[0]], 'duplicate:', 'FC-INPUT'],
    ['unknown', [...complete, { ...complete[0], suite: 'CF-UNKNOWN' }], 'order:', 'FC-INPUT'],
    [
      'stale',
      complete.map((record) => ({ ...record, subject: { ...record.subject, recordedAt: -1 } })),
      'mismatched:CF-DETERMINISM:recordedAt',
      'FC-SUBJECT',
    ],
    [
      'probe',
      complete.map((record) => ({ ...record, subject: { ...record.subject, probeVersion: 'v2' } })),
      'mismatched:CF-DETERMINISM:probeVersion',
      'FC-SUBJECT',
    ],
    [
      'fixture',
      complete.map((record) => ({ ...record, subject: { ...record.subject, fixtureDigest: 'b'.repeat(64) } })),
      'mismatched:CF-DETERMINISM:fixtureDigest',
      'FC-SUBJECT',
    ],
    ['order', [...complete].reverse(), 'order:', 'FC-INPUT'],
  ];
  assert.equal(cases.length, 7);
  for (const [, records] of cases) {
    const result = conformance.evaluateProduct(records, routes, subject);
    assert.equal(result.passed, false);
    assert.ok(['FC-INPUT', 'FC-SUBJECT', 'FC-EVIDENCE', 'FC-TRUST'].includes(result.failureClass));
  }
  assert.equal(
    conformance.append(
      [],
      input('CF-MECH-LEDGER', {
        independentRecorder: 'p',
        subject: {
          ...subject,
          providerId: 'p',
          providerBuildDigest: hash,
          manifestDigest: hash,
          environmentDigest: hash,
        },
      }),
    ).status,
    'not-recordable',
  );
  assert.equal(conformance.renderGate(conformance.evaluateProduct(complete, routes.slice(1), subject)), 'closed');
});
test('GF-004 gate reasons have stable typed failure families', () => {
  const cases = [
    ['unknown:CF-X', 'FC-INPUT'],
    ['mismatched:CF-X', 'FC-SUBJECT'],
    ['missing:CF-X', 'FC-EVIDENCE'],
    ['route:PC-X', 'FC-TRUST'],
  ];
  assert.equal(cases.length, 4);
  for (const [reason, family] of cases) assert.equal(conformance.classifyGateReason(reason), family);
});
