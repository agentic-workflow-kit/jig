import type {
  BoundOwnerConfiguration,
  ConfigDoc,
  PolicyBasis,
  PolicyBasisDimension,
  PolicyDoc,
  PolicyRules,
  RepoPolicyFloorsDoc,
  WorkProfileDoc,
} from './types.js';

const SUPPORTED_GATING_POSTURES = new Set(['manual', 'assisted']);
const SUPPORTED_MERGE_SPECTRUM = new Set(['push', 'open-pr', 'merge']);
const SUPPORTED_BLOCK_RESOLUTION = new Set(['quarantine-replan', 'continue-independent-work']);
const SUPPORTED_EFFORT = new Set(['low', 'medium', 'high']);
const SUPPORTED_PROMPT_STRATEGIES = new Set(['dynamic-per-task', 'templated', 'role-prompt']);
const SUPPORTED_ROLE_REALIZATION = new Set(['single-agent', 'planner-executor', 'reviewer-assisted']);
const SUPPORTED_ISOLATION = new Set(['none', 'weak', 'strong']);
const ENFORCED_POLICY_DIMENSIONS = [
  'allowLocalDryRun',
  'gatingPosture',
  'mergeSpectrum',
  'concurrencyCeiling',
  'blockResolution',
  'ruleGoverningSurfaces',
  'capabilityIsolation',
];
const INERT_POLICY_DIMENSIONS: PolicyBasisDimension[] = [
  { dimension: 'retryBudget', followUp: 'retry-execution-engine' },
  { dimension: 'requiredReviews', followUp: 'required-review-evidence' },
  { dimension: 'escalationRules', followUp: 'doorbell-escalation-policy-surface' },
];
const POLICY_OWNED_WORK_PROFILE_FIELDS = new Set([
  'allowLocalDryRun',
  'gatingPosture',
  'mergeSpectrum',
  'concurrencyCeiling',
  'retryBudget',
  'requiredReviews',
  'escalationRules',
  'blockResolution',
  'ruleGoverningSurfaces',
  'capabilityIsolation',
  'policy',
  'rules',
]);

function assertObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Invalid ${field}: expected an object`);
  }

  return value as Record<string, unknown>;
}

function assertNoUnknownKeys(value: Record<string, unknown>, allowed: string[], field: string): void {
  const allowedKeys = new Set(allowed);
  const unknownKeys = Object.keys(value).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(
      `Invalid ${field}: unknown field${unknownKeys.length === 1 ? '' : 's'} ${unknownKeys
        .map((key) => `"${key}"`)
        .join(', ')}; remove unsupported keys or move policy-owned settings into the policy artifact`,
    );
  }
}

function readString(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid ${field}: expected a non-empty string`);
  }
  return value;
}

function readStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
    throw new Error(`Invalid ${field}: expected an array of non-empty strings`);
  }
  return [...new Set(value)];
}

function readInteger(value: unknown, field: string, minimum: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || (value as number) < minimum) {
    throw new Error(`Invalid ${field}: expected an integer >= ${minimum}`);
  }
  return value as number;
}

function isolationRank(value: 'none' | 'weak' | 'strong' | undefined): number {
  if (value === 'strong') return 3;
  if (value === 'weak') return 2;
  if (value === 'none') return 1;
  return 0;
}

function mergeCapabilityIsolation(
  policyIsolation: PolicyRules['capabilityIsolation'],
  floorIsolation: PolicyRules['capabilityIsolation'],
): PolicyRules['capabilityIsolation'] | undefined {
  if (!policyIsolation && !floorIsolation) {
    return undefined;
  }

  const merged: Record<string, 'none' | 'weak' | 'strong'> = {};
  for (const key of new Set([...Object.keys(policyIsolation ?? {}), ...Object.keys(floorIsolation ?? {})])) {
    const policyValue = policyIsolation?.[key];
    const floorValue = floorIsolation?.[key];
    const chosen = isolationRank(floorValue) > isolationRank(policyValue) ? floorValue : (policyValue ?? floorValue);
    if (chosen) {
      merged[key] = chosen;
    }
  }
  return merged;
}

function unionRuleGoverningSurfaces(
  policySurfaces: string[] | undefined,
  floorSurfaces: string[] | undefined,
): string[] | undefined {
  if (!policySurfaces && !floorSurfaces) {
    return undefined;
  }

  return [...new Set([...(policySurfaces ?? []), ...(floorSurfaces ?? [])])];
}

