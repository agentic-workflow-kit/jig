import { type CanonicalJson, stageDigest } from '@agentic-workflow-kit/jig-codec';

/**
 * Bounds are controller-owned facts. This module deliberately has no clock, timer,
 * provider, port, or dispatch capability: callers supply witnessed facts and the
 * reducer decides only from those facts.
 */
export const BOUNDS_VERSION = 'jig.bounds.v1';
export const BOUND_POLICY_VERSION = 'jig.bound-policy.v1';
export const CLOCK_FACT_VERSION = 'jig.witnessed-clock.v1';
export const BOUNDS_CONTROLLER_ROLE = 'RT-CONTROLLER';

export const BOUND_CLASSES = Object.freeze([
  'BND-REWORK',
  'BND-RETRY',
  'BND-REFRESH',
  'BND-WAIT-DECISION',
  'BND-WAIT-MECHANISM',
  'BND-WAIT-CAPACITY',
  'BND-WAIT-LEDGER',
  'BND-WAIT-TARGET',
  'BND-IDLE',
  'BND-SILENCE',
  'BND-RECOVERY',
  'BND-RETIRE',
] as const);
export type BoundClass = (typeof BOUND_CLASSES)[number];

export const WAKE_SELECTORS = Object.freeze([
  'EV-WAKE-DEPENDENCY',
  'EV-WAKE-CAPACITY',
  'EV-WAKE-TIMER',
  'EV-WAKE-AUTHORITY',
  'EV-WAKE-FINALIZATION',
  'EV-WAKE-SETTLEMENT',
] as const);
export type WakeSelector = (typeof WAKE_SELECTORS)[number];

export const WAIT_SURFACES = Object.freeze([
  'review-rework',
  'operation-source-retry',
  'target-refresh',
  'owner-provider-answer',
  'mediated-operation-response',
  'capacity-admission',
  'ledger-registry-intake',
  'target-stability',
  'qualifying-progress-idle',
  'session-silence',
  'effect-reconciliation',
  'retirement-settlement',
  'capability-proof-exchange',
  'configuration-artifact-read',
  'finalization-authority-queue',
  'live-open-obligation',
] as const);
export type WaitSurface = (typeof WAIT_SURFACES)[number];

export type BoundDisposition = 'retry' | 'block' | 'park' | 'recover' | 'escalate' | 'residual-obligation';
export type BoundUnit = 'count' | 'seconds';
export type BoundResetRule = 'none' | 'qualifying-progress' | 'heartbeat';

export type BoundDefinition = Readonly<{
  default: number;
  lower: number;
  upper: number;
  unit: BoundUnit;
  exhaustion: BoundDisposition;
}>;

export const BOUND_DEFINITIONS: Readonly<Record<BoundClass, BoundDefinition>> = Object.freeze({
  'BND-REWORK': Object.freeze({ default: 2, lower: 1, upper: 5, unit: 'count', exhaustion: 'block' }),
  'BND-RETRY': Object.freeze({ default: 3, lower: 1, upper: 5, unit: 'count', exhaustion: 'block' }),
  'BND-REFRESH': Object.freeze({ default: 2, lower: 1, upper: 5, unit: 'count', exhaustion: 'park' }),
  'BND-WAIT-DECISION': Object.freeze({
    default: 72 * 60 * 60,
    lower: 60 * 60,
    upper: 30 * 24 * 60 * 60,
    unit: 'seconds',
    exhaustion: 'escalate',
  }),
  'BND-WAIT-MECHANISM': Object.freeze({
    default: 15 * 60,
    lower: 5,
    upper: 2 * 60 * 60,
    unit: 'seconds',
    exhaustion: 'retry',
  }),
  'BND-WAIT-CAPACITY': Object.freeze({
    default: 24 * 60 * 60,
    lower: 60 * 60,
    upper: 30 * 24 * 60 * 60,
    unit: 'seconds',
    exhaustion: 'park',
  }),
  'BND-WAIT-LEDGER': Object.freeze({ default: 30, lower: 1, upper: 5 * 60, unit: 'seconds', exhaustion: 'recover' }),
  'BND-WAIT-TARGET': Object.freeze({
    default: 30 * 60,
    lower: 60,
    upper: 24 * 60 * 60,
    unit: 'seconds',
    exhaustion: 'park',
  }),
  'BND-IDLE': Object.freeze({
    default: 30 * 60,
    lower: 5 * 60,
    upper: 8 * 60 * 60,
    unit: 'seconds',
    exhaustion: 'park',
  }),
  'BND-SILENCE': Object.freeze({ default: 5 * 60, lower: 10, upper: 30 * 60, unit: 'seconds', exhaustion: 'park' }),
  'BND-RECOVERY': Object.freeze({ default: 3, lower: 1, upper: 5, unit: 'count', exhaustion: 'park' }),
  'BND-RETIRE': Object.freeze({ default: 3, lower: 1, upper: 5, unit: 'count', exhaustion: 'residual-obligation' }),
});

type SurfaceDefinition = Readonly<{
  bound: BoundClass;
  owner: string;
  reason: string;
  wake: WakeSelector;
  reset: BoundResetRule;
  completion: string;
}>;

