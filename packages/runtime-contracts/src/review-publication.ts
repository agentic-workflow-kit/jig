import { type CanonicalJson, parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';
import {
  OBLIGATION_BOUND,
  type ObligationController,
  obligationBoundDigest,
  obligationCriteriaDigest,
} from './obligation.js';

export const REVIEW_PUBLICATION_CONTRACT_VERSION = 'jig.review-publication.v1';
export const REVIEW_PUBLICATION_PORT = 'PORT-DELIVERY';
export const REVIEW_PUBLICATION_CAPABILITY = 'CB-REVIEW-PUBLICATION';
export const REVIEW_PUBLICATION_MODES = Object.freeze(['required-venue', 'no-venue'] as const);
export type ReviewPublicationMode = (typeof REVIEW_PUBLICATION_MODES)[number];

export const REVIEW_PUBLICATION_OPERATION_TYPES = Object.freeze([
  'OPC-REV-PUBLISH',
  'OPC-REV-REQUEST',
  'OPC-REV-STATUS',
  'OPC-REV-COMMENT',
  'OPC-REV-RETIRE-REF',
  'OPC-REV-RETIRE-REQUEST',
  'OPC-REV-RETIRE-STATUS',
  'OPC-REV-RETIRE-COMMENT',
] as const);
export type ReviewPublicationOperationType = (typeof REVIEW_PUBLICATION_OPERATION_TYPES)[number];
export const REVIEW_PUBLICATION_OPERATION_EFFECT = 'effectful' as const;
export const REVIEW_PUBLICATION_REVIEW_OPERATIONS = Object.freeze(REVIEW_PUBLICATION_OPERATION_TYPES.slice(0, 4));
export const REVIEW_PUBLICATION_RETIRE_OPERATIONS = Object.freeze(REVIEW_PUBLICATION_OPERATION_TYPES.slice(4));
export const REVIEW_PUBLICATION_BOUNDS = Object.freeze({ waitMs: 900_000, retryLimit: 3, recoveryLimit: 3 });
const RETIREMENT_ATTEMPT_BOUND = REVIEW_PUBLICATION_BOUNDS.retryLimit;

export type ReviewPublicationFailureFamily =
  | 'FC-INPUT'
  | 'FC-SUBJECT'
  | 'FC-FENCE'
  | 'FC-AUTHORITY'
  | 'FC-MECHANISM'
  | 'FC-EFFECT'
  | 'FC-BOUND'
  | 'FC-TRUST';
export type ReviewPublicationFailure = Readonly<{ family: ReviewPublicationFailureFamily; code: string }>;
export type ReviewPublicationResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: ReviewPublicationFailure }>;

export type ReviewPublicationSubject = Readonly<{
  run: string;
  story: string;
  basis: string;
  repository: string;
  candidate: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
}>;
export type ReviewPublicationFence = Readonly<{
  generation: string;
  basis: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
}>;
export type ReviewPublicationRequest = Readonly<{
  identity: string;
  marker: string;
  draft: true;
  mergeable: false;
}>;
export type ReviewPublicationMarkers = Readonly<{ status: string; comment: string }>;
export type ReviewPublicationTransition = Readonly<{
  kind: 'review-publication-transition';
  authorizer: 'CP-TRANSITION';
  controller: 'RT-CONTROLLER';
  lifecycle: 'Reviewing' | 'Blocked' | 'Settled' | 'Stopped';
  operation: string;
  proof: ReviewPublicationCommitProof;
}>;
export type ReviewPublicationPreservation = Readonly<{
  kind: 'review-venue-preservation';
  status: 'preserved';
  venueDigest: string;
  evidenceDigest: string;
}>;

/** The D15 carrier. It intentionally has no ID-AUTH or target authority field. */
export type ReviewPublicationBinding = Readonly<{
  operation: string;
  operationType: ReviewPublicationOperationType;
  mode: 'required-venue';
  subject: ReviewPublicationSubject;
  repository: string;
  candidate: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
  providerIdentity: string;
  sourceRef: string;
  targetRef: string;
  reviewRef: string;
  request: ReviewPublicationRequest;
  markers: ReviewPublicationMarkers;
  explanationDigest: string;
  fence: ReviewPublicationFence;
  generation: string;
  manifest: string;
  transition: ReviewPublicationTransition;
  authority: null;
}>;

export type ReviewPublicationCommitProof = Readonly<{
  kind: 'committed-witnessed';
  position: number;
  event: string;
  transaction: string;
  operation: string;
  recordDigest: string;
  witnessDigest: string;
}>;
export type ReviewPublicationOperationIntent = Readonly<{
  version: typeof REVIEW_PUBLICATION_CONTRACT_VERSION;
  operation: string;
  operationType: ReviewPublicationOperationType;
  effect: typeof REVIEW_PUBLICATION_OPERATION_EFFECT;
  port: typeof REVIEW_PUBLICATION_PORT;
  capability: typeof REVIEW_PUBLICATION_CAPABILITY;
  binding: ReviewPublicationBinding;
  proof: ReviewPublicationCommitProof;
  waitMs: number;
  retryLimit: number;
  recoveryLimit: number;
}>;
export type ReviewPublicationReauthorization = Readonly<{
  version: typeof REVIEW_PUBLICATION_CONTRACT_VERSION;
  operation: string;
  previousAttempt: number;
  attempt: number;
  confirmedAbsenceDigest: string;
  binding: ReviewPublicationBinding;
  capabilityDigest: string;
  generation: string;
  fence: ReviewPublicationFence;
  proof: ReviewPublicationCommitProof;
}>;
export type ReviewPublicationTransitionSnapshot = Readonly<{
  intents: readonly ReviewPublicationOperationIntent[];
  reauthorizations: readonly ReviewPublicationReauthorization[];
}>;

export type ReviewPublicationAttestation = Readonly<{
  version: typeof REVIEW_PUBLICATION_CONTRACT_VERSION;
  provider: 'fixture-only';
  operation: string;
  operationType: ReviewPublicationOperationType;
  port: typeof REVIEW_PUBLICATION_PORT;
  capability: typeof REVIEW_PUBLICATION_CAPABILITY;
  binding: ReviewPublicationBinding;
  providerRevision: string;
  effectKind: 'published' | 'retired';
  draft: true;
  mergeable: false;
  reviewRef: string;
  requestIdentity: string;
  statusMarker: string;
  commentMarker: string;
  explanationDigest: string;
  effectDigest: string;
  proof: ReviewPublicationCommitProof;
  successClaim: 'observed';
}>;

export type RequiredVenueObservation = Readonly<{
  version: typeof REVIEW_PUBLICATION_CONTRACT_VERSION;
  kind: 'review-publication-observation';
  mode: 'required-venue';
  subject: ReviewPublicationSubject;
  providerIdentity: string;
  sourceRef: string;
  targetRef: string;
  reviewRef: string;
  request: ReviewPublicationRequest;
  markers: ReviewPublicationMarkers;
  explanationDigest: string;
  providerRevision: string;
  operations: readonly Readonly<{
    operation: string;
    operationType: ReviewPublicationOperationType;
    generation: string;
    capabilityDigest: string;
    effect: 'confirmed-effect';
  }>[];
  manifest: string;
  capabilityDigest: string;
  draft: true;
  mergeable: false;
  observationDigest: string;
}>;
export type ExplicitAbsenceObservation = Readonly<{
  version: typeof REVIEW_PUBLICATION_CONTRACT_VERSION;
  kind: 'review-publication-observation';
  mode: 'no-venue';
  subject: ReviewPublicationSubject;
  absence: 'explicit-no-venue';
  observationDigest: string;
}>;
export type ReviewPublicationObservation = RequiredVenueObservation | ExplicitAbsenceObservation;

export type ReviewPublicationFault =
  | 'none'
  | 'mechanism-absence'
  | 'lost-response'
  | 'lost-response-confirmed-effect'
  | 'lost-response-confirmed-absence'
  | 'contradictory-result'
  | 'invalid-attestation';
export type ReviewPublicationInvocation = Readonly<{
  operation: string;
  operationType: ReviewPublicationOperationType;
  attempt: number;
  effect: 'effectful';
  result: 'returned' | 'mechanism-absent' | 'lost-response' | 'invalid';
}>;
export type ReviewPublicationLookup = Readonly<{
  operation: string;
  binding: ReviewPublicationBinding;
  outcome: 'confirmed-effect' | 'confirmed-absence' | 'indeterminate';
  resourceState: 'present' | 'absent';
  observationDigest: string;
  providerRevision: string | null;
}>;
export type ScriptedReviewPublicationFixtureOptions = Readonly<{
  retirementResourceState?: 'present' | 'absent';
}>;
export type ScriptedReviewPublicationFixture = Readonly<{
  dispatch(input: unknown): ReviewPublicationResult<ReviewPublicationAttestation>;
  lookup(input: unknown): ReviewPublicationResult<ReviewPublicationLookup>;
  invocations(): readonly ReviewPublicationInvocation[];
  reachability(): Readonly<{ providerEnabled: false; dispatchEnabled: false; status: 'unavailable' }>;
}>;
export type ReviewPublicationTransitionRecorder = Readonly<{
  authorize(input: unknown): ReviewPublicationResult<ReviewPublicationCommitProof>;
  recordIntent(input: unknown): ReviewPublicationResult<ReviewPublicationCommitProof>;
  recordReauthorization(input: unknown): ReviewPublicationResult<ReviewPublicationCommitProof>;
  intents(): readonly ReviewPublicationOperationIntent[];
  reauthorizations(): readonly ReviewPublicationReauthorization[];
  snapshot(): ReviewPublicationTransitionSnapshot;
}>;
export type ReviewPublicationTrustedVerifier = Readonly<{
  verify(input: unknown): ReviewPublicationResult<void>;
}>;
export type ReviewPublicationPreservationVerifier = Readonly<{
  verify(input: unknown): ReviewPublicationResult<void>;
}>;
export type ReviewPublicationObligationController = ObligationController;

const DIGEST = /^[0-9a-f]{64}$/u;
const SECRET = /(?:secret|token|password|credential|authorization|api[._ -]?key)/iu;
const MAX_TEXT = 512;
const ok = <T>(value: T): ReviewPublicationResult<T> => Object.freeze({ ok: true, value });
const fail = <T = never>(family: ReviewPublicationFailureFamily, code: string): ReviewPublicationResult<T> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });
const safeText = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= MAX_TEXT &&
  value.normalize('NFC') === value &&
  !SECRET.test(value);
