import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deliveryAllowlist } from './check-delivery-track.mjs';

const archiveRef = 'archive/jig-v0-pre-greenfield-2026-07-18';
const archiveTagObject = '1834c58c1485d2be13e32f6e437a2625e6043042';
const archiveCommit = '1731251d866b15b63131a0c3c580e7b563226cf3';
const archiveTree = 'dcd0c1f8a5616283cafbcf54694fcd37dd4888c1';

const immutableActions = {
  checkout: 'actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683',
  pnpmSetup: 'pnpm/action-setup@fe02b34f77f8bc703788d5817da081398fad5dd2',
  setupNode: 'actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af',
  uploadArtifact: 'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
};
const githubCandidateShaExpression = `\${{ github.event.pull_request.head.sha || github.sha }}`;

const expectedWorkflow = `name: check

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  check:
    name: check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          fetch-depth: 0
          fetch-tags: true
          persist-credentials: false
          ref: ${githubCandidateShaExpression}

      - name: Install pnpm
        uses: pnpm/action-setup@fe02b34f77f8bc703788d5817da081398fad5dd2 # v4.0.0
        with:
          version: 11.9.0

      - name: Set up Node
        uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
        with:
          node-version: 22.13.0
          cache: pnpm

      - name: Active repository preflight
        run: node scripts/check-active-repository.mjs

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: check
        run: pnpm check

      - name: Write Greenfield Phase 0 evidence
        run: pnpm evidence:write

      - name: Retain Greenfield Phase 0 evidence
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: greenfield-phase-0-evidence-${githubCandidateShaExpression}
          path: |
            artifacts/gf-001/evidence.json
            artifacts/gf-002/evidence.json
            artifacts/gf-003/evidence.json
            artifacts/gf-004/evidence.json
            artifacts/gf-005/results.json
            artifacts/gf-005/observations.json
            artifacts/gf-005/evidence.json
            artifacts/gf-005/finalization-receipt.json
          if-no-files-found: error
          retention-days: 90`;

const expectedWorkspaceConfig = `# pnpm settings live here in pnpm 11: the package.json \`pnpm\` field is no longer read, and
# \`.npmrc\` is auth-only.
packages:
  - "packages/*"

# --- Supply-chain / toolchain baseline (every archetype) ---
allowBuilds: {} # no dependency runs install/build scripts until reviewed and listed here
minimumReleaseAge: 1440 # skip versions published < 1 day ago (raise to 10080 for a 1-week window)
minimumReleaseAgeExclude: [] # exempt a package when you must pull a fresh release immediately
engineStrict: true # make engines.node a hard gate, not a warning
nodeVersion: "22.13.0" # evaluate dependency engines against the supported floor (pnpm 11.9 needs >=22.13)
pmOnFail: error # fail if the running pnpm differs from the packageManager pin (vs silent download)

# --- Documentation/tooling repository keys ---
savePrefix: "" # exact version pins on \`pnpm add\` (lockfile-as-truth)
verifyDepsBeforeRun: warn # flag a stale node_modules before scripts (promote to error later)
strictPeerDependencies: true # surface peer mismatches early
`;

const expectedTurbo = `{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["package.json", "tsconfig.base.json", "pnpm-workspace.yaml", "pnpm-lock.yaml"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["package.json", "src/**/*.ts", "tsconfig.json", "$TURBO_ROOT$/tsconfig.base.json"],
      "outputs": ["dist/**", "tsconfig.tsbuildinfo"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "inputs": ["package.json", "src/**/*.ts", "tsconfig.json", "$TURBO_ROOT$/tsconfig.base.json"],
      "outputs": ["tsconfig.tsbuildinfo"]
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["package.json", "src/**/*.ts", "$TURBO_ROOT$/tsconfig.base.json"]
    }
  }
}
`;

