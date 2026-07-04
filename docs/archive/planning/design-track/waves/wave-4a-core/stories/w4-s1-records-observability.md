---
id: w4-s1-records-observability
wave: wave-4a-core
status: designed
depends_on: []
design_targets: [docs/design/core/records.md] # deepen in place (D-001): the append-only event-log engine, consistency model, projection-purity, redaction/export. The RunStore port line Wave 3's w3-s2 seeded here is PRESERVED and CITED. docs/design/contracts/observability-records-contract-v0.md stays CITED and UNFROZEN, not edited. author-technical-design may relocate via DocStructurePlan
reconciles_to:
  [SEE-1, SEE-2, SEE-3, SEE-4, SEE-5, SEE-6, SEC-1, LIVE-1, LIVE-2, INV-006]
---

# w4-s1-records-observability — design the Records event-log engine

## Objective

Brief a future design session to author the **Records event-log engine** — the append-only log,
its consistency model, the projection-purity discipline, redaction posture, and export — deepening
`docs/design/core/records.md` **in place** (D-001) from the port skeleton Wave 3 left it at into an
invariant-bearing tactical design. This session moves from the overview-altitude interface the stub
already draws — the `RunStore` port's `append(event)` / `project(state \| summary \| metrics)` /
`export`, seeded by Wave 3's `w3-s2` — to the **engine beneath the port**: what an event is (its
causal/ordering discipline), how the append-only log enforces a single leased writer and rejects
write conflicts, how state/summary/metrics/notices are pure functions of the log that are always
re-derivable and never authored separately, and how redaction posture is recorded per record.

This is the first Wave 4a part to author **tactical** core detail. Per **D-002** it runs at
`architecture_mode: tactical-ddd`, `ddd_depth: tactical-ddd`: the append-only, single-leased-writer
log is a **consistency model over a transaction boundary** (the ladder's tactical trigger), and
"pure projection, never hand-authored" is a domain invariant a provider or a future consumer must
not violate — qualitatively past Wave 3's port-shape altitude. Full event-sourcing/CQRS ceremony
(snapshot strategy, event upcasting, read-model materialization pipelines) stays a **named,
deferred subprofile**, not adopted this wave — per the altitude ladder's own "avoid event sourcing
by reflex" guidance and the frame's confirmed safe assumption.

Per D-001 this session **deepens `records.md` in place**, preserving and citing its existing
Owns/Interface/Diagram as the seed (STOP-003: re-project and cite, never overwrite; name any
divergence explicitly). The `RunStore` port line Wave 3's `w3-s2` seeded here is **preserved and
cited**, not re-authored. `docs/design/contracts/observability-records-contract-v0.md` is the
records-out seam **shape** this engine emits into; it stays **cited and unfrozen**, not edited — a
needed field change routes back to the seam owner (STOP-003), and this session mints no field names
or event-type strings.

## Inputs to read

- [`../frames/w4-s1-records-observability.md`](../frames/w4-s1-records-observability.md) — this
  part's frame: the source map, `InputResolution`, `AgreedSystemModel` (`architecture_mode`
  `tactical-ddd`, `ddd_depth` `tactical-ddd`), the entity model (event log / projection engine /
  redaction-export surface), the invariant candidates (§7), and the cross-part seams.
- [`../decisions.md`](../decisions.md) — the frame-gate dispositions this story is authored under
  (D-001 deepen in place; D-002 `tactical-ddd`/`tactical-ddd`; D-004 the s1↔s4 records-store
  construction seam and the s1→`w4-s6` Wave 4b frame-time contract; D-005 `INV-009`+ candidates
  un-numbered) and the confirmed safe assumption (event-sourcing subprofile deferred).
- [`../../wave-1-domain/frame.md`](../../wave-1-domain/frame.md) and Wave 1's settled story briefs —
  Run records as its own entity (the log; the single-leased-writer discipline; export), and Evidence
  and Notice as **projection-derived** concepts, not separate stores — the posture this engine
  preserves.
