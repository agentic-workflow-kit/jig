---
title: "Wave 1 — execution review dispositions"
status: log — build-time review evidence
---

# Wave 1 — execution review dispositions

Build-time review-disposition log for the design-layer **execution** of design-track Wave 1 —
the run that authors the real `docs/design/domain/*` deliverables the Wave 1 planning briefs
target. It records the `D-###` dispositions the coordinator made over each per-unit
`review-technical-design` pass, as the "review evidence" leg of the track's deliverable rule
(see [`../charter.md`](../charter.md#deliverable-rule)).

Scope note. These `D-###` entries are the **execution** track's own review dispositions. Per
[`../conventions.md`](../conventions.md#2-adrs-continue-in-place-from-0017) the design-layer ADR
log and each such log number independently, so this log's `D-###` restart at `D-001` and are
distinct from — even where the numbers coincide with — the identifiers used in:

- the planning-tree Wave 1 decision log at
  [`../../planning/design-track/waves/wave-1-domain/decisions.md`](../../planning/design-track/waves/wave-1-domain/decisions.md),
  whose `D-001..D-003` are the **frame** `InputResolution` dispositions the two stories were
  authored under (a different log, a different kind of decision). The two Wave 1 story briefs say
  design-review dispositions are "recorded into this wave's `decisions.md`"; under the execution
  split the planning tree is a read-only input, so the coordinator's per-unit review dispositions
  live in this design-layer log instead of being written back into the planning file. This
  interpretation is surfaced for the human in the Wave 1 stop report; a reader of the planning
  `decisions.md` should follow it here for the review-pass dispositions.
- the design-layer ADR log at [`../decisions/`](../decisions/), which this log is not mixed into
  and which Wave 1 does not add to (no ADR minted; next available remains `0017`).

Disposition vocabulary: `fix` (route the accepted change back to the same authoring session, then
re-review) / `reject` / `defer` (record, do not change).

## w1-s1-configuration-and-work-domain → [`../domain/configuration-and-work.md`](../domain/configuration-and-work.md)

- Reviewer verdict, round 1: **open** — 0 blocking, 3 recommended, 0 optional. All three are
  link-hygiene / index-consistency findings; the domain content, the D-001/D-002/D-003
  dispositions, and the full six-ID reconciliation (CFG-1, CFG-2, CFG-3, CFG-10, GUARD-1, MERGE-3)
  passed all three lenses clean.
- Reviewer verdict, round 2 (after D-001/D-002/D-003 fixes): **settled** — zero open blocking; the
  three recommended findings resolved; no regression; ledger preserved (no new `INV-*`; next
  available remains `INV-009`).

| ID    | Finding (reviewer)                                                                                                                                                                                 | Severity    | Lens                               | Disposition | Rationale / outcome                                                                                                                                                                                                                                                                                                              |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-001 | S-001 — broken anchor `../core/README.md#terminology`: "Terminology" in the target is inline bold text, not a heading, so the fragment resolves to no anchor.                                      | recommended | agreement-integrity (link hygiene) | fix         | Accurate. Routed to the same author to drop the `#terminology` fragment so the link resolves to the page (no sub-heading slug exists to retarget to). Re-review outcome: **settled** (round 2) — link valid, surrounding sentence still reads correctly.                                                                         |
| D-002 | S-002 — broken anchor `../conventions.md#1-the-inv-invariant-ledger-...`: the real GitHub slug has a double hyphen after `inv` (the `` `INV-*` `` backticks/`*` strip, the hyphen+space collapse). | recommended | agreement-integrity (link hygiene) | fix         | Accurate. Routed to correct the fragment to the actual generated slug `#1-the-inv--invariant-ledger-continues-as-one-running-list`, verified against the heading via the slugger. Re-review outcome: **settled** (round 2) — exact slug match.                                                                                   |
| D-003 | S-003 — the new `docs/design/README.md` `domain/` status-table row used Status `draft`, which is not one of the legend's tiers (overview / stub / contract v0 / log-archive).                      | recommended | agreement-integrity / compliance   | fix         | Accurate legend inconsistency (every other row translates its frontmatter `draft — <qualifier>` into a legend tier). Routed to translate the row's Status to `**stub**` (skeleton exists, review pending), Pending column unchanged, legend/headers/other rows untouched. Re-review outcome: **settled** (round 2) — consistent. |
