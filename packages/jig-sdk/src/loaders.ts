import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { validatePolicyDoc, validateRepoPolicyFloorsDoc, validateWorkProfileDoc } from './owner-configuration.js';
import { PlanValidator } from './plan-validator.js';
import type { ConfigDoc, PlanInstance, PolicyDoc, RepoPolicyFloorsDoc, WorkProfileDoc } from './types.js';

export function loadJson(filePath: string): unknown {
  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load JSON from "${filePath}": ${message}`);
  }
}

export function loadPlanInstance(planPath: string): PlanInstance {
  const planInstance = loadJson(planPath) as PlanInstance;
  try {
    PlanValidator.validate(planInstance);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Plan validation failed for "${planPath}": ${message}`);
  }
  return planInstance;
}

export function loadConfig(configPath: string): ConfigDoc {
  const config = loadJson(configPath) as ConfigDoc;
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new Error('Invalid config: expected a root object');
  }

  const root = config as Record<string, unknown>;
  const unknownRootKeys = Object.keys(root).filter((key) => !['version', 'runner', 'drivers', 'track'].includes(key));
  if (unknownRootKeys.length > 0) {
    throw new Error(
      `Invalid config: unknown root field${unknownRootKeys.length === 1 ? '' : 's'} ${unknownRootKeys.join(', ')}`,
    );
  }

  if (root.version !== undefined && root.version !== 'config-v0') {
    throw new Error('Invalid config.version: expected "config-v0" when provided');
  }

  if (!config.runner || !config.drivers) {
    throw new Error('Invalid config: missing "runner" or "drivers"');
  }

  const runner = config.runner as Record<string, unknown>;
  const unknownRunnerKeys = Object.keys(runner).filter((key) => !['recordDir', 'mode'].includes(key));
  if (unknownRunnerKeys.length > 0) {
    throw new Error(
      `Invalid config.runner: unknown field${unknownRunnerKeys.length === 1 ? '' : 's'} ${unknownRunnerKeys.join(', ')}`,
    );
  }

  const drivers =
    typeof config.drivers === 'object' && config.drivers !== null && !Array.isArray(config.drivers)
      ? (config.drivers as Record<string, unknown>)
      : null;
  if (!drivers) {
    throw new Error('Invalid config.drivers: expected an object');
  }
  const unknownDriverKeys = Object.keys(drivers).filter(
    (key) => !['agent', 'executionHost', 'forge', 'workSource'].includes(key),
  );
  if (unknownDriverKeys.length > 0) {
    throw new Error(
      `Invalid config.drivers: unknown field${unknownDriverKeys.length === 1 ? '' : 's'} ${unknownDriverKeys.join(', ')}`,
    );
  }

  if (!config.track) {
    return config;
  }

  const track = config.track as Record<string, unknown>;
  const unknownTrackKeys = Object.keys(track).filter(
    (key) => !['id', 'workProfilePath', 'repoPolicyFloorsPath'].includes(key),
  );
  if (unknownTrackKeys.length > 0) {
    throw new Error(
      `Invalid config.track: unknown field${unknownTrackKeys.length === 1 ? '' : 's'} ${unknownTrackKeys.join(', ')}`,
    );
  }

  const configDir = dirname(configPath);
  if (track.id !== undefined && typeof track.id !== 'string') {
    throw new Error('Invalid config.track.id: expected a non-empty string');
  }
  if (track.workProfilePath !== undefined && typeof track.workProfilePath !== 'string') {
    throw new Error('Invalid config.track.workProfilePath: expected a non-empty string');
  }
  if (track.repoPolicyFloorsPath !== undefined && typeof track.repoPolicyFloorsPath !== 'string') {
    throw new Error('Invalid config.track.repoPolicyFloorsPath: expected a non-empty string');
  }
  const trackConfig: ConfigDoc['track'] = {
    ...(track.id !== undefined ? { id: track.id } : {}),
    ...(track.workProfilePath !== undefined ? { workProfilePath: track.workProfilePath } : {}),
    ...(track.repoPolicyFloorsPath !== undefined ? { repoPolicyFloorsPath: track.repoPolicyFloorsPath } : {}),
  };

  if (track.workProfilePath !== undefined) {
    trackConfig.workProfile = loadWorkProfile(resolve(configDir, track.workProfilePath));
  }
  if (track.repoPolicyFloorsPath !== undefined) {
    trackConfig.repoPolicyFloors = loadRepoPolicyFloors(resolve(configDir, track.repoPolicyFloorsPath));
  }

  return {
    ...config,
    track: trackConfig,
  };
}

export function loadPolicy(policyPath: string): PolicyDoc {
  const policy = loadJson(policyPath) as PolicyDoc;
  return validatePolicyDoc(policy);
}

export function loadWorkProfile(workProfilePath: string): WorkProfileDoc {
  return validateWorkProfileDoc(loadJson(workProfilePath) as WorkProfileDoc);
}

export function loadRepoPolicyFloors(repoPolicyFloorsPath: string): RepoPolicyFloorsDoc {
  return validateRepoPolicyFloorsDoc(loadJson(repoPolicyFloorsPath) as RepoPolicyFloorsDoc);
}
