---
title: "Jig — design-track traceability"
status: draft — integration
---

# Design-track traceability

This is the U9 owner matrix across the committed planning track. It records three things without
re-litigating product or assigning new invariant numbers:

1. which story owns which product IDs at planning altitude;
2. which design file or planning-track output that story deepens or produces;
3. which already-numbered invariants or un-numbered `INV-009+` candidates stay attached to that
   ownership.

Where a story has `design_targets: []`, that is deliberate source truth: the story produces
planning-track outputs or routed findings rather than deepening `docs/design/**` directly.
U9 supersedes the temporary continuation handoff by carrying durable owner/candidate routing here
and in [`dependency-dag.md`](./dependency-dag.md), [`waves.md`](./waves.md), and
[`review-and-red-team.md`](./review-and-red-team.md).

## Owner matrix

| Story owner                                   | Design file or output                                                                                | Product IDs reconciled here                                                                                                                                                          | Existing `INV-*` linkages                                              | Existing handoff-category linkages                       | Un-numbered candidate linkages / U9 notes                                                                                                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `w0-s1-design-charter`                        | `docs/design/charter.md`                                                                             | `FENCE-1..3`, `EARN-1..2`, `GUARD-1..2`, `DOOR-1..3`, `MERGE-1..5`, `SEC-1..3`, `CFG-1..3`, `CFG-10`, `RESUME-1..5`, `ISO-1..4`, `LIVE-1..2`, `STACK-1..5`, `DRIVE-1..3`, `SEE-1..6` | none                                                                   | none                                                     | Governance owner only; no new candidate numbering.                                                                                                                                        |
| `w0-s2-conventions-and-ledgers`               | `docs/design/conventions.md`, ADR continuation                                                       | `SEE-1`, `SEE-2`, `SEE-3`                                                                                                                                                            | preserves `INV-001..008` continuity rule                               | none                                                     | Owns the continuation rule and namespace discipline, not the later candidate content.                                                                                                     |
| `w1-s1-configuration-and-work-domain`         | `docs/design/domain/configuration-and-work.md`                                                       | `CFG-1`, `CFG-2`, `CFG-3`, `CFG-10`, `GUARD-1`, `MERGE-3`                                                                                                                            | none                                                                   | none                                                     | Establishes the Policy / Work profile / Repo-floor ownership line later waves cite.                                                                                                       |
| `w1-s2-runtime-and-observation-domain`        | `docs/design/domain/runtime-and-observation.md`                                                      | `SEE-1..6`, `MERGE-1`, `MERGE-3`, `MERGE-4`                                                                                                                                          | `INV-003`, `INV-004`, `INV-006`, `INV-007`                             | `OBS-001..004`; `CTX-001`                                | No new candidate set recorded here; this is the record-derived entity owner.                                                                                                              |
| `w2-s1-work-item-lifecycle`                   | `docs/design/core/orchestration.md`                                                                  | `MERGE-1`, `MERGE-2`, `MERGE-4`, `MERGE-5`, `FENCE-1..3`, `DOOR-1..3`, `EARN-1..2`, `ISO-1`, `ISO-3`                                                                                 | `INV-004`, `INV-005`, `INV-008`                                        | none                                                     | Feeds the Wave 2 `INV-009+` catalog through `w2-s3`; source names candidate content but leaves numbering to consolidation.                                                                |
| `w2-s2-run-lifecycle-and-recovery`            | `docs/design/core/orchestration.md`, `docs/design/core/bootstrap.md`                                 | `RESUME-1..5`, `GUARD-1`, `GUARD-2`, `LIVE-1`, `LIVE-2`, `MERGE-4`                                                                                                                   | `INV-003`, `INV-006`                                                   | none                                                     | Feeds the Wave 2 `INV-009+` catalog with resume/recovery candidates such as launch-binding-immutability-across-resume and no-double-effect.                                               |
| `w2-s3-invariant-catalog`                     | continued `INV-*` ledger at the conventions-owned home                                               | `SEE-1`, `SEE-2`, `SEE-3`                                                                                                                                                            | consolidates Wave 2 inputs into `INV-009+`                             | none                                                     | Wave 2's candidate bucket remains owned here; U9 keeps it as a source bucket and does not invent numbering.                                                                               |
| `w3-s1-provider-port-skeleton`                | `docs/design/contracts/providers.md`                                                                 | `STACK-1..5`, `DRIVE-1..3`, `SEC-1..3`, `FENCE-2`, `FENCE-3`, `EARN-1`, `EARN-2`, `MERGE-2`                                                                                          | `INV-002`, `INV-007`                                                   | `SURF-003`, `SURF-006`; `CTX-005`; `DEL-004`; `ENF-004`  | Candidate set includes `providers-hold-no-credentials`, `no-phone-home-proven-not-trusted`, `capabilities-attested-not-assumed`, and `work-source-never-bypasses-plan` (dedup row below). |
| `w3-s2-data-and-driving-ports`                | `docs/design/core/plan-intake.md`, `docs/design/core/records.md`, `docs/design/contracts/driving.md` | `SEE-1`, `SEE-2`, `SEC-1`                                                                                                                                                            | `INV-006`, `INV-007`                                                   | `SURF-001`, `SURF-002`, `SURF-004`; `ENF-001`, `ENF-003` | Candidate set includes `validate-once-at-the-boundary`, `append-only-single-writer`, `edge-imports-no-provider-contracts`, `port-contracts-are-versioned-seams`.                          |
| `w4-s1-records-observability`                 | `docs/design/core/records.md`                                                                        | `SEE-1..6`, `SEC-1`, `LIVE-1`, `LIVE-2`                                                                                                                                              | `INV-006`                                                              | none                                                     | Candidate set: `write-conflict-rejected`, `replay-determinism`.                                                                                                                           |
| `w4-s2-plan-policy-evidence`                  | `docs/design/core/plan-intake.md`                                                                    | `MERGE-1`, `MERGE-3`, `MERGE-4`, `GUARD-1`, `GUARD-2`, `CFG-1`, `CFG-2`, `CFG-10`, `EARN-1`, `EARN-2`                                                                                | `INV-007`                                                              | none                                                     | Candidate set: `evidence-observed-not-self-reported`, `rule-governing-surface-forces-pause`.                                                                                              |
| `w4-s3-authority-spine`                       | `docs/design/core/authorization.md`                                                                  | `FENCE-1..3`, `GUARD-1`, `GUARD-2`, `DOOR-1..3`, `EARN-1`, `EARN-2`, `CFG-10`, `STACK-4`, `DRIVE-1`, `DRIVE-3`                                                                       | none new-numbered                                                      | none                                                     | Candidate set: `fail-closed-on-undeclared-request`, `category-boundary-fixed-not-adjudicated`, `escalation-survives-interruption`.                                                        |
| `w4-s4-bootstrap-composition-root`            | `docs/design/core/bootstrap.md`                                                                      | `RESUME-1..5`, `GUARD-1`, `CFG-9`, `ISO-4`, `SEE-1`                                                                                                                                  | `INV-003`                                                              | none                                                     | Candidate set: `binding-record-append-precedes-run-readiness`, `resume-re-entry-preserves-original-binding`.                                                                              |
| `w4-s5-agent-provider`                        | `docs/design/contracts/providers.md` (Agent section)                                                 | `STACK-1`, `STACK-2`, `STACK-4`, `STACK-5`, `DRIVE-1`, `EARN-1`, `EARN-2`, `FENCE-1..3`, `MERGE-1`, `MERGE-2`, `ISO-1`                                                               | cites `INV-002`                                                        | none                                                     | Supplies agent-side attestation claims; does not mint a new candidate set.                                                                                                                |
| `w4-s6-execution-host-provider`               | `docs/design/contracts/providers.md` (Execution host section)                                        | `SEC-2`, `DRIVE-3`, `ISO-4`, `STACK-1`, `STACK-2`, `STACK-4`, `STACK-5`, `EARN-1`, `EARN-2`                                                                                          | none new-numbered                                                      | none                                                     | Candidate set: `containment-proven-not-asserted`, `isolation-strength-honestly-reported`; owns SEC-2 posture/proof seed only.                                                             |
| `w4-s7-forge-provider`                        | `docs/design/contracts/providers.md` (Forge section)                                                 | `MERGE-1..5`, `FENCE-3`, `SEC-3`, `STACK-1`, `STACK-2`, `STACK-4`, `STACK-5`                                                                                                         | none                                                                   | none                                                     | No new candidate set; owns the mechanical MERGE-5 surfacing act, not state semantics.                                                                                                     |
| `w4-s8-work-source-provider`                  | `docs/design/contracts/providers.md` (Work source section)                                           | `STACK-1`, `STACK-2`, `STACK-4`, `STACK-5`, `CFG-4`, `CFG-7`                                                                                                                         | cites `INV-007`                                                        | none                                                     | Carries the dedup candidate `work-source-never-bypasses-plan` with Wave 3; do not treat as a second candidate.                                                                            |
| `w5-s1-authority-and-provider-red-team`       | planning-track probe outputs only                                                                    | `FENCE-1..3`, `EARN-1..2`, `GUARD-2`, `DOOR-1..3`, `SEC-2`, `STACK-2`, `STACK-4`, `STACK-5`, `DRIVE-1..3`                                                                            | cites `INV-002`                                                        | none                                                     | Owns the full SEC-2 phone-home adversarial scenario and routed findings, not the `w4-s6` design posture.                                                                                  |
| `w5-s2-recovery-records-integration-red-team` | planning-track probe outputs only                                                                    | `RESUME-1..5`, `GUARD-1`, `GUARD-2`, `ISO-4`, `SEE-1`, `SEE-3`, `SEE-5`, `SEE-6`, `LIVE-1`, `LIVE-2`, `SEC-1`                                                                        | cites `INV-003`, `INV-006`                                             | none                                                     | Pressure-tests Wave 4a / Wave 2 candidate seams read-only, especially bootstrap and records integration.                                                                                  |
| `w6-s1-implementation-phasing`                | planning-track prerequisite triage and implementation handoff only                                   | `FENCE-1`, `FENCE-3`, `GUARD-1`, `MERGE-1`, `MERGE-2`, `MERGE-4`, `ISO-4`, `SEC-2`, `STACK-2`, `STACK-4`, `STACK-5`, `DRIVE-1`, `DRIVE-3`, `SEE-1`, `SEE-3`                          | cites `INV-001`, `INV-002`, `INV-003`, `INV-006`, `INV-007`, `INV-008` | none                                                     | No new candidate numbering; sequences implementation and gates only; Wave 5 findings enter through Wave 6 triage as stops/evidence gates or routed-owner work.                            |

