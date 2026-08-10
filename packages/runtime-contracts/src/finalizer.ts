import { parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';
import {
  type AcceptanceCandidate,
  type AcceptanceController,
  type ReviewPackage,
  restoreScriptedAcceptanceController,
  validateAcceptanceCandidate,
  validateAcceptancePackage,
} from './acceptance.js';
import { createScriptedRegistry, type RegistryRecord } from './registry.js';
import {
  restoreScriptedVerificationFixture,
  type ScriptedVerificationFixture,
  type VerificationObservation,
  type VerificationRequest,
  validateVerificationObservation,
  validateVerificationRequest,
} from './verification.js';
import { validateWorkspaceFact, type WorkspaceController } from './workspace.js';

export const FINALIZER_CONTRACT_VERSION = 'jig.finalizer-contract.v1';
export const FINALIZER_SNAPSHOT_SCHEMA = 'jig.finalizer-snapshot.v1';
export const FINALIZER_EVENT_SCHEMA = 'jig.finalizer-event.v1';
export const FINALIZER_CONTROLLER = 'RT-CONTROLLER';
export const FINALIZER_REGISTRY = 'RT-REGISTRY';
export const FINALIZER_OPERATION = 'CP-FINALIZER';
export const FINALIZER_WAIT_BOUNDS = Object.freeze({
  capacitySeconds: Object.freeze({ minimum: 3_600, maximum: 2_592_000 }),
  targetSeconds: Object.freeze({ minimum: 60, maximum: 86_400 }),
  refreshLimit: Object.freeze({ minimum: 1, maximum: 5 }),
});

const ZERO = '0'.repeat(64);
const DIGEST = /^[0-9a-f]{64}$/u;
const TEXT = /^[a-z0-9](?:[a-z0-9._/-]{0,127})$/u;

export type FinalizerFailureFamily =
  | 'FC-INPUT'
  | 'FC-AUTHORITY'
  | 'FC-SUBJECT'
  | 'FC-FENCE'
  | 'FC-EVIDENCE'
  | 'FC-CAPACITY'
  | 'FC-BOUND'
  | 'FC-MECHANISM'
  | 'FC-TRUST';
export type FinalizerFailure = Readonly<{ family: FinalizerFailureFamily; code: string }>;
export type FinalizerResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: FinalizerFailure }>;

export type FinalizerBinding = Readonly<{ descriptor: string; registry: string; target: string }>;
export type FinalizerComparator = Readonly<{ priority: number; ordinal: number; story: string }>;
export type FinalizerPolicy = Readonly<{
  posture: 'deterministic' | 'none';
  requiredClasses: readonly string[];
  digest: string;
  waitCapacitySeconds: number;
  waitTargetSeconds: number;
  refreshLimit: number;
}>;
export type FinalizerWaiter = Readonly<{
  run: string;
  story: string;
  candidate: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
  generation: string;
  registry: string;
  target: string;
  comparator: FinalizerComparator;
  eligibilityBasis: string;
  acceptedPackageDigest: string;
  policy: FinalizerPolicy;
  waitedAt: number;
  handle: Readonly<{ registry: string; position: number; contentDigest: string }>;
}>;
export type FinalizerAuthority = Readonly<{
  authority: string;
  authorityGeneration: number;
  registry: string;
  target: string;
  story: string;
  candidate: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
  eligibilityBasis: string;
  generation: string;
}>;
export type FinalizerVerificationIntent = VerificationRequest;
export type FinalizerVerificationObservation = VerificationObservation;
export type FinalizerDeliveryIntent = Readonly<{
  operation: string;
  candidate: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
  generation: string;
  authority: string;
}>;
export type FinalizerEntry = Readonly<{
  operation: string;
  origin: 'Waiting' | 'Accepted';
  authority: FinalizerAuthority;
  posture: FinalizerPolicy['posture'];
  requiredClasses: readonly string[];
  verificationOperations: readonly FinalizerVerificationIntent[];
  observations: readonly FinalizerVerificationObservation[];
  noOp: boolean;
  readyForDelivery: boolean;
}>;
export type FinalizerTargetFact = Readonly<{
  schema: typeof FINALIZER_EVENT_SCHEMA;
  kind: 'EV-TARGET-FACT';
  operation: string;
  target: string;
  registry: string;
  targetBasisDigest: string;
  anchorRegistry: string | null;
  outcome: 'present' | 'absent' | 'advanced' | 'conflict' | 'uncertain';
  observedAt: number;
}>;
export type FinalizerProjection = Readonly<{
  status: 'Waiting' | 'Accepted' | 'Finalizing' | 'Reworking' | 'Blocked' | 'TargetPark';
  waiters: readonly FinalizerWaiter[];
  authority: FinalizerAuthority | null;
  entry: FinalizerEntry | null;
  pendingDeliveryOperations: readonly string[];
  anchorRegistry: string | null;
  refreshCount: number;
}>;

type RegistryAdapter = Readonly<{
  waiter(input: unknown): unknown;
  grant(input: unknown): unknown;
  release(input: unknown): unknown;
  atomicRebind(input: unknown): unknown;
  snapshot(input: unknown): unknown;
  readback(input: unknown): unknown;
}>;
type RegistryHandle = Readonly<{ registry: string; position: number; contentDigest: string }>;
type RegistryState = Readonly<{ position: number; digest: string }>;
type FinalizerRecord =
  | Readonly<{ kind: 'enqueue'; operation: null; relatedOperation: string; waiter: FinalizerWaiter }>
  | Readonly<{
      kind: 'registry-intent';
      operation: string;
      action: 'enqueue' | 'grant' | 'release' | 'rebind';
      payloadDigest: string;
    }>
  | Readonly<{ kind: 'grant'; operation: null; relatedOperation: string; authority: FinalizerAuthority }>
  | Readonly<{ kind: 'entry'; operation: string; entry: FinalizerEntry }>
  | Readonly<{
      kind: 'observation';
      operation: null;
      relatedOperation: string;
      observation: FinalizerVerificationObservation;
    }>
  | Readonly<{
      kind: 'verification-failure';
      operation: null;
      relatedOperation: string;
      reason: 'lost-response' | 'timeout';
      exhausted: boolean;
      replacement: VerificationRequest | null;
    }>
  | Readonly<{ kind: 'delivery-intent'; operation: string; type: 'OPC-DEL-ANCHOR'; authority: FinalizerAuthority }>
  | Readonly<{ kind: 'target-fact'; operation: null; relatedOperation: string; fact: FinalizerTargetFact }>
  | Readonly<{
      kind: 'refresh';
      operation: string;
      authority: FinalizerAuthority;
      waiter: FinalizerWaiter;
      entryCleared: true;
      refreshCount: number;
    }>
  | Readonly<{ kind: 'release'; operation: string; reason: 'rework' | 'blocked'; authority: FinalizerAuthority }>
  | Readonly<{
      kind: 'wake';
      operation: null;
      relatedOperation: string;
      event: 'EV-WAKE-AUTHORITY' | 'EV-WAKE-FINALIZATION';
      story: string;
      elapsedSeconds: number;
      limitSeconds: number;
      exhausted: boolean;
    }>;
type JournalEntry = Readonly<{ position: number; previousDigest: string; digest: string; record: FinalizerRecord }>;
export type FinalizerSnapshot = Readonly<{
  schema: typeof FINALIZER_SNAPSHOT_SCHEMA;
  binding: FinalizerBinding;
  registryHead: RegistryState;
  records: readonly JournalEntry[];
  projection: FinalizerProjection;
  verificationSnapshot: ReturnType<ScriptedVerificationFixture['snapshot']>;
}>;

export type ScriptedFinalizerController = Readonly<{
  enqueue(input: unknown): FinalizerResult<FinalizerWaiter>;
  grant(input: unknown): FinalizerResult<FinalizerAuthority>;
  enterFinalizing(input: unknown): FinalizerResult<FinalizerEntry>;
  observeVerification(input: unknown): FinalizerResult<FinalizerProjection>;
  recordVerificationFailure(input: unknown): FinalizerResult<FinalizerProjection>;
  authorizeAnchor(input: unknown): FinalizerResult<FinalizerDeliveryIntent>;
  recordTargetFact(input: unknown): FinalizerResult<FinalizerProjection>;
  refresh(input: unknown): FinalizerResult<FinalizerAuthority>;
  release(input: unknown): FinalizerResult<FinalizerProjection>;
  wake(input: unknown): FinalizerResult<Readonly<{ reread: true; projection: FinalizerProjection }>>;
  projection(): FinalizerProjection;
  snapshot(): FinalizerSnapshot;
  records(): readonly JournalEntry[];
  reachability(): Readonly<{
    status: 'scripted-only';
    providerEnabled: false;
    externalEffects: false;
    landingEnabled: false;
  }>;
}>;

const freeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const ok = <T>(value: T): FinalizerResult<T> => Object.freeze({ ok: true, value: freeze(value) });
const fail = <T = never>(family: FinalizerFailureFamily, code: string): FinalizerResult<T> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });
const plain = (value: unknown): value is Record<string, unknown> => {
  try {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    );
  } catch {
    return false;
  }
};
const own = (value: unknown, keys: readonly string[]): Record<string, unknown> | undefined => {
  if (!plain(value)) return undefined;
  try {
    const names = Object.getOwnPropertyNames(value).sort();
    const expected = [...keys].sort();
    return names.length === expected.length && names.every((key, index) => key === expected[index]) ? value : undefined;
  } catch {
    return undefined;
  }
};
const field = (value: unknown, key: string): unknown =>
  plain(value) ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
const digest = (value: unknown): value is string => typeof value === 'string' && DIGEST.test(value);
const position = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const nonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const identity = (kind: string, value: unknown): value is string =>
  typeof value === 'string' && parseIdentity(kind, value).ok;
