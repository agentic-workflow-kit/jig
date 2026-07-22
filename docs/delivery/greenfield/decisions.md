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
[track.json](./track.json); product and redesign documents remain authoritative.

| Choice | Owner / earliest story                                         | Fixed constraints                                                                                                                                   | Alternatives and required evidence                                                                 | Fail-closed fallback                                 | Blocks                          |
| ------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------- |
| DR-1   | Engineering / GF-002                                           | Strict versioned JSON, deterministic canonical bytes, runtime validation.                                                                           | Encoding work may vary only behind golden vectors and fuzz/property proof.                         | Reject the encoding.                                 | Every port and store.           |
| DR-2   | Engineering / GF-001, GF-003                                   | Private pnpm packages follow dependency/runtime seams without moved authority.                                                                      | A smaller private topology is allowed only with graph/static proof and independent-build evidence. | Smallest topology preserving the authority boundary. | GF-005 onward.                  |
| DR-3   | Engineering / GF-005                                           | Pure immutable reducer/selectors and explicit tables; unimplemented transitions reject.                                                             | Internal organization may vary below replay/permutation proof.                                     | Reject incomplete transitions.                       | Control stories.                |
| DR-4   | Engineering + configuration / GF-003, then each port           | Typed semantic ports are in-process; transport is only at a mechanism edge.                                                                         | A provider follows its port contract and its `CF-MECH-*` proof.                                    | Provider remains unavailable.                        | Every port/provider descendant. |
| DR-5   | Configuration / GF-022, GF-020, GF-039, GF-047, GF-060, GF-061 | Initial profile is structured-file source, file stores, local Git workspace, local verifier, Codex sessions, GitHub delivery, terminal/file notice. | Other provider modes need their own exact provider gate; omission never waives proof.              | Provider remains unconfigurable.                     | Supported profile and GF-062.   |
| DR-6   | Engineering / GF-010, GF-013                                   | D11 file stores, genuinely independent witness, protected/disposable separation, `FC-TRUST` stop.                                                   | Representation may vary only below the semantic storage contract and readback/witness probes.      | Deliberate stop; no autonomous restore.              | Recovery and intake.            |
| DR-7   | Engineering / GF-054                                           | Private TypeScript SDK, thin CLI and stdio MCP, no direct internals/public stability promise.                                                       | Surface mechanics may vary only with consumer parity evidence.                                     | No surface instead of a widened one.                 | GF-055, GF-056, GF-062.         |
| DR-8   | Engineering / GF-004                                           | Deterministic private testkit, adversarial/property/fault fixtures, exact CER.                                                                      | Harness internals may vary below recorded suite semantics.                                         | No evidence claim.                                   | Every suite claim.              |
| DR-9   | Configuration + policy / GF-021, GF-031, GF-032                | Defaults/ranges are approved and immutable in a validated profile; out-of-range fails preflight.                                                    | Tuning is allowed only inside declared ranges and must pass boundary probes.                       | Preflight reject.                                    | Intake and scheduling.          |
| DR-12  | Engineering + configuration / GF-019, GF-020, GF-052           | Validated Work Source exchange and notice content/urgency derivation.                                                                               | Channel implementation may vary below the port contract.                                           | Reject source or retain undelivered notice.          | Intake and operator profile.    |

## Closed remediation constraints

`DR-10` and `DR-11` are not open choices and must never appear as implementation decisions.

| Record | Closed constraint                                                                    | Enforcement                                                                                      |
| ------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| DR-10  | Provider real limits map into declared hard `RC-*` capacity; policy may only narrow. | Misdeclaration is a bounded mechanism fault, never silent guarantee overrun.                     |
| DR-11  | The non-gating Operation vocabulary is owner-frozen and fail-closed by default.      | Acceptance, evidence integrity, authority, landing, and preservation paths are never non-gating. |

## Owner-approved initial realization posture

- Private modular Node/TypeScript/pnpm topology.
- Strict JSON as the initial public/durable framing.
- D11-style file stores with a genuinely independent witness trust root.
- Structured-file source, file storage, local Git workspace, local verifier, Codex sessions,
  GitHub delivery, and terminal/file notice.
- Unsupported provider modes remain unconfigurable.
- Both the CLI and private MCP are part of the initial private profile.

These are approved selections inside the schedule, not comparative-pattern overrides of Jig.
