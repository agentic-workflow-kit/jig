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

## How tracks relate to the products

Each track feeds Jig its own execution plan and configuration. The supporting products —
define-product, product→design, design→plan — each operate per-track: a design is a
design _for a track_, a plan is a plan _for a track_, a policy is set _for a track_.
Nothing in the suite forces a single product definition or a single plan across all tracks
in a repo.

## Stories — the unit of work

A **story** is the unit of work Jig executes and lands: one reviewable change with its own
done conditions. An [execution plan](./jig.md#the-execution-plan--jigs-one-input) is a set of
stories. (The engineering design sometimes calls this unit a *task*; at product altitude they
are the same thing — the unit Jig schedules, runs, and lands.)

Stories declare **dependencies** on one another. Jig keeps a story ineligible until its
prerequisites have landed, so work never starts out of order, and a blocked story halts its
downstream dependents while independent stories keep moving (see guarantee 3, ISO-1).

The decomposition nests cleanly:

- a **track** is one independent line of work and carries one **plan**;
- a **plan** is a set of **stories** with their declared dependencies;
- a **story** is one landed change with its own done conditions;
- **policy** and **work profile** are set per track and govern how its stories run.

## Story outcomes

Every story reaches one product-visible outcome. The full internal lifecycle is design's to
define; the states an owner sees and acts on are:

- **landed** — merged, on evidence that satisfied policy;
- **done** — evidence is met, but the merge is still pending. Branch protection, a merge queue,
  or a conflict can hold a done story (see guarantee 1, MERGE-4);
- **parked** — waiting on an owner decision, such as an approval at the doorbell;
- **blocked** — cannot proceed; the reason is recorded;
- **stopped** — the run was halted cleanly and can be resumed later.
