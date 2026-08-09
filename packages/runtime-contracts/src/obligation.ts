import { parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';

/** Private GF-038 semantics. No provider, notice, settlement, cleanup, or dispatch authority exists here. */
export const OBLIGATION_CONTRACT_VERSION = 'jig.obligation-contract.v1';
export const OBLIGATION_SCHEMA = 'jig.sch-obligation.v1';
export const OBLIGATION_CRITERIA_SCHEMA = 'jig.obligation-criteria.v1';
export const OBLIGATION_EVIDENCE_SCHEMA = 'jig.obligation-evidence.v1';
export const OBLIGATION_GRANT_SCHEMA = 'jig.obligation-grant.v1';
export const OBLIGATION_INTENT_SCHEMA = 'jig.obligation-resolution-intent.v1';
export const OBLIGATION_CONTROLLER = 'RT-CONTROLLER';
export const OBLIGATION_PORT = 'PORT-DECIDE';
export const OBLIGATION_BOUND = Object.freeze({
  name: 'BND-WAIT-DECISION',
  defaultSeconds: 72 * 60 * 60,
  minimumSeconds: 60 * 60,
  maximumSeconds: 30 * 24 * 60 * 60,
});
export const AUTOMATIC_DUTIES = Object.freeze([
  'retirement',
  'preservation',
  'surfacing',
  'post-terminal-export',
] as const);

export type AutomaticDuty = (typeof AUTOMATIC_DUTIES)[number];
export type ObligationStatus = 'open' | 'accepted-handoff' | 'resolved';
export type ObligationFailureFamily =
  | 'FC-INPUT'
  | 'FC-SUBJECT'
  | 'FC-AUTHORITY'
  | 'FC-FENCE'
  | 'FC-EVIDENCE'
  | 'FC-BOUND'
  | 'FC-TRUST';
export type ObligationFailure = Readonly<{ family: ObligationFailureFamily; code: string }>;
export type ObligationResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: ObligationFailure }>;

export type ObligationCriteria = Readonly<{
  schema: typeof OBLIGATION_CRITERIA_SCHEMA;
  subject: string;
  claim: string;
  digest: string;
}>;

export type ObligationEvidence = Readonly<{
  schema: typeof OBLIGATION_EVIDENCE_SCHEMA;
  subject: string;
  digest: string;
  trustRoot: string;
  referenceDigest: string;
}>;

export type ObligationGrant = Readonly<{
  schema: typeof OBLIGATION_GRANT_SCHEMA;
  id: string;
  event: string;
  type: 'EV-DELEGATION-GRANT';
  obligation: string;
  grantor: 'principal/arye';
  delegate: string;
  action: 'resolve-obligation';
  scope: string;
  generation: string;
  issuedAt: number;
  expiresAt: number;
  status: 'active' | 'revoked' | 'expired';
  statusEvent: string | null;
  grantDigest: string;
}>;

export type ResidualObligation = Readonly<{
  schema: typeof OBLIGATION_SCHEMA;
  id: string;
  event: string;
  type: 'SCH-OBLIGATION';
  controller: typeof OBLIGATION_CONTROLLER;
  port: typeof OBLIGATION_PORT;
  run: string;
  generation: string;
  resource: string;
  duty: AutomaticDuty;
  origin: string;
  reason: string;
  preservationEvidence: ObligationEvidence;
  accountableOwner: 'principal/arye';
  criteria: ObligationCriteria;
  bound: typeof OBLIGATION_BOUND.name;
  startedAt: number;
  deadline: number;
  policyDigest: string;
  boundDigest: string;
  status: ObligationStatus;
  exhaustionCount: number;
  lastExhaustionEvent: string | null;
  lastExhaustedAt: number | null;
  handoffEvent: string | null;
  handoffResponder: string | null;
  handoffCriteriaDigest: string | null;
  handoffReason: string | null;
  resolutionEvent: string | null;
  resolutionResponder: string | null;
  resolutionGrant: string | null;
  resolutionCriteriaDigest: string | null;
  resolutionEvidence: ObligationEvidence | null;
}>;

export type ObligationResolutionIntent = Readonly<{
  schema: typeof OBLIGATION_INTENT_SCHEMA;
  key: string;
  type: 'EV-OBLIGATION-RESOLVED';
  obligation: string;
  generation: string;
  responder: string;
  grant: string | null;
  criteriaDigest: string;
  evidence: ObligationEvidence;
  status: 'recorded' | 'uncertain' | 'confirmed';
}>;

export type ObligationFact = Readonly<{
  event: string;
  type:
    | 'SCH-OBLIGATION'
    | 'EV-OWNER-DECISION'
    | 'EV-DELEGATION-GRANT'
    | 'EV-DELEGATION-REVOKED'
    | 'EV-DELEGATION-EXPIRED'
    | 'EV-OBLIGATION-RESOLVED'
    | 'EV-BOUND-EXHAUSTED'
    | 'EV-WAKE-SETTLEMENT';
  obligation: string;
  status: ObligationStatus | null;
  generation: string;
  criteriaDigest: string | null;
  evidenceDigest: string | null;
  grant: string | null;
  boundDigest: string;
  observedAt: number | null;
}>;

export type ObligationSnapshot = Readonly<{
  schema: typeof OBLIGATION_CONTRACT_VERSION;
  nextEventOrdinal: number;
  obligations: readonly ResidualObligation[];
  grants: readonly ObligationGrant[];
  intents: readonly ObligationResolutionIntent[];
  facts: readonly ObligationFact[];
}>;

export type ObligationFixtureEvidence = Readonly<{
  providerEnabled: false;
  dispatchEnabled: false;
  noticeChannelEnabled: false;
  settlementOverlayEnabled: false;
  cleanupEnabled: false;
  mechanism: 'scripted-obligation.v1';
}>;

export type ObligationController = Readonly<{
  open(input: unknown): ObligationResult<ResidualObligation>;
  issueGrant(input: unknown): ObligationResult<ObligationGrant>;
  revokeGrant(input: unknown): ObligationResult<ObligationGrant>;
  acceptHandoff(input: unknown): ObligationResult<ResidualObligation>;
  resolve(input: unknown): ObligationResult<ResidualObligation>;
  expire(input: unknown): ObligationResult<ResidualObligation>;
  wakeSettlement(input: unknown): ObligationResult<ObligationFact>;
  get(id: unknown): ObligationResult<ResidualObligation>;
  grants(): readonly ObligationGrant[];
  intents(): readonly ObligationResolutionIntent[];
  facts(): readonly ObligationFact[];
  snapshot(): ObligationSnapshot;
  fixtureEvidence(): ObligationFixtureEvidence;
}>;

