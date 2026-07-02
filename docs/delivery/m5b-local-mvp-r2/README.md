---
title: "M5b local MVP delivery roadmap (r2)"
status: active
---

# M5b local MVP delivery roadmap (r2)

The live delivery track for the M5b local MVP. It is **revision 2**: the original roadmap
(archived at [`../m5b-local-mvp/`](../m5b-local-mvp/README.md)) delivered Phases 0–2 but, per
the post-Phase-2 repository review
([`../../reviews/2026-07-02-post-phase-2-repo-review.md`](../../reviews/2026-07-02-post-phase-2-repo-review.md)),
silently deferred org-M5 exit criteria and let the implementation drift from the records
contract without a recorded mapping. This revision starts from delivered reality: it names
what shipped, maps every org-M5 exit criterion to the phase that closes it, and records the
remediation and governed-local-run phases that precede the remaining reliability/provider work.

## What has been delivered

- **Phase 0 — Delivery Foundation** ([PR #14](https://github.com/agentic-workflow-kit/jig/pull/14)):
  fixtures, conventions, `delivery:check` gate.
- **Phase 1 — Local Plan Runner** ([PR #15](https://github.com/agentic-workflow-kit/jig/pull/15)):
  `jig run <plan>` over the plan-intake boundary, scripted-worker stub, durable two-file
  records (`run.json` + `events.jsonl`), human-readable summary.
- **Phase 2 — Local Workflow Runner** ([PR #16](https://github.com/agentic-workflow-kit/jig/pull/16)):
  multi-item sequential plans, dependency-aware blocking, `jig inspect <run-dir>`, failure
  diagnostics, changed-files capture.
- **Toolchain** (remediation, [PR #19](https://github.com/agentic-workflow-kit/jig/pull/19)):
  TypeScript engine-archetype migration; `pnpm check` now enforces lint + typecheck + tests
  with 90% coverage thresholds.
- **Phase R — Remediation**: records-contract convergence per ADR 0017, value-checking evidence
  gate, fail-closed CLI flags, and normalized golden record assertions.
- **Phase 3 — Governed Local Runs**: `jig preview`, per-request local authorization records,
  local Doorbell approve/reject, runner-owned dry-run skip records, and the adjusted canonical
  triad golden.

**Recorded local-MVP boundaries** — know these before building on it: preview is stdout-only per
[ADR 0019](../../design/decisions/0019-phase-3-local-governance-scope.md), routed approvals are
same-process local decisions, and real workers, resume, remote approvals, replay inspect, and
Forge/GitHub landing remain future phases.

## Org-M5 exit-criteria map

Org M5 (`.github/MILESTONES.md`, "M5: Jig Local MVP Slice") names exit criteria the original
roadmap never mapped. This table is the binding reconciliation; the org-side amendment is
routed as its own `.github` PR per the derivation contract (`MILESTONES.md`, "Deriving Repo
Plans").

| Org-M5 exit criterion                                              | Status                     | Closed by |
| ------------------------------------------------------------------ | -------------------------- | --------- |
| Validates **and previews** a plan                                  | **Delivered** (Phase 3)    | —         |
| Dry-run executes without privileged action                         | **Delivered** (Phases 1–2) | —         |
| Fence emits `requested → authorized/denied → runner-owned` records | **Delivered** (Phase 3)    | —         |
| Records match the M1 shape                                         | **Delivered** (Phase R)    | —         |
| Named, inspectable states                                          | **Delivered** (Phase 2)    | —         |
| `check` grows to lint + typecheck + test with 90%+ TDD coverage    | **Delivered** (PR #19)     | —         |

## The remaining ladder

- **Phase 4 — Reliable Local Runs**: stop/resume from records, no-double-effect, causal
  notices, redaction/export posture, inspect-by-replay.
- **Phase 5 — Integrated Provider Runs**: provider conformance gates and real seam
  realizations.

## Roadmap files

- [Phase details](./phases.md) — value, requirements, ID-bearing acceptance criteria,
  evidence, stops, references, and non-goals for each remaining phase.
- [Feature inventory](./feature-inventory.md) — delivered-state markers plus priority by
  client value for what remains.
- [Phase R implementation brief](./implementation-briefs/phase-r-remediation.md) —
  session-ready brief for the delivered remediation phase.
- [Phase 3 implementation brief](./implementation-briefs/phase-3-governed-local-runs.md) —
  session-ready brief for the delivered governed-local-runs phase.

Briefs for the delivered phases remain in the archived track's
[`implementation-briefs/`](../m5b-local-mvp/implementation-briefs/) as period-accurate
history (their fixture paths predate the `tests/` rename).

## Preserved gates (carried from r1 — they held)

- Execution-plan and observability-records contracts remain v0 and unfrozen:
  [`../../design/contracts/execution-plan-contract-v0.md`](../../design/contracts/execution-plan-contract-v0.md)
  and
  [`../../design/contracts/observability-records-contract-v0.md`](../../design/contracts/observability-records-contract-v0.md).
- Work-source provenance must not bypass
  [`PlanValidator`](../../design/core/plan-intake.md).
- Local records remain the evidence surface; summaries and inspect views must derive from the
  run record, not a parallel narrative.
- Provider claims, host isolation reports, and SEC-2 posture must remain provider-supplied but
  core-judged.
- GitHub/Forge stays excluded until the local runner, policy, and records path are proven.
- **New in r2:** acceptance criteria carry stable IDs (`PR-AC-n`, `P3-AC-n`, …) and cite the
  product/design IDs they trace to; tests cite the AC IDs they prove, so the AC-to-test chain
  is mechanical. Divergence from an org-owned seam is routed back to `.github`, never decided
  locally.

## Terminology guard (carried from r1)

- **Scripted-worker stub** means the exercised worker path for the local dry-run slice.
- **Agent provider** / **execution host provider** mean later provider seam realizations.
- **Local dry-run harness** means the local proof path around the scripted-worker stub; it
  must not be described as a real provider, sandbox, or SEC-2 containment proof.
- **Story / work item / item** name the same unit; see the scope note in
  [ADR 0012](../../design/decisions/0012-neutral-unit-term-work-item.md).

## Primary references

- Review report:
  [`../../reviews/2026-07-02-post-phase-2-repo-review.md`](../../reviews/2026-07-02-post-phase-2-repo-review.md)
  (findings MF1–MF6, S1–S10 — the provenance for Phase R).
- Reconciliation ADRs:
  [ADR 0017](../../design/decisions/0017-records-seam-reconciliation.md),
  [ADR 0018](../../design/decisions/0018-policy-gate-simplification.md).
- Product: [`../../product/jig.md`](../../product/jig.md),
  [`../../product/guarantees.md`](../../product/guarantees.md),
  [`../../product/concepts.md`](../../product/concepts.md).
- Design: [`../../design/README.md`](../../design/README.md), the core docs it indexes, and
  the canonical dry-run trace in
  [`../../design/notes/runtime-design-m5a.md`](../../design/notes/runtime-design-m5a.md) §15.
- Archived predecessor: [`../m5b-local-mvp/`](../m5b-local-mvp/README.md).
