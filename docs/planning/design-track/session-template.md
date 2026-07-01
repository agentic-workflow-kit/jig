---
title: "Jig — design track session template"
status: draft — reusable template
---

# Design track — session template

This is the reusable template every story in this track copies from: the session prompt a future
design session is launched with, the story skeleton, and the wave-charter skeleton. Copy the
skeleton verbatim (frontmatter keys and headings), then adapt the prose to the story or wave at
hand.

## The reusable session prompt

Use this prompt (adapted with the story's own ID and paths) to launch a future design session:

> You are running the `technical-design` method — frame → author → design-review — over
> `<this story's path>`. Read the wave's `frame.md` and the story's `Inputs to read` before
> starting. Produce the five deliverable types this track requires: durable design doc(s) at
> `design_targets`, logged open questions (never invented answers), the invariants this area
> preserves and any it adds (continuing the `INV-*` ledger, never resetting numbering), risks and
> deferred decisions, and review evidence (the design-review report plus this wave's
> `decisions.md` dispositions). Settled means zero open blocking suggestions from
> `review-technical-design`. If a fact is missing or a decision belongs to product or another
> wave, log it as an open question or a routed finding — do not invent an answer.

## Story skeleton

Reproduce this structure exactly — frontmatter keys and headings — for every story brief in this
track.

```markdown
---
id: wN-sM-slug
wave: N
status: designed
depends_on: [] # story IDs inside this wave; if a story-dag.md exists for the wave, this must match it
design_targets: [] # design docs this session authors or deepens (docs/design/...)
reconciles_to: [] # product IDs + invariant IDs, e.g. FENCE-1, INV-001
---

# wN-sM-slug — <title>

## Objective

One paragraph: the design problem this session solves and the altitude it moves from and to.

## Inputs to read

- Authoritative jig docs, this wave's frame.md, and sibling design files this session depends on.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc(s) at the design_targets.
2. Open questions, logged (never invented answers).
3. Invariants preserved and any added — continuing the INV-\* ledger, never resetting numbering.
4. Risks and deferred decisions.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- ...

## Invariants to preserve

- The INV-\* (from runtime-design-m5a.md) this area must not break; any new INV-\* it adds
  (continue numbering).

## Must not decide

- What is out of scope or owned by another wave or by product.

## Exit criteria

- Concrete and checkable, ending in: design-review verdict settled (zero open blocking
  suggestions).

## Evidence required

- The wave frame.md, the authored design_targets, the design-review report, and the decisions.md
  entries.

## Design review & handoff

This session runs the technical-design method itself:

1. frame-technical-design -> a problem frame (source map, InputResolution, AgreedSystemModel,
   architecture_mode, ddd_depth). This wave's build-time frame at ../frame.md seeds it.
2. author-technical-design -> the design docs at design_targets.
3. review-technical-design -> three lenses (architecture-enforceability, domain-correctness,
   agreement-integrity); dispositions recorded into this wave's decisions.md; settled = zero open
   blocking suggestions.

Handoff: when settled, update status and the track traceability matrix.
```

## Wave-charter skeleton

Reproduce this structure exactly — frontmatter keys and headings — for every wave charter in this
track.

```markdown
---
title: Wave N — <slug>
wave: N
status: charter draft
depends_on_waves: []
---

# Wave N — <title>

## Purpose

## Required input docs

## Required output docs

## Questions it must answer

## What it must not decide

## Exit criteria

## Evidence required

## Story order
```

## Note for reviewers and implementers

Reviewers apply `review-technical-design` (the three lenses: architecture-enforceability,
domain-correctness, agreement-integrity) over the artifacts these skeletons produce, at scaffold
altitude — i.e. checking that a story's or wave's own output is internally consistent and
review-settled. Implementers do not apply this method to code; there is no code in this track.
