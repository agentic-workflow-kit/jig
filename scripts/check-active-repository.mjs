import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { deliveryAllowlist } from './check-delivery-track.mjs';

const archiveRef = 'archive/jig-v0-pre-greenfield-2026-07-18';
const archiveTagObject = '1834c58c1485d2be13e32f6e437a2625e6043042';
const archiveCommit = '1731251d866b15b63131a0c3c580e7b563226cf3';
const archiveTree = 'dcd0c1f8a5616283cafbcf54694fcd37dd4888c1';

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
  'scripts/check-active-repository.mjs',
  'scripts/check-doc-links.mjs',
  'scripts/check-delivery-track.mjs',
  'scripts/check-delivery-track.test.mjs',
];

const forbiddenPaths = [
  'packages',
  'tests',
  'skills',
  'tools/n1a',
  'tsconfig.json',
  'tsconfig.base.json',
  'tsconfig.tools.json',
  'vitest.config.ts',
  'scripts/check-delivery-foundation.mjs',
  'scripts/check-package-boundaries.mjs',
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
]);
const allowedScriptPaths = new Set([
  'scripts/check-active-repository.mjs',
  'scripts/check-delivery-track.mjs',
  'scripts/check-delivery-track.test.mjs',
  'scripts/check-doc-links.mjs',
  'scripts/dev-setup.sh',
  'scripts/worktree-clean.sh',
  'scripts/worktree-new.sh',
]);
const allowedGithubPaths = new Set(['.github/workflows/check.yml']);
const allowedArchiveExtensions = new Set(['.json', '.jsonl', '.md', '.txt']);
const expectedCheckScript =
  'pnpm lint && pnpm format:check && pnpm links:check && pnpm delivery:check && pnpm structure:check';
const expectedScripts = {
  'dev:setup': 'bash scripts/dev-setup.sh',
  'worktree:new': 'bash scripts/worktree-new.sh',
  'worktree:clean': 'bash scripts/worktree-clean.sh',
  format: 'biome check --write . && prettier --write "**/*.{md,yml,yaml}"',
  lint: 'biome check .',
  'format:check': 'prettier --check "**/*.{md,yml,yaml}"',
  'links:check': 'node scripts/check-doc-links.mjs',
  'delivery:check': 'node --test scripts/check-delivery-track.test.mjs && node scripts/check-delivery-track.mjs',
  'structure:check': 'node scripts/check-active-repository.mjs',
  check: expectedCheckScript,
};
const directWorkflowPreflight = '        run: node scripts/check-active-repository.mjs';
const dependencyInstall = '        run: pnpm install --frozen-lockfile';
const mutableWorkflowPipeline = '        run: pnpm check';
const expectedPackageKeys = new Set([
  'name',
  'version',
  'description',
  'private',
  'type',
  'packageManager',
  'engines',
  'devEngines',
  'scripts',
  'devDependencies',
]);
const expectedDevDependencies = {
  '@biomejs/biome': '^2.5.1',
  prettier: '^3.9.3',
};

const representativeArchivePaths = [
  'packages/jig-sdk/src/sdk.ts',
  'packages/jig-cli/tests/cli.unit.test.ts',
  'tests/fixtures/m5b-local-mvp/minimal-plan.json',
  'docs/delivery/target-state-implementation/README.md',
  'skills/orchestrate-jig/SKILL.md',
];

