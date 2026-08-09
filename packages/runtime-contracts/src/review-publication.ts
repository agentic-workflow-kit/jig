import { type CanonicalJson, parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';

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
  reviewRef: string;
  request: ReviewPublicationRequest;
  markers: ReviewPublicationMarkers;
  explanationDigest: string;
  fence: ReviewPublicationFence;
  generation: string;
  manifest: string;
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
  generation: string;
  fence: ReviewPublicationFence;
  proof: ReviewPublicationCommitProof;
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
  reviewRef: string;
  request: ReviewPublicationRequest;
  markers: ReviewPublicationMarkers;
  explanationDigest: string;
  providerRevision: string;
  operations: readonly Readonly<{
    operation: string;
    operationType: ReviewPublicationOperationType;
    generation: string;
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
  observationDigest: string;
}>;
export type ScriptedReviewPublicationFixture = Readonly<{
  dispatch(input: unknown): ReviewPublicationResult<ReviewPublicationAttestation>;
  lookup(input: unknown): ReviewPublicationResult<ReviewPublicationLookup>;
  invocations(): readonly ReviewPublicationInvocation[];
  reachability(): Readonly<{ providerEnabled: false; dispatchEnabled: false; status: 'unavailable' }>;
}>;
export type ReviewPublicationTransitionRecorder = Readonly<{
  recordIntent(input: unknown): ReviewPublicationResult<ReviewPublicationCommitProof>;
  recordReauthorization(input: unknown): ReviewPublicationResult<ReviewPublicationCommitProof>;
  intents(): readonly ReviewPublicationOperationIntent[];
  reauthorizations(): readonly ReviewPublicationReauthorization[];
}>;

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
const identity = (kind: string, value: unknown): value is string =>
  typeof value === 'string' && parseIdentity(kind, value).ok;
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
        generation: raw.generation,
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
    'reviewRef',
    'request',
    'markers',
    'explanationDigest',
    'fence',
    'generation',
    'manifest',
    'authority',
  ]);
  const subject = raw && parseSubject(raw.subject);
  const fence = raw && subject && parseFence(raw.fence, subject);
  const request = raw && parseRequest(raw.request);
  const markers = raw && parseMarkers(raw.markers);
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
    !safeText(raw.reviewRef) ||
    !safeDigest(raw.explanationDigest) ||
    !identity('ID-MANIFEST', raw.manifest) ||
    raw.generation !== fence.generation ||
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
      reviewRef: raw.reviewRef,
      request,
      markers,
      explanationDigest: raw.explanationDigest,
      fence,
      generation: raw.generation,
      manifest: raw.manifest,
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

const makeProof = (
  operation: string,
  subject: ReviewPublicationSubject,
  seed: unknown,
): ReviewPublicationCommitProof | undefined => {
  const coordinates = proofCoordinates(operation, subject.run);
  const recordDigest = digest('REVIEW-PUBLICATION-INTENT', { operation, subject, seed });
  return coordinates && recordDigest
    ? Object.freeze({
        kind: 'committed-witnessed',
        position: coordinates.position,
        event: coordinates.event,
        transaction: coordinates.transaction,
        operation,
        recordDigest,
        witnessDigest: recordDigest,
      })
    : undefined;
};
const bindingKey = (binding: ReviewPublicationBinding): string =>
  digest('REVIEW-PUBLICATION-BINDING', binding) ?? `${binding.operation}\0${binding.reviewRef}`;

