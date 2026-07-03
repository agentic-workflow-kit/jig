---
title: "Phase 9 implementation brief — Records-integrity + active re-approval"
status: active
---

# Phase 9 implementation brief — Records-integrity + active re-approval

## Context and goal

Phases 6–8 made the four provider seams real — the agent and execution-host drivers
([ADR 0022](../../../design/decisions/0022-phase-6-real-driver-integration.md)), the Forge seam
([ADR 0023](../../../design/decisions/0023-phase-7-real-forge-landing.md)), and the work-source seam
([ADR 0024](../../../design/decisions/0024-phase-8-real-work-source.md)). Phase 9 is the final M7 phase:
it makes the durable run evidence **tamper-evident** and activates the `resume-blocked-missing-approval`
re-approval path that Phase 4 named and wired as a seam with **no active trigger**. Two properties are
the whole point: **an out-of-band edit to a record or snapshot is detectable at inspect and refuses
resume** (P9-AC-1), and **a safety-relevant change to an approved plan's basis while a run is stopped
blocks resume until fresh owner re-approval** (P9-AC-2), both as **diagnosable stops with named reasons,
never silent** (P9-AC-3). Every acceptance criterion is a test citing its AC ID.

The design is closed in [ADR 0025](../../../design/decisions/0025-phase-9-records-integrity.md). This
brief is implementation-ready **against that ADR**: it does not re-decide the integrity primitive
(HMAC-now vs digest-first), the sidecar surface, the tamper-vs-changed-basis split, the driver-binding
home, or the 9a/9b split — it implements them. Where a detail is genuinely design- or contract-owner-
owned rather than a local implementation choice, this brief says so and routes it back per the stop
conditions; do not fill gaps by invention.

**The load-bearing insight (ADR 0025 Gate + Decision 1).** The whole M7 program rests on the Phase-0..4
record goldens staying **byte-identical** under the default reference wiring. Therefore integrity is
**computed over** the launch header + snapshots + event log but **materialized on a separate integrity
sidecar** (`runs/<id>/integrity.json`, name your call) — a **new, non-golden file** beside the run
directory. `events.jsonl` and every snapshot are written **byte-for-byte unchanged**; nothing integrity-
related is appended to, nested in, or reshaped within any governed record. A **naive hash-chain that
writes a predecessor-hash inside each `events.jsonl` line is forbidden** — that would put integrity bytes
in the golden surface and break byte-identity (the P9-AC-1 stop condition). The chain is a digest over the
log's **bytes**, stored on the sidecar, not a field inside the log.

**The primitive is HMAC-now, not a keyless placeholder (ADR 0025 Decision 1).** A plain digest/hash-chain
co-located with the records it protects is forgeable by the same-host actor it defends against (edit the
record, recompute the digest, rewrite the sidecar) — so it does **not** discharge GUARD-1's anti-gaming
intent. ADR 0020 sequenced Phase 9 after Phase 6 precisely because the real trust anchor now exists. The
sidecar HMAC is keyed from the **environment only** (an operator/machine secret), **never serialized** into
any record/snapshot/sidecar, and its **absence where integrity is expected is a diagnosable stop, not a
silent skip**. Threat model, scoped honestly: it detects tampering **without the live key** and off-host
replay without the key; it does **not** claim to stop an actor who **also holds the key**.

**Scope (binding): records tamper-evidence + active re-approval, opt-in, unfrozen.** No hosted/multi-
tenant/remote operation, no model-adjudicated approval (CFG-10). The v0 contracts stay unfrozen; **no
records/execution-plan field is minted or frozen** — integrity lives on the sidecar, the driver-selection
binding lands as a new snapshot file. The default (reference) wiring must reproduce the Phase-0..4 dry-run
and its golden records **exactly** — that is the regression anchor, alongside the conformance suite still
failing closed on a broken adapter.

**Dependency: Phases 5–8 are delivered on current `main`** (the four ports, composition root, capability-
attestation gate, conformance suite, the real agent/host/forge/work-source drivers, `src/redaction.ts`,
`src/substrate.ts`, `src/clock.ts`, `src/intake.ts`, the durable `plan.snapshot.json` /
`policy.snapshot.json` / `attestation.snapshot.json`). Verify the baseline gate (`corepack pnpm check`
green) before editing runtime behavior.

## Source files to read

