---
id: w4-s4-bootstrap-composition-root
wave: wave-4a-core
status: designed
depends_on: [
    w4-s1-records-observability,
    w4-s2-plan-policy-evidence,
    w4-s3-authority-spine,
  ] # author-time DAG (D-004): bootstrap constructs the records store (w4-s1), wires the plan/policy intake (w4-s2), and wires the authority spine (w4-s3) at launch. Frame-time consumed only Waves 1-3; this is an authoring-sequence constraint, not a frame-time blocker
design_targets: [docs/design/core/bootstrap.md] # deepen in place (D-001): launch sequencing, run.previewed, storage preflight, provider wiring, and the resume re-entry procedure Wave 2's D-003 deferred here by name. The second ORPHANED stub. Cites records.md / plan-intake.md / authorization.md as the parts it wires - does not redesign them. author-technical-design may relocate via DocStructurePlan
reconciles_to:
  [
    RESUME-1,
    RESUME-2,
    RESUME-3,
    RESUME-4,
    RESUME-5,
    GUARD-1,
    CFG-9,
    ISO-4,
    SEE-1,
    INV-003,
  ]
---

# w4-s4-bootstrap-composition-root — design the composition root and the resume re-entry procedure

## Objective

Brief a future design session to author **bootstrap / the composition root** — launch sequencing,
`run.previewed`, storage preflight (RESUME-4), GUARD-1 launch-binding, CFG-9 (setup-only-when-stale),
and the **resume re-entry procedure** Wave 2's D-003 deferred here **by name** — deepening
`docs/design/core/bootstrap.md` **in place** (D-001). This is the second of the two orphaned stubs
prior waves deferred to Wave 4a. This session moves from the composition sequence the stub already
draws — load/validate plan → bind policy+floors → resolve track/work-profile → wire providers →
storage preflight → allocate run identity → hand off — into an authored composition root that
sequences those steps precisely and adds the internal mechanics of resuming into an already-allocated
run, which the stub named as an undesigned extension point.

Unlike the other three Wave 4a parts, bootstrap does **not** author a new invariant-bearing domain
model of its own — it **composes and sequences** the models `w4-s1` (the records store), `w4-s2` (the
plan/policy intake), and `w4-s3` (the authority spine) already own. Per **D-002** it therefore runs
deliberately **one rung below** them, at `architecture_mode: control-plane/runtime`, `ddd_depth:
ports-and-adapters`: the ladder names "composition/wiring boundary" as `ports-and-adapters`' own
artifact, and bootstrap — "the one place that imports provider implementations" — is the textbook
composition root. Its one territory with real invariant content, the resume re-entry procedure, is a
**sequencing/idempotency** discipline over already-owned invariants (RESUME-3 no-double-effect;
GUARD-1/INV-003 immutability across resume), not a new consistency boundary of its own.

Per D-001 this session **deepens `bootstrap.md` in place**, preserving and citing its existing
Owns/flowchart as the seed (STOP-003: re-project and cite, never overwrite). It **cites**
`docs/design/core/records.md`, `docs/design/core/plan-intake.md`, and
`docs/design/core/authorization.md` as the parts it wires — it does **not** redesign them.

## Inputs to read

- [`../frames/w4-s4-bootstrap-composition-root.md`](../frames/w4-s4-bootstrap-composition-root.md) —
  this part's frame: the source map, `InputResolution`, `AgreedSystemModel` (`architecture_mode`
  `control-plane/runtime`, `ddd_depth` `ports-and-adapters`), the entity model (bootstrap / storage
  preflight / resume re-entry / provider wiring), the invariant candidates (§7), and the
  records-store-construction and Fence/Doorbell-wiring seam wordings.
- [`../decisions.md`](../decisions.md) — the frame-gate dispositions this story is authored under
  (D-001 deepen in place; D-002 `control-plane/runtime`/`ports-and-adapters`, deliberately one rung
  below the siblings; D-004 author-time `depends_on: [w4-s1, w4-s2, w4-s3]`, the s1↔s4 records-store
  construction seam and the s3↔s4 Fence/Doorbell wiring seam worded identically across the paired
  stories; D-005 `INV-009`+ candidates un-numbered) and the confirmed safe assumption (the author-time
  `depends_on` does not block framing).
- [`../../wave-1-domain/frame.md`](../../wave-1-domain/frame.md) and Wave 1's settled story briefs —
  Track binds one current Plan/Policy/Work-profile (by reference); Run bound-at-launch to
  Plan/Policy/Work-profile/Repo-floors, fixed for the run's duration (GUARD-1/INV-003) — the binding
  this session performs.
