import type { ScriptedOutput, Story, Worker, WorkerResult } from './types.js';

export class ScriptedWorker implements Worker {
  private readonly scriptedOutput: ScriptedOutput;

  constructor(scriptedOutput: ScriptedOutput) {
    this.scriptedOutput = scriptedOutput;
  }

  async execute(story: Story): Promise<WorkerResult> {
    if (this.scriptedOutput.stories && Array.isArray(this.scriptedOutput.stories)) {
      const storyOutput = this.scriptedOutput.stories.find((s) => s.storyId === story.id);
      if (!storyOutput) {
        throw new Error(`Worker mismatch: no scripted output found for story "${story.id}" in multi-output fixture`);
      }
      return storyOutput;
    }

    // Fallback to Phase 1 single-output format
    if (this.scriptedOutput.storyId !== story.id) {
      throw new Error(`Worker mismatch: expected output for "${story.id}", but got "${this.scriptedOutput.storyId}"`);
    }

    return this.scriptedOutput;
  }
}
