---
design_id: jig-local-mvp-runtime
handoff_contract: technical-design-handoff-v0
methodology: ddd
methodology_version: "1"
design_status: draft
ddd_depth: use-case-slices
round: 2
---

# Technical Design — Jig Local MVP Runtime (M5a)

This is jig's first engineering design: the local runtime that M5b implements as a thin,
deterministic, dry-run-first walking skeleton. It names every seam of the local runtime and marks
each `exercised` (built and tested in M5b) or `named extension point` (designed shape, no code
yet). It reconciles to jig's product commitments and reuses lessons — not architecture — from the
retiring `workflow-kit` prototype (indexed in [`prior-art-workflow-kit.md`](./prior-art-workflow-kit.md)).

> **Handoff consumer note.** The `technical-design` pack assumes a design hands off to a separate
> Planning layer. jig sits _downstream_ of Planning: this design hands off to **jig's own M5b
> implementation**. The handoff rigor and stable IDs below are preserved; only the consumer
> differs. Recorded as decision [D-003](../decisions/README.md) and flagged as a dogfooding finding for
> the pack (see §14).

## 1. Planner Handoff Summary

The methodology-neutral contract surface. Here the consumer is jig's M5b implementation.

### Handoff Identity

| Field               | Value                            |
| ------------------- | -------------------------------- |
| Design ID           | `jig-local-mvp-runtime`          |
| Handoff contract    | `technical-design-handoff-v0`    |
| Design title        | Jig Local MVP Runtime (M5a)      |
| Status              | `draft`                          |
| Methodology profile | `ddd@1`, `use-case-slices` depth |
| Review round        | `2`                              |

### Source and Product References

| ID      | Type     | Reference                                                                                                | Required for M5b                                                         | Notes                       |
| ------- | -------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------- |
| SRC-001 | decision | `agentic-workflow-kit/.github/MILESTONES.md` (M5 / M5a-M5b Approach)                                     | Dry-run-first scope, posture table, authority-record requirement         | Org milestone               |
| SRC-002 | source   | [`../../product/guarantees.md`](../../product/guarantees.md)                                             | The ID-bearing invariants the runtime must preserve                      | FENCE/MERGE/CFG/SEE/ISO/... |
| SRC-003 | source   | [`../../product/jig.md`](../../product/jig.md)                                                           | Local-first, operator-initiated, runner/worker boundary, preview/dry-run | Product hub                 |
| SRC-004 | source   | [`../../product/concepts.md`](../../product/concepts.md)                                                 | Track/story model, runner=core, product-visible run/story states         | Concepts                    |
| SRC-005 | design   | [`../contracts/execution-plan-contract-v0.md`](../contracts/execution-plan-contract-v0.md)               | Properties the plan validator checks; `reject` on unknown format         | Input seam                  |
| SRC-006 | design   | [`../contracts/observability-records-contract-v0.md`](../contracts/observability-records-contract-v0.md) | Required record properties and event families the dry-run emits          | Output seam                 |
| SRC-007 | design   | [`./prior-art-workflow-kit.md`](./prior-art-workflow-kit.md)                                             | Reference-only lessons carried (cited inline as RL-n)                    | workflow-kit v-next         |
| SRC-008 | design   | [`./problem-frame.md`](./problem-frame.md)                                                               | The intake frame, source map, depth choice                               | This slice's frame          |

### Required Planning Facts

