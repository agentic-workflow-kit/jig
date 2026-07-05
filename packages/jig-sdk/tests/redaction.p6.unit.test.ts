import assert from 'node:assert';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'vitest';
import { composeReferenceRun } from '../src/bootstrap.js';
import { RecordManager } from '../src/records.js';
import { RedactionAmbiguityError, redactValue } from '../src/redaction.js';
import type { ConfigDoc, Plan, PlanInstance, PolicyDoc } from '../src/types.js';

test('P6-AC-6: a record carrying a real credential is scanned and redacted', () => {
  const redacted = redactValue(
    {
      family: 'evidence.modeled',
      diagnostics: {
        stdout: 'using token sk-test-secret',
        apiKey: 'sk-test-secret',
      },
    },
    {
      enabled: true,
      secrets: {
        CODEX_API_KEY: 'sk-test-secret',
      },
    },
  ) as { diagnostics: { stdout: string; apiKey: string } };

  assert.strictEqual(redacted.diagnostics.stdout, 'using token [REDACTED]');
  assert.strictEqual(redacted.diagnostics.apiKey, '[REDACTED]');
});

test('P6-AC-6: a redaction ambiguity becomes a diagnosable stop', () => {
  assert.throws(
    () =>
      redactValue(
        {
          family: 'evidence.modeled',
          diagnostics: {
            apiKey: '',
          },
        },
        { enabled: true },
      ),
    (error: unknown) =>
      error instanceof RedactionAmbiguityError &&
      /redaction-export-posture-ambiguous/.test(error.message) &&
      error.valueLabel === 'record.diagnostics.apiKey',
  );
});

test('P6-AC-6: disabled redaction leaves records unchanged', () => {
  const record = { family: 'evidence.modeled', diagnostics: { stdout: 'token sk-test-secret' } };

  assert.strictEqual(redactValue(record, { enabled: false }), record);
});

test('P04-AC-5: redaction activates at the real Codex credential boundary', async () => {
  const previousKey = process.env.CODEX_API_KEY;
  const previousIntegrityKey = process.env.JIG_RECORDS_INTEGRITY_KEY;
  const previousIntegrityKeyId = process.env.JIG_RECORDS_INTEGRITY_KEY_ID;
  const recordDir = mkdtempSync(join(tmpdir(), 'jig-p4-redaction-'));
  try {
    process.env.CODEX_API_KEY = 'sk-live-boundary-secret';
    process.env.JIG_RECORDS_INTEGRITY_KEY = 'p4-redaction-integrity-key';
    process.env.JIG_RECORDS_INTEGRITY_KEY_ID = 'p4-redaction-key';
    const planInstance: PlanInstance = {
      plan: {
        id: 'plan-p4-redaction',
        version: 'execution-plan-shape-v0',
        stories: [{ id: 'STORY-1', title: 'boundary' }],
      },
    };
    const config: ConfigDoc = {
      runner: { mode: 'local-dry-run', recordDir },
      drivers: {
        agent: 'codex',
      },
    };
    const policy: PolicyDoc = {
      policy: {
        id: 'policy-p4-redaction',
        rules: { allowLocalDryRun: true },
      },
    };
    const composed = await composeReferenceRun({
      planInstance,
      config,
      scriptedOutput: {},
      codexSession: {
        run: async (story) => ({
          status: 'completed',
          workerResult: {
            storyId: story.id,
            outcome: 'success',
            evidence: { result: 'passed' },
          },
        }),
      },
    });
    assert.strictEqual(composed.redaction?.enabled, true);

    const manager = new RecordManager({ redaction: composed.redaction });
    manager.init(planInstance.plan as Plan, config, policy);
    manager.recordEvent({
      family: 'evidence.modeled',
      apiKey: process.env.CODEX_API_KEY,
      diagnostics: {
        stdout: `token ${process.env.CODEX_API_KEY}`,
      },
    });
    await manager.finalize('success');

    const [runName] = readdirSync(recordDir);
    assert.ok(runName);
    const events = readFileSync(join(recordDir, runName, 'events.jsonl'), 'utf8');
    assert.strictEqual(events.includes('sk-live-boundary-secret'), false);
    assert.ok(events.includes('[REDACTED]'));
  } finally {
    if (previousKey === undefined) {
      delete process.env.CODEX_API_KEY;
    } else {
      process.env.CODEX_API_KEY = previousKey;
    }
    if (previousIntegrityKey === undefined) {
      delete process.env.JIG_RECORDS_INTEGRITY_KEY;
    } else {
      process.env.JIG_RECORDS_INTEGRITY_KEY = previousIntegrityKey;
    }
    if (previousIntegrityKeyId === undefined) {
      delete process.env.JIG_RECORDS_INTEGRITY_KEY_ID;
    } else {
      process.env.JIG_RECORDS_INTEGRITY_KEY_ID = previousIntegrityKeyId;
    }
    rmSync(recordDir, { recursive: true, force: true });
  }
});
