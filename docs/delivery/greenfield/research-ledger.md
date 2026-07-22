---
title: "Jig greenfield delivery — research ledger"
purpose: "Bound comparative research so it informs implementation mechanics without governing the plan."
audience:
  - delivery planners
  - architecture reviewers
status: non-governing reference ledger
owner: Arye Kogan
last_verified: 2026-07-22
---

# Research ledger

## Rule of use

Research is non-governing. The active product and redesign select all outcomes, authority,
lifecycle, and delivery obligations. A research observation may be adopted only when it conforms to
the named governing IDs, is recorded in a story's `DR-*` section, and has its own proof. It cannot
fill a product/design gap, justify archive reuse, or override an owner decision.

| Reference             | Inspected scope                                                                                                                                | May inform                                                                                                                                                                       | Explicitly not adopted                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `main` at `d124ea5`   | task/config/CI, driver registry, run journal/runner/completion gate, config schema/version                                                     | narrow driver-factory, journaling, schema/version discipline                                                                                                                     | tracker, PR, completion, lifecycle, and config behavior; Changesets/OIDC until public distribution is promised |
| `v-next` at `716db2e` | pnpm/Turbo/TS/Vitest/dependency-cruiser tooling; package/SDK/testkit/provider contracts; reducer/replay/storage/leases; deferred provider docs | private SDK/provider/testkit separation, task graph/TS refs, pure reducer, dependency guards, hermetic/adversarial testkit, record/replay/fencing/typed failures through Jig IDs | exact lifecycle/events/durability/methods/package count and deferred provider behavior                         |

## Owner-recorded initial realization selections

The owner-approved planning source selects a private TypeScript/Node/pnpm/Turbo topology, strict
JSON initially, D11 file stores with a genuinely independent witness trust root, and an initial
provider set of file source/storage, local Git host, local verify, Codex, GitHub, and terminal/file
notices. The final supported profile includes both a private CLI and private MCP. These are bounded
realization selections, not a public-product expansion.

Before implementation, pin CI actions immutably and place the selection/evidence/fallback in the
applicable story contract. Unsupported GitHub modes and Codex postures remain unconfigurable.

## Provenance rule

The retired generation archive is not research for planning. It may be consulted only for a named,
already-specified active story under the repository lookup policy, with ref/path recorded as
provenance and fresh compliance evidence. It never supplies an accepted implementation algorithm.
