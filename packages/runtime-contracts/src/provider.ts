import { type CanonicalJson, encodeFrame, formatIdentity, stageDigest } from '@agentic-workflow-kit/jig-codec';
import { createScriptedLedger, isScriptedLedger } from './ledger.js';
import {
  type ProviderAdmissionClaims,
  readCertificateClaims,
  snapshotProviderAdmissionClaims,
  snapshotQualificationClaims,
} from './qualification-registry.js';

declare const TextEncoder: { new (): { encode(input?: string): Uint8Array } };

export const PROVIDER_ADMISSION_VERSION = 'jig.provider-admission.v1';

type FailureFamily = 'FC-INPUT' | 'FC-AUTHORITY' | 'FC-BOUND' | 'FC-TRUST';
export type ProviderAdmissionFailure = Readonly<{ family: FailureFamily; code: string }>;
export type ProviderAdmissionResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: ProviderAdmissionFailure }>;

type Scope = Readonly<{ phase: number; purpose: string; story: string }>;
type Basis = Readonly<{
  providerIdentity: string;
  providerBuild: string;
  environment: string;
  capability: string;
  policyMinimum: string;
  manifestId: string;
  manifestDigest: string;
  scope: Scope;
}>;
type Attempt = Readonly<{
  kind: 'start' | 'result';
  key: string;
  digest: string;
  basisDigest: string;
  ordinal: number;
  deadline: number;
  observedAt: number;
  retryLimit: number;
  predecessor: string | null;
  outcome?: 'positive' | 'negative' | 'timeout' | 'exhausted';
}>;
type Approval = Readonly<{ principal: string; manifestId: string; manifestDigest: string; scope: Scope }>;
type CapabilityProofCatalogueEntry = Readonly<{
  manifestBytes: Uint8Array;
  providerDigest: string;
  manifestDigest: string;
  providerIdentity: string;
  principal: string;
  scope: Scope;
}>;
type Fixture = Readonly<{
  approve(input: unknown): ProviderAdmissionResult<Readonly<{ kind: 'approved'; manifestId: string }>>;
  start(input: unknown): ProviderAdmissionResult<Attempt>;
  result(input: unknown): ProviderAdmissionResult<Attempt>;
  admit(input: unknown): ProviderAdmissionResult<
    Readonly<{
      kind: 'eligible';
      manifestId: string;
      providerEnabled: false;
    }>
  >;
  readback(input: unknown): ProviderAdmissionResult<Attempt>;
  reachability(): ProviderAdmissionResult<Readonly<{ kind: 'unavailable'; providerEnabled: false }>>;
}>;

