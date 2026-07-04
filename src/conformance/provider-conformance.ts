import { LocalHarness } from '../harness.js';
import { isCandidateProvenance, WORK_SOURCE_INTAKE_BYPASS_REASON } from '../intake.js';
import { PlanValidator } from '../plan-validator.js';
import type {
  AgentPort,
  CapabilityAttestation,
  ExecutionHostPort,
  ForgePort,
  IsolationStrength,
  WorkSourcePort,
} from '../ports.js';
import type { RedactionOptions } from '../redaction.js';
import { type ApprovedSubstrateManifest, type SubstrateRequest, validateSubstrateRequest } from '../substrate.js';
import type { ConfigDoc, PlanInstance, PolicyDoc, ResumePlan, RunEvent } from '../types.js';

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
    redaction?: RedactionOptions;
  };
  workSourceAdversarialChecks?: {
    directRunResumeBypass?: boolean;
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
];
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

const DIRECT_BYPASS_RESUME_PLAN: ResumePlan = {
  runId: 'run-conformance-existing',
  checkpoint: 'after:CONFORMANCE',
  stopCause: 'work-item-blocked',
  completedStoryIds: [],
  blockedStoryIds: [],
  parkedStoryId: null,
  unstartedStoryIds: [],
};

function isolationRank(strength: IsolationStrength | undefined): number {
  if (strength === 'strong') return 3;
  if (strength === 'weak') return 2;
  if (strength === 'none') return 1;
  return 0;
}

function conformanceVerdict(finding: ConformanceFindingCode, basis: ConformanceBasisToken): ProviderConformanceVerdict {
  return { finding, basis };
}

/**
 * Evaluates a provider against the reusable conformance suite and returns typed failure verdicts.
 *
 * Adequacy bar: this suite proves interface shape and specified responses under controlled doubles. A
 * green result does not prove real-provider behavioral truth because a mock can lie. Verdicts whose
 * support is only the subject's own claim must carry the `self-report-only` basis token.
 */
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
    const runEvents: RunEvent[] = [];
    const runHarness = new LocalHarness(subject.agent, {
      init: () => {},
      recordEvent: (event) => runEvents.push(event as RunEvent),
      finalize: async () => {},
    });
    const runStatus = await (
      runHarness.run as unknown as (
        candidate: unknown,
        config: ConfigDoc,
        policy: PolicyDoc,
      ) => Promise<'success' | 'failure'>
    )(DIRECT_BYPASS_PLAN, DIRECT_BYPASS_CONFIG, DIRECT_BYPASS_POLICY);
    const runDenied = runEvents.find(
      (event) => event.family === 'authorization.denied' && event.reason === WORK_SOURCE_INTAKE_BYPASS_REASON,
    );

    const resumeEvents: RunEvent[] = [];
    const resumeHarness = new LocalHarness(subject.agent, {
      init: () => {},
      recordEvent: (event) => resumeEvents.push(event as RunEvent),
      finalize: async () => {},
    });
    const resumeStatus = await (
      resumeHarness.resume as unknown as (
        candidate: unknown,
        policy: PolicyDoc,
        resumePlan: ResumePlan,
      ) => Promise<'success' | 'failure'>
    )(DIRECT_BYPASS_PLAN, DIRECT_BYPASS_POLICY, DIRECT_BYPASS_RESUME_PLAN);
    const resumeDenied = resumeEvents.find(
      (event) => event.family === 'authorization.denied' && event.reason === WORK_SOURCE_INTAKE_BYPASS_REASON,
    );

    if (runStatus !== 'failure' || resumeStatus !== 'failure' || !runDenied || !resumeDenied) {
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

/**
 * Compatibility wrapper returning only finding codes.
 *
 * Use `evaluateProviderConformanceVerdicts` when a caller needs to distinguish independently observed
 * behavior from `self-report-only` conformance evidence.
 */
export async function evaluateProviderConformance(subject: ProviderConformanceSubject): Promise<string[]> {
  const verdicts = await evaluateProviderConformanceVerdicts(subject);
  return verdicts.map((verdict) => verdict.finding);
}

/**
 * Fails on any conformance verdict.
 *
 * Passing this assertion means the subject satisfied the suite's controlled interface and response checks;
 * it does not prove a real provider behaved truthfully outside those checks.
 */
export async function assertProviderConformance(subject: ProviderConformanceSubject): Promise<void> {
  const verdicts = await evaluateProviderConformanceVerdicts(subject);
  if (verdicts.length > 0) {
    throw new ProviderConformanceError(verdicts);
  }
}
