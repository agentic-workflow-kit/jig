import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

execFileSync(
  'node',
  [
    '--test',
    resolve('tests/gf-005/authority-kernel.test.mjs'),
    resolve('tests/gf-005/evidence-contract.test.mjs'),
    resolve('scripts/check-gf-005-authority.test.mjs'),
  ],
  {
    stdio: 'inherit',
  },
);
