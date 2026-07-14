---
title: "Jig Stage 2 — verified checkpoint and execution plan"
purpose: Preserve the verified Stage 2 orientation and define the gated execution plan for producing Jig's decision-complete architecture.
audience:
  - Jig owner
  - Stage 2 architecture coordinator
  - Architecture authors and reviewers
scope: Planning and review sequencing for Layer 2 detailed architecture; architecture content, implementation, migration, delivery sequencing, and current-state publication are excluded.
state: proposed
status: proposed — Step 0 acknowledged; Stage 2 execution awaits owner approval
owner: Arye Kogan (Jig owner)
last_verified: 2026-07-14
source_baseline: e5b50ca63be5cde8ff67d68a7010f9e13459c6d6
stage_1_lock: dce91c5359df37e378f1575282658a1fa3b04341
sources_of_truth:
  - ./GOAL.md
  - ./design/README.md
  - ./design/decisions.md
  - ./guidelines/README.md
  - ./guidelines/02-detailed-architecture.md
related:
  - ./README.md
  - ./deterministic-story-orchestration/README.md
  - ./deterministic-story-orchestration/next-design-decisions.md
  - ./reviews/README.md
---

# Jig Stage 2 verified checkpoint and execution plan

## Status and use

This document is the durable continuation point for Stage 2 planning. It records the completed
read-only orientation, the source baseline against which that orientation was verified, and the
proposed execution plan for creating Jig's decision-complete architecture.

It is a planning artifact, not architecture. It selects no component model, port set, state
machine, contract, algorithm, technology, provider, or implementation shape. Stage 2 has not
started, and no canonical Stage 2 artifact exists yet.

The owner acknowledged the Step 0 orientation on 2026-07-14 and requested this durable plan. The
next hard gate is **G0 — owner approval of this execution plan and its write scope**. Do not create
or change canonical artifacts under `design/` before G0.

## Continuation and freshness contract

A later session may use this checkpoint instead of repeating the complete orientation sweep when
all of the following remain true:

1. It reads the repository `AGENTS.md`, `docs/redesign/AGENTS.md`, and this document.
2. It verifies the required worktree, branch, `HEAD`, merge base, and working-tree status.
3. The governing and locked source files have no changes relative to `source_baseline`:
   - `docs/redesign/GOAL.md`;
   - `docs/redesign/guidelines/README.md`;
   - `docs/redesign/guidelines/02-detailed-architecture.md`;
   - `docs/redesign/design/README.md`; and
   - `docs/redesign/design/decisions.md`.
4. The immutable proposal and review files relevant to the next phase have not changed relative to
   the baseline.
5. This plan still names the current completed phase and owner gate.

If `HEAD` changes but the listed sources do not, record the new repository state and continue
without rereading unchanged proposal or review material. If a listed source changes, reread only
the changed source and its directly affected phase packet, update this checkpoint, and repeat the
affected review. A changed locked decision, authority rule, invariant, or source boundary stops
execution pending owner direction.

Every continuation reads the current proposed Stage 2 artifacts and the last accepted decision
packet. It does not reconstruct prior decisions from chat history or agent memory.

## Verified Step 0 checkpoint

### Repository and initiative state

Verified on 2026-07-14:

| Item                            | Verified value                                                                                              |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Worktree                        | `/Users/aryekogan/repos/agentic-workflow-kit/worktrees/jig/docs-deterministic-story-orchestration-proposal` |
| Branch                          | `docs/deterministic-story-orchestration-proposal`                                                           |
| Source baseline `HEAD`          | `e5b50ca63be5cde8ff67d68a7010f9e13459c6d6`                                                                  |
| Baseline latest commit          | `e5b50ca docs: reconcile redesign stage status`                                                             |
| Stage 1 lock commit             | `dce91c5359df37e378f1575282658a1fa3b04341`                                                                  |
| Merge base with `main`          | `521ae0846e788ef91979dd4c273687ab22e6137e`                                                                  |
| Branch commits after merge base | 13                                                                                                          |
| Baseline working tree           | Clean                                                                                                       |
| Documentation links             | Passed; 235 Markdown files scanned                                                                          |
| Layer 0                         | Approved                                                                                                    |
| Stage 1                         | Approved and locked                                                                                         |
| Stage 2                         | Not started                                                                                                 |

The Stage 1 lock commit changes only `design/README.md` and `design/decisions.md`.

### Authority and source precedence

Authority descends in this order:

1. `GOAL.md` and explicit owner decisions;
2. the approved and locked Stage 1 architecture and decision record; and
3. the future explicitly approved Stage 2 architecture.

The guidelines define method but select no architecture. The immutable standalone proposal is
directional material. Its immutable reviews are adversarial evidence. Neither overrides the
locked foundation. A named product document remains non-binding Product Reference unless the
owner explicitly imports an exact promise or constraint with provenance, rationale,
consequences, and affected decisions. Other repository design, ADR, delivery, runtime, package,
source, and test material remains excluded unless the owner explicitly expands scope.

### Locked decisions

