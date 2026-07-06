import assert from 'node:assert';
import { test } from 'vitest';
import { ProviderSelectionError, readDriverSelection } from '../src/driver-selection.js';
import type { ConfigDoc } from '../src/types.js';

test('readDriverSelection defaults to the reference selection when config.drivers is omitted', () => {
  const selection = readDriverSelection({ runner: { mode: 'local-dry-run' } } as ConfigDoc);

  assert.strictEqual(selection.agent, 'reference');
  assert.strictEqual(selection.executionHost, 'reference');
  assert.strictEqual(selection.forge, 'reference');
  assert.strictEqual(selection.workSource, 'reference');
});

test('readDriverSelection refuses a non-object config.drivers value fail-closed', () => {
  const config = { runner: { mode: 'local-dry-run' }, drivers: 'reference' } as unknown as ConfigDoc;

  assert.throws(() => readDriverSelection(config), ProviderSelectionError);
  assert.throws(() => readDriverSelection(config), /Unknown provider driver selection/);
});

test('readDriverSelection refuses an array config.drivers value fail-closed', () => {
  const config = { runner: { mode: 'local-dry-run' }, drivers: ['scripted-stub'] } as unknown as ConfigDoc;

  assert.throws(() => readDriverSelection(config), ProviderSelectionError);
});
