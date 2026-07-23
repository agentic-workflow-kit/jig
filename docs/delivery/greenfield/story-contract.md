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
Its front matter is a literal, machine-parseable projection of the 16 canonical `track.json` story
fields; use no aliases, wildcards, or invented IDs. Link to governing relative paths and stable IDs
rather than copying or weakening their meaning.

```md
---
id: "GF-NNN"
title: "<bounded outcome>"
phase: <0-6 integer>
size: "S | M | L"
status: "proposed"
baseline_commit: "<exact 40-hex immutable planning/authority provenance commit>"
story_file: "docs/delivery/greenfield/stories/GF-NNN.md"
governing_paths: ["docs/redesign/design/<exact-path>.md"]
stable_ids: ["<literal track.json stable ID>"]
product_routes: ["<literal PC-* route>"]
imported_commitments: ["<literal imported commitment ID>"]
dependencies: ["GF-NNN"]
dependency_edges:
  - from: "GF-NNN"
    type: "implementation | evidence | decision | merge"
    split: "semantic-to-provider" # omit when absent from track.json
dr_gates: ["DR-N"]
outcome: "<exact bounded outcome>"
oracle: ["<exact observable oracle>"]
---

# GF-NNN — <title>

## Outcome, value, and why now

State the user/system outcome, the value it releases, why this is the earliest safe point, and the
specific later stories or guarantees it enables. State what remains impossible afterward.

## Governing paths and stable IDs

List the controlling product/design paths, sections, decision records, invariants, conformance
suites, and every literal `stable_ids`, `product_routes`, and `imported_commitments` value from the
front matter. Explain each local mapping and its bearing on this story. Do not use wildcard IDs or
invent an ID absent from the governing source and manifest.

## Dependencies plus start evidence

Name every predecessor and the exact merged commit/evidence needed to start. `baseline_commit` is
immutable planning/authority provenance, not a rolling implementation base. Prove the approved
original delivery-package tuple `P` (reviewed commit/tree, exact package path set with per-path
bytes/type/mode, aggregate digest, and independent `PASS`) being executed; any required external
authoritative landing-equivalence record; the current implementation candidate base; package/runtime boundary; prerequisite gate;
required owner decision; and any provider qualification. A dependency is not satisfied by an
unreviewed branch or an assertion.
`dependencies` and `dependency_edges` must exactly match the manifest, including edge type and
`semantic-to-provider` split where present.

## Implementation candidate tuple and review binding

For each implementation attempt, record an external, immutable tuple: story ID; the approved
original delivery-package tuple `P` (reviewed commit/tree, exact package path set with per-path
bytes/type/mode, aggregate digest, and independent `PASS`); any required external authoritative
landing-equivalence record; the exact external owner-ratification/activation record (authenticated owner or
explicitly named delegated principal with independently verifiable delegation and current validity,
durable record ID/URL, immutable planning/authority provenance, activation target scope, selected
realization tuple, and expiry/revocation); observed target base ref; the ref's resolved base commit and tree; candidate
commit and tree; proof that `merge-base(candidate, base) == base`; and target-content proof that
every required predecessor landing is contained in that base. Record a current path-by-path
comparison of the candidate's 67 normative authority files against immutable authority provenance,
the exact owned source/config/test/evidence path set, applicable `DR-*` choices, available
pre-review evidence/check digests, and selected final-verification posture. The tuple is dynamic
per story and is never written back into this planning
package merely because a predecessor merges.

If the target ref moves, or the candidate is rebased, refreshed, or otherwise changes, resolve the
new base commit/tree, re-prove merge-base equality and predecessor containment, regenerate the
current normative-corpus comparison and affected evidence, and bind a new independent
implementation-candidate review. A changed delivery-package tuple first requires a new package
`PASS`, then a new implementation tuple. Under D15, a recorded transition into `Reviewing` may
authorize only fenced `OPC-REV-*` draft/non-mergeable review publication for the frozen subject
before independent review or acceptance. It grants no acceptance, finalization, landing, or
dependency-release power; hosted CI may occur before review.

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

State the reviewer principal and independence, the applicable review protocol, complete exact
candidate tuple (including approved delivery-package `PASS` binding, target basis, merge-base
equality, predecessor-containment proof, current normative-corpus comparison, owned paths,
evidence, delivery metadata, original `P`, and any required authoritative landing-equivalence record), required findings state, selected final-verification posture and
its applicable exact-candidate checks/evidence, acceptance transition, and the separate
authoritative landing proof. If the selected posture runs verification after `Accepted`, record its
successful check before finalization or landing. Use the delivery-package
protocol only for a delivery-package subject; use the implementation-candidate protocol for
story-owned source, configuration, tests, and evidence. Partial, self-authored, stale, or
differently bound verdicts fail closed. Approval is not landing.

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

- The exact external owner-ratification/activation record is recorded: authenticated owner or
  explicitly named delegated principal with independently verifiable delegation and current
  validity; durable record ID/URL; original approved delivery-package tuple `P`, any required
  authoritative landing-equivalence record, and immutable planning/authority provenance; activation target scope;
  selected realization tuple; and expiry/revocation. A generic
  authorization, planning `PASS`, reviewer verdict, branch, or PR cannot substitute for it.
- Dependencies are landed in the observed implementation base with exact target-content proof.
- Original delivery-package tuple `P` and any required authoritative landing-equivalence record are recorded
  outside this planning package. A different squash OID never means that landed commit was
  reviewed; it is usable only through the authoritative equivalence proof defined in the delivery
  policy.
- The observed implementation base ref and its resolved base commit/tree, predecessor containment,
  planned owned paths, and applicable `DR-*` choices are recorded outside this planning package.
- A current comparison of the 67 normative authority files against immutable authority provenance is
  recorded; it must be clean before implementation starts.
- Candidate commit/tree are intentionally absent until post-implementation candidate freeze.
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
- Exact-subject evidence, `git diff --check`, required repository checks, selected
  final-verification posture (including applicable hosted CI), and independent
  implementation-candidate review pass on the same candidate before finalization or landing; its
  merge-base equality, approved package `PASS` binding, and normative-corpus comparison are
  current; no partial provider becomes configurable.
```

## Universal fail-closed rules

Every contract inherits these non-negotiable rules: reject or park malformed, unknown, stale,
ambiguous, cross-boundary, self-attested, or unverifiable facts; preserve resources on uncertain
cleanup; never let a provider result mint Jig authority; and keep an adapter unreachable until its
qualification gate is current and admitted. The contract must make each rule testable, not merely
repeat it.
