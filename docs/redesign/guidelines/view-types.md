---
title: "View types — one question, one audience, one artifact"
purpose: Catalog the view types a design documentation set draws on, what question each answers, and when each is warranted.
audience:
  - Architecture authors
  - Independent reviewers
scope: Generic view-type selection guidance; level placement and diagram mechanics live in their own chapters.
state: current
status: active operational standard — generalized rewrite of 2026-07-15
owner: Architecture documentation owner
last_verified: 2026-07-15
sources_of_truth:
  - ../architecture-design-and-documentation-guide.md
related:
  - ./README.md
  - ./abstraction-levels.md
  - ./communication-contracts.md
---

# View types — one question, one audience, one artifact

A view is a deliberate selection from the canonical model that answers one question for one
audience. The model may be complete; each view must be selective. When a view starts answering two
questions, split it and link the halves.

## Choosing by question

| Reader's question                                                   | View type                 | Warranted when                                                                  |
| ------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------- |
| Why does this exist and how is success judged?                      | Project brief             | Always — nothing else has a frame without it.                                   |
| Who and what surrounds the system?                                  | System context            | Always — it creates shared scope before detail creates disagreement.            |
| Who supplies, judges, decides, performs, and observes, at a glance? | System summary            | The full context view is too busy for a first-time reader.                      |
| What runnable or stored units realize it?                           | Runtime/container         | Always at Level 2.                                                              |
| How is one unit internally organized?                               | Component                 | Only under a concrete trigger (shared ownership, internal boundary, migration). |
| What happens, in order, in one scenario?                            | Dynamic flow or sequence  | For each scenario that tests the architecture, including failure paths.         |
| What states and transitions govern a thing's life?                  | State machine             | Behavior must be closed and reviewable, not implied by prose.                   |
| Where does it run in one environment?                               | Deployment                | Per materially different topology; never mixed into the logical views.          |
| What data exists, who owns it, and what binds to what?              | Data / identity           | Identity, ownership, or binding rules carry safety or correctness weight.       |
| Which parts matter for one concern (risk, cost, trust, PII)?        | Perspective / overlay     | A cross-cutting review needs a lens; one concern per perspective.               |
| Why was this chosen and what does it cost?                          | Decision record           | Any choice with meaningful alternatives or consequences.                        |
| Which rules must later work preserve?                               | Invariant contract        | A foundation is being locked for later layers to build on.                      |
| What was reviewed, what passed, and what remains?                   | Gate record               | Any explicit review or approval gate exists.                                    |
| How will it change?                                                 | Isolated future-state set | A proposal exists; it must not be mistakable for current reality.               |

## Rules that keep view types honest

- **Structure, behavior, and perspective stay separate.** A static view shows what exists and may
  interact; a flow shows one scenario in time; a perspective highlights one concern. Collapsing
  them produces the unreadable "everything diagram".
- **Flows use the structural model.** Every message in a sequence uses a relationship that exists
  in a structural view. A flow step with no responsible object means the structural model is
  incomplete; a structural relationship no flow ever uses is a candidate for removal.
- **Logical and deployment views never merge.** Hosting changes must not appear to redefine
  responsibilities.
- **Perspectives are overlays, not copies.** A risk or ownership review filters the existing
  model; it never maintains a second one.
- **Summary views trade detail for orientation, explicitly.** A summary may group elements of the
  full view, but it must declare its groupings and point to the full view that owns the ungrouped
  truth (see the summary-view pattern in
  [communication contracts](./communication-contracts.md)).
- **Decision records carry the why.** Views show the result; the decision record preserves
  context, drivers, alternatives, the selected direction, and — non-negotiably — the accepted
  negative consequences. A decision record without a named cost is an advertisement.
- **Invariants and deferrals are first-class artifacts.** When one layer's output governs the
  next, write the preserved rules as a numbered invariant set with traceability, and the postponed
  detail as an explicit deferral inventory. These two artifacts are what make a lock reviewable.
- **Gate records are views too.** What was reviewed, against which exact candidate, with which
  verdict and evidence, is architectural information; give it an owning artifact instead of
  scattering it through commit messages.

## The minimum set

A small project is complete with: one project brief, one context view, one runtime view, one or two
flows that test the architecture (including a failure path), a decision record per material choice,
and a gate record if anything is formally approved. Everything else exists only when a named reader
has a named question.

## Where to go next

- Placing each view at its level: [abstraction levels](./abstraction-levels.md).
- The per-artifact and per-diagram contract every view carries:
  [communication contracts](./communication-contracts.md).
- How proposals, decisions, and locks interact: [gates, reviews, and change](./gates-and-reviews.md).
