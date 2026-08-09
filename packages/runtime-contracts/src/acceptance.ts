import { parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';
import type { EvidenceManifest } from './evidence.js';
import {
  type ExplicitAbsenceObservation,
  type RequiredVenueObservation,
  type ReviewPublicationObservation,
  validateReviewPublicationObservation,
} from './review-publication.js';

/** GF-040: pure, scripted, exact-candidate acceptance. No provider or delivery effect is exposed. */
export const ACCEPTANCE_CONTRACT_VERSION = 'jig.acceptance-contract.v1';
export const REVIEW_PACKAGE_SCHEMA = 'jig.rp-package.v1';
export const VERDICT_SCHEMA = 'jig.sch-verdict.v1';
export const FINDING_SCHEMA = 'jig.rp-finding.v1';
export const ACCEPTANCE_EVIDENCE_SCHEMA = 'jig.acceptance-evidence.v1';
export const ACCEPTANCE_CONTROLLER = 'RT-CONTROLLER';
export const ACCEPTANCE_EVENT = 'EV-SESSION-VERDICT';
export const ACCEPTANCE_POSTURES = Object.freeze(['deterministic', 'none'] as const);
export const FINDING_STATES = Object.freeze(['open', 'resolved', 'reopened', 'superseded'] as const);
export const VERDICT_KINDS = Object.freeze(['approve', 'changes-required'] as const);
export const REVIEW_MODES = Object.freeze(['required-venue', 'no-venue'] as const);
export const ACCEPTANCE_OWNER = 'principal/arye';
export const OWNER_DECISION_PROOF_DIGEST = 'a'.repeat(64);

export type AcceptancePosture = (typeof ACCEPTANCE_POSTURES)[number];
export type FindingState = (typeof FINDING_STATES)[number];
export type VerdictKind = (typeof VERDICT_KINDS)[number];
export type ReviewMode = (typeof REVIEW_MODES)[number];
export type AcceptanceFailureFamily =
  | 'FC-INPUT'
  | 'FC-SUBJECT'
  | 'FC-AUTHORITY'
  | 'FC-FENCE'
  | 'FC-EVIDENCE'
  | 'FC-POLICY'
  | 'FC-RULES'
  | 'FC-BOUND'
  | 'FC-MECHANISM'
  | 'FC-TRUST';
export type AcceptanceFailure = Readonly<{ family: AcceptanceFailureFamily; code: string }>;
export type AcceptanceResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: AcceptanceFailure }>;

export type FrozenRequirements = Readonly<{
  schema: 'jig.frozen-requirements.v1';
  requirements: readonly string[];
  acceptanceCriteria: readonly string[];
  digest: string;
}>;
export type AcceptancePolicy = Readonly<{
  schema: 'jig.acceptance-policy.v1';
  posture: AcceptancePosture;
  reviewMode: ReviewMode;
  ruleSurfaceDigest: string;
  digest: string;
}>;
export type AcceptanceEvidence = Readonly<{
  schema: typeof ACCEPTANCE_EVIDENCE_SCHEMA;
  manifest: EvidenceManifest;
  manifestDigest: string;
  candidate: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
  disposition: 'admitted';
  availability: 'available';
  integrityDigest: string;
}>;
type AcceptanceDeliveryMetadata = Readonly<{
  changedPaths: readonly Readonly<{ path: string; contentDigest: string }>[];
  commitMessage: string | null;
  workspaceCommit: string | null;
  session: string;
}>;
type AcceptanceCandidate = Readonly<{
  schema: 'jig.sch-candidate.v1';
  id: string;
  run: string;
  story: string;
  session: string;
  principal: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
  evidenceManifestDigest: string;
  deliveryMetadataDigest: string;
  workspaceFactDigest: string;
  treeDigest: string;
  runBasisDigest: string;
  generation: string;
  workspaceCommit: string | null;
  changedPaths: readonly Readonly<{ path: string; contentDigest: string }>[];
  deliveryMetadata: AcceptanceDeliveryMetadata;
}>;
export type Finding = Readonly<{
  schema: typeof FINDING_SCHEMA;
  id: string;
  story: string;
  candidate: string;
  packageDigest: string;
  severity: 'blocking' | 'non-blocking';
  requirement: string;
  description: string;
  state: FindingState;
  introducedBy: Readonly<{ session: string; principal: string }>;
  resolutionEvidenceDigest: string | null;
  resolvedBy: Readonly<{ session: string; principal: string }> | null;
  successor: string | null;
}>;
export type ReviewPackage = Readonly<{
  schema: typeof REVIEW_PACKAGE_SCHEMA;
  version: typeof ACCEPTANCE_CONTRACT_VERSION;
  run: string;
  story: string;
  candidate: string;
  candidateContentDigest: string;
  targetBasisDigest: string;
  evidenceManifest: EvidenceManifest;
  frozenRequirements: FrozenRequirements;
  frozenRequirementsDigest: string;
  evidenceManifestDigest: string;
  findings: readonly Finding[];
  findingsDigest: string;
  deliveryMetadataDigest: string;
  deliveryMetadata: AcceptanceDeliveryMetadata;
  publicationObservation: ReviewPublicationObservation;
  publicationObservationDigest: string;
  verificationPosture: AcceptancePosture;
  ruleSurfaceDigest: string;
  contributorPrincipals: readonly string[];
  digest: string;
}>;
export type Assignment = Readonly<{
  schema: 'jig.rp-assignment.v1';
  packageDigest: string;
  candidate: string;
  session: string;
  principal: string;
  role: 'reviewer';
  assignmentDigest: string;
}>;
export type Verdict = Readonly<{
  schema: typeof VERDICT_SCHEMA;
  id: string;
  run: string;
  story: string;
  candidate: string;
  packageDigest: string;
  session: string;
  principal: string;
  verdict: VerdictKind;
  findings: readonly Finding[];
  posture: AcceptancePosture;
  verdictDigest: string;
}>;
export type AcceptanceProjection = Readonly<{
  run: string;
  story: string;
  state: 'Reviewing' | 'Reworking' | 'Accepted' | 'Blocked' | 'Rejected' | 'NotRun';
  candidate: string | null;
  packageDigest: string | null;
  acceptedPackageDigest: string | null;
  reworkCount: number;
  reworkLimit: number;
  blocker: string | null;
}>;

type OwnerDecision = Readonly<{
  event: 'EV-OWNER-DECISION';
  story: string;
  principal: typeof ACCEPTANCE_OWNER;
  decision: 'reject-story';
  proofDigest: typeof OWNER_DECISION_PROOF_DIGEST;
}>;
type AcceptanceRecord =
  | Readonly<{ kind: 'package'; package: ReviewPackage }>
  | Readonly<{ kind: 'assignment'; assignment: Assignment }>
  | Readonly<{ kind: 'verdict'; verdict: Verdict; nextState: AcceptanceProjection['state'] }>
  | Readonly<{
      kind: 'invalidate';
      reason: 'candidate-change' | 'rule-surface' | 'owner-reopen';
      packageDigest: string;
    }>
  | Readonly<{
      kind: 'reject';
      decision: OwnerDecision;
    }>;
type JournalEntry = Readonly<{ position: number; previousDigest: string; digest: string; record: AcceptanceRecord }>;
export type AcceptanceSnapshot = Readonly<{
  schema: 'jig.acceptance-snapshot.v1';
  position: number;
  headDigest: string;
  records: readonly JournalEntry[];
  projection: AcceptanceProjection;
}>;
export type AcceptanceLedger = Readonly<{
  append(record: AcceptanceRecord): AcceptanceResult<JournalEntry>;
  entries(): readonly JournalEntry[];
  snapshot(): AcceptanceSnapshot;
}>;

