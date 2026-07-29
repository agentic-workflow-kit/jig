import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  candidatePackageManifest,
  deliveryAllowlist,
  validateDeliveryTrackPackage,
  verifyCandidatePackageManifest,
} from './check-delivery-track.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? markdownFiles(join(dir, entry.name))
      : entry.name.endsWith('.md')
        ? [join(dir, entry.name)]
        : [],
  );
}
const activeFixturePaths = [
  ...deliveryAllowlist(),
  '.github/workflows/check.yml',
  '.gitignore',
  '.nvmrc',
  '.prettierignore',
  'AGENTS.md',
  'README.md',
  'biome.json',
  'docs/README.md',
  'docs/archive/generations/jig-v0-pre-greenfield-2026-07-18.md',
  'docs/archive/reviews/2026-07-18-empty-repository-implementation-readiness-gate.md',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  'tsconfig.json',
  'tsconfig.base.json',
  'tsconfig.tools.json',
  'scripts/check-doc-links.mjs',
  'scripts/check-delivery-track.mjs',
  'scripts/check-delivery-track.test.mjs',
  'scripts/check-active-repository.mjs',
  'scripts/check-active-repository.test.mjs',
  '.agents/skills/orchestrate-phase-delivery/README.md',
  '.agents/skills/orchestrate-phase-delivery/SKILL.md',
  '.agents/skills/orchestrate-phase-delivery/evals/evals.json',
  '.agents/skills/orchestrate-phase-delivery/evals/trigger_queries.json',
  '.agents/skills/orchestrate-phase-delivery/references/phase-protocol.md',
  '.agents/skills/orchestrate-phase-delivery/scripts/validate_evals.py',
  'scripts/check-package-boundaries.mjs',
  'scripts/check-package-boundaries.test.mjs',
  'scripts/check-runtime-topology.mjs',
  'scripts/check-runtime-topology.test.mjs',
  'scripts/write-evidence.mjs',
  'tests/workspace/workspace-substrate.test.mjs',
  'tests/codec/codec.test.mjs',
  'tests/codec/corpus.test.mjs',
  'tests/codec/golden-consumer.mjs',
  'tests/runtime-contracts/topology.test.mjs',
  'tests/conformance/conformance.test.mjs',
  'tests/authority-kernel/authority-kernel.test.mjs',
  'tests/fixtures/codec-vectors.json',
  'tests/fixtures/codec-corpus.json',
  'tests/fixtures/runtime-topology.json',
  'tests/fixtures/runtime-fakes.json',
  'tests/fixtures/conformance-oracle.json',
  'tests/fixtures/authority-oracle.json',
  'tests/fixtures/workspace/.gitignore',
  'tests/fixtures/workspace/package.json',
  'tests/fixtures/workspace/pnpm-lock.yaml',
  'tests/fixtures/workspace/pnpm-workspace.yaml',
  'tests/fixtures/workspace/tsconfig.base.json',
  'tests/fixtures/workspace/tsconfig.json',
  ...['pkg-a', 'pkg-b', 'pkg-c'].flatMap((name) => [
    `tests/fixtures/workspace/packages/${name}/package.json`,
    `tests/fixtures/workspace/packages/${name}/src/index.ts`,
    `tests/fixtures/workspace/packages/${name}/tsconfig.json`,
  ]),
  'packages/codec/package.json',
  'packages/codec/tsconfig.json',
  'packages/codec/src/index.ts',
  'packages/conformance/package.json',
  'packages/conformance/tsconfig.json',
  'packages/conformance/src/index.ts',
  'packages/runtime-contracts/package.json',
  'packages/runtime-contracts/tsconfig.json',
  'packages/runtime-contracts/src/index.ts',
  'packages/authority-kernel/package.json',
  'packages/authority-kernel/tsconfig.json',
  'packages/authority-kernel/src/index.ts',
  ...['docs/product', 'docs/redesign/design', 'docs/redesign/guidelines'].flatMap((path) =>
    markdownFiles(join(root, path)).map((file) => relative(root, file)),
  ),
];
function fixture(run) {
  const dir = mkdtempSync(join(tmpdir(), 'jig-r07-'));
  for (const path of activeFixturePaths) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    cpSync(join(root, path), join(dir, path));
  }
  try {
    return run(dir);
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    } catch {}
  }
}
function gitFixture(run) {
  return fixture((dir) => {
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['add', '.'], { cwd: dir });
    try {
      execFileSync(
        'git',
        [
          'fetch',
          '-q',
          root,
          'refs/tags/archive/jig-v0-pre-greenfield-2026-07-18:refs/tags/archive/jig-v0-pre-greenfield-2026-07-18',
        ],
        { cwd: dir },
      );
    } catch {}
    return run(dir);
  });
}
function runStructureCheck(dir) {
  return spawnSync(process.execPath, ['scripts/check-active-repository.mjs'], {
    cwd: dir,
    encoding: 'utf8',
  });
}
function edit(dir, mutate) {
  const path = join(dir, 'docs/delivery/greenfield/track.json');
  const track = JSON.parse(readFileSync(path));
  mutate(track);
  writeFileSync(path, `${JSON.stringify(track, null, 2)}\n`);
}
function pairStoryField(dir, field, value) {
  edit(dir, (track) => {
    track.stories.find((story) => story.id === 'GF-001')[field] = value;
  });
  const path = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
  writeFileSync(
    path,
    readFileSync(path, 'utf8').replace(
      new RegExp(`^${field}:[^\\n]*(?:\\n {2,}[^\\n]*)*`, 'm'),
      `${field}: ${JSON.stringify(value)}`,
    ),
  );
}
function replaceCoverageRowCell(dir, firstCell, columnIndex, value) {
  const path = join(dir, 'docs/delivery/greenfield/coverage.md');
  const text = readFileSync(path, 'utf8');
  const row = text.split('\n').find((line) => line.startsWith('|') && line.split('|')[1]?.trim() === firstCell);
  assert.ok(row, `missing coverage row for ${firstCell}`);
  const cells = row.split('|');
  cells[columnIndex] = ` ${value} `;
  writeFileSync(path, text.replace(row, cells.join('|')));
}
function pairStableIdsAndRenderedMappings(dir, id, mutate) {
  let nextStableIds;
  let operations;
  edit(dir, (track) => {
    const story = track.stories.find((candidate) => candidate.id === id);
    nextStableIds = mutate([...story.stable_ids]);
    story.stable_ids = nextStableIds;
    for (const operation of Object.keys(track.inventories.operations)) {
      track.inventories.operations[operation] = track.stories
        .filter((candidate) => candidate.stable_ids.includes(operation))
        .map((candidate) => candidate.id);
    }
    operations = track.inventories.operations;
  });
  const storyPath = join(dir, `docs/delivery/greenfield/stories/${id}.md`);
  writeFileSync(
    storyPath,
    readFileSync(storyPath, 'utf8').replace(
      /^stable_ids:\n\s+\[\n(?:\s+.*\n)+?\s+\]\n/m,
      `stable_ids: ${JSON.stringify(nextStableIds)}\n`,
    ),
  );
  replaceCoverageRowCell(dir, id, 2, nextStableIds.join(', '));
  for (const [operation, stories] of Object.entries(operations))
    replaceCoverageRowCell(dir, operation, 2, stories.join(', '));
}
function reject(mutate, expected) {
  fixture((dir) => {
    mutate(dir);
    const errors = validateDeliveryTrackPackage(dir);
    assert.ok(
      errors.some((error) => error.includes(expected)),
      `expected ${expected}; got ${errors.join('\n')}`,
    );
  });
}

function malformed(mutate, expected) {
  fixture((dir) => {
    mutate(dir);
    assert.doesNotThrow(() => validateDeliveryTrackPackage(dir));
    const errors = validateDeliveryTrackPackage(dir);
    assert.ok(
      errors.some((error) => error.includes(expected)),
      `expected ${expected}; got ${errors.join('\n')}`,
    );
  });
}

test('valid final 48-story package passes', () =>
  fixture((dir) => assert.deepEqual(validateDeliveryTrackPackage(dir), [])));