const safeDigest = (value: unknown): value is string => typeof value === 'string' && DIGEST.test(value);
const safeRef = (value: unknown): value is string => safeText(value) && value.startsWith('refs/');
const identity = (kind: string, value: unknown): value is string =>
  typeof value === 'string' && parseIdentity(kind, value).ok;
const lookupAttestations = new WeakMap<object, ReviewPublicationLookup>();
const validReviewPublicationLookup = (
  value: ReviewPublicationLookup,
  operation: string,
  binding: ReviewPublicationBinding,
): boolean => {
  if (typeof value !== 'object' || value === null) return false;
  const attestation = lookupAttestations.get(value);
  if (!attestation) return false;
  const expectedDigest = digest('REVIEW-PUBLICATION-LOOKUP', {
    operation: attestation.operation,
    binding: attestation.binding,
    outcome: attestation.outcome,
    resourceState: attestation.resourceState,
    providerRevision: attestation.providerRevision,
  });
  return (
    attestation === value &&
    attestation.operation === operation &&
    same(attestation.binding, binding) &&
    (attestation.outcome === 'confirmed-effect' ||
      attestation.outcome === 'confirmed-absence' ||
      attestation.outcome === 'indeterminate') &&
    (attestation.resourceState === 'present' || attestation.resourceState === 'absent') &&
    (attestation.providerRevision === null || safeDigest(attestation.providerRevision)) &&
    safeDigest(attestation.observationDigest) &&
    expectedDigest !== undefined &&
    attestation.observationDigest === expectedDigest
  );
};
const issueReviewPublicationLookup = (value: ReviewPublicationLookup): ReviewPublicationLookup => {
  const issued = Object.freeze(value);
  lookupAttestations.set(issued, issued);
  return issued;
};
const exactFields = (value: unknown, names: readonly string[]): Record<string, unknown> | undefined => {
  try {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.keys(descriptors).sort().join('\0') !== [...names].sort().join('\0')) return undefined;
    if (!Object.values(descriptors).every((descriptor) => 'value' in descriptor && !descriptor.get && !descriptor.set))
      return undefined;
    return Object.fromEntries(names.map((name) => [name, descriptors[name].value]));
  } catch {
    return undefined;
  }
};
const digest = (domain: string, value: unknown): string | undefined => {
  try {
    const result = stageDigest({ domain, excludePaths: [], value: value as CanonicalJson });
    return result.ok ? result.value.digest : undefined;
  } catch {
    return undefined;
  }
};
const same = (left: unknown, right: unknown): boolean => {
  const leftDigest = digest('REVIEW-PUBLICATION-COMPARE', left);
  const rightDigest = digest('REVIEW-PUBLICATION-COMPARE', right);
  return leftDigest !== undefined && leftDigest === rightDigest;
};
const operationType = (value: unknown): value is ReviewPublicationOperationType =>
  typeof value === 'string' && REVIEW_PUBLICATION_OPERATION_TYPES.includes(value as ReviewPublicationOperationType);
const isRetirement = (value: ReviewPublicationOperationType): boolean => value.startsWith('OPC-REV-RETIRE-');
const proofCoordinates = (
  operation: string,
  run: string,
): Readonly<{ position: number; event: string; transaction: string }> | undefined => {
  const transaction = operation.slice(0, operation.lastIndexOf('/op/'));
  const prefix = `${run}/txn/`;
  if (!transaction.startsWith(prefix)) return undefined;
  const ordinalText = transaction.slice(prefix.length, transaction.indexOf('/', prefix.length));
  const ordinal = Number(ordinalText);
  return /^\d+$/u.test(ordinalText) && Number.isSafeInteger(ordinal) && ordinal > 0
    ? Object.freeze({ position: ordinal - 1, event: `${run}/event/${ordinal}`, transaction })
    : undefined;
};

const parseSubject = (value: unknown): ReviewPublicationSubject | undefined => {
  const raw = exactFields(value, [
    'run',
    'story',
    'basis',
    'repository',
    'candidate',
    'candidateContentDigest',
    'targetBasisDigest',
  ]);
  if (
    !raw ||
    !identity('ID-RUN', raw.run) ||
    !identity('ID-STORY', raw.story) ||
    !raw.story.startsWith(`${raw.run}/story/`) ||
    !identity('ID-CAND', raw.candidate) ||
    !raw.candidate.startsWith(`${raw.story}/cand/`) ||
    !safeDigest(raw.basis) ||
    !safeText(raw.repository) ||
    !safeDigest(raw.candidateContentDigest) ||
    !safeDigest(raw.targetBasisDigest)
  )
    return undefined;
  if (!raw.candidate.endsWith(`|${raw.candidateContentDigest}`)) return undefined;
  return Object.freeze({
    run: raw.run,
    story: raw.story,
    basis: raw.basis,
    repository: raw.repository,
    candidate: raw.candidate,
    candidateContentDigest: raw.candidateContentDigest,
    targetBasisDigest: raw.targetBasisDigest,
  });
};

const parseFence = (value: unknown, subject: ReviewPublicationSubject): ReviewPublicationFence | undefined => {
  const raw = exactFields(value, ['generation', 'basis', 'candidateContentDigest', 'targetBasisDigest']);
  return raw &&
    identity('ID-GEN', raw.generation) &&
    safeDigest(raw.basis) &&
    raw.basis === subject.basis &&
    safeDigest(raw.candidateContentDigest) &&
    raw.candidateContentDigest === subject.candidateContentDigest &&
    safeDigest(raw.targetBasisDigest) &&
    raw.targetBasisDigest === subject.targetBasisDigest
    ? Object.freeze({
        generation: raw.generation as string,
        basis: raw.basis,
        candidateContentDigest: raw.candidateContentDigest,
        targetBasisDigest: raw.targetBasisDigest,
      })
    : undefined;
};
const parseRequest = (value: unknown): ReviewPublicationRequest | undefined => {
  const raw = exactFields(value, ['identity', 'marker', 'draft', 'mergeable']);
  return raw && safeText(raw.identity) && safeText(raw.marker) && raw.draft === true && raw.mergeable === false
    ? Object.freeze({ identity: raw.identity, marker: raw.marker, draft: true, mergeable: false })
    : undefined;
};
const parseMarkers = (value: unknown): ReviewPublicationMarkers | undefined => {
  const raw = exactFields(value, ['status', 'comment']);
  return raw && safeText(raw.status) && safeText(raw.comment)
    ? Object.freeze({ status: raw.status, comment: raw.comment })
    : undefined;
};

const parseTransition = (value: unknown, operation: string, run: string): ReviewPublicationTransition | undefined => {
  const raw = exactFields(value, ['kind', 'authorizer', 'controller', 'lifecycle', 'operation', 'proof']);
  const proof = raw && parseProof(raw.proof, operation, run);
  return raw && proof && raw.kind === 'review-publication-transition' && raw.authorizer === 'CP-TRANSITION'
    ? raw.controller === 'RT-CONTROLLER' &&
      ['Reviewing', 'Blocked', 'Settled', 'Stopped'].includes(raw.lifecycle as string) &&
      raw.operation === operation
      ? Object.freeze({
          kind: 'review-publication-transition' as const,
          authorizer: 'CP-TRANSITION' as const,
          controller: 'RT-CONTROLLER' as const,
          lifecycle: raw.lifecycle as ReviewPublicationTransition['lifecycle'],
          operation,
          proof,
        })
      : undefined
    : undefined;
};

export function validateReviewPublicationBinding(value: unknown): ReviewPublicationResult<ReviewPublicationBinding> {
  const raw = exactFields(value, [
    'operation',
    'operationType',
    'mode',
    'subject',
    'repository',
    'candidate',
    'candidateContentDigest',
    'targetBasisDigest',
    'providerIdentity',
    'sourceRef',
    'targetRef',
    'reviewRef',
    'request',
    'markers',
    'explanationDigest',
    'fence',
    'generation',
    'manifest',
    'transition',
    'authority',
  ]);
  const subject = raw && parseSubject(raw.subject);
  const fence = raw && subject && parseFence(raw.fence, subject);
  const request = raw && parseRequest(raw.request);
  const markers = raw && parseMarkers(raw.markers);
  const transition =
    raw && subject && identity('ID-OP', raw.operation) && parseTransition(raw.transition, raw.operation, subject.run);
  if (
    !raw ||
    !subject ||
    !fence ||
    !request ||
    !markers ||
    !operationType(raw.operationType) ||
    !identity('ID-OP', raw.operation) ||
    !raw.operation.startsWith(`${subject.run}/txn/`) ||
    raw.mode !== 'required-venue' ||
    raw.repository !== subject.repository ||
    raw.candidate !== subject.candidate ||
    raw.candidateContentDigest !== subject.candidateContentDigest ||
    raw.targetBasisDigest !== subject.targetBasisDigest ||
    !safeText(raw.providerIdentity) ||
    !safeRef(raw.sourceRef) ||
    !safeRef(raw.targetRef) ||
    !safeText(raw.reviewRef) ||
    !safeDigest(raw.explanationDigest) ||
    !identity('ID-MANIFEST', raw.manifest) ||
    raw.generation !== fence.generation ||
    !transition ||
    raw.authority !== null
  )
    return fail('FC-INPUT', 'INVALID_REVIEW_PUBLICATION_BINDING');
  return ok(
    Object.freeze({
      operation: raw.operation,
      operationType: raw.operationType as ReviewPublicationOperationType,
      mode: 'required-venue',
      subject,
      repository: raw.repository,
      candidate: raw.candidate,
      candidateContentDigest: raw.candidateContentDigest,
      targetBasisDigest: raw.targetBasisDigest,
      providerIdentity: raw.providerIdentity,
      sourceRef: raw.sourceRef,
      targetRef: raw.targetRef,
      reviewRef: raw.reviewRef,
      request,
      markers,
      explanationDigest: raw.explanationDigest,
      fence,
      generation: raw.generation,
      manifest: raw.manifest,
      transition,
      authority: null,
    }),
  );
}

