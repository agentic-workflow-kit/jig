import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TRACK_PATH = 'docs/delivery/greenfield/track.json';
const STORY_CONTRACT_PATH = 'docs/delivery/greenfield/story-contract.md';

const EXPECTED_STORY_IDS = [
  'GF-001',
  'GF-002',
  'GF-003',
  'GF-004',
  'GF-005',
  'GF-010',
  'GF-011',
  'GF-012',
  'GF-013',
  'GF-014',
  'GF-015',
  'GF-019',
  'GF-020',
  'GF-021',
  'GF-022',
  'GF-023',
  'GF-024',
  'GF-030',
  'GF-031',
  'GF-032',
  'GF-033',
  'GF-034',
  'GF-035',
  'GF-036',
  'GF-037',
  'GF-038',
  'GF-039',
  'GF-040',
  'GF-041',
  'GF-042',
  'GF-043',
  'GF-044',
  'GF-045',
  'GF-046',
  'GF-047',
  'GF-050',
  'GF-051',
  'GF-052',
  'GF-053',
  'GF-054',
  'GF-055',
  'GF-056',
  'GF-060',
  'GF-061',
  'GF-062',
];

const EXPECTED_PHASES = [
  { id: 0, name: 'substrate', stories: ['GF-001', 'GF-002', 'GF-003', 'GF-004', 'GF-005'] },
  { id: 1, name: 'durable core', stories: ['GF-010', 'GF-011', 'GF-012', 'GF-013', 'GF-014', 'GF-015'] },
  { id: 2, name: 'envelope and intake', stories: ['GF-019', 'GF-020', 'GF-021', 'GF-022', 'GF-023', 'GF-024'] },
  {
    id: 3,
    name: 'lifecycle and execution',
    stories: ['GF-030', 'GF-031', 'GF-032', 'GF-033', 'GF-034', 'GF-035', 'GF-036', 'GF-037', 'GF-038', 'GF-039'],
  },
  {
    id: 4,
    name: 'acceptance and delivery',
    stories: ['GF-040', 'GF-041', 'GF-042', 'GF-043', 'GF-044', 'GF-045', 'GF-046', 'GF-047'],
  },
  {
    id: 5,
    name: 'settlement and operator surfaces',
    stories: ['GF-050', 'GF-051', 'GF-052', 'GF-053', 'GF-054', 'GF-055', 'GF-056'],
  },
  { id: 6, name: 'real-provider closure', stories: ['GF-060', 'GF-061', 'GF-062'] },
];

const EXPECTED_BASELINE = {
  current_main_commit: 'b860891d9102e0bdda1d23def81b1b974a4a26ac',
  current_main_tree: '763fa777c62999795fb679cc05a61be1190d93b6',
  passing_subject_commit: '1731251d866b15b63131a0c3c580e7b563226cf3',
  passing_subject_tree: 'dcd0c1f8a5616283cafbcf54694fcd37dd4888c1',
  normative_file_count: 67,
  normative_file_counts: { product: 5, design: 48, guidelines: 14 },
  normative_manifest_sha256: 'fca18fcb768fe11ef00393958077b0f13b8e045d394e9c0e3a9e953925ef632c',
  readiness_gate: 'docs/archive/reviews/2026-07-18-empty-repository-implementation-readiness-gate.md',
  readiness_result: 'PASS — archive authorized',
  current_corpus_relation: 'The 67-file current normative corpus is byte-identical to the passing subject.',
};

