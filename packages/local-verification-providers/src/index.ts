import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { platform, tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type ProviderAdmissionClaims,
  readProviderAdmissionCertificateClaims,
  type VerificationFailureFamily,
  type VerificationFence,
  type VerificationRequest,
  type VerificationSubject,
  validateVerificationPermit,
  validateVerificationRequest,
} from '@agentic-workflow-kit/jig-runtime-contracts';
import { classifyProcessFailure } from './process-failure.js';

export const LOCAL_COMMAND_VERIFIER_PROVIDER = 'local-posix-command-verifier/v1';
export const LOCAL_COMMAND_VERIFIER_POSTURE = 'local-posix-command-verifier/v1';
export const LOCAL_COMMAND_VERIFIER_ENVIRONMENT = 'local-posix-command/v1';
export const LOCAL_COMMAND_VERIFIER_SUITE_VERSION = 'gf047.cf-mech-verify.v1';
export const LOCAL_COMMAND_VERIFIER_PROBE_VERSION = 'gf047.local-posix-command-probe.v1';
export const LOCAL_COMMAND_VERIFIER_BUILD_DIGEST = sha256(readFileSync(new URL(import.meta.url)));
export const LOCAL_COMMAND_VERIFIER_MAX_PROOF_AGE_MS = 86_400_000;

const MANIFEST_VERSION = 'provider-authority/v1';
const SCOPE = Object.freeze({ phase: 4, purpose: 'local-command-verification', story: 'GF-047' });
const SANDBOX_EXECUTABLE = '/usr/bin/sandbox-exec';
const DYNAMIC_LOADER = '/usr/lib/dyld';
const CONFINEMENT_PROBE_EXECUTABLE = '/bin/cat';
const SANDBOX_SYSTEM_READ_LITERALS = Object.freeze([
  '/',
  '/private',
  '/private/etc',
  '/private/var',
  '/private/tmp',
  '/dev/null',
  '/dev/zero',
  '/dev/random',
  '/dev/urandom',
]);
const DIGEST = /^[0-9a-f]{64}$/u;
const GIT_OBJECT = /^[0-9a-f]{40}$/u;
const SAFE_TEXT = /^[a-z0-9](?:[a-z0-9._/-]{0,127})$/u;
const SECRET_NAME = /(?:secret|token|password|credential|authorization|api[._ -]?key)/iu;
const MAX_ARGS = 32;
const MAX_OUTPUT = 16_384;
const MAX_PREVIEW = 1_024;
const qualificationCertificates = new WeakMap<object, LocalCommandQualificationEvidence>();
type LocalCommandCheckoutResourceClaims = Readonly<{
  canonicalRoot: string;
  candidateCommit: string;
  candidateTree: string;
  candidateContentDigest: string;
  targetBasisCommit: string;
  targetBasisTree: string;
  targetBasisDigest: string;
  cleanReceiptDigest: string;
  trackedReadDigest: string;
}>;
const checkoutResources = new WeakMap<object, LocalCommandCheckoutResourceClaims>();
const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url));

type RuntimeReadDescriptor = Readonly<{
  path: string;
  role: 'executable' | 'dynamic-loader';
  digest: string;
}>;

type TrackedCheckoutReadAuthority = Readonly<{
  literals: readonly string[];
  digest: string;
}>;

type SandboxPolicyDescriptor = Readonly<{
  version: 'canonical-macos-sandbox/v1';
  checkoutRead: 'canonical-tracked-tree-literals';
  runtimeRead: 'literal-digest-pinned';
  scratchWrite: 'canonical-subpath';
  systemReadLiterals: readonly string[];
  network: 'denied';
  symlinkPolicy: 'reject';
  traversalPolicy: 'reject';
  confinementProbe: Readonly<{
    executable: typeof CONFINEMENT_PROBE_EXECUTABLE;
    executableDigest: string;
    dynamicLoader: typeof DYNAMIC_LOADER;
    dynamicLoaderDigest: string;
  }>;
}>;

export type LocalCommandFailureFamily = VerificationFailureFamily | 'FC-TRUST';
export type LocalCommandFailure = Readonly<{ family: LocalCommandFailureFamily; code: string }>;
export type LocalCommandResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: LocalCommandFailure }>;

export type LocalCommandManifestValue = Readonly<{
  manifestVersion: typeof MANIFEST_VERSION;
  providerIdentity: typeof LOCAL_COMMAND_VERIFIER_PROVIDER;
  packageIdentity: 'packages/local-verification-providers';
  nativePermissionPostures: readonly [typeof LOCAL_COMMAND_VERIFIER_POSTURE];
  credentialAuthority: readonly [];
  externalServiceAuthority: readonly [];
  networkAuthority: readonly [];
  filesystemAuthority: readonly [
    Readonly<{
      access: readonly ['read-checkout', 'write-disposable-scratch'];
      discovery: 'binding-only';
      checkout: 'read-only';
      scratch: 'discarded';
      symlinkPolicy: 'reject';
      traversalPolicy: 'reject';
    }>,
  ];
  runtimeReadAuthority: readonly [RuntimeReadDescriptor, RuntimeReadDescriptor];
  sandboxPolicyAuthority: SandboxPolicyDescriptor;
  subprocessAuthority: readonly [
    Readonly<{
      executable: string;
      executableDigest: string;
      args: readonly string[];
      argumentPolicy: 'exact';
      shell: false;
    }>,
  ];
  runtimeAuthority: Readonly<{
    environment: typeof LOCAL_COMMAND_VERIFIER_ENVIRONMENT;
    kind: 'native-posix-sandbox-exec';
    package: 'packages/local-verification-providers';
  }>;
  scope: typeof SCOPE;
  lineage: Readonly<{ kind: 'genesis' }>;
}>;

export type LocalCommandManifest = Readonly<{
  value: LocalCommandManifestValue;
  bytes: Uint8Array;
  manifestDigest: string;
  manifestId: string;
}>;

export type LocalCommandNativePosture = Readonly<{
  os: 'darwin';
  sandboxExecutable: typeof SANDBOX_EXECUTABLE;
  sandboxExecutableDigest: string;
  checkout: 'read-only';
  scratch: 'discarded';
  network: 'denied';
  credentials: 'none';
  runtimeReadDigest: string;
  sandboxPolicyDigest: string;
  digest: string;
}>;

export type LocalCommandAdmission = ProviderAdmissionClaims;
export type LocalCommandCheckoutResource = object;

export type LocalCommandOutput = Readonly<{
  stdoutDigest: string;
  stderrDigest: string;
  stdoutPreview: string;
  stderrPreview: string;
  truncated: boolean;
}>;

export type LocalCommandObservation = Readonly<{
  schema: 'jig.ev-check-observation.v1';
  version: 'jig.verification-contract.v1';
  kind: 'EV-CHECK-OBSERVATION';
  mechanism: typeof LOCAL_COMMAND_VERIFIER_PROVIDER;
  provider: typeof LOCAL_COMMAND_VERIFIER_PROVIDER;
  operation: string;
  subject: VerificationSubject;
  fence: VerificationFence;
  checkClass: string;
  outcome: 'pass' | 'fail';
  evidenceKind: string;
  evidenceDigest: string;
  artifactDigests: readonly string[];
  environmentDigest: string;
  cleanReceiptDigest: string;
  effectFree: true;
  observedAt: number;
  providerBuildDigest: typeof LOCAL_COMMAND_VERIFIER_BUILD_DIGEST;
  manifestId: string;
  executableDigest: string;
  argsDigest: string;
  nativePostureDigest: string;
  output: LocalCommandOutput;
}>;

export type LocalCommandQualificationEvidence = Readonly<{
  kind: 'CF-GATE-PROVIDER';
  status: 'passed';
  suite: typeof LOCAL_COMMAND_VERIFIER_SUITE_VERSION;
  probe: typeof LOCAL_COMMAND_VERIFIER_PROBE_VERSION;
  provider: typeof LOCAL_COMMAND_VERIFIER_PROVIDER;
  providerBuildDigest: typeof LOCAL_COMMAND_VERIFIER_BUILD_DIGEST;
  manifestId: string;
  manifestDigest: string;
  environment: typeof LOCAL_COMMAND_VERIFIER_ENVIRONMENT;
  environmentDigest: string;
  nativePosture: LocalCommandNativePosture;
  nativePostureDigest: string;
  trackedReadDigest: string;
  runtimeReadDigest: string;
  sandboxPolicyDigest: string;
  confinementTestDigest: string;
  candidateCommit: string;
  candidateTree: string;
  fixtureDigest: string;
  admissionProofDigest: string;
  mechanismGate: 'CF-MECH-VERIFY:passed';
  observations: Readonly<Record<string, boolean>>;
  result: CommandRun;
  requestDigest: string;
  resultDigest: string;
  probeDigest: string;
  resourceRoot: string;
  removedResources: readonly string[];
  recorder: 'recorder/jig-gf047-local-command/v1';
}>;

type LocalCommandFailureRecord = Readonly<{
  schema: 'jig.ev-check-failure.v1';
  version: 'jig.verification-contract.v1';
  kind: 'failure';
  operation: string;
  retryOrdinal: number;
  reason: 'lost-response' | 'timeout';
  family: 'FC-MECHANISM';
  code: 'RESULT_UNCERTAIN' | 'MECHANISM_TIMEOUT';
  subject: VerificationSubject;
  fence: VerificationFence;
  supersededBy: string | null;
}>;

type LocalCommandInvocation = Readonly<{
  operation: string;
  checkClass: string;
  retryOrdinal: number;
  result: 'returned' | 'lost-response' | 'timeout';
  effect: 'observation';
}>;

type LocalCommandFinalizationSnapshot = Readonly<{
  origin: 'Waiting' | 'Accepted';
  state: 'Finalizing' | 'Reworking';
  posture: 'deterministic';
  subject: VerificationSubject;
  fence: VerificationFence;
  requiredClasses: readonly string[];
  observations: readonly LocalCommandObservation[];
  noOp: false;
  readyForDelivery: boolean;
  deliveryOperations: readonly [];
  acceptanceGranted: false;
  landingGranted: false;
}>;

type LocalCommandVerificationSnapshot = Readonly<{
  version: 'jig.verification-contract.v1';
  requests: readonly VerificationRequest[];
  observations: readonly LocalCommandObservation[];
  failures: readonly LocalCommandFailureRecord[];
  invocations: readonly LocalCommandInvocation[];
  finalization: LocalCommandFinalizationSnapshot | null;
}>;

type LocalCommandSnapshot = Readonly<{
  version: 'jig.local-command-verifier.v1';
  verification: LocalCommandVerificationSnapshot;
  observations: readonly LocalCommandObservation[];
}>;

export type LocalCommandProvider = Readonly<{
  dispatch(input: unknown): LocalCommandResult<LocalCommandObservation>;
  enterFinalizing(
    input: unknown,
  ): LocalCommandResult<Readonly<{ origin: 'Waiting' | 'Accepted'; state: 'Finalizing' }>>;
  consume(
    input: unknown,
  ): LocalCommandResult<Readonly<{ state: 'Finalizing' | 'Reworking'; readyForDelivery: boolean }>>;
  snapshot(): LocalCommandSnapshot;
  restoreSnapshot(): LocalCommandSnapshot;
  observations(): readonly LocalCommandObservation[];
  failures(): readonly LocalCommandFailureRecord[];
  invocations(): readonly LocalCommandInvocation[];
  reachability(): Readonly<{
    status: 'qualified';
    providerEnabled: true;
    configurationEnabled: true;
    dispatchEnabled: true;
    manifestId: string;
    environmentDigest: string;
  }>;
}>;

const ok = <T>(value: T): LocalCommandResult<T> => Object.freeze({ ok: true, value });
const fail = <T = never>(family: LocalCommandFailureFamily, code: string): LocalCommandResult<T> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function fileDigest(path: string): string | undefined {
  try {
    return sha256(readFileSync(path));
  } catch {
    return undefined;
  }
}

function regularFileDigest(path: string): string | undefined {
  try {
    if (!path.startsWith('/') || path.includes('\u0000') || path.split('/').includes('..')) return undefined;
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || realpathSync(path) !== path) return undefined;
    return sha256(readFileSync(path));
  } catch {
    return undefined;
  }
}

function runtimeDigest(path: string): string {
  return regularFileDigest(path) ?? '0'.repeat(64);
}

const CURRENT_DYNAMIC_LOADER_DIGEST = runtimeDigest(DYNAMIC_LOADER);
const CURRENT_CONFINEMENT_PROBE_DIGEST = runtimeDigest(CONFINEMENT_PROBE_EXECUTABLE);

const runtimeReadAuthority = (executable: string, executableDigest: string): readonly RuntimeReadDescriptor[] =>
  Object.freeze([
    Object.freeze({ path: executable, role: 'executable' as const, digest: executableDigest }),
    Object.freeze({ path: DYNAMIC_LOADER, role: 'dynamic-loader' as const, digest: CURRENT_DYNAMIC_LOADER_DIGEST }),
  ]);

