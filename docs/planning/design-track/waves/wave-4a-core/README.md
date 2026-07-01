---
title: Wave 4a — core parts
wave: 4a
status: charter draft
depends_on_waves: [1, 2, 3]
---

# Wave 4a — core parts

## Purpose

Deepen jig's **core internals** — the four fixed-logic parts under `docs/design/core/` — from the
overview/port-skeleton altitude the prior waves left them at to authored, invariant-bearing design.
This is the first wave to author **tactical** core detail: real invariants, consistency rules,
policy content, authority mechanics, and composition sequencing _inside_ the ports Wave 3 named,
rather than the ports' boundary shapes. Four parts, each its own design problem:

- **`w4-s1` — Records / observability** (`docs/design/core/records.md`): the append-only event-log
  **engine** beneath Wave 3's `RunStore` port — the single-leased-writer consistency model,
  projection-purity discipline, redaction posture, retention/isolation, and the observability
  surface these serve.
- **`w4-s2` — Plan / policy / evidence** (`docs/design/core/plan-intake.md`): parse/validate/reject
  beneath Wave 3's `PlanValidator` port, the policy model (gating posture, merge spectrum,
  concurrency ceiling, retry budget, escalation, the CFG-10 manual/assisted dial), and the
  evidence/attestation category model (automated checks, review, capability proof).
- **`w4-s3` — Authority spine** (`docs/design/core/authorization.md`): the Fence's fixed-category
  classifier (CFG-10), the Doorbell escalation (DOOR-2/3), and the capability-attestation gate
  (EARN-2) — one of the two stubs prior waves **deferred to Wave 4a by name**.
- **`w4-s4` — Bootstrap / composition root** (`docs/design/core/bootstrap.md`): launch sequencing,
  `run.previewed`, storage preflight (RESUME-4), GUARD-1 launch-binding, CFG-9, and the resume
  re-entry procedure Wave 2's D-003 deferred here by name — the second deferred stub.

This wave **authors real jig design content** — the core internals every later wave reconciles to —
so each story runs the **full** frame → author → design-review method. It is framed **per part**,
not with a single wave frame: the four frames live in [`frames/`](./frames/) (mirroring
[`stories/`](./stories/)), a deliberate deviation from the prior one-`frame.md`-per-wave shape,
justified by the plan's "Wave 4 gets a frame per part" instruction (each core seam is its own design
problem). See [`decisions.md`](./decisions.md) (D-001..D-006) for the frame-gate dispositions this
charter and the four stories are authored under; this charter does not restate them.

Per **D-001** this wave deepens each of the four existing `status: draft — stub` docs **in place, no
rename** — preserving and citing each stub's existing Owns/Interface/Diagram as the deepened doc's
seed (STOP-003: re-project and cite, never overwrite). Two of the four — `authorization.md` (s3) and
`bootstrap.md` (s4) — are the two orphaned stubs prior waves explicitly deferred here (Wave 2's
D-001 named `authorization.md` "cited, not a target"; Wave 2's D-003 named
`w4-s4-bootstrap-composition-root` as the home for bootstrap's re-entry mechanics; Wave 3's D-001
confirmed "Wave 4a deepens" `authorization.md`). This wave is where those deferrals resolve.

Per **D-002** the four parts do **not** share one mode/depth. `w4-s1`, `w4-s2`, and `w4-s3` run at
`architecture_mode: tactical-ddd`, `ddd_depth: tactical-ddd` — each core internal meets the ladder's
tactical trigger (strict invariants / rich policy / consistency model / fail-closed) independent of
any provider adapter. `w4-s4` runs deliberately **one rung below**, at `architecture_mode:
control-plane/runtime`, `ddd_depth: ports-and-adapters` — the composition root _composes and
sequences_ the models s1/s2/s3 own rather than authoring a new invariant boundary of its own. This
escalation to `tactical-ddd` in Wave 4a does **not** contradict Wave 3's D-002: that disposition
keyed the tactical escalation on the concurrency (ISO-4) / real-provider-adapter axis, which remains
a Wave 4b concern; Wave 4a escalates on the distinct strict-invariants / consistency-model /
fail-closed axis the core internals meet on their own. The ladder's tactical trigger is disjunctive;
the two waves escalate on different clauses of it.

## Required input docs

