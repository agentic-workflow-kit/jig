---
title: "M5b local MVP delivery roadmap"
status: draft
---

# M5b local MVP delivery roadmap

M5b delivery is organized around client-usable milestones: what an operator can do after each phase
lands. The roadmap still preserves the proof surfaces from Wave 6, but it does not name phases by
internal components such as plan intake, records, authorization, bootstrap, or orchestration.

The first usable product milestone is a local plan runner, not GitHub or Forge integration. It
should let an operator run a local plan file from a terminal with simple local configuration,
simple local policy, the scripted-worker stub named by design, structured local run logs, and a
human-readable summary. It must produce durable enough local records to inspect what happened, while
deferring real agent adapters, execution-host adapters, full observability projections, resume,
provider manifests, remote hosts, Forge, GitHub, and Learning-loop integration.

## Milestones

0. **Delivery Foundation** — repository, fixture, and verification foundation. This is not a
   client product phase.
1. **Local Plan Runner** — an operator can run one simple local plan through Jig and inspect the
   result.
2. **Local Workflow Runner** — an operator can run a small multi-step local workflow and inspect
   item-level outcomes.
3. **Governed Local Runs** — an operator can control local work through meaningful policy, denial,
   and approval paths.
4. **Reliable Local Runs** — an operator can recover from interruption and diagnose runs through
   durable local records.
5. **Integrated Provider Runs** — an operator can move beyond the scripted local stub into real
   provider seams and stronger integrations.

## Roadmap Files

- [Feature inventory](./feature-inventory.md) — P0-P3 priority by client value.
- [Phase details](./phases.md) — value, requirements, acceptance, evidence, stops, references, and
  non-goals for each phase.

## Preserved Gates

- Execution-plan and observability-records contracts remain v0 and unfrozen:
  [`../../design/contracts/execution-plan-contract-v0.md`](../../design/contracts/execution-plan-contract-v0.md)
  and
  [`../../design/contracts/observability-records-contract-v0.md`](../../design/contracts/observability-records-contract-v0.md).
- Work-source provenance must not bypass
  [`PlanValidator`](../../design/core/plan-intake.md).
- Local records remain the evidence surface; summaries and inspect views must derive from the run
  record, not a parallel narrative.
- Provider claims, host isolation reports, and SEC-2 posture must remain provider-supplied but
  core-judged.
- GitHub/Forge is excluded from the first local MVP because it multiplies side effects and
  authority risk before the local runner, policy, and records path are proven.

## Primary References

- Product: [`../../product/jig.md`](../../product/jig.md),
  [`../../product/guarantees.md`](../../product/guarantees.md), and
  [`../../product/concepts.md`](../../product/concepts.md).
- Design: [`../../design/README.md`](../../design/README.md),
  [`../../design/core/plan-intake.md`](../../design/core/plan-intake.md),
  [`../../design/core/records.md`](../../design/core/records.md),
  [`../../design/core/authorization.md`](../../design/core/authorization.md),
  [`../../design/core/bootstrap.md`](../../design/core/bootstrap.md),
  [`../../design/core/orchestration.md`](../../design/core/orchestration.md),
  [`../../design/contracts/driving.md`](../../design/contracts/driving.md), and
  [`../../design/contracts/providers.md`](../../design/contracts/providers.md).
- Planning: [`../../planning/design-track/waves/wave-6-implementation-phasing/`](../../planning/design-track/waves/wave-6-implementation-phasing/)
  and
  [`../../planning/design-track/waves/wave-5-red-team/outputs/`](../../planning/design-track/waves/wave-5-red-team/outputs/).
