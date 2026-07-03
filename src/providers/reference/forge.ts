import type { ForgePort, LandingOutcome, LandingRequest } from '../../ports.js';

export class ReferenceForge implements ForgePort {
  land(request: LandingRequest): LandingOutcome {
    return {
      family: 'runner-action.skipped-on-dry-run',
      storyId: request.storyId,
      action: request.action,
      reason: request.reason ?? 'dry-run',
    };
  }
}
