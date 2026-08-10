import { parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';
import type { ObligationController, ObligationSnapshot, ResidualObligation } from './obligation.js';

export const BLOCK_SURFACING_CONTRACT_VERSION = 'jig.block-surfacing-contract.v1';
export const BLOCK_SURFACING_SNAPSHOT_SCHEMA = 'jig.block-surfacing-snapshot.v1';
export const BLOCK_SURFACING_EVENT_SCHEMA = 'jig.block-surfacing-event.v1';
export const BLOCK_SURFACING_PORT = 'PORT-DELIVERY';
export const BLOCK_SURFACING_CONTROLLER = 'RT-CONTROLLER';
export const BLOCK_SURFACING_OPERATION = 'CP-BLOCK-SURFACING';
export const BLOCK_SURFACING_OPERATION_CLASSES = Object.freeze(['OPC-DEL-STATUS', 'OPC-DEL-COMMENT'] as const);
export const BLOCK_SURFACING_WAIT_BOUNDS = Object.freeze({
  targetSeconds: Object.freeze({ minimum: 60, maximum: 86_400 }),
  observations: Object.freeze({ minimum: 1, maximum: 5 }),
});
export const BLOCK_SURFACING_CONFORMANCE = Object.freeze({
  oracle: 'CF-BLOCK-SURFACING',
  mechanism: 'CF-MECH-DELIVERY',
  port: BLOCK_SURFACING_PORT,
});

type BlockOutcome = 'Blocked' | 'held';
type MarkerKind = 'status' | 'comment';
type MarkerEffectOutcome = 'created' | 'updated' | 'uncertain' | 'held' | 'absent' | 'unavailable';
type MarkerObservationOutcome = 'present' | 'absent' | 'held' | 'conflict' | 'uncertain';
type SurfaceStatus = 'pending' | 'surfaced' | 'reconciling' | 'target-wait' | 'parked';

export type BlockSurfacingFailureFamily =
  | 'FC-INPUT'
  | 'FC-AUTHORITY'
  | 'FC-SUBJECT'
  | 'FC-FENCE'
  | 'FC-MECHANISM'
  | 'FC-EFFECT'
  | 'FC-BOUND'
  | 'FC-TRUST';
export type BlockSurfacingFailure = Readonly<{ family: BlockSurfacingFailureFamily; code: string }>;
export type BlockSurfacingResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: BlockSurfacingFailure }>;

export type BlockSurfacingSubject = Readonly<{
  run: string;
  story: string;
  generation: string;
  outcome: BlockOutcome;
  candidate: string | null;
  request: string | null;
  ref: string | null;
  authority: string;
  fence: string;
  dependencyStories: readonly string[];
  owner: 'principal/arye';
  reason: string;
  startedAt: number;
  deadline: number;
}>;

export type BlockMarker = Readonly<{
  kind: MarkerKind;
  identity: string;
  context: string;
}>;

export type BlockSurfacingObligationBasis = Readonly<{
  run: string;
  generation: string;
  resource: string;
  duty: 'surfacing';
  origin: string;
  reason: string;
  preservationEvidence: unknown;
  accountableOwner: 'principal/arye';
  criteria: unknown;
  startedAt: number;
  deadline: number;
  policyDigest: string;
}>;

export type BlockSurfacingIntent = Readonly<{
  schema: typeof BLOCK_SURFACING_EVENT_SCHEMA;
  kind: 'OPERATION-INTENT';
  operation: string;
  type: (typeof BLOCK_SURFACING_OPERATION_CLASSES)[number];
  controller: typeof BLOCK_SURFACING_CONTROLLER;
  port: typeof BLOCK_SURFACING_PORT;
  subject: BlockSurfacingSubject;
  subjectDigest: string;
  marker: BlockMarker;
  authority: string;
  fence: string;
  requestIdentity: string;
  transition: string;
  explanation: string;
}>;

export type BlockMarkerEffect = Readonly<{
  schema: typeof BLOCK_SURFACING_EVENT_SCHEMA;
  kind: 'EV-MARKER-FACT';
  operation: string;
  marker: BlockMarker;
  subjectDigest: string;
  requestIdentity: string;
  authority: string;
  fence: string;
  outcome: MarkerEffectOutcome;
  observedAt: number;
  providerText: string;
  quarantinedProviderText: boolean;
}>;

export type BlockMarkerObservation = Readonly<{
  schema: typeof BLOCK_SURFACING_EVENT_SCHEMA;
  kind: 'EV-MARKER-OBSERVATION';
  operation: string;
  resolvesOperation: string;
  marker: BlockMarker;
  subjectDigest: string;
  requestIdentity: string;
  authority: string;
  fence: string;
  outcome: MarkerObservationOutcome;
  observedAt: number;
  providerText: string;
  quarantinedProviderText: boolean;
}>;

export type BlockSurfacingSourceFact = Readonly<{
  schema: typeof BLOCK_SURFACING_EVENT_SCHEMA;
  kind: 'EV-BLOCK-SOURCE-FACT';
  subject: BlockSurfacingSubject;
  subjectDigest: string;
  marker: BlockMarker;
  obligation: string;
  notice: string;
  criteriaDigest: string;
  boundDigest: string;
  sourceDigest: string;
}>;

export type BlockSurfacingWait = Readonly<{
  kind: 'BND-WAIT-TARGET';
  operation: string;
  correlationKey: string;
  startedAt: number;
  deadline: number;
  observations: number;
  limit: number;
  owner: 'principal/arye';
  reason: string;
}>;

