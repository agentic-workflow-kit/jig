import type { AuthorizationDecision, AuthorizationRequest, PolicyDoc, Story } from './types.js';

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

export function authorizeRequest(
  request: AuthorizationRequest,
  story: Story,
  policy: PolicyDoc,
): AuthorizationDecision {
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

    return {
      outcome: 'grant',
      basis: ['declared-request', 'in-scope', 'CFG-10:reversible'],
    };
  }

  if (request.kind === 'run-checks') {
    if (isDeclaredRequest(request, story)) {
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
