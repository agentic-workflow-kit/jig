import { parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';
import {
  type ReviewPackage,
  restoreScriptedAcceptanceController,
  validateAcceptanceCandidate,
  validateAcceptancePackage,
} from './acceptance.js';
import {
  FINALIZER_EVENT_SCHEMA,
  type FinalizerBinding,
  type FinalizerProjection,
  type FinalizerSnapshot,
  restoreScriptedFinalizerController,
} from './finalizer.js';

export const DELIVERY_CONTRACT_VERSION = 'jig.delivery-contract.v1';
export const DELIVERY_SNAPSHOT_SCHEMA = 'jig.delivery-snapshot.v1';
export const DELIVERY_EVENT_SCHEMA = 'jig.delivery-event.v1';
export const DELIVERY_PORT = 'PORT-DELIVERY';
export const DELIVERY_CONTROLLER = 'RT-CONTROLLER';
export const DELIVERY_OPERATION = 'CP-FINALIZER';
export const DELIVERY_OPERATION_CLASSES = Object.freeze([
  'OPC-DEL-ANCHOR',
  'OPC-DEL-PUBLISH',
  'OPC-DEL-REQUEST',
  'OPC-DEL-STATUS',
  'OPC-DEL-COMMENT',
  'OPC-DEL-MERGE',
  'OPC-DEL-OBSERVE',
] as const);
export const DELIVERY_WAIT_BOUNDS = Object.freeze({
  mechanismSeconds: Object.freeze({ minimum: 5, maximum: 7_200 }),
  retryLimit: Object.freeze({ default: 3, minimum: 1, maximum: 5 }),
  recoveryLimit: Object.freeze({ minimum: 1, maximum: 5 }),
  targetSeconds: Object.freeze({ minimum: 60, maximum: 86_400 }),
});
export const DELIVERY_STRATEGIES = Object.freeze([
  'direct-fast-forward',
  'merge-commit',
  'squash',
  'merge-queue',
] as const);

type DeliveryOperationClass = (typeof DELIVERY_OPERATION_CLASSES)[number];
type DeliveryStrategy = (typeof DELIVERY_STRATEGIES)[number];
type DeliveryOutcome = 'success' | 'absent' | 'uncertain' | 'held' | 'failure' | 'conflict';
type DeliveryObservationOutcome = 'ready' | 'absent' | 'held' | 'advanced' | 'conflict' | 'uncertain' | 'present';
type DeliveryStatus = 'Ready' | 'Recovering' | 'TargetWait' | 'Parked' | 'Landed';
export type DeliveryFailureFamily =
  | 'FC-INPUT'
  | 'FC-AUTHORITY'
  | 'FC-SUBJECT'
  | 'FC-FENCE'
  | 'FC-MECHANISM'
  | 'FC-EFFECT'
  | 'FC-RECOVERY'
  | 'FC-BOUND'
  | 'FC-EVIDENCE'
  | 'FC-TRUST';
export type DeliveryFailure = Readonly<{ family: DeliveryFailureFamily; code: string }>;
export type DeliveryResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: DeliveryFailure }>;

export type DeliveryStrategyBinding = Readonly<{
  mode: DeliveryStrategy;
  digest: string;
}>;
export type DeliveryGateRequirement = Readonly<{
  schema: 'jig.delivery-gate-requirement.v1';
  required: boolean;
  subject: string | null;
  correlationKey: string | null;
  resourceIdentity: string | null;
  maxAgeSeconds: number | null;
  asOf: number | null;
  acceptedPackageDigest: string;
  candidate: string;
  targetBasisDigest: string;
  generation: string;
  authority: string;
  registry: string;
  target: string;
  digest: string;
}>;
export type DeliveryEffectFact = Readonly<{
  schema: typeof DELIVERY_EVENT_SCHEMA;
  kind: 'EV-EFFECT-CERTAINTY';
  operation: string;
  type: DeliveryOperationClass;
  target: string;
  registry: string;
  generation: string;
  authority: string;
  candidate: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
  correlationKey: string;
  resourceIdentity: string;
  outcome: DeliveryOutcome;
  observedAt: number;
  failurePhase: 'pre-dispatch' | 'post-dispatch' | null;
  result: Readonly<Record<string, string>>;
}>;
export type DeliveryObservationFact = Readonly<{
  schema: typeof DELIVERY_EVENT_SCHEMA;
  kind: 'EV-TARGET-FACT' | 'EV-DELIVERY-OBSERVATION';
  operation: string;
  subject: 'target' | 'gate' | 'effect';
  target: string;
  registry: string;
  generation: string;
  authority: string;
  candidate: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
  correlationKey: string;
  resourceIdentity: string;
  resolvesOperation: string | null;
  outcome: DeliveryObservationOutcome;
  observedAt: number;
  result: Readonly<Record<string, string>>;
}>;
export type DeliveryIntent = Readonly<{
  schema: typeof DELIVERY_EVENT_SCHEMA;
  kind: 'OPERATION-INTENT';
  operation: string;
  type: DeliveryOperationClass;
  target: string;
  registry: string;
  candidate: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
  subject: 'target' | 'gate' | 'effect';
  generation: string;
  authority: string;
  transition: string;
  correlationKey: string;
  resourceIdentity: string;
  strategy: DeliveryStrategy;
}>;
export type DeliveryLandingProof = Readonly<{
  schema: typeof DELIVERY_EVENT_SCHEMA;
  kind: 'EV-LANDING-OBSERVED';
  operation: string;
  mergeOperation: string;
  targetObservationOperation: string;
  target: string;
  registry: string;
  candidate: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
  strategy: DeliveryStrategy;
  equivalence: 'commit-and-content' | 'tree-and-change-set';
  equivalenceDigest: string;
  observedAt: number;
  result: Readonly<Record<string, string>>;
}>;
export type DeliveryCarrier = Readonly<{
  binding: FinalizerBinding;
  run: string;
  story: string;
  candidate: string;
  candidatePrincipal: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
  generation: string;
  authority: string;
  anchorOperation: string;
  anchorTransition: string;
  remoteGate: DeliveryGateRequirement;
  acceptedPackageDigest: string;
  strategy: DeliveryStrategyBinding;
  waitTargetSeconds: number;
  retryLimit: number;
  recoveryLimit: number;
  changedPaths: readonly Readonly<{ path: string; contentDigest: string }>[];
  workspaceCommit: string | null;
  treeDigest: string;
}>;
export type DeliveryProjection = Readonly<{
  status: DeliveryStatus;
  carrier: DeliveryCarrier;
  intents: readonly DeliveryIntent[];
  effects: readonly DeliveryEffectFact[];
  observations: readonly DeliveryObservationFact[];
  landing: DeliveryLandingProof | null;
  releasedStories: readonly string[];
  recovery: Readonly<{ operation: string; observations: number; limit: number }> | null;
  targetWait: Readonly<{ operation: string; startedAt: number; deadline: number; observations: number }> | null;
  finalizer: FinalizerProjection;
}>;

type DeliveryRecord =
  | Readonly<{ kind: 'intent'; intent: DeliveryIntent }>
  | Readonly<{ kind: 'effect'; fact: DeliveryEffectFact }>
  | Readonly<{ kind: 'observation'; fact: DeliveryObservationFact }>
  | Readonly<{
      kind: 'retry-authorized';
      operation: string;
      predecessor: string;
      ordinal: number;
      correlationKey: string;
      resourceIdentity: string;
    }>
  | Readonly<{ kind: 'recovery-resolved'; operation: string; observedOperation: string; outcome: 'success' | 'absent' }>
  | Readonly<{ kind: 'wait-exhausted'; operation: string; observedOperation: string }>
  | Readonly<{ kind: 'landing'; proof: DeliveryLandingProof }>
  | Readonly<{ kind: 'release'; story: string; landingOperation: string }>;
type JournalEntry = Readonly<{ position: number; previousDigest: string; digest: string; record: DeliveryRecord }>;
export type DeliverySnapshot = Readonly<{
  schema: typeof DELIVERY_SNAPSHOT_SCHEMA;
  carrier: DeliveryCarrier;
  status: DeliveryStatus;
  records: readonly JournalEntry[];
  projection: DeliveryProjection;
  finalizerSnapshot: FinalizerSnapshot;
}>;

export type ScriptedDeliveryMechanism = Readonly<{
  attestEffect(
    input: Readonly<{ operation: string; type: DeliveryOperationClass }>,
  ): DeliveryResult<DeliveryEffectFact>;
  attestObservation(
    input: Readonly<{ operation: string; subject: 'target' | 'gate' | 'effect' }>,
  ): DeliveryResult<DeliveryObservationFact>;
  reachability(): Readonly<{
    status: 'scripted-only';
    providerEnabled: false;
    credentials: false;
    externalEffects: false;
  }>;
}>;
export type ScriptedDeliveryController = Readonly<{
  authorize(input: unknown): DeliveryResult<DeliveryIntent>;
  dispatch(input: unknown): DeliveryResult<DeliveryProjection>;
  observe(input: unknown): DeliveryResult<DeliveryProjection>;
  wake(input: unknown): DeliveryResult<DeliveryProjection>;
  recordLanded(input: unknown): DeliveryResult<DeliveryLandingProof>;
  projection(): DeliveryProjection;
  snapshot(): DeliverySnapshot;
  records(): readonly JournalEntry[];
  reachability(): Readonly<{
    status: 'scripted-only';
    providerEnabled: false;
    landingEnabled: false;
    externalEffects: false;
  }>;
}>;

