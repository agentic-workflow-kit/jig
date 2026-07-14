---
title: "Jig redesign — Layer 1 high-level decisions"
purpose: Record the owner-selected Layer 1 alternatives, rationale, benefits, negative consequences, trade-offs, deliberate Layer 2 deferrals, invariant traceability, and final conditional review, approval, and lock state behind the proposed foundation.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent Layer 1 architecture reviewer
  - Future Layer 2 architecture authors after authorization
scope: Decisions D1–D9, accepted consequences, consolidated deferrals, invariant/lock traceability, archive-evidence disposition, product-conflict result, and final metadata-bearing review/approval/lock record; canonical model facts remain owned by high-level-architecture.md, and detailed contracts or implementation are excluded.
state: proposed
status: proposed Layer 1 final metadata-bearing decision record — pending same-reviewer exact-candidate recheck; recorded approval and lock activate on PASS under bounded delegation; Layer 2 unauthorized
owner: Arye Kogan
last_verified: 2026-07-14
sources_of_truth:
  - ./project-definition.md
  - ../AGENTS.md
  - ../raw/design/README.md
  - ../raw/design/decisions.md
  - Explicit Layer 1 author instruction, 2026-07-14
related:
  - ./high-level-architecture.md
  - ./README.md
  - ../README.md
---

# Jig redesign — Layer 1 high-level decisions

## Record contract and state

This record preserves Arye Kogan's established D1–D9 owner selections and the complete burdens they
carry. It is a progressive-disclosure companion to the reader-complete
[high-level architecture](./high-level-architecture.md). That document owns canonical vocabulary,
boundaries, identities, relationships, lifecycle, state, and invariants; this record explains why
the selected directions were chosen, which alternatives were rejected, what costs remain accepted,
and what Layer 2 may decide.

The 2026-07-14 documentation reset did not reopen these decisions. Their former approval labels are
historical, so this reorganized final metadata-bearing candidate remains **proposed** while the same
independent `gpt-5.6-sol` architecture reviewer using `xhigh` reasoning rechecks it. The active
owner-approved execution contract delegates only editorial/fidelity approval: an exact `PASS`
confirms faithful organization and re-expression of already-established intent and makes the
recorded Layer 1 approval and lock effective without a separate Arye selection or post-`PASS` file
edit. Arye retains every material product and architecture decision, exception, and reopen power;
the reviewer cannot invent, select, or change architecture.

No product-reference material was consulted and no external product promise or constraint was
imported. Archived proposal and review evidence was audited only after the binding decision inventory
was complete; it did not select or change a decision.

## Decision summary

| ID  | Topic                                  | Owner-selected direction                                                                       |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| D1  | Source scope and vocabulary            | Reference on demand with explicit import.                                                      |
| D2  | System boundary                        | Authority-and-proof boundary.                                                                  |
| D3  | Responsibilities, trust, and authority | Centralized deterministic authority with scoped judgment and attestation.                      |
| D4  | Lifecycle and information flow         | Recoverable hierarchical lifecycle with separate business-outcome and Retirement dimensions.   |
| D5  | State authority and Recovery           | Durable ordered Transition ledger with reconstructable live state.                             |
| D6  | Concurrency and finalization           | Resource-class capacity, deterministic ordering, and one target-scoped finalization authority. |
| D7  | Acceptance and evidence                | Reviewer-principal full-package acceptance with policy-selected final verification.            |
| D8  | Failure and liveness                   | Smallest-scope fail-closed containment with bounded Recovery and durable escalation.           |
| D9  | Invariants and Layer 2 boundary        | Consolidated I1–I21, explicit deferrals, and the smallest connected two-artifact foundation.   |

## D1 — source scope and canonical source-role vocabulary

### Question

What may define Jig's new architecture, what may only inform it, and how may product material become
a governing promise or constraint?

### Owner-selected direction

Use **reference on demand with explicit import**:

- the approved project definition plus explicit owner decisions remain **Architecture Authority**;
- the working contract, method, directional source, review evidence, Product Reference, imported
  promise/constraint, Owner Decision, and Proposed Architecture remain distinct roles;
- product material stays outside the default reading set and may be consulted only for a named
  decision or owner-requested comparison; and
- any observation remains non-binding Product Reference unless Arye imports an exact statement with
  provenance, rationale, consequences, and affected decisions.

No product material was consulted or imported for this candidate.

### Rationale and benefits

- Preserves first-principles redesign and the authority established by Layer 0.
- Prevents silent import of current product architecture or guarantees.
- Permits targeted context when it improves a named decision.
- Gives every imported statement explicit provenance and accountability.

### Accepted negative consequence and trade-off

The rule adds an owner decision and recording step when product context becomes relevant, and a
conflict may surface later than after a broad product review. Arye accepted modest friction and later
discovery risk in exchange for deliberate provenance and lower anchoring risk.

### Alternatives not selected

- Broad non-binding product-context review before shaping the architecture.
- Complete exclusion of product material until after Layer 1 lock.

### Deliberate Layer 2 deferral