const expectedScripts = {
  'dev:setup': 'bash scripts/dev-setup.sh',
  'worktree:new': 'bash scripts/worktree-new.sh',
  'worktree:clean': 'bash scripts/worktree-clean.sh',
  format: 'biome check --write . && prettier --write "**/*.{md,yml,yaml}"',
  'format:check': 'prettier --check "**/*.{md,yml,yaml}"',
  lint: 'biome check .',
  'links:check': 'node scripts/check-doc-links.mjs',
  'structure:check': 'node --test scripts/check-active-repository.test.mjs && node scripts/check-active-repository.mjs',
  'delivery:check': 'node --test scripts/check-delivery-track.test.mjs && node scripts/check-delivery-track.mjs',
  typecheck: 'tsc --build tsconfig.json',
  'boundaries:check':
    'node --test scripts/check-package-boundaries.test.mjs && node scripts/check-package-boundaries.mjs',
  'runtime:check': 'node --test scripts/check-runtime-topology.test.mjs && node scripts/check-runtime-topology.mjs',
  test: 'node scripts/run-gf-001-tests.mjs && node scripts/run-gf-002-tests.mjs && node scripts/run-gf-003-tests.mjs && node scripts/run-gf-004-tests.mjs && node scripts/run-gf-005-tests.mjs',
  'evidence:write':
    'node scripts/write-gf-001-evidence.mjs && node scripts/finalize-gf-003-evidence.mjs && node scripts/finalize-gf-004-evidence.mjs && node scripts/finalize-gf-005-evidence.mjs && node scripts/finalize-gf-002-evidence.mjs',
  check:
    'pnpm lint && pnpm format:check && pnpm links:check && pnpm delivery:check && pnpm structure:check && pnpm typecheck && pnpm boundaries:check && pnpm test',
};

const expectedManifest = {
  name: '@agentic-workflow-kit/jig-repo',
  version: '0.0.0',
  description:
    'Jig active GF-001 substrate, GF-002 canonical codec, GF-003 topology contracts, GF-004 private conformance harness, and GF-005 private pure authority kernel; product runtime behavior remains unimplemented.',
  private: true,
  type: 'module',
  packageManager: 'pnpm@11.9.0',
  engines: { node: '>=22.13.0', pnpm: '>=11.9.0' },
  devEngines: { runtime: { name: 'node', version: '^26', onFail: 'warn' } },
  scripts: expectedScripts,
  devDependencies: {
    '@biomejs/biome': '2.5.2',
    prettier: '3.9.3',
    turbo: '2.10.5',
    typescript: '5.8.2',
  },
};

const requiredPaths = [
  'AGENTS.md',
  'README.md',
  'docs/product/README.md',
  'docs/redesign/design/README.md',
  'docs/redesign/guidelines/README.md',
  'docs/delivery/README.md',
  'docs/delivery/greenfield/track.json',
  'docs/delivery/greenfield/story-contract.md',
  'docs/archive/generations/jig-v0-pre-greenfield-2026-07-18.md',
  'docs/archive/reviews/2026-07-18-empty-repository-implementation-readiness-gate.md',
  '.github/workflows/check.yml',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.nvmrc',
  'turbo.json',
  'tsconfig.json',
  'tsconfig.base.json',
  'tsconfig.tools.json',
  'scripts/check-active-repository.mjs',
  'scripts/check-active-repository.test.mjs',
  'scripts/check-doc-links.mjs',
  'scripts/check-delivery-track.mjs',
  'scripts/check-delivery-track.test.mjs',
  'scripts/check-package-boundaries.mjs',
  'scripts/check-package-boundaries.test.mjs',
  'scripts/check-runtime-topology.mjs',
  'scripts/check-runtime-topology.test.mjs',
  'scripts/run-gf-001-tests.mjs',
  'scripts/run-gf-002-tests.mjs',
  'scripts/run-gf-003-tests.mjs',
  'scripts/run-gf-004-tests.mjs',
  'scripts/check-gf-004-conformance.mjs',
  'scripts/check-gf-004-conformance.test.mjs',
  'scripts/finalize-gf-004-evidence.mjs',
  'scripts/finalize-gf-002-evidence.mjs',
  'scripts/finalize-gf-003-evidence.mjs',
  'scripts/run-gf-005-tests.mjs',
  'scripts/check-gf-005-authority.mjs',
  'scripts/check-gf-005-authority.test.mjs',
  'scripts/check-gf-005-evidence.mjs',
  'scripts/finalize-gf-005-evidence.mjs',
  'scripts/write-gf-001-evidence.mjs',
  'scripts/write-gf-002-evidence.mjs',
  'tests/gf-001/evidence-contract.json',
  'tests/gf-001/evidence.test.mjs',
  'tests/gf-001/workspace-substrate.test.mjs',
  'tests/gf-002/codec.test.mjs',
  'tests/gf-002/corpus.test.mjs',
  'tests/gf-002/evidence.test.mjs',
  'tests/gf-002/golden-consumer.mjs',
  'tests/gf-003/topology.test.mjs',
  'tests/gf-003/evidence-contract.test.mjs',
  'packages/codec/package.json',
  'packages/codec/tsconfig.json',
  'packages/codec/src/index.ts',
  'packages/runtime-contracts/package.json',
  'packages/runtime-contracts/tsconfig.json',
  'packages/runtime-contracts/src/index.ts',
  'packages/conformance/package.json',
  'packages/conformance/tsconfig.json',
  'packages/conformance/src/index.ts',
  'tests/gf-004/conformance.test.mjs',
  'tests/gf-004/evidence-contract.test.mjs',
  'tests/fixtures/gf-004/oracle.json',
  'tests/gf-005/authority-kernel.test.mjs',
  'tests/gf-005/evidence-contract.test.mjs',
  'tests/fixtures/gf-005/authority-oracle.json',
  'tests/fixtures/gf-005/evidence-contract.json',
  'packages/authority-kernel/package.json',
  'packages/authority-kernel/tsconfig.json',
  'packages/authority-kernel/src/index.ts',
];

