---
title: M5a problem frame — Jig local MVP runtime
status: draft — frame (intake)
methodology: ddd
---

# Problem Frame — M5a Jig Local MVP Runtime

> Intake artifact for the DDD-first technical design of Jig's first local execution slice (M5a).
> It records source evidence, assumptions, blockers, context candidates, and initial DDD depth
> before authoring. Produced by applying the `technical-design` pack's `frame-technical-design`
> skill; the next stage is `author-technical-design`.

## 1. Scope and Goal

- **Source request:** org milestone **M5a** (`agentic-workflow-kit/.github/MILESTONES.md`, milestone M5 _Approach_) —
  name the full local-runtime architecture at high altitude and mark each seam's M5 posture so
  M5b can implement a thin walking skeleton. M5a is what satisfies M5 entry criterion 3 ("Jig
  design has named the first local execution host and the minimum policy posture"), currently
  unmet.
- **Goal:** a jig-local design that names every seam of the local runtime and, for each, whether
  M5b builds it now (`exercised`) or leaves it a designed-but-unbuilt `named extension point`. The
  exercised path is the dry-run vertical: validate and preview one machine-readable
  execution-plan instance, walk its stories under a policy fixture, invoke the authorization
  fence and emit the `requested -> authorized/denied -> runner-owned` record chain, end in named
  inspectable states, and emit durable records matching the observability v0 record shape. No
  privileged action (push, PR creation, merge) fires.
- **Out of scope:** real worker code execution and the Agent / Execution-Host drivers (named
  extension points — see Q1); the privileged side effects of push/PR/merge (runner-owned,
  recorded-but-skipped in dry-run); multi-driver portability and forge integration (MERGE-5 PR
  surfacing); resume (RESUME-\*); capability attestation (EARN / DRIVE); liveness (LIVE-\*);
  concurrency and parallel-workspace isolation (ISO-4) beyond sequential; the Learning loop;
  freezing the v0 contract schemas; and any package decomposition beyond what this design names.

## 2. Source Map

| Source                                                                                                   | Authority                | Establishes                                                                                                                                  | Gaps / stale risk                                                                                     |
| -------------------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `agentic-workflow-kit/.github/MILESTONES.md` (M5 / M5a-M5b)                                              | authoritative — scope    | M5a/M5b split, the per-seam posture table, dry-run-first exit criteria, the authority-record requirement, and the no-op kill-assumption      | Leaves "worker posture in dry-run" (Q1) and "minimum policy posture" (Q2) to this design              |
| [`../../product/jig.md`](../../../product/jig.md)                                                        | authoritative — product  | Local-first execution host now; operator-initiated; preview and dry-run are first-class driving actions; "no model decides"                  | None material to this slice                                                                           |
| [`../../product/guarantees.md`](../../../product/guarantees.md)                                          | authoritative — ID spec  | The invariants the design must preserve: FENCE-1..3, MERGE-1..5, CFG-1..10, RESUME-\*, ISO-\*, SEE-1..6, STACK/DRIVE                         | These are outcome commitments, not field schemas; design reconciles to them                           |
| [`../../product/concepts.md`](../../../product/concepts.md)                                              | authoritative — concepts | Runner = Jig-core (not a seam); the four swappable seams; product-visible story states (landed/done/rejected/blocked/parked) and run stopped | Defines the named end-states the slice must reach                                                     |
| [`../../product/use-cases.md`](../../../product/use-cases.md)                                            | supporting               | Worked full-run scenarios (overnight epic, doorbell, resume, swap agent)                                                                     | Broader than the M5 slice; informs direction, not M5b scope                                           |
| [`../contracts/execution-plan-contract-v0.md`](../contracts/execution-plan-contract-v0.md)               | authoritative — in seam  | Required plan properties the validator checks; `unknownFormatBehavior: reject`                                                               | v0 shape, not a frozen schema; M5 still needs a concrete machine-readable instance (its own artifact) |
| [`../contracts/observability-records-contract-v0.md`](../contracts/observability-records-contract-v0.md) | authoritative — out seam | Required record properties and the event families the dry-run emits                                                                          | v0 shape, not frozen; redaction/retention richness deferred                                           |
| `technical-design` ddd profile + altitude ladder                                                         | background — method      | Required DDD artifacts and the depth ladder                                                                                                  | None                                                                                                  |

## 3. Assumptions and Blockers

### Safe Assumptions

- **Artifact home.** M5a artifacts live under `docs/design/notes/` (this frame, a forthcoming
  `../decisions/README.md`, and the author design doc), reconciling with — not replacing — the two
  top-level v0 contracts. `docs/design/README.md` gains a pointer and drops "M5 MVP
  implementation planning" from its Deferred list when the author doc lands. Safe because it
  groups the slice without touching the seam contracts; override if you prefer a flat layout.
- **Sequential execution.** The MVP plan runs stories sequentially (the plan contract's example
  uses `maxParallelStories: 1`); concurrency and parallel-workspace isolation (ISO-4) are named
  extension points.
- **Contracts stay unfrozen.** M5a does not freeze the v0 contracts. If the slice surfaces a
  needed field-level refinement, the design records it as feedback to the seam (owned by jig
  itself), never a silent schema change.
- **Named-extension seams emit no code.** Resume, capability attestation, the
  Agent/Forge/Work-Source/non-local-Host drivers, liveness, and rich redaction stay design-only.
  Records carry the _shape_ (e.g. a redaction-posture field) without implementing secret scanning.

### Blocking Questions — status

Both are informed by the `workflow-kit` v-next reuse surveys; lessons cited live in
[`prior-art-workflow-kit.md`](./prior-art-workflow-kit.md).

- **Q1 — Worker / Execution-Host posture in the dry-run. (Resolved: scripted-worker stub.)**
  Survey evidence: the prototype has no dry-run pipeline to harvest (its
  `previewRun` is a shallow candidate-count lookup), and a _thin real local worker_ is buildable
  but its heavy parts are gated behind autonomy, making it a clean follow-on. **Resolution:** M5b
  exercises the deterministic control plane (Plan Intake -> Runner -> Fence -> Records) with a
  **scripted-worker stub at the Agent seam** — a fixture adapter that emits a predetermined
  request sequence and a modeled diff/evidence. Evidence is therefore **modeled, not executed**;
  the real Agent and real local Execution Host stay `named extension point`. Rationale: a scripted
  stub makes the dry-run deterministic (required for the golden run-record fixture and TDD), keeps
  the unproven agent driver out of the first slice, and loses nothing because the real local worker
  is a known, bounded follow-on (reuse-log lessons 9-10). Honors the merged M5 posture table (Agent
  driver = named extension point).
- **Q2 — Minimum policy posture for v0. (Resolved: assisted.)** The first policy fixture uses the
  **assisted** posture — CFG-10's fixed category boundary: auto-grant reversible, non-privileged,
  non-rule-governing requests; route credentials / push / merge / rule-governing changes to the
  runner-owned path or the doorbell. This lets the unattended dry-run exercise a genuine authorize
  / deny / route decision end-to-end. Independently corroborated by the prototype, which also
  structurally defers model-adjudicated autonomy (reuse-log lesson 7).

## 4. DDD Context Candidates

| Candidate context                                               | Owns                                                                                                                                       | Reads                                               | Does Not Own                                             | Open ownership question                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| **Plan Intake & Validation**                                    | Parse a machine-readable plan instance; validate it against `execution-plan-contract-v0`; reject unknown/incompatible formats              | The plan instance; the plan contract                | How the plan was produced (Planning); policy semantics   | None                                                            |
| **Run Orchestration (Runner)**                                  | Run + story lifecycle/state machine; eligibility/DAG resolution; holding privileged authority and performing/skipping runner-owned actions | Validated plan; authorization decisions; evidence   | The worker's code-writing (Agent seam); policy authoring | Is preview its own use case or a mode of the run lifecycle?     |
| **Policy & Authorization (Fence)**                              | Evaluate each worker request against the policy fixture; authorize / deny / route by CFG-10 category; fix policy at launch (GUARD-1)       | Policy fixture; the request; plan authority expects | Setting policy/work profile; what the worker requests    | Manual vs assisted minimum (Q2)                                 |
| **Run Records & Observability**                                 | Produce durable, ordered, redaction-aware records matching `observability-records-v0`; the event families; export posture                  | Events from Orchestration and Authorization         | Learning-loop interpretation; storage-engine specifics   | None                                                            |
| _(seams)_ **Drivers — Agent / Exec Host / Forge / Work Source** | Declared capabilities behind ports                                                                                                         | —                                                   | Core decision logic                                      | Which, if any, gets a trivial local adapter in M5b (depends Q1) |

## 5. Complexity Drivers

- **Invariants:** FENCE-1 fail-closed (every worker request authorized before it executes);
  FENCE-3 / SEC-3 (worker never holds credentials); MERGE-2 (push/PR/merge are runner authority);
  GUARD-1 (policy fixed at launch); MERGE-4 (done is not landed); ISO-1 (a story is ineligible
  until prerequisites land); SEE-3 (records are the evidence — no parallel narrative).
- **State transitions:** story lifecycle — eligible -> started -> parked _(transient)_ /
  blocked / done / landed / rejected; run lifecycle — previewed -> started -> stopped / resumed /
  completed. The named, inspectable end-states are an M5 exit criterion; this is the core
  complexity the slice walks (happy path plus the gated and blocked branches).
- **Integrations / anti-corruption:** the four driver seams (STACK-2). Keep core decision logic
  independent of any concrete agent/host/forge/work-source — ports-and-adapters at these seams. In
  M5b most have no adapter (named extension points).
- **Consistency / idempotency / replay / audit:** records are append-only and ordered well enough
  for replay/resume (the RESUME basis) and export write-once, redacted-by-default (SEE-6).
  No-double-effect idempotency (RESUME-3) is a resume concern — a named extension point — but the
  record model must not foreclose it.
- **Security / fail-closed:** authorization is the spine and is `exercised`; SEC-1
  redaction-by-default is a record-shape obligation (posture field present; scanning deferred).
- **Migration / deploy:** this is jig's **first real package** — `pnpm check` grows from
  prettier-only to lint + typecheck + test, TDD 90%+. The package stand-up (tsconfig, test
  runner, build) is real and design-owned; the decomposition is currently intentionally empty.
- **Observability:** the records _are_ the product surface (SEE-1..6); they must match the M1
  record shape and be inspectable enough to diagnose a bad plan or policy without extra tooling
  (SEE-4).
- **Testing:** unit per use case; one integration test that runs the dry-run end-to-end and
  asserts a golden run-record fixture against `observability-records-v0`; architecture/enforcement
  tests are deferred (the `enforce` stage is out of M5a scope — no code yet to bound).

## 6. Initial DDD Depth

**Selected depth:** `use-case-slices`, with **ports-and-adapters at the four driver seams**.

**Why this depth fits:** the exercised path is a small set of clear commands/use cases — validate
plan, preview run, start dry-run, resolve eligibility, authorize request, record event — each with
explicit input/output contracts, domain errors (fail-closed reject), and test seams. That is the
use-case-slices profile. The driver seams demand ports-and-adapters because guarantee 4
(STACK-2 / STACK-5) makes Agent / Execution Host / Forge / Work Source swappable _authority_
boundaries; the design defines those ports now even though M5b builds few or no adapters.

**Where tactical depth is intentionally omitted:** no aggregates, value objects, or domain-event
ceremony in M5b. The run/story lifecycle is a natural future aggregate and the record stream a
natural domain-event model, but tactical-ddd is justified only once the slice exercises
concurrency (ISO-4), resume (RESUME-\*), rich policy, and real drivers — none of which M5 builds.
Recording the why-not here lets a later slice escalate depth deliberately rather than by reflex.

## 7. Handoff to Author

- **Design artifact target:** `docs/design/notes/runtime-design-m5a.md` (author output) plus
  `docs/design/decisions/README.md`; this frame is `docs/design/notes/problem-frame.md`.
- **Required methodology profile:** `ddd`.
- **Delivery constraints to preserve:** dry-run-first with no privileged action firing; the
  authorization fence exercised and emitting the `requested -> authorized/denied -> runner-owned`
  record chain even in dry-run; plans validate against `execution-plan-contract-v0` and records
  match `observability-records-v0`; the run ends in the product-visible named states from
  `concepts.md`; the exercised-vs-named-extension posture table is honored (no unexercised no-op
  code); stop before `enforce` (no CI architecture rules until M5b has code to bound).
- **Open before author:** Q2 (policy posture) is resolved (assisted). Q1 (worker posture) is
  provisionally resolved (scripted-worker stub at the Agent seam) pending one owner confirmation;
  author should not start until that is confirmed. Prior-art lessons the author cites inline are
  indexed in [`prior-art-workflow-kit.md`](./prior-art-workflow-kit.md).
