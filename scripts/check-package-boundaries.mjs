import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtureRoot = 'tests/fixtures/gf-001-workspace';
const expectedPackageNames = ['@gf-001-fixture/pkg-a', '@gf-001-fixture/pkg-b', '@gf-001-fixture/pkg-c'];
const expectedCodecFiles = ['package.json', 'src/index.ts', 'tsconfig.json'];
const prettyJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const expectedFixtureFiles = new Map([
  ['.gitignore', '.turbo/\n**/dist/\n**/*.tsbuildinfo\n'],
  [
    'pnpm-lock.yaml',
    `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .: {}

  packages/pkg-a: {}

  packages/pkg-b:
    dependencies:
      '@gf-001-fixture/pkg-a':
        specifier: workspace:*
        version: link:../pkg-a

  packages/pkg-c: {}
`,
  ],
  [
    'package.json',
    prettyJson({
      name: '@gf-001-fixture/root',
      version: '0.0.0',
      private: true,
      type: 'module',
      packageManager: 'pnpm@11.9.0',
    }),
  ],
  ['pnpm-workspace.yaml', 'packages:\n  - "packages/*"\n'],
  [
    'tsconfig.base.json',
    `{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true
  }
}
`,
  ],
  [
    'tsconfig.json',
    '{\n  "files": [],\n  "references": [{ "path": "./packages/pkg-a" }, { "path": "./packages/pkg-b" }, { "path": "./packages/pkg-c" }]\n}\n',
  ],
  [
    'packages/pkg-a/package.json',
    prettyJson({
      name: '@gf-001-fixture/pkg-a',
      version: '0.0.0',
      private: true,
      type: 'module',
      scripts: { build: 'tsc --build', typecheck: 'tsc --build --noEmit', test: 'node --test' },
    }),
  ],
  [
    'packages/pkg-a/src/index.ts',
    "export const name = 'pkg-a';\n\nexport function computeA(val: number): number {\n  return val * 2;\n}\n",
  ],
  [
    'packages/pkg-a/tsconfig.json',
    '{\n  "extends": "../../tsconfig.base.json",\n  "compilerOptions": {\n    "outDir": "dist",\n    "rootDir": "src"\n  },\n  "include": ["src/**/*.ts"]\n}\n',
  ],
  [
    'packages/pkg-b/package.json',
    prettyJson({
      name: '@gf-001-fixture/pkg-b',
      version: '0.0.0',
      private: true,
      type: 'module',
      scripts: { build: 'tsc --build', typecheck: 'tsc --build --noEmit', test: 'node --test' },
      dependencies: { '@gf-001-fixture/pkg-a': 'workspace:*' },
    }),
  ],
  [
    'packages/pkg-b/src/index.ts',
    "import { computeA } from '@gf-001-fixture/pkg-a';\n\nexport function computeB(val: number): number {\n  return computeA(val) + 10;\n}\n",
  ],
  [
    'packages/pkg-b/tsconfig.json',
    '{\n  "extends": "../../tsconfig.base.json",\n  "compilerOptions": {\n    "outDir": "dist",\n    "rootDir": "src",\n    "paths": {\n      "@gf-001-fixture/pkg-a": ["../pkg-a/src/index.ts"]\n    }\n  },\n  "include": ["src/**/*.ts"],\n  "references": [{ "path": "../pkg-a" }]\n}\n',
  ],
  [
    'packages/pkg-c/package.json',
    prettyJson({
      name: '@gf-001-fixture/pkg-c',
      version: '0.0.0',
      private: true,
      type: 'module',
      scripts: { build: 'tsc --build', typecheck: 'tsc --build --noEmit', test: 'node --test' },
    }),
  ],
  ['packages/pkg-c/src/index.ts', "export function computeC(): string {\n  return 'pkg-c-isolated';\n}\n"],
  [
    'packages/pkg-c/tsconfig.json',
    '{\n  "extends": "../../tsconfig.base.json",\n  "compilerOptions": {\n    "outDir": "dist",\n    "rootDir": "src"\n  },\n  "include": ["src/**/*.ts"]\n}\n',
  ],
]);

function listFiles(rootDir, current = rootDir) {
  if (!existsSync(current)) return [];
  const entries = readdirSync(current, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(current, entry.name);
    if (entry.isDirectory()) return listFiles(rootDir, path);
    return [relative(rootDir, path)];
  });
}