Representation and linking mechanics for imported promises remain Layer 2 detail. The explicit
import requirement and source-role distinctions do not.

## D2 — system boundary and external relationships

### Question

What is Jig responsible for end to end, and which people, judgment providers, mechanisms, stores,
repositories, and delivery systems remain external?

### Owner-selected direction

Use an **authority-and-proof boundary**. Jig owns semantic capability boundaries, deterministic
preflight sufficiency, request identity and validation, authoritative recording, lifecycle and
Operation authorization, interruption and uncertain-effect reconciliation, and proof obligations
for acceptance, delivery, landing, outcomes, and Retirement.

Configured mechanisms perform effects and report attributable observations or effect certainty.
“External” means outside Jig's decision authority, not necessarily outside its repository,
installation, deployment, or process.

### Rationale and benefits

- Makes end-to-end guarantees Jig responsibilities rather than adapter assumptions.
- Keeps judgment and effect mechanisms replaceable.
- Gives Recovery, no-double-effect behavior, landing proof, and escalation clear ownership.
- Preserves the useful separation between deterministic control and mechanisms.

### Accepted negative consequence and trade-off

Jig must establish and verify stronger contracts for persistence, effects, evidence, and
reconciliation. Arye accepted a larger responsibility than a thin scheduler in exchange for strong
end-to-end accountability and proof.

### Alternatives not selected

- A thin coordinator owning only scheduling and live state.
- An integrated platform absorbing agents, workspaces, verification, delivery, and storage into one
  authority boundary.

### Deliberate Layer 2 deferral

Port count, component boundaries, packages, processes, provider registration, APIs, and deployment
topology remain deferred. The authority-and-proof boundary does not.

## D3 — major responsibilities, trust, and authority

### Question

Which participant may propose, perform, observe, attest, authorize, decide, record, or reconcile, and
what happens when that participant is faulty or compromised?

### Owner-selected direction

Use **centralized deterministic authority with scoped judgment and attestation**:

- Jig Control is the sole routine lifecycle authority and owns Authorize, Decide, Record, and
  Reconcile powers;
- Arye or a recorded delegate decides explicit escalations, exceptions, imports, approvals, stops,
  and reopens within recorded scope;
- the implementer proposes and performs implementation and supplies attributable self-report;
- the reviewer independently judges the complete exact Candidate and attests its verdict;
- verification, workspace, delivery, agent, and storage mechanisms perform or attest only scoped
  facts; and
- read-only observers have no control path.

External results are validated against identity, role, exact subject, lifecycle, fence, and
capability. A participant cannot widen authority through output. Story-scoped compromise may contain
to one Story; shared authority compromise interrupts the Run; Jig Control or owner-authority
compromise requires externally governed Recovery.

### Rationale and benefits

- Preserves deterministic authority and attribution.
- Separates subjective judgment from observed facts and irreversible effects.
- Limits provider blast radius and supports replacement.
- Prevents a mechanism from promoting its success claim into a lifecycle decision.

### Accepted negative consequence and trade-off

The model requires stronger identity, evidence, validation, and reconciliation contracts and can add
latency. Jig Control becomes trusted infrastructure that must remain small and verifiable. Arye
accepted mediation complexity in exchange for assurance and replaceability.

### Alternatives not selected

- Reviewer-centered lifecycle authority.
- Federated lifecycle authority distributed among mechanisms.

### Deliberate Layer 2 deferral

Identity, delegation, credentials, attestation format, sandboxing, permission enforcement, and
conformance mechanisms remain deferred. Ownership of each power does not.

## D4 — canonical lifecycle and authoritative information flow

### Question

What is the canonical Run and Story lifecycle, including outcomes, target authority, resources,
interruption, Recovery, escalation, and terminal completion?

### Owner-selected direction

Use a **recoverable hierarchical lifecycle with separate business-outcome and Retirement
dimensions**.

The Run progresses through Received, Preflighting, Active, optional Parked or
Interrupted/Recovering conditions, Settling, and Completed. A Story progresses through Pending,
Eligible, Preparing, Implementing, Reviewing, Accepted, Waiting for finalization, Finalizing,
business outcome, Retiring, and Closed.

Business outcomes are `Landed`, directly `Blocked`, and derived
`Not run — dependency blocked`. Landing immediately releases dependents; direct blocking immediately
makes transitive dependents ineligible while independent work may continue. Retirement follows both
Landed and Blocked. A Story closes only when outcome and obligations are final; a Run completes only
when every outcome is final and every obligation completes or has an owner-accepted residual handoff.

Accepted transitions and authorized Operation intents are recorded durably before live adoption or
dispatch. External results and owner decisions return as later validated triggers.

### Rationale and benefits

- Dependency consequences happen at the business event rather than cleanup.
- Cleanup failure cannot reverse landing.
- Blocked work remains preservable and recoverable.
- Finalization authority, interruption, and uncertain effects have explicit lifecycle ownership.
- The model resolves the archive's premature terminal `Blocked` contradiction.

### Accepted negative consequence and trade-off

