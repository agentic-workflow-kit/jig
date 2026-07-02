import { defineConfig } from 'vitest/config';

// Single-package engine baseline. Coverage thresholds match the org's TDD bar (90%+).
// Test files are split by suffix so the same runner drives unit and integration tiers;
// add `conformance`/`smoke` projects here if a repo grows those tiers.
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.unit.test.ts', 'tests/**/*.unit.test.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          include: ['src/**/*.int.test.ts', 'tests/**/*.int.test.ts'],
        },
      },
    ],
  },
});
