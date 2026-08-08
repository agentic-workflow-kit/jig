import { type CanonicalJson, parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';

/** Private GF-035 candidate/rework semantics. No provider or delivery effect is exposed here. */
export const CANDIDATE_CONTRACT_VERSION = 'jig.candidate-contract.v1';
export const CANDIDATE_SCHEMA = 'jig.sch-candidate.v1';
export const CANDIDATE_EVENT_SCHEMA = 'jig.candidate-event.v1';
export const REWORK_ASSIGNMENT_SCHEMA = 'jig.rework-assignment.v1';
export const CANDIDATE_CONTROLLER = 'RT-CONTROLLER';
export const CANDIDATE_SOURCES = Object.freeze(['session-result', 'workspace-refresh'] as const);
export const REWORK_ROLES = Object.freeze(['implementer'] as const);

export type CandidateSource = (typeof CANDIDATE_SOURCES)[number];
export type ReworkRole = (typeof REWORK_ROLES)[number];
export type CandidateFailureFamily =
  | 'FC-INPUT'
  | 'FC-SUBJECT'
  | 'FC-EVIDENCE'
  | 'FC-FENCE'
  | 'FC-BOUND'
  | 'FC-CAPACITY'
  | 'FC-AUTHORITY'
  | 'FC-TRUST';
export type CandidateFailure = Readonly<{ family: CandidateFailureFamily; code: string }>;
export type CandidateResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: CandidateFailure }>;

export type ChangedPath = Readonly<{ path: string; contentDigest: string }>;
export type DeliveryMetadata = Readonly<{
  changedPaths: readonly ChangedPath[];
  commitMessage: string | null;
  workspaceCommit: string | null;
  session: string;
}>;
export type CommitProof = Readonly<{
  kind: 'committed-witnessed';
  position: number;
  event: string;
  transaction: string;
  recordDigest: string;
  witnessDigest: string;
}>;

export type CandidateSourceBinding = Readonly<{
  event: CandidateObservation['event'];
  operation: string;
  sessionOrdinal: number;
  assignmentOrdinal: number;
  commitProof: CommitProof;
}>;

export type CandidateObservation = Readonly<{
  schema: typeof CANDIDATE_EVENT_SCHEMA;
  event: 'EV-SESSION-RESULT' | 'EV-WORKSPACE-FACT';
  source: CandidateSource;
  run: string;
  story: string;
  role: ReworkRole;
  session: string;
  principal: string;
  sessionOrdinal: number;
  assignmentOrdinal: number;
  operation: string;
  operationType: 'OPC-SESSION-COLLECT' | 'OPC-WS-OBSERVE';
  producerKey: string;
  runBasisDigest: string;
  targetBasisDigest: string;
  changedPaths: readonly ChangedPath[];
  treeDigest: string;
  workspaceCommit: string | null;
  commitMessage: string | null;
  evidenceManifestDigest: string;
  workspaceFingerprint: string;
  workspaceFactDigest: string;
  posture: string;
  generation: string;
  authorizingTransition: string;
  commitProof: CommitProof;
  committed: true;
}>;

export type Candidate = Readonly<{
  schema: typeof CANDIDATE_SCHEMA;
  id: string;
  run: string;
  story: string;
  role: ReworkRole;
  session: string;
  principal: string;
  sessionOrdinal: number;
  assignmentOrdinal: number;
  source: CandidateSource;
  sourceEventKey: string;
  sourceEvent: CandidateSourceBinding;
  candidateCreationKey: string;
  runBasisDigest: string;
  targetBasisDigest: string;
  changedPaths: readonly ChangedPath[];
  treeDigest: string;
  workspaceCommit: string | null;
  deliveryMetadata: DeliveryMetadata;
  deliveryMetadataDigest: string;
  evidenceManifestDigest: string;
  workspaceFingerprint: string;
  workspaceFactDigest: string;
  candidateContentDigest: string;
  posture: string;
  generation: string;
  authorizingTransition: string;
  commitProof: CommitProof;
}>;

export type CapacityReservationFact = Readonly<{
  schema: 'jig.capacity-reservation.v1';
  scheduler: 'jig.scheduler.v1';
  variant: 'reserve';
  run: string;
  story: string;
  resource: 'RC-IMPL-TURN';
  amount: 1;
  generation: string;
  authorizingTransition: string;
  reservationKey: string;
  policyDigest: string;
  position: number;
  previousDigest: string;
  contentDigest: string;
  commitProof: CommitProof;
  committed: true;
}>;

export type ReworkBoundFact = Readonly<{
  schema: 'jig.rework-bound.v1';
  bound: 'BND-REWORK';
  surface: 'review-rework';
  run: string;
  story: string;
  generation: string;
  policyDigest: string;
  limit: number;
  consumed: number;
  status: 'active' | 'exhausted';
  factDigest: string;
  committed: true;
}>;

export type PriorAssignmentFact = Readonly<{
  schema: 'jig.assignment-fence.v1';
  run: string;
  story: string;
  role: ReworkRole;
  session: string;
  assignmentOrdinal: number;
  generation: string;
  status: 'terminal' | 'reconciled' | 'fenced';
  fenceDigest: string;
  reason: 'rework' | 'recovery';
  authorizingTransition: string;
  commitProof: CommitProof;
  committed: true;
}>;

export type FreshSessionFact = Readonly<{
  schema: 'jig.fresh-session-fact.v1';
  run: string;
  story: string;
  role: ReworkRole;
  session: string;
  sessionOrdinal: number;
  assignmentOrdinal: number;
  principal: string;
  assignmentBasisDigest: string;
  generation: string;
  posture: string;
  state: 'open' | 'bound' | 'active';
  predecessor: string;
  authorizingTransition: string;
  commitProof: CommitProof;
  committed: true;
}>;

export type ReworkAssignment = Readonly<{
  schema: typeof REWORK_ASSIGNMENT_SCHEMA;
  run: string;
  story: string;
  role: ReworkRole;
  reworkOrdinal: number;
  assignmentOrdinal: number;
  session: string;
  sessionOrdinal: number;
  principal: string;
  priorCandidate: string;
  priorSession: string;
  assignmentBasisDigest: string;
  failedBasisDigest: string;
  reservationKey: string;
  reservationDigest: string;
  boundDigest: string;
  priorFenceDigest: string;
  generation: string;
  posture: string;
  authorizingTransition: string;
  commitProof: CommitProof;
}>;

export type StoryDisposition = 'Implementing' | 'Refreshing' | 'Reviewing' | 'Reworking' | 'Blocked' | 'NotRun';
export type StoryProjection = Readonly<{
  story: string;
  state: StoryDisposition;
  dependencies: readonly string[];
  directBlocker: boolean;
  blocker: string | null;
}>;

type CandidatePayload = Omit<Candidate, 'commitProof'>;
type CandidateRecord = Readonly<{
  kind: 'candidate';
  position: number;
  previousDigest: string;
  sourceFact: CandidateObservation;
  candidate: CandidatePayload;
  contentDigest: string;
}>;
type ReworkRecord = Readonly<{
  kind: 'rework';
  position: number;
  previousDigest: string;
  assignment: Omit<ReworkAssignment, 'commitProof'>;
  contentDigest: string;
}>;
type LedgerRecord = CandidateRecord | ReworkRecord;

