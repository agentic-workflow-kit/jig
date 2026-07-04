---
title: "Jig — design-layer charter"
status: overview — design charter
---

# Jig — design-layer charter

This is the single, authoritative statement of the deep-design pass's goal, boundary rule, stub
rule, and deliverable rule, at design altitude. It descends from, and is consistent with, the
planning-track's own framing of these same four rules in
[`docs/archive/planning/design-track/README.md`](../archive/planning/design-track/README.md#goal); this charter
states them as they govern jig's design content and the [`docs/design/`](./README.md) record
itself, not as they govern how the planning track organizes sessions. Later design waves cite
this doc's rules directly rather than re-deriving or re-paraphrasing them from the planning
charter.

This charter sits alongside [`docs/design/README.md`](./README.md) without duplicating its
index, status legend, or per-area file list.

## Goal

**The deep-design pass takes each area of jig's design from overview/stub to an authored,
review-settled record that reconciles to the product commitments and stays internally
consistent as more waves add to it.** Concretely: every wave deepens a named area of
[`docs/design/`](./README.md) — entity model, state machines, ports, core parts, provider
parts — until that area's design content, not just its skeleton, has passed
`review-technical-design` with zero open blocking suggestions. The pass does not invent new
product commitments or re-litigate existing ones; it decides _how_ the product commitments in
[`docs/product/jig.md`](../product/jig.md) and [`docs/product/guarantees.md`](../product/guarantees.md)
are satisfied, and records where a later finding suggests product itself needs to change, rather
than resolving that silently inside a design session.

## Boundary rule

**Core owns ports, invariants, state machines, the authority model, and event semantics;
providers implement against ports and never redefine core policy, evidence, authorization, or
state semantics.** This is jig's own design-layer restatement, at design altitude, of the
planning-track's [boundary rule](../archive/planning/design-track/README.md#boundary-rule) — the two
must not drift into different wordings. In the design record specifically: a provider-area
design doc (agent, execution host, forge, work source — see
[`contracts/providers.md`](./contracts/providers.md)) may describe how that provider implements
against a port, but a state, policy, evidence, or authorization rule may only be authored in
core's design files ([`core/`](./core/)). A design session that finds a provider area needing to
originate such a rule routes that finding back to core's design rather than defining it locally.
Later waves (Wave 3 — ports, Wave 4a — core parts, Wave 4b — provider parts) cite this one
sentence rather than re-deriving the boundary each time they open a new design file.

## Stub rule

**A stub is a later, explicit, conservative allowance — never a default, and never mistakable
for a real, working capability in the design record.** This is jig's own design-layer
restatement of the planning-track's [stub rule](../archive/planning/design-track/README.md#stub-rule).
In the design record specifically: a stub area (see the status legend in
[`docs/design/README.md`](./README.md#status--whats-ready-whats-wip)) must state visibly, in the
file that carries it, what is deferred, why, and what proof gate must pass before it stops being
a stub — mirroring [`runtime-design-m5a.md`](./notes/runtime-design-m5a.md)'s own distinction
between `exercised` and `named extension point`. A later wave that decides to leave something a
stub points to this one sentence rather than re-justifying the practice inline.

## Deliverable rule

**Every design session produces five durable things: the authored design doc(s) at its
resolved target, logged open questions, the invariants it preserves and any it adds, its risks
and deferred decisions, and its review evidence.** This is jig's own design-layer restatement of
the planning-track's [deliverable rule](../archive/planning/design-track/README.md#deliverable-rule).
Stories do not each re-explain this list; they cite this one sentence and fill in their own five
items.

## Product reconciliation

This charter operates one level above individual product guarantees: it states the rules by
which later design waves reconcile their decisions to the product commitments in
[`docs/product/guarantees.md`](../product/guarantees.md); it makes no design decision about any
single guarantee itself. The table below accounts for every guarantee-family ID this story's
brief lists under `reconciles_to`, so none is narrowed, contradicted, or silently dropped — each
is governed by the boundary, stub, and/or deliverable rule above, at rule altitude, and is left
for the wave that owns that area to decide in full.

| Guarantee family                      | IDs                                              | Governed by                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| The fence — runtime authorization     | FENCE-1, FENCE-2, FENCE-3                        | Boundary rule (core owns authority/fence semantics)                                                                                          |
| Earned trust — capability attestation | EARN-1, EARN-2                                   | Boundary rule (core owns evidence semantics providers attest into, not originate)                                                            |
| Anti-gaming                           | GUARD-1, GUARD-2                                 | Boundary rule (core owns policy semantics)                                                                                                   |
| The doorbell — escalation             | DOOR-1, DOOR-2, DOOR-3                           | Boundary rule (core owns escalation/state semantics)                                                                                         |
| Merge-on-evidence                     | MERGE-1, MERGE-2, MERGE-3, MERGE-4, MERGE-5      | Boundary rule (core owns evidence/authority for landing); Stub rule for MERGE-5's forge dependency until a forge driver proves it            |
| Security                              | SEC-1, SEC-2, SEC-3                              | Boundary rule (core owns credential/authority semantics; providers hold none)                                                                |
| Configuration ownership               | CFG-1, CFG-2, CFG-3, CFG-10                      | Boundary rule (core owns the fixed CFG-10 category boundary; work profile is freely tunable by design, not a core/provider boundary concern) |
| Resilience — resume                   | RESUME-1, RESUME-2, RESUME-3, RESUME-4, RESUME-5 | Boundary rule (core owns run-state semantics); Deliverable rule (each resume-touching design session logs its own invariants)                |
| Work-level failure isolation          | ISO-1, ISO-2, ISO-3, ISO-4                       | Boundary rule (core owns eligibility/state semantics)                                                                                        |
| Liveness                              | LIVE-1, LIVE-2                                   | Boundary rule (core owns run-state semantics, not a provider's self-report)                                                                  |
| Stack portability                     | STACK-1, STACK-2, STACK-3, STACK-4, STACK-5      | Boundary rule directly — this is its product-level source; Stub rule for any seam without a shipped driver                                   |
| Trusting a driver                     | DRIVE-1, DRIVE-2, DRIVE-3                        | Stub rule (an unproven driver capability is recorded as reduced autonomy, not silently assumed)                                              |
| Full observability                    | SEE-1, SEE-2, SEE-3, SEE-4, SEE-5, SEE-6         | Deliverable rule (review evidence and invariants feed the same record SEE-* requires); boundary rule (core owns records)                     |

**CFG-4 through CFG-9 are deliberately out of scope of this charter**, per the brief: they are
operational and preset mechanics (computed-not-hand-set, guided setup, presets, open seams,
prompt strategy, setup-runs-only-when-stale), not boundary/stub/deliverable governance. Their
omission here is a deliberate scoping decision, not an oversight.

**Note on `reconciles_to` count.** The brief's frontmatter lists 47 distinct guarantee IDs under
`reconciles_to`; this charter reconciles to all 47, enumerated in the table above.

## Open questions

No open questions from this session.

## Invariants

`INV-001` through `INV-018` in
[`docs/design/notes/runtime-design-m5a.md`](./notes/runtime-design-m5a.md) continue with no
renumbering. This story adds no new `INV-*` entry: stating the boundary, stub, and deliverable
rules at design altitude is governance of how later design sessions work, not a new invariant
about jig's runtime behavior. If a future session finds a genuine new invariant is needed, it
numbers it after the highest existing `INV-*` entry (currently `INV-019`) and records why in that
wave's `decisions.md`, per this charter's own deliverable rule.

## Risks and deferred decisions

- **Risk — rule drift.** Because this charter's four rules are deliberately worded differently
  from (while consistent with) the planning-track's own prose, a future editor could update one
  copy and not the other. Mitigation: this charter always cites the planning charter by link
  rather than embedding its text, so a diff against the planning doc is the way to check for
  drift, not a text match.
- **Deferred — reconciliation depth.** This charter reconciles to guarantee _families_ at rule
  altitude (the table above). Reconciling to each individual guarantee ID's design decision is
  deferred to the wave that owns that area (Waves 1 through 4b), per this charter's own goal
  statement.
- **Deferred — CFG-4..9 mechanics.** Explicitly out of scope here (see "Product reconciliation"
  above); left for whichever design area later owns setup/preset mechanics, if any.

## Related

- [Jig — design](./README.md) — the design-layer index this charter sits alongside.
- [Jig — design track (planning)](../archive/planning/design-track/README.md) — the planning-track
  charter this doc restates at design altitude.
- [Jig — the execution engine](../product/jig.md) and
  [the five guarantees](../product/guarantees.md) — the product commitments this charter
  reconciles to.
- [`runtime-design-m5a.md`](./notes/runtime-design-m5a.md) — precedent for reconciling to product
  and naming conflicts rather than silently resolving them; source of the continuing `INV-*`
  ledger.
