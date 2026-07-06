import { isDeepStrictEqual } from 'node:util';
import type { Diagnostics, RunEvent, RunRecord, RunStatus } from './types.js';

export type ProjectionLifecycleState = 'started' | 'resumed' | 'stopped' | 'completed';
export type ProjectionStatus = RunStatus | 'running';
export type ProjectedStoryState = 'unstarted' | 'started' | 'parked' | 'done' | 'blocked' | 'rejected';

export interface WorkspaceFingerprint {
  repoRoot?: string;
  head?: string;
  changeSetHash?: string;
  kind?: string;
  [key: string]: unknown;
}

export interface LaunchBinding {
  policyRef: string;
  configRef: string;
  workspace: WorkspaceFingerprint;
  drivers?: {
    agent: string;
    executionHost: string;
    forge: string;
    workSource: string;
  };
}

export interface RunPosture {
  record: string;
  export: string;
  [key: string]: unknown;
}

export interface ProjectionIssue {
  code: string;
  message: string;
  line?: number;
  offset?: number;
  details?: string[];
}

export type NoticeUrgency = 'info' | 'attention' | 'urgent';
export type NoticeState = 'open' | 'acknowledged' | 'snoozed';

export interface ProjectedNotice extends ProjectionIssue {
  id: string;
  urgency: NoticeUrgency;
  nextAction: string;
  state: NoticeState;
  snoozedUntil?: string;
}

export interface ProjectedStory {
  storyId: string;
  state: ProjectedStoryState;
  reason?: string;
  blockedBy?: string;
  diagnostics?: Diagnostics;
  changedFiles: string[];
  lastEventFamily: string;
}

export interface RoutedDecisionSurface {
  storyId: string;
  requestId?: string;
  requestKind?: string;
}

export interface RunProjection {
  runId: string;
  planId: string;
  mode: string;
  binding: LaunchBinding;
  workspace: WorkspaceFingerprint;
  posture: RunPosture;
  planSnapshotRef: string;
  policySnapshotRef: string;
  status: ProjectionStatus;
  lifecycleState: ProjectionLifecycleState;
  stopCause?: string;
  summaryReason?: string;
  safeCheckpoint?: string;
  routedDecision?: RoutedDecisionSurface;
  unstartedStoryIds: string[];
  stories: Record<string, ProjectedStory>;
  changedFiles: string[];
  diagnostics: ProjectionIssue[];
  notices: ProjectedNotice[];
  eventCount: number;
}

export interface ProjectRunEventsInput {
  eventsJsonl: string;
  runRecord?: RunRecord | null;
}

export interface ParsedEvent {
  event: RunEvent;
  line: number;
  offset: number;
}

export type WatchSignal = 'progressing' | 'idle' | 'parked' | 'blocked' | 'finished';

export interface WatchProjection {
  runId: string;
  status: ProjectionStatus;
  lifecycleState: ProjectionLifecycleState;
  signal: WatchSignal;
  groups: {
    progressing: ProjectedStory[];
    parked: ProjectedStory[];
    blocked: ProjectedStory[];
    done: ProjectedStory[];
    waiting: ProjectedStory[];
  };
  notices: ProjectedNotice[];
  eventCount: number;
}

export interface WhyCitation {
  line: number;
  family: string;
  storyId?: string;
  reason?: string;
  details?: string[];
}

export interface AskWhyResult {
  subject: string;
  answer: string;
  citations: WhyCitation[];
}

export class ProjectionError extends Error {
  readonly code: string;
  readonly line?: number;
  readonly offset?: number;

  constructor(code: string, message: string, context: { line?: number; offset?: number } = {}) {
    super(message);
    this.name = 'ProjectionError';
    this.code = code;
    this.line = context.line;
    this.offset = context.offset;
  }
}

interface StoryAccumulator {
  state: ProjectedStoryState;
  reason?: string;
  blockedBy?: string;
  diagnostics?: Diagnostics;
  changedFiles: string[];
  lastEventFamily: string;
  parkedRequestId?: string;
  parkedRequestKind?: string;
  lastRoutedRequestId?: string;
  lastRoutedRequestKind?: string;
}

const VALID_RECORD_POSTURE = 'safe-for-owner-record';
const VALID_EXPORT_POSTURE = 'redacted';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseEventsJsonl(eventsJsonl: string): ParsedEvent[] {
  const parsedEvents: ParsedEvent[] = [];
  const lines = eventsJsonl.split('\n');
  let offset = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = index + 1;
    const lineOffset = offset;

    if (index === lines.length - 1 && rawLine === '') {
      break;
    }

    if (rawLine.trim() === '') {
      throw new ProjectionError(
        'malformed-jsonl-line',
        `Malformed events.jsonl line ${line}: empty line is not a valid event`,
        {
          line,
          offset: lineOffset,
        },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawLine);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ProjectionError('malformed-jsonl-line', `Malformed events.jsonl line ${line}: ${message}`, {
        line,
        offset: lineOffset,
      });
    }

    if (!isRecord(parsed) || typeof parsed.family !== 'string') {
      throw new ProjectionError(
        'malformed-jsonl-line',
        `Malformed events.jsonl line ${line}: event must be an object with a string family`,
        { line, offset: lineOffset },
      );
    }

    parsedEvents.push({
      event: parsed as RunEvent,
      line,
      offset: lineOffset,
    });
    offset += rawLine.length + 1;
  }

  return parsedEvents;
}

