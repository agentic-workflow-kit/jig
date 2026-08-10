import { stageDigest } from '@agentic-workflow-kit/jig-codec';
import {
  OBLIGATION_BOUND,
  OBLIGATION_CONTROLLER,
  OBLIGATION_PORT,
  OBLIGATION_SCHEMA,
  type ObligationController,
  type ResidualObligation,
} from './obligation.js';

/** Private GF-046 semantic retirement contract. No real provider or destructive cleanup path exists here. */
export const RETIREMENT_CONTRACT_VERSION = 'jig.retirement-contract.v1';
export const RETIREMENT_SCHEMA = 'jig.sch-retirement.v1';
export const PRESERVATION_RECEIPT_SCHEMA = 'jig.ev-preservation-receipt.v1';
export const RETIREMENT_LOOKUP_ATTESTATION_SCHEMA = 'jig.cap-retirement-lookup.v1';
export const RETIREMENT_LOOKUP_CAPABILITY = 'CAP-RETIREMENT-LOOKUP';
export const RETIREMENT_CONTROLLER = 'RT-CONTROLLER';
export const RETIREMENT_TRANSITION_WRITER = 'CP-TRANSITION';
export const RETIREMENT_BOUND = Object.freeze({
  name: 'BND-RETIRE',
  defaultAttempts: 3,
  minimumAttempts: 1,
  maximumAttempts: 5,
  exhaustion: 'residual-obligation',
});
export const RETIREMENT_OPERATION_TYPES = Object.freeze([
  'OPC-SESSION-CLOSE',
  'OPC-WS-PRESERVE',
  'OPC-WS-RETIRE',
  'OPC-REV-RETIRE-REF',
  'OPC-REV-RETIRE-REQUEST',
  'OPC-REV-RETIRE-STATUS',
  'OPC-REV-RETIRE-COMMENT',
  'OPC-ART-DISPOSE',
] as const);
export type RetirementOperationType = (typeof RETIREMENT_OPERATION_TYPES)[number];
export type RetirementResourceKind =
  | 'session'
  | 'workspace'
  | 'review-ref'
  | 'review-request'
  | 'review-status'
  | 'review-comment'
  | 'artifact';
export type RetirementPort = 'PORT-SESSION' | 'PORT-WORKSPACE' | 'PORT-DELIVERY' | 'PORT-ARTIFACT';
export type RetirementFailureFamily =
  | 'FC-INPUT'
  | 'FC-SUBJECT'
  | 'FC-AUTHORITY'
  | 'FC-FENCE'
  | 'FC-EVIDENCE'
  | 'FC-EFFECT'
  | 'FC-BOUND'
  | 'FC-TRUST'
  | 'FC-MECHANISM';
export type RetirementFailure = Readonly<{ family: RetirementFailureFamily; code: string }>;
export type RetirementResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: RetirementFailure }>;

export type RetirementFence = Readonly<{ generation: string; authority: string; basis: string }>;
export type RetirementWitness = Readonly<{ head: string; lineage: string; currency: 'current' | 'stale' }>;
export type RetirementResource = Readonly<{
  resource: string;
  kind: RetirementResourceKind;
  holder: string;
  resourceIdentity: string;
  outcome: 'Landed' | 'Blocked' | 'Rejected';
  dependencyRelease: readonly string[];
  retention: 'active' | 'expired';
  pin: 'held' | 'not-held';
  destructionEligibility: 'eligible' | 'ineligible';
  reviewIdentity: string;
  fence: RetirementFence;
  witness: RetirementWitness;
}>;
export type RetirementTransition = Readonly<{
  controller: typeof RETIREMENT_CONTROLLER;
  writer: typeof RETIREMENT_TRANSITION_WRITER;
  transaction: string;
  event: string;
  position: number;
  fence: RetirementFence;
}>;
export type RetirementHolderTransition = Readonly<{
  controller: typeof RETIREMENT_CONTROLLER;
  writer: typeof RETIREMENT_TRANSITION_WRITER;
  transaction: string;
  event: string;
  position: number;
  fence: RetirementFence;
  resource: string;
  resourceIdentity: string;
  operation: RetirementOperationType;
  committed: true;
}>;
export type RetirementWitnessAdvance = Readonly<{
  previousHead: string;
  previousLineage: string;
  head: string;
  lineage: string;
  currency: 'current';
}>;
export type RetirementLookupAttestation = Readonly<{
  schema: typeof RETIREMENT_LOOKUP_ATTESTATION_SCHEMA;
  capability: typeof RETIREMENT_LOOKUP_CAPABILITY;
  resource: string;
  resourceIdentity: string;
  operation: RetirementOperationType;
  port: RetirementPort;
  mode: 'retire' | 'release-pin';
  transition: RetirementTransition;
  holderTransition: RetirementHolderTransition | null;
  preservationWitness: RetirementWitness;
  priorHead: string;
  priorLineage: string;
  newHead: string | null;
  newLineage: string | null;
  witnessAdvance: RetirementWitnessAdvance | null;
  certainty: 'confirmed-effect' | 'confirmed-absence' | 'indeterminate';
  digest: string;
}>;
export type RetirementTrustEvidence = Readonly<{
  kind: 'witness-fork' | 'witness-rollback' | 'witness-currency' | 'trust-root-compromise';
  expectedHead: string;
  observedHead: string;
  expectedLineage: string;
  observedLineage: string;
  expectedPosition: number;
  observedPosition: number;
  expectedRoot: string;
  observedRoot: string;
  observedCurrency: 'current' | 'stale';
  proofDigest: string;
}>;
export type RetirementBound = Readonly<{
  name: typeof RETIREMENT_BOUND.name;
  startedAt: number;
  deadline: number;
  attempts: number;
  maxAttempts: number;
  wake: 'EV-WAKE-SETTLEMENT';
  exhaustion: typeof RETIREMENT_BOUND.exhaustion;
}>;
export type RetirementPlan = Readonly<{
  schema: typeof RETIREMENT_SCHEMA;
  controller: typeof RETIREMENT_CONTROLLER;
  writer: typeof RETIREMENT_TRANSITION_WRITER;
  run: string;
  story: string;
  generation: string;
  storyState: string;
  runPhase: 'Active' | 'Stopped';
  baseline: Readonly<{
    outcome: 'Landed' | 'Blocked' | 'Rejected';
    dependencyRelease: readonly string[];
    releaseDigest: string;
  }>;
  transition: RetirementTransition;
  bound: RetirementBound;
  resources: readonly RetirementResource[];
}>;
export type PreservationReceipt = Readonly<{
  schema: typeof PRESERVATION_RECEIPT_SCHEMA;
  event: string;
  resource: string;
  resourceIdentity: string;
  kind: 'EV-WORKSPACE-PRESERVED' | 'EV-RESOURCE-PRESERVED';
  status: 'preserved';
  contentDigest: string;
  readbackDigest: string;
  evidenceKey: string;
  evidenceSubject: string;
  evidenceClaim: string;
  witness: RetirementWitness;
  transition: RetirementTransition;
}>;
export type RetirementObligationEvidence = Readonly<{
  key: string;
  subject: string;
  claim: string;
}>;
export type RetirementAuthorization = Readonly<{
  controller: typeof RETIREMENT_CONTROLLER;
  writer: typeof RETIREMENT_TRANSITION_WRITER;
  resource: string;
  resourceIdentity: string;
  operation: RetirementOperationType;
  port: RetirementPort;
  mode: 'retire' | 'release-pin';
  transition: RetirementTransition;
  holderTransition: RetirementHolderTransition | null;
  status: 'committed' | 'uncertain' | 'confirmed-absence' | 'reauthorized' | 'confirmed-effect';
  witnessAdvance: RetirementWitnessAdvance | null;
  lookupAttestation: RetirementLookupAttestation | null;
}>;
export type RetirementMechanism = Readonly<{
  invoke(input: Readonly<Record<string, unknown>>): RetirementResult<Readonly<Record<string, unknown>>>;
  lookup?: (input: Readonly<Record<string, unknown>>) => RetirementResult<Readonly<Record<string, unknown>>>;
}>;
export type RetirementObligationAllocator = ObligationController;
export type RetirementPin = Readonly<{ resourceIdentity: string; status: 'held' | 'released' }>;
export type RetirementSnapshot = Readonly<{
  schema: typeof RETIREMENT_SCHEMA;
  plan: RetirementPlan;
  receipts: readonly PreservationReceipt[];
  authorizations: readonly RetirementAuthorization[];
  pins: readonly RetirementPin[];
  obligations: readonly ResidualObligation[];
  dutyAttempts: readonly Readonly<{ resourceIdentity: string; attempts: number }>[];
  journal: readonly Readonly<Record<string, unknown>>[];
  dispatchFenced: boolean;
  journalDigest: string;
}>;
export type RetirementController = Readonly<{
  plan(input: unknown): RetirementResult<RetirementPlan>;
  recordPreservation(input: unknown): RetirementResult<PreservationReceipt>;
  authorize(input: unknown): RetirementResult<RetirementAuthorization>;
  dispatch(input: unknown): RetirementResult<Readonly<Record<string, unknown>>>;
  adopt(input: unknown): RetirementResult<Readonly<Record<string, unknown>>>;
  reconcile(
    input: unknown,
  ): RetirementResult<Readonly<{ certainty: 'confirmed-effect' | 'confirmed-absence' | 'indeterminate' }>>;
  reauthorize(input: unknown): RetirementResult<RetirementAuthorization>;
  failure(
    input: unknown,
  ): RetirementResult<Readonly<{ containment: 'park' | 'block' | 'retain'; failure: 'FC-EVIDENCE' }>>;
  exhaust(input: unknown): RetirementResult<Readonly<Record<string, unknown>>>;
  snapshot(): RetirementSnapshot;
}>;

