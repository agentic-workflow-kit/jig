import { type CanonicalJson, parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';

export const OPERATION_STATE_VERSION = 'jig.operation.v1';
export const OPERATION_RECORD_SCHEMA = 'jig.operation-record.v1';
export const OPERATION_TYPES = Object.freeze([
  'OPC-SESSION-OPEN',
  'OPC-SESSION-ASSIGN',
  'OPC-SESSION-COLLECT',
  'OPC-SESSION-RESPOND',
  'OPC-SESSION-CLOSE',
  'OPC-WS-PROVISION',
  'OPC-WS-SETUP',
  'OPC-WS-OBSERVE',
  'OPC-WS-PRESERVE',
  'OPC-WS-RETIRE',
  'OPC-VERIFY-EXECUTE',
  'OPC-REV-PUBLISH',
  'OPC-REV-REQUEST',
  'OPC-REV-STATUS',
  'OPC-REV-COMMENT',
  'OPC-REV-RETIRE-REF',
  'OPC-REV-RETIRE-REQUEST',
  'OPC-REV-RETIRE-STATUS',
  'OPC-REV-RETIRE-COMMENT',
  'OPC-DEL-ANCHOR',
  'OPC-DEL-PUBLISH',
  'OPC-DEL-REQUEST',
  'OPC-DEL-STATUS',
  'OPC-DEL-COMMENT',
  'OPC-DEL-MERGE',
  'OPC-DEL-OBSERVE',
  'OPC-ART-PUT',
  'OPC-ART-GET',
  'OPC-ART-DISPOSE',
] as const);

export type OperationType = (typeof OPERATION_TYPES)[number];
export type OperationEffect = 'effectful' | 'observation';
export type OperationFailureFamily =
  | 'FC-INPUT'
  | 'FC-SUBJECT'
  | 'FC-FENCE'
  | 'FC-AUTHORITY'
  | 'FC-ORDERING'
  | 'FC-BOUND'
  | 'FC-MECHANISM'
  | 'FC-EFFECT'
  | 'FC-TRUST';
export type OperationFailure = Readonly<{ family: OperationFailureFamily; code: string }>;
export type OperationResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: OperationFailure }>;

export type OperationSubject = Readonly<{ run: string; story: string; basis: string }>;
export type OperationFence = Readonly<{
  generation: string;
  basis: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
}>;
export type OperationAuthority = Readonly<{ authority: string; registry: string; basis: string }>;
export type OperationCapabilityKind =
  | 'CB-SESSION'
  | 'CB-WORKSPACE'
  | 'CB-VERIFY'
  | 'CB-REVIEW-PUBLICATION'
  | 'CB-DELIVERY'
  | 'CB-STORE';
export type OperationCapabilityPort =
  | 'PORT-SESSION'
  | 'PORT-WORKSPACE'
  | 'PORT-VERIFY'
  | 'PORT-DELIVERY'
  | 'PORT-ARTIFACT';
export type OperationCapability = Readonly<{
  kind: OperationCapabilityKind;
  port: OperationCapabilityPort;
  operationClass: OperationType;
  subject: OperationSubject['story'];
  fence: OperationFence;
  resourceScope: string;
  manifest: string;
  digest: string;
}>;
export type OperationBounds = Readonly<{ waitMs: number; retryLimit: number; recoveryLimit: number }>;
export type OperationPurpose = 'semantic' | 'replacement' | 'reconciliation';
export type TransitionOperationIntent = Readonly<{
  type: OperationType;
  transaction: string;
  event: string;
  operation: string;
  subject: OperationSubject;
  payloadBasisDigest: string;
  fence: OperationFence;
  capability: OperationCapability;
  authority: OperationAuthority | null;
  role: string;
  lifecycle: string;
  effect: OperationEffect;
  purpose: OperationPurpose;
  predecessor: string | null;
  bounds: OperationBounds;
}>;

type Subject = OperationSubject;
type Fence = OperationFence;
type Authority = OperationAuthority;
type CapabilityKind = OperationCapabilityKind;
type CapabilityPort = OperationCapabilityPort;
type Capability = OperationCapability;
type Bounds = OperationBounds;
export type OperationCommitProof = Readonly<{
  kind: 'committed-witnessed';
  position: number;
  event: string;
  transaction: string;
  recordDigest: string;
  witnessDigest: string;
}>;
type IntentRecord = Readonly<{
  kind: 'intent';
  version: typeof OPERATION_STATE_VERSION;
  operation: string;
  transaction: string;
  event: string;
  type: OperationType;
  subject: Subject;
  payloadBasisDigest: string;
  fence: Fence;
  capability: Capability;
  authority: Authority | null;
  role: string;
  lifecycle: string;
  effect: OperationEffect;
  purpose: OperationPurpose;
  predecessor: string | null;
  bounds: Bounds;
  proof: OperationCommitProof;
}>;
type Reauthorization = Readonly<{
  previousAttempt: number;
  confirmedAbsenceDigest: string;
  generation: string;
  fence: Fence;
  capability: Capability;
  authority: Authority | null;
  role: string;
  lifecycle: string;
}>;
type AttemptRecord = Readonly<{
  kind: 'attempt';
  operation: string;
  ordinal: number;
  generation: string;
  fence: Fence;
  capability: Capability;
  authority: Authority | null;
  role: string;
  lifecycle: string;
  startedAt: number;
  deadline: number;
  reauthorization: Reauthorization | null;
  proof: OperationCommitProof;
}>;
type DispatchRecord = Readonly<{
  kind: 'dispatch';
  operation: string;
  ordinal: number;
  proof: OperationCommitProof;
}>;
type ResultRecord = Readonly<{
  kind: 'result';
  operation: string;
  ordinal: number;
  mechanism: string;
  provider: string;
  subject: Subject;
  fence: Fence;
  capability: Capability;
  authority: Authority | null;
  role: string;
  lifecycle: string;
  observation: Readonly<{ kind: string; digest: string }>;
  successClaim: 'observed' | 'absent';
  proof: OperationCommitProof;
}>;
type CertaintyRecord = Readonly<{
  kind: 'certainty';
  operation: string;
  ordinal: number;
  certainty: 'confirmed-effect' | 'confirmed-absence';
  observationDigest: string;
  proof: OperationCommitProof;
}>;
type UncertaintyRecord = Readonly<{
  kind: 'uncertainty';
  operation: string;
  ordinal: number;
  reason: 'lost-response' | 'timeout' | 'cancelled';
  proof: OperationCommitProof;
}>;
type ReconciliationRecord = Readonly<{
  kind: 'reconciliation';
  operation: string;
  ordinal: number;
  observationOperation: string;
  outcome: 'confirmed-effect' | 'confirmed-absence' | 'indeterminate';
  observationDigest: string;
  proof: OperationCommitProof;
}>;
type AdoptionRecord = Readonly<{ kind: 'adoption'; operation: string; proof: OperationCommitProof }>;
type ReplacementRecord = Readonly<{
  kind: 'replacement';
  operation: string;
  replacement: string;
  proof: OperationCommitProof;
}>;
type JournalRecord =
  | IntentRecord
  | AttemptRecord
  | DispatchRecord
  | ResultRecord
  | CertaintyRecord
  | UncertaintyRecord
  | ReconciliationRecord
  | AdoptionRecord
  | ReplacementRecord;