function noticeDetails(parsedEvent: ParsedEvent): string[] | undefined {
  const details: string[] = [];
  if (typeof parsedEvent.event.storyId === 'string') details.push(`story=${parsedEvent.event.storyId}`);
  if (typeof parsedEvent.event.checkpoint === 'string') details.push(`checkpoint=${parsedEvent.event.checkpoint}`);
  if (typeof parsedEvent.event.reason === 'string') details.push(`reason=${parsedEvent.event.reason}`);
  return details.length > 0 ? details : undefined;
}

function createNotice(input: {
  id: string;
  code: string;
  message: string;
  urgency: NoticeUrgency;
  nextAction: string;
  parsedEvent?: ParsedEvent;
}): ProjectedNotice {
  return {
    id: input.id,
    code: input.code,
    message: input.message,
    urgency: input.urgency,
    nextAction: input.nextAction,
    state: 'open',
    ...(input.parsedEvent ? { line: input.parsedEvent.line, offset: input.parsedEvent.offset } : {}),
    ...(input.parsedEvent ? { details: noticeDetails(input.parsedEvent) } : {}),
  };
}

function requireActor(parsedEvent: ParsedEvent): void {
  if (typeof parsedEvent.event.actor !== 'string' || parsedEvent.event.actor.trim() === '') {
    throw new ProjectionError(
      'missing-actor',
      `Event on line ${parsedEvent.line} is missing required actor`,
      parsedEvent,
    );
  }
}

function requireString(
  value: unknown,
  field: string,
  parsedEvent: ParsedEvent,
  errorCode: string = 'missing-launch-metadata',
): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ProjectionError(errorCode, `Missing Phase 4 launch metadata in run.started: ${field}`, parsedEvent);
  }
  return value;
}

function requireObject(
  value: unknown,
  field: string,
  parsedEvent: ParsedEvent,
  errorCode: string = 'missing-launch-metadata',
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ProjectionError(errorCode, `Missing Phase 4 launch metadata in run.started: ${field}`, parsedEvent);
  }
  return value;
}

function readRunPosture(parsedEvent: ParsedEvent, postureRecord: Record<string, unknown>): RunPosture {
  const recordValue =
    typeof postureRecord.record === 'string' && postureRecord.record.trim() !== '' ? postureRecord.record : undefined;

  if (recordValue === undefined) {
    throw new ProjectionError(
      'missing-launch-metadata',
      'Missing Phase 4 launch metadata in run.started: posture.record',
      parsedEvent,
    );
  }

  if (recordValue === 'unknown' || recordValue === 'ambiguous') {
    throw new ProjectionError(
      'invalid-posture',
      `Ambiguous run.started record posture on line ${parsedEvent.line}`,
      parsedEvent,
    );
  }

  if (recordValue !== VALID_RECORD_POSTURE) {
    throw new ProjectionError(
      'invalid-posture',
      `Unsupported run.started record posture "${recordValue}" on line ${parsedEvent.line}`,
      parsedEvent,
    );
  }

  const exportPosture = requireString(postureRecord.export, 'posture.export', parsedEvent);
  if (exportPosture === 'unknown' || exportPosture === 'ambiguous') {
    throw new ProjectionError(
      'invalid-posture',
      `Ambiguous run.started export posture on line ${parsedEvent.line}`,
      parsedEvent,
    );
  }

  if (exportPosture !== VALID_EXPORT_POSTURE) {
    throw new ProjectionError(
      'invalid-posture',
      `Unsupported run.started export posture "${exportPosture}" on line ${parsedEvent.line}`,
      parsedEvent,
    );
  }

  return {
    ...postureRecord,
    record: recordValue,
    export: exportPosture,
  };
}

function readLaunchDrivers(
  parsedEvent: ParsedEvent,
  driversRecord: Record<string, unknown> | undefined,
): LaunchBinding['drivers'] {
  if (!driversRecord) {
    return undefined;
  }

  return {
    agent: requireString(driversRecord.agent, 'binding.drivers.agent', parsedEvent),
    executionHost: requireString(driversRecord.executionHost, 'binding.drivers.executionHost', parsedEvent),
    forge: requireString(driversRecord.forge, 'binding.drivers.forge', parsedEvent),
    workSource: requireString(driversRecord.workSource, 'binding.drivers.workSource', parsedEvent),
  };
}

