---
title: Jig — design
status: draft — design layer
---

# Jig — design

This is where Jig's **engineering design** lives: the implementation reference for _how_ the
product commitments in [`docs/product/`](../product/) are satisfied. Product owns _what_ and
_why_; design owns _how_ and reconciles to product — where they conflict, design names it rather
than silently resolving.

The design is organised by one cut: **fixed logic vs. edge interfaces.**

## Status — what's ready, what's WIP

The scaffold is complete; the per-area detail is the work in progress. Legend: **overview** =
agreed at this altitude, ready to read; **stub** = skeleton only (purpose, responsibilities,
interface, one diagram) — the detailed design is pending; **draft** = a deepened design doc still
open to hardening; **contract v0** = an agreed v0 seam shape, not a frozen schema; **roadmap** = a
chronological, ADR-linked realization ledger, not the current design itself; **log / archive** =
decision records and reference material.

| Area                                                      | Files                                                                                                                                                | Status      | Pending                                                                                                                 |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| Layer index                                               | `README.md`                                                                                                                                          | overview    | —                                                                                                                       |
| Standalone deterministic orchestration proposal           | [`deterministic-story-orchestration-proposal.md`](./deterministic-story-orchestration-proposal.md)                                                   | proposal    | separate reconciliation and adoption decision                                                                           |
| Design charter                                            | [`charter.md`](./charter.md)                                                                                                                         | overview    | —                                                                                                                       |
| Conventions                                               | [`conventions.md`](./conventions.md)                                                                                                                 | overview    | —                                                                                                                       |
| Glossary                                                  | [`glossary.md`](./glossary.md)                                                                                                                       | overview    | grows as new ubiquitous-language terms are named                                                                        |
| Core overview                                             | `core/README.md`                                                                                                                                     | overview    | —                                                                                                                       |
| Domain model (configuration + runtime/observation groups) | [`domain/configuration-and-work.md`](./domain/configuration-and-work.md), [`domain/runtime-and-observation.md`](./domain/runtime-and-observation.md) | **draft**   | later hardening / downstream waves; jig-core and the provider seams are specified in `core/` and `contracts/`, not here |
| Core lifecycle                                            | [`core/bootstrap.md`](./core/bootstrap.md), [`core/orchestration.md`](./core/orchestration.md)                                                       | **draft**   | later hardening / review-lane implementation planning / Wave 5 findings                                                 |
| Core authorization                                        | [`core/authorization.md`](./core/authorization.md)                                                                                                   | **draft**   | later hardening / conformance-policy detail / implementation planning                                                   |
| Core data ports                                           | [`core/plan-intake.md`](./core/plan-intake.md), [`core/records.md`](./core/records.md)                                                               | **draft**   | implementation planning / later core-parts pass                                                                         |
| Contracts overview                                        | `contracts/README.md`                                                                                                                                | overview    | —                                                                                                                       |
| Data contracts                                            | `contracts/{execution-plan, observability-records}-contract-v0.md`                                                                                   | contract v0 | field-level schema (intentionally not frozen)                                                                           |
| Driving / providers                                       | [`contracts/driving.md`](./contracts/driving.md), [`contracts/providers.md`](./contracts/providers.md)                                               | **draft**   | package implementation / acceptance-lane integration / remaining EVRUN evidence gates                                   |
| Provider realization roadmap                              | [`contracts/provider-realization-roadmap.md`](./contracts/provider-realization-roadmap.md)                                                           | roadmap     | grows as later provider-realization phases land                                                                         |
| Security model                                            | [`security-model.md`](./security-model.md)                                                                                                           | **draft**   | grows as new controls are designed                                                                                      |
| Decisions                                                 | `decisions/*`                                                                                                                                        | log         | grows as decisions are made                                                                                             |
| Evidence records                                          | `evidence/*`                                                                                                                                         | log         | grows as external-tool probes are committed                                                                             |
| Notes                                                     | `notes/*`                                                                                                                                            | archive     | —                                                                                                                       |

A stub is deepened **in place**; new sub-files are added only if an area outgrows a single file
(none are planned yet). Per-file `status:` frontmatter mirrors this table.

## [`core/`](./core/) — jig's fixed logic

The trusted part that never swaps. Start at the **[system overview](./core/README.md)** — the
entity model, the structure diagram, and the bootstrap→core flow. Then the per-area files:

- [`bootstrap.md`](./core/bootstrap.md) — the launch / composition root: load, validate, bind,
  wire, identify, ready.
- [`plan-intake.md`](./core/plan-intake.md) — parse + validate a plan instance; reject unknown
  formats; carry policy-owned evidence and acceptance expectations at launch.
- [`orchestration.md`](./core/orchestration.md) — the runner: run/work-item state machines,
  eligibility, policy/evidence evaluation, governed review-lane consumption, runner-only actions.
- [`authorization.md`](./core/authorization.md) — the fence, doorbell, and capability attestation
  (the fail-closed spine).
- [`records.md`](./core/records.md) — the append-only event log, pure projections, and export.

## [`domain/`](./domain/) — the deepened domain model (two of four entity groups)

[`core/README.md`](./core/README.md) is the highest-altitude entry point to the whole system: a
one-line-per-entity overview across all four responsibility groups, the structure and run-flow
diagrams, and the one-paragraph spine. `domain/` deepens two of those four groups into a full
**owns / reads / does-not-own** model, with Track-level and runtime-level relation diagrams and
the lifecycle _terms_ each entity carries:

- [`domain/configuration-and-work.md`](./domain/configuration-and-work.md) deepens group A
  (Configuration — the owner's inputs, per track): Track, Execution plan, Work item (its
  authored facts), Policy, Repo-level floors, and Work profile.