const sandboxPolicyAuthority = (): SandboxPolicyDescriptor =>
  Object.freeze({
    version: 'canonical-macos-sandbox/v1' as const,
    checkoutRead: 'canonical-tracked-tree-literals' as const,
    runtimeRead: 'literal-digest-pinned' as const,
    scratchWrite: 'canonical-subpath' as const,
    systemReadLiterals: SANDBOX_SYSTEM_READ_LITERALS,
    network: 'denied' as const,
    symlinkPolicy: 'reject' as const,
    traversalPolicy: 'reject' as const,
    confinementProbe: Object.freeze({
      executable: CONFINEMENT_PROBE_EXECUTABLE,
      executableDigest: CURRENT_CONFINEMENT_PROBE_DIGEST,
      dynamicLoader: DYNAMIC_LOADER,
      dynamicLoaderDigest: CURRENT_DYNAMIC_LOADER_DIGEST,
    }),
  });

function runtimeReadDigest(value: readonly RuntimeReadDescriptor[]): string {
  return digest('LOCAL-COMMAND-RUNTIME-READ', value);
}

function sandboxPolicyDigest(value: SandboxPolicyDescriptor): string {
  return digest('LOCAL-COMMAND-SANDBOX-POLICY', value);
}

function pathAncestors(path: string): readonly string[] {
  const result: string[] = [];
  let current = path;
  while (true) {
    result.push(current);
    if (current === '/') return result;
    current = dirname(current);
  }
}

function canonicalDirectory(path: string): string | undefined {
  try {
    if (!path.startsWith('/') || path.includes('\u0000') || path.split('/').includes('..')) return undefined;
    const stat = lstatSync(path);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return undefined;
    const canonicalPath = realpathSync(path);
    return canonicalPath === path ? canonicalPath : undefined;
  } catch {
    return undefined;
  }
}

function pathWithin(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return relativePath === '' || (relativePath !== '..' && !relativePath.startsWith(`..${'/'}`));
}

function currentBuildDigest(): string | undefined {
  return fileDigest(new URL(import.meta.url) as unknown as string);
}

function currentCandidateSubject(): Readonly<{ commit: string; tree: string }> | undefined {
  try {
    const options = {
      cwd: PACKAGE_ROOT,
      env: Object.freeze({ PATH: '/usr/bin:/bin' }),
      encoding: 'utf8' as const,
      maxBuffer: 256,
      shell: false as const,
      stdio: ['ignore', 'pipe', 'pipe'] as const,
      timeout: 5_000,
    };
    const commit = execFileSync('/usr/bin/git', ['rev-parse', '--verify', 'HEAD'], options).trim();
    const tree = execFileSync('/usr/bin/git', ['rev-parse', '--verify', 'HEAD^{tree}'], options).trim();
    return GIT_OBJECT.test(commit) && GIT_OBJECT.test(tree) ? Object.freeze({ commit, tree }) : undefined;
  } catch {
    return undefined;
  }
}

