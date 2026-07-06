import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type ComposeRunPortsOptions, composeReferenceRun } from './bootstrap.js';
import { type ExportRunInput, type ExportRunResult, exportRun } from './export.js';
import { createInMemoryStoryWorkspaceIsolation, LocalHarness } from './harness.js';
import { intakeCandidates } from './intake.js';
import {
  type IntegrityVerification,
  launchBindingExpectsIntegrity,
  verifyIntegritySidecar,
  writeIntegritySidecar,
} from './integrity.js';
import { bindOwnerConfiguration } from './owner-configuration.js';
import { PlanValidator } from './plan-validator.js';
import {
  type AskWhyResult,
  askWhyFromEvents,
  type ProjectedNotice,
  type ProjectionIssue,
  parseEventsJsonl,
  projectRunEvents,
  projectWatch,
  type RunProjection,
  type WatchProjection,
} from './projection.js';
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

export interface WatchRunInput {
  runDir: string;
}

export interface AskWhyInput {
  runDir: string;
  storyId?: string;
}

export interface NoticeActionInput {
  runDir: string;
  noticeId: string;
}

export interface SnoozeNoticeInput extends NoticeActionInput {
  until: string;
}

export interface NoticeActionResult {
  runDir: string;
  notice: ProjectedNotice;
}

export type OwnerDecisionOutcome = 'approve' | 'reject' | 'override' | 'hand-off';

export interface DecideRunInput {
  runDir: string;
  outcome: OwnerDecisionOutcome;
  storyId?: string;
  reason?: string;
  handedOffTo?: string;
}

export interface DecideRunResult {
  runDir: string;
  outcome: OwnerDecisionOutcome | 'refused';
  storyId?: string;
  reason?: string;
}

export interface StopRunInput {
  runDir: string;
  reason?: string;
}

export interface StopRunResult {
  runDir: string;
  status: 'requested' | 'stopped' | 'refused';
  checkpoint?: string;
  reason?: string;
}

export type { ExportRunInput, ExportRunResult };

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
  watch(input: WatchRunInput): Promise<WatchProjection>;
  askWhy(input: AskWhyInput): Promise<AskWhyResult>;
  acknowledgeNotice(input: NoticeActionInput): Promise<NoticeActionResult>;
  snoozeNotice(input: SnoozeNoticeInput): Promise<NoticeActionResult>;
  decide(input: DecideRunInput): Promise<DecideRunResult>;
  stop(input: StopRunInput): Promise<StopRunResult>;
  export(input: ExportRunInput): Promise<ExportRunResult>;
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

function readProjectionInputs(runDir: string): { eventsJsonl: string; runRecord: RunRecord | null } {
  if (!existsSync(runDir)) {
    throw new Error(`Run directory "${runDir}" does not exist`);
  }

  const eventsJsonlPath = join(runDir, 'events.jsonl');
  if (!existsSync(eventsJsonlPath)) {
    throw new Error(`Missing authoritative events.jsonl in "${runDir}"`);
  }

  const runJsonPath = join(runDir, 'run.json');
  let runRecord: RunRecord | null = null;
  if (existsSync(runJsonPath)) {
    try {
      runRecord = JSON.parse(readFileSync(runJsonPath, 'utf8')) as RunRecord;
    } catch {
      runRecord = null;
    }
  }

  return {
    eventsJsonl: readFileSync(eventsJsonlPath, 'utf8'),
    runRecord,
  };
}

function assertOwnerAppendAllowed(runDir: string, eventsJsonl: string, action: string): void {
  const integrity = verifyInspectIntegrity(runDir, eventsJsonl);
  if (integrity.status === 'broken') {
    throw new InspectRunError(`Refusing to append ${action}: ${integrity.message}`, integrity);
  }
}

function appendOwnerEvent(runDir: string, event: Record<string, unknown>): void {
  appendFileSync(
    join(runDir, 'events.jsonl'),
    `${JSON.stringify({ ...event, actor: 'owner', timestamp: new Date().toISOString() })}\n`,
  );
  if (existsSync(join(runDir, 'integrity.json'))) {
    writeIntegritySidecar(runDir);
  }
}

