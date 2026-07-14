---
title: "Jig redesign — initiative workspace"
status: active — Layer 0 approved; Stage 1 approved and locked; Stage 2 not started
---

# Jig redesign

This directory is the durable workspace for defining and approving Jig's new canonical
full-lifecycle architecture. The governing authority is the [initiative goal](./GOAL.md).

## Current state

1. [`GOAL.md`](./GOAL.md) was approved by Arye Kogan (Jig owner) on 2026-07-14 as the initiative's
   Layer 0 project definition. It requires architecture approval in two locked stages: first the
   high-level architecture, then the decision-complete architecture.
2. The Stage 1 [high-level architecture](./design/README.md) and
   [decision record](./design/decisions.md) were approved and locked on 2026-07-14 at commit
   `dce91c5359df37e378f1575282658a1fa3b04341`.
3. The standalone [`deterministic-story-orchestration/`](./deterministic-story-orchestration/)
   proposal was created before the goal. Its internal `agreed`, `draft`, and `proposal` labels do
   not constitute approval under the new goal.
4. Two independent reviews under [`reviews/`](./reviews/) remain immutable and unapplied to the
   standalone proposal. Stage 1 used them as adversarial evidence; they did not select the
   architecture.
5. The [architecture guidelines handbook](./guidelines/README.md) governs how each design layer is
   crafted and reviewed without requiring every session to read guidance for other layers.
6. Stage 2 has not started. Implementation, migration planning, delivery sequencing, and
   current-state publication remain excluded from this initiative.
7. The proposed [Stage 2 execution plan](./STAGE-2-EXECUTION-PLAN.md) preserves the verified
   orientation checkpoint and defines the gated path to decision-complete architecture. Execution
   awaits explicit owner approval at its G0 gate.

## Authority and precedence

For this initiative, authority descends in this order:

1. [`GOAL.md`](./GOAL.md) and explicit owner decisions;
2. the explicitly approved and locked Stage 1 [high-level architecture](./design/README.md) and
   [decision record](./design/decisions.md);
3. the future explicitly approved Stage 2 decision-complete architecture.

The standalone proposal is the primary source of redesign direction, and its reviews are
adversarial checks. Neither is approved architecture. For a specific Stage 2 decision or an
owner-requested comparison, a named document under `docs/product/` may be consulted as non-binding
Product Reference. It becomes governing only through an explicit owner import that records the
exact promise or constraint, provenance, rationale, consequences, and affected decisions. Do not
read product documents broadly or silently import their content. Repository design, ADR, delivery,
runtime, package, source, and test artifacts outside `docs/redesign/` remain excluded as architecture
inputs unless the owner explicitly expands scope for a named comparison, constraint, or verification
question.

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

| Role                       | Source                                                                                        | How to use it                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Initiative authority       | [`GOAL.md`](./GOAL.md) and explicit owner decisions                                           | Defines outcomes, scope, stage gates, source boundary, and what may be approved.                                                    |
| Locked Stage 1 authority   | [Architecture](./design/README.md) and [decisions](./design/decisions.md)                     | Supplies the foundation and invariants Stage 2 must preserve; change only through an explicit reopen and renewed owner approval.    |
| Crafting and review method | [`guidelines/README.md`](./guidelines/README.md) plus only the active layer page              | Defines document context, model/view discipline, diagram rules, review gates, and approval semantics.                               |
| Primary redesign direction | [`deterministic-story-orchestration/`](./deterministic-story-orchestration/)                  | Supplies direction to re-express, test, refine, or reject within the locked foundation; never edit it in place.                     |
| Corrective evidence        | [`reviews/`](./reviews/)                                                                      | Supplies contradictions, risks, and missing questions; does not choose fixes or override locked decisions.                          |
| Product Reference          | A named `docs/product/` document opened for a specific decision or owner-requested comparison | May inform discussion but remains non-binding unless the owner explicitly imports an exact promise or constraint with provenance.   |
| New canonical design       | [`design/README.md`](./design/README.md) and [`design/decisions.md`](./design/decisions.md)   | Stable home for approved Stage 1 and future Stage 2 artifacts; layer and approval state belong in metadata, not the directory name. |

Use the layers in order:

| Initiative step   | Required reading and context                                                                                                                                                                | Output and stop gate                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Approved Layer 0  | This README and [`GOAL.md`](./GOAL.md); reopen Layer 0 only by explicit owner decision.                                                                                                     | Approved project definition.                                                                                              |
| Stage 1 / Layer 1 | Completed from the goal, Layer 1 method, complete standalone proposal, and both independent reviews.                                                                                        | Approved and locked architecture and decision record under `design/`; reopen only through explicit owner approval.        |
| Stage 2 / Layer 2 | Locked [`design/`](./design/) artifacts, guidelines index, [Layer 2 page](./guidelines/02-detailed-architecture.md), and only the proposal/review slices relevant to the detailed decision. | Decision-complete additions under the same `design/` folder, followed by final owner approval.                            |
| Layers 3 and 4    | Not part of the current initiative. Enter only through a later explicit scope decision and the applicable guideline-layer reading.                                                          | No implementation, migration, delivery sequencing, current-state publication, or maintenance work in this initiative yet. |

