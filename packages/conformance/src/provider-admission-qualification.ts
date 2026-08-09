import { createProviderAdmissionFixture } from '@agentic-workflow-kit/jig-runtime-contracts';
import { issueExactProviderAdmissionCertificate } from '../../runtime-contracts/dist/qualification-certificate.js';

const PROVIDER_ADMISSION_MAX_AGE_MS = 86_400_000;

export type ProviderAdmissionQualificationInput = Readonly<{
  manifestBytes: Uint8Array;
  approval: unknown;
  ledger: unknown;
  basis: Readonly<Record<string, unknown>>;
  proof: unknown;
}>;

/**
 * Private GF-047 qualification harness. Runtime admission validates the exact
 * authenticated and durable transition; only then does the runtime friend
 * issue the opaque provider certificate.
 */
export function qualifyLocalCommandAdmission(input: ProviderAdmissionQualificationInput): object | undefined {
  try {
    const fixture = createProviderAdmissionFixture({
      manifestBytes: input.manifestBytes,
      approval: input.approval,
      ledger: input.ledger,
    });
    const admitted = fixture.admit({
      basis: input.basis,
      proof: input.proof,
      maxAgeMs: PROVIDER_ADMISSION_MAX_AGE_MS,
    });
    if (!admitted.ok || admitted.value.kind !== 'eligible') return undefined;
    if (typeof input.proof !== 'object' || input.proof === null) return undefined;
    const proofDigest = (input.proof as Record<string, unknown>).digest;
    if (typeof proofDigest !== 'string') return undefined;
    return issueExactProviderAdmissionCertificate({
      principal: 'principal/arye',
      providerIdentity: input.basis.providerIdentity,
      providerBuild: input.basis.providerBuild,
      environment: input.basis.environment,
      capability: input.basis.capability,
      policyMinimum: input.basis.policyMinimum,
      manifestId: admitted.value.manifestId,
      manifestDigest: input.basis.manifestDigest,
      scope: input.basis.scope,
      proofDigest,
      observedAt: Date.now(),
      maxAgeMs: PROVIDER_ADMISSION_MAX_AGE_MS,
    });
  } catch {
    return undefined;
  }
}
