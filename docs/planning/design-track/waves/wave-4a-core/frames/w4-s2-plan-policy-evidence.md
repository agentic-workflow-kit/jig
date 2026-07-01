---
title: "Wave 4a frame — w4-s2: plan intake, policy, and the evidence/attestation model"
status: draft — frame (intake)
methodology: ddd
---

# Problem Frame — Wave 4a, s2: Plan / policy / evidence

> Intake artifact for the DDD-first deep-design track's Wave 4a, part 2 of 4. It frames **plan
> intake + policy + the evidence/attestation model** — the second of four CORE parts this wave
> deepens. Produced by applying the `technical-design` pack's `frame-technical-design` skill; the
> next stage is `author-technical-design`, gated on this frame's approval status. Authored
> alongside three sibling frames (`w4-s1-records-observability.md`, `w4-s3-authority-spine.md`,
> `w4-s4-bootstrap-composition-root.md`) in one pass for mutual coherence.
>
> This frame consumes [Wave 1's domain frame](../../wave-1-domain/frame.md) (Policy/Work-
> profile/Repo-floors as jig-owned domain objects, owner-authored instances — Wave 1's D-001; the
> Execution plan and Work item's authored facts), [Wave 2's frame](../../wave-2-state-machines/frame.md)
> (the work-item guard candidates evidence gates, and GUARD-1/INV-003 launch-binding immutability),
> and [Wave 3's frame](../../wave-3-ports/frame.md) (the `PlanValidator` port — candidate-named at
> `core/plan-intake.md` — and the anti-corruption stance that plan validation happens once, at the
> boundary). Wave 4a is the first wave to author tactical detail inside this port: the policy
> classifier's real rule shape, the evidence/attestation model's actual categories and gates.

## 1. Scope and Goal

- **Source request:** deep-design track, Wave 4a, story 2 — deepen `docs/design/core/plan-
intake.md` in place: plan intake's parse/validate/reject mechanics beyond the port skeleton
  Wave 3 already candidate-named, the policy model (gating posture, merge spectrum, concurrency
  ceiling, retry budget, required reviews, escalation rules, the CFG-10 manual/assisted dial), and
  the evidence/attestation model (the three evidence categories from `guarantees.md` §1.5 —
  automated checks, review, capability proof — and how policy judges sufficiency).
- **Goal:** produce an `AgreedSystemModel` for plan/policy/evidence clean and citable enough to
  seed this wave's charter and story brief, coherent with the three sibling parts, and readable by
  Wave 4b without rework — `w4-s2`'s evidence/attestation model is also Wave 4b's frame-time
  contract for execution-host attestation (EARN-2).
- **Out of scope for this part:** the `PlanValidator` port's method signature or a frozen contract
  (Wave 3 already candidate-named the port); the execution-plan contract v0 itself (cited,
  unfrozen, not edited); the work-item/run state machines (Wave 2, closed); the Fence/Doorbell
  authority model that _judges_ worker requests against bound policy (`w4-s3` — this part owns
  policy's _content and shape_, `w4-s3` owns the runtime authorization mechanics that enforce it,
  stated identically in both frames per the GUARD-2 seam below); the Records engine (`w4-s1`);
  bootstrap's binding of policy at launch (`w4-s4`, cited); field-level schema, TypeScript, or
  JSON Schema; package/module layout.

## 2. Source Map

