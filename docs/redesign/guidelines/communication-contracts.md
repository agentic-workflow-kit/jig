---
title: "Communication contracts — artifacts and diagrams that stand alone"
purpose: Define the per-artifact metadata contract, the per-diagram contract, and the patterns that keep top-level views simple without losing detail.
audience:
  - Architecture authors
  - Independent reviewers
scope: Generic artifact and diagram contracts; level placement and gate semantics live in their own chapters.
state: current
status: active operational standard — generalized rewrite of 2026-07-15
owner: Architecture documentation owner
last_verified: 2026-07-15
sources_of_truth:
  - ../architecture-design-and-documentation-guide.md
related:
  - ./README.md
  - ./view-types.md
  - ./gates-and-reviews.md
---

# Communication contracts — artifacts and diagrams that stand alone

A reader should never need the author beside them. Every durable artifact and every diagram carries
a contract that says what it is for, whom it serves, what it covers, what it deliberately omits,
what state it is in, and who answers for it.

## The per-artifact contract

Every durable artifact begins with machine-checkable metadata:

```yaml
title: <what readers call it, including view type and scope>
purpose: <the one question this artifact answers>
audience:
  - <primary intended reader first>
scope: <what is included>; <what is deliberately excluded>
state: <from the shared state vocabulary>
status: <one line of gate-relevant nuance, e.g. "proposed, pending independent review">
owner: <who answers for this artifact and can approve changes>
last_verified: <date the facts were last checked against their sources>
sources_of_truth:
  - <the artifacts or decisions this one is derived from and must stay faithful to>
related:
  - <where the reader goes next>
```

Field discipline that proved out in practice:

- **`scope` names exclusions.** "X is excluded; Y owns it" is the sentence that stops scope creep
  and tells reviewers what absence is deliberate.
- **`sources_of_truth` makes fidelity reviewable.** A derived artifact that names its governing
  inputs can be checked against them; one that does not can only be admired.
- **`state` and `status` are different.** State is the vocabulary word (proposed, approved,
  current…); status is the one-line nuance a gate reader needs. Never let a hopeful status imply
  an approval the gate record does not show.
- **`owner` is a person or team who decides,** not a courtesy credit.

## The per-diagram contract

A diagram is an artifact inside an artifact; it repeats the contract in miniature, immediately
before the figure:

- **Question** — the one thing this diagram answers.
- **View type** — context, runtime, component, flow, state, deployment, data, perspective, summary.
- **Audience and purpose** — who reads it and what they decide with it.
- **Scope and exclusions** — what is in frame and what is deliberately not.
- **State and owner.**
- **Sources** — the decisions and inputs the diagram re-expresses.
- **Related views** — where the grouped, expanded, or adjacent truths live.

And immediately after the figure, a **legend** explaining every visual encoding: shapes, borders,
line styles, arrowheads, colors, icons, and abbreviations. Two rules are absolute:

1. **Color is never the only carrier of meaning.** Every node states its identity and bracketed
   type in text; color is redundant reinforcement.
2. **If a visual difference has no meaning, remove it.** If it has meaning, the legend says so.

## Visual grammar

- Stable identities on every node (`ORDER-API`, not "the API box"), with a short type in brackets
  and, where useful, a one-line responsibility.
- Directed edges with specific verb phrases that agree with the arrow ("publishes events to", not
  "data"); add the mechanism only at levels where it helps.
- One dominant reading direction; no crossing lines a re-layout could avoid; one abstraction level
  per diagram.
- One visual encoding per meaning across the whole documentation set — a dashed line must not mean
  "future" in one view and "asynchronous" in another. Reserve dashed lines for one family of
  meanings (for example: failure, uncertainty, or no-authority paths) and say so in every legend.
- Remove detail rather than shrinking it. Tiny text means the story needs another view.

## The summary-view pattern

Top-level views rot by accretion: every new fact lands in the first diagram a reader sees. The
fix is a deliberate pair:

- A **summary view** groups the full view's elements into a handful of named groups so a
  first-time reader can orient in seconds. It must declare its groupings in its legend ("`GROUP-A`
  groups the full view's `X`, `Y`, `Z`") and link to the full view as the owner of the ungrouped
  truth.
- The **full view** keeps every element with its own identity and carries the authoritative
  relationships.

The same move works inside behavior: a **linked subflow** collapses machinery that would overload
a flow into one node ("authoritative transition"), and a dedicated view expands that node alone.
The collapsed node's label names the expansion view, so nothing is hidden — only deferred. Apply
the pattern whenever a diagram needs more than roughly a dozen nodes to tell its primary story.

## The stand-alone test

Hand the artifact to someone from its stated audience, with no narration, and ask: What question
does this answer? What is out of scope? What does each element do? What do the arrows mean? What
is current versus proposed? Where do you go for more detail? Fix the artifact — not the reader —
until the answers come back right. Do not solve every misunderstanding by adding boxes; most are
solved by removing them.

## Where to go next

- Which artifact kinds carry these contracts: [view types](./view-types.md).
- How `state`, `status`, and gate records interact: [gates, reviews, and change](./gates-and-reviews.md).
- The contracts applied on a real project: [worked example — jig](./worked-example-jig.md).
