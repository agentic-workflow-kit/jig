import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, platform, tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { parseIdentity } from '@agentic-workflow-kit/jig-codec';
import type {
  WorkspaceBinding,
  WorkspaceCommitProof,
  WorkspaceOperationIntent,
  WorkspaceOperationType,
  WorkspaceSetupReceipt,
} from '@agentic-workflow-kit/jig-runtime-contracts';
import { createProviderAdmissionFixture, isScriptedLedger } from '@agentic-workflow-kit/jig-runtime-contracts';

export const LOCAL_GIT_WORKTREE_PROVIDER = 'local-git-worktree-provider/v1';
export const LOCAL_GIT_WORKTREE_SUITE_VERSION = 'gf039.cf-mech-workspace.v1';
export const LOCAL_GIT_WORKTREE_PROBE_VERSION = 'gf039.local-git-worktree-probe.v1';
export const LOCAL_GIT_WORKTREE_POSTURE = 'local-posix-git-worktree-no-network-no-credentials/v1';
export const LOCAL_GIT_WORKTREE_SCOPE = 'resource/local-mktemp-root/v1';
export const LOCAL_GIT_WORKTREE_MAX_PROOF_AGE_MS = 86_400_000;

const GF022_APPROVED_MANIFEST_DIGEST = '53568c156d6ee898dc1ba32897d22f8abf47afa4bad86d35ffc6bcd7ce9067df';
const GF022_APPROVED_PROVIDER_DIGEST = 'c18ba0c266f04abcf220a39edd23c54599894dbf36d8d024db4b93aacb70308b';
const GF022_APPROVED_MANIFEST_ID = `provider/${GF022_APPROVED_PROVIDER_DIGEST}/authority/${GF022_APPROVED_MANIFEST_DIGEST}`;
const GF022_APPROVED_MANIFEST = new TextEncoder().encode(
  '{"credentialAuthority":[],"externalServiceAuthority":[],"filesystemAuthority":[],"lineage":{"kind":"genesis"},"manifestVersion":"provider-authority/v1","nativePermissionPostures":[],"networkAuthority":[],"providerIdentity":"scripted-capability-proof-fixture/v1","runtimeAuthority":{"kind":"in-process-pure-fixture"},"scope":{"phase":2,"purpose":"semantic-admission-fixture","story":"GF-022"},"subprocessAuthority":[]}\n',
);

const MANIFEST_TEXT =
  '{"credentialAuthority":[],"externalServiceAuthority":[],"filesystemAuthority":[{"access":["read","create","remove-worktree"],"discovery":"binding-only","locator":{"kind":"explicit-disposable-root","scope":"resource/local-mktemp-root/v1"},"regularFileOnly":false,"symlinkPolicy":"reject","traversalPolicy":"reject"}],"lineage":{"kind":"genesis"},"manifestVersion":"provider-authority/v1","nativePermissionPostures":["local-posix-git-worktree-no-network-no-credentials/v1"],"networkAuthority":[],"providerIdentity":"local-git-worktree-provider/v1","runtimeAuthority":{"environment":"local-posix-git/v1","kind":"fixed-git-worktree-provider","package":"packages/local-workspace-providers"},"scope":{"phase":3,"purpose":"qualified-local-git-worktree","story":"GF-039"},"subprocessAuthority":[{"executable":"git","argumentPolicy":"fixed-subcommands-only","shell":false}],"vcs":"git"}\n';

export const LOCAL_GIT_WORKTREE_MANIFEST = new TextEncoder().encode(MANIFEST_TEXT);
export const LOCAL_GIT_WORKTREE_MANIFEST_DIGEST = sha256(LOCAL_GIT_WORKTREE_MANIFEST);
export const LOCAL_GIT_WORKTREE_MANIFEST_ID = `provider/${sha256(LOCAL_GIT_WORKTREE_PROVIDER)}/authority/${LOCAL_GIT_WORKTREE_MANIFEST_DIGEST}`;
export const LOCAL_GIT_WORKTREE_BUILD_DIGEST = sha256(
  'local-git-worktree-provider/v1|implementation-contract=gf039|git-only|no-shell|no-network|no-credentials',
);

type Result<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: Failure }>;
type FailureFamily =
  | 'FC-INPUT'
  | 'FC-SUBJECT'
  | 'FC-FENCE'
  | 'FC-AUTHORITY'
  | 'FC-MECHANISM'
  | 'FC-EFFECT'
  | 'FC-TRUST';
export type Failure = Readonly<{ family: FailureFamily; code: string }>;
export type LocalGitWorktreeFault = 'none' | 'lost-response' | 'uncertain' | 'crash';
export type LocalGitWorktreeOutcome = 'confirmed-effect' | 'confirmed-absence' | 'indeterminate';

export type LocalGitWorktreeEnvironment = Readonly<{
  os: 'darwin' | 'linux';
  gitVersion: string;
  resourceRoot: string;
  posture: typeof LOCAL_GIT_WORKTREE_POSTURE;
  scope: typeof LOCAL_GIT_WORKTREE_SCOPE;
}>;

export type LocalGitWorktreeAdmission = Readonly<{
  kind: 'gf022-provider-admission';
  story: 'GF-022';
  principal: 'principal/arye';
  manifestId: typeof LOCAL_GIT_WORKTREE_MANIFEST_ID;
  manifestDigest: typeof LOCAL_GIT_WORKTREE_MANIFEST_DIGEST;
  proofDigest: string;
}>;

export type LocalGitWorktreeAttestation = Readonly<{
  version: 'jig.workspace-contract.v1';
  provider: 'local-git-worktree';
  operation: string;
  operationType: WorkspaceOperationType;
  binding: WorkspaceBinding;
  hostFingerprint: string;
  workspaceFingerprint: string;
  contentDigest: string;
  cleanliness: 'clean' | 'dirty' | 'ambiguous';
  setupReceipt: WorkspaceSetupReceipt | null;
  preserved: boolean;
  proof: WorkspaceCommitProof;
  successClaim: 'observed';
}>;

