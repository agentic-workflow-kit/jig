import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deliveryAllowlist } from './check-delivery-track.mjs';
import { repoRoot } from './repo-root.mjs';

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

env:
  TURBO_TELEMETRY_DISABLED: "1"

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
        run: node tools/repo-guard/bin/check-active-repository.mjs

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
          path: artifacts/
          if-no-files-found: error
          retention-days: 90`;

const expectedWorkspaceConfig = `# pnpm settings live here in pnpm 11: the package.json \`pnpm\` field is no longer read, and
# \`.npmrc\` is auth-only.
packages:
  - "packages/*"
  - "tools/*"

# --- Single-sourced toolchain versions consumed by workspace packages via \`catalog:\` ---
catalog:
  "@biomejs/biome": 2.5.2
  prettier: 3.9.3
  typescript: 5.8.2

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
  "ui": "stream",
  "globalDependencies": ["package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "tsconfig.base.json"],
  "futureFlags": { "affectedUsingTaskInputs": true },
  "tasks": {
    "topo": { "dependsOn": ["^topo"] },
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", "!tests/**"],
      "outputs": ["dist/**"]
    },
    "lint": {
      "dependsOn": ["topo"],
      "inputs": ["$TURBO_DEFAULT$", "$TURBO_ROOT$/biome.json"],
      "outputs": []
    },
    "test": { "dependsOn": ["build"], "outputs": [] },
    "check": { "dependsOn": ["lint", "build", "test"] }
  }
}
`;

const packageTaskScripts = { build: 'tsc -p tsconfig.json', lint: 'biome check .', test: 'node --test' };
const packageToolchain = { '@biomejs/biome': 'catalog:', typescript: 'catalog:' };

const expectedGuardTurbo = `{
  "$schema": "https://turbo.build/schema.json",
  "extends": ["//"],
  "tasks": {
    "guard": {
      "dependsOn": [
        "guard:structure",
        "guard:delivery",
        "guard:links",
        "guard:boundaries",
        "guard:topology",
        "guard:format"
      ]
    },
    "guard:structure": {
      "inputs": [
        "$TURBO_ROOT$/**",
        "!$TURBO_ROOT$/**/dist/**",
        "!$TURBO_ROOT$/**/node_modules/**",
        "!$TURBO_ROOT$/**/.turbo/**",
        "!$TURBO_ROOT$/artifacts/**"
      ],
      "cache": false
    },
    "guard:delivery": {
      "inputs": [
        "$TURBO_ROOT$/**",
        "!$TURBO_ROOT$/**/dist/**",
        "!$TURBO_ROOT$/**/node_modules/**",
        "!$TURBO_ROOT$/**/.turbo/**",
        "!$TURBO_ROOT$/artifacts/**"
      ],
      "outputs": []
    },
    "test:delivery": {
      "inputs": [
        "$TURBO_ROOT$/**",
        "!$TURBO_ROOT$/**/dist/**",
        "!$TURBO_ROOT$/**/node_modules/**",
        "!$TURBO_ROOT$/**/.turbo/**",
        "!$TURBO_ROOT$/artifacts/**"
      ],
      "outputs": []
    },
    "guard:links": {
      "inputs": [
        "$TURBO_ROOT$/**",
        "!$TURBO_ROOT$/**/dist/**",
        "!$TURBO_ROOT$/**/node_modules/**",
        "!$TURBO_ROOT$/**/.turbo/**",
        "!$TURBO_ROOT$/artifacts/**"
      ],
      "outputs": []
    },
    "guard:boundaries": {
      "inputs": ["$TURBO_DEFAULT$", "$TURBO_ROOT$/packages/**", "$TURBO_ROOT$/tools/**"],
      "outputs": []
    },
    "guard:topology": {
      "inputs": ["$TURBO_DEFAULT$", "$TURBO_ROOT$/packages/runtime-contracts/**"],
      "outputs": []
    },
    "guard:format": {
      "inputs": [
        "$TURBO_ROOT$/**",
        "!$TURBO_ROOT$/**/dist/**",
        "!$TURBO_ROOT$/**/node_modules/**",
        "!$TURBO_ROOT$/**/.turbo/**",
        "!$TURBO_ROOT$/artifacts/**"
      ],
      "outputs": []
    },
    "test": {
      "inputs": [
        "$TURBO_ROOT$/**",
        "!$TURBO_ROOT$/**/dist/**",
        "!$TURBO_ROOT$/**/node_modules/**",
        "!$TURBO_ROOT$/**/.turbo/**",
        "!$TURBO_ROOT$/artifacts/**"
      ]
    }
  }
}
`;

const expectedScripts = {
  build: 'turbo run build',
  lint: 'turbo run lint',
  test: 'turbo run test',
  guard: 'turbo run guard',
  check: 'turbo run check guard',
  'check:affected': 'turbo run check guard --affected',
  format: 'biome check --write . && prettier --write "**/*.{md,yml,yaml}"',
  'format:check': 'turbo run guard:format',
  'links:check': 'turbo run guard:links',
  'delivery:check': 'turbo run guard:delivery test:delivery',
  'evidence:write': 'node tools/repo-guard/bin/write-evidence.mjs phase-0',
  'dev:setup': 'bash scripts/dev-setup.sh',
  'worktree:new': 'bash scripts/worktree-new.sh',
  'worktree:clean': 'bash scripts/worktree-clean.sh',
};

const expectedManifest = {
  name: '@agentic-workflow-kit/jig-repo',
  version: '0.0.0',
  description:
    'Jig contains a workspace substrate, canonical codec, runtime topology contracts, private conformance harness, and pure authority kernel; product runtime behavior remains unimplemented.',
  private: true,
  type: 'module',
  packageManager: 'pnpm@11.9.0',
  engines: { node: '>=22', pnpm: '>=11.9.0' },
  devEngines: { runtime: { name: 'node', version: '>=22', onFail: 'warn' } },
  scripts: expectedScripts,
  devDependencies: {
    '@biomejs/biome': 'catalog:',
    prettier: 'catalog:',
    turbo: '2.10.5',
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
  'docs/delivery/greenfield/phase-handoff-template.md',
  'docs/delivery/greenfield/phase-orchestration.md',
  '.agents/skills/orchestrate-phase-delivery/README.md',
  '.agents/skills/orchestrate-phase-delivery/SKILL.md',
  '.agents/skills/orchestrate-phase-delivery/evals/evals.json',
  '.agents/skills/orchestrate-phase-delivery/evals/trigger_queries.json',
  '.agents/skills/orchestrate-phase-delivery/references/phase-protocol.md',
  '.agents/skills/orchestrate-phase-delivery/scripts/validate_evals.py',
  'docs/archive/generations/jig-v0-pre-greenfield-2026-07-18.md',
  'docs/archive/reviews/2026-07-18-empty-repository-implementation-readiness-gate.md',
  '.github/workflows/check.yml',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  '.nvmrc',
  'turbo.json',
  'tsconfig.base.json',
  'tools/repo-guard/package.json',
  'tools/repo-guard/turbo.json',
  'tools/repo-guard/bin/repo-root.mjs',
  'tools/repo-guard/bin/check-active-repository.mjs',
  'tools/repo-guard/bin/check-doc-links.mjs',
  'tools/repo-guard/bin/check-delivery-track.mjs',
  'tools/repo-guard/bin/check-formatting.mjs',
  'tools/repo-guard/bin/check-package-boundaries.mjs',
  'tools/repo-guard/bin/check-runtime-topology.mjs',
  'tools/repo-guard/bin/write-evidence.mjs',
  'tools/repo-guard/tests/check-active-repository.test.mjs',
  'tools/repo-guard/tests/check-delivery-track.test.mjs',
  'tools/repo-guard/tests/check-package-boundaries.test.mjs',
  'tools/repo-guard/tests/check-runtime-topology.test.mjs',
  'tools/repo-guard/tests/task-inputs.test.mjs',
  'tools/repo-guard/tests/workspace-substrate.test.mjs',
  'packages/codec/package.json',
  'packages/codec/tsconfig.json',
  'packages/codec/src/index.ts',
  'packages/codec/tests/codec.test.mjs',
  'packages/codec/tests/corpus.test.mjs',
  'packages/codec/tests/golden-consumer.mjs',
  'packages/runtime-contracts/package.json',
  'packages/runtime-contracts/tsconfig.json',
  'packages/runtime-contracts/src/index.ts',
  'packages/runtime-contracts/tests/topology.test.mjs',
  'packages/conformance/package.json',
  'packages/conformance/tsconfig.json',
  'packages/conformance/src/index.ts',
  'packages/conformance/tests/conformance.test.mjs',
  'packages/conformance/tests/fixtures/conformance-oracle.json',
  'packages/authority-kernel/package.json',
  'packages/authority-kernel/tsconfig.json',
  'packages/authority-kernel/src/index.ts',
  'packages/authority-kernel/tests/authority-kernel.test.mjs',
  'packages/authority-kernel/tests/fixtures/authority-oracle.json',
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
  'tsconfig.base.json',
]);
const allowedToolPaths = new Set(
  requiredPaths
    .filter((path) => path.startsWith('tools/repo-guard/'))
    .concat(['scripts/dev-setup.sh', 'scripts/worktree-clean.sh', 'scripts/worktree-new.sh']),
);
const allowedGithubPaths = new Set(['.github/workflows/check.yml']);
const allowedArchiveExtensions = new Set(['.json', '.jsonl', '.md', '.txt']);
const allowedFixturePaths = new Set([
  'tools/repo-guard/tests/fixtures/workspace/.gitignore',
  'tools/repo-guard/tests/fixtures/workspace/package.json',
  'tools/repo-guard/tests/fixtures/workspace/pnpm-lock.yaml',
  'tools/repo-guard/tests/fixtures/workspace/pnpm-workspace.yaml',
  'tools/repo-guard/tests/fixtures/workspace/tsconfig.base.json',
  'tools/repo-guard/tests/fixtures/workspace/tsconfig.json',
  'tools/repo-guard/tests/fixtures/workspace/packages/pkg-a/package.json',
  'tools/repo-guard/tests/fixtures/workspace/packages/pkg-a/src/index.ts',
  'tools/repo-guard/tests/fixtures/workspace/packages/pkg-a/tsconfig.json',
  'tools/repo-guard/tests/fixtures/workspace/packages/pkg-b/package.json',
  'tools/repo-guard/tests/fixtures/workspace/packages/pkg-b/src/index.ts',
  'tools/repo-guard/tests/fixtures/workspace/packages/pkg-b/tsconfig.json',
  'tools/repo-guard/tests/fixtures/workspace/packages/pkg-c/package.json',
  'tools/repo-guard/tests/fixtures/workspace/packages/pkg-c/src/index.ts',
  'tools/repo-guard/tests/fixtures/workspace/packages/pkg-c/tsconfig.json',
  'packages/codec/tests/fixtures/codec-vectors.json',
  'packages/codec/tests/fixtures/codec-corpus.json',
  'packages/runtime-contracts/tests/fixtures/runtime-topology.json',
  'packages/runtime-contracts/tests/fixtures/runtime-fakes.json',
  'packages/conformance/tests/fixtures/conformance-oracle.json',
  'packages/authority-kernel/tests/fixtures/authority-oracle.json',
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

function resolvePnpmScriptCommands(scripts, scriptName, resolvedScripts = new Set()) {
  if (resolvedScripts.has(scriptName)) return [];
  const command = scripts?.[scriptName];
  if (typeof command !== 'string') return [];

  const nextResolvedScripts = new Set(resolvedScripts).add(scriptName);
  const commands = [command];
  const pnpmScriptReferences =
    /\bpnpm(?:\s+--[A-Za-z0-9-]+(?:=[^\s;&|]+)?)*\s+(?:run\s+)?(?:--[A-Za-z0-9-]+(?:=[^\s;&|]+)?\s+)*([A-Za-z0-9:_-]+)/g;
  for (const match of command.matchAll(pnpmScriptReferences))
    commands.push(...resolvePnpmScriptCommands(scripts, match[1], nextResolvedScripts));
  return commands;
}

function writesUnderArtifacts(command) {
  // A shell command reference does not reveal whether the path is an input or output, so the gate fails closed.
  return /\bartifacts\//.test(command);
}

function assertRegularTrackedInput(rootDir, path, errors, allowedModes = ['100644']) {
  const absolute = join(rootDir, path);
  if (!existsSync(absolute)) return;
  try {
    const stat = lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink())
      errors.push(`workspace input must be a regular non-symlink file: ${path}`);
    const mode = git(rootDir, 'ls-files', '--stage', '--', path).split(/\s+/)[0];
    if (mode && !allowedModes.includes(mode))
      errors.push(`workspace input must be tracked as an approved regular-file mode: ${path}`);
  } catch {
    errors.push(`workspace input could not be inspected: ${path}`);
  }
}

function readRequiredText(rootDir, path, errors, failureMessage) {
  try {
    return readFileSync(join(rootDir, path), 'utf8');
  } catch {
    errors.push(failureMessage);
    return null;
  }
}

function readRequiredJson(rootDir, path, errors, failureMessage) {
  const text = readRequiredText(rootDir, path, errors, failureMessage);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    errors.push(failureMessage);
    return null;
  }
}

export function validateActiveRepository(rootDir = repoRoot) {
  const errors = [];
  const allowedDeliveryPaths = deliveryAllowlist();

  for (const requiredPath of requiredPaths) {
    if (!existsSync(join(rootDir, requiredPath))) errors.push(`required active path is missing: ${requiredPath}`);
    assertRegularTrackedInput(rootDir, requiredPath, errors);
  }
  for (const fixturePath of allowedFixturePaths) assertRegularTrackedInput(rootDir, fixturePath, errors);
  for (const scriptPath of allowedToolPaths)
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
      allowedToolPaths.has(path) ||
      allowedGithubPaths.has(path) ||
      permittedDocumentationPath ||
      allowedFixturePaths.has(path) ||
      requiredPaths.includes(path);
    if (!permitted) errors.push(`workspace substrate repository has unexpected active path: ${path}`);
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

  const manifestFailure =
    'package.json must exactly preserve the activated workspace manifest, scripts, and owned toolchain, including the exact authority kernel surface';
  const manifest = readRequiredJson(rootDir, 'package.json', errors, manifestFailure);
  if (canonical(manifest) !== canonical(expectedManifest))
    if (!errors.includes(manifestFailure)) errors.push(manifestFailure);
  const checkCommands = resolvePnpmScriptCommands(manifest?.scripts, 'check');
  if (checkCommands.some((command) => command.includes('write-evidence.mjs')))
    errors.push('check script transitively resolves to an evidence-writing command');
  if (checkCommands.some(writesUnderArtifacts))
    errors.push('check script transitively resolves to a command that writes under artifacts/');
  const nodeVersionFailure = '.nvmrc must exactly preserve the approved local Node 26 line';
  if (
    readRequiredText(rootDir, '.nvmrc', errors, nodeVersionFailure) !== '26\n' &&
    !errors.includes(nodeVersionFailure)
  )
    errors.push(nodeVersionFailure);
  if (existsSync(join(rootDir, '.npmrc')))
    errors.push('.npmrc is forbidden: workspace fixtures accept no registry credentials or ambient auth configuration');
  const workspaceFailure =
    'pnpm-workspace.yaml must exactly preserve every approved workspace and supply-chain safety setting';
  if (
    readRequiredText(rootDir, 'pnpm-workspace.yaml', errors, workspaceFailure) !== expectedWorkspaceConfig &&
    !errors.includes(workspaceFailure)
  )
    errors.push(workspaceFailure);
  const guardManifestFailure =
    'tools/repo-guard manifest must expose exactly the repository lint, test, and gate task surface';
  const guardManifest = readRequiredJson(rootDir, 'tools/repo-guard/package.json', errors, guardManifestFailure);
  if (
    canonical(guardManifest) !==
    canonical({
      name: '@agentic-workflow-kit/jig-repo-guard',
      version: '0.0.0',
      private: true,
      type: 'module',
      scripts: {
        lint: 'biome check .',
        test: 'node --test --test-concurrency=1',
        'test:delivery': 'node --test tests/check-delivery-track.test.mjs',
        'guard:structure': 'node bin/check-active-repository.mjs',
        'guard:delivery': 'node bin/check-delivery-track.mjs',
        'guard:links': 'node bin/check-doc-links.mjs',
        'guard:boundaries': 'node bin/check-package-boundaries.mjs',
        'guard:topology': 'node bin/check-runtime-topology.mjs',
        'guard:format': 'node bin/check-formatting.mjs',
      },
      devDependencies: { '@biomejs/biome': 'catalog:', prettier: 'catalog:', typescript: 'catalog:' },
    })
  )
    if (!errors.includes(guardManifestFailure)) errors.push(guardManifestFailure);
  const guardTurboFailure =
    'tools/repo-guard/turbo.json must exactly preserve the repository-level gate task graph and its inputs';
  if (
    readRequiredText(rootDir, 'tools/repo-guard/turbo.json', errors, guardTurboFailure) !== expectedGuardTurbo &&
    !errors.includes(guardTurboFailure)
  )
    errors.push(guardTurboFailure);
  const runtimeManifestPath = join(rootDir, 'packages/runtime-contracts/package.json');
  if (existsSync(runtimeManifestPath)) {
    const runtimeManifestFailure =
      'runtime contracts runtime-contracts manifest must remain a private codec-only contract package';
    const runtimeManifest = readRequiredJson(
      rootDir,
      'packages/runtime-contracts/package.json',
      errors,
      runtimeManifestFailure,
    );
    if (
      canonical(runtimeManifest) !==
      canonical({
        name: '@agentic-workflow-kit/jig-runtime-contracts',
        version: '0.0.0',
        private: true,
        type: 'module',
        exports: './dist/index.js',
        types: './dist/index.d.ts',
        scripts: packageTaskScripts,
        devDependencies: packageToolchain,
        dependencies: { '@agentic-workflow-kit/jig-codec': 'workspace:*' },
      })
    )
      if (!errors.includes(runtimeManifestFailure)) errors.push(runtimeManifestFailure);
  }
  const conformanceManifestFailure =
    'conformance conformance manifest must remain a private codec/runtime-contract-only harness';
  const conformanceManifest = readRequiredJson(
    rootDir,
    'packages/conformance/package.json',
    errors,
    conformanceManifestFailure,
  );
  if (
    canonical(conformanceManifest) !==
    canonical({
      name: '@agentic-workflow-kit/jig-conformance',
      version: '0.0.0',
      private: true,
      type: 'module',
      exports: './dist/index.js',
      types: './dist/index.d.ts',
      scripts: packageTaskScripts,
      devDependencies: packageToolchain,
      dependencies: {
        '@agentic-workflow-kit/jig-codec': 'workspace:*',
        '@agentic-workflow-kit/jig-runtime-contracts': 'workspace:*',
      },
    })
  )
    if (!errors.includes(conformanceManifestFailure)) errors.push(conformanceManifestFailure);
  const authorityManifestPath = join(rootDir, 'packages/authority-kernel/package.json');
  if (existsSync(authorityManifestPath)) {
    const authorityManifestFailure =
      'authority kernel authority-kernel manifest must remain a private codec-only pure contract package';
    const authorityManifest = readRequiredJson(
      rootDir,
      'packages/authority-kernel/package.json',
      errors,
      authorityManifestFailure,
    );
    if (
      canonical(authorityManifest) !==
      canonical({
        name: '@agentic-workflow-kit/jig-authority-kernel',
        version: '0.0.0',
        private: true,
        type: 'module',
        exports: './dist/index.js',
        types: './dist/index.d.ts',
        scripts: packageTaskScripts,
        devDependencies: packageToolchain,
        dependencies: { '@agentic-workflow-kit/jig-codec': 'workspace:*' },
      })
    )
      if (!errors.includes(authorityManifestFailure)) errors.push(authorityManifestFailure);
  }
  const authorityConfigPath = join(rootDir, 'packages/authority-kernel/tsconfig.json');
  if (existsSync(authorityConfigPath)) {
    const authorityConfigFailure =
      'authority kernel authority-kernel TypeScript configuration must remain an isolated codec-only pure package';
    const authorityConfig = readRequiredJson(
      rootDir,
      'packages/authority-kernel/tsconfig.json',
      errors,
      authorityConfigFailure,
    );
    if (
      canonical(authorityConfig) !==
      canonical({
        extends: '../../tsconfig.base.json',
        compilerOptions: {
          outDir: 'dist',
          rootDir: 'src',
          lib: ['ES2022', 'DOM'],
          tsBuildInfoFile: 'dist/.tsbuildinfo',
        },
        include: ['src/**/*.ts'],
      })
    )
      if (!errors.includes(authorityConfigFailure)) errors.push(authorityConfigFailure);
  }
  const authoritySourcePath = join(rootDir, 'packages/authority-kernel/src/index.ts');
  if (existsSync(authoritySourcePath)) {
    const authoritySource = readRequiredText(
      rootDir,
      'packages/authority-kernel/src/index.ts',
      errors,
      'authority kernel authority-kernel source must retain the no-provider, no-adapter, no-I/O pure import surface',
    );
    const authorityImports = [...(authoritySource ?? '').matchAll(/^import .* from '([^']+)';$/gm)].map(
      (match) => match[1],
    );
    if (
      canonical(authorityImports) !== canonical(['@agentic-workflow-kit/jig-codec']) ||
      /from ['"]node:|\b(?:fetch|readFile|writeFile|spawn)\s*\(/i.test(authoritySource ?? '')
    )
      errors.push(
        'authority kernel authority-kernel source must retain the no-provider, no-adapter, no-I/O pure import surface',
      );
  }
  const codecManifestFailure =
    'codec codec manifest must expose only the private pure-codec build and typecheck surface';
  const codecManifest = readRequiredJson(rootDir, 'packages/codec/package.json', errors, codecManifestFailure);
  if (
    canonical(codecManifest) !==
    canonical({
      name: '@agentic-workflow-kit/jig-codec',
      version: '0.0.0',
      private: true,
      type: 'module',
      exports: './dist/index.js',
      types: './dist/index.d.ts',
      scripts: packageTaskScripts,
      devDependencies: packageToolchain,
    })
  )
    if (!errors.includes(codecManifestFailure)) errors.push(codecManifestFailure);
  const codecConfigFailure =
    'codec codec TypeScript configuration must remain isolated and browser-free except for encoding primitives';
  const codecConfig = readRequiredJson(rootDir, 'packages/codec/tsconfig.json', errors, codecConfigFailure);
  if (
    canonical(codecConfig) !==
    canonical({
      extends: '../../tsconfig.base.json',
      compilerOptions: { outDir: 'dist', rootDir: 'src', lib: ['ES2022', 'DOM'], tsBuildInfoFile: 'dist/.tsbuildinfo' },
      include: ['src/**/*.ts'],
    })
  )
    if (!errors.includes(codecConfigFailure)) errors.push(codecConfigFailure);
  const turboFailure =
    'turbo.json must exactly preserve the canonical active workspace task, input, output, and cache graph';
  if (readRequiredText(rootDir, 'turbo.json', errors, turboFailure) !== expectedTurbo && !errors.includes(turboFailure))
    errors.push(turboFailure);
  const workflowFailure =
    'check workflow must strictly match the approved least-privilege and evidence-retention contract';
  const workflow = readRequiredText(rootDir, '.github/workflows/check.yml', errors, workflowFailure);
  if (workflow?.trim() !== expectedWorkflow.trim()) {
    if (!errors.includes(workflowFailure)) errors.push(workflowFailure);
    for (const [name, action] of Object.entries(immutableActions))
      if (!workflow?.includes(action)) errors.push(`check workflow is missing immutable ${name} action pin`);
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
      `Active repository structure check passed (workspace substrate through authority kernel pure contracts; archive ${archiveRef} -> ${archiveCommit}).`,
    );
}