const parseProof = (value: unknown, operation: string, run: string): ReviewPublicationCommitProof | undefined => {
  const raw = exactFields(value, [
    'kind',
    'position',
    'event',
    'transaction',
    'operation',
    'recordDigest',
    'witnessDigest',
  ]);
  const coordinates = proofCoordinates(operation, run);
  if (
    !raw ||
    raw.kind !== 'committed-witnessed' ||
    !coordinates ||
    raw.position !== coordinates.position ||
    raw.event !== coordinates.event ||
    raw.transaction !== coordinates.transaction ||
    raw.operation !== operation ||
    !identity('ID-EVENT', raw.event) ||
    !identity('ID-TXN', raw.transaction) ||
    !identity('ID-OP', operation) ||
    !safeDigest(raw.recordDigest) ||
    raw.recordDigest !== raw.witnessDigest
  )
    return undefined;
  return Object.freeze({
    kind: 'committed-witnessed',
    position: raw.position,
    event: raw.event,
    transaction: raw.transaction,
    operation,
    recordDigest: raw.recordDigest,
    witnessDigest: raw.witnessDigest,
  });
};

const validateIntent = (value: unknown): ReviewPublicationResult<ReviewPublicationOperationIntent> => {
  const raw = exactFields(value, [
    'version',
    'operation',
    'operationType',
    'effect',
    'port',
    'capability',
    'binding',
    'proof',
    'waitMs',
    'retryLimit',
    'recoveryLimit',
  ]);
  const binding = raw && validateReviewPublicationBinding(raw.binding);
  const proof =
    raw && binding?.ok ? parseProof(raw.proof, raw.operation as string, binding.value.subject.run) : undefined;
  if (
    !raw ||
    !binding?.ok ||
    !proof ||
    raw.version !== REVIEW_PUBLICATION_CONTRACT_VERSION ||
    raw.operation !== binding.value.operation ||
    raw.operationType !== binding.value.operationType ||
    raw.effect !== 'effectful' ||
    raw.port !== REVIEW_PUBLICATION_PORT ||
    raw.capability !== REVIEW_PUBLICATION_CAPABILITY ||
    raw.waitMs !== REVIEW_PUBLICATION_BOUNDS.waitMs ||
    raw.retryLimit !== REVIEW_PUBLICATION_BOUNDS.retryLimit ||
    raw.recoveryLimit !== REVIEW_PUBLICATION_BOUNDS.recoveryLimit
  )
    return fail('FC-AUTHORITY', 'INVALID_REVIEW_PUBLICATION_INTENT');
  return ok(
    Object.freeze({
      version: REVIEW_PUBLICATION_CONTRACT_VERSION,
      operation: raw.operation,
      operationType: raw.operationType as ReviewPublicationOperationType,
      effect: 'effectful',
      port: REVIEW_PUBLICATION_PORT,
      capability: REVIEW_PUBLICATION_CAPABILITY,
      binding: binding.value,
      proof,
      waitMs: REVIEW_PUBLICATION_BOUNDS.waitMs,
      retryLimit: REVIEW_PUBLICATION_BOUNDS.retryLimit,
      recoveryLimit: REVIEW_PUBLICATION_BOUNDS.recoveryLimit,
    }),
  );
};

const ATTESTATION_FIELDS = [
  'version',
  'provider',
  'operation',
  'operationType',
  'port',
  'capability',
  'binding',
  'providerRevision',
  'effectKind',
  'draft',
  'mergeable',
  'reviewRef',
  'requestIdentity',
  'statusMarker',
  'commentMarker',
  'explanationDigest',
  'effectDigest',
  'proof',
  'successClaim',
] as const;
export function validateReviewPublicationAttestation(
  value: unknown,
  intent: ReviewPublicationOperationIntent,
): ReviewPublicationResult<ReviewPublicationAttestation> {
  const raw = exactFields(value, ATTESTATION_FIELDS);
  const binding = raw && validateReviewPublicationBinding(raw.binding);
  const proof = raw && binding?.ok ? parseProof(raw.proof, intent.operation, intent.binding.subject.run) : undefined;
  if (
    !raw ||
    !binding?.ok ||
    !proof ||
    raw.version !== REVIEW_PUBLICATION_CONTRACT_VERSION ||
    raw.provider !== 'fixture-only' ||
    raw.operation !== intent.operation ||
    raw.operationType !== intent.operationType ||
    raw.port !== REVIEW_PUBLICATION_PORT ||
    raw.capability !== REVIEW_PUBLICATION_CAPABILITY ||
    !same(binding.value, intent.binding) ||
    !safeText(raw.providerRevision) ||
    !['published', 'retired'].includes(raw.effectKind as string) ||
    raw.effectKind !== (isRetirement(intent.operationType) ? 'retired' : 'published') ||
    raw.draft !== true ||
    raw.mergeable !== false ||
    raw.reviewRef !== intent.binding.reviewRef ||
    raw.requestIdentity !== intent.binding.request.identity ||
    raw.statusMarker !== intent.binding.markers.status ||
    raw.commentMarker !== intent.binding.markers.comment ||
    raw.explanationDigest !== intent.binding.explanationDigest ||
    !safeDigest(raw.effectDigest) ||
    raw.successClaim !== 'observed'
  )
    return fail('FC-MECHANISM', 'INVALID_REVIEW_PUBLICATION_ATTESTATION');
  return ok(
    Object.freeze({
      version: REVIEW_PUBLICATION_CONTRACT_VERSION,
      provider: 'fixture-only',
      operation: intent.operation,
      operationType: intent.operationType,
      port: REVIEW_PUBLICATION_PORT,
      capability: REVIEW_PUBLICATION_CAPABILITY,
      binding: binding.value,
      providerRevision: raw.providerRevision,
      effectKind: raw.effectKind as 'published' | 'retired',
      draft: true,
      mergeable: false,
      reviewRef: raw.reviewRef,
      requestIdentity: raw.requestIdentity,
      statusMarker: raw.statusMarker,
      commentMarker: raw.commentMarker,
      explanationDigest: raw.explanationDigest,
      effectDigest: raw.effectDigest,
      proof,
      successClaim: 'observed',
    }),
  );
}

const publicationCapabilityDigest = (value: {
  operation: string;
  operationType: ReviewPublicationOperationType;
  subject: ReviewPublicationSubject;
  repository: string;
  candidate: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
  providerIdentity: string;
  sourceRef: string;
  targetRef: string;
  reviewRef: string;
  request: ReviewPublicationRequest;
  markers: ReviewPublicationMarkers;
  explanationDigest: string;
  fence: ReviewPublicationFence;
  generation: string;
  manifest: string;
}): string | undefined =>
  digest('REVIEW-PUBLICATION-CAPABILITY', {
    operation: value.operation,
    operationType: value.operationType,
    subject: value.subject,
    repository: value.repository,
    candidate: value.candidate,
    candidateContentDigest: value.candidateContentDigest,
    targetBasisDigest: value.targetBasisDigest,
    providerIdentity: value.providerIdentity,
    sourceRef: value.sourceRef,
    targetRef: value.targetRef,
    reviewRef: value.reviewRef,
    request: value.request,
    markers: value.markers,
    explanationDigest: value.explanationDigest,
    fence: value.fence,
    generation: value.generation,
    manifest: value.manifest,
  });
const publicationCapabilityDigestForBinding = (binding: ReviewPublicationBinding): string | undefined =>
  publicationCapabilityDigest(binding);