export type OperationJournalEntry = Readonly<{
  position: number;
  previousDigest: string;
  digest: string;
  record: JournalRecord;
}>;
export type OperationJournalSnapshot = Readonly<{
  version: typeof OPERATION_STATE_VERSION;
  entries: readonly OperationJournalEntry[];
  head: Readonly<{ position: number; digest: string }>;
}>;
export type OperationRecordCarrier = Readonly<{
  schema: typeof OPERATION_RECORD_SCHEMA;
  record: CanonicalJson;
}>;
export type OperationProofVerifier = Readonly<{
  verify(proof: OperationCommitProof, carrier: OperationRecordCarrier): OperationResult<void>;
}>;

type OperationStatus =
  | 'intent-recorded'
  | 'attempt-recorded'
  | 'dispatch-crossed'
  | 'result-recorded'
  | 'uncertain'
  | 'confirmed-effect'
  | 'confirmed-absence'
  | 'adopted'
  | 'parked'
  | 'superseded';
export type OperationProjection = Readonly<{
  operation: string;
  type: OperationType;
  effect: OperationEffect;
  status: OperationStatus;
  payloadBasisDigest: string;
  subject: Subject;
  retainedFence: Fence;
  capability: Capability;
  authority: Authority | null;
  attempts: readonly AttemptRecord[];
  result: ResultRecord | null;
  certainty: CertaintyRecord | ReconciliationRecord | null;
  reconciliations: readonly ReconciliationRecord[];
  adoptedAt: OperationCommitProof | null;
  supersededBy: string | null;
}>;
type MutableProjection = {
  operation: string;
  type: OperationType;
  effect: OperationEffect;
  status: OperationStatus;
  payloadBasisDigest: string;
  subject: Subject;
  retainedFence: Fence;
  capability: Capability;
  authority: Authority | null;
  attempts: AttemptRecord[];
  result: ResultRecord | null;
  certainty: CertaintyRecord | ReconciliationRecord | null;
  reconciliations: ReconciliationRecord[];
  adoptedAt: OperationCommitProof | null;
  supersededBy: string | null;
  intent: IntentRecord;
};

export type DispatchPermit = Readonly<{
  version: typeof OPERATION_STATE_VERSION;
  operation: string;
  ordinal: number;
  type: OperationType;
  subject: Subject;
  fence: Fence;
  capability: Capability;
  authority: Authority | null;
  role: string;
  lifecycle: string;
  proof: OperationCommitProof;
  purpose: IntentRecord['purpose'];
  predecessor: string | null;
}>;
export type OperationJournal = Readonly<{
  recordIntent(input: unknown): OperationResult<OperationProjection>;
  recordAttempt(input: unknown): OperationResult<OperationProjection>;
  recordDispatch(input: unknown): OperationResult<DispatchPermit>;
  recordResult(input: unknown): OperationResult<OperationProjection>;
  recordCertainty(input: unknown): OperationResult<OperationProjection>;
  recordUncertainty(input: unknown): OperationResult<OperationProjection>;
  recordReconciliation(input: unknown): OperationResult<OperationProjection>;
  adopt(input: unknown): OperationResult<OperationProjection>;
  replaceObservation(input: unknown): OperationResult<OperationProjection>;
  state(operation: unknown): OperationResult<OperationProjection>;
  pendingEffects(): readonly OperationProjection[];
  snapshot(): OperationJournalSnapshot;
}>;

const ZERO_DIGEST = '0'.repeat(64);
const WAIT_DEFAULT_MS = 15 * 60 * 1000;
const WAIT_MIN_MS = 5_000;
const WAIT_MAX_MS = 2 * 60 * 60 * 1000;
const RETRY_DEFAULT = 3;
const RECOVERY_DEFAULT = 3;
const COUNT_MIN = 1;
const COUNT_MAX = 5;
const OBSERVATIONS = new Set<OperationType>([
  'OPC-SESSION-COLLECT',
  'OPC-WS-OBSERVE',
  'OPC-VERIFY-EXECUTE',
  'OPC-REV-STATUS',
  'OPC-REV-RETIRE-STATUS',
  'OPC-DEL-STATUS',
  'OPC-DEL-OBSERVE',
  'OPC-ART-GET',
]);

const fail = (family: OperationFailureFamily, code: string): OperationResult<never> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });
const ok = <T>(value: T): OperationResult<T> => Object.freeze({ ok: true, value });
const digest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
const integer = (value: unknown, minimum = 0): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;
const boundedText = (value: unknown, maximum = 512): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= maximum && value.normalize('NFC') === value;
const operationType = (value: unknown): value is OperationType =>
  typeof value === 'string' && OPERATION_TYPES.includes(value as OperationType);
export const operationEffect = (type: OperationType): OperationEffect =>
  OBSERVATIONS.has(type) ? 'observation' : 'effectful';
const effectFor = operationEffect;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function fields(value: unknown, names: readonly string[]): Record<string, unknown> | undefined {
  try {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    if (
      Object.keys(descriptors).sort().join(',') !== [...names].sort().join(',') ||
      !Object.values(descriptors).every((descriptor) => 'value' in descriptor)
    )
      return undefined;
    for (const name of names) {
      const descriptor = descriptors[name];
      if (
        descriptor === undefined ||
        !('value' in descriptor) ||
        !Object.is(Reflect.get(value, name), (descriptor as PropertyDescriptor & { value: unknown }).value)
      )
        return undefined;
    }
    return Object.freeze(
      Object.fromEntries(
        names.map((name) => [name, (descriptors[name] as PropertyDescriptor & { value: unknown }).value]),
      ),
    );
  } catch {
    return undefined;
  }
}

function array(value: unknown): readonly unknown[] | undefined {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const length = descriptors.length;
    if (!length || !('value' in length) || !integer(length.value)) return undefined;
    const output: unknown[] = [];
    for (let index = 0; index < length.value; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !('value' in descriptor)) return undefined;
      output.push(descriptor.value);
    }
    return Object.freeze(output);
  } catch {
    return undefined;
  }
}

function sameSubject(left: Subject, right: Subject): boolean {
  return left.run === right.run && left.story === right.story && left.basis === right.basis;
}
function sameLedgerPosition(transaction: string, event: string): boolean {
  const transactionPosition = /\/txn\/([0-9]+)\//u.exec(transaction)?.[1];
  const eventPosition = /\/event\/([0-9]+)$/u.exec(event)?.[1];
  return transactionPosition !== undefined && transactionPosition === eventPosition;
}
function sameFence(left: Fence, right: Fence): boolean {
  return (
    left.generation === right.generation &&
    left.basis === right.basis &&
    left.candidateContentDigest === right.candidateContentDigest &&
    left.targetBasisDigest === right.targetBasisDigest
  );
}
function sameAuthority(left: Authority | null, right: Authority | null): boolean {
  return (
    (left === null && right === null) ||
    (left !== null &&
      right !== null &&
      left.authority === right.authority &&
      left.registry === right.registry &&
      left.basis === right.basis)
  );
}
function sameCapability(left: Capability, right: Capability): boolean {
  return (
    left.kind === right.kind &&
    left.port === right.port &&
    left.operationClass === right.operationClass &&
    left.subject === right.subject &&
    sameFence(left.fence, right.fence) &&
    left.resourceScope === right.resourceScope &&
    left.manifest === right.manifest &&
    left.digest === right.digest
  );
}

