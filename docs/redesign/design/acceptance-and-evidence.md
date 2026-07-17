---
title: "Acceptance and evidence — reviewer-principal judgment and landing proof"
purpose: Define what judgment accepts an exact Candidate, what Jig validates, which evidence contributes to which claims, and what proves landing.
audience:
  - Architecture, engineering, security, and operations reviewers
  - Arye Kogan, Jig product and architecture decision owner
scope: Acceptance authority, policy-selected final verification, evidence roles, and landing proof; evidence and verdict schemas, artifact storage, reviewer protocol, check-policy language, integrity mechanisms, and landing-proof algorithms are excluded.
state: proposed
status: established Layer 1 baseline with bounded 2026-07-17 remediation amendments; renewed exact-candidate review pending
owner: Arye Kogan
last_verified: 2026-07-17
sources_of_truth:
  - ./brief.md
  - ./model.md
  - ./decisions/D7-acceptance-and-evidence.md
related:
  - ./flows/run-and-story-lifecycle.md
  - ./state-and-recovery.md
  - ./concurrency-and-finalization.md
  - ./perspectives/authority-and-trust.md
---

# Acceptance and evidence — reviewer-principal judgment and landing proof

## Acceptance authority

The reviewer owns full-package judgment of:

- the implementation;
- requirements and acceptance criteria;
- technical and delivery risk;
- implementer evidence sufficiency, provenance, and relevance;
- findings and unresolved issues; and
- delivery metadata accuracy and completeness.

A valid reviewer approval of the exact Candidate is the acceptance gate and permits finalization.
Jig validates reviewer identity and authority, exact Candidate and lifecycle binding, required
evidence availability and integrity, absence of unresolved **blocking** findings, and current lifecycle position.
Jig then durably records `Accepted` without independently rejudging the reviewer's sufficiency
assessment.

This model deliberately retains reviewer-judgment and evidence-sufficiency risk. A trusted envelope
can prove provenance, exact binding, and integrity but cannot make a false underlying claim true or
guarantee semantic correctness. That accepted consequence is especially material when final
verification is `none`; it is not an omitted decision.

## Policy-selected final verification

The frozen policy must explicitly select exactly one high-level posture:

- **`deterministic`:** run the configured final check set against the exact Accepted Candidate before
  delivery; or
- **`none`:** proceed from reviewer approval and the reviewed implementer evidence.

Omission of this selection fails preflight closed; no default posture exists.

Configuration and providers may satisfy or exceed policy but cannot lower or silently change it. A
failed required verification prevents delivery. Candidate mutation or changed delivery metadata
invalidates acceptance; a Candidate-changing target refresh requires a new full review.

Verification is effect-free by enforced contract in this generation. A check requiring an external
effect is outside `PORT-VERIFY` and must be modeled as a separately authorized workspace or delivery
Operation under that port's authority, or deferred to a future decision.

## Evidence roles

| Evidence source                | Contribution                                                                                                            | Limit                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Implementer                    | Candidate, summary, changed scope, self-report, assigned-check evidence, and supporting artifacts.                      | Cannot judge its own sufficiency or authorize lifecycle/delivery.                    |
| Reviewer                       | Full-package judgment and exact-Candidate verdict.                                                                      | Cannot perform delivery or attest future target/effect facts.                        |
| Repository/workspace mechanism | Exact content, branch, target basis, cleanliness, and preservation observations.                                        | Cannot judge acceptance.                                                             |
| Verification mechanism         | Policy-selected exact-Candidate check observations.                                                                     | Cannot choose checks or judge whole-package sufficiency.                             |
| Delivery mechanism             | Remote identity, gate state, effect certainty, and landing observations.                                                | Cannot declare lifecycle completion.                                                 |
| Jig trusted envelope           | Run scope, producer attribution, correlation, recorded time, subject association, completeness, and integrity metadata. | Does not make the underlying claim true merely because it is well formed or durable. |

Large or provider-shaped evidence remains in immutable, bounded supporting artifacts. The ledger
keeps bounded decision facts, manifest completeness, digests, and references. Evidence required by a
decision must be available, authorized, exact-subject-bound, and integrity-valid. Candidate, target
basis, or delivery-metadata mutation invalidates current use of prior acceptance and evidence.

## Landing proof

Delivery success is not landing proof. Jig records `Landed` only after a post-effect observation
establishes that the configured authoritative target contains the Accepted result under the selected
integration method. Publication, pull-request creation, passing checks, a merge request, or an
integration response is insufficient alone. Missing, contradictory, or indeterminate landing
evidence enters reconciliation and cannot release dependencies.

## Where to go next

- How Accepted Stories are ordered and finalized:
  [concurrency and finalization](./concurrency-and-finalization.md).
- How acceptance, evidence, and landing proof connect to durable authority: the
  [V4 relationship view](./state-and-recovery.md#view-v4--state-recovery-acceptance-concurrency-and-finalization).
- Why reviewer-principal acceptance was selected, with its explicitly accepted residual risk:
  [D7 — acceptance and evidence](./decisions/D7-acceptance-and-evidence.md).
