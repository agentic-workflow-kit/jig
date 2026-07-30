---
title: "Jig greenfield delivery — independent review checklist"
purpose: "Make PASS and finding criteria repeatable for a frozen delivery-package or implementation-candidate subject."
audience:
  - independent reviewers
status: mandatory review checklist
owner: Arye Kogan
last_verified: 2026-07-29
---

# Independent review checklist

Select either the delivery-package or implementation-candidate protocol in the
[reviewer packet](./README.md). Mark every applicable item `PASS`, `FINDING`, or `N/A with
evidence`; `N/A` never means “not considered.” Do not impose package-corpus checks on a story
implementation candidate.

## Reviewer operation boundary

- [ ] I performed semantic/evidence review with read-only inspection only. I did not execute
      `pnpm` tests/checks/builds, direct validators, formatters, installers, evidence writers, or
      GitHub/repository mutations.
- [ ] Missing, stale, contradictory, or incorrectly bound verification evidence is a finding; I
      did not repair it by rerunning a command. The implementation owner owns local execution,
      hosted CI independently runs required checks, and the coordinator verifies orchestration
      facts/evidence bindings.

## A. Delivery-package review

Use this section only when reviewing the delivery package itself.

### Subject and authority

- [ ] Pre-verdict `Q` is recorded outside the candidate: exact package commit/tree, exact
      package-only path set, every path's bytes/type/mode, and aggregate computed unpinned digest.
      The coordinator supplies `Q` and checks/evidence separately; `Q` contains neither `PASS` nor
      a review record.
- [ ] The independent reviewer verifies the unpinned digest over `Q` and records external `R`:
      protocol, reviewer identity/independence, exact `Q`, checked scope, checks/evidence, findings,
      verdict, and durable external identifier. Only `R = PASS` creates
      `P = Q + durable R identifier + PASS`.
- [ ] No expected package digest is copied into `track.json`, validator constants, fixtures, or
      candidate-authored prose. A package byte/path-set change requires new `Q`, `R`, and `P`.
- [ ] A squash-changed OID has authoritative landing-equivalence evidence binding approved `P`/`Q`
      to the landed target and proving full-tree equality or complete `Q` path-set
      byte/type/mode equality reproducing `Q`'s digest. It is not treated as making the landed
      commit reviewed.
- [ ] The checkout and review scope are clean; no unrecorded path, generated residue, or moving
      branch changes the frozen subject.
- [ ] The live 67-file normative path set and aggregate manifest match the current byte-identical
      corpus. This is corpus-drift evidence, not candidate approval.
- [ ] Every brief front matter exactly matches its 15 manifest fields; stable IDs, `PC-*` routes,
      imports, and `DR-*` choices are literal, locally explained, and neither wildcard nor invented.
- [ ] Product outcomes and governing design paths/IDs are traceable; no archive or non-governing
      research selected behavior.

### Exact planning closure

- [ ] The manifest's exact story set, phases, declared dependencies, edge types, and critical path
      match the live DAG. All edges are topological; no orchestration artifact added an edge.
- [ ] Every proof route, import, and fixed inventory has required forward and reverse occurrences;
      failure-class and identity catalogs use literal defined values only.
- [ ] I13/I14 preserve only `Landed` dependency release and separate business outcome from
      retirement; pre-Run rejected acknowledgement remains separate from Story terminal selectors.
- [ ] Refresh retains authority only under its valid fence, mints a new `ID-CAND`, returns the
      changed candidate to full review, and atomically rebinds the target basis.
- [ ] Remote `PORT-DELIVERY` and local `PORT-VERIFY` remain separate authority/mechanism seams.

### Authority, evidence, and containment

- [ ] Runtime units, ports, inputs, outputs, identities, durable facts, trust roots, and writer
      authority conform to active design; evidence never confers authority.
- [ ] All eight mandatory semantic-to-provider splits remain closed; a real provider is unreachable
      until exact current qualification evidence admits its manifest.
- [ ] Required `CF-*` gates, product proof routes, imported-commitment disposition, reviewer
      independence, and acceptance metadata are complete and exact-subject-bound.
- [ ] Changed paths match the exact package manifest, including the repository-local
      phase-delivery skill; no product source, product package scaffolding, or unrelated
      configuration is included.
- [ ] Adversarial validator tests cover malformed manifest/front matter, IDs, dependencies/cycles,
      stale mappings, split closure, changed delegated constraints, and unexpected skill paths. A
      stale result is reported rather than weakened.

### Delivery-package verdict record

Record external `R`: protocol; reviewer identity/independence; exact `Q`; checked scope;
checks/evidence; findings; verdict; and durable external identifier. When `PASS`, record
`P = Q + durable R identifier + PASS` and any landing-equivalence record. Each finding states
stable ID, severity, governing path/ID, exact evidence, affected observable behavior, required
correction/result, and re-review scope.

## B. Implementation-candidate review

Use this section only for one implementation attempt of one `GF-*` story whose exact external
owner-ratification/activation is verified. It permits bounded story-owned source, configuration,
test, and evidence paths. It does not require fresh package digest/full corpus review and consumes
already-approved `P`; its verdict never mints or redefines `Q`, `R`, or `P`.

### Subject, base, and authorization

- [ ] The owner-ratification/activation record is exact and current: authenticated owner or named
      delegated principal, verifiable delegation, durable record ID/URL, approved `P`, any
      landing-equivalence record, immutable provenance, target scope, realization tuple, and
      expiry/revocation. Generic authorization cannot pass.
- [ ] Approved `P = Q + durable R identifier + PASS` resolves exactly. Add/remove/rename/mode/byte
      drift in approved package `Q`/`P`, or missing landing-equivalence evidence, requires new `Q`,
      `R`, and `P`.