export type AcceptanceController = Readonly<{
  assemble(input: unknown): AcceptanceResult<ReviewPackage>;
  assign(input: unknown): AcceptanceResult<Assignment>;
  receiveVerdict(input: unknown): AcceptanceResult<Readonly<{ verdict: Verdict; projection: AcceptanceProjection }>>;
  invalidate(input: unknown): AcceptanceResult<AcceptanceProjection>;
  rejectStory(input: unknown): AcceptanceResult<AcceptanceProjection>;
  projection(): AcceptanceProjection;
  packages(): readonly ReviewPackage[];
  assignments(): readonly Assignment[];
  verdicts(): readonly Verdict[];
  findings(): readonly Finding[];
  snapshot(): AcceptanceSnapshot;
  fixtureEvidence(): Readonly<{
    providerEnabled: false;
    reviewerConfigured: false;
    suites: readonly ['CF-ACCEPTANCE', 'CF-BINDING', 'CF-POLICY'];
  }>;
}>;
export type ScriptedAcceptanceReviewer = Readonly<{
  review(input: unknown): AcceptanceResult<Readonly<{ verdict: VerdictKind; findings: readonly Finding[] }>>;
  reachability(): Readonly<{ providerEnabled: false; configured: false; status: 'scripted-only' }>;
}>;

const ZERO = '0'.repeat(64);
const DIGEST = /^[0-9a-f]{64}$/u;
const ID = (kind: string, value: unknown): value is string =>
  typeof value === 'string' && parseIdentity(kind, value).ok;
const freeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const ok = <T>(value: T): AcceptanceResult<T> => Object.freeze({ ok: true, value: freeze(value) });
const fail = <T = never>(family: AcceptanceFailureFamily, code: string): AcceptanceResult<T> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });
const digestOf = (domain: string, value: unknown): string | undefined => {
  try {
    const result = stageDigest({ domain, excludePaths: [], value: value as never });
    return result.ok ? result.value.digest : undefined;
  } catch {
    return undefined;
  }
};
const same = (left: unknown, right: unknown, domain = 'ACCEPTANCE-COMPARE'): boolean => {
  const a = digestOf(domain, left);
  const b = digestOf(domain, right);
  return a !== undefined && a === b;
};
const isDigest = (value: unknown): value is string => typeof value === 'string' && DIGEST.test(value);
const isText = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= 512 &&
  !value.includes('\0') &&
  !value.includes('\r') &&
  !value.includes('\n') &&
  value.normalize('NFC') === value;
const own = (value: unknown, keys: readonly string[]): Record<string, unknown> | undefined => {
  try {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (
      Object.keys(descriptors).some((key) => !keys.includes(key)) ||
      keys.some((key) => !descriptors[key] || !('value' in descriptors[key]))
    )
      return undefined;
    return Object.fromEntries(keys.map((key) => [key, descriptors[key]?.value]));
  } catch {
    return undefined;
  }
};
const array = (value: unknown): readonly unknown[] | undefined =>
  Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype ? Object.freeze([...value]) : undefined;
const sortedUnique = (values: readonly string[]): readonly string[] => Object.freeze([...new Set(values)].sort());
const EVIDENCE_MANIFEST_KEYS = [
  'configurationDigest',
  'schemaVersion',
  'policy',
  'subjectKind',
  'subjectIdentity',
  'subject',
  'claim',
  'producer',
  'providerManifest',
  'contentType',
  'contentClass',
  'completeness',
  'originalDigest',
  'artifactDigest',
  'originalSize',
  'retainedSize',
  'loss',
  'redaction',
  'retention',
  'manifestDigest',
  'disposition',
  'artifactFact',
  'adoptionTransition',
] as const;
const validateEvidenceManifest = (value: unknown, expectedDigest: string): AcceptanceResult<EvidenceManifest> => {
  const raw = own(value, EVIDENCE_MANIFEST_KEYS);
  if (!raw || raw.manifestDigest !== expectedDigest || raw.disposition !== 'admitted')
    return fail('FC-EVIDENCE', 'INVALID_ADMITTED_EVIDENCE_MANIFEST');
  return ok(raw as EvidenceManifest);
};
const validateDeliveryMetadata = (value: unknown): AcceptanceResult<AcceptanceDeliveryMetadata> => {
  const raw = own(value, ['changedPaths', 'commitMessage', 'workspaceCommit', 'session']);
  const changedPaths = raw && array(raw.changedPaths);
  if (
    !raw ||
    !changedPaths ||
    changedPaths.some((item) => {
      const path = own(item, ['path', 'contentDigest']);
      return !path || !isText(path.path) || !isDigest(path.contentDigest);
    }) ||
    (raw.commitMessage !== null && !isText(raw.commitMessage)) ||
    (raw.workspaceCommit !== null && typeof raw.workspaceCommit !== 'string') ||
    !ID('ID-SESSION', raw.session)
  )
    return fail('FC-SUBJECT', 'INVALID_DELIVERY_METADATA');
  return ok(raw as AcceptanceDeliveryMetadata);
};

export function deriveFrozenRequirementsDigest(
  input: Readonly<{ requirements: readonly string[]; acceptanceCriteria: readonly string[] }>,
): AcceptanceResult<string> {
  if (
    !array(input.requirements) ||
    !array(input.acceptanceCriteria) ||
    input.requirements.some((v) => !isText(v)) ||
    input.acceptanceCriteria.some((v) => !isText(v))
  )
    return fail('FC-INPUT', 'INVALID_FROZEN_REQUIREMENTS');
  const digest = digestOf('FROZEN-REQUIREMENTS', {
    requirements: input.requirements,
    acceptanceCriteria: input.acceptanceCriteria,
  });
  return digest ? ok(digest) : fail('FC-TRUST', 'REQUIREMENTS_DIGEST_UNAVAILABLE');
}

export function validateFrozenRequirements(value: unknown): AcceptanceResult<FrozenRequirements> {
  const raw = own(value, ['schema', 'requirements', 'acceptanceCriteria', 'digest']);
  const derived =
    raw &&
    deriveFrozenRequirementsDigest({
      requirements: raw.requirements as readonly string[],
      acceptanceCriteria: raw.acceptanceCriteria as readonly string[],
    });
  if (raw?.schema !== 'jig.frozen-requirements.v1' || !derived?.ok || raw.digest !== derived.value)
    return fail('FC-INPUT', 'INVALID_FROZEN_REQUIREMENTS');
  return ok({
    schema: 'jig.frozen-requirements.v1',
    requirements: Object.freeze([...(raw.requirements as string[])]),
    acceptanceCriteria: Object.freeze([...(raw.acceptanceCriteria as string[])]),
    digest: raw.digest as string,
  });
}