The lifecycle is richer than one flat status, and later design must prevent invalid combinations
between outcome and Retirement. Arye accepted this modeling discipline in exchange for correct
cleanup, Recovery, and dependency behavior.

### Alternatives not selected

- One strictly linear lifecycle ending only after cleanup.
- Fully independent business and resource supervisors coordinated as separate workflows.

### Deliberate Layer 2 deferral

Exhaustive states, transitions, event types, counters, timer interfaces, and cleanup task mechanics
remain deferred. The named phases, authoritative ordering, and outcome/Retirement separation do not.

## D5 — durable, transient, and derived state

### Question

Which facts are authoritative and durable, which are transient or derived, and how does Jig resume
safely after interruption or uncertain persistence/effect outcomes?

### Owner-selected direction

Use a **durable ordered Transition ledger as authority with reconstructable live state**:

- allocate stable Transition and Operation identities before dispatch;
- conditionally commit accepted transitions and Operation intents before live adoption or dispatch;
- resolve lost commit acknowledgement by stable identity and expected prior position;
- keep live state, queues, capacity calculations, and read models as replaceable projections;
- reject stale authority with durable controller, Operation, Candidate, target, and finalization
  fences;
- fence prior control and reconstruct/reconcile pending or uncertain effects before resume;
- forbid a new semantic effect until the earlier effect is known absent or reconciled;
- make owner decisions, parked questions, landing proof, preservation proof, and Residual Obligations
  durable; and
- fail closed to externally governed Recovery after authoritative storage becomes compromised or
  irrecoverable.

### Rationale and benefits

- Closes the archive's append-acknowledgement uncertainty.
- Supports deterministic Recovery, audit, and no-blind-retry behavior.
- Keeps derived state recomputable instead of creating another mutable authority.

### Accepted negative consequence and trade-off

Ordered conditional persistence, reconstruction, schema evolution, and reconciliation become
critical obligations. The ledger alone cannot prove remote state. Arye accepted demanding storage
and effect contracts in exchange for strong Recovery and audit.

### Alternatives not selected

- Durable current state plus a separate audit stream.
- In-memory authority with durable audit only and no autonomous resume.

### Deliberate Layer 2 deferral

Ledger technology, schemas, snapshots, projections, replication, compaction, backup, migration,
fence representation, and provider-specific reconciliation remain deferred. Durable authority and
record-before-adopt/dispatch ordering do not.

## D6 — concurrency, capacity, and finalization

### Question

How does Jig admit concurrent work deterministically, avoid resource deadlock and starvation,
serialize target change, and derive dependency consequences?

### Owner-selected direction

Use **explicit resource-class capacity, deterministic ordering, and one target-scoped finalization
authority**:

- model actual scarce resource classes instead of active Stories alone;
- let policy define maxima and progress requirements while configuration declares hard capacity;
- prioritize progress and Retirement of admitted work over new admission when constrained;
- use approved plan priority, immutable plan ordinal, and unique Story identity as the total
  comparator for otherwise-equal admission, finalization, and blocker attribution;
- let Accepted Stories wait without finalization authority;
- allow exactly one Story to hold durable finalization authority for the configured target;
- permit bounded target refresh to retain Story ownership while requiring full review and atomic
  authority rebinding after Candidate mutation;
- release authority for ordinary implementation rework;
- release dependencies only after confirmed landing;
- preserve the complete canonically ordered set of reachable direct blocker roots; and
- make finite-run scheduling starvation-resistant under the recorded liveness assumptions.

### Rationale and benefits

- Resolves the proposal's Story-count/session-capacity contradictions and reviewer-capacity deadlock
  risk.
- Preserves concurrent implementation and review while serializing target change.
- Makes every admission, finalization, and attribution tie deterministic.
- Models provider-specific capacity without giving providers decision authority.

### Accepted negative consequence and trade-off

Resource-class configuration and scheduling are more complex. Conservative progress reserve and one
target finalizer may leave available capacity idle. Arye accepted lower utilization in exchange for
liveness and correctness.

### Alternatives not selected

- Full Story-bundle slots that reserve every possible resource for an admitted Story.
- One Story active end to end.

### Deliberate Layer 2 deferral

Resource manifests, reservation algorithms, queue structures, fairness metrics, exact bounds,
provider-capacity mapping, and authority APIs remain deferred. Resource classes, the total
comparator, admitted-progress priority, and serialized finalization do not.

## D7 — acceptance and trustworthy evidence

### Question

What judgment accepts an exact Candidate, what does Jig validate, and which later facts still
require independent observation?

### Owner-selected direction

Use **reviewer-principal full-package acceptance with policy-selected final verification**:

- the reviewer owns full-package judgment of implementation, requirements, risk, implementer
  evidence sufficiency/provenance/relevance, findings, and delivery metadata;
- valid reviewer approval of the exact Candidate is the acceptance gate and permits finalization;
- Jig validates reviewer identity/authority, exact-subject binding, required evidence
  availability/integrity, unresolved findings, and lifecycle position;
