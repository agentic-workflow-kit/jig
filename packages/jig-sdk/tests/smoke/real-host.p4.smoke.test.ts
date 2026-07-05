import assert from 'node:assert';
import { describe, test } from 'vitest';
import { composeReferenceRun } from '../../src/bootstrap.js';
import type { ConfigDoc, PlanInstance } from '../../src/types.js';

const planInstance: PlanInstance = {
  plan: {
    id: 'plan-p4-real-host-smoke',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'Real-host smoke' }],
  },
};

const config: ConfigDoc = {
  runner: { mode: 'local-real-provider-smoke', recordDir: 'runs' },
  drivers: {
    executionHost: 'real',
  },
};

describe.skipIf(!process.env.EVRUN_SMOKE)('P04 real-host smoke', () => {
  test('compose-time macOS probe yields an honest process-group attestation', async () => {
    if (process.platform !== 'darwin') {
      return;
    }

    const composed = await composeReferenceRun({
      planInstance,
      config,
      scriptedOutput: {},
    });

    const attestation = composed.executionHost.describe().capabilityAttestations[0];
    assert.ok(attestation);
    assert.strictEqual(attestation.driverId, 'real-host');
    assert.strictEqual(attestation.containmentMechanism, 'process-group');
    assert.strictEqual(attestation.reportedIsolationStrength, 'weak');
    assert.strictEqual(attestation.provenIsolationStrength, 'weak');
    assert.strictEqual(attestation.positive, true);
    assert.strictEqual(attestation.failureToken, undefined);
  });
});
