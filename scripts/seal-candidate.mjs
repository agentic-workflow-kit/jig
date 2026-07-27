import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

const defaultRepository = resolve(import.meta.dirname, '..');

function fail(message) {
  throw new Error(message);
}

function digest(content) {
  return createHash('sha256').update(content).digest('hex');
}

function git(repository, ...args) {
  const result = spawnSync('git', args, { cwd: repository, encoding: 'utf8' });
  if (result.status !== 0) fail(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function state(repository) {
  return {
    commit: git(repository, 'rev-parse', 'HEAD'),
    tree: git(repository, 'rev-parse', 'HEAD^{tree}'),
    status: git(repository, 'status', '--porcelain=v1', '--untracked-files=all'),
  };
}

function parseArguments(args) {
  const options = { repository: defaultRepository, commands: [] };
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === '--output' || option === '--base' || option === '--repo' || option === '--command') {
      const value = args[index + 1];
      if (!value) fail(`${option} requires a value`);
      index += 1;
      if (option === '--output') options.output = resolve(value);
      else if (option === '--base') options.base = value;
      else if (option === '--repo') options.repository = resolve(value);
      else options.commands.push(value);
    } else fail(`unknown option: ${option}`);
  }
  if (!options.output || !options.base || options.commands.length === 0)
    fail(
      'usage: node scripts/seal-candidate.mjs --output <external-directory> --base <base-ref> --command <command> [--command <command> ...]',
    );
  return options;
}

function isOutsideRepository(repository, output) {
  const path = relative(repository, output);
  return path === '..' || path.startsWith(`..${sep}`);
}

function runCommand(repository, command) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, { cwd: repository, encoding: 'utf8', shell: true });
  const endedAt = new Date().toISOString();
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  return {
    command,
    startedAt,
    endedAt,
    exitCode: result.status,
    signal: result.signal,
    error: result.error?.message ?? null,
    log: `${stdout}${stderr ? `\n[stderr]\n${stderr}` : ''}`,
  };
}

function seal() {
  const { repository, output, base, commands } = parseArguments(process.argv.slice(2));
  if (!isOutsideRepository(repository, output)) fail('output directory must be outside the candidate repository');
  if (existsSync(output)) fail(`output directory already exists: ${output}`);

  const initial = state(repository);
  if (initial.status) fail('candidate worktree must be clean before sealing');
  const baseCommit = git(repository, 'rev-parse', '--verify', `${base}^{commit}`);
  const baseTree = git(repository, 'rev-parse', `${baseCommit}^{tree}`);
  const mergeBase = git(repository, 'merge-base', initial.commit, baseCommit);

  mkdirSync(output, { recursive: false });
  const observations = commands.map((command, index) => {
    const observation = runCommand(repository, command);
    const logPath = resolve(output, `${String(index + 1).padStart(2, '0')}.log`);
    writeFileSync(logPath, observation.log);
    return {
      command: observation.command,
      startedAt: observation.startedAt,
      endedAt: observation.endedAt,
      exitCode: observation.exitCode,
      signal: observation.signal,
      error: observation.error,
      log: { path: logPath, sha256: digest(observation.log) },
    };
  });
  const final = state(repository);
  const unchanged = final.commit === initial.commit && final.tree === initial.tree && !final.status;
  const allCommandsPassed = observations.every(
    (observation) => observation.exitCode === 0 && observation.signal === null && observation.error === null,
  );
  const envelope = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    candidate: { commit: initial.commit, tree: initial.tree },
    base: { ref: base, commit: baseCommit, tree: baseTree, mergeBase, matchesMergeBase: mergeBase === baseCommit },
    commands: observations,
    final: { ...final, unchangedAndClean: unchanged },
    seal: { valid: allCommandsPassed && unchanged },
  };
  const envelopePath = resolve(output, 'envelope.json');
  writeFileSync(envelopePath, `${JSON.stringify(envelope, null, 2)}\n`);
  console.log(envelopePath);
  if (!envelope.seal.valid) process.exitCode = 1;
}

try {
  seal();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
