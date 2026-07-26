import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function validateAuthorityKernelSurface(root = process.cwd(), suppliedSource) {
  const source = suppliedSource ?? readFileSync(resolve(root, 'packages/authority-kernel/src/index.ts'), 'utf8');
  const errors = [];
  if (/from ['"](?:node:|https?:|net|tls|child_process|fs|path)/.test(source)) errors.push('forbidden effect import');
  if (/\b(dispatch|adapter|provider|credential|token|fetch|process|require|setTimeout|Date)\b/i.test(source))
    errors.push('forbidden capability surface');
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = validateAuthorityKernelSurface();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  }
}
