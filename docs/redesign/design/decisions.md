---
title: "Jig Stage 1 — high-level architecture decisions"
purpose: Record the owner-selected Stage 1 alternatives, rationale, consequences, trade-offs, and deliberate Stage 2 deferrals behind the approved and locked architecture.
audience:
  - Jig owner
  - Architecture authors and reviewers
  - Stage 2 architecture authors
scope: Decisions 1–9 and final approval for the locked Layer 1 foundation; detailed contracts, implementation, migration, and delivery sequencing are excluded.
state: approved and locked
status: approved and locked — complete Stage 1 high-level foundation
owner: Arye Kogan (Jig owner)
approved_on: 2026-07-14
last_verified: 2026-07-14
sources_of_truth:
  - ../GOAL.md
  - Explicit owner decisions made on 2026-07-14
related:
  - ./README.md
  - ../guidelines/01-high-level-architecture.md
  - ../deterministic-story-orchestration/README.md
  - ../reviews/README.md
---

# Jig Stage 1 high-level architecture decisions

## Record status

This record preserves the explicit owner choices used to create the connected
[approved and locked high-level architecture](./README.md). Each decision was made by Arye Kogan,
Jig owner, on 2026-07-14 after reviewing alternatives and trade-offs.

The individual decisions authorized their inclusion in the proposed foundation. Arye Kogan then
approved and locked the complete connected Stage 1 foundation on 2026-07-14.

The initiative used no product-reference material and imported no external product promise or
constraint.

## Decision summary

| ID  | Topic                                  | Owner-selected direction                                                                       |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| D1  | Source scope and vocabulary            | Reference on demand with explicit import.                                                      |
| D2  | System boundary                        | Authority-and-proof boundary.                                                                  |
| D3  | Responsibilities, trust, and authority | Centralized deterministic authority with scoped judgment and attestation.                      |
| D4  | Lifecycle and information flow         | Recoverable hierarchical lifecycle with separate business-outcome and retirement dimensions.   |
| D5  | State authority and recovery           | Durable ordered transition ledger with reconstructable live state.                             |
| D6  | Concurrency and finalization           | Resource-class capacity, deterministic ordering, and one target-scoped finalization authority. |
| D7  | Acceptance and evidence                | Reviewer-principal full-package acceptance with policy-selected final verification.            |
| D8  | Failure and liveness                   | Smallest-scope fail-closed containment with bounded recovery and durable escalation.           |
| D9  | Invariants and Layer 2 boundary        | Consolidated invariant set, explicit deferrals, and two-artifact Stage 1 foundation.           |

## D1 — Source scope and canonical source-role vocabulary

### Question

What may define Jig's new architecture, what may only inform it, and how may product material become
a governing constraint?

### Owner decision

Use **reference on demand with explicit import**:

- `docs/product/` stays outside the default Stage 1 reading set.
- A named product document may be consulted only for a specific decision or owner-requested
  comparison.
- Any observation remains non-binding **Product Reference** unless the owner explicitly imports an
  exact promise or constraint with provenance, rationale, consequences, and affected decisions.
- `GOAL.md` plus explicit owner decisions remain **Architecture Authority**.
- The working contract, method, directional source, review evidence, product reference, imported
  constraint, owner decision, and proposed architecture remain distinct source roles.

### Rationale and benefits

- Preserves first-principles redesign and the authority established by the goal.
- Avoids silently importing the current product architecture or guarantees.
- Permits targeted product context when it can improve a named decision.
- Gives every imported constraint explicit provenance and accountability.

### Negative consequences and trade-off

The rule adds an owner decision and recording step when product context becomes relevant, and a
conflict may surface later than it would after a broad product review. The accepted trade-off is
deliberate provenance and lower anchoring risk in exchange for modest friction and later discovery
risk.

### Alternatives not selected

- Broad non-binding product-context review before architecture shaping.
- Complete exclusion of product material until after Stage 1 lock.

### Stage 2 deferral

The representation and linking mechanics for imported promises remain Stage 2 detail. The
requirement for explicit import does not.

## D2 — System boundary and external relationships

### Question

What is Jig responsible for end to end, and which people, judgment providers, mechanisms, stores,
repositories, and delivery systems remain external?

### Owner decision

Use an **authority-and-proof boundary**. Jig owns:

- semantic capability boundaries;
- preflight sufficiency;
- request identity and validation;
- authoritative recording;
- lifecycle and operation authorization;
- interruption and uncertain-effect reconciliation; and
- proof obligations for acceptance, delivery, landing, and terminal outcomes.

