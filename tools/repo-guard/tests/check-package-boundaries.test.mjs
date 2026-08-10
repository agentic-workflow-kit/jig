import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import { validatePackageBoundaries } from '../bin/check-package-boundaries.mjs';

const repoRoot = resolve(import.meta.dirname, '../../..');

function withPackages(mutate) {
  const root = mkdtempSync(join(tmpdir(), 'package-boundary-test-'));
  try {
    cpSync(join(repoRoot, 'packages'), join(root, 'packages'), { recursive: true });
    mutate(root);
    return validatePackageBoundaries(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function editManifest(root, packageName, edit) {
  const path = join(root, 'packages', packageName, 'package.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  edit(manifest);
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

test('accepts the current private package boundaries', () => {
  assert.deepEqual(validatePackageBoundaries(repoRoot), []);
});

test('ignores generated TypeScript build metadata', () => {
  const errors = withPackages((root) =>
    writeFileSync(join(root, 'packages', 'codec', 'tsconfig.tsbuildinfo'), 'generated\n'),
  );
  assert.deepEqual(errors, []);
});

test('requires every compiled package to own the standard validation tasks', () => {
  const errors = withPackages((root) =>
    editManifest(root, 'codec', (manifest) => {
      delete manifest.scripts.build;
      delete manifest.scripts.lint;
      delete manifest.scripts.test;
    }),
  );
  assert.ok(errors.some((error) => error.includes('must declare build, lint, and test scripts')));
});

test('rejects public, runnable, and externally dependent packages', () => {
  const errors = withPackages((root) =>
    editManifest(root, 'codec', (manifest) => {
      manifest.private = false;
      manifest.bin = './dist/cli.js';
      manifest.scripts.start = 'node dist/index.js';
      manifest.dependencies = { example: '1.0.0' };
    }),
  );
  assert.ok(errors.some((error) => error.includes('must remain private')));
  assert.ok(errors.some((error) => error.includes('runtime or publishing entrypoint')));
  assert.ok(errors.some((error) => error.includes('start or package lifecycle script')));
  assert.ok(errors.some((error) => error.includes('production dependencies must be private workspace packages')));
});

test('rejects export and type targets that traverse out of dist', () => {
  const errors = withPackages((root) =>
    editManifest(root, 'codec', (manifest) => {
      manifest.exports = './dist/../src/index.js';
      manifest.types = './dist/../src/index.d.ts';
    }),
  );
  assert.ok(errors.some((error) => error.includes('exports must resolve only from dist')));
  assert.ok(errors.some((error) => error.includes('types must resolve only from dist')));
});

test('rejects forbidden imports and ambient runtime capabilities', () => {
  const errors = withPackages((root) =>
    writeFileSync(
      join(root, 'packages', 'authority-kernel', 'src', 'index.ts'),
      "import { readFileSync } from 'node:fs';\nexport const run = () => fetch(String(readFileSync));\n",
    ),
  );
  assert.ok(errors.some((error) => error.includes('imports a non-workspace capability')));
  assert.ok(errors.some((error) => error.includes('forbidden ambient runtime capability')));
});

test('ignores capability words in comments, strings, and member properties', () => {
  const errors = withPackages((root) =>
    writeFileSync(
      join(root, 'packages', 'codec', 'src', 'index.ts'),
      [
        '/** process the batch and fetch its description */',
        "const message = 'setTimeout require globalThis';",
        'const matcher = /fetch[\\/](?:process)/giu;',
        'const member = { process: message };',
        'export const description = member.process;',
        '',
      ].join('\n'),
    ),
  );
  assert.deepEqual(errors, []);
});

test('rejects forbidden capabilities inside template interpolations', () => {
  const errors = withPackages((root) =>
    writeFileSync(
      join(root, 'packages', 'codec', 'src', 'index.ts'),
      `export const value = \`\${fetch('https://example.invalid')}\`;\n`,
    ),
  );
  assert.ok(errors.some((error) => error.includes('forbidden ambient runtime capability')));
});

test('does not let regex literals hide same-line forbidden capabilities', () => {
  const errors = withPackages((root) =>
    writeFileSync(
      join(root, 'packages', 'codec', 'src', 'index.ts'),
      "if (true) /^https?:\\/\\//.test('https://example.invalid'); fetch('https://example.invalid');\n",
    ),
  );
  assert.ok(errors.some((error) => error.includes('forbidden ambient runtime capability')));
});

test('rejects forbidden dependency direction in an established package', () => {
  const errors = withPackages((root) =>
    editManifest(root, 'authority-kernel', (manifest) => {
      manifest.dependencies['@agentic-workflow-kit/jig-runtime-contracts'] = 'workspace:*';
    }),
  );
  assert.ok(errors.some((error) => error.includes('forbidden dependency direction')));
});

test('rejects a Jig package without an explicit dependency policy', () => {
  const errors = withPackages((root) =>
    editManifest(root, 'codec', (manifest) => {
      manifest.name = '@agentic-workflow-kit/jig-codecc';
    }),
  );
  assert.ok(errors.some((error) => error.includes('has no dependency-direction policy')));
});

test('allows package-local relative imports', () => {
  const errors = withPackages((root) => {
    writeFileSync(join(root, 'packages', 'codec', 'src', 'helper.ts'), 'export const helper = 1;\n');
    writeFileSync(join(root, 'packages', 'codec', 'src', 'index.ts'), "export { helper } from './helper.js';\n");
  });
  assert.deepEqual(errors, []);
});

test('permits the qualification friend subpath only from conformance', () => {
  const errors = withPackages((root) =>
    writeFileSync(
      join(root, 'packages', 'local-file-providers', 'src', 'index.ts'),
      "import '@agentic-workflow-kit/jig-runtime-contracts/qualification-certificate';\n",
    ),
  );
  assert.ok(errors.some((error) => error.includes('imports restricted friend subpath')));
});

test('permits the qualification friend relative import only from exact conformance modules', () => {
  const errors = withPackages((root) =>
    writeFileSync(
      join(root, 'packages', 'conformance', 'src', 'provider-admission-qualification.ts'),
      "import '../../runtime-contracts/dist/qualification-certificate.js';\n",
    ),
  );
  assert.deepEqual(errors, []);
});

test('rejects normalized qualification friend relative imports outside conformance', () => {
  const errors = withPackages((root) =>
    writeFileSync(
      join(root, 'packages', 'codec', 'src', 'index.ts'),
      "import '../../../packages/runtime-contracts/dist/../dist/qualification-certificate.js';\n",
    ),
  );
  assert.ok(errors.some((error) => error.includes('imports restricted qualification friend')));
});

test('rejects qualification friend relative imports from local providers', () => {
  const errors = withPackages((root) =>
    writeFileSync(
      join(root, 'packages', 'local-verification-providers', 'src', 'index.ts'),
      "import '../../runtime-contracts/dist/qualification-certificate.js';\n",
    ),
  );
  assert.ok(errors.some((error) => error.includes('imports restricted qualification friend')));
});

test('rejects qualification friend relative imports from runtime and arbitrary siblings', () => {
  const errors = withPackages((root) => {
    writeFileSync(
      join(root, 'packages', 'runtime-contracts', 'src', 'index.ts'),
      "import '../../runtime-contracts/dist/qualification-certificate.js';\n",
    );
    writeFileSync(
      join(root, 'packages', 'codec', 'src', 'index.ts'),
      "import '../../runtime-contracts/dist/qualification-certificate.js';\n",
    );
  });
  assert.equal(errors.filter((error) => error.includes('imports restricted qualification friend')).length, 2);
});

test('rejects the qualification friend package deep import outside exact conformance modules', () => {
  const errors = withPackages((root) =>
    writeFileSync(
      join(root, 'packages', 'runtime-contracts', 'src', 'index.ts'),
      "import '@agentic-workflow-kit/jig-runtime-contracts/qualification-certificate';\n",
    ),
  );
  assert.ok(errors.some((error) => error.includes('imports restricted friend subpath')));
});

test('permits provider admission qualification only from the local integration test', () => {
  const errors = withPackages((root) =>
    writeFileSync(
      join(root, 'packages', 'local-verification-providers', 'tests', 'local-command-provider.test.mjs'),
      "import '../../conformance/dist/provider-admission-qualification.js';\n",
    ),
  );
  assert.deepEqual(errors, []);
});

test('rejects provider admission qualification deep imports from runtime, provider source, and siblings', () => {
  const errors = withPackages((root) => {
    writeFileSync(
      join(root, 'packages', 'runtime-contracts', 'src', 'index.ts'),
      "import '../../conformance/dist/provider-admission-qualification.js';\n",
    );
    writeFileSync(
      join(root, 'packages', 'local-verification-providers', 'src', 'index.ts'),
      "import '../../conformance/dist/provider-admission-qualification.js';\n",
    );
    writeFileSync(
      join(root, 'packages', 'codec', 'src', 'index.ts'),
      "import '../../conformance/dist/provider-admission-qualification.js';\n",
    );
  });
  assert.equal(
    errors.filter((error) => error.includes('imports restricted provider admission qualification')).length,
    3,
  );
});

test('rejects provider admission qualification package deep imports', () => {
  const errors = withPackages((root) => {
    writeFileSync(
      join(root, 'packages', 'codec', 'src', 'index.ts'),
      "import '@agentic-workflow-kit/jig-conformance/provider-admission-qualification';\n",
    );
    writeFileSync(
      join(root, 'packages', 'local-verification-providers', 'tests', 'local-command-provider.test.mjs'),
      "import '@agentic-workflow-kit/jig-conformance/provider-admission-qualification';\n",
    );
  });
  assert.equal(
    errors.filter((error) => error.includes('imports restricted provider admission qualification')).length,
    2,
  );
});

test('rejects alternate relative, dynamic, and re-export spellings of provider admission qualification', () => {
  const errors = withPackages((root) => {
    writeFileSync(
      join(root, 'packages', 'codec', 'src', 'index.ts'),
      "export { qualifyLocalCommandAdmission } from '../../../packages/conformance/dist/provider-admission-qualification.js';\n",
    );
    writeFileSync(
      join(root, 'packages', 'runtime-contracts', 'src', 'index.ts'),
      "const target = '../../conformance/dist/provider-admission-qualification.js'; export const load = () => import(target);\n",
    );
    writeFileSync(
      join(root, 'packages', 'conformance', 'tests', 'conformance.test.mjs'),
      "export * from '@agentic-workflow-kit/jig-conformance/dist/provider-admission-qualification.js';\n",
    );
  });
  assert.equal(errors.filter((error) => error.includes('restricted provider admission qualification')).length, 3);
});

test('rejects the protected runtime transition from providers, root, and siblings', () => {
  const errors = withPackages((root) => {
    writeFileSync(
      join(root, 'packages', 'local-verification-providers', 'src', 'index.ts'),
      "import { createExactLocalCommandAdmissionTransition } from '../../runtime-contracts/dist/provider.js';\n",
    );
    writeFileSync(
      join(root, 'packages', 'runtime-contracts', 'src', 'index.ts'),
      "import { createExactLocalCommandAdmissionTransition } from './provider.js';\n",
    );
    writeFileSync(
      join(root, 'packages', 'codec', 'src', 'index.ts'),
      "import { consumeExactLocalCommandAdmissionTransition } from '../../runtime-contracts/dist/provider.js';\n",
    );
  });
  assert.equal(errors.filter((error) => error.includes('imports restricted runtime transition')).length, 3);
});

test('rejects namespace access and wildcard re-exports of the protected runtime transition', () => {
  const errors = withPackages((root) => {
    writeFileSync(
      join(root, 'packages', 'local-verification-providers', 'src', 'index.ts'),
      "import * as transition from '../../runtime-contracts/dist/provider.js'; export const value = transition;\n",
    );
    writeFileSync(
      join(root, 'packages', 'codec', 'src', 'index.ts'),
      "export * from '../../runtime-contracts/dist/provider.js';\n",
    );
  });
  assert.equal(errors.filter((error) => error.includes('imports restricted runtime transition')).length, 2);
});

test('rejects filesystem deep imports of the private qualification registry', () => {
  const errors = withPackages((root) =>
    writeFileSync(
      join(root, 'packages', 'conformance', 'tests', 'conformance.test.mjs'),
      "import '../../runtime-contracts/dist/qualification-registry.js';\n",
    ),
  );
  assert.ok(errors.some((error) => error.includes('bypasses the private qualification registry boundary')));
});

test('rejects computed dynamic imports that could bypass friend restrictions', () => {
  const errors = withPackages((root) =>
    writeFileSync(
      join(root, 'packages', 'local-file-providers', 'src', 'index.ts'),
      "const name = '@agentic-workflow-kit/jig-runtime-contracts/qualification-certificate'; import(name);\n",
    ),
  );
  assert.ok(errors.some((error) => error.includes('cannot use dynamic import')));
});
