import { type CanonicalJson, decodeFrame, encodeFrame, stageDigest } from '@agentic-workflow-kit/jig-codec';
import {
  createPreRunApproval,
  type DevelopmentApprovalScope,
  isPreRunApprovalRepository,
  type PreRunApproval,
  type PreRunApprovalRepository,
  validatePreRunApproval,
} from './approval-repository.js';
import { composeEnvelope, type EnvelopeProposal, validateEnvelopeProposal } from './envelope.js';
import { commitScriptedIntake } from './intake-commit.js';
import {
  type IntakeReadback,
  type IntakeResult,
  type IntakeSuccessorCut,
  isScriptedLedger,
  type LedgerFailure,
  type LedgerResult,
  type ScriptedLedger,
} from './ledger.js';

export const DEVELOPMENT_PRE_RUN_VERSION = 'jig.development-pre-run.v1';

type Failure = Readonly<{ family: 'FC-INPUT' | 'FC-AUTHORITY' | 'FC-TRUST'; code: string }>;
type Result<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: Failure | LedgerFailure }>;
type Scope = DevelopmentApprovalScope;
type ProviderManifest = Readonly<{
  manifestId: string;
  manifestDigest: string;
  scope: Scope;
}>;
export type DevelopmentPreview = Readonly<{
  version: typeof DEVELOPMENT_PRE_RUN_VERSION;
  posture: 'development-semantic-only';
  recovery: 'fail-closed-no-autonomous-restore';
  providerEnabled: false;
  dispatchEnabled: false;
  proposalDigest: string;
  manifestId: string;
  manifestDigest: string;
  providerManifestBytes: readonly number[];
  scope: Scope;
  scopeDigest: string;
  compositionDigest: string;
  proposal: EnvelopeProposal;
}>;
export type DevelopmentApproval = PreRunApproval;
export type DevelopmentApprovedEnvelope = Readonly<{
  version: typeof DEVELOPMENT_PRE_RUN_VERSION;
  posture: 'development-semantic-only';
  recovery: 'fail-closed-no-autonomous-restore';
  providerEnabled: false;
  dispatchEnabled: false;
  proposalDigest: string;
  manifestId: string;
  manifestDigest: string;
  providerManifestBytes: readonly number[];
  scope: Scope;
  scopeDigest: string;
  compositionDigest: string;
  proposal: EnvelopeProposal;
  proposalApproval: DevelopmentApproval;
  manifestApproval: DevelopmentApproval;
}>;
declare const developmentAryePrincipalBrand: unique symbol;
export type DevelopmentAryePrincipal = Readonly<{
  readonly [developmentAryePrincipalBrand]: 'principal/arye';
}>;
declare const developmentApprovalVerifierBrand: unique symbol;
export type DevelopmentApprovalVerifier = Readonly<{
  readonly [developmentApprovalVerifierBrand]: 'development-approval-verifier';
}>;
export type DevelopmentApprovalConsumer = Readonly<{
  approveProposal(input: unknown): Result<DevelopmentApproval>;
  approveProviderManifest(input: unknown): Result<DevelopmentApproval>;
}>;

type DevelopmentPreRun = Readonly<{
  preview(input: unknown): Result<DevelopmentPreview>;
  submit(input: unknown): Result<IntakeResult>;
  readback(compositionDigest: string): LedgerResult<IntakeReadback>;
}>;

const freeze = <T>(value: T): T => Object.freeze(value);
const ok = <T>(value: T): Result<T> => freeze({ ok: true, value: freeze(value) });
const fail = (family: Failure['family'], code: string): Result<never> =>
  freeze({ ok: false, error: freeze({ family, code }) });

function fields(value: unknown, names: readonly string[]): Record<string, unknown> | undefined {
  try {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return undefined;
    const keys = Reflect.ownKeys(value);
    const expected = [...names].sort();
    if (
      keys.some((key) => typeof key !== 'string') ||
      keys.length !== expected.length ||
      [...keys].sort().some((key, index) => key !== expected[index])
    )
      return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (!names.every((name) => descriptors[name]?.enumerable && 'value' in descriptors[name])) return undefined;
    return Object.fromEntries(names.map((name) => [name, descriptors[name].value]));
  } catch {
    return undefined;
  }
}

