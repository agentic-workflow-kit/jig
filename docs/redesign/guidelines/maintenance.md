---
title: "Maintenance — keeping published documentation trustworthy"
purpose: Define ownership, feedback handling, verification triggers, and volatility-matched upkeep for a living documentation set.
audience:
  - Artifact owners
  - Architecture authors
  - Operations and engineering leads
scope: Generic upkeep practices; gate and review semantics live in the gates chapter.
state: current
status: active operational standard — generalized rewrite of 2026-07-15
owner: Architecture documentation owner
last_verified: 2026-07-15
sources_of_truth:
  - ../architecture-design-and-documentation-guide.md
related:
  - ./README.md
  - ./gates-and-reviews.md
  - ./communication-contracts.md
---

# Maintenance — keeping published documentation trustworthy

Documentation is a maintained product. An artifact nobody answers for, with no verification date
and no links to evidence, is indistinguishable from fiction — however polished.

## Ownership

Every durable artifact has an owner who can verify its facts and must respond when one goes stale.
Ownership is decision authority over the artifact, not attribution. When ownership moves, update
the metadata in the same change; an orphaned `owner` field is the first symptom of a dead document.

## Separate the three kinds of feedback

- **Question** — the artifact is unclear or knowledge is missing. Fix the artifact, not just the
  asker: a question two readers asked is a defect in the stand-alone test.
- **Inaccuracy** — the artifact is believed false or stale. Triage against the artifact's
  `sources_of_truth`; correct it or mark the artifact's state honestly (`deprecated`,
  `historical`). Do not close an inaccuracy because a future proposal would fix it.
- **Idea** — a proposed improvement. Route it to an isolated proposal; never let an idea silently
  edit `current` or locked content.

## Verify on events, not only on a calendar

Re-verify an artifact when any of these happen, not just when a review date arrives:

- a unit, store, dependency, or owner it names changes;
- a contract or boundary it draws changes materially;
- an incident contradicts one of its assumptions;
- a proposal that touches it is approved or completed;
- a link it relies on disappears;
- onboarding or review exposes the same confusion twice.

Update `last_verified` only after actually checking against the sources of truth — the field is a
claim, not a timestamp of the last edit.

## Match upkeep to volatility

| Artifact                         | Volatility     | Sensible upkeep                                                |
| -------------------------------- | -------------- | -------------------------------------------------------------- |
| Project brief, context view      | Low            | Human-owned; re-verify on product or dependency change.        |
| Runtime/container view           | Medium         | Human-owned model, checked against catalogs and telemetry.     |
| Component views                  | Medium to high | Only where triggered; owner-reviewed; generate where possible. |
| Flows and state machines         | Medium         | Re-verify with contract and behavior changes.                  |
| Deployment views                 | Medium to high | Derive from infrastructure definitions where practical.        |
| Code-level detail                | Very high      | Link or generate on demand; never hand-maintain.               |
| Decision and gate records        | Append-only    | Never rewritten; extended as history accrues.                  |
| Invariant and deferral contracts | Locked         | Change only through explicit reopen (see gates).               |

## Make staleness observable

- Run automated link checking and formatting checks in the same gate as code checks, so a broken
  cross-reference fails visibly instead of rotting quietly.
- Keep each fact in exactly one owning artifact and link to it; duplicated facts are the largest
  single source of drift.
- Link claims to evidence a reader can check: repositories, schemas, dashboards, runbooks, test
  reports, recorded review baselines. A claim with no evidence link is an assertion, and should
  read like one.
- Preserve history deliberately: superseded material moves to an explicit historical area (or a
  recorded git baseline) with its provenance noted, rather than being deleted or left in place
  wearing an "active" label. Archived approval labels describe their era and confer no current
  authority — say so where the archive is indexed.

## Where to go next

- What happens when maintenance discovers a needed change to locked content:
  [gates, reviews, and change](./gates-and-reviews.md).
- The metadata fields maintenance keeps honest: [communication contracts](./communication-contracts.md).