| ID  | Locked direction                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------- |
| D1  | Product reference on demand, with explicit owner import required for a governing promise or constraint.          |
| D2  | Jig owns the authority-and-proof boundary.                                                                       |
| D3  | Jig Control is the sole routine lifecycle authority; judgment, attestation, and mechanisms retain scoped powers. |
| D4  | Recoverable hierarchical lifecycle with business outcome separated from retirement.                              |
| D5  | Durable ordered transition ledger is authoritative; live state is reconstructable.                               |
| D6  | Resource-class capacity, immutable total ordering, and one target-scoped finalization authority.                 |
| D7  | Reviewer-principal exact-candidate acceptance with policy-selected final verification.                           |
| D8  | Smallest-scope fail-closed containment, bounded progress, reconciliation, and durable escalation.                |
| D9  | Twenty-one locked invariants, canonical Stage 2 deferrals, and a two-artifact Stage 1 foundation.                |

### Invariant coverage

All 21 locked invariants map to at least one Layer 2 question, and every Layer 2 question is
constrained by at least one invariant:

- **I1–I3 — authority:** owner authority and explicit import; Jig's authority-and-proof boundary;
  sole routine lifecycle authority in Jig Control.
- **I4–I7 — deterministic truth:** deterministic decisions from ordered triggers;
  ledger-before-adopt/dispatch; recovery and fencing before resume; exact-subject binding.
- **I8–I9 — acceptance:** reviewer full-package approval remains the acceptance gate; frozen
  policy alone selects final verification.
- **I10–I14 — concurrency and outcomes:** resource-class capacity; immutable total comparator; one
  finalizer; confirmed-landing-only dependency release; durable, canonically ordered blocker roots.
- **I15–I17 — failure and effects:** smallest-safe-scope fail-closed behavior; bounded progress
  with explicit exhaustion; no second semantic effect before absence or reconciliation.
- **I18–I21 — retirement and governance:** outcome/retirement separation; preservation before
  destruction and durable residual obligations; no autonomous guarantee after trust-root
  compromise; architecture approval remains distinct from implementation and current truth.

No invariant is orphaned. No current evidence requires reopening Stage 1.

### Canonical Stage 2 obligation inventory

Stage 2 must close the ten Layer 2 questions and the consolidated deferrals:

1. responsibility decomposition;
2. semantic contracts, ports, and authority checks;
3. states, transitions, triggers, guards, and outcomes;
4. ownership of data, identity, ordering, time, correlation, and persistence;
5. operation and result semantics, including uncertain effects;
6. scheduling, concurrency, locking, capacity, and backpressure;
7. retry, timeout, cancellation, liveness, and escalation;
8. idempotency, reconciliation, recovery, and no-double-effect behavior;
9. credentials, sensitive data, delegation, and trust enforcement; and
10. observability, audit, verification, and conformance evidence.

The canonical deferrals additionally require explicit treatment of decomposition; semantic
schemas and catalogs; bounded algorithms; ledger, projection, fence, and recovery responsibilities;
provider effect reconciliation; evidence protection; reviewer and remote-gate protocols;
repository and landing semantics; security enforcement; operator views; and conformance suites.
Field-level serialization and implementation mechanics remain later-layer concerns unless field
identity or compatibility is itself architectural.

### Relevant proposal and review packets

Use only the packet applicable to the active phase:

| Decision area                           | Directional proposal slices                                                                              | Adversarial review IDs                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Traceability and canonical model        | Proposal overview, proposal invariants, `next-design-decisions.md`                                       | DSO-8, DSO-11, DSO-12, CX-DSO-5                                 |
| Responsibilities and boundaries         | `inputs.md`, `orchestration.md`, `ports.md`                                                              | DSO-6, DSO-9, DSO-10, DSO-13, CX-DSO-3, CX-RISK-1               |
| Contracts, state, identity, persistence | `events-and-runtime-state.md`, `live-state.md`, `operations-and-results.md`, `evidence-and-artifacts.md` | DSO-6, DSO-8, DSO-11, DSO-12, CX-DSO-1, CX-DSO-2, CX-DSO-5      |
| Critical behavior and concurrency       | `story-execution.md`, `delivery-and-operations.md`, orchestration flows                                  | DSO-1, DSO-3–5, DSO-9, DSO-13–14, CX-DSO-2, CX-DSO-5, CX-RISK-1 |
| Failure, recovery, liveness             | Failure sections across next decisions, operations, events, story, and delivery                          | DSO-1–2, DSO-4–5, DSO-7, DSO-11, CX-DSO-1–2, CX-RISK-2          |
| Trust, security, credentials            | Input configuration, ports, trusted envelopes, evidence access and redaction                             | DSO-6, DSO-10, CX-DSO-3–4                                       |
| Observability and conformance           | Event catalog, evidence/artifact model, read-model and testing proposals                                 | DSO-10–12, CX-DSO-1, CX-DSO-4–5, CX-RISK-2                      |
| Integrated consistency                  | All connected slices, especially competing lifecycle and state views                                     | DSO-8 plus all overlap families                                 |

The 21 review IDs reduce to nine shared decision families: lease/finalization, capacity,
lifecycle/retirement, identity/reconciliation, bounded liveness, ledger observability,
evidence/trust, deterministic attribution, and delivery effects. Preserve every provenance ID but
do not count overlapping findings as independent architecture obligations.

Two Codex review findings cite older product or ADR contracts. Those outside sources were not
imported into this initiative. Their failure scenarios remain useful, but their legacy requirements
are non-binding unless the owner explicitly imports them.