Configured adapters and providers perform mechanisms and report attributable facts or effect
certainty. “Outside” means outside Jig's decision-authority boundary, not necessarily outside its
repository, installation, deployment, or process. Concrete binding and schemas remain Stage 2.

### Rationale and benefits

- Makes the approved end-to-end guarantees Jig responsibilities instead of adapter assumptions.
- Keeps judgment and effect mechanisms replaceable.
- Gives recovery, no-double-effect behavior, landing proof, and escalation clear ownership.
- Preserves the proposal's useful separation of deterministic control and mechanisms.

### Negative consequences and trade-off

Jig must define and verify stronger contracts for persistence, effects, evidence, and
reconciliation. The accepted trade-off is stronger end-to-end accountability and proof in exchange
for a larger architecture responsibility than a thin scheduler.

### Alternatives not selected

- A thin coordinator owning only scheduling and live state.
- An integrated platform absorbing agents, workspaces, verification, delivery, and storage into one
  authority boundary.

### Stage 2 deferral

Port count, component boundaries, packages, processes, provider registration, APIs, and deployment
topology remain deferred. The authority boundary does not.

## D3 — Major responsibilities, trust, and authority

### Question

Which participant may propose, perform, observe, attest, authorize, decide, record, or reconcile,
and what happens when that participant is faulty or compromised?

### Owner decision

Use **centralized deterministic authority with scoped judgment and attestation**:

- Jig Control is the sole routine lifecycle authority and owns Authorize, Decide, Record, and
  Reconcile powers.
- The owner or recorded delegate decides explicit escalations, exceptions, imports, approvals,
  stops, and reopens within a recorded scope.
- The implementer proposes and performs implementation and supplies attributable self-report.
- The reviewer independently judges the complete exact candidate and attests its verdict.
- Verification, workspace, delivery, and storage mechanisms perform or attest only scoped facts.
- Read-only observers have no control path.

The canonical power vocabulary is:

- **Propose:** supply a candidate, recommendation, verdict, or requested action.
- **Perform:** execute work or an external effect.
- **Observe:** report directly observed facts.
- **Attest:** return an attributable, contract-valid claim.
- **Authorize:** permit a bounded operation under approved policy.
- **Decide:** select a lifecycle state, outcome, escalation, or exception.
- **Record:** create authoritative durable control truth.
- **Reconcile:** resolve uncertainty, duplication, or interruption from durable and external facts.

External results are validated against identity, role, subject, lifecycle, fence, and capability.
A participant cannot widen its authority through its output. Story-scoped compromise may block one
story; shared authority compromise interrupts the run. Jig Control or owner-authority compromise is
a trust-root failure requiring externally governed recovery.

### Rationale and benefits

- Preserves deterministic authority and attribution.
- Separates subjective judgment from observed facts and irreversible effects.
- Limits provider blast radius and supports replacement.
- Prevents mechanisms from promoting their own success claims into lifecycle decisions.

### Negative consequences and trade-off

The design requires stronger identity, evidence, validation, and reconciliation contracts and can
add latency. Jig Control becomes trusted infrastructure that must remain small and verifiable. The
accepted trade-off is assurance and replaceability in exchange for mediation complexity.

### Alternatives not selected

- Reviewer-centered lifecycle authority.
- Federated lifecycle authority distributed to mechanisms.

### Stage 2 deferral

Identity, delegation, credentials, attestation format, sandboxing, permission enforcement, and
conformance mechanisms remain deferred. The ownership of each power does not.

## D4 — Canonical lifecycle and information flow

### Question

What is the canonical run and story lifecycle, including outcomes, leases, resources, interruption,
recovery, escalation, and terminal completion?

### Owner decision

Use a **recoverable hierarchical lifecycle with separate business-outcome and retirement
dimensions**.

The run progresses through Received, Preflighting, Active, optional Parked or
Interrupted/Recovering conditions, Settling, and Completed. The story progresses through Pending,
Eligible, Preparing, Implementing, Reviewing, Accepted, Waiting for finalization, Finalizing,
business outcome, Retiring, and Closed.

Business outcomes are:

- `Landed`, which immediately unlocks dependents;
- directly `Blocked`, which immediately makes transitive dependents ineligible while independent
  work may continue; and
- derived `Not run — dependency blocked`, for which no resources were allocated.

Retirement follows both landed and blocked outcomes. A story closes only when its business outcome
and retirement obligations are final. A run completes only when all story outcomes are final and
every retirement obligation is completed or explicitly handed to an accountable owner.

Accepted transitions and authorized operations are durably recorded before live adoption or
dispatch. External results and owner decisions return as later validated triggers.

