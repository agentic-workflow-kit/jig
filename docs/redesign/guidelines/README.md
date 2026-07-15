---
title: "Architecture design and documentation handbook"
purpose: Route any team on any project to the smallest complete guidance for designing and documenting software architecture by abstraction level and view type.
audience:
  - Human and agent architecture authors
  - Independent reviewers
  - Decision owners
scope: Generic method guidance; it selects no product architecture, technology, or project decision.
state: current
status: active operational standard — generalized rewrite of 2026-07-15, replacing the earlier stage-gate handbook
owner: Architecture documentation owner
last_verified: 2026-07-15
sources_of_truth:
  - ../architecture-design-and-documentation-guide.md
related:
  - ./abstraction-levels.md
  - ./view-types.md
  - ./communication-contracts.md
  - ./gates-and-reviews.md
  - ./maintenance.md
  - ./worked-example-jig.md
---

# Architecture design and documentation handbook

This handbook is for any team and any project. It organizes architecture documentation along two
axes — **abstraction level** (how far zoomed in a fact is) and **view type** (what kind of question
an artifact answers) — and treats approval state as **metadata on artifacts**, not as a document
structure or a phase the documentation lives in.

The core method in one paragraph: keep **one canonical model** of the important things (identities,
types, responsibilities, boundaries, relationships, ownership, lifecycle, evidence links); publish
**many selective views** over that model, each answering one question for one audience at one
abstraction level; give every artifact a **communication contract** that names its purpose,
audience, scope, state, and owner; and advance approval through **explicit gates recorded on the
artifacts**, reviewed against exact candidates.

## Route by need

| Current need                                                                    | Read                                                              |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Decide what belongs at the level you are writing, and what must wait            | [Abstraction levels](./abstraction-levels.md)                     |
| Pick the artifact kind that answers a reader's question                         | [View types](./view-types.md)                                     |
| Make an artifact or diagram stand on its own                                    | [Communication contracts](./communication-contracts.md)           |
| Review, approve, lock, or change designs without losing control of what is true | [Gates, reviews, and change](./gates-and-reviews.md)              |
| Keep published documentation trustworthy over time                              | [Maintenance](./maintenance.md)                                   |
| See the whole method applied end to end on a real project                       | [Worked example — jig](./worked-example-jig.md)                   |
| Get the deep rationale, research links, and expanded examples behind any rule   | [Source guide](../architecture-design-and-documentation-guide.md) |

Chapters are self-contained for their topic; none requires reading the others first. The source
guide is optional reference material, never mandatory operational reading.

## The ten shared rules

1. Start with the reader, the question, and the decision the artifact should enable — never with a
   drawing tool or a folder convention.
2. Keep one coherent model; make every view a deliberate selection from it. The model may be
   complete; each view must be selective.
3. Keep every artifact at one abstraction level and give it one primary story. Split rather than
   overload; a higher-level view must stay simpler than the views below it.
4. Give every object a stable identity, a type, and a one-sentence responsibility; give every
   relationship a directed, specific verb phrase.
5. Keep structure, behavior, state, data, deployment, and cross-cutting perspectives as separate
   view types; do not collapse them into one diagram.
6. Label facts, assumptions, proposals, approved decisions, and implementation evidence so a reader
   can always tell which one they are looking at.
7. Record meaningful choices as decision records with alternatives, consequences, and an owner.
8. Link to the canonical fact or evidence instead of copying it; each fact lives in exactly one
   owning artifact.
9. Advance approval one explicit gate at a time; a review verdict applies only to the exact
   candidate it examined.
10. Create an artifact only when it answers a named question, enables a decision, or preserves
    evidence nothing else can express. There are no artifact or diagram quotas.

## Artifact state vocabulary

| State                 | Meaning                                                                       |
| --------------------- | ----------------------------------------------------------------------------- |
| `exploration`         | A disposable option or sketch with no approval claim.                         |
| `proposed`            | A coherent candidate submitted for review and decision.                       |
| `approved`            | Selected by the decision owner but not necessarily implemented.               |
| `approved and locked` | Approved foundation that later work cannot change without an explicit reopen. |
| `transitional`        | Temporary architecture used during an approved change.                        |
| `implemented`         | Realized in code or infrastructure but not yet verified as the current truth. |
| `current`             | Implemented, verified, and maintained as the present reality.                 |
| `deprecated`          | Still present but intentionally scheduled for removal.                        |
| `historical`          | Frozen evidence of an earlier state, proposal, or decision.                   |

Approval, implementation, verification, and current-state publication are separate events; the
state field records which one an artifact has actually reached. Gate semantics for moving between
states live in [gates, reviews, and change](./gates-and-reviews.md).

## Provenance

This handbook generalizes the [source guide](../architecture-design-and-documentation-guide.md)
(itself a synthesis of the IcePanel documentation and the C4 model) and folds in the practices
proven during the jig redesign: the per-artifact communication contract, the summary-view and
linked-subflow pattern, exact-candidate review semantics, and layer gates recorded as artifact
metadata. The superseded stage-gate handbook pages remain at their original paths as historical
stubs whose full content is preserved in git history.
