---
title: "Review and verification execution — protocol, findings, and check policy"
purpose: Define the reviewer assignment protocol, verdict and finding representation, independence enforcement, declarative check policy, verification execution, and remote-gate observation that realize reviewer-principal acceptance at Layer 2.
audience:
  - Engineering, security, and architecture readers
  - Arye Kogan, Jig product and architecture decision owner
scope: The Layer 2 review protocol, finding representation, check-policy language, verification execution, and remote-gate observation; acceptance authority itself, evidence storage and integrity mechanisms, scheduling bounds, and landing proof are excluded.
state: approved
status: owner-approved 2026-07-17 readiness-remediation candidate; product-readiness lock inactive pending merge and renewed independent exact-candidate review
owner: Arye Kogan
last_verified: 2026-07-17
sources_of_truth:
  - ./acceptance-and-evidence.md
  - ./decisions/D7-acceptance-and-evidence.md
  - ./decisions/D15-pre-acceptance-review-publication.md
  - ./decisions/D9-invariants-and-artifact-shape.md
  - ./runtime.md
related:
  - ./flows/story-delivery.md
  - ./components/control-plane.md
  - ./forge-and-landing.md
  - ./scheduling-and-bounds.md
---

# Review and verification execution — protocol, findings, and check policy

This page consumes [D9 category 9](./decisions/D9-invariants-and-artifact-shape.md) (reviewer
protocol, finding representation, policy language, verification execution, and remote-gate
observation). It elaborates the acceptance model of
[acceptance and evidence](./acceptance-and-evidence.md) and the
[D7](./decisions/D7-acceptance-and-evidence.md) selection without changing them: the reviewer
remains the full-package acceptance principal (I8), and frozen policy still selects final
verification `deterministic` or `none` (I9). Protocol messages cross `PORT-SESSION`,
`PORT-VERIFY`, and `PORT-DELIVERY` as defined in the [runtime architecture](./runtime.md), and are
validated by `CP-MEDIATOR` in the [control plane](./components/control-plane.md).

When a review mode needs a forge venue, [D15](./decisions/D15-pre-acceptance-review-publication.md)
authorizes the exact Candidate branch and a draft, non-mergeable request before reviewer assignment.
The observed stable request metadata joins `RP-PACKAGE` delivery metadata; publication is not
acceptance and grants no finalization authority.

## Review assignment package (`RP-PACKAGE`)

The controller assembles one complete assignment package per review; `CP-EVIDENCE` binds it to the
exact subject before dispatch. The package identifies the exact subject the reviewer judges; a
verdict over anything else is invalid (I7).

| Package element     | Content                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| Exact Candidate     | The Candidate content digest and its recorded target basis digest; nothing mutable or symbolic. |
| Frozen requirements | The Story's approved requirements and acceptance criteria exactly as frozen at Run definition.  |
| Evidence manifest   | The complete manifest of digest-verified evidence artifacts bound to this Candidate.            |
| Findings ledger     | Every prior finding for this Story with its current resolution state (see `RP-FINDING`).        |
| Delivery metadata   | The Candidate's delivery metadata as proposed for acceptance judgment.                          |

A package element that is missing, integrity-failing, or bound to a different Candidate digest
fails the assignment closed before dispatch (QS8); Jig never asks a reviewer to judge an
incompletely identified subject.

**The package digest (`RP-PACKAGE-DIGEST`)** makes the whole package the immutable review subject:
one digest computed over every package element — the Candidate content digest, the target basis
digest, the frozen-requirements digest, the evidence manifest digest, the findings-ledger state
digest, and the delivery metadata digest. D7 binds acceptance to the judged requirements,
evidence, findings state, and delivery metadata, not to content alone, so the digest that
identifies the judged subject must cover them all: a change to any element — including the frozen
requirements a re-planned Run presents — changes the package digest even when the Candidate
content is untouched.

## Verdict and finding representation

- **Verdict (`RP-VERDICT`):** exactly one of `approve` or `changes-required`, expressed over the
  exact `RP-PACKAGE-DIGEST` from the assignment, attested and attributable to one validated
  reviewer `ID-SESSION` bound to its participant principal (`ID-PRINCIPAL` in
  [data and identity](./data-and-identity.md)).
- **Finding (`RP-FINDING`):** the cataloged `ID-FINDING` tuple in `SCH-VERDICT`: introduction
  package, exact subject anchor, severity class, requirement or risk trace, description,
  resolution state/evidence/reviewer, and supersession lineage.

