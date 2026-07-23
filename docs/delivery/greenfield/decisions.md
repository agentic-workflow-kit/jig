---
title: "Jig greenfield delivery — delegated-choice schedule"
purpose: "Expose every legitimate implementation choice with its fixed boundary, evidence, fallback, and blocking effect."
audience: ["Jig owner", "delivery implementers", "independent reviewers"]
status: "planning baseline; no implementation authorized"
owner: "Arye Kogan"
---

# Delegated-choice schedule

This schedule faithfully records the active delegation register. It does not reopen a design
decision or create a new product promise. The machine-readable source is
[track.json](./track.json); product and redesign documents remain authoritative. An owner label in
this schedule identifies the principal allowed to make and record a bounded selection after the
required external activation; it is not evidence that the proposed selection is already approved
or active.

| Choice | Owner / earliest story                                                                 | Fixed constraints                                                                                                                              | Alternatives and required evidence                                                                 | Fail-closed fallback                                 | Blocks                          |
| ------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------- |
| DR-1   | Engineering / GF-002                                                                   | D12/D16 validation and conformance constraints apply; proposed strict versioned JSON awaits activation.                                        | Encoding work may vary only behind golden vectors and fuzz/property proof.                         | Reject the encoding.                                 | Every port and store.           |
| DR-2   | Engineering / GF-001, GF-003                                                           | D10 dependency/runtime seams retain authority; proposed private pnpm topology awaits activation.                                               | A smaller private topology is allowed only with graph/static proof and independent-build evidence. | Smallest topology preserving the authority boundary. | GF-005 onward.                  |
| DR-3   | Engineering / GF-005                                                                   | Pure immutable reducer/selectors and explicit tables; unimplemented transitions reject.                                                        | Internal organization may vary below replay/permutation proof.                                     | Reject incomplete transitions.                       | Control stories.                |
| DR-4   | Engineering + configuration / GF-003, then each port                                   | Typed semantic ports are in-process; transport is only at a mechanism edge.                                                                    | A provider follows its port contract and its exact mechanism conformance proof.                    | Provider remains unavailable.                        | Every port/provider descendant. |
| DR-5   | Configuration / GF-022, GF-020, GF-025, GF-026, GF-039, GF-047, GF-057, GF-060, GF-061 | Providers remain unavailable until activation and exact proof; the listed initial tuple is proposed below.                                     | Other provider modes need their own exact provider gate; omission never waives proof.              | Provider remains unconfigurable.                     | Supported profile and GF-062.   |
| DR-6   | Engineering / GF-010, GF-013                                                           | D11 file stores, genuinely independent witness, protected/disposable separation, `FC-TRUST` stop.                                              | Representation may vary only below the semantic storage contract and readback/witness probes.      | Deliberate stop; no autonomous restore.              | Recovery and intake.            |
| DR-7   | Engineering / GF-054                                                                   | D10 private-facade/no-public-stability constraints apply; proposed TypeScript SDK, CLI, and stdio MCP await activation.                        | Surface mechanics may vary only with consumer parity evidence.                                     | No surface instead of a widened one.                 | GF-055, GF-056, GF-062.         |
| DR-8   | Engineering / GF-004                                                                   | Deterministic private testkit, adversarial/property/fault fixtures, exact CER.                                                                 | Harness internals may vary below recorded suite semantics.                                         | No evidence claim.                                   | Every suite claim.              |
| DR-9   | Configuration/policy / GF-021, GF-031, GF-032                                          | A validated profile is immutable once activated; out-of-range fails preflight.                                                                 | Tuning is allowed only inside declared ranges and must pass boundary probes.                       | Preflight reject.                                    | Intake and scheduling.          |
| DR-12  | Engineering + configuration / GF-019, GF-020, GF-052                                   | Validated Work Source exchange and notice content/urgency derivation; proposed terminal/file notice is a presentation channel, not a provider. | Work Source varies below `PORT-SOURCE`; notice varies below its durable presentation contract.     | Reject source or retain undelivered notice.          | Intake and operator profile.    |

## Closed remediation constraints

`DR-10` and `DR-11` are not open choices and must never appear as implementation decisions.

| Record | Closed constraint                                                                      | Enforcement                                                                                      |
| ------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| DR-10  | Provider real limits map into declared hard resource capacity; policy may only narrow. | Misdeclaration is a bounded mechanism fault, never silent guarantee overrun.                     |
| DR-11  | The non-gating Operation vocabulary is owner-frozen and fail-closed by default.        | Acceptance, evidence integrity, authority, landing, and preservation paths are never non-gating. |

