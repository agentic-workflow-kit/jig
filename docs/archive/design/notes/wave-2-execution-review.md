---
title: "Wave 2 — execution review dispositions"
status: log — build-time review evidence
---

# Wave 2 — execution review dispositions

Build-time review-disposition log for the design-layer **execution** of design-track Wave 2 —
the run that deepens jig's run and work-item state machines (and consolidates the `INV-*` ledger
from `INV-009`) that the Wave 2 planning briefs target. It records the `D-###` dispositions the
coordinator made over each per-unit `review-technical-design` pass, as the "review evidence" leg
of the track's deliverable rule (see [`../charter.md`](../charter.md#deliverable-rule)).

Scope note. These `D-###` entries are the **execution** track's own review dispositions. Per
[`../conventions.md`](../conventions.md#2-the-adrdecision-log-continues-in-place-as-one-flat-log) each such log numbers
independently, so this log's `D-###` restart at `D-001` and are distinct from — even where the
numbers coincide with — the identifiers used in:

- the planning-tree Wave 2 decision log at
  [`../../archive/planning/design-track/waves/wave-2-state-machines/decisions.md`](../../planning/design-track/waves/wave-2-state-machines/decisions.md),
  whose `D-001..D-003` are the **frame** `InputResolution` dispositions (deepen-in-place; mode/depth;
  bootstrap-scope) and whose `D-004..D-005` are that tree's own scaffold-QA of the briefs. Under the
  execution split the planning tree is a read-only input, so the coordinator's per-unit review
  dispositions live in this design-layer log instead of being written back into the planning file.
- the design-layer ADR log at [`../decisions/`](../decisions/), which this log is not mixed into
  and which Wave 2 does not add to (no ADR minted; next available remains `0017`).

Note on `D-###` cross-wave references: `D-###` IDs are wave/log-scoped. A reference to another
wave's decision names the wave (e.g. "Wave 1's D-003"), never a bare `D-###`.

Disposition vocabulary: `fix` (route the accepted change back to the same authoring session, then
re-review) / `reject` / `defer` (record, do not change).

## w2-s1-work-item-lifecycle → [`../core/orchestration.md`](../core/orchestration.md)

- Reviewer verdict, round 1: **open** — 0 blocking, 2 recommended, 1 optional. The deepen-in-place
  check passed mechanically (verified by `git diff` against the committed seed: the existing closed
  work-item Mermaid table, done-vs-landed prose, closure sentence, run-lifecycle prose, and
  ISO-4/resume Notes are byte-identical; the only non-additive change is the intended expansion of
  the one-line "Reconciles to" summary into the full 17-ID superset). All 17 `reconciles_to` IDs
  (MERGE-1/2/4/5, FENCE-1/2/3, DOOR-1/2/3, EARN-1/2, ISO-1/3, INV-004/005/008) addressed verbatim;
  candidate invariants named with **no** `INV-*` numbers assigned (numbering is w2-s3's); Fence
  grant/deny/route cited from `authorization.md` without touching its classifier internals; the
  `evidence-gate-failure → blocked` guard correctly labeled a modeling decision plus open question.
- Reviewer verdict, round 2 (after the D-001/D-002 fixes): **settled** — zero open blocking; the two
  recommended findings resolved; no regression; seed still byte-identical; ledger untouched by this
  story (candidates named, not numbered).

| ID    | Finding (reviewer)                                                                                                                                                                    | Severity    | Lens                               | Disposition | Rationale / outcome                                                                                                                                                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-001 | S-001 — miscited STOP-003 source: the doc linked `[charter STOP-003](../charter.md)`, but `charter.md` does not define STOP-003 (grep = 0); it is defined in `runtime-design-m5a.md`. | recommended | agreement-integrity                | fix         | Accurate citation-precision defect (the discipline itself was correctly honored, proven by the additive diff). Routed to the same author to retarget the single citation to `[STOP-003](../notes/runtime-design-m5a.md#sequencing-contention-validation-and-stops)`; slug verified. Re-review: **settled**.            |
| D-002 | S-002 — the charter's five-deliverable rule: "risks and deferred decisions" had no distinct home; the single "Open questions" entry doubled as the only deferred content.             | recommended | architecture-enforceability (rule) | fix         | Genuine missing deliverable category. Routed to add a distinct "Risks and deferred decisions" section (one honest risk — the evidence-gate modeling decision may be re-settled; three deferred — w2-s3 numbering, run-lifecycle sequencing = w2-s2, ISO-4/resume). Re-review: **settled** — five deliverables present. |
| D-003 | S-003 — the eligibility predicate appears twice (as the `eligible → started` guard row and as an entry-guard note in the modeling notes).                                             | optional    | domain-correctness                 | reject      | No change. The reviewer's own read (and the coordinator's) is that this is coherent re-projection — the same guard described as a table row and as a structural note about why `eligible` has no incoming edge — not a doubled decision. Recorded for awareness; nothing to fix.                                       |

## w2-s2-run-lifecycle-and-recovery → [`../core/orchestration.md`](../core/orchestration.md), [`../core/bootstrap.md`](../core/bootstrap.md)

- Reviewer verdict, round 1: **open** — 1 blocking, 0 recommended, 0 optional. The substantive
  design review found the run-lifecycle additions scoped and additive, but the required formatting
  gate failed on the newly added run transition table in `orchestration.md`.
- Reviewer verdict, round 2 (after the D-004/D-005 formatter fixes): **settled** — zero open
  blocking; both formatter findings resolved; no new findings; `pnpm check` and `git diff --check`
  passed.

| ID    | Finding (reviewer)                                                                                                    | Severity | Lens                        | Disposition | Rationale / outcome                                                                                                                                     |
| ----- | --------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-004 | S-001 — `pnpm format:check` failed on the newly added `docs/design/core/orchestration.md` run transition table.       | blocking | architecture-enforceability | fix         | Accurate gate failure. Routed to the same implementer for formatter-only repair; re-review: **settled**. No design-scope change requested.              |
| D-005 | S-002 — `pnpm format:check` failed on the newly added `docs/design/notes/wave-2-execution-review.md` D-004 log table. | blocking | architecture-enforceability | fix         | Accurate coordinator-log gate failure. Fixed directly by the coordinator because this log is coordinator-owned review evidence; re-review: **settled**. |

## w2-s3-invariant-catalog → [`../notes/runtime-design-m5a.md`](../notes/runtime-design-m5a.md)

- Reviewer verdict, round 1: **settled** — no `S-###` findings. `INV-009..INV-018` were reviewed as
  additive ledger rows in the convention-defined home; no state machine or transition table was
  authored; `INV-001..INV-008` remained byte-identical to the committed ledger; numbering is
  contiguous and no planning/core lifecycle files were retro-edited.
- No `D-###` disposition row was minted for w2-s3 because the reviewer reported no findings.
