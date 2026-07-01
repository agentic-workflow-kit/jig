---
title: "Wave 4a frame — w4-s4: bootstrap / the composition root"
status: draft — frame (intake)
methodology: ddd
---

# Problem Frame — Wave 4a, s4: Bootstrap / composition root

> Intake artifact for the DDD-first deep-design track's Wave 4a, part 4 of 4. It frames
> **bootstrap / the composition root** — storage preflight (RESUME-4), GUARD-1 launch-binding,
> `run.previewed`, and CFG-9 (setup-only-when-needed) — the fourth of four CORE parts this wave
> deepens. Produced by applying the `technical-design` pack's `frame-technical-design` skill; the
> next stage is `author-technical-design`, gated on this frame's approval status. Authored
> alongside three sibling frames (`w4-s1-records-observability.md`,
> `w4-s2-plan-policy-evidence.md`, `w4-s3-authority-spine.md`) in one pass for mutual coherence.
>
> `docs/design/core/bootstrap.md` is the second of the two core stubs **explicitly deferred to
> "Wave 4a"** by prior waves: Wave 2's frame named "bootstrap's internal re-entry mechanics" as
> deferred past Wave 2 to Wave 4a (its D-003: "`w2-s2` owns the run-lifecycle view of resume only;
> bootstrap's internal re-entry mechanics defer to Wave 4a's `w4-s4-bootstrap-composition-root`" —
> this exact story id, named in advance). This part is where that deferral resolves. This frame
> consumes [Wave 1's domain frame](../../wave-1-domain/frame.md) (Track binds one current
> Plan/Policy/Work-profile; Run is bound-at-launch), [Wave 2's frame](../../wave-2-state-machines/frame.md)
> (the run-lifecycle view of resume, RESUME-1..5 as run-level guards, GUARD-1/INV-003 immutability
> across resume — all cited, this part owns the composition-root mechanics those candidates left
> undesigned), and [Wave 3's frame](../../wave-3-ports/frame.md) (bootstrap named as "the
> composition root... the one place that imports provider implementations," cited not modeled by
> Wave 3). **This part has author-time `depends_on` on all three sibling parts** — see §1 and the
> mandate below.

## 1. Scope and Goal

- **Source request:** deep-design track, Wave 4a, story 4 — deepen `docs/design/core/
bootstrap.md` in place: the composition root's launch sequencing (load/validate plan → bind
  policy+floors → resolve track/work-profile → wire providers → storage preflight → allocate run
  identity → hand off), `run.previewed`'s recorded-but-non-committing form, storage preflight
  (RESUME-4), GUARD-1 launch-binding, CFG-9 (setup-only-when-stale), and — the territory both
  prior waves explicitly deferred here — the internal mechanics of **resume** (re-entering
  bootstrap for an already-allocated run).
- **Goal:** produce an `AgreedSystemModel` for bootstrap clean and citable enough to seed this
  wave's charter and story brief, coherent with the three sibling parts this part wires together.
- **Author-time dependency (stated per the coordinator's mandate):** bootstrap/composition-root
  constructs the records store (`w4-s1`), wires the plan/policy/evidence intake (`w4-s2`), and
  wires the authority spine (`w4-s3`) at launch. **`w4-s4` has author-time `depends_on: [w4-s1,
w4-s2, w4-s3]`** — this drives the wave's `story-dag.md`. At _frame_ time (now), this part still
  consumes only Waves 1–3 (no forward dependency on the sibling frames' unresolved content is
  needed to complete this frame); the dependency is an _authoring-sequence_ constraint the future
  `author-technical-design` sessions must respect, not a frame-time blocker.
- **Out of scope for this part:** the Records engine's internal consistency model (`w4-s1` — this
  part only constructs/wires the store `w4-s1` defines); Policy's content or the evidence model
  (`w4-s2` — this part only binds and wires them); the Fence/Doorbell classifier's internal rules
  (`w4-s3` — this part only wires them with bound policy); the work-item/run state machines
  themselves (Wave 2, closed — this part hands off to orchestration once ready, cited not
  redesigned); provider adapter implementations (Wave 4b); field-level schema, TypeScript, or JSON
  Schema; package/module layout.

