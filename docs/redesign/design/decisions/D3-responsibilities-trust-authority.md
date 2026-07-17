---
title: "D3 — major responsibilities, trust, and authority"
purpose: Record the owner-selected centralized deterministic authority model with scoped judgment and attestation.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Future Layer 2 architecture authors after authorization
scope: The D3 selection, rationale, accepted consequence, rejected alternatives, and Layer 2 deferral; the canonical powers and matrix are owned by the authority-and-trust perspective.
state: proposed
status: established owner decision, amended by explicit bounded reopen of 2026-07-17; renewed exact-candidate review pending
owner: Arye Kogan
last_verified: 2026-07-17
sources_of_truth:
  - ../brief.md
  - ../../raw/design/decisions.md
related:
  - ./README.md
  - ../perspectives/authority-and-trust.md
  - ../invariants.md
---

# D3 — major responsibilities, trust, and authority

- **Status:** Owner-selected; amended by the explicit bounded reopen of 2026-07-17; renewed exact-candidate review pending.
- **Owner:** Arye Kogan.
- **Related:** [Authority and trust perspective](../perspectives/authority-and-trust.md),
  [invariants I3–I4](../invariants.md).

## Question

Which participant may propose, perform, observe, attest, authorize, decide, record, or reconcile, and
what happens when that participant is faulty or compromised?

## Owner-selected direction

Use **centralized deterministic authority with scoped judgment and attestation**:

- Jig Control is the sole routine lifecycle authority and owns Authorize, Decide, Record, and
  Reconcile powers;
- **Arye** decides escalations, exceptions, imports, approvals, reopens, and every stop or decision
  no current operational grant covers;
- a recorded delegate holds only bounded operational authority — decide/answer, Run stop/resume,
  notice, and similar operational classes — within the exact current `ID-GRANT`;
- product or architecture imports or approval, gate verdicts, and layer reopens are non-delegable;
- the implementer proposes and performs implementation and supplies attributable self-report;
- the reviewer independently judges the complete exact Candidate and attests its verdict;
- verification, workspace, delivery, agent, and storage mechanisms perform or attest only scoped
  facts; and
- read-only observers have no control path.

External results are validated against identity, role, exact subject, lifecycle, fence, and
capability. A participant cannot widen authority through output. Story-scoped compromise may contain
to one Story; shared authority compromise interrupts the Run; Jig Control or owner-authority
compromise requires externally governed Recovery.

## Rationale and benefits

- Preserves deterministic authority and attribution.
- Separates subjective judgment from observed facts and irreversible effects.
- Limits provider blast radius and supports replacement.
- Prevents a mechanism from promoting its success claim into a lifecycle decision.

## Accepted negative consequence and trade-off

The model requires stronger identity, evidence, validation, and reconciliation contracts and can add
latency. Jig Control becomes trusted infrastructure that must remain small and verifiable. Arye
accepted mediation complexity in exchange for assurance and replaceability.

## Alternatives not selected

- Reviewer-centered lifecycle authority.
- Federated lifecycle authority distributed among mechanisms.

## Deliberate Layer 2 deferral

Identity, delegation, credentials, attestation format, sandboxing, permission enforcement, and
conformance mechanisms remain deferred. Ownership of each power does not.