function subjectValue(value: unknown): Subject | undefined {
  const raw = fields(value, ['run', 'story', 'basis']);
  if (
    !raw ||
    typeof raw.run !== 'string' ||
    typeof raw.story !== 'string' ||
    !digest(raw.basis) ||
    !parseIdentity('ID-RUN', raw.run).ok ||
    !parseIdentity('ID-STORY', raw.story).ok ||
    !raw.story.startsWith(`${raw.run}/story/`)
  )
    return undefined;
  return deepFreeze({ run: raw.run, story: raw.story, basis: raw.basis });
}
function fenceValue(value: unknown, run?: string): Fence | undefined {
  const raw = fields(value, ['generation', 'basis', 'candidateContentDigest', 'targetBasisDigest']);
  if (
    !raw ||
    typeof raw.generation !== 'string' ||
    !digest(raw.basis) ||
    !digest(raw.candidateContentDigest) ||
    !digest(raw.targetBasisDigest) ||
    !parseIdentity('ID-GEN', raw.generation).ok ||
    (run !== undefined && !raw.generation.startsWith(`${run}/gen/`))
  )
    return undefined;
  return deepFreeze({
    generation: raw.generation,
    basis: raw.basis,
    candidateContentDigest: raw.candidateContentDigest,
    targetBasisDigest: raw.targetBasisDigest,
  });
}
function authorityValue(value: unknown, basis: string): Authority | null | undefined {
  if (value === null) return null;
  const raw = fields(value, ['authority', 'registry', 'basis']);
  if (
    !raw ||
    typeof raw.authority !== 'string' ||
    typeof raw.registry !== 'string' ||
    raw.basis !== basis ||
    !parseIdentity('ID-AUTH', raw.authority).ok ||
    !parseIdentity('ID-REGISTRY', raw.registry).ok
  )
    return undefined;
  return deepFreeze({ authority: raw.authority, registry: raw.registry, basis });
}

export function operationCapabilityRoute(
  type: OperationType,
): Readonly<{ kind: OperationCapabilityKind; port: OperationCapabilityPort }> {
  if (type.startsWith('OPC-SESSION-')) return { kind: 'CB-SESSION', port: 'PORT-SESSION' };
  if (type.startsWith('OPC-WS-')) return { kind: 'CB-WORKSPACE', port: 'PORT-WORKSPACE' };
  if (type === 'OPC-VERIFY-EXECUTE') return { kind: 'CB-VERIFY', port: 'PORT-VERIFY' };
  if (type.startsWith('OPC-REV-')) return { kind: 'CB-REVIEW-PUBLICATION', port: 'PORT-DELIVERY' };
  if (type.startsWith('OPC-DEL-')) return { kind: 'CB-DELIVERY', port: 'PORT-DELIVERY' };
  return { kind: 'CB-STORE', port: 'PORT-ARTIFACT' };
}
const expectedRoute = operationCapabilityRoute;

function capabilityValue(value: unknown, type: OperationType, subject: Subject, fence: Fence): Capability | undefined {
  const raw = fields(value, [
    'kind',
    'port',
    'operationClass',
    'subject',
    'fence',
    'resourceScope',
    'manifest',
    'digest',
  ]);
  const expected = expectedRoute(type);
  const capabilityFence = raw ? fenceValue(raw.fence, subject.run) : undefined;
  const derived =
    raw && capabilityFence
      ? stageDigest({
          domain: 'OPERATION-CAPABILITY',
          excludePaths: ['digest'],
          value: {
            kind: raw.kind,
            port: raw.port,
            operationClass: raw.operationClass,
            subject: raw.subject,
            fence: capabilityFence,
            resourceScope: raw.resourceScope,
            manifest: raw.manifest,
            digest: '',
          } as CanonicalJson,
        })
      : undefined;
  if (
    !raw ||
    raw.kind !== expected.kind ||
    raw.port !== expected.port ||
    raw.operationClass !== type ||
    raw.subject !== subject.story ||
    !capabilityFence ||
    !sameFence(capabilityFence, fence) ||
    !boundedText(raw.resourceScope, 1024) ||
    typeof raw.manifest !== 'string' ||
    !parseIdentity('ID-MANIFEST', raw.manifest).ok ||
    !digest(raw.digest) ||
    !derived?.ok ||
    raw.digest !== derived.value.digest
  )
    return undefined;
  return deepFreeze({
    kind: raw.kind as CapabilityKind,
    port: raw.port as CapabilityPort,
    operationClass: type,
    subject: subject.story,
    fence: capabilityFence,
    resourceScope: raw.resourceScope,
    manifest: raw.manifest,
    digest: raw.digest,
  });
}

export function deriveOperationCapabilityDigest(value: unknown): OperationResult<string> {
  const raw = fields(value, ['kind', 'port', 'operationClass', 'subject', 'fence', 'resourceScope', 'manifest']);
  if (!raw || !operationType(raw.operationClass)) return fail('FC-INPUT', 'INVALID_CAPABILITY');
  const subjectValue = typeof raw.subject === 'string' ? raw.subject : undefined;
  const run = subjectValue?.split('/story/')[0];
  const parsedFence = fenceValue(raw.fence, run);
  if (
    !subjectValue ||
    !run ||
    !parsedFence ||
    !boundedText(raw.resourceScope, 1024) ||
    typeof raw.manifest !== 'string' ||
    !parseIdentity('ID-MANIFEST', raw.manifest).ok
  )
    return fail('FC-INPUT', 'INVALID_CAPABILITY');
  const route = expectedRoute(raw.operationClass);
  if (raw.kind !== route.kind || raw.port !== route.port) return fail('FC-INPUT', 'INVALID_CAPABILITY');
  const staged = stageDigest({
    domain: 'OPERATION-CAPABILITY',
    excludePaths: ['digest'],
    value: {
      kind: raw.kind,
      port: raw.port,
      operationClass: raw.operationClass,
      subject: subjectValue,
      fence: parsedFence,
      resourceScope: raw.resourceScope,
      manifest: raw.manifest,
      digest: '',
    } as CanonicalJson,
  });
  return staged.ok ? ok(staged.value.digest) : fail('FC-INPUT', 'INVALID_CAPABILITY');
}

export function validateTransitionOperation(value: unknown): OperationResult<TransitionOperationIntent> {
  const raw = fields(value, [
    'type',
    'transaction',
    'event',
    'operation',
    'subject',
    'payloadBasisDigest',
    'fence',
    'capability',
    'authority',
    'role',
    'lifecycle',
    'effect',
    'purpose',
    'predecessor',
    'bounds',
  ]);
  if (!raw || !operationType(raw.type)) return fail('FC-INPUT', 'INVALID_TRANSITION_OPERATION');
  const subject = subjectValue(raw.subject);
  const fence = subject ? fenceValue(raw.fence, subject.run) : undefined;
  const capability = subject && fence ? capabilityValue(raw.capability, raw.type, subject, fence) : undefined;
  const authority = fence ? authorityValue(raw.authority, fence.targetBasisDigest) : undefined;
  const bounds = boundsValue(raw.bounds);
  if (
    !subject ||
    !fence ||
    !capability ||
    authority === undefined ||
    !bounds ||
    typeof raw.transaction !== 'string' ||
    typeof raw.event !== 'string' ||
    typeof raw.operation !== 'string' ||
    !parseIdentity('ID-TXN', raw.transaction).ok ||
    !parseIdentity('ID-EVENT', raw.event).ok ||
    !parseIdentity('ID-OP', raw.operation).ok ||
    !raw.transaction.startsWith(`${subject.run}/txn/`) ||
    !raw.event.startsWith(`${subject.run}/event/`) ||
    !raw.operation.startsWith(`${raw.transaction}/op/`) ||
    !sameLedgerPosition(raw.transaction, raw.event) ||
    !raw.transaction.includes(`/${fence.generation}|`) ||
    !digest(raw.payloadBasisDigest) ||
    !boundedText(raw.role) ||
    !boundedText(raw.lifecycle) ||
    raw.effect !== effectFor(raw.type) ||
    (raw.purpose !== 'semantic' && raw.purpose !== 'replacement' && raw.purpose !== 'reconciliation') ||
    (raw.predecessor !== null &&
      (typeof raw.predecessor !== 'string' ||
        !parseIdentity('ID-OP', raw.predecessor).ok ||
        raw.predecessor === raw.operation)) ||
    (raw.purpose === 'semantic' && raw.predecessor !== null) ||
    (raw.purpose !== 'semantic' && raw.predecessor === null) ||
    subject.basis !== fence.basis ||
    (capability.kind === 'CB-DELIVERY') !== (authority !== null)
  )
    return fail('FC-SUBJECT', 'INVALID_TRANSITION_OPERATION_BINDING');
  return ok(
    deepFreeze({
      type: raw.type,
      transaction: raw.transaction,
      event: raw.event,
      operation: raw.operation,
      subject,
      payloadBasisDigest: raw.payloadBasisDigest,
      fence,
      capability,
      authority,
      role: raw.role,
      lifecycle: raw.lifecycle,
      effect: raw.effect as OperationEffect,
      purpose: raw.purpose as OperationPurpose,
      predecessor: raw.predecessor as string | null,
      bounds,
    }),
  );
}

