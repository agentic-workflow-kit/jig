---
title: "Wave 4a frame — w4-s3: the authority spine (Fence, doorbell, capability attestation)"
status: draft — frame (intake)
methodology: ddd
---

# Problem Frame — Wave 4a, s3: Authority spine

> Intake artifact for the DDD-first deep-design track's Wave 4a, part 3 of 4. It frames the
> **authority model** — the Fence classifier (CFG-10), the doorbell (DOOR-2/3), and the
> capability-attestation gate (EARN-2) — the third of four CORE parts this wave deepens. Produced
> by applying the `technical-design` pack's `frame-technical-design` skill; the next stage is
> `author-technical-design`, gated on this frame's approval status. Authored alongside three
> sibling frames (`w4-s1-records-observability.md`, `w4-s2-plan-policy-evidence.md`,
> `w4-s4-bootstrap-composition-root.md`) in one pass for mutual coherence.
>
> `docs/design/core/authorization.md` is one of the two core stubs **explicitly deferred to
> "Wave 4a"** by both prior waves: Wave 2's frame named it "cited, not a target" (its D-001), and
> Wave 3's frame named it "cited, not modeled/authored this wave... Wave 4a deepens it" (its
> InputResolution and D-001). This part is where that deferral resolves. This frame consumes
> [Wave 1's domain frame](../../wave-1-domain/frame.md) (Orchestration/Fence/Doorbell named as
> adjacent contexts, not modeled in entity depth), [Wave 2's frame](../../wave-2-state-machines/frame.md)
> (the work-item transition table treats `authorize(request, boundPolicy) → grant \| deny \| route`
> as an external guard predicate it consumes and cites — this part is what that citation points
> to), and [Wave 3's frame](../../wave-3-ports/frame.md) (the Fence named as a worked example of a
> core-owned port a provider consumes but never redefines; not a Wave 3 `design_target`).

## 1. Scope and Goal

- **Source request:** deep-design track, Wave 4a, story 3 — deepen `docs/design/core/
authorization.md` in place: the Fence's fixed-category classifier mechanics (CFG-10's boundary:
  reversible/non-privileged/no-rule-governing-touch may auto-grant; credentials/push/merge/
  rule-governing/irreversible always routes to a human); the Doorbell's escalation and durable-
  park mechanics (DOOR-1..3); the capability-attestation gate (EARN-1/2) that judges whether a
  driver's proof is fresh enough to unlock autonomy.
- **Goal:** produce an `AgreedSystemModel` for the authority spine clean and citable enough to
  seed this wave's charter and story brief, coherent with the three sibling parts — in particular
  co-owning the GUARD-2 seam with `w4-s2` and Wave 2's work-item-lifecycle — and readable by
  Wave 4b (the four provider parts request through this spine) without rework.
- **Out of scope for this part:** the Fence port's method signature (Wave 3 already candidate-
  named `authorize(request, boundPolicy) → grant | deny | route`); the work-item/run state
  machines themselves (Wave 2, closed — this part supplies the guard they cite, not the transition
  table); Policy's content and shape, or the evidence/attestation category model (`w4-s2` — this
  part judges requests _against_ bound policy, it does not author policy's content); the Records
  engine (`w4-s1`); bootstrap's binding of policy at launch or wiring of the Fence (`w4-s4`,
  cited); any provider adapter (Wave 4b); field-level schema, TypeScript, or JSON Schema.

## 2. Source Map