| ID       | Category      | Required handoff data                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Source refs            |
| -------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| CTX-001  | Context       | **Plan Intake & Validation** owns parsing + validating a plan instance against the v0 plan contract and rejecting unknown formats; reads SRC-005; does not own how plans are produced or policy.                                                                                                                                                                                                                                                                                                            | SRC-005                |
| CTX-002  | Context       | **Run Orchestration (Runner)** owns the run+story state machine, eligibility/DAG resolution, and runner-owned (privileged) actions; reads the validated plan, fence decisions, modeled evidence; does not own code-writing (Agent seam) or policy authoring.                                                                                                                                                                                                                                                | SRC-003, SRC-004       |
| CTX-003  | Context       | **Policy & Authorization (Fence)** owns evaluating each worker request against the bound policy and returning grant / deny / route; reads the policy fixture + the request; does not own setting policy or what the worker requests.                                                                                                                                                                                                                                                                        | SRC-002, SRC-003       |
| CTX-004  | Context       | **Run Records & Observability** owns producing durable, ordered, redaction-aware records matching SRC-006; reads events from Orchestration + Fence; does not own Learning-loop interpretation or a storage engine choice.                                                                                                                                                                                                                                                                                   | SRC-006                |
| CTX-005  | Context       | **Driver seams** (Agent, Execution Host, Forge, Work Source) are ports. M5b builds only a scripted-stub adapter at the **Agent** port; all real driver adapters are named extension points.                                                                                                                                                                                                                                                                                                                 | SRC-002 (STACK-2)      |
| INV-001  | Invariant     | Fail-closed authorization (FENCE-1): every worker request is authorized before it executes; an undeclared/unapproved request fails closed. Operands: request, bound policy. Authority: Fence.                                                                                                                                                                                                                                                                                                               | SRC-002                |
| INV-002  | Invariant     | Structural authority separation (FENCE-3, SEC-3, MERGE-2): the Agent-seam port exposes no push/PR/merge/credential method; privileged actions are runner-only via record-intent → evidence predicate → runner execute. Operands: seam contract surface. Authority: Runner + port boundary.                                                                                                                                                                                                                  | SRC-002, SRC-004; RL-5 |
| INV-003  | Invariant     | Policy fixed at launch (GUARD-1): the policy posture is bound at run start and is immutable for the run. Operands: bound `policyRef` in the run record. Authority: Runner/Records.                                                                                                                                                                                                                                                                                                                          | SRC-002                |
| INV-004  | Invariant     | Done is not landed (MERGE-4): a story may reach `done` (evidence met) without `landed`; in dry-run no merge fires, so `landed` is never reached. Operands: story state. Authority: Runner FSM.                                                                                                                                                                                                                                                                                                              | SRC-002, SRC-004       |
| INV-005  | Invariant     | Dependency-aware eligibility (ISO-1): a story is ineligible until its prerequisites land; a blocked story halts its downstream dependents. Operands: dependency graph + story states. Authority: Orchestration eligibility resolver.                                                                                                                                                                                                                                                                        | SRC-002, SRC-005       |
| INV-006  | Invariant     | Records are the evidence (SEE-3): the records the runner decides from are the records the owner inspects; state/summary are **pure projections** of an append-only log, never authored directly. Operands: event log. Authority: Records.                                                                                                                                                                                                                                                                   | SRC-002; RL-2          |
| INV-007  | Invariant     | Reject unknown formats: a plan whose version/compatibility marker is not understood is rejected, not guessed. Operands: plan version marker. Authority: Plan Intake.                                                                                                                                                                                                                                                                                                                                        | SRC-005                |
| INV-008  | Invariant     | Authority exercised in dry-run via two mechanisms — (a) the **Fence** adjudicates each worker request: `requested → granted/denied/routed`; (b) at **landing**, a `done` story's runner-owned push/PR/merge is recorded as `runner-action.skipped-on-dry-run` (recorded, never performed; the worker cannot request these, INV-002). No privileged action fires. Operands: request + decision (a); runner-owned landing action (b). Authority: Fence (a), Runner/Records (b). See §15 for the worked trace. | SRC-001, SRC-002       |
| SURF-001 | Surface       | `OperatorControlPort` — the operator entry point: `previewRun`, `startRun(dryRun)`, `inspectRun`. Invariant: one command → one control-plane call → one audit event, even on invalid input. Edge holds no run logic.                                                                                                                                                                                                                                                                                        | SRC-003; RL-8          |
| SURF-002 | Surface       | `PlanValidator` port: `validate(instance) → ValidatedPlan or Rejection`. Consumers: Orchestration.                                                                                                                                                                                                                                                                                                                                                                                                          | SRC-005                |
| SURF-003 | Surface       | `AgentPort` (worker seam): `requestAction` / `observe` only — **no** privileged method (INV-002). M5b adapter = scripted stub emitting a predetermined request sequence + modeled diff/evidence. Real local adapter = named extension point.                                                                                                                                                                                                                                                                | SRC-004; RL-5          |
| SURF-004 | Surface       | `RunStore` / event-log port: `append(event)` (append-only, single leased writer) + `project(state or summary)` (pure replay). Consumers: Orchestration, Records, Operator inspect.                                                                                                                                                                                                                                                                                                                          | SRC-006; RL-2          |
| SURF-005 | Surface       | `Fence` port: `authorize(request, boundPolicy) → grant, deny, or route(runner-owned to doorbell)`. Assisted posture: fixed CFG-10 category boundary.                                                                                                                                                                                                                                                                                                                                                        | SRC-002 (CFG-10)       |
| SURF-006 | Surface       | `ExecutionHostPort`, `ForgePort`, `WorkSourcePort` — ports defined at design altitude; **no adapters in M5b** (named extension points).                                                                                                                                                                                                                                                                                                                                                                     | SRC-002 (STACK-2)      |
| FAIL-001 | Failure       | Invalid/unknown plan → `plan-rejected` with reason; no run is created (INV-007).                                                                                                                                                                                                                                                                                                                                                                                                                            | SRC-005                |
| FAIL-002 | Failure       | Authorization denied → request fails closed (INV-001); the story is blocked or routed/parked per posture.                                                                                                                                                                                                                                                                                                                                                                                                   | SRC-002                |
| FAIL-003 | Failure       | Story blocked (cannot proceed) → recorded with reason; downstream dependents halt while independent stories continue (ISO-1, ISO-3).                                                                                                                                                                                                                                                                                                                                                                        | SRC-002                |
| FAIL-004 | Failure       | Unattended park needing a human decision → the run ends `stopped` at a recorded, resumable checkpoint (resume itself is a named extension point; the stop state is recorded).                                                                                                                                                                                                                                                                                                                               | SRC-002 (RESUME-4)     |
| OBS-001  | Observability | Run identity + input binding: the run record binds `runId`, `planRef`, `policyRef`, `trackRef` at launch (SRC-006 "Run Identity and Input Binding").                                                                                                                                                                                                                                                                                                                                                        | SRC-006                |
| OBS-002  | Observability | Event families the dry-run emits: `run.previewed/started/completed/stopped`; `plan.accepted/rejected`; `story.eligible/started/done/blocked/parked`; `authorization.requested/granted/denied/routed`; `runner-action.skipped-on-dry-run`; `evidence.modeled`.                                                                                                                                                                                                                                               | SRC-006                |
| OBS-003  | Observability | Each record carries a redaction-posture field (RL-4); real secret scanning is deferred.                                                                                                                                                                                                                                                                                                                                                                                                                     | SRC-006; RL-4          |
| OBS-004  | Observability | A golden run-record fixture is the canonical output artifact and must validate against SRC-006.                                                                                                                                                                                                                                                                                                                                                                                                             | SRC-001, SRC-006       |
| ENF-001  | Enforcement   | The edge (CLI / `OperatorControlPort`) imports no provider/driver contracts and holds no run logic — dependency rule + seeded violation (deferred to M5b `enforce`).                                                                                                                                                                                                                                                                                                                                        | RL-8                   |
| ENF-002  | Enforcement   | The `AgentPort` worker seam exposes no privileged method — type/import rule; a violation should not compile (INV-002).                                                                                                                                                                                                                                                                                                                                                                                      | SRC-004; RL-5          |
| ENF-003  | Enforcement   | Projections never append to the log; only the reducer appends (INV-006) — rule + seeded violation.                                                                                                                                                                                                                                                                                                                                                                                                          | RL-2                   |
| ENF-004  | Enforcement   | Core depends only on ports, not concrete adapters — dependency-direction rule.                                                                                                                                                                                                                                                                                                                                                                                                                              | SRC-002                |
| DEL-001  | Delivery      | Plan Intake & Validation package + the machine-readable plan instance fixture. Preserves CTX-001, INV-007, SURF-002.                                                                                                                                                                                                                                                                                                                                                                                        | SRC-005                |
| DEL-002  | Delivery      | Run Records & Observability: append-only log + pure projections + run-record fixture. Preserves CTX-004, INV-006, OBS-\*.                                                                                                                                                                                                                                                                                                                                                                                   | SRC-006; RL-2,3,4      |
| DEL-003  | Delivery      | Policy & Authorization (Fence): assisted-posture evaluator (fixed category boundary) + policy fixture. Preserves CTX-003, INV-001/003/008, SURF-005.                                                                                                                                                                                                                                                                                                                                                        | SRC-002; RL-6,7        |
| DEL-004  | Delivery      | Run Orchestration: run/story FSM (closed transition table) + eligibility resolver + the dry-run driver + the scripted-worker stub at `AgentPort`. Preserves CTX-002, INV-002/004/005/008.                                                                                                                                                                                                                                                                                                                   | SRC-004; RL-1,5        |
| DEL-005  | Delivery      | Operator entry point (CLI + `OperatorControlPort`) for validate / preview / dry-run. Preserves SURF-001, the one-command-one-call-one-audit invariant.                                                                                                                                                                                                                                                                                                                                                      | SRC-003; RL-8          |
| DEL-006  | Delivery      | Package scaffolding: jig's first TS package(s), tsconfig, vitest, and growing `pnpm check` to lint + typecheck + test.                                                                                                                                                                                                                                                                                                                                                                                      | SRC-001                |