- [`domain/runtime-and-observation.md`](./domain/runtime-and-observation.md) deepens group D
  (what you observe) plus the group-B Run records entity: Run, Evidence, Notice, Run records, and
  the plan-intake validation boundary where an authored plan enters the runtime.

The **"Domain model" status-table label above names this deepening, not full domain coverage**:
jig-core's runner / fence / doorbell / capability-attestation group (group B, apart from Run
records) and the four provider seams (group C) are specified in
[`core/authorization.md`](./core/authorization.md), [`core/orchestration.md`](./core/orchestration.md),
and [`contracts/providers.md`](./contracts/providers.md) — not in `domain/`. Read `core/README.md`
first for the whole system at a glance, then follow into `domain/` for the two areas it deepens.
For the vocabulary these entities share, see the [glossary](./glossary.md).

## [`contracts/`](./contracts/) — jig's edge interfaces

Every interface at jig's boundary — what others call or implement — in three kinds. See the
**[boundary map](./contracts/README.md)**.

- [`driving.md`](./contracts/driving.md) — how consumers drive jig: CLI, MCP, SDK; reconciled with
  the internal `jig-sdk` package boundary from ADR 0027 and the private MCP package placement from
  ADR 0033.
- the two **data contracts** —
  [`execution-plan-contract-v0.md`](./contracts/execution-plan-contract-v0.md) (input) and
  [`observability-records-contract-v0.md`](./contracts/observability-records-contract-v0.md)
  (output).
- [`providers.md`](./contracts/providers.md) — the four swappable provider seams, provider
  extractability posture, conformance/testkit routing, and the Codex app-server adapter constraint
  from ADR 0028; Forge remains a deterministic runner-invoked adapter, not another reviewer or
  policy authority. The chronological Phase 5-8 ADR-realization history for those seams is split
  out into [`provider-realization-roadmap.md`](./contracts/provider-realization-roadmap.md).

## [`decisions/`](./decisions/) — the decision log

One ADR per design decision; see the [decision index](./decisions/README.md). Seeded from the
M5a slice.

Current reconciliation notes:

- [ADR 0034](./decisions/0034-acceptance-review-lane.md) settles the verifier/reviewer lane as
  governed evidence: not Jig-core, Worker, Forge, Owner/Doorbell, or a fifth provider seam.
- [ADR 0027](./decisions/0027-packaging-sdk-boundary.md) settles the target internal package
  direction: `jig-sdk`, `jig-cli`, and `jig-testkit`, with the root package remaining private.
- [ADR 0028](./decisions/0028-codex-app-server-transport.md) selects owned stdio app-server as the
  first Codex transport target and keeps the session-observable Codex seam internal to the real
  adapter. Public `AgentPort` stays final-result oriented.
- [ADR 0033](./decisions/0033-mcp-adapter-package.md) places MCP in a private `jig-mcp` adapter
  package that depends on `jig-sdk` and creates no public stability promise.

## [`evidence/`](./evidence/) — committed evidence inputs

Dated, citable records for external-tool probes that inform ADRs and contract decisions. Evidence
records are inputs to decisions, not authority by themselves. See the
[evidence index](./evidence/README.md) and the
[evidence appendix convention](./conventions.md#6-evidence-appendix-convention-committed-records-are-inputs-to-decisions-not-authority).

## [`notes/`](./notes/) — intake and reference

Archival material, not the main reading path: the DDD intake frame, the reference-only
workflow-kit reuse log, and the dense M5a runtime-design record. See the
[notes index](./notes/README.md).

## [`security-model.md`](./security-model.md) — the cross-cutting security view

A single cut across the fence and fail-closed authorization, capability attestation / earned
trust, the anti-gaming floor, no-phone-home / isolation, credential ownership (runner-only),
redaction, and the conformance "self-report is not proof" stance — otherwise scattered across
[`core/authorization.md`](./core/authorization.md), ADR 0026, and per-entity notes. It
consolidates existing security design only; it cites the existing `SEC-*`, `FENCE-*`, `GUARD-*`,
`EARN-*`, and `ISO-*` product commitments and introduces no new control.

## Product reconciliation

Design reconciles _to_ the product layer. The current design maps back to the ID-bearing
commitments in [the five guarantees](../product/guarantees.md) and names product conflicts where
found. No product conflicts are known. The product clarification treats verification before landing
as a policy/config-owned acceptance/review lane; [ADR 0034](./decisions/0034-acceptance-review-lane.md)
anchors that boundary without claiming a shipped runtime/config/schema implementation beyond
existing evidence. The current
runtime is now a private four-package workspace (`jig-sdk`, `jig-cli`, `jig-mcp`, `jig-testkit`)
and remains pre-session-observable; Codex-transport direction must still be read as design
direction, not shipped public API.

## Historical planning track

The deep-design pass was organized under the archived
[planning design track](../archive/planning/design-track/README.md). That record is preserved for
traceability; it is historical context and does **not** mean the stubbed design files below are
already complete.

## Deferred

- field-level JSON Schema or TypeScript interfaces;
- implementation of the ADR 0027 package split, including package files, export maps, project
  references, source moves, dependency rules, and publishing posture;
- provider package publication or a third-party provider ecosystem commitment;
- remaining EVRUN no-phone-home/idempotency, prompt-size / bounded-context behavior, Windows /
  Git Bash support, and other evidence gates that ADR 0028 leaves open;
- runtime/config/policy implementation of the richer acceptance/review lane, including any records
  or verdict handling required before Forge landing;
- the implementation code itself.
