---
id: w5-s2-recovery-records-integration-red-team
wave: wave-5-red-team
status: designed
depends_on: [] # D-004: split by probe surface, not a logical dependency on w5-s1
design_targets: [] # D-002/D-006: red-team/probe-only; no docs/design targets, only planning-track probe outputs and routed findings
reconciles_to:
  [
    RESUME-1,
    RESUME-2,
    RESUME-3,
    RESUME-4,
    RESUME-5,
    GUARD-1,
    GUARD-2,
    ISO-4,
    SEE-1,
    SEE-3,
    SEE-5,
    SEE-6,
    LIVE-1,
    LIVE-2,
    SEC-1,
    INV-003,
    INV-006,
  ]
---

# w5-s2-recovery-records-integration-red-team — probe recovery, records, and bootstrap integration

## Objective

Brief a future design session to author the **recovery/records/bootstrap integration red-team probe
package** — a planning-track-only adversarial pass over the composed claims made by Wave 2's run
lifecycle and recovery model, Wave 4a's Records engine, and Wave 4a's bootstrap / resume re-entry
procedure. This session moves from the approved Wave 5 frame's recovery/records probe surface to an
authored probe brief that stress-tests stop/resume, safe checkpoint handling, binding immutability,
no-double-effect, liveness/notices, redaction/export posture, and record causality **as an integrated
surface** rather than as isolated design notes. It does **not** author or deepen `docs/design/**`; it
produces routed findings, contradiction checks, open questions, and review evidence only.

Per D-002 and D-006 this story stays **probe-only**. It does not redesign Wave 2's lifecycle states,
Wave 4a's records engine, or Wave 4a's bootstrap composition root. Its job is to ask whether those
settled surfaces remain coherent when composed: does a stopped run resume from a safe checkpoint
without silently changing bindings; do records remain the evidence rather than a parallel narrative;
do notices and export stay reconstructible and safe to keep; and do recovery and bootstrap claims
stay consistent with the v0 observability contract and the product guarantees?

## Inputs to read

- [`../frame.md`](../frame.md) — the approved Wave 5 frame: source map, `InputResolution`,
  `AgreedSystemModel`, the recovery/records integration probe surface, and the routed-finding
  posture this story inherits.
- [`../decisions.md`](../decisions.md) — the frame-gate dispositions this story is authored under:
  D-002 red-team/probe-only scope; D-004 this story owns the recovery/records/bootstrap probe
  surface; D-005 read-only invariant handling; D-006 `contract/seam design` / `strategic-only` plus
  routed findings back to existing owners or U9.
- [`../../../README.md`](../../../README.md), [`../frame.md`](../frame.md), and
  [`../decisions.md`](../decisions.md) — the durable pre-U9 Wave 5 scope and approved split that
  keep this story on recovery/records/bootstrap integration rather than
  authority/provider/SEC-2 ownership.
- [`../../wave-2-state-machines/frame.md`](../../wave-2-state-machines/frame.md) and
  [`../../wave-2-state-machines/stories/w2-s2-run-lifecycle-and-recovery.md`](../../wave-2-state-machines/stories/w2-s2-run-lifecycle-and-recovery.md)
  — the run-lifecycle and recovery semantics this story probes: `previewed → started → stopped \|
resumed \| completed`, RESUME-1..5, GUARD-1 across resume, liveness-driven stops, and the seam to
  bootstrap re-entry.
- [`../../wave-4a-core/frames/w4-s1-records-observability.md`](../../wave-4a-core/frames/w4-s1-records-observability.md)
  and [`../../wave-4a-core/stories/w4-s1-records-observability.md`](../../wave-4a-core/stories/w4-s1-records-observability.md)
  — the append-only log, projection-purity discipline, notice/export posture, and `INV-006` records
  invariant this story checks under recovery pressure.
- [`../../wave-4a-core/frames/w4-s4-bootstrap-composition-root.md`](../../wave-4a-core/frames/w4-s4-bootstrap-composition-root.md)
  and [`../../wave-4a-core/stories/w4-s4-bootstrap-composition-root.md`](../../wave-4a-core/stories/w4-s4-bootstrap-composition-root.md)
  — the binding-record ordering, storage preflight, run preview semantics, and resume re-entry
  procedure this story probes for contradiction against Wave 2 and the records surface.
