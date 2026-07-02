export class PlanValidator {
  static validate(planInstance) {
    if (!planInstance || !planInstance.plan) {
      throw new Error('Invalid plan: missing root "plan" object');
    }

    const { plan } = planInstance;

    if (plan.version !== 'execution-plan-shape-v0') {
      throw new Error(`Invalid plan: unknown version "${plan.version}"`);
    }

    if (!plan.id || typeof plan.id !== 'string') {
      throw new Error('Invalid plan: missing or malformed "id"');
    }

    // Path safety validation for plan.id
    if (/[/\\..]/.test(plan.id)) {
      throw new Error(`Invalid plan: unsafe "id" containing path traversal characters: "${plan.id}"`);
    }

    if (!Array.isArray(plan.stories) || plan.stories.length === 0) {
      throw new Error('Invalid plan: missing or empty "stories" array');
    }

    // Basic structure validation for stories
    const seenStoryIds = new Set();
    for (const story of plan.stories) {
      if (!story.id || !story.title) {
        throw new Error(`Invalid story: missing "id" or "title" in ${JSON.stringify(story)}`);
      }

      // Path safety validation for story.id as it might be used in record names
      if (typeof story.id !== 'string' || /[/\\..]/.test(story.id)) {
        throw new Error(`Invalid story: unsafe "id" containing path traversal characters: "${story.id}"`);
      }

      if (seenStoryIds.has(story.id)) {
        throw new Error(`Invalid story: duplicate "id" "${story.id}"`);
      }

      if (Object.hasOwn(story, 'dependsOn')) {
        if (!Array.isArray(story.dependsOn)) {
          throw new Error(`Invalid story: "dependsOn" must be an array in "${story.id}"`);
        }
        for (const depId of story.dependsOn) {
          if (depId === story.id) {
            throw new Error(`Invalid story: self-dependency not allowed in "${story.id}"`);
          }
          if (!seenStoryIds.has(depId)) {
            throw new Error(`Invalid story: dependency "${depId}" in "${story.id}" is unknown or appears later in the plan (late dependency)`);
          }
        }
      }

      seenStoryIds.add(story.id);
    }

    return planInstance;
  }
}
