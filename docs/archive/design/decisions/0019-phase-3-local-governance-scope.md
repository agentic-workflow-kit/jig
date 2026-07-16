---
title: "ADR 0019 — Phase 3 local governance scope"
status: applied
---

# ADR 0019 — Phase 3 local governance scope

## Context

Phase 3 implements governed local runs on top of the Phase R records shape. The existing design
names the preview path, the fixed CFG-10 authorization boundary, Doorbell escalation, and the
canonical dry-run fixture, but a few Phase 3 implementation choices need to be fixed before code
can proceed without inventing scope.

## Decision

1. **Preview audit surface.** `jig preview` renders the preview posture to stdout. It allocates no
   run id, creates no run directory, and writes no `run.json` or `events.jsonl`. Durable
   file-backed preview records are deferred until a non-run audit store exists.
2. **MVP request category map.** `edit-files` within declared story scope is grantable.
   `run-checks` declared by the story is grantable. `edit-rule-governing-file`, or a file matching
   a declared rule-governing surface, routes. `push`, `open-pr`, `merge`, `credential-access`, and
   privileged or irreversible requests route. Edits outside declared scope deny. Unknown request
   kinds route. No model, confidence score, or heuristic classifier may adjudicate authority.
3. **Local Doorbell UX.** Routed requests use a blocking stdin prompt in the same `jig run`
   process. Re-invocation approval, remote approval, and resume-based decision handling are
   deferred to Phase 4+.
4. **Owner decision event vocabulary.** Approval records `authorization.granted` with basis
   including `owner-approval`. Rejection records `authorization.denied` with basis including
   `owner-rejection`. Phase 3 does not mint separate `owner.approved` or `owner.rejected` event
   families.
5. **Canonical fixture scope.** Phase 3 uses the adjusted four-story canonical triad fixture. It
   does not import `story.waiting`, does not build done-vs-landed eligibility, does not build
   landing or Forge behavior, and defers the literal five-story section 15 fixture until the
   landing and eligibility design deepens.

## Consequences

Phase 3 can implement the preview, fence triad, local Doorbell, and canonical golden fixture within
the current v0 records vocabulary. The remaining literal section 15 waiting/landing behavior stays
design-owned and out of scope for this local governed-runs implementation.

- Date: 2026-07-02
- Origin: Phase 3 governed local runs prerequisite cleanup
