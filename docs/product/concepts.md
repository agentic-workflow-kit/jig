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
