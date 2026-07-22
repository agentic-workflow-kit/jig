import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
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
  'AGENTS.md',
  'README.md',
  'docs/README.md',
  'package.json',
  'scripts/check-delivery-track.mjs',
  'scripts/check-delivery-track.test.mjs',
  'scripts/check-active-repository.mjs',
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
    rmSync(dir, { recursive: true, force: true });
  }
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
    readFileSync(path, 'utf8').replace(new RegExp(`^${field}:.*$`, 'm'), `${field}: ${JSON.stringify(value)}`),
  );
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

test('valid final 47-story package passes', () =>
  fixture((dir) => assert.deepEqual(validateDeliveryTrackPackage(dir), [])));
test('front-matter parser rejects empty inline elements and noncanonical keys', () => {
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('"static dependency checks",', '"static dependency checks",,'));
  }, 'has invalid scalar for oracle');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('phase: 0', 'phase: 0\n__proto__: ignored'));
  }, 'front matter must use exactly the 16 canonical fields');
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
test('front-matter JSON preserves comma-delimiter text inside quoted strings', () =>
  reject((dir) => {
    edit(dir, (t) => {
      t.stories.find((story) => story.id === 'GF-001').oracle[0] = 'Probe}';
    });
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('"static dependency checks"', '"Probe,}"'));
  }, 'front matter must exactly match all 16 track fields'));
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
        delete t.baseline.current_main_commit;
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
    ['outcome', 1, 'outcome must be a nonempty string'],
    ['outcome', '', 'outcome must be a nonempty string'],
    ['status', 1, 'status must be proposed'],
    ['status', '', 'status must be proposed'],
    ['status', 'wrong', 'status must be proposed'],
    ['baseline_commit', 1, 'baseline_commit must equal the selected baseline'],
    ['baseline_commit', '', 'baseline_commit must equal the selected baseline'],
    ['baseline_commit', '0123456789012345678901234567890123456789', 'baseline_commit must equal the selected baseline'],
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
        /governing_paths:\n(?: {2}- .*\n)+/,
        `governing_paths: [${JSON.stringify(path)}]\n`,
      ),
    );
  }, 'GF-001 has unresolved governing path docs/product/external/escape.md');
});
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
test('delivery allowlist ignores ignored files inside a Git checkout', () =>
  fixture((dir) => {
    writeFileSync(join(dir, '.gitignore'), 'docs/delivery/.DS_Store\n');
    writeFileSync(join(dir, 'docs/delivery/.DS_Store'), 'ignored\n');
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['add', 'docs/delivery'], { cwd: dir });
    assert.deepEqual(validateDeliveryTrackPackage(dir), []);
  }));
test('phase order places same-phase predecessors before their dependents', () => {
  reject(
    (dir) =>
      edit(dir, (t) => {
        const phase = t.phases.find((item) => item.id === 2);
        [phase.stories[2], phase.stories[3]] = [phase.stories[3], phase.stories[2]];
      }),
    'same-phase predecessor after its position',
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
    'exactly five fixed rows',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories.find((s) => s.id === 'GF-062').dependencies.pop();
      }),
    'GF-062 must merge exactly all other 46 stories',
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
  }, 'front matter must exactly match all 16');
  reject((dir) => {
    const p = join(dir, 'docs/delivery/greenfield/stories/GF-001.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('dependencies: []', 'dependencies: ["GF-002"]'));
  }, 'front matter must exactly match all 16');
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
    'exactly five fixed rows',
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
    'GF-062 must merge exactly all other 46 stories',
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
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories.pop();
      }),
    'exact 47 story IDs',
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