const EXPECTED_INVENTORY_IDS = {
  runtime_units: 'RT-OPERATOR RT-CONTROLLER RT-LEDGER RT-EVIDENCE RT-REGISTRY RT-WITNESS'.split(' '),
  ports:
    'PORT-CONSUMER PORT-INTAKE PORT-DECIDE PORT-SESSION PORT-WORKSPACE PORT-VERIFY PORT-DELIVERY PORT-LEDGER PORT-ARTIFACT PORT-PUBLISH PORT-SOURCE'.split(
      ' ',
    ),
  events:
    'EV-ENVELOPE-SUBMITTED EV-SESSION-RESULT EV-SESSION-VERDICT EV-SESSION-FAULT EV-SESSION-HUMAN-REQUEST EV-SESSION-FACT EV-WORKSPACE-FACT EV-SETUP-FACT EV-WORKSPACE-PRESERVED EV-ARTIFACT-FACT EV-RULE-SURFACE-TOUCHED EV-LIVENESS-OBSERVED EV-CHECK-OBSERVATION EV-TARGET-FACT EV-EFFECT-CERTAINTY EV-LANDING-OBSERVED EV-OWNER-DECISION EV-DELEGATION-GRANT EV-RUN-SUSPEND-DECISION EV-RUN-RESUME-DECISION EV-RUN-TERMINAL-STOP-DECISION EV-RECOVERY-OBSERVATION EV-WAKE-DEPENDENCY EV-WAKE-CAPACITY EV-WAKE-TIMER EV-WAKE-AUTHORITY EV-WAKE-FINALIZATION EV-BOUND-EXHAUSTED EV-OBLIGATION-RESOLVED EV-WAKE-SETTLEMENT EV-NOTICE-ACKNOWLEDGED EV-NOTICE-SNOOZED'.split(
      ' ',
    ),
  operations:
    'OPC-SESSION-OPEN OPC-SESSION-RESPOND OPC-SESSION-ASSIGN OPC-SESSION-COLLECT OPC-SESSION-CLOSE OPC-WS-PROVISION OPC-WS-SETUP OPC-WS-OBSERVE OPC-WS-PRESERVE OPC-WS-RETIRE OPC-VERIFY-EXECUTE OPC-REV-PUBLISH OPC-REV-REQUEST OPC-REV-STATUS OPC-REV-COMMENT OPC-REV-RETIRE-REF OPC-REV-RETIRE-REQUEST OPC-REV-RETIRE-STATUS OPC-REV-RETIRE-COMMENT OPC-DEL-ANCHOR OPC-DEL-PUBLISH OPC-DEL-REQUEST OPC-DEL-STATUS OPC-DEL-COMMENT OPC-DEL-MERGE OPC-DEL-OBSERVE OPC-ART-PUT OPC-ART-GET OPC-ART-DISPOSE'.split(
      ' ',
    ),
  identities:
    'ID-RUN ID-STORY ID-TXN ID-EVENT ID-OP ID-CAND ID-GEN ID-PRINCIPAL ID-MANIFEST ID-SESSION ID-FINDING ID-GRANT ID-PARK ID-SOURCE-REQ ID-REGISTRY ID-TARGET ID-AUTH ID-EVSUBJ ID-OBLIGATION ID-SETTLEMENT ID-NOTICE ID-EXPORT'.split(
      ' ',
    ),
  schema_families:
    'SCH-PLAN SCH-SOURCE-EXCHANGE SCH-WORK-PROFILE SCH-CONFIG-ARTIFACT SCH-SETUP-RECEIPT SCH-RULE-SURFACE SCH-PROVIDER-AUTHORITY SCH-CAPABILITY-PROOF SCH-ENVELOPE SCH-INTAKE-ACK SCH-INTAKE-CUT-CLAIM SCH-LIVENESS SCH-SESSION SCH-CANDIDATE SCH-REGISTRY-RECORD SCH-EVENT SCH-TRANSITION SCH-OPERATION SCH-VERDICT SCH-EVIDENCE SCH-ESCALATION SCH-DELEGATION-GRANT SCH-DECISION SCH-OBLIGATION SCH-SETTLEMENT SCH-NOTICE SCH-AUDIT-EXPORT'.split(
      ' ',
    ),
  failure_classes:
    'FC-INPUT FC-AUTHORITY FC-SUBJECT FC-FENCE FC-EVIDENCE FC-MECHANISM FC-EFFECT FC-CAPACITY FC-LIVENESS FC-RULES FC-BOUND FC-TRUST'.split(
      ' ',
    ),
  bound_classes:
    'BND-REWORK BND-RETRY BND-REFRESH BND-WAIT-DECISION BND-WAIT-MECHANISM BND-WAIT-CAPACITY BND-WAIT-LEDGER BND-WAIT-TARGET BND-IDLE BND-SILENCE BND-RECOVERY BND-RETIRE'.split(
      ' ',
    ),
  wait_progress_surfaces:
    'review_or_rework operation_or_source_retry refresh human_decision mediated_response capacity ledger_acknowledgement target_stability idle_progress session_silence effect_reconciliation retirement_or_stop capability_proof configuration_read finalizer_queue residual_obligation'.split(
      ' ',
    ),
  conformance_suites:
    'CF-DETERMINISM CF-ORDERING CF-FENCE CF-BINDING CF-ACCEPTANCE CF-POLICY CF-CAPACITY CF-ORDER CF-RELEASE CF-BLOCKERS CF-CONTAINMENT CF-BOUNDS CF-DOUBLE-EFFECT CF-SEPARATION CF-PRESERVATION CF-TRUST-STOP CF-RULE-SURFACE CF-LIVENESS CF-NOTICE-EXPORT CF-OBSERVABILITY CF-RUN-CONTROL CF-OPERATOR-ACTIONS CF-EVIDENCE-LIFECYCLE CF-SECRET-ABSENCE CF-DELEGATION CF-CONSUMER CF-ENVELOPE CF-PROVIDER-PERMISSION CF-SETUP-FRESHNESS CF-PROVIDER-AUTHORITY CF-BLOCK-SURFACING CF-REVIEW-PUBLICATION CF-MECH-LEDGER CF-MECH-ARTIFACT CF-MECH-SESSION CF-MECH-WORKSPACE CF-MECH-SOURCE CF-MECH-VERIFY CF-MECH-DELIVERY'.split(
      ' ',
    ),
};

