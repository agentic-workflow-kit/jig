import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { writeEvidence } from '../../scripts/write-gf-001-evidence.mjs';

test('GF-001 evidence fails closed when raw Turbo summaries are absent', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'gf001-evidence-test-'));
  let failure;
  try {
    const fixtureEvidence = join(tempDir, 'fixture-evidence.json');
    const fixtureText = JSON.stringify({ schemaVersion: 1, subject: 'GF-001', observations: [] });
    writeFileSync(fixtureEvidence, fixtureText);
    const fixtureResults = join(tempDir, 'fixture-results.json');
    writeFileSync(
      fixtureResults,
      JSON.stringify({
        schemaVersion: 2,
        subject: 'GF-001',
        exitCode: 0,
        fixtureEvidenceSha256: createHash('sha256').update(fixtureText).digest('hex'),
      }),
    );
    assert.throws(
      () =>
        writeEvidence({
          outputPath: join(tempDir, 'evidence.json'),
          fixtureResultsPath: fixtureResults,
          fixtureEvidencePath: fixtureEvidence,
          requireClean: false,
        }),
      /stale, incomplete, or not bound|missing an expected scenario/,
    );
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
