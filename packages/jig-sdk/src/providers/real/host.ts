import { type Clock, systemClock } from '../../clock.js';
import type { CapabilityAttestation, ExecutionHostPort, HostAttestation, IsolationStrength } from '../../ports.js';
import { type ApprovedSubstrateManifest, validateSubstrateRequest } from '../../substrate.js';
import {
  type ConfinementProbe,
  createMacosProcessGroupConfinementProbe,
  exerciseConfinementProbe,
} from './confinement.js';

export interface RealExecutionHostOptions {
  runContext?: string;
  capability?: string;
  reportedIsolationStrength?: IsolationStrength;
  probe: ConfinementProbe;
  clock?: Clock;
  substrateManifest?: ApprovedSubstrateManifest;
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

function isolationStrengthRank(strength: IsolationStrength): number {
  switch (strength) {
    case 'none':
      return 0;
    case 'weak':
      return 1;
    case 'strong':
      return 2;
  }
}

export async function createRealExecutionHost(options: RealExecutionHostOptions): Promise<ExecutionHostPort> {
  const capability = options.capability ?? 'filesystem-edit';
  const runContext = options.runContext ?? 'local-real-host';
  for (const request of options.probe.substrateRequests ?? []) {
    if (options.substrateManifest) {
      validateSubstrateRequest(options.substrateManifest, request);
    }
  }
  const proof = await exerciseConfinementProbe(options.probe, options.clock ?? systemClock);
  const reportedIsolationStrength =
    options.reportedIsolationStrength ?? proof.reportedIsolationStrength ?? proof.provenIsolationStrength ?? 'strong';
  const provenIsolationStrength = proof.provenIsolationStrength ?? 'none';
  const overstated = isolationStrengthRank(reportedIsolationStrength) > isolationStrengthRank(provenIsolationStrength);
  const capabilityAttestation: CapabilityAttestation = {
    driverId: 'real-host',
    capability,
    runContext,
    freshness: proof.freshness,
    positive: proof.positive && !overstated,
    reportedIsolationStrength,
    provenIsolationStrength,
    provenBy: proof.positive && !overstated ? proof.provenBy : undefined,
    containmentMechanism: proof.containmentMechanism,
    failureToken: overstated ? 'isolation-strength-overstated' : proof.failureToken,
  };

  return new RealExecutionHost({
    driverId: 'real-host',
    runContext,
    isolationStrength: reportedIsolationStrength,
    capabilityAttestations: [capabilityAttestation],
  });
}

export function createControlledStrongConfinementProbe(observedAt = new Date().toISOString()): ConfinementProbe {
  return {
    run: async () => ({
      reportedIsolationStrength: 'strong',
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

export function createDefaultLocalConfinementProbe(): ConfinementProbe {
  return createMacosProcessGroupConfinementProbe();
}
