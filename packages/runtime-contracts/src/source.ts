/**
 * The Work Source contract is an effect-free, builder-only semantic seam.
 * Concrete source transport and registration are intentionally absent.
 */
import {
  type CanonicalJson,
  decodeFrame,
  encodeFrame,
  formatIdentity,
  stageDigest,
} from '@agentic-workflow-kit/jig-codec';

export const SOURCE_VERSION = 'jig.source.v1';
export const PLAN_VERSION = 'jig.plan.v1';

declare const sourceRetryRecordBrand: unique symbol;

/** Opaque fixture-issued retry capability; its bindings remain private to the fixture. */
export type SourceRetryRecord = Readonly<{ readonly [sourceRetryRecordBrand]: 'source-retry-record' }>;
export type SourceFailure = Readonly<{
  family: 'FC-INPUT' | 'FC-SUBJECT' | 'FC-BOUND' | 'FC-MECHANISM';
  code: string;
  retryRecord?: SourceRetryRecord;
}>;
export type SourceResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: SourceFailure }>;
export type SourceRetry = Readonly<{ ordinal: number; limit: number }>;
export type SourceRequest = Readonly<{
  version: typeof SOURCE_VERSION;
  sourceIdentity: string;
  basis: CanonicalJson;
  requestBasisDigest: string;
  requestId: string;
  track: string;
  deadline: number;
  retry: SourceRetry;
  predecessor: null;
}>;
export type SourcePlan = Readonly<{
  version: typeof PLAN_VERSION;
  track: string;
  policy: Readonly<{
    frozenCheckClasses: readonly string[];
    capacities: Readonly<Record<string, number>>;
    reserves: Readonly<Record<string, number>>;
  }>;
  stories: readonly Readonly<{
    key: string;
    track: string;
    dependsOn: readonly string[];
    done: Readonly<{ kind: 'checks-pass'; checkClasses: readonly string[] }>;
    requirements: readonly string[];
    acceptanceCriteria: readonly string[];
    demand: Readonly<Record<string, number>>;
  }>[];
}>;
export type SourceExchange = Readonly<{
  version: typeof SOURCE_VERSION;
  requestId: string;
  sourceIdentity: string;
  requestBasisDigest: string;
  track: string;
  itemKey: string;
  revision: string;
  cursor: string;
  content: CanonicalJson;
  contentDigest: string;
  provenance: Readonly<{
    sourceIdentity: string;
    itemKey: string;
    revision: string;
    cursor: string;
    attestation: string;
  }>;
  attestation: string;
  retry: SourceRetry;
  deadline: number;
  plan: SourcePlan;
  exchangeDigest: string;
}>;
export type SourceConformanceEvidence = Readonly<{
  version: 'jig.source-conformance.v1';
  requestDigest: string;
  resultDigest: string;
  exchangeDigest: string;
  corpusDigest: string;
  buildDigest: string;
  suiteDigest: string;
  probeDigest: string;
  boundDigest: string;
  candidateDigest: string;
  evidenceDigest: string;
}>;
export type ScriptedWorkSource = Readonly<{
  exchange(request: unknown, observation: unknown): SourceResult<SourceExchange>;
  recover(request: unknown, observedAt: number): SourceResult<SourceExchange>;
  retry(receipt: unknown, observation: unknown): SourceResult<SourceExchange>;
}>;

const fail = (family: SourceFailure['family'], code: string, retryRecord?: SourceRetryRecord): SourceResult<never> =>
  Object.freeze({
    ok: false,
    error: Object.freeze(retryRecord === undefined ? { family, code } : { family, code, retryRecord }),
  });
const ok = <T>(value: T): SourceResult<T> => Object.freeze({ ok: true, value });
const digest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
const text = (value: unknown, expression: RegExp): value is string =>
  typeof value === 'string' && value.normalize('NFC') === value && expression.test(value);
const sourceIdentity = (value: unknown): value is string => text(value, /^source\/[a-z0-9](?:[a-z0-9-]{0,63})$/u);
const track = (value: unknown): value is string => text(value, /^track\/[a-z0-9](?:[a-z0-9-]{0,63})$/u);
const item = (value: unknown): value is string => text(value, /^item\/[a-z0-9](?:[a-z0-9-]{0,63})$/u);
const revision = (value: unknown): value is string => text(value, /^[a-z0-9][a-z0-9._-]{0,127}$/u);
const storyKey = (value: unknown): value is string => text(value, /^story\/[a-z0-9](?:[a-z0-9-]{0,63})$/u);
const checkClass = (value: unknown): value is string => text(value, /^check\/[a-z0-9](?:[a-z0-9-]{0,63})$/u);
const positive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const nonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const frozen = <T>(value: T): T => Object.freeze(value);
const MAX_FRAME_BYTES = 65_536;
const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
const typedArrayByteLength = Object.getOwnPropertyDescriptor(typedArrayPrototype, 'byteLength')?.get;
const intrinsicTypedArraySet = Uint8Array.prototype.set;

