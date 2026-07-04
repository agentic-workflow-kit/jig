import { defineConfig } from 'vitest/config';

// Single-package engine baseline. Coverage thresholds match the org's TDD bar (90%+).
// Test files are split by suffix so the same runner drives each tier; `conformance` covers
// tests/conformance/*.conformance.test.ts (provider-conformance regressions and adversarial
// checks — a distinct tier from ordinary unit tests). `smoke` covers token-gated real-effect
// probes and intentionally does not use the hermetic no-real-effects setup.
//
// setupFiles wires the hermetic no-real-effects guard (tests/hermetic/no-real-effects.setup.ts)
// into every non-smoke lane: it fails loudly on genuinely external effects (network fetch to a
// non-local host, execFile of gh/git-push-like operations, any codex process) while allowlisting
// what existing tests legitimately do (local git in a temp workspace, node self-invocation).
const HERMETIC_SETUP_FILES = ['./tests/hermetic/no-real-effects.setup.ts'];

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
          setupFiles: HERMETIC_SETUP_FILES,
        },
      },
      {
        test: {
          name: 'integration',
          include: ['src/**/*.int.test.ts', 'tests/**/*.int.test.ts'],
          setupFiles: HERMETIC_SETUP_FILES,
        },
      },
      {
        test: {
          name: 'conformance',
          include: ['tests/conformance/**/*.conformance.test.ts'],
          setupFiles: HERMETIC_SETUP_FILES,
        },
      },
      {
        test: {
          name: 'smoke',
          include: ['tests/smoke/**/*.smoke.test.ts'],
        },
      },
    ],
  },
});
