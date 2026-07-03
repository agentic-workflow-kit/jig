import type { CapabilityAttestation, HostFailureToken, IsolationStrength } from './ports.js';
import type { AuthorizationBasis, AuthorizationDecision, AuthorizationRequest, PolicyDoc, Story } from './types.js';

const PRIVILEGED_KINDS = new Set(['push', 'open-pr', 'merge', 'credential-access']);

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function globToRegex(pattern: string): RegExp {
  const escaped = escapeRegex(pattern);
  const withDoubleStar = escaped.replaceAll('**', '::DOUBLE_STAR::');
  const withSingleStar = withDoubleStar.replaceAll('*', '[^/]*');
  return new RegExp(`^${withSingleStar.replaceAll('::DOUBLE_STAR::', '.*')}$`);
}

function matchesAnyPattern(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => globToRegex(pattern).test(path));
}

function isDeclaredRequest(request: AuthorizationRequest, story: Story): boolean {
  return Array.isArray(story.authority?.requests) && story.authority.requests.includes(request.kind);
}

function isRuleGoverningRequest(request: AuthorizationRequest, policy: PolicyDoc): boolean {
  if (request.kind === 'edit-rule-governing-file') {
    return true;
  }

  const surfaces = policy.policy?.rules?.ruleGoverningSurfaces;
  if (!Array.isArray(surfaces) || !Array.isArray(request.paths)) {
    return false;
  }

  return request.paths.some((path) => matchesAnyPattern(path, surfaces));
}

function hasInvalidRequestPath(request: AuthorizationRequest): boolean {
  if (!Array.isArray(request.paths)) {
    return false;
  }

  return request.paths.some((path) => {
    if (path.length === 0 || path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path) || path.includes('\0')) {
      return true;
    }

    return path.split(/[\\/]+/).some((segment) => segment === '..');
  });
}

function isInDeclaredScope(request: AuthorizationRequest, story: Story): boolean {
  if (!Array.isArray(request.paths) || request.paths.length === 0) {
    return false;
  }

  const scope = story.scope;
  if (!Array.isArray(scope) || scope.length === 0) {
    return false;
  }

  return request.paths.every((path) => matchesAnyPattern(path, scope));
}

function isolationRank(strength: IsolationStrength | undefined): number {
  if (strength === 'strong') return 3;
  if (strength === 'weak') return 2;
  if (strength === 'none') return 1;
  return 0;
}

function requiredIsolationFor(request: AuthorizationRequest, policy: PolicyDoc): IsolationStrength | null {
  if (typeof request.capability !== 'string') {
    return null;
  }

  const capabilityIsolation = policy.policy?.rules?.capabilityIsolation;
  if (!capabilityIsolation || typeof capabilityIsolation !== 'object' || Array.isArray(capabilityIsolation)) {
    return null;
  }

  const value = (capabilityIsolation as Record<string, unknown>)[request.capability];
  return value === 'none' || value === 'weak' || value === 'strong' ? value : null;
}

function proofFailureBasis(
  request: AuthorizationRequest,
  policy: PolicyDoc,
  attestation?: CapabilityAttestation,
): AuthorizationBasis | null {
  const requiredIsolation = requiredIsolationFor(request, policy);
  if (!requiredIsolation) {
    return null;
  }

  if (
    !attestation ||
    attestation.capability !== request.capability ||
    attestation.freshness !== 'fresh' ||
    attestation.positive !== true
  ) {
    return 'containment-unproven';
  }

  if (
    isolationRank(attestation.reportedIsolationStrength) > 0 &&
    isolationRank(attestation.reportedIsolationStrength) > isolationRank(attestation.provenIsolationStrength)
  ) {
    return 'isolation-strength-overstated';
  }

  const failureToken = attestation.failureToken;
  if (
    failureToken === 'containment-unproven' ||
    failureToken === 'isolation-strength-overstated' ||
    failureToken === 'workspace-collision'
  ) {
    return failureToken satisfies HostFailureToken;
  }

  if (isolationRank(attestation.provenIsolationStrength) < isolationRank(requiredIsolation)) {
    return 'containment-unproven';
  }

  return null;
}

export function authorizeRequest(
  request: AuthorizationRequest,
  story: Story,
  policy: PolicyDoc,
  attestation?: CapabilityAttestation,
): AuthorizationDecision {
  if (hasInvalidRequestPath(request)) {
    return {
      outcome: 'deny',
      basis: ['FENCE-1', 'invalid-request-path'],
    };
  }

  if (isRuleGoverningRequest(request, policy)) {
    return {
      outcome: 'route',
      basis: ['GUARD-2', 'rule-governing-surface'],
    };
  }

  if (PRIVILEGED_KINDS.has(request.kind) || request.privileged === true || request.irreversible === true) {
    return {
      outcome: 'route',
      basis: ['privileged-or-irreversible'],
    };
  }

  if (request.kind === 'edit-files') {
    if (!isDeclaredRequest(request, story) || !isInDeclaredScope(request, story)) {
      return {
        outcome: 'deny',
        basis: ['FENCE-1', 'out-of-declared-scope'],
      };
    }

    const capabilityProofFailure = proofFailureBasis(request, policy, attestation);
    if (capabilityProofFailure) {
      return {
        outcome: 'route',
        basis: [capabilityProofFailure],
      };
    }

    return {
      outcome: 'grant',
      basis: ['declared-request', 'in-scope', 'CFG-10:reversible'],
    };
  }

  if (request.kind === 'run-checks') {
    if (isDeclaredRequest(request, story)) {
      const capabilityProofFailure = proofFailureBasis(request, policy, attestation);
      if (capabilityProofFailure) {
        return {
          outcome: 'route',
          basis: [capabilityProofFailure],
        };
      }

      return {
        outcome: 'grant',
        basis: ['declared-request', 'CFG-10:reversible'],
      };
    }

    return {
      outcome: 'route',
      basis: ['unknown-request-kind'],
    };
  }

  return {
    outcome: 'route',
    basis: ['unknown-request-kind'],
  };
}