const same = (left: unknown, right: unknown, domain = 'FINALIZER-COMPARE'): boolean => {
  const a = stageDigest({ domain, excludePaths: [], value: left as never });
  const b = stageDigest({ domain, excludePaths: [], value: right as never });
  return a.ok && b.ok && a.value.digest === b.value.digest;
};
const derived = (domain: string, value: unknown): string | undefined => {
  const result = stageDigest({ domain, excludePaths: [], value: value as never });
  return result.ok ? result.value.digest : undefined;
};
function validateBinding(input: unknown): FinalizerResult<FinalizerBinding> {
  const raw = own(input, ['descriptor', 'registry', 'target']);
  if (!raw || !digest(raw.descriptor) || !identity('ID-REGISTRY', raw.registry) || !identity('ID-TARGET', raw.target))
    return fail('FC-INPUT', 'INVALID_FINALIZER_BINDING');
  if (raw.registry !== `registry/${raw.descriptor}`) return fail('FC-AUTHORITY', 'FOREIGN_REGISTRY_BINDING');
  return ok({ descriptor: raw.descriptor, registry: raw.registry, target: raw.target });
}

export function deriveFinalizerPolicyDigest(
  input: Readonly<{
    posture: 'deterministic' | 'none';
    requiredClasses: readonly string[];
    waitCapacitySeconds: number;
    waitTargetSeconds: number;
    refreshLimit: number;
  }>,
): string | undefined {
  return derived('FINALIZER-POLICY', {
    posture: input.posture,
    requiredClasses: input.requiredClasses,
    waitCapacitySeconds: input.waitCapacitySeconds,
    waitTargetSeconds: input.waitTargetSeconds,
    refreshLimit: input.refreshLimit,
  });
}

export function createFinalizerPolicy(input: unknown): FinalizerResult<FinalizerPolicy> {
  const raw = own(input, ['posture', 'requiredClasses', 'waitCapacitySeconds', 'waitTargetSeconds', 'refreshLimit']);
  if (!raw || !['deterministic', 'none'].includes(raw.posture as string) || !Array.isArray(raw.requiredClasses))
    return fail('FC-INPUT', 'INVALID_FINALIZER_POLICY');
  const requiredClasses = raw.requiredClasses.filter((entry): entry is string => typeof entry === 'string');
  if (
    requiredClasses.length !== raw.requiredClasses.length ||
    requiredClasses.length > 64 ||
    requiredClasses.some((entry) => !TEXT.test(entry))
  )
    return fail('FC-INPUT', 'INVALID_FINALIZER_CHECK_SET');
  if (
    new Set(requiredClasses).size !== requiredClasses.length ||
    [...requiredClasses].sort().some((entry, index) => entry !== requiredClasses[index])
  )
    return fail('FC-INPUT', 'UNSORTED_FINALIZER_CHECK_SET');
  if (raw.posture === 'none' && requiredClasses.length !== 0)
    return fail('FC-AUTHORITY', 'NONE_POSTURE_REQUIRES_EMPTY_CHECK_SET');
  if (
    !position(raw.waitCapacitySeconds) ||
    raw.waitCapacitySeconds < FINALIZER_WAIT_BOUNDS.capacitySeconds.minimum ||
    raw.waitCapacitySeconds > FINALIZER_WAIT_BOUNDS.capacitySeconds.maximum
  )
    return fail('FC-BOUND', 'INVALID_CAPACITY_WAIT_BOUND');
  if (
    !position(raw.waitTargetSeconds) ||
    raw.waitTargetSeconds < FINALIZER_WAIT_BOUNDS.targetSeconds.minimum ||
    raw.waitTargetSeconds > FINALIZER_WAIT_BOUNDS.targetSeconds.maximum
  )
    return fail('FC-BOUND', 'INVALID_TARGET_WAIT_BOUND');
  if (
    !position(raw.refreshLimit) ||
    raw.refreshLimit < FINALIZER_WAIT_BOUNDS.refreshLimit.minimum ||
    raw.refreshLimit > FINALIZER_WAIT_BOUNDS.refreshLimit.maximum
  )
    return fail('FC-BOUND', 'INVALID_REFRESH_BOUND');
  const policyDigest = deriveFinalizerPolicyDigest({
    posture: raw.posture as FinalizerPolicy['posture'],
    requiredClasses,
    waitCapacitySeconds: raw.waitCapacitySeconds as number,
    waitTargetSeconds: raw.waitTargetSeconds as number,
    refreshLimit: raw.refreshLimit as number,
  });
  if (!policyDigest || !digest(policyDigest)) return fail('FC-INPUT', 'FINALIZER_POLICY_DIGEST_FAILED');
  return ok({
    posture: raw.posture as FinalizerPolicy['posture'],
    requiredClasses: Object.freeze(requiredClasses),
    digest: policyDigest,
    waitCapacitySeconds: raw.waitCapacitySeconds as number,
    waitTargetSeconds: raw.waitTargetSeconds as number,
    refreshLimit: raw.refreshLimit as number,
  });
}

function validatePolicy(input: unknown): FinalizerResult<FinalizerPolicy> {
  const raw = own(input, [
    'digest',
    'posture',
    'requiredClasses',
    'waitCapacitySeconds',
    'waitTargetSeconds',
    'refreshLimit',
  ]);
  if (!raw) return fail('FC-INPUT', 'INVALID_FINALIZER_POLICY');
  const created = createFinalizerPolicy({
    posture: raw.posture,
    requiredClasses: raw.requiredClasses,
    waitCapacitySeconds: raw.waitCapacitySeconds,
    waitTargetSeconds: raw.waitTargetSeconds,
    refreshLimit: raw.refreshLimit,
  });
  return !created.ok
    ? created
    : created.value.digest === raw.digest
      ? created
      : fail('FC-TRUST', 'FINALIZER_POLICY_DIGEST_MISMATCH');
}

function validateComparator(input: unknown, story: string): FinalizerResult<FinalizerComparator> {
  const raw = own(input, ['ordinal', 'priority', 'story']);
  if (!raw || !Number.isSafeInteger(raw.priority) || !position(raw.ordinal) || raw.story !== story)
    return fail('FC-INPUT', 'INVALID_FINALIZER_COMPARATOR');
  return ok({ priority: raw.priority as number, ordinal: raw.ordinal as number, story });
}

function validateWaiterInput(
  input: unknown,
  binding: FinalizerBinding,
): FinalizerResult<Readonly<{ waiter: Omit<FinalizerWaiter, 'handle'>; operation: string; fault?: string }>> {
  const raw =
    own(input, [
      'acceptanceController',
      'candidateCarrier',
      'comparator',
      'operation',
      'policy',
      'run',
      'story',
      'waitedAt',
      'workspaceController',
    ]) ??
    own(input, [
      'acceptanceController',
      'candidateCarrier',
      'comparator',
      'fault',
      'operation',
      'policy',
      'run',
      'story',
      'waitedAt',
      'workspaceController',
    ]);
  if (!raw || !identity('ID-OP', raw.operation) || !identity('ID-RUN', raw.run) || !identity('ID-STORY', raw.story))
    return fail('FC-INPUT', 'INVALID_FINALIZER_WAITER');
  if (!raw.story.startsWith(`${raw.run}/story/`) || !position(raw.waitedAt))
    return fail('FC-INPUT', 'INVALID_FINALIZER_WAITER_DIGEST');
  if (raw.fault !== undefined && !['after-flush', 'after-witness', 'lost-ack'].includes(raw.fault as string))
    return fail('FC-INPUT', 'INVALID_FINALIZER_FAULT');
  const candidateResult = validateCandidateCarrier(raw.candidateCarrier);
  if (!candidateResult.ok) return fail('FC-EVIDENCE', 'DURABLE_CANDIDATE_REQUIRED');
  const candidate = candidateResult.value;
  if (
    candidate.run !== raw.run ||
    candidate.story !== raw.story ||
    !identity('ID-GEN', candidate.generation) ||
    !candidate.generation.startsWith(`${raw.run}/gen/`)
  )
    return fail('FC-FENCE', 'FINALIZER_WAITER_SCOPE_MISMATCH');
  const acceptance = acceptedPackage(raw.acceptanceController, candidate);
  if (!acceptance.ok) return acceptance;
  const workspace = durableWorkspace(raw.workspaceController, candidate, binding);
  if (!workspace.ok) return workspace;
  const comparator = validateComparator(raw.comparator, raw.story as string);
  const policy = validatePolicy(raw.policy);
  if (!comparator.ok) return comparator;
  if (!policy.ok) return policy;
  if (acceptance.value.verificationPosture !== policy.value.posture)
    return fail('FC-FENCE', 'FINALIZER_POLICY_POSTURE_MISMATCH');
  return ok({
    operation: raw.operation as string,
    fault: raw.fault as string | undefined,
    waiter: {
      run: candidate.run,
      story: candidate.story,
      candidate: candidate.id,
      candidateContentDigest: candidate.candidateContentDigest,
      targetBasisDigest: candidate.targetBasisDigest,
      generation: candidate.generation,
      registry: binding.registry,
      target: binding.target,
      comparator: comparator.value,
      eligibilityBasis: candidate.runBasisDigest,
      acceptedPackageDigest: acceptance.value.digest,
      policy: policy.value,
      waitedAt: raw.waitedAt as number,
    },
  });
}

