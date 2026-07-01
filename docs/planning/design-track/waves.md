---
title: "Jig — design-track waves"
status: draft — integration
---

# Design-track waves

This is the rolled-up index for the committed design-track wave set. It stays at planning altitude:
which wave owns what, which stories exist under it, what files they deepen or produce, and which
integration notes U9 must keep visible.
U9 supersedes the temporary continuation handoff by carrying the durable wave rollup here and in
[`dependency-dag.md`](./dependency-dag.md), [`traceability.md`](./traceability.md), and
[`review-and-red-team.md`](./review-and-red-team.md).

Wave 4 is intentionally split into [`wave-4a-core/`](./waves/wave-4a-core/README.md) and
[`wave-4b-providers/`](./waves/wave-4b-providers/README.md). That split is the canonical planning
shape; U9 does not collapse it back into a single row.

| Wave | Charter                                                                             | Depends on                     | Stories                            | Primary outputs                                                                                                                            | Integration notes                                                                                                                         |
| ---- | ----------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | [`wave-0-charter/`](./waves/wave-0-charter/README.md)                               | —                              | `w0-s1`, `w0-s2`                   | `docs/design/charter.md`, `docs/design/conventions.md`, ADR continuation from `0017`                                                       | Governance substrate for later waves; not a jig design-area deepening pass.                                                               |
| 1    | [`wave-1-domain/`](./waves/wave-1-domain/README.md)                                 | `0`                            | `w1-s1`, `w1-s2`                   | `docs/design/domain/configuration-and-work.md`, `docs/design/domain/runtime-and-observation.md`                                            | Establishes the entity/ownership model later waves consume.                                                                               |
| 2    | [`wave-2-state-machines/`](./waves/wave-2-state-machines/README.md)                 | `1`                            | `w2-s1`, `w2-s2`, `w2-s3`          | `docs/design/core/orchestration.md`, `docs/design/core/bootstrap.md`, continued `INV-*` ledger at the conventions-owned home               | `w2-s3` is the Wave 2 consolidation checkpoint, not a third runtime subsystem.                                                            |
| 3    | [`wave-3-ports/`](./waves/wave-3-ports/README.md)                                   | `1`, `2`                       | `w3-s1`, `w3-s2`                   | `docs/design/contracts/providers.md`, `docs/design/core/plan-intake.md`, `docs/design/core/records.md`, `docs/design/contracts/driving.md` | Introduces the seam map Wave 4 core/providers deepen in place.                                                                            |
| 4a   | [`wave-4a-core/`](./waves/wave-4a-core/README.md)                                   | `1`, `2`, `3`                  | `w4-s1`, `w4-s2`, `w4-s3`, `w4-s4` | `docs/design/core/{records,plan-intake,authorization,bootstrap}.md`                                                                        | Owns the GUARD-2 seam split, the only committed story DAG, and the core-side `INV-009+` candidate set.                                    |
| 4b   | [`wave-4b-providers/`](./waves/wave-4b-providers/README.md)                         | `1`, `2`, `3`, `4a`            | `w4-s5`, `w4-s6`, `w4-s7`, `w4-s8` | `docs/design/contracts/providers.md` (four deepened sections)                                                                              | Owns the provider boundary rule, SEC-2 design posture, orphaned owner map, and work-source dedup flag.                                    |
| 5    | [`wave-5-red-team/`](./waves/wave-5-red-team/README.md)                             | `1`, `2`, `3`, `4a`, `4b`      | `w5-s1`, `w5-s2`                   | Planning-track probe outputs only; no `docs/design/**` targets                                                                             | `w5-s1` owns the full SEC-2 phone-home adversarial scenario; `w5-s2` owns recovery/records/bootstrap integration probes.                  |
| 6    | [`wave-6-implementation-phasing/`](./waves/wave-6-implementation-phasing/README.md) | `1`, `2`, `3`, `4a`, `4b`, `5` | `w6-s1`                            | Planning-track prerequisite triage and implementation-phasing handoff only; no `docs/design/**` targets                                    | Sequences delivery phases and gates; carries Wave 5 findings as stops/evidence gates; does not re-own U9 collection or contract mutation. |

## Story inventory

### Wave 0

- `w0-s1-design-charter`
- `w0-s2-conventions-and-ledgers`

### Wave 1

- `w1-s1-configuration-and-work-domain`
- `w1-s2-runtime-and-observation-domain`

### Wave 2

- `w2-s1-work-item-lifecycle`
- `w2-s2-run-lifecycle-and-recovery`
- `w2-s3-invariant-catalog`

### Wave 3

- `w3-s1-provider-port-skeleton`
- `w3-s2-data-and-driving-ports`

### Wave 4a

- `w4-s1-records-observability`
- `w4-s2-plan-policy-evidence`
- `w4-s3-authority-spine`
- `w4-s4-bootstrap-composition-root`

### Wave 4b

- `w4-s5-agent-provider`
- `w4-s6-execution-host-provider`
- `w4-s7-forge-provider`
- `w4-s8-work-source-provider`

### Wave 5

- `w5-s1-authority-and-provider-red-team`
- `w5-s2-recovery-records-integration-red-team`

### Wave 6

- `w6-s1-implementation-phasing`

## Review posture by wave

| Wave | Build-time review status                                                                        | U9 carry-forward                                                                                    |
| ---- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 0    | Settled; D-001..D-003 recorded                                                                  | None beyond governance provenance.                                                                  |
| 1    | Settled; frame-gate decisions in place                                                          | Domain ownership map feeds every later traceability row.                                            |
| 2    | Settled; D-004 fixed the wave-scoped `D-###` reference issue                                    | GUARD-2 pause-point threading remains a U9 seam item.                                               |
| 3    | Settled; D-004 defer recorded for bare `D-###` in frame-only citation contexts                  | Work-source candidate dedup must be handled with Wave 4b as one candidate.                          |
| 4a   | Settled; APPROVE, plus D-007 exact `reconciles_to` gloss fix                                    | GUARD-2 threading and `INV-009+` candidate reconciliation carry forward.                            |
| 4b   | Settled; D-007/D-008 source-fidelity fixes applied                                              | Orphaned owner confirmation, provider split question, and SEC-2 collector role carry forward.       |
| 5    | Settled scaffold; D-007 replaced temporary governing-source links with durable track-local refs | U9 must collect the planned SEC-2 and recovery/records red-team posture without inventing findings. |
| 6    | Authored handoff; D-009/D-010 add Wave 5 prerequisite triage and the non-code phasing artifact  | U9 must keep Wave 6 as a handoff artifact, not a design doc or delivery tracker.                    |

## Related

- [`dependency-dag.md`](./dependency-dag.md) — cross-wave dependency view.
- [`traceability.md`](./traceability.md) — owner matrix, invariant candidates, and orphan check.
- [`review-and-red-team.md`](./review-and-red-team.md) — review checklists and collected red-team posture.
