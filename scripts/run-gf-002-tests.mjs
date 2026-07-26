import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(import.meta.dirname, '..');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim();
// biome-ignore lint/suspicious/noUndeclaredEnvVars: finalizers set this only for their nested full-check observation.
const nestedVerification = process.env.JIG_NESTED_VERIFICATION === '1';
const approvedStoryIds = Object.freeze(
  'GF-001 GF-002 GF-003 GF-004 GF-005 GF-010 GF-011 GF-012 GF-013 GF-014 GF-015 GF-019 GF-020 GF-021 GF-022 GF-023 GF-024 GF-025 GF-026 GF-030 GF-031 GF-032 GF-033 GF-034 GF-035 GF-036 GF-037 GF-038 GF-039 GF-040 GF-041 GF-042 GF-043 GF-044 GF-045 GF-046 GF-047 GF-050 GF-051 GF-052 GF-053 GF-054 GF-055 GF-056 GF-057 GF-060 GF-061 GF-062'.split(
    ' ',
  ),
);
const approvedOwnedPaths = Object.freeze(
  [
    '.github/workflows/check.yml',
    '.gitignore',
    '.nvmrc',
    '.prettierignore',
    'AGENTS.md',
    'README.md',
    'biome.json',
    'docs/README.md',
    'docs/delivery/AGENTS.md',
    'docs/delivery/README.md',
    'docs/delivery/greenfield/README.md',
    'docs/delivery/greenfield/baseline-and-findings.md',
    'docs/delivery/greenfield/coverage.md',
    'docs/delivery/greenfield/decisions.md',
    'docs/delivery/greenfield/delivery-policy.md',
    'docs/delivery/greenfield/dependency-dag.md',
    'docs/delivery/greenfield/research-ledger.md',
    'docs/delivery/greenfield/reviewer/README.md',
    'docs/delivery/greenfield/reviewer/review-checklist.md',
    'docs/delivery/greenfield/risks-and-owner-decisions.md',
    ...approvedStoryIds.map((id) => `docs/delivery/greenfield/stories/${id}.md`),
    'docs/delivery/greenfield/stories/README.md',
    'docs/delivery/greenfield/story-contract.md',
    'docs/delivery/greenfield/track.json',
    'docs/delivery/greenfield/verification.md',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'scripts/check-active-repository.mjs',
    'scripts/check-delivery-track.mjs',
    'scripts/check-delivery-track.test.mjs',
    'scripts/check-doc-links.mjs',
  ].sort(),
);

export const APPROVED_ACTIVATION = Object.freeze({
  recordUrl: 'https://github.com/agentic-workflow-kit/jig/issues/107',
  approvedDeliveryPackage: {
    formula: 'P = Q + durable R identifier + PASS',
    q: {
      commit: '1ec48a9800d33beb49761e45e4679e65b25e7317',
      tree: 'f66b9da5e030c969c6d1fd76e41d86ae66c5126e',
      pathCount: 79,
      ownedPaths: approvedOwnedPaths,
      manifestAlgorithm: 'sha256(lines: mode SP sha256(bytes) SP SP path LF)',
      digest: '27f879b8852e4137c16a9c6ee8a41decae5a62e1b07fd7b8e165211d491ede72',
    },
    r: { url: 'https://github.com/agentic-workflow-kit/jig/pull/104#issuecomment-5053504609', verdict: 'PASS' },
  },
  landingEquivalence: {
    url: 'https://github.com/agentic-workflow-kit/jig/pull/104#issuecomment-5053513466',
    landed: { commit: '8cf8decb29ab223275d954220d1a6b5fa575c6a2', tree: 'f66b9da5e030c969c6d1fd76e41d86ae66c5126e' },
  },
  planningProvenance: {
    commit: 'b860891d9102e0bdda1d23def81b1b974a4a26ac',
    tree: '763fa777c62999795fb679cc05a61be1190d93b6',
  },
});

export const OBSERVATION_MANIFEST = Object.freeze({
  schemaVersion: 1,
  finalization: 'post-clean-candidate; evidence never attests a gate that writes itself',
  required: [
    {
      id: 'targeted-tests',
      command: 'node scripts/run-gf-002-tests.mjs',
      disposition: 'required-post-clean-observation',
    },
    { id: 'typecheck', command: 'pnpm typecheck', disposition: 'required-post-clean-observation' },
    { id: 'boundaries', command: 'pnpm boundaries:check', disposition: 'required-post-clean-observation' },
    { id: 'git-diff-check', command: 'git diff --check', disposition: 'required-post-clean-observation' },
    { id: 'full-pnpm-check', command: 'pnpm check', disposition: 'required-post-clean-observation' },
    {
      id: 'evidence-readback',
      command: 'node scripts/write-gf-002-evidence.mjs',
      disposition: 'required-post-clean-observation',
    },
  ],
  prePublication: [
    { id: 'hosted-check', disposition: 'pending-not-yet-applicable' },
    { id: 'independent-review', disposition: 'pending-not-yet-applicable' },
  ],
});