type AnyRecord = Record<string, unknown>;
const DIGEST = /^[0-9a-f]{64}$/u;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9/_:.|=-]{0,255}$/u;
const SECRET_OR_URL = /(?:https?:\/\/|api[_ -]?key|access[_ -]?token|password|credential|secret|bearer)/iu;
const RESOURCE_KINDS: readonly RetirementResourceKind[] = Object.freeze([
  'session',
  'workspace',
  'review-ref',
  'review-request',
  'review-status',
  'review-comment',
  'artifact',
]);
const RETIREMENT_ORIGIN_ORDINAL: Readonly<Record<RetirementResourceKind, number>> = Object.freeze({
  session: 2,
  workspace: 3,
  'review-ref': 4,
  'review-request': 5,
  'review-status': 6,
  'review-comment': 7,
  artifact: 8,
});
const PORTS: Readonly<Record<RetirementOperationType, RetirementPort>> = Object.freeze({
  'OPC-SESSION-CLOSE': 'PORT-SESSION',
  'OPC-WS-PRESERVE': 'PORT-WORKSPACE',
  'OPC-WS-RETIRE': 'PORT-WORKSPACE',
  'OPC-REV-RETIRE-REF': 'PORT-DELIVERY',
  'OPC-REV-RETIRE-REQUEST': 'PORT-DELIVERY',
  'OPC-REV-RETIRE-STATUS': 'PORT-DELIVERY',
  'OPC-REV-RETIRE-COMMENT': 'PORT-DELIVERY',
  'OPC-ART-DISPOSE': 'PORT-ARTIFACT',
});
const OPERATION_FOR_KIND: Readonly<Record<RetirementResourceKind, RetirementOperationType>> = Object.freeze({
  session: 'OPC-SESSION-CLOSE',
  workspace: 'OPC-WS-RETIRE',
  'review-ref': 'OPC-REV-RETIRE-REF',
  'review-request': 'OPC-REV-RETIRE-REQUEST',
  'review-status': 'OPC-REV-RETIRE-STATUS',
  'review-comment': 'OPC-REV-RETIRE-COMMENT',
  artifact: 'OPC-ART-DISPOSE',
});
const operationsForKind = (kind: RetirementResourceKind): readonly RetirementOperationType[] =>
  kind === 'workspace'
    ? Object.freeze(['OPC-WS-PRESERVE', 'OPC-WS-RETIRE'])
    : Object.freeze([OPERATION_FOR_KIND[kind]]);
const authorizationKey = (resourceIdentity: string, operation: RetirementOperationType): string =>
  `${resourceIdentity}\u0000${operation}`;
const fail = <T>(family: RetirementFailureFamily, code: string): RetirementResult<T> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });
const ok = <T>(value: T): RetirementResult<T> => Object.freeze({ ok: true, value: freeze(value) });
const digest = (value: unknown): value is string => typeof value === 'string' && DIGEST.test(value);
const identifier = (value: unknown): value is string => typeof value === 'string' && ID.test(value);
const safeInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);

function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function fields(value: unknown, names: readonly string[]): AnyRecord | undefined {
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
      !names.every((name) => descriptors[name] && 'value' in descriptors[name])
    )
      return undefined;
    if (!Object.keys(descriptors).every((name) => names.includes(name))) return undefined;
    return Object.freeze(Object.fromEntries(names.map((name) => [name, descriptors[name]?.value])));
  } catch {
    return undefined;
  }
}

function optionalFields(value: unknown, names: readonly string[]): AnyRecord | undefined {
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
      !Object.keys(descriptors).every(
        (name) => names.includes(name) && descriptors[name] && 'value' in descriptors[name],
      )
    )
      return undefined;
    return Object.freeze(Object.fromEntries(Object.keys(descriptors).map((name) => [name, descriptors[name]?.value])));
  } catch {
    return undefined;
  }
}

function array(value: unknown): readonly unknown[] | undefined {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const length = descriptors.length?.value;
    if (
      !safeInteger(length) ||
      length < 0 ||
      Object.keys(descriptors).filter((key) => key !== 'length').length !== length
    )
      return undefined;
    const values: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !('value' in descriptor)) return undefined;
      values.push(descriptor.value);
    }
    return Object.freeze(values);
  } catch {
    return undefined;
  }
}

function equal(left: unknown, right: unknown): boolean {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function planDigest(plan: RetirementPlan): string {
  const staged = stageDigest({ domain: 'GF046-RETIREMENT-PLAN', excludePaths: [], value: plan as never });
  return staged.ok ? staged.value.digest : '';
}
function journalDigest(journal: readonly Readonly<Record<string, unknown>>[]): string {
  const staged = stageDigest({ domain: 'GF046-RETIREMENT-JOURNAL', excludePaths: [], value: journal as never });
  return staged.ok ? staged.value.digest : '';
}
function lookupAttestationDigest(value: AnyRecord): string {
  const staged = stageDigest({
    domain: 'GF046-RETIREMENT-LOOKUP',
    excludePaths: ['digest'],
    value: { ...value, digest: '' } as never,
  });
  return staged.ok ? staged.value.digest : '';
}

function validFence(value: unknown): value is RetirementFence {
  const raw = fields(value, ['generation', 'authority', 'basis']);
  return !!raw && identifier(raw.generation) && identifier(raw.authority) && digest(raw.basis);
}

function validWitness(value: unknown): value is RetirementWitness {
  const raw = fields(value, ['head', 'lineage', 'currency']);
  return !!raw && digest(raw.head) && digest(raw.lineage) && (raw.currency === 'current' || raw.currency === 'stale');
}

function validResource(value: unknown): value is RetirementResource {
  const raw = fields(value, [
    'resource',
    'kind',
    'holder',
    'resourceIdentity',
    'outcome',
    'dependencyRelease',
    'retention',
    'pin',
    'destructionEligibility',
    'reviewIdentity',
    'fence',
    'witness',
  ]);
  const releases = raw && array(raw.dependencyRelease);
  return (
    !!raw &&
    identifier(raw.resource) &&
    RESOURCE_KINDS.includes(raw.kind as RetirementResourceKind) &&
    identifier(raw.holder) &&
    identifier(raw.resourceIdentity) &&
    ['Landed', 'Blocked', 'Rejected'].includes(String(raw.outcome)) &&
    !!releases &&
    releases.every(identifier) &&
    (raw.retention === 'active' || raw.retention === 'expired') &&
    (raw.pin === 'held' || raw.pin === 'not-held') &&
    (raw.destructionEligibility === 'eligible' || raw.destructionEligibility === 'ineligible') &&
    identifier(raw.reviewIdentity) &&
    validFence(raw.fence) &&
    validWitness(raw.witness)
  );
}

function safeValue(value: unknown, seen = new Set<object>()): boolean {
  try {
    if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return true;
    if (typeof value === 'string') return !SECRET_OR_URL.test(value);
    if (typeof value !== 'object' || seen.has(value)) return false;
    seen.add(value);
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    if (Array.isArray(value)) {
      const length = descriptors.length?.value;
      if (!safeInteger(length) || Object.keys(descriptors).filter((key) => key !== 'length').length !== length)
        return false;
      for (let index = 0; index < length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !('value' in descriptor) || !safeValue(descriptor.value, seen)) return false;
      }
      return true;
    }
    if (Object.getPrototypeOf(value) !== Object.prototype) return false;
    return Object.values(descriptors).every(
      (descriptor) => 'value' in descriptor && !descriptor.get && !descriptor.set && safeValue(descriptor.value, seen),
    );
  } catch {
    return false;
  }
}

function safeRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && safeValue(value);
}

function validPin(value: unknown, plan: RetirementPlan): value is RetirementPin {
  const raw = fields(value, ['resourceIdentity', 'status']);
  return (
    !!raw &&
    !!plan.resources.find((resource) => resource.resourceIdentity === raw.resourceIdentity) &&
    (raw.status === 'held' || raw.status === 'released')
  );
}

function validAuthorization(value: unknown, plan: RetirementPlan): value is RetirementAuthorization {
  const raw = fields(value, [
    'controller',
    'writer',
    'resource',
    'resourceIdentity',
    'operation',
    'port',
    'mode',
    'transition',
    'holderTransition',
    'status',
    'witnessAdvance',
    'lookupAttestation',
  ]);
  const resource = raw && plan.resources.find((candidate) => candidate.resourceIdentity === raw.resourceIdentity);
  const operation = raw?.operation as RetirementOperationType;
  const port = raw?.port as RetirementPort;
  const mode = raw?.mode as 'retire' | 'release-pin';
  return (
    !!raw &&
    !!resource &&
    raw.controller === RETIREMENT_CONTROLLER &&
    raw.writer === RETIREMENT_TRANSITION_WRITER &&
    raw.resource === resource.resource &&
    RETIREMENT_OPERATION_TYPES.includes(operation) &&
    port === PORTS[operation] &&
    operationsForKind(resource.kind).includes(operation) &&
    validTransition(raw.transition) &&
    equal(raw.transition, plan.transition) &&
    (operation === 'OPC-WS-PRESERVE'
      ? raw.holderTransition === null
      : validHolderTransition(raw.holderTransition, resource, operation, plan)) &&
    ((operation === 'OPC-ART-DISPOSE' && mode === 'release-pin') ||
      (operation !== 'OPC-ART-DISPOSE' && mode === 'retire')) &&
    ['committed', 'uncertain', 'confirmed-absence', 'reauthorized', 'confirmed-effect'].includes(String(raw.status)) &&
    (raw.witnessAdvance === null || validWitnessAdvanceShape(raw.witnessAdvance)) &&
    (raw.lookupAttestation === null || validLookupAttestationShape(raw.lookupAttestation))
  );
}

function validDutyAttempts(
  value: unknown,
  plan: RetirementPlan,
): value is Readonly<{ resourceIdentity: string; attempts: number }> {
  const raw = fields(value, ['resourceIdentity', 'attempts']);
  return (
    !!raw &&
    !!plan.resources.find((resource) => resource.resourceIdentity === raw.resourceIdentity) &&
    safeInteger(raw.attempts) &&
    raw.attempts >= plan.bound.attempts &&
    raw.attempts <= plan.bound.maxAttempts
  );
}

function validTransition(value: unknown): value is RetirementTransition {
  const raw = fields(value, ['controller', 'writer', 'transaction', 'event', 'position', 'fence']);
  return (
    !!raw &&
    raw.controller === RETIREMENT_CONTROLLER &&
    raw.writer === RETIREMENT_TRANSITION_WRITER &&
    identifier(raw.transaction) &&
    identifier(raw.event) &&
    safeInteger(raw.position) &&
    raw.position >= 0 &&
    validFence(raw.fence)
  );
}

