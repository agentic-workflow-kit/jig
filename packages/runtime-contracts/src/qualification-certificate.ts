import { consumeExactLocalCommandAdmissionTransition, createExactLocalCommandAdmissionTransition } from './provider.js';
import {
  readCertificateClaims,
  readExecutionClaims,
  registerCertificateClaims,
  registerExecutionClaims,
  registerProviderAdmissionCertificateClaims,
  snapshotQualificationClaims,
} from './qualification-registry.js';

/**
 * Repository-private friend surface. Package-boundary validation permits only
 * jig-conformance to import it; it mints runtime-owned opaque certificates.
 */
export function recordExactStructuredFileExecution(input: unknown): object | undefined {
  const snapshot = snapshotQualificationClaims(input);
  if (!snapshot) return undefined;
  const carrier = Object.freeze({});
  registerExecutionClaims(carrier, snapshot);
  return carrier;
}

export function mintQualificationCertificate(carrier: unknown): object | undefined {
  if (typeof carrier !== 'object' || carrier === null) return undefined;
  const input = readExecutionClaims(carrier);
  const snapshot = snapshotQualificationClaims(input);
  if (!snapshot) return undefined;
  const certificate = Object.freeze({});
  registerCertificateClaims(certificate, snapshot);
  return certificate;
}

export function readQualificationCertificateClaims(certificate: unknown) {
  return typeof certificate === 'object' && certificate !== null ? readCertificateClaims(certificate) : undefined;
}

/**
 * Repository-private GF-022 friend surface. The conformance harness calls this
 * only after the durable provider-admission transition has accepted the exact
 * manifest, approval, ledger proof, and freshness bound.
 */
export function issueExactProviderAdmissionCertificate(): object | undefined {
  const receipt = createExactLocalCommandAdmissionTransition();
  const claims = consumeExactLocalCommandAdmissionTransition(receipt);
  if (!claims) return undefined;
  const certificate = Object.freeze({});
  registerProviderAdmissionCertificateClaims(certificate, claims);
  return certificate;
}