### Sequencing, Contention, Validation, and Stops

| ID       | Category   | Required handoff data                                                                                                                                                                                                           | Source refs      |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| SEQ-001  | Sequencing | Scaffolding (DEL-006) first or alongside DEL-001; Records (DEL-002), Plan Intake (DEL-001), and Fence (DEL-003) before Orchestration (DEL-004), which consumes all three; Entry point (DEL-005) after the control plane exists. | DEL-\*           |
| FILE-001 | Contention | `package.json`, `pnpm-workspace.yaml`, `tsconfig*` — touched only by the scaffolding story (DEL-006). `docs/design/README.md` index — single small edit. Fixtures — each owned by its story. Otherwise low contention.          | DEL-006          |
| VAL-001  | Validation | `pnpm check` green (grown to lint + typecheck + test, TDD 90%+). The plan instance validates against SRC-005. The dry-run integration test produces the golden run-record fixture and it validates against SRC-006.             | SRC-005, SRC-006 |
| STOP-001 | Stop       | If a use case needs a real worker / real Agent driver to pass → stop; that is the next slice (M5b is scripted-stub).                                                                                                            | SRC-001 (D-001)  |
| STOP-002 | Stop       | If any named-extension seam (resume, capability attestation, forge, multi-driver, non-local host) is being written as code → stop (the M5 no-op kill-assumption).                                                               | SRC-001          |
| STOP-003 | Stop       | If a v0 contract needs a breaking field change → stop and route it as feedback to the seam owner; do not silently mutate the contract.                                                                                          | SRC-005, SRC-006 |
| STOP-004 | Stop       | If policy needs anything beyond the fixed assisted category boundary (e.g. model-adjudicated autonomy) → stop (deferred per CFG-10).                                                                                            | SRC-002          |

