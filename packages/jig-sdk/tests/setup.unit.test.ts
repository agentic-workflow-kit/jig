import assert from 'node:assert';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';
import { createSetupArtifacts, loadConfig, loadPolicy, loadRepoPolicyFloors, loadWorkProfile } from '../src/index.js';

const cleanupDirs: string[] = [];

afterEach(() => {
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempSetupDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'jig-setup-'));
  cleanupDirs.push(dir);
  return dir;
}

test('P07-AC-1/2: guided setup emits validating owner-configuration artifacts with reasons', () => {
  const outputDir = tempSetupDir();

  const result = createSetupArtifacts(outputDir, {
    trackId: 'TRACK-P07',
    template: 'conservative-manual',
    providerPosture: 'reference-scripted',
  });

  assert.strictEqual(result.status, 'created');
  assert.match(result.reasoning.join('\n'), /Manual gating/);
  assert.deepStrictEqual(
    result.artifacts.map((artifact) => artifact.kind),
    ['config', 'policy', 'work-profile', 'repo-policy-floors', 'setup-record'],
  );
  assert.strictEqual(loadConfig(join(outputDir, 'jig.config.json')).track?.id, 'TRACK-P07');
  assert.strictEqual(loadPolicy(join(outputDir, 'policy.json')).policy?.rules?.gatingPosture, 'manual');
  assert.strictEqual(
    loadWorkProfile(join(outputDir, 'work-profile.json')).workProfile.roleRealization,
    'reviewer-assisted',
  );
  assert.strictEqual(
    loadRepoPolicyFloors(join(outputDir, 'repo-policy-floors.json')).repoPolicyFloors.rules?.mergeSpectrum,
    'open-pr',
  );
});

test('P07-AC-3: setup no-ops over current valid configuration without force', () => {
  const outputDir = tempSetupDir();
  createSetupArtifacts(outputDir, {
    trackId: 'TRACK-P07',
    template: 'assisted-local',
    providerPosture: 'reference-scripted',
  });
  const before = readFileSync(join(outputDir, 'policy.json'), 'utf8');

  const result = createSetupArtifacts(outputDir, {
    trackId: 'TRACK-P07',
    template: 'conservative-manual',
    providerPosture: 'real-local',
  });

  assert.strictEqual(result.status, 'noop');
  assert.match(result.reasoning.join('\n'), /Existing valid setup artifacts/);
  assert.strictEqual(readFileSync(join(outputDir, 'policy.json'), 'utf8'), before);
});

test('P07-AC-3: setup refuses partial overwrite unless force is explicit', () => {
  const outputDir = tempSetupDir();
  writeFileSync(join(outputDir, 'policy.json'), '{}\n');

  assert.throws(
    () =>
      createSetupArtifacts(outputDir, {
        trackId: 'TRACK-P07',
        template: 'conservative-manual',
        providerPosture: 'reference-scripted',
      }),
    /would overwrite existing files/,
  );
});

test('P07-AC-4: setup command skips when freshness evidence is current', () => {
  const outputDir = tempSetupDir();
  const marker = join(outputDir, 'should-not-exist');
  const freshnessMarker = join(outputDir, 'fresh');

  const result = createSetupArtifacts(outputDir, {
    trackId: 'TRACK-P07',
    template: 'assisted-local',
    providerPosture: 'reference-scripted',
    freshnessCheck: `test -f ${freshnessMarker}`,
    setupCommand: `touch ${marker}`,
  });

  assert.strictEqual(result.setupCommand?.action, 'ran-stale');
  assert.ok(existsSync(marker));

  writeFileSync(freshnessMarker, 'fresh\n');
  const forced = createSetupArtifacts(outputDir, {
    trackId: 'TRACK-P07',
    template: 'assisted-local',
    providerPosture: 'reference-scripted',
    freshnessCheck: `test -f ${freshnessMarker}`,
    setupCommand: `touch ${join(outputDir, 'should-not-run')}`,
    force: true,
  });

  assert.strictEqual(forced.setupCommand?.action, 'skipped-fresh');
  assert.ok(!existsSync(join(outputDir, 'should-not-run')));
});

test('P07-AC-1: real-local assisted setup selects real driver names and assisted policy', () => {
  const outputDir = tempSetupDir();

  createSetupArtifacts(outputDir, {
    trackId: 'TRACK-P07',
    template: 'assisted-local',
    providerPosture: 'real-local',
  });

  const config = loadConfig(join(outputDir, 'jig.config.json'));
  const policy = loadPolicy(join(outputDir, 'policy.json'));
  assert.deepStrictEqual(config.drivers, {
    agent: 'codex',
    executionHost: 'real',
    forge: 'github',
    workSource: 'github-issues',
  });
  assert.strictEqual(policy.policy?.rules?.gatingPosture, 'assisted');
});

test('P07 setup validation refuses incomplete or unknown headless answers', () => {
  const outputDir = tempSetupDir();

  assert.throws(
    () =>
      createSetupArtifacts(outputDir, {
        trackId: '',
        template: 'conservative-manual',
        providerPosture: 'reference-scripted',
      }),
    /setup\.trackId/,
  );
  assert.throws(
    () =>
      createSetupArtifacts(outputDir, {
        trackId: 'TRACK-P07',
        template: 'unknown' as 'conservative-manual',
        providerPosture: 'reference-scripted',
      }),
    /setup\.template/,
  );
  assert.throws(
    () =>
      createSetupArtifacts(outputDir, {
        trackId: 'TRACK-P07',
        template: 'conservative-manual',
        providerPosture: 'unknown' as 'reference-scripted',
      }),
    /setup\.providerPosture/,
  );
  assert.throws(
    () =>
      createSetupArtifacts(outputDir, {
        trackId: 'TRACK-P07',
        template: 'conservative-manual',
        providerPosture: 'reference-scripted',
        freshnessCheck: 'test -f fresh',
      }),
    /setup\.freshnessCheck/,
  );
});

test('P07-AC-4: setup command runs without a freshness check when explicitly declared', () => {
  const outputDir = tempSetupDir();
  const marker = join(outputDir, 'setup-ran');

  const result = createSetupArtifacts(outputDir, {
    trackId: 'TRACK-P07',
    template: 'conservative-manual',
    providerPosture: 'reference-scripted',
    setupCommand: `touch ${marker}`,
  });

  assert.strictEqual(result.setupCommand?.action, 'ran-stale');
  assert.ok(existsSync(marker));
});
