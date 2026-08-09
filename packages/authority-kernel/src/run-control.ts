import { type CanonicalJson, parseIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';
import type { RunPhase, StoryState } from './index.js';

/** Private GF-037 semantics. This contract has no provider, dispatch, or settlement-duty authority. */
export const RUN_CONTROL_CONTRACT_VERSION = 'jig.run-control.v1';
export const RULE_SURFACE_SCHEMA = 'jig.sch-rule-surface.v1';
export const RULE_SURFACE_EVENT_SCHEMA = 'jig.rule-surface-event.v1';
export const RUN_CONTROL_EVENT_SCHEMA = 'jig.run-control-event.v1';
export const SETTLEMENT_SCHEMA = 'jig.sch-settlement.v1';
export const RUN_CONTROL_CONTROLLER = 'RT-CONTROLLER';
export const RUN_CONTROL_EVENTS = Object.freeze([
  'EV-RULE-SURFACE-TOUCHED',
  'EV-RUN-SUSPEND-DECISION',
  'EV-RUN-RESUME-DECISION',
  'EV-RUN-TERMINAL-STOP-DECISION',
  'EV-RECOVERY-OBSERVATION',
] as const);

export type RunControlEvent = (typeof RUN_CONTROL_EVENTS)[number];
export type RunControlPhase = Extract<
  RunPhase,
  'Active' | 'Parked' | 'Interrupted / Recovering' | 'Suspended' | 'Settling' | 'Stopped'
>;
export type RunControlFailureFamily = 'FC-INPUT' | 'FC-RULES' | 'FC-AUTHORITY' | 'FC-FENCE' | 'FC-SUBJECT' | 'FC-TRUST';
export type RunControlFailure = Readonly<{ family: RunControlFailureFamily; code: string }>;
export type RunControlResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: RunControlFailure }>;

export type WitnessedAppendBasis = Readonly<{
  position: number;
  transaction: string;
  recordDigest: string;
  witnessDigest: string;
  witnessed: true;
}>;

export type RuleSurfaceBasis = Readonly<{
  schema: typeof RULE_SURFACE_SCHEMA;
  run: string;
  basisDigest: string;
  ruleSurfaceDigest: string;
  candidateDigest: string;
  generation: string;
  approved: true;
}>;

export type RunControlGrant = Readonly<{
  principal: string;
  grant: string;
  run: string;
  basisDigest: string;
  generation: string;
  scope: 'run-control';
}>;

export type StorySnapshot = Readonly<{
  story: string;
  state: StoryState;
  businessDigest: string;
  basisDigest: string;
}>;

export type FinalizationFence = Readonly<{
  story: string;
  operation: string;
  basisDigest: string;
  generation: string;
  status: 'retained-fenced';
}>;

export type SettlementNextIntent = Readonly<{
  kind:
    | 'preserve-story'
    | 'reconcile-operation'
    | 'close-finalization'
    | 'reconcile-session'
    | 'reconcile-review'
    | 'reconcile-workspace'
    | 'release-authority'
    | 'reconcile-artifact'
    | 'resolve-obligation';
  duty: string;
  basisDigest: string;
  authorizationBasis: string;
}>;

export type SettlementDuty = Readonly<{
  id: string;
  kind: SettlementNextIntent['kind'];
  story: string | null;
  ordinal: number;
  basisDigest: string;
  status: 'open';
  nextIntent: SettlementNextIntent;
}>;

export type SettlementOverlay = Readonly<{
  schema: typeof SETTLEMENT_SCHEMA;
  id: string;
  run: string;
  status: 'opened';
  openedBy: 'EV-RUN-TERMINAL-STOP-DECISION' | 'EV-RECOVERY-OBSERVATION';
  openedAtPosition: number;
  preservedStories: readonly StorySnapshot[];
  retainedFences: readonly FinalizationFence[];
  duties: readonly SettlementDuty[];
  remainingDutyDigest: string;
  nextIntents: readonly SettlementNextIntent[];
  advancedDuties: 0;
  completedDuties: 0;
}>;

export type RunControlSnapshot = Readonly<{
  schema: typeof RUN_CONTROL_CONTRACT_VERSION;
  controller: typeof RUN_CONTROL_CONTROLLER;
  run: string;
  phase: RunControlPhase;
  generation: string;
  basisDigest: string;
  frozenRuleSurface: RuleSurfaceBasis;
  currentRuleSurfaceDigest: string;
  ruleReapprovalRequired: boolean;
  candidateAuthority: 'valid' | 'invalidated';
  stories: readonly StorySnapshot[];
  finalizationFences: readonly FinalizationFence[];
  currentGrant: RunControlGrant;
  dispatchEnabled: false | true;
  finalizationAuthorityFenced: boolean;
  externalFence: Readonly<{ kind: 'FC-TRUST'; reason: string }> | null;
  settlement: SettlementOverlay | null;
}>;

export type RunControlCommit = Readonly<{
  requestKey: string;
  requestDigest: string;
  event: RunControlEvent;
  position: number;
  transaction: string;
  contentDigest: string;
  content: CanonicalJson;
}>;

export type RunControlLedger = Readonly<{
  append(
    input: Readonly<{
      requestKey: string;
      requestDigest?: string;
      expectedPosition: number;
      transaction: string;
      content: CanonicalJson;
    }>,
  ): RunControlResult<RunControlCommit>;
  readback(input: Readonly<{ requestKey: string }>): RunControlResult<RunControlCommit | null>;
  records(): readonly RunControlCommit[];
}>;

export type RunControlController = Readonly<{
  touchRuleSurface(input: unknown): RunControlResult<RunControlSnapshot>;
  suspend(input: unknown): RunControlResult<RunControlSnapshot>;
  resume(input: unknown): RunControlResult<RunControlSnapshot>;
  terminalStop(input: unknown): RunControlResult<RunControlSnapshot>;
  snapshot(): RunControlSnapshot;
  events(): readonly RunControlCommit[];
}>;

type ControllerInput = Readonly<{
  run: string;
  phase: RunControlPhase;
  generation: string;
  basisDigest: string;
  frozenRuleSurface: RuleSurfaceBasis;
  stories: readonly StorySnapshot[];
  finalizationFences: readonly FinalizationFence[];
  settlementDuties: readonly SettlementDuty[];
  currentGrant: RunControlGrant;
  ledger: RunControlLedger;
}>;

