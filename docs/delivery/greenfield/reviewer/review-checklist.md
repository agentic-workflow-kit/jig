---
title: "Jig greenfield delivery — independent review checklist"
purpose: "Make PASS and finding criteria repeatable for a frozen delivery-package or implementation-candidate subject."
audience:
  - independent reviewers
status: mandatory review checklist
owner: Arye Kogan
last_verified: 2026-07-23
---

# Independent review checklist

Select either the delivery-package or implementation-candidate protocol in the
[reviewer packet](./README.md). Mark each applicable item `PASS`, `FINDING`, or `N/A with
evidence`; `N/A` never means “not yet considered.” Do not impose package-corpus checks on a
story implementation candidate.

## Reviewer operation boundary

- [ ] I performed semantic/evidence review with read-only inspection only. I did not execute `pnpm`
      tests/checks/builds, direct validators, formatters, installers, evidence writers, or
      GitHub/repository mutations.
- [ ] Missing, stale, contradictory, or incorrectly bound verification evidence is recorded as a
      finding; I did not repair it by rerunning a check. The implementation owner owns local
      execution, hosted CI independently executes required checks, and the coordinator verifies
      only orchestration facts/evidence bindings.

## A. Delivery-package review

Use this section only when reviewing the delivery package itself.

### Subject and authority

- [ ] Pre-verdict delivery-package candidate identity `Q` is recorded outside the candidate: the exact candidate
      commit/tree to be reviewed; exact package-only path set; each path's bytes/type/mode; and aggregate computed
      unpinned digest. The coordinator supplies `Q` and available checks/evidence separately; `Q`
      contains neither `PASS` nor a review record.
- [ ] The independent reviewer verifies/computes the unpinned digest over `Q`'s exact path set and
      records external review record `R`: protocol; reviewer identity/independence; exact `Q`;
      checked scope; checks/evidence; findings; verdict; and a durable external record identifier.
      Only `R` with `PASS` creates `P = Q + durable R identifier + PASS`. No expected package digest is
      copied into `track.json`, validator constants, fixtures, or candidate-authored review prose.
      A different squash OID requires an authoritative landing-equivalence record binding approved
      `P`/`Q` to target ref and landed commit/tree and proving full-tree equality or complete `Q`
      path-set byte/type/mode equality reproducing `Q`'s digest; it does not make that landed commit
      reviewed.
- [ ] The checkout and review scope are clean; no unrecorded path, generated residue, or moving
      branch changes the frozen subject.
- [ ] The live 67-file normative path set and aggregate SHA-256 manifest match the passed subject
      and current byte-identical corpus, rather than a copied baseline assertion. This is
      corpus-drift evidence only, not a candidate approval digest.
- [ ] Every brief front matter exactly matches its manifest fields; all stable IDs, `PC-*` routes,
      and imported commitments are literal, locally explained, and neither wildcard nor invented.
- [ ] Product outcome/why and every governing design path/stable ID are traceable; no archive or
      non-governing research selected behavior.
- [ ] Every `DR-*` selection has owner, constraints, evidence, fallback, and no material invention.

### Exact planning closure

- [ ] The manifest's exact story set, phases, dependencies, and declared critical path match the
      live DAG; all edges are topological and the critical path is the actual longest path.
- [ ] Every proof-route, import, and fixed inventory has the required forward and reverse occurrence;
      exact failure-class and identity catalogs use their literal defined values only.
- [ ] I13/I14 preserve only `Landed` dependency release and separate business outcome from
      retirement; pre-Run rejected acknowledgement remains separate from Story terminal selectors.
- [ ] Refresh retains authority only under its valid fence, mints a new `ID-CAND`, returns the
      changed candidate to full review, and atomically rebinds the target basis.
- [ ] Remote `PORT-DELIVERY` and local `PORT-VERIFY` remain separate authority/mechanism seams.

### Authority, evidence, and containment

- [ ] Runtime units, ports, inputs, outputs, identities, durable facts, trust roots, and writer
      authority are explicit and conform to design; evidence never confers authority.
- [ ] Every mandatory semantic-to-provider split is closed; a real provider remains unreachable and
      unconfigurable until its exact current qualification evidence admits its manifest.
