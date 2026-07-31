import { type CanonicalJson, decodeFrame, stageDigest } from '@agentic-workflow-kit/jig-codec';
import { composeEnvelope, type EnvelopeProposal } from './envelope.js';
import {
  type IntakeReadback,
  type IntakeResult,
  isScriptedLedger,
  type LedgerFailure,
  type LedgerResult,
  type ScriptedLedger,
} from './ledger.js';

export const DEVELOPMENT_PRE_RUN_VERSION = 'jig.development-pre-run.v1';

type Failure = Readonly<{ family: 'FC-INPUT' | 'FC-AUTHORITY' | 'FC-TRUST'; code: string }>;
type Result<T> = Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; error: Failure | LedgerFailure }>;
type Scope = Readonly<{ phase: 3; purpose: 'development-only' }>;
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
  scopeDigest: string;
  compositionDigest: string;
  proposal: EnvelopeProposal;
}>;
export type DevelopmentApproval = Readonly<{
  kind: 'proposal-approved' | 'provider-manifest-approved';
  principal: 'principal/arye';
  subjectDigest: string;
  scopeDigest: string;
  approvalDigest: string;
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

type ApprovalBinding = Readonly<{
  proposalApprovals: WeakSet<object>;
  manifestApprovals: WeakSet<object>;
}>;

const issuedPreviews = new WeakSet<object>();
const approvalVerifiers = new WeakMap<object, ApprovalBinding>();
const claimedApprovalVerifiers = new WeakSet<object>();

export function createDevelopmentApprovalAuthority(): Readonly<{
  consumer: DevelopmentApprovalConsumer;
  verifier: DevelopmentApprovalVerifier;
}> {
  const proposalApprovals = new WeakSet<object>();
  const manifestApprovals = new WeakSet<object>();
  const approvalsByDigest = new Map<string, DevelopmentApproval>();

  const approve = (input: unknown, kind: DevelopmentApproval['kind']): Result<DevelopmentApproval> => {
    const data = fields(input, ['preview']);
    if (typeof data?.preview !== 'object' || data.preview === null || !issuedPreviews.has(data.preview))
      return fail('FC-AUTHORITY', 'EXACT_ARYE_PREVIEW_REQUIRED');
    const preview = data.preview as DevelopmentPreview;
    const subjectDigest = kind === 'proposal-approved' ? preview.proposalDigest : preview.manifestDigest;
    const approvalDigest = staged('DEVELOPMENT-OWNER-APPROVAL', {
      kind,
      principal: 'principal/arye',
      subjectDigest,
      scopeDigest: preview.scopeDigest,
    });
    if (!approvalDigest) return fail('FC-INPUT', 'INVALID_APPROVAL');
    const existing = approvalsByDigest.get(approvalDigest);
    if (existing) return ok(existing);
    const approval = freeze({
      kind,
      principal: 'principal/arye' as const,
      subjectDigest,
      scopeDigest: preview.scopeDigest,
      approvalDigest,
    });
    approvalsByDigest.set(approvalDigest, approval);
    (kind === 'proposal-approved' ? proposalApprovals : manifestApprovals).add(approval);
    return ok(approval);
  };

  const verifier = freeze({}) as DevelopmentApprovalVerifier;
  approvalVerifiers.set(verifier, freeze({ proposalApprovals, manifestApprovals }));
  return freeze({
    consumer: freeze({
      approveProposal: (input: unknown) => approve(input, 'proposal-approved'),
      approveProviderManifest: (input: unknown) => approve(input, 'provider-manifest-approved'),
    }),
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
  const approvalBinding =
    ledger && verifier && availableBinding && !claimedApprovalVerifiers.has(verifier) ? availableBinding : undefined;
  if (verifier && approvalBinding) claimedApprovalVerifiers.add(verifier);
  const previews = new WeakSet<object>();
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
        scopeDigest,
        compositionDigest,
        proposal: proposal.value,
      });
      previewsByDigest.set(compositionDigest, preview);
      previews.add(preview);
      issuedPreviews.add(preview);
      return ok(preview);
    },
    submit(input) {
      if (!ledger) return fail('FC-TRUST', 'SCRIPTED_LEDGER_REQUIRED');
      const accepted = fields(input, ['manifestApproval', 'preview', 'proposalApproval', 'terminalAck']);
      const withCut = fields(input, ['manifestApproval', 'preview', 'proposalApproval', 'successorCut', 'terminalAck']);
      const data = accepted ?? withCut;
      if (!data) return fail('FC-AUTHORITY', 'EXACT_DEVELOPMENT_APPROVALS_REQUIRED');
      if (
        (data.terminalAck !== 'accepted' && data.terminalAck !== 'rejected') ||
        (data.terminalAck === 'rejected' && data.successorCut !== undefined) ||
        (data.successorCut !== undefined &&
          (typeof data.successorCut !== 'string' || data.successorCut.length === 0 || data.successorCut.length > 512))
      )
        return fail('FC-INPUT', 'INVALID_INTAKE');
      if (
        typeof data.preview !== 'object' ||
        data.preview === null ||
        !previews.has(data.preview) ||
        typeof data.proposalApproval !== 'object' ||
        data.proposalApproval === null ||
        !approvalBinding?.proposalApprovals.has(data.proposalApproval) ||
        typeof data.manifestApproval !== 'object' ||
        data.manifestApproval === null ||
        !approvalBinding.manifestApprovals.has(data.manifestApproval)
      )
        return fail('FC-AUTHORITY', 'EXACT_DEVELOPMENT_APPROVALS_REQUIRED');
      const preview = data.preview as DevelopmentPreview;
      const proposalApproval = data.proposalApproval as DevelopmentApproval;
      const manifestApproval = data.manifestApproval as DevelopmentApproval;
      if (
        proposalApproval.kind !== 'proposal-approved' ||
        proposalApproval.subjectDigest !== preview.proposalDigest ||
        proposalApproval.scopeDigest !== preview.scopeDigest ||
        manifestApproval.kind !== 'provider-manifest-approved' ||
        manifestApproval.subjectDigest !== preview.manifestDigest ||
        manifestApproval.scopeDigest !== preview.scopeDigest
      )
        return fail('FC-AUTHORITY', 'EXACT_DEVELOPMENT_APPROVALS_REQUIRED');
      const acknowledgementDigest = staged('DEVELOPMENT-INTAKE-ACKNOWLEDGEMENT', {
        compositionDigest: preview.compositionDigest,
        proposalApprovalDigest: proposalApproval.approvalDigest,
        manifestApprovalDigest: manifestApproval.approvalDigest,
        terminalAck: data.terminalAck as 'accepted' | 'rejected',
        successorCut: (data.successorCut as string | undefined) ?? null,
      });
      if (!acknowledgementDigest) return fail('FC-INPUT', 'INVALID_INTAKE_ACKNOWLEDGEMENT');
      return ledger.intake({
        compositionDigest: preview.compositionDigest,
        acknowledgementDigest,
        terminalAck: data.terminalAck as 'accepted' | 'rejected',
        ...(data.successorCut ? { successorCut: data.successorCut as string } : {}),
      });
    },
    readback(compositionDigest) {
      return ledger
        ? ledger.readIntake(compositionDigest)
        : { ok: false, error: { family: 'FC-TRUST', code: 'SCRIPTED_LEDGER_REQUIRED' } };
    },
  });
}
