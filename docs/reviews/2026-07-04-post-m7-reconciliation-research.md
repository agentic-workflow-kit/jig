---
title: Post-M7 product/design/delivery reconciliation research
date: 2026-07-04
commit: 2e68a8b (jig main)
org_commit: f90c4e2 (.github main)
verdict: Ready for product authoring after research stop
status: point-in-time research record
---

# Post-M7 product/design/delivery reconciliation research - 2026-07-04

> **Point-in-time record.** This document captures the Step 0 research pass for the post-M7
> reconciliation. It is durable context for the next product-authoring session and later design
> reconciliation, not a product contract, ADR, delivery track, or implementation plan.

## 1. Purpose

The research question was:

> What is authoritative, stale, missing, or contradictory across `.github` org state and `jig`
> product/design/delivery docs after M7, before product docs are authored and before any design,
> cleanup, or delivery-track changes?

The work was intentionally read-only. Product must be solid before design, design before cleanup, and
cleanup before the next delivery track. The next product pass is expected to run interactively in the
main session with the `define-product` skill, not through subagents.

## 2. Live State Checked

- `jig` was clean on `main` at `2e68a8b` (`docs: record Codex app-server transport ADR (#48)`).
- `.github` was clean on `main` at `f90c4e2` (`docs: flip M7 to done on EVRUN-partial evidence merge (#18)`).
- `define-product` was clean on `main`.
- `jig` and `.github` had only their main worktrees.
- `ghx` reported zero open PRs for `agentic-workflow-kit/jig`, `agentic-workflow-kit/.github`, and
  `agentic-workflow-kit/define-product`.

## 3. Method

The coordinator refreshed governing instructions and live state, then used Codex custom agents for
bounded evidence slices:

| Slice | Agent        | Model                 | Effort | Scope                                                        |
| ----- | ------------ | --------------------- | ------ | ------------------------------------------------------------ |
| B     | `researcher` | `gpt-5.3-codex-spark` | medium | `.github` milestones, roadmap, profile                       |
| C     | `researcher` | `gpt-5.3-codex-spark` | medium | `jig/docs/product/**`                                        |
| D     | `architect`  | `gpt-5.5`             | high   | `jig/docs/design/**`, especially ADRs 0026-0028 and evidence |
| E     | `researcher` | `gpt-5.3-codex-spark` | medium | `jig/docs/delivery/**`, especially `m7-real-providers`       |
| F     | `reviewer`   | `gpt-5.5`             | high   | Cross-check of the consolidated findings                     |

Each reader was read-only, was bounded to named paths, and returned facts, gaps, contradictions,
assumptions, stale evidence, unverified claims, citations, confidence, and remaining uncertainty.

Reviewer F found **no blocking findings** in the synthesis.

## 4. Findings

### Org State

- M7 is `done` at the org milestone level. EVRUN-partial satisfied the M7 exit evidence condition:
  `.github/MILESTONES.md` records that EVRUN-partial merged as Jig PR #45 and flipped M7 to `done`
  (`.github/MILESTONES.md:501-519`).
- EVRUN-full remains a named post-M7 debt for the Codex transport track, not a reopening of M7 exit
  (`.github/MILESTONES.md:504-519`).
- The v0 contract freeze still waits on transport and packaging design/evidence, not M7 exit evidence
  (`.github/ROADMAP.md:102-108`).
- M7 introduced no new org-level seam. Jig still owns the execution-plan contract shape and
  observability/event records (`.github/ROADMAP.md:92-96`).

### Product State

- Product docs are at the right altitude: they define Jig as a product contract and keep design details
  in design (`jig/docs/product/jig.md:13-20`, `jig/docs/product/jig.md:148-151`).
- Jig's product input boundary is approved execution plan plus policy; upstream lifecycle repos are
  optional strong defaults, not requirements (`jig/docs/product/jig.md:84-104`).
- Product already records the internal SDK boundary: CLI today, future MCP surface, consumers use SDK
  rather than internals, package remains private, no publish or stability promise exists now
  (`jig/docs/product/jig.md:153-159`).
