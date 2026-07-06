---
title: "Jig design glossary — ubiquitous language"
status: overview
---

# Jig design glossary — ubiquitous language

A one-page index of jig's design-layer vocabulary: one line per term, cross-linked to the doc
that owns it. This page consolidates existing definitions; it introduces no new term, decision,
or invariant. When a term's definition and its owning doc disagree, the owning doc governs.

## Configuration & Work

See [`domain/configuration-and-work.md`](./domain/configuration-and-work.md).

- **Execution plan** — the authored artifact: a set of Work items, their declared dependencies,
  and each item's declared done conditions, plus provenance and version identity. Jig's one hard
  input per track. See
  [`domain/configuration-and-work.md#execution-plan-the-authored-artifact`](./domain/configuration-and-work.md#execution-plan-the-authored-artifact)
  and [`contracts/execution-plan-contract-v0.md`](./contracts/execution-plan-contract-v0.md).
- **Policy** — the safety and governance contract for a track: gating posture, merge spectrum,
  concurrency ceiling, retry budget, required reviews, approvals, escalation, the anti-gaming
  floor, and the manual-to-assisted category dial; fixed at launch. See
  [`domain/configuration-and-work.md#policy`](./domain/configuration-and-work.md#policy).
- **Repo-level floors** — a repo-scoped policy artifact every track inherits and may tighten but
  never weaken; changing it is itself a governed action. See
  [`domain/configuration-and-work.md#repo-level-floors`](./domain/configuration-and-work.md#repo-level-floors).
- **Story / task / work item (the equivalence)** — the same unit: what jig schedules, runs, and
  lands. Product calls it a story; design uses the neutral term work item because the owner
  configures their own tracker label — story, task, ticket, whatever fits. See
  [`core/README.md`](./core/README.md) (Terminology) and
  [`domain/configuration-and-work.md#work-item-its-authored-facts`](./domain/configuration-and-work.md#work-item-its-authored-facts).
- **Track** — one independent line of work that carries its own Execution plan, Policy, and Work
  profile, and runs in parallel with other tracks in the same repo. See
  [`domain/configuration-and-work.md#track`](./domain/configuration-and-work.md#track).
- **Work profile** — the realization: model, effort, prompt strategy, and how roles are carried
  out; freely tunable per track but never able to lower the safety floor. See
  [`domain/configuration-and-work.md#work-profile`](./domain/configuration-and-work.md#work-profile).

## Runtime & Observation

See [`domain/runtime-and-observation.md`](./domain/runtime-and-observation.md).

- **Evidence** — the vocabulary for what gates landing: automated checks, review, and capability
  proof, never the worker's self-report alone; a projection over Run records, not a separate
  store. See
  [`domain/runtime-and-observation.md#evidence`](./domain/runtime-and-observation.md#evidence).
- **Notice** — a triaged attention item for a parked, blocked, stale, or overdue condition: what
  it is, how urgent, and what the owner can do about it now; a projection over Run records, not a
  separate store. See
  [`domain/runtime-and-observation.md#notice`](./domain/runtime-and-observation.md#notice).
- **Run** — one operator-initiated execution of an Execution plan under a Policy bound at launch;
  reconstructible end to end. See
  [`domain/runtime-and-observation.md#run`](./domain/runtime-and-observation.md#run).
- **Run records** — the append-only, ordered, redaction-aware evidence log; state, summary,
  metrics, and notices are pure projections of it, never authored directly. See
  [`domain/runtime-and-observation.md#run-records`](./domain/runtime-and-observation.md#run-records)
  and [`core/records.md`](./core/records.md).

## Jig-core — the trusted runner

See [`core/README.md`](./core/README.md) and [`core/authorization.md`](./core/authorization.md).

- **Capability attestation** — the earned-trust gate: requires fresh, positive proof that a
  driver can perform a capability safely before that capability is auto-grantable; missing or
  stale proof means less autonomy, never a weaker guarantee. See
  [`core/authorization.md#capability-attestation-gate`](./core/authorization.md#capability-attestation-gate).
- **Doorbell** — the escalation surface: routes ambiguous, risky, or unproven actions to the
  owner; parks durably and grants narrowly. See
  [`core/authorization.md#doorbell-escalation`](./core/authorization.md#doorbell-escalation).
- **Fence** — runtime authorization: authorizes every worker request before it executes,
  fail-closed, granting / denying / routing by a fixed category boundary that cannot be loosened
  mid-run. See [`core/authorization.md`](./core/authorization.md).
- **Jig-core** — the trusted orchestrator that governs the seams: resolves eligibility and order,
  drives each work item, holds credentials, and performs irreversible actions only under policy
  and evidence; is not itself a seam. See
  [`core/README.md#b-jig-core--the-trusted-runner-governs-the-seams`](./core/README.md#b-jig-core--the-trusted-runner-governs-the-seams).
- **Runner** — jig-core's component that carries out any privileged action a Fence grant or owner
  approval permits; the worker itself never holds credentials. See
  [`core/authorization.md`](./core/authorization.md).

## Provider seams — swappable, governed at the boundary

See [`core/README.md#c-the-four-seams--swappable-governed-at-the-authority-boundary`](./core/README.md#c-the-four-seams--swappable-governed-at-the-authority-boundary)
and [`contracts/providers.md`](./contracts/providers.md).

- **Agent / worker** — the contained coding agent: reads a work item, writes code, runs checks,
  reports; holds no credentials and cannot push, open a PR, merge, or widen its own authority.
- **Execution host** — where the worker runs; provides isolation/containment and reports its
  isolation strength honestly.
- **Forge** — the code-host seam: the push / PR / merge target; respects branch protection and
  merge queues.
- **Seam** — a swappable provider boundary governed at the authority edge, distinct from
  jig-core (trusted; does not swap). See [`contracts/README.md`](./contracts/README.md).
- **Work source** — where work items originate; an extension seam (the Execution plan remains
  jig's one hard input).

## Driving and packaging

- **Conformance / testkit** — the provider-adequacy suite (the future `jig-testkit` package's
  responsibility) that tests SDK-owned ports and provider-facing types without entering the
  production runtime graph. See [`contracts/providers.md`](./contracts/providers.md) and
  [`contracts/README.md`](./contracts/README.md).
- **Driving boundary** — the operator surface realized as CLI / MCP / SDK adapters: one command
  becomes one control-plane call with durable records owned by the SDK/operator implementation; the
  edge holds no run logic and imports no provider contracts. See
  [`contracts/driving.md`](./contracts/driving.md).
- **jig-cli** — the target terminal-adapter package from ADR 0027; consumes `jig-sdk` rather than
  deep-importing core or provider internals. See
  [`decisions/0027-packaging-sdk-boundary.md`](./decisions/0027-packaging-sdk-boundary.md).
- **jig-sdk** — the target package from ADR 0027 that owns the programmatic
  core/records/plan-intake/authorization/factory/provider-port boundary first-party consumers
  call. See [`decisions/0027-packaging-sdk-boundary.md`](./decisions/0027-packaging-sdk-boundary.md)
  and [`contracts/driving.md#sdk-package-reconciliation`](./contracts/driving.md#sdk-package-reconciliation).
- **jig-testkit** — the target package from ADR 0027 that owns the conformance suite. See
  [`decisions/0027-packaging-sdk-boundary.md`](./decisions/0027-packaging-sdk-boundary.md).
- **Operator surface** — the thin entry point (CLI / MCP / SDK / embed) the owner drives jig
  through; one command becomes one control-plane call with durable records owned by the
  SDK/operator implementation; the edge holds no run logic and imports no provider contracts. See
  [`core/README.md#b-jig-core--the-trusted-runner-governs-the-seams`](./core/README.md#b-jig-core--the-trusted-runner-governs-the-seams)
  and [`contracts/driving.md`](./contracts/driving.md).

## Related

- [`README.md`](./README.md) — the design-layer index; the [`domain/`](./README.md#domain--the-deepened-domain-model-two-of-four-entity-groups)
  section states how these terms relate across `core/`, `domain/`, and `contracts/`.
- [`conventions.md`](./conventions.md) — the ID-namespace and numbering rules the terms above cite
  into (`INV-*`, `CTX-*`, `D-###`, and the product ID families).
