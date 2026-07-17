---
title: "Scheduling and bounds — admission, reservation, wait, and budget realization"
purpose: Realize D6's capacity classes and D8's bounded-progress rules as deterministic admission, durable reservation, typed waits, and named budget classes with explicit exhaustion actions.
audience:
  - Engineers, architects, and operations readers
  - Arye Kogan, Jig product and architecture decision owner
scope: Resource classes, the admission algorithm, bound and budget classes, timers and wake triggers, and fairness; provider-capacity mapping, authority APIs, and schema shapes are excluded.
state: approved
status: owner-approved 2026-07-17 readiness-remediation candidate; product-readiness lock inactive pending merge and renewed independent exact-candidate review
owner: Arye Kogan
last_verified: 2026-07-17
sources_of_truth:
  - ./decisions/D6-concurrency-and-finalization.md
  - ./decisions/D8-failure-and-liveness.md
  - ./decisions/D9-invariants-and-artifact-shape.md
  - ./concurrency-and-finalization.md
  - ./failure-and-liveness.md
  - ./runtime.md
related:
  - ./components/control-plane.md
  - ./mechanism-and-provider-contracts.md
---

# Scheduling and bounds — admission, reservation, wait, and budget realization

This page consumes [D9 category 4](./decisions/D9-invariants-and-artifact-shape.md) — retry,
rework, refresh, wait, timeout, timer, queue, reservation, capacity, and fairness algorithms and
numeric budgets — realizing [concurrency and finalization](./concurrency-and-finalization.md) and
[failure and liveness](./failure-and-liveness.md). `CP-SCHEDULER` and `CP-ESCALATION` inside
`RT-CONTROLLER` ([runtime](./runtime.md)) decide; nothing moves authority outside Jig Control (I3).

## Resource classes (`RC-*`)

