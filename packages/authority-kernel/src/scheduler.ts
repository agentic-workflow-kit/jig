import { type CanonicalJson, parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';

export const SCHEDULER_VERSION = 'jig.scheduler.v1';
export const RESERVATION_SCHEMA = 'jig.capacity-reservation.v1';
export const REGISTRY_VERSION = 'jig.registry.v1';
export const CONTROLLER_ROLE = 'RT-CONTROLLER';
export const CAPACITY_RANGE_VERSION = 'jig.capacity-ranges.v1';
export const WAIT_CAPACITY_RANGE_VERSION = 'jig.envelope-bounds.v1';

export const RESOURCE_CLASSES = Object.freeze([
  'RC-ISOLATION',
  'RC-SESSION',
  'RC-IMPL-TURN',
  'RC-REVIEW-TURN',
  'RC-VERIFY',
  'RC-DELIVERY',
  'RC-FINALIZER',
] as const);
export const CONFIGURABLE_RESOURCE_CLASSES = Object.freeze(RESOURCE_CLASSES.slice(0, -1));
export type ResourceClass = (typeof RESOURCE_CLASSES)[number];
export type ConfigurableResourceClass = (typeof CONFIGURABLE_RESOURCE_CLASSES)[number];

export const CAPACITY_LIMITS = Object.freeze({
  'RC-ISOLATION': Object.freeze({ lower: 2, upper: 1_000_000 }),
  'RC-SESSION': Object.freeze({ lower: 2, upper: 1_000_000 }),
  'RC-IMPL-TURN': Object.freeze({ lower: 2, upper: 1_000_000 }),
  'RC-REVIEW-TURN': Object.freeze({ lower: 2, upper: 1_000_000 }),
  'RC-VERIFY': Object.freeze({ lower: 2, upper: 1_000_000 }),
  'RC-DELIVERY': Object.freeze({ lower: 2, upper: 1_000_000 }),
  'RC-FINALIZER': Object.freeze({ lower: 1, upper: 1 }),
} as const);
export const BND_WAIT_CAPACITY = Object.freeze({
  default: 24 * 60 * 60,
  lower: 60 * 60,
  upper: 30 * 24 * 60 * 60,
  unit: 'seconds',
});

export type SchedulerFailureFamily =
  | 'FC-INPUT'
  | 'FC-SUBJECT'
  | 'FC-FENCE'
  | 'FC-CAPACITY'
  | 'FC-TRUST'
  | 'FC-AUTHORITY';
export type SchedulerFailure = Readonly<{ family: SchedulerFailureFamily; code: string }>;
export type SchedulerResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: SchedulerFailure }>;
export type Comparator = Readonly<{ priority: number; ordinal: number; story: string }>;
export type Capacities = Readonly<Record<ResourceClass, number>>;
export type Reserves = Readonly<Record<ConfigurableResourceClass, number>>;
export type Demand = Readonly<Record<ResourceClass, number>>;
export type CapacityPolicy = Readonly<{
  version: typeof CAPACITY_RANGE_VERSION;
  capacities: Capacities;
  reserves: Reserves;
  waitSeconds: number;
  waitRangeVersion: typeof WAIT_CAPACITY_RANGE_VERSION;
  digest: string;
}>;

export type SchedulerStory = Readonly<{
  run: string;
  story: string;
  state:
    | 'Pending'
    | 'Eligible'
    | 'Preparing'
    | 'Implementing'
    | 'Reviewing'
    | 'Reworking'
    | 'Accepted'
    | 'Waiting'
    | 'Finalizing'
    | 'Refreshing'
    | 'RefreshPark'
    | 'Landed'
    | 'Blocked'
    | 'Rejected'
    | 'NotRun'
    | 'Retiring'
    | 'Closed';
  runPhase:
    | 'Received'
    | 'Preflighting'
    | 'Active'
    | 'Parked'
    | 'Interrupted / Recovering'
    | 'Suspended'
    | 'Settling'
    | 'Completed'
    | 'Rejected'
    | 'Stopped';
  dependencies: readonly string[];
  directBlocker: boolean;
  order: Comparator;
  demand: Demand;
  finalizerCandidate: boolean;
  finalizer: FinalizerFacts | null;
}>;
export type FinalizerFacts = Readonly<{
  registry: string;
  target: string;
  candidate: string;
  candidateContentDigest: string;
  eligibilityBasis: string;
  generation: string;
}>;
export type DurableReservation = Readonly<{
  schema: typeof RESERVATION_SCHEMA;
  scheduler: typeof SCHEDULER_VERSION;
  variant: 'reserve' | 'release';
  run: string;
  story: string;
  resource: ResourceClass;
  amount: number;
  comparator: Comparator;
  generation: string;
  authorizingTransition: string;
  releaseTransition?: string;
  releaseOf?: string;
  policyDigest: string;
  position: number;
  previousDigest: string;
  contentDigest: string;
}>;
export type CapacityWait = Readonly<{
  schema: typeof SCHEDULER_VERSION;
  kind: 'admission' | 'finalizer-queue';
  run: string;
  story: string;
  comparator: Comparator;
  resource: ResourceClass;
  startedAt: number;
  deadlineAt: number;
  reason: 'capacity' | 'finalizer-queue';
  exhausted: boolean;
  attribution: 'admission-starvation' | 'finalizer-queue-starvation';
  failure?: Readonly<{ family: 'FC-CAPACITY'; code: 'BND_WAIT_CAPACITY_EXHAUSTED' }>;
}>;
export type AdmissionFact = Readonly<{
  schema: typeof SCHEDULER_VERSION;
  kind: 'admission' | 'wait';
  run: string;
  story: string;
  comparator: Comparator;
  reservations: readonly Readonly<{ resource: ResourceClass; amount: number }>[];
  wait?: CapacityWait;
}>;
export type Schedule = Readonly<{
  schema: typeof SCHEDULER_VERSION;
  run: string;
  admissions: readonly AdmissionFact[];
  waits: readonly CapacityWait[];
  finalizerWaiter: string | null;
  finalizerQueue: readonly CapacityWait[];
  registryWaiters: readonly RegistryWaiterFact[];
  used: Readonly<Record<ResourceClass, number>>;
}>;
export type RegistryWaiterFact = Readonly<{
  schema: typeof SCHEDULER_VERSION;
  registryVersion: typeof REGISTRY_VERSION;
  kind: 'registry-waiter';
  variant: 'waiter';
  registry: string;
  target: string;
  waiter: Readonly<{
    run: string;
    story: string;
    generation: string;
    candidate: string;
    candidateContentDigest: string;
    eligibilityBasis: string;
    comparator: Comparator;
    waitedAt: number;
  }>;
}>;

