---
title: "Forge and landing — delivery Operations, integration strategies, and landing proof"
purpose: Define the delivery-port Operation set, the frozen integration strategies, the content-equivalence rules, and the landing-proof algorithm that turn an Accepted Candidate into a proven Landed outcome.
audience:
  - Engineering, security, and operations readers
  - Arye Kogan, Jig product and architecture decision owner
scope: Repository and forge Operations, integration strategies, content equivalence, landing-proof steps, held and blocked integrations, and landing-path redaction; acceptance, review protocol, finalization ordering, reconciliation internals, and provider transports are excluded.
state: approved
status: owner-approved complete product-readiness candidate of 2026-07-16; lock pending exact-candidate review
owner: Arye Kogan
last_verified: 2026-07-16
sources_of_truth:
  - ./acceptance-and-evidence.md
  - ./concurrency-and-finalization.md
  - ./decisions/D6-concurrency-and-finalization.md
  - ./decisions/D7-acceptance-and-evidence.md
  - ./decisions/D9-invariants-and-artifact-shape.md
  - ./runtime.md
related:
  - ./flows/story-delivery.md
  - ./review-and-verification-execution.md
  - ./state-and-recovery.md
  - ./scheduling-and-bounds.md
---

# Forge and landing — delivery Operations, integration strategies, and landing proof

This page consumes [D9 category 10](./decisions/D9-invariants-and-artifact-shape.md) (repository
and forge Operations, merge strategies, content-equivalence rules, and landing-proof algorithms).
It realizes the Layer 1 landing-proof rule of
[acceptance and evidence](./acceptance-and-evidence.md) and the serialized finalization of
[concurrency and finalization](./concurrency-and-finalization.md): every message crosses
`PORT-DELIVERY` from the [runtime architecture](./runtime.md) under the single target-scoped
authority `CP-FINALIZER` and its fence. Nothing here re-decides D6 or D7; only confirmed landing
releases dependencies (I13).

## Repository and forge Operation set

A landing uses these delivery-port Operations. Their canonical catalog identities (`OPC-*`) are
owned by the Layer 2 event and Operation catalog under D9 category 3; this page binds their
delivery semantics. Every dispatch carries the durable Operation identity, payload basis, and
authority fence from [operation identity and fencing](./state-and-recovery.md).

