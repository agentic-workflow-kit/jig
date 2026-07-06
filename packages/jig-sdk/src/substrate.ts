import { createHash } from 'node:crypto';

export type SubstrateRequest =
  | { kind: 'argv'; value: string[] }
  | { kind: 'credential'; value: string }
  | { kind: 'egress'; value: string };

export interface SubstrateManifestInput {
  id: string;
  runtimes: string[];
  argv: string[][];
  credentials: string[];
  egress: string[];
}

export interface ApprovedSubstrateManifest {
  id: string;
  hash: string;
  tuple: Readonly<{
    runtimes: readonly string[];
    argv: readonly (readonly string[])[];
    credentials: readonly string[];
    egress: readonly string[];
  }>;
}

export class SubstrateAuthorizationError extends Error {
  readonly request: SubstrateRequest;

  constructor(request: SubstrateRequest, message?: string) {
    super(message ?? `substrate-escalation: ${request.kind} request is outside the approved manifest tuple`);
    this.name = 'SubstrateAuthorizationError';
    this.request = request;
  }
}

function sortStrings(values: string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function normalizeManifest(input: SubstrateManifestInput): SubstrateManifestInput {
  return {
    id: input.id,
    runtimes: sortStrings(input.runtimes),
    argv: input.argv.map((entry) => [...entry]).sort((left, right) => left.join('\0').localeCompare(right.join('\0'))),
    credentials: sortStrings(input.credentials),
    egress: sortStrings(input.egress),
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  Object.freeze(value);
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return value;
}

export function approveSubstrateManifest(input: SubstrateManifestInput): ApprovedSubstrateManifest {
  const normalized = normalizeManifest(input);
  const hash = createHash('sha256').update(JSON.stringify(normalized)).digest('hex');

  return deepFreeze({
    id: normalized.id,
    hash,
    tuple: {
      runtimes: normalized.runtimes,
      argv: normalized.argv,
      credentials: normalized.credentials,
      egress: normalized.egress,
    },
  });
}

export function validateSubstrateRequest(manifest: ApprovedSubstrateManifest, request: SubstrateRequest): void {
  if (request.kind === 'argv') {
    const allowed = manifest.tuple.argv.some((argv) => JSON.stringify(argv) === JSON.stringify(request.value));
    if (!allowed) {
      throw new SubstrateAuthorizationError(request);
    }
    return;
  }

  if (request.kind === 'credential' && !manifest.tuple.credentials.includes(request.value)) {
    throw new SubstrateAuthorizationError(request);
  }

  if (request.kind === 'egress' && !manifest.tuple.egress.includes(request.value)) {
    throw new SubstrateAuthorizationError(request);
  }
}
