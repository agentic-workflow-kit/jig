---
title: "Jig — delivery"
status: active index
---

# Jig — delivery

This is the **active delivery layer**: the planning artifacts that turn the target product and
design docs into sequenced, reviewable implementation work. Product owns _what and why_
([`../product/`](../product/)); design owns _how_ ([`../design/`](../design/)); delivery owns
_in what order, in what slices, and with what acceptance and verification_. Delivery docs cite
product and design; they do not rewrite either layer.

Historical delivery, planning, and review records live under
[`../archive/`](../archive/README.md) — including the completed M5b and M7 delivery tracks under
[`../archive/delivery/`](../archive/delivery/README.md). Those records are **provenance only**:
they explain how Jig reached its current state and are not instructions for new work. Do not
start work from an archived track.

## Active tracks

| Track                                                                   | Goal                                                                                                                                       | Status  |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| [target-state-implementation/](./target-state-implementation/README.md) | Transform the current single-package, fixture-backed implementation into the target state described by `docs/product/` and `docs/design/`. | planned |

## Rules for delivery docs

- Treat `docs/product/` and `docs/design/` as target truth; where a delivery doc finds a
  conflict between them, it names the conflict and routes it back to the owning layer rather
  than resolving it silently.
- Delivery planning does not mint TypeScript interfaces, JSON Schemas, event constants,
  provider manifests, package exports, or runtime code; those belong to implementation PRs
  governed by the design layer.
- Phase acceptance criteria cite product guarantee IDs, design invariants, and ADRs by ID.
  Delivery-level acceptance criteria live here, not in the product layer
  ([`../product/jig.md`](../product/jig.md#open-questions)).
- Every phase preserves the repo gate (`pnpm check`) at full strength; see each track's
  `verification.md`.
