import { decodeFrame } from '@agentic-workflow-kit/jig-codec';
import { TOPOLOGY_VERSION } from '@agentic-workflow-kit/jig-runtime-contracts';

function freezeCatalog<T>(catalog: T): T {
  if (typeof catalog === 'object' && catalog !== null && !Object.isFrozen(catalog)) {
    for (const value of Object.values(catalog as object)) freezeCatalog(value);
    Object.freeze(catalog);
  }
  return catalog;
}

export const CONFORMANCE_VERSION = 'jig.conformance.v1';
export const GATE_IDS = Object.freeze(['CF-GATE-REALIZATION', 'CF-GATE-PROVIDER', 'CF-GATE-PRODUCT'] as const);
export type GateId = (typeof GATE_IDS)[number];
export const SUITES = Object.freeze([
  'CF-DETERMINISM',
  'CF-ORDERING',
  'CF-FENCE',
  'CF-BINDING',
  'CF-ACCEPTANCE',
  'CF-POLICY',
  'CF-CAPACITY',
  'CF-ORDER',
  'CF-RELEASE',
  'CF-BLOCKERS',
  'CF-CONTAINMENT',
  'CF-BOUNDS',
  'CF-DOUBLE-EFFECT',
  'CF-SEPARATION',
  'CF-PRESERVATION',
  'CF-TRUST-STOP',
  'CF-RULE-SURFACE',
  'CF-LIVENESS',
  'CF-NOTICE-EXPORT',
  'CF-OBSERVABILITY',
  'CF-RUN-CONTROL',
  'CF-OPERATOR-ACTIONS',
  'CF-EVIDENCE-LIFECYCLE',
  'CF-SECRET-ABSENCE',
  'CF-DELEGATION',
  'CF-CONSUMER',
  'CF-ENVELOPE',
  'CF-PROVIDER-PERMISSION',
  'CF-SETUP-FRESHNESS',
  'CF-PROVIDER-AUTHORITY',
  'CF-BLOCK-SURFACING',
  'CF-REVIEW-PUBLICATION',
  'CF-MECH-LEDGER',
  'CF-MECH-ARTIFACT',
  'CF-MECH-SESSION',
  'CF-MECH-WORKSPACE',
  'CF-MECH-SOURCE',
  'CF-MECH-VERIFY',
  'CF-MECH-DELIVERY',
] as const);
export type SuiteId = (typeof SUITES)[number];
export type PortId =
  | 'PORT-LEDGER'
  | 'PORT-ARTIFACT'
  | 'PORT-SESSION'
  | 'PORT-WORKSPACE'
  | 'PORT-SOURCE'
  | 'PORT-VERIFY'
  | 'PORT-DELIVERY';