- Product keeps the third-party installable provider ecosystem explicitly open
  (`jig/docs/product/jig.md:193-204`).

Product gaps for the next authoring pass:

- Package identity is ambiguous: product/profile text names `@agentic-workflow-kit/jig`, while
  `jig/package.json` currently names private `@agentic-workflow-kit/jig-repo`, exposes `bin: jig`, and
  has no `exports`.
- `jig-testkit` is design-settled as the future conformance package, but product docs do not yet state
  the product promise it supports.
- The owner-level OCP/extractable-provider requirement is not yet stated explicitly at product altitude.
- The product docs should keep EVRUN-full as post-M7 transport debt and must not imply that EVRUN-partial
  proves a Codex-driven agent leg.

### Design State

- Execution-plan input and observability records are versioned seams; changing their shape is breaking
  for downstream consumers (`jig/AGENTS.md:7-12`, `jig/docs/design/contracts/README.md:82-83`).
- Evidence records are decision inputs, not authority; ADRs and contracts remain authoritative over
  evidence summaries (`jig/docs/design/README.md:75-80`, `jig/docs/design/conventions.md:211-245`).
- ADR 0026 makes `self-report-only` a typed conformance-basis token, not a pass and not proof of
  real-provider behavior (`jig/docs/design/decisions/0026-conformance-self-report-only.md:32-60`).
- ADR 0027 settles the future internal package target:
  `@agentic-workflow-kit/jig-sdk`, `@agentic-workflow-kit/jig-cli`, and
  `@agentic-workflow-kit/jig-testkit`; the root remains a private workspace shell
  (`jig/docs/design/decisions/0027-packaging-sdk-boundary.md:70-82`).
- ADR 0027 is design-only. It creates no package files, exports, project references, dependency rules,
  source moves, or publish promise (`jig/docs/design/decisions/0027-packaging-sdk-boundary.md:131-132`,
  `jig/docs/design/decisions/0027-packaging-sdk-boundary.md:151-159`,
  `jig/docs/design/decisions/0027-packaging-sdk-boundary.md:177-178`).
- ADR 0028 chooses owned stdio Codex app-server as the first Codex transport target, requires
  compatibility preflight before dispatch, and fails closed if required app-server surface is absent
  (`jig/docs/design/decisions/0028-codex-app-server-transport.md:50-66`).
- ADR 0028 keeps the session-observable Codex seam internal to the real Codex adapter while public
  `AgentPort` stays final-result oriented (`jig/docs/design/decisions/0028-codex-app-server-transport.md:68-82`).
- ADR 0028 does not implement protocol types, create package exports, freeze contracts, or retire
  EVRUN-full (`jig/docs/design/decisions/0028-codex-app-server-transport.md:112-133`).

Design gaps and deferred evidence:

- Prompt-size/bounded-context behavior was not attempted, so oversize or unknowable prompts must fail
  conservatively until N1A-P13 supplies stronger evidence (`jig/docs/design/evidence/README.md:30-35`,
  `jig/docs/design/decisions/0028-codex-app-server-transport.md:105-107`).
- Windows/Git Bash process-tree termination is unproven; owned app-server execution is unsupported on
  Windows by default until N1A-P14 (`jig/docs/design/evidence/README.md:36-39`,
  `jig/docs/design/decisions/0028-codex-app-server-transport.md:108-110`).
- Busy/overlap and cleanup evidence remain narrow and should not be generalized.
- Exact T14 freeze field shapes, enums, proof encodings, and package/API signatures remain intentionally
  undecided until the contract-freeze authority acts.

### Delivery State

- `jig/docs/delivery/README.md` maps `m5b-local-mvp` as historical/superseded,
  `m5b-local-mvp-r2` as the live local track, and `m7-real-providers` as the Phases 6-9 track
  (`jig/docs/delivery/README.md:15-20`).