Read, in order:

- [`../phases.md`](../phases.md) — the **authoritative** Phase 9 section and P9-AC-1..3. These IDs are the
  binding delivery target, with their guarantee traces (GUARD-1/2, SEE-4, RESUME-5, LIVE-2, SEC-1).
- [ADR 0025](../../../design/decisions/0025-phase-9-records-integrity.md) — the five settlements this brief
  implements (the sidecar HMAC primitive, the active `resume-blocked-missing-approval` with the tamper-vs-
  changed-basis split, the diagnosable named stops, the driver-selection-snapshot fold-in, the 9a/9b
  split) **and its Contract-Impact-Gate section** — the byte-identity and no-freeze constraints this brief
  must honor.
- [ADR 0020](../../../design/decisions/0020-phase-4-reliable-local-runs.md) — §1 (authoritative launch
  header), §3 (durable plan/policy snapshots + binding-verify-only-never-rebind), §6 (workspace
  fingerprint), §8 (live `resume-blocked-*` preflight diagnostics are not projected events), §9 (the
  resume-integrity gate + `resume-blocked-missing-approval` seam with no active trigger), and the "Record
  and snapshot integrity — deferred" section this phase discharges.
- [`../repo-plan-m7.md`](../repo-plan-m7.md) — the "must not decide" list and open question 3 (does
  tamper-evidence need a records-contract digest field? — **it does not**, per ADR 0025 Gate Q5; the
  v0-freeze checkpoint is T14, not this phase; do not re-open).
- [`../../../design/contracts/observability-records-contract-v0.md`](../../../design/contracts/observability-records-contract-v0.md)
  — the **"v0 Not Frozen"** posture, the "launch binding must be recoverable from the durable event log"
  line, and the existing commitment that records "show when safety-relevant assumptions changed while the
  run was stopped and why re-approval or fresh evidence was required" (lines 173–174). Integrity rides a
  **new sidecar** and re-approval rides the **existing owner-decision family** — **do not mint a new field
  or event family, do not freeze.**
- [`../../../design/core/records.md`](../../../design/core/records.md),
  [`../../../design/core/authorization.md`](../../../design/core/authorization.md),
  [`../../../design/core/bootstrap.md`](../../../design/core/bootstrap.md) — the "Phase 9 realization
  (ADR 0025)" notes (the sidecar seam; the active re-approval trigger + CFG-10; the launch-header integrity
  and driver-selection binding).
- [Phase 8 brief](phase-8-real-work-source.md) — the delivered opt-in-driver, additive-record, byte-
  identical-goldens, and hermetic-conformance conventions Phase 9 builds on.

## Current delivered surfaces consumed from Phases 4–8

Confirmed against `src/` at authoring time — build on these, do not re-derive them:

- **The run directory holds the authoritative log + finalized cache + durable snapshots.** `src/resume.ts`
  reads `PLAN_SNAPSHOT_FILE = 'plan.snapshot.json'`, `POLICY_SNAPSHOT_FILE = 'policy.snapshot.json'`, and
  `ATTESTATION_SNAPSHOT_FILE = 'attestation.snapshot.json'`. The `run.started` record at the head of
  `events.jsonl` is the authoritative launch header (ADR 0020 §1), carrying `run.id`, `planId`, `binding`
  (`policyRef`/`configRef`, `binding.workspace`, redaction/export posture), the snapshot references, the
  Phase-6 `attestationSnapshot`/`substrateManifest`, and the Phase-8 `workSourceCandidate` provenance.
  These are exactly the artifacts integrity is computed over.
- **`resume-blocked-missing-approval` is a named seam with no trigger.** `src/resume.ts`:
  `ResumeRefusalReason = 'resume-blocked-binding-mismatch' | 'resume-blocked-workspace-mismatch' |
'resume-blocked-missing-approval'` and the `ResumeRefusal` error class. **Nothing throws the
  missing-approval reason today** — P4-AC-3 is met by enforced launch-policy immutability across resume,
  not an active re-approval trigger (ADR 0020 §9). Phase 9 gives it its trigger.