function validHolderTransition(
  value: unknown,
  resource: RetirementResource,
  operation: RetirementOperationType,
  plan: RetirementPlan,
): value is RetirementHolderTransition {
  const raw = fields(value, [
    'controller',
    'writer',
    'transaction',
    'event',
    'position',
    'fence',
    'resource',
    'resourceIdentity',
    'operation',
    'committed',
  ]);
  return (
    !!raw &&
    raw.controller === RETIREMENT_CONTROLLER &&
    raw.writer === RETIREMENT_TRANSITION_WRITER &&
    identifier(raw.transaction) &&
    raw.transaction !== plan.transition.transaction &&
    identifier(raw.event) &&
    safeInteger(raw.position) &&
    raw.position > plan.transition.position &&
    equal(raw.fence, plan.transition.fence) &&
    raw.resource === resource.resource &&
    raw.resourceIdentity === resource.resourceIdentity &&
    raw.operation === operation &&
    raw.committed === true
  );
}

function validLookupAttestation(
  value: unknown,
  authorization: RetirementAuthorization,
  resource: RetirementResource,
  priorWitness: RetirementWitness,
  certainty: 'confirmed-effect' | 'confirmed-absence' | 'indeterminate',
): value is RetirementLookupAttestation {
  if (!validLookupAttestationShape(value)) return false;
  const raw = value as RetirementLookupAttestation;
  if (
    raw.resource !== resource.resource ||
    raw.resourceIdentity !== resource.resourceIdentity ||
    raw.operation !== authorization.operation ||
    raw.port !== authorization.port ||
    raw.mode !== authorization.mode ||
    !equal(raw.transition, authorization.transition) ||
    !equal(raw.holderTransition, authorization.holderTransition) ||
    !equal(raw.preservationWitness, priorWitness) ||
    raw.priorHead !== priorWitness.head ||
    raw.priorLineage !== priorWitness.lineage ||
    raw.certainty !== certainty
  )
    return false;
  if (certainty === 'confirmed-effect')
    return (
      digest(raw.newHead) &&
      digest(raw.newLineage) &&
      validWitnessAdvance(raw.witnessAdvance, priorWitness, raw.newHead, raw.newLineage)
    );
  return raw.newHead === null && raw.newLineage === null && raw.witnessAdvance === null;
}

function validWitnessAdvanceShape(value: unknown): value is RetirementWitnessAdvance {
  const raw = fields(value, ['previousHead', 'previousLineage', 'head', 'lineage', 'currency']);
  return (
    !!raw &&
    digest(raw.previousHead) &&
    digest(raw.previousLineage) &&
    digest(raw.head) &&
    digest(raw.lineage) &&
    raw.currency === 'current' &&
    (raw.head !== raw.previousHead || raw.lineage !== raw.previousLineage)
  );
}

function validWitnessAdvance(
  value: unknown,
  priorWitness: RetirementWitness,
  head: unknown,
  lineage: unknown,
): value is RetirementWitnessAdvance {
  const raw = fields(value, ['previousHead', 'previousLineage', 'head', 'lineage', 'currency']);
  return (
    validWitnessAdvanceShape(value) &&
    !!raw &&
    raw.previousHead === priorWitness.head &&
    raw.previousLineage === priorWitness.lineage &&
    raw.head === head &&
    raw.lineage === lineage
  );
}

function validLookupAttestationShape(value: unknown): value is RetirementLookupAttestation {
  const raw = fields(value, [
    'schema',
    'capability',
    'resource',
    'resourceIdentity',
    'operation',
    'port',
    'mode',
    'transition',
    'holderTransition',
    'preservationWitness',
    'priorHead',
    'priorLineage',
    'newHead',
    'newLineage',
    'witnessAdvance',
    'certainty',
    'digest',
  ]);
  return (
    !!raw &&
    raw.schema === RETIREMENT_LOOKUP_ATTESTATION_SCHEMA &&
    raw.capability === RETIREMENT_LOOKUP_CAPABILITY &&
    identifier(raw.resource) &&
    identifier(raw.resourceIdentity) &&
    RETIREMENT_OPERATION_TYPES.includes(raw.operation as RetirementOperationType) &&
    ['PORT-SESSION', 'PORT-WORKSPACE', 'PORT-DELIVERY', 'PORT-ARTIFACT'].includes(String(raw.port)) &&
    (raw.mode === 'retire' || raw.mode === 'release-pin') &&
    validTransition(raw.transition) &&
    (raw.holderTransition === null || validHolderTransitionShape(raw.holderTransition)) &&
    validWitness(raw.preservationWitness) &&
    digest(raw.priorHead) &&
    digest(raw.priorLineage) &&
    (raw.newHead === null || digest(raw.newHead)) &&
    (raw.newLineage === null || digest(raw.newLineage)) &&
    (raw.witnessAdvance === null || validWitnessAdvanceShape(raw.witnessAdvance)) &&
    ['confirmed-effect', 'confirmed-absence', 'indeterminate'].includes(String(raw.certainty)) &&
    digest(raw.digest) &&
    raw.digest === lookupAttestationDigest(raw)
  );
}

function validHolderTransitionShape(value: unknown): value is RetirementHolderTransition {
  const raw = fields(value, [
    'controller',
    'writer',
    'transaction',
    'event',
    'position',
    'fence',
    'resource',
    'resourceIdentity',
    'operation',
    'committed',
  ]);
  return (
    !!raw &&
    raw.controller === RETIREMENT_CONTROLLER &&
    raw.writer === RETIREMENT_TRANSITION_WRITER &&
    identifier(raw.transaction) &&
    identifier(raw.event) &&
    safeInteger(raw.position) &&
    raw.position >= 0 &&
    validFence(raw.fence) &&
    identifier(raw.resource) &&
    identifier(raw.resourceIdentity) &&
    RETIREMENT_OPERATION_TYPES.includes(raw.operation as RetirementOperationType) &&
    raw.committed === true
  );
}

function validTrustEvidence(
  value: unknown,
  resource: RetirementResource,
  plan: RetirementPlan,
): value is RetirementTrustEvidence {
  const raw = fields(value, [
    'kind',
    'expectedHead',
    'observedHead',
    'expectedLineage',
    'observedLineage',
    'expectedPosition',
    'observedPosition',
    'expectedRoot',
    'observedRoot',
    'observedCurrency',
    'proofDigest',
  ]);
  if (
    !raw ||
    !['witness-fork', 'witness-rollback', 'witness-currency', 'trust-root-compromise'].includes(String(raw.kind)) ||
    !digest(raw.expectedHead) ||
    !digest(raw.observedHead) ||
    !digest(raw.expectedLineage) ||
    !digest(raw.observedLineage) ||
    !safeInteger(raw.expectedPosition) ||
    !safeInteger(raw.observedPosition) ||
    !digest(raw.expectedRoot) ||
    !digest(raw.observedRoot) ||
    !['current', 'stale'].includes(String(raw.observedCurrency)) ||
    !digest(raw.proofDigest) ||
    raw.expectedHead !== resource.witness.head ||
    raw.expectedLineage !== resource.witness.lineage ||
    raw.expectedPosition !== plan.transition.position ||
    raw.expectedRoot !== plan.transition.fence.basis
  )
    return false;
  if (raw.kind === 'witness-fork')
    return raw.observedHead !== raw.expectedHead || raw.observedLineage !== raw.expectedLineage;
  if (raw.kind === 'witness-rollback') return raw.observedPosition < raw.expectedPosition;
  if (raw.kind === 'witness-currency') return raw.observedCurrency === 'stale';
  return raw.observedRoot !== raw.expectedRoot;
}

function parsePlan(value: unknown): RetirementResult<RetirementPlan> {
  const raw = fields(value, [
    'schema',
    'run',
    'story',
    'generation',
    'storyState',
    'runPhase',
    'outcome',
    'dependencyRelease',
    'releaseDigest',
    'transition',
    'bound',
    'resources',
  ]);
  const releases = raw && array(raw.dependencyRelease);
  const resources = raw && array(raw.resources);
  const bound = raw && fields(raw.bound, ['startedAt', 'deadline', 'attempts']);
  const transition = raw && validTransition(raw.transition) ? raw.transition : undefined;
  if (
    !raw ||
    raw.schema !== RETIREMENT_SCHEMA ||
    !identifier(raw.run) ||
    !identifier(raw.story) ||
    !identifier(raw.generation) ||
    typeof raw.storyState !== 'string' ||
    (raw.runPhase !== 'Active' && raw.runPhase !== 'Stopped') ||
    !['Landed', 'Blocked', 'Rejected'].includes(String(raw.outcome)) ||
    !releases ||
    !releases.every(identifier) ||
    !digest(raw.releaseDigest) ||
    !transition ||
    !bound ||
    !safeInteger(bound.startedAt) ||
    !safeInteger(bound.deadline) ||
    bound.deadline < bound.startedAt ||
    !safeInteger(bound.attempts) ||
    bound.attempts < 0 ||
    bound.attempts > RETIREMENT_BOUND.defaultAttempts ||
    !resources ||
    resources.length !== RESOURCE_KINDS.length ||
    resources.some((resource) => !validResource(resource)) ||
    new Set(resources.map((resource) => (resource as RetirementResource).kind)).size !== RESOURCE_KINDS.length ||
    (raw.storyState !== 'Retiring' && raw.runPhase !== 'Stopped')
  )
    return fail('FC-INPUT', 'INVALID_RETIREMENT_PLAN');
  const typedResources = resources as RetirementResource[];
  if (
    typedResources.some(
      (resource) =>
        resource.fence.generation !== raw.generation ||
        resource.outcome !== raw.outcome ||
        !equal(resource.dependencyRelease, releases),
    )
  )
    return fail('FC-SUBJECT', 'RETIREMENT_INVENTORY_BASELINE_MISMATCH');
  const plan: RetirementPlan = {
    schema: RETIREMENT_SCHEMA,
    controller: RETIREMENT_CONTROLLER,
    writer: RETIREMENT_TRANSITION_WRITER,
    run: raw.run as string,
    story: raw.story as string,
    generation: raw.generation as string,
    storyState: raw.storyState as string,
    runPhase: raw.runPhase as 'Active' | 'Stopped',
    baseline: Object.freeze({
      outcome: raw.outcome as RetirementPlan['baseline']['outcome'],
      dependencyRelease: Object.freeze([...releases] as string[]),
      releaseDigest: raw.releaseDigest as string,
    }),
    transition,
    bound: Object.freeze({
      name: RETIREMENT_BOUND.name,
      startedAt: bound.startedAt as number,
      deadline: bound.deadline as number,
      attempts: bound.attempts as number,
      maxAttempts: RETIREMENT_BOUND.defaultAttempts,
      wake: 'EV-WAKE-SETTLEMENT',
      exhaustion: RETIREMENT_BOUND.exhaustion,
    }),
    resources: Object.freeze(
      typedResources.map((resource) =>
        freeze({ ...resource, dependencyRelease: Object.freeze([...resource.dependencyRelease]) }),
      ),
    ),
  };
  return ok(plan);
}

