import { PlanValidator } from './plan-validator.js';
import type { AgentPort, CapabilityAttestation, ExecutionHostPort, ForgePort, WorkSourcePort } from './ports.js';
import { createReferenceAgent } from './providers/reference/agent.js';
import { ReferenceForge } from './providers/reference/forge.js';
import { ReferenceExecutionHost } from './providers/reference/host.js';
import { ReferenceWorkSource } from './providers/reference/work-source.js';
import type { ConfigDoc, PlanInstance } from './types.js';

export class ProviderSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderSelectionError';
  }
}

export interface ComposeRunPortsOptions {
  config: ConfigDoc;
  planInstance: PlanInstance;
  scriptedOutput: Record<string, unknown>;
}

export interface ComposedRunPorts {
  planInstance: PlanInstance;
  agent: AgentPort;
  executionHost: ExecutionHostPort;
  forge: ForgePort;
  workSource: WorkSourcePort;
  capabilityAttestation: CapabilityAttestation;
}

type DriverSelection = {
  agent?: string;
  executionHost?: string;
  forge?: string;
  workSource?: string;
};

const REFERENCE_SELECTION: Required<DriverSelection> = {
  agent: 'reference',
  executionHost: 'reference',
  forge: 'reference',
  workSource: 'reference',
};

function readDriverSelection(config: ConfigDoc): Required<DriverSelection> {
  const raw = config.drivers;
  if (raw === undefined) {
    return REFERENCE_SELECTION;
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ProviderSelectionError(
      'Unknown provider driver selection. Use reference drivers or omit config.drivers.',
    );
  }

  const selection = raw as DriverSelection;
  return {
    agent: selection.agent ?? REFERENCE_SELECTION.agent,
    executionHost: selection.executionHost ?? REFERENCE_SELECTION.executionHost,
    forge: selection.forge ?? REFERENCE_SELECTION.forge,
    workSource: selection.workSource ?? REFERENCE_SELECTION.workSource,
  };
}

function assertReferenceSelection(selection: Required<DriverSelection>): void {
  const supported = {
    agent: new Set(['reference', 'scripted-stub']),
    executionHost: new Set(['reference', 'local']),
    forge: new Set(['reference']),
    workSource: new Set(['reference']),
  };

  for (const [seam, driver] of Object.entries(selection) as Array<[keyof typeof supported, string]>) {
    if (!supported[seam].has(driver)) {
      throw new ProviderSelectionError(
        `Unsupported driver selection "${seam}=${driver}". Supported drivers: agent=reference|scripted-stub, executionHost=reference|local, forge=reference, workSource=reference.`,
      );
    }
  }
}

export function composeRunPorts(options: ComposeRunPortsOptions): ComposedRunPorts {
  PlanValidator.validate(options.planInstance);
  const selection = readDriverSelection(options.config);
  assertReferenceSelection(selection);

  const executionHost = new ReferenceExecutionHost();
  const hostAttestation = executionHost.describe();
  const capabilityAttestation =
    hostAttestation.capabilityAttestations[0] ??
    ({
      driverId: hostAttestation.driverId,
      capability: 'filesystem-edit',
      runContext: hostAttestation.runContext,
      freshness: 'missing',
      positive: false,
      reportedIsolationStrength: hostAttestation.isolationStrength,
    } satisfies CapabilityAttestation);

  return {
    planInstance: options.planInstance,
    agent: createReferenceAgent(options.scriptedOutput),
    executionHost,
    forge: new ReferenceForge(),
    workSource: new ReferenceWorkSource(options.planInstance),
    capabilityAttestation,
  };
}

export async function composeReferenceRun(options: ComposeRunPortsOptions): Promise<ComposedRunPorts> {
  return composeRunPorts(options);
}