| ID                | Operation                         | Effect class                                            | Reconciliation lookup                                                                                                                                                                  |
| ----------------- | --------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPC-DEL-ANCHOR`  | Create target lineage anchor      | Irreversible external effect, atomic conditional-create | Re-observation of the anchor: present with this realization-bound registry identity is success, present with another identity is a lost race that parks, absent permits bounded retry. |
| `OPC-DEL-PUBLISH` | Publish Candidate branch          | Irreversible external effect                            | Operation identity, plus the published ref name and Candidate content digest as the provider correlation key.                                                                          |
| `OPC-DEL-REQUEST` | Open integration request          | Irreversible external effect                            | Recorded provider correlation key of the integration request; lookup by source and target refs when the key was never acknowledged.                                                    |
| `OPC-DEL-STATUS`  | Surface Jig integration status    | Irreversible external effect                            | Integration-request identity plus a stable Jig status context; repeated publication updates that context idempotently.                                                                 |
| `OPC-DEL-COMMENT` | Surface the Jig explanation block | Irreversible external effect                            | Integration-request identity plus a stable Jig marker; lookup edits the existing explanation block instead of appending duplicates.                                                    |
| `OPC-DEL-OBSERVE` | Observe gate state                | Observation                                             | Re-observation by Operation identity; repeatable without external effect.                                                                                                              |
| `OPC-DEL-MERGE`   | Request merge                     | Irreversible external effect                            | Provider correlation key of the integration request, resolved by post-effect target observation, never by response alone.                                                              |
| `OPC-DEL-OBSERVE` | Observe target                    | Observation                                             | Re-observation by Operation identity; repeatable without external effect.                                                                                                              |

`OPC-DEL-OBSERVE` appears in two rows deliberately: gate-state observation and target observation
are two delivery uses of the one observation Operation class in the
[Operation catalog](./lifecycle-catalogs.md).

An uncertain irreversible effect is reconciled through its lookup before any second semantic
attempt (I17); observations are always safe to repeat. Remote-gate states observed through
`OPC-DEL-OBSERVE` are attested external facts per
[remote-gate observation](./review-and-verification-execution.md).

## Integration strategies

The target integration method is configured in the envelope and **frozen per Run**; the provider
cannot select or substitute a strategy at delivery time. Each strategy defines the result shape
the landing proof must resolve and the content-equivalence rule it must apply.

| Strategy            | Expected result shape                                                             | `LP-EQUIV` rule                                                                                          |
| ------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Direct fast-forward | The target head advances to the exact Candidate commit; no new commit is created. | The observed target head content is identical to the Accepted Candidate content digest.                  |
| Merge commit        | A new merge commit joins the Candidate history into the target.                   | The merged tree equals the Candidate tree over the Candidate's changed paths against the recorded basis. |
| Squash              | One new commit rewrites the Candidate history as a single change.                 | The squashed commit's patch over the recorded target basis is equivalent to the Candidate's change set.  |
| Merge queue         | The queue emits a rebased or merged commit it produced from the request.          | The queue-produced commit's tree equals the Candidate tree over the Candidate's changed paths.           |

## Content equivalence (`LP-EQUIV`)

Landing proof compares **content, not commit identifiers**, because strategies such as squash and
merge queue rewrite history and produce commits Jig never created. The rule is strategy-specific
equivalence between the Accepted Candidate content over its changed paths and the observed target
state: tree or patch equivalence over the Candidate's change set against the recorded target
basis. A target that has moved since the recorded basis requires the bounded refresh path of
[D6](./decisions/D6-concurrency-and-finalization.md) — retaining Story ownership, with renewed
full review and atomic authority rebinding when the Candidate changes — never a silent re-merge.
The rejected alternative, commit-identifier comparison, was not selected because it proves nothing
under history-rewriting strategies and falsely fails under equivalent rewrites.

## Landing-proof algorithm

| Step         | Action                                                                                                                                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LP-OBSERVE` | After effect certainty, request the authoritative post-effect target observation through `PORT-DELIVERY` (`OPC-DEL-OBSERVE`).                                                                                    |
| `LP-RESOLVE` | Resolve the integration result the effect claims produced — the fast-forward head, merge commit, squash commit, or queue-produced commit — using the recorded correlation keys.                                  |
| `LP-COMPARE` | Apply the frozen strategy's `LP-EQUIV` rule between the resolved result and the exact Accepted Candidate digest over its change set.                                                                             |
| `LP-RECORD`  | Record `Landed` durably with the observed facts, proof evidence, and the allocating registry identity (`ID-REGISTRY`) in the landing's delivery metadata, then release dependent Stories immediately (I13, I18). |

**Target lineage anchor and registry lineage check:** no Candidate-changing landing effect is authorized
until the target's **lineage anchor** names this grant's allocating registry identity (`ID-REGISTRY` in
[data and identity](./data-and-identity.md)). The anchor is a durable marker at the target itself
carrying the governing realization-bound registry identity. When absent, the finalizer creates it with
`OPC-DEL-ANCHOR`, an **atomic conditional-create** the delivery mechanism must support and attest
(for a git forge, a create-if-absent ref write gives the primitive natively): among racing
registries exactly one creation succeeds, so first-touch serialization is inherited from the
target's own atomicity rather than assumed, and I12/QS4 hold with no residual race. When present,
the anchor's registry identity must match this grant's registry; a mismatch — or losing the
creation race — is an authority-scope conflict that fences target effects and parks for the owner
(`FC-AUTHORITY`). `LP-RECORD` additionally writes the allocating registry into each landing's
delivery metadata, so lineage stays auditable in the landing history as well as at the anchor.

