---
title: "Jig greenfield story contract"
purpose: "Mandatory contract template and closure rules for every greenfield implementation story."
audience:
  - delivery planners
  - implementers
  - independent reviewers
status: mandatory template
owner: Arye Kogan
last_verified: 2026-07-29
---

# Mandatory greenfield story contract

Every `GF-*` story must instantiate every section below before implementation. “N/A” is valid only
with a reason, proof that the subject cannot reach the omitted concern, and reviewer agreement. Its
front matter is a literal, machine-parseable projection of the 15 canonical `track.json` story
fields; use no aliases, wildcards, or invented IDs. Link to governing relative paths and stable IDs
rather than copying or weakening their meaning.

```md
---
id: "GF-NNN"
title: "<bounded outcome>"
phase: <0-6 integer>
size: "S | M | L"
status: "proposed"
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

Name every declared predecessor and the exact merged commit/evidence needed to start. Prove the
approved delivery package `P` being executed. Its canonical identity is: delivery-package
candidate `Q` (exact candidate commit/tree, exact package-only path set, each path's
bytes/type/mode, and aggregate computed unpinned digest); external review record `R` (protocol,
reviewer identity/independence, exact `Q`, checked scope, checks/evidence, findings, verdict, and a
durable external identifier); and, only when `R` records `PASS`,
`P = Q + durable R identifier + PASS`.

Prove any required authoritative landing-equivalence record; the dynamically observed phase
integration base ref/commit/tree and declared-predecessor containment; package/runtime boundary;
prerequisite gate; required owner decision; and provider qualification. A dependency is not
satisfied by an unreviewed branch or assertion. `dependencies` and `dependency_edges` must exactly
match `track.json`, including edge type and `semantic-to-provider` split where present.

## Implementation candidate and review binding

For each implementation attempt, record externally: story ID; approved `P`; required authoritative
landing-equivalence record; exact external owner-ratification/activation record, including
authenticated owner or delegated principal, independently verifiable delegation/current validity,
durable record ID/URL, immutable provenance, activation target scope, selected realization tuple,
and expiry/revocation; registered story worktree path/branch; phase integration ref and resolved
base commit/tree; candidate commit/tree; merge-base and target-content proof that every declared
predecessor is contained; current path-by-path comparison of the 67 normative authority files; exact
owned source/config/test/evidence paths; applicable `DR-*` choices; selected final-verification
posture; required check-class set; verification configuration/environment; exact subject binding;
continuous implementer and independent reviewer identities; and integration result/commit.

The implementation owner commits before required verification and works only in the registered
story worktree. Record each required local proof/repository check/direct validator command or set,
result, timestamp, durable log/reference, candidate-bound `git diff --check` where applicable, and
proof that the candidate `HEAD`/tree remained unchanged and the worktree was clean before and after
review. Hosted CI independently executes required checks. The coordinator verifies orchestration
facts and bindings; the reviewer consumes the evidence read-only and never reruns a suite to repair
or replace it.

At explicit freeze, the same continuous independent reviewer examines the registered story
worktree's exact candidate, base, diff, declared-predecessor containment, evidence, and status.
Their verdict binds only that implementation candidate and never mints or redefines `Q`, `R`, or
`P`. A target move, rebase, refresh, fix, posture change, evidence change, or other binding change
creates a new committed candidate. The same implementer reruns affected required checks; the same
reviewer incrementally rechecks the prior-reviewed-to-new range, sibling occurrences, affected
invariants, and new evidence. Conclusions carry forward only for unchanged paths and unaffected
invariants. Changed package identity first requires new `Q`, external `R`, and approved `P`.

After `Accepted`, recording only the final-verification observations already authorized by the
unchanged reviewed candidate, posture, check-class set, verification configuration/environment,
and subject binding is continuation evidence and does not itself invalidate the verdict. Any drift
in those values requires affected checks and incremental review by the same reviewer. Under D15,
the recorded transition into `Reviewing` may authorize only fenced `OPC-REV-*`
draft/non-mergeable review publication; it grants no acceptance, finalization, landing, or
dependency-release power.

No custom sealer, seal envelope, detached clone, fresh clone, or resealing is a story gate.
Historical seals may remain historical evidence but are neither required nor sufficient.

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
the stable effect identity and reconciliation observation. Applicable runtime failures use
cataloged typed `FC-*` failure classes; non-runtime failures remain typed under their bounded story
contract. Never blindly retry an uncertain effect: same-identity retry is effectful-only after
confirmed absence and recorded reauthorization; an effect-free replacement uses a new Operation
identity. Otherwise park, preserve, and escalate. Timers wake work; durable facts decide. Explain
recovery, resume fencing, cleanup/preservation, and residual obligations.

## Security and trust: validation, credentials, redaction, and authority widening

Specify input limits, canonicalization, authentication/identity binding, trust roots/witnesses,
credential names and in-memory resolution, least privilege, redaction/quarantine, retention, and
hostile-input tests. Provider facts, evidence, configuration, or fallback must never widen
authority. Missing, stale, ambiguous, or invalid proof fails closed. State how an unqualified
adapter stays unreachable before it can be configured or dispatch an effect.

## Deliverables without delegated algorithm invention

List exact code/docs/test/evidence deliverables and their owning paths. For each `DR-*`, record the
chosen option, decision owner, governing constraints, evidence, fallback, and blast radius. An
implementer may realize a delegated choice only inside its recorded bounds; no algorithm,
protocol, policy, authority, or product behavior may be invented by implication.

## Test and evidence obligations

Name deterministic unit/schema, contract, negative-authority, hostile-input, replay,
permutation/concurrency, crash/fault, timeout/reconciliation, recovery/resume, provider, and E2E
tests as applicable. Name `CF-*` suites, oracles, fixture/source identities, exact evidence
metadata, and required repository/CI checks. Named tests live with the package or behavior under
test, and oracle fixtures are named for the oracle. Exact-subject evidence is a generated artifact,
not a committed assertion. State why omitted categories cannot apply.

## Exact acceptance

State the reviewer principal and independence, applicable review protocol, complete
committed-candidate binding, required findings state, selected final-verification posture and
candidate-bound checks/evidence, acceptance transition, and separate authoritative landing proof.
After `Accepted`, record verification intent on the authorized `Waiting` → `Finalizing` or
retained-authority `Accepted` → `Finalizing` transition. The `deterministic` posture authorizes
`OPC-VERIFY-EXECUTE`; every policy-selected required check class must produce a passing,
subject-matching `EV-CHECK-OBSERVATION`, and the complete required set must be satisfied inside
`Finalizing` before target-changing `OPC-DEL-*`, merge, delivery, or landing. The `none` posture is
an explicit no-op and authorizes no verification Operation. Partial, self-authored, stale, or
differently bound verdicts fail closed. Approval is not landing.

## DR choices

For each applicable `DR-*`, state: question; owner; selected bounded option; immutable constraints;
alternatives rejected/deferred; implementation evidence; failure fallback; and whether a new owner
decision is required. Include `none` only with evidence that no `DR-*` applies.

## Story boundary, relative size, and phase integration

Declare `S`, `M`, or `L`, one coherent authority/semantic oracle, expected owned paths, and excluded
follow-up. Use only semantic/provider splits already declared by `track.json`. The story candidate
integrates into the phase branch after exact-candidate approval; it does not create its own delivery
PR. The phase produces one final PR after all required stories integrate and closure gates pass.

## Definition of Ready

- The exact external owner-ratification/activation record is independently verified, including
  authenticated owner/delegation, current validity, durable record identifier, approved `P`, any
  landing-equivalence record, immutable provenance, target scope, selected realization, and
  expiry/revocation. Generic authorization, CI, a branch, or a verdict cannot substitute.
- Literal `track.json` ID, phase, dependencies, edge types, and gates are recorded without
  invention. Declared predecessors are landed in the observed integration base.
- Registered clean story worktree and continuous implementer/independent reviewer pair are recorded.
  Pairs are distinct across stories and stable within the story except explicit recorded
  replacement.
- The current 67-file normative-corpus comparison, planned owned paths, governing IDs/ports/facts,
  applicable `DR-*`, selected final-verification posture/check classes/environment/binding, scope,
  proof, hosted CI, and provider qualification are explicit and current.
- Candidate commit/tree are intentionally absent until post-implementation freeze. Missing, stale,
  ambiguous, or unverifiable readiness facts stop work.

## Definition of Done

- Boundary values, validation, authority, durable facts, typed failures/bounds, recovery, security,
  preservation, cleanup, and required behavior are implemented and evidenced.
- Required unit, contract, adversarial, replay, crash/fault, provider, E2E, and `CF-*` proof passes
  on the exact committed candidate in its registered worktree.
- The continuous independent reviewer records `PASS` on that exact candidate; corrections and
  target changes received affected checks and incremental re-review by the same reviewer.
- Approved integration preserves the reviewed story commit as an ancestor. Required integration
  checks, independent closure review, normal hosted CI, approval, and DoD pass on the one final
  phase PR; authoritative landing proof remains separate.
- Story worktree/branch/pair remain quiescent through final-PR feedback and confirmed closure.
  Cleanup requires explicit authorization and cannot release a dependency or alter outcome.
```

## Universal fail-closed rules

Every contract inherits these non-negotiable rules: reject or park malformed, unknown, stale,
ambiguous, cross-boundary, self-attested, or unverifiable facts; preserve resources on uncertain
cleanup; never blindly retry an uncertain effect; never let provider evidence mint Jig authority;
never invent a tracker dependency; keep an adapter unreachable until its qualification gate is
current; treat CI as evidence rather than approval; and keep live delivery state outside repository
source, tests, fixtures, and CI configuration. The contract makes each rule testable rather than
merely repeating it.