export function createScriptedReviewPublicationFixture(): ScriptedReviewPublicationFixture {
  const invocations: ReviewPublicationInvocation[] = [];
  const dispatched = new Set<string>();
  const outcomes = new Map<string, 'confirmed-effect' | 'confirmed-absence' | 'indeterminate'>();
  const bindings = new Map<string, ReviewPublicationBinding>();
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
      !['none', 'mechanism-absence', 'lost-response', 'contradictory-result', 'invalid-attestation'].includes(
        raw.fault as string,
      )
    )
      return fail('FC-INPUT', 'INVALID_SCRIPTED_REVIEW_FAULT');
    dispatched.add(key);
    const fault = raw.fault as ReviewPublicationFault;
    const result =
      fault === 'mechanism-absence'
        ? 'mechanism-absent'
        : fault === 'lost-response' || fault === 'contradictory-result'
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
    if (fault === 'mechanism-absence') {
      outcomes.set(intent.value.operation, 'confirmed-absence');
      return fail('FC-MECHANISM', 'CONFIRMED_MECHANISM_ABSENCE');
    }
    if (fault === 'lost-response' || fault === 'contradictory-result') {
      outcomes.set(intent.value.operation, 'indeterminate');
      return fail('FC-EFFECT', 'UNCERTAIN_REVIEW_EFFECT');
    }
    if (fault === 'invalid-attestation') return fail('FC-MECHANISM', 'INVALID_REVIEW_PUBLICATION_ATTESTATION');
    const providerRevision = digest('REVIEW-PUBLICATION-PROVIDER-REVISION', {
      binding: intent.value.binding,
      attempt,
    });
    const effectDigest = digest('REVIEW-PUBLICATION-EFFECT', {
      binding: intent.value.binding,
      attempt,
      effect: isRetirement(intent.value.operationType) ? 'retired' : 'published',
    });
    if (!providerRevision || !effectDigest) return fail('FC-MECHANISM', 'SCRIPTED_REVIEW_FACT_UNAVAILABLE');
    outcomes.set(intent.value.operation, 'confirmed-effect');
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
    const observationDigest =
      outcome && digest('REVIEW-PUBLICATION-LOOKUP', { operation: raw.operation, binding: binding.value, outcome });
    return outcome && observationDigest
      ? ok(Object.freeze({ operation: raw.operation, binding: binding.value, outcome, observationDigest }))
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

export function createReviewPublicationTransitionRecorder(): ReviewPublicationTransitionRecorder {
  const recorded: ReviewPublicationOperationIntent[] = [];
  const reauthorizations: ReviewPublicationReauthorization[] = [];
  return Object.freeze({
    recordIntent(input: unknown): ReviewPublicationResult<ReviewPublicationCommitProof> {
      const intent = validateIntent(input);
      if (!intent.ok) return intent;
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
        'generation',
        'fence',
        'proof',
      ]);
      const existing = raw && recorded.find((entry) => entry.operation === raw.operation);
      const fence = raw && existing && parseFence(raw.fence, existing.binding.subject);
      const proof = raw && existing && parseProof(raw.proof, raw.operation as string, existing.binding.subject.run);
      const previousAttempt = raw?.previousAttempt;
      const attempt = raw?.attempt;
      if (
        !raw ||
        !existing ||
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
        raw.generation !== existing.binding.generation ||
        raw.operation !== existing.operation ||
        reauthorizations.some((entry) => entry.operation === raw.operation && entry.attempt === attempt)
      )
        return fail('FC-AUTHORITY', 'INVALID_REVIEW_REAUTHORIZATION');
      const value: ReviewPublicationReauthorization = Object.freeze({
        version: REVIEW_PUBLICATION_CONTRACT_VERSION,
        operation: raw.operation,
        previousAttempt: previousAttempt as number,
        attempt: attempt as number,
        confirmedAbsenceDigest: raw.confirmedAbsenceDigest,
        generation: raw.generation,
        fence,
        proof,
      });
      reauthorizations.push(value);
      return ok(proof);
    },
    intents: () => Object.freeze([...recorded]),
    reauthorizations: () => Object.freeze([...reauthorizations]),
  });
}