function staged(domain: string, value: CanonicalJson): string | undefined {
  const result = stageDigest({ domain, excludePaths: [], value });
  return result.ok ? result.value.digest : undefined;
}

function exactBytes(value: readonly number[]): string {
  return value.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizeSuccessorCut(value: unknown): IntakeSuccessorCut | undefined {
  try {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return undefined;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== 3 || keys.some((key) => typeof key !== 'string')) return undefined;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const predecessorRun = descriptors.predecessorRun;
    const cutPosition = descriptors.position;
    const cutDigest = descriptors.digest;
    if (
      !predecessorRun?.enumerable ||
      !('value' in predecessorRun) ||
      !cutPosition?.enumerable ||
      !('value' in cutPosition) ||
      !cutDigest?.enumerable ||
      !('value' in cutDigest) ||
      typeof predecessorRun.value !== 'string' ||
      !/^run-[0-9]{12}-[0-9a-f]{16}$/u.test(predecessorRun.value) ||
      !Number.isSafeInteger(cutPosition.value) ||
      cutPosition.value < 0 ||
      typeof cutDigest.value !== 'string' ||
      !/^[0-9a-f]{64}$/u.test(cutDigest.value)
    )
      return undefined;
    return freeze({ predecessorRun: predecessorRun.value, position: cutPosition.value, digest: cutDigest.value });
  } catch {
    return undefined;
  }
}

function sameCanonical(left: unknown, right: unknown): boolean {
  const leftFrame = encodeFrame(left as CanonicalJson);
  const rightFrame = encodeFrame(right as CanonicalJson);
  return (
    leftFrame.ok &&
    rightFrame.ok &&
    leftFrame.value.length === rightFrame.value.length &&
    leftFrame.value.every((byte, index) => byte === rightFrame.value[index])
  );
}

function manifestFrame(value: unknown): Uint8Array | undefined {
  try {
    if (
      typeof value !== 'object' ||
      value === null ||
      !Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Array.prototype
    )
      return undefined;
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
    const length = lengthDescriptor?.value;
    if (!lengthDescriptor || !Number.isSafeInteger(length) || length < 1 || length > 65_536) return undefined;
    const keys = Reflect.ownKeys(value);
    if (
      keys.length !== length + 1 ||
      keys.some((key) => key !== 'length' && (typeof key !== 'string' || !/^\d+$/u.test(key)))
    )
      return undefined;
    const bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (
        !descriptor?.enumerable ||
        !('value' in descriptor) ||
        !Number.isInteger(descriptor.value) ||
        descriptor.value < 0 ||
        descriptor.value > 255
      )
        return undefined;
      bytes[index] = descriptor.value;
    }
    return bytes;
  } catch {
    return undefined;
  }
}

function validPreview(input: unknown): DevelopmentPreview | undefined {
  const data = fields(input, [
    'compositionDigest',
    'dispatchEnabled',
    'manifestDigest',
    'manifestId',
    'posture',
    'proposal',
    'proposalDigest',
    'providerManifestBytes',
    'providerEnabled',
    'recovery',
    'scope',
    'scopeDigest',
    'version',
  ]);
  const proposal = data && validateEnvelopeProposal(data.proposal);
  const providerManifestBytes = data && manifestFrame(data.providerManifestBytes);
  const providerManifest = providerManifestBytes && manifest(providerManifestBytes);
  const previewScope = data && fields(data.scope, ['phase', 'purpose']);
  const scopeDigest = previewScope && staged('DEVELOPMENT-PROVIDER-SCOPE', previewScope as CanonicalJson);
  if (
    !data ||
    !proposal?.ok ||
    !previewScope ||
    previewScope.phase !== 3 ||
    previewScope.purpose !== 'development-only' ||
    data.version !== DEVELOPMENT_PRE_RUN_VERSION ||
    data.posture !== 'development-semantic-only' ||
    data.recovery !== 'fail-closed-no-autonomous-restore' ||
    data.providerEnabled !== false ||
    data.dispatchEnabled !== false ||
    typeof data.proposalDigest !== 'string' ||
    data.proposalDigest !== proposal.value.proposalDigest ||
    !providerManifest ||
    typeof data.manifestDigest !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(data.manifestDigest) ||
    data.manifestId !== `provider/development/authority/${data.manifestDigest}` ||
    providerManifest.manifestDigest !== data.manifestDigest ||
    providerManifest.manifestId !== data.manifestId ||
    data.scopeDigest !== scopeDigest
  )
    return undefined;
  const proposalDigest = data.proposalDigest as string;
  const manifestDigest = data.manifestDigest as string;
  const manifestId = data.manifestId as string;
  const previewScopeValue = freeze({ phase: 3 as const, purpose: 'development-only' as const });
  const compositionDigest =
    scopeDigest &&
    staged('DEVELOPMENT-COMPOSITION', {
      version: DEVELOPMENT_PRE_RUN_VERSION,
      posture: 'development-semantic-only',
      recovery: 'fail-closed-no-autonomous-restore',
      proposalDigest,
      manifestId,
      manifestDigest,
      scopeDigest,
    });
  if (!scopeDigest || !compositionDigest || data.compositionDigest !== compositionDigest) return undefined;
  return freeze({
    version: DEVELOPMENT_PRE_RUN_VERSION,
    posture: 'development-semantic-only' as const,
    recovery: 'fail-closed-no-autonomous-restore' as const,
    providerEnabled: false as const,
    dispatchEnabled: false as const,
    proposalDigest,
    manifestId,
    manifestDigest,
    providerManifestBytes: freeze(Array.from(providerManifestBytes)),
    scope: previewScopeValue,
    scopeDigest,
    compositionDigest,
    proposal: proposal.value,
  });
}

