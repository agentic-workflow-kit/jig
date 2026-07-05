import type {
  AgentPort,
  CapabilityAttestation,
  ConfigDoc,
  ExecutionHostPort,
  ForgePort,
  PlanInstance,
  PolicyDoc,
  RunEvent,
  RunStatus,
  WorkSourcePort,
} from '@agentic-workflow-kit/jig-sdk';
import { LocalHarness, PlanValidator } from '@agentic-workflow-kit/jig-sdk';

export const CONFORMANCE_BASIS_TOKENS = [
  'interface-shape',
  'specified-response',
  'observed-behavior',
  'self-report-only',
] as const;

export type ConformanceBasisToken = (typeof CONFORMANCE_BASIS_TOKENS)[number];

export type ConformanceFindingCode =
  | `agent-privileged-method:${string}`
  | 'host-isolation-overstated'
  | 'host-isolation-self-report-only'
  | 'work-source-provenance-collapsed'
  | 'work-source-plan-intake-bypass'
  | 'work-source-direct-harness-bypass-accepted'
  | 'manifest-capability-overreach'
  | 'substrate-escalation'
  | 'resume-attestation-drift'
  | 'forge-unknown-action-accepted'
  | 'forge-resume-double-apply'
  | 'forge-unredacted-credential';

export interface ProviderConformanceVerdict {
  finding: ConformanceFindingCode;
  basis: ConformanceBasisToken;
}

export interface ProviderManifest {
  id: string;
  network: 'none' | 'declared';
  credentials: 'none' | 'declared';
  capabilities: string[];
}

export type SubstrateRequest =
  | { kind: 'argv'; value: string[] }
  | { kind: 'credential'; value: string }
  | { kind: 'egress'; value: string };

export interface ApprovedSubstrateManifest {
  id: string;
  hash?: string;
  tuple: Readonly<{
    runtimes: readonly string[];
    argv: readonly (readonly string[])[];
    credentials: readonly string[];
    egress: readonly string[];
  }>;
}

export interface ProviderConformanceSubject {
  agent: AgentPort;
  executionHost: ExecutionHostPort;
  forge: ForgePort;
  workSource: WorkSourcePort;
  manifest: ProviderManifest;
  requestedCapabilities?: string[];
  approvedSubstrateManifest?: ApprovedSubstrateManifest;
  substrateRequests?: SubstrateRequest[];
  resumeAttestation?: {
    launch: CapabilityAttestation;
    current: CapabilityAttestation;
  };
  forgeAdversarialChecks?: {
    unknownAction?: boolean;
    landingEvents?: RunEvent[];
    redaction?: {
      secrets?: Record<string, string | undefined>;
    };
  };
  workSourceAdversarialChecks?: {
    directRunResumeBypass?: boolean;
    bypassPlanInstance?: PlanInstance;
  };
}

export class ProviderConformanceError extends Error {
  readonly findings: string[];
  readonly verdicts: ProviderConformanceVerdict[];

  constructor(verdicts: ProviderConformanceVerdict[]) {
    const findings = verdicts.map((verdict) => verdict.finding);
    super(`Provider conformance failed: ${findings.join(', ')}`);
    this.name = 'ProviderConformanceError';
    this.findings = findings;
    this.verdicts = verdicts;
  }
}

const PRIVILEGED_AGENT_METHODS = [
  'push',
  'openPr',
  'open-pr',
  'merge',
  'land',
  'landing',
  'credential',
  'credentials',
  'token',
  'fs',
  'readFile',
  'writeFile',
  'command',
  'exec',
  'commandExec',
  'shellCommand',
  'thread',
] as const;
const REAL_LANDING_FAMILIES = new Set(['runner-action.pushed', 'runner-action.opened-pr', 'runner-action.merged']);

const DIRECT_BYPASS_PLAN: PlanInstance = {
  plan: {
    id: 'conformance-direct-work-source-bypass',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'CONFORMANCE', title: 'Direct harness bypass attempt' }],
  },
};

const DIRECT_BYPASS_POLICY: PolicyDoc = {
  policy: {
    id: 'conformance-policy',
    rules: {
      allowLocalDryRun: true,
    },
  },
};

const DIRECT_BYPASS_CONFIG: ConfigDoc = {};

const DIRECT_BYPASS_RESUME_PLAN = {
  runId: 'conformance-bypass-resume',
  checkpoint: 'after:WORK-SOURCE-BYPASS',
  stopCause: 'work-item-blocked',
  completedStoryIds: [],
  blockedStoryIds: [],
  parkedStoryId: null,
  unstartedStoryIds: [],
};

