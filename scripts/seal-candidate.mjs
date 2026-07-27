import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  appendFileSync,
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const defaultRepository = resolve(import.meta.dirname, '..');
const defaultTimeoutMs = 30 * 60 * 1000;

function fail(message) {
  throw new Error(message);
}

function digest(content) {
  return createHash('sha256').update(content).digest('hex');
}

function git(repository, timeoutMs, ...args) {
  const result = spawnSync('git', args, { cwd: repository, encoding: 'utf8', timeout: timeoutMs });
  if (result.status !== 0) fail(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function gitOutput(repository, timeoutMs, ...args) {
  const result = spawnSync('git', args, { cwd: repository, encoding: 'utf8', timeout: timeoutMs });
  if (result.status !== 0) fail(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function state(repository, timeoutMs) {
  return {
    commit: git(repository, timeoutMs, 'rev-parse', 'HEAD'),
    tree: git(repository, timeoutMs, 'rev-parse', 'HEAD^{tree}'),
    status: git(repository, timeoutMs, 'status', '--porcelain=v1', '--untracked-files=all'),
  };
}

function parseArguments(args) {
  const options = { repository: defaultRepository, commands: [], timeoutMs: defaultTimeoutMs };
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === '--') continue;
    if (option === '--output' || option === '--base' || option === '--repo' || option === '--command' || option === '--timeout-ms') {
      const value = args[index + 1];
      if (!value) fail(`${option} requires a value`);
      index += 1;
      if (option === '--output') options.output = resolve(value);
      else if (option === '--base') options.base = value;
      else if (option === '--repo') options.repository = resolve(value);
      else if (option === '--timeout-ms') {
        const timeoutMs = Number(value);
        if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) fail('--timeout-ms must be a positive integer');
        options.timeoutMs = timeoutMs;
      }
      else options.commands.push(value);
    } else fail(`unknown option: ${option}`);
  }
  if (!options.output || !options.base || options.commands.length === 0)
    fail(
      'usage: node scripts/seal-candidate.mjs --output <external-directory> --base <base-ref> [--timeout-ms <positive-integer>] --command <command> [--command <command> ...]',
    );
  return options;
}

function isInside(root, candidate) {
  const path = relative(root, candidate);
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
}

function isOutsideRepository(repository, output, timeoutMs) {
  const canonicalParent = realpathSync(dirname(output));
  const destination = join(canonicalParent, basename(output));
  const commonGitDirectory = realpathSync(
    gitOutput(repository, timeoutMs, 'rev-parse', '--path-format=absolute', '--git-common-dir'),
  );
  const protectedRoots = [
    realpathSync(repository),
    commonGitDirectory,
    ...gitOutput(repository, timeoutMs, 'worktree', 'list', '--porcelain')
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => realpathSync(line.slice('worktree '.length))),
  ];
  return protectedRoots.every((root) => !isInside(root, destination));
}

function verifyWorkspaceLinks(repository, subject) {
  const namespace = '@agentic-workflow-kit';
  const packages = join(subject, 'packages');
  if (!existsSync(packages)) return;
  for (const packageEntry of readdirSync(packages, { withFileTypes: true })) {
    if (!packageEntry.isDirectory()) continue;
    const namespaceDirectory = join(subject, 'packages', packageEntry.name, 'node_modules', namespace);
    if (!existsSync(namespaceDirectory)) continue;
    for (const entry of readdirSync(namespaceDirectory)) {
      const link = join(namespaceDirectory, entry);
      if (!lstatSync(link).isSymbolicLink()) continue;
      const resolved = realpathSync(link);
      const clonePackages = realpathSync(join(subject, 'packages'));
      const sourceRepository = realpathSync(repository);
      const insideClonePackages = isInside(clonePackages, resolved);
      const insideSourceRepository = isInside(sourceRepository, resolved);
      if (!insideClonePackages || insideSourceRepository)
        fail(`workspace link ${link} does not resolve inside clone packages`);
    }
  }
}

function copyWorkspaceLinksForManifestFreeFixture(repository, subject) {
  const namespace = '@agentic-workflow-kit';
  const packages = join(repository, 'packages');
  if (!existsSync(packages)) return;
  for (const packageEntry of readdirSync(packages, { withFileTypes: true })) {
    if (!packageEntry.isDirectory()) continue;
    const sourceNamespace = join(repository, 'packages', packageEntry.name, 'node_modules', namespace);
    if (!existsSync(sourceNamespace)) continue;
    const targetNamespace = join(subject, 'packages', packageEntry.name, 'node_modules', namespace);
    mkdirSync(targetNamespace, { recursive: true });
    for (const entry of readdirSync(sourceNamespace)) {
      const source = join(sourceNamespace, entry);
      if (lstatSync(source).isSymbolicLink()) symlinkSync(readlinkSync(source), join(targetNamespace, entry));
    }
  }
}

function runCommand(repository, command, logPath, timeoutMs) {
  const startedAt = new Date().toISOString();
  const logFile = openSync(logPath, 'wx');
  let result;
  try {
    result = spawnSync(command, {
      cwd: repository,
      encoding: 'utf8',
      shell: true,
      stdio: ['ignore', logFile, logFile],
      timeout: timeoutMs,
    });
  } finally {
    closeSync(logFile);
  }
  const endedAt = new Date().toISOString();
  return {
    command,
    startedAt,
    endedAt,
    exitCode: result.status,
    signal: result.signal,
    error: result.error?.code === 'ETIMEDOUT' ? `command timed out after ${timeoutMs}ms` : (result.error?.message ?? null),
    log: readFileSync(logPath),
  };
}