export function deriveAcceptancePolicyDigest(
  input: Readonly<{ posture: AcceptancePosture; reviewMode: ReviewMode; ruleSurfaceDigest: string }>,
): AcceptanceResult<string> {
  if (
    !ACCEPTANCE_POSTURES.includes(input.posture) ||
    !REVIEW_MODES.includes(input.reviewMode) ||
    !isDigest(input.ruleSurfaceDigest)
  )
    return fail('FC-INPUT', 'INVALID_ACCEPTANCE_POLICY');
  const digest = digestOf('ACCEPTANCE-POLICY', input);
  return digest ? ok(digest) : fail('FC-TRUST', 'POLICY_DIGEST_UNAVAILABLE');
}
export function validateAcceptancePolicy(value: unknown): AcceptanceResult<AcceptancePolicy> {
  const raw = own(value, ['schema', 'posture', 'reviewMode', 'ruleSurfaceDigest', 'digest']);
  const derived =
    raw &&
    deriveAcceptancePolicyDigest({
      posture: raw.posture as AcceptancePosture,
      reviewMode: raw.reviewMode as ReviewMode,
      ruleSurfaceDigest: raw.ruleSurfaceDigest as string,
    });
  if (raw?.schema !== 'jig.acceptance-policy.v1' || !derived?.ok || raw.digest !== derived.value)
    return fail('FC-POLICY', 'INVALID_ACCEPTANCE_POLICY');
  return ok({
    schema: 'jig.acceptance-policy.v1',
    posture: raw.posture as AcceptancePosture,
    reviewMode: raw.reviewMode as ReviewMode,
    ruleSurfaceDigest: raw.ruleSurfaceDigest as string,
    digest: raw.digest as string,
  });
}

export function deriveAcceptanceEvidenceDigest(
  input: Omit<AcceptanceEvidence, 'integrityDigest'>,
): AcceptanceResult<string> {
  if (
    !validateEvidenceManifest(input.manifest, input.manifestDigest).ok ||
    !isDigest(input.manifestDigest) ||
    !ID('ID-CAND', input.candidate) ||
    !isDigest(input.candidateContentDigest) ||
    !isDigest(input.targetBasisDigest) ||
    input.disposition !== 'admitted' ||
    input.availability !== 'available'
  )
    return fail('FC-EVIDENCE', 'INVALID_ACCEPTANCE_EVIDENCE');
  const digest = digestOf('ACCEPTANCE-EVIDENCE', input);
  return digest ? ok(digest) : fail('FC-TRUST', 'EVIDENCE_DIGEST_UNAVAILABLE');
}
export function validateAcceptanceEvidence(
  value: unknown,
  candidate: AcceptanceCandidate,
): AcceptanceResult<AcceptanceEvidence> {
  const raw = own(value, [
    'schema',
    'manifest',
    'manifestDigest',
    'candidate',
    'candidateContentDigest',
    'targetBasisDigest',
    'disposition',
    'availability',
    'integrityDigest',
  ]);
  const expected =
    raw &&
    deriveAcceptanceEvidenceDigest({
      schema: ACCEPTANCE_EVIDENCE_SCHEMA,
      manifest: raw.manifest as EvidenceManifest,
      manifestDigest: raw.manifestDigest as string,
      candidate: raw.candidate as string,
      candidateContentDigest: raw.candidateContentDigest as string,
      targetBasisDigest: raw.targetBasisDigest as string,
      disposition: raw.disposition as 'admitted',
      availability: raw.availability as 'available',
    });
  if (
    !raw ||
    raw.schema !== ACCEPTANCE_EVIDENCE_SCHEMA ||
    raw.manifestDigest !== candidate.evidenceManifestDigest ||
    raw.candidate !== candidate.id ||
    raw.candidateContentDigest !== candidate.candidateContentDigest ||
    raw.targetBasisDigest !== candidate.targetBasisDigest ||
    !expected?.ok ||
    raw.integrityDigest !== expected.value
  )
    return fail('FC-EVIDENCE', 'EVIDENCE_SUBJECT_OR_INTEGRITY_MISMATCH');
  return ok(raw as AcceptanceEvidence);
}

function validateCandidate(value: unknown): AcceptanceResult<AcceptanceCandidate> {
  const raw = value as Partial<AcceptanceCandidate> | null;
  if (
    !raw ||
    typeof raw !== 'object' ||
    raw.schema !== 'jig.sch-candidate.v1' ||
    !ID('ID-CAND', raw.id) ||
    !ID('ID-RUN', raw.run) ||
    !ID('ID-STORY', raw.story) ||
    !raw.id?.startsWith(`${raw.story}/cand/`) ||
    !ID('ID-SESSION', raw.session) ||
    !ID('ID-PRINCIPAL', raw.principal) ||
    !isDigest(raw.candidateContentDigest) ||
    !isDigest(raw.targetBasisDigest) ||
    !isDigest(raw.evidenceManifestDigest) ||
    !isDigest(raw.deliveryMetadataDigest) ||
    !isDigest(raw.workspaceFactDigest) ||
    !isDigest(raw.treeDigest) ||
    !isDigest(raw.runBasisDigest) ||
    (!isDigest(raw.generation) && !ID('ID-GEN', raw.generation)) ||
    (raw.workspaceCommit !== null && typeof raw.workspaceCommit !== 'string') ||
    !array(raw.changedPaths)
  )
    return fail('FC-SUBJECT', 'INVALID_CANDIDATE');
  const delivery = validateDeliveryMetadata(raw.deliveryMetadata);
  if (!delivery.ok || delivery.value.workspaceCommit !== raw.workspaceCommit || delivery.value.session !== raw.session)
    return fail('FC-SUBJECT', 'INVALID_DELIVERY_METADATA');
  if (
    !raw.id.endsWith(`|${raw.candidateContentDigest}`) ||
    raw.story !== `${raw.run}/story/${raw.story.split('/story/')[1]}` ||
    raw.session.startsWith(`${raw.story}/session/`) === false
  )
    return fail('FC-SUBJECT', 'INVALID_CANDIDATE_BINDING');
  return ok(value as AcceptanceCandidate);
}

function observationFor(
  candidate: AcceptanceCandidate,
  mode: string,
  observation: unknown,
): AcceptanceResult<ReviewPublicationObservation> {
  const checked = validateReviewPublicationObservation(observation);
  if (!checked.ok) return fail('FC-SUBJECT', 'INVALID_PUBLICATION_OBSERVATION');
  if (
    checked.value.mode !== mode ||
    checked.value.subject.candidate !== candidate.id ||
    checked.value.subject.candidateContentDigest !== candidate.candidateContentDigest ||
    checked.value.subject.targetBasisDigest !== candidate.targetBasisDigest
  )
    return fail('FC-SUBJECT', 'PUBLICATION_OBSERVATION_MISMATCH');
  if (checked.value.mode === 'no-venue') {
    const noVenue = checked.value as ExplicitAbsenceObservation;
    if (noVenue.absence !== 'explicit-no-venue') return fail('FC-SUBJECT', 'INVALID_EXPLICIT_ABSENCE');
  } else {
    const venue = checked.value as RequiredVenueObservation;
    if (!venue.request.draft || venue.request.mergeable || venue.operations.length === 0)
      return fail('FC-SUBJECT', 'INCOMPLETE_PUBLICATION_OBSERVATION');
  }
  return checked;
}