### Rationale and benefits

- Dependency consequences happen at the business event rather than cleanup.
- Cleanup failure cannot reverse landing.
- Blocked work remains preservable and recoverable.
- Lease, interruption, and uncertain-effect behavior have explicit lifecycle ownership.
- The model resolves the proposal's premature terminal `Blocked` contradiction.

### Negative consequences and trade-off

The model is richer than one flat status, and implementations must prevent invalid combinations
between outcome and retirement. The accepted trade-off is modeling discipline in exchange for
correct cleanup, recovery, and dependency behavior.

### Alternatives not selected

- One strictly linear lifecycle ending only after cleanup.
- Fully independent business and resource supervisors coordinated as separate workflows.

### Stage 2 deferral

Exhaustive states, transitions, event types, counters, timer interfaces, and cleanup task mechanics
remain deferred. The lifecycle phases and outcome/retirement separation do not.

## D5 — Durable, transient, and derived state

### Question

Which facts are authoritative and durable, which are transient or derived, and how does Jig resume
safely after interruption or uncertain persistence/effect outcomes?

### Owner decision

Use a **durable ordered transition ledger as authority with reconstructable live state**:

- Stable transition and operation identities are allocated before dispatch.
- An accepted transition and operation intents commit conditionally and durably before live
  adoption or dispatch.
- Lost commit acknowledgement is resolved by stable identity and expected prior position.
- Live state, queues, capacity calculations, and read models are replaceable projections.
- Durable controller, operation, candidate, target, and lease fences reject stale authority.
- Interruption recovery fences prior control, reconstructs the ledger, reconciles pending and
  uncertain effects, and resumes only from authoritative state.
- A new semantic effect is forbidden until the earlier effect is known absent or reconciled.
- Owner decisions, parked questions, landing proof, preservation proof, and residual obligations
  enter the durable authority.
- Compromised or irrecoverable authoritative storage causes fail-closed externally governed
  recovery; Jig makes no autonomous reconstruction or no-double-effect guarantee.

### Rationale and benefits

- Closes the append-acknowledgement uncertainty identified by review.
- Supports deterministic recovery, audit, and no-blind-retry behavior.
- Keeps derived state recomputable instead of introducing another mutable authority.

### Negative consequences and trade-off

Ordered conditional persistence, reconstruction, schema evolution, and reconciliation become
critical obligations. The ledger cannot by itself prove remote state. The accepted trade-off is
strong recovery and audit in exchange for demanding storage and effect contracts.

### Alternatives not selected

- Durable current state plus a separate audit stream.
- In-memory authority with durable audit only and no autonomous resume.

### Stage 2 deferral

Ledger technology, schemas, snapshots, projections, replication, compaction, backup, migration,
fence representation, and provider-specific reconciliation remain deferred. The authority and
record-before-adopt/dispatch rules do not.

## D6 — Concurrency, capacity, and finalization

### Question

How does Jig admit concurrent work deterministically, avoid resource deadlock and starvation,
serialize landing, and derive dependency consequences?

### Owner decision

Use **explicit resource-class capacity, deterministic ordering, and one target-scoped finalization
authority**:

- Capacity represents actual scarce classes rather than active stories alone.
- Policy defines maxima and progress requirements; configuration declares available capacity.
- Progress of admitted work takes priority over fresh admission when constrained.
- The total comparator is plan priority, immutable plan ordinal, then unique story ID.
- The comparator resolves otherwise-equal admission, finalization, and blocker-attribution choices.
- Accepted stories wait without a lease.
- One story holds durable finalization authority for the configured target.
- Bounded target refresh may retain story ownership, but candidate mutation requires renewed full
  review and authority rebinding.
- Ordinary implementation rework releases finalization authority.
- Only confirmed landing unlocks dependencies.
- Multi-root dependency blocking preserves the complete canonically ordered set of reachable direct
  blocker roots.
- Under eventually available resources and bounded mechanisms, finite-run scheduling is
  starvation-resistant.

### Rationale and benefits

- Resolves story-count versus session-capacity contradictions and reviewer-capacity deadlock risk.
- Preserves concurrent implementation/review while serializing landing.
- Makes every scheduler and finalization tie deterministic.
- Models provider-specific constraints without giving providers decision authority.

### Negative consequences and trade-off

Resource-class configuration and scheduling are more complex; conservative progress reservations
and one finalizer may leave capacity idle. The accepted trade-off is liveness and correctness in
exchange for utilization and implementation simplicity.

### Alternatives not selected