export type LocalGitWorktreeProbeEvidence = Readonly<{
  kind: 'CF-GATE-PROVIDER';
  status: 'passed';
  suite: typeof LOCAL_GIT_WORKTREE_SUITE_VERSION;
  probe: typeof LOCAL_GIT_WORKTREE_PROBE_VERSION;
  provider: typeof LOCAL_GIT_WORKTREE_PROVIDER;
  providerBuildDigest: typeof LOCAL_GIT_WORKTREE_BUILD_DIGEST;
  manifestId: typeof LOCAL_GIT_WORKTREE_MANIFEST_ID;
  manifestDigest: typeof LOCAL_GIT_WORKTREE_MANIFEST_DIGEST;
  environment: LocalGitWorktreeEnvironment;
  environmentDigest: string;
  resourceDigest: string;
  candidateCommit: string;
  candidateTree: string;
  fixtureDigest: string;
  admissionProofDigest: string;
  admissionObservedAt: number;
  admissionAgeMs: number;
  requestDigest: string;
  resultDigest: string;
  operationDigest: string;
  probeDigest: string;
  runner: Readonly<{
    runtime: 'node-esm';
    os: 'darwin' | 'linux';
    gitVersion: string;
  }>;
  recordedAt: number;
  recorder: 'recorder/jig-gf039-real-local/v1';
}>;

export type LocalGitWorktreeProbeResult = Readonly<{
  evidence: LocalGitWorktreeProbeEvidence;
  observations: Readonly<Record<string, boolean>>;
  resourceRoot: string;
  removedResources: readonly string[];
}>;

export type LocalGitWorktreeProvider = Readonly<{
  dispatch(
    input: Readonly<{ intent: WorkspaceOperationIntent; fault?: LocalGitWorktreeFault }>,
  ): Result<LocalGitWorktreeAttestation>;
  setup(
    input: Readonly<{
      intent: WorkspaceOperationIntent;
      receipt: WorkspaceSetupReceipt | null;
      fault?: LocalGitWorktreeFault;
    }>,
  ): Result<Readonly<{ status: 'no-op' } | LocalGitWorktreeAttestation>>;
  reconcile(
    input: Readonly<{ operation: string; binding: WorkspaceBinding }>,
  ): Result<Readonly<{ operation: string; outcome: LocalGitWorktreeOutcome; observationDigest: string }>>;
  reachability(): Readonly<{
    providerEnabled: true;
    dispatchEnabled: true;
    status: 'qualified';
    manifestId: string;
    environmentDigest: string;
  }>;
  invocations(): readonly Readonly<{ operation: string; operationType: WorkspaceOperationType; result: string }>[];
}>;

const ok = <T>(value: T): Result<T> => Object.freeze({ ok: true, value });
const fail = (family: FailureFamily, code: string): Result<never> =>
  Object.freeze({ ok: false, error: Object.freeze({ family, code }) });
const DIGEST = /^[0-9a-f]{64}$/u;
const GIT_OBJECT = /^[0-9a-f]{40}$/u;
const SECRET = /(?:secret|token|password|credential|authorization|api[._ -]?key)/iu;
const SECRET_VALUE = /(?:secret|token|password|credential|authorization|api[._ -]?key)\s*[=:]/iu;
const RECORDED_EVIDENCE = new WeakSet<object>();

