import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';

const TRACK_PATH = 'docs/delivery/greenfield/track.json';
const STORY_IDS =
  'GF-001 GF-002 GF-003 GF-004 GF-005 GF-010 GF-011 GF-012 GF-013 GF-014 GF-015 GF-019 GF-020 GF-021 GF-022 GF-023 GF-025 GF-026 GF-024 GF-030 GF-031 GF-032 GF-033 GF-034 GF-035 GF-036 GF-037 GF-038 GF-039 GF-040 GF-041 GF-042 GF-043 GF-044 GF-045 GF-046 GF-047 GF-050 GF-051 GF-052 GF-053 GF-054 GF-055 GF-056 GF-057 GF-060 GF-061 GF-062'.split(
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
  'product_routes',
  'imported_commitments',
];
const STORY_AUTHORITY_BINDING_KEYS = [
  'id',
  'governing_paths',
  'stable_ids',
  'dr_gates',
  'product_routes',
  'imported_commitments',
];
const APPROVED_NORMATIVE_CORPUS_SHA256 = 'fca18fcb768fe11ef00393958077b0f13b8e045d394e9c0e3a9e953925ef632c';
const APPROVED_GLOBAL_TRACK_FIELDS_SHA256 = 'dcc06a79538354e7cfd7779c7ff16ab972e87780575a7bf2312c40678469e57f';
const APPROVED_PROVIDER_SPLITS_SHA256 = 'aaac34c0612c51f08d11ab3c467a414966468057a1222def001624bc6ba95834';
const APPROVED_DELEGATED_CHOICES_SHA256 = 'e8fb8713126d05bf59c850606d43af542e6214467e05bdd64402e822b5065746';
const APPROVED_IMPORTED_COMMITMENTS_SHA256 = 'de7bdd92f248de65756a2cb6a2e3cb5d1eb098c8471121f084dd00b9d4f682b6';
const APPROVED_STORY_AUTHORITY_BINDINGS_SHA256 = 'c1545bdfa9547700b8dffb340b2d1bc21c9c4c8fc22a4b2ce2baf206784c6524';
const WAIT_PROGRESS_SURFACES =
  'review_or_rework operation_or_source_retry refresh human_decision mediated_response capacity ledger_acknowledgement target_stability idle_progress session_silence effect_reconciliation retirement_or_stop capability_proof configuration_read finalizer_queue residual_obligation'.split(
    ' ',
  );
const NORMALIZED_WAIT_PROGRESS = new Set(WAIT_PROGRESS_SURFACES);
const REVIEW_PUBLICATION_OPERATIONS =
  'OPC-REV-PUBLISH OPC-REV-REQUEST OPC-REV-STATUS OPC-REV-COMMENT OPC-REV-RETIRE-REF OPC-REV-RETIRE-REQUEST OPC-REV-RETIRE-STATUS OPC-REV-RETIRE-COMMENT'.split(
    ' ',
  );