- Full story-bundle slots.
- One story active end to end.

### Stage 2 deferral

Resource manifests, reservation algorithms, queue structures, fairness metrics, exact bounds,
provider capacity mapping, and lease APIs remain deferred. Resource-class capacity, total ordering,
and serialized finalization do not.

## D7 — Acceptance and trustworthy evidence

### Question

What judgment accepts an exact candidate, what does Jig validate, and which later facts still
require independent observation?

### Owner decision

Use **reviewer-principal full-package acceptance with policy-selected final verification**:

- The reviewer owns full-package judgment of implementation, requirements, risks, implementer
  evidence sufficiency, provenance and relevance, findings, and delivery metadata.
- Valid reviewer approval of the exact candidate is the acceptance gate and permits finalization.
- Jig validates reviewer identity and authority, exact-subject binding, required evidence
  availability and integrity, unresolved findings, and lifecycle position.
- Jig durably records `Accepted` without independently rejudging the reviewer's sufficiency
  assessment.
- Frozen policy selects final verification as `deterministic` or `none`.
- With `none`, reviewer approval and the reviewed implementer evidence may proceed to delivery.
- Configuration and providers cannot lower or silently change frozen policy.
- Candidate or delivery-metadata mutation invalidates acceptance.
- Candidate-changing target refresh requires renewed full review.
- Jig independently validates future target identity, effect certainty, policy-required remote
  gates, and confirmed landing.

### Rationale and benefits

- Preserves the proposal's intended reviewer role as full delivery-package judge.
- Avoids turning final verification into a second reviewer.
- Keeps deterministic lifecycle authority and future effect facts with Jig.
- Permits policy to balance assurance and cost without provider downgrade.

### Negative consequences and trade-off

When policy selects `none`, convincing but false implementer check evidence may pass if the reviewer
does not detect it. Reviewer judgment also cannot guarantee semantic correctness. The owner
explicitly accepted this residual risk in exchange for reviewer-principal acceptance and
policy-selectable verification.

### Alternatives not selected

- Mandatory independent final verification for every accepted candidate.
- Mechanically gated acceptance without mandatory reviewer judgment.

### Stage 2 deferral

Evidence and verdict schemas, artifact storage, reviewer protocol, check-policy language, integrity
mechanisms, redaction, retention, remote-gate contracts, and landing-proof algorithms remain
deferred. Reviewer-principal acceptance and policy selection do not.

## D8 — Failure, interruption, recovery, escalation, and liveness

### Question

How does Jig contain failure, make bounded progress, recover from interruption, and reach a
deliberate outcome without weakening authority or silently hanging?

### Owner decision

Use **smallest-scope fail-closed containment with bounded autonomous recovery and durable
escalation**:

- Story failures block or park the story and its dependents while independent work continues.
- Target/finalization uncertainty fences further target effects but need not stop safe
  implementation and review.
- Shared ledger, controller, authority, or trust failures interrupt the run.
- Invalid preflight rejects execution before story effects.
- Retry, rework, refresh, wait, recovery, and retirement are separately bounded.
- Every wait has a durable reason, owner, wake condition, and exhaustion action; transient timers
  submit typed wake triggers.
- Exhaustion becomes retry, block, park, escalation, interruption, or residual handoff, never
  silent success or indefinite waiting.
- Uncertain irreversible effects are reconciled under the same operation identity before another
  semantic attempt.
- Landed and blocked outcomes continue through safe retirement.
- An unresolved retirement obligation requires preservation evidence, accountable owner, and
  explicit residual handoff.

For a finite frozen run with a trustworthy ledger/controller, eventually available capacity,
responsive or timing-out compliant mechanisms, a target stable long enough for bounded
finalization, and responsive owner authority, every story reaches a final business outcome and
every retirement obligation closes or is explicitly handed off. Without those assumptions, Jig
guarantees a durable named stop condition, not successful delivery.

### Rationale and benefits

- Preserves useful independent progress after isolated failures.
- Prevents shared trust failures from contaminating outcomes.
- Eliminates unnamed hangs and tight polling.
- Gives uncertain effects and retirement failures explicit owners and exits.

### Negative consequences and trade-off

Failure classification and recovery are more complex, finalization may remain blocked during
reconciliation, and owner responsiveness becomes a liveness dependency for escalations. The
accepted trade-off is safe useful progress in exchange for richer fault-domain modeling.

### Alternatives not selected

- Fail the complete run on any material story failure.
- Best-effort continuation with permissive degradation or unbounded retry.

### Stage 2 deferral