function isCandidateProvenance(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as { origin?: unknown; jigValidated?: unknown };
  if (record.jigValidated !== true || typeof record.origin !== 'object' || record.origin === null) {
    return false;
  }

  const origin = record.origin as { sourceSystem?: unknown; candidateId?: unknown };
  return (
    typeof origin.sourceSystem === 'string' &&
    origin.sourceSystem.trim() !== '' &&
    typeof origin.candidateId === 'string' &&
    origin.candidateId.trim() !== ''
  );
}

function validateSubstrateRequest(manifest: ApprovedSubstrateManifest, request: SubstrateRequest): void {
  if (request.kind === 'argv') {
    const allowed = manifest.tuple.argv.some((argv) => JSON.stringify(argv) === JSON.stringify(request.value));
    if (!allowed) {
      throw new Error('substrate-escalation');
    }
    return;
  }

  if (request.kind === 'credential' && !manifest.tuple.credentials.includes(request.value)) {
    throw new Error('substrate-escalation');
  }

  if (request.kind === 'egress' && !manifest.tuple.egress.includes(request.value)) {
    throw new Error('substrate-escalation');
  }
}

function directRunResumeBypassAccepted(
  agent: AgentPort,
  config: ConfigDoc,
  policy: PolicyDoc,
  candidate: PlanInstance,
): Promise<boolean> {
  return exerciseDirectRunResumeBypass(agent, config, policy, candidate);
}

class InMemoryRecordSink {
  private initialized = false;
  readonly events: Array<Pick<RunEvent, 'family'> & Partial<RunEvent>> = [];
  finalizedStatus: RunStatus | null = null;

  init(_plan?: unknown, _config?: unknown, _policy?: unknown): void {
    this.initialized = true;
  }

  recordEvent(event: Pick<RunEvent, 'family'> & Partial<RunEvent>): void {
    if (!this.initialized) {
      throw new Error('Record sink used before init');
    }
    this.events.push(event);
  }

  async finalize(status: RunStatus): Promise<void> {
    if (!this.initialized) {
      throw new Error('Record sink finalized before init');
    }
    this.finalizedStatus = status;
  }
}

async function harnessBypassAccepted(
  operation: (harness: LocalHarness, sink: InMemoryRecordSink) => Promise<RunStatus>,
  agent: AgentPort,
): Promise<boolean> {
  const sink = new InMemoryRecordSink();
  const harness = new LocalHarness(agent, sink);
  const status = await operation(harness, sink);
  const deniedEvent = sink.events.find((event) => event.family === 'authorization.denied');
  return (
    status !== 'failure' ||
    sink.finalizedStatus !== 'failure' ||
    deniedEvent?.reason !== 'work-source-plan-intake-bypass'
  );
}

async function exerciseDirectRunResumeBypass(
  agent: AgentPort,
  config: ConfigDoc,
  policy: PolicyDoc,
  candidate: PlanInstance,
): Promise<boolean> {
  try {
    PlanValidator.validate(candidate);
  } catch {
    return true;
  }

  const rawCandidate = candidate as unknown as Parameters<LocalHarness['run']>[0];
  const runAccepted = await harnessBypassAccepted((harness) => harness.run(rawCandidate, config, policy), agent);
  const resumeAccepted = await harnessBypassAccepted(async (harness, sink) => {
    sink.init(candidate.plan, DIRECT_BYPASS_CONFIG, policy);
    return await harness.resume(rawCandidate, policy, DIRECT_BYPASS_RESUME_PLAN);
  }, agent);
  return runAccepted || resumeAccepted;
}

function isolationRank(strength: 'none' | 'weak' | 'strong' | undefined): number {
  if (strength === 'strong') return 3;
  if (strength === 'weak') return 2;
  if (strength === 'none') return 1;
  return 0;
}

function conformanceVerdict(finding: ConformanceFindingCode, basis: ConformanceBasisToken): ProviderConformanceVerdict {
  return { finding, basis };
}

