import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const scripts = [
  'scripts/run-gf-001-tests.mjs',
  'scripts/run-gf-002-tests.mjs',
  'scripts/run-gf-003-tests.mjs',
  'scripts/run-gf-004-tests.mjs',
  'scripts/run-gf-005-tests.mjs',
];

for (const script of scripts) {
  const result = spawnSync(process.execPath, [script], {
    cwd: rootDir,
    encoding: 'utf8',
    env: { ...process.env, JIG_NESTED_VERIFICATION: '1' },
  });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.status !== 0 || result.signal || result.error)
    throw new Error(`Phase 0 verification runner failed: ${script}`);
}
