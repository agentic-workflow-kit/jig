---
title: "Architecture guidelines — source reference"
status: active reference map
state: current
purpose: Route readers to extended rationale in the comprehensive source guide without making it mandatory reading.
audience: Authors and reviewers who need deeper reasoning, research sources, expanded examples, or failure-mode analysis.
scope: Background and traceability for the operational handbook.
owner: Architecture documentation owner.
last_verified: 2026-07-14
sources_of_truth:
  - ../architecture-design-and-documentation-guide.md
related:
  - ./README.md
---

# Source reference

The operational handbook distills the comprehensive
[Designing and Documenting Software Projects](../architecture-design-and-documentation-guide.md)
guide. The operational layer pages are complete for their declared scope. Read the source guide only
when deeper rationale or a broader example would materially help a decision or review.

Do not read the source guide from beginning to end by default.

## Route by question

| Question                                                         | Source-guide section                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Why separate model, view, and implementation reality?            | Section 1 — The central idea                                             |
| How should an artifact begin with its audience and question?     | Section 2 — Start with the reader and the question                       |
| How do abstraction levels and progressive disclosure work?       | Sections 3 and 4 — Levels and supporting views                           |
| What belongs in a canonical architecture model?                  | Section 5 — Build a canonical architecture model                         |
| How should diagrams communicate independently?                   | Section 6 — Give every diagram a communication contract                  |
| Why separate structure, behavior, and perspective?               | Section 7 — Separate structure, behavior, and perspective                |
| How do logical and deployment views differ?                      | Section 8 — Keep logical and deployment architecture distinct            |
| How should proposals, decisions, and versions be represented?    | Section 9 — Treat current state, future state, and decisions differently |
| How should a documentation set be organized and navigated?       | Section 10 — Organize documentation as a navigable system                |
| What is the extended end-to-end crafting workflow?               | Section 11 — Practical design and documentation workflow                 |
| What does a connected worked example look like?                  | Section 12 — OrderHub                                                    |
| How should ownership, evidence, and maintenance work?            | Section 13 — Keep documentation trustworthy                              |
| Which detailed review questions and failure modes are available? | Sections 14 and 15 — Checklists and common failure modes                 |
| Where are the expanded templates and compact rule set?           | Sections 16 and 17 — Templates and shortest useful rules                 |
| Which external sources influenced the guide?                     | Section 18 — Source basis and interpretation                             |

The source guide is explanatory authority for rationale. The
[guidelines index](./README.md) and active layer page are the operational standard.
