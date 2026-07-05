---
title: "ADR 0025 — Phase 9 records-integrity: sidecar tamper-evidence, active resume-blocked-missing-approval, the tamper-vs-changed-basis split, and the resume driver-binding fold-in"
status: applied
---

# ADR 0025 — Phase 9 records-integrity

## Context

Phase 9 ([`docs/archive/delivery/m7-real-providers/phases.md`](../../archive/delivery/m7-real-providers/phases.md),
P9-AC-1..3) discharges the integrity deferral [ADR 0020](./0020-phase-4-reliable-local-runs.md) left
open. It makes the durable run evidence — the authoritative launch header, the plan snapshot, and the
policy snapshot — **tamper-evident**, and it activates the `resume-blocked-missing-approval` re-approval
path that Phase 4 named and wired as a seam **with no active trigger**. It is the final phase of the M7
real-providers track: after Phase 6 made the agent and execution-host seams real
([ADR 0022](./0022-phase-6-real-driver-integration.md)), Phase 7 made the Forge seam real
([ADR 0023](./0023-phase-7-real-forge-landing.md)), and Phase 8 made the work-source seam real
([ADR 0024](./0024-phase-8-real-work-source.md)), Phase 9 is the phase in which an operator can trust
that a run record has **not** been tampered with, and in which a safety-relevant change to an approved
plan's basis while a run is stopped **actively blocks resume** until it is re-approved rather than
resuming on stale authority. What is missing is the set of concrete choices an implementer would
otherwise have to invent. This ADR settles them so two independent implementers produce compatible
Phase 9 behavior, exactly as ADRs 0021–0024 did for Phases 5–8.

