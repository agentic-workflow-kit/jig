import { parseIdentity } from '@agentic-workflow-kit/jig-codec';

export const AUTHORITY_KERNEL_VERSION = 'jig.authority-kernel.v1';
export const STORY_STATES = Object.freeze([
  'Pending',
  'Eligible',
  'Preparing',
  'Implementing',
  'Reviewing',
  'Reworking',
  'Accepted',
  'Waiting',
  'Finalizing',
  'Refreshing',
  'RefreshPark',
  'Landed',
  'Blocked',
  'Rejected',
  'NotRun',
  'Retiring',
  'Closed',
] as const);
export const RUN_PHASES = Object.freeze([
  'Received',
  'Preflighting',
  'Active',
  'Parked',
  'Interrupted / Recovering',
  'Suspended',
  'Settling',
  'Completed',
  'Rejected',
  'Stopped',
] as const);
export const EVENT_TYPES = Object.freeze([
  'EV-ENVELOPE-SUBMITTED',
  'EV-SESSION-RESULT',
  'EV-SESSION-VERDICT',
  'EV-SESSION-FAULT',
  'EV-SESSION-HUMAN-REQUEST',
  'EV-SESSION-FACT',
  'EV-WORKSPACE-FACT',
  'EV-SETUP-FACT',
  'EV-WORKSPACE-PRESERVED',
  'EV-ARTIFACT-FACT',
  'EV-RULE-SURFACE-TOUCHED',
  'EV-LIVENESS-OBSERVED',
  'EV-CHECK-OBSERVATION',
  'EV-TARGET-FACT',
  'EV-EFFECT-CERTAINTY',
  'EV-LANDING-OBSERVED',
  'EV-OWNER-DECISION',
  'EV-DELEGATION-GRANT',
  'EV-RUN-SUSPEND-DECISION',
  'EV-RUN-RESUME-DECISION',
  'EV-RUN-TERMINAL-STOP-DECISION',
  'EV-NOTICE-ACKNOWLEDGED',
  'EV-NOTICE-SNOOZED',
  'EV-OBLIGATION-RESOLVED',
  'EV-WAKE-DEPENDENCY',
  'EV-WAKE-CAPACITY',
  'EV-WAKE-AUTHORITY',
  'EV-WAKE-FINALIZATION',
  'EV-WAKE-TIMER',
  'EV-BOUND-EXHAUSTED',
  'EV-WAKE-SETTLEMENT',
  'EV-RECOVERY-OBSERVATION',
] as const);
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
export const FAILURE_CLASSES = Object.freeze([
  'FC-INPUT',
  'FC-AUTHORITY',
  'FC-SUBJECT',
  'FC-FENCE',
  'FC-EVIDENCE',
  'FC-MECHANISM',
  'FC-EFFECT',
  'FC-CAPACITY',
  'FC-LIVENESS',
  'FC-RULES',
  'FC-BOUND',
  'FC-TRUST',
] as const);

export type StoryState = (typeof STORY_STATES)[number];
export type RunPhase = (typeof RUN_PHASES)[number];
export type EventType = (typeof EVENT_TYPES)[number];
export type OperationType = (typeof OPERATION_TYPES)[number];
export type FailureClass = (typeof FAILURE_CLASSES)[number];
export type KernelFailure = Readonly<{ failure: FailureClass; code: string }>;
export type KernelResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: KernelFailure }>;

export type SubjectBinding = Readonly<{ run: string; story: string; basis: string }>;
export type FenceBinding = Readonly<{ generation: string; basis: string }>;
export type AuthorityState = Readonly<{
  storyState: StoryState;
  runPhase: RunPhase;
  subject: SubjectBinding;
  fence: FenceBinding;
  catalogVersion: typeof AUTHORITY_KERNEL_VERSION;
}>;
export type AuthorityEvent = Readonly<{
  type: EventType;
  edge: string;
  id: string;
  subject: SubjectBinding;
  fence: FenceBinding;
  catalogVersion: typeof AUTHORITY_KERNEL_VERSION;
}>;
export type AuthorityBindings = Readonly<{
  transaction: string;
  event: string;
  operation: string;
  subject: SubjectBinding;
  fence: FenceBinding;
  catalogVersion: typeof AUTHORITY_KERNEL_VERSION;
}>;
export type OperationIntent = Readonly<{ type: OperationType } & AuthorityBindings>;
export type LegalEdge = Readonly<{
  id: string;
  from: StoryState;
  event: EventType;
  to: StoryState;
  operation?: OperationType;
}>;
export type RunLegalEdge = Readonly<{
  id: string;
  from: RunPhase;
  event: EventType;
  to: RunPhase;
}>;
export type PreControllerRunEdge = Readonly<{
  id: 'intake-received' | 'received-preflighting' | 'preflighting-rejected';
  from: 'entry' | 'Received' | 'Preflighting';
  to: 'Received' | 'Preflighting' | 'Rejected';
  controllerOwned: false;
}>;

