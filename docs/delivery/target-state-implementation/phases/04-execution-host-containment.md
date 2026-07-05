---
title: "Phase 04 - Execution-host containment and substrate enforcement"
status: "implemented (#63)"
---

# Phase 04 - Execution-host containment and substrate enforcement

## Overview

Replace the stubbed confinement probe with a real, exercised local containment implementation
so the execution host's reported isolation is backed by proof: a named containment mechanism, a
termination/prove-empty check, a negative egress probe, and honest `provenIsolationStrength`
values feeding the existing Fence adjudication. Verify and complete substrate-manifest runtime
enforcement and redaction activation along the real-credential boundary.

## Background

The design (ADR 0022, Phase 6b) requires proven confinement: `provenIsolationStrength` from an
exercised check, prove-then-describe with a synchronous `describe()`, and autonomy judged on
proven, never reported. The Fence-side judgment, freshness clock, attestation
persist/recover-on-resume, and substrate manifest validation
(`src/substrate.ts` `validateSubstrateRequest`) already exist. What does not exist is the proof
itself: `strongLocalConfinementProbe` in `src/providers/real/host.ts` is a hardcoded
always-strong stub — exactly the "declared constant" the design forbids. `SEC-2` (no phone-home)
is a proven-containment boundary, and the EVRUN boundary lists real confinement and adversarial
no-phone-home among its unproven gaps.

## What To Do

- Implement a real local confinement probe: exercise the mechanism at compose time
  (prove-then-describe), name it in the attestation (`process-group` / `kernel-tree` /
  `job-object` vocabulary), include a termination/prove-empty step, a negative-probe egress
  check, and the planned-vs-actually-ran command binding the design names.
- Report honestly: on macOS, if the achievable local mechanism only supports `weak`, report
  proven `weak` — reduced autonomy is the designed consequence (`EARN-1/2`), a faked `strong`
  is a design violation. Wire `reported > proven` and absent/stale-proof paths to the existing
  failure tokens (`isolation-strength-overstated`, `containment-unproven`).
- Verify, and where gaps exist complete, runtime substrate-manifest enforcement on the real
  host path: every substrate request validated against the approved hashed tuple; out-of-tuple
  requests refused as recorded, diagnosable stops.
- Verify per-story ISO-4 isolation on the real path (isolated per-story workspaces; duplicate
  launch refused with `workspace-collision`) and close gaps found.
- Verify redaction activation at the boundary where real credentials can first enter records on
  this path; a redaction ambiguity stops the run.
- Wire `executionHost: 'real'` composition so it is selectable from configuration (today it
  requires a test-injected `realHostProbe`).

## Why

- `DRIVE-3`, `SEC-2`, `EARN-1/2` — honest, proven containment is what unlocks autonomy;
  `STACK-4` — capabilities attested, not assumed.
- ADR 0022 (Phase 6b) and the
  [realization roadmap](../../../design/contracts/provider-realization-roadmap.md#phase-6-realization-adr-0022) —
  this is the unfinished half of Phase 6.
- ADR 0026 — the conformance `self-report-only` basis exists precisely to catch the current
  stub's shape; this phase makes the real path classifiable as proven.
- Unblocks P11 (EVRUN-full requires real confinement and feeds the adversarial no-phone-home
  probe).

## Technical Requirements

- `ExecutionHostPort.describe()` stays synchronous; the proof runs async at compose time
  (settled by ADR 0022; reaffirmed in ADR 0028 — do not reopen).
- Core judges autonomy on proven values only; no code path may treat a report as proof.
- Launch attestation persist/recover behavior on resume is preserved (launch-immutable;
  resumed requests adjudicated against the launch attestation).
- The probe must be exercised, not derived: a check that inspects configuration without
  performing the confinement action does not qualify.
- Reference wiring and goldens unchanged; hermetic lanes must not perform real egress probes
  (probe logic tested with doubles; real exercise in the smoke lane and P11 evidence).
- Platform honesty: this phase proves macOS local behavior only; Windows stays gated on
  N1A-P14.

## Reference Files

- [Realization roadmap — Phase 6](../../../design/contracts/provider-realization-roadmap.md#phase-6-realization-adr-0022)
  and ADR 0022 (`docs/design/decisions/0022-phase-6-real-driver-integration.md`)
- [Security model](../../../design/security-model.md) (no-phone-home, substrate manifest vs
  attestation, credential ownership)
- [`core/authorization.md`](../../../design/core/authorization.md) (capability-attestation gate)
- [ADR 0026](../../../design/decisions/0026-conformance-self-report-only.md)
- Source: `src/providers/real/host.ts`, `src/providers/real/confinement.ts`,
  `src/substrate.ts`, `src/clock.ts`, `src/authorization.ts`, `src/bootstrap.ts`,
  `src/workspace.ts`
- Tests: host/confinement unit tests (`providers.real-*.p6*.unit.test.ts`), conformance lane

## Dependencies

- **Requires:** nothing hard.
- **Soft:** start after P02 (source layout).
- **Unlocks:** P11 (hard).
- **Parallel:** P03, P05, P06, P08, P09, P10.

## Acceptance Criteria

1. `executionHost: 'real'` is selectable from configuration and produces an attestation whose
   `provenIsolationStrength` comes from an exercised probe naming its mechanism.
2. A forced probe failure or stale proof withholds autonomy through the existing failure tokens
   — demonstrated by tests, with the Fence outcome recorded.
3. A deliberately overstated report (`reported > proven`) is recorded as
   `isolation-strength-overstated` and does not unlock the reported tier.
4. An out-of-manifest substrate request on the real path is refused, recorded, and diagnosable.
5. Conformance classifies the real host without `self-report-only` findings on the proven path,
   and the intentionally-broken-adapter case still fails closed.
6. Goldens byte-identical; hermetic lanes green.

## Verification

- `pnpm check`; conformance lane with the real-host double matrix.
- Smoke-lane exercise of the real probe on macOS, output attached to the PR (versions pinned).
- Reviewer axes: is the proof exercised or derived; honesty of the strength category; failure
  tokens wired to policy consequence; no autonomy on report.

## Out Of Scope

- Remote execution hosts (product deferral).
- Windows/Git Bash containment (N1A-P14 gate).
- The adversarial no-phone-home evidence record itself (P11 captures it; this phase builds the
  mechanism it exercises).
- New isolation-strength categories or port changes.

## Stop Or Escalate If

- No local mechanism can honestly support the autonomy tier the current fixtures/policies
  assume — surface the policy consequence to the owner rather than inflating the category.
- Proving confinement requires a `describe()` signature change — settled design (ADR 0022 via
  ADR 0028); route to design authority instead of changing it.
- The exercised probe reveals the isolation-strength catalog (`none`/`weak`/`strong`) cannot
  express a real intermediate posture — that is a design-vocabulary question, not an
  implementation choice.
