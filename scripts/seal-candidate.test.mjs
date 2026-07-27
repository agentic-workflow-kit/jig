import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const script = join(root, 'scripts', 'seal-candidate.mjs');

function fixture(run) {
  const repository = mkdtempSync(join(tmpdir(), 'jig-seal-repository-'));
  const outputParent = mkdtempSync(join(tmpdir(), 'jig-seal-output-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: repository });
    execFileSync('git', ['config', 'user.email', 'seal-test@example.invalid'], { cwd: repository });
    execFileSync('git', ['config', 'user.name', 'Seal Test'], { cwd: repository });
    writeFileSync(join(repository, 'base.txt'), 'base\n');
    execFileSync('git', ['add', '.'], { cwd: repository });
    execFileSync('git', ['commit', '-qm', 'base'], { cwd: repository });
    writeFileSync(join(repository, 'candidate.txt'), 'candidate\n');
    execFileSync('git', ['add', '.'], { cwd: repository });
    execFileSync('git', ['commit', '-qm', 'candidate'], { cwd: repository });
    return run(repository, outputParent);
  } finally {
    rmSync(repository, { recursive: true, force: true });
    rmSync(outputParent, { recursive: true, force: true });
  }
}

function seal(repository, output, command, withPnpmSeparator = false) {
  return spawnSync(
    process.execPath,
    [
      script,
      ...(withPnpmSeparator ? ['--'] : []),
      '--repo',
      repository,
      '--output',
      output,
      '--base',
      'HEAD~1',
      '--command',
      command,
    ],
    { encoding: 'utf8' },
  );
}

test('seals a clean exact candidate and records its command log digest', () =>
  fixture((repository, outputParent) => {
    const output = join(outputParent, 'success');
    const result = seal(repository, output, `${process.execPath} -e "process.stdout.write('proof')"`);
    assert.equal(result.status, 0, result.stderr);
    const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
    assert.equal(envelope.seal.valid, true);
    assert.equal(envelope.base.matchesMergeBase, true);
    assert.equal(envelope.final.unchangedAndClean, true);
    assert.equal(envelope.commands[0].exitCode, 0);
    assert.match(envelope.commands[0].log.sha256, /^[a-f0-9]{64}$/);
  }));

test('invalidates the seal when a verification command changes the candidate worktree', () =>
  fixture((repository, outputParent) => {
    const output = join(outputParent, 'mutated');
    const result = seal(
      repository,
      output,
      `${process.execPath} -e "require('node:fs').writeFileSync('verification-residue.txt', 'bad')"`,
    );
    assert.equal(result.status, 1);
    const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
    assert.equal(envelope.commands[0].exitCode, 0);
    assert.equal(envelope.final.unchangedAndClean, false);
    assert.equal(envelope.seal.valid, false);
  }));

test('accepts the argument separator forwarded by pnpm scripts', () =>
  fixture((repository, outputParent) => {
    const result = seal(
      repository,
      join(outputParent, 'separator'),
      `${process.execPath} -e "process.stdout.write('proof')"`,
      true,
    );
    assert.equal(result.status, 0, result.stderr);
  }));

test('records a failed verification command in an invalid envelope', () =>
  fixture((repository, outputParent) => {
    const output = join(outputParent, 'failed-command');
    const result = seal(repository, output, `${process.execPath} -e "process.exit(7)"`);
    assert.equal(result.status, 1);
    const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
    assert.equal(envelope.commands[0].exitCode, 7);
    assert.equal(envelope.final.unchangedAndClean, true);
    assert.equal(envelope.seal.valid, false);
  }));

test("retains a verification log larger than Node's default command buffer", () =>
  fixture((repository, outputParent) => {
    const output = join(outputParent, 'large-log');
    const result = seal(
      repository,
      output,
      `${process.execPath} -e "process.stdout.write('x'.repeat(1024 * 1024 + 1))"`,
    );
    assert.equal(result.status, 0, result.stderr);
    const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
    assert.equal(envelope.seal.valid, true);
    assert.equal(readFileSync(envelope.commands[0].log.path, 'utf8').length, 1024 * 1024 + 1);
  }));
