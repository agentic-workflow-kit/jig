import { certificateClaims, type QualificationClaims } from './qualification-registry.js';

/**
 * Repository-private friend surface. Package-boundary validation permits only
 * jig-conformance to import it; it mints runtime-owned opaque certificates.
 */
export function mintQualificationCertificate(input: unknown): object | undefined {
  if (typeof input !== 'object' || input === null) return undefined;
  const certificate = Object.freeze({});
  // The conformance module owns the observation brand; this friend only carries
  // the already-fixed claims into the runtime-owned opaque registry.
  certificateClaims.set(certificate, input as QualificationClaims);
  return certificate;
}