function exact(value: unknown, names: readonly string[]): Record<string, CanonicalJson> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, CanonicalJson>;
  const keys = Object.keys(record).sort();
  const expected = [...names].sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]) ? record : undefined;
}

function entryFields(value: unknown, names: readonly string[]): Record<string, unknown> | undefined {
  try {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return undefined;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== 'string')) return undefined;
    const expected = [...names].sort();
    if (keys.length !== expected.length || [...keys].sort().some((key, index) => key !== expected[index]))
      return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (
      !Object.values(descriptors).every(
        (descriptor) => descriptor.enumerable && 'value' in descriptor && descriptor.configurable !== undefined,
      )
    )
      return undefined;
    return frozen(
      Object.fromEntries(
        names.map((name) => [name, (descriptors[name] as PropertyDescriptor & { value: unknown }).value]),
      ),
    );
  } catch {
    return undefined;
  }
}

function snapshot(value: unknown, depth = 0): CanonicalJson | undefined {
  try {
    if (depth > 32) return undefined;
    if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string')
      return value;
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) return undefined;
      const keys = Reflect.ownKeys(value);
      if (keys.some((key) => typeof key !== 'string')) return undefined;
      const descriptors = Object.getOwnPropertyDescriptors(value) as unknown as Record<string, PropertyDescriptor>;
      const length = descriptors.length;
      if (
        !length ||
        !('value' in length) ||
        typeof length.value !== 'number' ||
        !Number.isSafeInteger(length.value) ||
        length.value > 256
      )
        return undefined;
      if (keys.length !== length.value + 1 || !keys.includes('length')) return undefined;
      const output: CanonicalJson[] = [];
      for (let index = 0; index < length.value; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor?.enumerable || !('value' in descriptor)) return undefined;
        const child = snapshot(descriptor.value, depth + 1);
        if (child === undefined) return undefined;
        output.push(child);
      }
      return output;
    }
    if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return undefined;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== 'string') || keys.length > 256) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const output: Record<string, CanonicalJson> = {};
    for (const key of keys) {
      const descriptor = descriptors[key as string];
      if (!descriptor?.enumerable || !('value' in descriptor)) return undefined;
      const child = snapshot(descriptor.value, depth + 1);
      if (child === undefined) return undefined;
      Object.defineProperty(output, key as string, {
        value: child,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return output;
  } catch {
    return undefined;
  }
}

function framed(value: unknown): value is Uint8Array {
  return ArrayBuffer.isView(value) && value instanceof Uint8Array;
}

function frameSnapshot(value: unknown, failureCode: string): SourceResult<Uint8Array> {
  if (!framed(value) || !typedArrayByteLength) return fail('FC-INPUT', failureCode);
  try {
    const byteLength = Reflect.apply(typedArrayByteLength, value, []);
    if (!Number.isSafeInteger(byteLength) || byteLength < 0 || byteLength > MAX_FRAME_BYTES)
      return fail('FC-INPUT', failureCode);
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== byteLength ||
      keys.some(
        (key) =>
          typeof key !== 'string' ||
          !/^(?:0|[1-9][0-9]*)$/u.test(key) ||
          Number(key) >= byteLength ||
          String(Number(key)) !== key,
      )
    )
      return fail('FC-INPUT', failureCode);
    const output = new Uint8Array(byteLength);
    Reflect.apply(intrinsicTypedArraySet, output, [value]);
    return ok(output);
  } catch {
    return fail('FC-INPUT', failureCode);
  }
}

function canonical(input: unknown): SourceResult<CanonicalJson> {
  const copied = snapshot(input);
  if (copied === undefined) return fail('FC-INPUT', 'INVALID_RAW_INPUT');
  const encoded = encodeFrame(copied);
  if (!encoded.ok) return fail('FC-INPUT', encoded.error.code);
  const decoded = decodeFrame(encoded.value);
  return decoded.ok ? ok(decoded.value) : fail('FC-INPUT', decoded.error.code);
}

