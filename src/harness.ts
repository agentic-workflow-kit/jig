import { authorizeRequest } from './authorization.js';
import type { CapabilityAttestation, ForgePort } from './ports.js';
import { SubstrateAuthorizationError } from './substrate.js';
import type {
  ConfigDoc,
  PlanInstance,
  PolicyDoc,
  RecordSink,
  ResumePlan,
  RunEvent,
  RunStatus,
  Story,
  Worker,
} from './types.js';

type OwnerDecision = 'approve' | 'reject';

interface OwnerDecisionSource {
  decide(request: unknown, story: unknown): Promise<OwnerDecision>;
}

type StoryExecutionResult =
  | { status: 'success' }
  | { status: 'failure'; stopReason: 'work-item-blocked' | 'unattended-park'; checkpointStoryId: string };

interface HarnessPorts {
  capabilityAttestation?: CapabilityAttestation;
  forge?: ForgePort;
  workspaceIsolation?: PerStoryWorkspaceIsolation;
}

export interface StoryWorkspace {
  storyId: string;
  path: string;
}

export interface PerStoryWorkspaceIsolation {
  allocate(story: Story): StoryWorkspace | { failureToken: 'workspace-collision'; path?: string };
}

export function createInMemoryStoryWorkspaceIsolation(basePath: string): PerStoryWorkspaceIsolation {
  const launchedStoryIds = new Set<string>();

  return {
    allocate: (story) => {
      if (launchedStoryIds.has(story.id)) {
        return {
          failureToken: 'workspace-collision',
          path: `${basePath}/${story.id}`,
        };
      }

      launchedStoryIds.add(story.id);
      return {
        storyId: story.id,
        path: `${basePath}/${story.id}`,
      };
    },
  };
}

const defaultForge: ForgePort = {
  // Keep this tiny duplicate modeled landing adapter local to the harness so core never imports
  // reference provider implementations just to preserve the default dry-run behavior.
  land: (request) => ({
    family: 'runner-action.skipped-on-dry-run',
    storyId: request.storyId,
    action: request.action,
    reason: request.reason ?? 'dry-run',
  }),
};

function modeledLandingEvent(request: {
  storyId: string;
  action: 'push|open-pr|merge';
  reason: 'dry-run';
}): Pick<RunEvent, 'family'> & Partial<RunEvent> {
  return {
    family: 'runner-action.skipped-on-dry-run',
    storyId: request.storyId,
    action: request.action,
    reason: request.reason,
  };
}

export class LocalHarness {
  private readonly worker: Worker;
  private readonly recordManager: RecordSink;
  private readonly ownerDecisionSource: OwnerDecisionSource | null;
  private readonly capabilityAttestation: CapabilityAttestation | undefined;
  private readonly forge: ForgePort;
  private readonly workspaceIsolation: PerStoryWorkspaceIsolation | undefined;

  constructor(
    worker: Worker,
    recordManager: RecordSink,
    ownerDecisionSource: OwnerDecisionSource | null = null,
    ports: HarnessPorts = {},
  ) {
    this.worker = worker;
    this.recordManager = recordManager;
    this.ownerDecisionSource = ownerDecisionSource;
    this.capabilityAttestation = ports.capabilityAttestation;
    this.forge = ports.forge ?? defaultForge;
    this.workspaceIsolation = ports.workspaceIsolation;
  }

