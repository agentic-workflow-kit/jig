import { type CanonicalJson, parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';

/** Private GF-036 semantics. This fixture has no provider, adapter, or dispatch authority. */
export const DOORBELL_CONTRACT_VERSION = 'jig.doorbell-contract.v1';
export const ESCALATION_SCHEMA = 'jig.sch-escalation.v1';
export const GRANT_SCHEMA = 'jig.sch-delegation-grant.v1';
export const DECISION_SCHEMA = 'jig.sch-decision.v1';
export const RESPONSE_INTENT_SCHEMA = 'jig.response-intent.v1';
export const DOORBELL_CONTROLLER = 'RT-CONTROLLER';
export const DOORBELL_PORT = 'PORT-DECIDE';
export const DOORBELL_MECHANISM = 'scripted-doorbell.v1';
export const DOORBELL_BOUND = Object.freeze({
  name: 'BND-WAIT-DECISION',
  defaultSeconds: 72 * 60 * 60,
  minimumSeconds: 60 * 60,
  maximumSeconds: 30 * 24 * 60 * 60,
});
export const DOORBELL_REQUEST_KINDS = Object.freeze(['permission', 'question'] as const);
export const DOORBELL_ACTIONS = Object.freeze(['allow', 'reject', 'answer'] as const);

export type DoorbellRequestKind = (typeof DOORBELL_REQUEST_KINDS)[number];
export type DoorbellAction = (typeof DOORBELL_ACTIONS)[number];
export type DoorbellFailureFamily =
  | 'FC-INPUT'
  | 'FC-SUBJECT'
  | 'FC-FENCE'
  | 'FC-AUTHORITY'
  | 'FC-EFFECT'
  | 'FC-BOUND'
  | 'FC-TRUST';
export type DoorbellFailure = Readonly<{ family: DoorbellFailureFamily; code: string }>;
export type DoorbellResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: DoorbellFailure }>;

export type DoorbellBinding = Readonly<{
  run: string;
  story: string;
  candidate: string;
  session: string;
  principal: string;
  assignmentOrdinal: number;
  assignmentBasis: string;
  generation: string;
}>;

/** A copied event-time carrier; never a reference to a later mutable grant projection. */
export type EventTimeGrantBinding = Readonly<{
  id: string;
  request: string;
  run: string;
  generation: string;
  delegate: string;
  action: DoorbellAction;
  scope: string;
  issuedAt: number;
  expiresAt: number;
  status: 'active' | 'revoked' | 'expired';
  grantDigest: string;
}>;

export type EscalationRequest = Readonly<{
  schema: typeof ESCALATION_SCHEMA;
  id: string;
  event: string;
  type: 'EV-SESSION-HUMAN-REQUEST';
  binding: DoorbellBinding;
  kind: DoorbellRequestKind;
  action: DoorbellAction;
  scope: string;
  promptDigest: string;
  bound: typeof DOORBELL_BOUND.name;
  startedAt: number;
  deadline: number;
  exhaustionCount: number;
  lastExhaustionEvent: string | null;
  currentGrant: string | null;
  status: 'open' | 'answered' | 'cancelled';
  response: Readonly<{ event: string; responder: string; answerDigest: string }> | null;
  predecessorRequest: string | null;
  successorRequest: string | null;
  closureReason: string | null;
  requestDigest: string;
}>;

export type DelegationGrant = Readonly<{
  schema: typeof GRANT_SCHEMA;
  id: string;
  event: string;
  type: 'EV-DELEGATION-GRANT';
  binding: DoorbellBinding;
  request: string;
  grantor: 'principal/arye';
  delegate: string;
  action: DoorbellAction;
  scope: string;
  issuedAt: number;
  expiresAt: number;
  generation: string;
  status: 'active' | 'revoked' | 'expired';
  statusEvent: string | null;
  revokedAt: number | null;
  revokedBy: string | null;
  revocationReason: string | null;
  supersedes: string | null;
  grantDigest: string;
}>;

export type DecisionRecord = Readonly<{
  schema: typeof DECISION_SCHEMA;
  event: string;
  decisionOrdinal: number;
  type: 'EV-OWNER-DECISION';
  request: string;
  binding: DoorbellBinding;
  responder: string;
  grant: string | null;
  action: DoorbellAction;
  scope: string;
  answerDigest: string;
  observedAt: number;
  generation: string;
}>;

export type ResponseIntent = Readonly<{
  schema: typeof RESPONSE_INTENT_SCHEMA;
  event: string;
  operation: string;
  type: 'OPC-SESSION-RESPOND';
  port: typeof DOORBELL_PORT;
  controller: typeof DOORBELL_CONTROLLER;
  request: string;
  decision: string;
  binding: DoorbellBinding;
  answerDigest: string;
  status: 'recorded' | 'uncertain' | 'confirmed' | 'confirmed-absence';
  observationDigest: string | null;
}>;

export type DoorbellFact = Readonly<{
  event: string;
  type:
    | EscalationRequest['type']
    | DelegationGrant['type']
    | DecisionRecord['type']
    | 'EV-BOUND-EXHAUSTED'
    | 'EV-DELEGATION-REVOKED'
    | 'EV-DELEGATION-EXPIRED'
    | 'OPC-SESSION-RESPOND';
  subject: string;
  request: string | null;
  grant: string | null;
  operation: string | null;
  binding: DoorbellBinding;
  grantBinding: EventTimeGrantBinding | null;
  observedAt: number | null;
}>;

export type DoorbellSnapshot = Readonly<{
  schema: typeof DOORBELL_CONTRACT_VERSION;
  nextEventOrdinal: number;
  requests: readonly EscalationRequest[];
  grants: readonly DelegationGrant[];
  decisions: readonly DecisionRecord[];
  responseIntents: readonly ResponseIntent[];
  facts: readonly DoorbellFact[];
}>;

export type DoorbellFixtureEvidence = Readonly<{
  providerEnabled: false;
  dispatchEnabled: false;
  mechanism: typeof DOORBELL_MECHANISM;
  internalProviderDecisions: readonly ('allowed' | 'rejected' | 'human-needed')[];
  responseInvocations: readonly [];
}>;

export type DoorbellController = Readonly<{
  escalate(input: unknown): DoorbellResult<EscalationRequest>;
  issueGrant(input: unknown): DoorbellResult<DelegationGrant>;
  revokeGrant(input: unknown): DoorbellResult<DelegationGrant>;
  decide(input: unknown): DoorbellResult<DecisionRecord>;
  respond(input: unknown): DoorbellResult<ResponseIntent>;
  reconcileResponse(input: unknown): DoorbellResult<ResponseIntent>;
  expire(input: unknown): DoorbellResult<EscalationRequest>;
  cancelAndReissue(input: unknown): DoorbellResult<EscalationRequest>;
  request(id: unknown): DoorbellResult<EscalationRequest>;
  grants(): readonly DelegationGrant[];
  decisions(): readonly DecisionRecord[];
  facts(): readonly DoorbellFact[];
  snapshot(): DoorbellSnapshot;
  fixtureEvidence(): DoorbellFixtureEvidence;
}>;

const OWNER = 'principal/arye' as const;
const DIGEST = /^[0-9a-f]{64}$/u;
const TEXT = /^.{1,512}$/su;
const MAX_SAFE_TIME = Number.MAX_SAFE_INTEGER;
const DEFAULT_PRINCIPAL_PROOFS = Object.freeze([
  Object.freeze({ principal: OWNER, proofDigest: 'a'.repeat(64) }),
  Object.freeze({ principal: 'principal/agent-one', proofDigest: 'a'.repeat(64) }),
  Object.freeze({ principal: 'principal/agent-two', proofDigest: 'b'.repeat(64) }),
]);