export const SURFACE_DEFINITIONS: Readonly<Record<WaitSurface, SurfaceDefinition>> = Object.freeze({
  'review-rework': Object.freeze({
    bound: 'BND-REWORK',
    owner: 'CP-TRANSITION',
    reason: 'review/rework loop',
    wake: 'EV-WAKE-CAPACITY',
    reset: 'none',
    completion: 'fresh rework assignment or terminal Story outcome',
  }),
  'operation-source-retry': Object.freeze({
    bound: 'BND-RETRY',
    owner: 'CP-MEDIATOR',
    reason: 'operation/source attempt',
    wake: 'EV-WAKE-TIMER',
    reset: 'none',
    completion: 'validated result or fixed owning-scope disposition',
  }),
  'target-refresh': Object.freeze({
    bound: 'BND-REFRESH',
    owner: 'CP-FINALIZER',
    reason: 'target refresh while authority is held',
    wake: 'EV-WAKE-AUTHORITY',
    reset: 'none',
    completion: 'aligned candidate or RefreshPark',
  }),
  'owner-provider-answer': Object.freeze({
    bound: 'BND-WAIT-DECISION',
    owner: 'CP-ESCALATION',
    reason: 'durable owner/provider answer',
    wake: 'EV-WAKE-TIMER',
    reset: 'none',
    completion: 'exact scoped decision or durable re-escalation',
  }),
  'mediated-operation-response': Object.freeze({
    bound: 'BND-WAIT-MECHANISM',
    owner: 'CP-MEDIATOR',
    reason: 'mediated mechanism response',
    wake: 'EV-WAKE-TIMER',
    reset: 'none',
    completion: 'validated fact, failure, or certainty observation',
  }),
  'capacity-admission': Object.freeze({
    bound: 'BND-WAIT-CAPACITY',
    owner: 'CP-SCHEDULER',
    reason: 'continuous admission starvation',
    wake: 'EV-WAKE-CAPACITY',
    reset: 'none',
    completion: 'capacity/reserve change or fixed capacity disposition',
  }),
  'ledger-registry-intake': Object.freeze({
    bound: 'BND-WAIT-LEDGER',
    owner: 'CP-INTAKE',
    reason: 'ledger/registry/intake acknowledgement',
    wake: 'EV-WAKE-TIMER',
    reset: 'none',
    completion: 'verified acknowledgement/readback or Recovery',
  }),
  'target-stability': Object.freeze({
    bound: 'BND-WAIT-TARGET',
    owner: 'CP-FINALIZER',
    reason: 'target stability/integration hold',
    wake: 'EV-WAKE-TIMER',
    reset: 'none',
    completion: 'validated target fact or fixed park',
  }),
  'qualifying-progress-idle': Object.freeze({
    bound: 'BND-IDLE',
    owner: 'CP-MEDIATOR',
    reason: 'responsive session without qualifying progress',
    wake: 'EV-WAKE-TIMER',
    reset: 'qualifying-progress',
    completion: 'qualifying durable progress or stuck park',
  }),
  'session-silence': Object.freeze({
    bound: 'BND-SILENCE',
    owner: 'CP-MEDIATOR',
    reason: 'assigned session silence',
    wake: 'EV-WAKE-TIMER',
    reset: 'heartbeat',
    completion: 'valid heartbeat/response or dead classification',
  }),
  'effect-reconciliation': Object.freeze({
    bound: 'BND-RECOVERY',
    owner: 'CP-RECOVERY',
    reason: 'uncertain effect reconciliation',
    wake: 'EV-WAKE-TIMER',
    reset: 'none',
    completion: 'certainty observation or retained-fence park',
  }),
  'retirement-settlement': Object.freeze({
    bound: 'BND-RETIRE',
    owner: 'CP-TRANSITION',
    reason: 'retirement/settlement overlay duty',
    wake: 'EV-WAKE-SETTLEMENT',
    reset: 'none',
    completion: 'duty completion or one open obligation',
  }),
  'capability-proof-exchange': Object.freeze({
    bound: 'BND-WAIT-MECHANISM',
    owner: 'EP-PROVIDERS',
    reason: 'compose-time capability proof',
    wake: 'EV-WAKE-TIMER',
    reset: 'none',
    completion: 'positive proof or pre-Run failure',
  }),
  'configuration-artifact-read': Object.freeze({
    bound: 'BND-WAIT-MECHANISM',
    owner: 'CP-INTAKE',
    reason: 'pre-Run configuration artifact read',
    wake: 'EV-WAKE-TIMER',
    reset: 'none',
    completion: 'digest-valid result or intake failure',
  }),
  'finalization-authority-queue': Object.freeze({
    bound: 'BND-WAIT-CAPACITY',
    owner: 'CP-FINALIZER',
    reason: 'finalization authority queue starvation',
    wake: 'EV-WAKE-AUTHORITY',
    reset: 'none',
    completion: 'authority selection or fixed queue park',
  }),
  'live-open-obligation': Object.freeze({
    bound: 'BND-WAIT-DECISION',
    owner: 'CP-ESCALATION',
    reason: 'live open Residual Obligation',
    wake: 'EV-WAKE-SETTLEMENT',
    reset: 'none',
    completion: 'exact handoff acceptance/resolution or one overdue re-escalation',
  }),
});

export type BoundPolicy = Readonly<{
  schema: typeof BOUND_POLICY_VERSION;
  rangeVersion: typeof BOUNDS_VERSION;
  values: Readonly<Record<BoundClass, number>>;
  digest: string;
}>;

export type BoundSubject = Readonly<{ run: string; story: string; basis: string }>;
export type WitnessedClock = Readonly<{
  schema: typeof CLOCK_FACT_VERSION;
  kind: 'witnessed';
  generation: string;
  at: number;
  digest: string;
}>;

export function witnessedClockDigest(value: Omit<WitnessedClock, 'digest'>): string {
  const staged = stageDigest({
    domain: 'WITNESSED-CLOCK',
    excludePaths: ['digest'],
    value: { ...value, digest: '' } as CanonicalJson,
  });
  return staged.ok ? staged.value.digest : '';
}

export type BoundStatus = 'active' | 'completed' | 'exhausted';
export type BoundExhaustion = Readonly<{
  failure: 'FC-BOUND' | 'FC-LIVENESS';
  disposition: BoundDisposition;
  at: number;
  reason: string;
}>;
export type BoundRecord = Readonly<{
  schema: typeof BOUNDS_VERSION;
  surface: WaitSurface;
  bound: BoundClass;
  subject: BoundSubject;
  controller: typeof BOUNDS_CONTROLLER_ROLE;
  generation: string;
  policyDigest: string;
  limit: number;
  unit: BoundUnit;
  windowMs: number;
  startAt: number;
  deadlineAt: number;
  consumed: number;
  resetCount: number;
  status: BoundStatus;
  disposition: BoundDisposition;
  owner: string;
  reason: string;
  wake: WakeSelector;
  resetRule: BoundResetRule;
  completion: string;
  exhaustion: BoundExhaustion | null;
  lastFactDigest: string;
}>;

export type DurableWake = Readonly<{
  schema: typeof BOUNDS_VERSION;
  event: WakeSelector;
  subject: BoundSubject;
  generation: string;
  conditionDigest: string;
  at: number;
  timerOnly: boolean;
}>;

