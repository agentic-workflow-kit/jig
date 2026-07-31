import { certificateClaims, executionClaims, type QualificationClaims } from './qualification-registry.js';

/**
 * Repository-private friend surface. Package-boundary validation permits only
 * jig-conformance to import it; it mints runtime-owned opaque certificates.
 */
export function recordExactStructuredFileExecution(input: unknown): object | undefined {
  if (!exactClaims(input)) return undefined;
  const carrier = Object.freeze({});
  executionClaims.set(carrier, input);
  return carrier;
}

export function mintQualificationCertificate(carrier: unknown): object | undefined {
  if (typeof carrier !== 'object' || carrier === null) return undefined;
  const input = executionClaims.get(carrier);
  if (!input) return undefined;
  const certificate = Object.freeze({});
  certificateClaims.set(certificate, input);
  return certificate;
}

const digest = /^[0-9a-f]{64}$/u;
function exactClaims(value: unknown): value is QualificationClaims {
  if (typeof value !== 'object' || value === null || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).sort().join(',') !== 'capability,policyMinimum,resourceDigest,subject' ||
    input.capability !== 'PORT-SOURCE/read-structured-json' ||
    input.policyMinimum !== 'policy/structured-file-source/v1' ||
    input.resourceDigest !== 'fe23b4511a1abafef43ee38c6bc0c6496d4a3787ac9a913bd4634f960fce2bbd' ||
    typeof input.subject !== 'object' ||
    input.subject === null
  )
    return false;
  const subject = input.subject as Record<string, unknown>;
  return (
    subject.providerId === 'structured-json-file-source/v1' &&
    subject.providerBuildDigest === '0d842ed9d3bf39f51f1c10f36b1e4c2414df93bf214ec80da1dde92a890e1b81' &&
    subject.manifestDigest === '982a0cde5b335759925af0003f58a87f1bfd2e03a25f046216bd4aa9569994cd' &&
    subject.environmentDigest === 'b880653890190d5da3ac311736401fd1fa02f2d221bee8258eae231717143536' &&
    subject.recorderIdentity === 'recorder/jig-conformance/v1' &&
    typeof subject.recordedAt === 'number' &&
    Number.isSafeInteger(subject.recordedAt) &&
    Object.entries(subject).every(
      ([key, item]) =>
        key === 'recordedAt' ||
        (typeof item === 'string' && (key.endsWith('Digest') ? digest.test(item) : item.length > 0)),
    )
  );
}