const EXPECTED_PRODUCT_ROUTES =
  'PC-README-1 PC-README-2 PC-README-3 PC-JIG-1 PC-JIG-2 PC-JIG-3 PC-JIG-4 PC-JIG-5 PC-JIG-6 PC-JIG-7 PC-JIG-8 PC-JIG-9 PC-JIG-10 PC-JIG-11 PC-JIG-12 PC-JIG-13 PC-JIG-14 PC-JIG-15 PC-JIG-16 PC-JIG-17 PC-JIG-18 PC-JIG-19 PC-JIG-20 PC-JIG-21 PC-JIG-22 PC-JIG-23 PC-JIG-24 PC-JIG-25 PC-CONCEPTS-1 PC-CONCEPTS-2 PC-CONCEPTS-3 PC-CONCEPTS-4 PC-CONCEPTS-5 PC-CONCEPTS-6 PC-CONCEPTS-7 PC-CONCEPTS-8 PC-CONCEPTS-9 PC-USE-1 PC-USE-2 PC-USE-3 PC-USE-4 PC-USE-5 PC-USE-6 PC-USE-7'.split(
    ' ',
  );
const EXPECTED_IMPORTED_COMMITMENTS =
  'FENCE-1 FENCE-2 FENCE-3 EARN-1 EARN-2 GUARD-1 GUARD-2 DOOR-1 DOOR-2 DOOR-3 MERGE-1 MERGE-2 MERGE-3 MERGE-4 MERGE-5 SEC-1 SEC-2 SEC-3 CFG-1 CFG-2 CFG-3 CFG-4 CFG-5 CFG-6 CFG-7 CFG-8 CFG-9 CFG-10 RESUME-1 RESUME-2 RESUME-3 RESUME-4 RESUME-5 ISO-1 ISO-2 ISO-3 ISO-4 LIVE-1 LIVE-2 STACK-1 STACK-2 STACK-3 STACK-4 STACK-5 STACK-6 STACK-7 DRIVE-1 DRIVE-2 DRIVE-3 DRIVE-4 SEE-1 SEE-2 SEE-3 SEE-4 SEE-5 SEE-6'.split(
    ' ',
  );

