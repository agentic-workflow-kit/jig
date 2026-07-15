# AGENTS.md — Jig redesign documentation

This is the closest working contract for `docs/redesign/` and everything below it. It inherits the
repository-level `AGENTS.md` except where this file narrows the redesign initiative's source scope,
layer order, and review authority.

## Authority after the documentation reset

Arye Kogan remains the product and architecture decision owner. The reset is editorial and
organizational; it does not discard or reopen his prior explicit decisions.

Immediately after the reset there is no active canonical Layer 0 or newly locked Layer 1. The new
Layer 0 project definition becomes Layer 1's governing input only after its exact final candidate
passes the Layer 0 review gate. The new Layer 1 foundation becomes approved and locked only after
its exact final candidate passes the Layer 1 review gate.

The owner-approved execution flow delegates each independent architect reviewer only to approve a
faithful organization and re-expression of already-established intent. A reviewer cannot invent or
materially change an outcome, scope boundary, quality requirement, decision owner, risk, guarantee,
architecture decision, trade-off, negative consequence, or deliberate deferral. If faithful
re-expression requires such a change, return `OWNER_DECISION_REQUIRED` and stop for Arye.

## Source roles and boundary

- `architecture-design-and-documentation-guide.md` defines the authoring and review method: the
  design is organized by abstraction level and view type, per the explicit owner
  structure-revision instruction of 2026-07-15. It selects no product or architecture decision.
  The `guidelines/` handbook is the earlier stage-gate distillation and is scheduled for rewrite;
  where they differ, the source guide governs.
- `design/` contains the new active canonical artifacts, organized as a project brief, canonical
  model, views, invariants, and decision records; approval advances one layer gate at a time.
- `raw/` contains historical evidence and provenance. Its former presentation, labels, approval
  claims, plans, and handoffs are not current authority and must not be executed.
- The former goal, source-role rules, and explicit project-level owner decisions are binding Layer 0
  re-authoring inputs.
- Former Decisions D1–D9, Invariants I1–I21, accepted negative consequences, deliberate deferrals,
  and the artifact-shape decision are binding Layer 1 fidelity inputs at the correct altitude.
- The archived standalone proposal is directional evidence. Archived reviews are adversarial
  evidence. Neither selects a new decision.

Repository material outside `docs/redesign/` is excluded as governing input unless Arye explicitly
expands source scope for a named comparison, constraint, or verification question. Reading
repository instructions, verifying git state, or running documentation checks does not expand this
boundary.

Do not edit historical files under `raw/` except for a relocation-only relative-link destination
required to preserve its original target. Record every such repair in `raw/README.md`.

## Layered authoring order

1. Verify the worktree, branch, `HEAD`, merge base, and status.
2. Read the repository and redesign `AGENTS.md` files.
3. Read the redesign and design indexes.
4. Read the sections of `architecture-design-and-documentation-guide.md` that own the artifact type
   being authored or reviewed (its level, its view type, and the diagram rules).
5. Read the approved earlier-layer artifact as the next layer's governing input contract; do not
   reread earlier-layer guidance unless auditing or reopening that layer.
6. Use the smallest connected artifact set that completely answers the active layer's questions.
7. Apply the exact active-layer review gate and stop before the next layer until the gate passes.

Maintain one coherent model of identities, responsibilities, boundaries, relationships, ownership,
lifecycle, and evidence. Use progressive disclosure: the layer's primary artifact must give its
reader a complete connected narrative without requiring `raw/`; linked artifacts answer narrower
deep-dive questions without redefining canonical facts. Keep facts, assumptions, proposals, owner
decisions, approval state, and implementation evidence visibly distinct.

Every diagram must identify its question and view type, audience, purpose, scope and exclusions,
state, owner, sources, and related views. Use one abstraction level, stable identities, directed
verb labels, and a legend for colors, shapes, borders, line styles, and abbreviations. Meaning must
not depend on color. Mermaid stays inline and uses the repository-required init theme block,
colored subgraph regions, and category `classDef` styling.

Stop at the active layer. Do not smuggle later-layer components, ports, states, contracts,
technology, implementation, migration, delivery sequencing, or current-state claims into an earlier
artifact.

## Review and stop rules

- Authors do not review their own work. Reviewers are independent and read-only.
- A reviewer returns `PASS`, `CHANGES_REQUIRED`, or `OWNER_DECISION_REQUIRED` against the exact
  active-layer gate.
- `PASS` applies only to the exact final candidate, including approval metadata. Any post-PASS edit
  requires reviewer recheck.
- After at most three unsuccessful author/reviewer loops, stop for Arye with the unresolved
  findings. The coordinator must not decide around the reviewer or proceed to the next layer.
- By the explicit owner continuation instruction of 2026-07-15, recorded in the
  [review and approval record](./design/decisions/review-and-approval-record.md), the former
  post-Layer 1 execution stop is lifted: the Layer 1 independent-review gate still applies before
  Layer 1 is treated as locked; Layer 2 may be authored against the proposed Layer 1 with D1–D9
  and I1–I21 as fixed inputs; and Layer 2 advances through its own author, independent review,
  and owner-stop gate. Owner decisions and invariants still change only by explicit owner decision.

## Verification

Changes confined to `docs/redesign/` require documentation checks only. Run `git diff --check`,
`corepack pnpm format:check`, and `corepack pnpm links:check`, plus the active layer's fidelity and
review checks. Do not run code lint, typecheck, build, package-boundary, test, coverage, or the full
repository gate. A green documentation check is not architecture approval.
