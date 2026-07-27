import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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

function seal(repository, output, command, { base = 'HEAD~1', withPnpmSeparator = false } = {}) {
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
      base,
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
    assert.equal(envelope.commands[1].exitCode, 0);
    assert.match(envelope.commands[0].log.sha256, /^[a-f0-9]{64}$/);
  }));

test('invalidates the seal when a verification command changes the candidate worktree', () =>
  fixture((repository, outputParent) => {
    const output = join(outputParent, 'mutated');
    const result = seal(
      repository,
      output,
      `${process.execPath} -e 'require("node:fs").writeFileSync("${join(repository, 'verification-residue.txt')}", "bad")'`,
    );
    assert.equal(result.status, 1);
    const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
    assert.equal(envelope.commands[0].exitCode, 0);
    assert.equal(envelope.final.unchangedAndClean, false);
    assert.equal(envelope.seal.valid, false);
  }));

test('invalidates the seal when the supplied base is not an ancestor of the candidate', () =>
  fixture((repository, outputParent) => {
    execFileSync('git', ['branch', 'other', 'HEAD~1'], { cwd: repository });
    execFileSync('git', ['checkout', '-q', 'other'], { cwd: repository });
    writeFileSync(join(repository, 'other.txt'), 'other\n');
    execFileSync('git', ['add', '.'], { cwd: repository });
    execFileSync('git', ['commit', '-qm', 'other'], { cwd: repository });
    execFileSync('git', ['checkout', '-q', '-'], { cwd: repository });
    const output = join(outputParent, 'divergent-base');
    const result = seal(repository, output, `${process.execPath} -e "process.stdout.write('proof')"`, {
      base: 'other',
    });
    assert.equal(result.status, 1);
    const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
    assert.equal(envelope.base.matchesMergeBase, false);
    assert.equal(envelope.commands[1].skipped, 'base ancestry failed before verification');
    assert.equal(envelope.seal.valid, false);
  }));

test('records candidate-bound whitespace damage before caller commands', () =>
  fixture((repository, outputParent) => {
    writeFileSync(join(repository, 'whitespace.txt'), 'trailing space \n');
    execFileSync('git', ['add', '.'], { cwd: repository });
    execFileSync('git', ['commit', '-qm', 'whitespace'], { cwd: repository });
    const output = join(outputParent, 'whitespace');
    const result = seal(repository, output, `${process.execPath} -e "process.stdout.write('proof')"`);
    assert.equal(result.status, 1);
    const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
    assert.equal(
      envelope.commands[0].command,
      `git diff --check ${envelope.base.commit}...${envelope.candidate.commit}`,
    );
    assert.equal(envelope.commands[0].exitCode, 2);
    assert.equal(envelope.commands[1].skipped, 'candidate-bound whitespace or subject-cleanliness preflight failed');
    assert.equal(envelope.seal.valid, false);
  }));

test('invalidates a caller command that dirties the cloned verification subject', () =>
  fixture((repository, outputParent) => {
    const output = join(outputParent, 'subject-residue');
    const result = seal(
      repository,
      output,
      `${process.execPath} -e "require('node:fs').writeFileSync('residue.txt', 'bad')"`,
    );
    assert.equal(result.status, 1);
    const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
    assert.equal(envelope.commands[1].exitCode, 0);
    assert.equal(envelope.verificationSubject.states.at(-1).unchangedAndClean, false);
    assert.equal(envelope.seal.valid, false);
  }));

test('seals successfully when invoked from a linked worktree', () =>
  fixture((repository, outputParent) => {
    const linked = join(outputParent, 'linked');
    execFileSync('git', ['worktree', 'add', '-q', '-b', 'linked', linked, 'HEAD'], { cwd: repository });
    try {
      const output = join(outputParent, 'linked-output');
      const result = seal(linked, output, `${process.execPath} -e "process.stdout.write('proof')"`);
      assert.equal(result.status, 0, result.stderr);
      const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
      assert.equal(envelope.seal.valid, true);
      assert.equal(envelope.verificationSubject.setupError, null);
      const commonGitDirectory = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
        cwd: linked,
        encoding: 'utf8',
      }).trim();
      const rejected = seal(
        linked,
        join(commonGitDirectory, 'seal-evidence'),
        `${process.execPath} -e "process.stdout.write('proof')"`,
      );
      assert.equal(rejected.status, 1);
      assert.match(rejected.stderr, /output directory must be outside/);
    } finally {
      execFileSync('git', ['worktree', 'remove', '--force', linked], { cwd: repository });
    }
  }));

test('rejects an output whose symlinked parent resolves inside the candidate', () =>
  fixture((repository, outputParent) => {
    const inside = join(repository, 'artifacts');
    const parent = join(outputParent, 'outside-link');
    mkdirSync(inside);
    symlinkSync(inside, parent, 'dir');
    const result = seal(repository, join(parent, 'envelope'), `${process.execPath} -e "process.stdout.write('proof')"`);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /output directory must be outside/);
  }));

test('recreates package-local workspace links to clone candidate bytes', () =>
  fixture((repository, outputParent) => {
    const codec = join(repository, 'packages', 'codec');
    const namespace = join(repository, 'packages', 'consumer', 'node_modules', '@agentic-workflow-kit');
    mkdirSync(codec, { recursive: true });
    writeFileSync(join(codec, 'index.js'), 'export const candidate = true;\n');
    execFileSync('git', ['add', 'packages'], { cwd: repository });
    execFileSync('git', ['commit', '-qm', 'packages'], { cwd: repository });
    mkdirSync(namespace, { recursive: true });
    writeFileSync(join(repository, '.git', 'info', 'exclude'), '\n/packages/*/node_modules\n');
    symlinkSync('../../../codec', join(namespace, 'jig-codec'));
    const command = `${process.execPath} -e 'const fs=require("node:fs");const p=fs.realpathSync("packages/consumer/node_modules/@agentic-workflow-kit/jig-codec");if(p.startsWith("${repository}")||!p.endsWith("packages/codec"))process.exit(1)'`;
    const output = join(outputParent, 'workspace-link');
    const result = seal(repository, output, command);
    assert.equal(result.status, 0, readFileSync(join(output, 'envelope.json'), 'utf8'));
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
    assert.equal(envelope.commands[1].exitCode, 7);
    assert.equal(envelope.final.unchangedAndClean, true);
    assert.equal(envelope.seal.valid, false);
  }));

test("streams a verification log larger than Node's default command buffer", () =>
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
    assert.equal(readFileSync(envelope.commands[1].log.path, 'utf8').length, 1024 * 1024 + 1);
  }));
