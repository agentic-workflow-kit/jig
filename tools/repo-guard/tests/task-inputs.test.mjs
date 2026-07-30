import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const guardGraph = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'turbo.json'), 'utf8'));
const guardPackageDir = 'tools/repo-guard';

// A repository-level gate that does not declare an input it reads can be pruned from
// `turbo run ... --affected` and can replay a warm cache after that input changed, so every gate
// must declare globs covering the whole surface it consumes. `cache: false` does not help: it
// disables result reuse, not affected-selection pruning.
const consumedSurfaces = {
  'guard:structure': [
    'vitest.config.ts',
    'src/rogue.ts',
    'scripts/dev-setup.sh',
    '.github/workflows/check.yml',
    'package.json',
    'turbo.json',
    'packages/codec/package.json',
    'tools/repo-guard/package.json',
  ],
  'guard:delivery': [
    'docs/delivery/greenfield/track.json',
    'docs/redesign/design/runtime.md',
    'docs/product/README.md',
    'docs/archive/generations/jig-v0-pre-greenfield-2026-07-18.md',
    '.agents/skills/orchestrate-phase-delivery/SKILL.md',
    'package.json',
    'turbo.json',
    'packages/codec/tests/fixtures/codec-corpus.json',
  ],
  'test:delivery': [
    'docs/delivery/greenfield/track.json',
    'docs/redesign/design/runtime.md',
    'docs/product/README.md',
    '.agents/skills/orchestrate-phase-delivery/SKILL.md',
    'turbo.json',
  ],
  'guard:links': [
    'docs/README.md',
    'docs/redesign/guidelines/README.md',
    'README.md',
    'AGENTS.md',
    '.agents/skills/orchestrate-phase-delivery/references/phase-protocol.md',
    'LICENSE',
  ],
  'guard:format': [
    '.agents/skills/orchestrate-phase-delivery/evals/evals.json',
    '.agents/skills/orchestrate-phase-delivery/evals/trigger_queries.json',
    'biome.json',
    'turbo.json',
    'docs/product/README.md',
    '.github/workflows/check.yml',
  ],
  'guard:boundaries': [
    'packages/codec/src/index.ts',
    'packages/authority-kernel/package.json',
    'tools/repo-guard/tests/fixtures/workspace/package.json',
  ],
  'guard:topology': [
    'packages/runtime-contracts/src/index.ts',
    'packages/runtime-contracts/tests/fixtures/runtime-topology.json',
  ],
  test: ['turbo.json', 'packages/codec/package.json', 'tools/repo-guard/tests/fixtures/workspace/tsconfig.base.json'],
};

function matches(pattern, path) {
  if (pattern === '$TURBO_DEFAULT$') return path.startsWith(`${guardPackageDir}/`);
  if (!pattern.startsWith('$TURBO_ROOT$/')) return path.startsWith(`${guardPackageDir}/${pattern}`);
  const rooted = pattern.slice('$TURBO_ROOT$/'.length);
  const expression = rooted
    .split('/')
    .map((segment) =>
      segment === '**'
        ? '.*'
        : segment
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '[^/]'),
    )
    .join('/')
    .replace(/\.\*\//g, '(?:.*/)?');
  return new RegExp(`^${expression}$`).test(path);
}

test('task inputs: every repository gate declares explicit inputs', () => {
  for (const [name, task] of Object.entries(guardGraph.tasks)) {
    if (name === 'guard') continue; // pure aggregate node with no script of its own
    assert.ok(Array.isArray(task.inputs) && task.inputs.length > 0, `${name} must declare inputs`);
  }
});

test('task inputs: every repository gate covers the surface it reads', () => {
  for (const [name, paths] of Object.entries(consumedSurfaces)) {
    const patterns = guardGraph.tasks[name]?.inputs;
    assert.ok(patterns, `${name} must exist in the repo-guard task graph`);
    for (const path of paths)
      assert.ok(
        patterns.some((pattern) => matches(pattern, path)),
        `${name} inputs must cover ${path}; declared: ${patterns.join(', ')}`,
      );
  }
});

test('task inputs: the glob matcher rejects paths outside the declared surface', () => {
  assert.equal(matches('$TURBO_ROOT$/docs/**', 'vitest.config.ts'), false);
  assert.equal(matches('$TURBO_ROOT$/docs/**', 'docs/product/README.md'), true);
  assert.equal(matches('$TURBO_ROOT$/**', 'anything/at/all.json'), true);
  assert.equal(matches('$TURBO_DEFAULT$', 'packages/codec/src/index.ts'), false);
  assert.equal(matches('$TURBO_DEFAULT$', 'tools/repo-guard/bin/check-doc-links.mjs'), true);
});

test('task inputs: the formatting gate runs Biome across the repository, not a fixed file list', () => {
  const source = readFileSync(join(import.meta.dirname, '..', 'bin', 'check-formatting.mjs'), 'utf8');
  assert.match(source, /run\('biome', \['check', '\.'\]\)/);
  assert.equal(
    /rootOwnedFiles/.test(source),
    false,
    'a fixed root-file list leaves active JSON such as .agents eval data outside every mandatory check',
  );
});
