import { PlanValidator } from './plan-validator.js';
import type { CandidateProvenance, CandidateWorkItem, WorkSourcePort } from './ports.js';
import type { PlanInstance, RunEvent } from './types.js';

const validatedCandidateMarker: unique symbol = Symbol('jig.validatedCandidate');

export interface ValidatedCandidate {
  readonly planInstance: PlanInstance;
  readonly provenance: CandidateProvenance;
  readonly [validatedCandidateMarker]: true;
}

export interface RejectedCandidate {
  readonly candidate: CandidateWorkItem;
  readonly reason: 'plan-validation-failed';
  readonly error: string;
  readonly event: Pick<RunEvent, 'family'> & Partial<RunEvent>;
}

export interface CandidateIntakeResult {
  readonly admitted: ValidatedCandidate[];
  readonly rejected: RejectedCandidate[];
}

export const WORK_SOURCE_INTAKE_BYPASS_REASON = 'work-source-plan-intake-bypass';

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return value;
  }

  seen.add(value);
  for (const entry of Object.values(value as Record<string, unknown>)) {
    deepFreeze(entry, seen);
  }

  return Object.freeze(value);
}

export function referencePlanProvenance(planInstance: PlanInstance): CandidateProvenance {
  return {
    origin: {
      sourceSystem: 'local-plan',
      candidateId: planInstance.plan.id,
    },
    jigValidated: true,
  };
}

export function isCandidateProvenance(value: unknown): value is CandidateProvenance {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as { origin?: unknown; jigValidated?: unknown };
  if (record.jigValidated !== true || typeof record.origin !== 'object' || record.origin === null) {
    return false;
  }

  const origin = record.origin as { sourceSystem?: unknown; candidateId?: unknown };
  return (
    typeof origin.sourceSystem === 'string' &&
    origin.sourceSystem.trim() !== '' &&
    typeof origin.candidateId === 'string' &&
    origin.candidateId.trim() !== ''
  );
}

export function isReferencePlanProvenance(provenance: CandidateProvenance): boolean {
  return provenance.origin.sourceSystem === 'local-plan';
}

export function admissionProvenanceEvent(
  provenance: CandidateProvenance,
): (Pick<RunEvent, 'family'> & Partial<RunEvent>) | undefined {
  if (isReferencePlanProvenance(provenance)) {
    return undefined;
  }

  return {
    family: 'run.started',
    workSourceCandidate: {
      sourceSystem: provenance.origin.sourceSystem,
      candidateId: provenance.origin.candidateId,
      jigValidated: provenance.jigValidated,
    },
    basis: ['work-source-candidate-admitted'],
  };
}

export function bypassDeniedEvent(
  reason = WORK_SOURCE_INTAKE_BYPASS_REASON,
): Pick<RunEvent, 'family'> & Partial<RunEvent> {
  return {
    family: 'authorization.denied',
    reason,
    basis: [WORK_SOURCE_INTAKE_BYPASS_REASON],
  };
}

export function isValidatedCandidate(value: unknown): value is ValidatedCandidate {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { [validatedCandidateMarker]?: unknown })[validatedCandidateMarker] === true
  );
}

export function unwrapValidatedCandidate(candidate: ValidatedCandidate): PlanInstance {
  return candidate.planInstance;
}

export function validateCandidate(candidate: CandidateWorkItem): ValidatedCandidate {
  const validatedPlanInstance = PlanValidator.validate(candidate.planInstance);
  if (!isCandidateProvenance(candidate.provenance)) {
    throw new Error('Invalid candidate provenance: missing source system, candidate identifier, or jigValidated=true');
  }
  const planInstance = deepFreeze(structuredClone(validatedPlanInstance)) as PlanInstance;
  const provenance = deepFreeze(structuredClone(candidate.provenance)) as CandidateProvenance;

  return Object.freeze({
    planInstance,
    provenance,
    [validatedCandidateMarker]: true as const,
  });
}

export function validatePlanForScheduling(
  planInstance: PlanInstance,
  provenance: CandidateProvenance = referencePlanProvenance(planInstance),
): ValidatedCandidate {
  return validateCandidate({ planInstance, provenance });
}

export async function intakeCandidates(workSource: WorkSourcePort): Promise<CandidateIntakeResult> {
  const candidates = await workSource.candidates();
  const admitted: ValidatedCandidate[] = [];
  const rejected: RejectedCandidate[] = [];

  for (const candidate of candidates) {
    try {
      admitted.push(validateCandidate(candidate));
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      rejected.push({
        candidate,
        reason: 'plan-validation-failed',
        error,
        event: {
          ...bypassDeniedEvent(),
          diagnostics: {
            error,
          },
        },
      });
    }
  }

  return { admitted, rejected };
}
