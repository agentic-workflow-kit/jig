import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

const rootDir = process.cwd();
const excludedDirNames = new Set(['node_modules', 'dist', 'coverage', 'runs', '.git']);

// Matches inline links and images: [text](target) / ![alt](target), optionally with a
// quoted title after the target ([text](target "title")). Reference-style links
// ([text][ref]) are not used anywhere in this repo, so they are intentionally unhandled.
const linkPattern = /!?\[[^\]]*\]\(\s*<?([^)\s]+)>?(?:\s+"[^"]*")?\s*\)/g;

const fencePattern = /^(\s*)(`{3,}|~{3,})/;
const atxHeadingPattern = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

function isMarkdownFile(filePath) {
  return extname(filePath) === '.md';
}

function collectMarkdownFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (excludedDirNames.has(entry.name)) {
        continue;
      }
      files.push(...collectMarkdownFiles(join(dir, entry.name)));
      continue;
    }
    if (entry.isFile() && isMarkdownFile(entry.name)) {
      files.push(join(dir, entry.name));
    }
  }
  return files;
}

// Splits file text into lines paired with a flag saying whether that line sits inside a
// fenced code block (``` or ~~~, any indent, three or more fence characters). Fenced
// content — Mermaid diagrams, code samples with bracket syntax — must not be scanned for
// links or headings.
function splitLinesOutsideFences(text) {
  const rawLines = text.split('\n');
  const lines = [];
  let fenceChar = null;
  let fenceLength = 0;
  for (const rawLine of rawLines) {
    const match = rawLine.match(fencePattern);
    if (match) {
      const [, , marker] = match;
      const char = marker[0];
      if (fenceChar === null) {
        fenceChar = char;
        fenceLength = marker.length;
        lines.push({ text: rawLine, inFence: true });
        continue;
      }
      if (char === fenceChar && marker.length >= fenceLength) {
        lines.push({ text: rawLine, inFence: true });
        fenceChar = null;
        fenceLength = 0;
        continue;
      }
    }
    lines.push({ text: rawLine, inFence: fenceChar !== null });
  }
  return lines;
}

// Strips inline Markdown formatting from heading text before slugging: inline code
// backticks (keep the inner text), link syntax [text](url) -> text, and emphasis
// markers. Order matters: links must be unwrapped before emphasis stripping so an
// emphasis marker inside link text is not left dangling.
function stripInlineMarkdown(headingText) {
  return headingText
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*\*|\*\*|\*|___|__|_)([^*_]+)\1/g, '$2');
}

// GitHub's heading slugger: lowercase, strip anything that is not a Unicode letter,
// digit, underscore, space, or ASCII hyphen (this removes punctuation such as
// &, commas, colons, em/en-dashes and arrows without dashifying them), then turn
// each remaining space into a hyphen. Consecutive hyphens are NOT collapsed — a
// heading like "The fence — runtime authorization" legitimately slugs to
// "the-fence--runtime-authorization" (double hyphen), verified against real repo
// anchors below.
function slugify(headingText) {
  return stripInlineMarkdown(headingText)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_ -]/gu, '')
    .replace(/ /g, '-');
}

// Extracts heading slugs from a file's non-fenced lines, applying GitHub's duplicate
// suffix rule: the first occurrence of a slug is unsuffixed, later occurrences of the
// same slug get -1, -2, ... appended.
function extractHeadingSlugs(lines) {
  const seenCounts = new Map();
  const slugs = new Set();
  for (const { text, inFence } of lines) {
    if (inFence) {
      continue;
    }
    const match = text.match(atxHeadingPattern);
    if (!match) {
      continue;
    }
    const baseSlug = slugify(match[2]);
    const count = seenCounts.get(baseSlug) ?? 0;
    seenCounts.set(baseSlug, count + 1);
    slugs.add(count === 0 ? baseSlug : `${baseSlug}-${count}`);
  }
  return slugs;
}

function isExternalTarget(target) {
  return /^(https?:|mailto:)/i.test(target);
}

function pathExists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function resolveFileTarget(candidatePath) {
  if (!pathExists(candidatePath)) {
    return { exists: false, resolvedPath: candidatePath };
  }
  const stats = statSync(candidatePath);
  if (stats.isDirectory()) {
    // A directory link is valid on its own; only fall through to its README.md for
    // heading lookups when the link also carries a fragment.
    return { exists: true, resolvedPath: candidatePath, isDirectory: true };
  }
  return { exists: true, resolvedPath: candidatePath, isDirectory: false };
}