function validateCandidateCarrier(value: unknown): FinalizerResult<AcceptanceCandidate> {
  const checked = validateAcceptanceCandidate(value);
  if (!checked.ok) return fail('FC-EVIDENCE', 'DURABLE_CANDIDATE_REQUIRED');
  const candidate = checked.value;
  const sourceEvent = field(candidate, 'sourceEvent');
  const proof = plain(sourceEvent) ? field(sourceEvent, 'commitProof') : undefined;
  const proofPosition = plain(proof) ? field(proof, 'position') : undefined;
  const transition = field(candidate, 'authorizingTransition');
  const sourceOperation = plain(sourceEvent) ? field(sourceEvent, 'operation') : undefined;
  const expectedContent = derived('CANDIDATE-CONTENT', {
    targetBasisDigest: candidate.targetBasisDigest,
    changedPaths: candidate.changedPaths,
    treeDigest: candidate.treeDigest,
    workspaceCommit: candidate.workspaceCommit,
  });
  const expectedCreationKey = derived('CANDIDATE-CREATION-KEY', {
    source: field(candidate, 'source'),
    story: candidate.story,
    session: candidate.session,
    producerKey: field(candidate, 'sourceEventKey'),
    candidateContentDigest: candidate.candidateContentDigest,
  });
  if (
    !['session-result', 'workspace-refresh'].includes(field(candidate, 'source') as string) ||
    !digest(field(candidate, 'sourceEventKey')) ||
    !digest(field(candidate, 'workspaceFingerprint')) ||
    !identity('ID-TXN', transition) ||
    !identity('ID-OP', sourceOperation) ||
    sourceOperation !== `${transition}/op/1` ||
    !plain(sourceEvent) ||
    sourceEvent.event !==
      (field(candidate, 'source') === 'session-result' ? 'EV-SESSION-RESULT' : 'EV-WORKSPACE-FACT') ||
    sourceEvent.sessionOrdinal !== field(candidate, 'sessionOrdinal') ||
    sourceEvent.assignmentOrdinal !== field(candidate, 'assignmentOrdinal') ||
    !plain(proof) ||
    proof.kind !== 'committed-witnessed' ||
    !position(proofPosition) ||
    !identity('ID-EVENT', field(proof, 'event')) ||
    field(proof, 'event') !== `${candidate.run}/event/${(proofPosition as number) + 1}` ||
    field(proof, 'transaction') !== transition ||
    !digest(field(proof, 'recordDigest')) ||
    field(proof, 'recordDigest') !== field(proof, 'witnessDigest') ||
    expectedContent !== candidate.candidateContentDigest ||
    expectedCreationKey !== field(candidate, 'candidateCreationKey')
  )
    return fail('FC-EVIDENCE', 'INVALID_GF035_CANDIDATE_CARRIER');
  return checked;
}

function acceptedPackage(input: unknown, candidate: AcceptanceCandidate): FinalizerResult<ReviewPackage> {
  if (!input || typeof input !== 'object' || typeof (input as AcceptanceController).snapshot !== 'function')
    return fail('FC-TRUST', 'DURABLE_ACCEPTANCE_READBACK_REQUIRED');
  let snapshot: unknown;
  try {
    snapshot = (input as AcceptanceController).snapshot();
  } catch {
    return fail('FC-TRUST', 'DURABLE_ACCEPTANCE_READBACK_FAILED');
  }
  const restored = restoreScriptedAcceptanceController(snapshot);
  if (!restored.ok) return fail('FC-TRUST', 'INVALID_ACCEPTANCE_READBACK');
  const projection = restored.value.projection();
  if (projection.state !== 'Accepted' || projection.candidate !== candidate.id || !projection.acceptedPackageDigest)
    return fail('FC-AUTHORITY', 'FINALIZER_ACCEPTANCE_REQUIRED');
  const packageValue = restored.value.packages().find((item) => item.digest === projection.acceptedPackageDigest);
  const checked = validateAcceptancePackage(packageValue);
  if (
    !checked.ok ||
    checked.value.candidate !== candidate.id ||
    checked.value.candidateContentDigest !== candidate.candidateContentDigest ||
    checked.value.targetBasisDigest !== candidate.targetBasisDigest ||
    checked.value.digest !== projection.acceptedPackageDigest
  )
    return fail('FC-AUTHORITY', 'FINALIZER_ACCEPTANCE_REQUIRED');
  return checked;
}

function durableWorkspace(
  input: unknown,
  candidate: AcceptanceCandidate,
  _binding: FinalizerBinding,
): FinalizerResult<ReturnType<WorkspaceController['facts']>[number]> {
  if (!input || typeof input !== 'object' || typeof (input as WorkspaceController).facts !== 'function')
    return fail('FC-TRUST', 'DURABLE_WORKSPACE_READBACK_REQUIRED');
  let facts: ReturnType<WorkspaceController['facts']>;
  try {
    facts = (input as WorkspaceController).facts();
  } catch {
    return fail('FC-TRUST', 'DURABLE_WORKSPACE_READBACK_FAILED');
  }
  const fact = facts
    .map((item) => validateWorkspaceFact(item))
    .find((item) => item.ok && item.value.contentDigest === candidate.workspaceFactDigest);
  if (
    fact?.ok !== true ||
    fact.value.cleanliness !== 'clean' ||
    fact.value.binding.subject.run !== candidate.run ||
    fact.value.binding.subject.story !== candidate.story ||
    fact.value.binding.subject.basis !== candidate.runBasisDigest ||
    fact.value.binding.operationType !== 'OPC-WS-OBSERVE'
  )
    return fail('FC-EVIDENCE', 'INVALID_FINALIZER_WORKSPACE_FACT');
  return ok(fact.value);
}

function registryState(registry: RegistryAdapter, binding: FinalizerBinding): FinalizerResult<RegistryState> {
  const result = registry.snapshot(binding);
  if (!plain(result) || field(result, 'ok') !== true || !plain(field(result, 'value')))
    return fail('FC-TRUST', 'REGISTRY_SNAPSHOT_UNAVAILABLE');
  const value = field(result, 'value');
  if (!Number.isSafeInteger(field(value, 'position')) || !digest(field(value, 'digest')))
    return fail('FC-TRUST', 'INVALID_REGISTRY_SNAPSHOT');
  return ok({ position: field(value, 'position') as number, digest: field(value, 'digest') as string });
}

function registryRecord(result: unknown): RegistryRecord | undefined {
  if (!plain(result) || field(result, 'ok') !== true || !plain(field(result, 'value'))) return undefined;
  const value = field(result, 'value');
  if (field(value, 'kind') !== 'committed') return undefined;
  const record = field(value, 'record');
  return plain(record) ? (record as RegistryRecord) : undefined;
}

function recordMatches(record: RegistryRecord | undefined, action: string, payload: Record<string, unknown>): boolean {
  if (!record || !['waiter', 'grant', 'release', 'atomic-rebind'].includes(record.variant)) return false;
  const content = plain(record.content) ? record.content : {};
  if (action === 'enqueue')
    return record.variant === 'waiter' && same(content, { waiter: payload.waiter }, 'FINALIZER-REGISTRY-REPLAY');
  if (action === 'grant')
    return (
      record.variant === 'grant' &&
      record.waiter?.contentDigest === payload.waiterDigest &&
      field(content, 'targetBasisDigest') === payload.targetBasisDigest
    );
  if (action === 'release') return record.variant === 'release' && record.authority === payload.authority;
  return (
    record.variant === 'atomic-rebind' &&
    plain(record.content) &&
    plain(record.content.oldAuthority) &&
    field(record.content.oldAuthority, 'authority') === payload.authority &&
    plain(record.content.newAuthority) &&
    field(record.content.newAuthority, 'candidate') === payload.candidate &&
    field(record.content.newAuthority, 'targetBasisDigest') === payload.targetBasisDigest
  );
}

function journalDigest(
  entry: Readonly<{ position: number; previousDigest: string; record: FinalizerRecord }>,
): string | undefined {
  return derived('FINALIZER-RECORD', {
    position: entry.position,
    previousDigest: entry.previousDigest,
    record: entry.record,
  });
}

function makeAuthority(
  record: RegistryRecord,
  waiter: FinalizerWaiter,
  currentCandidate = waiter.candidate,
  currentCandidateDigest = waiter.candidateContentDigest,
  currentBasis = waiter.targetBasisDigest,
  currentGeneration = waiter.generation,
): FinalizerResult<FinalizerAuthority> {
  if (record.variant !== 'grant' && record.variant !== 'atomic-rebind') return fail('FC-TRUST', 'INVALID_GRANT_RECORD');
  const authority = record.authority;
  if (!identity('ID-AUTH', authority) || !position(record.position) || !plain(record.content))
    return fail('FC-TRUST', 'INVALID_GRANT_RECORD');
  const source = record.variant === 'atomic-rebind' ? field(record.content, 'newAuthority') : record.content;
  const fence = plain(source) ? field(source, 'fence') : undefined;
  if (
    !plain(source) ||
    (field(source, 'authority') !== undefined && field(source, 'authority') !== authority) ||
    field(source, 'candidate') !== currentCandidate ||
    field(source, 'candidateContentDigest') !== currentCandidateDigest ||
    field(source, 'eligibilityBasis') !== waiter.eligibilityBasis ||
    field(source, 'story') !== waiter.story ||
    !plain(fence) ||
    field(fence, 'registry') !== waiter.registry ||
    field(fence, 'target') !== waiter.target ||
    field(fence, 'generation') !== currentGeneration ||
    field(source, 'targetBasisDigest') !== currentBasis
  )
    return fail('FC-FENCE', 'REGISTRY_AUTHORITY_WITNESS_MISMATCH');
  const authorityGeneration = record.position;
  return ok({
    authority,
    authorityGeneration,
    registry: waiter.registry,
    target: waiter.target,
    story: waiter.story,
    candidate: currentCandidate,
    candidateContentDigest: currentCandidateDigest,
    targetBasisDigest: currentBasis,
    eligibilityBasis: waiter.eligibilityBasis,
    generation: currentGeneration,
  });
}