- **The resume driver-binding residual is live and unbound.** `describeConfigBinding` (`src/resume.ts`
  lines 58–62) hashes **only** `mode` + `recordDir`. `configForResumeComposition` (lines 189–199) forces
  `workSource: 'reference'` from the snapshot and passes any other `config.drivers` through only when a
  `--config` is supplied. `readDriverSelection` / `assertReferenceSelection` (`src/bootstrap.ts`) select
  the four driver names, but **no driver snapshot is persisted at launch** — there is no artifact parallel
  to `plan.snapshot.json` recording the launch driver selection. This is the residual Phase 9 folds in
  (ADR 0025 Decision 4).
- **The snapshots are already persisted at launch and verified verification-only on resume.**
  `verifyOptionalBindings` (`src/resume.ts`) compares a passed `--config`/`--policy`/`--plan` against the
  recorded binding/snapshots and throws `resume-blocked-binding-mismatch` on mismatch, **never rebinding**
  — the exact binding-verify pattern the driver-selection snapshot mirrors.
- **The owner-decision / Doorbell path is delivered (Phase 3).** `authorization.granted` basis
  `["owner-approval"]` / `authorization.denied` basis `["owner-rejection"]`; the parked-resume rule
  (ADR 0020 §4) already consumes a durable owner decision on resume. Re-approval reuses this — no new
  channel.

## Non-goals

Do not:

- write any integrity byte (digest, hash, HMAC) **into** `events.jsonl`, `run.json`, or any snapshot — a
  naive per-line hash-chain inside the log is **forbidden**; integrity lives only on the sidecar (ADR 0025
  Decision 1; P9-AC-1 stop condition). If integrity bytes would have to land in the default golden surface,
  **stop and route to design**;
- change the records the default (reference) wiring emits, or regress the Phase-0..4 golden fixtures — the
  sidecar is a new non-golden file, excluded from record-goldens (or produced only under real-driver
  wiring);
- **mint a new event family** — re-approval reuses `authorization.granted`/`authorization.denied`; the
  refusals are live `resume-blocked-*` preflight diagnostics (ADR 0020 §8), not persisted events; a new
  `ResumeRefusalReason` **string** is a live-diagnostic label, not a family;
- **freeze** a JSON Schema, a records-contract digest/HMAC field, an event constant, or a TypeScript
  contract package — the digest/HMAC posture is design-owned on the sidecar (ADR 0025 Gate Q5); if
  tamper-evidence genuinely needed a frozen records field, that is a stop routed to the contract owner /
  the T14 v0-freeze checkpoint (it does not);
- **hardcode any key** — the HMAC key comes from the **environment only**, is never serialized into any
  record/snapshot/sidecar, and its absence where integrity is expected is a **diagnosable stop, not a
  silent skip** (SEC-1..3; repo no-hardcoded-secrets rule);
- **widen authority** on re-approval — re-approval re-confirms continuation under the recorded binding
  through the existing Doorbell path; it never rebinds, widens scope, or swaps the launch policy;
- let a **model** adjudicate the tamper-vs-changed-basis split or the re-approval decision (CFG-10);
- **rebind** the driver selection on resume — the driver-selection snapshot is **verification-only**; a
  mismatch fails closed, never swaps to a fresher selection;
- overclaim the threat model — the HMAC does **not** stop an actor who also holds the key; keep the
  guarantee honestly scoped;
- expand into hosted/multi-tenant/remote operation, model-adjudicated approval, or a richer changed-basis
  detection surface than ADR 0020 §9 scopes (bounded to what the run records + workspace fingerprint + the
  tamper-evident snapshots).

## Likely source files touched / new modules (names are suggestions, not mandates)

- `src/integrity.ts` (new) — the sidecar integrity engine: given the run directory, compute a **content
  digest** per protected artifact (`events.jsonl` line-ordered as the hash-chain, `plan.snapshot.json`,
  `policy.snapshot.json`, `attestation.snapshot.json` where present, the new `drivers.snapshot.json`, and
  the launch header) and an **HMAC over those digests** keyed from the environment; materialize on
  `runs/<id>/integrity.json`; and a **verify** function that recomputes-and-compares (returns a
  break/verified result, never mutates a record). The key read is env-only; absence where integrity is
  expected is a diagnosable outcome, never a silent keyless fallback.
- `src/bootstrap.ts` — persist the **driver-selection snapshot** (`drivers.snapshot.json`: the resolved
  `agent`/`executionHost`/`forge`/`workSource` names) at launch, parallel to the plan/policy snapshots
  (ADR 0025 Decision 4); trigger integrity materialization at launch after the snapshots + launch header
  are durable.
