---
title: "Jig redesign — initiative workspace"
status: active — Stage 1 high-level architecture not yet started
---

# Jig redesign

This directory is the durable workspace for defining and approving Jig's new canonical
full-lifecycle architecture. The governing authority is the [initiative goal](./GOAL.md).

## Current state

1. A new goal has been established. It requires architecture approval in two locked stages:
   first the high-level architecture, then the decision-complete architecture.
2. The standalone [`deterministic-story-orchestration/`](./deterministic-story-orchestration/)
   proposal was created before the goal. Its internal `agreed`, `draft`, and `proposal` labels do
   not constitute approval under the new goal.
3. Two independent reviews were then recorded under [`reviews/`](./reviews/): one by Claude Fable
   and one by Codex.
4. No findings from either review have been applied to the standalone proposal. The reviews have
   not yet been compiled into a unified review.
5. A generic, needs-routed architecture handbook now governs how each design layer is crafted and
   reviewed without requiring every session to read guidance for other layers.
6. Stage 1 high-level architecture work has not yet started and no Stage 1 decision is approved or
   locked.

## Authority and precedence

For this initiative, authority descends in this order:

1. [`GOAL.md`](./GOAL.md) and explicit owner decisions;
2. the future explicitly approved and locked Stage 1 high-level architecture;
3. the future explicitly approved Stage 2 decision-complete architecture.

Current product documents, current design documents, ADRs, runtime behavior, the standalone
proposal, and its reviews are evidence and comparison points. They do not bind the desired
architecture merely because they already exist.

The [architecture guidelines handbook](./guidelines/README.md) is the required method for crafting
new redesign documents. Every session reads its index and only the active layer page. The handbook
governs how architecture is modeled, divided into views, explained, reviewed, approved, and linked
to evidence; it does not select architectural decisions or outrank the goal and explicit owner
decisions. The comprehensive
[architecture design and documentation source guide](./architecture-design-and-documentation-guide.md)
preserves deeper rationale but is not required operational reading. Where generic guidance mentions
migration, rollout, or implementation, this initiative's non-goals continue to apply.

[`GOAL.md`](./GOAL.md) is this initiative's approved Layer 0 project definition. Stage 1
corresponds to the handbook's Layer 1, and Stage 2 corresponds to Layer 2. Layers 3 and 4 remain
outside this initiative's current scope.

Whenever a new design conflicts with the current product contract, it must name the current
promise, the proposed revision, why the revision is preferable, the changed guarantee or
tradeoff, and the owner decision required.

## Working rules

- Start from the goal and reason from first principles at the high level.
- Follow the [architecture guidelines index](./guidelines/README.md) and the active layer page. For
  Stage 1, read [Layer 1 — High-level architecture](./guidelines/01-high-level-architecture.md), not
  the later-layer pages. Define the audience, question, decision, scope, level, state, and owner for
  every artifact; maintain one coherent model; create selective views through progressive
  disclosure; and keep structure, behavior, perspectives, decisions, and implementation evidence
  distinct.
- Treat [`deterministic-story-orchestration/`](./deterministic-story-orchestration/) as immutable.
  It may be cited or mined for useful concepts, but it must not become the new design by continued
  editing.
- Treat both files under [`reviews/`](./reviews/) as immutable, independent, point-in-time review
  records. Do not apply their fixes to the old proposal.
- Recreate all new architecture in a new, connected redesign artifact set outside the immutable
  proposal and review folders. Reuse only decisions that survive fresh reasoning against the goal.
- Label every new artifact's state explicitly. Keep proposed, approved and locked, current,
  transitional, deprecated, and historical material distinguishable.
- Complete and explicitly approve Stage 1 before beginning Stage 2. Once Stage 1 is approved, any
  change to it requires an explicit reopen and renewed owner approval.
- Do not begin implementation, migration planning, or delivery sequencing in this initiative.

## Workspace map

| Path                                                                                                 | Purpose                                                                           | Status                               |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| [`GOAL.md`](./GOAL.md)                                                                               | Governing initiative goal, approval model, completion criteria, and non-goals.    | active authority                     |
| [`guidelines/`](./guidelines/)                                                                       | Needs-routed operational handbook; read the index and only the active layer page. | active documentation standard        |
| [`architecture-design-and-documentation-guide.md`](./architecture-design-and-documentation-guide.md) | Comprehensive rationale, research basis, expanded examples, and source reference. | optional deep reference              |
| [`deterministic-story-orchestration/`](./deterministic-story-orchestration/)                         | Pre-goal standalone proposal.                                                     | immutable input                      |
| [`reviews/`](./reviews/)                                                                             | Independent Claude Fable and Codex reviews of that proposal.                      | immutable inputs; findings unapplied |
| [`HANDOFF-stage-1-high-level-architecture.md`](./HANDOFF-stage-1-high-level-architecture.md)         | Cold-start prompt for the next design session.                                    | ready for use                        |

The next session should create a new Stage 1 artifact set outside the immutable folders, develop
the high-level architecture through explicit owner decisions, and stop after recording owner
approval and the lock. Stage 2 starts only in a later step.