function boundsValue(value: unknown): Bounds | undefined {
  const raw = fields(value, ['waitMs', 'retryLimit', 'recoveryLimit']);
  if (
    !raw ||
    !integer(raw.waitMs, WAIT_MIN_MS) ||
    raw.waitMs > WAIT_MAX_MS ||
    !integer(raw.retryLimit, COUNT_MIN) ||
    raw.retryLimit > COUNT_MAX ||
    !integer(raw.recoveryLimit, COUNT_MIN) ||
    raw.recoveryLimit > COUNT_MAX
  )
    return undefined;
  return deepFreeze({
    waitMs: raw.waitMs,
    retryLimit: raw.retryLimit,
    recoveryLimit: raw.recoveryLimit,
  });
}

function proofValue(value: unknown, run?: string): OperationCommitProof | undefined {
  const raw = fields(value, ['kind', 'position', 'event', 'transaction', 'recordDigest', 'witnessDigest']);
  if (
    raw?.kind !== 'committed-witnessed' ||
    !integer(raw.position) ||
    typeof raw.event !== 'string' ||
    typeof raw.transaction !== 'string' ||
    !digest(raw.recordDigest) ||
    raw.witnessDigest !== raw.recordDigest ||
    !parseIdentity('ID-EVENT', raw.event).ok ||
    !parseIdentity('ID-TXN', raw.transaction).ok ||
    raw.event !== `${run ?? raw.event.split('/event/')[0]}/event/${raw.position + 1}` ||
    (run !== undefined &&
      (!raw.event.startsWith(`${run}/event/`) || !raw.transaction.startsWith(`${run}/txn/${raw.position + 1}/`)))
  )
    return undefined;
  return deepFreeze({
    kind: 'committed-witnessed',
    position: raw.position,
    event: raw.event,
    transaction: raw.transaction,
    recordDigest: raw.recordDigest,
    witnessDigest: raw.witnessDigest,
  });
}

function intentValue(value: unknown): OperationResult<IntentRecord> {
  const raw = fields(value, [
    'version',
    'operation',
    'transaction',
    'event',
    'type',
    'subject',
    'payloadBasisDigest',
    'fence',
    'capability',
    'authority',
    'role',
    'lifecycle',
    'effect',
    'purpose',
    'predecessor',
    'bounds',
    'proof',
  ]);
  if (!raw || raw.version !== OPERATION_STATE_VERSION || !operationType(raw.type))
    return fail('FC-INPUT', 'INVALID_OPERATION_INTENT');
  const subject = subjectValue(raw.subject);
  const fence = subject ? fenceValue(raw.fence, subject.run) : undefined;
  const capability = subject && fence ? capabilityValue(raw.capability, raw.type, subject, fence) : undefined;
  const authority = fence ? authorityValue(raw.authority, fence.targetBasisDigest) : undefined;
  const bounds = boundsValue(raw.bounds);
  const proof = subject ? proofValue(raw.proof, subject.run) : undefined;
  if (
    !subject ||
    !fence ||
    !capability ||
    authority === undefined ||
    !bounds ||
    !proof ||
    typeof raw.operation !== 'string' ||
    typeof raw.transaction !== 'string' ||
    typeof raw.event !== 'string' ||
    !parseIdentity('ID-OP', raw.operation).ok ||
    !parseIdentity('ID-TXN', raw.transaction).ok ||
    !parseIdentity('ID-EVENT', raw.event).ok ||
    !raw.operation.startsWith(`${raw.transaction}/op/`) ||
    !raw.transaction.startsWith(`${subject.run}/txn/`) ||
    !raw.event.startsWith(`${subject.run}/event/`) ||
    proof.transaction !== raw.transaction ||
    proof.event !== raw.event ||
    !digest(raw.payloadBasisDigest) ||
    !boundedText(raw.role) ||
    !boundedText(raw.lifecycle) ||
    raw.effect !== effectFor(raw.type) ||
    (raw.purpose !== 'semantic' && raw.purpose !== 'replacement' && raw.purpose !== 'reconciliation') ||
    (raw.predecessor !== null &&
      (typeof raw.predecessor !== 'string' ||
        !parseIdentity('ID-OP', raw.predecessor).ok ||
        raw.predecessor === raw.operation)) ||
    (raw.purpose === 'semantic' && raw.predecessor !== null) ||
    (raw.purpose !== 'semantic' && raw.predecessor === null)
  )
    return fail('FC-SUBJECT', 'INVALID_OPERATION_BINDING');
  if (subject.basis !== fence.basis) return fail('FC-FENCE', 'FENCE_BASIS_MISMATCH');
  if ((capability.kind === 'CB-DELIVERY') !== (authority !== null))
    return fail('FC-AUTHORITY', 'FINALIZATION_AUTHORITY_BINDING_REQUIRED');
  return ok(
    deepFreeze({
      kind: 'intent',
      version: OPERATION_STATE_VERSION,
      operation: raw.operation,
      transaction: raw.transaction,
      event: raw.event,
      type: raw.type,
      subject,
      payloadBasisDigest: raw.payloadBasisDigest,
      fence,
      capability,
      authority,
      role: raw.role,
      lifecycle: raw.lifecycle,
      effect: raw.effect as OperationEffect,
      purpose: raw.purpose as IntentRecord['purpose'],
      predecessor: raw.predecessor as string | null,
      bounds,
      proof,
    } as IntentRecord),
  );
}

