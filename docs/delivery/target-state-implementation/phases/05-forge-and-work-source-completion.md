---
title: "Phase 05 - Forge and work-source real-effect completion"
status: "merged (#64)"
---

# Phase 05 - Forge and work-source real-effect completion

## Overview

Close the remaining gaps between the shipped real GitHub Forge and GitHub Issues work-source
drivers and what ADR 0023/0024 plus the product guarantees require of them: blocked-PR
surfacing (`MERGE-5`), done-vs-landed hold posture under branch protection and merge queues
(`MERGE-4`), landing-path redaction and real-effect idempotency verification, and the residual
work-source provenance/validation obligations. This is a gap-closure phase against existing
real drivers, not a new-driver phase.

## Background

M7 landed real drivers for both seams: `src/providers/real/forge.ts` shells out to `git`/`gh`
(push, PR create/merge/view, status, comment) and `src/providers/real/work-source.ts` imports
plan-bearing GitHub issues over `fetch`. EVRUN-partial exercised a real
work-source → forge → records-integrity run. But the evidence record explicitly does **not**
claim `MERGE-5`: the forge adapter carries block-surfacing primitives (`surfaceBlock`, status
and comment posting) with unit-level coverage, while no smoke or real-effect test proves
blocked-PR surfacing end to end; the `MERGE-4` hold posture
("done, merge pending" under branch protection/merge queue) and the exact-head re-read safety
property need verification against the live adapter; and ADR 0024's origin-bearing provenance
and importer-boundary validation deserve a completion audit. The transports themselves are
deliberately minimal (`gh` CLI + raw `fetch`) — that stays; this phase completes behavior, not
plumbing style.

## What To Do

- Complete and prove `MERGE-5` blocked-PR surfacing end to end as a distinct runner-invoked
  forge act (not a `land()` call), building on the adapter's existing
  `surfaceBlock`/status/comment primitives: when a story blocks and a safe branch plus push
  permission exist, open or update the PR, post status, and post the failure reasons as a
  comment; when it cannot safely do so, record the block through the durable records fallback —
  never drop it. No new event family: map onto the runner-action families the
  observability-records contract already names.
- Verify and complete the `MERGE-4` posture: a `done` story held by branch protection, merge
  queue, or conflict lands in the "done, merge pending" outcome rather than an error or a
  forced merge; re-attempts respect the exact-head re-read rule (changed head → diagnosable
  stop, not blind no-op or duplicate).
- Audit real-effect idempotency across resume against the live adapter (the `verifyLanding`
  replay path exists — prove it against real `gh` behavior in the smoke lane).
- Verify landing-path redaction: forge/GitHub tokens never appear in landing records; ambiguity
  stops the run.
- Complete the work-source residuals from ADR 0024: origin-bearing provenance (source system +
  identifier legible per candidate in the run record), importer input validation at the
  boundary (malformed issue bodies refuse with guidance), and multi-candidate behavior
  documented and tested; confirm the intake chokepoint's runtime marker still refuses
  direct-harness bypasses.

## Why

- `MERGE-4`, `MERGE-5` — product-guaranteed outcomes currently unproven; the track README names
  this as a known conflict this phase owns.
- ADR 0023 (7a/7b) and ADR 0024 (8a/8b) — this phase completes their acceptance surface
  (P7-AC/P8-AC anchors) beyond what EVRUN-partial claimed.
- `SEC-1`/`SEC-3` — landing-path secret redaction; runner-only forge credentials.
- Feeds P11 (a richer real path to capture) and P14 (guarantee-coverage audit).

## Technical Requirements

- `ForgePort.land()` stays runner-invoked only; `INV-002` structural — no agent-side landing
  path appears.
- Block surfacing must not change what `blocked` means in the lifecycle; it is a forge-side
  act plus records, not a state-machine change.
- Reference wiring byte-stable: `runner-action.skipped-on-dry-run` and the goldens unchanged.
- Real-effect tests live in the smoke lane against a disposable sandbox repo (the
  EVRUN-partial pattern); hermetic lanes use doubles and the guard stays intact.
- Unknown forge/work-source names keep failing closed; provenance always asserts jig-validated
  in addition to naming its origin.

## Reference Files

- [Realization roadmap — Phases 7 and 8](../../../archive/design/contracts/provider-realization-roadmap.md#phase-7-realization-adr-0023),
  ADR 0023 and ADR 0024 (`docs/archive/design/decisions/0023-*.md`, `0024-*.md`)
- [`product/guarantees.md`](../../../product/guarantees.md) — `MERGE-1..5`, `SEC-1/3`
- [EVRUN-partial record](../../../archive/design/evidence/2026-07-04-evrun-partial-smoke.md) — the
  claimed/not-claimed boundary
- Source: `src/providers/real/forge.ts`, `src/providers/real/work-source.ts`, `src/intake.ts`,
  `src/harness.ts` (blocked handling), `src/records.ts`, `src/redaction.ts`
- Tests: `tests/smoke/evrun-partial.smoke.test.ts`, forge/work-source unit and conformance
  tests (`*.p7*`, `*.p8*`)

## Dependencies

- **Requires:** nothing hard.
- **Soft:** start after P02 (source layout); coordinate notice/record vocabulary with P08 if
  concurrent.
- **Unlocks:** enriches P11; feeds P14.
- **Parallel:** P03, P04, P06, P08, P09, P10.

## Acceptance Criteria

1. A story blocked in a run with the real forge and a safe branch produces a real PR carrying
   posted status and a failure-reason comment (smoke evidence); with no safe branch/permission,
   the block is durably recorded and surfaced, not dropped.
2. A `done` story held by branch protection or merge queue ends in the held outcome; a changed
   head at re-attempt produces a diagnosable stop (smoke and unit coverage of both).
3. A repeated landing across resume is a recorded no-op against the real adapter (smoke).
4. No credential material appears in landing records under redaction tests; an injected
   ambiguity stops the run.
5. Per-candidate origin (source + identifier) is legible in the run record for real
   work-source runs; a malformed issue body refuses with actionable guidance; a marker-less
   direct `run`/`resume` call is refused and recorded.
6. Goldens byte-identical; hermetic guard intact; no new event family minted.

## Verification

- `pnpm check`; conformance lane including the p7/p8 regression anchors.
- Smoke-lane run against the disposable sandbox covering block-surfacing, held-merge, and
  idempotent re-landing; output linked in the PR with versions pinned.
- Reviewer axes: runner-only invocation, event-family reuse (no minting), redaction sample
  inspection, fail-closed on unknown names/actions.

## Out Of Scope

- New forge or work-source vendors, REST/GraphQL client libraries, or transport rewrites.
- Webhook/scheduler-driven intake (product deferral).
- Notices UX for blocks (P08 presents; this phase records and surfaces on the forge side).
- Contract or golden changes.

## Stop Or Escalate If

- Block surfacing cannot map onto existing runner-action families — the roadmap says no new
  family is minted; route to the records contract owner.
- Branch-protection/merge-queue postures require a policy vocabulary the current policy doc
  cannot express — route to design (policy model) rather than inventing config keys.
- Provenance legibility requires a frozen field — v0 is additive-only; route to the contract
  owner (P13 territory).
