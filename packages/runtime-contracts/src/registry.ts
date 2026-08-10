import {
  type CanonicalJson,
  decodeFrame,
  encodeFrame,
  formatIdentity,
  parseIdentity,
  stageDigest,
} from '@agentic-workflow-kit/jig-codec';

export const REGISTRY_VERSION = 'jig.registry.v1';
const GENESIS_DIGEST = '0'.repeat(64);

export type RegistryFailureFamily = 'FC-INPUT' | 'FC-SUBJECT' | 'FC-FENCE' | 'FC-TRUST' | 'FC-AUTHORITY';
export type RegistryFailure = Readonly<{ family: RegistryFailureFamily; code: string }>;
export type RegistryResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: RegistryFailure }>;
export type RegistryBinding = Readonly<{ descriptor: string; registry: string; target: string }>;
type Comparator = Readonly<{ priority: number; ordinal: number; story: string }>;
type Waiter = Readonly<{
  run: string;
  story: string;
  generation: string;
  candidate: string;
  candidateContentDigest: string;
  eligibilityBasis: string;
  comparator: Comparator;
  waitedAt: number;
}>;
type Handle = Readonly<{ registry: string; position: number; contentDigest: string }>;
export type RegistryRecord = Readonly<{
  version: typeof REGISTRY_VERSION;
  registry: string;
  target: string;
  expectedHeadPosition: number;
  expectedHeadDigest: string;
  position: number;
  previousDigest: string;
  predecessorDigest: string;
  contentDigest: string;
  variant: 'waiter' | 'withdrawal' | 'grant' | 'release' | 'atomic-rebind';
  handle: Handle;
  authority?: string;
  waiter?: Handle;
  content: CanonicalJson;
}>;
type Fault =
  | 'after-flush'
  | 'after-witness'
  | 'lost-ack'
  | 'witness-absent'
  | 'witness-ahead'
  | 'witness-contradiction'
  | 'fork'
  | 'rollback';

const freeze = <T>(value: T): T => Object.freeze(value);
const ok = <T>(value: T): RegistryResult<T> => ({ ok: true, value });
const fail = (family: RegistryFailureFamily, code: string): RegistryResult<never> => ({
  ok: false,
  error: { family, code },
});
const isDigest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const isPosition = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const plain = (value: unknown): value is Record<string, unknown> => {
  try {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    );
  } catch {
    return false;
  }
};
const data = (value: object, key: string): unknown => {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && 'value' in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
};
const exact = (value: object, keys: readonly string[]): boolean => {
  try {
    const actual = Object.getOwnPropertyNames(value).sort();
    return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
  } catch {
    return false;
  }
};
const canonical = (value: unknown): CanonicalJson | undefined => {
  const encoded = encodeFrame(value as CanonicalJson);
  if (!encoded.ok) return undefined;
  const decoded = decodeFrame(encoded.value);
  return decoded.ok ? decoded.value : undefined;
};
export function createRegistryBinding(input: unknown): RegistryResult<RegistryBinding> {
  if (!plain(input) || !exact(input, ['descriptor', 'targetKey']))
    return fail('FC-INPUT', 'INVALID_REGISTRY_DESCRIPTOR');
  const descriptor = data(input, 'descriptor');
  const targetKey = data(input, 'targetKey');
  if (!isDigest(descriptor) || typeof targetKey !== 'string') return fail('FC-INPUT', 'INVALID_REGISTRY_DESCRIPTOR');
  const registry = formatIdentity('ID-REGISTRY', { registryDigest: descriptor });
  const target = formatIdentity('ID-TARGET', { targetKey });
  return registry.ok && target.ok
    ? ok(freeze({ descriptor, registry: registry.value.value, target: target.value.value }))
    : fail('FC-SUBJECT', 'INVALID_REGISTRY_DESCRIPTOR');
}