- Jig records `Accepted` without independently rejudging reviewer sufficiency;
- frozen policy selects final verification as `deterministic` or `none`;
- with `none`, reviewer approval and reviewed implementer evidence may proceed to delivery;
- configuration and providers cannot lower or silently change policy;
- Candidate or delivery-metadata mutation invalidates acceptance;
- Candidate-changing target refresh requires a new full review; and
- Jig independently validates future target identity, effect certainty, policy-required remote
  gates, and confirmed landing.

### Rationale and benefits

- Preserves the reviewer as full delivery-package judge.
- Avoids turning final verification into a second reviewer.
- Keeps deterministic lifecycle authority and future effect facts with Jig.
- Lets policy balance assurance and cost without provider downgrade.

### Accepted negative consequence and trade-off

When policy selects `none`, convincing but false implementer check evidence may pass if the reviewer
does not detect it. Reviewer judgment also cannot guarantee semantic correctness. Arye explicitly
accepted this residual risk in exchange for reviewer-principal acceptance and policy-selectable
verification.

An archived review recommended mandatory independently observed automated checks based on external
product/design contracts. Those contracts were not imported and cannot override this owner decision.
The residual risk remains visible; the candidate does not silently “fix” it by changing D7.

### Alternatives not selected

- Mandatory independent final verification for every Accepted Candidate.
- Mechanically gated acceptance without mandatory reviewer judgment.

### Deliberate Layer 2 deferral

Evidence and verdict schemas, artifact storage, reviewer protocol, check-policy language, integrity
mechanisms, redaction, retention, remote-gate contracts, and landing-proof algorithms remain
deferred. Reviewer-principal acceptance, policy selection, and the accepted residual risk do not.

## D8 — failure, interruption, Recovery, escalation, and liveness

### Question

How does Jig contain failure, make bounded progress, recover from interruption, and reach a
deliberate outcome without weakening authority or silently hanging?

### Owner-selected direction

Use **smallest-scope fail-closed containment with bounded autonomous Recovery and durable
escalation**:

- Story failures block or park the Story and its dependents while independent work continues;
- target/finalization uncertainty fences further target effects but need not stop safe
  implementation and review;
- shared ledger, controller, authority, or trust failures interrupt the Run;
- invalid preflight rejects the Run before Story effects;
- retry, rework, refresh, wait, Recovery, and Retirement are separately bounded;
- every wait has durable reason, owner, wake condition, and exhaustion action, with typed wake
  triggers and no timer authority;
- exhaustion becomes retry, block, park, escalation, interruption, stop, or residual handoff, never
  silent success or indefinite waiting;
- uncertain irreversible effects reconcile under the same Operation identity before another
  semantic attempt;
- Landed and Blocked outcomes continue through safe Retirement; and
- unresolved Retirement requires preservation evidence, accountable ownership, and explicit residual
  handoff.

For a finite frozen Run with a trustworthy ledger/controller, eventually available capacity,
responsive or timing-out mechanisms, a target stable long enough for bounded finalization, and
responsive owner authority, every Story reaches a final business outcome and every Retirement
obligation closes or is explicitly handed off. Without those assumptions, Jig guarantees a durable
named stop, not successful delivery.

### Rationale and benefits

- Preserves useful independent progress after isolated failure.
- Prevents shared trust loss from contaminating outcomes.
- Eliminates unnamed hangs and tight polling.
- Gives uncertain effects and Retirement failures explicit owners and exits.

### Accepted negative consequence and trade-off

Failure classification and Recovery are more complex, finalization may remain blocked during
reconciliation, and owner responsiveness becomes a liveness dependency. Arye accepted richer
fault-domain modeling in exchange for safe useful progress.

### Alternatives not selected

- Fail the complete Run on any material Story failure.
- Best-effort continuation with permissive degradation or unbounded retry.

### Deliberate Layer 2 deferral

Failure codes, exact bounds, backoff, timer scheduling, cancellation, health checks, session
replacement, effect-specific reconciliation, escalation UX, cleanup runbooks, alerts, and service
objectives remain deferred. Smallest-safe containment and bounded explicit exhaustion do not.

## D9 — consolidated invariants, Layer 2 boundary, and artifact shape

### Question

Which high-level rules must later design preserve, which details may Layer 2 elaborate, and how must
the Layer 1 foundation be recorded?

### Owner-selected direction

Preserve consolidated I1–I21, keep the complete mechanism inventory below in Layer 2, and use exactly
this connected two-artifact foundation:

1. [`high-level-architecture.md`](./high-level-architecture.md) — the canonical reader-complete
   high-level model, views, lifecycle, state, authority, acceptance, concurrency, failure/Recovery,
   liveness, Retirement, and invariants.
2. [`high-level-decisions.md`](./high-level-decisions.md) — the owner-selected alternatives,
   rationale, benefits, negative consequences, trade-offs, deferrals, invariant/lock traceability,
   evidence dispositions, and final conditional approval/lock record.

The renamed paths implement the owner's required reorganization of the prior D9 two-artifact shape;
they do not add a third foundation artifact.

### Rationale and benefits