## 2. Source and Context Audit

| Source                                            | Used for                                                    | Notes                             |
| ------------------------------------------------- | ----------------------------------------------------------- | --------------------------------- |
| `agentic-workflow-kit/.github/MILESTONES.md` (M5) | Scope, posture table, exit criteria, kill-assumptions       | Authoritative scope               |
| `docs/product/guarantees.md`                      | The invariants (FENCE/MERGE/CFG/SEE/ISO/RESUME/GUARD/STACK) | Authoritative product             |
| `docs/product/concepts.md`                        | Run/story model, runner=core, the product-visible state set | Authoritative product             |
| `docs/design/contracts/*-contract-v0.md`          | The input and output seam properties (not frozen schemas)   | jig-owned seams                   |
| `docs/design/notes/problem-frame.md`              | Frame, source map, depth selection                          | This slice's intake               |
| `docs/design/notes/prior-art-workflow-kit.md`     | Reference-only lessons carried (RL-1..10)                   | workflow-kit v-next, never ported |

## 3. Assumptions and Blockers

### Safe Assumptions

- Sequential execution: the MVP plan runs stories sequentially (`maxParallelStories: 1`);
  concurrency and parallel-workspace isolation (ISO-4) are named extension points.
- The v0 contracts are not frozen by this design; needed refinements are routed as feedback
  (STOP-003), never silent schema changes.
- Named-extension seams emit no code; records carry the _shape_ (e.g. a redaction-posture field)
  without implementing the behavior.

### Blocking Questions

- **Resolved — Q1 (worker posture):** scripted-worker stub at the Agent seam; evidence is modeled,
  not executed (decision [D-001](../decisions/README.md)).
- **Resolved — Q2 (policy posture):** assisted (CFG-10 fixed category boundary), decision
  [D-002](../decisions/README.md).

No open blockers.

## 4. DDD Depth

**Selected depth:** `use-case-slices`, with **ports-and-adapters at the four driver seams**.

**Why this depth is sufficient:** the exercised path is a small set of clear commands — validate
plan, preview run, start dry-run, resolve eligibility, authorize request, record event, transition
state — each with explicit input/output contracts, domain errors (fail-closed reject), and test
seams. The driver seams require ports-and-adapters because guarantee 4 (STACK-2/STACK-5) makes
Agent / Execution Host / Forge / Work Source swappable _authority_ boundaries; the ports are
defined now even though M5b builds only the Agent scripted-stub adapter.

**Why deeper tactical ceremony is unnecessary where omitted:** no aggregates, value objects, or
domain-event ceremony in M5b. The run/story lifecycle is a natural future aggregate and the record
stream a natural domain-event model, but tactical-ddd is justified only once a slice exercises
concurrency (ISO-4), resume (RESUME-\*), rich policy, and real drivers — none of which M5 builds.
A later slice escalates depth deliberately rather than by reflex.

## 5. Context Map

| Context                                     | Owns                                                                                              | Reads                                             | Does Not Own                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| Plan Intake & Validation                    | Parse + validate a plan instance; reject unknown formats                                          | The plan instance; the v0 plan contract           | How plans are produced; policy semantics              |
| Run Orchestration (Runner)                  | Run+story FSM; eligibility/DAG; runner-owned privileged actions (recorded-but-skipped in dry-run) | Validated plan; fence decisions; modeled evidence | Code-writing (Agent seam); policy authoring           |
| Policy & Authorization (Fence)              | Evaluate each request → grant / deny / route by fixed CFG-10 category; bind policy at launch      | Policy fixture; the request                       | Setting policy/work profile; what the worker requests |
| Run Records & Observability                 | Durable, ordered, redaction-aware records matching the v0 record contract; pure projections       | Events from Orchestration + Fence                 | Learning-loop interpretation; storage-engine choice   |
| Driver seams (Agent/Host/Forge/Work Source) | Declared capabilities behind ports                                                                | —                                                 | Core decision logic                                   |

