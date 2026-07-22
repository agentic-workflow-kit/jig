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

const packageManifest = JSON.parse(readFileSync('package.json', 'utf8'));
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
  scripts['delivery:check'] !==
  'node --test scripts/check-delivery-track.test.mjs && node scripts/check-delivery-track.mjs'
) {
  errors.push('delivery:check must run the focused delivery validator tests and CLI validator');
}
if (!scripts.check?.includes('pnpm delivery:check')) {
  errors.push('check must include delivery:check');
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
