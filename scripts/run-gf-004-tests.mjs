import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

execFileSync(
  'node',
  [
    '--test',
    resolve('tests/gf-004/conformance.test.mjs'),
    resolve('tests/gf-004/evidence-contract.test.mjs'),
    resolve('scripts/check-gf-004-conformance.test.mjs'),
  ],
  { stdio: 'inherit' },
);