| Source                                                                                                                                      | Authority                                                | Establishes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Gaps / stale risk                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/design/core/authorization.md`](../../../../../design/core/authorization.md)                                                          | authoritative — design stub (this part's target)         | `status: draft — stub`; owns fail-closed authorization, grant/deny/route by fixed CFG-10 category, policy fixed at launch (GUARD-1/FENCE-2), Doorbell escalation with durable park and narrow grants, capability-attestation gating (EARN-1/2); the `Fence` port already candidate-named by Wave 3                                                                                                                                                                                                         | Stub altitude only — "the depth of capability-attestation conformance checking, and the manual-vs-assisted posture's exact tuning surface, are not specified here" (the stub's own deferred-extension-point note); this part deepens exactly that gap |
| [`docs/product/guarantees.md`](../../../../../../product/guarantees.md)                                                                     | authoritative — ID spec                                  | FENCE-1..3 (fail-closed authorization; re-approval to widen; worker never holds credentials); GUARD-1/2 (policy fixed at launch; **GUARD-2** rule-governing-change pause); DOOR-1..3 (default-closed on ambiguity; durable escalation surviving interruption; narrow grants); EARN-1/2 (fresh, positive, driver-and-run-specific capability proof); CFG-10 (the fixed, non-model-adjudicated category boundary); STACK-4, DRIVE-1/3 (attested capability, conformance suite, honest containment reporting) | Outcome-level commitments this part's classifier/escalation/attestation model reconciles to, not restates                                                                                                                                             |
| [`../../wave-1-domain/frame.md`](../../wave-1-domain/frame.md)                                                                              | authoritative — prior-wave frame (seed)                  | Orchestration/Fence/Doorbell named as adjacent behavioral contexts only, not modeled in entity depth (Wave 1's explicit scope boundary, deferred first to Wave 2, now to this part)                                                                                                                                                                                                                                                                                                                        | This part is the first to model Fence/Doorbell in depth                                                                                                                                                                                               |
| [`../../wave-2-state-machines/frame.md`](../../wave-2-state-machines/frame.md) + [`decisions.md`](../../wave-2-state-machines/decisions.md) | authoritative — prior-wave frame (seed) and decision log | The work-item transition table treats the Fence's grant/deny/route as an **external guard predicate it consumes and cites**, not a classifier it redesigns (Wave 2's confirmed safe assumption); Wave 2's D-001 explicitly names `authorization.md` "cited, not a target"                                                                                                                                                                                                                                  | This part is what Wave 2's citation points to; the guard-outcome-to-transition mapping (grant→proceed, deny→blocked, route→parked) stays Wave 2's, not re-litigated here                                                                              |
| [`../../wave-3-ports/frame.md`](../../wave-3-ports/frame.md) + [`decisions.md`](../../wave-3-ports/decisions.md)                            | authoritative — prior-wave frame (seed) and decision log | The Fence named as a worked example of a core-owned port a provider consumes but never redefines; explicitly "not a Wave 3 `design_target`... Wave 4a deepens it" (Wave 3's safe assumption and D-001-adjacent InputResolution)                                                                                                                                                                                                                                                                            | Confirms this part is the designated home for `authorization.md`'s deepening — both prior waves point here                                                                                                                                            |
| [`docs/design/core/README.md`](../../../../../design/core/README.md)                                                                        | authoritative — design spine                             | Group B rows: Fence (runtime authorization, fail-closed, fixed category), Doorbell (escalation, durable park, narrow grants), Capability attestation (earned-trust gate)                                                                                                                                                                                                                                                                                                                                   | Overview altitude only; this part deepens the content beneath these three rows                                                                                                                                                                        |
| [`docs/design/contracts/execution-plan-contract-v0.md`](../../../../../design/contracts/execution-plan-contract-v0.md)                      | authoritative — in-seam contract v0 (cited, unfrozen)    | Plans declare "expected reversible actions," "expected irreversible or privileged actions... which remain runner-owned," and "changes to policy, verification, integration safety, credentials, or other rule-governing files that require explicit owner re-approval" — the declared-scope input the Fence judges requests against                                                                                                                                                                        | v0 shape, cited not redesigned                                                                                                                                                                                                                        |
| [`AGENTS.md`](../../../../../../../AGENTS.md) (jig repo root)                                                                               | authoritative — repo contract                            | House conventions; the boundary rule (core owns the authority model, providers never redefine it)                                                                                                                                                                                                                                                                                                                                                                                                          | None material                                                                                                                                                                                                                                         |

## 3. InputResolution

| Required input                                                                                      | Source evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Owner / impact                                                                                                                         | Approval status |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **Placement:** deepen `core/authorization.md` in place, or relocate?                                | Coordinator's brief assigns `design_target: docs/design/core/authorization.md (deepen)`, explicitly naming it one of "the two ORPHANED core stubs that Wave 2 and Wave 3 explicitly DEFERRED to 'Wave 4a'"; both prior waves' D-001-equivalent dispositions confirm in-place deepening as this track's established precedent                                                                                                                                                                                                                                                                                       | **provided** (not a fork) — deepen in place, preserving and citing the existing stub (Owns/Interface/Diagram) as seed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `docs/design/core/authorization.md` design_target                                                                                      | approved        |
| **GUARD-2 seam ownership:** co-owned with `w4-s2` — same question, same answer, stated identically. | See `w4-s2`'s InputResolution (identical source evidence: `guarantees.md` GUARD-2; `execution-plan-contract-v0.md`'s rule-governing-surface authority expectations).                                                                                                                                                                                                                                                                                                                                                                                                                                               | **requires approval, recommended** — the same three-way split named in `w4-s2`, restated here identically: **(1) `w4-s2` owns the rule** — what counts as a rule-governing surface and the policy-level pause requirement. **(2) `w4-s3` (this part) co-owns the enforcement mechanism** — the Fence's classifier must detect when a request or observed change touches a declared rule-governing surface and refuse to auto-grant it (CFG-10 already puts "rule-governing files" in the always-routes category); the Doorbell is where the owner's re-approval and fresh-evidence decision is captured durably (DOOR-2's survive-interruption property is exactly what GUARD-2's "completion pauses... for explicit owner re-approval" needs). **(3) Wave 2's work-item-lifecycle supplies the pause point** — the `done` guard checks for an unresolved GUARD-2 pause before evidence is judged sufficient, cited not redesigned. The residual open question — a distinct "re-approval pending" sub-state vs. reusing `parked` — is the same one `w4-s2` surfaces; not resolved here either, to keep the two frames' wording identical. | `w4-s3`'s Fence/Doorbell escalation mechanics; `w4-s2`'s policy/evidence model; Wave 2's work-item `done` guard (future re-projection) | pending         |
| **Depth escalation:** does the authority spine warrant `tactical-ddd`?                              | The ladder's tactical trigger: "the domain has strict invariants... fail-closed needs." FENCE-1 (fail-closed authorization), CFG-10 (a fixed, non-negotiable category boundary — explicitly "never adjudicated by a model"), DOOR-1 (default-closed on ambiguity), and EARN-1/2 (freshness/staleness of capability proof) are all concrete domain invariants with real failure modes (a request wrongly auto-granted; a stale attestation treated as fresh). This is the classic tactical-DDD "fail-closed... security and authorization" driver named directly in the ladder's own step-3 complexity-driver list. | **requires approval, recommended** — select `architecture_mode: tactical-ddd`, `ddd_depth: tactical-ddd`. The Fence's classifier is a value-object-like fixed-category rule (CFG-10) with an explicit, named failure-token catalog opportunity (deny-fail-closed, route-to-doorbell, capability-proof-stale/missing/failed); the Doorbell's durable-park-and-narrow-grant discipline is a consistency/recovery rule (survives interruption, DOOR-2) squarely inside tactical-DDD's "complex lifecycle transitions... consistency model" driver. Not `ports-and-adapters`: this part is not isolating infrastructure, it is authoring the classifier's actual decision rule and the escalation's durability guarantee.                                                                                                                                                                                                                                                                                                                                                                                                                     | This part's `architecture_mode`/`ddd_depth` frontmatter                                                                                | pending         |

### Blocking Questions

None. Both `requires approval` items resolve by the coordinator choosing among named, sourced
alternatives — the GUARD-2 item explicitly mirrors `w4-s2`'s so the coordinator resolves both
together, not independently.

### Safe Assumptions

- Placement (deepen `core/authorization.md` in place) is settled by the coordinator's brief
  (explicitly naming this as one of two orphaned stubs) and prior-wave precedent; not reopened.
- The residual GUARD-2 sub-state question is left open for future authoring/Wave 2 re-projection,
  identically to `w4-s2`'s posture.
- The guard-outcome-to-transition mapping (grant→proceed, deny→blocked, route→parked) stays
  Wave 2's settled territory; this part supplies the classifier `authorize(...)` invokes, not the
  transition table it feeds into.

## 4. AgreedSystemModel

### Source Inputs Used

| Source                                                 | Establishes                                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/design/core/authorization.md`                    | The existing stub this part deepens: Fence/Doorbell/capability-attestation owns list, `Fence` port shape (Wave 3)                     |
| `docs/product/guarantees.md`                           | FENCE-1..3, GUARD-1/2, DOOR-1..3, EARN-1/2, CFG-10, STACK-4, DRIVE-1/3                                                                |
| `../../wave-1-domain/frame.md`                         | Fence/Doorbell named adjacent, not modeled — this part is the first to model them                                                     |
| `../../wave-2-state-machines/frame.md`, `decisions.md` | The guard-outcome-to-transition mapping this part's classifier feeds (cited, not redesigned); "cited, not a target" posture confirmed |
| `../../wave-3-ports/frame.md`, `decisions.md`          | The `Fence` port candidate shape; "Wave 4a deepens it" confirmation                                                                   |
| `docs/design/contracts/execution-plan-contract-v0.md`  | Declared authority expectations (reversible/irreversible/rule-governing) the classifier judges requests against (cited, unfrozen)     |

