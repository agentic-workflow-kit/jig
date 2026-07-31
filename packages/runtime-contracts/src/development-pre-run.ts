import { type CanonicalJson, stageDigest } from '@agentic-workflow-kit/jig-codec';
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

type DevelopmentPreRun = Readonly<{
  preview(input: unknown): Result<DevelopmentPreview>;
  approveProposal(input: unknown): Result<DevelopmentApproval>;
  approveProviderManifest(input: unknown): Result<DevelopmentApproval>;
  submit(input: unknown): Result<IntakeResult>;
  readback(compositionDigest: string): LedgerResult<IntakeReadback>;
}>;

const DIGEST = /^[0-9a-f]{64}$/u;
const MANIFEST_ID = /^provider\/[a-z0-9][a-z0-9/-]{0,255}$/u;
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

function manifest(value: unknown): ProviderManifest | undefined {
  const data = fields(value, ['manifestDigest', 'manifestId', 'scope']);
  const scope = data && fields(data.scope, ['phase', 'purpose']);
  if (
    !data ||
    !scope ||
    typeof data.manifestId !== 'string' ||
    !MANIFEST_ID.test(data.manifestId) ||
    typeof data.manifestDigest !== 'string' ||
    !DIGEST.test(data.manifestDigest) ||
    scope.phase !== 3 ||
    scope.purpose !== 'development-only'
  )
    return undefined;
  return freeze({
    manifestId: data.manifestId,
    manifestDigest: data.manifestDigest,
    scope: freeze({ phase: 3, purpose: 'development-only' }),
  });
}

export function createDevelopmentPreRun(input: unknown): DevelopmentPreRun {
  const config = fields(input, ['ledger']);
  const ledger: ScriptedLedger | undefined = config && isScriptedLedger(config.ledger) ? config.ledger : undefined;
  const previews = new WeakSet<object>();
  const proposalApprovals = new WeakSet<object>();
  const manifestApprovals = new WeakSet<object>();
  const previewsByDigest = new Map<string, DevelopmentPreview>();
  const approvalsByDigest = new Map<string, DevelopmentApproval>();

  const approve = (input: unknown, kind: DevelopmentApproval['kind']): Result<DevelopmentApproval> => {
    const data = fields(input, ['preview', 'principal']);
    if (
      data?.principal !== 'principal/arye' ||
      typeof data.preview !== 'object' ||
      data.preview === null ||
      !previews.has(data.preview)
    )
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

  return freeze({
    preview(input) {
      if (!ledger) return fail('FC-TRUST', 'SCRIPTED_LEDGER_REQUIRED');
      const data = fields(input, ['envelope', 'providerManifest']);
      const providerManifest = data && manifest(data.providerManifest);
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
      return ok(preview);
    },
    approveProposal: (input) => approve(input, 'proposal-approved'),
    approveProviderManifest: (input) => approve(input, 'provider-manifest-approved'),
    submit(input) {
      if (!ledger) return fail('FC-TRUST', 'SCRIPTED_LEDGER_REQUIRED');
      const accepted = fields(input, ['manifestApproval', 'preview', 'proposalApproval', 'terminalAck']);
      const withCut = fields(input, ['manifestApproval', 'preview', 'proposalApproval', 'successorCut', 'terminalAck']);
      const data = accepted ?? withCut;
      if (
        !data ||
        typeof data.preview !== 'object' ||
        data.preview === null ||
        !previews.has(data.preview) ||
        typeof data.proposalApproval !== 'object' ||
        data.proposalApproval === null ||
        !proposalApprovals.has(data.proposalApproval) ||
        typeof data.manifestApproval !== 'object' ||
        data.manifestApproval === null ||
        !manifestApprovals.has(data.manifestApproval) ||
        (data.terminalAck !== 'accepted' && data.terminalAck !== 'rejected') ||
        (data.terminalAck === 'rejected' && data.successorCut !== undefined) ||
        (data.successorCut !== undefined &&
          (typeof data.successorCut !== 'string' || data.successorCut.length === 0 || data.successorCut.length > 512))
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