const ZERO = '0'.repeat(64);
const DIGEST = /^[0-9a-f]{64}$/u;
const TEXT = /^[a-z0-9](?:[a-z0-9._/-]{0,127})$/u;
const freeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const ok = <T>(value: T): DeliveryResult<T> => Object.freeze({ ok: true, value: freeze(value) });
const fail = <T = never>(family: DeliveryFailureFamily, code: string): DeliveryResult<T> =>
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
    return names.length === expected.length && names.every((name, index) => name === expected[index])
      ? value
      : undefined;
  } catch {
    return undefined;
  }
};
const field = (value: unknown, key: string): unknown =>
  plain(value) ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
const digest = (value: unknown): value is string => typeof value === 'string' && DIGEST.test(value);
const identity = (kind: string, value: unknown): value is string =>
  typeof value === 'string' && parseIdentity(kind, value).ok;
const position = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const same = (left: unknown, right: unknown, domain = 'DELIVERY-COMPARE'): boolean => {
  try {
    const a = stageDigest({ domain, excludePaths: [], value: left as never });
    const b = stageDigest({ domain, excludePaths: [], value: right as never });
    return a.ok && b.ok && a.value.digest === b.value.digest;
  } catch {
    return false;
  }
};
const derive = (domain: string, value: unknown): string | undefined => {
  try {
    const result = stageDigest({ domain, excludePaths: [], value: value as never });
    return result.ok ? result.value.digest : undefined;
  } catch {
    return undefined;
  }
};
const operationTransition = (operation: string): string | undefined => {
  const marker = operation.lastIndexOf('/op/');
  return marker > 0 ? operation.slice(0, marker) : undefined;
};

export function deriveDeliveryStrategyDigest(mode: DeliveryStrategy): string | undefined {
  return DELIVERY_STRATEGIES.includes(mode) ? derive('DELIVERY-STRATEGY', { mode }) : undefined;
}

export function deriveDeliveryChangeSetDigest(
  input: Readonly<{
    targetBasisDigest: string;
    changedPaths: readonly Readonly<{ path: string; contentDigest: string }>[];
  }>,
): string | undefined {
  return derive('DELIVERY-CHANGE-SET', input);
}

const gateRequirementDigestInput = (
  value: Readonly<Omit<DeliveryGateRequirement, 'digest'>>,
): Readonly<Omit<DeliveryGateRequirement, 'digest'>> => value;

export function deriveDeliveryGateRequirementDigest(
  input: Readonly<Omit<DeliveryGateRequirement, 'digest'>>,
): string | undefined {
  return derive('DELIVERY-GATE-REQUIREMENT', gateRequirementDigestInput(input));
}

function validateGateRequirement(value: unknown): DeliveryResult<DeliveryGateRequirement> {
  const raw = own(value, [
    'acceptedPackageDigest',
    'asOf',
    'authority',
    'candidate',
    'correlationKey',
    'digest',
    'generation',
    'maxAgeSeconds',
    'registry',
    'required',
    'resourceIdentity',
    'schema',
    'subject',
    'target',
    'targetBasisDigest',
  ]);
  if (
    raw?.schema !== 'jig.delivery-gate-requirement.v1' ||
    typeof raw.required !== 'boolean' ||
    !digest(raw.acceptedPackageDigest) ||
    !identity('ID-CAND', raw.candidate) ||
    !digest(raw.targetBasisDigest) ||
    !identity('ID-GEN', raw.generation) ||
    !identity('ID-AUTH', raw.authority) ||
    !identity('ID-REGISTRY', raw.registry) ||
    !identity('ID-TARGET', raw.target) ||
    !digest(raw.digest)
  )
    return fail('FC-INPUT', 'INVALID_REMOTE_GATE_REQUIREMENT');
  if (raw.required) {
    if (
      typeof raw.subject !== 'string' ||
      !TEXT.test(raw.subject) ||
      typeof raw.correlationKey !== 'string' ||
      !TEXT.test(raw.correlationKey) ||
      typeof raw.resourceIdentity !== 'string' ||
      !TEXT.test(raw.resourceIdentity) ||
      !position(raw.asOf) ||
      typeof raw.maxAgeSeconds !== 'number' ||
      !Number.isSafeInteger(raw.maxAgeSeconds) ||
      raw.maxAgeSeconds < 1 ||
      raw.maxAgeSeconds > DELIVERY_WAIT_BOUNDS.targetSeconds.maximum
    )
      return fail('FC-INPUT', 'INVALID_REMOTE_GATE_REQUIREMENT');
  } else if (
    raw.subject !== null ||
    raw.correlationKey !== null ||
    raw.resourceIdentity !== null ||
    raw.asOf !== null ||
    raw.maxAgeSeconds !== null
  )
    return fail('FC-AUTHORITY', 'NO_REQUIRED_GATE_MUST_BE_EXPLICIT');
  const { digest: suppliedDigest, ...digestInput } = raw;
  const expected = deriveDeliveryGateRequirementDigest(digestInput as Omit<DeliveryGateRequirement, 'digest'>);
  return expected && expected === suppliedDigest
    ? ok(raw as DeliveryGateRequirement)
    : fail('FC-FENCE', 'REMOTE_GATE_POLICY_DIGEST_MISMATCH');
}

export function createDeliveryStrategy(input: unknown): DeliveryResult<DeliveryStrategyBinding> {
  const raw = own(input, ['digest', 'mode']);
  if (!raw || !DELIVERY_STRATEGIES.includes(raw.mode as DeliveryStrategy))
    return fail('FC-INPUT', 'INVALID_DELIVERY_STRATEGY');
  const expected = deriveDeliveryStrategyDigest(raw.mode as DeliveryStrategy);
  return expected && expected === raw.digest
    ? ok({ mode: raw.mode as DeliveryStrategy, digest: expected })
    : fail('FC-FENCE', 'STRATEGY_DIGEST_MISMATCH');
}

function validateBinding(input: unknown): DeliveryResult<FinalizerBinding> {
  const raw = own(input, ['descriptor', 'registry', 'target']);
  if (!raw || !digest(raw.descriptor) || !identity('ID-REGISTRY', raw.registry) || !identity('ID-TARGET', raw.target))
    return fail('FC-INPUT', 'INVALID_DELIVERY_BINDING');
  return raw.registry === `registry/${raw.descriptor}`
    ? ok({ descriptor: raw.descriptor as string, registry: raw.registry as string, target: raw.target as string })
    : fail('FC-FENCE', 'FOREIGN_DELIVERY_REGISTRY');
}

function validateResult(value: unknown): DeliveryResult<Readonly<Record<string, string>>> {
  if (!plain(value)) return fail('FC-EVIDENCE', 'INVALID_DELIVERY_RESULT');
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (
      !/^[A-Za-z][A-Za-z0-9._/-]{0,127}$/u.test(key) ||
      typeof raw !== 'string' ||
      raw.length > 256 ||
      !TEXT.test(raw)
    )
      return fail('FC-EVIDENCE', 'INVALID_DELIVERY_RESULT');
    result[key] = raw;
  }
  return ok(result);
}

function validateEffect(value: unknown): DeliveryResult<DeliveryEffectFact> {
  const raw = own(value, [
    'candidate',
    'candidateContentDigest',
    'correlationKey',
    'authority',
    'failurePhase',
    'generation',
    'kind',
    'observedAt',
    'operation',
    'outcome',
    'registry',
    'resourceIdentity',
    'result',
    'schema',
    'target',
    'targetBasisDigest',
    'type',
  ]);
  if (
    !raw ||
    raw.schema !== DELIVERY_EVENT_SCHEMA ||
    raw.kind !== 'EV-EFFECT-CERTAINTY' ||
    !identity('ID-OP', raw.operation) ||
    !DELIVERY_OPERATION_CLASSES.includes(raw.type as DeliveryOperationClass) ||
    !identity('ID-REGISTRY', raw.registry) ||
    !identity('ID-GEN', raw.generation) ||
    !identity('ID-AUTH', raw.authority) ||
    !identity('ID-TARGET', raw.target) ||
    !identity('ID-CAND', raw.candidate) ||
    !digest(raw.candidateContentDigest) ||
    !digest(raw.targetBasisDigest) ||
    typeof raw.correlationKey !== 'string' ||
    !TEXT.test(raw.correlationKey) ||
    typeof raw.resourceIdentity !== 'string' ||
    !TEXT.test(raw.resourceIdentity) ||
    !['success', 'absent', 'uncertain', 'held', 'failure', 'conflict'].includes(raw.outcome as string) ||
    (raw.failurePhase !== null && raw.failurePhase !== 'pre-dispatch' && raw.failurePhase !== 'post-dispatch') ||
    !position(raw.observedAt)
  )
    return fail('FC-EVIDENCE', 'INVALID_EFFECT_FACT');
  const result = validateResult(raw.result);
  return result.ok ? ok({ ...raw, result: result.value } as DeliveryEffectFact) : result;
}