test('front-matter parser rejects empty inline elements and noncanonical keys', () => {
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('"static dependency checks",', '"static dependency checks",,'));
  }, 'has invalid scalar for oracle');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('phase: 0', 'phase: 0\n__proto__: ignored'));
  }, 'front matter must use exactly the 15 canonical fields');
});
test('front-matter rejects recursive unquoted YAML alias, tag, and anchor scalars', () => {
  for (const value of ['[*oracle]', '[!unsafe value]', '[&oracle value]'])
    reject((dir) => {
      const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
      writeFileSync(p, readFileSync(p, 'utf8').replace(/oracle:\n {2}\[\n(?: {4}.*\n)+? {2}\]/, `oracle: ${value}`));
    }, 'uses YAML alias or tag');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace(/oracle:\n {2}\[\n(?: {4}.*\n)+? {2}\]/, 'oracle:\n  - *oracle'));
  }, 'uses YAML alias or tag');
  for (const [before, after] of [
    ['from: "GF-002"', 'from: *edge'],
    ['type: "implementation"', 'type: !unsafe'],
  ])
    reject((dir) => {
      const p = join(dir, 'docs/delivery/greenfield/stories/GF-005.md');
      writeFileSync(p, readFileSync(p, 'utf8').replace(before, after));
    }, 'uses YAML alias or tag');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-005.md');
    writeFileSync(
      p,
      readFileSync(p, 'utf8').replace(
        '  - from: "GF-002"\n    type: "implementation"',
        '  - {\n      from: *edge,\n      type: "implementation"\n    }',
      ),
    );
  }, 'uses YAML alias or tag');
  fixture((dir) => {
    edit(dir, (track) => {
      track.stories.find((story) => story.id === 'GF-001').oracle[0] = 'safe *oracle';
    });
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('"static dependency checks"', '"safe *oracle"'));
    assert.deepEqual(validateDeliveryTrackPackage(dir), []);
  });
});
test('front-matter parser balances quoted delimiters across multiline collections', () => {
  fixture((dir) => {
    edit(dir, (t) => {
      t.stories.find((story) => story.id === 'GF-001').oracle = [
        'static dependency checks',
        'quoted ] delimiter',
        'affected-cache fixture',
        'failure-isolation fixture',
      ];
    });
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(
      p,
      readFileSync(p, 'utf8').replace(
        '    "static dependency checks",\n    "affected-cache fixture",',
        '    "static dependency checks",\n    "quoted ] delimiter",\n    "affected-cache fixture",',
      ),
    );
    assert.deepEqual(validateDeliveryTrackPackage(dir), []);
  });
});
test('front-matter parser preserves apostrophes in unquoted collection scalars', () => {
  fixture((dir) => {
    edit(dir, (track) => {
      track.stories.find((story) => story.id === 'GF-001').oracle[0] = "owner's note";
    });
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('"static dependency checks",', "owner's note,"));
    assert.deepEqual(validateDeliveryTrackPackage(dir), []);
  });
});
test('front-matter fallback preserves falsy elements for validation', () => {
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(
      p,
      readFileSync(p, 'utf8').replace('"static dependency checks",', 'static dependency checks,\n    0,'),
    );
  }, 'front matter must exactly match all 15 track fields');
});
test('front-matter JSON preserves comma-delimiter text inside quoted strings', () =>
  reject((dir) => {
    edit(dir, (t) => {
      t.stories.find((story) => story.id === 'GF-001').oracle[0] = 'Probe}';
    });
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('"static dependency checks"', '"Probe,}"'));
  }, 'front matter must exactly match all 15 track fields'));
test('malformed structural values return curated errors instead of throwing', () => {
  for (const id of ['GF-020', 'GF-023', 'GF-062'])
    malformed(
      (dir) =>
        edit(dir, (t) => {
          t.stories.find((story) => story.id === id).dependency_edges = null;
        }),
      `${id} dependency_edges must be an array`,
    );
  for (const field of ['stable_ids', 'product_routes', 'imported_commitments'])
    malformed(
      (dir) =>
        edit(dir, (t) => {
          t.stories.find((story) => story.id === 'GF-001')[field] = null;
        }),
      `GF-001 ${field} must be an array`,
    );
  malformed(
    (dir) =>
      edit(dir, (t) => {
        delete t.mandatory_provider_splits[0].rule;
      }),
    'mandatory split GF-019->GF-020 must retain',
  );
  malformed(
    (dir) =>
      edit(dir, (t) => {
        t.stories.find((story) => story.id === 'GF-020').dependency_edges = [null];
      }),
    'GF-020 has invalid dependency edge metadata',
  );
});
test('malformed manifest containers, records, and scalar elements fail closed without throwing', () => {
  malformed(
    (dir) => writeFileSync(join(dir, 'docs/delivery/greenfield/track.json'), 'null\n'),
    'track must be an object record',
  );
  malformed(
    (dir) =>
      edit(dir, (t) => {
        t.imported_commitments = {};
      }),
    'imported_commitments must be an array',
  );
  malformed(
    (dir) =>
      edit(dir, (t) => {
        t.imported_commitments[0] = null;
      }),
    'imported_commitments must contain only object records',
  );
  malformed(
    (dir) =>
      edit(dir, (t) => {
        t.stories.find((story) => story.id === 'GF-001').story_file = null;
      }),
    'GF-001 story_file must be a string',
  );
  malformed(
    (dir) =>
      edit(dir, (t) => {
        t.stories.find((story) => story.id === 'GF-001').story_file = '../../outside.md';
      }),
    'GF-001 story_file must equal its canonical confined path',
  );
  malformed((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    rmSync(p);
    mkdirSync(p);
  }, 'docs/delivery/greenfield/stories/GF-001.md is not an owned regular file');
  malformed(
    (dir) =>
      edit(dir, (t) => {
        t.stories.find((story) => story.id === 'GF-001').dependencies = {};
      }),
    'GF-001 dependencies must be an array',
  );
  malformed(
    (dir) =>
      edit(dir, (t) => {
        t.stories.find((story) => story.id === 'GF-001').governing_paths = [null];
      }),
    'GF-001 governing_paths must be a nonempty unique string array',
  );
  for (const field of ['stable_ids', 'product_routes', 'imported_commitments'])
    malformed(
      (dir) =>
        edit(dir, (t) => {
          t.stories.find((story) => story.id === 'GF-001')[field] = [null];
        }),
      `GF-001 ${field} must contain only strings`,
    );
  malformed(
    (dir) =>
      edit(dir, (t) => {
        t.imported_commitments[0].stories = [null];
      }),
    'imported commitment FENCE-1 stories must contain only strings',
  );
  malformed(
    (dir) =>
      edit(dir, (t) => {
        t.delegated_choices.open['DR-1'] = null;
      }),
    'delegated_choices.DR-1.owner must exactly match',
  );
});
test('immutable delivery authorities, choices, splits, families, critical path, and sizes are exact', () => {
  for (const field of [
    'authority_order',
    'baseline',
    'global_definition_of_ready',
    'global_definition_of_done',
    'universal_constraints',
  ])
    reject(
      (dir) =>
        edit(dir, (t) => {
          t[field] = null;
        }),
      'immutable authority and global-definition fields',
    );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.authority_order = [];
      }),
    'immutable authority and global-definition fields',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        delete t.baseline.planning_provenance_commit;
      }),
    'immutable authority and global-definition fields',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.universal_constraints.invented = 'no';
      }),
    'immutable authority and global-definition fields',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.critical_path = [];
      }),
    'critical_path must be a nonempty actual maximum-length path',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.mandatory_provider_splits[0].rule = 'CF-MECH-SOURCE';
      }),
    'mandatory_provider_splits must exactly preserve every row and rule',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        delete t.mandatory_provider_splits;
      }),
    'mandatory_provider_splits must exactly preserve every row and rule',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        delete t.delegated_choices.open['DR-1'];
      }),
    'delegated_choices must exactly preserve open and closed decision records',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.delegated_choices.open['DR-99'] = { owner: 'Wrong' };
      }),
    'delegated_choices must exactly preserve open and closed decision records',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        delete t.delegated_choices.closed['DR-10'];
      }),
    'delegated_choices must exactly preserve open and closed decision records',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        delete t.delegated_choices;
      }),
    'delegated_choices must exactly preserve open and closed decision records',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.imported_commitments[0].family = 'Wrong';
      }),
    'imported_commitments must exactly preserve authority family semantics',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        delete t.imported_commitments;
      }),
    'imported_commitments must exactly preserve authority family semantics',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories.find((story) => story.id === 'GF-001').size = 'S/M';
      }),
    'GF-001 size must be one of S, M, or L',
  );
});
test('front matter rejects duplicate nested keys in block and inline dependency edges', () => {
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-020.md');
    writeFileSync(
      p,
      readFileSync(p, 'utf8').replace('    type: "implementation"', '    type: "implementation"\n    type: "evidence"'),
    );
  }, 'duplicates nested front matter field type');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-020.md');
    writeFileSync(
      p,
      readFileSync(p, 'utf8').replace(
        'dependency_edges:\n  - from: "GF-019"\n    type: "implementation"\n    split: "semantic-to-provider"',
        'dependency_edges: [{from: GF-019, type: implementation, type: evidence, split: semantic-to-provider}]',
      ),
    );
  }, 'duplicates nested front matter field type');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-020.md');
    writeFileSync(
      p,
      readFileSync(p, 'utf8').replace(
        'dependency_edges:\n  - from: "GF-019"\n    type: "implementation"\n    split: "semantic-to-provider"\n  - from: "GF-022"\n    type: "evidence"',
        'dependency_edges: [{"from":"GF-019","type":"evidence","type":"implementation","split":"semantic-to-provider"},{"from":"GF-022","type":"evidence"}]',
      ),
    );
  }, 'duplicates nested front matter field type');
});
test('front matter exposes nested prototype keys in block and inline dependency edges', () => {
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-020.md');
    writeFileSync(
      p,
      readFileSync(p, 'utf8').replace(
        '    type: "implementation"\n    split: "semantic-to-provider"',
        '    type: "implementation"\n    split: "semantic-to-provider"\n    __proto__: "ignored"',
      ),
    );
  }, 'front matter must exactly match all 15 track fields');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-020.md');
    writeFileSync(
      p,
      readFileSync(p, 'utf8').replace(
        'dependency_edges:\n  - from: "GF-019"\n    type: "implementation"\n    split: "semantic-to-provider"\n  - from: "GF-022"\n    type: "evidence"',
        'dependency_edges: [{from: GF-019, type: implementation, split: semantic-to-provider, __proto__: ignored}, {from: GF-022, type: evidence}]',
      ),
    );
  }, 'front matter must exactly match all 15 track fields');
});
test('track JSON rejects duplicate object keys before JSON parsing normalizes them', () => {
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/track.json');
    writeFileSync(
      p,
      readFileSync(p, 'utf8').replace(
        '  "kind": "jig-greenfield-delivery-track",',
        '  "kind": "jig-greenfield-delivery-track",\n  "kind": "jig-greenfield-delivery-track",',
      ),
    );
  }, 'delivery track has duplicate JSON object key kind');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/track.json');
    const track = readFileSync(p, 'utf8');
    const value = track.match(/"planning_provenance_commit": "[0-9a-f]{40}",/)?.[0];
    assert.ok(value, 'fixture must contain planning provenance');
    writeFileSync(p, track.replace(value, `${value}\n    ${value}`));
  }, 'delivery track has duplicate JSON object key planning_provenance_commit');
});
test('track JSON rejects inputs above the strict 2 MiB limit', () => {
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/track.json');
    writeFileSync(p, `${readFileSync(p, 'utf8')}${' '.repeat(2 * 1024 * 1024)}`);
  }, 'delivery track exceeds the 2 MiB strict-validation limit');
});
test('canonical story files reject symlinks before reads', () =>
  fixture((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    const target = join(dir, 'outside-story.md');
    writeFileSync(target, readFileSync(p, 'utf8'));
    rmSync(p);
    symlinkSync(target, p);
    assert.ok(lstatSync(p).isSymbolicLink());
    const errors = validateDeliveryTrackPackage(dir);
    assert.ok(
      errors.some((error) => error.includes('docs/delivery/greenfield/stories/GF-001.md is not an owned regular file')),
    );
  }));