function readLaunchHeader(
  parsedEvent: ParsedEvent,
): Omit<
  RunProjection,
  | 'status'
  | 'lifecycleState'
  | 'stopCause'
  | 'safeCheckpoint'
  | 'unstartedStoryIds'
  | 'stories'
  | 'changedFiles'
  | 'diagnostics'
  | 'notices'
  | 'eventCount'
> {
  if (parsedEvent.event.family !== 'run.started') {
    throw new ProjectionError(
      'missing-launch-metadata',
      'events.jsonl must start with a Phase 4 run.started launch header',
      parsedEvent,
    );
  }

  const runId = requireString(parsedEvent.event.runId, 'runId', parsedEvent);
  const planId = requireString(parsedEvent.event.planId, 'planId', parsedEvent);
  const mode = requireString(parsedEvent.event.mode, 'mode', parsedEvent);
  const bindingRecord = requireObject(parsedEvent.event.binding, 'binding', parsedEvent);
  const workspaceRecord = requireObject(bindingRecord.workspace, 'binding.workspace', parsedEvent);
  const postureRecord = requireObject(parsedEvent.event.posture, 'posture', parsedEvent);
  const planSnapshotRecord = isRecord(parsedEvent.event.planSnapshot) ? parsedEvent.event.planSnapshot : undefined;
  const policySnapshotRecord = isRecord(parsedEvent.event.policySnapshot)
    ? parsedEvent.event.policySnapshot
    : undefined;

  const workspace =
    workspaceRecord.kind === 'unavailable'
      ? (workspaceRecord as WorkspaceFingerprint)
      : {
          ...workspaceRecord,
          repoRoot: requireString(workspaceRecord.repoRoot, 'binding.workspace.repoRoot', parsedEvent),
          head: requireString(workspaceRecord.head, 'binding.workspace.head', parsedEvent),
          changeSetHash: requireString(workspaceRecord.changeSetHash, 'binding.workspace.changeSetHash', parsedEvent),
        };

  const binding: LaunchBinding = {
    policyRef: requireString(bindingRecord.policyRef, 'binding.policyRef', parsedEvent),
    configRef: requireString(bindingRecord.configRef, 'binding.configRef', parsedEvent),
    workspace,
    ...(bindingRecord.drivers !== undefined
      ? {
          drivers: readLaunchDrivers(parsedEvent, requireObject(bindingRecord.drivers, 'binding.drivers', parsedEvent)),
        }
      : {}),
  };

  const posture = readRunPosture(parsedEvent, postureRecord);

  return {
    runId,
    planId,
    mode,
    binding,
    workspace: binding.workspace,
    posture,
    planSnapshotRef: requireString(planSnapshotRecord?.ref, 'planSnapshot.ref', parsedEvent),
    policySnapshotRef: requireString(policySnapshotRecord?.ref, 'policySnapshot.ref', parsedEvent),
  };
}

function getOrCreateStory(stories: Map<string, StoryAccumulator>, storyId: string): StoryAccumulator {
  const existing = stories.get(storyId);
  if (existing) {
    return existing;
  }

  const created: StoryAccumulator = {
    state: 'unstarted',
    changedFiles: [],
    lastEventFamily: 'story.unstarted',
  };
  stories.set(storyId, created);
  return created;
}

function appendChangedFiles(target: string[], value: unknown): void {
  if (!Array.isArray(value)) {
    return;
  }

  for (const entry of value) {
    if (typeof entry === 'string' && !target.includes(entry)) {
      target.push(entry);
    }
  }
}

function requireStoryId(parsedEvent: ParsedEvent): string {
  if (typeof parsedEvent.event.storyId !== 'string' || parsedEvent.event.storyId.trim() === '') {
    throw new ProjectionError(
      'missing-story-id',
      `Event family ${parsedEvent.event.family} on line ${parsedEvent.line} is missing required storyId`,
      parsedEvent,
    );
  }
  return parsedEvent.event.storyId;
}

function assertActiveRun(lifecycleState: ProjectionLifecycleState, parsedEvent: ParsedEvent): void {
  if (lifecycleState === 'completed') {
    throw new ProjectionError(
      'illegal-transition',
      `Illegal event ${parsedEvent.event.family} after run.completed on line ${parsedEvent.line}`,
      parsedEvent,
    );
  }

  if (lifecycleState === 'stopped' && parsedEvent.event.family !== 'run.resumed') {
    throw new ProjectionError(
      'illegal-transition',
      `Illegal event ${parsedEvent.event.family} after run.stopped on line ${parsedEvent.line}`,
      parsedEvent,
    );
  }
}

function assertStoryState(
  story: StoryAccumulator,
  allowedStates: ProjectedStoryState[],
  parsedEvent: ParsedEvent,
  storyId: string,
): void {
  if (!allowedStates.includes(story.state)) {
    throw new ProjectionError(
      'illegal-transition',
      `Illegal replay transition for ${storyId}: ${story.state} -> ${parsedEvent.event.family}`,
      parsedEvent,
    );
  }
}