function identity(kind: string, value: unknown): value is string {
  return typeof value === 'string' && parseIdentity(kind, value).ok;
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(',')}}`;
}

function digest(domain: string, value: unknown): string {
  return sha256(canonical({ domain, value }));
}

function exactObject(value: unknown, keys: readonly string[]): Record<string, unknown> | undefined {
  try {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const actual = Object.keys(descriptors).sort();
    if (actual.join('\0') !== [...keys].sort().join('\0') || !keys.every((key) => 'value' in descriptors[key]))
      return undefined;
    return Object.fromEntries(keys.map((key) => [key, descriptors[key]?.value]));
  } catch {
    return undefined;
  }
}

function safeText(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 1024 &&
    value.normalize('NFC') === value &&
    !SECRET.test(value)
  );
}

function isWithin(root: string, value: string): boolean {
  const rootPath = resolve(root);
  const valuePath = resolve(value);
  const child = relative(rootPath, valuePath);
  return (
    child !== '' && child !== '..' && !child.startsWith('../') && !child.startsWith('/') && !child.includes('/../')
  );
}

function trustedRoot(root: string): Result<string> {
  try {
    if (
      !root.startsWith('/') ||
      !existsSync(root) ||
      realpathSync(root) !== root ||
      lstatSync(root).isSymbolicLink() ||
      !lstatSync(root).isDirectory()
    )
      return fail('FC-TRUST', 'RESOURCE_ROOT_UNTRUSTED');
    if (root === '/' || root === homedir()) return fail('FC-TRUST', 'RESOURCE_ROOT_FORBIDDEN');
    return ok(root);
  } catch {
    return fail('FC-MECHANISM', 'RESOURCE_ROOT_UNAVAILABLE');
  }
}

function disposableRoot(root: string): boolean {
  try {
    const temporary = realpathSync(resolve(tmpdir()));
    const child = relative(temporary, root);
    return child.startsWith('jig-gf039-') && !child.includes('/') && !child.startsWith('..');
  } catch {
    return false;
  }
}

function scopedPath(root: string, value: string, allowAbsent = false): Result<string> {
  const trusted = trustedRoot(root);
  if (!trusted.ok || !isWithin(root, value)) return fail('FC-SUBJECT', 'PATH_OUT_OF_SCOPE');
  try {
    const parent = dirname(value);
    if (!existsSync(parent) || realpathSync(parent) !== parent || lstatSync(parent).isSymbolicLink())
      return fail('FC-TRUST', 'PATH_PARENT_UNTRUSTED');
    if (!allowAbsent && (!existsSync(value) || realpathSync(value) !== value || lstatSync(value).isSymbolicLink()))
      return fail('FC-TRUST', 'PATH_UNTRUSTED');
    return ok(value);
  } catch {
    return fail('FC-TRUST', 'PATH_UNTRUSTED');
  }
}

function git(cwd: string, args: readonly string[]): Result<string> {
  try {
    return ok(execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim());
  } catch {
    return fail('FC-MECHANISM', 'GIT_COMMAND_FAILED');
  }
}

function gitVersion(): Result<string> {
  const result = git('/', ['--version']);
  return result.ok && /^git version \d+\.\d+(?:\.\d+)?(?:\s.*)?$/u.test(result.value)
    ? result
    : fail('FC-MECHANISM', 'GIT_VERSION_UNAVAILABLE');
}

function repoHead(repository: string): Result<string> {
  return git(repository, ['rev-parse', '--verify', 'HEAD']);
}

function repoBasis(repository: string): Result<string> {
  const head = repoHead(repository);
  return head.ok ? ok(digest('WORKSPACE-BASIS', { repository, head: head.value })) : head;
}

function cleanState(path: string): Result<'clean' | 'dirty' | 'ambiguous'> {
  const status = git(path, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (!status.ok) return status;
  return ok(status.value === '' ? 'clean' : 'dirty');
}

function validBinding(binding: unknown): binding is WorkspaceBinding {
  const raw = exactObject(binding, [
    'operation',
    'operationType',
    'subject',
    'repository',
    'path',
    'basis',
    'recipeDigest',
    'inputFingerprintDigest',
    'host',
    'manifest',
  ]);
  const subject = raw && exactObject(raw.subject, ['run', 'story', 'basis']);
  return Boolean(
    raw &&
      subject &&
      identity('ID-OP', raw.operation) &&
      ['OPC-WS-PROVISION', 'OPC-WS-SETUP', 'OPC-WS-OBSERVE', 'OPC-WS-PRESERVE', 'OPC-WS-RETIRE'].includes(
        String(raw.operationType),
      ) &&
      safeText(raw.repository) &&
      safeText(raw.path) &&
      DIGEST.test(String(raw.basis)) &&
      DIGEST.test(String(raw.recipeDigest)) &&
      DIGEST.test(String(raw.inputFingerprintDigest)) &&
      safeText(raw.host) &&
      identity('ID-MANIFEST', raw.manifest) &&
      identity('ID-RUN', subject.run) &&
      identity('ID-STORY', subject.story) &&
      DIGEST.test(String(subject.basis)) &&
      subject.basis === raw.basis &&
      String(subject.story).startsWith(`${subject.run}/story/`) &&
      String(raw.operation).startsWith(`${subject.run}/txn/`) &&
      String(raw.manifest) === LOCAL_GIT_WORKTREE_MANIFEST_ID &&
      !SECRET.test(String(raw.repository)) &&
      !SECRET.test(String(raw.path)) &&
      !SECRET.test(String(raw.host)),
  );
}

function validProof(proof: unknown, operation: string, run?: string): proof is WorkspaceCommitProof {
  const raw = exactObject(proof, [
    'kind',
    'position',
    'event',
    'transaction',
    'operation',
    'recordDigest',
    'witnessDigest',
  ]);
  return Boolean(
    raw &&
      raw.kind === 'committed-witnessed' &&
      Number.isSafeInteger(raw.position) &&
      Number(raw.position) >= 0 &&
      identity('ID-EVENT', raw.event) &&
      identity('ID-TXN', raw.transaction) &&
      identity('ID-OP', operation) &&
      raw.operation === operation &&
      raw.recordDigest === raw.witnessDigest &&
      DIGEST.test(String(raw.recordDigest)) &&
      String(operation).startsWith(`${raw.transaction}/op/`) &&
      String(raw.transaction).includes('/gen/') &&
      (run === undefined ||
        (() => {
          const prefix = `${run}/txn/`;
          if (!String(raw.transaction).startsWith(prefix)) return false;
          const ordinalStart = prefix.length;
          const ordinalEnd = String(raw.transaction).indexOf('/', ordinalStart);
          const ordinalText = String(raw.transaction).slice(ordinalStart, ordinalEnd);
          const ordinal = Number(ordinalText);
          return (
            ordinalEnd > ordinalStart &&
            /^\d+$/u.test(ordinalText) &&
            Number.isSafeInteger(ordinal) &&
            Number(raw.position) === ordinal - 1 &&
            raw.event === `${run}/event/${ordinal}` &&
            raw.transaction === String(operation).slice(0, String(operation).lastIndexOf('/op/'))
          );
        })()),
  );
}

function validIntent(intent: unknown): intent is WorkspaceOperationIntent {
  const raw = exactObject(intent, [
    'version',
    'operation',
    'operationType',
    'effect',
    'port',
    'capability',
    'binding',
    'proof',
  ]);
  return Boolean(
    raw &&
      raw.version === 'jig.workspace-contract.v1' &&
      raw.port === 'PORT-WORKSPACE' &&
      raw.capability === 'CB-WORKSPACE' &&
      raw.operation === (raw.binding as WorkspaceBinding | undefined)?.operation &&
      validBinding(raw.binding) &&
      raw.operationType === raw.binding.operationType &&
      raw.effect === (raw.operationType === 'OPC-WS-OBSERVE' ? 'observation' : 'effectful') &&
      validProof(raw.proof, String(raw.operation), (raw.binding as WorkspaceBinding).subject.run),
  );
}

function environmentDigest(environment: LocalGitWorktreeEnvironment): string {
  return digest('WORKSPACE-ENVIRONMENT', environment);
}

function bindingDigest(binding: WorkspaceBinding): string {
  return digest('WORKSPACE-BINDING', binding);
}

function resourceBindingDigest(binding: WorkspaceBinding): string {
  return digest('WORKSPACE-RESOURCE-BINDING', {
    repository: binding.repository,
    path: binding.path,
    basis: binding.basis,
    host: binding.host,
    manifest: binding.manifest,
  });
}

function workspaceFingerprint(binding: WorkspaceBinding, head: string): string {
  return digest('WORKSPACE-PATH', { repository: binding.repository, path: binding.path, basis: binding.basis, head });
}

function proofFor(binding: WorkspaceBinding): WorkspaceCommitProof {
  const transaction = binding.operation.slice(0, binding.operation.lastIndexOf('/op/'));
  const ordinalText = transaction.slice(
    transaction.lastIndexOf('/txn/') + 5,
    transaction.indexOf('/', transaction.lastIndexOf('/txn/') + 5),
  );
  const ordinal = Number(ordinalText);
  return Object.freeze({
    kind: 'committed-witnessed',
    position: ordinal - 1,
    event: `${binding.subject.run}/event/${ordinal}`,
    transaction,
    operation: binding.operation,
    recordDigest: digest('WORKSPACE-INTENT', binding),
    witnessDigest: digest('WORKSPACE-INTENT', binding),
  });
}

function isFreshSetupReceipt(
  receipt: unknown,
  binding: WorkspaceBinding,
  environment: LocalGitWorktreeEnvironment,
): boolean {
  const raw = exactObject(receipt, [
    'version',
    'operation',
    'binding',
    'hostFingerprint',
    'workspaceFingerprint',
    'recipeDigest',
    'inputFingerprintDigest',
    'freshnessFingerprint',
    'effectDigest',
    'completed',
    'proof',
  ]);
  if (
    !raw ||
    binding.operationType !== 'OPC-WS-SETUP' ||
    raw.version !== 'jig.workspace-contract.v1' ||
    raw.operation !== binding.operation ||
    raw.completed !== true ||
    !validBinding(raw.binding) ||
    bindingDigest(raw.binding) !== bindingDigest(binding) ||
    raw.recipeDigest !== binding.recipeDigest ||
    raw.inputFingerprintDigest !== binding.inputFingerprintDigest ||
    !validProof(raw.proof, binding.operation, binding.subject.run)
  )
    return false;
  const target = scopedPath(environment.resourceRoot, binding.path);
  if (!target.ok) return false;
  const head = repoHead(target.value);
  const cleanliness = cleanState(target.value);
  const basis = repoBasis(binding.repository);
  if (!head.ok || !cleanliness.ok || !basis.ok || basis.value !== binding.basis || cleanliness.value !== 'clean')
    return false;
  const host = digest('WORKSPACE-HOST', { host: binding.host, manifest: binding.manifest, environment });
  return (
    raw.hostFingerprint === host &&
    raw.workspaceFingerprint === workspaceFingerprint(binding, head.value) &&
    raw.freshnessFingerprint ===
      digest('WORKSPACE-SETUP-FRESHNESS', {
        recipeDigest: binding.recipeDigest,
        inputFingerprintDigest: binding.inputFingerprintDigest,
        host,
      }) &&
    raw.effectDigest === digest('WORKSPACE-SETUP-EFFECT', { binding, head: head.value })
  );
}

function createMechanism(environment: LocalGitWorktreeEnvironment): LocalGitWorktreeProvider {
  const invocations: Array<Readonly<{ operation: string; operationType: WorkspaceOperationType; result: string }>> = [];
  const dispatched = new Map<string, WorkspaceBinding>();
  const outcomes = new Map<string, LocalGitWorktreeOutcome>();
  const preserved = new Set<string>();

  const dispatch = (
    input: Readonly<{ intent: WorkspaceOperationIntent; fault?: LocalGitWorktreeFault }>,
  ): Result<LocalGitWorktreeAttestation> => {
    const raw = exactObject(input, ['intent', 'fault']) ?? exactObject(input, ['intent']);
    const intent = raw?.intent;
    if (!raw || !validIntent(intent)) return fail('FC-AUTHORITY', 'INVALID_WORKSPACE_INTENT');
    const binding = intent.binding;
    const fault = raw.fault === undefined ? 'none' : raw.fault;
    if (!['none', 'lost-response', 'uncertain', 'crash'].includes(String(fault)))
      return fail('FC-INPUT', 'INVALID_FAULT');
    if (dispatched.has(binding.operation)) return fail('FC-EFFECT', 'DUPLICATE_WORKSPACE_OPERATION');
    const repository = scopedPath(environment.resourceRoot, binding.repository);
    const target = scopedPath(environment.resourceRoot, binding.path, binding.operationType === 'OPC-WS-PROVISION');
    if (
      !repository.ok ||
      !target.ok ||
      repository.value === target.value ||
      !existsSync(join(repository.value, '.git'))
    )
      return fail('FC-SUBJECT', 'REPOSITORY_OR_PATH_INVALID');
    const basis = repoBasis(repository.value);
    if (!basis.ok || basis.value !== binding.basis) return fail('FC-FENCE', 'BASIS_MISMATCH');
    dispatched.set(binding.operation, binding);
    invocations.push(
      Object.freeze({ operation: binding.operation, operationType: binding.operationType, result: 'started' }),
    );
    if (binding.operationType === 'OPC-WS-RETIRE' && fault !== 'none') {
      outcomes.set(binding.operation, 'confirmed-absence');
      invocations[invocations.length - 1] = Object.freeze({
        operation: binding.operation,
        operationType: binding.operationType,
        result: 'preserved-on-uncertainty',
      });
      return fail('FC-EFFECT', 'UNCERTAIN_RETIRE_PRESERVED');
    }
    if (fault === 'crash' && binding.operationType === 'OPC-WS-PROVISION') {
      outcomes.set(binding.operation, 'confirmed-absence');
      return fail('FC-MECHANISM', 'WORKSPACE_PROCESS_CRASHED');
    }
    const effect = performEffect(binding, repository.value, target.value, basis.value, preserved, environment);
    if (!effect.ok) {
      outcomes.set(
        binding.operation,
        effect.error.code === 'RETIRE_COMPLETED' ? 'confirmed-effect' : 'confirmed-absence',
      );
      return effect;
    }
    if (fault !== 'none') {
      outcomes.set(binding.operation, 'confirmed-effect');
      invocations[invocations.length - 1] = Object.freeze({
        operation: binding.operation,
        operationType: binding.operationType,
        result: fault === 'crash' ? 'crashed-after-effect' : 'lost-response',
      });
      return fail(
        fault === 'crash' ? 'FC-MECHANISM' : 'FC-EFFECT',
        fault === 'crash' ? 'WORKSPACE_PROCESS_CRASHED' : 'UNCERTAIN_WORKSPACE_EFFECT',
      );
    }
    outcomes.set(binding.operation, 'confirmed-effect');
    return ok(effect.value);
  };

  const setup = (
    input: Readonly<{
      intent: WorkspaceOperationIntent;
      receipt: WorkspaceSetupReceipt | null;
      fault?: LocalGitWorktreeFault;
    }>,
  ): Result<Readonly<{ status: 'no-op' } | LocalGitWorktreeAttestation>> => {
    if (!validIntent(input?.intent) || input.intent.operationType !== 'OPC-WS-SETUP')
      return fail('FC-SUBJECT', 'SETUP_OPERATION_REQUIRED');
    const receipt = input.receipt;
    if (receipt && isFreshSetupReceipt(receipt, input.intent.binding, environment))
      return ok(Object.freeze({ status: 'no-op' as const }));
    const result = dispatch({ intent: input.intent, fault: input.fault });
    return result;
  };

  const reconcile = (
    input: Readonly<{ operation: string; binding: WorkspaceBinding }>,
  ): Result<Readonly<{ operation: string; outcome: LocalGitWorktreeOutcome; observationDigest: string }>> => {
    const raw = exactObject(input, ['operation', 'binding']);
    if (
      !raw ||
      raw.operation !== (raw.binding as WorkspaceBinding | undefined)?.operation ||
      !validBinding(raw.binding) ||
      !dispatched.has(String(raw.operation))
    )
      return fail('FC-EFFECT', 'RECONCILIATION_BINDING_REQUIRED');
    const stored = dispatched.get(String(raw.operation));
    if (!stored || bindingDigest(stored) !== bindingDigest(raw.binding as WorkspaceBinding))
      return fail('FC-FENCE', 'RECONCILIATION_BINDING_MISMATCH');
    const outcome = outcomes.get(String(raw.operation));
    if (!outcome) return fail('FC-TRUST', 'RECONCILIATION_UNAVAILABLE');
    return ok(
      Object.freeze({
        operation: String(raw.operation),
        outcome,
        observationDigest: digest('WORKSPACE-LOOKUP', { operation: raw.operation, binding: raw.binding, outcome }),
      }),
    );
  };

  return Object.freeze({
    dispatch,
    setup,
    reconcile,
    reachability: () =>
      Object.freeze({
        providerEnabled: true as const,
        dispatchEnabled: true as const,
        status: 'qualified' as const,
        manifestId: LOCAL_GIT_WORKTREE_MANIFEST_ID,
        environmentDigest: environmentDigest(environment),
      }),
    invocations: () => Object.freeze([...invocations]),
  });
}

function performEffect(
  binding: WorkspaceBinding,
  repository: string,
  target: string,
  basis: string,
  preserved: Set<string>,
  environment: LocalGitWorktreeEnvironment,
): Result<LocalGitWorktreeAttestation> {
  if (binding.operationType === 'OPC-WS-PROVISION') {
    if (existsSync(target)) return fail('FC-EFFECT', 'WORKSPACE_ALREADY_EXISTS');
    const added = git(repository, ['worktree', 'add', '--detach', target, 'HEAD']);
    if (!added.ok) return added;
  } else if (!existsSync(target) || realpathSync(target) !== target) return fail('FC-MECHANISM', 'WORKSPACE_ABSENT');
  if (binding.operationType === 'OPC-WS-RETIRE') {
    if (!preserved.has(resourceBindingDigest(binding))) return fail('FC-AUTHORITY', 'PRESERVATION_REQUIRED');
    return fail('FC-AUTHORITY', 'REAL_RETIRE_DISABLED');
  }
  const head = repoHead(target);
  const cleanliness = cleanState(target);
  if (!head.ok || !cleanliness.ok) return fail('FC-MECHANISM', 'WORKSPACE_FACT_UNAVAILABLE');
  if (digest('WORKSPACE-BASIS', { repository, head: head.value }) !== basis)
    return fail('FC-FENCE', 'WORKSPACE_BASIS_MISMATCH');
  const host = digest('WORKSPACE-HOST', {
    host: binding.host,
    manifest: binding.manifest,
    environment,
  });
  const receipt =
    binding.operationType === 'OPC-WS-SETUP'
      ? Object.freeze({
          version: 'jig.workspace-contract.v1' as const,
          operation: binding.operation,
          binding,
          hostFingerprint: host,
          workspaceFingerprint: workspaceFingerprint(binding, head.value),
          recipeDigest: binding.recipeDigest,
          inputFingerprintDigest: binding.inputFingerprintDigest,
          freshnessFingerprint: digest('WORKSPACE-SETUP-FRESHNESS', {
            recipeDigest: binding.recipeDigest,
            inputFingerprintDigest: binding.inputFingerprintDigest,
            host,
          }),
          effectDigest: digest('WORKSPACE-SETUP-EFFECT', { binding, head: head.value }),
          completed: true as const,
          proof: bindingProof(binding),
        })
      : null;
  const isPreserved = binding.operationType === 'OPC-WS-PRESERVE';
  if (isPreserved) preserved.add(resourceBindingDigest(binding));
  return ok(
    Object.freeze({
      version: 'jig.workspace-contract.v1' as const,
      provider: 'local-git-worktree' as const,
      operation: binding.operation,
      operationType: binding.operationType,
      binding,
      hostFingerprint: host,
      workspaceFingerprint: workspaceFingerprint(binding, head.value),
      contentDigest: digest('WORKSPACE-CONTENT', { head: head.value, cleanliness: cleanliness.value }),
      cleanliness: cleanliness.value,
      setupReceipt: receipt,
      preserved: isPreserved,
      proof: bindingProof(binding),
      successClaim: 'observed' as const,
    }),
  );
}

function bindingProof(binding: WorkspaceBinding): WorkspaceCommitProof {
  return proofFor(binding);
}

function currentCandidateIdentity(): Result<Readonly<{ commit: string; tree: string }>> {
  const commit = git('.', ['rev-parse', '--verify', 'HEAD']);
  const tree = git('.', ['rev-parse', '--verify', 'HEAD^{tree}']);
  if (!commit.ok || !tree.ok || !GIT_OBJECT.test(commit.value) || !GIT_OBJECT.test(tree.value))
    return fail('FC-TRUST', 'CANDIDATE_IDENTITY_UNAVAILABLE');
  return ok(Object.freeze({ commit: commit.value, tree: tree.value }));
}

function validateEnvironment(environment: unknown): Result<LocalGitWorktreeEnvironment> {
  const raw = exactObject(environment, ['os', 'gitVersion', 'resourceRoot', 'posture', 'scope']);
  if (
    !raw ||
    (raw.os !== 'darwin' && raw.os !== 'linux') ||
    !safeText(raw.gitVersion) ||
    !safeText(raw.resourceRoot) ||
    raw.posture !== LOCAL_GIT_WORKTREE_POSTURE ||
    raw.scope !== LOCAL_GIT_WORKTREE_SCOPE
  )
    return fail('FC-INPUT', 'INVALID_LOCAL_ENVIRONMENT');
  if (platform() !== raw.os) return fail('FC-AUTHORITY', 'HOST_OS_MISMATCH');
  const root = trustedRoot(String(raw.resourceRoot));
  return root.ok
    ? ok(
        Object.freeze({
          os: raw.os,
          gitVersion: raw.gitVersion,
          resourceRoot: root.value,
          posture: LOCAL_GIT_WORKTREE_POSTURE,
          scope: LOCAL_GIT_WORKTREE_SCOPE,
        }),
      )
    : root;
}

function validateAdmission(admission: unknown): Result<LocalGitWorktreeAdmission> {
  const raw = exactObject(admission, [
    'kind',
    'story',
    'principal',
    'manifestId',
    'manifestDigest',
    'proofDigest',
    'ledger',
    'approval',
    'basis',
    'proof',
    'observedAt',
    'maxAgeMs',
  ]);
  const proof =
    raw &&
    exactObject(raw.proof, [
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
  if (
    raw?.kind !== 'gf022-provider-admission' ||
    raw.story !== 'GF-022' ||
    raw.principal !== 'principal/arye' ||
    raw.manifestId !== LOCAL_GIT_WORKTREE_MANIFEST_ID ||
    raw.manifestDigest !== LOCAL_GIT_WORKTREE_MANIFEST_DIGEST ||
    !DIGEST.test(String(raw.proofDigest)) ||
    raw.proofDigest !== proof?.digest ||
    !isScriptedLedger(raw.ledger) ||
    !Number.isSafeInteger(raw.observedAt) ||
    !Number.isSafeInteger(raw.maxAgeMs) ||
    raw.maxAgeMs !== LOCAL_GIT_WORKTREE_MAX_PROOF_AGE_MS ||
    !Number.isSafeInteger(proof?.observedAt) ||
    Number(raw.observedAt) < Number(proof?.observedAt) ||
    Number(raw.observedAt) - Number(proof?.observedAt) > raw.maxAgeMs
  )
    return fail('FC-AUTHORITY', 'GF022_ADMISSION_REQUIRED');
  try {
    const fixture = createProviderAdmissionFixture({
      manifestBytes: GF022_APPROVED_MANIFEST,
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
    const approval = approved.ok ? exactObject(approved.value, ['kind', 'manifestId']) : undefined;
    const result = admitted.ok ? exactObject(admitted.value, ['kind', 'manifestId', 'providerEnabled']) : undefined;
    if (
      approval?.kind !== 'approved' ||
      approval?.manifestId !== GF022_APPROVED_MANIFEST_ID ||
      !result ||
      result.kind !== 'eligible' ||
      result.manifestId !== GF022_APPROVED_MANIFEST_ID ||
      result.providerEnabled !== false
    )
      return fail('FC-AUTHORITY', 'GF022_ADMISSION_REQUIRED');
  } catch {
    return fail('FC-TRUST', 'GF022_ADMISSION_UNAVAILABLE');
  }
  return ok(
    Object.freeze({
      kind: 'gf022-provider-admission',
      story: 'GF-022',
      principal: 'principal/arye',
      manifestId: LOCAL_GIT_WORKTREE_MANIFEST_ID,
      manifestDigest: LOCAL_GIT_WORKTREE_MANIFEST_DIGEST,
      proofDigest: String(raw.proofDigest),
    }),
  );
}

function validateEvidence(
  evidence: unknown,
  environment: LocalGitWorktreeEnvironment,
): Result<LocalGitWorktreeProbeEvidence> {
  const raw = exactObject(evidence, [
    'kind',
    'status',
    'suite',
    'probe',
    'provider',
    'providerBuildDigest',
    'manifestId',
    'manifestDigest',
    'environment',
    'environmentDigest',
    'resourceDigest',
    'candidateCommit',
    'candidateTree',
    'fixtureDigest',
    'admissionProofDigest',
    'admissionObservedAt',
    'admissionAgeMs',
    'requestDigest',
    'resultDigest',
    'operationDigest',
    'probeDigest',
    'runner',
    'recordedAt',
    'recorder',
  ]);
  const runner = raw && exactObject(raw.runner, ['runtime', 'os', 'gitVersion']);
  const candidate = currentCandidateIdentity();
  if (
    raw?.kind !== 'CF-GATE-PROVIDER' ||
    raw.status !== 'passed' ||
    raw.suite !== LOCAL_GIT_WORKTREE_SUITE_VERSION ||
    raw.probe !== LOCAL_GIT_WORKTREE_PROBE_VERSION ||
    raw.provider !== LOCAL_GIT_WORKTREE_PROVIDER ||
    raw.providerBuildDigest !== LOCAL_GIT_WORKTREE_BUILD_DIGEST ||
    raw.manifestId !== LOCAL_GIT_WORKTREE_MANIFEST_ID ||
    raw.manifestDigest !== LOCAL_GIT_WORKTREE_MANIFEST_DIGEST ||
    raw.environmentDigest !== environmentDigest(environment) ||
    raw.resourceDigest !== digest('WORKSPACE-RESOURCE', environment.resourceRoot) ||
    !candidate.ok ||
    raw.candidateCommit !== candidate.value.commit ||
    raw.candidateTree !== candidate.value.tree ||
    !GIT_OBJECT.test(String(raw.candidateCommit)) ||
    !GIT_OBJECT.test(String(raw.candidateTree)) ||
    !DIGEST.test(String(raw.fixtureDigest)) ||
    !DIGEST.test(String(raw.admissionProofDigest)) ||
    !Number.isSafeInteger(raw.admissionObservedAt) ||
    !Number.isSafeInteger(raw.admissionAgeMs) ||
    (raw.admissionAgeMs as number) < 0 ||
    (raw.admissionAgeMs as number) > LOCAL_GIT_WORKTREE_MAX_PROOF_AGE_MS ||
    !DIGEST.test(String(raw.requestDigest)) ||
    !DIGEST.test(String(raw.resultDigest)) ||
    !DIGEST.test(String(raw.operationDigest)) ||
    !DIGEST.test(String(raw.probeDigest)) ||
    !runner ||
    runner.runtime !== 'node-esm' ||
    runner.os !== environment.os ||
    runner.gitVersion !== environment.gitVersion ||
    raw.recorder !== 'recorder/jig-gf039-real-local/v1' ||
    !Number.isSafeInteger(raw.recordedAt)
  )
    return fail('FC-AUTHORITY', 'QUALIFICATION_EVIDENCE_MISMATCH');
  if (
    (raw.recordedAt as number) > Date.now() ||
    Date.now() - (raw.recordedAt as number) > LOCAL_GIT_WORKTREE_MAX_PROOF_AGE_MS
  )
    return fail('FC-AUTHORITY', 'QUALIFICATION_EVIDENCE_STALE');
  return ok(raw as unknown as LocalGitWorktreeProbeEvidence);
}

export function discoverLocalGitWorktreeEnvironment(resourceRoot: string): Result<LocalGitWorktreeEnvironment> {
  const root = trustedRoot(resourceRoot);
  const version = gitVersion();
  if (!root.ok) return root;
  if (!disposableRoot(root.value)) return fail('FC-AUTHORITY', 'RESOURCE_SCOPE_MISMATCH');
  if (!version.ok) return version;
  const os = platform();
  if (os !== 'darwin' && os !== 'linux') return fail('FC-AUTHORITY', 'UNSUPPORTED_HOST_OS');
  return ok(
    Object.freeze({
      os,
      gitVersion: version.value,
      resourceRoot: root.value,
      posture: LOCAL_GIT_WORKTREE_POSTURE,
      scope: LOCAL_GIT_WORKTREE_SCOPE,
    }),
  );
}

export function createQualifiedLocalGitWorktreeProvider(
  input: Readonly<{ admission: unknown; evidence: unknown; environment: unknown }>,
): Result<LocalGitWorktreeProvider> {
  const environment = validateEnvironment(input?.environment);
  const admission = validateAdmission(input?.admission);
  if (!environment.ok) return environment;
  if (!admission.ok) return admission;
  const evidence = validateEvidence(input?.evidence, environment.value);
  if (!evidence.ok) return evidence;
  if (typeof input?.evidence !== 'object' || input.evidence === null || !RECORDED_EVIDENCE.has(input.evidence))
    return fail('FC-AUTHORITY', 'UNRECORDED_QUALIFICATION_EVIDENCE');
  return ok(createMechanism(environment.value));
}

export function recordLocalGitWorktreeGateEvidence(input: unknown): Result<LocalGitWorktreeProbeEvidence> {
  const raw = exactObject(input, ['evidence']);
  const evidence = raw?.evidence;
  if (!evidence || typeof evidence !== 'object') return fail('FC-INPUT', 'EVIDENCE_REQUIRED');
  const env = exactObject((evidence as Record<string, unknown>).environment, [
    'os',
    'gitVersion',
    'resourceRoot',
    'posture',
    'scope',
  ]);
  if (!env) return fail('FC-AUTHORITY', 'EVIDENCE_ENVIRONMENT_REQUIRED');
  const result = validateEvidence(evidence, env as unknown as LocalGitWorktreeEnvironment);
  return result.ok && typeof evidence === 'object' && evidence !== null && RECORDED_EVIDENCE.has(evidence)
    ? result
    : fail('FC-AUTHORITY', 'UNRECORDED_QUALIFICATION_EVIDENCE');
}

function fixtureIntent(binding: WorkspaceBinding): WorkspaceOperationIntent {
  const proof = proofFor(binding);
  return Object.freeze({
    version: 'jig.workspace-contract.v1',
    operation: binding.operation,
    operationType: binding.operationType,
    effect: binding.operationType === 'OPC-WS-OBSERVE' ? 'observation' : 'effectful',
    port: 'PORT-WORKSPACE',
    capability: 'CB-WORKSPACE',
    binding,
    proof,
  });
}

function fixtureBinding(
  run: string,
  story: string,
  operation: string,
  operationType: WorkspaceOperationType,
  repository: string,
  path: string,
  basis: string,
  host: string,
): WorkspaceBinding {
  return Object.freeze({
    operation,
    operationType,
    subject: Object.freeze({ run, story, basis }),
    repository,
    path,
    basis,
    recipeDigest: digest('WORKSPACE-RECIPE', { operationType }),
    inputFingerprintDigest: digest('WORKSPACE-INPUT', { operationType }),
    host,
    manifest: LOCAL_GIT_WORKTREE_MANIFEST_ID,
  });
}

function setupFixtureRepository(repository: string): Result<{ head: string }> {
  mkdirSync(repository, { recursive: true });
  if (
    !git(repository, ['init', '--quiet']).ok ||
    !git(repository, ['config', 'user.name', 'Jig Qualification Fixture']).ok ||
    !git(repository, ['config', 'user.email', 'fixture@invalid']).ok
  )
    return fail('FC-MECHANISM', 'FIXTURE_REPOSITORY_FAILED');
  writeFileSync(join(repository, 'README.md'), 'GF-039 disposable qualification fixture\n');
  if (!git(repository, ['add', 'README.md']).ok || !git(repository, ['commit', '--quiet', '-m', 'fixture']).ok)
    return fail('FC-MECHANISM', 'FIXTURE_COMMIT_FAILED');
  const head = repoHead(repository);
  return head.ok ? ok({ head: head.value }) : head;
}

export function cleanupLocalGitWorktreeProbe(resourceRoot: string): Result<Readonly<{ removed: string }>> {
  try {
    const root = resolve(resourceRoot);
    const temporary = realpathSync(resolve(tmpdir()));
    if (
      !root.startsWith(`${temporary}/jig-gf039-`) ||
      root === temporary ||
      root === '/' ||
      root === homedir() ||
      !existsSync(root) ||
      realpathSync(root) !== root ||
      lstatSync(root).isSymbolicLink() ||
      !lstatSync(root).isDirectory()
    )
      return fail('FC-TRUST', 'CLEANUP_TARGET_REJECTED');
    rmSync(root, { recursive: true, force: true });
    return ok(Object.freeze({ removed: root }));
  } catch {
    return fail('FC-MECHANISM', 'CLEANUP_FAILED');
  }
}

export function runLocalGitWorktreeQualificationProbe(
  input: Readonly<{ candidateCommit: string; candidateTree: string; admission: unknown; retainRoot?: boolean }>,
): Result<LocalGitWorktreeProbeResult> {
  if (!GIT_OBJECT.test(input?.candidateCommit) || !GIT_OBJECT.test(input?.candidateTree))
    return fail('FC-INPUT', 'CANDIDATE_DIGEST_REQUIRED');
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jig-gf039-')));
  const source = join(root, 'source');
  const target = join(root, 'target');
  const setup = setupFixtureRepository(source);
  if (!setup.ok) {
    if (!input.retainRoot) cleanupLocalGitWorktreeProbe(root);
    return setup;
  }
  const environment = discoverLocalGitWorktreeEnvironment(root);
  if (!environment.ok) {
    if (!input.retainRoot) cleanupLocalGitWorktreeProbe(root);
    return environment;
  }
  const admission = validateAdmission(input?.admission);
  if (!admission.ok) {
    if (!input.retainRoot) cleanupLocalGitWorktreeProbe(root);
    return admission;
  }
  const run = 'run-000000000001-0123456789abcdef';
  const story = `${run}/story/gf039`;
  const generation = `${run}/gen/1|controller-token-1|${'a'.repeat(64)}`;
  const host = `host/local-git-worktree/${environmentDigest(environment.value)}`;
  const basis = digest('WORKSPACE-BASIS', { repository: source, head: setup.value.head });
  const provider = createMechanism(environment.value);
  const bindings = (ordinal: number, type: WorkspaceOperationType, path = target) =>
    fixtureBinding(run, story, `${run}/txn/${ordinal}/${generation}/op/${ordinal}`, type, source, path, basis, host);
  const provision = provider.dispatch({ intent: fixtureIntent(bindings(1, 'OPC-WS-PROVISION')) });
  const setupIntent = fixtureIntent(bindings(2, 'OPC-WS-SETUP'));
  const setupResult = provider.setup({ intent: setupIntent, receipt: null });
  const setupReceipt = setupResult.ok && 'setupReceipt' in setupResult.value ? setupResult.value.setupReceipt : null;
  const replacementProvider = createMechanism(environment.value);
  const replacementSetup =
    setupReceipt && setupResult.ok
      ? replacementProvider.setup({ intent: setupIntent, receipt: setupReceipt })
      : fail('FC-MECHANISM', 'SETUP_REPLACEMENT_PROBE_FAILED');
  const setupNoOp =
    setupResult.ok && setupReceipt
      ? provider.setup({ intent: setupIntent, receipt: setupReceipt })
      : fail('FC-MECHANISM', 'SETUP_PROBE_FAILED');
  const observe = provider.dispatch({ intent: fixtureIntent(bindings(3, 'OPC-WS-OBSERVE')) });
  const preserve = provider.dispatch({ intent: fixtureIntent(bindings(4, 'OPC-WS-PRESERVE')) });
  const uncertain = provider.dispatch({ intent: fixtureIntent(bindings(5, 'OPC-WS-RETIRE')), fault: 'uncertain' });
  const lookup = uncertain.ok
    ? fail('FC-TRUST', 'UNEXPECTED_RETIRE_SUCCESS')
    : provider.reconcile({ operation: bindings(5, 'OPC-WS-RETIRE').operation, binding: bindings(5, 'OPC-WS-RETIRE') });
  const duplicate = provider.dispatch({ intent: fixtureIntent(bindings(1, 'OPC-WS-PROVISION')) });
  const lostIntent = fixtureIntent(bindings(6, 'OPC-WS-OBSERVE'));
  const lost = provider.dispatch({ intent: lostIntent, fault: 'lost-response' });
  const lostLookup = lost.ok
    ? fail('FC-TRUST', 'EXPECTED_LOST_RESPONSE')
    : provider.reconcile({ operation: lostIntent.operation, binding: lostIntent.binding });
  const crashIntent = fixtureIntent(bindings(7, 'OPC-WS-PROVISION', join(root, 'crashed-target')));
  const crash = provider.dispatch({ intent: crashIntent, fault: 'crash' });
  const crashLookup = crash.ok
    ? fail('FC-TRUST', 'EXPECTED_CRASH')
    : provider.reconcile({ operation: crashIntent.operation, binding: crashIntent.binding });
  const observations = Object.freeze({
    nativeIsolation:
      provision.ok &&
      provision.value.workspaceFingerprint !== digest('WORKSPACE-PATH', { repository: source, path: source, basis }),
    exactBasis: Boolean(provision.ok && setupResult.ok && observe.ok),
    cleanliness: Boolean(
      setupResult.ok && 'cleanliness' in setupResult.value && setupResult.value.cleanliness === 'clean',
    ),
    freshness: Boolean(setupReceipt),
    idempotentSetup: Boolean(setupNoOp.ok && 'status' in setupNoOp.value && setupNoOp.value.status === 'no-op'),
    setupReplacementNoOp: Boolean(
      replacementSetup.ok && 'status' in replacementSetup.value && replacementSetup.value.status === 'no-op',
    ),
    idempotentProvision: !duplicate.ok && duplicate.error.code === 'DUPLICATE_WORKSPACE_OPERATION',
    lostResponseReconciles: Boolean(lostLookup.ok && lostLookup.value.outcome === 'confirmed-effect'),
    crashRecovery: Boolean(crashLookup.ok && crashLookup.value.outcome === 'confirmed-absence'),
    preservationBeforeRetire: Boolean(
      preserve.ok &&
        !uncertain.ok &&
        lookup.ok &&
        lookup.value.outcome === 'confirmed-absence' &&
        existsSync(join(target, 'README.md')),
    ),
    retireDisabledPreservesWorkspace: (() => {
      const retire = provider.dispatch({ intent: fixtureIntent(bindings(8, 'OPC-WS-RETIRE')) });
      return !retire.ok && retire.error.code === 'REAL_RETIRE_DISABLED' && existsSync(join(target, 'README.md'));
    })(),
    noSecrets: !SECRET_VALUE.test(MANIFEST_TEXT),
    gateDeniedWithoutAdmission: !createQualifiedLocalGitWorktreeProvider({
      admission: undefined,
      evidence: undefined,
      environment: environment.value,
    }).ok,
  });
  const passed = Object.values(observations).every(Boolean);
  const requestDigest = digest('WORKSPACE-PROBE-REQUEST', {
    candidateCommit: input.candidateCommit,
    candidateTree: input.candidateTree,
    provider: LOCAL_GIT_WORKTREE_PROVIDER,
    manifest: LOCAL_GIT_WORKTREE_MANIFEST_DIGEST,
    environment: environment.value,
  });
  const resultDigest = digest('WORKSPACE-PROBE-RESULT', { observations });
  const operationDigest = digest('WORKSPACE-PROBE-OPERATIONS', provider.invocations());
  const runner = Object.freeze({
    runtime: 'node-esm' as const,
    os: environment.value.os,
    gitVersion: environment.value.gitVersion,
  });
  const evidence: LocalGitWorktreeProbeEvidence = Object.freeze({
    kind: 'CF-GATE-PROVIDER',
    status: 'passed',
    suite: LOCAL_GIT_WORKTREE_SUITE_VERSION,
    probe: LOCAL_GIT_WORKTREE_PROBE_VERSION,
    provider: LOCAL_GIT_WORKTREE_PROVIDER,
    providerBuildDigest: LOCAL_GIT_WORKTREE_BUILD_DIGEST,
    manifestId: LOCAL_GIT_WORKTREE_MANIFEST_ID,
    manifestDigest: LOCAL_GIT_WORKTREE_MANIFEST_DIGEST,
    environment: environment.value,
    environmentDigest: environmentDigest(environment.value),
    resourceDigest: digest('WORKSPACE-RESOURCE', environment.value.resourceRoot),
    candidateCommit: input.candidateCommit,
    candidateTree: input.candidateTree,
    fixtureDigest: digest('WORKSPACE-FIXTURE', { source, target, basis }),
    admissionProofDigest: admission.value.proofDigest,
    admissionObservedAt: Number((input.admission as Record<string, unknown>).observedAt),
    admissionAgeMs:
      Number((input.admission as Record<string, unknown>).observedAt) -
      Number(((input.admission as Record<string, unknown>).proof as Record<string, unknown>).observedAt),
    requestDigest,
    resultDigest,
    operationDigest,
    probeDigest: digest('WORKSPACE-PROBE', { observations }),
    runner,
    recordedAt: Date.now(),
    recorder: 'recorder/jig-gf039-real-local/v1',
  });
  RECORDED_EVIDENCE.add(evidence);
  const result = passed
    ? ok(
        Object.freeze({ evidence, observations, resourceRoot: root, removedResources: input.retainRoot ? [] : [root] }),
      )
    : fail('FC-MECHANISM', 'QUALIFICATION_SUITE_FAILED');
  if (!input.retainRoot) cleanupLocalGitWorktreeProbe(root);
  return result;
}
