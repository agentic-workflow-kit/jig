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
what shipped, maps every org-M5 exit criterion to the phase that closes it, and puts a
remediation phase (**Phase R**) ahead of new feature work.

## What has been delivered (Phases 0–2, from the archived track)

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

**Recorded divergences carried by the delivered slice** — know these before building on it:
the policy gate is a single boolean, not the fence
([ADR 0018](../../design/decisions/0018-policy-gate-simplification.md)); the record vocabulary
and identity carry historical aliases mapped in
[ADR 0017](../../design/decisions/0017-records-seam-reconciliation.md); the evidence gate is
presence-only; golden record fixtures are not yet asserted by any test. Phase R closes these.

## Org-M5 exit-criteria map

Org M5 (`.github/MILESTONES.md`, "M5: Jig Local MVP Slice") names exit criteria the original
roadmap never mapped. This table is the binding reconciliation; the org-side amendment is
routed as its own `.github` PR per the derivation contract (`MILESTONES.md`, "Deriving Repo
Plans").

| Org-M5 exit criterion                                              | Status                     | Closed by                                      |
| ------------------------------------------------------------------ | -------------------------- | ---------------------------------------------- |
| Validates **and previews** a plan                                  | Validation delivered       | Preview: **Phase 3** (`P3-AC-1`)               |
| Dry-run executes without privileged action                         | **Delivered** (Phases 1–2) | —                                              |
| Fence emits `requested → authorized/denied → runner-owned` records | Not started                | **Phase 3** (`P3-AC-2..P3-AC-4`)               |
| Records match the M1 shape                                         | Partial (drift recorded)   | **Phase R** (`PR-AC-2..PR-AC-6`, per ADR 0017) |
| Named, inspectable states                                          | **Delivered** (Phase 2)    | —                                              |
| `check` grows to lint + typecheck + test with 90%+ TDD coverage    | **Delivered** (PR #19)     | —                                              |

## The remaining ladder

- **Phase R — Remediation** (next): make the delivered slice honest — records-contract
  convergence per ADR 0017, an evidence gate that checks value not just presence, golden
  record tests that actually assert, fail-closed CLI defaults, and the contained safety fixes
  from the review. No new operator features.
- **Phase 3 — Governed Local Runs**: plan preview, the per-request fence triad replacing the
  boolean gate (per ADR 0018), decision records, minimal local approval prompt, the canonical
  five-story fixture from the M5a design note as the golden integration test.
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
  session-ready brief for the remediation phase (start here to implement).
- [Phase 3 implementation brief](./implementation-briefs/phase-3-governed-local-runs.md) —
  session-ready brief for governed local runs.

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
