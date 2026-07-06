---
title: "Phase 11 - EVRUN-full evidence"
status: "pr #70 — blocked evidence record"
---

# Phase 11 - EVRUN-full evidence

## Overview

Run and commit the EVRUN-full evidence: a real, end-to-end Codex-driven delivery — GitHub
Issues work source, real Codex agent over the app-server transport, real execution-host
containment, real GitHub Forge landing, integrity and redaction active — plus the adversarial
probes EVRUN-partial could not claim (no-phone-home, multi-run idempotency). The implemented P11
record is an honest blocked capture attempt: the narrow Codex app-server and real-host smoke probes
were refreshed, but the combined EVRUN-full path could not run because the sandbox GitHub and
integrity prerequisites were absent. Product code changes are not this phase's purpose.

## Background

The evidence boundary is explicit: EVRUN-partial "does not prove real Codex editing, real
execution-host confinement, adversarial no-phone-home behavior, multi-run idempotency,
hosted/remote operation, or Windows behavior." The first four are exactly what P03 (transport)
and P04 (containment) build; the last two stay out (product deferral; N1A-P14 gate). The
product's "What Jig isn't (yet)" carries the same debt line, and the T14 contract freeze is
gated on this evidence path. This phase is the proof step: it converts "implemented" into
"proven," and its Limitations section keeps the claim honest.

## What To Do

- Extend the existing smoke-lane pattern (`tests/smoke/evrun-partial.smoke.test.ts`, disposable
  sandbox repo) into an EVRUN-full scenario: seed a real issue, run with
  `agent: 'codex'`, `executionHost: 'real'`, `forge: 'github'`,
  `workSource: 'github-issues'`, integrity key set, and drive a real Codex editing leg to a
  real landed (or honestly held/blocked) outcome.
- Capture the adversarial no-phone-home probe: exercise the P04 negative egress check against a
  real workload and record the observed confinement behavior.
- Capture multi-run idempotency: re-run/resume against the already-landed effect and record the
  no-op recognition and exact-head safety behavior.
- Commit dated evidence records under `docs/design/evidence/` per the evidence convention:
  exact versions (Codex CLI, macOS, gh), content hashes for captured transcripts, redaction
  statement, required `Limitations` section (hosted/remote, Windows, and anything observed but
  not proven stay named), and citations to the guarantee/AC IDs the evidence supports.
- Update the evidence index and the status surfaces the evidence changes: the EVRUN lines in
  root `README.md`, `AGENTS.md`, and the product page's "What Jig isn't (yet)" debt bullet —
  routed as a product-layer touch in the same PR, updating only the status claim, not the
  promise.
- Fix nothing silently: defects found during capture are routed to the owning phase/PR; the
  evidence records what actually happened.

## Why

- Attempts the EVRUN-full gate named in
  [`evidence/README.md`](../../../design/evidence/README.md#evrun-evidence-boundary) and echoed
  in [`product/jig.md`](../../../product/jig.md#what-jig-isnt-yet).
- A successful capture would prove `SEC-2` (no-phone-home proven, not asserted), `RESUME-3` (no
  double effect against real systems), and `MERGE-2`/`FENCE-3` observations on a real path.
- The implemented blocked capture attempt does not unlock P13 or authorize P14 status claims;
  those remain gated on either EVRUN-full evidence or an explicit owner decision to defer the gate.

## Technical Requirements

- Evidence is captured on pinned versions and says so; it is input to decisions, not authority
  (conventions §6).
- The scripted-agent EVRUN-partial record stays in place untouched — the new records supersede
  nothing retroactively; they add coverage.
- All capture runs against disposable/sandbox targets; no real project repo is touched;
  credentials via environment only; every committed artifact passes the redaction check.
- Hermetic CI lanes remain unaffected — EVRUN-full runs are operator-initiated, opt-in smoke
  work.
- If the full path cannot complete, the honest outcome is a partial record with an exact
  Limitations statement and routed defects — not a weakened claim of "full."

## Reference Files

- [`design/evidence/README.md`](../../../design/evidence/README.md) and the
  [EVRUN-partial record](../../../design/evidence/2026-07-04-evrun-partial-smoke.md) (pattern
  and boundary)
- [Conventions §6 — evidence records](../../../design/conventions.md#6-evidence-appendix-convention-committed-records-are-inputs-to-decisions-not-authority)
- [ADR 0028](../../../design/decisions/0028-codex-app-server-transport.md) (what the transport
  evidence must and must not claim)
- Source/tests: `tests/smoke/evrun-partial.smoke.test.ts`, P03/P04 outputs,
  `src/integrity.ts`, `src/redaction.ts`

## Dependencies

- **Requires:** P03 and P04 (hard).
- **Benefits from:** P05 (block-surfacing and held-merge paths worth capturing in the same
  sweep).
- **Would unlock:** P13 (hard) and P14 status claims only after EVRUN-full evidence or an explicit
  owner deferral decision.
- **Parallel:** P07–P10, P12 may proceed concurrently.

## Acceptance Criteria

1. A committed, dated EVRUN-full evidence record (or record set) exists under
   `docs/design/evidence/`, indexed, convention-complete (versions, hashes, Limitations,
   redaction statement, ID citations).
2. The record demonstrates: real Codex editing through the owned app-server transport; real,
   exercised confinement with honest strength; an adversarial no-phone-home observation; and
   multi-run idempotency against a real landed effect.
3. Hosted/remote operation and Windows behavior are explicitly restated as out of scope in the
   Limitations section.
4. README/AGENTS/product status lines about EVRUN reflect the new boundary — no claim exceeds
   the record.
5. Any defect discovered is filed/routed with a pointer in the record, not silently patched in
   this PR.

## Verification

- Independent reviewer replays the record's claims against the committed transcript hashes and
  the smoke scenario definition.
- Redaction sweep of every committed artifact.
- `pnpm check` (docs formatting; no runtime changes expected in this PR beyond smoke-test
  scenario code).

## Out Of Scope

- Remote/hosted operation, Windows (N1A-P14), managed daemon evidence.
- Contract freeze itself (P13).
- Implementation fixes beyond trivial test-scenario plumbing — defects route to owning phases.
- Re-running N1a probes unless the preflight reveals drift (then capture per convention).

## Stop Or Escalate If

- The real path fails in a way that implicates a settled design decision (transport choice,
  port shape, records shape) — stop and route to design authority with the evidence; do not
  code around it.
- Any capture would commit material that cannot be confidently redacted — stop and ask the
  owner (evidence convention's redaction rule).
- Codex CLI drift breaks the N1a-era assumptions badly enough that the preflight cannot pass on
  a current version — the transport needs fresh evidence (a new N1a-style capture), which is an
  owner-visible scope addition.
