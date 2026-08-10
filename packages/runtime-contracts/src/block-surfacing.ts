import { parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';
import {
  DELIVERY_EVENT_SCHEMA,
  type DeliveryCarrier,
  type DeliverySnapshot,
  deriveDeliveryGateRequirementDigest,
  deriveDeliveryStrategyDigest,
} from './delivery.js';
import { FINALIZER_EVENT_SCHEMA } from './finalizer.js';
import type { ObligationController, ObligationSnapshot, ResidualObligation } from './obligation.js';
import { type ReviewPublicationBinding, validateReviewPublicationBinding } from './review-publication.js';

export const BLOCK_SURFACING_CONTRACT_VERSION = 'jig.block-surfacing-contract.v1';
export const BLOCK_SURFACING_SNAPSHOT_SCHEMA = 'jig.block-surfacing-snapshot.v1';
export const BLOCK_SURFACING_EVENT_SCHEMA = 'jig.block-surfacing-event.v1';
export const BLOCK_SURFACING_PORT = 'PORT-DELIVERY';
export const BLOCK_SURFACING_CONTROLLER = 'RT-CONTROLLER';
export const BLOCK_SURFACING_OPERATION = 'CP-BLOCK-SURFACING';
export const BLOCK_SURFACING_OPERATION_CLASSES = Object.freeze([
  'OPC-REV-STATUS',
  'OPC-REV-COMMENT',
  'OPC-DEL-STATUS',
  'OPC-DEL-COMMENT',
] as const);
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

export type BlockSurfacingReviewScope = Readonly<{
  kind: 'review-publication';
  binding: ReviewPublicationBinding;
}>;
export type BlockSurfacingFinalDeliveryScope = Readonly<{
  kind: 'final-delivery';
  carrier: DeliveryCarrier;
  deliverySnapshot: DeliverySnapshot;
  operation: string;
  operationType: 'OPC-DEL-STATUS' | 'OPC-DEL-COMMENT';
  requestIdentity: string;
  transition: string;
}>;
export type BlockSurfacingScope = BlockSurfacingReviewScope | BlockSurfacingFinalDeliveryScope;

export type BlockSurfacingSubject = Readonly<{
  run: string;
  story: string;
  generation: string;
  scope: BlockSurfacingScope['kind'];
  outcome: BlockOutcome;
  candidate: string | null;
  request: string | null;
  ref: string | null;
  authority: string | null;
  fence: string | null;
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
  scopeDigest: string;
  marker: BlockMarker;
  authority: string | null;
  fence: string | null;
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
  scopeDigest: string;
  requestIdentity: string;
  authority: string | null;
  fence: string | null;
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
  scopeDigest: string;
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
  scopeDigest: string;
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
      scopeDigest: string;
      requestIdentity: string;
      authority: string | null;
      fence: string | null;
      observedAt: number;
    }>,
  ): BlockSurfacingResult<BlockMarkerEffect>;
  observe(
    input: Readonly<{
      operation: string;
      resolvesOperation: string;
      marker: BlockMarker;
      subjectDigest: string;
      scopeDigest: string;
      requestIdentity: string;
      authority: string | null;
      fence: string | null;
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
  if (!raw) return fail('FC-INPUT', 'INVALID_BLOCK_MARKER');
  if (
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
    'scope',
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
    !['review-publication', 'final-delivery'].includes(String(raw.scope)) ||
    (raw.candidate !== null && !identity('ID-CAND', raw.candidate)) ||
    (raw.request !== null && !identity('ID-OP', raw.request)) ||
    (raw.ref !== null && !boundedText(raw.ref, 256)) ||
    !(
      (raw.scope === 'review-publication' &&
        raw.outcome === 'Blocked' &&
        raw.authority === null &&
        raw.fence === null) ||
      (raw.scope === 'final-delivery' &&
        raw.outcome === 'held' &&
        identity('ID-AUTH', raw.authority) &&
        identity('ID-AUTH', raw.fence))
    ) ||
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
    scope: raw.scope as BlockSurfacingScope['kind'],
    outcome: raw.outcome as BlockOutcome,
    candidate: raw.candidate as string | null,
    request: raw.request as string | null,
    ref: raw.ref as string | null,
    authority: raw.authority as string | null,
    fence: raw.fence as string | null,
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
    'scopeDigest',
    'subjectDigest',
  ]);
  const marker = raw ? validateMarker(raw.marker) : undefined;
  if (
    !raw ||
    raw.schema !== BLOCK_SURFACING_EVENT_SCHEMA ||
    raw.kind !== 'EV-MARKER-FACT' ||
    !identity('ID-OP', raw.operation) ||
    !(raw.authority === null || identity('ID-AUTH', raw.authority)) ||
    !(raw.fence === null || identity('ID-AUTH', raw.fence)) ||
    !identity('ID-OP', raw.requestIdentity) ||
    !digest(raw.subjectDigest) ||
    !digest(raw.scopeDigest) ||
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
    'scopeDigest',
    'subjectDigest',
  ]);
  const marker = raw ? validateMarker(raw.marker) : undefined;
  if (
    !raw ||
    raw.schema !== BLOCK_SURFACING_EVENT_SCHEMA ||
    raw.kind !== 'EV-MARKER-OBSERVATION' ||
    !identity('ID-OP', raw.operation) ||
    !identity('ID-OP', raw.resolvesOperation) ||
    !(raw.authority === null || identity('ID-AUTH', raw.authority)) ||
    !(raw.fence === null || identity('ID-AUTH', raw.fence)) ||
    !identity('ID-OP', raw.requestIdentity) ||
    !digest(raw.subjectDigest) ||
    !digest(raw.scopeDigest) ||
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

function validateProofJournal(value: unknown, domain: string, matches: (record: unknown) => boolean): boolean {
  const records = array(value, 4_096);
  if (!records) return false;
  let previousDigest = '0'.repeat(64);
  let matched = false;
  for (const [index, candidate] of records.entries()) {
    const entry = fields(candidate, ['digest', 'position', 'previousDigest', 'record']);
    if (!entry || entry.position !== index + 1 || entry.previousDigest !== previousDigest || !digest(entry.digest))
      return false;
    const expected = digestValue(domain, {
      position: entry.position,
      previousDigest: entry.previousDigest,
      record: entry.record,
    });
    if (!expected || expected !== entry.digest) return false;
    matched ||= matches(entry.record);
    previousDigest = entry.digest;
  }
  return matched;
}

function operationTransition(value: string): string {
  const marker = value.lastIndexOf('/op/');
  return marker > 0 ? value.slice(0, marker) : '';
}

function validateFinalDeliveryProof(
  value: unknown,
  carrier: Record<string, unknown>,
  operation: string,
  operationType: string,
  transition: string,
): value is DeliverySnapshot {
  const snapshot = fields(value, ['carrier', 'finalizerSnapshot', 'projection', 'records', 'schema', 'status']);
  const projection = snapshot
    ? fields(snapshot.projection, [
        'carrier',
        'effects',
        'finalizer',
        'intents',
        'landing',
        'observations',
        'recovery',
        'releasedStories',
        'status',
        'targetWait',
      ])
    : undefined;
  const finalizerSnapshot = snapshot
    ? fields(snapshot.finalizerSnapshot, [
        'binding',
        'projection',
        'records',
        'registryHead',
        'schema',
        'verificationSnapshot',
      ])
    : undefined;
  const finalizerProjection = finalizerSnapshot
    ? fields(finalizerSnapshot.projection, [
        'anchorRegistry',
        'authority',
        'entry',
        'pendingDeliveryOperations',
        'refreshCount',
        'status',
        'waiters',
      ])
    : undefined;
  const authority = finalizerProjection
    ? fields(finalizerProjection.authority, [
        'authority',
        'authorityGeneration',
        'candidate',
        'candidateContentDigest',
        'eligibilityBasis',
        'generation',
        'registry',
        'story',
        'target',
        'targetBasisDigest',
      ])
    : undefined;
  const entry = finalizerProjection
    ? fields(finalizerProjection.entry, [
        'authority',
        'noOp',
        'observations',
        'operation',
        'origin',
        'posture',
        'readyForDelivery',
        'requiredClasses',
        'verificationOperations',
      ])
    : undefined;
  const bindingFields = fields(carrier.binding, ['descriptor', 'registry', 'target']);
  const intents = projection ? array(projection.intents, 4_096) : undefined;
  const deliveryIntent = intents?.find((candidate) => {
    if (!plain(candidate)) return false;
    const expectedKeys = [
      'authority',
      'candidate',
      'candidateContentDigest',
      'correlationKey',
      'generation',
      'kind',
      'operation',
      'registry',
      'resourceIdentity',
      'schema',
      'strategy',
      'subject',
      'target',
      'targetBasisDigest',
      'transition',
      'type',
    ].sort();
    return (
      same(Object.keys(candidate).sort(), expectedKeys) &&
      candidate.operation === operation &&
      candidate.type === operationType
    );
  }) as Record<string, unknown> | undefined;
  const requestIntent = intents?.find((candidate) => {
    if (!plain(candidate)) return false;
    const expectedKeys = [
      'authority',
      'candidate',
      'candidateContentDigest',
      'correlationKey',
      'generation',
      'kind',
      'operation',
      'registry',
      'resourceIdentity',
      'schema',
      'strategy',
      'subject',
      'target',
      'targetBasisDigest',
      'transition',
      'type',
    ].sort();
    return same(Object.keys(candidate).sort(), expectedKeys) && candidate.type === 'OPC-DEL-REQUEST';
  }) as Record<string, unknown> | undefined;
  const requestEffect = (
    projection
      ? array(projection.effects, 4_096)?.find((candidate) => {
          const effect = fields(candidate, [
            'authority',
            'candidate',
            'candidateContentDigest',
            'correlationKey',
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
          return Boolean(
            effect &&
              effect.schema === DELIVERY_EVENT_SCHEMA &&
              effect.kind === 'EV-EFFECT-CERTAINTY' &&
              effect.type === 'OPC-DEL-REQUEST' &&
              effect.outcome === 'success' &&
              effect.target === bindingFields?.target &&
              effect.registry === bindingFields?.registry &&
              effect.generation === carrier.generation &&
              effect.authority === carrier.authority &&
              effect.candidate === carrier.candidate &&
              effect.candidateContentDigest === carrier.candidateContentDigest &&
              effect.targetBasisDigest === carrier.targetBasisDigest &&
              typeof effect.correlationKey === 'string' &&
              typeof effect.resourceIdentity === 'string',
          );
        })
      : undefined
  ) as Record<string, unknown> | undefined;
  const priorMarkerEffect = Boolean(
    projection &&
      array(projection.effects, 4_096)?.some((candidate) => {
        const effect = fields(candidate, ['kind', 'operation', 'type']);
        return (
          effect?.kind === 'EV-EFFECT-CERTAINTY' && effect.operation === operation && effect.type === operationType
        );
      }),
  );
  const carrierStrategy = fields(carrier.strategy, ['digest', 'mode']);
  const pendingDeliveryOperations = finalizerProjection
    ? array(finalizerProjection.pendingDeliveryOperations, 4_096)
    : undefined;
  const exactAuthority =
    authority &&
    authority.authority === carrier.authority &&
    authority.candidate === carrier.candidate &&
    authority.candidateContentDigest === carrier.candidateContentDigest &&
    authority.targetBasisDigest === carrier.targetBasisDigest &&
    authority.generation === carrier.generation &&
    authority.registry === (bindingFields?.registry ?? null) &&
    authority.target === (bindingFields?.target ?? null) &&
    authority.story === carrier.story;
  const exactIntent =
    deliveryIntent &&
    deliveryIntent.schema === DELIVERY_EVENT_SCHEMA &&
    deliveryIntent.operation === operation &&
    deliveryIntent.type === operationType &&
    deliveryIntent.target === bindingFields?.target &&
    deliveryIntent.registry === bindingFields?.registry &&
    deliveryIntent.candidate === carrier.candidate &&
    deliveryIntent.candidateContentDigest === carrier.candidateContentDigest &&
    deliveryIntent.targetBasisDigest === carrier.targetBasisDigest &&
    deliveryIntent.generation === carrier.generation &&
    deliveryIntent.authority === carrier.authority &&
    deliveryIntent.transition === transition &&
    typeof deliveryIntent.correlationKey === 'string' &&
    typeof deliveryIntent.resourceIdentity === 'string';
  const exactRequestIntent =
    requestIntent &&
    requestIntent.schema === DELIVERY_EVENT_SCHEMA &&
    requestIntent.operation === requestEffect?.operation &&
    requestIntent.target === bindingFields?.target &&
    requestIntent.registry === bindingFields?.registry &&
    requestIntent.candidate === carrier.candidate &&
    requestIntent.candidateContentDigest === carrier.candidateContentDigest &&
    requestIntent.targetBasisDigest === carrier.targetBasisDigest &&
    requestIntent.generation === carrier.generation &&
    requestIntent.authority === carrier.authority &&
    requestIntent.transition === operationTransition(requestIntent.operation as string) &&
    requestIntent.subject === 'target' &&
    requestIntent.strategy === carrierStrategy?.mode &&
    typeof requestIntent.correlationKey === 'string' &&
    typeof requestIntent.resourceIdentity === 'string';
  const finalizerRecord = (record: unknown): boolean => {
    const candidate = fields(record, ['authority', 'operation', 'type', 'kind']);
    return Boolean(
      candidate &&
        candidate.kind === 'delivery-intent' &&
        candidate.type === 'OPC-DEL-ANCHOR' &&
        candidate.operation === carrier.anchorOperation &&
        same(candidate.authority, authority),
    );
  };
  const finalizerTargetFact = (record: unknown): boolean => {
    const candidate = fields(record, ['fact', 'kind', 'operation', 'relatedOperation']);
    const fact = candidate
      ? fields(candidate.fact, [
          'anchorRegistry',
          'kind',
          'observedAt',
          'operation',
          'outcome',
          'registry',
          'schema',
          'target',
          'targetBasisDigest',
        ])
      : undefined;
    return Boolean(
      candidate &&
        candidate.kind === 'target-fact' &&
        candidate.operation === null &&
        candidate.relatedOperation === carrier.anchorOperation &&
        fact &&
        fact.schema === FINALIZER_EVENT_SCHEMA &&
        fact.kind === 'EV-TARGET-FACT' &&
        fact.operation === carrier.anchorOperation &&
        fact.target === bindingFields?.target &&
        fact.registry === bindingFields?.registry &&
        fact.targetBasisDigest === carrier.targetBasisDigest &&
        fact.anchorRegistry === bindingFields?.registry &&
        fact.outcome === 'present',
    );
  };
  const deliveryRecord = (record: unknown): boolean => {
    const candidate = fields(record, ['intent', 'kind']);
    return Boolean(candidate && candidate.kind === 'intent' && same(candidate.intent, deliveryIntent));
  };
  const requestEffectRecord = (record: unknown): boolean => {
    const candidate = fields(record, ['fact', 'kind']);
    return Boolean(candidate && candidate.kind === 'effect' && same(candidate.fact, requestEffect));
  };
  const requestIntentRecord = (record: unknown): boolean => {
    const candidate = fields(record, ['intent', 'kind']);
    return Boolean(candidate && candidate.kind === 'intent' && same(candidate.intent, requestIntent));
  };
  const priorMarkerEffectRecord = (record: unknown): boolean => {
    const candidate = fields(record, ['fact', 'kind']);
    const fact = candidate ? fields(candidate.fact, ['kind', 'operation', 'type']) : undefined;
    return Boolean(
      candidate &&
        candidate.kind === 'effect' &&
        fact?.kind === 'EV-EFFECT-CERTAINTY' &&
        fact.operation === operation &&
        fact.type === operationType,
    );
  };
  const proofResult = Boolean(
    snapshot &&
      snapshot.schema === 'jig.delivery-snapshot.v1' &&
      snapshot.status === projection?.status &&
      ['Ready', 'TargetWait'].includes(String(snapshot.status)) &&
      same(snapshot.carrier, carrier) &&
      projection &&
      same(projection.carrier, carrier) &&
      projection.status !== 'Landed' &&
      projection.status !== 'Parked' &&
      same(projection.finalizer, finalizerProjection) &&
      finalizerSnapshot &&
      finalizerSnapshot.schema === 'jig.finalizer-snapshot.v1' &&
      same(finalizerSnapshot.binding, carrier.binding) &&
      same(finalizerSnapshot.projection, finalizerProjection) &&
      finalizerProjection &&
      finalizerProjection.status === 'Finalizing' &&
      finalizerProjection.anchorRegistry === bindingFields?.registry &&
      pendingDeliveryOperations?.length === 0 &&
      typeof finalizerProjection.refreshCount === 'number' &&
      finalizerProjection.refreshCount >= 0 &&
      exactAuthority &&
      entry &&
      identity('ID-OP', entry.operation) &&
      ['Waiting', 'Accepted'].includes(String(entry.origin)) &&
      entry.readyForDelivery === true &&
      entry.authority &&
      same(entry.authority, authority) &&
      exactIntent &&
      !priorMarkerEffect &&
      exactRequestIntent &&
      requestEffect &&
      !validateProofJournal(snapshot.records, 'DELIVERY-RECORD', priorMarkerEffectRecord) &&
      validateProofJournal(finalizerSnapshot.records, 'FINALIZER-RECORD', finalizerTargetFact) &&
      validateProofJournal(finalizerSnapshot.records, 'FINALIZER-RECORD', finalizerRecord) &&
      validateProofJournal(snapshot.records, 'DELIVERY-RECORD', requestEffectRecord) &&
      validateProofJournal(snapshot.records, 'DELIVERY-RECORD', requestIntentRecord) &&
      validateProofJournal(snapshot.records, 'DELIVERY-RECORD', deliveryRecord),
  );
  return proofResult;
}

function validateFinalDeliveryScope(
  value: unknown,
  subject: BlockSurfacingSubject,
  marker: BlockMarker,
): BlockSurfacingResult<BlockSurfacingFinalDeliveryScope> {
  const raw = fields(value, [
    'carrier',
    'deliverySnapshot',
    'kind',
    'operation',
    'operationType',
    'requestIdentity',
    'transition',
  ]);
  const carrier = raw
    ? fields(raw.carrier, [
        'acceptedPackageDigest',
        'anchorOperation',
        'anchorTransition',
        'authority',
        'binding',
        'candidate',
        'candidateContentDigest',
        'candidatePrincipal',
        'changedPaths',
        'generation',
        'recoveryLimit',
        'remoteGate',
        'run',
        'story',
        'strategy',
        'targetBasisDigest',
        'treeDigest',
        'waitTargetSeconds',
        'workspaceCommit',
      ])
    : undefined;
  const binding = carrier ? fields(carrier.binding, ['descriptor', 'registry', 'target']) : undefined;
  const remoteGate = carrier
    ? fields(carrier.remoteGate, [
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
      ])
    : undefined;
  const strategy = carrier ? fields(carrier.strategy, ['digest', 'mode']) : undefined;
  const changedPaths = carrier ? array(carrier.changedPaths, 1_024) : undefined;
  const operationTransaction =
    raw && typeof raw.operation === 'string' ? raw.operation.slice(0, raw.operation.lastIndexOf('/op/')) : '';
  const anchorTransaction =
    carrier && typeof carrier.anchorOperation === 'string'
      ? carrier.anchorOperation.slice(0, carrier.anchorOperation.lastIndexOf('/op/'))
      : '';
  const checkedPaths = changedPaths?.every((entry) => {
    const path = fields(entry, ['contentDigest', 'path']);
    return Boolean(path && boundedText(path.path, 512) && digest(path.contentDigest));
  });
  if (!raw) return fail('FC-AUTHORITY', 'INVALID_FINAL_DELIVERY_SCOPE');
  if (
    raw.kind !== 'final-delivery' ||
    raw.operationType !== `OPC-DEL-${marker.kind === 'status' ? 'STATUS' : 'COMMENT'}` ||
    !identity('ID-OP', raw.operation) ||
    !identity('ID-OP', raw.requestIdentity) ||
    !identity('ID-TXN', raw.transition) ||
    operationTransaction !== raw.transition ||
    !carrier ||
    !binding ||
    !digest(binding.descriptor) ||
    !identity('ID-REGISTRY', binding.registry) ||
    binding.registry !== `registry/${binding.descriptor}` ||
    !identity('ID-TARGET', binding.target) ||
    !remoteGate ||
    !identity('ID-RUN', carrier.run) ||
    !identity('ID-STORY', carrier.story) ||
    carrier.story !== subject.story ||
    carrier.run !== subject.run ||
    !identity('ID-CAND', carrier.candidate) ||
    !carrier.candidate.startsWith(`${carrier.story}/cand/`) ||
    carrier.candidate !== subject.candidate ||
    !digest(carrier.candidateContentDigest) ||
    !carrier.candidate.endsWith(`|${carrier.candidateContentDigest}`) ||
    !digest(carrier.targetBasisDigest) ||
    !identity('ID-PRINCIPAL', carrier.candidatePrincipal) ||
    !identity('ID-GEN', carrier.generation) ||
    carrier.generation !== subject.generation ||
    !identity('ID-AUTH', carrier.authority) ||
    carrier.authority !== subject.authority ||
    carrier.authority !== subject.fence ||
    !identity('ID-OP', carrier.anchorOperation) ||
    !identity('ID-TXN', carrier.anchorTransition) ||
    anchorTransaction !== carrier.anchorTransition ||
    raw.requestIdentity !== carrier.anchorOperation ||
    raw.transition !== carrier.anchorTransition ||
    !digest(carrier.acceptedPackageDigest) ||
    remoteGate.schema !== 'jig.delivery-gate-requirement.v1' ||
    typeof remoteGate.required !== 'boolean' ||
    !digest(remoteGate.acceptedPackageDigest) ||
    remoteGate.acceptedPackageDigest !== carrier.acceptedPackageDigest ||
    remoteGate.candidate !== carrier.candidate ||
    !digest(remoteGate.targetBasisDigest) ||
    remoteGate.targetBasisDigest !== carrier.targetBasisDigest ||
    remoteGate.generation !== carrier.generation ||
    remoteGate.authority !== carrier.authority ||
    remoteGate.registry !== binding.registry ||
    remoteGate.target !== binding.target ||
    (remoteGate.required
      ? !boundedText(remoteGate.subject) ||
        !boundedText(remoteGate.correlationKey) ||
        !boundedText(remoteGate.resourceIdentity) ||
        !integer(remoteGate.asOf) ||
        !integer(remoteGate.maxAgeSeconds) ||
        remoteGate.maxAgeSeconds < 1 ||
        remoteGate.maxAgeSeconds > 86_400
      : remoteGate.subject !== null ||
        remoteGate.correlationKey !== null ||
        remoteGate.resourceIdentity !== null ||
        remoteGate.asOf !== null ||
        remoteGate.maxAgeSeconds !== null) ||
    deriveDeliveryGateRequirementDigest(
      Object.fromEntries(Object.entries(remoteGate).filter(([key]) => key !== 'digest')) as never,
    ) !== remoteGate.digest ||
    !strategy ||
    !['direct-fast-forward', 'merge-commit', 'squash', 'merge-queue'].includes(String(strategy.mode)) ||
    deriveDeliveryStrategyDigest(strategy.mode as never) !== strategy.digest ||
    !digest(carrier.treeDigest) ||
    !Number.isSafeInteger(carrier.waitTargetSeconds as number) ||
    (carrier.waitTargetSeconds as number) < BLOCK_SURFACING_WAIT_BOUNDS.targetSeconds.minimum ||
    (carrier.waitTargetSeconds as number) > BLOCK_SURFACING_WAIT_BOUNDS.targetSeconds.maximum ||
    !Number.isSafeInteger(carrier.recoveryLimit as number) ||
    (carrier.recoveryLimit as number) < 1 ||
    (carrier.recoveryLimit as number) > 5 ||
    !changedPaths ||
    !checkedPaths ||
    (carrier.workspaceCommit !== null && !boundedText(carrier.workspaceCommit, 256))
  )
    return fail('FC-AUTHORITY', 'INVALID_FINAL_DELIVERY_SCOPE');
  if (
    !validateFinalDeliveryProof(
      raw.deliverySnapshot,
      carrier,
      raw.operation as string,
      raw.operationType as string,
      raw.transition as string,
    )
  )
    return fail('FC-AUTHORITY', 'FINAL_DELIVERY_PROVENANCE_REQUIRED');
  return ok({
    kind: 'final-delivery',
    carrier: carrier as unknown as DeliveryCarrier,
    deliverySnapshot: raw.deliverySnapshot as DeliverySnapshot,
    operation: raw.operation as string,
    operationType: raw.operationType as BlockSurfacingFinalDeliveryScope['operationType'],
    requestIdentity: raw.requestIdentity as string,
    transition: raw.transition as string,
  });
}

function validateSurfacingScope(
  value: unknown,
  subject: BlockSurfacingSubject,
  marker: BlockMarker,
): BlockSurfacingResult<BlockSurfacingScope> {
  const raw = fields(
    value,
    ['kind'],
    ['binding', 'carrier', 'deliverySnapshot', 'operation', 'operationType', 'requestIdentity', 'transition'],
  );
  if (!raw) return fail('FC-AUTHORITY', 'BLOCK_SCOPE_REQUIRED');
  if (raw.kind === 'review-publication') {
    const binding = validateReviewPublicationBinding(raw.binding);
    const expectedType = `OPC-REV-${marker.kind === 'status' ? 'STATUS' : 'COMMENT'}`;
    if (
      !binding.ok ||
      subject.scope !== 'review-publication' ||
      subject.outcome !== 'Blocked' ||
      subject.candidate === null ||
      binding.value.operationType !== expectedType ||
      binding.value.subject.run !== subject.run ||
      binding.value.subject.story !== subject.story ||
      binding.value.subject.candidate !== subject.candidate ||
      binding.value.request.identity !== subject.request ||
      binding.value.request.draft !== true ||
      binding.value.request.mergeable !== false ||
      binding.value.markers[marker.kind] !== marker.context ||
      binding.value.transition.lifecycle !== 'Blocked' ||
      binding.value.transition.authorizer !== 'CP-TRANSITION' ||
      binding.value.transition.controller !== BLOCK_SURFACING_CONTROLLER ||
      binding.value.fence.generation !== subject.generation ||
      binding.value.authority !== null
    )
      return fail('FC-AUTHORITY', 'INVALID_REVIEW_PUBLICATION_SCOPE');
    return ok({ kind: 'review-publication', binding: binding.value });
  }
  if (raw.kind === 'final-delivery') return validateFinalDeliveryScope(value, subject, marker);
  return fail('FC-AUTHORITY', 'UNKNOWN_BLOCK_SCOPE');
}

export function deriveBlockSurfacingSubjectDigest(subject: BlockSurfacingSubject): string | undefined {
  return digestValue('BLOCK-SURFACING-SUBJECT', subject);
}

export function deriveBlockSurfacingScopeDigest(scope: BlockSurfacingScope): string | undefined {
  return digestValue('BLOCK-SURFACING-SCOPE', scope);
}

export function deriveBlockSurfacingSourceDigest(
  input: Readonly<{
    subject: BlockSurfacingSubject;
    scopeDigest: string;
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
        scopeDigest: inputValue.scopeDigest,
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
        scopeDigest: inputValue.scopeDigest,
        requestIdentity: inputValue.requestIdentity,
        authority: inputValue.authority,
        fence: inputValue.fence,
        outcome,
        observedAt: inputValue.observedAt,
        providerText: text.text,
        quarantinedProviderText: text.quarantined,
      } as BlockMarkerObservation);
    },
    reachability: () => reachability,
  });
}