### Step 0 conclusions

- The locked foundation is internally coherent.
- Every locked decision and invariant has a Layer 2 destination.
- All ten Layer 2 questions remain intentionally open at mechanism level.
- The proposal's in-memory-only authority, story-count-only capacity, and terminal `Blocked`
  posture are superseded and cannot be adopted unchanged.
- No current Stage 1 reopen is required.
- `docs/redesign/` is sufficient for planning and initial execution. A future need for outside
  material must be raised as a named scope-expansion request.

## Execution boundaries

- **Required worktree:**
  `/Users/aryekogan/repos/agentic-workflow-kit/worktrees/jig/docs-deterministic-story-orchestration-proposal`.
- **Before G0:** only this planning artifact and its workspace index link may change.
- **After G0:** canonical Stage 2 writes are confined to the proposed artifacts under
  `docs/redesign/design/`, plus minimal navigation and status links required to keep the connected
  set discoverable.
- Keep every Stage 2 architecture artifact `proposed` until D6 records final owner approval.
- Preserve the locked Stage 1 text and invariants. A minimal navigation-only update does not alter
  the lock; any semantic revision requires an explicit reopen.
- Never edit the standalone proposal or either independent review.
- Do not read outside the approved source boundary without explicit owner expansion.
- Do not enter implementation, migration, delivery sequencing, estimation, story breakdown, PR
  planning, or current-state publication.
- Run only relevant Markdown formatting and `corepack pnpm links:check` for redesign-document
  changes. Do not run the full code gate.
- Do not commit, push, open a PR, or change remote state without explicit user instruction.

## Proposed smallest connected artifact set

Stage 2 should begin with exactly two new canonical artifacts:

1. **`design/detailed-architecture.md`** — the canonical Layer 2 model, traceability frame,
   responsibility and authority decomposition, semantic contracts, state and data ownership,
   critical behavior, failure/recovery, trust, evidence, and conformance views.
2. **`design/detailed-decisions.md`** — alternatives, owner selections, rationale, consequences,
   rejected options, explicit deferrals, review findings and resolutions, decision packets, and
   the final approval record.

The existing locked `design/README.md` and `design/decisions.md` remain the Stage 1 input contract.
At final integration, add only the navigation and status links needed to connect the approved
Stage 2 set; do not rewrite the locked Stage 1 content.

Do not create a separate file per perspective. Embed selective views in the two artifacts. Extract
another artifact only if independent review demonstrates that a named reader question cannot be
answered clearly without it, and record that artifact-shape decision before extraction.

## Stage 1-to-Stage 2 traceability

| Locked source                            | Primary Layer 2 questions | Owning phases  | Required closure evidence                                                   |
| ---------------------------------------- | ------------------------- | -------------- | --------------------------------------------------------------------------- |
| D1 — source scope and vocabulary         | Q2, Q9, Q10               | P0, P1, P5, P7 | Canonical source roles, explicit-import path, no silent legacy constraint   |
| D2 — authority-and-proof boundary        | Q1, Q2, Q9, Q10           | P1, P2, P5, P6 | Responsibility map, semantic boundaries, enforceable proof ownership        |
| D3 — centralized deterministic authority | Q1, Q2, Q5, Q9            | P1, P2, P5     | Power matrix, authority checks, validated collaboration and delegation      |
| D4 — lifecycle and outcome/retirement    | Q3, Q4, Q5, Q7, Q8        | P2, P3, P4     | One canonical lifecycle, legal transitions, separate outcome and retirement |
| D5 — durable ordered ledger              | Q3, Q4, Q5, Q8, Q10       | P2, P4, P6     | Conditional commit, reconstruction, fencing, reconciliation, audit proof    |
| D6 — capacity, ordering, finalization    | Q3, Q4, Q6, Q7, Q8        | P2, P3, P4     | Resource ownership, total order, progress reserve, finalization authority   |
| D7 — reviewer-principal acceptance       | Q2, Q5, Q9, Q10           | P2, P3, P5, P6 | Exact-subject verdict, evidence authority, policy-selected verification     |
| D8 — failure and bounded liveness        | Q3, Q5, Q7, Q8, Q9, Q10   | P3, P4, P5, P6 | Fault scopes, bounds, wake conditions, exhaustion, residual obligations     |
| D9 — invariants and Layer 2 boundary     | All, especially Q10       | P0, P6, P7     | Complete invariant matrix, minimal artifacts, closed decision inventory     |
| I1–I3 — authority cluster                | Q1, Q2, Q9, Q10           | P0, P1, P5     | No authority drift or implicit import                                       |
| I4–I7 — deterministic truth cluster      | Q3, Q4, Q5, Q8, Q10       | P2, P4, P6     | Deterministic transition, ledger, recovery, and exact binding proof         |
| I8–I9 — acceptance cluster               | Q2, Q5, Q10               | P2, P3, P6     | Reviewer authority and verification policy remain intact                    |
| I10–I14 — concurrency/outcome cluster    | Q3, Q4, Q6, Q7, Q10       | P3, P4, P6     | Capacity, order, finalization, landing, and blocker consistency             |
| I15–I17 — failure/effect cluster         | Q5, Q7, Q8, Q9            | P4, P5, P6     | Fail-closed containment, bounded progress, no-double-effect proof           |
| I18–I21 — retirement/governance cluster  | Q3, Q4, Q7, Q8, Q10       | P3, P4, P6, P7 | Preservation, residual accountability, compromise stop, approval separation |