function parseStoredPlan(value: unknown): RetirementResult<RetirementPlan> {
  const raw = fields(value, [
    'schema',
    'controller',
    'writer',
    'run',
    'story',
    'generation',
    'storyState',
    'runPhase',
    'baseline',
    'transition',
    'bound',
    'resources',
  ]);
  const baseline = raw && fields(raw.baseline, ['outcome', 'dependencyRelease', 'releaseDigest']);
  const bound =
    raw && fields(raw.bound, ['name', 'startedAt', 'deadline', 'attempts', 'maxAttempts', 'wake', 'exhaustion']);
  const releases = baseline && array(baseline.dependencyRelease);
  const resources = raw && array(raw.resources);
  if (
    !raw ||
    raw.controller !== RETIREMENT_CONTROLLER ||
    raw.writer !== RETIREMENT_TRANSITION_WRITER ||
    !baseline ||
    !bound ||
    !releases ||
    !resources ||
    bound.name !== RETIREMENT_BOUND.name ||
    bound.maxAttempts !== RETIREMENT_BOUND.defaultAttempts ||
    bound.wake !== 'EV-WAKE-SETTLEMENT' ||
    bound.exhaustion !== RETIREMENT_BOUND.exhaustion
  )
    return fail('FC-TRUST', 'RETIREMENT_SNAPSHOT_PLAN_INVALID');
  return parsePlan({
    schema: raw.schema,
    run: raw.run,
    story: raw.story,
    generation: raw.generation,
    storyState: raw.storyState,
    runPhase: raw.runPhase,
    outcome: baseline.outcome,
    dependencyRelease: releases,
    releaseDigest: baseline.releaseDigest,
    transition: raw.transition,
    bound: {
      startedAt: bound.startedAt,
      deadline: bound.deadline,
      attempts: bound.attempts,
    },
    resources,
  });
}

function validReceipt(value: unknown, plan: RetirementPlan): RetirementResult<PreservationReceipt> {
  const raw = fields(value, [
    'schema',
    'event',
    'resource',
    'resourceIdentity',
    'kind',
    'status',
    'contentDigest',
    'readbackDigest',
    'evidenceKey',
    'evidenceSubject',
    'evidenceClaim',
    'witness',
    'transition',
  ]);
  const resource = raw && plan.resources.find((candidate) => candidate.resourceIdentity === raw.resourceIdentity);
  if (raw && (SECRET_OR_URL.test(String(raw.event)) || SECRET_OR_URL.test(String(raw.resource))))
    return fail('FC-EVIDENCE', 'HOSTILE_PRESERVATION_RECEIPT');
  if (
    raw &&
    raw.witness !== undefined &&
    (!validWitness(raw.witness) || (raw.witness as AnyRecord).currency === 'stale')
  )
    return fail('FC-TRUST', 'PRESERVATION_WITNESS_UNTRUSTED');
  if (
    !raw ||
    !resource ||
    raw.schema !== PRESERVATION_RECEIPT_SCHEMA ||
    !identifier(raw.event) ||
    raw.resource !== resource.resource ||
    raw.resourceIdentity !== resource.resourceIdentity ||
    raw.kind !== (resource.kind === 'workspace' ? 'EV-WORKSPACE-PRESERVED' : 'EV-RESOURCE-PRESERVED') ||
    raw.status !== 'preserved' ||
    !digest(raw.contentDigest) ||
    !digest(raw.readbackDigest) ||
    !digest(raw.evidenceKey) ||
    !identifier(raw.evidenceSubject) ||
    typeof raw.evidenceClaim !== 'string' ||
    raw.evidenceClaim.length === 0 ||
    raw.contentDigest !== raw.readbackDigest ||
    !validWitness(raw.witness) ||
    !equal(raw.witness, resource.witness) ||
    !validTransition(raw.transition) ||
    !equal(raw.transition, plan.transition)
  )
    return fail(
      'FC-EVIDENCE',
      raw?.contentDigest !== raw?.readbackDigest ? 'PRESERVATION_READBACK_MISMATCH' : 'INVALID_PRESERVATION_RECEIPT',
    );
  return ok(raw as unknown as PreservationReceipt);
}

function validObligationEvidence(value: unknown): value is RetirementObligationEvidence {
  const raw = fields(value, ['key', 'subject', 'claim']);
  return !!raw && digest(raw.key) && identifier(raw.subject) && typeof raw.claim === 'string' && raw.claim.length > 0;
}

function retirementObligationOrigin(plan: RetirementPlan, resource: RetirementResource): string | undefined {
  const present = plan.resources.some((candidate) => candidate.resourceIdentity === resource.resourceIdentity);
  const ordinal = RETIREMENT_ORIGIN_ORDINAL[resource.kind];
  return present && ordinal ? `${plan.run}/event/${ordinal}` : undefined;
}

function retirementObligationOrigins(plan: RetirementPlan, resource: RetirementResource): readonly string[] {
  const canonical = retirementObligationOrigin(plan, resource);
  const legacyOrdinal = plan.resources.findIndex(
    (candidate) => candidate.resourceIdentity === resource.resourceIdentity,
  );
  const legacy = legacyOrdinal < 0 ? undefined : `${plan.run}/event/${legacyOrdinal + 2}`;
  return Object.freeze([...new Set([canonical, legacy].filter((origin): origin is string => !!origin))]);
}

function validAllocatedObligation(
  value: unknown,
  plan: RetirementPlan,
  resource: RetirementResource,
  evidence: RetirementObligationEvidence,
): value is ResidualObligation {
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
  const preservation =
    raw &&
    fields(raw.preservationEvidence, [
      'schema',
      'key',
      'subject',
      'claim',
      'manifestDigest',
      'artifactDigest',
      'trustRoot',
      'referenceDigest',
    ]);
  const criteria = raw && fields(raw.criteria, ['schema', 'subject', 'claim', 'digest']);
  return (
    !!raw &&
    raw.schema === OBLIGATION_SCHEMA &&
    identifier(raw.id) &&
    identifier(raw.event) &&
    raw.type === 'SCH-OBLIGATION' &&
    raw.controller === OBLIGATION_CONTROLLER &&
    raw.port === OBLIGATION_PORT &&
    raw.run === plan.run &&
    raw.generation === plan.generation &&
    raw.resource === resource.resource &&
    raw.duty === 'retirement' &&
    retirementObligationOrigins(plan, resource).includes(String(raw.origin)) &&
    typeof raw.reason === 'string' &&
    raw.reason.length > 0 &&
    !!preservation &&
    preservation.schema === 'jig.obligation-evidence.v1' &&
    preservation.key === evidence.key &&
    preservation.subject === evidence.subject &&
    preservation.claim === evidence.claim &&
    digest(preservation.manifestDigest) &&
    digest(preservation.artifactDigest) &&
    digest(preservation.trustRoot) &&
    digest(preservation.referenceDigest) &&
    raw.accountableOwner === 'principal/arye' &&
    !!criteria &&
    criteria.schema === 'jig.obligation-criteria.v1' &&
    criteria.subject === evidence.subject &&
    criteria.claim === evidence.claim &&
    digest(criteria.digest) &&
    raw.bound === OBLIGATION_BOUND.name &&
    raw.startedAt === plan.bound.startedAt &&
    raw.deadline === plan.bound.deadline &&
    digest(raw.policyDigest) &&
    digest(raw.boundDigest) &&
    raw.status === 'open' &&
    raw.exhaustionCount === 0 &&
    raw.lastExhaustionEvent === null &&
    raw.lastExhaustedAt === null &&
    raw.handoffEvent === null &&
    raw.handoffResponder === null &&
    raw.handoffCriteriaDigest === null &&
    raw.handoffReason === null &&
    raw.resolutionEvent === null &&
    raw.resolutionResponder === null &&
    raw.resolutionGrant === null &&
    raw.resolutionCriteriaDigest === null &&
    raw.resolutionEvidence === null
  );
}

function freezeSnapshot(value: RetirementSnapshot): RetirementSnapshot {
  return freeze(value);
}

type RetirementControllerOptions = Readonly<{
  mechanism?: RetirementMechanism;
  obligation?: RetirementObligationAllocator;
  obligationEvidence?: RetirementObligationEvidence;
}>;

type HydratedRetirementControllerOptions = RetirementControllerOptions &
  Readonly<{
    hydrate?: RetirementSnapshot;
  }>;

export function createRetirementController(inputOptions?: RetirementControllerOptions): RetirementController {
  const options =
    inputOptions === undefined
      ? undefined
      : (optionalFields(inputOptions, ['mechanism', 'obligation', 'obligationEvidence']) as
          | RetirementControllerOptions
          | undefined);
  if (inputOptions !== undefined && !options) throw new TypeError('RETIREMENT_FACTORY_OPTIONS_INVALID');
  return createRetirementControllerInternal(options);
}

