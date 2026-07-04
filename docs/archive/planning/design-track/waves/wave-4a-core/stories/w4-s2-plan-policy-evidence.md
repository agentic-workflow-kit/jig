---
id: w4-s2-plan-policy-evidence
wave: wave-4a-core
status: designed
depends_on: []
design_targets: [docs/design/core/plan-intake.md] # deepen in place (D-001): parse/validate/reject, the policy model, the evidence/attestation category model, and the GUARD-2 rule-governing-surface declaration. The PlanValidator port line Wave 3's w3-s2 seeded here is PRESERVED and CITED. docs/design/contracts/execution-plan-contract-v0.md stays CITED and UNFROZEN, not edited. author-technical-design may relocate via DocStructurePlan
reconciles_to:
  [
    MERGE-1,
    MERGE-3,
    MERGE-4,
    GUARD-1,
    GUARD-2,
    CFG-1,
    CFG-2,
    CFG-10,
    EARN-1,
    EARN-2,
    INV-007,
  ]
---

# w4-s2-plan-policy-evidence — design plan intake, the policy model, and the evidence/attestation model

## Objective

Brief a future design session to author **plan intake, the policy model, and the evidence/
attestation model** — deepening `docs/design/core/plan-intake.md` **in place** (D-001) from the
`PlanValidator` port skeleton Wave 3 left it at into invariant-bearing tactical design. This session
moves from the overview-altitude interface the stub already draws — `PlanValidator`'s
`validate(instance) → ValidatedPlan \| Rejection(reason)`, seeded by Wave 3's `w3-s2` — to three
deepened concerns: (a) plan intake's parse/validate/reject mechanics and named rejection reasons;
(b) the **policy model** — gating posture, merge spectrum, concurrency ceiling, retry budget,
required reviews, escalation rules, and the CFG-10 fixed manual/assisted category boundary — whose
type/shape/invariants jig owns while the owner authors instance content (Wave 1's D-001); and (c) the
**evidence/attestation category model** — the three evidence categories from `guarantees.md` §1.5
(automated checks, review, capability proof), how policy judges sufficiency, and the freshness/
staleness discipline for capability proof (EARN-1/2).

This session also **owns the GUARD-2 rule** — one leg of a three-way cross-part seam it shares with
`w4-s3` (see below), stated **identically** in both stories.

Per **D-002** this session runs at `architecture_mode: tactical-ddd`, `ddd_depth: tactical-ddd`:
Policy is a value-object-like construct with real invariants (CFG-10's fixed, non-model-adjudicated
boundary; GUARD-1's immutability at launch), and the evidence/attestation model needs a
failure-token catalog (evidence insufficient, capability stale, capability missing) and a
consistency rule (evidence observed directly by the runner, never taken from the worker's
self-report — MERGE-1) — the ladder's "rich policies... consistency model" tactical trigger.

Per D-001 this session **deepens `plan-intake.md` in place**, preserving and citing its existing
Owns/Interface/Diagram as the seed (STOP-003: re-project and cite, never overwrite). The
`PlanValidator` port line Wave 3's `w3-s2` seeded here is **preserved and cited**.
`docs/design/contracts/execution-plan-contract-v0.md` is the plan-in seam **shape** intake validates
against; it stays **cited and unfrozen**, not edited — a needed field change routes back to the seam
owner (STOP-003), and this session mints no field names.

## Inputs to read

- [`../frames/w4-s2-plan-policy-evidence.md`](../frames/w4-s2-plan-policy-evidence.md) — this part's
  frame: the source map, `InputResolution`, `AgreedSystemModel` (`architecture_mode` `tactical-ddd`,
  `ddd_depth` `tactical-ddd`), the entity model (plan intake / policy / evidence-attestation model /
  the GUARD-2 seam), the invariant candidates (§7), and the GUARD-2 seam wording.
- [`../decisions.md`](../decisions.md) — the frame-gate dispositions this story is authored under
  (D-001 deepen in place; D-002 `tactical-ddd`/`tactical-ddd`; D-003 the GUARD-2 three-way seam,
  worded identically in s2/s3, residual sub-state OPEN; D-004 the s2 evidence/attestation model as
  Wave 4b's frame-time contract for `w4-s6-execution-host` / EARN-2; D-005 `INV-009`+ candidates
  un-numbered).
- [`../../wave-1-domain/frame.md`](../../wave-1-domain/frame.md),
  [`../../wave-1-domain/decisions.md`](../../wave-1-domain/decisions.md), and Wave 1's settled story
  briefs — Policy/Work-profile/Repo-floors as jig-owned domain objects, owner-authored instances
  (Wave 1's D-001); the Execution plan's authored facts (declared done/evidence, declared authority
  expectations) this policy/evidence model consumes.
- [`../../wave-2-state-machines/frame.md`](../../wave-2-state-machines/frame.md) and Wave 2's settled
  story briefs — evidence-met as the candidate guard on the work-item `started → done` transition
  (MERGE-1/MERGE-3); GUARD-1/INV-003 launch-binding immutability; the `done` guard the GUARD-2 seam
  gates. This session supplies the evidence/policy vocabulary those guards consume, not the
  transition table.
- [`../../wave-3-ports/frame.md`](../../wave-3-ports/frame.md) and Wave 3's `w3-s2` — the
  `PlanValidator` port shape and the validate-once-at-the-boundary discipline (INV-007) this session
  deepens the model beneath, preserving and citing the port line as the seed.
- `docs/design/core/plan-intake.md` — the existing stub this session deepens in place: parse/validate/
  reject-with-reason, the `PlanValidator` Interface, the diagram, and the validate-once discipline.
- `docs/design/core/authorization.md` — **cited, not edited** (that is `w4-s3`'s target): the Fence's
  `authorize(request, boundPolicy) → grant \| deny \| route` that judges requests against the policy
  content this session authors; this session supplies policy's content, `w4-s3` the classifier.
- `docs/design/contracts/execution-plan-contract-v0.md` — the plan-in seam shape (done/evidence
  categories, authority/approval needs including rule-governing-file re-approval, policy/work-profile
  reference discipline) this model reconciles to; cited and **unfrozen**, not edited (no minting
  field names).
- `docs/product/guarantees.md` — MERGE-1..5 (evidence gates landing; three evidence categories;
  done≠landed; owner decides sufficiency), GUARD-1/2 (policy fixed at launch; **GUARD-2**
  rule-governing change forces a completion pause for re-approval and fresh evidence), CFG-1..10
  (policy is the governance contract; work profile never lowers the floor; CFG-10's fixed category
  boundary), EARN-1/2 (fresh, positive, driver-and-run-specific capability proof) this model
  reconciles to.
- `docs/design/notes/runtime-design-m5a.md` — INV-007 (reject unknown formats; validate once at the
  boundary) and the VAL/DEL families this session continues — kept a namespace distinct from `INV-*`
  and product IDs.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc at the design_target: the deepened plan/policy/evidence model in
   `docs/design/core/plan-intake.md` — plan intake's parse/validate/reject mechanics, the policy
   model's content/shape, the evidence/attestation category model, and the GUARD-2
   rule-governing-surface declaration — preserving and citing the `PlanValidator` port line and
   existing diagram as the seed.
2. Open questions, logged (never invented answers) — including the GUARD-2 residual sub-state
   question (a distinct "re-approval pending" sub-state vs. reuse of Wave 2's `parked`), left OPEN.
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting. This session
   names its **invariant candidates** (evidence-observed-not-self-reported — the runner observes
   evidence directly, MERGE-1, as a structural invariant; rule-governing-surface-forces-pause —
   GUARD-2 as an enforceable rule, not merely a guideline), continuing the INV-007 validate-once
   discipline. It does **not** hard-number them: candidates for `INV-009`+, flagged for cross-wave
   reconciliation with Wave 2's `w2-s3` and Wave 3's candidates (settled at U9).
4. Risks and deferred decisions.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- For **plan intake**: what are the parse/validate/reject mechanics and named rejection reasons that
  deepen the `PlanValidator` port's `validate → ValidatedPlan \| Rejection(reason)`, preserving the
  validate-once-at-the-boundary discipline (INV-007) — nothing downstream re-validates plan shape?
- For the **policy model**: what is its content and shape (gating posture, merge spectrum,
  concurrency ceiling, retry budget, required reviews, escalation rules, the CFG-10 fixed
  manual/assisted category boundary) — jig owning type/shape/invariants while the owner authors
  instances (Wave 1's D-001), and immutable at launch (GUARD-1)?
- For the **evidence/attestation category model**: what are the three categories (automated checks,
  review, capability proof, `guarantees.md` §1.5), how does policy judge sufficiency per category
  (MERGE-3, owner decides), how is evidence observed directly by the runner and never taken from the
  worker's self-report (MERGE-1), and what is the freshness/staleness discipline for capability proof
  (EARN-1/2)?
- **GUARD-2 (three-way seam, worded identically in `w4-s2` and `w4-s3`):** how does the seam give
  GUARD-2 an owner rather than orphan — **(1) `w4-s2` (this story) owns the rule**: what counts as a
  rule-governing surface (policy, verification, integration-safety, credential files, declared
  per-story in the plan's authority expectations per `execution-plan-contract-v0.md`), and the
  policy-level requirement that touching one forces fresh evidence before `done` is judged; **(2)
  `w4-s3` co-owns the enforcement mechanism**: the Fence detects a request touching a declared
  rule-governing surface and refuses to auto-grant it (CFG-10 already routes rule-governing files),
  and the Doorbell captures the owner's re-approval durably (DOOR-2 survive-interruption); **(3)
  Wave 2's work-item-lifecycle supplies the pause point**: the `done` guard checks "no unresolved
  GUARD-2 pause" before evidence is judged sufficient — gating an already-candidate-named transition,
  not a new state? The residual sub-question — a distinct "re-approval pending" sub-state vs. reuse
  of Wave 2's `parked` — stays **OPEN** for this session (or a Wave 2 re-projection), not resolved
  here.
- How is the **evidence/attestation model** designed with Wave 4b's `w4-s6-execution-host` as a
  frame-time consumer: the execution-host's EARN-2 capability attestation (freshness/staleness) must
  be framable against this model? Name this downstream dependency so it does not orphan at Wave 4b
  framing.

## Invariants to preserve

- `INV-007` (reject unknown formats; validate once at the boundary; nothing downstream re-validates
  plan shape) from `runtime-design-m5a.md` — the plan-intake discipline the deepened model carries.
- `MERGE-1`, `MERGE-3`, `MERGE-4` — evidence gates landing (never the worker's self-report alone);
  the owner decides what evidence is required; done and landed are separate milestones. The
  evidence/attestation model realizes these.
- `GUARD-1`, `GUARD-2` — policy is fixed at launch; a rule-governing change forces a completion pause
  for owner re-approval and fresh evidence. This session owns the GUARD-2 **rule** leg of the
  three-way seam.
- `CFG-1`, `CFG-2`, `CFG-10` — policy is the governance contract; the work profile never lowers the
  safety floor; the CFG-10 category boundary is fixed and never model-adjudicated.
- `EARN-1`, `EARN-2` — autonomy requires fresh, positive, driver-and-run-specific capability proof;
  missing/stale/failed proof means less autonomy, not a weaker guarantee.
- No new `INV-*` numbers are hard-numbered by this story; it **names invariant candidates**
  (evidence-observed-not-self-reported; rule-governing-surface-forces-pause) for `INV-009`+, flagged
  for cross-wave coordination with Wave 2's and Wave 3's candidates. If it must number one locally,
  it continues from `INV-009` (never resets) and records why in decisions.md.

## Must not decide

- The **Records engine** — the append-only log, projections, redaction mechanics — that is `w4-s1`
  (parallel root). This session names the evidence/GUARD-2 vocabulary whose events feed the log, but
  does not author the engine or its redaction-classification mechanics.
- The **authority spine's runtime mechanics** — the Fence classifier's internal decision rule, the
  Doorbell's escalation mechanics, the capability-attestation gate's judging — that is `w4-s3`
  (parallel root). This session supplies policy's **content** and the evidence categories the
  classifier judges against; it co-owns only the GUARD-2 **rule** leg, not the enforcement leg.
- **Bootstrap's binding** of policy at launch — that is `w4-s4`. This session authors policy's
  content and shape; `w4-s4` binds and wires it.
- Anything Wave 1 settled: Policy/Work-profile/Repo-floors as jig-owned domain objects (Wave 1's
  D-001), the plan-intake placement (Wave 1's D-002, runtime-side). This session deepens the
  policy/evidence content, not the ownership.
- Anything Wave 2 settled: the work-item and run **state machines**. The GUARD-2 seam **gates** the
  already-candidate-named `done` transition; it does not author a new state. The residual "re-approval
  pending" sub-state question is left **OPEN**, and any actual `done`-guard change is a future Wave 2
  re-projection, flagged for U9.
- Anything Wave 3 settled: the `PlanValidator` port **shape**. This session deepens the model
  **behind** the port, preserving and citing the port line as the seed.
- **Freezing** the execution-plan v0 contract — it stays **cited and unfrozen**; this session names
  the properties the model reconciles to without minting field names; a needed change routes back to
  the seam owner (STOP-003).
- The **GUARD-2 residual sub-state** — whether the completion pause needs a distinct "re-approval
  pending" sub-state or reuses Wave 2's `parked`; left OPEN as an author-time question.
- **Numbering** the consolidated invariant ledger — this session names candidates; numbering from
  `INV-009` is coordinated with Wave 2's and Wave 3's candidates at consolidation (U9).
- Field-level schema, TypeScript, JSON Schema, method signatures, or any frozen contract — deferred
  per `docs/design/README.md`.

## Exit criteria

- The deepened plan/policy/evidence model exists at `docs/design/core/plan-intake.md`, stating plan
  intake's parse/validate/reject mechanics, the policy model's content/shape, and the
  evidence/attestation category model — with observed-not-self-reported (MERGE-1) and capability-proof
  freshness/staleness (EARN-1/2) as load-bearing, not afterthoughts.
- The existing Owns/Interface/Diagram — including the `PlanValidator` port line Wave 3's `w3-s2`
  seeded — are **preserved and cited** as the seed, re-projected and extended rather than
  overwritten; any divergence is named explicitly (STOP-003).
- The **GUARD-2 three-way seam** is stated **identically** to `w4-s3`'s authored doc: `w4-s2` owns
  the rule, `w4-s3` co-owns enforcement, Wave 2's work-item-lifecycle supplies the pause point; the
  residual sub-state question is recorded as an open question, not resolved.
- The **evidence/attestation model** is designed with Wave 4b's `w4-s6-execution-host` (EARN-2)
  named as a frame-time consumer.
- The execution-plan v0 contract is **cited and unfrozen**, not edited; `authorization.md` is cited,
  not edited; no field names are minted.
- The invariant candidates (evidence-observed-not-self-reported; rule-governing-surface-forces-pause)
  are named for `INV-009`+ and flagged for cross-wave coordination; the three ID namespaces are kept
  distinct.
- design-review verdict settled (zero open blocking suggestions), applied at the full method below.

## Evidence required

- This part's frame ([`../frames/w4-s2-plan-policy-evidence.md`](../frames/w4-s2-plan-policy-evidence.md))
  — the frame that seeds this story's frame step.
- The authored design_target (`docs/design/core/plan-intake.md`).
- The design-review report.
- The decisions.md entries (this wave's [`../decisions.md`](../decisions.md)).

## Design review & handoff

This session runs the technical-design method itself, at **full weight** — this story authors real
jig core internals (plan intake, the policy model, the evidence/attestation model), the domain rules
a worker's evidence claim and a provider's request are judged against, so the full frame → author →
design-review pass applies, not the light method Wave 0 used for its scaffold-only stories.

1. frame-technical-design → a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode` `tactical-ddd`, `ddd_depth` `tactical-ddd` per D-002). This part's build-time
   frame at [`../frames/w4-s2-plan-policy-evidence.md`](../frames/w4-s2-plan-policy-evidence.md)
   seeds it; the session confirms and extends the `AgreedSystemModel`.
2. author-technical-design → the deepened plan/policy/evidence model at `docs/design/core/plan-intake.md`,
   preserving and citing the existing Owns/Interface/Diagram (and the `PlanValidator` port line) as
   the seed; the execution-plan v0 contract cited and unfrozen; the GUARD-2 seam worded identically
   to `w4-s3`.
3. review-technical-design → three lenses (architecture-enforceability: plan intake validates once at
   the boundary; policy is immutable at launch with a fixed non-model-adjudicated category boundary;
   evidence is observed-not-self-reported; the GUARD-2 rule forces a pause; the v0 contract stays
   unfrozen. domain-correctness: the model reconciles to MERGE / GUARD / CFG / EARN / INV-007 without
   minting field names; agreement-integrity: nothing contradicts the part frame's `AgreedSystemModel`,
   Wave 1's D-001, Wave 2's evidence-met guard point, Wave 3's `PlanValidator` port shape, or — the
   load-bearing check — the GUARD-2 seam wording in `w4-s3`). Dispositions recorded into this wave's
   [`../decisions.md`](../decisions.md); settled = zero open blocking suggestions.

Handoff: when settled, update status and note the resolved design_target in the track's future
traceability matrix; hand the named invariant candidates forward for `INV-009`+ consolidation; confirm
the evidence/attestation model is ready as Wave 4b's frame-time contract for `w4-s6-execution-host`
(EARN-2); flag the GUARD-2 residual sub-state question and the Wave 2 `done`-guard threading for U9.

## Coordinator resolution (design_targets)

Per D-001 (deepen in place, no rename), this story deepens `docs/design/core/plan-intake.md`
directly — preserving and citing its existing Owns/Interface/Diagram (including the `PlanValidator`
port line Wave 3's `w3-s2` seeded) as the seed and extending it into the deepened plan/policy/evidence
model — rather than authoring a new sibling doc. This is the STOP-003-compliant "re-project and cite."
`docs/design/contracts/execution-plan-contract-v0.md` stays **cited and unfrozen**, not edited;
`docs/design/core/authorization.md` is **cited, not edited** (`w4-s3` deepens it). The future
`author-technical-design` session may relocate the target via its `DocStructurePlan`; this brief
records the resolved target, not a frozen path.
