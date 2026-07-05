import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type ComposeRunPortsOptions, composeReferenceRun } from './bootstrap.js';
import { createInMemoryStoryWorkspaceIsolation, LocalHarness } from './harness.js';
import { intakeCandidates } from './intake.js';
import { type IntegrityVerification, launchBindingExpectsIntegrity, verifyIntegritySidecar } from './integrity.js';
import { bindOwnerConfiguration } from './owner-configuration.js';
import { PlanValidator } from './plan-validator.js';
import { type ProjectionIssue, projectRunEvents, type RunProjection } from './projection.js';
import { RecordManager } from './records.js';
import {
  checkWorkspaceContinuity,
  type ResumeLoadedRunOptions,
  type ResumeOwnerDecisionSource,
  ResumeRefusal,
  resumeRunLoaded,
} from './resume.js';
import { runDeclaredWorkspaceSetup } from './setup.js';
import { approveSubstrateManifest, SubstrateAuthorizationError } from './substrate.js';
import type {
  BoundOwnerConfiguration,
  ConfigDoc,
  PlanInstance,
  PolicyDoc,
  RunBinding,
  RunRecord,
  RunStatus,
} from './types.js';

export interface PreviewRunInput {
  planInstance: PlanInstance;
  config: ConfigDoc;
  policy: PolicyDoc;
}

export interface PreviewRunResult {
  posture: 'run.previewed';
  planId: string;
  policyId: string;
  mode?: string;
  stories: Array<{
    id: string;
    title: string;
  }>;
}

export interface StartRunInput {
  planInstance: PlanInstance;
  config: ConfigDoc;
  policy: PolicyDoc;
  scriptedOutput: Record<string, unknown>;
}

export interface InspectRunInput {
  runDir: string;
}

export interface ProjectionInspectionResult {
  kind: 'projection';
  runDir: string;
  projection: RunProjection;
  cacheParseError: string | null;
  integrity: IntegrityVerification;
  resumeDiagnostics: ProjectionIssue[];
}

export interface LegacyInspectionResult {
  kind: 'legacy';
  runDir: string;
  runRecord: RunRecord;
}

export type InspectRunResult = ProjectionInspectionResult | LegacyInspectionResult;

export interface ResumeRunInput {
  runDir: string;
  scriptedOutput: Record<string, unknown>;
  config?: ConfigDoc;
  policy?: PolicyDoc;
  planInstance?: PlanInstance;
}

export interface JigOperatorControlPort {
  preview(input: PreviewRunInput): Promise<PreviewRunResult>;
  start(input: StartRunInput): Promise<RunStatus>;
  inspect(input: InspectRunInput): Promise<InspectRunResult>;
}

export interface JigRecoverySurface {
  resume(input: ResumeRunInput): Promise<RunStatus>;
}

export interface JigSession {
  operator: JigOperatorControlPort;
  recovery: JigRecoverySurface;
}

export interface CreateJigSessionOptions
  extends Omit<ComposeRunPortsOptions, 'config' | 'planInstance' | 'scriptedOutput'> {
  ownerDecisionSource?: ResumeOwnerDecisionSource | null;
}

export class InspectRunError extends Error {
  readonly integrity: IntegrityVerification | undefined;

  constructor(message: string, integrity?: IntegrityVerification) {
    super(message);
    this.name = 'InspectRunError';
    this.integrity = integrity;
  }
}

function readLaunchBindingForIntegrity(eventsJsonl: string): Pick<RunBinding, 'drivers'> | undefined {
  const [launchLine] = eventsJsonl.split('\n');
  if (!launchLine) {
    return undefined;
  }

  try {
    const launch = JSON.parse(launchLine) as { binding?: Pick<RunBinding, 'drivers'> };
    return launch.binding;
  } catch {
    return undefined;
  }
}

function verifyInspectIntegrity(runDir: string, eventsJsonl: string): IntegrityVerification {
  return verifyIntegritySidecar(runDir, {
    expected: launchBindingExpectsIntegrity(readLaunchBindingForIntegrity(eventsJsonl)),
  });
}

function resumeInspectionDiagnostics(projection: RunProjection): ProjectionIssue[] {
  if (projection.lifecycleState !== 'stopped') {
    return [];
  }

  const continuity = checkWorkspaceContinuity(projection);
  if (continuity.status === 'changed-basis') {
    return [
      {
        code: 'resume-blocked-missing-approval',
        message: `${continuity.message}; fresh owner approval is required before resume`,
      },
    ];
  }
  if (continuity.status === 'mismatch') {
    return [
      {
        code: 'resume-blocked-workspace-mismatch',
        message: continuity.message,
      },
    ];
  }

  return [];
}

function isLegacyProjectionFallback(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'missing-launch-metadata';
}

async function recordComposeTimeSubstrateFailure(
  options: CreateJigSessionOptions,
  input: StartRunInput,
  error: SubstrateAuthorizationError,
  ownerConfiguration?: BoundOwnerConfiguration,
): Promise<RunStatus> {
  const recordManager = new RecordManager({
    redaction: options.redaction,
    substrateManifest: options.substrateManifest ? approveSubstrateManifest(options.substrateManifest) : undefined,
    ownerConfiguration,
  });
  recordManager.init(input.planInstance.plan, input.config, input.policy, ownerConfiguration);

  const [blockedStory, ...unstartedStories] = input.planInstance.plan.stories;
  if (!blockedStory) {
    recordManager.recordEvent({
      family: 'authorization.denied',
      reason: error.message,
    });
    await recordManager.finalize('failure');
    return 'failure';
  }

  recordManager.recordEvent({
    family: 'story.started',
    storyId: blockedStory.id,
  });
  recordManager.recordEvent({
    family: 'story.blocked',
    storyId: blockedStory.id,
    reason: 'substrate-escalation',
    diagnostics: {
      error: error.message,
    },
  });
  recordManager.recordEvent({
    family: 'run.stopped',
    reason: 'work-item-blocked',
    checkpoint: `after:${blockedStory.id}`,
    unstarted: unstartedStories.map((story) => story.id),
  });
  await recordManager.finalize('failure');
  return 'failure';
}