const APPROVED_MANIFEST_DIGEST = '53568c156d6ee898dc1ba32897d22f8abf47afa4bad86d35ffc6bcd7ce9067df';
const APPROVED_PROVIDER_DIGEST = 'c18ba0c266f04abcf220a39edd23c54599894dbf36d8d024db4b93aacb70308b';
const APPROVED_MANIFEST_BYTES = new TextEncoder().encode(
  '{"credentialAuthority":[],"externalServiceAuthority":[],"filesystemAuthority":[],"lineage":{"kind":"genesis"},"manifestVersion":"provider-authority/v1","nativePermissionPostures":[],"networkAuthority":[],"providerIdentity":"scripted-capability-proof-fixture/v1","runtimeAuthority":{"kind":"in-process-pure-fixture"},"scope":{"phase":2,"purpose":"semantic-admission-fixture","story":"GF-022"},"subprocessAuthority":[]}\n',
);
const LOCAL_GIT_WORKTREE_MANIFEST_DIGEST = '8def77b5bbcbd257d1aedf7b279a839dc0ab88550675f1c71a3b64567226a5e6';
const LOCAL_GIT_WORKTREE_PROVIDER_DIGEST = 'baa6e132e39a58e4617adfe1088830df9cd8bd8df7e08abe36f37cfe57908409';
const LOCAL_GIT_WORKTREE_MANIFEST_BYTES = new TextEncoder().encode(
  '{"credentialAuthority":[],"externalServiceAuthority":[],"filesystemAuthority":[{"access":["read","create","remove-worktree"],"discovery":"binding-only","locator":{"kind":"explicit-disposable-root","scope":"resource/local-mktemp-root/v1"},"regularFileOnly":false,"symlinkPolicy":"reject","traversalPolicy":"reject"}],"lineage":{"kind":"genesis"},"manifestVersion":"provider-authority/v1","nativePermissionPostures":["local-posix-git-worktree-no-network-no-credentials/v1"],"networkAuthority":[],"providerIdentity":"local-git-worktree-provider/v1","runtimeAuthority":{"environment":"local-posix-git/v1","kind":"fixed-git-worktree-provider","package":"packages/local-workspace-providers"},"scope":{"phase":3,"purpose":"qualified-local-git-worktree","story":"GF-039"},"subprocessAuthority":[{"executable":"git","argumentPolicy":"fixed-subcommands-only","shell":false}],"vcs":"git"}\n',
);
const LOCAL_COMMAND_VERIFIER_MANIFEST_DIGEST = 'bffe725bfefd14666e15dffaf6df04577025c7afd1e1dd2e5bd84547625054c3';
const LOCAL_COMMAND_VERIFIER_PROVIDER_DIGEST = 'b467043e3e2f097f5f94e485bef22307661e18d2332be9c532e04125e6e12474';
const LOCAL_COMMAND_VERIFIER_BUILD_DIGEST = 'c8a6a941f8aebbeb4f6cc99b5f9a43d8997335f886d405aaa6b43d336216a760';
const LOCAL_COMMAND_VERIFIER_MANIFEST_BYTES = new TextEncoder().encode(
  '{"credentialAuthority":[],"externalServiceAuthority":[],"filesystemAuthority":[{"access":["read-checkout","write-disposable-scratch"],"checkout":"read-only","discovery":"binding-only","scratch":"discarded","symlinkPolicy":"reject","traversalPolicy":"reject"}],"lineage":{"kind":"genesis"},"manifestVersion":"provider-authority/v1","nativePermissionPostures":["local-posix-command-verifier/v1"],"networkAuthority":[],"packageIdentity":"packages/local-verification-providers","providerIdentity":"local-posix-command-verifier/v1","runtimeAuthority":{"environment":"local-posix-command/v1","kind":"native-posix-sandbox-exec","package":"packages/local-verification-providers"},"runtimeReadAuthority":[{"digest":"a73efca930c2adb1f52eef0d1d3b17d375ee40290fc796653c91c33abf381938","path":"/usr/bin/true","role":"executable"},{"digest":"6da2d109f72330d031450f3c0ebea14bfc10f42f844a958858e16a4092c38f12","path":"/usr/lib/dyld","role":"dynamic-loader"}],"sandboxPolicyAuthority":{"checkoutRead":"canonical-tracked-tree-literals","confinementProbe":{"dynamicLoader":"/usr/lib/dyld","dynamicLoaderDigest":"6da2d109f72330d031450f3c0ebea14bfc10f42f844a958858e16a4092c38f12","executable":"/bin/cat","executableDigest":"9e4bb13f36ffcc1ff2152738e185637f5b7c97977044bb88a3708cbba2c351ec"},"network":"denied","runtimeRead":"literal-digest-pinned","scratchWrite":"canonical-subpath","symlinkPolicy":"reject","systemReadLiterals":["/","/private","/private/etc","/private/var","/private/tmp","/dev/null","/dev/zero","/dev/random","/dev/urandom"],"traversalPolicy":"reject","version":"canonical-macos-sandbox/v1"},"scope":{"phase":4,"purpose":"local-command-verification","story":"GF-047"},"subprocessAuthority":[{"args":[],"argumentPolicy":"exact","executable":"/usr/bin/true","executableDigest":"a73efca930c2adb1f52eef0d1d3b17d375ee40290fc796653c91c33abf381938","shell":false}]}\n',
);
const CAPABILITY_PROOF_CATALOGUE: readonly CapabilityProofCatalogueEntry[] = Object.freeze([
  Object.freeze({
    manifestBytes: APPROVED_MANIFEST_BYTES,
    providerDigest: APPROVED_PROVIDER_DIGEST,
    manifestDigest: APPROVED_MANIFEST_DIGEST,
    providerIdentity: 'scripted-capability-proof-fixture/v1',
    principal: 'principal/arye',
    scope: Object.freeze({ phase: 2, purpose: 'semantic-admission-fixture', story: 'GF-022' }),
  }),
  Object.freeze({
    manifestBytes: LOCAL_GIT_WORKTREE_MANIFEST_BYTES,
    providerDigest: LOCAL_GIT_WORKTREE_PROVIDER_DIGEST,
    manifestDigest: LOCAL_GIT_WORKTREE_MANIFEST_DIGEST,
    providerIdentity: 'local-git-worktree-provider/v1',
    principal: 'principal/arye',
    scope: Object.freeze({ phase: 3, purpose: 'qualified-local-git-worktree', story: 'GF-039' }),
  }),
  Object.freeze({
    manifestBytes: LOCAL_COMMAND_VERIFIER_MANIFEST_BYTES,
    providerDigest: LOCAL_COMMAND_VERIFIER_PROVIDER_DIGEST,
    manifestDigest: LOCAL_COMMAND_VERIFIER_MANIFEST_DIGEST,
    providerIdentity: 'local-posix-command-verifier/v1',
    principal: 'principal/arye',
    scope: Object.freeze({ phase: 4, purpose: 'local-command-verification', story: 'GF-047' }),
  }),
]);
/** Private immutable catalogue; callers can select no entry and cannot register one. */
const STRUCTURED_FILE_CATALOGUE = Object.freeze({
  manifestBytes: new TextEncoder().encode(
    '{"credentialAuthority":[],"externalServiceAuthority":[],"filesystemAuthority":[{"access":"read-only","discovery":"none","locator":{"kind":"exact-file","path":"<JIG_DATA_HOME>/work-sources/work-plan.json"},"regularFileOnly":true,"symlinkPolicy":"reject","traversalPolicy":"reject"}],"lineage":{"kind":"genesis"},"manifestVersion":"provider-authority/v1","nativePermissionPostures":[],"networkAuthority":[],"packageIdentity":"packages/local-file-providers","providerIdentity":"structured-json-file-source/v1","runtimeAuthority":{"environmentIdentity":"environment/local-file-source","kind":"in-process-local-file-provider"},"scope":{"phase":2,"purpose":"structured-file-work-source","story":"GF-020"},"subprocessAuthority":[]}\n',
  ),
  manifestId:
    'provider/332e924db587773fae8b38359c47e715e2064d3ba3f1a7091130e4da661dc73e/authority/91821429bca10e93438c9a15bb6309366ca5809f2d1cff972425adde54667a18',
  scope: Object.freeze({ phase: 2, purpose: 'structured-file-work-source', story: 'GF-020' }),
  environment: 'environment/local-file-source',
  environmentDigest: 'b880653890190d5da3ac311736401fd1fa02f2d221bee8258eae231717143536',
  providerBuildDigest: '0d842ed9d3bf39f51f1c10f36b1e4c2414df93bf214ec80da1dde92a890e1b81',
  principal: 'principal/arye',
  capability: 'PORT-SOURCE/read-structured-json',
  policyMinimum: 'policy/structured-file-source/v1',
  resourceDigest: 'fe23b4511a1abafef43ee38c6bc0c6496d4a3787ac9a913bd4634f960fce2bbd',
});