const DIGEST = /^[0-9a-f]{64}$/u;
const TEXT = /^[a-zA-Z0-9][a-zA-Z0-9._:/|+-]{0,255}$/u;
const STORY_STATES = new Set<StoryState>([
  'Pending',
  'Eligible',
  'Preparing',
  'Implementing',
  'Reviewing',
  'Reworking',
  'Accepted',
  'Waiting',
  'Finalizing',
  'Refreshing',
  'RefreshPark',
  'Landed',
  'Blocked',
  'Rejected',
  'NotRun',
  'Retiring',
  'Closed',
]);
const fail = <T = never>(family: RunControlFailureFamily, code: string): RunControlResult<T> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });
const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as object)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
};
const ok = <T>(value: T): RunControlResult<T> => Object.freeze({ ok: true, value: deepFreeze(value) });

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
    const keys = Object.keys(descriptors).sort();
    if (keys.join('\0') !== [...names].sort().join('\0')) return undefined;
    if (!Object.values(descriptors).every((descriptor) => 'value' in descriptor)) return undefined;
    return Object.fromEntries(names.map((name) => [name, descriptors[name]?.value]));
  } catch {
    return undefined;
  }
}

function arrayValues(value: unknown): readonly unknown[] | undefined {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value) as Record<string, PropertyDescriptor>;
    const length = descriptors.length;
    if (!length || !('value' in length) || !Number.isSafeInteger(length.value) || length.value < 0) return undefined;
    if (Object.keys(descriptors).length !== length.value + 1) return undefined;
    const entries: unknown[] = [];
    for (let index = 0; index < length.value; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !('value' in descriptor)) return undefined;
      entries.push(descriptor.value);
    }
    return Object.freeze(entries);
  } catch {
    return undefined;
  }
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.normalize('NFC') === value && TEXT.test(value);
}
function digest(value: unknown): value is string {
  return typeof value === 'string' && DIGEST.test(value);
}
function position(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function ordinal(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}
function identity(kind: Parameters<typeof parseIdentity>[0], value: unknown): value is string {
  return typeof value === 'string' && parseIdentity(kind, value).ok;
}
function hash(domain: string, value: unknown): string | undefined {
  try {
    const result = stageDigest({ domain, excludePaths: [], value: value as CanonicalJson });
    return result.ok ? result.value.digest : undefined;
  } catch {
    return undefined;
  }
}
function same(left: unknown, right: unknown): boolean {
  const a = hash('RUN-CONTROL-COMPARE', left);
  const b = hash('RUN-CONTROL-COMPARE', right);
  return a !== undefined && a === b;
}
function generationNumber(value: string): number | undefined {
  const found = /\/gen\/([1-9][0-9]*)\|/u.exec(value)?.[1];
  return found === undefined ? undefined : Number(found);
}
function sorted<T extends { ordinal: number; id: string }>(entries: readonly T[]): readonly T[] {
  return Object.freeze(
    [...entries].sort(
      (left, right) => left.ordinal - right.ordinal || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    ),
  );
}
function parseWitness(value: unknown): WitnessedAppendBasis | undefined {
  const raw = ownFields(value, ['position', 'transaction', 'recordDigest', 'witnessDigest', 'witnessed']);
  return raw &&
    position(raw.position) &&
    identity('ID-TXN', raw.transaction) &&
    digest(raw.recordDigest) &&
    raw.recordDigest === raw.witnessDigest &&
    raw.witnessed === true
    ? (raw as unknown as WitnessedAppendBasis)
    : undefined;
}
function witnessFor(value: WitnessedAppendBasis, run: string, generation: string, basisDigest: string): boolean {
  return value.transaction.startsWith(`${run}/txn/`) && value.transaction.includes(`/${generation}|${basisDigest}`);
}

function witnessedRecord(
  ledger: RunControlLedger,
  value: WitnessedAppendBasis,
  run: string,
  generation: string,
  basisDigest: string,
): RunControlCommit | undefined {
  if (!witnessFor(value, run, generation, basisDigest)) return undefined;
  try {
    const records = ledger.records();
    if (!Array.isArray(records)) return undefined;
    const record = records[value.position];
    if (!record) return undefined;
    const fields = ownFields(record, [
      'requestKey',
      'requestDigest',
      'event',
      'position',
      'transaction',
      'contentDigest',
      'content',
    ]);
    const content =
      fields &&
      ownFields(fields.content, [
        'schema',
        'controller',
        'requestKey',
        'event',
        'position',
        'transaction',
        'before',
        'after',
        'payload',
      ]);
    const valid = !!(
      fields &&
      content &&
      fields.position === value.position &&
      digest(fields.requestDigest) &&
      fields.requestDigest === hash('RUN-CONTROL-REQUEST', content.payload) &&
      fields.transaction === value.transaction &&
      fields.contentDigest === value.recordDigest &&
      value.recordDigest === value.witnessDigest &&
      content.position === value.position &&
      content.transaction === value.transaction &&
      hash('RUN-CONTROL-EVENT', fields.content) === value.recordDigest
    );
    return valid ? (fields as unknown as RunControlCommit) : undefined;
  } catch {
    return undefined;
  }
}

function currentWitnessedRecord(
  ledger: RunControlLedger,
  value: WitnessedAppendBasis,
  run: string,
  generation: string,
  basisDigest: string,
): RunControlCommit | undefined {
  try {
    const records = ledger.records();
    if (!Array.isArray(records) || value.position !== records.length - 1) return undefined;
    return witnessedRecord(ledger, value, run, generation, basisDigest);
  } catch {
    return undefined;
  }
}

function currentPrerequisiteRecord(
  ledger: RunControlLedger,
  value: WitnessedAppendBasis,
  run: string,
  generation: string,
  basisDigest: string,
  forbiddenEvent: RunControlEvent,
): RunControlCommit | undefined {
  const record = currentWitnessedRecord(ledger, value, run, generation, basisDigest);
  return record && record.event !== forbiddenEvent ? record : undefined;
}

function recordPayloadFields(record: RunControlCommit, names: readonly string[]): Record<string, unknown> | undefined {
  try {
    const content = ownFields(record.content, [
      'schema',
      'controller',
      'requestKey',
      'event',
      'position',
      'transaction',
      'before',
      'after',
      'payload',
    ]);
    return content ? ownFields(content.payload, names) : undefined;
  } catch {
    return undefined;
  }
}
function parseGrant(value: unknown, run: string, basisDigest: string, generation: string): RunControlGrant | undefined {
  const raw = ownFields(value, ['principal', 'grant', 'run', 'basisDigest', 'generation', 'scope']);
  return raw &&
    identity('ID-PRINCIPAL', raw.principal) &&
    identity('ID-GRANT', raw.grant) &&
    raw.run === run &&
    raw.basisDigest === basisDigest &&
    raw.generation === generation &&
    raw.scope === 'run-control'
    ? (raw as unknown as RunControlGrant)
    : undefined;
}
function parseStory(value: unknown, run: string, basisDigest: string): StorySnapshot | undefined {
  const raw = ownFields(value, ['story', 'state', 'businessDigest', 'basisDigest']);
  return raw &&
    identity('ID-STORY', raw.story) &&
    raw.story.startsWith(`${run}/story/`) &&
    typeof raw.state === 'string' &&
    STORY_STATES.has(raw.state as StoryState) &&
    digest(raw.businessDigest) &&
    raw.basisDigest === basisDigest
    ? (raw as unknown as StorySnapshot)
    : undefined;
}
function parseFence(
  value: unknown,
  run: string,
  basisDigest: string,
  generation: string,
): FinalizationFence | undefined {
  const raw = ownFields(value, ['story', 'operation', 'basisDigest', 'generation', 'status']);
  return raw &&
    identity('ID-STORY', raw.story) &&
    raw.story.startsWith(`${run}/story/`) &&
    identity('ID-OP', raw.operation) &&
    raw.basisDigest === basisDigest &&
    raw.generation === generation &&
    raw.status === 'retained-fenced'
    ? (raw as unknown as FinalizationFence)
    : undefined;
}
function parseNextIntent(value: unknown, _run: string, basisDigest: string): SettlementNextIntent | undefined {
  const raw = ownFields(value, ['kind', 'duty', 'basisDigest', 'authorizationBasis']);
  return raw &&
    typeof raw.kind === 'string' &&
    [
      'preserve-story',
      'reconcile-operation',
      'close-finalization',
      'reconcile-session',
      'reconcile-review',
      'reconcile-workspace',
      'release-authority',
      'reconcile-artifact',
      'resolve-obligation',
    ].includes(raw.kind) &&
    text(raw.duty) &&
    raw.basisDigest === basisDigest &&
    text(raw.authorizationBasis)
    ? (raw as unknown as SettlementNextIntent)
    : undefined;
}
function parseDuty(value: unknown, run: string, basisDigest: string): SettlementDuty | undefined {
  const raw = ownFields(value, ['id', 'kind', 'story', 'ordinal', 'basisDigest', 'status', 'nextIntent']);
  const next = raw && parseNextIntent(raw.nextIntent, run, basisDigest);
  return raw &&
    identity('ID-SETTLEMENT', `${run}/settlement/terminal-stop`) &&
    text(raw.id) &&
    typeof raw.kind === 'string' &&
    [
      'preserve-story',
      'reconcile-operation',
      'close-finalization',
      'reconcile-session',
      'reconcile-review',
      'reconcile-workspace',
      'release-authority',
      'reconcile-artifact',
      'resolve-obligation',
    ].includes(raw.kind) &&
    (raw.story === null || (identity('ID-STORY', raw.story) && raw.story.startsWith(`${run}/story/`))) &&
    ordinal(raw.ordinal) &&
    raw.basisDigest === basisDigest &&
    raw.status === 'open' &&
    next !== undefined &&
    next.duty === raw.id
    ? deepFreeze({ ...raw, nextIntent: next } as unknown as SettlementDuty)
    : undefined;
}

const SETTLEMENT_GLOBAL_DUTIES = Object.freeze([
  'reconcile-session',
  'reconcile-review',
  'reconcile-workspace',
  'release-authority',
  'reconcile-artifact',
  'resolve-obligation',
] as const);

function settlementAuthorizationBasis(
  run: string,
  basisDigest: string,
  kind: SettlementNextIntent['kind'],
  subject: string,
): string | undefined {
  return hash('SETTLEMENT-AUTHORIZATION', { run, basisDigest, kind, subject });
}

export function createSettlementDuties(
  run: string,
  basisDigest: string,
  stories: readonly StorySnapshot[],
  fences: readonly FinalizationFence[],
): readonly SettlementDuty[] {
  const entries: SettlementDuty[] = [];
  const add = (kind: SettlementNextIntent['kind'], story: string | null, subject: string): void => {
    const id = `${run}/settlement/duty/${kind}/${subject}`;
    const authorizationBasis = settlementAuthorizationBasis(run, basisDigest, kind, subject);
    if (!authorizationBasis) return;
    entries.push({
      id,
      kind,
      story,
      ordinal: entries.length + 1,
      basisDigest,
      status: 'open',
      nextIntent: { kind, duty: id, basisDigest, authorizationBasis },
    });
  };
  for (const item of [...stories].sort((left, right) =>
    left.story < right.story ? -1 : left.story > right.story ? 1 : 0,
  ))
    add('preserve-story', item.story, item.story);
  for (const fence of [...fences].sort((left, right) =>
    left.operation < right.operation ? -1 : left.operation > right.operation ? 1 : 0,
  )) {
    add('reconcile-operation', fence.story, fence.operation);
    add('close-finalization', fence.story, fence.operation);
  }
  for (const kind of SETTLEMENT_GLOBAL_DUTIES) add(kind, null, run);
  return Object.freeze(entries.map((entry) => deepFreeze(entry)));
}
function parseRuleBasis(
  value: unknown,
  run: string,
  basisDigest: string,
  generation: string,
): RuleSurfaceBasis | undefined {
  const raw = ownFields(value, [
    'schema',
    'run',
    'basisDigest',
    'ruleSurfaceDigest',
    'candidateDigest',
    'generation',
    'approved',
  ]);
  return raw &&
    raw.schema === RULE_SURFACE_SCHEMA &&
    raw.run === run &&
    raw.basisDigest === basisDigest &&
    digest(raw.ruleSurfaceDigest) &&
    digest(raw.candidateDigest) &&
    raw.generation === generation &&
    raw.approved === true
    ? (raw as unknown as RuleSurfaceBasis)
    : undefined;
}

function parseControllerInput(value: unknown): RunControlResult<ControllerInput> {
  const raw = ownFields(value, [
    'run',
    'phase',
    'generation',
    'basisDigest',
    'frozenRuleSurface',
    'stories',
    'finalizationFences',
    'settlementDuties',
    'currentGrant',
    'ledger',
  ]);
  const stories = raw && arrayValues(raw.stories);
  const fences = raw && arrayValues(raw.finalizationFences);
  const duties = raw && arrayValues(raw.settlementDuties);
  if (
    !raw ||
    !identity('ID-RUN', raw.run) ||
    !['Active', 'Parked', 'Interrupted / Recovering', 'Suspended', 'Settling', 'Stopped'].includes(String(raw.phase)) ||
    !identity('ID-GEN', raw.generation) ||
    !digest(raw.basisDigest) ||
    !stories ||
    !fences ||
    !duties
  )
    return fail('FC-INPUT', 'INVALID_RUN_CONTROL_INPUT');
  const rule = parseRuleBasis(
    raw.frozenRuleSurface,
    raw.run as string,
    raw.basisDigest as string,
    raw.generation as string,
  );
  const parsedStories = stories.map((entry) => parseStory(entry, raw.run as string, raw.basisDigest as string));
  const parsedFences = fences.map((entry) =>
    parseFence(entry, raw.run as string, raw.basisDigest as string, raw.generation as string),
  );
  const parsedDuties = duties.map((entry) => parseDuty(entry, raw.run as string, raw.basisDigest as string));
  const grant = parseGrant(raw.currentGrant, raw.run as string, raw.basisDigest as string, raw.generation as string);
  if (!rule) return fail('FC-INPUT', 'INVALID_RULE_SURFACE_BASIS');
  if (parsedStories.some((entry) => !entry)) return fail('FC-INPUT', 'INVALID_STORY_SNAPSHOT');
  if (parsedFences.some((entry) => !entry)) return fail('FC-INPUT', 'INVALID_FINALIZATION_FENCE');
  if (parsedDuties.some((entry) => !entry)) return fail('FC-INPUT', 'INVALID_SETTLEMENT_DUTY');
  if (!grant) return fail('FC-INPUT', 'INVALID_CURRENT_GRANT');
  try {
    if (
      typeof raw.ledger !== 'object' ||
      raw.ledger === null ||
      typeof (raw.ledger as RunControlLedger).append !== 'function' ||
      typeof (raw.ledger as RunControlLedger).readback !== 'function' ||
      typeof (raw.ledger as RunControlLedger).records !== 'function'
    )
      return fail('FC-INPUT', 'INVALID_LEDGER');
  } catch {
    return fail('FC-INPUT', 'INVALID_LEDGER');
  }
  const storyValues = parsedStories as StorySnapshot[];
  const fenceValues = parsedFences as FinalizationFence[];
  const dutyValues = parsedDuties as SettlementDuty[];
  if (fenceValues.some((fence) => !storyValues.some((story) => story.story === fence.story)))
    return fail('FC-SUBJECT', 'FINALIZATION_FENCE_STORY_UNKNOWN');
  if (
    new Set(storyValues.map((entry) => entry.story)).size !== storyValues.length ||
    new Set(fenceValues.map((entry) => entry.operation)).size !== fenceValues.length ||
    new Set(dutyValues.map((entry) => entry.id)).size !== dutyValues.length
  )
    return fail('FC-SUBJECT', 'DUPLICATE_RUN_CONTROL_SUBJECT');
  const expectedDuties = createSettlementDuties(raw.run as string, raw.basisDigest as string, storyValues, fenceValues);
  if (expectedDuties.length !== dutyValues.length || !same(sorted(dutyValues), expectedDuties))
    return fail('FC-AUTHORITY', 'INCOMPLETE_SETTLEMENT_DUTY_INVENTORY');
  return ok({
    run: raw.run as string,
    phase: raw.phase as RunControlPhase,
    generation: raw.generation as string,
    basisDigest: raw.basisDigest as string,
    frozenRuleSurface: rule,
    stories: Object.freeze(storyValues),
    finalizationFences: Object.freeze(fenceValues),
    settlementDuties: Object.freeze(dutyValues),
    currentGrant: grant,
    ledger: raw.ledger as RunControlLedger,
  });
}

function appendCommit(
  ledger: RunControlLedger,
  requestKey: string,
  requestDigest: string,
  expectedPosition: number,
  transaction: string,
  content: CanonicalJson,
): RunControlResult<RunControlCommit> {
  try {
    const existing = ledger.readback({ requestKey });
    if (existing.ok && existing.value !== null) return ok(existing.value);
    const appended = ledger.append({ requestKey, requestDigest, expectedPosition, transaction, content });
    if (appended.ok) return appended;
    const recovered = ledger.readback({ requestKey });
    return recovered.ok && recovered.value !== null ? ok(recovered.value) : fail('FC-TRUST', 'ATOMIC_APPEND_UNCERTAIN');
  } catch {
    return fail('FC-TRUST', 'ATOMIC_APPEND_UNCERTAIN');
  }
}

function eventContent(
  requestKey: string,
  event: RunControlEvent,
  position: number,
  transaction: string,
  before: RunControlSnapshot,
  after: RunControlSnapshot,
  payload: CanonicalJson,
): CanonicalJson | undefined {
  const content = {
    schema: RUN_CONTROL_EVENT_SCHEMA,
    controller: RUN_CONTROL_CONTROLLER,
    requestKey,
    event,
    position,
    transaction,
    before,
    after,
    payload,
  };
  return hash('RUN-CONTROL-EVENT', content) ? (content as unknown as CanonicalJson) : undefined;
}

export function createRunControlController(value: unknown): RunControlResult<RunControlController> {
  const parsed = parseControllerInput(value);
  if (!parsed.ok) return parsed;
  const input = parsed.value;
  let phase = input.phase;
  let generation = input.generation;
  let currentRuleSurfaceDigest = input.frozenRuleSurface.ruleSurfaceDigest;
  let ruleReapprovalRequired = false;
  let candidateAuthority: 'valid' | 'invalidated' = 'valid';
  let currentGrant = input.currentGrant;
  let externalFence: Readonly<{ kind: 'FC-TRUST'; reason: string }> | null = null;
  let settlement: SettlementOverlay | null = null;
  let initialRecords: readonly RunControlCommit[];
  try {
    const records = input.ledger.records();
    if (
      !Array.isArray(records) ||
      !records.every((record) => {
        const fields = ownFields(record, [
          'requestKey',
          'requestDigest',
          'event',
          'position',
          'transaction',
          'contentDigest',
          'content',
        ]);
        const content =
          fields &&
          ownFields(fields.content, [
            'schema',
            'controller',
            'requestKey',
            'event',
            'position',
            'transaction',
            'before',
            'after',
            'payload',
          ]);
        return !!(
          fields &&
          content &&
          text(fields.requestKey) &&
          digest(fields.requestDigest) &&
          RUN_CONTROL_EVENTS.includes(fields.event as RunControlEvent) &&
          position(fields.position) &&
          identity('ID-TXN', fields.transaction) &&
          digest(fields.contentDigest) &&
          content.schema === RUN_CONTROL_EVENT_SCHEMA &&
          content.controller === RUN_CONTROL_CONTROLLER &&
          content.requestKey === fields.requestKey &&
          content.event === fields.event &&
          content.position === fields.position &&
          content.transaction === fields.transaction &&
          fields.requestDigest === hash('RUN-CONTROL-REQUEST', content.payload) &&
          hash('RUN-CONTROL-EVENT', fields.content) === fields.contentDigest
        );
      })
    )
      return fail('FC-TRUST', 'INVALID_LEDGER_RECORDS');
    initialRecords = records;
  } catch {
    return fail('FC-TRUST', 'INVALID_LEDGER_RECORDS');
  }
  const events: RunControlCommit[] = [...initialRecords];
  const requestDigests = new Map(initialRecords.map((record) => [record.requestKey, record.requestDigest]));
  const syncLedger = (): RunControlResult<void> => {
    try {
      const records = input.ledger.records();
      if (!Array.isArray(records) || records.length < events.length) return fail('FC-TRUST', 'LEDGER_HEAD_UNAVAILABLE');
      for (let index = 0; index < events.length; index += 1)
        if (
          records[index]?.contentDigest !== events[index]?.contentDigest ||
          records[index]?.requestDigest !== events[index]?.requestDigest
        )
          return fail('FC-TRUST', 'LEDGER_PREFIX_MISMATCH');
      const appended = records.slice(events.length);
      events.push(...appended);
      for (const record of appended) requestDigests.set(record.requestKey, record.requestDigest);
      return ok(undefined);
    } catch {
      return fail('FC-TRUST', 'LEDGER_HEAD_UNAVAILABLE');
    }
  };

  const snapshot = (): RunControlSnapshot =>
    deepFreeze({
      schema: RUN_CONTROL_CONTRACT_VERSION,
      controller: RUN_CONTROL_CONTROLLER,
      run: input.run,
      phase,
      generation,
      basisDigest: input.basisDigest,
      frozenRuleSurface: input.frozenRuleSurface,
      currentRuleSurfaceDigest,
      ruleReapprovalRequired,
      candidateAuthority,
      stories: input.stories,
      finalizationFences: input.finalizationFences,
      currentGrant,
      dispatchEnabled: phase === 'Active',
      finalizationAuthorityFenced: phase !== 'Active' || input.finalizationFences.length > 0,
      externalFence,
      settlement,
    });

  const commit = (
    requestKey: string,
    event: RunControlEvent,
    before: RunControlSnapshot,
    after: RunControlSnapshot,
    payload: CanonicalJson,
    requestPayload: CanonicalJson = payload,
  ): RunControlResult<RunControlSnapshot> => {
    const synchronized = syncLedger();
    if (!synchronized.ok) return synchronized;
    if (!text(requestKey)) return fail('FC-INPUT', 'REQUEST_KEY');
    const requestDigest = hash('RUN-CONTROL-REQUEST', requestPayload);
    if (!requestDigest) return fail('FC-INPUT', 'REQUEST_DIGEST');
    const priorDigest = requestDigests.get(requestKey);
    if (priorDigest !== undefined && priorDigest !== requestDigest)
      return fail('FC-FENCE', 'IDEMPOTENCY_KEY_COLLISION');
    if (priorDigest !== undefined) return ok(snapshot());
    const positionValue = events.length;
    const transaction = `${input.run}/txn/${positionValue + 1}/${after.generation}|${input.basisDigest}`;
    const content = eventContent(requestKey, event, positionValue, transaction, before, after, payload);
    if (!content) return fail('FC-INPUT', 'EVENT_DIGEST');
    const appended = appendCommit(input.ledger, requestKey, requestDigest, positionValue, transaction, content);
    if (!appended.ok) return appended;
    if (
      appended.value.contentDigest !== (hash('RUN-CONTROL-EVENT', content) as string) ||
      appended.value.transaction !== transaction ||
      appended.value.requestDigest !== requestDigest
    )
      return fail('FC-TRUST', 'APPEND_CONTENT_MISMATCH');
    requestDigests.set(requestKey, requestDigest);
    events.push(appended.value);
    return ok(after);
  };

  const authenticate = (raw: Record<string, unknown>, generationForGrant: string): RunControlResult<void> => {
    if (
      !identity('ID-PRINCIPAL', raw.principal) ||
      !identity('ID-GRANT', raw.grant) ||
      raw.run !== input.run ||
      raw.basisDigest !== input.basisDigest ||
      raw.generation !== generationForGrant
    )
      return fail('FC-AUTHORITY', 'EXACT_CURRENT_GRANT_REQUIRED');
    if (
      raw.principal !== currentGrant.principal ||
      raw.grant !== currentGrant.grant ||
      currentGrant.generation !== generationForGrant
    )
      return fail('FC-AUTHORITY', 'EXACT_CURRENT_GRANT_REQUIRED');
    return ok(undefined);
  };

  const replay = (requestKey: unknown, payload: unknown): RunControlResult<RunControlSnapshot> | undefined => {
    if (typeof requestKey !== 'string') return undefined;
    const prior = requestDigests.get(requestKey);
    if (prior === undefined) return undefined;
    const current = hash('RUN-CONTROL-REQUEST', payload);
    return current !== undefined && current === prior ? ok(snapshot()) : fail('FC-FENCE', 'IDEMPOTENCY_KEY_COLLISION');
  };

  const controller: RunControlController = {
    touchRuleSurface(rawInput) {
      const raw = ownFields(rawInput, [
        'requestKey',
        'eventId',
        'observedRuleSurfaceDigest',
        'changedSubjects',
        'basisDigest',
        'generation',
        'candidateDigest',
        'reapprovalDigest',
      ]);
      const subjects = raw && arrayValues(raw.changedSubjects);
      if (
        !raw ||
        !identity('ID-EVENT', raw.eventId) ||
        !digest(raw.observedRuleSurfaceDigest) ||
        !subjects ||
        subjects.length === 0 ||
        new Set(subjects).size !== subjects.length ||
        !subjects?.every(
          (entry) =>
            typeof entry === 'string' &&
            identity('ID-STORY', entry) &&
            input.stories.some((story) => story.story === entry),
        ) ||
        raw.basisDigest !== input.basisDigest ||
        raw.generation !== generation ||
        raw.candidateDigest !== input.frozenRuleSurface.candidateDigest ||
        raw.observedRuleSurfaceDigest === currentRuleSurfaceDigest
      )
        return fail('FC-RULES', 'INVALID_RULE_SURFACE_TOUCH');
      const duplicate = replay(raw.requestKey, raw);
      if (duplicate) return duplicate;
      if (phase !== 'Active' && phase !== 'Parked') return fail('FC-RULES', 'RULE_SURFACE_TOUCH_ORIGIN_NOT_ALLOWED');
      const before = snapshot();
      phase = 'Parked';
      currentRuleSurfaceDigest = raw.observedRuleSurfaceDigest as string;
      ruleReapprovalRequired = true;
      candidateAuthority = 'invalidated';
      const after = snapshot();
      const result = commit(
        raw.requestKey as string,
        'EV-RULE-SURFACE-TOUCHED',
        before,
        after,
        {
          schema: RULE_SURFACE_EVENT_SCHEMA,
          event: 'EV-RULE-SURFACE-TOUCHED',
          eventId: raw.eventId as string,
          run: input.run,
          basisDigest: input.basisDigest,
          generation,
          frozenRuleSurfaceDigest: input.frozenRuleSurface.ruleSurfaceDigest,
          observedRuleSurfaceDigest: raw.observedRuleSurfaceDigest as string,
          changedSubjects: subjects as readonly string[],
          candidateDigest: input.frozenRuleSurface.candidateDigest,
          reapprovalDigest: raw.reapprovalDigest,
        } as unknown as CanonicalJson,
        raw as unknown as CanonicalJson,
      );
      if (!result.ok) {
        phase = before.phase;
        currentRuleSurfaceDigest = before.currentRuleSurfaceDigest;
        ruleReapprovalRequired = before.ruleReapprovalRequired;
        candidateAuthority = before.candidateAuthority;
      }
      return result;
    },
    suspend(rawInput) {
      const raw = ownFields(rawInput, [
        'requestKey',
        'eventId',
        'principal',
        'grant',
        'run',
        'basisDigest',
        'generation',
        'reason',
      ]);
      if (
        !raw ||
        !identity('ID-EVENT', raw.eventId) ||
        raw.run !== input.run ||
        raw.generation !== generation ||
        raw.basisDigest !== input.basisDigest ||
        !text(raw.reason)
      )
        return fail('FC-INPUT', 'INVALID_SUSPEND_DECISION');
      const duplicate = replay(raw.requestKey, raw);
      if (duplicate) return duplicate;
      if (phase !== 'Active' && phase !== 'Parked') return fail('FC-AUTHORITY', 'SUSPEND_ORIGIN_NOT_ALLOWED');
      const auth = authenticate(raw, generation);
      if (!auth.ok) return auth;
      const before = snapshot();
      phase = 'Suspended';
      const after = snapshot();
      const result = commit(
        raw.requestKey as string,
        'EV-RUN-SUSPEND-DECISION',
        before,
        after,
        raw as unknown as CanonicalJson,
      );
      if (!result.ok) phase = before.phase;
      return result;
    },
    resume(rawInput) {
      const raw = ownFields(rawInput, [
        'requestKey',
        'eventId',
        'principal',
        'grant',
        'run',
        'basisDigest',
        'generation',
        'newGeneration',
        'targetPhase',
        'integrity',
        'reapprovalDigest',
        'reapprovalBasis',
      ]);
      if (
        !raw ||
        !identity('ID-EVENT', raw.eventId) ||
        raw.run !== input.run ||
        raw.basisDigest !== input.basisDigest ||
        raw.generation !== generation ||
        !identity('ID-GEN', raw.newGeneration) ||
        !['Active', 'Parked'].includes(String(raw.targetPhase))
      )
        return fail('FC-INPUT', 'INVALID_RESUME_DECISION');
      const synchronized = syncLedger();
      if (!synchronized.ok) return synchronized;
      const duplicate = replay(raw.requestKey, raw);
      if (duplicate) return duplicate;
      if (phase !== 'Suspended') return fail('FC-AUTHORITY', 'RESUME_ORIGIN_NOT_ALLOWED');
      const auth = authenticate(raw, generation);
      if (!auth.ok) return auth;
      const integrity = ownFields(raw.integrity, [
        'schema',
        'run',
        'basisDigest',
        'oldGeneration',
        'newGeneration',
        'head',
        'acceptedSuccessor',
        'status',
      ]);
      const head = integrity && parseWitness(integrity.head);
      const headRecord =
        head &&
        currentPrerequisiteRecord(
          input.ledger,
          head,
          input.run,
          generation,
          input.basisDigest,
          'EV-RUN-RESUME-DECISION',
        );
      const oldNumber = generationNumber(generation);
      const newNumber = generationNumber(raw.newGeneration as string);
      const passed =
        !!integrity &&
        integrity.schema === 'jig.resume-integrity.v1' &&
        integrity.run === input.run &&
        integrity.basisDigest === input.basisDigest &&
        integrity.oldGeneration === generation &&
        integrity.newGeneration === raw.newGeneration &&
        head !== undefined &&
        headRecord !== undefined &&
        integrity.acceptedSuccessor === false &&
        integrity.status === 'passed' &&
        oldNumber !== undefined &&
        newNumber !== undefined &&
        newNumber > oldNumber;
      const approvalBasis = parseWitness(raw.reapprovalBasis);
      const approvalRecord =
        approvalBasis && witnessedRecord(input.ledger, approvalBasis, input.run, generation, input.basisDigest);
      const approvalPayload =
        approvalRecord &&
        recordPayloadFields(approvalRecord, [
          'kind',
          'run',
          'basisDigest',
          'generation',
          'ruleSurfaceDigest',
          'candidateDigest',
          'principal',
          'grant',
          'approvalDigest',
        ]);
      const approvalWithoutDigest = approvalPayload && {
        kind: approvalPayload.kind,
        run: approvalPayload.run,
        basisDigest: approvalPayload.basisDigest,
        generation: approvalPayload.generation,
        ruleSurfaceDigest: approvalPayload.ruleSurfaceDigest,
        candidateDigest: approvalPayload.candidateDigest,
        principal: approvalPayload.principal,
        grant: approvalPayload.grant,
      };
      const reapproved =
        !ruleReapprovalRequired ||
        (!!approvalPayload &&
          approvalRecord !== undefined &&
          digest(raw.reapprovalDigest) &&
          raw.reapprovalDigest === approvalPayload.approvalDigest &&
          approvalPayload.kind === 'rule-reapproval' &&
          approvalPayload.run === input.run &&
          approvalPayload.basisDigest === input.basisDigest &&
          approvalPayload.generation === generation &&
          approvalPayload.ruleSurfaceDigest === currentRuleSurfaceDigest &&
          approvalPayload.candidateDigest === input.frozenRuleSurface.candidateDigest &&
          approvalPayload.principal === currentGrant.principal &&
          approvalPayload.grant === currentGrant.grant &&
          approvalPayload.approvalDigest === hash('RULE-REAPPROVAL', approvalWithoutDigest));
      const before = snapshot();
      if (!passed || !reapproved) {
        phase = 'Parked';
        const parked = snapshot();
        const result = commit(
          raw.requestKey as string,
          'EV-RUN-RESUME-DECISION',
          before,
          parked,
          raw as unknown as CanonicalJson,
        );
        if (!result.ok) phase = before.phase;
        return result;
      }
      generation = raw.newGeneration as string;
      phase = raw.targetPhase as RunControlPhase;
      currentGrant = deepFreeze({ ...currentGrant, generation });
      ruleReapprovalRequired = false;
      candidateAuthority = 'valid';
      const after = snapshot();
      const result = commit(
        raw.requestKey as string,
        'EV-RUN-RESUME-DECISION',
        before,
        after,
        raw as unknown as CanonicalJson,
      );
      if (!result.ok) {
        phase = before.phase;
        generation = before.generation;
        currentGrant = before.currentGrant;
        ruleReapprovalRequired = before.ruleReapprovalRequired;
        candidateAuthority = before.candidateAuthority;
      }
      return result;
    },
    terminalStop(rawInput) {
      const raw = ownFields(rawInput, [
        'requestKey',
        'eventId',
        'run',
        'basisDigest',
        'generation',
        'principal',
        'grant',
        'resumable',
        'remainingResumableTransitions',
        'reason',
        'confirmation',
        'observation',
        'appendBasis',
      ]);
      if (
        !raw ||
        !identity('ID-EVENT', raw.eventId) ||
        raw.run !== input.run ||
        raw.basisDigest !== input.basisDigest ||
        raw.generation !== generation ||
        !text(raw.reason)
      )
        return fail('FC-INPUT', 'INVALID_TERMINAL_STOP');
      const synchronized = syncLedger();
      if (!synchronized.ok) return synchronized;
      const duplicate = replay(raw.requestKey, raw);
      if (duplicate) return duplicate;
      if (settlement !== null) return fail('FC-AUTHORITY', 'SETTLEMENT_ALREADY_OPEN');
      const explicit = phase === 'Suspended';
      const recovery = phase === 'Interrupted / Recovering';
      if (!explicit && !recovery) return fail('FC-AUTHORITY', 'TERMINAL_STOP_ORIGIN_NOT_ALLOWED');
      const appendBasis = parseWitness(raw.appendBasis);
      const basisRecord =
        appendBasis &&
        currentPrerequisiteRecord(
          input.ledger,
          appendBasis,
          input.run,
          generation,
          input.basisDigest,
          explicit ? 'EV-RUN-TERMINAL-STOP-DECISION' : 'EV-RECOVERY-OBSERVATION',
        );
      if (!appendBasis || !basisRecord) {
        externalFence = Object.freeze({ kind: 'FC-TRUST', reason: 'TRUST_APPEND_BASIS_REQUIRED' });
        return fail('FC-TRUST', 'TRUST_APPEND_BASIS_REQUIRED');
      }
      if (explicit) {
        const auth = authenticate(raw, generation);
        if (!auth.ok) return auth;
        if (
          raw.resumable !== false ||
          raw.remainingResumableTransitions !== 0 ||
          raw.confirmation !== 'no-resumable-transition'
        )
          return fail('FC-AUTHORITY', 'RESUMABLE_SUSPENDED_CANNOT_STOP');
        if (raw.observation !== null) return fail('FC-INPUT', 'EXPLICIT_STOP_OBSERVATION_FORBIDDEN');
      } else {
        if (raw.principal !== null || raw.grant !== null || raw.resumable !== null || raw.confirmation !== null)
          return fail('FC-AUTHORITY', 'TRUST_STOP_OWNER_DECISION_FORBIDDEN');
        const observation = ownFields(raw.observation, [
          'kind',
          'run',
          'basisDigest',
          'generation',
          'reason',
          'trustClass',
          'appendBasis',
        ]);
        const observedBasis = observation && parseWitness(observation.appendBasis);
        if (
          observation?.kind !== 'FC-TRUST' ||
          observation.run !== input.run ||
          observation.basisDigest !== input.basisDigest ||
          observation.generation !== generation ||
          !text(observation.reason) ||
          observation.trustClass !== 'FC-TRUST' ||
          observation.reason !== raw.reason ||
          !observedBasis ||
          !witnessFor(observedBasis, input.run, generation, input.basisDigest) ||
          !same(observedBasis, appendBasis)
        )
          return fail('FC-TRUST', 'TRUST_OBSERVATION_REQUIRED');
      }
      const before = snapshot();
      const duties: SettlementDuty[] = [];
      for (const duty of sorted(input.settlementDuties)) duties.push(duty);
      const nextIntents = duties.map((duty) => duty.nextIntent);
      const remainingDutyDigest = hash('SETTLEMENT-DUTIES', duties);
      if (!remainingDutyDigest) return fail('FC-INPUT', 'SETTLEMENT_DUTIES_DIGEST');
      const overlay: SettlementOverlay = deepFreeze({
        schema: SETTLEMENT_SCHEMA,
        id: `${input.run}/settlement/terminal-stop`,
        run: input.run,
        status: 'opened',
        openedBy: explicit ? 'EV-RUN-TERMINAL-STOP-DECISION' : 'EV-RECOVERY-OBSERVATION',
        openedAtPosition: events.length,
        preservedStories: input.stories,
        retainedFences: input.finalizationFences,
        duties: Object.freeze(duties),
        remainingDutyDigest,
        nextIntents: Object.freeze(nextIntents),
        advancedDuties: 0,
        completedDuties: 0,
      });
      phase = 'Stopped';
      settlement = overlay;
      externalFence = null;
      const after = snapshot();
      const result = commit(
        raw.requestKey as string,
        explicit ? 'EV-RUN-TERMINAL-STOP-DECISION' : 'EV-RECOVERY-OBSERVATION',
        before,
        after,
        {
          appendBasis,
          decision: explicit
            ? {
                kind: 'terminal-owner-decision',
                run: input.run,
                basisDigest: input.basisDigest,
                generation,
                principal: raw.principal,
                grant: raw.grant,
                resumable: raw.resumable,
                remainingResumableTransitions: raw.remainingResumableTransitions,
                confirmation: raw.confirmation,
                reason: raw.reason,
              }
            : null,
          observation: recovery
            ? {
                kind: 'recovery-observation',
                run: input.run,
                basisDigest: input.basisDigest,
                generation,
                reason: raw.reason,
                trustClass: 'FC-TRUST',
                appendBasis,
              }
            : null,
          settlement: overlay,
        } as unknown as CanonicalJson,
        raw as unknown as CanonicalJson,
      );
      if (!result.ok) {
        phase = before.phase;
        settlement = before.settlement;
      }
      return result;
    },
    snapshot,
    events: () => Object.freeze([...events]),
  };
  return ok(controller);
}

export function createScriptedRunControlLedger(
  options: Readonly<{
    fault?: 'none' | 'lost-response' | 'unwitnessed';
    seed?: readonly Readonly<{
      requestKey: string;
      requestDigest?: string;
      event: RunControlEvent;
      transaction: string;
      payload: CanonicalJson;
    }>[];
  }> = {},
): RunControlLedger {
  const records: RunControlCommit[] = [];
  const fault = options.fault ?? 'none';
  for (const seed of options.seed ?? []) {
    const content = deepFreeze({
      schema: RUN_CONTROL_EVENT_SCHEMA,
      controller: RUN_CONTROL_CONTROLLER,
      requestKey: seed.requestKey,
      event: seed.event,
      position: records.length,
      transaction: seed.transaction,
      before: null,
      after: null,
      payload: seed.payload,
    });
    const contentDigest = hash('RUN-CONTROL-EVENT', content);
    const requestDigest = seed.requestDigest ?? hash('RUN-CONTROL-REQUEST', seed.payload);
    if (!contentDigest || !requestDigest) continue;
    records.push(
      deepFreeze({
        requestKey: seed.requestKey,
        requestDigest,
        event: seed.event,
        position: records.length,
        transaction: seed.transaction,
        contentDigest,
        content,
      }),
    );
  }
  return Object.freeze({
    append(input) {
      if (input.expectedPosition !== records.length) return fail('FC-FENCE', 'LEDGER_POSITION_MISMATCH');
      const event = ownFields(input.content, [
        'schema',
        'controller',
        'requestKey',
        'event',
        'position',
        'transaction',
        'before',
        'after',
        'payload',
      ]);
      if (
        !event ||
        typeof event.event !== 'string' ||
        !RUN_CONTROL_EVENTS.includes(event.event as RunControlEvent) ||
        event.transaction !== input.transaction ||
        !identity('ID-TXN', input.transaction)
      )
        return fail('FC-INPUT', 'LEDGER_EVENT_SHAPE');
      const contentDigest = hash('RUN-CONTROL-EVENT', input.content);
      const requestDigest = input.requestDigest ?? hash('RUN-CONTROL-REQUEST', event.payload);
      if (!contentDigest || !requestDigest) return fail('FC-INPUT', 'LEDGER_CONTENT_DIGEST');
      const record = deepFreeze({
        requestKey: input.requestKey,
        requestDigest,
        event: event.event as RunControlEvent,
        position: records.length,
        transaction: input.transaction,
        contentDigest,
        content: input.content,
      });
      if (fault === 'unwitnessed') return fail('FC-TRUST', 'LEDGER_WITNESS_MISMATCH');
      records.push(record);
      return fault === 'lost-response' ? fail('FC-TRUST', 'LEDGER_RESPONSE_LOST') : ok(record);
    },
    readback(input) {
      return ok(records.find((record) => record.requestKey === input.requestKey) ?? null);
    },
    records: () => Object.freeze([...records]),
  });
}
