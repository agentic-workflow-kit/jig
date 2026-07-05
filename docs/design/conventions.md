---
title: "Jig — design-layer conventions and ledgers"
status: overview — design conventions
---

# Jig — design-layer conventions and ledgers

This states, once and explicitly, the naming and bookkeeping conventions every later design wave
depends on, so a wave's stories can cite this doc instead of re-deriving numbering and format
rules from precedent. It descends from [`charter.md`](./charter.md) — in particular the
charter's [deliverable rule](./charter.md#deliverable-rule), which requires every design session
to log open questions, invariants, risks, and review evidence in a structured, durable, and
inspectable way. The six conventions below are how that requirement is kept consistent across
waves, not a new rule layered on top of it.

This doc sits alongside [`charter.md`](./charter.md) and [`README.md`](./README.md) without
duplicating either: the charter states the goal/boundary/stub/deliverable rules; the README
indexes the design-layer files; this doc states the shared conventions the rest of the design
layer's bookkeeping runs on.

## 1. The `INV-*` invariant ledger continues as one running list

`INV-001` through `INV-018`, tabulated in
[`notes/runtime-design-m5a.md`](./notes/runtime-design-m5a.md), are the full invariant ledger to
date and continue **verbatim, with no renumbering or duplication**. The ledger is, and stays, a
**single running list** — not per-area lists rolled up by a track-level index.

**Why a single list, not per-area lists.** Two considerations settle this, both already implicit
in current precedent rather than newly invented here:

- `runtime-design-m5a.md`'s own table is already one flat list across five different owning
  contexts (Plan Intake, Orchestration, Fence, Records, Driver seams) — a per-area split would
  require retroactively partitioning an existing table that was never designed to be partitioned.
- The ADR log (§2 below) is the nearest sibling ledger, and it is a single flat log by explicit
  precedent (ADR 0016). Two different rollup strategies for two structurally similar ledgers
  would itself be a naming/bookkeeping inconsistency this doc exists to prevent.

