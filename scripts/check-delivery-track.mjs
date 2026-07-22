import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const TRACK_PATH = 'docs/delivery/greenfield/track.json';
const STORY_IDS =
  'GF-001 GF-002 GF-003 GF-004 GF-005 GF-010 GF-011 GF-012 GF-013 GF-014 GF-015 GF-019 GF-020 GF-021 GF-022 GF-023 GF-025 GF-026 GF-024 GF-030 GF-031 GF-032 GF-033 GF-034 GF-035 GF-036 GF-037 GF-038 GF-039 GF-040 GF-041 GF-042 GF-043 GF-044 GF-045 GF-046 GF-047 GF-050 GF-051 GF-052 GF-053 GF-054 GF-055 GF-056 GF-060 GF-061 GF-062'.split(
    ' ',
  );
const STORY_KEYS = [
  'id',
  'title',
  'phase',
  'dependencies',
  'dependency_edges',
  'size',
  'governing_paths',
  'stable_ids',
  'dr_gates',
  'story_file',
  'outcome',
  'oracle',
  'status',
  'baseline_commit',
  'product_routes',
  'imported_commitments',
];
const APPROVED_NORMATIVE_CORPUS_SHA256 = 'fca18fcb768fe11ef00393958077b0f13b8e045d394e9c0e3a9e953925ef632c';
const HEADINGS = [
  'Outcome, value, and why now',
  'Governing paths and stable IDs',
  'Dependencies plus start evidence',
  'In-scope and non-goals',
  'Runtime/product unit, ports, inputs, outputs, identities, persisted facts, authority',
  'Observable success and terminal outcomes',
  'Failure, uncertainty, timeout, retry, reconciliation, recovery, cleanup, and resume',
  'Security and trust: validation, credentials, redaction, and authority widening',
  'Deliverables without delegated algorithm invention',
  'Test and evidence obligations',
  'Exact acceptance',
  'DR choices',
  'PR boundary, relative size, and split',
  'Definition of Ready',
  'Definition of Done',
];
const SPLITS = [
  ['GF-019', 'GF-020'],
  ['GF-010', 'GF-025'],
  ['GF-013', 'GF-026'],
  ['GF-033', 'GF-039'],
  ['GF-042', 'GF-047'],
];

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
function sha(value) {
  return createHash('sha256')
    .update(typeof value === 'string' ? value : canonical(value))
    .digest('hex');
}
function eqSet(a, b) {
  return (
    Array.isArray(a) && a.length === b.length && new Set(a).size === a.length && a.every((item) => b.includes(item))
  );
}
function allFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? allFiles(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}
function parseScalar(text) {
  const value = text.trim();
  if (/^".*"$/.test(value)) return JSON.parse(value);
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value.startsWith('{') && value.endsWith('}')) {
    try {
      return JSON.parse(value.replace(/,\s*([}\]])/g, '$1'));
    } catch {
      return Object.fromEntries(
        value
          .slice(1, -1)
          .split(',')
          .filter(Boolean)
          .map((part) => {
            const pair = part.trim().match(/^([a-z_]+):\s*(.*)$/);
            if (!pair) throw new Error('invalid inline map');
            return [pair[1], parseScalar(pair[2])];
          }),
      );
    }
  }
  if (value === '[]') return [];
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      return JSON.parse(value.replace(/,\s*([\]}])/g, '$1'));
    } catch {
      const parts = [];
      let start = 0;
      let depth = 0;
      for (let index = 0; index < value.length; index += 1) {
        if ('[{'.includes(value[index])) depth += 1;
        if (']}'.includes(value[index])) depth -= 1;
        if (value[index] === ',' && depth === 1) {
          parts.push(value.slice(start + 1, index));
          start = index;
        }
      }
      parts.push(value.slice(start + 1, -1));
      return parts.map((part) => parseScalar(part)).filter(Boolean);
    }
  }
  return value;
}
function parseStrictFrontMatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { error: 'lacks YAML front matter' };
  const lines = match[1].split('\n');
  const fields = {};
  for (let index = 0; index < lines.length; index += 1) {
    const field = lines[index].match(/^([a-z_]+):\s*(.*)$/);
    if (!field) return { error: `has unsupported YAML line ${index + 1}` };
    const [, key, first] = field;
    if (Object.hasOwn(fields, key)) return { error: `duplicates front matter field ${key}` };
    if (first === '' && lines[index + 1]?.trim().startsWith('[')) {
      let value = '';
      do value += lines[++index].trim();
      while (!value.includes(']') && index + 1 < lines.length);
      try {
        fields[key] = parseScalar(value);
      } catch {
        return { error: `has invalid scalar for ${key}` };
      }
      continue;
    }
    if (first === '') {
      const values = [];
      while (index + 1 < lines.length && /^ {2}- /.test(lines[index + 1])) {
        const item = lines[++index].slice(4);
        if (item === '{') {
          let object = '{';
          while (index + 1 < lines.length && !object.includes('}')) object += lines[++index].trim();
          values.push(parseScalar(object));
          continue;
        }
        const pair = item.match(/^([a-z_]+):\s*(.*)$/);
        if (!pair) values.push(parseScalar(item));
        else {
          const entry = { [pair[1]]: parseScalar(pair[2]) };
          while (index + 1 < lines.length && /^ {4}[a-z_]+:\s*/.test(lines[index + 1])) {
            const next = lines[++index].trim().match(/^([a-z_]+):\s*(.*)$/);
            entry[next[1]] = parseScalar(next[2]);
          }
          values.push(entry);
        }
      }
      fields[key] = values;
      continue;
    }
    let value = first;
    while (value.includes('[') && !value.includes(']') && index + 1 < lines.length) value += lines[++index].trim();
    if (/^[&*!]|\s[&*!][A-Za-z]/.test(value)) return { error: `uses YAML alias or tag in ${key}` };
    try {
      fields[key] = parseScalar(value);
    } catch {
      return { error: `has invalid scalar for ${key}` };
    }
  }
  return { fields, raw: match[1], narrative: text.slice(match[0].length) };
}
function exact(a, b) {
  return canonical(a) === canonical(b);
}
function tableRows(text, heading) {
  const section = text.slice(text.indexOf(heading), text.indexOf('## Canonical product projection'));
  return [...section.matchAll(/^\|\s*`?([A-Z][A-Z0-9-]+)`?\s*\|\s*(.*?)\s*\|\s*`?(satisfied|note)`?\s*\|\s*$/gm)].map(
    ([, id, _carried, disposition]) => [id, disposition],
  );
}
function routeRows(text) {
  const section = text.slice(text.indexOf('### Round-6 minimal-route audit'));
  return new Map(
    [...section.matchAll(/^\|\s*`(PC-[A-Z0-9-]+)`\s*\|\s*(.*?)\s*\|\s*$/gm)].map(([, id, route]) => [id, route]),
  );
}
function delegationRegisterOwners(text) {
  const owners = new Map();
  for (const [, id, cell] of text.matchAll(/^\|\s*(DR-\d+)\s*\|\s*[^|]+\|\s*([^|]+)\|/gm)) {
    owners.set(id, cell.trim());
  }
  return owners;
}
function deliveryScheduleOwners(text) {
  const owners = new Map();
  for (const [, id, cell] of text.matchAll(/^\|\s*(DR-\d+)\s*\|\s*([^|]+)\|/gm)) {
    const owner = cell.trim().match(/^(.*?)\s+\/\s+GF-/)?.[1];
    if (owner) owners.set(id, owner.trim());
  }
  return owners;
}
function sourceCatalog(readText, errors, { path, start, end, prefix, count }) {
  const text = readText(path);
  const starts = [...text.matchAll(new RegExp(`^${start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'gm'))];
  const ends = [...text.matchAll(new RegExp(`^${end.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'gm'))];
  if (starts.length !== 1 || ends.length !== 1 || ends[0].index <= starts[0]?.index) {
    errors.push(`source catalog ${path} has missing, duplicate, or malformed heading boundary`);
    return [];
  }
  const section = text.slice(starts[0].index, ends[0].index);
  const ids = [...section.matchAll(new RegExp(`^\\|\\s*\`?(${prefix}-[A-Z0-9-]+)\`?\\s*\\|`, 'gm'))].map(
    (match) => match[1],
  );
  if (ids.length !== count || new Set(ids).size !== ids.length)
    errors.push(`source catalog ${path} must contain exactly ${count} unique ${prefix}-* first-column rows`);
  return ids;
}
function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) && eqSet(Object.keys(value), keys);
}
export function deliveryAllowlist() {
  return new Set([
    'docs/delivery/AGENTS.md',
    'docs/delivery/README.md',
    'docs/delivery/greenfield/README.md',
    'docs/delivery/greenfield/baseline-and-findings.md',
    'docs/delivery/greenfield/coverage.md',
    'docs/delivery/greenfield/decisions.md',
    'docs/delivery/greenfield/delivery-policy.md',
    'docs/delivery/greenfield/dependency-dag.md',
    'docs/delivery/greenfield/research-ledger.md',
    'docs/delivery/greenfield/risks-and-owner-decisions.md',
    'docs/delivery/greenfield/story-contract.md',
    'docs/delivery/greenfield/track.json',
    'docs/delivery/greenfield/verification.md',
    'docs/delivery/greenfield/reviewer/README.md',
    'docs/delivery/greenfield/reviewer/review-checklist.md',
    'docs/delivery/greenfield/stories/README.md',
    ...STORY_IDS.map((id) => `docs/delivery/greenfield/stories/${id}.md`),
  ]);
}
export function candidatePackageManifest(rootDir = process.cwd()) {
  const paths = [
    ...deliveryAllowlist(),
    'AGENTS.md',
    'README.md',
    'docs/README.md',
    'package.json',
    'scripts/check-delivery-track.mjs',
    'scripts/check-delivery-track.test.mjs',
    'scripts/check-active-repository.mjs',
  ].sort();
  if (new Set(paths).size !== 70)
    throw new Error(`candidate package manifest requires exactly 70 paths, got ${paths.length}`);
  const rows = paths.map((path) => `${sha(readFileSync(join(rootDir, path), 'utf8'))}  ${path}\n`).join('');
  return sha(rows);
}
export function verifyCandidatePackageManifest(expected, rootDir = process.cwd()) {
  const actual = candidatePackageManifest(rootDir);
  if (actual !== expected) throw new Error(`candidate package manifest mismatch: expected ${expected}, got ${actual}`);
  return actual;
}

