/**
 * Pure, pre-Run Envelope Builder composition.  This module deliberately has no
 * ports, providers, setup execution, approval, intake, or controller imports.
 */
import { type CanonicalJson, stageDigest } from '@agentic-workflow-kit/jig-codec';
import { REPOSITORY_POLICY_CATALOGUE } from './repository-policy-catalogue.js';
import { validateSourcePlan } from './source.js';

export const ENVELOPE_POLICY_VERSION = 'jig.envelope-policy.v1';

type Bound = Readonly<{ default: number; lower: number; upper: number; unit: 'count' | 'seconds' }>;
export const ENVELOPE_BOUNDS = Object.freeze({
  'BND-REWORK': Object.freeze({ default: 2, lower: 1, upper: 5, unit: 'count' }),
  'BND-RETRY': Object.freeze({ default: 3, lower: 1, upper: 5, unit: 'count' }),
  'BND-REFRESH': Object.freeze({ default: 2, lower: 1, upper: 5, unit: 'count' }),
  'BND-WAIT-DECISION': Object.freeze({
    default: 72 * 60 * 60,
    lower: 60 * 60,
    upper: 30 * 24 * 60 * 60,
    unit: 'seconds',
  }),
  'BND-WAIT-MECHANISM': Object.freeze({ default: 15 * 60, lower: 5, upper: 2 * 60 * 60, unit: 'seconds' }),
  'BND-WAIT-CAPACITY': Object.freeze({
    default: 24 * 60 * 60,
    lower: 60 * 60,
    upper: 30 * 24 * 60 * 60,
    unit: 'seconds',
  }),
  'BND-WAIT-LEDGER': Object.freeze({ default: 30, lower: 1, upper: 5 * 60, unit: 'seconds' }),
  'BND-WAIT-TARGET': Object.freeze({ default: 30 * 60, lower: 60, upper: 24 * 60 * 60, unit: 'seconds' }),
  'BND-IDLE': Object.freeze({ default: 30 * 60, lower: 5 * 60, upper: 8 * 60 * 60, unit: 'seconds' }),
  'BND-SILENCE': Object.freeze({ default: 5 * 60, lower: 10, upper: 30 * 60, unit: 'seconds' }),
  'BND-RECOVERY': Object.freeze({ default: 3, lower: 1, upper: 5, unit: 'count' }),
  'BND-RETIRE': Object.freeze({ default: 3, lower: 1, upper: 5, unit: 'count' }),
} as const satisfies Record<string, Bound>);

export type EnvelopeFailure = Readonly<{ family: 'FC-INPUT'; code: string }>;
export type EnvelopeResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: EnvelopeFailure }>;
export type EnvelopeProposal = Readonly<{
  version: typeof ENVELOPE_POLICY_VERSION;
  track: string;
  policy: Readonly<Record<string, number>>;
  bounds: Readonly<Record<string, Readonly<{ value: number; rangeVersion: 'jig.envelope-bounds.v1' }>>>;
  digests: Readonly<
    Record<'plan' | 'policy' | 'profile' | 'artifacts' | 'setup' | 'ranges' | 'candidate' | 'suite' | 'probe', string>
  >;
  proposalDigest: string;
}>;

const fail = (code: string): EnvelopeResult<never> =>
  Object.freeze({ ok: false, error: Object.freeze({ family: 'FC-INPUT', code }) });
const ok = <T>(value: T): EnvelopeResult<T> => Object.freeze({ ok: true, value });
const freeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const name = (value: unknown, prefix: string): value is string =>
  typeof value === 'string' && new RegExp(`^${prefix}/[a-z0-9](?:[a-z0-9-]{0,63})$`, 'u').test(value);
