import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';
import { writeEvidence } from '../../scripts/write-gf-001-evidence.mjs';

const rootDir = resolve(import.meta.dirname, '../..');

test('GF-001 evidence is versioned, candidate-bound, and explicitly consumable by GF-004', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'gf001-evidence-test-'));
  let failure;
  try {
    const results = join(tempDir, 'fixture-results.json');
    const fixtureEvidence = join(tempDir, 'fixture-evidence.json');
    const output = join(tempDir, 'evidence.json');
    const candidate = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: rootDir, encoding: 'utf8' }).trim();
    const tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: rootDir, encoding: 'utf8' }).trim();
    const mergeBase = execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], {
      cwd: rootDir,
      encoding: 'utf8',
    }).trim();
    const source = join(rootDir, 'tests', 'fixtures', 'gf-001-workspace');
    const lockfile = readFileSync(join(source, 'pnpm-lock.yaml'));
    const fixturePayload = {
      schemaVersion: 1,
      subject: 'GF-001',
      candidate: { commit: candidate, tree },
      base: { mergeBase },
      fixture: { inputTreeSha256: undefined, lockfileSha256: createHash('sha256').update(lockfile).digest('hex') },
      observations: Array.from({ length: 6 }, (_, index) => ({
        name: `case-${index}`,
        summaries: { run: [{ taskId: '@gf-001-fixture/pkg-a#build', hash: 'hash', cacheStatus: 'MISS', exitCode: 0 }] },
      })),
    };
    const fixtureSourceDigest = (() => {
      const hash = createHash('sha256');
      const visit = (directory, current = directory) => {
        for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
          a.name.localeCompare(b.name),
        )) {
          const path = join(directory, entry.name);
          const name = relative(current, path);
          const stat = lstatSync(path);
          if (entry.isDirectory()) {
            hash.update(`directory:${name}\0`);
            visit(path, current);
          } else if (stat.isFile()) hash.update(`file:${name}\0${readFileSync(path)}\0`);
        }
      };
      visit(source);
      return hash.digest('hex');
    })();
    fixturePayload.fixture.inputTreeSha256 = fixtureSourceDigest;
    const fixtureText = `${JSON.stringify(fixturePayload)}\n`;
    writeFileSync(fixtureEvidence, fixtureText);
    writeFileSync(
      results,
      JSON.stringify({
        schemaVersion: 2,
        subject: 'GF-001',
        exitCode: 0,
        fixtureEvidenceSha256: createHash('sha256').update(fixtureText).digest('hex'),
      }),
    );
    const evidence = writeEvidence({
      outputPath: output,
      fixtureResultsPath: results,
      fixtureEvidencePath: fixtureEvidence,
      requireClean: false,
    });
    const contract = JSON.parse(readFileSync(join(rootDir, 'tests/gf-001/evidence-contract.json'), 'utf8'));
    assert.equal(evidence.schemaVersion, contract.schemaVersion);
    assert.equal(evidence.subject, contract.subject);
    assert.equal(evidence.consumer.nextStory, contract.consumer);
    assert.equal(evidence.candidate.commit.length, 40);
    assert.equal(evidence.candidate.tree.length, 40);
    assert.equal(evidence.base.mergeBase, evidence.base.commit);
    assert.equal(evidence.fixture.resultReport.exitCode, 0);
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