function validateTargetFact(input: unknown, binding: FinalizerBinding): FinalizerResult<FinalizerTargetFact> {
  const raw = own(input, [
    'anchorRegistry',
    'kind',
    'observedAt',
    'operation',
    'outcome',
    'registry',
    'schema',
    'target',
    'targetBasisDigest',
  ]);
  if (
    raw?.schema !== FINALIZER_EVENT_SCHEMA ||
    raw.kind !== 'EV-TARGET-FACT' ||
    !identity('ID-OP', raw.operation) ||
    raw.target !== binding.target ||
    raw.registry !== binding.registry ||
    !['present', 'absent', 'advanced', 'conflict', 'uncertain'].includes(raw.outcome as string) ||
    !digest(raw.targetBasisDigest) ||
    !nonNegative(raw.observedAt)
  )
    return fail('FC-EVIDENCE', 'INVALID_TARGET_FACT');
  if (raw.anchorRegistry !== null && !identity('ID-REGISTRY', raw.anchorRegistry))
    return fail('FC-EVIDENCE', 'INVALID_TARGET_ANCHOR');
  return ok(raw as FinalizerTargetFact);
}

function makeController(
  binding: FinalizerBinding,
  registry: RegistryAdapter,
  verification: ScriptedVerificationFixture,
  initial?: FinalizerSnapshot,
): ScriptedFinalizerController {
  const journal: JournalEntry[] = [];
  const waiters = new Map<string, FinalizerWaiter>();
  const intents = new Map<string, FinalizerRecord>();
  const observations = new Map<string, FinalizerVerificationObservation>();
  let authority: FinalizerAuthority | null = null;
  let entry: FinalizerEntry | null = null;
  let status: FinalizerProjection['status'] = 'Waiting';
  let anchorRegistry: string | null = null;
  let refreshCount = 0;

  const apply = (record: FinalizerRecord): void => {
    if (record.kind === 'enqueue') {
      waiters.set(record.waiter.story, record.waiter);
    } else if (record.kind === 'registry-intent') {
      intents.set(record.operation, record);
    } else if (record.kind === 'grant') {
      authority = record.authority;
      status = 'Waiting';
    } else if (record.kind === 'entry') {
      entry = record.entry;
      status = 'Finalizing';
    } else if (record.kind === 'observation') {
      observations.set(record.relatedOperation, record.observation);
      if (entry) {
        const merged = [...entry.observations, record.observation];
        const failed = record.observation.outcome === 'fail';
        const ready =
          !failed &&
          entry.requiredClasses.every((item) =>
            merged.some((observation) => observation.checkClass === item && observation.outcome === 'pass'),
          );
        entry = freeze({ ...entry, observations: Object.freeze(merged), readyForDelivery: ready });
        if (failed) status = 'Reworking';
      }
    } else if (record.kind === 'verification-failure') {
      if (record.replacement && entry) {
        const operations = entry.verificationOperations.some((item) => item.operation === record.replacement?.operation)
          ? entry.verificationOperations
          : Object.freeze([...entry.verificationOperations, record.replacement]);
        entry = freeze({ ...entry, verificationOperations: operations });
      }
      if (record.exhausted) {
        status = 'Blocked';
        if (entry) entry = freeze({ ...entry, readyForDelivery: false });
      }
    } else if (record.kind === 'delivery-intent') {
      intents.set(record.operation, record);
    } else if (record.kind === 'target-fact') {
      intents.delete(record.relatedOperation);
      anchorRegistry = record.fact.anchorRegistry;
      if (
        record.fact.outcome === 'conflict' ||
        record.fact.outcome === 'uncertain' ||
        record.fact.outcome === 'advanced'
      )
        status = 'TargetPark';
    } else if (record.kind === 'wake') {
      if (record.exhausted) status = record.event === 'EV-WAKE-AUTHORITY' ? 'Blocked' : 'TargetPark';
    } else if (record.kind === 'refresh') {
      waiters.set(record.waiter.story, record.waiter);
      authority = record.authority;
      entry = null;
      status = 'Accepted';
      refreshCount = record.refreshCount;
    } else if (record.kind === 'release') {
      authority = null;
      entry = null;
      status = record.reason === 'rework' ? 'Reworking' : 'Blocked';
    }
  };
  const append = (record: FinalizerRecord): FinalizerResult<void> => {
    const previousDigest = journal.at(-1)?.digest ?? ZERO;
    const positionValue = journal.length + 1;
    const digestValue = journalDigest({ position: positionValue, previousDigest, record });
    if (!digestValue) return fail('FC-TRUST', 'FINALIZER_RECORD_DIGEST_FAILED');
    const item = freeze({ position: positionValue, previousDigest, digest: digestValue, record });
    journal.push(item);
    apply(record);
    return ok(undefined);
  };
  const conflictingOperation = (operation: string, payload: unknown): boolean => {
    const item = journal.find((entryValue) => {
      const candidate = entryValue.record;
      return (
        ('operation' in candidate && candidate.operation === operation) ||
        ('relatedOperation' in candidate && candidate.relatedOperation === operation)
      );
    });
    return item !== undefined && !same(item.record, payload, 'FINALIZER-OPERATION-REPLAY');
  };
  const conflictingNonIntentOperation = (operation: string, payload: unknown): boolean => {
    const item = journal.find((entryValue) => {
      const candidate = entryValue.record;
      return (
        candidate.kind !== 'registry-intent' &&
        (('operation' in candidate && candidate.operation === operation) ||
          ('relatedOperation' in candidate && candidate.relatedOperation === operation))
      );
    });
    return item !== undefined && !same(item.record, payload, 'FINALIZER-OPERATION-REPLAY');
  };
  const head = (): FinalizerResult<RegistryState> => registryState(registry, binding);
  const readCurrent = (state: RegistryState): RegistryRecord | undefined => {
    const result = registry.readback({ binding, position: state.position });
    return registryRecord(result);
  };
  const verifyRegistryWitnesses = (): boolean => {
    const state = registryState(registry, binding);
    if (!state.ok) return false;
    const read = (at: number): RegistryRecord | undefined =>
      registryRecord(registry.readback({ binding, position: at }));
    for (const item of journal) {
      const record = item.record;
      if (record.kind === 'enqueue') {
        const witness = read(record.waiter.handle.position);
        const waiter = record.waiter;
        if (
          !recordMatches(witness, 'enqueue', {
            waiter: {
              run: waiter.run,
              story: waiter.story,
              generation: waiter.generation,
              candidate: waiter.candidate,
              candidateContentDigest: waiter.candidateContentDigest,
              eligibilityBasis: waiter.eligibilityBasis,
              comparator: waiter.comparator,
              waitedAt: waiter.waitedAt,
            },
          }) ||
          !witness?.handle ||
          !same(witness.handle, waiter.handle, 'FINALIZER-WAITER-HANDLE-WITNESS')
        )
          return false;
      } else if (record.kind === 'grant') {
        const waiter = waiters.get(record.authority.story);
        const witness = read(record.authority.authorityGeneration);
        if (
          !waiter ||
          !recordMatches(witness, 'grant', {
            waiterDigest: waiter.handle.contentDigest,
            story: waiter.story,
            targetBasisDigest: record.authority.targetBasisDigest,
          }) ||
          !makeAuthority(
            witness as RegistryRecord,
            waiter,
            record.authority.candidate,
            record.authority.candidateContentDigest,
            record.authority.targetBasisDigest,
            record.authority.generation,
          ).ok
        )
          return false;
      } else if (record.kind === 'refresh') {
        const waiter = waiters.get(record.authority.story);
        const witness = read(record.authority.authorityGeneration);
        if (
          !waiter ||
          !recordMatches(witness, 'rebind', {
            authority: record.authority.authority,
            candidate: record.authority.candidate,
            candidateContentDigest: record.authority.candidateContentDigest,
            targetBasisDigest: record.authority.targetBasisDigest,
          }) ||
          !makeAuthority(
            witness as RegistryRecord,
            waiter,
            record.authority.candidate,
            record.authority.candidateContentDigest,
            record.authority.targetBasisDigest,
            record.authority.generation,
          ).ok
        )
          return false;
      } else if (record.kind === 'release') {
        let found = false;
        for (let at = 0; at <= state.value.position; at += 1) {
          const witness = read(at);
          if (recordMatches(witness, 'release', { authority: record.authority.authority })) {
            found = true;
            break;
          }
        }
        if (!found) return false;
      }
    }
    return true;
  };
  const verifyVerificationWitnesses = (): boolean => {
    const state = verification.snapshot();
    for (const item of journal) {
      if (item.record.kind === 'entry') {
        for (const request of item.record.entry.verificationOperations) {
          if (!state.requests.some((candidate) => same(candidate, request, 'FINALIZER-REQUEST-WITNESS'))) return false;
        }
      } else if (item.record.kind === 'observation') {
        const observationRecord = item.record as Extract<FinalizerRecord, { kind: 'observation' }>;
        if (
          !state.observations.some((candidate) =>
            same(candidate, observationRecord.observation, 'FINALIZER-OBS-WITNESS'),
          )
        )
          return false;
      } else if (item.record.kind === 'verification-failure') {
        const failureRecord = item.record as Extract<FinalizerRecord, { kind: 'verification-failure' }>;
        const failure = state.failures.find(
          (candidate) =>
            candidate.operation === failureRecord.relatedOperation && candidate.reason === failureRecord.reason,
        );
        if (
          !failure ||
          (failureRecord.replacement
            ? failure.supersededBy !== null && failure.supersededBy !== failureRecord.replacement.operation
            : failure.supersededBy !== null)
        )
          return false;
        if (
          failureRecord.replacement &&
          !state.requests.some((request) => same(request, failureRecord.replacement, 'FINALIZER-REPLACEMENT-WITNESS'))
        )
          return false;
      }
    }
    return true;
  };
  const operationIntent = (
    operation: string,
    action: 'enqueue' | 'grant' | 'release' | 'rebind',
    payload: unknown,
  ): FinalizerResult<void> => {
    if (
      conflictingOperation(operation, {
        kind: 'registry-intent',
        operation,
        action,
        payloadDigest: derived('FINALIZER-REGISTRY-PAYLOAD', payload),
      })
    )
      return fail('FC-SUBJECT', 'OPERATION_REUSE_MISMATCH');
    const prior = journal.find(
      (entryValue) => entryValue.record.kind === 'registry-intent' && entryValue.record.operation === operation,
    );
    if (prior) return ok(undefined);
    const payloadDigest = derived('FINALIZER-REGISTRY-PAYLOAD', payload);
    return payloadDigest
      ? append({ kind: 'registry-intent', operation, action, payloadDigest })
      : fail('FC-INPUT', 'REGISTRY_INTENT_DIGEST_FAILED');
  };
  const projection = (): FinalizerProjection =>
    freeze({
      status,
      waiters: Object.freeze([...waiters.values()].sort((left, right) => compare(left.comparator, right.comparator))),
      authority,
      entry,
      pendingDeliveryOperations: Object.freeze(
        [...intents.values()]
          .filter((item) => item.kind === 'delivery-intent')
          .map((item) => item.operation)
          .sort(),
      ),
      anchorRegistry,
      refreshCount,
    });
  const enqueue = (input: unknown): FinalizerResult<FinalizerWaiter> => {
    const validated = validateWaiterInput(input, binding);
    if (!validated.ok) return validated;
    const { operation, waiter: proposed, fault } = validated.value;
    const existingFact = journal.find(
      (item) => item.record.kind === 'enqueue' && item.record.relatedOperation === operation,
    );
    if (existingFact && existingFact.record.kind === 'enqueue') {
      const expected = { ...proposed, registry: binding.registry, target: binding.target, handle: null };
      const actual = { ...existingFact.record.waiter, handle: null };
      return same(actual, expected, 'FINALIZER-WAITER-REPLAY')
        ? ok(existingFact.record.waiter)
        : fail('FC-SUBJECT', 'OPERATION_REUSE_MISMATCH');
    }
    const oldWaiter = waiters.get(proposed.story);
    if (oldWaiter) return fail('FC-AUTHORITY', 'STORY_ALREADY_QUEUED');
    const hadIntent = journal.some(
      (item) => item.record.kind === 'registry-intent' && item.record.operation === operation,
    );
    const before = head();
    if (!before.ok) return before;
    const registryWaiter = {
      run: proposed.run,
      story: proposed.story,
      generation: proposed.generation,
      candidate: proposed.candidate,
      candidateContentDigest: proposed.candidateContentDigest,
      eligibilityBasis: proposed.eligibilityBasis,
      comparator: proposed.comparator,
      waitedAt: proposed.waitedAt,
    };
    const payload = { waiter: registryWaiter };
    const intent = operationIntent(operation, 'enqueue', payload);
    if (!intent.ok) return intent;
    const result = registry.waiter({
      binding,
      expectedPosition: before.value.position,
      expectedDigest: before.value.digest,
      waiter: registryWaiter,
      ...(fault ? { fault } : {}),
    });
    let record = plain(result) && field(result, 'ok') === true ? (field(result, 'value') as RegistryRecord) : undefined;
    if (!record) {
      const recovered = head();
      if (recovered.ok && (recovered.value.position > before.value.position || hadIntent)) {
        const candidate = readCurrent(recovered.value);
        if (recordMatches(candidate, 'enqueue', payload)) record = candidate;
      }
    }
    if (record?.variant !== 'waiter' || !plain(record.handle)) return fail('FC-TRUST', 'QUEUE_APPEND_UNCERTAIN');
    const handle = record.handle as RegistryHandle;
    const waiter = freeze({ ...proposed, handle });
    const fact = append({ kind: 'enqueue', operation: null, relatedOperation: operation, waiter });
    return fact.ok ? ok(waiter) : fact;
  };
  const grant = (input: unknown): FinalizerResult<FinalizerAuthority> => {
    const raw =
      own(input, ['operation', 'story', 'waitedAt']) ?? own(input, ['operation', 'story', 'waitedAt', 'fault']);
    if (!raw || !identity('ID-OP', raw.operation) || !identity('ID-STORY', raw.story) || !position(raw.waitedAt))
      return fail('FC-INPUT', 'INVALID_GRANT_REQUEST');
    const operation = raw.operation as string;
    const priorGrant = journal.find(
      (item) => item.record.kind === 'grant' && item.record.relatedOperation === operation,
    );
    if (priorGrant && priorGrant.record.kind === 'grant') {
      return priorGrant.record.authority.story === raw.story
        ? ok(priorGrant.record.authority)
        : fail('FC-SUBJECT', 'OPERATION_REUSE_MISMATCH');
    }
    if (
      conflictingNonIntentOperation(operation, {
        kind: 'grant-request',
        operation,
        story: raw.story,
        waitedAt: raw.waitedAt,
      })
    )
      return fail('FC-SUBJECT', 'OPERATION_REUSE_MISMATCH');
    const waiter = waiters.get(raw.story as string);
    if (!waiter) return fail('FC-SUBJECT', 'UNKNOWN_FINALIZER_WAITER');
    if (authority) return fail('FC-CAPACITY', 'FINALIZER_CAPACITY_HELD');
    if (raw.waitedAt < waiter.waitedAt || raw.waitedAt - waiter.waitedAt > waiter.policy.waitCapacitySeconds)
      return fail('FC-BOUND', 'FINALIZER_CAPACITY_WAIT_EXHAUSTED');
    const hadIntent = journal.some(
      (item) => item.record.kind === 'registry-intent' && item.record.operation === operation,
    );
    const before = head();
    if (!before.ok) return before;
    const payload = {
      waiterDigest: waiter.handle.contentDigest,
      story: waiter.story,
      targetBasisDigest: waiter.targetBasisDigest,
    };
    const intent = operationIntent(operation, 'grant', payload);
    if (!intent.ok) return intent;
    const request = {
      binding,
      expectedPosition: before.value.position,
      expectedDigest: before.value.digest,
      waiter: waiter.handle,
      eligibilityBasis: waiter.eligibilityBasis,
      targetBasisDigest: waiter.targetBasisDigest,
      ...(raw.fault ? { fault: raw.fault } : {}),
    };
    const result = registry.grant(request);
    let record = plain(result) && field(result, 'ok') === true ? (field(result, 'value') as RegistryRecord) : undefined;
    if (!record) {
      const recovered = head();
      if (recovered.ok && (recovered.value.position > before.value.position || hadIntent)) {
        const candidate = readCurrent(recovered.value);
        if (recordMatches(candidate, 'grant', payload)) record = candidate;
      }
    }
    if (!record) return fail('FC-TRUST', 'GRANT_RECONCILIATION_REQUIRED');
    const created = makeAuthority(record, waiter);
    if (!created.ok) return created;
    const fact = append({ kind: 'grant', operation: null, relatedOperation: operation, authority: created.value });
    return fact.ok ? ok(created.value) : fact;
  };
  const enterFinalizing = (input: unknown): FinalizerResult<FinalizerEntry> => {
    const raw = own(input, ['operation', 'origin', 'verificationRequests']);
    if (
      !raw ||
      !identity('ID-OP', raw.operation) ||
      !['Waiting', 'Accepted'].includes(raw.origin as string) ||
      !Array.isArray(raw.verificationRequests)
    )
      return fail('FC-INPUT', 'INVALID_FINALIZATION_ENTRY');
    const prior = journal.find((item) => item.record.kind === 'entry' && item.record.operation === raw.operation);
    if (prior && prior.record.kind === 'entry') {
      if (prior.record.entry.noOp) {
        const request =
          raw.verificationRequests.length === 1 ? validateVerificationRequest(raw.verificationRequests[0]) : undefined;
        return request?.ok &&
          verification
            .snapshot()
            .requests.some((candidate) => same(candidate, request.value, 'FINALIZER-NONE-REPLAY')) &&
          raw.origin === prior.record.entry.origin
          ? ok(prior.record.entry)
          : fail('FC-SUBJECT', 'OPERATION_REUSE_MISMATCH');
      }
      return same(
        { origin: prior.record.entry.origin, verificationRequests: prior.record.entry.verificationOperations },
        { origin: raw.origin, verificationRequests: raw.verificationRequests },
        'FINALIZER-ENTRY-REPLAY',
      )
        ? ok(prior.record.entry)
        : fail('FC-SUBJECT', 'OPERATION_REUSE_MISMATCH');
    }
    if (!authority) return fail('FC-AUTHORITY', 'FINALIZER_AUTHORITY_REQUIRED');
    if (raw.origin === 'Accepted' && status !== 'Accepted')
      return fail('FC-AUTHORITY', 'RETAINED_AUTHORITY_ENTRY_REQUIRED');
    if (raw.origin === 'Waiting' && status !== 'Waiting') return fail('FC-AUTHORITY', 'WAITING_ENTRY_REQUIRED');
    const waiter = waiters.get(authority.story);
    if (!waiter) return fail('FC-TRUST', 'FINALIZER_WAITER_MISSING');
    const operations: FinalizerVerificationIntent[] = [];
    let noneRequest: FinalizerVerificationIntent | undefined;
    for (const value of raw.verificationRequests) {
      const request = validateVerificationRequest(value);
      if (!request.ok) return fail('FC-EVIDENCE', 'GF042_REQUEST_REQUIRED');
      if (
        request.value.subject.candidate !== authority.candidate ||
        request.value.subject.candidateContentDigest !== authority.candidateContentDigest ||
        request.value.fence.targetBasisDigest !== authority.targetBasisDigest ||
        request.value.fence.generation !== authority.generation ||
        request.value.fence.basis !== waiter.eligibilityBasis ||
        request.value.policy.posture !== waiter.policy.posture ||
        request.value.subject.checkClasses.join('|') !== waiter.policy.requiredClasses.join('|')
      )
        return fail('FC-FENCE', 'VERIFICATION_REQUEST_FENCE_MISMATCH');
      if (waiter.policy.posture === 'deterministic' && request.value.checkClass === null)
        return fail('FC-AUTHORITY', 'DETERMINISTIC_REQUEST_CLASS_REQUIRED');
      if (waiter.policy.posture === 'none' && request.value.checkClass !== null)
        return fail('FC-AUTHORITY', 'NONE_POSTURE_DISPATCH_FORBIDDEN');
      if (waiter.policy.posture === 'none') {
        if (noneRequest) return fail('FC-AUTHORITY', 'DUPLICATE_VERIFICATION_INTENT');
        noneRequest = request.value;
        continue;
      }
      if (
        operations.some(
          (item) => item.operation === request.value.operation || item.checkClass === request.value.checkClass,
        )
      )
        return fail('FC-AUTHORITY', 'DUPLICATE_VERIFICATION_INTENT');
      operations.push(request.value);
    }
    if (waiter.policy.posture === 'none' && !noneRequest)
      return fail('FC-AUTHORITY', 'NONE_POSTURE_DISPATCH_FORBIDDEN');
    if (waiter.policy.posture === 'deterministic' && operations.length !== waiter.policy.requiredClasses.length)
      return fail('FC-AUTHORITY', 'INCOMPLETE_VERIFICATION_INTENTS');
    if (waiter.policy.posture === 'deterministic' && operations.length > 0) {
      const entered = verification.enterFinalizing({ origin: raw.origin, request: operations[0] });
      if (!entered.ok) return fail('FC-AUTHORITY', 'VERIFICATION_ENTRY_REJECTED');
    } else if (waiter.policy.posture === 'none' && noneRequest) {
      const entered = verification.enterFinalizing({ origin: raw.origin, request: noneRequest });
      if (!entered.ok) return fail('FC-AUTHORITY', 'VERIFICATION_ENTRY_REJECTED');
    }
    const operation = raw.operation as string;
    const created: FinalizerEntry = freeze({
      operation,
      origin: raw.origin as 'Waiting' | 'Accepted',
      authority,
      posture: waiter.policy.posture,
      requiredClasses: waiter.policy.requiredClasses,
      verificationOperations: Object.freeze(operations),
      observations: Object.freeze([]),
      noOp: waiter.policy.posture === 'none',
      readyForDelivery: waiter.policy.posture === 'none' || operations.length === 0,
    });
    const result = append({ kind: 'entry', operation, entry: created });
    return result.ok ? ok(created) : result;
  };
  const observeVerification = (input: unknown): FinalizerResult<FinalizerProjection> => {
    const raw = own(input, ['authority', 'observation']);
    if (!raw || !entry || !authority || !plain(raw.authority))
      return fail('FC-INPUT', 'INVALID_VERIFICATION_OBSERVATION');
    if (!same(raw.authority, authority, 'FINALIZER-AUTHORITY-COMPARE'))
      return fail('FC-FENCE', 'STALE_VERIFICATION_AUTHORITY');
    const intent = entry.verificationOperations.find(
      (item) => plain(raw.observation) && field(raw.observation, 'operation') === item.operation,
    );
    if (!intent) return fail('FC-SUBJECT', 'UNKNOWN_VERIFICATION_OPERATION');
    const checked = validateVerificationObservation(raw.observation, intent);
    if (!checked.ok) return fail('FC-EVIDENCE', 'GF042_OBSERVATION_REQUIRED');
    const prior = observations.get(checked.value.operation);
    if (prior)
      return same(prior, checked.value, 'FINALIZER-OBSERVATION-REPLAY')
        ? ok(projection())
        : fail('FC-SUBJECT', 'DUPLICATE_VERIFICATION_OPERATION');
    const dispatched = verification.dispatch({ request: intent, attestation: checked.value });
    if (!dispatched.ok) return fail('FC-AUTHORITY', 'GF042_VERIFICATION_REJECTED');
    const consumed = verification.consume({ observation: dispatched.value });
    if (!consumed.ok) return fail('FC-AUTHORITY', 'GF042_OBSERVATION_NOT_CONSUMED');
    const result = append({
      kind: 'observation',
      operation: null,
      relatedOperation: dispatched.value.operation,
      observation: dispatched.value,
    });
    return result.ok ? ok(projection()) : result;
  };
  const recordVerificationFailure = (input: unknown): FinalizerResult<FinalizerProjection> => {
    const raw = own(input, ['operation', 'reason']) ?? own(input, ['operation', 'reason', 'replacementRequest']);
    if (!raw || !identity('ID-OP', raw.operation) || !['lost-response', 'timeout'].includes(raw.reason as string))
      return fail('FC-INPUT', 'INVALID_VERIFICATION_FAILURE');
    if (!entry?.verificationOperations.some((item) => item.operation === raw.operation))
      return fail('FC-SUBJECT', 'UNKNOWN_VERIFICATION_OPERATION');
    const request = entry.verificationOperations.find((item) => item.operation === raw.operation);
    if (!request) return fail('FC-SUBJECT', 'UNKNOWN_VERIFICATION_OPERATION');
    const replacementValue = raw.replacementRequest;
    const replacement = replacementValue === undefined ? undefined : validateVerificationRequest(replacementValue);
    if (replacementValue !== undefined && !replacement?.ok)
      return fail('FC-EVIDENCE', 'GF042_REPLACEMENT_REQUEST_REQUIRED');
    if (
      replacement?.ok &&
      (replacement.value.operation === request.operation ||
        replacement.value.retryOrdinal !== request.retryOrdinal + 1 ||
        replacement.value.predecessor !== request.operation ||
        !same(replacement.value.subject, request.subject, 'FINALIZER-REPLACEMENT-SUBJECT') ||
        !same(replacement.value.fence, request.fence, 'FINALIZER-REPLACEMENT-FENCE') ||
        !same(replacement.value.policy, request.policy, 'FINALIZER-REPLACEMENT-POLICY') ||
        !same(replacement.value.configuration, request.configuration, 'FINALIZER-REPLACEMENT-CONFIG') ||
        !same(replacement.value.environment, request.environment, 'FINALIZER-REPLACEMENT-ENV') ||
        !same(replacement.value.cleanReceipt, request.cleanReceipt, 'FINALIZER-REPLACEMENT-RECEIPT') ||
        replacement.value.checkClass !== request.checkClass ||
        !same(replacement.value.bounds, request.bounds, 'FINALIZER-REPLACEMENT-BOUNDS'))
    )
      return fail('FC-FENCE', 'GF042_REPLACEMENT_FENCE_MISMATCH');
    const shouldExhaust = request.retryOrdinal >= request.bounds.retryLimit;
    if (shouldExhaust && replacementValue !== undefined) return fail('FC-BOUND', 'GF042_RETRY_ALREADY_EXHAUSTED');
    if (!shouldExhaust && !replacement?.ok) return fail('FC-BOUND', 'GF042_REPLACEMENT_REQUIRED');
    const prior = journal.find(
      (item) => item.record.kind === 'verification-failure' && item.record.relatedOperation === raw.operation,
    );
    const record: FinalizerRecord = {
      kind: 'verification-failure',
      operation: null,
      relatedOperation: raw.operation as string,
      reason: raw.reason as 'lost-response' | 'timeout',
      exhausted: shouldExhaust,
      replacement: replacement?.ok ? replacement.value : null,
    };
    if (prior && prior.record.kind === 'verification-failure')
      return same(prior.record, record, 'FINALIZER-FAILURE-REPLAY')
        ? ok(projection())
        : fail('FC-SUBJECT', 'DUPLICATE_VERIFICATION_FAILURE');
    const dispatched = verification.dispatch({
      request,
      attestation: null,
      fault: raw.reason as 'lost-response' | 'timeout',
    });
    if (
      dispatched.ok ||
      (dispatched.error.code !== 'RESULT_UNCERTAIN' && dispatched.error.code !== 'MECHANISM_TIMEOUT')
    )
      return fail('FC-MECHANISM', 'GF042_FAILURE_NOT_RECORDED');
    const durableFailure = verification
      .failures()
      .find((failure) => failure.operation === request.operation && failure.reason === raw.reason);
    if (!durableFailure || durableFailure.supersededBy !== null)
      return fail('FC-TRUST', 'GF042_FAILURE_WITNESS_MISSING');
    if (replacement?.ok) {
      if (typeof verification.stageReplacement !== 'function')
        return fail('FC-TRUST', 'GF042_REPLACEMENT_STAGE_UNAVAILABLE');
      const staged = verification.stageReplacement({ request: replacement.value });
      if (!staged.ok) return fail('FC-AUTHORITY', 'GF042_REPLACEMENT_REJECTED');
      if (!same(staged.value, replacement.value, 'FINALIZER-REPLACEMENT-STAGE'))
        return fail('FC-TRUST', 'GF042_REPLACEMENT_WITNESS_MISMATCH');
    }
    const result = append(record);
    return result.ok ? ok(projection()) : result;
  };
  const authorizeAnchor = (input: unknown): FinalizerResult<FinalizerDeliveryIntent> => {
    const raw = own(input, ['authority', 'operation']);
    if (!raw || !identity('ID-OP', raw.operation)) return fail('FC-INPUT', 'INVALID_ANCHOR_OPERATION');
    const prior = journal.find(
      (item) => item.record.kind === 'delivery-intent' && item.record.operation === raw.operation,
    );
    if (prior && prior.record.kind === 'delivery-intent') {
      if (!plain(raw.authority) || !same(raw.authority, prior.record.authority, 'FINALIZER-AUTHORITY-COMPARE'))
        return fail('FC-SUBJECT', 'OPERATION_REUSE_MISMATCH');
      return ok({
        operation: prior.record.operation,
        candidate: prior.record.authority.candidate,
        candidateContentDigest: prior.record.authority.candidateContentDigest,
        targetBasisDigest: prior.record.authority.targetBasisDigest,
        generation: prior.record.authority.generation,
        authority: prior.record.authority.authority,
      });
    }
    if (!authority || !entry) return fail('FC-AUTHORITY', 'ANCHOR_AUTHORITY_REQUIRED');
    if (!same(raw.authority, authority, 'FINALIZER-AUTHORITY-COMPARE'))
      return fail('FC-FENCE', 'STALE_ANCHOR_AUTHORITY');
    if (!entry.readyForDelivery || status !== 'Finalizing') return fail('FC-AUTHORITY', 'VERIFICATION_GATE_INCOMPLETE');
    if ([...intents.values()].some((item) => item.kind === 'delivery-intent'))
      return fail('FC-AUTHORITY', 'ANCHOR_INTENT_PENDING');
    const intent: FinalizerDeliveryIntent = {
      operation: raw.operation as string,
      candidate: authority.candidate,
      candidateContentDigest: authority.candidateContentDigest,
      targetBasisDigest: authority.targetBasisDigest,
      generation: authority.generation,
      authority: authority.authority,
    };
    const result = append({ kind: 'delivery-intent', operation: intent.operation, type: 'OPC-DEL-ANCHOR', authority });
    return result.ok ? ok(intent) : result;
  };
  const recordTargetFact = (input: unknown): FinalizerResult<FinalizerProjection> => {
    const raw = own(input, ['authority', 'fact']);
    if (!raw || !authority || !plain(raw.authority)) return fail('FC-INPUT', 'INVALID_TARGET_FACT');
    if (!same(raw.authority, authority, 'FINALIZER-AUTHORITY-COMPARE'))
      return fail('FC-FENCE', 'STALE_TARGET_AUTHORITY');
    const fact = validateTargetFact(raw.fact, binding);
    if (!fact.ok) return fact;
    if (fact.value.outcome !== 'advanced' && fact.value.targetBasisDigest !== authority.targetBasisDigest)
      return fail('FC-FENCE', 'TARGET_FACT_BASIS_MISMATCH');
    if (fact.value.outcome === 'advanced' && fact.value.targetBasisDigest === authority.targetBasisDigest)
      return fail('FC-FENCE', 'ADVANCED_TARGET_FACT_REQUIRES_NEW_BASIS');
    if (fact.value.outcome === 'present' && fact.value.anchorRegistry !== binding.registry)
      return fail('FC-AUTHORITY', 'PRESENT_TARGET_REQUIRES_SAME_REGISTRY');
    if (fact.value.outcome === 'absent' && fact.value.anchorRegistry !== null)
      return fail('FC-AUTHORITY', 'ABSENT_TARGET_CANNOT_HAVE_ANCHOR');
    const prior = journal.find(
      (item) => item.record.kind === 'target-fact' && item.record.relatedOperation === fact.value.operation,
    );
    if (prior && prior.record.kind === 'target-fact')
      return same(prior.record.fact, fact.value, 'FINALIZER-TARGET-REPLAY')
        ? ok(projection())
        : fail('FC-SUBJECT', 'TARGET_OPERATION_REUSE_MISMATCH');
    const pending = intents.get(fact.value.operation);
    if (pending?.kind !== 'delivery-intent') return fail('FC-AUTHORITY', 'TARGET_FACT_WITHOUT_INTENT');
    if (
      fact.value.outcome !== 'conflict' &&
      fact.value.anchorRegistry !== null &&
      fact.value.anchorRegistry !== binding.registry
    )
      return fail('FC-AUTHORITY', 'FOREIGN_TARGET_ANCHOR');
    const result = append({
      kind: 'target-fact',
      operation: null,
      relatedOperation: fact.value.operation,
      fact: fact.value,
    });
    return result.ok ? ok(projection()) : result;
  };
  const refresh = (input: unknown): FinalizerResult<FinalizerAuthority> => {
    const raw = own(input, [
      'acceptanceController',
      'authority',
      'candidateCarrier',
      'operation',
      'workspaceController',
    ]);
    if (!raw || !identity('ID-OP', raw.operation)) return fail('FC-INPUT', 'INVALID_REFRESH');
    const prior = journal.find((item) => item.record.kind === 'refresh' && item.record.operation === raw.operation);
    if (prior && prior.record.kind === 'refresh') return ok(prior.record.authority);
    if (!authority || !plain(raw.authority)) return fail('FC-INPUT', 'INVALID_REFRESH');
    if (status !== 'Finalizing' && status !== 'TargetPark') return fail('FC-AUTHORITY', 'REFRESH_NOT_ACTIVE');
    if (!same(raw.authority, authority, 'FINALIZER-AUTHORITY-COMPARE'))
      return fail('FC-FENCE', 'STALE_REFRESH_AUTHORITY');
    if (refreshCount >= (waiters.get(authority.story)?.policy.refreshLimit ?? 0))
      return fail('FC-BOUND', 'REFRESH_EXHAUSTED');
    const candidateResult = validateCandidateCarrier(raw.candidateCarrier);
    if (!candidateResult.ok) return fail('FC-EVIDENCE', 'DURABLE_CANDIDATE_REQUIRED');
    const candidate = candidateResult.value;
    if (candidate.id === authority.candidate) return fail('FC-AUTHORITY', 'CANDIDATE_REFRESH_REQUIRED');
    if (!candidate.id.startsWith(`${authority.story}/cand/`) || candidate.generation !== authority.generation)
      return fail('FC-FENCE', 'REFRESH_CANDIDATE_SCOPE_MISMATCH');
    const durablePackage = acceptedPackage(raw.acceptanceController, candidate);
    if (!durablePackage.ok) return durablePackage;
    const workspace = durableWorkspace(raw.workspaceController, candidate, binding);
    if (!workspace.ok || workspace.value.binding.subject.story !== authority.story)
      return fail('FC-EVIDENCE', 'INVALID_REFRESH_WORKSPACE_FACT');
    const operation = raw.operation as string;
    const hadIntent = journal.some(
      (item) => item.record.kind === 'registry-intent' && item.record.operation === operation,
    );
    const before = head();
    if (!before.ok) return before;
    const payload = {
      authority: authority.authority,
      candidate: candidate.id,
      candidateContentDigest: candidate.candidateContentDigest,
      targetBasisDigest: candidate.targetBasisDigest,
    };
    const intent = operationIntent(operation, 'rebind', payload);
    if (!intent.ok) return intent;
    const proof = {
      authority: authority.authority,
      candidate: authority.candidate,
      generation: authority.generation,
      kind: 'structural-no-effect',
      registry: authority.registry,
      target: authority.target,
    };
    const result = registry.atomicRebind({
      binding,
      expectedPosition: before.value.position,
      expectedDigest: before.value.digest,
      authority: authority.authority,
      releaseProof: proof,
      candidate: candidate.id,
      candidateContentDigest: candidate.candidateContentDigest,
      targetBasisDigest: candidate.targetBasisDigest,
      eligibilityBasis: waiterFor(authority.story)?.eligibilityBasis,
      generation: candidate.generation,
    });
    let record = plain(result) && field(result, 'ok') === true ? (field(result, 'value') as RegistryRecord) : undefined;
    if (!record) {
      const recovered = head();
      if (recovered.ok && (recovered.value.position > before.value.position || hadIntent)) {
        const candidateRecord = readCurrent(recovered.value);
        if (recordMatches(candidateRecord, 'rebind', payload)) record = candidateRecord;
      }
    }
    if (!record) return fail('FC-TRUST', 'REFRESH_RECONCILIATION_REQUIRED');
    const waiter = waiterFor(authority.story);
    if (!waiter) return fail('FC-TRUST', 'REFRESH_WAITER_MISSING');
    const reboundWaiter = freeze({
      ...waiter,
      candidate: candidate.id,
      candidateContentDigest: candidate.candidateContentDigest,
      targetBasisDigest: candidate.targetBasisDigest,
      acceptedPackageDigest: durablePackage.value.digest,
      handle: waiter.handle,
    });
    const created = makeAuthority(
      record,
      reboundWaiter,
      candidate.id,
      candidate.candidateContentDigest,
      candidate.targetBasisDigest,
      candidate.generation,
    );
    if (!created.ok) return created;
    const fact = append({
      kind: 'refresh',
      operation,
      authority: created.value,
      waiter: reboundWaiter,
      entryCleared: true,
      refreshCount: refreshCount + 1,
    });
    return fact.ok ? ok(created.value) : fact;
  };
  const waiterFor = (story: string): FinalizerWaiter | undefined => waiters.get(story);
  const release = (input: unknown): FinalizerResult<FinalizerProjection> => {
    const raw = own(input, ['authority', 'operation', 'reason']);
    if (!raw || !identity('ID-OP', raw.operation) || !['rework', 'blocked'].includes(raw.reason as string))
      return fail('FC-INPUT', 'INVALID_FINALIZER_RELEASE');
    const prior = journal.find((item) => item.record.kind === 'release' && item.record.operation === raw.operation);
    if (prior && prior.record.kind === 'release') {
      if (!plain(raw.authority) || !same(raw.authority, prior.record.authority, 'FINALIZER-AUTHORITY-COMPARE'))
        return fail('FC-SUBJECT', 'OPERATION_REUSE_MISMATCH');
      return ok(projection());
    }
    if (!authority || !plain(raw.authority)) return fail('FC-INPUT', 'INVALID_FINALIZER_RELEASE');
    if (!same(raw.authority, authority, 'FINALIZER-AUTHORITY-COMPARE'))
      return fail('FC-FENCE', 'STALE_FINALIZER_RELEASE');
    if (raw.reason === 'rework' && status !== 'Reworking') return fail('FC-AUTHORITY', 'RELEASE_PREREQUISITE_REQUIRED');
    if (raw.reason === 'blocked' && status !== 'Blocked') return fail('FC-AUTHORITY', 'RELEASE_PREREQUISITE_REQUIRED');
    if ([...intents.values()].some((item) => item.kind === 'delivery-intent'))
      return fail('FC-AUTHORITY', 'RECONCILE_TARGET_OPERATION_FIRST');
    const operation = raw.operation as string;
    const hadIntent = journal.some(
      (item) => item.record.kind === 'registry-intent' && item.record.operation === operation,
    );
    const before = head();
    if (!before.ok) return before;
    const payload = { authority: authority.authority };
    const intent = operationIntent(operation, 'release', payload);
    if (!intent.ok) return intent;
    const proof = {
      authority: authority.authority,
      candidate: authority.candidate,
      generation: authority.generation,
      kind: 'structural-no-effect',
      registry: authority.registry,
      target: authority.target,
    };
    const result = registry.release({
      binding,
      expectedPosition: before.value.position,
      expectedDigest: before.value.digest,
      authority: authority.authority,
      proof,
    });
    let record = plain(result) && field(result, 'ok') === true ? (field(result, 'value') as RegistryRecord) : undefined;
    if (!record) {
      const recovered = head();
      if (recovered.ok && (recovered.value.position > before.value.position || hadIntent)) {
        const candidate = readCurrent(recovered.value);
        if (recordMatches(candidate, 'release', payload)) record = candidate;
      }
    }
    if (!record) return fail('FC-TRUST', 'RELEASE_RECONCILIATION_REQUIRED');
    const fact = append({ kind: 'release', operation, reason: raw.reason as 'rework' | 'blocked', authority });
    return fact.ok ? ok(projection()) : fact;
  };
  const wake = (input: unknown): FinalizerResult<Readonly<{ reread: true; projection: FinalizerProjection }>> => {
    const raw = own(input, ['event', 'observedAt', 'operation', 'story']);
    if (
      !raw ||
      !identity('ID-OP', raw.operation) ||
      !identity('ID-STORY', raw.story) ||
      !['EV-WAKE-AUTHORITY', 'EV-WAKE-FINALIZATION'].includes(raw.event as string) ||
      !position(raw.observedAt)
    )
      return fail('FC-INPUT', 'INVALID_FINALIZER_WAKE');
    const waiter = waiters.get(raw.story as string);
    if (!waiter) return fail('FC-SUBJECT', 'UNKNOWN_FINALIZER_WAITER');
    if (raw.observedAt < waiter.waitedAt) return fail('FC-BOUND', 'FINALIZER_WAKE_CLOCK_REGRESSION');
    const elapsedSeconds = (raw.observedAt as number) - waiter.waitedAt;
    const limit =
      raw.event === 'EV-WAKE-AUTHORITY' ? waiter.policy.waitCapacitySeconds : waiter.policy.waitTargetSeconds;
    const reread = head();
    if (!reread.ok) return reread;
    const exhausted = elapsedSeconds > limit;
    const prior = journal.find((item) => item.record.kind === 'wake' && item.record.relatedOperation === raw.operation);
    if (prior && prior.record.kind === 'wake')
      return same(
        prior.record,
        {
          kind: 'wake',
          operation: null,
          relatedOperation: raw.operation,
          event: raw.event,
          story: raw.story,
          elapsedSeconds,
          limitSeconds: limit,
          exhausted,
        },
        'FINALIZER-WAKE-REPLAY',
      )
        ? ok({ reread: true, projection: projection() })
        : fail('FC-SUBJECT', 'OPERATION_REUSE_MISMATCH');
    const result = append({
      kind: 'wake',
      operation: null,
      relatedOperation: raw.operation as string,
      event: raw.event as 'EV-WAKE-AUTHORITY' | 'EV-WAKE-FINALIZATION',
      story: raw.story as string,
      elapsedSeconds,
      limitSeconds: limit,
      exhausted,
    });
    return result.ok ? ok({ reread: true, projection: projection() }) : result;
  };
  if (initial) {
    if (!same(initial.binding, binding, 'FINALIZER-BINDING-INITIAL')) throw new Error('FINALIZER_BINDING_MISMATCH');
    for (const item of initial.records) {
      if (
        !item ||
        item.position !== journal.length + 1 ||
        item.previousDigest !== (journal.at(-1)?.digest ?? ZERO) ||
        !digest(item.digest) ||
        journalDigest(item) !== item.digest
      )
        throw new Error('INVALID_FINALIZER_SNAPSHOT');
      journal.push(item);
      apply(item.record);
    }
    const currentHead = registryState(registry, binding);
    if (!currentHead.ok || !same(currentHead.value, initial.registryHead, 'FINALIZER-REGISTRY-HEAD'))
      throw new Error('FINALIZER_REGISTRY_HEAD_MISMATCH');
    if (!same(verification.snapshot(), initial.verificationSnapshot, 'FINALIZER-VERIFICATION-RECOVERY'))
      throw new Error('FINALIZER_VERIFICATION_SNAPSHOT_MISMATCH');
    if (!verifyVerificationWitnesses()) throw new Error('FINALIZER_VERIFICATION_WITNESS_MISMATCH');
    if (!verifyRegistryWitnesses()) throw new Error('FINALIZER_REGISTRY_WITNESS_MISMATCH');
    if (!same(projection(), initial.projection, 'FINALIZER-RECOVERY-PROJECTION'))
      throw new Error('FINALIZER_PROJECTION_DRIFT');
  }
  return freeze({
    enqueue,
    grant,
    enterFinalizing,
    observeVerification,
    recordVerificationFailure,
    authorizeAnchor,
    recordTargetFact,
    refresh,
    release,
    wake,
    projection,
    snapshot: () =>
      freeze({
        schema: FINALIZER_SNAPSHOT_SCHEMA,
        binding,
        registryHead: headValue(),
        records: Object.freeze([...journal]),
        projection: projection(),
        verificationSnapshot: verification.snapshot(),
      }),
    records: () => Object.freeze([...journal]),
    reachability: () =>
      Object.freeze({
        status: 'scripted-only' as const,
        providerEnabled: false as const,
        externalEffects: false as const,
        landingEnabled: false as const,
      }),
  });

  function headValue(): RegistryState {
    const result = registryState(registry, binding);
    if (!result.ok) throw new Error(result.error.code);
    return result.value;
  }
}

