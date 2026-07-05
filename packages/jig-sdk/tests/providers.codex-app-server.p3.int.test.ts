import assert from 'node:assert';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';
import { composeReferenceRun } from '../src/bootstrap.js';
import { LocalHarness } from '../src/harness.js';
import { validateCandidate } from '../src/intake.js';
import { RecordManager } from '../src/records.js';
import type { ConfigDoc, PlanInstance, PolicyDoc } from '../src/types.js';

const cleanupDirs: string[] = [];

afterEach(() => {
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const planInstance: PlanInstance = {
  plan: {
    id: 'codex-p3-records',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'Record observed Codex evidence' }],
  },
};

const policy: PolicyDoc = {
  policy: {
    id: 'codex-p3-policy',
    rules: {
      allowLocalDryRun: true,
    },
  },
};

test('P03-AC-3: translated Codex evidence is redacted and recorded without leaking raw protocol objects', async () => {
  const recordDir = mkdtempSync(join(tmpdir(), 'jig-codex-p3-'));
  cleanupDirs.push(recordDir);
  const previousIntegrityKey = process.env.JIG_RECORDS_INTEGRITY_KEY;
  const previousIntegrityKeyId = process.env.JIG_RECORDS_INTEGRITY_KEY_ID;
  process.env.JIG_RECORDS_INTEGRITY_KEY = 'integration-test-integrity-key';
  process.env.JIG_RECORDS_INTEGRITY_KEY_ID = 'integration-test-key-id';

  try {
    const config: ConfigDoc = {
      runner: { mode: 'local-dry-run', recordDir },
      drivers: {
        agent: 'codex',
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
          observedEvidence: {
            driver: 'codex-app-server',
            approvals: [{ decision: 'approved', command: 'pwd' }],
            sessionToken: 'top-secret',
          },
        }),
      },
      redaction: {
        enabled: true,
        secrets: {
          SESSION_TOKEN: 'top-secret',
        },
      },
    });
    const [candidate] = await composed.workSource.candidates();
    assert.ok(candidate, 'expected a validated work-source candidate');

    const harness = new LocalHarness(
      composed.agent,
      new RecordManager({
        redaction: composed.redaction,
      }),
      null,
      {
        capabilityAttestation: composed.capabilityAttestation,
        forge: composed.forge,
      },
    );

    await harness.run(validateCandidate(candidate), config, policy);

    const [runDir] = readdirSync(recordDir);
    assert.ok(runDir, 'expected one run directory');
    const record = JSON.parse(readFileSync(join(recordDir, runDir, 'run.json'), 'utf8')) as {
      events: Array<Record<string, unknown>>;
    };
    const evidenceModeled = record.events.find((event) => event.family === 'evidence.modeled');
    assert.ok(evidenceModeled, 'expected an evidence.modeled event');
    assert.deepStrictEqual(evidenceModeled?.observed, {
      driver: 'codex-app-server',
      approvals: [{ decision: 'approved', command: 'pwd' }],
      sessionToken: '[REDACTED]',
    });
    assert.strictEqual(JSON.stringify(record).includes('thread/started'), false);
    assert.strictEqual(JSON.stringify(record).includes('item/completed'), false);
  } finally {
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
  }
});