function approvedEnvelope(
  previewInput: unknown,
  proposalApprovalInput: unknown,
  manifestApprovalInput: unknown,
): DevelopmentApprovedEnvelope | undefined {
  const preview = validPreview(previewInput);
  const proposalApproval = validatePreRunApproval(proposalApprovalInput);
  const manifestApproval = validatePreRunApproval(manifestApprovalInput);
  if (!preview || !proposalApproval.ok || !manifestApproval.ok) return undefined;
  if (
    proposalApproval.value.kind !== 'proposal-approved' ||
    proposalApproval.value.subjectDigest !== preview.proposalDigest ||
    proposalApproval.value.scopeDigest !== preview.scopeDigest ||
    !sameCanonical(proposalApproval.value.scope, preview.scope) ||
    manifestApproval.value.kind !== 'provider-manifest-approved' ||
    manifestApproval.value.subjectDigest !== preview.manifestDigest ||
    manifestApproval.value.scopeDigest !== preview.scopeDigest ||
    !sameCanonical(manifestApproval.value.scope, preview.scope)
  )
    return undefined;
  const compositionDigest = staged('DEVELOPMENT-COMPOSITION', {
    version: DEVELOPMENT_PRE_RUN_VERSION,
    posture: 'development-semantic-only',
    recovery: 'fail-closed-no-autonomous-restore',
    proposalDigest: preview.proposalDigest,
    proposalApproval: proposalApproval.value,
    manifestId: preview.manifestId,
    manifestDigest: preview.manifestDigest,
    manifestApproval: manifestApproval.value,
    scope: preview.scope,
    scopeDigest: preview.scopeDigest,
  });
  return compositionDigest
    ? freeze({
        version: DEVELOPMENT_PRE_RUN_VERSION,
        posture: 'development-semantic-only',
        recovery: 'fail-closed-no-autonomous-restore',
        providerEnabled: false,
        dispatchEnabled: false,
        proposalDigest: preview.proposalDigest,
        manifestId: preview.manifestId,
        manifestDigest: preview.manifestDigest,
        providerManifestBytes: preview.providerManifestBytes,
        scope: preview.scope,
        scopeDigest: preview.scopeDigest,
        compositionDigest,
        proposal: preview.proposal,
        proposalApproval: proposalApproval.value,
        manifestApproval: manifestApproval.value,
      })
    : undefined;
}

export function composeApprovedDevelopmentEnvelope(input: unknown): Result<DevelopmentApprovedEnvelope> {
  const data = fields(input, ['manifestApproval', 'preview', 'proposalApproval']);
  if (!data) return fail('FC-AUTHORITY', 'EXACT_DEVELOPMENT_APPROVALS_REQUIRED');
  const envelope = approvedEnvelope(data.preview, data.proposalApproval, data.manifestApproval);
  return envelope ? ok(envelope) : fail('FC-AUTHORITY', 'EXACT_DEVELOPMENT_APPROVALS_REQUIRED');
}

