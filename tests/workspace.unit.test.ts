import assert from 'node:assert';
import { afterEach, test, vi } from 'vitest';

type SpawnResult = {
  status?: number | null;
  stdout?: string;
  stderr?: string;
  error?: Error;
};

afterEach(() => {
  vi.doUnmock('node:child_process');
  vi.resetModules();
});

async function captureWithGitResults(results: SpawnResult[]) {
  const calls: string[][] = [];
  vi.resetModules();
  vi.doMock('node:child_process', () => ({
    spawnSync: (_cmd: string, args: string[]) => {
      calls.push(args);
      return results.shift() ?? { status: 0, stdout: '' };
    },
  }));

  const workspace = await import('../src/workspace.js');
  return {
    fingerprint: workspace.captureWorkspaceFingerprint('/repo'),
    calls,
  };
}

test('P4-AC-6: workspace fingerprint reports git executable failures', async () => {
  const { fingerprint } = await captureWithGitResults([{ error: new Error('spawnSync git ENOENT'), status: null }]);

  assert.deepStrictEqual(fingerprint, {
    kind: 'unavailable',
    reason: 'git-unavailable',
    detail: 'workspace fingerprint unavailable because git could not be executed',
  });
});

test('P4-AC-6: workspace fingerprint reports git root discovery failures', async () => {
  const { fingerprint } = await captureWithGitResults([{ status: 128, stderr: 'fatal: unsupported worktree' }]);

  assert.deepStrictEqual(fingerprint, {
    kind: 'unavailable',
    reason: 'git-command-failed',
    detail: 'fatal: unsupported worktree',
  });
});

test('P4-AC-6: workspace fingerprint reports HEAD, status, worktree diff, and staged diff failures', async () => {
  const cases: Array<{ results: SpawnResult[]; detail: RegExp }> = [
    {
      results: [
        { status: 0, stdout: '/repo\n' },
        { status: 128, stderr: '' },
      ],
      detail: /git HEAD discovery failed/,
    },
    {
      results: [
        { status: 0, stdout: '/repo\n' },
        { status: 0, stdout: 'abc\n' },
        { status: 128, stderr: '' },
      ],
      detail: /git status failed/,
    },
    {
      results: [
        { status: 0, stdout: '/repo\n' },
        { status: 0, stdout: 'abc\n' },
        { status: 0, stdout: '' },
        { status: 128, stderr: '' },
      ],
      detail: /git diff failed/,
    },
    {
      results: [
        { status: 0, stdout: '/repo\n' },
        { status: 0, stdout: 'abc\n' },
        { status: 0, stdout: '' },
        { status: 0, stdout: '' },
        { status: 128, stderr: '' },
      ],
      detail: /git staged diff failed/,
    },
  ];

  for (const entry of cases) {
    const { fingerprint } = await captureWithGitResults(entry.results);
    if (!('kind' in fingerprint)) {
      assert.fail('expected unavailable workspace fingerprint');
    }
    assert.strictEqual(fingerprint.kind, 'unavailable');
    if (fingerprint.kind === 'unavailable') {
      assert.strictEqual(fingerprint.reason, 'git-command-failed');
      assert.match(fingerprint.detail, entry.detail);
    }
  }
});

test('P4-AC-6: workspace fingerprint hashes dirty git status and diffs deterministically', async () => {
  const { fingerprint, calls } = await captureWithGitResults([
    { status: 0, stdout: '/repo\n' },
    { status: 0, stdout: 'abc\n' },
    { status: 0, stdout: ' M src/workspace.ts\n' },
    { status: 0, stdout: 'diff --git a/src/workspace.ts b/src/workspace.ts\n' },
    { status: 0, stdout: 'diff --git a/staged b/staged\n' },
  ]);

  assert.deepStrictEqual(calls, [
    ['rev-parse', '--show-toplevel'],
    ['rev-parse', 'HEAD'],
    ['status', '--porcelain=v1', '--untracked-files=all'],
    ['diff', '--no-ext-diff', '--binary', '--'],
    ['diff', '--cached', '--no-ext-diff', '--binary', '--'],
  ]);
  assert.ok('kind' in fingerprint);
  assert.strictEqual(fingerprint.kind, 'git');
  assert.strictEqual(fingerprint.root, '/repo');
  assert.strictEqual(fingerprint.repoRoot, '/repo');
  assert.strictEqual(fingerprint.head, 'abc');
  assert.match(fingerprint.changeSetHash, /^[a-f0-9]{64}$/);
});
