---
title: Post-product design reconciliation research
date: 2026-07-04
commit: afab36f (jig main)
org_commit: f90c4e2 (.github main)
technical_design_commit: 9c7bff9 (technical-design main)
verdict: Ready for later design-structure planning after research stop
status: point-in-time research record
---

# Post-product design reconciliation research - 2026-07-04

> **Point-in-time record.** This document captures the focused research pass after product PRs #49
> and #50. It is durable context for a later technical-design planning session and implementation
> planning, not a product contract, design doc, ADR, delivery plan, or implementation plan.

## 1. Purpose

The research question was:

> After the product docs were reconciled, what current Jig design inputs are authoritative, stale,
> missing, contradictory, or still implementation-only before living design docs are planned or
> edited?

This pass intentionally stops before any `DocStructurePlan`, design-doc edits, package changes,
runtime code, contract freeze, delivery-track cleanup, or evidence rewrite. Use it later as research
input for technical-design planning; do not treat this document itself as the plan.

## 2. Live State Checked

- `jig` was clean on `main` at `afab36f`
  (`docs: improve product-layer readability, visuals, and altitude placement (#50)`).
- Product PR #49 landed before PR #50 and reconciled the provider and package-boundary product
  language.
- `.github` was clean on `main` at `f90c4e2`
  (`docs: flip M7 to done on EVRUN-partial evidence merge (#18)`).
- `technical-design` was clean on `main` at `9c7bff9`.
- A dedicated worktree was created for this report:
  `/Users/aryekogan/repos/agentic-workflow-kit/worktrees/jig/docs-design-reconciliation-research`
  on branch `docs/design-reconciliation-research`.
- `ghx` reported zero open PRs for `agentic-workflow-kit/jig` and
  `agentic-workflow-kit/.github`.

## 3. Method And Source Map

The pass was read-only until this research record was written. The source map was:

| Cluster                  | Surfaces                                                                                                            | Research use                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Repo instructions        | `AGENTS.md`, `jig/AGENTS.md`                                                                                        | Confirmed product/design/delivery altitude and the rule that product conflicts must be named, not silently resolved. |
| Prior research           | `docs/reviews/2026-07-04-post-m7-reconciliation-research.md`                                                        | Baseline Step 0 research before the product PRs.                                                                     |
| Product                  | `docs/product/jig.md`, `docs/product/concepts.md`, `docs/product/guarantees.md`                                     | Current product truth after PR #49/#50.                                                                              |
| Org state                | `.github/MILESTONES.md`, `.github/ROADMAP.md`                                                                       | M7/N2 authority and sequencing facts.                                                                                |
| Design authority         | ADR 0026, ADR 0027, ADR 0028; `docs/design/README.md`; `docs/design/contracts/**`; `docs/design/evidence/**`        | Current design decisions, living front-door drift, and evidence limits.                                              |
| Runtime/source           | `package.json`, `src/ports.ts`, `src/bootstrap.ts`, `src/providers/real/agent.ts`, `src/conformance/**`, `tests/**` | Implementation facts that design docs must not overclaim.                                                            |
| Delivery                 | `docs/delivery/README.md`, `docs/delivery/m7-real-providers/**`                                                     | Status drift and stale implementation-track claims.                                                                  |
| Technical-design process | `technical-design` repo at `9c7bff9`                                                                                | Later planning input only; this report does not run or record a structure plan.                                      |

## 4. Findings

### Product Facts

- Product now clearly distinguishes product identity from package/export promises:
  `@agentic-workflow-kit/jig` names the product, while no public package, export, or stability promise
  exists today (`docs/product/jig.md:8-17`).
- The first-party programmatic surface is a product promise at boundary altitude: CLI today, future MCP
  next, and consumers should use that surface rather than Jig internals. Packaging and release mechanics
  remain design-owned (`docs/product/jig.md:161-166`).
- Provider replaceability is product scope. Bundled providers must act like replaceable providers, and
  compatible custom providers must be able to plug into supported seams without forking Jig core
  (`docs/product/jig.md:168-179`).
- The product promise behind `jig-testkit` is conformance, not package layout. Whether that surface is
  internal-only or public remains open (`docs/product/jig.md:181-185`).
- EVRUN-partial is accurately constrained at product altitude. The full Codex-driven agent leg remains
  unproven EVRUN-full debt (`docs/product/jig.md:199-202`).
