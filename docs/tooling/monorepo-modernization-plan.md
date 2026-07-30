---
title: "Monorepo tooling modernization plan"
status: proposed — non-governing until owner approval
owner: Arye Kogan
date: 2026-07-30
scope:
  Workspace substrate only — Node.js, TypeScript, pnpm, Turborepo, testing lanes, linting,
  formatting, worktrees, CI, and verification commands. It authorizes no runtime unit, provider,
  adapter, storage, CLI/MCP surface, credential, release, or external effect.
---

# Monorepo tooling modernization plan

This plan modernizes the workspace substrate ahead of the greenfield delivery track's
implementation phases. It replaces an external research proposal that was written against the
repository state before [PR #118](https://github.com/agentic-workflow-kit/jig/pull/118)
(`refactor(repo): simplify repository gates`) and therefore targeted components that no longer
exist. Every decision below was re-derived from the current `main`, the approved design, and
primary-source verification of the external toolchain facts.

## 1. Verified baseline

Repository facts (current `main`):

- Four private, pure, compiled ESM packages (`codec`, `runtime-contracts`, `conformance`,
  `authority-kernel`) built with package-local `tsc -p`, tested with `node:test` against `dist`.
- `tools/repo-guard` is dependency-light: the package-boundary guard is manifest/regex-based and
  has **no TypeScript compiler-API dependency**. The former evidence writer
  (`write-evidence.mjs`), runtime-topology guard, delivery-track checker, and the
  project-reference workspace fixture were all removed by PR #118.
- The structure guard pins `packageManager: pnpm@11.9.0` exactly, so a pnpm bump must update the
  guard expectation in the same change.
- [`GF-001`](../delivery/greenfield/stories/GF-001.md) still names "project references" and
  "TypeScript reference configuration" while the live build graph is pnpm workspace edges plus
  Turborepo `^build` plus package-local `tsc -p`.

External facts (verified 2026-07-30 against primary sources):

- **TypeScript 7.0** (native Go compiler) went stable on 2026-07-08; the stable programmatic
  compiler API is deferred to TypeScript 7.1 (expected around October 2026)
  ([announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)).
  Supports the compiler decision in section 2; because no repository tool consumes the compiler
  API, the 7.1 constraint does not affect this repository.
- **Node.js 24** is Active LTS and Node 22 is maintenance
  ([release table](https://nodejs.org/en/about/previous-releases)); Node 26 is scheduled for LTS
  promotion in October 2026 and Node moves to one major release per year starting with Node 27
  ([schedule announcement](https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule)).
  Supports the runtime decision and the annual-bump policy in section 2.
- **Turborepo 2.8+** (repository currently pins 2.10.5) shares the local cache across Git
  worktrees automatically when no custom `cacheDir` is set and supports task descriptions
  ([2.8 release notes](https://turborepo.dev/blog/2-8)); `--summarize` run summaries are
  documented in the [run reference](https://turborepo.dev/docs/reference/run). Supports the task
  runner and verification decisions in section 2.
- **pnpm 11** (repository currently pins 11.9.0) ships supply-chain controls as first-class
  settings — `minimumReleaseAge` and its strict/missing-time variants, `trustPolicy`,
  `trustLockfile`, `blockExoticSubdeps` (the last already defaulting to true) — per the
  [11.0 release post](https://pnpm.io/blog/releases/11.0) and the
  [settings reference](https://pnpm.io/settings); pnpm 11.13 added native workspace release
  management using Changesets-compatible `.changeset/*.md` files
  ([11.11–11.14 release post](https://pnpm.io/blog/releases/11.11-11.14)). Supports the package
  manager, security-settings, and release-machinery decisions in section 2.

## 2. Decisions

| Area                | Decision                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| Runtime             | Node 24 LTS, exact in dev and CI; annual bump after each LTS promotion (next: Node 26, ~Oct 2026) |
| Package manager     | Current stable pnpm 11.x clearing the release-age policy; structure-guard pin updated in step     |
| Task runner         | Current stable Turborepo 2.10.x; no custom `cacheDir`; automatic worktree cache sharing           |
| Compiler            | TypeScript 7.x as the only package compiler; no compatibility island needed                       |
| Emitter             | `tsc -p` per package; no workspace bundler (`tsdown`, `tsup`, esbuild, swc, Rollup)               |
| Module format       | ESM only, `NodeNext`; no CommonJS output; object-form `exports` with a `types` condition          |
| Build orchestration | pnpm workspace edges + Turbo `^build`; TypeScript project references are not a live orchestrator  |
| Contract tests      | `node:test` executing emitted `dist` artifacts remains the authoritative lane                     |
| Source-unit tests   | `test:unit` is a reserved package-local lane name; unused until a story-owned need exists         |
| Lint/format         | Biome (code/JSON) + Prettier (Markdown/YAML) retained; no Oxlint or Oxfmt lanes now               |
| Verification        | `pnpm verify` = full graph, cache reads bypassed, run summary emitted                             |
| Evidence            | Dedicated substrate slice (PR D) binding `pnpm verify` run summaries to exact candidates          |
| Release machinery   | None; nothing is published and the product is private and user-run                                |
| Remote cache        | None; single-host, single-trust-boundary product — local worktree cache is sufficient             |

Rationale in one line each:

- **`tsc`, not transpilers/bundlers:** declarations are the inter-package contract, so the
  type-check cannot be skipped; TypeScript 7's native compiler removes the speed argument for a
  second emitter, and bundling would collapse the module boundaries the guards and golden
  consumer reason about.
- **`node:test` against `dist`:** the product's proof model is that verified bytes are executed
  bytes; a second transform pipeline (e.g. Vitest's esbuild transform) reintroduces
  source-versus-artifact divergence exactly where the design treats divergence as a trust failure.
- **ESM only:** all six planned runtime units are Node processes on a pinned user-run runtime with
  no external package consumers; Node 22+/24 `require(esm)` covers any hypothetical straggler.
- **Evidence has one owner:** the delivery track's
  [verification contract](../delivery/greenfield/verification.md) governs exact-candidate
  evidence, and the GF-004 conformance harness already landed with Phase 0. Binding `pnpm verify`
  run summaries to candidates is therefore its own bounded substrate slice (PR D) — neither
  freestanding tooling nor a retrofit into a completed story.

## 3. Package archetypes and task conventions

The delivery track will add many packages. They must be born uniform, not retrofitted. Every
future package is created as one of these archetypes; a new archetype requires updating this
section first.

| Archetype                 | Examples (future)                          | Tasks                                         | Notes                                                                                     |
| ------------------------- | ------------------------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| A — pure library          | current four packages                      | `build`, `lint`, `test`                       | No ambient capabilities; contract tests against `dist`; golden vectors where applicable   |
| B — runtime unit          | controller, operator processes             | A's tasks + `dev` (persistent, non-cacheable) | Long-running process entrypoints; contract tests still execute `dist`                     |
| C — provider adapter      | file ledger/registry/witness/artifact      | A's tasks + qualification-oracle tests        | Effects only through the owning story's declared port contract and fixtures               |
| D — distributable surface | consumer facade / Envelope Builder install | decided by its owning story                   | The only archetype that may bundle (or use SEA), at its own edge, when distribution lands |

Conventions that hold across archetypes:

- Manifest shape: `"private": true`, `"type": "module"`, object-form `exports`
  (`{".": {"types": "./dist/index.d.ts", "import": "./dist/index.js"}}`), internal edges as
  `workspace:*`, tool versions via `catalog:`.
- Task vocabulary is closed: `build`, `lint`, `test`, `test:unit` (reserved), `dev` (persistent),
  `guard:*` (repo-guard only). Watch/dev tasks are `persistent: true`, `cache: false`.
- Every Turbo task carries a `description` stating what it proves or produces.
- Package-boundary directions are extended in `check-package-boundaries.mjs` in the same PR that
  adds a package; a package with no declared direction fails closed.
- `sideEffects: false` may be added only with a guard proving import purity; it is not template
  boilerplate.

## 4. Migration slices

Four substrate slices, each independently green. Doing them now — while the workspace is four
small packages — is deliberate: every slice's cost scales with package count, and the track is
about to grow it.

**PR A — contract wording (delivery-track governed).** Correct
[`GF-001`](../delivery/greenfield/stories/GF-001.md) so the recorded substrate matches the live
one: the build graph is workspace edges + Turbo `^build` + package-local `tsc -p`; project
references are not a second live orchestrator. This edits a governed story file and follows the
delivery track's own change rules.

**PR B — substrate bump (mechanical, no package-output changes).**

- Node 24 LTS exact: `nodeVersion`, CI `node-version`, `engines.node` range, `devEngines` with
  `onFail: error`.
- Current pnpm 11.x and Turbo 2.10.x clearing `minimumReleaseAge`; update the structure guard's
  `packageManager` expectation in step.
- Promote `verifyDepsBeforeRun` from `warn` to `error` (the workspace comment already schedules
  this).
- Make security-relevant pnpm defaults explicit: `minimumReleaseAgeStrict`,
  `minimumReleaseAgeIgnoreMissingTime`, `blockExoticSubdeps`, `trustLockfile`; evaluate
  `trustPolicy: no-downgrade` in a dedicated follow-up with an audited lockfile.
- CI: `ubuntu-24.04` instead of `ubuntu-latest`, job timeout, pull-request concurrency with
  cancellation, current major actions pinned by commit SHA.
- Add `"verify": "turbo run check guard --force --summarize"` as the cache-bypassing
  authoritative command; `check` and `check:affected` keep their current roles.

**PR C — TypeScript 7.** Catalog bump to TypeScript 7.x; fix 6.x deprecations; adopt the full
strict set now (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
`noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`,
`verbatimModuleSyntax`, `moduleDetection: "force"`) on the current small surface; move package
`exports` to object form; target ES2024. The same slice must extend
`check-package-boundaries.mjs` and its fixtures to accept exactly the object export shape
(`types`/`import` conditions resolving from `dist`), which the guard currently rejects because it
only accepts string-form `exports`; otherwise the slice cannot be independently green. Acceptance:
golden vectors byte-identical, declaration digests reviewed, `incremental`/`tsBuildInfoFile`
behavior under the native compiler verified, boundary-guard positive and negative fixtures for
object exports, full `pnpm verify` green.

**PR D — verification evidence binding (after PR B).** Add a repo-guard evidence step that
consumes the `pnpm verify` Turbo run summary and records the candidate commit/tree before and
after verification, toolchain versions, and per-task hash, status, and cache origin. It fails
closed when a required task is missing, failed, or restored from cache in the final run, or when
the candidate drifted during verification, with negative fixtures proving each fail-closed path.
Scope stays aligned with the delivery track's
[verification contract](../delivery/greenfield/verification.md): the step records evidence and
never widens authority.

## 5. Triggered deferrals

Each deferred item has an explicit trigger. Before the trigger fires, adding the item is scope
creep; when it fires, the owning story decides.

| Trigger                                                          | Action                                                                                    |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| First behavior-heavy package (likely GF-010/GF-011)              | Decide package-local Vitest for the reserved `test:unit` lane; contract lane is unchanged |
| First story adding real runtime dependencies (phase 2 providers) | Pilot `enableGlobalVirtualStore` for worktree installs, with cold/warm measurements       |
| Node 26 LTS promotion (~October 2026)                            | Annual runtime bump PR, same shape as PR B                                                |
| Distribution story for archetype D                               | Per-package bundling/SEA decision and any release tooling decision, owned by that story   |
| Lint wall time becomes noticeable in `pnpm check`                | Evaluate Oxlint via a temporary shadow comparison, then choose one linter                 |
| Oxfmt leaves beta with full Markdown/YAML coverage               | Formatting-only qualification candidate; never combined with semantic changes             |

## 6. Rejected alternatives

- **Vitest as the authoritative runner** — tests would exercise a third compiler's transform
  output instead of the shipped artifacts, and would add a native-binary dependency tree against
  the `allowBuilds: {}` posture. Node 22+/24 `node:test` covers watch, mocking, and snapshots.
- **esbuild/swc/tsdown/tsup as workspace emitters** — no type-check, no declarations, second
  output path, native install scripts; solves a compile-speed problem TypeScript 7 already
  removed.
- **CommonJS or dual-format output** — no external consumers exist or are planned; dual output
  adds a second artifact to test and the dual-package hazard for nobody.
- **TypeScript 6 compatibility island** — the prior proposal's central seam; obsolete because no
  tool here consumes the compiler API after PR #118.
- **Freestanding evidence-writer rebuild** — duplicates GF-004's ownership; see section 2.
- **Oxlint/Oxfmt adoption now, root Vitest project, remote cache, Changesets, generic
  shared/util packages** — rejected for the reasons recorded in sections 2 and 5; each has a
  trigger or a standing rejection.

## 7. Provenance

Derived from: current `main` after PR #118; [`AGENTS.md`](../../AGENTS.md);
[`runtime.md`](../redesign/design/runtime.md) and
[D10](../redesign/design/decisions/D10-runtime-decomposition.md) for the future package
archetypes; the [greenfield delivery track](../delivery/greenfield/README.md) for phase scope and
evidence ownership; an external 2026-07-30 research proposal (used as prior art, re-verified
claim by claim); and primary-source checks of the TypeScript 7.0 release announcement, Node.js
release schedule, Turborepo 2.8+ release notes, and pnpm 11 settings and release-management
documentation.
