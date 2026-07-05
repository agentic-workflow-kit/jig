---
title: "Phase 02 - Package split: jig-sdk, jig-cli, jig-testkit"
status: "merged (#56, #58)"
---

# Phase 02 - Package split: jig-sdk, jig-cli, jig-testkit

## Overview

Convert the repo into a pnpm workspace and decompose the single package into the three private
packages ADR 0027 authorizes: `@agentic-workflow-kit/jig-sdk` (core, ports, factory, bundled
providers), `@agentic-workflow-kit/jig-cli` (terminal adapter), and
`@agentic-workflow-kit/jig-testkit` (conformance suite, controlled doubles). Introduce boundary
enforcement in the same PR. Everything stays private; nothing is published.

## Background

ADR 0027 settled the target matrix and deliberately deferred all mechanics — workspace files,
project references, `exports` maps, dependency rules — "until the PR that actually creates the
second package." This is that PR. Phase 01 has already shaped the SDK surface in place, so this
phase is dominated by mechanical moves plus enforcement, not API design. The current
`pnpm-workspace.yaml` has no `packages:` field by explicit comment; `tsconfig.base.json` is
already `composite: true` and project-reference-capable.

## What To Do

- Create `packages/jig-sdk`, `packages/jig-cli`, `packages/jig-testkit` per the ADR 0027
  ownership table: SDK gets the entry module, factory, core run/records/intake/authorization
  modules, `src/ports.ts`, and `src/providers/**`; CLI gets `src/cli.ts` and `bin/jig.js`
  concerns; testkit gets `src/conformance/**` plus the controlled doubles and verdict helpers it
  needs.
- Wire the pnpm workspace (`packages/*`), per-package `package.json` (all `private: true`),
  per-package `tsconfig` with project references, and `exports` maps limited to the supported
  surfaces.
- Move test files with their subjects; keep the four Vitest lanes and the hermetic guard working
  across packages; keep the 90% coverage enforcement equivalent in strength.
- Introduce dependency-boundary enforcement (dependency-cruiser or equivalent) encoding the
  matrix: `cli → sdk`, `testkit → sdk`, and the forbidden edges (`sdk → cli`, `sdk → testkit`,
  `cli ↔ testkit`, deep imports across packages). Add it to `pnpm check`.
- Keep the root package as the private coordination shell owning repo scripts, formatting,
  aggregate checks (`pnpm check` fans out but checks no less), and the delivery-foundation
  check.
- Update `AGENTS.md`, root `README.md`, and `docs/design/README.md`'s "current runtime remains
  one private package" status line to describe the new layout truthfully.

## Why

- ADR 0027 decisions 1–3 and 5 — the three-package matrix, SDK-owned storage/ports, conformance
  out of the production graph, enforcement introduced with its subject.
- `DRIVE-1`/`DRIVE-4` — the conformance suite becomes the reusable provider proof surface
  (testkit) rather than production-tree code.
- `SEE-1..3` — records/projection semantics stay in the SDK so CLI, MCP, and embedding
  consumers inspect the same durable surface.
- Unlocks P12 (MCP consumes `jig-sdk`) and removes move-churn risk from P03–P10.

## Technical Requirements

- All packages `private: true`; no `publishConfig`, no semver/stability promise, no npm
  publication (product boundary; ADR 0027). `jig-testkit` stays internal — its public-package
  question is an open product question this phase must not answer.
- Golden run records byte-identical; CLI observable behavior unchanged; the
  `node bin/jig.js …` fixture flows in `AGENTS.md` keep working (paths may change only if
  `AGENTS.md` is updated in the same PR).
- `jig-sdk` must not import `jig-testkit` — the load-bearing edge; the conformance lane imports
  testkit against SDK ports.
- Bundled providers stay SDK-internal behind the factory, not deep-import surfaces.
- The fixture conventions guard (`scripts/check-delivery-foundation.mjs`) still passes; update
  it and the fixture README together only if paths force it.

## Reference Files

- [ADR 0027](../../../design/decisions/0027-packaging-sdk-boundary.md) (all five decisions)
- [ADR 0026](../../../design/decisions/0026-conformance-self-report-only.md) (why testkit is
  not a production dependency)
- [Driving contract — SDK package reconciliation](../../../design/contracts/driving.md#sdk-package-reconciliation)
- Source: entire `src/` tree, `bin/jig.js`, `pnpm-workspace.yaml`, `tsconfig.base.json`,
  `tsconfig.json`, `vitest.config.ts`, `.github/workflows/check.yml`
- Tests: all lanes; `tests/hermetic/no-real-effects.setup.ts`

## Dependencies

- **Requires:** P01 (the surface being moved must exist).
- **Unlocks:** P12 (hard); P03–P10 (soft — they should start after this lands to avoid moving
  targets).
- **Parallel:** none. This phase should be the only open PR while it is in flight.

## Acceptance Criteria

1. Three packages exist with the ADR 0027 ownership split; the root is a coordination shell
   with no runtime source.
2. Boundary enforcement runs inside `pnpm check` and demonstrably fails on a violation (the PR
   shows a red run for an intentional violation or an equivalent test of the rule).
3. `jig-sdk`'s export map exposes only the supported surface from P01; deep imports across
   packages are impossible for typed consumers and rejected by the boundary check.
4. All four golden records byte-identical; all Vitest lanes green; coverage enforcement intact.
5. Every package manifest is `private: true` and CI would fail on a publishable posture.
6. `AGENTS.md` and root `README.md` describe the new layout, commands, and unchanged public
   posture accurately.

## Verification

- `pnpm check` at root (fans out across packages, checks no less than before).
- Boundary-rule negative test (deliberate forbidden import fails).
- `pnpm build && node <cli-bin-path> run …` fixture flow works from a fresh checkout
  (`pnpm install --frozen-lockfile` first).
- Reviewer axes: matrix fidelity against ADR 0027's table, export-map minimality, gate strength
  equivalence, docs truthfulness.

## Out Of Scope

- Publishing, changesets, versioning tooling, or any public-package preparation.
- Extracting provider packages (explicitly not part of the N3 target — ADR 0027).
- New functionality of any kind; this is a topology change.
- MCP adapter placement (P12 routes it).

## Stop Or Escalate If

- The split cannot preserve golden byte-stability (something in record output embeds paths or
  package identity) — stop; route to the records design owner before changing goldens.
- Testkit needs SDK internals that the supported surface doesn't export — do not widen the
  export map reflexively; route the boundary question to design (it may be a testkit-internal
  double instead).
- Coverage enforcement cannot be kept equivalent across packages without threshold games —
  raise it rather than shipping a weaker gate.
