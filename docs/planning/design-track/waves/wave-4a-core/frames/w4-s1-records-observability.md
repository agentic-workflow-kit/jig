---
title: "Wave 4a frame — w4-s1: the Records event-log engine and observability surface"
status: draft — frame (intake)
methodology: ddd
---

# Problem Frame — Wave 4a, s1: Records / observability

> Intake artifact for the DDD-first deep-design track's Wave 4a, part 1 of 4. It frames the
> **Records event-log engine** — the append-only log, event semantics, projections/derivations,
> retention/isolation posture — as the first of four CORE parts this wave deepens. Produced by
> applying the `technical-design` pack's `frame-technical-design` skill; the next stage is
> `author-technical-design`, gated on this frame's approval status. Authored alongside three
> sibling frames (`w4-s2-plan-policy-evidence.md`, `w4-s3-authority-spine.md`,
> `w4-s4-bootstrap-composition-root.md`) in one pass for mutual coherence; cross-references to
> those parts are by part id, and cross-references to prior waves name the wave explicitly
> (never a bare `D-###`).
>
> This frame consumes [Wave 1's domain frame](../../wave-1-domain/frame.md) (Run records / event
> log as the sole source for Evidence and Notice, no separate store),
> [Wave 2's state-machine frame](../../wave-2-state-machines/frame.md) (every candidate transition
> emits a candidate event into the log), and
> [Wave 3's ports frame](../../wave-3-ports/frame.md) (the `RunStore` port —
> `append(event)`/`project(...)`/`export` — already candidate-named at `core/records.md`). Wave 4a
> is the first wave to author **tactical** detail inside a core port: real invariants, consistency
> rules, and the projection-purity discipline that gives `RunStore`'s candidate shape teeth.

## 1. Scope and Goal

- **Source request:** deep-design track, Wave 4a, story 1 — deepen `docs/design/core/records.md`
  in place: the append-only event-log **engine** (not just the port skeleton Wave 3 already
  candidate-named), event semantics (what an event is, its causal/ordering discipline), pure
  projections and their consistency model, redaction posture, retention/isolation, and the
  observability-records surface these serve.
- **Goal:** produce an `AgreedSystemModel` for the Records engine clean and citable enough to seed
  this wave's charter and story brief, coherent with the three sibling parts, and readable by
  Wave 4b (provider parts) without rework — in particular `w4-s6-execution-host` (SEC-2,
  no-phone-home) will need to frame its attestation/evidence surface against the shape this part
  settles.
- **Out of scope for this part:** the `RunStore` port's method signature or a frozen contract
  (Wave 3 already candidate-named the port; the two v0 contracts,
  `docs/design/contracts/execution-plan-contract-v0.md` and
  `docs/design/contracts/observability-records-contract-v0.md`, stay cited and unfrozen — this
  part does not edit them); the work-item/run state machines themselves (closed in Wave 2, cited
  here only as event sources); plan/policy/evidence content (w4-s2); the authority/fence model
  (w4-s3); bootstrap's wiring of the records store (w4-s4 — this part defines the store, w4-s4
  wires it, stated identically in both); field-level schema, TypeScript, or JSON Schema for any
  event; package/module layout.

## 2. Source Map

