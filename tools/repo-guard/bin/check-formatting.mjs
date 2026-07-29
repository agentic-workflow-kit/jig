import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo-root.mjs';

// Files no package owns: package tasks cover their own directories, so the repository-level gate
// covers the root manifests plus every Markdown and YAML document Biome does not format.
const rootOwnedFiles = ['biome.json', 'package.json', 'tsconfig.base.json', 'turbo.json'];
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

const status = Math.max(run('biome', ['check', ...rootOwnedFiles]), run('prettier', ['--check', documentGlob]));
if (status !== 0) {
  console.error('Repository formatting check failed.');
  process.exitCode = status;
} else console.log('Repository formatting check passed (root-owned manifests and Markdown/YAML documents).');