## 6. Ubiquitous Language

| Term                              | Meaning                                                                                                    | Owner                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------- |
| Run                               | One operator-initiated execution of a plan under a bound policy                                            | Run Orchestration      |
| Story                             | One reviewable unit of work with its own done conditions                                                   | Run Orchestration      |
| Runner                            | jig-core trusted component holding privileged authority; not a seam                                        | Run Orchestration      |
| Worker                            | The contained Agent-seam role; requests work, never holds credentials or privileged methods                | Driver seams (Agent)   |
| Fence                             | The authorization function: authorize-before-execute, fail-closed                                          | Policy & Authorization |
| Assisted posture                  | CFG-10 fixed category boundary: auto-grant reversible/non-privileged/non-rule-governing; route the rest    | Policy & Authorization |
| Dry-run                           | A side-effect-free run: no privileged action fires; evidence is modeled; records are real                  | Run Orchestration      |
| Preview                           | A pre-run inspection of what would run (eligibility/DAG) without creating a run                            | Run Orchestration      |
| Modeled evidence                  | Records of what a story's done conditions require + that the authority decision was made; not executed     | Run Records            |
| Scripted-worker stub              | The M5b Agent-port adapter that emits a predetermined request sequence + a modeled diff/evidence           | Driver seams (Agent)   |
| Recorded-but-skipped              | A runner-owned privileged action that is recorded as authorized then deliberately not performed in dry-run | Run Orchestration      |
| Exercised / named extension point | A seam built+tested in M5b / a seam designed but left as a port with no adapter code yet                   | This design            |

## 7. Domain Behavior

| Command / Use Case      | Actor    | Invariant guarded         | Result                                                             |
| ----------------------- | -------- | ------------------------- | ------------------------------------------------------------------ |
| ValidatePlan            | Operator | INV-007                   | `ValidatedPlan` or `plan-rejected` (FAIL-001); no run on reject    |
| PreviewRun              | Operator | INV-005                   | Eligibility/DAG view + `run.previewed` audit event; no run created |
| StartDryRun             | Operator | INV-003, INV-008          | A run bound to plan+policy; `run.started`; stories begin walking   |
| ResolveEligibility      | Runner   | INV-005                   | The next eligible story, or none; `story.eligible`                 |
| AuthorizeRequest        | Fence    | INV-001, INV-002, INV-008 | `grant` / `deny` / `route`; `authorization.*` records              |
| RecordRunnerOwnedAction | Runner   | INV-002, INV-008          | `runner-action.skipped-on-dry-run` (recorded, not performed)       |
| RecordEvent             | Records  | INV-006                   | Append-only event; projections updated by replay                   |
| TransitionStory         | Runner   | INV-004                   | Story → done / blocked / parked (never `landed` in dry-run)        |
| CompleteRun             | Runner   | INV-004, INV-006          | Run → `completed` (all terminal) or `stopped` (unattended park)    |

## 8. Invariant and State Matrix

Invariants are tabulated in the Planner Handoff Summary (INV-001..008) with operands and authority.
The state machine the FSM enforces (closed transition table, RL-1):

- **Run states:** `created → previewed?` → `started → running ⇄ parked → completed | stopped`.
  Terminal: `completed` (all stories terminal without a needed human) or `stopped` (clean halt at a
  resumable checkpoint when an unattended park needs a human).
- **Story states (product-visible, SRC-004):** `eligible → started → (parked _transient_) →
done | blocked | rejected`. `landed` is reachable in product but **not in dry-run** (no merge
  fires; INV-004). `parked` resolves to proceed or `rejected`; unattended, it drives the run to
  `stopped`.

Illegal transitions are a test-time fact, not a runtime guard (RL-1). Recovery/backward edges are
out of M5b scope (resume = named extension point); the table simply omits them.

## 9. Ports, Adapters, and Public API

| Surface               | Type        | Owner                  | Consumers                   | Enforcement                         |
| --------------------- | ----------- | ---------------------- | --------------------------- | ----------------------------------- |
| `OperatorControlPort` | Public API  | Operator edge          | CLI, future MCP/tool        | ENF-001 (edge imports no providers) |
| `PlanValidator`       | Domain port | Plan Intake            | Orchestration               | Import/contract test                |
| `Fence`               | Domain port | Policy & Authorization | Orchestration               | INV-001 fail-closed test            |
| `RunStore` / log      | Domain port | Run Records            | Orchestration, Operator     | ENF-003 (only reducer appends)      |
| `AgentPort`           | Domain port | Driver seams (Agent)   | Orchestration               | ENF-002 (no privileged method)      |
| `ExecutionHostPort`   | Domain port | Driver seams           | Orchestration               | Named extension point (no adapter)  |
| `ForgePort`           | Domain port | Driver seams           | Runner (privileged)         | Named extension point (no adapter)  |
| `WorkSourcePort`      | Domain port | Driver seams           | Plan Intake / Orchestration | Named extension point (no adapter)  |