type RawRecord = Readonly<{
  schema: typeof RESERVATION_SCHEMA;
  scheduler: typeof SCHEDULER_VERSION;
  variant: 'reserve' | 'release';
  run: string;
  story: string;
  resource: ResourceClass;
  amount: number;
  comparator: Comparator;
  generation: string;
  authorizingTransition: string;
  releaseTransition?: string;
  releaseOf?: string;
  policyDigest: string;
  position: number;
  previousDigest: string;
  contentDigest: string;
}>;
export type ReservationLedger = Readonly<{
  snapshot(): SchedulerResult<Readonly<{ position: number; digest: string; records: readonly DurableReservation[] }>>;
  append(
    input: Readonly<{
      expectedPosition: number;
      expectedDigest: string;
      record: Omit<RawRecord, 'position' | 'previousDigest' | 'contentDigest'>;
    }>,
  ): SchedulerResult<DurableReservation>;
  appendBatch(
    input: Readonly<{
      expectedPosition: number;
      expectedDigest: string;
      records: readonly Omit<RawRecord, 'position' | 'previousDigest' | 'contentDigest'>[];
    }>,
  ): SchedulerResult<readonly DurableReservation[]>;
  readback(
    input: Readonly<{ position: number; contentDigest: string }>,
  ): SchedulerResult<
    Readonly<{ kind: 'committed'; record: DurableReservation }> | Readonly<{ kind: 'absent'; position: number }>
  >;
}>;

const GENESIS = '0'.repeat(64);
const fail = <T = never>(family: SchedulerFailureFamily, code: string): SchedulerResult<T> => ({
  ok: false,
  error: { family, code },
});
const ok = <T>(value: T): SchedulerResult<T> => ({ ok: true, value });
const digest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const nonNegative = (value: unknown): value is number => integer(value) && value >= 0;
const compareText = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);
const compareOrder = (left: Comparator, right: Comparator): number =>
  left.priority - right.priority || left.ordinal - right.ordinal || compareText(left.story, right.story);
const transactionMatchesGeneration = (transaction: string, generation: string): boolean =>
  transaction.includes(`/${generation}|`);
const freeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
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
const canonicalDigest = (
  domain: string,
  value: CanonicalJson,
  excludePaths: readonly string[] = ['contentDigest'],
): string | undefined => {
  const staged = stageDigest({ domain, excludePaths, value });
  return staged.ok ? staged.value.digest : undefined;
};

export function compareSchedulerOrder(left: Comparator, right: Comparator): number {
  return compareOrder(left, right);
}

function validComparator(value: unknown, story: string): value is Comparator {
  return (
    plain(value) &&
    exact(value, ['ordinal', 'priority', 'story']) &&
    integer(value.priority) &&
    nonNegative(value.ordinal) &&
    value.story === story
  );
}

function validDemand(value: unknown): value is Demand {
  if (!plain(value) || !exact(value, RESOURCE_CLASSES)) return false;
  return RESOURCE_CLASSES.every((resource) => nonNegative(value[resource]) && value[resource] <= 1_000_000);
}

export function validateCapacityPolicy(value: unknown): SchedulerResult<CapacityPolicy> {
  if (
    !plain(value) ||
    !exact(value, ['capacities', 'digest', 'reserves', 'version', 'waitRangeVersion', 'waitSeconds'])
  )
    return fail('FC-INPUT', 'INVALID_CAPACITY_POLICY');
  const capacities = value.capacities;
  const reserves = value.reserves;
  if (
    !plain(capacities) ||
    !plain(reserves) ||
    !exact(capacities, RESOURCE_CLASSES) ||
    !exact(reserves, CONFIGURABLE_RESOURCE_CLASSES)
  )
    return fail('FC-INPUT', 'INVALID_CAPACITY_POLICY');
  for (const resource of RESOURCE_CLASSES) {
    const limit = CAPACITY_LIMITS[resource];
    const capacity = capacities[resource];
    if (!integer(capacity) || capacity < limit.lower || capacity > limit.upper)
      return fail('FC-INPUT', 'CAPACITY_OUT_OF_RANGE');
    if (resource !== 'RC-FINALIZER') {
      const reserve = reserves[resource];
      if (!integer(reserve) || reserve < 1 || reserve >= capacity) return fail('FC-INPUT', 'RESERVE_OUT_OF_RANGE');
    }
  }
  if (
    value.version !== CAPACITY_RANGE_VERSION ||
    value.waitRangeVersion !== WAIT_CAPACITY_RANGE_VERSION ||
    !integer(value.waitSeconds) ||
    value.waitSeconds < BND_WAIT_CAPACITY.lower ||
    value.waitSeconds > BND_WAIT_CAPACITY.upper ||
    !digest(value.digest)
  )
    return fail('FC-INPUT', 'CAPACITY_POLICY_VERSION_OR_WAIT');
  const expected = capacityPolicyDigest({
    version: value.version as typeof CAPACITY_RANGE_VERSION,
    capacities: capacities as Capacities,
    reserves: reserves as Reserves,
    waitSeconds: value.waitSeconds as number,
    waitRangeVersion: value.waitRangeVersion as typeof WAIT_CAPACITY_RANGE_VERSION,
  });
  return expected === value.digest ? ok(freeze(value as CapacityPolicy)) : fail('FC-INPUT', 'CAPACITY_POLICY_DIGEST');
}