const FINAL_DELIVERY_OPERATIONS =
  'OPC-DEL-ANCHOR OPC-DEL-PUBLISH OPC-DEL-REQUEST OPC-DEL-STATUS OPC-DEL-COMMENT OPC-DEL-MERGE OPC-DEL-OBSERVE'.split(
    ' ',
  );
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
const PHASES = [
  {
    id: 0,
    name: 'substrate',
    stories: ['GF-001', 'GF-002', 'GF-003', 'GF-004', 'GF-005'],
    exit_gate: 'Hermetic graph and first deterministic replay evidence; no effect path.',
  },
  {
    id: 1,
    name: 'durable core',
    stories: ['GF-010', 'GF-011', 'GF-012', 'GF-013', 'GF-014', 'GF-015'],
    exit_gate:
      'Complete semantic ledger/registry/artifact contracts with scripted fault, recovery, and uncertainty evidence; selected file providers remain unreachable.',
  },
  {
    id: 2,
    name: 'envelope and intake',
    stories: ['GF-019', 'GF-021', 'GF-022', 'GF-020', 'GF-025', 'GF-026', 'GF-023', 'GF-024'],
    exit_gate:
      'Exact source contract/provider, preview and two approvals, qualified proof, and witnessed accepted/rejected acknowledgement; no Run on rejection.',
  },
  {
    id: 3,
    name: 'lifecycle and execution',
    stories: ['GF-030', 'GF-031', 'GF-032', 'GF-033', 'GF-034', 'GF-035', 'GF-036', 'GF-037', 'GF-038', 'GF-039'],
    exit_gate:
      'Scripted intake-to-candidate/rework/park/suspend path, qualified local workspace, bounds/capacity/obligation semantics; no acceptance or landing claim.',
  },
  {
    id: 4,
    name: 'acceptance and delivery',
    stories: ['GF-041', 'GF-040', 'GF-042', 'GF-043', 'GF-044', 'GF-045', 'GF-046', 'GF-047'],
    exit_gate:
      'Scripted E2E for Landed, Blocked, Rejected, and NotRun plus crash points; cleanup cannot alter outcome; Stopped closure remains phase 5.',
  },
  {
    id: 5,
    name: 'settlement and operator surfaces',
    stories: ['GF-050', 'GF-051', 'GF-052', 'GF-053', 'GF-054', 'GF-055', 'GF-056'],
    exit_gate:
      'Both cataloged terminal-entry origins, every preserved Story-state permutation, reconstruction/export, and SDK/CLI/MCP parity evidence.',
  },
  {
    id: 6,
    name: 'real-provider closure',
    stories: ['GF-057', 'GF-060', 'GF-061', 'GF-062'],
    exit_gate:
      "Before the broader supported-profile claim: all supported-provider gates/profile evidence and GF-062's audit of all 56 imported dispositions; CF-GATE-PRODUCT itself is the pure conjunction of the 39 recorded suite results and every named element of the 44 settled product proof routes.",
  },
];
const PARALLEL_LANES = [
  'After GF-004, source-contract/composition and durable-core work may proceed independently.',
  'After GF-010, controller/recovery, registry, and artifact lanes may proceed independently.',
  'After GF-022 plus their respective complete prerequisites, GF-020 (GF-019), GF-025 (GF-010/GF-012), and GF-026 (GF-013) may qualify in parallel before converging at GF-023.',
  "After GF-030 and GF-012, GF-031 may proceed; after GF-031 plus each lane's remaining prerequisites, GF-032 bounds, GF-033 workspace, and GF-034 session lanes may proceed in parallel.",
  'GF-039 can qualify alongside candidate work after GF-033/GF-022.',
  'GF-041 review publication may proceed after GF-015/GF-035; GF-040 acceptance then waits for GF-041 plus its other prerequisites, while GF-042 verification semantics may proceed independently before GF-043 joins GF-040/GF-042; GF-047 qualifies independently of final delivery.',
  'After GF-054, CLI and private MCP lanes may proceed independently.',
  'GF-057, GF-060, and GF-061 qualify independently before GF-062.',
];
const GATE_EDGES = [
  'No port traffic before DR-1 framing.',
  'No implementation dispatch before GF-010, GF-011, and GF-015.',
  "No provider reachability before GF-004, GF-022, and that provider's applicable exact mechanism conformance suite pass.",
  'No Run before the witnessed GF-024 acknowledgement.',
  'No acceptance before GF-040; no landing before GF-043 and GF-044; no cleanup before GF-046.',
  "No product claim before GF-062's CF-GATE-PRODUCT pure conjunction of 39 recorded suite results and every named element of the 44 settled product proof routes; the broader supported-profile claim separately requires provider gates/profile evidence and the 56-import disposition audit.",
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
  const source = Buffer.isBuffer(value) ? value : typeof value === 'string' ? value : canonical(value);
  return createHash('sha256')
    .update(source === undefined ? 'undefined' : source)
    .digest('hex');
}
function readUtf8Text(rootDir, path) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(join(rootDir, path)));
  } catch (error) {
    if (error instanceof TypeError) throw new Error(`${path} is not valid UTF-8 text`);
    throw error;
  }
}
function eqSet(a, b) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    new Set(a).size === a.length &&
    a.every((item) => b.includes(item))
  );
}
function allFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? allFiles(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}
export function normativeCorpusPaths(rootDir) {
  return ['docs/product', 'docs/redesign/design', 'docs/redesign/guidelines'].flatMap((dir) =>
    activeFiles(rootDir, dir)
      .filter((path) => path.endsWith('.md'))
      .sort(),
  );
}
export function normativeCorpusManifest(rootDir = process.cwd()) {
  const paths = normativeCorpusPaths(rootDir);
  const rows = paths.map((path) => `${sha(readFileSync(join(rootDir, path)))}  ${path}\n`).join('');
  return { pathCount: paths.length, digest: sha(rows), paths };
}
function activeFiles(rootDir, path) {
  // Synthetic fixtures without repository metadata deliberately use filesystem enumeration.
  if (!existsSync(join(rootDir, '.git'))) return allFiles(join(rootDir, path)).map((file) => relative(rootDir, file));
  const insideWorkTree = execFileSync('git', ['-C', rootDir, 'rev-parse', '--is-inside-work-tree'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  if (insideWorkTree !== 'true') throw new Error(`${rootDir} has Git metadata but is not a working tree`);
  return execFileSync('git', ['-C', rootDir, 'ls-files', '--cached', '--others', '--exclude-standard', '--', path], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
}
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function assertOwnedRegularFile(rootDir, path) {
  try {
    const root = resolve(rootDir);
    const target = resolve(root, path);
    if (target === root || !target.startsWith(`${root}/`)) throw new Error('outside root');
    const parts = path.split('/');
    let current = root;
    for (const [index, part] of parts.entries()) {
      current = join(current, part);
      const stat = lstatSync(current);
      if (stat.isSymbolicLink()) throw new Error('symlink');
      if (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile()) throw new Error('wrong file type');
    }
    return;
  } catch {
    // Report the same ownership failure for missing, unreadable, and non-file inputs.
  }
  throw new Error(`${path} is not an owned regular file`);
}
function arrayOrEmpty(value, error, errors) {
  if (Array.isArray(value)) return value;
  errors.push(error);
  return [];
}
function stringArrayOrEmpty(value, arrayError, elementError, errors) {
  const items = arrayOrEmpty(value, arrayError, errors);
  if (items.every((item) => typeof item === 'string')) return items;
  errors.push(elementError);
  return items.filter((item) => typeof item === 'string');
}
function nonemptyUniqueStringArray(value, arrayError, elementError, errors) {
  const items = stringArrayOrEmpty(value, arrayError, elementError, errors);
  if (!items.length || items.some((item) => item.trim() === '') || new Set(items).size !== items.length) {
    errors.push(elementError);
  }
  return items.filter((item) => item.trim() !== '');
}
function isCanonicalGoverningPath(path) {
  if (typeof path !== 'string' || path.startsWith('/') || path !== posix.normalize(path) || !path.endsWith('.md'))
    return false;
  return ['docs/product/', 'docs/redesign/design/', 'docs/redesign/guidelines/'].some((prefix) =>
    path.startsWith(prefix),
  );
}
function balancedCollectionEnd(text) {
  const source = text.trim();
  if (!'[{'.includes(source[0])) return -1;
  const stack = [];
  let quote = null;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"') {
      quote = char;
      continue;
    }
    if ('[{'.includes(char)) stack.push(char);
    else if (']}'.includes(char)) {
      const opening = stack.pop();
      if ((char === ']' && opening !== '[') || (char === '}' && opening !== '{')) return -1;
      if (stack.length === 0) return index;
    }
  }
  return -1;
}
function collectBalanced(lines, index, value) {
  let collected = value;
  while (balancedCollectionEnd(collected) === -1 && index + 1 < lines.length) collected += `\n${lines[++index].trim()}`;
  return { index, value: collected };
}
function assertNoDuplicateJsonObjectKeys(value) {
  const stack = [];
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '{') {
      stack.push(new Set());
      continue;
    }
    if (char === '}') {
      stack.pop();
      continue;
    }
    if (char !== '"') continue;
    let end = index + 1;
    let escaped = false;
    while (end < value.length) {
      if (escaped) escaped = false;
      else if (value[end] === '\\') escaped = true;
      else if (value[end] === '"') break;
      end += 1;
    }
    if (end === value.length) return;
    let next = end + 1;
    while (/\s/.test(value[next] ?? '')) next += 1;
    if (value[next] === ':' && stack.length) {
      const key = JSON.parse(value.slice(index, end + 1));
      const keys = stack.at(-1);
      if (keys.has(key)) throw new Error(`duplicate JSON object key ${key}`);
      keys.add(key);
    }
    index = end;
  }
}
function normalizeJsonTrailingCommas(value) {
  let normalized = '';
  let quote = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      normalized += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quote = false;
      continue;
    }
    if (char === '"') {
      quote = true;
      normalized += char;
      continue;
    }
    if (char === ',') {
      let next = index + 1;
      while (/\s/.test(value[next] ?? '')) next += 1;
      const prior = normalized.trimEnd().at(-1);
      if ('}]'.includes(value[next]) && !'[{'.includes(prior)) {
        index = next - 1;
        continue;
      }
    }
    normalized += char;
  }
  return normalized;
}
function jsonWithSupportedTrailingComma(value) {
  assertNoDuplicateJsonObjectKeys(value);
  return JSON.parse(normalizeJsonTrailingCommas(value));
}
function splitInlineParts(value) {
  if (value.trim() === '') return [];
  const parts = [];
  let start = 0;
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"') quote = char;
    else if ('[{'.includes(char)) depth += 1;
    else if (']}'.includes(char)) depth -= 1;
    else if (char === ',' && depth === 0) {
      const part = value.slice(start, index).trim();
      if (part === '') throw new Error('empty inline collection element');
      parts.push(part);
      start = index + 1;
    }
  }
  const final = value.slice(start).trim();
  if (final === '') {
    if (parts.length === 0) throw new Error('empty inline collection element');
  } else parts.push(final);
  return parts;
}
function parseScalar(text) {
  const value = text.trim();
  if (/^".*"$/.test(value)) return JSON.parse(value);
  if (/^[&*!]/.test(value)) throw new Error('uses YAML alias or tag');
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value.startsWith('{') && value.endsWith('}')) {
    try {
      return jsonWithSupportedTrailingComma(value);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('duplicate JSON object key ')) throw error;
      const map = Object.create(null);
      for (const part of splitInlineParts(value.slice(1, -1))) {
        const pair = part.match(/^([a-z_]+):\s*(.*)$/);
        if (!pair) throw new Error('invalid inline map');
        if (Object.hasOwn(map, pair[1])) throw new Error(`duplicates nested front matter field ${pair[1]}`);
        map[pair[1]] = parseScalar(pair[2]);
      }
      return map;
    }
  }
  if (value === '[]') return [];
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      return jsonWithSupportedTrailingComma(value);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('duplicate JSON object key ')) throw error;
      return splitInlineParts(value.slice(1, -1)).map((part) => parseScalar(part));
    }
  }
  return value;
}
function parseStrictFrontMatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { error: 'lacks YAML front matter' };
  const lines = match[1].split('\n');
  const fields = Object.create(null);
  const scalarError = (error, key) => {
    if (!(error instanceof Error)) return `has invalid scalar for ${key}`;
    if (error.message.startsWith('duplicates nested front matter field ')) return error.message;
    if (error.message.startsWith('duplicate JSON object key '))
      return `duplicates nested front matter field ${error.message.slice('duplicate JSON object key '.length)}`;
    if (error.message === 'uses YAML alias or tag') return error.message;
    return `has invalid scalar for ${key}`;
  };
  for (let index = 0; index < lines.length; index += 1) {
    const field = lines[index].match(/^([a-z_]+):\s*(.*)$/);
    if (!field) return { error: `has unsupported YAML line ${index + 1}` };
    const [, key, first] = field;
    if (Object.hasOwn(fields, key)) return { error: `duplicates front matter field ${key}` };
    if (first === '' && lines[index + 1]?.trim().startsWith('[')) {
      const collected = collectBalanced(lines, index + 1, lines[index + 1].trim());
      index = collected.index;
      try {
        fields[key] = parseScalar(collected.value);
      } catch (error) {
        return { error: scalarError(error, key) };
      }
      continue;
    }
    if (first === '') {
      const values = [];
      while (index + 1 < lines.length && /^ {2}- /.test(lines[index + 1])) {
        const item = lines[++index].slice(4);
        if (item === '{') {
          const collected = collectBalanced(lines, index, '{');
          index = collected.index;
          try {
            values.push(parseScalar(collected.value));
          } catch (error) {
            return { error: scalarError(error, key) };
          }
          continue;
        }
        const pair = item.match(/^([a-z_]+):\s*(.*)$/);
        if (!pair)
          try {
            values.push(parseScalar(item));
          } catch (error) {
            return { error: scalarError(error, key) };
          }
        else {
          const entry = Object.create(null);
          try {
            entry[pair[1]] = parseScalar(pair[2]);
          } catch (error) {
            return { error: scalarError(error, key) };
          }
          while (index + 1 < lines.length && /^ {4}[a-z_]+:\s*/.test(lines[index + 1])) {
            const next = lines[++index].trim().match(/^([a-z_]+):\s*(.*)$/);
            if (Object.hasOwn(entry, next[1]))
              return {
                error: `duplicates nested front matter field ${next[1]}`,
              };
            try {
              entry[next[1]] = parseScalar(next[2]);
            } catch (error) {
              return { error: scalarError(error, key) };
            }
          }
          values.push(entry);
        }
      }
      fields[key] = values;
      continue;
    }
    let value = first;
    if ('[{'.includes(value.trim()[0])) {
      const collected = collectBalanced(lines, index, value);
      index = collected.index;
      value = collected.value;
    }
    try {
      fields[key] = parseScalar(value);
    } catch (error) {
      return { error: scalarError(error, key) };
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
function delegationRegisterScopes(text) {
  const scopes = new Map();
  for (const line of text.split('\n')) {
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length >= 2 && /^DR-\d+$/.test(cells[0])) scopes.set(cells[0], cells[1]);
  }
  return scopes;
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
function coverageStoryRows(text, errors) {
  const heading = '## Story metadata to covered items';
  const headings = [...text.matchAll(/^## Story metadata to covered items$/gm)];
  if (headings.length !== 1) {
    errors.push('coverage.md must contain exactly one Story metadata to covered items section');
    return new Map();
  }
  const remainder = text.slice(headings[0].index + heading.length);
  const nextHeading = remainder.search(/^## /m);
  const section = nextHeading === -1 ? remainder : remainder.slice(0, nextHeading);
  const rows = coverageTableRows(section, {
    name: 'Story metadata to covered items',
    headers: ['Story', 'Stable IDs', 'Product routes', 'Imported commitments'],
    errors,
    allowedFirstCells: new Set(STORY_IDS),
    firstCellPattern: /^GF-\d{3}$/,
  });
  const parsed = new Map();
  const cell = (value) => (value.trim() === 'none' ? [] : value.split(',').map((item) => item.trim()));
  for (const [id, stableIds, productRoutes, importedCommitments] of rows) {
    if (parsed.has(id)) errors.push(`coverage.md duplicates story metadata row ${id}`);
    parsed.set(id, {
      stable_ids: cell(stableIds),
      product_routes: cell(productRoutes),
      imported_commitments: cell(importedCommitments),
    });
  }
  if (!eqSet([...parsed.keys()], STORY_IDS)) errors.push('coverage.md must contain the exact 48 story metadata rows');
  return parsed;
}
function coverageSection(text, heading, errors) {
  const headings = [...text.matchAll(new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'gm'))];
  if (headings.length !== 1) {
    errors.push(`coverage.md must contain exactly one ${heading.slice(3)} section`);
    return '';
  }
  const remainder = text.slice(headings[0].index + heading.length);
  const nextHeading = remainder.search(/^## /m);
  return nextHeading === -1 ? remainder : remainder.slice(0, nextHeading);
}
function coverageCell(value) {
  return value.trim() === 'none' ? [] : value.split(',').map((item) => item.trim());
}
function coverageTableRows(
  section,
  { name, headers, errors, allowedFirstCells, firstCellPattern = /^[A-Z][A-Z0-9-]*$/ },
) {
  const tableLines = section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') || line.endsWith('|'));
  if (tableLines.length < 2) {
    errors.push(`coverage.md ${name} table must contain exactly one header and separator`);
    return [];
  }
  const rows = [];
  const seenFirstCells = new Set();
  for (const [index, line] of tableLines.entries()) {
    if (!line.startsWith('|') || !line.endsWith('|')) {
      errors.push(`coverage.md ${name} table has a malformed table-shaped row`);
      continue;
    }
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== headers.length) {
      errors.push(`coverage.md ${name} table has a row with ${cells.length} columns; expected ${headers.length}`);
      continue;
    }
    if (index === 0) {
      if (!exact(cells, headers)) errors.push(`coverage.md ${name} table must contain its exact header once`);
      continue;
    }
    if (index === 1) {
      if (!cells.every((cell) => /^-{3,}$/.test(cell)))
        errors.push(`coverage.md ${name} table must contain its exact separator once`);
      continue;
    }
    if (cells[0].includes('`') || !firstCellPattern.test(cells[0])) {
      errors.push(`coverage.md ${name} table has a noncanonical first cell`);
      continue;
    }
    if (allowedFirstCells && !allowedFirstCells.has(cells[0])) {
      errors.push(`coverage.md ${name} table has an unexpected first cell ${cells[0]}`);
      continue;
    }
    if (seenFirstCells.has(cells[0])) {
      errors.push(`coverage.md ${name} table duplicates first cell ${cells[0]}`);
      continue;
    }
    if (cells.some((cell) => cell === '')) {
      errors.push(`coverage.md ${name} table has an empty cell`);
      continue;
    }
    seenFirstCells.add(cells[0]);
    rows.push(cells);
  }
  return rows;
}
function coverageMatrixRows(text, heading, columns, errors, options = {}) {
  const schemas = {
    '## Product route to story coverage': {
      headers: ['Product route', 'Settled minimal proof route', 'Story coverage'],
      firstCellPattern: /^PC-(?:README|JIG|CONCEPTS|USE)-\d+$/,
    },
    '## Imported commitment to story coverage': {
      headers: ['ID', 'Family', 'Authoritative disposition', 'Story coverage'],
      firstCellPattern: /^[A-Z]+-\d+$/,
    },
    '## Provider gate closure': {
      headers: ['Semantic story', 'Qualified provider story', 'Port', 'Required exact evidence'],
      firstCellPattern: /^GF-\d{3}$/,
      allowedFirstCells: new Set(STORY_IDS),
    },
  };
  const schema = schemas[heading];
  if (!schema || schema.headers.length !== columns) {
    errors.push(`coverage.md ${heading.slice(3)} table validator schema is invalid`);
    return [];
  }
  return coverageTableRows(coverageSection(text, heading, errors), {
    name: heading.slice(3),
    errors,
    ...schema,
    ...options,
  });
}
function storyMappingSection(narrative) {
  const heading = '## Governing paths and stable IDs';
  const start = narrative.indexOf(heading);
  if (start === -1) return '';
  const remainder = narrative.slice(start + heading.length);
  const nextHeading = remainder.search(/^## /m);
  return nextHeading === -1 ? remainder : remainder.slice(0, nextHeading);
}
function containsMappedLiteral(text, literal) {
  return new RegExp(`(^|[^A-Z0-9-])${literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^A-Z0-9-])`).test(text);
}
function delegationScopeMatchesAuthority(scope, authorityText, { strict = false } = {}) {
  const ignored = new Set([
    'below',
    'cannot',
    'choice',
    'content',
    'design',
    'engineering',
    'evidence',
    'every',
    'fixed',
    'inside',
    'owner',
    'recorded',
  ]);
  if (strict) for (const term of ['after', 'provider', 'source', 'delivery', 'implementations']) ignored.add(term);
  const terms = [...new Set((scope.toLowerCase().match(/[a-z]{5,}/g) ?? []).filter((term) => !ignored.has(term)))];
  return terms.filter((term) => new RegExp(`\\b${term}\\b`, 'i').test(authorityText)).length >= 2;
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
    'docs/delivery/greenfield/phase-handoff-template.md',
    'docs/delivery/greenfield/phase-orchestration.md',
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
function candidatePackagePaths() {
  const paths = [
    ...deliveryAllowlist(),
    '.github/workflows/check.yml',
    '.gitignore',
    '.nvmrc',
    '.prettierignore',
    'AGENTS.md',
    'README.md',
    'biome.json',
    'docs/README.md',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'scripts/check-doc-links.mjs',
    'scripts/check-delivery-track.mjs',
    'scripts/check-delivery-track.test.mjs',
    'scripts/check-active-repository.mjs',
    '.agents/skills/orchestrate-phase-delivery/README.md',
    '.agents/skills/orchestrate-phase-delivery/SKILL.md',
    '.agents/skills/orchestrate-phase-delivery/evals/evals.json',
    '.agents/skills/orchestrate-phase-delivery/evals/trigger_queries.json',
    '.agents/skills/orchestrate-phase-delivery/references/phase-protocol.md',
    '.agents/skills/orchestrate-phase-delivery/scripts/validate_evals.py',
  ].sort();
  if (paths.length !== 87 || new Set(paths).size !== paths.length)
    throw new Error(`candidate package manifest requires exactly 87 paths, got ${paths.length}`);
  return paths;
}
export function candidatePackageManifest(rootDir = process.cwd()) {
  const paths = candidatePackagePaths();
  const rows = paths
    .map((path) => {
      assertOwnedRegularFile(rootDir, path);
      const mode = lstatSync(join(rootDir, path)).mode & 0o111 ? '100755' : '100644';
      return `${mode} ${sha(readFileSync(join(rootDir, path)))}  ${path}\n`;
    })
    .join('');
  return sha(rows);
}
export function verifyCandidatePackageManifest(expected, rootDir = process.cwd()) {
  const actual = candidatePackageManifest(rootDir);
  if (actual !== expected) throw new Error(`candidate package manifest mismatch: expected ${expected}, got ${actual}`);
  return actual;
}

export function validateDeliveryTrack(track, { exists, isFile = exists, readText, rootDir }) {
  const errors = [];
  if (!isRecord(track)) return ['track must be an object record'];
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
    sha({
      authority_order: track.authority_order,
      baseline: track.baseline,
      global_definition_of_ready: track.global_definition_of_ready,
      global_definition_of_done: track.global_definition_of_done,
      universal_constraints: track.universal_constraints,
    }) !== APPROVED_GLOBAL_TRACK_FIELDS_SHA256
  )
    errors.push('immutable authority and global-definition fields must exactly preserve their approved values');
  if (sha(track.mandatory_provider_splits) !== APPROVED_PROVIDER_SPLITS_SHA256)
    errors.push('mandatory_provider_splits must exactly preserve every row and rule');
  if (sha(track.delegated_choices) !== APPROVED_DELEGATED_CHOICES_SHA256)
    errors.push('delegated_choices must exactly preserve open and closed decision records');
  if (sha(track.imported_commitments) !== APPROVED_IMPORTED_COMMITMENTS_SHA256)
    errors.push('imported_commitments must exactly preserve authority family semantics');
  const stories = arrayOrEmpty(track?.stories, 'track stories must be an array', errors);
  if (!Array.isArray(track?.stories)) return [...new Set(errors)];
  const hasExactStorySet = eqSet(
    stories.map((story) => story?.id),
    STORY_IDS,
  );
  if (!hasExactStorySet) errors.push('track must contain the exact 48 story IDs');
  if (!exact(track?.phases, PHASES))
    errors.push('track phases must exactly preserve all seven IDs, names, ordered story sets, and exit gates');
  if (!exact(track?.parallel_lanes, PARALLEL_LANES))
    errors.push('parallel_lanes must exactly preserve the approved parallel start and convergence rules');
  if (!exact(track?.gate_edges, GATE_EDGES))
    errors.push('gate_edges must exactly preserve the approved sequencing and product-claim stop lines');
  const storyRecords = stories.filter(isRecord);
  if (storyRecords.length !== stories.length) errors.push('track stories must contain only object records');
  const storyIds = storyRecords.map((story) => story.id);
  if (new Set(storyIds).size !== storyIds.length) errors.push('track contains a duplicate story ID');
  const byId = new Map(storyRecords.filter((story) => STORY_IDS.includes(story.id)).map((story) => [story.id, story]));
  const storyAuthorityBindings = STORY_IDS.map((id) => {
    const story = byId.get(id) ?? {};
    return Object.fromEntries(STORY_AUTHORITY_BINDING_KEYS.map((key) => [key, story[key]]));
  });
  if (sha(storyAuthorityBindings) !== APPROVED_STORY_AUTHORITY_BINDINGS_SHA256)
    errors.push('story authority bindings must exactly preserve approved per-story mappings');
  const phaseRows = Array.isArray(track?.phases) ? track.phases : [];
  const phase = new Map(
    phaseRows.flatMap((item) => (Array.isArray(item?.stories) ? item.stories.map((id) => [id, item.id]) : [])),
  );
  const phasePosition = new Map(
    phaseRows.flatMap((item) => (Array.isArray(item?.stories) ? item.stories.map((id, index) => [id, index]) : [])),
  );
  const authorityRoutes = rootDir
    ? new Set(routeRows(readText('docs/redesign/design/product-guarantee-reconciliation.md')).keys())
    : new Set();
  const authorityPaths = new Set(rootDir ? normativeCorpusPaths(rootDir) : []);
  const authorityStableIds = new Set(
    [...authorityPaths].flatMap(
      (path) => readText(path).match(/\b(?:[A-Z]{2,}-[A-Z0-9-]+|[DI]\d+|[a-z]+(?:_[a-z]+)+)\b/g) ?? [],
    ),
  );
  const delegationScopes = rootDir
    ? delegationRegisterScopes(readText('docs/redesign/design/delegation-register.md'))
    : new Map();
  for (const story of storyRecords) {
    if (!exactKeys(story, STORY_KEYS)) errors.push(`${story.id} must have exactly the 15 story fields`);
    if (typeof story.title !== 'string' || story.title.trim() === '')
      errors.push(`${story.id} title must be a nonempty string`);
    if (typeof story.outcome !== 'string' || story.outcome.trim() === '')
      errors.push(`${story.id} outcome must be a nonempty string`);
    if (story.status !== 'proposed') errors.push(`${story.id} status must be proposed`);
    const governingPaths = nonemptyUniqueStringArray(
      story.governing_paths,
      `${story.id} governing_paths must be an array`,
      `${story.id} governing_paths must be a nonempty unique string array`,
      errors,
    );
    const dependencies = stringArrayOrEmpty(
      story.dependencies,
      `${story.id} dependencies must be an array`,
      `${story.id} dependencies must contain only strings`,
      errors,
    );
    const dependencyEdges = arrayOrEmpty(
      story.dependency_edges,
      `${story.id} dependency_edges must be an array`,
      errors,
    );
    if (!dependencyEdges.every(isRecord)) {
      errors.push(`${story.id} dependency_edges must contain only object records`);
      errors.push(`${story.id} has invalid dependency edge metadata`);
    }
    const dependencyEdgeRecords = dependencyEdges.filter(isRecord);
    const stableIds = stringArrayOrEmpty(
      story.stable_ids,
      `${story.id} stable_ids must be an array`,
      `${story.id} stable_ids must contain only strings`,
      errors,
    );
    const productRoutes = stringArrayOrEmpty(
      story.product_routes,
      `${story.id} product_routes must be an array`,
      `${story.id} product_routes must contain only strings`,
      errors,
    );
    const importedCommitments = stringArrayOrEmpty(
      story.imported_commitments,
      `${story.id} imported_commitments must be an array`,
      `${story.id} imported_commitments must contain only strings`,
      errors,
    );
    nonemptyUniqueStringArray(
      story.oracle,
      `${story.id} oracle must be an array`,
      `${story.id} oracle must be a nonempty unique string array`,
      errors,
    );
    const drGates = nonemptyUniqueStringArray(
      story.dr_gates,
      `${story.id} dr_gates must be an array`,
      `${story.id} dr_gates must be a nonempty unique string array`,
      errors,
    );
    const allowedDrGates = new Set(['DR-1', 'DR-2', 'DR-3', 'DR-4', 'DR-5', 'DR-6', 'DR-7', 'DR-8', 'DR-9', 'DR-12']);
    if (drGates.some((id) => !allowedDrGates.has(id))) errors.push(`${story.id} dr_gates must use only open DR IDs`);
    if (rootDir && stableIds.some((id) => !authorityStableIds.has(id) && !NORMALIZED_WAIT_PROGRESS.has(id)))
      errors.push(`${story.id} stable_ids contains an unknown governing literal`);
    if (rootDir && productRoutes.some((id) => !authorityRoutes.has(id)))
      errors.push(`${story.id} product_routes contains an unknown governing route`);
    if (!['S', 'M', 'L'].includes(story.size)) errors.push(`${story.id} size must be one of S, M, or L`);
    if (phase.get(story.id) !== story.phase)
      errors.push(`${story.id} phase must exactly match its containing phase record`);
    if (typeof story.story_file !== 'string') {
      errors.push(`${story.id} story_file must be a string`);
      continue;
    }
    if (story.story_file !== `docs/delivery/greenfield/stories/${story.id}.md`) {
      errors.push(`${story.id} story_file must equal its canonical confined path`);
      continue;
    }
    for (const path of governingPaths)
      if (!isCanonicalGoverningPath(path))
        errors.push(`${story.id} governing path must be a canonical active authority Markdown path: ${path}`);
      else if (!authorityPaths.has(path) || !isFile(path))
        errors.push(`${story.id} has unresolved governing path ${path}`);
    for (const dep of dependencies) {
      if (!byId.has(dep)) errors.push(`${story.id} depends on unknown story ${dep}`);
      else if (dep === story.id || phase.get(dep) > story.phase)
        errors.push(`${story.id} has non-topological dependency ${dep}`);
      else if (phase.get(dep) === story.phase && phasePosition.get(dep) >= phasePosition.get(story.id))
        errors.push(`${story.id} has same-phase predecessor after its position: ${dep}`);
    }
    if (
      !eqSet(
        dependencyEdgeRecords.map((edge) => edge.from),
        dependencies,
      )
    )
      errors.push(`${story.id} dependency edges do not exactly match dependencies`);
    for (const edge of dependencyEdgeRecords)
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
      errors.push(`${story.id} front matter must use exactly the 15 canonical fields`);
    else if (!exact(parsed.fields, story))
      errors.push(`${story.id} front matter must exactly match all 15 track fields`);
    if (!parsed.error) {
      const mappingSection = storyMappingSection(parsed.narrative);
      const resolvedGoverningPaths = governingPaths.filter(
        (path) => isCanonicalGoverningPath(path) && authorityPaths.has(path) && isFile(path),
      );
      const authorityText = resolvedGoverningPaths.map((path) => readText(path)).join('\n');
      const hasDirectStableAuthorityAnchor = stableIds.some((literal) => containsMappedLiteral(authorityText, literal));
      const hasDelegationScopeAuthorityAnchor = drGates.some(
        (literal) =>
          delegationScopes.has(literal) &&
          delegationScopeMatchesAuthority(delegationScopes.get(literal), authorityText, { strict: true }),
      );
      const isMachineMappedInventoryLiteral = (literal) =>
        Object.entries(track.inventories ?? {}).some(
          ([, selectors]) => Array.isArray(selectors?.[literal]) && selectors[literal].includes(story.id),
        );
      const hasStableAuthorityMapping = (literal) =>
        containsMappedLiteral(authorityText, literal) ||
        isMachineMappedInventoryLiteral(literal) ||
        (delegationScopes.has(literal) &&
          delegationScopeMatchesAuthority(delegationScopes.get(literal), authorityText)) ||
        (!literal.startsWith('DR-') &&
          authorityStableIds.has(literal) &&
          containsMappedLiteral(mappingSection, literal));
      const unmappedNarrativeLiterals = [...stableIds, ...productRoutes, ...importedCommitments].filter(
        (literal) => !containsMappedLiteral(parsed.narrative, literal),
      );
      for (const literal of unmappedNarrativeLiterals)
        errors.push(`${story.id} narrative lacks mapped literal ${literal}`);
      if (!stableIds.every(hasStableAuthorityMapping) || unmappedNarrativeLiterals.length > 0)
        errors.push(
          `${story.id} governing paths must explicitly map every claimed stable ID, product route, and import`,
        );
      if (!hasDirectStableAuthorityAnchor && !hasDelegationScopeAuthorityAnchor)
        errors.push(`${story.id} governing paths must anchor a claimed stable ID or DR delegation scope`);
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
    const dependencies = Array.isArray(byId.get(id)?.dependencies) ? byId.get(id).dependencies : [];
    for (const dep of dependencies) if (byId.has(dep)) visit(dep);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
  const expectedSplits = [
    ['GF-019', 'GF-020', 'PORT-SOURCE', 'CF-MECH-SOURCE'],
    ['GF-010', 'GF-025', 'PORT-LEDGER', 'CF-MECH-LEDGER'],
    ['GF-013', 'GF-026', 'PORT-ARTIFACT', 'CF-MECH-ARTIFACT'],
    ['GF-033', 'GF-039', 'PORT-WORKSPACE', 'CF-MECH-WORKSPACE'],
    ['GF-042', 'GF-047', 'PORT-VERIFY', 'CF-MECH-VERIFY'],
    ['GF-034', 'GF-060', 'PORT-SESSION', 'CF-MECH-SESSION'],
    ['GF-041', 'GF-057', 'PORT-DELIVERY', 'CF-MECH-DELIVERY'],
    ['GF-044', 'GF-061', 'PORT-DELIVERY', 'CF-MECH-DELIVERY'],
  ];
  const mandatoryProviderSplits = arrayOrEmpty(
    track?.mandatory_provider_splits,
    'mandatory_provider_splits must be an array',
    errors,
  );
  if (mandatoryProviderSplits.length !== expectedSplits.length)
    errors.push('mandatory_provider_splits must contain exactly eight fixed rows');
  for (const [semantic, provider, port, suite] of expectedSplits) {
    const row = mandatoryProviderSplits.find(
      (item) => item?.semantic_story === semantic && item?.provider_story === provider,
    );
    const providerEdges = arrayOrEmpty(
      byId.get(provider)?.dependency_edges,
      `${provider} dependency_edges must be an array`,
      errors,
    );
    if (
      !row ||
      row.port !== port ||
      typeof row.rule !== 'string' ||
      !row.rule.includes(suite) ||
      !providerEdges.some(
        (edge) => edge?.from === semantic && edge.type === 'implementation' && edge.split === 'semantic-to-provider',
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
    !arrayOrEmpty(closure?.dependency_edges, 'GF-062 dependency_edges must be an array', errors).every(
      (edge) => edge?.type === 'merge',
    )
  )
    errors.push('GF-062 must merge exactly all other 47 stories');
  if (
    !arrayOrEmpty(byId.get('GF-023')?.dependency_edges, 'GF-023 dependency_edges must be an array', errors).some(
      (edge) => edge?.from === 'GF-025' && edge.type === 'evidence',
    ) ||
    !arrayOrEmpty(byId.get('GF-023')?.dependency_edges, 'GF-023 dependency_edges must be an array', errors).some(
      (edge) => edge?.from === 'GF-026' && edge.type === 'evidence',
    )
  )
    errors.push('GF-023 must have evidence dependencies on GF-025 and GF-026');
  const gf040Dependencies = arrayOrEmpty(
    byId.get('GF-040')?.dependencies,
    'GF-040 dependencies must be an array',
    errors,
  );
  const gf040Edges = arrayOrEmpty(
    byId.get('GF-040')?.dependency_edges,
    'GF-040 dependency_edges must be an array',
    errors,
  );
  const gf041Dependencies = arrayOrEmpty(
    byId.get('GF-041')?.dependencies,
    'GF-041 dependencies must be an array',
    errors,
  );
  if (
    !gf040Dependencies.includes('GF-041') ||
    !gf040Edges.some((edge) => edge?.from === 'GF-041' && edge.type === 'implementation') ||
    gf041Dependencies.includes('GF-040')
  )
    errors.push('GF-041 review publication must precede and provide an implementation dependency to GF-040 acceptance');
  const gf043Dependencies = arrayOrEmpty(
    byId.get('GF-043')?.dependencies,
    'GF-043 dependencies must be an array',
    errors,
  );
  const gf043Ids = arrayOrEmpty(byId.get('GF-043')?.stable_ids, 'GF-043 stable_ids must be an array', errors);
  if (
    !['GF-040', 'GF-042'].every((id) => gf043Dependencies.includes(id)) ||
    !['PORT-VERIFY', 'OPC-VERIFY-EXECUTE', 'EV-CHECK-OBSERVATION'].every((id) => gf043Ids.includes(id))
  )
    errors.push(
      'GF-043 must integrate accepted-subject finalization entry with deterministic verification authorization',
    );
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
      required: [
        'PORT-DELIVERY',
        'RP-REMOTE',
        'OPC-DEL-ANCHOR',
        'OPC-DEL-PUBLISH',
        'OPC-DEL-REQUEST',
        'OPC-DEL-STATUS',
        'OPC-DEL-COMMENT',
        'OPC-DEL-MERGE',
        'OPC-DEL-OBSERVE',
        'EV-TARGET-FACT',
        'ID-OP',
        'ID-TARGET',
        'ID-AUTH',
      ],
      forbidden: [],
    },
  };
  for (const [id, rule] of Object.entries(r03)) {
    const ids = arrayOrEmpty(byId.get(id)?.stable_ids, `${id} stable_ids must be an array`, errors);
    if (!rule.required.every((value) => ids.includes(value)) || rule.forbidden.some((value) => ids.includes(value)))
      errors.push(`${id} violates R03 local/remote selector separation`);
  }
  const operationFamilyRules = {
    'GF-041': {
      required: REVIEW_PUBLICATION_OPERATIONS,
      forbidden: FINAL_DELIVERY_OPERATIONS,
      error: 'GF-041 violates exact review-publication operation-family ownership',
    },
    'GF-057': {
      required: REVIEW_PUBLICATION_OPERATIONS,
      forbidden: FINAL_DELIVERY_OPERATIONS,
      error: 'GF-057 violates exact review-publication operation-family ownership',
    },
    'GF-044': {
      required: FINAL_DELIVERY_OPERATIONS,
      forbidden: REVIEW_PUBLICATION_OPERATIONS,
      error: 'GF-044 violates exact final-delivery operation-family ownership',
    },
    'GF-061': {
      required: FINAL_DELIVERY_OPERATIONS,
      forbidden: REVIEW_PUBLICATION_OPERATIONS,
      error: 'GF-061 violates exact final-delivery operation-family ownership',
    },
    'GF-042': {
      required: [],
      forbidden: [...REVIEW_PUBLICATION_OPERATIONS, ...FINAL_DELIVERY_OPERATIONS],
      error: 'GF-042 violates verify-only operation-family ownership',
    },
    'GF-047': {
      required: [],
      forbidden: [...REVIEW_PUBLICATION_OPERATIONS, ...FINAL_DELIVERY_OPERATIONS],
      error: 'GF-047 violates verify-only operation-family ownership',
    },
  };
  for (const [id, rule] of Object.entries(operationFamilyRules)) {
    const ids = arrayOrEmpty(byId.get(id)?.stable_ids, `${id} stable_ids must be an array`, errors);
    if (!rule.required.every((value) => ids.includes(value)) || rule.forbidden.some((value) => ids.includes(value)))
      errors.push(rule.error);
  }
  if (!Array.isArray(track?.critical_path) || track.critical_path.length === 0)
    errors.push('critical_path must be a nonempty actual maximum-length path');
  else if (
    track.critical_path.some(
      (id, index) =>
        index > 0 &&
        !arrayOrEmpty(byId.get(id)?.dependencies, `${id} dependencies must be an array`, errors).includes(
          track.critical_path[index - 1],
        ),
    )
  )
    errors.push('critical_path must be real dependency edges');
  else if (!hasCycle && Array.isArray(track?.critical_path) && track.critical_path.length) {
    const memo = new Map();
    const longest = (id) => {
      if (memo.has(id)) return memo.get(id);
      const value =
        1 +
        Math.max(
          0,
          ...arrayOrEmpty(byId.get(id)?.dependencies, `${id} dependencies must be an array`, errors)
            .filter((dep) => byId.has(dep))
            .map(longest),
        );
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
    wait_progress_surfaces: WAIT_PROGRESS_SURFACES.join(' '),
    conformance_suites:
      'CF-DETERMINISM CF-ORDERING CF-FENCE CF-BINDING CF-ACCEPTANCE CF-POLICY CF-CAPACITY CF-ORDER CF-RELEASE CF-BLOCKERS CF-CONTAINMENT CF-BOUNDS CF-DOUBLE-EFFECT CF-SEPARATION CF-PRESERVATION CF-TRUST-STOP CF-RULE-SURFACE CF-LIVENESS CF-NOTICE-EXPORT CF-OBSERVABILITY CF-RUN-CONTROL CF-OPERATOR-ACTIONS CF-EVIDENCE-LIFECYCLE CF-SECRET-ABSENCE CF-DELEGATION CF-CONSUMER CF-ENVELOPE CF-PROVIDER-PERMISSION CF-SETUP-FRESHNESS CF-PROVIDER-AUTHORITY CF-BLOCK-SURFACING CF-REVIEW-PUBLICATION CF-MECH-LEDGER CF-MECH-ARTIFACT CF-MECH-SESSION CF-MECH-WORKSPACE CF-MECH-SOURCE CF-MECH-VERIFY CF-MECH-DELIVERY',
  };
  if (
    !isRecord(track.inventories) ||
    !exactKeys(track.inventories, [...Object.keys(expectedInventoryIds), 'cf_gate_product_inputs'])
  )
    errors.push('inventories must have exactly the fixed mapping families plus cf_gate_product_inputs');
  for (const [name, ids] of Object.entries(expectedInventoryIds)) {
    const mapping = track.inventories?.[name];
    if (!mapping || !eqSet(Object.keys(mapping), ids.split(' ')))
      errors.push(`${name} must contain the exact fixed inventory IDs with no wildcard or invented selector`);
    else if (
      !Object.entries(mapping).every(([inventoryId, stories]) => {
        const declaredByStories = [...byId.values()]
          .filter((story) => Array.isArray(story.stable_ids) && story.stable_ids.includes(inventoryId))
          .map((story) => story.id);
        return Array.isArray(stories) && stories.length && eqSet(stories, declaredByStories);
      })
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
    const coverage = readText('docs/delivery/greenfield/coverage.md');
    const coverageRows = coverageStoryRows(coverage, errors);
    for (const story of byId.values()) {
      const row = coverageRows.get(story.id);
      if (
        !row ||
        !eqSet(row.stable_ids, story.stable_ids) ||
        !eqSet(row.product_routes, story.product_routes) ||
        !eqSet(row.imported_commitments, story.imported_commitments)
      )
        errors.push(`coverage.md story row ${story.id} must exactly match track metadata in both directions`);
    }
    const reconciliation = readText('docs/redesign/design/product-guarantee-reconciliation.md');
    const routes = routeRows(reconciliation);
    const productRouteRecords = isRecord(track.product_routes) ? track.product_routes : Object.create(null);
    if (!isRecord(track.product_routes)) errors.push('product_routes must be an object record');
    if (routes.size !== 44 || !eqSet(Object.keys(productRouteRecords), [...routes.keys()]))
      errors.push('product_routes must contain the exact 44 Round-6 routes');
    for (const [id, proofRoute] of routes)
      if (
        !exactKeys(productRouteRecords[id], ['stories', 'proof_route']) ||
        productRouteRecords[id].proof_route !== proofRoute
      )
        errors.push(`product_routes.${id}.proof_route must exactly match the Round-6 authority text`);
    for (const id of routes.keys()) {
      const declaredByStories = [...byId.values()]
        .filter((story) => Array.isArray(story.product_routes) && story.product_routes.includes(id))
        .map((story) => story.id);
      if (!eqSet(productRouteRecords[id]?.stories, declaredByStories))
        errors.push(`product_routes.${id}.stories must exactly equal forward and reverse story route coverage`);
    }
    const productRouteCoverage = coverageMatrixRows(coverage, '## Product route to story coverage', 3, errors, {
      allowedFirstCells: new Set(routes.keys()),
    });
    const productRouteCoverageById = new Map(
      productRouteCoverage.map(([id, proofRoute, stories]) => [id, { proofRoute, stories }]),
    );
    if (
      productRouteCoverage.length !== routes.size ||
      productRouteCoverageById.size !== productRouteCoverage.length ||
      !eqSet([...productRouteCoverageById.keys()], [...routes.keys()]) ||
      [...routes.keys()].some(
        (id) =>
          productRouteCoverageById.get(id)?.proofRoute !== productRouteRecords[id]?.proof_route ||
          !eqSet(coverageCell(productRouteCoverageById.get(id)?.stories ?? ''), productRouteRecords[id]?.stories ?? []),
      )
    )
      errors.push('coverage.md product-route matrix must exactly match track product-route coverage');
    const imported = tableRows(reconciliation, '## Guarantee 1');
    const dispositions = new Map(imported);
    const importedCommitments = arrayOrEmpty(
      track.imported_commitments,
      'imported_commitments must be an array',
      errors,
    );
    if (!importedCommitments.every(isRecord)) errors.push('imported_commitments must contain only object records');
    const records = importedCommitments.filter(isRecord);
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
      const rowStories = stringArrayOrEmpty(
        row.stories,
        `imported commitment ${row.id} stories must be an array`,
        `imported commitment ${row.id} stories must contain only strings`,
        errors,
      );
      const declaredByStories = [...byId.values()]
        .filter((story) => Array.isArray(story.imported_commitments) && story.imported_commitments.includes(row.id))
        .map((story) => story.id);
      if (!eqSet(rowStories, declaredByStories))
        errors.push(`imported commitment ${row.id} must exactly equal forward and reverse story coverage`);
    }
    const reverseCoverage = [...byId.values()].every(
      (story) =>
        Array.isArray(story.imported_commitments) && story.imported_commitments.every((id) => dispositions.has(id)),
    );
    if (!reverseCoverage) errors.push('imported commitments contain an undeclared story assignment');
    const importedCoverage = coverageMatrixRows(coverage, '## Imported commitment to story coverage', 4, errors, {
      allowedFirstCells: new Set(records.map((row) => row.id)),
    });
    const importedCoverageById = new Map(
      importedCoverage.map(([id, family, disposition, stories]) => [id, { family, disposition, stories }]),
    );
    const importedRecordsById = new Map(records.map((row) => [row.id, row]));
    if (
      importedCoverage.length !== records.length ||
      importedCoverageById.size !== importedCoverage.length ||
      !eqSet([...importedCoverageById.keys()], [...importedRecordsById.keys()]) ||
      [...importedRecordsById.keys()].some((id) => {
        const rendered = importedCoverageById.get(id);
        const expected = importedRecordsById.get(id);
        return (
          rendered?.family !== expected.family ||
          rendered?.disposition.replaceAll('`', '') !== expected.disposition ||
          !eqSet(coverageCell(rendered?.stories ?? ''), expected.stories)
        );
      })
    )
      errors.push('coverage.md imported-commitment matrix must exactly match track imported-commitment coverage');
    const inventoryCoverage = coverageSection(coverage, '## Inventory item to story coverage', errors);
    const inventoryHeadings = {
      runtime_units: '### runtime units',
      ports: '### ports',
      events: '### events',
      operations: '### operations',
      identities: '### identities',
      schema_families: '### schema families',
      failure_classes: '### failure classes',
      bound_classes: '### bound classes',
      wait_progress_surfaces: '### wait/progress surfaces',
      conformance_suites: '### conformance suites',
    };
    for (const [name, heading] of Object.entries(inventoryHeadings)) {
      const start = inventoryCoverage.indexOf(heading);
      const remainder = start === -1 ? '' : inventoryCoverage.slice(start + heading.length);
      const nextHeading = remainder.search(/^### /m);
      const expected = track.inventories?.[name] ?? {};
      const rows = coverageTableRows(nextHeading === -1 ? remainder : remainder.slice(0, nextHeading), {
        name: heading.slice(4),
        headers: ['Exact item', 'Stories'],
        errors,
        allowedFirstCells: new Set(Object.keys(expected)),
        firstCellPattern: name === 'wait_progress_surfaces' ? /^[a-z]+(?:_[a-z]+)*$/ : /^[A-Z]{2,}(?:-[A-Z0-9]+)+$/,
      });
      const byItem = new Map(rows.map(([id, stories]) => [id, stories]));
      if (
        start === -1 ||
        rows.length !== Object.keys(expected).length ||
        byItem.size !== rows.length ||
        !eqSet([...byItem.keys()], Object.keys(expected)) ||
        Object.keys(expected).some((id) => !eqSet(coverageCell(byItem.get(id) ?? ''), expected[id]))
      )
        errors.push('coverage.md inventory matrix must exactly match track inventory coverage');
    }
    const providerClosure = coverageMatrixRows(coverage, '## Provider gate closure', 4, errors, {
      allowedFirstCells: new Set(expectedSplits.map(([semantic]) => semantic)),
    });
    const providerClosureBySemantic = new Map(
      providerClosure.map(([semantic, provider, port, evidence]) => [semantic, { provider, port, evidence }]),
    );
    if (
      providerClosure.length !== expectedSplits.length ||
      providerClosureBySemantic.size !== providerClosure.length ||
      expectedSplits.some(([semantic, provider, port, suite]) => {
        const rendered = providerClosureBySemantic.get(semantic);
        return (
          rendered?.provider !== provider ||
          rendered?.port !== port ||
          !eqSet(coverageCell(rendered?.evidence ?? ''), [suite, 'CF-GATE-PROVIDER'])
        );
      })
    )
      errors.push('coverage.md provider-gate closure must exactly match mandatory provider splits');
    const owners = delegationRegisterOwners(readText('docs/redesign/design/delegation-register.md'));
    const scheduleOwners = deliveryScheduleOwners(readText('docs/delivery/greenfield/decisions.md'));
    const delegatedChoices = isRecord(track.delegated_choices) ? track.delegated_choices : Object.create(null);
    if (!isRecord(track.delegated_choices)) errors.push('delegated_choices must be an object record');
    const openChoices = isRecord(delegatedChoices.open) ? delegatedChoices.open : Object.create(null);
    if (!isRecord(delegatedChoices.open)) errors.push('delegated_choices.open must be an object record');
    for (const [id, choice] of Object.entries(openChoices))
      if (!isRecord(choice) || owners.get(id) !== choice.owner)
        errors.push(`delegated_choices.${id}.owner must exactly match the governing delegation register`);
    for (const [id, owner] of owners)
      if (openChoices[id] && scheduleOwners.get(id) !== owner)
        errors.push(`decisions.md ${id} owner must exactly match the governing delegation register`);
    const actual = new Set(activeFiles(rootDir, 'docs/delivery'));
    if (!eqSet([...actual], [...deliveryAllowlist()]))
      errors.push('active docs/delivery path set does not match exact allowlist');
    const corpus = normativeCorpusPaths(rootDir);
    const rows = corpus.map((path) => `${sha(readText(path))}  ${path}\n`).join('');
    if (corpus.length !== 67 || sha(rows) !== APPROVED_NORMATIVE_CORPUS_SHA256)
      errors.push('live 67-file normative corpus SHA-256 manifest does not match');
  }
  return [...new Set(errors)];
}
export function validateDeliveryTrackPackage(rootDir = process.cwd()) {
  const exists = (path) => existsSync(join(rootDir, path));
  const isFile = (path) => {
    try {
      if (typeof path !== 'string') return false;
      assertOwnedRegularFile(rootDir, path);
      return true;
    } catch {
      return false;
    }
  };
  const readText = (path) => {
    assertOwnedRegularFile(rootDir, path);
    return readUtf8Text(rootDir, path);
  };
  if (!exists(TRACK_PATH)) return ['delivery track is missing'];
  if (!isFile(TRACK_PATH)) return ['docs/delivery/greenfield/track.json is not an owned regular file'];
  try {
    for (const path of candidatePackagePaths()) {
      assertOwnedRegularFile(rootDir, path);
      readText(path);
    }
  } catch (error) {
    return [error instanceof Error ? error.message : 'candidate package ownership preflight failed'];
  }
  let track;
  try {
    const raw = readText(TRACK_PATH);
    if (raw.length > 2 * 1024 * 1024) return ['delivery track exceeds the 2 MiB strict-validation limit'];
    assertNoDuplicateJsonObjectKeys(raw);
    track = JSON.parse(raw);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('duplicate JSON object key '))
      return [`delivery track has ${error.message}`];
    return [`delivery track must be strict valid JSON: ${error.message}`];
  }
  try {
    return validateDeliveryTrack(track, { exists, isFile, readText, rootDir });
  } catch (error) {
    if (error instanceof Error && error.message.endsWith(' is not an owned regular file')) return [error.message];
    return ['delivery track contains malformed data that could not be validated safely'];
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = validateDeliveryTrackPackage();
  if (errors.length) {
    console.error('Delivery track validation failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('Delivery track structural, source, two-way, and corpus validation passed (48 stories, 7 phases).');
    console.log(`Candidate package manifest (unpinned): ${candidatePackageManifest()}`);
  }
}