export const MECHANISM_PORTS: Readonly<Record<Extract<SuiteId, `CF-MECH-${string}`>, PortId>> = Object.freeze({
  'CF-MECH-LEDGER': 'PORT-LEDGER',
  'CF-MECH-ARTIFACT': 'PORT-ARTIFACT',
  'CF-MECH-SESSION': 'PORT-SESSION',
  'CF-MECH-WORKSPACE': 'PORT-WORKSPACE',
  'CF-MECH-SOURCE': 'PORT-SOURCE',
  'CF-MECH-VERIFY': 'PORT-VERIFY',
  'CF-MECH-DELIVERY': 'PORT-DELIVERY',
});
export const REALIZATION_SUITES = freezeCatalog(SUITES.slice(0, 32));
export const PRODUCT_ROUTE_IDS = Object.freeze([
  'PC-README-1',
  'PC-README-2',
  'PC-README-3',
  'PC-JIG-1',
  'PC-JIG-2',
  'PC-JIG-3',
  'PC-JIG-4',
  'PC-JIG-5',
  'PC-JIG-6',
  'PC-JIG-7',
  'PC-JIG-8',
  'PC-JIG-9',
  'PC-JIG-10',
  'PC-JIG-11',
  'PC-JIG-12',
  'PC-JIG-13',
  'PC-JIG-14',
  'PC-JIG-15',
  'PC-JIG-16',
  'PC-JIG-17',
  'PC-JIG-18',
  'PC-JIG-19',
  'PC-JIG-20',
  'PC-JIG-21',
  'PC-JIG-22',
  'PC-JIG-23',
  'PC-JIG-24',
  'PC-JIG-25',
  'PC-CONCEPTS-1',
  'PC-CONCEPTS-2',
  'PC-CONCEPTS-3',
  'PC-CONCEPTS-4',
  'PC-CONCEPTS-5',
  'PC-CONCEPTS-6',
  'PC-CONCEPTS-7',
  'PC-CONCEPTS-8',
  'PC-CONCEPTS-9',
  'PC-USE-1',
  'PC-USE-2',
  'PC-USE-3',
  'PC-USE-4',
  'PC-USE-5',
  'PC-USE-6',
  'PC-USE-7',
] as const);
export type ProductRouteId = (typeof PRODUCT_ROUTE_IDS)[number];
export type RouteElement = Readonly<{
  kind: 'suite' | 'gate' | 'governance' | 'validation' | 'suite-group';
  id: string;
}>;
export type ProductRoute = Readonly<{ id: ProductRouteId; elements: readonly RouteElement[] }>;
const suite = (id: string): RouteElement => ({ kind: 'suite', id });
const gate = (id: string): RouteElement => ({ kind: 'gate', id });
const governance = (id: string): RouteElement => ({ kind: 'governance', id });
const validation = (id: string): RouteElement => ({ kind: 'validation', id });
const group = (id: string): RouteElement => ({ kind: 'suite-group', id });
export const PRODUCT_ROUTE_ORACLE: readonly ProductRoute[] = freezeCatalog([
  { id: 'PC-README-1', elements: [governance('D1 source scope'), governance('Layer 1/2 gate records')] },
  { id: 'PC-README-2', elements: [governance('D2 boundary'), governance('D13 Envelope Builder boundary')] },
  { id: 'PC-README-3', elements: [suite('CF-ENVELOPE'), governance('D2/D13 boundary records')] },
  {
    id: 'PC-JIG-1',
    elements: [
      'CF-ENVELOPE',
      'CF-ACCEPTANCE',
      'CF-POLICY',
      'CF-RUN-CONTROL',
      'CF-RELEASE',
      'CF-NOTICE-EXPORT',
      'CF-OBSERVABILITY',
    ].map(suite),
  },
  { id: 'PC-JIG-2', elements: ['CF-ENVELOPE', 'CF-RULE-SURFACE', 'CF-FENCE'].map(suite) },
  { id: 'PC-JIG-3', elements: ['CF-CONSUMER', 'CF-ENVELOPE'].map(suite) },
  { id: 'PC-JIG-4', elements: ['CF-CONSUMER', 'CF-OBSERVABILITY'].map(suite) },
  { id: 'PC-JIG-5', elements: ['CF-OPERATOR-ACTIONS', 'CF-DELEGATION'].map(suite) },
  { id: 'PC-JIG-6', elements: ['CF-OPERATOR-ACTIONS', 'CF-RUN-CONTROL'].map(suite) },
  { id: 'PC-JIG-7', elements: ['CF-ENVELOPE', 'CF-POLICY'].map(suite) },
  {
    id: 'PC-JIG-8',
    elements: [
      suite('CF-BINDING'),
      validation('EV-SESSION-VERDICT independence validation'),
      suite('CF-PROVIDER-AUTHORITY'),
      suite('CF-SECRET-ABSENCE'),
      group('CF-MECH-SESSION/CF-MECH-WORKSPACE/CF-MECH-VERIFY/CF-MECH-DELIVERY'),
    ],
  },
  { id: 'PC-JIG-9', elements: ['CF-MECH-SESSION', 'CF-PROVIDER-PERMISSION'].map(suite) },
  { id: 'PC-JIG-10', elements: ['CF-ACCEPTANCE', 'CF-POLICY'].map(suite) },
  { id: 'PC-JIG-11', elements: [suite('CF-REVIEW-PUBLICATION')] },
  { id: 'PC-JIG-12', elements: ['CF-POLICY', 'CF-PROVIDER-AUTHORITY'].map(suite) },
  {
    id: 'PC-JIG-13',
    elements: [governance('D2/D13 boundary records'), governance('V1/runtime-unit and port-ownership records')],
  },
  {
    id: 'PC-JIG-14',
    elements: [suite('CF-CONSUMER'), governance('runtime/D10 private-facade and no-public-stability records')],
  },
  {
    id: 'PC-JIG-15',
    elements: [gate('CF-GATE-PROVIDER'), suite('CF-PROVIDER-AUTHORITY'), governance('D10/D12 mechanism records')],
  },
  { id: 'PC-JIG-16', elements: [gate('CF-GATE-PROVIDER'), governance('D10 package deferral')] },
  { id: 'PC-JIG-17', elements: [governance('D10 private-facade'), governance('D14 middleman-exclusion records')] },
  { id: 'PC-JIG-18', elements: [suite('CF-MECH-WORKSPACE'), governance('gate-record B2 resolution')] },
  { id: 'PC-JIG-19', elements: [suite('CF-CONSUMER'), suite('CF-ENVELOPE'), governance('D10/D13 boundary records')] },
  { id: 'PC-JIG-20', elements: [governance('D10 runtime-boundary records')] },
  { id: 'PC-JIG-21', elements: [gate('CF-GATE-PROVIDER'), governance('gate-record unproven-edge inventory')] },
  { id: 'PC-JIG-22', elements: [suite('CF-ENVELOPE actionable legacy-guidance clause')] },
  { id: 'PC-JIG-23', elements: ['CF-ENVELOPE', 'CF-RUN-CONTROL', 'CF-BOUNDS', 'CF-OBSERVABILITY'].map(suite) },
  { id: 'PC-JIG-24', elements: [governance('D2/D13 boundary'), governance('D7 acceptance records')] },
  {
    id: 'PC-JIG-25',
    elements: ['CF-CONTAINMENT', 'CF-RUN-CONTROL', 'CF-RELEASE', 'CF-OBSERVABILITY']
      .map(suite)
      .concat(governance('D1/D2 records')),
  },
  { id: 'PC-CONCEPTS-1', elements: ['CF-ENVELOPE', 'CF-POLICY'].map(suite) },
  { id: 'PC-CONCEPTS-2', elements: ['CF-BLOCKERS', 'CF-CAPACITY', 'CF-RELEASE'].map(suite) },
  {
    id: 'PC-CONCEPTS-3',
    elements: [
      suite('CF-BINDING'),
      validation('EV-SESSION-VERDICT independence validation'),
      suite('CF-PROVIDER-AUTHORITY'),
      suite('CF-SECRET-ABSENCE'),
      group('CF-MECH-SESSION/CF-MECH-WORKSPACE/CF-MECH-VERIFY/CF-MECH-DELIVERY'),
    ],
  },
  {
    id: 'PC-CONCEPTS-4',
    elements: [suite('CF-CONSUMER'), governance('runtime/D10 private-facade and no-public-stability records')],
  },
  { id: 'PC-CONCEPTS-5', elements: [gate('CF-GATE-PROVIDER'), suite('CF-PROVIDER-AUTHORITY')] },
  { id: 'PC-CONCEPTS-6', elements: [suite('CF-REVIEW-PUBLICATION')] },
  {
    id: 'PC-CONCEPTS-7',
    elements: [suite('CF-RUN-CONTROL'), suite('CF-OBSERVABILITY'), governance('canonical product projection')],
  },
  {
    id: 'PC-CONCEPTS-8',
    elements: [suite('CF-RUN-CONTROL'), suite('CF-OBSERVABILITY'), governance('canonical product projection')],
  },
  {
    id: 'PC-CONCEPTS-9',
    elements: [
      suite('CF-ENVELOPE'),
      governance('D2/D13'),
      governance('EP-TRACK'),
      governance('independent per-Run controller/scheduling boundaries'),
    ],
  },
  { id: 'PC-USE-1', elements: ['CF-BOUNDS', 'CF-CAPACITY', 'CF-MECH-WORKSPACE', 'CF-OBSERVABILITY'].map(suite) },
  { id: 'PC-USE-2', elements: ['CF-PROVIDER-PERMISSION', 'CF-MECH-SESSION'].map(suite) },
  {
    id: 'PC-USE-3',
    elements: [suite('CF-POLICY'), suite('CF-PROVIDER-AUTHORITY'), governance('EP-PROFILE authority limit')],
  },
  { id: 'PC-USE-4', elements: ['CF-FENCE', 'CF-RUN-CONTROL'].map(suite) },
  { id: 'PC-USE-5', elements: [gate('CF-GATE-PROVIDER'), suite('CF-PROVIDER-AUTHORITY')] },
  { id: 'PC-USE-6', elements: ['CF-OBSERVABILITY', 'CF-NOTICE-EXPORT', 'CF-EVIDENCE-LIFECYCLE'].map(suite) },
  { id: 'PC-USE-7', elements: ['CF-RULE-SURFACE', 'CF-OPERATOR-ACTIONS'].map(suite) },
]);
if (
  PRODUCT_ROUTE_ORACLE.length !== 44 ||
  PRODUCT_ROUTE_ORACLE.some((route, index) => route.id !== PRODUCT_ROUTE_IDS[index])
)
  throw new Error('immutable product route oracle is malformed');

