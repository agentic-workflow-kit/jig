import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function validateConformanceSurface(root = process.cwd(), suppliedSource) {
  const source = suppliedSource ?? readFileSync(resolve(root, 'packages/conformance/src/index.ts'), 'utf8');
  const errors = [];
  if (/from ['"](?:node:|https?:|net|tls|child_process|fs|path)/.test(source)) errors.push('forbidden effect import');
  if (/\b(register|configure|dispatch|credential|token|adapter|fetch|process|require)\b/i.test(source))
    errors.push('forbidden capability surface');
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = validateConformanceSurface();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  }
}
