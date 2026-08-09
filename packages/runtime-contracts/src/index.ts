import {
  type CanonicalJson,
  type Result as CodecResult,
  decodeFrame,
  encodeFrame,
  FRAME_VERSION,
} from '@agentic-workflow-kit/jig-codec';

export * from './approval-repository.js';
export * from './development-pre-run.js';
export * from './envelope.js';
export * from './ledger.js';
export * from './obligation.js';
export * from './provider.js';
export { readProviderAdmissionCertificateClaimsPublic as readProviderAdmissionCertificateClaims } from './qualification-certificate.js';
export type { ProviderAdmissionClaims } from './qualification-registry.js';
export * from './session.js';
export * from './source.js';
export * from './verification.js';
export * from './workspace.js';

declare const TextEncoder: { new (): { encode(input?: string): Uint8Array } };
declare const TextDecoder: {
  new (label?: string, options?: { fatal?: boolean }): { decode(input?: Uint8Array): string };
};

function freezeCatalog<T>(catalog: T): T {
  if (typeof catalog === 'object' && catalog !== null && !Object.isFrozen(catalog)) {
    for (const value of Object.values(catalog as object)) freezeCatalog(value);
    Object.freeze(catalog);
  }
  return catalog;
}

export const TOPOLOGY_VERSION = 'jig.runtime-topology.v1';
export const CODEC_VERSION = FRAME_VERSION;

export const RUNTIME_UNITS = Object.freeze([
  'RT-OPERATOR',
  'RT-CONTROLLER',
  'RT-LEDGER',
  'RT-EVIDENCE',
  'RT-REGISTRY',
  'RT-WITNESS',
] as const);

export const SEMANTIC_PORTS = Object.freeze([
  'PORT-CONSUMER',
  'PORT-INTAKE',
  'PORT-DECIDE',
  'PORT-SESSION',
  'PORT-WORKSPACE',
  'PORT-VERIFY',
  'PORT-DELIVERY',
  'PORT-LEDGER',
  'PORT-ARTIFACT',
  'PORT-PUBLISH',
  'PORT-SOURCE',
] as const);

export type RuntimeUnitId = (typeof RUNTIME_UNITS)[number];
export type SemanticPortId = (typeof SEMANTIC_PORTS)[number];
export type AuthorityErrorCode = 'DENIED_EDGE' | 'MALFORMED_FRAME' | 'UNKNOWN_PORT';
export type AuthorityError = Readonly<{
  family: 'FC-AUTHORITY';
  code: AuthorityErrorCode;
  edge?: string;
  port?: string;
}>;
export type AuthorityResult<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: AuthorityError }>;

export type PortDirection =
  | 'private-consumer-delegation'
  | 'external-to-operator'
  | 'controller-to-external'
  | 'controller-to-store'
  | 'operator-to-store'
  | 'operator-to-consumer'
  | 'external-builder-to-source';
export type PortContract = Readonly<{
  id: SemanticPortId;
  owner: RuntimeUnitId | 'X-ENVELOPE';
  direction: PortDirection;
  controllerReachable: boolean;
}>;

export type Crossing = Readonly<{
  port: SemanticPortId;
  source: string;
  target: string;
  owner: RuntimeUnitId | 'X-ENVELOPE';
  direction: string;
  capability: string;
  lifecycleAuthority: boolean;
  readOnly: boolean;
}>;

const ports: readonly PortContract[] = freezeCatalog([
  { id: 'PORT-CONSUMER', owner: 'RT-OPERATOR', direction: 'private-consumer-delegation', controllerReachable: false },
  { id: 'PORT-INTAKE', owner: 'RT-OPERATOR', direction: 'external-to-operator', controllerReachable: false },
  { id: 'PORT-DECIDE', owner: 'RT-CONTROLLER', direction: 'controller-to-external', controllerReachable: true },
  { id: 'PORT-SESSION', owner: 'RT-CONTROLLER', direction: 'controller-to-external', controllerReachable: true },
  { id: 'PORT-WORKSPACE', owner: 'RT-CONTROLLER', direction: 'controller-to-external', controllerReachable: true },
  { id: 'PORT-VERIFY', owner: 'RT-CONTROLLER', direction: 'controller-to-external', controllerReachable: true },
  { id: 'PORT-DELIVERY', owner: 'RT-CONTROLLER', direction: 'controller-to-external', controllerReachable: true },
  { id: 'PORT-LEDGER', owner: 'RT-CONTROLLER', direction: 'controller-to-store', controllerReachable: true },
  { id: 'PORT-ARTIFACT', owner: 'RT-CONTROLLER', direction: 'controller-to-store', controllerReachable: true },
  { id: 'PORT-PUBLISH', owner: 'RT-OPERATOR', direction: 'operator-to-consumer', controllerReachable: false },
  { id: 'PORT-SOURCE', owner: 'X-ENVELOPE', direction: 'external-builder-to-source', controllerReachable: false },
]);

export const TOPOLOGY = freezeCatalog({
  version: TOPOLOGY_VERSION,
  units: RUNTIME_UNITS,
  ports,
});