function git(...args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

const errors = [];
const allowedDeliveryPaths = deliveryAllowlist();

for (const requiredPath of requiredPaths) {
  if (!existsSync(requiredPath)) {
    errors.push(`required active path is missing: ${requiredPath}`);
  }
}

for (const forbiddenPath of forbiddenPaths) {
  const activeEntries = git('ls-files', '--cached', '--others', '--exclude-standard', '--', forbiddenPath);
  if (activeEntries.length > 0) {
    errors.push(`archived generation path remains active: ${forbiddenPath}`);
  }
}

const activeRepositoryPaths = git('ls-files', '--cached', '--others', '--exclude-standard').split('\n').filter(Boolean);
for (const path of activeRepositoryPaths) {
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
    permittedDocumentationPath;
  if (!permitted) errors.push(`source-empty repository has unexpected active path: ${path}`);
}

const activeDeliveryPaths = git('ls-files', '--cached', '--others', '--exclude-standard', '--', 'docs/delivery')
  .split('\n')
  .filter(Boolean)
  .sort();
const deletedDeliveryPaths = git('ls-files', '--deleted', '--', 'docs/delivery').split('\n').filter(Boolean).sort();
const expectedDeliveryPaths = [...deliveryAllowlist()].sort();
if (
  activeDeliveryPaths.length !== expectedDeliveryPaths.length ||
  activeDeliveryPaths.some((path, index) => path !== expectedDeliveryPaths[index])
) {
  errors.push('active docs/delivery paths do not match the exact documentation-only allowlist');
}
if (deletedDeliveryPaths.length > 0) {
  errors.push(`active docs/delivery paths are deleted from the working tree: ${deletedDeliveryPaths.join(', ')}`);
}

const parsedPackageManifest = JSON.parse(readFileSync('package.json', 'utf8'));
const packageManifest =
  parsedPackageManifest !== null && typeof parsedPackageManifest === 'object' && !Array.isArray(parsedPackageManifest)
    ? parsedPackageManifest
    : {};
if (packageManifest !== parsedPackageManifest) errors.push('package.json must be an object record');
if (
  Object.keys(packageManifest).length !== expectedPackageKeys.size ||
  Object.keys(packageManifest).some((key) => !expectedPackageKeys.has(key))
)
  errors.push('package.json must contain exactly the approved documentation-only manifest fields');
if (
  packageManifest.devDependencies === null ||
  typeof packageManifest.devDependencies !== 'object' ||
  Array.isArray(packageManifest.devDependencies) ||
  Object.keys(packageManifest.devDependencies).length !== Object.keys(expectedDevDependencies).length ||
  Object.entries(expectedDevDependencies).some(([name, version]) => packageManifest.devDependencies?.[name] !== version)
)
  errors.push('package.json devDependencies must exactly preserve the approved validation toolchain');
const scripts =
  packageManifest.scripts !== null &&
  typeof packageManifest.scripts === 'object' &&
  !Array.isArray(packageManifest.scripts)
    ? packageManifest.scripts
    : {};
if (scripts !== packageManifest.scripts) {
  errors.push('package.json scripts must be an object record');
}
for (const retiredScript of ['build', 'mcp', 'test', 'typecheck', 'boundaries:check']) {
  if (retiredScript in scripts) {
    errors.push(`retired implementation script remains active: ${retiredScript}`);
  }
}

if (
  Object.keys(scripts).length !== Object.keys(expectedScripts).length ||
  Object.keys(scripts).some((name) => !Object.hasOwn(expectedScripts, name))
)
  errors.push('package.json scripts must contain exactly the approved non-lifecycle command set');
for (const [name, expected] of Object.entries(expectedScripts))
  if (scripts[name] !== expected)
    errors.push(
      name === 'check'
        ? 'check must exactly run the full repository validation pipeline'
        : `${name} must exactly preserve its repository validation command`,
    );

const workflow = readFileSync('.github/workflows/check.yml', 'utf8');
const workflowLines = workflow.split('\n');
const directPreflights = workflowLines.filter((line) => line === directWorkflowPreflight);
const dependencyInstalls = workflowLines.filter((line) => line === dependencyInstall);
const mutablePipelines = workflowLines.filter((line) => line === mutableWorkflowPipeline);
const jobsIndexes = workflowLines.flatMap((line, index) => (line === 'jobs:' ? [index] : []));
const checkJobIndexes = workflowLines.flatMap((line, index) => (line === '  check:' ? [index] : []));
const topLevelProperties = workflowLines.filter((line) => /^\S/.test(line) && !line.startsWith('#'));
const expectedTopLevelProperties = ['name: check', 'on:', 'permissions:', 'jobs:'];
let approvedCheckJobShape = false;
if (
  jobsIndexes.length === 1 &&
  checkJobIndexes.length === 1 &&
  topLevelProperties.length === expectedTopLevelProperties.length &&
  topLevelProperties.every((line, index) => line === expectedTopLevelProperties[index]) &&
  checkJobIndexes[0] > jobsIndexes[0]
) {
  let jobsEnd = workflowLines.length;
  for (let index = jobsIndexes[0] + 1; index < workflowLines.length; index += 1) {
    const line = workflowLines[index];
    if (/^\S/.test(line) && !line.startsWith('#')) {
      jobsEnd = index;
      break;
    }
  }
  const jobHeaders = workflowLines
    .slice(jobsIndexes[0] + 1, jobsEnd)
    .filter((line) => /^ {2}\S/.test(line) && !/^\s*#/.test(line));
  const checkJobStart = checkJobIndexes[0];
  let checkJobEnd = jobsEnd;
  for (let index = checkJobStart + 1; index < workflowLines.length; index += 1) {
    const line = workflowLines[index];
    if (/^ {2}\S/.test(line)) {
      checkJobEnd = index;
      break;
    }
  }
  const checkJobLines = workflowLines.slice(checkJobStart + 1, checkJobEnd);
  const checkJobProperties = checkJobLines.filter((line) => /^ {4}\S/.test(line) && !/^\s*#/.test(line));
  const expectedCheckJobProperties = ['    name: check', '    runs-on: ubuntu-latest', '    steps:'];
  const stepsIndex = checkJobLines.indexOf('    steps:');
  const stepStarts = checkJobLines.flatMap((line, index) => (/^ {6}- \S/.test(line) ? [index] : []));
  const actualSteps = stepStarts.map((start, stepIndex) => {
    const end = stepStarts[stepIndex + 1] ?? checkJobLines.length;
    return checkJobLines.slice(start, end).filter((line) => line.trim().length > 0 && !/^\s*#/.test(line));
  });
  const expectedSteps = [
    [
      '      - name: Checkout',
      '        uses: actions/checkout@v7',
      '        with:',
      '          fetch-depth: 0',
      '          fetch-tags: true',
    ],
    ['      - name: Install pnpm', '        uses: pnpm/action-setup@v6', '        with:', '          version: 11.9.0'],
    [
      '      - name: Set up Node',
      '        uses: actions/setup-node@v6',
      '        with:',
      '          node-version: 22.13.0',
      '          cache: pnpm',
    ],
    ['      - name: Active repository preflight', directWorkflowPreflight],
    ['      - name: Install dependencies', dependencyInstall],
    ['      - name: check', mutableWorkflowPipeline],
  ];
  const significantStepsPreamble = checkJobLines
    .slice(stepsIndex + 1, stepStarts[0] ?? checkJobLines.length)
    .filter((line) => line.trim().length > 0 && !/^\s*#/.test(line));
  const hasExactSteps =
    actualSteps.length === expectedSteps.length &&
    actualSteps.every(
      (step, index) =>
        step.length === expectedSteps[index].length &&
        step.every((line, lineIndex) => line === expectedSteps[index][lineIndex]),
    );
  approvedCheckJobShape =
    jobHeaders.length === 1 &&
    jobHeaders[0] === '  check:' &&
    checkJobProperties.length === expectedCheckJobProperties.length &&
    checkJobProperties.every((line, index) => line === expectedCheckJobProperties[index]) &&
    stepsIndex >= 0 &&
    significantStepsPreamble.length === 0 &&
    hasExactSteps;
}
if (
  directPreflights.length !== 1 ||
  dependencyInstalls.length !== 1 ||
  mutablePipelines.length !== 1 ||
  !approvedCheckJobShape
) {
  errors.push(
    'check workflow must run the direct active-repository preflight before dependency installation and pnpm check',
  );
}

const workspaceConfiguration = readFileSync('pnpm-workspace.yaml', 'utf8');
const workspacePackageDeclarations = workspaceConfiguration.match(/^packages:.*$/gm) ?? [];
const workspaceBuildDeclarations = workspaceConfiguration.match(/^allowBuilds:.*$/gm) ?? [];
if (
  workspacePackageDeclarations.length !== 1 ||
  !/^packages: \[\](?:\s+#.*)?$/.test(workspacePackageDeclarations[0]) ||
  workspaceBuildDeclarations.length !== 1 ||
  !/^allowBuilds: \{\}(?:\s+#.*)?$/.test(workspaceBuildDeclarations[0]) ||
  /^(?:onlyBuiltDependencies|neverBuiltDependencies|dangerouslyAllowAllBuilds):/m.test(workspaceConfiguration)
) {
  errors.push('pnpm workspace must retain an empty package set and deny all dependency lifecycle builds');
}

try {
  const resolvedTagObject = git('rev-parse', archiveRef);
  const resolvedCommit = git('rev-parse', `${archiveRef}^{}`);
  const resolvedTree = git('rev-parse', `${archiveRef}^{}^{tree}`);
  if (resolvedTagObject !== archiveTagObject) {
    errors.push(`archive tag object resolves to ${resolvedTagObject}, expected ${archiveTagObject}`);
  }
  if (resolvedCommit !== archiveCommit) {
    errors.push(`archive ref resolves to ${resolvedCommit}, expected ${archiveCommit}`);
  }
  if (resolvedTree !== archiveTree) {
    errors.push(`archive tree resolves to ${resolvedTree}, expected ${archiveTree}`);
  }
  for (const archivePath of representativeArchivePaths) {
    git('cat-file', '-e', `${archiveRef}^{commit}:${archivePath}`);
  }
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  errors.push(`archive ref or representative recovery path could not be verified: ${detail}`);
}

if (errors.length > 0) {
  console.error('Active repository structure check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Active repository structure check passed (docs-only greenfield delivery track; archive ${archiveRef} -> ${archiveCommit}).`,
  );
}
