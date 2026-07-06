import assert from 'node:assert';
import { test } from 'vitest';
import { authorizeRequest } from '../src/authorization.js';
import type { CapabilityAttestation } from '../src/ports.js';
import type { AuthorizationRequest, PolicyDoc, Story } from '../src/types.js';

const story: Story = {
  id: 'STORY-RC',
  title: 'run-checks story',
  scope: ['src/**'],
  authority: {
    requests: ['run-checks'],
  },
};

function attestation(overrides: Partial<CapabilityAttestation> = {}): CapabilityAttestation {
  return {
    driverId: 'real-host',
    capability: 'command-execution',
    runContext: 'local-real-host',
    freshness: 'fresh',
    positive: true,
    reportedIsolationStrength: 'strong',
    provenIsolationStrength: 'strong',
    provenBy: 'exercised-confinement-proof',
    ...overrides,
  };
}

test('a declared run-checks request whose capability proof fails routes instead of granting', () => {
  const request: AuthorizationRequest = {
    id: 'REQ-check',
    kind: 'run-checks',
    command: 'corepack pnpm check',
    capability: 'command-execution',
  };
  const policy: PolicyDoc = {
    policy: {
      id: 'policy-rc-isolation',
      rules: {
        allowLocalDryRun: true,
        capabilityIsolation: { 'command-execution': 'strong' },
      },
    },
  };

  const decision = authorizeRequest(
    request,
    story,
    policy,
    attestation({ freshness: 'stale', positive: false, failureToken: 'containment-unproven' }),
  );

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['containment-unproven']);
});

test('a declared run-checks request under manual gating posture routes even with a clean capability proof', () => {
  const request: AuthorizationRequest = {
    id: 'REQ-check-manual',
    kind: 'run-checks',
    command: 'corepack pnpm check',
  };
  const policy: PolicyDoc = {
    policy: {
      id: 'policy-rc-manual',
      rules: {
        allowLocalDryRun: true,
        gatingPosture: 'manual',
      },
    },
  };

  const decision = authorizeRequest(request, story, policy);

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['CFG-10:manual-review-required']);
});

test('a request with no isolation-rankable strength ("none") is treated as the weakest rank and still fails a strong requirement', () => {
  const request: AuthorizationRequest = {
    id: 'REQ-none-strength',
    kind: 'run-checks',
    command: 'corepack pnpm check',
    capability: 'command-execution',
  };
  const policy: PolicyDoc = {
    policy: {
      id: 'policy-none-strength',
      rules: {
        allowLocalDryRun: true,
        capabilityIsolation: { 'command-execution': 'strong' },
      },
    },
  };

  const decision = authorizeRequest(
    request,
    story,
    policy,
    attestation({
      reportedIsolationStrength: 'none',
      provenIsolationStrength: 'none',
      failureToken: undefined,
    }),
  );

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['containment-unproven']);
});

test('an attestation that omits provenIsolationStrength entirely ranks below any required isolation floor', () => {
  const request: AuthorizationRequest = {
    id: 'REQ-undefined-strength',
    kind: 'run-checks',
    command: 'corepack pnpm check',
    capability: 'command-execution',
  };
  const policy: PolicyDoc = {
    policy: {
      id: 'policy-undefined-strength',
      rules: {
        allowLocalDryRun: true,
        capabilityIsolation: { 'command-execution': 'weak' },
      },
    },
  };

  const decision = authorizeRequest(
    request,
    story,
    policy,
    attestation({
      reportedIsolationStrength: undefined,
      provenIsolationStrength: undefined,
      failureToken: undefined,
    }),
  );

  assert.strictEqual(decision.outcome, 'route');
  assert.deepStrictEqual(decision.basis, ['containment-unproven']);
});

test('capabilityIsolation configured with no entries and a request missing its capability id requires no isolation proof at all', () => {
  const request: AuthorizationRequest = {
    id: 'REQ-no-capability-field',
    kind: 'run-checks',
    command: 'corepack pnpm check',
  };
  const policy: PolicyDoc = {
    policy: {
      id: 'policy-empty-capability-isolation',
      rules: {
        allowLocalDryRun: true,
        capabilityIsolation: {},
      },
    },
  };

  const decision = authorizeRequest(request, story, policy);

  assert.strictEqual(decision.outcome, 'grant');
});

test('a capability id absent from the capabilityIsolation map requires no isolation proof for that request', () => {
  const request: AuthorizationRequest = {
    id: 'REQ-unmapped-capability',
    kind: 'run-checks',
    command: 'corepack pnpm check',
    capability: 'unmapped-capability',
  };
  const policy: PolicyDoc = {
    policy: {
      id: 'policy-unmapped-capability',
      rules: {
        allowLocalDryRun: true,
        capabilityIsolation: { 'command-execution': 'strong' },
      },
    },
  };

  const decision = authorizeRequest(request, story, policy);

  assert.strictEqual(decision.outcome, 'grant');
});
