---
title: "Deterministic story orchestration — port boundaries"
status: proposal — draft for review, not yet agreed or adopted
---

# Port boundaries

This layer defines the minimum first-phase boundaries between the deterministic orchestration
system and external mechanisms. It refines the effect interfaces introduced by
[Orchestration](orchestration.md) while preserving the state ownership in
[Live state](live-state.md). It defines semantic responsibilities and authority, not provider APIs
or field-level wire schemas.

## Chosen boundary style

The first phase uses small capability-oriented ports rather than one provider interface or one
interface per low-level command. Each port owns one coherent external responsibility and exposes a
closed set of semantic capabilities.

The orchestration core does not call ports. It produces typed operation requests. The runtime maps
each request to exactly one port, validates the typed result, and returns the result to the core as
a later trigger.

```text
deterministic core
  -> typed requested operations
runtime coordinator
  -> one narrow port per operation kind
port adapter
  -> provider, process, filesystem, repository, or remote service
```

Provider SDK objects, command syntax, raw filesystem layouts, credentials, and transport details
remain behind adapters.

## Boundary rules

Every first-phase port follows these rules:

- expose domain capabilities rather than generic command execution;
- accept and return closed typed contracts;
- validate external inputs and report factual outcomes without making lifecycle decisions;
- operate only within its configured and preflight-validated authority;
- bind candidate-sensitive work to an exact story, resource, and commit SHA;
- support operation identity and duplicate-safe dispatch where the mechanism permits;
- return enough observed identity for the runtime to validate the result against the request; and
- never weaken policy, reinterpret agent judgment, or mutate live state directly.

Configuration chooses concrete adapters. Preflight confirms that each selected adapter declares
every capability required by the immutable plan and policy. Mid-run capability discovery or
best-effort substitution is not part of the first phase.

## First-phase port set

The design has six ports in two categories:

| Category       | Port                    | Responsibility                                                        |
| -------------- | ----------------------- | --------------------------------------------------------------------- |
| Infrastructure | Event-store port        | Atomically persist trusted event batches                              |
| Infrastructure | Artifact-store port     | Persist and resolve immutable evidence artifacts                      |
| Effect         | Agent-session port      | Open, assign, retain, and close role-specific agent sessions          |
| Effect         | Workspace port          | Provision, observe, refresh, and safely retire local story workspaces |
| Effect         | Local-verification port | Run the configured final check set against an exact candidate         |
| Effect         | Delivery port           | Observe targets, publish branches, create PRs, integrate, and confirm |

Infrastructure ports participate in trusted runtime boundaries. The four effect ports execute the
typed operations tracked by `OperationRegistry`.

## Event-store port

The event-store port atomically appends a trusted batch of persisted events for one transition.
The trusted event recorder constructs and validates event envelopes before invoking it.

The first-phase capability is intentionally narrow:

- append the complete batch or append none of it;
- return a trusted append receipt or an explicit persistence failure; and
- maintain any physical ordering or indexing metadata internally.

It exposes no read, replay, projection, state-snapshot, or query capability to the orchestration
control path. Inspection tools may receive separate read-only access later, but such access cannot
become an undeclared runtime state source.

The port does not accept a producer-selected run identity, producer identity, timestamp, or schema
version. Those values are controlled by the trusted recorder as defined by
[Events and runtime state](events-and-runtime-state.md).

## Artifact-store port

The artifact-store port persists immutable content that is too large, sensitive, or
provider-shaped for event payloads. A trusted artifact recorder scopes writes to the run and true
producer, validates metadata, applies required redaction and limits, and returns an opaque
`ArtifactRef`.

Its first-phase capabilities are:

- persist immutable artifact content and return its integrity metadata;
- resolve an authorized artifact reference for a scoped consumer;
- verify that referenced content exists and still matches its digest; and
- honor configured retention without deleting content still required by an active run.

Artifact storage is separate from event storage. Events contain typed decision facts and artifact
references; the event store never becomes a blob store. Artifact persistence and retrieval do not
change run or story state by themselves.

Adapters may receive a recorder or resolver already scoped to their run, producer, role, and
allowed artifact kinds. They do not receive unrestricted storage credentials or choose their own
trusted attribution.

## Agent-session port

The agent-session port owns provider interaction for retained implementer and reviewer sessions.
It can:

- open one session for a specified role using a frozen resolved route;
- assign an implementation, target-refresh, or review task to the matching retained session;
- return a typed candidate submission, review verdict, or explicit inability-to-continue report;
  and
- close the session and report whether closure was confirmed.

The port preserves provider session identity but does not expose provider conversation objects to
the core. It validates the response shape and ensures required artifacts are durably recorded
before returning a completed result to the runtime.

It does not choose routes, change roles, replace lost sessions, decide whether work is acceptable,
communicate directly between implementer and reviewer, or grant repository-delivery authority.
Each session receives only the worktree and evidence access required by its role.