function compareRunRecord(
  runRecord: RunRecord | null | undefined,
  projection: RunProjection,
  parsedEvents: ParsedEvent[],
): ProjectionIssue[] {
  if (!runRecord) {
    return [];
  }

  const staleDetails: string[] = [];

  if (runRecord.run.id !== projection.runId) staleDetails.push('run.id');
  if (runRecord.run.planId !== projection.planId) staleDetails.push('run.planId');
  if (runRecord.run.status !== projection.status) staleDetails.push('run.status');
  if (runRecord.run.mode !== undefined && runRecord.run.mode !== projection.mode) staleDetails.push('run.mode');
  if (runRecord.run.planSnapshot?.ref !== undefined && runRecord.run.planSnapshot.ref !== projection.planSnapshotRef) {
    staleDetails.push('run.planSnapshot.ref');
  }
  if (
    runRecord.run.policySnapshot?.ref !== undefined &&
    runRecord.run.policySnapshot.ref !== projection.policySnapshotRef
  ) {
    staleDetails.push('run.policySnapshot.ref');
  }
  if (
    runRecord.run.binding.policyRef !== undefined &&
    runRecord.run.binding.policyRef !== projection.binding.policyRef
  ) {
    staleDetails.push('run.binding.policyRef');
  }
  if (runRecord.run.binding.configRef !== projection.binding.configRef) staleDetails.push('run.binding.configRef');

  const runBindingRecord = runRecord.run.binding as unknown as Record<string, unknown>;
  if (
    runBindingRecord.workspace !== undefined &&
    !isDeepStrictEqual(runBindingRecord.workspace, projection.workspace)
  ) {
    staleDetails.push('run.binding.workspace');
  }
  if (
    runBindingRecord.drivers !== undefined &&
    !isDeepStrictEqual(runBindingRecord.drivers, projection.binding.drivers)
  ) {
    staleDetails.push('run.binding.drivers');
  }

  const eventCache = Array.isArray(runRecord.events) ? runRecord.events : [];
  const authoritativeEvents = parsedEvents.map((entry) => entry.event);
  if (!isDeepStrictEqual(eventCache, authoritativeEvents)) {
    staleDetails.push('events');
  }

  if (staleDetails.length === 0) {
    return [];
  }

  return [
    {
      code: 'run.json-stale',
      message: 'run.json conflicts with authoritative events.jsonl; projection uses the log',
      details: staleDetails,
    },
  ];
}

function parkedStoryIdFromCheckpoint(checkpoint: string | undefined): string | null {
  if (!checkpoint?.startsWith('after:') || !checkpoint.endsWith('.parked')) {
    return null;
  }
  return checkpoint.slice('after:'.length, -'.parked'.length);
}

function deriveRoutedDecision(
  lifecycleState: ProjectionLifecycleState,
  safeCheckpoint: string | undefined,
  stories: Map<string, StoryAccumulator>,
  parkOrder: string[],
): RoutedDecisionSurface | undefined {
  const routedStoryId =
    lifecycleState === 'started' || lifecycleState === 'resumed'
      ? [...parkOrder].reverse().find((storyId) => stories.get(storyId)?.state === 'parked')
      : lifecycleState === 'stopped'
        ? (parkedStoryIdFromCheckpoint(safeCheckpoint) ?? undefined)
        : undefined;
  if (!routedStoryId) {
    return undefined;
  }

  // For stopped runs the checkpoint names the routed story even if a crafted log leaves it
  // non-parked; decide() still owns the decision-not-parked refusal for that case.
  const story = stories.get(routedStoryId);
  return {
    storyId: routedStoryId,
    ...(story?.parkedRequestId ? { requestId: story.parkedRequestId } : {}),
    ...(story?.parkedRequestKind ? { requestKind: story.parkedRequestKind } : {}),
  };
}

function checkpointMatchesStory(stories: Map<string, StoryAccumulator>, checkpoint: string): boolean {
  if (!checkpoint.startsWith('after:')) {
    return false;
  }

  const target = checkpoint.slice('after:'.length);
  if (target.endsWith('.parked')) {
    const story = stories.get(target.slice(0, -'.parked'.length));
    return story?.state === 'parked';
  }

  const story = stories.get(target);
  return story !== undefined && ['done', 'blocked', 'rejected'].includes(story.state);
}