export function validateDeliveryTrack(track, { exists, readText, rootDir }) {
  const errors = [];
  const catalogSpecs = [
    ['runtime_units', 'docs/redesign/design/runtime.md', '## Runtime units', '## Named ports', 'RT', 6],
    [
      'ports_core',
      'docs/redesign/design/runtime.md',
      '## Named ports',
      '### Pre-Run attempt commit primitive',
      'PORT',
      10,
    ],
    [
      'identities',
      'docs/redesign/design/data-and-identity.md',
      '## Identity representation',
      '## Effect-fence representation',
      'ID',
      22,
    ],
    [
      'schema_families',
      'docs/redesign/design/data-and-identity.md',
      '## Schema families',
      '### Family responsibility matrix',
      'SCH',
      27,
    ],
    ['events', 'docs/redesign/design/lifecycle-catalogs.md', '## Event catalog', '## Operation catalog', 'EV', 32],
    [
      'operations',
      'docs/redesign/design/lifecycle-catalogs.md',
      '## Operation catalog',
      '### Cataloged phase-preserving authorization transitions',
      'OPC',
      29,
    ],
    [
      'failure_classes',
      'docs/redesign/design/lifecycle-catalogs.md',
      '## Failure-code taxonomy',
      '## Exclusions — owned by sibling pages',
      'FC',
      12,
    ],
    [
      'bound_classes',
      'docs/redesign/design/scheduling-and-bounds.md',
      '## Bound and budget classes (`BND-*`)',
      '### Normalized bounded-progress and wait inventory',
      'BND',
      12,
    ],
    [
      'conformance_suites',
      'docs/redesign/design/architecture-conformance.md',
      '## Suite catalog (`CF-*`)',
      '## Execution posture and gated outcomes',
      'CF',
      39,
    ],
  ];
  const sourceCatalogs = Object.fromEntries(
    catalogSpecs.map(([name, path, start, end, prefix, count]) => [
      name,
      sourceCatalog(readText, errors, { path, start, end, prefix, count }),
    ]),
  );
  const sourcePort = sourceCatalogs.ports_core;
  const envelope = readText('docs/redesign/design/envelope-production.md');
  if ((envelope.match(/^## Work Source seam \(`PORT-SOURCE`\)$/gm) ?? []).length !== 1)
    errors.push('source catalog envelope-production.md must contain exactly one anchored Work Source seam heading');
  else sourceCatalogs.ports = [...sourcePort, 'PORT-SOURCE'];
  const rootKeys = [
    'schema_version',
    'kind',
    'status',
    'authority_order',
    'baseline',
    'counts',
    'global_definition_of_ready',
    'global_definition_of_done',
    'universal_constraints',
    'phases',
    'stories',
    'mandatory_provider_splits',
    'critical_path',
    'parallel_lanes',
    'gate_edges',
    'inventories',
    'product_routes',
    'imported_commitments',
    'delegated_choices',
  ];
  if (!exactKeys(track, rootKeys)) errors.push('track must have the exact top-level schema');
  if (
    track?.schema_version !== 1 ||
    track?.kind !== 'jig-greenfield-delivery-track' ||
    track?.status !== 'planning-baseline; no implementation authorized'
  )
    errors.push('track schema, kind, or planning status is invalid');
  if (
    !Array.isArray(track?.stories) ||
    !eqSet(
      track.stories.map((story) => story.id),
      STORY_IDS,
    )
  )
    errors.push('track must contain the exact 47 story IDs');
  if (
    !Array.isArray(track?.phases) ||
    track.phases.length !== 7 ||
    !eqSet(
      track.phases.flatMap((phase) => phase.stories),
      STORY_IDS,
    )
  )
    errors.push('track must contain the exact seven phase story sets');
  const byId = new Map((track?.stories ?? []).map((story) => [story.id, story]));
  if (byId.size !== (track?.stories ?? []).length) errors.push('track contains a duplicate story ID');
  const phase = new Map((track?.phases ?? []).flatMap((item) => item.stories.map((id) => [id, item.id])));
  const phasePosition = new Map((track?.phases ?? []).flatMap((item) => item.stories.map((id, index) => [id, index])));
  for (const story of track?.stories ?? []) {
    if (!exactKeys(story, STORY_KEYS)) errors.push(`${story.id} must have exactly the 16 story fields`);
    if (!exists(story.story_file)) {
      errors.push(`${story.id} story file is missing`);
      continue;
    }
    for (const path of story.governing_paths ?? [])
      if (!exists(path)) errors.push(`${story.id} has unresolved governing path ${path}`);
      else if (!/^docs\/(product|redesign\/(design|guidelines))\//.test(path))
        errors.push(`${story.id} governing path is outside active product/design/guidelines authority: ${path}`);
    for (const dep of story.dependencies ?? []) {
      if (!byId.has(dep)) errors.push(`${story.id} depends on unknown story ${dep}`);
      else if (dep === story.id || phase.get(dep) > story.phase)
        errors.push(`${story.id} has non-topological dependency ${dep}`);
      else if (phase.get(dep) === story.phase && phasePosition.get(dep) >= phasePosition.get(story.id))
        errors.push(`${story.id} has same-phase predecessor after its position: ${dep}`);
    }
    if (
      !eqSet(
        (story.dependency_edges ?? []).map((edge) => edge.from),
        story.dependencies ?? [],
      )
    )
      errors.push(`${story.id} dependency edges do not exactly match dependencies`);
    for (const edge of story.dependency_edges ?? [])
      if (
        !edge ||
        !['implementation', 'evidence', 'decision', 'merge'].includes(edge.type) ||
        (edge.split !== undefined && edge.split !== 'semantic-to-provider') ||
        !eqSet(Object.keys(edge), edge.split === undefined ? ['from', 'type'] : ['from', 'type', 'split'])
      )
        errors.push(`${story.id} has invalid dependency edge metadata`);
    const parsed = parseStrictFrontMatter(readText(story.story_file));
    if (parsed.error) errors.push(`${story.id} ${parsed.error}`);
    else if (!exactKeys(parsed.fields, STORY_KEYS))
      errors.push(`${story.id} front matter must use exactly the 16 canonical fields`);
    else if (!exact(parsed.fields, story))
      errors.push(`${story.id} front matter must exactly match all 16 track fields`);
    if (!parsed.error) {
      for (const literal of [...story.stable_ids, ...story.product_routes, ...story.imported_commitments])
        if (
          !new RegExp(`(^|[^A-Z0-9-])${literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Z0-9-])`).test(
            parsed.narrative,
          )
        )
          errors.push(`${story.id} narrative lacks mapped literal ${literal}`);
      for (const heading of HEADINGS) {
        const hits = [
          ...parsed.narrative.matchAll(new RegExp(`^## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'gm')),
        ];
        if (hits.length !== 1) errors.push(`${story.id} must have exactly one ${heading} heading`);
        else {
          const after = parsed.narrative.slice(hits[0].index + hits[0][0].length);
          if (after.slice(0, after.search(/^## /m) < 0 ? undefined : after.search(/^## /m)).trim() === '')
            errors.push(`${story.id} has empty ${heading}`);
        }
      }
    }
  }
  const visiting = new Set();
  const visited = new Set();
  let hasCycle = false;
  function visit(id) {
    if (visiting.has(id)) {
      errors.push(`dependency graph contains cycle at ${id}`);
      hasCycle = true;
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of byId.get(id)?.dependencies ?? []) if (byId.has(dep)) visit(dep);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
  for (const [semantic, provider] of SPLITS)
    if (
      !byId
        .get(provider)
        ?.dependency_edges.some((edge) => edge.from === semantic && edge.split === 'semantic-to-provider')
    )
      errors.push(`mandatory provider split ${semantic}->${provider} is absent`);
  const expectedSplits = [
    ['GF-019', 'GF-020', 'PORT-SOURCE', 'CF-MECH-SOURCE'],
    ['GF-010', 'GF-025', 'PORT-LEDGER', 'CF-MECH-LEDGER'],
    ['GF-013', 'GF-026', 'PORT-ARTIFACT', 'CF-MECH-ARTIFACT'],
    ['GF-033', 'GF-039', 'PORT-WORKSPACE', 'CF-MECH-WORKSPACE'],
    ['GF-042', 'GF-047', 'PORT-VERIFY', 'CF-MECH-VERIFY'],
  ];
  if (
    !Array.isArray(track.mandatory_provider_splits) ||
    track.mandatory_provider_splits.length !== expectedSplits.length
  )
    errors.push('mandatory_provider_splits must contain exactly five fixed rows');
  for (const [semantic, provider, port, suite] of expectedSplits) {
    const row = track.mandatory_provider_splits?.find(
      (item) => item?.semantic_story === semantic && item?.provider_story === provider,
    );
    if (
      !row ||
      row.port !== port ||
      !row.rule.includes(suite) ||
      !byId
        .get(provider)
        ?.dependency_edges.some(
          (edge) => edge.from === semantic && edge.type === 'implementation' && edge.split === 'semantic-to-provider',
        )
    )
      errors.push(
        `mandatory split ${semantic}->${provider} must retain ${port}, ${suite}, and its semantic-to-provider edge`,
      );
  }
  const closure = byId.get('GF-062');
  if (
    !closure ||
    !eqSet(
      closure.dependencies,
      STORY_IDS.filter((id) => id !== 'GF-062'),
    ) ||
    !closure.dependency_edges.every((edge) => edge.type === 'merge')
  )
    errors.push('GF-062 must merge exactly all other 46 stories');
  if (
    !byId.get('GF-023')?.dependency_edges.some((edge) => edge.from === 'GF-025' && edge.type === 'evidence') ||
    !byId.get('GF-023')?.dependency_edges.some((edge) => edge.from === 'GF-026' && edge.type === 'evidence')
  )
    errors.push('GF-023 must have evidence dependencies on GF-025 and GF-026');
  const r03 = {
    'GF-042': {
      required: ['PORT-VERIFY', 'OPC-VERIFY-EXECUTE', 'EV-CHECK-OBSERVATION'],
      forbidden: ['RP-REMOTE', 'PORT-DELIVERY', 'OPC-DEL-OBSERVE', 'EV-TARGET-FACT'],
    },
    'GF-047': {
      required: ['PORT-VERIFY', 'OPC-VERIFY-EXECUTE', 'EV-CHECK-OBSERVATION'],
      forbidden: ['RP-REMOTE', 'PORT-DELIVERY', 'OPC-DEL-OBSERVE', 'EV-TARGET-FACT'],
    },
    'GF-044': {
      required: ['PORT-DELIVERY', 'RP-REMOTE', 'OPC-DEL-OBSERVE', 'EV-TARGET-FACT', 'ID-OP', 'ID-TARGET', 'ID-AUTH'],
      forbidden: [],
    },
    'GF-061': {
      required: ['PORT-DELIVERY', 'RP-REMOTE', 'OPC-DEL-OBSERVE', 'EV-TARGET-FACT', 'ID-OP', 'ID-TARGET', 'ID-AUTH'],
      forbidden: [],
    },
  };
  for (const [id, rule] of Object.entries(r03)) {
    const ids = byId.get(id)?.stable_ids ?? [];
    if (!rule.required.every((value) => ids.includes(value)) || rule.forbidden.some((value) => ids.includes(value)))
      errors.push(`${id} violates R03 local/remote selector separation`);
  }
  if (
    !Array.isArray(track?.critical_path) ||
    track.critical_path.some(
      (id, index) => index > 0 && !byId.get(id)?.dependencies.includes(track.critical_path[index - 1]),
    )
  )
    errors.push('critical_path must be real dependency edges');
  else if (!hasCycle && Array.isArray(track?.critical_path) && track.critical_path.length) {
    const memo = new Map();
    const longest = (id) => {
      if (memo.has(id)) return memo.get(id);
      const value = 1 + Math.max(0, ...(byId.get(id)?.dependencies ?? []).filter((dep) => byId.has(dep)).map(longest));
      memo.set(id, value);
      return value;
    };
    const maximum = Math.max(...STORY_IDS.map(longest));
    if (track.critical_path.length !== maximum)
      errors.push(`critical_path must be an actual maximum-length path of ${maximum} stories`);
  }
  const expectedInventoryIds = {
    runtime_units: 'RT-OPERATOR RT-CONTROLLER RT-LEDGER RT-EVIDENCE RT-REGISTRY RT-WITNESS',
    ports:
      'PORT-CONSUMER PORT-INTAKE PORT-DECIDE PORT-SESSION PORT-WORKSPACE PORT-VERIFY PORT-DELIVERY PORT-LEDGER PORT-ARTIFACT PORT-PUBLISH PORT-SOURCE',
    events:
      'EV-ENVELOPE-SUBMITTED EV-SESSION-RESULT EV-SESSION-VERDICT EV-SESSION-FAULT EV-SESSION-HUMAN-REQUEST EV-SESSION-FACT EV-WORKSPACE-FACT EV-SETUP-FACT EV-WORKSPACE-PRESERVED EV-ARTIFACT-FACT EV-RULE-SURFACE-TOUCHED EV-LIVENESS-OBSERVED EV-CHECK-OBSERVATION EV-TARGET-FACT EV-EFFECT-CERTAINTY EV-LANDING-OBSERVED EV-OWNER-DECISION EV-DELEGATION-GRANT EV-RUN-SUSPEND-DECISION EV-RUN-RESUME-DECISION EV-RUN-TERMINAL-STOP-DECISION EV-RECOVERY-OBSERVATION EV-WAKE-DEPENDENCY EV-WAKE-CAPACITY EV-WAKE-TIMER EV-WAKE-AUTHORITY EV-WAKE-FINALIZATION EV-BOUND-EXHAUSTED EV-OBLIGATION-RESOLVED EV-WAKE-SETTLEMENT EV-NOTICE-ACKNOWLEDGED EV-NOTICE-SNOOZED',
    operations:
      'OPC-SESSION-OPEN OPC-SESSION-RESPOND OPC-SESSION-ASSIGN OPC-SESSION-COLLECT OPC-SESSION-CLOSE OPC-WS-PROVISION OPC-WS-SETUP OPC-WS-OBSERVE OPC-WS-PRESERVE OPC-WS-RETIRE OPC-VERIFY-EXECUTE OPC-REV-PUBLISH OPC-REV-REQUEST OPC-REV-STATUS OPC-REV-COMMENT OPC-REV-RETIRE-REF OPC-REV-RETIRE-REQUEST OPC-REV-RETIRE-STATUS OPC-REV-RETIRE-COMMENT OPC-DEL-ANCHOR OPC-DEL-PUBLISH OPC-DEL-REQUEST OPC-DEL-STATUS OPC-DEL-COMMENT OPC-DEL-MERGE OPC-DEL-OBSERVE OPC-ART-PUT OPC-ART-GET OPC-ART-DISPOSE',
    identities:
      'ID-RUN ID-STORY ID-TXN ID-EVENT ID-OP ID-CAND ID-GEN ID-PRINCIPAL ID-MANIFEST ID-SESSION ID-FINDING ID-GRANT ID-PARK ID-SOURCE-REQ ID-REGISTRY ID-TARGET ID-AUTH ID-EVSUBJ ID-OBLIGATION ID-SETTLEMENT ID-NOTICE ID-EXPORT',
    schema_families:
      'SCH-PLAN SCH-SOURCE-EXCHANGE SCH-WORK-PROFILE SCH-CONFIG-ARTIFACT SCH-SETUP-RECEIPT SCH-RULE-SURFACE SCH-PROVIDER-AUTHORITY SCH-CAPABILITY-PROOF SCH-ENVELOPE SCH-INTAKE-ACK SCH-INTAKE-CUT-CLAIM SCH-LIVENESS SCH-SESSION SCH-CANDIDATE SCH-REGISTRY-RECORD SCH-EVENT SCH-TRANSITION SCH-OPERATION SCH-VERDICT SCH-EVIDENCE SCH-ESCALATION SCH-DELEGATION-GRANT SCH-DECISION SCH-OBLIGATION SCH-SETTLEMENT SCH-NOTICE SCH-AUDIT-EXPORT',
    failure_classes:
      'FC-INPUT FC-AUTHORITY FC-SUBJECT FC-FENCE FC-EVIDENCE FC-MECHANISM FC-EFFECT FC-CAPACITY FC-LIVENESS FC-RULES FC-BOUND FC-TRUST',
    bound_classes:
      'BND-REWORK BND-RETRY BND-REFRESH BND-WAIT-DECISION BND-WAIT-MECHANISM BND-WAIT-CAPACITY BND-WAIT-LEDGER BND-WAIT-TARGET BND-IDLE BND-SILENCE BND-RECOVERY BND-RETIRE',
    wait_progress_surfaces:
      'review_or_rework operation_or_source_retry refresh human_decision mediated_response capacity ledger_acknowledgement target_stability idle_progress session_silence effect_reconciliation retirement_or_stop capability_proof configuration_read finalizer_queue residual_obligation',
    conformance_suites:
      'CF-DETERMINISM CF-ORDERING CF-FENCE CF-BINDING CF-ACCEPTANCE CF-POLICY CF-CAPACITY CF-ORDER CF-RELEASE CF-BLOCKERS CF-CONTAINMENT CF-BOUNDS CF-DOUBLE-EFFECT CF-SEPARATION CF-PRESERVATION CF-TRUST-STOP CF-RULE-SURFACE CF-LIVENESS CF-NOTICE-EXPORT CF-OBSERVABILITY CF-RUN-CONTROL CF-OPERATOR-ACTIONS CF-EVIDENCE-LIFECYCLE CF-SECRET-ABSENCE CF-DELEGATION CF-CONSUMER CF-ENVELOPE CF-PROVIDER-PERMISSION CF-SETUP-FRESHNESS CF-PROVIDER-AUTHORITY CF-BLOCK-SURFACING CF-REVIEW-PUBLICATION CF-MECH-LEDGER CF-MECH-ARTIFACT CF-MECH-SESSION CF-MECH-WORKSPACE CF-MECH-SOURCE CF-MECH-VERIFY CF-MECH-DELIVERY',
  };
  for (const [name, ids] of Object.entries(expectedInventoryIds)) {
    const mapping = track.inventories?.[name];
    if (!mapping || !eqSet(Object.keys(mapping), ids.split(' ')))
      errors.push(`${name} must contain the exact fixed inventory IDs with no wildcard or invented selector`);
    else if (
      !Object.entries(mapping).every(
        ([inventoryId, stories]) =>
          Array.isArray(stories) &&
          stories.length &&
          stories.every((id) => byId.has(id) && byId.get(id).stable_ids.includes(inventoryId)),
      )
    )
      errors.push(`${name} must map every fixed inventory ID forward and reverse to declared story selectors`);
    if (sourceCatalogs[name] && !eqSet(ids.split(' '), sourceCatalogs[name]))
      errors.push(`${name} fixed catalog does not match its active source catalog`);
  }
  if (!eqSet(expectedInventoryIds.ports.split(' '), sourceCatalogs.ports ?? []))
    errors.push('ports fixed catalog does not match runtime plus Work Source active source catalogs');
  if (!eqSet(track.inventories?.cf_gate_product_inputs, expectedInventoryIds.conformance_suites.split(' ')))
    errors.push('CF-GATE-PRODUCT must consume exactly the fixed 39-suite input set');
  const derivedCounts = {
    phases: 7,
    stories: STORY_IDS.length,
    product_routes: 44,
    imported_commitments: 56,
    ...Object.fromEntries(Object.entries(expectedInventoryIds).map(([name, ids]) => [name, ids.split(' ').length])),
    open_delegated_choices: Object.keys(track.delegated_choices?.open ?? {}).length,
  };
  if (!exact(track.counts, derivedCounts))
    errors.push('track counts must be independently recomputed from exact structural sets');
  if (rootDir) {
    const reconciliation = readText('docs/redesign/design/product-guarantee-reconciliation.md');
    const routes = routeRows(reconciliation);
    if (routes.size !== 44 || !eqSet(Object.keys(track.product_routes ?? {}), [...routes.keys()]))
      errors.push('product_routes must contain the exact 44 Round-6 routes');
    for (const [id, proofRoute] of routes)
      if (track.product_routes?.[id]?.proof_route !== proofRoute)
        errors.push(`product_routes.${id}.proof_route must exactly match the Round-6 authority text`);
    for (const id of routes.keys()) {
      const declaredByStories = [...byId.values()]
        .filter((story) => story.product_routes.includes(id))
        .map((story) => story.id);
      if (!eqSet(track.product_routes?.[id]?.stories, declaredByStories))
        errors.push(`product_routes.${id}.stories must exactly equal forward and reverse story route coverage`);
    }
    const imported = tableRows(reconciliation, '## Guarantee 1');
    const dispositions = new Map(imported);
    const records = track.imported_commitments ?? [];
    if (
      records.length !== 56 ||
      !eqSet(
        records.map((row) => row.id),
        [...dispositions.keys()],
      ) ||
      !records.every(
        (row) =>
          exactKeys(row, ['id', 'family', 'disposition', 'stories']) && dispositions.get(row.id) === row.disposition,
      )
    )
      errors.push('imported_commitments must contain the exact 56 authority-matrix ID and disposition records');
    for (const row of records) {
      const declaredByStories = [...byId.values()]
        .filter((story) => story.imported_commitments.includes(row.id))
        .map((story) => story.id);
      if (!eqSet(row.stories, declaredByStories))
        errors.push(`imported commitment ${row.id} must exactly equal forward and reverse story coverage`);
    }
    const reverseCoverage = [...byId.values()].every((story) =>
      story.imported_commitments.every((id) => dispositions.has(id)),
    );
    if (!reverseCoverage) errors.push('imported commitments contain an undeclared story assignment');
    const owners = delegationRegisterOwners(readText('docs/redesign/design/delegation-register.md'));
    const scheduleOwners = deliveryScheduleOwners(readText('docs/delivery/greenfield/decisions.md'));
    for (const [id, choice] of Object.entries(track.delegated_choices?.open ?? {}))
      if (owners.get(id) !== choice.owner)
        errors.push(`delegated_choices.${id}.owner must exactly match the governing delegation register`);
    for (const [id, owner] of owners)
      if (track.delegated_choices?.open?.[id] && scheduleOwners.get(id) !== owner)
        errors.push(`decisions.md ${id} owner must exactly match the governing delegation register`);
    const actual = new Set(allFiles(join(rootDir, 'docs/delivery')).map((path) => relative(rootDir, path)));
    if (!eqSet([...actual], [...deliveryAllowlist()]))
      errors.push('active docs/delivery path set does not match exact allowlist');
    const corpus = ['docs/product', 'docs/redesign/design', 'docs/redesign/guidelines'].flatMap((dir) =>
      allFiles(join(rootDir, dir))
        .filter((path) => path.endsWith('.md'))
        .map((path) => relative(rootDir, path))
        .sort(),
    );
    const rows = corpus.map((path) => `${sha(readText(path))}  ${path}\n`).join('');
    if (corpus.length !== 67 || sha(rows) !== APPROVED_NORMATIVE_CORPUS_SHA256)
      errors.push('live 67-file normative corpus SHA-256 manifest does not match');
  }
  return errors;
}
export function validateDeliveryTrackPackage(rootDir = process.cwd()) {
  const exists = (path) => existsSync(join(rootDir, path));
  const readText = (path) => readFileSync(join(rootDir, path), 'utf8');
  if (!exists(TRACK_PATH)) return ['delivery track is missing'];
  let track;
  try {
    track = JSON.parse(readText(TRACK_PATH));
  } catch (error) {
    return [`delivery track must be strict valid JSON: ${error.message}`];
  }
  return validateDeliveryTrack(track, { exists, readText, rootDir });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = validateDeliveryTrackPackage();
  if (errors.length) {
    console.error('Delivery track validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('Delivery track structural, source, two-way, and corpus validation passed (47 stories, 7 phases).');
    console.log(`Candidate package manifest (unpinned): ${candidatePackageManifest()}`);
  }
}