export function capacityPolicyDigest(
  value: Readonly<{
    version: typeof CAPACITY_RANGE_VERSION;
    capacities: Capacities;
    reserves: Reserves;
    waitSeconds: number;
    waitRangeVersion: typeof WAIT_CAPACITY_RANGE_VERSION;
  }>,
): string | undefined {
  return canonicalDigest(
    'SCHEDULER-POLICY',
    {
      version: value.version,
      capacities: value.capacities,
      reserves: value.reserves,
      waitSeconds: value.waitSeconds,
      waitRangeVersion: value.waitRangeVersion,
      digest: '',
    } as unknown as CanonicalJson,
    ['digest'],
  );
}

export function validateCapacityFeasibility(
  policyInput: unknown,
  demandsInput: unknown,
): SchedulerResult<Readonly<{ demand: readonly Demand[] }>> {
  const policy = validateCapacityPolicy(policyInput);
  if (!policy.ok || !Array.isArray(demandsInput) || demandsInput.some((demand) => !validDemand(demand)))
    return fail('FC-INPUT', 'PLAN_FEASIBILITY_INPUT');
  const demands = demandsInput as readonly Demand[];
  for (const demand of demands) {
    for (const resource of RESOURCE_CLASSES) {
      const required = demand[resource];
      const allowed =
        resource === 'RC-FINALIZER'
          ? policy.value.capacities[resource]
          : policy.value.capacities[resource] - policy.value.reserves[resource];
      if (required > allowed) return fail('FC-CAPACITY', 'PLAN_FEASIBILITY_FAILED');
    }
  }
  return ok(freeze({ demand: Object.freeze([...demands]) }));
}

function validStory(value: unknown): value is SchedulerStory {
  if (
    !plain(value) ||
    !exact(value, [
      'dependencies',
      'demand',
      'directBlocker',
      'finalizer',
      'finalizerCandidate',
      'order',
      'run',
      'runPhase',
      'state',
      'story',
    ])
  )
    return false;
  if (
    typeof value.run !== 'string' ||
    typeof value.story !== 'string' ||
    !parseIdentity('ID-RUN', value.run).ok ||
    !parseIdentity('ID-STORY', value.story).ok ||
    !value.story.startsWith(`${value.run}/story/`)
  )
    return false;
  if (
    !Array.isArray(value.dependencies) ||
    value.dependencies.some((dependency) => typeof dependency !== 'string' || !parseIdentity('ID-STORY', dependency).ok)
  )
    return false;
  const finalizer = value.finalizer;
  const validFinalizer =
    plain(finalizer) &&
    exact(finalizer, ['candidate', 'candidateContentDigest', 'eligibilityBasis', 'generation', 'registry', 'target']) &&
    typeof finalizer.registry === 'string' &&
    parseIdentity('ID-REGISTRY', finalizer.registry).ok &&
    typeof finalizer.target === 'string' &&
    parseIdentity('ID-TARGET', finalizer.target).ok &&
    typeof finalizer.candidate === 'string' &&
    parseIdentity('ID-CAND', finalizer.candidate).ok &&
    finalizer.candidate.startsWith(`${value.story}/cand/`) &&
    digest(finalizer.candidateContentDigest) &&
    digest(finalizer.eligibilityBasis) &&
    typeof finalizer.generation === 'string' &&
    parseIdentity('ID-GEN', finalizer.generation).ok &&
    finalizer.generation.startsWith(`${value.run}/gen/`);
  return (
    typeof value.directBlocker === 'boolean' &&
    typeof value.finalizerCandidate === 'boolean' &&
    ((value.finalizerCandidate && validFinalizer) || (!value.finalizerCandidate && finalizer === null)) &&
    validComparator(value.order, value.story) &&
    validDemand(value.demand)
  );
}

function validWait(value: unknown, run: string): value is CapacityWait {
  if (
    !plain(value) ||
    (!exact(value, [
      'attribution',
      'comparator',
      'deadlineAt',
      'exhausted',
      'failure',
      'kind',
      'reason',
      'resource',
      'run',
      'schema',
      'startedAt',
      'story',
    ]) &&
      !exact(value, [
        'attribution',
        'comparator',
        'deadlineAt',
        'exhausted',
        'kind',
        'reason',
        'resource',
        'run',
        'schema',
        'startedAt',
        'story',
      ]))
  )
    return false;
  if (
    value.schema !== SCHEDULER_VERSION ||
    value.run !== run ||
    typeof value.story !== 'string' ||
    !value.story.startsWith(`${run}/story/`) ||
    !parseIdentity('ID-STORY', value.story).ok ||
    !validComparator(value.comparator, value.story) ||
    (value.kind !== 'admission' && value.kind !== 'finalizer-queue') ||
    !RESOURCE_CLASSES.includes(value.resource as ResourceClass) ||
    (value.kind === 'finalizer-queue' && value.resource !== 'RC-FINALIZER') ||
    (value.kind === 'admission' && value.resource === 'RC-FINALIZER') ||
    (value.reason !== 'capacity' && value.reason !== 'finalizer-queue') ||
    (value.kind === 'admission' && value.reason !== 'capacity') ||
    (value.kind === 'finalizer-queue' && value.reason !== 'finalizer-queue') ||
    (value.attribution !== 'admission-starvation' && value.attribution !== 'finalizer-queue-starvation') ||
    (value.kind === 'admission' && value.attribution !== 'admission-starvation') ||
    (value.kind === 'finalizer-queue' && value.attribution !== 'finalizer-queue-starvation') ||
    !nonNegative(value.startedAt) ||
    !nonNegative(value.deadlineAt) ||
    value.deadlineAt < value.startedAt ||
    typeof value.exhausted !== 'boolean'
  )
    return false;
  if ('failure' in value) {
    if (
      !plain(value.failure) ||
      !exact(value.failure, ['code', 'family']) ||
      value.failure.family !== 'FC-CAPACITY' ||
      value.failure.code !== 'BND_WAIT_CAPACITY_EXHAUSTED' ||
      !value.exhausted
    )
      return false;
  }
  return true;
}

