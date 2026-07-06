import assert from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';
import { loadConfig, loadJson, loadPlanInstance, loadPolicy } from '../src/loaders.js';

const cleanupDirs: string[] = [];

afterEach(() => {
  for (const dir of cleanupDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function writeTempJson(name: string, value: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'jig-loaders-'));
  cleanupDirs.push(dir);
  const filePath = join(dir, name);
  writeFileSync(filePath, JSON.stringify(value, null, 2));
  return filePath;
}

test('loadConfig validates config structure', () => {
  assert.throws(() => loadConfig('tests/fixtures/m5b-local-mvp/local-policy.json'), /unknown root field policy/);
});

test('loadPolicy validates policy structure', () => {
  assert.throws(
    () => loadPolicy('tests/fixtures/m5b-local-mvp/local-config.json'),
    /unknown fields "runner", "drivers"/,
  );
});

test('loadJson handles missing file', () => {
  assert.throws(() => loadJson('non-existent.json'), /Failed to load JSON/);
});

test('P06-AC-1: loadConfig resolves relative work-profile and repo-floor artifacts into the track binding', () => {
  const config = loadConfig('tests/fixtures/m5b-local-mvp/local-config-owner-configuration.json');

  assert.strictEqual(config.track?.id, 'TRACK-P06-FIXTURE');
  assert.strictEqual(config.track?.workProfile?.workProfile.id, 'work-profile-fixture');
  assert.strictEqual(config.track?.repoPolicyFloors?.repoPolicyFloors.id, 'repo-policy-floors-fixture');
});

test('P06-AC-7: loadConfig refuses malformed owner-configuration paths with actionable guidance', () => {
  assert.throws(
    () => loadConfig('tests/fixtures/m5b-local-mvp/local-work-profile.json'),
    /unknown root field workProfile|missing "runner" or "drivers"|expected/i,
  );
});

test('P06-AC-7: loadConfig refuses an unknown config version', () => {
  const configPath = writeTempJson('invalid-config-version.json', {
    version: 'config-v9',
    runner: { mode: 'local-dry-run', recordDir: 'runs' },
    drivers: {},
  });

  assert.throws(() => loadConfig(configPath), /config\.version/);
});

test('P06-AC-7: loadConfig refuses unknown runner and driver fields without guessing', () => {
  const configPath = writeTempJson('invalid-config-fields.json', {
    runner: { mode: 'local-dry-run', recordDir: 'runs', shell: 'zsh' },
    drivers: { agent: 'scripted-stub', shell: 'zsh' },
  });

  assert.throws(() => loadConfig(configPath), /config\.runner: unknown field shell/);
});

test('P06-AC-7: loadConfig refuses unknown driver fields even when runner validation passes', () => {
  const configPath = writeTempJson('invalid-driver-fields-only.json', {
    runner: { mode: 'local-dry-run', recordDir: 'runs' },
    drivers: { shell: 'zsh', sandbox: 'tight' },
  });

  assert.throws(() => loadConfig(configPath), /config\.drivers: unknown fields shell, sandbox/);
});

test('P06-AC-7: loadConfig refuses malformed drivers and track blocks', () => {
  const malformedDriversPath = writeTempJson('invalid-drivers.json', {
    runner: { mode: 'local-dry-run', recordDir: 'runs' },
    drivers: 'scripted-stub',
  });
  const malformedTrackPath = writeTempJson('invalid-track.json', {
    runner: { mode: 'local-dry-run', recordDir: 'runs' },
    drivers: {},
    track: { id: 'TRACK', unexpected: true },
  });

  assert.throws(() => loadConfig(malformedDriversPath), /config\.drivers: expected an object/);
  assert.throws(() => loadConfig(malformedTrackPath), /config\.track: unknown field unexpected/);
});

test('loadPlanInstance reports plan validation failures with file context', () => {
  assert.throws(
    () => loadPlanInstance('tests/fixtures/m5b-local-mvp/invalid-plan.json'),
    /Plan validation failed.*unknown version/i,
  );
});

test('P06-AC-7: loadConfig refuses non-object roots and missing runtime sections', () => {
  const arrayConfigPath = writeTempJson('array-config.json', []);
  const missingSectionsPath = writeTempJson('missing-sections.json', {
    version: 'config-v0',
  });

  assert.throws(() => loadConfig(arrayConfigPath), /expected a root object/);
  assert.throws(() => loadConfig(missingSectionsPath), /missing "runner" or "drivers"/);
});

test('P06-AC-7: loadConfig surfaces missing owner-artifact files from resolved relative paths', () => {
  const configPath = writeTempJson('missing-owner-artifacts.json', {
    version: 'config-v0',
    runner: { mode: 'local-dry-run', recordDir: 'runs' },
    drivers: {},
    track: {
      id: 'TRACK-P06',
      workProfilePath: 'missing-work-profile.json',
    },
  });

  assert.throws(() => loadConfig(configPath), /Failed to load JSON/);
});

test('P06-AC-7: loadConfig refuses non-string track owner-configuration fields instead of silently dropping them', () => {
  const idPath = writeTempJson('invalid-track-id.json', {
    version: 'config-v0',
    runner: { mode: 'local-dry-run', recordDir: 'runs' },
    drivers: {},
    track: {
      id: 17,
    },
  });
  const workProfilePath = writeTempJson('invalid-track-work-profile-path.json', {
    version: 'config-v0',
    runner: { mode: 'local-dry-run', recordDir: 'runs' },
    drivers: {},
    track: {
      workProfilePath: 17,
    },
  });
  const repoPolicyFloorsPath = writeTempJson('invalid-track-repo-policy-floors-path.json', {
    version: 'config-v0',
    runner: { mode: 'local-dry-run', recordDir: 'runs' },
    drivers: {},
    track: {
      repoPolicyFloorsPath: 17,
    },
  });

  assert.throws(() => loadConfig(idPath), /config\.track\.id/);
  assert.throws(() => loadConfig(workProfilePath), /config\.track\.workProfilePath/);
  assert.throws(() => loadConfig(repoPolicyFloorsPath), /config\.track\.repoPolicyFloorsPath/);
});

test('P06-AC-7: loadConfig pluralizes "fields" in the unknown-field message for the root, runner, and track blocks', () => {
  const rootPath = writeTempJson('invalid-config-root-multi.json', {
    runner: { mode: 'local-dry-run', recordDir: 'runs' },
    drivers: {},
    extraOne: true,
    extraTwo: true,
  });
  const runnerPath = writeTempJson('invalid-runner-multi.json', {
    runner: { mode: 'local-dry-run', recordDir: 'runs', shellOne: 'zsh', shellTwo: 'bash' },
    drivers: {},
  });
  const trackPath = writeTempJson('invalid-track-multi.json', {
    runner: { mode: 'local-dry-run', recordDir: 'runs' },
    drivers: {},
    track: { id: 'TRACK', unexpectedOne: true, unexpectedTwo: true },
  });

  assert.throws(() => loadConfig(rootPath), /unknown root fields extraOne, extraTwo/);
  assert.throws(() => loadConfig(runnerPath), /config\.runner: unknown fields shellOne, shellTwo/);
  assert.throws(() => loadConfig(trackPath), /config\.track: unknown fields unexpectedOne, unexpectedTwo/);
});

test('P06-AC-7: loadConfig singularizes "field" in the unknown-field message for the drivers block', () => {
  const configPath = writeTempJson('invalid-driver-single.json', {
    runner: { mode: 'local-dry-run', recordDir: 'runs' },
    drivers: { shell: 'zsh' },
  });

  assert.throws(() => loadConfig(configPath), /config\.drivers: unknown field shell(?!s)/);
});

test('P06-AC-7: loadConfig accepts a track with only an id and no owner-configuration artifact paths', () => {
  const configPath = writeTempJson('track-id-only.json', {
    runner: { mode: 'local-dry-run', recordDir: 'runs' },
    drivers: {},
    track: { id: 'TRACK-ID-ONLY' },
  });

  const config = loadConfig(configPath);

  assert.strictEqual(config.track?.id, 'TRACK-ID-ONLY');
  assert.strictEqual(config.track?.workProfile, undefined);
  assert.strictEqual(config.track?.repoPolicyFloors, undefined);
});