export type Digest = string;
export type Subject = Readonly<{
  candidateContentDigest: Digest;
  candidateCommit: string;
  candidateTree: Digest;
  executionBaseCommit: string;
  executionBaseTree: Digest;
  mergeBaseCommit: string;
  buildDigest: Digest;
  toolchainDigest: Digest;
  catalogDigest: Digest;
  topologyVersion: string;
  suiteVersion: string;
  probeVersion: string;
  fixtureDigest: Digest;
  clockId: string;
  seed: string;
  recorderIdentity: string;
  recordedAt: number;
  providerId?: string;
  providerBuildDigest?: Digest;
  manifestDigest?: Digest;
  environmentDigest?: Digest;
}>;
export type ResultStatus = 'pass' | 'fail' | 'not-recordable';
export type RecordInput = Readonly<{
  key: string;
  bytes: string;
  suite: SuiteId;
  status: ResultStatus;
  subject: Subject;
  independentRecorder: string;
  complete: boolean;
  attempt: number;
}>;
export type EvidenceRecord = Readonly<RecordInput & { readonly schemaVersion: typeof CONFORMANCE_VERSION }>;
export type GateResult = Readonly<{
  gate: GateId;
  passed: boolean;
  reasons: readonly string[];
  failureClass?: HarnessFailureFamily;
}>;
export type HarnessFailureFamily = 'FC-INPUT' | 'FC-SUBJECT' | 'FC-EVIDENCE' | 'FC-TRUST';
export function classifyGateReason(reason: string): HarnessFailureFamily {
  if (typeof reason !== 'string') return 'FC-INPUT';
  if (
    reason.startsWith('input:') ||
    reason.startsWith('unknown:') ||
    reason.startsWith('duplicate:') ||
    reason.startsWith('order:')
  )
    return 'FC-INPUT';
  if (reason.endsWith(':environmentDigest') || reason.endsWith(':clockId')) return 'FC-TRUST';
  if (reason.startsWith('mismatched:')) return 'FC-SUBJECT';
  if (reason.startsWith('missing:') || reason.startsWith('not-passing:') || reason.startsWith('provider-proof:'))
    return 'FC-EVIDENCE';
  if (
    reason.startsWith('invalid:') ||
    reason.startsWith('incomplete:') ||
    reason.startsWith('self-attestation:') ||
    reason.startsWith('stale:')
  )
    return 'FC-EVIDENCE';
  return 'FC-TRUST';
}
export type RouteEvidence = Readonly<{
  route: ProductRouteId;
  elements: readonly Readonly<RouteElement & { status: 'pass' | 'fail' | 'not-run' }>[];
}>;
export type DeterministicHarness = Readonly<{
  version: typeof CONFORMANCE_VERSION;
  clock: number;
  seed: string;
  nextId: (namespace: string) => string;
}>;
export type CrashPoint = 'before-record' | 'after-record' | 'before-evaluation';
export type AttemptLog = Readonly<{
  attempt: number;
  key: string;
  state: 'incomplete' | 'recorded' | 'evaluated';
  bytes: string;
}>;
const gateResults = new WeakSet<object>();
const PROVIDER_RECORDER_ID = 'recorder/jig-conformance/v1';
const providerRecorderEvidence = new WeakSet<object>();
export function deterministicHarness(clock: number, seed: string): DeterministicHarness {
  let ordinal = 0;
  const safeClock = nonnegativeSafeInteger(clock) ? clock : 0;
  const safeSeed = typeof seed === 'string' ? seed : '';
  return Object.freeze({
    version: CONFORMANCE_VERSION,
    clock: safeClock,
    seed: safeSeed,
    nextId: (namespace) => `${typeof namespace === 'string' ? namespace : ''}:${safeSeed}:${safeClock}:${++ordinal}`,
  });
}
export function runAttempt(
  log: readonly AttemptLog[],
  key: string,
  bytes: string,
  crash?: CrashPoint,
): readonly AttemptLog[] {
  const safeLog = snapshotAttemptLog(log);
  const safeKey = typeof key === 'string' ? key : '';
  const safeBytes = typeof bytes === 'string' ? bytes : '';
  const attempt = (safeLog.filter((entry) => entry.key === safeKey).at(-1)?.attempt ?? 0) + 1;
  const incomplete: AttemptLog = Object.freeze({ attempt, key: safeKey, bytes: safeBytes, state: 'incomplete' });
  if (crash === 'before-record') return Object.freeze([...safeLog, incomplete]);
  const recorded: AttemptLog = Object.freeze({ attempt, key: safeKey, bytes: safeBytes, state: 'recorded' });
  if (crash === 'after-record' || crash === 'before-evaluation') return Object.freeze([...safeLog, recorded]);
  return Object.freeze([...safeLog, Object.freeze({ attempt, key: safeKey, bytes: safeBytes, state: 'evaluated' })]);
}
export function renderGate(result: GateResult): 'green' | 'closed' {
  return typeof result === 'object' && result !== null && gateResults.has(result) && result.passed ? 'green' : 'closed';
}

