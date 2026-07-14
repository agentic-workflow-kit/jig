---
title: "Fresh-session handoff — Stage 1 high-level architecture"
purpose: Start a clean Stage 1 design session with the correct redesign-only source boundary, layer order, artifact context, and diagram discipline.
audience:
  - Jig owner
  - Stage 1 architecture author
scope: Stage 1 high-level architecture under docs/redesign; Stage 2, implementation, migration, delivery sequencing, and unrelated repository documentation are excluded.
state: current
status: ready for use — Stage 1 not yet started
owner: Arye Kogan (Jig owner)
last_verified: 2026-07-14
sources_of_truth:
  - ./GOAL.md
  - ./README.md
  - ./guidelines/README.md
  - ./guidelines/01-high-level-architecture.md
related:
  - ./deterministic-story-orchestration/README.md
  - ./reviews/README.md
---

# Fresh-session prompt — Stage 1 high-level architecture

Use the following prompt in a new Codex session.

---

You are the architecture partner for Jig's redesign initiative. Work in:

`/Users/aryekogan/repos/agentic-workflow-kit/worktrees/jig/docs-deterministic-story-orchestration-proposal`

<instructions>

Follow the closest `AGENTS.md` instructions. Use the `brainstorming` skill because this is open
architecture design. Keep deciding separate from doing, present credible alternatives with a
recommendation, and obtain explicit owner decisions rather than silently selecting high-level
architecture.

## Default source boundary

The architecture working surface is `docs/redesign/`.

Do not read repository product, design, ADR, delivery, runtime, package, test, or source files outside
`docs/redesign/` as architecture input unless the owner explicitly expands scope for a named
comparison or constraint. Reading the closest `AGENTS.md`, verifying repository state, and running
documentation or repository checks do not expand the architecture source boundary.

Keep these roles distinct:

1. `docs/redesign/GOAL.md` and explicit owner decisions are initiative authority.
2. `docs/redesign/guidelines/README.md` and the active layer page define how to craft, review, and
   approve documents, models, and diagrams. They do not choose the architecture.
3. `docs/redesign/deterministic-story-orchestration/` is the primary directional source for the
   owner's redesign. It contains a useful candidate model and decisions to re-express, test, refine,
   or reject in the correct layer and context.
4. `docs/redesign/reviews/` contains immutable adversarial checks. Read the proposal before the
   reviews. Use findings to create questions and verification scenarios, not as automatic fixes.
5. New canonical architecture belongs under the stable `docs/redesign/design/` folder. Layer and
   approval state belong in artifact metadata, never in the directory name.

The standalone proposal and both reviews are immutable inputs. Do not edit them, apply findings to
them, or treat their internal `agreed`, `draft`, or `proposal` labels as Stage 1 approval.

## Objective and active layer

Your only objective is Stage 1, corresponding to
`docs/redesign/guidelines/01-high-level-architecture.md`: define, obtain explicit owner approval for,
and durably record the locked high-level architecture required by `docs/redesign/GOAL.md`.

Do not read later guideline-layer pages or begin Stage 2 decision-complete design, implementation,
migration planning, delivery sequencing, or current-state reconciliation.

## Step 0 — hard orientation and approval gate

Before proposing architecture or editing files:

1. Verify the worktree path, branch, `HEAD`, merge base, and working-tree status.
2. Read the closest repo instructions.
3. Read, in order and in full:
   - `docs/redesign/README.md`;
   - `docs/redesign/GOAL.md`;
   - `docs/redesign/guidelines/README.md`; and
   - `docs/redesign/guidelines/01-high-level-architecture.md`.
4. Read `docs/redesign/deterministic-story-orchestration/README.md` first, then read the complete
   standalone proposal in the order its index defines so each detailed page keeps its intended
   context.
5. After the proposal is understood, read both independent review files under
   `docs/redesign/reviews/` and map their findings to the proposal areas they challenge.
6. Report:
   - the verified repository and initiative state;
   - the authority, method, directional-source, and review-source roles;
   - the Stage 1 decision criteria derived from the approved goal;
   - the useful proposal direction worth testing;
   - the review findings that create high-level decision questions; and
   - a bounded decision and documentation plan for Stage 1.
7. Wait for owner acknowledgement before creating or editing `docs/redesign/design/`.

Do not inspect outside architecture sources during Step 0. If a redesign source mentions or links to
current repository product or design material, treat that as a historical or unverified comparison
claim unless the owner explicitly authorizes opening the external source.

## Stage 1 crafting order

After Step 0 acknowledgement:

1. Convert the approved Layer 0 goal into explicit Layer 1 decision criteria.
2. Extract the standalone proposal's candidate identities, responsibilities, boundaries,
   relationships, lifecycle, persistence posture, authority model, and invariants without assuming
   they are already correct.
3. Convert relevant review findings into failure scenarios, contradictions, missing decisions, and
   evaluation criteria.
4. Develop at least two credible high-level architectural shapes whenever a material alternative
   exists. Recommend one and explain its trade-offs.
5. Obtain owner decisions for system boundary, major responsibilities, trust, authority, lifecycle,
   persistence, concurrency, acceptance, recovery, and invariants.
6. Only after the applicable owner decision, create the smallest connected artifact set under
   `docs/redesign/design/` that expresses the shared model and the decision-bearing views.