function decode(input: unknown): SourceResult<CanonicalJson> {
  const copied = frameSnapshot(input, 'INVALID_FRAME');
  if (!copied.ok) return copied;
  const decoded = decodeFrame(copied.value);
  return decoded.ok ? ok(decoded.value) : fail('FC-INPUT', decoded.error.code);
}

function staged(domain: string, value: CanonicalJson, excludePaths: readonly string[] = []): SourceResult<string> {
  const result = stageDigest({ domain, value, excludePaths });
  return result.ok ? ok(result.value.digest) : fail('FC-INPUT', result.error.code);
}

function asArray(value: CanonicalJson): readonly CanonicalJson[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function boundedTextArray(
  value: CanonicalJson,
  predicate: (item: unknown) => item is string,
  allowEmpty = false,
): readonly string[] | undefined {
  const values = asArray(value);
  if (
    !values ||
    (!allowEmpty && values.length === 0) ||
    new Set(values).size !== values.length ||
    !values.every(predicate)
  )
    return undefined;
  return frozen([...values] as string[]);
}

function numericMap(value: CanonicalJson): Readonly<Record<string, number>> | undefined {
  const record = exactMap(value);
  if (!record || Object.keys(record).length === 0) return undefined;
  const entries = Object.entries(record);
  if (!entries.every(([key, amount]) => safeMapKey(key) && positive(amount))) return undefined;
  return frozen(Object.fromEntries(entries) as Record<string, number>);
}
function reserveMap(value: CanonicalJson): Readonly<Record<string, number>> | undefined {
  const record = exactMap(value);
  if (!record || Object.keys(record).length === 0) return undefined;
  const entries = Object.entries(record);
  if (!entries.every(([key, amount]) => safeMapKey(key) && nonnegative(amount))) return undefined;
  return frozen(Object.fromEntries(entries) as Record<string, number>);
}
function safeMapKey(value: string): boolean {
  return /^[a-z][a-z0-9-]{0,31}$/u.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
}

function exactMap(value: CanonicalJson): Record<string, CanonicalJson> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, CanonicalJson>)
    : undefined;
}

