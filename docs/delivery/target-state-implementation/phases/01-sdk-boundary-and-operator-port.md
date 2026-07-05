---
title: "Phase 01 - SDK boundary and operator-control surface"
status: "merged (#55)"
---

# Phase 01 - SDK boundary and operator-control surface

## Overview

Create Jig's supported programmatic surface inside the current single package: a consumer-safe
session factory built on `composeReferenceRun`, a single supported entry module, and an
operator-control port realization for the current contract-listed driving commands already
shipped through the CLI (`preview`, `run`/start, `inspect`). Rework the CLI to consume only that
surface and route `resume` placement before exposing it as a driving verb. No package files,
workspace changes, or source moves — those are Phase 02.

## Background

ADR 0027 settles the packaging target and its own sequencing: "create the SDK boundary first,
then move the CLI adapter to consume it, and move conformance to testkit when that package
exists." Today `src/cli.ts` reaches directly into `bootstrap.ts`, `plan-validator.ts`,
`intake.ts`, `harness.ts`, `projection.ts`, and `resume.ts`; there is no named surface a
first-party consumer could call, and no `exports` map. The driving contract requires all
adapters to be thin realizations of one operator-control port with no run logic at the edge.
Doing this in place, before the split, means Phase 02 moves a surface that already exists
instead of inventing one mid-move.

## What To Do

- Promote a higher-level SDK factory around the `composeReferenceRun(options)` pattern in
  `src/bootstrap.ts` (ADR 0027, decision 4) that returns a consumer-safe session/control-plane
  surface for `preview`, `run`/start, and `inspect`, with typed options including the existing
  provider hooks (`codexSession`, `realHostProbe`, scripted output). The factory name is this
  phase's to choose; the factory stays the sole importer/selector of concrete providers.
- Route `resume` placement before implementation. The CLI already ships `jig resume`, and ADR
  0027 expects a programmatic resume route, but the active driving contract does not name resume
  as a deliberate driving action. Decide with the driving/core owners whether resume belongs on
  the operator-control port, a recovery API adjacent to it, or a CLI-only recovery surface, then
  wire the CLI through the settled supported surface.
- Define one supported entry module (for example `src/index.ts`) that exports the factory, the
  four provider port types from `src/ports.ts`, plan intake, and the typed results the CLI
  renders. Everything not exported there is internal.
- Refactor `src/cli.ts` so each subcommand is a thin realization of the operator-control port:
  argument parsing, file loading convenience, one control-plane call, presentation, exit code
  for contract-listed driving actions. `resume` follows the recorded placement decision. Plan
  validation, provider selection, records semantics, and run-lifecycle meaning move behind the
  supported surface (most already live in the right modules; the CLI stops reaching past them).
- Realize the one-command / one-control-plane-call / one-audit-event invariant for the existing
  verbs to the extent the current record vocabulary allows. If honoring the audit-event leg for
  `inspect`/`preview` requires new record events on the reference path, stop (see below) rather
  than changing goldens silently.
- Update `AGENTS.md`/`README.md` only if the described CLI behavior changes (it should not).

## Why

- `CFG-7` — the SDK is the extension/programmatic seam; the product boundary says consumers use
  the SDK instead of reaching into internals ([`jig.md`](../../../product/jig.md#product-boundaries)).
- `SURF-001` / `ENF-001` — one operator entry surface; the edge holds no run logic and imports
  no provider contracts ([driving contract](../../../design/contracts/driving.md)).
- ADR 0027 decisions 2 and 4 — SDK boundary owns storage/ports/factory; factory shape builds on
  `composeReferenceRun`.
- Unblocks P02 (the split moves this surface) and gives P08–P10 and P12 the port they extend.

## Technical Requirements

- The factory remains the sole importer of provider implementations; unknown driver names keep
  failing closed (`ProviderSelectionError` behavior preserved).
- The CLI keeps its exact observable behavior: same commands, flags, output, exit codes; golden
  run records stay byte-identical; `bin/jig.js` keeps working after `pnpm build`.
- No `exports` map, no new packages, no source moves, no publish-shaped changes (ADR 0027
  defers enforcement tooling to the split PR).
- Deep imports from `tests/` into `src/` internals may remain for now; only the production CLI
  path must go through the supported surface.
- Immutability, boundary validation, explicit error handling per repo conventions.

## Reference Files

- [ADR 0027](../../../design/decisions/0027-packaging-sdk-boundary.md) (decisions 2, 4, 5)
- [Driving contract](../../../design/contracts/driving.md)
- [`core/bootstrap.md`](../../../design/core/bootstrap.md) (launch sequence, preview-vs-start
  boundary)
- Source: `src/cli.ts`, `src/bootstrap.ts`, `src/ports.ts`, `src/harness.ts`,
  `src/plan-validator.ts`, `src/intake.ts`, `src/projection.ts`, `src/resume.ts`, `bin/jig.js`
- Tests: `tests/cli.int.test.ts`, `tests/records-golden.int.test.ts`

## Dependencies

- **Requires:** nothing.
- **Unlocks:** P02 (hard), P03 (hard — it wires the Codex session through this factory's typed
  options), P08, P09, P10 (hard — they extend this port), P12 (via P02).
- **Parallel:** none recommended; this touches the same files most other phases touch.

## Acceptance Criteria

1. A named SDK factory exists, is the only production path that composes providers, and returns
   a typed session surface covering preview, run/start, and inspect, plus the settled resume
   surface if the placement decision keeps resume in this phase.
2. `src/cli.ts` imports only the supported entry module; a grep for CLI imports of
   `harness`/`bootstrap`/`projection`/`resume` internals comes back empty.
3. One supported entry module defines the boundary; its exports are enumerated in the PR
   description with a one-line justification each.
4. CLI behavior is unchanged: `tests/cli.int.test.ts` passes without expectation edits, and all
   four golden run records are byte-identical.
5. The conformance suite and hermetic guard pass unmodified.

## Verification

- `pnpm check` (all lanes; coverage threshold intact).
- `git diff --stat` against goldens shows zero changes under `tests/fixtures/`.
- Manual: `pnpm build && node bin/jig.js run …` fixture flow from `AGENTS.md` produces the same
  output as on `main`.
- Reviewer axes: boundary honesty (no run logic left in the CLI), export-surface minimality,
  factory as sole provider importer.

## Out Of Scope

- Creating packages, workspace files, `exports` maps, or dependency-rule tooling (P02).
- New driving verbs (P08, P09, P10) or MCP (P12).
- Any change to record content or golden files.
- Renaming or redesigning `AgentPort`/`ExecutionHostPort`/`ForgePort`/`WorkSourcePort`.

## Stop Or Escalate If

- Realizing the audit-event invariant for existing verbs requires new events on the reference
  path (golden changes) — route the golden/records ownership question to the records design
  owner; do not change goldens inside this phase.
- The factory shape cannot cover resume/inspect without widening a provider port — route to
  design authority per ADR 0028 decision 4's pattern (seam-shape questions go back to design).
