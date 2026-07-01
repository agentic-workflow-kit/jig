export class LocalHarness {
  constructor(worker, recordManager) {
    this.worker = worker;
    this.recordManager = recordManager;
  }

  async run(planInstance, config, policy) {
    const { plan } = planInstance;
    this.recordManager.init(plan, config, policy);

    this.recordManager.recordEvent({ family: 'run.started' });

    // Enforce local dry-run policy
    if (!policy.policy || !policy.policy.rules || policy.policy.rules.allowLocalDryRun !== true) {
      const reason = 'Policy denial: allowLocalDryRun is not true';
      this.recordManager.recordEvent({
        family: 'run.denied',
        reason
      });
      await this.recordManager.finalize('failure');
      return 'failure';
    }

    let runStatus = 'success';

    for (const story of plan.stories) {
      this.recordManager.recordEvent({ family: 'story.started', storyId: story.id });

      try {
        const result = await this.worker.execute(story);
        this.recordManager.recordEvent({
          family: 'evidence.observed',
          storyId: story.id,
          result: result.evidence.result
        });

        if (result.outcome === 'success') {
          this.recordManager.recordEvent({ family: 'story.done', storyId: story.id });
        } else {
          runStatus = 'failure';
          this.recordManager.recordEvent({
            family: 'story.failed',
            storyId: story.id,
            diagnostics: {
              exitCode: result.exitCode,
              stdout: result.stdout,
              stderr: result.stderr,
              error: result.error
            }
          });
          break;
        }
      } catch (err) {
        runStatus = 'failure';
        this.recordManager.recordEvent({
          family: 'story.failed',
          storyId: story.id,
          error: err.message
        });
        break;
      }
    }

    if (runStatus === 'success') {
      this.recordManager.recordEvent({ family: 'run.completed' });
    } else {
      this.recordManager.recordEvent({ family: 'run.stopped' });
    }

    await this.recordManager.finalize(runStatus);
    return runStatus;
  }
}
