import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, test } from 'vitest';
import { composeReferenceRun } from '../../src/bootstrap.js';
import { LocalHarness } from '../../src/harness.js';
import { validateCandidate } from '../../src/intake.js';
import { INTEGRITY_FILE, verifyIntegritySidecar } from '../../src/integrity.js';
import { RecordManager } from '../../src/records.js';
import type { ConfigDoc, PlanInstance, PolicyDoc, RunRecord } from '../../src/types.js';

export const SMOKE_REPOSITORY = 'agentic-workflow-kit/jig-smoke-target';
export const SMOKE_SEED_ISSUE_TITLE = 'EVRUN partial smoke seed: scripted real-provider run';
export const SMOKE_SEED_ISSUE_LABEL = 'jig-candidate';
export const SMOKE_CHANGED_FILE = 'evrun-partial-smoke.txt';
export const SMOKE_PLAN_INSTANCE = {
  plan: {
    id: 'evrun-partial-smoke',
    version: 'execution-plan-shape-v0',
    stories: [
      {
        id: 'EVRUN-PARTIAL-SMOKE',
        title: 'Apply the EVRUN partial scripted smoke edit',
        scope: [SMOKE_CHANGED_FILE],
        authority: {
          requests: ['edit-files', 'run-checks'],
        },
      },
    ],
  },
} satisfies PlanInstance;
export const SMOKE_SEED_ISSUE_BODY = `\`\`\`json\n${JSON.stringify(SMOKE_PLAN_INSTANCE, null, 2)}\n\`\`\``;
export const SMOKE_SCRIPTED_OUTPUT = {
  storyId: 'EVRUN-PARTIAL-SMOKE',
  outcome: 'success',
  evidence: {
    category: 'automated-check',
    name: 'scripted-evrun-partial-smoke',
    result: 'passed',
  },
  changedFiles: [SMOKE_CHANGED_FILE],
} satisfies Record<string, unknown>;
export const SMOKE_REQUIRED_ENV = {
  GITHUB_TOKEN: '<coordinator-provided GitHub token with sandbox repo issue/read, push, and PR create access>',
  JIG_GITHUB_ISSUES_REPOSITORY: SMOKE_REPOSITORY,
  JIG_GITHUB_ISSUES_LABEL: SMOKE_SEED_ISSUE_LABEL,
  JIG_RECORDS_INTEGRITY_KEY: '<coordinator-provided integrity HMAC key>',
  JIG_RECORDS_INTEGRITY_KEY_ID: '<coordinator-provided key identifier>',
} as const;

const REAL_LANDING_FAMILIES = new Set(['runner-action.pushed', 'runner-action.opened-pr', 'runner-action.merged']);
const cleanupDirs: string[] = [];