- Keeps one canonical model with one linked decision record.
- Avoids reproducing the standalone proposal's file split.
- Makes burdens and deferrals visible to the owner, reviewer, and future Layer 2 authors.
- Provides a clear review, approval, lock, and reopen boundary.

### Accepted negative consequence and trade-off

The compact two-file set is dense and requires disciplined internal navigation. Locking the
invariants deliberately constrains Layer 2 and requires an explicit reopen for material
simplification or authority redistribution. Arye accepted reduced later flexibility in exchange for
a small connected artifact set and stable foundation.

### Alternatives not selected

- Copy or continue the standalone proposal's layered file structure.
- Split each Layer 1 perspective into an independent document before a demonstrated readability need.

### Deliberate Layer 2 deferral

Only the mechanism choices in the consolidated inventory below are deferred. No high-level decision,
accepted consequence, or invariant is hidden in that list.

## Accepted final negative consequences

Arye's established approval record explicitly accepted all six burdens; this proposed
reorganization preserves them for final exact-candidate fidelity review and activation of the
recorded approval and lock:

1. durable reconciliation complexity and fail-closed availability costs;
2. residual reviewer-judgment and evidence-sufficiency risk under D7, especially when frozen policy
   selects final verification as `none`;
3. review churn after target refresh or Candidate mutation;
4. utilization costs from resource-class capacity and one target-scoped finalization authority;
5. bounded exhaustion that may require parking, blocking, escalation, interruption, stop, or
   Residual Obligation; and
6. constraints imposed by explicit mechanism contracts and the locked authority boundary.

These costs are part of the selected architecture. They are not review findings to erase, nor are
they Layer 2 placeholders.

## Consolidated deliberate Layer 2 deferrals

Layer 2 may decide:

1. component, port, package, process, and deployment decomposition;
2. plan, policy, configuration, Transition, event, Operation, result, verdict, evidence, artifact,
   escalation, and Residual Obligation schemas;
3. exhaustive state machines, event and Operation catalogs, and failure-code taxonomy;
4. exact retry, rework, refresh, wait, timeout, timer, queue, reservation, capacity, and fairness
   algorithms and numeric budgets;
5. ledger technology, conditional-commit interface, snapshots, projections, replication, backup,
   compaction, migration, and disaster Recovery;
6. controller, Operation, finalization-authority, Candidate, target, and effect-fence representation;
7. provider-specific idempotency, lookup, reconciliation, compensation, reconnection, and session
   replacement;
8. evidence storage, attribution, integrity, redaction, encryption, access, size, retention, and
   archival;
9. reviewer protocol, finding representation, policy language, verification execution, and
   remote-gate observation;
10. repository and forge Operations, merge strategies, content-equivalence rules, and landing-proof
    algorithms;
11. credential resolution, delegation enforcement, sandboxing, network boundaries, capability
    binding, and mechanism conformance;
12. escalation interfaces, notifications, operator tooling, cleanup runbooks, read models, metrics,
    exports, alerts, and service objectives; and
13. architecture verification and conformance suites.

Layer 2 may not change system authority, durable truth, reviewer-principal acceptance,
policy-selected verification, exact binding, serialized finalization, confirmed-landing dependency
release, failure containment, bounded liveness, no-double-effect behavior, preservation, or
outcome/Retirement separation without an explicit Layer 1 reopen and renewed owner approval.

## Consolidated invariant and lock traceability

