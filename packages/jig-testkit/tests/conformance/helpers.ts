import type {
  AgentPort,
  CapabilityAttestation,
  ConfigDoc,
  ExecutionHostPort,
  ForgePort,
  PlanInstance,
  RunEvent,
  WorkSourcePort,
} from '@agentic-workflow-kit/jig-sdk';
import type { ApprovedSubstrateManifest, ProviderConformanceSubject, ProviderManifest } from '../../src/index.js';

export function planInstance(id: string): PlanInstance {
  return {
    plan: {
      id,
      version: 'execution-plan-shape-v0',
      stories: [{ id: 'STORY-1', title: 'Conformance story' }],
    },
  };
}

export function config(): ConfigDoc {
  return {
    runner: { mode: 'local-dry-run', recordDir: 'runs' },
    drivers: {
      agent: 'scripted-stub',
      executionHost: 'local',
    },
  };
}

export function approveSubstrateManifest(input: {
  id: string;
  runtimes: string[];
  argv: string[][];
  credentials: string[];
  egress: string[];
}): ApprovedSubstrateManifest {
  return {
    id: input.id,
    tuple: {
      runtimes: [...input.runtimes].sort(),
      argv: input.argv.map((argv) => [...argv]).sort((left, right) => left.join('\0').localeCompare(right.join('\0'))),
      credentials: [...input.credentials].sort(),
      egress: [...input.egress].sort(),
    },
  };
}

export function referenceSubject(overrides: Partial<ProviderConformanceSubject> = {}): ProviderConformanceSubject {
  const attestation: CapabilityAttestation = {
    driverId: 'reference-host',
    capability: 'filesystem-edit',
    runContext: 'local-dry-run',
    freshness: 'fresh',
    positive: true,
    reportedIsolationStrength: 'weak',
    provenIsolationStrength: 'weak',
  };

  const agent: AgentPort = {
    execute: async () => ({
      storyId: 'STORY-1',
      outcome: 'success',
      evidence: { result: 'passed' },
    }),
  };

  const executionHost: ExecutionHostPort = {
    describe: () => ({
      driverId: 'reference-host',
      runContext: 'local-dry-run',
      isolationStrength: 'weak',
      capabilityAttestations: [attestation],
    }),
  };

  const forge: ForgePort = {
    land: () => ({
      family: 'runner-action.skipped-on-dry-run',
      storyId: 'STORY-1',
      action: 'push|open-pr|merge',
      reason: 'dry-run',
    }),
  };

  const workSource: WorkSourcePort = {
    candidates: () => [
      {
        planInstance: planInstance('reference-plan'),
        provenance: {
          origin: {
            sourceSystem: 'local-plan',
            candidateId: 'reference-plan',
          },
          jigValidated: true,
        },
      },
    ],
  };

  return {
    agent,
    executionHost,
    forge,
    workSource,
    manifest: {
      id: 'reference-adapters',
      network: 'none',
      credentials: 'none',
      capabilities: ['filesystem-edit'],
    },
    ...overrides,
  };
}

export function manifest(capabilities: string[]): ProviderManifest {
  return {
    id: 'reference-adapters',
    network: 'none',
    credentials: 'none',
    capabilities,
  };
}

export function landingEvent(overrides: Partial<RunEvent> = {}): RunEvent {
  return {
    family: 'runner-action.pushed',
    storyId: 'STORY-1',
    targetRef: 'refs/heads/test',
    targetHead: 'head-1',
    ...overrides,
  };
}
