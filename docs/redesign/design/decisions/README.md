---
title: "Decision records — index"
purpose: Route readers to the owner-selected Layer 1 decisions, the accepted burdens they carry, and the review and approval record.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Future Layer 2 architecture authors after authorization
scope: Index and status of decisions D1–D9, the consolidated accepted burdens, and the review record; each decision's content lives in its own record.
state: proposed
status: proposed index, re-presented 2026-07-15 under the owner-directed view-based structure; pending independent review of the new candidate set
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ../brief.md
  - ../../raw/design/decisions.md
related:
  - ../README.md
  - ../invariants.md
  - ./review-and-approval-record.md
---

# Decision records — index

These records preserve Arye Kogan's established D1–D9 owner selections and the complete burdens they
carry. The design pages own canonical vocabulary, boundaries, identities, relationships, lifecycle,
state, and invariants; each decision record explains why the selected direction was chosen, which
alternatives were rejected, what costs remain accepted, and what Layer 2 may decide.

The 2026-07-14 documentation reset did not reopen these decisions, and the 2026-07-15 structure
revision changes only their presentation: one record per decision instead of one combined file. No
selection, consequence, or deferral changed.

## Decision index

| ID                                             | Topic                                  | Owner-selected direction                                                                       |
| ---------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [D1](./D1-source-scope.md)                     | Source scope and vocabulary            | Reference on demand with explicit import.                                                      |
| [D2](./D2-system-boundary.md)                  | System boundary                        | Authority-and-proof boundary.                                                                  |
| [D3](./D3-responsibilities-trust-authority.md) | Responsibilities, trust, and authority | Centralized deterministic authority with scoped judgment and attestation.                      |
| [D4](./D4-lifecycle-and-information-flow.md)   | Lifecycle and information flow         | Recoverable hierarchical lifecycle with separate business-outcome and Retirement dimensions.   |
| [D5](./D5-state-authority-and-recovery.md)     | State authority and Recovery           | Durable ordered Transition ledger with reconstructable live state.                             |
| [D6](./D6-concurrency-and-finalization.md)     | Concurrency and finalization           | Resource-class capacity, deterministic ordering, and one target-scoped finalization authority. |
| [D7](./D7-acceptance-and-evidence.md)          | Acceptance and evidence                | Reviewer-principal full-package acceptance with policy-selected final verification.            |
| [D8](./D8-failure-and-liveness.md)             | Failure and liveness                   | Smallest-scope fail-closed containment with bounded Recovery and durable escalation.           |
| [D9](./D9-invariants-and-artifact-shape.md)    | Invariants and Layer 2 boundary        | Consolidated I1–I21, explicit deferrals, and the connected view-based foundation set.          |

All nine decisions are established owner selections; their lock became effective through the
Layer 1 gate recorded in the [review and approval record](./review-and-approval-record.md).

## Proposed Layer 2 decision records

These records were authored on 2026-07-15 under the owner continuation instruction. They are
proposed, not owner-approved: they advance through the
[Layer 2 gate](./layer2-gate-record.md) — independent review, then the owner stop. This section is
an additive index extension; no D1–D9 content changed.

| ID                                       | Topic                           | Proposed direction                                                                          |
| ---------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| [D10](./D10-runtime-decomposition.md)    | Runtime decomposition and ports | Modular single-authority runtime with named ports.                                          |
| [D11](./D11-ledger-realization.md)       | Ledger realization              | Storage-agnostic conditional-append contract with a single-host file reference realization. |
| [D12](./D12-mechanism-contract-model.md) | Mechanism contract model        | Capability-scoped, attested, conformance-gated mechanism contracts.                         |

## Accepted final negative consequences

Arye's established approval record explicitly accepted all six burdens; the re-presented candidate
preserves them:

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

## Related contracts

- The invariant set the decisions select and lock: [invariants](../invariants.md).
- What Layer 2 may and may not decide:
  [D9 consolidated deferrals](./D9-invariants-and-artifact-shape.md#consolidated-deliberate-layer-2-deferrals).
- Review gates, archive-evidence dispositions, and approval state:
  [review and approval record](./review-and-approval-record.md).