const ownValues = (value: unknown, keys: readonly string[]): Record<string, unknown> | undefined => {
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
      Object.keys(descriptors).length !== keys.length ||
      !keys.every((key) => {
        const descriptor = descriptors[key];
        return descriptor !== undefined && 'value' in descriptor;
      }) ||
      !Object.keys(descriptors).every((key) => keys.includes(key))
    )
      return undefined;
    const entries: [string, unknown][] = [];
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (descriptor === undefined || !('value' in descriptor)) return undefined;
      if (!Object.is(Reflect.get(value, key), descriptor.value)) return undefined;
      entries.push([key, descriptor.value]);
    }
    return Object.freeze(Object.fromEntries(entries));
  } catch {
    return undefined;
  }
};
const plainArrayValues = (value: unknown): readonly unknown[] | undefined => {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const length = descriptors.length;
    if (
      length === undefined ||
      !('value' in length) ||
      typeof length.value !== 'number' ||
      !Number.isSafeInteger(length.value) ||
      length.value < 0 ||
      Object.keys(descriptors).filter((key) => key !== 'length').length !== length.value
    )
      return undefined;
    if (!Object.is(Reflect.get(value, 'length'), length.value)) return undefined;
    const entries: unknown[] = [];
    for (let index = 0; index < length.value; index += 1) {
      const entry = descriptors[String(index)];
      if (entry === undefined || !('value' in entry)) return undefined;
      if (!Object.is(Reflect.get(value, String(index)), entry.value)) return undefined;
      entries.push(entry.value);
    }
    return Object.freeze(entries);
  } catch {
    return undefined;
  }
};
const freeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const failure = (kind: FailureClass, code: string): KernelResult<never> => ({
  ok: false,
  error: { failure: kind, code },
});
const is = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && values.includes(value as T);
const digest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const version = (value: unknown): value is typeof AUTHORITY_KERNEL_VERSION => value === AUTHORITY_KERNEL_VERSION;

function subjectSnapshot(value: unknown): SubjectBinding | undefined {
  const subject = ownValues(value, ['run', 'story', 'basis']);
  if (subject === undefined) return undefined;
  const { run, story, basis } = subject;
  if (
    typeof run !== 'string' ||
    typeof story !== 'string' ||
    !digest(basis) ||
    !parseIdentity('ID-RUN', run).ok ||
    !parseIdentity('ID-STORY', story).ok ||
    !story.startsWith(`${run}/story/`)
  )
    return undefined;
  return freeze({ run, story, basis });
}
function fenceSnapshot(value: unknown): FenceBinding | undefined {
  const fence = ownValues(value, ['generation', 'basis']);
  if (fence === undefined) return undefined;
  const { generation, basis } = fence;
  if (typeof generation !== 'string' || !digest(basis) || !parseIdentity('ID-GEN', generation).ok) return undefined;
  return freeze({ generation, basis });
}
function sameBinding(left: SubjectBinding | FenceBinding, right: SubjectBinding | FenceBinding): boolean {
  if ('run' in left && 'run' in right)
    return left.run === right.run && left.story === right.story && left.basis === right.basis;
  if ('generation' in left && 'generation' in right)
    return left.generation === right.generation && left.basis === right.basis;
  return false;
}
function sameLedgerPosition(transaction: string, event: string): boolean {
  const transactionPosition = /\/txn\/([0-9]+)\//.exec(transaction)?.[1];
  const eventPosition = /\/event\/([0-9]+)$/.exec(event)?.[1];
  return transactionPosition !== undefined && transactionPosition === eventPosition;
}
function bindingsSnapshot(value: unknown): AuthorityBindings | undefined {
  const bindings = ownValues(value, ['transaction', 'event', 'operation', 'subject', 'fence', 'catalogVersion']);
  if (bindings === undefined) return undefined;
  const { transaction, event, operation, catalogVersion } = bindings;
  const subject = subjectSnapshot(bindings.subject);
  const fence = fenceSnapshot(bindings.fence);
  if (
    typeof transaction !== 'string' ||
    typeof event !== 'string' ||
    typeof operation !== 'string' ||
    subject === undefined ||
    fence === undefined ||
    !version(catalogVersion) ||
    !parseIdentity('ID-TXN', transaction).ok ||
    !parseIdentity('ID-EVENT', event).ok ||
    !parseIdentity('ID-OP', operation).ok ||
    !transaction.startsWith(`${subject.run}/txn/`) ||
    !event.startsWith(`${subject.run}/event/`) ||
    !operation.startsWith(`${transaction}/op/`) ||
    !fence.generation.startsWith(`${subject.run}/gen/`) ||
    subject.basis !== fence.basis ||
    !sameLedgerPosition(transaction, event)
  )
    return undefined;
  return freeze({ transaction, event, operation, subject, fence, catalogVersion });
}