const digest = /^[0-9a-f]{64}$/;
const isSuite = (value: string): value is SuiteId => (SUITES as readonly string[]).includes(value);
const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
function plain(value: unknown): value is Record<string, unknown> {
  try {
    return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
  } catch {
    return false;
  }
}
const dataDescriptor = (value: PropertyDescriptor) =>
  Object.hasOwn(value, 'value') && !Object.hasOwn(value, 'get') && !Object.hasOwn(value, 'set');
function snapshotDataObject(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (!plain(value)) return undefined;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== 'string')) return undefined;
    const snapshot = {} as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = descriptors[key as string];
      if (!dataDescriptor(descriptor) || !Object.is(Reflect.get(value, key), descriptor.value)) return undefined;
      Object.defineProperty(snapshot, key, { value: descriptor.value, enumerable: true });
    }
    return Object.freeze(snapshot);
  } catch {
    return undefined;
  }
}
function snapshotExactObject(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> | undefined {
  const snapshot = snapshotDataObject(value);
  return snapshot && hasExactKeys(snapshot, keys) ? snapshot : undefined;
}
function snapshotArray(value: unknown): readonly unknown[] | undefined {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const length = descriptors.length;
    if (!dataDescriptor(length) || !Number.isSafeInteger(length.value) || length.value < 0 || length.value > 256)
      return undefined;
    const keys = Reflect.ownKeys(descriptors);
    if (keys.length !== length.value + 1 || !Object.is(Reflect.get(value, 'length'), length.value)) return undefined;
    const snapshot: unknown[] = [];
    for (let index = 0; index < length.value; index += 1) {
      const key = String(index);
      const descriptor = descriptors[key];
      if (!descriptor || !dataDescriptor(descriptor) || !Object.is(Reflect.get(value, key), descriptor.value))
        return undefined;
      snapshot.push(descriptor.value);
    }
    return Object.freeze(snapshot);
  } catch {
    return undefined;
  }
}
function snapshotAttemptLog(log: unknown): readonly AttemptLog[] {
  const values = snapshotArray(log);
  if (!values) return Object.freeze([]);
  const snapshots: AttemptLog[] = [];
  for (const value of values) {
    const snapshot = snapshotExactObject(value, ['attempt', 'key', 'state', 'bytes']);
    if (
      !snapshot ||
      !nonnegativeSafeInteger(snapshot.attempt) ||
      snapshot.attempt >= Number.MAX_SAFE_INTEGER ||
      typeof snapshot.key !== 'string' ||
      typeof snapshot.bytes !== 'string' ||
      !['incomplete', 'recorded', 'evaluated'].includes(String(snapshot.state))
    )
      return Object.freeze([]);
    snapshots.push(
      Object.freeze({
        attempt: snapshot.attempt,
        key: snapshot.key,
        state: snapshot.state as AttemptLog['state'],
        bytes: snapshot.bytes,
      }),
    );
  }
  return Object.freeze(snapshots);
}
const REALIZATION_SUBJECT_FIELDS = Object.freeze([
  'candidateContentDigest',
  'candidateCommit',
  'candidateTree',
  'executionBaseCommit',
  'executionBaseTree',
  'mergeBaseCommit',
  'buildDigest',
  'toolchainDigest',
  'catalogDigest',
  'topologyVersion',
  'suiteVersion',
  'probeVersion',
  'fixtureDigest',
  'clockId',
  'seed',
  'recorderIdentity',
  'recordedAt',
] as const);
const PROVIDER_SUBJECT_FIELDS = Object.freeze([
  'providerId',
  'providerBuildDigest',
  'manifestDigest',
  'environmentDigest',
] as const);
const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const validDigest = (value: unknown): value is string => typeof value === 'string' && digest.test(value);
const nonnegativeSafeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
function snapshotSubject(subject: unknown): Subject | undefined {
  const snapshot = snapshotDataObject(subject);
  if (!snapshot) return undefined;
  const hasProviderBinding = PROVIDER_SUBJECT_FIELDS.some((field) => Object.hasOwn(snapshot, field));
  const fields = hasProviderBinding
    ? [...REALIZATION_SUBJECT_FIELDS, ...PROVIDER_SUBJECT_FIELDS]
    : REALIZATION_SUBJECT_FIELDS;
  if (!hasExactKeys(snapshot, fields)) return undefined;
  if (
    ![
      snapshot.candidateContentDigest,
      snapshot.candidateTree,
      snapshot.executionBaseTree,
      snapshot.buildDigest,
      snapshot.toolchainDigest,
      snapshot.catalogDigest,
      snapshot.fixtureDigest,
    ].every(validDigest)
  )
    return undefined;
  if (![snapshot.candidateCommit, snapshot.executionBaseCommit, snapshot.mergeBaseCommit].every(nonEmptyString))
    return undefined;
  if (
    snapshot.topologyVersion !== TOPOLOGY_VERSION ||
    ![snapshot.suiteVersion, snapshot.probeVersion, snapshot.clockId, snapshot.seed, snapshot.recorderIdentity].every(
      nonEmptyString,
    ) ||
    !nonnegativeSafeInteger(snapshot.recordedAt)
  )
    return undefined;
  if (
    !hasProviderBinding ||
    (nonEmptyString(snapshot.providerId) &&
      [snapshot.providerBuildDigest, snapshot.manifestDigest, snapshot.environmentDigest].every(validDigest))
  )
    return Object.freeze({ ...snapshot }) as Subject;
  return undefined;
}
export function parseRecordFrame(
  frame: unknown,
): Readonly<{ ok: true; value: RecordInput }> | Readonly<{ ok: false; reason: string }> {
  if (!(typeof frame === 'string' || (ArrayBuffer.isView(frame) && frame instanceof Uint8Array)))
    return { ok: false, reason: 'FC-INPUT: canonical codec frame required' };
  const decoded = decodeFrame(typeof frame === 'string' ? new TextEncoder().encode(frame) : frame);
  const decodedValue = decoded.ok ? decoded.value : undefined;
  const payload = snapshotExactObject(decodedValue, [
    'key',
    'bytes',
    'suite',
    'status',
    'subject',
    'independentRecorder',
    'complete',
    'attempt',
  ]);
  if (!decoded.ok || !payload) return { ok: false, reason: 'FC-INPUT: exact record schema required' };
  if (
    typeof payload.key !== 'string' ||
    typeof payload.bytes !== 'string' ||
    !isSuite(String(payload.suite)) ||
    !['pass', 'fail', 'not-recordable'].includes(String(payload.status)) ||
    typeof payload.independentRecorder !== 'string' ||
    typeof payload.complete !== 'boolean' ||
    typeof payload.attempt !== 'number' ||
    !Number.isSafeInteger(payload.attempt) ||
    payload.attempt < 1
  )
    return { ok: false, reason: 'FC-INPUT: invalid record values' };
  const subject = snapshotSubject(payload.subject);
  if (!subject) return { ok: false, reason: 'FC-SUBJECT: invalid exact subject' };
  return {
    ok: true,
    value: {
      key: payload.key as string,
      bytes: payload.bytes as string,
      suite: payload.suite as SuiteId,
      status: payload.status as ResultStatus,
      subject,
      independentRecorder: payload.independentRecorder as string,
      complete: payload.complete as boolean,
      attempt: payload.attempt as number,
    },
  };
}

