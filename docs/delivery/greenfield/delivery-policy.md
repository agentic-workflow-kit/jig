---
title: "Jig greenfield delivery policy"
purpose: "Set the mandatory implementation, qualification, evidence, review, and phase-delivery rules."
audience:
  - delivery planners
  - implementers
  - reviewers
status: active policy for this documentation track
owner: Arye Kogan
last_verified: 2026-07-29
---

# Delivery policy

## Context, background, and goal

The governing architecture is implementable but intentionally source-empty. This policy turns that
fact into a safe delivery discipline: small closed stories, exact authority, durable evidence, and
independent review rather than speculative scaffolding or retrospective proof. The approved product
and redesign remain authoritative; this policy never authorizes implementation by itself.

## Implementation authorization and candidate identity

An explicit current request from Arye Kogan or a named delegate to implement a named phase or story
is sufficient implementation authorization. Delivery does not require a separate delivery-package
qualification, delivery-surface digest approval, external activation issue, or landed-commit
equivalence record.

Authorization incorporates the current product/design corpus, `track.json`, and story contract. It
does not authorize a new product/design choice, dependency edge, provider, effect path, consumer
surface, or realization outside an existing bounded `DR-*` delegation. Routine documentation,
tooling, test, formatting, or Git-byte drift does not revoke authorization. Material drift in
product/design authority, tracked scope or dependencies, selected realization, or provider
reachability requires fresh explicit direction.

Ordinary Git facts identify the exact implementation candidate. For review, record the phase/story
scope, base commit/tree, candidate commit/tree, predecessor containment, applicable required checks,
and reviewer verdict in the external phase ledger.

## Mandatory delivery rules