const edge = (
  id: string,
  from: StoryState,
  event: EventType,
  to: StoryState,
  operation?: OperationType,
): LegalEdge => ({ id, from, event, to, ...(operation === undefined ? {} : { operation }) });
export const LEGAL_EDGES: readonly LegalEdge[] = freeze([
  edge('pending-eligible', 'Pending', 'EV-WAKE-DEPENDENCY', 'Eligible'),
  edge('pending-not-run', 'Pending', 'EV-WAKE-DEPENDENCY', 'NotRun'),
  edge('eligible-preparing', 'Eligible', 'EV-WAKE-CAPACITY', 'Preparing', 'OPC-WS-PROVISION'),
  edge('preparing-implementing', 'Preparing', 'EV-WORKSPACE-FACT', 'Implementing'),
  edge('preparing-session-blocked', 'Preparing', 'EV-SESSION-FAULT', 'Blocked'),
  edge('preparing-workspace-blocked', 'Preparing', 'EV-WORKSPACE-FACT', 'Blocked'),
  edge('implementing-reviewing', 'Implementing', 'EV-SESSION-RESULT', 'Reviewing'),
  edge('implementing-blocked', 'Implementing', 'EV-SESSION-FAULT', 'Blocked'),
  edge('reviewing-reworking', 'Reviewing', 'EV-SESSION-VERDICT', 'Reworking', 'OPC-SESSION-OPEN'),
  edge('reviewing-accepted', 'Reviewing', 'EV-SESSION-VERDICT', 'Accepted'),
  edge('reviewing-blocked', 'Reviewing', 'EV-SESSION-VERDICT', 'Blocked'),
  edge('reworking-open', 'Reworking', 'EV-WAKE-CAPACITY', 'Reworking', 'OPC-SESSION-OPEN'),
  edge('reworking-assign', 'Reworking', 'EV-SESSION-FACT', 'Reworking', 'OPC-SESSION-ASSIGN'),
  edge('reworking-implementing', 'Reworking', 'EV-SESSION-FACT', 'Implementing', 'OPC-SESSION-COLLECT'),
  edge('reworking-blocked', 'Reworking', 'EV-SESSION-FAULT', 'Blocked'),
  edge('accepted-reviewing', 'Accepted', 'EV-OWNER-DECISION', 'Reviewing'),
  edge('accepted-waiting', 'Accepted', 'EV-WAKE-FINALIZATION', 'Waiting'),
  edge('accepted-finalizing', 'Accepted', 'EV-WAKE-AUTHORITY', 'Finalizing'),
  edge('waiting-reviewing', 'Waiting', 'EV-OWNER-DECISION', 'Reviewing'),
  edge('waiting-finalizing', 'Waiting', 'EV-WAKE-AUTHORITY', 'Finalizing'),
  edge('finalizing-refreshing', 'Finalizing', 'EV-TARGET-FACT', 'Refreshing'),
  edge('finalizing-reviewing', 'Finalizing', 'EV-OWNER-DECISION', 'Reviewing'),
  edge('finalizing-reworking', 'Finalizing', 'EV-CHECK-OBSERVATION', 'Reworking'),
  edge('finalizing-blocked-check', 'Finalizing', 'EV-CHECK-OBSERVATION', 'Blocked'),
  edge('finalizing-landed', 'Finalizing', 'EV-LANDING-OBSERVED', 'Landed'),
  edge('finalizing-blocked-effect', 'Finalizing', 'EV-EFFECT-CERTAINTY', 'Blocked'),
  edge('finalizing-blocked-recovery', 'Finalizing', 'EV-RECOVERY-OBSERVATION', 'Blocked'),
  edge('refreshing-reviewing', 'Refreshing', 'EV-WORKSPACE-FACT', 'Reviewing'),
  edge('refreshing-parked', 'Refreshing', 'EV-BOUND-EXHAUSTED', 'RefreshPark'),
  edge('landed-retiring', 'Landed', 'EV-WAKE-SETTLEMENT', 'Retiring'),
  edge('blocked-retiring', 'Blocked', 'EV-WAKE-SETTLEMENT', 'Retiring'),
  edge('rejected-retiring', 'Rejected', 'EV-WAKE-SETTLEMENT', 'Retiring'),
  edge('retiring-closed', 'Retiring', 'EV-WAKE-SETTLEMENT', 'Closed'),
  edge('retiring-closed-owner', 'Retiring', 'EV-OWNER-DECISION', 'Closed'),
  edge('not-run-closed', 'NotRun', 'EV-WAKE-DEPENDENCY', 'Closed'),
  ...(
    [
      'Preparing',
      'Implementing',
      'Reviewing',
      'Reworking',
      'Accepted',
      'Waiting',
      'Finalizing',
      'Refreshing',
      'RefreshPark',
    ] as const
  ).map((from) => ({
    id: `${from.toLowerCase()}-rejected`,
    from,
    event: 'EV-OWNER-DECISION' as const,
    to: 'Rejected' as const,
  })),
]);