afterEach(() => {
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

function writeAskPassScript(dir: string): string {
  const scriptPath = join(dir, 'git-askpass.sh');
  writeFileSync(
    scriptPath,
    [
      '#!/bin/sh',
      'case "$1" in',
      '  *Username*) printf "%s\\n" "x-access-token" ;;',
      '  *) printf "%s\\n" "$GITHUB_TOKEN" ;;',
      'esac',
      '',
    ].join('\n'),
  );
  chmodSync(scriptPath, 0o700);
  return scriptPath;
}

function provisionCheckout(): { checkoutDir: string; branchName: string } {
  const tempRoot = mkdtempSync(join(tmpdir(), 'jig-evrun-partial-smoke-'));
  cleanupDirs.push(tempRoot);
  const checkoutDir = join(tempRoot, 'jig-smoke-target');
  const askPassScript = writeAskPassScript(tempRoot);
  const branchName = `evrun-partial-smoke-${Date.now()}-${randomUUID().slice(0, 8)}`;

  process.env.GIT_ASKPASS = askPassScript;
  process.env.GIT_TERMINAL_PROMPT = '0';
  process.env.GH_TOKEN = process.env.GITHUB_TOKEN;

  execFileSync(
    'git',
    ['-c', 'credential.helper=', 'clone', `https://github.com/${SMOKE_REPOSITORY}.git`, checkoutDir],
    {
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  execGit(['checkout', '-b', branchName], checkoutDir);
  execGit(['config', 'user.name', 'jig smoke runner'], checkoutDir);
  execGit(['config', 'user.email', 'jig-smoke-runner@example.invalid'], checkoutDir);

  writeFileSync(
    join(checkoutDir, SMOKE_CHANGED_FILE),
    ['EVRUN partial smoke scripted edit', `branch=${branchName}`, 'agent-leg=scripted-output', ''].join('\n'),
  );
  execGit(['add', SMOKE_CHANGED_FILE], checkoutDir);
  execGit(['commit', '-m', 'test: evrun partial smoke scripted edit'], checkoutDir);
  execGit(['-c', 'credential.helper=', 'push', '--set-upstream', 'origin', `HEAD:${branchName}`], checkoutDir);

  return { checkoutDir, branchName };
}

function smokeConfig(recordDir: string): ConfigDoc {
  return {
    runner: {
      mode: 'local-real-provider-smoke',
      recordDir,
    },
    drivers: {
      agent: 'scripted-stub',
      executionHost: 'local',
      forge: 'github',
      workSource: 'github-issues',
    },
  };
}

function smokePolicy(): PolicyDoc {
  return {
    policy: {
      id: 'evrun-partial-smoke-policy',
      rules: {
        allowLocalDryRun: true,
      },
    },
  };
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function assertSerializedTokenClean(serialized: string): void {
  const forbiddenValues = [
    process.env.GITHUB_TOKEN,
    process.env.GH_TOKEN,
    'x-access-token',
    process.env.GIT_ASKPASS,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  for (const forbidden of forbiddenValues) {
    assert.strictEqual(serialized.includes(forbidden), false, 'serialized evidence must not contain credentials');
  }
  assert.doesNotMatch(serialized, /https:\/\/[^:\s/]+:[^@\s/]+@/i);
}

function assertArtifactTokenClean(runDir: string): {
  runJson: string;
  integrityJson: string;
  runJsonBytes: Buffer;
  integrityJsonBytes: Buffer;
} {
  const runJsonBytes = readFileSync(join(runDir, 'run.json'));
  const runJson = runJsonBytes.toString('utf8');
  const integrityPath = join(runDir, INTEGRITY_FILE);
  assert.ok(existsSync(integrityPath), `${INTEGRITY_FILE} must exist before evidence assertions`);
  const integrityJsonBytes = readFileSync(integrityPath);
  const integrityJson = integrityJsonBytes.toString('utf8');
  const serializedArtifacts = `${runJson}\n${integrityJson}`;
  assertSerializedTokenClean(serializedArtifacts);

  return { runJson, integrityJson, runJsonBytes, integrityJsonBytes };
}

function readSingleRunRecord(recordDir: string): {
  runDir: string;
  record: RunRecord;
  runJsonBytes: Buffer;
  integrityJsonBytes: Buffer;
} {
  const [runName] = readdirSync(recordDir);
  assert.ok(runName, 'expected one generated run directory');
  const runDir = join(recordDir, runName);
  const { runJson, runJsonBytes, integrityJsonBytes } = assertArtifactTokenClean(runDir);
  return {
    runDir,
    record: JSON.parse(runJson) as RunRecord,
    runJsonBytes,
    integrityJsonBytes,
  };
}

function emitEvidenceFacts(
  outPath: string,
  input: {
    record: RunRecord;
    integrityStatus: string;
    runJsonBytes: Buffer;
    integrityJsonBytes: Buffer;
  },
): void {
  const openedPr = input.record.events.find(
    (event) => event.family === 'runner-action.opened-pr' && typeof event.prUrl === 'string',
  );
  assert.ok(openedPr, 'expected opened PR event before emitting evidence facts');
  const landingFamilies = [
    ...new Set(input.record.events.map((event) => event.family).filter((family) => REAL_LANDING_FAMILIES.has(family))),
  ];
  const evidenceFacts = {
    runId: input.record.run.id,
    prUrl: openedPr.prUrl as string,
    landingFamilies,
    runStatus: input.record.run.status,
    integrityStatus: input.integrityStatus,
    runJsonSha256: sha256(input.runJsonBytes),
    integrityJsonSha256: sha256(input.integrityJsonBytes),
  };
  const serialized = `${JSON.stringify(evidenceFacts, null, 2)}\n`;
  assertSerializedTokenClean(serialized);
  writeFileSync(outPath, serialized);
}

describe.skipIf(!process.env.EVRUN_SMOKE)('EVRUN partial real-provider smoke', () => {
  test('work-source to real forge landing records and verifies integrity with a scripted agent leg', async () => {
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
    const recordDir = mkdtempSync(join(tmpdir(), 'jig-evrun-partial-records-'));
    cleanupDirs.push(recordDir);

    try {
      const { checkoutDir } = provisionCheckout();
      process.chdir(checkoutDir);
      const config = smokeConfig(recordDir);
      const policy = smokePolicy();
      const composed = await composeReferenceRun({
        config,
        planInstance: SMOKE_PLAN_INSTANCE,
        scriptedOutput: SMOKE_SCRIPTED_OUTPUT,
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
      assert.ok(record.events.some((event) => REAL_LANDING_FAMILIES.has(event.family)));
      assert.ok(record.events.some((event) => event.family === 'runner-action.opened-pr' && event.prUrl));
      const integrityStatus = verifyIntegritySidecar(runDir, { expected: true }).status;
      assert.strictEqual(integrityStatus, 'verified');
      assert.ok(readFileSync(join(runDir, INTEGRITY_FILE), 'utf8').includes('"hmac"'));
      if (process.env.EVRUN_EVIDENCE_OUT) {
        emitEvidenceFacts(process.env.EVRUN_EVIDENCE_OUT, {
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
    }
  }, 120_000);
});
