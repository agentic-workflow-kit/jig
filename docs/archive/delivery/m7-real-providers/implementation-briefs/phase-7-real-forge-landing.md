---
title: "Phase 7 implementation brief — Real Forge/GitHub landing"
status: completed history
---

# Phase 7 implementation brief — Real Forge/GitHub landing

> **Closeout note (2026-07-04):** retained as M7 delivery history after org M7 accepted
> EVRUN-partial exit evidence. `LandingRequest.action` is now a typed union in the live port; old
> `"push|open-pr|merge"` references below may remain as historical modeled-record or golden
> byte-identity context.

## Context and goal

Phase 5 pinned and merged the four provider ports, the composition root, and the driver conformance
suite as **exercised jig-internal seams** proven with **reference adapters** (commit `f59a479`); Phase
6 promoted the **agent** and **execution-host** seams to **real drivers**
([ADR 0022](../../../design/decisions/0022-phase-6-real-driver-integration.md)). Phase 7 promotes the
**Forge** seam from the modeled, `skipped-on-dry-run` reference adapter to a **real Forge/GitHub
adapter** behind the same, runner-invoked `ForgePort.land()`: the first phase in which `done → landed`
performs a **real effect** — a real push, PR, or merge on GitHub — with real-effect idempotency.
Landing stays runner-owned: `land()` is invoked only by the runner at `done → landed`, and the
`AgentPort` never gains a landing path. Every acceptance criterion is a test citing its AC ID.

The design is closed in
[ADR 0023](../../../design/decisions/0023-phase-7-real-forge-landing.md). This brief is
implementation-ready **against that ADR**: it does not re-decide the 7a/7b split, the `action` union
(Residual B), the idempotency-from-records mechanism, the PR-side block-surfacing decomposition, or the
landing-path redaction — it implements them. Where a detail is genuinely design- or contract-owner-owned
rather than a local implementation choice, this brief says so and routes it back per the stop
conditions; do not fill gaps by invention.

**Scope (binding): real Forge/GitHub landing, opt-in, unfrozen.** No real work-source import (Phase 8),
no records tamper-evidence or active re-approval path (Phase 9), no hosted/multi-tenant/remote landing
targets. The v0 contracts stay unfrozen; the **only** port-type change is repairing
`LandingRequest.action` from the single mis-encoded literal `'push|open-pr|merge'` to the union `'push'
| 'open-pr' | 'merge'` (Residual B, ADR 0023 Decision 2) — a jig-internal seam edit that freezes
nothing; `ForgePort.land()`'s method surface is unchanged. The default (reference/dry-run) wiring must
reproduce the Phase-0..4 dry-run and its golden records **exactly** — that is the regression anchor,
alongside the conformance suite still failing closed on a broken adapter.

**Dependency: Phases 5–6 are delivered on current `main`** (the four ports, composition root,
capability-attestation gate, conformance suite, and the real agent/host drivers, `src/redaction.ts`,
`src/substrate.ts`, `src/clock.ts` at commit `1c32ba9`). Verify the baseline gate (`corepack pnpm
check` green) before editing runtime behavior.

## Source files to read

Read, in order:

- [`../phases.md`](../phases.md) — the **authoritative** Phase 7 section and P7-AC-1..5. These IDs are
  the binding delivery target, with their guarantee traces.
- [ADR 0023](../../../design/decisions/0023-phase-7-real-forge-landing.md) — the six settlements this
  brief implements (the 7a/7b split + AC assignment, the real Forge adapter, the `action` union, real-
  effect idempotency from the records, the PR-side block-surfacing as a distinct runner-invoked act, and
  the landing-path redaction).
- [`../repo-plan-m7.md`](../repo-plan-m7.md) — the open questions routed to design (open question 2,
  Residual B `LandingRequest.action` union; **resolved** by ADR 0023 Decision 2; do not re-open — and
  the freeze caveat: if it forces an observability-records field, route back to the contract owner).