- [ ] Required `CF-*` gates, product proof routes, imported-commitment disposition, reviewer
      identity/independence, and acceptance metadata are complete and exact-subject-bound.
- [ ] Changed paths match the package allowlist; no product source, product package scaffolding, or
      unrelated configuration is included.
- [ ] Adversarial validator tests cover malformed manifest/front matter, IDs, dependencies/cycles,
      stale mappings, split closure, and changed delegated-choice constraints. A stale result is
      reported, not weakened.

### Delivery-package verdict record

Record external `R`: protocol; reviewer identity/independence; exact `Q` (the exact candidate
commit/tree to be reviewed, exact package-only path set, each path's bytes/type/mode, and aggregate computed
unpinned digest); checked scope; checks/evidence; findings; verdict; and a durable external record
identifier. When the verdict is `PASS`, record approved `P = Q + durable R identifier + PASS` and any
required authoritative landing-equivalence record. Each finding
states `F-NNN`, severity, governing path/ID, exact evidence, affected observable behavior, required
correction/result, and re-review scope.

## B. Implementation-candidate review

Use this section only for one implementation attempt of one `GF-*` story whose exact external
owner-ratification/activation record is verified.
It permits the bounded story-owned source, configuration, test, and evidence paths. It does not
require a fresh package-digest computation, full delivery-corpus review, delivery-package path
allowlist, or a full package closure review. It consumes already-approved `P`; its verdict binds
only the implementation tuple and never mints or redefines `Q`, `R`, or `P`.

### Subject, base, and authorization

- [ ] The exact external owner-ratification/activation record is recorded and independently
      verified: authenticated owner or explicitly named delegated principal, independently
      verifiable delegation/current validity, durable record ID/URL, approved package `P`,
      any required authoritative landing-equivalence record, immutable planning/authority provenance, activation
      target scope, realization tuple, and
      expiry/revocation. Generic authorization cannot pass. The observed target base ref, resolved
      base commit/tree, candidate commit/tree, clean scope, and owned path set also resolve exactly;
      planning provenance is not the presumed execution base.
- [ ] Approved package `P = Q + durable R identifier + PASS` is recorded and resolves exactly. Where a
      squash-produced landed OID differs, the authoritative landing-equivalence record binds
      approved `P`/`Q` to target ref and landed commit/tree and proves full-tree equality or complete
      `Q` path-set byte/type/mode equality reproducing `Q`'s digest. Add/remove/rename/mode/byte
      drift, or missing/ambiguous evidence, requires a new `Q`, external `R`, and approved `P`; the
      landed commit is not itself treated as reviewed.
- [ ] The candidate carries no pinned delivery-process constants in source, tests, fixtures, or CI
      config (commit SHAs, tree hashes, branch names, PR/issue URLs, verdicts, approval records,
      package digests, or story IDs used as identifiers). Exact-subject evidence is present as a
      generated artifact, not a committed assertion.
- [ ] `merge-base(candidate, base) == base` is recorded and holds. Target-content evidence proves
      every required predecessor landing is contained in that base; an unreviewed branch does not
      satisfy a dependency.
- [ ] The external, non-candidate seal envelope records the candidate/base/tree/merge-base tuple,
      exact commands, timestamps, exit codes, output-log digests or durable log identities,
      automatic `git diff --check <base-commit>...<candidate-commit>` result, base-ancestry proof,
      and final proof that the original `HEAD`/tree are unchanged and the worktree is clean. Commands
      ran in a local exact-candidate clone and its commit/tree/status remained clean after every
      command. It was created after
      the candidate was committed and before review; every required local command ran against that
      exact `HEAD` once. A missing or invalid seal is a finding, not a reason to rerun a command.
- [ ] A current path-by-path comparison shows the candidate's 67 normative authority files match
      immutable authority provenance; its recorded result binds to this candidate tuple.
- [ ] The changed paths are limited to the contract's bounded story ownership and may include
      product source/configuration. No unrelated authority, behavior, or configuration is smuggled
      into the candidate.
