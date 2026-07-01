---
id: w0-s1-design-charter
wave: 0
status: designed
depends_on: []
design_targets: [docs/design/charter.md] # resolved by coordinator; cited from docs/design/README.md
reconciles_to:
  [
    FENCE-1,
    FENCE-2,
    FENCE-3,
    EARN-1,
    EARN-2,
    GUARD-1,
    GUARD-2,
    DOOR-1,
    DOOR-2,
    DOOR-3,
    MERGE-1,
    MERGE-2,
    MERGE-3,
    MERGE-4,
    MERGE-5,
    SEC-1,
    SEC-2,
    SEC-3,
    CFG-1,
    CFG-2,
    CFG-3,
    CFG-10,
    RESUME-1,
    RESUME-2,
    RESUME-3,
    RESUME-4,
    RESUME-5,
    ISO-1,
    ISO-2,
    ISO-3,
    ISO-4,
    LIVE-1,
    LIVE-2,
    STACK-1,
    STACK-2,
    STACK-3,
    STACK-4,
    STACK-5,
    DRIVE-1,
    DRIVE-2,
    DRIVE-3,
    SEE-1,
    SEE-2,
    SEE-3,
    SEE-4,
    SEE-5,
    SEE-6,
  ]
---

# w0-s1-design-charter — author the design-layer charter

## Objective

Brief a future design session to author the design-layer charter: the single, authoritative
statement of the deep-design pass's goal, its boundary rule, its stub rule, and its deliverable
rule, at design altitude (not this planning track's own restatement of them). This session moves
from "these rules exist only as planning-track prose in `docs/planning/design-track/README.md`" to
"these rules are stated once, authoritatively, in the design layer itself, and every later design
wave cites that one doc rather than re-deriving or re-paraphrasing the rule." This is the
substrate Wave 1 onward reconciles to before any jig entity is authored.

## Inputs to read

- `docs/planning/design-track/README.md` — this track's own charter, whose goal / boundary /
  stub / deliverable rules this session restates at design altitude (not planning altitude).
- `../README.md` (this wave's charter) — Wave 0's purpose and required outputs.
- `docs/design/README.md` — the existing design-layer index, its status legend
  (overview/stub/contract v0/log/archive), and its "Product reconciliation" and "Deferred"
  sections, which this charter must sit alongside without duplicating.
- `docs/product/jig.md`, `docs/product/guarantees.md` — the full product commitment set this
  charter reconciles to at a high level (it does not re-litigate individual guarantees; later
  waves do that per-area).
- `docs/design/notes/runtime-design-m5a.md` — precedent for how design already reconciles to
  product and names conflicts rather than silently resolving them.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc(s) at the design_targets: the design-layer charter itself.
2. Open questions, logged (never invented answers).
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting numbering.
   This session is not expected to add new invariants; if it finds none, say so explicitly rather
   than omitting the section.
4. Risks and deferred decisions.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- What is the deep-design pass's goal, stated at design altitude, distinct from (but consistent
  with) this planning track's own framing of it?
- What is the boundary rule (core owns ports/invariants/state machines/authority/event semantics;
  providers implement against ports and never redefine core policy/evidence/authorization/state
  semantics), stated so later waves can cite it directly?
- What is the stub rule (a later, explicit, conservative allowance — never a default, never
  mistakable for a real capability), stated so a later wave can point to one sentence when it
  decides to leave something a stub?
- What is the deliverable rule (every design session produces durable design docs, open
  questions, invariants, risks, and review evidence), stated once so stories do not each
  re-explain it?

## Invariants to preserve

- All product-level guarantees listed in this brief's `reconciles_to` — this charter must not
  narrow, contradict, or silently drop any of them. It operates one level above them: it states
  the rules by which later waves reconcile design decisions to these guarantees, without itself
  making a design decision about any single guarantee.
- `reconciles_to` enumerates the guarantee families the charter states boundary/stub/deliverable
  rules about. `CFG-4` through `CFG-9` (computed-not-hand-set, guided setup, presets, open seams,
  prompt strategy, setup-runs-only-when-stale) are operational and preset mechanics the charter
  does not govern; their omission is deliberate scope, not an oversight.
- No new `INV-*` numbers are expected from this story; if the session finds it must add one, it
  continues from the next available number after `INV-008` (the last number in
  `runtime-design-m5a.md`) and records why in decisions.md.

## Must not decide

- Any jig domain entity, state machine, port shape, or provider behavior — reserved for Waves 1
  through 4b.
- The conventions and ledgers (ID namespacing, decision-log format, open-questions ledger) — that
  is `w0-s2-conventions-and-ledgers`, which depends on this story's settled charter.
- Field-level schema, TypeScript interfaces, or JSON Schema — deferred per `docs/design/README.md`
  and this track's own non-goals.

## Exit criteria

- The design-layer charter doc exists at its resolved target and states the goal, boundary rule,
  stub rule, and deliverable rule at design altitude.
- It cites, rather than restates verbatim, the planning-track charter it is descended from, so the
  two do not drift into two different wordings of the same rule.
- design-review verdict settled (zero open blocking suggestions), applied at the light method
  below.

## Evidence required

- This wave's frame.md equivalent: since this is scaffold/method with no jig entities, a
  strategic-only frame is sufficient (see "Design review & handoff" below) — its output is the
  evidence, not a separate frame.md file.
- The authored design_targets.
- The design-review report.
- The decisions.md entries (this wave's `decisions.md`).

## Design review & handoff

This session runs the technical-design method itself, at a **light weight**: because this story
introduces no new jig entity, port, state machine, or provider behavior — it only states rules
about how later design work is conducted — a full `frame-technical-design` pass (source map,
`InputResolution`, `AgreedSystemModel`, `architecture_mode`, `ddd_depth` selection) is
disproportionate. A **strategic-only frame** is sufficient: confirm the source map (the inputs
above), confirm there is no ownership/boundary/invariant/API/lifecycle/enforcement/delivery
decision in scope beyond restating the four rules, and proceed directly to authoring.

1. frame-technical-design (light: strategic-only) — confirm no jig entity is in scope; skip
   `AgreedSystemModel` context-candidate analysis since there are no new contexts.
2. author-technical-design — the charter doc at design_targets.
3. review-technical-design — the three lenses still apply (architecture-enforceability checks
   that no jig architecture leaked in; domain-correctness checks the four rules are stated
   consistently with product; agreement-integrity checks nothing here contradicts
   `AgreedSystemModel` from any prior session). Settled = zero open blocking suggestions.

Handoff: when settled, update status and note the resolved design_targets path in the track's
future traceability matrix.

## Coordinator resolution (design_targets)

Resolved: the design-layer charter is a new standalone `docs/design/charter.md`, cited from
`docs/design/README.md` (not prepended to the README, which is an index/overview, not a charter).
This mirrors how the design layer already separates concerns into sibling files (`core/`,
`contracts/`, `decisions/`, `notes/`). The future session authors `docs/design/charter.md` and adds
one pointer line to `docs/design/README.md`; both edits are that session's own, not this planning
unit's.