## Known `INV-009+` candidate set

U9 keeps the candidate set reconciled by **name only** unless a source has already settled a number.
Nothing below assigns new `INV-*` numbers.

| Source owner                                | Candidate names carried forward                                                                                                                                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wave 2 (`w2-s3` fed by `w2-s1` and `w2-s2`) | Wave 2 lifecycle/recovery catalog remains a source-owned bucket. The stories explicitly feed `w2-s3`, but final numbering and any duplicate collapse remain deferred to the later design authoring session. |
| `w3-s1-provider-port-skeleton`              | `providers-hold-no-credentials`; `no-phone-home-proven-not-trusted`; `capabilities-attested-not-assumed`; `work-source-never-bypasses-plan`                                                                 |
| `w3-s2-data-and-driving-ports`              | `validate-once-at-the-boundary`; `append-only-single-writer`; `edge-imports-no-provider-contracts`; `port-contracts-are-versioned-seams`                                                                    |
| `w4-s1-records-observability`               | `write-conflict-rejected`; `replay-determinism`                                                                                                                                                             |
| `w4-s2-plan-policy-evidence`                | `evidence-observed-not-self-reported`; `rule-governing-surface-forces-pause`                                                                                                                                |
| `w4-s3-authority-spine`                     | `fail-closed-on-undeclared-request`; `category-boundary-fixed-not-adjudicated`; `escalation-survives-interruption`                                                                                          |
| `w4-s4-bootstrap-composition-root`          | `binding-record-append-precedes-run-readiness`; `resume-re-entry-preserves-original-binding`                                                                                                                |
| `w4-s6-execution-host-provider`             | `containment-proven-not-asserted`; `isolation-strength-honestly-reported`                                                                                                                                   |
| `w4-s8-work-source-provider`                | no separate row: this source points at the same `work-source-never-bypasses-plan` candidate already named by Wave 3 and is tracked as the same dedup candidate                                              |