function validateObservation(value: unknown): DeliveryResult<DeliveryObservationFact> {
  const raw = own(value, [
    'candidate',
    'candidateContentDigest',
    'correlationKey',
    'authority',
    'kind',
    'generation',
    'observedAt',
    'operation',
    'outcome',
    'registry',
    'resourceIdentity',
    'resolvesOperation',
    'result',
    'schema',
    'subject',
    'target',
    'targetBasisDigest',
  ]);
  if (
    !raw ||
    raw.schema !== DELIVERY_EVENT_SCHEMA ||
    !['EV-TARGET-FACT', 'EV-DELIVERY-OBSERVATION'].includes(raw.kind as string) ||
    !identity('ID-OP', raw.operation) ||
    !['target', 'gate', 'effect'].includes(raw.subject as string) ||
    !identity('ID-REGISTRY', raw.registry) ||
    !identity('ID-GEN', raw.generation) ||
    !identity('ID-AUTH', raw.authority) ||
    !identity('ID-TARGET', raw.target) ||
    !identity('ID-CAND', raw.candidate) ||
    !digest(raw.candidateContentDigest) ||
    !digest(raw.targetBasisDigest) ||
    typeof raw.correlationKey !== 'string' ||
    !TEXT.test(raw.correlationKey) ||
    typeof raw.resourceIdentity !== 'string' ||
    !TEXT.test(raw.resourceIdentity) ||
    (raw.resolvesOperation !== null && !identity('ID-OP', raw.resolvesOperation)) ||
    !['ready', 'absent', 'held', 'advanced', 'conflict', 'uncertain', 'present'].includes(raw.outcome as string) ||
    !position(raw.observedAt)
  )
    return fail('FC-EVIDENCE', 'INVALID_OBSERVATION_FACT');
  const result = validateResult(raw.result);
  return result.ok ? ok({ ...raw, result: result.value } as DeliveryObservationFact) : result;
}

function validateMechanism(input: unknown): DeliveryResult<ScriptedDeliveryMechanism> {
  if (
    !plain(input) ||
    typeof field(input, 'attestEffect') !== 'function' ||
    typeof field(input, 'attestObservation') !== 'function'
  )
    return fail('FC-TRUST', 'SCRIPTED_DELIVERY_MECHANISM_REQUIRED');
  const reachability = field(input, 'reachability');
  if (typeof reachability !== 'function') return fail('FC-TRUST', 'SCRIPTED_DELIVERY_REACHABILITY_REQUIRED');
  const value = input as ScriptedDeliveryMechanism;
  let proof: Readonly<{ status: 'scripted-only'; providerEnabled: false; credentials: false; externalEffects: false }>;
  try {
    proof = value.reachability();
  } catch {
    return fail('FC-TRUST', 'SCRIPTED_DELIVERY_REACHABILITY_FAILED');
  }
  return proof.status === 'scripted-only' &&
    proof.providerEnabled === false &&
    proof.credentials === false &&
    proof.externalEffects === false
    ? ok(value)
    : fail('FC-AUTHORITY', 'DELIVERY_PROVIDER_REACHABLE');
}

export function createScriptedDeliveryMechanism(input: unknown = {}): DeliveryResult<ScriptedDeliveryMechanism> {
  const raw =
    own(input, ['effects', 'observations']) ??
    (plain(input) && Object.getOwnPropertyNames(input).length === 0 ? input : undefined);
  if (!raw) return fail('FC-INPUT', 'INVALID_SCRIPTED_DELIVERY_FIXTURE');
  const effects = Array.isArray(raw.effects) ? raw.effects.map(validateEffect) : [];
  const observations = Array.isArray(raw.observations) ? raw.observations.map(validateObservation) : [];
  if (effects.some((item) => !item.ok) || observations.some((item) => !item.ok))
    return fail('FC-EVIDENCE', 'INVALID_SCRIPTED_DELIVERY_FIXTURE');
  const effectMap = new Map(
    effects
      .filter((item): item is Extract<typeof item, { ok: true }> => item.ok)
      .map((item) => [item.value.operation, item.value]),
  );
  const observationMap = new Map(
    observations
      .filter((item): item is Extract<typeof item, { ok: true }> => item.ok)
      .map((item) => [item.value.operation, item.value]),
  );
  const mechanism: ScriptedDeliveryMechanism = {
    attestEffect(request) {
      const fact = effectMap.get(request.operation);
      return fact && fact.type === request.type ? ok(fact) : fail('FC-MECHANISM', 'NO_SCRIPTED_EFFECT_ATTESTATION');
    },
    attestObservation(request) {
      const fact = observationMap.get(request.operation);
      return fact && fact.subject === request.subject
        ? ok(fact)
        : fail('FC-MECHANISM', 'NO_SCRIPTED_OBSERVATION_ATTESTATION');
    },
    reachability: () =>
      Object.freeze({
        status: 'scripted-only' as const,
        providerEnabled: false as const,
        credentials: false as const,
        externalEffects: false as const,
      }),
  };
  return ok(mechanism);
}

function packageCandidate(input: ReviewPackage): DeliveryResult<DeliveryCarrier['changedPaths']> {
  return Array.isArray(input.deliveryMetadata.changedPaths)
    ? ok(input.deliveryMetadata.changedPaths)
    : fail('FC-EVIDENCE', 'CANDIDATE_CHANGED_PATHS_REQUIRED');
}