- The four per-part frames in [`frames/`](./frames/) —
  [`w4-s1-records-observability.md`](./frames/w4-s1-records-observability.md),
  [`w4-s2-plan-policy-evidence.md`](./frames/w4-s2-plan-policy-evidence.md),
  [`w4-s3-authority-spine.md`](./frames/w4-s3-authority-spine.md), and
  [`w4-s4-bootstrap-composition-root.md`](./frames/w4-s4-bootstrap-composition-root.md) — each
  carrying its source map, `InputResolution`, `AgreedSystemModel`, per-part `architecture_mode`/
  `ddd_depth`, and the cross-part seam wording that seeds its story's frame step.
- [`./decisions.md`](./decisions.md) — the six frame-gate dispositions (D-001..D-006) and the
  confirmed safe assumptions (event-sourcing deferred; GUARD-2 residual sub-state open;
  guard-outcome-to-transition mapping stays Wave 2's; author-time `depends_on` does not block
  framing) all four stories are authored under.
- [`../wave-1-domain/frame.md`](../wave-1-domain/frame.md),
  [`../wave-1-domain/decisions.md`](../wave-1-domain/decisions.md), and Wave 1's two settled story
  briefs — the entity model these core parts govern: Work item is one entity, two phases (Wave 1's
  D-003); Run bound-at-launch to Plan/Policy/Work-profile/Repo-floors (GUARD-1/INV-003);
  Policy/Work-profile/Repo-level-floors as jig-owned domain objects with owner-authored instances
  (Wave 1's D-001) — the shapes the policy/evidence and authority models deepen.
- [`../wave-2-state-machines/frame.md`](../wave-2-state-machines/frame.md),
  [`../wave-2-state-machines/decisions.md`](../wave-2-state-machines/decisions.md), and Wave 2's
  three settled story briefs — the closed work-item and run state machines these core parts serve:
  every transition emits into the Records engine (`w4-s1`); the Fence's grant/deny/route feeds the
  work-item transitions (`w4-s3`); the run-lifecycle view of resume (Wave 2's D-003) whose internal
  re-entry mechanics `w4-s4` owns; the `done`-guard pause point the GUARD-2 seam gates.
- [`../wave-3-ports/frame.md`](../wave-3-ports/frame.md),
  [`../wave-3-ports/decisions.md`](../wave-3-ports/decisions.md), and Wave 3's two settled story
  briefs — the port shapes these core parts deepen the internals of: the `RunStore` port (`w4-s1`),
  the `PlanValidator` port (`w4-s2`), the `Fence` port (`w4-s3`, cited by Wave 3, deepened here),
  and the composition-root wiring point (`w4-s4`) Wave 3 cited but did not model.
- `docs/design/core/records.md`, `docs/design/core/plan-intake.md`,
  `docs/design/core/authorization.md`, `docs/design/core/bootstrap.md` — the four existing stubs
  this wave deepens in place, each preserving and citing its Owns/Interface/Diagram as the seed.
- `docs/design/core/orchestration.md` — the runner, cited as the primary event source and the
  handoff target; Wave 2's settled territory, not re-authored.
- `docs/design/contracts/execution-plan-contract-v0.md`,
  `docs/design/contracts/observability-records-contract-v0.md` — the two v0 data contracts the
  policy/evidence and records surfaces reconcile to; cited and **unfrozen**, not edited (no minting
  field names or event-type strings; a needed change routes back to the seam owner per STOP-003).
- `docs/product/guarantees.md` — the ID-bearing commitments the four parts reconcile to (each
  gloss matches that story's `reconciles_to` frontmatter exactly; the `INV-*` members each story
  also reconciles to are a distinct namespace, listed against `runtime-design-m5a.md` below):
  SEE-1, SEE-2, SEE-3, SEE-4, SEE-5, SEE-6, SEC-1, LIVE-1, LIVE-2 (s1); MERGE-1, MERGE-3, MERGE-4,
  GUARD-1, GUARD-2, CFG-1, CFG-2, CFG-10, EARN-1, EARN-2 (s2); FENCE-1, FENCE-2, FENCE-3, GUARD-1,
  GUARD-2, DOOR-1, DOOR-2, DOOR-3, EARN-1, EARN-2, CFG-10, STACK-4, DRIVE-1, DRIVE-3 (s3); RESUME-1,
  RESUME-2, RESUME-3, RESUME-4, RESUME-5, GUARD-1, CFG-9, ISO-4, SEE-1 (s4).
- `docs/design/notes/runtime-design-m5a.md` — the live handoff-category vocabulary the four parts
  continue (INV-006/INV-007 disciplines; the SURF/OBS/ENF/FAIL/SEQ/VAL families), kept a namespace
  distinct from `INV-*` and product IDs.

## Required output docs

- The deepened Records engine in `docs/design/core/records.md` (the append-only single-leased-writer
  consistency model, projection-purity, redaction/export), authored by `w4-s1` — deepened in place,
  preserving and citing the existing Owns/Interface/Diagram as its seed; the observability-records
  v0 contract cited and unfrozen, not edited.
- The deepened plan/policy/evidence model in `docs/design/core/plan-intake.md` (parse/validate/
  reject, the policy model, the evidence/attestation category model, the GUARD-2 rule-governing-
  surface declaration), authored by `w4-s2` — deepened in place; the execution-plan v0 contract
  cited and unfrozen, not edited.
- The deepened authority spine in `docs/design/core/authorization.md` (the Fence classifier, the
  Doorbell escalation, the capability-attestation gate, the GUARD-2 enforcement mechanism), authored
  by `w4-s3` — deepened in place.
- The deepened bootstrap/composition root in `docs/design/core/bootstrap.md` (launch sequencing,
  `run.previewed`, storage preflight, provider wiring, the resume re-entry procedure), authored by
  `w4-s4` — deepened in place; cites `records.md`/`plan-intake.md`/`authorization.md` as the parts
  it wires, does not redesign them.
- This wave's [`decisions.md`](./decisions.md), carrying D-001..D-006 and any design-review
  dispositions the four stories add.
- This wave's [`story-dag.md`](./story-dag.md) — the author-time dependency graph (the first wave to
  carry one; W0–W3 had no internal author-time deps).

## Questions it must answer

- For **`w4-s1`**: what is the append-only event log's consistency model (single-leased-writer,
  write-conflict rejection, replay-determinism), and how are the state/summary/metrics/notices
  projections pure functions of the log that never author it (INV-006)? How is the records/evidence
  surface designed so Wave 4b's `w4-s6-execution-host` can frame its SEC-2 no-phone-home attestation
  against it? Why is full event-sourcing/CQRS ceremony a deferred subprofile, not adopted now?
