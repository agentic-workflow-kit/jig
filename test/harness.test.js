import test from 'node:test';
import assert from 'node:assert';
import { LocalHarness } from '../src/harness.js';

test('LocalHarness sequential execution success', async () => {
  const worker = {
    execute: async (story) => ({ outcome: 'success', evidence: { result: 'passed' } })
  };
  const recordManager = {
    init: () => {},
    recordEvent: () => {},
    finalize: async () => {},
    printSummary: () => {}
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan = { plan: { id: 'p1', stories: [{ id: 's1' }] } };
  const status = await harness.run(plan, {}, {});
  assert.strictEqual(status, 'success');
});

test('LocalHarness sequential execution failure', async () => {
  const worker = {
    execute: async (story) => ({ outcome: 'failure', evidence: { result: 'failed' } })
  };
  const recordManager = {
    init: () => {},
    recordEvent: () => {},
    finalize: async () => {},
    printSummary: () => {}
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan = { plan: { id: 'p1', stories: [{ id: 's1' }] } };
  const status = await harness.run(plan, {}, {});
  assert.strictEqual(status, 'failure');
});

test('LocalHarness sequential execution catch worker error', async () => {
  const worker = {
    execute: async (story) => { throw new Error('Worker exploded'); }
  };
  const recordManager = {
    init: () => {},
    recordEvent: () => {},
    finalize: async () => {},
    printSummary: () => {}
  };
  const harness = new LocalHarness(worker, recordManager);
  const plan = { plan: { id: 'p1', stories: [{ id: 's1' }] } };
  const status = await harness.run(plan, {}, {});
  assert.strictEqual(status, 'failure');
});