## 2. Source Map

| Source                                                                                                                                      | Authority                                                | Establishes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Gaps / stale risk                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/design/core/bootstrap.md`](../../../../design/core/bootstrap.md)                                                                     | authoritative — design stub (this part's target)         | `status: draft — stub`; owns load/validate plan (delegating to plan-intake), bind policy+floors frozen at launch, resolve track/work-profile, set up isolated workspace, wire provider adapters, storage preflight, allocate run identity + write binding record, hand off to orchestration; `run.previewed` as recorded-but-non-committing; explicitly names "resume (re-entering bootstrap for an already-allocated run)" and "capability attestation depth" as deferred, undesigned extension points | Stub altitude only — the composition/wiring sequence is drawn as a flowchart but resume's internal re-entry mechanics, storage-preflight failure taxonomy, and provider-adapter-selection rules are all named-but-undesigned; this part deepens in place, preserving and citing the existing diagram/Owns list |
| [`../../wave-2-state-machines/frame.md`](../../wave-2-state-machines/frame.md) + [`decisions.md`](../../wave-2-state-machines/decisions.md) | authoritative — prior-wave frame (seed) and decision log | Wave 2's D-003: `w2-s2` owns only the run-lifecycle _view_ of resume (states, RESUME-1..5 guards, GUARD-1/INV-003 immutability); bootstrap's internal re-entry mechanics explicitly deferred to **this part by name** ("Wave 4a's `w4-s4-bootstrap-composition-root`")                                                                                                                                                                                                                                  | Load-bearing: this part is where Wave 2's deferred resume-mechanics question resolves; it must not re-litigate the run-lifecycle _states_ Wave 2 already closed, only the composition-root's internal re-entry procedure                                                                                       |
| [`../../wave-3-ports/frame.md`](../../wave-3-ports/frame.md)                                                                                | authoritative — prior-wave frame (seed)                  | Bootstrap named as "the composition root... the one place that imports provider implementations" — cited, not modeled by Wave 3 ("Wave 3 frames the port shapes bootstrap wires, not bootstrap's own wiring rules")                                                                                                                                                                                                                                                                                     | This part is where Wave 3's citation points; it wires the four provider ports (Wave 3's shapes) without redesigning them                                                                                                                                                                                       |
| [`../../wave-1-domain/frame.md`](../../wave-1-domain/frame.md)                                                                              | authoritative — prior-wave frame (seed)                  | Track binds one current Plan/Policy/Work-profile (by reference); Run is bound-at-launch to Plan/Policy/Work-profile/Repo-floors, fixed for the run's duration (GUARD-1/INV-003)                                                                                                                                                                                                                                                                                                                         | This part is where that binding is actually performed (the "bind policy + repo floors" step in bootstrap's existing flowchart)                                                                                                                                                                                 |
| [`docs/product/guarantees.md`](../../../../product/guarantees.md)                                                                           | authoritative — ID spec                                  | RESUME-1..5 (durable progress, checkpoint resume, no-double-effect, fail-closed-diagnosable, resume integrity); GUARD-1 (policy fixed at launch); CFG-9 (setup runs only when needed — stale-workspace detection); ISO-4 (isolated workspace per run); SEE-1 (run-identity/visibility binding)                                                                                                                                                                                                          | Outcome-level commitments this part's launch/resume sequencing reconciles to                                                                                                                                                                                                                                   |
| [`docs/design/core/plan-intake.md`](../../../../design/core/plan-intake.md)                                                                 | authoritative — design stub (cited, `w4-s2`'s target)    | Bootstrap "load and validate the plan, delegating to plan-intake" — the existing delegation this part preserves, not redesigns                                                                                                                                                                                                                                                                                                                                                                          | Cited only                                                                                                                                                                                                                                                                                                     |
| [`docs/design/core/authorization.md`](../../../../design/core/authorization.md)                                                             | authoritative — design stub (cited, `w4-s3`'s target)    | Bootstrap wires the Fence/Doorbell (implicit in "wire the provider adapters" plus policy binding)                                                                                                                                                                                                                                                                                                                                                                                                       | Cited only                                                                                                                                                                                                                                                                                                     |
| [`docs/design/core/records.md`](../../../../design/core/records.md)                                                                         | authoritative — design stub (cited, `w4-s1`'s target)    | Bootstrap's binding-record append: "Allocate run identity and write the binding record... only after the audit append for that record succeeds" — this part constructs/uses the records store `w4-s1` defines                                                                                                                                                                                                                                                                                           | Cited only; this part does not redesign the log's consistency model                                                                                                                                                                                                                                            |
| [`docs/design/core/orchestration.md`](../../../../design/core/orchestration.md)                                                             | authoritative — design stub (cited)                      | Bootstrap "hand[s] off to orchestration once the run is ready"                                                                                                                                                                                                                                                                                                                                                                                                                                          | Cited only; Wave 2's closed territory                                                                                                                                                                                                                                                                          |
| [`AGENTS.md`](../../../../../AGENTS.md) (jig repo root)                                                                                     | authoritative — repo contract                            | House conventions; the boundary rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | None material                                                                                                                                                                                                                                                                                                  |

## 3. InputResolution

| Required input                                                                                                                                                              | Source evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Owner / impact                                                                                                            | Approval status |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **Placement:** deepen `core/bootstrap.md` in place, or relocate?                                                                                                            | Coordinator's brief assigns `design_target: docs/design/core/bootstrap.md (deepen)`, explicitly naming it "the second orphaned core stub"; prior-wave in-place-deepening precedent (Wave 2's D-001, Wave 3's D-001)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | **provided** (not a fork) — deepen in place, preserving and citing the existing flowchart/Owns as seed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `docs/design/core/bootstrap.md` design_target                                                                             | approved        |
| **Author-time dependency on the other three parts:** does `w4-s4` need `w4-s1`/`w4-s2`/`w4-s3` to be authored first, or can all four proceed in parallel at authoring time? | Bootstrap's existing Owns list already names constructing/wiring the records store (binding-record append), delegating to plan-intake (load/validate), binding policy (frozen at launch), and (implicitly, via "wire the provider adapters") wiring the Fence/Doorbell — i.e., bootstrap's own stub content structurally depends on all three sibling parts' shapes existing to wire against. The coordinator's MANDATE states this directly: "bootstrap/composition-root wires the other three core parts at launch... So w4-s4 has AUTHOR-TIME depends_on on w4-s1, w4-s2, w4-s3."                                                                                                                                                                                                                                                                                                                                                                 | **provided** (a mandate, not a fork) — `w4-s4`'s author-time `depends_on: [w4-s1-records-observability, w4-s2-plan-policy-evidence, w4-s3-authority-spine]`. This is an authoring-sequence constraint: the future `author-technical-design` session for `w4-s4` should run after (or at minimum, with visibility into the settled output of) the other three, because bootstrap's deepened content will cite their settled shapes (the records store's construction contract, the bound-policy shape, the Fence/Doorbell wiring contract). At _frame_ time, this frame is self-contained (it consumes only Waves 1–3, per the coordinator's note), so framing all four in one pass is not blocked by this dependency — only _authoring_ is sequenced.                                                                                                                                                                                                                                                  | Wave 4a's `story-dag.md` (a coordinator artifact, not this frame's)                                                       | approved        |
| **Depth:** does bootstrap warrant `tactical-ddd`, matching the other three parts, or does it hold at a lower rung?                                                          | The altitude ladder names `ports-and-adapters` depth's own required element as "composition/wiring boundary" — bootstrap's central role (wiring provider adapters, constructing the records store, binding policy, wiring the authority spine) is _definitionally_ a composition-root concern, not a new domain invariant of its own. Separately, the ladder's `control-plane/runtime` **mode** ("configuration, operators, trusted execution, records, and runtime control surfaces are the dominant model") also describes bootstrap's launch-sequencing role reasonably well. Bootstrap's own deferred-resume question (re-entering for an already-allocated run) is the one place real invariant content appears — but even there, the content is _sequencing and idempotency of the wiring/rebind steps_, not a rich domain policy or a consistency model over a data structure (unlike `w4-s1`'s log or `w4-s2`'s policy/evidence categories). | **requires approval, recommended** — hold bootstrap at **`architecture_mode: control-plane/runtime`**, **`ddd_depth: ports-and-adapters`** — one rung _below_ the other three parts' recommended `tactical-ddd`. This is the wave's one deliberately lower-depth part, and the frame states why: bootstrap's job is to compose and sequence already-framed pieces (the store from `w4-s1`, bound policy from `w4-s2`, the spine from `w4-s3`) correctly at launch and on resume, not to author a new invariant-bearing domain model of its own. The resume re-entry procedure needs precise **sequencing and idempotency** rules (a real complexity driver — RESUME-3's no-double-effect must hold across a re-entry) but the ladder's discriminator for escalating to `tactical-ddd` is aggregates/value-objects/domain-events/consistency-model-over-a-transaction-boundary, and bootstrap does not introduce such a boundary of its own — it composes the ones `w4-s1`/`w4-s2`/`w4-s3` already own. | This part's `architecture_mode`/`ddd_depth` frontmatter — the one part in this wave recommended to differ from the others | pending         |
| **s1 ↔ s4 records-store construction seam:** who owns the store's shape vs. its construction/wiring?                                                                        | `w4-s1`'s frame states (identically): "s1 owns the store's shape, consistency model, and invariants; `w4-s4` (bootstrap/composition root) owns constructing and wiring that store at launch." Bootstrap's existing stub already names "Allocate run identity and write the binding record... only after the audit append for that record succeeds" — a construction/use fact, not a shape-defining one.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | **provided** (a mandate, not a fork, stated identically in both frames) — `w4-s1` owns the log's shape/consistency model; `w4-s4` (this part) owns constructing/wiring that store at launch, including the binding-record's first append. No competing reading.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Both parts' AgreedSystemModel Relations sections (kept identical)                                                         | approved        |

### Blocking Questions

None. The one `requires approval` item (depth) is resolvable by the coordinator choosing among
named, sourced alternatives.

### Safe Assumptions

- Placement (deepen `core/bootstrap.md` in place) is settled by the coordinator's brief and
  prior-wave precedent; not reopened.
- The author-time `depends_on` on `w4-s1`/`w4-s2`/`w4-s3` does not block this frame (frame-time
  self-sufficiency, per the coordinator's note); it drives only the wave's `story-dag.md` sequencing
  for authoring.

## 4. AgreedSystemModel

### Source Inputs Used

| Source                                                              | Establishes                                                                                                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/design/core/bootstrap.md`                                     | The existing stub this part deepens: launch sequencing, `run.previewed`, storage preflight, provider wiring, deferred resume/attestation extension points                            |
| `../../wave-2-state-machines/frame.md`, `decisions.md`              | D-003: bootstrap's internal re-entry mechanics deferred here by name; the run-lifecycle _view_ of resume (states, RESUME-1..5, GUARD-1/INV-003) stays Wave 2's, cited not redesigned |
| `../../wave-3-ports/frame.md`                                       | Bootstrap as "the composition root... imports provider implementations," cited not modeled by Wave 3                                                                                 |
| `../../wave-1-domain/frame.md`                                      | Track's plan/policy/work-profile binding; Run bound-at-launch                                                                                                                        |
| `docs/product/guarantees.md`                                        | RESUME-1..5, GUARD-1, CFG-9, ISO-4, SEE-1                                                                                                                                            |
| `docs/design/core/plan-intake.md`, `authorization.md`, `records.md` | Cited targets this part wires (`w4-s2`, `w4-s3`, `w4-s1` respectively)                                                                                                               |