- [`../../wave-2-state-machines/frame.md`](../../wave-2-state-machines/frame.md) and Wave 2's settled
  story briefs — every closed work-item and run transition emits a candidate event into the log
  (INV-006); this session owns the engine those events are written into, not which events exist per
  transition.
- [`../../wave-3-ports/frame.md`](../../wave-3-ports/frame.md) and Wave 3's `w3-s2` — the `RunStore`
  port shape (`append` / `project` / `export`), the single-leased-writer discipline, and the
  pure-projection posture this session deepens the engine beneath, preserving and citing the port
  line as the seed.
- `docs/design/core/records.md` — the existing stub this session deepens in place: the Owns list
  (append-only log, single leased writer, pure projections, per-record redaction, export, notices +
  "ask why" from the same log), the `RunStore` Interface, and the diagram.
- `docs/design/contracts/observability-records-contract-v0.md` — the records-out seam shape and the
  event-family list this engine emits into; cited and **unfrozen**, not edited (no minting field
  names or event-type strings).
- `docs/design/core/orchestration.md` — the runner as the primary event source ("emits every
  transition and decision as an event to the records port"); cited, not re-authored (Wave 2's
  settled territory).
- `docs/product/guarantees.md` — SEE-1..6 (full visibility; structured/machine-readable;
  records-are-the-evidence; self-diagnosis; triaged notices; write-once redacted export), SEC-1
  (secrets stay out of records), LIVE-1/2 (liveness signals become records/notices) this engine
  reconciles to.
- `docs/design/notes/runtime-design-m5a.md` — INV-006 (records are the evidence; pure projections of
  an append-only log) and the OBS/ENF families this session continues — kept a namespace distinct
  from `INV-*` and product IDs.

## Deliverables

The five durable deliverable types this session must produce:

1. Durable design doc at the design_target: the deepened Records engine in
   `docs/design/core/records.md` — the append-only log's consistency model (single-leased-writer,
   write-conflict rejection, ordering/causality, replay-determinism), the projection-purity
   invariant, per-record redaction posture, and export — preserving and citing the `RunStore` port
   line and existing diagram as the seed.
2. Open questions, logged (never invented answers).
3. Invariants preserved and any added — continuing the `INV-*` ledger, never resetting. This session
   names its **invariant candidates** (write-conflict-rejected — a second writer for the same run is
   refused, not merged; replay-determinism — the same log always replays to the same projection),
   continuing the INV-006 append-only / pure-projection discipline. It does **not** hard-number them:
   they are candidates for `INV-009`+, flagged for cross-wave reconciliation with Wave 2's `w2-s3`
   and Wave 3's own candidates (settled at U9 by `docs/design/conventions.md`'s continuation rule).
4. Risks and deferred decisions — including the event-sourcing/CQRS subprofile, deferred with its
   proof gate named.
5. Review evidence: the design-review report plus decisions.md dispositions.

## Questions it must answer

- What is the append-only log's **consistency model**: how does it enforce a single leased writer
  per run, reject a second writer's write (write-conflict-rejected), and preserve enough
  ordering/causality that a replay is deterministic (replay-determinism)?
- How are state / summary / metrics / notices **pure projections** — re-derivable at any time from
  the log alone, never advanced independently or hand-authored (INV-006) — so no parallel narrative
  can drift from the log (SEE-3)?
