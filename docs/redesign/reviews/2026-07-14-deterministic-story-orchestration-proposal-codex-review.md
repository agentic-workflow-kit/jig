---
title: Codex independent review — deterministic story orchestration proposal
date: 2026-07-14
base: 521ae0846e788ef91979dd4c273687ab22e6137e
commit: 83256f5e32efc879c7b01acc54cf4722d5650307
verdict: Not ready for adoption — confirmed design blockers remain
status: point-in-time record
reviewer: Codex
---

# Codex independent review — deterministic story orchestration proposal

> **Point-in-time independent record.** This review is pinned to branch
> `docs/deterministic-story-orchestration-proposal`, base
> `521ae0846e788ef91979dd4c273687ab22e6137e`, and reviewed commit
> `83256f5e32efc879c7b01acc54cf4722d5650307` on 2026-07-14. It was conducted
> independently from the Claude/Fable review in this directory: that review's contents were not
> read or used to produce these findings. Preserve the `CX-DSO-*` IDs so a later synthesis can map
> both independent registers without conflating their evidence.

## 1. Scope and method

The reviewed target was the complete standalone proposal under
[`docs/design/deterministic-story-orchestration/`](../deterministic-story-orchestration/)
plus its index entry in [`docs/design/README.md`](../../design/README.md). The review treated the
proposal's explicit `not yet reconciled or adopted` status as meaningful: proposal-internal defects
are distinguished below from conflicts that block adoption into the current Jig product and design
contracts.

The review used four bounded angles:

1. product, ADR, and authority-contract consistency;
2. deterministic state, scheduling, concurrency, and event ordering;
3. operations, evidence, artifact integrity, ports, and failure handling; and
4. documentation coherence, adoption posture, and implementation feasibility.

Three independent finder passes and a coordinator pass produced candidate findings. Three separate
verification passes then re-read the relevant target and governing sources before classifying each
reported item. Candidate issues without an observable failure scenario or exact governing conflict
were not promoted.

## 2. Findings register

| ID       | Severity                       | Status    | Summary                                                                                    |
| -------- | ------------------------------ | --------- | ------------------------------------------------------------------------------------------ |
| CX-DSO-1 | P1 — blocking correctness      | confirmed | Event append can commit without acknowledgement, splitting durable history and live state. |
| CX-DSO-2 | P1 — blocking correctness      | confirmed | `Blocked` is terminal before required checkpoint and resource retirement can complete.     |
| CX-DSO-3 | P1 — adoption/security blocker | confirmed | The proposal removes the trusted Execution Host, Fence, and Doorbell boundaries.           |
| CX-DSO-4 | P1 — adoption/evidence blocker | confirmed | Required automated checks may be accepted from worker-produced claims.                     |
| CX-DSO-5 | P2 — deterministic correctness | confirmed | DAG-derived scheduling, finalization, and blocker attribution lack canonical rules.        |

### CX-DSO-1 — event append has an unrecoverable commit-unknown window

The persistence sequence in
[`events-and-runtime-state.md`](../deterministic-story-orchestration/events-and-runtime-state.md)
lines 52-70 requires the event batch to append before the runtime adopts replacement live state or
dispatches operations. The event-store contract in
[`ports.md`](../deterministic-story-orchestration/ports.md) lines 69-86 guarantees atomic
append, but supplies no stable transition/batch identity, expected-position condition, readback, or
uncertain-result contract. Event append is deliberately outside `OperationRegistry`, and the common
event contract deliberately carries no transition identifier.

**Failure scenario:** the store durably commits `story.started` and `operation.requested`, but the
append acknowledgement is lost. If the runtime treats the call as failed, it keeps the old live
state and does not dispatch the operation even though durable history says the transition occurred.
If it retries, the recorder may append the same semantic transition again under new event IDs. The
proposal's explicit no-read/no-replay/no-resume posture leaves no recovery path for deciding which
history is authoritative.

**Impact:** durable records can advance ahead of `LiveState`, or duplicate transition facts can be
created. Either outcome breaks the proposal's persistence-before-adoption invariant and makes
operation records disagree with the live operation registry. The same durability model also blocks
adoption against current `RESUME-2`, `RESUME-3`, `SEE-1`, and `SEE-3` obligations.