export function append(
  records: readonly EvidenceRecord[],
  frame: unknown,
): Readonly<{
  status: ResultStatus;
  records: readonly EvidenceRecord[];
  reason?: string;
  failureClass?: HarnessFailureFamily;
}> {
  const prepared = prepareRecords(records);
  if (prepared.reasons.length)
    return {
      status: 'not-recordable',
      records: Object.freeze([]),
      reason: 'input:records',
      failureClass: 'FC-INPUT',
    };
  const parsed = parseRecordFrame(frame);
  if (!parsed.ok)
    return { status: 'not-recordable', records: prepared.records, reason: parsed.reason, failureClass: 'FC-INPUT' };
  const input = parsed.value;
  if (!input.complete)
    return {
      status: 'not-recordable',
      records: prepared.records,
      reason: 'incomplete:subject',
      failureClass: 'FC-EVIDENCE',
    };
  if (input.independentRecorder === input.subject.providerId)
    return {
      status: 'not-recordable',
      records: prepared.records,
      reason: 'self-attestation:provider',
      failureClass: 'FC-EVIDENCE',
    };
  const duplicate = prepared.records.find((record) => record.key === input.key);
  if (duplicate)
    return duplicate.bytes === input.bytes
      ? { status: duplicate.status, records: prepared.records }
      : {
          status: 'not-recordable',
          records: prepared.records,
          reason: 'duplicate:key-bytes',
          failureClass: 'FC-INPUT',
        };
  const record = Object.freeze({ ...input, schemaVersion: CONFORMANCE_VERSION });
  if (
    input.subject.recorderIdentity === PROVIDER_RECORDER_ID &&
    input.independentRecorder === PROVIDER_RECORDER_ID &&
    input.subject.providerId !== undefined
  )
    providerRecorderEvidence.add(record);
  return {
    status: input.status,
    records: Object.freeze([...prepared.records, record]),
  };
}