const fail = <T = never>(family: DoorbellFailureFamily, code: string): DoorbellResult<T> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });
const ok = <T>(value: T): DoorbellResult<T> => Object.freeze({ ok: true, value: deepFreeze(value) });

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
      value === null ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (
      Object.keys(descriptors).sort().join(',') !== [...names].sort().join(',') ||
      !Object.values(descriptors).every((descriptor) => 'value' in descriptor)
    )
      return undefined;
    return Object.fromEntries(names.map((name) => [name, descriptors[name]?.value]));
  } catch {
    return undefined;
  }
}

const digest = (value: unknown): value is string => typeof value === 'string' && DIGEST.test(value);
const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_SAFE_TIME;
const text = (value: unknown): value is string =>
  typeof value === 'string' &&
  TEXT.test(value) &&
  value.normalize('NFC') === value &&
  [...value].every((character) => (character.codePointAt(0) ?? 0) > 0x1f && character !== '\u007f');
const identity = (kind: string, value: unknown): value is string =>
  typeof value === 'string' && parseIdentity(kind, value).ok;
const derivedDigest = (domain: string, value: Record<string, unknown>): string | undefined => {
  const result = stageDigest({ domain, excludePaths: [], value: value as unknown as CanonicalJson });
  return result.ok ? result.value.digest : undefined;
};
const eventOrdinal = (value: string): number | undefined => {
  const match = /\/event\/([1-9][0-9]*)$/u.exec(value);
  if (!match || String(Number(match[1])) !== match[1]) return undefined;
  const ordinal = Number(match[1]);
  return Number.isSafeInteger(ordinal) ? ordinal : undefined;
};

function parseBinding(value: unknown): DoorbellBinding | undefined {
  const raw = fields(value, [
    'run',
    'story',
    'candidate',
    'session',
    'principal',
    'assignmentOrdinal',
    'assignmentBasis',
    'generation',
  ]);
  if (
    !raw ||
    !identity('ID-RUN', raw.run) ||
    !identity('ID-STORY', raw.story) ||
    !identity('ID-CAND', raw.candidate) ||
    !identity('ID-SESSION', raw.session) ||
    !identity('ID-PRINCIPAL', raw.principal) ||
    !integer(raw.assignmentOrdinal) ||
    raw.assignmentOrdinal < 1 ||
    !digest(raw.assignmentBasis) ||
    !identity('ID-GEN', raw.generation) ||
    !raw.story.startsWith(`${raw.run}/story/`) ||
    !raw.candidate.startsWith(`${raw.story}/cand/`) ||
    !raw.session.startsWith(`${raw.story}/session/`) ||
    !raw.generation.startsWith(`${raw.run}/gen/`)
  )
    return undefined;
  return deepFreeze({
    run: raw.run as string,
    story: raw.story as string,
    candidate: raw.candidate as string,
    session: raw.session as string,
    principal: raw.principal as string,
    assignmentOrdinal: raw.assignmentOrdinal as number,
    assignmentBasis: raw.assignmentBasis as string,
    generation: raw.generation as string,
  });
}

function sameBinding(left: DoorbellBinding, right: DoorbellBinding): boolean {
  return (
    left.run === right.run &&
    left.story === right.story &&
    left.candidate === right.candidate &&
    left.session === right.session &&
    left.principal === right.principal &&
    left.assignmentOrdinal === right.assignmentOrdinal &&
    left.assignmentBasis === right.assignmentBasis &&
    left.generation === right.generation
  );
}

function requestDigestFor(
  input: Readonly<{
    binding: DoorbellBinding;
    kind: DoorbellRequestKind;
    action: DoorbellAction;
    scope: string;
    promptDigest: string;
    startedAt: number;
    deadline: number;
  }>,
): string | undefined {
  return derivedDigest('DOORBELL-REQUEST', {
    binding: input.binding,
    kind: input.kind,
    action: input.action,
    scope: input.scope,
    promptDigest: input.promptDigest,
    startedAt: input.startedAt,
    deadline: input.deadline,
  });
}

function grantDigestFor(
  input: Readonly<{
    id: string;
    request: string;
    binding: DoorbellBinding;
    delegate: string;
    action: DoorbellAction;
    scope: string;
    issuedAt: number;
    expiresAt: number;
    generation: string;
    supersedes: string | null;
  }>,
): string | undefined {
  return derivedDigest('DOORBELL-GRANT', {
    id: input.id,
    request: input.request,
    binding: input.binding,
    delegate: input.delegate,
    action: input.action,
    scope: input.scope,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    generation: input.generation,
    supersedes: input.supersedes,
  });
}

function grantBinding(
  grant: DelegationGrant,
  status: EventTimeGrantBinding['status'] = grant.status,
): EventTimeGrantBinding {
  return deepFreeze({
    id: grant.id,
    request: grant.request,
    run: grant.binding.run,
    generation: grant.generation,
    delegate: grant.delegate,
    action: grant.action,
    scope: grant.scope,
    issuedAt: grant.issuedAt,
    expiresAt: grant.expiresAt,
    status,
    grantDigest: grant.grantDigest,
  });
}

function sameImmutableGrantBinding(left: EventTimeGrantBinding, right: EventTimeGrantBinding): boolean {
  return (
    left.id === right.id &&
    left.request === right.request &&
    left.run === right.run &&
    left.generation === right.generation &&
    left.delegate === right.delegate &&
    left.action === right.action &&
    left.scope === right.scope &&
    left.issuedAt === right.issuedAt &&
    left.expiresAt === right.expiresAt &&
    left.grantDigest === right.grantDigest
  );
}