export function createScriptedReviewPublicationFixture(
  options: ScriptedReviewPublicationFixtureOptions = {},
): ScriptedReviewPublicationFixture {
  const invocations: ReviewPublicationInvocation[] = [];
  const dispatched = new Set<string>();
  const outcomes = new Map<string, 'confirmed-effect' | 'confirmed-absence' | 'indeterminate'>();
  const resourceStates = new Map<string, 'present' | 'absent'>();
  const retirementResourceState = options.retirementResourceState ?? 'present';
  const bindings = new Map<string, ReviewPublicationBinding>();
  const providerRevisions = new Map<string, string>();
  const dispatch = (input: unknown): ReviewPublicationResult<ReviewPublicationAttestation> => {
    const raw = exactFields(input, ['intent', 'attempt', 'fault']);
    const intent = raw && validateIntent(raw.intent);
    const attemptValue = raw?.attempt;
    if (
      !raw ||
      !intent?.ok ||
      typeof attemptValue !== 'number' ||
      !Number.isSafeInteger(attemptValue) ||
      attemptValue < 1 ||
      attemptValue > REVIEW_PUBLICATION_BOUNDS.retryLimit
    )
      return fail('FC-AUTHORITY', 'INVALID_SCRIPTED_REVIEW_DISPATCH');
    const attempt = attemptValue as number;
    const key = `${intent.value.operation}\0${attempt}`;
    if (dispatched.has(key)) return fail('FC-EFFECT', 'DUPLICATE_REVIEW_DISPATCH');
    if (
      ![
        'none',
        'mechanism-absence',
        'lost-response',
        'lost-response-confirmed-effect',
        'lost-response-confirmed-absence',
        'contradictory-result',
        'invalid-attestation',
      ].includes(raw.fault as string)
    )
      return fail('FC-INPUT', 'INVALID_SCRIPTED_REVIEW_FAULT');
    dispatched.add(key);
    const fault = raw.fault as ReviewPublicationFault;
    const result =
      fault === 'mechanism-absence'
        ? 'mechanism-absent'
        : fault === 'lost-response' ||
            fault === 'lost-response-confirmed-effect' ||
            fault === 'lost-response-confirmed-absence' ||
            fault === 'contradictory-result'
          ? 'lost-response'
          : fault === 'invalid-attestation'
            ? 'invalid'
            : 'returned';
    invocations.push(
      Object.freeze({
        operation: intent.value.operation,
        operationType: intent.value.operationType,
        attempt,
        effect: 'effectful',
        result,
      }),
    );
    bindings.set(intent.value.operation, intent.value.binding);
    const providerRevision = digest('REVIEW-PUBLICATION-PROVIDER-REVISION', {
      binding: intent.value.binding,
      attempt,
    });
    if (fault === 'mechanism-absence') {
      outcomes.set(intent.value.operation, 'confirmed-absence');
      resourceStates.set(
        intent.value.operation,
        isRetirement(intent.value.operationType) ? retirementResourceState : 'present',
      );
      return fail('FC-MECHANISM', 'CONFIRMED_MECHANISM_ABSENCE');
    }
    if (
      fault === 'lost-response' ||
      fault === 'contradictory-result' ||
      fault === 'lost-response-confirmed-effect' ||
      fault === 'lost-response-confirmed-absence'
    ) {
      outcomes.set(
        intent.value.operation,
        fault === 'lost-response-confirmed-effect'
          ? 'confirmed-effect'
          : fault === 'lost-response-confirmed-absence'
            ? 'confirmed-absence'
            : 'indeterminate',
      );
      if (providerRevision && fault === 'lost-response-confirmed-effect')
        providerRevisions.set(intent.value.operation, providerRevision);
      resourceStates.set(
        intent.value.operation,
        fault === 'lost-response-confirmed-absence'
          ? 'present'
          : (resourceStates.get(intent.value.operation) ?? 'present'),
      );
      return fail('FC-EFFECT', 'UNCERTAIN_REVIEW_EFFECT');
    }
    if (fault === 'invalid-attestation') return fail('FC-MECHANISM', 'INVALID_REVIEW_PUBLICATION_ATTESTATION');
    const effectDigest = digest('REVIEW-PUBLICATION-EFFECT', {
      binding: intent.value.binding,
      attempt,
      effect: isRetirement(intent.value.operationType) ? 'retired' : 'published',
    });
    if (!providerRevision || !effectDigest) return fail('FC-MECHANISM', 'SCRIPTED_REVIEW_FACT_UNAVAILABLE');
    outcomes.set(intent.value.operation, 'confirmed-effect');
    resourceStates.set(intent.value.operation, isRetirement(intent.value.operationType) ? 'absent' : 'present');
    return ok(
      Object.freeze({
        version: REVIEW_PUBLICATION_CONTRACT_VERSION,
        provider: 'fixture-only',
        operation: intent.value.operation,
        operationType: intent.value.operationType,
        port: REVIEW_PUBLICATION_PORT,
        capability: REVIEW_PUBLICATION_CAPABILITY,
        binding: intent.value.binding,
        providerRevision,
        effectKind: isRetirement(intent.value.operationType) ? 'retired' : 'published',
        draft: true,
        mergeable: false,
        reviewRef: intent.value.binding.reviewRef,
        requestIdentity: intent.value.binding.request.identity,
        statusMarker: intent.value.binding.markers.status,
        commentMarker: intent.value.binding.markers.comment,
        explanationDigest: intent.value.binding.explanationDigest,
        effectDigest,
        proof: intent.value.proof,
        successClaim: 'observed',
      }),
    );
  };
  const lookup = (input: unknown): ReviewPublicationResult<ReviewPublicationLookup> => {
    const raw = exactFields(input, ['operation', 'binding']);
    const binding = raw && validateReviewPublicationBinding(raw.binding);
    if (
      !raw ||
      !identity('ID-OP', raw.operation) ||
      !binding?.ok ||
      raw.operation !== binding.value.operation ||
      !bindings.has(raw.operation)
    )
      return fail('FC-INPUT', 'INVALID_REVIEW_LOOKUP');
    if (!same(binding.value, bindings.get(raw.operation))) return fail('FC-FENCE', 'REVIEW_LOOKUP_BINDING_MISMATCH');
    const outcome = outcomes.get(raw.operation);
    const resourceState = resourceStates.get(raw.operation);
    const providerRevision = providerRevisions.get(raw.operation) ?? null;
    const observationDigest =
      outcome &&
      resourceState &&
      digest('REVIEW-PUBLICATION-LOOKUP', {
        operation: raw.operation,
        binding: binding.value,
        outcome,
        resourceState,
        providerRevision,
      });
    return outcome && observationDigest
      ? ok(
          issueReviewPublicationLookup({
            operation: raw.operation,
            binding: binding.value,
            outcome,
            resourceState,
            observationDigest,
            providerRevision,
          }),
        )
      : fail('FC-TRUST', 'REVIEW_LOOKUP_UNAVAILABLE');
  };
  return Object.freeze({
    dispatch,
    lookup,
    invocations: () => Object.freeze([...invocations]),
    reachability: () =>
      Object.freeze({
        providerEnabled: false as const,
        dispatchEnabled: false as const,
        status: 'unavailable' as const,
      }),
  });
}

const createReviewPublicationTransitionRecorderInternal = (
  verifierInput?: ReviewPublicationTrustedVerifier,
  hydrate?: ReviewPublicationTransitionSnapshot,
): ReviewPublicationTransitionRecorder => {
  const recorded: ReviewPublicationOperationIntent[] = [...(hydrate?.intents ?? [])];
  const reauthorizations: ReviewPublicationReauthorization[] = [...(hydrate?.reauthorizations ?? [])];
  const verifier =
    verifierInput && typeof Object.getOwnPropertyDescriptor(verifierInput, 'verify')?.value === 'function'
      ? verifierInput
      : undefined;
  const verify = (input: unknown): ReviewPublicationResult<void> => {
    if (!verifier) return fail('FC-TRUST', 'TRANSITION_VERIFIER_REQUIRED');
    try {
      return verifier.verify(input);
    } catch {
      return fail('FC-TRUST', 'TRANSITION_PROOF_UNVERIFIED');
    }
  };
  return Object.freeze({
    authorize(input: unknown): ReviewPublicationResult<ReviewPublicationCommitProof> {
      const raw = exactFields(input, ['binding', 'retirement']) ?? exactFields(input, ['binding']);
      const binding = raw && validateReviewPublicationBinding(raw.binding);
      const retirement = raw?.retirement === true;
      if (
        !raw ||
        !binding?.ok ||
        (retirement
          ? binding.value.transition.lifecycle !== 'Settled' && binding.value.transition.lifecycle !== 'Stopped'
          : binding.value.transition.lifecycle !== 'Reviewing' && binding.value.transition.lifecycle !== 'Blocked')
      )
        return fail('FC-AUTHORITY', 'REVIEW_TRANSITION_NOT_AUTHORIZED');
      const verified = verify({ transition: binding.value.transition, binding: binding.value });
      if (!verified.ok) return verified;
      return ok(binding.value.transition.proof);
    },
    recordIntent(input: unknown): ReviewPublicationResult<ReviewPublicationCommitProof> {
      const intent = validateIntent(input);
      if (!intent.ok) return intent;
      const verified = verify({ transition: intent.value.binding.transition, binding: intent.value.binding });
      if (!verified.ok) return verified;
      if (recorded.some((entry) => entry.operation === intent.value.operation))
        return fail('FC-EFFECT', 'DUPLICATE_REVIEW_INTENT');
      recorded.push(intent.value);
      return ok(intent.value.proof);
    },
    recordReauthorization(input: unknown): ReviewPublicationResult<ReviewPublicationCommitProof> {
      const raw = exactFields(input, [
        'version',
        'operation',
        'previousAttempt',
        'attempt',
        'confirmedAbsenceDigest',
        'binding',
        'capabilityDigest',
        'generation',
        'fence',
        'proof',
      ]);
      const existing = raw && recorded.find((entry) => entry.operation === raw.operation);
      const binding = raw && validateReviewPublicationBinding(raw.binding);
      const fence = raw && existing && parseFence(raw.fence, existing.binding.subject);
      const proof = raw && existing && parseProof(raw.proof, raw.operation as string, existing.binding.subject.run);
      const previousAttempt = raw?.previousAttempt;
      const attempt = raw?.attempt;
      const capabilityDigest = raw && binding?.ok ? publicationCapabilityDigestForBinding(binding.value) : undefined;
      const previous =
        raw && existing && typeof previousAttempt === 'number' && previousAttempt > 1
          ? reauthorizations.find((entry) => entry.operation === raw.operation && entry.attempt === previousAttempt)
          : undefined;
      const predecessorBinding = previous?.binding ?? existing?.binding;
      if (
        !raw ||
        !existing ||
        !binding?.ok ||
        !fence ||
        !proof ||
        raw.version !== REVIEW_PUBLICATION_CONTRACT_VERSION ||
        !identity('ID-OP', raw.operation) ||
        typeof previousAttempt !== 'number' ||
        !Number.isSafeInteger(previousAttempt) ||
        previousAttempt < 1 ||
        typeof attempt !== 'number' ||
        !Number.isSafeInteger(attempt) ||
        attempt !== previousAttempt + 1 ||
        attempt > REVIEW_PUBLICATION_BOUNDS.retryLimit ||
        !safeDigest(raw.confirmedAbsenceDigest) ||
        !safeDigest(raw.capabilityDigest) ||
        raw.capabilityDigest !== capabilityDigest ||
        raw.generation !== binding.value.generation ||
        !same(fence, binding.value.fence) ||
        !predecessorBinding ||
        !bindingsShareRetryIdentity(predecessorBinding, binding.value) ||
        !same(proof, binding.value.transition.proof) ||
        raw.generation === existing.binding.generation ||
        raw.operation !== existing.operation ||
        reauthorizations.some((entry) => entry.operation === raw.operation && entry.attempt === attempt)
      )
        return fail('FC-AUTHORITY', 'INVALID_REVIEW_REAUTHORIZATION');
      const verified = verify({ transition: binding.value.transition, binding: binding.value });
      if (!verified.ok) return verified;
      const value: ReviewPublicationReauthorization = Object.freeze({
        version: REVIEW_PUBLICATION_CONTRACT_VERSION,
        operation: raw.operation,
        previousAttempt: previousAttempt as number,
        attempt: attempt as number,
        confirmedAbsenceDigest: raw.confirmedAbsenceDigest,
        binding: binding.value,
        capabilityDigest: capabilityDigest as string,
        generation: raw.generation as string,
        fence,
        proof,
      });
      reauthorizations.push(value);
      return ok(proof);
    },
    intents: () => Object.freeze([...recorded]),
    reauthorizations: () => Object.freeze([...reauthorizations]),
    snapshot: () =>
      Object.freeze({
        intents: Object.freeze([...recorded]),
        reauthorizations: Object.freeze([...reauthorizations]),
      }),
  });
};

export function createReviewPublicationTransitionRecorder(
  verifierInput?: ReviewPublicationTrustedVerifier,
): ReviewPublicationTransitionRecorder {
  return createReviewPublicationTransitionRecorderInternal(verifierInput);
}