function attemptValue(value: unknown, state: MutableProjection): OperationResult<AttemptRecord> {
  const raw = fields(value, [
    'operation',
    'ordinal',
    'generation',
    'fence',
    'capability',
    'authority',
    'role',
    'lifecycle',
    'startedAt',
    'deadline',
    'reauthorization',
    'proof',
  ]);
  const fence = raw ? fenceValue(raw.fence, state.subject.run) : undefined;
  const capability = raw && fence ? capabilityValue(raw.capability, state.type, state.subject, fence) : undefined;
  const authority = raw && fence ? authorityValue(raw.authority, fence.targetBasisDigest) : undefined;
  const proof = raw ? proofValue(raw.proof, state.subject.run) : undefined;
  if (
    !raw ||
    raw.operation !== state.operation ||
    !integer(raw.ordinal, 1) ||
    typeof raw.generation !== 'string' ||
    !fence ||
    !capability ||
    authority === undefined ||
    !boundedText(raw.role) ||
    !boundedText(raw.lifecycle) ||
    !integer(raw.startedAt) ||
    !integer(raw.deadline) ||
    raw.deadline <= raw.startedAt ||
    raw.deadline - raw.startedAt > state.intent.bounds.waitMs ||
    !proof
  )
    return fail('FC-INPUT', 'INVALID_OPERATION_ATTEMPT');
  if (raw.generation !== fence.generation || fence.basis !== state.subject.basis)
    return fail('FC-FENCE', 'ATTEMPT_FENCE_MISMATCH');
  if (raw.ordinal !== state.attempts.length + 1 || raw.ordinal > state.intent.bounds.retryLimit)
    return fail('FC-BOUND', 'BND_RETRY_EXHAUSTED');
  let reauthorization: Reauthorization | null = null;
  if (raw.ordinal === 1) {
    if (raw.reauthorization !== null || state.status !== 'intent-recorded')
      return fail('FC-ORDERING', 'FIRST_ATTEMPT_NOT_AUTHORIZED');
    if (
      raw.generation !== state.retainedFence.generation ||
      !sameCapability(capability, state.capability) ||
      !sameAuthority(authority, state.authority) ||
      raw.role !== state.intent.role ||
      raw.lifecycle !== state.intent.lifecycle
    )
      return fail('FC-FENCE', 'INITIAL_ATTEMPT_FENCE_MISMATCH');
  } else {
    if (state.effect !== 'effectful' || state.status !== 'confirmed-absence')
      return fail('FC-EFFECT', 'CONFIRMED_ABSENCE_REQUIRED');
    const candidate = fields(raw.reauthorization, [
      'previousAttempt',
      'confirmedAbsenceDigest',
      'generation',
      'fence',
      'capability',
      'authority',
      'role',
      'lifecycle',
    ]);
    const refreshedFence = candidate ? fenceValue(candidate.fence, state.subject.run) : undefined;
    const refreshedCapability =
      candidate && refreshedFence
        ? capabilityValue(candidate.capability, state.type, state.subject, refreshedFence)
        : undefined;
    const refreshedAuthority =
      candidate && refreshedFence ? authorityValue(candidate.authority, refreshedFence.targetBasisDigest) : undefined;
    if (
      !candidate ||
      candidate.previousAttempt !== raw.ordinal - 1 ||
      !digest(candidate.confirmedAbsenceDigest) ||
      candidate.generation !== raw.generation ||
      !refreshedFence ||
      !sameFence(refreshedFence, fence) ||
      !refreshedCapability ||
      !sameCapability(refreshedCapability, capability) ||
      refreshedAuthority === undefined ||
      !sameAuthority(refreshedAuthority, authority) ||
      raw.generation === state.retainedFence.generation ||
      capability.digest === state.capability.digest ||
      candidate.role !== raw.role ||
      candidate.lifecycle !== raw.lifecycle ||
      !boundedText(candidate.role) ||
      !boundedText(candidate.lifecycle) ||
      (capability.kind === 'CB-DELIVERY' &&
        (authority === null || state.authority === null || authority.authority === state.authority.authority))
    )
      return fail('FC-FENCE', 'STALE_REAUTHORIZATION');
    if (state.certainty?.observationDigest !== candidate.confirmedAbsenceDigest)
      return fail('FC-EFFECT', 'CONFIRMED_ABSENCE_REQUIRED');
    reauthorization = deepFreeze({
      previousAttempt: candidate.previousAttempt,
      confirmedAbsenceDigest: candidate.confirmedAbsenceDigest,
      generation: candidate.generation,
      fence: refreshedFence,
      capability: refreshedCapability,
      authority: refreshedAuthority,
      role: candidate.role,
      lifecycle: candidate.lifecycle,
    });
  }
  return ok(
    deepFreeze({
      kind: 'attempt',
      operation: state.operation,
      ordinal: raw.ordinal,
      generation: raw.generation,
      fence,
      capability,
      authority,
      role: raw.role,
      lifecycle: raw.lifecycle,
      startedAt: raw.startedAt,
      deadline: raw.deadline,
      reauthorization,
      proof,
    }),
  );
}

function resultValue(value: unknown, state: MutableProjection): OperationResult<ResultRecord> {
  const raw = fields(value, [
    'operation',
    'ordinal',
    'mechanism',
    'provider',
    'subject',
    'fence',
    'capability',
    'authority',
    'role',
    'lifecycle',
    'observation',
    'successClaim',
    'proof',
  ]);
  const subject = raw ? subjectValue(raw.subject) : undefined;
  const fence = raw ? fenceValue(raw.fence, state.subject.run) : undefined;
  const capability = raw && fence ? capabilityValue(raw.capability, state.type, state.subject, fence) : undefined;
  const authority = raw && fence ? authorityValue(raw.authority, fence.targetBasisDigest) : undefined;
  const observation = raw ? fields(raw.observation, ['kind', 'digest']) : undefined;
  const proof = raw ? proofValue(raw.proof, state.subject.run) : undefined;
  const attempt = state.attempts.at(-1);
  if (
    !raw ||
    !attempt ||
    state.status !== 'dispatch-crossed' ||
    raw.operation !== state.operation ||
    raw.ordinal !== attempt.ordinal ||
    !boundedText(raw.mechanism) ||
    !boundedText(raw.provider) ||
    !subject ||
    !sameSubject(subject, state.subject) ||
    !fence ||
    !sameFence(fence, attempt.fence) ||
    !capability ||
    !sameCapability(capability, attempt.capability) ||
    authority === undefined ||
    !sameAuthority(authority, attempt.authority) ||
    raw.role !== attempt.role ||
    raw.lifecycle !== attempt.lifecycle ||
    !observation ||
    !boundedText(observation.kind) ||
    !digest(observation.digest) ||
    (raw.successClaim !== 'observed' && raw.successClaim !== 'absent') ||
    !proof
  )
    return fail('FC-MECHANISM', 'INVALID_MEDIATED_RESULT');
  return ok(
    deepFreeze({
      kind: 'result',
      operation: state.operation,
      ordinal: attempt.ordinal,
      mechanism: raw.mechanism,
      provider: raw.provider,
      subject,
      fence,
      capability,
      authority,
      role: attempt.role,
      lifecycle: attempt.lifecycle,
      observation: { kind: observation.kind, digest: observation.digest },
      successClaim: raw.successClaim,
      proof,
    }),
  );
}

function publicProjection(state: MutableProjection): OperationProjection {
  return deepFreeze({
    operation: state.operation,
    type: state.type,
    effect: state.effect,
    status: state.status,
    payloadBasisDigest: state.payloadBasisDigest,
    subject: state.subject,
    retainedFence: state.retainedFence,
    capability: state.capability,
    authority: state.authority,
    attempts: [...state.attempts],
    result: state.result,
    certainty: state.certainty,
    reconciliations: [...state.reconciliations],
    adoptedAt: state.adoptedAt,
    supersededBy: state.supersededBy,
  });
}