**Dependency direction:** core (contexts) depends only on ports; adapters depend on core; the edge
imports no provider contracts. The only adapter built in M5b is the Agent scripted stub.

## 10. Data, Query, and Consistency

- **Write model:** an append-only run event log with a single leased writer (RL-2). Each governed
  decision is one appended event; no in-place mutation. M5b's minimal store is **local append-only
  JSONL behind the `RunStore` port**, with the concrete storage engine left a deferred seam (the v0
  record contract defers encoding).
- **Read model:** `state` and `summary` are pure projections rebuilt by replay (INV-006); operator
  `inspect` reads projections. Metric/observation fields use an honest tri-state
  (`available/partial/unavailable`), never coerced (RL-3).
- **Consistency:** the log is the single source of truth (records ARE the evidence, SEE-3). The
  record model keeps repeatable work distinct from irreversible actions so idempotent resume
  (RESUME-3) remains possible later, but no-double-effect handling itself is a named extension
  point.

## 11. Failure, Observability, Migration, and Deploy

- **Failure modes:** fail-closed on unknown plan (FAIL-001), denied authorization (FAIL-002),
  blocked story (FAIL-003), and unattended park → clean `stopped` (FAIL-004). The default when the
  runtime cannot justify proceeding is a recorded stop, not a guess (DOOR-1/RESUME-4).
- **Observability:** the run record (OBS-001..004) is the product surface; the dry-run emits the
  event families in OBS-002, each redaction-aware (OBS-003); the golden run-record fixture
  (OBS-004) validates against the v0 record contract.
- **Migration/deploy:** this is jig's **first real package**. M5b stands up tsconfig, the test
  runner, and build, and grows `pnpm check` from prettier-only to lint + typecheck + test. No data
  migration; the runtime is local and operator-run. The package decomposition is design-named here
  (DEL-001..006) and was previously intentionally empty.

## 12. Testing and Enforcement

| Claim                                                           | Proof                                                                         | Standing gate            |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------ |
| Plan validation rejects unknown formats (INV-007)               | Unit tests over valid + seeded-invalid plan instances                         | `pnpm check` (test lane) |
| Fence is fail-closed (INV-001) and exercised (INV-008)          | Unit tests; the dry-run integration test asserts the authority record chain   | `pnpm check`             |
| Worker seam has no privileged method (INV-002)                  | Type/import test; the privileged-method case must not compile                 | `pnpm check` (typecheck) |
| Projections never author the log (INV-006)                      | Unit test + dependency rule with a seeded violation                           | `enforce` (M5b)          |
| Edge holds no run logic (ENF-001)                               | Dependency-cruiser rule with a seeded violation                               | `enforce` (M5b)          |
| End-to-end dry-run emits the v0 record shape (OBS-004)          | Integration test producing the golden run-record fixture                      | `pnpm check`             |
| Dependency-aware eligibility holds a dependent (INV-005, ISO-1) | Integration trace asserts STORY-B held `waiting` until its prerequisite lands | `pnpm check`             |
| Blocked path + downstream halt (FAIL-003, ISO-3)                | Integration trace asserts STORY-D `blocked` and STORY-E halted                | `pnpm check`             |
| Fence emits `denied` (FENCE-1, fail-closed)                     | Integration trace asserts a `denied` record for an out-of-scope request       | `pnpm check`             |
| Core depends only on ports, not adapters (ENF-004)              | Dependency-cruiser rule with a seeded violation                               | `enforce` (M5b)          |

The `enforce` stage (CI architecture rules with seeded violations) is **out of M5a scope** — it
needs code to bound. This table is the enforcement _map_ M5b realizes; rule generation and seeded
violations land in M5b. For M5a each `ENF-*` is a **manual-only design assertion** (there is no
code to bound yet); each acquires a seeded violation when M5b realizes it.

## 13. Delivery Inputs

- **Candidate story areas:** DEL-001..006 above (scaffolding, plan intake, records, fence,
  orchestration + scripted stub, operator entry point).
- **Sequencing constraints:** SEQ-001 — scaffolding first; records/intake/fence before
  orchestration; entry point last.
- **File contention:** FILE-001 — scaffolding owns `package.json`/`tsconfig`/workspace; fixtures and
  the README index are small, single-owner edits.