- [`../../wave-2-state-machines/frame.md`](../../wave-2-state-machines/frame.md),
  [`../../wave-2-state-machines/decisions.md`](../../wave-2-state-machines/decisions.md), and Wave 2's
  settled story briefs — Wave 2's D-003: `w2-s2` owns only the run-lifecycle **view** of resume
  (states, RESUME-1..5 guards, GUARD-1/INV-003 immutability); bootstrap's internal re-entry mechanics
  deferred to **this story by name**. This session owns the re-entry **procedure**, not the
  run-lifecycle **states**.
- [`../../wave-3-ports/frame.md`](../../wave-3-ports/frame.md) and Wave 3's settled story briefs —
  bootstrap named as "the composition root... the one place that imports provider implementations,"
  cited not modeled by Wave 3 ("Wave 3 frames the port shapes bootstrap wires, not bootstrap's own
  wiring rules"); this session wires those port shapes without redesigning them.
- `docs/design/core/bootstrap.md` — the existing stub this session deepens in place: the Owns list
  (load/validate plan, bind policy+floors frozen at launch, resolve track/work-profile, set up
  isolated workspace, wire provider adapters, storage preflight, allocate run identity + binding
  record, hand off), the flowchart, `run.previewed` as recorded-but-non-committing, and the deferred
  resume/attestation extension points.
- `docs/design/core/records.md` — **cited, not edited** (that is `w4-s1`'s target): the records store
  this session constructs and wires at launch (the binding-record's first append); the s1↔s4
  construction seam.
- `docs/design/core/plan-intake.md` — **cited, not edited** (that is `w4-s2`'s target): the plan
  intake this session delegates load/validate to, and the policy this session binds at launch.
- `docs/design/core/authorization.md` — **cited, not edited** (that is `w4-s3`'s target): the
  Fence/Doorbell this session wires with bound policy at launch; the s3↔s4 wiring seam.
- `docs/design/core/orchestration.md` — **cited, not edited**: the runner this session hands off to
  once the run is ready (Wave 2's settled territory).
- `docs/product/guarantees.md` — RESUME-1..5 (durable progress, checkpoint resume, no-double-effect,
  fail-closed-diagnosable, resume integrity), GUARD-1 (policy fixed at launch), CFG-9 (setup runs only
  when the workspace is stale), ISO-4 (isolated workspace per run), SEE-1 (run-identity/visibility
  binding record) this session reconciles to.
- `docs/design/notes/runtime-design-m5a.md` — the SEQ/FAIL families and the launch/bootstrap
  precedent this session continues — kept a namespace distinct from `INV-*` and product IDs.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc at the design_target: the deepened composition root in
   `docs/design/core/bootstrap.md` — the launch sequence, `run.previewed`, storage preflight, GUARD-1
   binding, provider wiring, and the resume re-entry procedure — preserving and citing the existing
   Owns/flowchart as the seed and citing (not redesigning) the three parts it wires.
2. Open questions, logged (never invented answers).
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting. This session
   names its **invariant candidates** (binding-record-append-precedes-run-readiness — bootstrap's own
   ordering rule, "only after the audit append succeeds"; resume-re-entry-preserves-original-binding —
   GUARD-1/INV-003 held across re-entry, not merely at first launch). It does **not** hard-number
   them: candidates for `INV-009`+, flagged for cross-wave reconciliation with Wave 2's `w2-s3` and
   Wave 3's candidates (settled at U9).
4. Risks and deferred decisions — including the storage-preflight failure taxonomy the stub named as
   a gap.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- What is the composition root's **launch sequence** (load → bind → resolve → wire → preflight →
  allocate → handoff), and how does `run.previewed` walk load/validate/bind while committing no run
  identity, workspace, provider, or privileged side effect (its own audit event, one-command/
  one-audit)?
- How does **storage preflight** check jig's own storage can do what it needs before a run starts,
  and **fail closed** with a clear reason rather than risk a run on unreliable storage (RESUME-4)?
  What is the failure taxonomy the stub named as a gap?
- How does **GUARD-1 binding** happen at launch — policy plus repo-level floors bound and frozen for
  the run's duration — and how is the **binding record** appended (SEE-1) only after the audit append
  succeeds (binding-record-append-precedes-run-readiness)?
- What is the **resume re-entry procedure** — the territory Wave 2's D-003 deferred here: re-entering
  bootstrap for an already-allocated run, re-validating (not re-choosing) the original binding
  (GUARD-1/INV-003 immutability across resume), re-wiring providers, and re-running storage preflight,
  without double-effecting already-completed irreversible actions (RESUME-3 no-double-effect) — before
  handing back to orchestration at the run's last safe checkpoint (Wave 2's run-lifecycle states,
  cited)?
- What is the **records-store construction seam** with `w4-s1`: `w4-s1` owns the store's shape,
  consistency model, and invariants; this session (`w4-s4`) owns constructing and wiring the store at
  launch, including the first binding-record append. State this seam wording **identically** to
  `w4-s1`'s story.
- What is the **Fence/Doorbell wiring seam** with `w4-s3`: `w4-s3` owns the classifier's and
  escalation's rules; this session (`w4-s4`) owns wiring them with bound policy at launch. State this
  seam wording **identically** to `w4-s3`'s story.

## Invariants to preserve

- `GUARD-1`, `INV-003` — policy (plus repo floors) is fixed at launch and immutable for the run's
  duration; this session performs the binding, and the resume re-entry procedure must hold it across a
  re-entry, not merely at first launch.
- `RESUME-1`..`RESUME-5` — durable progress; resume from the last safe checkpoint; no double effect;
  fail closed and diagnosable; resume integrity (owner re-approval and fresh evidence when
  safety-relevant assumptions changed). The re-entry procedure must satisfy all five; RESUME-5's
  re-approval is captured through the authority spine (`w4-s3`, cited).
- `CFG-9` — setup runs only when the workspace is stale, skipped when the tree is already fresh.
- `ISO-4` — each run works in its own isolated workspace.
- `SEE-1` — the binding record (runId, planRef, policyRef, trackRef) binds run identity and
  visibility; appended only after the audit append succeeds.
- No new `INV-*` numbers are hard-numbered by this story; it **names invariant candidates**
  (binding-record-append-precedes-run-readiness; resume-re-entry-preserves-original-binding) for
  `INV-009`+, flagged for cross-wave coordination with Wave 2's and Wave 3's candidates. If it must
  number one locally, it continues from `INV-009` (never resets) and records why in decisions.md.

## Must not decide

- The **Records engine's** internal consistency model — that is `w4-s1`. This session **constructs and
  wires** the store `w4-s1` defines (the s1↔s4 construction seam, worded identically in both stories);
  it does not redesign the log's shape or consistency model.
- **Policy's content** or the **evidence/attestation model** — that is `w4-s2`. This session **binds
  and wires** them at launch; it does not author their content.
- The **Fence/Doorbell classifier rules** — that is `w4-s3`. This session **wires** them with bound
  policy at launch (the s3↔s4 wiring seam, worded identically in both stories); it does not author the
  classifier.
- Anything Wave 2 settled: the work-item and run **state machines**, and the run-lifecycle **view** of
  resume (RESUME-1..5 guards, GUARD-1/INV-003, the states themselves). This session owns only the
  composition root's internal **re-entry procedure** (sequencing, idempotency) Wave 2's D-003 deferred
  here by name; the run-lifecycle states stay Wave 2's, cited not redesigned.
- Anything Wave 3 settled: the four provider port **shapes** and the composition-root **as a cited
  wiring point**. This session frames the wiring **sequence**, citing Wave 3's port shapes, not
  redesigning them.
- Any **provider adapter** implementation — an Agent, an execution-host sandbox, a forge integration,
  a work-source connector — is Wave 4b. This session frames how bootstrap **selects and wires**
  adapters against Wave 3's port shapes, not the adapters.
- **Numbering** the consolidated invariant ledger — this session names candidates; numbering from
  `INV-009` is coordinated with Wave 2's and Wave 3's candidates at consolidation (U9).
- Field-level schema, TypeScript, JSON Schema, method signatures, the exact binding-record shape
  beyond the four named identifiers, or any frozen contract — deferred per `docs/design/README.md` and
  `bootstrap.md`'s own note.

## Exit criteria

- The deepened composition root exists at `docs/design/core/bootstrap.md`, stating the launch
  sequence, `run.previewed`, storage preflight (RESUME-4, with its failure taxonomy), GUARD-1
  binding, and — the deferred territory — the resume re-entry procedure (RESUME-3 no-double-effect;
  GUARD-1/INV-003 immutability across resume) as the load-bearing content, not afterthoughts.
- The existing Owns/flowchart are **preserved and cited** as the seed, re-projected and extended
  rather than overwritten; any divergence is named explicitly (STOP-003).
- The **records-store construction seam** (s1↔s4) and the **Fence/Doorbell wiring seam** (s3↔s4) are
  stated **identically** to `w4-s1`'s and `w4-s3`'s authored docs respectively; `records.md`,
  `plan-intake.md`, and `authorization.md` are **cited, not redesigned**.
- The run-lifecycle states and Wave 2's run-lifecycle **view** of resume are cited from Wave 2, not
  redesigned; this session owns only the internal re-entry procedure.
- The invariant candidates (binding-record-append-precedes-run-readiness;
  resume-re-entry-preserves-original-binding) are named for `INV-009`+ and flagged for cross-wave
  coordination; the three ID namespaces are kept distinct.
- design-review verdict settled (zero open blocking suggestions), applied at the full method below.

## Evidence required

- This part's frame ([`../frames/w4-s4-bootstrap-composition-root.md`](../frames/w4-s4-bootstrap-composition-root.md))
  — the frame that seeds this story's frame step.
- The authored design_target (`docs/design/core/bootstrap.md`).
- The design-review report.
- The decisions.md entries (this wave's [`../decisions.md`](../decisions.md)).

## Design review & handoff

This session runs the technical-design method itself, at **full weight** — this story authors a real
jig core internal (the composition root that turns authored configuration into a ready run, and the
resume re-entry procedure that safely re-enters one), so the full frame → author → design-review pass
applies, not the light method Wave 0 used for its scaffold-only stories.

1. frame-technical-design → a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode` `control-plane/runtime`, `ddd_depth` `ports-and-adapters` per D-002 — one rung
   below the siblings). This part's build-time frame at
   [`../frames/w4-s4-bootstrap-composition-root.md`](../frames/w4-s4-bootstrap-composition-root.md)
   seeds it; the session confirms and extends the `AgreedSystemModel`. Because this story's author-time
   `depends_on` is `[w4-s1, w4-s2, w4-s3]` (D-004), it should run after (or with visibility into) the
   three siblings' settled output, so its deepened content cites their settled shapes.
2. author-technical-design → the deepened composition root at `docs/design/core/bootstrap.md`,
   preserving and citing the existing Owns/flowchart as the seed and citing (not redesigning)
   `records.md`, `plan-intake.md`, `authorization.md`; the records-store construction seam worded
   identically to `w4-s1`; the Fence/Doorbell wiring seam worded identically to `w4-s3`.
3. review-technical-design → three lenses (architecture-enforceability: the launch sequence binds
   policy at launch and appends the binding record only after the audit append; storage preflight
   fails closed; the resume re-entry procedure preserves GUARD-1/INV-003 immutability and RESUME-3
   no-double-effect; bootstrap wires but does not redesign the three parts. domain-correctness:
   bootstrap reconciles to RESUME-1..5 / GUARD-1 / CFG-9 / ISO-4 / SEE-1 / INV-003; agreement-integrity:
   nothing contradicts the part frame's `AgreedSystemModel`, Wave 1's binding, Wave 2's run-lifecycle
   resume view, Wave 3's provider-port shapes, or — the load-bearing checks — the s1↔s4 construction
   seam wording in `w4-s1` and the s3↔s4 wiring seam wording in `w4-s3`). Dispositions recorded into
   this wave's [`../decisions.md`](../decisions.md); settled = zero open blocking suggestions.

Handoff: when settled, update status and note the resolved design_target in the track's future
traceability matrix; hand the named invariant candidates forward for `INV-009`+ consolidation; confirm
the composition root cites (never redesigns) the three sibling parts it wires.

## Coordinator resolution (design_targets)

Per D-001 (deepen in place, no rename), this story deepens `docs/design/core/bootstrap.md` directly —
preserving and citing its existing Owns/flowchart as the seed and extending it into the deepened
composition root with its resume re-entry procedure — rather than authoring a new sibling doc. This is
the STOP-003-compliant "re-project and cite," resolving the second of the two orphaned stubs prior
waves deferred to Wave 4a by name (Wave 2's D-003 named this story as the home for bootstrap's
re-entry mechanics). `docs/design/core/records.md`, `docs/design/core/plan-intake.md`, and
`docs/design/core/authorization.md` are **cited, not redesigned** — this story wires them. The future
`author-technical-design` session may relocate the target via its `DocStructurePlan`; this brief
records the resolved target, not a frozen path. Author-time `depends_on: [w4-s1-records-observability,
w4-s2-plan-policy-evidence, w4-s3-authority-spine]` (D-004) drives this wave's `story-dag.md`.