function activeReservations(records: readonly DurableReservation[]): SchedulerResult<readonly DurableReservation[]> {
  const active = new Map<string, DurableReservation>();
  let previousDigest = GENESIS;
  for (const [index, record] of records.entries()) {
    if (record.position !== index || record.previousDigest !== previousDigest)
      return fail('FC-TRUST', 'INVALID_RESERVATION_CHAIN');
    const content = reservationContent(
      record as unknown as Omit<RawRecord, 'position' | 'previousDigest' | 'contentDigest'>,
    );
    const expectedDigest = canonicalDigest(
      'CAPACITY-RESERVATION',
      Object.assign({}, content as Record<string, CanonicalJson>, { contentDigest: '' }),
    );
    if (expectedDigest !== record.contentDigest) return fail('FC-TRUST', 'INVALID_RESERVATION_DIGEST');
    previousDigest = record.contentDigest;
    const key = `${record.run}\u0000${record.story}\u0000${record.resource}`;
    if (record.variant === 'reserve') {
      if (active.has(key)) return fail('FC-CAPACITY', 'DUPLICATE_RESERVATION');
      active.set(key, record);
    } else {
      const held = active.get(key);
      if (
        !held ||
        held.amount !== record.amount ||
        held.contentDigest !== (record as DurableReservation & { releaseOf?: string }).releaseOf
      )
        return fail('FC-TRUST', 'INVALID_RELEASE_CHAIN');
      active.delete(key);
    }
  }
  return ok(Object.freeze([...active.values()]));
}

function usedBy(records: readonly DurableReservation[]): Record<ResourceClass, number> {
  const used = Object.fromEntries(RESOURCE_CLASSES.map((resource) => [resource, 0])) as Record<ResourceClass, number>;
  for (const record of records) used[record.resource] += record.amount;
  return used;
}

function feasible(
  policy: CapacityPolicy,
  used: Readonly<Record<ResourceClass, number>>,
  demand: Demand,
): ResourceClass | undefined {
  for (const resource of RESOURCE_CLASSES) {
    const total = used[resource] + demand[resource];
    const allowed =
      resource === 'RC-FINALIZER'
        ? policy.capacities[resource]
        : policy.capacities[resource] - policy.reserves[resource];
    if (total > allowed) return resource;
  }
  return undefined;
}

function waitFor(
  input: SchedulerStory,
  resource: ResourceClass,
  now: number,
  policy: CapacityPolicy,
  existing: readonly CapacityWait[],
  kind: CapacityWait['kind'],
): CapacityWait {
  const prior = existing.find((wait) => wait.story === input.story && wait.kind === kind && wait.resource === resource);
  const startedAt = prior?.startedAt ?? now;
  const deadlineAt = startedAt + policy.waitSeconds * 1000;
  const exhausted = now >= deadlineAt;
  return freeze({
    schema: SCHEDULER_VERSION,
    kind,
    run: input.run,
    story: input.story,
    comparator: input.order,
    resource,
    startedAt,
    deadlineAt,
    reason: kind === 'finalizer-queue' ? 'finalizer-queue' : 'capacity',
    exhausted,
    attribution: kind === 'finalizer-queue' ? 'finalizer-queue-starvation' : 'admission-starvation',
    ...(exhausted ? { failure: { family: 'FC-CAPACITY' as const, code: 'BND_WAIT_CAPACITY_EXHAUSTED' as const } } : {}),
  });
}

function registryWaiter(story: SchedulerStory, wait: CapacityWait): RegistryWaiterFact {
  const finalizer = story.finalizer as FinalizerFacts;
  return freeze({
    schema: SCHEDULER_VERSION,
    registryVersion: REGISTRY_VERSION,
    kind: 'registry-waiter',
    variant: 'waiter',
    registry: finalizer.registry,
    target: finalizer.target,
    waiter: freeze({
      run: story.run,
      story: story.story,
      generation: finalizer.generation,
      candidate: finalizer.candidate,
      candidateContentDigest: finalizer.candidateContentDigest,
      eligibilityBasis: finalizer.eligibilityBasis,
      comparator: story.order,
      waitedAt: wait.startedAt,
    }),
  });
}

function admittedState(story: SchedulerStory, states: ReadonlyMap<string, SchedulerStory>): boolean {
  return story.dependencies.every((dependency) => states.get(dependency)?.state === 'Landed');
}