function assertRegular(rootDir, relativePath, errors) {
  const path = join(rootDir, relativePath);
  if (!existsSync(path)) {
    errors.push(`fixture input is missing: ${relativePath}`);
    return;
  }
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink())
    errors.push(`fixture input must be a regular non-symlink file: ${relativePath}`);
}

function sameMembers(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

export function validatePackageBoundaries(rootDir = process.cwd()) {
  const errors = [];
  for (const forbidden of ['src'])
    if (existsSync(join(rootDir, forbidden)))
      errors.push(`root ${forbidden}/ product source directory is forbidden in GF-001`);

  const packagesRoot = join(rootDir, 'packages');
  if (existsSync(packagesRoot)) {
    const packageEntries = readdirSync(packagesRoot).sort();
    if (JSON.stringify(packageEntries) !== JSON.stringify(['codec', 'conformance', 'runtime-contracts']))
      errors.push('GF-004 permits only the pure codec, private runtime-contracts, and private conformance packages');
    const codecRoot = join(packagesRoot, 'codec');
    const codecFiles = listFiles(codecRoot)
      .filter((path) => !path.startsWith('dist/') && path !== 'tsconfig.tsbuildinfo')
      .sort();
    if (!sameMembers(codecFiles, expectedCodecFiles))
      errors.push(`GF-002 codec file set must stay exact; got ${codecFiles.join(', ')}`);
    const codecManifestPath = join(codecRoot, 'package.json');
    if (existsSync(codecManifestPath)) {
      const codecManifest = JSON.parse(readFileSync(codecManifestPath, 'utf8'));
      if (
        codecManifest.name !== '@agentic-workflow-kit/jig-codec' ||
        codecManifest.private !== true ||
        codecManifest.dependencies ||
        codecManifest.devDependencies ||
        codecManifest.optionalDependencies ||
        codecManifest.peerDependencies ||
        codecManifest.bin ||
        codecManifest.main ||
        codecManifest.module ||
        codecManifest.browser ||
        codecManifest.publishConfig ||
        codecManifest.scripts?.start ||
        Object.keys(codecManifest.scripts ?? {}).some((name) => /^(pre|post)(install|pack|publish|prepare)$/.test(name))
      )
        errors.push('GF-002 codec must remain a dependency-free pure boundary library with no runtime entrypoint');
    }
    const codecSourcePath = join(codecRoot, 'src', 'index.ts');
    if (existsSync(codecSourcePath)) {
      const codecSource = readFileSync(codecSourcePath, 'utf8');
      if (
        /from ['"](?:node:|https?:|net|tls|child_process|fs|path)/.test(codecSource) ||
        /\b(fetch|process|require)\b/.test(codecSource)
      )
        errors.push('GF-002 codec must not add an effect, provider, filesystem, process, or network dependency');
    }
  }

  const runtimeRoot = join(rootDir, 'packages', 'runtime-contracts');
  if (existsSync(runtimeRoot)) {
    const runtimeManifest = JSON.parse(readFileSync(join(runtimeRoot, 'package.json'), 'utf8'));
    if (
      runtimeManifest.name !== '@agentic-workflow-kit/jig-runtime-contracts' ||
      runtimeManifest.private !== true ||
      JSON.stringify(runtimeManifest.dependencies) !==
        JSON.stringify({ '@agentic-workflow-kit/jig-codec': 'workspace:*' }) ||
      runtimeManifest.bin ||
      runtimeManifest.publishConfig ||
      runtimeManifest.scripts?.start
    )
      errors.push('GF-003 runtime contracts must remain private, codec-only, and non-runnable');
  }

  const conformanceRoot = join(rootDir, 'packages', 'conformance');
  if (existsSync(conformanceRoot)) {
    const manifest = JSON.parse(readFileSync(join(conformanceRoot, 'package.json'), 'utf8'));
    if (
      manifest.name !== '@agentic-workflow-kit/jig-conformance' ||
      manifest.private !== true ||
      JSON.stringify(manifest.dependencies) !==
        JSON.stringify({
          '@agentic-workflow-kit/jig-codec': 'workspace:*',
          '@agentic-workflow-kit/jig-runtime-contracts': 'workspace:*',
        }) ||
      manifest.bin ||
      manifest.publishConfig ||
      manifest.scripts?.start
    )
      errors.push('GF-004 conformance must remain private, contract-only, and non-runnable');
    const source = readFileSync(join(conformanceRoot, 'src/index.ts'), 'utf8');
    if (
      /from ['"](?:node:|https?:|net|tls|child_process|fs|path)/.test(source) ||
      /\b(fetch|process|require)\b/.test(source)
    )
      errors.push('GF-004 conformance must not add an effect, provider, filesystem, process, or network dependency');
  }

  const fixtureDir = join(rootDir, fixtureRoot);
  const expectedFiles = [...expectedFixtureFiles.keys()].sort();
  const actualFiles = listFiles(fixtureDir).sort();
  if (!sameMembers(actualFiles, expectedFiles))
    errors.push(`fixture file set must be exact and tooling-only; got ${actualFiles.join(', ')}`);
  for (const file of expectedFiles) assertRegular(fixtureDir, file, errors);
  for (const [file, expected] of expectedFixtureFiles) {
    const path = join(fixtureDir, file);
    if (existsSync(path) && readFileSync(path, 'utf8') !== expected)
      errors.push(`fixture input must exactly match the approved GF-001 bounded content: ${file}`);
  }

  const rootManifestPath = join(fixtureDir, 'package.json');
  if (existsSync(rootManifestPath)) {
    const rootManifest = JSON.parse(readFileSync(rootManifestPath, 'utf8'));
    if (
      rootManifest.private !== true ||
      rootManifest.bin ||
      rootManifest.exports ||
      rootManifest.main ||
      rootManifest.module ||
      rootManifest.types ||
      rootManifest.publishConfig ||
      rootManifest.start ||
      rootManifest.lifecycle
    )
      errors.push('fixture root manifest exposes a forbidden runtime or publishing entrypoint');
  }

  for (const packageName of expectedPackageNames) {
    const slug = packageName.slice(packageName.lastIndexOf('/') + 1);
    const packageDir = join(fixtureDir, 'packages', slug);
    const manifestPath = join(packageDir, 'package.json');
    if (!existsSync(manifestPath)) {
      errors.push(`workspace missing expected package node ${packageName}`);
      continue;
    }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const forbiddenFields = [
      'bin',
      'exports',
      'main',
      'module',
      'types',
      'browser',
      'publishConfig',
      'files',
      'workspaces',
    ];
    if (manifest.private !== true) errors.push(`workspace package ${packageName} must set "private": true`);
    if (forbiddenFields.some((field) => Object.hasOwn(manifest, field)))
      errors.push(`workspace package ${packageName} exposes a forbidden runtime or publishing surface`);
    if (
      Object.hasOwn(manifest.scripts ?? {}, 'start') ||
      Object.keys(manifest.scripts ?? {}).some((name) => /^(pre|post)(install|pack|publish|prepare)$/.test(name))
    )
      errors.push(`workspace package ${packageName} exposes a forbidden lifecycle or start script`);
  }

  const workspace = existsSync(join(fixtureDir, 'pnpm-workspace.yaml'))
    ? readFileSync(join(fixtureDir, 'pnpm-workspace.yaml'), 'utf8')
    : '';
  if (workspace !== 'packages:\n  - "packages/*"\n')
    errors.push('fixture workspace membership must exactly declare the approved fixture graph');
  const solution = existsSync(join(fixtureDir, 'tsconfig.json'))
    ? JSON.parse(readFileSync(join(fixtureDir, 'tsconfig.json'), 'utf8'))
    : {};
  const solutionReferences = (solution.references ?? []).map((reference) => reference.path);
  if (!sameMembers(solutionReferences, ['./packages/pkg-a', './packages/pkg-b', './packages/pkg-c']))
    errors.push('fixture solution TypeScript references must exactly bind the declared workspace graph');
  for (const reference of solutionReferences)
    if (!existsSync(resolve(fixtureDir, reference)))
      errors.push(`fixture solution TypeScript reference is missing: ${reference}`);
  const pkgBConfig = existsSync(join(fixtureDir, 'packages/pkg-b/tsconfig.json'))
    ? JSON.parse(readFileSync(join(fixtureDir, 'packages/pkg-b/tsconfig.json'), 'utf8'))
    : {};
  if (
    !sameMembers(
      (pkgBConfig.references ?? []).map((reference) => reference.path),
      ['../pkg-a'],
    )
  )
    errors.push('fixture package dependency and TypeScript reference graph must remain congruent');

  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const errors = validatePackageBoundaries();
  if (errors.length) {
    console.error('Package boundary check failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else
    console.log(
      'Package boundary check passed (GF-001 fixture substrate and GF-002 pure codec are bounded and hermetic).',
    );
}
