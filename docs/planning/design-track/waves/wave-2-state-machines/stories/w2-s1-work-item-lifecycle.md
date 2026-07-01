---
id: w2-s1-work-item-lifecycle
wave: 2
status: designed
depends_on: []
design_targets: [docs/design/core/orchestration.md] # deepen in place (D-001); preserve+cite the existing closed work-item Mermaid table as the seed; author-technical-design may relocate via DocStructurePlan
reconciles_to:
  [
    MERGE-1,
    MERGE-2,
    MERGE-4,
    MERGE-5,
    FENCE-1,
    FENCE-2,
    FENCE-3,
    DOOR-1,
    DOOR-2,
    DOOR-3,
    EARN-1,
    EARN-2,
    ISO-1,
    ISO-3,
    INV-004,
    INV-005,
    INV-008,
  ]
---

# w2-s1-work-item-lifecycle — design the work-item state machine

## Objective

Brief a future design session to author the closed **work-item state machine**: the transition
table over the terms Wave 1 named (`eligible → started → parked → done | landed | rejected |
blocked`), the guard that governs each transition, and the event each transition emits. This
session moves from the lifecycle **terms** Wave 1 recorded (`w1-s1`/`w1-s2` named the states; the
transition table was explicitly deferred to Wave 2) and from `docs/design/core/orchestration.md`'s
existing closed work-item Mermaid table to an authored state machine that closes the table —
naming, for every transition, its guard and its emitted event — without redrawing or overwriting
the seed. Per Wave 1's D-003 the work item is one entity whose runtime facet this wave sequences;
this session owns the runtime state and transitions, not the authored facts `w1-s1` settled.