The canonical wording of I1–I21 is owned by
[high-level architecture](./high-level-architecture.md#consolidated-layer-1-invariants). This table
traces each invariant to its selected decision and Layer 0 driver without creating a second
definition.

| Invariant                                                 | Selected by | Principal Layer 0 drivers       | Lock consequence for later design                                                         |
| --------------------------------------------------------- | ----------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| I1 — architecture/source authority                        | D1          | O1, O2, O9; CON1–CON5           | Cannot import or elevate outside material silently.                                       |
| I2 — Jig authority-and-proof boundary                     | D2          | O1, O7; C12; QS8                | Cannot shift end-to-end authority/proof to a mechanism.                                   |
| I3 — sole routine lifecycle authority and scoped powers   | D3          | O2, O7; C12; QS8, QS11          | Cannot federate lifecycle decisions or widen participant powers.                          |
| I4 — deterministic decision from ordered validated facts  | D3, D5      | O2; QS1                         | Cannot introduce unrecorded or arrival-order discretion.                                  |
| I5 — ledger authority and record-before-adopt/dispatch    | D4, D5      | O6, O8; QS1, QS5                | Cannot make a cache, process, or uncommitted effect authoritative.                        |
| I6 — fence and reconstruct before resume                  | D5, D8      | O5, O6; C11; QS5, QS11          | Cannot resume from ambient or stale control state.                                        |
| I7 — exact-subject binding and fail-closed mismatch       | D3, D5, D7  | O3, O7; QS2, QS3, QS8           | Cannot reuse stale judgment, evidence, authority, or effect results.                      |
| I8 — reviewer-principal acceptance                        | D7          | O3, O7; C4; QS3                 | Cannot replace mandatory reviewer judgment or add Jig sufficiency judgment.               |
| I9 — policy-selected `deterministic` or `none`            | D7          | O2, O7; QS3, QS8                | Cannot let configuration/provider weaken or silently change policy.                       |
| I10 — resource-class capacity and admitted progress       | D6          | O3, O5; C6, C10; QS2, QS7, QS12 | Cannot reduce capacity to Story count or admit work without a progress path.              |
| I11 — immutable total comparator                          | D6          | O2, O4; QS1, QS4                | Cannot break ties by collection, arrival, or mechanism order.                             |
| I12 — one target-scoped finalization authority            | D6          | O4; C7; QS4                     | Cannot authorize concurrent target-changing finalization.                                 |
| I13 — confirmed landing releases dependencies             | D4, D6, D7  | O4; C8; QS4                     | Cannot release on approval, publication, checks, integration response, or cleanup.        |
| I14 — complete canonical direct-blocker roots             | D4, D6      | O2, O8; QS1, QS6                | Cannot discard roots or choose attribution by arrival order.                              |
| I15 — smallest-safe fail-closed scope                     | D3, D8      | O5, O7; C9; QS6, QS8, QS11      | Cannot widen isolated failure gratuitously or continue with insufficient authority/proof. |
| I16 — bounded paths and exhaustion                        | D8          | O5; C10; QS7, QS12              | Cannot create an unnamed or indefinite retry, wait, Recovery, or Retirement path.         |
| I17 — no second semantic effect before reconciliation     | D5, D8      | O6; C11; QS5                    | Cannot blind-retry an uncertain irreversible effect.                                      |
| I18 — business outcome separate from Retirement           | D4, D8      | O4, O8; QS4, QS9                | Cannot let cleanup reverse landing or delay dependency release.                           |
| I19 — preserve before destruction and assign residuals    | D4, D8      | O8; C13, C14; QS9               | Cannot destroy recoverable work/evidence or leave an obligation ownerless.                |
| I20 — no autonomous guarantee after trust-root compromise | D3, D5, D8  | O5, O7; QS11, QS12              | Cannot claim safe autonomous Recovery from untrustworthy authority/history.               |
| I21 — approval distinct from implementation/current truth | D9          | O1, O9; CON5, CON8              | Cannot claim conformance, enter Layer 2, or change a lock without the required gates.     |

The recorded lock is not yet effective while the final exact-candidate verdict is pending. The same
reviewer's exact `PASS` makes it effective under the owner-approved bounded delegation, with no
further owner-selection or metadata edit. After that activation, changing any row requires a Layer 1
reopen, impact statement, renewed owner decision, and exact-candidate review; a Layer 2 artifact
cannot redefine it by elaboration.

## Archived proposal and review reconciliation

The archive was audited only after the original 450-row binding-source inventory had frozen the
governing owner decisions. The corrected inventory adds the controlling active-gate row as binding
row 451. The exhaustive 39-row audit and exact source locations remain in
`/tmp/jig-layer1-fidelity.md`. The material Layer 1 dispositions are:

| Archived evidence                              | Material issue or useful direction                                                                                                                                                  | Disposition in this candidate                                                                                                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Proposal-wide direction                        | Approved-envelope intake, deterministic preflight, exact-Candidate review, concurrent work, serialized target change, landing proof, evidence binding, and safe cleanup.            | Preserved and reorganized under D2–D8.                                                                                                                                   |
| Proposal mechanisms                            | One branch/worktree, retained sessions, optional PR, exact loop counts, named ports, schemas, event/Operation catalogs, provider choices, checkpoint modes, and delivery mechanics. | Omitted as Layer 2 detail and included in the consolidated deferral categories.                                                                                          |
| In-memory authority and no resume              | Durable events could diverge from lost live state and could not support interruption Recovery.                                                                                      | Replaced by the already-selected D5 durable-ledger authority and D8 Recovery posture.                                                                                    |
| Commit-unknown append window                   | Atomic append lacked stable Transition identity, expected position, acknowledgement reconciliation, and readback.                                                                   | D5 requires stable identity plus committed/absent/indeterminate reconciliation; mechanics remain Layer 2.                                                                |
| Premature terminal `Blocked`                   | Mandatory preservation and resource Retirement had no legal post-outcome path.                                                                                                      | D4/D8 separate business outcome from Retirement.                                                                                                                         |
| Story-count capacity and review deadlock       | Retained sessions, review, Retirement, and progress capacity were not coherently represented.                                                                                       | D6 selects resource-class capacity and admitted-progress priority.                                                                                                       |
| Non-deterministic ties and incomplete blockers | Equal priorities and multi-root dependencies could depend on iteration or arrival order.                                                                                            | D6 selects the immutable total comparator and complete canonical reachable direct-root set.                                                                              |
| Finalization authority lifecycle               | Rework/refresh could retain stale Candidate-bound authority or starve other Stories.                                                                                                | D6 releases authority for ordinary rework and permits bounded refresh ownership only with renewed review and atomic rebinding.                                           |
| Unbounded rework and missing wake              | Verification/review/target waits could loop or stall without a bound or durable wake.                                                                                               | D8 bounds every path and requires durable reason, owner, wake/completion condition, and exhaustion action.                                                               |
| Uncertain remote effects                       | No required lookup/reconciliation before a new attempt.                                                                                                                             | D5/D8/I17 require effect certainty and reconciliation under stable Operation identity; provider realization is Layer 2.                                                  |
| External provider-seam review claim            | An archived review cited outside product/design contracts for fixed seams and host proof.                                                                                           | The cited contracts were not imported. Generic authorization, attestation, parking, and trust concerns are already satisfied by D2/D3/D8; concrete seams remain Layer 2. |
| External mandatory-check review claim          | An archived review cited an outside automated-check promise and recommended mandatory independent verification.                                                                     | The promise was not imported. D7 intentionally retains policy `none` and its explicitly accepted residual risk; no owner decision was changed.                           |

### Product-conflict result

There is **no imported product promise and no product conflict to resolve**. References in the
archived Codex review to repository product/design contracts are adversarial historical evidence,
not governing input. Applying them as requirements would violate D1 and materially change D7; this
candidate does neither.

### Owner-decision result

The archive exposed no unresolved conflict that requires a new owner choice. Every material
Layer 1 issue is already resolved by D1–D9/I1–I21, and every remaining mechanism question maps to
the consolidated Layer 2 deferrals. The author verdict is therefore **no
`OWNER_DECISION_REQUIRED` finding**. This is not architecture approval.

## Layer 1 review and lock-gate evidence

| Gate item                                                                                    | Candidate evidence                                                                                                                                                                                                                      | Current result                                                                                                                        |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| G-R1 — every Layer 1 question is answered or explicitly inapplicable                         | The architecture's ten-question trace names the canonical answer for G-Q1–G-Q10; the nine Layer 0 handoff questions are traced separately.                                                                                              | Satisfied in the final author candidate.                                                                                              |
| G-R2 — model, views, flows, and decision records agree                                       | One vocabulary and collision-free stable-ID model is used in prose, tables, V1–V4, D1–D9, and I1–I21; this record defers to the architecture for model facts.                                                                           | Satisfied in the final author candidate.                                                                                              |
| G-R3 — success, rejection, failure, interruption, and Recovery are possible and owned        | The Run/Story lifecycle, authoritative ordering, V3, containment table, and Recovery section name every branch and authority.                                                                                                           | Satisfied in the final author candidate.                                                                                              |
| G-R4 — trust and authority rely on no unnamed behavior                                       | The eight-power vocabulary, responsibility matrix, trust/compromise posture, V2, and fail-closed rules name every authority boundary.                                                                                                   | Satisfied in the final author candidate.                                                                                              |
| G-R5 — concurrency/serialization has no obvious safety or liveness contradiction             | D6, resource-class capacity, admitted-progress priority, immutable total order, one target authority, and bounded liveness form one posture.                                                                                            | Satisfied in the final author candidate.                                                                                              |
| G-R6 — acceptance is tied to trustworthy evidence                                            | D7 and the architecture bind reviewer judgment, Jig validation, evidence roles, final verification, and landing proof to exact subjects.                                                                                                | Satisfied in the final author candidate, including the accepted D7 residual risk.                                                     |
| G-R7 — product-contract conflicts have explicit owner decisions                              | No product promise was imported. Archived outside references remain non-governing under D1, so there is no conflict to decide.                                                                                                          | Explicitly none.                                                                                                                      |
| G-R8 — alternatives and negative consequences are visible                                    | Every D1–D9 entry includes rejected alternatives and its negative consequence; all six final accepted burdens are consolidated.                                                                                                         | Satisfied in the final author candidate.                                                                                              |
| G-R9 — no material high-level decision is hidden in Layer 2                                  | The thirteen deferral categories are paired with an explicit non-deferrable lock boundary and traced to I1–I21.                                                                                                                         | Satisfied in the final author candidate.                                                                                              |
| G-R10 — owner explicitly approves and durably records the lock; later change requires reopen | Arye's established decisions and the active owner-approved delegation pre-record the exact effect: the same reviewer's `PASS` approves only faithful re-expression and activates the lock; later material change still requires reopen. | Pending final exact-candidate verdict; recorded approval and lock become effective automatically on the same reviewer's exact `PASS`. |

## Final metadata-bearing review, approval, and lock record

| Record field                              | Final recorded value                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continuing product and architecture owner | Arye Kogan. All material outcome, boundary, quality, owner, guarantee, architecture, trade-off, consequence, exception, and reopen decisions remain his.                                                                                                                                                                                                 |
| Candidate scope                           | The exact connected [`high-level-architecture.md`](./high-level-architecture.md) and this decision record, plus the two index status updates.                                                                                                                                                                                                            |
| Author role                               | Layer 1 architecture author; `gpt-5.6-sol` with `xhigh` reasoning.                                                                                                                                                                                                                                                                                       |
| Author authority                          | Faithful organization and re-expression of established decisions only; no self-review or approval authority.                                                                                                                                                                                                                                             |
| Delegation date and source                | 2026-07-14; the owner-approved execution flow in `docs/redesign/AGENTS.md:12-21`.                                                                                                                                                                                                                                                                        |
| Independent reviewer                      | Fresh independent Layer 1 architecture reviewer; `gpt-5.6-sol` with `xhigh` reasoning; session `019f625e-f66e-7a40-a9cd-3a7d5abaae30`.                                                                                                                                                                                                                   |
| Delegated reviewer scope                  | Approve only fidelity, completeness, coherence, layer discipline, and faithful organization/re-expression of already-established intent for the exact Layer 1 candidate. The reviewer cannot invent, select, or change an outcome, boundary, quality requirement, owner, guarantee, architecture decision, trade-off, negative consequence, or deferral. |
| Allowed reviewer verdicts                 | `PASS`, `CHANGES_REQUIRED`, or `OWNER_DECISION_REQUIRED`.                                                                                                                                                                                                                                                                                                |
| First reviewed baseline                   | Repository `HEAD` `a40df8974b50765e2be0c0b05bc4c512ceae1652`; merge base `521ae0846e788ef91979dd4c273687ab22e6137e`; the five exact reviewed hashes are recorded below.                                                                                                                                                                                  |
| First verdict                             | `CHANGES_REQUIRED`. The reviewer accepted the substantive architecture and reported only F1–F3.                                                                                                                                                                                                                                                          |
| F1 correction                             | Removed the superseded separate post-`PASS` Arye selection/approval and metadata-edit step; distinguished continuing material owner authority from bounded editorial/fidelity approval; finalized all metadata before recheck.                                                                                                                           |
| F2 correction                             | Added the controlling active-gate inventory row and reconciled U7, L0-AUTH2, and G-R10 so exact `PASS` activates recorded approval/lock without transferring architecture selection.                                                                                                                                                                     |
| F3 correction                             | Preserved the V2 target fault scope as `F-TARGET` and assigned the V4 configured authoritative target external fact source the distinct stable ID `X-TARGET`, including declarations, node, and legend.                                                                                                                                                  |
| Material decision impact                  | None. D1–D9, I1–I21, all selected alternatives, accepted consequences, trade-offs, and Layer 2 deferrals are unchanged. No `OWNER_DECISION_REQUIRED` finding exists.                                                                                                                                                                                     |
| Corrected fidelity result                 | 451 binding rows plus 39 archived-evidence dispositions: 490 total; 426 preserved, 47 reorganized, 17 omitted as Layer 2 detail, zero unexplained omissions, and zero `OWNER_DECISION_REQUIRED`.                                                                                                                                                         |
| Product-conflict verdict                  | None imported; none to resolve.                                                                                                                                                                                                                                                                                                                          |
| Final metadata-bearing candidate verdict  | Pending exact-candidate recheck by the same reviewer session. The final candidate hashes are recorded in `/tmp/jig-layer1-author-result.md`.                                                                                                                                                                                                             |
| Approval and lock effect                  | Not yet effective while the final verdict is pending. The same reviewer's exact `PASS` approves only this faithful organization/re-expression and makes the already-owner-decided Layer 1 foundation approved and locked without another owner-selection or file edit. The reviewer does not acquire architecture-selection authority.                   |
| Later-change rule                         | After the lock becomes effective, a later material change requires explicit Arye reopen, impact statement, renewed owner decision, and exact-candidate review. Any post-`PASS` edit changes the exact candidate and cannot inherit the `PASS`.                                                                                                           |
| Layer 2 authorization                     | None. Layer 2 remains unauthorized and not started under this execution stop even after Layer 1 `PASS`; after the Layer 1 commit, stop for Arye.                                                                                                                                                                                                         |
| Unsuccessful-loop limit                   | After at most three unsuccessful author/reviewer loops, stop for Arye with unresolved findings.                                                                                                                                                                                                                                                          |

### First reviewed candidate hashes

| File                                              | SHA-256                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/redesign/README.md`                         | `6dec47df653b063de9f62b330421b80879d96818849e534be04f45dcf2a5b5fa` |
| `docs/redesign/design/README.md`                  | `db3bf5fc250e738d41b8d4623a99689255a2416358e5ad85b4409c1016a1f400` |
| `docs/redesign/design/high-level-architecture.md` | `be95650de11d0e48bb43258c64a4107dd84b3ac2d4c713f1d99746d1322ea332` |
| `docs/redesign/design/high-level-decisions.md`    | `4491e4cd68dc64ab110752d0f8cfbe3204749118e009dde1742c5a1110512608` |
| `/tmp/jig-layer1-fidelity.md`                     | `d071bcee3deb72fdaabd97f96383a195bf2528e15c4ec90ba39108604ef3b228` |

The first-review findings had no material decision impact. This exact set remains proposed while
the same reviewer rechecks it. That reviewer's exact `PASS` activates the recorded Layer 1 approval
and lock under the bounded delegation; no further owner-selection or metadata edit follows. Layer 2
remains unauthorized and must not begin.