export function projectRunEvents(input: ProjectRunEventsInput): RunProjection {
  const parsedEvents = parseEventsJsonl(input.eventsJsonl);
  if (parsedEvents.length === 0) {
    throw new ProjectionError('missing-launch-metadata', 'events.jsonl is empty and cannot be projected');
  }

  requireActor(parsedEvents[0]);
  const launch = readLaunchHeader(parsedEvents[0]);
  const diagnostics: ProjectionIssue[] = [];
  const notices: ProjectedNotice[] = [];
  const noticeAttention = new Map<string, { state: NoticeState; snoozedUntil?: string }>();
  const stories = new Map<string, StoryAccumulator>();
  const changedFiles: string[] = [];

  let lifecycleState: ProjectionLifecycleState = 'started';
  let status: ProjectionStatus = 'running';
  let stopCause: string | undefined;
  let summaryReason: string | undefined;
  let safeCheckpoint: string | undefined;
  let unstartedStoryIds: string[] = [];
  let parkOrder: string[] = [];
  let sawEvidenceGateFailure = false;
  let sawAuthorizationDenial = false;

  for (const parsedEvent of parsedEvents.slice(1)) {
    requireActor(parsedEvent);

    const family = parsedEvent.event.family;

    if (family === 'run.started') {
      throw new ProjectionError(
        'illegal-transition',
        `Illegal second run.started launch header on line ${parsedEvent.line}`,
        parsedEvent,
      );
    }

    if (family === 'run.resumed') {
      if (lifecycleState !== 'stopped') {
        throw new ProjectionError(
          'illegal-transition',
          `Illegal run.resumed from ${lifecycleState} on line ${parsedEvent.line}`,
          parsedEvent,
        );
      }

      lifecycleState = 'resumed';
      status = 'running';
      stopCause = undefined;
      safeCheckpoint = undefined;
      unstartedStoryIds = [];
      for (const story of stories.values()) {
        if (story.state === 'started') {
          story.state = 'unstarted';
          story.reason = undefined;
          story.blockedBy = undefined;
          story.diagnostics = undefined;
          story.lastEventFamily = 'story.unstarted';
        }
      }
      continue;
    }

    if (family === 'run.completed') {
      if (lifecycleState !== 'started' && lifecycleState !== 'resumed') {
        throw new ProjectionError(
          'illegal-transition',
          `Illegal run.completed from ${lifecycleState} on line ${parsedEvent.line}`,
          parsedEvent,
        );
      }

      lifecycleState = 'completed';
      status = 'success';
      stopCause = undefined;
      safeCheckpoint = undefined;
      unstartedStoryIds = [];
      continue;
    }

    if (family === 'run.stopped') {
      if (lifecycleState !== 'started' && lifecycleState !== 'resumed') {
        throw new ProjectionError(
          'illegal-transition',
          `Illegal run.stopped from ${lifecycleState} on line ${parsedEvent.line}`,
          parsedEvent,
        );
      }

      if (typeof parsedEvent.event.checkpoint !== 'string' || parsedEvent.event.checkpoint.trim() === '') {
        throw new ProjectionError(
          'missing-stop-checkpoint',
          `run.stopped on line ${parsedEvent.line} is missing required checkpoint`,
          parsedEvent,
        );
      }

      if (!checkpointMatchesStory(stories, parsedEvent.event.checkpoint)) {
        throw new ProjectionError(
          'illegal-transition',
          `run.stopped checkpoint ${parsedEvent.event.checkpoint} does not match a safe projected story state`,
          parsedEvent,
        );
      }

      lifecycleState = 'stopped';
      status = 'failure';
      stopCause = typeof parsedEvent.event.reason === 'string' ? parsedEvent.event.reason : 'unknown-stop-cause';
      safeCheckpoint = parsedEvent.event.checkpoint;
      unstartedStoryIds = Array.isArray(parsedEvent.event.unstarted)
        ? parsedEvent.event.unstarted.filter((storyId): storyId is string => typeof storyId === 'string')
        : [];
      continue;
    }

    if (
      parsedEvent.event.storyId === undefined &&
      (family === 'authorization.denied' || family === 'authorization.granted')
    ) {
      if (family === 'authorization.denied') {
        sawAuthorizationDenial = true;
      }
      if (typeof parsedEvent.event.reason === 'string' && parsedEvent.event.reason.trim() !== '') {
        summaryReason = parsedEvent.event.reason;
        if (family === 'authorization.denied') {
          status = 'failure';
        }
      }
      continue;
    }

    if (family === 'notice.acknowledged' || family === 'notice.snoozed') {
      if (parsedEvent.event.actor !== 'owner') {
        throw new ProjectionError(
          'invalid-notice-actor',
          `${family} on line ${parsedEvent.line} must be recorded by actor owner`,
          parsedEvent,
        );
      }
      if (typeof parsedEvent.event.noticeId !== 'string' || parsedEvent.event.noticeId.trim() === '') {
        throw new ProjectionError(
          'missing-notice-id',
          `${family} on line ${parsedEvent.line} is missing required noticeId`,
          parsedEvent,
        );
      }
      if (
        family === 'notice.snoozed' &&
        (typeof parsedEvent.event.snoozedUntil !== 'string' || parsedEvent.event.snoozedUntil.trim() === '')
      ) {
        throw new ProjectionError(
          'missing-snoozed-until',
          `${family} on line ${parsedEvent.line} is missing required snoozedUntil`,
          parsedEvent,
        );
      }
      noticeAttention.set(parsedEvent.event.noticeId, {
        state: family === 'notice.acknowledged' ? 'acknowledged' : 'snoozed',
        ...(typeof parsedEvent.event.snoozedUntil === 'string' ? { snoozedUntil: parsedEvent.event.snoozedUntil } : {}),
      });
      continue;
    }

    if (family === 'owner-decision.recorded' || family === 'owner-decision.refused') {
      if (parsedEvent.event.actor !== 'owner') {
        throw new ProjectionError(
          'invalid-owner-decision-actor',
          `${family} on line ${parsedEvent.line} must be recorded by actor owner`,
          parsedEvent,
        );
      }
      if (
        family === 'owner-decision.recorded' &&
        (typeof parsedEvent.event.storyId !== 'string' || parsedEvent.event.storyId.trim() === '')
      ) {
        throw new ProjectionError(
          'missing-story-id',
          `${family} on line ${parsedEvent.line} is missing required storyId`,
          parsedEvent,
        );
      }
      continue;
    }

    if (family === 'operator-action.requested' || family === 'operator-action.refused') {
      continue;
    }

    assertActiveRun(lifecycleState, parsedEvent);

    const storyId = requireStoryId(parsedEvent);
    const story = getOrCreateStory(stories, storyId);

    switch (family) {
      case 'story.started':
        assertStoryState(story, ['unstarted', 'parked'], parsedEvent, storyId);
        story.state = 'started';
        story.reason = undefined;
        story.blockedBy = undefined;
        story.lastEventFamily = family;
        break;
      case 'authorization.requested':
        assertStoryState(story, ['started'], parsedEvent, storyId);
        story.lastEventFamily = family;
        break;
      case 'authorization.granted':
        assertStoryState(story, ['started', 'parked'], parsedEvent, storyId);
        story.state = 'started';
        story.lastEventFamily = family;
        break;
      case 'authorization.denied':
        assertStoryState(story, ['started', 'parked'], parsedEvent, storyId);
        sawAuthorizationDenial = true;
        story.lastEventFamily = family;
        break;
      case 'authorization.routed':
        // A routed record is legal while parked too: hand-off re-targets the already-parked
        // routed question (ADR 0031) without changing the story state.
        assertStoryState(story, ['started', 'parked'], parsedEvent, storyId);
        story.lastRoutedRequestId =
          typeof parsedEvent.event.requestId === 'string' ? parsedEvent.event.requestId : undefined;
        story.lastRoutedRequestKind =
          typeof parsedEvent.event.requestKind === 'string' ? parsedEvent.event.requestKind : undefined;
        story.lastEventFamily = family;
        break;
      case 'story.parked': {
        assertStoryState(story, ['started'], parsedEvent, storyId);
        story.state = 'parked';
        story.reason = typeof parsedEvent.event.reason === 'string' ? parsedEvent.event.reason : undefined;
        const parkedRequestId =
          typeof parsedEvent.event.requestId === 'string' ? parsedEvent.event.requestId : undefined;
        story.parkedRequestId = parkedRequestId ?? story.lastRoutedRequestId;
        story.parkedRequestKind =
          typeof parsedEvent.event.requestKind === 'string'
            ? parsedEvent.event.requestKind
            : parkedRequestId === undefined || parkedRequestId === story.lastRoutedRequestId
              ? story.lastRoutedRequestKind
              : undefined;
        story.lastEventFamily = family;
        parkOrder = [...parkOrder.filter((parkedStoryId) => parkedStoryId !== storyId), storyId];
        break;
      }
      case 'evidence.modeled':
        assertStoryState(story, ['started'], parsedEvent, storyId);
        appendChangedFiles(story.changedFiles, parsedEvent.event.changedFiles);
        appendChangedFiles(changedFiles, parsedEvent.event.changedFiles);
        story.lastEventFamily = family;
        break;
      case 'story.done':
        assertStoryState(
          story,
          story.state === 'done' &&
            (typeof parsedEvent.event.mergeability === 'string' ||
              typeof parsedEvent.event.targetRef === 'string' ||
              typeof parsedEvent.event.targetHead === 'string')
            ? ['started', 'done']
            : ['started'],
          parsedEvent,
          storyId,
        );
        story.state = 'done';
        appendChangedFiles(story.changedFiles, parsedEvent.event.changedFiles);
        appendChangedFiles(changedFiles, parsedEvent.event.changedFiles);
        if (parsedEvent.event.diagnostics) {
          story.diagnostics = parsedEvent.event.diagnostics;
        }
        story.lastEventFamily = family;
        break;
      case 'story.blocked':
        if (parsedEvent.event.blockedBy !== undefined) {
          assertStoryState(story, ['unstarted'], parsedEvent, storyId);
        } else if (parsedEvent.event.reason === 'workspace-collision') {
          assertStoryState(story, ['unstarted', 'started', 'parked'], parsedEvent, storyId);
        } else if (parsedEvent.event.reason === 'pr-surfacing-failed') {
          assertStoryState(story, ['blocked'], parsedEvent, storyId);
        } else {
          assertStoryState(story, ['started', 'parked'], parsedEvent, storyId);
        }
        story.state = 'blocked';
        story.reason = typeof parsedEvent.event.reason === 'string' ? parsedEvent.event.reason : undefined;
        story.blockedBy = typeof parsedEvent.event.blockedBy === 'string' ? parsedEvent.event.blockedBy : undefined;
        story.diagnostics = parsedEvent.event.diagnostics;
        story.lastEventFamily = family;
        if (parsedEvent.event.reason === 'evidence-gate-failed') {
          sawEvidenceGateFailure = true;
        }
        if (parsedEvent.event.reason === 'authorization-denied' || parsedEvent.event.reason === 'owner-rejection') {
          sawAuthorizationDenial = true;
        }
        break;
      case 'runner-action.skipped-on-dry-run':
        assertStoryState(story, ['done'], parsedEvent, storyId);
        story.lastEventFamily = family;
        break;
      case 'runner-action.pushed':
      case 'runner-action.merged':
      case 'runner-action.skipped-repeated-effect':
        assertStoryState(story, ['done'], parsedEvent, storyId);
        story.lastEventFamily = family;
        break;
      case 'runner-action.opened-pr':
        assertStoryState(story, ['done', 'blocked'], parsedEvent, storyId);
        story.lastEventFamily = family;
        break;
      case 'runner-action.posted-status':
      case 'runner-action.posted-comment':
        assertStoryState(story, ['blocked'], parsedEvent, storyId);
        story.lastEventFamily = family;
        break;
      default:
        throw new ProjectionError(
          'illegal-transition',
          `Unsupported event family ${family} on line ${parsedEvent.line}`,
          parsedEvent,
        );
    }
  }

  if (stopCause === 'unattended-park') {
    const stopEvent = parsedEvents.find(
      (entry) => entry.event.family === 'run.stopped' && entry.event.reason === stopCause,
    );
    notices.push(
      createNotice({
        id: 'unattended-park',
        code: 'unattended-park',
        message: 'run stopped at an unattended parked story',
        urgency: 'urgent',
        nextAction: 'review the parked authorization request and resume or stop the run',
        parsedEvent: stopEvent,
      }),
    );
  }

  if (sawEvidenceGateFailure) {
    const evidenceEvent = parsedEvents.find(
      (entry) => entry.event.family === 'story.blocked' && entry.event.reason === 'evidence-gate-failed',
    );
    notices.push(
      createNotice({
        id: 'evidence-gate-failure',
        code: 'evidence-gate-failure',
        message: 'projection found a story blocked by the evidence gate',
        urgency: 'attention',
        nextAction: 'inspect the evidence diagnostics before continuing',
        parsedEvent: evidenceEvent,
      }),
    );
  }

  if (sawAuthorizationDenial) {
    const denialEvent = parsedEvents.find(
      (entry) =>
        entry.event.family === 'authorization.denied' ||
        (entry.event.family === 'story.blocked' &&
          (entry.event.reason === 'authorization-denied' || entry.event.reason === 'owner-rejection')),
    );
    notices.push(
      createNotice({
        id: 'policy-authorization-denial',
        code: 'policy-authorization-denial',
        message: 'projection found a policy or authorization denial',
        urgency: 'attention',
        nextAction: 'review the denied request and policy basis',
        parsedEvent: denialEvent,
      }),
    );
  }

  for (const notice of notices) {
    const attention = noticeAttention.get(notice.id);
    if (attention) {
      notice.state = attention.state;
      if (attention.snoozedUntil) {
        notice.snoozedUntil = attention.snoozedUntil;
      }
    }
  }

  const projection: RunProjection = {
    ...launch,
    status,
    lifecycleState,
    stopCause,
    summaryReason,
    safeCheckpoint,
    routedDecision: deriveRoutedDecision(lifecycleState, safeCheckpoint, stories, parkOrder),
    unstartedStoryIds,
    stories: Object.fromEntries(
      Array.from(stories.entries()).map(([storyId, story]) => [
        storyId,
        {
          storyId,
          state: story.state,
          reason: story.reason,
          blockedBy: story.blockedBy,
          diagnostics: story.diagnostics,
          changedFiles: story.changedFiles,
          lastEventFamily: story.lastEventFamily,
        },
      ]),
    ),
    changedFiles,
    diagnostics,
    notices,
    eventCount: parsedEvents.length,
  };

  projection.diagnostics.push(...compareRunRecord(input.runRecord, projection, parsedEvents));

  return projection;
}