- [ ] A target-ref move, refresh, rebase, source/configuration/pre-acceptance-evidence change,
      candidate change, or drift in selected posture, required check-class set, verification
      configuration/environment, or subject binding has produced a new tuple with refreshed
      merge-base/containment proof, normative-corpus comparison, affected evidence, CI, and review.
      A changed package identity `Q`, or missing, ambiguous, or drifting authoritative
      landing-equivalence evidence, has its own new independent package review record `R` and
      approved `P` before implementation review. Recording after `Accepted` only the
      final-verification observations authorized by the unchanged reviewed candidate, posture,
      required class set, configuration/environment, and binding is continuation evidence, not a
      tuple change.
- [ ] For a correction, the reviewer rechecked changed hunks, sibling occurrences, affected
      invariants, and the new seal/evidence binding. An unchanged conclusion carried forward only
      where the path hash is unchanged; neither a full manual corpus reread nor a reviewer-run
      check suite was required.

### Governing behavior and evidence

- [ ] The story contract is complete and traces the implemented outcome, authority, IDs, inputs,
      durable facts, failure/recovery behavior, provider reachability, and applicable `DR-*` bounds
      to active product/design authority.
- [ ] Required unit/schema, contract, negative-authority, adversarial, replay, crash/fault,
      timeout/reconciliation, provider, and E2E evidence is present or validly inapplicable and
      binds to the same base/candidate tuple.
- [ ] No boundary, provider, reviewer, evidence, timer, retry, cleanup, acceptance, landing, or
      dependency-release rule widens authority or violates the story's fail-closed contract.
- [ ] The selected final-verification posture binds to the immutable candidate. Pre-review hosted
      CI may be present. After `Accepted`, the authorized `Waiting` → `Finalizing` or
      retained-authority `Accepted` → `Finalizing` transition records verification intent. The
      `deterministic` posture authorizes `OPC-VERIFY-EXECUTE`; every policy-selected required check
      class has a passing, subject-matching `EV-CHECK-OBSERVATION`, and the complete required set is
      satisfied inside `Finalizing` before any target-changing `OPC-DEL-*`, merge, delivery,
      landing, or other target-changing Operation. `none` is an explicit no-op and authorizes no
      verification Operation. The post-`Accepted` observations are authorized continuation evidence
      and do not invalidate review while candidate, posture, required class set, verification
      configuration/environment, and subject binding stay unchanged; drift requires a fresh tuple
      and review. Publication used only D15's recorded `Reviewing` transition and fenced
      `OPC-REV-*` draft/non-mergeable review publication, never approval or a substitute
      owner-ratification/activation record.
- [ ] The reviewer is independent; findings, acceptance metadata, and final-verification posture
      bind exactly to this tuple. No partial, stale, or differently based verdict is accepted.

### Implementation-candidate verdict record

Record: protocol; story ID; exact external owner-ratification/activation record (authenticated
owner or explicitly named delegated principal, independently verifiable delegation/current
validity, durable record ID/URL, approved package `P = Q + durable R identifier + PASS`, any required authoritative landing-equivalence
record, immutable provenance, activation target scope, realization tuple, and expiry/revocation);
base ref/commit/tree; candidate commit/tree; merge-base equality and
predecessor-containment proof; current normative-corpus comparison; owned paths; selected
final-verification posture, required check-class set, verification configuration/environment,
subject binding, and pre-review checks/CI/evidence digests; reviewer identity/independence; verdict;
and findings. For this protocol, resolve `P`; do not require a fresh package-path-set digest
computation or rewrite delivery-package `R`. Final-verification observations recorded after
`Accepted` are separately appended continuation evidence under the unchanged binding.

## Verdict rule

Return `PASS` only when no blocking finding remains on the selected exact frozen subject. Return
`CHANGES_REQUIRED` for correctable defects. Return `OWNER_DECISION_REQUIRED` and stop when the
needed correction changes product intent, architecture, authority, guarantee, accepted cost, or
deliberate deferral beyond a recorded delegation. A `PASS` neither authorizes a future base refresh
nor substitutes for the exact external owner-ratification/activation record, applicable exact-
candidate CI/evidence, approval, landing, finalization, or dependency release.