P0 must expand this summary into item-level traceability covering every individual invariant and
canonical deferral before any architecture selection.

## Dependency DAG

The route is deliberately sequential at decision boundaries because each later phase consumes the
canonical identities and owner decisions of earlier phases. Reviews may run independently, but
decision-bearing author lanes must not create competing models in parallel.

```text
G0  Owner approves plan and write scope
 |
P0  Obligation and traceability frame
 |
D0  Source, vocabulary, conflict, or reopen decisions
 |
P1  Responsibility decomposition and semantic boundaries
 |
D1  Responsibility and authority decisions
 |
P2  Contracts, state, data, identity, and persistence
 |
D2  Contract, state, and ownership decisions
 |
P3  Critical behavior and concurrency
 |
P4  Failure, recovery, and liveness
 |
D3  Coupled behavior, concurrency, failure, and liveness decisions
 |
P5  Trust, security, and credentials
 |
D4  Trust, delegation, and risk decisions
 |
P6  Observability, audit, verification, and conformance
 |
D5  Evidence and conformance decisions
 |
P7  Integrated consistency review and approval packet
 |
D6  Final owner approval or return for revision
```

Additional dependency edges are mandatory:

- P4 consumes both P2 and P3.
- P5 consumes P1 through P4 and D3.
- P6 consumes P2 through P5 and D4.
- P7 consumes every completed phase, every accepted decision packet, and the closed review register.

## Execution phases

Every phase uses the same internal cycle: frame the question, present two or three material
alternatives where a real choice exists, obtain the required owner decision, author the smallest
coherent increment, run independent review, fix material findings, re-review, record the accepted
packet, and stop at the named condition.

### P0 — Obligation and traceability frame

- **Architectural question:** What exactly must Stage 2 close, under which vocabulary, owner, source
  role, invariant, and completion test?
- **Why first:** Every later model and view needs one identity set and a complete obligation ledger;
  otherwise parallel artifacts can silently invent scope or omit a locked constraint.
- **Locked inputs:** D1–D9, I1–I21, the canonical deferrals, and all ten Layer 2 questions.
- **Decisions to close:** canonical terms and identities; obligation owner; affected Layer 2
  question; source and review provenance; conflict status; closure evidence; genuine unknowns; and
  explicit reopen criteria.
- **Dependencies:** G0 only.
- **Relevant slices:** proposal overview and next decisions; review registers and overlap families.
- **Durable output:** item-level traceability and vocabulary sections in
  `detailed-architecture.md`; source/conflict/decision packet in `detailed-decisions.md`.
- **Owner gate:** D0 closes any material source import, vocabulary conflict, scope expansion, or
  apparent reopen. If none exists, record that no owner selection was required.
- **Author/reviewer:** coordinator plus primary author; independent architecture reviewer verifies
  completeness and source precedence.
- **Review axes and failure scenarios:** layer-boundary fidelity, missing invariant, duplicate
  authority identity, proposal treated as approved, review fix treated as architecture, or legacy
  requirement imported silently.
- **Completion evidence:** every D, invariant, deferral, question, and relevant finding has an owner
  and destination; no orphan or unexplained duplicate remains.
- **Stop condition:** stop immediately on a source conflict, outside-material need, or possible
  Stage 1 reopen.
- **Deferred:** all component, contract, state, algorithm, security-mechanism, and implementation
  choices.

### P1 — Responsibility decomposition and semantic boundaries

- **Architectural question:** How is Jig's locked authority-and-proof responsibility decomposed
  without redistributing authority or choosing implementation packaging?
- **Why here:** Contracts, state, flows, and recovery require stable responsibility owners and
  collaboration direction.
- **Locked inputs:** D2, D3, D7; I2, I3, I7–I9; the P0 vocabulary and obligation ledger.
- **Decisions to close:** cohesive responsibilities; collaboration direction; decision, judgment,
  observation, attestation, record, and reconcile ownership; semantic boundaries; authority
  checks; trusted composition responsibilities; and external mechanism roles.
- **Dependencies:** P0 and D0.
- **Relevant slices:** proposal inputs, orchestration responsibilities, and port-boundary drafts;
  DSO-6, DSO-9, DSO-10, DSO-13, CX-DSO-3, and CX-RISK-1.
- **Durable output:** responsibility/component view, power matrix, and semantic-boundary catalog in
  `detailed-architecture.md`; alternatives and owner decisions in `detailed-decisions.md`.
- **Owner gate:** D1 selects material responsibility or authority-boundary alternatives.
- **Author/reviewer:** primary author; independent architecture reviewer. No parallel
  decision-bearing author lane.
- **Review axes and failure scenarios:** split lifecycle authority, broad provider interface that
  widens power, missing proof owner, mechanism self-promotion, undeclared observer control path,
  or legacy provider seam treated as governing.
- **Completion evidence:** every locked power and responsibility has one canonical owner and every
  cross-boundary relationship has a named intent and authority check.
- **Stop condition:** stop if a coherent decomposition requires moving a locked power or changing
  Jig's authority-and-proof boundary.