function journalDigest(position: number, previousDigest: string, record: JournalRecord): OperationResult<string> {
  const staged = stageDigest({
    domain: 'OPERATION-JOURNAL',
    excludePaths: ['digest'],
    value: { position, previousDigest, record, digest: '' } as unknown as CanonicalJson,
  });
  return staged.ok ? ok(staged.value.digest) : fail('FC-INPUT', 'NONCANONICAL_OPERATION_RECORD');
}

function operationRecordCarrier(record: JournalRecord): OperationResult<OperationRecordCarrier> {
  try {
    const { proof: _proof, ...durableRecord } = record;
    const staged = stageDigest({
      domain: 'OPERATION-RECORD-CARRIER',
      excludePaths: [],
      value: durableRecord as unknown as CanonicalJson,
    });
    if (!staged.ok) return fail('FC-INPUT', 'NONCANONICAL_OPERATION_RECORD');
    return ok(
      deepFreeze({
        schema: OPERATION_RECORD_SCHEMA,
        record: durableRecord as unknown as CanonicalJson,
      }),
    );
  } catch {
    return fail('FC-INPUT', 'NONCANONICAL_OPERATION_RECORD');
  }
}

export function deriveOperationRecordCarrier(input: unknown): OperationResult<OperationRecordCarrier> {
  try {
    if (
      typeof input !== 'object' ||
      input === null ||
      Array.isArray(input) ||
      Object.getPrototypeOf(input) !== Object.prototype
    )
      return fail('FC-INPUT', 'NONCANONICAL_OPERATION_RECORD');
    const descriptors = Object.getOwnPropertyDescriptors(input);
    if (
      descriptors.kind === undefined ||
      !('value' in descriptors.kind) ||
      typeof descriptors.kind.value !== 'string' ||
      Object.values(descriptors).some((descriptor) => !('value' in descriptor))
    )
      return fail('FC-INPUT', 'NONCANONICAL_OPERATION_RECORD');
    const durableRecord = Object.fromEntries(
      Object.entries(descriptors)
        .filter(([name]) => name !== 'proof')
        .map(([name, descriptor]) => [name, (descriptor as PropertyDescriptor & { value: unknown }).value]),
    );
    const staged = stageDigest({
      domain: 'OPERATION-RECORD-CARRIER',
      excludePaths: [],
      value: durableRecord as CanonicalJson,
    });
    if (!staged.ok) return fail('FC-INPUT', 'NONCANONICAL_OPERATION_RECORD');
    return ok(
      deepFreeze({
        schema: OPERATION_RECORD_SCHEMA,
        record: durableRecord as CanonicalJson,
      }),
    );
  } catch {
    return fail('FC-INPUT', 'NONCANONICAL_OPERATION_RECORD');
  }
}