- `docs/product/concepts.md` now mirrors the SDK/provider/conformance concepts at product altitude
  (`docs/product/concepts.md:138-158`).

### Org Facts

- `.github` marks M7 done. EVRUN-partial met the accepted M7 exit-evidence condition, and EVRUN-full
  remains named post-M7 Codex-transport debt rather than reopening M7 exit
  (`.github/MILESTONES.md:501-519`).
- N2 authorizes an internal SDK boundary now with no publishing or stability promise, while the
  third-party provider ecosystem question stays deferred and open (`.github/MILESTONES.md:520-527`).
- The current design-doc pass should not re-decide org-level M7/N2 state. It should reconcile living
  Jig design docs to those facts.

### Design Facts

- The living design README still frames design by fixed logic vs edge interfaces and still says package
  or source-code layout and provider driver protocols are deferred (`docs/design/README.md:13-14`,
  `docs/design/README.md:101-105`).
- ADR 0027 settles the later internal package target: `jig-sdk`, `jig-cli`, and `jig-testkit`, with the
  root package remaining a private workspace shell (`docs/design/decisions/0027-packaging-sdk-boundary.md:70-82`).
- ADR 0027 is explicitly design-only. It creates no packages, exports, project references, dependency
  rules, source moves, tests, or publish promise (`docs/design/decisions/0027-packaging-sdk-boundary.md:39-41`,
  `docs/design/decisions/0027-packaging-sdk-boundary.md:151-163`,
  `docs/design/decisions/0027-packaging-sdk-boundary.md:177-178`).
- ADR 0027 puts core run operations, plan intake, records/storage, authorization, provider ports,
  bundled provider implementations behind the factory, and the composition/factory surface inside the
  SDK boundary when package work begins (`docs/design/decisions/0027-packaging-sdk-boundary.md:94-115`).
- ADR 0027 keeps conformance out of the production runtime graph after the split: `jig-testkit` owns the
  provider conformance suite, while the SDK owns the tested ports and provider-facing types
  (`docs/design/decisions/0027-packaging-sdk-boundary.md:117-132`).
- ADR 0027 says the SDK factory should build on the existing `composeReferenceRun` pattern, keep
  concrete provider selection behind the factory, and allow consumers to supply configured provider
  hooks through typed SDK options rather than deep imports
  (`docs/design/decisions/0027-packaging-sdk-boundary.md:134-149`).
- ADR 0028 selects owned stdio app-server transport as the first Codex implementation target and
  requires compatibility preflight plus fail-closed behavior before dispatch
  (`docs/design/decisions/0028-codex-app-server-transport.md:52-66`).
- ADR 0028 widens the internal `CodexAgentSession` target seam to support session-observable approval,
  denial, interrupt, and resume correlation, while keeping public `AgentPort` final-result oriented
  (`docs/design/decisions/0028-codex-app-server-transport.md:70-82`).
- ADR 0028 carries explicit translation and evidence caveats: denial can coexist with a completed turn,
  overlap must be serialized, prompt-size/bounded-context behavior remains open, and Windows support
  must fail closed until proven (`docs/design/decisions/0028-codex-app-server-transport.md:90-110`).
- ADR 0028 authorizes design direction only. It does not edit source, introduce protocol types, create
  package exports, freeze contracts, or retire EVRUN-full
  (`docs/design/decisions/0028-codex-app-server-transport.md:112-133`).
- ADR 0026 limits conformance meaning: `self-report-only` is not a pass, a green controlled-double
  suite does not prove real-provider truth, and no contract or golden-fixture change is authorized by
  that ADR (`docs/design/decisions/0026-conformance-self-report-only.md:32-71`).

### Runtime Facts

- The live repo is still one private package named `@agentic-workflow-kit/jig-repo`, with `bin: jig`
  and no `exports` field (`package.json:1-21`).
- `AgentPort` is still final-result oriented: `execute(story): Promise<WorkerResult>`
  (`src/ports.ts:7-9`).
- The current `CodexAgentSession` implementation seam is still one-shot:
  `run(story): Promise<CodexSessionResult>` (`src/providers/real/agent.ts:18-20`).
- `LandingAction` is now a real union, `'push' | 'open-pr' | 'merge'` (`src/ports.ts:34-39`).
- Current runtime facts are implementation state, not design approval to freeze public APIs.

