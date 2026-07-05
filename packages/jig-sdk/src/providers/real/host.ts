import { type Clock, systemClock } from '../../clock.js';
import type { CapabilityAttestation, ExecutionHostPort, HostAttestation, IsolationStrength } from '../../ports.js';
import { type ConfinementProbe, exerciseConfinementProbe } from './confinement.js';

export interface RealExecutionHostOptions {
  runContext?: string;
  capability?: string;
  reportedIsolationStrength?: IsolationStrength;
  probe: ConfinementProbe;
  clock?: Clock;
}

class RealExecutionHost implements ExecutionHostPort {
  private readonly attestation: HostAttestation;

  constructor(attestation: HostAttestation) {
    this.attestation = attestation;
  }

  describe(): HostAttestation {
    return this.attestation;
  }
}

export async function createRealExecutionHost(options: RealExecutionHostOptions): Promise<ExecutionHostPort> {
  const reportedIsolationStrength = options.reportedIsolationStrength ?? 'strong';
  const capability = options.capability ?? 'filesystem-edit';
  const runContext = options.runContext ?? 'local-real-host';
  const proof = await exerciseConfinementProbe(options.probe, options.clock ?? systemClock);
  const overstated =
    reportedIsolationStrength === 'strong' &&
    (proof.provenIsolationStrength === 'weak' || proof.provenIsolationStrength === 'none');
  const capabilityAttestation: CapabilityAttestation = {
    driverId: 'real-host',
    capability,
    runContext,
    freshness: proof.freshness,
    positive: proof.positive && !overstated,
    reportedIsolationStrength,
    provenIsolationStrength: proof.provenIsolationStrength,
    provenBy: proof.positive && !overstated ? proof.provenBy : undefined,
    failureToken: overstated ? 'isolation-strength-overstated' : proof.failureToken,
  };

  return new RealExecutionHost({
    driverId: 'real-host',
    runContext,
    isolationStrength: reportedIsolationStrength,
    capabilityAttestations: [capabilityAttestation],
  });
}

export function strongLocalConfinementProbe(observedAt = new Date().toISOString()): ConfinementProbe {
  return {
    run: async () => ({
      observedAt,
      freshnessWindowMs: 60_000,
      terminationProvedEmpty: true,
      negativeEgressProbePassed: true,
      containmentMechanism: 'process-group',
      commandBindingPassed: true,
      parentageProbePassed: true,
      provenIsolationStrength: 'strong',
    }),
  };
}