| Source                                                                                                                            | Authority                                                | Establishes                                                                                                                                                                                                                                                                                                                                                                                                                     | Gaps / stale risk                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`docs/design/core/records.md`](../../../../design/core/records.md)                                                               | authoritative — design stub (this part's target)         | `status: draft — stub`; owns the append-only log, single-leased-writer discipline, pure projections (state/summary/metrics), redaction posture per record, export (write-once redacted), and that notices + "ask why" both read the same log; the `RunStore` port already candidate-named by Wave 3                                                                                                                             | Stub altitude only — no invariant catalog, no consistency model, no event-family causal discipline beyond a one-line diagram; this part deepens in place, preserving and citing the existing diagram and Owns list as its seed |
| [`docs/design/contracts/observability-records-contract-v0.md`](../../../../design/contracts/observability-records-contract-v0.md) | authoritative — out-seam contract v0 (cited, unfrozen)   | The full required-property list this engine must satisfy: run identity/input binding, event causality, story state/outcomes, authorizations, gates/evidence, blocks/stops/notices, recovery/resume, redaction/retention/export, learning-loop consumption; the event-family list (run lifecycle, input binding, capability, authorization, story lifecycle, evidence/gates, runner action, liveness/notices, export/redaction)  | v0 shape, not frozen — this part must not mint new field names or event-type strings beyond what's already listed; a genuine shape gap routes back to the contract owner (STOP-003), not a silent edit here                    |
| [`../../wave-1-domain/frame.md`](../../wave-1-domain/frame.md) + [`decisions.md`](../../wave-1-domain/decisions.md)               | authoritative — prior-wave frame (seed)                  | Run records (the event log) as its own entity: "the log itself; the single-leased-writer discipline; export"; Evidence and Notice are **conceptual/projection entities**, not separate stores — both read the same log (Wave 1's settled system model, §4)                                                                                                                                                                      | This part inherits, does not re-litigate, Wave 1's Evidence/Notice-as-projection posture                                                                                                                                       |
| [`../../wave-2-state-machines/frame.md`](../../wave-2-state-machines/frame.md)                                                    | authoritative — prior-wave frame (seed)                  | Every candidate work-item and run transition emits a candidate event into the log (INV-006 continued); the event-family candidates per lifecycle (eligible/started/parked/done/landed/rejected/blocked; previewed/started/stopped/resumed/completed)                                                                                                                                                                            | This part owns the engine those events are written into; it does not redesign which events exist per transition (Wave 2's territory, settled)                                                                                  |
| [`../../wave-3-ports/frame.md`](../../wave-3-ports/frame.md) + [`decisions.md`](../../wave-3-ports/decisions.md)                  | authoritative — prior-wave frame (seed) and decision log | The `RunStore` (data-out) port already candidate-named at `core/records.md`: `append(event)`/`project(state\|summary\|metrics)`/`export`; anti-corruption stance ("only the reducer/runner appends; projections never author the log... redaction posture is recorded per record, never silently dropped"); Wave 3's D-001 confirms `core/records.md` is deepened **in place**, not relocated                                   | This part deepens the same file Wave 3 already candidate-named the port inside — preserves and cites the port shape, adds the engine/consistency detail Wave 3 explicitly left as a future session's job                       |
| [`docs/design/core/orchestration.md`](../../../../design/core/orchestration.md)                                                   | authoritative — design stub (cited)                      | "Emits every transition and decision as an event to the records port" — the runner is the primary event source this engine's append discipline serves                                                                                                                                                                                                                                                                           | Cited only; the runner's own transition logic is Wave 2's settled territory                                                                                                                                                    |
| [`docs/design/core/README.md`](../../../../design/core/README.md)                                                                 | authoritative — design spine                             | Group B "Run records" row: "Durable, ordered, structured records — the evidence itself; state/summary/metrics are pure projections of an append-only log; exportable write-once, redacted. The source of notices and 'ask why.'" (SEE-1..6)                                                                                                                                                                                     | Overview altitude only; this part deepens the engine beneath this row                                                                                                                                                          |
| [`docs/product/guarantees.md`](../../../../product/guarantees.md)                                                                 | authoritative — ID spec                                  | SEE-1..6 (full visibility, structured/machine-readable, records-are-the-evidence, self-diagnosis, triaged notices, write-once redacted export); STACK/DRIVE families (driver attestation posture recorded); ISO-1..4 (dependency-aware outcomes, isolated workspace per run — a fact this engine's run-identity binding must preserve); LIVE-1/2 (liveness signals become records/notices); SEC-1 (secrets stay out of records) | Outcome-level commitments this part's invariant candidates reconcile to, not restate                                                                                                                                           |
| [`AGENTS.md`](../../../../../AGENTS.md) (jig repo root)                                                                           | authoritative — repo contract                            | Jig owns the observability-records contract as a versioned seam; house conventions (no emojis, Mermaid inline, immutability)                                                                                                                                                                                                                                                                                                    | None material                                                                                                                                                                                                                  |

## 3. InputResolution

| Required input                                                                                                                                                                                                          | Source evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Owner / impact                                                                                                                                     | Approval status |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| **Placement:** does this part deepen `core/records.md` in place, or relocate?                                                                                                                                           | The coordinator's brief assigns `design_target: docs/design/core/records.md (deepen)`; Wave 2's D-001 and Wave 3's D-001 both establish the "deepen an existing, named, stub-status home in place" precedent for exactly this situation (an existing file already claiming the territory as a stub)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | **provided** (not a fork) — deepen `core/records.md` in place, preserving and citing its existing Owns/Interface/Diagram as this part's seed. This is a closed instruction from the coordinator's brief, not a choice this frame reopens.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `docs/design/core/records.md` design_target                                                                                                        | approved        |
| **Depth escalation:** does the Records engine warrant `tactical-ddd`, or does it hold at `ports-and-adapters`/`use-case-slices` (Wave 3's depth)?                                                                       | The altitude ladder's tactical trigger: "the domain has strict invariants, complex lifecycle transitions, rich policies, concurrency, or cross-context consistency... aggregates or equivalent transaction boundaries, value objects where primitives are unsafe, domain events when another context consumes facts, failure-token catalogs, consistency model." The append-only log with a single-leased-writer discipline and pure, never-hand-maintained projections (INV-006) is exactly a **consistency model over a transaction boundary** — the log is an aggregate-like invariant boundary (single writer, monotonic append, replay-determinism), and "pure projection, never hand-authored" is a domain invariant a provider or a future consumer must not violate. This is qualitatively past `ports-and-adapters` (which frames the port shape, not the internal consistency discipline). | **requires approval, recommended** — select `architecture_mode: tactical-ddd`, `ddd_depth: tactical-ddd` for this part specifically. The append-only log is this wave's clearest tactical-DDD candidate: it needs a named consistency model (single-leased-writer, append-only, replay-determinism), a failure-token catalog (write conflict, replay drift, redaction-bypass attempt), and projection-purity as a domain invariant — the ladder's own required elements for this rung. Explicitly **not** event sourcing as a full subprofile: the ladder's guidance is to "treat event sourcing as a future subprofile when audit, replay, temporal queries, or durable event history justify it" — this part names the log's event-sourcing-adjacent shape (append-only, pure projections) as the existing candidate design, without adopting CQRS/event-sourcing ceremony (snapshotting strategy, event upcasting, etc.) this wave. | This part's `architecture_mode`/`ddd_depth` frontmatter, and by extension the tactical-depth precedent the wave's other parts are compared against | pending         |
| **Records/evidence surface as Wave 4b's frame-time contract:** must this part explicitly name its downstream consumer (`w4-s6-execution-host`, SEC-2 no-phone-home attestation), or is that an implicit, later concern? | The coordinator's MANDATE states this part's records/evidence surface is "Wave 4b's FRAME-TIME contract — specifically w4-s6 execution-host / SEC-2 (proven no-phone-home) will frame its attestation/evidence against this." `observability-records-contract-v0.md`'s capability event family ("driver attested, capability missing, capability stale, autonomy reduced") is the concrete shape a no-phone-home attestation record would populate.                                                                                                                                                                                                                                                                                                                                                                                                                                                  | **provided** (a mandate, not a fork) — this frame names Wave 4b / `w4-s6`'s execution-host attestation as a downstream dependency in the AgreedSystemModel and open questions below, so it does not orphan. No competing reading; this is a naming obligation, not a design choice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | AgreedSystemModel's Relations/Seams sections; Wave 4b's future frame for `w4-s6`                                                                   | approved        |
| **Event-sourcing subprofile:** should this part adopt event sourcing/CQRS ceremony now that a real consistency model is being authored?                                                                                 | The altitude ladder explicitly names event sourcing as "a future subprofile when audit, replay, temporal queries, or durable event history justify it" and warns against adopting it "by reflex." This part's append-only log already exhibits event-sourcing-adjacent shape (append-only source of truth, pure projections as read models) but the ladder's guidance is to defer the full subprofile.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | **safe assumption** — hold at "tactical-ddd, event-sourcing-adjacent shape named, full subprofile deferred." Risk: low — this mirrors the ladder's own explicit "avoid... by reflex" guidance and the M5a/Wave 2/Wave 3 precedent of recording "why not" rather than defaulting to ceremony.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | This part's "where tactical depth is intentionally omitted" section                                                                                | not required    |

### Blocking Questions

None. The one `requires approval` item (depth escalation) is resolvable by the coordinator
choosing between named, sourced alternatives; nothing requires new information only an external
owner could supply.

### Safe Assumptions

- Event sourcing/CQRS stays a named, deferred subprofile — this part authors a consistency model
  and projection-purity invariant without adopting the full ceremony. Risk: low, per the altitude
  ladder's explicit guidance.
- Placement (deepen `core/records.md` in place) is settled by the coordinator's brief and two
  prior-wave precedents (Wave 2's D-001, Wave 3's D-001); not reopened as a fork here.

## 4. AgreedSystemModel

### Source Inputs Used

| Source                                                       | Establishes                                                                                                                                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/design/core/records.md`                                | The existing stub this part deepens: append-only log, single-leased-writer, pure projections, redaction posture, export, `RunStore` port shape (Wave 3) |
| `docs/design/contracts/observability-records-contract-v0.md` | The full required-property and event-family list this engine's consistency model must satisfy (cited, unfrozen)                                         |
| `../../wave-1-domain/frame.md`                               | Run records as the sole source for Evidence/Notice, both projections, no separate store                                                                 |
| `../../wave-2-state-machines/frame.md`                       | Every candidate transition across both lifecycles emits a candidate event into this engine                                                              |
| `../../wave-3-ports/frame.md`, `decisions.md`                | The `RunStore` port's candidate shape and anti-corruption stance; the in-place deepening precedent (D-001)                                              |
| `docs/product/guarantees.md`                                 | SEE-1..6, LIVE-1/2, SEC-1, ISO-1..4, STACK/DRIVE (driver attestation posture)                                                                           |

### Unresolved Required Inputs

- Depth escalation to `tactical-ddd` (requires approval, recommended — see §3).

### High-Level System Entities

| Entity                                                           | Responsibilities                                                                                                                                                                             | Owns                                                                                                                                                                             | Reads                                                                                                                  | Does Not Own                                                                                                                    |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Event log (append-only)**                                      | The single, ordered, durable source of truth for everything that happened in a run; append-only, single leased writer per run; never mutated or deleted.                                     | The append discipline; write-conflict rejection; ordering/causality metadata per event; the leased-writer handoff on resume (cited from `w4-s4`, not redesigned here).           | Events emitted by the runner and Fence (Wave 2/w4-s3, cited sources).                                                  | Interpreting event meaning for planning (Learning loop, out-of-hot-path); the runner's own transition logic (Wave 2, settled).  |
| **Projection engine**                                            | Replays the log into pure, derived views (state, summary, metrics, notices); never hand-authored; deterministic and replay-safe.                                                             | The purity invariant (a projection is a pure function of the log, never a parallel narrative); the notice-derivation rules (per-condition triage: parked/blocked/stale/overdue). | The event log.                                                                                                         | Persistence of its own output as a competing source of truth (a projection is always re-derivable, never the record of record). |
| **Redaction/export surface**                                     | Records redaction posture per event; produces the write-once, redacted export artifact.                                                                                                      | The per-record redaction-posture field; the export operation's write-once guarantee.                                                                                             | The event log; the redaction-classification rules (cited from policy/evidence, `w4-s2`, for what counts as sensitive). | Deciding what evidence categories exist (that is `w4-s2`'s plan/policy/evidence surface).                                       |
| **Evidence/Notice (projection-derived, Wave 1 carried forward)** | The vocabulary for what gates landing (Evidence) and what needs owner attention now (Notice) — both remain pure projections per Wave 1's settled model, not new stores this part introduces. | Nothing new — carried unchanged from Wave 1; this part only deepens the engine both project from.                                                                                | The event log via the projection engine.                                                                               | Their own persistence (still the log's).                                                                                        |

### Relations

| From                                    | Relation                                   | To                                                      | Notes                                                                                                                                                                                                                                                 |
| --------------------------------------- | ------------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runner, Fence (Wave 2 / `w4-s3`, cited) | append (candidate)                         | Event log                                               | Every transition/decision is an event; single leased writer per run                                                                                                                                                                                   |
| Event log                               | is replayed by (pure function)             | Projection engine                                       | Never hand-maintained; deterministic                                                                                                                                                                                                                  |
| Projection engine                       | derives                                    | State, summary, metrics, notices, Evidence vocabulary   | Wave 1's Evidence/Notice posture, carried forward unchanged                                                                                                                                                                                           |
| Event log                               | is the basis for                           | Redaction/export surface                                | Per-record posture, write-once export                                                                                                                                                                                                                 |
| Bootstrap (`w4-s4`, cited)              | constructs and wires                       | Event log (the records store)                           | **Named identically in `w4-s4`'s frame**: s1 defines the store's shape and invariants; s4 wires/constructs it at launch — a shared seam, not a duplicated design                                                                                      |
| Records/evidence surface (this part)    | is the frame-time contract for             | Wave 4b's `w4-s6-execution-host` (SEC-2, no-phone-home) | Named per the coordinator's mandate: the execution-host's attestation/evidence record (capability event family: driver attested / capability missing / capability stale / autonomy reduced) must be framed against this part's event/projection shape |
| Plan/policy/evidence (`w4-s2`, cited)   | supplies redaction-classification input to | Redaction/export surface                                | What counts as a sensitive value is `w4-s2`'s policy concern; this part only records the posture per event                                                                                                                                            |

### Seams and External Boundaries

- **The `RunStore` port** (Wave 3, candidate-named, cited) — `append(event)`/`project(...)`/
  `export`. This part deepens the engine behind the port, not the port's own method shape.
- **The observability-records contract v0** (cited, unfrozen) — the seam this engine's event
  families and required properties must satisfy; a shape gap routes back to the contract owner
  (STOP-003), never a silent local change.
- **The records-store construction seam (s1 ↔ s4)** — s1 owns the store's shape, consistency
  model, and invariants; `w4-s4` (bootstrap/composition root) owns constructing and wiring that
  store at launch. Stated identically in `w4-s4`'s frame.
- **The Wave 4b frame-time contract (s1 → w4-s6)** — this part's records/evidence surface is a
  named downstream dependency for Wave 4b's future `w4-s6-execution-host` frame (SEC-2,
  no-phone-home attestation).
- **The redaction-classification seam (s1 ← s2)** — this part records redaction posture per event;
  `w4-s2` (plan/policy/evidence) supplies what counts as sensitive.

### Lifecycle and State Terms

This part introduces no new lifecycle states (Wave 2's closed tables stand). Its only
lifecycle-adjacent vocabulary is the append/replay discipline: every transition across both
lifecycles (Wave 2) writes exactly one causally-ordered event; every projection (state, summary,
metrics, notices) is re-derivable at any time from the log alone, never advanced independently.

### Mode and Depth

- **architecture_mode:** `tactical-ddd` (recommended, requires approval — see §3)
- **initial ddd_depth:** `tactical-ddd` (recommended, requires approval — see §3)

### Open Questions and Approval

- Depth escalation to `tactical-ddd` for the Records engine specifically (requires approval,
  recommended — see §3).
- Downstream dependency: Wave 4b's `w4-s6-execution-host` frame will need this part's
  records/evidence surface settled to frame SEC-2 attestation — named here so it does not orphan
  at Wave 4b framing time.
- **Approval status: pending (coordinator).**

## 5. Assumptions and Blockers

(Restated from §3 for template completeness.)

### Safe Assumptions

- Event sourcing/CQRS stays a named, deferred subprofile; this part authors a consistency model
  and projection-purity invariant without adopting full event-sourcing ceremony.
- Placement (deepen `core/records.md` in place) is settled by the coordinator's brief and prior-wave
  precedent, not reopened here.

### Blocking Questions

None.

## 6. DDD Context Candidates

| Candidate context              | Owns                                                                                                                                                                               | Reads                                                                                                 | Does Not Own                                                                                                                  | Open ownership question                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Records engine** (this part) | The append-only log's consistency model (single-leased-writer, write-conflict rejection, ordering/causality); the projection-purity invariant; redaction posture per event; export | Events from the runner/Fence (Wave 2/`w4-s3`, cited); redaction-classification input (`w4-s2`, cited) | The store's construction/wiring at launch (`w4-s4`); redaction-classification rules themselves (`w4-s2`); plan/policy content | Depth escalation to `tactical-ddd` (requires approval) |

## 7. Complexity Drivers

- **Invariants:** append-only, single-leased-writer (continued INV-006); projections are pure and
  never hand-authored (continued INV-006); redaction posture recorded per record, never silently
  dropped (SEC-1); export is write-once (SEE-6). New candidates this part surfaces for `INV-009`+:
  write-conflict-rejected (a second writer for the same run is refused, not merged); replay-
  determinism (the same log always replays to the same projection).
- **State transitions:** none new — this part is the substrate Wave 2's closed transitions write
  into, not a new lifecycle.
- **Integrations / anti-corruption:** the `RunStore` port boundary (Wave 3, cited); the redaction-
  classification seam with `w4-s2`; the construction/wiring seam with `w4-s4`.
- **Consistency / idempotency / replay / audit:** this is the part's central complexity driver —
  single-leased-writer discipline, append-only monotonicity, deterministic pure-projection replay,
  write-once export. This is the concrete evidence for the `tactical-ddd` recommendation.
- **Security / authorization:** redaction posture per event (SEC-1); this part records posture, does
  not itself classify sensitivity (that's `w4-s2`'s).
- **Migration / deploy:** none — docs-only frame; no schema freeze, no package layout.
- **Observability:** this part **is** the observability substrate — SEE-1..6 in full; the event-
  family list from the v0 contract, cited not re-minted.
- **Testing:** none at this altitude; the future story brief's `tactical-ddd` depth will carry
  forward a failure-token catalog (write conflict, replay drift, redaction-bypass attempt) and
  consistency-model test-seam expectations.

## 8. Architecture Mode and Initial DDD Depth

**Selected architecture_mode:** `tactical-ddd` (recommended)

**Why this mode fits:** the Records engine is the first core part in this track whose central
concern is a consistency model over a real invariant boundary — the append-only, single-leased-
writer log — rather than a port shape (Wave 3) or a sequencing table (Wave 2). The ladder's
`tactical-ddd` trigger ("strict invariants... consistency model") is met directly: the log's
"single leased writer," "never mutated or deleted," and "projections are pure, never hand-
authored" are domain invariants a provider or future consumer must not violate, not merely an
adapter-isolation concern.

**Selected depth:** `tactical-ddd` (recommended)

**Why this depth fits:** the ladder's required elements for this rung — "aggregates or equivalent
transaction boundaries... failure-token catalogs, consistency model" — map directly onto this
part's deliverable: the log is the transaction boundary (single writer, monotonic append); the
failure-token catalog names write-conflict-rejected and replay-drift as first-class outcomes; the
consistency model is the append/replay discipline itself. This is **not** a reflex escalation:
Wave 3 held `ports-and-adapters` for the port _shape_; this part escalates specifically because it
is now authoring the engine's internal invariants, which Wave 3 explicitly deferred ("the concrete
storage engine is a deferred implementation detail... not a Wave 3 provider seam").

**Where tactical depth is intentionally omitted:** full event-sourcing/CQRS ceremony (snapshot
strategy, event upcasting/versioning, read-model materialization pipelines) is explicitly deferred
as a future subprofile, per the altitude ladder's own guidance ("treat event sourcing as a future
subprofile when audit, replay, temporal queries, or durable event history justify it... avoid by
reflex"). This part names the log's event-sourcing-adjacent shape without adopting that ceremony.

## 9. Handoff to Author

- **Design artifact target:** `docs/design/core/records.md` (deepen in place).
- **Required methodology profile:** `ddd`.
- **Approval status:** pending — one item requires coordinator resolution: depth escalation to
  `tactical-ddd` (recommended above).
- **Delivery constraints to preserve:** continue the existing vocabulary — do not mint new `INV-*`
  numbers below `INV-009`; this part's candidates (write-conflict-rejected, replay-determinism)
  are **INV-009+ CANDIDATES**, flagged for cross-wave reconciliation at the U9 pass alongside
  Wave 2's `w2-s3` and Wave 3's candidates — never hard-numbered here. Keep the three ID
  namespaces distinct (product IDs / `INV-*` / M5a SURF/DEL/CTX/ENF/FAIL/OBS/SEQ/VAL handoff
  categories). Preserve and cite `core/records.md`'s existing Owns/Interface/Diagram as this
  part's seed — re-project, never silently overwrite (STOP-003). The two v0 contracts stay cited
  and unfrozen, not edited. Name `w4-s4`'s construction/wiring dependency on this part's store
  shape explicitly (author-time `depends_on`, not frame-time). Name Wave 4b's `w4-s6-execution-
host` as a downstream frame-time consumer of this part's records/evidence surface.
