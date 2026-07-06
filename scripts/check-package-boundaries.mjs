import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const rootDir = process.cwd();
const packagesDir = join(rootDir, 'packages');
const rootManifestPath = join(rootDir, 'package.json');
const knownPackageNames = new Map([
  ['jig-sdk', '@agentic-workflow-kit/jig-sdk'],
  ['jig-cli', '@agentic-workflow-kit/jig-cli'],
  ['jig-mcp', '@agentic-workflow-kit/jig-mcp'],
  ['jig-testkit', '@agentic-workflow-kit/jig-testkit'],
]);
const allowedImports = new Map([
  ['jig-sdk', new Set()],
  ['jig-cli', new Set(['@agentic-workflow-kit/jig-sdk'])],
  ['jig-mcp', new Set(['@agentic-workflow-kit/jig-sdk'])],
  ['jig-testkit', new Set(['@agentic-workflow-kit/jig-sdk'])],
]);

function collectWorkspacePackageDirs() {
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((entry) => {
      try {
        readFileSync(join(packagesDir, entry, 'package.json'), 'utf8');
        return true;
      } catch {
        return false;
      }
    })
    .sort();
}

function collectTsFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function packageKeyForFile(filePath) {
  return relative(packagesDir, filePath).split(sep)[0];
}

function extractModuleSpecifiers(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const specifiers = new Set();
  const patterns = [
    /\bimport\s+type\s+[^'"]*?\sfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s+[^'"]*?\sfrom\s+['"]([^'"]+)['"]/g,
    /\bexport\s+[^'"]*?\sfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /^\s*import\s+['"]([^'"]+)['"];?/gm,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier) {
        specifiers.add(specifier);
      }
    }
  }

  return [...specifiers];
}

function validateManifest(manifestPath, label) {
  const errors = [];
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.private !== true) {
    errors.push(`${label}: package must remain private`);
  }
  if ('publishConfig' in manifest) {
    errors.push(`${label}: publishConfig is forbidden`);
  }
  return errors;
}

function validateManifests(workspacePackageDirs) {
  const errors = [...validateManifest(rootManifestPath, '@agentic-workflow-kit/jig-repo')];

  for (const packageDir of workspacePackageDirs) {
    const manifestPath = join(packagesDir, packageDir, 'package.json');
    const label = knownPackageNames.get(packageDir) ?? `packages/${packageDir}`;
    errors.push(...validateManifest(manifestPath, label));
  }

  return errors;
}

function validateImports(workspacePackageDirs) {
  const errors = [];

  for (const packageDir of workspacePackageDirs) {
    const allowed = allowedImports.get(packageDir);
    if (!allowed) {
      errors.push(`packages/${packageDir}: workspace package must have an explicit dependency-matrix entry`);
      continue;
    }

    const packageRoot = join(packagesDir, packageDir);
    for (const filePath of collectTsFiles(packageRoot)) {
      for (const specifier of extractModuleSpecifiers(filePath)) {
        if (specifier.startsWith('@agentic-workflow-kit/jig-')) {
          const importedPackage = [...knownPackageNames.values()].find(
            (name) => specifier === name || specifier.startsWith(`${name}/`),
          );
          if (importedPackage) {
            if (specifier.split('/').length > 2) {
              errors.push(`${relative(rootDir, filePath)}: deep import across packages is forbidden (${specifier})`);
            }

            if (!allowed.has(importedPackage)) {
              errors.push(`${relative(rootDir, filePath)}: ${packageDir} must not import ${importedPackage}`);
            }
          }
        }

        if (specifier.startsWith('.')) {
          const resolvedImport = resolve(filePath, '..', specifier);
          if (!resolvedImport.startsWith(join(packagesDir, packageKeyForFile(filePath)))) {
            errors.push(`${relative(rootDir, filePath)}: relative import escapes its package boundary (${specifier})`);
          }
        }
      }
    }
  }

  return errors;
}

const workspacePackageDirs = collectWorkspacePackageDirs();
const errors = [...validateManifests(workspacePackageDirs), ...validateImports(workspacePackageDirs)];

if (errors.length > 0) {
  console.error('Package boundary check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
