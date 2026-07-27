import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const expectedUnits = ['RT-OPERATOR', 'RT-CONTROLLER', 'RT-LEDGER', 'RT-EVIDENCE', 'RT-REGISTRY', 'RT-WITNESS'];
const expectedPorts = [
  'PORT-CONSUMER',
  'PORT-INTAKE',
  'PORT-DECIDE',
  'PORT-SESSION',
  'PORT-WORKSPACE',
  'PORT-VERIFY',
  'PORT-DELIVERY',
  'PORT-LEDGER',
  'PORT-ARTIFACT',
  'PORT-PUBLISH',
  'PORT-SOURCE',
];
const expectedDeniedEdges = [
  'builder-to-controller',
  'consumer-to-controller',
  'port-to-port-bypass',
  'provider-import',
  'store-decision',
  'unknown-port',
];

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export function validateRuntimeTopology(rootDir = process.cwd()) {
  const errors = [];
  const fixturePath = resolve(rootDir, 'tests/fixtures/runtime-topology.json');
  const fakePath = resolve(rootDir, 'tests/fixtures/runtime-fakes.json');
  const sourcePath = resolve(rootDir, 'packages/runtime-contracts/src/index.ts');
  const manifestPath = resolve(rootDir, 'packages/runtime-contracts/package.json');
  for (const path of [fixturePath, fakePath, sourcePath, manifestPath])
    if (!existsSync(path)) errors.push(`runtime topology required input is missing: ${path}`);
  if (errors.length) return errors;
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  if (
    fixture.schemaVersion !== 2 ||
    fixture.topologyVersion !== 'jig.runtime-topology.v1' ||
    fixture.codecVersion !== 'jig.codec.v1' ||
    !same(fixture.units, expectedUnits) ||
    !same(fixture.ports, expectedPorts) ||
    !same(fixture.deniedEdges, expectedDeniedEdges) ||
    !Array.isArray(fixture.allowedCrossings) ||
    fixture.allowedCrossings.length !== 20
  )
    errors.push(
      'runtime topology immutable topology oracle must bind exactly six units, eleven ports, and the denied-edge corpus',
    );
  const fake = JSON.parse(readFileSync(fakePath, 'utf8'));
  if (
    fake.schemaVersion !== 1 ||
    fake.fixtureVersion !== 'runtime-topology-fakes.v1' ||
    !same(fake.ports, ['PORT-SESSION', 'PORT-WORKSPACE', 'PORT-VERIFY', 'PORT-DELIVERY'])
  )
    errors.push('runtime topology scripted fake fixture must remain a fixed pure mechanism oracle');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (
    manifest.name !== '@agentic-workflow-kit/jig-runtime-contracts' ||
    manifest.private !== true ||
    manifest.dependencies?.['@agentic-workflow-kit/jig-codec'] !== 'workspace:*' ||
    Object.keys(manifest.dependencies ?? {}).length !== 1 ||
    manifest.bin ||
    manifest.publishConfig ||
    manifest.scripts?.start
  )
    errors.push('runtime topology runtime contracts must remain private, codec-only, and non-runnable');
  const source = readFileSync(sourcePath, 'utf8');
  if (/from ['"](?!@agentic-workflow-kit\/jig-codec['"])/.test(source) || /\b(fetch|process|require)\b/.test(source))
    errors.push(
      'runtime topology runtime contracts must not import a provider, transport, process, or effect capability',
    );
  for (const unit of expectedUnits)
    if (!source.includes(`'${unit}'`)) errors.push(`runtime topology source omits required unit: ${unit}`);
  for (const port of expectedPorts)
    if (!source.includes(`'${port}'`)) errors.push(`runtime topology source omits required port: ${port}`);
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = validateRuntimeTopology();
  if (errors.length) {
    console.error('Runtime topology check failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else console.log('Runtime topology check passed (six units, eleven ports, pure fakes, and authority fence).');
}
