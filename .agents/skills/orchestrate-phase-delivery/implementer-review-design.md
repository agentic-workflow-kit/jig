# Implementer and reviewer quality loop

**Status:** Approved for implementation in `fix/orchestration-quality-loop`; the design remains the
scope and acceptance contract until the implementation is reviewed.

## Decision

Improve first-candidate quality in Jig phase delivery by making three existing decisions explicit:

1. choose implementer effort from semantic risk as well as apparent task boundedness;
2. pass the continuous reviewer's preparation findings to the implementer before implementation;
3. require each review pass to report the complete set of presently supportable blocking findings,
   grouped by root cause.

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

It does not define generic sub-agent context or provider routing. Those belong to the global
`offload` skill. It also does not change product or architecture authority, the declared track DAG,
story acceptance criteria, worktree policy, evidence gates, or the read-only reviewer boundary.

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
- Reduce serial discovery of sibling manifestations of one root defect.
- Preserve exact-candidate checks, reviewer independence, and the existing state machine.
- Keep the operational surface as small as it is today.

## Non-goals

- Guaranteeing a first-pass approval.
- Raising every implementation story to high or xhigh effort.
- Turning the reviewer into a co-implementer or check runner.
- Adding an acceptance matrix, realization packet, second reviewer, verifier, or design approval.
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

## Proposed workflow

### 1. Classify implementation risk

Select effort before implementation using both scope clarity and semantic risk.

Use medium when the story is bounded, the realization is directly determined by current authority,
and failures are local and covered by straightforward positive and negative tests.

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

### 2. Prepare once, before writes

The stable reviewer performs the already-required read-only preparation against the exact story,
approved product/design authority, predecessor surface, and affected package seams.

The reviewer returns a concise set of must-cover bullets, normally five to twelve. Each bullet
states:

- the invariant or failure mode;
- the source that makes it required; and
- the observable proof expected in code, types, or tests.

The coordinator includes those bullets in the implementer task. They supplement the story contract;
they do not replace or expand it. A genuine ambiguity still follows the existing
`OWNER_DECISION_REQUIRED` rule.

### 3. Implement and self-check

The implementer owns the realization and executable verification. Before freezing the candidate,
the implementer checks the diff against each must-cover bullet and reports where its proof appears.
This report stays in the normal handoff; it is not a new repository artifact.

The implementer must search for sibling occurrences when a rule applies to a family of operations,
states, or types. A single happy-path example is insufficient when the authority requires symmetric
negative or recovery behavior.

### 4. Review one complete pass

The reviewer remains read-only and candidate-bound. It inspects the full authorized diff, the
must-cover bullets, sibling occurrences, relevant tests, and recorded check evidence.

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

## Minimal task shapes

The implementer task should add only:

- the selected effort and why;
- the reviewer's must-cover bullets;
- an instruction to identify proof for each bullet before candidate freeze; and
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
- reviewer preparation appears in the implementer prompt as concise must-cover bullets;
- implementer handoff identifies proof for those bullets without creating a new artifact;
- reviewer output requests all currently supportable blockers grouped by root cause and names
  re-review scope;
- the reviewer remains read-only and never runs checks;
- structural findings cause a realization rethink only when needed;
- exact-candidate checks, re-review, integration, and owner-decision rules remain unchanged; and
- `pnpm delivery:check`, focused skill validation, repository formatting/link checks, and
  `git diff --check` pass.

## Rejected additions

This design deliberately rejects a new planning ceremony, acceptance matrix, reviewer approval
before implementation, separate verifier, extra ledger schema, and universal high-effort routing.
The existing pair already has the right roles and evidence boundaries; the missing piece is better
information flow between them.
