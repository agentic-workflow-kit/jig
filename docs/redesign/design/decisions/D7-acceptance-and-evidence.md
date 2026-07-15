---
title: "D7 — acceptance and trustworthy evidence"
purpose: Record the owner-selected reviewer-principal full-package acceptance with policy-selected final verification, including its explicitly accepted residual risk.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Future Layer 2 architecture authors after authorization
scope: The D7 selection, rationale, accepted consequence, rejected alternatives, and Layer 2 deferral; the canonical acceptance model is owned by the acceptance-and-evidence page.
state: proposed
status: established owner decision, re-presented 2026-07-15; lock pending the Layer 1 gate
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ../brief.md
  - ../../raw/design/decisions.md
related:
  - ./README.md
  - ../acceptance-and-evidence.md
  - ../invariants.md
---

# D7 — acceptance and trustworthy evidence

- **Status:** Owner-selected; lock pending the Layer 1 gate.
- **Owner:** Arye Kogan.
- **Related:** [Acceptance and evidence](../acceptance-and-evidence.md),
  [invariants I7–I9, I13](../invariants.md).

## Question

What judgment accepts an exact Candidate, what does Jig validate, and which later facts still
require independent observation?

## Owner-selected direction

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

## Rationale and benefits

- Preserves the reviewer as full delivery-package judge.
- Avoids turning final verification into a second reviewer.
- Keeps deterministic lifecycle authority and future effect facts with Jig.
- Lets policy balance assurance and cost without provider downgrade.

## Accepted negative consequence and trade-off

When policy selects `none`, convincing but false implementer check evidence may pass if the reviewer
does not detect it. Reviewer judgment also cannot guarantee semantic correctness. Arye explicitly
accepted this residual risk in exchange for reviewer-principal acceptance and policy-selectable
verification.

An archived review recommended mandatory independently observed automated checks based on external
product/design contracts. Those contracts were not imported and cannot override this owner decision.
The residual risk remains visible; the candidate does not silently “fix” it by changing D7.

## Alternatives not selected

- Mandatory independent final verification for every Accepted Candidate.
- Mechanically gated acceptance without mandatory reviewer judgment.

## Deliberate Layer 2 deferral

Evidence and verdict schemas, artifact storage, reviewer protocol, check-policy language, integrity
mechanisms, redaction, retention, remote-gate contracts, and landing-proof algorithms remain
deferred. Reviewer-principal acceptance, policy selection, and the accepted residual risk do not.
