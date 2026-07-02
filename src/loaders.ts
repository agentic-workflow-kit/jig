import { readFileSync } from 'node:fs';
import type { ConfigDoc, PolicyDoc } from './types.js';

export function loadJson(filePath: string): unknown {
  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to load JSON from "${filePath}": ${message}`);
  }
}

export function loadConfig(configPath: string): ConfigDoc {
  const config = loadJson(configPath) as ConfigDoc;
  if (!config.runner || !config.drivers) {
    throw new Error('Invalid config: missing "runner" or "drivers"');
  }
  return config;
}

export function loadPolicy(policyPath: string): PolicyDoc {
  const policy = loadJson(policyPath) as PolicyDoc;
  if (!policy.policy?.id) {
    throw new Error('Invalid policy: missing "policy.id"');
  }
  return policy;
}