### Unresolved Required Inputs

- Depth recommendation (`control-plane/runtime` / `ports-and-adapters`, one rung below the other
  three parts) — requires approval (see §3).

### High-Level System Entities

| Entity                              | Responsibilities                                                                                                                                                                                                                                                                                         | Owns                                                                                                                                                                                                                                                           | Reads                                                                                                                                                                                                                                             | Does Not Own                                                                                                                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Bootstrap (composition root)**    | Turns authored configuration into a validated, bound, wired, identified, ready run (or a recorded-but-non-committing preview); the sole importer of provider implementations.                                                                                                                            | The launch sequence itself (load→bind→resolve→wire→preflight→allocate→handoff); `run.previewed`'s non-committing form; storage preflight (RESUME-4); the resume re-entry procedure's sequencing/idempotency rules (the deferred territory this part now owns). | `w4-s1`'s records-store construction contract; `w4-s2`'s policy/plan-intake shapes; `w4-s3`'s Fence/Doorbell wiring contract; Wave 1's Track/Plan/Policy bindings; Wave 2's run-lifecycle resume _view_ (states, guards — cited, not redesigned). | The records store's shape/consistency model (`w4-s1`); policy's content (`w4-s2`); the Fence classifier's rules (`w4-s3`); the run-lifecycle states themselves (Wave 2); any provider adapter's implementation (Wave 4b). |
| **Storage preflight**               | Checks jig's own storage can do what it needs before a run starts; fails closed with a clear reason rather than risking a run on unreliable storage (RESUME-4).                                                                                                                                          | The preflight check sequence and its failure taxonomy (a named gap this part fills).                                                                                                                                                                           | Nothing structurally new.                                                                                                                                                                                                                         | The records store's internal consistency model (`w4-s1`).                                                                                                                                                                 |
| **Resume re-entry (deepened here)** | Re-enters bootstrap for an already-allocated run: re-validates the original binding is unchanged (GUARD-1/INV-003 immutability across resume, cited from Wave 2), re-wires providers, re-runs storage preflight, and resumes without double-effecting already-completed irreversible actions (RESUME-3). | The re-entry procedure's sequencing and idempotency rules — the territory Wave 2's D-003 explicitly deferred here.                                                                                                                                             | Wave 2's run-lifecycle resume states/guards (cited, not redesigned); the original binding record (`w4-s1`'s store).                                                                                                                               | Whether a resume is _approved_ (that's RESUME-5 / GUARD-2, `w4-s2`/`w4-s3`'s territory, cited); the run-lifecycle states themselves.                                                                                      |
| **Provider wiring**                 | Selects and wires the concrete agent/host/forge/work-source implementations at compose time.                                                                                                                                                                                                             | The wiring mechanism and adapter-selection sequencing.                                                                                                                                                                                                         | Wave 3's four provider port shapes (cited, unchanged).                                                                                                                                                                                            | Any provider adapter's own implementation (Wave 4b).                                                                                                                                                                      |

