import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { writeEvidence } from '../../scripts/write-gf-001-evidence.mjs';

const rootDir = resolve(import.meta.dirname, '../..');

test('GF-001 evidence is versioned, candidate-bound, and explicitly consumable by GF-004', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'gf001-evidence-test-'));
  let failure;
  try {
    const results = join(tempDir, 'fixture-results.json');
    const output = join(tempDir, 'evidence.json');
    writeFileSync(results, JSON.stringify({ schemaVersion: 1, subject: 'GF-001', exitCode: 0 }));
    const evidence = writeEvidence({ outputPath: output, fixtureResultsPath: results });
    const contract = JSON.parse(readFileSync(join(rootDir, 'tests/gf-001/evidence-contract.json'), 'utf8'));
    assert.equal(evidence.schemaVersion, contract.schemaVersion);
    assert.equal(evidence.subject, contract.subject);
    assert.equal(evidence.consumer.nextStory, contract.consumer);
    assert.equal(evidence.candidate.commit.length, 40);
    assert.equal(evidence.candidate.tree.length, 40);
    assert.equal(evidence.base.mergeBase, evidence.base.commit);
    assert.equal(evidence.fixture.results.exitCode, 0);
  } catch (error) {
    failure = error;
  }
  try {
    rmSync(tempDir, { recursive: true, maxRetries: 5, retryDelay: 50 });
  } catch (cleanupError) {
    throw failure
      ? new AggregateError([failure, cleanupError], 'GF-001 evidence test and cleanup failed')
      : cleanupError;
  }
  if (failure) throw failure;
});