function compare(left: FinalizerComparator, right: FinalizerComparator): number {
  for (const [a, b] of [
    [left.priority, right.priority],
    [left.ordinal, right.ordinal],
    [left.story, right.story],
  ] as const) {
    if (a < b) return -1;
    if (a > b) return 1;
  }
  return 0;
}

export function createScriptedFinalizerController(input: unknown = {}): FinalizerResult<ScriptedFinalizerController> {
  const raw = plain(input) ? input : {};
  const binding = validateBinding(field(raw, 'binding'));
  if (!binding.ok) return binding;
  const verification = field(raw, 'verification') as ScriptedVerificationFixture | undefined;
  if (
    !verification ||
    typeof verification.dispatch !== 'function' ||
    typeof verification.stageReplacement !== 'function' ||
    typeof verification.enterFinalizing !== 'function' ||
    typeof verification.consume !== 'function' ||
    typeof verification.snapshot !== 'function'
  )
    return fail('FC-TRUST', 'GF042_VERIFICATION_FIXTURE_REQUIRED');
  const registry =
    (field(raw, 'registry') as RegistryAdapter | undefined) ?? (createScriptedRegistry() as RegistryAdapter);
  try {
    return ok(
      makeController(
        binding.value,
        registry,
        verification,
        field(raw, 'initialSnapshot') as FinalizerSnapshot | undefined,
      ),
    );
  } catch (error) {
    return fail('FC-TRUST', error instanceof Error ? error.message : 'INVALID_FINALIZER_SNAPSHOT');
  }
}