### Relations

| From                        | Relation             | To                                                         | Notes                                                                                                                                                            |
| --------------------------- | -------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bootstrap                   | delegates to         | Plan intake (`w4-s2`, cited)                               | "Load and validate the plan"                                                                                                                                     |
| Bootstrap                   | binds                | Policy, repo floors (`w4-s2`, Wave 1, cited)               | Frozen at launch, GUARD-1                                                                                                                                        |
| Bootstrap                   | constructs and wires | Records store (`w4-s1`)                                    | **Named identically in `w4-s1`'s frame**: s1 owns the store's shape/consistency model; s4 owns constructing/wiring it, including the first binding-record append |
| Bootstrap                   | wires                | Fence, Doorbell (`w4-s3`, with bound policy)               | **Named identically in `w4-s3`'s frame**: s3 defines the classifier; s4 wires it at launch                                                                       |
| Bootstrap                   | wires                | Four provider ports (Wave 3, cited)                        | Selection/wiring only; port shapes unchanged                                                                                                                     |
| Bootstrap                   | hands off to         | Orchestration (Wave 2, cited)                              | Once the run is ready; run-lifecycle states unchanged                                                                                                            |
| Resume re-entry (this part) | re-enters            | Bootstrap's own sequence                                   | The deferred territory Wave 2's D-003 named this part by id to own                                                                                               |
| Resume re-entry             | must preserve        | GUARD-1/INV-003 immutability across resume (Wave 2, cited) | The original binding must not silently change on re-entry                                                                                                        |