export type BoundFailureFamily = 'FC-INPUT' | 'FC-FENCE' | 'FC-SUBJECT' | 'FC-BOUND' | 'FC-LIVENESS' | 'FC-TRUST';
export type BoundFailure = Readonly<{ family: BoundFailureFamily; code: string }>;
export type BoundResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: BoundFailure }>;

type BoundFactKind = 'start' | 'wake' | 'progress' | 'heartbeat' | 'consume' | 'complete' | 'exhausted';
export type BoundLedgerFact = Readonly<{
  schema: typeof BOUNDS_VERSION;
  kind: BoundFactKind;
  position: number;
  previousDigest: string;
  contentDigest: string;
  event: WakeSelector | 'EV-LIVENESS-OBSERVED' | 'EV-BOUND-EXHAUSTED' | null;
  surface: WaitSurface;
  generation: string;
  factDigest: string;
  record: BoundRecord;
  wake: DurableWake | null;
}>;
export type BoundJournalSnapshot = Readonly<{
  schema: typeof BOUNDS_VERSION;
  position: number;
  digest: string;
  facts: readonly BoundLedgerFact[];
}>;

export type LivenessKind = 'thinking' | 'stuck' | 'dead' | 'human-input-overdue';
export type LivenessObservation = Readonly<{
  schema: typeof BOUNDS_VERSION;
  event: 'EV-LIVENESS-OBSERVED';
  subject: BoundSubject;
  generation: string;
  at: number;
  source: 'mechanism';
  durable: true;
  kind: 'heartbeat' | 'progress' | 'terminated';
  factKind:
    | 'SCH-CANDIDATE'
    | 'EV-WORKSPACE-FACT'
    | 'EV-ARTIFACT-FACT'
    | 'EV-CHECK-OBSERVATION'
    | 'SCH-WORK-PROFILE'
    | 'heartbeat'
    | 'termination';
  factDigest: string;
}>;
export type LivenessClassification = Readonly<{
  schema: typeof BOUNDS_VERSION;
  subject: BoundSubject;
  generation: string;
  classification: LivenessKind;
  failure: 'FC-LIVENESS' | null;
  at: number;
  reason: string;
}>;

export type SilenceReplacementGuard = Readonly<{
  allowed: true;
  subject: BoundSubject;
  generation: string;
  successorGeneration: string;
  factDigest: string;
}>;

const GENESIS = '0'.repeat(64);
const HEX = /^[0-9a-f]{64}$/u;
const fail = <T = never>(family: BoundFailureFamily, code: string): BoundResult<T> => ({
  ok: false,
  error: Object.freeze({ family, code }),
});
const ok = <T>(value: T): BoundResult<T> => ({ ok: true, value: Object.freeze(value) });
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
const exact = (value: object, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const nonNegative = (value: unknown): value is number => integer(value) && value >= 0;
const digest = (value: unknown): value is string => typeof value === 'string' && HEX.test(value);
const frozen = <T>(value: T): T => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) frozen(child);
    Object.freeze(value);
  }
  return value;
};
const equalSubject = (left: BoundSubject, right: BoundSubject): boolean =>
  left.run === right.run && left.story === right.story && left.basis === right.basis;
const equalRecord = (left: BoundRecord, right: BoundRecord): boolean =>
  left.schema === right.schema &&
  left.surface === right.surface &&
  left.bound === right.bound &&
  equalSubject(left.subject, right.subject) &&
  left.controller === right.controller &&
  left.generation === right.generation &&
  left.policyDigest === right.policyDigest &&
  left.limit === right.limit &&
  left.unit === right.unit &&
  left.windowMs === right.windowMs &&
  left.startAt === right.startAt &&
  left.deadlineAt === right.deadlineAt &&
  left.consumed === right.consumed &&
  left.resetCount === right.resetCount &&
  left.status === right.status &&
  left.disposition === right.disposition &&
  left.owner === right.owner &&
  left.reason === right.reason &&
  left.wake === right.wake &&
  left.resetRule === right.resetRule &&
  left.completion === right.completion &&
  left.lastFactDigest === right.lastFactDigest &&
  JSON.stringify(left.exhaustion) === JSON.stringify(right.exhaustion);
const boundFailure = (record: BoundRecord): 'FC-BOUND' | 'FC-LIVENESS' =>
  record.bound === 'BND-IDLE' || record.bound === 'BND-SILENCE' ? 'FC-LIVENESS' : 'FC-BOUND';
const durationMs = (definition: BoundDefinition, value: number): number =>
  definition.unit === 'seconds' ? value * 1000 : 0;

function canonicalDigest(domain: string, value: unknown, excludedPath = 'digest'): BoundResult<string> {
  const staged = stageDigest({ domain, excludePaths: [excludedPath], value: value as CanonicalJson });
  return staged.ok ? ok(staged.value.digest) : fail('FC-TRUST', 'BOUND_DIGEST_FAILURE');
}

function validSubject(value: unknown): value is BoundSubject {
  return (
    plain(value) &&
    exact(value, ['basis', 'run', 'story']) &&
    typeof value.run === 'string' &&
    value.run.length > 0 &&
    typeof value.story === 'string' &&
    value.story.length > 0 &&
    digest(value.basis)
  );
}

function validClock(value: unknown): value is WitnessedClock {
  return (
    plain(value) &&
    exact(value, ['at', 'digest', 'generation', 'kind', 'schema']) &&
    value.schema === CLOCK_FACT_VERSION &&
    value.kind === 'witnessed' &&
    typeof value.generation === 'string' &&
    value.generation.length > 0 &&
    nonNegative(value.at) &&
    digest(value.digest) &&
    witnessedClockDigest(value as Omit<WitnessedClock, 'digest'>) === value.digest
  );
}

function validPolicyShape(value: unknown): value is Omit<BoundPolicy, 'digest'> & { digest: string } {
  return (
    plain(value) &&
    exact(value, ['digest', 'rangeVersion', 'schema', 'values']) &&
    value.schema === BOUND_POLICY_VERSION &&
    value.rangeVersion === BOUNDS_VERSION &&
    digest(value.digest) &&
    plain(value.values) &&
    exact(value.values, BOUND_CLASSES)
  );
}

export function boundPolicyDigest(value: Omit<BoundPolicy, 'digest'>): string {
  const result = canonicalDigest('BOUND-POLICY', { ...value, digest: '' });
  return result.ok ? result.value : '';
}