test('candidate and corpus inputs reject symlinked bytes before reads', () => {
  fixture((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/track.json');
    const target = join(dir, 'outside-track.json');
    writeFileSync(target, readFileSync(p, 'utf8'));
    rmSync(p);
    symlinkSync(target, p);
    assert.deepEqual(validateDeliveryTrackPackage(dir), [
      'docs/delivery/greenfield/track.json is not an owned regular file',
    ]);
  });
  fixture((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/coverage.md');
    const target = join(dir, 'outside-coverage.md');
    writeFileSync(target, readFileSync(p, 'utf8'));
    rmSync(p);
    symlinkSync(target, p);
    assert.deepEqual(validateDeliveryTrackPackage(dir), [
      'docs/delivery/greenfield/coverage.md is not an owned regular file',
    ]);
  });
  fixture((dir) => {
    const p = join(dir, 'docs/product/README.md');
    const target = join(dir, 'outside-product-readme.md');
    writeFileSync(target, readFileSync(p, 'utf8'));
    rmSync(p);
    symlinkSync(target, p);
    assert.deepEqual(validateDeliveryTrackPackage(dir), ['docs/product/README.md is not an owned regular file']);
  });
  fixture((dir) => {
    const p = join(dir, 'README.md');
    const target = join(dir, 'outside-readme.md');
    writeFileSync(target, readFileSync(p, 'utf8'));
    rmSync(p);
    symlinkSync(target, p);
    assert.deepEqual(validateDeliveryTrackPackage(dir), ['README.md is not an owned regular file']);
    assert.throws(() => candidatePackageManifest(dir), /README.md is not an owned regular file/);
  });
});
test('story schema and nested mapping records reject paired structural drift', () => {
  reject((dir) => {
    edit(dir, (t) => {
      t.stories.find((story) => story.id === 'GF-001').title = 1;
    });
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(
      p,
      readFileSync(p, 'utf8').replace('title: "Private Node/TypeScript workspace substrate"', 'title: 1'),
    );
  }, 'GF-001 title must be a nonempty string');
  reject((dir) => {
    edit(dir, (t) => {
      t.stories.find((story) => story.id === 'GF-001').oracle = [1];
    });
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace(/oracle:\n {2}\[\n(?: {4}.*\n)+? {2}\]/, 'oracle: [1]'));
  }, 'GF-001 oracle must be a nonempty unique string array');
  reject((dir) => {
    edit(dir, (t) => {
      t.stories.find((story) => story.id === 'GF-001').dr_gates = ['DR-10'];
    });
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('dr_gates: ["DR-2", "DR-8"]', 'dr_gates: ["DR-10"]'));
  }, 'GF-001 dr_gates must use only open DR IDs');
  reject((dir) => {
    edit(dir, (t) => {
      t.stories.find((story) => story.id === 'GF-001').governing_paths = [];
    });
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace(/governing_paths:\n(?: {2}- .*\n)+/, 'governing_paths: []\n'));
  }, 'GF-001 governing_paths must be a nonempty unique string array');
  reject((dir) => {
    edit(dir, (t) => {
      t.stories.find((story) => story.id === 'GF-001').governing_paths = [
        'docs/redesign/design/runtime.md',
        'docs/redesign/design/runtime.md',
      ];
    });
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(
      p,
      readFileSync(p, 'utf8').replace(
        /governing_paths:\n(?: {2}- .*\n)+/,
        'governing_paths: ["docs/redesign/design/runtime.md", "docs/redesign/design/runtime.md"]\n',
      ),
    );
  }, 'GF-001 governing_paths must be a nonempty unique string array');
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.product_routes['PC-JIG-1'].extra = 'no';
      }),
    'product_routes.PC-JIG-1.proof_route must exactly match',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.inventories.extra = {};
      }),
    'inventories must have exactly the fixed mapping families plus cf_gate_product_inputs',
  );
});
test('paired story schema matrix rejects every required scalar and collection mutation category', () => {
  for (const [field, value, expected] of [
    ['title', 1, 'title must be a nonempty string'],
    ['title', '', 'title must be a nonempty string'],
    ['title', ' ', 'title must be a nonempty string'],
    ['outcome', 1, 'outcome must be a nonempty string'],
    ['outcome', '', 'outcome must be a nonempty string'],
    ['outcome', ' ', 'outcome must be a nonempty string'],
    ['status', 1, 'status must be proposed'],
    ['status', '', 'status must be proposed'],
    ['status', 'wrong', 'status must be proposed'],
    ['dr_gates', 'DR-1', 'dr_gates must be an array'],
    ['dr_gates', [1], 'dr_gates must be a nonempty unique string array'],
    ['dr_gates', ['DR-999'], 'dr_gates must use only open DR IDs'],
    ['dr_gates', ['DR-10'], 'dr_gates must use only open DR IDs'],
    ['dr_gates', ['DR-1', 'DR-1'], 'dr_gates must be a nonempty unique string array'],
    ['dr_gates', [], 'dr_gates must be a nonempty unique string array'],
  ])
    reject((dir) => pairStoryField(dir, field, value), `GF-001 ${expected}`);
  for (const [value, expected] of [
    ['scalar', 'oracle must be an array'],
    [[1], 'oracle must be a nonempty unique string array'],
    [[], 'oracle must be a nonempty unique string array'],
    [['x', 'x'], 'oracle must be a nonempty unique string array'],
    [[''], 'oracle must be a nonempty unique string array'],
  ])
    reject((dir) => {
      edit(dir, (track) => {
        track.stories.find((story) => story.id === 'GF-001').oracle = value;
      });
      const path = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
      writeFileSync(
        path,
        readFileSync(path, 'utf8').replace(/oracle:\n {2}\[\n(?: {4}.*\n)+? {2}\]/, `oracle: ${JSON.stringify(value)}`),
      );
    }, `GF-001 ${expected}`);
});
test('governing paths require canonical owned authority Markdown files', () => {
  for (const [path, expected] of [
    ['docs/product/../../AGENTS.md', 'governing path must be a canonical active authority Markdown path'],
    ['docs/product/..', 'governing path must be a canonical active authority Markdown path'],
    ['/docs/product/README.md', 'governing path must be a canonical active authority Markdown path'],
    ['docs/product/./README.md', 'governing path must be a canonical active authority Markdown path'],
    ['docs/product//README.md', 'governing path must be a canonical active authority Markdown path'],
    ['docs/product/README', 'governing path must be a canonical active authority Markdown path'],
    ['docs/product', 'governing path must be a canonical active authority Markdown path'],
    ['docs/product/missing.md', 'has unresolved governing path docs/product/missing.md'],
  ])
    reject((dir) => {
      edit(dir, (track) => {
        track.stories.find((story) => story.id === 'GF-001').governing_paths = [path];
      });
      const story = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
      writeFileSync(
        story,
        readFileSync(story, 'utf8').replace(
          /governing_paths:\n(?: {2}- .*\n)+/,
          `governing_paths: [${JSON.stringify(path)}]\n`,
        ),
      );
    }, `GF-001 ${expected}`);
  reject((dir) => {
    const path = 'docs/product/directory.md';
    mkdirSync(join(dir, path));
    edit(dir, (track) => {
      track.stories.find((story) => story.id === 'GF-001').governing_paths = [path];
    });
    const story = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(
      story,
      readFileSync(story, 'utf8').replace(
        /governing_paths:\n(?: {2}- .*\n)+/,
        `governing_paths: [${JSON.stringify(path)}]\n`,
      ),
    );
  }, 'GF-001 has unresolved governing path docs/product/directory.md');
  reject((dir) => {
    const outside = join(dir, 'outside-authority');
    mkdirSync(outside);
    writeFileSync(join(outside, 'escape.md'), '# outside\n');
    symlinkSync(outside, join(dir, 'docs/product/external'));
    const path = 'docs/product/external/escape.md';
    edit(dir, (track) => {
      track.stories.find((story) => story.id === 'GF-001').governing_paths = [path];
    });
    const story = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(
      story,
      readFileSync(story, 'utf8').replace(
        /governing_paths:\n[\s\S]*?(?=stable_ids:)/,
        `governing_paths: [${JSON.stringify(path)}]\n`,
      ),
    );
  }, 'GF-001 has unresolved governing path docs/product/external/escape.md');
});
test('governing paths must be the story-specific authorities that map its claims', () =>
  reject((dir) => {
    const path = 'docs/redesign/design/invariants.md';
    edit(dir, (track) => {
      track.stories.find((story) => story.id === 'GF-001').governing_paths = [path];
    });
    const story = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(
      story,
      readFileSync(story, 'utf8')
        .replace(/governing_paths:\n[\s\S]*?(?=stable_ids:)/, `governing_paths: [${JSON.stringify(path)}]\n`)
        .replace(
          /\[`runtime\.md`\]\([^)]*\)|\[D10\]\([^)]*\)|\[`architecture-conformance\.md`\]\([^)]*\)/g,
          '[`invariants.md`](../../../redesign/design/invariants.md)',
        ),
    );
  }, 'GF-001 governing paths must explicitly map every claimed stable ID, product route, and import'));
