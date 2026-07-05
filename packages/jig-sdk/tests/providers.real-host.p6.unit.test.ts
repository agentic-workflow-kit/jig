import assert from 'node:assert';
import { test } from 'vitest';
import { fixedClock } from '../src/clock.js';
import { createControlledStrongConfinementProbe, createRealExecutionHost } from '../src/providers/real/host.js';

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
  assert.strictEqual(described.capabilityAttestations[0]?.provenBy, 'exercised-confinement-proof');
  assert.strictEqual(described.capabilityAttestations[0]?.containmentMechanism, 'process-group');
});

test('P6-AC-2: real host records isolation-strength-overstated when report exceeds proof', async () => {
  const host = await createRealExecutionHost({
    clock: fixedClock('2026-07-03T10:00:00.000Z'),
    reportedIsolationStrength: 'strong',
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

  assert.strictEqual(host.describe().capabilityAttestations[0]?.positive, false);
  assert.strictEqual(host.describe().capabilityAttestations[0]?.provenBy, undefined);
  assert.strictEqual(host.describe().capabilityAttestations[0]?.failureToken, 'isolation-strength-overstated');
});

test('P6-AC-2: real host records isolation-strength-overstated for weak-over-none claims', async () => {
  const host = await createRealExecutionHost({
    clock: fixedClock('2026-07-03T10:00:00.000Z'),
    reportedIsolationStrength: 'weak',
    probe: {
      run: async () => ({
        observedAt: '2026-07-03T10:00:00.000Z',
        freshnessWindowMs: 1_000,
        terminationProvedEmpty: true,
        negativeEgressProbePassed: false,
        containmentMechanism: 'process-group',
        commandBindingPassed: true,
        parentageProbePassed: true,
        provenIsolationStrength: 'none',
      }),
    },
  });

  assert.strictEqual(host.describe().capabilityAttestations[0]?.positive, false);
  assert.strictEqual(host.describe().capabilityAttestations[0]?.provenBy, undefined);
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

test('P6-AC-2: honest weak proof remains positive for a weak real-host posture', async () => {
  const host = await createRealExecutionHost({
    clock: fixedClock('2026-07-03T10:00:00.000Z'),
    probe: {
      run: async () => ({
        reportedIsolationStrength: 'weak',
        observedAt: '2026-07-03T10:00:00.000Z',
        freshnessWindowMs: 1_000,
        terminationProvedEmpty: true,
        negativeEgressProbePassed: false,
        containmentMechanism: 'process-group',
        commandBindingPassed: true,
        parentageProbePassed: true,
        provenIsolationStrength: 'weak',
      }),
    },
  });

  assert.strictEqual(host.describe().capabilityAttestations[0]?.positive, true);
  assert.strictEqual(host.describe().capabilityAttestations[0]?.reportedIsolationStrength, 'weak');
  assert.strictEqual(host.describe().capabilityAttestations[0]?.provenIsolationStrength, 'weak');
});

test('P6-AC-2: controlled strong confinement probe remains available for hermetic doubles', async () => {
  const host = await createRealExecutionHost({
    clock: fixedClock('2026-07-03T10:00:00.000Z'),
    probe: createControlledStrongConfinementProbe('2026-07-03T10:00:00.000Z'),
  });

  assert.strictEqual(host.describe().capabilityAttestations[0]?.positive, true);
  assert.strictEqual(host.describe().capabilityAttestations[0]?.reportedIsolationStrength, 'strong');
});