- **Deferred:** port count, packages, processes, deployment, provider APIs, transports, and concrete
  credentials.

### P2 — Contracts, state, data, identity, and persistence

- **Architectural question:** What semantic facts and operations cross each boundary, and who owns
  their identity, state, ordering, time, correlation, persistence, and validity?
- **Why here:** Critical flows and failure semantics cannot be deterministic until their subjects,
  operations, states, and durable authority are defined consistently.
- **Locked inputs:** D4, D5, D7; I4–I9, I11, I14, I17, I19; P1 owners and boundaries.
- **Decisions to close:** semantic inputs, outputs, operations, results, errors, states,
  transitions, guards, terminal outcomes, exact-subject identity, transition and operation
  correlation, time ownership, data ownership, conditional ledger commit, reconstructable
  projections, fences, and durable-record responsibilities.
- **Dependencies:** P1 and D1.
- **Relevant slices:** proposal events/runtime state, live state, operations/results, and
  evidence/artifacts; DSO-6, DSO-8, DSO-11, DSO-12, CX-DSO-1, CX-DSO-2, and CX-DSO-5.
- **Durable output:** semantic contract catalog, canonical state model, transition table, identity
  map, data-ownership view, and persistence rules in `detailed-architecture.md`; material choices in
  `detailed-decisions.md`.
- **Owner gate:** D2 selects material contract, state, durable-authority, and ownership alternatives.
- **Author/reviewer:** primary author; independent architecture reviewer with ledger and identity
  emphasis.
- **Review axes and failure scenarios:** two state authorities, commit-unknown split brain,
  post-transition ID mutation, stale subject acceptance, ambiguous preflight/run identity,
  inconsistent target observation, or artifact acting as a hidden control message.
- **Completion evidence:** every transition and operation has a responsible owner, exact subject,
  durable correlation, legal source state, result semantics, and reconstruction path.
- **Stop condition:** stop if closure requires abandoning the ordered ledger, reconstructability,
  exact binding, or outcome/retirement separation.
- **Deferred:** field serialization, storage product, table/index layout, wire compatibility,
  generated schemas, and source interfaces.

### P3 — Critical behavior and concurrency

- **Architectural question:** How do the canonical responsibilities and contracts behave through
  success, rejection, review/rework, finalization, landing, dependency release, and retirement
  under constrained concurrency?
- **Why here:** Critical flows test the P1/P2 structural model before failure and recovery add more
  branches.
- **Locked inputs:** D4, D6, D7; I8–I14, I18, I19; accepted P1/P2 packets.
- **Decisions to close:** eligibility, admission, resource ownership, progress reserve, total
  ordering, implementation and review rounds, acceptance invalidation, finalization acquisition
  and release, target refresh and authority rebinding, final verification, remote gates, landing
  proof, dependency release, blocking attribution, retirement, locking, and backpressure.
- **Dependencies:** P2 and D2.
- **Relevant slices:** proposal story execution, delivery/operations, and orchestration flows;
  DSO-1, DSO-3–5, DSO-9, DSO-13–14, CX-DSO-2, CX-DSO-5, and CX-RISK-1.
- **Durable output:** critical flow views, concurrency/resource table, finalization authority view,
  and landing/retirement flow in `detailed-architecture.md`; alternatives in
  `detailed-decisions.md`.
- **Owner gate:** material alternatives are held for the coupled D3 packet after P4 unless one must
  be selected before failure analysis can proceed.
- **Author/reviewer:** primary author; independent architecture reviewer focused on ordering,
  state legality, exact binding, and progress.
- **Review axes and failure scenarios:** equal-priority nondeterminism, retained-session deadlock,
  lease starvation, candidate-changing refresh under stale authority, target observation race,
  landing inferred from delivery success, cleanup delaying dependency release, or incomplete
  blocker roots.
- **Completion evidence:** each critical flow uses the P2 identities and transitions, names every
  authority transfer, and preserves a progress path for admitted work.
- **Stop condition:** stop if a flow requires a second lifecycle model or weakens serialized
  finalization, landing proof, reviewer acceptance, or resource-class capacity.
- **Deferred:** queue data structures, scheduling code, forge API calls, merge implementation,
  commands, and deployment topology.

### P4 — Failure, recovery, and liveness

- **Architectural question:** How does every material operation fail, wait, retry, cancel,
  reconcile, recover, exhaust, escalate, and retire without double effects or unnamed hangs?
- **Why here:** Failure semantics require the accepted structural, contract, state, and critical
  behavior model; they must close before trust and proof obligations can be complete.
- **Locked inputs:** D4, D5, D6, D8; I5, I6, I10, I15–I20; P2 and P3 outputs.
- **Decisions to close:** fault scope; stable failure taxonomy; retry/rework/refresh bounds;
  timeout and cancellation; clock and wake ownership; wait reasons and budgets; uncertain commit
  and effect reconciliation; same-operation redispatch versus new semantic attempt; controller and
  lease recovery; session replacement; residual obligations; escalation; liveness assumptions;
  and explicit exhaustion actions.
- **Dependencies:** P2 and P3.
- **Relevant slices:** failure and liveness sections across proposal next decisions, events,
  operations/results, story execution, and delivery; DSO-1–2, DSO-4–5, DSO-7, DSO-11,
  CX-DSO-1–2, and CX-RISK-2.