export function defaultBoundPolicy(): BoundPolicy {
  const values = Object.fromEntries(BOUND_CLASSES.map((bound) => [bound, BOUND_DEFINITIONS[bound].default])) as Record<
    BoundClass,
    number
  >;
  const body = { schema: BOUND_POLICY_VERSION, rangeVersion: BOUNDS_VERSION, values } as Omit<BoundPolicy, 'digest'>;
  return frozen({ ...body, digest: boundPolicyDigest(body) });
}

export function validateBoundPolicy(value: unknown): BoundResult<BoundPolicy> {
  if (!validPolicyShape(value)) return fail('FC-INPUT', 'MALFORMED_BOUND_POLICY');
  for (const bound of BOUND_CLASSES) {
    const selected = value.values[bound];
    const definition = BOUND_DEFINITIONS[bound];
    if (!integer(selected) || selected < definition.lower || selected > definition.upper)
      return fail('FC-INPUT', `${bound}_OUT_OF_RANGE`);
  }
  if (boundPolicyDigest(value) !== value.digest) return fail('FC-TRUST', 'BOUND_POLICY_DIGEST_MISMATCH');
  return ok(
    frozen({
      schema: value.schema,
      rangeVersion: value.rangeVersion,
      values: { ...value.values },
      digest: value.digest,
    }),
  );
}

function surface(value: unknown): value is WaitSurface {
  return typeof value === 'string' && (WAIT_SURFACES as readonly string[]).includes(value);
}

function startRecord(
  input: Readonly<{
    surface: WaitSurface;
    subject: BoundSubject;
    generation: string;
    policy: BoundPolicy;
    startedAt: number;
    clock: WitnessedClock;
  }>,
): BoundResult<BoundRecord> {
  const definition = SURFACE_DEFINITIONS[input.surface];
  const value = input.policy.values[definition.bound];
  const at = input.startedAt;
  if (
    !nonNegative(at) ||
    !validClock(input.clock) ||
    input.clock.generation !== input.generation ||
    input.clock.at !== at ||
    at > Number.MAX_SAFE_INTEGER - durationMs(BOUND_DEFINITIONS[definition.bound], value)
  )
    return fail('FC-INPUT', 'INVALID_BOUND_CLOCK');
  return ok(
    frozen({
      schema: BOUNDS_VERSION,
      surface: input.surface,
      bound: definition.bound,
      subject: input.subject,
      controller: BOUNDS_CONTROLLER_ROLE,
      generation: input.generation,
      policyDigest: input.policy.digest,
      limit: value,
      unit: BOUND_DEFINITIONS[definition.bound].unit,
      windowMs: durationMs(BOUND_DEFINITIONS[definition.bound], value),
      startAt: at,
      deadlineAt: at + durationMs(BOUND_DEFINITIONS[definition.bound], value),
      consumed: 0,
      resetCount: 0,
      status: 'active',
      disposition: definition.bound === 'BND-WAIT-LEDGER' ? 'recover' : BOUND_DEFINITIONS[definition.bound].exhaustion,
      owner: definition.owner,
      reason: definition.reason,
      wake: definition.wake,
      resetRule: definition.reset,
      completion: definition.completion,
      exhaustion: null,
      lastFactDigest: input.clock.digest,
    }),
  );
}

function validRecord(value: unknown): value is BoundRecord {
  if (!plain(value)) return false;
  if (
    !exact(value, [
      'bound',
      'completion',
      'controller',
      'deadlineAt',
      'disposition',
      'exhaustion',
      'generation',
      'lastFactDigest',
      'limit',
      'owner',
      'policyDigest',
      'reason',
      'resetCount',
      'resetRule',
      'schema',
      'startAt',
      'status',
      'subject',
      'surface',
      'unit',
      'wake',
      'windowMs',
      'consumed',
    ])
  )
    return false;
  const record = value as BoundRecord;
  if (
    record.schema !== BOUNDS_VERSION ||
    record.controller !== BOUNDS_CONTROLLER_ROLE ||
    !surface(record.surface) ||
    !BOUND_CLASSES.includes(record.bound) ||
    !validSubject(record.subject) ||
    typeof record.generation !== 'string' ||
    !digest(record.policyDigest) ||
    !nonNegative(record.limit) ||
    (record.unit !== 'count' && record.unit !== 'seconds') ||
    !nonNegative(record.windowMs) ||
    !nonNegative(record.startAt) ||
    !nonNegative(record.deadlineAt) ||
    record.deadlineAt < record.startAt ||
    !nonNegative(record.consumed) ||
    !nonNegative(record.resetCount) ||
    (record.status !== 'active' && record.status !== 'completed' && record.status !== 'exhausted') ||
    typeof record.disposition !== 'string' ||
    typeof record.owner !== 'string' ||
    typeof record.reason !== 'string' ||
    (record.resetRule !== 'none' && record.resetRule !== 'qualifying-progress' && record.resetRule !== 'heartbeat') ||
    typeof record.completion !== 'string' ||
    !digest(record.lastFactDigest)
  )
    return false;
  if (record.exhaustion !== null) {
    if (
      !plain(record.exhaustion) ||
      !exact(record.exhaustion, ['at', 'disposition', 'failure', 'reason']) ||
      !nonNegative(record.exhaustion.at) ||
      typeof record.exhaustion.disposition !== 'string' ||
      (record.exhaustion.failure !== 'FC-BOUND' && record.exhaustion.failure !== 'FC-LIVENESS') ||
      typeof record.exhaustion.reason !== 'string'
    )
      return false;
  }
  const definition = SURFACE_DEFINITIONS[record.surface];
  const boundDefinition = BOUND_DEFINITIONS[record.bound];
  return (
    record.bound === definition.bound &&
    record.unit === boundDefinition.unit &&
    integer(record.limit) &&
    record.limit >= boundDefinition.lower &&
    record.limit <= boundDefinition.upper &&
    record.disposition === boundDefinition.exhaustion &&
    record.owner === definition.owner &&
    record.reason === definition.reason &&
    record.wake === definition.wake &&
    record.resetRule === definition.reset &&
    record.completion === definition.completion &&
    record.windowMs === durationMs(boundDefinition, record.limit) &&
    record.deadlineAt >= record.startAt + record.windowMs &&
    record.startAt <= Number.MAX_SAFE_INTEGER - record.windowMs &&
    record.consumed <= record.limit &&
    (record.status !== 'exhausted' || record.unit !== 'count' || record.consumed >= record.limit) &&
    ((record.status === 'exhausted' && record.exhaustion !== null) ||
      (record.status !== 'exhausted' && record.exhaustion === null)) &&
    (record.exhaustion === null ||
      (record.exhaustion.disposition === record.disposition && record.exhaustion.at >= record.startAt))
  );
}

