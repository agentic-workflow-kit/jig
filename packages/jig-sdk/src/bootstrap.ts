import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
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
import { createProductionCodexAgentSession } from './providers/real/codex-app-server.js';
import { type ConfinementProbe, localProcessGroupProbeSubstrateRequests } from './providers/real/confinement.js';
import { createGitHubForge, type GitHubForgeTransport } from './providers/real/forge.js';
import { createDefaultLocalConfinementProbe, createRealExecutionHost } from './providers/real/host.js';
import { createGitHubIssuesWorkSource, type GitHubIssuesWorkSourceTransport } from './providers/real/work-source.js';
import { createReferenceAgent } from './providers/reference/agent.js';
import { ReferenceForge } from './providers/reference/forge.js';
import { ReferenceExecutionHost } from './providers/reference/host.js';
import { ReferenceWorkSource } from './providers/reference/work-source.js';
import { collectCodexSecrets, collectLandingPathSecrets, type RedactionOptions } from './redaction.js';
import { type ApprovedSubstrateManifest, approveSubstrateManifest, type SubstrateManifestInput } from './substrate.js';
import type { ConfigDoc, PlanInstance } from './types.js';

export { ProviderSelectionError } from './driver-selection.js';

type OwnerDecisionOutcome = 'approve' | 'reject' | 'override' | 'hand-off';
type OwnerDecisionResult =
  | Exclude<OwnerDecisionOutcome, 'hand-off'>
  | { outcome: OwnerDecisionOutcome; handedOffTo?: string };

export interface ComposeRunPortsOptions {
  config: ConfigDoc;
  planInstance: PlanInstance;
  scriptedOutput: Record<string, unknown>;
  codexSession?: CodexAgentSession;
  ownerDecisionSource?: {
    decide(request: unknown, story: unknown): Promise<OwnerDecisionResult>;
  } | null;
  realHostProbe?: ConfinementProbe;
  realHostProbeFactory?: () => ConfinementProbe;
  clock?: Clock;
  substrateManifest?: SubstrateManifestInput;
  redaction?: RedactionOptions;
  forgeTransport?: GitHubForgeTransport;
  workSourceTransport?: GitHubIssuesWorkSourceTransport;
}

export interface BlockSurfaceContext {
  safeBranch?: string;
  canPush?: boolean;
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
  blockSurface?: BlockSurfaceContext;
}

const execFileAsync = promisify(execFile);

function defaultSubstrateManifest(selection: DriverSelection): ApprovedSubstrateManifest {
  const schemaOutDir = join(tmpdir(), 'jig-codex-schema');
  const argv: string[][] = [];
  const credentials: string[] = [];
  const egress: string[] = [];

  if (selection.agent === 'codex') {
    argv.push(
      ['codex', '--version'],
      ['codex', 'app-server', '--listen', 'stdio://'],
      ['codex', 'app-server', 'generate-json-schema', '--out', schemaOutDir],
    );
    credentials.push('CODEX_API_KEY');
  }

  if (selection.executionHost === 'real') {
    const requests = localProcessGroupProbeSubstrateRequests();
    argv.push(...requests.filter((request) => request.kind === 'argv').map((request) => request.value));
    egress.push(...requests.filter((request) => request.kind === 'egress').map((request) => request.value));
  }

  return approveSubstrateManifest({
    id: 'real-driver-substrate',
    runtimes: ['node'],
    argv: argv.filter((entry) => entry.length > 0),
    credentials,
    egress,
  });
}

function selectAgent(
  selection: DriverSelection,
  options: ComposeRunPortsOptions,
  substrateManifest?: ApprovedSubstrateManifest,
  redaction?: RedactionOptions,
): AgentPort {
  if (selection.agent === 'codex') {
    return createCodexAgent({
      session:
        options.codexSession ??
        createProductionCodexAgentSession({
          ownerDecisionSource: options.ownerDecisionSource,
          redaction,
        }),
      substrateManifest,
    });
  }

  return createReferenceAgent(options.scriptedOutput);
}

async function selectExecutionHost(
  selection: DriverSelection,
  options: ComposeRunPortsOptions,
  substrateManifest?: ApprovedSubstrateManifest,
): Promise<ExecutionHostPort> {
  if (selection.executionHost === 'real') {
    const probe = options.realHostProbe ?? options.realHostProbeFactory?.();
    if (!probe && process.platform !== 'darwin') {
      throw new ProviderSelectionError('Real execution host is currently supported only on macOS (darwin).');
    }

    return await createRealExecutionHost({
      probe: probe ?? createDefaultLocalConfinementProbe(),
      clock: options.clock,
      substrateManifest,
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

async function readCurrentBranch(): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
    const branch = stdout.trim();
    return branch !== '' && branch !== 'HEAD' ? branch : undefined;
  } catch {
    return undefined;
  }
}

function isSafeBranch(branch: string | undefined): branch is string {
  return branch !== undefined && branch !== 'main' && branch !== 'master';
}

async function composeBlockSurfaceContext(selection: DriverSelection): Promise<BlockSurfaceContext | undefined> {
  if (selection.forge !== 'github') {
    return undefined;
  }

  const branch = await readCurrentBranch();
  return {
    safeBranch: isSafeBranch(branch) ? branch : undefined,
    canPush: true,
  };
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
        : defaultSubstrateManifest(selection)
      : undefined;
  const executionHost = await selectExecutionHost(selection, options, substrateManifest);
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
          ...(selection.agent === 'codex' ? collectCodexSecrets() : {}),
          ...(selection.forge === 'github' ? collectLandingPathSecrets() : {}),
          ...options.redaction?.secrets,
        },
      }
    : undefined;
  const agent = selectAgent(selection, options, substrateManifest, redaction);
  const blockSurface = await composeBlockSurfaceContext(selection);

  return {
    planInstance: options.planInstance,
    driverSelection: selection,
    agent,
    executionHost,
    forge: selectForge(selection, options),
    workSource: selectWorkSource(selection, options),
    capabilityAttestation,
    substrateManifest,
    redaction,
    blockSurface,
  };
}

export async function composeReferenceRun(options: ComposeRunPortsOptions): Promise<ComposedRunPorts> {
  return await composeRunPorts(options);
}