test('inventory coverage cannot be the sole governing-path authority connection', () =>
  reject((dir) => {
    const path = 'docs/redesign/design/invariants.md';
    edit(dir, (track) => {
      track.stories.find((story) => story.id === 'GF-062').governing_paths = [path];
    });
    const story = join(dir, 'docs/delivery/greenfield/stories/GF-062.md');
    writeFileSync(
      story,
      readFileSync(story, 'utf8')
        .replace(/governing_paths:\n[\s\S]*?(?=stable_ids:)/, `governing_paths: [${JSON.stringify(path)}]\n`)
        .replace(/\]\([^)]*\)/g, '](../../../redesign/design/invariants.md)'),
    );
  }, 'GF-062 governing paths must anchor a claimed stable ID or DR delegation scope'));
test('candidate package rejects symlinked parent directories', () =>
  fixture((dir) => {
    const path = join(dir, 'docs/delivery/greenfield/reviewer');
    const outside = join(dir, 'outside-reviewer');
    cpSync(path, outside, { recursive: true });
    rmSync(path, { recursive: true });
    symlinkSync(outside, path);
    const expected = 'docs/delivery/greenfield/reviewer/README.md is not an owned regular file';
    assert.deepEqual(validateDeliveryTrackPackage(dir), [expected]);
    assert.throws(() => candidatePackageManifest(dir), new RegExp(expected));
  }));
test('Git-backed delivery enumeration ignores ignored files and rejects untracked governed files', () =>
  gitFixture((dir) => {
    writeFileSync(
      join(dir, '.gitignore'),
      `${readFileSync(join(dir, '.gitignore'), 'utf8')}\ndocs/delivery/.DS_Store\n`,
    );
    writeFileSync(join(dir, 'docs/delivery/.DS_Store'), 'ignored\n');
    assert.deepEqual(validateDeliveryTrackPackage(dir), []);
    writeFileSync(join(dir, 'docs/delivery/greenfield/stray.md'), '# stray\n');
    assert.ok(
      validateDeliveryTrackPackage(dir).includes('active docs/delivery path set does not match exact allowlist'),
    );
  }));
test('Git-backed normative corpus enumeration ignores ignored Markdown remnants', () =>
  gitFixture((dir) => {
    writeFileSync(
      join(dir, '.gitignore'),
      `${readFileSync(join(dir, '.gitignore'), 'utf8')}\ndocs/product/ignored-remnant.md\n`,
    );
    writeFileSync(join(dir, 'docs/product/ignored-remnant.md'), '# ignored\n');
    assert.deepEqual(validateDeliveryTrackPackage(dir), []);
    pairStoryField(dir, 'governing_paths', ['docs/product/ignored-remnant.md']);
    assert.ok(
      validateDeliveryTrackPackage(dir).includes(
        'GF-001 has unresolved governing path docs/product/ignored-remnant.md',
      ),
    );
  }));