- `src/resume.ts` — (a) add integrity **verify** at resume preflight before continuing (broken → hard
  refuse with the new named reason); (b) add the **driver-selection verification** (verification-only,
  mismatch fails closed, never rebind) — extend `describeConfigBinding` / `configForResumeComposition` so
  the launch driver selection is bound; (c) add the active `resume-blocked-missing-approval` trigger with
  the tamper-vs-changed-basis split; (d) add the new integrity refusal string to `ResumeRefusalReason`.
- `src/` inspect path (`src/cli.ts` / the inspect renderer / `src/projection.ts` consumers) — surface a
  detected integrity break as a diagnosable notice at `jig inspect` (name the broken artifact), rendering
  what is derivable while flagging the failure; records stay safe to keep/export.
- `src/conformance/*` — Phase-9 adversarial additions (a tampered snapshot/log with an unverifiable
  sidecar; a missing-key-where-expected case; a changed-basis-without-re-approval case).
- `tests/*` — new tests named per AC ID (below); `tests/fixtures/**` — tampered-record, tampered-sidecar,
  missing-key, and changed-basis fixtures (all non-normative), plus an injected/faked env key seam for
  hermetic tests.

## Concrete implementation slices — ordered per the 9a → 9b split

Implement in order. After **every** slice, the Phase-0..4 goldens must still pass under the default
(reference) wiring and the conformance suite must still fail closed on a broken adapter.

### Sub-phase 9a — records tamper-evidence

#### Slice 1 — the sidecar integrity engine: digest + hash-chain + env-keyed HMAC (ADR 0025 Decision 1) → P9-AC-1

- Add `src/integrity.ts`: compute a content digest per protected artifact and a hash-chain over
  `events.jsonl`'s bytes (line-ordered so reorder/truncate/edit is detectable), authenticate with an
  **HMAC over the digests** keyed from the **environment**, and materialize on `runs/<id>/integrity.json`
  — a **new file**, never a byte inside any record or snapshot.
- The env key read is the **only** key source; there is no hardcoded key and no default key. If integrity
  is expected (real-driver wiring) and no key is available, that is a **diagnosable outcome** surfaced at
  inspect and refused at resume — **never** a silent keyless digest.
- **Record-invariant — nothing is serialized into governed records.** `events.jsonl` and every snapshot are
  byte-for-byte unchanged; the sidecar is excluded from record-goldens (or produced only under real-driver
  wiring). The seed/reference path stays byte-identical.
- **Test obligation:** (1) a materialization test proving the sidecar is written beside the run dir and
  `events.jsonl` + snapshots are byte-unchanged; (2) a **byte-identical-goldens** guard proving the
  Phase-0..4 record goldens are unchanged (integrity is never serialized into record bytes); (3) a
  key-from-env test with an **injected/faked key** (hermetic — no live keychain/TPM/network in CI) proving
  the key is read from the environment and never appears in the sidecar or any record.
- **Stop condition:** if integrity bytes would have to land in the **default golden** record surface, or if
  tamper-evidence genuinely required **freezing** the observability-records schema / a records-contract
  digest field, **stop and route to design** — do not author around it (it does not: sidecar + env key
  freeze nothing).

#### Slice 2 — verify-at-inspect + refuse-at-resume; the driver-selection snapshot fold-in (ADR 0025 Decisions 3, 4) → P9-AC-1

- Add a **verify** entrypoint (`recompute-and-compare`): recompute the digests from the on-disk bytes,
  recompute the HMAC with the env key, compare to the sidecar. A mismatch (or a missing key where expected)
  is a detected break — **read-only**, never a mutation.
- Wire verify into **`jig inspect`** (surface the break as a diagnosable notice naming the broken artifact,
  render what is derivable) and into **resume preflight** (hard-refuse with a new named reason on
  `ResumeRefusalReason`, e.g. `resume-blocked-records-integrity`; exact string your call). A refused resume
  **appends nothing and moves no checkpoint** (ADR 0020 §8) — it is a live diagnostic + non-zero exit.
