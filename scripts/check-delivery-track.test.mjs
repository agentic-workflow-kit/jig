import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { deliveryAllowlist, validateDeliveryTrackPackage } from './check-delivery-track.mjs';

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
test('RED regression: semantic lock rejects shape-valid outcome, path, stable ID, route, inventory, and DR mutations', () => {
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories[0].outcome = 'mutant';
      }),
    'semantic SHA-256 lock',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories[0].governing_paths[0] = t.stories[0].governing_paths[1];
      }),
    'semantic SHA-256 lock',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories[1].stable_ids[0] = 'DR-2';
      }),
    'semantic SHA-256 lock',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.product_routes['PC-README-1'].proof_route = 'wrong';
      }),
    'semantic SHA-256 lock',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.inventories.events['EV-SESSION-RESULT'].push('GF-001');
      }),
    'semantic SHA-256 lock',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.delegated_choices.open['DR-5'].owner = 'Arye';
      }),
    'semantic SHA-256 lock',
  );
});
test('rejects malformed JSON, unknown/cyclic deps, critical non-edge, split removal, and GF062 omission', () => {
  reject((dir) => writeFileSync(join(dir, 'docs/delivery/greenfield/track.json'), '{ nope'), 'strict valid JSON');
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories[1].dependencies = ['GF-999'];
      }),
    'semantic SHA-256 lock',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.critical_path = ['GF-001', 'GF-005'];
      }),
    'semantic SHA-256 lock',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.mandatory_provider_splits.pop();
      }),
    'semantic SHA-256 lock',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.stories.find((s) => s.id === 'GF-062').dependencies.pop();
      }),
    'semantic SHA-256 lock',
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
        t.imported_commitments[0].ids.pop();
      }),
    'exact 56 authority-matrix IDs',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.imported_commitments[0].ids.push('NOPE-1');
      }),
    'exact 56 authority-matrix IDs',
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
    'imported commitment FENCE must exactly equal forward and reverse',
  );
  reject(
    (dir) =>
      edit(dir, (t) => {
        t.imported_commitments[0].stories.push('GF-001');
      }),
    'imported commitment FENCE must exactly equal forward and reverse',
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
