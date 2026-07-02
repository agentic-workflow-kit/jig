import assert from 'node:assert';
import { test } from 'vitest';
import { loadConfig, loadJson, loadPolicy } from '../src/loaders.js';

test('loadConfig validates config structure', () => {
  assert.throws(() => loadConfig('tests/fixtures/m5b-local-mvp/local-policy.json'), /missing "runner" or "drivers"/);
});

test('loadPolicy validates policy structure', () => {
  assert.throws(() => loadPolicy('tests/fixtures/m5b-local-mvp/local-config.json'), /missing "policy.id"/);
});

test('loadJson handles missing file', () => {
  assert.throws(() => loadJson('non-existent.json'), /Failed to load JSON/);
});