function createRetirementControllerInternal(options?: HydratedRetirementControllerOptions): RetirementController {
  let planValue: RetirementPlan | undefined = options?.hydrate?.plan;
  const receipts = new Map<string, PreservationReceipt>(
    (options?.hydrate?.receipts ?? []).map((receipt) => [receipt.resourceIdentity, receipt]),
  );
  const authorizations = new Map<string, RetirementAuthorization>(
    (options?.hydrate?.authorizations ?? []).map((authorization) => [
      authorizationKey(authorization.resourceIdentity, authorization.operation),
      authorization,
    ]),
  );
  const pins = new Map<string, RetirementPin>((options?.hydrate?.pins ?? []).map((pin) => [pin.resourceIdentity, pin]));
  const obligations = [...(options?.hydrate?.obligations ?? [])];
  const dutyAttempts = new Map<string, number>(
    (options?.hydrate?.dutyAttempts ?? []).map((entry) => [entry.resourceIdentity, entry.attempts]),
  );
  const journal = [...(options?.hydrate?.journal ?? [])];
  let dispatchFenced = options?.hydrate?.dispatchFenced ?? false;

  const plan = (input: unknown): RetirementResult<RetirementPlan> => {
    const parsed = parsePlan(input);
    if (!parsed.ok) return parsed;
    if (planValue)
      return planDigest(planValue) === planDigest(parsed.value)
        ? ok(planValue)
        : fail('FC-FENCE', 'RETIREMENT_PLAN_REUSE_MISMATCH');
    planValue = parsed.value;
    for (const resource of parsed.value.resources)
      pins.set(
        resource.resourceIdentity,
        freeze({ resourceIdentity: resource.resourceIdentity, status: resource.pin === 'held' ? 'held' : 'released' }),
      );
    journal.push(freeze({ kind: 'plan', digest: planDigest(parsed.value) }));
    return ok(parsed.value);
  };

  const resourceFor = (resourceIdentity: unknown): RetirementResult<RetirementResource> => {
    if (!planValue) return fail('FC-AUTHORITY', 'RETIREMENT_PLAN_REQUIRED');
    const resource = planValue.resources.find((candidate) => candidate.resourceIdentity === resourceIdentity);
    return resource ? ok(resource) : fail('FC-SUBJECT', 'RETIREMENT_RESOURCE_UNKNOWN');
  };

  const recordPreservation = (input: unknown): RetirementResult<PreservationReceipt> => {
    if (!planValue) return fail('FC-AUTHORITY', 'RETIREMENT_PLAN_REQUIRED');
    const receipt = validReceipt(input, planValue);
    if (!receipt.ok) {
      const raw = fields(input, [
        'schema',
        'event',
        'resource',
        'resourceIdentity',
        'kind',
        'status',
        'contentDigest',
        'readbackDigest',
        'witness',
        'transition',
      ]);
      const resource = raw && resourceFor(raw.resourceIdentity);
      if (receipt.error.family === 'FC-TRUST') {
        dispatchFenced = true;
        journal.push(
          freeze({ kind: 'trust-stop', resourceIdentity: raw?.resourceIdentity, reason: receipt.error.code }),
        );
      } else if (receipt.error.family === 'FC-EVIDENCE' && resource?.ok) {
        const obligation = openResidualObligation(resource.value, receipt.error.code);
        if (!obligation.ok) return fail(obligation.error.family, obligation.error.code);
      }
      return receipt;
    }
    if (
      options?.obligationEvidence &&
      (receipt.value.evidenceKey !== options.obligationEvidence.key ||
        receipt.value.evidenceSubject !== options.obligationEvidence.subject ||
        receipt.value.evidenceClaim !== options.obligationEvidence.claim)
    ) {
      const resource = resourceFor(receipt.value.resourceIdentity);
      if (!resource.ok) return resource;
      const obligation = openResidualObligation(resource.value, 'PRESERVATION_EVIDENCE_REFERENCE_MISMATCH');
      if (!obligation.ok) return fail(obligation.error.family, obligation.error.code);
      return fail('FC-EVIDENCE', 'PRESERVATION_EVIDENCE_REFERENCE_MISMATCH');
    }
    const prior = receipts.get(receipt.value.resourceIdentity);
    if (prior) return equal(prior, receipt.value) ? ok(prior) : fail('FC-FENCE', 'PRESERVATION_RECEIPT_REUSE_MISMATCH');
    receipts.set(receipt.value.resourceIdentity, receipt.value);
    journal.push(
      freeze({
        kind: 'preservation',
        resourceIdentity: receipt.value.resourceIdentity,
        digest: receipt.value.contentDigest,
      }),
    );
    return ok(receipt.value);
  };

  const authorize = (input: unknown): RetirementResult<RetirementAuthorization> => {
    if (!planValue) return fail('FC-AUTHORITY', 'RETIREMENT_PLAN_REQUIRED');
    const raw = fields(input, ['resource', 'resourceIdentity', 'operation', 'port', 'mode', 'holderTransition']);
    const resource = raw && resourceFor(raw.resourceIdentity);
    if (
      !raw ||
      !resource?.ok ||
      raw.resource !== resource.value.resource ||
      !RETIREMENT_OPERATION_TYPES.includes(raw.operation as RetirementOperationType) ||
      !['PORT-SESSION', 'PORT-WORKSPACE', 'PORT-DELIVERY', 'PORT-ARTIFACT', 'PORT-LEDGER'].includes(String(raw.port)) ||
      !['retire', 'release-pin'].includes(String(raw.mode))
    )
      return fail('FC-INPUT', 'INVALID_RETIREMENT_AUTHORIZATION');
    const operation = raw.operation as RetirementOperationType;
    const port = raw.port as RetirementPort;
    const mode = raw.mode as 'retire' | 'release-pin';
    if (String(raw.port) === 'PORT-LEDGER') return fail('FC-AUTHORITY', 'LEDGER_NOT_DISPATCH_PORT');
    if (port !== PORTS[operation]) return fail('FC-AUTHORITY', 'RETIREMENT_PORT_OPERATION_MISMATCH');
    if (operation === 'OPC-ART-DISPOSE' && mode !== 'release-pin')
      return fail('FC-AUTHORITY', 'DISPOSE_BYTES_FORBIDDEN');
    if (operation !== 'OPC-ART-DISPOSE' && mode !== 'retire')
      return fail('FC-AUTHORITY', 'RELEASE_PIN_OPERATION_MISMATCH');
    if (!operationsForKind(resource.value.kind).includes(operation))
      return fail('FC-SUBJECT', 'RETIREMENT_OPERATION_RESOURCE_MISMATCH');
    if (operation !== 'OPC-WS-PRESERVE' && !receipts.has(resource.value.resourceIdentity)) {
      const obligation = openResidualObligation(resource.value, 'PRESERVATION_REQUIRED_BEFORE_RETIREMENT');
      if (!obligation.ok) return fail(obligation.error.family, obligation.error.code);
      return fail('FC-EVIDENCE', 'PRESERVATION_REQUIRED_BEFORE_RETIREMENT');
    }
    if (
      (operation === 'OPC-WS-PRESERVE' && raw.holderTransition !== null) ||
      (operation !== 'OPC-WS-PRESERVE' &&
        !validHolderTransition(raw.holderTransition, resource.value, operation, planValue))
    )
      return fail('FC-AUTHORITY', 'HOLDER_RETIREMENT_TRANSITION_REQUIRED');
    if (operation === 'OPC-ART-DISPOSE' && resource.value.pin !== 'held')
      return fail('FC-AUTHORITY', 'ARTIFACT_PIN_NOT_HELD');
    const key = authorizationKey(resource.value.resourceIdentity, operation);
    const prior = authorizations.get(key);
    if (prior)
      return prior.operation === operation && prior.mode === mode
        ? ok(prior)
        : fail('FC-FENCE', 'RETIREMENT_AUTHORIZATION_REUSE_MISMATCH');
    const authorization = freeze({
      controller: RETIREMENT_CONTROLLER as typeof RETIREMENT_CONTROLLER,
      writer: RETIREMENT_TRANSITION_WRITER as typeof RETIREMENT_TRANSITION_WRITER,
      resource: resource.value.resource,
      resourceIdentity: resource.value.resourceIdentity,
      operation,
      port,
      mode,
      transition: planValue.transition,
      holderTransition: raw.holderTransition as RetirementHolderTransition | null,
      status: 'committed' as const,
      witnessAdvance: null,
      lookupAttestation: null,
    });
    authorizations.set(key, authorization);
    journal.push(
      freeze({
        kind: 'retirement-intent',
        resourceIdentity: resource.value.resourceIdentity,
        operation,
        mode,
        transition: planValue.transition,
      }),
    );
    return ok(authorization);
  };

  const openResidualObligation = (
    resource: RetirementResource,
    reason: string,
  ): RetirementResult<ResidualObligation> => {
    if (!planValue) return fail('FC-AUTHORITY', 'RETIREMENT_PLAN_REQUIRED');
    const prior = obligations.find((obligation) => obligation.resource === resource.resource);
    if (prior) return ok(prior);
    if (!options?.obligation) return fail('FC-AUTHORITY', 'RETIREMENT_OBLIGATION_ALLOCATOR_REQUIRED');
    const preservation = receipts.get(resource.resourceIdentity);
    const evidence =
      options.obligationEvidence ??
      (preservation
        ? {
            key: preservation.evidenceKey,
            subject: preservation.evidenceSubject,
            claim: preservation.evidenceClaim,
          }
        : undefined);
    if (!evidence || !validObligationEvidence(evidence))
      return fail('FC-EVIDENCE', 'RETIREMENT_OBLIGATION_EVIDENCE_REQUIRED');
    const origin = retirementObligationOrigin(planValue, resource);
    if (!origin) return fail('FC-TRUST', 'RETIREMENT_OBLIGATION_ORIGIN_UNAVAILABLE');
    const inputValue = freeze({
      run: planValue.run,
      generation: planValue.generation,
      resource: resource.resource,
      duty: 'retirement',
      origin,
      reason,
      preservationEvidence: freeze({ key: evidence.key }),
      accountableOwner: 'principal/arye',
      criteria: freeze({ subject: evidence.subject, claim: evidence.claim }),
      startedAt: planValue.bound.startedAt,
      deadline: planValue.bound.deadline,
      policyDigest: planValue.baseline.releaseDigest,
    });
    const allocated = options.obligation.openAllocated(inputValue);
    if (!allocated.ok) return fail(allocated.error.family, allocated.error.code);
    if (!validAllocatedObligation(allocated.value, planValue, resource, evidence))
      return fail('FC-TRUST', 'RETIREMENT_OBLIGATION_ALLOCATION_FAILED');
    const obligation = allocated.value;
    obligations.push(obligation);
    journal.push(freeze({ kind: 'obligation', obligation }));
    return ok(obligation);
  };

  const requireResidualForDuty = (authorization: RetirementAuthorization, reason: string): RetirementResult<null> => {
    const resource = resourceFor(authorization.resourceIdentity);
    if (!resource.ok) return resource;
    const obligation = openResidualObligation(resource.value, reason);
    return obligation.ok ? ok(null) : obligation;
  };

  const dispatch = (input: unknown): RetirementResult<Readonly<Record<string, unknown>>> => {
    if (dispatchFenced) return fail('FC-TRUST', 'RETIREMENT_DISPATCH_FENCED');
    if (!planValue) return fail('FC-AUTHORITY', 'RETIREMENT_PLAN_REQUIRED');
    const rawWithFault = fields(input, ['resource', 'resourceIdentity', 'operation', 'port', 'mode', 'fault']);
    const rawWithoutFault = fields(input, ['resource', 'resourceIdentity', 'operation', 'port', 'mode']);
    const raw = rawWithFault ?? (rawWithoutFault ? { ...rawWithoutFault, fault: undefined } : undefined);
    if (raw && raw.operation === 'OPC-ART-DISPOSE' && raw.mode !== 'release-pin')
      return fail('FC-AUTHORITY', 'DISPOSE_BYTES_FORBIDDEN');
    const operation = raw?.operation as RetirementOperationType;
    const authorization =
      raw && RETIREMENT_OPERATION_TYPES.includes(operation)
        ? authorizations.get(authorizationKey(String(raw.resourceIdentity), operation))
        : undefined;
    if (
      !raw ||
      !authorization ||
      raw.resource !== authorization.resource ||
      raw.operation !== authorization.operation ||
      raw.port !== authorization.port ||
      raw.mode !== authorization.mode
    )
      return fail('FC-AUTHORITY', 'RETIREMENT_INTENT_NOT_COMMITTED');
    if (authorization.status === 'uncertain' || authorization.status === 'confirmed-absence')
      return fail('FC-EFFECT', 'RECONCILIATION_REQUIRED');
    if (authorization.status === 'confirmed-effect') return fail('FC-EFFECT', 'SEMANTIC_EFFECT_ALREADY_CONFIRMED');
    if (raw.fault === 'uncertain') {
      const resource = resourceFor(authorization.resourceIdentity);
      if (!resource.ok) return resource;
      const obligation = openResidualObligation(
        resource.value,
        'retirement effect is uncertain and requires reconciliation',
      );
      if (!obligation.ok) return obligation;
      const uncertain = freeze({ ...authorization, status: 'uncertain' as const });
      authorizations.set(authorizationKey(authorization.resourceIdentity, authorization.operation), uncertain);
      journal.push(
        freeze({
          kind: 'uncertain',
          operation: authorization.operation,
          resourceIdentity: authorization.resourceIdentity,
        }),
      );
      return fail('FC-EFFECT', 'RETIREMENT_EFFECT_UNCERTAIN');
    }
    if (!options?.mechanism) {
      const obligation = requireResidualForDuty(authorization, 'scripted retirement adapter unavailable');
      if (!obligation.ok) return obligation;
      return fail('FC-MECHANISM', 'SCRIPTED_ADAPTER_UNAVAILABLE');
    }
    let invoked: RetirementResult<Readonly<Record<string, unknown>>>;
    try {
      invoked = options.mechanism.invoke(
        Object.freeze({
          resource: authorization.resource,
          resourceIdentity: authorization.resourceIdentity,
          operation: authorization.operation,
          port: authorization.port,
          mode: authorization.mode,
          controller: RETIREMENT_CONTROLLER,
          transition: authorization.transition,
          holderTransition: authorization.holderTransition,
          preservationReceipt: receipts.get(authorization.resourceIdentity),
          preservationWitness: planValue.resources.find(
            (resource) => resource.resourceIdentity === authorization.resourceIdentity,
          )?.witness,
        }),
      );
    } catch {
      const obligation = requireResidualForDuty(authorization, 'scripted retirement adapter failed');
      if (!obligation.ok) return obligation;
      return fail('FC-MECHANISM', 'SCRIPTED_ADAPTER_FAILURE');
    }
    if (!invoked.ok) {
      const obligation = requireResidualForDuty(authorization, 'scripted retirement adapter returned failure');
      if (!obligation.ok) return obligation;
      return invoked;
    }
    const fact = fields(invoked.value, [
      'resource',
      'resourceIdentity',
      'operation',
      'port',
      'mode',
      'certainty',
      'head',
      'witness',
      'witnessAdvance',
      'lookupAttestation',
    ]);
    const preservation = receipts.get(authorization.resourceIdentity);
    const resource = planValue.resources.find(
      (candidate) => candidate.resourceIdentity === authorization.resourceIdentity,
    );
    const priorWitness = preservation?.witness ?? resource?.witness;
    if (
      !fact ||
      !priorWitness ||
      !resource ||
      fact.resource !== authorization.resource ||
      fact.resourceIdentity !== authorization.resourceIdentity ||
      fact.operation !== authorization.operation ||
      fact.port !== authorization.port ||
      fact.mode !== authorization.mode ||
      fact.certainty !== 'confirmed-effect' ||
      !digest(fact.head) ||
      !digest(fact.witness) ||
      !validWitnessAdvance(fact.witnessAdvance, priorWitness, fact.head, fact.witness) ||
      !validLookupAttestation(fact.lookupAttestation, authorization, resource, priorWitness, 'confirmed-effect') ||
      !equal(fact.head, (fact.lookupAttestation as AnyRecord)?.newHead) ||
      !equal(fact.witness, (fact.lookupAttestation as AnyRecord)?.newLineage) ||
      !equal(fact.witnessAdvance, (fact.lookupAttestation as AnyRecord)?.witnessAdvance)
    ) {
      const obligation = requireResidualForDuty(authorization, 'retirement adapter receipt was invalid');
      if (!obligation.ok) return obligation;
      return fail('FC-MECHANISM', 'INVALID_ADAPTER_RECEIPT');
    }
    const result = freeze({
      ...fact,
      holderTransition: authorization.holderTransition,
    });
    authorizations.set(
      authorizationKey(authorization.resourceIdentity, authorization.operation),
      freeze({
        ...authorization,
        status: 'confirmed-effect' as const,
        witnessAdvance: fact.witnessAdvance,
        lookupAttestation: fact.lookupAttestation,
      }),
    );
    const journalResult = JSON.parse(JSON.stringify(result)) as Readonly<Record<string, unknown>>;
    const journalAttestation = JSON.parse(JSON.stringify(fact.lookupAttestation)) as RetirementLookupAttestation;
    journal.push(
      freeze({
        kind: 'dispatch-result',
        operation: authorization.operation,
        resourceIdentity: authorization.resourceIdentity,
        result: journalResult,
        lookupAttestation: journalAttestation,
        lookupAttestationDigest: journalAttestation.digest,
        lookupHead: journalAttestation.newHead,
        lookupLineage: journalAttestation.newLineage,
        lookupWitnessAdvance: journalAttestation.witnessAdvance
          ? Object.freeze({ ...journalAttestation.witnessAdvance })
          : null,
      }),
    );
    return ok(result);
  };

  const adopt = (input: unknown): RetirementResult<Readonly<Record<string, unknown>>> => {
    if (dispatchFenced) return fail('FC-TRUST', 'RETIREMENT_ADOPTION_FENCED');
    const raw = fields(input, [
      'operation',
      'resourceIdentity',
      'mode',
      'certainty',
      'head',
      'witness',
      'witnessAdvance',
    ]);
    const operation = raw?.operation as RetirementOperationType;
    const authorization =
      raw && RETIREMENT_OPERATION_TYPES.includes(operation)
        ? authorizations.get(authorizationKey(String(raw.resourceIdentity), operation))
        : undefined;
    if (
      !raw ||
      !authorization ||
      raw.operation !== authorization.operation ||
      raw.mode !== authorization.mode ||
      raw.certainty !== 'confirmed-effect' ||
      !digest(raw.head) ||
      !digest(raw.witness) ||
      !authorization.witnessAdvance ||
      !validWitnessAdvanceShape(raw.witnessAdvance) ||
      !equal(raw.witnessAdvance, authorization.witnessAdvance) ||
      raw.head !== authorization.witnessAdvance.head ||
      raw.witness !== authorization.witnessAdvance.lineage
    )
      return fail('FC-TRUST', 'RETIREMENT_RESULT_NOT_WITNESSED');
    if (authorization.status !== 'confirmed-effect') return fail('FC-EFFECT', 'RETIREMENT_EFFECT_NOT_CONFIRMED');
    if (authorization.mode === 'release-pin') {
      pins.set(
        authorization.resourceIdentity,
        freeze({ resourceIdentity: authorization.resourceIdentity, status: 'released' }),
      );
      authorizations.set(
        authorizationKey(authorization.resourceIdentity, authorization.operation),
        freeze({ ...authorization, status: 'confirmed-effect' }),
      );
    }
    journal.push(
      freeze({ kind: 'adopt', operation: authorization.operation, resourceIdentity: authorization.resourceIdentity }),
    );
    return ok(
      freeze({
        operation: authorization.operation,
        resourceIdentity: authorization.resourceIdentity,
        status: 'adopted',
        head: raw.head,
        witness: raw.witness,
      }),
    );
  };

  const reconcile = (
    input: unknown,
  ): RetirementResult<Readonly<{ certainty: 'confirmed-effect' | 'confirmed-absence' | 'indeterminate' }>> => {
    const raw = fields(input, ['operation', 'resourceIdentity', 'mode']);
    const operation = raw?.operation as RetirementOperationType;
    const authorization =
      raw && RETIREMENT_OPERATION_TYPES.includes(operation)
        ? authorizations.get(authorizationKey(String(raw.resourceIdentity), operation))
        : undefined;
    if (!raw || !authorization || raw.operation !== authorization.operation || raw.mode !== authorization.mode)
      return fail('FC-SUBJECT', 'RETIREMENT_RECONCILIATION_BINDING_MISMATCH');
    if (authorization.status !== 'uncertain') return fail('FC-EFFECT', 'RETIREMENT_RECONCILIATION_NOT_UNCERTAIN');
    if (!options?.mechanism?.lookup) return fail('FC-MECHANISM', 'RETIREMENT_LOOKUP_UNAVAILABLE');
    const resource = planValue?.resources.find(
      (candidate) => candidate.resourceIdentity === authorization.resourceIdentity,
    );
    const preservation = receipts.get(authorization.resourceIdentity);
    const priorWitness = preservation?.witness ?? resource?.witness;
    if (!resource || !priorWitness) return fail('FC-TRUST', 'RETIREMENT_LOOKUP_BINDING_INVALID');
    let lookedUp: RetirementResult<Readonly<Record<string, unknown>>>;
    try {
      lookedUp = options.mechanism.lookup(
        Object.freeze({
          resource: authorization.resource,
          resourceIdentity: authorization.resourceIdentity,
          operation: authorization.operation,
          port: authorization.port,
          mode: authorization.mode,
          controller: RETIREMENT_CONTROLLER,
          transition: authorization.transition,
          holderTransition: authorization.holderTransition,
          preservationReceipt: preservation,
          preservationWitness: priorWitness,
          priorStatus: authorization.status,
        }),
      );
    } catch {
      return fail('FC-MECHANISM', 'RETIREMENT_LOOKUP_FAILURE');
    }
    if (!lookedUp.ok) return lookedUp;
    const attestation = fields(lookedUp.value, [
      'schema',
      'capability',
      'resource',
      'resourceIdentity',
      'operation',
      'port',
      'mode',
      'transition',
      'holderTransition',
      'preservationWitness',
      'priorHead',
      'priorLineage',
      'newHead',
      'newLineage',
      'witnessAdvance',
      'certainty',
      'digest',
    ]);
    const certainty = attestation?.certainty;
    if (!['confirmed-effect', 'confirmed-absence', 'indeterminate'].includes(String(certainty)))
      return fail('FC-TRUST', 'INVALID_RETIREMENT_LOOKUP_ATTESTATION');
    const typedCertainty = certainty as 'confirmed-effect' | 'confirmed-absence' | 'indeterminate';
    if (!validLookupAttestation(attestation, authorization, resource, priorWitness, typedCertainty))
      return fail('FC-TRUST', 'INVALID_RETIREMENT_LOOKUP_ATTESTATION');
    if (typedCertainty === 'indeterminate') return fail('FC-EFFECT', 'RETIREMENT_EFFECT_INDETERMINATE');
    if (typedCertainty === 'confirmed-effect') {
      authorizations.set(
        authorizationKey(authorization.resourceIdentity, authorization.operation),
        freeze({
          ...authorization,
          status: 'confirmed-effect' as const,
          witnessAdvance: attestation.witnessAdvance,
          lookupAttestation: attestation,
        }),
      );
    } else {
      authorizations.set(
        authorizationKey(authorization.resourceIdentity, authorization.operation),
        freeze({
          ...authorization,
          status: 'confirmed-absence' as const,
          witnessAdvance: null,
          lookupAttestation: attestation,
        }),
      );
    }
    journal.push(
      freeze({
        kind: 'reconcile',
        operation: authorization.operation,
        resourceIdentity: authorization.resourceIdentity,
        certainty: typedCertainty,
        lookupAttestation: JSON.parse(JSON.stringify(attestation)) as RetirementLookupAttestation,
        lookupAttestationDigest: attestation.digest,
        lookupHead: attestation.newHead,
        lookupLineage: attestation.newLineage,
        lookupWitnessAdvance: attestation.witnessAdvance ? Object.freeze({ ...attestation.witnessAdvance }) : null,
      }),
    );
    return ok({ certainty: typedCertainty });
  };

  const reauthorize = (input: unknown): RetirementResult<RetirementAuthorization> => {
    const raw = fields(input, ['resourceIdentity', 'operation', 'mode']);
    const operation = raw?.operation as RetirementOperationType;
    const prior =
      raw && RETIREMENT_OPERATION_TYPES.includes(operation)
        ? authorizations.get(authorizationKey(String(raw.resourceIdentity), operation))
        : undefined;
    if (
      !raw ||
      !prior ||
      prior.status !== 'confirmed-absence' ||
      raw.operation !== prior.operation ||
      raw.mode !== prior.mode
    )
      return fail('FC-AUTHORITY', 'RETIREMENT_REAUTHORIZATION_REQUIRED');
    const next = freeze({ ...prior, status: 'reauthorized' as const });
    authorizations.set(authorizationKey(prior.resourceIdentity, prior.operation), next);
    journal.push(freeze({ kind: 'reauthorize', resourceIdentity: prior.resourceIdentity, operation: prior.operation }));
    return ok(next);
  };

  const failure = (
    input: unknown,
  ): RetirementResult<Readonly<{ containment: 'park' | 'block' | 'retain'; failure: 'FC-EVIDENCE' }>> => {
    const rawTrust = fields(input, ['phase', 'resourceIdentity', 'reason', 'ownerActionAvailable', 'trustEvidence']);
    const rawOrdinary = fields(input, ['phase', 'resourceIdentity', 'reason', 'ownerActionAvailable']);
    const raw = rawTrust ?? rawOrdinary;
    if (
      !raw ||
      !['preterminal', 'retiring', 'stopped'].includes(String(raw.phase)) ||
      !identifier(raw.resourceIdentity) ||
      typeof raw.reason !== 'string' ||
      raw.reason.length === 0
    )
      return fail('FC-INPUT', 'INVALID_RETIREMENT_FAILURE');
    if (SECRET_OR_URL.test(raw.reason)) return fail('FC-EVIDENCE', 'HOSTILE_RETIREMENT_FAILURE');
    const resource = resourceFor(raw.resourceIdentity);
    if (!resource.ok) return resource;
    if (rawTrust) {
      if (!planValue || !validTrustEvidence(raw.trustEvidence, resource.value, planValue))
        return fail('FC-INPUT', 'INVALID_TRUST_EVIDENCE');
      dispatchFenced = true;
      journal.push(freeze({ kind: 'trust-stop', resourceIdentity: raw.resourceIdentity, reason: raw.reason }));
      return fail('FC-TRUST', 'RETIREMENT_TRUST_COMPROMISED');
    }
    const containment = raw.phase === 'preterminal' ? (raw.ownerActionAvailable === true ? 'park' : 'block') : 'retain';
    if (containment === 'retain') {
      const obligation = openResidualObligation(resource.value, raw.reason);
      if (!obligation.ok) return fail(obligation.error.family, obligation.error.code);
    }
    journal.push(
      freeze({ kind: 'evidence-failure', resourceIdentity: raw.resourceIdentity, containment, reason: raw.reason }),
    );
    return ok({ containment, failure: 'FC-EVIDENCE' });
  };

  const exhaust = (input: unknown): RetirementResult<Readonly<Record<string, unknown>>> => {
    if (!planValue) return fail('FC-AUTHORITY', 'RETIREMENT_PLAN_REQUIRED');
    const raw = fields(input, ['resourceIdentity', 'at']);
    const resource = raw && resourceFor(raw.resourceIdentity);
    if (!raw || !resource?.ok || !safeInteger(raw.at)) return fail('FC-INPUT', 'INVALID_RETIREMENT_EXHAUSTION');
    if (raw.at < planValue.bound.deadline) return fail('FC-BOUND', 'BND_RETIRE_NOT_EXHAUSTED');
    const prior = obligations.find((obligation) => obligation.resource === resource.value.resource);
    if (prior) return ok(prior);
    const attempts = dutyAttempts.get(resource.value.resourceIdentity) ?? planValue.bound.attempts;
    if (attempts >= planValue.bound.maxAttempts) return fail('FC-BOUND', 'BND_RETIRE_EXHAUSTED');
    const obligation = openResidualObligation(resource.value, 'BND-RETIRE exhausted before duty completion');
    if (!obligation.ok) return obligation;
    dutyAttempts.set(resource.value.resourceIdentity, attempts + 1);
    return obligation;
  };

  const snapshot = (): RetirementSnapshot =>
    freezeSnapshot({
      schema: RETIREMENT_SCHEMA,
      plan: planValue as RetirementPlan,
      receipts: Object.freeze([...receipts.values()]),
      authorizations: Object.freeze([...authorizations.values()]),
      pins: Object.freeze([...pins.values()]),
      obligations: Object.freeze([...obligations]),
      dutyAttempts: Object.freeze(
        [...dutyAttempts.entries()].map(([resourceIdentity, attempts]) =>
          Object.freeze({ resourceIdentity, attempts }),
        ),
      ),
      journal: Object.freeze([...journal]),
      dispatchFenced,
      journalDigest: journalDigest(journal),
    });

  return Object.freeze({
    plan,
    recordPreservation,
    authorize,
    dispatch,
    adopt,
    reconcile,
    reauthorize,
    failure,
    exhaust,
    snapshot,
  });
}

