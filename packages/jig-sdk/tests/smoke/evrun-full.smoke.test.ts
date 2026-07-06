import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, test } from 'vitest';
import { composeReferenceRun } from '../../src/bootstrap.js';
import { LocalHarness } from '../../src/harness.js';
import { validateCandidate } from '../../src/intake.js';
import { INTEGRITY_FILE, verifyIntegritySidecar } from '../../src/integrity.js';
import { RecordManager } from '../../src/records.js';
import type { ConfigDoc, PlanInstance, PolicyDoc } from '../../src/types.js';
import {
  emitEvidenceFacts,
  REAL_LANDING_FAMILIES,
  readSingleRunRecord,
  SMOKE_REPOSITORY,
  SMOKE_SEED_ISSUE_LABEL,
} from './evrun-smoke.js';

export const SMOKE_SEED_ISSUE_TITLE = 'EVRUN full smoke seed: codex real-provider run';
export const SMOKE_CHANGED_FILE = 'evrun-full-smoke.txt';
export const SMOKE_PLAN_INSTANCE = {
  plan: {
    id: 'evrun-full-smoke',
    version: 'execution-plan-shape-v0',
    stories: [
      {
        id: 'EVRUN-FULL-SMOKE',
        title:
          'In this workspace, run `git rev-parse --abbrev-ref HEAD`, create evrun-full-smoke.txt with lines "EVRUN full smoke Codex-authored landing edit", "branch=<current branch>", "landing-leg=codex-authored-commit", and "agent-leg=codex-app-server", commit it with message "test: evrun full smoke codex landing edit", push the branch with upstream tracking, then reply with one short confirmation sentence mentioning the branch and file.',
        scope: [SMOKE_CHANGED_FILE],
        authority: {
          requests: ['edit-files', 'run-checks'],
        },
      },
    ],
  },
} satisfies PlanInstance;
export const SMOKE_SEED_ISSUE_BODY = `\`\`\`json\n${JSON.stringify(SMOKE_PLAN_INSTANCE, null, 2)}\n\`\`\``;
export const SMOKE_REQUIRED_ENV = {
  GITHUB_TOKEN: '<coordinator-provided GitHub token with sandbox repo issue/read, push, and PR create access>',
  JIG_GITHUB_ISSUES_REPOSITORY: SMOKE_REPOSITORY,
  JIG_GITHUB_ISSUES_LABEL: SMOKE_SEED_ISSUE_LABEL,
  JIG_RECORDS_INTEGRITY_KEY: '<coordinator-provided integrity HMAC key>',
  JIG_RECORDS_INTEGRITY_KEY_ID: '<coordinator-provided key identifier>',
  EVRUN_FULL_EVIDENCE_OUT: '<path for non-secret captured evidence facts json>',
} as const;

const cleanupDirs: string[] = [];
const GIT_CONFIG_ENV_KEYS = [
  'GIT_CONFIG_COUNT',
  'GIT_CONFIG_KEY_0',
  'GIT_CONFIG_VALUE_0',
  'GIT_CONFIG_KEY_1',
  'GIT_CONFIG_VALUE_1',
] as const;