test('Git metadata failures fail closed instead of using filesystem fallback', () =>
  fixture((dir) => {
    writeFileSync(join(dir, '.git'), 'gitdir: missing\n');
    assert.deepEqual(validateDeliveryTrackPackage(dir), [
      'delivery track contains malformed data that could not be validated safely',
    ]);
  }));
test('structure check reports deleted governed paths and malformed package scripts without throwing', () => {
  gitFixture((dir) => {
    const deleted = 'docs/delivery/greenfield/stories/GF-001.md';
    rmSync(join(dir, deleted));
    const result = runStructureCheck(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`active docs/delivery paths are deleted from the working tree: ${deleted}`));
    assert.doesNotMatch(result.stderr, /TypeError/);
  });
  gitFixture((dir) => {
    const p = join(dir, 'package.json');
    const manifest = JSON.parse(readFileSync(p, 'utf8'));
    delete manifest.scripts;
    writeFileSync(p, `${JSON.stringify(manifest, null, 2)}\n`);
    const result = runStructureCheck(dir);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /package\.json must exactly preserve the activated workspace manifest, scripts, and owned toolchain, including the exact authority kernel surface/,
    );
    assert.doesNotMatch(result.stderr, /TypeError/);
  });
});
test('structure check fails closed on no-op pipeline wiring and active source paths', () => {
  gitFixture((dir) => {
    const p = join(dir, 'package.json');
    const manifest = JSON.parse(readFileSync(p, 'utf8'));
    manifest.scripts.check = 'echo pnpm delivery:check';
    writeFileSync(p, `${JSON.stringify(manifest, null, 2)}\n`);
    const result = runStructureCheck(dir);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /package\.json must exactly preserve the activated workspace manifest, scripts, and owned toolchain, including the exact authority kernel surface/,
    );
  });
  gitFixture((dir) => {
    const p = join(dir, 'package.json');
    const manifest = JSON.parse(readFileSync(p, 'utf8'));
    manifest.scripts.check =
      'pnpm delivery:check && pnpm lint && pnpm format:check && pnpm links:check && pnpm structure:check';
    writeFileSync(p, `${JSON.stringify(manifest, null, 2)}\n`);
    const result = runStructureCheck(dir);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /package\.json must exactly preserve the activated workspace manifest, scripts, and owned toolchain, including the exact authority kernel surface/,
    );
  });
  gitFixture((dir) => {
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src/unsafe.mjs'), 'export const unsafe = true;\n');
    const result = runStructureCheck(dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /workspace substrate repository has unexpected active path: src\/unsafe\.mjs/);
  });
  gitFixture((dir) => {
    writeFileSync(join(dir, 'docs/product/package.json'), '{"private":true}\n');
    const result = runStructureCheck(dir);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /workspace substrate repository has unexpected active path: docs\/product\/package\.json/,
    );
  });
  gitFixture((dir) => {
    const p = join(dir, 'package.json');
    const manifest = JSON.parse(readFileSync(p, 'utf8'));
    manifest.scripts.preinstall = 'node scripts/unsafe.mjs';
    writeFileSync(p, `${JSON.stringify(manifest, null, 2)}\n`);
    const result = runStructureCheck(dir);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /package\.json must exactly preserve the activated workspace manifest, scripts, and owned toolchain, including the exact authority kernel surface/,
    );
  });
  gitFixture((dir) => {
    const p = join(dir, 'package.json');
    const manifest = JSON.parse(readFileSync(p, 'utf8'));
    manifest.scripts['links:check'] = 'true';
    writeFileSync(p, `${JSON.stringify(manifest, null, 2)}\n`);
    const result = runStructureCheck(dir);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /package\.json must exactly preserve the activated workspace manifest, scripts, and owned toolchain, including the exact authority kernel surface/,
    );
  });
  gitFixture((dir) => {
    const p = join(dir, 'package.json');
    const manifest = JSON.parse(readFileSync(p, 'utf8'));
    manifest.dependencies = { unsafe: '1.0.0' };
    writeFileSync(p, `${JSON.stringify(manifest, null, 2)}\n`);
    const result = runStructureCheck(dir);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /package\.json must exactly preserve the activated workspace manifest, scripts, and owned toolchain, including the exact authority kernel surface/,
    );
  });
  gitFixture((dir) => {
    const p = join(dir, 'pnpm-workspace.yaml');
    writeFileSync(p, readFileSync(p, 'utf8').replace('  - "packages/*"', '  - "docs/archive"'));
    const result = runStructureCheck(dir);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /pnpm-workspace\.yaml must exactly preserve every approved workspace and supply-chain safety setting/,
    );
  });
  gitFixture((dir) => {
    const p = join(dir, 'pnpm-workspace.yaml');
    writeFileSync(p, readFileSync(p, 'utf8').replace('allowBuilds: {}', 'allowBuilds:\n  unsafe: true'));
    const result = runStructureCheck(dir);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /pnpm-workspace\.yaml must exactly preserve every approved workspace and supply-chain safety setting/,
    );
  });
});
test('CI runs the immutable structure preflight before the mutable pipeline and the workflow is package-bound', () =>
  gitFixture((dir) => {
    const workflow = join(dir, '.github/workflows/check.yml');
    const baseline = candidatePackageManifest(dir);
    const result = runStructureCheck(dir);
    assert.doesNotMatch(
      result.stderr,
      /check workflow must strictly match the approved least-privilege and evidence-retention contract/,
    );

    writeFileSync(
      workflow,
      readFileSync(workflow, 'utf8').replace(
        '      - name: Active repository preflight\n        run: node scripts/check-active-repository.mjs\n\n      - name: Install dependencies\n        run: pnpm install --frozen-lockfile',
        '      - name: Install dependencies\n        run: pnpm install --frozen-lockfile\n\n      - name: Active repository preflight\n        run: node scripts/check-active-repository.mjs',
      ),
    );
    assert.notEqual(candidatePackageManifest(dir), baseline);
    const mutated = runStructureCheck(dir);
    assert.notEqual(mutated.status, 0);
    assert.match(
      mutated.stderr,
      /check workflow must strictly match the approved least-privilege and evidence-retention contract/,
    );
  }));
test('CI preflight must be unconditional, failure-blocking, and in the check job', () => {
  for (const insertedLine of [
    `        if: \${{ false }}\n`,
    '        continue-on-error: true\n',
    '        shell: echo {0}\n',
  ])
    gitFixture((dir) => {
      const workflow = join(dir, '.github/workflows/check.yml');
      writeFileSync(
        workflow,
        readFileSync(workflow, 'utf8').replace(
          '      - name: Active repository preflight\n        run: node scripts/check-active-repository.mjs',
          `      - name: Active repository preflight\n${insertedLine}        run: node scripts/check-active-repository.mjs`,
        ),
      );
      const result = runStructureCheck(dir);
      assert.notEqual(result.status, 0);
      assert.match(
        result.stderr,
        /check workflow must strictly match the approved least-privilege and evidence-retention contract/,
      );
    });

  gitFixture((dir) => {
    const workflow = join(dir, '.github/workflows/check.yml');
    writeFileSync(
      workflow,
      readFileSync(workflow, 'utf8').replace(
        '    runs-on: ubuntu-latest\n    steps:',
        `    runs-on: ubuntu-latest\n    if: \${{ false }}\n    steps:`,
      ),
    );
    const result = runStructureCheck(dir);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /check workflow must strictly match the approved least-privilege and evidence-retention contract/,
    );
  });

  gitFixture((dir) => {
    const workflow = join(dir, '.github/workflows/check.yml');
    writeFileSync(
      workflow,
      readFileSync(workflow, 'utf8').replace(
        '      - name: Active repository preflight',
        '      - name: Rewrite active checker\n        run: cp package.json scripts/check-active-repository.mjs\n\n      - name: Active repository preflight',
      ),
    );
    const result = runStructureCheck(dir);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /check workflow must strictly match the approved least-privilege and evidence-retention contract/,
    );
  });

  gitFixture((dir) => {
    const workflow = join(dir, '.github/workflows/check.yml');
    writeFileSync(
      workflow,
      readFileSync(workflow, 'utf8').replace(
        '      - name: Install dependencies\n        run: pnpm install --frozen-lockfile\n\n      - name: check\n        run: pnpm check',
        '      - name: check\n        run: pnpm check\n\n      - name: Install dependencies\n        run: pnpm install --frozen-lockfile',
      ),
    );
    const result = runStructureCheck(dir);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /check workflow must strictly match the approved least-privilege and evidence-retention contract/,
    );
  });

  gitFixture((dir) => {
    const workflow = join(dir, '.github/workflows/check.yml');
    const text = readFileSync(workflow, 'utf8');
    const withoutCheckPreflight = text.replace(
      '      - name: Active repository preflight\n        run: node scripts/check-active-repository.mjs\n\n',
      '',
    );
    writeFileSync(
      workflow,
      withoutCheckPreflight.replace(
        'jobs:\n  check:',
        'jobs:\n  preflight:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Active repository preflight\n        run: node scripts/check-active-repository.mjs\n\n  check:',
      ),
    );
    const result = runStructureCheck(dir);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /check workflow must strictly match the approved least-privilege and evidence-retention contract/,
    );
  });
});
test('candidate package binds the document-link validator implementation', () =>
  fixture((dir) => {
    const baseline = candidatePackageManifest(dir);
    const path = join(dir, 'scripts/check-doc-links.mjs');
    writeFileSync(path, `${readFileSync(path, 'utf8')}\n// coherent validator mutation\n`);
    assert.notEqual(candidatePackageManifest(dir), baseline);
    assert.throws(() => verifyCandidatePackageManifest(baseline, dir), /candidate package manifest mismatch/);
  }));
