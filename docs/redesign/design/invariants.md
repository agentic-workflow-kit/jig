---
title: "Invariants — the consolidated Layer 1 contract for later design"
purpose: State the exact invariant set every later design must preserve, and trace each invariant to its selecting decision and project-brief drivers.
audience:
  - Future Layer 2 architecture authors after authorization
  - Independent architecture reviewers
  - Arye Kogan, Jig product and architecture decision owner
scope: Canonical wording of I1–I21 and their decision and driver traceability; the decision rationale itself lives in the decision records.
state: proposed
status: proposed Layer 1 content, re-presented 2026-07-15 under the owner-directed view-based structure; pending independent review of the new candidate set
owner: Arye Kogan
last_verified: 2026-07-15
sources_of_truth:
  - ./brief.md
  - ./decisions/README.md
  - ./decisions/D9-invariants-and-artifact-shape.md
related:
  - ./model.md
  - ./decisions/review-and-approval-record.md
---

# Invariants — the consolidated Layer 1 contract for later design

Every later design must preserve this exact set:

| ID  | Invariant                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | The approved project definition and explicit owner decisions remain Architecture Authority; outside material is non-binding unless explicitly imported.                            |
| I2  | Jig owns the authority-and-proof boundary even when external mechanisms are bundled with or run inside Jig.                                                                        |
| I3  | Jig Control remains the sole routine lifecycle authority; judgment participants and mechanisms retain only their scoped powers.                                                    |
| I4  | The same authoritative state and ordered validated trigger produce the same decision and authorized Operations.                                                                    |
| I5  | The durable ordered Transition ledger remains authoritative and is committed before live-state adoption or effect dispatch.                                                        |
| I6  | Recovery reconstructs durable truth and fences stale control before dispatch resumes.                                                                                              |
| I7  | Candidate-sensitive judgment, evidence, authority, and effects remain bound to the exact subject; stale or mismatched facts fail closed.                                           |
| I8  | Reviewer full-package approval of the exact Candidate remains the acceptance gate; Jig validates but does not independently rejudge sufficiency.                                   |
| I9  | Frozen policy selects final verification `deterministic` or `none`; configuration and providers cannot lower or silently change it.                                                |
| I10 | Capacity remains explicit by scarce resource class, and deterministic scheduling preserves a progress path for admitted work.                                                      |
| I11 | Admission, finalization, and blocker-attribution ties use the immutable total comparator.                                                                                          |
| I12 | Exactly one Story owns target-scoped finalization authority; waiting Stories hold no authority.                                                                                    |
| I13 | Only confirmed landing releases dependencies; approval, publication, checks, integration request/response, or cleanup does not.                                                    |
| I14 | Direct non-delivery roots (`Blocked` or `Rejected`) remain durable facts, and multi-root dependency outcomes preserve the complete canonically ordered reachable direct-root set.  |
| I15 | Failures remain at the smallest safe scope and fail closed whenever authority or proof is insufficient.                                                                            |
| I16 | Every retry, rework, refresh, wait, Recovery, and Retirement path is bounded and has an explicit exhaustion action.                                                                |
| I17 | A second semantic effect is forbidden until the earlier effect is known absent or reconciled.                                                                                      |
| I18 | Business outcome and Retirement remain separate; cleanup cannot reverse landing or delay dependency release.                                                                       |
| I19 | Work and evidence are preserved before resource destruction; unresolved Retirement becomes a durable owner-assigned Residual Obligation.                                           |
| I20 | The architecture makes no autonomous safety or Recovery guarantee after authoritative-store or decision-authority compromise.                                                      |
| I21 | Layer 1 approval remains distinct from implementation and current-state truth; changing a locked invariant requires explicit reopen, impact statement, and renewed owner approval. |

## Invariant and lock traceability

This table traces each invariant to its selecting decision and its principal project-brief drivers
(outcomes `O*`, capabilities `C*`, quality scenarios `QS*`, and constraints `CON*`) without creating
a second definition.