export const ALLOWED_CROSSINGS: readonly Crossing[] = freezeCatalog([
  {
    port: 'PORT-CONSUMER',
    source: 'X-CONSUMER',
    target: 'RT-OPERATOR',
    owner: 'RT-OPERATOR',
    direction: 'inbound-delegation',
    capability: 'private-delegation',
    lifecycleAuthority: false,
    readOnly: true,
  },
  {
    port: 'PORT-INTAKE',
    source: 'X-ENVELOPE',
    target: 'RT-OPERATOR',
    owner: 'RT-OPERATOR',
    direction: 'inbound-envelope',
    capability: 'immutable-envelope-acknowledgement',
    lifecycleAuthority: false,
    readOnly: false,
  },
  {
    port: 'PORT-DECIDE',
    source: 'P-OWNER',
    target: 'RT-OPERATOR',
    owner: 'RT-CONTROLLER',
    direction: 'inbound-decision',
    capability: 'authenticated-human-decision',
    lifecycleAuthority: false,
    readOnly: false,
  },
  {
    port: 'PORT-DECIDE',
    source: 'RT-CONTROLLER',
    target: 'P-OWNER',
    owner: 'RT-CONTROLLER',
    direction: 'outbound-question',
    capability: 'parked-question',
    lifecycleAuthority: true,
    readOnly: true,
  },
  ...(['PORT-SESSION', 'PORT-WORKSPACE', 'PORT-VERIFY', 'PORT-DELIVERY'] as const).flatMap((port) => [
    {
      port,
      source: 'RT-CONTROLLER',
      target: 'X-MECHANISM',
      owner: 'RT-CONTROLLER' as const,
      direction: 'outbound-mechanism',
      capability:
        port === 'PORT-SESSION'
          ? 'bounded-session'
          : port === 'PORT-WORKSPACE'
            ? 'scoped-workspace'
            : port === 'PORT-VERIFY'
              ? 'scoped-verification'
              : 'scoped-delivery',
      lifecycleAuthority: true,
      readOnly: false,
    },
    {
      port,
      source: 'X-MECHANISM',
      target: 'RT-CONTROLLER',
      owner: 'RT-CONTROLLER' as const,
      direction: 'inbound-attestation',
      capability:
        port === 'PORT-SESSION'
          ? 'attributed-session-result'
          : port === 'PORT-WORKSPACE'
            ? 'workspace-fact'
            : port === 'PORT-VERIFY'
              ? 'verification-fact'
              : 'delivery-fact',
      lifecycleAuthority: false,
      readOnly: true,
    },
  ]),
  {
    port: 'PORT-LEDGER',
    source: 'RT-OPERATOR',
    target: 'RT-LEDGER',
    owner: 'RT-OPERATOR',
    direction: 'intake-acknowledgement',
    capability: 'LG-INTAKE acknowledgement-only append or atomic successor acknowledgement-plus-unique-cut-claim',
    lifecycleAuthority: false,
    readOnly: false,
  },
  {
    port: 'PORT-LEDGER',
    source: 'RT-CONTROLLER',
    target: 'RT-LEDGER',
    owner: 'RT-CONTROLLER',
    direction: 'controller-store',
    capability: 'conditional-ledger-append-read',
    lifecycleAuthority: true,
    readOnly: false,
  },
  {
    port: 'PORT-LEDGER',
    source: 'RT-CONTROLLER',
    target: 'RT-REGISTRY',
    owner: 'RT-CONTROLLER',
    direction: 'controller-store',
    capability: 'target-authority-arbitration',
    lifecycleAuthority: true,
    readOnly: false,
  },
  {
    port: 'PORT-LEDGER',
    source: 'RT-CONTROLLER',
    target: 'RT-WITNESS',
    owner: 'RT-CONTROLLER',
    direction: 'controller-store',
    capability: 'currency-witness-head',
    lifecycleAuthority: true,
    readOnly: false,
  },
  {
    port: 'PORT-ARTIFACT',
    source: 'RT-CONTROLLER',
    target: 'RT-EVIDENCE',
    owner: 'RT-CONTROLLER',
    direction: 'controller-store',
    capability: 'immutable-artifact-read-write',
    lifecycleAuthority: true,
    readOnly: false,
  },
  {
    port: 'PORT-ARTIFACT',
    source: 'RT-EVIDENCE',
    target: 'RT-CONTROLLER',
    owner: 'RT-CONTROLLER',
    direction: 'store-fact',
    capability: 'immutable-artifact-fact',
    lifecycleAuthority: false,
    readOnly: true,
  },
  {
    port: 'PORT-PUBLISH',
    source: 'RT-OPERATOR',
    target: 'X-CONSUMER',
    owner: 'RT-OPERATOR',
    direction: 'outbound-publication',
    capability: 'read-only-projection',
    lifecycleAuthority: false,
    readOnly: true,
  },
  {
    port: 'PORT-SOURCE',
    source: 'X-ENVELOPE',
    target: 'X-WORK-SOURCE',
    owner: 'X-ENVELOPE',
    direction: 'external-builder-source',
    capability: 'candidate-work-proposal',
    lifecycleAuthority: false,
    readOnly: false,
  },
]);