const runEdge = (id: string, from: RunPhase, event: EventType, to: RunPhase): RunLegalEdge => ({
  id,
  from,
  event,
  to,
});
export const PRE_CONTROLLER_RUN_EDGES: readonly PreControllerRunEdge[] = freeze([
  { id: 'intake-received', from: 'entry', to: 'Received', controllerOwned: false },
  { id: 'received-preflighting', from: 'Received', to: 'Preflighting', controllerOwned: false },
  { id: 'preflighting-rejected', from: 'Preflighting', to: 'Rejected', controllerOwned: false },
]);
export const RUN_LEGAL_EDGES: readonly RunLegalEdge[] = freeze([
  runEdge('preflighting-active', 'Preflighting', 'EV-ENVELOPE-SUBMITTED', 'Active'),
  ...(
    [
      'EV-SESSION-HUMAN-REQUEST',
      'EV-SESSION-FAULT',
      'EV-WORKSPACE-FACT',
      'EV-SETUP-FACT',
      'EV-ARTIFACT-FACT',
      'EV-LIVENESS-OBSERVED',
      'EV-CHECK-OBSERVATION',
      'EV-TARGET-FACT',
      'EV-EFFECT-CERTAINTY',
      'EV-RULE-SURFACE-TOUCHED',
      'EV-BOUND-EXHAUSTED',
    ] as const
  ).map((event) => runEdge(`active-parked-${event.toLowerCase().slice(3)}`, 'Active', event, 'Parked')),
  runEdge('parked-active', 'Parked', 'EV-OWNER-DECISION', 'Active'),
  ...(['Active', 'Parked', 'Settling'] as const).map((from) =>
    runEdge(`${from.toLowerCase()}-recovering`, from, 'EV-RECOVERY-OBSERVATION', 'Interrupted / Recovering'),
  ),
  runEdge('recovering-active', 'Interrupted / Recovering', 'EV-RECOVERY-OBSERVATION', 'Active'),
  runEdge('recovering-parked', 'Interrupted / Recovering', 'EV-RECOVERY-OBSERVATION', 'Parked'),
  runEdge('recovering-settling', 'Interrupted / Recovering', 'EV-RECOVERY-OBSERVATION', 'Settling'),
  runEdge('recovering-stopped', 'Interrupted / Recovering', 'EV-RECOVERY-OBSERVATION', 'Stopped'),
  ...(['Active', 'Parked'] as const).map((from) =>
    runEdge(`${from.toLowerCase()}-suspended`, from, 'EV-RUN-SUSPEND-DECISION', 'Suspended'),
  ),
  runEdge('suspended-recovery-release', 'Suspended', 'EV-RECOVERY-OBSERVATION', 'Suspended'),
  runEdge('suspended-effect-release', 'Suspended', 'EV-EFFECT-CERTAINTY', 'Suspended'),
  runEdge('suspended-active', 'Suspended', 'EV-RUN-RESUME-DECISION', 'Active'),
  runEdge('suspended-parked', 'Suspended', 'EV-RUN-RESUME-DECISION', 'Parked'),
  runEdge('suspended-stopped', 'Suspended', 'EV-RUN-TERMINAL-STOP-DECISION', 'Stopped'),
  ...(
    [
      'EV-SESSION-FACT',
      'EV-WORKSPACE-PRESERVED',
      'EV-WORKSPACE-FACT',
      'EV-TARGET-FACT',
      'EV-ARTIFACT-FACT',
      'EV-EFFECT-CERTAINTY',
      'EV-RECOVERY-OBSERVATION',
      'EV-WAKE-SETTLEMENT',
    ] as const
  ).map((event) => runEdge(`stopped-progress-${event.toLowerCase().slice(3)}`, 'Stopped', event, 'Stopped')),
  runEdge('active-settling', 'Active', 'EV-WAKE-SETTLEMENT', 'Settling'),
  ...(['Active', 'Parked', 'Suspended', 'Settling', 'Stopped'] as const).map((from) =>
    runEdge(`${from.toLowerCase()}-obligation-exhausted`, from, 'EV-BOUND-EXHAUSTED', from),
  ),
  ...(['Settling', 'Stopped'] as const).flatMap((from) => [
    runEdge(`${from.toLowerCase()}-obligation-handoff`, from, 'EV-OWNER-DECISION', from),
    runEdge(`${from.toLowerCase()}-obligation-resolved`, from, 'EV-OBLIGATION-RESOLVED', from),
  ]),
  runEdge('settling-completed', 'Settling', 'EV-WAKE-SETTLEMENT', 'Completed'),
  runEdge('stopped-settlement-cut', 'Stopped', 'EV-WAKE-SETTLEMENT', 'Stopped'),
]);

