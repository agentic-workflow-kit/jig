import type { ConfigDoc, PlanInstance, PolicyDoc, RecordSink, RunStatus, Worker } from './types.js';

export class LocalHarness {
  private readonly worker: Worker;
  private readonly recordManager: RecordSink;

  constructor(worker: Worker, recordManager: RecordSink) {
    this.worker = worker;
    this.recordManager = recordManager;
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

    if (runStatus === 'success') {
      this.recordManager.recordEvent({ family: 'run.completed' });
    } else {
      this.recordManager.recordEvent({
        family: 'run.stopped',
        reason: 'work-item-blocked',
        checkpoint: checkpointStoryId ? `after:${checkpointStoryId}` : undefined,
        unstarted: unstartedStoryIds,
      });
    }

    await this.recordManager.finalize(runStatus);
    return runStatus;
  }
}