Per D-001 this session **deepens `docs/design/core/orchestration.md` in place**: the existing
closed work-item Mermaid table is the seed it preserves and cites, re-projecting and extending it
(guards + events per transition) rather than authoring a new sibling doc. Per the confirmed
guard-ownership safe assumption, the table consumes the Fence's `authorize(request, boundPolicy) →
grant \| deny \| route` decision as an **external guard predicate** it cites from
`docs/design/core/authorization.md` — this session owns only which transition each outcome triggers
(grant → proceed toward `done`; deny → `blocked`; route → `parked`), never the classifier's
internals.

## Inputs to read

- [`../frame.md`](../frame.md) — this wave's frame: the `AgreedSystemModel`, the work-item-lifecycle
  context candidate, the candidate states/guards/events it names, and the InputResolution rows
  D-001..D-003 settle.
- [`../decisions.md`](../decisions.md) — the three dispositions this story is authored under (D-001
  deepen in place; D-002 mode `lifecycle/state-machine`, depth `use-case-slices`; D-003 the
  run-lifecycle-only bootstrap scope for the sibling story) and the confirmed guard-ownership safe
  assumption.
- `docs/design/core/orchestration.md` — the existing closed work-item Mermaid table, the
  done-vs-landed distinction, and the note "any transition not drawn is illegal" this session
  preserves, cites, and deepens with guards and events per transition.
- `docs/design/core/authorization.md` — the Fence's `authorize → grant \| deny \| route` decision
  and the Doorbell escalation channel this session cites as the external guard on `started`'s exits;
  its classifier internals (CFG-10 category boundary, escalation routing) stay that stub's own.
- `docs/design/core/records.md` — the append-only event log and pure projections every transition
  emits into; grounds "every transition emits an event" as this session's obligation.
- `docs/design/contracts/observability-records-contract-v0.md` — the story-lifecycle event families
  (eligible / started / parked / unparked / blocked / done / landed / rejected) and the gates/evidence
  and blocks/stops record properties this session's events are consistent with. Unfrozen; do not
  mint field names or event-type strings from it.
- `docs/product/guarantees.md` — MERGE-1/MERGE-2/MERGE-4/MERGE-5 (evidence gates landing; push/PR/
  merge is runner authority; done ≠ landed; blocked work surfaces as a real PR), FENCE-1..3 (fail-closed
  authorization), DOOR-1..3 (durable escalation, narrow grants), EARN-1/EARN-2 (capability proof
  gating autonomy), ISO-1 (dependency-aware eligibility) and ISO-3 (blocks are first-class outcomes).
- `docs/design/notes/runtime-design-m5a.md` — INV-004 (done is not landed), INV-005 (dependency-aware
  eligibility), INV-008 (the two authority mechanisms) this session preserves; the dry-run-scoped
  §8 state-machine sketch and §15 worked trace, which this session treats as a narrower dry-run
  rendering it must not mistake for the full product-scope table; the `use-case-slices` depth
  precedent and command table.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc(s) at the design_targets: the deepened work-item state machine in
   `docs/design/core/orchestration.md`.
2. Open questions, logged (never invented answers).
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting numbering.
   This session names its **invariant candidates** (the guard-to-transition mapping; the
   runner-exclusive landing action; the fail-closed deny → `blocked` edge); it does not number them
   into the consolidated ledger — that is `w2-s3`'s consolidation checkpoint. If it must number one
   locally, it continues from `INV-009` and records why in decisions.md.
4. Risks and deferred decisions.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- For each transition in `eligible → started → parked → done | landed | rejected | blocked`: which
  **guard** governs it, and which **event** does it emit? State the closed table so that any
  transition not drawn is illegal (preserving `orchestration.md`'s existing closure discipline).
- How does the table consume the Fence's `authorize → grant \| deny \| route` decision as an
  external guard on `started`'s exits — grant → proceed toward `done`; deny → `blocked` (fail-closed,
  FENCE-1); route → `parked` (durable escalation, DOOR-1..3) — without redesigning the classifier?
- What guards `eligible` (dependency/eligibility resolution, ISO-1 / INV-005) and how does a blocked
  work item halt its downstream dependents (ISO-3) while independent work keeps moving?
- What guards the `done → landed` transition — evidence met (MERGE-1) plus the runner-exclusive merge
  action (MERGE-2), keeping `done` and `landed` separate milestones (MERGE-4 / INV-004)?
- How does `parked` (transient) resolve — to resume (`→ started`) or to `rejected` — on an owner
  decision, and how does an unattended `parked` work item surface to the run lifecycle (`w2-s2`) as
  the driver of a `run.stopped`?
- Which events does each transition emit, consistent with the observability contract's story-lifecycle
  event families, without minting new field names or event-type strings?

## Invariants to preserve

- `MERGE-1`, `MERGE-2`, `MERGE-4`, `MERGE-5` — evidence gates landing on independent evidence; push/
  PR/merge is runner authority; done and landed stay separate milestones; blocked work surfaces as a
  real PR where the owner already works. The state machine must not collapse `done` into `landed` or
  let the worker perform a privileged action.
- `FENCE-1`, `FENCE-2`, `FENCE-3` — every worker request is authorized before it executes, fail-closed;
  permission cannot widen mid-run; the worker holds no credentials. The `started` exits must be gated
  by the Fence, with deny → `blocked` fail-closed.
- `DOOR-1`, `DOOR-2`, `DOOR-3` — ambiguous/risky/unproven actions route to the owner; escalations are
  durable (the `parked` state survives interruption); grants are narrow. The route → `parked` edge
  carries these.
- `EARN-1`, `EARN-2` — autonomy requires fresh capability proof; missing/stale proof means more human
  checkpoints, not a weakened guarantee. Capability proof is a guard input on autonomy-granting
  transitions.
- `ISO-1`, `ISO-3` — dependency-aware eligibility (a work item is ineligible until its prerequisites
  land) and blocks as first-class outcomes that halt downstream dependents.
- `INV-004` (done is not landed), `INV-005` (dependency-aware eligibility), `INV-008` (the two
  authority mechanisms: Fence adjudication and runner-owned landing) from `runtime-design-m5a.md` —
  already-live state-machine invariants this session's closed table must not contradict.
- No new `INV-*` numbers are numbered by this story; it **names invariant candidates**, and `w2-s3`
  consolidates them continuing from `INV-009`. If this session must number one locally, it continues
  from `INV-009` (never resets) and records why in decisions.md.

## Must not decide

- The Fence/Doorbell **classifier internals** — the CFG-10 fixed category boundary and escalation
  routing stay `authorization.md`'s own; this session cites `authorize → grant \| deny \| route` as
  an external guard predicate and owns only which transition each outcome triggers.
- The **run** state machine (`previewed → started → stopped | resumed | completed`) and its
  recovery/resume semantics — that is `w2-s2-run-lifecycle-and-recovery`. This session names only how
  an unattended `parked` work item feeds the run's `stopped` transition, and hands the run-level
  sequencing to `w2-s2`.
- The Work item's **authored facts** (identity, dependencies-as-declared, done-conditions-as-declared)
  — settled by Wave 1 (`w1-s1`); this session owns the runtime state and transitions only, per Wave
  1's D-003, and does not split the entity.
- **Numbering** the consolidated invariant ledger — this session names invariant candidates; `w2-s3`
  numbers them from `INV-009`.
- Concurrency / parallel-workspace isolation (ISO-4) transition mechanics — out of scope until the
  drivers M5a named (concurrency, real drivers) are in play (Waves 3 / 4b).
- Field-level schema, TypeScript interfaces, JSON Schema, or new event-type strings — deferred per
  `docs/design/README.md`; the v0 observability-records contract stays unfrozen.

## Exit criteria

- The deepened work-item state machine exists at its resolved target and states, for every transition
  in the closed table, its guard and its emitted event — with any transition not drawn illegal,
  preserving `orchestration.md`'s existing closure discipline.
- The existing closed work-item Mermaid table is **preserved and cited** as the seed, re-projected and
  extended (guards + events) rather than overwritten; any divergence from the seed is named explicitly
  (STOP-003).
- The Fence's `authorize → grant \| deny \| route` decision is cited as an external guard predicate
  (grant → proceed toward `done`; deny → `blocked`; route → `parked`), with `authorization.md`'s
  classifier internals left untouched.
- `done` and `landed` are kept separate (MERGE-4 / INV-004); the runner-exclusive landing action gates
  `done → landed` (MERGE-2); dependency-aware eligibility gates `eligible` (ISO-1 / INV-005); a
  blocked item halts downstream dependents (ISO-3).
- The invariant candidates this session names are handed to `w2-s3` for consolidation from `INV-009`;
  the three ID namespaces (product IDs / `INV-*` / handoff categories) are kept distinct.
- design-review verdict settled (zero open blocking suggestions), applied at the full method below.

## Evidence required

- This wave's [`../frame.md`](../frame.md) — the frame that seeds this story's frame step.
- The authored design_targets.
- The design-review report.
- The decisions.md entries (this wave's [`../decisions.md`](../decisions.md)).

## Design review & handoff

This session runs the technical-design method itself, at **full weight** — this story deepens a real
jig state machine (the work-item lifecycle) into a closed transition table with guards and events, so
the full frame → author → design-review pass applies, not the light method Wave 0 used for its
scaffold-only stories.

1. frame-technical-design → a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode` `lifecycle/state-machine`, `ddd_depth` `use-case-slices` per D-002). This
   wave's build-time frame at [`../frame.md`](../frame.md) seeds it; the session confirms and, where
   it deepens the candidate states/guards/events into the closed table, extends the `AgreedSystemModel`
   rather than starting from nothing.
