import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { repoRoot } from './repo-root.mjs';

const packagePrefix = '@agentic-workflow-kit/jig-';
const forbiddenManifestFields = ['bin', 'browser', 'main', 'module', 'publishConfig'];
const forbiddenLifecycleScript = /^(?:pre|post)?(?:install|pack|publish|prepare)$/;
const forbiddenSourceCapability = /\b(?:fetch|process|require|setInterval|setTimeout|globalThis)\b/g;
const knownDependencyDirections = {
  '@agentic-workflow-kit/jig-authority-kernel': new Set(['@agentic-workflow-kit/jig-codec']),
  '@agentic-workflow-kit/jig-codec': new Set(),
  '@agentic-workflow-kit/jig-conformance': new Set([
    '@agentic-workflow-kit/jig-codec',
    '@agentic-workflow-kit/jig-runtime-contracts',
  ]),
  '@agentic-workflow-kit/jig-runtime-contracts': new Set(['@agentic-workflow-kit/jig-codec']),
  '@agentic-workflow-kit/jig-local-file-providers': new Set([
    '@agentic-workflow-kit/jig-codec',
    '@agentic-workflow-kit/jig-runtime-contracts',
  ]),
  '@agentic-workflow-kit/jig-local-workspace-providers': new Set([
    '@agentic-workflow-kit/jig-codec',
    '@agentic-workflow-kit/jig-runtime-contracts',
  ]),
  '@agentic-workflow-kit/jig-local-verification-providers': new Set(['@agentic-workflow-kit/jig-runtime-contracts']),
};
const knownNativeCapabilities = {
  '@agentic-workflow-kit/jig-local-file-providers': new Set(['node:fs']),
  '@agentic-workflow-kit/jig-local-workspace-providers': new Set([
    'node:child_process',
    'node:crypto',
    'node:fs',
    'node:os',
    'node:path',
  ]),
  '@agentic-workflow-kit/jig-local-verification-providers': new Set([
    'node:child_process',
    'node:crypto',
    'node:fs',
    'node:os',
    'node:path',
    'node:url',
  ]),
};
const friendSubpaths = {
  '@agentic-workflow-kit/jig-runtime-contracts/qualification-certificate': '@agentic-workflow-kit/jig-conformance',
};
const qualificationFriendTarget = 'packages/runtime-contracts/dist/qualification-certificate';
const qualificationFriendFiles = new Set([
  'packages/conformance/src/structured-file-qualification.ts',
  'packages/conformance/src/provider-admission-qualification.ts',
  'packages/conformance/dist/structured-file-qualification.js',
  'packages/conformance/dist/provider-admission-qualification.js',
]);
const providerAdmissionQualificationImport = '../../conformance/dist/provider-admission-qualification.js';
const providerAdmissionQualificationTarget = 'packages/conformance/dist/provider-admission-qualification';
const providerAdmissionQualificationImporters = new Set([
  'packages/local-verification-providers/tests/local-command-provider.test.mjs',
]);
const providerAdmissionQualificationOwnFiles = new Set([
  'packages/conformance/src/provider-admission-qualification.ts',
  'packages/conformance/dist/provider-admission-qualification.js',
  'packages/conformance/dist/provider-admission-qualification.d.ts',
]);
const providerAdmissionQualificationReference = /provider-admission-qualification(?:\.js)?/u;

function resolvesToProviderAdmissionQualification(specifier, repoPath, rootDir) {
  if (providerAdmissionQualificationReference.test(specifier)) return true;
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return false;
  const importer = join(rootDir, repoPath);
  const resolvedPath = relative(rootDir, resolve(dirname(importer), specifier))
    .split('/')
    .join('/');
  return (
    resolvedPath === providerAdmissionQualificationTarget ||
    resolvedPath === `${providerAdmissionQualificationTarget}.js`
  );
}
const runtimeTransitionFriendFiles = new Set([
  'packages/runtime-contracts/src/qualification-certificate.ts',
  'packages/runtime-contracts/dist/qualification-certificate.d.ts',
  'packages/runtime-contracts/dist/qualification-certificate.js',
]);
const runtimeTransitionSymbols = [
  'createExactLocalCommandAdmissionTransition',
  'consumeExactLocalCommandAdmissionTransition',
];
const runtimeTransitionTargets = new Set([
  'packages/runtime-contracts/src/provider',
  'packages/runtime-contracts/dist/provider',
]);
const distTarget = (value) => value.startsWith('./dist/') && !value.split('/').includes('..');