- [ADR 0021](../../../design/decisions/0021-phase-5-integrated-provider-runs.md) decision 6 (the modeled
  runner-invoked Forge seam, the `skipped-on-dry-run` posture, the MERGE-5 block-surfacing modeling, and
  idempotency as a seam contract) and [ADR 0020](../../../design/decisions/0020-phase-4-reliable-local-runs.md)
  §5 (the no-double-effect recognition from the replayed log) and §7 (redaction posture) — the
  carry-forwards Phase 7 extends.
- [ADR 0022](../../../design/decisions/0022-phase-6-real-driver-integration.md) Decision 8 — the Phase-6
  redaction activation (`src/redaction.ts`) this brief extends to the landing path (P7-AC-4 is an
  extension, not a new mechanism).
- [`../../../design/contracts/providers.md`](../../../design/contracts/providers.md) — the Forge seam's
  owns/implements/must-not contract and the "Phase 7 realization (ADR 0023)" section.
- [`../../../design/core/orchestration.md`](../../../design/core/orchestration.md) — the runner-owned
  `done → landed` two-authority split and the "Phase 7 realization" note (real landing, idempotency, PR
  surfacing distinct from `land()`).
- [`../../../design/contracts/observability-records-contract-v0.md`](../../../design/contracts/observability-records-contract-v0.md)
  — the runner-action families the record **already** names ("pushed, opened PR, posted status, posted
  comment, merged, skipped repeated effect on resume"); real landing maps onto these — **do not mint a
  new event family**.
- [`../../../design/notes/prior-art-workflow-kit.md`](../../../design/notes/prior-art-workflow-kit.md)
  lessons 5 and 9–10 — the re-derived (never ported) recipe for runner-does-push landing and the
  exact-head / honesty-probe discipline behind the idempotency safety property.
- [Phase 6 brief](phase-6-real-drivers.md) — the delivered real-driver, redaction, and golden-fixture
  conventions Phase 7 builds on.

## Current delivered surfaces consumed from Phases 5–6

Confirmed against `src/` at authoring time — build on these, do not re-derive them:

- **The Forge port is merged** ([`../../../../src/ports.ts`](../../../../src/ports.ts)):
  `ForgePort.land(request: LandingRequest): LandingOutcome | Promise<LandingOutcome>`. `LandingRequest`
  is `{ storyId; action: 'push' | 'open-pr' | 'merge'; reason?: 'dry-run' }`; Residual B is closed in
  the live port. `LandingOutcome` is `Pick<RunEvent, 'family'> & Partial<RunEvent>` — a record-shaped
  outcome that carries additive fields **without** a port change. The historical
  `"push|open-pr|merge"` token remains only as the modeled dry-run record action that preserves the
  Phase-0..4 golden bytes.
- **The runner is already the sole `land()` caller.** `LocalHarness`
  ([`../../../../src/harness.ts`](../../../../src/harness.ts)) emits `story.done`, constructs the
  `LandingRequest` from `this.landingAction` (default `push`) with `reason: 'dry-run'`, awaits
  `this.forge.land(...)`, and records the landing outcome. Under the reference forge, that outcome is
  still `runner-action.skipped-on-dry-run` with the historical `"push|open-pr|merge"` modeled-record
  action. The agent path never touches `this.forge`.
- **The composition root** is `composeReferenceRun` in
  [`../../../../src/bootstrap.ts`](../../../../src/bootstrap.ts) — already `async`, the sole importer of
  the reference adapters (including `ReferenceForge`), fails closed on an unknown driver
  (`ProviderSelectionError`); it supports `forge=reference` only today.
- **The reference forge models the skip** ([`../../../../src/providers/reference/forge.ts`](../../../../src/providers/reference/forge.ts)):
  `land()` returns `runner-action.skipped-on-dry-run`. This is the Phase-7 replacement on the **driven**
  path only.
- **No-double-effect is record-grounded** (ADR 0020 §5): the runner already recognizes recorded
  `runner-action.*` actions from the replayed log and neither re-runs nor re-appends them.
- **Redaction activated in Phase 6** (`src/redaction.ts`, `RedactionAmbiguityError` /
  `redaction-export-posture-ambiguous`). Phase 7 **extends** it to the landing path.

## Non-goals

Do not:

- change the **`ForgePort.land()` method surface** — the only port-type edit is repairing
  `LandingRequest.action` to the union (ADR 0023 Decision 2); do **not** add a landing method to
  `AgentPort` (INV-002 structural), and do **not** route block surfacing through `land()` (ADR 0023
  Decision 4 — it is a distinct runner-invoked act);
- implement real **work-source** import (Phase 8) or records **tamper-evidence** / the active
  re-approval path (Phase 9);
- change the records the default (reference/dry-run) wiring emits, or regress the Phase-0..4 golden
  fixtures — the modeled `runner-action.skipped-on-dry-run` stays byte-identical on the default path;
- **mint a new event family** — real landing maps onto the observability-records v0 runner-action
  families already named ("pushed, opened PR, posted status, posted comment, merged, skipped repeated
  effect on resume");
- freeze a JSON Schema, event constants, a landing-identity/idempotency records field, or a TypeScript
  **contract** package for the execution-plan or observability-records v0 seams — if idempotency
  recognition or `action` discrimination genuinely needs a frozen records field, that is a stop routed
  to the contract owner;
- add manifests, port interfaces, or event constants **to the fixtures directory** as normative
  artifacts (fixtures README Contract-Preservation Rule) — keep any real-forge fixture plainly
  non-normative;
- introduce a new lifecycle state, transition table, or event family; Phase 7 records are additive;
- let "real" expand into hosted, multi-tenant, or remote landing targets.

## Likely source files touched / new modules (names are suggestions, not mandates)

- `src/ports.ts` — repair `LandingRequest.action` to the union `'push' | 'open-pr' | 'merge'` (Residual
  B); `LandingOutcome` stays `Pick<RunEvent, 'family'> & Partial<RunEvent>` (additive real-landing
  fields need no surface change).
- `src/providers/real/forge.ts` (new) — the real Forge/GitHub `ForgePort` adapter: discriminates the
  `action` union, performs the real push/PR/merge, fails closed on an unknown action, and surfaces a
  block PR-side (a distinct act) with a durable-Records fallback.
- `src/bootstrap.ts` — add the real forge driver name (e.g. `forge: 'github'`) to the composition
  root's selection, mirroring the Phase-6 `agent: 'codex'` / `executionHost: 'real'` pattern; keep it
  the sole importer; unknown forge name fails closed. **Also extend the redaction-activation condition**
  (`composeRunPorts`, currently `selection.agent === 'codex' || selection.executionHost === 'real'`) to
  include the real-Forge term (`selection.forge === 'github'`) — see Slice 4.
- `src/harness.ts` — the runner's `done → landed` call site: construct the union-typed
  `LandingRequest`, recognize an already-landed effect from the replayed records (recorded no-op), and
  invoke the distinct block-surfacing act on a `blocked` item when a safe branch + permission exist.
- `src/redaction.ts` — extend real secret-scanning to the landing path; a landing-path redaction
  ambiguity → diagnosable stop (extends ADR 0022 Decision 8 / ADR 0020 §7).
- `src/conformance/*` — Phase-7 adversarial additions (agent-reachable landing, resume double-apply,
  unredacted landing credential, unknown `action`).
- `tests/*` — new tests named per AC ID (below); `tests/fixtures/**` — real-forge, already-landed,
  head-mismatch, blocked-PR-surface, no-safe-branch, and landing-credential fixtures (all
  non-normative).

## Concrete implementation slices — ordered per the 7a → 7b split

Implement in order. After **every** slice, the Phase-0..4 goldens must still pass under the default
(reference/dry-run) wiring and the conformance suite must still fail closed on a broken adapter.

### Sub-phase 7a — real runner-owned landing

#### Slice 1 — `LandingRequest.action` union (ADR 0023 Decision 2) → P7-AC-2

- In `src/ports.ts`, repair `LandingRequest.action` from the single literal `'push|open-pr|merge'` to
  the union `'push' | 'open-pr' | 'merge'`. Update the runner's call site
  ([`../../../../src/harness.ts`](../../../../src/harness.ts) line 524, constructed `as const`) and the
  reference forge mechanically.
- The real adapter **discriminates** on the union; an `action` that is not one of the three members
  **fails closed** at the seam (a diagnosable stop, FENCE-1), never a silent fallback.
- **Preserve the dry-run modeled-landing record bytes — binding, do not re-decide (ADR 0023
  Decision 2).** The Phase-0..4 goldens
  (`tests/fixtures/m5b-local-mvp/golden-run-record-success.json`, `-canonical-triad.json`,
  `-multi-success.json`) hard-record `"action": "push|open-pr|merge"`, because
  `modeledLandingEvent()` and `ReferenceForge.land()` copy `LandingRequest.action` **verbatim** into the
  record. **The dry-run/reference modeled-landing record MUST continue to serialize the exact string
  `"push|open-pr|merge"` for its `action` field — byte-for-byte — after the union repair.** Decouple the
  record's dry-run `action` token from the union member: the `skipped-on-dry-run` path writes the fixed
  literal `"push|open-pr|merge"` (the pre-union modeled value), while the union is the **typed** field
  the real adapter discriminates on. Do **not** let the modeled/dry-run path emit a single union member
  (`"push"`) into the record — that would change the golden byte and break the anchor. **Expected dry-run
  record bytes:** `"action": "push|open-pr|merge"` (unchanged). Do **not** touch the Phase-0..4 goldens;
  no Residual-B golden update is authorized.
- **Test obligation:** a golden-regression test proving the three Phase-0..4 goldens above stay
  byte-identical after the `action` union repair — the load-bearing evidence that the type change did not
  leak into the modeled record.
- **Stop condition:** if discriminating the action turned out to require freezing an observability-
  records field, that freeze is contract-owner-owned — route back to design. It does **not**: the
  runner-action families the record already carries distinguish the three effects.

#### Slice 2 — Real Forge/GitHub adapter behind `ForgePort.land()` (ADR 0023 Decisions 1, 6) → P7-AC-1

- Add `src/providers/real/forge.ts`: a real `ForgePort` adapter that performs a real push, PR, or merge
  per the union `action`, invoked **only** by the runner at `done → landed`. It maps to the merged port
  unchanged (`land(request) → LandingOutcome | Promise<LandingOutcome>`); no method or field is added to
  `AgentPort` (INV-002, structural).
- Selected by name (`config.drivers.forge = 'github'`) through the composition root; the reference
  wiring is unchanged, so the real forge is **opt-in**. Unknown forge name fails closed
  (`ProviderSelectionError`).
- **Regression anchor:** the default (reference/dry-run) wiring reproduces the Phase-0..4 goldens
  byte-identically — the reference forge still emits `runner-action.skipped-on-dry-run`; the real-landing
  record lands only in a real-forge scenario with its own golden. The dry-run path stays
  `skipped-on-dry-run` (the P7-AC-1 dry-run regression).

#### Slice 3 — Real-effect idempotency from the records (ADR 0023 Decision 3) → P7-AC-3

- A re-run or resume against an already-landed effect recognizes the prior landing **from the durable
  run records** — the same Phase-4 no-double-effect recognition from the replayed log (ADR 0020 §5) —
  and the second attempt is a **recorded no-op** (the "skipped repeated effect on resume" runner-action
  family). Do not re-query externally to decide; recognize from records.
- **Exact-head re-read is the safety property** (prior-art lessons 9–10): before treating a prior
  landing as complete, re-read the exact head the landing targeted. Head agrees → recorded no-op; head
  **changed** → do **not** blindly no-op and do **not** duplicate — stop diagnosably rather than landing
  on an unadjudicated head.
- The richer real-landing outcome (a landing identity a re-run recognizes — target ref/head, landing
  kind) is **additive** on `LandingOutcome` (no port change); the **encoding is deferred**. If
  recognition genuinely needs a **frozen** records field → stop routed to the contract owner.

#### Slice 4 — Landing-path secret redaction (ADR 0023 Decision 5) → P7-AC-4

- **Extend** the Phase-6 `src/redaction.ts` scan to the landing path: Forge/GitHub credentials and
  tokens surfaced on the real landing path are scanned and redacted in the **landing records**. This is
  not a new mechanism — it is the Phase-6 activation applied at the landing boundary.
- **Extend the redaction-ACTIVATION condition to real-Forge selection — binding.** Phase 6 activates
  redaction in `composeRunPorts` only when `selection.agent === 'codex' || selection.executionHost ===
'real'`, so `redaction` is left **`undefined`** for a valid Phase-7 config that sets only
  `config.drivers.forge = 'github'` (agent/executionHost left on reference). That is a **forge-only real
  run** in which Forge/GitHub tokens can enter landing records **unredacted** — violating P7-AC-4 ("the
  landing path never leaks a token"). The activation predicate MUST gain the real-Forge term
  (`selection.forge === 'github'`) so a forge-only real run activates landing-path redaction. Scanning
  the landing path (previous bullet) is necessary but not sufficient — if activation never turns on, the
  scan never runs.
- A landing-path redaction **ambiguity** becomes an operator-visible **diagnosable stop**
  (`RedactionAmbiguityError` / `redaction-export-posture-ambiguous`, extending ADR 0020 §7 / ADR 0022
  Decision 8) — never a silent leak. Records stay safe to keep/export by default. The landing path never
  leaks a token.
- **Test obligation:** a forge-only real run (`forge: 'github'`, agent/executionHost on reference) has
  redaction **enabled** (the composed ports carry `redaction.enabled === true`, not `undefined`) **and**
  a landing-path secret in that run is redacted in the landing record. This is the P7-AC-4 evidence that
  activation, not just scanning, covers the forge-only path.

### Sub-phase 7b — PR-side block surfacing

#### Slice 5 — PR-side block surfacing as a distinct runner-invoked act (ADR 0023 Decision 4) → P7-AC-5

- Block surfacing is a **distinct runner-invoked Forge-seam act, not a `land()` call** — a `blocked`
  item never reaches `done → landed`, and none of the `action` union members is "post a block comment."
  Keep `land()` pinned to `done → landed` (P7-AC-1). `providers.md` Forge already carries this act as a
  separate "Provider implements" responsibility; ADR 0021 decision 6 permits the method decomposition to
  flex.
- When the runner has a **safe branch and permission to push**, the real Forge opens/updates the PR,
  posts status, and surfaces the failure reasons as a PR **comment** — without changing what `blocked`
  means (block ownership stays with the runner's Wave-2 state machine; the seam owns only the forge-side
  surfacing). Uses the already-contracted "posted status / posted comment" runner-action families — no
  new family.
- When the run **cannot** safely surface PR-side (no safe branch, no permission), the block is still
  recorded through the **durable Records fallback** and **never dropped** — the fallback stays a Records
  concern, not a Forge-seam reinvention.

#### Slice 6 — Conformance-suite adversarial additions (ADR 0023 Decisions 1, 3, 4, 5) → P7-AC-1..5 regression

Extend `src/conformance/` + broken/adversarial Forge adapter fixtures so the suite still fails closed
on:

- an **agent-reachable landing** adapter — a landing path reachable from the `AgentPort` rather than the
  runner (INV-002 structural) → rejected;
- a **resume double-apply** adapter — repeats a real effect on resume/retry instead of recognizing the
  prior landing → rejected;
- an **unknown-action** adapter — accepts an `action` outside the union instead of failing closed →
  rejected;
- an **unredacted-credential** adapter — leaks a Forge token into a landing record → rejected.

## Acceptance criteria (binding — from `phases.md`)

- **P7-AC-1** — The runner drives `ForgePort.land()` at `done → landed` and a real push/PR/merge effect
  occurs on GitHub; the `AgentPort` still exposes no landing path, and landing stays
  `skipped-on-dry-run` under dry-run wiring. **7a**, Slice 2. Traces: `MERGE-2`, `MERGE-5`, `FENCE-3`,
  ADR 0021 decision 6.
- **P7-AC-2** — `LandingRequest.action` is the union `'push' | 'open-pr' | 'merge'` and the real adapter
  discriminates on it; an unknown action fails closed. **7a**, Slice 1. Traces: `src/ports.ts`
  (Residual B), `MERGE-2`.
- **P7-AC-3** — Re-running a landed effect (resume or retry) does not duplicate it: the prior landing is
  recognized from the records and the second attempt is a recorded no-op. **7a**, Slice 3. Traces:
  `MERGE-5`, `RESUME-3`, ADR 0021 decision 6.
- **P7-AC-4** — Secrets on the real landing path (Forge/GitHub credentials, tokens) are scanned and
  redacted in the landing records; a redaction ambiguity on the landing path becomes a diagnosable stop,
  and records stay safe to keep and export. **7a**, Slice 4. Traces: `SEC-1`–`SEC-3`.
- **P7-AC-5** — Blocked work is surfaced PR-side through the real Forge: when the runner has a safe
  branch and permission to push, the block opens/updates the PR, posts status, and records the failure
  reasons as a PR comment, without changing what `blocked` means; when it cannot safely do that, the
  block is still recorded through the durable Records fallback rather than dropped. **7b**, Slice 5.
  Traces: `MERGE-5`, ADR 0021 decision 6.

## Test / evidence plan

Every test cites the AC ID it proves. Coverage thresholds stay at 90% (aim 95%); `corepack pnpm check`
is the gate.

- **Runner-only real landing** (`tests/providers.real-forge.*`): `P7-AC-1: the runner drives
ForgePort.land() at done → landed and a real push/PR/merge effect occurs`; `P7-AC-1: the AgentPort
exposes no landing path` (the structural no-landing test); `P7-AC-1: landing stays
skipped-on-dry-run under dry-run wiring` (the dry-run regression).
- **Action union** (`tests/providers.real-forge.*` / `tests/ports.*`): `P7-AC-2: the real adapter
discriminates the action union push/open-pr/merge`; `P7-AC-2: an unknown action fails closed`; and the
  **byte-identity guard** `P7-AC-2: the Phase-0..4 goldens keep "action": "push|open-pr|merge" after the
union repair` (proving the union type did not leak into the modeled dry-run record — Slice 1).
- **Idempotency** (`tests/providers.real-forge.*` / `tests/resume.*`): `P7-AC-3: a land-then-relaunch is
recognized from the records and is a recorded no-op`; `P7-AC-3: a re-run against a changed head refuses
to land rather than duplicating or blindly no-op-ing` (the exact-head safety property).
- **Landing-path redaction** (`tests/redaction.*` / `tests/bootstrap.*`): `P7-AC-4: a landing record
carrying a real Forge credential is scanned and redacted`; `P7-AC-4: a landing-path redaction ambiguity
becomes a diagnosable stop`; and the **forge-only activation** guard `P7-AC-4: a forge-only real run
(forge: github, agent/executionHost on reference) has redaction enabled and a landing-path secret is
redacted` (proving the activation predicate, not just the scan, covers the forge-only path — Slice 4).
- **PR-side block surfacing** (`tests/providers.real-forge.*` / `tests/harness.*`): `P7-AC-5: a blocked
run with a safe branch and permission surfaces status and a failure-reason PR comment`; `P7-AC-5: a
blocked run with no safe branch falls back to the durable Records path rather than dropping the block`.
- **Conformance (regression anchors)** (`tests/conformance/*`): the reference forge still passes; a
  broken adapter still fails closed; plus the Phase-7 adversarial additions (`P7-...: an agent-reachable
/ resume-double-apply / unknown-action / unredacted-credential Forge adapter is rejected`).
- **Baseline guard:** the Phase-0..4 goldens still pass under the default wiring — proof the real forge,
  the `action` union, and landing-path redaction did not regress the delivered records.

## Fixture plan

- **Real-forge fixtures** (config selecting `forge: 'github'`), clearly non-normative, each real-landing
  record in its **own new golden** (the Phase-0..4 goldens stay untouched — do not re-normalize them to
  absorb a new field; the dry-run path stays `runner-action.skipped-on-dry-run`).
- **An already-landed fixture** (a replayed log carrying a prior real landing) + a **head-mismatch
  fixture** (the target head changed since the recorded landing) for P7-AC-3.
- **A landing-credential record fixture** + a **landing-path redaction-ambiguity fixture** for P7-AC-4.
- **A blocked-PR-surface fixture** (safe branch + permission) + a **no-safe-branch fixture** (falls back
  to the durable Records path) for P7-AC-5.
- **An unknown-action fixture** for the fail-closed P7-AC-2 case.
- **Broken/adversarial Forge adapter fixtures** the conformance suite rejects (Slice 6), proving
  fail-closed.
- No TypeScript interfaces, JSON Schema, event constants, or landing-identity schema as **normative**
  fixtures (fixtures README rule); keep every real-forge example plainly illustrative.

## CLI behavior

- `jig run` / `jig preview` / `jig inspect` / `jig resume` — **unchanged in surface** under the default
  wiring. `run`/`resume` compose the real forge through the composition root only when `config.drivers`
  selects it (`forge: 'github'`); an unknown selection still fails closed with a non-zero exit. No new
  subcommand is required. The real landing effect is opt-in behind the driver selection.

## Stop conditions

Halt and route back to design (do not decide locally) if:

- real landing is **not idempotent** when re-run against a real effect (a re-run duplicates the push/PR/
  merge instead of recognizing the recorded landing);
- any landing path becomes reachable from the **`AgentPort`** rather than the runner (INV-002
  structural);
- a **Forge credential** could appear unredacted in a record;
- making `action` a union, recognizing an already-landed effect, or discriminating the action would
  require **freezing** the observability-records schema (a JSON Schema / event constant / TypeScript
  contract field) — the union is a local port-type fix, but schema freeze is contract-owner-owned; route
  freeze back to design (repo-plan open question 2);
- the default wiring can no longer reproduce the Phase-0..4 goldens (a records regression) — the change
  is not additive and must be re-scoped;
- "real" would expand into hosted, multi-tenant, or remote landing targets before the local real path
  proves out.

## PR evidence checklist

- `git diff --check` clean.
- `corepack pnpm check` green (lint, format:check, typecheck, delivery:check, vitest ≥ 90%).
- Every new test names the AC ID it proves; the conformance suite and every broken/adversarial Forge
  adapter fixture are read by a test.
- A records-diff note in the PR body: the default wiring reproduces the Phase-0..4 records
  (`runner-action.skipped-on-dry-run` unchanged); any additive field (the real-landing outcome, the
  landing-identity marker a re-run recognizes, a landing-path redaction-stop, a PR-surface
  status/comment record) is named and cited to ADR 0023, and mapped onto the observability-records v0
  runner-action families already named — downstream consumers read records, so the change must be
  legible, and **no event family is minted**. Note the explicit non-goals: no real work-source import,
  no schema freeze, no `ForgePort.land()` method-surface change (only the `LandingRequest.action` union).
- The Phase-0..4 goldens still pass, evidencing no regression to the delivered shape.