function admitCarrier(input: unknown): DeliveryResult<DeliveryCarrier> {
  const raw =
    own(input, [
      'acceptanceSnapshot',
      'binding',
      'candidateCarrier',
      'finalizerSnapshot',
      'registry',
      'remoteGate',
      'retryLimit',
      'strategy',
      'verificationAuthorizer',
    ]) ??
    own(input, [
      'acceptanceSnapshot',
      'binding',
      'candidateCarrier',
      'finalizerSnapshot',
      'registry',
      'remoteGate',
      'strategy',
      'verificationAuthorizer',
    ]);
  if (!raw) return fail('FC-INPUT', 'INVALID_DELIVERY_ADMISSION');
  const retryLimit = raw.retryLimit === undefined ? DELIVERY_WAIT_BOUNDS.retryLimit.default : raw.retryLimit;
  if (
    typeof retryLimit !== 'number' ||
    !Number.isSafeInteger(retryLimit) ||
    retryLimit < DELIVERY_WAIT_BOUNDS.retryLimit.minimum ||
    retryLimit > DELIVERY_WAIT_BOUNDS.retryLimit.maximum
  )
    return fail('FC-BOUND', 'INVALID_DELIVERY_RETRY_LIMIT');
  const binding = validateBinding(raw.binding);
  if (!binding.ok) return binding;
  const candidateCarrier = validateAcceptanceCandidate(raw.candidateCarrier);
  if (!candidateCarrier.ok) return fail('FC-TRUST', 'INVALID_CANDIDATE_CARRIER');
  const remoteGate = validateGateRequirement(raw.remoteGate);
  if (!remoteGate.ok) return remoteGate;
  const strategy = createDeliveryStrategy(raw.strategy);
  if (!strategy.ok) return strategy;
  const acceptance = restoreScriptedAcceptanceController(raw.acceptanceSnapshot);
  if (!acceptance.ok) return fail('FC-TRUST', 'INVALID_ACCEPTANCE_CARRIER');
  const acceptanceProjection = acceptance.value.projection();
  if (
    acceptanceProjection.state !== 'Accepted' ||
    !acceptanceProjection.acceptedPackageDigest ||
    !acceptanceProjection.candidate
  )
    return fail('FC-AUTHORITY', 'ACCEPTED_PACKAGE_REQUIRED');
  const packageValue = acceptance.value
    .packages()
    .find((item) => item.digest === acceptanceProjection.acceptedPackageDigest);
  const checkedPackage = validateAcceptancePackage(packageValue);
  if (!checkedPackage.ok) return fail('FC-TRUST', 'INVALID_ACCEPTED_PACKAGE');
  const restoredFinalizer = restoreScriptedFinalizerController(raw.finalizerSnapshot, {
    binding: binding.value,
    registry: raw.registry,
    verificationAuthorizer: raw.verificationAuthorizer,
  });
  if (!restoredFinalizer.ok) return fail('FC-TRUST', 'INVALID_FINALIZER_CARRIER');
  const reachability = restoredFinalizer.value.reachability();
  const projection = restoredFinalizer.value.projection();
  const authority = projection.authority;
  const waiter = projection.waiters.find((item) => item.story === acceptanceProjection.story);
  const entry = projection.entry;
  const anchorRecords = restoredFinalizer.value
    .records()
    .filter((item) => item.record.kind === 'delivery-intent' && item.record.type === 'OPC-DEL-ANCHOR');
  const anchorRecord = anchorRecords.length === 1 ? anchorRecords[0] : undefined;
  const anchorIntent = anchorRecord?.record.kind === 'delivery-intent' ? anchorRecord.record : undefined;
  const anchorOperation = anchorIntent?.operation;
  const anchorTransition = anchorOperation ? operationTransition(anchorOperation) : undefined;
  const anchorTargetRecord = anchorOperation
    ? restoredFinalizer.value
        .records()
        .find((item) => item.record.kind === 'target-fact' && item.record.relatedOperation === anchorOperation)
    : undefined;
  const anchorContinuity =
    Boolean(anchorOperation) &&
    ((projection.pendingDeliveryOperations.length === 1 &&
      projection.pendingDeliveryOperations[0] === anchorOperation) ||
      (projection.pendingDeliveryOperations.length === 0 &&
        projection.anchorRegistry === binding.value.registry &&
        anchorTargetRecord?.record.kind === 'target-fact' &&
        anchorTargetRecord.record.fact.outcome === 'present'));
  if (!anchorOperation || !anchorTransition || !anchorIntent)
    return fail('FC-FENCE', 'FINALIZER_ANCHOR_CARRIER_MISSING');
  if (
    reachability.providerEnabled ||
    reachability.externalEffects ||
    reachability.landingEnabled ||
    projection.status !== 'Finalizing' ||
    !authority ||
    !entry ||
    !entry.readyForDelivery ||
    !anchorContinuity ||
    !waiter ||
    waiter.acceptedPackageDigest !== checkedPackage.value.digest ||
    checkedPackage.value.story !== waiter.story ||
    checkedPackage.value.candidate !== waiter.candidate ||
    checkedPackage.value.candidateContentDigest !== waiter.candidateContentDigest ||
    checkedPackage.value.targetBasisDigest !== waiter.targetBasisDigest ||
    candidateCarrier.value.id !== checkedPackage.value.candidate ||
    candidateCarrier.value.run !== checkedPackage.value.run ||
    candidateCarrier.value.story !== checkedPackage.value.story ||
    candidateCarrier.value.session !== checkedPackage.value.deliveryMetadata.session ||
    candidateCarrier.value.deliveryMetadataDigest !== checkedPackage.value.deliveryMetadataDigest ||
    candidateCarrier.value.workspaceCommit !== checkedPackage.value.deliveryMetadata.workspaceCommit ||
    !same(
      candidateCarrier.value.changedPaths,
      checkedPackage.value.deliveryMetadata.changedPaths,
      'CANDIDATE-CHANGE-SET',
    ) ||
    candidateCarrier.value.candidateContentDigest !== checkedPackage.value.candidateContentDigest ||
    candidateCarrier.value.targetBasisDigest !== checkedPackage.value.targetBasisDigest ||
    authority.registry !== binding.value.registry ||
    authority.target !== binding.value.target ||
    authority.candidate !== checkedPackage.value.candidate ||
    authority.candidateContentDigest !== checkedPackage.value.candidateContentDigest ||
    authority.targetBasisDigest !== checkedPackage.value.targetBasisDigest ||
    anchorIntent.authority.candidate !== checkedPackage.value.candidate ||
    anchorIntent.authority.candidateContentDigest !== checkedPackage.value.candidateContentDigest ||
    anchorIntent.authority.targetBasisDigest !== checkedPackage.value.targetBasisDigest ||
    anchorIntent.authority.authority !== authority.authority ||
    anchorIntent.authority.generation !== authority.generation ||
    remoteGate.value.acceptedPackageDigest !== checkedPackage.value.digest ||
    remoteGate.value.candidate !== checkedPackage.value.candidate ||
    remoteGate.value.targetBasisDigest !== checkedPackage.value.targetBasisDigest ||
    remoteGate.value.generation !== authority.generation ||
    remoteGate.value.authority !== authority.authority ||
    remoteGate.value.registry !== binding.value.registry ||
    remoteGate.value.target !== binding.value.target
  )
    return fail('FC-FENCE', 'FINALIZER_CARRIER_MISMATCH');
  const changedPaths = packageCandidate(checkedPackage.value);
  if (!changedPaths.ok) return changedPaths;
  const candidate = checkedPackage.value;
  return ok({
    binding: binding.value,
    run: candidate.run,
    story: candidate.story,
    candidate: candidate.candidate,
    candidatePrincipal: candidate.candidatePrincipal,
    candidateContentDigest: candidate.candidateContentDigest,
    targetBasisDigest: candidate.targetBasisDigest,
    generation: authority.generation,
    authority: authority.authority,
    acceptedPackageDigest: candidate.digest,
    strategy: strategy.value,
    waitTargetSeconds: waiter.policy.waitTargetSeconds,
    retryLimit,
    recoveryLimit: DELIVERY_WAIT_BOUNDS.recoveryLimit.minimum + 2,
    changedPaths: changedPaths.value,
    workspaceCommit: candidate.deliveryMetadata.workspaceCommit,
    treeDigest: candidateCarrier.value.treeDigest,
    anchorOperation,
    anchorTransition,
    remoteGate: remoteGate.value,
  });
}

function validateOperation(input: unknown, carrier: DeliveryCarrier): DeliveryResult<DeliveryIntent> {
  const raw = own(input, [
    'authority',
    'candidate',
    'candidateContentDigest',
    'correlationKey',
    'generation',
    'operation',
    'resourceIdentity',
    'registry',
    'strategy',
    'target',
    'targetBasisDigest',
    'transition',
    'type',
    'subject',
  ]);
  if (
    !raw ||
    !identity('ID-OP', raw.operation) ||
    !identity('ID-TXN', raw.transition) ||
    !(raw.transition as string).startsWith(`${carrier.run}/`) ||
    operationTransition(raw.operation as string) !== raw.transition ||
    !DELIVERY_OPERATION_CLASSES.includes(raw.type as DeliveryOperationClass) ||
    raw.target !== carrier.binding.target ||
    raw.registry !== carrier.binding.registry ||
    raw.candidate !== carrier.candidate ||
    raw.candidateContentDigest !== carrier.candidateContentDigest ||
    raw.targetBasisDigest !== carrier.targetBasisDigest ||
    raw.generation !== carrier.generation ||
    raw.authority !== carrier.authority ||
    raw.strategy !== carrier.strategy.mode ||
    !['target', 'gate', 'effect'].includes(raw.subject as string) ||
    typeof raw.correlationKey !== 'string' ||
    !TEXT.test(raw.correlationKey) ||
    typeof raw.resourceIdentity !== 'string' ||
    !TEXT.test(raw.resourceIdentity)
  )
    return fail('FC-FENCE', 'DELIVERY_OPERATION_FENCE_MISMATCH');
  return ok({
    schema: DELIVERY_EVENT_SCHEMA,
    kind: 'OPERATION-INTENT',
    operation: raw.operation as string,
    type: raw.type as DeliveryOperationClass,
    target: carrier.binding.target,
    registry: carrier.binding.registry,
    candidate: carrier.candidate,
    candidateContentDigest: carrier.candidateContentDigest,
    targetBasisDigest: carrier.targetBasisDigest,
    subject: raw.subject as 'target' | 'gate' | 'effect',
    generation: carrier.generation,
    authority: carrier.authority,
    transition: raw.transition as string,
    correlationKey: raw.correlationKey as string,
    resourceIdentity: raw.resourceIdentity as string,
    strategy: carrier.strategy.mode,
  });
}

function journalDigest(
  entry: Readonly<{ position: number; previousDigest: string; record: DeliveryRecord }>,
): string | undefined {
  return derive('DELIVERY-RECORD', entry);
}

