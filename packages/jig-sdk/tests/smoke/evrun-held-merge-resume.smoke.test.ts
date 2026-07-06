import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, test } from 'vitest';
import { composeReferenceRun } from '../../src/bootstrap.js';
import { LocalHarness } from '../../src/harness.js';
import { validatePlanForScheduling } from '../../src/intake.js';
import { INTEGRITY_FILE, verifyIntegritySidecar } from '../../src/integrity.js';
import { RecordManager } from '../../src/records.js';
import { resumeRunLoaded } from '../../src/resume.js';
import type { ConfigDoc, PlanInstance, PolicyDoc, RunEvent } from '../../src/types.js';
import {
  emitJsonEvidenceFacts,
  readSingleRunRecord,
  SMOKE_REPOSITORY,
  SMOKE_SEED_ISSUE_LABEL,
  sha256,
} from './evrun-smoke.js';

const HELD_CHANGED_FILE = 'held-merge-smoke.txt';
const HELD_BLOCKED_FILE = 'held-merge-blocked-smoke.txt';
const RESUME_CHANGED_FILE = 'resume-idempotency-smoke.txt';
const RESUME_RULE_FILE = 'policy/resume-idempotency-rule.json';
const cleanupDirs: string[] = [];
const GIT_CONFIG_ENV_KEYS = [
  'GIT_CONFIG_COUNT',
  'GIT_CONFIG_KEY_0',
  'GIT_CONFIG_VALUE_0',
  'GIT_CONFIG_KEY_1',
  'GIT_CONFIG_VALUE_1',
] as const;

const HELD_PLAN_INSTANCE = {
  plan: {
    id: 'p05-held-merge-smoke',
    version: 'execution-plan-shape-v0',
    stories: [
      {
        id: 'HELD-MERGE',
        title: 'Exercise a protected-branch held merge',
        scope: [HELD_CHANGED_FILE],
        authority: {
          requests: ['edit-files', 'run-checks'],
        },
      },
      {
        id: 'BLOCK-SURFACE',
        title: 'Surface a blocked story on the same real GitHub branch',
        scope: [HELD_BLOCKED_FILE],
        authority: {
          requests: ['edit-files', 'run-checks'],
        },
      },
    ],
  },
} satisfies PlanInstance;

const HELD_SCRIPTED_OUTPUT = {
  stories: [
    {
      storyId: 'HELD-MERGE',
      outcome: 'success',
      evidence: {
        category: 'automated-check',
        name: 'scripted-held-merge-smoke',
        result: 'passed',
      },
      changedFiles: [HELD_CHANGED_FILE],
    },
    {
      storyId: 'BLOCK-SURFACE',
      outcome: 'success',
      evidence: {
        category: 'automated-check',
        name: 'scripted-block-surface-smoke',
        result: 'failed',
      },
      changedFiles: [HELD_BLOCKED_FILE],
    },
  ],
} satisfies Record<string, unknown>;

const RESUME_PLAN_INSTANCE = {
  plan: {
    id: 'resume-idempotency-smoke',
    version: 'execution-plan-shape-v0',
    stories: [
      {
        id: 'RESUME-LANDED',
        title: 'Create one real open-pr landing before a safe stopped checkpoint',
        scope: [RESUME_CHANGED_FILE],
        authority: {
          requests: ['edit-files', 'run-checks'],
        },
      },
      {
        id: 'RESUME-PARKED',
        title: 'Park on a rule-governing file after the real landing',
        scope: [RESUME_RULE_FILE],
        authority: {
          requests: ['edit-files', 'run-checks'],
        },
      },
    ],
  },
} satisfies PlanInstance;

const RESUME_SCRIPTED_OUTPUT = {
  stories: [
    {
      storyId: 'RESUME-LANDED',
      outcome: 'success',
      evidence: {
        category: 'automated-check',
        name: 'scripted-resume-landing-smoke',
        result: 'passed',
      },
      changedFiles: [RESUME_CHANGED_FILE],
    },
    {
      storyId: 'RESUME-PARKED',
      outcome: 'success',
      evidence: {
        category: 'automated-check',
        name: 'scripted-resume-park-smoke',
        result: 'passed',
      },
      changedFiles: [RESUME_RULE_FILE],
    },
  ],
} satisfies Record<string, unknown>;

