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

## Canonical delivery-package identities

- Delivery-package candidate identity `Q` is the exact candidate commit/tree to be reviewed; exact
  package-only path set; each path's bytes/type/mode; and aggregate computed unpinned digest.
- External review record `R` records: protocol; reviewer identity/independence; exact `Q`; checked
  scope; checks/evidence; findings; verdict; and a durable external record identifier. The
  coordinator supplies `Q` and available checks/evidence separately; neither `PASS` nor `R` is a
  field of pre-verdict `Q`.
- Only an `R` whose verdict is `PASS` creates approved delivery package
  `P = Q + durable R identifier + PASS`.

Ordinary Git facts identify an implementation candidate; they never mint or replace `Q`, `R`, or
`P`, grant activation, or substitute for product/design authority.

## Mandatory delivery rules

1. Implement only a story whose [mandatory contract](./story-contract.md#mandatory-greenfield-story-contract),
   including Definition of Ready, is satisfied, whose exact external owner-ratification/activation
   record is recorded and independently verified: authenticated owner or explicitly named delegated
   principal with independently verifiable delegation and current validity; durable record ID/URL;
   approved package `P` and immutable planning/authority provenance; any required external
   authoritative landing-equivalence record; activation target scope; selected realization tuple;
   and expiry/revocation. Generic authorization cannot pass. Its declared predecessors must have
   verified landing evidence contained in the observed implementation-candidate base. Record that
   provenance in the external durable activation record, reviewer packet, or phase ledger, and
   verify it at readiness.
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
    an ambient implementer shell credential. Hosted CI independently executes its required checks.
    The coordinator verifies orchestration facts and evidence bindings. Every implementation
    candidate needs independent review under the reviewer packet; that protocol reviews the
    story-owned source, configuration, tests, and evidence paths, not a fresh delivery-package
    corpus review or digest computation. At candidate freeze, record approved `P`, the current
    67-file normative-corpus comparison, and exact committed-candidate evidence in the external
    ledger or reviewer record; the independent reviewer verifies them read-only.
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
    implementer commits the correction and reruns affected required checks; the same continuous
    independent reviewer incrementally rechecks the prior-reviewed-to-new range, sibling
    occurrences, affected invariants, and the new evidence binding. Conclusions may carry forward
    only for unchanged paths and unaffected invariants. The sole continuation case is the
    authorized recording after `Accepted` of final-verification observations already required by
    the unchanged reviewed candidate, posture, check-class set, configuration/environment, and
    binding. Those observations do not by themselves reopen review.
15. Keep the two review protocols distinct. For delivery-package review, the coordinator freezes
    pre-verdict `Q` and supplies checks/evidence separately. An independent reviewer verifies the
    manifest's full package corpus and writes external `R`; only `PASS` creates `P`. An
    implementation-candidate review freezes one story binding: observed base ref/commit/tree,
    candidate commit/tree, merge-base equality, predecessor containment, approved `P`, current
    normative-corpus comparison, owned path set, worktree identity, and exact check evidence. Its
    verdict binds only that implementation candidate; it never mints or redefines `P`. A
    squash-produced landed commit may have a different OID without fresh package review only when
    an external authoritative landing-equivalence record binds approved `P` and its exact `Q` to
    the target ref and landed commit/tree and proves full-tree equality or complete `Q` path-set
    byte/type/mode equality reproducing `Q`'s aggregate digest. That record does not make the landed
    commit reviewed. Missing, ambiguous, or drifting add/remove/rename/mode/byte evidence requires
    a new `Q`, `R`, and `P`; the 67-file normative-corpus comparison remains separate.
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
    configuration/environment, and subject binding remain unchanged; drift requires affected
    checks and incremental review by the same reviewer. The exact external
    owner-ratification/activation record remains required and cannot be inferred from publication,
    CI, or a reviewer verdict.
17. The local validator proves governing-source projection, package consistency, and corpus
    integrity only; it does not semantically approve plan-authored outcomes or prose. For a
    delivery-package subject, the coordinator records immutable pre-verdict `Q` outside the
    candidate and supplies checks/evidence separately; the independent reviewer records external
    `R`, and only `PASS` creates `P`. Never pin or copy an expected package digest into
    `track.json`, validator constants, fixtures, or candidate-authored review prose. Any package
    byte or path-set change invalidates `Q` and requires fresh package review; the 67-file
    normative digest is corpus-drift evidence only.
18. Keep delivery-process state out of repository source, tests, fixtures, and CI configuration.
    Within those places, do not commit live process provenance or review state—commit SHAs, tree
    hashes, candidate or story branch refs, worktree paths, PR or issue URLs, reviewer identities,
    verdicts, approval records, or package digests—and do not use a story ID as an identifier in a
    source, test, fixture, or script file or directory name. Canonical story files under
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

## Required evidence ladder

Every story names proportionate proof from this ladder: unit and schema tests; contract tests across
real validation boundaries; adversarial and negative authority probes; deterministic replay,
crash, fault, timeout, and reconciliation probes; provider qualification; E2E product outcome; and
the applicable `CF-*` suite/catalog entry. Evidence is exact-subject-bound and includes build,
manifest, environment, suite, probe, and output digests.

## Delivery lifecycle

1. Keep immutable planning/authority provenance and complete the story contract.
2. Independently review the contract's readiness and `DR-*` selection.
3. Record and independently verify the exact external owner-ratification/activation record,
   approved `P`, any required authoritative landing-equivalence record, the then-current phase
   integration base ref/commit/tree, declared-predecessor containment, and a clean current 67-file
   normative-corpus comparison against immutable authority provenance.
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
   reviewer. Target movement or any candidate/binding change requires a new commit, affected checks,
   and incremental review by the same reviewer. A changed delivery-package `Q` first requires new
   external `R` and approved `P`.
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
    `OWNER_DECISION_REQUIRED`.

## Explicit non-goals

This policy does not authorize archive implementation, automatic authority widening, unbounded
retries, partial provider configuration, self-review, public stability promises, a dependency
scheduler service, invented tracker edges, a fresh-clone recovery path, or a claim that this
documentation candidate is the final implementation subject.