### Seams and External Boundaries

- **The records-store construction seam (s4 ↔ s1)** — named identically to `w4-s1`'s frame: `w4-s1`
  owns the store's shape/consistency model; `w4-s4` (this part) owns constructing and wiring it at
  launch, including the first binding-record append.
- **The Fence/Doorbell wiring seam (s4 ↔ s3)** — named identically to `w4-s3`'s frame: `w4-s3`
  owns the classifier/escalation rules; `w4-s4` owns wiring them with bound policy at launch.
- **The plan-intake delegation seam (s4 ↔ s2)** — bootstrap delegates load/validate to plan intake;
  unchanged from the existing stub.
- **The provider-wiring boundary (s4 ↔ Wave 3)** — bootstrap is the sole importer of provider
  implementations against Wave 3's port shapes; this part frames the wiring sequence, not the
  ports themselves.
- **The resume re-entry boundary (s4 ↔ Wave 2)** — Wave 2 owns the run-lifecycle's resume _view_
  (states, RESUME-1..5 guards, GUARD-1/INV-003); this part owns the composition-root's internal
  re-entry _procedure_ (sequencing, idempotency), cited from and consistent with, never
  contradicting, Wave 2's settled states.

### Lifecycle and State Terms

This part introduces no new run/work-item lifecycle states (Wave 2's remain closed). Its only new
lifecycle-adjacent vocabulary is the **re-entry procedure**: a resume re-enters bootstrap's launch
sequence at a point after run-identity allocation, re-validating (not re-choosing) the original
binding, re-wiring providers, and re-running storage preflight — before handing back to
orchestration at the run's last safe checkpoint (Wave 2, cited).

### Mode and Depth

- **architecture_mode:** `control-plane/runtime` (recommended, requires approval — see §3; one
  rung below the sibling parts' `tactical-ddd`)
- **initial ddd_depth:** `ports-and-adapters` (recommended, requires approval — see §3)

### Open Questions and Approval

- Depth recommendation: `control-plane/runtime`/`ports-and-adapters`, deliberately below the other
  three parts' `tactical-ddd` (requires approval, recommended — see §3).
- **Approval status: pending (coordinator).**

## 5. Assumptions and Blockers

(Restated from §3 for template completeness.)

### Safe Assumptions

- Placement (deepen `core/bootstrap.md` in place) is settled, not reopened.
- The author-time `depends_on` on the other three parts does not block this frame; it drives only
  the wave's `story-dag.md`.

### Blocking Questions

None.

## 6. DDD Context Candidates

| Candidate context                            | Owns                                                                                                                                            | Reads                                                                                                                                                                                                    | Does Not Own                                                                                                                                                         | Open ownership question                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Bootstrap / composition root** (this part) | Launch sequencing; `run.previewed`; storage preflight; provider-adapter wiring sequence; the resume re-entry procedure's sequencing/idempotency | The records store's construction contract (`w4-s1`, cited); bound policy (`w4-s2`, cited); the Fence/Doorbell wiring contract (`w4-s3`, cited); Wave 3's port shapes; Wave 2's run-lifecycle resume view | The records store's shape (`w4-s1`); policy's content (`w4-s2`); the classifier's rules (`w4-s3`); run-lifecycle states (Wave 2); provider implementations (Wave 4b) | Depth recommendation (one rung below siblings) |

## 7. Complexity Drivers

- **Invariants:** GUARD-1 (policy fixed at launch — this part performs the actual binding);
  RESUME-1..5 (durable progress, checkpoint resume, no-double-effect, fail-closed-diagnosable,
  resume integrity — this part owns the re-entry procedure that must satisfy all five); CFG-9
  (setup runs only when the workspace is stale); ISO-4 (isolated workspace per run). New
  candidates for `INV-009`+: binding-record-append-precedes-run-readiness (bootstrap's own
  ordering rule: "only after the audit append... succeeds"); resume-re-entry-preserves-original-
  binding (GUARD-1/INV-003 held across re-entry, not merely at first launch).
- **State transitions:** none new — this part sequences the composition steps that precede Wave
  2's closed run-lifecycle, and the re-entry procedure that resumes into it.
- **Integrations / anti-corruption:** the three wiring seams (records-store construction with
  `w4-s1`; policy/plan-intake delegation with `w4-s2`; Fence/Doorbell wiring with `w4-s3`); the
  provider-wiring boundary with Wave 3's port shapes.
- **Consistency / idempotency / replay / audit:** this part's central complexity driver for its
  one new territory (resume re-entry) — RESUME-3's no-double-effect must hold when composition
  re-wires providers and re-checks storage on an already-allocated run, not just at first launch.
- **Security / authorization:** GUARD-1's actual binding happens here; this part does not author
  new authorization rules (that's `w4-s3`'s).
- **Migration / deploy:** none — docs-only frame; storage-preflight failure taxonomy is a design
  gap this part names, not a deploy concern.
- **Observability:** the binding-record append (cited to `w4-s1`) and `run.previewed`'s own audit
  event are this part's principal observability obligations.
- **Testing:** none at this altitude; future story brief carries forward resume re-entry's
  idempotency/sequencing test-seam expectations.

## 8. Architecture Mode and Initial DDD Depth

**Selected architecture_mode:** `control-plane/runtime` (recommended)

**Why this mode fits:** the ladder describes this mode as fitting when "configuration, operators,
trusted execution, records, and runtime control surfaces are the dominant model" — bootstrap's
entire deliverable is exactly this: composing configuration (plan, policy, work profile),
wiring trusted execution (the authority spine, provider adapters), and preparing the records
surface for a run, all under a launch/resume control sequence. This is a deliberate difference
from the other three parts' `tactical-ddd`: bootstrap does not author a new invariant-bearing
domain model of its own — it composes and sequences the models `w4-s1`/`w4-s2`/`w4-s3` already own.

**Selected depth:** `ports-and-adapters` (recommended)

**Why this depth fits:** the ladder's required elements for this rung — "composition/wiring
boundary" — is named verbatim as this part's central artifact. Bootstrap is, by its own existing
stub description, "the one place that imports provider implementations" — the textbook
composition-root role the ladder places at `ports-and-adapters`, not `tactical-ddd`. This is the
wave's one deliberately lower-depth part: `w4-s1`, `w4-s2`, and `w4-s3` each author a new
invariant-bearing domain model (a consistency model, a policy/evidence taxonomy, a fail-closed
classifier); bootstrap instead composes and sequences those three models correctly, which is a
`ports-and-adapters`-shaped concern (adapter responsibilities, composition/wiring boundary) even
though the resume re-entry procedure requires real sequencing/idempotency precision.

**Where tactical depth is intentionally omitted:** no aggregate, value-object, or domain-event
ceremony is authored for bootstrap itself — the resume re-entry procedure, while requiring careful
idempotency reasoning, is a _sequencing_ discipline over already-owned invariants (Wave 2's
run-lifecycle states, `w4-s1`'s store, `w4-s2`'s policy, `w4-s3`'s classifier), not a new
consistency boundary of bootstrap's own. If a future session finds bootstrap's resume mechanics
demand a richer transactional model (e.g., a distinct "re-entry attempt" aggregate), that
escalation is a deliberate future-wave decision, following this track's own precedent of recording
"why not" rather than defaulting to it.

## 9. Handoff to Author

- **Design artifact target:** `docs/design/core/bootstrap.md` (deepen in place).
- **Required methodology profile:** `ddd`.
- **Approval status:** pending — one item requires coordinator resolution: the depth
  recommendation (`control-plane/runtime`/`ports-and-adapters`, deliberately one rung below the
  sibling parts' `tactical-ddd`).
- **Author-time depends_on:** `[w4-s1-records-observability, w4-s2-plan-policy-evidence,
w4-s3-authority-spine]` — drives the wave's `story-dag.md`; does not block this frame.
- **Delivery constraints to preserve:** continue the existing vocabulary — do not mint new `INV-*`
  numbers below `INV-009`; this part's candidates (binding-record-append-precedes-run-readiness,
  resume-re-entry-preserves-original-binding) are **INV-009+ CANDIDATES**, flagged for cross-wave
  reconciliation at the U9 pass. Keep the three ID namespaces distinct. Preserve and cite
  `core/bootstrap.md`'s existing flowchart/Owns as this part's seed. Keep the records-store
  construction seam wording identical to `w4-s1`'s frame, and the Fence/Doorbell wiring seam
  wording identical to `w4-s3`'s frame. Do not re-litigate Wave 2's closed run-lifecycle states or
  its run-lifecycle _view_ of resume (RESUME-1..5 guards, GUARD-1/INV-003) — this part owns only
  the composition-root's internal re-entry procedure Wave 2's D-003 deferred here by name.