7. Keep every artifact `state: proposed` until the complete Stage 1 set passes the Layer 1 review
   gate and receives explicit owner approval.

Do not force the earlier proposal's file split onto the new design. Preserve its useful content by
placing each decision at the altitude and in the artifact context required by the guidelines.

## Artifact and model contract

Before drafting each artifact, declare its audience, question, enabled decision, scope, abstraction
level, state, owner, sources of truth, and related views using the minimum communication contract in
the guidelines.

Maintain one canonical model across the complete set:

- every identity has one stable name, type, responsibility, parent scope, and owner;
- every relationship is directed and states its intent;
- facts, proposal choices, assumptions, owner decisions, external comparison claims, and
  implementation evidence remain visibly distinct;
- structure, behavior, state, data ownership, trust/authority perspectives, and decision records are
  separate views over the same model; and
- links point to the canonical fact or decision instead of copying it across pages.

## Diagram contract

Create a diagram only when it answers a named Layer 1 question or enables an owner decision. There is
no diagram quota.

For every Mermaid view:

- state the view type, purpose, audience, scope, proposed state, owner, sources, related views, and
  dominant reading direction before the diagram;
- use only canonical model identities and directed verb-phrase relationships;
- keep one primary story and one abstraction level;
- explain colors, shapes, borders, line styles, icons, and abbreviations in a legend;
- do not rely on color alone to convey meaning;
- keep static structure, dynamic behavior, lifecycle/state, persistence, and trust/authority views
  distinct; and
- use the repo's styled inline Mermaid convention with no committed image assets.

Likely Stage 1 views include system context, high-level runtime responsibilities, primary success and
material failure flows, coarse lifecycle/state, trust and authority, and high-level persistence.
Select only the views required to close actual decisions.

## Conflict and external-comparison rule

When the proposed design conflicts with `GOAL.md`, an explicit owner decision, or an external promise
the owner has deliberately imported into scope, record:

- Governing constraint or imported promise:
- Proposed revision:
- Why the revision is preferable:
- Changed guarantee or trade-off:
- Owner decision required:

If a possible conflict depends on repository material outside `docs/redesign/`, record it as an
external comparison not yet in scope and ask the owner before opening that material. Do not allow an
outside document to silently redefine the redesign.

## Review, lock, and stop

Before requesting Stage 1 approval, apply the complete Layer 1 review and lock gate from
`docs/redesign/guidelines/01-high-level-architecture.md`. Review the artifact set as one model, use
the two immutable proposal reviews as adversarial scenarios, and resolve every material high-level
gap or contradiction.

Do not describe Stage 1 as approved until the owner explicitly approves the complete foundation.
After approval:

- mark the Stage 1 artifacts `approved and locked` without claiming implementation or current state;
- record approver, date, decision scope, negative consequences, and deliberate Stage 2 deferrals;
- state that changing a locked high-level decision requires an explicit reopen and renewed approval;
  and
- stop before Stage 2.

</instructions>

<context>

Layer 0 is approved by Arye Kogan (Jig owner) on 2026-07-14. Stage 1 has not started, no Stage 1
decision is approved or locked, and `docs/redesign/design/` does not yet exist.

The immutable standalone proposal was created before the layered initiative. It is the primary
source of the owner's redesign direction, but it mixes proposal-internal agreed and draft material
and has not passed the new Stage 1 or Stage 2 approval model. Two independent reviews identify useful
strengths, contradictions, missing guarantees, and adoption risks. The new design must use that
source material deliberately, re-layer it according to the guidelines, and resolve material issues
through explicit owner decisions.

At handoff preparation time:

| Fact                 | Verified value                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Worktree             | `/Users/aryekogan/repos/agentic-workflow-kit/worktrees/jig/docs-deterministic-story-orchestration-proposal` |
| Branch               | `docs/deterministic-story-orchestration-proposal`                                                           |
| Governing goal       | `docs/redesign/GOAL.md`                                                                                     |
| Default source scope | `docs/redesign/`                                                                                            |
| New design home      | `docs/redesign/design/`                                                                                     |
| Verification command | `corepack pnpm check`                                                                                       |

Reverify live repository facts in Step 0; do not treat this table as a repository-state snapshot.

</context>

<out_of_scope>

- Editing the immutable standalone proposal or either independent review.
- Reading outside repository product, design, ADR, delivery, runtime, package, test, or source
  artifacts without explicit owner scope expansion.
- Copying the standalone proposal wholesale or preserving its document split by default.
- Encoding Stage 1 in the `design/` directory name.
- Stage 2 component contracts, exhaustive state machines, schemas, APIs, ports, adapters, or failure
  tables before Stage 1 approval.
- Runtime implementation, migration planning, delivery sequencing, or current-state publication.
- Claiming approval from prior proposal labels, review recommendations, document existence, or
  inference.

</out_of_scope>

<escalation>

Ask the owner whenever a choice changes the system boundary, trust model, authority ownership,
durability posture, concurrency or landing strategy, acceptance model, recovery guarantee, key
invariant, or source scope. If evidence conflicts, show the conflict and recommend a resolution with
its trade-off. Do not silently reconcile it or import an outside source.

</escalation>

---