export function projectWatch(input: ProjectRunEventsInput): WatchProjection {
  const projection = projectRunEvents(input);
  const stories = Object.values(projection.stories);
  const projectedStoryIds = new Set(stories.map((story) => story.storyId));
  const groups = {
    progressing: stories.filter((story) => story.state === 'started'),
    parked: stories.filter((story) => story.state === 'parked'),
    blocked: stories.filter((story) => story.state === 'blocked' || story.state === 'rejected'),
    done: stories.filter((story) => story.state === 'done'),
    waiting: [
      ...stories.filter((story) => story.state === 'unstarted'),
      ...projection.unstartedStoryIds
        .filter((storyId) => !projectedStoryIds.has(storyId))
        .map(
          (storyId): ProjectedStory => ({
            storyId,
            state: 'unstarted',
            reason: projection.stopCause,
            changedFiles: [],
            lastEventFamily: 'run.stopped',
          }),
        ),
    ],
  };
  const signal: WatchSignal =
    projection.lifecycleState === 'completed'
      ? 'finished'
      : groups.blocked.length > 0
        ? 'blocked'
        : groups.parked.length > 0
          ? 'parked'
          : groups.progressing.length > 0
            ? 'progressing'
            : 'idle';

  return {
    runId: projection.runId,
    status: projection.status,
    lifecycleState: projection.lifecycleState,
    signal,
    groups,
    notices: projection.notices,
    eventCount: projection.eventCount,
  };
}

