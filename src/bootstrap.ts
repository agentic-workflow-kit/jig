import type { Clock } from './clock.js';
import { PlanValidator } from './plan-validator.js';
import type { AgentPort, CapabilityAttestation, ExecutionHostPort, ForgePort, WorkSourcePort } from './ports.js';
import { type CodexAgentSession, createCodexAgent } from './providers/real/agent.js';
import type { ConfinementProbe } from './providers/real/confinement.js';
import { createRealExecutionHost } from './providers/real/host.js';
import { createReferenceAgent } from './providers/reference/agent.js';
import { ReferenceForge } from './providers/reference/forge.js';
import { ReferenceExecutionHost } from './providers/reference/host.js';
import { ReferenceWorkSource } from './providers/reference/work-source.js';
import type { RedactionOptions } from './redaction.js';
import { type ApprovedSubstrateManifest, approveSubstrateManifest, type SubstrateManifestInput } from './substrate.js';
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
  codexSession?: CodexAgentSession;
  realHostProbe?: ConfinementProbe;
  clock?: Clock;
  substrateManifest?: SubstrateManifestInput;
  redaction?: RedactionOptions;
}

export interface ComposedRunPorts {
  planInstance: PlanInstance;
  agent: AgentPort;
  executionHost: ExecutionHostPort;
  forge: ForgePort;
  workSource: WorkSourcePort;
  capabilityAttestation: CapabilityAttestation;
  substrateManifest?: ApprovedSubstrateManifest;
  redaction?: RedactionOptions;
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
    agent: new Set(['reference', 'scripted-stub', 'codex']),
    executionHost: new Set(['reference', 'local', 'real']),
    forge: new Set(['reference']),
    workSource: new Set(['reference']),
  };

  for (const [seam, driver] of Object.entries(selection) as Array<[keyof typeof supported, string]>) {
    if (!supported[seam].has(driver)) {
      throw new ProviderSelectionError(
        `Unsupported driver selection "${seam}=${driver}". Supported drivers: agent=reference|scripted-stub|codex, executionHost=reference|local|real, forge=reference, workSource=reference.`,
      );
    }
  }
}

function defaultSubstrateManifest(): ApprovedSubstrateManifest {
  return approveSubstrateManifest({
    id: 'codex-local-real-driver',
    runtimes: ['node'],
    argv: [['codex', 'exec']],
    credentials: ['CODEX_API_KEY'],
    egress: [],
  });
}

function selectAgent(
  selection: Required<DriverSelection>,
  options: ComposeRunPortsOptions,
  substrateManifest?: ApprovedSubstrateManifest,
): AgentPort {
  if (selection.agent === 'codex') {
    if (!options.codexSession) {
      throw new ProviderSelectionError('Codex agent driver selected but no Codex session driver was provided.');
    }

    return createCodexAgent({
      session: options.codexSession,
      substrateManifest,
    });
  }

  return createReferenceAgent(options.scriptedOutput);
}

async function selectExecutionHost(
  selection: Required<DriverSelection>,
  options: ComposeRunPortsOptions,
): Promise<ExecutionHostPort> {
  if (selection.executionHost === 'real') {
    if (!options.realHostProbe) {
      throw new ProviderSelectionError('Real execution host selected but no confinement probe was provided.');
    }

    return await createRealExecutionHost({
      probe: options.realHostProbe,
      clock: options.clock,
    });
  }

  if (selection.agent === 'codex') {
    return new ReferenceExecutionHost({
      reportedIsolationStrength: 'weak',
      provenIsolationStrength: 'weak',
      runContext: 'local-real-agent-weak-host',
    });
  }

  return new ReferenceExecutionHost();
}

async function composeRunPorts(options: ComposeRunPortsOptions): Promise<ComposedRunPorts> {
  PlanValidator.validate(options.planInstance);
  const selection = readDriverSelection(options.config);
  assertReferenceSelection(selection);

  const substrateManifest =
    selection.agent === 'codex' || selection.executionHost === 'real'
      ? options.substrateManifest
        ? approveSubstrateManifest(options.substrateManifest)
        : defaultSubstrateManifest()
      : undefined;
  const executionHost = await selectExecutionHost(selection, options);
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
    agent: selectAgent(selection, options, substrateManifest),
    executionHost,
    forge: new ReferenceForge(),
    workSource: new ReferenceWorkSource(options.planInstance),
    capabilityAttestation,
    substrateManifest,
    redaction:
      selection.agent === 'codex' || selection.executionHost === 'real'
        ? { enabled: true, ...options.redaction }
        : undefined,
  };
}

export async function composeReferenceRun(options: ComposeRunPortsOptions): Promise<ComposedRunPorts> {
  return await composeRunPorts(options);
}