const SUBJECT_FIELDS = Object.freeze([
  'candidateContentDigest',
  'candidateCommit',
  'candidateTree',
  'executionBaseCommit',
  'executionBaseTree',
  'mergeBaseCommit',
  'buildDigest',
  'toolchainDigest',
  'catalogDigest',
  'topologyVersion',
  'suiteVersion',
  'probeVersion',
  'fixtureDigest',
  'clockId',
  'seed',
  'recorderIdentity',
  'recordedAt',
  'providerId',
  'providerBuildDigest',
  'manifestDigest',
  'environmentDigest',
] as const);
const EVIDENCE_RECORD_FIELDS = Object.freeze([
  'key',
  'bytes',
  'suite',
  'status',
  'subject',
  'independentRecorder',
  'complete',
  'attempt',
  'schemaVersion',
] as const);
function snapshotRecord(record: unknown): Readonly<Record<string, unknown>> | undefined {
  const snapshot = snapshotExactObject(record, EVIDENCE_RECORD_FIELDS);
  if (!snapshot) return undefined;
  const subject = snapshotDataObject(snapshot.subject);
  return subject ? Object.freeze({ ...snapshot, subject }) : undefined;
}
function recordValidationIssue(record: Readonly<Record<string, unknown>>): 'invalid' | 'self-attestation' | undefined {
  const subject = snapshotSubject(record.subject);
  if (
    record.schemaVersion !== CONFORMANCE_VERSION ||
    typeof record.key !== 'string' ||
    typeof record.bytes !== 'string' ||
    typeof record.suite !== 'string' ||
    !['pass', 'fail', 'not-recordable'].includes(String(record.status)) ||
    typeof record.independentRecorder !== 'string' ||
    typeof record.complete !== 'boolean' ||
    typeof record.attempt !== 'number' ||
    !Number.isSafeInteger(record.attempt) ||
    record.attempt < 1 ||
    !subject
  )
    return 'invalid';
  return record.independentRecorder === subject.providerId ? 'self-attestation' : undefined;
}
function prepareRecords(
  records: unknown,
): Readonly<{ records: readonly EvidenceRecord[]; reasons: readonly string[] }> {
  const values = snapshotArray(records);
  if (!values) return Object.freeze({ records: Object.freeze([]), reasons: Object.freeze(['input:records']) });
  const snapshots = values.map(snapshotRecord);
  const reasons = recordValidationReasons(snapshots);
  return Object.freeze({ records: Object.freeze(snapshots) as readonly EvidenceRecord[], reasons });
}
function recordValidationReasons(
  records: readonly (Readonly<Record<string, unknown>> | undefined)[],
): readonly string[] {
  const reasons: string[] = [];
  for (const [index, record] of records.entries()) {
    const issue = record ? recordValidationIssue(record) : 'invalid';
    if (issue) reasons.push(`${issue}:record:${index}`);
  }
  return Object.freeze(reasons);
}
function snapshotRoutes(routes: unknown): readonly RouteEvidence[] | undefined {
  const values = snapshotArray(routes);
  if (!values) return undefined;
  const snapshots: RouteEvidence[] = [];
  for (const route of values) {
    const routeSnapshot = snapshotExactObject(route, ['route', 'elements']);
    const elements = routeSnapshot ? snapshotArray(routeSnapshot.elements) : undefined;
    if (!routeSnapshot || typeof routeSnapshot.route !== 'string' || !elements) return undefined;
    const elementSnapshots: Array<RouteEvidence['elements'][number]> = [];
    for (const element of elements) {
      const snapshot = snapshotExactObject(element, ['kind', 'id', 'status']);
      if (!snapshot || typeof snapshot.kind !== 'string' || typeof snapshot.id !== 'string') return undefined;
      if (!['pass', 'fail', 'not-run'].includes(String(snapshot.status))) return undefined;
      elementSnapshots.push(
        Object.freeze({
          kind: snapshot.kind,
          id: snapshot.id,
          status: snapshot.status,
        }) as RouteEvidence['elements'][number],
      );
    }
    snapshots.push(
      Object.freeze({
        route: routeSnapshot.route as ProductRouteId,
        elements: Object.freeze(elementSnapshots),
      }),
    );
  }
  return Object.freeze(snapshots);
}
function subjectMismatch(left: Subject, right: Subject): string | undefined {
  return SUBJECT_FIELDS.find((field) => left[field] !== right[field]);
}
function gateResult(gate: GateId, reasons: string[]): GateResult {
  const result = Object.freeze({
    gate,
    passed: reasons.length === 0,
    reasons: Object.freeze(reasons),
    ...(reasons.length ? { failureClass: classifyGateReason(reasons[0]) } : {}),
  });
  gateResults.add(result);
  return result;
}
function suiteGate(
  gate: GateId,
  expected: readonly SuiteId[],
  records: readonly EvidenceRecord[],
  subject: Subject,
): GateResult {
  const expectedSubject = snapshotSubject(subject);
  if (!expectedSubject) return gateResult(gate, ['invalid:subject']);
  const prepared = prepareRecords(records);
  const reasons = [...prepared.reasons];
  if (reasons.length) return gateResult(gate, reasons);
  const seen = new Set<string>();
  for (const [index, record] of prepared.records.entries()) {
    if (record.suite !== expected[index]) reasons.push(`order:${record.suite}`);
    if (seen.has(record.suite)) reasons.push(`duplicate:${record.suite}`);
    seen.add(record.suite);
    const field = subjectMismatch(record.subject, expectedSubject);
    if (field) reasons.push(`mismatched:${record.suite}:${field}`);
    if (!record.complete || record.status !== 'pass') reasons.push(`not-passing:${record.suite}`);
  }
  for (const suite of expected) if (!seen.has(suite)) reasons.push(`missing:${suite}`);
  for (const suite of seen) if (!expected.includes(suite as SuiteId)) reasons.push(`unknown:${suite}`);
  return gateResult(gate, reasons);
}
export function evaluateRealization(records: readonly EvidenceRecord[], subject: Subject): GateResult {
  return suiteGate('CF-GATE-REALIZATION', REALIZATION_SUITES, records, subject);
}
export function evaluateProvider(port: PortId, records: readonly EvidenceRecord[], subject: Subject): GateResult {
  const expectedSubject = snapshotSubject(subject);
  if (!expectedSubject) return gateResult('CF-GATE-PROVIDER', ['invalid:subject']);
  const prepared = prepareRecords(records);
  if (prepared.reasons.length) return gateResult('CF-GATE-PROVIDER', [...prepared.reasons]);
  const suite = (Object.entries(MECHANISM_PORTS).find(([, value]) => value === port)?.[0] ?? '') as SuiteId;
  const result = suiteGate(
    'CF-GATE-PROVIDER',
    [suite],
    prepared.records.filter((record) => record.suite === suite),
    expectedSubject,
  );
  const reasons = [...result.reasons];
  if (
    !expectedSubject.providerId ||
    !expectedSubject.providerBuildDigest ||
    !expectedSubject.manifestDigest ||
    !expectedSubject.environmentDigest
  )
    reasons.push('missing:provider-binding');
  if (
    expectedSubject.recorderIdentity !== PROVIDER_RECORDER_ID ||
    !prepared.records.every((record) => providerRecorderEvidence.has(record))
  )
    reasons.push('missing:independent-recorder-provenance');
  return gateResult('CF-GATE-PROVIDER', reasons);
}
export function evaluateProduct(
  records: readonly EvidenceRecord[],
  routes: readonly RouteEvidence[],
  subject: Subject,
): GateResult {
  const expectedSubject = snapshotSubject(subject);
  if (!expectedSubject) return gateResult('CF-GATE-PRODUCT', ['invalid:subject']);
  const prepared = prepareRecords(records);
  if (prepared.reasons.length) return gateResult('CF-GATE-PRODUCT', [...prepared.reasons]);
  const safeRoutes = snapshotRoutes(routes);
  if (!safeRoutes) return gateResult('CF-GATE-PRODUCT', ['input:routes']);
  const result = suiteGate('CF-GATE-PRODUCT', SUITES, prepared.records, expectedSubject);
  const reasons = [...result.reasons];
  for (const port of Object.values(MECHANISM_PORTS)) {
    const provider = evaluateProvider(port, prepared.records, expectedSubject);
    if (!provider.passed) reasons.push(`provider-proof:${port}`);
  }
  if (safeRoutes.length !== PRODUCT_ROUTE_ORACLE.length) reasons.push('routes:length');
  for (const [index, expected] of PRODUCT_ROUTE_ORACLE.entries()) {
    const actual = safeRoutes[index];
    if (!actual || actual.route !== expected.id) {
      reasons.push(`route:${expected.id}`);
      continue;
    }
    if (actual.elements.length !== expected.elements.length) {
      reasons.push(`route-elements:${expected.id}`);
      continue;
    }
    for (const [elementIndex, element] of expected.elements.entries()) {
      const observed = actual.elements[elementIndex];
      if (!observed || observed.kind !== element.kind || observed.id !== element.id || observed.status !== 'pass')
        reasons.push(`route-element:${expected.id}:${elementIndex}`);
    }
  }
  return gateResult('CF-GATE-PRODUCT', reasons);
}
