import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(import.meta.dirname, '..');
// biome-ignore lint/suspicious/noUndeclaredEnvVars: finalizers set this only for their nested full-check observation.
const nestedVerification = process.env.JIG_NESTED_VERIFICATION === '1';

function run(command, args) {
  const result = spawnSync(command, args, { cwd: rootDir, encoding: 'utf8' });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.status !== 0 || result.signal || result.error) process.exitCode = 1;
}

run('pnpm', ['exec', 'tsc', '--build', 'tsconfig.json']);
if (!process.exitCode)
  run(process.execPath, [
    '--test',
    'tests/gf-003/topology.test.mjs',
    'tests/gf-003/evidence-contract.test.mjs',
    'scripts/check-runtime-topology.test.mjs',
  ]);

const topologyText = readFileSync(join(rootDir, 'tests/fixtures/gf-003/topology.json'), 'utf8');
const fakeText = readFileSync(join(rootDir, 'tests/fixtures/gf-003/fake-script.json'), 'utf8');
if (!nestedVerification) {
  mkdirSync(join(rootDir, 'artifacts/gf-003'), { recursive: true });
  writeFileSync(
    join(rootDir, 'artifacts/gf-003/results.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        subject: 'GF-003',
        candidate: {
          commit: spawnSync('git', ['rev-parse', 'HEAD'], { cwd: rootDir, encoding: 'utf8' }).stdout.trim(),
          tree: spawnSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: rootDir, encoding: 'utf8' }).stdout.trim(),
        },
        topology: {
          version: 'jig.runtime-topology.v1',
          fixtureSha256: createHash('sha256').update(topologyText).digest('hex'),
        },
        fakes: { version: 'gf-003-fakes.v1', fixtureSha256: createHash('sha256').update(fakeText).digest('hex') },
        codec: {
          version: 'jig.codec.v1',
          packageJsonSha256: createHash('sha256')
            .update(readFileSync(join(rootDir, 'packages/codec/package.json')))
            .digest('hex'),
          sourceSha256: createHash('sha256')
            .update(readFileSync(join(rootDir, 'packages/codec/src/index.ts')))
            .digest('hex'),
        },
        deniedEdgeCorpus: JSON.parse(topologyText).deniedEdges,
        toolchain: Object.fromEntries(
          ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json'].map((path) => [
            path,
            createHash('sha256')
              .update(readFileSync(join(rootDir, path)))
              .digest('hex'),
          ]),
        ),
        environment: { node: process.version, platform: process.platform, arch: process.arch },
        exitCode: process.exitCode ?? 0,
      },
      null,
      2,
    )}\n`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.exitCode)
  process.exitCode = 1;