type BlockSurfacingRecord =
  | Readonly<{ kind: 'basis'; source: BlockSurfacingSourceFact }>
  | Readonly<{ kind: 'intent'; intent: BlockSurfacingIntent }>
  | Readonly<{ kind: 'effect'; fact: BlockMarkerEffect }>
  | Readonly<{ kind: 'observation'; fact: BlockMarkerObservation }>
  | Readonly<{ kind: 'reauthorization'; operation: string; reason: string; observedAt: number }>
  | Readonly<{ kind: 'wait'; wait: BlockSurfacingWait }>
  | Readonly<{ kind: 'exhausted'; operation: string; obligation: string; observedAt: number }>;
type JournalEntry = Readonly<{
  position: number;
  previousDigest: string;
  digest: string;
  record: BlockSurfacingRecord;
}>;

export type BlockSurfacingProjection = Readonly<{
  subject: BlockSurfacingSubject;
  marker: BlockMarker;
  status: SurfaceStatus;
  source: BlockSurfacingSourceFact;
  obligation: ResidualObligation;
  effect: BlockMarkerEffect | null;
  observation: BlockMarkerObservation | null;
  wait: BlockSurfacingWait | null;
  reauthorization: Readonly<{ operation: string; reason: string; observedAt: number }> | null;
  releasedStories: readonly string[];
  reachability: Readonly<{
    providerEnabled: false;
    dispatchEnabled: false;
    externalEffects: false;
    noticeChannelEnabled: false;
  }>;
}>;

export type BlockSurfacingSnapshot = Readonly<{
  schema: typeof BLOCK_SURFACING_SNAPSHOT_SCHEMA;
  subject: BlockSurfacingSubject;
  marker: BlockMarker;
  source: BlockSurfacingSourceFact;
  obligation: string;
  obligationSnapshot: ObligationSnapshot;
  status: SurfaceStatus;
  records: readonly JournalEntry[];
  projection: BlockSurfacingProjection;
}>;

export type ScriptedBlockSurfacingMechanism = Readonly<{
  apply(
    input: Readonly<{
      operation: string;
      marker: BlockMarker;
      subjectDigest: string;
      requestIdentity: string;
      authority: string;
      fence: string;
      observedAt: number;
    }>,
  ): BlockSurfacingResult<BlockMarkerEffect>;
  observe(
    input: Readonly<{
      operation: string;
      resolvesOperation: string;
      marker: BlockMarker;
      subjectDigest: string;
      requestIdentity: string;
      authority: string;
      fence: string;
      observedAt: number;
    }>,
  ): BlockSurfacingResult<BlockMarkerObservation>;
  reachability(): Readonly<{
    providerEnabled: false;
    dispatchEnabled: false;
    externalEffects: false;
    noticeChannelEnabled: false;
  }>;
}>;

export type BlockSurfacingController = Readonly<{
  authorize(input: unknown): BlockSurfacingResult<BlockSurfacingIntent>;
  dispatch(input: unknown): BlockSurfacingResult<BlockSurfacingProjection>;
  observe(input: unknown): BlockSurfacingResult<BlockSurfacingProjection>;
  wake(input: unknown): BlockSurfacingResult<BlockSurfacingProjection>;
  surface(input: unknown): BlockSurfacingResult<BlockSurfacingProjection>;
  projection(): BlockSurfacingProjection;
  snapshot(): BlockSurfacingSnapshot;
  records(): readonly JournalEntry[];
  reachability(): Readonly<{
    providerEnabled: false;
    dispatchEnabled: false;
    externalEffects: false;
    noticeChannelEnabled: false;
  }>;
}>;

const ZERO = '0'.repeat(64);
const DIGEST = /^[0-9a-f]{64}$/u;
const SECRET =
  /(?:api[\s._'"+/-]*key|access[\s._'"+/-]*token|refresh[\s._'"+/-]*token|password|credential|secret|authorization|bearer)/iu;
const URL = /https?:\/\/[^\s]+/giu;

const fail = <T = never>(family: BlockSurfacingFailureFamily, code: string): BlockSurfacingResult<T> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });
const ok = <T>(value: T): BlockSurfacingResult<T> => Object.freeze({ ok: true, value: deepFreeze(value) });

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function plain(value: unknown): value is Record<string, unknown> {
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
}

function fields(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): Record<string, unknown> | undefined {
  if (!plain(value)) return undefined;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const allowed = new Set([...required, ...optional]);
    const names = Object.keys(descriptors);
    if (!required.every((name) => Object.hasOwn(descriptors, name)) || names.some((name) => !allowed.has(name)))
      return undefined;
    if (names.some((name) => !Object.hasOwn(descriptors[name] as object, 'value'))) return undefined;
    return Object.freeze(Object.fromEntries(names.map((name) => [name, descriptors[name]?.value])));
  } catch {
    return undefined;
  }
}

function array(value: unknown, max = 32): readonly unknown[] | undefined {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max) return undefined;
  return Object.freeze([...value]);
}

function digest(value: unknown): value is string {
  return typeof value === 'string' && DIGEST.test(value);
}

