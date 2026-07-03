import { PlanValidator } from '../plan-validator.js';
import type { AgentPort, ExecutionHostPort, ForgePort, IsolationStrength, WorkSourcePort } from '../ports.js';

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
}

export class ProviderConformanceError extends Error {
  readonly findings: string[];

  constructor(findings: string[]) {
    super(`Provider conformance failed: ${findings.join(', ')}`);
    this.name = 'ProviderConformanceError';
    this.findings = findings;
  }
}

const PRIVILEGED_AGENT_METHODS = ['push', 'openPr', 'open-pr', 'merge', 'credential', 'credentials', 'token'];

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

  return findings;
}

export async function assertProviderConformance(subject: ProviderConformanceSubject): Promise<void> {
  const findings = await evaluateProviderConformance(subject);
  if (findings.length > 0) {
    throw new ProviderConformanceError(findings);
  }
}