| Invariant                                                 | Selected by | Principal Layer 0 drivers       | Lock consequence for later design                                                         |
| --------------------------------------------------------- | ----------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| I1 — architecture/source authority                        | D1          | O1, O2, O9; CON1–CON5           | Cannot import or elevate outside material silently.                                       |
| I2 — Jig authority-and-proof boundary                     | D2          | O1, O7; C12; QS8                | Cannot shift end-to-end authority/proof to a mechanism.                                   |
| I3 — sole routine lifecycle authority and scoped powers   | D3          | O2, O7; C12; QS8, QS11          | Cannot federate lifecycle decisions or widen participant powers.                          |
| I4 — deterministic decision from ordered validated facts  | D3, D5      | O2; QS1                         | Cannot introduce unrecorded or arrival-order discretion.                                  |
| I5 — ledger authority and record-before-adopt/dispatch    | D4, D5      | O6, O8; QS1, QS5                | Cannot make a cache, process, or uncommitted effect authoritative.                        |
| I6 — fence and reconstruct before resume                  | D5, D8      | O5, O6; C11; QS5, QS11          | Cannot resume from ambient or stale control state.                                        |
| I7 — exact-subject binding and fail-closed mismatch       | D3, D5, D7  | O3, O7; QS2, QS3, QS8           | Cannot reuse stale judgment, evidence, authority, or effect results.                      |
| I8 — reviewer-principal acceptance                        | D7          | O3, O7; C4; QS3                 | Cannot replace mandatory reviewer judgment or add Jig sufficiency judgment.               |
| I9 — policy-selected `deterministic` or `none`            | D7          | O2, O7; QS3, QS8                | Cannot let configuration/provider weaken or silently change policy.                       |
| I10 — resource-class capacity and admitted progress       | D6          | O3, O5; C6, C10; QS2, QS7, QS12 | Cannot reduce capacity to Story count or admit work without a progress path.              |
| I11 — immutable total comparator                          | D6          | O2, O4; QS1, QS4                | Cannot break ties by collection, arrival, or mechanism order.                             |
| I12 — one target-scoped finalization authority            | D6          | O4; C7; QS4                     | Cannot authorize concurrent target-changing finalization.                                 |
| I13 — confirmed landing releases dependencies             | D4, D6, D7  | O4; C8; QS4                     | Cannot release on approval, publication, checks, integration response, or cleanup.        |
| I14 — complete canonical direct non-delivery roots        | D4, D6      | O2, O8; QS1, QS6                | Cannot discard Blocked/Rejected roots or choose attribution by arrival order.             |
| I15 — smallest-safe fail-closed scope                     | D3, D8      | O5, O7; C9; QS6, QS8, QS11      | Cannot widen isolated failure gratuitously or continue with insufficient authority/proof. |
| I16 — bounded paths and exhaustion                        | D8          | O5; C10; QS7, QS12              | Cannot create an unnamed or indefinite retry, wait, Recovery, or Retirement path.         |
| I17 — no second semantic effect before reconciliation     | D5, D8      | O6; C11; QS5                    | Cannot blind-retry an uncertain irreversible effect.                                      |
| I18 — business outcome separate from Retirement           | D4, D8      | O4, O8; QS4, QS9                | Cannot let cleanup reverse landing or delay dependency release.                           |
| I19 — preserve before destruction and assign residuals    | D4, D8      | O8; C13, C14; QS9               | Cannot destroy recoverable work/evidence or leave an obligation ownerless.                |
| I20 — no autonomous guarantee after trust-root compromise | D3, D5, D8  | O5, O7; QS11, QS12              | Cannot claim safe autonomous Recovery from untrustworthy authority/history.               |
| I21 — approval distinct from implementation/current truth | D9          | O1, O9; CON5, CON8              | Cannot claim conformance, enter Layer 2, or change a lock without the required gates.     |

The recorded lock is not yet effective; see the
[review and approval record](./decisions/review-and-approval-record.md) for the current gate state.
After the lock becomes effective, changing any row requires a Layer 1 reopen, impact statement,
renewed owner decision, and exact-candidate review; a Layer 2 artifact cannot redefine it by
elaboration.
