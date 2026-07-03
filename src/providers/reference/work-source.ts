import { referencePlanProvenance } from '../../intake.js';
import type { CandidateWorkItem, WorkSourcePort } from '../../ports.js';
import type { PlanInstance } from '../../types.js';

export class ReferenceWorkSource implements WorkSourcePort {
  private readonly planInstance: PlanInstance;

  constructor(planInstance: PlanInstance) {
    this.planInstance = planInstance;
  }

  candidates(): CandidateWorkItem[] {
    return [
      {
        planInstance: this.planInstance,
        provenance: referencePlanProvenance(this.planInstance),
      },
    ];
  }
}
