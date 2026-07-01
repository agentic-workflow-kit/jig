---
title: "ADR 0015 — Bootstrap/init is a distinct core concern"
status: applied
---

# ADR 0015 — Bootstrap/init is a distinct core concern

## Context

The fixed-logic-vs-interface cut had no home for the launch phase — the work that turns authored
configuration into a live run: load and validate the plan, bind the policy at launch, set up the
workspace, wire the provider adapters, run a storage preflight, and allocate run identity.

## Decision

Recognise **bootstrap / init** as a distinct core concern — the composition root and launch
sequence. It sits on the seam between contracts (loaded and wired) and core (the ready run it
produces). Its home is [`core/bootstrap.md`](../core/bootstrap.md). In the runtime flow it is the
first phase; in the folder layout it is a core file. `preview` is its recorded-but-non-committing
form (it emits its `run.previewed` audit event but commits no run).

## Consequences

`core/bootstrap.md` added; a bootstrap→core flow diagram added to `core/README.md` alongside the
structure diagram (two lenses: ownership vs. lifecycle).

- Date: 2026-07-01
- Origin: design-layer restructure