export function createScriptedDoorbellController(
  options?: Readonly<{
    internalProviderDecisions?: readonly ('allowed' | 'rejected' | 'human-needed')[];
    principalProofs?: readonly Readonly<{ principal: string; proofDigest: string }>[];
    snapshot?: DoorbellSnapshot;
  }>,
): DoorbellController {
  let nextEventOrdinal = 1;
  let requests = new Map<string, EscalationRequest>();
  let grants = new Map<string, DelegationGrant>();
  let decisions = new Map<string, DecisionRecord>();
  let responseIntents = new Map<string, ResponseIntent>();
  let facts: readonly DoorbellFact[] = [];
  const internalProviderDecisions = Object.freeze([...(options?.internalProviderDecisions ?? [])]);
  const proofs = new Map(
    (options?.principalProofs ?? DEFAULT_PRINCIPAL_PROOFS).map((entry) => [entry.principal, entry.proofDigest]),
  );
  const initial = (options as Readonly<{ hydrate?: DoorbellSnapshot }> | undefined)?.hydrate;
  if (initial) {
    nextEventOrdinal = initial.nextEventOrdinal;
    requests = new Map(initial.requests.map((entry) => [entry.id, deepFreeze(entry)]));
    grants = new Map(initial.grants.map((entry) => [entry.id, deepFreeze(entry)]));
    decisions = new Map(initial.decisions.map((entry) => [entry.event, deepFreeze(entry)]));
    responseIntents = new Map(initial.responseIntents.map((entry) => [entry.event, deepFreeze(entry)]));
    facts = deepFreeze([...initial.facts]);
  }
  const authenticated = (principal: unknown, proof: unknown): boolean =>
    typeof principal === 'string' && typeof proof === 'string' && proofs.get(principal) === proof;
  const eventId = (run: string): string => `${run}/event/${nextEventOrdinal++}`;
  const appendFact = (fact: DoorbellFact): void => {
    facts = [...facts, deepFreeze(fact)];
  };
  const requestById = (id: unknown): DoorbellResult<EscalationRequest> => {
    if (typeof id !== 'string' || !identity('ID-PARK', id)) return fail('FC-INPUT', 'INVALID_REQUEST_ID');
    const value = requests.get(id);
    return value ? ok(value) : fail('FC-SUBJECT', 'REQUEST_NOT_FOUND');
  };

  const escalate = (input: unknown): DoorbellResult<EscalationRequest> => {
    const raw = fields(input, [
      'parkOrdinal',
      'binding',
      'kind',
      'action',
      'scope',
      'promptDigest',
      'observedAt',
      'deadline',
    ]);
    const binding = raw && parseBinding(raw.binding);
    if (!raw) return fail('FC-INPUT', 'INVALID_ESCALATION_INPUT');
    if (!binding) return fail('FC-SUBJECT', 'INVALID_ESCALATION_BINDING');
    if (!integer(raw.parkOrdinal) || raw.parkOrdinal < 1) return fail('FC-INPUT', 'INVALID_PARK_ORDINAL');
    if (!DOORBELL_REQUEST_KINDS.includes(raw.kind as DoorbellRequestKind))
      return fail('FC-INPUT', 'INVALID_REQUEST_KIND');
    if (!DOORBELL_ACTIONS.includes(raw.action as DoorbellAction)) return fail('FC-INPUT', 'INVALID_ACTION');
    if (!text(raw.scope) || !digest(raw.promptDigest) || !integer(raw.observedAt) || !integer(raw.deadline))
      return fail('FC-INPUT', 'INVALID_REQUEST_CONTENT');
    if (
      raw.deadline <= raw.observedAt ||
      raw.deadline - raw.observedAt < DOORBELL_BOUND.minimumSeconds ||
      raw.deadline - raw.observedAt > DOORBELL_BOUND.maximumSeconds
    )
      return fail('FC-BOUND', 'INVALID_DECISION_BOUND');
    const id = `${binding.run}/park/${raw.parkOrdinal}`;
    const requestDigest = requestDigestFor({
      binding,
      kind: raw.kind as DoorbellRequestKind,
      action: raw.action as DoorbellAction,
      scope: raw.scope,
      promptDigest: raw.promptDigest,
      startedAt: raw.observedAt,
      deadline: raw.deadline,
    });
    if (!requestDigest) return fail('FC-TRUST', 'REQUEST_DIGEST_UNAVAILABLE');
    const prior = requests.get(id);
    if (prior)
      return prior.requestDigest === requestDigest ? ok(prior) : fail('FC-SUBJECT', 'REQUEST_ID_REUSE_MISMATCH');
    const record = deepFreeze({
      schema: ESCALATION_SCHEMA,
      id,
      event: eventId(binding.run),
      type: 'EV-SESSION-HUMAN-REQUEST' as const,
      binding,
      kind: raw.kind as DoorbellRequestKind,
      action: raw.action as DoorbellAction,
      scope: raw.scope,
      promptDigest: raw.promptDigest,
      bound: DOORBELL_BOUND.name,
      startedAt: raw.observedAt,
      deadline: raw.deadline,
      exhaustionCount: 0,
      lastExhaustionEvent: null,
      currentGrant: null,
      status: 'open' as const,
      response: null,
      predecessorRequest: null,
      successorRequest: null,
      closureReason: null,
      requestDigest,
    }) as EscalationRequest;
    requests = new Map(requests).set(id, record);
    appendFact({
      event: record.event,
      type: record.type,
      subject: binding.story,
      request: id,
      grant: null,
      operation: null,
      binding,
      grantBinding: null,
      observedAt: record.startedAt,
    });
    return ok(record);
  };

  const issueGrant = (input: unknown): DoorbellResult<DelegationGrant> => {
    const raw = fields(input, [
      'grantOrdinal',
      'request',
      'grantor',
      'delegate',
      'action',
      'scope',
      'issuedAt',
      'expiresAt',
      'generation',
      'supersedes',
      'grantorProof',
    ]);
    if (
      !raw ||
      !integer(raw.grantOrdinal) ||
      raw.grantOrdinal < 1 ||
      typeof raw.request !== 'string' ||
      !identity('ID-PARK', raw.request) ||
      raw.grantor !== OWNER ||
      !identity('ID-PRINCIPAL', raw.delegate) ||
      raw.delegate === OWNER ||
      !DOORBELL_ACTIONS.includes(raw.action as DoorbellAction) ||
      !text(raw.scope) ||
      !integer(raw.issuedAt) ||
      !integer(raw.expiresAt) ||
      raw.expiresAt <= raw.issuedAt ||
      raw.expiresAt - raw.issuedAt > DOORBELL_BOUND.maximumSeconds ||
      !identity('ID-GEN', raw.generation) ||
      (raw.supersedes !== null && (typeof raw.supersedes !== 'string' || !identity('ID-GRANT', raw.supersedes)))
    )
      return fail('FC-INPUT', 'INVALID_GRANT_INPUT');
    if (!digest(raw.grantorProof) || !authenticated(OWNER, raw.grantorProof))
      return fail('FC-AUTHORITY', 'GRANTOR_NOT_AUTHENTICATED');
    const request = requests.get(raw.request);
    if (!request) return fail('FC-SUBJECT', 'REQUEST_NOT_FOUND');
    if (request.status !== 'open') return fail('FC-FENCE', 'REQUEST_NOT_OPEN');
    if (
      raw.action !== request.action ||
      raw.scope !== request.scope ||
      raw.generation !== request.binding.generation ||
      raw.expiresAt > request.deadline
    )
      return fail('FC-AUTHORITY', 'GRANT_SCOPE_MISMATCH');
    const id = `${request.binding.run}/grant/${raw.grantOrdinal}`;
    const grantDigest = grantDigestFor({
      id,
      request: request.id,
      binding: request.binding,
      delegate: raw.delegate as string,
      action: raw.action as DoorbellAction,
      scope: raw.scope,
      issuedAt: raw.issuedAt,
      expiresAt: raw.expiresAt,
      generation: raw.generation,
      supersedes: raw.supersedes,
    });
    if (!grantDigest) return fail('FC-TRUST', 'GRANT_DIGEST_UNAVAILABLE');
    const prior = grants.get(id);
    if (prior) return prior.grantDigest === grantDigest ? ok(prior) : fail('FC-SUBJECT', 'GRANT_ID_REUSE_MISMATCH');
    if (request.currentGrant) return fail('FC-FENCE', 'CURRENT_GRANT_EXISTS');
    const predecessor = raw.supersedes === null ? null : grants.get(raw.supersedes as string);
    if (
      raw.supersedes !== null &&
      (!predecessor || predecessor.request !== request.id || predecessor.status === 'active')
    )
      return fail('FC-FENCE', 'INVALID_GRANT_SUPERSESSION');
    const grant = deepFreeze({
      schema: GRANT_SCHEMA,
      id,
      event: eventId(request.binding.run),
      type: 'EV-DELEGATION-GRANT' as const,
      binding: request.binding,
      request: request.id,
      grantor: OWNER,
      delegate: raw.delegate as string,
      action: raw.action as DoorbellAction,
      scope: raw.scope,
      issuedAt: raw.issuedAt,
      expiresAt: raw.expiresAt,
      generation: raw.generation,
      status: 'active' as const,
      statusEvent: null,
      revokedAt: null,
      revokedBy: null,
      revocationReason: null,
      supersedes: raw.supersedes as string | null,
      grantDigest,
    }) as DelegationGrant;
    grants = new Map(grants).set(id, grant);
    requests = new Map(requests).set(request.id, deepFreeze({ ...request, currentGrant: id }));
    appendFact({
      event: grant.event,
      type: grant.type,
      subject: grant.binding.story,
      request: grant.request,
      grant: id,
      operation: null,
      binding: grant.binding,
      grantBinding: grantBinding(grant, 'active'),
      observedAt: grant.issuedAt,
    });
    return ok(grant);
  };

  const changeGrantStatus = (
    grant: DelegationGrant,
    status: 'revoked' | 'expired',
    observedAt: number,
    revoker: string | null,
    reason: string | null,
  ): DelegationGrant => {
    const event = eventId(grant.binding.run);
    const updated = deepFreeze({
      ...grant,
      status,
      statusEvent: event,
      revokedAt: status === 'revoked' ? observedAt : null,
      revokedBy: status === 'revoked' ? revoker : null,
      revocationReason: status === 'revoked' ? reason : null,
    }) as DelegationGrant;
    grants = new Map(grants).set(grant.id, updated);
    const request = requests.get(grant.request);
    if (request?.currentGrant === grant.id) {
      requests = new Map(requests).set(request.id, deepFreeze({ ...request, currentGrant: null }));
    }
    appendFact({
      event,
      type: status === 'revoked' ? 'EV-DELEGATION-REVOKED' : 'EV-DELEGATION-EXPIRED',
      subject: grant.binding.story,
      request: grant.request,
      grant: grant.id,
      operation: null,
      binding: grant.binding,
      grantBinding: grantBinding(grant, 'active'),
      observedAt,
    });
    return updated;
  };

  const revokeGrant = (input: unknown): DoorbellResult<DelegationGrant> => {
    const raw = fields(input, ['grant', 'revoker', 'revokerProof', 'reason', 'observedAt']);
    if (
      !raw ||
      typeof raw.grant !== 'string' ||
      !identity('ID-GRANT', raw.grant) ||
      raw.revoker !== OWNER ||
      !digest(raw.revokerProof) ||
      !text(raw.reason) ||
      !integer(raw.observedAt)
    )
      return fail('FC-INPUT', 'INVALID_REVOCATION_INPUT');
    if (!authenticated(OWNER, raw.revokerProof)) return fail('FC-AUTHORITY', 'REVOKER_NOT_AUTHENTICATED');
    const grant = grants.get(raw.grant);
    if (!grant) return fail('FC-SUBJECT', 'GRANT_NOT_FOUND');
    if (grant.status !== 'active') return ok(grant);
    return ok(changeGrantStatus(grant, 'revoked', raw.observedAt, OWNER, raw.reason));
  };

  const decide = (input: unknown): DoorbellResult<DecisionRecord> => {
    const raw = fields(input, [
      'decisionOrdinal',
      'request',
      'responder',
      'responderProof',
      'binding',
      'grant',
      'action',
      'scope',
      'answerDigest',
      'observedAt',
      'generation',
    ]);
    const binding = raw && parseBinding(raw.binding);
    if (
      !raw ||
      !integer(raw.decisionOrdinal) ||
      raw.decisionOrdinal < 1 ||
      typeof raw.request !== 'string' ||
      !identity('ID-PARK', raw.request) ||
      !binding ||
      !identity('ID-PRINCIPAL', raw.responder) ||
      !DOORBELL_ACTIONS.includes(raw.action as DoorbellAction) ||
      !text(raw.scope) ||
      !digest(raw.answerDigest) ||
      !integer(raw.observedAt) ||
      !identity('ID-GEN', raw.generation)
    )
      return fail('FC-INPUT', 'INVALID_DECISION_INPUT');
    if (!authenticated(raw.responder, raw.responderProof)) return fail('FC-AUTHORITY', 'RESPONDER_NOT_AUTHENTICATED');
    const request = requests.get(raw.request);
    if (!request) return fail('FC-SUBJECT', 'REQUEST_NOT_FOUND');
    if (!sameBinding(binding, request.binding) || raw.generation !== request.binding.generation)
      return fail('FC-FENCE', 'DECISION_BINDING_MISMATCH');
    const existingByOrdinal = [...decisions.values()].find((item) => item.decisionOrdinal === raw.decisionOrdinal);
    if (existingByOrdinal)
      return existingByOrdinal.request === request.id &&
        existingByOrdinal.answerDigest === raw.answerDigest &&
        existingByOrdinal.responder === raw.responder
        ? ok(existingByOrdinal)
        : fail('FC-SUBJECT', 'DECISION_ID_REUSE_MISMATCH');
    if (request.status !== 'open') return fail('FC-FENCE', 'REQUEST_NOT_OPEN');
    if (raw.action !== request.action || raw.scope !== request.scope)
      return fail('FC-AUTHORITY', 'GRANT_SCOPE_MISMATCH');
    const grant = raw.grant === null ? null : grants.get(raw.grant as string);
    if (raw.responder === OWNER) {
      if (raw.grant !== null) return fail('FC-AUTHORITY', 'OWNER_GRANT_MISMATCH');
    } else {
      if (
        !grant ||
        grant.status !== 'active' ||
        grant.id !== request.currentGrant ||
        grant.delegate !== raw.responder ||
        grant.request !== request.id ||
        grant.generation !== request.binding.generation ||
        grant.action !== raw.action ||
        grant.scope !== raw.scope
      )
        return fail('FC-FENCE', 'GRANT_NOT_CURRENT');
      if (raw.observedAt >= grant.expiresAt) {
        const expired = changeGrantStatus(grant, 'expired', grant.expiresAt, null, null);
        if (expired.status !== 'expired') return fail('FC-TRUST', 'GRANT_EXPIRY_FAILURE');
        return fail('FC-FENCE', 'GRANT_NOT_CURRENT');
      }
    }
    const event = eventId(request.binding.run);
    const decision = deepFreeze({
      schema: DECISION_SCHEMA,
      event,
      decisionOrdinal: raw.decisionOrdinal,
      type: 'EV-OWNER-DECISION' as const,
      request: request.id,
      binding: request.binding,
      responder: raw.responder as string,
      grant: raw.grant as string | null,
      action: raw.action as DoorbellAction,
      scope: raw.scope,
      answerDigest: raw.answerDigest,
      observedAt: raw.observedAt,
      generation: raw.generation,
    }) as DecisionRecord;
    decisions = new Map(decisions).set(event, decision);
    requests = new Map(requests).set(
      request.id,
      deepFreeze({
        ...request,
        status: 'answered' as const,
        response: { event, responder: decision.responder, answerDigest: decision.answerDigest },
      }),
    );
    appendFact({
      event,
      type: decision.type,
      subject: request.binding.story,
      request: request.id,
      grant: decision.grant,
      operation: null,
      binding: decision.binding,
      grantBinding: grant ? grantBinding(grant, 'active') : null,
      observedAt: decision.observedAt,
    });
    return ok(decision);
  };

  const respond = (input: unknown): DoorbellResult<ResponseIntent> => {
    const raw = fields(input, ['operation', 'request', 'decision']);
    if (
      !raw ||
      typeof raw.operation !== 'string' ||
      !identity('ID-OP', raw.operation) ||
      typeof raw.request !== 'string' ||
      !identity('ID-PARK', raw.request) ||
      typeof raw.decision !== 'string' ||
      !identity('ID-EVENT', raw.decision)
    )
      return fail('FC-INPUT', 'INVALID_RESPONSE_INPUT');
    const request = requests.get(raw.request);
    const decision = decisions.get(raw.decision);
    if (!request || !decision || decision.request !== request.id)
      return fail('FC-SUBJECT', 'RESPONSE_BINDING_MISMATCH');
    const prior = [...responseIntents.values()].find((item) => item.operation === raw.operation);
    if (prior)
      return prior.status === 'uncertain' ? fail('FC-EFFECT', 'UNCERTAIN_RESPONSE_REQUIRES_RECONCILIATION') : ok(prior);
    const priorForRequest = [...responseIntents.values()].find((item) => item.request === request.id);
    if (priorForRequest) {
      return priorForRequest.status === 'uncertain'
        ? fail('FC-EFFECT', 'UNCERTAIN_RESPONSE_REQUIRES_RECONCILIATION')
        : fail('FC-FENCE', 'RESPONSE_ALREADY_RECORDED');
    }
    const event = eventId(request.binding.run);
    const intent = deepFreeze({
      schema: RESPONSE_INTENT_SCHEMA,
      event,
      operation: raw.operation,
      type: 'OPC-SESSION-RESPOND' as const,
      port: DOORBELL_PORT,
      controller: DOORBELL_CONTROLLER,
      request: request.id,
      decision: decision.event,
      binding: request.binding,
      answerDigest: decision.answerDigest,
      status: 'recorded' as const,
      observationDigest: null,
    }) as ResponseIntent;
    responseIntents = new Map(responseIntents).set(event, intent);
    appendFact({
      event,
      type: intent.type,
      subject: request.binding.story,
      request: request.id,
      grant: decision.grant,
      operation: intent.operation,
      binding: intent.binding,
      grantBinding: decision.grant
        ? grants.get(decision.grant)
          ? grantBinding(grants.get(decision.grant)!, 'active')
          : null
        : null,
      observedAt: null,
    });
    return ok(intent);
  };

  const reconcileResponse = (input: unknown): DoorbellResult<ResponseIntent> => {
    const raw = fields(input, ['operation', 'outcome', 'observationDigest']);
    if (
      !raw ||
      typeof raw.operation !== 'string' ||
      !identity('ID-OP', raw.operation) ||
      !['confirmed', 'confirmed-absence', 'indeterminate'].includes(raw.outcome as string) ||
      (raw.outcome === 'indeterminate' && !digest(raw.observationDigest))
    )
      return fail('FC-INPUT', 'INVALID_RECONCILIATION_INPUT');
    const prior = [...responseIntents.values()].find((item) => item.operation === raw.operation);
    if (!prior) return fail('FC-SUBJECT', 'RESPONSE_NOT_FOUND');
    const status =
      raw.outcome === 'confirmed'
        ? 'confirmed'
        : raw.outcome === 'confirmed-absence'
          ? 'confirmed-absence'
          : 'uncertain';
    if (prior.status === status && prior.observationDigest === (raw.observationDigest ?? null)) return ok(prior);
    const updated = deepFreeze({
      ...prior,
      status,
      observationDigest: raw.observationDigest ?? null,
    }) as ResponseIntent;
    responseIntents = new Map(responseIntents).set(prior.event, updated);
    return ok(updated);
  };

  const expire = (input: unknown): DoorbellResult<EscalationRequest> => {
    const raw = fields(input, ['request', 'observedAt']);
    if (!raw || typeof raw.request !== 'string' || !identity('ID-PARK', raw.request) || !integer(raw.observedAt))
      return fail('FC-INPUT', 'INVALID_EXHAUSTION_INPUT');
    const request = requests.get(raw.request);
    if (!request) return fail('FC-SUBJECT', 'REQUEST_NOT_FOUND');
    if (request.status !== 'open') return ok(request);
    if (raw.observedAt < request.deadline) return fail('FC-BOUND', 'DECISION_WAIT_NOT_EXHAUSTED');
    if (request.exhaustionCount > 0) return ok(request);
    const observedAt = raw.observedAt as number;
    const candidates = [...grants.values()]
      .filter((grant) => grant.request === request.id && grant.issuedAt <= observedAt)
      .map((grant) => {
        const statusFact = facts
          .filter(
            (fact) =>
              fact.grant === grant.id &&
              (fact.type === 'EV-DELEGATION-REVOKED' || fact.type === 'EV-DELEGATION-EXPIRED') &&
              typeof fact.observedAt === 'number' &&
              fact.observedAt <= observedAt,
          )
          .sort((left, right) => (left.observedAt ?? 0) - (right.observedAt ?? 0))
          .at(-1);
        const status: EventTimeGrantBinding['status'] = statusFact
          ? statusFact.type === 'EV-DELEGATION-REVOKED'
            ? 'revoked'
            : 'expired'
          : 'active';
        return { grant, status };
      })
      .sort((left, right) => {
        const issued = right.grant.issuedAt - left.grant.issuedAt;
        return issued !== 0 ? issued : (eventOrdinal(right.grant.event) ?? 0) - (eventOrdinal(left.grant.event) ?? 0);
      });
    const historical = candidates[0] ?? null;
    const historicalGrant = historical ? grantBinding(historical.grant, historical.status) : null;
    const event = eventId(request.binding.run);
    const updated = deepFreeze({ ...request, exhaustionCount: 1, lastExhaustionEvent: event });
    requests = new Map(requests).set(request.id, updated);
    appendFact({
      event,
      type: 'EV-BOUND-EXHAUSTED',
      subject: request.binding.story,
      request: request.id,
      grant: historical?.grant.id ?? null,
      operation: null,
      binding: request.binding,
      grantBinding: historicalGrant,
      observedAt: raw.observedAt,
    });
    return ok(updated);
  };

  const cancelAndReissue = (input: unknown): DoorbellResult<EscalationRequest> => {
    const raw = fields(input, [
      'request',
      'reason',
      'observedAt',
      'successorParkOrdinal',
      'successorBinding',
      'successorProof',
    ]);
    const successorBinding = raw && parseBinding(raw.successorBinding);
    if (
      !raw ||
      typeof raw.request !== 'string' ||
      !identity('ID-PARK', raw.request) ||
      !text(raw.reason) ||
      !integer(raw.observedAt) ||
      !integer(raw.successorParkOrdinal) ||
      !successorBinding ||
      !digest(raw.successorProof) ||
      !authenticated(successorBinding.principal, raw.successorProof)
    )
      return fail('FC-INPUT', 'INVALID_REISSUE_INPUT');
    const request = requests.get(raw.request);
    if (!request) return fail('FC-SUBJECT', 'REQUEST_NOT_FOUND');
    if (request.status !== 'open') return fail('FC-FENCE', 'REQUEST_NOT_OPEN');
    if (
      successorBinding.run !== request.binding.run ||
      successorBinding.story !== request.binding.story ||
      successorBinding.candidate !== request.binding.candidate ||
      successorBinding.principal !== request.binding.principal ||
      successorBinding.assignmentOrdinal !== request.binding.assignmentOrdinal ||
      successorBinding.generation !== request.binding.generation
    )
      return fail('FC-SUBJECT', 'REISSUE_BINDING_MISMATCH');
    if (successorBinding.session === request.binding.session) return fail('FC-FENCE', 'REISSUE_SESSION_NOT_REPLACED');
    if (request.currentGrant) {
      const grant = grants.get(request.currentGrant);
      if (!grant || grant.status !== 'active') return fail('FC-FENCE', 'CURRENT_GRANT_NOT_ACTIVE');
      changeGrantStatus(grant, 'revoked', raw.observedAt, OWNER, 'session-replacement');
    }
    const currentRequest = requests.get(request.id) ?? request;
    const successorId = `${request.binding.run}/park/${raw.successorParkOrdinal}`;
    const successorDigest = requestDigestFor({
      binding: successorBinding,
      kind: request.kind,
      action: request.action,
      scope: request.scope,
      promptDigest: request.promptDigest,
      startedAt: request.startedAt,
      deadline: request.deadline,
    });
    if (!successorDigest) return fail('FC-TRUST', 'REQUEST_DIGEST_UNAVAILABLE');
    const cancelled = deepFreeze({
      ...currentRequest,
      status: 'cancelled' as const,
      successorRequest: successorId,
      closureReason: raw.reason,
    });
    const successor = deepFreeze({
      ...currentRequest,
      id: successorId,
      event: eventId(request.binding.run),
      binding: successorBinding,
      requestDigest: successorDigest,
      exhaustionCount: 0,
      lastExhaustionEvent: null,
      currentGrant: null,
      status: 'open' as const,
      response: null,
      predecessorRequest: currentRequest.id,
      successorRequest: null,
      closureReason: null,
    }) as EscalationRequest;
    requests = new Map(requests).set(request.id, cancelled).set(successorId, successor);
    appendFact({
      event: successor.event,
      type: successor.type,
      subject: successor.binding.story,
      request: successor.id,
      grant: null,
      operation: null,
      binding: successor.binding,
      grantBinding: null,
      observedAt: successor.startedAt,
    });
    return ok(cancelled);
  };

  const snapshot = (): DoorbellSnapshot =>
    deepFreeze({
      schema: DOORBELL_CONTRACT_VERSION,
      nextEventOrdinal,
      requests: [...requests.values()],
      grants: [...grants.values()],
      decisions: [...decisions.values()],
      responseIntents: [...responseIntents.values()],
      facts: [...facts],
    });
  const fixtureEvidence = (): DoorbellFixtureEvidence =>
    Object.freeze({
      providerEnabled: false,
      dispatchEnabled: false,
      mechanism: DOORBELL_MECHANISM,
      internalProviderDecisions,
      responseInvocations: [] as const,
    });
  const controller = Object.freeze({
    escalate,
    issueGrant,
    revokeGrant,
    decide,
    respond,
    reconcileResponse,
    expire,
    cancelAndReissue,
    request: requestById,
    grants: () => Object.freeze([...grants.values()]),
    decisions: () => Object.freeze([...decisions.values()]),
    facts: () => Object.freeze([...facts]),
    snapshot,
    fixtureEvidence,
  });
  if (options?.snapshot) {
    const restored = restoreScriptedDoorbellController(options.snapshot);
    if (!restored.ok) return controller;
    return restored.value;
  }
  return controller;
}