type HydratedState = Readonly<{
  obligations: readonly ResidualObligation[];
  grants: readonly ObligationGrant[];
  intents: readonly ObligationResolutionIntent[];
  facts: readonly ObligationFact[];
  nextEventOrdinal: number;
}>;

const OWNER = 'principal/arye' as const;
const MECHANISM = 'scripted-obligation.v1' as const;
const DIGEST = /^[0-9a-f]{64}$/u;
const MAX_SAFE_TIME = Number.MAX_SAFE_INTEGER;
const SECRET =
  /(?:api[\s._'"+/-]*key|access[\s._'"+/-]*token|refresh[\s._'"+/-]*token|password|credential|secret|authorization|bearer)/iu;
const PRINCIPAL_PROOFS = Object.freeze({
  [OWNER]: 'a'.repeat(64),
  'principal/agent-one': 'b'.repeat(64),
  'principal/agent-two': 'c'.repeat(64),
});

const fail = <T = never>(family: ObligationFailureFamily, code: string): ObligationResult<T> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });
const ok = <T>(value: T): ObligationResult<T> => Object.freeze({ ok: true, value: deepFreeze(value) });

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) deepFreeze(child);
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

function plainArray(value: unknown): readonly unknown[] | undefined {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    if (!descriptors.length || !('value' in descriptors.length) || !integer(descriptors.length.value)) return undefined;
    if (Object.keys(descriptors).filter((key) => key !== 'length').length !== descriptors.length.value)
      return undefined;
    for (let index = 0; index < descriptors.length.value; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !('value' in descriptor) || !Object.is(Reflect.get(value, String(index)), descriptor.value))
        return undefined;
    }
    return Object.freeze([...value]);
  } catch {
    return undefined;
  }
}

function digest(value: unknown): value is string {
  return typeof value === 'string' && DIGEST.test(value);
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_SAFE_TIME;
}

function text(value: unknown, maximum = 512): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maximum &&
    value.normalize('NFC') === value &&
    [...value].every((character) => (character.codePointAt(0) ?? 0) > 0x1f && character !== '\u007f')
  );
}

function identity(kind: string, value: unknown): value is string {
  return typeof value === 'string' && parseIdentity(kind, value).ok;
}

function derivedDigest(domain: string, value: Record<string, unknown>): string | undefined {
  try {
    const result = stageDigest({ domain, excludePaths: [], value: value as never });
    return result.ok ? result.value.digest : undefined;
  } catch {
    return undefined;
  }
}

function eventOrdinal(value: string): number | undefined {
  const match = /\/event\/([1-9][0-9]*)$/u.exec(value);
  if (!match || String(Number(match[1])) !== match[1]) return undefined;
  const ordinal = Number(match[1]);
  return Number.isSafeInteger(ordinal) ? ordinal : undefined;
}

function eventId(run: string, ordinal: number): string {
  return `${run}/event/${ordinal}`;
}

function authenticated(principal: string, proof: unknown): boolean {
  return identity('ID-PRINCIPAL', principal) && PRINCIPAL_PROOFS[principal as keyof typeof PRINCIPAL_PROOFS] === proof;
}

function criteriaDigestFor(subject: string, claim: string): string | undefined {
  return derivedDigest('OBLIGATION-CRITERIA', { schema: OBLIGATION_CRITERIA_SCHEMA, subject, claim });
}

function evidenceDigestFor(subject: string, evidence: string, trustRoot: string): string | undefined {
  return derivedDigest('OBLIGATION-EVIDENCE', {
    schema: OBLIGATION_EVIDENCE_SCHEMA,
    subject,
    evidence,
    trustRoot,
  });
}

function boundDigestFor(
  input: Readonly<{
    id: string;
    generation: string;
    policyDigest: string;
    startedAt: number;
    deadline: number;
  }>,
): string | undefined {
  return derivedDigest('OBLIGATION-BOUND', {
    bound: OBLIGATION_BOUND.name,
    id: input.id,
    generation: input.generation,
    policyDigest: input.policyDigest,
    startedAt: input.startedAt,
    deadline: input.deadline,
  });
}

function parseCriteria(value: unknown): ObligationResult<ObligationCriteria> {
  const raw = fields(value, ['subject', 'claim']);
  if (!raw || !identity('ID-EVSUBJ', raw.subject) || !text(raw.claim)) return fail('FC-INPUT', 'INVALID_CRITERIA');
  const digestValue = criteriaDigestFor(raw.subject as string, raw.claim as string);
  return digestValue
    ? ok({
        schema: OBLIGATION_CRITERIA_SCHEMA,
        subject: raw.subject as string,
        claim: raw.claim as string,
        digest: digestValue,
      })
    : fail('FC-TRUST', 'CRITERIA_DIGEST_UNAVAILABLE');
}

function parseEvidence(value: unknown): ObligationResult<ObligationEvidence> {
  const raw = fields(value, ['subject', 'digest', 'trustRoot', 'referenceDigest']);
  if (
    !raw ||
    !identity('ID-EVSUBJ', raw.subject) ||
    !digest(raw.digest) ||
    !digest(raw.trustRoot) ||
    !digest(raw.referenceDigest)
  )
    return fail('FC-INPUT', 'INVALID_EVIDENCE_REFERENCE');
  const referenceDigest = evidenceDigestFor(raw.subject as string, raw.digest as string, raw.trustRoot as string);
  return referenceDigest && referenceDigest === raw.referenceDigest
    ? ok({
        schema: OBLIGATION_EVIDENCE_SCHEMA,
        subject: raw.subject as string,
        digest: raw.digest as string,
        trustRoot: raw.trustRoot as string,
        referenceDigest: raw.referenceDigest as string,
      })
    : fail('FC-TRUST', 'EVIDENCE_DIGEST_MISMATCH');
}

