---
title: "ADR 0026 — Conformance self-report-only basis and controlled-double adequacy bar"
status: applied
---

# ADR 0026 — Conformance self-report-only basis and controlled-double adequacy bar

## Context

The reusable provider conformance suite is now the executable guard for the four provider seams
introduced by [ADR 0021](./0021-phase-5-integrated-provider-runs.md) and deepened by
[ADR 0022](./0022-phase-6-real-driver-integration.md),
[ADR 0023](./0023-phase-7-real-forge-landing.md), and
[ADR 0024](./0024-phase-8-real-work-source.md). It checks interface shape, fail-closed behavior, and
specified responses from controlled provider doubles. That is necessary, but it can be misread as
proving more than it does.

The risk is the same one the provider contracts already name for execution-host confinement and
capability proof: a provider can report success or report a strong posture without independently
observable proof. A conformance suite that treats that report as indistinguishable from observed
behavior would weaken the design language from "proved, not asserted" into "green because the
subject said so." That is especially dangerous for mocks and reference doubles because a mock can lie.

This decision is bounded to the conformance vocabulary and its design documentation. It does not change
the execution-plan contract, the observability-records contract, record schemas, golden fixtures, or
the port surfaces in `src/ports.ts` / `src/bootstrap.ts`.

## Decision

Two settlements are binding for the provider conformance suite.

### 1. `self-report-only` is an enumerated conformance-basis token

The conformance verdict vocabulary includes the basis token `self-report-only`. A verdict uses this
token whenever the suite can only classify the subject's own claim and cannot point to independently
observable behavior or an internal contradiction in the returned data.

This is additive. Existing finding codes remain valid; no existing finding code or basis token is
renamed, removed, or repurposed. It does narrow one classification boundary: a reported-isolation
claim with absent `provenIsolationStrength` is now classified as
`host-isolation-self-report-only`, not `host-isolation-overstated`, because the suite has only the
subject's claim. `host-isolation-overstated` remains the verdict when `provenIsolationStrength` is
present but lower than `reportedIsolationStrength`. The suite may keep a compatibility API that
returns string finding codes, but the typed verdict form is the canonical form when a caller needs to
distinguish conformance basis.

The first required production path is execution-host isolation: if a host reports an isolation strength
or positive capability posture without a proven isolation strength, the conformance outcome carries the
`self-report-only` basis. That outcome is not a pass and not equivalent to an independently observed
proof.

### 2. A green controlled-double suite does not prove real-provider truth

The suite's adequacy bar is: it proves interface-shape conformance and specified responses under
controlled doubles. It cannot prove real-provider behavioral truth. A mock can lie.

Therefore conformance documentation and code entry-point comments must state this limitation. Future
provider work must not cite a green conformance run as proof that a real provider actually confined a
process, withheld credentials, avoided egress, or performed a forge/source effect truthfully unless
that truth was independently observed by the relevant real-provider proof or runtime evidence path.

## Consequences

- Consumers of conformance results must inspect typed verdict basis when deciding whether a failure was
  independently observed, detected from specified responses, or only self-reported by the subject.
- `self-report-only` verdicts are actionable warnings/failures in the suite, not an alternate passing
  posture.
- Reference adapters and mocks remain useful for proving the reusable interface and adversarial cases,
  but they do not become evidence that real providers behave truthfully outside the controlled checks.
- The implementation remains contract-preserving: no execution-plan contract, observability-records
  contract, committed record schema, or golden fixture byte changes are authorized by this ADR.

## Reconciles to

- `DRIVE-1` — a driver earns its place via a conformance suite, not assertion.
- `DRIVE-3` — execution hosts report containment strength honestly.
- `SEC-2` — no phone-home is a proven containment boundary, not a provider assertion.
- `EARN-1` and `EARN-2` — autonomy follows fresh capability proof, not assumption.

## Open questions

None. The token is additive and does not require a contract or golden-fixture change.