  async run(planInstance: PlanInstance, config: ConfigDoc, policy: PolicyDoc): Promise<RunStatus> {
    const { plan } = planInstance;
    this.recordManager.init(plan, config, policy);

    this.recordManager.recordEvent({ family: 'run.started' });

    // Enforce local dry-run policy
    if (policy.policy?.rules?.allowLocalDryRun !== true) {
      const reason = 'Policy denial: allowLocalDryRun is not true';
      this.recordManager.recordEvent({
        family: 'authorization.denied',
        reason,
      });
      await this.recordManager.finalize('failure');
      return 'failure';
    }

    let runStatus: RunStatus = 'success';
    const blockedStoryIds = new Set<string>();
    const unstartedStoryIds: string[] = [];
    let checkpointStoryId: string | null = null;
    let stopReason = 'work-item-blocked';
    let hasUnattendedPark = false;
    let unattendedParkCheckpoint: string | null = null;

    if (
      this.workspaceIsolation &&
      plan.stories.length > 1 &&
      plan.stories.every((story) => !Array.isArray(story.dependsOn))
    ) {
      const results = await Promise.all(plan.stories.map((story) => this.executeStory(story, policy, true)));
      const failed = results.find((result) => result.status === 'failure');
      runStatus = failed ? 'failure' : 'success';
      checkpointStoryId = failed?.checkpointStoryId ?? null;
    } else {
      for (const story of plan.stories) {
        const dependsOn = Array.isArray(story.dependsOn) ? (story.dependsOn as string[]) : undefined;
        const blockedBy = dependsOn?.find((depId) => blockedStoryIds.has(depId));

        if (blockedBy) {
          this.recordManager.recordEvent({
            family: 'story.blocked',
            storyId: story.id,
            blockedBy,
          });
          blockedStoryIds.add(story.id); // Transitive blocking
          continue;
        }

        if (runStatus !== 'success') {
          unstartedStoryIds.push(story.id);
          continue;
        }

        const storyResult = await this.executeStory(story, policy, true);
        if (storyResult.status === 'success') {
          continue;
        }

        if (storyResult.stopReason === 'unattended-park') {
          hasUnattendedPark = true;
          stopReason = 'unattended-park';
          unattendedParkCheckpoint = storyResult.checkpointStoryId;
          checkpointStoryId = storyResult.checkpointStoryId;
          blockedStoryIds.add(story.id);
          continue;
        }

        runStatus = 'failure';
        blockedStoryIds.add(story.id);
        checkpointStoryId = storyResult.checkpointStoryId;
      }
    }

    if (hasUnattendedPark) {
      runStatus = 'failure';
      stopReason = 'unattended-park';
      checkpointStoryId = unattendedParkCheckpoint;
    }

    if (runStatus === 'success') {
      this.recordManager.recordEvent({ family: 'run.completed' });
    } else {
      this.recordManager.recordEvent({
        family: 'run.stopped',
        reason: stopReason,
        checkpoint: checkpointStoryId ? `after:${checkpointStoryId}` : undefined,
        unstarted: unstartedStoryIds,
      });
    }

    await this.recordManager.finalize(runStatus);
    return runStatus;
  }