function parkedStoryIdFromCheckpoint(checkpoint: string | undefined): string | null {
  if (!checkpoint?.startsWith('after:') || !checkpoint.endsWith('.parked')) {
    return null;
  }
  return checkpoint.slice('after:'.length, -'.parked'.length);
}

function findLatestParkedRequest(eventsJsonl: string, storyId: string): { requestId?: string; requestKind?: string } {
  let request: { requestId?: string; requestKind?: string } = {};
  for (const parsed of parseEventsJsonl(eventsJsonl)) {
    const event = parsed.event;
    if (event.family !== 'story.parked' || event.storyId !== storyId) {
      continue;
    }
    request = {
      requestId: typeof event.requestId === 'string' ? event.requestId : undefined,
      requestKind: typeof event.requestKind === 'string' ? event.requestKind : undefined,
    };
  }
  return request;
}

function latestOwnerDecision(eventsJsonl: string, storyId: string): OwnerDecisionOutcome | null {
  let outcome: OwnerDecisionOutcome | null = null;
  for (const parsed of parseEventsJsonl(eventsJsonl)) {
    const event = parsed.event;
    if (event.family !== 'owner-decision.recorded' || event.storyId !== storyId) {
      continue;
    }
    if (
      event.outcome === 'approve' ||
      event.outcome === 'reject' ||
      event.outcome === 'override' ||
      event.outcome === 'hand-off'
    ) {
      outcome = event.outcome;
    }
  }
  return outcome;
}

function appendDecisionRefusal(runDir: string, input: DecideRunInput, reason: string): DecideRunResult {
  appendOwnerEvent(runDir, {
    family: 'owner-decision.refused',
    requestedOutcome: input.outcome,
    ...(input.storyId ? { storyId: input.storyId } : {}),
    reason,
  });
  return { runDir, outcome: 'refused', ...(input.storyId ? { storyId: input.storyId } : {}), reason };
}

function appendStopRefusal(runDir: string, reason: string): StopRunResult {
  appendOwnerEvent(runDir, {
    family: 'operator-action.refused',
    action: 'stop',
    reason,
  });
  return { runDir, status: 'refused', reason };
}

function appendStopRequest(runDir: string, reason: string, checkpoint: string | null | undefined): StopRunResult {
  appendOwnerEvent(runDir, {
    family: 'operator-action.requested',
    action: 'stop',
    reason,
  });
  return { runDir, status: 'requested', reason, ...(checkpoint ? { checkpoint } : {}) };
}