function parsePlan(value: CanonicalJson): SourceResult<SourcePlan> {
  const raw = exact(value, ['version', 'track', 'policy', 'stories']);
  const policy = raw && exact(raw.policy, ['frozenCheckClasses', 'capacities', 'reserves']);
  const frozenCheckClasses = policy && boundedTextArray(policy.frozenCheckClasses, checkClass);
  const capacities = policy && numericMap(policy.capacities);
  const reserves = policy && reserveMap(policy.reserves);
  const stories = raw && asArray(raw.stories);
  if (
    !raw ||
    raw.version !== PLAN_VERSION ||
    !track(raw.track) ||
    !policy ||
    !frozenCheckClasses ||
    !capacities ||
    !reserves ||
    !stories ||
    stories.length === 0 ||
    Object.keys(capacities).length !== Object.keys(reserves).length ||
    Object.keys(capacities).some((key) => {
      const reserve = reserves[key];
      const capacity = capacities[key];
      return (
        !Object.hasOwn(reserves, key) ||
        (key === 'rc-finalizer' ? capacity !== 1 || reserve !== 0 : reserve < 1 || reserve >= capacity)
      );
    })
  )
    return fail('FC-INPUT', 'INVALID_PLAN');

  const parsed = stories.map((candidate) => {
    const story = exact(candidate, [
      'key',
      'track',
      'dependsOn',
      'done',
      'requirements',
      'acceptanceCriteria',
      'demand',
    ]);
    const done = story && exact(story.done, ['kind', 'checkClasses']);
    const dependsOn = story && boundedTextArray(story.dependsOn, storyKey, true);
    const checks = done && boundedTextArray(done.checkClasses, checkClass);
    const requirements =
      story && boundedTextArray(story.requirements, (entry): entry is string => text(entry, /^.{1,512}$/u));
    const acceptanceCriteria =
      story && boundedTextArray(story.acceptanceCriteria, (entry): entry is string => text(entry, /^.{1,512}$/u));
    const demand = story && numericMap(story.demand);
    if (
      !story ||
      !storyKey(story.key) ||
      story.track !== raw.track ||
      !dependsOn ||
      !done ||
      done.kind !== 'checks-pass' ||
      !checks ||
      !checks.every((entry) => frozenCheckClasses.includes(entry)) ||
      !requirements ||
      !acceptanceCriteria ||
      !demand ||
      Object.keys(demand).some((key) => !Object.hasOwn(capacities, key))
    )
      return undefined;
    return frozen({
      key: story.key,
      track: raw.track as string,
      dependsOn,
      done: frozen({ kind: 'checks-pass' as const, checkClasses: checks }),
      requirements,
      acceptanceCriteria,
      demand,
    });
  });
  if (parsed.some((story) => story === undefined) || new Set(parsed.map((story) => story?.key)).size !== parsed.length)
    return fail('FC-INPUT', 'INVALID_PLAN');
  const stableStories = parsed as SourcePlan['stories'];
  const byKey = new Map(stableStories.map((story) => [story.key, story]));
  if (
    stableStories.some((story) =>
      story.dependsOn.some((dependency) => dependency === story.key || !byKey.has(dependency)),
    )
  )
    return fail('FC-INPUT', 'INVALID_PLAN');
  const visiting = new Set<string>();
  const complete = new Set<string>();
  const walk = (key: string): boolean => {
    if (complete.has(key)) return true;
    if (visiting.has(key)) return false;
    visiting.add(key);
    const result = (byKey.get(key)?.dependsOn ?? []).every(walk);
    visiting.delete(key);
    if (result) complete.add(key);
    return result;
  };
  if (![...byKey.keys()].every(walk)) return fail('FC-INPUT', 'INVALID_PLAN');
  const maximumDemand = new Map<string, number>();
  const demandAt = (key: string, resource: string): number => {
    const memoKey = `${key}\u0000${resource}`;
    const known = maximumDemand.get(memoKey);
    if (known !== undefined) return known;
    const story = byKey.get(key) as SourcePlan['stories'][number];
    const value =
      (story.demand[resource] ?? 0) +
      Math.max(0, ...story.dependsOn.map((dependency) => demandAt(dependency, resource)));
    maximumDemand.set(memoKey, value);
    return value;
  };
  if (
    Object.keys(capacities).some((resource) =>
      stableStories.some(
        (story) => demandAt(story.key, resource) + (reserves[resource] ?? 0) > (capacities[resource] ?? 0),
      ),
    )
  )
    return fail('FC-INPUT', 'PLAN_FEASIBILITY_FAILED');
  return ok(
    frozen({
      version: PLAN_VERSION,
      track: raw.track as string,
      policy: frozen({ frozenCheckClasses, capacities, reserves }),
      stories: frozen([...stableStories]),
    }),
  );
}

/** Shared GF-019 SCH-PLAN validation boundary for Builder consumers. */
export function validateSourcePlan(input: unknown): SourceResult<SourcePlan> {
  const value = canonical(input);
  return value.ok ? parsePlan(value.value) : value;
}

function parseRequest(value: CanonicalJson): SourceResult<SourceRequest> {
  const raw = exact(value, ['version', 'sourceIdentity', 'basis', 'track', 'deadline', 'retry', 'predecessor']);
  const retry = raw && exact(raw.retry, ['ordinal', 'limit']);
  const basis = raw && exactMap(raw.basis);
  if (
    !raw ||
    raw.version !== SOURCE_VERSION ||
    !sourceIdentity(raw.sourceIdentity) ||
    !track(raw.track) ||
    !basis ||
    !positive(raw.deadline) ||
    !retry ||
    !nonnegative(retry.ordinal) ||
    !positive(retry.limit) ||
    retry.ordinal > retry.limit
  )
    return fail('FC-INPUT', 'INVALID_SOURCE_REQUEST');
  if (basis.track !== raw.track) return fail('FC-SUBJECT', 'REQUEST_TRACK_MISMATCH');
  const requestBasisDigest = staged('SOURCE-REQUEST-BASIS', raw.basis);
  if (!requestBasisDigest.ok) return requestBasisDigest;
  const sourceDigest = staged('SOURCE-IDENTITY', raw.sourceIdentity);
  if (!sourceDigest.ok) return sourceDigest;
  const identity = formatIdentity('ID-SOURCE-REQ', {
    sourceDigest: sourceDigest.value,
    requestDigest: requestBasisDigest.value,
  });
  if (!identity.ok) return fail('FC-SUBJECT', 'INVALID_SOURCE_REQUEST_ID');
  if (raw.predecessor !== null) return fail('FC-INPUT', 'INVALID_RETRY_PREDECESSOR');
  if (retry.ordinal !== 0) return fail('FC-INPUT', 'RETRY_RECEIPT_REQUIRED');
  return ok(
    frozen({
      version: SOURCE_VERSION,
      sourceIdentity: raw.sourceIdentity,
      basis: raw.basis,
      requestBasisDigest: requestBasisDigest.value,
      requestId: identity.value.value,
      track: raw.track,
      deadline: raw.deadline,
      retry: frozen({ ordinal: retry.ordinal, limit: retry.limit }),
      predecessor: null,
    }),
  );
}