  async resume(planInstance: PlanInstance, policy: PolicyDoc, resumePlan: ResumePlan): Promise<RunStatus> {
    const { plan } = planInstance;
    this.recordManager.recordEvent({
      family: 'run.resumed',
      runId: resumePlan.runId,
      checkpoint: resumePlan.checkpoint,
    });

    if (policy.policy?.rules?.allowLocalDryRun !== true) {
      const reason = 'Policy denial: allowLocalDryRun is not true';
      this.recordManager.recordEvent({
        family: 'authorization.denied',
        reason,
      });
      await this.recordManager.finalize('failure');
      return 'failure';
    }

    let runStatus: RunStatus = 'success';
    const blockedStoryIds = new Set(resumePlan.blockedStoryIds);
    const completedStoryIds = new Set(resumePlan.completedStoryIds);
    const alreadyClosedStoryIds = new Set([...resumePlan.completedStoryIds, ...resumePlan.blockedStoryIds]);
    const unstartedStoryIds: string[] = [];
    let checkpointStoryId: string | null = null;
    let stopReason = 'work-item-blocked';
    let hasUnattendedPark = false;
    let unattendedParkCheckpoint: string | null = null;

    for (const story of plan.stories) {
      const dependsOn = Array.isArray(story.dependsOn) ? (story.dependsOn as string[]) : undefined;
      const blockedBy = dependsOn?.find((depId) => blockedStoryIds.has(depId) || depId === resumePlan.parkedStoryId);

      if (blockedBy) {
        if (!alreadyClosedStoryIds.has(story.id)) {
          this.recordManager.recordEvent({
            family: 'story.blocked',
            storyId: story.id,
            blockedBy,
          });
        }
        blockedStoryIds.add(story.id);
        continue;
      }

      if (alreadyClosedStoryIds.has(story.id)) {
        continue;
      }

      if (story.id === resumePlan.parkedStoryId) {
        if (!this.ownerDecisionSource) {
          hasUnattendedPark = true;
          blockedStoryIds.add(story.id);
          stopReason = 'unattended-park';
          unattendedParkCheckpoint = `${story.id}.parked`;
          checkpointStoryId = unattendedParkCheckpoint;
          continue;
        }

        const ownerDecision = await this.ownerDecisionSource.decide(resumePlan.parkedRequest ?? {}, story);
        if (ownerDecision === 'reject') {
          runStatus = 'failure';
          blockedStoryIds.add(story.id);
          checkpointStoryId = story.id;
          this.recordManager.recordEvent({
            family: 'authorization.denied',
            storyId: story.id,
            requestId: resumePlan.parkedRequest?.requestId,
            requestKind: resumePlan.parkedRequest?.requestKind,
            basis: ['owner-rejection'],
          });
          this.recordManager.recordEvent({
            family: 'story.blocked',
            storyId: story.id,
            reason: 'owner-rejection',
          });
          continue;
        }

        this.recordManager.recordEvent({
          family: 'authorization.granted',
          storyId: story.id,
          requestId: resumePlan.parkedRequest?.requestId,
          requestKind: resumePlan.parkedRequest?.requestKind,
          basis: ['owner-approval'],
        });
      }

      if (runStatus !== 'success') {
        unstartedStoryIds.push(story.id);
        continue;
      }

      const storyResult = await this.executeStory(story, policy, story.id !== resumePlan.parkedStoryId);
      if (storyResult.status === 'success') {
        completedStoryIds.add(story.id);
        continue;
      }

      if (storyResult.stopReason === 'unattended-park') {
        hasUnattendedPark = true;
        stopReason = 'unattended-park';
        unattendedParkCheckpoint = storyResult.checkpointStoryId;
        checkpointStoryId = storyResult.checkpointStoryId;
        blockedStoryIds.add(story.id);
        continue;
      }

      runStatus = 'failure';
      blockedStoryIds.add(story.id);
      checkpointStoryId = storyResult.checkpointStoryId;
    }

    if (hasUnattendedPark) {
      runStatus = 'failure';
      stopReason = 'unattended-park';
      checkpointStoryId = unattendedParkCheckpoint;
    }

    if (runStatus === 'success') {
      this.recordManager.recordEvent({ family: 'run.completed' });
    } else {
      this.recordManager.recordEvent({
        family: 'run.stopped',
        reason: stopReason,
        checkpoint: checkpointStoryId ? `after:${checkpointStoryId}` : undefined,
        unstarted: unstartedStoryIds,
      });
    }

    await this.recordManager.finalize(runStatus);
    return runStatus;
  }