const SECRET = /(?:secret|token|password|credential|authorization|api[._ -]?key)/iu;
const DIGEST = /^[0-9a-f]{64}$/u;

const freeze = <T>(value: T): T => Object.freeze(value);
const ok = <T>(value: T): ProviderAdmissionResult<T> => freeze({ ok: true, value: freeze(value) });
const fail = (family: FailureFamily, code: string): ProviderAdmissionResult<never> =>
  freeze({ ok: false, error: freeze({ family, code }) });
const plain = (value: unknown): value is object => {
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
};
const fields = (value: unknown, names: readonly string[]): Record<string, unknown> | undefined => {
  try {
    if (!plain(value)) return undefined;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== 'string') || keys.length !== names.length) return undefined;
    if (![...keys].sort().every((key, index) => key === [...names].sort()[index])) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (!names.every((name) => descriptors[name]?.enumerable && 'value' in descriptors[name])) return undefined;
    return Object.fromEntries(names.map((name) => [name, descriptors[name].value]));
  } catch {
    return undefined;
  }
};
const canonical = (value: unknown): CanonicalJson | undefined => {
  const framed = encodeFrame(value as CanonicalJson);
  return framed.ok ? (value as CanonicalJson) : undefined;
};
const digest = (domain: string, value: unknown): string | undefined => {
  const framed = canonical(value);
  if (framed === undefined) return undefined;
  const staged = stageDigest({ domain, excludePaths: [], value: framed });
  return staged.ok ? staged.value.digest : undefined;
};
const safeText = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= 256 &&
  value.normalize('NFC') === value &&
  !SECRET.test(value);
const safeDigest = (value: unknown): value is string => typeof value === 'string' && DIGEST.test(value);
const safeTime = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const PROVIDER_ADMISSION_MAX_AGE_MS = 86_400_000;
const scope = (value: unknown, entry: CapabilityProofCatalogueEntry): Scope | undefined => {
  const data = fields(value, ['phase', 'purpose', 'story']);
  return data &&
    data.phase === entry.scope.phase &&
    data.purpose === entry.scope.purpose &&
    data.story === entry.scope.story
    ? freeze({ phase: data.phase, purpose: data.purpose, story: data.story })
    : undefined;
};
const same = (left: unknown, right: unknown): boolean => {
  const leftFrame = encodeFrame(left as CanonicalJson);
  const rightFrame = encodeFrame(right as CanonicalJson);
  return (
    leftFrame.ok &&
    rightFrame.ok &&
    leftFrame.value.length === rightFrame.value.length &&
    leftFrame.value.every((byte, index) => byte === rightFrame.value[index])
  );
};
const exactBytes = (value: unknown, entry: CapabilityProofCatalogueEntry): boolean => {
  try {
    return (
      value instanceof Uint8Array &&
      value.byteLength === entry.manifestBytes.byteLength &&
      entry.manifestBytes.every((byte, index) => value[index] === byte)
    );
  } catch {
    return false;
  }
};
const exactCatalogueBytes = (value: unknown): boolean => {
  try {
    return (
      value instanceof Uint8Array &&
      value.byteLength === STRUCTURED_FILE_CATALOGUE.manifestBytes.byteLength &&
      STRUCTURED_FILE_CATALOGUE.manifestBytes.every((byte, index) => value[index] === byte)
    );
  } catch {
    return false;
  }
};
const catalogueEntry = (value: unknown): CapabilityProofCatalogueEntry | undefined => {
  try {
    return CAPABILITY_PROOF_CATALOGUE.find((entry) => exactBytes(value, entry));
  } catch {
    return undefined;
  }
};
const manifestId = (entry: CapabilityProofCatalogueEntry): string | undefined => {
  const formatted = formatIdentity('ID-MANIFEST', {
    providerDigest: entry.providerDigest,
    authorityDigest: entry.manifestDigest,
  });
  return formatted.ok ? formatted.value.value : undefined;
};
const basis = (value: unknown, entry: CapabilityProofCatalogueEntry): Basis | undefined => {
  const data = fields(value, [
    'capability',
    'environment',
    'manifestDigest',
    'manifestId',
    'policyMinimum',
    'providerBuild',
    'providerIdentity',
    'scope',
  ]);
  const exactManifestId = manifestId(entry);
  if (
    !data ||
    !exactManifestId ||
    data.manifestId !== exactManifestId ||
    data.manifestDigest !== entry.manifestDigest ||
    data.providerIdentity !== entry.providerIdentity ||
    !safeText(data.providerBuild) ||
    !safeText(data.environment) ||
    !safeText(data.capability) ||
    !safeText(data.policyMinimum) ||
    !scope(data.scope, entry)
  )
    return undefined;
  return freeze({
    providerIdentity: data.providerIdentity,
    providerBuild: data.providerBuild,
    environment: data.environment,
    capability: data.capability,
    policyMinimum: data.policyMinimum,
    manifestId: data.manifestId,
    manifestDigest: data.manifestDigest,
    scope: scope(data.scope, entry) as Scope,
  });
};