function exchangeDigest(value: Omit<SourceExchange, 'exchangeDigest'>): SourceResult<string> {
  return staged('SOURCE-EXCHANGE', { ...value, exchangeDigest: '' } as unknown as CanonicalJson, ['exchangeDigest']);
}

function parseExchange(request: SourceRequest, value: CanonicalJson): SourceResult<SourceExchange> {
  const raw = exact(value, [
    'version',
    'requestId',
    'sourceIdentity',
    'requestBasisDigest',
    'track',
    'itemKey',
    'revision',
    'cursor',
    'content',
    'contentDigest',
    'provenance',
    'attestation',
    'retry',
    'deadline',
    'plan',
    'exchangeDigest',
  ]);
  const retry = raw && exact(raw.retry, ['ordinal', 'limit']);
  const provenance = raw && exact(raw.provenance, ['sourceIdentity', 'itemKey', 'revision', 'cursor', 'attestation']);
  if (!raw || !retry || !provenance) return fail('FC-INPUT', 'INVALID_SOURCE_EXCHANGE');
  if (
    raw.version !== SOURCE_VERSION ||
    raw.requestId !== request.requestId ||
    raw.sourceIdentity !== request.sourceIdentity ||
    raw.requestBasisDigest !== request.requestBasisDigest ||
    raw.track !== request.track ||
    raw.deadline !== request.deadline ||
    !nonnegative(retry.ordinal) ||
    !positive(retry.limit) ||
    retry.ordinal !== request.retry.ordinal ||
    retry.limit !== request.retry.limit
  )
    return fail('FC-SUBJECT', 'REQUEST_BINDING_MISMATCH');
  if (
    !item(raw.itemKey) ||
    !revision(raw.revision) ||
    !revision(raw.cursor) ||
    !digest(raw.contentDigest) ||
    !digest(raw.attestation) ||
    !digest(raw.exchangeDigest) ||
    provenance.sourceIdentity !== raw.sourceIdentity ||
    provenance.itemKey !== raw.itemKey ||
    provenance.revision !== raw.revision ||
    provenance.cursor !== raw.cursor ||
    provenance.attestation !== raw.attestation
  )
    return fail('FC-INPUT', 'INVALID_SOURCE_EXCHANGE');
  const contentDigest = staged('SOURCE-CONTENT', raw.content);
  if (!contentDigest.ok || contentDigest.value !== raw.contentDigest) return fail('FC-INPUT', 'INVALID_CONTENT_DIGEST');
  const attestation = staged('SOURCE-ATTESTATION', {
    requestId: raw.requestId,
    sourceIdentity: raw.sourceIdentity,
    itemKey: raw.itemKey,
    revision: raw.revision,
    cursor: raw.cursor,
    contentDigest: raw.contentDigest,
    requestBasisDigest: raw.requestBasisDigest,
  });
  if (!attestation.ok || attestation.value !== raw.attestation) return fail('FC-SUBJECT', 'UNVERIFIABLE_PROVENANCE');
  const plan = parsePlan(raw.plan);
  if (!plan.ok) return plan;
  if (plan.value.track !== request.track) return fail('FC-SUBJECT', 'PLAN_TRACK_MISMATCH');
  const exchange: Omit<SourceExchange, 'exchangeDigest'> = {
    version: SOURCE_VERSION,
    requestId: raw.requestId,
    sourceIdentity: raw.sourceIdentity,
    requestBasisDigest: raw.requestBasisDigest,
    track: raw.track as string,
    itemKey: raw.itemKey,
    revision: raw.revision,
    cursor: raw.cursor,
    content: raw.content,
    contentDigest: raw.contentDigest,
    provenance: frozen({
      sourceIdentity: raw.sourceIdentity,
      itemKey: raw.itemKey,
      revision: raw.revision,
      cursor: raw.cursor,
      attestation: raw.attestation,
    }),
    attestation: raw.attestation,
    retry: frozen({ ordinal: retry.ordinal, limit: retry.limit }),
    deadline: raw.deadline,
    plan: plan.value,
  };
  const calculated = exchangeDigest(exchange);
  if (!calculated.ok || calculated.value !== raw.exchangeDigest) return fail('FC-INPUT', 'INVALID_EXCHANGE_DIGEST');
  return ok(frozen({ ...exchange, exchangeDigest: raw.exchangeDigest }));
}