## Cross-wave seam threading

### GUARD-2

`GUARD-2` is not orphaned. The settled ownership split from [`wave-4a-core/decisions.md`](./waves/wave-4a-core/decisions.md)
D-003 threads across waves as follows:

- `w4-s2-plan-policy-evidence` owns the **rule**: what counts as a rule-governing surface and why a
  fresh-evidence pause is required.
- `w4-s3-authority-spine` co-owns the **enforcement mechanism**: Fence detection plus Doorbell
  re-approval capture.
- Wave 2 supplies the **pause point** at the work-item `done` guard, but the committed Wave 2 story
  predates the explicit GUARD-2 naming. U9 therefore records this as a traceability seam rather than
  silently assuming the re-projection is already reflected in Wave 2 wording.
- `w5-s1` and `w5-s2` probe the seam read-only; `w6-s1` only sequences it as a later gate.

The residual sub-state question remains open by source: distinct `re-approval pending` sub-state
versus reuse of `parked`.

### SEC-2

`SEC-2` is also not orphaned. The settled split is:

- `w4-s6-execution-host-provider` owns the design posture and proof requirement/seed;
- `w5-s1-authority-and-provider-red-team` owns the full phone-home adversarial scenario and routed
  gaps;
- U9 collects both in [`review-and-red-team.md`](./review-and-red-team.md).