function validateFence(record: BoundRecord, generation: string, subject: BoundSubject): BoundResult<void> {
  if (record.generation !== generation) return fail('FC-FENCE', 'STALE_BOUND_GENERATION');
  if (!equalSubject(record.subject, subject)) return fail('FC-SUBJECT', 'BOUND_SUBJECT_MISMATCH');
  return ok(undefined);
}

function makeFact(
  kind: BoundFactKind,
  record: BoundRecord,
  factDigest: string,
  event: BoundLedgerFact['event'],
  position: number,
  previousDigest: string,
  wake: DurableWake | null,
): BoundResult<BoundLedgerFact> {
  const content: Omit<BoundLedgerFact, 'contentDigest'> = {
    schema: BOUNDS_VERSION,
    kind,
    position,
    previousDigest,
    event,
    surface: record.surface,
    generation: record.generation,
    factDigest,
    record,
    wake,
  };
  const computed = canonicalDigest('BOUND-FACT', { ...content, contentDigest: '' }, 'contentDigest');
  if (!computed.ok) return computed;
  return ok(frozen({ ...content, contentDigest: computed.value } as BoundLedgerFact));
}

function fixedFactDigest(input: unknown): input is string {
  return digest(input);
}

export type BoundJournal = Readonly<{
  start(
    input: Readonly<{
      surface: WaitSurface;
      subject: BoundSubject;
      generation: string;
      policy: BoundPolicy;
      startedAt: number;
      clock: WitnessedClock;
      factDigest: string;
    }>,
  ): BoundResult<BoundRecord>;
  wake(
    input: Readonly<{
      surface: WaitSurface;
      generation: string;
      subject: BoundSubject;
      at: number;
      conditionDigest: string;
      selector: WakeSelector;
      factDigest: string;
    }>,
  ): BoundResult<DurableWake>;
  observe(
    input: Readonly<{
      surface: WaitSurface;
      generation: string;
      subject: BoundSubject;
      at: number;
      clock: WitnessedClock;
      kind: 'progress' | 'heartbeat';
      factDigest: string;
    }>,
  ): BoundResult<BoundRecord>;
  consume(
    input: Readonly<{
      surface: WaitSurface;
      generation: string;
      subject: BoundSubject;
      at: number;
      clock: WitnessedClock;
      factDigest: string;
    }>,
  ): BoundResult<BoundRecord>;
  complete(
    input: Readonly<{
      surface: WaitSurface;
      generation: string;
      subject: BoundSubject;
      at: number;
      clock: WitnessedClock;
      factDigest: string;
    }>,
  ): BoundResult<BoundRecord>;
  evaluate(
    input: Readonly<{ surface: WaitSurface; generation: string; subject: BoundSubject; clock: WitnessedClock }>,
  ): BoundResult<BoundRecord>;
  snapshot(): BoundJournalSnapshot;
}>;