const parseObservationOperations = (value: unknown): RequiredVenueObservation['operations'] | undefined => {
  if (!Array.isArray(value) || value.length !== 4 || Object.getPrototypeOf(value) !== Array.prototype) return undefined;
  const parsed = value.map((entry) => {
    const item = exactFields(entry, ['operation', 'operationType', 'generation', 'capabilityDigest', 'effect']);
    return item &&
      identity('ID-OP', item.operation) &&
      operationType(item.operationType) &&
      !isRetirement(item.operationType) &&
      identity('ID-GEN', item.generation) &&
      safeDigest(item.capabilityDigest) &&
      item.effect === 'confirmed-effect'
      ? Object.freeze({
          operation: item.operation,
          operationType: item.operationType,
          generation: item.generation,
          capabilityDigest: item.capabilityDigest,
          effect: 'confirmed-effect' as const,
        })
      : undefined;
  });
  if (parsed.some((entry) => !entry)) return undefined;
  const operations = parsed as RequiredVenueObservation['operations'];
  const run = operations[0]?.operation.slice(0, operations[0].operation.indexOf('/txn/'));
  if (
    !run ||
    operations.some(
      (entry, index) =>
        entry.operationType !== REVIEW_PUBLICATION_REVIEW_OPERATIONS[index] ||
        entry.operation.slice(0, entry.operation.indexOf('/txn/')) !== run,
    )
  )
    return undefined;
  return Object.freeze(operations);
};

const bindingsSharePublicationIdentity = (
  bindings: readonly ReviewPublicationBinding[],
  operations: readonly ReviewPublicationOperationType[],
): boolean =>
  bindings.length === operations.length &&
  bindings.every((binding, index) => binding.operationType === operations[index]) &&
  bindings.slice(1).every((binding) =>
    same(
      {
        subject: binding.subject,
        repository: binding.repository,
        candidate: binding.candidate,
        candidateContentDigest: binding.candidateContentDigest,
        targetBasisDigest: binding.targetBasisDigest,
        providerIdentity: binding.providerIdentity,
        sourceRef: binding.sourceRef,
        targetRef: binding.targetRef,
        reviewRef: binding.reviewRef,
        request: binding.request,
        markers: binding.markers,
        explanationDigest: binding.explanationDigest,
        fence: binding.fence,
        generation: binding.generation,
        manifest: binding.manifest,
      },
      {
        subject: bindings[0]?.subject,
        repository: bindings[0]?.repository,
        candidate: bindings[0]?.candidate,
        candidateContentDigest: bindings[0]?.candidateContentDigest,
        targetBasisDigest: bindings[0]?.targetBasisDigest,
        providerIdentity: bindings[0]?.providerIdentity,
        sourceRef: bindings[0]?.sourceRef,
        targetRef: bindings[0]?.targetRef,
        reviewRef: bindings[0]?.reviewRef,
        request: bindings[0]?.request,
        markers: bindings[0]?.markers,
        explanationDigest: bindings[0]?.explanationDigest,
        fence: bindings[0]?.fence,
        generation: bindings[0]?.generation,
        manifest: bindings[0]?.manifest,
      },
    ),
  );

const bindingsShareRetryIdentity = (current: ReviewPublicationBinding, retry: ReviewPublicationBinding): boolean =>
  current.operation === retry.operation &&
  current.operationType === retry.operationType &&
  same(
    {
      subject: current.subject,
      providerIdentity: current.providerIdentity,
      sourceRef: current.sourceRef,
      targetRef: current.targetRef,
      reviewRef: current.reviewRef,
      request: current.request,
      markers: current.markers,
      explanationDigest: current.explanationDigest,
      manifest: current.manifest,
    },
    {
      subject: retry.subject,
      providerIdentity: retry.providerIdentity,
      sourceRef: retry.sourceRef,
      targetRef: retry.targetRef,
      reviewRef: retry.reviewRef,
      request: retry.request,
      markers: retry.markers,
      explanationDigest: retry.explanationDigest,
      manifest: retry.manifest,
    },
  ) &&
  retry.generation !== current.generation &&
  retry.fence.generation === retry.generation;

const validateReviewPublicationTransitionSnapshot = (
  value: unknown,
): ReviewPublicationResult<ReviewPublicationTransitionSnapshot> => {
  const raw = exactFields(value, ['intents', 'reauthorizations']);
  if (!raw || !Array.isArray(raw.intents) || !Array.isArray(raw.reauthorizations))
    return fail('FC-TRUST', 'INVALID_REVIEW_TRANSITION_SNAPSHOT');
  const intents = raw.intents.map((entry) => validateIntent(entry));
  if (intents.some((entry) => !entry.ok)) return fail('FC-TRUST', 'INVALID_REVIEW_TRANSITION_SNAPSHOT');
  const typedIntents = intents.map((entry) => (entry as Extract<typeof entry, { ok: true }>).value);
  const seenOperations = new Set<string>();
  if (typedIntents.some((entry) => !seenOperations.add(entry.operation)))
    return fail('FC-TRUST', 'INVALID_REVIEW_TRANSITION_SNAPSHOT');
  const reauthorizations = raw.reauthorizations.map((entry) => {
    const item = exactFields(entry, [
      'version',
      'operation',
      'previousAttempt',
      'attempt',
      'confirmedAbsenceDigest',
      'binding',
      'capabilityDigest',
      'generation',
      'fence',
      'proof',
    ]);
    const intent = item && typedIntents.find((candidate) => candidate.operation === item.operation);
    const binding = item && validateReviewPublicationBinding(item.binding);
    const fence = item && intent && parseFence(item.fence, intent.binding.subject);
    const proof = item && intent && parseProof(item.proof, item.operation as string, intent.binding.subject.run);
    if (!item || !intent || !binding?.ok || !fence || !proof) return undefined;
    return {
      item,
      intent,
      binding: binding.value,
      fence,
      proof,
    };
  });
  const validReauthorizations = reauthorizations.filter(
    (entry): entry is Exclude<(typeof reauthorizations)[number], undefined> => entry !== undefined,
  );
  if (validReauthorizations.length !== reauthorizations.length)
    return fail('FC-TRUST', 'INVALID_REVIEW_TRANSITION_SNAPSHOT');
  if (
    validReauthorizations.some(
      (entry) =>
        !entry ||
        entry.item.version !== REVIEW_PUBLICATION_CONTRACT_VERSION ||
        !identity('ID-OP', entry.item.operation) ||
        !Number.isSafeInteger(entry.item.previousAttempt) ||
        (entry.item.previousAttempt as number) < 1 ||
        !Number.isSafeInteger(entry.item.attempt) ||
        entry.item.attempt !== (entry.item.previousAttempt as number) + 1 ||
        entry.item.attempt > REVIEW_PUBLICATION_BOUNDS.retryLimit ||
        !safeDigest(entry.item.confirmedAbsenceDigest) ||
        !safeDigest(entry.item.capabilityDigest) ||
        entry.item.capabilityDigest !== publicationCapabilityDigestForBinding(entry.binding) ||
        entry.item.generation !== entry.binding.generation ||
        entry.item.generation === entry.intent.binding.generation ||
        !same(entry.proof, entry.binding.transition.proof) ||
        !same(entry.fence, entry.binding.fence),
    )
  )
    return fail('FC-TRUST', 'INVALID_REVIEW_TRANSITION_SNAPSHOT');
  const ordered = validReauthorizations.sort(
    (left, right) => (left.item.attempt as number) - (right.item.attempt as number),
  );
  const seenReauthorizations = new Set<string>();
  for (const entry of ordered) {
    const key = `${entry.item.operation}:${entry.item.attempt}`;
    if (seenReauthorizations.has(key)) return fail('FC-TRUST', 'INVALID_REVIEW_TRANSITION_SNAPSHOT');
    const predecessor =
      entry.item.previousAttempt === 1
        ? typedIntents.find((intent) => intent.operation === entry.item.operation)?.binding
        : ordered.find(
            (candidate) =>
              candidate.item.operation === entry.item.operation &&
              candidate.item.attempt === entry.item.previousAttempt,
          )?.binding;
    if (!predecessor || !bindingsShareRetryIdentity(predecessor, entry.binding))
      return fail('FC-TRUST', 'INVALID_REVIEW_TRANSITION_SNAPSHOT');
    seenReauthorizations.add(key);
  }
  return ok(
    Object.freeze({
      intents: Object.freeze(typedIntents),
      reauthorizations: Object.freeze(
        ordered.map((entry) =>
          Object.freeze({
            version: REVIEW_PUBLICATION_CONTRACT_VERSION,
            operation: entry.item.operation as string,
            previousAttempt: entry.item.previousAttempt as number,
            attempt: entry.item.attempt as number,
            confirmedAbsenceDigest: entry.item.confirmedAbsenceDigest as string,
            binding: entry.binding,
            capabilityDigest: entry.item.capabilityDigest as string,
            generation: entry.item.generation as string,
            fence: entry.fence,
            proof: entry.proof,
          }),
        ),
      ),
    }),
  );
};

export function restoreReviewPublicationTransitionRecorder(
  value: unknown,
  verifier: ReviewPublicationTrustedVerifier,
): ReviewPublicationResult<ReviewPublicationTransitionRecorder> {
  const validated = validateReviewPublicationTransitionSnapshot(value);
  if (!validated.ok) return validated;
  const verify = (input: unknown): ReviewPublicationResult<void> => {
    try {
      return verifier.verify(input);
    } catch {
      return fail('FC-TRUST', 'TRANSITION_PROOF_UNVERIFIED');
    }
  };
  for (const intent of validated.value.intents) {
    const verified = verify({ transition: intent.binding.transition, binding: intent.binding });
    if (!verified.ok) return verified;
  }
  for (const reauthorization of validated.value.reauthorizations) {
    const verified = verify({ transition: reauthorization.binding.transition, binding: reauthorization.binding });
    if (!verified.ok) return verified;
  }
  const recorder = createReviewPublicationTransitionRecorderInternal(verifier, validated.value);
  return ok(recorder);
}

const validateSubjectObservation = (value: unknown): ReviewPublicationSubject | undefined => parseSubject(value);