**Canonical home.** The invariant table as currently tabulated in
[`notes/runtime-design-m5a.md`](./notes/runtime-design-m5a.md) **is** the ledger's canonical
home, present and future — existing and later invariants are written there, as new rows
appended to that table. That file is archival in the sense of
[`README.md`](./README.md#notes--intake-and-reference) ("archive") — meaning it is **not a
redistribution or restructuring target**: its content is not shredded out into per-area files,
and the ledger is not re-homed into a new file merely to make it feel "live." It **is**, however,
an **append-only continuation** target for the one ledger it hosts: adding a new `INV-*` row is a
preserving append, not a restructuring, so where the next invariant lands is unambiguous — the
same table, one row lower. If a future wave's invariant count grows large enough to make one
table unwieldy, a restructuring (partitioning or re-homing the table) is itself a decision to log
in that wave's `decisions.md`, not a default this convention pre-approves.

**Continuation rule.** The next available invariant number is **`INV-019`**. A later wave that
finds a genuine new invariant:

1. numbers it the next integer after the highest existing `INV-*`;
2. **appends** it as a new row to the invariant table in
   [`notes/runtime-design-m5a.md`](./notes/runtime-design-m5a.md) — an append-only continuation
   that alters no existing row, `INV-001` through the last-prior entry;
3. records why it was needed in that wave's own `decisions.md`, per the charter's
   [deliverable rule](./charter.md#deliverable-rule) and the continuation pattern already stated
   in the charter's own [Invariants](./charter.md#invariants) section.

[ADR 0016](./decisions/0016-stub-first-scaffold-preserve-m5a-record.md) established that the M5a
record is **preserved** as a source to mine when deepening stubs — content flows _out_ of the
archive into core files, and shredding the record apart is disallowed. An append-only
continuation is compatible with that principle from the other direction: it adds new rows **in
place** without disturbing any preserved content. ADR 0016 does not itself speak to new content
flowing _in_; this convention is what authorizes the append, not the ADR.

## 2. The ADR/decision log continues in place as one flat log

The design-layer ADR log at [`decisions/`](./decisions/) continues **in place**, as **one flat
log**, numbered sequentially. The live index at
[`decisions/README.md`](./decisions/README.md) is the authority for current entries and for the next
available number at authoring time. This session mints nothing: no ADR is authored by this story,
per the coordinator resolution in this story's brief (no structural change, no new log file).

**How this log relates to the two other decision logs already in the tree** (this is not a new
taxonomy — it mirrors the scope note already written near the top of
[`notes/wave-0-execution-review.md`](./notes/wave-0-execution-review.md)):

| Log                                                                     | Scope                                                                                                   | Numbering                                | What it records                                                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `docs/design/decisions/000N-*.md` (this ADR log)                        | Design-layer decisions about jig's own design content (entities, ports, state machines, conventions)    | Flat, sequential; see the live index     | One ADR per durable design decision, in the order made                                            |
| `docs/archive/planning/design-track/waves/<wave>/decisions.md`          | Planning-track scaffold QA and frame `InputResolution` dispositions for that wave's stories             | Per-wave `D-001..`, restarting each wave | Frame-resolution choices and design-review suggestion dispositions for that wave's planning units |
| `docs/design/notes/wave-0-execution-review.md` (and successors, if any) | Build-time `review-technical-design` dispositions for the design-layer **execution** of a wave's briefs | Per-log `D-001..`, restarting per log    | The coordinator's disposition of reviewer findings against the authored design docs themselves    |

These three logs are **distinct by scope, not by competing authority**: the ADR log is the
durable record of _what was decided about jig's design_; a wave's planning `decisions.md` is the
record of _how that wave's planning briefs were framed and QA'd_; an execution-review log is the
record of _how the resulting design prose fared under review_. None replaces another, and this
convention does not merge them. A future session that finds two of these logs recording the same
fact should route that finding back to whichever log is authoritative for the fact's scope,
rather than duplicating it — but that is a normal editorial check, not a structural change this
doc needs to define further.

## 3. Three ID kinds are namespaced by prefix, and the prefixes are provably disjoint

This rule governs the three **globally-referenced** ID kinds — product IDs, invariant IDs, and
design-layer handoff-category IDs — the kinds a later wave cites across documents. Each such ID is
a `PREFIX-N` (or `PREFIX-0N`) token; the prefix alone determines which ledger and which owning doc
the ID belongs to, and every such ID resolves to exactly one referent. Collision-freedom follows
from one fact, checked below by enumeration: **the set of product-guarantee prefixes and the set
of design-layer prefixes are disjoint sets of strings.**

Note that not every `PREFIX-N` token in the tree is globally unique, by design: **log-local
counters** such as the `D-###` decision IDs (§4) and the `S-###` review-suggestion IDs restart at
`-001` within each log — each planning `decisions.md` and each execution-review log has its own
`D-001`, and `runtime-design-m5a.md` even uses `D-001/002/003/005` as inline shorthand for ADR
entries. These are intentionally scoped to their owning log, not the cross-document namespace this
section proves disjoint. That is a different, compatible kind of namespacing (log-scoped
uniqueness) than §3's cross-set disjointness, and the two do not conflict: a `D-###` is read
relative to the log it appears in, never as a global reference.

**Product prefixes** (owned by [`docs/product/guarantees.md`](../product/guarantees.md)):

`FENCE`, `EARN`, `GUARD`, `DOOR`, `MERGE`, `SEC`, `CFG`, `RESUME`, `ISO`, `LIVE`, `STACK`, `DRIVE`,
`SEE`.

**Design-layer prefixes** (owned by `docs/design/`, tabulated in
[`notes/runtime-design-m5a.md`](./notes/runtime-design-m5a.md)):

`INV`, `SRC`, `CTX`, `SURF`, `FAIL`, `OBS`, `ENF`, `DEL`, `SEQ`, `FILE`, `VAL`, `STOP`.

Enumerating both sets side by side and comparing every pair confirms the intersection is empty —
no string appears in both lists (near-neighbors like `STACK`/`STOP` and `SEC`/`SEE`/`SEQ` are
different strings and never match under whole-token comparison, so the hyphen-delimited,
whole-prefix match is what does the disjointness work, not the numeric padding that happens to
differ between the two groups as a cosmetic side effect).

**Reference-only prefixes are out of scope of this proof.** `runtime-design-m5a.md` also carries
reference-lessons IDs such as `RL-2`, `RL-5`, `RL-8` (pointers into
[`notes/prior-art-workflow-kit.md`](./notes/prior-art-workflow-kit.md)), which are a `PREFIX-N`
token in neither enumerated set. These are reference-only citations, not one of the three
globally-referenced ID kinds this section governs, so they fall outside the disjointness proof —
parallel to the "Deferred — namespacing beyond the three current kinds" risk below. `RL` is
lexically disjoint from both sets, so this is a scoping clarification, not an unhandled collision.

**The two subtleties this rule must address head-on, because they look like collisions and are
not:**

- **`INV` is not shared between two different kinds — "invariant IDs" and "the `INV` handoff
  category" are two descriptions of the same ledger.** The brief's kind (b) ("invariant IDs") and
  kind (c) ("`INV` as the handoff category for invariants") both name
  `notes/runtime-design-m5a.md`'s one `INV-*` ledger. There is exactly one `INV` ledger; "invariant
  ID" and "`INV` handoff
  category" are two names for looking at the same rows (an invariant, as a fact about the system,
  and a handoff category, as a slot in the Planner Handoff Summary table, are the same table row
  seen from two purposes). This is co-reference, not collision — nothing here needs disambiguating
  because there is only one referent to begin with.
- **`STOP`, `CTX`, `SURF`, and the other handoff categories are not double-booked as "categories"
  and separately as "vocabulary-ledger prefixes."** `CTX-001..005`, `SURF-001..006`, `FAIL-001..004`,
  `OBS-001..004`, `ENF-001..004`, `DEL-001..006`, `SEQ-001`, `FILE-001`, `VAL-001`, and
  `STOP-001..004` in `runtime-design-m5a.md`'s Planner Handoff Summary **are** the vocabulary
  ledger; the handoff-category column name and the ID prefix are, again, the same rows described
  from two angles (the review-technical-design skill's Step 2 lens language, and the raw ID
  table), not two ledgers that happen to reuse a name.

So the full proof is: (1) every ID is `PREFIX-N`; (2) prefix membership is checked against exactly
two disjoint enumerated sets above; (3) within the design-layer set, apparent "two kinds sharing a
name" (`INV` as invariant vs. handoff category; `STOP`/`CTX`/etc. as category vs. vocabulary
prefix) are single referents under two names, not two referents under one name — so there is
nothing left to disambiguate once the enumeration confirms no cross-set string match.

