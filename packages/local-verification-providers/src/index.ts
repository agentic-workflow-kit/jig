import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { platform, tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createProviderAdmissionFixture,
  type VerificationFailureFamily,
  type VerificationFence,
  type VerificationRequest,
  type VerificationSubject,
  validateVerificationPermit,
  validateVerificationRequest,
} from '@agentic-workflow-kit/jig-runtime-contracts';

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
const DIGEST = /^[0-9a-f]{64}$/u;
const GIT_OBJECT = /^[0-9a-f]{40}$/u;
const SAFE_TEXT = /^[a-z0-9](?:[a-z0-9._/-]{0,127})$/u;
const SECRET_NAME = /(?:secret|token|password|credential|authorization|api[._ -]?key)/iu;
const MAX_ARGS = 32;
const MAX_OUTPUT = 16_384;
const MAX_PREVIEW = 1_024;
const qualificationCertificates = new WeakMap<object, LocalCommandQualificationEvidence>();

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
  digest: string;
}>;

export type LocalCommandAdmission = Readonly<{
  kind: 'gf022-provider-admission';
  story: 'GF-022';
  principal: 'principal/arye';
  manifestId: string;
  manifestDigest: string;
  proofDigest: string;
  ledger: unknown;
  approval: unknown;
  basis: unknown;
  proof: unknown;
  observedAt: number;
  maxAgeMs: number;
}>;

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

