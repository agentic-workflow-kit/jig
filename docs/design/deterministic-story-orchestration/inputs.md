---
title: "Deterministic story orchestration — inputs"
status: proposal — agreed design, not yet reconciled or adopted
---

# Inputs

This layer defines the complete input boundary for the
[deterministic story orchestration proposal](README.md). It stays at the functional level;
field-level schemas, serialization, and compatibility mechanics remain deferred.

## Input boundary

Every run begins with three already-prepared and already-approved inputs:

- the **plan**, which says what must be delivered;
- the **policy**, which says which uniform delivery rules govern the run; and
- the **configuration**, which supplies the concrete environment and capabilities used to apply
  those rules.

The three inputs form one execution envelope. Approval happens upstream. The orchestrator does not
ask for routine human approval after receiving the envelope; it validates the envelope and either
starts the run or rejects it before any side effect.

Input production, classification, compilation, and approval are outside this proposal.

## Plan: what must be delivered

The plan defines one run over one logical repository and one logical integration target. The
configuration resolves those logical identities to concrete locations.

The plan provides:

- the stories in the run;
- each story's requirements and acceptance criteria;
- the dependency graph;
- relevant implementation context or references;
- priority when multiple stories are eligible; and
- each story's approved size and complexity classifications.

The plan does not name concrete agent providers, models, reasoning-effort settings, commands, or
credentials. It does not override run policy for an individual story.

### Story size and complexity

Every story must declare both characteristics:

- **Size** is the estimated amount of work: `small`, `medium`, or `large`.
- **Complexity** is the expected reasoning difficulty or uncertainty: `low`, `medium`, or `high`.

They remain independent. A large, low-complexity story may need more time without needing a
stronger model. A small, high-complexity story may need little implementation time while requiring
stronger reasoning and review.

The classifications are approved plan facts. The orchestrator never infers, defaults, or changes
them. An agent may report that a classification appears unsuitable, but the first phase either
continues under the resolved route or blocks when that route cannot complete the story.

## Policy: uniform delivery decisions

One immutable policy applies to every story in the run. Stories cannot override it. Different
stories may receive different resolved routes only because the same deterministic routing rules
consume their different approved classifications.

Policy governs:

- routing from size and complexity to logical implementer and reviewer profiles, abstract effort
  tiers, resource allowances, and session budgets;
- maximum concurrent active stories;
- required implementer checks, required evidence, and reviewer responsibilities;
- whether independent final local verification is required;
- review-fix and target-refresh limits;
- checkpoint timing and whether checkpoint failure is best-effort or blocking;
- delivery mode, such as direct integration, branch push, or pull request;
- required merge conditions and delivery confirmation;
- failure classification, downstream blocking, and whether unrelated work continues;
- agent and effect permissions;
- cleanup and evidence-retention requirements; and
- resource-limit outcomes.

Policy expresses decisions rather than concrete mechanisms. For example, policy says that a final
local verification is required; configuration supplies the command that performs it.

## Configuration: concrete execution capabilities

Configuration supplies the concrete values and integrations required to execute the plan under
policy:

- repository location, remote, target branch, and worktree environment;
- available agent providers and session capabilities;
- mappings from logical implementer and reviewer profiles to concrete models, provider-specific
  effort, tool permissions, and runtime ceilings;
- actual session capacity and infrastructure limits;
- setup commands and the commands assigned to implementer checks;
- the command set for independent final local verification;
- delivery-provider capabilities and connection details;
- branch, worktree, and operational naming conventions;
- operational timeouts and environment constraints; and
- credential references, never embedded secret values.

Configuration declares capabilities and ceilings. Policy cannot grant a capability the configured
environment does not provide.

## Boundary test

Use these questions when deciding where an input belongs:

- If changing it changes the requested product outcome, it belongs in the plan.
- If changing it expresses a different delivery decision or constraint, it belongs in policy.
- If changing it selects a concrete repository, provider, model, command, environment, or value,
  it belongs in configuration.

Examples:

