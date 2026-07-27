import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const script = join(root, 'scripts', 'seal-candidate.mjs');

function environmentValue(key) {
  return process.env[key];
}

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

function seal(repository, output, command, { base = 'HEAD~1', env, timeoutMs, withPnpmSeparator = false } = {}) {
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
      ...(timeoutMs ? ['--timeout-ms', String(timeoutMs)] : []),
      '--command',
      command,
    ],
    { encoding: 'utf8', env },
  );
}

function addLockedLocalDependency(repository) {
  const dependency = join(repository, 'fixture-dependency');
  mkdirSync(dependency);
  writeFileSync(join(dependency, 'package.json'), '{"name":"fixture-dependency","version":"1.0.0"}\n');
  writeFileSync(
    join(repository, 'package.json'),
    `${JSON.stringify({
      name: 'seal-fixture',
      private: true,
      packageManager: 'pnpm@11.9.0',
      dependencies: { 'fixture-dependency': 'file:./fixture-dependency' },
      scripts: {
        preinstall:
          "node -e \"require('node:fs').writeFileSync(require('node:path').join(process.env.HOME, 'lifecycle-ran.txt'), 'bad')\"",
        'pnpm:devPreinstall':
          "node -e \"require('node:fs').writeFileSync(require('node:path').join(process.env.HOME, 'lifecycle-ran.txt'), 'bad')\"",
      },
    })}\n`,
  );
  execFileSync('pnpm', ['install', '--lockfile-only', '--ignore-scripts', '--ignore-pnpmfile'], { cwd: repository });
}