function qManifest() {
  const { q } = APPROVED_ACTIVATION.approvedDeliveryPackage;
  if (q.ownedPaths.length !== q.pathCount || new Set(q.ownedPaths).size !== q.pathCount)
    throw new Error('approved delivery package does not bind exactly 79 unique owned paths');
  const rows = q.ownedPaths
    .map((path) => {
      const entry = git('ls-tree', q.commit, '--', path);
      const match = /^(100644|100755) blob [0-9a-f]+\t(.+)$/.exec(entry);
      if (!match || match[2] !== path)
        throw new Error(`approved delivery package path is absent or not a regular file: ${path}`);
      return `${match[1]} ${sha256(execFileSync('git', ['show', `${q.commit}:${path}`], { cwd: rootDir }))}  ${path}\n`;
    })
    .join('');
  return sha256(rows);
}

export function verifyApprovedActivation() {
  const activation = APPROVED_ACTIVATION;
  const { q } = activation.approvedDeliveryPackage;
  if (git('rev-parse', `${q.commit}^{tree}`) !== q.tree)
    throw new Error('approved Q commit does not resolve to its immutable tree');
  if (qManifest() !== q.digest) throw new Error('approved Q owned-path manifest does not match its immutable digest');
  if (
    git('rev-parse', `${activation.landingEquivalence.landed.commit}^{tree}`) !==
    activation.landingEquivalence.landed.tree
  )
    throw new Error('landed predecessor commit does not resolve to its immutable tree');
  if (activation.landingEquivalence.landed.tree !== q.tree)
    throw new Error('landing equivalence does not preserve the approved Q tree');
  if (git('rev-parse', `${activation.planningProvenance.commit}^{tree}`) !== activation.planningProvenance.tree)
    throw new Error('planning provenance commit does not resolve to its immutable tree');
  execFileSync('git', ['merge-base', '--is-ancestor', activation.landingEquivalence.landed.commit, 'origin/main'], {
    cwd: rootDir,
  });
  const track = JSON.parse(readFileSync(join(rootDir, 'docs', 'delivery', 'greenfield', 'track.json'), 'utf8'));
  const story = track.stories?.find((entry) => entry.id === 'GF-002');
  if (
    !story ||
    JSON.stringify(story.dependencies) !== JSON.stringify(['GF-001']) ||
    JSON.stringify(story.dependency_edges) !== JSON.stringify([{ from: 'GF-001', type: 'implementation' }])
  )
    throw new Error('GF-002 predecessor containment is not exact');
  return activation;
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: rootDir, encoding: 'utf8' });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  return result;
}

export function runGf002Tests() {
  const corpusPath = join(rootDir, 'tests', 'fixtures', 'gf-002', 'corpus.json');
  const corpusText = readFileSync(corpusPath, 'utf8');
  const corpus = JSON.parse(corpusText);
  const startedAt = new Date().toISOString();
  const build = run('pnpm', ['exec', 'tsc', '--build', 'tsconfig.json']);
  const tests =
    build.status === 0 && !build.error
      ? run(process.execPath, [
          '--test',
          'tests/gf-002/codec.test.mjs',
          'tests/gf-002/corpus.test.mjs',
          'tests/gf-002/evidence.test.mjs',
        ])
      : null;
  const result = tests ?? build;
  const exitCode = result.signal === null ? (result.status ?? 1) : 1;
  if (!nestedVerification) {
    const outputDir = join(rootDir, 'artifacts', 'gf-002');
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      join(outputDir, 'results.json'),
      `${JSON.stringify(
        {
          schemaVersion: 2,
          subject: 'GF-002',
          activation: verifyApprovedActivation(),
          predecessor: { story: 'GF-001', containedInExecutionBase: true },
          observationManifest: OBSERVATION_MANIFEST,
          candidate: { commit: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}') },
          base: {
            ref: 'origin/main',
            commit: git('rev-parse', 'origin/main'),
            tree: git('rev-parse', 'origin/main^{tree}'),
            mergeBase: git('merge-base', 'HEAD', 'origin/main'),
          },
          command:
            'pnpm exec tsc --build tsconfig.json then node --test tests/gf-002/codec.test.mjs tests/gf-002/corpus.test.mjs tests/gf-002/evidence.test.mjs',
          requiredClassSet: corpus.requiredClassSet,
          corpus: {
            path: 'tests/fixtures/gf-002/corpus.json',
            sha256: sha256(corpusText),
            seed: corpus.seed,
            oracleSha256: corpus.oracle.sha256,
          },
          environment: { node: process.version, platform: process.platform, arch: process.arch },
          toolchain: {
            packageJsonSha256: sha256(readFileSync(join(rootDir, 'package.json'))),
            lockfileSha256: sha256(readFileSync(join(rootDir, 'pnpm-lock.yaml'))),
            workspaceConfigSha256: sha256(readFileSync(join(rootDir, 'pnpm-workspace.yaml'))),
            tsconfigSha256: sha256(readFileSync(join(rootDir, 'tsconfig.json'))),
          },
          startedAt,
          finishedAt: new Date().toISOString(),
          exitCode,
          signal: result.signal,
          stdoutSha256: sha256(`${build.stdout ?? ''}${tests?.stdout ?? ''}`),
          stderrSha256: sha256(`${build.stderr ?? ''}${tests?.stderr ?? ''}`),
        },
        null,
        2,
      )}\n`,
    );
  }
  if (result.error) throw result.error;
  if (exitCode !== 0) process.exitCode = exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runGf002Tests();