## 4. Per-wave decision-log format: one shared `D-###` shape, two disposition vocabularies

A wave's `decisions.md` (see the concrete instances at
[`waves/wave-0-charter/decisions.md`](../archive/planning/design-track/waves/wave-0-charter/decisions.md)
and [`waves/wave-1-domain/decisions.md`](../archive/planning/design-track/waves/wave-1-domain/decisions.md),
both read-only planning artifacts cited here, not edited) and a build-time execution-review log
(the concrete instance at
[`notes/wave-0-execution-review.md`](./notes/wave-0-execution-review.md)) share one row shape:

| Column             | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ID`               | `D-###`, sequential within that log, starting at `D-001` per log (each wave's planning log and each execution-review log number independently — these are different logs per §2, so they do not share one counter)                                                                                                                                                                                                                              |
| Decision / Finding | The question framed, or the reviewer's finding, in one sentence                                                                                                                                                                                                                                                                                                                                                                                 |
| Disposition        | Either a frame-`InputResolution` disposition (the resolved choice — e.g. "choice (a)", "choice (b)", or a plain resolved statement) or a design-review suggestion disposition: `fix` / `reject` / `defer`, per `review-technical-design`'s suggestion schema (`fix` routes the accepted change back to the same authoring session and re-reviews; `reject` records why no change is made; `defer` records the item without changing the design) |
| Rationale          | The source evidence or reasoning behind the disposition                                                                                                                                                                                                                                                                                                                                                                                         |

