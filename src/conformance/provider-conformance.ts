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
import type { RunEvent } from '../types.js';

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
}

export class ProviderConformanceError extends Error {
  readonly findings: string[];

  constructor(findings: string[]) {
    super(`Provider conformance failed: ${findings.join(', ')}`);
    this.name = 'ProviderConformanceError';
    this.findings = findings;
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

function isolationRank(strength: IsolationStrength | undefined): number {
  if (strength === 'strong') return 3;
  if (strength === 'weak') return 2;
  if (strength === 'none') return 1;
  return 0;
}

export async function evaluateProviderConformance(subject: ProviderConformanceSubject): Promise<string[]> {
  const findings: string[] = [];

  for (const method of PRIVILEGED_AGENT_METHODS) {
    if (method in subject.agent) {
      findings.push(`agent-privileged-method:${method}`);
    }
  }

  const hostAttestation = await subject.executionHost.describe();
  for (const attestation of hostAttestation.capabilityAttestations) {
    if (isolationRank(attestation.reportedIsolationStrength) > isolationRank(attestation.provenIsolationStrength)) {
      findings.push('host-isolation-overstated');
    }
  }

  const candidates = await subject.workSource.candidates();
  for (const candidate of candidates) {
    try {
      PlanValidator.validate(candidate.planInstance);
    } catch {
      findings.push('work-source-plan-intake-bypass');
    }
  }

  for (const capability of subject.requestedCapabilities ?? []) {
    if (!subject.manifest.capabilities.includes(capability)) {
      findings.push('manifest-capability-overreach');
    }
  }

  if (subject.approvedSubstrateManifest) {
    for (const request of subject.substrateRequests ?? []) {
      try {
        validateSubstrateRequest(subject.approvedSubstrateManifest, request);
      } catch {
        findings.push('substrate-escalation');
      }
    }
  }

  if (
    subject.resumeAttestation &&
    isolationRank(subject.resumeAttestation.current.provenIsolationStrength) >
      isolationRank(subject.resumeAttestation.launch.provenIsolationStrength)
  ) {
    findings.push('resume-attestation-drift');
  }

  if (subject.forgeAdversarialChecks?.unknownAction) {
    try {
      await subject.forge.land({ storyId: 'CONFORMANCE', action: 'unknown-action' as never });
      findings.push('forge-unknown-action-accepted');
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
    findings.push('forge-resume-double-apply');
  }

  if (subject.forgeAdversarialChecks?.redaction) {
    const serialized = JSON.stringify(landingEvents);
    const leakedSecret = Object.values(subject.forgeAdversarialChecks.redaction.secrets ?? {}).find(
      (secret): secret is string => typeof secret === 'string' && secret.length > 0 && serialized.includes(secret),
    );
    if (leakedSecret) {
      findings.push('forge-unredacted-credential');
    }
  }

  return findings;
}

export async function assertProviderConformance(subject: ProviderConformanceSubject): Promise<void> {
  const findings = await evaluateProviderConformance(subject);
  if (findings.length > 0) {
    throw new ProviderConformanceError(findings);
  }
}
