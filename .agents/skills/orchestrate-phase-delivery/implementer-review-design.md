# Implementer and reviewer quality loop

**Status:** The original quality loop is implemented. The Phase 2 amendments are approved for
implementation in `fix/phase-delivery-quality-v2`; this document remains the scope and acceptance
contract until that implementation is reviewed.

## Decision

Improve first-candidate quality in Jig phase delivery by making six existing decisions enforceable:

1. choose implementer effort from semantic risk as well as apparent task boundedness;
2. pass the continuous reviewer's preparation findings to the implementer before implementation;
3. require each review pass to report the complete set of presently supportable blocking findings,
   grouped by root cause;
4. use global offload planning before dispatch without translating semantic role names into runtime
   agent types;
5. require resolved authority and concrete proof mapping before candidate freeze; and
6. preserve an advancing pair while bounding genuine non-progress and replacement chains.

Use the existing implementer/reviewer pair, prompt, candidate, verdict, and ledger fields. Do not add
a new agent, artifact, approval, or mandatory planning ceremony.

## Boundary

This document changes only the repository-local `orchestrate-phase-delivery` behavior.

It may define:

- how Jig story characteristics affect implementer effort;
- what the stable reviewer prepares before implementation;
- what the implementer must cover before freezing a candidate;
- how review findings are returned to the same implementer; and
- when a structural finding requires rethinking the realization before another candidate.

It does not define generic sub-agent context, provider routing, or which runtime agent types exist.
Those belong to the global `offload` skill. It requires the coordinator to use that global plan and
reject incompatible routing, while defining only Jig's semantic roles and risk input. It also does
not change product or architecture authority, the declared track DAG, story acceptance criteria,
worktree policy, evidence gates, or the read-only reviewer boundary.

## Problem

Session `019fb3ec-a9cd-7893-97db-77986ec21bc7` preserved important delivery safeguards, but produced
too many review/fix loops. Through GF-013, twenty candidate reviews produced sixteen
`CHANGES_REQUIRED` verdicts and four passes; no story passed its first candidate review.

The findings were substantive rather than cosmetic. They repeatedly exposed authority boundaries,
recovery semantics, witness behavior, type closure, persistence seams, and negative-path gaps. The
loop count therefore does not justify weakening review. It shows that review was doing too much of
the implementation specification work after the candidate had already been built.

Three local behaviors contributed:

- large authority and recovery stories could still be classified as ordinary medium-effort work
  because their file scope looked bounded;
- the reviewer prepared against the source-of-truth contracts, but that preparation was not turned
  into a concise implementer input; and
- reviewers could report one valid blocker without being asked to finish the current pass across
  sibling occurrences and adjacent invariants.

The result was correctable but expensive: narrow patch, new candidate, full checks, re-review, then
discovery of another facet of the same underlying contract.

## Phase 2 evidence and revised diagnosis

At the audited snapshot of session `019fb777-cb15-7790-9b3b-5a865f08636a`, the first amendments were
working on the reviewer side: preparation named contract-sensitive risks before writes, and first
reviews grouped multiple supportable blockers instead of serially stopping. Across the first four
attempted stories, however, fifteen substantive reviews still produced twelve
`CHANGES_REQUIRED` verdicts and three passes, with no first-candidate pass at that snapshot.

The remaining causes were enforcement failures rather than missing task prose:

- planned Luna/high work ran through fixed Terra/medium implementer runtime types because semantic
  role names were treated as runtime choices instead of invoking offload's compatible route;
- implementers claimed broad must-cover completion without concrete code/type/test proof for every
  item, so incomplete candidates still froze;
- authority-heavy public identity, durable ledger, and policy choices reached implementation before
  the source boundary was resolved; and
- advancing workers and reviewers were replaced after incomplete corrections or a one-off
  non-mutating boundary breach, discarding useful story context.

The V2 amendment therefore tightens existing dispatch, preparation, handoff, freeze, and replacement
rules. It does not weaken review or add another planning artifact.

## What already works

The design retains the parts that protected correctness:

- exact candidates were frozen and bound to checks and verdicts;
- one continuous independent reviewer stayed with each story;
- reviewers were read-only and findings were evidence-based;
- story worktrees isolated concurrent delivery;
- incomplete or stale evidence did not become a pass;
- changed candidates received required checks and re-review; and
- stories were not integrated before a pass.

The goal is a better first candidate and a more complete review pass, not fewer safeguards.

## Goals

- Give the implementer the contract-sensitive risks already identified during reviewer preparation.
- Route high semantic-risk Jig stories to sufficient reasoning effort.
- Preserve the planned model and effort through an offload-compatible runtime route.
- Prevent unresolved authority or non-concrete proof claims from becoming a frozen candidate.
- Reduce serial discovery of sibling manifestations of one root defect.
- Replace continuous pair members only after defined non-progress or boundary failures.
- Preserve exact-candidate checks, reviewer independence, and the existing state machine.
- Keep the operational surface as small as it is today.

## Non-goals