  private async executeStory(story: Story, policy: PolicyDoc, recordStarted: boolean): Promise<StoryExecutionResult> {
    if (recordStarted) {
      this.recordManager.recordEvent({ family: 'story.started', storyId: story.id });
    }

    try {
      const workspace = this.workspaceIsolation?.allocate(story);
      if (workspace && 'failureToken' in workspace) {
        this.recordManager.recordEvent({
          family: 'story.blocked',
          storyId: story.id,
          reason: 'workspace-collision',
          diagnostics: {
            error: 'Duplicate story launch refused',
            failureToken: workspace.failureToken,
          },
        });
        return { status: 'failure', stopReason: 'work-item-blocked', checkpointStoryId: story.id };
      }

      const result = await this.worker.execute(workspace ? { ...story, workspace } : story);
      const requests = Array.isArray(result.requests) ? result.requests : [];

      for (const request of requests) {
        this.recordManager.recordEvent({
          family: 'authorization.requested',
          storyId: story.id,
          requestId: request.id,
          requestKind: request.kind,
        });

        const decision = authorizeRequest(request, story, policy, this.capabilityAttestation);
        if (decision.outcome === 'grant') {
          this.recordManager.recordEvent({
            family: 'authorization.granted',
            storyId: story.id,
            requestId: request.id,
            requestKind: request.kind,
            basis: decision.basis,
          });
          continue;
        }

        if (decision.outcome === 'deny') {
          this.recordManager.recordEvent({
            family: 'authorization.denied',
            storyId: story.id,
            requestId: request.id,
            requestKind: request.kind,
            basis: decision.basis,
          });
          this.recordManager.recordEvent({
            family: 'story.blocked',
            storyId: story.id,
            reason: 'authorization-denied',
            diagnostics: {
              error: `Authorization denied for request "${request.id}"`,
            },
          });
          return { status: 'failure', stopReason: 'work-item-blocked', checkpointStoryId: story.id };
        }

        this.recordManager.recordEvent({
          family: 'authorization.routed',
          storyId: story.id,
          requestId: request.id,
          requestKind: request.kind,
          basis: decision.basis,
        });
        this.recordManager.recordEvent({
          family: 'story.parked',
          storyId: story.id,
          requestId: request.id,
          reason: 'owner-decision-required',
        });

        if (!this.ownerDecisionSource) {
          return { status: 'failure', stopReason: 'unattended-park', checkpointStoryId: `${story.id}.parked` };
        }

        const ownerDecision = await this.ownerDecisionSource.decide(request, story);
        if (ownerDecision === 'approve') {
          this.recordManager.recordEvent({
            family: 'authorization.granted',
            storyId: story.id,
            requestId: request.id,
            requestKind: request.kind,
            basis: ['owner-approval'],
          });
          continue;
        }

        this.recordManager.recordEvent({
          family: 'authorization.denied',
          storyId: story.id,
          requestId: request.id,
          requestKind: request.kind,
          basis: ['owner-rejection'],
        });
        this.recordManager.recordEvent({
          family: 'story.blocked',
          storyId: story.id,
          reason: 'owner-rejection',
        });
        return { status: 'failure', stopReason: 'work-item-blocked', checkpointStoryId: story.id };
      }

      if (!result.evidence || result.evidence.result === undefined) {
        this.recordManager.recordEvent({
          family: 'story.blocked',
          storyId: story.id,
          reason: 'evidence-gate-failed',
          diagnostics: {
            error: 'Worker result missing required evidence or evidence result',
            evidenceResult: null,
          },
        });
        return { status: 'failure', stopReason: 'work-item-blocked', checkpointStoryId: story.id };
      }

      this.recordManager.recordEvent({
        family: 'evidence.modeled',
        storyId: story.id,
        result: result.evidence.result,
        changedFiles: result.changedFiles,
      });

      if (result.outcome !== 'success') {
        this.recordManager.recordEvent({
          family: 'story.blocked',
          storyId: story.id,
          reason: 'worker-reported-failure',
          diagnostics: {
            exitCode: result.exitCode,
            stdout: result.stdout,
            stderr: result.stderr,
            error: result.error,
          },
        });
        return { status: 'failure', stopReason: 'work-item-blocked', checkpointStoryId: story.id };
      }

      if (result.evidence.result === 'passed') {
        this.recordManager.recordEvent({
          family: 'story.done',
          storyId: story.id,
          changedFiles: result.changedFiles,
        });
        const landingRequest = {
          storyId: story.id,
          action: 'push|open-pr|merge',
          reason: 'dry-run',
        } as const;
        await this.forge.land(landingRequest);
        this.recordManager.recordEvent(modeledLandingEvent(landingRequest));
        return { status: 'success' };
      }

      this.recordManager.recordEvent({
        family: 'story.blocked',
        storyId: story.id,
        reason: 'evidence-gate-failed',
        diagnostics: {
          error: 'Worker result evidence did not pass',
          evidenceResult: result.evidence.result,
        },
      });
      return { status: 'failure', stopReason: 'work-item-blocked', checkpointStoryId: story.id };
    } catch (err) {
      if (err instanceof SubstrateAuthorizationError) {
        this.recordManager.recordEvent({
          family: 'story.blocked',
          storyId: story.id,
          reason: 'substrate-escalation',
          diagnostics: {
            error: err.message,
          },
        });
        return { status: 'failure', stopReason: 'work-item-blocked', checkpointStoryId: story.id };
      }

      const message = err instanceof Error ? err.message : String(err);
      this.recordManager.recordEvent({
        family: 'story.blocked',
        storyId: story.id,
        reason: 'worker-execution-error',
        diagnostics: {
          error: message,
        },
      });
      return { status: 'failure', stopReason: 'work-item-blocked', checkpointStoryId: story.id };
    }
  }
}