Finding resolution is an explicit ledger transition, never an edit in place:

| From               | Reviewer action and guard                                                                                    | To                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| none               | Introduce the finding in a valid exact-package verdict                                                       | `open`                                       |
| `open`             | Validate resolution evidence in a later exact package and attribute the resolving reviewer session/principal | `resolved`                                   |
| `resolved`         | A later exact-package review finds the same traced risk present again                                        | `reopened` (blocking semantics equal `open`) |
| `open`, `reopened` | A reviewer replaces the statement with a new, more precise `ID-FINDING`                                      | `superseded`; record the successor identity  |

`superseded` is terminal for that finding identity. `Resolved` is closed but may transition to
`reopened` when a later exact package proves recurrence; recurrence after supersession is expressed
on the successor, never by rewriting history.

Rules the representation must preserve:

| Rule                    | Statement                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact-package semantics | Any change to any package element — Candidate content, target basis (including a basis-only refresh), frozen requirements, evidence manifest, findings state, or delivery metadata — changes `RP-PACKAGE-DIGEST`, invalidates every prior verdict, and re-enters full review with a fresh package; a verdict never transfers to a successor package (I7, D7). |
| Blocking findings       | Unresolved blocking findings prevent acceptance. Jig validates finding presence and resolution state; it does not re-judge severity — severity classification remains reviewer judgment (I8).                                                                                                                                                                 |
| Rework return           | A `changes-required` verdict returns the Story through a separately bounded rework loop, `BND-REWORK` in [scheduling and bounds](./scheduling-and-bounds.md); rework releases any held finalization authority.                                                                                                                                                |
| Durable findings        | Findings and their resolution states are durable control facts in the ledger, not session-local notes; they survive interruption and appear in the next `RP-PACKAGE`.                                                                                                                                                                                         |

## Reviewer independence enforcement (`RP-INDEPENDENCE`)

Independence is tracked by **participant principal, not by session**. Every role session binds at
open to exactly one stable principal (`ID-PRINCIPAL`), the binding is validated at the trust
boundary and recorded durably, and it survives session reconnection and replacement (`MC-RECONNECT`
in [mechanism and provider contracts](./mechanism-and-provider-contracts.md)), so a fresh session
never launders a principal's history. The controller records the principal of every session that
contributes to a Candidate — implementer, rework author, or any contributing session — and rejects
a verdict whose reviewer principal appears in that contributor set, regardless of which session
carries it. Independence is validated **per Candidate**, not per Run: a principal that implemented
one Candidate may review a different Story's Candidate, but never a Candidate any of its own
sessions helped produce. Two rejected alternatives: trusting role labels asserted by the agent
mechanism (the mechanism holds no identity authority; identity, role, and principal are validated
at `R-VALIDATE` in the [authority and trust perspective](./perspectives/authority-and-trust.md)),
and session-level distinctness alone (distinct sessions do not prove distinct participants, so the
same principal could implement, reconnect, and approve its own work).

## Policy language for checks (`RP-CHECKCLASS`)

The check policy is **declarative; it contains no scripting**. The frozen policy names required
check classes with expected evidence kinds and the final-verification posture:

| Policy element       | Declares                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Required check class | A named effect-free class such as `build`, `test`, `lint`, or a custom named check, with the evidence kind each must return. |
| Verification posture | Exactly one of `deterministic` or `none` for final verification (D7).                                                        |

Configuration binds each policy-named check class to concrete configured commands or providers.
Configuration may **add** checks but never remove or weaken a policy-required one (I9); a required
class with no valid binding fails preflight, not delivery time. The rejected alternative — an
embedded scripting language in policy — was not selected because scripts would move judgment and
effects into the policy document and defeat deterministic preflight validation.

`RP-CHECKCLASS` can name only checks realizable effect-free through `PORT-VERIFY`. An external-effect
need is not a verification binding; it must be separately modeled under `PORT-WORKSPACE` or
`PORT-DELIVERY`, or deferred to a future D-record.

## Rule-governing surfaces and provider permission posture