- **Driver-selection snapshot fold-in (ADR 0025 Decision 4).** Persist `drivers.snapshot.json` at launch
  (the four resolved driver names), parallel to the plan/policy snapshots; include it in Slice 1's digest
  set; and on resume **verify** the launch driver selection against the selection resume would use —
  mismatch fails closed with a binding-mismatch-class diagnostic, **verification-only, never rebind**
  (extend `describeConfigBinding` / `configForResumeComposition` accordingly). This binds `agent`/
  `executionHost`/`forge` selection, which T8 left unbound (T8 bound only `workSource`).
- **Test obligation:** (1) a **tamper-detection** test — edit a snapshot / a record byte / the sidecar, and
  prove `inspect` surfaces the break **and** `resume` refuses with the named reason (both legs); (2) a
  **driver-binding** test — a resume `--config` selecting a different `agent`/`forge` than launch fails
  closed against the driver-selection snapshot (verification-only), while a matching selection passes; (3)
  a **records-stay-safe** test proving a detected break still lets inspect render what is derivable and
  export stays governed.

### Sub-phase 9b — active re-approval

#### Slice 3 — active `resume-blocked-missing-approval` with the tamper-vs-changed-basis split (ADR 0025 Decision 2) → P9-AC-2

- Add the **active trigger** with the two-way split at resume preflight:
  - **tamper (broken integrity, from Slice 2)** → **hard refuse**, no re-approval can override (a broken
    chain is corrupted evidence, not a blessable changed basis);
  - **integrity verifies but a safety-relevant basis changed** while stopped → **block** on
    `resume-blocked-missing-approval` until fresh owner sign-off is recorded.
- **Change-detection surface (bounded, ADR 0020 §9 — do not over-build).** Scope "safety-relevant change"
  to what the run already records + the workspace fingerprint (ADR 0020 §6) + the now-tamper-evident
  snapshots: a change to a rule-governing surface, the launch policy basis, or an integration-safety input
  the durable evidence lets resume detect against the launch binding. A richer surface stays deferred and
  named, not built.
- **Re-approval evidence — the existing Doorbell / owner-decision path.** Fresh sign-off is a narrow,
  durable owner decision (`authorization.granted` basis `["owner-approval"]`) through the **existing**
  affordance — the same path the parked-resume rule (ADR 0020 §4) already consumes. Re-approval
  **re-confirms** continuation under the recorded binding; it **never** rebinds, widens scope, or swaps the
  launch policy (GUARD-1, INV-003). A non-interactive resume with no fresh decision available **fails
  closed** at preflight.
- **CFG-10 — no model adjudicates.** The split and the re-approval decision are fixed-category checks + an
  owner decision, never an LLM runtime judgment (`authorization.md` CFG-10).
- **Test obligation:** (1) a **changed-basis re-approval** test — a safety-relevant change while stopped
  triggers `resume-blocked-missing-approval`; resume is blocked until a fresh owner decision is recorded,
  then proceeds; (2) a **tamper-vs-changed-basis** test — a broken chain hard-refuses and **cannot** be
  cleared by an owner re-approval (only the changed-basis leg is re-approvable); (3) a **no-widening** test
  proving re-approval re-confirms under the recorded binding and does not rebind/widen; (4) a **CFG-10**
  assertion that no model is invoked on this boundary.

#### Slice 4 — diagnosable stops end-to-end (ADR 0025 Decision 3) → P9-AC-3

- Prove both failure legs are **operator-visible diagnosable stops with named reasons, never silent**:
  broken integrity (Slice 2) and missing re-approval (Slice 3) each surface at inspect and refuse resume
  with a named reason; records **stay safe to keep and export** through the break.
- **Test obligation:** a diagnosable-stop test for (a) a broken chain and (b) a missing re-approval —
  each names its reason at inspect and at resume refusal, and neither resumes silently; plus an
  export-stays-governed check that a flagged run still exports safely.

#### Slice 5 — conformance-suite adversarial additions (ADR 0025 Decisions 1–4) → P9-AC-1..3 regression

Extend `src/conformance/` + broken/adversarial fixtures so the suite still fails closed on:

- a **tampered artifact** — an edited snapshot/log whose sidecar HMAC/digest no longer verifies → detected;
- a **tampered sidecar** — a sidecar rewritten without the env key → detected (the key is the anchor);
- a **missing-key-where-expected** case — integrity expected under real-driver wiring but no env key →
  diagnosable stop, not a silent skip;
- a **changed-basis-without-re-approval** case — a safety-relevant change with no fresh owner decision →
  resume refused;