const EXPECTED_PROVIDER_SPLITS = [
  ['GF-019', 'GF-020', 'PORT-SOURCE', 'CF-MECH-SOURCE'],
  ['GF-033', 'GF-039', 'PORT-WORKSPACE', 'CF-MECH-WORKSPACE'],
  ['GF-042', 'GF-047', 'PORT-VERIFY', 'CF-MECH-VERIFY'],
];
const OPEN_DR_IDS = 'DR-1 DR-2 DR-3 DR-4 DR-5 DR-6 DR-7 DR-8 DR-9 DR-12'.split(' ');
const EXPECTED_OPEN_DR_FIELDS = {
  'DR-1': {
    owner: 'Engineering',
    earliest_story: 'GF-002',
    constraints:
      'Strict versioned JSON, deterministic canonical bytes, runtime validation and golden vectors; reject encoding.',
    evidence: 'Golden vectors and fuzz/property corpus.',
    fallback: 'Reject encoding.',
    blocks: 'Every port and store.',
  },
  'DR-2': {
    owner: 'Engineering',
    earliest_story: 'GF-001/GF-003',
    constraints: 'Private pnpm packages follow dependency/runtime seams without moving authority.',
    evidence: 'Graph/static boundary proof and independent-build fixture.',
    fallback: 'Smallest topology with unchanged authority.',
    blocks: 'GF-005 and all descendants.',
  },
  'DR-3': {
    owner: 'Engineering',
    earliest_story: 'GF-005',
    constraints: 'Pure immutable reducer/selectors and explicit tables; unimplemented transition rejects.',
    evidence: 'Replay and permutation proof.',
    fallback: 'Reject incomplete transition.',
    blocks: 'Control stories.',
  },
  'DR-4': {
    owner: 'Engineering and configuration',
    earliest_story: 'GF-003 then each port',
    constraints:
      'In-process typed semantic ports; transport only at mechanism edge; unavailable provider cannot be reached.',
    evidence: 'CF-MECH-* and authority tests.',
    fallback: 'Provider unavailable.',
    blocks: 'Each port/provider descendant.',
  },
  'DR-5': {
    owner: 'Configuration',
    earliest_story: 'GF-022 then GF-020/GF-039/GF-047/GF-060/GF-061',
    constraints:
      'Initial providers are structured-file source, file stores, local Git workspace, local verifier, Codex sessions, GitHub delivery, and terminal/file notice.',
    evidence: 'Exact real-provider CF-MECH-* and provider gate.',
    fallback: 'Unconfigurable provider.',
    blocks: 'Supported profile and GF-062.',
  },
  'DR-6': {
    owner: 'Engineering',
    earliest_story: 'GF-010/GF-013',
    constraints: 'D11 file stores, separately trusted witness, protected/disposable separation, and FC-TRUST stop.',
    evidence: 'Storage/readback/witness probes.',
    fallback: 'Deliberate stop; never autonomous restore.',
    blocks: 'Recovery and intake.',
  },
  'DR-7': {
    owner: 'Engineering',
    earliest_story: 'GF-054',
    constraints:
      'Private TypeScript SDK with thin CLI and stdio MCP parity; no direct internals/public stability promise.',
    evidence: 'Consumer parity suite.',
    fallback: 'No surface.',
    blocks: 'GF-055, GF-056, GF-062.',
  },
  'DR-8': {
    owner: 'Engineering',
    earliest_story: 'GF-004',
    constraints:
      'Deterministic private testkit, adversarial/property/fault fixtures, and exact CER; absent proof cannot pass.',
    evidence: 'Versioned exact-subject suite result.',
    fallback: 'No claim.',
    blocks: 'Every suite claim.',
  },
  'DR-9': {
    owner: 'Configuration and policy',
    earliest_story: 'GF-021/GF-031/GF-032',
    constraints: 'Approved defaults/ranges and immutable validated profile; out-of-range fails preflight.',
    evidence: 'Boundary probes and profile validation.',
    fallback: 'Preflight reject.',
    blocks: 'Intake and scheduling.',
  },
  'DR-12': {
    owner: 'Engineering and configuration',
    earliest_story: 'GF-019/GF-020/GF-052',
    constraints:
      'Work source and notice implementations use validated PORT-SOURCE exchange and fixed notice derivation.',
    evidence: 'Source/notice port suites.',
    fallback: 'Reject source or retain undelivered notice.',
    blocks: 'Intake and operator profile.',
  },
};
const CLOSED_DR = {
  'DR-10':
    'Closed remediation constraint: provider real limits map into declared hard RC-* capacity; policy may only narrow; misdeclaration becomes bounded mechanism fault.',
  'DR-11':
    'Closed remediation constraint: non-gating Operations are owner-frozen and fail closed by default; authority, acceptance, evidence, landing, and preservation paths are never non-gating.',
};
const REQUIRED_HEADINGS = [
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

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sameSet(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    actual.every((value) => expected.includes(value))
  );
}

function sameArray(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function addExactKeys(errors, value, expected, location) {
  if (!isPlainObject(value) || !sameSet(Object.keys(value), expected)) {
    errors.push(`${location} must have exactly these keys: ${expected.join(', ')}`);
  }
}

function parseFrontMatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    return null;
  }
  const lines = match[1].split('\n');
  const fields = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const field = lines[index].match(/^([a-z_]+):\s*(.*)$/);
    if (!field) {
      continue;
    }
    const [, key, firstValue] = field;
    const values = [firstValue];
    while (index + 1 < lines.length && !/^[a-z_]+:\s*/.test(lines[index + 1])) {
      index += 1;
      values.push(lines[index].trim());
    }
    fields.set(key, values.join(' ').trim());
  }
  return fields;
}