export function validateReviewPublicationObservation(
  value: unknown,
): ReviewPublicationResult<ReviewPublicationObservation> {
  const raw =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  if (!raw) return fail('FC-INPUT', 'INVALID_REVIEW_PUBLICATION_OBSERVATION');
  if (raw.mode === 'required-venue') {
    const parsed = exactFields(value, [
      'version',
      'kind',
      'mode',
      'subject',
      'providerIdentity',
      'sourceRef',
      'targetRef',
      'reviewRef',
      'request',
      'markers',
      'explanationDigest',
      'providerRevision',
      'operations',
      'manifest',
      'capabilityDigest',
      'draft',
      'mergeable',
      'observationDigest',
    ]);
    const subject = parsed && validateSubjectObservation(parsed.subject);
    const request = parsed && parseRequest(parsed.request);
    const markers = parsed && parseMarkers(parsed.markers);
    const operations = parsed && parseObservationOperations(parsed.operations);
    const capabilityDigests =
      parsed &&
      subject &&
      request &&
      markers &&
      operations &&
      operations.map((entry) =>
        publicationCapabilityDigest({
          operation: entry.operation,
          operationType: entry.operationType,
          subject,
          repository: subject.repository,
          candidate: subject.candidate,
          candidateContentDigest: subject.candidateContentDigest,
          targetBasisDigest: subject.targetBasisDigest,
          providerIdentity: parsed.providerIdentity as string,
          sourceRef: parsed.sourceRef as string,
          targetRef: parsed.targetRef as string,
          reviewRef: parsed.reviewRef as string,
          request,
          markers,
          explanationDigest: parsed.explanationDigest as string,
          fence: {
            generation: entry.generation,
            basis: subject.basis,
            candidateContentDigest: subject.candidateContentDigest,
            targetBasisDigest: subject.targetBasisDigest,
          },
          generation: entry.generation,
          manifest: parsed.manifest as string,
        }),
      );
    const aggregateCapabilityDigest = capabilityDigests && digest('REVIEW-PUBLICATION-CAPABILITIES', capabilityDigests);
    if (
      !parsed ||
      !subject ||
      !request ||
      !markers ||
      !operations ||
      parsed.version !== REVIEW_PUBLICATION_CONTRACT_VERSION ||
      parsed.kind !== 'review-publication-observation' ||
      parsed.mode !== 'required-venue' ||
      !safeText(parsed.providerIdentity) ||
      !safeRef(parsed.sourceRef) ||
      !safeRef(parsed.targetRef) ||
      !safeText(parsed.reviewRef) ||
      !safeDigest(parsed.explanationDigest) ||
      !safeText(parsed.providerRevision) ||
      !identity('ID-MANIFEST', parsed.manifest) ||
      !safeDigest(parsed.capabilityDigest) ||
      !capabilityDigests ||
      capabilityDigests.some((entry, index) => entry !== operations[index]?.capabilityDigest) ||
      parsed.capabilityDigest !== aggregateCapabilityDigest ||
      parsed.draft !== true ||
      parsed.mergeable !== false ||
      !safeDigest(parsed.observationDigest)
    )
      return fail('FC-INPUT', 'INVALID_REQUIRED_REVIEW_OBSERVATION');
    const unsigned: Omit<RequiredVenueObservation, 'observationDigest'> = {
      version: REVIEW_PUBLICATION_CONTRACT_VERSION,
      kind: 'review-publication-observation' as const,
      mode: 'required-venue' as const,
      subject,
      providerIdentity: parsed.providerIdentity,
      sourceRef: parsed.sourceRef,
      targetRef: parsed.targetRef,
      reviewRef: parsed.reviewRef,
      request,
      markers,
      explanationDigest: parsed.explanationDigest,
      providerRevision: parsed.providerRevision,
      operations,
      manifest: parsed.manifest,
      capabilityDigest: parsed.capabilityDigest,
      draft: true as const,
      mergeable: false as const,
    };
    if (digest('REVIEW-PUBLICATION-OBSERVATION', unsigned) !== parsed.observationDigest)
      return fail('FC-INPUT', 'OBSERVATION_DIGEST_MISMATCH');
    return ok(Object.freeze({ ...unsigned, observationDigest: parsed.observationDigest }));
  }
  const parsed = exactFields(value, ['version', 'kind', 'mode', 'subject', 'absence', 'observationDigest']);
  const subject = parsed && validateSubjectObservation(parsed.subject);
  if (
    !parsed ||
    !subject ||
    parsed.version !== REVIEW_PUBLICATION_CONTRACT_VERSION ||
    parsed.kind !== 'review-publication-observation' ||
    parsed.mode !== 'no-venue' ||
    parsed.absence !== 'explicit-no-venue' ||
    !safeDigest(parsed.observationDigest)
  )
    return fail('FC-INPUT', 'INVALID_EXPLICIT_ABSENCE');
  const unsigned: Omit<ExplicitAbsenceObservation, 'observationDigest'> = {
    version: REVIEW_PUBLICATION_CONTRACT_VERSION,
    kind: 'review-publication-observation' as const,
    mode: 'no-venue' as const,
    subject,
    absence: 'explicit-no-venue' as const,
  };
  if (digest('REVIEW-PUBLICATION-OBSERVATION', unsigned) !== parsed.observationDigest)
    return fail('FC-INPUT', 'OBSERVATION_DIGEST_MISMATCH');
  return ok(Object.freeze({ ...unsigned, observationDigest: parsed.observationDigest }));
}

export function createExplicitAbsenceObservation(input: unknown): ReviewPublicationResult<ExplicitAbsenceObservation> {
  const raw = exactFields(input, ['mode', 'subject']);
  const subject = raw && parseSubject(raw.subject);
  if (!raw || raw.mode !== 'no-venue' || !subject) return fail('FC-INPUT', 'INVALID_NO_VENUE_MODE');
  const unsigned: Omit<ExplicitAbsenceObservation, 'observationDigest'> = {
    version: REVIEW_PUBLICATION_CONTRACT_VERSION,
    kind: 'review-publication-observation' as const,
    mode: 'no-venue' as const,
    subject,
    absence: 'explicit-no-venue' as const,
  };
  const observationDigest = digest('REVIEW-PUBLICATION-OBSERVATION', unsigned);
  return observationDigest
    ? ok(Object.freeze({ ...unsigned, observationDigest }))
    : fail('FC-TRUST', 'OBSERVATION_DIGEST_FAILED');
}

export type ReviewPublicationController = Readonly<{
  publish(input: unknown): ReviewPublicationResult<RequiredVenueObservation | ExplicitAbsenceObservation>;
  retire(input: unknown): ReviewPublicationResult<
    Readonly<
      | { status: 'retired'; operation: string | null }
      | {
          status: 'obligation';
          operation: string | null;
          obligation: string;
          owner: 'RT-CONTROLLER';
          completionCriteria: 'preserve-review-venue-and-complete-retirement';
          evidenceDigest: string;
          obligationDigest: string;
        }
    >
  >;
  snapshot(): Readonly<{
    intents: readonly ReviewPublicationOperationIntent[];
    reauthorizations: readonly ReviewPublicationReauthorization[];
    invocations: readonly ReviewPublicationInvocation[];
    transition: ReviewPublicationTransitionSnapshot;
  }>;
}>;

