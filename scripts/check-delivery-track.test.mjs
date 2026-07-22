import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { validateDeliveryTrack, validateDeliveryTrackPackage } from './check-delivery-track.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsSource = join(projectRoot, 'docs');

function withFixture(run) {
  const rootDir = mkdtempSync(join(tmpdir(), 'jig-delivery-track-'));
  cpSync(docsSource, join(rootDir, 'docs'), { recursive: true });
  const greenfieldDir = join(rootDir, 'docs/delivery/greenfield');
  try {
    return run(rootDir, greenfieldDir);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
}

function readTrack(greenfieldDir) {
  return JSON.parse(readFileSync(join(greenfieldDir, 'track.json'), 'utf8'));
}

function editTrack(greenfieldDir, mutate) {
  const track = readTrack(greenfieldDir);
  mutate(track);
  writeFileSync(join(greenfieldDir, 'track.json'), `${JSON.stringify(track, null, 2)}\n`);
}

function errorsFor(mutator) {
  return withFixture((rootDir, greenfieldDir) => {
    mutator(rootDir, greenfieldDir);
    return validateDeliveryTrackPackage(rootDir);
  });
}

function assertRejected(mutator, expectedError) {
  const errors = errorsFor(mutator);
  assert.ok(errors.length > 0, 'mutant package must fail validation');
  assert.ok(
    errors.some((error) => error.includes(expectedError)),
    `expected ${expectedError} in: ${errors.join('\n')}`,
  );
}

test('valid delivery package passes through the pure validator', () => {
  withFixture((rootDir, greenfieldDir) => {
    const track = readTrack(greenfieldDir);
    const errors = validateDeliveryTrack(track, {
      exists: (relativePath) => {
        try {
          readFileSync(join(rootDir, relativePath));
          return true;
        } catch {
          return false;
        }
      },
      readText: (relativePath) => readFileSync(join(rootDir, relativePath), 'utf8'),
    });
    assert.deepEqual(errors, []);
  });
});

test('rejects a missing story and a duplicate story ID', () => {
  assertRejected((_rootDir, greenfieldDir) => {
    editTrack(greenfieldDir, (track) => track.stories.pop());
  }, 'exact unique 45-story GF ID set');
  assertRejected((_rootDir, greenfieldDir) => {
    editTrack(greenfieldDir, (track) => track.stories.push({ ...track.stories[0] }));
  }, 'exact unique 45-story GF ID set');
});

test('rejects unknown dependencies and cycles', () => {
  assertRejected((_rootDir, greenfieldDir) => {
    editTrack(greenfieldDir, (track) => {
      const story = track.stories.find(({ id }) => id === 'GF-002');
      story.dependencies = ['GF-999'];
      story.dependency_edges = [{ from: 'GF-999', type: 'implementation' }];
    });
  }, 'depends on unknown story GF-999');
  assertRejected((_rootDir, greenfieldDir) => {
    editTrack(greenfieldDir, (track) => {
      const story = track.stories.find(({ id }) => id === 'GF-001');
      story.dependencies = ['GF-002'];
      story.dependency_edges = [{ from: 'GF-002', type: 'implementation' }];
    });
  }, 'dependency graph contains a cycle');
});

test('rejects a critical path that is not a longest chain of real dependency edges', () => {
  assertRejected((_rootDir, greenfieldDir) => {
    editTrack(greenfieldDir, (track) => {
      track.critical_path = ['GF-001', 'GF-005'];
    });
  }, 'critical_path must use a real dependency edge: GF-001->GF-005');
});

test('rejects a missing exact inventory ID', () => {
  assertRejected((_rootDir, greenfieldDir) => {
    editTrack(greenfieldDir, (track) => delete track.inventories.events['EV-NOTICE-SNOOZED']);
  }, 'events must contain its exact fixed ID set');
});

test('rejects an unresolved governing path', () => {
  assertRejected((_rootDir, greenfieldDir) => {
    editTrack(greenfieldDir, (track) => {
      track.stories.find(({ id }) => id === 'GF-001').governing_paths[0] = 'docs/redesign/design/missing.md';
    });
  }, 'unresolved governing path');
});

test('rejects substituted product-route, conformance-suite, and delegated-choice IDs', () => {
  assertRejected((_rootDir, greenfieldDir) => {
    editTrack(greenfieldDir, (track) => {
      track.product_routes['PC-OTHER'] = track.product_routes['PC-README-1'];
      delete track.product_routes['PC-README-1'];
    });
  }, 'exact fixed 44 PC routes');
  assertRejected((_rootDir, greenfieldDir) => {
    editTrack(greenfieldDir, (track) => {
      track.inventories.conformance_suites['CF-OTHER'] = track.inventories.conformance_suites['CF-DETERMINISM'];
      delete track.inventories.conformance_suites['CF-DETERMINISM'];
    });
  }, 'conformance_suites must contain its exact fixed ID set');
  assertRejected((_rootDir, greenfieldDir) => {
    editTrack(greenfieldDir, (track) => {
      track.delegated_choices.open['DR-13'] = track.delegated_choices.open['DR-12'];
      delete track.delegated_choices.open['DR-12'];
    });
  }, 'open delegated choices must be exactly');
});

test('does not let CF-GATE-PRODUCT pass without its fixed mapped product routes', () => {
  assertRejected((_rootDir, greenfieldDir) => {
    editTrack(greenfieldDir, (track) => {
      delete track.product_routes['PC-README-1'];
    });
  }, 'CF-GATE-PRODUCT requires the fixed 39-suite input set and all 44 mapped product routes');
});

test('rejects reopening DR-10', () => {
  assertRejected((_rootDir, greenfieldDir) => {
    editTrack(greenfieldDir, (track) => {
      track.delegated_choices.open['DR-10'] = track.delegated_choices.open['DR-1'];
    });
  }, 'open delegated choices must be exactly');
});

test('rejects changed required fields on an open delegated choice', () => {
  assertRejected((_rootDir, greenfieldDir) => {
    editTrack(greenfieldDir, (track) => {
      track.delegated_choices.open['DR-5'].owner = 'Other';
    });
  }, 'delegated_choices.open.DR-5.owner must equal its fixed approved value');
});

test('rejects an absent semantic/provider split', () => {
  assertRejected((_rootDir, greenfieldDir) => {
    editTrack(greenfieldDir, (track) => {
      track.mandatory_provider_splits = track.mandatory_provider_splits.filter(
        ({ provider_story }) => provider_story !== 'GF-020',
      );
    });
  }, 'exactly three mandatory semantic/provider splits');
});

test('rejects a missing story file', () => {
  assertRejected((_rootDir, greenfieldDir) => {
    rmSync(join(greenfieldDir, 'stories/GF-001.md'));
  }, 'GF-001 story file is missing');
});

test('rejects absent and empty mandatory story sections', () => {
  assertRejected((_rootDir, greenfieldDir) => {
    const path = join(greenfieldDir, 'stories/GF-001.md');
    writeFileSync(path, readFileSync(path, 'utf8').replace('## Exact acceptance', '## Acceptance'));
  }, 'exactly one mandatory heading: Exact acceptance');
  assertRejected((_rootDir, greenfieldDir) => {
    const path = join(greenfieldDir, 'stories/GF-001.md');
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace(
        /## Exact acceptance[\s\S]*?\n## DR choices/,
        '## Exact acceptance\n\n## DR choices',
      ),
    );
  }, 'mandatory heading is empty: Exact acceptance');
});

test('rejects story front-matter metadata mismatches', () => {
  assertRejected((_rootDir, greenfieldDir) => {
    const path = join(greenfieldDir, 'stories/GF-001.md');
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace(
        'title: "Private Node/TypeScript workspace substrate"',
        'title: "Different title"',
      ),
    );
  }, 'front matter title does not match track metadata');
});

test('rejects malformed strict JSON', () => {
  assertRejected((_rootDir, greenfieldDir) => {
    writeFileSync(join(greenfieldDir, 'track.json'), '{ invalid json }');
  }, 'strict valid JSON');
});