export function validateEvent(value: unknown): KernelResult<AuthorityEvent> {
  const event = ownValues(value, ['type', 'edge', 'id', 'subject', 'fence', 'catalogVersion']);
  if (event === undefined) return failure('FC-INPUT', 'SCH-EVENT shape');
  const { type, edge, id, catalogVersion } = event;
  const subject = subjectSnapshot(event.subject);
  const fence = fenceSnapshot(event.fence);
  if (
    !is(EVENT_TYPES, type) ||
    typeof edge !== 'string' ||
    !/^[a-z0-9-]+$/.test(edge) ||
    typeof id !== 'string' ||
    subject === undefined ||
    fence === undefined ||
    !version(catalogVersion)
  )
    return failure('FC-INPUT', 'SCH-EVENT value');
  if (
    !parseIdentity('ID-EVENT', id).ok ||
    !id.startsWith(`${subject.run}/event/`) ||
    !sameBinding(subject, { ...subject }) ||
    subject.basis !== fence.basis ||
    !fence.generation.startsWith(`${subject.run}/gen/`)
  )
    return failure('FC-SUBJECT', 'SCH-EVENT binding');
  return {
    ok: true,
    value: freeze({
      type,
      edge,
      id,
      subject,
      fence,
      catalogVersion,
    }),
  };
}
export function validateOperation(value: unknown): KernelResult<OperationIntent> {
  const operation = ownValues(value, [
    'type',
    'transaction',
    'event',
    'operation',
    'subject',
    'fence',
    'catalogVersion',
  ]);
  if (operation === undefined) return failure('FC-INPUT', 'SCH-OPERATION shape');
  const type = operation.type;
  const bindings = bindingsSnapshot({
    transaction: operation.transaction,
    event: operation.event,
    operation: operation.operation,
    subject: operation.subject,
    fence: operation.fence,
    catalogVersion: operation.catalogVersion,
  });
  if (!is(OPERATION_TYPES, type) || bindings === undefined) return failure('FC-INPUT', 'SCH-OPERATION value');
  return { ok: true, value: freeze({ type, ...bindings }) };
}
export function validateAuthorityState(value: unknown): KernelResult<AuthorityState> {
  const state = ownValues(value, ['storyState', 'runPhase', 'subject', 'fence', 'catalogVersion']);
  if (state === undefined) return failure('FC-INPUT', 'state shape');
  const { storyState, runPhase, catalogVersion } = state;
  const subject = subjectSnapshot(state.subject);
  const fence = fenceSnapshot(state.fence);
  if (
    !is(STORY_STATES, storyState) ||
    !is(RUN_PHASES, runPhase) ||
    subject === undefined ||
    fence === undefined ||
    !version(catalogVersion)
  )
    return failure('FC-INPUT', 'state value');
  if (subject.basis !== fence.basis || !fence.generation.startsWith(`${subject.run}/gen/`))
    return failure('FC-FENCE', 'state fence');
  return {
    ok: true,
    value: freeze({
      storyState,
      runPhase,
      subject,
      fence,
      catalogVersion,
    }),
  };
}
export type ProposedTransition = Readonly<{
  previous: AuthorityState;
  next: AuthorityState;
  trigger: AuthorityEvent;
  bindings: AuthorityBindings;
  operations: readonly OperationIntent[];
  record: Readonly<{ status: 'required' }>;
}>;
export function validateTransition(value: unknown): KernelResult<ProposedTransition> {
  const transition = ownValues(value, ['previous', 'next', 'trigger', 'bindings', 'operations', 'record']);
  if (transition === undefined) return failure('FC-INPUT', 'SCH-TRANSITION shape');
  const previous = validateAuthorityState(transition.previous);
  const next = validateAuthorityState(transition.next);
  const trigger = validateEvent(transition.trigger);
  const bindings = bindingsSnapshot(transition.bindings);
  const operations = plainArrayValues(transition.operations);
  const record = ownValues(transition.record, ['status']);
  if (!previous.ok) return previous;
  if (!next.ok) return next;
  if (!trigger.ok) return trigger;
  if (bindings === undefined || operations === undefined || record === undefined || record.status !== 'required')
    return failure('FC-INPUT', 'SCH-TRANSITION value');
  if (
    !sameBinding(previous.value.subject, next.value.subject) ||
    !sameBinding(previous.value.subject, trigger.value.subject) ||
    !sameBinding(previous.value.fence, next.value.fence) ||
    !sameBinding(previous.value.fence, trigger.value.fence) ||
    !sameBinding(previous.value.subject, bindings.subject) ||
    !sameBinding(previous.value.fence, bindings.fence) ||
    trigger.value.id !== bindings.event
  )
    return failure('FC-SUBJECT', 'SCH-TRANSITION binding');
  const storyEdge = LEGAL_EDGES.find(
    (candidate) =>
      candidate.id === trigger.value.edge &&
      candidate.from === previous.value.storyState &&
      candidate.event === trigger.value.type &&
      candidate.to === next.value.storyState,
  );
  const runEdge = RUN_LEGAL_EDGES.find(
    (candidate) =>
      candidate.id === trigger.value.edge &&
      candidate.from === previous.value.runPhase &&
      candidate.event === trigger.value.type &&
      candidate.to === next.value.runPhase,
  );
  const storyTransition = storyEdge !== undefined && previous.value.runPhase === next.value.runPhase;
  const runTransition = runEdge !== undefined && previous.value.storyState === next.value.storyState;
  if (storyTransition === runTransition) return failure('FC-AUTHORITY', 'unimplemented transition');
  const expectedOperation = storyEdge?.operation;
  const operationIntents: OperationIntent[] = [];
  for (const operation of operations) {
    const intent = validateOperation(operation);
    if (!intent.ok) return intent;
    operationIntents.push(intent.value);
  }
  if (
    operationIntents.length !== (expectedOperation === undefined ? 0 : 1) ||
    (expectedOperation !== undefined &&
      (operationIntents[0]?.type !== expectedOperation ||
        operationIntents[0]?.transaction !== bindings.transaction ||
        operationIntents[0]?.event !== bindings.event ||
        operationIntents[0]?.operation !== bindings.operation ||
        !sameBinding(operationIntents[0]?.subject ?? bindings.subject, bindings.subject) ||
        !sameBinding(operationIntents[0]?.fence ?? bindings.fence, bindings.fence)))
  )
    return failure('FC-INPUT', 'SCH-OPERATION intent');
  return {
    ok: true,
    value: freeze({
      previous: previous.value,
      next: next.value,
      trigger: trigger.value,
      bindings,
      operations: freeze(operationIntents),
      record: freeze({ status: 'required' }),
    }),
  };
}
export function reduceAuthority(state: unknown, event: unknown, bindings: unknown): KernelResult<ProposedTransition> {
  const current = validateAuthorityState(state);
  if (!current.ok) return current;
  const trigger = validateEvent(event);
  if (!trigger.ok) return trigger;
  const authorityBindings = bindingsSnapshot(bindings);
  if (authorityBindings === undefined) return failure('FC-INPUT', 'binding shape');
  if (
    !sameBinding(current.value.subject, trigger.value.subject) ||
    !sameBinding(current.value.subject, authorityBindings.subject)
  )
    return failure('FC-SUBJECT', 'subject mismatch');
  if (
    !sameBinding(current.value.fence, trigger.value.fence) ||
    !sameBinding(current.value.fence, authorityBindings.fence)
  )
    return failure('FC-FENCE', 'fence mismatch');
  if (trigger.value.id !== authorityBindings.event) return failure('FC-SUBJECT', 'event identity mismatch');
  const storyEdge = LEGAL_EDGES.find(
    (candidate) =>
      candidate.id === trigger.value.edge &&
      candidate.from === current.value.storyState &&
      candidate.event === trigger.value.type,
  );
  const runEdge = RUN_LEGAL_EDGES.find(
    (candidate) =>
      candidate.id === trigger.value.edge &&
      candidate.from === current.value.runPhase &&
      candidate.event === trigger.value.type,
  );
  if ((storyEdge === undefined) === (runEdge === undefined)) return failure('FC-AUTHORITY', 'unimplemented transition');
  const operation =
    storyEdge?.operation === undefined
      ? []
      : [
          freeze({
            type: storyEdge.operation,
            ...authorityBindings,
          }),
        ];
  return validateTransition({
    previous: current.value,
    next:
      storyEdge === undefined
        ? runEdge === undefined
          ? current.value
          : { ...current.value, runPhase: runEdge.to }
        : { ...current.value, storyState: storyEdge.to },
    trigger: trigger.value,
    bindings: authorityBindings,
    operations: operation,
    record: { status: 'required' },
  });
}
export function replayAuthority(initialState: unknown, steps: unknown): KernelResult<readonly ProposedTransition[]> {
  try {
    const initial = validateAuthorityState(initialState);
    if (!initial.ok) return initial;
    const replaySteps = plainArrayValues(steps);
    if (replaySteps === undefined) return failure('FC-INPUT', 'replay steps shape');
    let current: unknown = initial.value;
    const decisions: ProposedTransition[] = [];
    let expectedPosition = 1;
    for (const step of replaySteps) {
      const replayStep = ownValues(step, ['event', 'bindings']);
      if (replayStep === undefined) return failure('FC-INPUT', 'replay step shape');
      const replayEvent = ownValues(replayStep.event, ['type', 'edge', 'id', 'subject', 'fence', 'catalogVersion']);
      if (replayEvent === undefined) return failure('FC-INPUT', 'replay event shape');
      const position = /\/event\/([0-9]+)$/.exec(typeof replayEvent.id === 'string' ? replayEvent.id : '')?.[1];
      if (position !== String(expectedPosition)) return failure('FC-INPUT', 'replay ledger order');
      const decision = reduceAuthority(current, replayEvent, replayStep.bindings);
      if (!decision.ok) return decision;
      decisions.push(decision.value);
      current = decision.value.next;
      expectedPosition += 1;
    }
    return { ok: true, value: freeze(decisions) };
  } catch {
    return failure('FC-INPUT', 'replay input');
  }
}