- [`../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md`](../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md)
  and [`../../wave-4a-core/stories/w4-s2-plan-policy-evidence.md`](../../wave-4a-core/stories/w4-s2-plan-policy-evidence.md)
  — GUARD-2's rule declaration and the evidence model the recovery path may require after changed
  assumptions.
- `docs/design/contracts/observability-records-contract-v0.md` — the seam properties this composed
  surface must still satisfy: run identity/input binding, event causality, blocks/stops/notices,
  recovery/resume, redaction/export posture, and learning-loop-readable outputs.
- `docs/design/core/records.md` and `docs/design/core/bootstrap.md` — the current design homes the
  story cites and may route findings back to, but does not edit.
- `docs/product/guarantees.md` — exact IDs this story reconciles to: RESUME-1/2/3/4/5, GUARD-1/2,
  ISO-4, SEE-1/3/5/6, LIVE-1/2, SEC-1.
- `docs/product/concepts.md` — product-visible run/story outcomes and the runner/worker boundary this
  story keeps coherent under recovery pressure.
- `docs/design/notes/runtime-design-m5a.md` — `INV-003` and `INV-006`, plus the earlier recovery and
  records vocabulary this story pressure-tests without renumbering.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable planning-track probe artifact(s), not `docs/design/**`: the authored recovery/records
   integration red-team package consisting of contradiction checks, scenario families, routed
   findings, and review evidence produced from this brief. `design_targets` stays empty by design.
2. Open questions, logged (never invented answers) — especially where stop/resume, records, notices,
   or export remain under-specified when composed across waves.
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting numbering.
   This story explicitly pressure-tests `INV-003` and `INV-006`, plus the Wave 4a/Wave 2
   `INV-009`+ candidates around binding-ordering and resume-binding preservation, but it does **not**
   hard-number any newly exposed invariant locally; new invariants remain findings or candidates for
   the owning wave/U9.
4. Risks and deferred decisions — including any contradiction between Wave 2's lifecycle view and
   Wave 4a's records/bootstrap claims, any export/redaction ambiguity, and any U9 collection risk for
   cross-wave traceability.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- When recovery, records, and bootstrap are treated as one surface, do **RESUME-1..5** still hold
  coherently — durable progress, safe checkpoint resume, no-double-effect, fail-closed diagnosable
  stop, and resume integrity — or do the authored seams leave contradiction gaps?
- Does **GUARD-1 / INV-003 binding immutability** actually survive the resume path end to end: the
  Wave 2 lifecycle view, Wave 4a binding record, and Wave 4a resume re-entry procedure all agree that
  bindings do not silently change across resume?
- Do records remain **the evidence** (`SEE-3`, `INV-006`) under recovery pressure — no parallel
  narrative, no state advanced outside the log, and notices/export still reconstructible from the
  same evidence trail?
- Are **stopped**, **parked**, liveness signals, and **notice** behavior coherent across Wave 2's run
  lifecycle, Wave 4a's records engine, and the observability-records contract, or is some stop/notice
  condition under-specified when read across those layers?
- Does the bootstrap claim that the **binding record append precedes run readiness** and the resume
  claim that re-entry preserves the original binding stay consistent with Wave 2's lifecycle and the
  observability contract's input-binding and causality requirements?
- Are **redaction and export** still safe under recovery scenarios — especially interrupted runs,
  resumed runs, and stale/overdue notices — without contradicting `SEC-1`, `SEE-6`, or the records
  contract's redaction/export posture?

## Invariants to preserve

- `RESUME-1`, `RESUME-2`, `RESUME-3`, `RESUME-4`, `RESUME-5` — durable progress, safe checkpoint
  resume, no double effect, fail-closed diagnosable stop, and resume integrity.
- `GUARD-1`, `GUARD-2` — bindings fixed at launch and explicit re-approval on changed safety-relevant
  assumptions.
- `ISO-4` — each run uses its own isolated workspace; this story probes recovery coherence with that
  guarantee, not the scheduling policy itself.
- `SEE-1`, `SEE-3`, `SEE-5`, `SEE-6` — binding record visibility, records as evidence, notices as a
  triaged queue, and write-once redacted export.
