import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo-root.mjs';

// Package `lint` tasks are the affected-precise fast path over their own directories; this gate is
// the completeness net. Biome runs repository-wide so no active file — root manifests, `.agents`
// eval JSON, or anything added later — can fall outside a mandatory check, and Prettier covers the
// Markdown and YAML documents Biome does not format.
const documentGlob = '**/*.{md,yml,yaml}';

function binary(name) {
  const packageLocal = join(import.meta.dirname, '..', 'node_modules', '.bin', name);
  return existsSync(packageLocal) ? packageLocal : join(repoRoot, 'node_modules', '.bin', name);
}

function run(name, args) {
  const result = spawnSync(binary(name), args, { cwd: repoRoot, encoding: 'utf8', stdio: 'inherit' });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

const status = Math.max(run('biome', ['check', '.']), run('prettier', ['--check', documentGlob]));
if (status !== 0) {
  console.error('Repository formatting check failed.');
  process.exitCode = status;
} else console.log('Repository formatting check passed (repository-wide Biome plus Markdown/YAML documents).');