function nearestCandidateSlugs(slugs, fragment, limit = 3) {
  const target = fragment.toLowerCase();
  return [...slugs]
    .map((slug) => ({ slug, score: levenshtein(slug, target) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ slug }) => slug);
}

function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const distances = Array.from({ length: rows }, (_unused, i) => {
    const row = new Array(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let col = 0; col < cols; col += 1) {
    distances[0][col] = col;
  }
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;
      distances[row][col] = Math.min(
        distances[row - 1][col] + 1,
        distances[row][col - 1] + 1,
        distances[row - 1][col - 1] + cost,
      );
    }
  }
  return distances[rows - 1][cols - 1];
}

const headingSlugCache = new Map();

function headingSlugsFor(filePath) {
  if (headingSlugCache.has(filePath)) {
    return headingSlugCache.get(filePath);
  }
  const text = readFileSync(filePath, 'utf8');
  const lines = splitLinesOutsideFences(text);
  const slugs = extractHeadingSlugs(lines);
  headingSlugCache.set(filePath, slugs);
  return slugs;
}

function checkLinksInFile(filePath, errors) {
  const text = readFileSync(filePath, 'utf8');
  const lines = splitLinesOutsideFences(text);
  const ownSlugs = headingSlugsFor(filePath);

  lines.forEach(({ text: lineText, inFence }, index) => {
    if (inFence) {
      return;
    }
    const lineNumber = index + 1;
    for (const match of lineText.matchAll(linkPattern)) {
      const target = match[1];
      if (isExternalTarget(target)) {
        continue;
      }

      if (target.startsWith('#')) {
        const fragment = target.slice(1);
        if (!ownSlugs.has(fragment)) {
          errors.push({
            file: filePath,
            line: lineNumber,
            target,
            reason: 'in-page anchor does not match any heading in this file',
            candidates: nearestCandidateSlugs(ownSlugs, fragment),
          });
        }
        continue;
      }

      const hashIndex = target.indexOf('#');
      const targetPath = hashIndex === -1 ? target : target.slice(0, hashIndex);
      const fragment = hashIndex === -1 ? null : target.slice(hashIndex + 1);

      if (targetPath.length === 0) {
        // Pure "#fragment" already handled above; an empty path with no fragment is
        // a malformed link with nothing to resolve.
        continue;
      }

      const resolvedPath = resolve(dirname(filePath), targetPath);
      const resolution = resolveFileTarget(resolvedPath);

      if (!resolution.exists) {
        errors.push({
          file: filePath,
          line: lineNumber,
          target,
          reason: `target does not exist (resolved to ${relative(rootDir, resolvedPath)})`,
          candidates: [],
        });
        continue;
      }

      if (fragment === null || fragment.length === 0) {
        continue;
      }

      if (resolution.isDirectory) {
        errors.push({
          file: filePath,
          line: lineNumber,
          target,
          reason: 'fragment used on a directory link (directories have no headings)',
          candidates: [],
        });
        continue;
      }

      if (!isMarkdownFile(resolvedPath)) {
        // Fragments on non-Markdown targets (for example JSON) are not GitHub heading
        // anchors; nothing to validate.
        continue;
      }

      const targetSlugs = headingSlugsFor(resolvedPath);
      if (!targetSlugs.has(fragment)) {
        errors.push({
          file: filePath,
          line: lineNumber,
          target,
          reason: `fragment does not match any heading in ${relative(rootDir, resolvedPath)}`,
          candidates: nearestCandidateSlugs(targetSlugs, fragment),
        });
      }
    }
  });
}

const markdownFiles = collectMarkdownFiles(rootDir).sort();
const errors = [];

for (const filePath of markdownFiles) {
  checkLinksInFile(filePath, errors);
}

if (errors.length > 0) {
  console.error('Doc link check failed:');
  for (const error of errors) {
    const location = `${relative(rootDir, error.file)}:${error.line}`;
    console.error(`- ${location}: broken target "${error.target}" (${error.reason})`);
    if (error.candidates.length > 0) {
      console.error(`  nearest candidate slugs: ${error.candidates.join(', ')}`);
    }
  }
  process.exitCode = 1;
} else {
  console.log(`Doc link check passed (${markdownFiles.length} Markdown files scanned).`);
}