export function createBoundJournal(): BoundJournal {
  let facts: BoundLedgerFact[] = [];
  const current = new Map<WaitSurface, BoundRecord>();
  const append = (fact: BoundLedgerFact): void => {
    facts = [...facts, fact];
    current.set(fact.surface, fact.record);
  };
  const seen = (factDigest: string): BoundLedgerFact | undefined =>
    facts.find((fact) => fact.factDigest === factDigest);
  const currentRecord = (
    surfaceId: WaitSurface,
    generation: string,
    subject: BoundSubject,
  ): BoundResult<BoundRecord> => {
    const record = current.get(surfaceId);
    if (!record) return fail('FC-INPUT', 'BOUND_NOT_STARTED');
    const fence = validateFence(record, generation, subject);
    return fence.ok ? ok(record) : fence;
  };
  const journal: BoundJournal = {
    start(input) {
      if (
        !surface(input.surface) ||
        !validSubject(input.subject) ||
        !validPolicyShape(input.policy) ||
        !fixedFactDigest(input.factDigest)
      )
        return fail('FC-INPUT', 'MALFORMED_BOUND_START');
      const policy = validateBoundPolicy(input.policy);
      if (!policy.ok) return policy;
      if (current.has(input.surface)) return fail('FC-BOUND', 'DUPLICATE_BOUND_START');
      const record = startRecord({ ...input, policy: policy.value });
      if (!record.ok) return record;
      const next = makeFact(
        'start',
        record.value,
        input.factDigest,
        null,
        facts.length,
        facts.at(-1)?.contentDigest ?? GENESIS,
        null,
      );
      if (!next.ok) return next;
      append(next.value);
      return ok(record.value);
    },
    wake(input) {
      if (
        !surface(input.surface) ||
        !validSubject(input.subject) ||
        !Number.isSafeInteger(input.at) ||
        input.at < 0 ||
        !digest(input.conditionDigest) ||
        !fixedFactDigest(input.factDigest) ||
        !(WAKE_SELECTORS as readonly string[]).includes(input.selector)
      )
        return fail('FC-INPUT', 'MALFORMED_WAKE');
      const record = currentRecord(input.surface, input.generation, input.subject);
      if (!record.ok) return record;
      const prior = seen(input.factDigest);
      if (prior?.wake) return ok(prior.wake);
      const wake = frozen({
        schema: BOUNDS_VERSION,
        event: input.selector,
        subject: input.subject,
        generation: input.generation,
        conditionDigest: input.conditionDigest,
        at: input.at,
        timerOnly: input.selector === 'EV-WAKE-TIMER',
      } as DurableWake);
      const next = makeFact(
        'wake',
        record.value,
        input.factDigest,
        input.selector,
        facts.length,
        facts.at(-1)?.contentDigest ?? GENESIS,
        wake,
      );
      if (!next.ok) return next;
      append(next.value);
      return ok(wake);
    },
    observe(input) {
      if (!fixedFactDigest(input.factDigest) || !validClock(input.clock))
        return fail('FC-INPUT', 'MALFORMED_BOUND_OBSERVATION');
      const record = currentRecord(input.surface, input.generation, input.subject);
      if (!record.ok) return record;
      const prior = seen(input.factDigest);
      if (prior) return ok(prior.record);
      if (record.value.status !== 'active') return fail('FC-BOUND', 'BOUND_ALREADY_TERMINAL');
      const expectedKind =
        record.value.resetRule === 'qualifying-progress'
          ? 'progress'
          : record.value.resetRule === 'heartbeat'
            ? 'heartbeat'
            : 'none';
      if (expectedKind !== input.kind) return fail('FC-LIVENESS', 'RESET_NOT_CATALOGUED');
      if (input.clock.generation !== record.value.generation || input.clock.at !== input.at)
        return fail('FC-FENCE', 'STALE_OR_AMBIGUOUS_CLOCK');
      if (record.value.unit === 'seconds' && input.at >= record.value.deadlineAt)
        return fail('FC-LIVENESS', 'BOUND_DEADLINE_MISSED');
      const nextRecord = frozen({
        ...record.value,
        deadlineAt: input.at + record.value.windowMs,
        resetCount: record.value.resetCount + 1,
        lastFactDigest: input.factDigest,
      } as BoundRecord);
      const next = makeFact(
        input.kind,
        nextRecord,
        input.factDigest,
        'EV-LIVENESS-OBSERVED',
        facts.length,
        facts.at(-1)?.contentDigest ?? GENESIS,
        null,
      );
      if (!next.ok) return next;
      append(next.value);
      return ok(nextRecord);
    },
    consume(input) {
      if (!fixedFactDigest(input.factDigest) || !validClock(input.clock))
        return fail('FC-INPUT', 'MALFORMED_BOUND_CONSUMPTION');
      const record = currentRecord(input.surface, input.generation, input.subject);
      if (!record.ok) return record;
      const prior = seen(input.factDigest);
      if (prior) return ok(prior.record);
      if (record.value.status !== 'active') return fail('FC-BOUND', 'BOUND_ALREADY_TERMINAL');
      if (input.clock.generation !== record.value.generation || input.clock.at !== input.at)
        return fail('FC-FENCE', 'STALE_OR_AMBIGUOUS_CLOCK');
      if (record.value.unit !== 'count') return fail('FC-INPUT', 'DURATION_BOUND_REQUIRES_EVALUATION');
      if (input.at >= record.value.deadlineAt && record.value.windowMs > 0)
        return fail('FC-BOUND', 'BOUND_DEADLINE_MISSED');
      const consumed = record.value.consumed + 1;
      const exhausted = consumed >= record.value.limit;
      const nextRecord: BoundRecord = exhausted
        ? frozen({
            ...record.value,
            consumed,
            status: 'exhausted',
            lastFactDigest: input.factDigest,
            exhaustion: {
              failure: boundFailure(record.value),
              disposition: record.value.disposition,
              at: input.at,
              reason: 'bound exhausted',
            },
          } as BoundRecord)
        : frozen({ ...record.value, consumed, lastFactDigest: input.factDigest } as BoundRecord);
      const next = makeFact(
        exhausted ? 'exhausted' : 'consume',
        nextRecord,
        input.factDigest,
        exhausted ? 'EV-BOUND-EXHAUSTED' : null,
        facts.length,
        facts.at(-1)?.contentDigest ?? GENESIS,
        null,
      );
      if (!next.ok) return next;
      append(next.value);
      return ok(nextRecord);
    },
    complete(input) {
      if (!fixedFactDigest(input.factDigest) || !validClock(input.clock))
        return fail('FC-INPUT', 'MALFORMED_BOUND_COMPLETION');
      const record = currentRecord(input.surface, input.generation, input.subject);
      if (!record.ok) return record;
      const prior = seen(input.factDigest);
      if (prior) return ok(prior.record);
      if (record.value.status !== 'active') return fail('FC-BOUND', 'BOUND_ALREADY_TERMINAL');
      if (input.clock.generation !== record.value.generation || input.clock.at !== input.at)
        return fail('FC-FENCE', 'STALE_OR_AMBIGUOUS_CLOCK');
      const nextRecord = frozen({
        ...record.value,
        status: 'completed',
        lastFactDigest: input.factDigest,
      } as BoundRecord);
      const next = makeFact(
        'complete',
        nextRecord,
        input.factDigest,
        null,
        facts.length,
        facts.at(-1)?.contentDigest ?? GENESIS,
        null,
      );
      if (!next.ok) return next;
      append(next.value);
      return ok(nextRecord);
    },
    evaluate(input) {
      if (!validClock(input.clock)) return fail('FC-INPUT', 'MALFORMED_BOUND_CLOCK');
      const record = currentRecord(input.surface, input.generation, input.subject);
      if (!record.ok) return record;
      if (record.value.status !== 'active') return ok(record.value);
      if (input.clock.generation !== record.value.generation) return fail('FC-FENCE', 'STALE_BOUND_GENERATION');
      if (record.value.unit === 'count') return ok(record.value);
      if (input.clock.at < record.value.deadlineAt) return ok(record.value);
      const factDigest = input.clock.digest;
      const prior = seen(factDigest);
      if (prior) return ok(prior.record);
      const nextRecord = frozen({
        ...record.value,
        status: 'exhausted',
        lastFactDigest: factDigest,
        exhaustion: {
          failure: boundFailure(record.value),
          disposition: record.value.disposition,
          at: input.clock.at,
          reason: 'durable deadline exhausted',
        },
      } as BoundRecord);
      const next = makeFact(
        'exhausted',
        nextRecord,
        factDigest,
        'EV-BOUND-EXHAUSTED',
        facts.length,
        facts.at(-1)?.contentDigest ?? GENESIS,
        null,
      );
      if (!next.ok) return next;
      append(next.value);
      return ok(nextRecord);
    },
    snapshot() {
      return frozen({
        schema: BOUNDS_VERSION,
        position: facts.length - 1,
        digest: facts.at(-1)?.contentDigest ?? GENESIS,
        facts: [...facts],
      });
    },
  };
  return journal;
}

