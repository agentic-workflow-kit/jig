---
title: "D14 — Agent-provider permission boundary and Doorbell routing"
purpose: Record the owner-selected boundary between provider-native worker permissions, Jig lifecycle authority, and durable human interaction.
audience:
  - Arye Kogan, Jig product and architecture decision owner
  - Independent architecture reviewers
  - Engineers implementing Agent providers and the Doorbell
scope: Worker-session permission enforcement, provider-internal review, human-needed provider requests, Doorbell routing, and the deferred middleman responder; provider-specific mode names, UI, sandbox implementation, and a future automatic responder are excluded.
state: approved
status: owner-approved direction of 2026-07-16; lock pending exact-candidate review
owner: Arye Kogan
last_verified: 2026-07-16
sources_of_truth:
  - ../../../product/guarantees.md
  - ../invariants.md
  - ./D2-system-boundary.md
  - ./D3-responsibilities-trust-authority.md
  - ./D12-mechanism-contract-model.md
related:
  - ../runtime.md
  - ../mechanism-and-provider-contracts.md
  - ../operations-and-observability.md
  - ../product-guarantee-reconciliation.md
---

# D14 — Agent-provider permission boundary and Doorbell routing

## Status and owner decision

Arye Kogan selected this direction on 2026-07-16 while resolving the former SEC-2 readiness gap.
The decision also replaces the readiness candidate's Jig-side assisted-authority classifier because
that classifier duplicated the Agent provider's native permission loop.

## Context

An Agent provider such as Codex already launches a worker under a selected filesystem, command,
network, and approval posture. That session may allow actions directly, apply an internal automatic
reviewer, reject a request, or decide that a human permission or answer is needed. Treating every
worker tool action as a Jig Operation would create a second authorization engine around the first
and make Jig responsible for independently proving the provider's sandbox and egress behavior.

The locked authority model does not require that duplication. I3 makes Jig Control the sole
routine **lifecycle** authority; it does not make Jig the provider's command sandbox. Jig still
owns its own transitions and external Operations, while the Agent provider remains a scoped
mechanism trusted to perform role-session work. I2 likewise keeps Jig's end-to-end lifecycle,
acceptance, and delivery authority-and-proof boundary intact; selecting and recording the provider
posture defines the scoped `Perform` power already assigned to the Agent mechanism rather than
delegating a Jig lifecycle decision to it.

## Decision

1. **The owner selects a provider-native posture.** The Execution Envelope freezes the exact
   Agent provider identity, build, native permission-posture reference, declared filesystem and
   network semantics, approval mode, and whether the provider uses an internal automatic reviewer.
   Policy and repo floors may reject a posture before launch; the worker cannot change it.
2. **The provider owns runtime permission enforcement.** Actions allowed by the selected posture,
   provider-internal approval review, and provider-internal rejection stay inside the Agent
   session. Jig neither reclassifies them nor writes them as Jig lifecycle decisions. The Agent
   provider and its Execution Host are the trusted enforcement boundary; Jig does not independently
   prove a universal no-phone-home property.
3. **Human-needed requests use the Doorbell and answers follow durable request identity.** When the
   provider requires a human permission or the agent requires a human answer, it emits an
   attributable request through `PORT-SESSION`. Jig validates and durably parks it as `ID-PARK`,
   presents it through the Doorbell, receives the scoped answer through `PORT-DECIDE`, and returns
   that answer to the session currently bound to the originating `ID-PRINCIPAL` and assignment. The
   same resumable session is used where supported. After attested loss, a provenance-linked
   replacement binds the same principal; if the requesting context cannot be restored, Jig closes
   the original request with a named reason and issues a lineage-linked successor. No request is
   silently dropped. The provider enforces or consumes the answer; Jig does not perform the worker
   action.
4. **Provider-internal outcomes do not leak into Jig authority.** An internal approval is not a
   Jig authorization, an internal rejection is not a Story rejection, and neither can create a
   transition, evidence-sufficiency claim, acceptance verdict, or delivery authority. Only a
   human-needed request crosses the seam.
5. **Jig-owned authority is unchanged.** Policy changes, rule-surface approval, acceptance,
   publication, integration, merge, recovery, and all other Jig lifecycle or external-effect
   Operations remain under Jig Control, the existing owner-decision path, and their exact gates.
6. **A middleman responder is deferred.** V1 has no Jig-side agent that automatically approves
   provider permission requests or answers provider questions. The Doorbell protocol may support a
   future recorded delegate, but adding an automatic responder requires a new product decision,
   authority scope, safety policy, evidence contract, and renewed review.

## Required request outcomes

The Agent-provider boundary distinguishes three internal outcomes before the Doorbell:

| Provider outcome     | Crosses into Jig? | Required behavior                                                                      |
| -------------------- | ----------------- | -------------------------------------------------------------------------------------- |
| Allowed or approved  | No                | Provider executes under its selected posture.                                          |
| Rejected             | No                | Provider does not execute; the agent adapts, stops, or later asks a distinct question. |
| Human input required | Yes               | Provider emits one session-bound permission or question request for the Doorbell.      |

The Doorbell answer is scoped to the exact request. It cannot change the provider posture, grant
standing authority, or authorize a Jig delivery Operation.

## Consequences and accepted trade-offs

- Jig remains an orchestrator rather than a host-security product or second command-approval
  engine.
- Jig still proves its own lifecycle, evidence, and delivery decisions end to end. Trusting the
  provider for session execution does not promote a provider-internal outcome into a Jig fact.
- The owner chooses and trusts the provider and posture. Jig can prove what it selected and routed,
  not that an arbitrary provider has no hidden enforcement defect or egress path.
- Provider-internal automatic-review decisions are intentionally absent from Jig's authoritative
  ledger. Jig records the selected posture and every human Doorbell request and answer it governs.
- A session waiting for a human becomes a durable, attributable wait that survives interruption and
  participates in the existing liveness bounds.
- Providers without a stable posture reference or a conforming request protocol cannot offer that
  posture. The protocol may resume the same session or attest loss and support same-principal
  replacement/cancel-and-reissue; it may never silently discard the request.

## Alternatives not selected

- **Jig intercepts and classifies every worker action:** rejected because it duplicates the
  provider permission engine and turns provider-specific commands into Jig lifecycle protocol.
- **Jig independently proves host egress confinement:** rejected as a stronger security product
  commitment than Jig needs; the provider and Execution Host are trusted for the selected posture.
- **Provider asks the human outside Jig:** rejected because Jig would lose durable waiting,
  attribution, bounded liveness, and safe resume across multiple sessions.
- **A Jig-side automatic middleman in v1:** deferred. Provider-native automatic review remains
  allowed inside the provider session, but once the provider asks for a human, the current responder
  is human.
