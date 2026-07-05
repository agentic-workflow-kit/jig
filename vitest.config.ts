import { defineConfig } from 'vitest/config';

const HERMETIC_SETUP_FILES = ['./tests/hermetic/no-real-effects.setup.ts'];

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
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
          include: [
            'packages/*/src/**/*.unit.test.ts',
            'packages/*/tests/**/*.unit.test.ts',
            'tests/hermetic/**/*.unit.test.ts',
          ],
          setupFiles: HERMETIC_SETUP_FILES,
        },
      },
      {
        test: {
          name: 'integration',
          include: [
            'packages/*/src/**/*.int.test.ts',
            'packages/*/tests/**/*.int.test.ts',
            'tests/hermetic/**/*.int.test.ts',
          ],
          setupFiles: HERMETIC_SETUP_FILES,
        },
      },
      {
        test: {
          name: 'conformance',
          include: ['packages/*/tests/conformance/**/*.conformance.test.ts'],
          setupFiles: HERMETIC_SETUP_FILES,
        },
      },
      {
        test: {
          name: 'smoke',
          include: ['packages/*/tests/smoke/**/*.smoke.test.ts'],
        },
      },
    ],
  },
});