- For **`w4-s2`**: what is the policy model's content and shape (Wave 1's D-001: jig owns type/shape/
  invariants), and the evidence/attestation category model (the three categories under policy;
  observed-by-the-runner-not-self-reported, MERGE-1; capability-proof freshness/staleness, EARN-1/2)?
  How is the evidence/attestation model designed so Wave 4b's `w4-s6-execution-host` can frame its
  EARN-2 attestation against it?
- **GUARD-2 (both `w4-s2` and `w4-s3`, worded identically):** how does the three-way seam give
  GUARD-2 an owner — `w4-s2` owns the rule (what counts as a rule-governing surface, and that
  touching one forces fresh evidence before `done` is judged), `w4-s3` co-owns enforcement (the
  Fence detects a request touching a declared rule-governing surface and refuses to auto-grant it;
  the Doorbell captures the owner's re-approval durably, DOOR-2), and Wave 2's work-item-lifecycle
  supplies the pause point (the `done` guard checks "no unresolved GUARD-2 pause")? The residual
  sub-question — a distinct "re-approval pending" sub-state vs. reuse of Wave 2's `parked` — stays
  **OPEN** for the author session (or a Wave 2 re-projection), not resolved here.
- For **`w4-s3`**: how does the Fence's fixed CFG-10 category boundary decide grant/deny/route
  (fail-closed, never model-adjudicated), how does the Doorbell park durably and grant narrowly
  (DOOR-1..3), and how does the capability-attestation gate judge freshness (EARN-1/2)? The
  guard-outcome-to-transition mapping (grant→proceed/deny→blocked/route→parked) stays Wave 2's; this
  part supplies the classifier `authorize(...)` invokes, not the transition table.
- For **`w4-s4`**: what is the composition root's launch sequence (load→bind→resolve→wire→preflight→
  allocate→handoff), how does storage preflight fail closed (RESUME-4), how does GUARD-1 binding
  happen at launch, and — the territory Wave 2's D-003 deferred here — what is the resume re-entry
  procedure's sequencing/idempotency (RESUME-3 no-double-effect across a re-entry; GUARD-1/INV-003
  immutability preserved across resume)?
