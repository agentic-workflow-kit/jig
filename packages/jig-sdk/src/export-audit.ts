import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ExportAuditEntry {
  family: 'export.prepared' | 'export.denied';
  actor: 'owner';
  timestamp: string;
  runId?: string;
  artifactPath?: string;
  artifactSha256?: string;
  reason?: string;
}

export interface ExportAuditRecord {
  path: string;
  line: number;
  event: ExportAuditEntry;
}

export function readExportAudit(runDir: string): ExportAuditRecord[] {
  const auditPath = join(runDir, 'exports', 'export-audit.jsonl');
  if (!existsSync(auditPath)) {
    return [];
  }

  const lines = readFileSync(auditPath, 'utf8').split('\n');
  const records: ExportAuditRecord[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === '' && index === lines.length - 1) {
      break;
    }
    if (line.trim() === '') {
      throw new Error(`Malformed export audit line ${index + 1}: empty line is not a valid audit event`);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Malformed export audit line ${index + 1}: ${message}`);
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('family' in parsed) ||
      (((parsed as { family?: unknown }).family as string) !== 'export.prepared' &&
        ((parsed as { family?: unknown }).family as string) !== 'export.denied')
    ) {
      throw new Error(`Malformed export audit line ${index + 1}: audit event must have export family`);
    }

    records.push({
      path: auditPath,
      line: index + 1,
      event: parsed as ExportAuditEntry,
    });
  }

  return records;
}