function citationFromEvent(parsedEvent: ParsedEvent): WhyCitation {
  const details: string[] = [];
  if (typeof parsedEvent.event.requestId === 'string') details.push(`request=${parsedEvent.event.requestId}`);
  if (typeof parsedEvent.event.requestKind === 'string') details.push(`kind=${parsedEvent.event.requestKind}`);
  if (Array.isArray(parsedEvent.event.basis)) {
    details.push(`basis=${parsedEvent.event.basis.filter((entry) => typeof entry === 'string').join(',')}`);
  }
  if (Array.isArray(parsedEvent.event.changedFiles))
    details.push(`changed=${parsedEvent.event.changedFiles.join(',')}`);

  return {
    line: parsedEvent.line,
    family: parsedEvent.event.family,
    ...(typeof parsedEvent.event.storyId === 'string' ? { storyId: parsedEvent.event.storyId } : {}),
    ...(typeof parsedEvent.event.reason === 'string' ? { reason: parsedEvent.event.reason } : {}),
    ...(details.length > 0 ? { details } : {}),
  };
}

function describeStoryWhy(story: ProjectedStory, citations: WhyCitation[]): string {
  if (story.state === 'blocked') {
    const cause = story.blockedBy ? `blocked by ${story.blockedBy}` : (story.reason ?? 'a recorded block');
    return `${story.storyId} is blocked because ${cause}.`;
  }
  if (story.state === 'parked') {
    return `${story.storyId} is parked waiting for owner attention${story.reason ? ` (${story.reason})` : ''}.`;
  }
  if (story.state === 'done') {
    const landing = citations.find((citation) =>
      ['runner-action.pushed', 'runner-action.opened-pr', 'runner-action.merged'].includes(citation.family),
    );
    if (landing) {
      return `${story.storyId} is done and has recorded landing activity (${landing.family}).`;
    }
    return `${story.storyId} is done because its recorded evidence and story.done transition completed.`;
  }
  if (story.state === 'started') {
    return `${story.storyId} is progressing; the latest recorded transition is ${story.lastEventFamily}.`;
  }
  return `${story.storyId} is waiting; no terminal record has been appended yet.`;
}