function validFinding(value: unknown, story: string, packageDigest: string): AcceptanceResult<Finding> {
  const raw = own(value, [
    'schema',
    'id',
    'story',
    'candidate',
    'packageDigest',
    'severity',
    'requirement',
    'description',
    'state',
    'introducedBy',
    'resolutionEvidenceDigest',
    'resolvedBy',
    'successor',
  ]);
  const introduced = raw && own(raw.introducedBy, ['session', 'principal']);
  const resolved = raw?.resolvedBy === null ? null : raw && own(raw.resolvedBy, ['session', 'principal']);
  if (
    !raw ||
    raw.schema !== FINDING_SCHEMA ||
    typeof raw.id !== 'string' ||
    !ID('ID-FINDING', raw.id) ||
    !raw.id.startsWith(`${story}/finding/`) ||
    raw.story !== story ||
    !ID('ID-CAND', raw.candidate) ||
    (packageDigest !== 'pending' && raw.packageDigest !== packageDigest) ||
    !['blocking', 'non-blocking'].includes(raw.severity as string) ||
    !isText(raw.requirement) ||
    !isText(raw.description) ||
    !FINDING_STATES.includes(raw.state as FindingState) ||
    !introduced ||
    !ID('ID-SESSION', introduced.session) ||
    !ID('ID-PRINCIPAL', introduced.principal) ||
    !(raw.resolutionEvidenceDigest === null || isDigest(raw.resolutionEvidenceDigest)) ||
    (resolved !== null &&
      (!resolved || !ID('ID-SESSION', resolved.session) || !ID('ID-PRINCIPAL', resolved.principal))) ||
    !(raw.successor === null || typeof raw.successor === 'string')
  )
    return fail('FC-INPUT', 'INVALID_FINDING');
  if (raw.state === 'resolved' && (raw.resolutionEvidenceDigest === null || resolved === null))
    return fail('FC-EVIDENCE', 'RESOLUTION_EVIDENCE_REQUIRED');
  if (raw.state === 'superseded' && (raw.successor === null || !raw.successor.startsWith(`${story}/finding/`)))
    return fail('FC-INPUT', 'FINDING_SUCCESSOR_REQUIRED');
  return ok(raw as Finding);
}

function findingsDigest(findings: readonly Finding[]): string | undefined {
  return digestOf(
    'FINDINGS-STATE',
    findings.map(({ packageDigest: _packageDigest, ...finding }) => finding),
  );
}

function validFindingTransition(previous: Finding | undefined, next: Finding): AcceptanceResult<void> {
  if (!previous) return next.state === 'open' ? ok(undefined) : fail('FC-TRUST', 'FINDING_MUST_START_OPEN');
  if (previous.state === 'superseded') return fail('FC-TRUST', 'SUPERSEDED_FINDING_IS_TERMINAL');
  if (previous.id !== next.id || previous.story !== next.story) return fail('FC-SUBJECT', 'FINDING_LINEAGE_MISMATCH');
  const allowed =
    next.state === previous.state ||
    (previous.state === 'open' && (next.state === 'resolved' || next.state === 'superseded')) ||
    (previous.state === 'reopened' && (next.state === 'resolved' || next.state === 'superseded')) ||
    (previous.state === 'resolved' && next.state === 'reopened');
  if (!allowed) return fail('FC-TRUST', 'INVALID_FINDING_TRANSITION');
  if (next.state === 'resolved' && (next.resolutionEvidenceDigest === null || next.resolvedBy === null))
    return fail('FC-EVIDENCE', 'RESOLUTION_EVIDENCE_REQUIRED');
  if (next.state === 'superseded' && next.successor === null) return fail('FC-TRUST', 'FINDING_SUCCESSOR_REQUIRED');
  if (next.state === 'superseded' && next.successor === next.id)
    return fail('FC-TRUST', 'FINDING_SUCCESSOR_MUST_DIFFER');
  return ok(undefined);
}

function validatePackage(value: unknown): AcceptanceResult<ReviewPackage> {
  const raw = value as ReviewPackage | null;
  if (
    !raw ||
    raw.schema !== REVIEW_PACKAGE_SCHEMA ||
    raw.version !== ACCEPTANCE_CONTRACT_VERSION ||
    !ID('ID-RUN', raw.run) ||
    !ID('ID-STORY', raw.story) ||
    !ID('ID-CAND', raw.candidate) ||
    !isDigest(raw.candidateContentDigest) ||
    !isDigest(raw.targetBasisDigest) ||
    !isDigest(raw.frozenRequirementsDigest) ||
    !isDigest(raw.evidenceManifestDigest) ||
    !isDigest(raw.findingsDigest) ||
    !isDigest(raw.deliveryMetadataDigest) ||
    !isDigest(raw.publicationObservationDigest) ||
    !isDigest(raw.ruleSurfaceDigest) ||
    !ACCEPTANCE_POSTURES.includes(raw.verificationPosture) ||
    !Array.isArray(raw.findings) ||
    !Array.isArray(raw.contributorPrincipals) ||
    !isDigest(raw.digest)
  )
    return fail('FC-SUBJECT', 'INVALID_REVIEW_PACKAGE');
  const requirements = validateFrozenRequirements(raw.frozenRequirements);
  const evidenceManifest = validateEvidenceManifest(raw.evidenceManifest, raw.evidenceManifestDigest);
  const deliveryMetadata = validateDeliveryMetadata(raw.deliveryMetadata);
  const publication =
    raw.publicationObservation && typeof raw.publicationObservation === 'object'
      ? (raw.publicationObservation as { mode?: unknown })
      : undefined;
  const observations = observationFor(
    {
      id: raw.candidate,
      story: raw.story,
      run: raw.run,
      candidateContentDigest: raw.candidateContentDigest,
      targetBasisDigest: raw.targetBasisDigest,
    } as AcceptanceCandidate,
    publication?.mode as string,
    raw.publicationObservation,
  );
  const fd = findingsDigest(raw.findings);
  const findings = raw.findings.map((finding) => validFinding(finding, raw.story, raw.digest));
  const packageDigest = digestOf('RP-PACKAGE-DIGEST', {
    candidate: raw.candidate,
    candidateContentDigest: raw.candidateContentDigest,
    targetBasisDigest: raw.targetBasisDigest,
    frozenRequirements: raw.frozenRequirements,
    frozenRequirementsDigest: raw.frozenRequirementsDigest,
    evidenceManifest: raw.evidenceManifest,
    evidenceManifestDigest: raw.evidenceManifestDigest,
    findingsDigest: raw.findingsDigest,
    deliveryMetadata: raw.deliveryMetadata,
    deliveryMetadataDigest: raw.deliveryMetadataDigest,
    publicationObservationDigest: raw.publicationObservationDigest,
    verificationPosture: raw.verificationPosture,
    ruleSurfaceDigest: raw.ruleSurfaceDigest,
    contributorPrincipals: raw.contributorPrincipals,
  });
  if (
    !requirements.ok ||
    !evidenceManifest.ok ||
    !deliveryMetadata.ok ||
    !observations.ok ||
    findings.some((finding) => !finding.ok)
  )
    return fail('FC-SUBJECT', 'REVIEW_PACKAGE_MEMBER_INVALID');
  if (!fd || fd !== raw.findingsDigest) return fail('FC-SUBJECT', 'FINDINGS_DIGEST_MISMATCH');
  if (raw.frozenRequirementsDigest !== requirements.value.digest)
    return fail('FC-SUBJECT', 'REQUIREMENTS_DIGEST_MISMATCH');
  if (raw.publicationObservationDigest !== observations.value.observationDigest)
    return fail('FC-SUBJECT', 'PUBLICATION_DIGEST_MISMATCH');
  if (!packageDigest || packageDigest !== raw.digest) return fail('FC-SUBJECT', 'PACKAGE_DIGEST_MISMATCH');
  if (
    raw.publicationObservation.subject.candidate !== raw.candidate ||
    raw.publicationObservation.subject.candidateContentDigest !== raw.candidateContentDigest ||
    raw.publicationObservation.subject.targetBasisDigest !== raw.targetBasisDigest
  )
    return fail('FC-SUBJECT', 'PACKAGE_OBSERVATION_BINDING_MISMATCH');
  if (sortedUnique(raw.contributorPrincipals).join('\u0000') !== raw.contributorPrincipals.join('\u0000'))
    return fail('FC-FENCE', 'CONTRIBUTOR_ORDER_MISMATCH');
  if (raw.contributorPrincipals.some((principal) => !ID('ID-PRINCIPAL', principal)))
    return fail('FC-FENCE', 'INVALID_CONTRIBUTOR_PRINCIPAL');
  return ok(raw);
}