## Working rules

- Keep architecture work inside `docs/redesign/` by default. Repository inspection needed to verify
  the checkout or run documentation gates does not authorize using outside product, design, ADR,
  delivery, runtime, or source artifacts as architecture inputs.
- Start Stage 2 from the locked Stage 1 architecture and decision record plus the active guideline
  page. Consult only the proposal and review slices relevant to the detailed decision being closed;
  do not begin from unrelated repository documentation.
- Follow the [architecture guidelines index](./guidelines/README.md) and only the active layer page.
  Stage 2 uses [Layer 2 — Detailed architecture](./guidelines/02-detailed-architecture.md) and treats
  the locked Stage 1 artifacts as its input contract. Define the audience, question, decision,
  scope, level, state, and owner for every artifact; maintain one coherent model; create selective
  views through progressive disclosure; and keep structure, behavior, perspectives, decisions, and
  implementation evidence distinct.
- Treat [`deterministic-story-orchestration/`](./deterministic-story-orchestration/) as immutable.
  It may be cited or mined for useful concepts, but it must not become the new design by continued
  editing.
- Treat both files under [`reviews/`](./reviews/) as immutable, independent, point-in-time review
  records. Do not apply their fixes to the old proposal.
- Create Stage 2 architecture as connected additions under the stable `design/` path outside the
  immutable proposal and review folders. Record the active layer and approval state in artifact
  metadata rather than directory names. Preserve every locked Stage 1 invariant unless the owner
  explicitly reopens Stage 1 and renews approval after an impact statement.
- Establish the canonical model, identities, questions, and owner decisions before drawing views.
  Every diagram follows the active layer's view rules, carries its own purpose and context, and
  selects from the shared model rather than inventing a parallel architecture.
- Label every new artifact's state explicitly. Keep proposed, approved and locked, current,
  transitional, deprecated, and historical material distinguishable.
- Stage 1 is complete. Any change to a locked Stage 1 decision requires an explicit reopen, impact
  statement, and renewed owner approval before Stage 2 continues on that basis.
- Do not begin implementation, migration planning, delivery sequencing, or current-state
  publication in this initiative.

## Workspace map

| Path                                                                                                 | Purpose                                                                                 | Status                                                     |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [`GOAL.md`](./GOAL.md)                                                                               | Governing initiative goal, approval model, completion criteria, and non-goals.          | approved Layer 0 authority                                 |
| [`guidelines/`](./guidelines/)                                                                       | Needs-routed operational handbook; read the index and only the active layer page.       | active documentation standard                              |
| [`architecture-design-and-documentation-guide.md`](./architecture-design-and-documentation-guide.md) | Comprehensive rationale, research basis, expanded examples, and source reference.       | optional deep reference                                    |
| [`deterministic-story-orchestration/`](./deterministic-story-orchestration/)                         | Pre-goal standalone proposal.                                                           | immutable input                                            |
| [`reviews/`](./reviews/)                                                                             | Independent Claude Fable and Codex reviews of that proposal.                            | immutable evidence; unapplied to proposal; used in Stage 1 |
| [`design/README.md`](./design/README.md)                                                             | Canonical high-level architecture and invariants.                                       | Stage 1 approved and locked                                |
| [`design/decisions.md`](./design/decisions.md)                                                       | Canonical Stage 1 decisions, trade-offs, deferrals, and approval record.                | Stage 1 approved and locked                                |
| [`STAGE-2-EXECUTION-PLAN.md`](./STAGE-2-EXECUTION-PLAN.md)                                           | Verified Stage 2 checkpoint, execution DAG, owner gates, agent roster, and review plan. | proposed; execution awaits G0 owner approval               |
| [`HANDOFF-stage-1-high-level-architecture.md`](./HANDOFF-stage-1-high-level-architecture.md)         | Historical cold-start prompt for the completed Stage 1 work.                            | closed and superseded                                      |

## Next session — Stage 2

Start from the proposed [Stage 2 execution plan](./STAGE-2-EXECUTION-PLAN.md). When its freshness
contract passes, use its verified checkpoint and phase-specific source packets instead of repeating
the full orientation sweep. The historical Stage 1 handoff must not be executed.

Stage 2 may refine the locked foundation but cannot change it without an explicit Stage 1 reopen,
impact statement, and renewed owner approval. Implementation, migration planning, delivery
sequencing, and current-state publication remain excluded.