test('candidate package binds the repository-local phase skill', () =>
  fixture((dir) => {
    const baseline = candidatePackageManifest(dir);
    const path = join(dir, '.agents/skills/orchestrate-phase-delivery/SKILL.md');
    writeFileSync(path, `${readFileSync(path, 'utf8')}\n`);
    assert.notEqual(candidatePackageManifest(dir), baseline);
    assert.throws(() => verifyCandidatePackageManifest(baseline, dir), /candidate package manifest mismatch/);
  }));
test('candidate package binds every validation, install, ignore, and local-runtime configuration input', () => {
  for (const relativePath of [
    '.gitignore',
    '.nvmrc',
    '.prettierignore',
    'biome.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
  ])
    fixture((dir) => {
      const baseline = candidatePackageManifest(dir);
      const path = join(dir, relativePath);
      writeFileSync(path, `${readFileSync(path, 'utf8')}\n# candidate-bound mutation\n`);
      assert.notEqual(candidatePackageManifest(dir), baseline, relativePath);
      assert.throws(() => verifyCandidatePackageManifest(baseline, dir), /candidate package manifest mismatch/);
    });
});
test('malformed shape diagnostics are unique and invalid story roots short-circuit', () => {
  for (const field of ['dependencies', 'dependency_edges'])
    fixture((dir) => {
      edit(dir, (track) => {
        track.stories.find((story) => story.id === 'GF-020')[field] = null;
      });
      const message = `GF-020 ${field} must be an array`;
      const errors = validateDeliveryTrackPackage(dir);
      assert.equal(errors.filter((error) => error === message).length, 1, errors.join('\n'));
    });
  fixture((dir) => {
    edit(dir, (track) => {
      track.stories = {};
    });
    assert.deepEqual(validateDeliveryTrackPackage(dir), ['track stories must be an array']);
  });
});
test('phase order places same-phase predecessors before their dependents', () => {
  reject(
    (dir) =>
      edit(dir, (t) => {
        const phase = t.phases.find((item) => item.id === 2);
        [phase.stories[2], phase.stories[3]] = [phase.stories[3], phase.stories[2]];
      }),
    'same-phase predecessor after its position',
  );
  reject(
    (dir) =>
      edit(dir, (track) => {
        const acceptance = track.stories.find((story) => story.id === 'GF-040');
        acceptance.dependencies = acceptance.dependencies.filter((id) => id !== 'GF-041');
        acceptance.dependency_edges = acceptance.dependency_edges.filter((edge) => edge.from !== 'GF-041');
      }),
    'GF-041 review publication must precede and provide an implementation dependency to GF-040 acceptance',
  );
  reject(
    (dir) =>
      edit(dir, (track) => {
        const finalizer = track.stories.find((story) => story.id === 'GF-043');
        finalizer.dependencies = finalizer.dependencies.filter((id) => id !== 'GF-042');
        finalizer.dependency_edges = finalizer.dependency_edges.filter((edge) => edge.from !== 'GF-042');
      }),
    'GF-043 must integrate accepted-subject finalization entry with deterministic verification authorization',
  );
});
test('phase records, story membership, parallel lanes, and gate edges are exact', () => {
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.phases[0].name = 'mutant';
      }),
    'track phases must exactly preserve',
  );
  reject((dir) => {
    edit(dir, (t) => {
      t.stories.find((story) => story.id === 'GF-001').phase = 1;
    });
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('phase: 0', 'phase: 1'));
  }, 'GF-001 phase must exactly match its containing phase record');
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.parallel_lanes = [];
      }),
    'parallel_lanes must exactly preserve',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.parallel_lanes[0] = 'mutant';
      }),
    'parallel_lanes must exactly preserve',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.parallel_lanes = null;
      }),
    'parallel_lanes must exactly preserve',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.gate_edges = [];
      }),
    'gate_edges must exactly preserve',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.gate_edges[0] = 'mutant';
      }),
    'gate_edges must exactly preserve',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.gate_edges = {};
      }),
    'gate_edges must exactly preserve',
  );
});
test('candidate manifest is an unpinned exact-package digest', () =>
  assert.match(candidatePackageManifest(root), /^[a-f0-9]{64}$/));
test('candidate manifest binds normalized regular-file mode as well as path and bytes', () =>
  fixture((dir) => {
    const baseline = candidatePackageManifest(dir);
    chmodSync(join(dir, 'README.md'), 0o755);
    assert.notEqual(candidatePackageManifest(dir), baseline);
    assert.throws(() => verifyCandidatePackageManifest(baseline, dir), /candidate package manifest mismatch/);
  }));
test('candidate manifest hashes raw bytes while package validation rejects invalid UTF-8', () =>
  fixture((dir) => {
    const path = join(dir, 'README.md');
    writeFileSync(path, Buffer.from([0x23, 0x20, 0x80, 0x0a]));
    const first = candidatePackageManifest(dir);
    assert.ok(validateDeliveryTrackPackage(dir).includes('README.md is not valid UTF-8 text'));

    writeFileSync(path, Buffer.from([0x23, 0x20, 0x81, 0x0a]));
    const second = candidatePackageManifest(dir);
    assert.ok(validateDeliveryTrackPackage(dir).includes('README.md is not valid UTF-8 text'));
    assert.notEqual(first, second);
  }));
test('external review tuple rejects a coherent candidate after its package digest changes', () =>
  fixture((dir) => {
    const baseline = candidatePackageManifest(dir);
    edit(dir, (track) => {
      track.stories[0].outcome = 'Co-edited outcome';
    });
    const story = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(story, readFileSync(story, 'utf8').replace(/outcome: .*/, 'outcome: "Co-edited outcome"'));
    assert.deepEqual(validateDeliveryTrackPackage(dir), []);
    assert.notEqual(candidatePackageManifest(dir), baseline);
    assert.throws(() => verifyCandidatePackageManifest(baseline, dir), /candidate package manifest mismatch/);
  }));