function journalDigest(position: number, previousDigest: string, record: AcceptanceRecord): string | undefined {
  return digestOf('ACCEPTANCE-LEDGER', { position, previousDigest, record });
}
function createLedger(seed: readonly JournalEntry[] = [], lostAck = false): AcceptanceLedger {
  const entries = [...seed];
  let fault = lostAck;
  return Object.freeze({
    append(record: AcceptanceRecord): AcceptanceResult<JournalEntry> {
      const previousDigest = entries.at(-1)?.digest ?? ZERO;
      const position = entries.length + 1;
      const digest = journalDigest(position, previousDigest, record);
      if (!digest) return fail('FC-TRUST', 'LEDGER_DIGEST_UNAVAILABLE');
      const entry = freeze({ position, previousDigest, digest, record });
      entries.push(entry);
      if (fault) {
        fault = false;
        return fail('FC-MECHANISM', 'ACK_LOST');
      }
      return ok(entry);
    },
    entries: () => Object.freeze([...entries]),
    snapshot: () =>
      freeze({
        schema: 'jig.acceptance-snapshot.v1' as const,
        position: entries.length,
        headDigest: entries.at(-1)?.digest ?? ZERO,
        records: [...entries],
        projection: freeze({
          run: '',
          story: '',
          state: 'Reviewing' as const,
          candidate: null,
          packageDigest: null,
          acceptedPackageDigest: null,
          reworkCount: 0,
          reworkLimit: 3,
          blocker: null,
        }),
      }),
  });
}

function validIdentityFields(input: Record<string, unknown>): boolean {
  return ID('ID-SESSION', input.session) && ID('ID-PRINCIPAL', input.principal) && isDigest(input.packageDigest);
}

export function createScriptedAcceptanceController(input?: unknown): AcceptanceResult<AcceptanceController> {
  const config = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const reworkLimit = config.reworkLimit === undefined ? 3 : config.reworkLimit;
  if (!Number.isSafeInteger(reworkLimit) || (reworkLimit as number) < 1 || (reworkLimit as number) > 5)
    return fail('FC-BOUND', 'INVALID_REWORK_LIMIT');
  const ledger = createLedger([], config.fault === 'lost-ack');
  return ok(createController(ledger, reworkLimit as number));
}