Each class realizes one high-level capacity class named by
[D6](./decisions/D6-concurrency-and-finalization.md): configuration declares hard available
capacity; frozen policy may only narrow it, resolving the effective maximum to the lower value.
Translating provider real limits into that declared hard capacity is an owner/configuration
responsibility: providers are not required to attest their limits. A misdeclaration surfaces as a
bounded mechanism fault under `BND-WAIT-MECHANISM`/`BND-RETRY`, never as a silent guarantee
overrun; see [DR-10](./delegation-register.md#entries).

| ID               | Resource class                | What consumes one unit                                                | Hard capacity declared by                   | Policy may lower it to                              |
| ---------------- | ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| `RC-ISOLATION`   | Isolated workspaces           | Each active Story workspace obtained through `PORT-WORKSPACE`.        | Workspace mechanism configuration.          | Any value at or above the progress reserve.         |
| `RC-SESSION`     | Retained role sessions        | Each retained implementer or reviewer session identity across turns.  | Agent mechanism configuration.              | Any value at or above the progress reserve.         |
| `RC-IMPL-TURN`   | Active implementer turns      | Each dispatched implementation or rework turn on `PORT-SESSION`.      | Agent mechanism configuration.              | Any value at or above the progress reserve.         |
| `RC-REVIEW-TURN` | Active reviewer turns         | Each dispatched independent review turn on `PORT-SESSION`.            | Agent mechanism configuration.              | Any value at or above the progress reserve.         |
| `RC-VERIFY`      | Verification executions       | Each policy-selected deterministic verification run on `PORT-VERIFY`. | Verification mechanism configuration.       | Any value at or above the progress reserve.         |
| `RC-DELIVERY`    | Delivery operations in flight | Each authorized publication or integration effect on `PORT-DELIVERY`. | Delivery mechanism configuration.           | Any value at or above the progress reserve.         |
| `RC-FINALIZER`   | Target finalization authority | The single Story holding finalization authority for one target.       | Fixed by the architecture: exactly 1 (I12). | Not lowerable; capacity 1 is structural, not tuned. |

**Progress-reserve rule (mandatory, configurable classes):** every configurable class carries a reserve so that every
admitted Story retains a path to its **next mandatory safe point** — the nearest of preserved
rework, recorded block, acceptance, or confirmed landing — using only remaining capacity. Preflight
rejects an envelope whose declared capacity, policy maxima, and reserve cannot jointly preserve
that path for any admissible Story (D6, I10). The reserve is a class property with a named
conservative default; frozen policy may enlarge it, never waive it. The **owner-reviewable
default** is one slot per scarce resource class, configurable from one through class capacity
minus one. A configurable class with capacity below two is infeasible. `RC-FINALIZER` is the
explicit exception: it is a structural singleton with capacity one, has no configurable reserve,
and is protected instead by `C-ORDER`, sole `ID-AUTH`, and `BND-WAIT-TARGET`/`BND-REFRESH`.

The demand side is equally explicit. Each `SCH-PLAN` Story declares its maximum simultaneous
path-to-safe-point demand per configurable `RC-*` class; omitted used classes default to one unit.
Policy composition may only narrow the admitted path or add conservative demand, never reduce a
plan-declared demand. Preflight evaluates every admissible Story path against effective capacity,
declared/defaulted demand, and reserve; an unknown class, demand above effective capacity,
out-of-range reserve, or infeasible combination rejects the envelope before intake.

## Admission algorithm — deterministic, derived, replayable

On every relevant durable fact change (a Transition commits, a wake trigger fires, capacity facts
change), `CP-SCHEDULER` recomputes admission from durable authority alone, so any two replays of
the same ledger produce the same admissions (I4):

1. **Eligibility derivation:** a Story is eligible when all prerequisites are confirmed `Landed`
   (I13), it holds no durable direct blocker (I14), and its Run is not interrupted or stopping.
2. **Total order:** order the eligible set by the immutable comparator — approved plan priority,
   then immutable plan ordinal, then unique Story identity (I11). No arrival, collection, or
   mechanism order participates.
3. **Capacity check with progress reserve:** admit greedily in that order while every admitted
   Story keeps a progress path to its next mandatory safe point under remaining capacity (I10); a
   reserve-breaking Story is skipped into a `BND-WAIT-CAPACITY` derived wait and later Stories are
   still considered. `CP-SCHEDULER` owns that wait; each admission recomputation re-derives it and
   may admit the Story, but does not renew its continuous-starvation bound.
4. **Record before touch:** each admission is recorded as a Transition containing durable
   **reservation facts** against the consumed `RC-*` classes; reservations are not Operation
   intents, are never dispatched or port-crossing, and no workspace, session, turn, or delivery
   resource is touched before that Transition commits (I5).
5. **Constrained preference:** while any class is constrained, `CP-SCHEDULER` prefers advancing or
   retiring already-admitted work over admitting new Stories (D6); freed reservations are released
   by the Transition that records the advance or Retirement.

Queues are **derived state**, rebuilt from the ledger by `CP-PROJECTION`, never authoritative;
reservations are **durable Transition facts**. Recovery re-derives reservation state by ledger
replay (I4), so they have no external effect and nothing to reconcile. No admitted Story or current
finalization-authority holder is preempted by a later higher-priority Story — preemption trades
determinism for utilization D6 declined.

## Bound and budget classes (`BND-*`)

For every active-Run class, the policy author selects the concrete value at envelope composition
within the inclusive allowed range; the class default applies when policy omits a value.
Configuration may only narrow the selected value and never below the class minimum. The exact value
and range-version are frozen into `SCH-ENVELOPE`; out-of-range or widening input fails preflight.
For pre-Run Work Source requests, compose-time capability-proof exchanges, and intake-scoped
configuration-artifact reads, the owner-approved composition input applies the same `BND-RETRY`
class and exhaustion remains outside Run scope. Count defaults below are total attempts/cycles
including the first attempt where applicable; durations are per wait window.

The capability-proof and configuration-read families share `LG-PREFLIGHT-ATTEMPT`: each
exchange-attempt key derives deterministic start/result variant keys whose immutable bytes are
conditional-created or read back before an ordinal can be consumed or advanced. Exact
same-variant-key bytes replay; a byte mismatch, missed deadline rule,
missing or invalid predecessor, or digest/integrity failure fails closed. It is bounded pre-Run
evidence only and creates no event, Operation, Run, authority, Transition, dispatch, or second
ledger authority. Work Source keeps its existing source-exchange identity and is not part of this
shared primitive.

Every wait records its accountable owner, durable reason, wake or completion condition, and
deadline class (I16). Exhaustion actions come from the fixed
[D8](./decisions/D8-failure-and-liveness.md) set — retry, block, park, escalate, interrupt,
explicit terminal-stop decision, or Residual Obligation — never silent success or an unnamed
indefinite wait.

| ID                   | What it bounds                                                                                                                      | Numeric default and allowed range | Renewal or reset rule                                                                                                        | Explicit exhaustion action                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `BND-REWORK`         | Review and rework loops per Story.                                                                                                  | 2 loops; range 1–5.               | No automatic renewal.                                                                                                        | Block the Story; dependents derive `Not run — dependency blocked`.                                                                   |
| `BND-RETRY`          | Total attempts per Operation class or pre-Run source, capability-proof, or configuration-artifact exchange.                         | 3 attempts; range 1–5.            | No automatic renewal; every attempt is recorded.                                                                             | Block at the owning Story/Operation, or fail proposal/intake before Run creation.                                                    |
| `BND-REFRESH`        | Target refreshes while holding finalization authority.                                                                              | 2 refreshes; range 1–5.           | No automatic renewal.                                                                                                        | Park with escalation naming target instability.                                                                                      |
| `BND-WAIT-DECISION`  | Human-answer waits on parked Jig questions, Agent-provider permissions/questions, or live `open` Residual Obligations.              | 72h; range 1h–30d.                | A recorded scoped decision may open a new parked-request wait. An obligation wait never renews or resets.                    | Escalate again durably; the exact request stays parked or the same obligation stays `open`, never dropped or auto-accepted.          |
| `BND-WAIT-MECHANISM` | Mechanism response deadlines on mediated Operation ports and pre-Run source, capability-proof, or configuration-artifact exchanges. | 15m per request; range 5s–2h.     | No renewal; retry consumes `BND-RETRY`.                                                                                      | Retry under `BND-RETRY`; then block the owning Story/Operation or fail proposal/intake before any Run.                               |
| `BND-WAIT-CAPACITY`  | Continuous starvation of a skipped eligible Story at capacity admission or an accepted Story in the finalization-authority queue.   | 24h; range 1h–30d.                | No automatic renewal; admission/authority recomputation re-derives the wait without resetting its original starvation start. | Park the Story with escalation naming admission or finalizer-queue starvation (`FC-CAPACITY`); release no dependents.                |
| `BND-WAIT-LEDGER`    | Ledger/registry/intake-index acknowledgements and verified reads.                                                                   | 30s; range 1s–5m.                 | No renewal; exhaustion enters Recovery.                                                                                      | Halt dispatch and interrupt the Run into Recovery; shared authority uncertainty is never Story-blocked (D8, I15).                    |
| `BND-WAIT-TARGET`    | Target stability waits before/during finalization, including merge-queue and branch-protection holds.                               | 30m; range 1m–24h.                | No automatic renewal; a decision may open a new bounded wait.                                                                | Park with escalation; target effects stay fenced.                                                                                    |
| `BND-IDLE`           | Time since a responsive session's last qualifying progress observation.                                                             | 30m per role; range 5m–8h.        | A qualifying durable progress fact resets the clock.                                                                         | Classify `stuck`, park the Story, and preserve the workspace.                                                                        |
| `BND-SILENCE`        | Time since the last valid heartbeat or response from an assigned session.                                                           | 5m per mechanism; range 10s–30m.  | A valid heartbeat resets the clock.                                                                                          | Classify `dead`; replace only after attested loss and valid same-principal successor binding, otherwise park.                        |
| `BND-RECOVERY`       | Reconciliation attempts for one uncertain effect (I17).                                                                             | 3 attempts; range 1–5.            | No renewal and no semantic-effect retry.                                                                                     | Escalate; no second semantic attempt until reconciled.                                                                               |
| `BND-RETIRE`         | Retirement attempts per obligation.                                                                                                 | 3 attempts; range 1–5.            | No renewal; exhaustion creates one `open` Residual Obligation.                                                               | Mint one `open` Residual Obligation assigned to the accountable owner; never accept handoff or satisfy the duty automatically (I19). |

### Normalized bounded-progress and wait inventory

The twelve classes above govern these sixteen semantic surfaces. This is the finite R5.1 inventory:
each row names the accountable owner, durable reason/start, wake/completion, bound/reset rule, and
exhaustion action. The last four rows reuse existing classes; they introduce no new bound, event,
port, Operation, state, or failure code.

| #   | Surface                                | Accountable owner and durable reason/start                                                                                                                                                                                                                                                        | Wake or completion                                                                        | Bound/reset and exhaustion                                                                                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Review/rework loop                     | `CP-TRANSITION`; a `changes-required` verdict records the rework turn.                                                                                                                                                                                                                            | `CP-SCHEDULER` re-admits through `EV-WAKE-CAPACITY`.                                      | `BND-REWORK`, no renewal; exhaustion blocks the Story and derives dependent non-run outcomes.                                                                                                                                                                                                                                                                                                     |
| 2   | Operation/source retry                 | `CP-MEDIATOR` for Operations or `EP-SOURCE` pre-Run; failed, timed-out, or proved-absent attempt is recorded.                                                                                                                                                                                     | Newly authorized attempt or validated source result.                                      | `BND-RETRY`, no renewal; block the Story/Operation or fail source composition before Run creation.                                                                                                                                                                                                                                                                                                |
| 3   | Target refresh                         | `CP-FINALIZER`; target-basis advance while authority is held records the refresh turn.                                                                                                                                                                                                            | Aligned Candidate fact followed by review/rebind.                                         | `BND-REFRESH`, no renewal; enter `RefreshPark`, escalate, and release no dependents.                                                                                                                                                                                                                                                                                                              |
| 4   | Owner/provider human answer            | `CP-ESCALATION`; durable `SCH-ESCALATION`/`ID-PARK` records the question, responder scope, and deadline.                                                                                                                                                                                          | Exact `EV-OWNER-DECISION` or same-principal rebound answer.                               | `BND-WAIT-DECISION`; only a scoped decision opens a new wait; exhaustion re-escalates and keeps the request parked.                                                                                                                                                                                                                                                                               |
| 5   | Mediated Operation response            | `CP-MEDIATOR`; the authorized `SCH-OPERATION` attempt records request, owner, subject, and deadline.                                                                                                                                                                                              | Validated port fact, failure, or certainty observation.                                   | `BND-WAIT-MECHANISM` plus `BND-RETRY`; block the owning scope or enter effect reconciliation before another semantic attempt.                                                                                                                                                                                                                                                                     |
| 6   | Capacity admission                     | `CP-SCHEDULER`; durable admission recomputation records the eligible Story's continuous-starvation start.                                                                                                                                                                                         | `EV-WAKE-CAPACITY` after capacity/reserve change.                                         | `BND-WAIT-CAPACITY`; recomputation does not reset the clock; exhaustion parks with `FC-CAPACITY`.                                                                                                                                                                                                                                                                                                 |
| 7   | Ledger/registry/intake read or ack     | `CP-INTAKE` for intake and the transition engine's commit protocol otherwise; expected head/request identity is durable.                                                                                                                                                                          | Verified acknowledgement or readback.                                                     | `BND-WAIT-LEDGER`, no renewal; halt dispatch and enter Recovery, which re-reads shared authority.                                                                                                                                                                                                                                                                                                 |
| 8   | Target stability or held integration   | `CP-FINALIZER`; target/gate/merge-queue/branch-protection hold and current fence are recorded.                                                                                                                                                                                                    | Validated target observation or durable condition change.                                 | `BND-WAIT-TARGET`; a decision may open a new wait; exhaustion parks/escalates while retaining the target fence.                                                                                                                                                                                                                                                                                   |
| 9   | Qualifying-progress idle               | `CP-MEDIATOR` supplies `SCH-LIVENESS`; controller records responsive session plus last qualifying progress.                                                                                                                                                                                       | Qualifying session result, artifact fact, check, or declared checkpoint.                  | `BND-IDLE`; qualifying fact resets; exhaustion classifies `stuck`, parks, and preserves the workspace.                                                                                                                                                                                                                                                                                            |
| 10  | Session silence                        | `CP-MEDIATOR`; `SCH-LIVENESS` records assigned session and last valid heartbeat/response.                                                                                                                                                                                                         | Valid heartbeat or response.                                                              | `BND-SILENCE`; heartbeat resets; exhaustion classifies `dead`, then replaces only after attested loss or parks.                                                                                                                                                                                                                                                                                   |
| 11  | Effect reconciliation                  | `CP-RECOVERY`; `SCH-OPERATION` records `Uncertain`, exact effect basis, and retained fence.                                                                                                                                                                                                       | `EV-RECOVERY-OBSERVATION` or `EV-EFFECT-CERTAINTY`.                                       | `BND-RECOVERY`, no semantic retry; exhaustion escalates/parks and retains the fence.                                                                                                                                                                                                                                                                                                              |
| 12  | Retirement duty                        | Settlement through `CP-TRANSITION`; terminal duty and accountable owner are recorded.                                                                                                                                                                                                             | `EV-WAKE-SETTLEMENT` from each duty-completing fact.                                      | `BND-RETIRE`, no renewal; exhaustion mints one owner-accountable `ID-OBLIGATION` in `open`. Creation is not handoff, does not satisfy the duty, and cannot substitute for Arye's exact acceptance event.                                                                                                                                                                                          |
| 13  | Compose-time capability-proof exchange | `EP-PROVIDERS`; `LG-PREFLIGHT-ATTEMPT` carries immutable start/result bytes under deterministic variant keys derived from the request key. The validated `SCH-CAPABILITY-PROOF` result binds basis, provider/build/manifest/environment, ordinal, deadline, predecessor, result, and consumption. | Positive subject/freshness-valid proof; lost response/crash reads the same variant key.   | `BND-WAIT-MECHANISM` plus `BND-RETRY`; only byte-equivalent same-variant-key replay preserves the ordinal, while mismatch, deadline, predecessor, or integrity failure fails closed. Exhaustion leaves no positive proof and fails proposal/intake before Run creation. No event, Operation, Run, authority, Transition, or dispatch.                                                             |
| 14  | Pre-Run configuration-artifact read    | `CP-INTAKE`, validated by `CP-MEDIATOR`; `LG-PREFLIGHT-ATTEMPT` carries immutable `SCH-INTAKE-ACK` start/result variants with exact subject/digest, composition, deterministic request and derived variant keys, ordinal, deadline, predecessor, result, and consumption.                         | Digest-valid result; lost response/crash reads the same variant key.                      | `BND-WAIT-MECHANISM` plus `BND-RETRY`; only byte-equivalent same-variant-key replay preserves the ordinal, while mismatch, deadline, predecessor, or integrity failure fails closed. A new start proves the prior result or elapsed deadline; the `terminal-ack` binds the chain and exhaustion rejects intake before Run creation. No event, Operation, Run, authority, Transition, or dispatch. |
| 15  | Finalization-authority queue waiter    | `CP-FINALIZER`; `SCH-REGISTRY-RECORD` stores Candidate, eligibility basis, `C-ORDER`, and continuous-starvation start.                                                                                                                                                                            | `EV-WAKE-AUTHORITY` after release and comparator selection.                               | `BND-WAIT-CAPACITY`; re-evaluation does not reset the clock; exhaustion parks/escalates without target mutation or dependent release.                                                                                                                                                                                                                                                             |
| 16  | Live `open` Residual Obligation        | `CP-ESCALATION`, recorded by `CP-TRANSITION`; `SCH-OBLIGATION` stores the accountable owner, exact duty/reason, original `BND-WAIT-DECISION` start and deadline, and completion criteria when `open` is created before or after terminal settlement.                                              | Exact owner `EV-OWNER-DECISION` accepting handoff, or validated `EV-OBLIGATION-RESOLVED`. | `BND-WAIT-DECISION`; notice delivery, Recovery, retry, and re-escalation never reset the original start. Exact `EV-BOUND-EXHAUSTED` records durable re-escalation while preserving the same `open` identity and owner-only handoff authority; it cannot accept, resolve, or satisfy the duty automatically.                                                                                       |

The mechanism/ledger split is deliberate: a timed-out or unknown outcome on a mediated Operation
port is a Story- or Operation-scoped fault, but an unknown ledger or registry acknowledgement is
uncertainty about shared durable authority itself. Continuing other Stories from an uncertain
ledger would violate the containment ladder of
[failure and liveness](./failure-and-liveness.md), so `BND-WAIT-LEDGER` exhaustion always halts
dispatch and enters Run-scoped Recovery ([persistence and projections](./persistence-and-projections.md)).

### Deterministic liveness classification

`SCH-LIVENESS` observations are mechanism facts, not provider judgments. From those facts and the
named bounds, the controller derives exactly one applicable condition:

- **thinking** — the session is responsive and has recorded qualifying progress within `BND-IDLE`;
- **stuck** — the session remains responsive but has no qualifying progress after `BND-IDLE`, or
  repeats the same bounded progress state without advancing it;
- **dead** — the mechanism reports termination or no valid heartbeat arrives within `BND-SILENCE`;
- **human input overdue** — a durable Jig or Agent-provider request remains unanswered, or a live
  `open` Residual Obligation remains neither accepted nor resolved, after `BND-WAIT-DECISION`.

Qualifying progress is exactly one durable subject-bound committed fact: a new Candidate through
`EV-SESSION-RESULT`, adopted evidence through `EV-ARTIFACT-FACT`, a completed check through
`EV-CHECK-OBSERVATION`, or a checkpoint explicitly enumerated in the frozen, digest-bound
`SCH-WORK-PROFILE`. A checkpoint qualifies only when a cataloged mechanism-produced durable event
matching its declared fact kind satisfies it; session self-report never satisfies a checkpoint.
Message volume, token counts, and provider self-reports never qualify. Stuck and dead
classifications record `FC-LIVENESS` and preserve work. `Stuck` parks;
`dead` follows the fixed `BND-SILENCE` replacement guard and otherwise parks.
Human-input-overdue re-escalates without dropping the request.

## Timers and wake triggers

Durable typed **wake triggers** are the authoritative wait facts: each records its subject,
deadline class, and completion or wake condition, committed with the Transition that opened the
wait. A `BND-WAIT-CAPACITY` admission wait is accountable to `CP-SCHEDULER` and wakes on
`EV-WAKE-CAPACITY`; a finalizer-queue wait is accountable to `CP-FINALIZER` and wakes on
`EV-WAKE-AUTHORITY`. A live `open` obligation retains its creation-time `BND-WAIT-DECISION` start
and deadline, wakes only on exact handoff acceptance or resolution, and emits one idempotent
`EV-BOUND-EXHAUSTED` re-escalation fact when that deadline expires. Transient in-process timers only prompt re-evaluation and carry no decision authority (D8);
a fired timer whose durable condition no longer holds does nothing. On Recovery, wake triggers are
reconstructed from the ledger before dispatch resumes (I6), so no wait is lost with process memory
and a missed deadline follows its recorded exhaustion action.

## Fairness and starvation resistance

Fairness is **deterministic order plus admitted-progress priority plus bounded turns** — not
dynamic aging, weights, or lotteries, rejected for reintroducing arrival-order-sensitive outcomes
(I4, I11); bounded `BND-*` turns mean the head of the total order always advances or exits.

| Starvation scenario        | Risk                                                                       | Preventing rule                                                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reviewer-capacity deadlock | Implementation turns absorb all capacity; no review can ever start.        | `RC-REVIEW-TURN` progress reserve plus advance-before-admit under constraint.                                                                          |
| Session exhaustion         | Retained sessions accumulate until no Story can obtain one.                | `RC-SESSION` explicit class, preflight rejection, and retire-before-admit reclamation.                                                                 |
| Finalizer wait             | Accepted Stories waiting on `RC-FINALIZER` are bypassed by newer arrivals. | Total comparator orders the wait; no preemption; `BND-WAIT-CAPACITY` bounds the queued waiter, while `BND-REFRESH`/`BND-WAIT-TARGET` bound the holder. |

### View V10 — deterministic admission pipeline

- **Question:** How does a durable fact change become a recorded admission with reservations, and
  where do constrained capacity and bound exhaustion divert the pipeline?
- **View type:** Behavior flow of the `CP-SCHEDULER` admission pipeline.
- **Audience and purpose:** Engineers and operations readers; see why a Story was or was not
  admitted and which exits exist, before reading component internals.
- **Scope and exclusions:** Admission derivation, ordering, capacity, recording, and dispatch for
  one Run. Finalization-authority transfer, provider-capacity mapping, and schemas are excluded.
- **State:** Approved (not locked).
- **Owner:** Arye Kogan.
- **Sources:** D6, D8; I4, I5, I10–I13, I16; [runtime V6](./runtime.md).
- **Related views:** [V6](./runtime.md#view-v6--runtime-decomposition) places `RT-CONTROLLER`; V7
  ([control plane](./components/control-plane.md)) opens `CP-SCHEDULER`; V12
  ([mechanism contracts](./mechanism-and-provider-contracts.md)) owns provider capacity.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, ui-sans-serif, system-ui", "primaryTextColor": "#172033", "lineColor": "#65758b"}}}%%
flowchart LR
    subgraph Durable["Durable authority"]
        Ledger[("RT-LEDGER<br/>Durable facts: landings, blockers, reservations<br/>[Authoritative store]")]
        Admit["CP-TRANSITION<br/>Admission Transition with reservation facts<br/>[Authoritative record]"]
    end

    subgraph Pipeline["CP-SCHEDULER: derived, rebuilt from the ledger"]
        Elig["I13<br/>Eligibility derivation<br/>prerequisites confirmed Landed<br/>[Derived step]"]
        Order["I11<br/>Immutable total comparator<br/>priority, ordinal, Story identity<br/>[Deterministic rule]"]
        Cap["RC-ISOLATION to RC-FINALIZER<br/>Capacity check with progress reserve<br/>[Derived check]"]
    end

    subgraph Flight["Dispatched and admitted work"]
        Dispatch["CP-MEDIATOR<br/>Dispatch through named ports<br/>[Dispatch]"]
        Admitted["STORY-*<br/>Admitted work in flight<br/>[Admitted Stories]"]
    end

    Exhaust["BND-*<br/>Explicit exhaustion actions<br/>retry, block, park, escalate, interrupt, terminal decision, residual<br/>[Bounded exit]"]

    Ledger -->|"supplies facts on every relevant change to"| Elig
    Elig -->|"passes the eligible set to"| Order
    Order -->|"offers Stories in total order to"| Cap
    Cap -->|"records admission and reservations via"| Admit
    Admit -->|"commits before any resource is touched to"| Ledger
    Admit -->|"authorizes dispatch of admitted work to"| Dispatch
    Dispatch -->|"advances"| Admitted
    Cap -.->|"constrained: prefers advancing or retiring"| Admitted
    Admitted -.->|"on bound exhaustion follows"| Exhaust
    Exhaust -.->|"is recorded durably back into"| Ledger

    style Durable fill:#fff6dd,stroke:#b8903a,color:#172033
    style Pipeline fill:#eef5ff,stroke:#7a96bd,color:#172033
    style Flight fill:#e8f7ed,stroke:#4f8a63,color:#172033
    classDef store fill:#e8f1ff,stroke:#5a78a8,stroke-width:3px,color:#172033
    classDef record fill:#fff1cf,stroke:#a8781f,stroke-width:3px,color:#172033
    classDef derived fill:#e8f1ff,stroke:#5a78a8,color:#172033
    classDef work fill:#e8f7ed,stroke:#4f8a63,color:#172033
    classDef exit fill:#fce8e6,stroke:#a7615b,stroke-dasharray:5 3,color:#172033
    class Ledger store
    class Admit record
    class Elig,Order,Cap derived
    class Dispatch,Admitted work
    class Exhaust exit
```

**V10 legend:** The cylinder is the authoritative store; rectangles are pipeline steps, records,
dispatch, or work. The thick yellow border marks the authoritative admission record
(`CP-TRANSITION`); the thick blue border marks the authoritative ledger; plain blue pipeline nodes
are derived state rebuilt from the ledger, never authoritative. Solid lines are the normal
deterministic admission path; dashed lines mark only the constrained-capacity preference and the
bound exhaustion exits, and the red dashed-border node groups the `BND-*` exhaustion actions.
`RC-ISOLATION to RC-FINALIZER`, `BND-*`, and `STORY-*` group this page's classes and the admitted
Stories, each keeping its own identity. Color is redundant with IDs and bracketed types.

## Exclusions

Provider-capacity mapping — how each configured provider's real limits become `RC-*` hard
capacity — and authority APIs live in
[mechanism and provider contracts](./mechanism-and-provider-contracts.md), authored concurrently.
Reservation and wake-trigger record shapes belong to the data and ledger pages; this page owns
their meaning and algorithmic use only.

## Where to go next

- Layer 1 rules realized here: [concurrency and finalization](./concurrency-and-finalization.md)
  and [failure and liveness](./failure-and-liveness.md).
- The scheduler and escalation components in context:
  [control plane components](./components/control-plane.md).
- Why capacity classes and bounded exhaustion were selected:
  [D6](./decisions/D6-concurrency-and-finalization.md),
  [D8](./decisions/D8-failure-and-liveness.md).