export function createScriptedBlockSurfacingController(input: unknown): BlockSurfacingResult<BlockSurfacingController> {
  const raw = fields(
    input,
    ['mechanism', 'obligationBasis', 'obligationController', 'subject', 'marker', 'scope'],
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
  const scope = validateSurfacingScope(raw.scope, subject.value, marker.value);
  if (!scope.ok) return scope;
  if (scope.value.kind !== subject.value.scope) return fail('FC-AUTHORITY', 'BLOCK_SCOPE_SUBJECT_MISMATCH');
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
  const scopeDigest = deriveBlockSurfacingScopeDigest(scope.value);
  const criteriaDigest = obligationCriteriaDigest;
  const boundDigest = digest(obligation.boundDigest) ? obligation.boundDigest : undefined;
  const noticeDigest = digestValue('BLOCK-SURFACING-NOTICE', subject.value);
  const notice = noticeDigest ? `${subject.value.run}/notice/block-surfacing/${noticeDigest}` : '';
  const sourceDigest =
    criteriaDigest &&
    boundDigest &&
    deriveBlockSurfacingSourceDigest({
      subject: subject.value,
      scopeDigest: scopeDigest as string,
      marker: marker.value,
      obligation: obligation.id,
      notice,
      criteriaDigest,
      boundDigest,
    });
  if (!subjectDigest || !scopeDigest || !criteriaDigest || !boundDigest || !sourceDigest)
    return fail('FC-TRUST', 'BLOCK_SOURCE_DIGEST_UNAVAILABLE');
  const source: BlockSurfacingSourceFact = deepFreeze({
    schema: BLOCK_SURFACING_EVENT_SCHEMA,
    kind: 'EV-BLOCK-SOURCE-FACT',
    subject: subject.value,
    subjectDigest,
    scopeDigest,
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
        wait = null;
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
      'scope',
      'subject',
      'transition',
      'type',
    ]);
    const checkedMarker = rawInput ? validateMarker(rawInput.marker) : undefined;
    const checkedSubject = rawInput ? validateSubject(rawInput.subject) : undefined;
    const checkedScope = rawInput ? validateSurfacingScope(rawInput.scope, subject.value, marker.value) : undefined;
    const expectedOperation =
      scope.value.kind === 'review-publication' ? scope.value.binding.operation : scope.value.operation;
    const expectedTransition =
      scope.value.kind === 'review-publication'
        ? scope.value.binding.transition.proof.transaction
        : scope.value.transition;
    const expectedType = `OPC-${scope.value.kind === 'review-publication' ? 'REV' : 'DEL'}-${marker.value.kind === 'status' ? 'STATUS' : 'COMMENT'}`;
    if (
      !rawInput ||
      !identity('ID-OP', rawInput.operation) ||
      !identity('ID-TXN', rawInput.transition) ||
      !identity('ID-OP', rawInput.requestIdentity) ||
      !checkedMarker?.ok ||
      !checkedSubject?.ok ||
      !checkedScope?.ok ||
      checkedScope.value.kind !== scope.value.kind ||
      !same(checkedMarker.value, marker.value) ||
      !same(checkedSubject.value, subject.value) ||
      !same(checkedScope.value, scope.value) ||
      rawInput.authority !== subject.value.authority ||
      rawInput.fence !== subject.value.fence ||
      rawInput.requestIdentity !== subject.value.request ||
      rawInput.operation !== expectedOperation ||
      rawInput.transition !== expectedTransition ||
      rawInput.type !== expectedType ||
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
      scopeDigest,
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
    if (effect?.outcome === 'uncertain') return fail('FC-EFFECT', 'BLOCK_UNCERTAIN_REQUIRES_OBSERVATION');
    if (effect && effect.outcome !== 'absent') return ok(projection());
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
      scopeDigest,
      requestIdentity: intentEntry.record.intent.requestIdentity,
      authority: subject.value.authority,
      fence: subject.value.fence,
      observedAt: rawInput.observedAt as number,
    });
    if (!fact.ok) return fail(fact.error.family, fact.error.code);
    const checked = validateEffect(fact.value);
    if (!checked.ok) return checked;
    if (checked.value.scopeDigest !== scopeDigest) return fail('FC-FENCE', 'BLOCK_SCOPE_DIGEST_MISMATCH');
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
      !(rawInput.authority === null || identity('ID-AUTH', rawInput.authority)) ||
      !(rawInput.fence === null || identity('ID-AUTH', rawInput.fence)) ||
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
      scopeDigest,
      requestIdentity: subject.value.request as string,
      authority: subject.value.authority,
      fence: subject.value.fence,
      observedAt: rawInput.observedAt as number,
    });
    if (!fact.ok) return fail(fact.error.family, fact.error.code);
    const checked = validateObservation(fact.value);
    if (!checked.ok) return checked;
    if (checked.value.scopeDigest !== scopeDigest) return fail('FC-FENCE', 'BLOCK_SCOPE_DIGEST_MISMATCH');
    const redacted = redactProviderText(checked.value.providerText);
    const normalized = deepFreeze({
      ...checked.value,
      requestIdentity: subject.value.request as string,
      authority: subject.value.authority,
      fence: subject.value.fence,
      providerText: redacted.text,
      quarantinedProviderText: checked.value.quarantinedProviderText || redacted.quarantined,
    }) as BlockMarkerObservation;
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
    scope: BlockSurfacingScope;
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