const deniedEdges = new Set([
  'builder-to-controller',
  'consumer-to-controller',
  'port-to-port-bypass',
  'provider-import',
  'store-decision',
  'unknown-port',
]);

function denied(code: AuthorityErrorCode, fields: Omit<AuthorityError, 'family' | 'code'>): AuthorityResult<never> {
  return { ok: false, error: { family: 'FC-AUTHORITY', code, ...fields } };
}

function isPort(value: string): value is SemanticPortId {
  return (SEMANTIC_PORTS as readonly string[]).includes(value);
}

const CROSSING_FIELDS = Object.freeze([
  'port',
  'source',
  'target',
  'owner',
  'direction',
  'capability',
  'lifecycleAuthority',
  'readOnly',
] as const);

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

/**
 * Produces a canonical primitive frame for developer ergonomics only. Encoding
 * is not authorization: callers must pass the result to validateTopologyCrossing.
 */
export function encodeTopologyCrossing(crossing: Crossing): CodecResult<string> {
  const payload: CanonicalJson = {
    port: crossing.port,
    source: crossing.source,
    target: crossing.target,
    owner: crossing.owner,
    direction: crossing.direction,
    capability: crossing.capability,
    lifecycleAuthority: crossing.lifecycleAuthority,
    readOnly: crossing.readOnly,
  };
  const encoded = encodeFrame(payload);
  if (!encoded.ok) return encoded;
  return { ok: true, value: textDecoder.decode(encoded.value) };
}

function parsedCrossing(value: CanonicalJson): Crossing | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const payload = value as Record<string, CanonicalJson>;
  const keys = Object.keys(payload).sort();
  const expectedKeys = [...CROSSING_FIELDS].sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) return undefined;
  const candidate = {
    port: payload.port,
    source: payload.source,
    target: payload.target,
    owner: payload.owner,
    direction: payload.direction,
    capability: payload.capability,
    lifecycleAuthority: payload.lifecycleAuthority,
    readOnly: payload.readOnly,
  };
  if (
    typeof candidate.port !== 'string' ||
    typeof candidate.source !== 'string' ||
    typeof candidate.target !== 'string' ||
    typeof candidate.owner !== 'string' ||
    typeof candidate.direction !== 'string' ||
    typeof candidate.capability !== 'string' ||
    typeof candidate.lifecycleAuthority !== 'boolean' ||
    typeof candidate.readOnly !== 'boolean'
  )
    return undefined;
  return candidate as Crossing;
}

export function validateTopologyCrossing(serialized: unknown): AuthorityResult<Crossing> {
  if (typeof serialized !== 'string') return denied('DENIED_EDGE', { edge: 'invalid-crossing-frame' });
  const decoded = decodeFrame(textEncoder.encode(serialized));
  if (!decoded.ok) return denied('MALFORMED_FRAME', {});
  const candidate = parsedCrossing(decoded.value);
  if (!candidate) return denied('DENIED_EDGE', { edge: 'invalid-crossing-shape' });
  if (!isPort(candidate.port)) return denied('UNKNOWN_PORT', { port: candidate.port });
  const match = ALLOWED_CROSSINGS.find((allowed) =>
    CROSSING_FIELDS.every((field) => allowed[field] === candidate[field]),
  );
  if (!match) return denied('DENIED_EDGE', { edge: `${candidate.source}->${candidate.port}->${candidate.target}` });
  return { ok: true, value: freezeCatalog({ ...match }) };
}

export function validateCrossing(port: string, target: RuntimeUnitId): AuthorityResult<never> {
  if (!isPort(port)) return denied('UNKNOWN_PORT', { port });
  return denied('DENIED_EDGE', { edge: `${port}->${target}:incomplete-authority-operands` });
}

export function validateDeniedEdge(edge: string): AuthorityResult<never> {
  return denied('DENIED_EDGE', { edge: deniedEdges.has(edge) ? edge : 'unknown-port' });
}

export type FramedOpaque = Readonly<{ frame: Uint8Array; payload: CanonicalJson }>;

export function validateFramedOpaque(frame: Uint8Array): AuthorityResult<FramedOpaque> {
  const decoded = decodeFrame(frame);
  if (!decoded.ok) return denied('MALFORMED_FRAME', {});
  return { ok: true, value: Object.freeze({ frame: frame.slice(), payload: decoded.value }) };
}

export type ScriptedFake = Readonly<{
  port: SemanticPortId;
  invoke(frame: Uint8Array, crossing: string): AuthorityResult<FramedOpaque>;
}>;

export function createScriptedFake(port: SemanticPortId): ScriptedFake {
  return Object.freeze({
    port,
    invoke: (frame, crossing) => {
      const authority = validateTopologyCrossing(crossing);
      return authority.ok && authority.value.port === port
        ? validateFramedOpaque(frame)
        : denied('DENIED_EDGE', { edge: `${port}:fake-crossing` });
    },
  });
}

export * from './doorbell.js';