const digest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const RESOURCE_CLASSES = new Set([
  'RC-ISOLATION',
  'RC-SESSION',
  'RC-IMPL-TURN',
  'RC-REVIEW-TURN',
  'RC-VERIFY',
  'RC-DELIVERY',
  'RC-FINALIZER',
]);
const RESOURCE_WIRE_IDS = Object.freeze({
  'rc-isolation': 'RC-ISOLATION',
  'rc-session': 'RC-SESSION',
  'rc-impl-turn': 'RC-IMPL-TURN',
  'rc-review-turn': 'RC-REVIEW-TURN',
  'rc-verify': 'RC-VERIFY',
  'rc-delivery': 'RC-DELIVERY',
  'rc-finalizer': 'RC-FINALIZER',
} as const);
const CREDENTIAL_SHAPES = [
  /\bbearer\s+[a-z0-9._~+/-]{8,}/iu,
  /\b(?:api[ _-]?key|token|secret|password)\s*[:=]\s*\S{8,}/iu,
  /\b(?:ghp|gho|github_pat|sk|rk|pk)_[a-z0-9_-]{8,}/iu,
  /\beyJ[a-z0-9_-]{8,}\.[a-z0-9_-]{4,}\.[a-z0-9_-]{4,}\b/u,
] as const;
const exactKeys = (value: Record<string, CanonicalJson>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

/** Copies plain data through descriptors, never invoking an attacker supplied getter or proxy trap. */
function snapshot(value: unknown, depth = 0): CanonicalJson | undefined {
  try {
    if (depth > 32) return undefined;
    if (
      value === null ||
      (typeof value === 'string' && [...value].length <= 4_096) ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value))
    )
      return value;
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) return undefined;
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const length = descriptors.length as PropertyDescriptor | undefined;
      if (
        !length ||
        !('value' in length) ||
        typeof length.value !== 'number' ||
        !Number.isSafeInteger(length.value) ||
        length.value > 128
      )
        return undefined;
      const output: CanonicalJson[] = [];
      for (let index = 0; index < length.value; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor?.enumerable || !('value' in descriptor)) return undefined;
        const child = snapshot(descriptor.value, depth + 1);
        if (child === undefined) return undefined;
        output.push(child);
      }
      if (Reflect.ownKeys(value).length !== length.value + 1) return undefined;
      return output;
    }
    if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return undefined;
    const keys = Reflect.ownKeys(value);
    if (keys.length > 128 || keys.some((key) => typeof key !== 'string')) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const result: Record<string, CanonicalJson> = {};
    for (const key of keys) {
      const descriptor = descriptors[key as string];
      if (!descriptor?.enumerable || !('value' in descriptor)) return undefined;
      const child = snapshot(descriptor.value, depth + 1);
      if (child === undefined) return undefined;
      Object.defineProperty(result, key as string, {
        value: child,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return result;
  } catch {
    return undefined;
  }
}

function object(value: CanonicalJson | undefined): Record<string, CanonicalJson> | undefined {
  return value !== undefined && !Array.isArray(value) && value !== null && typeof value === 'object'
    ? (value as Record<string, CanonicalJson>)
    : undefined;
}
function stage(domain: string, value: CanonicalJson): string | undefined {
  const result = stageDigest({ domain, value, excludePaths: [] });
  return result.ok ? result.value.digest : undefined;
}
function containsCredential(value: CanonicalJson): boolean {
  if (typeof value === 'string') return CREDENTIAL_SHAPES.some((shape) => shape.test(value));
  if (Array.isArray(value)) return value.some(containsCredential);
  return value !== null && typeof value === 'object' && Object.values(value).some(containsCredential);
}

export function composeEnvelope(input: unknown): EnvelopeResult<EnvelopeProposal> {
  const root = object(snapshot(input));
  if (!root || !exactKeys(root, ['plan', 'policy', 'profile', 'artifacts', 'setup', 'ruleSurface', 'guidance']))
    return fail('INVALID_ENVELOPE_INPUT');
  const plan = object(root.plan);
  const policyInput = object(root.policy);
  const profile = object(root.profile);
  const setup = object(root.setup);
  const rules = object(root.ruleSurface);
  const guidance = object(root.guidance);
  const artifacts = root.artifacts;
  if (!plan || !policyInput || !profile || !setup || !rules || !guidance || !Array.isArray(artifacts))
    return fail('MISSING_COMPOSITION_INPUT');
  if (containsCredential(root)) return fail('CREDENTIAL_SHAPED_INPUT');
  if (
    !exactKeys(policyInput, ['track', 'selections', 'bounds', 'capacities', 'reserves']) ||
    !exactKeys(profile, [
      'track',
      'version',
      'model',
      'provider',
      'effort',
      'cost',
      'promptStrategy',
      'promptDigest',
      'roles',
    ]) ||
    !exactKeys(setup, ['track', 'recipeDigest', 'inputFingerprintRule', 'pathManifest', 'ruleManifest']) ||
    !exactKeys(rules, ['track', 'version', 'entries']) ||
    !exactKeys(guidance, ['rationale', 'suitableUse', 'tradeoffs'])
  )
    return fail('UNKNOWN_COMPOSITION_FIELD');
  const approvedPlan = validateSourcePlan(plan);
  if (!approvedPlan.ok) return fail(approvedPlan.error.code);
  const normalizeResource = (wire: string): string | undefined =>
    RESOURCE_WIRE_IDS[wire as keyof typeof RESOURCE_WIRE_IDS];
  const normalizedPlanResources = Object.keys(approvedPlan.value.policy.capacities).map(normalizeResource);
  if (
    normalizedPlanResources.some((resource) => resource === undefined) ||
    new Set(normalizedPlanResources).size !== normalizedPlanResources.length ||
    Object.keys(approvedPlan.value.policy.reserves).some((wire) => normalizeResource(wire) === undefined) ||
    approvedPlan.value.stories.some((story) =>
      Object.keys(story.demand).some((wire) => normalizeResource(wire) === undefined),
    )
  )
    return fail('CONFIGURATION_INCOMPATIBLE');
  const normalizedPlan = {
    capacities: Object.fromEntries(
      Object.entries(approvedPlan.value.policy.capacities).map(([wire, amount]) => [normalizeResource(wire)!, amount]),
    ),
    reserves: Object.fromEntries(
      Object.entries(approvedPlan.value.policy.reserves).map(([wire, amount]) => [normalizeResource(wire)!, amount]),
    ),
    demands: Object.fromEntries(
      approvedPlan.value.stories.map((story) => [
        story.key,
        Object.fromEntries(Object.entries(story.demand).map(([wire, amount]) => [normalizeResource(wire)!, amount])),
      ]),
    ),
  };
  const track = approvedPlan.value.track;
  if (
    !name(track, 'track') ||
    policyInput.track !== track ||
    profile.track !== track ||
    setup.track !== track ||
    rules.track !== track
  )
    return fail('CROSS_TRACK_INPUT');
  const selected = object(policyInput.selections);
  if (!selected) return fail('INVALID_POLICY');
  const policy: Record<string, number> = {};
  for (const [key, floor] of Object.entries(REPOSITORY_POLICY_CATALOGUE.floors)) {
    const choice = selected[key];
    if (!integer(floor) || !integer(choice) || choice < floor) return fail('WEAKENED_FLOOR');
    policy[key] = choice;
  }
  if (
    Object.keys(selected).some(
      (key) => !Object.hasOwn(REPOSITORY_POLICY_CATALOGUE.floors, key) || !integer(selected[key]),
    )
  )
    return fail('UNKNOWN_RULE');
  const promptStrategy = object(profile.promptStrategy);
  if (
    !digest(profile.promptDigest) ||
    !digest(setup.recipeDigest) ||
    typeof profile.model !== 'string' ||
    typeof profile.provider !== 'string' ||
    typeof profile.effort !== 'string' ||
    typeof profile.cost !== 'string' ||
    !promptStrategy ||
    !exactKeys(promptStrategy, ['artifact', 'digest', 'version']) ||
    typeof promptStrategy.artifact !== 'string' ||
    !digest(promptStrategy.digest) ||
    typeof promptStrategy.version !== 'string' ||
    promptStrategy.digest !== profile.promptDigest ||
    typeof setup.inputFingerprintRule !== 'string' ||
    !Array.isArray(profile.roles) ||
    !Array.isArray(setup.pathManifest) ||
    !Array.isArray(setup.ruleManifest) ||
    ![guidance.rationale, guidance.suitableUse, guidance.tradeoffs].every((value) => typeof value === 'string')
  )
    return fail('INVALID_PROFILE_OR_SETUP');
  const artifactIds = new Set<string>();
  const artifactRecords = new Map<string, Record<string, CanonicalJson>>();
  for (const artifact of artifacts) {
    const item = object(artifact);
    if (
      !item ||
      item.track !== track ||
      typeof item.kind !== 'string' ||
      typeof item.version !== 'string' ||
      !digest(item.digest)
    )
      return fail('INVALID_ARTIFACT');
    if (!exactKeys(item, ['track', 'kind', 'version', 'digest', 'id']) || typeof item.id !== 'string')
      return fail('INVALID_ARTIFACT');
    const id = `${item.id}:${item.kind}:${item.version}:${item.digest}`;
    if (artifactIds.has(id) || artifactRecords.has(item.id)) return fail('INVALID_ARTIFACT');
    artifactIds.add(id);
    artifactRecords.set(item.id, item);
  }
  const prompts = new Set<string>();
  if (
    ![...artifactIds].some(
      (id) => id === `${promptStrategy.artifact}:prompt-strategy:${promptStrategy.version}:${promptStrategy.digest}`,
    )
  )
    return fail('INVALID_PROFILE_REFERENCE');
  for (const role of profile.roles) {
    const entry = object(role);
    if (
      !entry ||
      !exactKeys(entry, ['role', 'prompt']) ||
      typeof entry.role !== 'string' ||
      typeof entry.prompt !== 'string' ||
      prompts.has(entry.prompt) ||
      !(() => {
        const artifact = artifactRecords.get(entry.prompt);
        return (
          artifact?.track === track &&
          artifact.kind === 'role-prompt' &&
          artifact.version === profile.version &&
          artifact.digest === profile.promptDigest
        );
      })()
    )
      return fail('INVALID_PROFILE_REFERENCE');
    prompts.add(entry.prompt);
  }
  const requestedBounds = object(policyInput.bounds);
  if (!requestedBounds) return fail('INVALID_BOUNDS');
  const bounds: Record<string, { value: number; rangeVersion: 'jig.envelope-bounds.v1' }> = {};
  if (!exactKeys(requestedBounds, Object.keys(ENVELOPE_BOUNDS))) return fail('INVALID_BOUNDS');
  for (const [id, definition] of Object.entries(ENVELOPE_BOUNDS)) {
    const value = requestedBounds[id];
    if (!integer(value) || value < definition.lower || value > definition.upper) return fail('BOUND_OUT_OF_RANGE');
    bounds[id] = { value, rangeVersion: 'jig.envelope-bounds.v1' };
  }
  if (!Array.isArray(rules.entries) || rules.entries.length === 0) return fail('INVALID_RULE_SURFACE');
  const ruleEntries = new Set<string>();
  for (const entry of rules.entries) {
    const item = object(entry);
    if (
      !item ||
      !exactKeys(item, ['path', 'rule']) ||
      typeof item.path !== 'string' ||
      typeof item.rule !== 'string' ||
      ruleEntries.has(`${item.path}\u0000${item.rule}`)
    )
      return fail('INVALID_RULE_SURFACE');
    ruleEntries.add(`${item.path}\u0000${item.rule}`);
  }
  const capacities = object(policyInput.capacities);
  const reserves = object(policyInput.reserves);
  if (!capacities || !reserves || capacities['RC-FINALIZER'] !== 1 || 'RC-FINALIZER' in reserves)
    return fail('INVALID_CAPACITY');
  for (const [resource, capacity] of Object.entries(capacities)) {
    if (
      !RESOURCE_CLASSES.has(resource) ||
      !integer(capacity) ||
      capacity < 1 ||
      (resource !== 'RC-FINALIZER' && capacity < 2)
    )
      return fail('INVALID_CAPACITY');
    if (
      resource !== 'RC-FINALIZER' &&
      (!integer(reserves[resource]) || reserves[resource] < 1 || reserves[resource] >= capacity)
    )
      return fail('INVALID_RESERVE');
  }
  if (
    Object.keys(reserves).some(
      (resource) => !RESOURCE_CLASSES.has(resource) || resource === 'RC-FINALIZER' || !(resource in capacities),
    )
  )
    return fail('INVALID_RESERVE');
  for (const [resource, hardCapacity] of Object.entries(normalizedPlan.capacities)) {
    const capacity = capacities[resource];
    const reserve = reserves[resource];
    if (
      resource === 'RC-FINALIZER'
        ? hardCapacity !== 1 || normalizedPlan.reserves[resource] !== 0
        : typeof capacity !== 'number' ||
          capacity > hardCapacity ||
          typeof reserve !== 'number' ||
          reserve < (normalizedPlan.reserves[resource] as number)
    )
      return fail('CONFIGURATION_INCOMPATIBLE');
  }
  const byStoryKey = new Map(approvedPlan.value.stories.map((story) => [story.key, story]));
  const demandAt = (key: string, resource: string, memo = new Map<string, number>()): number => {
    const memoKey = `${key}\u0000${resource}`;
    const known = memo.get(memoKey);
    if (known !== undefined) return known;
    const story = byStoryKey.get(key)!;
    const demand =
      ((normalizedPlan.demands[story.key] as Record<string, number>)[resource] ?? 0) +
      Math.max(0, ...story.dependsOn.map((dependency) => demandAt(dependency, resource, memo)));
    memo.set(memoKey, demand);
    return demand;
  };
  for (const resource of RESOURCE_CLASSES) {
    const demand = approvedPlan.value.stories.map((story) => demandAt(story.key, resource));
    const capacity = capacities[resource];
    if (capacity === undefined) {
      if (demand.some((value) => value > 0)) return fail('CONFIGURATION_INCOMPATIBLE');
    } else if (
      resource === 'RC-FINALIZER'
        ? demand.some((value) => value > 1)
        : demand.some(
            (value) =>
              value + (typeof reserves[resource] === 'number' ? reserves[resource] : 0) >
              (typeof capacity === 'number' ? capacity : 0),
          )
    )
      return fail('PLAN_FEASIBILITY_FAILED');
  }
  const canonical = {
    version: ENVELOPE_POLICY_VERSION,
    track,
    policy: { catalogue: REPOSITORY_POLICY_CATALOGUE, selections: selected, capacities, reserves },
    bounds,
    plan: approvedPlan.value as unknown as CanonicalJson,
    normalizedPlan,
    profile,
    artifacts,
    setup,
    ruleSurface: rules,
    guidance,
  } as CanonicalJson;
  const proposalDigest = stage('EP-PROPOSAL', canonical);
  const policyDigest = stage('EP-POLICY', policy);
  const profileDigest = stage('EP-PROFILE', profile);
  const artifactDigest = stage('EP-ARTIFACTS', artifacts);
  const setupDigest = stage('EP-SETUP', setup);
  const rangeDigest = stage('EP-RANGES', bounds);
  const planDigest = stage('EP-PLAN', approvedPlan.value as unknown as CanonicalJson);
  const candidateDigest = stage('EP-CANDIDATE', approvedPlan.value as unknown as CanonicalJson);
  const suiteDigest = stage('EP-RULE-SURFACE', rules);
  const probeDigest = stage('EP-PROBE', { capacities, reserves });
  if (
    !digest(proposalDigest) ||
    !digest(planDigest) ||
    !digest(policyDigest) ||
    !digest(profileDigest) ||
    !digest(artifactDigest) ||
    !digest(setupDigest) ||
    !digest(rangeDigest) ||
    !digest(candidateDigest) ||
    !digest(suiteDigest) ||
    !digest(probeDigest)
  )
    return fail('DIGEST_FAILURE');
  return ok(
    freeze({
      version: ENVELOPE_POLICY_VERSION,
      track,
      policy,
      bounds,
      digests: {
        plan: planDigest,
        policy: policyDigest,
        profile: profileDigest,
        artifacts: artifactDigest,
        setup: setupDigest,
        ranges: rangeDigest,
        candidate: candidateDigest,
        suite: suiteDigest,
        probe: probeDigest,
      },
      proposalDigest,
    }),
  );
}