### Evidence Facts

- The evidence index defines committed evidence records as durable inputs to design decisions, with
  required limitations and citations; local `runs/` data stays uncommitted (`docs/design/evidence/README.md:8-16`).
- N1A-P13 prompt-size/bounded-context behavior was not attempted, and N1A-P14 Windows/Git Bash support
  was out of scope (`docs/design/evidence/README.md:30-39`).
- EVRUN-partial proves one real work-source to Forge to records-integrity path against the disposable
  sandbox with a scripted/injected agent leg (`docs/design/evidence/2026-07-04-evrun-partial-smoke.md:11-21`).
- EVRUN-partial explicitly does not prove EVRUN-full, real Codex editing, real execution-host
  confinement, adversarial no-phone-home behavior, multi-run idempotency, hosted/remote operation, or
  Windows behavior (`docs/design/evidence/2026-07-04-evrun-partial-smoke.md:108-116`).

### Delivery Facts

- `docs/delivery/README.md` still names the M7 real-providers track as the active Phases 6-9 track
  (`docs/delivery/README.md:13-20`).
- `docs/delivery/m7-real-providers/README.md` still has `status: active` and derives the repo track
  from org M7 (`docs/delivery/m7-real-providers/README.md:1-19`).
- Delivery planning explicitly must not introduce package layout, exports, provider manifests, runtime
  code, or design edits from delivery planning (`docs/delivery/README.md:27-36`).

## 5. Classified Inputs

### Facts

- Product, org, and ADRs are aligned on private/internal SDK posture, no public package promise, no
  publish promise, provider replaceability, conformance/testkit purpose, and EVRUN-full debt.
- ADR 0027 and ADR 0028 are ahead of the living design README and contract indexes.
- The current runtime remains pre-split and pre-session-observable; design docs must distinguish target
  architecture from shipped implementation.

### Gaps

- Living design front door does not yet route readers to SDK/package architecture or Codex app-server
  adapter design.
- Provider extractability/OCP mechanics are settled at product/ADR altitude but not yet clearly
  represented in the living provider contract.
- Codex app-server transport has ADR direction and evidence, but the contract-level adapter shape is
  not yet a living design page.
- Evidence gates for EVRUN-full, prompt-size, Windows, cleanup, and T14 freeze need to be visible when
  the design docs are planned.

### Contradictions

- No product-vs-ADR contradiction was found.
- No product-vs-runtime contradiction was found as long as runtime is described as current
  implementation fact rather than promised public API.

### Stale Evidence Or Drift

- `docs/design/README.md` still says package/source layout and provider protocols are deferred even
  though ADR 0027 and ADR 0028 now settle design direction.
- `docs/delivery/m7-real-providers/README.md` still says the track is active while org M7 is done.
- `docs/delivery/m7-real-providers/README.md` still describes `LandingRequest.action` as one stale pipe
  literal, but `src/ports.ts` now has the proper union.
- `docs/design/evidence/README.md` still describes the EVRUN-partial record as pending coordinator fill
  even though the evidence file itself is applied and filled.

### Assumptions For Later Planning

- A later technical-design pass should treat this record as research input, then produce its own
  approved structure plan before editing living design docs.
- Exact SDK factory names, exported type names, package file layout, project-reference wiring,
  dependency-enforcement tooling, and public/provider publication posture remain undecided until the
  relevant design or implementation authority acts.

## 6. Open Blockers And Stop Conditions

- Do not create runtime code, package files, exports, project references, schema freezes, delivery
  trackers, provider manifests, or evidence rewrites from this report.
- Do not treat EVRUN-partial as EVRUN-full.
- Do not treat `.github` M7 done as approval to delete or rewrite the M7 delivery track in this pass.
- Do not treat ADR 0027 as authorization to create packages without a later implementation plan.
- Do not treat ADR 0028 as authorization to leak app-server protocol types into public `AgentPort`,
  runner, Fence, records, Forge, or work-source contracts.
- If later planning finds a product/ADR/design conflict, stop and route it to the owner instead of
  reconciling silently.

## 7. Later Use

Use this report as the durable research package for the next session that plans living design-doc
updates or implementation sequencing. That later session should decide structure explicitly. This
report intentionally does not propose target files, doc structure, implementation slices, package
layout, or PR sequencing.