function currentSafeCheckpoint(projection: RunProjection): string | null {
  if (projection.safeCheckpoint) {
    return projection.safeCheckpoint;
  }
  const stories = Object.values(projection.stories);
  for (let index = stories.length - 1; index >= 0; index -= 1) {
    const story = stories[index];
    if (!story) {
      continue;
    }
    if (story.state === 'parked') {
      return `after:${story.storyId}.parked`;
    }
    if (story.state === 'done' || story.state === 'blocked' || story.state === 'rejected') {
      return `after:${story.storyId}`;
    }
  }
  return null;
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

      watch: async (input): Promise<WatchProjection> => {
        const { eventsJsonl, runRecord } = readProjectionInputs(input.runDir);
        return projectWatch({ eventsJsonl, runRecord });
      },

      askWhy: async (input): Promise<AskWhyResult> => {
        const { eventsJsonl, runRecord } = readProjectionInputs(input.runDir);
        return askWhyFromEvents({ eventsJsonl, runRecord, storyId: input.storyId });
      },

      acknowledgeNotice: async (input): Promise<NoticeActionResult> => {
        const before = readProjectionInputs(input.runDir);
        assertOwnerAppendAllowed(input.runDir, before.eventsJsonl, 'notice action');
        const existing = projectWatch(before).notices.find((notice) => notice.id === input.noticeId);
        if (!existing) {
          throw new Error(`Notice "${input.noticeId}" is not open for this run`);
        }
        appendOwnerEvent(input.runDir, {
          family: 'notice.acknowledged',
          noticeId: input.noticeId,
        });
        const after = readProjectionInputs(input.runDir);
        const notice = projectWatch(after).notices.find((entry) => entry.id === input.noticeId);
        if (!notice) {
          throw new Error(`Notice "${input.noticeId}" disappeared after acknowledgement`);
        }
        return { runDir: input.runDir, notice };
      },

      snoozeNotice: async (input): Promise<NoticeActionResult> => {
        const before = readProjectionInputs(input.runDir);
        assertOwnerAppendAllowed(input.runDir, before.eventsJsonl, 'notice action');
        const existing = projectWatch(before).notices.find((notice) => notice.id === input.noticeId);
        if (!existing) {
          throw new Error(`Notice "${input.noticeId}" is not open for this run`);
        }
        if (Number.isNaN(Date.parse(input.until))) {
          throw new Error(`Invalid --until timestamp "${input.until}"`);
        }
        appendOwnerEvent(input.runDir, {
          family: 'notice.snoozed',
          noticeId: input.noticeId,
          snoozedUntil: input.until,
        });
        const after = readProjectionInputs(input.runDir);
        const notice = projectWatch(after).notices.find((entry) => entry.id === input.noticeId);
        if (!notice) {
          throw new Error(`Notice "${input.noticeId}" disappeared after snooze`);
        }
        return { runDir: input.runDir, notice };
      },

      decide: async (input): Promise<DecideRunResult> => {
        const before = readProjectionInputs(input.runDir);
        assertOwnerAppendAllowed(input.runDir, before.eventsJsonl, 'owner decision');
        const projection = projectRunEvents(before);
        const routedStoryId = parkedStoryIdFromCheckpoint(projection.safeCheckpoint);
        if (projection.lifecycleState !== 'stopped' || !routedStoryId) {
          return appendDecisionRefusal(input.runDir, input, 'no-routed-decision');
        }
        if (input.storyId && input.storyId !== routedStoryId) {
          return appendDecisionRefusal(input.runDir, input, 'decision-outside-routed-scope');
        }
        const parkedStoryId = input.storyId ?? routedStoryId;
        if (projection.stories[parkedStoryId]?.state !== 'parked') {
          return appendDecisionRefusal(input.runDir, { ...input, storyId: parkedStoryId }, 'decision-not-parked');
        }
        if (latestOwnerDecision(before.eventsJsonl, parkedStoryId)) {
          return appendDecisionRefusal(input.runDir, { ...input, storyId: parkedStoryId }, 'decision-already-recorded');
        }
        if (input.outcome === 'hand-off' && (!input.handedOffTo || input.handedOffTo.trim() === '')) {
          return appendDecisionRefusal(input.runDir, { ...input, storyId: parkedStoryId }, 'missing-hand-off-target');
        }

        const parkedRequest = findLatestParkedRequest(before.eventsJsonl, parkedStoryId);
        appendOwnerEvent(input.runDir, {
          family: 'owner-decision.recorded',
          storyId: parkedStoryId,
          outcome: input.outcome,
          ...parkedRequest,
          ...(input.reason ? { reason: input.reason } : {}),
          ...(input.outcome === 'hand-off' ? { handedOffTo: input.handedOffTo } : {}),
        });
        return { runDir: input.runDir, outcome: input.outcome, storyId: parkedStoryId, reason: input.reason };
      },

      stop: async (input): Promise<StopRunResult> => {
        const before = readProjectionInputs(input.runDir);
        assertOwnerAppendAllowed(input.runDir, before.eventsJsonl, 'operator action');
        const projection = projectRunEvents(before);
        if (projection.lifecycleState === 'stopped' || projection.lifecycleState === 'completed') {
          return appendStopRefusal(input.runDir, `run-already-${projection.lifecycleState}`);
        }
        if (projection.lifecycleState === 'started' || projection.lifecycleState === 'resumed') {
          return appendStopRequest(input.runDir, input.reason ?? 'operator-stop', currentSafeCheckpoint(projection));
        }
        return appendStopRefusal(input.runDir, 'no-safe-stop-checkpoint');
      },

      export: async (input): Promise<ExportRunResult> => exportRun(input),
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
