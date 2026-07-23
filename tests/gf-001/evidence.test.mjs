import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { writeEvidence } from '../../scripts/write-gf-001-evidence.mjs';

const rootDir = resolve(import.meta.dirname, '../..');
const capturedFixtureEvidence = join(rootDir, 'artifacts', 'gf-001', 'fixture-evidence.json');

function writeFixturePair(tempDir, fixturePayload, fixtureText = `${JSON.stringify(fixturePayload)}\n`) {
  const fixtureEvidencePath = join(tempDir, 'fixture-evidence.json');
  writeFileSync(fixtureEvidencePath, fixtureText);
  const fixtureResultsPath = join(tempDir, 'fixture-results.json');
  writeFileSync(
    fixtureResultsPath,
    JSON.stringify({
      schemaVersion: 2,
      subject: 'GF-001',
      exitCode: 0,
      fixtureEvidenceSha256: createHash('sha256').update(fixtureText).digest('hex'),
    }),
  );
  return { fixtureEvidencePath, fixtureResultsPath };
}

function expectRejected(tempDir, fixturePayload, mutateResult) {
  const { fixtureEvidencePath, fixtureResultsPath } = writeFixturePair(tempDir, fixturePayload);
  mutateResult?.(fixtureResultsPath);
  assert.throws(
    () =>
      writeEvidence({
        outputPath: join(tempDir, 'evidence.json'),
        fixtureResultsPath,
        fixtureEvidencePath,
        requireClean: false,
      }),
    /GF-001 fixture evidence|GF-001 fixture result hash/,
  );
}

function readBinding(value, binding) {
  return binding.split('.').reduce((current, key) => current?.[key], value);
}

test('GF-001 evidence exposes every declared GF-004 binding', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'gf001-evidence-contract-test-'));
  let failure;
  try {
    const captured = JSON.parse(readFileSync(capturedFixtureEvidence, 'utf8'));
    const { fixtureEvidencePath, fixtureResultsPath } = writeFixturePair(tempDir, captured);
    const evidence = writeEvidence({
      outputPath: join(tempDir, 'evidence.json'),
      fixtureResultsPath,
      fixtureEvidencePath,
      requireClean: false,
    });
    const contract = JSON.parse(readFileSync(join(rootDir, 'tests', 'gf-001', 'evidence-contract.json'), 'utf8'));
    for (const binding of contract.requiredBindings)
      assert.notEqual(readBinding(evidence, binding), undefined, `generated evidence must expose ${binding}`);
  } catch (error) {
    failure = error;
  }
  try {
    rmSync(tempDir, { recursive: true, maxRetries: 5, retryDelay: 50 });
  } catch (cleanupError) {
    throw failure
      ? new AggregateError([failure, cleanupError], 'GF-001 evidence contract test and cleanup failed')
      : cleanupError;
  }
  if (failure) throw failure;
});

test('GF-001 evidence rejects tampered captured Turbo proof', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'gf001-evidence-test-'));
  let failure;
  try {
    const captured = JSON.parse(readFileSync(capturedFixtureEvidence, 'utf8'));

    const staleCandidate = structuredClone(captured);
    staleCandidate.candidate.commit = '0'.repeat(40);
    expectRejected(tempDir, staleCandidate);

    const staleBase = structuredClone(captured);
    staleBase.base.commit = '0'.repeat(40);
    expectRejected(tempDir, staleBase);

    const staleRawSummaryHash = structuredClone(captured);
    staleRawSummaryHash.observations.find(
      (observation) => observation.name === 'warm-local-cache',
    ).summaries.warm.rawSummaryBase64 = staleRawSummaryHash.observations
      .find((observation) => observation.name === 'warm-local-cache')
      .summaries.warm.rawSummaryBase64.slice(1);
    expectRejected(tempDir, staleRawSummaryHash);

    const semanticallyWrongWarmRun = structuredClone(captured);
    const warmRecord = semanticallyWrongWarmRun.observations.find(
      (observation) => observation.name === 'warm-local-cache',
    ).summaries.warm;
    const warmSummary = JSON.parse(Buffer.from(warmRecord.rawSummaryBase64, 'base64').toString('utf8'));
    for (const task of warmSummary.tasks) task.cache.status = 'MISS';
    const changedWarmSummary = JSON.stringify(warmSummary);
    warmRecord.rawSummaryBase64 = Buffer.from(changedWarmSummary).toString('base64');
    warmRecord.rawSummarySha256 = createHash('sha256').update(changedWarmSummary).digest('hex');
    expectRejected(tempDir, semanticallyWrongWarmRun);

    const reportHashDoesNotMatchFixtureEvidence = structuredClone(captured);
    const { fixtureEvidencePath, fixtureResultsPath } = writeFixturePair(
      tempDir,
      reportHashDoesNotMatchFixtureEvidence,
    );
    writeFileSync(fixtureEvidencePath, `${readFileSync(fixtureEvidencePath, 'utf8')} `);
    assert.throws(
      () =>
        writeEvidence({
          outputPath: join(tempDir, 'evidence.json'),
          fixtureResultsPath,
          fixtureEvidencePath,
          requireClean: false,
        }),
      /fixture result hash/,
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
