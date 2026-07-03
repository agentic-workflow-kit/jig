import type { ForgePort, LandingOutcome, LandingRequest } from '../../ports.js';

export const MODELED_DRY_RUN_LANDING_ACTION = 'push|open-pr|merge';

export class ReferenceForge implements ForgePort {
  land(request: LandingRequest): LandingOutcome {
    return {
      family: 'runner-action.skipped-on-dry-run',
      storyId: request.storyId,
      action: MODELED_DRY_RUN_LANDING_ACTION,
      reason: request.reason ?? 'dry-run',
    };
  }
}