A missing, contradictory, or indeterminate observation at any step enters reconciliation and never
releases dependencies (I13). Integration-request creation, passing gates, or a provider success
response is explicitly insufficient as landing proof — this realizes the Layer 1 rule that
[delivery success is not landing proof](./acceptance-and-evidence.md). Jig records what the target
was observed to contain, not what the provider reported it did.

## Held and blocked integrations (`LP-HELD`)

A merge held by remote protections — required gates, queue position, protected-branch policy — is
a **durable named wait**, not a spin loop: it records an accountable owner, a durable reason, and
a wake condition, under a wait budget class defined in
[scheduling and bounds](./scheduling-and-bounds.md) with an explicit exhaustion action (I16).
Replays after interruption **re-observe** the held integration through its correlation key rather
than re-requesting the merge (I17). When the Candidate is safely published and the delivery
manifest permits request/status/comment effects, Jig opens or reuses the real integration request,
sets its stable Jig status with `OPC-DEL-STATUS`, and creates or updates one redacted explanation
block with `OPC-DEL-COMMENT`. The block names the failure reasons, evidence references, urgency,
and available actions. These effects are idempotent by request and stable Jig marker.

A surfacing failure never erases or downgrades the original `Blocked` fact. It creates a separate
residual surfacing obligation and actionable notice, then follows bounded reconciliation under
I17. If safe publication or the necessary delivery authority is absent, Jig records that fact and
the same obligation rather than claiming forge-side surfacing succeeded. Thus block truth is
always durable and, whenever the declared forge capability exists, visible on the real request —
never only in a log or private read model.

## Landing-path redaction

Durable landing records and published views carry no secrets and no secret-bearing provider URLs
or tokens (QS10). Provider correlation keys are recorded only in redacted, non-secret form — a
stable identifier sufficient for reconciliation lookup, never embedded credentials or signed URLs.
Credentials reach the delivery mechanism through the capability bindings of
[mechanism and provider contracts](./mechanism-and-provider-contracts.md), not through the ledger.

## View V15 — finalization and landing proof

- **Question:** In exact message order, how does the finalization authority align the basis,
  authorize the integration effect, establish effect certainty, and prove landing — and where do
  the uncertain-effect and moved-target branches exit?
- **View type:** Protocol sequence view over the Layer 2 runtime units and `PORT-DELIVERY`.
- **Audience and purpose:** Engineering, security, and operations readers; verify that no path
  records `Landed` without an authoritative post-effect observation and equivalence proof.
- **Scope and exclusions:** One Story's finalization messages. Review, verification, waiting
  order, capacity, Retirement, and provider transports are excluded;
  [V5](./flows/story-delivery.md) owns the coarse scenario and
  [V14](./review-and-verification-execution.md) owns the protocol before finalization.
- **State:** Approved (not locked).
- **Owner:** Arye Kogan.
- **Sources:** D6, D7, D9 category 10; I12–I13, I16–I18;
  [acceptance and evidence](./acceptance-and-evidence.md).
- **Related views:** [V4](./state-and-recovery.md) owns the authority-and-proof chain;
  [V14](./review-and-verification-execution.md) precedes this protocol;
  [V6](./runtime.md) owns the port this protocol crosses.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, ui-sans-serif, system-ui", "primaryTextColor": "#172033", "lineColor": "#65758b"}}}%%
