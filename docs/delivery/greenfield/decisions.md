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
explicit current owner or named-delegate implementation request selects it; the owner label alone
is not evidence that the proposed selection is already selected or active.

| Choice | Owner / earliest story                                                                 | Fixed constraints                                                                                                                                                                                   | Alternatives and required evidence                                                                 | Fail-closed fallback                                 | Blocks                          |
| ------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------- |
| DR-1   | Engineering / GF-002                                                                   | D12/D16 validation and conformance constraints apply; proposed strict versioned JSON requires explicit selection.                                                                                   | Encoding work may vary only behind golden vectors and fuzz/property proof.                         | Reject the encoding.                                 | Every port and store.           |
| DR-2   | Engineering / GF-001, GF-003                                                           | D10 dependency/runtime seams retain authority; proposed private pnpm topology requires explicit selection.                                                                                          | A smaller private topology is allowed only with graph/static proof and independent-build evidence. | Smallest topology preserving the authority boundary. | GF-005 onward.                  |
| DR-3   | Engineering / GF-005                                                                   | Pure immutable reducer/selectors and explicit tables; unimplemented transitions reject.                                                                                                             | Internal organization may vary below replay/permutation proof.                                     | Reject incomplete transitions.                       | Control stories.                |
| DR-4   | Engineering + configuration / GF-003, then each port                                   | Typed semantic ports are in-process; transport is only at a mechanism edge.                                                                                                                         | A provider follows its port contract and its exact mechanism conformance proof.                    | Provider remains unavailable.                        | Every port/provider descendant. |
| DR-5   | Configuration / GF-022, GF-020, GF-025, GF-026, GF-039, GF-047, GF-057, GF-060, GF-061 | Providers remain unavailable until explicit selection and exact proof; the listed initial tuple is proposed below.                                                                                  | Other provider modes need their own exact provider gate; omission never waives proof.              | Provider remains unconfigurable.                     | Supported profile and GF-062.   |
| DR-6   | Engineering / GF-010, GF-013                                                           | D11 file stores, genuinely independent witness, protected/disposable separation, `FC-TRUST` stop.                                                                                                   | Representation may vary only below the semantic storage contract and readback/witness probes.      | Deliberate stop; no autonomous restore.              | Recovery and intake.            |
| DR-7   | Engineering / GF-054                                                                   | D10 private-facade/no-public-stability constraints apply; proposed TypeScript SDK, CLI, and stdio MCP remain unavailable until explicitly selected and their qualification/reachability gates pass. | Surface mechanics may vary only with consumer parity evidence.                                     | No surface instead of a widened one.                 | GF-055, GF-056, GF-062.         |
| DR-8   | Engineering / GF-004                                                                   | Deterministic private testkit, adversarial/property/fault fixtures, exact CER.                                                                                                                      | Harness internals may vary below recorded suite semantics.                                         | No evidence claim.                                   | Every suite claim.              |
| DR-9   | Configuration/policy / GF-021, GF-031, GF-032                                          | A validated profile is immutable once enabled; out-of-range fails preflight.                                                                                                                        | Tuning is allowed only inside declared ranges and must pass boundary probes.                       | Preflight reject.                                    | Intake and scheduling.          |
| DR-12  | Engineering + configuration / GF-019, GF-020, GF-052                                   | Validated Work Source exchange and notice content/urgency derivation; proposed terminal/file notice is a presentation channel, not a provider.                                                      | Work Source varies below `PORT-SOURCE`; notice varies below its durable presentation contract.     | Reject source or retain undelivered notice.          | Intake and operator profile.    |

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

## Proposed delivery defaults — selectable only by explicit direction

The following are proposed delivery defaults, retained to make the intended first realization
reviewable. This corpus does not select them. An explicit current request from Arye Kogan or a
named delegate may select a bounded default for a named phase/story; otherwise it remains
unavailable:

- private modular Node/TypeScript/pnpm/Turbo tooling;
- strict versioned JSON as an initial durable/public framing;
- structured-file source, file storage, local Git workspace, local verifier, Codex sessions, and
  disjoint GitHub review-publication and GitHub final-delivery providers with disjoint credentials
  as the proposed initial provider/profile tuple;
- terminal/file notice as the proposed DR-12 presentation channel, subject to its notice and
  block-surfacing proof rather than `CF-GATE-PROVIDER`; and
- a private CLI and private MCP as proposed first-party consumer surfaces, with unsupported modes
  remaining unconfigurable.

### Implementation authorization

An explicit current request from Arye Kogan or a named delegate to implement a named phase or story
is sufficient implementation authorization. It may select only bounded defaults and `DR-*` choices
that the request explicitly names or that the named phase/story's current product/design/track
authority deterministically binds. The external phase ledger must enumerate every selected choice,
the authorizing request, and any deterministic authoritative binding; never infer a choice merely
because implementation appears to require it. A missing or conflicting material selection is
`OWNER_DECISION_REQUIRED`. Delivery does not require a separate delivery-package qualification,
delivery-surface digest approval, external approval issue, or landed-commit equivalence record.

The external phase ledger records the authorized scope and explicit constraints once delivery
begins. It also records current product/design/track provenance, the selected bounded realization,
worktrees, committed candidates, checks, reviewer verdicts, and integration results. The ledger is
operational evidence, not an approval gate, and no durable URL is required merely to begin work.

An implementation request does not enable a provider, effect path, consumer surface, or authority
topology unless the request explicitly selects it and every existing semantic, manifest,
qualification, and reachability gate passes. Engineering and Configuration retain only their
recorded bounded delegation. Missing or conflicting product/design authority, an unbounded
realization choice, provider reachability ambiguity, or a material scope/dependency change yields
`OWNER_DECISION_REQUIRED`. Routine documentation, tooling, tests, formatting, or Git-byte drift
does not revoke authorization.

## Owner-selected Phase 3 development posture

Arye's explicit 2026-07-31 instruction selects a semantic-only development posture so lifecycle
implementation is not blocked on host provisioning. GF-023 may preview and record its two distinct
exact approvals against a development manifest only when that manifest fixes
`providerEnabled: false`, `dispatchEnabled: false`, and `fail-closed-no-autonomous-restore`.
GF-024 may then use only the scripted semantic ledger/witness to prove witnessed accepted/rejected
intake, replay, contention, and no Run on rejection. This is implementation evidence, not provider
qualification, provider selection, autonomous-recovery evidence, or a supported-profile claim.

After the local file ledger realization is explicitly selected, GF-025 may separately qualify its
ledger, registry, and independently trusted witness through `PORT-LEDGER` and `CF-MECH-LEDGER`;
GF-026 may qualify the local file artifact provider through `PORT-ARTIFACT` and
`CF-MECH-ARTIFACT`; GF-020 qualifies the structured-file source. A real intake must recompose the
preview and refresh both exact approvals against those current provider gates. Implementation
authorization never makes an unqualified provider reachable or waives a provider gate.
