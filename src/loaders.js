import { readFileSync } from 'node:fs';

export function loadJson(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to load JSON from "${filePath}": ${err.message}`);
  }
}

export function loadConfig(configPath) {
  const config = loadJson(configPath);
  if (!config.runner || !config.drivers) {
    throw new Error('Invalid config: missing "runner" or "drivers"');
  }
  return config;
}

export function loadPolicy(policyPath) {
  const policy = loadJson(policyPath);
  if (!policy.policy || !policy.policy.id) {
    throw new Error('Invalid policy: missing "policy.id"');
  }
  return policy;
}