- `m7-real-providers` is still `status: active`, derives Phases 6-9 from org M7, and records load-bearing
  residuals A/B (`jig/docs/delivery/m7-real-providers/README.md:1-19`,
  `jig/docs/delivery/m7-real-providers/README.md:66-101`).
- No inspected delivery file marks P6/P7/P8/P9 as fully delivered with completion timestamps. Use these
  docs for phase/residual detail, not as the sole current status truth for M7.
- This is the main status drift: org M7 is `done`, while the local M7 delivery track remains active and
  residual-laden.

### Evidence State

- EVRUN-partial is durable evidence for one scoped path: real work-source, real Forge, and
  records-integrity against the disposable sandbox with a scripted/injected agent leg
  (`jig/docs/design/evidence/2026-07-04-evrun-partial-smoke.md:11-21`,
  `jig/docs/design/evidence/2026-07-04-evrun-partial-smoke.md:89-106`).
- EVRUN-partial explicitly is not EVRUN-full. It does not prove real Codex editing, real execution-host
  confinement, adversarial no-phone-home behavior, idempotent multi-run behavior, broader GitHub branch
  management, remote-host behavior, or Windows behavior
  (`jig/docs/design/evidence/2026-07-04-evrun-partial-smoke.md:108-116`).

## 5. Product-Session Handoff

Use this research as context for the next product pass. Run product authoring in the main session using
`define-product/skills/define-product/SKILL.md`:

```text
ingest material -> ask only what blocks a coherent PRD/product artifact -> ground every remaining
unknown as a visible assumption -> draft/update at product altitude -> assign and validate stable
acceptance/commitment IDs where applicable -> self-review for design/delivery leakage -> hand off
one next-step recommendation.
```

Treat Jig's current product docs as an idempotent resume/extend target, not a blank PRD. Do not rewrite
settled sections unless the product meaning must change. Carry unresolved items as visible assumptions
or open questions instead of silently deciding them.

Product authoring should cover:

- Clarify package identity and current private posture without implying a public package/API promise.
- State the product promise behind `jig-testkit` without importing package-layout mechanics into product.
- Add product-altitude language for the OCP/extractable-provider requirement: bundled providers should be
  replaceable or extractable because they exercise public SDK ports and registration/factory seams, not
  private core internals.
- Keep third-party installable provider ecosystem explicitly open.
- Keep EVRUN-full as named transport debt and avoid overclaiming EVRUN-partial.
- Keep app-server protocol, package matrices, project references, dependency rules, and delivery phase
  sequencing out of product prose.

Likely product-authoring target files:

- `jig/docs/product/jig.md`
- `jig/docs/product/guarantees.md`
- Possibly `jig/docs/product/concepts.md` if a concept entry is needed for SDK/testkit/provider-extension
  language.

## 6. Design Follow-Up Boundary

This research **does cover design enough** to serve as context for a later design reconciliation. Another
broad research pass across product/design/delivery should not be necessary before design work starts.

What will still be needed for design is a narrower follow-up after product authoring:

- Re-read the final product diffs and confirm which product commitments changed.
- Reconcile living design docs to ADR 0026, ADR 0027, and ADR 0028.
- Update or create design orientation for SDK/CLI/testkit architecture, provider extractability, Codex
  app-server adapter architecture, session-observable internal seam, preflight/fail-closed behavior, and
  remaining EVRUN-full/T14 gates.
- Keep design at how altitude; do not implement runtime code during design reconciliation.

In short: this research is sufficient shared context for both product and design. Product authoring should
run first. Design should then run a focused delta pass against the product changes and the already-cited
ADRs/evidence, not another full discovery pass from scratch.

## 7. Stop Conditions Preserved

- Do not treat delivery-track `active` as org-level M7 not-done.
- Do not treat EVRUN-partial as EVRUN-full.
- Do not create provider packages, MCP packages, transport packages, public ecosystem scaffold, package
  exports, or contract freeze from this research alone.
- Do not delete or rewrite durable evidence records.
- If product docs and ADRs conflict during authoring, stop and route the conflict to the owner instead of
  silently resolving it.