export function replayBoundFacts(value: unknown): BoundResult<BoundJournalSnapshot> {
  if (
    !plain(value) ||
    !exact(value, ['digest', 'facts', 'position', 'schema']) ||
    value.schema !== BOUNDS_VERSION ||
    !Array.isArray(value.facts) ||
    !integer(value.position) ||
    value.position < -1 ||
    !digest(value.digest)
  )
    return fail('FC-TRUST', 'MALFORMED_BOUND_SNAPSHOT');
  const ordered = [...value.facts].sort((left, right) =>
    plain(left) && plain(right) && integer(left.position) && integer(right.position)
      ? left.position - right.position
      : 0,
  );
  let previous = GENESIS;
  const seenFactDigests = new Set<string>();
  const priorRecords = new Map<WaitSurface, BoundRecord>();
  for (let index = 0; index < ordered.length; index += 1) {
    const fact = ordered[index];
    if (
      !plain(fact) ||
      !exact(fact, [
        'contentDigest',
        'event',
        'factDigest',
        'generation',
        'kind',
        'position',
        'previousDigest',
        'record',
        'schema',
        'surface',
        'wake',
      ])
    )
      return fail('FC-TRUST', 'BOUND_REPLAY_CHAIN_INVALID');
    if (fact.schema !== BOUNDS_VERSION || fact.position !== index || fact.previousDigest !== previous)
      return fail('FC-TRUST', 'BOUND_REPLAY_CHAIN_INVALID');
    if (!digest(fact.contentDigest) || !digest(fact.factDigest) || !surface(fact.surface))
      return fail('FC-TRUST', 'BOUND_REPLAY_CHAIN_INVALID');
    if (!validRecord(fact.record)) return fail('FC-TRUST', 'BOUND_REPLAY_RECORD_INVALID');
    if (!['start', 'wake', 'progress', 'heartbeat', 'consume', 'complete', 'exhausted'].includes(fact.kind as string))
      return fail('FC-TRUST', 'BOUND_REPLAY_CHAIN_INVALID');
    const typedFact = fact as BoundLedgerFact;
    if (
      (typedFact.kind === 'wake' &&
        (typedFact.event === null ||
          !(WAKE_SELECTORS as readonly string[]).includes(typedFact.event) ||
          !plain(typedFact.wake) ||
          !exact(typedFact.wake, ['at', 'conditionDigest', 'event', 'generation', 'schema', 'subject', 'timerOnly']) ||
          typedFact.wake.schema !== BOUNDS_VERSION ||
          typedFact.wake.event !== typedFact.event ||
          typedFact.wake.generation !== typedFact.generation ||
          !equalSubject(typedFact.wake.subject, typedFact.record.subject) ||
          !digest(typedFact.wake.conditionDigest) ||
          !nonNegative(typedFact.wake.at) ||
          typedFact.wake.timerOnly !== (typedFact.event === 'EV-WAKE-TIMER'))) ||
      (typedFact.kind !== 'wake' && typedFact.wake !== null) ||
      (typedFact.kind === 'wake' && typedFact.event === null) ||
      ((typedFact.kind === 'progress' || typedFact.kind === 'heartbeat') &&
        typedFact.event !== 'EV-LIVENESS-OBSERVED') ||
      (typedFact.kind === 'exhausted' && typedFact.event !== 'EV-BOUND-EXHAUSTED') ||
      ((typedFact.kind === 'start' || typedFact.kind === 'consume' || typedFact.kind === 'complete') &&
        typedFact.event !== null)
    )
      return fail('FC-TRUST', 'BOUND_REPLAY_EVENT_INVALID');
    const priorRecord = priorRecords.get(typedFact.surface);
    if (!priorRecord) {
      if (typedFact.kind !== 'start') return fail('FC-TRUST', 'BOUND_REPLAY_START_MISSING');
    } else {
      if (
        typedFact.kind === 'start' ||
        !equalSubject(priorRecord.subject, typedFact.record.subject) ||
        priorRecord.generation !== typedFact.record.generation ||
        priorRecord.policyDigest !== typedFact.record.policyDigest ||
        priorRecord.bound !== typedFact.record.bound ||
        priorRecord.limit !== typedFact.record.limit ||
        priorRecord.unit !== typedFact.record.unit ||
        priorRecord.startAt !== typedFact.record.startAt ||
        priorRecord.windowMs !== typedFact.record.windowMs ||
        priorRecord.disposition !== typedFact.record.disposition ||
        priorRecord.owner !== typedFact.record.owner ||
        priorRecord.reason !== typedFact.record.reason ||
        priorRecord.wake !== typedFact.record.wake ||
        priorRecord.resetRule !== typedFact.record.resetRule ||
        priorRecord.completion !== typedFact.record.completion
      )
        return fail('FC-TRUST', 'BOUND_REPLAY_EPOCH_INVALID');
      if (typedFact.kind === 'wake' && !equalRecord(priorRecord, typedFact.record))
        return fail('FC-TRUST', 'BOUND_REPLAY_WAKE_MUTATION');
      if (
        (typedFact.kind === 'progress' || typedFact.kind === 'heartbeat') &&
        typedFact.record.resetCount !== priorRecord.resetCount + 1
      )
        return fail('FC-TRUST', 'BOUND_REPLAY_RESET_INVALID');
      if (
        typedFact.kind !== 'progress' &&
        typedFact.kind !== 'heartbeat' &&
        typedFact.record.resetCount !== priorRecord.resetCount
      )
        return fail('FC-TRUST', 'BOUND_REPLAY_RESET_MUTATION');
      if (
        (typedFact.kind === 'consume' || typedFact.kind === 'exhausted') &&
        typedFact.record.consumed !== priorRecord.consumed + 1
      )
        return fail('FC-TRUST', 'BOUND_REPLAY_CONSUMPTION_INVALID');
      if (
        typedFact.kind !== 'consume' &&
        typedFact.kind !== 'exhausted' &&
        typedFact.record.consumed !== priorRecord.consumed
      )
        return fail('FC-TRUST', 'BOUND_REPLAY_CONSUMPTION_MUTATION');
      if (typedFact.kind === 'complete' && typedFact.record.status !== 'completed')
        return fail('FC-TRUST', 'BOUND_REPLAY_COMPLETION_INVALID');
      if (typedFact.kind === 'exhausted' && typedFact.record.status !== 'exhausted')
        return fail('FC-TRUST', 'BOUND_REPLAY_EXHAUSTION_INVALID');
      if (
        (typedFact.kind === 'progress' || typedFact.kind === 'heartbeat' || typedFact.kind === 'consume') &&
        typedFact.record.status !== 'active'
      )
        return fail('FC-TRUST', 'BOUND_REPLAY_ACTIVE_STATE_INVALID');
    }
    if (
      (typedFact.kind === 'progress' ||
        typedFact.kind === 'heartbeat' ||
        typedFact.kind === 'consume' ||
        typedFact.kind === 'complete' ||
        typedFact.kind === 'exhausted') &&
      typedFact.record.lastFactDigest !== typedFact.factDigest
    )
      return fail('FC-TRUST', 'BOUND_REPLAY_FACT_BINDING_INVALID');
    if (seenFactDigests.has(typedFact.factDigest)) return fail('FC-TRUST', 'BOUND_REPLAY_DUPLICATE_FACT');
    seenFactDigests.add(typedFact.factDigest);
    const recomputed = canonicalDigest('BOUND-FACT', { ...typedFact, contentDigest: '' }, 'contentDigest');
    if (!recomputed.ok || recomputed.value !== typedFact.contentDigest)
      return fail('FC-TRUST', 'BOUND_REPLAY_DIGEST_INVALID');
    priorRecords.set(typedFact.surface, typedFact.record);
    previous = typedFact.contentDigest;
  }
  if (
    (ordered.length === 0 ? GENESIS : previous) !== value.digest ||
    (ordered.length === 0 ? -1 : ordered.length - 1) !== value.position
  )
    return fail('FC-TRUST', 'BOUND_REPLAY_HEAD_MISMATCH');
  return ok(frozen({ schema: BOUNDS_VERSION, position: value.position, digest: value.digest, facts: ordered }));
}