2. author-technical-design → the deepened work-item state machine at design_targets, preserving and
   citing the existing closed Mermaid table as its seed.
3. review-technical-design → three lenses (architecture-enforceability: no run-lifecycle or
   classifier-internal behavior leaked into the work-item table, and the closed table is genuinely
   closed; domain-correctness: every transition's guard and event reconcile to the product IDs and
   INV-004/005/008, and the grant/deny/route guard cites `authorization.md` correctly; agreement-integrity:
   nothing contradicts the wave frame's `AgreedSystemModel`, Wave 1's D-003 one-entity model, or
   `w2-s2`'s run-lifecycle seam). Dispositions recorded into this wave's [`../decisions.md`](../decisions.md);
   settled = zero open blocking suggestions.

Handoff: when settled, update status and note the resolved design_targets path in the track's future
traceability matrix; hand the named invariant candidates to `w2-s3-invariant-catalog`.

## Coordinator resolution (design_targets)

Per D-001 (deepen in place), the work-item state machine deepens `docs/design/core/orchestration.md`
directly — preserving and citing the existing closed work-item Mermaid table as its seed and
extending it with the guard and event for each transition — rather than authoring a new sibling doc.
This is the STOP-003-compliant "re-project and cite": the stub's existing content is the deepened
doc's seed, not something overwritten. The future `author-technical-design` session may relocate the
target via its `DocStructurePlan` if its own frame finds a better home; this brief records the
resolved target, not a frozen path. `docs/design/core/authorization.md` is **cited, not edited**.