function normalizePolicyRules(
  value: unknown,
  field: string,
  options: {
    allowPartial: boolean;
  } = { allowPartial: false },
): PolicyRules {
  const record = assertObject(value, field);
  assertNoUnknownKeys(
    record,
    [
      'allowLocalDryRun',
      'ruleGoverningSurfaces',
      'capabilityIsolation',
      'gatingPosture',
      'mergeSpectrum',
      'concurrencyCeiling',
      'retryBudget',
      'requiredReviews',
      'escalationRules',
      'blockResolution',
    ],
    field,
  );

  const gatingPosture = readString(record.gatingPosture, `${field}.gatingPosture`);
  if (gatingPosture !== undefined && !SUPPORTED_GATING_POSTURES.has(gatingPosture)) {
    throw new Error(`Invalid ${field}.gatingPosture: expected "manual" or "assisted"`);
  }

  const mergeSpectrum = readString(record.mergeSpectrum, `${field}.mergeSpectrum`);
  if (mergeSpectrum !== undefined && !SUPPORTED_MERGE_SPECTRUM.has(mergeSpectrum)) {
    throw new Error(`Invalid ${field}.mergeSpectrum: expected "push", "open-pr", or "merge"`);
  }

  const blockResolution = readString(record.blockResolution, `${field}.blockResolution`);
  if (blockResolution !== undefined && !SUPPORTED_BLOCK_RESOLUTION.has(blockResolution)) {
    throw new Error(`Invalid ${field}.blockResolution: expected "quarantine-replan" or "continue-independent-work"`);
  }

  let allowLocalDryRun: boolean | undefined;
  if (record.allowLocalDryRun !== undefined) {
    if (typeof record.allowLocalDryRun !== 'boolean') {
      throw new Error(`Invalid ${field}.allowLocalDryRun: expected a boolean`);
    }
    allowLocalDryRun = record.allowLocalDryRun;
  }

  let capabilityIsolation: PolicyRules['capabilityIsolation'];
  if (record.capabilityIsolation !== undefined) {
    const isolationRecord = assertObject(record.capabilityIsolation, `${field}.capabilityIsolation`);
    capabilityIsolation = {};
    for (const [key, rawValue] of Object.entries(isolationRecord)) {
      if (typeof rawValue !== 'string' || !SUPPORTED_ISOLATION.has(rawValue)) {
        throw new Error(`Invalid ${field}.capabilityIsolation.${key}: expected "none", "weak", or "strong"`);
      }
      capabilityIsolation[key] = rawValue as 'none' | 'weak' | 'strong';
    }
  }

  let escalationRules: PolicyRules['escalationRules'];
  if (record.escalationRules !== undefined) {
    const escalationRecord = assertObject(record.escalationRules, `${field}.escalationRules`);
    assertNoUnknownKeys(escalationRecord, ['pauseOnOwnerDecision'], `${field}.escalationRules`);
    const pauseOnOwnerDecision = readString(
      escalationRecord.pauseOnOwnerDecision,
      `${field}.escalationRules.pauseOnOwnerDecision`,
    );
    if (pauseOnOwnerDecision !== undefined && pauseOnOwnerDecision !== 'required') {
      throw new Error(`Invalid ${field}.escalationRules.pauseOnOwnerDecision: expected "required"`);
    }
    escalationRules = pauseOnOwnerDecision ? { pauseOnOwnerDecision } : {};
  }

  if (!options.allowPartial && allowLocalDryRun === undefined) {
    throw new Error(`Invalid ${field}.allowLocalDryRun: expected a boolean`);
  }

  return {
    ...(allowLocalDryRun !== undefined ? { allowLocalDryRun } : {}),
    ...(readStringArray(record.ruleGoverningSurfaces, `${field}.ruleGoverningSurfaces`)
      ? { ruleGoverningSurfaces: readStringArray(record.ruleGoverningSurfaces, `${field}.ruleGoverningSurfaces`) }
      : {}),
    ...(capabilityIsolation ? { capabilityIsolation } : {}),
    ...(gatingPosture ? { gatingPosture: gatingPosture as PolicyRules['gatingPosture'] } : {}),
    ...(mergeSpectrum ? { mergeSpectrum: mergeSpectrum as PolicyRules['mergeSpectrum'] } : {}),
    ...(readInteger(record.concurrencyCeiling, `${field}.concurrencyCeiling`, 1) !== undefined
      ? { concurrencyCeiling: readInteger(record.concurrencyCeiling, `${field}.concurrencyCeiling`, 1) }
      : {}),
    ...(readInteger(record.retryBudget, `${field}.retryBudget`, 0) !== undefined
      ? { retryBudget: readInteger(record.retryBudget, `${field}.retryBudget`, 0) }
      : {}),
    ...(readStringArray(record.requiredReviews, `${field}.requiredReviews`)
      ? { requiredReviews: readStringArray(record.requiredReviews, `${field}.requiredReviews`) }
      : {}),
    ...(escalationRules ? { escalationRules } : {}),
    ...(blockResolution ? { blockResolution: blockResolution as PolicyRules['blockResolution'] } : {}),
  };
}