- **Cross-part (all four):** which new invariants does each part mint (as `INV-009`+ **candidates**,
  un-numbered), and how are they flagged for cross-wave reconciliation with Wave 2's `w2-s3` and
  Wave 3's own candidates at U9, keeping the three ID namespaces (product IDs / `INV-*` / M5a handoff
  categories) distinct?

## What it must not decide

- Anything Wave 1 already settled: the entity model, Work-item-as-one-entity (Wave 1's D-003), the
  plan-intake placement (Wave 1's D-002, runtime-side), or the domain ownership of Policy/Work-
  profile/Repo-level-floors (Wave 1's D-001). This wave deepens those entities' core internals; it
  does not re-open the entities.
- Anything Wave 2 already settled: the work-item and run **state machines**, their transition
  tables, guards, and events. The GUARD-2 seam **gates** an already-candidate-named `done`
  transition; it does not author a new state (the residual "re-approval pending" sub-state question
  is left open, and any actual `done`-guard change is a future Wave 2 re-projection, flagged for
  U9). `w4-s4` owns bootstrap's internal **re-entry procedure**, not the run-lifecycle **states** —
  those stay Wave 2's.
- Anything Wave 3 already settled: the port **shapes** (`RunStore`, `PlanValidator`, `Fence`, the
  operator-control and four provider ports) and their owns/implements/must-not splits. This wave
  deepens the port **internals** (the engine, the policy/evidence content, the classifier rules,
  the composition sequencing), not the port boundaries.
- Any **provider adapter** — an Agent implementation, an execution-host sandbox, a forge
  integration, a work-source connector — is Wave 4b (provider parts). `w4-s1`'s records/evidence
  surface and `w4-s2`'s evidence/attestation model are Wave 4b's **frame-time contract** for
  `w4-s6-execution-host` (SEC-2 / EARN-2); this wave designs them with that consumer in view but
  authors no adapter.
- **Freezing** either v0 data contract — `execution-plan-contract-v0.md` and
  `observability-records-contract-v0.md` stay **cited and unfrozen**; the four parts name the
  properties they reconcile to without minting field names or event-type strings; a needed change
  routes back to the seam owner (STOP-003), never a silent mutation.
- **Numbering** the consolidated invariant ledger — the four parts name `INV-009`+ **candidates**;
  the physical numbering is coordinated with Wave 2's `w2-s3` and Wave 3's own candidates at
  whichever session consolidates first (tracked at U9; settled by `docs/design/conventions.md`'s
  continuation rule), never hard-numbered here. Never reset `INV-001..008`.
- Concurrency / parallel-workspace isolation (ISO-4) **mechanics** and real-driver behavior — the
  axis Wave 3's D-002 named as the gate for the _other_ tactical escalation; out of scope until
  Wave 4b. (Wave 4a escalates on the strict-invariants/consistency/fail-closed axis, not this one.)
- Field-level schema, TypeScript interfaces, JSON Schema, method signatures, or any frozen contract
  — deferred per `docs/design/README.md` and this track's non-goals.

## Exit criteria

- All four stories (`w4-s1`, `w4-s2`, `w4-s3`, `w4-s4`) are run and settled: zero open blocking
  suggestions from `review-technical-design` (the full method — architecture-enforceability,
  domain-correctness, agreement-integrity), applied over their authored design docs.
- The four deepened core docs exist at their resolved targets (`records.md`, `plan-intake.md`,
  `authorization.md`, `bootstrap.md`), each preserving-and-citing the existing stub's
  Owns/Interface/Diagram as the seed rather than overwriting it (STOP-003), each reconciling to its
  `reconciles_to` IDs, and continuing (never resetting) the `INV-*` vocabulary.
- `w4-s1`'s consistency model (single-leased-writer, write-conflict-rejected, replay-determinism)
  and projection-purity invariant are stated; the event-sourcing subprofile is explicitly deferred.
- `w4-s2`'s policy model and evidence/attestation category model are stated, with observed-not-self-
  reported (MERGE-1) and capability-proof freshness/staleness (EARN-1/2) as load-bearing.
- The **GUARD-2 three-way seam** is stated **identically** in the `w4-s2` and `w4-s3` authored docs:
  `w4-s2` owns the rule, `w4-s3` co-owns enforcement, Wave 2's work-item-lifecycle supplies the
  pause point; the residual sub-state question is recorded as an open question, not resolved.
- `w4-s3`'s Fence classifier (fixed CFG-10 boundary, fail-closed), Doorbell (durable park, narrow
  grant), and capability-attestation gate (freshness) are stated; the guard-outcome-to-transition
  mapping stays cited from Wave 2, not redesigned.
- `w4-s4`'s launch sequence, storage preflight, GUARD-1 binding, and — the deferred territory — the
  resume re-entry procedure (RESUME-3 no-double-effect; GUARD-1/INV-003 immutability across resume)
  are stated; the run-lifecycle states themselves stay cited from Wave 2, not redesigned. The
  **records-store construction seam** (s1↔s4) and **Fence/Doorbell wiring seam** (s3↔s4) are worded
  identically across the paired docs.
- The new invariant candidates each part mints are named for `INV-009`+ and flagged for cross-wave
  reconciliation with Wave 2's and Wave 3's candidates; the three ID namespaces are kept distinct.
- D-001..D-006 are recorded in this wave's `decisions.md`, and every frame item flagged `requires
approval` (per-part depth; GUARD-2 seam ownership) is stated as settled in the authored docs
  consistent with those dispositions. This wave's `story-dag.md` reflects the author-time DAG
  (s1/s2/s3 parallel; s4 after all three).

## Evidence required

- This charter (`README.md`), the four per-part frames in [`frames/`](./frames/), and this wave's
  [`story-dag.md`](./story-dag.md).
- Each story's own evidence: its authored `design_targets`, its `review-technical-design` report,
  and its `decisions.md` entries.
- This wave's [`decisions.md`](./decisions.md).

## Story order

Author-time, the four stories form this wave's first internal **DAG** (see
[`story-dag.md`](./story-dag.md) for the diagram). `w4-s1`, `w4-s2`, and `w4-s3` are **parallel
author-time roots** (`depends_on: []` each): they deepen three distinct core internals — the Records
engine, the plan/policy/evidence model, and the authority spine — with no shared state-derivation,
and their one shared element (the GUARD-2 seam wording across s2/s3) is fixed by the frames, not
authored fresh by one story. `w4-s4` (bootstrap/composition root) has **author-time `depends_on:
[w4-s1-records-observability, w4-s2-plan-policy-evidence, w4-s3-authority-spine]`** (D-004): it
constructs the records store (`w4-s1`), wires the plan/policy intake (`w4-s2`), and wires the
authority spine (`w4-s3`) at launch, so its deepened content cites their settled shapes. This is an
author-time constraint only; at frame time all four consumed only Waves 1–3, so framing ran in one
pass.

1. [`w4-s1-records-observability`](./stories/w4-s1-records-observability.md) — the Records event-log
   engine: the append-only single-leased-writer consistency model, projection-purity, redaction/
   export. `depends_on: []` (parallel root). `tactical-ddd` / `tactical-ddd` (D-002).
2. [`w4-s2-plan-policy-evidence`](./stories/w4-s2-plan-policy-evidence.md) — plan intake, the policy
   model, and the evidence/attestation category model; owns the GUARD-2 **rule**. `depends_on: []`
   (parallel root). `tactical-ddd` / `tactical-ddd` (D-002).
3. [`w4-s3-authority-spine`](./stories/w4-s3-authority-spine.md) — the Fence classifier, the
   Doorbell, the capability-attestation gate; co-owns GUARD-2 **enforcement**. `depends_on: []`
   (parallel root). `tactical-ddd` / `tactical-ddd` (D-002).
4. [`w4-s4-bootstrap-composition-root`](./stories/w4-s4-bootstrap-composition-root.md) — launch
   sequencing, storage preflight, GUARD-1 binding, the resume re-entry procedure. `depends_on:
[w4-s1-records-observability, w4-s2-plan-policy-evidence, w4-s3-authority-spine]` (D-004).
   `control-plane/runtime` / `ports-and-adapters` (D-002, deliberately one rung below the others).