function currentCandidateCheckoutRoot(): string | undefined {
  const root = gitOutput(PACKAGE_ROOT, ['rev-parse', '--show-toplevel']);
  return root ? canonicalDirectory(root) : undefined;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => codeUnitCompare(left, right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(',')}}`;
}

function codeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function digest(domain: string, value: unknown): string {
  return sha256(canonical({ domain, value }));
}

export function deriveLocalCommandCheckoutContentDigest(tree: string): string | undefined {
  return GIT_OBJECT.test(tree) ? digest('LOCAL-COMMAND-CHECKOUT-CONTENT', { tree }) : undefined;
}

export function deriveLocalCommandTargetBasisDigest(commit: string, tree: string): string | undefined {
  return GIT_OBJECT.test(commit) && GIT_OBJECT.test(tree)
    ? digest('LOCAL-COMMAND-TARGET-BASIS', { commit, tree })
    : undefined;
}

function plain(value: unknown): value is Record<string, unknown> {
  try {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    );
  } catch {
    return false;
  }
}

function fields(value: unknown, names: readonly string[]): Record<string, unknown> | undefined {
  if (!plain(value)) return undefined;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const actual = Object.keys(descriptors).sort();
    const expected = [...names].sort();
    if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) return undefined;
    if (!names.every((name) => descriptors[name]?.enumerable && 'value' in descriptors[name])) return undefined;
    return Object.freeze(Object.fromEntries(names.map((name) => [name, descriptors[name].value])));
  } catch {
    return undefined;
  }
}

function list(value: unknown, maximum: number): readonly unknown[] | undefined {
  if (!Array.isArray(value) || value.length > maximum) return undefined;
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(value).length !== value.length + 1) return undefined;
    return Object.freeze(value.map((_, index) => descriptors[String(index)]?.value));
  } catch {
    return undefined;
  }
}

function safeText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 1_024 && value.normalize('NFC') === value;
}

function same(left: unknown, right: unknown): boolean {
  return digest('LOCAL-COMMAND-COMPARE', left) === digest('LOCAL-COMMAND-COMPARE', right);
}

function sameSubject(left: VerificationSubject, right: VerificationSubject): boolean {
  return (
    left.candidate === right.candidate &&
    left.candidateContentDigest === right.candidateContentDigest &&
    left.basisDigest === right.basisDigest &&
    left.checkClasses.join('|') === right.checkClasses.join('|') &&
    left.configurationDigest === right.configurationDigest &&
    left.environmentDigest === right.environmentDigest &&
    left.cleanReceiptDigest === right.cleanReceiptDigest
  );
}

function sameFence(left: VerificationFence, right: VerificationFence): boolean {
  return same(left, right);
}

function exactArgs(value: unknown): readonly string[] | undefined {
  const args = list(value, MAX_ARGS);
  if (!args || args.some((arg) => typeof arg !== 'string' || arg.length > 512 || arg.includes('\u0000')))
    return undefined;
  return Object.freeze(args as string[]);
}

function canonicalRuntimeReadAuthority(
  value: unknown,
  executable: string,
  executableDigest: string,
): readonly RuntimeReadDescriptor[] | undefined {
  const entries = list(value, 2);
  if (entries?.length !== 2) return undefined;
  const first = fields(entries[0], ['digest', 'path', 'role']);
  const second = fields(entries[1], ['digest', 'path', 'role']);
  if (
    !first ||
    !second ||
    first.path !== executable ||
    first.role !== 'executable' ||
    first.digest !== executableDigest ||
    second.path !== DYNAMIC_LOADER ||
    second.role !== 'dynamic-loader' ||
    second.digest !== CURRENT_DYNAMIC_LOADER_DIGEST ||
    !DIGEST.test(String(first.digest)) ||
    !DIGEST.test(String(second.digest))
  )
    return undefined;
  return Object.freeze([
    Object.freeze({ path: first.path as string, role: 'executable' as const, digest: first.digest as string }),
    Object.freeze({
      path: second.path as typeof DYNAMIC_LOADER,
      role: 'dynamic-loader' as const,
      digest: second.digest as string,
    }),
  ]);
}

function canonicalSandboxPolicyAuthority(value: unknown): SandboxPolicyDescriptor | undefined {
  const raw = fields(value, [
    'checkoutRead',
    'confinementProbe',
    'network',
    'runtimeRead',
    'scratchWrite',
    'symlinkPolicy',
    'systemReadLiterals',
    'traversalPolicy',
    'version',
  ]);
  const probe =
    raw && fields(raw.confinementProbe, ['dynamicLoader', 'dynamicLoaderDigest', 'executable', 'executableDigest']);
  const literals = raw && list(raw.systemReadLiterals, SANDBOX_SYSTEM_READ_LITERALS.length);
  if (
    !raw ||
    !probe ||
    !literals ||
    raw.version !== 'canonical-macos-sandbox/v1' ||
    raw.checkoutRead !== 'canonical-tracked-tree-literals' ||
    raw.runtimeRead !== 'literal-digest-pinned' ||
    raw.scratchWrite !== 'canonical-subpath' ||
    raw.network !== 'denied' ||
    raw.symlinkPolicy !== 'reject' ||
    raw.traversalPolicy !== 'reject' ||
    probe.executable !== CONFINEMENT_PROBE_EXECUTABLE ||
    probe.executableDigest !== CURRENT_CONFINEMENT_PROBE_DIGEST ||
    probe.dynamicLoader !== DYNAMIC_LOADER ||
    probe.dynamicLoaderDigest !== CURRENT_DYNAMIC_LOADER_DIGEST ||
    literals.length !== SANDBOX_SYSTEM_READ_LITERALS.length ||
    literals.some((literal, index) => literal !== SANDBOX_SYSTEM_READ_LITERALS[index]) ||
    literals.some((literal) => typeof literal !== 'string' || !literal.startsWith('/') || literal.includes('..'))
  )
    return undefined;
  return sandboxPolicyAuthority();
}

function canonicalManifest(value: unknown): LocalCommandManifestValue | undefined {
  const raw = fields(value, [
    'credentialAuthority',
    'externalServiceAuthority',
    'filesystemAuthority',
    'lineage',
    'manifestVersion',
    'nativePermissionPostures',
    'networkAuthority',
    'packageIdentity',
    'providerIdentity',
    'runtimeAuthority',
    'runtimeReadAuthority',
    'sandboxPolicyAuthority',
    'scope',
    'subprocessAuthority',
  ]);
  const posture = raw && list(raw.nativePermissionPostures, 1);
  const credentials = raw && list(raw.credentialAuthority, 0);
  const external = raw && list(raw.externalServiceAuthority, 0);
  const network = raw && list(raw.networkAuthority, 0);
  const filesystem = raw && list(raw.filesystemAuthority, 1);
  const subprocess = raw && list(raw.subprocessAuthority, 1);
  const runtimeAuthority = raw && fields(raw.runtimeAuthority, ['environment', 'kind', 'package']);
  const scope = raw && fields(raw.scope, ['phase', 'purpose', 'story']);
  const lineage = raw && fields(raw.lineage, ['kind']);
  const file: Record<string, unknown> | undefined =
    filesystem && filesystem[0] !== undefined
      ? fields(filesystem[0], ['access', 'checkout', 'discovery', 'scratch', 'symlinkPolicy', 'traversalPolicy'])
      : undefined;
  const command: Record<string, unknown> | undefined =
    subprocess && subprocess[0] !== undefined
      ? fields(subprocess[0], ['args', 'argumentPolicy', 'executable', 'executableDigest', 'shell'])
      : undefined;
  const args = command && exactArgs(command.args);
  const runtimeRead =
    command &&
    canonicalRuntimeReadAuthority(
      raw?.runtimeReadAuthority,
      command.executable as string,
      command.executableDigest as string,
    );
  const sandboxPolicy = raw && canonicalSandboxPolicyAuthority(raw.sandboxPolicyAuthority);
  const names = posture as string[] | undefined;
  if (
    !raw ||
    raw.manifestVersion !== MANIFEST_VERSION ||
    raw.providerIdentity !== LOCAL_COMMAND_VERIFIER_PROVIDER ||
    raw.packageIdentity !== 'packages/local-verification-providers' ||
    !posture ||
    names?.[0] !== LOCAL_COMMAND_VERIFIER_POSTURE ||
    !credentials ||
    !external ||
    !network ||
    !filesystem ||
    !subprocess ||
    !runtimeAuthority ||
    runtimeAuthority.environment !== LOCAL_COMMAND_VERIFIER_ENVIRONMENT ||
    runtimeAuthority.kind !== 'native-posix-sandbox-exec' ||
    runtimeAuthority.package !== 'packages/local-verification-providers' ||
    !scope ||
    !same(scope, SCOPE) ||
    !lineage ||
    lineage.kind !== 'genesis' ||
    !file ||
    !runtimeRead ||
    !sandboxPolicy ||
    !args ||
    !Array.isArray(file.access) ||
    file.access.length !== 2 ||
    file.access[0] !== 'read-checkout' ||
    file.access[1] !== 'write-disposable-scratch' ||
    file.checkout !== 'read-only' ||
    file.discovery !== 'binding-only' ||
    file.scratch !== 'discarded' ||
    file.symlinkPolicy !== 'reject' ||
    file.traversalPolicy !== 'reject' ||
    !command ||
    !safeText(command.executable) ||
    !command.executable.startsWith('/') ||
    !DIGEST.test(String(command.executableDigest)) ||
    command.argumentPolicy !== 'exact' ||
    command.shell !== false ||
    command.executable.includes('sandbox-exec')
  )
    return undefined;
  return Object.freeze({
    manifestVersion: MANIFEST_VERSION,
    providerIdentity: LOCAL_COMMAND_VERIFIER_PROVIDER,
    packageIdentity: 'packages/local-verification-providers',
    nativePermissionPostures: Object.freeze([LOCAL_COMMAND_VERIFIER_POSTURE] as [
      typeof LOCAL_COMMAND_VERIFIER_POSTURE,
    ]),
    credentialAuthority: Object.freeze([]),
    externalServiceAuthority: Object.freeze([]),
    networkAuthority: Object.freeze([]),
    filesystemAuthority: Object.freeze([
      Object.freeze({
        access: Object.freeze(['read-checkout', 'write-disposable-scratch']),
        discovery: 'binding-only',
        checkout: 'read-only',
        scratch: 'discarded',
        symlinkPolicy: 'reject',
        traversalPolicy: 'reject',
      }),
    ]),
    subprocessAuthority: Object.freeze([
      Object.freeze({
        executable: command.executable as string,
        executableDigest: command.executableDigest as string,
        args,
        argumentPolicy: 'exact',
        shell: false,
      }),
    ]),
    runtimeAuthority: Object.freeze({
      environment: LOCAL_COMMAND_VERIFIER_ENVIRONMENT,
      kind: 'native-posix-sandbox-exec',
      package: 'packages/local-verification-providers',
    }),
    runtimeReadAuthority: runtimeRead,
    sandboxPolicyAuthority: sandboxPolicy,
    scope: SCOPE,
    lineage: Object.freeze({ kind: 'genesis' as const }),
  }) as LocalCommandManifestValue;
}

export function createLocalCommandManifest(
  input: Readonly<{
    executable: string;
    executableDigest: string;
    args: readonly string[];
    environmentNames: readonly string[];
  }>,
): LocalCommandResult<LocalCommandManifest> {
  if (
    !safeText(input?.executable) ||
    !input.executable.startsWith('/') ||
    !DIGEST.test(input.executableDigest) ||
    !Array.isArray(input.args) ||
    !Array.isArray(input.environmentNames) ||
    input.environmentNames.length !== 0 ||
    input.environmentNames.some((name) => !SAFE_TEXT.test(name) || SECRET_NAME.test(name)) ||
    new Set(input.environmentNames).size !== input.environmentNames.length ||
    [...input.environmentNames].some((name, index, names) => index > 0 && names[index - 1] >= name)
  )
    return fail('FC-INPUT', 'INVALID_LOCAL_COMMAND_MANIFEST');
  const args = exactArgs(input.args);
  if (!args) return fail('FC-INPUT', 'INVALID_LOCAL_COMMAND_ARGS');
  const value = canonicalManifest({
    credentialAuthority: [],
    externalServiceAuthority: [],
    filesystemAuthority: [
      {
        access: ['read-checkout', 'write-disposable-scratch'],
        checkout: 'read-only',
        discovery: 'binding-only',
        scratch: 'discarded',
        symlinkPolicy: 'reject',
        traversalPolicy: 'reject',
      },
    ],
    lineage: { kind: 'genesis' },
    manifestVersion: MANIFEST_VERSION,
    nativePermissionPostures: [LOCAL_COMMAND_VERIFIER_POSTURE],
    networkAuthority: [],
    packageIdentity: 'packages/local-verification-providers',
    providerIdentity: LOCAL_COMMAND_VERIFIER_PROVIDER,
    runtimeAuthority: {
      environment: LOCAL_COMMAND_VERIFIER_ENVIRONMENT,
      kind: 'native-posix-sandbox-exec',
      package: 'packages/local-verification-providers',
    },
    runtimeReadAuthority: runtimeReadAuthority(input.executable, input.executableDigest),
    sandboxPolicyAuthority: sandboxPolicyAuthority(),
    scope: SCOPE,
    subprocessAuthority: [
      {
        executable: input.executable,
        executableDigest: input.executableDigest,
        args,
        argumentPolicy: 'exact',
        shell: false,
      },
    ],
  });
  if (!value) return fail('FC-INPUT', 'INVALID_LOCAL_COMMAND_MANIFEST');
  const bytes = new TextEncoder().encode(`${canonical(value)}\n`);
  const manifestDigest = sha256(bytes);
  const manifestId = `provider/${sha256(LOCAL_COMMAND_VERIFIER_PROVIDER)}/authority/${manifestDigest}`;
  return ok(Object.freeze({ value, bytes, manifestDigest, manifestId }));
}

function parseManifest(input: unknown): LocalCommandResult<LocalCommandManifest> {
  const raw = fields(input, ['bytes', 'manifestDigest', 'manifestId', 'value']);
  const value = raw && canonicalManifest(raw.value);
  if (!raw || !value || !(raw.bytes instanceof Uint8Array) || !DIGEST.test(String(raw.manifestDigest)))
    return fail('FC-INPUT', 'INVALID_LOCAL_COMMAND_MANIFEST');
  const bytes = raw.bytes as Uint8Array;
  const expectedBytes = new TextEncoder().encode(`${canonical(value)}\n`);
  const manifestDigest = sha256(expectedBytes);
  const manifestId = `provider/${sha256(LOCAL_COMMAND_VERIFIER_PROVIDER)}/authority/${manifestDigest}`;
  if (sha256(bytes) !== manifestDigest || raw.manifestDigest !== manifestDigest || raw.manifestId !== manifestId)
    return fail('FC-AUTHORITY', 'MANIFEST_DIGEST_MISMATCH');
  return ok(Object.freeze({ value, bytes, manifestDigest, manifestId }));
}

function trustedDirectory(path: unknown): LocalCommandResult<string> {
  if (!safeText(path) || !path.startsWith('/') || !existsSync(path)) return fail('FC-SUBJECT', 'CHECKOUT_REQUIRED');
  try {
    if (lstatSync(path).isSymbolicLink() || !lstatSync(path).isDirectory() || realpathSync(path) !== path)
      return fail('FC-TRUST', 'CHECKOUT_UNTRUSTED');
    return ok(path);
  } catch {
    return fail('FC-TRUST', 'CHECKOUT_UNTRUSTED');
  }
}

function gitOutput(cwd: string, args: readonly string[], maxBuffer = 4_096): string | undefined {
  try {
    return execFileSync('/usr/bin/git', [...args], {
      cwd,
      env: Object.freeze({ PATH: '/usr/bin:/bin' }),
      encoding: 'utf8',
      maxBuffer,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5_000,
    }).trim();
  } catch {
    return undefined;
  }
}

function trackedCheckoutReadAuthority(checkout: string): TrackedCheckoutReadAuthority | undefined {
  try {
    const output = execFileSync('/usr/bin/git', ['ls-files', '-z', '--cached'], {
      cwd: checkout,
      env: Object.freeze({ PATH: '/usr/bin:/bin' }),
      encoding: 'utf8',
      maxBuffer: 1_048_576,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5_000,
    });
    const untrackedOutput = execFileSync('/usr/bin/git', ['ls-files', '-z', '--others', '--exclude-standard'], {
      cwd: checkout,
      env: Object.freeze({ PATH: '/usr/bin:/bin' }),
      encoding: 'utf8',
      maxBuffer: 1_048_576,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5_000,
    });
    for (const path of untrackedOutput.split('\u0000').filter(Boolean)) {
      const components = path.split('/');
      if (
        path.startsWith('/') ||
        components.length === 0 ||
        components.some((component) => component.length === 0 || component === '.' || component === '..')
      )
        return undefined;
      let current = checkout;
      for (const component of components) {
        current = join(current, component);
        const stat = lstatSync(current);
        if (stat.isSymbolicLink()) return undefined;
        if (!stat.isDirectory()) break;
      }
    }
    const paths = output.split('\u0000').filter(Boolean).sort(codeUnitCompare);
    const entries: Array<{ path: string; digest: string }> = [];
    for (const path of paths) {
      const components = path.split('/');
      if (
        path.startsWith('/') ||
        components.length === 0 ||
        components.some((component) => component.length === 0 || component === '.' || component === '..')
      )
        return undefined;
      let current = checkout;
      for (const [index, component] of components.entries()) {
        current = join(current, component);
        const stat = lstatSync(current);
        if (stat.isSymbolicLink()) return undefined;
        if (index < components.length - 1) {
          if (!stat.isDirectory() || realpathSync(current) !== current) return undefined;
        } else {
          const contentDigest = regularFileDigest(current);
          if (!contentDigest) return undefined;
          entries.push({ path: current, digest: contentDigest });
        }
      }
    }
    return Object.freeze({
      literals: Object.freeze(entries.map((entry) => entry.path)),
      digest: digest('LOCAL-COMMAND-TRACKED-CHECKOUT-READ', entries),
    });
  } catch {
    return undefined;
  }
}

function authenticatedCheckout(
  path: unknown,
  request: VerificationRequest,
  targetBasisCommit: string,
  targetBasisTree: string,
): LocalCommandResult<LocalCommandCheckoutResourceClaims> {
  const trusted = trustedDirectory(path);
  if (!trusted.ok) return trusted;
  const checkout = trusted.value;
  const root = gitOutput(checkout, ['rev-parse', '--show-toplevel']);
  if (root !== checkout) return fail('FC-SUBJECT', 'CHECKOUT_NOT_REPOSITORY');
  const commit = gitOutput(checkout, ['rev-parse', '--verify', 'HEAD']);
  const tree = gitOutput(checkout, ['rev-parse', '--verify', 'HEAD^{tree}']);
  const contentDigest = tree && deriveLocalCommandCheckoutContentDigest(tree);
  const targetDigest = deriveLocalCommandTargetBasisDigest(targetBasisCommit, targetBasisTree);
  const verifiedTargetTree = gitOutput(checkout, ['rev-parse', '--verify', `${targetBasisCommit}^{tree}`]);
  if (
    !commit ||
    !tree ||
    !contentDigest ||
    !targetDigest ||
    verifiedTargetTree !== targetBasisTree ||
    contentDigest !== request.subject.candidateContentDigest ||
    contentDigest !== request.cleanReceipt.candidateContentDigest ||
    targetDigest !== request.fence.targetBasisDigest ||
    targetDigest !== request.cleanReceipt.targetBasisDigest
  )
    return fail('FC-SUBJECT', 'CHECKOUT_CANDIDATE_MISMATCH');
  const trackedRead = trackedCheckoutReadAuthority(checkout);
  if (!trackedRead) return fail('FC-SUBJECT', 'CHECKOUT_SYMLINK_REJECTED');
  if (gitOutput(checkout, ['status', '--porcelain=v1', '--untracked-files=all'], 16_384) !== '')
    return fail('FC-SUBJECT', 'CHECKOUT_NOT_CLEAN');
  if (
    request.cleanReceipt.checkout !== 'read-only' ||
    request.cleanReceipt.scratch !== 'discarded' ||
    request.cleanReceipt.network !== 'none'
  )
    return fail('FC-SUBJECT', 'CHECKOUT_RECEIPT_MISMATCH');
  return ok(
    Object.freeze({
      canonicalRoot: checkout,
      candidateCommit: commit,
      candidateTree: tree,
      candidateContentDigest: contentDigest,
      targetBasisCommit,
      targetBasisTree,
      targetBasisDigest: targetDigest,
      cleanReceiptDigest: request.cleanReceipt.receiptDigest,
      trackedReadDigest: trackedRead.digest,
    }),
  );
}

export function createLocalCommandCheckoutResource(
  input: Readonly<{
    checkoutPath: string;
    request: unknown;
    targetBasisCommit: string;
    targetBasisTree: string;
  }>,
): LocalCommandResult<LocalCommandCheckoutResource> {
  const raw = fields(input, ['checkoutPath', 'request', 'targetBasisCommit', 'targetBasisTree']);
  const requestResult = raw && validateVerificationRequest(raw.request);
  if (
    !raw ||
    !requestResult?.ok ||
    !GIT_OBJECT.test(String(raw.targetBasisCommit)) ||
    !GIT_OBJECT.test(String(raw.targetBasisTree))
  )
    return fail('FC-INPUT', 'INVALID_CHECKOUT_RESOURCE');
  const resource = authenticatedCheckout(
    raw.checkoutPath,
    requestResult.value,
    raw.targetBasisCommit as string,
    raw.targetBasisTree as string,
  );
  if (!resource.ok) return resource;
  const carrier = Object.freeze({});
  checkoutResources.set(carrier, resource.value);
  return ok(carrier);
}

function redacted(value: string): string {
  const masked = value.replace(
    /(?:secret|token|password|credential|authorization|api[._ -]?key)\s*[:=]\s*[^\s,;]+/giu,
    '[REDACTED]',
  );
  return [...masked]
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 32 || code === 127 ? '�' : character;
    })
    .join('');
}

function output(value: string): Readonly<{ value: string; truncated: boolean }> {
  const safe = redacted(value);
  return Object.freeze({ value: safe.slice(0, MAX_PREVIEW), truncated: safe.length > MAX_PREVIEW });
}

function nativePostureDigest(value: LocalCommandNativePosture): string {
  const { digest: _digest, ...posture } = value;
  return digest('LOCAL-COMMAND-NATIVE-POSTURE', posture);
}

function runtimeReadAuthorityCurrent(manifest: LocalCommandManifest): boolean {
  const command = manifest.value.subprocessAuthority[0];
  const runtime = manifest.value.runtimeReadAuthority;
  const policy = manifest.value.sandboxPolicyAuthority;
  return (
    runtime[0].path === command.executable &&
    runtime[0].role === 'executable' &&
    runtime[0].digest === command.executableDigest &&
    regularFileDigest(runtime[0].path) === runtime[0].digest &&
    runtime[1].path === DYNAMIC_LOADER &&
    runtime[1].role === 'dynamic-loader' &&
    regularFileDigest(runtime[1].path) === runtime[1].digest &&
    policy.confinementProbe.executable === CONFINEMENT_PROBE_EXECUTABLE &&
    regularFileDigest(policy.confinementProbe.executable) === policy.confinementProbe.executableDigest &&
    policy.confinementProbe.dynamicLoader === DYNAMIC_LOADER &&
    regularFileDigest(policy.confinementProbe.dynamicLoader) === policy.confinementProbe.dynamicLoaderDigest
  );
}

function nativePostureCurrent(value: LocalCommandNativePosture, manifest: LocalCommandManifest): boolean {
  return (
    platform() === 'darwin' &&
    value.os === 'darwin' &&
    value.sandboxExecutable === SANDBOX_EXECUTABLE &&
    value.sandboxExecutableDigest === regularFileDigest(SANDBOX_EXECUTABLE) &&
    runtimeReadAuthorityCurrent(manifest) &&
    value.runtimeReadDigest === runtimeReadDigest(manifest.value.runtimeReadAuthority) &&
    value.sandboxPolicyDigest === sandboxPolicyDigest(manifest.value.sandboxPolicyAuthority) &&
    value.digest === nativePostureDigest(value)
  );
}

export function attestLocalPosixPosture(
  input: Readonly<{ executable: string; manifest: LocalCommandManifest; network?: 'denied' | 'allowed' }>,
): LocalCommandResult<LocalCommandNativePosture> {
  const parsed = parseManifest(input?.manifest);
  if (
    !parsed.ok ||
    parsed.value.value.subprocessAuthority[0].executable !== input.executable ||
    input.network === 'allowed'
  )
    return fail('FC-AUTHORITY', 'NATIVE_POSTURE_UNAVAILABLE');
  if (platform() !== 'darwin' || !existsSync(SANDBOX_EXECUTABLE))
    return fail('FC-AUTHORITY', 'NATIVE_POSTURE_UNAVAILABLE');
  try {
    if (!runtimeReadAuthorityCurrent(parsed.value) || regularFileDigest(SANDBOX_EXECUTABLE) === undefined)
      return fail('FC-TRUST', 'NATIVE_POSTURE_UNTRUSTED');
    const posture = Object.freeze({
      os: 'darwin' as const,
      sandboxExecutable: SANDBOX_EXECUTABLE as typeof SANDBOX_EXECUTABLE,
      sandboxExecutableDigest: regularFileDigest(SANDBOX_EXECUTABLE) as string,
      checkout: 'read-only' as const,
      scratch: 'discarded' as const,
      network: 'denied' as const,
      credentials: 'none' as const,
      runtimeReadDigest: runtimeReadDigest(parsed.value.value.runtimeReadAuthority),
      sandboxPolicyDigest: sandboxPolicyDigest(parsed.value.value.sandboxPolicyAuthority),
      digest: '',
    });
    return ok(Object.freeze({ ...posture, digest: nativePostureDigest(posture) }));
  } catch {
    return fail('FC-TRUST', 'NATIVE_POSTURE_UNTRUSTED');
  }
}

function sandboxProfile(
  checkout: string,
  scratch: string,
  runtime: readonly RuntimeReadDescriptor[],
  policy: SandboxPolicyDescriptor,
  checkoutReadLiterals: readonly string[] = [],
  extraReadLiterals: readonly string[] = [],
): string | undefined {
  const canonicalCheckout = canonicalDirectory(checkout);
  const canonicalScratch = canonicalDirectory(scratch);
  if (!canonicalCheckout || !canonicalScratch || pathWithin(canonicalCheckout, canonicalScratch)) return undefined;
  const literals = [
    ...new Set([
      ...SANDBOX_SYSTEM_READ_LITERALS,
      ...pathAncestors(canonicalCheckout),
      ...checkoutReadLiterals,
      ...extraReadLiterals,
      ...runtime.map((entry) => entry.path),
    ]),
  ];
  const maps = [...new Set(runtime.map((entry) => entry.path))];
  if (policy.systemReadLiterals.some((entry, index) => entry !== SANDBOX_SYSTEM_READ_LITERALS[index])) return undefined;
  const readLiterals = literals.map((path) => `(literal ${JSON.stringify(path)})`).join(' ');
  const mapLiterals = maps.map((path) => `(literal ${JSON.stringify(path)})`).join(' ');
  return [
    '(version 1)',
    '(deny default)',
    '(allow process-exec)',
    '(allow process-fork)',
    '(allow signal)',
    '(allow sysctl-read)',
    `(allow file-read* ${readLiterals})`,
    `(allow file-map-executable ${mapLiterals})`,
    `(allow file-write* (subpath ${JSON.stringify(canonicalScratch)}))`,
    '(deny network*)',
    '',
  ].join('\n');
}

type CommandRun = Readonly<{
  outcome: 'pass' | 'fail';
  output: LocalCommandOutput;
  launcherArgs: readonly string[];
}>;

function exactLauncherArgs(value: unknown, command: LocalCommandManifestValue['subprocessAuthority'][number]) {
  const args = list(value, MAX_ARGS + 3);
  if (
    !args ||
    args.length !== command.args.length + 3 ||
    args[0] !== '-p' ||
    typeof args[1] !== 'string' ||
    args[1].length === 0 ||
    args[2] !== command.executable ||
    !same(args.slice(3), command.args)
  )
    return undefined;
  return Object.freeze(args as string[]);
}

function executeCommand(
  manifest: LocalCommandManifest,
  checkout: string,
  scratch: string,
  native: LocalCommandNativePosture,
  waitMs: number,
  checkoutReadLiterals: readonly string[] = [],
): LocalCommandResult<CommandRun> {
  const command = manifest.value.subprocessAuthority[0];
  if (!nativePostureCurrent(native, manifest)) return fail('FC-AUTHORITY', 'NATIVE_POSTURE_UNAVAILABLE');
  const profile = sandboxProfile(
    checkout,
    scratch,
    manifest.value.runtimeReadAuthority,
    manifest.value.sandboxPolicyAuthority,
    checkoutReadLiterals,
  );
  if (!profile) return fail('FC-SUBJECT', 'CHECKOUT_UNTRUSTED');
  try {
    const launcherArgs = Object.freeze(['-p', profile, command.executable, ...command.args]);
    const stdout = execFileSync(SANDBOX_EXECUTABLE, launcherArgs, {
      cwd: checkout,
      env: Object.freeze({}),
      encoding: 'utf8',
      maxBuffer: MAX_OUTPUT,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: waitMs,
    });
    const safeStdout = output(stdout);
    const resultOutput = Object.freeze({
      stdoutDigest: sha256(redacted(stdout)),
      stderrDigest: sha256(''),
      stdoutPreview: safeStdout.value,
      stderrPreview: '',
      truncated: safeStdout.truncated,
    });
    return ok({ outcome: 'pass', output: resultOutput, launcherArgs });
  } catch (error) {
    const record = (typeof error === 'object' && error !== null ? error : {}) as Record<string, unknown>;
    const typedFailure = classifyProcessFailure(error, { family: 'FC-AUTHORITY', code: 'COMMAND_LAUNCH_FAILED' });
    if (typedFailure) return fail(typedFailure.family, typedFailure.code);
    const stdout = typeof record.stdout === 'string' ? record.stdout : '';
    const stderr = typeof record.stderr === 'string' ? record.stderr : '';
    const safeStdout = output(stdout);
    const safeStderr = output(stderr);
    return ok({
      outcome: 'fail',
      output: Object.freeze({
        stdoutDigest: sha256(redacted(stdout)),
        stderrDigest: sha256(redacted(stderr)),
        stdoutPreview: safeStdout.value,
        stderrPreview: safeStderr.value,
        truncated: safeStdout.truncated || safeStderr.truncated,
      }),
      launcherArgs: Object.freeze(['-p', profile, command.executable, ...command.args]),
    });
  } finally {
    void native;
  }
}

type ConfinementProbeResult = Readonly<{
  insideAllowed: true;
  outsideDenied: true;
  ignoredSymlinkDenied: true;
  ignoredCredentialDenied: true;
  digest: string;
}>;

function runConfinementProbe(
  checkout: string,
  scratch: string,
  policy: SandboxPolicyDescriptor,
): LocalCommandResult<ConfinementProbeResult> {
  const runtime = Object.freeze([
    Object.freeze({
      path: policy.confinementProbe.executable,
      role: 'executable' as const,
      digest: policy.confinementProbe.executableDigest,
    }),
    Object.freeze({
      path: policy.confinementProbe.dynamicLoader,
      role: 'dynamic-loader' as const,
      digest: policy.confinementProbe.dynamicLoaderDigest,
    }),
  ]);
  const inside = join(checkout, 'gf047-confinement-inside.txt');
  const outside = join(dirname(checkout), 'gf047-confinement-outside.txt');
  const ignoredCredential = join(checkout, 'ignored-credential.txt');
  const ignoredSymlink = join(checkout, 'nested', 'ignored-host-link');
  const marker = 'gf047-confinement-inside\n';
  try {
    mkdirSync(dirname(ignoredSymlink), { recursive: true });
    writeFileSync(inside, marker, { encoding: 'utf8', flag: 'wx' });
    writeFileSync(outside, 'gf047-confinement-outside\n', { encoding: 'utf8', flag: 'wx' });
    writeFileSync(ignoredCredential, 'secret=gf047-ignored\n', { encoding: 'utf8', flag: 'wx' });
    symlinkSync(outside, ignoredSymlink);
    writeFileSync(join(checkout, '.gitignore'), 'ignored-*\n', { encoding: 'utf8', flag: 'wx' });
    execFileSync('/usr/bin/git', ['init', '-q'], {
      cwd: checkout,
      env: Object.freeze({ PATH: '/usr/bin:/bin' }),
      encoding: 'utf8',
      maxBuffer: 1_024,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5_000,
    });
    for (const ignoredPath of ['ignored-credential.txt', 'nested/ignored-host-link'])
      execFileSync('/usr/bin/git', ['check-ignore', '-q', '--', ignoredPath], {
        cwd: checkout,
        env: Object.freeze({ PATH: '/usr/bin:/bin' }),
        encoding: 'utf8',
        maxBuffer: 1_024,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 5_000,
      });
    const probeOutputPaths = [
      join(scratch, 'inside-output.txt'),
      join(scratch, 'outside-output.txt'),
      join(scratch, 'ignored-link-output.txt'),
      join(scratch, 'ignored-credential-output.txt'),
    ];
    for (const outputPath of probeOutputPaths) writeFileSync(outputPath, '', { encoding: 'utf8', flag: 'wx' });
    const profile = sandboxProfile(checkout, scratch, runtime, policy, [], [inside, ...probeOutputPaths]);
    if (!profile) return fail('FC-AUTHORITY', 'SANDBOX_CONFINEMENT_FAILED');
    const readUnderSandbox = (path: string, outputPath: string): Readonly<{ ok: boolean; output: string }> => {
      let outputFd: number | undefined;
      try {
        outputFd = openSync(outputPath, 'w');
        execFileSync(SANDBOX_EXECUTABLE, ['-p', profile, policy.confinementProbe.executable, path], {
          cwd: checkout,
          env: Object.freeze({}),
          encoding: 'utf8',
          maxBuffer: 1_024,
          shell: false,
          stdio: ['ignore', outputFd, 'pipe'],
          timeout: 5_000,
        });
        return Object.freeze({ ok: true, output: new TextDecoder().decode(readFileSync(outputPath)) });
      } catch {
        return Object.freeze({ ok: false, output: '' });
      } finally {
        if (outputFd !== undefined) closeSync(outputFd);
      }
    };
    const insideRead = readUnderSandbox(inside, join(scratch, 'inside-output.txt'));
    if (!insideRead.ok || insideRead.output !== marker) return fail('FC-AUTHORITY', 'SANDBOX_CONFINEMENT_FAILED');
    const outsideDenied = !readUnderSandbox(outside, join(scratch, 'outside-output.txt')).ok;
    if (!outsideDenied) return fail('FC-AUTHORITY', 'SANDBOX_CONFINEMENT_FAILED');
    const ignoredSymlinkDenied = !readUnderSandbox(ignoredSymlink, join(scratch, 'ignored-link-output.txt')).ok;
    const ignoredCredentialDenied = !readUnderSandbox(ignoredCredential, join(scratch, 'ignored-credential-output.txt'))
      .ok;
    if (!ignoredSymlinkDenied || !ignoredCredentialDenied) return fail('FC-AUTHORITY', 'SANDBOX_CONFINEMENT_FAILED');
    return ok(
      Object.freeze({
        insideAllowed: true,
        outsideDenied: true,
        ignoredSymlinkDenied: true,
        ignoredCredentialDenied: true,
        digest: digest('LOCAL-COMMAND-CONFINEMENT-TEST', {
          insideAllowed: true,
          outsideDenied: true,
          ignoredSymlinkDenied: true,
          ignoredCredentialDenied: true,
          profileDigest: digest('LOCAL-COMMAND-RENDERED-POLICY', profile),
          runtimeReadDigest: runtimeReadDigest(runtime),
        }),
      }),
    );
  } catch (error) {
    const typedFailure = classifyProcessFailure(error, { family: 'FC-AUTHORITY', code: 'SANDBOX_CONFINEMENT_FAILED' });
    return typedFailure
      ? fail(typedFailure.family, typedFailure.code)
      : fail('FC-AUTHORITY', 'SANDBOX_CONFINEMENT_FAILED');
  }
}

function validateAdmission(
  admission: unknown,
  manifest: LocalCommandManifest,
): LocalCommandResult<LocalCommandAdmission> {
  const now = Date.now();
  const raw = fields(admission, ['certificate']);
  const claims =
    raw && typeof raw.certificate === 'object' && raw.certificate !== null
      ? readProviderAdmissionCertificateClaims(raw.certificate)
      : undefined;
  if (
    !raw ||
    !claims ||
    claims.principal !== 'principal/arye' ||
    claims.providerIdentity !== LOCAL_COMMAND_VERIFIER_PROVIDER ||
    claims.providerBuild !== LOCAL_COMMAND_VERIFIER_BUILD_DIGEST ||
    claims.environment !== LOCAL_COMMAND_VERIFIER_ENVIRONMENT ||
    claims.capability !== 'PORT-VERIFY/local-command' ||
    claims.policyMinimum !== 'policy/local-posix-command-verifier/v1' ||
    claims.manifestId !== manifest.manifestId ||
    claims.manifestDigest !== manifest.manifestDigest ||
    !same(claims.scope, SCOPE) ||
    !DIGEST.test(claims.proofDigest) ||
    claims.maxAgeMs !== LOCAL_COMMAND_VERIFIER_MAX_PROOF_AGE_MS ||
    !Number.isSafeInteger(claims.observedAt) ||
    claims.observedAt < 0 ||
    claims.observedAt > now ||
    now - claims.observedAt > LOCAL_COMMAND_VERIFIER_MAX_PROOF_AGE_MS ||
    currentBuildDigest() !== LOCAL_COMMAND_VERIFIER_BUILD_DIGEST
  )
    return fail('FC-AUTHORITY', 'GF022_ADMISSION_REQUIRED');
  return ok(claims);
}

export function runLocalCommandQualificationProbe(
  input: Readonly<{
    candidateCommit: string;
    candidateTree: string;
    manifest: LocalCommandManifest;
    admission: unknown;
    retainRoot?: boolean;
  }>,
): LocalCommandResult<LocalCommandQualificationEvidence> {
  if (input.retainRoot) return fail('FC-AUTHORITY', 'DISPOSABLE_SCRATCH_REQUIRED');
  if (!GIT_OBJECT.test(input?.candidateCommit) || !GIT_OBJECT.test(input?.candidateTree))
    return fail('FC-INPUT', 'CANDIDATE_DIGEST_REQUIRED');
  const manifest = parseManifest(input?.manifest);
  if (!manifest.ok) return manifest;
  const candidate = currentCandidateSubject();
  if (!candidate || input.candidateCommit !== candidate.commit || input.candidateTree !== candidate.tree)
    return fail('FC-AUTHORITY', 'CANDIDATE_SUBJECT_UNBOUND');
  const candidateCheckout = currentCandidateCheckoutRoot();
  const trackedRead = candidateCheckout && trackedCheckoutReadAuthority(candidateCheckout);
  if (!trackedRead) return fail('FC-SUBJECT', 'CHECKOUT_SYMLINK_REJECTED');
  const admission = validateAdmission(input.admission, manifest.value);
  if (!admission.ok) return admission;
  const command = manifest.value.value.subprocessAuthority[0];
  const native = attestLocalPosixPosture({ executable: command.executable, manifest: manifest.value });
  if (!native.ok) return native;
  let root: string | undefined;
  let failure: LocalCommandFailure | undefined;
  let evidence: Omit<LocalCommandQualificationEvidence, 'removedResources'> | undefined;
  try {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'jig-gf047-')));
    const checkout = join(root, 'checkout');
    const scratch = join(root, 'scratch');
    mkdirSync(checkout, { recursive: true });
    mkdirSync(scratch, { recursive: true });
    const confinementResult = runConfinementProbe(checkout, scratch, manifest.value.value.sandboxPolicyAuthority);
    if (!confinementResult.ok) failure = confinementResult.error;
    const confinement = confinementResult.ok ? confinementResult.value : undefined;
    const run = confinement ? executeCommand(manifest.value, checkout, scratch, native.value, 15_000) : undefined;
    if (!failure && run && !run.ok) failure = run.error;
    if (!failure && (!run?.ok || run.value.outcome !== 'pass'))
      failure = { family: 'FC-MECHANISM', code: 'CF_MECH_VERIFY_FAILED' };
    if (!failure && confinement && run?.ok) {
      const environmentDigest = digest('LOCAL-COMMAND-ENVIRONMENT', {
        environment: LOCAL_COMMAND_VERIFIER_ENVIRONMENT,
        names: [],
      });
      const observations = Object.freeze({
        'exact-manifest': true,
        'exact-executable-digest': sha256(readFileSync(command.executable)) === command.executableDigest,
        'exact-args': Boolean(exactLauncherArgs(run.value.launcherArgs, command)),
        'no-shell': true,
        'declared-env-only': true,
        'no-credentials': manifest.value.value.credentialAuthority.length === 0,
        'native-read-only-no-network': native.value.network === 'denied',
        'runtime-read-digest':
          native.value.runtimeReadDigest === runtimeReadDigest(manifest.value.value.runtimeReadAuthority),
        'sandbox-policy-digest':
          native.value.sandboxPolicyDigest === sandboxPolicyDigest(manifest.value.value.sandboxPolicyAuthority),
        'actual-confinement': confinement.insideAllowed && confinement.outsideDenied,
        'ignored-symlink-denied': confinement.ignoredSymlinkDenied,
        'ignored-credential-denied': confinement.ignoredCredentialDenied,
        'tracked-read-digest': trackedRead.digest === trackedCheckoutReadAuthority(candidateCheckout as string)?.digest,
        'bounded-redacted-output':
          run.value.output.stdoutPreview.length <= MAX_PREVIEW && run.value.output.stderrPreview.length <= MAX_PREVIEW,
        'mechanism-observation': true,
      });
      if (!Object.values(observations).every(Boolean))
        failure = { family: 'FC-AUTHORITY', code: 'CF_MECH_VERIFY_FAILED' };
      else {
        const requestDigest = digest('LOCAL-COMMAND-PROBE-REQUEST', {
          manifest: manifest.value.manifestId,
          command,
          candidateCommit: input.candidateCommit,
          candidateTree: input.candidateTree,
        });
        const resultDigest = digest('LOCAL-COMMAND-PROBE-RESULT', {
          run: run.value,
          native: native.value.digest,
          confinement: confinement.digest,
        });
        evidence = Object.freeze({
          kind: 'CF-GATE-PROVIDER' as const,
          status: 'passed' as const,
          suite: LOCAL_COMMAND_VERIFIER_SUITE_VERSION,
          probe: LOCAL_COMMAND_VERIFIER_PROBE_VERSION,
          provider: LOCAL_COMMAND_VERIFIER_PROVIDER,
          providerBuildDigest: LOCAL_COMMAND_VERIFIER_BUILD_DIGEST,
          manifestId: manifest.value.manifestId,
          manifestDigest: manifest.value.manifestDigest,
          environment: LOCAL_COMMAND_VERIFIER_ENVIRONMENT,
          environmentDigest,
          nativePosture: native.value,
          nativePostureDigest: native.value.digest,
          runtimeReadDigest: native.value.runtimeReadDigest,
          sandboxPolicyDigest: native.value.sandboxPolicyDigest,
          confinementTestDigest: confinement.digest,
          trackedReadDigest: trackedRead.digest,
          candidateCommit: input.candidateCommit,
          candidateTree: input.candidateTree,
          fixtureDigest: digest('LOCAL-COMMAND-FIXTURE', { command, scope: SCOPE }),
          admissionProofDigest: admission.value.proofDigest,
          mechanismGate: 'CF-MECH-VERIFY:passed' as const,
          observations,
          result: run.value,
          requestDigest,
          resultDigest,
          probeDigest: digest('LOCAL-COMMAND-PROBE', { requestDigest, resultDigest, observations }),
          resourceRoot: root,
          recorder: 'recorder/jig-gf047-local-command/v1' as const,
        });
      }
    }
  } catch {
    failure = { family: 'FC-MECHANISM', code: 'QUALIFICATION_PROBE_FAILED' };
  }
  if (root && existsSync(root)) {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      failure = { family: 'FC-TRUST', code: 'SCRATCH_DISPOSAL_FAILED' };
    }
    if (existsSync(root)) failure = { family: 'FC-TRUST', code: 'SCRATCH_DISPOSAL_FAILED' };
  }
  if (failure) return fail(failure.family, failure.code);
  if (!root || !evidence) return fail('FC-TRUST', 'SCRATCH_DISPOSAL_FAILED');
  const certificate = Object.freeze({ ...evidence, removedResources: Object.freeze([root]) });
  qualificationCertificates.set(certificate, certificate);
  return ok(certificate);
}

function exactQualification(
  input: unknown,
  manifest: LocalCommandManifest,
  admission: LocalCommandAdmission,
): LocalCommandResult<LocalCommandQualificationEvidence> {
  const trusted = typeof input === 'object' && input !== null ? qualificationCertificates.get(input) : undefined;
  if (!trusted) return fail('FC-AUTHORITY', 'EXACT_QUALIFICATION_REQUIRED');
  input = trusted;
  const raw = fields(input, [
    'admissionProofDigest',
    'candidateCommit',
    'candidateTree',
    'environment',
    'environmentDigest',
    'fixtureDigest',
    'kind',
    'manifestDigest',
    'manifestId',
    'mechanismGate',
    'nativePosture',
    'nativePostureDigest',
    'observations',
    'probe',
    'probeDigest',
    'provider',
    'providerBuildDigest',
    'recorder',
    'removedResources',
    'result',
    'requestDigest',
    'resourceRoot',
    'resultDigest',
    'runtimeReadDigest',
    'sandboxPolicyDigest',
    'status',
    'suite',
    'trackedReadDigest',
    'confinementTestDigest',
  ]);
  const command = manifest.value.subprocessAuthority[0];
  const native =
    raw &&
    fields(raw.nativePosture, [
      'checkout',
      'credentials',
      'digest',
      'network',
      'os',
      'runtimeReadDigest',
      'sandboxExecutable',
      'sandboxExecutableDigest',
      'sandboxPolicyDigest',
      'scratch',
    ]);
  const observations = raw && plain(raw.observations) ? raw.observations : undefined;
  const result = raw && fields(raw.result, ['launcherArgs', 'outcome', 'output']);
  const launcherArgs = result && exactLauncherArgs(result.launcherArgs, command);
  const resultOutput =
    result && fields(result.output, ['stderrDigest', 'stderrPreview', 'stdoutDigest', 'stdoutPreview', 'truncated']);
  const observationNames = [
    'bounded-redacted-output',
    'declared-env-only',
    'exact-args',
    'exact-executable-digest',
    'exact-manifest',
    'mechanism-observation',
    'native-read-only-no-network',
    'no-credentials',
    'no-shell',
    'runtime-read-digest',
    'sandbox-policy-digest',
    'actual-confinement',
    'ignored-symlink-denied',
    'ignored-credential-denied',
    'tracked-read-digest',
  ] as const;
  const expectedRequestDigest =
    raw &&
    digest('LOCAL-COMMAND-PROBE-REQUEST', {
      manifest: manifest.manifestId,
      command,
      candidateCommit: raw.candidateCommit,
      candidateTree: raw.candidateTree,
    });
  const candidate = currentCandidateSubject();
  if (
    raw?.kind !== 'CF-GATE-PROVIDER' ||
    raw.status !== 'passed' ||
    raw.suite !== LOCAL_COMMAND_VERIFIER_SUITE_VERSION ||
    raw.probe !== LOCAL_COMMAND_VERIFIER_PROBE_VERSION ||
    raw.provider !== LOCAL_COMMAND_VERIFIER_PROVIDER ||
    raw.providerBuildDigest !== LOCAL_COMMAND_VERIFIER_BUILD_DIGEST ||
    raw.providerBuildDigest !== currentBuildDigest() ||
    !candidate ||
    raw.candidateCommit !== candidate.commit ||
    raw.candidateTree !== candidate.tree ||
    raw.manifestId !== manifest.manifestId ||
    raw.manifestDigest !== manifest.manifestDigest ||
    raw.environment !== LOCAL_COMMAND_VERIFIER_ENVIRONMENT ||
    raw.admissionProofDigest !== admission.proofDigest ||
    raw.mechanismGate !== 'CF-MECH-VERIFY:passed' ||
    raw.recorder !== 'recorder/jig-gf047-local-command/v1' ||
    !GIT_OBJECT.test(String(raw.candidateCommit)) ||
    !GIT_OBJECT.test(String(raw.candidateTree)) ||
    !DIGEST.test(String(raw.environmentDigest)) ||
    !DIGEST.test(String(raw.nativePostureDigest)) ||
    !DIGEST.test(String(raw.fixtureDigest)) ||
    !DIGEST.test(String(raw.requestDigest)) ||
    !DIGEST.test(String(raw.resultDigest)) ||
    !DIGEST.test(String(raw.probeDigest)) ||
    !DIGEST.test(String(raw.runtimeReadDigest)) ||
    !DIGEST.test(String(raw.sandboxPolicyDigest)) ||
    !DIGEST.test(String(raw.trackedReadDigest)) ||
    !DIGEST.test(String(raw.confinementTestDigest)) ||
    !result ||
    !launcherArgs ||
    result.outcome !== 'pass' ||
    !resultOutput ||
    !DIGEST.test(String(resultOutput.stdoutDigest)) ||
    !DIGEST.test(String(resultOutput.stderrDigest)) ||
    typeof resultOutput.stdoutPreview !== 'string' ||
    typeof resultOutput.stderrPreview !== 'string' ||
    resultOutput.stdoutPreview.length > MAX_PREVIEW ||
    resultOutput.stderrPreview.length > MAX_PREVIEW ||
    typeof resultOutput.truncated !== 'boolean' ||
    resultOutput.stdoutPreview.includes('secret=') ||
    resultOutput.stderrPreview.includes('secret=') ||
    raw.resultDigest !==
      digest('LOCAL-COMMAND-PROBE-RESULT', {
        run: result,
        native: raw.nativePostureDigest,
        confinement: raw.confinementTestDigest,
      }) ||
    !native ||
    native.os !== 'darwin' ||
    native.sandboxExecutable !== SANDBOX_EXECUTABLE ||
    native.sandboxExecutableDigest !== fileDigest(SANDBOX_EXECUTABLE) ||
    native.checkout !== 'read-only' ||
    native.scratch !== 'discarded' ||
    native.network !== 'denied' ||
    native.credentials !== 'none' ||
    native.runtimeReadDigest !== raw.runtimeReadDigest ||
    native.sandboxPolicyDigest !== raw.sandboxPolicyDigest ||
    native.digest !== raw.nativePostureDigest ||
    raw.runtimeReadDigest !== runtimeReadDigest(manifest.value.runtimeReadAuthority) ||
    raw.sandboxPolicyDigest !== sandboxPolicyDigest(manifest.value.sandboxPolicyAuthority) ||
    raw.trackedReadDigest !== trackedCheckoutReadAuthority(currentCandidateCheckoutRoot() ?? '')?.digest ||
    !runtimeReadAuthorityCurrent(manifest) ||
    nativePostureDigest(native as unknown as LocalCommandNativePosture) !== raw.nativePostureDigest ||
    raw.environmentDigest !==
      digest('LOCAL-COMMAND-ENVIRONMENT', { environment: LOCAL_COMMAND_VERIFIER_ENVIRONMENT, names: [] }) ||
    raw.fixtureDigest !== digest('LOCAL-COMMAND-FIXTURE', { command, scope: SCOPE }) ||
    raw.requestDigest !== expectedRequestDigest ||
    !Array.isArray(raw.removedResources) ||
    raw.removedResources.length !== 1 ||
    raw.removedResources[0] !== raw.resourceRoot ||
    raw.removedResources.some((entry) => typeof entry !== 'string') ||
    existsSync(String(raw.resourceRoot)) ||
    !observations ||
    Object.keys(observations).length !== observationNames.length ||
    observationNames.some((name) => observations[name] !== true) ||
    raw.probeDigest !==
      digest('LOCAL-COMMAND-PROBE', { requestDigest: raw.requestDigest, resultDigest: raw.resultDigest, observations })
  )
    return fail('FC-AUTHORITY', 'EXACT_QUALIFICATION_REQUIRED');
  return ok(raw as unknown as LocalCommandQualificationEvidence);
}

function makeObservation(
  request: VerificationRequest,
  manifest: LocalCommandManifest,
  native: LocalCommandNativePosture,
  run: CommandRun,
  observedAt: number,
): LocalCommandObservation {
  const command = manifest.value.subprocessAuthority[0];
  const outputDigest = digest('LOCAL-COMMAND-OUTPUT', run.output);
  return Object.freeze({
    schema: 'jig.ev-check-observation.v1',
    version: 'jig.verification-contract.v1',
    kind: 'EV-CHECK-OBSERVATION',
    mechanism: LOCAL_COMMAND_VERIFIER_PROVIDER,
    provider: LOCAL_COMMAND_VERIFIER_PROVIDER,
    operation: request.operation,
    subject: request.subject,
    fence: request.fence,
    checkClass: request.checkClass as string,
    outcome: run.outcome,
    evidenceKind: request.policy.required.find((entry) => entry.name === request.checkClass)?.evidenceKind as string,
    evidenceDigest: digest('LOCAL-COMMAND-EVIDENCE', { request: request.subject, outputDigest, native: native.digest }),
    artifactDigests: Object.freeze([outputDigest]),
    environmentDigest: request.environment.digest,
    cleanReceiptDigest: request.cleanReceipt.receiptDigest,
    effectFree: true,
    observedAt,
    providerBuildDigest: LOCAL_COMMAND_VERIFIER_BUILD_DIGEST,
    manifestId: manifest.manifestId,
    executableDigest: command.executableDigest,
    argsDigest: digest('LOCAL-COMMAND-ARGS', command.args),
    nativePostureDigest: native.digest,
    output: run.output,
  });
}

function validateObservation(
  value: unknown,
  request: VerificationRequest,
  manifest: LocalCommandManifest,
  native: LocalCommandNativePosture,
): LocalCommandObservation | undefined {
  const raw = fields(value, [
    'artifactDigests',
    'checkClass',
    'cleanReceiptDigest',
    'effectFree',
    'evidenceDigest',
    'evidenceKind',
    'environmentDigest',
    'executableDigest',
    'fence',
    'kind',
    'manifestId',
    'mechanism',
    'nativePostureDigest',
    'observedAt',
    'operation',
    'outcome',
    'output',
    'provider',
    'providerBuildDigest',
    'schema',
    'subject',
    'version',
    'argsDigest',
  ]);
  const artifacts = raw && list(raw.artifactDigests, 16);
  const outputValue =
    raw && fields(raw.output, ['stderrDigest', 'stderrPreview', 'stdoutDigest', 'stdoutPreview', 'truncated']);
  if (
    !raw ||
    !artifacts ||
    artifacts.some((entry) => !DIGEST.test(String(entry))) ||
    !outputValue ||
    !DIGEST.test(String(outputValue.stdoutDigest)) ||
    !DIGEST.test(String(outputValue.stderrDigest)) ||
    typeof outputValue.stdoutPreview !== 'string' ||
    typeof outputValue.stderrPreview !== 'string' ||
    outputValue.stdoutPreview.length > MAX_PREVIEW ||
    outputValue.stderrPreview.length > MAX_PREVIEW ||
    typeof outputValue.truncated !== 'boolean' ||
    raw.schema !== 'jig.ev-check-observation.v1' ||
    raw.version !== 'jig.verification-contract.v1' ||
    raw.kind !== 'EV-CHECK-OBSERVATION' ||
    raw.mechanism !== LOCAL_COMMAND_VERIFIER_PROVIDER ||
    raw.provider !== LOCAL_COMMAND_VERIFIER_PROVIDER ||
    raw.operation !== request.operation ||
    raw.checkClass !== request.checkClass ||
    !['pass', 'fail'].includes(String(raw.outcome)) ||
    !safeText(raw.evidenceKind) ||
    !DIGEST.test(String(raw.evidenceDigest)) ||
    !same(raw.subject, request.subject) ||
    !same(raw.fence, request.fence) ||
    raw.environmentDigest !== request.environment.digest ||
    raw.cleanReceiptDigest !== request.cleanReceipt.receiptDigest ||
    raw.effectFree !== true ||
    !Number.isSafeInteger(raw.observedAt) ||
    Number(raw.observedAt) < 0 ||
    raw.providerBuildDigest !== LOCAL_COMMAND_VERIFIER_BUILD_DIGEST ||
    raw.manifestId !== manifest.manifestId ||
    raw.executableDigest !== manifest.value.subprocessAuthority[0].executableDigest ||
    raw.argsDigest !== digest('LOCAL-COMMAND-ARGS', manifest.value.subprocessAuthority[0].args) ||
    raw.nativePostureDigest !== native.digest ||
    outputValue.stdoutPreview.includes('secret=') ||
    outputValue.stderrPreview.includes('secret=')
  )
    return undefined;
  return Object.freeze({
    ...raw,
    subject: request.subject,
    fence: request.fence,
    artifactDigests: Object.freeze(artifacts as string[]),
    output: Object.freeze(outputValue),
  }) as unknown as LocalCommandObservation;
}

function sameRetryContract(left: VerificationRequest, right: VerificationRequest): boolean {
  return (
    left.lifecycle === right.lifecycle &&
    left.checkClass === right.checkClass &&
    sameSubject(left.subject, right.subject) &&
    sameFence(left.fence, right.fence) &&
    same(left.policy, right.policy) &&
    same(left.configuration, right.configuration) &&
    same(left.environment, right.environment) &&
    same(left.cleanReceipt, right.cleanReceipt) &&
    same(left.bounds, right.bounds)
  );
}

function validRestoredFailureHistory(
  requests: readonly VerificationRequest[],
  failures: readonly LocalCommandFailureRecord[],
  invocations: readonly LocalCommandInvocation[],
  observations: readonly LocalCommandObservation[],
): boolean {
  try {
    const requestsByOperation = new Map<string, VerificationRequest>();
    for (const request of requests) {
      if (requestsByOperation.has(request.operation) || request.retryOrdinal < 1) return false;
      requestsByOperation.set(request.operation, request);
    }
    for (const request of requests) {
      if (request.retryOrdinal === 1) {
        if (request.predecessor !== null) return false;
        continue;
      }
      const predecessor = request.predecessor ? requestsByOperation.get(request.predecessor) : undefined;
      if (
        !predecessor ||
        predecessor.retryOrdinal + 1 !== request.retryOrdinal ||
        !sameRetryContract(request, predecessor)
      )
        return false;
    }

    const failuresByOperation = new Map<string, LocalCommandFailureRecord>();
    for (const failure of failures) {
      const request = requestsByOperation.get(failure.operation);
      if (
        !request ||
        failuresByOperation.has(failure.operation) ||
        failure.retryOrdinal !== request.retryOrdinal ||
        !same(failure.subject, request.subject) ||
        !same(failure.fence, request.fence) ||
        (failure.reason === 'timeout' && failure.code !== 'MECHANISM_TIMEOUT') ||
        (failure.reason === 'lost-response' && failure.code !== 'RESULT_UNCERTAIN')
      )
        return false;
      const matchingInvocations = invocations.filter((entry) => entry.operation === failure.operation);
      if (
        matchingInvocations.length !== 1 ||
        matchingInvocations[0]?.retryOrdinal !== request.retryOrdinal ||
        matchingInvocations[0]?.checkClass !== request.checkClass ||
        matchingInvocations[0]?.result !== failure.reason ||
        matchingInvocations[0]?.effect !== 'observation'
      )
        return false;
      if (failure.supersededBy !== null) {
        const successor = requestsByOperation.get(failure.supersededBy);
        if (
          !successor ||
          successor.predecessor !== failure.operation ||
          successor.retryOrdinal !== failure.retryOrdinal + 1 ||
          !sameRetryContract(successor, request)
        )
          return false;
      }
      failuresByOperation.set(failure.operation, failure);
    }

    const invocationsByOperation = new Map<string, LocalCommandInvocation>();
    for (const invocation of invocations) {
      const request = requestsByOperation.get(invocation.operation);
      const matchingObservations = observations.filter((entry) => entry.operation === invocation.operation);
      if (
        !request ||
        invocationsByOperation.has(invocation.operation) ||
        invocation.checkClass !== request.checkClass ||
        invocation.retryOrdinal !== request.retryOrdinal ||
        (invocation.result !== 'returned' && !failuresByOperation.has(invocation.operation)) ||
        (invocation.result === 'returned' &&
          (failuresByOperation.has(invocation.operation) ||
            matchingObservations.length !== 1 ||
            matchingObservations[0]?.checkClass !== invocation.checkClass))
      )
        return false;
      invocationsByOperation.set(invocation.operation, invocation);
    }

    const observationsByOperation = new Map<string, LocalCommandObservation>();
    for (const observation of observations) {
      const request = requestsByOperation.get(observation.operation);
      const invocation = invocationsByOperation.get(observation.operation);
      if (
        !request ||
        observationsByOperation.has(observation.operation) ||
        !invocation ||
        invocation.result !== 'returned' ||
        invocation.checkClass !== observation.checkClass ||
        invocation.retryOrdinal !== request.retryOrdinal
      )
        return false;
      observationsByOperation.set(observation.operation, observation);
    }

    for (const request of requests) {
      if (
        request.retryOrdinal > 1 &&
        !failures.some(
          (failure) => failure.operation === request.predecessor && failure.supersededBy === request.operation,
        )
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}

function parseLocalSnapshot(
  value: unknown,
  manifest: LocalCommandManifest,
  native: LocalCommandNativePosture,
): LocalCommandResult<LocalCommandSnapshot> {
  const raw = fields(value, ['observations', 'verification', 'version']);
  const verification =
    raw && fields(raw.verification, ['failures', 'finalization', 'invocations', 'observations', 'requests', 'version']);
  if (
    raw?.version !== 'jig.local-command-verifier.v1' ||
    !verification ||
    verification.version !== 'jig.verification-contract.v1' ||
    !Array.isArray(raw.observations) ||
    !Array.isArray(verification.requests) ||
    !Array.isArray(verification.observations) ||
    !Array.isArray(verification.failures) ||
    !Array.isArray(verification.invocations)
  )
    return fail('FC-TRUST', 'INVALID_LOCAL_COMMAND_SNAPSHOT');
  const requests = verification.requests.map((entry) => validateVerificationRequest(entry));
  if (requests.some((entry) => !entry.ok)) return fail('FC-TRUST', 'INVALID_LOCAL_COMMAND_SNAPSHOT');
  const parsedRequests = Object.freeze(
    requests.map((entry) => {
      if (!entry.ok) throw new Error('unreachable');
      return entry.value;
    }),
  );
  const observations = raw.observations.map((entry) => {
    const request = parsedRequests.find(
      (candidate: VerificationRequest) => plain(entry) && candidate.operation === entry.operation,
    );
    return request ? validateObservation(entry, request, manifest, native) : undefined;
  });
  const verificationObservations = verification.observations.map((entry) => {
    const request = parsedRequests.find(
      (candidate: VerificationRequest) => plain(entry) && candidate.operation === entry.operation,
    );
    return request ? validateObservation(entry, request, manifest, native) : undefined;
  });
  if (
    observations.some((entry) => !entry) ||
    verificationObservations.some((entry) => !entry) ||
    verificationObservations.length !== observations.length ||
    observations.some((entry, index) => !same(entry, verificationObservations[index])) ||
    observations.some(
      (entry, index) => observations.findIndex((candidate) => candidate?.operation === entry?.operation) !== index,
    )
  )
    return fail('FC-TRUST', 'INVALID_LOCAL_COMMAND_SNAPSHOT');
  const failures = verification.failures.map((entry) => {
    const item = fields(entry, [
      'code',
      'family',
      'fence',
      'kind',
      'operation',
      'reason',
      'retryOrdinal',
      'schema',
      'subject',
      'supersededBy',
      'version',
    ]);
    return item &&
      item.schema === 'jig.ev-check-failure.v1' &&
      item.version === 'jig.verification-contract.v1' &&
      item.kind === 'failure' &&
      item.family === 'FC-MECHANISM' &&
      (item.code === 'RESULT_UNCERTAIN' || item.code === 'MECHANISM_TIMEOUT') &&
      (item.reason === 'lost-response' || item.reason === 'timeout') &&
      Number.isSafeInteger(item.retryOrdinal) &&
      typeof item.operation === 'string' &&
      (item.supersededBy === null || typeof item.supersededBy === 'string')
      ? item
      : undefined;
  });
  const invocations = verification.invocations.map((entry) => {
    const item = fields(entry, ['checkClass', 'effect', 'operation', 'result', 'retryOrdinal']);
    return item &&
      typeof item.operation === 'string' &&
      typeof item.checkClass === 'string' &&
      Number.isSafeInteger(item.retryOrdinal) &&
      item.effect === 'observation' &&
      ['returned', 'lost-response', 'timeout'].includes(String(item.result))
      ? item
      : undefined;
  });
  if (failures.some((entry) => !entry) || invocations.some((entry) => !entry))
    return fail('FC-TRUST', 'INVALID_LOCAL_COMMAND_SNAPSHOT');
  const parsedFailures = failures as LocalCommandFailureRecord[];
  const parsedInvocations = invocations as LocalCommandInvocation[];
  const parsedObservations = Object.freeze(observations as LocalCommandObservation[]);
  if (!validRestoredFailureHistory(parsedRequests, parsedFailures, parsedInvocations, parsedObservations))
    return fail('FC-TRUST', 'INVALID_LOCAL_COMMAND_SNAPSHOT');
  let parsedFinalization: LocalCommandFinalizationSnapshot | null = null;
  if (verification.finalization !== null) {
    const final = fields(verification.finalization, [
      'acceptanceGranted',
      'deliveryOperations',
      'fence',
      'landingGranted',
      'noOp',
      'observations',
      'origin',
      'posture',
      'readyForDelivery',
      'requiredClasses',
      'state',
      'subject',
    ]);
    const anchor =
      final && plain(final.subject) && plain(final.fence)
        ? parsedRequests.find(
            (request: VerificationRequest) => same(final.subject, request.subject) && same(final.fence, request.fence),
          )
        : undefined;
    const expectedRequired = anchor?.policy.required.map((entry) => entry.name);
    const finalObservations =
      final && Array.isArray(final.observations)
        ? final.observations.map((entry) => {
            const request = parsedRequests.find(
              (candidate: VerificationRequest) => plain(entry) && candidate.operation === entry.operation,
            );
            return request ? validateObservation(entry, request, manifest, native) : undefined;
          })
        : undefined;
    const finalObservationValues = Array.isArray(finalObservations)
      ? finalObservations.filter((entry): entry is LocalCommandObservation => Boolean(entry))
      : [];
    const observedClasses = new Set(finalObservationValues.map((entry) => entry.checkClass));
    const hasFailure = finalObservationValues.some((entry) => entry.outcome === 'fail');
    const expectedState = hasFailure ? 'Reworking' : 'Finalizing';
    const expectedReady = !hasFailure && Boolean(expectedRequired?.every((entry) => observedClasses.has(entry)));
    if (
      !final ||
      !Array.isArray(final.observations) ||
      !Array.isArray(final.requiredClasses) ||
      !Array.isArray(final.deliveryOperations) ||
      final.deliveryOperations.length !== 0 ||
      final.acceptanceGranted !== false ||
      final.landingGranted !== false ||
      final.noOp !== false ||
      final.posture !== 'deterministic' ||
      !['Waiting', 'Accepted'].includes(String(final.origin)) ||
      !['Finalizing', 'Reworking'].includes(String(final.state)) ||
      final.state !== expectedState ||
      final.readyForDelivery !== expectedReady ||
      final.requiredClasses.some((entry) => typeof entry !== 'string') ||
      !anchor ||
      !expectedRequired ||
      final.requiredClasses.length !== expectedRequired.length ||
      final.requiredClasses.some((entry, index) => entry !== expectedRequired[index]) ||
      finalObservations === undefined ||
      finalObservations.some((entry) => !entry) ||
      finalObservationValues.length !== new Set(finalObservationValues.map((entry) => entry.operation)).size ||
      finalObservationValues.length !== observedClasses.size ||
      finalObservationValues.some(
        (entry) => !sameSubject(entry.subject, anchor.subject) || !sameFence(entry.fence, anchor.fence),
      ) ||
      finalObservationValues.some(
        (entry) =>
          !parsedObservations.some(
            (observation) => observation.operation === entry.operation && same(observation, entry),
          ),
      ) ||
      (final.origin !== anchor.lifecycle && anchor.lifecycle !== 'Finalizing')
    )
      return fail('FC-TRUST', 'INVALID_LOCAL_COMMAND_SNAPSHOT');
    parsedFinalization = Object.freeze({
      origin: final.origin as 'Waiting' | 'Accepted',
      state: expectedState,
      posture: 'deterministic',
      subject: anchor.subject,
      fence: anchor.fence,
      requiredClasses: Object.freeze([...expectedRequired]),
      observations: Object.freeze(finalObservationValues),
      noOp: false,
      readyForDelivery: expectedReady,
      deliveryOperations: Object.freeze([]) as readonly [],
      acceptanceGranted: false,
      landingGranted: false,
    });
  }
  return ok(
    Object.freeze({
      version: 'jig.local-command-verifier.v1' as const,
      verification: Object.freeze({
        version: 'jig.verification-contract.v1' as const,
        requests: parsedRequests,
        observations: parsedObservations,
        failures: Object.freeze(parsedFailures),
        invocations: Object.freeze(parsedInvocations),
        finalization: parsedFinalization,
      }),
      observations: parsedObservations,
    }),
  );
}

function createProvider(
  manifest: LocalCommandManifest,
  admissionCertificate: unknown,
  qualification: LocalCommandQualificationEvidence,
  initial?: LocalCommandSnapshot,
): LocalCommandProvider {
  const requests: VerificationRequest[] = [];
  const observations: LocalCommandObservation[] = [];
  const failures: LocalCommandFailureRecord[] = [];
  const invocations: LocalCommandInvocation[] = [];
  let finalization: {
    origin: 'Waiting' | 'Accepted';
    state: 'Finalizing' | 'Reworking';
    subject: VerificationSubject;
    fence: VerificationFence;
    requiredClasses: readonly string[];
    observed: readonly string[];
  } | null = null;
  if (initial) {
    requests.push(...initial.verification.requests);
    observations.push(...initial.observations);
    failures.push(...(initial.verification.failures as LocalCommandFailureRecord[]));
    invocations.push(...(initial.verification.invocations as LocalCommandInvocation[]));
    if (initial.verification.finalization) {
      const item = initial.verification.finalization;
      finalization = {
        origin: item.origin,
        state: item.state,
        subject: item.subject,
        fence: item.fence,
        requiredClasses: item.requiredClasses,
        observed: item.observations.map((entry) => entry.checkClass),
      };
    }
  }
  const native = qualification.nativePosture;
  const manifestId = manifest.manifestId;
  const dispatch = (input: unknown): LocalCommandResult<LocalCommandObservation> => {
    const raw =
      fields(input, ['checkoutResource', 'fault', 'permit', 'request']) ??
      fields(input, ['checkoutResource', 'permit', 'request']);
    const requestResult = raw && validateVerificationRequest(raw.request);
    if (!raw || !requestResult?.ok) return fail('FC-INPUT', 'INVALID_DISPATCH');
    const request = requestResult.value;
    if (request.policy.posture === 'none') return fail('FC-INPUT', 'VERIFICATION_NOT_DISPATCHABLE');
    if (currentBuildDigest() !== LOCAL_COMMAND_VERIFIER_BUILD_DIGEST || !nativePostureCurrent(native, manifest))
      return fail('FC-AUTHORITY', 'NATIVE_POSTURE_UNAVAILABLE');
    const currentAdmission = validateAdmission(admissionCertificate, manifest);
    if (!currentAdmission.ok) return currentAdmission;
    if (
      finalization?.state !== 'Finalizing' ||
      !sameSubject(finalization.subject, request.subject) ||
      !sameFence(finalization.fence, request.fence)
    )
      return fail('FC-AUTHORITY', 'INVALID_FINALIZATION_STATE');
    if (request.retryOrdinal > request.bounds.retryLimit) return fail('FC-BOUND', 'RETRY_EXHAUSTED');
    const predecessor = request.predecessor
      ? requests.find((entry) => entry.operation === request.predecessor)
      : undefined;
    if (
      (request.retryOrdinal === 1 && request.predecessor !== null) ||
      (request.retryOrdinal > 1 &&
        (!predecessor ||
          predecessor.retryOrdinal + 1 !== request.retryOrdinal ||
          !sameSubject(predecessor.subject, request.subject) ||
          !sameFence(predecessor.fence, request.fence) ||
          !failures.some((entry) => entry.operation === predecessor.operation && entry.supersededBy === null)))
    )
      return fail('FC-ORDERING', 'REPLACEMENT_LINEAGE_REQUIRED');
    const priorFailure = predecessor
      ? failures.find((entry) => entry.operation === predecessor.operation && entry.supersededBy === null)
      : undefined;
    const existing = requests.find((entry) => entry.operation === request.operation);
    if (existing && !same(existing, request)) return fail('FC-SUBJECT', 'OPERATION_SUBJECT_MISMATCH');
    if (existing && invocations.some((entry) => entry.operation === request.operation))
      return fail('FC-EFFECT', 'DUPLICATE_OPERATION');
    const permitResult = validateVerificationPermit(raw.permit, request);
    if (!permitResult.ok || !plain(raw.permit) || (raw.permit as Record<string, unknown>).capability === undefined)
      return fail('FC-AUTHORITY', 'INVALID_DISPATCH_PERMIT');
    const permitCapability = fields((raw.permit as Record<string, unknown>).capability, [
      'digest',
      'fence',
      'kind',
      'manifest',
      'operationClass',
      'port',
      'resourceScope',
      'subject',
    ]);
    if (!permitCapability || permitCapability.manifest !== manifestId)
      return fail('FC-AUTHORITY', 'INVALID_DISPATCH_PERMIT');
    const resourceClaims =
      typeof raw.checkoutResource === 'object' && raw.checkoutResource !== null
        ? checkoutResources.get(raw.checkoutResource)
        : undefined;
    if (!resourceClaims) return fail('FC-SUBJECT', 'CHECKOUT_RESOURCE_REQUIRED');
    if (
      resourceClaims.candidateCommit !== qualification.candidateCommit ||
      resourceClaims.candidateTree !== qualification.candidateTree ||
      resourceClaims.candidateContentDigest !== request.subject.candidateContentDigest ||
      resourceClaims.targetBasisDigest !== request.fence.targetBasisDigest ||
      resourceClaims.cleanReceiptDigest !== request.cleanReceipt.receiptDigest
    )
      return fail('FC-SUBJECT', 'CHECKOUT_RESOURCE_MISMATCH');
    const revalidated = authenticatedCheckout(
      resourceClaims.canonicalRoot,
      request,
      resourceClaims.targetBasisCommit,
      resourceClaims.targetBasisTree,
    );
    if (!revalidated.ok || !same(revalidated.value, resourceClaims)) return fail('FC-SUBJECT', 'CHECKOUT_DRIFT');
    const trackedRead = trackedCheckoutReadAuthority(resourceClaims.canonicalRoot);
    if (!trackedRead || trackedRead.digest !== qualification.trackedReadDigest)
      return fail('FC-SUBJECT', 'CHECKOUT_DRIFT');
    if (!existing) requests.push(request);
    const fault = raw.fault as 'lost-response' | 'timeout' | undefined;
    if (raw.fault !== undefined && raw.fault !== 'lost-response' && raw.fault !== 'timeout')
      return fail('FC-INPUT', 'INVALID_FAULT');
    const supersedePrior = (): void => {
      if (priorFailure)
        failures[failures.indexOf(priorFailure)] = Object.freeze({ ...priorFailure, supersededBy: request.operation });
    };
    if (fault) {
      supersedePrior();
      const record = Object.freeze({
        schema: 'jig.ev-check-failure.v1' as const,
        version: 'jig.verification-contract.v1' as const,
        kind: 'failure' as const,
        operation: request.operation,
        retryOrdinal: request.retryOrdinal,
        reason: fault,
        family: 'FC-MECHANISM' as const,
        code: fault === 'timeout' ? ('MECHANISM_TIMEOUT' as const) : ('RESULT_UNCERTAIN' as const),
        subject: request.subject,
        fence: request.fence,
        supersededBy: null,
      });
      failures.push(record);
      invocations.push(
        Object.freeze({
          operation: request.operation,
          checkClass: request.checkClass as string,
          retryOrdinal: request.retryOrdinal,
          result: fault,
          effect: 'observation' as const,
        }),
      );
      return fail('FC-MECHANISM', record.code);
    }
    const executable = manifest.value.subprocessAuthority[0];
    let superseded = false;
    try {
      if (fileDigest(executable.executable) !== executable.executableDigest)
        return fail('FC-AUTHORITY', 'STALE_EXECUTABLE_DIGEST');
      const root = realpathSync(mkdtempSync(join(tmpdir(), 'jig-gf047-')));
      const scratch = join(root, 'scratch');
      mkdirSync(scratch, { recursive: true });
      supersedePrior();
      superseded = true;
      let run: LocalCommandResult<CommandRun>;
      try {
        run = executeCommand(
          manifest,
          resourceClaims.canonicalRoot,
          scratch,
          native,
          request.bounds.waitMs,
          trackedRead.literals,
        );
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
      if (!run.ok) {
        if (run.error.code !== 'MECHANISM_TIMEOUT') return run;
        const record = Object.freeze({
          schema: 'jig.ev-check-failure.v1' as const,
          version: 'jig.verification-contract.v1' as const,
          kind: 'failure' as const,
          operation: request.operation,
          retryOrdinal: request.retryOrdinal,
          reason: 'timeout' as const,
          family: 'FC-MECHANISM' as const,
          code: 'MECHANISM_TIMEOUT' as const,
          subject: request.subject,
          fence: request.fence,
          supersededBy: null,
        });
        failures.push(record);
        invocations.push(
          Object.freeze({
            operation: request.operation,
            checkClass: request.checkClass as string,
            retryOrdinal: request.retryOrdinal,
            result: 'timeout' as const,
            effect: 'observation' as const,
          }),
        );
        return fail('FC-MECHANISM', record.code);
      }
      const observation = makeObservation(request, manifest, native, run.value, Date.now());
      const validated = validateObservation(observation, request, manifest, native);
      if (!validated) return fail('FC-EVIDENCE', 'INVALID_CHECK_OBSERVATION');
      if (observations.some((entry) => entry.checkClass === validated.checkClass))
        return fail('FC-ORDERING', 'CHECK_CLASS_ALREADY_OBSERVED');
      observations.push(validated);
      invocations.push(
        Object.freeze({
          operation: request.operation,
          checkClass: request.checkClass as string,
          retryOrdinal: request.retryOrdinal,
          result: 'returned' as const,
          effect: 'observation' as const,
        }),
      );
      return ok(validated);
    } catch {
      if (superseded && priorFailure)
        failures[failures.indexOf(priorFailure)] = Object.freeze({ ...priorFailure, supersededBy: null });
      return fail('FC-MECHANISM', 'COMMAND_EXECUTION_FAILED');
    }
  };
  const enterFinalizing = (
    input: unknown,
  ): LocalCommandResult<Readonly<{ origin: 'Waiting' | 'Accepted'; state: 'Finalizing' }>> => {
    const raw = fields(input, ['origin', 'request']);
    const requestResult = raw && validateVerificationRequest(raw.request);
    if (!raw || (raw.origin !== 'Waiting' && raw.origin !== 'Accepted') || !requestResult?.ok)
      return fail('FC-INPUT', 'INVALID_FINALIZATION_ENTRY');
    const request = requestResult.value;
    if (request.lifecycle !== raw.origin && request.lifecycle !== 'Finalizing')
      return fail('FC-AUTHORITY', 'INVALID_FINALIZATION_ENTRY');
    if (requests.every((entry) => entry.operation !== request.operation)) requests.push(request);
    finalization = {
      origin: raw.origin,
      state: 'Finalizing',
      subject: request.subject,
      fence: request.fence,
      requiredClasses: request.policy.required.map((entry) => entry.name),
      observed: [],
    };
    return ok(Object.freeze({ origin: raw.origin, state: 'Finalizing' as const }));
  };
  const consume = (
    input: unknown,
  ): LocalCommandResult<Readonly<{ state: 'Finalizing' | 'Reworking'; readyForDelivery: boolean }>> => {
    const raw = fields(input, ['observation']);
    const operationId =
      raw && plain(raw.observation) ? Object.getOwnPropertyDescriptor(raw.observation, 'operation')?.value : undefined;
    const observation = observations.find((entry) => entry.operation === operationId);
    if (
      !raw ||
      !finalization ||
      !observation ||
      !sameSubject(observation.subject, finalization.subject) ||
      !sameFence(observation.fence, finalization.fence)
    )
      return fail('FC-SUBJECT', 'OBSERVATION_SUBJECT_MISMATCH');
    if (finalization.observed.includes(observation.checkClass))
      return fail('FC-ORDERING', 'CHECK_CLASS_ALREADY_OBSERVED');
    const observed = Object.freeze([...finalization.observed, observation.checkClass]);
    const state = observation.outcome === 'fail' ? 'Reworking' : 'Finalizing';
    const ready = state === 'Finalizing' && finalization.requiredClasses.every((entry) => observed.includes(entry));
    finalization = Object.freeze({ ...finalization, state, observed });
    return ok(Object.freeze({ state, readyForDelivery: ready }));
  };
  const snapshot = (): LocalCommandSnapshot =>
    Object.freeze({
      version: 'jig.local-command-verifier.v1',
      verification: Object.freeze({
        version: 'jig.verification-contract.v1',
        requests: Object.freeze([...requests]),
        observations: Object.freeze([...observations]),
        failures: Object.freeze([...failures]),
        invocations: Object.freeze([...invocations]),
        finalization: finalization
          ? Object.freeze({
              origin: finalization.origin,
              state: finalization.state,
              posture: 'deterministic' as const,
              subject: finalization.subject,
              fence: finalization.fence,
              requiredClasses: finalization.requiredClasses,
              observations: Object.freeze(
                observations
                  .filter((entry) => finalization?.observed.includes(entry.checkClass))
                  .map((entry) => ({ ...entry })),
              ),
              noOp: false,
              readyForDelivery:
                finalization.state === 'Finalizing' &&
                finalization.requiredClasses.every((entry) => finalization?.observed.includes(entry)),
              deliveryOperations: Object.freeze([]) as readonly [],
              acceptanceGranted: false,
              landingGranted: false,
            })
          : null,
      }),
      observations: Object.freeze([...observations]),
    });
  return Object.freeze({
    dispatch,
    enterFinalizing,
    consume,
    snapshot,
    restoreSnapshot: snapshot,
    observations: () => Object.freeze([...observations]),
    failures: () => Object.freeze([...failures]),
    invocations: () => Object.freeze([...invocations]),
    reachability: () =>
      Object.freeze({
        status: 'qualified' as const,
        providerEnabled: true as const,
        configurationEnabled: true as const,
        dispatchEnabled: true as const,
        manifestId,
        environmentDigest: qualification.environmentDigest,
      }),
  });
}

export function createQualifiedLocalCommandProvider(
  input?: Readonly<{ manifest: LocalCommandManifest; admission: unknown; qualification: unknown }>,
): LocalCommandResult<LocalCommandProvider> {
  if (!input) return fail('FC-MECHANISM', 'PROVIDER_UNAVAILABLE_UNQUALIFIED');
  const manifest = parseManifest(input.manifest);
  if (!manifest.ok) return fail('FC-AUTHORITY', 'EXACT_QUALIFICATION_REQUIRED');
  const admission = validateAdmission(input.admission, manifest.value);
  if (!admission.ok) return fail('FC-AUTHORITY', 'EXACT_QUALIFICATION_REQUIRED');
  const qualification = exactQualification(input.qualification, manifest.value, admission.value);
  if (
    !qualification.ok ||
    qualification.value.nativePosture.network !== 'denied' ||
    qualification.value.nativePosture.checkout !== 'read-only' ||
    qualification.value.nativePosture.scratch !== 'discarded'
  )
    return fail('FC-AUTHORITY', 'EXACT_QUALIFICATION_REQUIRED');
  return ok(createProvider(manifest.value, input.admission, qualification.value));
}

export function restoreQualifiedLocalCommandProvider(
  input: Readonly<{ manifest: LocalCommandManifest; admission: unknown; qualification: unknown; snapshot: unknown }>,
): LocalCommandResult<LocalCommandProvider> {
  if (!input) return fail('FC-TRUST', 'INVALID_LOCAL_COMMAND_SNAPSHOT');
  const manifest = parseManifest(input.manifest);
  if (!manifest.ok) return fail('FC-AUTHORITY', 'EXACT_QUALIFICATION_REQUIRED');
  const admission = validateAdmission(input.admission, manifest.value);
  if (!admission.ok) return fail('FC-AUTHORITY', 'EXACT_QUALIFICATION_REQUIRED');
  const qualification = exactQualification(input.qualification, manifest.value, admission.value);
  if (!qualification.ok) return qualification;
  const snapshot = parseLocalSnapshot(input.snapshot, manifest.value, qualification.value.nativePosture);
  if (!snapshot.ok) return snapshot;
  return ok(createProvider(manifest.value, input.admission, qualification.value, snapshot.value));
}
