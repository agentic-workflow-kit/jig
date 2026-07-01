---
title: "Jig — design track"
status: draft — planning track charter
---

# Jig — design track

This is the track index and charter for jig's deep-design pass: the planning-organized sequence
of design sessions that deepens `docs/design/` from its current overview/stub altitude to an
authored, review-settled design. This file is authoritative for the track itself — the waves and
stories underneath it read this charter before their own.

## Goal

Deepen jig's design, wave by wave, from "overview + stub" to an authored design that has passed
its own design-review with zero open blocking suggestions. Each wave produces durable design
docs that reconcile to the product commitments in `docs/product/guarantees.md` and continue the
invariant vocabulary already live in `docs/design/notes/runtime-design-m5a.md`
(`INV-001..008`, `SURF-001..006`, `FAIL-001..004`, `OBS-001..004`, `ENF-001..004`, `DEL-001..006`,
`SEQ-001`, `FILE-001`, `VAL-001`, `STOP-001..004`, `CTX-001..005`).

## Non-goals

- No implementation planning or code stories until the design waves are complete and reviewed.
  This track produces design docs, not an implementation plan or delivery tracker.
- No TypeScript interfaces, JSON Schema, or frozen field-level schemas. `docs/design/README.md`
  is explicit that field-level schema is deferred; this track does not front-run that.
- No re-litigating product. A design session that finds a product gap routes it back to
  `docs/product/`, per the dependency rule below.

## Dependency rule

Product owns _what and why_; design owns _how_; planning organizes the work and never overrides
either. When a design session run under this track finds that a product or design commitment is
wrong, missing, or contradictory, it is recorded as an open question or a routed finding back to
the owning doc — never silently resolved inside the design session's own output. This is the same
discipline jig's own design layer names for itself ("design reconciles to the product layer...and
names product conflicts where found," `docs/design/README.md`).

## Boundary rule

Core owns ports, invariants, state machines, the authority model, and event semantics. Providers
(agent, execution host, forge, work source) implement against ports and must **not** redefine
core policy, evidence, authorization, or state semantics — they earn autonomy through capability
attestation (EARN-1, EARN-2, STACK-4) and swap behind the four seams (STACK-2), but the seam
boundary itself, and everything it governs, is core's. A design session that finds a provider
area needing to originate a policy, evidence, or state rule routes that finding back to core's
design, rather than defining it locally.

## Stub rule

A stub is a later, explicit, conservative allowance — not a default. When a design session needs
to leave a capability unbuilt, it records the stub visibly: what is deferred, why, and what proof
gate must pass before it stops being a stub (mirroring `docs/design/notes/runtime-design-m5a.md`'s
distinction between `exercised` and `named extension point`). A stub is never mistakable for a
real, working capability in the record. This track only records the rule here; it does not itself
decide which areas of jig's design get to stay stubs — that is each wave's and story's own call,
made visibly.

## Deliverable rule

Every design session under this track produces five durable things, regardless of wave:

1. Durable design doc(s) — the authored or deepened content at its `design_targets`.
2. Open questions, logged — never invented answers.
3. Invariants preserved, and any new invariants added — continuing the `INV-*` ledger from
   `runtime-design-m5a.md`, never resetting its numbering.
4. Risks and deferred decisions.
5. Review evidence — the design-review report plus the wave's `decisions.md` dispositions.

## Method

Every design session in this track runs the `technical-design` method on itself: **frame →
author → design-review** (`frame-technical-design`, `author-technical-design`,
`review-technical-design` in
`agentic-workflow-kit/technical-design/skills/`). A wave's `frame.md` seeds the frame step for
its stories; a story does not start framing from nothing.

**Two distinct reviews — keep this crisp.** This track produces two different kinds of review
evidence, and they must not be conflated:

- **The design-method review a session runs over the jig design it authors** — the
  `review-technical-design` pass (architecture-enforceability, domain-correctness,
  agreement-integrity lenses) a future design session runs over its own authored design docs,
  recorded in that wave's `decisions.md`. This is design-content review.
- **Build-time QA of this scaffold** — ordinary review of the planning-track files themselves
  (this README, the wave charters, the story briefs) as documents: are they internally
  consistent, do they cite real sources, do they follow the templates. This is scaffold review,
  not design review, and it does not touch jig's design content at all.

A session settles only when the first kind of review is settled (zero open blocking suggestions)
over its authored design docs.

## Wave table

| Wave                                                                      | Purpose                                                                                                                |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [Wave 0 — design charter & conventions](./waves/wave-0-charter/README.md) | Establish this track's charter and the shared conventions/ledgers later waves build on. Scaffold/method; no jig frame. |
| Wave 1 — domain model                                                     | Deepen jig's entity and domain model beyond the `core/README.md` overview.                                             |
| Wave 2 — state machines                                                   | Deepen the run and story state machines named in `core/README.md` and `runtime-design-m5a.md`.                         |
| Wave 3 — ports                                                            | Deepen the four driver-seam ports and the operator/control-plane surfaces.                                             |
| Wave 4a — core parts                                                      | Deepen core: records, plan/policy/evidence, authority, bootstrap.                                                      |
| Wave 4b — provider parts                                                  | Deepen the provider seams: agent, execution-host, forge, work-source — implemented against Wave 3's ports.             |
| Wave 5 — red team                                                         | Adversarially probe the design settled by Waves 1–4 for gaps, contradictions, and under-specified authority.           |
| Wave 6 — implementation phasing                                           | Sequence the settled design into implementation-ready phases (handoff to a future delivery track, not code itself).    |

Waves 1–6 are named here for context; this unit (Wave 0) does not author their charters or
stories. Each wave's own charter and stories are authored when that wave starts.

## ID and status conventions

IDs and statuses used across this track (story IDs, decision IDs, invariant numbering) are
defined in [`session-template.md`](./session-template.md) and continued by
[`waves/wave-0-charter/stories/w0-s2-conventions-and-ledgers.md`](./waves/wave-0-charter/stories/w0-s2-conventions-and-ledgers.md),
which briefs the session that establishes the full convention set.

## Track-level artifacts (authored at track integration, not here)

The following track-wide artifacts are placeholders — named so later waves know they exist, but
not authored by this unit:

- `dependency-dag.md` — the cross-wave dependency graph, once more than one wave has stories.
- `waves.md` — a rolled-up view across all wave charters, once Waves 1–6 exist.
- `traceability.md` — the matrix tracing design_targets and reconciles_to IDs across the whole
  track, updated as sessions settle.

## Related

- [`session-template.md`](./session-template.md) — the reusable session prompt and the story /
  wave-charter skeletons every future session copies.
- [`waves/wave-0-charter/README.md`](./waves/wave-0-charter/README.md) — this unit's own wave
  charter.
- [Jig — planning](../README.md) — the planning-layer charter this track sits under.
- [Jig — design](../../design/README.md) — the design layer this track deepens.
