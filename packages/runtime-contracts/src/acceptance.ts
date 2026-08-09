import { parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';
import type { EvidenceManifest } from './evidence.js';
import {
  type ExplicitAbsenceObservation,
  type RequiredVenueObservation,
  type ReviewPublicationObservation,
  validateReviewPublicationObservation,
} from './review-publication.js';

declare const TextEncoder: { new (): { encode(input?: string): Uint8Array } };

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
  originCandidate: string;
  originPackageDigest: string;
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
  candidatePrincipal: string;
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
  reviewMode: ReviewMode;
  policyDigest: string;
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

type AcceptanceRecord =
  | Readonly<{ kind: 'package'; package: ReviewPackage }>
  | Readonly<{ kind: 'assignment'; assignment: Assignment }>
  | Readonly<{ kind: 'verdict'; verdict: Verdict; nextState: AcceptanceProjection['state'] }>
  | Readonly<{
      kind: 'invalidate';
      reason: 'candidate-change' | 'rule-surface' | 'owner-reopen';
      packageDigest: string;
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
function sha256(bytes: Uint8Array | string): string {
  const input = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  const constants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98,
    0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8,
    0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
    0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
    0xc67178f2,
  ];
  const padded = new Uint8Array(Math.ceil((input.length + 9) / 64) * 64);
  padded.set(input);
  padded[input.length] = 0x80;
  const bitLength = BigInt(input.length) * 8n;
  for (let index = 0; index < 8; index += 1)
    padded[padded.length - 1 - index] = Number((bitLength >> BigInt(index * 8)) & 0xffn);
  const state = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const rotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));
  const at = (values: Uint8Array | Uint32Array | readonly number[], index: number) => values[index] ?? 0;
  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = new Uint32Array(64);
    for (let index = 0; index < 16; index += 1)
      words[index] =
        (at(padded, offset + index * 4) << 24) |
        (at(padded, offset + index * 4 + 1) << 16) |
        (at(padded, offset + index * 4 + 2) << 8) |
        at(padded, offset + index * 4 + 3);
    for (let index = 16; index < 64; index += 1) {
      const first =
        rotate(at(words, index - 15), 7) ^ rotate(at(words, index - 15), 18) ^ (at(words, index - 15) >>> 3);
      const second =
        rotate(at(words, index - 2), 17) ^ rotate(at(words, index - 2), 19) ^ (at(words, index - 2) >>> 10);
      words[index] = (at(words, index - 16) + first + at(words, index - 7) + second) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index += 1) {
      const first =
        (h +
          (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) +
          ((e & f) ^ (~e & g)) +
          at(constants, index) +
          at(words, index)) >>>
        0;
      const second = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + first) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (first + second) >>> 0;
    }
    const next = [a, b, c, d, e, f, g, h];
    for (let index = 0; index < state.length; index += 1) state[index] = (at(state, index) + at(next, index)) >>> 0;
  }
  return state.map((part) => part.toString(16).padStart(8, '0')).join('');
}
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
  const policy = raw && own(raw.policy, ['kind', 'version', 'digest', 'scanPolicyVersion', 'scanPolicyDigest']);
  const producer = raw && own(raw.producer, ['kind', 'principal', 'session']);
  const redaction = raw && own(raw.redaction, ['policyVersion', 'status']);
  const retention = raw && own(raw.retention, ['class', 'windowDays', 'hold']);
  const loss = raw?.loss === null ? null : raw && own(raw.loss, ['kind', 'omittedBytes']);
  const artifactFact = raw && own(raw.artifactFact, ['operation', 'mode', 'position', 'headDigest', 'binding']);
  const basis = raw && Object.fromEntries(EVIDENCE_MANIFEST_KEYS.slice(0, 19).map((key) => [key, raw[key]]));
  const derived =
    raw && artifactFact && typeof raw.adoptionTransition === 'string'
      ? sha256(JSON.stringify({ basis, artifactFact, adoptionTransition: raw.adoptionTransition }))
      : undefined;
  if (
    !raw ||
    raw.manifestDigest !== expectedDigest ||
    !isDigest(raw.manifestDigest) ||
    raw.disposition !== 'admitted' ||
    !isDigest(raw.configurationDigest) ||
    raw.schemaVersion !== 'jig.evidence.v1' ||
    !policy ||
    !isText(policy.kind) ||
    !isText(policy.version) ||
    !isDigest(policy.digest) ||
    !isText(policy.scanPolicyVersion) ||
    !isDigest(policy.scanPolicyDigest) ||
    !['ID-RUN', 'ID-STORY', 'ID-CAND', 'ID-OP', 'ID-TARGET'].includes(raw.subjectKind as string) ||
    !isText(raw.subjectIdentity) ||
    !isText(raw.subject) ||
    !isText(raw.claim) ||
    !producer ||
    producer.kind !== 'principal' ||
    !ID('ID-PRINCIPAL', producer.principal) ||
    !ID('ID-SESSION', producer.session) ||
    raw.providerManifest !== null ||
    !isText(raw.contentType) ||
    !isText(raw.contentClass) ||
    !['complete', 'partial'].includes(raw.completeness as string) ||
    !isDigest(raw.originalDigest) ||
    !isDigest(raw.artifactDigest) ||
    !Number.isSafeInteger(raw.originalSize) ||
    (raw.originalSize as number) <= 0 ||
    !Number.isSafeInteger(raw.retainedSize) ||
    (raw.retainedSize as number) <= 0 ||
    (raw.retainedSize as number) > (raw.originalSize as number) ||
    !redaction ||
    !isText(redaction.policyVersion) ||
    !['none', 'source-redacted'].includes(redaction.status as string) ||
    !retention ||
    !isText(retention.class) ||
    !Number.isSafeInteger(retention.windowDays) ||
    (retention.windowDays as number) < 0 ||
    !(retention.hold === null || own(retention.hold, ['id', 'basis', 'status'])?.status === 'active') ||
    (loss !== null &&
      (loss?.kind !== 'truncated' || !Number.isSafeInteger(loss.omittedBytes) || (loss.omittedBytes as number) <= 0)) ||
    !artifactFact ||
    !isText(artifactFact.operation) ||
    artifactFact.mode !== 'put' ||
    !Number.isSafeInteger(artifactFact.position) ||
    (artifactFact.position as number) < 0 ||
    !isDigest(artifactFact.headDigest) ||
    !isText(artifactFact.binding) ||
    !isText(raw.adoptionTransition) ||
    derived !== raw.manifestDigest
  )
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
    (raw.manifest as EvidenceManifest | undefined)?.subjectKind !== 'ID-CAND' ||
    (raw.manifest as EvidenceManifest | undefined)?.subjectIdentity !== candidate.id ||
    (raw.manifest as EvidenceManifest | undefined)?.subject !== `evidence://${candidate.id}/claim/candidate-content` ||
    (raw.manifest as EvidenceManifest | undefined)?.claim !== 'candidate-content' ||
    (raw.manifest as EvidenceManifest | undefined)?.producer?.principal !== candidate.principal ||
    (raw.manifest as EvidenceManifest | undefined)?.producer?.session !== candidate.session ||
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
  const deliveryDigest = delivery.ok ? digestOf('CANDIDATE-DELIVERY-METADATA', delivery.value) : undefined;
  if (
    !delivery.ok ||
    !deliveryDigest ||
    deliveryDigest !== raw.deliveryMetadataDigest ||
    delivery.value.workspaceCommit !== raw.workspaceCommit ||
    delivery.value.session !== raw.session ||
    !same(raw.changedPaths, delivery.value.changedPaths, 'CANDIDATE-CHANGED-PATHS')
  )
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
    'originCandidate',
    'originPackageDigest',
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
    !ID('ID-CAND', raw.originCandidate) ||
    !isDigest(raw.originPackageDigest) ||
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
  if (
    (raw.state === 'open' || raw.state === 'reopened') &&
    (raw.resolutionEvidenceDigest !== null || resolved !== null || raw.successor !== null)
  )
    return fail('FC-TRUST', 'OPEN_FINDING_HAS_RESOLUTION_STATE');
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
  if (
    previous.id !== next.id ||
    previous.story !== next.story ||
    previous.severity !== next.severity ||
    previous.requirement !== next.requirement ||
    previous.description !== next.description ||
    previous.originCandidate !== next.originCandidate ||
    previous.originPackageDigest !== next.originPackageDigest ||
    !same(previous.introducedBy, next.introducedBy, 'FINDING-INTRODUCER')
  )
    return fail('FC-SUBJECT', 'FINDING_INTRODUCTION_MUTATION');
  const allowed =
    next.state === previous.state ||
    (previous.state === 'open' && (next.state === 'resolved' || next.state === 'superseded')) ||
    (previous.state === 'reopened' && (next.state === 'resolved' || next.state === 'superseded')) ||
    (previous.state === 'resolved' && next.state === 'reopened');
  if (!allowed) return fail('FC-TRUST', 'INVALID_FINDING_TRANSITION');
  if (
    next.state === previous.state &&
    !same(
      {
        resolutionEvidenceDigest: previous.resolutionEvidenceDigest,
        resolvedBy: previous.resolvedBy,
        successor: previous.successor,
      },
      {
        resolutionEvidenceDigest: next.resolutionEvidenceDigest,
        resolvedBy: next.resolvedBy,
        successor: next.successor,
      },
      'FINDING-STATE',
    )
  )
    return fail('FC-TRUST', 'SAME_STATE_FINDING_MUTATION');
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
    !raw.candidate.startsWith(`${raw.story}/cand/`) ||
    !raw.story.startsWith(`${raw.run}/story/`) ||
    !ID('ID-PRINCIPAL', raw.candidatePrincipal) ||
    !isDigest(raw.candidateContentDigest) ||
    !isDigest(raw.targetBasisDigest) ||
    !isDigest(raw.frozenRequirementsDigest) ||
    !isDigest(raw.evidenceManifestDigest) ||
    !isDigest(raw.findingsDigest) ||
    !isDigest(raw.deliveryMetadataDigest) ||
    !isDigest(raw.publicationObservationDigest) ||
    !isDigest(raw.ruleSurfaceDigest) ||
    !ACCEPTANCE_POSTURES.includes(raw.verificationPosture) ||
    !REVIEW_MODES.includes(raw.reviewMode) ||
    !isDigest(raw.policyDigest) ||
    !Array.isArray(raw.findings) ||
    !Array.isArray(raw.contributorPrincipals) ||
    !isDigest(raw.digest)
  )
    return fail('FC-SUBJECT', 'INVALID_REVIEW_PACKAGE');
  const requirements = validateFrozenRequirements(raw.frozenRequirements);
  const evidenceManifest = validateEvidenceManifest(raw.evidenceManifest, raw.evidenceManifestDigest);
  const deliveryMetadata = validateDeliveryMetadata(raw.deliveryMetadata);
  const deliveryDigest = deliveryMetadata.ok
    ? digestOf('CANDIDATE-DELIVERY-METADATA', deliveryMetadata.value)
    : undefined;
  const observations = observationFor(
    {
      id: raw.candidate,
      story: raw.story,
      run: raw.run,
      candidateContentDigest: raw.candidateContentDigest,
      targetBasisDigest: raw.targetBasisDigest,
    } as AcceptanceCandidate,
    raw.reviewMode,
    raw.publicationObservation,
  );
  const policyDigest = deriveAcceptancePolicyDigest({
    posture: raw.verificationPosture,
    reviewMode: raw.reviewMode,
    ruleSurfaceDigest: raw.ruleSurfaceDigest,
  });
  const fd = findingsDigest(raw.findings);
  const findings = raw.findings.map((finding) => validFinding(finding, raw.story, raw.digest));
  const manifestBound =
    evidenceManifest.ok &&
    deliveryMetadata.ok &&
    evidenceManifest.value.subjectKind === 'ID-CAND' &&
    evidenceManifest.value.subjectIdentity === raw.candidate &&
    evidenceManifest.value.subject === `evidence://${raw.candidate}/claim/candidate-content` &&
    evidenceManifest.value.claim === 'candidate-content' &&
    evidenceManifest.value.artifactDigest === raw.candidateContentDigest &&
    evidenceManifest.value.producer.session === deliveryMetadata.value.session &&
    evidenceManifest.value.producer.principal === raw.candidatePrincipal;
  const packageDigest = digestOf('RP-PACKAGE-DIGEST', {
    candidate: raw.candidate,
    candidatePrincipal: raw.candidatePrincipal,
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
    reviewMode: raw.reviewMode,
    policyDigest: raw.policyDigest,
    ruleSurfaceDigest: raw.ruleSurfaceDigest,
    contributorPrincipals: raw.contributorPrincipals,
  });
  if (
    !requirements.ok ||
    !evidenceManifest.ok ||
    !deliveryMetadata.ok ||
    !manifestBound ||
    !policyDigest.ok ||
    policyDigest.value !== raw.policyDigest ||
    !deliveryDigest ||
    deliveryDigest !== raw.deliveryMetadataDigest ||
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
    raw.publicationObservation.subject.run !== raw.run ||
    raw.publicationObservation.subject.story !== raw.story ||
    raw.publicationObservation.subject.candidateContentDigest !== raw.candidateContentDigest ||
    raw.publicationObservation.subject.targetBasisDigest !== raw.targetBasisDigest
  )
    return fail('FC-SUBJECT', 'PACKAGE_OBSERVATION_BINDING_MISMATCH');
  if (sortedUnique(raw.contributorPrincipals).join('\u0000') !== raw.contributorPrincipals.join('\u0000'))
    return fail('FC-FENCE', 'CONTRIBUTOR_ORDER_MISMATCH');
  if (raw.contributorPrincipals.some((principal) => !ID('ID-PRINCIPAL', principal)))
    return fail('FC-FENCE', 'INVALID_CONTRIBUTOR_PRINCIPAL');
  if (!raw.contributorPrincipals.includes(raw.candidatePrincipal))
    return fail('FC-FENCE', 'CANDIDATE_PRINCIPAL_NOT_CONTRIBUTOR');
  return ok(raw);
}