const parseObservationOperations = (value: unknown): RequiredVenueObservation['operations'] | undefined => {
  if (!Array.isArray(value) || value.length !== 4 || Object.getPrototypeOf(value) !== Array.prototype) return undefined;
  const parsed = value.map((entry) => {
    const item = exactFields(entry, ['operation', 'operationType', 'generation', 'effect']);
    return item &&
      identity('ID-OP', item.operation) &&
      operationType(item.operationType) &&
      !isRetirement(item.operationType) &&
      identity('ID-GEN', item.generation) &&
      item.effect === 'confirmed-effect'
      ? Object.freeze({
          operation: item.operation,
          operationType: item.operationType,
          generation: item.generation,
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
  const generation = operations[0]?.generation;
  return generation && operations.every((entry) => entry.generation === generation)
    ? Object.freeze(operations)
    : undefined;
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
    if (
      !parsed ||
      !subject ||
      !request ||
      !markers ||
      !operations ||
      parsed.version !== REVIEW_PUBLICATION_CONTRACT_VERSION ||
      parsed.kind !== 'review-publication-observation' ||
      parsed.mode !== 'required-venue' ||
      !safeText(parsed.reviewRef) ||
      !safeDigest(parsed.explanationDigest) ||
      !safeText(parsed.providerRevision) ||
      !identity('ID-MANIFEST', parsed.manifest) ||
      !safeDigest(parsed.capabilityDigest) ||
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
  retire(
    input: unknown,
  ): ReviewPublicationResult<Readonly<{ status: 'retired' | 'obligation'; operation: string | null }>>;
  snapshot(): Readonly<{
    intents: readonly ReviewPublicationOperationIntent[];
    reauthorizations: readonly ReviewPublicationReauthorization[];
    invocations: readonly ReviewPublicationInvocation[];
  }>;
}>;

export function createReviewPublicationController(
  input: Readonly<{
    transition?: ReviewPublicationTransitionRecorder;
    fixture?: ScriptedReviewPublicationFixture;
  }> = {},
): ReviewPublicationController {
  const transition = input.transition ?? createReviewPublicationTransitionRecorder();
  const fixture = input.fixture ?? createScriptedReviewPublicationFixture();
  const publish = (value: unknown): ReviewPublicationResult<RequiredVenueObservation | ExplicitAbsenceObservation> => {
    const raw =
      exactFields(value, ['mode', 'subject', 'bindings', 'faults']) ?? exactFields(value, ['mode', 'subject']);
    if (!raw || !REVIEW_PUBLICATION_MODES.includes(raw.mode as ReviewPublicationMode))
      return fail('FC-INPUT', 'UNKNOWN_OR_OMITTED_REVIEW_MODE');
    if (raw.mode === 'no-venue') {
      if (raw.bindings !== undefined || raw.faults !== undefined)
        return fail('FC-AUTHORITY', 'NO_VENUE_MUST_NOT_DISPATCH');
      return createExplicitAbsenceObservation({ mode: 'no-venue', subject: raw.subject });
    }
    if (
      !Array.isArray(raw.bindings) ||
      raw.bindings.length !== 4 ||
      !Array.isArray(raw.faults) ||
      raw.faults.length > 4
    )
      return fail('FC-INPUT', 'INVALID_REQUIRED_REVIEW_INPUT');
    const bindings = raw.bindings.map((entry) => validateReviewPublicationBinding(entry));
    if (bindings.some((entry) => !entry.ok)) return fail('FC-SUBJECT', 'REVIEW_BINDING_MISMATCH');
    const typed = bindings.map((entry) => (entry as Extract<typeof entry, { ok: true }>).value);
    const inputSubject = parseSubject(raw.subject);
    if (!inputSubject || !same(inputSubject, typed[0]?.subject)) return fail('FC-SUBJECT', 'REVIEW_SUBJECT_MISMATCH');
    if (!bindingsSharePublicationIdentity(typed, REVIEW_PUBLICATION_REVIEW_OPERATIONS))
      return fail('FC-SUBJECT', 'REVIEW_BINDING_ORDER_OR_IDENTITY_MISMATCH');
    const faults = (raw.faults ?? []) as readonly (ReviewPublicationFault | readonly ReviewPublicationFault[])[];
    const successes: Array<RequiredVenueObservation['operations'][number]> = [];
    let providerRevision = '';
    let capabilityDigest = '';
    for (let index = 0; index < typed.length; index += 1) {
      const binding = typed[index];
      const proof = makeProof(binding.operation, binding.subject, { index, binding: bindingKey(binding) });
      if (!proof) return fail('FC-AUTHORITY', 'REVIEW_PROOF_COORDINATES_INVALID');
      const intent: ReviewPublicationOperationIntent = Object.freeze({
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
        const selectedFault = faults[index];
        const fault = Array.isArray(selectedFault) ? (selectedFault[attempt - 1] ?? 'none') : (selectedFault ?? 'none');
        const dispatched = fixture.dispatch({ intent, attempt, fault });
        if (dispatched.ok) {
          const attestation = validateReviewPublicationAttestation(dispatched.value, intent);
          if (!attestation.ok) return attestation;
          successes.push(
            Object.freeze({
              operation: binding.operation,
              operationType: binding.operationType,
              generation: binding.generation,
              effect: 'confirmed-effect',
            }),
          );
          providerRevision = attestation.value.providerRevision;
          capabilityDigest = digest('REVIEW-PUBLICATION-CAPABILITY', binding) ?? '';
          completed = true;
          continue;
        }
        if (dispatched.error.family === 'FC-MECHANISM' && dispatched.error.code !== 'CONFIRMED_MECHANISM_ABSENCE')
          return fail('FC-MECHANISM', dispatched.error.code);
        if (dispatched.error.family === 'FC-MECHANISM') {
          const lookup = fixture.lookup({ operation: binding.operation, binding });
          if (!lookup.ok || lookup.value.outcome !== 'confirmed-absence')
            return fail('FC-EFFECT', 'MECHANISM_ABSENCE_NOT_CONFIRMED');
          if (attempt >= REVIEW_PUBLICATION_BOUNDS.retryLimit)
            return fail('FC-BOUND', 'REVIEW_RETRY_EXHAUSTED_BLOCKED');
          attempt += 1;
          const reauthProof = makeProof(binding.operation, binding.subject, {
            attempt,
            absence: lookup.value.observationDigest,
          });
          if (!reauthProof) return fail('FC-AUTHORITY', 'REVIEW_REAUTH_PROOF_FAILED');
          const reauth = transition.recordReauthorization({
            version: REVIEW_PUBLICATION_CONTRACT_VERSION,
            operation: binding.operation,
            previousAttempt: attempt - 1,
            attempt,
            confirmedAbsenceDigest: lookup.value.observationDigest,
            generation: binding.generation,
            fence: binding.fence,
            proof: reauthProof,
          });
          if (!reauth.ok) return reauth;
          continue;
        }
        let recoveryAttempt = 0;
        while (recoveryAttempt < REVIEW_PUBLICATION_BOUNDS.recoveryLimit) {
          recoveryAttempt += 1;
          const recovery = fixture.lookup({ operation: binding.operation, binding });
          if (recovery.ok && recovery.value.outcome === 'confirmed-effect') {
            return fail('FC-EFFECT', 'REVIEW_EFFECT_RECONCILED_REQUIRES_REAUTHORIZATION');
          }
          if (recovery.ok && recovery.value.outcome === 'confirmed-absence') {
            return fail('FC-EFFECT', 'REVIEW_EFFECT_RECONCILED_ABSENCE_REQUIRES_REAUTHORIZATION');
          }
        }
        return fail('FC-EFFECT', 'REVIEW_EFFECT_UNCERTAIN_PARKED');
      }
    }
    const first = typed[0];
    const unsigned: Omit<RequiredVenueObservation, 'observationDigest'> = {
      version: REVIEW_PUBLICATION_CONTRACT_VERSION,
      kind: 'review-publication-observation',
      mode: 'required-venue',
      subject: first.subject,
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
  ): ReviewPublicationResult<Readonly<{ status: 'retired' | 'obligation'; operation: string | null }>> => {
    const raw = exactFields(value, ['bindings', 'faults', 'preserved']);
    if (
      !raw ||
      raw.preserved !== true ||
      !Array.isArray(raw.bindings) ||
      raw.bindings.length !== 4 ||
      !Array.isArray(raw.faults)
    )
      return fail('FC-INPUT', 'RETIREMENT_REQUIRES_PRESERVATION');
    const bindings = raw.bindings.map((entry) => validateReviewPublicationBinding(entry));
    if (bindings.some((entry) => !entry.ok)) return fail('FC-SUBJECT', 'RETIREMENT_BINDING_MISMATCH');
    const typed = bindings.map((entry) => (entry as Extract<typeof entry, { ok: true }>).value);
    if (!bindingsSharePublicationIdentity(typed, REVIEW_PUBLICATION_RETIRE_OPERATIONS))
      return fail('FC-AUTHORITY', 'RETIREMENT_OPERATION_REQUIRED');
    const faults = raw.faults as readonly (ReviewPublicationFault | readonly ReviewPublicationFault[])[];
    for (let index = 0; index < typed.length; index += 1) {
      const binding = typed[index];
      const proof = makeProof(binding.operation, binding.subject, { retirement: index, binding: bindingKey(binding) });
      if (!proof) return fail('FC-AUTHORITY', 'REVIEW_PROOF_COORDINATES_INVALID');
      const intent: ReviewPublicationOperationIntent = Object.freeze({
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
      const selectedFault = faults[index];
      const fault = Array.isArray(selectedFault) ? (selectedFault[0] ?? 'none') : (selectedFault ?? 'none');
      const dispatched = fixture.dispatch({ intent, attempt: 1, fault });
      if (dispatched.ok) {
        const attestation = validateReviewPublicationAttestation(dispatched.value, intent);
        if (!attestation.ok) return attestation;
        continue;
      }
      if (dispatched.error.family === 'FC-MECHANISM') {
        const lookup = fixture.lookup({ operation: binding.operation, binding });
        if (lookup.ok && lookup.value.outcome === 'confirmed-absence') continue;
      }
      return fail('FC-EFFECT', 'REVIEW_RETIREMENT_UNCERTAIN_OBLIGATION');
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
      }),
  });
}
