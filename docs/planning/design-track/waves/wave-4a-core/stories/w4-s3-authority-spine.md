---
id: w4-s3-authority-spine
wave: wave-4a-core
status: designed
depends_on: []
design_targets: [docs/design/core/authorization.md] # deepen in place (D-001): the Fence classifier, the Doorbell escalation, the capability-attestation gate, and the GUARD-2 enforcement mechanism. One of the two ORPHANED stubs deferred to Wave 4a by name (Wave 2's D-001 "cited not a target"; Wave 3's D-001 "Wave 4a deepens it"). The Fence port line Wave 3 cited is PRESERVED and CITED. author-technical-design may relocate via DocStructurePlan
reconciles_to:
  [
    FENCE-1,
    FENCE-2,
    FENCE-3,
    GUARD-1,
    GUARD-2,
    DOOR-1,
    DOOR-2,
    DOOR-3,
    EARN-1,
    EARN-2,
    CFG-10,
    STACK-4,
    DRIVE-1,
    DRIVE-3,
  ]
---

# w4-s3-authority-spine — design the Fence, the Doorbell, and the capability-attestation gate

## Objective

Brief a future design session to author the **authority spine** — the Fence's fixed-category
classifier (CFG-10), the Doorbell escalation (DOOR-1..3), and the capability-attestation gate
(EARN-1/2) — deepening `docs/design/core/authorization.md` **in place** (D-001) from the stub Wave 2
and Wave 3 explicitly **deferred to Wave 4a by name** (Wave 2's D-001 named it "cited, not a target";
Wave 3's D-001 confirmed "Wave 4a deepens it"). This session moves from the overview-altitude
interface the stub already draws — the `Fence` port's `authorize(request, boundPolicy) → grant \|
deny \| route`, cited by Wave 3 — to the classifier's actual decision content: how the fixed CFG-10
category boundary decides grant/deny/route (fail-closed, never model-adjudicated), how the Doorbell
parks durably and grants narrowly, and how the capability-attestation gate judges whether a driver's
proof is fresh enough to unlock autonomy.

This session also **co-owns the GUARD-2 enforcement mechanism** — one leg of a three-way cross-part
seam it shares with `w4-s2` (see below), stated **identically** in both stories.

Per **D-002** this session runs at `architecture_mode: tactical-ddd`, `ddd_depth: tactical-ddd`: the
authority spine is a fail-closed security/authorization boundary with a fixed, non-negotiable
classifier rule (CFG-10) and a durable escalation discipline (DOOR-2) — the ladder's "security,
tenancy, authorization, and fail-closed needs" tactical trigger, met independent of any provider
adapter. The Fence's grant/deny/route outcomes are a failure-token catalog; the Doorbell's
durable-park/narrow-grant discipline is a consistency/recovery model; capability attestation's
freshness/staleness judgment is a value-object-like invariant primitives alone would leave unsafe.

Per D-001 this session **deepens `authorization.md` in place**, preserving and citing its existing
Owns/Interface/Diagram as the seed (STOP-003: re-project and cite, never overwrite). The `Fence` port
line Wave 3 cited here is **preserved and cited**. The **guard-outcome-to-transition mapping**
(grant→proceed / deny→blocked / route→parked) stays **Wave 2's** settled territory (confirmed safe
assumption): this session supplies the classifier `authorize(...)` invokes, not the transition table
it feeds.

## Inputs to read

- [`../frames/w4-s3-authority-spine.md`](../frames/w4-s3-authority-spine.md) — this part's frame: the
  source map, `InputResolution`, `AgreedSystemModel` (`architecture_mode` `tactical-ddd`, `ddd_depth`
  `tactical-ddd`), the entity model (Fence classifier / Doorbell escalation / capability-attestation
  gate / the GUARD-2 seam), the invariant candidates (§7), and the GUARD-2 seam wording.
- [`../decisions.md`](../decisions.md) — the frame-gate dispositions this story is authored under
  (D-001 deepen in place; D-002 `tactical-ddd`/`tactical-ddd`; D-003 the GUARD-2 three-way seam,
  worded identically in s2/s3, residual sub-state OPEN; D-004 the s3↔s4 Fence/Doorbell wiring seam;
  D-005 `INV-009`+ candidates un-numbered) and the confirmed safe assumption (guard-outcome-to-
  transition mapping stays Wave 2's).
- [`../../wave-1-domain/frame.md`](../../wave-1-domain/frame.md) and Wave 1's settled story briefs —
  Orchestration/Fence/Doorbell named as adjacent contexts only, not modeled in entity depth; this
  session is the first to model Fence/Doorbell in depth.
- [`../../wave-2-state-machines/frame.md`](../../wave-2-state-machines/frame.md),
  [`../../wave-2-state-machines/decisions.md`](../../wave-2-state-machines/decisions.md), and Wave 2's
  settled story briefs — the work-item transition table treats the Fence's grant/deny/route as an
  **external guard predicate it consumes and cites** (Wave 2's D-001 "cited, not a target"); the
  guard-outcome-to-transition mapping this session's classifier feeds; the `done` guard the GUARD-2
  seam gates.
- [`../../wave-3-ports/frame.md`](../../wave-3-ports/frame.md),
  [`../../wave-3-ports/decisions.md`](../../wave-3-ports/decisions.md), and Wave 3's settled story
  briefs — the `Fence` port named as a worked example of a core-owned port a provider consumes but
  never redefines, "not a Wave 3 `design_target`... Wave 4a deepens it"; this session is that
  deepening.
- `docs/design/core/authorization.md` — the existing stub this session deepens in place: the Owns list
  (fail-closed authorization; grant/deny/route by fixed CFG-10 category; policy fixed at launch;
  Doorbell escalation with durable park and narrow grants; capability-attestation gating), the
  `Fence` Interface, and the diagram.
- `docs/design/core/plan-intake.md` — **cited, not edited** (that is `w4-s2`'s target): the policy
  content this session's Fence judges requests against, and the GUARD-2 rule-governing-surface
  declaration this session enforces; this session supplies the classifier, `w4-s2` the policy content
  and the GUARD-2 rule.
- `docs/design/contracts/execution-plan-contract-v0.md` — the declared authority expectations
  (reversible / irreversible / rule-governing) the Fence judges requests against; cited and
  **unfrozen**, not edited.
- `docs/product/guarantees.md` — FENCE-1..3 (fail-closed authorization; re-approval to widen; worker
  never holds credentials), GUARD-1/2 (policy fixed at launch; **GUARD-2** rule-governing-change
  pause), DOOR-1..3 (default-closed on ambiguity; durable escalation surviving interruption; narrow
  grants), EARN-1/2 (fresh, positive, driver-and-run-specific capability proof), CFG-10 (the fixed,
  non-model-adjudicated category boundary), STACK-4 / DRIVE-1/3 (attested capability, conformance
  suite, honest containment reporting) this spine reconciles to.
- `docs/design/notes/runtime-design-m5a.md` — the ENF/FAIL families and the SURF-005 (`Fence`)
  precedent this session continues — kept a namespace distinct from `INV-*` and product IDs.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc at the design_target: the deepened authority spine in
   `docs/design/core/authorization.md` — the Fence's fixed-category classifier, the Doorbell
   escalation, the capability-attestation gate, and the GUARD-2 enforcement mechanism — preserving
   and citing the `Fence` port line and existing diagram as the seed.
2. Open questions, logged (never invented answers) — including the GUARD-2 residual sub-state
   question (a distinct "re-approval pending" sub-state vs. reuse of Wave 2's `parked`), left OPEN,
   worded identically to `w4-s2`.
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting. This session
   names its **invariant candidates** (fail-closed-on-undeclared-request — FENCE-1 as a structural
   invariant; category-boundary-fixed-not-adjudicated — CFG-10 as a design-time, not runtime,
   decision; escalation-survives-interruption — DOOR-2 as a durability invariant). It does **not**
   hard-number them: candidates for `INV-009`+, flagged for cross-wave reconciliation with Wave 2's
   `w2-s3` and Wave 3's candidates (settled at U9).
4. Risks and deferred decisions.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- For the **Fence classifier**: how does the fixed CFG-10 category boundary decide grant / deny /
  route — reversible, non-privileged, no-rule-governing-touch may auto-grant; credentials, push/merge,
  rule-governing, irreversible always route to a human — fail-closed on an undeclared/unapproved
  request (FENCE-1), and never adjudicated by a model (CFG-10)?
- For the **Doorbell**: how does it route ambiguous/risky/unproven/GUARD-2-triggering requests to the
  owner (DOOR-1 default-closed), park durably so the run resumes after interruption (DOOR-2), and
  grant narrowly rather than blanket (DOOR-3)?
- For the **capability-attestation gate**: how does it gate autonomy on fresh, positive,
  driver-and-run-specific proof (EARN-1), so missing/stale/failed proof means reduced autonomy and
  more escalation, not a weaker guarantee (EARN-2)?
- **GUARD-2 (three-way seam, worded identically in `w4-s2` and `w4-s3`):** how does the seam give
  GUARD-2 an owner rather than orphan — **(1) `w4-s2` owns the rule**: what counts as a rule-governing
  surface (policy, verification, integration-safety, credential files, declared per-story in the
  plan's authority expectations per `execution-plan-contract-v0.md`), and the policy-level requirement
  that touching one forces fresh evidence before `done` is judged; **(2) `w4-s3` (this story) co-owns
  the enforcement mechanism**: the Fence detects a request touching a declared rule-governing surface
  and refuses to auto-grant it (CFG-10 already routes rule-governing files), and the Doorbell captures
  the owner's re-approval durably (DOOR-2 survive-interruption); **(3) Wave 2's work-item-lifecycle
  supplies the pause point**: the `done` guard checks "no unresolved GUARD-2 pause" before evidence is
  judged sufficient — gating an already-candidate-named transition, not a new state? The residual
  sub-question — a distinct "re-approval pending" sub-state vs. reuse of Wave 2's `parked` — stays
  **OPEN** for this session (or a Wave 2 re-projection), not resolved here.
- What is the **Fence/Doorbell wiring seam** with `w4-s4`: this session owns the classifier's and
  escalation's rules; `w4-s4` (bootstrap) owns wiring them with bound policy at launch. State this
  seam wording **identically** to `w4-s4`'s story.

## Invariants to preserve

- `FENCE-1`, `FENCE-2`, `FENCE-3` — every worker request is authorized before it executes,
  fail-closed if undeclared/unapproved; widening requires owner re-approval; the worker never holds
  credentials.
- `GUARD-1`, `GUARD-2` — policy is fixed at launch; a rule-governing change forces a completion pause
  for owner re-approval and fresh evidence. This session co-owns the GUARD-2 **enforcement** leg of
  the three-way seam.
- `DOOR-1`, `DOOR-2`, `DOOR-3` — ambiguity routes to the owner (default-closed); escalations are
  durable and survive interruption; human grants are narrow, not blanket.
- `EARN-1`, `EARN-2` — autonomy requires fresh, positive, driver-and-run-specific proof;
  missing/stale/failed proof means less autonomy, not a weaker guarantee.
- `CFG-10` — the grant/deny/route category boundary is fixed and never adjudicated by a model.
- No new `INV-*` numbers are hard-numbered by this story; it **names invariant candidates**
  (fail-closed-on-undeclared-request; category-boundary-fixed-not-adjudicated;
  escalation-survives-interruption) for `INV-009`+, flagged for cross-wave coordination with Wave 2's
  and Wave 3's candidates. If it must number one locally, it continues from `INV-009` (never resets)
  and records why in decisions.md.

## Must not decide

- The **Records engine** — the append-only log, projections, redaction mechanics — that is `w4-s1`
  (parallel root). This session records authorization/escalation/attestation outcomes as events but
  does not author the engine.
- **Policy's content** and the **evidence/attestation category model** — that is `w4-s2` (parallel
  root). This session's Fence judges requests **against** bound policy and the declared authority
  expectations; it does not author policy's content. It co-owns only the GUARD-2 **enforcement** leg,
  not the rule leg.
- **Bootstrap's wiring** of the Fence/Doorbell — that is `w4-s4`. This session owns the classifier/
  escalation rules; `w4-s4` wires them with bound policy at launch (the s3↔s4 seam, worded identically
  in both stories).
- Anything Wave 2 settled: the work-item and run **state machines** and the **guard-outcome-to-
  transition mapping** (grant→proceed / deny→blocked / route→parked). This session supplies the
  classifier `authorize(...)` invokes, not the transition table it feeds. The GUARD-2 seam **gates**
  the already-candidate-named `done` transition; the residual "re-approval pending" sub-state
  question is left **OPEN**, and any actual `done`-guard change is a future Wave 2 re-projection,
  flagged for U9.
- Anything Wave 3 settled: the `Fence` port **shape** and its owns/implements/must-not posture. This
  session deepens the classifier **behind** the port, preserving and citing the port line as the seed.
- **Freezing** the execution-plan v0 contract — it stays **cited and unfrozen**; this session names
  the declared authority expectations it judges against without minting field names; a needed change
  routes back to the seam owner (STOP-003).
- The **GUARD-2 residual sub-state** — whether the completion pause needs a distinct "re-approval
  pending" sub-state or reuses Wave 2's `parked`; left OPEN as an author-time question, identically to
  `w4-s2`.
- **Numbering** the consolidated invariant ledger — this session names candidates; numbering from
  `INV-009` is coordinated with Wave 2's and Wave 3's candidates at consolidation (U9).
- Field-level schema, TypeScript, JSON Schema, method signatures, or any frozen contract — deferred
  per `docs/design/README.md`.

## Exit criteria

- The deepened authority spine exists at `docs/design/core/authorization.md`, stating the Fence's
  fixed CFG-10 category boundary (fail-closed, never model-adjudicated), the Doorbell's durable-park
  and narrow-grant mechanics, and the capability-attestation freshness judgment as the load-bearing
  correctness properties, not afterthoughts.
- The existing Owns/Interface/Diagram — including the `Fence` port line Wave 3 cited — are
  **preserved and cited** as the seed, re-projected and extended rather than overwritten; any
  divergence is named explicitly (STOP-003).
- The **GUARD-2 three-way seam** is stated **identically** to `w4-s2`'s authored doc: `w4-s2` owns
  the rule, `w4-s3` co-owns enforcement, Wave 2's work-item-lifecycle supplies the pause point; the
  residual sub-state question is recorded as an open question, not resolved.
- The **guard-outcome-to-transition mapping** stays cited from Wave 2, not redesigned; the
  **Fence/Doorbell wiring seam** with `w4-s4` is stated identically to `w4-s4`'s story.
- The execution-plan v0 contract is **cited and unfrozen**, not edited; `plan-intake.md` is cited,
  not edited; no field names are minted.
- The invariant candidates (fail-closed-on-undeclared-request; category-boundary-fixed-not-adjudicated;
  escalation-survives-interruption) are named for `INV-009`+ and flagged for cross-wave coordination;
  the three ID namespaces are kept distinct.
- design-review verdict settled (zero open blocking suggestions), applied at the full method below.

## Evidence required

- This part's frame ([`../frames/w4-s3-authority-spine.md`](../frames/w4-s3-authority-spine.md)) —
  the frame that seeds this story's frame step.
- The authored design_target (`docs/design/core/authorization.md`).
- The design-review report.
- The decisions.md entries (this wave's [`../decisions.md`](../decisions.md)).

## Design review & handoff

This session runs the technical-design method itself, at **full weight** — this story authors a real
jig core internal (the authority spine: the fail-closed classifier, the durable escalation, the
capability-attestation gate every provider request crosses), so the full frame → author →
design-review pass applies, not the light method Wave 0 used for its scaffold-only stories.

1. frame-technical-design → a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode` `tactical-ddd`, `ddd_depth` `tactical-ddd` per D-002). This part's build-time
   frame at [`../frames/w4-s3-authority-spine.md`](../frames/w4-s3-authority-spine.md) seeds it; the
   session confirms and extends the `AgreedSystemModel`.