export function createReviewPublicationController(
  input: Readonly<{
    transition?: ReviewPublicationTransitionRecorder;
    fixture?: ScriptedReviewPublicationFixture;
    preservationVerifier?: ReviewPublicationPreservationVerifier;
    obligationController?: ReviewPublicationObligationController;
  }> = {},
): ReviewPublicationController {
  const transition = input.transition ?? createReviewPublicationTransitionRecorder();
  const fixture = input.fixture ?? createScriptedReviewPublicationFixture();
  const preservationVerifier = input.preservationVerifier;
  const obligationController = input.obligationController;
  const publish = (value: unknown): ReviewPublicationResult<RequiredVenueObservation | ExplicitAbsenceObservation> => {
    const raw =
      exactFields(value, ['mode', 'subject', 'bindings', 'retryBindings', 'faults']) ??
      exactFields(value, ['mode', 'subject']);
    if (!raw || !REVIEW_PUBLICATION_MODES.includes(raw.mode as ReviewPublicationMode))
      return fail('FC-INPUT', 'UNKNOWN_OR_OMITTED_REVIEW_MODE');
    if (raw.mode === 'no-venue') {
      if (raw.bindings !== undefined || raw.retryBindings !== undefined || raw.faults !== undefined)
        return fail('FC-AUTHORITY', 'NO_VENUE_MUST_NOT_DISPATCH');
      return createExplicitAbsenceObservation({ mode: 'no-venue', subject: raw.subject });
    }
    if (
      !Array.isArray(raw.bindings) ||
      raw.bindings.length !== 4 ||
      !Array.isArray(raw.retryBindings) ||
      raw.retryBindings.length !== 4 ||
      !Array.isArray(raw.faults) ||
      raw.faults.length > 4
    )
      return fail('FC-INPUT', 'INVALID_REQUIRED_REVIEW_INPUT');
    const bindings = raw.bindings.map((entry) => validateReviewPublicationBinding(entry));
    if (bindings.some((entry) => !entry.ok)) return fail('FC-SUBJECT', 'REVIEW_BINDING_MISMATCH');
    const typed = bindings.map((entry) => (entry as Extract<typeof entry, { ok: true }>).value);
    const retryBindingsResult = raw.retryBindings.map((entry) => {
      const candidates = Array.isArray(entry) ? entry : [entry];
      return candidates.map((candidate) => validateReviewPublicationBinding(candidate));
    });
    if (retryBindingsResult.some((entries) => entries.length === 0 || entries.some((entry) => !entry.ok)))
      return fail('FC-SUBJECT', 'RETRY_BINDING_MISMATCH');
    const retryTyped = retryBindingsResult.map((entries) =>
      entries.map((entry) => (entry as Extract<typeof entry, { ok: true }>).value),
    );
    const inputSubject = parseSubject(raw.subject);
    if (!inputSubject || !same(inputSubject, typed[0]?.subject)) return fail('FC-SUBJECT', 'REVIEW_SUBJECT_MISMATCH');
    if (!bindingsSharePublicationIdentity(typed, REVIEW_PUBLICATION_REVIEW_OPERATIONS))
      return fail('FC-SUBJECT', 'REVIEW_BINDING_ORDER_OR_IDENTITY_MISMATCH');
    if (
      retryTyped.some((entries, index) => {
        let predecessor = typed[index];
        return entries.some((entry) => {
          const valid = bindingsShareRetryIdentity(predecessor, entry);
          predecessor = entry;
          return !valid;
        });
      })
    )
      return fail('FC-FENCE', 'REVIEW_RETRY_BINDING_NOT_FRESH');
    const faults = (raw.faults ?? []) as readonly (ReviewPublicationFault | readonly ReviewPublicationFault[])[];
    const successes: Array<RequiredVenueObservation['operations'][number]> = [];
    let providerRevision = '';
    let capabilityDigest = '';
    for (let index = 0; index < typed.length; index += 1) {
      const binding = typed[index];
      const authorized = transition.authorize({ binding });
      if (!authorized.ok) return authorized;
      const proof = authorized.value;
      let intent: ReviewPublicationOperationIntent = Object.freeze({
        version: REVIEW_PUBLICATION_CONTRACT_VERSION,
        operation: binding.operation,
        operationType: binding.operationType,
        effect: 'effectful',
        port: REVIEW_PUBLICATION_PORT,
        capability: REVIEW_PUBLICATION_CAPABILITY,
        binding,
        proof,
        waitMs: REVIEW_PUBLICATION_BOUNDS.waitMs,
        retryLimit: REVIEW_PUBLICATION_BOUNDS.retryLimit,
        recoveryLimit: REVIEW_PUBLICATION_BOUNDS.recoveryLimit,
      });
      const recorded = transition.recordIntent(intent);
      if (!recorded.ok) return recorded;
      let attempt = 1;
      let completed = false;
      while (!completed) {
        const activeBinding = intent.binding;
        const selectedFault = faults[index];
        const fault = Array.isArray(selectedFault) ? (selectedFault[attempt - 1] ?? 'none') : (selectedFault ?? 'none');
        const dispatched = fixture.dispatch({ intent, attempt, fault });
        if (dispatched.ok) {
          const attestation = validateReviewPublicationAttestation(dispatched.value, intent);
          if (!attestation.ok) return attestation;
          const operationCapabilityDigest = publicationCapabilityDigestForBinding(activeBinding);
          if (!operationCapabilityDigest) return fail('FC-TRUST', 'CAPABILITY_DIGEST_FAILED');
          successes.push(
            Object.freeze({
              operation: activeBinding.operation,
              operationType: activeBinding.operationType,
              generation: activeBinding.generation,
              capabilityDigest: operationCapabilityDigest,
              effect: 'confirmed-effect',
            }),
          );
          providerRevision = attestation.value.providerRevision;
          completed = true;
          continue;
        }
        if (dispatched.error.family === 'FC-MECHANISM' && dispatched.error.code !== 'CONFIRMED_MECHANISM_ABSENCE')
          return fail('FC-MECHANISM', dispatched.error.code);
        if (dispatched.error.family === 'FC-MECHANISM') {
          const lookup = fixture.lookup({ operation: activeBinding.operation, binding: activeBinding });
          if (!lookup.ok || !validReviewPublicationLookup(lookup.value, activeBinding.operation, activeBinding))
            return fail('FC-EFFECT', 'MECHANISM_ABSENCE_NOT_CONFIRMED');
          if (lookup.value.outcome !== 'confirmed-absence') return fail('FC-EFFECT', 'MECHANISM_ABSENCE_NOT_CONFIRMED');
          if (attempt >= REVIEW_PUBLICATION_BOUNDS.retryLimit)
            return fail('FC-BOUND', 'REVIEW_RETRY_EXHAUSTED_BLOCKED');
          attempt += 1;
          const nextBinding = retryTyped[index]?.[attempt - 2];
          if (!nextBinding) return fail('FC-BOUND', 'REVIEW_RETRY_BINDING_EXHAUSTED');
          const reauthProof = transition.authorize({ binding: nextBinding });
          if (!reauthProof.ok) return reauthProof;
          const reauth = transition.recordReauthorization({
            version: REVIEW_PUBLICATION_CONTRACT_VERSION,
            operation: activeBinding.operation,
            previousAttempt: attempt - 1,
            attempt,
            confirmedAbsenceDigest: lookup.value.observationDigest,
            binding: nextBinding,
            capabilityDigest: publicationCapabilityDigestForBinding(nextBinding),
            generation: nextBinding.generation,
            fence: nextBinding.fence,
            proof: reauthProof.value,
          });
          if (!reauth.ok) return reauth;
          intent = Object.freeze({ ...intent, binding: nextBinding, proof: reauth.value });
          continue;
        }
        let recoveryAttempt = 0;
        while (recoveryAttempt < REVIEW_PUBLICATION_BOUNDS.recoveryLimit) {
          recoveryAttempt += 1;
          const recovery = fixture.lookup({ operation: activeBinding.operation, binding: activeBinding });
          if (
            recovery.ok &&
            validReviewPublicationLookup(recovery.value, activeBinding.operation, activeBinding) &&
            recovery.value.outcome === 'confirmed-effect'
          ) {
            if (!recovery.value.providerRevision) return fail('FC-EFFECT', 'RECOVERY_PROVIDER_REVISION_MISSING');
            const operationCapabilityDigest = publicationCapabilityDigestForBinding(activeBinding);
            if (!operationCapabilityDigest) return fail('FC-TRUST', 'CAPABILITY_DIGEST_FAILED');
            successes.push(
              Object.freeze({
                operation: activeBinding.operation,
                operationType: activeBinding.operationType,
                generation: activeBinding.generation,
                capabilityDigest: operationCapabilityDigest,
                effect: 'confirmed-effect',
              }),
            );
            providerRevision = recovery.value.providerRevision;
            completed = true;
            break;
          }
          if (
            recovery.ok &&
            validReviewPublicationLookup(recovery.value, activeBinding.operation, activeBinding) &&
            recovery.value.outcome === 'confirmed-absence'
          ) {
            return fail('FC-EFFECT', 'REVIEW_EFFECT_RECONCILED_ABSENCE_REQUIRES_REAUTHORIZATION');
          }
        }
        if (completed) continue;
        return fail('FC-EFFECT', 'REVIEW_EFFECT_UNCERTAIN_PARKED');
      }
    }
    const first = typed[0];
    capabilityDigest =
      digest(
        'REVIEW-PUBLICATION-CAPABILITIES',
        successes.map((entry) => entry.capabilityDigest),
      ) ?? '';
    const unsigned: Omit<RequiredVenueObservation, 'observationDigest'> = {
      version: REVIEW_PUBLICATION_CONTRACT_VERSION,
      kind: 'review-publication-observation',
      mode: 'required-venue',
      subject: first.subject,
      providerIdentity: first.providerIdentity,
      sourceRef: first.sourceRef,
      targetRef: first.targetRef,
      reviewRef: first.reviewRef,
      request: first.request,
      markers: first.markers,
      explanationDigest: first.explanationDigest,
      providerRevision,
      operations: successes,
      manifest: first.manifest,
      capabilityDigest,
      draft: true,
      mergeable: false,
    };
    const observationDigest = digest('REVIEW-PUBLICATION-OBSERVATION', unsigned);
    return observationDigest
      ? ok(Object.freeze({ ...unsigned, observationDigest }))
      : fail('FC-TRUST', 'OBSERVATION_DIGEST_FAILED');
  };
  const retire = (
    value: unknown,
  ): ReviewPublicationResult<
    Readonly<
      | { status: 'retired'; operation: string | null }
      | {
          status: 'obligation';
          operation: string | null;
          obligation: string;
          owner: 'RT-CONTROLLER';
          completionCriteria: 'preserve-review-venue-and-complete-retirement';
          evidenceDigest: string;
          obligationDigest: string;
        }
    >
  > => {
    const raw =
      exactFields(value, ['bindings', 'faults', 'preservation', 'obligation', 'retryBindings']) ??
      exactFields(value, ['bindings', 'faults', 'preservation', 'obligation']);
    if (!raw || !Array.isArray(raw.bindings) || raw.bindings.length !== 4 || !Array.isArray(raw.faults))
      return fail('FC-INPUT', 'RETIREMENT_REQUIRES_PRESERVATION');
    const bindings = raw.bindings.map((entry) => validateReviewPublicationBinding(entry));
    if (bindings.some((entry) => !entry.ok)) return fail('FC-SUBJECT', 'RETIREMENT_BINDING_MISMATCH');
    const typed = bindings.map((entry) => (entry as Extract<typeof entry, { ok: true }>).value);
    const retryBindingsResult =
      raw.retryBindings === undefined
        ? typed.map(() => [])
        : Array.isArray(raw.retryBindings) && raw.retryBindings.length === typed.length
          ? raw.retryBindings.map((entry) => {
              const candidates = Array.isArray(entry) ? entry : [entry];
              return candidates.map((candidate) => validateReviewPublicationBinding(candidate));
            })
          : undefined;
    if (
      !retryBindingsResult ||
      retryBindingsResult.some(
        (entries) => entries.some((entry) => !entry.ok) || entries.length > RETIREMENT_ATTEMPT_BOUND - 1,
      )
    )
      return fail('FC-SUBJECT', 'RETIREMENT_RETRY_BINDING_MISMATCH');
    const retirementRetryTyped = retryBindingsResult.map((entries) =>
      entries.map((entry) => (entry as Extract<typeof entry, { ok: true }>).value),
    );
    if (
      retirementRetryTyped.some((entries, index) => {
        let predecessor = typed[index];
        return entries.some((entry) => {
          const valid = predecessor !== undefined && bindingsShareRetryIdentity(predecessor, entry);
          predecessor = entry;
          return !valid;
        });
      })
    )
      return fail('FC-FENCE', 'RETIREMENT_RETRY_BINDING_NOT_FRESH');
    if (!bindingsSharePublicationIdentity(typed, REVIEW_PUBLICATION_RETIRE_OPERATIONS))
      return fail('FC-AUTHORITY', 'RETIREMENT_OPERATION_REQUIRED');
    const preservationRaw = exactFields(raw.preservation, ['kind', 'status', 'venueDigest', 'evidenceDigest']);
    const expectedVenueDigest = digest('REVIEW-PUBLICATION-VENUE', {
      subject: typed[0]?.subject,
      providerIdentity: typed[0]?.providerIdentity,
      sourceRef: typed[0]?.sourceRef,
      targetRef: typed[0]?.targetRef,
      reviewRef: typed[0]?.reviewRef,
      request: typed[0]?.request,
      markers: typed[0]?.markers,
      manifest: typed[0]?.manifest,
    });
    if (
      !preservationRaw ||
      preservationRaw.kind !== 'review-venue-preservation' ||
      preservationRaw.status !== 'preserved' ||
      !safeDigest(preservationRaw.venueDigest) ||
      !safeDigest(preservationRaw.evidenceDigest) ||
      preservationRaw.venueDigest !== expectedVenueDigest
    )
      return fail('FC-TRUST', 'RETIREMENT_PRESERVATION_UNVERIFIED');
    if (!preservationVerifier) return fail('FC-TRUST', 'PRESERVATION_VERIFIER_REQUIRED');
    let preservationVerified: ReviewPublicationResult<void>;
    try {
      preservationVerified = preservationVerifier.verify({ preservation: preservationRaw, bindings: typed });
    } catch {
      return fail('FC-TRUST', 'PRESERVATION_UNVERIFIED');
    }
    if (!preservationVerified.ok) return preservationVerified;
    const faults = raw.faults as readonly (ReviewPublicationFault | readonly ReviewPublicationFault[])[];
    for (let index = 0; index < typed.length; index += 1) {
      const binding = typed[index];
      const authorized = transition.authorize({ binding, retirement: true });
      if (!authorized.ok) return authorized;
      const proof = authorized.value;
      let intent: ReviewPublicationOperationIntent = Object.freeze({
        version: REVIEW_PUBLICATION_CONTRACT_VERSION,
        operation: binding.operation,
        operationType: binding.operationType,
        effect: 'effectful',
        port: REVIEW_PUBLICATION_PORT,
        capability: REVIEW_PUBLICATION_CAPABILITY,
        binding,
        proof,
        waitMs: REVIEW_PUBLICATION_BOUNDS.waitMs,
        retryLimit: REVIEW_PUBLICATION_BOUNDS.retryLimit,
        recoveryLimit: REVIEW_PUBLICATION_BOUNDS.recoveryLimit,
      });
      const recorded = transition.recordIntent(intent);
      if (!recorded.ok) return recorded;
      let attempt = 1;
      let completed = false;
      while (!completed) {
        const activeBinding = intent.binding;
        const selectedFault = faults[index];
        const fault = Array.isArray(selectedFault) ? (selectedFault[attempt - 1] ?? 'none') : (selectedFault ?? 'none');
        const dispatched = fixture.dispatch({ intent, attempt, fault });
        if (dispatched.ok) {
          const attestation = validateReviewPublicationAttestation(dispatched.value, intent);
          if (!attestation.ok) return attestation;
          completed = true;
          continue;
        }
        if (dispatched.error.family === 'FC-MECHANISM') {
          const lookup = fixture.lookup({ operation: activeBinding.operation, binding: activeBinding });
          const validLookup =
            lookup.ok && validReviewPublicationLookup(lookup.value, activeBinding.operation, activeBinding);
          if (validLookup && lookup.value.outcome === 'confirmed-absence' && lookup.value.resourceState === 'absent') {
            completed = true;
            continue;
          }
          if (validLookup && lookup.value.outcome === 'confirmed-absence' && attempt < RETIREMENT_ATTEMPT_BOUND) {
            const nextBinding = retirementRetryTyped[index]?.[attempt - 1];
            if (!nextBinding) break;
            const nextAttempt = attempt + 1;
            const reauthProof = transition.authorize({ binding: nextBinding, retirement: true });
            if (!reauthProof.ok) return reauthProof;
            const capabilityDigest = publicationCapabilityDigestForBinding(nextBinding);
            if (!capabilityDigest) return fail('FC-TRUST', 'CAPABILITY_DIGEST_FAILED');
            const reauth = transition.recordReauthorization({
              version: REVIEW_PUBLICATION_CONTRACT_VERSION,
              operation: activeBinding.operation,
              previousAttempt: attempt,
              attempt: nextAttempt,
              confirmedAbsenceDigest: lookup.value.observationDigest,
              binding: nextBinding,
              capabilityDigest,
              generation: nextBinding.generation,
              fence: nextBinding.fence,
              proof: reauthProof.value,
            });
            if (!reauth.ok) return reauth;
            attempt = nextAttempt;
            intent = Object.freeze({ ...intent, binding: nextBinding, proof: reauth.value });
            continue;
          }
        }
        break;
      }
      if (completed) continue;
      if (!obligationController) return fail('FC-AUTHORITY', 'RETIREMENT_OBLIGATION_ALLOCATOR_REQUIRED');
      const obligationInput = exactFields(raw.obligation, [
        'run',
        'generation',
        'resource',
        'duty',
        'origin',
        'reason',
        'preservationEvidence',
        'accountableOwner',
        'criteria',
        'startedAt',
        'deadline',
        'policyDigest',
      ]);
      const obligationEvidence =
        obligationInput &&
        exactFields(obligationInput.preservationEvidence, [
          'schema',
          'key',
          'subject',
          'claim',
          'manifestDigest',
          'artifactDigest',
          'trustRoot',
          'referenceDigest',
        ]);
      const obligationCriteria = obligationInput && exactFields(obligationInput.criteria, ['subject', 'claim']);
      const expectedCriteriaDigest =
        obligationCriteria &&
        obligationCriteriaDigest({
          subject: obligationCriteria.subject as string,
          claim: obligationCriteria.claim as string,
        });
      const validRetirementObligation =
        obligationInput &&
        obligationEvidence &&
        obligationCriteria &&
        obligationEvidence.schema === 'jig.obligation-evidence.v1' &&
        identity('ID-EVSUBJ', obligationEvidence.subject) &&
        safeText(obligationEvidence.claim) &&
        safeDigest(obligationEvidence.key) &&
        safeDigest(obligationEvidence.manifestDigest) &&
        safeDigest(obligationEvidence.artifactDigest) &&
        safeDigest(obligationEvidence.trustRoot) &&
        safeDigest(obligationEvidence.referenceDigest) &&
        expectedCriteriaDigest &&
        obligationEvidence.subject === obligationCriteria.subject &&
        obligationEvidence.claim === obligationCriteria.claim &&
        obligationEvidence.referenceDigest === preservationRaw.evidenceDigest &&
        obligationInput.run === binding.subject.run &&
        obligationInput.generation === binding.generation &&
        obligationInput.resource === binding.reviewRef &&
        obligationInput.duty === 'retirement' &&
        obligationInput.origin === proof.event &&
        safeText(obligationInput.reason) &&
        safeDigest(obligationEvidence.key) &&
        safeText(obligationCriteria.subject) &&
        safeText(obligationCriteria.claim) &&
        obligationInput.accountableOwner === 'principal/arye' &&
        Number.isSafeInteger(obligationInput.startedAt) &&
        Number.isSafeInteger(obligationInput.deadline) &&
        (obligationInput.deadline as number) - (obligationInput.startedAt as number) >=
          OBLIGATION_BOUND.minimumSeconds &&
        (obligationInput.deadline as number) - (obligationInput.startedAt as number) <=
          OBLIGATION_BOUND.maximumSeconds &&
        safeDigest(obligationInput.policyDigest);
      if (!validRetirementObligation) return fail('FC-AUTHORITY', 'RETIREMENT_OBLIGATION_BINDING_MISMATCH');
      const allocated = obligationController.openAllocated({
        ...obligationInput,
        preservationEvidence: { key: obligationEvidence.key },
      });
      if (!allocated.ok) return fail('FC-TRUST', 'RETIREMENT_OBLIGATION_ALLOCATION_FAILED');
      const returnedEvidence = allocated.value.preservationEvidence;
      const returnedCriteria = allocated.value.criteria;
      const returnedBoundDigest = obligationBoundDigest({
        id: allocated.value.id,
        generation: allocated.value.generation,
        policyDigest: obligationInput.policyDigest as string,
        startedAt: obligationInput.startedAt as number,
        deadline: obligationInput.deadline as number,
      });
      if (
        allocated.value.run !== binding.subject.run ||
        allocated.value.generation !== binding.generation ||
        allocated.value.resource !== obligationInput.resource ||
        allocated.value.origin !== intent.proof.event ||
        allocated.value.duty !== obligationInput.duty ||
        allocated.value.reason !== obligationInput.reason ||
        allocated.value.accountableOwner !== obligationInput.accountableOwner ||
        allocated.value.startedAt !== obligationInput.startedAt ||
        allocated.value.deadline !== obligationInput.deadline ||
        allocated.value.policyDigest !== obligationInput.policyDigest ||
        allocated.value.bound !== OBLIGATION_BOUND.name ||
        allocated.value.boundDigest !== returnedBoundDigest ||
        returnedCriteria.subject !== obligationCriteria.subject ||
        returnedCriteria.claim !== obligationCriteria.claim ||
        returnedCriteria.digest !== expectedCriteriaDigest ||
        returnedEvidence.key !== obligationEvidence.key ||
        returnedEvidence.subject !== obligationEvidence.subject ||
        returnedEvidence.claim !== obligationEvidence.claim ||
        returnedEvidence.manifestDigest !== obligationEvidence.manifestDigest ||
        returnedEvidence.artifactDigest !== obligationEvidence.artifactDigest ||
        returnedEvidence.trustRoot !== obligationEvidence.trustRoot ||
        returnedEvidence.referenceDigest !== preservationRaw.evidenceDigest
      )
        return fail('FC-TRUST', 'RETIREMENT_OBLIGATION_BINDING_MISMATCH');
      const durableObligationDigest = digest('REVIEW-RETIREMENT-OBLIGATION', {
        obligation: allocated.value.id,
        event: allocated.value.event,
        boundDigest: allocated.value.boundDigest,
        criteriaDigest: allocated.value.criteria.digest,
        venueDigest: preservationRaw.venueDigest,
        evidenceDigest: preservationRaw.evidenceDigest,
      });
      return durableObligationDigest
        ? ok(
            Object.freeze({
              status: 'obligation' as const,
              operation: binding.operation,
              obligation: allocated.value.id,
              owner: 'RT-CONTROLLER' as const,
              completionCriteria: 'preserve-review-venue-and-complete-retirement' as const,
              evidenceDigest: preservationRaw.evidenceDigest,
              obligationDigest: durableObligationDigest as string,
            }),
          )
        : fail('FC-TRUST', 'RETIREMENT_OBLIGATION_DIGEST_FAILED');
    }
    return ok(Object.freeze({ status: 'retired' as const, operation: typed.at(-1)?.operation ?? null }));
  };
  return Object.freeze({
    publish,
    retire,
    snapshot: () =>
      Object.freeze({
        intents: transition.intents(),
        reauthorizations: transition.reauthorizations(),
        invocations: fixture.invocations(),
        transition: transition.snapshot(),
      }),
  });
}
