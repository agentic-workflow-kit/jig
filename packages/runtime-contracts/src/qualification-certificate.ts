import { issueQualificationCertificate, type QualificationCertificate } from './provider.js';

/**
 * Repository-private friend surface. Package-boundary validation permits only
 * jig-conformance to import it; it mints runtime-owned opaque certificates.
 */
export function mintQualificationCertificate(input: unknown): QualificationCertificate | undefined {
  return issueQualificationCertificate(input);
}
