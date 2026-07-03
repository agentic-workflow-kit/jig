import assert from 'node:assert';
import { test } from 'vitest';
import { fixedClock } from '../src/clock.js';
import { createRealExecutionHost, strongLocalConfinementProbe } from '../src/providers/real/host.js';

test('P6-AC-2: real host prove-then-describe keeps describe synchronous with a computed attestation', async () => {
  const host = await createRealExecutionHost({
    clock: fixedClock('2026-07-03T10:00:00.000Z'),
    probe: {
      run: async () => ({
        observedAt: '2026-07-03T10:00:00.000Z',
        freshnessWindowMs: 1_000,
        terminationProvedEmpty: true,
        negativeEgressProbePassed: true,
        containmentMechanism: 'process-group',
        commandBindingPassed: true,
        parentageProbePassed: true,
        provenIsolationStrength: 'strong',
      }),
    },
  });

  const described = host.describe();

  assert.strictEqual(described.driverId, 'real-host');
  assert.strictEqual(described.capabilityAttestations[0]?.freshness, 'fresh');
  assert.strictEqual(described.capabilityAttestations[0]?.positive, true);
  assert.strictEqual(described.capabilityAttestations[0]?.provenIsolationStrength, 'strong');
});

test('P6-AC-2: real host records isolation-strength-overstated when report exceeds proof', async () => {
  const host = await createRealExecutionHost({
    clock: fixedClock('2026-07-03T10:00:00.000Z'),
    probe: {
      run: async () => ({
        observedAt: '2026-07-03T10:00:00.000Z',
        freshnessWindowMs: 1_000,
        terminationProvedEmpty: true,
        negativeEgressProbePassed: true,
        containmentMechanism: 'process-group',
        commandBindingPassed: true,
        parentageProbePassed: true,
        provenIsolationStrength: 'weak',
      }),
    },
  });

  assert.strictEqual(host.describe().capabilityAttestations[0]?.failureToken, 'isolation-strength-overstated');
});

test('P6-AC-2: real host records containment-unproven for a stale proof', async () => {
  const host = await createRealExecutionHost({
    clock: fixedClock('2026-07-03T10:00:02.000Z'),
    probe: {
      run: async () => ({
        observedAt: '2026-07-03T10:00:00.000Z',
        freshnessWindowMs: 1_000,
        terminationProvedEmpty: true,
        negativeEgressProbePassed: true,
        containmentMechanism: 'process-group',
        commandBindingPassed: true,
        parentageProbePassed: true,
        provenIsolationStrength: 'strong',
      }),
    },
  });

  assert.strictEqual(host.describe().capabilityAttestations[0]?.freshness, 'stale');
  assert.strictEqual(host.describe().capabilityAttestations[0]?.failureToken, 'containment-unproven');
});

test('P6-AC-2: strong local confinement probe produces a real-host attestation', async () => {
  const host = await createRealExecutionHost({
    clock: fixedClock('2026-07-03T10:00:00.000Z'),
    probe: strongLocalConfinementProbe('2026-07-03T10:00:00.000Z'),
  });

  assert.strictEqual(host.describe().capabilityAttestations[0]?.positive, true);
});
