import { readdirSync, readFileSync } from 'node:fs';
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

// Cross-check that every target-state-implementation phase doc's frontmatter status matches
// its phase-table row status in the track README, so the two status surfaces cannot drift
// silently (a phase doc updated without its table row, or vice versa).
const trackReadmePath = resolve('docs/delivery/target-state-implementation/README.md');
const trackReadmeText = readFileSync(trackReadmePath, 'utf8');
const phaseDocsDirectory = resolve('docs/delivery/target-state-implementation/phases');

function normalizeStatus(status) {
  return status.trim().toLowerCase().replace(/\s+/g, ' ');
}

const phaseTableRowPattern = /^\|\s*(P\d+)\s*\|\s*\[.*?\]\((\.\/phases\/[^)]+)\)\s*\|\s*(.*?)\s*\|/gm;
const tableStatusByPhaseFile = new Map();
for (const match of trackReadmeText.matchAll(phaseTableRowPattern)) {
  const [, phaseId, relativePhasePath, status] = match;
  const phaseDocPath = resolve('docs/delivery/target-state-implementation', relativePhasePath);
  tableStatusByPhaseFile.set(phaseDocPath, { phaseId, status: normalizeStatus(status) });
}

if (tableStatusByPhaseFile.size === 0) {
  console.error(`${trackReadmePath} phase table did not match the expected row pattern.`);
  process.exit(1);
}

const frontmatterPattern = /^---\n([\s\S]*?)\n---/;
const frontmatterStatusPattern = /^status:\s*"?(.*?)"?\s*$/m;
const statusMismatches = [];
const expectedPhaseDocPaths = new Set(
  readdirSync(phaseDocsDirectory)
    .filter((entry) => /^\d{2}-.*\.md$/.test(entry))
    .map((entry) => resolve(phaseDocsDirectory, entry)),
);

for (const [phaseDocPath, { phaseId, status: tableStatus }] of tableStatusByPhaseFile) {
  const phaseDocText = readFileSync(phaseDocPath, 'utf8');
  const frontmatterBlock = phaseDocText.match(frontmatterPattern)?.[1];
  if (!frontmatterBlock) {
    statusMismatches.push(`${phaseId} (${phaseDocPath}): no frontmatter block found`);
    continue;
  }
  const frontmatterMatch = frontmatterBlock.match(frontmatterStatusPattern);
  if (!frontmatterMatch) {
    statusMismatches.push(`${phaseId} (${phaseDocPath}): no frontmatter status found`);
    continue;
  }
  const docStatus = normalizeStatus(frontmatterMatch[1]);
  if (docStatus !== tableStatus) {
    statusMismatches.push(
      `${phaseId} (${phaseDocPath}): frontmatter status "${docStatus}" does not match ` +
        `phase-table row status "${tableStatus}"`,
    );
  }
}

for (const phaseDocPath of expectedPhaseDocPaths) {
  if (!tableStatusByPhaseFile.has(phaseDocPath)) {
    statusMismatches.push(`${phaseDocPath}: phase doc is not represented in the track README table`);
  }
}

if (statusMismatches.length > 0) {
  console.error('Phase status drift between the track README table and phase-doc frontmatter:');
  for (const mismatch of statusMismatches) {
    console.error(`- ${mismatch}`);
  }
  process.exit(1);
}

console.log('Phase-table and phase-doc frontmatter statuses agree.');