Phase 9 is sequenced **after Phase 6** deliberately.
[ADR 0020](./0020-phase-4-reliable-local-runs.md) ("Record and snapshot integrity — deferred to a
later phase") is explicit that meaningful integrity needs a **trust anchor**, and that a records-
integrity phase is "out of scope until a dedicated records-integrity phase after Phase 5 … the first
point at which a trust anchor (an OS keychain, a TPM, or a remote attestation surface arriving with
real providers) exists to make signing meaningful; adding key machinery at pure local altitude would
buy no protection a same-host actor does not already control." The real providers of Phases 6–8 are
that anchor's arrival. This ADR does not defer the primitive to a keyless placeholder on the strength
of "local is cheaper" — the whole point of the sequencing is that the anchor now exists (Decision 1).

The design layer already seeds every Phase-9 concept — the append-only evidence surface, the
projection-purity/replay-determinism engine rule, and the redaction/export posture in
[`../core/records.md`](../core/records.md); the Fence/Doorbell owner-decision escalation path, the
positive-only capability-attestation gate, and the CFG-10 "no model adjudicates this boundary" rule in
[`../core/authorization.md`](../core/authorization.md); the launch binding, the durable plan and policy
snapshots, the resume re-entry procedure, and the resume-integrity prerequisite check in
[`../core/bootstrap.md`](../core/bootstrap.md); and the `resume-blocked-missing-approval` resume-
integrity gate itself in [ADR 0020](./0020-phase-4-reliable-local-runs.md) §9.

### Delivered reality this ADR builds on

Confirmed against `src/` at authoring time (the **real as-merged** shapes, not the ADR 0021 sketch):

- **The run directory holds `events.jsonl` (authoritative) + `run.json` (finalized cache) plus the
  durable snapshots.** [`../../../packages/jig-sdk/src/resume.ts`](../../../packages/jig-sdk/src/resume.ts) reads back
  `plan.snapshot.json` (`PLAN_SNAPSHOT_FILE`), `policy.snapshot.json` (`POLICY_SNAPSHOT_FILE`), and —
  since Phase 6 — `attestation.snapshot.json` (`ATTESTATION_SNAPSHOT_FILE`). These snapshot files, plus
  the `run.started` launch header at the head of `events.jsonl`, are exactly the durable evidence
  integrity is computed over.
- **The launch header is authoritative in the log.** ADR 0020 §1 promoted the launch `binding`
  (`run.id`, `planId`, `policyRef`/`configRef`, `binding.workspace` fingerprint, run-level
  redaction/export posture, and the plan/policy snapshot references) into the `run.started` record. As
  of Phase 8, that header also carries the additive `workSourceCandidate` provenance
  ([ADR 0024](./0024-phase-8-real-work-source.md) Decision 3), and the Phase-6 `attestationSnapshot` and
  `substrateManifest` references (`src/resume.ts` `finalize`). All of it rides in the header integrity
  covers — see Contract-Impact-Gate Q4.
- **`resume-blocked-missing-approval` exists as a named seam with no active trigger.** `src/resume.ts`
  declares `ResumeRefusalReason = 'resume-blocked-binding-mismatch' | 'resume-blocked-workspace-mismatch'
| 'resume-blocked-missing-approval'` and the `ResumeRefusal` error, but **nothing throws the
  missing-approval reason today**. P4-AC-3 is met only by _enforced launch-policy immutability across
  resume_ (the policy snapshot is rebuilt, never a permissive stub), not by an active re-approval trigger
  (ADR 0020 §9). Phase 9 gives it its trigger.
- **The resume driver-binding residual is live and unbound.** `describeConfigBinding` (`src/resume.ts`
  lines 58–62) hashes **only** `mode` + `recordDir` (`mode=<mode>;recordDir=<dir>`) — **not** the driver
  selection. `configForResumeComposition` (lines 189–199) forces `workSource: 'reference'` from the
  snapshot (T8's fix bound only the work-source leg), and passes any other `config.drivers` through from
  a `--config` **only if one is supplied**. `readDriverSelection` / `assertReferenceSelection`
  (`src/bootstrap.ts`) select `agent`/`executionHost`/`forge`/`workSource` by name, but **no config or
  driver snapshot is persisted at launch** — there is no artifact parallel to `plan.snapshot.json` /
  `policy.snapshot.json` that records the launch driver selection. So a resume `--config` selecting a
  different `agent=codex` / `forge=github` real driver is **not** verified against launch selection. This
  is the deferred T6/T8 residual Phase 9 folds in (Decision 4) — run through Contract-Impact-Gate Q5.
- **No integrity/digest/HMAC field exists in the observability-records v0 contract.**
  [`../contracts/observability-records-contract-v0.md`](../contracts/observability-records-contract-v0.md)
  is explicitly **"v0 Not Frozen Schema"**, states the launch binding "must be recoverable from the
  durable event log itself," and already requires records to "show when safety-relevant assumptions
  changed while the run was stopped and why re-approval or fresh evidence was required before continuing"
  (lines 173–174) — but it names **no** digest, HMAC, hash-chain, or integrity field. Integrity is
  therefore a genuinely **new, separate surface** (the sidecar), not an edit to any existing record field
  — see Contract-Impact-Gate Q5.

The v0 contracts remain unfrozen; nothing here freezes the execution-plan or observability-records JSON
Schema, mints a public contract package, or introduces a new provider port. Where the sidecar needs a
field, its meaning is named here and its exact encoding is design-owned on the sidecar (not the record),
consistent with the phasing posture of [ADR 0017](./0017-records-seam-reconciliation.md) decision 5.

## Contract Impact Gate

The whole M7 program rests on one regression anchor: **the Phase-0..4 record goldens stay byte-identical
under the default reference wiring.** This section is a genuine attempt-to-break — for each question it
actively hunts the design path that _would_ force a golden change or a v0 freeze, then shows why the
chosen design does not take it. If any answer flipped, the correct move is a HALT to the coordinator, not
authoring around it (see "Halt conditions" and the Phase-9 stop conditions in `phases.md`). The reviewer
is pointed at this section specifically to attack it.

### Q1 — Can tamper-evidence live _entirely_ on a sidecar / non-golden surface, never in the default golden record?

**Yes. The path that would break byte-identity is a naive hash-chain, and this design does not take it.**

The attack-to-break: the brief speaks of "a hash-chain over the event log." The obvious naive
realization writes each event's predecessor-hash **inside** the next line of `events.jsonl` (a
self-referential chain). That would put integrity bytes into the golden record surface and break the
Phase-0..4 byte-identity — HALT condition #1. This design **explicitly rejects** that construction.

Instead, integrity is **computed over** the durable evidence but **materialized on a separate integrity
sidecar** beside the run directory: `runs/<id>/integrity.json` (name design-owned). The immutable launch
evidence — the launch header (`run.started`, including the additive `binding.drivers` sub-field of
Decision 4), `plan.snapshot.json`, `policy.snapshot.json`, and `attestation.snapshot.json` where present —
is digested **once at launch** because those bytes do not change. The append-only event log is covered
separately by a **hash-chain over the accepted log bytes**, maintained under the governed
single-leased-writer append path: each governed append extends the chain and updates the sidecar
**atomically with** the append, so the sidecar reflects the current accepted log rather than a stale
launch-time snapshot. The sidecar carries those digests / chain head and an **HMAC over them** keyed by an
environment-supplied key (Decision 1). `events.jsonl` and every snapshot are written **byte-for-byte
unchanged**; the sidecar is a _new_ file, not an edit. Nothing integrity-related is appended to, nested
in, or reshaped within any governed record. So the default record bytes are identical whether or not the
sidecar exists. **Green.**

### Q2 — Can inspect/resume _detect_ broken integrity _without_ writing integrity bytes into default records?

**Yes — recompute-over-content + compare-to-sidecar.** At `inspect` and at `resume` preflight, the engine
**recomputes** the immutable-artifact digests, the current event-log hash-chain, and the HMAC with the
environment key, then **compares to the sidecar**. A mismatch (a byte changed out-of-band; an accepted
append missing from the sidecar chain; a digest or HMAC that no longer verifies) is a detected break. The
detection reads the record bytes and the sidecar; it **writes nothing** into the record to detect.
`inspect` **surfaces** the break as a diagnosable notice; `resume` **refuses** with a named reason
(Decision 3). The mechanism is pure recompute-and-compare on the projection side, while sidecar
maintenance is owned by the governed append path — never by writing integrity bytes into the evidence
stream — exactly the posture `records.md` "Projection purity" and "single leased writer" already require.
**Green.**

### Q3 — Can the active re-approval use _existing/additive_ record families, without freezing v0 or minting a new family?

**Yes.** The re-approval evidence is a **fresh owner decision through the existing owner-decision /
Doorbell path** — `authorization.granted` basis `["owner-approval"]` / `authorization.denied` basis
`["owner-rejection"]`, the exact families Phase 3 delivered and `authorization.md` owns. No new family is
minted; the decision is narrow and durable, as DOOR-1..3 already require. The **preflight refusal**
(`resume-blocked-missing-approval`, and the new tamper reason of Decision 3) is **not** a persisted event
at all — it is a **live resume-preflight diagnostic**, in the same category as the three
`resume-blocked-*` diagnostics ADR 0020 §8 already excludes from the projected-notice table (a
`resume-blocked-*` message + non-zero CLI exit, computed live, not replayable from the stopped log). A new
reason _string_ on the existing `ResumeRefusalReason` union is a live-diagnostic label, not a minted event
family. The observability-records contract **already** requires records to show "when safety-relevant
assumptions changed while the run was stopped and why re-approval or fresh evidence was required"
(observability-records-contract-v0 lines 173–174) and preserves "any re-approval caused by rule-governing
changes" (GUARD-2 commitment) — so this rides commitments the contract already names. **Green.**

### Q4 — Does Phase 8's additive `workSourceCandidate` provenance (on `run.started`) create schema/contract pressure Phase 9 must account for?

**No — it is covered, and covering it needs no freeze.** The `workSourceCandidate` provenance
([ADR 0024](./0024-phase-8-real-work-source.md) Decision 3) is an additive field **inside the
`run.started` launch header**. Phase 9 integrity is computed over the launch header **as written** —
whatever bytes it contains, including the additive provenance, are inside the digest's input. So the
provenance is protected **automatically** by the header digest; no special-casing, no field-by-field
enumeration, no schema dependency. Covering it is a property of "digest the header's bytes," which is
encoding-agnostic and needs no frozen field. Phase 8's widening and Phase 9's integrity are orthogonal
and compose without pressure. **Green.**

### Q5 — Does Phase 9 require changing execution-plan or observability-records **v0 contract shapes**? (incl. the driver-binding fold-in)

**No.** Integrity lives on a **new sidecar file**, keyed by an environment secret, computed over existing
bytes. It mints no event constant and no frozen digest/HMAC field on any governed record.
`repo-plan-m7.md` open question 3 flags exactly the risk — "Does tamper-evidence over the record chain
require a records-contract field for the digest/HMAC posture?" — and the answer here is **no**, because
the digest/HMAC posture lives on the sidecar, which is not a governed record and not part of the v0
contract. The v0-freeze checkpoint stays separate and contract-owner-owned (that is T14, not T9).

**The driver-binding fold-in (Decision 4) is the element most likely to trip this gate — run explicitly.**
Binding the launch driver selection so resume can verify it touches the launch-binding surface the gate
guards. Precedent is favorable but must be run explicitly: ADR 0020 §6 added `binding.workspace` as an
**additive, "clarified (not frozen)"** sub-field of the launch header. First confirmed against
`src/resume.ts` + `src/bootstrap.ts`: **no config or driver snapshot exists today** —
`describeConfigBinding` hashes only `mode` + `recordDir`, and no governed launch-header field records the
driver selection. The chosen route is now that same additive launch-header pattern:

- **(Chosen) Additive `binding.drivers` sub-field.** Persist the resolved launch driver selection
  (`agent`/`executionHost`/`forge`/`workSource` names) as an additive `binding.drivers` sub-field of the
  `run.started` launch header. This makes the selection **recoverable from `events.jsonl` itself**, the
  governed evidence ADR 0020 §6 made authoritative for launch context, rather than from an unreferenced
  side file. The sub-field is digest-covered by Decision 1's launch-header digest and verified
  **verification-only** on resume against the recovered launch selection — a mismatch fails closed, never
  rebinds (ADR 0020 §3 binding-verify style).
- **Why this is not a v0 freeze.** `binding.drivers` mirrors the `binding.workspace` precedent: an
  additive sub-field on the existing `run.started` launch header, "clarified (not frozen)," minting no new
  event family, no frozen digest/HMAC field, no JSON Schema freeze, and no public contract package. It
  widens recoverable launch context in governed evidence; it does not freeze the observability-records v0
  shape.

If the **only** sound binding required a **frozen** record field (a records-contract digest field, a
frozen constant, or a contract package), it would **defer** to the v0-freeze checkpoint and **HALT** here
rather than freeze in T9. It does not: the additive `binding.drivers` launch-header route rides the ADR
0020 additive precedent and keeps Q5 green. **Green.**

**Gate verdict: all five green. No HALT.** Integrity is sidecar-only (Q1), detected by recompute-and-
compare without touching records (Q2), re-approval rides the existing Doorbell/owner-decision path with a
live-diagnostic refusal (Q3), the Phase-8 provenance is covered by the header digest for free (Q4), and no
v0 contract freeze — the driver-binding fold-in lands as an additive `binding.drivers` launch-header
sub-field, not a frozen field (Q5).

## Decision

Five settlements, binding on Phase 9. Each is a decision, not an open question.

### 1. Integrity primitive and sidecar surface — HMAC-now, keyed from the environment, materialized on the sidecar; the trust anchor is why

The primitive is a **content digest per immutable protected artifact** plus a **hash-chain over the
append-only event log** (an ordered digest of `events.jsonl`'s accepted lines, so any reordering,
truncation, or line edit is detectable), **authenticated by an HMAC** over those digests / chain head, all
**materialized on a separate integrity sidecar** — `runs/<id>/integrity.json` (name design-owned), a
**non-golden** file beside the run directory, never inside `events.jsonl` or any snapshot. The immutable
launch evidence is digested **once at launch**: the **launch header** (`run.started`, including the
additive Phase-8 `workSourceCandidate` provenance, Phase-6 attestation/substrate references, and the
additive `binding.drivers` sub-field of Decision 4), the **plan snapshot**, the **policy snapshot**, and
the **attestation snapshot** where present. The **append-only event log** is covered by the hash-chain
maintained incrementally under the governed append path. It is verified at **inspect** (surface a break)
and at **resume** (refuse with a named reason, Decision 3).

**Append-log maintenance (binding).** The event-log chain is **not** a launch-only snapshot of
`events.jsonl`. Records already owns a single leased writer per run and rejects competing append
continuations; Phase 9 rides that seam. Each governed append extends the chain and updates the integrity
sidecar **atomically with** the accepted append, so a normal stopped run whose `story.*`,
`authorization.*`, or `run.stopped` records were appended through the governed writer verifies as intact.
A divergence between log and sidecar — an accepted-looking append whose chain update is absent, bytes
changed outside the writer, truncation, reordering, or a sidecar edit that no longer HMAC-verifies — is the
detected tamper. This names the seam and invariant; the sidecar encoding and storage transaction are
implementation-owned.

**The HMAC is in scope now, not deferred to a keyless placeholder — and this ADR confronts the keyless-
sidecar threat model head-on.** A plain digest/hash-chain sitting in the same run directory as the records
it protects is **forgeable by exactly the same-host actor it defends against**: that actor edits
`policy.snapshot.json`, recomputes the digest, and rewrites the sidecar — nothing detects it, because the
"integrity" evidence is keyless and co-located. Plain digest-evidence therefore **does not discharge
GUARD-1's anti-gaming intent** (P9-AC-1 traces GUARD-1). ADR 0020 is explicit that meaningful integrity
needs a trust anchor and that this is _the reason Phase 9 is sequenced after Phase 6_ — "the first point
at which a trust anchor exists to make signing meaningful." That anchor now exists. So this ADR does
**not** default to digest-first because it is cheaper (the brief forbids that framing); it lands
**HMAC-now** because the anchor is available and the keyless alternative fails the threat model it is
meant to answer.

**Key-material discipline (binding).** The HMAC key comes from the **environment only** — an operator- or
machine-held secret (an OS keychain reference, an env var, or an equivalent trust-anchor handle). It is
**never serialized** into any record, snapshot, or the sidecar; the sidecar stores only the HMAC output,
never the key. Its **absence is a diagnosable stop, not a silent skip**: if integrity is expected for a
run (real-driver wiring) and no key is available, inspect surfaces the ambiguity and resume refuses with a
named reason — the engine never silently downgrades to a keyless digest and never proceeds unauthenticated
(consistent with the fail-closed redaction-posture discipline `records.md` already holds). Env-key +
sidecar HMAC needs **no contract-shape change** (Gate Q5), so this stays gate-compatible.

**Threat model, scoped precisely (no overclaim).** The HMAC sidecar detects records tampered **without the
live key** and records **moved off the host / replayed elsewhere without the key**. It does **not** claim
to stop an actor who **also holds the HMAC key** — an actor with the key can re-sign a forged sidecar, and
Phase 9 does not pretend otherwise; that is the residual the key-custody boundary owns, not a records-
integrity claim. This precise scope is stated so the guarantee is honest: Phase 9 raises tampering from
"undetectable by a same-host actor" (the ADR 0020 local-altitude gap) to "detectable unless the actor also
holds the trust-anchor key."

### 2. Active `resume-blocked-missing-approval` — the tamper-vs-changed-basis split, re-approval through the existing owner path, CFG-10 no model adjudicates

The Phase-4 seam becomes an **active trigger**, with a clean two-way split at resume preflight:

- **Tamper (broken integrity) → hard refuse, named reason.** If the sidecar HMAC or a content digest fails
  to verify (a record or snapshot was edited out-of-band; the chain is broken; the key is absent where
  integrity is expected), resume **hard-refuses** with a named integrity reason (Decision 3) and **no
  re-approval can override it** — a broken chain is not a "changed basis an owner may bless," it is
  corrupted evidence. Owner re-approval is **not** offered for this leg.
- **Legitimate changed-basis → blocked pending fresh owner re-approval.** If integrity **verifies** but a
  **safety-relevant change to the approved plan's basis** occurred while the run was stopped, resume is
  **blocked** on `resume-blocked-missing-approval` until fresh owner sign-off and evidence are recorded.

**Change-detection surface (bounded — ADR 0020 §9 says do not over-build).** A _safety-relevant_ change is
scoped to what the run already records plus the workspace fingerprint (ADR 0020 §6) and the now-tamper-
evident snapshots: a change to a **rule-governing surface**, the **launch policy basis**, or an
integration-safety input that the durable evidence lets resume detect against the launch binding — **not**
an open-ended re-scan of the world. A richer change-detection surface stays deferred and named, not built,
exactly as ADR 0020 §9 scoped it. The tamper-evident snapshots of Decision 1 are what make this detection
**trustworthy** (an unforgeable comparison basis), which is why the re-approval trigger and the integrity
primitive are the same phase.

**Workspace fingerprint reconciliation (binding).** A workspace-fingerprint difference is not classified
by a blanket hard fail before this decision can run. Resume preflight first separates **broken integrity**
(Decision 3 hard-refuse), then evaluates whether a workspace difference is a **verified, safety-relevant
basis change** against otherwise continuous evidence. That leg uses the active
`resume-blocked-missing-approval` classification and is cleared only by fresh owner sign-off. The existing
`resume-blocked-workspace-mismatch` classification is reserved for genuine non-continuity or tamper — a
different tree, broken continuity, or unexplainable mismatch that is **not** an owner-blessable basis
change. This ordering makes P9-AC-2 reachable while keeping corrupted evidence and non-continuity
fail-closed.

- **Re-approval evidence path — the existing owner-decision / Doorbell affordance.** Fresh sign-off is a
  **narrow, durable owner decision** through the **existing** Doorbell path (`authorization.granted` basis
  `["owner-approval"]`), the same affordance Phase 3 delivered and `authorization.md` owns. No new
  approval channel, no widened authority: re-approval **re-confirms** continuation under the recorded
  binding, it never rebinds, widens scope, or swaps the launch policy (GUARD-1, INV-003). A non-interactive
  resume with no fresh decision available **fails closed** at preflight (no override).
- **No model adjudicates this boundary (CFG-10).** The tamper-vs-changed-basis split and the re-approval
  decision are **fixed-category checks and an owner decision** — never an LLM runtime judgment.
  `authorization.md` CFG-10 ("no model adjudicates this boundary") governs this leg explicitly, stated
  here so an implementer cannot slip a model in to "decide whether the change matters."

### 3. Diagnosable stops (P9-AC-3) — named reasons at inspect and resume refusal, never silent; records stay safe to keep and export

Both failure legs are **operator-visible diagnosable stops with named reasons**, never silent:

- **Broken integrity** surfaces at **inspect** as a diagnosable notice naming the broken artifact and
  refuses **resume** with a named integrity reason — a new live-diagnostic label on the existing
  `ResumeRefusalReason` union (e.g. `resume-blocked-records-integrity`; exact string design-owned), in the
  same live-preflight category as the three ADR 0020 §8 `resume-blocked-*` diagnostics — **not** a minted
  event family.
- **Missing re-approval** surfaces the changed basis at inspect and refuses resume on the existing
  `resume-blocked-missing-approval` reason, now active.

A refused resume **appends nothing** and **moves no checkpoint** (ADR 0020 §8): it is a live diagnostic
plus a non-zero CLI exit, recomputed deterministically from the on-disk bytes + the environment key +
current workspace state. Records **stay safe to keep and export** through the break — a detected tamper
does not make the records unreadable; it makes them **flagged**, and inspect still renders what is
derivable while naming the integrity failure (the fail-closed-but-diagnosable posture `records.md` and
ADR 0020 already hold). SEC-1's redaction posture is unchanged: the sidecar stores digests and an HMAC,
**never** the key and never any sensitive value.

### 4. Fold in the deferred resume driver-binding residual (T6/T8) — additive launch-header binding, verification-only on resume

Today the launch driver selection is **not bound**: `describeConfigBinding` hashes only `mode` +
`recordDir`, and no driver snapshot exists (Delivered reality; Gate Q5). T8 bound only the work-source leg
by forcing `workSource='reference'` from the snapshot; a resume `--config` selecting a different
`agent=codex` / `forge=github` real driver is not verified against launch selection. Phase 9 closes this
as follows:

- **Persist an additive launch-header binding.** Bootstrap records the **resolved launch driver
  selection** (the four `agent`/`executionHost`/`forge`/`workSource` names) as an additive
  `binding.drivers` sub-field of the `run.started` launch header, mirroring ADR 0020 §6's
  `binding.workspace` precedent. This is the governed launch evidence that did not exist before.
- **Digest-covered by the sidecar.** Because `binding.drivers` lives inside the launch header, Decision
  1's launch-header digest and HMAC authenticate it. Replay/export of `events.jsonl` alone can recover the
  launch selection from governed evidence.
- **Verification-only on resume, never rebind.** On resume, bootstrap verifies the launch driver selection
  (from `run.started.binding.drivers`) against the selection resume would use; a **mismatch fails closed**
  with a binding-mismatch-class diagnostic, exactly parallel to ADR 0020 §3's binding-verify and the
  Phase-6 launch-attestation recovery. Resume **never** rebinds, swaps, or widens the driver selection —
  resumed work runs under the **launch** drivers, never a fresher re-selection.
- **Gate-checked (Q5).** This lands as an **additive launch-header sub-field**, not a frozen
  observability-records v0 field. It mirrors the `binding.workspace` precedent, mints no new event family,
  and settles the **design** here — not a vague forward-reference. If the only sound binding had required a
  frozen field, it would HALT to the v0-freeze checkpoint rather than extend the binding schema in T9.

### 5. The 9a/9b split and its acceptance-criteria assignment

Mirroring the 6a/6b, 7a/7b, and 8a/8b pattern, **Phase 9 splits into two sub-phases with a fixed internal
ordering 9a → 9b**, because the two halves have genuinely different risk and 9a is the prerequisite that
makes 9b's detection trustworthy:

- **9a — records tamper-evidence.** The sidecar integrity primitive (Decision 1), the launch-header
  driver binding folded into it (Decision 4), and the diagnosable break-detection at inspect + resume
  refusal (Decision 3, integrity leg). 9a is **independently useful**: an operator gains tamper-evidence
  over the durable record chain even before an active re-approval trigger exists.
- **9b — active re-approval.** Activating `resume-blocked-missing-approval` (Decision 2): the changed-basis
  detection, the tamper-vs-changed-basis split, and the fresh-owner-re-approval path. 9b rides second
  because its changed-basis comparison is only **trustworthy** once 9a's tamper-evidence guarantees the
  comparison basis (the snapshots) was not itself forged — the ordering is a genuine dependency, not
  bookkeeping.

**AC assignment** (the thing an implementer would otherwise invent), under the invariant _9a lands
independently useful with sidecar tamper-evidence + diagnosable break-detection_:

| AC                                                                                                     | Sub-phase | Rationale                                                                                                                       |
| ------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **P9-AC-1** tamper-evidence on the sidecar; out-of-band edit detected at inspect, resume refuses       | **9a**    | The sidecar primitive + break-detection is 9a's whole point; the goldens stay byte-identical because integrity is sidecar-only. |
| **P9-AC-2** safety-relevant changed basis triggers `resume-blocked-missing-approval` until re-approved | **9b**    | The active re-approval trigger; its changed-basis comparison depends on 9a's tamper-evident snapshots.                          |
| **P9-AC-3** integrity + re-approval failures are diagnosable stops with named reasons, never silent    | **both**  | The integrity leg lands with 9a; the re-approval leg lands with 9b; both are named diagnosable stops.                           |

**Lighter than 6a/6b (stated so implementers do not over-split).** Both halves touch the **same** sidecar
and the **same** resume-preflight surface — 9b activates a trigger over the tamper-evident snapshots 9a
produced, it does not add a second store. So 9a and 9b may land in one implementation cycle if tamper-
evidence is verified first and the active re-approval second. The ordering (tamper-evidence before active
re-approval) is the binding constraint, not a mandatory two-PR decomposition.

## Prior-art and encoding posture

- **No new event-family strings.** The re-approval decision reuses `authorization.granted` /
  `authorization.denied` (owner-approval / owner-rejection basis); the launch header reuses `run.started`;
  the refusals are live `resume-blocked-*` preflight diagnostics (ADR 0020 §8), not persisted events. No
  family is renamed, removed, or newly minted.
- **Digest/HMAC field posture is design-owned and lives on the sidecar, not frozen into observability-
  records v0.** The sidecar is not a governed record; its exact encoding (digest algorithm, HMAC framing,
  file layout) is design/implementation detail, not a v0 contract field. If a records-contract digest field
  genuinely turned out to be required, that freeze is contract-owner-owned and routes to the v0-freeze
  checkpoint (T14) — it does not (Gate Q5).
- **The key is environment-only and never serialized** (Decision 1), consistent with the repo no-hardcoded-
  secrets rule and SEC-1..3.

## Required doc updates (this design PR)

- **`records.md`** — a "Phase 9 realization (ADR 0025)" note at the failure-posture / redaction seam: the
  integrity sidecar seam (digest + hash-chain + env-keyed HMAC, computed over the launch header and
  snapshots, materialized beside the run dir), verify-at-inspect (surface a break) and at-resume (refuse
  with a named reason), and the byte-identity guard (integrity is never serialized into record bytes; the
  goldens stay byte-identical; the sidecar is a non-golden artifact). No schema freeze. (Done in this PR.)
- **`authorization.md`** — a "Phase 9 realization (ADR 0025)" note at the GUARD-2 / Doorbell seam: the
  active `resume-blocked-missing-approval` trigger, the tamper-vs-changed-basis split, fresh owner
  re-approval through the existing owner-decision path (narrow, durable, never widened), and CFG-10 — no
  model adjudicates the boundary. (Done in this PR.)
- **`bootstrap.md`** — a "Phase 9 realization (ADR 0025)" note at the resume re-entry procedure: launch-
  header + snapshot integrity materialized on the sidecar at launch and maintained under the governed
  append path, verified on resume preflight; and the additive `binding.drivers` launch-header sub-field
  verified verification-only on resume (never rebind). (Done in this PR.)
- No change to the execution-plan or observability-records v0 contracts, and no change to the fixtures-
  README convention snippets (`delivery:check` stays green).

## Consequences

- Phase 9 makes the durable run evidence tamper-evident and activates the re-approval path, closing the
  integrity deferral ADR 0020 named. The 9a/9b split lands sidecar tamper-evidence first (independently
  useful), then the active re-approval trigger whose changed-basis comparison the tamper-evidence makes
  trustworthy.
- The change is **additive and non-golden**: integrity is a **new sidecar file** computed over existing
  bytes and an env-supplied key; the default (reference) wiring reproduces the Phase-0..8 dry-run and
  record goldens **byte-identically** because no integrity byte is ever serialized into a governed record.
  The sidecar is excluded from the record-goldens (or produced only under real-driver wiring), so a
  directory-level golden cannot trip on it. The driver selection is an additive `binding.drivers`
  launch-header sub-field, following the `binding.workspace` precedent rather than freezing v0.
- The load-bearing safety boundaries are all preserved and one is raised: an out-of-band edit to a record
  or snapshot is **detectable** (unless the actor also holds the trust-anchor key — scoped honestly, not
  overclaimed); a broken chain **hard-refuses** resume; a legitimate changed basis **blocks** resume
  pending narrow, durable owner re-approval through the existing Doorbell path; no model adjudicates the
  boundary (CFG-10); the launch driver selection is **verified** against launch, never rebound; and records
  stay safe to keep and export through a detected break (diagnosable, not corrupt-and-silent). The HMAC key
  is environment-only and never serialized.
- Phase 9 implementation adds a `src/integrity.*` module (digest + hash-chain + env-keyed HMAC over the
  header/snapshots/log, materialized on `runs/<id>/integrity.json` and maintained under the governed append
  path), an additive launch-time `binding.drivers` sub-field and its verification (extending
  `src/bootstrap.ts` and `describeConfigBinding` in `src/resume.ts`), the active
  `resume-blocked-missing-approval` trigger with the tamper-vs-changed-basis split and a new integrity
  refusal reason on `ResumeRefusalReason`, and inspect-side break-surfacing — see the Phase 9
  implementation brief
  ([`../../archive/delivery/m7-real-providers/implementation-briefs/phase-9-records-integrity.md`](../../archive/delivery/m7-real-providers/implementation-briefs/phase-9-records-integrity.md)).
  Integrity bytes are never serialized into governed records, and `binding.drivers` is additive launch
  context rather than a frozen contract field, so the Phase-0..4 goldens stay byte-identical. It changes no
  provider port surface.
- No JSON Schema freeze, no TypeScript contract package, no public contract package. The v0 contract freeze
  (the digest/HMAC-field question `repo-plan-m7.md` open question 3 raises) stays a separate contract-owner-
  owned checkpoint (T14), not decided here. Hosted, multi-tenant, or remote operation and model-adjudicated
  approval stay org-deferred.

- Date: 2026-07-04
- Origin: Phase 9 records-integrity design closure (docs-only, pre-implementation), scoped to the records-
  integrity + active-re-approval slice of M7 per the M7 real-providers repo plan; discharges the ADR 0020
  integrity deferral.