- **Validation expectations:** VAL-001 — `pnpm check` green; the plan validates against the input
  seam; the golden run-record integration test asserts the §15 trace (the full
  `granted`/`denied`/`routed` triad and the `done`/`blocked`/`parked`/`waiting` states) and
  validates against the output seam; TDD 90%+.
- **Per-DEL refs:** VAL-001 validates every DEL-\* area and STOP-001..004 bound them all;
  story-specific stops: DEL-001 → STOP-003, DEL-003 → STOP-004, DEL-004 → STOP-001/002.
- **Stop conditions:** STOP-001..004 — real worker, named-extension code, breaking contract change,
  or beyond-assisted policy all halt and return to design/owner.

## 14. Risks and Deferred Decisions

- **Named extension points (designed, not built):** the real Agent and local Execution Host
  adapters, the Forge and Work Source adapters, resume/recovery, capability attestation, liveness,
  concurrency/parallel isolation, and rich redaction/secret-scanning. Building any as code in M5b
  trips the M5 no-op kill-assumption (STOP-002).
- **Deferred tactical depth:** aggregates and a domain-event model for the run/story lifecycle and
  record stream — revisit when a slice exercises concurrency, resume, or real drivers (§4).
- **Decision [D-001](../decisions/README.md):** scripted-worker stub (modeled evidence). Risk: a modeled
  dry-run proves the control plane and record contract but not real worker integration — accepted,
  because that is the explicit M5 goal and the real worker is a bounded follow-on (RL-9,10).
- **Decision [D-002](../decisions/README.md):** assisted policy posture. Risk: manual posture is not
  exercised — accepted; it is a narrower behavior the same Fence supports later.
- **Decision [D-003](../decisions/README.md) — dogfooding finding:** the `technical-design` pack's required
  "Planner Handoff Summary" assumes a separate Planning consumer; a delivery engine designing its
  own internals hands design → implementation in-repo. Reframed here without loss of rigor; flag to
  the pack's `lessons-ledger` so future profiles name the in-repo design→implementation consumer.

## 15. Worked Dry-Run Trace (canonical M5b fixture)

The exercised path is only proven if a concrete dry-run produces the authority and state records.
This is the canonical fixture M5b's golden integration test asserts. Illustrative only — field
names follow the v0 record contract's intent, not a frozen schema.

### Fixture plan

Five stories under the assisted policy, `maxParallelStories: 1`, exercising the full surface the
slice claims. Each story's scripted stub emits a fixed request sequence.

| Story   | Depends on | Stub emits                              | Demonstrates                                          |
| ------- | ---------- | --------------------------------------- | ----------------------------------------------------- |
| STORY-A | —          | `edit-files`, `run-checks` (reversible) | auto-grant; `done` (not landed); runner-owned skip    |
| STORY-B | STORY-A    | (never starts)                          | eligibility gate-and-hold (INV-005, strict ISO-1)     |
| STORY-C | —          | `edit-rule-governing-file`              | recognized rule-governing change → `routed`; `parked` |
| STORY-D | —          | `edit-file` outside its declared scope  | out-of-scope request → `denied` (FENCE-1); `blocked`  |
| STORY-E | STORY-D    | (never starts)                          | downstream halt behind a blocked prerequisite (ISO-3) |

Done-evidence for STORY-A: one `automated-check` (`pnpm check`), modeled as met.

### Eligibility under dry-run (decision D-005: strict ISO-1 hold)

In a dry-run nothing **lands** (landing is globally suppressed). Per decision D-005, dry-run keeps
ISO-1 literal: a dependent is eligible only once its prerequisite **lands**, so dependents of a
`done`-but-unlanded story stay ineligible and are recorded `story.waiting`; they never advance in a
dry-run. The resolver is exercised in gate-and-hold mode (it correctly withholds STORY-B and
STORY-E); release is unreachable in a dry-run by construction. A dry-run reaches a terminal when no
story is **actionable**: `run.completed` if that happens with no human needed, or `run.stopped` if
an unattended `parked` story needs a decision.

### Trace