function parseSnapshotBinding(value: unknown): DoorbellBinding | undefined {
  return parseBinding(value);
}

export function restoreScriptedDoorbellController(value: unknown): DoorbellResult<DoorbellController> {
  const raw = fields(value, [
    'schema',
    'nextEventOrdinal',
    'requests',
    'grants',
    'decisions',
    'responseIntents',
    'facts',
  ]);
  if (
    !raw ||
    raw.schema !== DOORBELL_CONTRACT_VERSION ||
    !integer(raw.nextEventOrdinal) ||
    raw.nextEventOrdinal < 1 ||
    !Array.isArray(raw.requests) ||
    !Array.isArray(raw.grants) ||
    !Array.isArray(raw.decisions) ||
    !Array.isArray(raw.responseIntents) ||
    !Array.isArray(raw.facts)
  )
    return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
  const requests = raw.requests as EscalationRequest[];
  const grants = raw.grants as DelegationGrant[];
  const decisions = raw.decisions as DecisionRecord[];
  const intents = raw.responseIntents as ResponseIntent[];
  const facts = raw.facts as DoorbellFact[];
  const requestMap = new Map<string, EscalationRequest>();
  const grantMap = new Map<string, DelegationGrant>();
  const decisionMap = new Map<string, DecisionRecord>();
  const intentMap = new Map<string, ResponseIntent>();
  const eventIds = new Map<number, string>();
  const registerEvent = (event: unknown): boolean => {
    if (typeof event !== 'string' || !identity('ID-EVENT', event)) return false;
    const ordinal = eventOrdinal(event);
    if (ordinal === undefined || (eventIds.has(ordinal) && eventIds.get(ordinal) !== event)) return false;
    eventIds.set(ordinal, event);
    return true;
  };
  const eventOwnedBy = (event: unknown, run: string): boolean =>
    typeof event === 'string' && event.startsWith(`${run}/event/`);
  for (const request of requests) {
    const binding = parseSnapshotBinding(request?.binding);
    if (
      !request ||
      request.schema !== ESCALATION_SCHEMA ||
      request.type !== 'EV-SESSION-HUMAN-REQUEST' ||
      !binding ||
      !sameBinding(binding, request.binding) ||
      !identity('ID-PARK', request.id) ||
      request.id !== `${binding.run}/park/${request.id.split('/park/')[1]}` ||
      !registerEvent(request.event) ||
      !eventOwnedBy(request.event, binding.run) ||
      !DOORBELL_REQUEST_KINDS.includes(request.kind) ||
      !DOORBELL_ACTIONS.includes(request.action) ||
      !text(request.scope) ||
      !digest(request.promptDigest) ||
      request.bound !== DOORBELL_BOUND.name ||
      !integer(request.startedAt) ||
      !integer(request.deadline) ||
      request.deadline <= request.startedAt ||
      request.deadline - request.startedAt < DOORBELL_BOUND.minimumSeconds ||
      request.deadline - request.startedAt > DOORBELL_BOUND.maximumSeconds ||
      !integer(request.exhaustionCount) ||
      request.exhaustionCount > 1 ||
      (request.lastExhaustionEvent !== null &&
        (!identity('ID-EVENT', request.lastExhaustionEvent) ||
          !eventOwnedBy(request.lastExhaustionEvent, binding.run))) ||
      (request.currentGrant !== null && !identity('ID-GRANT', request.currentGrant)) ||
      !['open', 'answered', 'cancelled'].includes(request.status) ||
      (request.response !== null &&
        (!identity('ID-EVENT', request.response.event) ||
          !identity('ID-PRINCIPAL', request.response.responder) ||
          !digest(request.response.answerDigest))) ||
      (request.predecessorRequest !== null && !identity('ID-PARK', request.predecessorRequest)) ||
      (request.successorRequest !== null && !identity('ID-PARK', request.successorRequest)) ||
      (request.closureReason !== null && !text(request.closureReason)) ||
      requestDigestFor(request) !== request.requestDigest ||
      requestMap.has(request.id)
    )
      return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    requestMap.set(request.id, deepFreeze(request));
  }
  for (const grant of grants) {
    const binding = parseSnapshotBinding(grant?.binding);
    if (
      !grant ||
      grant.schema !== GRANT_SCHEMA ||
      grant.type !== 'EV-DELEGATION-GRANT' ||
      !binding ||
      !identity('ID-GRANT', grant.id) ||
      !registerEvent(grant.event) ||
      !eventOwnedBy(grant.event, binding.run) ||
      !identity('ID-PARK', grant.request) ||
      !requestMap.has(grant.request) ||
      grant.binding.run !== requestMap.get(grant.request)!.binding.run ||
      grant.binding.story !== requestMap.get(grant.request)!.binding.story ||
      grant.binding.candidate !== requestMap.get(grant.request)!.binding.candidate ||
      grant.binding.session !== requestMap.get(grant.request)!.binding.session ||
      grant.binding.principal !== requestMap.get(grant.request)!.binding.principal ||
      grant.binding.assignmentOrdinal !== requestMap.get(grant.request)!.binding.assignmentOrdinal ||
      grant.binding.assignmentBasis !== requestMap.get(grant.request)!.binding.assignmentBasis ||
      grant.action !== requestMap.get(grant.request)!.action ||
      grant.scope !== requestMap.get(grant.request)!.scope ||
      grant.generation !== requestMap.get(grant.request)!.binding.generation ||
      grant.grantor !== OWNER ||
      !identity('ID-PRINCIPAL', grant.delegate) ||
      grant.delegate === OWNER ||
      !DOORBELL_ACTIONS.includes(grant.action) ||
      !text(grant.scope) ||
      !integer(grant.issuedAt) ||
      !integer(grant.expiresAt) ||
      grant.expiresAt <= grant.issuedAt ||
      grant.expiresAt - grant.issuedAt > DOORBELL_BOUND.maximumSeconds ||
      grant.generation !== binding.generation ||
      !['active', 'revoked', 'expired'].includes(grant.status) ||
      (grant.statusEvent !== null &&
        (!registerEvent(grant.statusEvent) || !eventOwnedBy(grant.statusEvent, binding.run))) ||
      (grant.status === 'active' && grant.statusEvent !== null) ||
      (grant.status !== 'active' && grant.statusEvent === null) ||
      (grant.status === 'revoked' &&
        (!integer(grant.revokedAt) || grant.revokedBy !== OWNER || !text(grant.revocationReason))) ||
      (grant.status === 'expired' &&
        (grant.revokedAt !== null || grant.revokedBy !== null || grant.revocationReason !== null)) ||
      (grant.supersedes !== null && !identity('ID-GRANT', grant.supersedes)) ||
      grantDigestFor(grant) !== grant.grantDigest ||
      grantMap.has(grant.id)
    )
      return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    grantMap.set(grant.id, deepFreeze(grant));
  }
  for (const decision of decisions) {
    const binding = parseSnapshotBinding(decision?.binding);
    if (
      !decision ||
      decision.schema !== DECISION_SCHEMA ||
      decision.type !== 'EV-OWNER-DECISION' ||
      !binding ||
      !identity('ID-EVENT', decision.event) ||
      !registerEvent(decision.event) ||
      !eventOwnedBy(decision.event, binding.run) ||
      !integer(decision.decisionOrdinal) ||
      decision.decisionOrdinal < 1 ||
      !requestMap.has(decision.request) ||
      !sameBinding(binding, requestMap.get(decision.request)!.binding) ||
      !identity('ID-PRINCIPAL', decision.responder) ||
      (decision.grant !== null && !grantMap.has(decision.grant)) ||
      !DOORBELL_ACTIONS.includes(decision.action) ||
      !text(decision.scope) ||
      !digest(decision.answerDigest) ||
      !integer(decision.observedAt) ||
      decision.generation !== binding.generation ||
      decisionMap.has(decision.event)
    )
      return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    const grant = decision.grant === null ? null : grantMap.get(decision.grant)!;
    if (
      (decision.responder === OWNER) !== (decision.grant === null) ||
      (grant && (grant.delegate !== decision.responder || grant.request !== decision.request))
    )
      return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    decisionMap.set(decision.event, deepFreeze(decision));
  }
  for (const intent of intents) {
    const binding = parseSnapshotBinding(intent?.binding);
    if (
      !intent ||
      intent.schema !== RESPONSE_INTENT_SCHEMA ||
      intent.type !== 'OPC-SESSION-RESPOND' ||
      !binding ||
      !registerEvent(intent.event) ||
      !eventOwnedBy(intent.event, binding.run) ||
      !identity('ID-OP', intent.operation) ||
      !identity('ID-PARK', intent.request) ||
      !identity('ID-EVENT', intent.decision) ||
      !decisionMap.has(intent.decision) ||
      decisionMap.get(intent.decision)!.request !== intent.request ||
      !sameBinding(binding, requestMap.get(intent.request)?.binding as DoorbellBinding) ||
      intent.port !== DOORBELL_PORT ||
      intent.controller !== DOORBELL_CONTROLLER ||
      !digest(intent.answerDigest) ||
      intent.answerDigest !== decisionMap.get(intent.decision)?.answerDigest ||
      !['recorded', 'uncertain', 'confirmed', 'confirmed-absence'].includes(intent.status) ||
      (intent.observationDigest !== null && !digest(intent.observationDigest)) ||
      intentMap.has(intent.event)
    )
      return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    intentMap.set(intent.event, deepFreeze(intent));
  }
  for (const request of requests) {
    const decision = request.response ? decisionMap.get(request.response.event) : undefined;
    if (request.status === 'answered') {
      if (
        !request.response ||
        !decision ||
        decision.request !== request.id ||
        decision.responder !== request.response.responder ||
        decision.answerDigest !== request.response.answerDigest ||
        !sameBinding(decision.binding, request.binding)
      )
        return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    } else if (request.response !== null || decision) {
      return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    }
    if (request.currentGrant !== null) {
      const grant = grantMap.get(request.currentGrant);
      if (
        !grant ||
        grant.status !== 'active' ||
        grant.request !== request.id ||
        !sameBinding(grant.binding, request.binding) ||
        grant.generation !== request.binding.generation
      )
        return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    }
    if (request.predecessorRequest !== null) {
      const predecessor = requestMap.get(request.predecessorRequest);
      if (
        !predecessor ||
        predecessor.successorRequest !== request.id ||
        predecessor.status !== 'cancelled' ||
        request.binding.session === predecessor.binding.session ||
        !sameBinding(
          { ...request.binding, session: predecessor.binding.session },
          { ...predecessor.binding, session: predecessor.binding.session },
        )
      )
        return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    }
    if (request.successorRequest !== null) {
      const successor = requestMap.get(request.successorRequest);
      if (
        request.status !== 'cancelled' ||
        !successor ||
        successor.predecessorRequest !== request.id ||
        successor.binding.session === request.binding.session ||
        successor.binding.run !== request.binding.run ||
        successor.binding.story !== request.binding.story ||
        successor.binding.candidate !== request.binding.candidate ||
        successor.binding.principal !== request.binding.principal ||
        successor.binding.assignmentOrdinal !== request.binding.assignmentOrdinal ||
        successor.binding.generation !== request.binding.generation
      )
        return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    }
  }
  for (const grant of grants) {
    const request = requestMap.get(grant.request);
    if (!request) return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    if (grant.status === 'active' && request.currentGrant !== grant.id)
      return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    if (grant.status !== 'active' && request.currentGrant === grant.id)
      return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    if (grant.supersedes !== null) {
      const predecessor = grantMap.get(grant.supersedes);
      if (
        !predecessor ||
        predecessor.request !== grant.request ||
        predecessor.status === 'active' ||
        !sameBinding(predecessor.binding, grant.binding) ||
        predecessor.binding.generation !== grant.binding.generation
      )
        return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    }
  }
  for (const decision of decisions) {
    const request = requestMap.get(decision.request);
    if (
      !request ||
      request.status !== 'answered' ||
      !request.response ||
      request.response.event !== decision.event ||
      !sameBinding(request.binding, decision.binding)
    )
      return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
  }
  const intentRequests = new Map<string, ResponseIntent>();
  for (const intent of intents) {
    if (intentRequests.has(intent.request)) return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    intentRequests.set(intent.request, intent);
  }
  const grantStatusAt = (grant: DelegationGrant, observedAt: number): EventTimeGrantBinding['status'] => {
    const statusFact = facts
      .filter(
        (fact) =>
          fact.grant === grant.id &&
          (fact.type === 'EV-DELEGATION-REVOKED' || fact.type === 'EV-DELEGATION-EXPIRED') &&
          typeof fact.observedAt === 'number' &&
          fact.observedAt <= observedAt,
      )
      .sort((left, right) => (left.observedAt ?? 0) - (right.observedAt ?? 0))
      .at(-1);
    return statusFact ? (statusFact.type === 'EV-DELEGATION-REVOKED' ? 'revoked' : 'expired') : 'active';
  };
  for (const fact of facts) {
    const binding = parseSnapshotBinding(fact?.binding);
    if (
      !fact ||
      !binding ||
      !registerEvent(fact.event) ||
      !eventOwnedBy(fact.event, binding.run) ||
      !identity('ID-STORY', fact.subject) ||
      ![
        'EV-SESSION-HUMAN-REQUEST',
        'EV-DELEGATION-GRANT',
        'EV-OWNER-DECISION',
        'EV-BOUND-EXHAUSTED',
        'EV-DELEGATION-REVOKED',
        'EV-DELEGATION-EXPIRED',
        'OPC-SESSION-RESPOND',
      ].includes(fact.type) ||
      (fact.request !== null && !requestMap.has(fact.request)) ||
      (fact.grant !== null && !grantMap.has(fact.grant)) ||
      (fact.operation !== null && !identity('ID-OP', fact.operation)) ||
      (fact.grantBinding !== null && !identity('ID-GRANT', fact.grantBinding.id)) ||
      (fact.grantBinding !== null &&
        (!grantMap.has(fact.grantBinding.id) ||
          fact.grant !== fact.grantBinding.id ||
          !sameImmutableGrantBinding(fact.grantBinding, grantBinding(grantMap.get(fact.grantBinding.id)!, 'active')) ||
          fact.grantBinding.run !== binding.run ||
          fact.grantBinding.request !== fact.request)) ||
      (fact.grant === null && fact.grantBinding !== null) ||
      (fact.grant !== null && fact.grantBinding === null && fact.type !== 'EV-SESSION-HUMAN-REQUEST')
    )
      return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    const sourceRequest = fact.request ? requestMap.get(fact.request)! : null;
    if (sourceRequest && !sameBinding(binding, sourceRequest.binding))
      return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    const sourceGrant = fact.grant ? grantMap.get(fact.grant) : null;
    if (sourceGrant && !sameBinding(binding, sourceGrant.binding)) return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    if (fact.type === 'EV-SESSION-HUMAN-REQUEST') {
      if (
        !sourceRequest ||
        sourceRequest.event !== fact.event ||
        fact.subject !== sourceRequest.binding.story ||
        fact.grant !== null ||
        fact.operation !== null ||
        fact.grantBinding !== null
      )
        return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    }
    if (fact.type === 'EV-DELEGATION-GRANT') {
      if (
        !sourceGrant ||
        sourceGrant.event !== fact.event ||
        fact.subject !== sourceGrant.binding.story ||
        fact.request !== sourceGrant.request ||
        fact.grant !== sourceGrant.id ||
        fact.operation !== null
      )
        return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    }
    if (fact.type === 'EV-OWNER-DECISION') {
      const decision = decisionMap.get(fact.event);
      if (
        !decision ||
        fact.subject !== decision.binding.story ||
        fact.request !== decision.request ||
        fact.grant !== decision.grant ||
        fact.operation !== null
      )
        return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    }
    if (fact.type === 'OPC-SESSION-RESPOND') {
      const intent = intentMap.get(fact.event);
      const decision = intent ? decisionMap.get(intent.decision) : null;
      if (
        !intent ||
        !decision ||
        fact.subject !== intent.binding.story ||
        fact.request !== intent.request ||
        fact.grant !== decision.grant ||
        fact.operation !== intent.operation
      )
        return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    }
    if (fact.type === 'EV-BOUND-EXHAUSTED' && fact.subject !== sourceRequest?.binding.story)
      return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    if (
      fact.type === 'EV-BOUND-EXHAUSTED' &&
      (!sourceRequest ||
        sourceRequest.lastExhaustionEvent !== fact.event ||
        sourceRequest.exhaustionCount !== 1 ||
        fact.observedAt === null ||
        (fact.grantBinding !== null && fact.grantBinding.status !== grantStatusAt(sourceGrant!, fact.observedAt)))
    )
      return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    if (fact.type === 'EV-DELEGATION-REVOKED' || fact.type === 'EV-DELEGATION-EXPIRED') {
      const grant = fact.grant ? grantMap.get(fact.grant) : undefined;
      if (
        !grant ||
        fact.subject !== grant.binding.story ||
        grant.statusEvent !== fact.event ||
        (fact.type === 'EV-DELEGATION-REVOKED' ? grant.status !== 'revoked' : grant.status !== 'expired')
      )
        return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    }
    if (fact.grantBinding !== null) {
      const decision = fact.type === 'EV-OWNER-DECISION' ? decisionMap.get(fact.event) : null;
      const intent = fact.type === 'OPC-SESSION-RESPOND' ? intentMap.get(fact.event) : null;
      const observedAt =
        fact.type === 'EV-DELEGATION-GRANT' ||
        fact.type === 'EV-DELEGATION-REVOKED' ||
        fact.type === 'EV-DELEGATION-EXPIRED' ||
        fact.type === 'EV-BOUND-EXHAUSTED'
          ? fact.observedAt
          : (decision?.observedAt ?? (intent ? decisionMap.get(intent.decision)?.observedAt : null));
      if (observedAt === null || observedAt === undefined) return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
      const expectedStatus =
        fact.type === 'EV-DELEGATION-REVOKED' || fact.type === 'EV-DELEGATION-EXPIRED'
          ? 'active'
          : grantStatusAt(sourceGrant!, observedAt);
      if (fact.grantBinding.status !== expectedStatus) return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
    }
  }
  const factKey = (fact: DoorbellFact): string =>
    `${fact.event}|${fact.type}|${fact.request ?? ''}|${fact.grant ?? ''}|${fact.operation ?? ''}`;
  const exhaustionFacts = facts.filter((fact) => fact.type === 'EV-BOUND-EXHAUSTED');
  for (const request of requests.filter((entry) => entry.exhaustionCount === 1)) {
    if (
      exhaustionFacts.filter((fact) => fact.request === request.id && fact.event === request.lastExhaustionEvent)
        .length !== 1
    )
      return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
  }
  if (exhaustionFacts.some((fact) => fact.request === null || requestMap.get(fact.request)?.exhaustionCount !== 1))
    return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
  const expectedFacts = [
    ...requests.map((request) => ({
      event: request.event,
      type: request.type,
      request: request.id,
      grant: null,
      operation: null,
    })),
    ...grants.map((grant) => ({
      event: grant.event,
      type: grant.type,
      request: grant.request,
      grant: grant.id,
      operation: null,
    })),
    ...decisions.map((decision) => ({
      event: decision.event,
      type: decision.type,
      request: decision.request,
      grant: decision.grant,
      operation: null,
    })),
    ...intents.map((intent) => ({
      event: intent.event,
      type: intent.type,
      request: intent.request,
      grant: decisionMap.get(intent.decision)!.grant,
      operation: intent.operation,
    })),
    ...grants
      .filter((grant) => grant.status !== 'active')
      .map((grant) => ({
        event: grant.statusEvent!,
        type: grant.status === 'revoked' ? 'EV-DELEGATION-REVOKED' : 'EV-DELEGATION-EXPIRED',
        request: grant.request,
        grant: grant.id,
        operation: null,
      })),
    ...exhaustionFacts.map((fact) => ({
      event: fact.event,
      type: fact.type,
      request: fact.request,
      grant: fact.grant,
      operation: fact.operation,
    })),
  ];
  const expectedCounts = new Map<string, number>();
  for (const expected of expectedFacts) {
    const key = `${expected.event}|${expected.type}|${expected.request ?? ''}|${expected.grant ?? ''}|${expected.operation ?? ''}`;
    expectedCounts.set(key, (expectedCounts.get(key) ?? 0) + 1);
  }
  const actualCounts = new Map<string, number>();
  for (const fact of facts) actualCounts.set(factKey(fact), (actualCounts.get(factKey(fact)) ?? 0) + 1);
  if (
    actualCounts.size !== expectedCounts.size ||
    [...expectedCounts].some(([key, count]) => actualCounts.get(key) !== count)
  )
    return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
  const maxOrdinal = Math.max(0, ...eventIds.keys());
  if (raw.nextEventOrdinal <= maxOrdinal || eventIds.size !== maxOrdinal)
    return fail('FC-TRUST', 'INVALID_DOORBELL_SNAPSHOT');
  return ok(createScriptedDoorbellController({ hydrate: deepFreeze(raw as unknown as DoorbellSnapshot) } as never));
}