export function askWhyFromEvents(input: ProjectRunEventsInput & { storyId?: string }): AskWhyResult {
  const parsedEvents = parseEventsJsonl(input.eventsJsonl);
  const projection = projectRunEvents(input);

  if (input.storyId) {
    const story = projection.stories[input.storyId];
    if (!story) {
      throw new ProjectionError('unknown-story', `No recorded story "${input.storyId}" exists in this run`);
    }
    const citations = parsedEvents
      .filter((entry) => entry.event.storyId === input.storyId)
      .filter((entry) =>
        [
          'authorization.requested',
          'authorization.granted',
          'authorization.denied',
          'authorization.routed',
          'owner-decision.recorded',
          'owner-decision.refused',
          'operator-action.requested',
          'operator-action.refused',
          'story.parked',
          'evidence.modeled',
          'story.done',
          'story.blocked',
          'runner-action.pushed',
          'runner-action.opened-pr',
          'runner-action.merged',
        ].includes(entry.event.family),
      )
      .map(citationFromEvent);
    return {
      subject: input.storyId,
      answer: describeStoryWhy(story, citations),
      citations,
    };
  }

  const runCitations = parsedEvents
    .filter((entry) => ['run.completed', 'run.stopped', 'authorization.denied'].includes(entry.event.family))
    .map(citationFromEvent);
  const summary =
    projection.lifecycleState === 'completed'
      ? 'The run completed because run.completed is recorded.'
      : projection.lifecycleState === 'stopped'
        ? `The run stopped at ${projection.safeCheckpoint ?? 'an unknown checkpoint'} because ${
            projection.stopCause ?? 'the record says it stopped'
          }.`
        : `The run is ${projection.lifecycleState}; no terminal run record is present yet.`;
  return {
    subject: projection.runId,
    answer: summary,
    citations: runCitations,
  };
}
