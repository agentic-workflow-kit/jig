---
title: "ADR 0016 — Stub-first scaffold; preserve the M5a record rather than distribute it"
status: applied
---

# ADR 0016 — Stub-first scaffold; preserve the M5a record rather than distribute it

## Context

The design layer was rebuilt as a scaffold of short stubs. The dense M5a runtime-design document
(handoff-contract format, ~460 lines) could either be shredded into the new stubs now or
preserved as a source.

## Decision

Stand up short **stubs** per area — purpose, responsibilities, interface, one diagram, status —
and **preserve** the dense M5a runtime-design as an archived record at
[`notes/runtime-design-m5a.md`](../notes/runtime-design-m5a.md) to mine when deepening each stub,
rather than distributing it into the stubs now. Deepening a stub is the genuine next design work
and is done per area, with review, in place. Distributing a dense doc into fresh stubs would
either bloat them prematurely or produce low-quality dumps.

## Consequences

`notes/runtime-design-m5a.md` is preserved as the source of record; the stubs are marked WIP in
the design-layer status map; the per-area deepening is the pending design work.

- Date: 2026-07-01
- Origin: design-layer restructure