- a **driver-selection-mismatch** case — a resume selection diverging from the launch driver snapshot →
  fails closed.

## Acceptance criteria (binding — from `phases.md`)

- **P9-AC-1** — Tamper-evidence is computed over the launch header and plan/policy snapshots and
  materialized on a separate integrity sidecar / non-golden surface — **not** written into the default
  golden record, which stays byte-identical; an out-of-band edit to a record or snapshot is detected and
  surfaced at inspect, and resume refuses on a broken chain with a named reason. **9a**, Slices 1–2.
  Traces: [`GUARD-1`](../../../product/guarantees.md#13-anti-gaming),
  [`SEE-4`](../../../product/guarantees.md#5-full-observability),
  [ADR 0020](../../../design/decisions/0020-phase-4-reliable-local-runs.md).
- **P9-AC-2** — A safety-relevant change to the approved plan's basis while stopped triggers
  `resume-blocked-missing-approval`; resume refuses until fresh approval and evidence are recorded, and the
  re-approval decision is narrow and durable. **9b**, Slice 3. Traces:
  [`RESUME-5`](../../../product/guarantees.md#31-interruption-resume),
  [`GUARD-2`](../../../product/guarantees.md#13-anti-gaming),
  [ADR 0020](../../../design/decisions/0020-phase-4-reliable-local-runs.md).
- **P9-AC-3** — Integrity and re-approval failures are operator-visible diagnosable stops with named
  reasons, never silent; records stay safe to keep and export. **9a + 9b**, Slice 4. Traces:
  [`LIVE-2`](../../../product/guarantees.md#33-liveness--noticing-a-stuck-run),
  [`SEE-4`](../../../product/guarantees.md#5-full-observability),
  [`SEC-1`](../../../product/guarantees.md#16-security--no-leaks-no-phone-home).

## Test / evidence plan

Every test cites the AC ID it proves. Coverage thresholds stay at 90% (aim 95%); `corepack pnpm check`
is the gate.

- **Sidecar tamper-evidence** (`tests/integrity.*`): `P9-AC-1: integrity is materialized on a sidecar
beside the run dir and events.jsonl + snapshots stay byte-unchanged`; the **byte-identical-goldens**
  guard `P9-AC-1: the Phase-0..4 record goldens stay byte-identical with integrity enabled` (integrity is
  never serialized into record bytes — Slice 1); `P9-AC-1: the HMAC key is read from the environment and
never appears in the sidecar or any record` (injected/faked key, hermetic — Slice 1).
- **Tamper detection + driver binding** (`tests/integrity.*` / `tests/resume.*`): `P9-AC-1: an out-of-band
edit to a record/snapshot is surfaced at inspect and refuses resume with a named reason`; `P9-AC-1: a
resume driver selection diverging from the launch driver snapshot fails closed (verification-only, never
rebind)`; `P9-AC-1: a tampered sidecar rewritten without the env key is detected` (Slice 2).
- **Active re-approval** (`tests/resume.*`): `P9-AC-2: a safety-relevant changed basis while stopped
triggers resume-blocked-missing-approval and resume is blocked until a fresh owner decision is recorded`;
  the **tamper-vs-changed-basis** guard `P9-AC-2: a broken chain hard-refuses and cannot be cleared by
owner re-approval` (only the changed-basis leg is re-approvable — Slice 3); the **no-widening** guard
  `P9-AC-2: re-approval re-confirms under the recorded binding and does not rebind or widen`; a **CFG-10**
  assertion `P9-AC-2: no model adjudicates the tamper-vs-changed-basis split or the re-approval decision`.
- **Diagnosable stops** (`tests/resume.* / tests/inspect.*`): `P9-AC-3: a broken chain and a missing
re-approval each name their reason at inspect and at resume refusal, never silent`; `P9-AC-3: a flagged
run still exports safely (records stay safe to keep and export)` (Slice 4).
- **Conformance (regression anchors)** (`tests/conformance/*`): the reference wiring still passes; a broken
  adapter still fails closed; plus the Phase-9 adversarial additions (`P9-...: a tampered-artifact /
tampered-sidecar / missing-key / changed-basis-without-re-approval / driver-selection-mismatch case is
rejected`). Hermetic — no live key server / no network in CI; the env-supplied key seam is injected/faked
  in tests.
- **Baseline guard:** the Phase-0..4 goldens still pass under the default wiring — proof the sidecar, the
  driver-selection snapshot, and the active re-approval trigger did not regress the delivered records.

## Fixture plan

- **Real-driver-wiring fixtures** producing an integrity sidecar, clearly non-normative; the sidecar is a
  **new** file excluded from the Phase-0..4 record-goldens (do not re-normalize the record goldens to
  absorb it — the default path stays byte-identical).
- **A tampered-record / tampered-snapshot fixture** (an edited byte) and a **tampered-sidecar fixture** (a
  sidecar rewritten without the env key) for P9-AC-1's detection.
- **A missing-key fixture** (integrity expected, no env key) for the diagnosable-stop, not-silent-skip
  case.
- **A driver-selection-mismatch fixture** (a resume selection diverging from `drivers.snapshot.json`) for
  the verification-only binding.
- **A changed-basis fixture** (a safety-relevant change while stopped, no fresh owner decision) and a
  **re-approval fixture** (a durable owner decision recorded) for P9-AC-2.
- **An injected/faked env-key seam** so tests are hermetic (no live keychain/TPM/network).
- No TypeScript interfaces, JSON Schema, event constants, or digest/HMAC schema as **normative** fixtures
  (fixtures README rule); keep every integrity example plainly illustrative.

## CLI behavior

- `jig run` / `jig preview` / `jig inspect` / `jig resume` — **unchanged in surface** under the default
  wiring. Integrity materializes to the sidecar at launch under real-driver wiring; `jig inspect` surfaces
  a detected break as a diagnosable notice; `jig resume` refuses on a broken chain (named reason) and
  blocks on a changed basis until fresh owner re-approval is recorded, both with a non-zero exit. No new
  subcommand is required. The env-supplied HMAC key is read from the environment only and never echoed.

## Stop conditions

Halt and route back to design (do not decide locally) if:

- integrity bytes would have to land in the **default golden** record surface rather than a separate
  sidecar / non-golden surface — that would break the byte-identical Phase-0..4 goldens (`phases.md`
  Phase-9 stop condition);
- tamper-evidence would require **freezing** the observability-records schema / minting a records-contract
  digest/HMAC field — the digest/HMAC posture is design-owned on the sidecar; route freeze back to design /
  the T14 v0-freeze checkpoint (`repo-plan-m7.md` open question 3). It does **not**: the sidecar + env key
  freeze nothing;
- the re-approval path can be **widened** mid-run without owner approval, or a **model** adjudicates the
  re-approval (CFG-10) — that is a stop, not a local decision;
- integrity failures would **resume silently** instead of refusing with a named reason;
- Phase-0..4 golden **byte-identity** cannot be preserved (the change is not additive/non-golden and must
  be re-scoped);
- making Phase 9 coherent would require the **v0 contract freeze / a contract package** — that is T14, not
  this phase.

## PR evidence checklist

- `git diff --check` clean.
- `corepack pnpm check` green (lint, format:check, typecheck, delivery:check, vitest ≥ 90%).
- Every new test names the AC ID it proves; the conformance suite and every broken/adversarial fixture are
  read by a test; all tests are hermetic (injected/faked env key; no live key server / no network).
- Integrity is materialized **only on the sidecar** — `events.jsonl` + snapshots are byte-unchanged,
  evidenced by the byte-identical-goldens guard; the HMAC key is environment-only and never serialized,
  evidenced by the key-from-env test.
- The driver-selection snapshot binds `agent`/`executionHost`/`forge`/`workSource` and is verified
  verification-only on resume (never rebind), evidenced by the driver-binding test.
- A records-diff note in the PR body: the default wiring reproduces the Phase-0..4 records (byte-identical);
  the sidecar and the driver snapshot are new **non-golden** files, cited to ADR 0025; **no records/
  execution-plan field is minted or frozen**, and **no event family is minted** (re-approval reuses
  `authorization.granted`/`authorization.denied`; refusals are live `resume-blocked-*` diagnostics). Note
  the explicit non-goals: no schema freeze, no model-adjudicated approval, no widened authority, no hosted/
  multi-tenant/remote operation, and the honestly-scoped threat model (the HMAC does not stop an actor who
  also holds the key).
- The Phase-0..4 goldens still pass, evidencing no regression to the delivered shape.