### Unresolved Required Inputs

- GUARD-2 seam ownership split (requires approval, recommended — see §3; identical to `w4-s2`).
- Depth escalation to `tactical-ddd` (requires approval, recommended — see §3).

### High-Level System Entities

| Entity                                                    | Responsibilities                                                                                                                                                                                                                               | Owns                                                                                                                                                        | Reads                                                                                                                                                                                                          | Does Not Own                                                                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Fence (classifier)**                                    | Authorizes every worker request before it executes; fail-closed if undeclared/unapproved; grants, denies, or routes by the fixed CFG-10 category boundary; detects requests touching a declared rule-governing surface (GUARD-2 co-ownership). | The classifier's decision rule (the fixed category boundary itself — never adjudicated by a model); the fail-closed default; the GUARD-2 detection trigger. | Bound policy (`w4-s2`, cited: policy's content, the declared rule-governing surfaces); the plan's declared authority expectations (cited, unfrozen); the work item's declared scope (Wave 1).                  | Policy's content/shape (`w4-s2`); which state transition a grant/deny/route outcome triggers (Wave 2, cited, settled). |
| **Doorbell (escalation)**                                 | Routes ambiguous, risky, unproven, or GUARD-2-triggering requests to the owner; parks durably (survives interruption); captures the owner's approve/reject/override/narrow-grant decision; grants are narrow, never blanket.                   | The escalation channel; the durable-park guarantee (DOOR-2); the narrow-grant discipline (DOOR-3); the re-approval capture for GUARD-2.                     | Routed requests from the Fence.                                                                                                                                                                                | The underlying request's authorization logic (Fence's); persistence of the park state (Records, `w4-s1`, cited).       |
| **Capability attestation gate**                           | Gates autonomy on fresh, positive, driver-and-run-specific proof (EARN-1); missing/stale/failed proof means reduced autonomy, not a weaker guarantee (EARN-2).                                                                                 | The freshness/staleness judgment rule; the autonomy-reduction consequence (more escalation, not silent risk).                                               | The driver's attestation claim (Wave 4b's providers, cited as future consumers); the evidence/attestation category model (`w4-s2`, cited — this part judges freshness, `w4-s2` defines the category taxonomy). | Defining what capability proof looks like per category (`w4-s2`); recording the attestation event durably (`w4-s1`).   |
| **GUARD-2 seam** (co-owned, named identically in `w4-s2`) | See `w4-s2`'s identical entry: `w4-s2` owns the rule; `w4-s3` (this part) co-owns enforcement via the Fence's detection and the Doorbell's re-approval capture; Wave 2's work-item-lifecycle supplies the pause point.                         | Split three ways, restated identically here.                                                                                                                | —                                                                                                                                                                                                              | A single part inventing the mechanism alone.                                                                           |