function binding(input: unknown): RegistryResult<RegistryBinding> {
  if (!plain(input) || !exact(input, ['descriptor', 'registry', 'target']))
    return fail('FC-SUBJECT', 'INVALID_REGISTRY_BINDING');
  const descriptor = data(input, 'descriptor');
  const registry = data(input, 'registry');
  const target = data(input, 'target');
  return isDigest(descriptor) &&
    typeof registry === 'string' &&
    typeof target === 'string' &&
    parseIdentity('ID-REGISTRY', registry).ok &&
    parseIdentity('ID-TARGET', target).ok &&
    registry === `registry/${descriptor}`
    ? ok(freeze({ descriptor, registry, target }))
    : fail('FC-AUTHORITY', 'FOREIGN_REGISTRY_BINDING');
}
function waiter(input: unknown): RegistryResult<Waiter> {
  if (
    !plain(input) ||
    !exact(input, [
      'candidate',
      'candidateContentDigest',
      'comparator',
      'eligibilityBasis',
      'generation',
      'run',
      'story',
      'waitedAt',
    ])
  )
    return fail('FC-INPUT', 'INVALID_WAITER');
  const run = data(input, 'run');
  const story = data(input, 'story');
  const generation = data(input, 'generation');
  const candidate = data(input, 'candidate');
  const candidateContentDigest = data(input, 'candidateContentDigest');
  const eligibilityBasis = data(input, 'eligibilityBasis');
  const waitedAt = data(input, 'waitedAt');
  const order = data(input, 'comparator');
  if (!plain(order) || !exact(order, ['ordinal', 'priority', 'story'])) return fail('FC-INPUT', 'INVALID_COMPARATOR');
  const priority = data(order, 'priority');
  const ordinal = data(order, 'ordinal');
  const orderStory = data(order, 'story');
  if (
    typeof run !== 'string' ||
    typeof story !== 'string' ||
    typeof generation !== 'string' ||
    typeof candidate !== 'string' ||
    !isDigest(candidateContentDigest) ||
    !isDigest(eligibilityBasis) ||
    !isPosition(waitedAt) ||
    typeof priority !== 'number' ||
    !Number.isSafeInteger(priority) ||
    !isPosition(ordinal) ||
    orderStory !== story ||
    !parseIdentity('ID-RUN', run).ok ||
    !parseIdentity('ID-STORY', story).ok ||
    !parseIdentity('ID-GEN', generation).ok ||
    !parseIdentity('ID-CAND', candidate).ok ||
    !generation.startsWith(`${run}/gen/`) ||
    !story.startsWith(`${run}/story/`) ||
    !candidate.startsWith(`${story}/cand/`)
  )
    return fail('FC-SUBJECT', 'INVALID_WAITER');
  return ok(
    freeze({
      run,
      story,
      generation,
      candidate,
      candidateContentDigest,
      eligibilityBasis,
      comparator: freeze({ priority, ordinal, story }),
      waitedAt,
    }),
  );
}
function proposed(
  state: readonly RegistryRecord[],
  input: unknown,
): RegistryResult<Readonly<{ binding: RegistryBinding; expectedPosition: number; expectedDigest: string }>> {
  if (!plain(input) || !exact(input, ['binding', 'expectedDigest', 'expectedPosition']))
    return fail('FC-INPUT', 'INVALID_APPEND_REQUEST');
  const normalized = binding(data(input, 'binding'));
  const expectedPosition = data(input, 'expectedPosition');
  const expectedDigest = data(input, 'expectedDigest');
  if (!normalized.ok) return normalized;
  if (
    typeof expectedPosition !== 'number' ||
    !Number.isSafeInteger(expectedPosition) ||
    expectedPosition < -1 ||
    !isDigest(expectedDigest)
  )
    return fail('FC-INPUT', 'INVALID_EXPECTED_HEAD');
  const last = state.at(-1);
  const position = last?.position ?? -1;
  const digest = last?.contentDigest ?? GENESIS_DIGEST;
  if (expectedPosition !== position || expectedDigest !== digest) return fail('FC-FENCE', 'EXPECTED_HEAD_MISMATCH');
  return ok(freeze({ binding: normalized.value, expectedPosition, expectedDigest }));
}
function compare(left: Waiter, right: Waiter): number {
  for (const [a, b] of [
    [left.comparator.priority, right.comparator.priority],
    [left.comparator.ordinal, right.comparator.ordinal],
    [left.comparator.story, right.comparator.story],
  ] as const) {
    if (a < b) return -1;
    if (a > b) return 1;
  }
  return 0;
}
type AuthorityFacts = Readonly<{
  authority: string;
  candidate: string;
  candidateContentDigest: string;
  eligibilityBasis: string;
  generation: string;
  registry: string;
  target: string;
  story: string;
}>;
function authorityFacts(record: RegistryRecord): RegistryResult<AuthorityFacts> {
  const content = record.content as Record<string, CanonicalJson>;
  const source = record.variant === 'atomic-rebind' ? content.newAuthority : content;
  if (!plain(source)) return fail('FC-TRUST', 'INVALID_AUTHORITY_RECORD');
  const authority = record.variant === 'atomic-rebind' ? data(source, 'authority') : record.authority;
  const candidate = data(source, 'candidate');
  const candidateContentDigest = data(source, 'candidateContentDigest');
  const eligibilityBasis = data(source, 'eligibilityBasis');
  const story = data(source, 'story');
  const fence = data(source, 'fence');
  if (!plain(fence) || !exact(fence, ['generation', 'registry', 'target']))
    return fail('FC-TRUST', 'INVALID_AUTHORITY_RECORD');
  const generation = data(fence, 'generation');
  const registry = data(fence, 'registry');
  const target = data(fence, 'target');
  if (
    typeof authority !== 'string' ||
    typeof candidate !== 'string' ||
    !isDigest(candidateContentDigest) ||
    !isDigest(eligibilityBasis) ||
    typeof generation !== 'string' ||
    typeof registry !== 'string' ||
    typeof target !== 'string' ||
    typeof story !== 'string' ||
    authority !== record.authority ||
    !parseIdentity('ID-AUTH', authority).ok ||
    !parseIdentity('ID-CAND', candidate).ok ||
    !parseIdentity('ID-GEN', generation).ok ||
    !parseIdentity('ID-STORY', story).ok ||
    registry !== record.registry ||
    target !== record.target
  )
    return fail('FC-TRUST', 'INVALID_AUTHORITY_RECORD');
  return ok(
    freeze({ authority, candidate, candidateContentDigest, eligibilityBasis, generation, registry, target, story }),
  );
}
function releaseProof(input: unknown, held: AuthorityFacts): RegistryResult<CanonicalJson> {
  const proof = canonical(input);
  if (!plain(proof)) return fail('FC-AUTHORITY', 'INVALID_RELEASE_PROOF');
  const kind = data(proof, 'kind');
  const authority = data(proof, 'authority');
  const candidate = data(proof, 'candidate');
  const generation = data(proof, 'generation');
  const registry = data(proof, 'registry');
  const target = data(proof, 'target');
  if (
    authority !== held.authority ||
    candidate !== held.candidate ||
    generation !== held.generation ||
    registry !== held.registry ||
    target !== held.target
  )
    return fail('FC-AUTHORITY', 'INVALID_RELEASE_PROOF');
  if (kind === 'structural-no-effect') {
    return exact(proof, ['authority', 'candidate', 'generation', 'kind', 'registry', 'target'])
      ? ok(proof)
      : fail('FC-AUTHORITY', 'INVALID_RELEASE_PROOF');
  }
  if (
    kind !== 'reconciled-operations' ||
    !exact(proof, ['authority', 'candidate', 'generation', 'kind', 'operations', 'registry', 'target'])
  )
    return fail('FC-AUTHORITY', 'INVALID_RELEASE_PROOF');
  const operations = data(proof, 'operations');
  if (!Array.isArray(operations) || operations.length === 0) return fail('FC-AUTHORITY', 'INVALID_RELEASE_PROOF');
  const ids = new Set<string>();
  for (const operation of operations) {
    if (!plain(operation) || !exact(operation, ['evidenceDigest', 'operation', 'outcome']))
      return fail('FC-AUTHORITY', 'INVALID_RELEASE_PROOF');
    const operationId = data(operation, 'operation');
    if (
      typeof operationId !== 'string' ||
      !parseIdentity('ID-OP', operationId).ok ||
      !isDigest(data(operation, 'evidenceDigest')) ||
      data(operation, 'outcome') !== 'resolved' ||
      ids.has(operationId)
    )
      return fail('FC-AUTHORITY', 'INVALID_RELEASE_PROOF');
    ids.add(operationId);
  }
  return ok(proof);
}
function record(
  bindingValue: RegistryBinding,
  state: RegistryRecord[],
  expectedHeadPosition: number,
  expectedHeadDigest: string,
  variant: RegistryRecord['variant'],
  content: CanonicalJson,
  authority?: string,
  waiterHandle?: Handle,
): RegistryResult<RegistryRecord> {
  const position = state.length;
  const previousDigest = state.at(-1)?.contentDigest ?? GENESIS_DIGEST;
  const staged = stageDigest({
    domain: 'REGISTRY-RECORD',
    excludePaths: ['contentDigest', 'handle'],
    value: {
      version: REGISTRY_VERSION,
      registry: bindingValue.registry,
      target: bindingValue.target,
      expectedHeadPosition,
      expectedHeadDigest,
      position,
      previousDigest,
      predecessorDigest: previousDigest,
      variant,
      authority: authority ?? null,
      waiter: waiterHandle ?? null,
      content,
      contentDigest: '',
      handle: null,
    },
  });
  if (!staged.ok) return fail('FC-INPUT', 'INVALID_REGISTRY_RECORD');
  const handle = freeze({ registry: bindingValue.registry, position, contentDigest: staged.value.digest });
  return ok(
    freeze({
      version: REGISTRY_VERSION,
      registry: bindingValue.registry,
      target: bindingValue.target,
      expectedHeadPosition,
      expectedHeadDigest,
      position,
      previousDigest,
      predecessorDigest: previousDigest,
      contentDigest: staged.value.digest,
      variant,
      handle,
      ...(authority ? { authority } : {}),
      ...(waiterHandle ? { waiter: waiterHandle } : {}),
      content,
    }),
  );
}
export function faultCode(fault: Exclude<Fault, 'after-flush' | 'after-witness' | 'lost-ack'>): string {
  return {
    'witness-absent': 'WITNESS_ABSENT',
    'witness-ahead': 'WITNESS_AHEAD',
    'witness-contradiction': 'WITNESS_MISMATCH',
    fork: 'REGISTRY_FORK',
    rollback: 'REGISTRY_ROLLBACK',
  }[fault];
}