- **Durable output:** failure matrix, bounded-progress table, recovery and reconciliation flows,
  cancellation/wait semantics, and liveness statement in `detailed-architecture.md`; coupled
  alternatives in `detailed-decisions.md`.
- **Owner gate:** D3 selects material behavior, concurrency, failure, risk, and liveness alternatives.
- **Author/reviewer:** primary author; independent architecture reviewer focused on fault domains,
  reconciliation, and liveness.
- **Review axes and failure scenarios:** lost append acknowledgement, uncertain remote mutation,
  missing wake trigger, unbounded verification loop, stale controller, duplicate effect, shared
  trust failure misclassified as story failure, or cleanup ending without preservation.
- **Completion evidence:** every retry, rework, refresh, wait, recovery, and retirement path has an
  owner, durable reason, wake/completion condition, bound, next action, and exhaustion action.
- **Stop condition:** stop if safety depends on blind replay, missing proof, indefinite waiting, or
  an owner decision being treated as a fabricated external fact.
- **Deferred:** backoff code, timer implementation, provider endpoints, operational runbooks,
  concrete alerts, and service deployment.

### P5 — Trust, security, and credentials

- **Architectural question:** How are locked authority, delegation, credentials, sensitive data,
  integrity, capability, confinement, and compromise boundaries enforced across the established
  model?
- **Why here:** Trust analysis needs stable responsibilities, contracts, behavior, and recovery;
  doing it earlier would invent a parallel model, while doing it later could leave authority
  unenforceable.
- **Locked inputs:** D1–D3, D5, D7, D8; I1–I3, I6–I9, I15, I20; P1–P4 outputs.
- **Decisions to close:** identity and delegation scope; credential resolution and lifecycle;
  least-authority capability binding; workspace, verification, delivery, storage, and agent
  boundaries; sensitive-data handling; artifact integrity and access; sandbox/network posture;
  compromised-participant containment; trust-root failure; and externally governed recovery.
- **Dependencies:** P1–P4 and D3.
- **Relevant slices:** proposal configuration, ports, trusted envelopes, evidence access and
  redaction; DSO-6, DSO-10, CX-DSO-3, and CX-DSO-4. Treat the latter reviews' legacy contracts as
  non-binding unless explicitly imported.
- **Durable output:** trust and authority view, credential/delegation lifecycle, sensitive-data
  rules, compromise matrix, and enforcement obligations in `detailed-architecture.md`; material
  alternatives in `detailed-decisions.md`.
- **Owner gate:** D4 selects material delegation, credential, confinement, compromise, or
  risk-bearing alternatives and any explicit external import.
- **Author/reviewer:** primary author; independent architecture reviewer; separate frontier
  security reviewer.
- **Review axes and failure scenarios:** worker self-assertion becoming authority, adapter power
  widening, credential leakage, spoofed producer identity, untrusted evidence satisfying a gate,
  undeclared network action, compromised ledger/controller, or an implicit legacy guarantee.
- **Completion evidence:** every authority and credential path is enforceable, scoped, auditable,
  revocable or exhaustible where applicable, and mapped to a compromise response.
- **Stop condition:** stop if a security choice changes a locked principal, trust root, acceptance
  model, or source boundary.
- **Deferred:** secret-store vendor, sandbox product, network implementation, encryption library,
  and deployment-specific policy syntax.

### P6 — Observability, audit, verification, and conformance

- **Architectural question:** What durable evidence must prove every promised architecture behavior
  without creating another control authority?
- **Why here:** Proof obligations derive from the complete structural, behavioral, failure, and
  trust model.
- **Locked inputs:** D2, D5, D7–D9; I1, I2, I4, I7–I9, I13, I14, I16, I19–I21; P2–P5 outputs.
- **Decisions to close:** authoritative ledger facts; operation and transition evidence; acceptance
  and evidence integrity; finalization, landing, blocker, preservation, recovery, and residual
  proof; read models; audit consumers; metrics semantics; observer non-authority; and architecture
  conformance obligations.
- **Dependencies:** P2–P5 and D4.
- **Relevant slices:** proposal event catalog, evidence/artifact model, read-model direction, and
  conformance agenda; DSO-10–12, CX-DSO-1, CX-DSO-4–5, and CX-RISK-2.
- **Durable output:** proof-obligation matrix, audit/read-model rules, evidence lifecycle, and
  conformance catalog in `detailed-architecture.md`; alternatives in `detailed-decisions.md`.
- **Owner gate:** D5 selects material assurance, retention, audit, and conformance alternatives.
- **Author/reviewer:** primary author; independent architecture reviewer; security reviewer checks
  evidence access and integrity consequences.
- **Review axes and failure scenarios:** missing lease facts, ambiguous initialization order,
  observer becoming control state, evidence digest without trustworthy provenance, landing without
  target proof, expired evidence silently treated as present, or untestable conformance language.
- **Completion evidence:** every locked promise and material transition has a named proof producer,
  exact subject, durable record or reference, consumer, retention need, and testable conformance
  obligation.
- **Stop condition:** stop if proof requires rejudging reviewer sufficiency, weakening exact
  binding, or importing implementation test plans into Layer 2.