### Relations

| From                               | Relation                                | To                                                     | Notes                                                                                       |
| ---------------------------------- | --------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Worker request (Wave 3, cited)     | is judged by                            | Fence                                                  | `authorize(request, boundPolicy) → grant \| deny \| route` (Wave 3's port shape, unchanged) |
| Fence                              | routes (risky/ambiguous/rule-governing) | Doorbell                                               | DOOR-1: default-closed when autonomy can't be justified                                     |
| Doorbell                           | captures                                | Owner decision (approve/reject/override)               | DOOR-2/3: durable, narrow                                                                   |
| Fence                              | grants only with                        | Capability attestation gate's fresh-proof confirmation | EARN-1: autonomy requires fresh positive proof                                              |
| Fence, Doorbell                    | emit (candidate events)                 | Records engine (`w4-s1`, cited)                        | Every authorization/escalation/attestation outcome is an event                              |
| GUARD-2 seam (`w4-s3` enforcement) | is co-owned with                        | `w4-s2`'s rule declaration                             | Named identically — see GUARD-2 seam wording above                                          |
| GUARD-2 seam                       | gates                                   | Work-item `done` transition (Wave 2, cited)            | Same pause point named in `w4-s2`; residual sub-state question shared                       |
| Bootstrap (`w4-s4`, cited)         | wires                                   | Fence, Doorbell (with bound policy from `w4-s2`)       | Named identically in `w4-s4`'s frame — s3 defines the classifier, s4 wires it at launch     |

### Seams and External Boundaries

- **The `Fence` port** (Wave 3, candidate-named, cited) — `authorize(request, boundPolicy) → grant
| deny | route`. This part deepens the classifier behind the port.
- **The GUARD-2 seam (s3 + s2 + Wave 2 work-item-lifecycle)** — named identically to `w4-s2`'s
  frame: `w4-s2` owns the rule-governing-surface declaration and the pause requirement; `w4-s3`
  (this part) owns the Fence's detection and the Doorbell's re-approval capture; Wave 2's work-item
  `done` guard is the pause point, cited not redesigned this wave.
- **The guard-outcome-to-transition boundary** (Wave 2, cited, unchanged) — this part supplies the
  classifier's decision; Wave 2 owns which transition each outcome triggers.
- **The capability-attestation boundary (Wave 4b, future)** — the four provider parts will supply
  attestation claims this gate judges; this part frames the judging rule, not any provider's
  proof mechanism.
- **The bootstrap wiring boundary (s3 ↔ s4)** — `w4-s4` wires the Fence/Doorbell with bound policy
  at launch; this part defines their shape and rules, named identically in `w4-s4`'s frame.

### Lifecycle and State Terms

No new lifecycle states — the Fence's grant/deny/route and the Doorbell's park/decide mechanics
feed Wave 2's already-closed work-item transitions as guards, not new states. The GUARD-2 pause's
residual sub-state question (see §3) is the one open lifecycle-adjacent item, shared identically
with `w4-s2`.

### Mode and Depth

- **architecture_mode:** `tactical-ddd` (recommended, requires approval — see §3)
- **initial ddd_depth:** `tactical-ddd` (recommended, requires approval — see §3)

### Open Questions and Approval

- GUARD-2 seam ownership split, co-owned with `w4-s2`, stated identically (requires approval,
  recommended — see §3).
- Depth escalation to `tactical-ddd` (requires approval, recommended — see §3).
- **Approval status: pending (coordinator).**

## 5. Assumptions and Blockers

(Restated from §3 for template completeness.)

### Safe Assumptions

- Placement (deepen `core/authorization.md` in place) is settled, not reopened.
- The guard-outcome-to-transition mapping stays Wave 2's; this part supplies the classifier, not
  the transition table.
- The GUARD-2 sub-state question is left open, identically to `w4-s2`'s posture.

### Blocking Questions

None.

## 6. DDD Context Candidates

| Candidate context               | Owns                                                                                                                                                                                                                | Reads                                                                                                                                   | Does Not Own                                                                                                                                                | Open ownership question                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Authority spine** (this part) | The Fence classifier's fixed-category decision rule; the Doorbell's durable escalation and narrow-grant mechanics; the capability-attestation freshness judgment; co-ownership of the GUARD-2 enforcement mechanism | Bound policy (`w4-s2`, cited); the plan's declared authority expectations (cited); Wave 2's guard-outcome-to-transition mapping (cited) | Policy's content/shape (`w4-s2`); which transition a grant/deny/route outcome triggers (Wave 2); the Records engine (`w4-s1`); bootstrap's wiring (`w4-s4`) | GUARD-2 enforcement split with `w4-s2` (co-owned, not contested); depth escalation |

## 7. Complexity Drivers

- **Invariants:** FENCE-1..3 (fail-closed; re-approval to widen; worker never holds credentials);
  GUARD-1/2 (policy fixed at launch; rule-governing change forces a pause — co-owned enforcement);
  DOOR-1..3 (default-closed; durable escalation; narrow grants); EARN-1/2 (fresh, positive,
  driver-and-run-specific proof); CFG-10 (fixed, non-model-adjudicated category boundary). New
  candidates for `INV-009`+: fail-closed-on-undeclared-request (FENCE-1 as a structural invariant);
  category-boundary-fixed-not-adjudicated (CFG-10 as a design-time, not runtime, decision);
  escalation-survives-interruption (DOOR-2 as a durability invariant).
- **State transitions:** none new authored directly; the Fence/Doorbell mechanics feed Wave 2's
  already-closed transitions as guards.
- **Integrations / anti-corruption:** the `Fence` port boundary (Wave 3, cited); the GUARD-2 seam
  split with `w4-s2` and Wave 2; the future capability-attestation boundary with Wave 4b's provider
  parts.
- **Consistency / idempotency / replay / audit:** the Doorbell's durable-park guarantee must
  survive a crash/resume (DOOR-2, cross-referencing Wave 2's RESUME candidates); capability
  attestation must not be treated as fresh past its staleness window.
- **Security / authorization:** this part's entire deliverable — fail-closed authorization, the
  fixed category boundary, capability-gated autonomy.
- **Migration / deploy:** none — docs-only frame.
- **Observability:** every Fence/Doorbell/attestation outcome is an event into the Records engine
  (`w4-s1`, cited); this part must not mint new event-family names beyond the v0 contract's
  authorization/capability families.
- **Testing:** none at this altitude; future story brief's `tactical-ddd` depth carries forward a
  failure-token catalog (deny-fail-closed, route-to-doorbell, capability-proof stale/missing).

## 8. Architecture Mode and Initial DDD Depth

**Selected architecture_mode:** `tactical-ddd` (recommended)

**Why this mode fits:** the authority spine is a fail-closed security/authorization boundary with
a fixed, non-negotiable classifier rule (CFG-10) and a durable escalation discipline (DOOR-2) —
exactly the ladder's named tactical-DDD driver ("security, tenancy, authorization, and fail-closed
needs"). This is not port isolation (Wave 3's altitude, already settled for the `Fence` port's
shape); it is the classifier's actual decision content.

**Selected depth:** `tactical-ddd` (recommended)

**Why this depth fits:** the ladder's required elements — "failure-token catalogs, consistency
model" — map onto the Fence's deny/route/grant outcomes (a failure-token catalog) and the
Doorbell's durable-park/narrow-grant discipline (a consistency/recovery model). Capability
attestation's freshness/staleness judgment is itself a value-object-like invariant (a proof either
satisfies the freshness window or it doesn't) that primitives alone would leave unsafe.

**Where tactical depth is intentionally omitted:** no event-sourcing ceremony (the Doorbell's park
state is durable via the Records engine, `w4-s1`'s territory, not a separate event store this part
introduces); no new aggregate beyond the Fence-classifier/Doorbell-escalation/attestation-gate
triad — this part does not claim a transactional consistency boundary of its own (that is the
Records engine's, `w4-s1`).

## 9. Handoff to Author

- **Design artifact target:** `docs/design/core/authorization.md` (deepen in place).
- **Required methodology profile:** `ddd`.
- **Approval status:** pending — two items require coordinator resolution: GUARD-2 seam ownership
  split (recommended above, shared with `w4-s2`, must be resolved identically in both); depth
  escalation to `tactical-ddd` (recommended above).
- **Delivery constraints to preserve:** continue the existing vocabulary — do not mint new `INV-*`
  numbers below `INV-009`; this part's candidates (fail-closed-on-undeclared-request,
  category-boundary-fixed-not-adjudicated, escalation-survives-interruption) are **INV-009+
  CANDIDATES**, flagged for cross-wave reconciliation at the U9 pass. Keep the three ID namespaces
  distinct. Preserve and cite `core/authorization.md`'s existing stub content as this part's seed.
  Keep the guard-outcome-to-transition mapping cited from Wave 2, never redesigned. Keep the
  GUARD-2 seam wording identical to `w4-s2`'s frame.
