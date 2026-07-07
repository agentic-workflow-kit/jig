---
title: "ADR 0034 — Acceptance/review lane and verifier boundary"
status: applied
---

# ADR 0034 — Acceptance/review lane and verifier boundary

## Context

PR #82 clarified that verification before merge/landing is a configurable acceptance/review lane
selected by owner-controlled policy and configuration before launch. That clarification is now
present in the product and design layers, but the decision was spread across the docs without a
single decision record.

The boundary matters because the lane touches several authority surfaces at once: Worker produces
work, verifier/reviewer assesses evidence, Runner enforces policy and consumes verdicts, Forge
performs deterministic external operations only when Runner invokes it, Doorbell carries owner
decisions, Records carries durable evidence, and Execution host remains the proof boundary for
SEC-2.

## Decision

Jig models acceptance/review as a governed evidence lane, not as a new provider seam or a second
authority path.

### 1. Verifier/reviewer is a governed evidence lane

The verifier/reviewer lane is independent assessment under owner-selected policy. It may be a
human, agent, deterministic checker, ordinary code review, explicit owner review, or specialist
review when policy requires that posture.

It is not Jig-core, Worker/Agent, Forge, Owner/Doorbell, or a fifth provider seam. It does not hold
landing credentials, grant worker requests, redefine policy, invoke Forge, author lifecycle
transitions directly, or substitute for owner judgment.

### 2. Acceptance strength is owner-selected before launch

Policy and configuration select the required acceptance/review strength before launch. That chosen
posture is part of the launch-bound governance contract alongside policy, work profile, repo floors,
and other binding inputs.

Worker, reviewer, Forge provider, runtime, and resume paths cannot downgrade the required
acceptance/review strength mid-run. A weaker or missing lane reduces autonomy, routes to Doorbell,
or stops according to the bound policy; it never lowers the bar.

### 3. Runner consumes verdicts but does not review

Runner may invoke or consume an implemented acceptance/review lane when launch-bound policy requires
one. Runner evaluates whether the required evidence and verdicts satisfy policy before lifecycle
progress, Doorbell escalation, or Forge invocation.

Runner does not become a code reviewer, specialist reviewer, or forge API implementation. It
consumes governed evidence; it does not perform the review judgment itself.

### 4. PR creation, status, and comment can precede final acceptance

Some review modes require a branch or PR to exist before review can happen. Runner may push, open or
update PRs, post statuses, or post comments under policy to enable review or surface blocked work.
These are runner-invoked Forge operations and must remain policy-governed.

Those operations are not acceptance. Merge/landing remains gated on required evidence and
acceptance verdicts, and `done` remains distinct from `landed`.

### 5. Self-review and weak verdicts fail closed

Worker self-report or self-review cannot satisfy acceptance. Missing, stale, self-reported, weak,
or inconclusive acceptance evidence routes to Doorbell or stops according to the bound policy.

No component may convert weak review evidence into permission to proceed by lowering the acceptance
requirement.

### 6. Records carry verdicts through the governed evidence path

Verifier/reviewer outputs are durable evidence inputs. When an acceptance/review lane is
implemented, its verdicts and supporting evidence must go through the governed records/evidence path
Runner and policy consume.

This ADR does not freeze event families, field names, schema shape, reviewer taxonomy, or provider
method signatures. Those remain future records-contract and implementation decisions.

### 7. SEC-2 remains execution-host proof

Reviewers can assess evidence, diffs, and outputs. They do not prove no-phone-home. SEC-2 remains
the execution-host confinement and core proof boundary, judged from containment evidence rather than
reviewer assertion.

This ADR does not claim progress on SEC-2 and must not be cited as closing that evidence gap.

## Consequences

- Design docs may cite this ADR as the authority for the verifier/reviewer boundary introduced by
  PR #82.
- The four provider seams remain Agent, Execution host, Forge, and Work source.
- Forge remains deterministic and runner-invoked; it does not become a reviewer or policy authority.
- Runner-owned PR/status/comment operations may happen before final acceptance when policy needs a
  review surface, but they do not themselves satisfy acceptance.
- Runtime work that adds richer acceptance/review lanes must preserve launch-bound strength,
  fail-closed weak evidence, and governed records/evidence routing.

## Implementation follow-up / deferred

- Runtime/config/policy support for richer acceptance/review lanes.
- Field-level records-contract changes for verdicts, if needed.
- Reviewer taxonomy, if policy later needs one.
- Concrete UI/operator surfaces for routed acceptance gaps.
- SEC-2 adversarial no-phone-home evidence; this remains outside this ADR.

## Reconciles to

- `MERGE-1` — landing requires independent evidence, never worker self-report alone.
- `MERGE-2` — push, PR creation, and merge are runner authority.
- `MERGE-3` — done conditions and acceptance strength are policy-bound.
- `MERGE-4` — done and merged remain separate milestones.
- `MERGE-5` — blocked work may surface in the normal PR flow without becoming acceptance.
- `FENCE-3` — the worker never holds privileged credentials.
- `GUARD-1` — the policy and acceptance posture in force are fixed at launch.
- `CFG-1` — policy is the governance contract.
- `SEC-2` — no-phone-home remains execution-host confinement proof.
- `SEC-3` — forge credentials remain runner-held, not worker-held.
- `SEE-1`, `SEE-2`, `SEE-3`, `SEE-6` — verdicts are governed evidence records and exportable from
  the same evidence path.

## Related

- [Product overview](../../product/jig.md#acceptance-before-landing)
- [Product concepts](../../product/concepts.md#runner-worker-and-verifier--the-authority-boundary)
- [Product guarantees](../../product/guarantees.md#15-merge-on-evidence)
- [Core overview](../core/README.md)
- [Orchestration](../core/orchestration.md)
- [Plan intake](../core/plan-intake.md)
- [Records](../core/records.md)
- [Provider contracts](../contracts/providers.md)
- [Security model](../security-model.md)
