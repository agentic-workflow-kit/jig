---
title: "Jig redesign — initiative workspace"
status: active — Layer 0 approved; Stage 1 high-level architecture not yet started
---

# Jig redesign

This directory is the durable workspace for defining and approving Jig's new canonical
full-lifecycle architecture. The governing authority is the [initiative goal](./GOAL.md).

## Current state

1. [`GOAL.md`](./GOAL.md) was approved by Arye Kogan (Jig owner) on 2026-07-14 as the initiative's
   Layer 0 project definition. It requires architecture approval in two locked stages: first the
   high-level architecture, then the decision-complete architecture.
2. The standalone [`deterministic-story-orchestration/`](./deterministic-story-orchestration/)
   proposal was created before the goal. Its internal `agreed`, `draft`, and `proposal` labels do
   not constitute approval under the new goal.
3. Two independent reviews were then recorded under [`reviews/`](./reviews/): one by Claude Fable
   and one by Codex.
4. No findings from either review have been applied to the standalone proposal. The reviews have
   not yet been compiled into a unified review.
5. A generic, needs-routed architecture handbook now governs how each design layer is crafted and
   reviewed without requiring every session to read guidance for other layers.
6. The source and layer-routing contract has been refined for a clean restart. Stage 1 high-level
   architecture work has not yet started, no Stage 1 decision is approved or locked, and the durable
   `design/` artifact set does not yet exist.

## Authority and precedence

For this initiative, authority descends in this order:

1. [`GOAL.md`](./GOAL.md) and explicit owner decisions;
2. the future explicitly approved and locked Stage 1 high-level architecture;
3. the future explicitly approved Stage 2 decision-complete architecture.

The standalone proposal is the primary source of redesign direction, and its reviews are
adversarial checks. Neither is approved architecture. Repository product, design, ADR, delivery, and
runtime artifacts outside `docs/redesign/` are not default initiative inputs and enter scope only by
explicit owner direction.

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

Whenever a new design conflicts with the goal, an explicit owner decision, or an external promise
the owner deliberately imports into scope, it must name the governing constraint, proposed
revision, rationale, changed guarantee or tradeoff, and owner decision required.

## Source and layer routing

Keep authority, method, directional source material, and approval state distinct:

| Role                       | Source                                                                           | How to use it                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Initiative authority       | [`GOAL.md`](./GOAL.md) and explicit owner decisions                              | Defines outcomes, scope, stage gates, source boundary, and what may be approved.                                   |
| Crafting and review method | [`guidelines/README.md`](./guidelines/README.md) plus only the active layer page | Defines document context, model/view discipline, diagram rules, review gates, and approval semantics.              |
| Primary redesign direction | [`deterministic-story-orchestration/`](./deterministic-story-orchestration/)     | Supplies the design direction to re-express, test, refine, or reject in the correct layer; never edit it in place. |
| Corrective evidence        | [`reviews/`](./reviews/)                                                         | Supplies contradictions, risks, and missing questions after the proposal has been read; does not choose fixes.     |
| New canonical design       | `design/`                                                                        | Stable future home for layered design artifacts; stage and approval belong in metadata, not the path.              |

Use the layers in order:

| Initiative step   | Required reading and context                                                                                                       | Output and stop gate                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Approved Layer 0  | This README and [`GOAL.md`](./GOAL.md); reopen Layer 0 only by explicit owner decision.                                            | Approved project definition.                                                                                              |
| Stage 1 / Layer 1 | Goal, guidelines index, Layer 1 page, complete standalone proposal, then both independent reviews.                                 | Proposed high-level artifacts under `design/`, followed by explicit owner approval and lock.                              |
| Stage 2 / Layer 2 | Locked Stage 1 artifacts, guidelines index, Layer 2 page, and only the proposal/review slices relevant to the detailed decision.   | Decision-complete additions under the same `design/` folder, followed by final owner approval.                            |
| Layers 3 and 4    | Not part of the current initiative. Enter only through a later explicit scope decision and the applicable guideline-layer reading. | No implementation, migration, delivery sequencing, current-state publication, or maintenance work in this initiative yet. |

## Working rules

- Keep architecture work inside `docs/redesign/` by default. Repository inspection needed to verify
  the checkout or run documentation gates does not authorize using outside product, design, ADR,
  delivery, runtime, or source artifacts as architecture inputs.
- Start from the goal, then use the standalone proposal as the primary directional source and the
  reviews as adversarial checks. Do not begin from unrelated repository documentation.
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
  proposal and review folders. Use the stable `design/` path; record Layer 1 or Layer 2 in artifact
  metadata rather than in directory names. Reuse only decisions that survive reasoning against the
  goal, the applicable guideline gate, and review evidence.
- Establish the canonical model, identities, questions, and owner decisions before drawing views.
  Every diagram follows the active layer's view rules, carries its own purpose and context, and
  selects from the shared model rather than inventing a parallel architecture.
- Label every new artifact's state explicitly. Keep proposed, approved and locked, current,
  transitional, deprecated, and historical material distinguishable.
- Complete and explicitly approve Stage 1 before beginning Stage 2. Once Stage 1 is approved, any
  change to it requires an explicit reopen and renewed owner approval.
- Do not begin implementation, migration planning, or delivery sequencing in this initiative.

## Workspace map

| Path                                                                                                 | Purpose                                                                           | Status                               |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| [`GOAL.md`](./GOAL.md)                                                                               | Governing initiative goal, approval model, completion criteria, and non-goals.    | approved Layer 0 authority           |
| [`guidelines/`](./guidelines/)                                                                       | Needs-routed operational handbook; read the index and only the active layer page. | active documentation standard        |
| [`architecture-design-and-documentation-guide.md`](./architecture-design-and-documentation-guide.md) | Comprehensive rationale, research basis, expanded examples, and source reference. | optional deep reference              |
| [`deterministic-story-orchestration/`](./deterministic-story-orchestration/)                         | Pre-goal standalone proposal.                                                     | immutable input                      |
| [`reviews/`](./reviews/)                                                                             | Independent Claude Fable and Codex reviews of that proposal.                      | immutable inputs; findings unapplied |
| `design/`                                                                                            | Stable future home of the new layered redesign.                                   | not created; Stage 1 pending         |
| [`HANDOFF-stage-1-high-level-architecture.md`](./HANDOFF-stage-1-high-level-architecture.md)         | Cold-start prompt for the next design session.                                    | ready for use                        |

The next session should use the Stage 1 handoff, stay within the source boundary above, create the
new durable architecture under `design/` only after the relevant owner decision gate, and stop after
recording Stage 1 owner approval and the lock. Stage 2 starts only in a later session.
