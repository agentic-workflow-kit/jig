import {
  readCertificateClaims,
  readExecutionClaims,
  readProviderAdmissionExecutionClaims,
  registerCertificateClaims,
  registerExecutionClaims,
  registerProviderAdmissionCertificateClaims,
  snapshotProviderAdmissionClaims,
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

/** Package-private GF-022 issuer; the package root exports no mint path. */
export function mintProviderAdmissionCertificate(carrier: unknown): object | undefined {
  if (typeof carrier !== 'object' || carrier === null) return undefined;
  const claims = readProviderAdmissionExecutionClaims(carrier);
  const snapshot = snapshotProviderAdmissionClaims(claims);
  if (!snapshot) return undefined;
  const certificate = Object.freeze({});
  registerProviderAdmissionCertificateClaims(certificate, snapshot);
  return certificate;
}