| Step | Event                                                                                    | Mechanism                 |
| ---- | ---------------------------------------------------------------------------------------- | ------------------------- |
| 1    | `run.started` — binds `planRef`, `policyRef`, `trackRef` (INV-003)                       | Runner                    |
| 2    | `story.eligible` + `story.started` STORY-A                                               | Runner (INV-005)          |
| 3    | `authorization.requested` (edit-files) → `authorization.granted` (reversible)            | Fence (INV-001, assisted) |
| 4    | `authorization.requested` (run-checks) → `authorization.granted`                         | Fence                     |
| 5    | `evidence.modeled` (`pnpm check`: required, modeled-met)                                 | Records (modeled)         |
| 6    | `story.done` STORY-A — evidence met, **not landed**; `mergeability: not-evaluated`       | Runner (INV-004)          |
| 7    | `runner-action.skipped-on-dry-run` — would push → open-PR → merge STORY-A                | Runner landing (INV-008b) |
| 8    | `story.waiting` STORY-B — prerequisite STORY-A `done` but not landed (held)              | Runner (INV-005, ISO-1)   |
| 9    | `story.eligible` + `story.started` STORY-C                                               | Runner                    |
| 10   | `authorization.requested` (edit-rule-governing-file) → `authorization.routed` (doorbell) | Fence (GUARD-2)           |
| 11   | `story.parked` STORY-C — waiting on owner                                                | Runner                    |
| 12   | `story.eligible` + `story.started` STORY-D                                               | Runner                    |
| 13   | `authorization.requested` (edit out-of-scope) → `authorization.denied` (fail-closed)     | Fence (FENCE-1)           |
| 14   | `story.blocked` STORY-D — required action denied; reason recorded                        | Runner (FAIL-003)         |
| 15   | `story.waiting` STORY-E — prerequisite STORY-D `blocked`, halted downstream              | Runner (ISO-3)            |
| 16   | `run.stopped` — unattended park (STORY-C); resumable checkpoint                          | Runner (FAIL-004)         |

This proves both authority mechanisms (INV-008): (a) the Fence adjudicates worker requests —
`granted` (steps 3–4), `routed` (10), and `denied` (13), the full triad named in OBS-002; (b) the
runner-owned push/PR/merge of a `done` story is recorded-but-skipped at **landing** (7) — the
worker never requests these (INV-002), so "runner-owned" records come from the landing phase, not a
routed request. State coverage: `done` (6), `waiting`/held (8, 15), `parked` (11), `blocked` (14),
and run `stopped` (16). INV-004 is satisfied **trivially** here — dry-run suppresses landing
globally, so the mergeability-**held** form of done-not-landed (which needs the Forge seam) is
deferred; the `story.done` record carries `mergeability: not-evaluated` rather than silently
omitting the contract-named field. The run ends `stopped` because STORY-C parked unattended.

**Held-dependent variant:** a plan of STORY-A plus its held dependent STORY-B ends `run.stopped`:
STORY-A reaches `done`, but dry-run suppresses landing, so STORY-B stays `waiting` — never
eligible — and no further progress is possible. Whether a dry-run can legitimately reach
`run.completed` given that nothing lands is a question to resolve when the design is deepened.
This fixture exercises the `stopped` terminal; `completed`-in-dry-run is deferred.

### Illustrative record (excerpt)

```json
{
  "run": {
    "id": "run-m5-dry-001",
    "planRef": "plan-m5-mvp@execution-plan-shape-v0",
    "policyRef": "policy:assisted-v0",
    "mode": "dry-run"
  },
  "events": [
    {
      "family": "authorization.granted",
      "storyId": "STORY-A",
      "request": "edit-files",
      "category": "reversible",
      "basis": ["policy:assisted-v0", "CFG-10:reversible"],
      "redaction": "safe-for-owner-record"
    },
    {
      "family": "story.done",
      "storyId": "STORY-A",
      "outcome": "done-not-landed",
      "mergeability": "not-evaluated",
      "basis": ["evidence.modeled"],
      "redaction": "safe-for-owner-record"
    },
    {
      "family": "runner-action.skipped-on-dry-run",
      "storyId": "STORY-A",
      "action": "push|open-pr|merge",
      "reason": "dry-run",
      "redaction": "safe-for-owner-record"
    },
    {
      "family": "story.waiting",
      "storyId": "STORY-B",
      "reason": "prerequisite-not-landed",
      "dependsOn": "STORY-A",
      "redaction": "safe-for-owner-record"
    },
    {
      "family": "authorization.routed",
      "storyId": "STORY-C",
      "request": "edit-rule-governing-file",
      "route": "doorbell",
      "basis": ["GUARD-2"],
      "redaction": "safe-for-owner-record"
    },
    {
      "family": "story.parked",
      "storyId": "STORY-C",
      "outcome": "waiting-on-owner",
      "redaction": "safe-for-owner-record"
    },
    {
      "family": "authorization.denied",
      "storyId": "STORY-D",
      "request": "edit-out-of-scope",
      "basis": ["FENCE-1", "out-of-declared-scope"],
      "redaction": "safe-for-owner-record"
    },
    {
      "family": "story.blocked",
      "storyId": "STORY-D",
      "reason": "required-action-denied",
      "redaction": "safe-for-owner-record"
    },
    {
      "family": "story.waiting",
      "storyId": "STORY-E",
      "reason": "prerequisite-blocked",
      "dependsOn": "STORY-D",
      "redaction": "safe-for-owner-record"
    },
    {
      "family": "run.stopped",
      "reason": "unattended-park",
      "checkpoint": "after:STORY-C.parked",
      "redaction": "safe-for-owner-record"
    }
  ]
}
```
