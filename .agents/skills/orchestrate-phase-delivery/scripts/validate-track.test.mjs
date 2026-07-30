import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { validateTrack, validateTrackFile } from './validate-track.mjs';

const story = (id, phase, dependencies = []) => ({
  id,
  phase,
  dependencies,
  story_file: `docs/delivery/greenfield/stories/${id}.md`,
});

test('accepts a coherent phase DAG', () => {
  assert.deepEqual(
    validateTrack({
      schema_version: 1,
      stories: [story('GF-001', 0), story('GF-002', 0, ['GF-001'])],
      phases: [{ id: 0, stories: ['GF-001', 'GF-002'] }],
    }),
    [],
  );
});

test('rejects duplicate, missing, cyclic, and phase-reversing dependencies', () => {
  const errors = validateTrack({
    schema_version: 1,
    stories: [story('GF-001', 0, ['GF-002', 'GF-999']), story('GF-001', 1, ['GF-001']), story('GF-002', 1, ['GF-001'])],
    phases: [
      { id: 0, stories: ['GF-001'] },
      { id: 1, stories: ['GF-001', 'GF-002'] },
    ],
  });
  assert.ok(errors.some((error) => error.includes('duplicate story ID')));
  assert.ok(errors.some((error) => error.includes('unknown story GF-999')));
  assert.ok(errors.some((error) => error.includes('dependency cycle')));
  assert.ok(errors.some((error) => error.includes('later phase')));
});

test('rejects duplicate phase IDs and undeclared phase members', () => {
  const errors = validateTrack({
    schema_version: 1,
    stories: [story('GF-001', 0)],
    phases: [
      { id: 0, stories: ['GF-001'] },
      { id: 0, stories: ['GF-999', 123] },
    ],
  });
  assert.ok(errors.some((error) => error.includes('duplicate phase ID')));
  assert.ok(errors.some((error) => error.includes('phase contains unknown story GF-999')));
  assert.ok(errors.some((error) => error.includes('phase contains invalid story 123')));
});

test('rejects a missing referenced story file at the consumer boundary', () => {
  const root = mkdtempSync(join(tmpdir(), 'delivery-track-test-'));
  try {
    const trackPath = join(root, 'track.json');
    writeFileSync(
      trackPath,
      JSON.stringify({
        schema_version: 1,
        stories: [story('GF-001', 0)],
        phases: [{ id: 0, stories: ['GF-001'] }],
      }),
    );
    assert.deepEqual(validateTrackFile(trackPath, root), [
      'story file is missing: docs/delivery/greenfield/stories/GF-001.md',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('requires each story ID to reference its canonical regular file', () => {
  const root = mkdtempSync(join(tmpdir(), 'delivery-track-test-'));
  try {
    const storiesDir = join(root, 'docs/delivery/greenfield/stories');
    mkdirSync(storiesDir, { recursive: true });
    writeFileSync(join(storiesDir, 'GF-002.md'), '# Existing brief\n');

    const wrongPathTrack = join(root, 'wrong-path.json');
    const wrongPathStory = story('GF-001', 0);
    wrongPathStory.story_file = 'docs/delivery/greenfield/stories/GF-002.md';
    writeFileSync(
      wrongPathTrack,
      JSON.stringify({
        schema_version: 1,
        stories: [wrongPathStory],
        phases: [{ id: 0, stories: ['GF-001'] }],
      }),
    );
    assert.ok(
      validateTrackFile(wrongPathTrack, root).some((error) =>
        error.includes('must reference docs/delivery/greenfield/stories/GF-001.md'),
      ),
    );

    mkdirSync(join(storiesDir, 'GF-001.md'));
    const directoryTrack = join(root, 'directory.json');
    writeFileSync(
      directoryTrack,
      JSON.stringify({
        schema_version: 1,
        stories: [story('GF-001', 0)],
        phases: [{ id: 0, stories: ['GF-001'] }],
      }),
    );
    assert.ok(
      validateTrackFile(directoryTrack, root).some((error) => error.includes('story file is not a regular file')),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
