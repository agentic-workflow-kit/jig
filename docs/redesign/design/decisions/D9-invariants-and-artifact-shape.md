---
title: "D9 — consolidated invariants, Layer 2 boundary, and artifact shape"
purpose: Record the owner-selected invariant set, the deferred Layer 2 mechanism inventory, and the artifact shape of the Layer 1 foundation, including the 2026-07-15 owner revision of that shape.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Future Layer 2 architecture authors after authorization
scope: The D9 selection and its 2026-07-15 artifact-shape revision, rationale, accepted consequence, rejected alternatives, and the consolidated Layer 2 deferral inventory; canonical invariant wording is owned by the invariants page.
state: proposed
status: established owner decision with an explicit 2026-07-15 owner revision of the artifact shape; lock pending the Layer 1 gate
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ../brief.md
  - ../../raw/design/decisions.md
  - Explicit owner structure-revision instruction, 2026-07-15
related:
  - ./README.md
  - ../invariants.md
  - ../README.md
---

# D9 — consolidated invariants, Layer 2 boundary, and artifact shape

- **Status:** Owner-selected; artifact shape explicitly revised by Arye on 2026-07-15; lock pending
  the Layer 1 gate.
- **Owner:** Arye Kogan.
- **Related:** [Invariants](../invariants.md), [design index](../README.md).

## Question

Which high-level rules must later design preserve, which details may Layer 2 elaborate, and how must
the Layer 1 foundation be recorded?

## Owner-selected direction

Preserve consolidated I1–I21 and keep the complete mechanism inventory below in Layer 2.

**Artifact shape — original selection (2026-07-14):** record the foundation as exactly one connected
two-artifact set: a reader-complete high-level architecture document plus one linked decision
record. The rejected alternative was splitting each Layer 1 perspective into an independent document
before a demonstrated readability need.

**Artifact shape — explicit owner revision (2026-07-15):** Arye directed that the design
documentation follow the abstraction-layer and view structure of the
[architecture guide](../../architecture-design-and-documentation-guide.md): a project brief, a
canonical model page, a system context view, behavior flows, supporting views, perspectives, and
one decision record per decision. The readability need is demonstrated by the owner's judgment of
the two-artifact set. This revision changes document boundaries, navigation, and presentation only;
no invariant, selected direction, accepted consequence, or deferral changes. The current connected
document set under [`design/`](../README.md) is the revised D9 artifact shape.

## Rationale and benefits

- Keeps one canonical model with connected, selectively scoped views and per-decision records.
- Makes burdens and deferrals visible to the owner, reviewer, and future Layer 2 authors.
- Provides a clear review, approval, lock, and reopen boundary.
- Lets each reader load only the pages their question needs instead of one dense document.

## Accepted negative consequence and trade-off

The connected multi-page set requires disciplined cross-linking and a navigable index, and its
review gate must cover the exact full candidate set rather than two files. Locking the invariants
deliberately constrains Layer 2 and requires an explicit reopen for material simplification or
authority redistribution. Arye accepted these costs in exchange for readable, selectively scoped
artifacts and a stable foundation.

## Alternatives not selected

- Copy or continue the standalone proposal's layered file structure.
- The original compact two-artifact foundation (superseded by the explicit 2026-07-15 owner
  revision after the owner judged it insufficiently navigable).

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

Only the mechanism choices in this inventory are deferred. No high-level decision, accepted
consequence, or invariant is hidden in the list.
