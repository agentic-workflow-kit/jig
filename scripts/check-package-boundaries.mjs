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

const ALL_DEPENDENCY_KEYS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'bundledDependencies',
  'bundleDependencies',
];

const expectedGraph = {
  '@gf-001-fixture/pkg-a': {
    dependencies: [],
    references: [],
  },
  '@gf-001-fixture/pkg-b': {
    dependencies: ['@gf-001-fixture/pkg-a'],
    references: ['../pkg-a'],
  },
  '@gf-001-fixture/pkg-c': {
    dependencies: [],
    references: [],
  },
};

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

  // Verify complete expected package-node set
  const foundPackageNames = new Set(manifestMap.keys());
  const expectedPackageNames = new Set(Object.keys(expectedGraph));

  for (const reqName of expectedPackageNames) {
    if (!foundPackageNames.has(reqName)) {
      errors.push(`workspace missing expected package node ${reqName}`);
    }
  }
  for (const foundName of foundPackageNames) {
    if (!expectedPackageNames.has(foundName)) {
      errors.push(`unexpected package ${foundName} found in fixture workspace`);
    }
  }

  // 3. Validate exact package adjacency graph, directionality, external dependencies, exact workspace protocol, and tsconfig reference congruence
  for (const [name, { pkgPath, manifest }] of manifestMap) {
    const expected = expectedGraph[name];
    if (!expected) continue;

    const declaredDeps = new Set();

    for (const depKey of ALL_DEPENDENCY_KEYS) {
      if (depKey in manifest) {
        if (typeof manifest[depKey] !== 'object' || manifest[depKey] === null) {
          errors.push(`package ${name} has invalid ${depKey} record`);
          continue;
        }
        const depsObj = manifest[depKey];
        const entries = Array.isArray(depsObj) ? depsObj.map((d) => [d, '*']) : Object.entries(depsObj);
        for (const [dep, spec] of entries) {
          declaredDeps.add(dep);
          if (!expected.dependencies.includes(dep)) {
            errors.push(`package ${name} declares forbidden dependency ${dep} in ${depKey}`);
          } else {
            if (spec !== 'workspace:*') {
              errors.push(`package ${name} dependency ${dep} must use exact "workspace:*" protocol, got "${spec}"`);
            }
          }
        }
      }
    }

    // Check for missing expected internal dependencies
    for (const reqDep of expected.dependencies) {
      if (!declaredDeps.has(reqDep)) {
        errors.push(`package ${name} missing required dependency ${reqDep}`);
      }
    }

    // Read tsconfig.json references
    const tsconfigPath = join(pkgPath, 'tsconfig.json');
    let declaredRefs = [];
    if (existsSync(tsconfigPath)) {
      try {
        const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
        declaredRefs = (tsconfig.references || []).map((r) => r.path);
      } catch {
        errors.push(`invalid tsconfig.json in package ${name}`);
      }
    }

    for (const refPath of declaredRefs) {
      const resolvedRef = resolve(pkgPath, refPath);
      if (!existsSync(resolvedRef)) {
        errors.push(`package ${name} tsconfig references non-existent path ${refPath}`);
      }
      if (!expected.references.includes(refPath)) {
        errors.push(`package ${name} tsconfig declares forbidden project reference ${refPath}`);
      }
    }

    for (const reqRef of expected.references) {
      if (!declaredRefs.includes(reqRef)) {
        errors.push(`package ${name} tsconfig missing required project reference ${reqRef}`);
      }
    }

    // Congruence check: number of dependencies must equal number of project references
    if (expected.dependencies.length !== expected.references.length) {
      errors.push(`package ${name} dependency and project reference specification count mismatch`);
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