function commandObservation(repository, command, logPath, timeoutMs) {
  const observation = runCommand(repository, command, logPath, timeoutMs);
  return {
    command: observation.command,
    startedAt: observation.startedAt,
    endedAt: observation.endedAt,
    exitCode: observation.exitCode,
    signal: observation.signal,
    error: observation.error,
    log: { path: logPath, sha256: digest(observation.log) },
  };
}

function verificationSubject(repository, candidateCommit, timeoutMs) {
  const path = join(tmpdir(), `jig-seal-${candidateCommit.slice(0, 12)}-${process.pid}`);
  const clone = spawnSync('git', ['clone', '--no-local', '--no-checkout', repository, path], {
    encoding: 'utf8',
    timeout: timeoutMs,
  });
  if (clone.status !== 0) fail(`git clone verification subject failed: ${clone.stderr.trim()}`);
  try {
    git(path, timeoutMs, 'checkout', '--detach', candidateCommit);
    appendFileSync(
      join(path, '.git', 'info', 'exclude'),
      '\n/node_modules\n/node_modules/\n/packages/*/node_modules\n/packages/*/node_modules/\n',
    );
    if (!existsSync(join(path, 'package.json'))) {
      copyWorkspaceLinksForManifestFreeFixture(repository, path);
    }
    verifyWorkspaceLinks(repository, path);
    return path;
  } catch (error) {
    rmSync(path, { recursive: true, force: true });
    throw error;
  }
}

function subjectState(subject, candidate, timeoutMs) {
  const observed = state(subject, timeoutMs);
  return {
    ...observed,
    unchangedAndClean: observed.commit === candidate.commit && observed.tree === candidate.tree && !observed.status,
  };
}

function seal() {
  const { repository, output, base, commands, timeoutMs } = parseArguments(process.argv.slice(2));
  if (!isOutsideRepository(repository, output, timeoutMs)) fail('output directory must be outside the candidate repository');
  if (existsSync(output)) fail(`output directory already exists: ${output}`);

  const initial = state(repository, timeoutMs);
  if (initial.status) fail('candidate worktree must be clean before sealing');
  const baseCommit = git(repository, timeoutMs, 'rev-parse', '--verify', `${base}^{commit}`);
  const baseTree = git(repository, timeoutMs, 'rev-parse', `${baseCommit}^{tree}`);
  const mergeBase = git(repository, timeoutMs, 'merge-base', initial.commit, baseCommit);

  mkdirSync(output, { recursive: false });
  let subject;
  let observations;
  let dependencySetup = null;
  let recordedCommandCount = 0;
  const subjectStates = [];
  let setupError = null;
  try {
    if (mergeBase !== baseCommit) {
      observations = [
        {
          command: `git diff --check ${baseCommit}...${initial.commit}`,
          skipped: 'base is not an ancestor of candidate',
        },
        ...commands.map((command) => ({ command, skipped: 'base ancestry failed before verification' })),
      ];
    } else {
      subject = verificationSubject(repository, initial.commit, timeoutMs);
      if (existsSync(join(subject, 'package.json'))) {
        dependencySetup = commandObservation(
          subject,
          'pnpm install --frozen-lockfile --offline --ignore-scripts',
          resolve(output, '00-dependency-setup.log'),
          timeoutMs,
        );
        if (dependencySetup.exitCode !== 0 || dependencySetup.signal !== null || dependencySetup.error !== null)
          fail('clone-local dependency setup failed');
        verifyWorkspaceLinks(repository, subject);
      }
      const preflight = commandObservation(
        subject,
        `git diff --check ${baseCommit}...${initial.commit}`,
        resolve(output, '01.log'),
        timeoutMs,
      );
      subjectStates.push({ after: 'candidate-bound whitespace check', ...subjectState(subject, initial, timeoutMs) });
      observations = [preflight];
      for (const [index, command] of commands.entries()) {
        if (preflight.exitCode !== 0 || !subjectStates.at(-1).unchangedAndClean) {
          observations.push({ command, skipped: 'candidate-bound whitespace or subject-cleanliness preflight failed' });
          continue;
        }
        observations.push(
          commandObservation(subject, command, resolve(output, `${String(index + 2).padStart(2, '0')}.log`), timeoutMs),
        );
        recordedCommandCount = index + 1;
        subjectStates.push({ after: command, ...subjectState(subject, initial, timeoutMs) });
      }
    }
  } catch (error) {
    setupError = error instanceof Error ? error.message : String(error);
    const skipped = commands
      .slice(recordedCommandCount)
      .map((command) => ({ command, skipped: 'verification subject setup failed' }));
    observations = observations ? [...observations, ...skipped] : skipped;
  } finally {
    if (subject) rmSync(subject, { recursive: true, force: true });
  }
  const final = state(repository, timeoutMs);
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
    verificationSubject: {
      commit: initial.commit,
      tree: initial.tree,
      localClone: true,
      timeoutMs,
      dependencySetup,
      states: subjectStates,
      setupError,
    },
    seal: {
      valid:
        allCommandsPassed &&
        unchanged &&
        mergeBase === baseCommit &&
        !setupError &&
        subjectStates.every((entry) => entry.unchangedAndClean),
    },
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