function empty(value: unknown): boolean {
  return Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype && value.length === 0;
}

function manifest(value: unknown): ProviderManifest | undefined {
  try {
    if (!(value instanceof Uint8Array)) return undefined;
    const decoded = decodeFrame(value);
    if (!decoded.ok) return undefined;
    const data = fields(decoded.value, [
      'credentialAuthority',
      'dispatchEnabled',
      'externalServiceAuthority',
      'filesystemAuthority',
      'lineage',
      'manifestVersion',
      'nativePermissionPostures',
      'networkAuthority',
      'providerEnabled',
      'providerIdentity',
      'recovery',
      'runtimeAuthority',
      'scope',
      'subprocessAuthority',
    ]);
    const lineage = data && fields(data.lineage, ['kind']);
    const runtimeAuthority = data && fields(data.runtimeAuthority, ['kind']);
    const scope = data && fields(data.scope, ['phase', 'purpose']);
    if (
      !data ||
      !lineage ||
      !runtimeAuthority ||
      !scope ||
      data.manifestVersion !== 'provider-authority/v1' ||
      data.providerIdentity !== 'development-semantic-only/v1' ||
      data.providerEnabled !== false ||
      data.dispatchEnabled !== false ||
      data.recovery !== 'fail-closed-no-autonomous-restore' ||
      runtimeAuthority.kind !== 'in-process-pure-fixture' ||
      lineage.kind !== 'genesis' ||
      scope.phase !== 3 ||
      scope.purpose !== 'development-only' ||
      !empty(data.credentialAuthority) ||
      !empty(data.externalServiceAuthority) ||
      !empty(data.filesystemAuthority) ||
      !empty(data.nativePermissionPostures) ||
      !empty(data.networkAuthority) ||
      !empty(data.subprocessAuthority)
    )
      return undefined;
    const manifestDigest = staged('DEVELOPMENT-PROVIDER-MANIFEST', decoded.value);
    if (!manifestDigest) return undefined;
    return freeze({
      manifestId: `provider/development/authority/${manifestDigest}`,
      manifestDigest,
      scope: freeze({ phase: 3, purpose: 'development-only' }),
    });
  } catch {
    return undefined;
  }
}

type ApprovalBinding = Readonly<{ repository: PreRunApprovalRepository }>;
const approvalVerifiers = new WeakMap<object, ApprovalBinding>();

export function createDevelopmentApprovalAuthority(input: unknown): Readonly<{
  consumer: DevelopmentApprovalConsumer;
  principal: DevelopmentAryePrincipal;
  verifier: DevelopmentApprovalVerifier;
}> {
  const config = fields(input, ['repository']);
  const repository = config?.repository;
  const boundRepository = isPreRunApprovalRepository(repository) ? repository : undefined;
  const principal = freeze({}) as DevelopmentAryePrincipal;

  const approve = (input: unknown, kind: DevelopmentApproval['kind']): Result<DevelopmentApproval> => {
    const data = fields(input, ['principal', 'preview']);
    if (!boundRepository || data?.principal !== principal) return fail('FC-AUTHORITY', 'EXACT_ARYE_PREVIEW_REQUIRED');
    const preview = validPreview(data.preview);
    if (!preview) return fail('FC-AUTHORITY', 'EXACT_ARYE_PREVIEW_REQUIRED');
    const created = createPreRunApproval({
      kind,
      principal: 'principal/arye',
      subjectDigest: kind === 'proposal-approved' ? preview.proposalDigest : preview.manifestDigest,
      scope: preview.scope,
    });
    if (!created.ok) return created;
    try {
      return boundRepository.createIfAbsent(created.value);
    } catch {
      return fail('FC-TRUST', 'APPROVAL_STORAGE_UNAVAILABLE');
    }
  };

  const verifier = freeze({}) as DevelopmentApprovalVerifier;
  if (boundRepository) approvalVerifiers.set(verifier, freeze({ repository: boundRepository }));
  return freeze({
    consumer: freeze({
      approveProposal: (input: unknown) => approve(input, 'proposal-approved'),
      approveProviderManifest: (input: unknown) => approve(input, 'provider-manifest-approved'),
    }),
    principal,
    verifier,
  });
}