export function selectSchedule(input: unknown): SchedulerResult<Schedule> {
  if (!plain(input) || !exact(input, ['now', 'policy', 'reservations', 'run', 'stories', 'waits']))
    return fail('FC-INPUT', 'INVALID_SCHEDULER_INPUT');
  const policy = validateCapacityPolicy(input.policy);
  if (
    !policy.ok ||
    typeof input.run !== 'string' ||
    !parseIdentity('ID-RUN', input.run).ok ||
    !integer(input.now) ||
    input.now < 0 ||
    !Array.isArray(input.stories) ||
    !Array.isArray(input.reservations) ||
    !Array.isArray(input.waits)
  )
    return fail('FC-INPUT', 'INVALID_SCHEDULER_INPUT');
  const stories = input.stories as readonly unknown[];
  if (stories.some((story) => !validStory(story) || story.run !== input.run))
    return fail('FC-SUBJECT', 'INVALID_STORY_SNAPSHOT');
  const parsedReservations = input.reservations as readonly unknown[];
  if (parsedReservations.some((record) => !validReservationRecord(record)))
    return fail('FC-TRUST', 'INVALID_RESERVATION_RECORD');
  const waits = input.waits as readonly CapacityWait[];
  if (waits.some((wait) => !validWait(wait, input.run as string))) return fail('FC-TRUST', 'INVALID_CAPACITY_WAIT');
  const stateMap = new Map((stories as readonly SchedulerStory[]).map((story) => [story.story, story]));
  const active = activeReservations(parsedReservations as readonly DurableReservation[]);
  if (!active.ok) return active;
  const used = usedBy(active.value);
  if (RESOURCE_CLASSES.some((resource) => used[resource] > policy.value.capacities[resource]))
    return fail('FC-CAPACITY', 'RESERVATION_OVER_CAPACITY');
  const admissions: AdmissionFact[] = [];
  const capacityWaits: CapacityWait[] = [];
  const eligible = (stories as readonly SchedulerStory[])
    .filter(
      (story) =>
        story.state === 'Eligible' &&
        story.runPhase === 'Active' &&
        !story.directBlocker &&
        admittedState(story, stateMap),
    )
    .sort((left, right) => compareOrder(left.order, right.order));
  for (const story of eligible) {
    const constrained = feasible(policy.value, used, story.demand);
    if (!constrained) {
      for (const resource of RESOURCE_CLASSES) used[resource] += story.demand[resource];
      admissions.push(
        freeze({
          schema: SCHEDULER_VERSION,
          kind: 'admission',
          run: input.run,
          story: story.story,
          comparator: story.order,
          reservations: Object.freeze(
            RESOURCE_CLASSES.filter((resource) => story.demand[resource] > 0).map((resource) => ({
              resource,
              amount: story.demand[resource],
            })),
          ),
        }),
      );
    } else {
      const wait = waitFor(story, constrained, input.now, policy.value, waits, 'admission');
      capacityWaits.push(wait);
      admissions.push(
        freeze({
          schema: SCHEDULER_VERSION,
          kind: 'wait',
          run: input.run,
          story: story.story,
          comparator: story.order,
          reservations: Object.freeze([]),
          wait,
        }),
      );
    }
  }
  const finalizerCandidates = (stories as readonly SchedulerStory[])
    .filter(
      (story) =>
        story.finalizerCandidate &&
        (story.state === 'Accepted' || story.state === 'Waiting') &&
        story.runPhase === 'Active' &&
        !story.directBlocker,
    )
    .sort((left, right) => compareOrder(left.order, right.order));
  const heldFinalizer = active.value.find((record) => record.resource === 'RC-FINALIZER');
  const finalizerQueue: CapacityWait[] = [];
  const registryWaiters: RegistryWaiterFact[] = [];
  let finalizerWaiter: string | null = null;
  if (!heldFinalizer) finalizerWaiter = finalizerCandidates[0]?.story ?? null;
  const queued = heldFinalizer ? finalizerCandidates : finalizerCandidates.slice(finalizerWaiter ? 1 : 0);
  for (const story of finalizerCandidates) {
    const wait = waitFor(story, 'RC-FINALIZER', input.now, policy.value, waits, 'finalizer-queue');
    registryWaiters.push(registryWaiter(story, wait));
  }
  for (const story of queued) {
    const wait = waitFor(story, 'RC-FINALIZER', input.now, policy.value, waits, 'finalizer-queue');
    finalizerQueue.push(wait);
    capacityWaits.push(wait);
  }
  return ok(
    freeze({
      schema: SCHEDULER_VERSION,
      run: input.run,
      admissions: Object.freeze(admissions),
      waits: Object.freeze(capacityWaits),
      finalizerWaiter,
      finalizerQueue: Object.freeze(finalizerQueue),
      registryWaiters: Object.freeze(registryWaiters),
      used: Object.freeze({ ...used }),
    }),
  );
}

function reservationContent(record: Omit<RawRecord, 'position' | 'previousDigest' | 'contentDigest'>): CanonicalJson {
  return {
    schema: record.schema,
    scheduler: record.scheduler,
    variant: record.variant,
    run: record.run,
    story: record.story,
    resource: record.resource,
    amount: record.amount,
    comparator: record.comparator,
    generation: record.generation,
    authorizingTransition: record.authorizingTransition,
    ...(record.releaseTransition ? { releaseTransition: record.releaseTransition } : {}),
    ...(record.releaseOf ? { releaseOf: record.releaseOf } : {}),
    policyDigest: record.policyDigest,
  };
}