- How is **redaction posture recorded per record** (SEC-1) without the engine itself classifying
  what counts as sensitive (that input comes from `w4-s2`'s policy/evidence surface, cited)?
- How does the records/evidence surface admit **Wave 4b's `w4-s6-execution-host`** as a frame-time
  consumer: the SEC-2 no-phone-home attestation record (the observability contract's capability
  event family — driver attested / capability missing / capability stale / autonomy reduced) must be
  framable against this engine's event/projection shape? Name this downstream dependency so it does
  not orphan at Wave 4b framing.
- What is the **records-store construction seam** with `w4-s4`: this session owns the store's shape,
  consistency model, and invariants; `w4-s4` (bootstrap) owns constructing and wiring the store at
  launch, including the first binding-record append. State this seam wording **identically** to
  `w4-s4`'s story.
- Why is full **event-sourcing/CQRS ceremony** a deferred subprofile rather than adopted now, and
  what proof gate would justify escalating to it later (per the stub rule: what is deferred, why, and
  the gate that ends the deferral)?

## Invariants to preserve

- `INV-006` (records are the evidence; state / summary / metrics / notices are pure projections of an
  append-only log, never authored directly) from `runtime-design-m5a.md` — the append-only /
  pure-projection discipline the deepened engine must carry, not weaken.
- `SEE-1`..`SEE-6` — full run visibility, structured/machine-readable records, records-are-the-
  evidence (no drift-able parallel narrative, SEE-3), self-diagnosis, triaged notices, write-once
  redacted export. The engine's projections and export realize these.
- `SEC-1` — secrets, tokens, credentials, sensitive values stay out of records; the per-record
  redaction posture must not be bypassed or silently dropped.
- `LIVE-1`, `LIVE-2` — liveness signals (thinking / idle / stuck / dead; overdue) become records and
  notices; the engine's notice projection surfaces them.
- No new `INV-*` numbers are hard-numbered by this story; it **names invariant candidates**
  (write-conflict-rejected; replay-determinism) for `INV-009`+, flagged for cross-wave coordination
  with Wave 2's and Wave 3's candidates. If it must number one locally, it continues from `INV-009`
  (never resets) and records why in decisions.md.

## Must not decide

- The **plan / policy / evidence** content — that is `w4-s2` (parallel root). This session records
  redaction posture per event but does not classify what counts as sensitive, and names the evidence
  vocabulary as projection-derived (Wave 1) without authoring the evidence/attestation category
  model itself.
- The **authority spine** — the Fence classifier, the Doorbell, the capability-attestation gate —
  that is `w4-s3` (parallel root). This session records authorization/attestation outcomes as events
  but does not author the classifier.
- **Bootstrap's construction/wiring** of the records store — that is `w4-s4`. This session owns the
  store's shape and invariants; `w4-s4` owns constructing and wiring it at launch (the s1↔s4 seam,
  worded identically in both stories).
- Anything Wave 2 settled: the work-item and run **state machines** and which events each transition
  emits. This session owns the engine those events are written into, not the transitions.
- Anything Wave 3 settled: the `RunStore` port **shape** and its owns/implements/must-not split.
  This session deepens the engine **behind** the port, preserving and citing the port line as the
  seed.
- **Freezing** the observability-records v0 contract — it stays **cited and unfrozen**; this session
  names the properties and event families the engine emits into without minting field names or
  event-type strings; a needed change routes back to the seam owner (STOP-003).
- The **storage engine, retention richness, or export encoding** — deferred per `records.md`'s own
  note; this session names the consistency model and redaction/retention posture, not the concrete
  storage mechanism. **Learning-loop interpretation** of records is a between-runs consumer per
  `jig.md`, out of scope.
- Full **event-sourcing/CQRS ceremony** — a named, deferred subprofile with its proof gate recorded,
  not adopted this wave.
- **Numbering** the consolidated invariant ledger — this session names candidates; numbering from
  `INV-009` is coordinated with Wave 2's and Wave 3's candidates at consolidation (U9).
- Field-level schema, TypeScript, JSON Schema, method signatures, or any frozen contract — deferred
  per `docs/design/README.md`.

## Exit criteria

- The deepened Records engine exists at `docs/design/core/records.md`, stating the append-only log's
  consistency model (single-leased-writer, write-conflict-rejected, ordering/causality,
  replay-determinism) and the projection-purity invariant as the load-bearing correctness
  properties, not afterthoughts.
- The existing Owns/Interface/Diagram — including the `RunStore` port line Wave 3's `w3-s2` seeded —
  are **preserved and cited** as the seed, re-projected and extended rather than overwritten; any
  divergence is named explicitly (STOP-003).
