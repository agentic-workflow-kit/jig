---
title: "D1 — source scope and canonical source-role vocabulary"
purpose: Record the owner-selected rule for what may define, inform, or be imported into Jig's new architecture.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Future Layer 2 architecture authors after authorization
scope: The D1 selection, rationale, accepted consequence, rejected alternatives, and Layer 2 deferral; canonical vocabulary is owned by the model page.
state: proposed
status: established owner decision, re-presented 2026-07-15; lock pending the Layer 1 gate
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ../brief.md
  - ../../raw/design/decisions.md
related:
  - ./README.md
  - ../model.md
  - ../invariants.md
---

# D1 — source scope and canonical source-role vocabulary

- **Status:** Owner-selected; lock pending the Layer 1 gate.
- **Owner:** Arye Kogan.
- **Related:** [Canonical model](../model.md), [invariant I1](../invariants.md).

## Question

What may define Jig's new architecture, what may only inform it, and how may product material become
a governing promise or constraint?

## Owner-selected direction

Use **reference on demand with explicit import**:

- the approved project definition plus explicit owner decisions remain **Architecture Authority**;
- the working contract, method, directional source, review evidence, Product Reference, imported
  promise/constraint, Owner Decision, and Proposed Architecture remain distinct roles;
- product material stays outside the default reading set and may be consulted only for a named
  decision or owner-requested comparison; and
- any observation remains non-binding Product Reference unless Arye imports an exact statement with
  provenance, rationale, consequences, and affected decisions.

No product material was consulted or imported for this candidate.

## Rationale and benefits

- Preserves first-principles redesign and the authority established by the project brief.
- Prevents silent import of current product architecture or guarantees.
- Permits targeted context when it improves a named decision.
- Gives every imported statement explicit provenance and accountability.

## Accepted negative consequence and trade-off

The rule adds an owner decision and recording step when product context becomes relevant, and a
conflict may surface later than after a broad product review. Arye accepted modest friction and later
discovery risk in exchange for deliberate provenance and lower anchoring risk.

## Alternatives not selected

- Broad non-binding product-context review before shaping the architecture.
- Complete exclusion of product material until after Layer 1 lock.

## Deliberate Layer 2 deferral

Representation and linking mechanics for imported promises remain Layer 2 detail. The explicit
import requirement and source-role distinctions do not.
