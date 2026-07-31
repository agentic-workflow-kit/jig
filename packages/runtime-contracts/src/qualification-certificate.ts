import { certificateClaims, executionClaims, snapshotQualificationClaims } from './qualification-registry.js';

/**
 * Repository-private friend surface. Package-boundary validation permits only
 * jig-conformance to import it; it mints runtime-owned opaque certificates.
 */
export function recordExactStructuredFileExecution(input: unknown): object | undefined {
  const snapshot = snapshotQualificationClaims(input);
  if (!snapshot) return undefined;
  const carrier = Object.freeze({});
  executionClaims.set(carrier, snapshot);
  return carrier;
}

export function mintQualificationCertificate(carrier: unknown): object | undefined {
  if (typeof carrier !== 'object' || carrier === null) return undefined;
  const input = executionClaims.get(carrier);
  const snapshot = snapshotQualificationClaims(input);
  if (!snapshot) return undefined;
  const certificate = Object.freeze({});
  certificateClaims.set(certificate, snapshot);
  return certificate;
}
