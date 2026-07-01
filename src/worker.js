export class ScriptedWorker {
  constructor(scriptedOutput) {
    this.scriptedOutput = scriptedOutput;
  }

  async execute(story) {
    // For Phase 1, we match the story ID from the scripted output fixture
    if (this.scriptedOutput.storyId !== story.id) {
      throw new Error(`Worker mismatch: expected output for "${story.id}", but got "${this.scriptedOutput.storyId}"`);
    }

    return this.scriptedOutput;
  }
}
