---
title: Wave 0 — design charter & conventions
wave: 0
status: charter draft
depends_on_waves: []
---

# Wave 0 — design charter & conventions

## Purpose

Establish the design track's own charter and the shared conventions and ledgers the later design
waves (1 through 6) build on: the boundary rule, the stub rule, the deliverable rule, and the
naming/numbering conventions for invariants, decisions, and IDs. Wave 0 is scaffold and method —
it does not open a jig design frame, author any jig entity, or deepen any jig domain/entity content
in `docs/design/`. Its two governance outputs (the design-layer charter and conventions doc) state
rules about how later design work is conducted; they are not themselves a piece of jig's design.

## Required input docs

- [`../../README.md`](../../README.md) — this track's own charter (goal, non-goals, dependency
  rule, boundary rule, stub rule, deliverable rule, method).
- `docs/product/guarantees.md` — the ID-bearing product commitments later waves reconcile to.
- `docs/design/notes/runtime-design-m5a.md` — the live `INV-*`/`SURF-*`/`FAIL-*`/`OBS-*`/`ENF-*`/
  `DEL-*`/`SEQ-*`/`FILE-*`/`VAL-*`/`STOP-*`/`CTX-*` vocabulary this wave's conventions story
  continues, never resets.
- `docs/design/decisions/README.md` — the existing ADR log (0001–0016) this wave's conventions
  story continues from 0017.

## Required output docs

- A design-layer charter doc at `docs/design/charter.md`, cited from `docs/design/README.md` (target
  resolved by the coordinator; see `stories/w0-s1-design-charter.md`).
- A conventions doc at `docs/design/conventions.md`, plus the decisions/ADR log continuing in place
  at `docs/design/decisions/` from `0017` (target resolved by the coordinator; see
  `stories/w0-s2-conventions-and-ledgers.md`).

## Questions it must answer

- What is the authoritative statement of the deep-design pass's goal, boundary rule, stub rule,
  and deliverable rule, and where does it live so later waves can cite one doc rather than
  re-deriving the rule each time?
- How do the three ID kinds — product IDs, invariant IDs, and technical-design handoff
  categories — stay namespaced so they never collide as more waves add IDs?
- What is the per-wave decision-log format, and how does it record both frame `InputResolution`
  dispositions and design-review suggestion dispositions (fix/reject/defer)?
- What is the open-questions ledger convention, so an open question raised in one wave is visible
  to, and not silently lost by, a later wave?

## What it must not decide

- Any jig domain entity, state machine, port, or provider behavior — that is Waves 1 through 4b.
- Any implementation planning or code — out of scope for the whole track until the design waves
  settle.
- Field-level schema or TypeScript interfaces — deferred per `docs/design/README.md`.

## Exit criteria

- `w0-s1-design-charter` and `w0-s2-conventions-and-ledgers` are both run and settled (zero open
  blocking suggestions from `review-technical-design`, applied at the light method these stories
  specify).
- The design-layer charter doc and the conventions/decisions continuation exist at whatever
  targets the coordinator resolves the two stories' open questions to.
- The `INV-*` ledger's next-available number and the ADR log's next-available number (0017) are
  both recorded and unambiguous for Wave 1 to consume.

## Evidence required

- This charter (`README.md`).
- The two story briefs' own evidence: each story's authored design_targets, its (light-method)
  design-review report, and its decisions.md entries.
- This wave's [`decisions.md`](./decisions.md).

## Story order

1. [`w0-s1-design-charter`](./stories/w0-s1-design-charter.md) — the design-layer charter itself.
2. [`w0-s2-conventions-and-ledgers`](./stories/w0-s2-conventions-and-ledgers.md) — the shared
   conventions and ledgers, depends on `w0-s1`.