function createController(
  ledger: AcceptanceLedger,
  reworkLimit: number,
  restoredProjection?: AcceptanceProjection,
): AcceptanceController {
  let projection: AcceptanceProjection =
    restoredProjection ??
    freeze({
      run: '',
      story: '',
      state: 'Reviewing',
      candidate: null,
      packageDigest: null,
      acceptedPackageDigest: null,
      reworkCount: 0,
      reworkLimit,
      blocker: null,
    });
  const packages: ReviewPackage[] = [];
  const assignments: Assignment[] = [];
  const verdicts: Verdict[] = [];
  const findingMap = new Map<string, Finding>();
  const currentAssignment = new Map<string, Assignment>();
  const append = (record: AcceptanceRecord): AcceptanceResult<JournalEntry> => ledger.append(record);
  const applyRecord = (record: AcceptanceRecord): void => {
    if (record.kind === 'package') {
      packages.push(record.package);
      projection = freeze({
        ...projection,
        run: record.package.run,
        story: record.package.story,
        candidate: record.package.candidate,
        packageDigest: record.package.digest,
        state: 'Reviewing',
        blocker: null,
      });
      for (const finding of record.package.findings) findingMap.set(finding.id, finding);
    } else if (record.kind === 'assignment') {
      assignments.push(record.assignment);
      currentAssignment.set(record.assignment.packageDigest, record.assignment);
    } else if (record.kind === 'verdict') {
      verdicts.push(record.verdict);
      for (const finding of record.verdict.findings) findingMap.set(finding.id, finding);
      projection = freeze({
        ...projection,
        state: record.nextState,
        reworkCount:
          record.nextState === 'Reworking' || record.nextState === 'Blocked'
            ? projection.reworkCount + 1
            : projection.reworkCount,
        acceptedPackageDigest:
          record.nextState === 'Accepted' ? record.verdict.packageDigest : projection.acceptedPackageDigest,
        blocker: record.nextState === 'Blocked' ? 'BND-REWORK' : null,
      });
    } else if (record.kind === 'invalidate') {
      projection = freeze({
        ...projection,
        state: 'Reviewing',
        candidate: record.reason === 'candidate-change' ? null : projection.candidate,
        packageDigest: null,
        acceptedPackageDigest: null,
        blocker: null,
      });
    } else if (record.kind === 'reject') {
      projection = freeze({ ...projection, state: 'Rejected', blocker: null });
    }
  };
  const appendApply = (record: AcceptanceRecord): AcceptanceResult<void> => {
    const result = append(record);
    if (result.ok) {
      applyRecord(record);
      return ok(undefined);
    }
    if (result.error.code === 'ACK_LOST') {
      const found = ledger.entries().at(-1);
      if (found?.record.kind === record.kind && same(found.record, record, 'ACCEPTANCE-REPLAY')) {
        applyRecord(found.record);
        return ok(undefined);
      }
    }
    return result;
  };
  const assemble = (rawInput: unknown): AcceptanceResult<ReviewPackage> => {
    const raw = own(rawInput, [
      'candidate',
      'requirements',
      'evidence',
      'publicationObservation',
      'policy',
      'findings',
      'contributorPrincipals',
    ]);
    if (!raw) return fail('FC-INPUT', 'INVALID_PACKAGE_INPUT');
    const candidate = validateCandidate(raw.candidate);
    const requirements = validateFrozenRequirements(raw.requirements);
    const policy = validateAcceptancePolicy(raw.policy);
    if (!candidate.ok || !requirements.ok || !policy.ok) return fail('FC-INPUT', 'PACKAGE_INPUT_REJECTED');
    if (projection.state === 'Blocked' || projection.state === 'Rejected')
      return fail('FC-AUTHORITY', 'TERMINAL_STORY_STATE');
    if (
      projection.candidate !== null &&
      projection.candidate === candidate.value.id &&
      (projection.packageDigest !== null || projection.state === 'Reworking')
    )
      return fail('FC-FENCE', 'PACKAGE_ALREADY_ACTIVE');
    if (
      projection.candidate !== null &&
      projection.state !== 'Reworking' &&
      projection.candidate !== candidate.value.id
    )
      return fail('FC-FENCE', 'FRESH_REWORK_REQUIRED');
    const evidence = validateAcceptanceEvidence(raw.evidence, candidate.value);
    if (!evidence.ok) return evidence;
    const observation = observationFor(candidate.value, policy.value.reviewMode, raw.publicationObservation);
    if (!observation.ok) return observation;
    const suppliedFindings = array(raw.findings ?? []) ?? [];
    const durableFindings = [...findingMap.values()].filter((finding) => finding.story === candidate.value.story);
    const priorFindings = durableFindings.length > 0 ? durableFindings : suppliedFindings;
    const parsedFindings: Finding[] = [];
    for (const item of priorFindings) {
      const finding = validFinding(item, candidate.value.story, 'pending');
      if (!finding.ok) return finding;
      if (durableFindings.length === 0) {
        const transition = validFindingTransition(findingMap.get(finding.value.id), finding.value);
        if (!transition.ok) return transition;
      }
      parsedFindings.push(finding.value);
    }
    const contributorPrincipals = sortedUnique([
      candidate.value.principal,
      ...((raw.contributorPrincipals as readonly string[] | undefined) ?? []),
    ]);
    if (contributorPrincipals.some((principal) => !ID('ID-PRINCIPAL', principal)))
      return fail('FC-FENCE', 'INVALID_CONTRIBUTOR_PRINCIPAL');
    const normalizedFindings = parsedFindings.map((finding) => ({ ...finding, candidate: candidate.value.id }));
    const fd = findingsDigest(normalizedFindings);
    const packageDigest = digestOf('RP-PACKAGE-DIGEST', {
      candidate: candidate.value.id,
      candidateContentDigest: candidate.value.candidateContentDigest,
      targetBasisDigest: candidate.value.targetBasisDigest,
      frozenRequirements: requirements.value,
      frozenRequirementsDigest: requirements.value.digest,
      evidenceManifest: evidence.value.manifest,
      evidenceManifestDigest: evidence.value.manifestDigest,
      findingsDigest: fd,
      deliveryMetadata: candidate.value.deliveryMetadata,
      deliveryMetadataDigest: candidate.value.deliveryMetadataDigest,
      publicationObservationDigest: observation.value.observationDigest,
      verificationPosture: policy.value.posture,
      ruleSurfaceDigest: policy.value.ruleSurfaceDigest,
      contributorPrincipals,
    });
    if (!fd || !packageDigest) return fail('FC-TRUST', 'PACKAGE_DIGEST_UNAVAILABLE');
    const findings = parsedFindings.map((finding) =>
      freeze({ ...finding, candidate: candidate.value.id, packageDigest }),
    );
    const packageValue = freeze({
      schema: REVIEW_PACKAGE_SCHEMA,
      version: ACCEPTANCE_CONTRACT_VERSION,
      run: candidate.value.run,
      story: candidate.value.story,
      candidate: candidate.value.id,
      candidateContentDigest: candidate.value.candidateContentDigest,
      targetBasisDigest: candidate.value.targetBasisDigest,
      frozenRequirements: requirements.value,
      frozenRequirementsDigest: requirements.value.digest,
      evidenceManifest: evidence.value.manifest,
      evidenceManifestDigest: evidence.value.manifestDigest,
      findings,
      findingsDigest: findingsDigest(findings) as string,
      deliveryMetadata: candidate.value.deliveryMetadata,
      deliveryMetadataDigest: candidate.value.deliveryMetadataDigest,
      publicationObservation: observation.value,
      publicationObservationDigest: observation.value.observationDigest,
      verificationPosture: policy.value.posture,
      ruleSurfaceDigest: policy.value.ruleSurfaceDigest,
      contributorPrincipals,
      digest: packageDigest,
    });
    const checked = validatePackage(packageValue);
    if (!checked.ok) return checked;
    const committed = appendApply({ kind: 'package', package: checked.value });
    return committed.ok ? ok(checked.value) : committed;
  };
  const assign = (rawInput: unknown): AcceptanceResult<Assignment> => {
    const raw = own(rawInput, ['package', 'session', 'principal']);
    const packageValue = raw && validatePackage(raw.package);
    if (
      !raw ||
      !packageValue?.ok ||
      projection.packageDigest !== packageValue.value.digest ||
      projection.state !== 'Reviewing' ||
      !ID('ID-SESSION', raw.session) ||
      !ID('ID-PRINCIPAL', raw.principal) ||
      packageValue.value.contributorPrincipals.includes(raw.principal as string)
    )
      return fail('FC-AUTHORITY', 'REVIEWER_INDEPENDENCE_REQUIRED');
    const assignmentDigest = digestOf('REVIEW-ASSIGNMENT', {
      packageDigest: packageValue.value.digest,
      candidate: packageValue.value.candidate,
      session: raw.session,
      principal: raw.principal,
      role: 'reviewer',
    });
    if (!assignmentDigest) return fail('FC-TRUST', 'ASSIGNMENT_DIGEST_UNAVAILABLE');
    const assignment = freeze({
      schema: 'jig.rp-assignment.v1' as const,
      packageDigest: packageValue.value.digest,
      candidate: packageValue.value.candidate,
      session: raw.session as string,
      principal: raw.principal as string,
      role: 'reviewer' as const,
      assignmentDigest,
    });
    const committed = appendApply({ kind: 'assignment', assignment });
    return committed.ok ? ok(assignment) : committed;
  };
  const receiveVerdict = (
    rawInput: unknown,
  ): AcceptanceResult<Readonly<{ verdict: Verdict; projection: AcceptanceProjection }>> => {
    const raw = own(rawInput, ['assignment', 'verdict', 'findings']);
    const assignment =
      raw &&
      own(raw.assignment, ['schema', 'packageDigest', 'candidate', 'session', 'principal', 'role', 'assignmentDigest']);
    const packageValue = assignment && packages.find((item) => item.digest === assignment.packageDigest);
    const recordedAssignment = assignment && currentAssignment.get(assignment.packageDigest as string);
    const verdictKind = raw?.verdict;
    const expectedAssignmentDigest =
      assignment &&
      packageValue &&
      digestOf('REVIEW-ASSIGNMENT', {
        packageDigest: packageValue.digest,
        candidate: packageValue.candidate,
        session: assignment.session,
        principal: assignment.principal,
        role: 'reviewer',
      });
    if (
      !raw ||
      !assignment ||
      !packageValue ||
      projection.packageDigest !== packageValue.digest ||
      projection.state !== 'Reviewing' ||
      !validIdentityFields(assignment) ||
      assignment.schema !== 'jig.rp-assignment.v1' ||
      assignment.role !== 'reviewer' ||
      assignment.candidate !== packageValue.candidate ||
      assignment.assignmentDigest !== expectedAssignmentDigest ||
      !recordedAssignment ||
      !same(assignment, recordedAssignment, 'ASSIGNMENT-RECEIPT') ||
      !VERDICT_KINDS.includes(verdictKind as VerdictKind)
    )
      return fail('FC-AUTHORITY', 'INVALID_VERDICT_BINDING');
    const supplied = array(raw.findings) ?? [];
    const nextFindingMap = new Map(packageValue.findings.map((finding) => [finding.id, finding]));
    for (const item of supplied) {
      const finding = validFinding(item, packageValue.story, packageValue.digest);
      if (!finding.ok) return finding;
      const transition = validFindingTransition(findingMap.get(finding.value.id), finding.value);
      if (!transition.ok) return transition;
      nextFindingMap.set(finding.value.id, finding.value);
    }
    const nextFindings = [...nextFindingMap.values()];
    const blocking = nextFindings.some(
      (finding) => finding.severity === 'blocking' && (finding.state === 'open' || finding.state === 'reopened'),
    );
    if (verdictKind === 'approve' && blocking) return fail('FC-EVIDENCE', 'UNRESOLVED_BLOCKING_FINDING');
    const id = `${packageValue.story}/verdict/${verdicts.length + 1}`;
    const verdictDigest = digestOf('RP-VERDICT', {
      id,
      run: packageValue.run,
      story: packageValue.story,
      candidate: packageValue.candidate,
      packageDigest: packageValue.digest,
      session: assignment.session,
      principal: assignment.principal,
      verdict: verdictKind,
      findings: nextFindings,
      posture: packageValue.verificationPosture,
    });
    if (!verdictDigest) return fail('FC-TRUST', 'VERDICT_DIGEST_UNAVAILABLE');
    const nextState =
      verdictKind === 'approve' ? 'Accepted' : projection.reworkCount + 1 >= reworkLimit ? 'Blocked' : 'Reworking';
    const verdict = freeze({
      schema: VERDICT_SCHEMA as typeof VERDICT_SCHEMA,
      id,
      run: packageValue.run,
      story: packageValue.story,
      candidate: packageValue.candidate,
      packageDigest: packageValue.digest,
      session: assignment.session as string,
      principal: assignment.principal as string,
      verdict: verdictKind as VerdictKind,
      findings: nextFindings,
      posture: packageValue.verificationPosture,
      verdictDigest,
    });
    const committed = appendApply({ kind: 'verdict', verdict, nextState });
    if (!committed.ok) return committed;
    return ok({ verdict, projection });
  };
  const invalidate = (rawInput: unknown): AcceptanceResult<AcceptanceProjection> => {
    const raw = own(rawInput, ['packageDigest', 'reason']);
    if (
      !raw ||
      !isDigest(raw.packageDigest) ||
      !['candidate-change', 'rule-surface', 'owner-reopen'].includes(raw.reason as string) ||
      projection.packageDigest !== raw.packageDigest ||
      (projection.state !== 'Accepted' && projection.state !== 'Reviewing')
    )
      return fail('FC-RULES', 'INVALIDATION_NOT_ALLOWED');
    const committed = appendApply({
      kind: 'invalidate',
      reason: raw.reason as 'candidate-change' | 'rule-surface' | 'owner-reopen',
      packageDigest: raw.packageDigest,
    });
    return committed.ok ? ok(projection) : committed;
  };
  const rejectStory = (rawInput: unknown): AcceptanceResult<AcceptanceProjection> => {
    const raw = own(rawInput, ['decision']);
    const decision = raw && own(raw.decision, ['event', 'story', 'principal', 'decision', 'proofDigest']);
    if (
      !raw ||
      !decision ||
      decision.event !== 'EV-OWNER-DECISION' ||
      decision.story !== projection.story ||
      decision.principal !== ACCEPTANCE_OWNER ||
      decision.decision !== 'reject-story' ||
      decision.proofDigest !== OWNER_DECISION_PROOF_DIGEST
    )
      return fail('FC-AUTHORITY', 'INVALID_OWNER_REJECTION');
    const committed = appendApply({
      kind: 'reject',
      decision: freeze(decision as OwnerDecision),
    });
    return committed.ok ? ok(projection) : committed;
  };
  for (const entry of ledger.entries()) applyRecord(entry.record);
  return Object.freeze({
    assemble,
    assign,
    receiveVerdict,
    invalidate,
    rejectStory,
    projection: () => projection,
    packages: () => Object.freeze([...packages]),
    assignments: () => Object.freeze([...assignments]),
    verdicts: () => Object.freeze([...verdicts]),
    findings: () => Object.freeze([...findingMap.values()]),
    snapshot: () =>
      freeze({
        schema: 'jig.acceptance-snapshot.v1' as const,
        position: ledger.entries().length,
        headDigest: ledger.entries().at(-1)?.digest ?? ZERO,
        records: ledger.entries(),
        projection,
      }),
    fixtureEvidence: () => ({
      providerEnabled: false as const,
      reviewerConfigured: false as const,
      suites: ['CF-ACCEPTANCE', 'CF-BINDING', 'CF-POLICY'] as const,
    }),
  });
}