function resolvesToTarget(specifier, repoPath, rootDir, targets) {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return false;
  const importer = join(rootDir, repoPath);
  const resolvedPath = relative(rootDir, resolve(dirname(importer), specifier))
    .split('/')
    .join('/');
  return targets.has(resolvedPath.replace(/\.js$/u, ''));
}

function resolvesToQualificationFriend(specifier, repoPath, rootDir) {
  return (
    specifier === '@agentic-workflow-kit/jig-runtime-contracts/qualification-certificate' ||
    resolvesToTarget(specifier, repoPath, rootDir, new Set([qualificationFriendTarget]))
  );
}

function resolvesToRuntimeTransition(specifier, repoPath, rootDir) {
  return (
    specifier === '@agentic-workflow-kit/jig-runtime-contracts/provider' ||
    resolvesToTarget(specifier, repoPath, rootDir, runtimeTransitionTargets)
  );
}

function importsRuntimeTransition(source, repoPath, rootDir) {
  return [...source.matchAll(/(?:import|export)\s*(\*[^\n]*|\{[^}]*\})\s*from\s*['"]([^'"]+)['"]/gu)].some(
    ([, names, specifier]) =>
      resolvesToRuntimeTransition(specifier, repoPath, rootDir) &&
      (names.trim().startsWith('*') || runtimeTransitionSymbols.some((symbol) => names.includes(symbol))),
  );
}

function readJson(path, errors, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    errors.push(`${label} must be readable JSON`);
    return null;
  }
}

function sourceFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && /\.[cm]?ts$/.test(entry.name) ? [path] : [];
  });
}

function codeFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return codeFiles(path);
    return entry.isFile() && /\.[cm]?[jt]s$/.test(entry.name) ? [path] : [];
  });
}

