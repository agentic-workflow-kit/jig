---
title: "Jig greenfield delivery — independent review checklist"
purpose: "Make PASS and finding criteria repeatable for a frozen implementation or phase candidate."
audience:
  - independent reviewers
status: mandatory review checklist
owner: Arye Kogan
last_verified: 2026-07-29
---

# Independent review checklist

Select the story implementation-candidate or phase-closure scope in the
[reviewer packet](./README.md). Mark every applicable item `PASS`, `FINDING`, or `N/A with
evidence`; `N/A` never means “not considered.”

## Reviewer operation boundary

- [ ] I performed semantic/evidence review with read-only inspection only. I did not execute
      `pnpm` tests/checks/builds, direct validators, formatters, installers, evidence writers, or
      GitHub/repository mutations.
- [ ] Missing, stale, contradictory, or incorrectly bound verification evidence is a finding; I
      did not repair it by rerunning a command. The implementation owner owns local execution,
      hosted CI independently runs required checks, and the coordinator verifies orchestration
      facts/evidence bindings.

## A. Implementation-candidate review

Use this section for one implementation attempt of one `GF-*` story covered by an explicit current
owner or named-delegate implementation request. It permits bounded story-owned source,
configuration, test, and evidence paths. No package qualification, digest approval, or separate
external approval issue is required.

### Subject, base, and authorization

- [ ] The explicit current implementation request covers this phase/story. The external operational
      ledger records its scope and constraints, current product/design/track provenance, and any
      selected bounded realization; no durable external approval URL is required.
- [ ] Routine documentation, tooling, test, formatting, or Git-byte drift has not been treated as
      revoking authorization. Any material authority, scope, dependency, realization, or
      provider-reachability drift has fresh explicit direction.
- [ ] The external ledger identifies the registered story worktree path/branch, phase integration
      ref, resolved base commit/tree, candidate commit/tree, continuous implementer and independent
      reviewer, and any exceptional pair-replacement reason/handoff.
- [ ] The candidate contains no pinned live delivery state in source, tests, fixtures, or CI:
      commit/tree IDs, worktree paths, story branches, PR/issue URLs, reviewer identities/verdicts,
      approval records, or delivery-surface digests.
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
      It did not grant approval or widen the explicit implementation scope.
- [ ] After `Accepted`, the authorized entry into `Finalizing` records verification intent. Under
      `deterministic`, every required class has a passing subject-matching
      `EV-CHECK-OBSERVATION`, and the complete set is satisfied before target-changing
      `OPC-DEL-*`, merge, delivery, or landing. `none` is an explicit no-op.
- [ ] Post-`Accepted` observations are continuation evidence only while candidate, posture, class
      set, configuration/environment, and binding remain unchanged; any drift requires every
      applicable required check and same-reviewer incremental review before the evidence can
      continue.
- [ ] Reviewer identity/independence, findings, acceptance metadata, and final-verification posture
      bind exactly to this candidate. No partial, stale, self-authored, or differently based verdict
      is accepted.

### Implementation-candidate verdict record

Record: protocol; story ID; authorized scope and constraints; current product/design/track
provenance and selected bounded realization; registered worktree/branch; continuous pair; base
ref/commit/tree; candidate commit/tree; merge-base and declared-predecessor containment;
normative-corpus comparison; owned paths; verification posture, required check classes,
environment, subject binding, local/hosted check evidence, clean status; reviewer
identity/independence; findings; verdict; timestamp; and later integration result/commit.
Final-verification observations after `Accepted` are appended continuation evidence only under the
unchanged binding.

## B. Phase integration and closure

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
explicit implementation scope, candidate-bound checks/CI, finalization, landing, or dependency
release.
