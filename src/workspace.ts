import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import type { UnavailableWorkspaceFingerprint, WorkspaceFingerprint } from './types.js';

export const CLEAN_WORKSPACE_CHANGESET_SENTINEL = 'git-tree-clean';

interface GitCommandResult {
  ok: true;
  stdout: string;
}

interface GitCommandFailure {
  ok: false;
  status: number | null;
  stderr: string;
}

type GitResult = GitCommandResult | GitCommandFailure;

function runGit(cwd: string, args: string[]): GitResult {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
  });

  if (result.error) {
    return {
      ok: false,
      status: result.status,
      stderr: result.error.message,
    };
  }

  if (result.status !== 0) {
    return {
      ok: false,
      status: result.status,
      stderr: (result.stderr ?? '').trim(),
    };
  }

  return {
    ok: true,
    stdout: (result.stdout ?? '').trimEnd(),
  };
}

function unavailableFingerprint(
  reason: UnavailableWorkspaceFingerprint['reason'],
  detail: string,
): WorkspaceFingerprint {
  return {
    kind: 'unavailable',
    reason,
    detail,
  };
}

export function captureWorkspaceFingerprint(cwd: string): WorkspaceFingerprint {
  const rootResult = runGit(cwd, ['rev-parse', '--show-toplevel']);
  if (!rootResult.ok) {
    if (rootResult.stderr.toLowerCase().includes('not a git repository')) {
      return unavailableFingerprint('not-a-git-worktree', 'workspace fingerprint unavailable outside a git worktree');
    }

    if (
      rootResult.stderr.toLowerCase().includes('command not found') ||
      rootResult.stderr.toLowerCase().includes('enoent')
    ) {
      return unavailableFingerprint(
        'git-unavailable',
        'workspace fingerprint unavailable because git could not be executed',
      );
    }

    return unavailableFingerprint(
      'git-command-failed',
      rootResult.stderr || 'workspace fingerprint unavailable because git root discovery failed',
    );
  }

  const headResult = runGit(cwd, ['rev-parse', 'HEAD']);
  if (!headResult.ok) {
    return unavailableFingerprint(
      'git-command-failed',
      headResult.stderr || 'workspace fingerprint unavailable because git HEAD discovery failed',
    );
  }

  const statusResult = runGit(cwd, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (!statusResult.ok) {
    return unavailableFingerprint(
      'git-command-failed',
      statusResult.stderr || 'workspace fingerprint unavailable because git status failed',
    );
  }

  const worktreeDiffResult = runGit(cwd, ['diff', '--no-ext-diff', '--binary', '--']);
  if (!worktreeDiffResult.ok) {
    return unavailableFingerprint(
      'git-command-failed',
      worktreeDiffResult.stderr || 'workspace fingerprint unavailable because git diff failed',
    );
  }

  const stagedDiffResult = runGit(cwd, ['diff', '--cached', '--no-ext-diff', '--binary', '--']);
  if (!stagedDiffResult.ok) {
    return unavailableFingerprint(
      'git-command-failed',
      stagedDiffResult.stderr || 'workspace fingerprint unavailable because git staged diff failed',
    );
  }

  const status = statusResult.stdout;
  const worktreeDiff = worktreeDiffResult.stdout;
  const stagedDiff = stagedDiffResult.stdout;

  const changeSetHash =
    status === '' && worktreeDiff === '' && stagedDiff === ''
      ? CLEAN_WORKSPACE_CHANGESET_SENTINEL
      : createHash('sha256')
          .update(`status\n${status}\n--worktree-diff--\n${worktreeDiff}\n--staged-diff--\n${stagedDiff}`)
          .digest('hex');

  return {
    kind: 'git',
    root: rootResult.stdout,
    repoRoot: rootResult.stdout,
    head: headResult.stdout,
    changeSetHash,
  };
}