- `LIVE-1`, `LIVE-2` — liveness signals distinguish thinking/stuck/dead and park the run rather than
  burning indefinitely.
- `SEC-1` — sensitive values stay out of records, logs, artifacts, and exports.
- `INV-003`, `INV-006` — launch binding is fixed for the run; records are the evidence and all
  projections remain pure replay of the append-only log.
- Existing Wave 2/Wave 4a `INV-009`+ candidates remain **read-only** probe surfaces here:
  binding-record-append-precedes-run-readiness, resume-re-entry-preserves-original-binding,
  write-conflict-rejected, and replay-determinism are checked, not renumbered.

## Must not decide

- Any new run lifecycle state, bootstrap procedure, records schema, event-type string, or log
  consistency model. This story probes the authored surfaces and routes findings back; it does not
  redesign them locally.
- Any `docs/design/**` updates, v0 contract mutations, runtime code, schema, TypeScript, or
  implementation tasking.
- The authority/provider/SEC-2 adversarial surface owned by `w5-s1`. This story stays on the
  recovery/records/bootstrap integration surface even when findings touch overlapping guarantees.
- Hard-numbering new `INV-*` values. Newly exposed invariants remain findings or candidate notes for
  the owning wave/U9.
- Any dependency on `w5-s1`. Per D-004 this story is split by probe surface, not logically dependent
  on the authority/provider story.

## Exit criteria

- The planning-track probe package is specific enough to launch a red-team session over
  recovery/records/bootstrap integration without inventing new design ownership or `docs/design/**`
  targets.
- The brief makes the composed contradiction surfaces explicit: Wave 2 recovery semantics, Wave 4a
  records claims, Wave 4a bootstrap re-entry claims, and the observability-records contract are all
  checked together rather than in isolation.
- The routed-finding posture is explicit: contradictions go back to the owning Wave 2, Wave 4a,
  product, or U9 surfaces rather than being silently resolved inside Wave 5.
- `reconciles_to` remains exact and bounded to the IDs this probe surface actually stresses; no
  ranges, no invented product IDs, and no hard-numbered new invariants.
- design-review verdict settled (zero open blocking suggestions).

## Evidence required

- The wave frame at [`../frame.md`](../frame.md).
- This authored story brief and the later planning-track probe outputs it drives.
- The cited Wave 2 and Wave 4a frames and story briefs listed above, especially `w2-s2`, `w4-s1`,
  and `w4-s4`.
- `docs/design/contracts/observability-records-contract-v0.md`, `docs/design/core/records.md`,
  `docs/design/core/bootstrap.md`, `docs/product/guarantees.md`, and `docs/product/concepts.md`.
- The design-review report and this wave's [`../decisions.md`](../decisions.md) dispositions.

## Design review & handoff

This session runs the technical-design method itself:

1. frame-technical-design -> a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode`, `ddd_depth`). This wave's build-time frame at [`../frame.md`](../frame.md)
   seeds it.
2. author-technical-design -> the planning-track red-team probe package for recovery/records/bootstrap
   integration. Because `design_targets` is intentionally empty, the authored output is the probe
   set, routed findings, contradiction matrix, and session evidence this story prescribes, not a
   `docs/design/**` artifact.
3. review-technical-design -> three lenses (architecture-enforceability: the probe set actually
   checks composed recovery/records/bootstrap seams and keeps findings routed rather than resolved
   locally. domain-correctness: the probe set stresses RESUME / GUARD / ISO / SEE / LIVE / SEC / INV
   surfaces named in `reconciles_to`, without inventing new states or schemas. agreement-integrity:
   nothing in the brief contradicts the approved Wave 5 frame, Wave 2 recovery ownership, Wave 4a
   records/bootstrap ownership, or the observability-records contract posture). Dispositions recorded
   into this wave's decisions.md; settled = zero open blocking suggestions.

Handoff: when settled, update status and hand the routed findings forward to the owning Wave 2 / Wave
4a / product surfaces or the future U9 collector as appropriate; preserve `INV-003`, `INV-006`, and
the read-only `INV-009`+ candidate posture exactly in the final probe outputs.