function yamlScalar(value) {
  return value
    .replace(/^(?:"(.*)"|'(.*)')$/, (_whole, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted)
    .trim();
}

function yamlArray(value) {
  const normalized = value.trim().replace(/^\[/, '').replace(/\]$/, '');
  if (normalized === '') {
    return [];
  }
  return normalized
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(yamlScalar);
}

function assertKnownStoryMappings(errors, mapping, location, knownStories) {
  if (!isPlainObject(mapping)) {
    errors.push(`${location} must be an object mapping exact IDs to stories`);
    return;
  }
  for (const [id, stories] of Object.entries(mapping)) {
    if (!Array.isArray(stories) || stories.length === 0) {
      errors.push(`${location}.${id} must map to at least one story`);
      continue;
    }
    for (const story of stories) {
      if (!knownStories.has(story)) {
        errors.push(`${location}.${id} targets unknown story ${story}`);
      }
    }
  }
}

function validateStoryReferences(errors, values, location, knownStories, requireBareStoryIds = false) {
  if (
    !Array.isArray(values) ||
    values.length === 0 ||
    !values.every((value) => typeof value === 'string' && value.trim() !== '')
  ) {
    errors.push(`${location} must be a non-empty list of references`);
    return;
  }
  for (const value of values) {
    if (requireBareStoryIds && !knownStories.has(value)) {
      errors.push(`${location} references unknown story ${value}`);
      continue;
    }
    for (const reference of value.match(/GF-\d{3}/g) ?? []) {
      if (!knownStories.has(reference)) errors.push(`${location} references unknown story ${reference}`);
    }
  }
}

function validateStoryFile(errors, story, readText, exists) {
  if (!exists(story.story_file)) {
    errors.push(`${story.id} story file is missing: ${story.story_file}`);
    return;
  }
  let text;
  try {
    text = readText(story.story_file);
  } catch (error) {
    errors.push(`${story.id} story file cannot be read: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  const frontMatter = parseFrontMatter(text);
  if (!frontMatter) {
    errors.push(`${story.id} story file lacks YAML front matter`);
  } else {
    const expectedFields = {
      id: story.id,
      title: story.title,
      phase: String(story.phase),
    };
    for (const [field, expected] of Object.entries(expectedFields)) {
      if (yamlScalar(frontMatter.get(field) ?? '') !== expected) {
        errors.push(`${story.id} front matter ${field} does not match track metadata`);
      }
    }
    for (const [field, expected] of [
      ['depends_on', story.dependencies],
      ['dr_choices', story.dr_gates],
    ]) {
      if (!sameArray(yamlArray(frontMatter.get(field) ?? ''), expected)) {
        errors.push(`${story.id} front matter ${field} does not match track metadata`);
      }
    }
  }
  for (const heading of REQUIRED_HEADINGS) {
    const pattern = new RegExp(`^## ${heading.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*$`, 'gm');
    const matches = [...text.matchAll(pattern)];
    if (matches.length !== 1) {
      errors.push(`${story.id} must contain exactly one mandatory heading: ${heading}`);
      continue;
    }
    const start = matches[0].index + matches[0][0].length;
    const nextHeading = text.slice(start).search(/^## /m);
    const content = text.slice(start, nextHeading === -1 ? undefined : start + nextHeading).trim();
    if (content.length === 0) {
      errors.push(`${story.id} mandatory heading is empty: ${heading}`);
    }
  }
}

/**
 * Validates an already-parsed delivery track without mutating it or the file system.
 * File access is injected so unit tests can use a temporary package or in-memory reader.
 */
export function validateDeliveryTrack(track, { exists, readText }) {
  const errors = [];
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
  addExactKeys(errors, track, rootKeys, 'track');
  if (!isPlainObject(track)) {
    return errors;
  }
  if (
    track.schema_version !== 1 ||
    track.kind !== 'jig-greenfield-delivery-track' ||
    track.status !== 'planning-baseline; no implementation authorized'
  ) {
    errors.push('track schema_version, kind, or planning status is invalid');
  }
  if (JSON.stringify(track.baseline) !== JSON.stringify(EXPECTED_BASELINE)) {
    errors.push('track baseline constants do not match the fixed approved baseline');
  }
  if (
    !Array.isArray(track.authority_order) ||
    track.authority_order.length !== 5 ||
    !Array.isArray(track.global_definition_of_ready) ||
    !Array.isArray(track.global_definition_of_done) ||
    !isPlainObject(track.universal_constraints)
  ) {
    errors.push('track top-level authority and definition fields have an invalid schema shape');
  }

  const phaseByStory = new Map();
  if (!Array.isArray(track.phases) || track.phases.length !== EXPECTED_PHASES.length) {
    errors.push('track must define exactly seven phases');
  } else {
    for (let index = 0; index < EXPECTED_PHASES.length; index += 1) {
      const actual = track.phases[index];
      const expected = EXPECTED_PHASES[index];
      addExactKeys(errors, actual, ['id', 'name', 'stories', 'exit_gate'], `phase ${index}`);
      if (
        !actual ||
        actual.id !== expected.id ||
        actual.name !== expected.name ||
        !sameArray(actual.stories, expected.stories) ||
        typeof actual.exit_gate !== 'string' ||
        actual.exit_gate.trim() === ''
      ) {
        errors.push(`phase ${expected.id} does not match its fixed ID, name, story set, or exit gate`);
      }
      for (const id of actual?.stories ?? []) {
        phaseByStory.set(id, actual.id);
      }
    }
  }

  const storyIds = Array.isArray(track.stories) ? track.stories.map((story) => story?.id) : [];
  if (!sameSet(storyIds, EXPECTED_STORY_IDS)) {
    errors.push('track stories must be the exact unique 45-story GF ID set');
  }
  const knownStories = new Set(EXPECTED_STORY_IDS);
  const storiesById = new Map();
  for (const story of track.stories ?? []) {
    if (!isPlainObject(story)) {
      errors.push('each story must be an object');
      continue;
    }
    addExactKeys(
      errors,
      story,
      [
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
      ],
      `story ${story.id ?? '<unknown>'}`,
    );
    if (storiesById.has(story.id)) {
      errors.push(`duplicate story ID: ${story.id}`);
      continue;
    }
    storiesById.set(story.id, story);
    if (
      !knownStories.has(story.id) ||
      typeof story.title !== 'string' ||
      story.title.trim() === '' ||
      !Number.isInteger(story.phase) ||
      phaseByStory.get(story.id) !== story.phase ||
      !['S', 'M', 'L', 'S/M'].includes(story.size) ||
      story.story_file !== `docs/delivery/greenfield/stories/${story.id}.md`
    ) {
      errors.push(`${story.id ?? '<unknown>'} has malformed ID, title, phase, size, or story path`);
    }
    if (
      !Array.isArray(story.governing_paths) ||
      story.governing_paths.length === 0 ||
      !story.governing_paths.every((path) => typeof path === 'string' && path.startsWith('docs/') && exists(path)) ||
      !Array.isArray(story.stable_ids) ||
      story.stable_ids.length === 0 ||
      !Array.isArray(story.dr_gates) ||
      !story.dr_gates.every((id) => OPEN_DR_IDS.includes(id)) ||
      typeof story.outcome !== 'string' ||
      story.outcome.trim() === '' ||
      !Array.isArray(story.oracle) ||
      story.oracle.length === 0
    ) {
      errors.push(`${story.id} has malformed required story metadata or an unresolved governing path`);
    }
    if (
      !Array.isArray(story.dependencies) ||
      new Set(story.dependencies).size !== story.dependencies.length ||
      !Array.isArray(story.dependency_edges) ||
      (story.dependencies.length === 0 && story.dependency_edges.length !== 0) ||
      (story.dependencies.length > 0 && story.dependency_edges.length === 0)
    ) {
      errors.push(`${story.id} dependencies and dependency_edges must be well-formed`);
      continue;
    }
    const edgeSources = [];
    for (const edge of story.dependency_edges) {
      if (
        !isPlainObject(edge) ||
        !['implementation', 'evidence', 'decision', 'merge'].includes(edge.type) ||
        typeof edge.from !== 'string' ||
        !sameSet(Object.keys(edge), edge.split === undefined ? ['from', 'type'] : ['from', 'type', 'split'])
      ) {
        errors.push(`${story.id} has a malformed dependency edge`);
        continue;
      }
      if (edge.split !== undefined && edge.split !== 'semantic-to-provider') {
        errors.push(`${story.id} has an unsupported dependency split marker`);
      }
      edgeSources.push(edge.from);
    }
    const aggregateClosureEdges = story.id === 'GF-062' && sameSet(edgeSources, ['all prior stories', 'all 39 suites']);
    if (!aggregateClosureEdges && !sameSet(story.dependencies, edgeSources)) {
      errors.push(`${story.id} dependency IDs do not equal dependency edge sources`);
    }
  }

  for (const story of storiesById.values()) {
    for (const dependency of story.dependencies ?? []) {
      if (!knownStories.has(dependency)) {
        errors.push(`${story.id} depends on unknown story ${dependency}`);
      } else if (dependency === story.id) {
        errors.push(`${story.id} has a self dependency`);
      } else if ((phaseByStory.get(dependency) ?? Infinity) > story.phase) {
        errors.push(`${story.id} depends on later-phase story ${dependency}`);
      }
    }
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) {
      errors.push(`dependency graph contains a cycle at ${id}`);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of storiesById.get(id)?.dependencies ?? []) {
      if (storiesById.has(dependency)) visit(dependency);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of storiesById.keys()) visit(id);

  validateStoryReferences(errors, track.critical_path, 'critical_path', knownStories, true);
  validateStoryReferences(errors, track.parallel_lanes, 'parallel_lanes', knownStories);
  validateStoryReferences(errors, track.gate_edges, 'gate_edges', knownStories);
  if (
    Array.isArray(track.critical_path) &&
    track.critical_path.length > 0 &&
    track.critical_path.every((id) => knownStories.has(id))
  ) {
    for (let index = 1; index < track.critical_path.length; index += 1) {
      const previous = track.critical_path[index - 1];
      const current = track.critical_path[index];
      if (!storiesById.get(current)?.dependencies.includes(previous)) {
        errors.push(`critical_path must use a real dependency edge: ${previous}->${current}`);
      }
    }
    const longestMemo = new Map();
    const longestVisiting = new Set();
    function longestPathTo(id) {
      if (longestMemo.has(id)) return longestMemo.get(id);
      if (longestVisiting.has(id)) return 0;
      longestVisiting.add(id);
      const length =
        1 +
        Math.max(
          0,
          ...(storiesById.get(id)?.dependencies ?? [])
            .filter((dependency) => storiesById.has(dependency))
            .map(longestPathTo),
        );
      longestVisiting.delete(id);
      longestMemo.set(id, length);
      return length;
    }
    const longestLength = Math.max(...EXPECTED_STORY_IDS.map(longestPathTo));
    if (track.critical_path.length !== longestLength) {
      errors.push(`critical_path must be a longest dependency path of ${longestLength} stories (ties allowed)`);
    }
  }

  if (
    !Array.isArray(track.mandatory_provider_splits) ||
    track.mandatory_provider_splits.length !== EXPECTED_PROVIDER_SPLITS.length
  ) {
    errors.push('track must define exactly three mandatory semantic/provider splits');
  } else {
    for (const [semantic, provider, port, suite] of EXPECTED_PROVIDER_SPLITS) {
      const split = track.mandatory_provider_splits.find(
        (candidate) => candidate?.semantic_story === semantic && candidate?.provider_story === provider,
      );
      const providerStory = storiesById.get(provider);
      const splitEdge = providerStory?.dependency_edges?.find(
        (edge) => edge.from === semantic && edge.type === 'implementation' && edge.split === 'semantic-to-provider',
      );
      if (
        !split ||
        split.port !== port ||
        typeof split.rule !== 'string' ||
        !split.rule.includes(suite) ||
        !splitEdge
      ) {
        errors.push(
          `mandatory semantic/provider split ${semantic}->${provider} with ${port}/${suite} evidence metadata is absent`,
        );
      }
    }
  }

  const inventories = track.inventories;
  addExactKeys(
    errors,
    inventories,
    [...Object.keys(EXPECTED_INVENTORY_IDS), 'cf_gate_product_inputs'],
    'track.inventories',
  );
  if (isPlainObject(inventories)) {
    for (const [inventory, expectedIds] of Object.entries(EXPECTED_INVENTORY_IDS)) {
      const mapping = inventories[inventory];
      if (!isPlainObject(mapping) || !sameSet(Object.keys(mapping), expectedIds)) {
        errors.push(`${inventory} must contain its exact fixed ID set`);
      }
      assertKnownStoryMappings(errors, mapping, `inventories.${inventory}`, knownStories);
    }
    if (!sameSet(inventories.cf_gate_product_inputs, EXPECTED_INVENTORY_IDS.conformance_suites)) {
      errors.push('CF-GATE-PRODUCT must consume exactly the fixed 39-suite input set');
    }
  }

  const productRoutesAreExact =
    isPlainObject(track.product_routes) && sameSet(Object.keys(track.product_routes), EXPECTED_PRODUCT_ROUTES);
  if (!productRoutesAreExact) {
    errors.push('product_routes must contain the exact fixed 44 PC routes');
  }
  for (const [route, value] of Object.entries(track.product_routes ?? {})) {
    if (!isPlainObject(value) || !Array.isArray(value.proof) || value.proof.length === 0) {
      errors.push(`product_routes.${route} must have non-empty proof`);
    }
    if (!isPlainObject(value) || !Array.isArray(value.stories) || value.stories.length === 0) {
      errors.push(`product_routes.${route} must map to at least one story`);
    } else {
      for (const story of value.stories)
        if (!knownStories.has(story)) errors.push(`product_routes.${route} targets unknown story ${story}`);
    }
  }
  const productRoutesAreMapped =
    productRoutesAreExact &&
    Object.values(track.product_routes).every(
      (route) =>
        Array.isArray(route.stories) &&
        route.stories.length > 0 &&
        route.stories.every((story) => knownStories.has(story)),
    );
  const cfGateSuiteInputsAreExact =
    isPlainObject(inventories) &&
    sameSet(inventories.cf_gate_product_inputs, EXPECTED_INVENTORY_IDS.conformance_suites);
  if (!cfGateSuiteInputsAreExact || !productRoutesAreMapped) {
    errors.push('CF-GATE-PRODUCT requires the fixed 39-suite input set and all 44 mapped product routes');
  }
  if (!Array.isArray(track.imported_commitments)) {
    errors.push('imported_commitments must be an array');
  } else {
    const importedIds = track.imported_commitments.flatMap((commitment) => commitment?.ids ?? []);
    if (!sameSet(importedIds, EXPECTED_IMPORTED_COMMITMENTS)) {
      errors.push('imported_commitments must contain the exact fixed 56 imported IDs');
    }
    for (const commitment of track.imported_commitments) {
      if (
        !isPlainObject(commitment) ||
        typeof commitment.family !== 'string' ||
        commitment.family === '' ||
        !Array.isArray(commitment.ids) ||
        commitment.ids.length === 0 ||
        !Array.isArray(commitment.stories) ||
        commitment.stories.length === 0
      ) {
        errors.push('each imported commitment family must have non-empty IDs and story mappings');
        continue;
      }
      for (const story of commitment.stories)
        if (!knownStories.has(story))
          errors.push(`imported commitment ${commitment.family} targets unknown story ${story}`);
    }
  }

  const choices = track.delegated_choices;
  addExactKeys(errors, choices, ['open', 'closed'], 'track.delegated_choices');
  if (isPlainObject(choices)) {
    if (!isPlainObject(choices.open) || !sameSet(Object.keys(choices.open), OPEN_DR_IDS)) {
      errors.push('open delegated choices must be exactly DR-1..DR-9 and DR-12');
    }
    for (const [id, choice] of Object.entries(choices.open ?? {})) {
      addExactKeys(
        errors,
        choice,
        ['owner', 'earliest_story', 'constraints', 'alternatives', 'evidence', 'fallback', 'blocks'],
        `delegated_choices.open.${id}`,
      );
      for (const field of ['owner', 'earliest_story', 'constraints', 'evidence', 'fallback', 'blocks']) {
        if (typeof choice?.[field] !== 'string' || choice[field].trim() === '')
          errors.push(`delegated_choices.open.${id}.${field} must be non-empty`);
        if (choice?.[field] !== EXPECTED_OPEN_DR_FIELDS[id]?.[field])
          errors.push(`delegated_choices.open.${id}.${field} must equal its fixed approved value`);
      }
    }
    if (JSON.stringify(choices.closed) !== JSON.stringify(CLOSED_DR)) {
      errors.push('DR-10 and DR-11 are closed fixed constraints and must never be reopened or changed');
    }
  }

  if (exists(STORY_CONTRACT_PATH)) {
    const contract = readText(STORY_CONTRACT_PATH);
    for (const heading of REQUIRED_HEADINGS) {
      if (!contract.includes(`## ${heading}`)) errors.push(`story contract is missing mandatory heading: ${heading}`);
    }
  } else {
    errors.push(`story contract is missing: ${STORY_CONTRACT_PATH}`);
  }
  for (const story of storiesById.values()) validateStoryFile(errors, story, readText, exists);

  const derivedCounts = {
    phases: EXPECTED_PHASES.length,
    stories: EXPECTED_STORY_IDS.length,
    product_routes: EXPECTED_PRODUCT_ROUTES.length,
    imported_commitments: EXPECTED_IMPORTED_COMMITMENTS.length,
    runtime_units: EXPECTED_INVENTORY_IDS.runtime_units.length,
    ports: EXPECTED_INVENTORY_IDS.ports.length,
    events: EXPECTED_INVENTORY_IDS.events.length,
    operations: EXPECTED_INVENTORY_IDS.operations.length,
    identities: EXPECTED_INVENTORY_IDS.identities.length,
    schema_families: EXPECTED_INVENTORY_IDS.schema_families.length,
    failure_classes: EXPECTED_INVENTORY_IDS.failure_classes.length,
    bound_classes: EXPECTED_INVENTORY_IDS.bound_classes.length,
    wait_progress_surfaces: EXPECTED_INVENTORY_IDS.wait_progress_surfaces.length,
    conformance_suites: EXPECTED_INVENTORY_IDS.conformance_suites.length,
    open_delegated_choices: OPEN_DR_IDS.length,
  };
  if (JSON.stringify(track.counts) !== JSON.stringify(derivedCounts)) {
    errors.push('track counts must equal counts independently derived from the fixed exact sets');
  }
  return errors;
}

export function validateDeliveryTrackPackage(rootDir = process.cwd()) {
  const readText = (relativePath) => readFileSync(`${rootDir}/${relativePath}`, 'utf8');
  const exists = (relativePath) => existsSync(`${rootDir}/${relativePath}`);
  if (!exists(TRACK_PATH)) return [`delivery track is missing: ${TRACK_PATH}`];
  let track;
  try {
    track = JSON.parse(readText(TRACK_PATH));
  } catch (error) {
    return [`delivery track must be strict valid JSON: ${error instanceof Error ? error.message : String(error)}`];
  }
  return validateDeliveryTrack(track, { exists, readText });
}

function main() {
  const errors = validateDeliveryTrackPackage();
  if (errors.length > 0) {
    console.error('Delivery track validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('Delivery track validation passed (45 stories, 7 phases, fixed inventories and story contracts).');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