- Projections (state / summary / metrics / notices) are stated as pure functions of the log, never
  authored separately (INV-006, SEE-3); redaction posture is recorded per record (SEC-1); export is
  write-once redacted (SEE-6).
- The **records/evidence surface** is designed with Wave 4b's `w4-s6-execution-host` (SEC-2
  no-phone-home) named as a frame-time consumer; the **records-store construction seam** with
  `w4-s4` is stated identically to `w4-s4`'s story.
- The observability-records v0 contract is **cited and unfrozen**, not edited; no field names or
  event-type strings are minted.
- The invariant candidates (write-conflict-rejected; replay-determinism) are named for `INV-009`+ and
  flagged for cross-wave coordination; the event-sourcing subprofile is deferred with its proof gate;
  the three ID namespaces are kept distinct.
- design-review verdict settled (zero open blocking suggestions), applied at the full method below.

## Evidence required

- This part's frame ([`../frames/w4-s1-records-observability.md`](../frames/w4-s1-records-observability.md))
  — the frame that seeds this story's frame step.
- The authored design_target (`docs/design/core/records.md`).
- The design-review report.
- The decisions.md entries (this wave's [`../decisions.md`](../decisions.md)).

## Design review & handoff

This session runs the technical-design method itself, at **full weight** — this story authors a real
jig core internal (the Records event-log engine, the durable evidence substrate every other part and
every later wave reconciles to), so the full frame → author → design-review pass applies, not the
light method Wave 0 used for its scaffold-only stories.

1. frame-technical-design → a problem frame (source map, `InputResolution`, `AgreedSystemModel`,
   `architecture_mode` `tactical-ddd`, `ddd_depth` `tactical-ddd` per D-002). This part's build-time
   frame at [`../frames/w4-s1-records-observability.md`](../frames/w4-s1-records-observability.md)
   seeds it; the session confirms and extends the `AgreedSystemModel` rather than starting from
   nothing.
2. author-technical-design → the deepened Records engine at `docs/design/core/records.md`, preserving
   and citing the existing Owns/Interface/Diagram (and the `RunStore` port line) as the seed; the
   observability-records v0 contract cited and unfrozen.
3. review-technical-design → three lenses (architecture-enforceability: the log is append-only,
   single-leased-writer, write-conflict-rejecting; projections are pure and never author the log;
   redaction posture is per-record and un-bypassable; the v0 contract stays unfrozen.
   domain-correctness: the engine reconciles to SEE-1..6 / SEC-1 / LIVE-1/2 / INV-006 and preserves
   the append-only / pure-projection discipline without minting field names; agreement-integrity:
   nothing contradicts the part frame's `AgreedSystemModel`, Wave 1's Evidence/Notice-as-projection
   posture, Wave 2's transition-emission points, Wave 3's `RunStore` port shape, or the s1↔s4
   construction seam / s1→`w4-s6` frame-time contract). Dispositions recorded into this wave's
   [`../decisions.md`](../decisions.md); settled = zero open blocking suggestions.

Handoff: when settled, update status and note the resolved design_target in the track's future
traceability matrix; hand the named invariant candidates forward for `INV-009`+ consolidation
(coordinated with Wave 2's and Wave 3's candidates); confirm the records/evidence surface is ready as
Wave 4b's frame-time contract for `w4-s6-execution-host`.

## Coordinator resolution (design_targets)

Per D-001 (deepen in place, no rename), this story deepens `docs/design/core/records.md` directly —
preserving and citing its existing Owns/Interface/Diagram (including the `RunStore` port line Wave
3's `w3-s2` seeded) as the seed and extending it into the append-only event-log engine with its
consistency model — rather than authoring a new sibling doc. This is the STOP-003-compliant
"re-project and cite." `docs/design/contracts/observability-records-contract-v0.md` stays **cited and
unfrozen**, not edited. The future `author-technical-design` session may relocate the target via its
`DocStructurePlan` if its own frame finds a better home; this brief records the resolved target, not
a frozen path.