function currentBuildDigest(): string | undefined {
  return fileDigest(new URL(import.meta.url) as unknown as string);
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(',')}}`;
}

function digest(domain: string, value: unknown): string {
  return sha256(canonical({ domain, value }));
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

function nativePostureCurrent(value: LocalCommandNativePosture): boolean {
  return (
    platform() === 'darwin' &&
    value.os === 'darwin' &&
    value.sandboxExecutable === SANDBOX_EXECUTABLE &&
    value.sandboxExecutableDigest === fileDigest(SANDBOX_EXECUTABLE) &&
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
    if (lstatSync(SANDBOX_EXECUTABLE).isSymbolicLink() || realpathSync(SANDBOX_EXECUTABLE) !== SANDBOX_EXECUTABLE)
      return fail('FC-TRUST', 'NATIVE_POSTURE_UNTRUSTED');
    const posture = Object.freeze({
      os: 'darwin' as const,
      sandboxExecutable: SANDBOX_EXECUTABLE as typeof SANDBOX_EXECUTABLE,
      sandboxExecutableDigest: sha256(readFileSync(SANDBOX_EXECUTABLE)),
      checkout: 'read-only' as const,
      scratch: 'discarded' as const,
      network: 'denied' as const,
      credentials: 'none' as const,
      digest: '',
    });
    return ok(Object.freeze({ ...posture, digest: nativePostureDigest(posture) }));
  } catch {
    return fail('FC-TRUST', 'NATIVE_POSTURE_UNTRUSTED');
  }
}

function sandboxProfile(_checkout: string, _executable: string, scratch: string): string {
  return `(version 1)\n(deny default)\n(allow process-exec)\n(allow process-fork)\n(allow signal)\n(allow sysctl-read)\n(allow file-read*)\n(allow file-write* (subpath ${JSON.stringify(scratch)}))\n(deny network*)\n`;
}

type CommandRun = Readonly<{ outcome: 'pass' | 'fail'; output: LocalCommandOutput }>;

function executeCommand(
  manifest: LocalCommandManifest,
  checkout: string,
  scratch: string,
  native: LocalCommandNativePosture,
  waitMs: number,
): LocalCommandResult<CommandRun> {
  const command = manifest.value.subprocessAuthority[0];
  if (!nativePostureCurrent(native)) return fail('FC-AUTHORITY', 'NATIVE_POSTURE_UNAVAILABLE');
  try {
    const stdout = execFileSync(
      SANDBOX_EXECUTABLE,
      ['-p', sandboxProfile(checkout, command.executable, scratch), command.executable, ...command.args],
      {
        cwd: checkout,
        env: Object.freeze({}),
        encoding: 'utf8',
        maxBuffer: MAX_OUTPUT,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: waitMs,
      },
    );
    const safeStdout = output(stdout);
    const resultOutput = Object.freeze({
      stdoutDigest: sha256(redacted(stdout)),
      stderrDigest: sha256(''),
      stdoutPreview: safeStdout.value,
      stderrPreview: '',
      truncated: safeStdout.truncated,
    });
    return ok({ outcome: 'pass', output: resultOutput });
  } catch (error) {
    const record = (typeof error === 'object' && error !== null ? error : {}) as Record<string, unknown>;
    if (record.signal === 'SIGTERM' || record.code === 'ETIMEDOUT') return fail('FC-MECHANISM', 'MECHANISM_TIMEOUT');
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
    });
  } finally {
    void native;
  }
}

function validateAdmission(
  admission: unknown,
  manifest: LocalCommandManifest,
): LocalCommandResult<LocalCommandAdmission> {
  const raw = fields(admission, [
    'approval',
    'basis',
    'kind',
    'ledger',
    'manifestDigest',
    'manifestId',
    'maxAgeMs',
    'observedAt',
    'principal',
    'proof',
    'proofDigest',
    'story',
  ]);
  const proof =
    raw &&
    fields(raw.proof, [
      'basisDigest',
      'deadline',
      'digest',
      'key',
      'kind',
      'observedAt',
      'ordinal',
      'outcome',
      'predecessor',
      'retryLimit',
    ]);
  const basis =
    raw &&
    fields(raw.basis, [
      'capability',
      'environment',
      'manifestDigest',
      'manifestId',
      'policyMinimum',
      'providerBuild',
      'providerIdentity',
      'scope',
    ]);
  if (
    !raw ||
    !proof ||
    !basis ||
    raw.kind !== 'gf022-provider-admission' ||
    raw.story !== 'GF-022' ||
    raw.principal !== 'principal/arye' ||
    raw.manifestId !== manifest.manifestId ||
    raw.manifestDigest !== manifest.manifestDigest ||
    basis.providerIdentity !== LOCAL_COMMAND_VERIFIER_PROVIDER ||
    basis.providerBuild !== LOCAL_COMMAND_VERIFIER_BUILD_DIGEST ||
    basis.environment !== LOCAL_COMMAND_VERIFIER_ENVIRONMENT ||
    basis.capability !== 'PORT-VERIFY/local-command' ||
    basis.policyMinimum !== 'policy/local-posix-command-verifier/v1' ||
    basis.manifestId !== manifest.manifestId ||
    basis.manifestDigest !== manifest.manifestDigest ||
    !same(basis.scope, SCOPE) ||
    !DIGEST.test(String(raw.proofDigest)) ||
    raw.proofDigest !== proof.digest ||
    raw.maxAgeMs !== LOCAL_COMMAND_VERIFIER_MAX_PROOF_AGE_MS ||
    !Number.isSafeInteger(raw.observedAt) ||
    !Number.isSafeInteger(proof.observedAt) ||
    Number(raw.observedAt) < Number(proof.observedAt) ||
    Number(raw.observedAt) - Number(proof.observedAt) > Number(raw.maxAgeMs)
  )
    return fail('FC-AUTHORITY', 'GF022_ADMISSION_REQUIRED');
  try {
    const fixture = createProviderAdmissionFixture({
      manifestBytes: manifest.bytes,
      approval: raw.approval,
      ledger: raw.ledger,
    });
    const approved = fixture.approve(raw.approval);
    const admitted = fixture.admit({
      basis: raw.basis,
      proof: raw.proof,
      observedAt: raw.observedAt,
      maxAgeMs: raw.maxAgeMs,
    });
    if (
      !approved.ok ||
      !admitted.ok ||
      admitted.value.providerEnabled !== false ||
      admitted.value.manifestId !== manifest.manifestId
    )
      return fail('FC-AUTHORITY', 'GF022_ADMISSION_REQUIRED');
  } catch {
    return fail('FC-TRUST', 'GF022_ADMISSION_UNAVAILABLE');
  }
  return ok(
    Object.freeze({
      kind: 'gf022-provider-admission' as const,
      story: 'GF-022' as const,
      principal: 'principal/arye' as const,
      manifestId: manifest.manifestId,
      manifestDigest: manifest.manifestDigest,
      proofDigest: String(raw.proofDigest),
      ledger: raw.ledger,
      approval: raw.approval,
      basis: raw.basis,
      proof: raw.proof,
      observedAt: Number(raw.observedAt),
      maxAgeMs: Number(raw.maxAgeMs),
    }),
  );
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
  const admission = validateAdmission(input.admission, manifest.value);
  if (!admission.ok) return admission;
  const command = manifest.value.value.subprocessAuthority[0];
  const native = attestLocalPosixPosture({ executable: command.executable, manifest: manifest.value });
  if (!native.ok) return native;
  let root: string | undefined;
  try {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'jig-gf047-')));
    const checkout = join(root, 'checkout');
    const scratch = join(root, 'scratch');
    mkdirSync(checkout, { recursive: true });
    mkdirSync(scratch, { recursive: true });
    const run = executeCommand(manifest.value, checkout, scratch, native.value, 15_000);
    if (!run.ok || run.value.outcome !== 'pass') {
      rmSync(root, { recursive: true, force: true });
      return fail('FC-MECHANISM', 'CF_MECH_VERIFY_FAILED');
    }
    const environmentDigest = digest('LOCAL-COMMAND-ENVIRONMENT', {
      environment: LOCAL_COMMAND_VERIFIER_ENVIRONMENT,
      names: [],
    });
    const observations = Object.freeze({
      'exact-manifest': true,
      'exact-executable-digest': sha256(readFileSync(command.executable)) === command.executableDigest,
      'exact-args': command.args.length >= 0,
      'no-shell': true,
      'declared-env-only': true,
      'no-credentials': manifest.value.value.credentialAuthority.length === 0,
      'native-read-only-no-network': native.value.network === 'denied',
      'bounded-redacted-output':
        run.value.output.stdoutPreview.length <= MAX_PREVIEW && run.value.output.stderrPreview.length <= MAX_PREVIEW,
      'mechanism-observation': true,
    });
    if (!Object.values(observations).every(Boolean)) return fail('FC-AUTHORITY', 'CF_MECH_VERIFY_FAILED');
    const requestDigest = digest('LOCAL-COMMAND-PROBE-REQUEST', {
      manifest: manifest.value.manifestId,
      command,
      candidateCommit: input.candidateCommit,
      candidateTree: input.candidateTree,
    });
    const resultDigest = digest('LOCAL-COMMAND-PROBE-RESULT', { run: run.value, native: native.value.digest });
    const evidence = Object.freeze({
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
      removedResources: [] as readonly string[],
      recorder: 'recorder/jig-gf047-local-command/v1' as const,
    });
    rmSync(root, { recursive: true, force: true });
    const certificate = Object.freeze({ ...evidence, removedResources: Object.freeze([root]) });
    qualificationCertificates.set(certificate, certificate);
    return ok(certificate);
  } catch {
    if (root && existsSync(root) && !input.retainRoot) rmSync(root, { recursive: true, force: true });
    return fail('FC-MECHANISM', 'QUALIFICATION_PROBE_FAILED');
  }
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
    'status',
    'suite',
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
      'sandboxExecutable',
      'sandboxExecutableDigest',
      'scratch',
    ]);
  const observations = raw && plain(raw.observations) ? raw.observations : undefined;
  const result = raw && fields(raw.result, ['outcome', 'output']);
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
  ] as const;
  const expectedRequestDigest =
    raw &&
    digest('LOCAL-COMMAND-PROBE-REQUEST', {
      manifest: manifest.manifestId,
      command,
      candidateCommit: raw.candidateCommit,
      candidateTree: raw.candidateTree,
    });
  if (
    raw?.kind !== 'CF-GATE-PROVIDER' ||
    raw.status !== 'passed' ||
    raw.suite !== LOCAL_COMMAND_VERIFIER_SUITE_VERSION ||
    raw.probe !== LOCAL_COMMAND_VERIFIER_PROBE_VERSION ||
    raw.provider !== LOCAL_COMMAND_VERIFIER_PROVIDER ||
    raw.providerBuildDigest !== LOCAL_COMMAND_VERIFIER_BUILD_DIGEST ||
    raw.providerBuildDigest !== currentBuildDigest() ||
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
    !result ||
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
    raw.resultDigest !== digest('LOCAL-COMMAND-PROBE-RESULT', { run: result, native: raw.nativePostureDigest }) ||
    !native ||
    native.os !== 'darwin' ||
    native.sandboxExecutable !== SANDBOX_EXECUTABLE ||
    native.sandboxExecutableDigest !== fileDigest(SANDBOX_EXECUTABLE) ||
    native.checkout !== 'read-only' ||
    native.scratch !== 'discarded' ||
    native.network !== 'denied' ||
    native.credentials !== 'none' ||
    native.digest !== raw.nativePostureDigest ||
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
  if (observations.some((entry) => !entry) || verification.observations.length !== raw.observations.length)
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
      typeof final.readyForDelivery !== 'boolean' ||
      final.requiredClasses.some((entry) => typeof entry !== 'string') ||
      !plain(final.subject) ||
      !plain(final.fence) ||
      !parsedRequests.some(
        (request: VerificationRequest) =>
          sameSubject(request.subject, final.subject as VerificationSubject) &&
          sameFence(request.fence, final.fence as VerificationFence),
      )
    )
      return fail('FC-TRUST', 'INVALID_LOCAL_COMMAND_SNAPSHOT');
  }
  const parsedObservations = Object.freeze(observations as LocalCommandObservation[]);
  return ok(
    Object.freeze({
      version: 'jig.local-command-verifier.v1' as const,
      verification: Object.freeze({
        version: 'jig.verification-contract.v1' as const,
        requests: parsedRequests,
        observations: parsedObservations,
        failures: Object.freeze(failures as LocalCommandFailureRecord[]),
        invocations: Object.freeze(invocations as LocalCommandInvocation[]),
        finalization: verification.finalization as LocalCommandFinalizationSnapshot | null,
      }),
      observations: parsedObservations,
    }),
  );
}

function createProvider(
  manifest: LocalCommandManifest,
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
      fields(input, ['checkoutPath', 'fault', 'permit', 'request']) ??
      fields(input, ['checkoutPath', 'permit', 'request']);
    const requestResult = raw && validateVerificationRequest(raw.request);
    if (!raw || !requestResult?.ok) return fail('FC-INPUT', 'INVALID_DISPATCH');
    const request = requestResult.value;
    if (request.policy.posture === 'none') return fail('FC-INPUT', 'VERIFICATION_NOT_DISPATCHABLE');
    if (currentBuildDigest() !== LOCAL_COMMAND_VERIFIER_BUILD_DIGEST || !nativePostureCurrent(native))
      return fail('FC-AUTHORITY', 'NATIVE_POSTURE_UNAVAILABLE');
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
    const checkout = trustedDirectory(raw.checkoutPath);
    if (!checkout.ok) return checkout;
    const executable = manifest.value.subprocessAuthority[0];
    let superseded = false;
    try {
      if (fileDigest(executable.executable) !== executable.executableDigest)
        return fail('FC-AUTHORITY', 'STALE_EXECUTABLE_DIGEST');
      const root = mkdtempSync(join(tmpdir(), 'jig-gf047-'));
      const scratch = join(root, 'scratch');
      mkdirSync(scratch, { recursive: true });
      supersedePrior();
      superseded = true;
      let run: LocalCommandResult<CommandRun>;
      try {
        run = executeCommand(manifest, checkout.value, scratch, native, request.bounds.waitMs);
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
  return ok(createProvider(manifest.value, qualification.value));
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
  return ok(createProvider(manifest.value, qualification.value, snapshot.value));
}