**Required design direction:** give every transition batch a stable idempotency identity and define
conditional append or committed-batch readback semantics. Adoption into current Jig additionally
requires a durable reconstruction/reconciliation model for interrupted runs and irreversible
effects.

### CX-DSO-2 — terminal `Blocked` cannot perform mandatory retirement

The closed lifecycle in
[`story-execution.md`](../deterministic-story-orchestration/story-execution.md) lines 36-43
and 68-77 sends failure paths to `Blocked`, then terminates with `Blocked --> [*]`. The hierarchy in
[`live-state.md`](../deterministic-story-orchestration/live-state.md) lines 79-110 likewise
defines terminal `blocked` without a blocked-retirement substate.

At the same time,
[`delivery-and-operations.md`](../deterministic-story-orchestration/delivery-and-operations.md)
lines 127-140 requires the runtime, after blocking, to apply checkpoint policy, preserve evidence,
close both retained sessions, inspect the worktree, and remove it safely. Each asynchronous result
must be accepted in a current story phase allowed to consume it.

**Failure scenario:** a reviewer returns a blocking verdict. The story enters terminal `Blocked`,
then a required checkpoint push completes. The state machine exposes no blocked-retirement
transition or self-loop that can settle that operation, update preservation progress, close sessions,
or retry cleanup.

**Impact:** an implementation must either perform illegal transitions, reject valid retirement
results, skip required preservation, or leak sessions/worktrees and capacity.

**Required design direction:** separate terminal business outcome from resource-retirement progress,
for example by adding a `blocked-retirement` substate analogous to `landed-cleanup` with explicit
request, result, retry, and compaction transitions.

### CX-DSO-3 — trusted Execution Host, Fence, and Doorbell boundaries are absent

The proposal's port model in
[`ports.md`](../deterministic-story-orchestration/ports.md) lines 53-67 and 208-226
introduces six different ports, explicitly declines Host and Forge ports, and absorbs execution-host
mechanics into Agent, Workspace, and Verification adapters. Its component and operation catalogs
also contain no Fence request-authorization path or Doorbell park/owner-decision path.

This conflicts with the current product and design contracts:

- `FENCE-1` requires every worker request to be authorized before execution;
- `DOOR-1` through `DOOR-3` require ambiguous or risky actions to park durably for a narrow owner
  decision;
- `SEC-2` requires proven outbound confinement rather than an agent assertion; and
- the provider contract fixes Agent, Execution Host, Forge, and Work Source as independently
  swappable and attestable seams.

**Failure scenario:** an agent requests an undeclared network or credential-bearing tool action.
Static preflight can confirm only the adapter's declared capability. With no first-class host proof,
request gate, or owner-routing state, the runtime cannot independently authorize that request, prove
that egress was confined, or park it for an owner decision.

**Impact:** the proposal cannot represent the current trust boundary or earn SEC-2 autonomy. This is
an adoption blocker, not a claim that the existing runtime has regressed.

**Required design direction:** restore or explicitly reconcile the fixed provider seams, a trusted
per-request authorization boundary, durable owner escalation, and independently observed
execution-host conformance evidence.

### CX-DSO-4 — worker-produced check claims can satisfy automated-check evidence

[`inputs.md`](../deterministic-story-orchestration/inputs.md) lines 152-185 assigns checks
and their evidence to the implementer. The runtime validates manifest presence, producer
attribution, claimed outcome, integrity, and candidate association without interpreting or directly
observing command execution. The reviewer normally consumes that evidence without rerunning the
checks, while final-verification mode `none` explicitly trusts the implementer's recorded evidence.