afterEach(() => {
  if (process.env.EVRUN_REAL_EFFECT_KEEP_ARTIFACTS) {
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

function execGhJson<T>(args: string[], cwd: string): T {
  return JSON.parse(
    execFileSync('gh', args, {
      cwd,
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  ) as T;
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

function provisionCheckout(input: {
  prefix: string;
  fileName: string;
  fileLines: string[];
  commitMessage: string;
  createPullRequest?: boolean;
}): {
  checkoutDir: string;
  branchName: string;
} {
  assert.ok(process.env.GITHUB_TOKEN, 'set GITHUB_TOKEN before provisioning the real-effect smoke checkout');
  const tempRoot = mkdtempSync(join(tmpdir(), `jig-${input.prefix}-`));
  cleanupDirs.push(tempRoot);
  const checkoutDir = join(tempRoot, 'jig-smoke-target');
  const branchName = `${input.prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;

  process.env.GH_TOKEN = process.env.GITHUB_TOKEN;
  configureGitHttpsToken(process.env.GITHUB_TOKEN);

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

  writeFileSync(join(checkoutDir, input.fileName), [...input.fileLines, `branch=${branchName}`, ''].join('\n'));
  execGit(['add', input.fileName], checkoutDir);
  execGit(['commit', '-m', input.commitMessage], checkoutDir);
  execGit(['push', '--set-upstream', 'origin', `HEAD:${branchName}`], checkoutDir);
  if (input.createPullRequest) {
    execFileSync('gh', ['pr', 'create', '--fill'], {
      cwd: checkoutDir,
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }

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
      workSource: 'reference',
    },
  };
}

function smokePolicy(extraRules: NonNullable<PolicyDoc['policy']>['rules'] = {}): PolicyDoc {
  return {
    version: 'policy-v0',
    policy: {
      id: 'real-effect-tail-smoke-policy',
      rules: {
        allowLocalDryRun: true,
        ...extraRules,
      },
    },
  };
}

function findEvent(record: { events: RunEvent[] }, family: string, storyId?: string): RunEvent {
  const event = record.events.find(
    (candidate) => candidate.family === family && (!storyId || candidate.storyId === storyId),
  );
  assert.ok(event, `expected ${family}${storyId ? ` for ${storyId}` : ''}`);
  return event;
}

function findLandingHeldEvent(record: { events: RunEvent[] }, storyId: string): RunEvent {
  const event = record.events.find(
    (candidate) =>
      candidate.family === 'story.done' &&
      candidate.storyId === storyId &&
      typeof candidate.mergeability === 'string' &&
      typeof candidate.targetHead === 'string',
  );
  assert.ok(event, `expected held landing story.done for ${storyId}`);
  return event;
}

function uniquePrNumbers(record: { events: RunEvent[] }): number[] {
  return [
    ...new Set(
      record.events
        .map((event) => event.prNumber)
        .filter((prNumber): prNumber is number => typeof prNumber === 'number'),
    ),
  ];
}

function assertRequiredEnv(): void {
  assert.ok(process.env.GITHUB_TOKEN, 'set GITHUB_TOKEN for the sandbox GitHub smoke run');
  assert.strictEqual(
    process.env.JIG_GITHUB_ISSUES_REPOSITORY ?? SMOKE_REPOSITORY,
    SMOKE_REPOSITORY,
    'real-effect smoke must target the sandbox repo',
  );
  assert.strictEqual(
    process.env.JIG_GITHUB_ISSUES_LABEL ?? SMOKE_SEED_ISSUE_LABEL,
    SMOKE_SEED_ISSUE_LABEL,
    'unexpected GitHub Issues label override',
  );
  assert.ok(process.env.JIG_RECORDS_INTEGRITY_KEY, 'set JIG_RECORDS_INTEGRITY_KEY for the sidecar');
}

function branchProtectionSummary(cwd: string): Record<string, unknown> {
  const protection = execGhJson<Record<string, unknown>>(
    ['api', `repos/${SMOKE_REPOSITORY}/branches/main/protection`],
    cwd,
  );
  const reviews = protection.required_pull_request_reviews as Record<string, unknown> | undefined;
  const admins = protection.enforce_admins as Record<string, unknown> | undefined;
  return {
    enforceAdmins: admins?.enabled === true,
    requiredApprovingReviewCount: reviews?.required_approving_review_count,
    dismissStaleReviews: reviews?.dismiss_stale_reviews,
    requiredStatusChecks: protection.required_status_checks ?? null,
  };
}

function assertBlockSurfaceOnGitHub(input: { cwd: string; prNumber: number; targetHead: string }): {
  statusContext: string;
  statusState: string;
  commentFound: boolean;
} {
  const statuses = execGhJson<Array<Record<string, unknown>>>(
    ['api', `repos/${SMOKE_REPOSITORY}/commits/${input.targetHead}/statuses`],
    input.cwd,
  );
  const blockStatus = statuses.find((status) => status.context === 'jig/block');
  assert.ok(blockStatus, 'expected readable jig/block commit status on the surfaced head');
  assert.strictEqual(blockStatus.state, 'failure');

  const comments = execGhJson<Array<Record<string, unknown>>>(
    ['api', `repos/${SMOKE_REPOSITORY}/issues/${input.prNumber}/comments`],
    input.cwd,
  );
  const commentFound = comments.some(
    (comment) => typeof comment.body === 'string' && comment.body.includes('evidence-gate-failed'),
  );
  assert.strictEqual(commentFound, true, 'expected block-surfacing PR comment');

  return {
    statusContext: String(blockStatus.context),
    statusState: String(blockStatus.state),
    commentFound,
  };
}

function listPrsForBranch(cwd: string, branchName: string): Array<Record<string, unknown>> {
  return execGhJson<Array<Record<string, unknown>>>(
    [
      'pr',
      'list',
      '--repo',
      SMOKE_REPOSITORY,
      '--head',
      branchName,
      '--state',
      'all',
      '--json',
      'number,url,headRefName,state',
    ],
    cwd,
  );
}

describe.skipIf(!process.env.EVRUN_HELD_MERGE_SMOKE)('P05 held-merge real-effect smoke', () => {
  test('observes protected-branch held merge and real block-surfacing PR, status, and comment', async () => {
    assertRequiredEnv();
    const previousCwd = process.cwd();
    const envSnapshot = {
      GIT_ASKPASS: process.env.GIT_ASKPASS,
      GIT_TERMINAL_PROMPT: process.env.GIT_TERMINAL_PROMPT,
      GH_TOKEN: process.env.GH_TOKEN,
      ...Object.fromEntries(GIT_CONFIG_ENV_KEYS.map((key) => [key, process.env[key]])),
    };
    const recordDir = mkdtempSync(join(tmpdir(), 'jig-held-merge-records-'));
    cleanupDirs.push(recordDir);

    try {
      const { checkoutDir, branchName } = provisionCheckout({
        prefix: 'held-merge-smoke',
        fileName: HELD_CHANGED_FILE,
        fileLines: ['P05 held merge smoke scripted edit', 'landing-leg=protected-branch-merge'],
        commitMessage: 'test: held merge smoke edit',
        createPullRequest: true,
      });
      process.chdir(checkoutDir);
      const config = smokeConfig(recordDir);
      const policy = smokePolicy();
      const composed = await composeReferenceRun({
        config,
        planInstance: HELD_PLAN_INSTANCE,
        scriptedOutput: HELD_SCRIPTED_OUTPUT,
      });
      const harness = new LocalHarness(composed.agent, new RecordManager({ redaction: composed.redaction }), null, {
        forge: composed.forge,
        blockSurface: composed.blockSurface,
        landingAction: 'merge',
      });

      const status = await harness.run(validatePlanForScheduling(HELD_PLAN_INSTANCE), config, policy);
      assert.strictEqual(status, 'failure');

      const { runDir, record, runJsonBytes, integrityJsonBytes } = readSingleRunRecord(recordDir);
      const held = findLandingHeldEvent(record, 'HELD-MERGE');
      assert.strictEqual(held.outcome, 'done-not-landed');
      assert.strictEqual(held.mergeability, 'held-by-review');
      assert.strictEqual(held.targetRef, `refs/heads/${branchName}`);
      assert.strictEqual(typeof held.targetHead, 'string');

      const openedPr = findEvent(record, 'runner-action.opened-pr', 'BLOCK-SURFACE');
      const postedStatus = findEvent(record, 'runner-action.posted-status', 'BLOCK-SURFACE');
      findEvent(record, 'runner-action.posted-comment', 'BLOCK-SURFACE');
      assert.strictEqual(typeof openedPr.prNumber, 'number');
      assert.strictEqual(postedStatus.targetHead, openedPr.targetHead);
      assert.strictEqual(typeof postedStatus.targetHead, 'string');
      const surface = assertBlockSurfaceOnGitHub({
        cwd: checkoutDir,
        prNumber: openedPr.prNumber as number,
        targetHead: postedStatus.targetHead as string,
      });

      const integrityStatus = verifyIntegritySidecar(runDir, { expected: true }).status;
      assert.strictEqual(integrityStatus, 'verified');
      assert.ok(readFileSync(join(runDir, INTEGRITY_FILE), 'utf8').includes('"hmac"'));

      if (process.env.EVRUN_HELD_MERGE_EVIDENCE_OUT) {
        emitJsonEvidenceFacts(process.env.EVRUN_HELD_MERGE_EVIDENCE_OUT, {
          runId: record.run.id,
          runStatus: record.run.status,
          branchName,
          branchProtection: branchProtectionSummary(checkoutDir),
          heldMerge: {
            storyId: held.storyId,
            outcome: held.outcome,
            mergeability: held.mergeability,
            targetRef: held.targetRef,
            targetHead: held.targetHead,
            prNumber: held.prNumber,
            prUrl: held.prUrl,
          },
          blockSurface: {
            storyId: openedPr.storyId,
            prNumber: openedPr.prNumber,
            prUrl: openedPr.prUrl,
            statusContext: surface.statusContext,
            statusState: surface.statusState,
            commentFound: surface.commentFound,
          },
          integrityStatus,
          runJsonSha256: sha256(runJsonBytes),
          integrityJsonSha256: sha256(integrityJsonBytes),
        });
      }
    } finally {
      process.chdir(previousCwd);
      restoreEnv(envSnapshot);
    }
  }, 120_000);
});

describe.skipIf(!process.env.EVRUN_RESUME_IDEMPOTENCY_SMOKE)('RESUME-3 real-effect idempotency smoke', () => {
  test('resuming after a real open-pr landing records already-landed and does not create a second PR', async () => {
    assertRequiredEnv();
    const previousCwd = process.cwd();
    const envSnapshot = {
      GIT_ASKPASS: process.env.GIT_ASKPASS,
      GIT_TERMINAL_PROMPT: process.env.GIT_TERMINAL_PROMPT,
      GH_TOKEN: process.env.GH_TOKEN,
      ...Object.fromEntries(GIT_CONFIG_ENV_KEYS.map((key) => [key, process.env[key]])),
    };
    const recordDir = mkdtempSync(join(tmpdir(), 'jig-resume-idempotency-records-'));
    cleanupDirs.push(recordDir);

    try {
      const { checkoutDir, branchName } = provisionCheckout({
        prefix: 'resume-idempotency-smoke',
        fileName: RESUME_CHANGED_FILE,
        fileLines: ['RESUME-3 idempotency smoke scripted edit', 'landing-leg=open-pr-before-resume'],
        commitMessage: 'test: resume idempotency smoke edit',
      });
      process.chdir(checkoutDir);
      const config = smokeConfig(recordDir);
      const policy = smokePolicy({
        ruleGoverningSurfaces: [RESUME_RULE_FILE],
      });
      const composed = await composeReferenceRun({
        config,
        planInstance: RESUME_PLAN_INSTANCE,
        scriptedOutput: RESUME_SCRIPTED_OUTPUT,
      });
      const harness = new LocalHarness(composed.agent, new RecordManager({ redaction: composed.redaction }), null, {
        forge: composed.forge,
        blockSurface: composed.blockSurface,
        landingAction: 'open-pr',
      });

      const firstStatus = await harness.run(validatePlanForScheduling(RESUME_PLAN_INSTANCE), config, policy);
      assert.strictEqual(firstStatus, 'failure');
      const firstRecord = readSingleRunRecord(recordDir).record;
      const firstPrs = listPrsForBranch(checkoutDir, branchName);
      assert.strictEqual(firstPrs.length, 1, 'first pass should create exactly one sandbox PR for the branch');
      assert.ok(findEvent(firstRecord, 'runner-action.opened-pr', 'RESUME-LANDED'));
      const stopped = findEvent(firstRecord, 'run.stopped');
      assert.strictEqual(stopped.reason, 'unattended-park');
      assert.strictEqual(stopped.checkpoint, 'after:RESUME-PARKED.parked');

      const resumeStatus = await resumeRunLoaded({
        runDir: readSingleRunRecord(recordDir).runDir,
        scriptedOutput: RESUME_SCRIPTED_OUTPUT,
        config,
        policy,
        planInstance: RESUME_PLAN_INSTANCE,
        workSourceTransport: {
          fetchCandidates: async () => [
            {
              sourceSystem: 'github-issues',
              identifier: 'resume-idempotency-smoke-local-candidate',
              planInstance: RESUME_PLAN_INSTANCE,
            },
          ],
        },
      });
      assert.strictEqual(resumeStatus, 'failure');

      const { record, runJsonBytes, integrityJsonBytes, runDir } = readSingleRunRecord(recordDir);
      const skipped = findEvent(record, 'runner-action.skipped-repeated-effect', 'RESUME-LANDED');
      assert.strictEqual(skipped.reason, 'already-landed');
      assert.strictEqual(skipped.action, 'open-pr');
      assert.strictEqual(skipped.landingKind, 'open-pr');
      const openedPrEvents = record.events.filter(
        (event) => event.family === 'runner-action.opened-pr' && event.storyId === 'RESUME-LANDED',
      );
      assert.strictEqual(openedPrEvents.length, 1, 'resume must not record a second open-pr landing');
      const prNumbers = uniquePrNumbers(record);
      assert.strictEqual(prNumbers.length, 1, 'run record should mention one sandbox PR number');
      const prsAfterResume = listPrsForBranch(checkoutDir, branchName);
      assert.strictEqual(prsAfterResume.length, 1, 'resume must not create a second sandbox PR for the branch');

      const integrityStatus = verifyIntegritySidecar(runDir, { expected: true }).status;
      assert.strictEqual(integrityStatus, 'verified');
      assert.ok(readFileSync(join(runDir, INTEGRITY_FILE), 'utf8').includes('"hmac"'));

      if (process.env.EVRUN_RESUME_IDEMPOTENCY_EVIDENCE_OUT) {
        emitJsonEvidenceFacts(process.env.EVRUN_RESUME_IDEMPOTENCY_EVIDENCE_OUT, {
          runId: record.run.id,
          runStatus: record.run.status,
          branchName,
          firstPass: {
            status: firstStatus,
            stoppedReason: stopped.reason,
            checkpoint: stopped.checkpoint,
            prCountForBranch: firstPrs.length,
          },
          resume: {
            status: resumeStatus,
            skippedReason: skipped.reason,
            action: skipped.action,
            landingKind: skipped.landingKind,
            targetRef: skipped.targetRef,
            targetHead: skipped.targetHead,
            openPrEventCountForLandingStory: openedPrEvents.length,
            prCountForBranchAfterResume: prsAfterResume.length,
          },
          integrityStatus,
          runJsonSha256: sha256(runJsonBytes),
          integrityJsonSha256: sha256(integrityJsonBytes),
        });
      }
    } finally {
      process.chdir(previousCwd);
      restoreEnv(envSnapshot);
    }
  }, 120_000);
});
