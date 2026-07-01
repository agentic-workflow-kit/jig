---
title: "Wave 0 — execution review dispositions"
status: log — build-time review evidence
---

# Wave 0 — execution review dispositions

Build-time review-disposition log for the design-layer **execution** of design-track Wave 0 —
the run that authors the real `docs/design/*` deliverables the Wave 0 planning briefs target.
It records the `D-###` dispositions the coordinator made over each per-unit
`review-technical-design` pass, as the "review evidence" leg of the track's deliverable rule.

Scope note. These `D-###` entries are the **execution** track's own review dispositions and are
distinct from:

- the planning-tree scaffold-QA log at
  [`../../planning/design-track/waves/wave-0-charter/decisions.md`](../../planning/design-track/waves/wave-0-charter/decisions.md),
  which independently uses its own `D-001..003` over the planning documents themselves; and
- the design-layer ADR log at [`../decisions/`](../decisions/), which this log is not mixed into
  and which Wave 0 does not add to (no ADR minted; next available remains `0017`).

Disposition vocabulary: `fix` (route the accepted change back to the same authoring session, then
re-review) / `reject` / `defer` (record, do not change).

## w0-s1-design-charter → [`../charter.md`](../charter.md)

- Reviewer verdict, round 1: **settled** — zero open blocking; one optional finding.

| ID    | Finding (reviewer)                                                                                                                                                                                             | Severity | Lens                | Disposition | Rationale / outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-001 | S-001 — the logged "open question" about a `46`-vs-`47` `reconciles_to` count is not a genuine unresolved design question: the brief frontmatter unambiguously lists 47 and the charter already covers all 47. | optional | agreement-integrity | fix         | Coordinator resolved the count authoritatively: **47 is authoritative** (verified directly against the brief's `reconciles_to` frontmatter); the "46" was an error in this run's dispatch text, not a planning-layer defect — nothing to reconcile at planning. Routed to the same authoring session to reframe the stale open question as a resolved note. Re-review outcome: **settled** (round 2) — reframe applied, open-questions ledger clean, no regression. |

## w0-s2-conventions-and-ledgers → [`../conventions.md`](../conventions.md)

- Reviewer verdict, round 1: **open** — 1 blocking, 1 recommended, 1 optional.
- Reviewer verdict, round 2 (after D-002/D-003/D-004 fixes): **settled** — zero open blocking; no regression; ledgers preserved (INV-009 and ADR-0017 remain reserved-only, nothing minted).

| ID    | Finding (reviewer)                                                                                                                                                                                                                                                                | Severity    | Lens                        | Disposition | Rationale / outcome                                                                                                                                                                                                                                                                                                                                                |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D-002 | S-001 — §1 self-contradiction: `notes/runtime-design-m5a.md` is called "archival / not a live-edit target" yet also the "canonical home" where a later wave appends INV-009, so the continuation rule is unexecutable and the ADR-0016 citation does not support append-in-place. | blocking    | domain-correctness          | fix         | Genuine contradiction that defeats convention #1's citability exit criterion. Routed to the same author to make §1 internally consistent (recommended: relax "not a live-edit target" to "not a redistribution/restructuring target"; append-only continuation in place, plainly stated; correct the ADR-0016 citation). Re-review outcome: **settled** (round 2). |
| D-003 | S-002 — §3's universal "every ID resolves to exactly one referent" is overclaimed: log-local `D-###` counters restart per log (per §4) and `D-00N` is used as ADR shorthand in the m5a file.                                                                                      | recommended | architecture-enforceability | fix         | Accurate; the cross-set disjointness proof is correct but the universal claim is not. Routed to scope §3's claim to the three global-reference kinds it proves and acknowledge `D-###`/`S-###` as intentionally log-scoped (compatible, not colliding). Re-review outcome: **settled** (round 2).                                                                  |
| D-004 | S-003 — §3's "every ID ... is a PREFIX-N token" omits `RL-*` (reference-lessons) used in the m5a file.                                                                                                                                                                            | optional    | architecture-enforceability | fix         | Accurate scoping gap; `RL-*` is lexically disjoint (no collision) but unaccounted for. Folded into the same round: note reference-only prefixes such as `RL-*` are out of scope of the three-kind proof. Re-review outcome: **settled** (round 2).                                                                                                                 |
