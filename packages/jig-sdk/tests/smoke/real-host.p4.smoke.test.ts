import assert from 'node:assert';
import { describe, test } from 'vitest';
import { composeReferenceRun } from '../../src/bootstrap.js';
import { createMacosProcessGroupConfinementProbe } from '../../src/providers/real/confinement.js';
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
    // The negative-egress check must have been exercised and its observation recorded. On this
    // host egress is not blocked, so the honest observation can never be 'blocked' — the
    // assertion is on observed reality and cannot be satisfied by a refusal (a probe failure
    // rejects composition, failing the test).
    assert.ok(attestation.negativeEgressObservedOutcome);
    assert.notStrictEqual(attestation.negativeEgressObservedOutcome, 'blocked');
  });

  test('real negative-egress dial observes an honest not-blocked outcome on an open-egress host', async () => {
    if (process.platform !== 'darwin') {
      return;
    }

    const result = await createMacosProcessGroupConfinementProbe().run();

    // The real dialer ran: an observation must exist, and on this open-egress host it must be
    // 'open' (a response round-tripped) or 'ambiguous' (silent timeout) — never 'blocked'.
    // Consequently the pass/fail boolean stays honestly false and posture remains proven weak;
    // 'strong' is unreachable on this host and that is the correct recorded truth.
    assert.ok(result.negativeEgressObservedOutcome);
    assert.ok(['open', 'ambiguous'].includes(result.negativeEgressObservedOutcome));
    assert.strictEqual(result.negativeEgressProbePassed, false);
    assert.strictEqual(result.provenIsolationStrength, 'weak');
    assert.strictEqual(result.containmentMechanism, 'process-group');
  });
});