export function validatePolicyDoc(policy: PolicyDoc): PolicyDoc {
  const root = assertObject(policy, 'policy');
  assertNoUnknownKeys(root, ['version', 'policy'], 'policy');
  const version = readString(root.version, 'policy.version');
  if (version !== 'policy-v0') {
    throw new Error('Invalid policy.version: expected "policy-v0"');
  }
  const policyRecord = assertObject(root.policy, 'policy.policy');
  assertNoUnknownKeys(policyRecord, ['id', 'rules', 'basis'], 'policy.policy');
  const id = readString(policyRecord.id, 'policy.policy.id');
  if (id === undefined) {
    throw new Error('Invalid policy.policy.id: expected a non-empty string');
  }
  if (policyRecord.rules === undefined) {
    throw new Error('Invalid policy.policy.rules: expected an object');
  }
  const rules = normalizePolicyRules(policyRecord.rules, 'policy.policy.rules');
  return {
    ...policy,
    version,
    policy: {
      ...policy.policy,
      id,
      rules,
    },
  };
}

export function validateWorkProfileDoc(workProfile: WorkProfileDoc): WorkProfileDoc {
  const root = assertObject(workProfile, 'workProfile');
  assertNoUnknownKeys(root, ['version', 'workProfile'], 'workProfile');
  const version = readString(root.version, 'workProfile.version');
  if (version !== 'work-profile-v0') {
    throw new Error('Invalid workProfile.version: expected "work-profile-v0"');
  }

  const workProfileRecord = assertObject(root.workProfile, 'workProfile.workProfile');
  for (const field of Object.keys(workProfileRecord)) {
    if (POLICY_OWNED_WORK_PROFILE_FIELDS.has(field)) {
      throw new Error(
        `Invalid workProfile.${field}: work profiles are not allowed to carry policy-owned fields; move "${field}" into the policy artifact`,
      );
    }
  }
  assertNoUnknownKeys(
    workProfileRecord,
    ['id', 'model', 'effort', 'promptStrategy', 'roleRealization', 'setup'],
    'workProfile.workProfile',
  );

  readString(workProfileRecord.id, 'workProfile.workProfile.id');
  readString(workProfileRecord.model, 'workProfile.workProfile.model');
  const effort = readString(workProfileRecord.effort, 'workProfile.workProfile.effort');
  if (!effort || !SUPPORTED_EFFORT.has(effort)) {
    throw new Error('Invalid workProfile.workProfile.effort: expected "low", "medium", or "high"');
  }
  const promptStrategy = readString(workProfileRecord.promptStrategy, 'workProfile.workProfile.promptStrategy');
  if (promptStrategy !== undefined && !SUPPORTED_PROMPT_STRATEGIES.has(promptStrategy)) {
    throw new Error(
      'Invalid workProfile.workProfile.promptStrategy: expected "dynamic-per-task", "templated", or "role-prompt"',
    );
  }
  const roleRealization = readString(workProfileRecord.roleRealization, 'workProfile.workProfile.roleRealization');
  if (roleRealization !== undefined && !SUPPORTED_ROLE_REALIZATION.has(roleRealization)) {
    throw new Error(
      'Invalid workProfile.workProfile.roleRealization: expected "single-agent", "planner-executor", or "reviewer-assisted"',
    );
  }

  if (workProfileRecord.setup !== undefined) {
    const setupRecord = assertObject(workProfileRecord.setup, 'workProfile.workProfile.setup');
    assertNoUnknownKeys(setupRecord, ['command', 'freshnessCheck'], 'workProfile.workProfile.setup');
    readString(setupRecord.command, 'workProfile.workProfile.setup.command');
    readString(setupRecord.freshnessCheck, 'workProfile.workProfile.setup.freshnessCheck');
  }

  return workProfile;
}

