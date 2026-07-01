---
id: w2-s2-run-lifecycle-and-recovery
wave: 2
status: designed
depends_on: [w2-s1-work-item-lifecycle]
design_targets: [
    docs/design/core/orchestration.md,
    docs/design/core/bootstrap.md,
  ] # deepen both in place (D-001): orchestration.md for the run transition table + stopped/resumed/completed; bootstrap.md for the run-lifecycle view of resume/storage-preflight/launch-binding. authorization.md cited, not edited. bootstrap INTERNAL re-entry mechanics deferred to Wave 4a (D-003). author-technical-design may relocate via DocStructurePlan
reconciles_to:
  [
    RESUME-1,
    RESUME-2,
    RESUME-3,
    RESUME-4,
    RESUME-5,
    GUARD-1,
    GUARD-2,
    LIVE-1,
    LIVE-2,
    MERGE-4,
    INV-003,
    INV-006,
  ]
---

# w2-s2-run-lifecycle-and-recovery — design the run state machine and recovery/resume

## Objective

Brief a future design session to author the closed **run state machine** (`previewed → started →
stopped | resumed | completed`), its guards, its events, and its recovery/resume semantics (the
RESUME family, storage preflight, crash/restart, and GUARD-1 launch-binding immutability held
across a resume). This session moves from the run lifecycle **terms** Wave 1 named and from
`docs/design/core/orchestration.md`'s run-lifecycle **prose** (and `docs/design/core/bootstrap.md`'s
launch / `run.previewed` / storage-preflight sequencing) to an authored run state machine that
closes the table and names the recovery/resume guards. It depends on `w2-s1` because the run's
`stopped` / `resumed` / recovery semantics are defined partly in terms of work-item state (an
unattended `parked` work item, or a liveness signal, drives `run.stopped`; a resume must re-evaluate
each work item's last safe checkpoint), so it needs `w2-s1`'s guard vocabulary in hand.

Per D-001 this session **deepens both `orchestration.md` (the run transition table) and
`bootstrap.md` (the run-lifecycle view of resume, storage preflight, and launch binding) in
place** — preserving and citing their existing sequencing as the seed (STOP-003: re-project and
cite, never overwrite). Per D-003 this session owns only the **run-lifecycle view** of resume:
bootstrap's **internal** re-entry mechanics (how composition re-wires providers and re-checks
storage preflight) are explicitly **deferred to Wave 4a** (`w4-s4-bootstrap-composition-root`),
which this session cites as a named seam rather than drafting. `docs/design/core/authorization.md`
is **cited, not edited**.

## Inputs to read

- [`../frame.md`](../frame.md) — this wave's frame: the `AgreedSystemModel`, the
  run-lifecycle-and-recovery context candidate, the candidate run states / recovery guards / events
  it names, and the InputResolution rows D-001..D-003 settle.
- [`../decisions.md`](../decisions.md) — the three dispositions this story is authored under (D-001
  deepen in place; D-002 mode `lifecycle/state-machine`, depth `use-case-slices`; D-003 the
  run-lifecycle-only bootstrap scope, deferring bootstrap internals to Wave 4a) and the confirmed
  s1 → s2 sequencing safe assumption.