export function startAllBoundSurfaces(
  input: Readonly<{
    subject: BoundSubject;
    generation: string;
    policy: BoundPolicy;
    startedAt: number;
    clock: WitnessedClock;
    factDigestFor: (surface: WaitSurface) => string;
  }>,
): BoundResult<readonly BoundRecord[]> {
  const journal = createBoundJournal();
  const records: BoundRecord[] = [];
  for (const surfaceId of WAIT_SURFACES) {
    const factDigest = input.factDigestFor(surfaceId);
    if (!digest(factDigest)) return fail('FC-INPUT', 'MALFORMED_BOUND_FACT_DIGEST');
    const result = journal.start({ ...input, surface: surfaceId, factDigest });
    if (!result.ok) return result;
    records.push(result.value);
  }
  return ok(records);
}

export function validateSilenceReplacement(
  input: Readonly<{
    subject: BoundSubject;
    generation: string;
    successorGeneration: string;
    attestedLoss: boolean;
    samePrincipal: boolean;
    successorLineage: boolean;
    factDigest: string;
  }>,
): BoundResult<SilenceReplacementGuard> {
  if (
    !validSubject(input.subject) ||
    typeof input.generation !== 'string' ||
    typeof input.successorGeneration !== 'string' ||
    !fixedFactDigest(input.factDigest)
  )
    return fail('FC-INPUT', 'MALFORMED_SILENCE_REPLACEMENT');
  if (input.attestedLoss !== true || input.samePrincipal !== true || input.successorLineage !== true)
    return fail('FC-LIVENESS', 'SILENCE_REPLACEMENT_GUARD_FAILED');
  return ok(
    frozen({
      allowed: true,
      subject: input.subject,
      generation: input.generation,
      successorGeneration: input.successorGeneration,
      factDigest: input.factDigest,
    }),
  );
}

export function classifyLiveness(
  input: Readonly<{
    subject: BoundSubject;
    generation: string;
    at: number;
    idle: BoundRecord;
    silence: BoundRecord;
    observations: readonly LivenessObservation[];
    humanInputOverdue?: boolean;
  }>,
): BoundResult<LivenessClassification> {
  if (
    !validSubject(input.subject) ||
    !nonNegative(input.at) ||
    !validRecord(input.idle) ||
    !validRecord(input.silence) ||
    input.idle.surface !== 'qualifying-progress-idle' ||
    input.silence.surface !== 'session-silence' ||
    input.idle.generation !== input.generation ||
    input.silence.generation !== input.generation ||
    input.observations.some(
      (observation) =>
        !plain(observation) ||
        observation.schema !== BOUNDS_VERSION ||
        observation.event !== 'EV-LIVENESS-OBSERVED' ||
        observation.source !== 'mechanism' ||
        observation.durable !== true ||
        !validSubject(observation.subject) ||
        !equalSubject(observation.subject, input.subject) ||
        observation.generation !== input.generation ||
        !nonNegative(observation.at) ||
        !digest(observation.factDigest),
    )
  )
    return fail('FC-INPUT', 'MALFORMED_LIVENESS_OBSERVATION');
  const base = {
    schema: BOUNDS_VERSION as typeof BOUNDS_VERSION,
    subject: input.subject,
    generation: input.generation,
    at: input.at,
  };
  if (input.humanInputOverdue === true)
    return ok(
      frozen({
        ...base,
        classification: 'human-input-overdue',
        failure: 'FC-LIVENESS',
        reason: 'durable human wait is overdue',
      }),
    );
  const latest = [...input.observations].sort((left, right) => left.at - right.at).at(-1);
  if (latest?.kind === 'terminated' || input.silence.status === 'exhausted' || input.at >= input.silence.deadlineAt)
    return ok(
      frozen({
        ...base,
        classification: 'dead',
        failure: 'FC-LIVENESS',
        reason: 'termination or witnessed silence deadline',
      }),
    );
  if (input.idle.status === 'exhausted' || input.at >= input.idle.deadlineAt)
    return ok(
      frozen({
        ...base,
        classification: 'stuck',
        failure: 'FC-LIVENESS',
        reason: 'no qualifying durable progress within BND-IDLE',
      }),
    );
  return ok(
    frozen({
      ...base,
      classification: 'thinking',
      failure: null,
      reason: 'responsive session has qualifying progress within BND-IDLE',
    }),
  );
}