export function validateRepoPolicyFloorsDoc(repoPolicyFloors: RepoPolicyFloorsDoc): RepoPolicyFloorsDoc {
  const root = assertObject(repoPolicyFloors, 'repoPolicyFloors');
  assertNoUnknownKeys(root, ['version', 'repoPolicyFloors'], 'repoPolicyFloors');
  const version = readString(root.version, 'repoPolicyFloors.version');
  if (version !== 'repo-policy-floors-v0') {
    throw new Error('Invalid repoPolicyFloors.version: expected "repo-policy-floors-v0"');
  }

  const floorRecord = assertObject(root.repoPolicyFloors, 'repoPolicyFloors.repoPolicyFloors');
  assertNoUnknownKeys(floorRecord, ['id', 'rules'], 'repoPolicyFloors.repoPolicyFloors');
  readString(floorRecord.id, 'repoPolicyFloors.repoPolicyFloors.id');
  if (floorRecord.rules === undefined) {
    throw new Error('Invalid repoPolicyFloors.repoPolicyFloors.rules: expected an object');
  }
  normalizePolicyRules(floorRecord.rules, 'repoPolicyFloors.repoPolicyFloors.rules', { allowPartial: true });
  return repoPolicyFloors;
}

function tighterGatingPosture(
  policyValue: PolicyRules['gatingPosture'],
  floorValue: PolicyRules['gatingPosture'],
): PolicyRules['gatingPosture'] | undefined {
  if (floorValue === 'manual') {
    return 'manual';
  }
  return policyValue ?? floorValue;
}

function tighterMergeSpectrum(
  policyValue: PolicyRules['mergeSpectrum'],
  floorValue: PolicyRules['mergeSpectrum'],
): PolicyRules['mergeSpectrum'] | undefined {
  const rank = new Map<NonNullable<PolicyRules['mergeSpectrum']>, number>([
    ['push', 1],
    ['open-pr', 2],
    ['merge', 3],
  ]);
  if (!policyValue) {
    return floorValue;
  }
  if (!floorValue) {
    return policyValue;
  }
  const policyRank = rank.get(policyValue) ?? Number.POSITIVE_INFINITY;
  const floorRank = rank.get(floorValue) ?? Number.POSITIVE_INFINITY;
  return policyRank <= floorRank ? policyValue : floorValue;
}

function tighterBlockResolution(
  policyValue: PolicyRules['blockResolution'],
  floorValue: PolicyRules['blockResolution'],
): PolicyRules['blockResolution'] | undefined {
  if (floorValue === 'quarantine-replan') {
    return 'quarantine-replan';
  }
  return policyValue ?? floorValue;
}

