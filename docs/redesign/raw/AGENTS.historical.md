# AGENTS.md — Jig redesign workspace

This is the closest working contract for `docs/redesign/` and everything below it. It inherits the
repository-level `AGENTS.md` except where this file narrows the redesign initiative's source scope.
Outside this directory, the repository-level instructions continue to govern unchanged.

## Authority and source boundary

For this initiative, authority descends in this order:

1. `GOAL.md` and explicit Jig owner decisions;
2. the explicitly approved and locked Stage 1 high-level architecture;
3. the explicitly approved Stage 2 decision-complete architecture.

Keep authority, method, directional material, reference material, and evidence distinct:

- `GOAL.md` defines the approved initiative, scope, stage gates, and decision owner.
- `guidelines/README.md` plus only the active layer page define how to craft, review, approve, and
  lock architecture. They do not select the architecture.
- `deterministic-story-orchestration/` is the immutable primary source of redesign direction. Its
  internal `agreed`, `draft`, and `proposal` labels are not initiative approval.
- `reviews/` contains immutable adversarial evidence. Review findings create questions and failure
  scenarios; they are not automatic design decisions.
- Repository files under `docs/product/` may be read without additional approval as reference for
  the product idea: intended outcomes, audience, concepts, and product framing. For this redesign,
  they are not governing contracts, do not outrank `GOAL.md` or explicit owner decisions, and must
  not silently import the current product architecture or guarantees into the new design.
- All other repository material outside `docs/redesign/` is excluded as architecture input by
  default. This includes `docs/design/`, ADRs, delivery and archive records, runtime documentation,
  packages, source, and tests. Read or use a named outside source only after the owner explicitly
  expands scope for a comparison, constraint, or verification question.

Reading repository instructions, verifying the checkout and git state, or running repository
documentation and validation commands does not expand the architecture source boundary.

When product reference material differs from the redesign, label the comparison rather than
silently reconciling it. Ask the owner before treating an outside product idea as a required promise
or constraint. Record any imported promise using the conflict format required by `GOAL.md`.

## Working order

Before proposing architecture or editing canonical design artifacts:

1. Verify the worktree path, branch, `HEAD`, merge base, and working-tree status.
2. Read this file and the repository-level `AGENTS.md`.
3. Read `README.md` and `GOAL.md` in full.
4. Read `guidelines/README.md` and only the page for the active layer.
5. For Stage 1, read the complete immutable standalone proposal in its index order, then read both
   independent reviews.
6. Use `HANDOFF-stage-1-high-level-architecture.md` for the Stage 1 orientation report, decision
   plan, acknowledgement gate, crafting order, review gate, and stop point.
7. Wait for the required owner acknowledgement or decision before creating or changing canonical
   artifacts under `design/`.

Keep deciding separate from doing. Present material alternatives and trade-offs before selecting a
high-level architecture. Do not infer owner approval from document existence, prior proposal labels,
review recommendations, or silence.

## Artifact rules

- Do not edit the standalone proposal or either independent review.
- Create the new canonical architecture only under the stable `design/` path. Record the active
  layer and approval state in artifact metadata, not in directory names.
- Create the smallest connected artifact set that closes the active layer's decisions.
- Maintain one canonical model of identities, responsibilities, boundaries, relationships,
  ownership, lifecycle, and evidence. Views select from that model; they do not invent parallel
  architectures.
- Keep facts, product-reference observations, assumptions, proposals, explicit owner decisions, and
  implementation evidence visibly distinct.
- Follow the active guideline page's artifact, diagram, review, and approval contracts.
- Keep every new Stage 1 artifact `proposed` until the complete foundation passes the Layer 1 review
  gate and receives explicit owner approval.
- After Stage 1 approval, record the approver, date, decision scope, negative consequences, and
  deliberate Stage 2 deferrals; mark the foundation `approved and locked`; then stop before Stage 2.
- Reopening a locked Stage 1 decision requires an explicit reopen, impact statement, and renewed
  owner approval.

## Scope and stop rules

- Stage 1 defines and locks the high-level architectural foundation. Do not hide a material
  high-level decision in a Stage 2 placeholder.
- Stage 2 may refine the locked foundation but cannot change it without reopening Stage 1.
- Implementation, migration planning, delivery sequencing, and current-state publication remain
  outside this initiative.
- Do not update unrelated repository documentation merely to make it agree with a proposal.
- If a requested action would broaden the source boundary, change a locked decision, or enter a
  later layer, stop and obtain explicit owner direction first.

## Verification

Changes confined to `docs/redesign/` require documentation checks only. Run the relevant Markdown
formatting and documentation-link checks and report the observed result. Do not run code-related
lint, typecheck, build, package-boundary, test, or coverage checks, and do not run the full
`corepack pnpm check` gate merely for redesign-document changes.

Do not treat a green documentation check as architecture approval.