## Workspace port

The workspace port owns local repository isolation and safe resource retirement. It can:

- provision the configured story branch and worktree from an exact target basis;
- inspect branch identity, HEAD SHA, worktree cleanliness, and preservation facts;
- refresh the local read-only view of the configured target for a target-refresh assignment; and
- retire a story worktree and local branch only when the required safety preconditions hold.

The workspace port does not implement stories, resolve conflicts, run review judgment, push remote
branches, create pull requests, merge, or decide when cleanup is allowed. The implementer performs
the assigned rebase and conflict resolution inside its worktree; the workspace adapter supplies
the isolated environment and observed facts.

Read-only target synchronization may use configured repository credentials, but the agent session
does not receive them. Remote mutation belongs exclusively to the delivery port.

## Local-verification port

The local-verification port performs the optional independent final check set selected by policy
and resolved by configuration. It can:

- run one configured verification request against an exact worktree and candidate SHA;
- confirm the observed candidate identity before and after execution;
- return a typed `passed` or `failed` verification report; and
- durably record the required logs and reports through its scoped artifact recorder.

A completed verification operation may report failed checks. That is a valid factual result, not a
port failure. The port fails only when it cannot execute or reliably observe the requested
verification.

The port does not select checks, interpret project-specific acceptability, edit the candidate,
retry by policy, or authorize delivery. If verification mutates tracked candidate content or cannot
prove the checked SHA, it cannot return a passing result.

## Delivery port

The delivery port owns all configured remote mutation and landing observation. Its semantic
capabilities cover:

- observe the current configured target SHA;
- publish an exact story branch SHA for checkpoint or delivery purposes;
- create the one optional pull request using the exact approved title and body;
- observe required remote-check state for the exact delivery candidate;
- request configured direct integration or pull-request merge against an expected target basis;
  and
- confirm whether the configured target contains the approved result.

One adapter may implement only the capability subset required by the selected delivery mode.
Preflight rejects a run when that subset is insufficient.

The port does not decide whether a candidate is approved, weaken required checks, rewrite approved
metadata, resolve conflicts, choose a merge strategy outside configuration, or declare a story
landed without the configured confirmation proof. Target movement, conflict, remote-check failure,
and non-landing are typed factual outcomes returned to the core.

Checkpoint publication and final delivery share this port because both are controlled remote
branch mutations under the same credential boundary. A checkpoint result never implies approval,
pull-request creation, integration, or landing.

## Capability declaration and composition

Each adapter declares a stable capability set and operational limits. Configuration binds one
adapter to each port and supplies concrete settings. Policy selects only semantic behavior supported
by those declared capabilities.

Preflight validates at least:

- every required operation kind has one selected adapter;
- the delivery adapter supports the configured checkpoint and delivery modes;
- the workspace adapter supports the required isolation and cleanup guarantees;
- agent adapters support retained role-specific sessions and required evidence handling;
- verification has the configured command set when enabled;
- event append is atomic; and
- artifact storage can satisfy required kinds, size limits, access, and retention.

Different ports may use the same underlying library or service internally. They remain separately
composed so that one adapter cannot acquire another port's authority through a broad interface.

## Boundaries intentionally not introduced

The first phase does not add:

- a **plan-source port**, because the approved immutable envelope is supplied to the runtime;
- a **host port**, because execution-host mechanics remain inside the selected agent, workspace,
  and verification adapters;
- a **forge port**, because GitHub or another forge is one delivery-port implementation;
- a generic **Git port**, because local workspace authority and remote delivery authority remain
  separate;
- a generic **storage port**, because event facts and artifact content have different contracts;
- an **observability control port**, because observers consume events and cannot control the run;
  or
- a general provider/plugin interface, because it would combine unrelated capabilities and
  authority.

Clock, identifier generation, credential resolution, and adapter construction are trusted runtime
composition services rather than domain effect ports. Their exact design remains part of the later
composition-and-authority slice.

## First-phase invariants

1. Every orchestrated operation maps to exactly one effect port.
2. Event and artifact persistence use separate trusted infrastructure ports.
3. The core depends on typed domain contracts and never on a port implementation.
4. Ports report facts; only the core decides lifecycle transitions.
5. Agent and verification ports have no remote-delivery authority.
6. Workspace authority cannot mutate the configured remote target.
7. Delivery authority cannot edit implementation content or resolve conflicts.
8. Provider-specific values do not cross a port boundary unless wrapped in an opaque reference.
9. Preflight proves required capabilities before any execution effect.
10. Replacing an adapter cannot widen authority or weaken the typed contract.

## Deferred decisions

- Concrete language interfaces and provider adapter APIs.
- Capability-manifest serialization and compatibility rules.
- Credential-resolution, clock, identifier, and adapter-construction mechanics.
- Port-specific timeout, retry, cancellation, and health-check behavior.
- Read-only inspection APIs for completed events and artifacts.