| Source                                                                                                              | Authority                                                              | Establishes                                                                                                                                                                                                                                                                                                                                                                                                                              | Gaps / stale risk                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/design/core/plan-intake.md`](../../../../design/core/plan-intake.md)                                         | authoritative — design stub (this part's target)                       | `status: draft — stub`; owns parse/validate/reject-with-reason; the `PlanValidator` port already candidate-named by Wave 3; "validation happens once, at the boundary; nothing downstream re-validates plan shape"                                                                                                                                                                                                                       | Stub altitude only — no policy classifier detail, no evidence/attestation model; this part deepens in place, preserving and citing the existing Owns/Interface/Diagram |
| [`docs/design/contracts/execution-plan-contract-v0.md`](../../../../design/contracts/execution-plan-contract-v0.md) | authoritative — in-seam contract v0 (cited, unfrozen)                  | Required plan properties this policy/evidence model must satisfy: done/evidence requirements as categories (automated-check, review, capability-proof, evidence artifacts, merge blockers); authority/approval needs (expected reversible/irreversible actions, rule-governing-file re-approval); policy/work-profile references by identity, no embedded override                                                                       | v0 shape, not frozen — a shape gap routes back to the contract owner, never a silent edit here                                                                         |
| [`docs/product/guarantees.md`](../../../../product/guarantees.md)                                                   | authoritative — ID spec                                                | MERGE-1..5 (evidence gates landing; three evidence categories; done≠landed; blocked-as-PR); GUARD-1/2 (policy fixed at launch; **GUARD-2**: rule-governing change forces a completion pause for re-approval and fresh evidence); CFG-1..10 (policy is the governance contract; work profile never lowers the floor; CFG-10's fixed category boundary); EARN-1/2 (capability attestation: fresh, positive, driver-and-run-specific proof) | Outcome-level commitments this part's policy/evidence model reconciles to, not restates                                                                                |
| [`../../wave-1-domain/frame.md`](../../wave-1-domain/frame.md) + [`decisions.md`](../../wave-1-domain/decisions.md) | authoritative — prior-wave frame (seed)                                | Policy/Work-profile/Repo-floors as jig-owned domain objects — jig owns type/shape/invariants, the owner authors instances (Wave 1's D-001); Execution plan's authored facts (identity, dependency graph, declared done/evidence, declared authority expectations)                                                                                                                                                                        | This part deepens the policy/evidence _content and shape_ Wave 1 settled as jig-owned; it does not reopen who authors instance content                                 |
| [`../../wave-2-state-machines/frame.md`](../../wave-2-state-machines/frame.md)                                      | authoritative — prior-wave frame (seed)                                | Evidence-met gates the work-item `started → done` candidate transition (MERGE-1/MERGE-3); GUARD-1/INV-003 launch-binding immutability as a candidate invariant for resume                                                                                                                                                                                                                                                                | This part supplies the evidence/policy vocabulary those candidate guards consume; it does not redesign the transition table itself                                     |
| [`../../wave-3-ports/frame.md`](../../wave-3-ports/frame.md) + [`decisions.md`](../../wave-3-ports/decisions.md)    | authoritative — prior-wave frame (seed) and decision log               | The `PlanValidator` port candidate-named at `core/plan-intake.md`; Wave 3's D-001 confirms in-place deepening for exactly this file                                                                                                                                                                                                                                                                                                      | This part deepens the same file behind the port Wave 3 already candidate-named                                                                                         |
| [`docs/design/core/authorization.md`](../../../../design/core/authorization.md)                                     | authoritative — design stub (cited, `w4-s3`'s target, not this part's) | The Fence's `authorize(request, boundPolicy) → grant \| deny \| route`; "policy fixed at launch" (GUARD-1) as an invariant the classifier respects                                                                                                                                                                                                                                                                                       | Cited only — this part supplies policy's _content_, `w4-s3` supplies the classifier that judges requests against it                                                    |
| [`docs/design/core/README.md`](../../../../design/core/README.md)                                                   | authoritative — design spine                                           | Group A "Policy" row (the safety/governance contract, fixed at launch); Group B "Capability attestation" row (earned-trust gate, EARN-1/2, STACK-4, DRIVE-1/3)                                                                                                                                                                                                                                                                           | Overview altitude only; this part deepens the policy/evidence content beneath both rows                                                                                |
| [`AGENTS.md`](../../../../../AGENTS.md) (jig repo root)                                                             | authoritative — repo contract                                          | Jig owns the execution-plan contract as a versioned seam; house conventions                                                                                                                                                                                                                                                                                                                                                              | None material                                                                                                                                                          |

## 3. InputResolution

| Required input                                                                                                                                             | Source evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Owner / impact                                                                                                                                       | Approval status |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **Placement:** deepen `core/plan-intake.md` in place, or relocate?                                                                                         | Coordinator's brief assigns `design_target: docs/design/core/plan-intake.md (deepen)`; Wave 2's D-001 and Wave 3's D-001 precedent                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | **provided** (not a fork) — deepen in place, preserving and citing the existing stub as seed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `docs/design/core/plan-intake.md` design_target                                                                                                      | approved        |
| **GUARD-2 seam ownership:** who owns detecting a rule-governing change and enforcing the completion pause it triggers?                                     | The coordinator's MANDATE names GUARD-2 as a cross-part seam spanning `w4-s2` (plan/policy/evidence) + `w4-s3` (authority-spine) + Wave 2's work-item-lifecycle, requiring a named owner this wave. `guarantees.md` GUARD-2: "If the work changes parts of the project that govern policy, verification, or integration safety, completion pauses for explicit owner re-approval and fresh evidence." The execution-plan contract already names "changes to policy, verification, integration safety, credentials, or other rule-governing files that require explicit owner re-approval" as a plan-declared authority-expectation property (`execution-plan-contract-v0.md`, "Authority and Approval Needs"). | **requires approval, recommended** — split the seam three ways, named identically here and in `w4-s3`: **(1) `w4-s2` (this part) owns the rule** — what counts as a "rule-governing surface" (policy, verification, integration-safety, credential files), declared per-story in the plan's authority expectations, and the policy-level requirement that touching one forces fresh evidence before done is judged. **(2) `w4-s3` (authority spine) co-owns the enforcement mechanism** — the Fence/Doorbell classifier detects a request touching a declared rule-governing surface and routes it (never auto-grants), and the Doorbell escalation is where the owner's re-approval is actually captured. **(3) Wave 2's work-item-lifecycle supplies the pause point** — the `done`/`started→done` transition's guard must check "no unresolved GUARD-2 pause" before evidence is judged sufficient, meaning GUARD-2 gates the transition Wave 2 already candidate-named, not a new state. This is a recommendation, not an invented mechanism: each piece is drawn from an existing source (the plan's declared rule-governing surfaces; the Fence's route-to-doorbell path; Wave 2's evidence-met guard on `done`). The residual open question — whether GUARD-2 needs a distinct "re-approval pending" sub-state or reuses `parked` — is surfaced, not resolved, below. | `w4-s2`'s policy/evidence model; `w4-s3`'s Fence/Doorbell escalation; Wave 2's work-item `done` guard (a future re-projection, not this wave's edit) | pending         |
| **Evidence/attestation model as Wave 4b's frame-time contract:** must this part explicitly name `w4-s6-execution-host`'s dependency on EARN-2 attestation? | Coordinator's MANDATE: "the evidence/attestation model you frame here is also Wave 4b's frame-time contract (execution-host attestation, EARN-2). Design with that consumer in view."                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | **provided** (a mandate, not a fork) — named in AgreedSystemModel/Relations and open questions below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Wave 4b's future `w4-s6-execution-host` frame                                                                                                        | approved        |
| **Depth escalation:** does this part warrant `tactical-ddd`?                                                                                               | The policy model (gating posture, merge spectrum, concurrency ceiling, retry budget, escalation rules, the CFG-10 fixed category boundary) and the evidence/attestation model (three evidence categories, sufficiency judged per-category under policy, capability proof with freshness/staleness rules) are both **rich domain policies with real invariants** — the ladder's tactical trigger names "rich policies" explicitly. GUARD-2's rule-governing-change detection is itself a domain invariant with a concrete failure mode (a run "quietly changing its own rules").                                                                                                                                | **requires approval, recommended** — select `architecture_mode: tactical-ddd`, `ddd_depth: tactical-ddd`. This is the strongest tactical candidate among the four parts: Policy is a value-object-like construct with real invariants (CFG-10's fixed, non-negotiable category boundary; GUARD-1's immutability at launch); the evidence/attestation model needs a failure-token catalog (evidence insufficient, capability stale, capability missing) and a consistency rule (evidence observed by the runner directly, never taken from the worker's self-report — MERGE-1). Not `ports-and-adapters`: this part is not isolating a boundary from infrastructure: it is authoring the domain rules a provider's request is judged against.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | This part's `architecture_mode`/`ddd_depth` frontmatter                                                                                              | pending         |

### Blocking Questions

None. Both `requires approval` items are resolvable by the coordinator choosing among named,
sourced alternatives.

### Safe Assumptions

- Placement (deepen `core/plan-intake.md` in place) is settled by the coordinator's brief and
  prior-wave precedent; not reopened here.
- The residual GUARD-2 sub-question (distinct "re-approval pending" sub-state vs. reuse of
  `parked`) is left as an open question for the future authoring session or Wave 2 re-projection,
  not resolved by this frame.

## 4. AgreedSystemModel

### Source Inputs Used

| Source                                                | Establishes                                                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `docs/design/core/plan-intake.md`                     | The existing stub this part deepens: parse/validate/reject, `PlanValidator` port shape (Wave 3)                            |
| `docs/design/contracts/execution-plan-contract-v0.md` | Done/evidence-requirement categories, authority/approval needs, policy/work-profile reference discipline (cited, unfrozen) |
| `docs/product/guarantees.md`                          | MERGE-1..5, GUARD-1/2, CFG-1..10, EARN-1/2                                                                                 |
| `../../wave-1-domain/frame.md`, `decisions.md`        | Policy/Work-profile/Repo-floors as jig-owned domain objects (Wave 1's D-001)                                               |
| `../../wave-2-state-machines/frame.md`                | Evidence-met as a candidate guard on the work-item `done` transition; GUARD-1/INV-003 launch-binding immutability          |
| `../../wave-3-ports/frame.md`, `decisions.md`         | The `PlanValidator` port candidate shape; in-place deepening precedent (D-001)                                             |
| `docs/design/core/authorization.md`                   | The Fence's classifier (cited; `w4-s3`'s target, not this part's)                                                          |

### Unresolved Required Inputs

- GUARD-2 seam ownership split, and its residual sub-state question (requires approval,
  recommended — see §3).
- Depth escalation to `tactical-ddd` (requires approval, recommended — see §3).

### High-Level System Entities

| Entity                                                    | Responsibilities                                                                                                                                                                                                                                           | Owns                                                                                                                                                                                                                                                                                                              | Reads                                                                                                                                    | Does Not Own                                                                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Plan intake (deepened)**                                | Parses and validates a plan instance against the execution-plan contract; rejects unknown/incompatible formats with a reason; produces a `ValidatedPlan`.                                                                                                  | The parse/validate/reject mechanics and named rejection reasons; the once-at-the-boundary discipline.                                                                                                                                                                                                             | The submitted plan instance; the execution-plan contract shape (cited, unfrozen).                                                        | Policy's content (below); the Fence's runtime judging of requests (`w4-s3`).                                                                     |
| **Policy**                                                | The governance contract: gating posture, merge spectrum, concurrency ceiling, retry budget, required reviews, approvals, escalation rules, the CFG-10 fixed category boundary, and the set of rule-governing surfaces whose modification triggers GUARD-2. | Its own content and shape (Wave 1's D-001: jig owns type/shape/invariants); the GUARD-2 rule-governing-surface declaration and the requirement that touching one forces fresh evidence before done.                                                                                                               | Repo-level floors it must not weaken (Wave 1); the plan's declared authority expectations (which surfaces a story is expected to touch). | Enforcement of its own rules at runtime (the Fence/Doorbell, `w4-s3`, co-owns GUARD-2's enforcement mechanism); work profile's concerns (CFG-2). |
| **Evidence/attestation model**                            | The three evidence categories (automated checks, review, capability proof) and the sufficiency rule per category under policy; capability proof's freshness/staleness discipline (EARN-1/2).                                                               | The category taxonomy; the "observed directly by the runner, never the worker's self-report" invariant (MERGE-1); the freshness/staleness rule for capability proof.                                                                                                                                              | Policy (which categories/how much of each a story needs, MERGE-3); the Records engine's evidence-observed events (`w4-s1`, cited).       | Persisting evidence observations (Records, `w4-s1`); judging worker requests at runtime (`w4-s3`).                                               |
| **GUARD-2 seam** (co-owned, named identically in `w4-s3`) | Detecting a request or change that touches a declared rule-governing surface, and forcing a completion pause requiring fresh owner re-approval and evidence before the work-item's `done` transition can be judged satisfied.                              | (`w4-s2`) the rule — what counts as rule-governing, and the policy-level "pause completion" requirement. (`w4-s3`) the enforcement — the Fence's detection and the Doorbell's re-approval capture. (Wave 2's work-item-lifecycle, cited) the pause point — the `done` guard checks "no unresolved GUARD-2 pause." | Split three ways per the InputResolution recommendation above.                                                                           | A single part inventing the full mechanism alone — this is a genuinely shared seam.                                                              |

### Relations

| From                                   | Relation                       | To                                                                | Notes                                                                                                                                      |
| -------------------------------------- | ------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Plan intake                            | produces                       | `ValidatedPlan`                                                   | Consumed by bootstrap/orchestration (Wave 2, `w4-s4`, cited)                                                                               |
| Policy                                 | governs                        | Evidence/attestation model's sufficiency rule                     | MERGE-3: the owner decides what evidence is required before work may land                                                                  |
| Policy                                 | declares                       | GUARD-2 rule-governing surfaces                                   | Per-story, via the plan's authority expectations (cited from `execution-plan-contract-v0.md`)                                              |
| GUARD-2 seam (`w4-s2` rule)            | is enforced by                 | Fence/Doorbell (`w4-s3`)                                          | Named identically in both frames — see GUARD-2 seam wording above                                                                          |
| GUARD-2 seam                           | gates                          | Work-item `done` transition (Wave 2, cited)                       | A pause point on an already-candidate-named transition, not a new state (residual open question: distinct sub-state vs. reuse of `parked`) |
| Evidence/attestation model (this part) | is the frame-time contract for | Wave 4b's `w4-s6-execution-host` (EARN-2, capability attestation) | Named per the coordinator's mandate                                                                                                        |
| Records engine (`w4-s1`, cited)        | persists                       | Evidence observations, GUARD-2 pause/re-approval events           | This part supplies the vocabulary; `w4-s1` supplies the durable log                                                                        |

### Seams and External Boundaries

- **The `PlanValidator` port** (Wave 3, candidate-named, cited) — this part deepens the engine
  behind the port.
- **The execution-plan contract v0** (cited, unfrozen) — the seam this part's policy/evidence
  vocabulary must satisfy; a shape gap routes back to the contract owner.
- **The GUARD-2 seam (s2 + s3 + Wave 2 work-item-lifecycle)** — named identically here and in
  `w4-s3`: `w4-s2` owns the rule-governing-surface declaration and the pause requirement; `w4-s3`
  owns the Fence/Doorbell detection and re-approval capture; Wave 2's work-item `done` guard is the
  pause point, cited not redesigned this wave.
- **The Wave 4b frame-time contract (s2 → w4-s6)** — the evidence/attestation model (specifically
  EARN-2 capability-proof freshness/staleness) is a named downstream dependency for Wave 4b's
  future `w4-s6-execution-host` frame.
- **The Records boundary (s2 ← s1)** — this part supplies evidence/GUARD-2 vocabulary; `w4-s1`
  supplies the durable log those events are written into.

### Lifecycle and State Terms

This part introduces no new lifecycle states on its own. Its GUARD-2 seam interacts with Wave 2's
already-candidate-named work-item `done` transition as a **guard**, not a new state — whether that
guard's "paused for re-approval" condition needs its own sub-state or reuses the existing `parked`
state is an open question (see §3), left for the future authoring session or a Wave 2
re-projection to resolve, not invented here.

### Mode and Depth

- **architecture_mode:** `tactical-ddd` (recommended, requires approval — see §3)
- **initial ddd_depth:** `tactical-ddd` (recommended, requires approval — see §3)

### Open Questions and Approval

- GUARD-2 seam ownership split across `w4-s2`/`w4-s3`/Wave 2 (requires approval, recommended —
  see §3); residual sub-question of a distinct pause sub-state vs. reusing `parked`, surfaced not
  resolved.
- Depth escalation to `tactical-ddd` (requires approval, recommended — see §3).
- Downstream dependency: Wave 4b's `w4-s6-execution-host` frame needs this part's evidence/
  attestation model (EARN-2) settled.
- **Approval status: pending (coordinator).**

## 5. Assumptions and Blockers

(Restated from §3 for template completeness.)

### Safe Assumptions

- Placement (deepen `core/plan-intake.md` in place) is settled, not reopened.
- The GUARD-2 sub-state question is left open for future authoring/re-projection.

### Blocking Questions

None.

## 6. DDD Context Candidates

| Candidate context                        | Owns                                                                                                                                 | Reads                                                                          | Does Not Own                                                                                                             | Open ownership question                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **Plan / policy / evidence** (this part) | Plan intake mechanics; policy content/shape; the evidence/attestation category model; the GUARD-2 rule-governing-surface declaration | The execution-plan contract (cited); Wave 2's evidence-met guard point (cited) | Runtime enforcement of policy (`w4-s3`); the Records engine (`w4-s1`); bootstrap's binding of policy at launch (`w4-s4`) | GUARD-2 enforcement-mechanism split with `w4-s3`; depth escalation |

## 7. Complexity Drivers

- **Invariants:** MERGE-1/3/4 (evidence gates landing; done≠landed; owner decides sufficiency);
  GUARD-1/2 (policy fixed at launch; rule-governing change forces a pause); CFG-1/2/10 (policy vs.
  work-profile split; the fixed, non-model-adjudicated category boundary); EARN-1/2 (fresh,
  positive, driver-and-run-specific capability proof). New candidates for `INV-009`+: evidence-
  observed-not-self-reported (the runner observes evidence directly, MERGE-1, as a structural
  invariant); rule-governing-surface-forces-pause (GUARD-2 as an enforceable rule, not merely a
  guideline).
- **State transitions:** none new authored directly; GUARD-2 gates Wave 2's already-candidate-
  named `done` transition (see residual open question).
- **Integrations / anti-corruption:** the `PlanValidator` port boundary (Wave 3, cited); the
  GUARD-2 seam split with `w4-s3` and Wave 2.
- **Consistency / idempotency / replay / audit:** evidence must be observed once and durably
  recorded (cited to `w4-s1`); GUARD-2's re-approval must be captured durably across interruption
  (DOOR-2, cited to `w4-s3`).
- **Security / authorization:** CFG-10's fixed category boundary (never LLM-adjudicated); GUARD-2
  as an anti-gaming mechanism specifically.
- **Migration / deploy:** none — docs-only frame.
- **Observability:** evidence-observed and GUARD-2 pause/re-approval events feed the Records
  engine (`w4-s1`, cited); this part must not mint new event-family names beyond the v0 contract's
  list.
- **Testing:** none at this altitude; future story brief's `tactical-ddd` depth carries forward a
  failure-token catalog (evidence insufficient, capability stale/missing, rule-governing-surface
  touched without re-approval).

## 8. Architecture Mode and Initial DDD Depth

**Selected architecture_mode:** `tactical-ddd` (recommended)

**Why this mode fits:** this part authors real domain policy — Policy's fixed category boundary
(CFG-10), the evidence/attestation model's sufficiency and freshness rules, and GUARD-2's rule-
governing-surface detection — the ladder's `tactical-ddd` trigger ("rich policies... consistency
model") describes this part's deliverable precisely. This is not a port-isolation concern (Wave
3's altitude); it is the domain content a provider's request or a worker's evidence claim is
judged against.

**Selected depth:** `tactical-ddd` (recommended)

**Why this depth fits:** the ladder's required elements — "value objects where primitives are
unsafe... failure-token catalogs, consistency model" — map onto Policy (a value-object-like,
immutable-at-launch construct with a fixed category boundary) and the evidence/attestation model
(a failure-token catalog: insufficient, stale, missing; a consistency rule: observed-not-self-
reported). GUARD-2 is itself a cross-cutting invariant this depth is needed to state precisely.

**Where tactical depth is intentionally omitted:** no event-sourcing/CQRS ceremony for the policy
or evidence model itself (that stays `w4-s1`'s deferred-subprofile question); no new aggregate
root beyond Policy/Evidence as value-object-like constructs — this part does not introduce a
transactional consistency boundary of its own (that remains the Records engine's, `w4-s1`).

## 9. Handoff to Author

- **Design artifact target:** `docs/design/core/plan-intake.md` (deepen in place).
- **Required methodology profile:** `ddd`.
- **Approval status:** pending — two items require coordinator resolution: GUARD-2 seam ownership
  split (recommended above, shared with `w4-s3`); depth escalation to `tactical-ddd` (recommended
  above).
- **Delivery constraints to preserve:** continue the existing vocabulary — do not mint new `INV-*`
  numbers below `INV-009`; this part's candidates (evidence-observed-not-self-reported,
  rule-governing-surface-forces-pause) are **INV-009+ CANDIDATES**, flagged for cross-wave
  reconciliation at the U9 pass. Keep the three ID namespaces distinct. Preserve and cite
  `core/plan-intake.md`'s existing stub content as this part's seed. The execution-plan contract
  v0 stays cited and unfrozen, not edited. Keep the GUARD-2 seam wording identical to `w4-s3`'s
  frame. Name Wave 4b's `w4-s6-execution-host` as a downstream frame-time consumer of this part's
  evidence/attestation model (EARN-2).
