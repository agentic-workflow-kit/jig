import assert from 'node:assert';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';
import type { RunRecord } from '../src/types.js';
import { buildEvidenceFacts, emitEvidenceFacts } from './smoke/evrun-smoke.js';

const cleanupDirs: string[] = [];

afterEach(() => {
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('P11-AC: EVRUN smoke evidence facts include real-host and Codex observations without secrets', () => {
  const runDir = mkdtempSync(join(tmpdir(), 'jig-evrun-evidence-facts-'));
  cleanupDirs.push(runDir);

  writeFileSync(
    join(runDir, 'attestation.snapshot.json'),
    JSON.stringify(
      {
        driverId: 'real-host',
        runContext: 'local-real-host',
        positive: true,
        containmentMechanism: 'process-group',
        reportedIsolationStrength: 'weak',
        provenIsolationStrength: 'weak',
        negativeEgressObservedOutcome: 'open',
      },
      null,
      2,
    ),
  );

  const record: RunRecord = {
    run: {
      id: 'run-evrun-full-smoke',
      attempt: 1,
      status: 'success',
      planId: 'evrun-full-smoke',
      binding: {
        policyRef: 'smoke-policy',
        configRef: 'mode=local-real-provider-smoke;recordDir=runs',
        workspace: {
          kind: 'unavailable',
          reason: 'not-a-git-worktree',
          detail: 'test fixture',
        },
        drivers: {
          agent: 'codex',
          executionHost: 'real',
          forge: 'github',
          workSource: 'github-issues',
        },
      },
      attestationSnapshot: {
        ref: 'record-artifact:run-evrun-full-smoke/attestation.snapshot.json',
        path: join(runDir, 'attestation.snapshot.json'),
      },
    },
    events: [
      {
        family: 'evidence.modeled',
        storyId: 'EVRUN-FULL-SMOKE',
        result: 'passed',
        observed: {
          driver: 'codex-app-server',
          cliVersion: 'codex-cli 0.142.5',
          threadResumed: false,
          finalTurnStatus: 'completed',
          approvals: [
            {
              decision: 'approved',
              command: 'git rev-parse --abbrev-ref HEAD',
            },
          ],
          commands: [
            {
              command: 'cat evrun-full-smoke.txt',
              status: 'completed',
              exitCode: 0,
            },
          ],
        },
      },
      {
        family: 'runner-action.pushed',
        storyId: 'EVRUN-FULL-SMOKE',
        targetRef: 'refs/heads/example',
        targetHead: 'abc123',
      },
      {
        family: 'runner-action.opened-pr',
        storyId: 'EVRUN-FULL-SMOKE',
        targetRef: 'refs/heads/example',
        targetHead: 'abc123',
        prNumber: 42,
        prUrl: 'https://github.com/agentic-workflow-kit/jig-smoke-target/pull/42',
      },
    ],
  };

  const runJsonBytes = Buffer.from(JSON.stringify(record));
  const integrityJsonBytes = Buffer.from(JSON.stringify({ hmac: 'abc123' }));
  const facts = buildEvidenceFacts({
    runDir,
    record,
    integrityStatus: 'verified',
    runJsonBytes,
    integrityJsonBytes,
  });

  assert.deepStrictEqual(facts.driverSelection, record.run.binding.drivers);
  assert.strictEqual(facts.prNumber, 42);
  assert.strictEqual(facts.prUrl, 'https://github.com/agentic-workflow-kit/jig-smoke-target/pull/42');
  assert.strictEqual(facts.landingOutcome, 'opened-pr');
  assert.deepStrictEqual(facts.landingFamilies, ['runner-action.pushed', 'runner-action.opened-pr']);
  assert.strictEqual(facts.hostAttestation?.driverId, 'real-host');
  assert.strictEqual(facts.hostAttestation?.negativeEgressObservedOutcome, 'open');
  assert.strictEqual(facts.codexObserved?.driver, 'codex-app-server');
  assert.strictEqual(facts.codexObserved?.cliVersion, 'codex-cli 0.142.5');
  assert.strictEqual(facts.codexObserved?.finalTurnStatus, 'completed');

  const outPath = join(runDir, 'evidence-facts.json');
  emitEvidenceFacts(outPath, {
    runDir,
    record,
    integrityStatus: 'verified',
    runJsonBytes,
    integrityJsonBytes,
  });
  const serialized = readFileSync(outPath, 'utf8');
  assert.ok(serialized.includes('"runId": "run-evrun-full-smoke"'));
  assert.ok(serialized.includes('"driver": "codex-app-server"'));
  assert.strictEqual(serialized.includes('x-access-token'), false);
});
