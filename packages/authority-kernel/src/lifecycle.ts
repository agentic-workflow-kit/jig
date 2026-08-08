import {
  type CanonicalJson,
  encodeFrame,
  parseIdentity,
  stageDigest,
  validateStagedDigest,
} from '@agentic-workflow-kit/jig-codec';
import {
  AUTHORITY_KERNEL_VERSION,
  type AuthorityBindings,
  type AuthorityEvent,
  type AuthorityState,
  type OperationIntent,
  reduceAuthority,
  validateAuthorityState,
  validateEvent,
  validateOperation,
} from './index.js';

/** The only lifecycle writer; this module has no port, provider, or dispatch capability. */
export const LIFECYCLE_CONTROLLER = 'RT-CONTROLLER';
export const RUN_BASIS_SCHEMA = 'jig.run-basis.v1';
export const INTAKE_ACK_SCHEMA = 'jig.intake-ack.v1';
export const RUN_GENESIS_SCHEMA = 'jig.run-genesis.v1';
export const LIFECYCLE_TRANSITION_SCHEMA = 'jig.lifecycle-transition.v1';
export const GENERATION_CLAIM_SCHEMA = 'jig.generation-claim.v1';
export const RESUME_INTEGRITY_SCHEMA = 'jig.resume-integrity.v1';
export const LEDGER_RECORD_SCHEMA = 'jig.ledger.v1';

type FailureClass = 'FC-INPUT' | 'FC-SUBJECT' | 'FC-FENCE' | 'FC-AUTHORITY' | 'FC-EVIDENCE' | 'FC-TRUST';
type Failure = Readonly<{ failure: FailureClass; code: string }>;
export type LifecycleResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: Failure }>;

export type DirectBlockerRoot = Readonly<{
  story: string;
  outcome: 'Blocked' | 'Rejected';
  event: string;
}>;
export type OwnerDecision = Readonly<{ kind: 'none' | 'reject-story'; story?: string }>;
export type IntakeAdmission = Readonly<{
  schema: typeof INTAKE_ACK_SCHEMA;
  terminalAck: 'accepted';
  run: string;
  compositionDigest: string;
  acknowledgementDigest: string;
  position: number;
  witnessedHeadDigest: string;
}>;
export type StoryOrder = Readonly<{ priority: number; ordinal: number; story: string }>;
export type StoryBasisFact = Readonly<{
  story: string;
  dependencies: readonly string[];
  initial: AuthorityState;
  order: StoryOrder;
}>;
export type RunBasis = Readonly<{
  schema: typeof RUN_BASIS_SCHEMA;
  controller: typeof LIFECYCLE_CONTROLLER;
  run: string;
  basis: string;
  generation: string;
  intake: IntakeAdmission;
  stories: readonly StoryBasisFact[];
  basisDigest: string;
}>;
export type RunBasisReference = Readonly<{
  run: string;
  basis: string;
  position: number;
  contentDigest: string;
}>;
export type LifecycleTransition = Readonly<{
  schema: typeof LIFECYCLE_TRANSITION_SCHEMA;
  controller: typeof LIFECYCLE_CONTROLLER;
  basis: RunBasisReference;
  previousPosition: number;
  /** Event ordinal. The enclosing ledger record is at position `position - 1`. */
  position: number;
  previous: AuthorityState;
  next: AuthorityState;
  event: AuthorityEvent;
  bindings: AuthorityBindings;
  operations: readonly OperationIntent[];
  directRoots: readonly DirectBlockerRoot[];
  decision: OwnerDecision;
  transitionDigest: string;
}>;
export type RunGenesis = Readonly<{
  schema: typeof RUN_GENESIS_SCHEMA;
  controller: typeof LIFECYCLE_CONTROLLER;
  basis: RunBasis;
  transition: LifecycleTransition;
}>;
export type LifecycleProjection = Readonly<{
  /** Enclosing ledger position, with the witnessed Run-basis record at position zero. */
  position: number;
  headDigest: string;
  basis: RunBasisReference;
  states: Readonly<Record<string, AuthorityState>>;
  directRoots: readonly DirectBlockerRoot[];
  releasedStories: readonly string[];
  transitions: readonly LifecycleTransition[];
  operations: readonly OperationIntent[];
}>;

type LedgerRecord = Readonly<{
  version: typeof LEDGER_RECORD_SCHEMA;
  run: string;
  generation: string;
  transaction: string;
  event: string;
  position: number;
  previousDigest: string;
  content: CanonicalJson;
  contentDigest: string;
}>;
type WitnessLedger = Readonly<{
  readback(
    input: Readonly<{
      binding: Readonly<{ kind: 'run'; run: string; generation: string }>;
      position: number;
      transaction: string;
      contentDigest: string;
    }>,
  ): unknown;
}>;
type IntakeWitness = Readonly<{
  readback(input: Readonly<{ compositionDigest: string }>): unknown;
}>;
export type LifecycleController = Readonly<{
  propose(input: unknown): LifecycleResult<LifecycleTransition>;
  confirm(input: unknown): LifecycleResult<LifecycleTransition>;
}>;

const GENESIS_DIGEST = '0'.repeat(64);
const fail = (failure: FailureClass, code: string): LifecycleResult<never> =>
  Object.freeze({ ok: false, error: Object.freeze({ failure, code }) });
const ok = <T>(value: T): LifecycleResult<T> => Object.freeze({ ok: true, value: freeze(value) });
const digest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
const position = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const compare = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) freeze(child);
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
      Object.keys(descriptors).length !== names.length ||
      !names.every((name) => descriptors[name] !== undefined && 'value' in descriptors[name]) ||
      !Object.keys(descriptors).every((name) => names.includes(name))
    )
      return undefined;
    return Object.freeze(Object.fromEntries(names.map((name) => [name, descriptors[name]?.value])));
  } catch {
    return undefined;
  }
}

function array(value: unknown): readonly unknown[] | undefined {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const length = descriptors.length;
    if (!length || !('value' in length) || !position(length.value)) return undefined;
    if (Object.keys(descriptors).filter((key) => key !== 'length').length !== length.value) return undefined;
    const entries: unknown[] = [];
    for (let index = 0; index < length.value; index += 1) {
      const entry = descriptors[String(index)];
      if (!entry || !('value' in entry)) return undefined;
      entries.push(entry.value);
    }
    return Object.freeze(entries);
  } catch {
    return undefined;
  }
}

function hash(domain: string, value: unknown): string | undefined {
  try {
    const canonical = JSON.parse(JSON.stringify(value)) as CanonicalJson;
    if (!encodeFrame(canonical).ok) return undefined;
    const staged = stageDigest({ domain, excludePaths: [], value: canonical });
    return staged.ok ? staged.value.digest : undefined;
  } catch {
    return undefined;
  }
}