| Decision                                                                  | Input         |
| ------------------------------------------------------------------------- | ------------- |
| Story B depends on Story A                                                | Plan          |
| A story is small and highly complex                                       | Plan          |
| High-complexity stories use the advanced logical reviewer profile         | Policy        |
| The advanced reviewer profile resolves to a particular provider and model | Configuration |
| Push every committed round                                                | Policy        |
| Push to a concrete remote                                                 | Configuration |
| Permit three concurrent stories                                           | Policy        |
| Only two session slots are currently available                            | Configuration |

## Deterministic routing

Before execution, policy routes each story's size and complexity to separate logical profiles for
its implementer and reviewer. The two roles need not use the same model class or effort. The route
also supplies the story's abstract resource allowance and session budget.

Configuration resolves those logical profiles to concrete provider settings. This indirection
keeps model names out of plans and routing intent independent of one provider.

The fully resolved route is frozen for the story before the run starts. In the first phase:

- the orchestrator does not select a model through judgment;
- the route does not change when a story proves harder than expected;
- budget exhaustion or an unusable route blocks the story and its transitive dependents; and
- unrelated stories continue.

Future policy may define deterministic fallback or escalation chains without changing the plan or
giving routing judgment to the orchestrator.

## Checks and evidence responsibilities

Inputs assign mandatory validation responsibilities ahead of execution. They define which checks
exist, who owns them, when they run, what evidence they produce, and which later actors consume
that evidence.

### Implementer-owned checks

The implementer runs every assigned check before committing and submitting a candidate, both
initially and after every implementation, fix, or target-refresh round. A candidate is submitted
only when:

1. its assigned checks passed;
2. the checked content was not changed before commit;
3. the resulting candidate is committed; and
4. the evidence can be associated with that exact committed content.

The reviewer consumes this evidence and does not rerun the same checks merely for confirmation.
The orchestrator validates evidence presence, provenance, success, and association with the
candidate; it does not interpret project-specific output.

### Additional diagnostics

Mandatory checks and reviewer requirements are fixed ahead of time. Implementer and reviewer may
run additional safe diagnostics when useful for implementation or investigation. Those
diagnostics provide supporting information but do not silently become new delivery gates or
weaken an existing gate.

### Final local verification

Policy has two final-local-verification modes:

| Mode            | Behavior                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `deterministic` | Default. After approval and target alignment, schedule the configured final checks once against the exact approved candidate before delivery. |
| `none`          | Trust the implementer's recorded check evidence and proceed directly to delivery.                                                             |

The deterministic mode is an intentional independent confirmation, not another agent review. The
orchestrator core dispatches it through the narrow local-verification interface and consumes a
typed result; it does not run or interpret project commands itself.

Remote continuous integration is not a third local-verification mode. When delivery creates a pull
request, its normal remote checks still run and must satisfy the configured delivery environment
before merge. Policy may choose local deterministic verification or none before that PR lifecycle.

## Immutability

The plan, policy, and configuration are frozen when execution starts. Preflight also records each
story's resolved route, and those resolutions are frozen with the input envelope.

Runtime facts may change without changing the inputs, including:

- the current target SHA;
- temporarily available capacity within the configured ceiling;
- agent-session health;
- check and delivery outcomes; and
- remote pull-request state.

Adding, removing, changing, or reordering stories; changing policy; changing concrete
configuration; or changing a resolved route creates a new run for the remaining work. A future
explicit pause-and-reconfigure capability is outside the first phase.

## Preflight resolution

Preflight validates the complete envelope before creating a worktree, spawning an agent, pushing a
branch, or performing another side effect. It must confirm at least that:

- the plan contains no invalid or cyclic dependency graph;
- the run names one repository and one integration target;
- every story has requirements, acceptance criteria, size, and complexity;
- every classification combination has one deterministic implementer route and reviewer route;
- every logical profile resolves to an available concrete configuration;
- required commands, effect capabilities, and delivery mechanisms exist;
- policy does not exceed configured permissions or capacity ceilings;
- required checks and reviewer responsibilities have owners; and
- the selected delivery mode can satisfy its required gates.

Missing classifications, unmatched routes, unsupported policy, unavailable required capabilities,
or contradictory inputs reject the entire run before side effects. Preflight does not partially
start the subset it can resolve.

Once preflight succeeds, the orchestrator records the immutable envelope and resolved routes, then
begins the [story-execution lifecycle](story-execution.md).