function createProviderAdmissionFixtureInternal(input: unknown): Fixture {
  const config = fields(input, ['approval', 'ledger', 'manifestBytes']);
  const ledger = config?.ledger && isScriptedLedger(config.ledger) ? config.ledger : undefined;
  const entry = config && ledger ? catalogueEntry(config.manifestBytes) : undefined;
  const configured = entry ? approval(config?.approval, entry) : undefined;
  const approvalBinding = configured;
  const readAttempt = (basisDigest: string, ordinal: number, variant: Attempt['kind']): Attempt | undefined => {
    try {
      const read = ledger?.readPreflight(`${basisDigest}/${ordinal}`, variant);
      if (!read?.ok) return undefined;
      const committed = read.value;
      if ('kind' in committed) return undefined;
      const names =
        variant === 'start'
          ? ['basisDigest', 'deadline', 'kind', 'observedAt', 'ordinal', 'predecessor', 'retryLimit']
          : ['basisDigest', 'deadline', 'kind', 'observedAt', 'ordinal', 'outcome', 'predecessor', 'retryLimit'];
      const bytes = fields(committed.bytes, names);
      const expectedKey = `${basisDigest}/${ordinal}/${variant}`;
      const expectedDigest = digest('PREFLIGHT-ATTEMPT', committed.bytes);
      if (
        !bytes ||
        committed.key !== expectedKey ||
        !safeDigest(committed.digest) ||
        expectedDigest !== committed.digest ||
        !safeTime(committed.deadline) ||
        bytes.kind !== variant ||
        bytes.basisDigest !== basisDigest ||
        bytes.ordinal !== ordinal ||
        bytes.deadline !== committed.deadline ||
        !safeTime(bytes.deadline) ||
        !safeTime(bytes.observedAt) ||
        bytes.observedAt > bytes.deadline ||
        !Number.isSafeInteger(bytes.retryLimit) ||
        (bytes.retryLimit as number) < 1 ||
        bytes.ordinal > (bytes.retryLimit as number) ||
        (variant === 'start'
          ? !(bytes.predecessor === null || safeDigest(bytes.predecessor))
          : !safeDigest(bytes.predecessor) ||
            !['positive', 'negative', 'timeout', 'exhausted'].includes(bytes.outcome as string))
      )
        return undefined;
      return freeze({ ...bytes, key: committed.key, digest: committed.digest }) as Attempt;
    } catch {
      return undefined;
    }
  };
  const approve = (input: unknown): ProviderAdmissionResult<Readonly<{ kind: 'approved'; manifestId: string }>> =>
    entry && approval(input, entry) && approvalBinding && same(approval(input, entry), approvalBinding)
      ? ok({ kind: 'approved', manifestId: approvalBinding.manifestId })
      : fail('FC-AUTHORITY', 'EXACT_MANIFEST_APPROVAL_REQUIRED');
  const write = (input: unknown, kind: Attempt['kind']): ProviderAdmissionResult<Attempt> => {
    if (!approvalBinding) return fail('FC-AUTHORITY', 'EXACT_MANIFEST_APPROVAL_REQUIRED');
    const names =
      kind === 'start'
        ? ['basis', 'deadline', 'observedAt', 'ordinal', 'predecessor', 'retryLimit']
        : ['basis', 'deadline', 'observedAt', 'ordinal', 'outcome', 'predecessor', 'retryLimit'];
    const data = fields(input, names);
    const bound = data && entry && basis(data.basis, entry);
    if (
      !data ||
      !bound ||
      !safeTime(data.deadline) ||
      !safeTime(data.observedAt) ||
      data.observedAt > data.deadline ||
      !Number.isSafeInteger(data.ordinal) ||
      (data.ordinal as number) < 1 ||
      !Number.isSafeInteger(data.retryLimit) ||
      (data.retryLimit as number) < 1 ||
      (data.ordinal as number) > (data.retryLimit as number) ||
      (kind === 'start'
        ? !(data.predecessor === null || safeDigest(data.predecessor))
        : !safeDigest(data.predecessor)) ||
      (kind === 'result' && !['positive', 'negative', 'timeout', 'exhausted'].includes(data.outcome as string))
    )
      return fail('FC-INPUT', 'INVALID_CAPABILITY_PROOF_ATTEMPT');
    const ordinal = data.ordinal as number;
    const retryLimit = data.retryLimit as number;
    const basisDigest = digest('CAPABILITY-PROOF-BASIS', bound);
    if (!basisDigest) return fail('FC-INPUT', 'INVALID_CAPABILITY_PROOF_BASIS');
    const key = `${basisDigest}/${ordinal}/${kind}`;
    if (kind === 'start') {
      if (ordinal === 1 ? data.predecessor !== null : !data.predecessor)
        return fail('FC-INPUT', 'INVALID_PREFLIGHT_PREDECESSOR');
      if (ordinal > 1) {
        const predecessor = readAttempt(basisDigest, ordinal - 1, 'result');
        if (
          !predecessor ||
          predecessor.digest !== data.predecessor ||
          predecessor.retryLimit !== retryLimit ||
          data.observedAt < predecessor.observedAt ||
          !predecessor.outcome ||
          predecessor.outcome === 'positive' ||
          predecessor.outcome === 'exhausted'
        )
          return fail('FC-TRUST', 'TERMINAL_PREDECESSOR_REQUIRED');
      }
    } else {
      const predecessor = readAttempt(basisDigest, ordinal, 'start');
      if (
        !predecessor ||
        predecessor.digest !== data.predecessor ||
        predecessor.deadline !== data.deadline ||
        predecessor.retryLimit !== data.retryLimit ||
        data.observedAt < predecessor.observedAt
      )
        return fail('FC-TRUST', 'START_PREDECESSOR_REQUIRED');
    }
    const recordBasis =
      kind === 'start'
        ? {
            kind,
            basisDigest,
            ordinal,
            deadline: data.deadline,
            observedAt: data.observedAt,
            retryLimit,
            predecessor: data.predecessor,
          }
        : {
            kind,
            basisDigest,
            ordinal,
            deadline: data.deadline,
            observedAt: data.observedAt,
            retryLimit,
            predecessor: data.predecessor,
            outcome: data.outcome,
          };
    const durable = ledger?.preflight({
      key: `${basisDigest}/${ordinal}`,
      variant: kind,
      bytes: recordBasis as CanonicalJson,
      ...(kind === 'result' ? { predecessor: data.predecessor as string } : {}),
      deadline: data.deadline,
      observedAt: data.observedAt,
    });
    if (!durable?.ok) return fail('FC-TRUST', 'PREFLIGHT_STORAGE_MISMATCH');
    const committed = readAttempt(basisDigest, ordinal, kind);
    return committed && committed.key === key ? ok(committed) : fail('FC-TRUST', 'PREFLIGHT_STORAGE_MISMATCH');
  };
  return freeze({
    approve,
    start: (input) => write(input, 'start'),
    result: (input) => write(input, 'result'),
    admit(input) {
      const data =
        fields(input, ['basis', 'maxAgeMs', 'proof']) ?? fields(input, ['basis', 'maxAgeMs', 'observedAt', 'proof']);
      const bound = data && entry && basis(data.basis, entry);
      const proofData =
        data &&
        fields(data.proof, [
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
      if (!data || !bound || !safeTime(data.maxAgeMs) || !proofData || !Number.isSafeInteger(proofData.ordinal))
        return fail('FC-INPUT', 'INVALID_ADMISSION');
      const basisDigest = digest('CAPABILITY-PROOF-BASIS', bound);
      const proof = proofData as Attempt;
      const stored = basisDigest && readAttempt(basisDigest, proof.ordinal, 'result');
      if (
        !stored ||
        !same(proof, stored) ||
        stored.kind !== 'result' ||
        stored.outcome !== 'positive' ||
        proof.basisDigest !== basisDigest
      )
        return fail('FC-AUTHORITY', 'POSITIVE_EXACT_PROOF_REQUIRED');
      const localCommand = bound.capability === 'PORT-VERIFY/local-command';
      const now = Date.now();
      const observedAt = localCommand ? now : data.observedAt;
      const maxAgeMs = localCommand ? PROVIDER_ADMISSION_MAX_AGE_MS : data.maxAgeMs;
      if (
        !safeTime(observedAt) ||
        !safeTime(maxAgeMs) ||
        observedAt < stored.observedAt ||
        observedAt - stored.observedAt > maxAgeMs ||
        (localCommand && data.maxAgeMs !== PROVIDER_ADMISSION_MAX_AGE_MS)
      )
        return fail('FC-AUTHORITY', 'STALE_OR_MISMATCHED_PROOF');
      return ok({ kind: 'eligible', manifestId: bound.manifestId, providerEnabled: false as const });
    },
    readback(input) {
      const data = fields(input, ['basis', 'ordinal', 'variant']);
      const bound = data && entry && basis(data.basis, entry);
      if (
        !data ||
        !bound ||
        !Number.isSafeInteger(data.ordinal) ||
        (data.ordinal as number) < 1 ||
        (data.variant !== 'start' && data.variant !== 'result')
      )
        return fail('FC-INPUT', 'INVALID_READBACK');
      const basisDigest = digest('CAPABILITY-PROOF-BASIS', bound);
      const committed = basisDigest && readAttempt(basisDigest, data.ordinal as number, data.variant);
      return committed ? ok(committed) : fail('FC-TRUST', 'ATTEMPT_ABSENT');
    },
    reachability: () => ok({ kind: 'unavailable', providerEnabled: false as const }),
  });
}

export function createProviderAdmissionFixture(input: unknown): Fixture {
  return createProviderAdmissionFixtureInternal(input);
}

const providerAdmissionTransitionClaims = new WeakMap<object, ProviderAdmissionClaims>();

/** Runtime-owned GF-022 transition; no caller data or authority claims are accepted. */
export function createExactLocalCommandAdmissionTransition(): object | undefined {
  const entry = CAPABILITY_PROOF_CATALOGUE.find(
    (candidate) => candidate.manifestDigest === LOCAL_COMMAND_VERIFIER_MANIFEST_DIGEST,
  );
  const ledger = createScriptedLedger();
  const manifestIdValue = entry && manifestId(entry);
  const approvalValue =
    entry && manifestIdValue
      ? {
          principal: 'principal/arye',
          manifestId: manifestIdValue,
          manifestDigest: entry.manifestDigest,
          scope: entry.scope,
        }
      : undefined;
  const basisValue =
    entry && manifestIdValue
      ? {
          providerIdentity: entry.providerIdentity,
          providerBuild: LOCAL_COMMAND_VERIFIER_BUILD_DIGEST,
          environment: 'local-posix-command/v1',
          capability: 'PORT-VERIFY/local-command',
          policyMinimum: 'policy/local-posix-command-verifier/v1',
          manifestId: manifestIdValue,
          manifestDigest: entry.manifestDigest,
          scope: entry.scope,
        }
      : undefined;
  const fixture =
    entry && approvalValue && basisValue
      ? createProviderAdmissionFixtureInternal({
          manifestBytes: entry.manifestBytes,
          approval: approvalValue,
          ledger,
        })
      : undefined;
  if (!entry || !basisValue || !fixture) return undefined;
  const now = Date.now();
  const start = fixture.start({
    basis: basisValue,
    ordinal: 1,
    deadline: now + 2_000,
    observedAt: now,
    retryLimit: 2,
    predecessor: null,
  });
  if (!start.ok) return undefined;
  const proof = fixture.result({
    basis: basisValue,
    ordinal: 1,
    deadline: now + 2_000,
    observedAt: now,
    retryLimit: 2,
    predecessor: start.value.digest,
    outcome: 'positive',
  });
  if (!proof.ok) return undefined;
  const admitted = fixture.admit({ basis: basisValue, proof: proof.value, maxAgeMs: PROVIDER_ADMISSION_MAX_AGE_MS });
  if (!admitted.ok) return undefined;
  const claims = snapshotProviderAdmissionClaims({
    principal: 'principal/arye',
    providerIdentity: basisValue.providerIdentity,
    providerBuild: basisValue.providerBuild,
    environment: basisValue.environment,
    capability: basisValue.capability,
    policyMinimum: basisValue.policyMinimum,
    manifestId: admitted.value.manifestId,
    manifestDigest: basisValue.manifestDigest,
    scope: basisValue.scope,
    proofDigest: proof.value.digest,
    observedAt: Date.now(),
    maxAgeMs: PROVIDER_ADMISSION_MAX_AGE_MS,
  });
  if (!claims) return undefined;
  const receipt = Object.freeze({});
  providerAdmissionTransitionClaims.set(receipt, claims);
  return receipt;
}

export function consumeExactLocalCommandAdmissionTransition(receipt: unknown): ProviderAdmissionClaims | undefined {
  if (typeof receipt !== 'object' || receipt === null) return undefined;
  const claims = providerAdmissionTransitionClaims.get(receipt);
  if (claims) providerAdmissionTransitionClaims.delete(receipt);
  return claims;
}

function approval(value: unknown, entry: CapabilityProofCatalogueEntry): Approval | undefined {
  const data = fields(value, ['manifestDigest', 'manifestId', 'principal', 'scope']);
  const exactManifestId = manifestId(entry);
  if (
    !data ||
    !exactManifestId ||
    data.principal !== entry.principal ||
    data.manifestId !== exactManifestId ||
    data.manifestDigest !== entry.manifestDigest ||
    !scope(data.scope, entry)
  )
    return undefined;
  return freeze({
    principal: data.principal,
    manifestId: data.manifestId,
    manifestDigest: data.manifestDigest,
    scope: scope(data.scope, entry) as Scope,
  });
}

/** Exact GF-020 catalogue gate; no caller can register a different manifest or self-enable it. */
export function structuredFileProviderGate(
  input: unknown,
): ProviderAdmissionResult<Readonly<{ kind: 'eligible'; manifestId: string; providerEnabled: false }>> {
  const data = fields(input, [
    'approval',
    'capability',
    'environment',
    'manifestBytes',
    'manifestId',
    'policyMinimum',
    'providerBuildDigest',
    'resourceDigest',
    'scope',
  ]);
  const approval = data && fields(data.approval, ['manifestDigest', 'manifestId', 'principal', 'scope']);
  if (
    !data ||
    !exactCatalogueBytes(data.manifestBytes) ||
    data.manifestId !== STRUCTURED_FILE_CATALOGUE.manifestId ||
    !approval ||
    approval.principal !== STRUCTURED_FILE_CATALOGUE.principal ||
    approval.manifestId !== STRUCTURED_FILE_CATALOGUE.manifestId ||
    approval.manifestDigest !== '91821429bca10e93438c9a15bb6309366ca5809f2d1cff972425adde54667a18' ||
    !same(approval.scope, STRUCTURED_FILE_CATALOGUE.scope) ||
    data.capability !== STRUCTURED_FILE_CATALOGUE.capability ||
    data.policyMinimum !== STRUCTURED_FILE_CATALOGUE.policyMinimum ||
    data.providerBuildDigest !== STRUCTURED_FILE_CATALOGUE.providerBuildDigest ||
    data.resourceDigest !== STRUCTURED_FILE_CATALOGUE.resourceDigest ||
    data.environment !== STRUCTURED_FILE_CATALOGUE.environment ||
    !same(data.scope, STRUCTURED_FILE_CATALOGUE.scope)
  )
    return fail('FC-AUTHORITY', 'EXACT_MANIFEST_BINDING_REQUIRED');
  // Eligibility is proof only. Reachability remains separately unavailable until live qualification.
  return ok({ kind: 'eligible', manifestId: STRUCTURED_FILE_CATALOGUE.manifestId, providerEnabled: false as const });
}

/** Runtime admission consumes only its opaque certificate; copying its claims cannot qualify. */
export function structuredFileQualificationGate(
  input: unknown,
): ProviderAdmissionResult<Readonly<{ kind: 'eligible'; manifestId: string; providerEnabled: false }>> {
  const data = fields(input, ['certificate', 'gate']);
  if (!data || !plain(data.certificate)) return fail('FC-TRUST', 'EXACT_CONFORMANCE_CERTIFICATE_REQUIRED');
  const gate = structuredFileProviderGate(data.gate);
  if (!gate.ok) return gate;
  const claims = readCertificateClaims(data.certificate);
  const snapshot = snapshotQualificationClaims(claims);
  if (
    !claims ||
    !snapshot ||
    !Object.isFrozen(claims) ||
    !Object.isFrozen(claims.subject) ||
    claims.capability !== STRUCTURED_FILE_CATALOGUE.capability ||
    claims.policyMinimum !== STRUCTURED_FILE_CATALOGUE.policyMinimum ||
    claims.resourceDigest !== STRUCTURED_FILE_CATALOGUE.resourceDigest ||
    claims.subject.providerId !== 'structured-json-file-source/v1' ||
    claims.subject.providerBuildDigest !== STRUCTURED_FILE_CATALOGUE.providerBuildDigest ||
    claims.subject.manifestDigest !== '91821429bca10e93438c9a15bb6309366ca5809f2d1cff972425adde54667a18' ||
    claims.subject.environmentDigest !== 'b880653890190d5da3ac311736401fd1fa02f2d221bee8258eae231717143536' ||
    claims.subject.recorderIdentity !== 'recorder/jig-conformance/v1'
  )
    return fail('FC-TRUST', 'EXACT_CONFORMANCE_CERTIFICATE_REQUIRED');
  return gate;
}

type StructuredFileAttempt = Readonly<{
  kind: 'start' | 'result';
  key: string;
  digest: string;
  basisDigest: string;
  certificateSubjectDigest: string;
  ordinal: number;
  deadline: number;
  observedAt: number;
  retryLimit: number;
  predecessor: string | null;
  outcome?: 'positive' | 'negative' | 'timeout' | 'exhausted';
}>;
export type StructuredFileAdmission = Readonly<{
  start(input: unknown): ProviderAdmissionResult<StructuredFileAttempt>;
  result(input: unknown): ProviderAdmissionResult<StructuredFileAttempt>;
  admit(
    input: unknown,
  ): ProviderAdmissionResult<Readonly<{ kind: 'eligible'; manifestId: string; providerEnabled: false }>>;
  readback(input: unknown): ProviderAdmissionResult<StructuredFileAttempt>;
  reachability(): ProviderAdmissionResult<Readonly<{ kind: 'unavailable'; providerEnabled: false }>>;
}>;
const CONFORMANCE_AGE_DEFAULT_MS = 86_400_000;
const CONFORMANCE_AGE_MIN_MS = 300_000;
const CONFORMANCE_AGE_MAX_MS = 2_592_000_000;
const SOURCE_WAIT_DEFAULT_MS = 900_000;
const SOURCE_WAIT_MIN_MS = 5_000;
const SOURCE_WAIT_MAX_MS = 7_200_000;
const SOURCE_RETRY_DEFAULT = 3;
const SOURCE_RETRY_MIN = 1;
const SOURCE_RETRY_MAX = 5;

/**
 * GF-020's private qualification path. The immutable preflight variants hold only
 * qualification lineage; they are not EP-SOURCE attempt storage and cannot enable a provider.
 */
export function createStructuredFileAdmission(input: unknown): StructuredFileAdmission {
  const config =
    fields(input, ['certificate', 'conformanceMaxAgeMs', 'gate', 'ledger', 'observedAt']) ??
    fields(input, ['certificate', 'gate', 'ledger', 'observedAt']);
  const ledger = config?.ledger && isScriptedLedger(config.ledger) ? config.ledger : undefined;
  const certificate = config?.certificate;
  const claims = certificate && typeof certificate === 'object' ? readCertificateClaims(certificate) : undefined;
  const gate = config && structuredFileQualificationGate({ certificate, gate: config.gate });
  const conformanceMaxAgeMs = config?.conformanceMaxAgeMs ?? CONFORMANCE_AGE_DEFAULT_MS;
  const validConformanceMaxAge =
    Number.isSafeInteger(conformanceMaxAgeMs) &&
    (conformanceMaxAgeMs as number) >= CONFORMANCE_AGE_MIN_MS &&
    (conformanceMaxAgeMs as number) <= CONFORMANCE_AGE_MAX_MS;
  const configured =
    ledger &&
    gate?.ok &&
    claims &&
    safeTime(config?.observedAt) &&
    validConformanceMaxAge &&
    config.observedAt >= (claims.subject.recordedAt as number) &&
    config.observedAt - (claims.subject.recordedAt as number) <= (conformanceMaxAgeMs as number);
  const subjectDigest = claims && digest('STRUCTURED-FILE-CONFORMANCE-SUBJECT', claims.subject);
  const basisDigest =
    configured &&
    subjectDigest &&
    digest('STRUCTURED-FILE-QUALIFICATION-BASIS', {
      certificateSubjectDigest: subjectDigest,
      capability: claims.capability,
      environment: STRUCTURED_FILE_CATALOGUE.environment,
      manifestId: STRUCTURED_FILE_CATALOGUE.manifestId,
      policyMinimum: claims.policyMinimum,
      providerBuildDigest: STRUCTURED_FILE_CATALOGUE.providerBuildDigest,
      resourceDigest: claims.resourceDigest,
      scope: STRUCTURED_FILE_CATALOGUE.scope,
    });
  const read = (ordinal: number, variant: StructuredFileAttempt['kind']): StructuredFileAttempt | undefined => {
    try {
      if (!basisDigest || !subjectDigest) return undefined;
      const response = ledger?.readPreflight(`${basisDigest}/${ordinal}`, variant);
      if (!response?.ok || 'kind' in response.value) return undefined;
      const stored = response.value;
      const names =
        variant === 'start'
          ? [
              'basisDigest',
              'certificateSubjectDigest',
              'deadline',
              'kind',
              'observedAt',
              'ordinal',
              'predecessor',
              'retryLimit',
            ]
          : [
              'basisDigest',
              'certificateSubjectDigest',
              'deadline',
              'kind',
              'observedAt',
              'ordinal',
              'outcome',
              'predecessor',
              'retryLimit',
            ];
      const bytes = fields(stored.bytes, names);
      if (
        !bytes ||
        stored.key !== `${basisDigest}/${ordinal}/${variant}` ||
        digest('PREFLIGHT-ATTEMPT', stored.bytes) !== stored.digest ||
        bytes.kind !== variant ||
        bytes.basisDigest !== basisDigest ||
        bytes.certificateSubjectDigest !== subjectDigest ||
        bytes.ordinal !== ordinal ||
        bytes.deadline !== stored.deadline ||
        !safeTime(bytes.deadline) ||
        !safeTime(bytes.observedAt) ||
        bytes.observedAt > bytes.deadline ||
        !Number.isSafeInteger(bytes.retryLimit) ||
        (bytes.retryLimit as number) < SOURCE_RETRY_MIN ||
        (bytes.retryLimit as number) > SOURCE_RETRY_MAX ||
        (variant === 'start'
          ? !(bytes.predecessor === null || safeDigest(bytes.predecessor))
          : !safeDigest(bytes.predecessor) ||
            !['positive', 'negative', 'timeout', 'exhausted'].includes(bytes.outcome as string))
      )
        return undefined;
      return freeze({ ...bytes, key: stored.key, digest: stored.digest }) as StructuredFileAttempt;
    } catch {
      return undefined;
    }
  };
  const write = (
    input: unknown,
    kind: StructuredFileAttempt['kind'],
  ): ProviderAdmissionResult<StructuredFileAttempt> => {
    if (!configured || !basisDigest || !subjectDigest) return fail('FC-AUTHORITY', 'EXACT_QUALIFICATION_REQUIRED');
    const names =
      kind === 'start'
        ? ['deadline', 'observedAt', 'ordinal', 'predecessor', 'retryLimit']
        : ['deadline', 'observedAt', 'ordinal', 'outcome', 'predecessor', 'retryLimit'];
    const data =
      fields(input, names) ??
      fields(
        input,
        names.filter((name) => name !== 'deadline' && name !== 'retryLimit'),
      );
    const deadline = data?.deadline ?? SOURCE_WAIT_DEFAULT_MS;
    const retryLimit = data?.retryLimit ?? SOURCE_RETRY_DEFAULT;
    if (
      !data ||
      !safeTime(deadline) ||
      !safeTime(data.observedAt) ||
      deadline < SOURCE_WAIT_MIN_MS ||
      deadline > SOURCE_WAIT_MAX_MS ||
      data.observedAt > deadline ||
      !Number.isSafeInteger(data.ordinal) ||
      (data.ordinal as number) < 1 ||
      !Number.isSafeInteger(retryLimit) ||
      (retryLimit as number) < SOURCE_RETRY_MIN ||
      (retryLimit as number) > SOURCE_RETRY_MAX ||
      (data.ordinal as number) > (retryLimit as number) ||
      (kind === 'start'
        ? !(data.predecessor === null || safeDigest(data.predecessor))
        : !safeDigest(data.predecessor)) ||
      (kind === 'result' && !['positive', 'negative', 'timeout', 'exhausted'].includes(data.outcome as string))
    )
      return fail('FC-INPUT', 'INVALID_STRUCTURED_FILE_QUALIFICATION_ATTEMPT');
    const ordinal = data.ordinal as number;
    const retryLimitValue = retryLimit as number;
    if (kind === 'start') {
      if (ordinal === 1 ? data.predecessor !== null : !data.predecessor)
        return fail('FC-INPUT', 'INVALID_PREFLIGHT_PREDECESSOR');
      if (ordinal > 1) {
        const predecessor = read(ordinal - 1, 'result');
        if (
          !predecessor ||
          predecessor.digest !== data.predecessor ||
          predecessor.retryLimit !== retryLimitValue ||
          data.observedAt < predecessor.observedAt ||
          predecessor.outcome === 'positive' ||
          predecessor.outcome === 'exhausted'
        )
          return fail('FC-TRUST', 'TERMINAL_PREDECESSOR_REQUIRED');
      }
    } else {
      const predecessor = read(ordinal, 'start');
      if (
        !predecessor ||
        predecessor.digest !== data.predecessor ||
        predecessor.deadline !== deadline ||
        predecessor.retryLimit !== retryLimitValue ||
        data.observedAt < predecessor.observedAt
      )
        return fail('FC-TRUST', 'START_PREDECESSOR_REQUIRED');
    }
    const bytes = freeze({
      kind,
      basisDigest,
      certificateSubjectDigest: subjectDigest,
      ordinal,
      deadline: deadline as number,
      observedAt: data.observedAt as number,
      retryLimit: retryLimitValue,
      predecessor: data.predecessor as string | null,
      ...(kind === 'result' ? { outcome: data.outcome as StructuredFileAttempt['outcome'] } : {}),
    });
    const durable = ledger?.preflight({
      key: `${basisDigest}/${ordinal}`,
      variant: kind,
      bytes: bytes as CanonicalJson,
      ...(kind === 'result' ? { predecessor: data.predecessor as string } : {}),
      deadline: deadline as number,
      observedAt: data.observedAt as number,
    });
    const committed = read(ordinal, kind);
    return durable?.ok && committed ? ok(committed) : fail('FC-TRUST', 'PREFLIGHT_STORAGE_MISMATCH');
  };
  return freeze({
    start: (attempt) => write(attempt, 'start'),
    result: (attempt) => write(attempt, 'result'),
    admit(admission) {
      const data = fields(admission, ['maxAgeMs', 'observedAt', 'proof']);
      const proofData =
        data &&
        fields(data.proof, [
          'basisDigest',
          'certificateSubjectDigest',
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
        !data ||
        !safeTime(data.maxAgeMs) ||
        data.maxAgeMs !== conformanceMaxAgeMs ||
        !safeTime(data.observedAt) ||
        !proofData ||
        !Number.isSafeInteger(proofData.ordinal)
      )
        return fail('FC-INPUT', 'INVALID_ADMISSION');
      const proof = proofData as StructuredFileAttempt;
      const stored = read(proof.ordinal, 'result');
      if (!stored || !same(proof, stored) || stored.outcome !== 'positive')
        return fail('FC-AUTHORITY', 'POSITIVE_EXACT_PROOF_REQUIRED');
      if (data.observedAt < stored.observedAt || data.observedAt - stored.observedAt > data.maxAgeMs)
        return fail('FC-AUTHORITY', 'STALE_OR_MISMATCHED_PROOF');
      return ok({
        kind: 'eligible',
        manifestId: STRUCTURED_FILE_CATALOGUE.manifestId,
        providerEnabled: false as const,
      });
    },
    readback(request) {
      const data = fields(request, ['ordinal', 'variant']);
      const committed =
        data &&
        Number.isSafeInteger(data.ordinal) &&
        (data.ordinal as number) >= 1 &&
        (data.variant === 'start' || data.variant === 'result')
          ? read(data.ordinal as number, data.variant)
          : undefined;
      return committed ? ok(committed) : fail('FC-TRUST', 'ATTEMPT_ABSENT');
    },
    reachability: () => ok({ kind: 'unavailable', providerEnabled: false as const }),
  });
}
