import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const subject = process.argv[2];

function digestFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function fixtureDigests(directory, current = directory, result = {}) {
  for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) fixtureDigests(directory, path, result);
    else if (entry.isFile()) result[relative(directory, path)] = digestFile(path);
  }
  return result;
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function writeEvidence() {
  if (!subject) throw new Error('usage: node scripts/write-evidence.mjs <subject>');
  const test = spawnSync('pnpm', ['test'], { cwd: root, encoding: 'utf8' });
  const artifact = {
    schemaVersion: 1,
    subject,
    candidate: { commit: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}') },
    toolchainDigests: Object.fromEntries(
      ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json'].map((path) => [
        path,
        digestFile(join(root, path)),
      ]),
    ),
    fixtureDigests: fixtureDigests(join(root, 'tests', 'fixtures')),
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    test: { command: 'pnpm test', exitCode: test.status },
  };
  const destination = join(root, 'artifacts', subject, 'evidence.json');
  mkdirSync(resolve(destination, '..'), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(destination);
}

try {
  writeEvidence();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