function validateFindingPackageAdmission(
  packageValue: ReviewPackage,
  durableFindings: ReadonlyMap<string, Finding>,
): AcceptanceResult<void> {
  const prior = [...durableFindings.values()].filter((finding) => finding.story === packageValue.story);
  const current = packageValue.findings;
  if (current.length !== new Set(current.map((finding) => finding.id)).size)
    return fail('FC-TRUST', 'DUPLICATE_PACKAGE_FINDING');
  if (prior.length === 0) {
    for (const finding of current) {
      const transition = validFindingTransition(undefined, finding);
      if (!transition.ok) return transition;
    }
    return ok(undefined);
  }
  if (
    prior.length !== current.length ||
    prior.some((finding) => !current.some((candidateFinding) => candidateFinding.id === finding.id))
  )
    return fail('FC-TRUST', 'PACKAGE_FINDING_LINEAGE_OMITTED');
  for (const finding of current) {
    const previous = durableFindings.get(finding.id);
    if (!previous) return fail('FC-TRUST', 'PACKAGE_FINDING_LINEAGE_UNKNOWN');
    const transition = validFindingTransition(previous, finding);
    if (!transition.ok) return transition;
    if (
      finding.state !== previous.state ||
      !same(
        {
          resolutionEvidenceDigest: previous.resolutionEvidenceDigest,
          resolvedBy: previous.resolvedBy,
          successor: previous.successor,
        },
        {
          resolutionEvidenceDigest: finding.resolutionEvidenceDigest,
          resolvedBy: finding.resolvedBy,
          successor: finding.successor,
        },
        'FINDING-PACKAGE-STATE',
      )
    )
      return fail('FC-TRUST', 'PACKAGE_FINDING_STATE_REWRITE');
  }
  return ok(undefined);
}