function sameJson(left: unknown, right: unknown): boolean {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function validResource(value: unknown): value is string {
  return text(value, 1024) && !SECRET.test(value);
}

function validGrant(value: unknown): value is ObligationGrant {
  const raw = fields(value, [
    'schema',
    'id',
    'event',
    'type',
    'obligation',
    'grantor',
    'delegate',
    'action',
    'scope',
    'generation',
    'issuedAt',
    'expiresAt',
    'status',
    'statusEvent',
    'grantDigest',
  ]);
  if (
    !raw ||
    raw.schema !== OBLIGATION_GRANT_SCHEMA ||
    raw.type !== 'EV-DELEGATION-GRANT' ||
    !identity('ID-GRANT', raw.id) ||
    !identity('ID-EVENT', raw.event) ||
    !identity('ID-OBLIGATION', raw.obligation) ||
    raw.grantor !== OWNER ||
    !identity('ID-PRINCIPAL', raw.delegate) ||
    raw.delegate === OWNER ||
    raw.action !== 'resolve-obligation' ||
    raw.scope !== `obligation/${raw.obligation}` ||
    !identity('ID-GEN', raw.generation) ||
    !integer(raw.issuedAt) ||
    !integer(raw.expiresAt) ||
    raw.expiresAt <= raw.issuedAt ||
    raw.expiresAt - raw.issuedAt > OBLIGATION_BOUND.maximumSeconds ||
    !['active', 'revoked', 'expired'].includes(raw.status as string) ||
    (raw.status === 'active' && raw.statusEvent !== null) ||
    (raw.status !== 'active' && !identity('ID-EVENT', raw.statusEvent)) ||
    !digest(raw.grantDigest)
  )
    return false;
  const expected = derivedDigest('OBLIGATION-GRANT', {
    id: raw.id,
    obligation: raw.obligation,
    grantor: raw.grantor,
    delegate: raw.delegate,
    action: raw.action,
    scope: raw.scope,
    generation: raw.generation,
    issuedAt: raw.issuedAt,
    expiresAt: raw.expiresAt,
  });
  return expected === raw.grantDigest;
}

function validEvidence(value: unknown): value is ObligationEvidence {
  const raw = fields(value, ['schema', 'subject', 'digest', 'trustRoot', 'referenceDigest']);
  if (!raw || raw.schema !== OBLIGATION_EVIDENCE_SCHEMA) return false;
  const expected = evidenceDigestFor(raw.subject as string, raw.digest as string, raw.trustRoot as string);
  return (
    identity('ID-EVSUBJ', raw.subject) &&
    digest(raw.digest) &&
    digest(raw.trustRoot) &&
    digest(raw.referenceDigest) &&
    expected === raw.referenceDigest
  );
}

function validCriteria(value: unknown): value is ObligationCriteria {
  const raw = fields(value, ['schema', 'subject', 'claim', 'digest']);
  if (!raw || raw.schema !== OBLIGATION_CRITERIA_SCHEMA) return false;
  const expected = criteriaDigestFor(raw.subject as string, raw.claim as string);
  return identity('ID-EVSUBJ', raw.subject) && text(raw.claim) && digest(raw.digest) && expected === raw.digest;
}

function validObligation(value: unknown): value is ResidualObligation {
  const raw = fields(value, [
    'schema',
    'id',
    'event',
    'type',
    'controller',
    'port',
    'run',
    'generation',
    'resource',
    'duty',
    'origin',
    'reason',
    'preservationEvidence',
    'accountableOwner',
    'criteria',
    'bound',
    'startedAt',
    'deadline',
    'policyDigest',
    'boundDigest',
    'status',
    'exhaustionCount',
    'lastExhaustionEvent',
    'lastExhaustedAt',
    'handoffEvent',
    'handoffResponder',
    'handoffCriteriaDigest',
    'handoffReason',
    'resolutionEvent',
    'resolutionResponder',
    'resolutionGrant',
    'resolutionCriteriaDigest',
    'resolutionEvidence',
  ]);
  if (
    !raw ||
    raw.schema !== OBLIGATION_SCHEMA ||
    raw.type !== 'SCH-OBLIGATION' ||
    raw.controller !== OBLIGATION_CONTROLLER ||
    raw.port !== OBLIGATION_PORT ||
    !identity('ID-OBLIGATION', raw.id) ||
    !identity('ID-EVENT', raw.event) ||
    !identity('ID-RUN', raw.run) ||
    !identity('ID-GEN', raw.generation) ||
    !validResource(raw.resource) ||
    !AUTOMATIC_DUTIES.includes(raw.duty as AutomaticDuty) ||
    !identity('ID-EVENT', raw.origin) ||
    (eventOrdinal(raw.origin as string) ?? 0) < 1 ||
    !text(raw.reason) ||
    !validEvidence(raw.preservationEvidence) ||
    raw.accountableOwner !== OWNER ||
    !validCriteria(raw.criteria) ||
    raw.bound !== OBLIGATION_BOUND.name ||
    !integer(raw.startedAt) ||
    !integer(raw.deadline) ||
    raw.deadline <= raw.startedAt ||
    raw.deadline - raw.startedAt < OBLIGATION_BOUND.minimumSeconds ||
    raw.deadline - raw.startedAt > OBLIGATION_BOUND.maximumSeconds ||
    !digest(raw.policyDigest) ||
    !digest(raw.boundDigest) ||
    !['open', 'accepted-handoff', 'resolved'].includes(raw.status as string) ||
    !integer(raw.exhaustionCount) ||
    raw.exhaustionCount > 1 ||
    (raw.lastExhaustionEvent !== null && !identity('ID-EVENT', raw.lastExhaustionEvent)) ||
    (raw.lastExhaustedAt !== null && !integer(raw.lastExhaustedAt)) ||
    (raw.handoffEvent !== null && !identity('ID-EVENT', raw.handoffEvent)) ||
    (raw.handoffResponder !== null && !identity('ID-PRINCIPAL', raw.handoffResponder)) ||
    (raw.handoffCriteriaDigest !== null && !digest(raw.handoffCriteriaDigest)) ||
    (raw.handoffReason !== null && !text(raw.handoffReason)) ||
    (raw.resolutionEvent !== null && !identity('ID-EVENT', raw.resolutionEvent)) ||
    (raw.resolutionResponder !== null && !identity('ID-PRINCIPAL', raw.resolutionResponder)) ||
    (raw.resolutionGrant !== null && !identity('ID-GRANT', raw.resolutionGrant)) ||
    (raw.resolutionCriteriaDigest !== null && !digest(raw.resolutionCriteriaDigest)) ||
    (raw.resolutionEvidence !== null && !validEvidence(raw.resolutionEvidence))
  )
    return false;
  const ordinal = Number((/\/obligation\/([1-9][0-9]*)$/u.exec(raw.id as string) ?? [])[1]);
  const expectedBound = boundDigestFor({
    id: raw.id as string,
    generation: raw.generation as string,
    policyDigest: raw.policyDigest as string,
    startedAt: raw.startedAt as number,
    deadline: raw.deadline as number,
  });
  return (
    Number.isSafeInteger(ordinal) &&
    (raw.id as string) === `${raw.run}/obligation/${ordinal}` &&
    (raw.generation as string).startsWith(`${raw.run}/gen/`) &&
    (raw.origin as string).startsWith(`${raw.run}/event/`) &&
    expectedBound === raw.boundDigest &&
    ((raw.exhaustionCount === 0 && raw.lastExhaustionEvent === null && raw.lastExhaustedAt === null) ||
      (raw.exhaustionCount === 1 &&
        identity('ID-EVENT', raw.lastExhaustionEvent) &&
        integer(raw.lastExhaustedAt) &&
        (raw.lastExhaustedAt as number) >= (raw.deadline as number))) &&
    ((raw.handoffEvent === null &&
      raw.handoffResponder === null &&
      raw.handoffCriteriaDigest === null &&
      raw.handoffReason === null) ||
      (identity('ID-EVENT', raw.handoffEvent) &&
        raw.handoffResponder === OWNER &&
        raw.handoffCriteriaDigest === raw.criteria.digest &&
        text(raw.handoffReason))) &&
    ((raw.resolutionEvent === null &&
      raw.resolutionResponder === null &&
      raw.resolutionGrant === null &&
      raw.resolutionCriteriaDigest === null &&
      raw.resolutionEvidence === null) ||
      (identity('ID-EVENT', raw.resolutionEvent) &&
        identity('ID-PRINCIPAL', raw.resolutionResponder) &&
        raw.resolutionCriteriaDigest === raw.criteria.digest &&
        validEvidence(raw.resolutionEvidence))) &&
    ((raw.status === 'open' && raw.handoffEvent === null && raw.resolutionEvent === null) ||
      (raw.status === 'accepted-handoff' && raw.handoffEvent !== null && raw.resolutionEvent === null) ||
      (raw.status === 'resolved' && raw.resolutionEvent !== null && raw.resolutionEvidence !== null))
  );
}

function validFact(value: unknown): value is ObligationFact {
  const raw = fields(value, [
    'event',
    'type',
    'obligation',
    'status',
    'generation',
    'criteriaDigest',
    'evidenceDigest',
    'grant',
    'boundDigest',
    'observedAt',
  ]);
  if (
    !raw ||
    !(
      identity('ID-EVENT', raw.event) &&
      [
        'SCH-OBLIGATION',
        'EV-OWNER-DECISION',
        'EV-DELEGATION-GRANT',
        'EV-DELEGATION-REVOKED',
        'EV-DELEGATION-EXPIRED',
        'EV-OBLIGATION-RESOLVED',
        'EV-BOUND-EXHAUSTED',
        'EV-WAKE-SETTLEMENT',
      ].includes(raw.type as string) &&
      identity('ID-OBLIGATION', raw.obligation) &&
      (raw.status === null || ['open', 'accepted-handoff', 'resolved'].includes(raw.status as string)) &&
      identity('ID-GEN', raw.generation) &&
      (raw.criteriaDigest === null || digest(raw.criteriaDigest)) &&
      (raw.evidenceDigest === null || digest(raw.evidenceDigest)) &&
      (raw.grant === null || identity('ID-GRANT', raw.grant)) &&
      digest(raw.boundDigest) &&
      (raw.observedAt === null || integer(raw.observedAt))
    )
  )
    return false;
  const obligationRun = (raw.obligation as string).split('/obligation/')[0];
  return (raw.event as string).startsWith(`${obligationRun}/event/`);
}

function validIntent(value: unknown): value is ObligationResolutionIntent {
  const raw = fields(value, [
    'schema',
    'key',
    'type',
    'obligation',
    'generation',
    'responder',
    'grant',
    'criteriaDigest',
    'evidence',
    'status',
  ]);
  return (
    !!raw &&
    raw.schema === OBLIGATION_INTENT_SCHEMA &&
    digest(raw.key) &&
    raw.type === 'EV-OBLIGATION-RESOLVED' &&
    identity('ID-OBLIGATION', raw.obligation) &&
    identity('ID-GEN', raw.generation) &&
    identity('ID-PRINCIPAL', raw.responder) &&
    (raw.grant === null || identity('ID-GRANT', raw.grant)) &&
    digest(raw.criteriaDigest) &&
    validEvidence(raw.evidence) &&
    ['recorded', 'uncertain', 'confirmed'].includes(raw.status as string)
  );
}

function validateHydratedState(value: unknown): ObligationResult<HydratedState> {
  const raw = fields(value, ['schema', 'nextEventOrdinal', 'obligations', 'grants', 'intents', 'facts']);
  const obligations = raw && plainArray(raw.obligations);
  const grants = raw && plainArray(raw.grants);
  const intents = raw && plainArray(raw.intents);
  const facts = raw && plainArray(raw.facts);
  if (
    !raw ||
    raw.schema !== OBLIGATION_CONTRACT_VERSION ||
    !integer(raw.nextEventOrdinal) ||
    raw.nextEventOrdinal < 1 ||
    !obligations ||
    !grants ||
    !intents ||
    !facts
  )
    return fail('FC-TRUST', 'INVALID_OBLIGATION_SNAPSHOT');
  if (
    !obligations.every(validObligation) ||
    !grants.every(validGrant) ||
    !intents.every(validIntent) ||
    !facts.every(validFact)
  )
    return fail('FC-TRUST', 'INVALID_OBLIGATION_SNAPSHOT');
  const obligationMap = new Map(obligations.map((item) => [item.id, item]));
  const grantMap = new Map(grants.map((item) => [item.id, item]));
  if (
    obligationMap.size !== obligations.length ||
    grantMap.size !== grants.length ||
    new Set(facts.map((fact) => fact.event)).size !== facts.length
  )
    return fail('FC-TRUST', 'INVALID_OBLIGATION_SNAPSHOT');
  let highestEvent = 0;
  for (const fact of facts) {
    const ordinal = eventOrdinal(fact.event);
    const obligation = obligationMap.get(fact.obligation);
    if (
      !ordinal ||
      !obligation ||
      obligation.boundDigest !== fact.boundDigest ||
      obligation.generation !== fact.generation
    )
      return fail('FC-TRUST', 'INVALID_OBLIGATION_SNAPSHOT');
    highestEvent = Math.max(highestEvent, ordinal);
    if (fact.grant !== null && !grantMap.has(fact.grant)) return fail('FC-TRUST', 'INVALID_OBLIGATION_SNAPSHOT');
  }
  for (const obligation of obligations) {
    const related = facts.filter((fact) => fact.obligation === obligation.id);
    const opening = related.filter((fact) => fact.type === 'SCH-OBLIGATION');
    const exhausted = related.filter((fact) => fact.type === 'EV-BOUND-EXHAUSTED');
    const handoffs = related.filter((fact) => fact.type === 'EV-OWNER-DECISION');
    const resolutions = related.filter((fact) => fact.type === 'EV-OBLIGATION-RESOLVED');
    if (
      opening.length !== 1 ||
      opening[0]?.status !== 'open' ||
      opening[0]?.criteriaDigest !== obligation.criteria.digest ||
      opening[0]?.evidenceDigest !== obligation.preservationEvidence.referenceDigest ||
      exhausted.length !== obligation.exhaustionCount ||
      (obligation.exhaustionCount === 1 &&
        (exhausted[0]?.event !== obligation.lastExhaustionEvent ||
          exhausted[0]?.observedAt !== obligation.lastExhaustedAt)) ||
      (obligation.exhaustionCount === 0 && obligation.lastExhaustionEvent !== null) ||
      (obligation.handoffEvent === null
        ? handoffs.length !== 0
        : handoffs.length !== 1 ||
          handoffs[0]?.event !== obligation.handoffEvent ||
          handoffs[0]?.status !== 'accepted-handoff' ||
          handoffs[0]?.criteriaDigest !== obligation.criteria.digest) ||
      (obligation.resolutionEvent === null
        ? resolutions.length !== 0
        : resolutions.length !== 1 ||
          resolutions[0]?.event !== obligation.resolutionEvent ||
          resolutions[0]?.status !== 'resolved' ||
          resolutions[0]?.criteriaDigest !== obligation.criteria.digest ||
          resolutions[0]?.evidenceDigest !== obligation.resolutionEvidence?.referenceDigest ||
          resolutions[0]?.grant !== obligation.resolutionGrant)
    )
      return fail('FC-TRUST', 'INVALID_OBLIGATION_SNAPSHOT');
  }
  for (const grant of grants) {
    const obligation = obligationMap.get(grant.obligation);
    if (
      !obligation ||
      grant.generation !== obligation.generation ||
      !grant.id.startsWith(`${obligation.run}/grant/`) ||
      !grant.event.startsWith(`${obligation.run}/event/`)
    )
      return fail('FC-TRUST', 'INVALID_OBLIGATION_SNAPSHOT');
    const grantFacts = facts.filter((fact) => fact.grant === grant.id);
    if (grantFacts.length < 1 || !grantFacts.some((fact) => fact.type === 'EV-DELEGATION-GRANT'))
      return fail('FC-TRUST', 'INVALID_OBLIGATION_SNAPSHOT');
  }
  for (const intent of intents) {
    const obligation = obligationMap.get(intent.obligation);
    if (
      !obligation ||
      intent.generation !== obligation.generation ||
      intent.criteriaDigest !== obligation.criteria.digest
    )
      return fail('FC-TRUST', 'INVALID_OBLIGATION_SNAPSHOT');
    if (
      intent.status === 'confirmed' &&
      (obligation.resolutionEvent === null ||
        obligation.resolutionEvidence?.referenceDigest !== intent.evidence.referenceDigest)
    )
      return fail('FC-TRUST', 'INVALID_OBLIGATION_SNAPSHOT');
  }
  if (raw.nextEventOrdinal <= highestEvent) return fail('FC-TRUST', 'INVALID_OBLIGATION_SNAPSHOT');
  return ok({
    obligations: obligations as ResidualObligation[],
    grants: grants as ObligationGrant[],
    intents: intents as ObligationResolutionIntent[],
    facts: facts as ObligationFact[],
    nextEventOrdinal: raw.nextEventOrdinal as number,
  });
}

export function obligationCriteriaDigest(input: Readonly<{ subject: string; claim: string }>): string | undefined {
  return criteriaDigestFor(input.subject, input.claim);
}

export function obligationEvidenceDigest(
  input: Readonly<{ subject: string; digest: string; trustRoot: string }>,
): string | undefined {
  return evidenceDigestFor(input.subject, input.digest, input.trustRoot);
}

export function obligationBoundDigest(
  input: Readonly<{ id: string; generation: string; policyDigest: string; startedAt: number; deadline: number }>,
): string | undefined {
  return boundDigestFor(input);
}

export function createScriptedObligationController(
  options?: Readonly<{ hydrate?: HydratedState }>,
): ObligationController {
  let nextEventOrdinal = options?.hydrate?.nextEventOrdinal ?? 1;
  let obligations = new Map<string, ResidualObligation>(
    (options?.hydrate?.obligations ?? []).map((item) => [item.id, item]),
  );
  let grants = new Map<string, ObligationGrant>((options?.hydrate?.grants ?? []).map((item) => [item.id, item]));
  let intents = new Map<string, ObligationResolutionIntent>(
    (options?.hydrate?.intents ?? []).map((item) => [item.key, item]),
  );
  let facts = [...(options?.hydrate?.facts ?? [])];

  const appendFact = (fact: Omit<ObligationFact, 'event'>): ObligationFact => {
    const complete = deepFreeze({
      ...fact,
      event: eventId(fact.obligation.split('/obligation/')[0] as string, nextEventOrdinal),
    }) as ObligationFact;
    nextEventOrdinal += 1;
    facts = [...facts, complete];
    return complete;
  };

  const get = (id: unknown): ObligationResult<ResidualObligation> => {
    if (typeof id !== 'string' || !identity('ID-OBLIGATION', id)) return fail('FC-INPUT', 'INVALID_OBLIGATION_ID');
    const value = obligations.get(id);
    return value ? ok(value) : fail('FC-SUBJECT', 'OBLIGATION_NOT_FOUND');
  };

  const open = (input: unknown): ObligationResult<ResidualObligation> => {
    const raw = fields(input, [
      'obligationOrdinal',
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
    const parsedEvidence = raw && parseEvidence(raw.preservationEvidence);
    const parsedCriteria = raw && parseCriteria(raw.criteria);
    if (
      !raw ||
      !integer(raw.obligationOrdinal) ||
      raw.obligationOrdinal < 1 ||
      !identity('ID-RUN', raw.run) ||
      !identity('ID-GEN', raw.generation) ||
      !(raw.generation as string).startsWith(`${raw.run}/gen/`) ||
      !validResource(raw.resource) ||
      !AUTOMATIC_DUTIES.includes(raw.duty as AutomaticDuty) ||
      !identity('ID-EVENT', raw.origin) ||
      (eventOrdinal(raw.origin as string) ?? 0) < 1 ||
      !(raw.origin as string).startsWith(`${raw.run}/event/`) ||
      !text(raw.reason) ||
      !parsedEvidence?.ok ||
      !parsedCriteria?.ok ||
      raw.accountableOwner !== OWNER ||
      !integer(raw.startedAt) ||
      !integer(raw.deadline) ||
      raw.deadline <= raw.startedAt ||
      raw.deadline - raw.startedAt < OBLIGATION_BOUND.minimumSeconds ||
      raw.deadline - raw.startedAt > OBLIGATION_BOUND.maximumSeconds ||
      !digest(raw.policyDigest)
    ) {
      if (typeof raw?.resource === 'string' && SECRET.test(raw.resource)) return fail('FC-TRUST', 'HOSTILE_RESOURCE');
      if (
        raw &&
        typeof raw.origin === 'string' &&
        (!identity('ID-EVENT', raw.origin) ||
          (eventOrdinal(raw.origin) ?? 0) < 1 ||
          !raw.origin.startsWith(`${raw.run}/event/`))
      )
        return fail('FC-SUBJECT', 'INVALID_ORIGIN');
      return fail('FC-INPUT', 'INVALID_OBLIGATION_INPUT');
    }
    const id = `${raw.run}/obligation/${raw.obligationOrdinal}`;
    const boundDigest = boundDigestFor({
      id,
      generation: raw.generation as string,
      policyDigest: raw.policyDigest as string,
      startedAt: raw.startedAt as number,
      deadline: raw.deadline as number,
    });
    if (!boundDigest) return fail('FC-TRUST', 'BOUND_DIGEST_UNAVAILABLE');
    const candidate = deepFreeze({
      schema: OBLIGATION_SCHEMA,
      id,
      event: eventId(raw.run as string, nextEventOrdinal),
      type: 'SCH-OBLIGATION' as const,
      controller: OBLIGATION_CONTROLLER,
      port: OBLIGATION_PORT,
      run: raw.run as string,
      generation: raw.generation as string,
      resource: raw.resource as string,
      duty: raw.duty as AutomaticDuty,
      origin: raw.origin as string,
      reason: raw.reason as string,
      preservationEvidence: parsedEvidence.value,
      accountableOwner: OWNER,
      criteria: parsedCriteria.value,
      bound: OBLIGATION_BOUND.name,
      startedAt: raw.startedAt as number,
      deadline: raw.deadline as number,
      policyDigest: raw.policyDigest as string,
      boundDigest,
      status: 'open' as const,
      exhaustionCount: 0,
      lastExhaustionEvent: null,
      lastExhaustedAt: null,
      handoffEvent: null,
      handoffResponder: null,
      handoffCriteriaDigest: null,
      handoffReason: null,
      resolutionEvent: null,
      resolutionResponder: null,
      resolutionGrant: null,
      resolutionCriteriaDigest: null,
      resolutionEvidence: null,
    }) as ResidualObligation;
    const prior = obligations.get(id);
    if (prior) {
      const { event: _priorEvent, ...priorBasis } = prior;
      const { event: _candidateEvent, ...candidateBasis } = candidate;
      return sameJson(priorBasis, candidateBasis) ? ok(prior) : fail('FC-SUBJECT', 'OBLIGATION_ID_REUSE_MISMATCH');
    }
    obligations = new Map(obligations).set(id, candidate);
    appendFact({
      type: 'SCH-OBLIGATION',
      obligation: id,
      status: 'open',
      generation: candidate.generation,
      criteriaDigest: candidate.criteria.digest,
      evidenceDigest: candidate.preservationEvidence.referenceDigest,
      grant: null,
      boundDigest: candidate.boundDigest,
      observedAt: candidate.startedAt,
    });
    return ok(candidate);
  };

  const issueGrant = (input: unknown): ObligationResult<ObligationGrant> => {
    const raw = fields(input, [
      'grantOrdinal',
      'obligation',
      'delegate',
      'grantorProof',
      'generation',
      'issuedAt',
      'expiresAt',
    ]);
    if (
      !raw ||
      !integer(raw.grantOrdinal) ||
      raw.grantOrdinal < 1 ||
      !identity('ID-OBLIGATION', raw.obligation) ||
      !identity('ID-PRINCIPAL', raw.delegate) ||
      raw.delegate === OWNER ||
      !identity('ID-GEN', raw.generation) ||
      !integer(raw.issuedAt) ||
      !integer(raw.expiresAt)
    )
      return fail('FC-INPUT', 'INVALID_GRANT_INPUT');
    if (!authenticated(OWNER, raw.grantorProof)) return fail('FC-AUTHORITY', 'GRANTOR_NOT_AUTHENTICATED');
    const current = obligations.get(raw.obligation as string);
    if (!current) return fail('FC-SUBJECT', 'OBLIGATION_NOT_FOUND');
    if (current.status === 'resolved') return fail('FC-FENCE', 'OBLIGATION_TERMINAL');
    if (current.generation !== raw.generation) return fail('FC-FENCE', 'STALE_OBLIGATION_GENERATION');
    if (raw.expiresAt <= raw.issuedAt || raw.expiresAt - raw.issuedAt > OBLIGATION_BOUND.maximumSeconds)
      return fail('FC-BOUND', 'INVALID_GRANT_WINDOW');
    if ([...grants.values()].some((grant) => grant.obligation === current.id && grant.status === 'active'))
      return fail('FC-FENCE', 'CURRENT_GRANT_EXISTS');
    const id = `${current.run}/grant/${raw.grantOrdinal}`;
    const scope = `obligation/${current.id}`;
    const grantDigest = derivedDigest('OBLIGATION-GRANT', {
      id,
      obligation: current.id,
      grantor: OWNER,
      delegate: raw.delegate,
      action: 'resolve-obligation',
      scope,
      generation: current.generation,
      issuedAt: raw.issuedAt,
      expiresAt: raw.expiresAt,
    });
    if (!grantDigest) return fail('FC-TRUST', 'GRANT_DIGEST_UNAVAILABLE');
    const candidate = deepFreeze({
      schema: OBLIGATION_GRANT_SCHEMA,
      id,
      event: eventId(current.run, nextEventOrdinal),
      type: 'EV-DELEGATION-GRANT' as const,
      obligation: current.id,
      grantor: OWNER,
      delegate: raw.delegate as string,
      action: 'resolve-obligation' as const,
      scope,
      generation: current.generation,
      issuedAt: raw.issuedAt as number,
      expiresAt: raw.expiresAt as number,
      status: 'active' as const,
      statusEvent: null,
      grantDigest,
    }) as ObligationGrant;
    const prior = grants.get(id);
    if (prior) return sameJson(prior, candidate) ? ok(prior) : fail('FC-SUBJECT', 'GRANT_ID_REUSE_MISMATCH');
    grants = new Map(grants).set(id, candidate);
    appendFact({
      type: 'EV-DELEGATION-GRANT',
      obligation: current.id,
      status: current.status,
      generation: current.generation,
      criteriaDigest: current.criteria.digest,
      evidenceDigest: null,
      grant: id,
      boundDigest: current.boundDigest,
      observedAt: candidate.issuedAt,
    });
    return ok(candidate);
  };

  const revokeGrant = (input: unknown): ObligationResult<ObligationGrant> => {
    const raw = fields(input, ['grant', 'revokerProof', 'observedAt']);
    if (!raw || !identity('ID-GRANT', raw.grant) || !integer(raw.observedAt))
      return fail('FC-INPUT', 'INVALID_REVOCATION_INPUT');
    if (!authenticated(OWNER, raw.revokerProof)) return fail('FC-AUTHORITY', 'REVOKER_NOT_AUTHENTICATED');
    const grant = grants.get(raw.grant as string);
    if (!grant) return fail('FC-SUBJECT', 'GRANT_NOT_FOUND');
    if (grant.status !== 'active') return ok(grant);
    const event = eventId(grant.obligation.split('/obligation/')[0] as string, nextEventOrdinal);
    const updated = deepFreeze({ ...grant, status: 'revoked' as const, statusEvent: event });
    grants = new Map(grants).set(grant.id, updated);
    const current = obligations.get(grant.obligation);
    if (current)
      appendFact({
        type: 'EV-DELEGATION-REVOKED',
        obligation: current.id,
        status: current.status,
        generation: current.generation,
        criteriaDigest: current.criteria.digest,
        evidenceDigest: null,
        grant: grant.id,
        boundDigest: current.boundDigest,
        observedAt: raw.observedAt as number,
      });
    return ok(updated);
  };

  const acceptHandoff = (input: unknown): ObligationResult<ResidualObligation> => {
    const raw = fields(input, [
      'obligation',
      'responder',
      'responderProof',
      'criteriaDigest',
      'generation',
      'reason',
      'observedAt',
    ]);
    if (
      !raw ||
      !identity('ID-OBLIGATION', raw.obligation) ||
      !identity('ID-PRINCIPAL', raw.responder) ||
      !digest(raw.criteriaDigest) ||
      !identity('ID-GEN', raw.generation) ||
      !text(raw.reason) ||
      !integer(raw.observedAt)
    )
      return fail('FC-INPUT', 'INVALID_HANDOFF_INPUT');
    if (raw.responder !== OWNER) return fail('FC-AUTHORITY', 'OWNER_ONLY_HANDOFF');
    if (!authenticated(OWNER, raw.responderProof)) return fail('FC-AUTHORITY', 'RESPONDER_NOT_AUTHENTICATED');
    const current = obligations.get(raw.obligation as string);
    if (!current) return fail('FC-SUBJECT', 'OBLIGATION_NOT_FOUND');
    if (current.generation !== raw.generation) return fail('FC-FENCE', 'STALE_OBLIGATION_GENERATION');
    if (current.status === 'resolved') return fail('FC-FENCE', 'OBLIGATION_TERMINAL');
    if (current.status === 'accepted-handoff') {
      return current.handoffResponder === raw.responder &&
        current.handoffCriteriaDigest === raw.criteriaDigest &&
        current.handoffReason === raw.reason
        ? ok(current)
        : fail('FC-FENCE', 'OBLIGATION_ALREADY_HANDOFF');
    }
    if (current.criteria.digest !== raw.criteriaDigest) return fail('FC-SUBJECT', 'CRITERIA_MISMATCH');
    const event = eventId(current.run, nextEventOrdinal);
    const updated = deepFreeze({
      ...current,
      status: 'accepted-handoff' as const,
      handoffEvent: event,
      handoffResponder: OWNER,
      handoffCriteriaDigest: raw.criteriaDigest as string,
      handoffReason: raw.reason as string,
    });
    obligations = new Map(obligations).set(current.id, updated);
    appendFact({
      type: 'EV-OWNER-DECISION',
      obligation: current.id,
      status: updated.status,
      generation: updated.generation,
      criteriaDigest: updated.criteria.digest,
      evidenceDigest: null,
      grant: null,
      boundDigest: updated.boundDigest,
      observedAt: raw.observedAt as number,
    });
    return ok(updated);
  };

  const resolve = (input: unknown): ObligationResult<ResidualObligation> => {
    const raw = fields(input, [
      'obligation',
      'responder',
      'responderProof',
      'grant',
      'generation',
      'criteriaDigest',
      'evidence',
      'observedAt',
    ]);
    const parsedEvidence = raw && parseEvidence(raw.evidence);
    if (!raw) return fail('FC-INPUT', 'INVALID_RESOLUTION_INPUT');
    if (!parsedEvidence?.ok) return parsedEvidence ?? fail('FC-INPUT', 'INVALID_RESOLUTION_INPUT');
    if (
      !identity('ID-OBLIGATION', raw.obligation) ||
      !identity('ID-PRINCIPAL', raw.responder) ||
      (raw.grant !== null && !identity('ID-GRANT', raw.grant)) ||
      !identity('ID-GEN', raw.generation) ||
      !digest(raw.criteriaDigest) ||
      !integer(raw.observedAt)
    )
      return fail('FC-INPUT', 'INVALID_RESOLUTION_INPUT');
    const current = obligations.get(raw.obligation as string);
    if (!current) return fail('FC-SUBJECT', 'OBLIGATION_NOT_FOUND');
    const intentKey = derivedDigest('OBLIGATION-RESOLUTION-INTENT', {
      obligation: current.id,
      responder: raw.responder,
      grant: raw.grant,
      generation: raw.generation,
      criteriaDigest: raw.criteriaDigest,
      evidence: parsedEvidence.value,
    });
    if (!intentKey) return fail('FC-TRUST', 'RESOLUTION_INTENT_DIGEST_UNAVAILABLE');
    const existingIntent = intents.get(intentKey);
    if (!existingIntent) {
      const intent = deepFreeze({
        schema: OBLIGATION_INTENT_SCHEMA,
        key: intentKey,
        type: 'EV-OBLIGATION-RESOLVED' as const,
        obligation: current.id,
        generation: raw.generation as string,
        responder: raw.responder as string,
        grant: raw.grant as string | null,
        criteriaDigest: raw.criteriaDigest as string,
        evidence: parsedEvidence.value,
        status: 'recorded' as const,
      }) as ObligationResolutionIntent;
      intents = new Map(intents).set(intentKey, intent);
    }
    if (current.status === 'resolved') {
      return current.resolutionCriteriaDigest === raw.criteriaDigest &&
        current.resolutionGrant === raw.grant &&
        current.resolutionEvidence?.referenceDigest === parsedEvidence.value.referenceDigest
        ? ok(current)
        : fail('FC-FENCE', 'OBLIGATION_TERMINAL');
    }
    if (current.generation !== raw.generation) return fail('FC-FENCE', 'STALE_OBLIGATION_GENERATION');
    if (current.criteria.digest !== raw.criteriaDigest) return fail('FC-SUBJECT', 'CRITERIA_MISMATCH');
    if (raw.responder === OWNER) {
      if (raw.grant !== null) return fail('FC-AUTHORITY', 'OWNER_GRANT_MISMATCH');
      if (!authenticated(OWNER, raw.responderProof)) return fail('FC-AUTHORITY', 'RESPONDER_NOT_AUTHENTICATED');
    } else {
      const grant = raw.grant === null ? undefined : grants.get(raw.grant as string);
      if (
        grant?.status !== 'active' ||
        grant.obligation !== current.id ||
        grant.delegate !== raw.responder ||
        grant.generation !== current.generation ||
        grant.scope !== `obligation/${current.id}` ||
        raw.observedAt >= grant.expiresAt
      )
        return fail('FC-FENCE', 'CURRENT_GRANT_REQUIRED');
      if (!authenticated(raw.responder as string, raw.responderProof))
        return fail('FC-AUTHORITY', 'RESPONDER_NOT_AUTHENTICATED');
    }
    const event = eventId(current.run, nextEventOrdinal);
    const updated = deepFreeze({
      ...current,
      status: 'resolved' as const,
      resolutionEvent: event,
      resolutionResponder: raw.responder as string,
      resolutionGrant: raw.grant as string | null,
      resolutionCriteriaDigest: raw.criteriaDigest as string,
      resolutionEvidence: parsedEvidence.value,
    });
    const recordedIntent = intents.get(intentKey);
    if (!recordedIntent) return fail('FC-TRUST', 'RESOLUTION_INTENT_UNAVAILABLE');
    obligations = new Map(obligations).set(current.id, updated);
    intents = new Map(intents).set(intentKey, deepFreeze({ ...recordedIntent, status: 'confirmed' as const }));
    appendFact({
      type: 'EV-OBLIGATION-RESOLVED',
      obligation: current.id,
      status: updated.status,
      generation: updated.generation,
      criteriaDigest: updated.criteria.digest,
      evidenceDigest: parsedEvidence.value.referenceDigest,
      grant: updated.resolutionGrant,
      boundDigest: updated.boundDigest,
      observedAt: raw.observedAt as number,
    });
    return ok(updated);
  };

  const expire = (input: unknown): ObligationResult<ResidualObligation> => {
    const raw = fields(input, ['obligation', 'observedAt']);
    if (!raw || !identity('ID-OBLIGATION', raw.obligation) || !integer(raw.observedAt))
      return fail('FC-INPUT', 'INVALID_EXHAUSTION_INPUT');
    const current = obligations.get(raw.obligation as string);
    if (!current) return fail('FC-SUBJECT', 'OBLIGATION_NOT_FOUND');
    if (current.status !== 'open' || current.exhaustionCount > 0) return ok(current);
    if ((raw.observedAt as number) < current.deadline) return fail('FC-BOUND', 'WAIT_NOT_EXHAUSTED');
    const event = eventId(current.run, nextEventOrdinal);
    const updated = deepFreeze({
      ...current,
      exhaustionCount: 1,
      lastExhaustionEvent: event,
      lastExhaustedAt: raw.observedAt as number,
    });
    obligations = new Map(obligations).set(current.id, updated);
    appendFact({
      type: 'EV-BOUND-EXHAUSTED',
      obligation: current.id,
      status: updated.status,
      generation: updated.generation,
      criteriaDigest: updated.criteria.digest,
      evidenceDigest: null,
      grant: null,
      boundDigest: updated.boundDigest,
      observedAt: raw.observedAt as number,
    });
    return ok(updated);
  };

  const wakeSettlement = (input: unknown): ObligationResult<ObligationFact> => {
    const raw = fields(input, ['obligation', 'conditionDigest', 'observedAt']);
    if (!raw || !identity('ID-OBLIGATION', raw.obligation) || !digest(raw.conditionDigest) || !integer(raw.observedAt))
      return fail('FC-INPUT', 'INVALID_WAKE_INPUT');
    const current = obligations.get(raw.obligation as string);
    if (!current) return fail('FC-SUBJECT', 'OBLIGATION_NOT_FOUND');
    const previous = facts.find(
      (fact) =>
        fact.type === 'EV-WAKE-SETTLEMENT' &&
        fact.obligation === current.id &&
        fact.evidenceDigest === raw.conditionDigest,
    );
    if (previous) return ok(previous);
    const fact = appendFact({
      type: 'EV-WAKE-SETTLEMENT',
      obligation: current.id,
      status: current.status,
      generation: current.generation,
      criteriaDigest: current.criteria.digest,
      evidenceDigest: raw.conditionDigest as string,
      grant: null,
      boundDigest: current.boundDigest,
      observedAt: raw.observedAt as number,
    });
    return ok(fact);
  };

  const snapshot = (): ObligationSnapshot =>
    deepFreeze({
      schema: OBLIGATION_CONTRACT_VERSION,
      nextEventOrdinal,
      obligations: [...obligations.values()],
      grants: [...grants.values()],
      intents: [...intents.values()],
      facts: [...facts],
    });
  const fixtureEvidence = (): ObligationFixtureEvidence =>
    Object.freeze({
      providerEnabled: false,
      dispatchEnabled: false,
      noticeChannelEnabled: false,
      settlementOverlayEnabled: false,
      cleanupEnabled: false,
      mechanism: MECHANISM,
    });
  return Object.freeze({
    open,
    issueGrant,
    revokeGrant,
    acceptHandoff,
    resolve,
    expire,
    wakeSettlement,
    get,
    grants: () => Object.freeze([...grants.values()]),
    intents: () => Object.freeze([...intents.values()]),
    facts: () => Object.freeze([...facts]),
    snapshot,
    fixtureEvidence,
  });
}

export function restoreScriptedObligationController(value: unknown): ObligationResult<ObligationController> {
  const validated = validateHydratedState(value);
  if (!validated.ok) return validated;
  return ok(createScriptedObligationController({ hydrate: validated.value }));
}