Current [`MERGE-1`](../../product/guarantees.md#15-merge-on-evidence) defines automated checks as
observed directly by Runner and never taken from the worker's word. ADR 0034 additionally requires
self-reported, weak, or inconclusive acceptance evidence to route to Doorbell or stop.

**Failure scenario:** the worker submits a structurally valid, SHA-bound manifest and immutable logs
claiming that a required check passed even though it never ran. The artifact recorder proves only
which bytes were stored and who supplied them. The reviewer inspects the supplied material without
rerunning the check, approves, and final verification is `none`.

**Impact:** delivery may proceed without any trusted component observing the required automated
check. The mandatory reviewer means the whole package is not literally worker self-report alone;
the narrower confirmed conflict is that the automated-check evidence category is still derived from
worker-produced claims.

**Required design direction:** route required check execution through a trusted observed effect
boundary, or require independent verification whenever worker-produced check claims contribute to a
delivery gate.

### CX-DSO-5 — DAG-derived choices are not fully deterministic

The plan supplies `priority when multiple stories are eligible` in
[`inputs.md`](../deterministic-story-orchestration/inputs.md) lines 32-39, but neither input
validation nor scheduling defines priority uniqueness or a stable secondary comparator. At the same
time, [`live-state.md`](../deterministic-story-orchestration/live-state.md) lines 170-183
claims that finalization candidates and their deterministic ordering are derived rather than stored.

**Scheduling scenario:** two independent stories have equal priority and one capacity slot is
available. Collection or map iteration order can choose which starts. The same ambiguity recurs when
two approved stories wait for the finalization lease. Their order can change which candidate must
rebase, exhaust refresh limits, or block.

The dependency-blocked output has a related canonicalization gap.
[`events-and-runtime-state.md`](../deterministic-story-orchestration/events-and-runtime-state.md)
lines 172-190 requires each downstream outcome to name `the originating story` as one root cause.
For a story depending on two independently blocked ancestors, the model defines neither a complete
root set nor a stable first-cause selection rule.

**Impact:** identical approved inputs can produce different start/finalization order or incomplete,
arrival-order-dependent causal summaries.

**Required design direction:** define a total comparator, such as priority plus immutable plan
ordinal or story ID, and represent every minimal blocked ancestor or define an explicit canonical
attribution rule.

## 3. Plausible risks requiring contract closure

### CX-RISK-1 — retained-session capacity may deadlock review

The scheduler limits active stories using configured session capacity, but each story retains one
implementer and later opens a separate reviewer. With two slots and two admitted stories, both
implementers can occupy capacity before either reviewer opens. This becomes a confirmed deadlock if
retained idle sessions consume configured slots; providers where only active turns consume capacity
may avoid it. The design should define the capacity unit and reserve worst-case role capacity or
declare role-specific pools.

### CX-RISK-2 — uncertain remote mutations lack explicit reconciliation

The closed delivery operation union can return an uncertain effect after `delivery.create-pr`, but
contains no semantic lookup/reconciliation operation. A same-ID redispatch may be reconciled inside
an adapter, or the core may block permanently; the current contract does not require either. Define
how an adapter proves that an uncertain PR/push/integration already happened before a new semantic
attempt is authorized.

## 4. Verification record

The review executed the repository's complete local gate at reviewed commit `83256f5`:

- `corepack pnpm check` — passed;
- 55 test files passed and 5 were skipped;
- 673 tests passed and 7 were skipped;
- statement coverage 96.57%, branch coverage 91.08%, function coverage 96.66%, and line coverage
  96.61%; and
- formatting, type checking, package boundaries, documentation links, delivery-foundation checks,
  and diff checks all passed.

The green gate proves the proposal is mechanically valid documentation; it does not resolve the
semantic findings above.

## 5. Review limitations and synthesis posture

- This review did not edit runtime code, schemas, tests, provider interfaces, or proposal content.
- It did not inspect hosted PR metadata or make any claim about remote review state.
- The proposal's unreconciled/not-adopted label prevents its contract conflicts from being reported
  as current runtime regressions. CX-DSO-3 and CX-DSO-4 are adoption blockers.
- Explicitly deferred details were not reported merely because they remain open. A deferred item was
  promoted only when the agreed proposal already depends on it for internal correctness or when it
  contradicts a governing contract required for adoption.
- The separate Claude/Fable review was not read. A later synthesis should compare findings by root
  cause and evidence rather than assuming equal numbering or one-to-one correspondence.
