---
title: "Jig — product"
status: draft — product layer
---

# Jig — product

This is the product layer for **Jig**, the deterministic execution engine of the
[agentic-workflow-kit](https://github.com/agentic-workflow-kit) suite. It owns the
product intent — _who Jig serves, what job it does, what it promises, and where its
boundaries are_ — and is the contract the design and delivery layers reconcile to.

Product owns **what and why**. Design owns **how** those promises are implemented and
verified (see [`docs/design/`](../design/)).

## Pages

| Page                             | What it covers                                                                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [jig.md](./jig.md)               | **Canonical hub** — audience, job, problem, promise, workflow, the guarantee summary, boundaries, success signals, and open product questions. Start here. |
| [guarantees.md](./guarantees.md) | **The five guarantees in detail** — the full, ID-bearing specification (FENCE, EARN, GUARD, DOOR, MERGE, SEC, CFG, RESUME, ISO, LIVE, STACK, DRIVE, SEE).  |
| [use-cases.md](./use-cases.md)   | **Worked scenarios** — overnight delivery, the doorbell, safe resume, swapping your agent — each making one guarantee concrete.                            |
| [concepts.md](./concepts.md)     | Cross-cutting product concepts users need: **tracks**, stories, runner/worker/verifier authority, SDK boundaries, providers, and conformance.              |

## Where Jig sits in the suite

`agentic-workflow-kit` is the umbrella for a family of standalone, composable products
across an agentic software-development lifecycle:

```text
PRODUCT ─────────► DESIGN ──────────► DELIVERY ─────────► LEARNING
define / PRD        technical design   plan → Jig (run)     feedback loop
```

**Jig is the delivery/execution engine** — it runs an approved plan under policy. The
upstream products (product definition, technical design, plan) are **peers, not parts of
Jig**: strong defaults that produce Jig's input, not prerequisites. Jig's one hard input
boundary is a valid execution plan.

> **Provenance.** This product layer was seeded from the `agentic-workflow-kit` tooling
> repo (`workflow-kit`) and is now maintained here as the canonical home. The source repo
> is reference-only and will be retired.