function validReservationIntent(
  value: unknown,
): value is Omit<RawRecord, 'position' | 'previousDigest' | 'contentDigest'> {
  if (
    !plain(value) ||
    !exact(value, [
      'amount',
      'authorizingTransition',
      'comparator',
      'generation',
      'policyDigest',
      'resource',
      'run',
      'schema',
      'scheduler',
      'story',
      'variant',
    ])
  )
    return false;
  return (
    value.schema === RESERVATION_SCHEMA &&
    value.scheduler === SCHEDULER_VERSION &&
    value.variant === 'reserve' &&
    typeof value.run === 'string' &&
    typeof value.story === 'string' &&
    parseIdentity('ID-RUN', value.run).ok &&
    parseIdentity('ID-STORY', value.story).ok &&
    value.story.startsWith(`${value.run}/story/`) &&
    typeof value.resource === 'string' &&
    RESOURCE_CLASSES.includes(value.resource as ResourceClass) &&
    integer(value.amount) &&
    value.amount > 0 &&
    validComparator(value.comparator, value.story) &&
    typeof value.generation === 'string' &&
    parseIdentity('ID-GEN', value.generation).ok &&
    value.generation.startsWith(`${value.run}/gen/`) &&
    typeof value.authorizingTransition === 'string' &&
    parseIdentity('ID-TXN', value.authorizingTransition).ok &&
    value.authorizingTransition.startsWith(`${value.run}/txn/`) &&
    transactionMatchesGeneration(value.authorizingTransition, value.generation) &&
    digest(value.policyDigest)
  );
}

type ReservationReleaseIntent = Readonly<
  Omit<RawRecord, 'position' | 'previousDigest' | 'contentDigest' | 'releaseTransition' | 'releaseOf'> & {
    contentDigest: string;
  }
>;
function validReservationRelease(value: unknown): value is ReservationReleaseIntent {
  if (
    !plain(value) ||
    !exact(value, [
      'amount',
      'authorizingTransition',
      'comparator',
      'contentDigest',
      'generation',
      'policyDigest',
      'resource',
      'run',
      'schema',
      'scheduler',
      'story',
      'variant',
    ])
  )
    return false;
  const { contentDigest, ...intent } = value;
  return value.variant === 'reserve' && digest(contentDigest) && validReservationIntent(intent);
}

function validReservationRecord(value: unknown): value is DurableReservation {
  if (
    !plain(value) ||
    ![
      'amount',
      'authorizingTransition',
      'comparator',
      'contentDigest',
      'generation',
      'position',
      'policyDigest',
      'previousDigest',
      'resource',
      'run',
      'schema',
      'scheduler',
      'story',
      'variant',
    ].every((key) => key in value)
  )
    return false;
  const baseKeys = [
    'amount',
    'authorizingTransition',
    'comparator',
    'contentDigest',
    'generation',
    'position',
    'policyDigest',
    'previousDigest',
    'resource',
    'run',
    'schema',
    'scheduler',
    'story',
    'variant',
  ];
  if (!exact(value, value.variant === 'release' ? [...baseKeys, 'releaseOf', 'releaseTransition'] : baseKeys))
    return false;
  return (
    value.schema === RESERVATION_SCHEMA &&
    value.scheduler === SCHEDULER_VERSION &&
    (value.variant === 'reserve' || value.variant === 'release') &&
    typeof value.run === 'string' &&
    typeof value.story === 'string' &&
    parseIdentity('ID-RUN', value.run).ok &&
    parseIdentity('ID-STORY', value.story).ok &&
    value.story.startsWith(`${value.run}/story/`) &&
    typeof value.resource === 'string' &&
    RESOURCE_CLASSES.includes(value.resource as ResourceClass) &&
    integer(value.amount) &&
    value.amount > 0 &&
    validComparator(value.comparator, value.story) &&
    typeof value.generation === 'string' &&
    parseIdentity('ID-GEN', value.generation).ok &&
    value.generation.startsWith(`${value.run}/gen/`) &&
    typeof value.authorizingTransition === 'string' &&
    parseIdentity('ID-TXN', value.authorizingTransition).ok &&
    value.authorizingTransition.startsWith(`${value.run}/txn/`) &&
    transactionMatchesGeneration(value.authorizingTransition, value.generation) &&
    integer(value.position) &&
    value.position >= 0 &&
    digest(value.previousDigest) &&
    digest(value.contentDigest) &&
    digest(value.policyDigest) &&
    (value.variant === 'reserve' ||
      (typeof value.releaseTransition === 'string' &&
        parseIdentity('ID-TXN', value.releaseTransition).ok &&
        value.releaseTransition.startsWith(`${value.run}/txn/`) &&
        transactionMatchesGeneration(value.releaseTransition, value.generation) &&
        digest(value.releaseOf)))
  );
}

function validRegistryWaiterFact(value: unknown, reservation: ReservationIntent): value is RegistryWaiterFact {
  if (
    !plain(value) ||
    !exact(value, ['kind', 'registry', 'registryVersion', 'schema', 'target', 'variant', 'waiter']) ||
    value.schema !== SCHEDULER_VERSION ||
    value.registryVersion !== REGISTRY_VERSION ||
    value.kind !== 'registry-waiter' ||
    value.variant !== 'waiter' ||
    !plain(value.waiter) ||
    !exact(value.waiter, [
      'candidate',
      'candidateContentDigest',
      'comparator',
      'eligibilityBasis',
      'generation',
      'run',
      'story',
      'waitedAt',
    ])
  )
    return false;
  const waiter = value.waiter as Record<string, unknown>;
  return (
    typeof value.registry === 'string' &&
    parseIdentity('ID-REGISTRY', value.registry).ok &&
    typeof value.target === 'string' &&
    parseIdentity('ID-TARGET', value.target).ok &&
    typeof waiter.run === 'string' &&
    typeof waiter.story === 'string' &&
    typeof waiter.generation === 'string' &&
    typeof waiter.candidate === 'string' &&
    waiter.run === reservation.run &&
    waiter.story === reservation.story &&
    waiter.generation === reservation.generation &&
    digest(waiter.candidateContentDigest) &&
    digest(waiter.eligibilityBasis) &&
    validComparator(waiter.comparator, waiter.story) &&
    compareOrder(waiter.comparator, reservation.comparator) === 0 &&
    parseIdentity('ID-CAND', waiter.candidate).ok &&
    waiter.candidate.startsWith(`${waiter.story}/cand/`) &&
    nonNegative(waiter.waitedAt)
  );
}

