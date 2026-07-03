import { type Clock, decideFreshness } from '../../clock.js';
import type { CapabilityFreshness, HostFailureToken, IsolationStrength } from '../../ports.js';

export type ContainmentMechanism = 'process-group' | 'kernel-tree' | 'job-object';

export interface ConfinementProbeResult {
  observedAt?: string;
  freshnessWindowMs: number;
  terminationProvedEmpty: boolean;
  negativeEgressProbePassed: boolean;
  containmentMechanism?: ContainmentMechanism;
  commandBindingPassed: boolean;
  parentageProbePassed: boolean;
  provenIsolationStrength: IsolationStrength;
}

export interface ConfinementProof {
  freshness: CapabilityFreshness;
  positive: boolean;
  provenIsolationStrength?: IsolationStrength;
  provenBy?: 'exercised-confinement-proof';
  failureToken?: HostFailureToken;
}

export interface ConfinementProbe {
  run(): Promise<ConfinementProbeResult>;
}

function isStrongProof(result: ConfinementProbeResult): boolean {
  return (
    result.terminationProvedEmpty &&
    result.negativeEgressProbePassed &&
    result.containmentMechanism !== undefined &&
    result.commandBindingPassed &&
    result.parentageProbePassed &&
    result.provenIsolationStrength === 'strong'
  );
}

export async function exerciseConfinementProbe(probe: ConfinementProbe, clock: Clock): Promise<ConfinementProof> {
  const result = await probe.run();
  const freshness = decideFreshness({
    observedAt: result.observedAt,
    windowMs: result.freshnessWindowMs,
    clock,
  });
  const positive = freshness === 'fresh' && isStrongProof(result);

  return {
    freshness,
    positive,
    provenIsolationStrength: result.provenIsolationStrength,
    provenBy: positive ? 'exercised-confinement-proof' : undefined,
    failureToken: positive ? undefined : 'containment-unproven',
  };
}