const allowedRootFiles = new Set([
  '.gitignore',
  '.nvmrc',
  '.prettierignore',
  'AGENTS.md',
  'CLAUDE.md',
  'LICENSE',
  'README.md',
  'biome.json',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  'tsconfig.json',
  'tsconfig.base.json',
  'tsconfig.tools.json',
]);
const allowedScriptPaths = new Set(
  requiredPaths
    .filter((path) => path.startsWith('scripts/'))
    .concat(['scripts/dev-setup.sh', 'scripts/worktree-clean.sh', 'scripts/worktree-new.sh']),
);
const allowedGithubPaths = new Set(['.github/workflows/check.yml']);
const allowedArchiveExtensions = new Set(['.json', '.jsonl', '.md', '.txt']);
const allowedFixturePaths = new Set([
  'tests/fixtures/gf-001-workspace/.gitignore',
  'tests/fixtures/gf-001-workspace/package.json',
  'tests/fixtures/gf-001-workspace/pnpm-lock.yaml',
  'tests/fixtures/gf-001-workspace/pnpm-workspace.yaml',
  'tests/fixtures/gf-001-workspace/tsconfig.base.json',
  'tests/fixtures/gf-001-workspace/tsconfig.json',
  'tests/fixtures/gf-001-workspace/packages/pkg-a/package.json',
  'tests/fixtures/gf-001-workspace/packages/pkg-a/src/index.ts',
  'tests/fixtures/gf-001-workspace/packages/pkg-a/tsconfig.json',
  'tests/fixtures/gf-001-workspace/packages/pkg-b/package.json',
  'tests/fixtures/gf-001-workspace/packages/pkg-b/src/index.ts',
  'tests/fixtures/gf-001-workspace/packages/pkg-b/tsconfig.json',
  'tests/fixtures/gf-001-workspace/packages/pkg-c/package.json',
  'tests/fixtures/gf-001-workspace/packages/pkg-c/src/index.ts',
  'tests/fixtures/gf-001-workspace/packages/pkg-c/tsconfig.json',
  'tests/fixtures/gf-002/vectors.json',
  'tests/fixtures/gf-002/corpus.json',
  'tests/fixtures/gf-003/topology.json',
  'tests/fixtures/gf-003/fake-script.json',
]);