export function createOperationJournal(verifierInput?: OperationProofVerifier): OperationJournal {
  const entries: OperationJournalEntry[] = [];
  const operations = new Map<string, MutableProjection>();
  const verifier =
    verifierInput &&
    typeof verifierInput === 'object' &&
    verifierInput !== null &&
    typeof Object.getOwnPropertyDescriptor(verifierInput, 'verify')?.value === 'function'
      ? verifierInput
      : undefined;

  const append = (record: JournalRecord): OperationResult<OperationJournalEntry> => {
    if (!verifier) return fail('FC-ORDERING', 'COMMIT_PROOF_VERIFIER_REQUIRED');
    const carrier = operationRecordCarrier(record);
    if (!carrier.ok) return carrier;
    let verified: OperationResult<void>;
    try {
      verified = verifier.verify(record.proof, carrier.value);
    } catch {
      return fail('FC-TRUST', 'COMMIT_PROOF_UNVERIFIED');
    }
    if (!verified.ok) return fail('FC-TRUST', 'COMMIT_PROOF_UNVERIFIED');
    const lastProof = entries.at(-1)?.record.proof;
    if (lastProof && record.proof.position <= lastProof.position)
      return fail('FC-ORDERING', 'NONMONOTONIC_COMMIT_PROOF');
    const previousDigest = entries.at(-1)?.digest ?? ZERO_DIGEST;
    const hashed = journalDigest(entries.length, previousDigest, record);
    if (!hashed.ok) return hashed;
    const entry = deepFreeze({
      position: entries.length,
      previousDigest,
      digest: hashed.value,
      record,
    });
    entries.push(entry);
    return ok(entry);
  };

  const get = (value: unknown): OperationResult<MutableProjection> => {
    if (typeof value !== 'string' || !parseIdentity('ID-OP', value).ok) return fail('FC-INPUT', 'INVALID_OPERATION_ID');
    const state = operations.get(value);
    return state ? ok(state) : fail('FC-SUBJECT', 'OPERATION_NOT_FOUND');
  };

  const recordIntent = (input: unknown): OperationResult<OperationProjection> => {
    const parsed = intentValue(input);
    if (!parsed.ok) return parsed;
    if (operations.has(parsed.value.operation)) return fail('FC-EFFECT', 'DUPLICATE_OPERATION_ID');
    if (parsed.value.predecessor !== null && !operations.has(parsed.value.predecessor))
      return fail('FC-SUBJECT', 'PREDECESSOR_OPERATION_NOT_FOUND');
    if (parsed.value.purpose === 'replacement') {
      const predecessor = operations.get(parsed.value.predecessor as string);
      if (predecessor?.status !== 'superseded' || predecessor.supersededBy !== parsed.value.operation)
        return fail('FC-ORDERING', 'PREDECESSOR_SUPERSESSION_REQUIRED');
    }
    if (parsed.value.purpose === 'reconciliation') {
      const predecessor = operations.get(parsed.value.predecessor as string);
      if (
        predecessor?.effect !== 'effectful' ||
        (predecessor.status !== 'uncertain' && predecessor.status !== 'parked') ||
        parsed.value.effect !== 'observation' ||
        !sameSubject(predecessor.subject, parsed.value.subject) ||
        predecessor.capability.resourceScope !== parsed.value.capability.resourceScope ||
        predecessor.capability.port !== parsed.value.capability.port ||
        predecessor.capability.kind !== parsed.value.capability.kind ||
        predecessor.capability.manifest !== parsed.value.capability.manifest ||
        !sameFence(predecessor.retainedFence, parsed.value.fence)
      )
        return fail('FC-SUBJECT', 'INVALID_RECONCILIATION_LINEAGE');
    }
    const appended = append(parsed.value);
    if (!appended.ok) return appended;
    const state: MutableProjection = {
      operation: parsed.value.operation,
      type: parsed.value.type,
      effect: parsed.value.effect,
      status: 'intent-recorded',
      payloadBasisDigest: parsed.value.payloadBasisDigest,
      subject: parsed.value.subject,
      retainedFence: parsed.value.fence,
      capability: parsed.value.capability,
      authority: parsed.value.authority,
      attempts: [],
      result: null,
      certainty: null,
      reconciliations: [],
      adoptedAt: null,
      supersededBy: null,
      intent: parsed.value,
    };
    operations.set(state.operation, state);
    return ok(publicProjection(state));
  };

  const recordAttempt = (input: unknown): OperationResult<OperationProjection> => {
    const operationDescriptor =
      typeof input === 'object' && input !== null ? Object.getOwnPropertyDescriptor(input, 'operation') : undefined;
    const current = get(operationDescriptor && 'value' in operationDescriptor ? operationDescriptor.value : undefined);
    if (!current.ok) return current;
    const parsed = attemptValue(input, current.value);
    if (!parsed.ok) return parsed;
    const appended = append(parsed.value);
    if (!appended.ok) return appended;
    current.value.attempts.push(parsed.value);
    current.value.status = 'attempt-recorded';
    current.value.retainedFence = parsed.value.fence;
    current.value.capability = parsed.value.capability;
    current.value.authority = parsed.value.authority;
    current.value.result = null;
    current.value.certainty = null;
    return ok(publicProjection(current.value));
  };

  const buildDispatchPermit = (input: unknown): OperationResult<DispatchPermit> => {
    const raw = fields(input, ['operation', 'ordinal']);
    if (!raw) return fail('FC-INPUT', 'INVALID_DISPATCH_REQUEST');
    const current = get(raw.operation);
    if (!current.ok)
      return current.error.code === 'OPERATION_NOT_FOUND' ? fail('FC-ORDERING', 'INTENT_NOT_RECORDED') : current;
    const attempt = current.value.attempts.at(-1);
    if (!attempt || raw.ordinal !== attempt.ordinal) return fail('FC-ORDERING', 'ATTEMPT_NOT_RECORDED');
    if (current.value.status !== 'attempt-recorded')
      return fail('FC-EFFECT', current.value.status === 'uncertain' ? 'UNCERTAIN_EFFECT' : 'DISPATCH_NOT_AUTHORIZED');
    return ok(
      deepFreeze({
        version: OPERATION_STATE_VERSION,
        operation: current.value.operation,
        ordinal: attempt.ordinal,
        type: current.value.type,
        subject: current.value.subject,
        fence: attempt.fence,
        capability: current.value.capability,
        authority: attempt.authority,
        role: attempt.role,
        lifecycle: attempt.lifecycle,
        proof: attempt.proof,
        purpose: current.value.intent.purpose,
        predecessor: current.value.intent.predecessor,
      }),
    );
  };

  const recordDispatch = (input: unknown): OperationResult<DispatchPermit> => {
    const raw = fields(input, ['operation', 'ordinal', 'proof']);
    const current = raw ? get(raw.operation) : fail('FC-INPUT', 'INVALID_DISPATCH_RECORD');
    if (!raw) return fail('FC-INPUT', 'INVALID_DISPATCH_RECORD');
    if (!current.ok)
      return current.error.code === 'OPERATION_NOT_FOUND'
        ? fail('FC-ORDERING', 'INTENT_NOT_RECORDED')
        : fail(current.error.family, current.error.code);
    const permit = buildDispatchPermit({ operation: raw.operation, ordinal: raw.ordinal });
    const proof = proofValue(raw.proof, current.value.subject.run);
    if (!permit.ok || !proof) return permit.ok ? fail('FC-INPUT', 'INVALID_DISPATCH_RECORD') : permit;
    const record: DispatchRecord = deepFreeze({
      kind: 'dispatch',
      operation: current.value.operation,
      ordinal: raw.ordinal as number,
      proof,
    });
    const appended = append(record);
    if (!appended.ok) return appended;
    current.value.status = 'dispatch-crossed';
    return ok(deepFreeze({ ...permit.value, proof }));
  };

  const recordResult = (input: unknown): OperationResult<OperationProjection> => {
    const descriptor =
      typeof input === 'object' && input !== null ? Object.getOwnPropertyDescriptor(input, 'operation') : undefined;
    const current = get(descriptor && 'value' in descriptor ? descriptor.value : undefined);
    if (!current.ok) return current;
    const parsed = resultValue(input, current.value);
    if (!parsed.ok) return parsed;
    const appended = append(parsed.value);
    if (!appended.ok) return appended;
    current.value.result = parsed.value;
    current.value.status = 'result-recorded';
    return ok(publicProjection(current.value));
  };

  const recordCertainty = (input: unknown): OperationResult<OperationProjection> => {
    const raw = fields(input, ['operation', 'ordinal', 'certainty', 'observationDigest', 'proof']);
    const current = raw ? get(raw.operation) : fail('FC-INPUT', 'INVALID_CERTAINTY_RECORD');
    if (!raw || !current.ok) return current;
    const proof = proofValue(raw.proof, current.value.subject.run);
    const result = current.value.result;
    if (
      !proof ||
      current.value.status !== 'result-recorded' ||
      !result ||
      raw.ordinal !== result.ordinal ||
      (raw.certainty !== 'confirmed-effect' && raw.certainty !== 'confirmed-absence') ||
      raw.certainty !== (result.successClaim === 'observed' ? 'confirmed-effect' : 'confirmed-absence') ||
      !digest(raw.observationDigest) ||
      raw.observationDigest !== result.observation.digest
    )
      return current.value.certainty
        ? fail('FC-EFFECT', 'CONTRADICTORY_CERTAINTY')
        : fail('FC-INPUT', 'INVALID_CERTAINTY_RECORD');
    const record: CertaintyRecord = deepFreeze({
      kind: 'certainty' as const,
      operation: current.value.operation,
      ordinal: raw.ordinal as number,
      certainty: raw.certainty as CertaintyRecord['certainty'],
      observationDigest: raw.observationDigest,
      proof,
    });
    const appended = append(record);
    if (!appended.ok) return appended;
    current.value.certainty = record;
    current.value.status = record.certainty;
    return ok(publicProjection(current.value));
  };

  const recordUncertainty = (input: unknown): OperationResult<OperationProjection> => {
    const raw = fields(input, ['operation', 'ordinal', 'reason', 'proof']);
    const current = raw ? get(raw.operation) : fail('FC-INPUT', 'INVALID_UNCERTAINTY_RECORD');
    if (!raw || !current.ok) return current;
    const proof = proofValue(raw.proof, current.value.subject.run);
    const attempt = current.value.attempts.at(-1);
    const allowedWithoutAttempt =
      current.value.effect === 'observation' && current.value.status === 'intent-recorded' && raw.ordinal === 0;
    if (
      !proof ||
      (raw.reason !== 'lost-response' && raw.reason !== 'timeout' && raw.reason !== 'cancelled') ||
      (!allowedWithoutAttempt &&
        (!attempt ||
          attempt.ordinal !== raw.ordinal ||
          (current.value.status !== 'dispatch-crossed' && current.value.status !== 'result-recorded')))
    )
      return fail('FC-INPUT', 'INVALID_UNCERTAINTY_RECORD');
    const record: UncertaintyRecord = deepFreeze({
      kind: 'uncertainty' as const,
      operation: current.value.operation,
      ordinal: raw.ordinal as number,
      reason: raw.reason as UncertaintyRecord['reason'],
      proof,
    });
    const appended = append(record);
    if (!appended.ok) return appended;
    current.value.status = 'uncertain';
    return ok(publicProjection(current.value));
  };

  const recordReconciliation = (input: unknown): OperationResult<OperationProjection> => {
    const raw = fields(input, ['operation', 'observationOperation', 'proof']);
    const current = raw ? get(raw.operation) : fail('FC-INPUT', 'INVALID_RECONCILIATION_RECORD');
    if (!raw || !current.ok) return current;
    const observation = get(raw.observationOperation);
    const proof = proofValue(raw.proof, current.value.subject.run);
    const ordinal = current.value.reconciliations.length + 1;
    const observationResult = observation.ok ? observation.value.result : undefined;
    const outcome =
      observationResult?.observation.kind === 'effect-confirmed'
        ? 'confirmed-effect'
        : observationResult?.observation.kind === 'effect-absent'
          ? 'confirmed-absence'
          : observationResult?.observation.kind === 'effect-indeterminate'
            ? 'indeterminate'
            : undefined;
    if (
      !proof ||
      !observation.ok ||
      current.value.effect !== 'effectful' ||
      (current.value.status !== 'uncertain' && current.value.status !== 'parked') ||
      ordinal > current.value.intent.bounds.recoveryLimit ||
      observation.value.effect !== 'observation' ||
      observation.value.intent.purpose !== 'reconciliation' ||
      observation.value.intent.predecessor !== current.value.operation ||
      observation.value.status !== 'result-recorded' ||
      !observationResult ||
      !outcome ||
      !sameSubject(current.value.subject, observation.value.subject) ||
      current.value.capability.resourceScope !== observation.value.capability.resourceScope ||
      current.value.capability.port !== observation.value.capability.port ||
      current.value.capability.kind !== observation.value.capability.kind ||
      current.value.capability.manifest !== observation.value.capability.manifest ||
      !sameFence(current.value.retainedFence, observation.value.retainedFence) ||
      [...operations.values()].some((state) =>
        state.reconciliations.some((entry) => entry.observationOperation === observation.value.operation),
      )
    )
      return ordinal > current.value.intent.bounds.recoveryLimit
        ? fail('FC-BOUND', 'BND_RECOVERY_EXHAUSTED')
        : fail('FC-INPUT', 'INVALID_RECONCILIATION_RECORD');
    const record: ReconciliationRecord = deepFreeze({
      kind: 'reconciliation' as const,
      operation: current.value.operation,
      ordinal,
      observationOperation: observation.value.operation,
      outcome,
      observationDigest: observationResult.observation.digest,
      proof,
    });
    const appended = append(record);
    if (!appended.ok) return appended;
    current.value.reconciliations.push(record);
    current.value.certainty = record;
    current.value.status =
      record.outcome === 'indeterminate'
        ? record.ordinal === current.value.intent.bounds.recoveryLimit
          ? 'parked'
          : 'uncertain'
        : record.outcome;
    return ok(publicProjection(current.value));
  };

  const adopt = (input: unknown): OperationResult<OperationProjection> => {
    const raw = fields(input, ['operation', 'proof']);
    const current = raw ? get(raw.operation) : fail('FC-INPUT', 'INVALID_ADOPTION_RECORD');
    if (!raw || !current.ok) return current;
    if (current.value.status === 'adopted') return fail('FC-EFFECT', 'EFFECT_ALREADY_ADOPTED');
    const proof = proofValue(raw.proof, current.value.subject.run);
    if (!proof || current.value.status !== 'confirmed-effect') return fail('FC-ORDERING', 'CONFIRMED_EFFECT_REQUIRED');
    const record = deepFreeze({ kind: 'adoption' as const, operation: current.value.operation, proof });
    const appended = append(record);
    if (!appended.ok) return appended;
    current.value.adoptedAt = proof;
    current.value.status = 'adopted';
    return ok(publicProjection(current.value));
  };

  const replaceObservation = (input: unknown): OperationResult<OperationProjection> => {
    const raw = fields(input, ['operation', 'replacement', 'proof']);
    const current = raw ? get(raw.operation) : fail('FC-INPUT', 'INVALID_REPLACEMENT_RECORD');
    if (!raw || !current.ok) return current;
    const proof = proofValue(raw.proof, current.value.subject.run);
    if (
      !proof ||
      current.value.effect !== 'observation' ||
      current.value.status !== 'uncertain' ||
      typeof raw.replacement !== 'string' ||
      !parseIdentity('ID-OP', raw.replacement).ok ||
      raw.replacement === current.value.operation ||
      operations.has(raw.replacement)
    )
      return fail('FC-EFFECT', 'NEW_OBSERVATION_ID_REQUIRED');
    const record = deepFreeze({
      kind: 'replacement' as const,
      operation: current.value.operation,
      replacement: raw.replacement,
      proof,
    });
    const appended = append(record);
    if (!appended.ok) return appended;
    current.value.status = 'superseded';
    current.value.supersededBy = raw.replacement;
    return ok(publicProjection(current.value));
  };

  const snapshot = (): OperationJournalSnapshot =>
    deepFreeze({
      version: OPERATION_STATE_VERSION,
      entries: [...entries],
      head: {
        position: entries.length - 1,
        digest: entries.at(-1)?.digest ?? ZERO_DIGEST,
      },
    });

  return Object.freeze({
    recordIntent,
    recordAttempt,
    recordDispatch,
    recordResult,
    recordCertainty,
    recordUncertainty,
    recordReconciliation,
    adopt,
    replaceObservation,
    state: (operation: unknown) => {
      const current = get(operation);
      return current.ok ? ok(publicProjection(current.value)) : current;
    },
    pendingEffects: () =>
      deepFreeze(
        [...operations.values()]
          .filter(
            (state) =>
              state.effect === 'effectful' &&
              state.status !== 'adopted' &&
              state.status !== 'confirmed-absence' &&
              state.status !== 'superseded',
          )
          .map(publicProjection),
      ),
    snapshot,
  });
}