function validateSnapshotSemantics(entries: readonly JournalEntry[], reworkLimit: number): AcceptanceResult<void> {
  let projection: AcceptanceProjection = {
    run: '',
    story: '',
    state: 'Reviewing',
    candidate: null,
    packageDigest: null,
    acceptedPackageDigest: null,
    reworkCount: 0,
    reworkLimit,
    blocker: null,
  };
  const packages = new Map<string, ReviewPackage>();
  const assignments = new Map<string, Assignment>();
  const findings = new Map<string, Finding>();
  for (const entry of entries) {
    const record = entry.record as unknown;
    if (!record || typeof record !== 'object') return fail('FC-TRUST', 'INVALID_ACCEPTANCE_RECORD');
    const kind = (record as { kind?: unknown }).kind;
    if (kind === 'package') {
      const fields = own(record, ['kind', 'package']);
      const checked = fields && validatePackage(fields.package);
      if (!fields || !checked?.ok) return fail('FC-TRUST', 'INVALID_PACKAGE_RECORD');
      const packageValue = checked.value;
      if (
        projection.state === 'Blocked' ||
        projection.state === 'Rejected' ||
        (projection.candidate !== null &&
          projection.candidate === packageValue.candidate &&
          projection.packageDigest !== null &&
          projection.state !== 'Reworking') ||
        (projection.candidate !== null &&
          projection.state !== 'Reworking' &&
          projection.candidate !== packageValue.candidate)
      )
        return fail('FC-TRUST', 'PACKAGE_REPLAY_ORDER_INVALID');
      packages.set(packageValue.digest, packageValue);
      projection = {
        ...projection,
        run: packageValue.run,
        story: packageValue.story,
        candidate: packageValue.candidate,
        packageDigest: packageValue.digest,
        state: 'Reviewing',
        blocker: null,
      };
      for (const finding of packageValue.findings) findings.set(finding.id, finding);
      continue;
    }
    if (kind === 'assignment') {
      const fields = own(record, ['kind', 'assignment']);
      const assignment =
        fields &&
        own(fields.assignment, [
          'schema',
          'packageDigest',
          'candidate',
          'session',
          'principal',
          'role',
          'assignmentDigest',
        ]);
      const packageValue = assignment && packages.get(assignment.packageDigest as string);
      const expected =
        assignment &&
        packageValue &&
        digestOf('REVIEW-ASSIGNMENT', {
          packageDigest: packageValue.digest,
          candidate: packageValue.candidate,
          session: assignment.session,
          principal: assignment.principal,
          role: 'reviewer',
        });
      if (
        !fields ||
        !assignment ||
        !packageValue ||
        projection.packageDigest !== packageValue.digest ||
        projection.state !== 'Reviewing' ||
        assignment.schema !== 'jig.rp-assignment.v1' ||
        assignment.role !== 'reviewer' ||
        assignment.candidate !== packageValue.candidate ||
        !ID('ID-SESSION', assignment.session) ||
        !ID('ID-PRINCIPAL', assignment.principal) ||
        packageValue.contributorPrincipals.includes(assignment.principal as string) ||
        assignment.assignmentDigest !== expected
      )
        return fail('FC-TRUST', 'ASSIGNMENT_REPLAY_INVALID');
      assignments.set(packageValue.digest, assignment as Assignment);
      continue;
    }
    if (kind === 'verdict') {
      const fields = own(record, ['kind', 'verdict', 'nextState']);
      const verdict =
        fields &&
        own(fields.verdict, [
          'schema',
          'id',
          'run',
          'story',
          'candidate',
          'packageDigest',
          'session',
          'principal',
          'verdict',
          'findings',
          'posture',
          'verdictDigest',
        ]);
      const packageValue = verdict && packages.get(verdict.packageDigest as string);
      const assignment = packageValue && assignments.get(packageValue.digest);
      const supplied = verdict && array(verdict.findings);
      const nextFindingMap = packageValue
        ? new Map(packageValue.findings.map((finding) => [finding.id, finding]))
        : null;
      if (nextFindingMap && supplied && packageValue) {
        for (const item of supplied) {
          const finding = validFinding(item, packageValue.story, packageValue.digest);
          if (!finding.ok) return fail('FC-TRUST', 'VERDICT_FINDING_REPLAY_INVALID');
          const transition = validFindingTransition(findings.get(finding.value.id), finding.value);
          if (!transition.ok) return fail('FC-TRUST', 'VERDICT_FINDING_TRANSITION_INVALID');
          nextFindingMap.set(finding.value.id, finding.value);
        }
      }
      const nextFindings = nextFindingMap ? [...nextFindingMap.values()] : [];
      const blocking = nextFindings.some(
        (finding) => finding.severity === 'blocking' && (finding.state === 'open' || finding.state === 'reopened'),
      );
      const expectedVerdictDigest =
        verdict &&
        digestOf('RP-VERDICT', {
          id: verdict.id,
          run: verdict.run,
          story: verdict.story,
          candidate: verdict.candidate,
          packageDigest: verdict.packageDigest,
          session: verdict.session,
          principal: verdict.principal,
          verdict: verdict.verdict,
          findings: nextFindings,
          posture: verdict.posture,
        });
      const expectedState =
        verdict?.verdict === 'approve'
          ? 'Accepted'
          : projection.reworkCount + 1 >= reworkLimit
            ? 'Blocked'
            : 'Reworking';
      if (
        !fields ||
        !verdict ||
        !packageValue ||
        !assignment ||
        !supplied ||
        projection.packageDigest !== packageValue.digest ||
        projection.state !== 'Reviewing' ||
        verdict.schema !== VERDICT_SCHEMA ||
        typeof verdict.id !== 'string' ||
        !verdict.id.startsWith(`${packageValue.story}/verdict/`) ||
        verdict.run !== packageValue.run ||
        verdict.story !== packageValue.story ||
        verdict.candidate !== packageValue.candidate ||
        verdict.session !== assignment.session ||
        verdict.principal !== assignment.principal ||
        verdict.posture !== packageValue.verificationPosture ||
        !ID('ID-SESSION', verdict.session) ||
        !ID('ID-PRINCIPAL', verdict.principal) ||
        !VERDICT_KINDS.includes(verdict.verdict as VerdictKind) ||
        (verdict.verdict === 'approve' && blocking) ||
        fields.nextState !== expectedState ||
        verdict.verdictDigest !== expectedVerdictDigest
      )
        return fail('FC-TRUST', 'VERDICT_REPLAY_INVALID');
      for (const finding of nextFindings) findings.set(finding.id, finding);
      projection = {
        ...projection,
        state: expectedState,
        reworkCount:
          expectedState === 'Reworking' || expectedState === 'Blocked'
            ? projection.reworkCount + 1
            : projection.reworkCount,
        acceptedPackageDigest: expectedState === 'Accepted' ? packageValue.digest : projection.acceptedPackageDigest,
        blocker: expectedState === 'Blocked' ? 'BND-REWORK' : null,
      };
      continue;
    }
    if (kind === 'invalidate') {
      const fields = own(record, ['kind', 'reason', 'packageDigest']);
      if (
        !fields ||
        !isDigest(fields.packageDigest) ||
        !['candidate-change', 'rule-surface', 'owner-reopen'].includes(fields.reason as string) ||
        projection.packageDigest !== fields.packageDigest ||
        (projection.state !== 'Accepted' && projection.state !== 'Reviewing')
      )
        return fail('FC-TRUST', 'INVALIDATION_REPLAY_INVALID');
      projection = {
        ...projection,
        state: 'Reviewing',
        candidate: fields.reason === 'candidate-change' ? null : projection.candidate,
        packageDigest: null,
        acceptedPackageDigest: null,
        blocker: null,
      };
      continue;
    }
    if (kind === 'reject') {
      const fields = own(record, ['kind', 'decision']);
      const decision = fields && own(fields.decision, ['event', 'story', 'principal', 'decision', 'proofDigest']);
      if (
        !fields ||
        !decision ||
        decision.event !== 'EV-OWNER-DECISION' ||
        decision.story !== projection.story ||
        decision.principal !== ACCEPTANCE_OWNER ||
        decision.decision !== 'reject-story' ||
        decision.proofDigest !== OWNER_DECISION_PROOF_DIGEST
      )
        return fail('FC-TRUST', 'REJECTION_REPLAY_INVALID');
      projection = { ...projection, state: 'Rejected', blocker: null };
      continue;
    }
    return fail('FC-TRUST', 'UNKNOWN_ACCEPTANCE_RECORD');
  }
  return ok(undefined);
}