function requestFields(value: unknown, keys: readonly string[]): Record<string, unknown> | undefined {
  return plain(value) && exact(value, keys) ? value : undefined;
}

export function reserveCapacitySet(
  ledger: ReservationLedger,
  input: unknown,
): SchedulerResult<readonly DurableReservation[]> {
  const raw = requestFields(input, [
    'controller',
    'expectedDigest',
    'expectedPosition',
    'policy',
    'registryWaiter',
    'reservations',
  ]);
  const reservations = raw?.reservations;
  if (
    !raw ||
    raw.controller !== CONTROLLER_ROLE ||
    !integer(raw.expectedPosition) ||
    raw.expectedPosition < -1 ||
    !digest(raw.expectedDigest) ||
    !Array.isArray(reservations) ||
    reservations.length === 0 ||
    reservations.some((reservation) => !validReservationIntent(reservation))
  )
    return fail('FC-INPUT', 'INVALID_RESERVE_SET_REQUEST');
  const parsedReservations = reservations as readonly ReservationIntent[];
  const policy = validateCapacityPolicy(raw.policy);
  if (!policy.ok || parsedReservations.some((reservation) => reservation.policyDigest !== policy.value.digest))
    return fail('FC-INPUT', 'RESERVATION_POLICY_MISMATCH');
  const first = parsedReservations[0] as ReservationIntent;
  const resourceKeys = new Set<ResourceClass>();
  for (const reservation of parsedReservations) {
    if (
      reservation.run !== first.run ||
      reservation.story !== first.story ||
      reservation.generation !== first.generation ||
      reservation.authorizingTransition !== first.authorizingTransition ||
      compareOrder(reservation.comparator, first.comparator) !== 0 ||
      resourceKeys.has(reservation.resource)
    )
      return fail('FC-CAPACITY', 'DUPLICATE_RESERVATION');
    resourceKeys.add(reservation.resource);
  }
  if (first.resource === 'RC-FINALIZER' && !validRegistryWaiterFact(raw.registryWaiter, first))
    return fail('FC-AUTHORITY', 'FINALIZER_WAITER_REQUIRED');
  if (first.resource !== 'RC-FINALIZER' && raw.registryWaiter !== null)
    return fail('FC-INPUT', 'UNEXPECTED_FINALIZER_WAITER');
  const current = ledger.snapshot();
  if (!current.ok) return current;
  if (current.value.position !== raw.expectedPosition || current.value.digest !== raw.expectedDigest)
    return fail('FC-FENCE', 'EXPECTED_HEAD_MISMATCH');
  if (current.value.records.some((record) => record.run !== first.run))
    return fail('FC-SUBJECT', 'CROSS_RUN_RESERVATION');
  if (current.value.records.length > 0 && current.value.records.at(-1)?.generation !== first.generation)
    return fail('FC-FENCE', 'STALE_GENERATION');
  const active = activeReservations(current.value.records);
  if (!active.ok) return active;
  if (
    parsedReservations.some((reservation) =>
      active.value.some(
        (record) =>
          record.run === reservation.run &&
          record.story === reservation.story &&
          record.resource === reservation.resource,
      ),
    )
  )
    return fail('FC-CAPACITY', 'DUPLICATE_RESERVATION');
  const used = usedBy(active.value);
  const requested = Object.fromEntries(RESOURCE_CLASSES.map((resource) => [resource, 0])) as Record<
    ResourceClass,
    number
  >;
  for (const reservation of parsedReservations) requested[reservation.resource] += reservation.amount;
  const blocked = feasible(policy.value, used, requested);
  if (blocked) return fail('FC-CAPACITY', 'CAPACITY_EXCEEDED');
  const appended = ledger.appendBatch({
    expectedPosition: raw.expectedPosition,
    expectedDigest: raw.expectedDigest,
    records: parsedReservations,
  });
  if (appended.ok) return appended;
  return appended.error.family === 'FC-TRUST' && appended.error.code === 'ACK_LOST'
    ? fail('FC-TRUST', 'ACK_LOST_READBACK_REQUIRED')
    : appended;
}

type ReservationIntent = Omit<RawRecord, 'position' | 'previousDigest' | 'contentDigest'>;

export function reserveCapacity(ledger: ReservationLedger, input: unknown): SchedulerResult<DurableReservation> {
  const raw = requestFields(input, ['controller', 'expectedDigest', 'expectedPosition', 'policy', 'reservation']);
  if (
    !raw ||
    raw.controller !== CONTROLLER_ROLE ||
    !integer(raw.expectedPosition) ||
    raw.expectedPosition < -1 ||
    !digest(raw.expectedDigest) ||
    !validReservationIntent(raw.reservation)
  )
    return fail('FC-INPUT', 'INVALID_RESERVE_REQUEST');
  const result = reserveCapacitySet(ledger, {
    controller: raw.controller,
    expectedDigest: raw.expectedDigest,
    expectedPosition: raw.expectedPosition,
    policy: raw.policy,
    registryWaiter: null,
    reservations: [raw.reservation],
  });
  return result.ok ? ok(result.value[0]) : result;
}

export function reserveFinalizerCapacity(
  ledger: ReservationLedger,
  input: unknown,
): SchedulerResult<DurableReservation> {
  const raw = requestFields(input, [
    'controller',
    'expectedDigest',
    'expectedPosition',
    'policy',
    'registryWaiter',
    'reservation',
  ]);
  if (!raw || !validReservationIntent(raw.reservation) || raw.reservation.resource !== 'RC-FINALIZER')
    return fail('FC-INPUT', 'INVALID_FINALIZER_RESERVE_REQUEST');
  const result = reserveCapacitySet(ledger, {
    controller: raw.controller,
    expectedDigest: raw.expectedDigest,
    expectedPosition: raw.expectedPosition,
    policy: raw.policy,
    registryWaiter: raw.registryWaiter,
    reservations: [raw.reservation],
  });
  return result.ok ? ok(result.value[0]) : result;
}