1. Implement only a story covered by an explicit current owner or named-delegate request whose
   [mandatory contract](./story-contract.md#mandatory-greenfield-story-contract), including
   Definition of Ready, is satisfied. Record the authorized phase/story scope and explicit
   constraints in the external phase ledger when delivery begins; no durable external approval URL
   is required. Its declared predecessors must have verified landing evidence contained in the
   observed implementation-candidate base. Verify current product/design/track authority,
   predecessor containment, and any selected bounded `DR-*` realization at readiness.
2. Treat the product and approved redesign as authority. `track.json` owns the exact story set,
   phases, declared dependencies, edge types, and gates. The delivery track may select only an
   explicitly delegated `DR-*` realization choice, record its owner/constraints/evidence/fallback,
   and stop for `OWNER_DECISION_REQUIRED` outside that grant. No coordinator, skill, handoff, or
   live ledger may author or infer a dependency edge.
3. Keep each story candidate to one cohesive semantic and authority subject. Use only split stories
   already declared by `track.json`; do not invent `<ID>a`/`<ID>b` stories or edges during
   delivery. Approved story subjects aggregate on one phase integration branch and one final phase
   PR. A brief may describe internal implementation slices only within the same tracked story,
   worktree, branch, continuous pair, candidate review, and integration result; such a slice never
   becomes a story ID, tracker edge, separate delivery subject, or PR. A first semantic half stays
   useful and green but unconfigurable until its declared provider successor qualifies.
4. No adapter, provider, or effect path is reachable before its semantic contract, manifest, exact
   qualification gate/evidence, and gate evaluator pass. This applies to all eight mandatory
   splits: GF-019→020, GF-010→025, GF-013→026, GF-033→039, GF-042→047, GF-034→060,
   GF-041→057, and GF-044→061. Scripted fixtures may exercise contracts but must not make a real
   provider configurable. GF-041→057 review publication and GF-044→061 final delivery share
   `PORT-DELIVERY`/`CF-MECH-DELIVERY` only; their credentials, Operations, authority subjects,
   qualification evidence, and reachability gates remain disjoint.
   The owner-selected `development-semantic-only` posture is not a provider exception: it may use
   only the scripted semantic source/ledger/witness/artifact surfaces, must expose
   `providerEnabled: false` and `dispatchEnabled: false`, and must declare
   `fail-closed-no-autonomous-restore`. Its reviewed GF-023/GF-024 result may satisfy GF-030's
   implementation dependency while GF-020/GF-025/GF-026 qualify independently. It cannot satisfy a
   provider story, full Phase 2 closure, real intake, autonomous restore, or supported-profile claim.
5. Record operation intent before dispatch. Applicable runtime failures use cataloged typed `FC-*`
   failure classes; non-runtime failures remain typed under their bounded story contract. For an
   uncertain external effect, reconcile using its stable identity. Same-identity retry is
   effectful-only after confirmed absence and recorded reauthorization; an effect-free replacement
   uses a new Operation identity. Otherwise park, preserve the resource, and surface uncertainty.
6. Validate every boundary input. Missing, malformed, stale, oversized, cross-scope, ambiguous,
   self-reported, or unverifiable values fail closed. Provider output and evidence never widen
   authority.
7. Credentials are named configuration references resolved only in memory. Secrets must not enter
   ledger records, evidence, logs, exports, fixtures, or reviewer packets; redaction and hostile
   input limits apply at every port.
8. Timers wake work but never decide it. Durable facts decide retry, recovery, resume, settlement,
   release, and cleanup. Every wait has a named finite `BND-*` outcome.
9. Acceptance, landing, product outcome, and retirement are separate. Only authoritative target
   proof makes `Landed` and releases dependents; cleanup cannot change business outcome or release.
10. A passing local check is evidence, not approval. The implementation owner commits the
    candidate, then runs every required local proof, repository check, and direct validator against
    that exact committed candidate in its registered story worktree. Before each locally recorded
    check, record a minimal environment variable-name allowlist and execute with only those
    variables. The default allowlist excludes token-, secret-, credential-, auth-, and key-bearing
    variables; record names and non-secret fingerprints where required, never values. A check that
    requires an authorized sandbox credential receives only its named least-privilege reference
    through the owning provider boundary, with redaction and secret-absence proof; it never inherits
    an ambient implementer shell credential. Here and throughout the delivery track, "applicable
    required checks" means every required command or check class whose subject may have changed.
    `pnpm check:affected` is optional local feedback only; it never satisfies the full `pnpm check`
    repository gate required for a changed candidate or integration branch. Hosted CI independently
    executes its required checks.
    The coordinator verifies orchestration facts and evidence bindings. Every implementation
    candidate needs independent review under the reviewer packet. At candidate freeze, record the
    current 67-file normative-corpus comparison and exact committed-candidate evidence in the
    external ledger or reviewer record; the independent reviewer verifies them read-only.
11. Every local delivery, implementation, verification, review, and recovery workspace is a
    registered Git worktree. For each candidate, the external ledger records: story ID; registered
    story worktree path/branch; phase integration ref and resolved base commit/tree; candidate
    commit/tree; merge-base and declared-predecessor containment; owned paths; required check
    command/set, result, timestamp, durable log/reference, and sanitized environment-name allowlist;
    tracked/untracked clean status plus the exact
    `git ls-files --others --ignored --exclude-standard` inventory before checks and after review;
    the ignored-state allowlist decision; continuous implementer and independent reviewer
    identities; findings/verdict/timestamp bound to the exact candidate; and integration
    result/commit. Allowed ignored state is limited to repository-declared dependency trees with
    frozen-lockfile and workspace-link-containment proof, and generated/cache outputs either
    regenerated by the recorded check or content-keyed to the exact candidate. `.env` or credential
    files, external workspace links, unexplained generated outputs, and unlisted residue invalidate
    the evidence. The reviewer inspects that same frozen worktree read-only. No local fresh or
    detached clone is a delivery, check, review, or recovery workspace. Provider-managed hosted-CI
    checkout is the sole workspace exception and cannot replace local evidence or review.
12. The independent reviewer is read-only and performs semantic and evidence review only. The
    reviewer may read files and inspect exact commits, trees, diffs, manifests, logs, hosted check
    results, and evidence with read-only operations such as `git show`, `git diff`, `rg`, and `sed`.
    The reviewer must not execute `pnpm` tests/checks/builds, direct validators, formatters,
    installers, evidence writers, or GitHub/repository mutations. Missing, stale, contradictory, or
    incorrectly bound verification evidence is a finding; the reviewer must not repair it by
    rerunning a check. This preserves independent semantic authority and does not weaken required
    review or hosted CI.
13. Every correction loop searches sibling occurrences of the same defect across the exact
    manifest, briefs, inventories, routes, source, tests, and evidence before reporting it fixed.
14. A post-edit re-review always freezes a new committed candidate: any edit to candidate source,
    configuration, pre-acceptance evidence, metadata, review package, selected verification
    posture, policy-selected required check-class set, verification configuration/environment,
    target base, or subject binding invalidates the prior candidate verdict. The same continuous
    implementer commits the correction and reruns every applicable required check; the same continuous
    independent reviewer incrementally rechecks the prior-reviewed-to-new range, sibling
    occurrences, affected invariants, and the new evidence binding. Conclusions may carry forward
    only for unchanged paths and unaffected invariants. The sole continuation case is the
    authorized recording after `Accepted` of final-verification observations already required by
    the unchanged reviewed candidate, posture, check-class set, configuration/environment, and
    binding. Those observations do not by themselves reopen review.
15. Freeze one exact implementation-candidate binding for review: authorized phase/story scope and
    constraints; observed base ref/commit/tree; candidate commit/tree; merge-base equality;
    predecessor containment; current normative-corpus comparison; owned path set; worktree
    identity; and exact check evidence. The independent verdict binds only that candidate. A
    changed candidate or target requires the check and incremental re-review loop in Rule 14.
    Integration and final phase landing remain separate facts proven by ordinary Git ancestry,
    hosted checks, and the final phase review.
16. Under D15, the recorded transition into `Reviewing` and only its fenced `OPC-REV-*`
    draft/non-mergeable review-publication Operations may occur before independent review or
    acceptance. They are not approval, acceptance, finalization, landing, or dependency release.
    Hosted CI may run before review. Bind the selected final-verification posture to the immutable
    candidate. After `Accepted`, record the selected verification intent on the authorized
    `Waiting` → `Finalizing` or retained-authority `Accepted` → `Finalizing` transition. The
    `deterministic` posture authorizes `OPC-VERIFY-EXECUTE`; every policy-selected required check
    class must produce a passing, subject-matching `EV-CHECK-OBSERVATION`, and the complete required
    set must be satisfied inside `Finalizing` before any target-changing `OPC-DEL-*`, merge,
    delivery, landing, or other target-changing Operation. The `none` posture is an explicit no-op
    and authorizes no verification Operation. Post-`Accepted` observations are authorized
    continuation evidence only while the reviewed candidate, posture, required class set,
    configuration/environment, and subject binding remain unchanged; drift requires every
    applicable required check and incremental review by the same reviewer.
17. The local validator proves governing-source projection, delivery-surface consistency, and
    corpus integrity only; it does not approve implementation, authorize a phase, or semantically
    approve plan-authored outcomes or prose. Its unpinned delivery-surface digest is informational
    integrity evidence. Never pin or copy an expected delivery-surface digest into `track.json`,
    validator constants, fixtures, or candidate-authored review prose. The 67-file normative digest
    remains separate corpus-drift evidence.
18. Keep delivery-process state out of repository source, tests, fixtures, and CI configuration.
    Within those places, do not commit live process provenance or review state—commit SHAs, tree
    hashes, candidate or story branch refs, worktree paths, PR or issue URLs, reviewer identities,
    verdicts, approval records, or delivery-surface digests—and do not use a story ID as an
    identifier in a source, test, fixture, or script file or directory name. Canonical story files under
    `docs/delivery/greenfield/stories/` and ordinary CI branch triggers are unaffected. Tests remain
    named and organized by package or behavior; oracle fixtures remain named for the oracle; one
    generic evidence writer may accept a story ID as a CI-time argument and write workflow-uploaded
    artifacts. Provenance facts are verified when asserted; pinning them in source would fail on
    ordinary integration and squash landing.

The former custom candidate sealer, external seal envelope, detached-clone verification, and
resealing gate are superseded. Historical seals remain historical evidence but are neither
required nor sufficient for new or in-flight candidates. An in-flight candidate migrates only when
its exact commit, base, required checks, and reviewer verdict can be reconstructed in the external
ledger; otherwise it receives current checks and review. No external pull request is a prerequisite
solely because it carried sealer hardening.

The former delivery-package qualification and separately hosted activation-artifact gate is also
superseded. Historical qualification or activation artifacts remain historical evidence only. In
particular, PR #112 is not a prerequisite under this policy, and no hosted-state action is required
solely to perform this transition. In-flight work migrates by recording the explicit current
implementation request, scope and constraints, exact candidate/base, required checks, and reviewer
verdict in the operational ledger.

## Required evidence ladder

Every story names proportionate proof from this ladder: unit and schema tests; contract tests across
real validation boundaries; adversarial and negative authority probes; deterministic replay,
crash, fault, timeout, and reconciliation probes; provider qualification; E2E product outcome; and
the applicable `CF-*` suite/catalog entry. Evidence is exact-subject-bound and includes build,
manifest, environment, suite, probe, and output digests.

## Delivery lifecycle

1. Keep immutable planning/authority provenance and complete the story contract.
2. Confirm that an explicit current owner or named-delegate request names the phase/story scope and
   that the contract's readiness and any bounded `DR-*` selection are current.
3. Record the authorized scope and constraints, then-current phase integration base ref/commit/tree,
   declared-predecessor containment, and current 67-file normative-corpus comparison in the
   external operational ledger.
4. Register the phase integration branch/worktree and continuous story pair/worktree in the
   external ledger. Implement the smallest closed subject; retain fail-closed adapters until
   qualified.
5. Complete edits and commit the story candidate. Record its exact commit/tree, worktree path and
   branch, integration base ref/commit/tree, merge-base, predecessor containment, and clean status.
6. The implementation owner runs every required local proof, repository check, and direct
   validator against that committed candidate in its registered story worktree and records exact
   commands/set, timestamps, results, durable logs, `git diff --check` where applicable, and final
   unchanged-`HEAD`/tree/clean status. Hosted CI independently supplies its required execution
   evidence. The coordinator checks bindings and orchestration facts; it does not substitute for
   the implementation owner or reviewer.
7. Under D15, record the transition into `Reviewing` and publish only the fenced `OPC-REV-*`
   draft/non-mergeable review subject as needed for hosted CI or review. Freeze the registered
   story worktree and supply the committed-candidate ledger evidence for the continuous independent
   reviewer. Target movement or any candidate/binding change requires a new commit, every applicable
   required check, and incremental review by the same reviewer.
8. Resolve findings through the same continuous pair. The implementation owner corrects and
   commits; the reviewer rechecks the prior-reviewed-to-new range, sibling occurrences, affected
   invariants, and new evidence until `PASS` or an owner stop. After `Accepted`, enter `Finalizing`
   through the authorized transition and satisfy the selected verification posture exactly as Rule
   16 requires before integration.
9. Integrate only the approved story commit by fast-forward or no-fast-forward merge preserving it
   as an ancestor. A content conflict returns to the same pair; the coordinator does not resolve it
   on the integration branch. Record the integration commit and keep the story worktree/branch/pair
   quiescent through final phase-PR feedback.
10. At each terminal story boundary, recompute the ready set from `track.json`, the external ledger,
    and current integration branch. Launch all declared-ready stories within distinct pair/worktree
    capacity and any applicable temporary overlap guard; a blocked story blocks only descendants.
11. After every required phase story integrates, run required integration checks, obtain
    independent read-only closure review, and open one normal hosted-CI-backed phase PR to `main`.
    Route attributable findings to the owning continuous pair. Any final-branch change requires
    refreshed checks and closure review.
12. Remove phase/story worktrees and branches only after confirmed landing and explicit cleanup
    scope/keep-list. Recovery follows the worktree-only rules in
    [phase orchestration](./phase-orchestration.md); missing or irreconcilable facts stop
    the affected story and its descendants until reconciled, while independent ready stories
    continue. Use `OWNER_DECISION_REQUIRED` only when recovery requires a material authority,
    scope, dependency, realization, provider-reachability, or accepted-trade-off decision.

## Explicit non-goals

This policy does not authorize archive implementation, automatic authority widening, unbounded
retries, partial provider configuration, self-review, public stability promises, a dependency
scheduler service, invented tracker edges, a fresh-clone recovery path, or a claim that this
documentation candidate is the final implementation subject.