A single table may carry both disposition vocabularies in the same log — `wave-1-domain/decisions.md`
already does this by convention (frame-resolution rows read as a resolved choice; a later wave's
review-suggestion rows would read `fix`/`reject`/`defer`). This convention does not require
splitting a wave's log into two tables; it only requires that every row be identifiable as one
disposition kind or the other from its own text, which the existing rows already are.

## 5. Open-questions ledger convention: no new ID kind; carry forward through the existing decision-log mechanism

An open question is **not** given a new ID prefix (an `OQ-*` prefix or similar would be a fourth
ID kind, and §3's disjointness proof covers exactly three kinds — product IDs, invariant IDs, and
design-layer handoff-category IDs — so a fourth kind is out of scope for this convention to
introduce silently). Instead:

1. An open question is logged in the design doc that raised it, under that doc's own "Open
   questions" section (the deliverable rule's second durable thing), in plain prose.
2. If a later wave depends on an area with a still-open question, that wave's authoring session
   must read the upstream doc's "Open questions" section as part of its own required inputs (the
   same way this session was required to read `charter.md` in full) and either (a) resolve it —
   recording the resolution as a `D-###` disposition in its own `decisions.md`, per §4, with a
   citation back to the doc and section where the question was raised — or (b) explicitly carry
   it forward unresolved, restating it in its own "Open questions" section so it is not silently
   dropped between waves.
3. A question is only removed from a doc's "Open questions" section once resolved; removal without
   a recorded `D-###` disposition is not permitted under this convention.

This keeps an open question visible by the same mechanism that already keeps decisions visible —
the per-wave decision log — rather than inventing a parallel tracking structure. A question is
never silently lost because dropping it requires either a citation-bearing resolution or an
explicit restatement, both of which are inspectable in a `decisions.md` or a doc's own
"Open questions" section.

## 6. Evidence appendix convention: committed records are inputs to decisions, not authority

Some design decisions depend on live behavior outside this repository: external CLIs, app-server
protocols, hosted services, operating-system behavior, or other tools whose contracts may drift.
When a design session relies on that behavior, it records the probe as a committed evidence record
instead of leaving the proof in local terminal scrollback.

**Canonical home and name.** Committed evidence records live in [`evidence/`](./evidence/) with
filenames shaped as `YYYY-MM-DD-<slug>.md`. The ISO date is repeated in the record header. A later
session may choose a narrower home only when an existing repo convention clearly owns that evidence
more directly, and that exception should be named in the record itself.

**Evidence records are citable artifacts.** A committed evidence record is intentionally different
from `runs/`: `runs/` is git-ignored local runtime data, while `docs/design/evidence/` is durable,
reviewable design input. Records may summarize captured transcripts or outputs, and may cite local
raw captures by content hash, but the committed Markdown record is the thing future design work
cites.

**Version and drift pins.** Every record pins the exact external tool versions probed, including
the CLI version where a CLI is in the path. Where the record summarizes captured transcripts,
structured outputs, generated schemas, or command logs, it also records the relevant content hashes
so later readers can detect whether a claim was made from the same material.

**Required `Limitations` section.** Every record contains a `## Limitations` section stating what
the evidence does prove, what it does not prove, and what assumptions or host constraints bound the
probe. A record without this section is incomplete even if the probe itself succeeded.