Every envelope freezes a digest-bound `SCH-RULE-SURFACE` manifest covering the repository paths
that govern policy, verification, integration, authority, or Jig configuration. Before review and
again before delivery, `CP-TRANSITION` compares the Candidate's changed paths with that manifest.
A touch is never ordinary implementation work: `EV-RULE-SURFACE-TOUCHED` parks the Run, records
`FC-RULES`, invalidates the prior review package, verdict, acceptance, and evidence that depended
on the previous rule surface, and requests owner approval of the exact replacement manifest plus
fresh evidence and full review. The exact `EV-OWNER-DECISION` closing that invalidating park takes
every affected `Accepted`, `Waiting`, or `Finalizing` Story through its cataloged invalidation
transition to `Reviewing`; it releases held finalization authority and creates a fresh
`RP-PACKAGE` even if Candidate bytes did not change. Removing a path from the manifest is itself a
rule-surface change.

The envelope also freezes the Agent provider's exact native permission posture. Worker runtime
actions allowed, automatically reviewed, or rejected by that posture remain internal to the Agent
session. If the provider requires a human permission or the agent requires a human answer, it emits
an exact request through `PORT-SESSION`; Jig parks it at the Doorbell and returns the scoped answer
by `ID-PARK` to the session currently bound to the originating principal and assignment, including a
provenance-linked replacement after attested loss. Jig does not classify the worker action, and the
answer cannot change the frozen provider posture or authorize a Jig delivery Operation.

This provider permission loop does not weaken rule-surface protection. A Candidate that touches a
governing surface still triggers the Jig-owned durable event and exact owner re-approval path above,
regardless of whether the provider allowed the file edit inside its session.

## Verification execution (`RP-VERIFY`)

When the frozen policy posture is `deterministic`, the policy-selected final check set runs against
a clean checkout of the exact Accepted Candidate — its digest-verified content and target basis —
in an isolated workspace authorized through `PORT-WORKSPACE` and executed through `PORT-VERIFY`.
Verification execution is **effect-free by enforced contract**, not by convention: the `CB-VERIFY`
capability binding confines checks to a read-only view of the checkout, a writable scratch area
that is discarded, and zero network egress by default
([mechanism and provider contracts](./mechanism-and-provider-contracts.md)); this is what makes a
lost check response safe to replace with a newly authorized Operation and new `ID-OP`, without
effect reconciliation (I17). A check class that
genuinely requires an external effect is outside `PORT-VERIFY`. It must instead be modeled as a
separately authorized workspace or delivery Operation under that port's own authority, or deferred
to a future D-record — never silently run as an "observation". Observations return as attestations:
pass or fail plus bounded
evidence artifacts. A failed required check prevents delivery (D7) and returns the Story through
bounded rework, releasing any held finalization authority; an exhausted rework bound records
directly `Blocked` (I16; the transitions are cataloged in
[lifecycle catalogs](./lifecycle-catalogs.md)). Verification never edits the Candidate; a check
that mutates its scratch checkout invalidates nothing because the durable Candidate digest is the
subject, and its observations are rejected as wrong-subject. With posture `none`, delivery
proceeds from reviewer approval and reviewed implementer evidence, retaining the residual risk
D7 explicitly accepts.

## Remote-gate observation (`RP-REMOTE`)

Remotely enforced gates — for example forge required checks on an integration request — are
**observed, not executed**: they return as attested external facts through `PORT-DELIVERY` and are
recorded durably. Jig neither re-executes nor re-judges a remote gate; it validates the
attestation's subject, freshness, and integrity like any other inbound fact. A policy-required
remote gate that cannot be observed fails closed (I15, QS8): absence of gate evidence is never
treated as a passing gate. How gate states feed landing is owned by
[forge and landing](./forge-and-landing.md).

## View V14 — review and verification protocol

- **Question:** In exact message order, how does a Candidate travel through assignment, verdict,
  validation, acceptance, and policy-selected verification — and where does the changes-required
  branch return?
- **View type:** Protocol sequence view over the Layer 2 runtime units and ports.
- **Audience and purpose:** Engineering and security readers; verify the protocol-level
  enforcement of I7–I9 beneath the coarse Layer 1 scenario.
- **Scope and exclusions:** One Candidate's review and verification messages. Landing,
  finalization ordering, capacity, session hosting, and provider transports are excluded;
  [V5](./flows/story-delivery.md) owns the coarse end-to-end scenario, and this view owns the
  protocol detail beneath its review segment.
- **State:** Approved (not locked).
- **Owner:** Arye Kogan.
- **Sources:** D7, D9 category 9; I7–I9, I15; [acceptance and evidence](./acceptance-and-evidence.md).
- **Related views:** [V5](./flows/story-delivery.md) is the coarse scenario;
  [V7](./components/control-plane.md) locates the validating components;
  [V15](./forge-and-landing.md) continues after verification succeeds.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, ui-sans-serif, system-ui", "primaryTextColor": "#172033", "lineColor": "#65758b"}}}%%
