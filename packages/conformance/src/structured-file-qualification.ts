import {
  mintQualificationCertificate,
  recordExactStructuredFileExecution,
} from '@agentic-workflow-kit/jig-runtime-contracts/qualification-certificate';
import { type EvidenceRecord, observeProvider, type Subject } from './index.js';

/** Package-internal execution fixture; deliberately absent from root/package exports. */
export function executeExactStructuredFileQualification(
  records: readonly EvidenceRecord[],
  subject: Subject,
): object | undefined {
  const observed = observeProvider('PORT-SOURCE', records, subject);
  if (!observed.ok || observed.record.status !== 'pass') return undefined;
  const carrier = recordExactStructuredFileExecution({
    subject: observed.record.subject,
    resourceDigest: 'fe23b4511a1abafef43ee38c6bc0c6496d4a3787ac9a913bd4634f960fce2bbd',
    capability: 'PORT-SOURCE/read-structured-json',
    policyMinimum: 'policy/structured-file-source/v1',
  });
  return carrier ? mintQualificationCertificate(carrier) : undefined;
}
