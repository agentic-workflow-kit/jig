import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, test } from 'vitest';
import { createProductionCodexAgentSession } from '../../src/providers/real/codex-app-server.js';
import type { Story } from '../../src/types.js';

const cleanupDirs: string[] = [];

afterEach(() => {
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe.skipIf(!process.env.CODEX_APP_SERVER_SMOKE)('Codex app-server smoke', () => {
  test('runs a real Codex app-server turn behind the opt-in smoke gate', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'jig-codex-app-server-smoke-'));
    cleanupDirs.push(workspace);

    const version = execFileSync('codex', ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    assert.strictEqual(version, 'codex-cli 0.142.5');

    const session = createProductionCodexAgentSession();
    const story: Story = {
      id: 'SMOKE-CODEX-APP-SERVER',
      title: 'Run pwd in the story workspace and reply with a short confirmation.',
      workspace: {
        path: workspace,
      },
      authority: {
        requests: ['run-checks'],
      },
    };

    const result = await session.run(story);

    assert.strictEqual(result.status, 'completed');
    assert.strictEqual((result.observedEvidence as Record<string, unknown>).driver, 'codex-app-server');
  }, 120_000);
});