## Orphan check for the Wave 4b D-004 owner set

| Product ID | Ownership result                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STACK-2`  | Not orphaned. Primary ownership is intentionally distributed across `w4-s5`, `w4-s6`, `w4-s7`, and `w4-s8`, one story per swappable seam.                                 |
| `STACK-4`  | Not orphaned. `w4-s6` is the primary proof supplier; `w4-s5` is the secondary supplier; `w4-s3` judges freshness/sufficiency read-only.                                   |
| `DRIVE-1`  | Not orphaned. `w4-s6` is primary because the execution-host seam is the sharpest conformance/adversarial target; `w4-s5` is secondary for future real-driver conformance. |
| `DRIVE-3`  | Not orphaned. `w4-s6` is the sole story owner because honest containment reporting lives only on the execution-host seam.                                                 |
| `SEC-2`    | Not orphaned. `w4-s6` owns the design posture; `w5-s1` owns the adversarial scenario; U9 owns only the collector view.                                                    |
| `EARN-2`   | Not orphaned. `w4-s6` is the primary proof supplier, `w4-s5` is secondary, and `w4-s3` remains the judging surface by citation.                                           |

## Residual traceability notes

- `CFG-5`, `CFG-6`, and `CFG-8` have no current story owner by source. Wave 0 deliberately left
  `CFG-4..9` out of charter ownership, and the committed story rows now cover `CFG-4`, `CFG-7`,
  and `CFG-9` only.
- U9 therefore records `CFG-5/6/8` as product/deferred mechanics rather than silently assigning
  them to an existing wave or story owner.

## Residual U9 reviewer risks

- Wave 2's candidate catalog is intentionally still a source-owned bucket. U9 preserves that state
  rather than reverse-engineering a final numbered list.
- Temporary continuation guidance is now superseded by the committed track-local integration docs
  and the updated Wave 5 / Wave 6 sources.
- `w5-s1` and `w5-s2` prescribe future probe outputs; this U9 pass can collect posture and routing,
  but not findings that have not been authored.