export function restoreScriptedFinalizerController(
  snapshot: unknown,
  input: unknown,
): FinalizerResult<ScriptedFinalizerController> {
  if (
    !plain(snapshot) ||
    field(snapshot, 'schema') !== FINALIZER_SNAPSHOT_SCHEMA ||
    !Array.isArray(field(snapshot, 'records')) ||
    !plain(field(snapshot, 'projection')) ||
    !plain(field(snapshot, 'registryHead')) ||
    !plain(field(snapshot, 'verificationSnapshot'))
  )
    return fail('FC-TRUST', 'INVALID_FINALIZER_SNAPSHOT');
  const binding = validateBinding(field(snapshot, 'binding'));
  if (!binding.ok) return binding;
  const supplied = plain(input) ? input : {};
  const suppliedBinding = validateBinding(field(supplied, 'binding'));
  if (!suppliedBinding.ok || !same(suppliedBinding.value, binding.value, 'FINALIZER-BINDING-RECOVERY'))
    return fail('FC-FENCE', 'FINALIZER_BINDING_MISMATCH');
  const suppliedAuthorizer = field(supplied, 'verificationAuthorizer');
  if (!plain(suppliedAuthorizer) || typeof field(suppliedAuthorizer, 'recordDispatch') !== 'function')
    return fail('FC-TRUST', 'GF042_VERIFICATION_AUTHORIZER_REQUIRED');
  const restoredVerification = restoreScriptedVerificationFixture(
    field(snapshot, 'verificationSnapshot'),
    suppliedAuthorizer as { recordDispatch(input: unknown): unknown },
  );
  if (!restoredVerification.ok) return fail('FC-TRUST', 'INVALID_VERIFICATION_SNAPSHOT');
  const created = createScriptedFinalizerController({
    binding: binding.value,
    registry: field(supplied, 'registry'),
    verification: restoredVerification.value,
    initialSnapshot: snapshot as FinalizerSnapshot,
  });
  return created;
}
