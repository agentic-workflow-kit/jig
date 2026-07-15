---
title: "Worked example — the jig redesign"
purpose: Show the handbook's method applied end to end on one real project, with pointers into the artifacts.
audience:
  - Anyone adopting this handbook
scope: Illustration only; this page is a worked example, not part of the generic standard, and selects no rule.
state: current
status: worked example — describes the jig redesign documentation as of 2026-07-15
owner: Architecture documentation owner
last_verified: 2026-07-15
sources_of_truth:
  - ../design/README.md
  - ../design/decisions/review-and-approval-record.md
related:
  - ./README.md
  - ./abstraction-levels.md
  - ./gates-and-reviews.md
---

# Worked example — the jig redesign

**This page is an example, not a rule.** Everything normative lives in the other chapters; jig is
one project that applied them. Where this page and a chapter disagree, the chapter governs.

Jig is a deterministic delivery engine: it turns an approved execution plan plus a policy into
reviewed, landed work or a deliberate, inspectable stop. Its redesign documentation lives in
[`../design/`](../design/README.md) and demonstrates each chapter of this handbook in practice.

## Levels in practice

- **Level 0** — the [project brief](../design/brief.md): problem, stakeholders, nine outcomes,
  fourteen capabilities, twelve quality scenarios written as evaluable situations, constraints,
  accepted burdens, and an explicit nine-question handoff to Level 1. It names its exclusions:
  no lifecycle vocabulary, no responsibility allocation, no technology.
- **Level 1** — a connected set: a [canonical model](../design/model.md) owning vocabulary and
  stable identities; a [system context](../design/context.md) drawing an authority-and-proof
  boundary; an [authority-and-trust perspective](../design/perspectives/authority-and-trust.md);
  [lifecycle flows](../design/flows/run-and-story-lifecycle.md); supporting state, acceptance,
  concurrency, and failure views; twenty-one [invariants](../design/invariants.md) with full
  traceability; and nine [decision records](../design/decisions/README.md) each carrying rejected
  alternatives and an accepted negative consequence. D9 closes the level with a thirteen-category
  **deferral inventory** — the exact work queue Level 2 later consumed.
- **Level 2** — the runtime decomposition and its detail pages:
  [runtime units and ports](../design/runtime.md), a
  [component view of the controller](../design/components/control-plane.md), data/identity,
  catalogs, scheduling bounds, persistence, mechanism contracts, evidence, review protocol,
  landing proof, operations, and conformance pages — each page naming which deferral category it
  consumes and which invariants it preserves.

## The patterns this project proved

- **Summary view + full view:** the design index opens with a five-group system summary whose
  legend declares exactly which full-view elements each group folds together, and defers the
  ungrouped truth to the context view.
- **Linked subflow:** the lifecycle flow collapses the validate–decide–record–adopt machinery into
  one node and expands it in a dedicated transition-ordering view, keeping the top-level flow
  readable without hiding the machinery.
- **Communication contracts everywhere:** every page carries the metadata block; every diagram
  carries the question/audience/scope/state/owner/sources header and a legend; color is always
  redundant with stable IDs and bracketed types.
- **Gates as metadata:** layer state lives in page frontmatter and one
  [gate record](../design/decisions/review-and-approval-record.md); reorganizing the documents
  never moved a gate.

## The gate history, as a case study

The Level 1 candidate was first authored as two documents, independently reviewed
(`CHANGES_REQUIRED`, three findings, corrected), and awaited an exact-candidate recheck. The owner
then directed a structure revision into the view-based set — so the pending recheck was recorded
as **superseded**, not failed: the exact candidate no longer existed. A fresh independent review of
the re-presented 23-file candidate (pinned by commit hash and per-file digests in the gate record)
returned `PASS` with three non-blocking notes, which — per the pre-recorded gate effect — made the
approval and lock effective without a further metadata edit. The owner's continuation instruction
authorizing Level 2 was itself recorded in the gate record as an event, and the working contracts
that had quoted the earlier stop were updated in the same change.

Every rule in [gates, reviews, and change](./gates-and-reviews.md) traces to something this
history exercised: exact-candidate semantics, supersession, bounded delegation, pre-recorded gate
effects, owner instructions as events.

## What to copy and what not to

Copy the shapes: the level ladder, the deferral inventory, the invariant contract, the gate
record, the summary-view discipline. Do not copy the scale reflexively — jig's foundation carries
an unusually heavy assurance burden (deterministic control, audit, fail-closed authority). A team
whose failure costs are lower should keep the same shapes at a fraction of the page count; the
[minimum set](./view-types.md) is the honest starting point.