afterEach(() => {
  if (process.env.EVRUN_FULL_KEEP_ARTIFACTS) {
    return;
  }
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function execGit(args: string[], cwd: string): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function gitBasicAuthHeader(token: string): string {
  const encoded = Buffer.from(`x-access-token:${token}`, 'utf8').toString('base64');
  return `AUTHORIZATION: basic ${encoded}`;
}

function configureGitHttpsToken(token: string): void {
  process.env.GIT_CONFIG_COUNT = '2';
  process.env.GIT_CONFIG_KEY_0 = 'credential.helper';
  process.env.GIT_CONFIG_VALUE_0 = '';
  process.env.GIT_CONFIG_KEY_1 = 'http.https://github.com/.extraHeader';
  process.env.GIT_CONFIG_VALUE_1 = gitBasicAuthHeader(token);
  process.env.GIT_TERMINAL_PROMPT = '0';
}

function provisionCheckout(): { checkoutDir: string; branchName: string } {
  assert.ok(process.env.GITHUB_TOKEN, 'set GITHUB_TOKEN before provisioning the full smoke checkout');
  const tempRoot = mkdtempSync(join(tmpdir(), 'jig-evrun-full-smoke-'));
  cleanupDirs.push(tempRoot);
  const checkoutDir = join(tempRoot, 'jig-smoke-target');
  const branchName = `evrun-full-smoke-${Date.now()}-${randomUUID().slice(0, 8)}`;

  process.env.GH_TOKEN = process.env.GITHUB_TOKEN;
  configureGitHttpsToken(process.env.GITHUB_TOKEN);

  execFileSync('git', ['clone', `https://github.com/${SMOKE_REPOSITORY}.git`, checkoutDir], {
    encoding: 'utf8',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  execGit(['checkout', '-b', branchName], checkoutDir);
  execGit(['config', 'user.name', 'jig smoke runner'], checkoutDir);
  execGit(['config', 'user.email', 'jig-smoke-runner@example.invalid'], checkoutDir);

  return { checkoutDir, branchName };
}

function smokeConfig(recordDir: string): ConfigDoc {
  return {
    runner: {
      mode: 'local-real-provider-smoke',
      recordDir,
    },
    drivers: {
      agent: 'codex',
      executionHost: 'real',
      forge: 'github',
      workSource: 'github-issues',
    },
  };
}

function smokePolicy(): PolicyDoc {
  return {
    policy: {
      id: 'evrun-full-smoke-policy',
      rules: {
        allowLocalDryRun: true,
        mergeSpectrum: 'open-pr',
      },
    },
  };
}

describe.skipIf(!process.env.EVRUN_FULL_SMOKE)('EVRUN full real-provider smoke', () => {
  test('ties codex app-server evidence to real-host attestation and a real GitHub open-pr landing', async () => {
    assert.ok(process.env.GITHUB_TOKEN, 'set GITHUB_TOKEN for the sandbox GitHub smoke run');
    assert.strictEqual(
      process.env.JIG_GITHUB_ISSUES_REPOSITORY,
      SMOKE_REPOSITORY,
      'set JIG_GITHUB_ISSUES_REPOSITORY to the sandbox repo',
    );
    assert.strictEqual(
      process.env.JIG_GITHUB_ISSUES_LABEL ?? 'jig-candidate',
      SMOKE_SEED_ISSUE_LABEL,
      'set JIG_GITHUB_ISSUES_LABEL to the seed issue label',
    );
    assert.ok(process.env.JIG_RECORDS_INTEGRITY_KEY, 'set JIG_RECORDS_INTEGRITY_KEY for the sidecar');

    const previousCwd = process.cwd();
    const previousGitAskPass = process.env.GIT_ASKPASS;
    const previousGitPrompt = process.env.GIT_TERMINAL_PROMPT;
    const previousGhToken = process.env.GH_TOKEN;
    const previousGitConfig = Object.fromEntries(GIT_CONFIG_ENV_KEYS.map((key) => [key, process.env[key]]));
    const recordDir = mkdtempSync(join(tmpdir(), 'jig-evrun-full-records-'));
    cleanupDirs.push(recordDir);

    try {
      const { checkoutDir, branchName } = provisionCheckout();
      process.chdir(checkoutDir);
      const config = smokeConfig(recordDir);
      const policy = smokePolicy();
      const composed = await composeReferenceRun({
        config,
        planInstance: SMOKE_PLAN_INSTANCE,
        scriptedOutput: {},
        ownerDecisionSource: {
          decide: async () => 'approve',
        },
      });
      const candidates = await composed.workSource.candidates();
      const candidate = candidates.find((item) => item.planInstance.plan.id === SMOKE_PLAN_INSTANCE.plan.id);
      assert.ok(candidate, `expected a ${SMOKE_SEED_ISSUE_LABEL} issue carrying plan ${SMOKE_PLAN_INSTANCE.plan.id}`);

      const harness = new LocalHarness(
        composed.agent,
        new RecordManager({
          launchAttestation: composed.substrateManifest ? composed.capabilityAttestation : undefined,
          substrateManifest: composed.substrateManifest,
          redaction: composed.redaction,
        }),
        null,
        {
          capabilityAttestation: composed.capabilityAttestation,
          forge: composed.forge,
          landingAction: 'open-pr',
        },
      );

      const status = await harness.run(validateCandidate(candidate), config, policy);
      assert.strictEqual(status, 'success');

      const { runDir, record, runJsonBytes, integrityJsonBytes } = readSingleRunRecord(recordDir);
      assert.strictEqual(record.run.status, 'success');
      assert.deepStrictEqual(record.run.binding.drivers, {
        agent: 'codex',
        executionHost: 'real',
        forge: 'github',
        workSource: 'github-issues',
      });
      assert.ok(record.events.some((event) => REAL_LANDING_FAMILIES.has(event.family)));
      const openedPr = record.events.find((event) => event.family === 'runner-action.opened-pr' && event.prUrl);
      assert.ok(openedPr, 'expected an opened PR event with a URL');
      const evidenceModeled = record.events.find((event) => event.family === 'evidence.modeled');
      assert.ok(evidenceModeled, 'expected recorded Codex evidence');
      assert.strictEqual(evidenceModeled?.result, 'passed');
      assert.deepStrictEqual(evidenceModeled?.changedFiles, undefined);
      const observed =
        typeof evidenceModeled?.observed === 'object' && evidenceModeled.observed !== null
          ? (evidenceModeled.observed as Record<string, unknown>)
          : undefined;
      assert.strictEqual(typeof observed?.driver, 'string');
      assert.strictEqual(observed?.driver, 'codex-app-server');
      const integrityStatus = verifyIntegritySidecar(runDir, {
        expected: true,
      }).status;
      assert.strictEqual(integrityStatus, 'verified');
      assert.ok(readFileSync(join(runDir, INTEGRITY_FILE), 'utf8').includes('"hmac"'));
      const smokeFile = readFileSync(join(checkoutDir, SMOKE_CHANGED_FILE), 'utf8');
      assert.ok(smokeFile.includes(`branch=${branchName}`), 'Codex-authored landing file should record its branch');
      assert.ok(
        smokeFile.includes('agent-leg=codex-app-server'),
        'Codex-authored landing file should identify the agent leg',
      );
      assert.match(
        execGit(['log', '-1', '--pretty=%s'], checkoutDir),
        /^test: evrun full smoke codex landing edit/,
        'Codex-authored landing commit should be HEAD',
      );
      const localHead = execGit(['rev-parse', 'HEAD'], checkoutDir).trim();
      const remoteHead = execGit(['ls-remote', '--heads', 'origin', branchName], checkoutDir).trim().split(/\s+/)[0];
      assert.strictEqual(remoteHead, localHead, 'Codex-authored landing commit should be pushed before PR creation');
      if (process.env.EVRUN_FULL_EVIDENCE_OUT) {
        emitEvidenceFacts(process.env.EVRUN_FULL_EVIDENCE_OUT, {
          runDir,
          record,
          integrityStatus,
          runJsonBytes,
          integrityJsonBytes,
        });
      }
    } finally {
      process.chdir(previousCwd);
      if (previousGitAskPass === undefined) {
        delete process.env.GIT_ASKPASS;
      } else {
        process.env.GIT_ASKPASS = previousGitAskPass;
      }
      if (previousGitPrompt === undefined) {
        delete process.env.GIT_TERMINAL_PROMPT;
      } else {
        process.env.GIT_TERMINAL_PROMPT = previousGitPrompt;
      }
      if (previousGhToken === undefined) {
        delete process.env.GH_TOKEN;
      } else {
        process.env.GH_TOKEN = previousGhToken;
      }
      restoreEnv(previousGitConfig);
    }
  }, 300_000);
});
