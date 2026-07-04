---
id: w0-s2-conventions-and-ledgers
wave: 0
status: designed
depends_on: [w0-s1-design-charter]
design_targets: [docs/design/conventions.md] # resolved by coordinator; ADR log continues in place at docs/design/decisions/ from 0017
reconciles_to: [SEE-1, SEE-2, SEE-3]
---

# w0-s2-conventions-and-ledgers — establish shared conventions and ledgers

## Objective

Brief a future design session to establish the shared conventions and ledgers every later design
wave depends on: the continued `INV-*` invariant ledger, the continued ADR/decision log, a
namespacing rule so the three ID kinds in play never collide, a per-wave decision-log format, and
an open-questions ledger convention. This session moves from "conventions exist only implicitly,
by precedent, in `runtime-design-m5a.md` and `docs/design/decisions/`" to "conventions are stated
once, explicitly, so every later wave's stories can point at one doc instead of re-deriving
numbering and format rules from precedent." It depends on `w0-s1-design-charter` because the
conventions this session states operate under that charter's boundary/stub/deliverable rules.

## Inputs to read

- `w0-s1-design-charter.md` (this wave's sibling story) and its settled output — the design-layer
  charter this session's conventions operate under.
- `docs/design/notes/runtime-design-m5a.md` — the live invariant and handoff-category vocabulary
  (`INV-001..008`, `SURF-001..006`, `FAIL-001..004`, `OBS-001..004`, `ENF-001..004`,
  `DEL-001..006`, `SEQ-001`, `FILE-001`, `VAL-001`, `STOP-001..004`, `CTX-001..005`) this session
  continues, never resets.
- `docs/design/decisions/README.md` — the existing ADR log, decisions 0001 through 0016, whose
  numbering this session continues from 0017.
- `docs/product/guarantees.md` — the product ID families (e.g. `FENCE-1`, `CFG-10`) this session's
  namespacing rule must keep distinct from invariant IDs and handoff categories.
- `agentic-workflow-kit/technical-design/skills/review-technical-design/SKILL.md` — the suggestion
  schema and `D-###` decision-disposition shape (`fix`/`reject`/`defer`) this session's per-wave
  decision-log format is built on.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc(s) at the design_targets: the conventions doc and the decisions/ADR log
   continuation.
2. Open questions, logged (never invented answers).
3. Invariants preserved and any added — continuing the `INV-*` ledger from `INV-009` onward,
   never resetting numbering. This session is expected to describe the ledger's continuation
   rule, not necessarily add a new invariant itself; if it adds none, say so explicitly.
4. Risks and deferred decisions.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- How does the `INV-*` ledger continue from `INV-009` onward without renumbering or duplicating
  `INV-001` through `INV-008`, and where does the continued ledger live (a single running list,
  or per-area lists that a track-level index rolls up)?
- How does the ADR/decision log continue from `0017` onward, and does it stay one flat log at
  `docs/design/decisions/` or fork into a per-wave log that a track-level view rolls up (note:
  this track's own per-wave `decisions.md` — e.g.
  `waves/wave-0-charter/decisions.md` — already exists as a separate, planning-scoped decision
  log; this session's job is to state how the two relate, not to replace either)?
- How are the three ID kinds namespaced so they never collide: product IDs (`FENCE-1`, `CFG-10`,
  ...), invariant IDs (`INV-001`, ...), and technical-design handoff categories (`SURF`/`FAIL`/
  `OBS`/`ENF`/`DEL`/`SEQ`/`FILE`/`VAL`/`STOP-*`)?
- What is the per-wave decision-log format — the `D-###` entry shape recording both a frame
  `InputResolution` disposition and a design-review suggestion disposition (`fix`/`reject`/
  `defer`), consistent with `review-technical-design`'s suggestion schema?
- What is the open-questions ledger convention — how is an open question raised in one wave kept
  visible to, and not silently lost by, a later wave that depends on it?

## Invariants to preserve

- `SEE-1`, `SEE-2`, `SEE-3` — the conventions this session defines are themselves a form of
  observability substrate: they must keep the record of decisions and open questions structured,
  durable, and inspectable, consistent with jig's own observability guarantee applied
  reflexively to its design process.
- The full `INV-*` ledger through `INV-008` must be preserved verbatim; this session states the
  continuation rule, not a revision.

## Must not decide

- Any jig domain entity, state machine, port shape, or provider behavior — reserved for Waves 1
  through 4b.
- The design-layer charter's own content (goal, boundary rule, stub rule, deliverable rule) —
  that is `w0-s1-design-charter`, which this story depends on and does not re-open.
- Field-level schema, TypeScript interfaces, or JSON Schema — deferred per `docs/design/README.md`
  and this track's own non-goals.

## Exit criteria

- The conventions doc exists at its resolved target and states: the `INV-*` continuation rule,
  the ADR continuation rule (from 0017), the three-ID-kind namespacing rule, the per-wave
  decision-log format, and the open-questions ledger convention.
- Every later wave charter and story in this track can cite this doc instead of re-deriving any
  of the five conventions above.
- design-review verdict settled (zero open blocking suggestions), applied at the light method
  below.

## Evidence required

- The strategic-only frame equivalent (see "Design review & handoff" below).
- The authored design_targets.
- The design-review report.
- The decisions.md entries (this wave's `decisions.md`).

## Design review & handoff

This session runs the technical-design method itself, at a **light weight**, for the same reason
as `w0-s1`: no new jig entity, port, state machine, or provider behavior is in scope — only the
naming and bookkeeping conventions later design sessions use.

1. frame-technical-design (light: strategic-only) — confirm no jig entity is in scope; the only
   "ownership" question is which doc(s) host the conventions and ledger continuation, not a jig
   domain ownership question.
2. author-technical-design — the conventions doc (and the decisions/ADR log continuation, if a
   structural change to the log is needed) at design_targets.
3. review-technical-design — the three lenses still apply (architecture-enforceability checks
   the namespacing rule is actually collision-free against the cited product/invariant/handoff
   ID examples; domain-correctness checks the conventions are internally consistent; agreement-
   integrity checks nothing here contradicts `w0-s1`'s settled charter). Settled = zero open
   blocking suggestions.

Handoff: when settled, update status and note the resolved design_targets path in the track's
future traceability matrix.

## Coordinator resolution (design_targets)

Resolved: the conventions live in a new standalone `docs/design/conventions.md`. The ADR/decision
log continues in place at `docs/design/decisions/` from `0017` — no structural change and no new
log file; the conventions doc states the continuation rule and points at the existing log. The
future session authors `docs/design/conventions.md` and adds one pointer line to
`docs/design/README.md`; both edits are that session's own, not this planning unit's.
