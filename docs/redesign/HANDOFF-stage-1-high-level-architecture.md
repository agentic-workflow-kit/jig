# Fresh-session prompt — Stage 1 high-level architecture

Use the following prompt in a new Codex session.

---

You are the architecture partner for Jig's redesign initiative. Work in:

`/Users/aryekogan/repos/agentic-workflow-kit/worktrees/jig/docs-deterministic-story-orchestration-proposal`

<instructions>

Follow the closest `AGENTS.md` instructions. Use the `brainstorming` skill because this is open
architecture design. Keep deciding separate from doing, surface conflicts and tradeoffs directly,
and obtain explicit owner decisions rather than silently selecting material product changes.

Use `docs/redesign/guidelines/README.md` and
`docs/redesign/guidelines/01-high-level-architecture.md` as the required method for this session.
The guidelines index provides the shared contract and routing; the Layer 1 page is complete for
high-level architecture. Do not read later-layer pages or the comprehensive source guide unless a
specific unresolved question requires them. The guidelines govern documentation and modeling;
`docs/redesign/GOAL.md` and explicit owner decisions govern architecture. The goal's non-goals
override generic guidance about implementation, migration, rollout, and delivery sequencing.

Your only objective in this session is Stage 1: define, obtain explicit owner approval for, and
durably record the locked high-level architecture described by `docs/redesign/GOAL.md`. Do not
begin Stage 2 decision-complete design, implementation, migration planning, or delivery sequencing.

Treat these as immutable evidence:

- `docs/redesign/deterministic-story-orchestration/`
- `docs/redesign/reviews/2026-07-14-deterministic-story-orchestration-proposal-review.md`
- `docs/redesign/reviews/2026-07-14-deterministic-story-orchestration-proposal-codex-review.md`

Do not edit those files. New design must be recreated as a new, connected Stage 1 artifact set
outside the immutable proposal and review folders. You may reuse concepts only when they survive
fresh reasoning against the goal.

STEP 0 is a hard gate. Before proposing architecture or editing files:

1. verify the worktree path, branch, `HEAD`, merge base, and working-tree status;
2. read the closest repo instructions, `docs/redesign/README.md`,
   `docs/redesign/GOAL.md`, `docs/redesign/guidelines/README.md`, and
   `docs/redesign/guidelines/01-high-level-architecture.md` in full;
3. inventory the immutable proposal and both reviews without changing them;
4. report the verified state, your understanding of the Stage 1 scope, and a bounded design and
   documentation plan;
5. wait for owner acknowledgement before creating or editing the new Stage 1 artifact set.

After acknowledgement, first derive high-level requirements and candidate architectural shapes
from the goal. Then use the immutable proposal, reviews, current product, current design, ADRs, and
runtime behavior as evidence and adversarial checks rather than as defaults. Present important
alternatives and recommend one with explicit rationale. Work through owner decisions until the
Stage 1 areas in the goal are coherent and complete.

Apply the Layer 1 guidelines deliberately:

- define the audience, question, enabled decision, scope, abstraction level, state, and owner for
  every artifact before drafting it;
- establish one coherent architecture model with stable identities, responsibilities,
  relationships, ownership, lifecycle, and evidence links;
- use progressive disclosure from initiative context to system context and high-level runtime
  responsibilities, going lower only when a Stage 1 decision requires it;
- give each view one primary story and keep static structure, dynamic behavior, perspectives,
  decisions, and implementation reality separate;
- label all Stage 1 material `proposed` until explicit owner approval, then record it as approved
  and locked without implying it is already implemented or current; and
- use the Layer 1 review and lock gate before requesting Stage 1 approval.

For every conflict with the current product contract, use this structure:

- Current product promise:
- Proposed revision:
- Why the revision is preferable:
- Changed guarantee or tradeoff:
- Owner decision required:

Do not describe Stage 1 as approved until the owner explicitly approves it. Once approved, record
the approval and lock durably in the new Stage 1 artifact set. State that changing any locked
Stage 1 decision requires an explicit reopen and renewed owner approval. Stop after the Stage 1
lock and report what remains for Stage 2.

</instructions>

<context>

The initiative goal is new. Before it was established, a standalone deterministic story
orchestration proposal was developed in six commits and independently reviewed by Claude Fable and
Codex. No review findings have been applied and no unified review has been produced. The owner now
wants a first-principles redesign, beginning at the high level. The old proposal may contribute
useful ideas, but it is not the architecture to continue editing.

At the time this handoff was prepared:

| Fact                 | Verified value                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Worktree             | `/Users/aryekogan/repos/agentic-workflow-kit/worktrees/jig/docs-deterministic-story-orchestration-proposal` |
| Branch               | `docs/deterministic-story-orchestration-proposal`                                                           |
| Governing goal       | `docs/redesign/GOAL.md`                                                                                     |
| Documentation method | `docs/redesign/guidelines/README.md` plus `docs/redesign/guidelines/01-high-level-architecture.md`          |
| Verification command | `corepack pnpm check`                                                                                       |

Reverify the live repository state and all other current facts in STEP 0; do not treat this handoff
as a repository-state snapshot.

</context>

<out_of_scope>

- Editing the immutable standalone proposal or either independent review.
- Applying or compiling review findings before doing first-principles Stage 1 work.
- Treating current product, design, ADR, proposal, review, or runtime behavior as binding desired
  architecture.
- Stage 2 component and contract detail before explicit Stage 1 approval.
- Runtime implementation, migration planning, and delivery sequencing.
- Claiming approval from document labels, prior agreement, or inference.

</out_of_scope>

<escalation>

Ask the owner whenever a choice changes a product promise, authority boundary, trust model,
failure guarantee, recovery posture, or other locked high-level decision. If evidence conflicts,
show the conflict and recommend a resolution with its tradeoff. Do not silently reconcile it.

</escalation>

---
