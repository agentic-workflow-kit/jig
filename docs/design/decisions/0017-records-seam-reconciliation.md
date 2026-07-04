---
title: "ADR 0017 — Records-seam reconciliation: v0 implementation vocabulary and identity"
status: applied
---

# ADR 0017 — Records-seam reconciliation: v0 implementation vocabulary and identity

## Context

The post-Phase-2 repository review
([`docs/archive/reviews/2026-07-02-post-phase-2-repo-review.md`](../../archive/reviews/2026-07-02-post-phase-2-repo-review.md),
finding MF2) found the M5b implementation's records diverging from this layer's closed
vocabulary with no recorded mapping: `run.id` duplicates the plan id; events carry no `actor`,
`basis`, or redaction posture; the implementation mints `run.denied`, `story.failed`,
`story.skipped`, and `status: success|failure`; and `run.stopped` is emitted for
failure-aborted runs while the run table defines `stopped` as a resumable checkpoint. The
records contract is deliberately not frozen, so the reconciliation is recorded here rather
than treating the strings as illegal after the fact.

## Decision

Five reconciliations, binding on Phase R and later phases:

1. **Run identity.** A run record carries its own run id, distinct from the plan id, plus
   attempt identity (contract: "Run Identity and Input Binding"). The implementation's unique
   run-directory suffix already is that identity; Phase R promotes it into the record and adds
   `attempt`.
2. **Failure-halt is a resumable stop.** `run.stopped` on a failure-aborted run keeps the
   design meaning of `stopped` (resumable checkpoint) provided the stop record carries a stop
   reason (e.g. `work-item-blocked`) and checkpoint posture; what Phase 2 lacked was those
   fields, not the family. This extends the run table's `started → stopped` guard set with a
   third driver — a delivery-configured halt condition (stop-after-first-failure) parking the
   run at a resumable checkpoint — recorded here as a **(modeling decision)** reconciling to
   [`ISO-3`](../../product/guarantees.md#32-work-level-failure-isolation) and FAIL-003/FAIL-004
   in [`../notes/runtime-design-m5a.md`](../notes/runtime-design-m5a.md); the closed table in
   [`../core/orchestration.md`](../core/orchestration.md) absorbs this driver at its next
   deepening pass. Phase 4 resume treats such runs like any other stopped run.
3. **Event vocabulary maps to the contract families; the aliases retire in Phase R.**
   - `story.failed` → `story.blocked` with a recorded reason (worker failure or
     `evidence-gate-failed`): the work-item table already treats an unmet evidence gate as a
     non-proceeding reason driving `blocked`.
   - `story.skipped` → not a story terminal at all: an item the run never started has no
     terminal event; the run-level stop record names the unstarted set. (The m5a note's
     `story.waiting` remains that note's dry-run-scoped rendering; it is still not imported.)
   - `run.denied` → an authorization-family denial at run scope (`authorization.denied`,
     fail-closed) followed by the terminal run record: policy denial of a whole run is a fence
     decision, not a new run state.
   - `status: success|failure` in the run summary → a projection over recorded outcomes
     (success ↔ completed with every item at a good terminal; failure ↔ stopped with a
     blocking reason), not a new state. It may remain in `run.json` as a derived summary
     field.
4. **Dry-run evidence is `evidence.modeled`.** `evidence.observed` is reserved for genuinely
   observed evidence; scripted or modeled evidence in a dry-run emits `evidence.modeled`
   (OBS-002 in [`../notes/runtime-design-m5a.md`](../notes/runtime-design-m5a.md)). The
   Phase-2 dry-run's `evidence.observed` is a misnomer; Phase R renames it. The contract's
   evidence family now names both variants.
5. **Causality fields phase in; the minimum-now set is fixed.** Required from Phase R:
   `actor` on every event, and a run-level binding block naming the policy and config in
   force. Phased in as their concepts land (Phase 3+): per-event `basis`, per-event redaction
   posture, work-profile/repo-floor/track references, and driver identities with attestation
   posture. The contract records this split so "every governed event family" has one
   unambiguous v0 reading.

## Consequences

The observability-records contract is amended (evidence-family variants; v0 phasing of
causality fields). Phase R of the delivery track implements run identity + attempt, `actor`,
the run-level binding block, stop reason/checkpoint fields, and the alias renames, with
regenerated golden fixtures asserting the shape. Downstream consumers treat
`story.failed`/`story.skipped`/`run.denied` and plan-id-as-run-id in Phase 0–2 records as
historical aliases per the mapping above.

- Date: 2026-07-02
- Origin: post-Phase-2 repository review (MF2)