test('source catalogs fail closed on missing headings and duplicate first-column rows', () => {
  reject((dir) => {
    const p = join(dir, 'docs/redesign/design/runtime.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('## Runtime units', '## Missing runtime units'));
  }, 'source catalog docs/redesign/design/runtime.md has missing, duplicate, or malformed heading boundary');
  reject((dir) => {
    const p = join(dir, 'docs/redesign/design/runtime.md');
    const row = readFileSync(p, 'utf8').match(/^\| `RT-OPERATOR`.*$/m)[0];
    writeFileSync(p, readFileSync(p, 'utf8').replace(row, `${row}\n${row}`));
  }, 'source catalog docs/redesign/design/runtime.md must contain exactly 6 unique RT-* first-column rows');
});
test('coverage matrices strictly account for malformed, backticked, duplicate, and unexpected table rows', () => {
  reject((dir) => {
    const path = join(dir, 'docs/delivery/greenfield/coverage.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('| GF-001 |', '| `GF-001` |'));
  }, 'coverage.md Story metadata to covered items table has a noncanonical first cell');
  reject((dir) => {
    const path = join(dir, 'docs/delivery/greenfield/coverage.md');
    const text = readFileSync(path, 'utf8');
    const separator = text.match(/^\| -+ \| -+ \| -+ \|$/m)[0];
    writeFileSync(path, text.replace(separator, `${separator}\n${separator}`));
  }, 'coverage.md Product route to story coverage table has a noncanonical first cell');
  reject((dir) => {
    const path = join(dir, 'docs/delivery/greenfield/coverage.md');
    const text = readFileSync(path, 'utf8');
    const row = text.match(/^\| PC-README-1\s+\|.*$/m)[0];
    writeFileSync(path, text.replace(row, `${row}\n${row}`));
  }, 'coverage.md Product route to story coverage table duplicates first cell PC-README-1');
  reject((dir) => {
    const path = join(dir, 'docs/delivery/greenfield/coverage.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('| FENCE-1  | FENCE', '| FENCE-1 | extra | FENCE'));
  }, 'coverage.md Imported commitment to story coverage table has a row with 5 columns; expected 4');
  reject((dir) => {
    const path = join(dir, 'docs/delivery/greenfield/coverage.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('| RT-OPERATOR   |', '| `RT-OPERATOR` |'));
  }, 'coverage.md runtime units table has a noncanonical first cell');
  reject((dir) => {
    const path = join(dir, 'docs/delivery/greenfield/coverage.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('| GF-019         | GF-020', '| GF-999         | GF-020'));
  }, 'coverage.md Provider gate closure table has an unexpected first cell GF-999');
});
test('approved story authority bindings reject coherent governing-path reduction', () =>
  reject((dir) => {
    pairStoryField(dir, 'governing_paths', ['docs/product/concepts.md']);
  }, 'story authority bindings must exactly preserve approved per-story mappings'));
test('operation-family ownership rejects coherent forward and reverse selector drift', () => {
  reject((dir) => {
    pairStableIdsAndRenderedMappings(dir, 'GF-041', (ids) => [...ids, 'OPC-DEL-OBSERVE']);
  }, 'GF-041 violates exact review-publication operation-family ownership');
  reject((dir) => {
    pairStableIdsAndRenderedMappings(dir, 'GF-041', (ids) =>
      ids.filter((candidate) => candidate !== 'OPC-REV-COMMENT'),
    );
  }, 'GF-041 violates exact review-publication operation-family ownership');
  reject((dir) => {
    pairStableIdsAndRenderedMappings(dir, 'GF-057', (ids) => [...ids, 'OPC-DEL-STATUS']);
  }, 'GF-057 violates exact review-publication operation-family ownership');
  reject((dir) => {
    pairStableIdsAndRenderedMappings(dir, 'GF-057', (ids) =>
      ids.filter((candidate) => candidate !== 'OPC-REV-COMMENT'),
    );
  }, 'GF-057 violates exact review-publication operation-family ownership');
  reject((dir) => {
    pairStableIdsAndRenderedMappings(dir, 'GF-044', (ids) => [...ids, 'OPC-REV-PUBLISH']);
  }, 'GF-044 violates exact final-delivery operation-family ownership');
  reject((dir) => {
    pairStableIdsAndRenderedMappings(dir, 'GF-044', (ids) =>
      ids.filter((candidate) => candidate !== 'OPC-DEL-COMMENT'),
    );
  }, 'GF-044 violates exact final-delivery operation-family ownership');
  reject((dir) => {
    pairStableIdsAndRenderedMappings(dir, 'GF-061', (ids) => [...ids, 'OPC-REV-REQUEST']);
  }, 'GF-061 violates exact final-delivery operation-family ownership');
  reject((dir) => {
    pairStableIdsAndRenderedMappings(dir, 'GF-061', (ids) =>
      ids.filter((candidate) => candidate !== 'OPC-DEL-COMMENT'),
    );
  }, 'GF-061 violates exact final-delivery operation-family ownership');
  reject((dir) => {
    pairStableIdsAndRenderedMappings(dir, 'GF-042', (ids) => [...ids, 'OPC-REV-STATUS']);
  }, 'GF-042 violates verify-only operation-family ownership');
  reject((dir) => {
    pairStableIdsAndRenderedMappings(dir, 'GF-047', (ids) => [...ids, 'OPC-DEL-PUBLISH']);
  }, 'GF-047 violates verify-only operation-family ownership');
});
test('story literals must remain members of the governing route and identifier catalogs', () => {
  reject((dir) => {
    edit(dir, (track) => {
      track.stories.find((story) => story.id === 'GF-001').stable_ids.push('ID-INVENTED');
    });
    const storyPath = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(
      storyPath,
      readFileSync(storyPath, 'utf8')
        .replace('stable_ids: ["DR-2", "DR-8"]', 'stable_ids: ["DR-2", "DR-8", "ID-INVENTED"]')
        .replace(
          'No runtime semantic identifier is assigned to this tooling-only story;',
          'No runtime semantic identifier, including `ID-INVENTED`, is assigned to this tooling-only story;',
        ),
    );
    const coveragePath = join(dir, 'docs/delivery/greenfield/coverage.md');
    const coverage = readFileSync(coveragePath, 'utf8');
    const row = coverage.match(/^\| GF-001 \|.*$/m)[0];
    const columns = row.split('|');
    columns[2] = `${columns[2].trim()}, ID-INVENTED `;
    writeFileSync(coveragePath, coverage.replace(row, columns.join('|')));
  }, 'GF-001 stable_ids contains an unknown governing literal');
  reject((dir) => {
    edit(dir, (track) => {
      track.stories.find((story) => story.id === 'GF-001').product_routes.push('PC-INVENTED');
    });
    const storyPath = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(
      storyPath,
      readFileSync(storyPath, 'utf8')
        .replace(
          'product_routes: ["PC-JIG-16", "PC-JIG-20"]',
          'product_routes: ["PC-JIG-16", "PC-JIG-20", "PC-INVENTED"]',
        )
        .replace(
          '`PC-JIG-20` requires a user-run, non-hosted runtime boundary,',
          '`PC-JIG-20` and `PC-INVENTED` require a user-run, non-hosted runtime boundary,',
        ),
    );
    const coveragePath = join(dir, 'docs/delivery/greenfield/coverage.md');
    const coverage = readFileSync(coveragePath, 'utf8');
    const row = coverage.match(/^\| GF-001 \|.*$/m)[0];
    const columns = row.split('|');
    columns[3] = `${columns[3].trim()}, PC-INVENTED `;
    writeFileSync(coveragePath, coverage.replace(row, columns.join('|')));
  }, 'GF-001 product_routes contains an unknown governing route');
});
test('structural/source rules reject direct route, inventory, and owner mutations without plan locks', () => {
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories[0].outcome = 'mutant';
      }),
    'front matter must exactly match',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.product_routes['PC-README-1'].proof_route = 'wrong';
      }),
    'Round-6 authority text',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.inventories.events['EV-SESSION-RESULT'].push('GF-001');
      }),
    'must map every fixed inventory ID forward and reverse',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.delegated_choices.open['DR-5'].owner = 'Arye';
      }),
    'governing delegation register',
  );
});
test('rejects malformed JSON, unknown/cyclic deps, critical non-edge, split removal, and GF062 omission', () => {
  reject((dir) => writeFileSync(join(dir, 'docs/delivery/greenfield/track.json'), '{ nope'), 'strict valid JSON');
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories[1].dependencies = ['GF-999'];
      }),
    'depends on unknown story GF-999',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.critical_path = ['GF-001', 'GF-005'];
      }),
    'critical_path must be real dependency edges',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.mandatory_provider_splits.pop();
      }),
    'exactly eight fixed rows',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories.find((s) => s.id === 'GF-062').dependencies.pop();
      }),
    'GF-062 must merge exactly all other 47 stories',
  );
});
test('rejects frontmatter aliases and mapped narrative literal removal', () => {
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('dependencies: []', 'depends_on: []'));
  }, 'front matter must use exactly');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replaceAll('PC-JIG-16', 'PC-JIG-X'));
  }, 'narrative lacks mapped literal PC-JIG-16');
});
test('rejects every front matter scalar, array, duplicate, and alias drift directly', () => {
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('status: proposed', 'status: changed'));
  }, 'front matter must exactly match all 15');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('dependencies: []', 'dependencies: ["GF-002"]'));
  }, 'front matter must exactly match all 15');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('phase: 0', 'phase: 0\nphase: 0'));
  }, 'duplicates front matter field phase');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('dependencies: []', 'dependencies: *deps'));
  }, 'uses YAML alias');
});
test('rejects authority route, imported-matrix, inventory, DR, R03, split, DAG, and closure mutants directly', () => {
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.product_routes['PC-JIG-1'].proof_route = 'wrong';
      }),
    'Round-6 authority text',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.imported_commitments[0].disposition = 'note';
      }),
    'exact 56 authority-matrix ID and disposition records',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.imported_commitments.find((row) => row.id === 'MERGE-4').disposition = 'satisfied';
      }),
    'exact 56 authority-matrix ID and disposition records',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        delete t.inventories.ports['PORT-VERIFY'];
      }),
    'exact fixed inventory IDs',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.inventories.ports['PORT-NOPE'] = ['GF-001'];
      }),
    'exact fixed inventory IDs',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.delegated_choices.open['DR-1'].owner = 'Wrong';
      }),
    'must exactly match the governing delegation register',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories.find((s) => s.id === 'GF-044').stable_ids = t.stories
          .find((s) => s.id === 'GF-044')
          .stable_ids.filter((id) => id !== 'RP-REMOTE');
      }),
    'GF-044 violates R03',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories.find((s) => s.id === 'GF-042').stable_ids.push('RP-REMOTE');
      }),
    'GF-042 violates R03',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.mandatory_provider_splits.pop();
      }),
    'exactly eight fixed rows',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories.find((s) => s.id === 'GF-001').dependencies = ['GF-002'];
      }),
    'dependency graph contains cycle',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.critical_path = ['GF-001', 'GF-002'];
      }),
    'actual maximum-length path',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories.find((s) => s.id === 'GF-062').dependencies.pop();
      }),
    'GF-062 must merge exactly all other 47 stories',
  );
});
test('rejects exact forward and reverse route, import, inventory, and governing-owner mappings', () => {
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.product_routes['PC-JIG-1'].stories.pop();
      }),
    'product_routes.PC-JIG-1.stories must exactly equal forward and reverse',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.product_routes['PC-JIG-1'].stories.push('GF-001');
      }),
    'product_routes.PC-JIG-1.stories must exactly equal forward and reverse',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.imported_commitments[0].stories.pop();
      }),
    'imported commitment FENCE-1 must exactly equal forward and reverse',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.imported_commitments[0].stories.push('GF-001');
      }),
    'imported commitment FENCE-1 must exactly equal forward and reverse',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.inventories.operations['OPC-VERIFY-EXECUTE'] = ['GF-001'];
      }),
    'must map every fixed inventory ID forward and reverse',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.inventories.failure_classes['FC-TRUST'].pop();
      }),
    'must map every fixed inventory ID forward and reverse',
  );
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/coverage.md');
    writeFileSync(
      p,
      readFileSync(p, 'utf8').replace(
        'LG-SNAPSHOT, FC-TRUST, BND-WAIT-LEDGER, CF-GATE-PROVIDER',
        'LG-SNAPSHOT, CF-GATE-PROVIDER',
      ),
    );
  }, 'coverage.md story row GF-025 must exactly match track metadata in both directions');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/coverage.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('| PC-README-1   |', '| PC-INVENTED-1 |'));
  }, 'coverage.md product-route matrix must exactly match track product-route coverage');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/coverage.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('| FENCE-1  |', '| FENCE-INVENTED  |'));
  }, 'coverage.md imported-commitment matrix must exactly match track imported-commitment coverage');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/coverage.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('| RT-OPERATOR   |', '| RT-INVENTED   |'));
  }, 'coverage.md inventory matrix must exactly match track inventory coverage');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/coverage.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('| GF-019         | GF-020', '| GF-019         | GF-999'));
  }, 'coverage.md provider-gate closure must exactly match mandatory provider splits');
  reject((dir) => {
    const path = join(dir, 'docs/delivery/greenfield/coverage.md');
    const text = readFileSync(path, 'utf8');
    const rows = text.split('\n').filter((line) => line.startsWith('|') && line.split('|')[1]?.trim() === 'GF-041');
    assert.equal(rows.length, 2);
    const providerRow = rows.at(-1);
    const cells = providerRow.split('|');
    cells[2] = ' GF-061 ';
    writeFileSync(path, text.replace(providerRow, cells.join('|')));
  }, 'coverage.md provider-gate closure must exactly match mandatory provider splits');
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.delegated_choices.open['DR-1'].owner = 'Wrong';
      }),
    'must exactly match the governing delegation register',
  );
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/decisions.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('Engineering / GF-002', 'Wrong / GF-002'));
  }, 'decisions.md DR-1 owner must exactly match the governing delegation register');
  reject((dir) => {
    edit(dir, (t) => {
      t.delegated_choices.open['DR-1'].owner = 'Wrong';
    });
    const p = join(dir, 'docs/delivery/greenfield/decisions.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('Engineering / GF-002', 'Wrong / GF-002'));
  }, 'delegated_choices.DR-1.owner must exactly match the governing delegation register');
});
test('rejects specific story, edge, body, dependency, and local-selector structural defects', () => {
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories[1].id = 'GF-001';
      }),
    'duplicate story ID',
  );
  fixture((dir) => {
    edit(dir, (track) => {
      track.stories.find((story) => story.id === 'GF-002').id = 'GF-999';
    });
    const errors = validateDeliveryTrackPackage(dir);
    assert.ok(errors.includes('track must contain the exact 48 story IDs'));
    assert.ok(!errors.includes('track contains a duplicate story ID'));
  });
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories.pop();
      }),
    'exact 48 story IDs',
  );
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    rmSync(p);
  }, 'docs/delivery/greenfield/stories/GF-001.md is not an owned regular file');
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories[0].dependencies = ['GF-999'];
      }),
    'depends on unknown story GF-999',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        const story = t.stories.find((s) => s.id === 'GF-047');
        story.stable_ids = story.stable_ids.filter((id) => id !== 'OPC-VERIFY-EXECUTE');
      }),
    'GF-047 violates R03 local/remote selector separation',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        const story = t.stories.find((s) => s.id === 'GF-061');
        story.stable_ids = story.stable_ids.filter((id) => id !== 'OPC-DEL-MERGE');
      }),
    'GF-061 violates R03 local/remote selector separation',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories.find((s) => s.id === 'GF-047').dependency_edges[1].split = 'bad';
      }),
    'GF-047 has invalid dependency edge metadata',
  );
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(
      p,
      readFileSync(p, 'utf8').replace(/(## Outcome, value, and why now)[\s\S]*?(?=\n## Governing paths)/, '$1\n'),
    );
  }, 'GF-001 has empty Outcome, value, and why now');
});
test('rejects extra delivery path and normative corpus drift', () => {
  reject((dir) => {
    mkdirSync(join(dir, 'docs/delivery/extra'));
    writeFileSync(join(dir, 'docs/delivery/extra/nope.md'), '# nope\n');
  }, 'exact allowlist');
  reject(
    (dir) =>
      writeFileSync(join(dir, 'docs/product/README.md'), `${readFileSync(join(dir, 'docs/product/README.md'))}\n`),
    'normative corpus SHA-256',
  );
});