function identity(kind: string, value: unknown): value is string {
  return typeof value === 'string' && parseIdentity(kind, value).ok;
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function boundedText(value: unknown, maximum = 512): value is string {
  return typeof value === 'string' && value.normalize('NFC') === value && value.length > 0 && value.length <= maximum;
}

function same(left: unknown, right: unknown): boolean {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function digestValue(domain: string, value: unknown): string | undefined {
  const result = stageDigest({ domain, excludePaths: [], value: value as never });
  return result.ok ? result.value.digest : undefined;
}

function redactProviderText(value: unknown): Readonly<{ text: string; quarantined: boolean }> {
  if (typeof value !== 'string' || value.length > 256 || SECRET.test(value))
    return Object.freeze({ text: '[redacted]', quarantined: true });
  const redacted = value.replace(URL, '[redacted-url]');
  return Object.freeze({ text: redacted, quarantined: redacted !== value });
}

function validateMarker(value: unknown): BlockSurfacingResult<BlockMarker> {
  const raw = fields(value, ['context', 'identity', 'kind']);
  if (
    !raw ||
    !['status', 'comment'].includes(String(raw.kind)) ||
    !boundedText(raw.identity, 128) ||
    !boundedText(raw.context, 256)
  )
    return fail('FC-INPUT', 'INVALID_BLOCK_MARKER');
  return ok({ kind: raw.kind as MarkerKind, identity: raw.identity as string, context: raw.context as string });
}

function validateSubject(value: unknown): BlockSurfacingResult<BlockSurfacingSubject> {
  const raw = fields(value, [
    'authority',
    'candidate',
    'deadline',
    'dependencyStories',
    'fence',
    'generation',
    'outcome',
    'owner',
    'reason',
    'ref',
    'request',
    'run',
    'startedAt',
    'story',
  ]);
  const dependencies = raw ? array(raw.dependencyStories) : undefined;
  if (
    !raw ||
    !identity('ID-RUN', raw.run) ||
    !identity('ID-STORY', raw.story) ||
    !identity('ID-GEN', raw.generation) ||
    !raw.story.startsWith(`${raw.run}/story/`) ||
    !raw.generation.startsWith(`${raw.run}/gen/`) ||
    !['Blocked', 'held'].includes(String(raw.outcome)) ||
    (raw.candidate !== null && !identity('ID-CAND', raw.candidate)) ||
    (raw.request !== null && !identity('ID-OP', raw.request)) ||
    (raw.ref !== null && !boundedText(raw.ref, 256)) ||
    !identity('ID-AUTH', raw.authority) ||
    !identity('ID-AUTH', raw.fence) ||
    !dependencies ||
    dependencies.some((item) => !identity('ID-STORY', item) || !String(item).startsWith(`${raw.run}/story/`)) ||
    raw.owner !== 'principal/arye' ||
    !boundedText(raw.reason) ||
    !integer(raw.startedAt) ||
    !integer(raw.deadline) ||
    raw.deadline <= raw.startedAt
  )
    return fail('FC-SUBJECT', 'INVALID_BLOCK_SUBJECT');
  return ok({
    run: raw.run as string,
    story: raw.story as string,
    generation: raw.generation as string,
    outcome: raw.outcome as BlockOutcome,
    candidate: raw.candidate as string | null,
    request: raw.request as string | null,
    ref: raw.ref as string | null,
    authority: raw.authority as string,
    fence: raw.fence as string,
    dependencyStories: dependencies as readonly string[],
    owner: 'principal/arye',
    reason: raw.reason as string,
    startedAt: raw.startedAt as number,
    deadline: raw.deadline as number,
  });
}

function validateEffect(value: unknown): BlockSurfacingResult<BlockMarkerEffect> {
  const raw = fields(value, [
    'authority',
    'fence',
    'kind',
    'marker',
    'observedAt',
    'operation',
    'outcome',
    'providerText',
    'quarantinedProviderText',
    'requestIdentity',
    'schema',
    'subjectDigest',
  ]);
  const marker = raw ? validateMarker(raw.marker) : undefined;
  if (
    !raw ||
    raw.schema !== BLOCK_SURFACING_EVENT_SCHEMA ||
    raw.kind !== 'EV-MARKER-FACT' ||
    !identity('ID-OP', raw.operation) ||
    !identity('ID-AUTH', raw.authority) ||
    !identity('ID-AUTH', raw.fence) ||
    !identity('ID-OP', raw.requestIdentity) ||
    !digest(raw.subjectDigest) ||
    !marker?.ok ||
    !['created', 'updated', 'uncertain', 'held', 'absent', 'unavailable'].includes(String(raw.outcome)) ||
    !integer(raw.observedAt) ||
    typeof raw.providerText !== 'string' ||
    typeof raw.quarantinedProviderText !== 'boolean'
  )
    return fail('FC-TRUST', 'INVALID_MARKER_EFFECT');
  return ok({ ...raw, marker: marker.value } as BlockMarkerEffect);
}

function validateObservation(value: unknown): BlockSurfacingResult<BlockMarkerObservation> {
  const raw = fields(value, [
    'authority',
    'fence',
    'kind',
    'marker',
    'observedAt',
    'operation',
    'outcome',
    'providerText',
    'quarantinedProviderText',
    'requestIdentity',
    'resolvesOperation',
    'schema',
    'subjectDigest',
  ]);
  const marker = raw ? validateMarker(raw.marker) : undefined;
  if (
    !raw ||
    raw.schema !== BLOCK_SURFACING_EVENT_SCHEMA ||
    raw.kind !== 'EV-MARKER-OBSERVATION' ||
    !identity('ID-OP', raw.operation) ||
    !identity('ID-OP', raw.resolvesOperation) ||
    !identity('ID-AUTH', raw.authority) ||
    !identity('ID-AUTH', raw.fence) ||
    !identity('ID-OP', raw.requestIdentity) ||
    !digest(raw.subjectDigest) ||
    !marker?.ok ||
    !['present', 'absent', 'held', 'conflict', 'uncertain'].includes(String(raw.outcome)) ||
    !integer(raw.observedAt) ||
    typeof raw.providerText !== 'string' ||
    typeof raw.quarantinedProviderText !== 'boolean'
  )
    return fail('FC-TRUST', 'INVALID_MARKER_OBSERVATION');
  return ok({ ...raw, marker: marker.value } as BlockMarkerObservation);
}

function journalDigest(
  entry: Readonly<{ position: number; previousDigest: string; record: BlockSurfacingRecord }>,
): string | undefined {
  return digestValue('BLOCK-SURFACING-RECORD', entry);
}

function validateMechanism(value: unknown): BlockSurfacingResult<ScriptedBlockSurfacingMechanism> {
  const raw = fields(value, ['apply', 'observe', 'reachability']);
  if (
    !raw ||
    typeof raw.apply !== 'function' ||
    typeof raw.observe !== 'function' ||
    typeof raw.reachability !== 'function'
  )
    return fail('FC-AUTHORITY', 'SCRIPTED_BLOCK_MECHANISM_REQUIRED');
  let reachability: unknown;
  try {
    reachability = (raw.reachability as () => unknown)();
  } catch {
    return fail('FC-TRUST', 'SCRIPTED_BLOCK_REACHABILITY_FAILED');
  }
  const checked = fields(reachability, [
    'dispatchEnabled',
    'externalEffects',
    'noticeChannelEnabled',
    'providerEnabled',
  ]);
  if (
    checked?.providerEnabled !== false ||
    checked.dispatchEnabled !== false ||
    checked.externalEffects !== false ||
    checked.noticeChannelEnabled !== false
  )
    return fail('FC-AUTHORITY', 'SCRIPTED_BLOCK_REACHABILITY_NOT_CLOSED');
  return ok(value as ScriptedBlockSurfacingMechanism);
}

export function deriveBlockSurfacingSubjectDigest(subject: BlockSurfacingSubject): string | undefined {
  return digestValue('BLOCK-SURFACING-SUBJECT', subject);
}

export function deriveBlockSurfacingSourceDigest(
  input: Readonly<{
    subject: BlockSurfacingSubject;
    marker: BlockMarker;
    obligation: string;
    notice: string;
    criteriaDigest: string;
    boundDigest: string;
  }>,
): string | undefined {
  return digestValue('BLOCK-SURFACING-SOURCE', input);
}

export function createScriptedBlockSurfacingMechanism(
  input: unknown = { effectOutcomes: [], observationOutcomes: [], unavailable: false },
): BlockSurfacingResult<ScriptedBlockSurfacingMechanism> {
  const raw = fields(input, ['effectOutcomes', 'observationOutcomes', 'unavailable']);
  if (!raw) return fail('FC-INPUT', 'INVALID_SCRIPTED_BLOCK_MECHANISM');
  const effects = array(raw.effectOutcomes, 8);
  const observations = array(raw.observationOutcomes, 16);
  if (
    !effects ||
    !observations ||
    typeof raw.unavailable !== 'boolean' ||
    effects.some((value) => !['created', 'updated', 'uncertain', 'held', 'absent'].includes(String(value))) ||
    observations.some((value) => !['present', 'absent', 'held', 'conflict', 'uncertain'].includes(String(value)))
  )
    return fail('FC-INPUT', 'INVALID_SCRIPTED_BLOCK_OUTCOMES');
  let effectIndex = 0;
  let observationIndex = 0;
  const reachability = Object.freeze({
    providerEnabled: false as const,
    dispatchEnabled: false as const,
    externalEffects: false as const,
    noticeChannelEnabled: false as const,
  });
  return ok({
    apply(inputValue) {
      const text =
        raw.unavailable === true
          ? Object.freeze({ text: '[unavailable]', quarantined: true })
          : redactProviderText('scripted block marker');
      const outcome =
        raw.unavailable === true
          ? 'unavailable'
          : ((effects[effectIndex++] as MarkerEffectOutcome | undefined) ?? 'created');
      const result = {
        schema: BLOCK_SURFACING_EVENT_SCHEMA,
        kind: 'EV-MARKER-FACT' as const,
        operation: inputValue.operation,
        marker: inputValue.marker,
        subjectDigest: inputValue.subjectDigest,
        requestIdentity: inputValue.requestIdentity,
        authority: inputValue.authority,
        fence: inputValue.fence,
        outcome,
        observedAt: inputValue.observedAt,
        providerText: text.text,
        quarantinedProviderText: text.quarantined,
      };
      return ok(result as BlockMarkerEffect);
    },
    observe(inputValue) {
      const text = redactProviderText('scripted marker observation');
      const outcome = (observations[observationIndex++] as MarkerObservationOutcome | undefined) ?? 'present';
      return ok({
        schema: BLOCK_SURFACING_EVENT_SCHEMA,
        kind: 'EV-MARKER-OBSERVATION' as const,
        operation: inputValue.operation,
        resolvesOperation: inputValue.resolvesOperation,
        marker: inputValue.marker,
        subjectDigest: inputValue.subjectDigest,
        requestIdentity: inputValue.requestIdentity,
        authority: inputValue.authority,
        fence: inputValue.fence,
        outcome,
        observedAt: inputValue.observedAt,
        providerText: text.text,
        quarantinedProviderText: text.quarantined,
      });
    },
    reachability: () => reachability,
  });
}

export function createScriptedBlockSurfacingController(input: unknown): BlockSurfacingResult<BlockSurfacingController> {
  const raw = fields(
    input,
    ['mechanism', 'obligationBasis', 'obligationController', 'subject', 'marker'],
    ['initialSnapshot', 'waitTargetSeconds', 'observationLimit'],
  );
  if (!raw) return fail('FC-INPUT', 'INVALID_BLOCK_CONTROLLER');
  if (!raw.obligationController || !raw.obligationBasis) return fail('FC-INPUT', 'INVALID_BLOCK_CONTROLLER');
  const mechanism = validateMechanism(raw.mechanism);
  const subject = validateSubject(raw.subject);
  const marker = validateMarker(raw.marker);
  if (!mechanism.ok) return mechanism;
  if (!subject.ok) return subject;
  if (!marker.ok || (marker.value.kind === 'status' && marker.value.identity.length === 0))
    return fail('FC-INPUT', 'INVALID_BLOCK_MARKER');
  if (subject.value.request === null) return fail('FC-SUBJECT', 'BLOCK_REQUEST_REQUIRED');
  if (marker.value.kind === 'status' && subject.value.outcome !== 'Blocked' && subject.value.outcome !== 'held')
    return fail('FC-SUBJECT', 'INVALID_BLOCK_OUTCOME');
  const waitTargetSeconds = raw.waitTargetSeconds ?? 3_600;
  const observationLimit = raw.observationLimit ?? 3;
  if (
    typeof waitTargetSeconds !== 'number' ||
    !Number.isSafeInteger(waitTargetSeconds) ||
    waitTargetSeconds < BLOCK_SURFACING_WAIT_BOUNDS.targetSeconds.minimum ||
    waitTargetSeconds > BLOCK_SURFACING_WAIT_BOUNDS.targetSeconds.maximum ||
    typeof observationLimit !== 'number' ||
    !Number.isSafeInteger(observationLimit) ||
    observationLimit < BLOCK_SURFACING_WAIT_BOUNDS.observations.minimum ||
    observationLimit > BLOCK_SURFACING_WAIT_BOUNDS.observations.maximum
  )
    return fail('FC-BOUND', 'INVALID_BLOCK_WAIT_BOUND');
  const obligationController = raw.obligationController as ObligationController;
  if (
    typeof obligationController.openAllocated !== 'function' ||
    typeof obligationController.get !== 'function' ||
    typeof obligationController.expire !== 'function' ||
    typeof obligationController.snapshot !== 'function'
  )
    return fail('FC-AUTHORITY', 'OBLIGATION_CONTROLLER_REQUIRED');
  const opened = obligationController.openAllocated(raw.obligationBasis);
  if (!opened.ok) return fail(opened.error.family as BlockSurfacingFailureFamily, opened.error.code);
  const obligation = opened.value;
  const basis = fields(raw.obligationBasis, [
    'accountableOwner',
    'criteria',
    'deadline',
    'duty',
    'generation',
    'origin',
    'policyDigest',
    'preservationEvidence',
    'reason',
    'resource',
    'run',
    'startedAt',
  ]);
  const basisCriteria = basis ? fields(basis.criteria, ['claim', 'subject'], ['digest', 'schema']) : undefined;
  const obligationCriteriaDigest =
    plain(obligation.criteria) && digest(obligation.criteria.digest) ? obligation.criteria.digest : undefined;
  const obligationCriteria = plain(obligation.criteria) ? obligation.criteria : undefined;
  if (
    !basis ||
    obligation.duty !== 'surfacing' ||
    obligation.run !== subject.value.run ||
    obligation.generation !== subject.value.generation ||
    obligation.resource !== basis.resource ||
    obligation.origin !== basis.origin ||
    obligation.reason !== basis.reason ||
    !same(obligation.preservationEvidence, basis.preservationEvidence) ||
    obligation.accountableOwner !== subject.value.owner ||
    obligation.policyDigest !== basis.policyDigest ||
    obligation.startedAt !== subject.value.startedAt ||
    obligation.deadline !== subject.value.deadline ||
    obligation.run !== basis.run ||
    obligation.generation !== basis.generation ||
    obligation.startedAt !== basis.startedAt ||
    obligation.deadline !== basis.deadline ||
    !basisCriteria ||
    !obligationCriteria ||
    basisCriteria.subject !== obligationCriteria.subject ||
    basisCriteria.claim !== obligationCriteria.claim
  )
    return fail('FC-SUBJECT', 'OBLIGATION_BINDING_MISMATCH');
  const subjectDigest = deriveBlockSurfacingSubjectDigest(subject.value);
  const criteriaDigest = obligationCriteriaDigest;
  const boundDigest = digest(obligation.boundDigest) ? obligation.boundDigest : undefined;
  const noticeDigest = digestValue('BLOCK-SURFACING-NOTICE', subject.value);
  const notice = noticeDigest ? `${subject.value.run}/notice/block-surfacing/${noticeDigest}` : '';
  const sourceDigest =
    criteriaDigest &&
    boundDigest &&
    deriveBlockSurfacingSourceDigest({
      subject: subject.value,
      marker: marker.value,
      obligation: obligation.id,
      notice,
      criteriaDigest,
      boundDigest,
    });
  if (!subjectDigest || !criteriaDigest || !boundDigest || !sourceDigest)
    return fail('FC-TRUST', 'BLOCK_SOURCE_DIGEST_UNAVAILABLE');
  const source: BlockSurfacingSourceFact = deepFreeze({
    schema: BLOCK_SURFACING_EVENT_SCHEMA,
    kind: 'EV-BLOCK-SOURCE-FACT',
    subject: subject.value,
    subjectDigest,
    marker: marker.value,
    obligation: obligation.id,
    notice,
    criteriaDigest,
    boundDigest,
    sourceDigest,
  });
  let status: SurfaceStatus = 'pending';
  let journal: JournalEntry[] = [];
  let effect: BlockMarkerEffect | null = null;
  let observation: BlockMarkerObservation | null = null;
  let wait: BlockSurfacingWait | null = null;
  let reauthorization: BlockSurfacingProjection['reauthorization'] = null;
  const append = (record: BlockSurfacingRecord): BlockSurfacingResult<void> => {
    const previousDigest = journal.at(-1)?.digest ?? ZERO;
    const digestValueForRecord = journalDigest({ position: journal.length + 1, previousDigest, record });
    if (!digestValueForRecord) return fail('FC-TRUST', 'BLOCK_RECORD_DIGEST_FAILED');
    journal = [
      ...journal,
      deepFreeze({ position: journal.length + 1, previousDigest, digest: digestValueForRecord, record }),
    ];
    applyRecord(record);
    return ok(undefined);
  };
  const applyRecord = (record: BlockSurfacingRecord): void => {
    if (record.kind === 'effect') {
      if (!effect || effect.marker.identity === record.fact.marker.identity) effect = record.fact;
      if (record.fact.outcome === 'created' || record.fact.outcome === 'updated') status = 'surfaced';
      else if (record.fact.outcome === 'uncertain') status = 'reconciling';
      else if (record.fact.outcome === 'held') {
        status = 'target-wait';
        wait = {
          kind: 'BND-WAIT-TARGET',
          operation: record.fact.operation,
          correlationKey: record.fact.requestIdentity,
          startedAt: record.fact.observedAt,
          deadline: record.fact.observedAt + waitTargetSeconds,
          observations: 0,
          limit: observationLimit,
          owner: subject.value.owner,
          reason: subject.value.reason,
        };
      } else status = 'parked';
    } else if (record.kind === 'observation') {
      observation = record.fact;
      if (record.fact.outcome === 'present') {
        if (effect)
          effect = {
            ...effect,
            outcome: 'updated',
            observedAt: record.fact.observedAt,
            providerText: record.fact.providerText,
            quarantinedProviderText: record.fact.quarantinedProviderText,
          };
        status = 'surfaced';
      } else if (record.fact.outcome === 'absent') {
        if (effect)
          effect = {
            ...effect,
            outcome: 'absent',
            observedAt: record.fact.observedAt,
            providerText: record.fact.providerText,
            quarantinedProviderText: record.fact.quarantinedProviderText,
          };
        status = 'pending';
        wait = null;
      } else if (record.fact.outcome === 'held') {
        if (wait) wait = { ...wait, observations: wait.observations + 1 };
        status = 'target-wait';
      } else if (record.fact.outcome === 'uncertain')
        status = wait && wait.observations + 1 >= wait.limit ? 'parked' : 'reconciling';
      else status = 'parked';
    } else if (record.kind === 'reauthorization')
      reauthorization = { operation: record.operation, reason: record.reason, observedAt: record.observedAt };
    else if (record.kind === 'wait') {
      wait = record.wait;
      status = 'target-wait';
    } else if (record.kind === 'exhausted') {
      wait = null;
      status = 'parked';
    }
  };
  const projection = (): BlockSurfacingProjection => {
    const current = obligationController.get(obligation.id);
    const currentObligation = current.ok ? current.value : obligation;
    return deepFreeze({
      subject: subject.value,
      marker: marker.value,
      status,
      source,
      obligation: currentObligation,
      effect,
      observation,
      wait,
      reauthorization,
      releasedStories: Object.freeze([]),
      reachability: mechanism.value.reachability(),
    });
  };
  const snapshot = (): BlockSurfacingSnapshot =>
    deepFreeze({
      schema: BLOCK_SURFACING_SNAPSHOT_SCHEMA,
      subject: subject.value,
      marker: marker.value,
      source,
      obligation: obligation.id,
      obligationSnapshot: obligationController.snapshot(),
      status,
      records: journal,
      projection: projection(),
    });
  const initial = raw.initialSnapshot;
  if (initial !== undefined) {
    const snapshot = fields(initial, [
      'obligation',
      'obligationSnapshot',
      'projection',
      'records',
      'schema',
      'source',
      'status',
      'subject',
      'marker',
    ]);
    if (
      !snapshot ||
      snapshot.schema !== BLOCK_SURFACING_SNAPSHOT_SCHEMA ||
      !same(snapshot.subject, subject.value) ||
      !same(snapshot.marker, marker.value) ||
      snapshot.obligation !== obligation.id ||
      !same(snapshot.source, source) ||
      !same(snapshot.obligationSnapshot, obligationController.snapshot()) ||
      !Array.isArray(snapshot.records)
    )
      return fail('FC-TRUST', 'INVALID_BLOCK_SNAPSHOT');
    for (const item of snapshot.records) {
      if (
        !plain(item) ||
        item.position !== journal.length + 1 ||
        item.previousDigest !== (journal.at(-1)?.digest ?? ZERO) ||
        !digest(item.digest)
      )
        return fail('FC-TRUST', 'INVALID_BLOCK_JOURNAL');
      const expected = journalDigest({
        position: item.position,
        previousDigest: item.previousDigest,
        record: item.record as BlockSurfacingRecord,
      });
      if (!expected || expected !== item.digest) return fail('FC-TRUST', 'BLOCK_JOURNAL_DIGEST_MISMATCH');
      journal = [...journal, item as JournalEntry];
      applyRecord(item.record as BlockSurfacingRecord);
    }
    status = snapshot.status as SurfaceStatus;
    if (!same(snapshot.projection, projection())) return fail('FC-TRUST', 'BLOCK_PROJECTION_REPLAY_MISMATCH');
  } else {
    const basis = append({ kind: 'basis', source });
    if (!basis.ok) return basis;
  }
  const authorize = (value: unknown): BlockSurfacingResult<BlockSurfacingIntent> => {
    const rawInput = fields(value, [
      'authority',
      'explanation',
      'fence',
      'marker',
      'operation',
      'requestIdentity',
      'subject',
      'transition',
      'type',
    ]);
    const checkedMarker = rawInput ? validateMarker(rawInput.marker) : undefined;
    const checkedSubject = rawInput ? validateSubject(rawInput.subject) : undefined;
    if (
      !rawInput ||
      !identity('ID-OP', rawInput.operation) ||
      !identity('ID-TXN', rawInput.transition) ||
      !identity('ID-AUTH', rawInput.authority) ||
      !identity('ID-AUTH', rawInput.fence) ||
      !identity('ID-OP', rawInput.requestIdentity) ||
      !checkedMarker?.ok ||
      !checkedSubject?.ok ||
      !same(checkedMarker.value, marker.value) ||
      !same(checkedSubject.value, subject.value) ||
      rawInput.authority !== subject.value.authority ||
      rawInput.fence !== subject.value.fence ||
      rawInput.requestIdentity !== subject.value.request ||
      rawInput.type !== `OPC-DEL-${marker.value.kind === 'status' ? 'STATUS' : 'COMMENT'}` ||
      !boundedText(rawInput.explanation)
    )
      return fail('FC-AUTHORITY', 'INVALID_BLOCK_AUTHORIZATION');
    const existing = journal.find(
      (entry) => entry.record.kind === 'intent' && entry.record.intent.operation === rawInput.operation,
    );
    const subjectDigestValue = subjectDigest;
    const intent: BlockSurfacingIntent = deepFreeze({
      schema: BLOCK_SURFACING_EVENT_SCHEMA,
      kind: 'OPERATION-INTENT',
      operation: rawInput.operation as string,
      type: rawInput.type as BlockSurfacingIntent['type'],
      controller: BLOCK_SURFACING_CONTROLLER,
      port: BLOCK_SURFACING_PORT,
      subject: subject.value,
      subjectDigest: subjectDigestValue,
      marker: marker.value,
      authority: subject.value.authority,
      fence: subject.value.fence,
      requestIdentity: subject.value.request as string,
      transition: rawInput.transition as string,
      explanation: redactProviderText(rawInput.explanation).text,
    });
    if (existing?.record.kind === 'intent')
      return same(existing.record.intent, intent)
        ? ok(existing.record.intent)
        : fail('FC-FENCE', 'BLOCK_OPERATION_REUSE_MISMATCH');
    const appended = append({ kind: 'intent', intent });
    return appended.ok ? ok(intent) : appended;
  };
  const dispatch = (value: unknown): BlockSurfacingResult<BlockSurfacingProjection> => {
    const rawInput = fields(value, ['observedAt', 'operation'], ['reauthorization']);
    if (!rawInput || !identity('ID-OP', rawInput.operation) || !integer(rawInput.observedAt))
      return fail('FC-INPUT', 'INVALID_BLOCK_DISPATCH');
    const intentEntry = journal.find(
      (entry) => entry.record.kind === 'intent' && entry.record.intent.operation === rawInput.operation,
    );
    if (intentEntry?.record.kind !== 'intent') return fail('FC-AUTHORITY', 'BLOCK_INTENT_REQUIRED');
    if (effect && effect.outcome !== 'uncertain' && effect.outcome !== 'absent') return ok(projection());
    if (effect?.outcome === 'absent') {
      const reauth = fields(rawInput.reauthorization, ['authority', 'fence', 'reason', 'requestIdentity']);
      if (
        !reauth ||
        reauth.authority !== subject.value.authority ||
        reauth.fence !== subject.value.fence ||
        reauth.requestIdentity !== subject.value.request ||
        !boundedText(reauth.reason)
      )
        return fail('FC-FENCE', 'BLOCK_REAUTHORIZATION_REQUIRED');
      const record = append({
        kind: 'reauthorization',
        operation: rawInput.operation as string,
        reason: reauth.reason as string,
        observedAt: rawInput.observedAt as number,
      });
      if (!record.ok) return record;
    }
    const fact = mechanism.value.apply({
      operation: intentEntry.record.intent.operation,
      marker: marker.value,
      subjectDigest,
      requestIdentity: intentEntry.record.intent.requestIdentity,
      authority: subject.value.authority,
      fence: subject.value.fence,
      observedAt: rawInput.observedAt as number,
    });
    if (!fact.ok) return fail(fact.error.family, fact.error.code);
    const checked = validateEffect(fact.value);
    if (!checked.ok) return checked;
    const redacted = redactProviderText(checked.value.providerText);
    const normalized = {
      ...checked.value,
      requestIdentity: intentEntry.record.intent.requestIdentity,
      authority: subject.value.authority,
      fence: subject.value.fence,
      providerText: redacted.text,
      quarantinedProviderText: checked.value.quarantinedProviderText || redacted.quarantined,
    } as BlockMarkerEffect;
    const appended = append({ kind: 'effect', fact: deepFreeze(normalized) });
    return appended.ok ? ok(projection()) : appended;
  };
  const observe = (value: unknown): BlockSurfacingResult<BlockSurfacingProjection> => {
    const rawInput = fields(value, [
      'authority',
      'fence',
      'observedAt',
      'observationOperation',
      'operation',
      'requestIdentity',
    ]);
    if (
      !rawInput ||
      !identity('ID-OP', rawInput.operation) ||
      !identity('ID-OP', rawInput.observationOperation) ||
      rawInput.operation === rawInput.observationOperation ||
      !identity('ID-AUTH', rawInput.authority) ||
      !identity('ID-AUTH', rawInput.fence) ||
      rawInput.authority !== subject.value.authority ||
      rawInput.fence !== subject.value.fence ||
      rawInput.requestIdentity !== subject.value.request ||
      !integer(rawInput.observedAt)
    )
      return fail('FC-AUTHORITY', 'INVALID_BLOCK_OBSERVATION_AUTHORITY');
    if (!effect || (effect.outcome !== 'uncertain' && effect.outcome !== 'held'))
      return fail('FC-EFFECT', 'BLOCK_OBSERVATION_NOT_REQUIRED');
    const fact = mechanism.value.observe({
      operation: rawInput.observationOperation as string,
      resolvesOperation: rawInput.operation as string,
      marker: marker.value,
      subjectDigest,
      requestIdentity: subject.value.request as string,
      authority: subject.value.authority,
      fence: subject.value.fence,
      observedAt: rawInput.observedAt as number,
    });
    if (!fact.ok) return fail(fact.error.family, fact.error.code);
    const checked = validateObservation(fact.value);
    if (!checked.ok) return checked;
    const redacted = redactProviderText(checked.value.providerText);
    const normalized = deepFreeze({
      ...checked.value,
      requestIdentity: subject.value.request as string,
      authority: subject.value.authority,
      fence: subject.value.fence,
      providerText: redacted.text,
      quarantinedProviderText: checked.value.quarantinedProviderText || redacted.quarantined,
    });
    const appended = append({ kind: 'observation', fact: normalized });
    return appended.ok ? ok(projection()) : appended;
  };
  const wake = (value: unknown): BlockSurfacingResult<BlockSurfacingProjection> => {
    if (!wait) return fail('FC-BOUND', 'BLOCK_WAIT_NOT_ACTIVE');
    const rawInput = fields(value, [
      'authority',
      'fence',
      'observedAt',
      'observationOperation',
      'operation',
      'requestIdentity',
    ]);
    if (!rawInput || rawInput.operation !== wait.operation || rawInput.requestIdentity !== subject.value.request)
      return fail('FC-SUBJECT', 'BLOCK_WAIT_CORRELATION_MISMATCH');
    const observed = observe({
      authority: rawInput.authority,
      fence: rawInput.fence,
      observedAt: rawInput.observedAt,
      observationOperation: rawInput.observationOperation,
      operation: rawInput.operation,
      requestIdentity: rawInput.requestIdentity,
    });
    if (!observed.ok) return observed;
    const currentWait = wait;
    if (
      currentWait &&
      (Number(rawInput.observedAt) >= currentWait.deadline ||
        (wait?.observations ?? currentWait.observations) >= currentWait.limit)
    ) {
      const expired = obligationController.expire({ obligation: obligation.id, observedAt: rawInput.observedAt });
      if (!expired.ok) return fail(expired.error.family as BlockSurfacingFailureFamily, expired.error.code);
      const exhausted = append({
        kind: 'exhausted',
        operation: currentWait.operation,
        obligation: obligation.id,
        observedAt: rawInput.observedAt as number,
      });
      if (!exhausted.ok) return exhausted;
    }
    return ok(projection());
  };
  const surface = (value: unknown): BlockSurfacingResult<BlockSurfacingProjection> => {
    const rawInput = fields(value, ['authorization', 'dispatch']);
    if (!rawInput) return fail('FC-INPUT', 'INVALID_BLOCK_SURFACE');
    const authorized = authorize(rawInput.authorization);
    if (!authorized.ok) return authorized;
    const dispatchInput = fields(rawInput.dispatch, ['observedAt', 'operation'], ['reauthorization']);
    if (!dispatchInput) return fail('FC-INPUT', 'INVALID_BLOCK_SURFACE_DISPATCH');
    return dispatch({ ...dispatchInput, operation: authorized.value.operation });
  };
  return ok(
    Object.freeze({
      authorize,
      dispatch,
      observe,
      wake,
      surface,
      projection,
      snapshot,
      records: () => Object.freeze([...journal]),
      reachability: () => mechanism.value.reachability(),
    }),
  );
}

export function restoreScriptedBlockSurfacingController(
  input: unknown,
  dependencies: Readonly<{
    mechanism: ScriptedBlockSurfacingMechanism;
    obligationController: ObligationController;
    obligationBasis: BlockSurfacingObligationBasis;
    subject: BlockSurfacingSubject;
    marker: BlockMarker;
  }>,
): BlockSurfacingResult<BlockSurfacingController> {
  const raw = fields(input, [
    'obligation',
    'obligationSnapshot',
    'projection',
    'records',
    'schema',
    'source',
    'status',
    'subject',
    'marker',
  ]);
  if (!raw || raw.schema !== BLOCK_SURFACING_SNAPSHOT_SCHEMA) return fail('FC-TRUST', 'INVALID_BLOCK_SNAPSHOT');
  return createScriptedBlockSurfacingController({ ...dependencies, initialSnapshot: input });
}
