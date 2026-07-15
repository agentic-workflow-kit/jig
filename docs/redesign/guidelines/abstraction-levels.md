---
title: "Abstraction levels — what belongs where"
purpose: Define the abstraction levels of a design documentation set, what each level includes and excludes, and how to keep detail at the level that owns it.
audience:
  - Architecture authors
  - Independent reviewers
scope: Generic level definitions and altitude discipline; view-type selection and gate semantics live in their own chapters.
state: current
status: active operational standard — generalized rewrite of 2026-07-15
owner: Architecture documentation owner
last_verified: 2026-07-15
sources_of_truth:
  - ../architecture-design-and-documentation-guide.md
related:
  - ./README.md
  - ./view-types.md
  - ./communication-contracts.md
  - ./gates-and-reviews.md
---

# Abstraction levels — what belongs where

Levels are zoom, not process. A level says how far in a fact sits, not when it gets written or who
approves it. Work on any level whenever its governing inputs exist; record approval per artifact
(see [gates, reviews, and change](./gates-and-reviews.md)).

Most projects need Level 0, Level 1, and Level 2. Create lower levels only where a reader has a
concrete question there; prefer links and generated material at the bottom.

## Level 0 — project definition

**Question:** Why does this exist, for whom, and under which constraints will success be judged?

Include the problem and affected people, observable outcomes with implementation-independent
success measures, required capabilities, scope and aggressive non-goals, material quality scenarios
(written as evaluable situations, not adjectives), constraints, accepted risks and burdens,
assumptions, decision ownership, and the explicit questions the next level must answer.

Exclude any solution shape: named internal units, responsibility allocations, lifecycle vocabulary,
schemas, technology, migration, and current-state claims. If the brief already names the solution,
the architecture can no longer be judged against the problem.

**Done when:** a reader can judge any later design against this definition without asking its
author what was meant.

## Level 1 — system-level architecture

**Question:** What is the system's boundary and posture — who and what surrounds it, who holds
which authority, how does work progress, what is durably true, and which rules must every later
decision preserve?

Include the system context (the boundary and every external person and system that matters), the
allocation of responsibility and trust, the high-level lifecycle and information flow, the
classification of durable versus replaceable state, the concurrency and failure posture, decision
records for each material choice, and a consolidated invariant set — the exact rules later design
must preserve, each traced to the decision that selected it and the Level 0 drivers it serves.

Exclude components, ports, schemas, algorithms, catalogs, technology, and provider specifics. Name
these exclusions explicitly as **deliberate deferrals** in the decision records: an inventory of
what the next level may decide, paired with a statement of what it may not change. A deferral list
is the single most effective tool against both premature detail and silently lost decisions.

**Done when:** every Level 0 handoff question has a named owning artifact, and the invariant set
plus deferral inventory together cover everything material — nothing high-level hides in "detail".

## Level 2 — runtime and detailed architecture

**Question:** What separately runnable or independently stored units realize the system, through
which named seams do they touch the world, and what contracts, catalogs, and bounds make the
Level 1 posture concrete?

Include the runtime/container decomposition with one-sentence responsibilities and owners, named
ports or seams (one per external relationship, so the Level 1 boundary stays checkable), process
and deployment shape, data and identity representation, exhaustive state machines and catalogs
where behavior must be closed, bound and budget classes with explicit exhaustion actions, and
mechanism or provider contracts. Consume the Level 1 deferral inventory item by item; do not
re-decide what is locked.

Exclude class-level structure, code layout, and configuration values that change without changing
the architecture. Express numeric limits as named bound classes whose values come from policy or
configuration, not as magic numbers baked into the design.

**Done when:** every deferral item is either decided here or explicitly re-deferred with a reason,
and every new decision traces to the invariants it preserves.

## Level 3 — selected component design

**Question:** How is one runtime unit internally organized where that organization is consequential?

Create component views only under a real trigger: several teams change the same unit, a security or
consistency boundary lives inside it, a migration depends on internal seams, or onboarding keeps
re-explaining the same structure. Model cohesive responsibilities — not source directories — and
map each component to the higher-level responsibility it realizes.

**Done when:** the view explains design intent a reader could not get from the code faster.

## Level 4 — implementation reality

**Question:** Where is this design implemented, configured, deployed, and observed?

Prefer links and generated artifacts: repositories and entry points, schemas, migrations,
infrastructure definitions, dashboards, runbooks. Hand-maintained code diagrams decay fastest;
generate on demand or link to the source of truth instead.

## Altitude discipline

- **One level per artifact.** A company-wide system and a class have no comparable meaning in one
  diagram. Link down instead of mixing.
- **Higher must stay simpler.** Zooming in adds detail; if a Level 1 view is busier than the
  Level 2 views under it, the Level 1 view is carrying facts that belong below.
- **No smuggling.** Later-level content inside an earlier artifact (a schema in the brief, a
  technology in the context view) silently converts an open decision into an accident. Reviewers
  should treat it as a defect even when the content is plausible.
- **No orphan detail.** Every lower-level fact should trace upward to the responsibility,
  invariant, or deferral that motivates it; detail that traces to nothing is either missing an
  upstream decision or does not belong.
- **Defer loudly.** When a decision is postponed, write it into the deferral inventory with its
  altitude. Silence is how decisions get made by accident.

## Where to go next

- Choosing the artifact kind within a level: [view types](./view-types.md).
- Making each artifact self-explanatory: [communication contracts](./communication-contracts.md).
- Approving and locking levels: [gates, reviews, and change](./gates-and-reviews.md).
