import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { repoRoot } from './repo-root.mjs';

const packagePrefix = '@agentic-workflow-kit/jig-';
const forbiddenManifestFields = ['bin', 'browser', 'main', 'module', 'publishConfig'];
const forbiddenLifecycleScript = /^(?:pre|post)?(?:install|pack|publish|prepare)$/;
const forbiddenSourceCapability = /\b(?:fetch|process|require|setInterval|setTimeout|globalThis)\b/;
const knownDependencyDirections = {
  '@agentic-workflow-kit/jig-authority-kernel': new Set(['@agentic-workflow-kit/jig-codec']),
  '@agentic-workflow-kit/jig-codec': new Set(),
  '@agentic-workflow-kit/jig-conformance': new Set([
    '@agentic-workflow-kit/jig-codec',
    '@agentic-workflow-kit/jig-runtime-contracts',
  ]),
  '@agentic-workflow-kit/jig-runtime-contracts': new Set(['@agentic-workflow-kit/jig-codec']),
};

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

function importSpecifiers(source) {
  const values = new Set();
  for (const pattern of [
    /^\s*(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]\s*;?/gm,
    /(?<![-\w'"])(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ])
    for (const match of source.matchAll(pattern)) values.add(match[1]);
  return [...values];
}

function validateManifest(manifest, packageDir, workspaceNames, errors) {
  const label = manifest.name ?? packageDir;
  if (typeof manifest.name !== 'string' || !manifest.name.startsWith(packagePrefix))
    errors.push(`${label} must use the private Jig package namespace`);
  if (manifest.private !== true) errors.push(`${label} must remain private`);
  if (forbiddenManifestFields.some((field) => Object.hasOwn(manifest, field)))
    errors.push(`${label} exposes a runtime or publishing entrypoint`);
  if (manifest.exports && (typeof manifest.exports !== 'string' || !manifest.exports.startsWith('./dist/')))
    errors.push(`${label} exports must resolve only from dist`);
  if (manifest.types && (typeof manifest.types !== 'string' || !manifest.types.startsWith('./dist/')))
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
    const sources = sourceFiles(join(directory, 'src'));
    if (!sources.length) errors.push(`${manifest.name} must own at least one TypeScript source file`);
    for (const path of sources) {
      const source = readFileSync(path, 'utf8');
      for (const specifier of importSpecifiers(source))
        if (specifier.startsWith('./') || specifier.startsWith('../')) continue;
        else if (!specifier.startsWith(packagePrefix))
          errors.push(`${manifest.name} source imports a non-workspace capability: ${specifier}`);
        else if (!Object.hasOwn(manifest.dependencies ?? {}, specifier))
          errors.push(`${manifest.name} source imports an undeclared workspace dependency: ${specifier}`);
      if (forbiddenSourceCapability.test(source))
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