- [ ] The external ledger identifies the registered story worktree path/branch, phase integration
      ref, resolved base commit/tree, candidate commit/tree, continuous implementer and independent
      reviewer, and any exceptional pair-replacement reason/handoff.
- [ ] The candidate contains no pinned live delivery state in source, tests, fixtures, or CI:
      commit/tree IDs, worktree paths, story branches, PR/issue URLs, reviewer identities/verdicts,
      approval records, or package digests.
- [ ] `merge-base(candidate, base) == base` is recorded and holds. Target-content proof shows every
      declared predecessor landing is contained in that base; an unreviewed branch is insufficient.
- [ ] Required check evidence binds to the exact candidate: command or set, result, timestamp,
      durable log/reference, verification posture/class set/environment, candidate-bound
      `git diff --check` where applicable, and unchanged `HEAD`/tree with clean status before and
      after review.
- [ ] Every locally recorded check used the recorded minimal environment-name allowlist. Ambient
      token/secret/credential/auth/key variables and secret values were excluded; any authorized
      sandbox credential used only its named least-privilege provider boundary with redaction and
      secret-absence proof.
- [ ] Exact `git ls-files --others --ignored --exclude-standard` inventories before checks and
      after review contain only allowed state. `.env`/credential files, external workspace links,
      unexplained generated output, or unlisted residue fail; dependency trees have
      frozen-lockfile/link-containment proof and generated/cache output was regenerated or
      exact-candidate-keyed.
- [ ] Checks ran only in the registered story worktree. Provider-managed hosted-CI checkout is the
      sole workspace exception and cannot replace local evidence or review. No custom sealer, seal
      envelope, detached clone, fresh clone, or resealing was required as a gate.
- [ ] A current path-by-path comparison shows the candidate's 67 normative authority files match
      immutable authority provenance and binds to this candidate.
- [ ] Changed paths are limited to bounded story ownership; no unrelated authority, behavior, or
      configuration is included.
- [ ] A target movement, rebase, correction, source/configuration/evidence change, posture/class-set/
      environment change, or subject-binding drift produced a new committed candidate, refreshed
      base/containment facts, and evidence for every applicable required check.
- [ ] The same continuous reviewer incrementally rechecked the prior-reviewed-to-new range, sibling
      occurrences, affected invariants, and new evidence. Conclusions carried forward only for
      unchanged paths and unaffected invariants; the old verdict did not transfer.

### Governing behavior and evidence

- [ ] The full story contract traces outcome, authority, IDs, inputs, durable facts, failures,
      recovery, security, provider reachability, and applicable `DR-*` bounds to active authority.
- [ ] Required unit/schema, contract, negative-authority, adversarial, replay, crash/fault,
      timeout/reconciliation, provider, and E2E evidence is present or validly inapplicable and
      binds to the same base/candidate.
- [ ] No boundary, provider, reviewer, evidence, timer, retry, cleanup, acceptance, landing, or
      dependency-release rule widens authority or violates fail-closed behavior.
- [ ] The selected final-verification posture binds the immutable candidate. D15's recorded
      `Reviewing` transition authorized only fenced `OPC-REV-*` draft/non-mergeable publication.
      It did not grant approval or replace owner activation.
- [ ] After `Accepted`, the authorized entry into `Finalizing` records verification intent. Under
      `deterministic`, every required class has a passing subject-matching
      `EV-CHECK-OBSERVATION`, and the complete set is satisfied before target-changing
      `OPC-DEL-*`, merge, delivery, or landing. `none` is an explicit no-op.
- [ ] Post-`Accepted` observations are continuation evidence only while candidate, posture, class
      set, configuration/environment, and binding remain unchanged; any drift requires affected
      checks and same-reviewer incremental review before the evidence can continue.
- [ ] Reviewer identity/independence, findings, acceptance metadata, and final-verification posture
      bind exactly to this candidate. No partial, stale, self-authored, or differently based verdict
      is accepted.

### Implementation-candidate verdict record

Record: protocol; story ID; exact owner activation; approved `P`; landing-equivalence record where
required; registered worktree/branch; continuous pair; base ref/commit/tree; candidate commit/tree;
merge-base and declared-predecessor containment; normative-corpus comparison; owned paths;
verification posture, required check classes, environment, subject binding, local/hosted check
evidence, clean status; reviewer identity/independence; findings; verdict; timestamp; and later
integration result/commit. Final-verification observations after `Accepted` are appended
continuation evidence only under the unchanged binding.

## C. Phase integration and closure

- [ ] Every integrated story had candidate-bound `PASS`; fast-forward or no-fast-forward
      integration preserves the reviewed story commit as an ancestor.
- [ ] A content conflict was aborted and returned to the same pair for a new candidate/check/review
      loop; the coordinator did not resolve it on the phase branch.
- [ ] Story worktrees, branches, and pairs remain quiescent for final-PR feedback until confirmed
      landing and explicit cleanup authorization.
- [ ] Required integration checks and independent read-only closure review bind the frozen phase
      candidate. Final-PR findings route to the owning pair; a changed phase candidate receives
      refreshed checks and closure review.
- [ ] The phase has one normal hosted-CI-backed PR to `main`; approval, DoD, finalization, and
      authoritative landing proof remain separate and required.

## Verdict rule

Return `PASS` only when no blocking finding remains on the selected frozen subject. Return
`CHANGES_REQUIRED` for correctable defects. Return `OWNER_DECISION_REQUIRED` when correction would
change product intent, architecture, authority, guarantee, accepted cost, or deliberate deferral
beyond a recorded delegation. `PASS` neither authorizes a future base refresh nor substitutes for
owner activation, candidate-bound checks/CI, finalization, landing, or dependency release.
