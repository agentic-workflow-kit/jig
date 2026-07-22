import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

test('valid final 47-story package passes', () =>
  fixture((dir) => assert.deepEqual(validateDeliveryTrackPackage(dir), [])));
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
  }, 'GF-001 story file is missing');
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