- **Deferred:** concrete test framework, telemetry backend, metric transport, dashboard layout,
  storage tiers, and operational alert thresholds.

### P7 — Integrated consistency review and final approval packet

- **Architectural question:** Does the complete proposed Stage 2 set form one decision-complete,
  internally coherent architecture compatible with every locked decision and invariant?
- **Why last:** Only the connected set can expose cross-view identity, authority, state, failure,
  security, and proof contradictions.
- **Locked inputs:** D1–D9, I1–I21, all accepted decision packets, and the Layer 2 approval gate.
- **Decisions to close:** no new architecture should be invented here; resolve review findings,
  classify every remaining item as closed or explicitly out of scope, and assemble the owner
  approval record.
- **Dependencies:** P0–P6 and D5.
- **Relevant slices:** the complete locked foundation and only the proposal/review citations already
  used by the proposed Stage 2 set.
- **Durable output:** consolidated traceability, closed review register, accepted negative
  consequences, explicit implementation deferrals, and proposed approval record across the two
  Stage 2 artifacts.
- **Owner gate:** D6 grants or withholds final Stage 2 approval. Approval must be explicit and then
  durably recorded; silence is not approval.
- **Author/reviewer:** coordinator performs the join; a frontier integrated reviewer independent of
  the primary author performs final review; the primary author fixes findings and the reviewer
  re-reviews them.
- **Review axes and failure scenarios:** Layer-boundary fidelity; all locked invariants; canonical
  identity and authority; structural/behavioral consistency; state completeness; data ownership;
  ordering and finalization; failure and liveness; reconciliation; trust and credentials;
  reviewer acceptance; landing and dependency release; observability; artifact minimality; and
  absence of Layer 3 leakage.
- **Completion evidence:** all material decisions closed or explicitly out of scope; no unresolved
  material review finding; every artifact uses the same identities and rules; conformance is
  testable; documentation checks pass; and the final owner packet states consequences and
  deferrals.
- **Stop condition:** stop at D6. Do not enter Layer 3 implementation or operations.
- **Deferred:** every implementation, deployment, migration, rollout, estimate, story, PR, and
  current-state choice.

## Owner-decision schedule

At each gate, present two or three genuine alternatives when they exist, lead with a recommendation,
and state consequences. Do not manufacture alternatives for a settled locked rule.

| Gate | Timing                             | Owner decision                                                                                                                                             |
| ---- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G0   | Before any canonical Stage 2 write | Approve or revise this plan, two-artifact set, source boundary, agent/review policy, and write scope.                                                      |
| D0   | After P0                           | Resolve any source import, vocabulary conflict, obligation ownership, scope expansion, or apparent reopen. Record `no decision required` when none exists. |
| D1   | After P1                           | Select material responsibility, collaboration, semantic-boundary, and authority-check alternatives.                                                        |
| D2   | After P2                           | Select material contract, state, identity, durable-authority, and ownership alternatives.                                                                  |
| D3   | After P4                           | Select coupled lifecycle, concurrency, finalization, retry, recovery, and liveness alternatives.                                                           |
| D4   | After P5                           | Select material delegation, credential, confinement, compromise, risk, or explicit-import alternatives.                                                    |
| D5   | After P6                           | Select material evidence, retention, audit, observability, verification, and conformance alternatives.                                                     |
| D6   | After P7                           | Approve and lock the complete Stage 2 foundation or return named issues for revision.                                                                      |

If a phase exposes a choice that changes the inputs of its next phase, stop at its gate. Minor
clarifications that do not select architecture may be recorded and reviewed without interrupting
the owner, but must remain visible in the next decision packet.

## Agent roster and dispatch policy

Use the fewest agents that preserve coherence and independent review. Keep one primary author
sequential across decision-bearing phases; do not fan out competing architecture authors. Model
availability must be verified at dispatch time.

| Role                                     | Class / model / effort                     | Exact scope and dependencies                                                                                                            | Output and review contract                                                                                                           | Hard budget per dispatch              |
| ---------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| C — coordinator and traceability steward | strong-coder / `gpt-5.6-terra` / high      | Source freshness, phase framing, producer-packet joins, owner gates, scope and invariant enforcement; depends on accepted prior packets | Verified phase packet, gate record, open-item status, and final diff/check evidence; cannot select owner decisions                   | 30 minutes, 20k tokens, 30 tool calls |
| A — primary architecture author          | strong-coder / `gpt-5.6-terra` / high      | One coherent P0–P6 increment at a time; consumes only coordinator-verified prior packets                                                | Alternatives plus proposed edits to the two Stage 2 artifacts; self-checks all affected decisions/invariants; no commit, push, or PR | 45 minutes, 24k tokens, 40 tool calls |
| R — independent phase reviewer           | frontier-reviewer / `gpt-5.6-terra` / high | Read-only review after each author increment; consumes the phase contract and exact diff                                                | Finding register with evidence, invariant impact, sibling-occurrence check, and pass/revise verdict; re-reviews material fixes       | 25 minutes, 14k tokens, 24 tool calls |
| S — trust and security reviewer          | frontier-reviewer / `gpt-5.6-terra` / high | P5 and security-sensitive P6 portions after the general phase review                                                                    | Threat, authority, credential, integrity, compromise, and conformance findings; distinguishes non-binding legacy references          | 30 minutes, 16k tokens, 28 tool calls |
| I — integrated consistency reviewer      | frontier-reviewer / `gpt-5.6-terra` / high | Read-only P7 review of the complete connected set after all prior findings close                                                        | Final consistency verdict, residual scope list, approval blockers, and re-review of final fixes                                      | 35 minutes, 20k tokens, 32 tool calls |