export function restoreScriptedAcceptanceController(
  snapshot: unknown,
  input?: unknown,
): AcceptanceResult<AcceptanceController> {
  const raw = snapshot as Partial<AcceptanceSnapshot> | null;
  if (
    raw?.schema !== 'jig.acceptance-snapshot.v1' ||
    !Array.isArray(raw.records) ||
    !raw.projection ||
    !Number.isSafeInteger(raw.position) ||
    raw.position !== raw.records.length ||
    !isDigest(raw.headDigest)
  )
    return fail('FC-TRUST', 'INVALID_ACCEPTANCE_SNAPSHOT');
  let previous = ZERO;
  for (const entry of raw.records) {
    if (
      !entry ||
      entry.position <= 0 ||
      entry.previousDigest !== previous ||
      !isDigest(entry.digest) ||
      journalDigest(entry.position, entry.previousDigest, entry.record) !== entry.digest
    )
      return fail('FC-TRUST', 'ACCEPTANCE_JOURNAL_CORRUPT');
    previous = entry.digest;
  }
  if (previous !== raw.headDigest) return fail('FC-TRUST', 'ACCEPTANCE_HEAD_MISMATCH');
  const config = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const limit = config.reworkLimit ?? raw.projection.reworkLimit;
  if (!Number.isSafeInteger(limit) || limit !== raw.projection.reworkLimit)
    return fail('FC-BOUND', 'RECOVERY_BOUND_MISMATCH');
  const semantic = validateSnapshotSemantics(raw.records as readonly JournalEntry[], limit as number);
  if (!semantic.ok) return semantic;
  const controller = createController(createLedger(raw.records), limit as number);
  if (!same(controller.projection(), raw.projection, 'ACCEPTANCE-RECOVERY-PROJECTION'))
    return fail('FC-TRUST', 'ACCEPTANCE_PROJECTION_DRIFT');
  return ok(controller);
}

export function createScriptedAcceptanceReviewer(input?: unknown): AcceptanceResult<ScriptedAcceptanceReviewer> {
  const raw = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const principal = raw.principal;
  const decision = raw.decision ?? 'approve';
  if (!ID('ID-PRINCIPAL', principal) || !VERDICT_KINDS.includes(decision as VerdictKind))
    return fail('FC-AUTHORITY', 'INVALID_SCRIPTED_REVIEWER');
  return ok(
    Object.freeze({
      review(value: unknown): AcceptanceResult<Readonly<{ verdict: VerdictKind; findings: readonly Finding[] }>> {
        const request = own(value, ['assignment', 'findings']);
        const assignment =
          request &&
          own(request.assignment, [
            'schema',
            'packageDigest',
            'candidate',
            'session',
            'principal',
            'role',
            'assignmentDigest',
          ]);
        if (!request || !assignment || assignment.principal !== principal || assignment.role !== 'reviewer')
          return fail('FC-AUTHORITY', 'SCRIPTED_REVIEWER_PRINCIPAL_MISMATCH');
        return ok({ verdict: decision as VerdictKind, findings: (array(request.findings) ?? []) as Finding[] });
      },
      reachability: () => ({
        providerEnabled: false as const,
        configured: false as const,
        status: 'scripted-only' as const,
      }),
    }),
  );
}
