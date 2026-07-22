---
title: "Jig greenfield story contract"
purpose: "Mandatory contract template and closure rules for every greenfield implementation story."
audience:
  - delivery planners
  - implementers
  - independent reviewers
status: mandatory template
owner: Arye Kogan
last_verified: 2026-07-22
---

# Mandatory greenfield story contract

Every `GF-*` story must instantiate every section below before implementation. “N/A” is valid only
with a reason, proof that the subject cannot reach the omitted concern, and reviewer agreement.
Link to governing relative paths and stable IDs rather than copying or weakening their meaning.

```md
---
id: GF-NNN
title: "<bounded outcome>"
phase: <0-6>
status: proposed | ready | implementing | review | accepted | parked
baseline_commit: <40-hex or pending-freeze>
governing_paths: []
stable_ids: []
depends_on: []
dr_choices: []
---

# GF-NNN — <title>

## Outcome, value, and why now

State the user/system outcome, the value it releases, why this is the earliest safe point, and the
specific later stories or guarantees it enables. State what remains impossible afterward.

## Governing paths and stable IDs

List the controlling product/design paths, sections, decision records, invariants, conformance
suites, and every `ID-*`, `RT-*`, `CP-*`, `EP-*`, `PORT-*`, `SCH-*`, `OPC-*`, `EV-*`, `FC-*`,
`BND-*`, `CF-*`, `DR-*`, and product commitment ID this story carries. Explain each mapping.

## Dependencies plus start evidence

Name every predecessor and the exact merged commit/evidence needed to start. Prove the selected
baseline, package/runtime boundary, prerequisite gate, required owner decision, and any provider
qualification are current. A dependency is not satisfied by an unreviewed branch or an assertion.

## In-scope and non-goals

Define the smallest closed semantic subject. Explicitly name neighboring behavior, mechanisms,
provider modes, schema families, policy choices, public APIs, and cleanup work that are excluded.

## Runtime/product unit, ports, inputs, outputs, identities, persisted facts, authority

Name the runtime/product unit(s), port directions, input validation, output consumers, identities,
schema versions, durable facts and writer, trust/witness basis, and projections. Name every
principal and exact authority: who may transition, propose/dispatch an Operation, decide, review,
publish, finalize, or merely observe. State the fence that prevents every forbidden actor from
gaining that power.

## Observable success and terminal outcomes

Define observable success, the exact subject it binds, resulting lifecycle state, durable records,
projections, released dependencies, and required evidence. Enumerate all terminal and non-delivery
outcomes (`Blocked`, `Parked`, `Rejected`, `NotRun`, `Stopped`, etc. where applicable) and prove
which transitions are impossible for this story.

## Failure, uncertainty, timeout, retry, reconciliation, recovery, cleanup, and resume

Enumerate typed `FC-*` failures, fault boundaries, each `BND-*` start/deadline/exhaustion result,
and stale/fenced/replayed input behavior. Record intent before effect. For uncertain effects, name
the stable effect identity and reconciliation observation. **Never blindly retry an uncertain
effect:** only confirmed absence plus recorded reauthorization permits same-effect retry; otherwise
park/preserve/escalate. Explain recovery from durable facts, resume fencing, cleanup/preservation,
and residual-obligation behavior.

## Security and trust: validation, credentials, redaction, and authority widening

Specify input limits, canonicalization, authentication/identity binding, trust roots/witnesses,
credential names and in-memory resolution, least privilege, redaction/quarantine, retention, and
hostile-input tests. Provider facts, evidence, configuration, or fallback must never widen
authority. Missing/stale/ambiguous/invalid proof fails closed. State how an unqualified adapter is
kept unreachable before it can be configured or dispatch an effect.

## Deliverables without delegated algorithm invention

List exact code/docs/test/evidence deliverables and their owning paths. For each `DR-*`, record the
chosen option, decision owner, governing constraints, evidence, fallback, and blast radius. An
implementer may realize a delegated choice only inside its recorded bounds; no algorithm,
protocol, policy, authority, or product behavior may be invented by implication.

## Test and evidence obligations

Name deterministic unit/schema, contract, negative-authority, hostile-input, replay,
permutation/concurrency, crash/fault, timeout/reconciliation, recovery/resume, provider, and E2E
tests as applicable. Name `CF-*` suites, oracles, fixture/source identities, exact evidence
metadata, and required repository/CI checks. State why omitted categories cannot apply.

## Exact acceptance

State the reviewer principal and independence, complete exact Candidate package (content digest,
target basis, evidence and delivery metadata), required findings state, selected final-verification
posture, acceptance transition, and the separate authoritative landing proof. Partial,
self-authored, stale, or differently bound verdicts fail closed. Approval is not landing.

## DR choices

For each applicable `DR-*`, state: question; owner; selected bounded option; immutable constraints;
alternatives rejected/deferred; implementation evidence; failure fallback; and whether a new owner
decision is required. Include `none` only with evidence that no `DR-*` applies.

## PR boundary, relative size, and split

Declare `S`, `M`, or `L`, one coherent authority/semantic oracle, expected paths, and excluded
follow-up. Split `<ID>a` contract/core from `<ID>b` realization when a PR spans two external
mechanism families, crosses primary authority between runtime units, joins deterministic semantics
to independently failing real qualification, or has no cohesive oracle. The first half must remain
green and unconfigurable; multiple `CF-*` results alone do not force a split.

## Definition of Ready

- Dependencies are merged on the selected current baseline with exact evidence.
- Governing paths, stable IDs, ports, principals, authority, durable facts, failures, and oracles
  are named.
- Applicable `DR-*` choice is recorded with owner, constraints, evidence, and fallback.
- Scope/non-goals and PR boundary are closed; no unapproved capability is reachable.
- Provider/adapters are either scripted and unreachable or already qualified with current evidence.
- An independent reviewer can determine the story's start contract without conversation history.

## Definition of Done

- Boundary values are immutable/versioned; inputs validate and unknowns fail closed.
- Transitions, durable facts, typed `FC-*`, bounds, recovery, resume, preservation, and cleanup are
  implemented and evidenced as applicable.
- No uncertain effect was blindly retried; reconciliation and recovery use durable facts.
- Required unit, contract, adversarial, replay, crash, provider, and E2E proof plus `CF-*` catalog
  updates pass on the exact candidate.
- Exact-subject evidence, `git diff --check`, required repository checks, CI, and independent
  exact-candidate review pass; no partial provider becomes configurable.
```

## Universal fail-closed rules

Every contract inherits these non-negotiable rules: reject or park malformed, unknown, stale,
ambiguous, cross-boundary, self-attested, or unverifiable facts; preserve resources on uncertain
cleanup; never let a provider result mint Jig authority; and keep an adapter unreachable until its
qualification gate is current and admitted. The contract must make each rule testable, not merely
repeat it.