export type CandidateLedgerSnapshot = Readonly<{
  schema: typeof CANDIDATE_CONTRACT_VERSION;
  position: number;
  digest: string;
  records: readonly LedgerRecord[];
}>;

export type CandidateLedger = Readonly<{
  snapshot(): CandidateResult<CandidateLedgerSnapshot>;
  append(
    input: Readonly<{ expectedPosition: number; expectedDigest: string; record: LedgerRecord }>,
  ): CandidateResult<LedgerRecord>;
  readCandidate(input: Readonly<{ candidateCreationKey: string }>): CandidateResult<CandidateRecord | null>;
  readRework(input: Readonly<{ story: string; reworkOrdinal: number }>): CandidateResult<ReworkRecord | null>;
}>;

export type CandidateController = Readonly<{
  createCandidate(input: unknown): CandidateResult<Candidate>;
  admitRework(input: unknown): CandidateResult<ReworkAssignment>;
  recoverRework(input: unknown): CandidateResult<ReworkAssignment>;
  candidate(id: unknown): CandidateResult<Candidate>;
  assignments(): readonly ReworkAssignment[];
  candidates(): readonly Candidate[];
  stories(): readonly StoryProjection[];
  snapshot(): CandidateResult<CandidateLedgerSnapshot>;
}>;

const DIGEST = /^[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40,64}$/u;
const TEXT = /^[a-z0-9](?:[a-z0-9-]{0,63})$/u;
const SECRET = /(?:api[_ -]?key|token|password|secret|credential|bearer)/iu;
const PATH = /^[^\0]+$/u;
const GENESIS = '0'.repeat(64);

const fail = <T = never>(family: CandidateFailureFamily, code: string): CandidateResult<T> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });
const ok = <T>(value: T): CandidateResult<T> => Object.freeze({ ok: true, value: deepFreeze(value) });

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function ownFields(value: unknown, names: readonly string[]): Record<string, unknown> | undefined {
  try {
    if (
      value === null ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.keys(descriptors).sort().join(',') !== [...names].sort().join(',')) return undefined;
    if (!Object.values(descriptors).every((descriptor) => 'value' in descriptor)) return undefined;
    return Object.fromEntries(names.map((name) => [name, descriptors[name]?.value]));
  } catch {
    return undefined;
  }
}

function array(value: unknown): readonly unknown[] | undefined {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const lengthDescriptor = descriptors.length;
    if (!lengthDescriptor || !('value' in lengthDescriptor)) return undefined;
    const length = lengthDescriptor.value;
    if (!Number.isSafeInteger(length) || length < 0) return undefined;
    const values: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !('value' in descriptor)) return undefined;
      values.push(descriptor.value);
    }
    if (Object.keys(descriptors).some((key) => key !== 'length' && !/^\d+$/u.test(key))) return undefined;
    return Object.freeze(values);
  } catch {
    return undefined;
  }
}

function digest(value: unknown): value is string {
  return typeof value === 'string' && DIGEST.test(value);
}

function text(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 2048 &&
    value.normalize('NFC') === value &&
    !SECRET.test(value)
  );
}

function keyText(value: unknown): value is string {
  return typeof value === 'string' && TEXT.test(value) && value.normalize('NFC') === value;
}