function assertConfigDependenciesRequireOwnerDecision(repository, outputParent, workspace) {
  addLockedLocalDependency(repository);
  execFileSync('git', ['add', 'package.json', 'pnpm-lock.yaml', 'fixture-dependency'], { cwd: repository });
  execFileSync('git', ['commit', '-qm', 'locked local dependency'], { cwd: repository });
  writeFileSync(join(repository, 'pnpm-workspace.yaml'), workspace);
  execFileSync('git', ['add', 'pnpm-workspace.yaml'], { cwd: repository });
  execFileSync('git', ['commit', '-qm', 'candidate config dependency'], { cwd: repository });
  const output = join(outputParent, 'config-dependencies');
  const result = seal(repository, output, `${process.execPath} -e "process.stdout.write('proof')"`, {
    base: 'HEAD~2',
  });
  assert.equal(result.status, 1);
  const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
  assert.match(envelope.verificationSubject.setupError, /^OWNER_DECISION_REQUIRED:/);
  assert.equal(envelope.commands[0].skipped, 'verification subject setup failed');
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

test('invalidates ignored residue in the cloned verification subject', () =>
  fixture((repository, outputParent) => {
    writeFileSync(join(repository, '.gitignore'), '.env\n');
    execFileSync('git', ['add', '.gitignore'], { cwd: repository });
    execFileSync('git', ['commit', '-qm', 'ignore-env'], { cwd: repository });
    const output = join(outputParent, 'ignored-subject-residue');
    const result = seal(
      repository,
      output,
      `${process.execPath} -e "require('node:fs').writeFileSync('.env', 'residue')"`,
    );
    assert.equal(result.status, 1);
    const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
    assert.match(envelope.verificationSubject.states.at(-1).status, /!! .env/);
    assert.equal(envelope.verificationSubject.states.at(-1).unchangedAndClean, false);
    assert.equal(envelope.seal.valid, false);
  }));

test('preserves declared TypeScript build output as expected subject state', () =>
  fixture((repository, outputParent) => {
    writeFileSync(join(repository, '.gitignore'), '*.tsbuildinfo\n');
    execFileSync('git', ['add', '.gitignore'], { cwd: repository });
    execFileSync('git', ['commit', '-qm', 'ignore-build-info'], { cwd: repository });
    const output = join(outputParent, 'typescript-build-output');
    const result = seal(
      repository,
      output,
      `${process.execPath} -e "require('node:fs').writeFileSync('tsconfig.tsbuildinfo', 'expected')"`,
    );
    assert.equal(result.status, 0, result.stderr);
    const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
    assert.equal(envelope.verificationSubject.states.at(-1).unexpectedStatus, '');
    assert.equal(envelope.seal.valid, true);
  }));

test('does not expose owner environment secrets to verification commands or logs', () =>
  fixture((repository, outputParent) => {
    const output = join(outputParent, 'sanitized-environment');
    const secret = 'jig-seal-test-secret';
    const result = seal(
      repository,
      output,
      `${process.execPath} -e "if (process.env.JIG_SEAL_TEST_SECRET) { console.log(process.env.JIG_SEAL_TEST_SECRET); process.exit(9) }"`,
      { env: { ...process.env, JIG_SEAL_TEST_SECRET: secret } },
    );
    assert.equal(result.status, 0, result.stderr);
    const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
    assert.equal(envelope.seal.valid, true);
    assert.doesNotMatch(readFileSync(envelope.commands[1].log.path, 'utf8'), new RegExp(secret));
  }));

test('runs verification commands with an isolated home that cannot read inherited owner credentials', () =>
  fixture((repository, outputParent) => {
    const ownerHome = mkdtempSync(join(tmpdir(), 'jig-seal-owner-home-'));
    const secret = 'jig-seal-owner-npmrc-secret';
    try {
      writeFileSync(join(ownerHome, '.npmrc'), `//registry.example.invalid/:_authToken=${secret}\n`);
      const output = join(outputParent, 'isolated-home');
      const result = seal(
        repository,
        output,
        `${process.execPath} -e "const fs=require('node:fs');const path=require('node:path');const config=path.join(process.env.HOME, '.npmrc');if(fs.existsSync(config)){process.stdout.write(fs.readFileSync(config, 'utf8'));process.exit(9)}"`,
        { env: { ...process.env, HOME: ownerHome } },
      );
      assert.equal(result.status, 0, result.stderr);
      const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
      assert.equal(envelope.seal.valid, true);
      assert.doesNotMatch(readFileSync(envelope.commands[1].log.path, 'utf8'), new RegExp(secret));
    } finally {
      rmSync(ownerHome, { recursive: true, force: true });
    }
  }));

test('stages the pinned Corepack package manager without exposing owner home credentials', () =>
  fixture((repository, outputParent) => {
    const ownerHome = mkdtempSync(join(tmpdir(), 'jig-seal-owner-home-'));
    const cacheHome = environmentValue('XDG_CACHE_HOME') ?? join(environmentValue('HOME'), '.cache');
    const source = join(cacheHome, 'node', 'corepack', 'v1', 'pnpm', '11.9.0');
    const secret = 'jig-seal-owner-corepack-secret';
    try {
      assert.equal(existsSync(source), true, `expected cached Corepack pnpm at ${source}`);
      const destination = join(ownerHome, '.cache', 'node', 'corepack', 'v1', 'pnpm', '11.9.0');
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(source, destination, { recursive: true });
      writeFileSync(join(ownerHome, '.npmrc'), `//registry.example.invalid/:_authToken=${secret}\n`);
      const output = join(outputParent, 'staged-corepack');
      const result = seal(
        repository,
        output,
        `${process.execPath} -e "const fs=require('node:fs');const path=require('node:path');const config=path.join(process.env.HOME, '.npmrc');if(fs.existsSync(config)){process.stdout.write(fs.readFileSync(config, 'utf8'));process.exit(9)}" && corepack pnpm@11.9.0 --version`,
        { env: { ...process.env, HOME: ownerHome, XDG_CACHE_HOME: join(ownerHome, '.cache') } },
      );
      assert.equal(result.status, 0, result.stderr);
      const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
      const log = readFileSync(envelope.commands[1].log.path, 'utf8');
      assert.equal(envelope.seal.valid, true);
      assert.match(log, /11\.9\.0/);
      assert.doesNotMatch(log, new RegExp(secret));
    } finally {
      rmSync(ownerHome, { recursive: true, force: true });
    }
  }));

test('runs locked offline dependency setup without candidate hooks and keeps owner data out of caller evidence', () =>
  fixture((repository, outputParent) => {
    addLockedLocalDependency(repository);
    execFileSync('git', ['add', 'package.json', 'pnpm-lock.yaml', 'fixture-dependency'], { cwd: repository });
    execFileSync('git', ['commit', '-qm', 'locked local dependency'], { cwd: repository });
    const ownerHome = mkdtempSync(join(tmpdir(), 'jig-seal-owner-home-'));
    const source = join(environmentValue('HOME'), '.cache', 'node', 'corepack', 'v1', 'pnpm', '11.9.0');
    const secret = 'jig-seal-owner-setup-secret';
    try {
      assert.equal(existsSync(source), true, `expected cached Corepack pnpm at ${source}`);
      const corepack = join(ownerHome, '.cache', 'node', 'corepack', 'v1', 'pnpm', '11.9.0');
      mkdirSync(dirname(corepack), { recursive: true });
      cpSync(source, corepack, { recursive: true });
      writeFileSync(join(ownerHome, '.npmrc'), `//registry.example.invalid/:_authToken=${secret}\n`);
      writeFileSync(
        join(repository, '.pnpmfile.cjs'),
        `throw new Error(require('node:fs').readFileSync(require('node:path').join(process.env.HOME, '.npmrc'), 'utf8'));\n`,
      );
      execFileSync('git', ['add', '.pnpmfile.cjs'], { cwd: repository });
      execFileSync('git', ['commit', '-qm', 'hostile pnpm hook'], { cwd: repository });
      const env = { ...process.env, HOME: ownerHome };
      delete env.XDG_CACHE_HOME;
      const output = join(outputParent, 'isolated-dependency-setup');
      const result = seal(
        repository,
        output,
        `${process.execPath} -e "const fs=require('node:fs');const path=require('node:path');const config=path.join(process.env.HOME, '.npmrc');if(fs.existsSync(config)){process.stdout.write(fs.readFileSync(config, 'utf8'));process.exit(9)}"`,
        { base: 'HEAD~2', env },
      );
      assert.equal(result.status, 0, result.stderr);
      const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
      assert.equal(envelope.verificationSubject.dependencySetup.exitCode, 0);
      assert.equal(envelope.seal.valid, true);
      assert.equal(existsSync(join(ownerHome, 'lifecycle-ran.txt')), false);
      assert.equal(existsSync(join(output, '00-dependency-setup.log')), false);
      assert.doesNotMatch(readFileSync(envelope.commands[1].log.path, 'utf8'), new RegExp(secret));
    } finally {
      rmSync(ownerHome, { recursive: true, force: true });
    }
  }));

test('requires an owner decision before inherited setup accepts candidate config dependencies', () =>
  fixture((repository, outputParent) => {
    assertConfigDependenciesRequireOwnerDecision(repository, outputParent, 'configDependencies:\n  example: 1.0.0\n');
  }));

test('requires an owner decision before inherited setup accepts quoted or escaped config dependency keys', () =>
  fixture((repository, outputParent) => {
    assertConfigDependenciesRequireOwnerDecision(repository, outputParent, '"configDependencies":\n  example: 1.0.0\n');
  }));

test('requires an owner decision before inherited setup accepts a decoded config dependency key', () =>
  fixture((repository, outputParent) => {
    assertConfigDependenciesRequireOwnerDecision(
      repository,
      outputParent,
      '"config\\u0044ependencies":\n  example: 1.0.0\n',
    );
  }));

test('fails closed when a quoted top-level key cannot be safely decoded', () =>
  fixture((repository, outputParent) => {
    assertConfigDependenciesRequireOwnerDecision(
      repository,
      outputParent,
      '"config\\x44ependencies":\n  example: 1.0.0\n',
    );
  }));

test('fails closed when a top-level merge key could import config dependencies', () =>
  fixture((repository, outputParent) => {
    assertConfigDependenciesRequireOwnerDecision(
      repository,
      outputParent,
      'defaults: &defaults\n  configDependencies:\n    example: 1.0.0\n<<: *defaults\n',
    );
  }));

test('keeps a verification command node_modules write out of the original candidate', () =>
  fixture((repository, outputParent) => {
    const sourceResidue = join(repository, 'node_modules', 'verification-residue.txt');
    mkdirSync(join(repository, 'node_modules'));
    const output = join(outputParent, 'isolated-dependencies');
    const result = seal(
      repository,
      output,
      `${process.execPath} -e "require('node:fs').mkdirSync('node_modules', { recursive: true });require('node:fs').writeFileSync('node_modules/verification-residue.txt', 'subject-only')"`,
    );
    assert.equal(result.status, 1);
    assert.equal(existsSync(sourceResidue), false);
    const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
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

test('rejects a workspace link that resolves to the clone root before caller verification', () =>
  fixture((repository, outputParent) => {
    const codec = join(repository, 'packages', 'codec');
    const namespace = join(repository, 'packages', 'consumer', 'node_modules', '@agentic-workflow-kit');
    mkdirSync(codec, { recursive: true });
    writeFileSync(join(codec, 'index.js'), 'export const candidate = true;\n');
    execFileSync('git', ['add', 'packages'], { cwd: repository });
    execFileSync('git', ['commit', '-qm', 'packages'], { cwd: repository });
    mkdirSync(namespace, { recursive: true });
    writeFileSync(join(repository, '.git', 'info', 'exclude'), '\n/packages/*/node_modules\n');
    symlinkSync('../../../../', join(namespace, 'jig-root'));
    const output = join(outputParent, 'workspace-root');
    const result = seal(repository, output, `${process.execPath} -e "process.exit(9)"`);
    assert.equal(result.status, 1);
    const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
    assert.match(envelope.verificationSubject.setupError, /does not resolve inside clone packages/);
    assert.equal(envelope.commands[0].skipped, 'verification subject setup failed');
  }));

test('accepts the argument separator forwarded by pnpm scripts', () =>
  fixture((repository, outputParent) => {
    const result = seal(
      repository,
      join(outputParent, 'separator'),
      `${process.execPath} -e "process.stdout.write('proof')"`,
      { withPnpmSeparator: true },
    );
    assert.equal(result.status, 0, result.stderr);
  }));

test('records every unattempted command after a mid-loop subject-state failure', () =>
  fixture((repository, outputParent) => {
    const output = join(outputParent, 'partial-observations');
    const result = spawnSync(
      process.execPath,
      [
        script,
        '--repo',
        repository,
        '--output',
        output,
        '--base',
        'HEAD~1',
        '--command',
        `${process.execPath} -e "require('node:fs').rmSync('.git', { recursive: true, force: true })"`,
        '--command',
        `${process.execPath} -e "process.exit(9)"`,
      ],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, 1);
    const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
    assert.equal(envelope.commands.length, 3);
    assert.equal(envelope.commands[1].exitCode, 0);
    assert.equal(envelope.commands[2].skipped, 'verification subject setup failed');
    assert.equal(envelope.seal.valid, false);
  }));

test('invalidates a command that exceeds the recorded timeout', () =>
  fixture((repository, outputParent) => {
    const output = join(outputParent, 'timeout');
    const result = seal(repository, output, `${process.execPath} -e "setTimeout(() => {}, 1000)"`, {
      timeoutMs: 250,
    });
    assert.equal(result.status, 1);
    const envelope = JSON.parse(readFileSync(join(output, 'envelope.json'), 'utf8'));
    assert.equal(envelope.verificationSubject.timeoutMs, 250);
    assert.match(envelope.commands[1].error ?? '', /timed out/i);
    assert.equal(envelope.seal.valid, false);
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
