export class LocalHarness {
  constructor(worker, recordManager) {
    this.worker = worker;
    this.recordManager = recordManager;
  }

  async run(planInstance, config, policy) {
    const { plan } = planInstance;
    this.recordManager.init(plan, config, policy);

    this.recordManager.recordEvent({ family: 'run.started' });

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
          this.recordManager.recordEvent({ family: 'story.failed', storyId: story.id });
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