export function encodeSourceRequest(input: unknown): SourceResult<Uint8Array> {
  const value = canonical(input);
  if (!value.ok) return value;
  const request = parseRequest(value.value);
  if (!request.ok) return request;
  const encoded = encodeFrame({
    version: request.value.version,
    sourceIdentity: request.value.sourceIdentity,
    basis: request.value.basis,
    track: request.value.track,
    deadline: request.value.deadline,
    retry: request.value.retry,
    predecessor: request.value.predecessor,
  });
  return encoded.ok ? ok(encoded.value) : fail('FC-INPUT', encoded.error.code);
}

export function decodeSourceRequest(input: unknown): SourceResult<SourceRequest> {
  const value = decode(input);
  return value.ok ? parseRequest(value.value) : value;
}

export function encodeSourceCandidate(requestFrame: unknown, input: unknown): SourceResult<Uint8Array> {
  const request = decodeSourceRequest(requestFrame);
  const value = canonical(input);
  if (!request.ok) return request;
  if (!value.ok) return value;
  const candidate = exact(value.value, [
    'version',
    'sourceIdentity',
    'itemKey',
    'revision',
    'cursor',
    'content',
    'plan',
  ]);
  if (
    !candidate ||
    candidate.version !== SOURCE_VERSION ||
    candidate.sourceIdentity !== request.value.sourceIdentity ||
    !item(candidate.itemKey) ||
    !revision(candidate.revision) ||
    !revision(candidate.cursor)
  )
    return fail('FC-INPUT', 'INVALID_SOURCE_CANDIDATE');
  const plan = parsePlan(candidate.plan);
  if (!plan.ok) return plan;
  if (plan.value.track !== request.value.track) return fail('FC-SUBJECT', 'PLAN_TRACK_MISMATCH');
  const contentDigest = staged('SOURCE-CONTENT', candidate.content);
  if (!contentDigest.ok) return contentDigest;
  const attestation = staged('SOURCE-ATTESTATION', {
    requestId: request.value.requestId,
    sourceIdentity: candidate.sourceIdentity,
    itemKey: candidate.itemKey,
    revision: candidate.revision,
    cursor: candidate.cursor,
    contentDigest: contentDigest.value,
    requestBasisDigest: request.value.requestBasisDigest,
  });
  if (!attestation.ok) return attestation;
  const exchange: Omit<SourceExchange, 'exchangeDigest'> = {
    version: SOURCE_VERSION,
    requestId: request.value.requestId,
    sourceIdentity: candidate.sourceIdentity,
    requestBasisDigest: request.value.requestBasisDigest,
    track: request.value.track,
    itemKey: candidate.itemKey,
    revision: candidate.revision,
    cursor: candidate.cursor,
    content: candidate.content,
    contentDigest: contentDigest.value,
    provenance: frozen({
      sourceIdentity: candidate.sourceIdentity,
      itemKey: candidate.itemKey,
      revision: candidate.revision,
      cursor: candidate.cursor,
      attestation: attestation.value,
    }),
    attestation: attestation.value,
    retry: request.value.retry,
    deadline: request.value.deadline,
    plan: plan.value,
  };
  const exchangeId = exchangeDigest(exchange);
  if (!exchangeId.ok) return exchangeId;
  const encoded = encodeFrame({ ...exchange, exchangeDigest: exchangeId.value } as unknown as CanonicalJson);
  return encoded.ok ? ok(encoded.value) : fail('FC-INPUT', encoded.error.code);
}

export function validateSourceExchange(requestFrame: unknown, resultFrame: unknown): SourceResult<SourceExchange> {
  const request = decodeSourceRequest(requestFrame);
  if (!request.ok) return request;
  const result = decode(resultFrame);
  return result.ok ? parseExchange(request.value, result.value) : result;
}

type SourceRetryBinding = Readonly<{
  requestId: string;
  requestBasisDigest: string;
  track: string;
  deadline: number;
  retryLimit: number;
  ordinal: number;
  disposition: 'terminal-unavailable' | 'expired';
  resultDigest: string;
  candidateDigest: string;
  request: SourceRequest;
  exchange: SourceExchange;
}>;