- `w2-s1-work-item-lifecycle.md` (this wave's sibling) and its settled output — the work-item state
  machine whose `parked` / terminal states the run's `stopped` and recovery semantics read.
- `docs/design/core/orchestration.md` — the run-lifecycle prose (`previewed → started → stopped |
resumed | completed`; `stopped` is run-level, work items resume from their last safe checkpoint)
  this session deepens in place into a closed run transition table.
- `docs/design/core/bootstrap.md` — the launch / composition-root sequencing, `run.previewed`,
  storage preflight (RESUME-4), launch-binding (GUARD-1), and the resume-as-undesigned-extension-point
  note; this session deepens the **run-lifecycle view** of these in place and cites the internal
  re-entry mechanics as Wave 4a's.
- `docs/design/core/authorization.md` — cited (not edited) where GUARD-1 / GUARD-2 (policy fixed at
  launch; re-approval on rule-governing change) bound what a resume may and may not change.
- `docs/design/core/records.md` — the append-only event log and pure projections every run-lifecycle
  transition emits into; grounds durable progress (RESUME-1) and the no-double-effect distinction
  (RESUME-3) as record-grounded, per INV-006.
- `docs/design/contracts/observability-records-contract-v0.md` — the run-lifecycle event families
  (previewed / started / stopped / resumed / completed), the recovery/resume record properties (safe
  checkpoint, repeatable vs. irreversible, re-approval on changed assumptions), and the liveness/notices
  families this session's events are consistent with. Unfrozen; do not mint field names or event-type
  strings.
- `docs/product/guarantees.md` — RESUME-1..5 (durable progress, checkpoint resume, no-double-effect,
  fail-closed-and-diagnosable, resume integrity), GUARD-1 (policy fixed at launch) / GUARD-2 (re-approval
  on rule-governing change), LIVE-1/LIVE-2 (liveness signals driving a park/stop), MERGE-4 (done ≠
  landed, which a resume must preserve).
- `docs/design/notes/runtime-design-m5a.md` — INV-003 (policy fixed at launch) and INV-006 (records are
  the evidence; state is a pure projection) this session preserves; FAIL-004 (unattended park → clean
  `stopped` at a resumable checkpoint) and the §8 note that recovery/backward edges were out of M5b
  dry-run scope — this session frames them for the first time at product scope; the `use-case-slices`
  depth precedent.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc(s) at the design_targets: the deepened run state machine in
   `docs/design/core/orchestration.md` and the run-lifecycle view of resume / storage-preflight /
   launch-binding in `docs/design/core/bootstrap.md`.
2. Open questions, logged (never invented answers).
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting numbering.
   This session names its **invariant candidates** (GUARD-1 launch-binding immutability held across a
   resume; RESUME-3 no-double-effect; the unattended-park-drives-stop rule); it does not number them
   into the consolidated ledger — that is `w2-s3`. If it must number one locally, it continues from
   `INV-009` and records why in decisions.md.
4. Risks and deferred decisions.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- What is the closed run state machine (`previewed → started → stopped | resumed | completed`) — for
  each transition, which guard governs it and which event does it emit — deepening
  `orchestration.md`'s run-lifecycle prose without overwriting it?
- How is `stopped` defined partly in terms of work-item state — an unattended `parked` work item
  (`w2-s1`), or a liveness signal (LIVE-1/LIVE-2), drives `run.stopped` at a resumable checkpoint
  (RESUME-4 / FAIL-004)?
- What guards `started` at launch — storage preflight (RESUME-4) and launch-binding (GUARD-1 / INV-003)
  — and how does `run.previewed` remain the recorded-but-non-committing form that allocates no run
  identity?
- What are the run-lifecycle-level recovery/resume semantics — durable progress survives a crash
  (RESUME-1); resume restarts from the last safe checkpoint (RESUME-2); irreversible actions already
  taken are recognized and not repeated (RESUME-3, no-double-effect); an inability to continue parks
  in a named inspectable state (RESUME-4); and a resume across a changed safety-relevant assumption
  requires fresh owner re-approval and evidence (RESUME-5 / GUARD-2)?
- How is **GUARD-1 / INV-003 launch-binding immutability held across a resume** — the policy /
  work-profile / repo-floor bindings fixed at launch must not silently change when a stopped run
  resumes?
- Where is the **seam** to bootstrap's internal re-entry mechanics — named and cited as Wave 4a's
  (`w4-s4-bootstrap-composition-root`), not drafted here (D-003)?

## Invariants to preserve

- `RESUME-1` through `RESUME-5` — durable progress; resume from the last safe checkpoint; no double
  effect; fail closed and diagnosable; resume integrity (re-approval on changed assumptions). These
  are the guards/invariants the run's `stopped` / `resumed` transitions carry at the run-lifecycle
  altitude.
- `GUARD-1` (policy fixed at launch) and `GUARD-2` (re-approval on rule-governing change) — the bound
  policy cannot loosen mid-run, and it must remain immutable across a resume; a safety-relevant change
  forces re-approval before continuing.
- `LIVE-1`, `LIVE-2` — the run distinguishes thinking / stuck / dead and escalates a stuck run to a
  park/stop rather than waiting forever; these are guard inputs on the `stopped` transition.
- `MERGE-4` — done and landed stay separate; a resume must preserve a `done`-but-unlanded work item's
  done evidence rather than re-deriving or discarding it.
- `INV-003` (policy fixed at launch) and `INV-006` (records are the evidence; state / summary /
  metrics / notices are pure projections of an append-only log) from `runtime-design-m5a.md` — the
  run's durable progress and no-double-effect semantics are record-grounded, never a parallel store.
- No new `INV-*` numbers are numbered by this story; it **names invariant candidates** (esp. GUARD-1
  immutability-across-resume and RESUME-3 no-double-effect), and `w2-s3` consolidates them continuing
  from `INV-009`. If this session must number one locally, it continues from `INV-009` (never resets)
  and records why in decisions.md.

## Must not decide

- The **work-item** state machine (`eligible → started → parked → done | landed | rejected |
blocked`) and its guards/events — that is `w2-s1`. This session reads work-item state (esp. `parked`
  and terminal outcomes) as an input to the run's `stopped` and recovery semantics; it does not
  redefine the work-item table.
- Bootstrap's **internal** re-entry mechanics on resume — how composition re-wires providers, re-checks
  storage preflight, and re-allocates or reuses run identity — are **Wave 4a's**
  (`w4-s4-bootstrap-composition-root`, per D-003). This session owns only the run-lifecycle view of
  resume and cites bootstrap's re-entry as a named seam.
- `authorization.md`'s classifier internals — cited only where GUARD-1/GUARD-2 bound what a resume may
  change; not redesigned.
- **Numbering** the consolidated invariant ledger — this session names invariant candidates; `w2-s3`
  numbers them from `INV-009`.
- A **storage-engine choice**, retention richness, or export encoding — deferred per `records.md`; and
  Learning-loop interpretation — a between-runs consumer per `jig.md`. Both out of scope.
- Field-level schema, TypeScript interfaces, JSON Schema, or new event-type strings — deferred per
  `docs/design/README.md`; the v0 observability-records contract stays unfrozen.

## Exit criteria

- The deepened run state machine exists in `orchestration.md` and states, for every transition in the
  closed run table, its guard and its emitted event; the run-lifecycle view of resume / storage-preflight
  / launch-binding exists in `bootstrap.md` — both deepened in place, preserving and citing the existing
  sequencing as the seed, with any divergence named explicitly (STOP-003).
- `stopped` is defined partly in terms of work-item state (unattended `parked`, or a liveness signal,
  drives it) at a resumable checkpoint (RESUME-4 / FAIL-004), consistent with `w2-s1`'s work-item table.
- The recovery/resume semantics (RESUME-1..5) are named as the guards on the `stopped` / `resumed`
  transitions, and **GUARD-1 / INV-003 launch-binding immutability is stated explicitly wherever resume
  is discussed** — the launch bindings do not silently change across a resume, and RESUME-5 / GUARD-2
  force re-approval on a changed safety-relevant assumption.
- Bootstrap's internal re-entry mechanics are cited as Wave 4a's, not drafted here (D-003).
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
jig state machine (the run lifecycle) into a closed transition table with guards and events, and
frames recovery/resume at product scope for the first time, so the full frame → author → design-review
pass applies, not the light method Wave 0 used for its scaffold-only stories.

1. frame-technical-design → a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode` `lifecycle/state-machine`, `ddd_depth` `use-case-slices` per D-002). This
   wave's build-time frame at [`../frame.md`](../frame.md) seeds it; the session confirms and, where
   it deepens the candidate run states / recovery guards / events into the closed table, extends the
   `AgreedSystemModel` rather than starting from nothing.
2. author-technical-design → the deepened run state machine in `orchestration.md` and the run-lifecycle
   resume view in `bootstrap.md` at design_targets, preserving and citing the existing sequencing as
   the seed.
3. review-technical-design → three lenses (architecture-enforceability: no work-item-table or
   bootstrap-internal mechanics leaked into the run lifecycle, the closed run table is genuinely
   closed, and Wave 4a's re-entry scope is cited not drafted; domain-correctness: every run transition's
   guard and event reconcile to RESUME-1..5 / GUARD-1/2 / LIVE-1/2 / INV-003/006, and GUARD-1
   immutability-across-resume is explicit; agreement-integrity: the run's `stopped` and recovery
   semantics agree with `w2-s1`'s settled work-item table and the wave frame's `AgreedSystemModel`).
   Dispositions recorded into this wave's [`../decisions.md`](../decisions.md); settled = zero open
   blocking suggestions.

Handoff: when settled, update status and note the resolved design_targets paths in the track's future
traceability matrix; hand the named invariant candidates to `w2-s3-invariant-catalog`.

## Coordinator resolution (design_targets)

Per D-001 (deepen in place) and D-003 (run-lifecycle-only bootstrap scope), this story deepens
`docs/design/core/orchestration.md` (the run transition table and its `stopped` / `resumed` /
`completed` transitions) **and** `docs/design/core/bootstrap.md` (the run-lifecycle view of resume,
storage preflight, and launch binding) directly — preserving and citing their existing sequencing as
the seed. Bootstrap's **internal** re-entry mechanics are cited as a named seam and deferred to Wave
4a's `w4-s4-bootstrap-composition-root`; this story does not draft them. `docs/design/core/authorization.md`
is **cited, not edited**. The future `author-technical-design` session may relocate the targets via
its `DocStructurePlan` if its own frame finds a better home; this brief records the resolved targets,
not frozen paths.