export function createDevelopmentPreRun(input: unknown): DevelopmentPreRun {
  const config = fields(input, ['approvalVerifier', 'ledger']);
  const ledger: ScriptedLedger | undefined = config && isScriptedLedger(config.ledger) ? config.ledger : undefined;
  const verifier =
    config && typeof config.approvalVerifier === 'object' && config.approvalVerifier !== null
      ? config.approvalVerifier
      : undefined;
  const availableBinding = verifier ? approvalVerifiers.get(verifier) : undefined;
  const approvalBinding = ledger && verifier && availableBinding ? availableBinding : undefined;
  const previewsByDigest = new Map<string, DevelopmentPreview>();

  return freeze({
    preview(input) {
      if (!ledger) return fail('FC-TRUST', 'SCRIPTED_LEDGER_REQUIRED');
      const data = fields(input, ['envelope', 'providerManifestBytes']);
      const providerManifest = data && manifest(data.providerManifestBytes);
      const proposal = data && composeEnvelope(data.envelope);
      if (!data || !providerManifest || !proposal?.ok) return fail('FC-INPUT', 'INVALID_DEVELOPMENT_PREVIEW');
      const scopeDigest = staged('DEVELOPMENT-PROVIDER-SCOPE', providerManifest.scope);
      const compositionDigest =
        scopeDigest &&
        staged('DEVELOPMENT-COMPOSITION', {
          version: DEVELOPMENT_PRE_RUN_VERSION,
          posture: 'development-semantic-only',
          recovery: 'fail-closed-no-autonomous-restore',
          proposalDigest: proposal.value.proposalDigest,
          manifestId: providerManifest.manifestId,
          manifestDigest: providerManifest.manifestDigest,
          scopeDigest,
        });
      if (!scopeDigest || !compositionDigest) return fail('FC-INPUT', 'INVALID_DEVELOPMENT_PREVIEW');
      const existing = previewsByDigest.get(compositionDigest);
      if (existing) return ok(existing);
      const preview: DevelopmentPreview = freeze({
        version: DEVELOPMENT_PRE_RUN_VERSION,
        posture: 'development-semantic-only' as const,
        recovery: 'fail-closed-no-autonomous-restore' as const,
        providerEnabled: false as const,
        dispatchEnabled: false as const,
        proposalDigest: proposal.value.proposalDigest,
        manifestId: providerManifest.manifestId,
        manifestDigest: providerManifest.manifestDigest,
        providerManifestBytes: freeze(Array.from(data.providerManifestBytes as Uint8Array)),
        scope: providerManifest.scope,
        scopeDigest,
        compositionDigest,
        proposal: proposal.value,
      });
      previewsByDigest.set(compositionDigest, preview);
      return ok(preview);
    },
    submit(input) {
      if (!ledger) return fail('FC-TRUST', 'SCRIPTED_LEDGER_REQUIRED');
      const accepted = fields(input, ['manifestApproval', 'preview', 'proposalApproval', 'terminalAck']);
      const withCut = fields(input, ['manifestApproval', 'preview', 'proposalApproval', 'successorCut', 'terminalAck']);
      const data = accepted ?? withCut;
      if (!data) return fail('FC-AUTHORITY', 'EXACT_DEVELOPMENT_APPROVALS_REQUIRED');
      const suppliedSuccessorCut = data.successorCut;
      const successorCut = normalizeSuccessorCut(suppliedSuccessorCut);
      if (
        (data.terminalAck !== 'accepted' && data.terminalAck !== 'rejected') ||
        (data.terminalAck === 'rejected' && suppliedSuccessorCut !== undefined) ||
        (suppliedSuccessorCut !== undefined && successorCut === undefined)
      )
        return fail('FC-INPUT', 'INVALID_INTAKE');
      if (!approvalBinding) return fail('FC-AUTHORITY', 'EXACT_DEVELOPMENT_APPROVALS_REQUIRED');
      const preview = validPreview(data.preview);
      const proposalApproval = validatePreRunApproval(data.proposalApproval);
      const manifestApproval = validatePreRunApproval(data.manifestApproval);
      if (!preview || !proposalApproval.ok || !manifestApproval.ok)
        return fail('FC-AUTHORITY', 'EXACT_DEVELOPMENT_APPROVALS_REQUIRED');
      let storedProposal: ReturnType<PreRunApprovalRepository['read']>;
      let storedManifest: ReturnType<PreRunApprovalRepository['read']>;
      try {
        storedProposal = approvalBinding.repository.read(proposalApproval.value.key);
        storedManifest = approvalBinding.repository.read(manifestApproval.value.key);
      } catch {
        return fail('FC-TRUST', 'APPROVAL_STORAGE_UNAVAILABLE');
      }
      if (
        !storedProposal.ok ||
        !storedManifest.ok ||
        !sameCanonical(storedProposal.value, proposalApproval.value) ||
        !sameCanonical(storedManifest.value, manifestApproval.value)
      )
        return fail('FC-TRUST', 'EXACT_APPROVAL_READBACK_REQUIRED');
      const approvedResult = composeApprovedDevelopmentEnvelope({
        preview,
        proposalApproval: storedProposal.value,
        manifestApproval: storedManifest.value,
      });
      if (!approvedResult.ok) return approvedResult;
      const approved = approvedResult.value;
      if (preview.proposalDigest !== approved.proposalDigest || preview.manifestDigest !== approved.manifestDigest)
        return fail('FC-AUTHORITY', 'EXACT_DEVELOPMENT_APPROVALS_REQUIRED');
      const cutClaimContent = successorCut
        ? {
            schema: 'jig.intake-cut-claim.v1',
            key: successorCut,
            acknowledgementKey: approved.compositionDigest,
          }
        : undefined;
      const cutClaimDigest = cutClaimContent && staged('DEVELOPMENT-INTAKE-CUT-CLAIM', cutClaimContent);
      const acknowledgementContent = {
        schema: 'jig.intake-ack.v1',
        compositionDigest: approved.compositionDigest,
        envelope: {
          version: approved.version,
          posture: approved.posture,
          recovery: approved.recovery,
          providerEnabled: approved.providerEnabled,
          dispatchEnabled: approved.dispatchEnabled,
          proposalDigest: approved.proposalDigest,
          manifestId: approved.manifestId,
          manifestDigest: approved.manifestDigest,
          providerManifestBytesHex: exactBytes(approved.providerManifestBytes),
          scope: approved.scope,
          scopeDigest: approved.scopeDigest,
          compositionDigest: approved.compositionDigest,
          proposal: approved.proposal,
        },
        proposalApproval: approved.proposalApproval,
        manifestApproval: approved.manifestApproval,
        terminalAck: data.terminalAck as 'accepted' | 'rejected',
        cutClaim: cutClaimContent ? { key: successorCut, contentDigest: cutClaimDigest as string } : null,
      };
      const acknowledgementCanonical = acknowledgementContent as unknown as CanonicalJson;
      const acknowledgementDigest = staged('DEVELOPMENT-INTAKE-ACKNOWLEDGEMENT', acknowledgementCanonical);
      const acknowledgementFrame = encodeFrame(acknowledgementCanonical);
      const cutClaimFrame = cutClaimContent && encodeFrame(cutClaimContent as CanonicalJson);
      if (
        !acknowledgementDigest ||
        !acknowledgementFrame.ok ||
        (cutClaimContent && (!cutClaimDigest || !cutClaimFrame?.ok))
      ) {
        return fail('FC-INPUT', 'INVALID_INTAKE_ACKNOWLEDGEMENT');
      }
      return commitScriptedIntake(ledger, {
        compositionDigest: approved.compositionDigest,
        acknowledgementDigest,
        terminalAck: data.terminalAck as 'accepted' | 'rejected',
        acknowledgementBytes: freeze(Array.from(acknowledgementFrame.value)),
        ...(successorCut
          ? {
              successorCut,
              cutClaimBytes: freeze(Array.from((cutClaimFrame as { ok: true; value: Uint8Array }).value)),
            }
          : {}),
      });
    },
    readback(compositionDigest) {
      return ledger
        ? ledger.readIntake(compositionDigest)
        : { ok: false, error: { family: 'FC-TRUST', code: 'SCRIPTED_LEDGER_REQUIRED' } };
    },
  });
}
