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

    if (!Array.isArray(plan.stories) || plan.stories.length === 0) {
      throw new Error('Invalid plan: missing or empty "stories" array');
    }

    // Basic structure validation for stories
    for (const story of plan.stories) {
      if (!story.id || !story.title) {
        throw new Error(`Invalid story: missing "id" or "title" in ${JSON.stringify(story)}`);
      }
    }

    return planInstance;
  }
}