function sameState(left: AuthorityState, right: AuthorityState): boolean {
  return (
    left.storyState === right.storyState &&
    left.runPhase === right.runPhase &&
    left.subject.run === right.subject.run &&
    left.subject.story === right.subject.story &&
    left.subject.basis === right.subject.basis &&
    left.fence.generation === right.fence.generation &&
    left.fence.basis === right.fence.basis &&
    left.catalogVersion === right.catalogVersion
  );
}

function sameBinding(left: AuthorityBindings, right: AuthorityBindings): boolean {
  return hash('LIFECYCLE-BINDING', left) === hash('LIFECYCLE-BINDING', right);
}

function sameRoot(left: DirectBlockerRoot, right: DirectBlockerRoot | undefined): boolean {
  return !!right && left.story === right.story && left.outcome === right.outcome && left.event === right.event;
}

function compareStoryOrder(left: StoryOrder, right: StoryOrder): number {
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

function canonicalRoots(
  value: readonly DirectBlockerRoot[],
  orders: ReadonlyMap<string, StoryOrder>,
): readonly DirectBlockerRoot[] {
  const unique = new Map<string, DirectBlockerRoot>();
  for (const root of value) unique.set(`${root.story}\u0000${root.outcome}\u0000${root.event}`, root);
  return Object.freeze(
    [...unique.values()].sort((left, right) => {
      const leftOrder = orders.get(left.story);
      const rightOrder = orders.get(right.story);
      if (!leftOrder || !rightOrder) return 0;
      return compareStoryOrder(leftOrder, rightOrder);
    }),
  );
}

function parseRoots(value: unknown, run: string): readonly DirectBlockerRoot[] | undefined {
  const entries = array(value);
  if (!entries) return undefined;
  const parsed: DirectBlockerRoot[] = [];
  for (const entry of entries) {
    const root = fields(entry, ['story', 'outcome', 'event']);
    if (
      !root ||
      typeof root.story !== 'string' ||
      typeof root.event !== 'string' ||
      (root.outcome !== 'Blocked' && root.outcome !== 'Rejected') ||
      !parseIdentity('ID-STORY', root.story).ok ||
      !parseIdentity('ID-EVENT', root.event).ok ||
      !root.story.startsWith(`${run}/story/`) ||
      !root.event.startsWith(`${run}/event/`)
    )
      return undefined;
    parsed.push(Object.freeze({ story: root.story, outcome: root.outcome, event: root.event }));
  }
  const keys = new Set(parsed.map((root) => `${root.story}\u0000${root.outcome}\u0000${root.event}`));
  return keys.size === parsed.length ? Object.freeze(parsed) : undefined;
}

function parseDecision(value: unknown, story: string): OwnerDecision | undefined {
  const none = fields(value, ['kind']);
  if (none?.kind === 'none') return Object.freeze({ kind: 'none' });
  const reject = fields(value, ['kind', 'story']);
  return reject?.kind === 'reject-story' && reject.story === story
    ? Object.freeze({ kind: 'reject-story', story })
    : undefined;
}

function validateIntake(value: unknown): IntakeAdmission | undefined {
  const raw = fields(value, [
    'schema',
    'terminalAck',
    'run',
    'compositionDigest',
    'acknowledgementDigest',
    'position',
    'witnessedHeadDigest',
  ]);
  return raw &&
    raw.schema === INTAKE_ACK_SCHEMA &&
    raw.terminalAck === 'accepted' &&
    typeof raw.run === 'string' &&
    digest(raw.compositionDigest) &&
    digest(raw.acknowledgementDigest) &&
    position(raw.position) &&
    digest(raw.witnessedHeadDigest) &&
    parseIdentity('ID-RUN', raw.run).ok
    ? freeze(raw as IntakeAdmission)
    : undefined;
}

function validateStoryOrder(value: unknown, story: string): StoryOrder | undefined {
  const raw = fields(value, ['priority', 'ordinal', 'story']);
  return raw &&
    typeof raw.priority === 'number' &&
    Number.isSafeInteger(raw.priority) &&
    position(raw.ordinal) &&
    raw.story === story
    ? freeze(raw as StoryOrder)
    : undefined;
}

function parseBinding(value: unknown): AuthorityBindings | undefined {
  const basic = fields(value, ['transaction', 'event', 'operation', 'subject', 'fence', 'catalogVersion']);
  if (basic) return basic as AuthorityBindings;
  const operation = fields(value, [
    'transaction',
    'event',
    'operation',
    'subject',
    'fence',
    'catalogVersion',
    'payloadBasisDigest',
    'capability',
    'authority',
    'role',
    'lifecycle',
    'effect',
    'purpose',
    'predecessor',
    'bounds',
  ]);
  return operation as AuthorityBindings | undefined;
}

function transitionDigest(value: Omit<LifecycleTransition, 'transitionDigest'>): string | undefined {
  return hash('LIFECYCLE-TRANSITION', value);
}

function basisReference(basis: RunBasis): RunBasisReference {
  return freeze({ run: basis.run, basis: basis.basis, position: 0, contentDigest: basis.basisDigest });
}

function ledgerRecord(value: unknown, expectedRun?: string): LedgerRecord | undefined {
  const raw = fields(value, [
    'version',
    'run',
    'generation',
    'transaction',
    'event',
    'position',
    'previousDigest',
    'content',
    'contentDigest',
  ]);
  if (
    !raw ||
    raw.version !== LEDGER_RECORD_SCHEMA ||
    typeof raw.run !== 'string' ||
    typeof raw.generation !== 'string' ||
    typeof raw.transaction !== 'string' ||
    typeof raw.event !== 'string' ||
    !position(raw.position) ||
    !digest(raw.previousDigest) ||
    !digest(raw.contentDigest) ||
    (expectedRun !== undefined && raw.run !== expectedRun) ||
    !parseIdentity('ID-RUN', raw.run).ok ||
    !parseIdentity('ID-GEN', raw.generation).ok ||
    !parseIdentity('ID-TXN', raw.transaction).ok ||
    !parseIdentity('ID-EVENT', raw.event).ok ||
    !raw.generation.startsWith(`${raw.run}/gen/`) ||
    !raw.transaction.startsWith(`${raw.run}/txn/${(raw.position as number) + 1}/${raw.generation}|`) ||
    raw.event !== `${raw.run}/event/${(raw.position as number) + 1}` ||
    !encodeFrame(raw.content as CanonicalJson).ok
  )
    return undefined;
  const checked = validateStagedDigest({
    domain: 'LEDGER-RECORD',
    excludePaths: ['contentDigest', 'event'],
    digest: raw.contentDigest as string,
    value: raw as unknown as CanonicalJson,
  });
  return checked.ok ? freeze(raw as LedgerRecord) : undefined;
}

function witnessedLedgerRecord(witness: unknown, expected: LedgerRecord): LifecycleResult<void> {
  let readback: unknown;
  try {
    if (typeof witness !== 'object' || witness === null || typeof (witness as WitnessLedger).readback !== 'function')
      return fail('FC-TRUST', 'RUN_LEDGER_WITNESS_REQUIRED');
    readback = (witness as WitnessLedger).readback({
      binding: { kind: 'run', run: expected.run, generation: expected.generation },
      position: expected.position,
      transaction: expected.transaction,
      contentDigest: expected.contentDigest,
    });
  } catch {
    return fail('FC-TRUST', 'RUN_LEDGER_WITNESS_FAILED');
  }
  const outer = fields(readback, ['ok', 'value']);
  const inner = outer?.ok === true ? fields(outer.value, ['kind', 'record']) : undefined;
  const actual = inner?.kind === 'committed' ? ledgerRecord(inner.record, expected.run) : undefined;
  if (
    !actual ||
    actual.version !== expected.version ||
    actual.run !== expected.run ||
    actual.generation !== expected.generation ||
    actual.transaction !== expected.transaction ||
    actual.event !== expected.event ||
    actual.position !== expected.position ||
    actual.previousDigest !== expected.previousDigest ||
    actual.contentDigest !== expected.contentDigest ||
    hash('LIFECYCLE-LEDGER-CONTENT', actual.content) !== hash('LIFECYCLE-LEDGER-CONTENT', expected.content)
  )
    return fail('FC-TRUST', 'RUN_LEDGER_WITNESS_MISMATCH');
  return ok(undefined);
}

function basisDigest(value: Omit<RunBasis, 'basisDigest'>): string | undefined {
  return hash('RUN-BASIS', value);
}

function validateBasis(value: unknown): RunBasis | undefined {
  const raw = fields(value, ['schema', 'controller', 'run', 'basis', 'generation', 'intake', 'stories', 'basisDigest']);
  const intake = raw && validateIntake(raw.intake);
  const storyValues = raw && array(raw.stories);
  if (
    !raw ||
    raw.schema !== RUN_BASIS_SCHEMA ||
    raw.controller !== LIFECYCLE_CONTROLLER ||
    typeof raw.run !== 'string' ||
    !digest(raw.basis) ||
    typeof raw.generation !== 'string' ||
    !intake ||
    intake.run !== raw.run ||
    !digest(raw.basisDigest) ||
    !storyValues ||
    !parseIdentity('ID-RUN', raw.run).ok ||
    !parseIdentity('ID-GEN', raw.generation).ok ||
    !raw.generation.startsWith(`${raw.run}/gen/`)
  )
    return undefined;
  const stories: StoryBasisFact[] = [];
  for (const entry of storyValues) {
    const item = fields(entry, ['story', 'dependencies', 'initial', 'order']);
    const deps = item && array(item.dependencies);
    const initial = item && validateAuthorityState(item.initial);
    const order = item && validateStoryOrder(item.order, typeof item.story === 'string' ? item.story : '');
    if (
      !item ||
      typeof item.story !== 'string' ||
      !deps ||
      !initial?.ok ||
      !order ||
      item.story !== initial.value.subject.story ||
      !parseIdentity('ID-STORY', item.story).ok ||
      !item.story.startsWith(`${raw.run}/story/`) ||
      initial.value.subject.run !== raw.run ||
      initial.value.subject.basis !== raw.basis ||
      initial.value.fence.basis !== raw.basis ||
      initial.value.fence.generation !== raw.generation ||
      initial.value.catalogVersion !== AUTHORITY_KERNEL_VERSION ||
      initial.value.runPhase !== 'Preflighting' ||
      initial.value.storyState !== 'Pending'
    )
      return undefined;
    const normalizedDeps: string[] = [];
    for (const dependency of deps) {
      if (
        typeof dependency !== 'string' ||
        dependency === item.story ||
        !parseIdentity('ID-STORY', dependency).ok ||
        !dependency.startsWith(`${raw.run}/story/`)
      )
        return undefined;
      normalizedDeps.push(dependency);
    }
    const sortedDeps = [...new Set(normalizedDeps)].sort(compare);
    if (sortedDeps.length !== normalizedDeps.length || sortedDeps.some((dep, index) => dep !== normalizedDeps[index]))
      return undefined;
    stories.push(
      freeze({ story: item.story, dependencies: Object.freeze(normalizedDeps), initial: initial.value, order }),
    );
  }
  const storyIds = new Set(stories.map((story) => story.story));
  if (
    stories.length === 0 ||
    storyIds.size !== stories.length ||
    stories.some((story) => story.dependencies.some((dependency) => !storyIds.has(dependency)))
  )
    return undefined;
  const graph = new Map(stories.map((story) => [story.story, story.dependencies]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const acyclic = (story: string): boolean => {
    if (visiting.has(story)) return false;
    if (visited.has(story)) return true;
    visiting.add(story);
    for (const dependency of graph.get(story) ?? []) if (!acyclic(dependency)) return false;
    visiting.delete(story);
    visited.add(story);
    return true;
  };
  if (stories.some((story) => !acyclic(story.story))) return undefined;
  const candidate = {
    schema: RUN_BASIS_SCHEMA,
    controller: LIFECYCLE_CONTROLLER,
    run: raw.run,
    basis: raw.basis,
    generation: raw.generation,
    intake,
    stories: Object.freeze(stories),
  } as const;
  return basisDigest(candidate) === raw.basisDigest
    ? freeze({ ...candidate, basisDigest: raw.basisDigest })
    : undefined;
}

export function createRunBasis(value: unknown): LifecycleResult<RunBasis> {
  const raw = fields(value, ['run', 'basis', 'generation', 'intake', 'stories']);
  if (!raw) return fail('FC-INPUT', 'RUN_BASIS_SHAPE');
  const stories = array(raw.stories);
  const intake = validateIntake(raw.intake);
  if (!stories || !intake || typeof raw.run !== 'string' || !digest(raw.basis) || typeof raw.generation !== 'string')
    return fail('FC-INPUT', 'RUN_BASIS_VALUE');
  const candidate = {
    schema: RUN_BASIS_SCHEMA,
    controller: LIFECYCLE_CONTROLLER,
    run: raw.run,
    basis: raw.basis,
    generation: raw.generation,
    intake,
    stories,
  } as const;
  const parsed = validateBasis({
    ...candidate,
    stories: stories as readonly StoryBasisFact[],
    basisDigest: basisDigest({ ...candidate, stories: stories as readonly StoryBasisFact[] }),
  });
  return parsed ? ok(parsed) : fail('FC-SUBJECT', 'INVALID_RUN_BASIS');
}

export function validateRunBasis(value: unknown): LifecycleResult<RunBasis> {
  const parsed = validateBasis(value);
  return parsed ? ok(parsed) : fail('FC-INPUT', 'INVALID_RUN_BASIS');
}

function witnessedBasis(
  value: unknown,
  intakeWitness: unknown,
  ledgerWitness: unknown,
): LifecycleResult<
  Readonly<{ carrier: RunBasis; reference: RunBasisReference; record: LedgerRecord; genesis: RunGenesis }>
> {
  const record = ledgerRecord(value);
  const genesis = record && parseGenesis(record.content);
  const carrier = genesis?.basis;
  if (!record) return fail('FC-TRUST', 'RUN_BASIS_NOT_WITNESSED');
  const durable = witnessedLedgerRecord(ledgerWitness, record);
  if (!durable.ok) return fail(durable.error.failure, durable.error.code);
  let intakeReadback: unknown;
  try {
    if (
      typeof intakeWitness !== 'object' ||
      intakeWitness === null ||
      typeof (intakeWitness as IntakeWitness).readback !== 'function'
    )
      return fail('FC-TRUST', 'INTAKE_WITNESS_REQUIRED');
    intakeReadback = (intakeWitness as IntakeWitness).readback({
      compositionDigest: carrier?.intake.compositionDigest ?? '',
    });
  } catch {
    return fail('FC-TRUST', 'INTAKE_WITNESS_FAILED');
  }
  const readback = fields(intakeReadback, ['ok', 'value']);
  const witnessed = readback?.ok === true && fields(readback.value, ['result', 'witnessedHeadDigest']);
  const result =
    witnessed && fields(witnessed.result, ['kind', 'position', 'compositionDigest', 'acknowledgementDigest', 'run']);
  if (
    !carrier ||
    !genesis ||
    record.event !== genesis.transition.event.id ||
    record.transaction !== genesis.transition.bindings.transaction ||
    record.position !== 0 ||
    record.previousDigest !== GENESIS_DIGEST ||
    record.run !== carrier.run ||
    record.generation !== carrier.generation ||
    !carrier.intake ||
    !result ||
    result.kind !== 'acknowledged' ||
    result.position !== carrier.intake.position ||
    result.compositionDigest !== carrier.intake.compositionDigest ||
    result.acknowledgementDigest !== carrier.intake.acknowledgementDigest ||
    result.run !== carrier.run ||
    witnessed.witnessedHeadDigest !== carrier.intake.witnessedHeadDigest
  )
    return fail('FC-TRUST', 'RUN_BASIS_NOT_WITNESSED');
  return ok({
    carrier,
    record,
    reference: basisReference(carrier),
    genesis,
  });
}

function sameBasis(left: RunBasisReference, right: RunBasisReference): boolean {
  return (
    left.run === right.run &&
    left.basis === right.basis &&
    left.position === right.position &&
    left.contentDigest === right.contentDigest
  );
}

function parseTransition(value: unknown): LifecycleTransition | undefined {
  const raw = fields(value, [
    'schema',
    'controller',
    'basis',
    'previousPosition',
    'position',
    'previous',
    'next',
    'event',
    'bindings',
    'operations',
    'directRoots',
    'decision',
    'transitionDigest',
  ]);
  if (
    !raw ||
    raw.schema !== LIFECYCLE_TRANSITION_SCHEMA ||
    raw.controller !== LIFECYCLE_CONTROLLER ||
    !position(raw.previousPosition) ||
    !position(raw.position) ||
    raw.position !== (raw.previousPosition as number) + 1 ||
    !digest(raw.transitionDigest)
  )
    return undefined;
  const previous = validateAuthorityState(raw.previous);
  const next = validateAuthorityState(raw.next);
  const event = validateEvent(raw.event);
  const basis = fields(raw.basis, ['run', 'basis', 'position', 'contentDigest']);
  const bindings = parseBinding(raw.bindings);
  const rawOperations = array(raw.operations);
  const directRoots = previous.ok ? parseRoots(raw.directRoots, previous.value.subject.run) : undefined;
  const decision = previous.ok ? parseDecision(raw.decision, previous.value.subject.story) : undefined;
  if (
    !previous.ok ||
    !next.ok ||
    !event.ok ||
    !basis ||
    typeof basis.run !== 'string' ||
    !digest(basis.basis) ||
    !position(basis.position) ||
    !digest(basis.contentDigest) ||
    !bindings ||
    !rawOperations ||
    !directRoots ||
    !decision
  )
    return undefined;
  if (
    event.value.subject.run !== previous.value.subject.run ||
    event.value.subject.story !== previous.value.subject.story ||
    event.value.subject.basis !== previous.value.subject.basis ||
    next.value.subject.run !== previous.value.subject.run ||
    next.value.subject.story !== previous.value.subject.story ||
    next.value.subject.basis !== previous.value.subject.basis
  )
    return undefined;
  const operations: OperationIntent[] = [];
  for (const rawOperation of rawOperations) {
    const operation = validateOperation(rawOperation);
    if (!operation.ok) return undefined;
    operations.push(operation.value);
  }
  const resume =
    previous.value.runPhase === 'Suspended' &&
    event.value.type === 'EV-RUN-RESUME-DECISION' &&
    (event.value.edge === 'suspended-active' || event.value.edge === 'suspended-parked');
  const reduced = reduceAuthority(
    resume ? { ...previous.value, fence: bindings.fence } : previous.value,
    event.value,
    bindings,
  );
  if (!reduced.ok) return undefined;
  if (
    (!resume &&
      (!sameState(reduced.value.next, next.value) ||
        reduced.value.operations.length !== operations.length ||
        reduced.value.operations.some(
          (operation, index) =>
            hash('LIFECYCLE-OPERATION', operation) !== hash('LIFECYCLE-OPERATION', operations[index]),
        ))) ||
    (resume &&
      (next.value.storyState !== previous.value.storyState ||
        next.value.runPhase !== (event.value.edge === 'suspended-active' ? 'Active' : 'Parked') ||
        next.value.fence.generation !== bindings.fence.generation))
  )
    return undefined;
  const normalized = {
    schema: LIFECYCLE_TRANSITION_SCHEMA,
    controller: LIFECYCLE_CONTROLLER,
    basis: freeze({ run: basis.run, basis: basis.basis, position: basis.position, contentDigest: basis.contentDigest }),
    previousPosition: raw.previousPosition,
    position: raw.position,
    previous: previous.value,
    next: next.value,
    event: event.value,
    bindings,
    operations: Object.freeze(operations),
    directRoots,
    decision,
  } as const;
  return transitionDigest(normalized) === raw.transitionDigest
    ? freeze({ ...normalized, transitionDigest: raw.transitionDigest as string })
    : undefined;
}

function parseGenesis(value: unknown): RunGenesis | undefined {
  const raw = fields(value, ['schema', 'controller', 'basis', 'transition']);
  const basis = raw && validateBasis(raw.basis);
  const transition = raw && parseTransition(raw.transition);
  const first = basis?.stories.slice().sort((left, right) => compareStoryOrder(left.order, right.order))[0];
  if (
    !raw ||
    raw.schema !== RUN_GENESIS_SCHEMA ||
    raw.controller !== LIFECYCLE_CONTROLLER ||
    !basis ||
    !transition ||
    !first ||
    !sameBasis(transition.basis, basisReference(basis)) ||
    transition.previousPosition !== 0 ||
    transition.position !== 1 ||
    transition.event.id !== `${basis.run}/event/1` ||
    transition.event.type !== 'EV-ENVELOPE-SUBMITTED' ||
    transition.event.edge !== 'preflighting-active' ||
    transition.event.subject.story !== first.story ||
    transition.previous.storyState !== 'Pending' ||
    transition.previous.runPhase !== 'Preflighting' ||
    transition.next.storyState !== 'Pending' ||
    transition.next.runPhase !== 'Active' ||
    transition.bindings.transaction !== `${basis.run}/txn/1/${basis.generation}|${basis.basis}` ||
    transition.bindings.event !== transition.event.id ||
    transition.bindings.fence.generation !== basis.generation ||
    transition.bindings.fence.basis !== basis.basis ||
    transition.directRoots.length !== 0 ||
    transition.operations.length !== 0 ||
    transition.decision.kind !== 'none'
  )
    return undefined;
  const initial = basis.stories.find((story) => story.story === first.story)?.initial;
  return initial && sameState(transition.previous, initial)
    ? freeze({ schema: raw.schema, controller: raw.controller, basis, transition })
    : undefined;
}

function genesisTransition(basis: RunBasis): LifecycleResult<LifecycleTransition> {
  const first = basis.stories.slice().sort((left, right) => compareStoryOrder(left.order, right.order))[0];
  if (!first) return fail('FC-INPUT', 'RUN_GENESIS_STORY_REQUIRED');
  const event = {
    type: 'EV-ENVELOPE-SUBMITTED',
    edge: 'preflighting-active',
    id: `${basis.run}/event/1`,
    subject: first.initial.subject,
    fence: { generation: basis.generation, basis: basis.basis },
    catalogVersion: AUTHORITY_KERNEL_VERSION,
  } as const;
  const bindings = {
    transaction: `${basis.run}/txn/1/${basis.generation}|${basis.basis}`,
    event: event.id,
    operation: `${basis.run}/txn/1/${basis.generation}|${basis.basis}/op/1`,
    subject: first.initial.subject,
    fence: { generation: basis.generation, basis: basis.basis },
    catalogVersion: AUTHORITY_KERNEL_VERSION,
  } as const;
  const reduced = reduceAuthority(first.initial, event, bindings);
  if (!reduced.ok) return fail('FC-AUTHORITY', 'RUN_GENESIS_CATALOGUE_GUARD');
  const candidate = {
    schema: LIFECYCLE_TRANSITION_SCHEMA,
    controller: LIFECYCLE_CONTROLLER,
    basis: basisReference(basis),
    previousPosition: 0,
    position: 1,
    previous: first.initial,
    next: reduced.value.next,
    event,
    bindings: reduced.value.bindings,
    operations: reduced.value.operations,
    directRoots: Object.freeze([]),
    decision: { kind: 'none' },
  } as const;
  const transitionDigestValue = transitionDigest(candidate);
  return transitionDigestValue
    ? ok({ ...candidate, transitionDigest: transitionDigestValue })
    : fail('FC-INPUT', 'RUN_GENESIS_DIGEST');
}

function validateGenesis(value: unknown): LifecycleResult<RunGenesis> {
  const parsed = parseGenesis(value);
  return parsed ? ok(parsed) : fail('FC-INPUT', 'INVALID_RUN_GENESIS');
}

export function validateLifecycleTransition(value: unknown): LifecycleResult<LifecycleTransition> {
  const parsed = parseTransition(value);
  return parsed ? ok(parsed) : fail('FC-INPUT', 'INVALID_LIFECYCLE_RECORD');
}

export function createRunGenesis(value: unknown): LifecycleResult<RunGenesis> {
  const raw = fields(value, ['basis']);
  const basis = raw && validateBasis(raw.basis);
  if (!basis) return fail('FC-INPUT', 'RUN_GENESIS_BASIS');
  const transition = genesisTransition(basis);
  if (!transition.ok) return transition;
  const genesis = { schema: RUN_GENESIS_SCHEMA, controller: LIFECYCLE_CONTROLLER, basis, transition: transition.value };
  return validateGenesis(genesis);
}

function generationOrdinal(value: string): number | undefined {
  const found = /\/gen\/([0-9]+)\|/u.exec(value)?.[1];
  return found === undefined ? undefined : Number(found);
}
function generationClaim(value: LedgerRecord, run: string, basis: string): boolean {
  const raw = fields(value.content, ['schema', 'run', 'basis', 'generation', 'token']);
  return (
    !!raw &&
    raw.schema === GENERATION_CLAIM_SCHEMA &&
    raw.run === run &&
    raw.basis === basis &&
    raw.generation === value.generation &&
    digest(raw.token)
  );
}
function resumeIntegrity(
  value: LedgerRecord,
  run: string,
  basis: string,
  oldGeneration: string,
  newGeneration: string,
  head: Readonly<{ position: number; digest: string }>,
): boolean {
  const raw = fields(value.content, ['schema', 'run', 'basis', 'oldGeneration', 'newGeneration', 'head']);
  const recordedHead = raw && fields(raw.head, ['position', 'digest']);
  return (
    !!raw &&
    raw.schema === RESUME_INTEGRITY_SCHEMA &&
    raw.run === run &&
    raw.basis === basis &&
    raw.oldGeneration === oldGeneration &&
    raw.newGeneration === newGeneration &&
    value.generation === newGeneration &&
    !!recordedHead &&
    recordedHead.position === head.position &&
    recordedHead.digest === head.digest
  );
}

function expectedRoots(
  story: string,
  graph: ReadonlyMap<string, StoryBasisFact>,
  rootsByStory: ReadonlyMap<string, readonly DirectBlockerRoot[]>,
): readonly DirectBlockerRoot[] {
  return canonicalRoots(
    (graph.get(story)?.dependencies ?? []).flatMap((dependency) => rootsByStory.get(dependency) ?? []),
    new Map([...graph.values()].map((fact) => [fact.story, fact.order])),
  );
}

function stateMap(basis: RunBasis): Map<string, AuthorityState> {
  return new Map(basis.stories.map((story) => [story.story, story.initial]));
}

function rootMapFromTransitions(
  transitions: readonly LifecycleTransition[],
): Map<string, readonly DirectBlockerRoot[]> {
  const roots = new Map<string, readonly DirectBlockerRoot[]>();
  for (const transition of transitions) {
    if (transition.next.storyState === 'Blocked' || transition.next.storyState === 'Rejected')
      roots.set(
        transition.next.subject.story,
        Object.freeze([
          Object.freeze({
            story: transition.next.subject.story,
            outcome: transition.next.storyState,
            event: transition.event.id,
          }),
        ]),
      );
    else if (transition.next.storyState === 'NotRun') roots.set(transition.next.subject.story, transition.directRoots);
  }
  return roots;
}

function validateProjectionTransition(
  transition: LifecycleTransition,
  ledger: LedgerRecord,
  reference: RunBasisReference,
  states: ReadonlyMap<string, AuthorityState>,
  graph: ReadonlyMap<string, StoryBasisFact>,
  rootsByStory: ReadonlyMap<string, readonly DirectBlockerRoot[]>,
  currentPhase: string,
  currentGeneration: string,
  claim: LedgerRecord | undefined,
  integrity: LedgerRecord | undefined,
): LifecycleResult<void> {
  const current = states.get(transition.previous.subject.story);
  if (
    !current ||
    !sameBasis(transition.basis, reference) ||
    transition.previousPosition !== ledger.position ||
    transition.position !== ledger.position + 1 ||
    transition.event.id !== ledger.event ||
    transition.bindings.transaction !== ledger.transaction ||
    transition.previous.subject.run !== reference.run ||
    transition.previous.subject.basis !== reference.basis ||
    !sameState(current, transition.previous)
  )
    return fail('FC-SUBJECT', 'STALE_OR_CROSS_SUBJECT_RECORD');
  const resume =
    transition.previous.runPhase === 'Suspended' &&
    transition.event.type === 'EV-RUN-RESUME-DECISION' &&
    (transition.event.edge === 'suspended-active' || transition.event.edge === 'suspended-parked');
  if (
    !resume &&
    (ledger.generation !== currentGeneration ||
      transition.event.fence.generation !== currentGeneration ||
      transition.bindings.fence.generation !== currentGeneration)
  )
    return fail('FC-FENCE', 'STALE_POSITION_OR_GENERATION');
  if (resume) {
    const oldOrdinal = generationOrdinal(currentGeneration);
    const newOrdinal = generationOrdinal(ledger.generation);
    if (
      !claim ||
      !integrity ||
      !generationClaim(claim, reference.run, reference.basis) ||
      !resumeIntegrity(integrity, reference.run, reference.basis, currentGeneration, ledger.generation, {
        position: claim.position,
        digest: claim.contentDigest,
      }) ||
      oldOrdinal === undefined ||
      newOrdinal === undefined ||
      newOrdinal <= oldOrdinal ||
      transition.event.fence.generation !== ledger.generation ||
      transition.bindings.fence.generation !== ledger.generation ||
      transition.next.fence.generation !== ledger.generation ||
      transition.next.storyState !== transition.previous.storyState ||
      transition.next.runPhase !== (transition.event.edge === 'suspended-active' ? 'Active' : 'Parked')
    )
      return fail('FC-FENCE', 'RC_RESUME_INTEGRITY_REQUIRED');
  } else {
    const reduced = reduceAuthority(transition.previous, transition.event, transition.bindings);
    if (
      !reduced.ok ||
      !sameState(reduced.value.next, transition.next) ||
      !sameBinding(reduced.value.bindings, transition.bindings) ||
      reduced.value.operations.length !== transition.operations.length ||
      reduced.value.operations.some(
        (operation, index) =>
          hash('LIFECYCLE-OPERATION', operation) !== hash('LIFECYCLE-OPERATION', transition.operations[index]),
      )
    )
      return fail('FC-AUTHORITY', 'CATALOGUE_CLOSURE');
  }
  if (currentPhase === 'Suspended') {
    const allowed =
      resume ||
      (transition.next.storyState === transition.previous.storyState &&
        transition.next.runPhase === 'Suspended' &&
        (transition.event.type === 'EV-RECOVERY-OBSERVATION' || transition.event.type === 'EV-EFFECT-CERTAINTY')) ||
      (transition.next.storyState === transition.previous.storyState &&
        transition.next.runPhase === 'Stopped' &&
        transition.event.type === 'EV-RUN-TERMINAL-STOP-DECISION');
    if (!allowed) return fail('FC-AUTHORITY', 'RUN_DISPATCH_FENCED');
  }
  if (
    currentPhase === 'Stopped' &&
    (transition.next.storyState !== transition.previous.storyState || transition.next.runPhase !== 'Stopped')
  )
    return fail('FC-AUTHORITY', 'RUN_DISPATCH_FENCED');
  if (transition.next.storyState === 'Landed') return fail('FC-AUTHORITY', 'LANDING_PROOF_UNAVAILABLE');
  const dependencies = graph.get(transition.previous.subject.story)?.dependencies ?? [];
  if (transition.previous.storyState === 'Pending' && transition.next.storyState === 'Eligible') {
    if (
      transition.event.type !== 'EV-WAKE-DEPENDENCY' ||
      dependencies.some((dependency) => states.get(dependency)?.storyState !== 'Landed') ||
      transition.directRoots.length !== 0
    )
      return fail('FC-EVIDENCE', 'ELIGIBILITY_REQUIRES_CONFIRMED_LANDING');
  } else if (transition.previous.storyState === 'Pending' && transition.next.storyState === 'NotRun') {
    const expected = expectedRoots(transition.previous.subject.story, graph, rootsByStory);
    if (
      transition.event.type !== 'EV-WAKE-DEPENDENCY' ||
      expected.length === 0 ||
      expected.length !== transition.directRoots.length ||
      !expected.every((root, index) => sameRoot(root, transition.directRoots[index]))
    )
      return fail('FC-EVIDENCE', 'NOT_RUN_REQUIRES_CANONICAL_DIRECT_ROOTS');
  } else if (transition.directRoots.length !== 0) return fail('FC-INPUT', 'UNEXPECTED_DIRECT_ROOTS');
  if (
    (transition.next.storyState === 'Rejected' &&
      (transition.event.type !== 'EV-OWNER-DECISION' ||
        transition.decision.kind !== 'reject-story' ||
        transition.decision.story !== transition.previous.subject.story)) ||
    (transition.next.storyState !== 'Rejected' && transition.decision.kind !== 'none')
  )
    return fail('FC-AUTHORITY', 'EXACT_OWNER_DECISION_REQUIRED');
  return ok(undefined);
}

export function projectLifecycle(input: unknown): LifecycleResult<LifecycleProjection> {
  try {
    const raw = fields(input, ['basisRecord', 'records', 'intakeWitness', 'ledger']);
    const records = raw && array(raw.records);
    const basisResult = raw && witnessedBasis(raw.basisRecord, raw.intakeWitness, raw.ledger);
    if (!raw || !records || !basisResult?.ok) return fail('FC-INPUT', 'LIFECYCLE_PROJECTION_SHAPE');
    const basis = basisResult.value.carrier;
    const reference = basisResult.value.reference;
    const graph = new Map(basis.stories.map((story) => [story.story, story]));
    const states = stateMap(basis);
    const rootsByStory = new Map<string, readonly DirectBlockerRoot[]>();
    const accepted: LifecycleTransition[] = [];
    const operations: OperationIntent[] = [];
    let expectedPosition = 1;
    let previousDigest = basisResult.value.record.contentDigest;
    let currentPhase = basis.stories[0]?.initial.runPhase ?? 'Received';
    let currentGeneration = basis.generation;
    let claim: LedgerRecord | undefined;
    let integrity: LedgerRecord | undefined;
    const genesisValid = validateProjectionTransition(
      basisResult.value.genesis.transition,
      basisResult.value.record,
      reference,
      states,
      graph,
      rootsByStory,
      currentPhase,
      currentGeneration,
      undefined,
      undefined,
    );
    if (!genesisValid.ok) return genesisValid;
    const genesis = basisResult.value.genesis.transition;
    if (genesis.next.runPhase !== genesis.previous.runPhase) {
      if (genesis.next.storyState !== genesis.previous.storyState)
        return fail('FC-SUBJECT', 'RUN_OVERLAY_MUTATED_STORY');
      for (const [story, state] of states)
        states.set(story, freeze({ ...state, runPhase: genesis.next.runPhase, fence: genesis.next.fence }));
      currentPhase = genesis.next.runPhase;
      currentGeneration = genesis.next.fence.generation;
    } else states.set(genesis.next.subject.story, genesis.next);
    accepted.push(genesis);
    operations.push(...genesis.operations);
    for (const rawRecord of records) {
      const ledger = ledgerRecord(rawRecord, basis.run);
      if (!ledger || ledger.position !== expectedPosition || ledger.previousDigest !== previousDigest)
        return fail('FC-TRUST', 'UNVERIFIED_ORDERED_LEDGER_PREFIX');
      const durable = witnessedLedgerRecord(raw.ledger, ledger);
      if (!durable.ok) return fail(durable.error.failure, durable.error.code);
      if (generationClaim(ledger, basis.run, basis.basis)) {
        if (claim || integrity) return fail('FC-FENCE', 'DUPLICATE_GENERATION_CLAIM');
        const oldOrdinal = generationOrdinal(currentGeneration);
        const newOrdinal = generationOrdinal(ledger.generation);
        if (oldOrdinal === undefined || newOrdinal === undefined || newOrdinal <= oldOrdinal)
          return fail('FC-FENCE', 'INVALID_GENERATION_CLAIM');
        claim = ledger;
        integrity = undefined;
      } else if (
        claim &&
        !integrity &&
        resumeIntegrity(ledger, basis.run, basis.basis, currentGeneration, claim.generation, {
          position: claim.position,
          digest: claim.contentDigest,
        })
      ) {
        integrity = ledger;
      } else if (claim && !integrity) {
        return fail('FC-FENCE', 'RC_RESUME_INTEGRITY_REQUIRED');
      } else {
        const lifecycle = parseTransition(ledger.content);
        if (!lifecycle) return fail('FC-INPUT', 'INVALID_LIFECYCLE_RECORD');
        const valid = validateProjectionTransition(
          lifecycle,
          ledger,
          reference,
          states,
          graph,
          rootsByStory,
          currentPhase,
          currentGeneration,
          claim,
          integrity,
        );
        if (!valid.ok) return valid;
        if (lifecycle.next.storyState === 'Blocked' || lifecycle.next.storyState === 'Rejected')
          rootsByStory.set(
            lifecycle.next.subject.story,
            Object.freeze([
              Object.freeze({
                story: lifecycle.next.subject.story,
                outcome: lifecycle.next.storyState,
                event: lifecycle.event.id,
              }),
            ]),
          );
        else if (lifecycle.next.storyState === 'NotRun')
          rootsByStory.set(lifecycle.next.subject.story, lifecycle.directRoots);
        if (lifecycle.next.runPhase !== lifecycle.previous.runPhase) {
          if (lifecycle.next.storyState !== lifecycle.previous.storyState)
            return fail('FC-SUBJECT', 'RUN_OVERLAY_MUTATED_STORY');
          for (const [story, state] of states)
            states.set(story, freeze({ ...state, runPhase: lifecycle.next.runPhase, fence: lifecycle.next.fence }));
          currentPhase = lifecycle.next.runPhase;
          currentGeneration = lifecycle.next.fence.generation;
        } else states.set(lifecycle.next.subject.story, lifecycle.next);
        accepted.push(lifecycle);
        operations.push(...lifecycle.operations);
        claim = undefined;
        integrity = undefined;
      }
      expectedPosition += 1;
      previousDigest = ledger.contentDigest;
    }
    return ok({
      position: expectedPosition - 1,
      headDigest: previousDigest,
      basis: reference,
      states: Object.freeze(Object.fromEntries([...states.entries()].sort(([left], [right]) => compare(left, right)))),
      directRoots: canonicalRoots(
        [...rootsByStory.values()].flat(),
        new Map(basis.stories.map((story) => [story.story, story.order])),
      ),
      releasedStories: Object.freeze(
        [...states.values()]
          .filter((state) => state.storyState === 'Landed')
          .map((state) => state.subject.story)
          .sort(compare),
      ),
      transitions: Object.freeze(accepted),
      operations: Object.freeze(operations),
    });
  } catch {
    return fail('FC-INPUT', 'LIFECYCLE_PROJECTION_INPUT');
  }
}

function transitionLedgerDigest(candidate: LifecycleTransition, previousDigest: string): string | undefined {
  try {
    const value = {
      version: LEDGER_RECORD_SCHEMA,
      run: candidate.basis.run,
      generation: candidate.bindings.fence.generation,
      transaction: candidate.bindings.transaction,
      event: candidate.event.id,
      position: candidate.position - 1,
      previousDigest,
      content: candidate,
      contentDigest: '',
    } as unknown as CanonicalJson;
    const staged = stageDigest({ domain: 'LEDGER-RECORD', excludePaths: ['contentDigest', 'event'], value });
    return staged.ok ? staged.value.digest : undefined;
  } catch {
    return undefined;
  }
}

export function createLifecycleController(input: unknown): LifecycleResult<LifecycleController> {
  const raw = fields(input, ['basisRecord', 'records', 'ledger', 'intakeWitness']);
  if (!raw || typeof raw.ledger !== 'object' || raw.ledger === null) return fail('FC-INPUT', 'CONTROLLER_INIT');
  const projection = projectLifecycle({
    basisRecord: raw.basisRecord,
    records: raw.records,
    intakeWitness: raw.intakeWitness,
    ledger: raw.ledger,
  });
  if (!projection.ok) return projection;
  const basisResult = witnessedBasis(raw.basisRecord, raw.intakeWitness, raw.ledger);
  const sourceRecords = array(raw.records);
  if (!basisResult?.ok || !sourceRecords) return fail('FC-TRUST', 'CONTROLLER_PREFIX_UNVERIFIED');
  const basis = basisResult.value;
  return ok({
    propose(value) {
      const draft = fields(value, ['event', 'bindings', 'decision']);
      if (!draft) return fail('FC-INPUT', 'CONTROLLER_PROPOSAL_SHAPE');
      const event = validateEvent(draft.event);
      const bindings = parseBinding(draft.bindings);
      if (!event.ok || !bindings) return fail('FC-INPUT', 'CONTROLLER_PROPOSAL_VALUE');
      const current = projection.value.states[event.value.subject.story];
      if (!current) return fail('FC-SUBJECT', 'UNKNOWN_STORY');
      const resume =
        current.runPhase === 'Suspended' &&
        event.value.type === 'EV-RUN-RESUME-DECISION' &&
        (event.value.edge === 'suspended-active' || event.value.edge === 'suspended-parked');
      const reduced = resume
        ? reduceAuthority({ ...current, fence: bindings.fence }, event.value, bindings)
        : reduceAuthority(current, event.value, bindings);
      if (!reduced.ok)
        return fail(reduced.error.failure === 'FC-FENCE' ? 'FC-FENCE' : 'FC-AUTHORITY', 'CATALOGUE_GUARD');
      if (resume) {
        const oldOrdinal = generationOrdinal(current.fence.generation);
        const newOrdinal = generationOrdinal(reduced.value.next.fence.generation);
        if (
          oldOrdinal === undefined ||
          newOrdinal === undefined ||
          newOrdinal <= oldOrdinal ||
          reduced.value.next.storyState !== current.storyState
        )
          return fail('FC-FENCE', 'RC_RESUME_INTEGRITY_REQUIRED');
      }
      const decision = parseDecision(draft.decision, current.subject.story);
      if (!decision) return fail('FC-INPUT', 'CONTROLLER_DECISION_SHAPE');
      const graph = new Map(basis.carrier.stories.map((story) => [story.story, story]));
      const roots = rootMapFromTransitions(projection.value.transitions);
      const directRoots =
        reduced.value.next.storyState === 'NotRun' ? expectedRoots(current.subject.story, graph, roots) : [];
      const candidate = {
        schema: LIFECYCLE_TRANSITION_SCHEMA,
        controller: LIFECYCLE_CONTROLLER,
        basis: basis.reference,
        previousPosition: projection.value.position + 1,
        position: projection.value.position + 2,
        previous: current,
        next: reduced.value.next,
        event: event.value,
        bindings: reduced.value.bindings,
        operations: reduced.value.operations,
        directRoots: Object.freeze(directRoots),
        decision,
      } as const;
      const transitionDigestValue = transitionDigest(candidate);
      if (!transitionDigestValue) return fail('FC-INPUT', 'CONTROLLER_DIGEST');
      const authoritative = { ...candidate, transitionDigest: transitionDigestValue };
      const recordDigest = transitionLedgerDigest(authoritative, projection.value.headDigest);
      const semanticRecord =
        recordDigest &&
        ledgerRecord(
          {
            version: LEDGER_RECORD_SCHEMA,
            run: authoritative.basis.run,
            generation: authoritative.bindings.fence.generation,
            transaction: authoritative.bindings.transaction,
            event: authoritative.event.id,
            position: authoritative.position - 1,
            previousDigest: projection.value.headDigest,
            content: authoritative,
            contentDigest: recordDigest,
          },
          authoritative.basis.run,
        );
      if (!semanticRecord) return fail('FC-AUTHORITY', 'CATALOGUE_GUARD');
      const semantic = validateProjectionTransition(
        authoritative,
        semanticRecord,
        basis.reference,
        new Map(Object.entries(projection.value.states)),
        graph,
        roots,
        Object.values(projection.value.states)[0]?.runPhase ?? 'Received',
        current.fence.generation,
        undefined,
        undefined,
      );
      return semantic.ok ? ok(authoritative) : semantic;
    },
    confirm(value) {
      const confirmation = fields(value, ['record']);
      const candidate = confirmation && parseTransition(confirmation.record);
      if (
        !candidate ||
        !sameBasis(candidate.basis, basis.reference) ||
        candidate.previousPosition !== projection.value.position + 1 ||
        candidate.position !== projection.value.position + 2
      )
        return fail('FC-INPUT', 'CONFIRMATION_SHAPE');
      const recordDigest = transitionLedgerDigest(candidate, projection.value.headDigest);
      if (!recordDigest) return fail('FC-INPUT', 'LEDGER_RECORD_DIGEST');
      let readback: unknown;
      try {
        readback = (raw.ledger as WitnessLedger).readback({
          binding: { kind: 'run', run: basis.carrier.run, generation: candidate.bindings.fence.generation },
          position: candidate.position - 1,
          transaction: candidate.bindings.transaction,
          contentDigest: recordDigest,
        });
      } catch {
        return fail('FC-TRUST', 'WITNESS_READBACK_FAILED');
      }
      const result = fields(readback, ['ok', 'value']);
      const readValue =
        result?.ok === true && typeof result.value === 'object' && result.value !== null
          ? fields(result.value, ['kind', 'record'])
          : undefined;
      const durable = readValue?.kind === 'committed' ? ledgerRecord(readValue.record, basis.carrier.run) : undefined;
      if (
        !durable ||
        durable.position !== candidate.position - 1 ||
        durable.previousDigest !== projection.value.headDigest ||
        durable.transaction !== candidate.bindings.transaction ||
        durable.event !== candidate.event.id ||
        durable.generation !== candidate.bindings.fence.generation ||
        durable.contentDigest !== recordDigest ||
        hash('LIFECYCLE-CONTENT', durable.content) !== hash('LIFECYCLE-CONTENT', candidate)
      )
        return fail('FC-EVIDENCE', 'WITNESSED_RECORD_MISMATCH');
      const nextRecords = [...sourceRecords, durable];
      const verified = projectLifecycle({
        basisRecord: raw.basisRecord,
        records: nextRecords,
        intakeWitness: raw.intakeWitness,
        ledger: raw.ledger,
      });
      return verified.ok && verified.value.position === candidate.position - 1
        ? ok(candidate)
        : fail('FC-EVIDENCE', 'WITNESSED_RECORD_NOT_ADOPTABLE');
    },
  });
}