function retargetExchange(template: SourceExchange, request: SourceRequest): SourceResult<SourceExchange> {
  if (
    template.requestId !== request.requestId ||
    template.requestBasisDigest !== request.requestBasisDigest ||
    template.track !== request.track ||
    template.deadline !== request.deadline
  )
    return fail('FC-SUBJECT', 'REQUEST_BINDING_MISMATCH');
  const exchange: Omit<SourceExchange, 'exchangeDigest'> = {
    ...template,
    requestId: request.requestId,
    requestBasisDigest: request.requestBasisDigest,
    track: request.track,
    retry: request.retry,
    deadline: request.deadline,
  };
  const calculated = exchangeDigest(exchange);
  return calculated.ok ? ok(frozen({ ...exchange, exchangeDigest: calculated.value })) : calculated;
}

export function createScriptedWorkSource(candidateFrame: unknown): SourceResult<ScriptedWorkSource> {
  const copied = frameSnapshot(candidateFrame, 'INVALID_FIXTURE_FRAME');
  if (!copied.ok) return copied;
  const stored = copied.value;
  const receipts = new WeakMap<object, SourceRetryBinding>();
  const parseObservation = (
    value: unknown,
  ): SourceResult<Readonly<{ kind: 'return' | 'lost-result' | 'crash'; observedAt: number }>> => {
    const observed = entryFields(value, ['kind', 'observedAt']);
    if (
      !observed ||
      !nonnegative(observed.observedAt) ||
      !['return', 'lost-result', 'crash'].includes(observed.kind as string)
    )
      return fail('FC-INPUT', 'INVALID_OBSERVATION');
    return ok(
      frozen({ kind: observed.kind as 'return' | 'lost-result' | 'crash', observedAt: observed.observedAt as number }),
    );
  };
  const issueReceipt = (
    request: SourceRequest,
    exchange: SourceExchange,
    disposition: SourceRetryBinding['disposition'],
  ): SourceRetryRecord => {
    const record = frozen({}) as SourceRetryRecord;
    receipts.set(
      record as object,
      frozen({
        requestId: request.requestId,
        requestBasisDigest: request.requestBasisDigest,
        track: request.track,
        deadline: request.deadline,
        retryLimit: request.retry.limit,
        ordinal: request.retry.ordinal,
        disposition,
        resultDigest: exchange.exchangeDigest,
        candidateDigest: exchange.contentDigest,
        request,
        exchange,
      }),
    );
    return record;
  };
  const exchangeFor = (request: SourceRequest, template?: SourceExchange): SourceResult<SourceExchange> => {
    if (template !== undefined) return retargetExchange(template, request);
    const encoded = encodeSourceRequest({
      version: request.version,
      sourceIdentity: request.sourceIdentity,
      basis: request.basis,
      track: request.track,
      deadline: request.deadline,
      retry: request.retry,
      predecessor: null,
    });
    return encoded.ok ? validateSourceExchange(encoded.value, stored) : encoded;
  };
  const execute = (
    request: SourceRequest,
    observed: Readonly<{ kind: 'return' | 'lost-result' | 'crash'; observedAt: number }>,
    template?: SourceExchange,
  ): SourceResult<SourceExchange> => {
    if (request.retry.ordinal >= request.retry.limit) return fail('FC-BOUND', 'BND_RETRY_EXHAUSTED');
    const exchange = exchangeFor(request, template);
    if (!exchange.ok) return exchange;
    if (observed.observedAt >= request.deadline)
      return fail('FC-BOUND', 'BND_WAIT_MECHANISM_EXHAUSTED', issueReceipt(request, exchange.value, 'expired'));
    return observed.kind === 'return'
      ? exchange
      : fail('FC-MECHANISM', 'RESULT_UNAVAILABLE', issueReceipt(request, exchange.value, 'terminal-unavailable'));
  };
  return ok(
    frozen({
      exchange: (request, observation) => {
        const parsed = decodeSourceRequest(request);
        const observed = parseObservation(observation);
        if (!parsed.ok) return parsed;
        if (!observed.ok) return observed;
        return execute(parsed.value, observed.value);
      },
      recover: (request, observedAt) => {
        const parsed = decodeSourceRequest(request);
        return parsed.ok && nonnegative(observedAt)
          ? execute(parsed.value, frozen({ kind: 'return', observedAt }))
          : parsed.ok
            ? fail('FC-INPUT', 'INVALID_OBSERVED_AT')
            : parsed;
      },
      retry: (record, retryObservation) => {
        if (typeof record !== 'object' || record === null) return fail('FC-INPUT', 'INVALID_RETRY_RECEIPT');
        const binding = receipts.get(record);
        const observed = parseObservation(retryObservation);
        if (!binding) return fail('FC-INPUT', 'INVALID_RETRY_RECEIPT');
        if (!observed.ok) return observed;
        if (binding.ordinal + 1 >= binding.retryLimit) return fail('FC-BOUND', 'BND_RETRY_EXHAUSTED');
        const request = frozen({
          ...binding.request,
          retry: frozen({ ordinal: binding.ordinal + 1, limit: binding.retryLimit }),
          predecessor: null,
        });
        return execute(request, observed.value, binding.exchange);
      },
    }),
  );
}

