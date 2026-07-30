import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { repoRoot } from './repo-root.mjs';

const requiredFiles = ['package.json', 'pnpm-workspace.yaml', 'turbo.json', '.github/workflows/check.yml'];
const forbiddenRootSurfaces = ['src', 'skills', 'vitest.config.ts'];
const immutableAction = /uses:\s+[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[a-f0-9]{40}(?:\s|#|$)/;

function readText(rootDir, path, errors) {
  const absolute = join(rootDir, path);
  if (!existsSync(absolute)) {
    errors.push(`required repository file is missing: ${path}`);
    return null;
  }
  return readFileSync(absolute, 'utf8');
}

function readJson(rootDir, path, errors) {
  const text = readText(rootDir, path, errors);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    errors.push(`required repository JSON is malformed: ${path}`);
    return null;
  }
}

function workspacePackages(workspace) {
  const packages = [];
  let readingPackages = false;
  for (const line of workspace.split('\n')) {
    if (!readingPackages) {
      readingPackages = /^packages:\s*(?:#.*)?$/.test(line);
      continue;
    }
    if (/^\s*(?:#.*)?$/.test(line)) continue;
    if (/^\S/.test(line)) break;
    const item = line.match(/^\s+-\s+(?:"([^"]+)"|'([^']+)'|([^#]+?))\s*(?:#.*)?$/);
    if (item) packages.push((item[1] ?? item[2] ?? item[3]).trim());
  }
  return new Set(packages);
}

function validateWorkflow(workflow, errors) {
  if (!/^permissions:\n\s+contents:\s+read$/m.test(workflow))
    errors.push('CI workflow must retain read-only repository permissions');
  if (!/persist-credentials:\s+false/.test(workflow)) errors.push('CI checkout must disable credential persistence');
  if (!/pnpm install --frozen-lockfile/.test(workflow)) errors.push('CI workflow must use the frozen lockfile');
  if (!/run:\s+pnpm check/.test(workflow)) errors.push('CI workflow must run the full pnpm check gate');

  for (const line of workflow.split('\n').filter((value) => /^\s*uses:/.test(value)))
    if (!immutableAction.test(line.trim())) errors.push(`CI action must use an immutable commit: ${line.trim()}`);
}

export function validateActiveRepository(rootDir = repoRoot) {
  const errors = [];
  for (const path of requiredFiles) readText(rootDir, path, errors);
  if (errors.length) return errors;

  const manifest = readJson(rootDir, 'package.json', errors);
  if (manifest) {
    if (manifest.private !== true) errors.push('root package must remain private');
    if (manifest.packageManager !== 'pnpm@11.9.0') errors.push('root package must pin pnpm@11.9.0');
    if (manifest.scripts?.check !== 'turbo run check guard')
      errors.push('root check script must run the full package and repository gate graph');
  }

  const workspace = readText(rootDir, 'pnpm-workspace.yaml', errors) ?? '';
  const packagePatterns = workspacePackages(workspace);
  for (const pattern of ['packages/*', 'tools/*'])
    if (!packagePatterns.has(pattern)) errors.push(`pnpm workspace must include ${pattern}`);

  readJson(rootDir, 'turbo.json', errors);
  validateWorkflow(readText(rootDir, '.github/workflows/check.yml', errors) ?? '', errors);

  for (const path of forbiddenRootSurfaces)
    if (existsSync(join(rootDir, path))) errors.push(`forbidden active root surface exists: ${path}`);

  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = validateActiveRepository();
  if (errors.length) {
    console.error('Repository structure check failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('Repository structure check passed.');
  }
}
