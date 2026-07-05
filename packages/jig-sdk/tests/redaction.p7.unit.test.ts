import assert from 'node:assert';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';
import { composeReferenceRun } from '../src/bootstrap.js';
import { LocalHarness } from '../src/harness.js';
import { validateCandidate } from '../src/intake.js';
import type { GitHubForgeTransport } from '../src/providers/real/forge.js';
import { RecordManager } from '../src/records.js';
import { RedactionAmbiguityError, redactValue } from '../src/redaction.js';
import type { ConfigDoc, PlanInstance, PolicyDoc, RunRecord } from '../src/types.js';

const cleanupDirs: string[] = [];

afterEach(() => {
  delete process.env.JIG_RECORDS_INTEGRITY_KEY;
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const planInstance: PlanInstance = {
  plan: {
    id: 'plan-p7-redaction',
    version: 'execution-plan-shape-v0',
    stories: [{ id: 'STORY-1', title: 'Redacted landing' }],
  },
};

const policy: PolicyDoc = {
  policy: {
    id: 'policy-p7-redaction',
    rules: {
      allowLocalDryRun: true,
    },
  },
};

function transportWithSecret(secret: string): GitHubForgeTransport {
  return {
    push: async () => ({
      targetRef: 'refs/heads/phase-7',
      targetHead: 'redacted-head',
      diagnostics: {
        stdout: `pushed with ${secret}`,
      },
    }),
    openPullRequest: async () => ({
      targetRef: 'refs/heads/phase-7',
      targetHead: 'redacted-head',
    }),
    mergePullRequest: async () => ({
      targetRef: 'refs/heads/main',
      targetHead: 'redacted-head',
    }),
    readHead: async (request) => ({
      targetRef: request.targetRef,
      targetHead: 'redacted-head',
    }),
    openOrUpdatePullRequestForBlock: async () => ({
      targetRef: 'refs/heads/phase-7',
      targetHead: 'redacted-head',
    }),
    postBlockStatus: async () => ({
      targetRef: 'refs/heads/phase-7',
      targetHead: 'redacted-head',
    }),
    postBlockComment: async () => ({
      targetRef: 'refs/heads/phase-7',
      targetHead: 'redacted-head',
    }),
  };
}

test('P7-AC-4: a landing record carrying a real Forge credential is scanned and redacted', () => {
  const redacted = redactValue(
    {
      family: 'runner-action.pushed',
      storyId: 'STORY-1',
      diagnostics: {
        stdout: 'github token ghp_phase7_secret',
        githubToken: 'ghp_phase7_secret',
      },
    },
    {
      enabled: true,
      secrets: {
        GITHUB_TOKEN: 'ghp_phase7_secret',
      },
    },
  ) as { diagnostics: { stdout: string; githubToken: string } };

  assert.strictEqual(redacted.diagnostics.stdout, 'github token [REDACTED]');
  assert.strictEqual(redacted.diagnostics.githubToken, '[REDACTED]');
});

test('P7-AC-4: a landing-path redaction ambiguity becomes a diagnosable stop', () => {
  assert.throws(
    () =>
      redactValue(
        {
          family: 'runner-action.pushed',
          diagnostics: {
            githubToken: '',
          },
        },
        { enabled: true },
      ),
    (error: unknown) =>
      error instanceof RedactionAmbiguityError &&
      /redaction-export-posture-ambiguous/.test(error.message) &&
      error.valueLabel === 'record.diagnostics.githubToken',
  );
});

test('P7-AC-4: a forge-only real run (forge: github, agent/executionHost on reference) has redaction enabled and a landing-path secret is redacted', async () => {
  const secret = 'ghp_phase7_secret';
  const recordDir = mkdtempSync(join(tmpdir(), 'jig-p7-redaction-'));
  cleanupDirs.push(recordDir);
  const config: ConfigDoc = {
    runner: {
      mode: 'local-dry-run',
      recordDir,
    },
    drivers: {
      forge: 'github',
    },
  };
  const composed = await composeReferenceRun({
    planInstance,
    config,
    scriptedOutput: {
      storyId: 'STORY-1',
      outcome: 'success',
      evidence: { result: 'passed' },
    },
    forgeTransport: transportWithSecret(secret),
    redaction: {
      secrets: {
        GITHUB_TOKEN: secret,
      },
    },
  });
  const [candidate] = await composed.workSource.candidates();
  assert.ok(candidate);
  assert.strictEqual(composed.redaction?.enabled, true);

  const harness = new LocalHarness(composed.agent, new RecordManager({ redaction: composed.redaction }), null, {
    capabilityAttestation: composed.capabilityAttestation,
    forge: composed.forge,
  });
  process.env.JIG_RECORDS_INTEGRITY_KEY = 'p7-redaction-integrity-key';
  const status = await harness.run(validateCandidate(candidate), config, policy);

  assert.strictEqual(status, 'success');
  const [runDir] = readdirSync(recordDir);
  assert.ok(runDir);
  const runRecord = JSON.parse(readFileSync(join(recordDir, runDir, 'run.json'), 'utf8')) as RunRecord;
  const serialized = JSON.stringify(runRecord);
  assert.strictEqual(serialized.includes(secret), false);
  assert.strictEqual(serialized.includes('[REDACTED]'), true);
});