function buildEffectivePolicy(
  trackPolicy: PolicyDoc,
  repoPolicyFloors: RepoPolicyFloorsDoc | undefined,
  trackRef: string | undefined,
): PolicyDoc {
  const policyRules = trackPolicy.policy?.rules ?? {};
  const floorRules = repoPolicyFloors?.repoPolicyFloors.rules ?? {};
  const tightenedByRepoFloors: string[] = [];

  const allowLocalDryRun = floorRules.allowLocalDryRun === false ? false : (policyRules.allowLocalDryRun ?? undefined);
  if (
    repoPolicyFloors &&
    floorRules.allowLocalDryRun !== undefined &&
    floorRules.allowLocalDryRun !== policyRules.allowLocalDryRun
  ) {
    tightenedByRepoFloors.push('allowLocalDryRun');
  }

  const gatingPosture = tighterGatingPosture(policyRules.gatingPosture, floorRules.gatingPosture);
  if (repoPolicyFloors && gatingPosture !== policyRules.gatingPosture && floorRules.gatingPosture !== undefined) {
    tightenedByRepoFloors.push('gatingPosture');
  }

  const mergeSpectrum = tighterMergeSpectrum(policyRules.mergeSpectrum, floorRules.mergeSpectrum);
  if (repoPolicyFloors && mergeSpectrum !== policyRules.mergeSpectrum && floorRules.mergeSpectrum !== undefined) {
    tightenedByRepoFloors.push('mergeSpectrum');
  }

  const concurrencyCeiling =
    floorRules.concurrencyCeiling !== undefined
      ? Math.min(policyRules.concurrencyCeiling ?? floorRules.concurrencyCeiling, floorRules.concurrencyCeiling)
      : policyRules.concurrencyCeiling;
  if (
    repoPolicyFloors &&
    floorRules.concurrencyCeiling !== undefined &&
    concurrencyCeiling !== policyRules.concurrencyCeiling
  ) {
    tightenedByRepoFloors.push('concurrencyCeiling');
  }

  const blockResolution = tighterBlockResolution(policyRules.blockResolution, floorRules.blockResolution);
  if (repoPolicyFloors && blockResolution !== policyRules.blockResolution && floorRules.blockResolution !== undefined) {
    tightenedByRepoFloors.push('blockResolution');
  }

  const ruleGoverningSurfaces = unionRuleGoverningSurfaces(
    policyRules.ruleGoverningSurfaces,
    floorRules.ruleGoverningSurfaces,
  );
  if (
    repoPolicyFloors &&
    floorRules.ruleGoverningSurfaces !== undefined &&
    JSON.stringify(ruleGoverningSurfaces) !== JSON.stringify(policyRules.ruleGoverningSurfaces ?? [])
  ) {
    tightenedByRepoFloors.push('ruleGoverningSurfaces');
  }

  const capabilityIsolation = mergeCapabilityIsolation(policyRules.capabilityIsolation, floorRules.capabilityIsolation);
  if (
    repoPolicyFloors &&
    floorRules.capabilityIsolation !== undefined &&
    JSON.stringify(capabilityIsolation) !== JSON.stringify(policyRules.capabilityIsolation ?? {})
  ) {
    tightenedByRepoFloors.push('capabilityIsolation');
  }

  const basis: PolicyBasis = {
    trackPolicyRef: trackPolicy.policy?.id,
    repoPolicyFloorsRef: repoPolicyFloors?.repoPolicyFloors.id,
    trackRef,
    tightenedByRepoFloors,
    enforcedDimensions: ENFORCED_POLICY_DIMENSIONS,
    inertDimensions: INERT_POLICY_DIMENSIONS,
  };

  return {
    version: 'effective-policy-v0',
    policy: {
      id: trackPolicy.policy?.id,
      basis,
      rules: {
        ...(allowLocalDryRun !== undefined ? { allowLocalDryRun } : {}),
        ...(gatingPosture ? { gatingPosture } : {}),
        ...(mergeSpectrum ? { mergeSpectrum } : {}),
        ...(concurrencyCeiling !== undefined ? { concurrencyCeiling } : {}),
        ...(policyRules.retryBudget !== undefined ? { retryBudget: policyRules.retryBudget } : {}),
        ...(policyRules.requiredReviews ? { requiredReviews: policyRules.requiredReviews } : {}),
        ...(policyRules.escalationRules ? { escalationRules: policyRules.escalationRules } : {}),
        ...(blockResolution ? { blockResolution } : {}),
        ...(ruleGoverningSurfaces ? { ruleGoverningSurfaces } : {}),
        ...(capabilityIsolation ? { capabilityIsolation } : {}),
      },
    },
  };
}

export function createDefaultOwnerConfiguration(config: ConfigDoc, policy: PolicyDoc): BoundOwnerConfiguration {
  const validatedPolicy = validatePolicyDoc(policy);
  return {
    trackRef: readString(config.track?.id, 'config.track.id'),
    policy: validatedPolicy,
    effectivePolicy: buildEffectivePolicy(validatedPolicy, undefined, readString(config.track?.id, 'config.track.id')),
    workProfile: undefined,
    repoPolicyFloors: undefined,
    persistExtendedBindings: false,
  };
}

export function bindOwnerConfiguration(config: ConfigDoc, policy: PolicyDoc): BoundOwnerConfiguration {
  const validatedPolicy = validatePolicyDoc(policy);
  const trackRef = readString(config.track?.id, 'config.track.id');
  const workProfile = config.track?.workProfile ? validateWorkProfileDoc(config.track.workProfile) : undefined;
  const repoPolicyFloors = config.track?.repoPolicyFloors
    ? validateRepoPolicyFloorsDoc(config.track.repoPolicyFloors)
    : undefined;

  return {
    trackRef,
    policy: validatedPolicy,
    effectivePolicy: buildEffectivePolicy(validatedPolicy, repoPolicyFloors, trackRef),
    workProfile,
    repoPolicyFloors,
    persistExtendedBindings: Boolean(trackRef || workProfile || repoPolicyFloors),
  };
}