sequenceDiagram
    participant Ctl as RT-CONTROLLER Run controller
    participant Del as X-DELIVERY delivery mechanism
    participant Tgt as Authoritative target

    Note over Ctl: CP-FINALIZER holds the sole target-scoped authority<br/>under its fence for this Story and Candidate basis
    Ctl->>Del: Requests the target lineage anchor through PORT-DELIVERY
    Del->>Tgt: Reads the lineage anchor
    Del-->>Ctl: Attests absent or the realization-bound ID-REGISTRY
    alt Anchor absent
        Ctl->>Del: Authorizes OPC-DEL-ANCHOR under the registry-bound authority fence
        Del->>Tgt: Atomically creates the anchor if absent
        Del-->>Ctl: Reports effect certainty and the observed winning ID-REGISTRY
        Note over Ctl: Reconciles an uncertain create by re-observation;<br/>continues only when the anchor names this grant's registry
    else Anchor names another registry realization
        Note over Ctl: Fences target effects and parks FC-AUTHORITY;<br/>no Candidate-changing landing effect follows
    else Anchor names this registry realization
        Note over Ctl: Registry lineage is confirmed
    end
    Note over Ctl,Del: The remaining path executes only after the anchor<br/>is confirmed to name this grant's ID-REGISTRY
    Ctl->>Del: Authorizes basis alignment and verification for the Accepted digest via PORT-DELIVERY
    Del->>Tgt: Reads the current target state
    Del-->>Ctl: Attests whether the target matches the recorded basis
    alt Target basis unchanged
        Ctl->>Del: Authorizes the integration effect OPC-DEL-MERGE under the authority fence
        Del->>Tgt: Performs the frozen-strategy integration
        Del-->>Ctl: Reports effect certainty for the durable Operation identity
        alt Effect certain
            Ctl->>Del: Requests the post-effect target observation LP-OBSERVE
            Del->>Tgt: Reads the authoritative post-effect target state
            Del-->>Ctl: Attests the observed target facts for LP-RESOLVE
            Note over Ctl: LP-COMPARE applies the strategy LP-EQUIV rule against the<br/>exact Accepted Candidate digest.<br/>LP-RECORD records Landed and releases dependents immediately
        else Effect uncertain or contradictory
            Note over Ctl: Enters reconciliation through the recorded lookup.<br/>Re-observes and never authorizes a second semantic effect first
        end
    else Target moved since the recorded basis
        Note over Ctl: Enters the bounded refresh path of D6.<br/>A Candidate-changing refresh requires renewed full review<br/>and atomic authority rebinding, never a silent re-merge
    end
```

**V15 legend:** Solid arrows are finalizer-authorized effects or requests dispatched through
`PORT-DELIVERY`, or the delivery mechanism acting on the authoritative target; dashed arrows are
the attestations the mechanism returns. Notes over the controller mark durable authority,
reconciliation, and recorded decisions; every recorded decision commits to the ledger before the
next dispatch. The first `alt` establishes or checks the realization-bound registry anchor and
stops the path on a conflicting registry; the next `alt` separates the unchanged-basis path from
the moved-target refresh branch; the innermost `alt` separates the certain effect from the uncertain
effect that exits to reconciliation. `LP` means landing proof, `OPC` Operation catalog entry, `CP` controller
component, `RT` runtime unit, `X` external mechanism, and `D6` the concurrency decision record.
There are no other abbreviations.

## What this page deliberately excludes

- **Acceptance, verdicts, and verification execution:** owned by
  [review and verification execution](./review-and-verification-execution.md).
- **Finalization ordering, waiting, and authority transfer:** owned by
  [concurrency and finalization](./concurrency-and-finalization.md) and its Layer 2 elaboration in
  [scheduling and bounds](./scheduling-and-bounds.md).
- **Reconciliation internals and recovery sequencing:** owned by
  [state and recovery](./state-and-recovery.md) and the control plane's `CP-RECOVERY` in
  [control plane components](./components/control-plane.md).
- **Provider protocol, credential resolution, and conformance obligations:** owned by
  [mechanism and provider contracts](./mechanism-and-provider-contracts.md).
- **Retirement of published branches and integration requests:** Retirement is separate from the
  business outcome (I18) and owned by [failure and liveness](./failure-and-liveness.md).

## Where to go next

- The Layer 1 landing-proof rule this page realizes:
  [acceptance and evidence](./acceptance-and-evidence.md).
- The single finalization authority and refresh rules this page operates under:
  [concurrency and finalization](./concurrency-and-finalization.md) and
  [D6 — concurrency and finalization](./decisions/D6-concurrency-and-finalization.md).
- Operation identity, fencing, and reconciliation classes:
  [state and recovery](./state-and-recovery.md).
- The review protocol that produces the Accepted Candidate this page lands:
  [review and verification execution](./review-and-verification-execution.md).