2. author-technical-design → the deepened authority spine at `docs/design/core/authorization.md`,
   preserving and citing the existing Owns/Interface/Diagram (and the `Fence` port line) as the seed;
   the guard-outcome-to-transition mapping cited from Wave 2; the GUARD-2 seam worded identically to
   `w4-s2`; the Fence/Doorbell wiring seam worded identically to `w4-s4`.
3. review-technical-design → three lenses (architecture-enforceability: the Fence is fail-closed with
   a fixed non-model-adjudicated category boundary; the Doorbell parks durably and grants narrowly;
   capability attestation gates on freshness; the classifier does not redesign Wave 2's transition
   mapping. domain-correctness: the spine reconciles to FENCE / GUARD / DOOR / EARN / CFG-10 / STACK-4
   / DRIVE without minting field names; agreement-integrity: nothing contradicts the part frame's
   `AgreedSystemModel`, Wave 1's adjacent-context posture, Wave 2's guard-outcome-to-transition
   mapping, Wave 3's `Fence` port shape, or — the load-bearing checks — the GUARD-2 seam wording in
   `w4-s2` and the Fence/Doorbell wiring seam in `w4-s4`). Dispositions recorded into this wave's
   [`../decisions.md`](../decisions.md); settled = zero open blocking suggestions.

Handoff: when settled, update status and note the resolved design_target in the track's future
traceability matrix; hand the named invariant candidates forward for `INV-009`+ consolidation; flag
the GUARD-2 residual sub-state question and the Wave 2 `done`-guard threading for U9; confirm the
Fence/Doorbell wiring seam is ready for `w4-s4` to consume at author time.

## Coordinator resolution (design_targets)

Per D-001 (deepen in place, no rename), this story deepens `docs/design/core/authorization.md`
directly — preserving and citing its existing Owns/Interface/Diagram (including the `Fence` port line
Wave 3 cited) as the seed and extending it into the deepened authority spine — rather than authoring a
new sibling doc. This is the STOP-003-compliant "re-project and cite," resolving one of the two
orphaned stubs prior waves deferred to Wave 4a by name. `docs/design/core/plan-intake.md` and
`docs/design/contracts/execution-plan-contract-v0.md` are **cited, not edited** (`w4-s2` deepens the
former; the latter stays unfrozen). The future `author-technical-design` session may relocate the
target via its `DocStructurePlan`; this brief records the resolved target, not a frozen path.
