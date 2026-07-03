import type { CapabilityAttestation, ExecutionHostPort, HostAttestation, IsolationStrength } from '../../ports.js';

export interface ReferenceHostOptions {
  runContext?: string;
  capability?: string;
  reportedIsolationStrength?: IsolationStrength;
  provenIsolationStrength?: IsolationStrength;
}

export class ReferenceExecutionHost implements ExecutionHostPort {
  private readonly attestation: HostAttestation;

  constructor(options: ReferenceHostOptions = {}) {
    const capability = options.capability ?? 'filesystem-edit';
    const runContext = options.runContext ?? 'local-dry-run';
    const reportedIsolationStrength = options.reportedIsolationStrength ?? 'strong';
    const provenIsolationStrength = options.provenIsolationStrength ?? reportedIsolationStrength;
    const capabilityAttestation: CapabilityAttestation = {
      driverId: 'reference-host',
      capability,
      runContext,
      freshness: 'fresh',
      positive: true,
      reportedIsolationStrength,
      provenIsolationStrength,
    };

    this.attestation = {
      driverId: 'reference-host',
      runContext,
      isolationStrength: reportedIsolationStrength,
      capabilityAttestations: [capabilityAttestation],
    };
  }

  describe(): HostAttestation {
    return this.attestation;
  }
}