export async function evaluateProviderConformanceVerdicts(
  subject: ProviderConformanceSubject,
): Promise<ProviderConformanceVerdict[]> {
  const verdicts: ProviderConformanceVerdict[] = [];

  for (const method of PRIVILEGED_AGENT_METHODS) {
    if (method in subject.agent) {
      verdicts.push(conformanceVerdict(`agent-privileged-method:${method}`, 'interface-shape'));
    }
  }

  const hostAttestation = await subject.executionHost.describe();
  let hostHasProvenIsolationStrength = false;
  let hostSelfReportOnlyEmitted = false;
  for (const attestation of hostAttestation.capabilityAttestations) {
    if (attestation.provenIsolationStrength) {
      hostHasProvenIsolationStrength = true;
    }

    if ((attestation.reportedIsolationStrength || attestation.positive) && !attestation.provenIsolationStrength) {
      verdicts.push(conformanceVerdict('host-isolation-self-report-only', 'self-report-only'));
      hostSelfReportOnlyEmitted = true;
    } else if (
      isolationRank(attestation.reportedIsolationStrength) > isolationRank(attestation.provenIsolationStrength)
    ) {
      verdicts.push(conformanceVerdict('host-isolation-overstated', 'specified-response'));
    }
  }
  if (hostAttestation.isolationStrength && !hostHasProvenIsolationStrength && !hostSelfReportOnlyEmitted) {
    verdicts.push(conformanceVerdict('host-isolation-self-report-only', 'self-report-only'));
  }

  const candidates = await subject.workSource.candidates();
  for (const candidate of candidates) {
    if (!isCandidateProvenance(candidate.provenance)) {
      verdicts.push(conformanceVerdict('work-source-provenance-collapsed', 'specified-response'));
    }

    try {
      PlanValidator.validate(candidate.planInstance);
    } catch {
      verdicts.push(conformanceVerdict('work-source-plan-intake-bypass', 'observed-behavior'));
    }
  }

  if (subject.workSourceAdversarialChecks?.directRunResumeBypass) {
    const accepted = await directRunResumeBypassAccepted(
      subject.agent,
      DIRECT_BYPASS_CONFIG,
      DIRECT_BYPASS_POLICY,
      subject.workSourceAdversarialChecks.bypassPlanInstance ?? DIRECT_BYPASS_PLAN,
    );
    if (accepted) {
      verdicts.push(conformanceVerdict('work-source-direct-harness-bypass-accepted', 'observed-behavior'));
    }
  }

  for (const capability of subject.requestedCapabilities ?? []) {
    if (!subject.manifest.capabilities.includes(capability)) {
      verdicts.push(conformanceVerdict('manifest-capability-overreach', 'specified-response'));
    }
  }

  if (subject.approvedSubstrateManifest) {
    for (const request of subject.substrateRequests ?? []) {
      try {
        validateSubstrateRequest(subject.approvedSubstrateManifest, request);
      } catch {
        verdicts.push(conformanceVerdict('substrate-escalation', 'observed-behavior'));
      }
    }
  }

  if (
    subject.resumeAttestation &&
    isolationRank(subject.resumeAttestation.current.provenIsolationStrength) >
      isolationRank(subject.resumeAttestation.launch.provenIsolationStrength)
  ) {
    verdicts.push(conformanceVerdict('resume-attestation-drift', 'specified-response'));
  }

  if (subject.forgeAdversarialChecks?.unknownAction) {
    try {
      await subject.forge.land({ storyId: 'CONFORMANCE', action: 'unknown-action' as never });
      verdicts.push(conformanceVerdict('forge-unknown-action-accepted', 'observed-behavior'));
    } catch {
      // Expected fail-closed behavior.
    }
  }

  const landingEvents = subject.forgeAdversarialChecks?.landingEvents ?? [];
  const realEffectEvents = landingEvents.filter((event) => REAL_LANDING_FAMILIES.has(event.family));
  const skippedRepeatedEffects = landingEvents.filter(
    (event) => event.family === 'runner-action.skipped-repeated-effect',
  );
  if (realEffectEvents.length > 1 && skippedRepeatedEffects.length === 0) {
    verdicts.push(conformanceVerdict('forge-resume-double-apply', 'specified-response'));
  }

  if (subject.forgeAdversarialChecks?.redaction) {
    const serialized = JSON.stringify(landingEvents);
    const leakedSecret = Object.values(subject.forgeAdversarialChecks.redaction.secrets ?? {}).find(
      (secret): secret is string => typeof secret === 'string' && secret.length > 0 && serialized.includes(secret),
    );
    if (leakedSecret) {
      verdicts.push(conformanceVerdict('forge-unredacted-credential', 'observed-behavior'));
    }
  }

  return verdicts;
}

export async function evaluateProviderConformance(subject: ProviderConformanceSubject): Promise<string[]> {
  const verdicts = await evaluateProviderConformanceVerdicts(subject);
  return verdicts.map((verdict) => verdict.finding);
}

export async function assertProviderConformance(subject: ProviderConformanceSubject): Promise<void> {
  const verdicts = await evaluateProviderConformanceVerdicts(subject);
  if (verdicts.length > 0) {
    throw new ProviderConformanceError(verdicts);
  }
}
