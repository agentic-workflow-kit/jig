import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixtureReadme = resolve('tests/fixtures/m5b-local-mvp/README.md');
const text = readFileSync(fixtureReadme, 'utf8');

const requiredSnippets = [
  'minimal-plan',
  'local-config',
  'local-policy',
  'scripted-worker-output',
  'local-run-record',
  'illustrative examples',
  'not normative schemas',
  'contract owner approves schema freeze',
  'Do not add TypeScript interfaces',
  'JSON Schema',
  'event constants',
  'provider manifests',
  'package exports',
  'package decomposition',
];

const missing = requiredSnippets.filter((snippet) => !text.includes(snippet));

if (missing.length > 0) {
  console.error(`${fixtureReadme} is missing required Phase 0 convention text:`);
  for (const snippet of missing) {
    console.error(`- ${snippet}`);
  }
  process.exit(1);
}

console.log('Delivery foundation fixture conventions are present.');