- Guaranteeing a first-pass approval.
- Raising every implementation story to high or xhigh effort.
- Turning the reviewer into a co-implementer or check runner.
- Adding an acceptance matrix, realization packet, second reviewer, verifier, or design approval.
- Banning fixed runtime agent types globally or redefining offload's provider policy from Jig.
- Allowing implementation to alter product/design authority or the declared DAG.
- Replacing full candidate checks with reviewer inspection.

## Considered approaches

### 1. Raise every implementer to high effort

This is simple but wasteful. Medium remains appropriate for bounded, well-specified work whose
failure modes are local and mechanically testable. Story size alone is an incomplete routing rule.

### 2. Add a formal realization packet and pre-implementation approval

A separate artifact could enumerate every invariant and force agreement before writing. It would
also duplicate the story contract, source documents, reviewer preparation, and ledger. It adds a
new gate to every story even when the task is straightforward.

### 3. Reuse reviewer preparation as a compact implementer checklist

This is the recommended approach. The workflow already assigns the reviewer before implementation
and expects that reviewer to inspect authority and acceptance. The coordinator should forward the
reviewer's most important risks to the implementer as prompt content, then ask the reviewer to
complete one broad pass over the candidate before returning a verdict.

No durable artifact is required. The existing ledger may retain the normal findings and verdict.

### 4. Ban fixed runtime agent types globally

This is rejected. Offload serves many repositories and may select a fixed or configurable runtime
type when its contract matches the planned route. Jig should supply semantic risk and require an
offload-compatible route, not redefine global routing policy.

## Proposed workflow

### 1. Classify implementation risk

Select effort before implementation using both scope clarity and semantic risk.

Use medium only when the story is bounded, the realization is directly determined by current
authority, behavior and failure effects are local, none of the high-risk semantics below materially
applies, and straightforward positive and negative tests suffice.

Use high when any of the following materially shapes correctness:

- authority, fencing, recovery, replay, or idempotency semantics;
- witness or admission behavior where negative evidence matters;
- persistent identity, ordering, lifecycle, or cross-package type closure;
- a new seam whose abstractions constrain later stories;
- multiple source-of-truth documents whose invariants must be reconciled; or
- a large story where a locally plausible implementation can violate a non-local guarantee.

Use xhigh only for an exceptional release-critical or architecture-wide decision under the global
routing policy. It is not the default for a large story.

The classification belongs in the existing dispatch reasoning. It needs no new ledger field.

Before admission, require the global `offload` skill as an orchestration dependency. If it is absent,
stop with a missing-dependency error rather than inventing a Jig-local route, lowering effort, or
returning `OWNER_DECISION_REQUIRED`.

Before dispatch, use global offload planning for each semantic implementer and reviewer role. Record
the role/story, root work replaced, model class, planned model, effort/reason, compatible runtime
type, context mode, hard budget, expected output, verification owner, actual route, and fallback in
the existing dispatch/handoff and runtime trace. Jig assigns and records the verification owner from
its local ownership rules; offload does not choose that responsibility. Semantic role names never
choose the runtime type. Default to isolated context; reject a fixed type whose model/effort
conflicts with the plan; and do not begin writes until the accepted spawn configuration preserves
the route. Provider fallback may change the actual model, never the planned model or effort.

### 2. Prepare once, before writes

The stable reviewer performs the already-required read-only preparation against the exact story,
approved product/design authority, predecessor surface, and affected package seams.

The reviewer returns a concise set of stable-ID must-cover bullets, normally five to twelve. Each
bullet states:

- the invariant or failure mode;
- the source that makes it required;
- the observable behavior expected in code or types;
- the applicable test category; and
- sibling operations, states, or types to inspect.

The same response returns `resolved` with the exact authority source, or
`OWNER_DECISION_REQUIRED` with the missing/conflicting authority. Public identity, durable
authority, policy, fencing, or ownership semantics cannot proceed without an exact source. Clearly
authorized package-private bookkeeping remains eligible only when the admitted story has no
unresolved required authority. Any unresolved required authority blocks every write for that story
until the authority is resolved or the owner explicitly reauthorizes a narrower story scope;
independent ready stories continue.

The coordinator includes those bullets in the implementer task. They supplement the story contract;
they do not replace or expand it. A genuine ambiguity still follows the existing
`OWNER_DECISION_REQUIRED` rule.

### 3. Implement and self-check

The implementer owns the realization and executable verification. Before freezing the candidate,
the implementer maps every must-cover ID to concrete implementation and applicable type/test
locations, sibling-search scope/result, and implementation-owner verification evidence. A justified
non-testable designation is allowed; `covered` is not. This report stays in the normal handoff; it is
not a new repository artifact. Missing or non-concrete mappings remain `implementing`, unresolved
authority stops before writes, and false/inadequate mappings found in review are
`CHANGES_REQUIRED`.

The implementer must search for sibling occurrences when a rule applies to a family of operations,
states, or types. A single happy-path example is insufficient when the authority requires symmetric
negative or recovery behavior.

### 4. Review one complete pass

