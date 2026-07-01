---
title: "w5-s1 output package — authority and provider red team"
status: draft
story: w5-s1-authority-and-provider-red-team
wave: wave-5-red-team
---

# w5-s1 output package — authority and provider red team

## Purpose and scope

This package is the planning-track-only output for
`w5-s1-authority-and-provider-red-team`. It probes the authority spine, provider
boundary claims, and the SEC-2 adversarial phone-home surface without editing
`docs/design/**`, introducing new jig entities or runtime states, or resolving
design gaps locally.

This package preserves the SEC-2 three-way split exactly:

- `w4-s6` owns the execution-host design posture and proof seed.
- `w5-s1` owns the adversarial phone-home scenario set and gap analysis.
- U9 collects the posture plus red-team findings.

## Source set

Primary planning-track sources:

- `../../README.md`
- `../../frame.md`
- `../../decisions.md`
- `../../stories/w5-s1-authority-and-provider-red-team.md`
- `../../../wave-4b-providers/decisions.md`
- `../../../wave-4b-providers/frames/w4-s6-execution-host-provider.md`
- `../../../wave-4b-providers/stories/w4-s5-agent-provider.md`
- `../../../wave-4b-providers/stories/w4-s6-execution-host-provider.md`
- `../../../wave-4b-providers/stories/w4-s7-forge-provider.md`
- `../../../wave-4b-providers/stories/w4-s8-work-source-provider.md`
- `../../../wave-4a-core/frames/w4-s2-plan-policy-evidence.md`
- `../../../wave-4a-core/frames/w4-s3-authority-spine.md`
- `../../../wave-3-ports/frame.md`
- `../../../wave-3-ports/stories/w3-s1-provider-port-skeleton.md`

Read-only product/design sources:

- `../../../../../../design/contracts/providers.md`
- `../../../../../../design/core/authorization.md`
- `../../../../../../product/guarantees.md`
- `../../../../../../product/concepts.md`

## Package contents

- [`adversarial-scenarios.md`](./adversarial-scenarios.md) — scenario families,
  probe steps, expected proof claims, and routing targets.
- [`contradiction-matrix.md`](./contradiction-matrix.md) — cross-source claim
  checks across authority, provider, and SEC-2 seams.
- [`routed-findings.md`](./routed-findings.md) — source-backed findings, open
  questions, and candidate invariant gaps routed to existing owners or U9.

## What stays out

- No `docs/design/**` edits or new design targets.
- No recovery/records integration analysis owned by `w5-s2`.
- No new provider seam, authority mechanism, runtime state, schema, package, or
  implementation task.
- No new numbered `INV-*` row.

## Review evidence pointer

Expected review evidence for this package is a later design-review artifact or
decision-log disposition recorded against Wave 5. This package itself only
declares the pointer surface; it does not perform review.