**Redaction check before commit.** Every record is checked before commit for tokens, credentials,
private URLs, private repository names when not essential, and other sensitive material. The record
states whether redaction was applied. If there is ambiguity about whether a value is sensitive, the
author stops and asks the owner; the author does not make a judgment call and commit anyway.

**Supported IDs.** Records cite the acceptance criteria, product guarantee IDs, invariant IDs, or
ADR / decision IDs they support. Evidence is input to decisions: it can support, weaken, or block an
ADR, but it is never authority by itself and never replaces the ADR or contract owner.

## Reconciliation

These six conventions reconcile to `SEE-1`, `SEE-2`, `SEE-3` (see
[`../product/guarantees.md`](../product/guarantees.md#5-full-observability)). This is deliberately
reflexive, not a category error: `SEE-1` (full visibility to reconstruct what happened and why),
`SEE-2` (structured, machine-readable records), and `SEE-3` (the records used to decide are the
records inspected afterward) are guarantees jig makes about _its own runtime_. Applied to jig's
_design process_, the same shape of guarantee holds: the conventions in this doc keep the
invariant ledger, the ADR log, the ID namespaces, the per-wave decision log, the open-questions
ledger, and the committed evidence records structured, durable, and inspectable. A later design
session can reconstruct why a decision was made and what remains open, the same way a run's owner
reconstructs what happened in a run. jig's observability guarantee is applied to jig's own design
record, on purpose.

## Open questions

None from this session. (Per §5 above, this is stated explicitly rather than left implicit.)

## Invariants

`INV-001` through `INV-018` in [`notes/runtime-design-m5a.md`](./notes/runtime-design-m5a.md)
continue verbatim, per §1 above. This conventions session added **no new invariant**: stating how
the ledger continues, how the ADR log continues, how IDs are namespaced, how decision logs are
shaped, how open questions carry forward, and how committed evidence records are formed is
governance of the design-layer's own bookkeeping, not a claim about jig's runtime behavior. The
next available number is `INV-019`.

## Risks and deferred decisions

- **Risk — ledger unwieldiness.** A single running `INV-*` list (§1) could grow large enough to
  become hard to navigate as more waves add invariants. Mitigation: not addressed by this
  convention now — a future wave that finds the list unwieldy logs that finding and its proposed
  restructuring as a decision in its own `decisions.md`, rather than this doc pre-approving a
  split.
- **Risk — log proliferation.** §2's three-log taxonomy (design ADR log, per-wave planning
  `decisions.md`, execution-review log) is already close to the edge of what one project can keep
  straight without confusion. Deferred: no fourth log is introduced by this convention; if a future
  need arises for another log, it should be justified against this doc's taxonomy first, not
  added ad hoc.
- **Deferred — namespacing beyond the three current kinds.** §3's disjointness proof is scoped to
  the three ID kinds in play today (product, invariant, design-layer handoff-category). If a
  future wave introduces a genuinely new ID kind (for example, a distinct provider-conformance ID
  space), extending the disjointness proof to include it is that wave's own decision to log, not
  pre-authorized here.
- **Risk — stale external-tool evidence.** Committed evidence records can outlive the external tool
  version they probed. Mitigation: §6 requires date, version, content-hash, and limitations pins,
  and requires later ADRs to treat evidence as input rather than authority.

## Related

- [Jig — design-layer charter](./charter.md) — the goal/boundary/stub/deliverable rules these
  conventions operate under.
- [Jig — design](./README.md) — the design-layer index this doc sits alongside.
- [`notes/runtime-design-m5a.md`](./notes/runtime-design-m5a.md) — the source of the continuing
  `INV-*` ledger and the design-layer handoff-category vocabulary.
- [`decisions/README.md`](./decisions/README.md) — the ADR log this doc's §2 continues.
- [`evidence/README.md`](./evidence/README.md) — the committed evidence-record index governed by
  this doc's §6.
- [`docs/product/guarantees.md`](../product/guarantees.md) — the product ID families this doc's
  §3 keeps distinct from invariant and handoff-category IDs.