sequenceDiagram
    participant Ctl as RT-CONTROLLER Run controller
    participant Rev as P-REVIEWER reviewer session
    participant Impl as P-IMPLEMENTER implementer session
    participant Ver as X-VERIFY verification mechanism
    participant Del as X-DELIVERY delivery mechanism

    opt Review mode requires a forge venue
        Ctl->>Del: Authorizes OPC-REV-PUBLISH/REQUEST under CB-REVIEW-PUBLICATION
        Del-->>Ctl: Attests exact review ref and draft, non-mergeable request identity
        Note over Ctl: Records request metadata in RP-PACKAGE delivery metadata;<br/>no ID-AUTH, acceptance, target mutation, or landing
    end
    Note over Ctl: CP-EVIDENCE assembles RP-PACKAGE and computes<br/>RP-PACKAGE-DIGEST over content, basis, requirements,<br/>evidence, findings state, and delivery metadata
    Ctl->>Rev: Assigns RP-PACKAGE for the exact package digest via PORT-SESSION
    Rev-->>Ctl: Returns attested RP-VERDICT bound to the exact RP-PACKAGE-DIGEST
    Note over Ctl: CP-MEDIATOR validates principal identity, role, and<br/>RP-INDEPENDENCE against the contributor principals.<br/>The transition engine validates the exact package digest<br/>and the findings ledger before any state advances
    alt Verdict approves the exact Candidate
        Note over Ctl: Records Accepted durably before any further dispatch
        alt Frozen policy posture is deterministic
            Ctl->>Ver: Authorizes RP-CHECKCLASS checks against a clean checkout of the Accepted digest via PORT-VERIFY
            Ver-->>Ctl: Attests pass or fail observations with evidence artifacts
            Note over Ctl: A failed required check prevents delivery.<br/>Verification never edits the Candidate
        else Frozen policy posture is none
            Note over Ctl: Proceeds on reviewer approval and reviewed implementer evidence
        end
    else Verdict requires changes
        Note over Ctl: Records the attested RP-FINDING set and resolution states<br/>durably in the findings ledger
        Ctl->>Impl: Authorizes separately bounded rework under BND-REWORK
        Note over Ctl: Any package-element change invalidates all prior verdicts.<br/>The next review receives a fresh RP-PACKAGE and digest
    end
```

**V14 legend:** Solid arrows are controller-authorized assignments or requests dispatched through
the named port in the message text; dashed arrows are the attributable attestations participants
return. Notes over the controller mark durable validations and recorded decisions; every recorded
decision commits to the ledger before the next dispatch, per the
[authoritative transition ordering](./flows/run-and-story-lifecycle.md#view-v3c--authoritative-transition-ordering).
The outer `alt` separates approval from changes-required; the inner `alt` separates the two D7
verification postures. `RP` means review protocol, `CP` controller component, `RT` runtime unit,
`P` person role, `X` external mechanism, and `BND` bound class. There are no other abbreviations.

## What this page deliberately excludes

- **Acceptance authority and evidence roles:** owned by
  [acceptance and evidence](./acceptance-and-evidence.md); this page adds protocol, not judgment.
- **Evidence artifact storage, integrity, and redaction rules:** owned by the Layer 2 evidence
  page under D9 category 8.
- **Rework, wait, and review-loop budgets:** owned by
  [scheduling and bounds](./scheduling-and-bounds.md) as `BND-*` classes with policy-supplied
  values and safe defaults; no numeric bound is architecture on this page.
- **Session hosting, identity validation mechanics, and provider transports:** owned by
  [mechanism and provider contracts](./mechanism-and-provider-contracts.md).
- **Landing and remote-gate consequences for delivery:** owned by
  [forge and landing](./forge-and-landing.md).

## Where to go next

- The Layer 1 acceptance contract this page realizes:
  [acceptance and evidence](./acceptance-and-evidence.md) and
  [D7 — acceptance and evidence](./decisions/D7-acceptance-and-evidence.md).
- The coarse scenario above this protocol: [Story delivery scenario](./flows/story-delivery.md).
- The components that validate and record these messages:
  [control plane components](./components/control-plane.md).
- What happens after verification succeeds: [forge and landing](./forge-and-landing.md).