function evidenceDigest(value: Omit<SourceConformanceEvidence, 'evidenceDigest'>): SourceResult<string> {
  return staged('SOURCE-CONFORMANCE', { ...value, evidenceDigest: '' } as CanonicalJson, ['evidenceDigest']);
}

export function createSourceConformanceEvidence(input: unknown): SourceResult<SourceConformanceEvidence> {
  const raw = entryFields(input, [
    'request',
    'result',
    'corpusDigest',
    'buildDigest',
    'suiteDigest',
    'probeDigest',
    'boundDigest',
    'candidateDigest',
  ]);
  if (!raw) return fail('FC-INPUT', 'INVALID_CONFORMANCE_EVIDENCE');
  const exchange = validateSourceExchange(raw.request, raw.result);
  if (!exchange.ok) return exchange;
  const request = decodeSourceRequest(raw.request);
  if (!request.ok) return request;
  const requestDigest = staged('SOURCE-FRAME', request.value.basis);
  const resultDigest = staged('SOURCE-EXCHANGE-FRAME', exchange.value as unknown as CanonicalJson);
  const values = [
    'corpusDigest',
    'buildDigest',
    'suiteDigest',
    'probeDigest',
    'boundDigest',
    'candidateDigest',
  ] as const;
  if (!requestDigest.ok || !resultDigest.ok || !values.every((field) => digest(raw[field])))
    return fail('FC-INPUT', 'INVALID_CONFORMANCE_EVIDENCE');
  const evidence: Omit<SourceConformanceEvidence, 'evidenceDigest'> = {
    version: 'jig.source-conformance.v1',
    requestDigest: requestDigest.value,
    resultDigest: resultDigest.value,
    exchangeDigest: exchange.value.exchangeDigest,
    corpusDigest: raw.corpusDigest as string,
    buildDigest: raw.buildDigest as string,
    suiteDigest: raw.suiteDigest as string,
    probeDigest: raw.probeDigest as string,
    boundDigest: raw.boundDigest as string,
    candidateDigest: raw.candidateDigest as string,
  };
  const calculated = evidenceDigest(evidence);
  return calculated.ok ? ok(frozen({ ...evidence, evidenceDigest: calculated.value })) : calculated;
}

export function validateSourceConformanceEvidence(input: unknown): SourceResult<SourceConformanceEvidence> {
  const copied = snapshot(input);
  if (copied === undefined) return fail('FC-INPUT', 'INVALID_CONFORMANCE_EVIDENCE');
  const raw = exact(copied, [
    'version',
    'requestDigest',
    'resultDigest',
    'exchangeDigest',
    'corpusDigest',
    'buildDigest',
    'suiteDigest',
    'probeDigest',
    'boundDigest',
    'candidateDigest',
    'evidenceDigest',
  ]);
  if (raw?.version !== 'jig.source-conformance.v1' || !digest(raw?.evidenceDigest))
    return fail('FC-INPUT', 'INVALID_CONFORMANCE_EVIDENCE');
  const evidence = { ...raw, version: 'jig.source-conformance.v1' as const } as SourceConformanceEvidence;
  if (
    ![
      evidence.requestDigest,
      evidence.resultDigest,
      evidence.exchangeDigest,
      evidence.corpusDigest,
      evidence.buildDigest,
      evidence.suiteDigest,
      evidence.probeDigest,
      evidence.boundDigest,
      evidence.candidateDigest,
    ].every(digest)
  )
    return fail('FC-INPUT', 'INVALID_CONFORMANCE_EVIDENCE');
  const calculated = evidenceDigest(evidence);
  return calculated.ok && calculated.value === evidence.evidenceDigest
    ? ok(frozen(evidence))
    : fail('FC-SUBJECT', 'CONFORMANCE_BINDING_MISMATCH');
}