The reviewer remains read-only and candidate-bound. It inspects the full authorized diff, the
must-cover bullets, implementer proof mapping, sibling occurrences, relevant tests, and recorded
implementation-owner check evidence. It consumes recorded `git diff --check`, tests, and gates but
does not rerun them.

The output is:

- `PASS`, or `CHANGES_REQUIRED`;
- all presently supportable blocking findings from that pass, ordered by severity;
- findings grouped when they share one root cause;
- the exact invariant or source behind each group; and
- the re-review scope needed after a fix.

“Complete” does not mean speculative or exhaustive beyond available evidence. It means the reviewer
continues the current inspection after finding the first blocker instead of intentionally stopping
at it. If missing evidence prevents further judgment, that limitation is itself reported.

### 5. Fix at the right level

For a local defect, the same implementer fixes it, runs the required checks, freezes a new candidate,
and returns it to the same reviewer.

For a structural defect—wrong abstraction, misplaced ownership, incomplete type model, or a seam
that cannot express the required invariant—the implementer first restates the corrected realization
and affected surface in the normal handoff. Then it changes the implementation and runs the full
candidate gate.

This is a conditional rethink, not a new approval stage. If the corrected realization would change
approved architecture, tracked scope, dependencies, or an accepted trade-off, the existing
`OWNER_DECISION_REQUIRED` stop applies.

An incomplete but advancing correction keeps the same implementer. Replacement is exceptional:
unavailable/unusable session, incompatible runtime route, two consecutive no-progress turns, or the
same root semantic defect surviving two correction candidates. If a replacement reproduces the
same root defect, stop the affected story under existing execution-blocking rules instead of
forming an unbounded chain.

A reviewer that once runs a prohibited non-mutating check has that command discarded as review
evidence and receives the same bounded review again. Replace only after a repeated boundary breach,
mutation, evidence writing, or loss of availability. This recovery rule does not authorize reviewer
verification. If the replacement repeats the same qualifying failure, stop the affected story under
the existing execution-blocking rules instead of creating another reviewer replacement chain.

## Minimal task shapes

The implementer task should add only:

- the selected offload route and why;
- the reviewer's must-cover bullets;
- the reviewer authority-boundary result;
- an instruction to provide concrete proof mapping for each bullet before candidate freeze; and
- the existing candidate, verification, and stop conditions.

The reviewer task should add only:

- the same must-cover bullets and implementer proof notes;
- an instruction to complete the current pass across siblings and adjacent invariants;
- the grouped verdict format; and
- the existing read-only, candidate-bound constraints.

Everything else remains sourced from the current story, design, delivery policy, protocol, and
external ledger.

## Interaction with the global offload design

The global proposal owns how a bounded agent receives context and how spawn-time model and effort
match the dispatch decision. This repository-local proposal owns what Jig-specific information goes
into the self-contained task and how Jig risk affects effort.

The two designs are complementary but independently implementable:

- global isolation prevents accidental transcript and routing inheritance;
- route compatibility prevents semantic role names from silently selecting weaker runtime defaults;
- local preparation makes the isolated implementer prompt complete enough; and
- local review output makes one candidate review more informative.

Neither design should import the other's domain rules.

## Expected skill changes after approval

Implementation should remain limited to:

- `SKILL.md` for risk-sensitive routing and the prepare-before-write handoff;
- `references/phase-protocol.md` for implementer self-check, complete-pass review output, and the
  structural-defect branch;
- focused output and trigger eval updates; and
- existing skill validation tests only where behavior is encoded.

Do not add a tracked planning template, ledger field, scheduler state, or new delivery document.
No implementation is part of this design change.

## Acceptance criteria

The later implementation is acceptable when:

- a bounded medium-risk story remains eligible for medium effort;
- an authority, recovery, witness, persistence, or cross-seam story cannot be classified medium
  solely because its file list is bounded;
- semantic implementer/reviewer roles do not select runtime agent types, and the accepted spawn
  preserves the offload-planned model and effort before writes;
- reviewer preparation supplies stable-ID must-cover bullets and a resolved-or-owner-decision
  authority result;
- implementer handoff concretely maps every bullet before freeze without creating a new artifact;
- reviewer output requests all currently supportable blockers grouped by root cause and names
  re-review scope;
- the reviewer remains read-only, consumes owner-run check evidence, and never reruns checks;
- structural findings cause a realization rethink only when needed;
- advancing pair members are retained while repeated non-progress and boundary breaches have bounded
  replacement behavior;
- exact-candidate checks, re-review, integration, and owner-decision rules remain unchanged; and
- `pnpm delivery:check`, focused skill validation, repository formatting/link checks, and
  `git diff --check` pass.

## Rejected additions

This design deliberately rejects a new planning ceremony, acceptance matrix, reviewer approval
before implementation, separate verifier, extra ledger schema, universal high-effort routing, and a
Jig-owned ban on global runtime agent types. The existing pair already has the right roles and
evidence boundaries; V2 makes route, authority, proof, and continuity requirements enforceable in
their existing handoffs.