export function restoreRetirementController(
  snapshot: unknown,
  options?: Readonly<{
    mechanism?: RetirementMechanism;
    obligation?: RetirementObligationAllocator;
    obligationEvidence?: RetirementObligationEvidence;
  }>,
): RetirementResult<RetirementController> {
  const raw = fields(snapshot, [
    'schema',
    'plan',
    'receipts',
    'authorizations',
    'pins',
    'obligations',
    'dutyAttempts',
    'journal',
    'dispatchFenced',
    'journalDigest',
  ]);
  const receipts = raw && array(raw.receipts);
  const authorizations = raw && array(raw.authorizations);
  const pins = raw && array(raw.pins);
  const obligations = raw && array(raw.obligations);
  const dutyAttempts = raw && array(raw.dutyAttempts);
  const journal = raw && array(raw.journal);
  const parsedPlan = raw && parseStoredPlan(raw.plan);
  const planValue = parsedPlan?.ok ? parsedPlan.value : undefined;
  const receiptValues = receipts as readonly unknown[] | undefined;
  const authorizationValues = authorizations as readonly unknown[] | undefined;
  const pinValues = pins as readonly unknown[] | undefined;
  const dutyAttemptValues = dutyAttempts as readonly unknown[] | undefined;
  const obligationValues = obligations as readonly unknown[] | undefined;
  const journalValues = journal as readonly unknown[] | undefined;
  const unique = (values: readonly unknown[], key: (value: unknown) => string): boolean => {
    const keys = values.map(key);
    return keys.every((value, index) => keys.indexOf(value) === index);
  };
  const validAuthorizationEffects = (authorization: unknown): boolean => {
    const value = authorization as AnyRecord;
    const receipt = receiptValues?.find(
      (candidate) => (candidate as AnyRecord).resourceIdentity === value.resourceIdentity,
    );
    const resource = planValue?.resources.find((candidate) => candidate.resourceIdentity === value.resourceIdentity);
    const priorWitness = receipt
      ? (receipt as PreservationReceipt).witness
      : (resource as RetirementResource | undefined)?.witness;
    if (!resource || !priorWitness || (receipt && !validReceipt(receipt, planValue as RetirementPlan).ok)) return false;
    if (value.status === 'confirmed-absence' || value.status === 'reauthorized')
      return (
        value.witnessAdvance === null &&
        validLookupAttestation(
          value.lookupAttestation,
          value as RetirementAuthorization,
          resource,
          priorWitness,
          'confirmed-absence',
        )
      );
    if (value.status !== 'confirmed-effect') return value.witnessAdvance === null && value.lookupAttestation === null;
    const attestationValid =
      value.lookupAttestation !== null &&
      validLookupAttestation(
        value.lookupAttestation,
        value as RetirementAuthorization,
        resource,
        priorWitness,
        'confirmed-effect',
      );
    const advanceValid =
      value.lookupAttestation !== null &&
      equal(value.witnessAdvance, (value.lookupAttestation as RetirementLookupAttestation).witnessAdvance);
    return attestationValid && advanceValid;
  };
  const revalidateRecoveredLookups = (): RetirementResult<null> => {
    const recovered = authorizationValues?.filter(
      (authorization) => (authorization as AnyRecord).lookupAttestation !== null,
    );
    if (!recovered || recovered.length === 0) return ok(null);
    if (!options?.mechanism?.lookup) return fail('FC-MECHANISM', 'RETIREMENT_LOOKUP_UNAVAILABLE');
    for (const authorizationValue of recovered) {
      const authorization = authorizationValue as RetirementAuthorization;
      const persistedAttestation = authorization.lookupAttestation;
      if (!persistedAttestation) return fail('FC-TRUST', 'RETIREMENT_LOOKUP_JOURNAL_BINDING_INVALID');
      const resource = planValue?.resources.find(
        (candidate) => candidate.resourceIdentity === authorization.resourceIdentity,
      );
      const preservation = receiptValues?.find(
        (candidate) => (candidate as AnyRecord).resourceIdentity === authorization.resourceIdentity,
      ) as PreservationReceipt | undefined;
      const priorWitness = preservation?.witness ?? resource?.witness;
      const records = journalValues?.filter((entry) => {
        const value = entry as AnyRecord;
        return (
          (value.kind === 'reconcile' || value.kind === 'dispatch-result') &&
          value.operation === authorization.operation &&
          value.resourceIdentity === authorization.resourceIdentity
        );
      });
      const record = records?.length === 1 ? (records[0] as AnyRecord) : undefined;
      const parsedRecord =
        record?.kind === 'reconcile'
          ? fields(record, [
              'kind',
              'operation',
              'resourceIdentity',
              'certainty',
              'lookupAttestation',
              'lookupAttestationDigest',
              'lookupHead',
              'lookupLineage',
              'lookupWitnessAdvance',
            ])
          : record?.kind === 'dispatch-result'
            ? fields(record, [
                'kind',
                'operation',
                'resourceIdentity',
                'result',
                'lookupAttestation',
                'lookupAttestationDigest',
                'lookupHead',
                'lookupLineage',
                'lookupWitnessAdvance',
              ])
            : undefined;
      const recorded = record?.lookupAttestation;
      const dispatchResult =
        parsedRecord?.kind === 'dispatch-result'
          ? fields(parsedRecord.result, [
              'resource',
              'resourceIdentity',
              'operation',
              'port',
              'mode',
              'certainty',
              'head',
              'witness',
              'witnessAdvance',
              'lookupAttestation',
              'holderTransition',
            ])
          : undefined;
      const recordedCertainty =
        parsedRecord?.kind === 'dispatch-result' ? dispatchResult?.certainty : parsedRecord?.certainty;
      if (
        !resource ||
        !priorWitness ||
        !parsedRecord ||
        (parsedRecord.kind === 'reconcile' &&
          (record?.operation !== authorization.operation ||
            record?.resourceIdentity !== authorization.resourceIdentity)) ||
        (parsedRecord.kind === 'dispatch-result' &&
          (!dispatchResult ||
            dispatchResult.resource !== authorization.resource ||
            dispatchResult.resourceIdentity !== authorization.resourceIdentity ||
            dispatchResult.operation !== authorization.operation ||
            dispatchResult.port !== authorization.port ||
            dispatchResult.mode !== authorization.mode ||
            dispatchResult.certainty !== 'confirmed-effect' ||
            !equal(dispatchResult.lookupAttestation, recorded) ||
            !equal(dispatchResult.head, persistedAttestation.newHead) ||
            !equal(dispatchResult.witness, persistedAttestation.newLineage) ||
            !equal(dispatchResult.witnessAdvance, persistedAttestation.witnessAdvance) ||
            !equal(dispatchResult.holderTransition, authorization.holderTransition))) ||
        !validLookupAttestation(
          recorded,
          authorization,
          resource,
          priorWitness,
          recordedCertainty as 'confirmed-effect' | 'confirmed-absence' | 'indeterminate',
        ) ||
        !equal(recorded, authorization.lookupAttestation) ||
        parsedRecord.lookupAttestationDigest !== persistedAttestation.digest ||
        parsedRecord.lookupHead !== persistedAttestation.newHead ||
        parsedRecord.lookupLineage !== persistedAttestation.newLineage ||
        !equal(parsedRecord.lookupWitnessAdvance, persistedAttestation.witnessAdvance)
      )
        return fail('FC-TRUST', 'RETIREMENT_LOOKUP_JOURNAL_BINDING_INVALID');
      let lookedUp: RetirementResult<Readonly<Record<string, unknown>>>;
      try {
        lookedUp = options.mechanism.lookup(
          Object.freeze({
            resource: authorization.resource,
            resourceIdentity: authorization.resourceIdentity,
            operation: authorization.operation,
            port: authorization.port,
            mode: authorization.mode,
            controller: RETIREMENT_CONTROLLER,
            transition: authorization.transition,
            holderTransition: authorization.holderTransition,
            preservationReceipt: preservation,
            preservationWitness: priorWitness,
            priorStatus: parsedRecord.kind === 'dispatch-result' ? 'committed' : 'uncertain',
          }),
        );
      } catch {
        return fail('FC-MECHANISM', 'RETIREMENT_LOOKUP_FAILURE');
      }
      if (!lookedUp.ok) return fail('FC-MECHANISM', 'RETIREMENT_LOOKUP_REVALIDATION_FAILED');
      const attestation = fields(lookedUp.value, [
        'schema',
        'capability',
        'resource',
        'resourceIdentity',
        'operation',
        'port',
        'mode',
        'transition',
        'holderTransition',
        'preservationWitness',
        'priorHead',
        'priorLineage',
        'newHead',
        'newLineage',
        'witnessAdvance',
        'certainty',
        'digest',
      ]);
      if (
        !attestation ||
        !validLookupAttestation(attestation, authorization, resource, priorWitness, persistedAttestation.certainty) ||
        !equal(attestation, recorded)
      )
        return fail('FC-TRUST', 'RETIREMENT_LOOKUP_REVALIDATION_FAILED');
    }
    return ok(null);
  };
  if (
    !raw ||
    raw.schema !== RETIREMENT_SCHEMA ||
    !planValue ||
    !receiptValues ||
    !authorizationValues ||
    !pinValues ||
    !obligationValues ||
    !journalValues ||
    !dutyAttemptValues ||
    typeof raw.dispatchFenced !== 'boolean' ||
    journalValues.some((entry) => !safeRecord(entry)) ||
    !digest(raw.journalDigest) ||
    raw.journalDigest !== journalDigest(journalValues as readonly Readonly<Record<string, unknown>>[]) ||
    receiptValues.some((receipt) => !validReceipt(receipt, planValue).ok) ||
    !unique(receiptValues, (receipt) => String((receipt as AnyRecord).resourceIdentity)) ||
    authorizationValues.some((authorization) => !validAuthorization(authorization, planValue)) ||
    authorizationValues.some((authorization) => !validAuthorizationEffects(authorization)) ||
    !unique(authorizationValues, (authorization) =>
      authorizationKey(
        String((authorization as AnyRecord).resourceIdentity),
        (authorization as AnyRecord).operation as RetirementOperationType,
      ),
    ) ||
    pinValues.length !== planValue.resources.length ||
    pinValues.some((pin) => !validPin(pin, planValue)) ||
    !unique(pinValues, (pin) => String((pin as AnyRecord).resourceIdentity)) ||
    !planValue.resources.every((resource) =>
      pinValues.some((pin) => (pin as AnyRecord).resourceIdentity === resource.resourceIdentity),
    ) ||
    dutyAttemptValues.some((attempt) => !validDutyAttempts(attempt, planValue)) ||
    !unique(dutyAttemptValues, (attempt) => String((attempt as AnyRecord).resourceIdentity)) ||
    obligationValues.some((obligation) => {
      const value = obligation as AnyRecord;
      const resource = planValue?.resources.find((candidate) => candidate.resource === value.resource);
      const receipt = receiptValues?.find((candidate) => (candidate as AnyRecord).resource === value.resource) as
        | PreservationReceipt
        | undefined;
      const evidence =
        options?.obligationEvidence ??
        (receipt
          ? {
              key: receipt.evidenceKey,
              subject: receipt.evidenceSubject,
              claim: receipt.evidenceClaim,
            }
          : undefined);
      return (
        !resource ||
        !evidence ||
        !validObligationEvidence(evidence) ||
        !validAllocatedObligation(value, planValue, resource, evidence)
      );
    }) ||
    !unique(obligationValues, (obligation) => String((obligation as AnyRecord).resource))
  )
    return fail('FC-TRUST', 'RETIREMENT_SNAPSHOT_INVALID');
  const revalidated = revalidateRecoveredLookups();
  if (!revalidated.ok) return revalidated;
  const controller = createRetirementControllerInternal({
    ...options,
    hydrate: {
      ...raw,
      plan: planValue,
    } as unknown as RetirementSnapshot,
  });
  if (!controller.snapshot().plan || planDigest(controller.snapshot().plan) !== planDigest(planValue))
    return fail('FC-TRUST', 'RETIREMENT_SNAPSHOT_PLAN_INVALID');
  return ok(controller);
}