function replayRecord(journal: OperationJournal, record: JournalRecord): OperationResult<unknown> {
  if (record.kind === 'intent') {
    const { kind: _kind, ...input } = record;
    return journal.recordIntent(input);
  }
  if (record.kind === 'attempt') {
    const { kind: _kind, ...input } = record;
    return journal.recordAttempt(input);
  }
  if (record.kind === 'dispatch') {
    const { kind: _kind, ...input } = record;
    return journal.recordDispatch(input);
  }
  if (record.kind === 'result') {
    const { kind: _kind, ...input } = record;
    return journal.recordResult(input);
  }
  if (record.kind === 'certainty') {
    const { kind: _kind, ...input } = record;
    return journal.recordCertainty(input);
  }
  if (record.kind === 'uncertainty') {
    const { kind: _kind, ...input } = record;
    return journal.recordUncertainty(input);
  }
  if (record.kind === 'reconciliation') {
    const { kind: _kind, ...input } = record;
    return journal.recordReconciliation(input);
  }
  if (record.kind === 'adoption') {
    const { kind: _kind, ...input } = record;
    return journal.adopt(input);
  }
  const { kind: _kind, ...input } = record;
  return journal.replaceObservation(input);
}

export function restoreOperationRecords(
  recordsInput: unknown,
  verifier: OperationProofVerifier,
): OperationResult<OperationJournal> {
  const records = array(recordsInput);
  if (!records) return fail('FC-TRUST', 'OPERATION_JOURNAL_INVALID');
  const journal = createOperationJournal(verifier);
  for (const candidate of records) {
    const kindDescriptor =
      candidate && typeof candidate === 'object' ? Object.getOwnPropertyDescriptor(candidate, 'kind') : undefined;
    if (!kindDescriptor || !('value' in kindDescriptor)) return fail('FC-TRUST', 'OPERATION_JOURNAL_INVALID');
    const replayed = replayRecord(journal, candidate as JournalRecord);
    if (!replayed.ok) return fail('FC-TRUST', 'OPERATION_JOURNAL_INVALID');
  }
  return ok(journal);
}

export const OPERATION_BOUNDS = Object.freeze({
  waitDefaultMs: WAIT_DEFAULT_MS,
  waitMinimumMs: WAIT_MIN_MS,
  waitMaximumMs: WAIT_MAX_MS,
  retryDefault: RETRY_DEFAULT,
  recoveryDefault: RECOVERY_DEFAULT,
  countMinimum: COUNT_MIN,
  countMaximum: COUNT_MAX,
});