function admitPackage(
  value: unknown,
  projection: AcceptanceProjection,
  durableFindings: ReadonlyMap<string, Finding>,
): AcceptanceResult<ReviewPackage> {
  const checked = validatePackage(value);
  if (!checked.ok) return checked;
  const packageValue = checked.value;
  if (projection.state === 'Blocked' || projection.state === 'Rejected')
    return fail('FC-AUTHORITY', 'TERMINAL_STORY_STATE');
  if (projection.story !== '' && (projection.story !== packageValue.story || projection.run !== packageValue.run))
    return fail('FC-SUBJECT', 'STORY_LINEAGE_MISMATCH');
  if (projection.packageDigest !== null && projection.candidate === packageValue.candidate)
    return fail('FC-FENCE', 'PACKAGE_ALREADY_ACTIVE');
  if (
    projection.candidate !== null &&
    projection.packageDigest !== null &&
    projection.candidate !== packageValue.candidate &&
    projection.state !== 'Reworking'
  )
    return fail('FC-FENCE', 'FRESH_REWORK_REQUIRED');
  const findings = validateFindingPackageAdmission(packageValue, durableFindings);
  if (!findings.ok) return findings;
  return ok(packageValue);
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
      currentAssignment.delete(record.packageDigest);
      projection = freeze({
        ...projection,
        state: 'Reviewing',
        candidate: record.reason === 'candidate-change' ? null : projection.candidate,
        packageDigest: null,
        acceptedPackageDigest: null,
        blocker: null,
      });
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
      candidatePrincipal: candidate.value.principal,
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
      reviewMode: policy.value.reviewMode,
      policyDigest: policy.value.digest,
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
      candidatePrincipal: candidate.value.principal,
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
      reviewMode: policy.value.reviewMode,
      policyDigest: policy.value.digest,
      ruleSurfaceDigest: policy.value.ruleSurfaceDigest,
      contributorPrincipals,
      digest: packageDigest,
    });
    const admitted = admitPackage(packageValue, projection, findingMap);
    if (!admitted.ok) return admitted;
    const committed = appendApply({ kind: 'package', package: admitted.value });
    return committed.ok ? ok(admitted.value) : committed;
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
    if (verdictKind === 'changes-required' && !nextFindings.some((finding) => finding.severity === 'blocking'))
      return fail('FC-RULES', 'CHANGES_REQUIRED_FINDING_REQUIRED');
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
  for (const entry of ledger.entries()) applyRecord(entry.record);
  return Object.freeze({
    assemble,
    assign,
    receiveVerdict,
    invalidate,
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
      const admitted = fields && admitPackage(fields.package, projection, findings);
      if (!fields || !admitted?.ok) return fail('FC-TRUST', 'INVALID_PACKAGE_RECORD');
      const packageValue = admitted.value;
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
      const changesRequiredHasBlocking = nextFindings.some((finding) => finding.severity === 'blocking');
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
        (verdict.verdict === 'changes-required' && !changesRequiredHasBlocking) ||
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
      assignments.delete(fields.packageDigest as string);
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
  for (const [index, entry] of raw.records.entries()) {
    if (
      !entry ||
      entry.position !== index + 1 ||
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
