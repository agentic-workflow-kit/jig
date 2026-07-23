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

      - name: Write GF-001 evidence
        run: pnpm evidence:write

      - name: Retain GF-001 evidence
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: gf-001-evidence-${githubCandidateShaExpression}
          path: artifacts/gf-001/evidence.json
          if-no-files-found: error
          retention-days: 90`;

const expectedWorkspaceConfig = `# pnpm settings live here in pnpm 11: the package.json \`pnpm\` field is no longer read, and
# \`.npmrc\` is auth-only.
packages: []

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
  test: 'node scripts/run-gf-001-tests.mjs',
  'evidence:write': 'node scripts/write-gf-001-evidence.mjs',
  check:
    'pnpm lint && pnpm format:check && pnpm links:check && pnpm delivery:check && pnpm structure:check && pnpm typecheck && pnpm boundaries:check && pnpm test',
};

const expectedManifest = {
  name: '@agentic-workflow-kit/jig-repo',
  version: '0.0.0',
  description: 'Jig active GF-001 private tooling substrate; product runtime behavior remains unimplemented.',
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
  'scripts/run-gf-001-tests.mjs',
  'scripts/write-gf-001-evidence.mjs',
  'tests/gf-001/evidence-contract.json',
  'tests/gf-001/evidence.test.mjs',
  'tests/gf-001/workspace-substrate.test.mjs',
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
]);

const forbiddenPaths = [
  'packages',
  'src',
  'skills',
  'tools/n1a',
  'vitest.config.ts',
  'scripts/check-delivery-foundation.mjs',
];
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
    errors.push('package.json must exactly preserve the activated GF-001 manifest, scripts, and owned toolchain');
  if (readFileSync(join(rootDir, '.nvmrc'), 'utf8') !== '26\n')
    errors.push('.nvmrc must exactly preserve the approved local Node 26 line');
  if (existsSync(join(rootDir, '.npmrc')))
    errors.push('.npmrc is forbidden: GF-001 fixtures accept no registry credentials or ambient auth configuration');
  if (readFileSync(join(rootDir, 'pnpm-workspace.yaml'), 'utf8') !== expectedWorkspaceConfig)
    errors.push('pnpm-workspace.yaml must exactly preserve every approved workspace and supply-chain safety setting');
  if (readFileSync(join(rootDir, 'turbo.json'), 'utf8') !== expectedTurbo)
    errors.push('turbo.json must exactly preserve the canonical active GF-001 task, input, output, and cache graph');
  if (readFileSync(join(rootDir, '.github/workflows/check.yml'), 'utf8').trim() !== expectedWorkflow.trim()) {
    errors.push(
      'check workflow must strictly match the approved GF-001 least-privilege and evidence-retention contract',
    );
    for (const [name, action] of Object.entries(immutableActions))
      if (!readFileSync(join(rootDir, '.github/workflows/check.yml'), 'utf8').includes(action))
        errors.push(`check workflow is missing immutable ${name} action pin`);
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
      `Active repository structure check passed (GF-001 private tooling substrate; archive ${archiveRef} -> ${archiveCommit}).`,
    );
}