export function createJigSession(options: CreateJigSessionOptions = {}): JigSession {
  return {
    operator: {
      preview: async (input): Promise<PreviewRunResult> => {
        PlanValidator.validate(input.planInstance);
        if (input.config.track || input.policy.policy) {
          bindOwnerConfiguration(input.config, input.policy);
        }
        return {
          posture: 'run.previewed',
          planId: input.planInstance.plan.id,
          policyId: input.policy.policy?.id ?? 'unknown-policy',
          mode: input.config.runner?.mode,
          stories: input.planInstance.plan.stories.map((story) => ({
            id: story.id,
            title: story.title,
          })),
        };
      },

      start: async (input): Promise<RunStatus> => {
        PlanValidator.validate(input.planInstance);
        const ownerConfiguration = bindOwnerConfiguration(input.config, input.policy);
        runDeclaredWorkspaceSetup(ownerConfiguration);
        let composed: Awaited<ReturnType<typeof composeReferenceRun>>;
        try {
          composed = await composeReferenceRun({
            ...options,
            planInstance: input.planInstance,
            config: input.config,
            scriptedOutput: input.scriptedOutput,
          });
        } catch (error) {
          if (error instanceof SubstrateAuthorizationError) {
            return await recordComposeTimeSubstrateFailure(options, input, error, ownerConfiguration);
          }
          throw error;
        }
        const recordManager = new RecordManager({
          launchAttestation: composed.substrateManifest ? composed.capabilityAttestation : undefined,
          substrateManifest: composed.substrateManifest,
          redaction: composed.redaction,
          ownerConfiguration,
        });
        const intake = await intakeCandidates(composed.workSource);
        const [candidate] = intake.admitted;
        if (!candidate) {
          recordManager.init(composed.planInstance.plan, input.config, input.policy, ownerConfiguration);
          for (const rejection of intake.rejected) {
            recordManager.recordEvent(rejection.event);
          }
          await recordManager.finalize('failure');
          throw new Error('No validated work-source candidate available');
        }
        const harness = new LocalHarness(composed.agent, recordManager, options.ownerDecisionSource ?? null, {
          capabilityAttestation: composed.capabilityAttestation,
          ownerConfiguration,
          forge: composed.forge,
          blockSurface: composed.blockSurface,
          workspaceIsolation:
            composed.executionHost.describe().driverId === 'real-host'
              ? createInMemoryStoryWorkspaceIsolation(join(process.cwd(), '.jig-workspaces'))
              : undefined,
        });

        return await harness.run(candidate, input.config, input.policy);
      },

      inspect: async (input): Promise<InspectRunResult> => {
        if (!existsSync(input.runDir)) {
          throw new Error(`Run directory "${input.runDir}" does not exist`);
        }

        const eventsJsonlPath = join(input.runDir, 'events.jsonl');
        const runJsonPath = join(input.runDir, 'run.json');

        if (existsSync(eventsJsonlPath)) {
          const eventsJsonl = readFileSync(eventsJsonlPath, 'utf8');
          let runRecord: RunRecord | null = null;
          let cacheParseError: string | null = null;

          if (existsSync(runJsonPath)) {
            try {
              runRecord = JSON.parse(readFileSync(runJsonPath, 'utf8')) as RunRecord;
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              cacheParseError = `run.json cache unreadable and ignored: ${message}`;
            }
          }

          const integrity = verifyInspectIntegrity(input.runDir, eventsJsonl);

          try {
            const projection = projectRunEvents({ eventsJsonl, runRecord });
            return {
              kind: 'projection',
              runDir: input.runDir,
              projection,
              cacheParseError,
              integrity,
              resumeDiagnostics: resumeInspectionDiagnostics(projection),
            };
          } catch (err) {
            if (runRecord && isLegacyProjectionFallback(err)) {
              return {
                kind: 'legacy',
                runDir: input.runDir,
                runRecord,
              };
            }

            const message = err instanceof Error ? err.message : String(err);
            throw new InspectRunError(`Failed to inspect authoritative events.jsonl: ${message}`, integrity);
          }
        }

        if (!existsSync(runJsonPath)) {
          throw new Error(`Neither events.jsonl nor run.json found in "${input.runDir}"`);
        }

        try {
          return {
            kind: 'legacy',
            runDir: input.runDir,
            runRecord: JSON.parse(readFileSync(runJsonPath, 'utf8')) as RunRecord,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(`Failed to parse run.json: ${message}`);
        }
      },
    },

    recovery: {
      resume: async (input): Promise<RunStatus> => {
        const loadedOptions: ResumeLoadedRunOptions = {
          runDir: input.runDir,
          scriptedOutput: input.scriptedOutput,
          config: input.config,
          policy: input.policy,
          planInstance: input.planInstance,
          ownerDecisionSource: options.ownerDecisionSource ?? undefined,
          codexSession: options.codexSession,
          realHostProbe: options.realHostProbe,
          realHostProbeFactory: options.realHostProbeFactory,
          clock: options.clock,
          substrateManifest: options.substrateManifest,
          forgeTransport: options.forgeTransport,
          workSourceTransport: options.workSourceTransport,
          redaction: options.redaction,
        };

        return await resumeRunLoaded(loadedOptions);
      },
    },
  };
}

export { ResumeRefusal };