/** Scripted, unapproved semantic fixture. Witness state is a separate logical control and fault surface; it is not a provider. */
export function createScriptedRegistry() {
  const entries = new Map<string, RegistryRecord[]>();
  const witnesses = new Map<string, Readonly<{ position: number; digest: string }>>();
  const faults = new Map<string, Exclude<Fault, 'after-flush' | 'after-witness' | 'lost-ack'>>();
  const key = (value: RegistryBinding) => `${value.registry}\u0000${value.target}`;
  const state = (value: RegistryBinding) => {
    const existing = entries.get(key(value));
    if (existing) return existing;
    const created: RegistryRecord[] = [];
    entries.set(key(value), created);
    return created;
  };
  const trusted = (value: RegistryBinding, records: readonly RegistryRecord[]): RegistryResult<void> => {
    const fault = faults.get(key(value));
    if (fault) return fail('FC-TRUST', faultCode(fault));
    const witnessed = witnesses.get(key(value));
    const latest = records.at(-1);
    const position = latest?.position ?? -1;
    const digest = latest?.contentDigest ?? GENESIS_DIGEST;
    if (!witnessed) return fail('FC-TRUST', 'WITNESS_ABSENT');
    if (witnessed.position > position) return fail('FC-TRUST', 'WITNESS_AHEAD');
    if (witnessed.position !== position || witnessed.digest !== digest) return fail('FC-TRUST', 'WITNESS_MISMATCH');
    return ok(undefined);
  };
  const append = (
    input: unknown,
    variant: RegistryRecord['variant'],
    content: CanonicalJson,
    authority?: string,
    waiterHandle?: Handle,
    fault?: unknown,
  ): RegistryResult<RegistryRecord> => {
    const rawBinding = plain(input) ? binding(data(input, 'binding')) : fail('FC-SUBJECT', 'INVALID_REGISTRY_BINDING');
    if (!rawBinding.ok) return rawBinding;
    const records = state(rawBinding.value);
    const checked = proposed(records, {
      binding: rawBinding.value,
      expectedPosition: plain(input) ? data(input, 'expectedPosition') : undefined,
      expectedDigest: plain(input) ? data(input, 'expectedDigest') : undefined,
    });
    if (!checked.ok) return checked;
    const currency = records.length ? trusted(rawBinding.value, records) : ok(undefined);
    if (!currency.ok) return currency;
    const created = record(
      rawBinding.value,
      records,
      checked.value.expectedPosition,
      checked.value.expectedDigest,
      variant,
      content,
      authority,
      waiterHandle,
    );
    if (!created.ok) return created;
    records.push(created.value);
    if (fault === 'after-flush') return fail('FC-TRUST', 'ACK_LOST');
    witnesses.set(
      key(rawBinding.value),
      freeze({ position: created.value.position, digest: created.value.contentDigest }),
    );
    if (fault === 'after-witness' || fault === 'lost-ack') return fail('FC-TRUST', 'ACK_LOST');
    return created;
  };
  const find = (records: readonly RegistryRecord[], handle: unknown): RegistryResult<RegistryRecord> => {
    if (!plain(handle) || !exact(handle, ['contentDigest', 'position', 'registry']))
      return fail('FC-INPUT', 'INVALID_WAITER_HANDLE');
    const position = data(handle, 'position');
    const contentDigest = data(handle, 'contentDigest');
    const registry = data(handle, 'registry');
    const found =
      isPosition(position) && isDigest(contentDigest) && typeof registry === 'string' ? records[position] : undefined;
    return found && found.handle.contentDigest === contentDigest && found.registry === registry
      ? ok(found)
      : fail('FC-FENCE', 'UNKNOWN_WAITER');
  };
  const active = (records: readonly RegistryRecord[]) => {
    const withdrawn = new Set(
      records
        .filter((entry) => entry.variant === 'withdrawal')
        .map((entry) => (entry.content as Record<string, CanonicalJson>).waiterDigest),
    );
    const consumed = new Set(
      records
        .filter((entry) => entry.variant === 'grant' || entry.variant === 'atomic-rebind')
        .map((entry) => entry.waiter?.contentDigest)
        .filter((value): value is string => value !== undefined),
    );
    return records.filter(
      (entry) =>
        entry.variant === 'waiter' && !withdrawn.has(entry.contentDigest) && !consumed.has(entry.contentDigest),
    );
  };
  const currentAuthority = (records: readonly RegistryRecord[]) =>
    records.reduce<RegistryRecord | undefined>(
      (current, entry) =>
        entry.variant === 'grant' || entry.variant === 'atomic-rebind'
          ? entry
          : entry.variant === 'release'
            ? undefined
            : current,
      undefined,
    );
  return freeze({
    waiter(input: unknown) {
      const candidate = plain(input) ? waiter(data(input, 'waiter')) : fail('FC-INPUT', 'INVALID_WAITER');
      if (!candidate.ok) return candidate;
      const content = canonical({ waiter: candidate.value });
      if (!content) return fail('FC-INPUT', 'INVALID_WAITER');
      return append(input, 'waiter', content, undefined, undefined, plain(input) ? data(input, 'fault') : undefined);
    },
    withdrawal(input: unknown) {
      const raw = plain(input) ? binding(data(input, 'binding')) : fail('FC-SUBJECT', 'INVALID_REGISTRY_BINDING');
      if (!raw.ok) return raw;
      const records = state(raw.value);
      const selected = find(records, plain(input) ? data(input, 'waiter') : undefined);
      const basis = plain(input) ? data(input, 'eligibilityBasis') : undefined;
      const reason = plain(input) ? data(input, 'reason') : undefined;
      if (!selected.ok) return selected;
      if (selected.value.variant !== 'waiter' || !isDigest(basis) || typeof reason !== 'string')
        return fail('FC-AUTHORITY', 'INVALID_WITHDRAWAL');
      const content = canonical({ waiterDigest: selected.value.contentDigest, eligibilityBasis: basis, reason });
      return content
        ? append(input, 'withdrawal', content, undefined, selected.value.handle)
        : fail('FC-INPUT', 'INVALID_WITHDRAWAL');
    },
    grant(input: unknown) {
      const raw = plain(input) ? binding(data(input, 'binding')) : fail('FC-SUBJECT', 'INVALID_REGISTRY_BINDING');
      if (!raw.ok) return raw;
      const records = state(raw.value);
      const selected = find(records, plain(input) ? data(input, 'waiter') : undefined);
      const basis = plain(input) ? data(input, 'eligibilityBasis') : undefined;
      const targetBasisDigest = plain(input) ? data(input, 'targetBasisDigest') : undefined;
      if (!selected.ok) return selected;
      if (currentAuthority(records)) return fail('FC-AUTHORITY', 'AUTHORITY_ALREADY_HELD');
      if (selected.value.variant !== 'waiter') return fail('FC-AUTHORITY', 'INVALID_WAITER');
      if (targetBasisDigest !== undefined && !isDigest(targetBasisDigest))
        return fail('FC-AUTHORITY', 'INVALID_TARGET_BASIS');
      if (
        records.some(
          (entry) =>
            (entry.variant === 'grant' || entry.variant === 'atomic-rebind') &&
            entry.waiter?.contentDigest === selected.value.contentDigest,
        )
      )
        return fail('FC-AUTHORITY', 'WAITER_ALREADY_CONSUMED');
      const details = (selected.value.content as Record<string, CanonicalJson>).waiter as unknown;
      const parsed = waiter(details);
      if (!parsed.ok || basis !== parsed.value.eligibilityBasis) return fail('FC-AUTHORITY', 'STALE_ELIGIBILITY');
      if (
        records.some(
          (entry) =>
            entry.variant === 'withdrawal' &&
            (entry.content as Record<string, CanonicalJson>).waiterDigest === selected.value.contentDigest,
        )
      )
        return fail('FC-AUTHORITY', 'WAITER_WITHDRAWN');
      const eligible: Array<Readonly<{ entry: RegistryRecord; parsed: Waiter }>> = [];
      for (const entry of active(records)) {
        const item = waiter((entry.content as Record<string, CanonicalJson>).waiter);
        if (!item.ok) return fail('FC-TRUST', 'INVALID_RECORDED_WAITER');
        eligible.push(freeze({ entry, parsed: item.value }));
      }
      const least = [...eligible].sort((left, right) => compare(left.parsed, right.parsed))[0];
      if (!least || least.entry.contentDigest !== selected.value.contentDigest)
        return fail('FC-AUTHORITY', 'NOT_LEAST_ELIGIBLE_WAITER');
      if (
        records.some(
          (entry) =>
            (entry.variant === 'grant' || entry.variant === 'atomic-rebind') &&
            (entry.content as Record<string, CanonicalJson>).story === parsed.value.story,
        )
      )
        return fail('FC-AUTHORITY', 'STORY_ALREADY_GRANTED');
      const authority = `${raw.value.target}/auth/${records.filter((entry) => entry.variant === 'grant' || entry.variant === 'atomic-rebind').length + 1}`;
      if (!parseIdentity('ID-AUTH', authority).ok) return fail('FC-SUBJECT', 'INVALID_AUTHORITY');
      const content = canonical({
        waiter: selected.value.handle,
        eligibilityBasis: basis,
        candidate: parsed.value.candidate,
        candidateContentDigest: parsed.value.candidateContentDigest,
        fence: { registry: raw.value.registry, target: raw.value.target, generation: parsed.value.generation },
        story: parsed.value.story,
        ...(targetBasisDigest !== undefined ? { targetBasisDigest } : {}),
      });
      return content
        ? append(
            input,
            'grant',
            content,
            authority,
            selected.value.handle,
            plain(input) ? data(input, 'fault') : undefined,
          )
        : fail('FC-INPUT', 'INVALID_GRANT');
    },
    release(input: unknown) {
      const raw = plain(input) ? binding(data(input, 'binding')) : fail('FC-SUBJECT', 'INVALID_REGISTRY_BINDING');
      if (!raw.ok) return raw;
      const held = currentAuthority(state(raw.value));
      const authority = plain(input) ? data(input, 'authority') : undefined;
      const proof = plain(input) ? data(input, 'proof') : undefined;
      if (!held || authority !== held.authority) return fail('FC-FENCE', 'STALE_AUTHORITY');
      const facts = authorityFacts(held);
      if (!facts.ok) return facts;
      const validatedProof = releaseProof(proof, facts.value);
      if (!validatedProof.ok) return validatedProof;
      const content = canonical({
        authority: held.authority,
        authorityBinding: facts.value,
        releaseProof: validatedProof.value,
      });
      return content
        ? append(input, 'release', content, held.authority, held.waiter)
        : fail('FC-INPUT', 'INVALID_RELEASE');
    },
    atomicRebind(input: unknown) {
      const raw = plain(input) ? binding(data(input, 'binding')) : fail('FC-SUBJECT', 'INVALID_REGISTRY_BINDING');
      if (!raw.ok) return raw;
      const held = currentAuthority(state(raw.value));
      const authority = plain(input) ? data(input, 'authority') : undefined;
      const proof = plain(input) ? data(input, 'releaseProof') : undefined;
      const newCandidate = plain(input) ? data(input, 'candidate') : undefined;
      const candidateContentDigest = plain(input) ? data(input, 'candidateContentDigest') : undefined;
      const targetBasisDigest = plain(input) ? data(input, 'targetBasisDigest') : undefined;
      const eligibilityBasis = plain(input) ? data(input, 'eligibilityBasis') : undefined;
      const generation = plain(input) ? data(input, 'generation') : undefined;
      if (!held || authority !== held.authority) return fail('FC-FENCE', 'STALE_AUTHORITY');
      const facts = authorityFacts(held);
      if (!facts.ok) return facts;
      const validatedProof = releaseProof(proof, facts.value);
      if (!validatedProof.ok) return validatedProof;
      if (newCandidate === facts.value.candidate) return fail('FC-AUTHORITY', 'UNCHANGED_CANDIDATE_REBIND');
      if (
        typeof newCandidate !== 'string' ||
        !parseIdentity('ID-CAND', newCandidate).ok ||
        !isDigest(candidateContentDigest) ||
        (targetBasisDigest !== undefined && !isDigest(targetBasisDigest)) ||
        !isDigest(eligibilityBasis) ||
        typeof generation !== 'string' ||
        !parseIdentity('ID-GEN', generation).ok ||
        !newCandidate.startsWith(`${facts.value.story}/cand/`) ||
        !generation.startsWith(`${facts.value.story.split('/story/')[0]}/gen/`)
      )
        return fail('FC-AUTHORITY', 'INVALID_REBIND');
      const next = `${raw.value.target}/auth/${state(raw.value).filter((entry) => entry.variant === 'grant' || entry.variant === 'atomic-rebind').length + 1}`;
      const newAuthority = {
        authority: next,
        candidate: newCandidate,
        candidateContentDigest,
        eligibilityBasis,
        generation,
        registry: raw.value.registry,
        target: raw.value.target,
        story: facts.value.story,
        fence: { registry: raw.value.registry, target: raw.value.target, generation },
        ...(targetBasisDigest !== undefined ? { targetBasisDigest } : {}),
      };
      const content = canonical({
        oldAuthority: facts.value,
        releaseProof: validatedProof.value,
        newAuthority,
      });
      return content
        ? append(input, 'atomic-rebind', content, next, held.waiter, plain(input) ? data(input, 'fault') : undefined)
        : fail('FC-INPUT', 'INVALID_REBIND');
    },
    snapshot(input: unknown) {
      const normalized = binding(input);
      if (!normalized.ok) return normalized;
      const records = state(normalized.value);
      const trust = records.length ? trusted(normalized.value, records) : ok(undefined);
      if (!trust.ok) return trust;
      const last = records.at(-1);
      return ok(freeze({ position: last?.position ?? -1, digest: last?.contentDigest ?? GENESIS_DIGEST }));
    },
    readback(input: unknown) {
      if (!plain(input) || !exact(input, ['binding', 'position'])) return fail('FC-INPUT', 'INVALID_READBACK');
      const normalized = binding(data(input, 'binding'));
      const position = data(input, 'position');
      if (!normalized.ok) return normalized;
      if (!isPosition(position)) return fail('FC-INPUT', 'INVALID_READBACK');
      const records = state(normalized.value);
      const trust = trusted(normalized.value, records);
      if (!trust.ok) return trust;
      const found = records[position];
      return ok(
        found ? freeze({ kind: 'committed' as const, record: found }) : freeze({ kind: 'absent' as const, position }),
      );
    },
    injectFault(input: unknown, fault: unknown) {
      const normalized = binding(input);
      if (!normalized.ok) return normalized;
      if (
        typeof fault !== 'string' ||
        !['witness-absent', 'witness-ahead', 'witness-contradiction', 'fork', 'rollback'].includes(fault)
      )
        return fail('FC-INPUT', 'INVALID_FAULT');
      faults.set(key(normalized.value), fault as Exclude<Fault, 'after-flush' | 'after-witness' | 'lost-ack'>);
      return ok(undefined);
    },
    reconcileMirror(input: unknown) {
      if (!plain(input) || !exact(input, ['binding', 'mirrorDigest'])) return fail('FC-INPUT', 'INVALID_MIRROR');
      const normalized = binding(data(input, 'binding'));
      const mirrorDigest = data(input, 'mirrorDigest');
      if (!normalized.ok) return normalized;
      if (!isDigest(mirrorDigest)) return fail('FC-INPUT', 'INVALID_MIRROR');
      const records = state(normalized.value);
      const trust = trusted(normalized.value, records);
      if (!trust.ok) return trust;
      const authoritativeDigest = records.at(-1)?.contentDigest ?? GENESIS_DIGEST;
      return ok(
        freeze(
          mirrorDigest === authoritativeDigest
            ? { kind: 'current' as const, authoritativeDigest }
            : { kind: 'repair-required' as const, authoritativeDigest },
        ),
      );
    },
  });
}
