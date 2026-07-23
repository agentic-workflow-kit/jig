import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function findPackages(dir) {
  const packages = [];
  if (!existsSync(dir)) return packages;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const manifestPath = join(fullPath, 'package.json');
      if (existsSync(manifestPath)) {
        packages.push(fullPath);
      } else {
        packages.push(...findPackages(fullPath));
      }
    }
  }
  return packages;
}

export function validatePackageBoundaries(rootDir = process.cwd()) {
  const errors = [];

  // 1. Root packages/ or src/ directory must not exist (product code is forbidden in GF-001)
  const rootPackages = join(rootDir, 'packages');
  if (existsSync(rootPackages)) {
    errors.push('root packages/ directory is forbidden in GF-001');
  }
  const rootSrc = join(rootDir, 'src');
  if (existsSync(rootSrc)) {
    errors.push('root src/ product source directory is forbidden in GF-001');
  }

  // 2. Discover all workspace packages (under tests/fixtures/)
  const fixtureDir = join(rootDir, 'tests', 'fixtures', 'gf-001-workspace', 'packages');
  const pkgPaths = findPackages(fixtureDir);

  const manifestMap = new Map();
  for (const pkgPath of pkgPaths) {
    const manifestFile = join(pkgPath, 'package.json');
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    } catch {
      errors.push(`invalid JSON manifest at ${manifestFile}`);
      continue;
    }

    // Every active workspace package must be private
    if (manifest.private !== true) {
      errors.push(`workspace package ${manifest.name || pkgPath} must set "private": true`);
    }

    manifestMap.set(manifest.name, { pkgPath, manifest });

    // Check for forbidden entrypoints or provider/adapter/credential files
    const srcDir = join(pkgPath, 'src');
    if (existsSync(srcDir)) {
      const srcFiles = readdirSync(srcDir);
      for (const file of srcFiles) {
        if (
          file.includes('provider') ||
          file.includes('adapter') ||
          file.includes('credential') ||
          file.includes('controller')
        ) {
          errors.push(`forbidden runtime concept file ${file} in package ${manifest.name}`);
        }
      }
    }
  }

  // 3. Validate dependency edges and project references
  for (const [name, { pkgPath, manifest }] of manifestMap) {
    const deps = Object.keys(manifest.dependencies || {});
    for (const dep of deps) {
      if (dep.startsWith('@gf-001-fixture/')) {
        if (!manifestMap.has(dep)) {
          errors.push(`package ${name} depends on unknown workspace package ${dep}`);
        }
      }
    }

    // Check TypeScript project references if tsconfig.json exists
    const tsconfigPath = join(pkgPath, 'tsconfig.json');
    if (existsSync(tsconfigPath)) {
      try {
        const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
        const refs = tsconfig.references || [];
        for (const ref of refs) {
          const refPath = resolve(pkgPath, ref.path);
          if (!existsSync(refPath)) {
            errors.push(`package ${name} tsconfig references non-existent path ${ref.path}`);
          }
        }
      } catch {
        errors.push(`invalid tsconfig.json in package ${name}`);
      }
    }
  }

  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const errors = validatePackageBoundaries();
  if (errors.length > 0) {
    console.error('Package boundary check failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
  } else {
    console.log('Package boundary check passed (all workspace packages are private, bounded, and hermetic).');
  }
}