export function createScriptedDeliveryController(input: unknown): DeliveryResult<ScriptedDeliveryController> {
  const raw =
    own(input, [
      'acceptanceSnapshot',
      'binding',
      'candidateCarrier',
      'finalizerSnapshot',
      'initialSnapshot',
      'mechanism',
      'registry',
      'remoteGate',
      'retryLimit',
      'strategy',
      'verificationAuthorizer',
    ]) ??
    own(input, [
      'acceptanceSnapshot',
      'binding',
      'candidateCarrier',
      'finalizerSnapshot',
      'initialSnapshot',
      'mechanism',
      'registry',
      'remoteGate',
      'strategy',
      'verificationAuthorizer',
    ]);
  if (!raw) return fail('FC-INPUT', 'INVALID_DELIVERY_CONTROLLER');
  const mechanism = validateMechanism(raw.mechanism);
  if (!mechanism.ok) return mechanism;
  const initialSnapshot = plain(raw.initialSnapshot) ? raw.initialSnapshot : undefined;
  const embeddedFinalizerSnapshot = initialSnapshot ? field(initialSnapshot, 'finalizerSnapshot') : undefined;
  if (
    embeddedFinalizerSnapshot !== undefined &&
    !same(embeddedFinalizerSnapshot, raw.finalizerSnapshot, 'DELIVERY-FINALIZER-INPUT')
  )
    return fail('FC-FENCE', 'FINALIZER_SNAPSHOT_RECOVERY_MISMATCH');
  const finalizerSnapshot = embeddedFinalizerSnapshot ?? raw.finalizerSnapshot;
  const admittedCarrier = admitCarrier({
    acceptanceSnapshot: raw.acceptanceSnapshot,
    binding: raw.binding,
    candidateCarrier: raw.candidateCarrier,
    finalizerSnapshot,
    registry: raw.registry,
    remoteGate: raw.remoteGate,
    retryLimit: raw.retryLimit,
    strategy: raw.strategy,
    verificationAuthorizer: raw.verificationAuthorizer,
  });
  if (!admittedCarrier.ok) return admittedCarrier;
  const carrier = admittedCarrier.value;
  const restoredFinalizer = restoreScriptedFinalizerController(finalizerSnapshot, {
    binding: raw.binding,
    registry: raw.registry,
    verificationAuthorizer: raw.verificationAuthorizer,
  });
  if (!restoredFinalizer.ok) return fail('FC-TRUST', 'INVALID_FINALIZER_CARRIER');
  const finalizerController = restoredFinalizer.value;
  let status: DeliveryStatus = 'Ready';
  const journal: JournalEntry[] = [];
  const intents = new Map<string, DeliveryIntent>();
  const effects = new Map<string, DeliveryEffectFact>();
  const observations = new Map<string, DeliveryObservationFact>();
  const resolvedEffects = new Set<string>();
  let landing: DeliveryLandingProof | null = null;
  let recovery: DeliveryProjection['recovery'] = null;
  let targetWait: DeliveryProjection['targetWait'] = null;
  const released = new Set<string>();
  const anchorEffects = (): DeliveryEffectFact[] =>
    [...effects.values()].filter((fact) => fact.type === 'OPC-DEL-ANCHOR');
  const exactAnchorAbsence = (predecessor: string): DeliveryResult<DeliveryEffectFact> => {
    const effect = effects.get(predecessor);
    const effectEntry = [...journal].find(
      (entry) => entry.record.kind === 'effect' && entry.record.fact.operation === predecessor,
    );
    const anchorIntentEntry = [...journal].find(
      (entry) => entry.record.kind === 'intent' && entry.record.intent.operation === predecessor,
    );
    const resolution = [...journal]
      .reverse()
      .find(
        (entry) =>
          entry.record.kind === 'recovery-resolved' &&
          entry.record.operation === predecessor &&
          entry.record.outcome === 'absent',
      );
    const observation =
      resolution?.record.kind === 'recovery-resolved'
        ? observations.get(resolution.record.observedOperation)
        : undefined;
    const observationIntentEntry = observation
      ? [...journal].find(
          (entry) => entry.record.kind === 'intent' && entry.record.intent.operation === observation.operation,
        )
      : undefined;
    const observationEntry = observation
      ? [...journal].find(
          (entry) => entry.record.kind === 'observation' && entry.record.fact.operation === observation.operation,
        )
      : undefined;
    if (
      effect?.type !== 'OPC-DEL-ANCHOR' ||
      !effectEntry ||
      !anchorIntentEntry ||
      anchorIntentEntry.record.kind !== 'intent' ||
      anchorIntentEntry.record.intent.type !== 'OPC-DEL-ANCHOR' ||
      anchorIntentEntry.record.intent.operation !== predecessor ||
      anchorIntentEntry.record.intent.correlationKey !== effect.correlationKey ||
      anchorIntentEntry.record.intent.resourceIdentity !== effect.resourceIdentity ||
      anchorIntentEntry.position >= effectEntry.position ||
      effect?.target !== carrier.binding.target ||
      effect?.registry !== carrier.binding.registry ||
      effect?.generation !== carrier.generation ||
      effect?.authority !== carrier.authority ||
      effect?.candidate !== carrier.candidate ||
      effect?.candidateContentDigest !== carrier.candidateContentDigest ||
      effect?.targetBasisDigest !== carrier.targetBasisDigest
    )
      return fail('FC-FENCE', 'GF043_ANCHOR_REAUTHORIZATION_REQUIRED');
    if (effect.outcome === 'absent') {
      return effect.failurePhase === 'pre-dispatch'
        ? ok(effect)
        : fail('FC-FENCE', 'GF043_ANCHOR_REAUTHORIZATION_REQUIRED');
    }
    if (
      effect.outcome !== 'uncertain' ||
      !resolution ||
      resolution.record.kind !== 'recovery-resolved' ||
      !observation ||
      !observationIntentEntry ||
      observationIntentEntry.record.kind !== 'intent' ||
      observationIntentEntry.record.intent.type !== 'OPC-DEL-OBSERVE' ||
      observationIntentEntry.record.intent.subject !== 'effect' ||
      observationIntentEntry.record.intent.operation !== observation.operation ||
      observationIntentEntry.record.intent.correlationKey !== effect.correlationKey ||
      observationIntentEntry.record.intent.resourceIdentity !== effect.resourceIdentity ||
      !observationEntry ||
      effectEntry.position >= observationIntentEntry.position ||
      observationIntentEntry.position >= observationEntry.position ||
      observationEntry.position >= resolution.position ||
      observation.subject !== 'effect' ||
      observation.outcome !== 'absent' ||
      observation.resolvesOperation !== predecessor ||
      observation.correlationKey !== effect.correlationKey ||
      observation.resourceIdentity !== effect.resourceIdentity ||
      observation.target !== carrier.binding.target ||
      observation.registry !== carrier.binding.registry ||
      observation.generation !== carrier.generation ||
      observation.authority !== carrier.authority ||
      observation.candidate !== carrier.candidate ||
      observation.candidateContentDigest !== carrier.candidateContentDigest ||
      observation.targetBasisDigest !== carrier.targetBasisDigest
    )
      return fail('FC-FENCE', 'GF043_ANCHOR_REAUTHORIZATION_REQUIRED');
    return ok(effect);
  };
  const validateRetryAuthorization = (
    record: Extract<DeliveryRecord, { kind: 'retry-authorized' }>,
  ): DeliveryResult<void> => {
    const predecessor = effects.get(record.predecessor);
    if (predecessor?.type !== 'OPC-DEL-ANCHOR') return ok(undefined);
    const attempts = anchorEffects();
    if (
      !identity('ID-OP', record.operation) ||
      !identity('ID-OP', record.predecessor) ||
      record.operation === record.predecessor ||
      !Number.isSafeInteger(record.ordinal) ||
      record.ordinal < 1 ||
      record.ordinal > carrier.retryLimit ||
      record.ordinal !== attempts.length ||
      attempts.at(-1)?.operation !== record.predecessor ||
      record.correlationKey !== predecessor.correlationKey ||
      record.resourceIdentity !== predecessor.resourceIdentity
    )
      return fail('FC-FENCE', 'GF043_ANCHOR_RETRY_FENCE_MISMATCH');
    const absence = exactAnchorAbsence(record.predecessor);
    return absence.ok ? ok(undefined) : absence;
  };
  const applyRecord = (record: DeliveryRecord): void => {
    if (record.kind === 'intent') intents.set(record.intent.operation, record.intent);
    if (record.kind === 'effect') effects.set(record.fact.operation, record.fact);
    if (record.kind === 'observation') observations.set(record.fact.operation, record.fact);
    if (
      record.kind === 'observation' &&
      recovery &&
      record.fact.subject === 'effect' &&
      record.fact.resolvesOperation === recovery.operation
    ) {
      if (record.fact.outcome === 'absent' || record.fact.outcome === 'present') {
        recovery = null;
        if (record.fact.outcome === 'present') resolvedEffects.add(record.fact.resolvesOperation);
        status = 'Ready';
      } else {
        const observationsSeen = recovery.observations + 1;
        recovery = { ...recovery, observations: observationsSeen };
        if (observationsSeen >= recovery.limit) status = 'Parked';
      }
    }
    if (
      record.kind === 'observation' &&
      targetWait &&
      record.fact.subject === 'target' &&
      record.fact.resolvesOperation === targetWait.operation
    ) {
      if (record.fact.outcome === 'ready') {
        targetWait = null;
        status = 'Ready';
      } else if (
        record.fact.observedAt >= targetWait.deadline ||
        record.fact.outcome === 'conflict' ||
        record.fact.outcome === 'advanced'
      ) {
        targetWait = null;
        status = 'Parked';
      } else {
        targetWait = { ...targetWait, observations: targetWait.observations + 1 };
      }
    }
    if (record.kind === 'recovery-resolved') {
      recovery = null;
      if (record.outcome === 'success') resolvedEffects.add(record.operation);
      status = 'Ready';
    }
    if (record.kind === 'wait-exhausted') {
      targetWait = null;
      status = 'Parked';
    }
    if (record.kind === 'landing') {
      landing = record.proof;
      status = 'Landed';
    }
    if (record.kind === 'release') released.add(record.story);
    if (record.kind === 'effect' && record.fact.outcome === 'uncertain') {
      recovery = { operation: record.fact.operation, observations: 0, limit: carrier.recoveryLimit };
      status = 'Recovering';
    }
    if (record.kind === 'effect' && record.fact.outcome === 'held') {
      targetWait = {
        operation: record.fact.operation,
        startedAt: record.fact.observedAt,
        deadline: record.fact.observedAt + carrier.waitTargetSeconds,
        observations: 0,
      };
      status = 'TargetWait';
    }
    if (record.kind === 'effect' && record.fact.type === 'OPC-DEL-ANCHOR' && record.fact.outcome === 'conflict') {
      status = 'Parked';
    }
    if (
      record.kind === 'observation' &&
      record.fact.subject === 'target' &&
      (record.fact.outcome === 'advanced' || record.fact.outcome === 'conflict')
    ) {
      targetWait = null;
      status = 'Parked';
    }
  };
  const append = (record: DeliveryRecord): DeliveryResult<void> => {
    if (record.kind === 'retry-authorized') {
      const validated = validateRetryAuthorization(record);
      if (!validated.ok) return validated;
    }
    const previousDigest = journal.at(-1)?.digest ?? ZERO;
    const positionValue = journal.length + 1;
    const digestValue = journalDigest({ position: positionValue, previousDigest, record });
    if (!digestValue) return fail('FC-TRUST', 'DELIVERY_RECORD_DIGEST_FAILED');
    journal.push(freeze({ position: positionValue, previousDigest, digest: digestValue, record }));
    applyRecord(record);
    return ok(undefined);
  };
  const replay = (entry: JournalEntry): DeliveryResult<void> => {
    if (
      !plain(entry) ||
      entry.position !== journal.length + 1 ||
      entry.previousDigest !== (journal.at(-1)?.digest ?? ZERO) ||
      !digest(entry.digest)
    )
      return fail('FC-TRUST', 'NON_CONTIGUOUS_DELIVERY_JOURNAL');
    const expected = journalDigest({
      position: entry.position,
      previousDigest: entry.previousDigest,
      record: entry.record,
    });
    if (!expected || expected !== entry.digest) return fail('FC-TRUST', 'DELIVERY_JOURNAL_DIGEST_MISMATCH');
    if (entry.record.kind === 'retry-authorized') {
      const validated = validateRetryAuthorization(entry.record);
      if (!validated.ok) return validated;
    }
    journal.push(entry);
    applyRecord(entry.record);
    return ok(undefined);
  };
  const projection = (): DeliveryProjection =>
    freeze({
      status,
      carrier,
      intents: Object.freeze([...intents.values()]),
      effects: Object.freeze([...effects.values()]),
      observations: Object.freeze([...observations.values()]),
      landing,
      releasedStories: Object.freeze([...released].sort()),
      recovery,
      targetWait,
      finalizer: finalizerController.projection(),
    });
  if (raw.initialSnapshot !== undefined) {
    const snapshot = raw.initialSnapshot as DeliverySnapshot;
    if (
      !plain(snapshot) ||
      snapshot.schema !== DELIVERY_SNAPSHOT_SCHEMA ||
      !same(snapshot.carrier, carrier, 'DELIVERY-CARRIER-RECOVERY') ||
      !Array.isArray(snapshot.records)
    )
      return fail('FC-TRUST', 'INVALID_DELIVERY_SNAPSHOT');
    for (const item of snapshot.records) {
      const restored = replay(item);
      if (!restored.ok) return restored;
    }
    if (!['Ready', 'Recovering', 'TargetWait', 'Parked', 'Landed'].includes(snapshot.status))
      return fail('FC-TRUST', 'INVALID_DELIVERY_SNAPSHOT');
    if (snapshot.status !== status) return fail('FC-TRUST', 'DELIVERY_STATUS_REPLAY_MISMATCH');
    if (!same(snapshot.projection, projection(), 'DELIVERY-SNAPSHOT-PROJECTION'))
      return fail('FC-TRUST', 'DELIVERY_PROJECTION_REPLAY_MISMATCH');
    if (!same(finalizerController.snapshot(), snapshot.finalizerSnapshot, 'DELIVERY-FINALIZER-RECOVERY'))
      return fail('FC-TRUST', 'DELIVERY_FINALIZER_REPLAY_MISMATCH');
  }
  const successful = (type: DeliveryOperationClass): DeliveryEffectFact | undefined =>
    [...effects.values()].find((fact) => fact.type === type && fact.outcome === 'success');
  const anchorRootsAtCarrier = (anchor: DeliveryEffectFact): boolean => {
    const seen = new Set<string>();
    let current = anchor.operation;
    while (current !== carrier.anchorOperation) {
      if (seen.has(current)) return false;
      seen.add(current);
      const retry = [...journal]
        .reverse()
        .find((entry) => entry.record.kind === 'retry-authorized' && entry.record.operation === current);
      if (
        retry?.record.kind !== 'retry-authorized' ||
        retry.record.predecessor === current ||
        retry.record.correlationKey !== anchor.correlationKey ||
        retry.record.resourceIdentity !== anchor.resourceIdentity
      )
        return false;
      current = retry.record.predecessor;
    }
    return true;
  };
  const validRemoteGate = (fact: DeliveryObservationFact): boolean => {
    const requirement = carrier.remoteGate;
    return (
      requirement.required &&
      fact.subject === 'gate' &&
      fact.outcome === 'ready' &&
      fact.correlationKey === requirement.correlationKey &&
      fact.resolvesOperation === null &&
      Object.keys(fact.result).sort().join('|') === 'attestationDigest|gateState|gateSubject' &&
      fact.result.gateSubject === requirement.subject &&
      fact.result.gateState === 'pass' &&
      digest(fact.result.attestationDigest) &&
      requirement.asOf !== null &&
      requirement.maxAgeSeconds !== null &&
      fact.observedAt <= requirement.asOf &&
      requirement.asOf - fact.observedAt <= requirement.maxAgeSeconds
    );
  };
  const currentRemoteGate = (): DeliveryObservationFact | undefined => {
    const latest = [...journal]
      .reverse()
      .find((entry) => entry.record.kind === 'observation' && entry.record.fact.subject === 'gate');
    if (latest?.record.kind !== 'observation' || !validRemoteGate(latest.record.fact)) return undefined;
    return latest.record.fact;
  };
  const bridgeAnchorEffectFact = (
    input: Readonly<{ outcome: 'present' | 'conflict'; result: Readonly<Record<string, string>>; observedAt: number }>,
  ): DeliveryResult<void> => {
    const finalizerAuthority = finalizerController.projection().authority;
    if (
      !finalizerAuthority ||
      finalizerAuthority.authority !== carrier.authority ||
      finalizerAuthority.generation !== carrier.generation
    )
      return fail('FC-FENCE', 'GF043_AUTHORITY_CONTINUITY_MISMATCH');
    const targetFact = {
      schema: FINALIZER_EVENT_SCHEMA,
      kind: 'EV-TARGET-FACT' as const,
      operation: carrier.anchorOperation,
      target: carrier.binding.target,
      registry: carrier.binding.registry,
      targetBasisDigest: carrier.targetBasisDigest,
      anchorRegistry: input.result.anchorRegistry ?? null,
      outcome: input.outcome,
      observedAt: input.observedAt,
    };
    const recorded = finalizerController.recordTargetFact({ authority: finalizerAuthority, fact: targetFact });
    return recorded.ok ? ok(undefined) : fail('FC-TRUST', 'GF043_CARRIER_CONTINUITY_REQUIRED');
  };
  const bridgeAnchorRecoveryObservation = (fact: DeliveryObservationFact): DeliveryResult<void> => {
    const recovering = recovery;
    const recoveringEffect = recovering ? effects.get(recovering.operation) : undefined;
    if (
      !recovering ||
      recoveringEffect?.type !== 'OPC-DEL-ANCHOR' ||
      recoveringEffect.outcome !== 'uncertain' ||
      fact.subject !== 'effect' ||
      (fact.outcome !== 'present' && fact.outcome !== 'absent') ||
      fact.resolvesOperation !== recoveringEffect.operation ||
      fact.correlationKey !== recoveringEffect.correlationKey ||
      fact.resourceIdentity !== recoveringEffect.resourceIdentity ||
      fact.target !== carrier.binding.target ||
      fact.registry !== carrier.binding.registry ||
      fact.generation !== carrier.generation ||
      fact.authority !== carrier.authority ||
      fact.candidate !== carrier.candidate ||
      fact.candidateContentDigest !== carrier.candidateContentDigest ||
      fact.targetBasisDigest !== carrier.targetBasisDigest
    )
      return fail('FC-FENCE', 'GF043_ANCHOR_RECOVERY_FACT_MISMATCH');
    if (fact.outcome === 'absent') return ok(undefined);
    const finalizerAuthority = finalizerController.projection().authority;
    if (
      !finalizerAuthority ||
      finalizerAuthority.authority !== carrier.authority ||
      finalizerAuthority.generation !== carrier.generation
    )
      return fail('FC-FENCE', 'GF043_AUTHORITY_CONTINUITY_MISMATCH');
    const targetFact = {
      schema: FINALIZER_EVENT_SCHEMA,
      kind: 'EV-TARGET-FACT' as const,
      operation: carrier.anchorOperation,
      target: carrier.binding.target,
      registry: carrier.binding.registry,
      targetBasisDigest: carrier.targetBasisDigest,
      anchorRegistry: fact.result.anchorRegistry ?? null,
      outcome: 'present' as const,
      observedAt: fact.observedAt,
    };
    const recorded = finalizerController.recordTargetFact({ authority: finalizerAuthority, fact: targetFact });
    return recorded.ok ? ok(undefined) : fail('FC-TRUST', 'GF043_CARRIER_CONTINUITY_REQUIRED');
  };
  const authorize = (value: unknown): DeliveryResult<DeliveryIntent> => {
    const checked = validateOperation(value, carrier);
    if (!checked.ok) return checked;
    const intent = checked.value;
    const prior = intents.get(intent.operation);
    if (prior)
      return same(prior, intent, 'DELIVERY-OPERATION-REPLAY')
        ? ok(prior)
        : fail('FC-SUBJECT', 'OPERATION_REUSE_MISMATCH');
    if (status === 'Landed' || status === 'Parked') return fail('FC-AUTHORITY', 'DELIVERY_TERMINAL');
    if (recovery && intent.type !== 'OPC-DEL-OBSERVE') return fail('FC-RECOVERY', 'RECOVERY_OBSERVATION_REQUIRED');
    if (targetWait && intent.type === 'OPC-DEL-MERGE') return fail('FC-BOUND', 'TARGET_WAIT_REOBSERVATION_REQUIRED');
    if (intent.type === 'OPC-DEL-ANCHOR') {
      const attempts = anchorEffects();
      if (attempts.length === 0) {
        if (intent.operation !== carrier.anchorOperation || intent.transition !== carrier.anchorTransition)
          return fail('FC-FENCE', 'GF043_ANCHOR_OPERATION_MISMATCH');
      } else {
        const predecessor = attempts.at(-1);
        if (!predecessor) return fail('FC-FENCE', 'GF043_ANCHOR_RETRY_PREDECESSOR_MISSING');
        const absence = exactAnchorAbsence(predecessor.operation);
        if (!absence.ok) return fail('FC-RECOVERY', 'GF043_ANCHOR_REAUTHORIZATION_REQUIRED');
        if (
          intent.correlationKey !== predecessor.correlationKey ||
          intent.resourceIdentity !== predecessor.resourceIdentity
        )
          return fail('FC-FENCE', 'RETRY_RESOURCE_FENCE_MISMATCH');
        const ordinal = attempts.length;
        if (ordinal > carrier.retryLimit) return fail('FC-BOUND', 'DELIVERY_RETRY_EXHAUSTED');
        const retry = append({
          kind: 'retry-authorized',
          operation: intent.operation,
          predecessor: predecessor.operation,
          ordinal,
          correlationKey: predecessor.correlationKey,
          resourceIdentity: predecessor.resourceIdentity,
        });
        if (!retry.ok) return retry;
      }
    }
    if (intent.type === 'OPC-DEL-OBSERVE' && intent.subject === 'effect' && !recovery)
      return fail('FC-RECOVERY', 'RECOVERY_OBSERVATION_REQUIRED');
    if (intent.subject === 'gate' && !carrier.remoteGate.required)
      return fail('FC-AUTHORITY', 'NO_REMOTE_GATE_REQUIRED');
    if (
      intent.subject === 'gate' &&
      (intent.correlationKey !== carrier.remoteGate.correlationKey ||
        intent.resourceIdentity !== carrier.remoteGate.resourceIdentity)
    )
      return fail('FC-FENCE', 'REMOTE_GATE_OPERATION_FENCE_MISMATCH');
    if (intent.type === 'OPC-DEL-OBSERVE' && intent.subject === 'target') {
      const merge =
        successful('OPC-DEL-MERGE') ??
        [...effects.values()].find((fact) => fact.type === 'OPC-DEL-MERGE' && fact.outcome === 'held');
      if (!merge) return fail('FC-AUTHORITY', 'MERGE_EFFECT_REQUIRED_BEFORE_TARGET_OBSERVATION');
    }
    const priorSameType = [...effects.values()].filter((fact) => fact.type === intent.type);
    if (intent.type === 'OPC-DEL-ANCHOR' && priorSameType.some((fact) => fact.outcome === 'success'))
      return fail('FC-AUTHORITY', 'ANCHOR_ALREADY_ESTABLISHED');
    if (intent.type === 'OPC-DEL-PUBLISH' && !successful('OPC-DEL-ANCHOR'))
      return fail('FC-AUTHORITY', 'ANCHOR_REQUIRED');
    if (intent.type === 'OPC-DEL-REQUEST' && !successful('OPC-DEL-PUBLISH'))
      return fail('FC-AUTHORITY', 'PUBLISH_REQUIRED');
    if ((intent.type === 'OPC-DEL-STATUS' || intent.type === 'OPC-DEL-COMMENT') && !successful('OPC-DEL-REQUEST'))
      return fail('FC-AUTHORITY', 'REQUEST_REQUIRED');
    if (intent.type === 'OPC-DEL-MERGE' && !successful('OPC-DEL-REQUEST'))
      return fail('FC-AUTHORITY', 'REQUEST_REQUIRED');
    if (intent.type === 'OPC-DEL-MERGE' && carrier.remoteGate.required && !currentRemoteGate())
      return fail('FC-EVIDENCE', 'REMOTE_GATE_REQUIRED');
    const priorAbsent =
      intent.type === 'OPC-DEL-ANCHOR'
        ? []
        : [...effects.values()].filter(
            (fact) => fact.type === intent.type && fact.outcome === 'absent' && fact.failurePhase === 'pre-dispatch',
          );
    const previous = priorAbsent.find(
      (fact) => fact.correlationKey === intent.correlationKey && fact.resourceIdentity === intent.resourceIdentity,
    );
    if (priorAbsent.length > 0 && !previous) return fail('FC-FENCE', 'RETRY_RESOURCE_FENCE_MISMATCH');
    if (previous) {
      const ordinal = priorSameType.filter((fact) => fact.outcome === 'absent').length + 1;
      if (ordinal > carrier.retryLimit) return fail('FC-BOUND', 'DELIVERY_RETRY_EXHAUSTED');
      const retry = append({
        kind: 'retry-authorized',
        operation: intent.operation,
        predecessor: previous.operation,
        ordinal,
        correlationKey: previous.correlationKey,
        resourceIdentity: previous.resourceIdentity,
      });
      if (!retry.ok) return retry;
    }
    const appended = append({ kind: 'intent', intent });
    return appended.ok ? ok(intent) : appended;
  };
  const dispatch = (value: unknown): DeliveryResult<DeliveryProjection> => {
    const rawValue = own(value, ['operation']);
    if (!rawValue || !identity('ID-OP', rawValue.operation)) return fail('FC-INPUT', 'INVALID_DELIVERY_DISPATCH');
    const intent = intents.get(rawValue.operation as string);
    if (!intent || intent.type === 'OPC-DEL-OBSERVE') return fail('FC-AUTHORITY', 'DELIVERY_INTENT_REQUIRED');
    if (effects.has(intent.operation)) return fail('FC-SUBJECT', 'EFFECT_ALREADY_RECORDED');
    let fact: DeliveryResult<DeliveryEffectFact>;
    try {
      fact = mechanism.value.attestEffect({ operation: intent.operation, type: intent.type });
    } catch {
      return fail('FC-MECHANISM', 'DELIVERY_ATTESTATION_FAILED');
    }
    if (!fact.ok) return fact;
    if (
      fact.value.operation !== intent.operation ||
      fact.value.type !== intent.type ||
      fact.value.target !== carrier.binding.target ||
      fact.value.registry !== carrier.binding.registry ||
      fact.value.generation !== carrier.generation ||
      fact.value.authority !== carrier.authority ||
      fact.value.candidate !== carrier.candidate ||
      fact.value.candidateContentDigest !== carrier.candidateContentDigest ||
      fact.value.targetBasisDigest !== carrier.targetBasisDigest ||
      fact.value.correlationKey !== intent.correlationKey ||
      fact.value.resourceIdentity !== intent.resourceIdentity
    )
      return fail('FC-FENCE', 'EFFECT_FACT_FENCE_MISMATCH');
    if (intent.type === 'OPC-DEL-ANCHOR' && (fact.value.outcome === 'success' || fact.value.outcome === 'conflict')) {
      const bridged = bridgeAnchorEffectFact({
        outcome: fact.value.outcome === 'success' ? 'present' : 'conflict',
        result: fact.value.result,
        observedAt: fact.value.observedAt,
      });
      if (!bridged.ok) return bridged;
    }
    const appended = append({ kind: 'effect', fact: fact.value });
    if (!appended.ok) return appended;
    return ok(projection());
  };
  const observe = (value: unknown): DeliveryResult<DeliveryProjection> => {
    const rawValue = own(value, ['operation', 'subject']);
    if (
      !rawValue ||
      !identity('ID-OP', rawValue.operation) ||
      !['target', 'gate', 'effect'].includes(rawValue.subject as string)
    )
      return fail('FC-INPUT', 'INVALID_DELIVERY_OBSERVATION');
    const intent = intents.get(rawValue.operation as string);
    if (intent?.type !== 'OPC-DEL-OBSERVE' || observations.has(intent.operation))
      return fail('FC-AUTHORITY', 'OBSERVATION_INTENT_REQUIRED');
    let fact: DeliveryResult<DeliveryObservationFact>;
    try {
      fact = mechanism.value.attestObservation({
        operation: intent.operation,
        subject: rawValue.subject as 'target' | 'gate' | 'effect',
      });
    } catch {
      return fail('FC-MECHANISM', 'DELIVERY_OBSERVATION_FAILED');
    }
    if (!fact.ok) return fact;
    if (intent.subject !== rawValue.subject) return fail('FC-FENCE', 'OBSERVATION_SUBJECT_MISMATCH');
    if (
      fact.value.operation !== intent.operation ||
      fact.value.subject !== rawValue.subject ||
      fact.value.target !== carrier.binding.target ||
      fact.value.registry !== carrier.binding.registry ||
      fact.value.generation !== carrier.generation ||
      fact.value.authority !== carrier.authority ||
      fact.value.candidate !== carrier.candidate ||
      fact.value.candidateContentDigest !== carrier.candidateContentDigest ||
      fact.value.targetBasisDigest !== carrier.targetBasisDigest ||
      fact.value.correlationKey !== intent.correlationKey ||
      fact.value.resourceIdentity !== intent.resourceIdentity
    )
      return fail('FC-FENCE', 'OBSERVATION_FACT_FENCE_MISMATCH');
    if (fact.value.subject === 'gate' && !validRemoteGate(fact.value))
      return fail('FC-EVIDENCE', 'REMOTE_GATE_ATTESTATION_INVALID');
    if (recovery && fact.value.subject === 'effect' && effects.get(recovery.operation)?.type === 'OPC-DEL-ANCHOR') {
      const bridged = bridgeAnchorRecoveryObservation(fact.value);
      if (!bridged.ok) return bridged;
    }
    const recoveryBeforeObservation = recovery;
    const targetWaitBeforeObservation = targetWait;
    const appended = append({ kind: 'observation', fact: fact.value });
    if (!appended.ok) return appended;
    if (
      recoveryBeforeObservation &&
      fact.value.subject === 'effect' &&
      fact.value.resolvesOperation === recoveryBeforeObservation.operation
    ) {
      if (fact.value.outcome === 'absent' || fact.value.outcome === 'present') {
        const resolved = append({
          kind: 'recovery-resolved',
          operation: recoveryBeforeObservation.operation,
          observedOperation: fact.value.operation,
          outcome: fact.value.outcome === 'present' ? 'success' : 'absent',
        });
        if (!resolved.ok) return resolved;
      }
    }
    if (
      targetWaitBeforeObservation &&
      fact.value.subject === 'target' &&
      fact.value.resolvesOperation === targetWaitBeforeObservation.operation
    ) {
      if (
        fact.value.observedAt >= targetWaitBeforeObservation.deadline ||
        fact.value.outcome === 'conflict' ||
        fact.value.outcome === 'advanced'
      ) {
        const exhausted = append({
          kind: 'wait-exhausted',
          operation: targetWaitBeforeObservation.operation,
          observedOperation: fact.value.operation,
        });
        if (!exhausted.ok) return exhausted;
      }
    }
    return ok(projection());
  };
  const wake = (value: unknown): DeliveryResult<DeliveryProjection> => {
    const rawValue = own(value, ['at', 'operation']);
    if (!rawValue || !position(rawValue.at) || !identity('ID-OP', rawValue.operation))
      return fail('FC-INPUT', 'INVALID_DELIVERY_WAKE');
    const fact = observations.get(rawValue.operation as string);
    if (fact?.subject !== 'target' || !targetWait || fact.resolvesOperation !== targetWait.operation)
      return fail('FC-BOUND', 'VALIDATED_TARGET_OBSERVATION_REQUIRED');
    if (fact.observedAt !== rawValue.at) return fail('FC-TRUST', 'WAKE_TIME_MISMATCH');
    if (fact.outcome === 'ready') {
      targetWait = null;
      status = 'Ready';
      return ok(projection());
    }
    if (fact.observedAt >= targetWait.deadline) {
      const exhausted = append({
        kind: 'wait-exhausted',
        operation: targetWait.operation,
        observedOperation: fact.operation,
      });
      if (!exhausted.ok) return exhausted;
    }
    return ok(projection());
  };
  const recordLanded = (value: unknown): DeliveryResult<DeliveryLandingProof> => {
    const rawValue = own(value, ['mergeOperation', 'operation', 'targetObservationOperation']);
    if (
      !rawValue ||
      !identity('ID-OP', rawValue.operation) ||
      !identity('ID-OP', rawValue.mergeOperation) ||
      !identity('ID-OP', rawValue.targetObservationOperation)
    )
      return fail('FC-INPUT', 'INVALID_LANDING_RECORD');
    if (landing || status === 'Landed') return fail('FC-AUTHORITY', 'LANDING_ALREADY_RECORDED');
    if (status === 'Parked') return fail('FC-AUTHORITY', 'DELIVERY_TERMINAL');
    const merge = effects.get(rawValue.mergeOperation as string);
    const observation = observations.get(rawValue.targetObservationOperation as string);
    const mergeIntentEntry = journal.find(
      (entry) => entry.record.kind === 'intent' && entry.record.intent.operation === rawValue.mergeOperation,
    );
    const mergeEffectEntry = journal.find(
      (entry) => entry.record.kind === 'effect' && entry.record.fact.operation === rawValue.mergeOperation,
    );
    const observationIntentEntry = journal.find(
      (entry) =>
        entry.record.kind === 'intent' && entry.record.intent.operation === rawValue.targetObservationOperation,
    );
    const observationEntry = journal.find(
      (entry) =>
        entry.record.kind === 'observation' && entry.record.fact.operation === rawValue.targetObservationOperation,
    );
    const latestTargetObservationEntry = [...journal]
      .reverse()
      .find((entry) => entry.record.kind === 'observation' && entry.record.fact.subject === 'target');
    if (
      merge?.type !== 'OPC-DEL-MERGE' ||
      !(merge.outcome === 'success' || resolvedEffects.has(merge.operation)) ||
      !mergeIntentEntry ||
      !mergeEffectEntry ||
      !observation ||
      !observationIntentEntry ||
      !observationEntry ||
      latestTargetObservationEntry?.position !== observationEntry.position ||
      mergeEffectEntry.position >= observationIntentEntry.position ||
      mergeEffectEntry.position >= observationEntry.position ||
      observation.subject !== 'target' ||
      observation.resolvesOperation !== merge.operation ||
      observation.outcome !== 'ready' ||
      observation.correlationKey !== merge.correlationKey
    )
      return fail('FC-EVIDENCE', 'AUTHORITATIVE_LANDING_OBSERVATION_REQUIRED');
    if (carrier.remoteGate.required && !currentRemoteGate()) return fail('FC-EVIDENCE', 'REMOTE_GATE_REQUIRED');
    const anchor =
      successful('OPC-DEL-ANCHOR') ??
      [...effects.values()].find((fact) => fact.type === 'OPC-DEL-ANCHOR' && resolvedEffects.has(fact.operation));
    if (!anchor || !anchorRootsAtCarrier(anchor) || anchor.result.anchorRegistry !== carrier.binding.registry)
      return fail('FC-FENCE', 'REGISTRY_ANCHOR_REQUIRED');
    const changedPathsDigest = derive('DELIVERY-CHANGE-SET', {
      targetBasisDigest: carrier.targetBasisDigest,
      changedPaths: carrier.changedPaths,
    });
    const equivalent =
      carrier.strategy.mode === 'direct-fast-forward'
        ? observation.result.commit === carrier.workspaceCommit &&
          observation.result.treeDigest === carrier.treeDigest &&
          observation.result.contentDigest === carrier.candidateContentDigest
        : observation.result.treeDigest === carrier.treeDigest &&
          observation.result.changedPathsDigest === changedPathsDigest;
    if (!equivalent) return fail('FC-EVIDENCE', 'LP_EQUIVALENCE_FAILED');
    const proof: DeliveryLandingProof = {
      schema: DELIVERY_EVENT_SCHEMA,
      kind: 'EV-LANDING-OBSERVED',
      operation: rawValue.operation as string,
      mergeOperation: merge.operation,
      targetObservationOperation: observation.operation,
      target: carrier.binding.target,
      registry: carrier.binding.registry,
      candidate: carrier.candidate,
      candidateContentDigest: carrier.candidateContentDigest,
      targetBasisDigest: carrier.targetBasisDigest,
      strategy: carrier.strategy.mode,
      equivalence: carrier.strategy.mode === 'direct-fast-forward' ? 'commit-and-content' : 'tree-and-change-set',
      equivalenceDigest:
        derive('DELIVERY-LANDING-PROOF', { merge, observation, strategy: carrier.strategy, changedPathsDigest }) ??
        ZERO,
      observedAt: observation.observedAt,
      result: observation.result,
    };
    const recorded = append({ kind: 'landing', proof });
    if (!recorded.ok) return recorded;
    const releasedRecord = append({ kind: 'release', story: carrier.story, landingOperation: proof.operation });
    if (!releasedRecord.ok) return releasedRecord;
    return ok(proof);
  };
  const controller: ScriptedDeliveryController = {
    authorize,
    dispatch,
    observe,
    wake,
    recordLanded,
    projection,
    snapshot: () =>
      freeze({
        schema: DELIVERY_SNAPSHOT_SCHEMA,
        carrier,
        status,
        records: Object.freeze([...journal]),
        projection: projection(),
        finalizerSnapshot: finalizerController.snapshot(),
      }),
    records: () => Object.freeze([...journal]),
    reachability: () =>
      Object.freeze({
        status: 'scripted-only' as const,
        providerEnabled: false as const,
        landingEnabled: false as const,
        externalEffects: false as const,
      }),
  };
  return ok(controller);
}

export function restoreScriptedDeliveryController(
  snapshot: unknown,
  input: unknown,
): DeliveryResult<ScriptedDeliveryController> {
  if (
    !plain(snapshot) ||
    field(snapshot, 'schema') !== DELIVERY_SNAPSHOT_SCHEMA ||
    !Array.isArray(field(snapshot, 'records'))
  )
    return fail('FC-TRUST', 'INVALID_DELIVERY_SNAPSHOT');
  const supplied = plain(input) ? input : {};
  return createScriptedDeliveryController({ ...supplied, initialSnapshot: snapshot });
}
