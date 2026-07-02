import { authorizeRequest } from './authorization.js';
import type { ConfigDoc, PlanInstance, PolicyDoc, RecordSink, RunStatus, Worker } from './types.js';

type OwnerDecision = 'approve' | 'reject';

interface OwnerDecisionSource {
  decide(request: unknown, story: unknown): Promise<OwnerDecision>;
}

export class LocalHarness {
  private readonly worker: Worker;
  private readonly recordManager: RecordSink;
  private readonly ownerDecisionSource: OwnerDecisionSource | null;

  constructor(worker: Worker, recordManager: RecordSink, ownerDecisionSource: OwnerDecisionSource | null = null) {
    this.worker = worker;
    this.recordManager = recordManager;
    this.ownerDecisionSource = ownerDecisionSource;
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
    const completedStoryIds = new Set<string>();
    const unstartedStoryIds: string[] = [];
    let checkpointStoryId: string | null = null;
    let stopReason = 'work-item-blocked';
    let hasUnattendedPark = false;
    let unattendedParkCheckpoint: string | null = null;

    for (let i = 0; i < plan.stories.length; i++) {
      const story = plan.stories[i];

      if (runStatus !== 'success') {
        const dependsOn = Array.isArray(story.dependsOn) ? (story.dependsOn as string[]) : undefined;
        const isBlocked = dependsOn?.some((depId) => blockedStoryIds.has(depId));
        if (isBlocked) {
          const blockedBy = dependsOn?.find((depId) => blockedStoryIds.has(depId));
          this.recordManager.recordEvent({
            family: 'story.blocked',
            storyId: story.id,
            blockedBy,
          });
          blockedStoryIds.add(story.id); // Transitive blocking
        } else {
          unstartedStoryIds.push(story.id);
        }
        continue;
      }

      this.recordManager.recordEvent({ family: 'story.started', storyId: story.id });

      try {
        const result = await this.worker.execute(story);
        const requests = Array.isArray(result.requests) ? result.requests : [];

        let requestHaltedStory = false;
        for (const request of requests) {
          this.recordManager.recordEvent({
            family: 'authorization.requested',
            storyId: story.id,
            requestId: request.id,
            requestKind: request.kind,
          });

          const decision = authorizeRequest(request, story, policy);
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
            runStatus = 'failure';
            requestHaltedStory = true;
            blockedStoryIds.add(story.id);
            checkpointStoryId = story.id;
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
            break;
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
            hasUnattendedPark = true;
            requestHaltedStory = true;
            stopReason = 'unattended-park';
            unattendedParkCheckpoint = `${story.id}.parked`;
            checkpointStoryId = unattendedParkCheckpoint;
            break;
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

          runStatus = 'failure';
          requestHaltedStory = true;
          blockedStoryIds.add(story.id);
          checkpointStoryId = story.id;
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
          break;
        }

        if (requestHaltedStory) {
          continue;
        }

        // Validate evidence requirement
        if (!result.evidence || result.evidence.result === undefined) {
          runStatus = 'failure';
          blockedStoryIds.add(story.id);
          checkpointStoryId = story.id;
          this.recordManager.recordEvent({
            family: 'story.blocked',
            storyId: story.id,
            reason: 'evidence-gate-failed',
            diagnostics: {
              error: 'Worker result missing required evidence or evidence result',
              evidenceResult: null,
            },
          });
          continue;
        }

        this.recordManager.recordEvent({
          family: 'evidence.modeled',
          storyId: story.id,
          result: result.evidence.result,
          changedFiles: result.changedFiles,
        });

        if (result.outcome !== 'success') {
          runStatus = 'failure';
          blockedStoryIds.add(story.id);
          checkpointStoryId = story.id;
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
        } else if (result.evidence.result === 'passed') {
          this.recordManager.recordEvent({
            family: 'story.done',
            storyId: story.id,
            changedFiles: result.changedFiles,
          });
          this.recordManager.recordEvent({
            family: 'runner-action.skipped-on-dry-run',
            storyId: story.id,
            action: 'push|open-pr|merge',
            reason: 'dry-run',
          });
          completedStoryIds.add(story.id);
        } else {
          runStatus = 'failure';
          blockedStoryIds.add(story.id);
          checkpointStoryId = story.id;
          this.recordManager.recordEvent({
            family: 'story.blocked',
            storyId: story.id,
            reason: 'evidence-gate-failed',
            diagnostics: {
              error: 'Worker result evidence did not pass',
              evidenceResult: result.evidence.result,
            },
          });
        }
      } catch (err) {
        runStatus = 'failure';
        blockedStoryIds.add(story.id);
        checkpointStoryId = story.id;
        const message = err instanceof Error ? err.message : String(err);
        this.recordManager.recordEvent({
          family: 'story.blocked',
          storyId: story.id,
          reason: 'worker-execution-error',
          diagnostics: {
            error: message,
          },
        });
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
}