## Design-imposed constraints

The active design, not this delivery schedule, fixes the following boundaries:

- D10 requires the modular single-authority runtime, named ports, and retained controller
  authority, while expressly deferring package/module layout, per-port transport and encoding, and
  provider registration mechanics.
- D12 requires capability-scoped, attested, conformance-gated mechanisms and keeps a provider
  unreachable until its exact current proof is admitted; it expressly defers wire formats, token
  mechanics, and per-provider sandbox implementation.
- D16 preserves those delegations: physical representation, wire encoding, package decomposition,
  and provider implementation may be realized only within this register's bounds.
- D11 fixes the conditional-append ledger contract and its single-host append-only file reference
  realization as owner-approved design authority; only segment sizing, batching, and directory
  layout remain deferred. The witness must remain an independently trusted fail-closed root.

Those constraints are authority. They do not themselves approve a Node/TypeScript toolchain, a
JSON codec, a provider/profile tuple, or a first implementation PR.

## Proposed delivery defaults — inactive pending owner ratification

The following are proposed delivery defaults, retained to make the intended first realization
reviewable. They are **not** recorded as owner-approved selections in this corpus and must not be
treated as activated implementation direction:

- private modular Node/TypeScript/pnpm/Turbo tooling;
- strict versioned JSON as an initial durable/public framing;
- structured-file source, file storage, local Git workspace, local verifier, Codex sessions, and
  disjoint GitHub review-publication and GitHub final-delivery providers with disjoint credentials
  as the proposed initial provider/profile tuple;
- terminal/file notice as the proposed DR-12 presentation channel, subject to its notice and
  block-surfacing proof rather than `CF-GATE-PROVIDER`; and
- a private CLI and private MCP as proposed first-party consumer surfaces, with unsupported modes
  remaining unconfigurable.

### External owner-ratification and activation prerequisite

Before GF-001, or any dependent realization, starts, an **external owner-ratification/activation
record** must exist. This delivery-package PR, its review, a story, a local check, or an asserted
plan selection is not that record and authorizes no implementation.

The record must be independently retrievable and bind all of the following exact evidence:

1. the authenticated owner or explicitly named delegated decision principal, decision timestamp,
   durable record identifier/URL, and an explicit authorization to activate implementation rather
   than merely review planning. A delegated principal also requires independently verifiable
   evidence of its delegation, scope, and current validity;
2. approved delivery package `P = Q + durable R identifier + PASS`, where delivery-package candidate identity `Q` is the
   exact candidate commit/tree to be reviewed; exact package-only path set; each path's bytes/type/mode; and
   aggregate computed unpinned digest, and external review record `R` records: protocol; reviewer
   identity/independence; exact `Q`; checked scope; checks/evidence; findings; verdict; and a durable
   external record identifier. The record also binds the immutable planning/authority provenance
   against which `Q` was checked and the target base ref or scope the activation permits. If squash
   landing gives a different OID, the record must cite the authoritative landing-equivalence
   record binding approved `P` (and therefore exact `Q`) to the target ref and landed commit/tree
   and proving full-tree equality or complete `Q` path-set byte/type/mode equality reproducing
   `Q`'s digest. Each story still resolves and records that ref's current commit/tree in its own
   execution tuple;
3. the selected realization tuple: toolchain/workspace posture, framing/wire choice, D11's delegated
   segment-sizing/batching/directory-layout parameters, first-party consumer surfaces, and every
   provider/profile scope to be enabled; the record binds but does not reselect D11's
   owner-approved file reference realization;
4. the governing D10/D11/D12/D16 constraints, the applicable `DR-*` choices, exclusions, and
   fail-closed provider qualification requirements; and
5. the activation scope and expiry/revocation rule, including whether it authorizes GF-001 only or
   named dependent stories. A change to any bound value requires a new exact record.

An implementer or reviewer must verify the record's identity, integrity, current validity, and
exact binding before treating a proposed default as selected. Missing, stale, ambiguous,
unverifiable, differently bound, or out-of-scope evidence yields `OWNER_DECISION_REQUIRED`; it
does not grant Engineering or Configuration a substitute selection authority.

Once activated, GF-025 may qualify the selected local file ledger, registry, and independently
trusted witness through `PORT-LEDGER` and `CF-MECH-LEDGER`; GF-026 may separately qualify the local
file artifact provider through `PORT-ARTIFACT` and `CF-MECH-ARTIFACT`. GF-023 must consume both
exact provider gates before proposal approval can select a store. Activation never waives those
semantic or provider gates.