export function releaseCapacity(ledger: ReservationLedger, input: unknown): SchedulerResult<DurableReservation> {
  const raw = requestFields(input, [
    'controller',
    'expectedDigest',
    'expectedPosition',
    'releaseTransition',
    'reservation',
  ]);
  const reservation = raw?.reservation;
  if (
    !raw ||
    raw.controller !== CONTROLLER_ROLE ||
    !integer(raw.expectedPosition) ||
    raw.expectedPosition < -1 ||
    !digest(raw.expectedDigest) ||
    typeof raw.releaseTransition !== 'string' ||
    !parseIdentity('ID-TXN', raw.releaseTransition).ok ||
    !validReservationRelease(reservation)
  )
    return fail('FC-INPUT', 'INVALID_RELEASE_REQUEST');
  const current = ledger.snapshot();
  if (!current.ok) return current;
  if (current.value.position !== raw.expectedPosition || current.value.digest !== raw.expectedDigest)
    return fail('FC-FENCE', 'EXPECTED_HEAD_MISMATCH');
  if (current.value.records.some((record) => record.run !== reservation.run))
    return fail('FC-SUBJECT', 'CROSS_RUN_RESERVATION');
  if (!raw.releaseTransition.startsWith(`${reservation.run}/txn/`)) return fail('FC-SUBJECT', 'CROSS_RUN_RELEASE');
  if (!transactionMatchesGeneration(raw.releaseTransition, reservation.generation))
    return fail('FC-FENCE', 'STALE_GENERATION');
  const active = activeReservations(current.value.records);
  if (!active.ok) return active;
  const held = active.value.find(
    (record) =>
      record.run === reservation.run && record.story === reservation.story && record.resource === reservation.resource,
  );
  if (!held || held.contentDigest !== reservation.contentDigest) return fail('FC-FENCE', 'STALE_RESERVATION');
  const release = {
    ...reservation,
    variant: 'release' as const,
    releaseTransition: raw.releaseTransition,
    releaseOf: held.contentDigest,
  };
  const appended = ledger.append({
    expectedPosition: raw.expectedPosition,
    expectedDigest: raw.expectedDigest,
    record: release,
  });
  return appended;
}

export function createScriptedReservationLedger(
  options: Readonly<{ fault?: 'after-flush' | 'after-witness' }> = {},
): ReservationLedger {
  const records: DurableReservation[] = [];
  let witness: Readonly<{ position: number; digest: string }> = { position: -1, digest: GENESIS };
  const trusted = (): SchedulerResult<void> => {
    const latest = records.at(-1);
    const position = latest?.position ?? -1;
    const digestValue = latest?.contentDigest ?? GENESIS;
    return witness.position === position && witness.digest === digestValue
      ? ok(undefined)
      : fail('FC-TRUST', 'WITNESS_MISMATCH');
  };
  return {
    snapshot() {
      const trust = trusted();
      return trust.ok
        ? ok(freeze({ position: witness.position, digest: witness.digest, records: [...records] }))
        : trust;
    },
    append(input) {
      const appended = this.appendBatch({
        expectedPosition: input.expectedPosition,
        expectedDigest: input.expectedDigest,
        records: [input.record],
      });
      return appended.ok ? ok(appended.value[0]) : appended;
    },
    appendBatch(input) {
      const current = records.at(-1);
      const position = current?.position ?? -1;
      const digestValue = current?.contentDigest ?? GENESIS;
      if (input.expectedPosition !== position || input.expectedDigest !== digestValue)
        return fail('FC-FENCE', 'EXPECTED_HEAD_MISMATCH');
      const created: DurableReservation[] = [];
      let nextPosition = position;
      let nextDigest = digestValue;
      for (const record of input.records) {
        const content = reservationContent(record);
        const contentDigest = canonicalDigest(
          'CAPACITY-RESERVATION',
          Object.assign({}, content as Record<string, CanonicalJson>, { contentDigest: '' }),
        );
        if (!contentDigest) return fail('FC-INPUT', 'RESERVATION_DIGEST');
        const next = freeze({
          ...(record as object),
          position: nextPosition + 1,
          previousDigest: nextDigest,
          contentDigest,
        } as DurableReservation);
        created.push(next);
        nextPosition = next.position;
        nextDigest = next.contentDigest;
      }
      records.push(...created);
      if (options.fault === 'after-flush') return fail('FC-TRUST', 'ACK_LOST');
      const latest = created.at(-1);
      if (!latest) return fail('FC-INPUT', 'EMPTY_RESERVATION_SET');
      witness = { position: latest.position, digest: latest.contentDigest };
      if (options.fault === 'after-witness') return fail('FC-TRUST', 'ACK_LOST');
      return ok(Object.freeze(created));
    },
    readback(input) {
      const trust = trusted();
      if (!trust.ok) return trust;
      const record = records[input.position];
      return record && record.contentDigest === input.contentDigest
        ? ok({ kind: 'committed', record })
        : ok({ kind: 'absent', position: input.position });
    },
  };
}

export function reservationReadback(
  ledger: ReservationLedger,
  input: Readonly<{ position: number; contentDigest: string }>,
): SchedulerResult<DurableReservation> {
  const read = ledger.readback(input);
  if (!read.ok) return read;
  return read.value.kind === 'committed' ? ok(read.value.record) : fail('FC-TRUST', 'RESERVATION_NOT_COMMITTED');
}