function position(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function ordinal(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

function hash(domain: string, value: unknown): string | undefined {
  try {
    const staged = stageDigest({ domain, excludePaths: [], value: value as CanonicalJson });
    return staged.ok ? staged.value.digest : undefined;
  } catch {
    return undefined;
  }
}

function exactEqual(left: unknown, right: unknown): boolean {
  const leftDigest = hash('CANDIDATE-COMPARE', left);
  const rightDigest = hash('CANDIDATE-COMPARE', right);
  return leftDigest !== undefined && leftDigest === rightDigest;
}

function validIdentity(kind: Parameters<typeof parseIdentity>[0], value: unknown): value is string {
  return typeof value === 'string' && parseIdentity(kind, value).ok;
}

function transitionGeneration(value: string): string | undefined {
  const transactionMarker = value.indexOf('/txn/');
  const generationMarker = value.indexOf('/gen/', transactionMarker);
  const basisDivider = value.lastIndexOf('|');
  const ordinalDivider = value.indexOf('/', transactionMarker + '/txn/'.length);
  if (transactionMarker < 0 || ordinalDivider < 0 || generationMarker < 0 || basisDivider <= generationMarker)
    return undefined;
  const generation = value.slice(ordinalDivider + 1, basisDivider);
  return validIdentity('ID-GEN', generation) ? generation : undefined;
}

function operationTransaction(value: string): string | undefined {
  const marker = value.lastIndexOf('/op/');
  return marker > 0 ? value.slice(0, marker) : undefined;
}

function identityOrdinal(value: string): number | undefined {
  const segment = value.slice(value.lastIndexOf('/') + 1);
  return /^[1-9][0-9]*$/u.test(segment) ? Number(segment) : undefined;
}

function validPath(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.length <= 1024 && PATH.test(value) && !SECRET.test(value)
  );
}

function parsePaths(value: unknown): readonly ChangedPath[] | undefined {
  const raw = array(value);
  if (!raw) return undefined;
  const paths: ChangedPath[] = [];
  for (const entry of raw) {
    const fields = ownFields(entry, ['path', 'contentDigest']);
    if (!fields || !validPath(fields.path) || !digest(fields.contentDigest)) return undefined;
    paths.push({ path: fields.path, contentDigest: fields.contentDigest } as ChangedPath);
  }
  const sorted = [...paths].sort((left, right) => left.path.localeCompare(right.path));
  return sorted.length === paths.length &&
    sorted.every((entry, index) => exactEqual(entry, paths[index])) &&
    new Set(paths.map((entry) => entry.path)).size === paths.length
    ? Object.freeze(paths)
    : undefined;
}

function parseProof(value: unknown, run: string, operation: string, transition: string): CommitProof | undefined {
  const raw = ownFields(value, ['kind', 'position', 'event', 'transaction', 'recordDigest', 'witnessDigest']);
  if (
    raw?.kind !== 'committed-witnessed' ||
    !position(raw.position) ||
    !validIdentity('ID-EVENT', raw.event) ||
    !validIdentity('ID-TXN', raw.transaction) ||
    !digest(raw.recordDigest) ||
    raw.recordDigest !== raw.witnessDigest ||
    raw.transaction !== transition ||
    raw.event !== `${run}/event/${(raw.position as number) + 1}` ||
    !operation.startsWith(`${raw.transaction}/op/`)
  )
    return undefined;
  return raw as unknown as CommitProof;
}

function candidateContentDigest(
  input: Readonly<Pick<CandidateObservation, 'targetBasisDigest' | 'changedPaths' | 'treeDigest' | 'workspaceCommit'>>,
): string | undefined {
  return hash('CANDIDATE-CONTENT', {
    targetBasisDigest: input.targetBasisDigest,
    changedPaths: input.changedPaths,
    treeDigest: input.treeDigest,
    workspaceCommit: input.workspaceCommit,
  });
}

function deliveryMetadataDigest(input: DeliveryMetadata): string | undefined {
  return hash('CANDIDATE-DELIVERY-METADATA', input);
}

function creationKey(
  input: Readonly<{
    source: CandidateSource;
    story: string;
    session: string;
    producerKey: string;
    candidateContentDigest: string;
  }>,
): string | undefined {
  return hash('CANDIDATE-CREATION-KEY', input);
}

function parseObservation(value: unknown): CandidateResult<CandidateObservation> {
  const raw = ownFields(value, [
    'schema',
    'event',
    'source',
    'run',
    'story',
    'role',
    'session',
    'principal',
    'sessionOrdinal',
    'assignmentOrdinal',
    'operation',
    'operationType',
    'producerKey',
    'runBasisDigest',
    'targetBasisDigest',
    'changedPaths',
    'treeDigest',
    'workspaceCommit',
    'commitMessage',
    'evidenceManifestDigest',
    'workspaceFingerprint',
    'workspaceFactDigest',
    'posture',
    'generation',
    'authorizingTransition',
    'commitProof',
    'committed',
  ]);
  const paths = raw && parsePaths(raw.changedPaths);
  const proof =
    raw?.run && raw.operation && raw.authorizingTransition
      ? parseProof(raw.commitProof, raw.run as string, raw.operation as string, raw.authorizingTransition as string)
      : undefined;
  if (
    !raw ||
    raw.schema !== CANDIDATE_EVENT_SCHEMA ||
    !CANDIDATE_SOURCES.includes(raw.source as CandidateSource) ||
    (raw.source === 'session-result' && raw.event !== 'EV-SESSION-RESULT') ||
    (raw.source === 'workspace-refresh' && raw.event !== 'EV-WORKSPACE-FACT') ||
    typeof raw.run !== 'string' ||
    !validIdentity('ID-RUN', raw.run) ||
    typeof raw.story !== 'string' ||
    !validIdentity('ID-STORY', raw.story) ||
    !raw.story.startsWith(`${raw.run}/story/`) ||
    !REWORK_ROLES.includes(raw.role as ReworkRole) ||
    typeof raw.session !== 'string' ||
    !validIdentity('ID-SESSION', raw.session) ||
    !raw.session.startsWith(`${raw.story}/session/${raw.role}/`) ||
    typeof raw.principal !== 'string' ||
    !validIdentity('ID-PRINCIPAL', raw.principal) ||
    !ordinal(raw.sessionOrdinal) ||
    !ordinal(raw.assignmentOrdinal) ||
    !validIdentity('ID-OP', raw.operation) ||
    (raw.source === 'session-result' && raw.operationType !== 'OPC-SESSION-COLLECT') ||
    (raw.source === 'workspace-refresh' && raw.operationType !== 'OPC-WS-OBSERVE') ||
    !digest(raw.producerKey) ||
    !digest(raw.runBasisDigest) ||
    !digest(raw.targetBasisDigest) ||
    !paths ||
    !digest(raw.treeDigest) ||
    (raw.workspaceCommit !== null && !COMMIT.test(String(raw.workspaceCommit))) ||
    (raw.commitMessage !== null && !text(raw.commitMessage)) ||
    !digest(raw.evidenceManifestDigest) ||
    !digest(raw.workspaceFingerprint) ||
    !digest(raw.workspaceFactDigest) ||
    !keyText(raw.posture) ||
    typeof raw.generation !== 'string' ||
    !validIdentity('ID-GEN', raw.generation) ||
    typeof raw.authorizingTransition !== 'string' ||
    !validIdentity('ID-TXN', raw.authorizingTransition) ||
    transitionGeneration(raw.authorizingTransition) !== raw.generation ||
    operationTransaction(raw.operation as string) !== raw.authorizingTransition ||
    !proof ||
    raw.committed !== true ||
    proof.transaction !== raw.authorizingTransition ||
    raw.sessionOrdinal !== Number(raw.session.slice(raw.session.lastIndexOf('/') + 1)) ||
    raw.assignmentOrdinal < 1 ||
    raw.session.startsWith(`${raw.story}/session/${raw.role}/0`)
  )
    return fail('FC-INPUT', 'INVALID_CANDIDATE_OBSERVATION');
  return ok(raw as unknown as CandidateObservation);
}

function candidatePayloadFromObservation(
  observation: CandidateObservation,
  candidateOrdinal: number,
): CandidatePayload | undefined {
  const contentDigest = candidateContentDigest(observation);
  const deliveryMetadata: DeliveryMetadata = {
    changedPaths: observation.changedPaths,
    commitMessage: observation.commitMessage,
    workspaceCommit: observation.workspaceCommit,
    session: observation.session,
  };
  const metadataDigest = deliveryMetadataDigest(deliveryMetadata);
  const key = creationKey({
    source: observation.source,
    story: observation.story,
    session: observation.session,
    producerKey: observation.producerKey,
    candidateContentDigest: contentDigest ?? '',
  });
  if (!contentDigest || !metadataDigest || !key) return undefined;
  const id = `${observation.story}/cand/${candidateOrdinal}|${contentDigest}`;
  return {
    schema: CANDIDATE_SCHEMA,
    id,
    run: observation.run,
    story: observation.story,
    role: observation.role,
    session: observation.session,
    principal: observation.principal,
    sessionOrdinal: observation.sessionOrdinal,
    assignmentOrdinal: observation.assignmentOrdinal,
    source: observation.source,
    sourceEventKey: observation.producerKey,
    sourceEvent: {
      event: observation.event,
      operation: observation.operation,
      sessionOrdinal: observation.sessionOrdinal,
      assignmentOrdinal: observation.assignmentOrdinal,
      commitProof: observation.commitProof,
    },
    candidateCreationKey: key,
    runBasisDigest: observation.runBasisDigest,
    targetBasisDigest: observation.targetBasisDigest,
    changedPaths: observation.changedPaths,
    treeDigest: observation.treeDigest,
    workspaceCommit: observation.workspaceCommit,
    deliveryMetadata,
    deliveryMetadataDigest: metadataDigest,
    evidenceManifestDigest: observation.evidenceManifestDigest,
    workspaceFingerprint: observation.workspaceFingerprint,
    workspaceFactDigest: observation.workspaceFactDigest,
    candidateContentDigest: contentDigest,
    posture: observation.posture,
    generation: observation.generation,
    authorizingTransition: observation.authorizingTransition,
  };
}

function candidateRecordDigest(candidate: CandidatePayload, sourceFact: CandidateObservation): string | undefined {
  return hash('CANDIDATE-RECORD', { kind: 'candidate', sourceFact, candidate });
}

function reworkRecordDigest(assignment: Omit<ReworkAssignment, 'commitProof'>): string | undefined {
  return hash('REWORK-RECORD', { kind: 'rework', assignment });
}

function validateCandidatePayload(value: unknown): CandidateResult<CandidatePayload> {
  const raw = ownFields(value, [
    'schema',
    'id',
    'run',
    'story',
    'role',
    'session',
    'principal',
    'sessionOrdinal',
    'assignmentOrdinal',
    'source',
    'sourceEventKey',
    'sourceEvent',
    'candidateCreationKey',
    'runBasisDigest',
    'targetBasisDigest',
    'changedPaths',
    'treeDigest',
    'workspaceCommit',
    'deliveryMetadata',
    'deliveryMetadataDigest',
    'evidenceManifestDigest',
    'workspaceFingerprint',
    'workspaceFactDigest',
    'candidateContentDigest',
    'posture',
    'generation',
    'authorizingTransition',
  ]);
  const paths = raw && parsePaths(raw.changedPaths);
  const metadata =
    raw && ownFields(raw.deliveryMetadata, ['changedPaths', 'commitMessage', 'workspaceCommit', 'session']);
  const sourceEvent =
    raw && ownFields(raw.sourceEvent, ['event', 'operation', 'sessionOrdinal', 'assignmentOrdinal', 'commitProof']);
  const sourceProof =
    raw &&
    sourceEvent &&
    typeof raw.run === 'string' &&
    typeof raw.authorizingTransition === 'string' &&
    typeof sourceEvent.operation === 'string'
      ? parseProof(sourceEvent.commitProof, raw.run, sourceEvent.operation as string, raw.authorizingTransition)
      : undefined;
  const metadataPaths = metadata && parsePaths(metadata.changedPaths);
  const expectedMetadata =
    metadata && metadataPaths
      ? deliveryMetadataDigest({
          changedPaths: metadataPaths,
          commitMessage: metadata.commitMessage as string | null,
          workspaceCommit: metadata.workspaceCommit as string | null,
          session: metadata.session as string,
        })
      : undefined;
  if (
    !raw ||
    raw.schema !== CANDIDATE_SCHEMA ||
    typeof raw.id !== 'string' ||
    !validIdentity('ID-CAND', raw.id) ||
    typeof raw.run !== 'string' ||
    !validIdentity('ID-RUN', raw.run) ||
    typeof raw.story !== 'string' ||
    !validIdentity('ID-STORY', raw.story) ||
    raw.story !== raw.id.slice(0, raw.id.indexOf('/cand/')) ||
    !raw.story.startsWith(`${raw.run}/story/`) ||
    !REWORK_ROLES.includes(raw.role as ReworkRole) ||
    typeof raw.session !== 'string' ||
    !validIdentity('ID-SESSION', raw.session) ||
    !raw.session.startsWith(`${raw.story}/session/${raw.role}/`) ||
    typeof raw.principal !== 'string' ||
    !validIdentity('ID-PRINCIPAL', raw.principal) ||
    !ordinal(raw.assignmentOrdinal) ||
    !CANDIDATE_SOURCES.includes(raw.source as CandidateSource) ||
    !digest(raw.sourceEventKey) ||
    !sourceEvent ||
    (raw.source === 'session-result' && sourceEvent.event !== 'EV-SESSION-RESULT') ||
    (raw.source === 'workspace-refresh' && sourceEvent.event !== 'EV-WORKSPACE-FACT') ||
    typeof sourceEvent.operation !== 'string' ||
    !validIdentity('ID-OP', sourceEvent.operation) ||
    operationTransaction(sourceEvent.operation) !== raw.authorizingTransition ||
    sourceEvent.sessionOrdinal !== raw.sessionOrdinal ||
    sourceEvent.assignmentOrdinal !== raw.assignmentOrdinal ||
    !sourceProof ||
    !digest(raw.candidateCreationKey) ||
    !digest(raw.runBasisDigest) ||
    !digest(raw.targetBasisDigest) ||
    !paths ||
    !digest(raw.treeDigest) ||
    (raw.workspaceCommit !== null && !COMMIT.test(String(raw.workspaceCommit))) ||
    !metadata ||
    !metadataPaths ||
    (metadata.commitMessage !== null && !text(metadata.commitMessage)) ||
    (metadata.workspaceCommit !== null && !COMMIT.test(String(metadata.workspaceCommit))) ||
    typeof metadata.session !== 'string' ||
    metadata.session !== raw.session ||
    !exactEqual(metadataPaths, paths) ||
    metadata.workspaceCommit !== raw.workspaceCommit ||
    !expectedMetadata ||
    raw.deliveryMetadataDigest !== expectedMetadata ||
    !digest(raw.deliveryMetadataDigest) ||
    !digest(raw.evidenceManifestDigest) ||
    !digest(raw.workspaceFingerprint) ||
    !digest(raw.workspaceFactDigest) ||
    !digest(raw.candidateContentDigest) ||
    !keyText(raw.posture) ||
    typeof raw.generation !== 'string' ||
    !validIdentity('ID-GEN', raw.generation) ||
    typeof raw.authorizingTransition !== 'string' ||
    !validIdentity('ID-TXN', raw.authorizingTransition) ||
    transitionGeneration(raw.authorizingTransition) !== raw.generation
  )
    return fail('FC-INPUT', 'INVALID_CANDIDATE_PAYLOAD');
  const expectedContent = candidateContentDigest({
    targetBasisDigest: raw.targetBasisDigest as string,
    changedPaths: paths,
    treeDigest: raw.treeDigest as string,
    workspaceCommit: raw.workspaceCommit as string | null,
  });
  if (expectedContent !== raw.candidateContentDigest) return fail('FC-FENCE', 'CANDIDATE_CONTENT_MISMATCH');
  const ordinalMatch = /\/cand\/([1-9][0-9]*)\|/u.exec(raw.id);
  if (!ordinalMatch || !Number.isSafeInteger(Number(ordinalMatch[1]))) return fail('FC-INPUT', 'INVALID_CANDIDATE_ID');
  if (raw.id !== `${raw.story}/cand/${ordinalMatch[1]}|${raw.candidateContentDigest}`)
    return fail('FC-FENCE', 'CANDIDATE_ID_CONTENT_MISMATCH');
  const expectedCreationKey = creationKey({
    source: raw.source as CandidateSource,
    story: raw.story as string,
    session: raw.session as string,
    producerKey: raw.sourceEventKey as string,
    candidateContentDigest: raw.candidateContentDigest as string,
  });
  if (!expectedCreationKey || expectedCreationKey !== raw.candidateCreationKey)
    return fail('FC-FENCE', 'CANDIDATE_CREATION_KEY_MISMATCH');
  return ok(raw as unknown as CandidatePayload);
}

function validateProofCandidate(record: CandidateRecord, run: string): CandidateResult<Candidate> {
  const payload = validateCandidatePayload(record.candidate);
  if (!payload.ok) return payload;
  const sourceFact = parseObservation(record.sourceFact);
  const candidateOrdinal = parseOrdinal(payload.value.id);
  const expectedPayload = candidateOrdinal
    ? candidatePayloadFromObservation(sourceFact.ok ? sourceFact.value : record.sourceFact, candidateOrdinal)
    : undefined;
  if (!sourceFact.ok || !expectedPayload || !exactEqual(expectedPayload, payload.value))
    return fail('FC-TRUST', 'INVALID_CANDIDATE_SOURCE');
  const contentDigest = candidateRecordDigest(payload.value, sourceFact.value);
  if (!contentDigest || contentDigest !== record.contentDigest || record.position < 0 || payload.value.run !== run)
    return fail('FC-TRUST', 'INVALID_CANDIDATE_RECORD');
  const transaction = payload.value.authorizingTransition;
  const event = `${run}/event/${record.position + 1}`;
  const proof: CommitProof = {
    kind: 'committed-witnessed',
    position: record.position,
    event,
    transaction,
    recordDigest: record.contentDigest,
    witnessDigest: record.contentDigest,
  };
  return ok({ ...payload.value, commitProof: proof });
}

function validReservation(
  value: unknown,
  run: string,
  story: string,
  generation: string,
  transition: string,
  reservationKey: string,
): value is CapacityReservationFact {
  const raw = ownFields(value, [
    'schema',
    'scheduler',
    'variant',
    'run',
    'story',
    'resource',
    'amount',
    'generation',
    'authorizingTransition',
    'reservationKey',
    'policyDigest',
    'position',
    'previousDigest',
    'contentDigest',
    'commitProof',
    'committed',
  ]);
  const proof = raw && parseProof(raw.commitProof, run, `${transition}/op/1`, transition);
  return (
    !!raw &&
    raw.schema === 'jig.capacity-reservation.v1' &&
    raw.scheduler === 'jig.scheduler.v1' &&
    raw.variant === 'reserve' &&
    raw.run === run &&
    raw.story === story &&
    raw.resource === 'RC-IMPL-TURN' &&
    raw.amount === 1 &&
    raw.generation === generation &&
    raw.authorizingTransition === transition &&
    raw.reservationKey === reservationKey &&
    digest(raw.policyDigest) &&
    position(raw.position) &&
    digest(raw.previousDigest) &&
    digest(raw.contentDigest) &&
    !!proof &&
    proof.recordDigest === raw.contentDigest &&
    raw.committed === true
  );
}

function validBound(value: unknown, run: string, story: string, generation: string): value is ReworkBoundFact {
  const raw = ownFields(value, [
    'schema',
    'bound',
    'surface',
    'run',
    'story',
    'generation',
    'policyDigest',
    'limit',
    'consumed',
    'status',
    'factDigest',
    'committed',
  ]);
  return (
    !!raw &&
    raw.schema === 'jig.rework-bound.v1' &&
    raw.bound === 'BND-REWORK' &&
    raw.surface === 'review-rework' &&
    raw.run === run &&
    raw.story === story &&
    raw.generation === generation &&
    digest(raw.policyDigest) &&
    typeof raw.limit === 'number' &&
    Number.isSafeInteger(raw.limit) &&
    raw.limit >= 1 &&
    raw.limit <= 5 &&
    typeof raw.consumed === 'number' &&
    Number.isSafeInteger(raw.consumed) &&
    raw.consumed >= 0 &&
    raw.consumed <= raw.limit &&
    (raw.status === 'active' || raw.status === 'exhausted') &&
    digest(raw.factDigest) &&
    raw.committed === true
  );
}

function validPrior(value: unknown, run: string, story: string, transition: string): value is PriorAssignmentFact {
  const raw = ownFields(value, [
    'schema',
    'run',
    'story',
    'role',
    'session',
    'assignmentOrdinal',
    'generation',
    'status',
    'fenceDigest',
    'reason',
    'authorizingTransition',
    'commitProof',
    'committed',
  ]);
  const proof = raw && parseProof(raw.commitProof, run, `${transition}/op/1`, transition);
  return (
    !!raw &&
    raw.schema === 'jig.assignment-fence.v1' &&
    raw.run === run &&
    raw.story === story &&
    REWORK_ROLES.includes(raw.role as ReworkRole) &&
    typeof raw.session === 'string' &&
    validIdentity('ID-SESSION', raw.session) &&
    ordinal(raw.assignmentOrdinal) &&
    typeof raw.generation === 'string' &&
    validIdentity('ID-GEN', raw.generation) &&
    (raw.status === 'terminal' || raw.status === 'reconciled' || raw.status === 'fenced') &&
    digest(raw.fenceDigest) &&
    (raw.reason === 'rework' || raw.reason === 'recovery') &&
    raw.authorizingTransition === transition &&
    !!proof &&
    proof.recordDigest === raw.fenceDigest &&
    raw.committed === true
  );
}

function validFreshSession(
  value: unknown,
  run: string,
  story: string,
  role: ReworkRole,
  assignmentOrdinal: number,
  sessionOrdinal: number,
  principal: string,
  basis: string,
  generation: string,
  posture: string,
  transition: string,
  predecessor: string,
): value is FreshSessionFact {
  const raw = ownFields(value, [
    'schema',
    'run',
    'story',
    'role',
    'session',
    'sessionOrdinal',
    'assignmentOrdinal',
    'principal',
    'assignmentBasisDigest',
    'generation',
    'posture',
    'state',
    'predecessor',
    'authorizingTransition',
    'commitProof',
    'committed',
  ]);
  const proof = raw && parseProof(raw.commitProof, run, `${transition}/op/1`, transition);
  return (
    !!raw &&
    raw.schema === 'jig.fresh-session-fact.v1' &&
    raw.run === run &&
    raw.story === story &&
    raw.role === role &&
    raw.session === `${story}/session/${role}/${sessionOrdinal}` &&
    raw.sessionOrdinal === sessionOrdinal &&
    raw.assignmentOrdinal === assignmentOrdinal &&
    raw.principal === principal &&
    raw.assignmentBasisDigest === basis &&
    raw.generation === generation &&
    raw.posture === posture &&
    (raw.state === 'open' || raw.state === 'bound' || raw.state === 'active') &&
    raw.predecessor === predecessor &&
    raw.authorizingTransition === transition &&
    !!proof &&
    raw.committed === true
  );
}

function createLedger(options: Readonly<{ fault?: 'after-witness' | 'after-flush' }> = {}): CandidateLedger {
  const records: LedgerRecord[] = [];
  let witness: Readonly<{ position: number; digest: string }> = { position: -1, digest: GENESIS };
  const trusted = (): CandidateResult<void> => {
    const positionValue = records.length - 1;
    const digestValue = records.at(-1)?.contentDigest ?? GENESIS;
    return witness.position === positionValue && witness.digest === digestValue
      ? ok(undefined)
      : fail('FC-TRUST', 'WITNESS_MISMATCH');
  };
  return {
    snapshot() {
      const trust = trusted();
      return trust.ok
        ? ok({
            schema: CANDIDATE_CONTRACT_VERSION,
            position: witness.position,
            digest: witness.digest,
            records: [...records],
          })
        : trust;
    },
    append(input) {
      const trust = trusted();
      if (!trust.ok) return trust;
      const currentPosition = records.length - 1;
      const currentDigest = records.at(-1)?.contentDigest ?? GENESIS;
      if (input.expectedPosition !== currentPosition || input.expectedDigest !== currentDigest)
        return fail('FC-FENCE', 'EXPECTED_CANDIDATE_HEAD_MISMATCH');
      const record =
        input.record.kind === 'candidate'
          ? {
              ...input.record,
              position: currentPosition + 1,
              previousDigest: currentDigest,
              contentDigest: candidateRecordDigest(input.record.candidate, input.record.sourceFact) ?? '',
            }
          : {
              ...input.record,
              position: currentPosition + 1,
              previousDigest: currentDigest,
              contentDigest: reworkRecordDigest(input.record.assignment) ?? '',
            };
      if (!record.contentDigest) return fail('FC-INPUT', 'CANDIDATE_RECORD_DIGEST');
      const existing =
        record.kind === 'candidate'
          ? records.find(
              (entry): entry is CandidateRecord =>
                entry.kind === 'candidate' &&
                entry.candidate.candidateCreationKey === record.candidate.candidateCreationKey,
            )
          : records.find(
              (entry): entry is ReworkRecord =>
                entry.kind === 'rework' &&
                entry.assignment.story === record.assignment.story &&
                entry.assignment.reworkOrdinal === record.assignment.reworkOrdinal,
            );
      if (existing)
        return exactEqual(existing, record) ? ok(existing) : fail('FC-TRUST', 'DUPLICATE_KEY_DIFFERENT_BYTES');
      records.push(record as LedgerRecord);
      if (options.fault === 'after-flush') return fail('FC-TRUST', 'ACK_LOST');
      witness = { position: record.position, digest: record.contentDigest };
      if (options.fault === 'after-witness') return fail('FC-TRUST', 'ACK_LOST');
      return ok(record as LedgerRecord);
    },
    readCandidate(input) {
      const trust = trusted();
      if (!trust.ok) return trust;
      return ok(
        records.find(
          (entry): entry is CandidateRecord =>
            entry.kind === 'candidate' && entry.candidate.candidateCreationKey === input.candidateCreationKey,
        ) ?? null,
      );
    },
    readRework(input) {
      const trust = trusted();
      if (!trust.ok) return trust;
      return ok(
        records.find(
          (entry): entry is ReworkRecord =>
            entry.kind === 'rework' &&
            entry.assignment.story === input.story &&
            entry.assignment.reworkOrdinal === input.reworkOrdinal,
        ) ?? null,
      );
    },
  };
}

export function createScriptedCandidateLedger(
  options: Readonly<{ fault?: 'after-witness' | 'after-flush' }> = {},
): CandidateLedger {
  return createLedger(options);
}

export function deriveReworkReservationKey(
  input: Readonly<{ story: string; reworkOrdinal: number; transition: string }>,
): string {
  return hash('REWORK-RESERVATION-KEY', input) ?? '';
}

export function deriveReworkAssignmentBasisDigest(
  input: Readonly<{
    story: string;
    role: ReworkRole;
    reworkOrdinal: number;
    priorCandidate: string;
    failedBasisDigest: string;
    generation: string;
    posture: string;
    transition: string;
  }>,
): string {
  return hash('REWORK-ASSIGNMENT-BASIS', input) ?? '';
}

function validateStoryGraph(value: unknown, run: string): readonly StoryProjection[] | undefined {
  const entries = array(value);
  if (!entries || entries.length === 0) return undefined;
  const stories: StoryProjection[] = [];
  for (const entry of entries) {
    const raw = ownFields(entry, ['story', 'state', 'dependencies', 'directBlocker', 'blocker']);
    const dependencies = raw && array(raw.dependencies);
    if (
      !raw ||
      typeof raw.story !== 'string' ||
      !validIdentity('ID-STORY', raw.story) ||
      !raw.story.startsWith(`${run}/story/`) ||
      !dependencies ||
      !dependencies.every(
        (dependency) =>
          typeof dependency === 'string' &&
          validIdentity('ID-STORY', dependency) &&
          dependency.startsWith(`${run}/story/`),
      ) ||
      !['Implementing', 'Refreshing', 'Reviewing', 'Reworking', 'Blocked', 'NotRun'].includes(raw.state as string) ||
      typeof raw.directBlocker !== 'boolean' ||
      (raw.blocker !== null && typeof raw.blocker !== 'string')
    )
      return undefined;
    stories.push({
      story: raw.story,
      state: raw.state as StoryDisposition,
      dependencies: dependencies as readonly string[],
      directBlocker: raw.directBlocker,
      blocker: raw.blocker as string | null,
    });
  }
  return Object.freeze(stories);
}

function candidateFromRecord(record: CandidateRecord, run: string): CandidateResult<Candidate> {
  const payload = validateProofCandidate(record, run);
  return payload;
}

function assignmentFromRecord(record: ReworkRecord, run: string): CandidateResult<ReworkAssignment> {
  const raw = ownFields(record.assignment, [
    'schema',
    'run',
    'story',
    'role',
    'reworkOrdinal',
    'assignmentOrdinal',
    'session',
    'sessionOrdinal',
    'principal',
    'priorCandidate',
    'priorSession',
    'assignmentBasisDigest',
    'failedBasisDigest',
    'reservationKey',
    'reservationDigest',
    'boundDigest',
    'priorFenceDigest',
    'generation',
    'posture',
    'authorizingTransition',
  ]);
  if (
    !raw ||
    raw.schema !== REWORK_ASSIGNMENT_SCHEMA ||
    raw.run !== run ||
    !validIdentity('ID-RUN', raw.run) ||
    typeof raw.story !== 'string' ||
    !validIdentity('ID-STORY', raw.story) ||
    !raw.story.startsWith(`${run}/story/`) ||
    raw.role !== 'implementer' ||
    !ordinal(raw.reworkOrdinal) ||
    !ordinal(raw.assignmentOrdinal) ||
    !ordinal(raw.sessionOrdinal) ||
    typeof raw.session !== 'string' ||
    !validIdentity('ID-SESSION', raw.session) ||
    raw.session !== `${raw.story}/session/${raw.role}/${raw.sessionOrdinal}` ||
    typeof raw.principal !== 'string' ||
    !validIdentity('ID-PRINCIPAL', raw.principal) ||
    typeof raw.priorCandidate !== 'string' ||
    !validIdentity('ID-CAND', raw.priorCandidate) ||
    typeof raw.priorSession !== 'string' ||
    !validIdentity('ID-SESSION', raw.priorSession) ||
    !digest(raw.assignmentBasisDigest) ||
    !digest(raw.failedBasisDigest) ||
    !digest(raw.reservationKey) ||
    !digest(raw.reservationDigest) ||
    !digest(raw.boundDigest) ||
    !digest(raw.priorFenceDigest) ||
    typeof raw.generation !== 'string' ||
    !validIdentity('ID-GEN', raw.generation) ||
    !keyText(raw.posture) ||
    typeof raw.authorizingTransition !== 'string' ||
    !validIdentity('ID-TXN', raw.authorizingTransition) ||
    !reworkRecordDigest(raw as unknown as Omit<ReworkAssignment, 'commitProof'>) ||
    reworkRecordDigest(raw as unknown as Omit<ReworkAssignment, 'commitProof'>) !== record.contentDigest
  )
    return fail('FC-TRUST', 'INVALID_REWORK_RECORD');
  const proof: CommitProof = {
    kind: 'committed-witnessed',
    position: record.position,
    event: `${run}/event/${record.position + 1}`,
    transaction: record.assignment.authorizingTransition,
    recordDigest: record.contentDigest,
    witnessDigest: record.contentDigest,
  };
  return ok({ ...record.assignment, commitProof: proof });
}

function validateLedgerSnapshot(
  snapshot: CandidateLedgerSnapshot,
  run: string,
): CandidateResult<CandidateLedgerSnapshot> {
  if (
    snapshot.schema !== CANDIDATE_CONTRACT_VERSION ||
    snapshot.position !== snapshot.records.length - 1 ||
    snapshot.digest !== (snapshot.records.at(-1)?.contentDigest ?? GENESIS)
  )
    return fail('FC-TRUST', 'INVALID_CANDIDATE_HEAD');
  let previousDigest = GENESIS;
  for (const [index, record] of snapshot.records.entries()) {
    if (
      record.position !== index ||
      record.previousDigest !== previousDigest ||
      !position(record.position) ||
      !digest(record.contentDigest)
    )
      return fail('FC-TRUST', 'INVALID_CANDIDATE_CHAIN');
    const validated =
      record.kind === 'candidate' ? candidateFromRecord(record, run) : assignmentFromRecord(record, run);
    if (!validated.ok) return validated;
    previousDigest = record.contentDigest;
  }
  return ok(snapshot);
}

function parseOrdinal(id: string): number | undefined {
  const match = /\/cand\/([1-9][0-9]*)\|/u.exec(id);
  return match ? Number(match[1]) : undefined;
}

export function createCandidateController(
  input: Readonly<{ run: string; basisDigest: string; generation: string; graph: unknown; ledger?: CandidateLedger }>,
): CandidateResult<CandidateController> {
  if (
    !validIdentity('ID-RUN', input.run) ||
    !digest(input.basisDigest) ||
    !validIdentity('ID-GEN', input.generation) ||
    !input.generation.startsWith(`${input.run}/gen/`)
  )
    return fail('FC-INPUT', 'INVALID_RUN_BASIS');
  const graph = validateStoryGraph(input.graph, input.run);
  if (!graph) return fail('FC-INPUT', 'INVALID_STORY_GRAPH');
  const ledger = input.ledger ?? createLedger();
  const candidates: Candidate[] = [];
  const assignments: ReworkAssignment[] = [];
  const rebuild = (): CandidateResult<void> => {
    const snapshot = ledger.snapshot();
    if (!snapshot.ok) return snapshot;
    const validatedSnapshot = validateLedgerSnapshot(snapshot.value, input.run);
    if (!validatedSnapshot.ok) return validatedSnapshot;
    candidates.length = 0;
    assignments.length = 0;
    for (const record of validatedSnapshot.value.records) {
      if (record.kind === 'candidate') {
        const candidate = candidateFromRecord(record, input.run);
        if (!candidate.ok) return candidate;
        candidates.push(candidate.value);
      } else {
        const assignment = assignmentFromRecord(record, input.run);
        if (!assignment.ok) return assignment;
        assignments.push(assignment.value);
      }
    }
    return ok(undefined);
  };
  const initial = rebuild();
  if (!initial.ok) return initial;
  const storyMap = new Map(graph.map((story) => [story.story, { ...story, dependencies: [...story.dependencies] }]));
  const head = (): CandidateResult<CandidateLedgerSnapshot> => ledger.snapshot();
  const nextSessionOrdinal = (story: string, role: ReworkRole): number =>
    Math.max(
      0,
      ...candidates
        .filter((candidate) => candidate.story === story && candidate.role === role)
        .map((candidate) => identityOrdinal(candidate.session) ?? 0),
      ...assignments
        .filter((assignment) => assignment.story === story && assignment.role === role)
        .map((assignment) => assignment.sessionOrdinal),
    ) + 1;
  const createCandidate = (rawInput: unknown): CandidateResult<Candidate> => {
    const observation = parseObservation(rawInput);
    if (!observation.ok) return observation;
    if (observation.value.run !== input.run) return fail('FC-SUBJECT', 'CANDIDATE_RUN_MISMATCH');
    if (observation.value.runBasisDigest !== input.basisDigest || observation.value.generation !== input.generation)
      return fail('FC-FENCE', 'STALE_CANDIDATE_BASIS');
    const story = storyMap.get(observation.value.story);
    const expectedState = observation.value.source === 'session-result' ? 'Implementing' : 'Refreshing';
    if (!story) return fail('FC-AUTHORITY', 'CANDIDATE_STATE_NOT_CREATABLE');
    const contentDigest = candidateContentDigest(observation.value);
    const candidateCreationKey = contentDigest
      ? creationKey({
          source: observation.value.source,
          story: observation.value.story,
          session: observation.value.session,
          producerKey: observation.value.producerKey,
          candidateContentDigest: contentDigest,
        })
      : undefined;
    if (!candidateCreationKey) return fail('FC-INPUT', 'CANDIDATE_DIGEST_UNAVAILABLE');
    const existing = ledger.readCandidate({ candidateCreationKey });
    if (!existing.ok) return existing;
    if (existing.value) {
      const existingOrdinal = parseOrdinal(existing.value.candidate.id);
      const replayPayload = existingOrdinal
        ? candidatePayloadFromObservation(observation.value, existingOrdinal)
        : undefined;
      if (!replayPayload || !exactEqual(existing.value.candidate, replayPayload))
        return fail('FC-TRUST', 'DUPLICATE_KEY_DIFFERENT_BYTES');
      const replay = candidateFromRecord(existing.value, input.run);
      if (!replay.ok) return replay;
      return replay;
    }
    if (story.state !== expectedState) return fail('FC-AUTHORITY', 'CANDIDATE_STATE_NOT_CREATABLE');
    const ordinalValue =
      candidates
        .filter((candidate) => candidate.story === observation.value.story)
        .reduce((max, candidate) => Math.max(max, parseOrdinal(candidate.id) ?? 0), 0) + 1;
    const payload = candidatePayloadFromObservation(observation.value, ordinalValue);
    if (!payload) return fail('FC-INPUT', 'CANDIDATE_DIGEST_UNAVAILABLE');
    const current = head();
    if (!current.ok) return current;
    const appended = ledger.append({
      expectedPosition: current.value.position,
      expectedDigest: current.value.digest,
      record: {
        kind: 'candidate',
        position: 0,
        previousDigest: GENESIS,
        sourceFact: observation.value,
        candidate: payload,
        contentDigest: '',
      },
    });
    let record: CandidateRecord | null = appended.ok && appended.value.kind === 'candidate' ? appended.value : null;
    if (!record && !appended.ok && appended.error.code === 'ACK_LOST') {
      const readback = ledger.readCandidate({ candidateCreationKey: payload.candidateCreationKey });
      if (!readback.ok) return readback;
      record = readback.value;
    }
    if (!record) return appended.ok ? fail('FC-TRUST', 'CANDIDATE_RECORD_MISSING') : appended;
    if (record.position !== current.value.position + 1 || record.previousDigest !== current.value.digest)
      return fail('FC-TRUST', 'CANDIDATE_CHAIN_MISMATCH');
    const candidate = candidateFromRecord(record, input.run);
    if (!candidate.ok) return candidate;
    candidates.push(candidate.value);
    storyMap.set(observation.value.story, { ...story, state: 'Reviewing' });
    return candidate;
  };
  const admitRework = (rawInput: unknown, recovery: boolean): CandidateResult<ReworkAssignment> => {
    const raw = ownFields(rawInput, [
      'story',
      'role',
      'priorCandidate',
      'failedBasisDigest',
      'generation',
      'posture',
      'authorizingTransition',
      'bound',
      'reservation',
      'priorFence',
      'freshSession',
    ]);
    if (!raw) return fail('FC-AUTHORITY', 'REWORK_TRANSITION_REQUIRED');
    if (
      typeof raw.story !== 'string' ||
      !validIdentity('ID-STORY', raw.story) ||
      !raw.story.startsWith(`${input.run}/story/`) ||
      raw.role !== 'implementer'
    )
      return fail('FC-SUBJECT', 'INVALID_REWORK_SUBJECT');
    const story = storyMap.get(raw.story);
    const priorCandidate =
      typeof raw.priorCandidate === 'string'
        ? candidates.find((candidate) => candidate.id === raw.priorCandidate)
        : undefined;
    if (
      !story ||
      !priorCandidate ||
      priorCandidate.story !== raw.story ||
      (story.state !== 'Reviewing' && story.state !== 'Reworking')
    )
      return fail('FC-SUBJECT', 'PRIOR_CANDIDATE_REQUIRED');
    if (
      !digest(raw.failedBasisDigest) ||
      typeof raw.generation !== 'string' ||
      !validIdentity('ID-GEN', raw.generation) ||
      !keyText(raw.posture) ||
      typeof raw.authorizingTransition !== 'string' ||
      !validIdentity('ID-TXN', raw.authorizingTransition) ||
      raw.generation !== input.generation ||
      transitionGeneration(raw.authorizingTransition) !== raw.generation ||
      priorCandidate.generation !== input.generation
    )
      return fail('FC-INPUT', 'INVALID_REWORK_BASIS');
    if (!validBound(raw.bound, input.run, raw.story, raw.generation)) return fail('FC-BOUND', 'INVALID_REWORK_BOUND');
    const bound = raw.bound as ReworkBoundFact;
    if (bound.status === 'exhausted' || bound.consumed >= bound.limit) {
      storyMap.set(raw.story, { ...story, state: 'Blocked', blocker: 'BND-REWORK' });
      const blocked = new Set([raw.story]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const [id, candidateStory] of storyMap) {
          if (blocked.has(id) || !candidateStory.dependencies.some((dependency) => blocked.has(dependency))) continue;
          blocked.add(id);
          storyMap.set(id, { ...candidateStory, state: 'NotRun', blocker: raw.story });
          changed = true;
        }
      }
      return fail('FC-BOUND', 'REWORK_EXHAUSTED');
    }
    const reworkOrdinal = bound.consumed + 1;
    const assignmentOrdinal = reworkOrdinal + 1;
    const priorFence = raw.priorFence;
    if (!validPrior(priorFence, input.run, raw.story, raw.authorizingTransition))
      return fail('FC-FENCE', 'PRIOR_ASSIGNMENT_FENCE_REQUIRED');
    if (priorFence.session !== priorCandidate.session || priorFence.generation !== priorCandidate.generation)
      return fail('FC-FENCE', 'PRIOR_ASSIGNMENT_MISMATCH');
    const reservationKey = hash('REWORK-RESERVATION-KEY', {
      story: raw.story,
      reworkOrdinal,
      transition: raw.authorizingTransition,
    });
    const assignmentBasisDigest = deriveReworkAssignmentBasisDigest({
      story: raw.story,
      role: raw.role,
      reworkOrdinal,
      priorCandidate: priorCandidate.id,
      failedBasisDigest: raw.failedBasisDigest as string,
      generation: raw.generation as string,
      posture: raw.posture as string,
      transition: raw.authorizingTransition as string,
    });
    if (
      !reservationKey ||
      !assignmentBasisDigest ||
      !validReservation(
        raw.reservation,
        input.run,
        raw.story,
        raw.generation,
        raw.authorizingTransition,
        reservationKey,
      )
    )
      return fail('FC-CAPACITY', 'REWORK_CAPACITY_RESERVATION_REQUIRED');
    const reservation = raw.reservation as CapacityReservationFact;
    const existing = ledger.readRework({ story: raw.story, reworkOrdinal });
    if (!existing.ok) return existing;
    const sessionOrdinal =
      existing.value?.assignment.sessionOrdinal ?? nextSessionOrdinal(raw.story, raw.role as ReworkRole);
    const session = `${raw.story}/session/${raw.role}/${sessionOrdinal}`;
    const fresh = raw.freshSession;
    if (
      !validFreshSession(
        fresh,
        input.run,
        raw.story,
        raw.role,
        assignmentOrdinal,
        sessionOrdinal,
        reservation.story === raw.story ? priorCandidate.principal : '',
        assignmentBasisDigest,
        raw.generation,
        raw.posture,
        raw.authorizingTransition,
        priorCandidate.session,
      )
    )
      return fail('FC-FENCE', 'FRESH_SESSION_REQUIRED');
    if (
      fresh.session === priorCandidate.session ||
      fresh.sessionOrdinal <= (identityOrdinal(priorCandidate.session) ?? 0)
    )
      return fail('FC-FENCE', 'FRESH_SESSION_REQUIRED');
    const assignment: Omit<ReworkAssignment, 'commitProof'> = {
      schema: REWORK_ASSIGNMENT_SCHEMA,
      run: input.run,
      story: raw.story,
      role: 'implementer',
      reworkOrdinal,
      assignmentOrdinal,
      session,
      sessionOrdinal,
      principal: fresh.principal,
      priorCandidate: priorCandidate.id,
      priorSession: priorCandidate.session,
      assignmentBasisDigest,
      failedBasisDigest: raw.failedBasisDigest,
      reservationKey,
      reservationDigest: reservation.contentDigest,
      boundDigest: bound.factDigest,
      priorFenceDigest: priorFence.fenceDigest,
      generation: raw.generation,
      posture: raw.posture,
      authorizingTransition: raw.authorizingTransition,
    };
    if (existing.value) {
      if (!exactEqual(existing.value.assignment, assignment))
        return fail('FC-TRUST', 'DUPLICATE_REWORK_DIFFERENT_BYTES');
      const replay = assignmentFromRecord(existing.value, input.run);
      if (!replay.ok) return replay;
      return replay;
    }
    if (story.state === 'Reworking') return fail('FC-FENCE', 'REWORK_STATE_REQUIRES_FRESH_CANDIDATE');
    if (recovery) return fail('FC-TRUST', 'REWORK_RECOVERY_RECORD_MISSING');
    const current = head();
    if (!current.ok) return current;
    const appended = ledger.append({
      expectedPosition: current.value.position,
      expectedDigest: current.value.digest,
      record: { kind: 'rework', position: 0, previousDigest: GENESIS, assignment, contentDigest: '' },
    });
    let record: ReworkRecord | null = appended.ok && appended.value.kind === 'rework' ? appended.value : null;
    if (!record && !appended.ok && appended.error.code === 'ACK_LOST') {
      const readback = ledger.readRework({ story: raw.story, reworkOrdinal });
      if (!readback.ok) return readback;
      record = readback.value;
    }
    if (!record) return appended.ok ? fail('FC-TRUST', 'REWORK_RECORD_MISSING') : appended;
    if (record.position !== current.value.position + 1 || record.previousDigest !== current.value.digest)
      return fail('FC-TRUST', 'CANDIDATE_CHAIN_MISMATCH');
    const result = assignmentFromRecord(record, input.run);
    if (!result.ok) return result;
    assignments.push(result.value);
    storyMap.set(raw.story, { ...story, state: 'Reworking' });
    return result;
  };
  return ok({
    createCandidate,
    admitRework: (rawInput) => admitRework(rawInput, false),
    recoverRework: (rawInput) => admitRework(rawInput, true),
    candidate(id) {
      if (typeof id !== 'string' || !validIdentity('ID-CAND', id)) return fail('FC-INPUT', 'INVALID_CANDIDATE_ID');
      const candidate = candidates.find((entry) => entry.id === id);
      return candidate ? ok(candidate) : fail('FC-SUBJECT', 'CANDIDATE_NOT_FOUND');
    },
    assignments: () => Object.freeze([...assignments]),
    candidates: () => Object.freeze([...candidates]),
    stories: () =>
      Object.freeze(
        [...storyMap.values()].map((story) => ({ ...story, dependencies: Object.freeze([...story.dependencies]) })),
      ),
    snapshot: () => {
      const snapshot = ledger.snapshot();
      return snapshot.ok ? validateLedgerSnapshot(snapshot.value, input.run) : snapshot;
    },
  });
}