Failure codes, exact bounds, backoff, timer scheduling, cancellation, health checks, session
replacement, effect-specific reconciliation, escalation UX, cleanup runbooks, alerts, and service
objectives remain deferred. Smallest-scope containment and bounded explicit exhaustion do not.

## D9 — Consolidated invariants, Stage 2 boundary, and artifact shape

### Question

Which high-level rules must every later design preserve, which details may Stage 2 elaborate, and
how should the Stage 1 foundation be recorded?

### Owner decision

Approve the consolidated invariant set in the [architecture hub](./README.md), keep all detailed
mechanisms listed below in Stage 2, and create exactly this two-artifact foundation:

1. `design/README.md` — the canonical high-level model, views, lifecycle, state, authority,
   acceptance, concurrency, failure/recovery, liveness, and invariants.
2. `design/decisions.md` — the alternatives, owner selections, rationale, benefits, consequences,
   trade-offs, deferrals, and final approval/lock record.

Both artifacts were created as proposed and then approved and locked as a connected foundation by
the owner on 2026-07-14.

### Rationale and benefits

- Keeps one canonical model with one linked decision record.
- Avoids reproducing the standalone proposal's file split by default.
- Makes negative consequences and deferrals visible to the final approver and Stage 2 authors.
- Provides a clear review and reopen boundary.

### Negative consequences and trade-off

The compact two-file set is dense and requires disciplined internal navigation. Locking the
invariants will deliberately constrain Stage 2 and require an explicit reopen for material
simplification or authority redistribution. The accepted trade-off is a small connected artifact
set and stable foundation in exchange for reduced later flexibility.

### Alternatives not selected

- Copy or continue the standalone proposal's layered file structure.
- Split each Layer 1 perspective into an independent document before a readability need exists.

## Consolidated deliberate Stage 2 deferrals

Stage 2 may decide:

- component, port, package, process, and deployment decomposition;
- plan, policy, configuration, transition, event, operation, result, verdict, evidence, artifact,
  escalation, and residual-obligation schemas;
- exhaustive state machines, event and operation catalogs, and failure-code taxonomy;
- exact retry, rework, refresh, wait, timeout, timer, queue, reservation, capacity, and fairness
  algorithms;
- ledger technology, conditional-commit interface, snapshots, projections, replication, backup,
  compaction, migration, and disaster recovery;
- controller, operation, lease, candidate, target, and effect-fence representation;
- provider-specific idempotency, lookup, reconciliation, compensation, reconnection, and session
  replacement;
- evidence storage, attribution, integrity, redaction, encryption, access, size, retention, and
  archival;
- reviewer protocol, finding representation, policy language, verification execution, and
  remote-gate observation;
- repository and forge operations, merge strategies, content-equivalence rules, and landing proof;
- credential resolution, delegation enforcement, sandboxing, network boundaries, capability
  binding, and adapter conformance;
- escalation interfaces, notifications, operator tooling, cleanup runbooks, read models, metrics,
  exports, alerts, and service objectives; and
- architecture verification and conformance suites.

These are mechanism choices. Stage 2 may not change system authority, durable truth,
reviewer-principal acceptance, policy-selected verification, exact binding, serialized
finalization, confirmed-landing dependency release, failure containment, bounded liveness, or
outcome/retirement separation without reopening Stage 1.

## Final Stage 1 approval and lock record

- **Status:** approved and locked
- **Final approver:** Arye Kogan
- **Final approval date:** 2026-07-14
- **Approved scope:** The complete connected Layer 1 foundation in the
  [architecture hub](./README.md) and this decision record, including Decisions 1–9 and the
  consolidated invariants.
- **Accepted negative consequences:**
  - durable reconciliation complexity and fail-closed availability costs;
  - residual reviewer-judgment and evidence-sufficiency risk under the D7 reviewer-principal model,
    especially when frozen policy selects final verification as `none`;
  - review churn after target refresh or candidate mutation;
  - utilization costs from resource-class capacity and one target-scoped finalization authority;
  - bounded exhaustion that can require parking, blocking, escalation, interruption, or residual
    handoff; and
  - constraints imposed by explicit adapter contracts and the locked authority boundary.
- **Accepted Stage 2 deferrals:** The complete
  [consolidated deliberate Stage 2 deferral list](#consolidated-deliberate-stage-2-deferrals).
- **Lock effect:** Stage 2 may refine mechanisms but cannot change a consolidated invariant without
  an explicit Stage 1 reopen, impact statement, and renewed owner approval.

This approval records an architecture decision. It does not claim implementation, migration,
delivery sequencing, or current-state conformance.