`gpt-5.6-sol` is not planned: this is consequential architecture review but not release-critical
qualification. A different model requires an updated routing justification before dispatch.

Every agent prompt must include the worktree, phase ID, exact read/write scope, verified dependency
packet, expected output, verification, hard budget, and an instruction not to commit, push, open a
PR, or widen the source boundary.

## Join and review strategy

1. The coordinator verifies live state and the active source packet before every phase.
2. The author receives only accepted prior decisions, canonical identities, unresolved questions,
   relevant proposal slices, and relevant review findings.
3. The coordinator inspects the author increment before independent review; a dependent phase does
   not start from unchecked output.
4. The reviewer returns evidence-linked findings classified as material, non-material, reopen risk,
   source-scope risk, or Layer 3 leakage.
5. The author fixes every material finding and searches for sibling occurrences of the same issue.
   The same reviewer verifies the fix and sibling search.
6. The coordinator resolves source conflicts by authority precedence, never by vote between agents.
   A genuine architecture alternative goes to the owner gate.
7. The accepted producer packet records canonical identities, decisions, consequences, open items,
   citations, completed verification, and the exact next-phase input.
8. Run relevant Markdown formatting and the documentation-link check after each coherent phase
   increment. Green checks prove document integrity, not architecture approval.
9. P7 performs a new integrated review rather than concatenating phase verdicts.

## Risk register

| Risk                                              | Early signal                                                                                                                                                 | Mitigation and stop rule                                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accidental Stage 1 reopening                      | A proposed detail changes a locked boundary, authority owner, lifecycle, persistence posture, acceptance model, concurrency rule, landing rule, or invariant | Trace every decision to D1–D9/I1–I21; stop and issue a reopen impact packet before proceeding.                                                              |
| Premature Layer 3 detail                          | Packages, classes, concrete APIs, field lists, vendors, commands, deployment, estimates, or PRs appear as closure                                            | Apply the Layer 2 altitude checklist in every phase review; remove or explicitly defer the detail.                                                          |
| Parallel artifacts invent inconsistent identities | Two names, owners, states, or authority rules describe the same fact                                                                                         | One sequential primary author, canonical P0 vocabulary, two-artifact set, and integrated identity review.                                                   |
| Hidden provider or technology commitment          | A proposal port, legacy seam, vendor capability, or provider object is treated as required architecture                                                      | Express semantic responsibility and capability first; label directional and legacy evidence; require explicit owner import for governing external promises. |
| Unbounded failure semantics                       | A retry, wait, refresh, recovery, or retirement path lacks owner, wake condition, bound, or exhaustion                                                       | P4 bounded-progress matrix is mandatory; no path advances to P5 while any cell is missing.                                                                  |
| Evidence or authority gap                         | A transition advances from self-assertion, missing exact-subject proof, or an observer with undeclared control power                                         | P1 power matrix, P5 trust review, and P6 proof matrix must agree; fail closed and return to the owning phase.                                               |
| Source drift makes this checkpoint stale          | Governing or locked files differ from the recorded baseline                                                                                                  | Targeted freshness audit; reread and re-review only affected packets; stop on changed authority or invariant.                                               |
| Legacy review material leaks into authority       | CX-DSO-3 or CX-DSO-4 is used to import an old product/ADR requirement silently                                                                               | Preserve the failure scenario, discard non-imported authority claims, and request an explicit owner import if desired.                                      |
| Artifact sprawl                                   | A new file or diagram lacks a unique reader question or duplicates a model                                                                                   | Keep the two-artifact set; extract only after evidence-backed review and a recorded artifact-shape decision.                                                |
| Context loss across sessions or agents            | A consumer depends on chat history or a vague reference to prior work                                                                                        | Persist accepted decision packets and phase status in the two artifacts; pass explicit verified producer packets.                                           |
| Owner-decision fatigue                            | Minor wording questions are escalated as architecture gates                                                                                                  | Escalate only material alternatives or boundary/reopen decisions; record non-material clarifications for the next scheduled packet.                         |

## Verification and completion conditions

The execution plan is complete when it is owner-approved at G0. Stage 2 is complete only when:

- every D1–D9 responsibility, I1–I21 invariant, canonical deferral, Layer 2 question, and relevant
  review finding is closed or explicitly out of scope;
- the two proposed artifacts form one canonical model with selective views;
- every material phase finding and its sibling occurrences are fixed and independently re-reviewed;
- the integrated review reports no unresolved material contradiction or Layer 3 leakage;
- relevant Markdown formatting and `corepack pnpm links:check` pass;
- the owner explicitly approves the complete Stage 2 foundation and the approval is durably
  recorded; and
- work stops before Layer 3.

## Current stop

This planning document and its workspace index link are the only authorized changes from this
planning turn. No file under `docs/redesign/design/` has been created or edited. No architecture
decision has been selected.

**Awaiting G0 owner approval before beginning P0 or creating Stage 2 architecture artifacts.**
