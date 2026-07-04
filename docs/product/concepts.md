---
title: "Tracks — parallel independent work"
status: draft — concept
---

# Tracks — parallel independent work

A **track** is one independent line of work — from product definition through execution —
that runs on its own, in parallel with other tracks in the same repo.

## What a track contains

Each track carries its own complete lifecycle artifact chain:
**PRD → design → plan → policy → work profile.** Every piece is scoped to that
track and advances independently. One repo hosts many tracks simultaneously.

## Why tracks exist

A repo or company often has multiple products or product areas — a small team where each
developer owns a distinct area, or a single project with several semi-independent
surfaces. Each area has its own product definition, its own design, its own plan, and its
own configuration. Running them as a single unit creates false dependencies: one area's
progress gates another's for no structural reason.

Tracks eliminate that coupling. Each proceeds at its own pace, with its own policy and
work profile, without waiting on or conflicting with the others.

## What is track-scoped

**Policy** and **work profile** are both per-track. Policy — the governance contract that
sets gating posture, merge spectrum, approval rules, and concurrency ceiling — is
track-scoped, but it still honors **repo-level floors** a single track cannot weaken.
Work profile — which model, what effort, prompt strategy, and how roles are realized —
is track-scoped and freely tunable.

This is the "policy is protected; config is free" line from the package. See
[Jig — the execution engine](./jig.md) guarantee 2 for the full detail.

**Repo-level floors** are themselves a distinct, **repo-scoped policy artifact** — a small policy
the repo owner authors once, separate from any track's policy. It sets the floors every track in
the repo inherits: minimum gating, required reviews, and the anti-gaming protections. A track's
own policy may **tighten** these floors but never weaken them, and because the floors govern
safety, changing the repo-level artifact is itself a governed action (guarantee 2, CFG-1).

## How tracks relate to the products

Each track feeds Jig its own execution plan and configuration. The supporting products —
define-product, product→design, design→plan — each operate per-track: a design is a
design _for a track_, a plan is a plan _for a track_, a policy is set _for a track_.
Nothing in the suite forces a single product definition or a single plan across all tracks
in a repo.

## Stories — the unit of work

A **story** is the unit of work Jig executes and lands: one reviewable change with its own
done conditions. An [execution plan](./jig.md#the-execution-plan--jigs-one-input) is a set of
stories. (The engineering design uses the neutral term _work item_ —
[ADR 0012](../design/decisions/0012-neutral-unit-term-work-item.md); at product altitude they
are the same thing — the unit Jig schedules, runs, and lands.)

Stories declare **dependencies** on one another. Jig keeps a story ineligible until its
prerequisites have landed, so work never starts out of order, and a blocked story halts its
downstream dependents while independent stories keep moving (see guarantee 3, ISO-1).

The decomposition nests cleanly:

- a **track** is one independent line of work and carries one **plan**;
- a **plan** is a set of **stories** with their declared dependencies;
- a **story** is one landed change with its own done conditions;
- **policy** and **work profile** are set per track and govern how its stories run.

## Runner and worker — the authority boundary

Two roles carry Jig's control boundary, and the difference between them is what makes delegation
safe:

- The **worker** is the contained coding agent — the thing that reads a story, writes code, and
  runs checks. It is the **Agent** seam, executing inside the **Execution Host** seam. The worker
  is _contained_: it never holds privileged credentials and cannot push, open a PR, merge, or
  widen its own authority.
- The **runner** is Jig's own trusted component. It holds privileged authority — credentials, and
  the power to push, open PRs, and merge — and performs those irreversible actions on the worker's
  behalf, only under policy and evidence gates. The runner is **Jig-core, not a seam**: the four
  swappable seams (guarantee 4) are Agent, Execution Host, Forge, and Work Source; the runner is
  the fixed part that governs them.

This split is the spine of guarantee 1 — the thing that writes code is never the thing that ships
it (FENCE-3, MERGE-2, SEC-3).

## SDK, providers, and conformance

The **SDK boundary** is Jig's programmatic product surface for first-party consumers. The CLI uses
that boundary today; a future MCP surface is expected to use it too. Product does not promise a
public package or stable external API today, but it does promise that first-party consumers should
not reach through Jig internals to get their work done.

A **provider** — called a _driver_ in the guarantee detail when discussing a concrete trusted
implementation — is an implementation behind one of Jig's swappable seams: Agent, Execution Host,
Forge, or Work Source. A provider can be bundled with Jig, owner-authored, or arrive later, but the
product promise is the same: it behaves as replaceable at the boundary, declares what authority it
needs, and proves what it can safely do before Jig grants autonomy. Bundled providers should
therefore use the same SDK-facing ports and registration seams a future extracted or custom
provider would use, instead of private core shortcuts.

The **conformance surface** is the repeatable proof behind that trust. It gives Jig and provider
authors a shared way to check capability, containment, declared authority, and adversarial cases.
The product need is reusable proof before trust; whether the supporting surface is internal-only,
published as `jig-testkit`, or split later is still an open packaging/product question. The
ability to bring a compatible custom provider is settled product scope; the open question is the
public ecosystem around such providers.

## Story and run outcomes

The full internal lifecycle is design's to define; the product-visible states an owner sees and
acts on are these.

A **story** ends in one terminal outcome, or sits in the one transient waiting state:

- **landed** — merged, on evidence that satisfied policy;
- **done** — evidence is met, but the merge is still pending. Branch protection, a merge queue,
  or a conflict can hold a done story (see guarantee 1, MERGE-4);
- **rejected** — the owner declined the story at the doorbell. Terminal and on the record; it is
  not resumed. (Distinct from _blocked_ — Jig finding the work cannot proceed — and from
  _stopped_, which pauses the whole run rather than ending a story.);
- **blocked** — cannot proceed; the reason is recorded;
- **parked** _(transient)_ — waiting on an owner decision, such as an approval at the doorbell. A
  parked story resumes when the owner approves, or becomes _rejected_ if they decline.

**stopped** is a **run**-level state, not a story outcome: the whole run was halted cleanly.
Stories that had not yet reached a terminal outcome stay where they were and resume from their
last safe checkpoint when the run restarts (see guarantee 3).
