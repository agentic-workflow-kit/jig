import type { Clock } from './clock.js';
import {
  assertSupportedDriverSelection,
  type DriverSelection,
  driverSelectionUsesRealDriver,
  ProviderSelectionError,
  readDriverSelection,
} from './driver-selection.js';
import { PlanValidator } from './plan-validator.js';
import type { AgentPort, CapabilityAttestation, ExecutionHostPort, ForgePort, WorkSourcePort } from './ports.js';
import { type CodexAgentSession, createCodexAgent } from './providers/real/agent.js';
import type { ConfinementProbe } from './providers/real/confinement.js';
import { createGitHubForge, type GitHubForgeTransport } from './providers/real/forge.js';
import { createRealExecutionHost } from './providers/real/host.js';
import { createGitHubIssuesWorkSource, type GitHubIssuesWorkSourceTransport } from './providers/real/work-source.js';
import { createReferenceAgent } from './providers/reference/agent.js';
import { ReferenceForge } from './providers/reference/forge.js';
import { ReferenceExecutionHost } from './providers/reference/host.js';
import { ReferenceWorkSource } from './providers/reference/work-source.js';
import { collectLandingPathSecrets, type RedactionOptions } from './redaction.js';
import { type ApprovedSubstrateManifest, approveSubstrateManifest, type SubstrateManifestInput } from './substrate.js';
import type { ConfigDoc, PlanInstance } from './types.js';

export { ProviderSelectionError } from './driver-selection.js';

export interface ComposeRunPortsOptions {
  config: ConfigDoc;
  planInstance: PlanInstance;
  scriptedOutput: Record<string, unknown>;
  codexSession?: CodexAgentSession;
  realHostProbe?: ConfinementProbe;
  clock?: Clock;
  substrateManifest?: SubstrateManifestInput;
  redaction?: RedactionOptions;
  forgeTransport?: GitHubForgeTransport;
  workSourceTransport?: GitHubIssuesWorkSourceTransport;
}

export interface ComposedRunPorts {
  planInstance: PlanInstance;
  driverSelection: DriverSelection;
  agent: AgentPort;
  executionHost: ExecutionHostPort;
  forge: ForgePort;
  workSource: WorkSourcePort;
  capabilityAttestation: CapabilityAttestation;
  substrateManifest?: ApprovedSubstrateManifest;
  redaction?: RedactionOptions;
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
  selection: DriverSelection,
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
  selection: DriverSelection,
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

function selectForge(selection: DriverSelection, options: ComposeRunPortsOptions): ForgePort {
  if (selection.forge === 'github') {
    return createGitHubForge({
      transport: options.forgeTransport,
    });
  }

  return new ReferenceForge();
}

function selectWorkSource(selection: DriverSelection, options: ComposeRunPortsOptions): WorkSourcePort {
  if (selection.workSource === 'github-issues') {
    return createGitHubIssuesWorkSource({
      transport: options.workSourceTransport,
    });
  }

  return new ReferenceWorkSource(options.planInstance);
}

async function composeRunPorts(options: ComposeRunPortsOptions): Promise<ComposedRunPorts> {
  PlanValidator.validate(options.planInstance);
  const selection = readDriverSelection(options.config);
  assertSupportedDriverSelection(selection);
  const usesRealCredentials = driverSelectionUsesRealDriver(selection);

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
  const redaction = usesRealCredentials
    ? {
        enabled: true,
        ...options.redaction,
        secrets: {
          ...(selection.forge === 'github' ? collectLandingPathSecrets() : {}),
          ...options.redaction?.secrets,
        },
      }
    : undefined;

  return {
    planInstance: options.planInstance,
    driverSelection: selection,
    agent: selectAgent(selection, options, substrateManifest),
    executionHost,
    forge: selectForge(selection, options),
    workSource: selectWorkSource(selection, options),
    capabilityAttestation,
    substrateManifest,
    redaction,
  };
}

export async function composeReferenceRun(options: ComposeRunPortsOptions): Promise<ComposedRunPorts> {
  return await composeRunPorts(options);
}