const forbiddenPaths = ['src', 'skills', 'tools/n1a', 'vitest.config.ts', 'scripts/check-delivery-foundation.mjs'];
const representativeArchivePaths = [
  'packages/jig-sdk/src/sdk.ts',
  'packages/jig-cli/tests/cli.unit.test.ts',
  'tests/fixtures/m5b-local-mvp/minimal-plan.json',
  'docs/delivery/target-state-implementation/README.md',
  'skills/orchestrate-jig/SKILL.md',
];

function git(rootDir, ...args) {
  return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

function assertRegularTrackedInput(rootDir, path, errors, allowedModes = ['100644']) {
  const absolute = join(rootDir, path);
  if (!existsSync(absolute)) return;
  const stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink()) errors.push(`GF-001 input must be a regular non-symlink file: ${path}`);
  const mode = git(rootDir, 'ls-files', '--stage', '--', path).split(/\s+/)[0];
  if (mode && !allowedModes.includes(mode))
    errors.push(`GF-001 input must be tracked as an approved regular-file mode: ${path}`);
}

export function validateActiveRepository(rootDir = process.cwd()) {
  const errors = [];
  const allowedDeliveryPaths = deliveryAllowlist();

  for (const requiredPath of requiredPaths) {
    if (!existsSync(join(rootDir, requiredPath))) errors.push(`required active path is missing: ${requiredPath}`);
    assertRegularTrackedInput(rootDir, requiredPath, errors);
  }
  for (const fixturePath of allowedFixturePaths) assertRegularTrackedInput(rootDir, fixturePath, errors);
  for (const scriptPath of allowedScriptPaths)
    assertRegularTrackedInput(rootDir, scriptPath, errors, ['100644', '100755']);
  for (const forbiddenPath of forbiddenPaths) {
    const activeEntries = git(rootDir, 'ls-files', '--cached', '--others', '--exclude-standard', '--', forbiddenPath);
    if (activeEntries) errors.push(`archived generation or product path remains active: ${forbiddenPath}`);
  }

  const activePaths = git(rootDir, 'ls-files', '--cached', '--others', '--exclude-standard')
    .split('\n')
    .filter(Boolean);
  for (const path of activePaths) {
    const extension = path.includes('.') ? path.slice(path.lastIndexOf('.')) : '';
    const permittedDocumentationPath =
      path === 'docs/README.md' ||
      allowedDeliveryPaths.has(path) ||
      ((path.startsWith('docs/product/') || path.startsWith('docs/redesign/')) && extension === '.md') ||
      (path.startsWith('docs/archive/') && allowedArchiveExtensions.has(extension));
    const permitted =
      allowedRootFiles.has(path) ||
      allowedScriptPaths.has(path) ||
      allowedGithubPaths.has(path) ||
      permittedDocumentationPath ||
      allowedFixturePaths.has(path) ||
      requiredPaths.includes(path);
    if (!permitted) errors.push(`GF-001 substrate repository has unexpected active path: ${path}`);
  }

  const activeDeliveryPaths = git(
    rootDir,
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '--',
    'docs/delivery',
  )
    .split('\n')
    .filter(Boolean)
    .sort();
  const expectedDeliveryPaths = [...allowedDeliveryPaths].sort();
  if (canonical(activeDeliveryPaths) !== canonical(expectedDeliveryPaths))
    errors.push('active docs/delivery paths do not match the exact documentation-only allowlist');
  const deletedDeliveryPaths = git(rootDir, 'ls-files', '--deleted', '--', 'docs/delivery');
  if (deletedDeliveryPaths)
    errors.push(`active docs/delivery paths are deleted from the working tree: ${deletedDeliveryPaths}`);

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
  } catch {
    manifest = null;
  }
  if (canonical(manifest) !== canonical(expectedManifest))
    errors.push(
      'package.json must exactly preserve the activated GF-001 manifest, scripts, and owned toolchain, including the exact GF-005 surface',
    );
  if (readFileSync(join(rootDir, '.nvmrc'), 'utf8') !== '26\n')
    errors.push('.nvmrc must exactly preserve the approved local Node 26 line');
  if (existsSync(join(rootDir, '.npmrc')))
    errors.push('.npmrc is forbidden: GF-001 fixtures accept no registry credentials or ambient auth configuration');
  if (readFileSync(join(rootDir, 'pnpm-workspace.yaml'), 'utf8') !== expectedWorkspaceConfig)
    errors.push('pnpm-workspace.yaml must exactly preserve every approved workspace and supply-chain safety setting');
  const solution = JSON.parse(readFileSync(join(rootDir, 'tsconfig.json'), 'utf8'));
  if (
    canonical(solution) !==
    canonical({
      files: [],
      references: [
        { path: './tsconfig.tools.json' },
        { path: './packages/codec' },
        { path: './packages/runtime-contracts' },
        { path: './packages/conformance' },
        { path: './packages/authority-kernel' },
      ],
    })
  )
    errors.push(
      'tsconfig.json must bind exactly the tooling substrate and GF-002 through GF-005 private pure contracts',
    );
  const runtimeManifestPath = join(rootDir, 'packages/runtime-contracts/package.json');
  if (existsSync(runtimeManifestPath)) {
    const runtimeManifest = JSON.parse(readFileSync(runtimeManifestPath, 'utf8'));
    if (
      canonical(runtimeManifest) !==
      canonical({
        name: '@agentic-workflow-kit/jig-runtime-contracts',
        version: '0.0.0',
        private: true,
        type: 'module',
        exports: './dist/index.js',
        types: './dist/index.d.ts',
        scripts: { build: 'tsc --build', typecheck: 'tsc --build --noEmit' },
        dependencies: { '@agentic-workflow-kit/jig-codec': 'workspace:*' },
      })
    )
      errors.push('GF-003 runtime-contracts manifest must remain a private codec-only contract package');
  }
  const conformanceManifest = JSON.parse(readFileSync(join(rootDir, 'packages/conformance/package.json'), 'utf8'));
  if (
    canonical(conformanceManifest) !==
    canonical({
      name: '@agentic-workflow-kit/jig-conformance',
      version: '0.0.0',
      private: true,
      type: 'module',
      exports: './dist/index.js',
      types: './dist/index.d.ts',
      scripts: { build: 'tsc --build', typecheck: 'tsc --build --noEmit' },
      dependencies: {
        '@agentic-workflow-kit/jig-codec': 'workspace:*',
        '@agentic-workflow-kit/jig-runtime-contracts': 'workspace:*',
      },
    })
  )
    errors.push('GF-004 conformance manifest must remain a private codec/runtime-contract-only harness');
  const authorityManifestPath = join(rootDir, 'packages/authority-kernel/package.json');
  if (existsSync(authorityManifestPath)) {
    const authorityManifest = JSON.parse(readFileSync(authorityManifestPath, 'utf8'));
    if (
      canonical(authorityManifest) !==
      canonical({
        name: '@agentic-workflow-kit/jig-authority-kernel',
        version: '0.0.0',
        private: true,
        type: 'module',
        exports: './dist/index.js',
        types: './dist/index.d.ts',
        scripts: {
          build: 'tsc --build',
          typecheck: 'tsc --build --noEmit',
          'evidence:check': 'node ../../scripts/check-gf-005-evidence.mjs',
        },
        dependencies: { '@agentic-workflow-kit/jig-codec': 'workspace:*' },
      })
    )
      errors.push('GF-005 authority-kernel manifest must remain a private codec-only pure contract package');
  }
  const authorityConfigPath = join(rootDir, 'packages/authority-kernel/tsconfig.json');
  if (existsSync(authorityConfigPath)) {
    const authorityConfig = JSON.parse(readFileSync(authorityConfigPath, 'utf8'));
    if (
      canonical(authorityConfig) !==
      canonical({
        extends: '../../tsconfig.base.json',
        compilerOptions: {
          outDir: 'dist',
          rootDir: 'src',
          lib: ['ES2022', 'DOM'],
          paths: { '@agentic-workflow-kit/jig-codec': ['../codec/src/index.ts'] },
        },
        include: ['src/**/*.ts'],
        references: [{ path: '../codec' }],
      })
    )
      errors.push('GF-005 authority-kernel TypeScript configuration must remain an isolated codec-only pure package');
  }
  const authoritySourcePath = join(rootDir, 'packages/authority-kernel/src/index.ts');
  if (existsSync(authoritySourcePath)) {
    const authoritySource = readFileSync(authoritySourcePath, 'utf8');
    const authorityImports = [...authoritySource.matchAll(/^import .* from '([^']+)';$/gm)].map((match) => match[1]);
    if (
      canonical(authorityImports) !== canonical(['@agentic-workflow-kit/jig-codec']) ||
      /from ['"]node:|\b(?:fetch|readFile|writeFile|spawn)\s*\(/i.test(authoritySource)
    )
      errors.push('GF-005 authority-kernel source must retain the no-provider, no-adapter, no-I/O pure import surface');
  }
  const codecManifest = JSON.parse(readFileSync(join(rootDir, 'packages/codec/package.json'), 'utf8'));
  if (
    canonical(codecManifest) !==
    canonical({
      name: '@agentic-workflow-kit/jig-codec',
      version: '0.0.0',
      private: true,
      type: 'module',
      exports: './dist/index.js',
      types: './dist/index.d.ts',
      scripts: { build: 'tsc --build', typecheck: 'tsc --build --noEmit' },
    })
  )
    errors.push('GF-002 codec manifest must expose only the private pure-codec build and typecheck surface');
  const codecConfig = JSON.parse(readFileSync(join(rootDir, 'packages/codec/tsconfig.json'), 'utf8'));
  if (
    canonical(codecConfig) !==
    canonical({
      extends: '../../tsconfig.base.json',
      compilerOptions: { outDir: 'dist', rootDir: 'src', lib: ['ES2022', 'DOM'] },
      include: ['src/**/*.ts'],
    })
  )
    errors.push(
      'GF-002 codec TypeScript configuration must remain isolated and browser-free except for encoding primitives',
    );
  if (readFileSync(join(rootDir, 'turbo.json'), 'utf8') !== expectedTurbo)
    errors.push('turbo.json must exactly preserve the canonical active GF-001 task, input, output, and cache graph');
  if (readFileSync(join(rootDir, '.github/workflows/check.yml'), 'utf8').trim() !== expectedWorkflow.trim()) {
    errors.push(
      'check workflow must strictly match the approved GF-001 least-privilege and evidence-retention contract, including exact GF-005 retention',
    );
    for (const [name, action] of Object.entries(immutableActions))
      if (!readFileSync(join(rootDir, '.github/workflows/check.yml'), 'utf8').includes(action))
        errors.push(`check workflow is missing immutable ${name} action pin`);
    if (
      !readFileSync(join(rootDir, '.github/workflows/check.yml'), 'utf8').includes(
        'artifacts/gf-005/finalization-receipt.json',
      )
    )
      errors.push('check workflow is missing exact GF-005 evidence retention');
  }

  try {
    if (git(rootDir, 'rev-parse', archiveRef) !== archiveTagObject)
      errors.push('archive tag object does not match the immutable recovery anchor');
    if (git(rootDir, 'rev-parse', `${archiveRef}^{}`) !== archiveCommit)
      errors.push('archive commit does not match the immutable recovery anchor');
    if (git(rootDir, 'rev-parse', `${archiveRef}^{}^{tree}`) !== archiveTree)
      errors.push('archive tree does not match the immutable recovery anchor');
    for (const archivePath of representativeArchivePaths)
      git(rootDir, 'cat-file', '-e', `${archiveRef}^{commit}:${archivePath}`);
  } catch (error) {
    errors.push(
      `archive ref or representative recovery path could not be verified: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return errors;
}

if (process.argv[1]?.endsWith('check-active-repository.mjs')) {
  const errors = validateActiveRepository();
  if (errors.length) {
    console.error('Active repository structure check failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else
    console.log(
      `Active repository structure check passed (GF-001 substrate through GF-005 pure contracts; archive ${archiveRef} -> ${archiveCommit}).`,
    );
}