function importSpecifiers(source) {
  const values = new Set();
  for (const pattern of [
    /^\s*(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]\s*;?/gm,
    /(?<![-\w'"])(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ])
    for (const match of source.matchAll(pattern)) values.add(match[1]);
  return [...values];
}

const regexPrefixKeywords = new Set([
  'await',
  'case',
  'delete',
  'in',
  'instanceof',
  'new',
  'of',
  'return',
  'throw',
  'typeof',
  'void',
  'yield',
]);

function canStartRegex(output) {
  let end = output.length - 1;
  while (end >= 0 && /\s/.test(output[end])) end -= 1;
  if (end < 0) return true;

  const previous = output[end];
  if ((previous === '+' || previous === '-') && output[end - 1] === previous) return false;
  if ('([{:;,=!?&|+-*%^~<>'.includes(previous)) return true;
  if (!/[$\w]/.test(previous)) return false;

  let start = end;
  while (start >= 0 && /[$\w]/.test(output[start])) start -= 1;
  return regexPrefixKeywords.has(output.slice(start + 1, end + 1).join(''));
}

function isEscaped(source, index) {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor -= 1) backslashes += 1;
  return backslashes % 2 === 1;
}

function executableSource(source) {
  const output = [];
  const stack = [{ type: 'code', braceDepth: null }];
  const blank = (value) => (value === '\n' || value === '\r' ? value : ' ');

  for (let index = 0; index < source.length; index += 1) {
    const value = source[index];
    const next = source[index + 1];
    const state = stack.at(-1);

    if (state.type === 'line-comment') {
      output.push(blank(value));
      if (value === '\n') stack.pop();
      continue;
    }
    if (state.type === 'block-comment') {
      output.push(blank(value));
      if (value === '*' && next === '/') {
        output.push(' ');
        index += 1;
        stack.pop();
      }
      continue;
    }
    if (state.type === 'string') {
      output.push(blank(value));
      if (value === '\\' && next !== undefined) {
        output.push(blank(next));
        index += 1;
      } else if (value === state.quote) stack.pop();
      continue;
    }
    if (state.type === 'regex') {
      output.push(blank(value));
      if (value === '\\' && next !== undefined) {
        output.push(blank(next));
        index += 1;
      } else if (value === '[') state.inCharacterClass = true;
      else if (value === ']') state.inCharacterClass = false;
      else if (value === '/' && !state.inCharacterClass) {
        while (source[index + 1] !== undefined && /[dgimsuvy]/.test(source[index + 1])) {
          output.push(' ');
          index += 1;
        }
        stack.pop();
      }
      continue;
    }
    if (state.type === 'template') {
      output.push(blank(value));
      if (value === '\\' && next !== undefined) {
        output.push(blank(next));
        index += 1;
      } else if (value === '`') stack.pop();
      else if (value === '$' && next === '{') {
        output.push(' ');
        index += 1;
        stack.push({ type: 'code', braceDepth: 1 });
      }
      continue;
    }

    if (state.braceDepth !== null && value === '}') {
      state.braceDepth -= 1;
      output.push(state.braceDepth === 0 ? ' ' : value);
      if (state.braceDepth === 0) stack.pop();
    } else if (state.braceDepth !== null && value === '{') {
      state.braceDepth += 1;
      output.push(value);
    } else if (value === '/' && next === '/' && !isEscaped(source, index)) {
      output.push(' ', ' ');
      index += 1;
      stack.push({ type: 'line-comment' });
    } else if (value === '/' && next === '*' && !isEscaped(source, index)) {
      output.push(' ', ' ');
      index += 1;
      stack.push({ type: 'block-comment' });
    } else if (value === '/' && canStartRegex(output)) {
      output.push(' ');
      stack.push({ type: 'regex', inCharacterClass: false });
    } else if (value === '"' || value === "'") {
      output.push(' ');
      stack.push({ type: 'string', quote: value });
    } else if (value === '`') {
      output.push(' ');
      stack.push({ type: 'template' });
    } else output.push(value);
  }

  return output.join('');
}

function referencesForbiddenCapability(source) {
  const executable = executableSource(source);
  for (const match of executable.matchAll(forbiddenSourceCapability)) {
    let before = match.index - 1;
    while (before >= 0 && /\s/.test(executable[before])) before -= 1;
    let after = match.index + match[0].length;
    while (after < executable.length && /\s/.test(executable[after])) after += 1;
    if (executable[before] !== '.' && executable[after] !== ':') return true;
  }
  return false;
}

function validateManifest(manifest, packageDir, workspaceNames, errors) {
  const label = manifest.name ?? packageDir;
  if (typeof manifest.name !== 'string' || !manifest.name.startsWith(packagePrefix))
    errors.push(`${label} must use the private Jig package namespace`);
  if (manifest.private !== true) errors.push(`${label} must remain private`);
  if (forbiddenManifestFields.some((field) => Object.hasOwn(manifest, field)))
    errors.push(`${label} exposes a runtime or publishing entrypoint`);
  if (
    manifest.exports &&
    !(
      (typeof manifest.exports === 'string' && distTarget(manifest.exports)) ||
      (plainExportMap(manifest.exports) && Object.values(manifest.exports).every(distTarget))
    )
  )
    errors.push(`${label} exports must resolve only from dist`);
  if (manifest.types && (typeof manifest.types !== 'string' || !distTarget(manifest.types)))
    errors.push(`${label} types must resolve only from dist`);
  if (Object.keys(manifest.scripts ?? {}).some((name) => name === 'start' || forbiddenLifecycleScript.test(name)))
    errors.push(`${label} exposes a start or package lifecycle script`);
  if (
    ['build', 'lint', 'test'].some(
      (name) => typeof manifest.scripts?.[name] !== 'string' || !manifest.scripts[name].trim(),
    )
  )
    errors.push(`${label} must declare build, lint, and test scripts`);

  const dependencies = manifest.dependencies ?? {};
  for (const [dependency, specifier] of Object.entries(dependencies)) {
    if (!workspaceNames.has(dependency) || specifier !== 'workspace:*')
      errors.push(`${label} production dependencies must be private workspace packages`);
  }

  const allowed = knownDependencyDirections[manifest.name];
  if (!allowed) errors.push(`${label} has no dependency-direction policy`);
  else
    for (const dependency of Object.keys(dependencies))
      if (!allowed.has(dependency)) errors.push(`${label} has a forbidden dependency direction to ${dependency}`);
}

function plainExportMap(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === 'string')
  );
}

export function validatePackageBoundaries(rootDir = repoRoot) {
  const errors = [];
  const packagesRoot = join(rootDir, 'packages');
  if (!existsSync(packagesRoot)) return ['packages directory is missing'];

  const packageDirs = readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(packagesRoot, entry.name));
  const manifests = packageDirs
    .map((directory) => ({
      directory,
      manifest: readJson(join(directory, 'package.json'), errors, directory),
    }))
    .filter(({ manifest }) => manifest);
  const workspaceNames = new Set(manifests.map(({ manifest }) => manifest.name));

  for (const { directory, manifest } of manifests) {
    validateManifest(manifest, directory, workspaceNames, errors);
    for (const path of codeFiles(directory)) {
      const source = readFileSync(path, 'utf8');
      const repoPath = relative(resolve(rootDir), resolve(path)).split('/').join('/');
      const providerAdmissionQualificationAllowed = providerAdmissionQualificationImporters.has(repoPath);
      let reportedProviderAdmissionQualification = false;
      for (const specifier of importSpecifiers(source)) {
        if (resolvesToQualificationFriend(specifier, repoPath, rootDir) && !qualificationFriendFiles.has(repoPath))
          errors.push(`${manifest.name} imports restricted qualification friend ${specifier}`);
        if (
          resolvesToProviderAdmissionQualification(specifier, repoPath, rootDir) &&
          !(providerAdmissionQualificationAllowed && specifier === providerAdmissionQualificationImport)
        ) {
          errors.push(`${manifest.name} imports restricted provider admission qualification ${specifier}`);
          reportedProviderAdmissionQualification = true;
        }
        if (
          manifest.name !== '@agentic-workflow-kit/jig-runtime-contracts' &&
          /(?:^|\/)qualification-registry(?:\.js)?$/u.test(specifier)
        )
          errors.push(`${manifest.name} bypasses the private qualification registry boundary`);
      }
      if (importsRuntimeTransition(source, repoPath, rootDir) && !runtimeTransitionFriendFiles.has(repoPath))
        errors.push(`${manifest.name} imports restricted runtime transition`);
      if (
        providerAdmissionQualificationReference.test(source) &&
        !providerAdmissionQualificationOwnFiles.has(repoPath) &&
        !providerAdmissionQualificationAllowed &&
        !reportedProviderAdmissionQualification
      )
        errors.push(`${manifest.name} references restricted provider admission qualification`);
    }
    const sources = sourceFiles(join(directory, 'src'));
    if (!sources.length) errors.push(`${manifest.name} must own at least one TypeScript source file`);
    for (const path of sources) {
      const source = readFileSync(path, 'utf8');
      if (/\bimport\s*\(/u.test(executableSource(source)))
        errors.push(`${manifest.name} source cannot use dynamic import`);
      for (const specifier of importSpecifiers(source))
        if (specifier.startsWith('./') || specifier.startsWith('../')) continue;
        else if (knownNativeCapabilities[manifest.name]?.has(specifier)) continue;
        else if (Object.hasOwn(friendSubpaths, specifier)) {
          if (
            friendSubpaths[specifier] !== manifest.name ||
            !qualificationFriendFiles.has(relative(resolve(rootDir), resolve(path)).split('/').join('/'))
          )
            errors.push(`${manifest.name} imports restricted friend subpath ${specifier}`);
        } else if (!specifier.startsWith(packagePrefix))
          errors.push(`${manifest.name} source imports a non-workspace capability: ${specifier}`);
        else if (!Object.hasOwn(manifest.dependencies ?? {}, specifier))
          errors.push(`${manifest.name} source imports an undeclared workspace dependency: ${specifier}`);
      if (referencesForbiddenCapability(source))
        errors.push(`${manifest.name} source references a forbidden ambient runtime capability`);
    }
  }

  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = validatePackageBoundaries();
  if (errors.length) {
    console.error('Package boundary check failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('Package boundary check passed.');
  }
}
