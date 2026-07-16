---
title: "ADR 0023 — Phase 7 real Forge/GitHub landing: the runner-owned real landing seam, the action union, real-effect idempotency, PR-side block surfacing, landing-path redaction"
status: applied
---

# ADR 0023 — Phase 7 real Forge/GitHub landing

## Context

Phase 7 ([`docs/archive/delivery/m7-real-providers/phases.md`](../../delivery/m7-real-providers/phases.md),
P7-AC-1..5) promotes the **Forge** seam from the modeled, `skipped-on-dry-run` reference adapter to a
**real Forge/GitHub adapter** that lands work under the runner's authority, with real-effect
idempotency. It is the third phase of the M7 real-providers track: after Phase 6 made the agent and
execution-host seams real ([ADR 0022](./0022-phase-6-real-driver-integration.md)), Phase 7 is the
first phase in which `done → landed` performs a **real effect** — a real push, PR, or merge on
GitHub — rather than recording a modeled skip. Landing stays **runner-owned**: `ForgePort.land()` is
invoked only by the runner at `done → landed`, and the `AgentPort` never gains a landing path. What is
missing is the set of concrete choices an implementer would otherwise have to invent. This ADR settles
them so two independent implementers produce compatible Phase 7 behavior, exactly as
[ADR 0022](./0022-phase-6-real-driver-integration.md) did for Phase 6,
[ADR 0021](./0021-phase-5-integrated-provider-runs.md) did for Phase 5, and
[ADR 0020](./0020-phase-4-reliable-local-runs.md) did for Phase 4.

The design layer already seeds every Phase-7 concept — the Forge port's owns/implements/must-not
contract (including the runner-exclusive landing point, the MERGE-5 block-surfacing act, and
adapter-level idempotency as a seam contract) in [`../contracts/providers.md`](../contracts/providers.md);
the runner-exclusive `done → landed` boundary and its two-authority split (Fence adjudication vs.
runner-owned landing) in [`../core/orchestration.md`](../core/orchestration.md); the redaction/export
posture this ADR extends to the landing path in [`../core/records.md`](../core/records.md); the
composition root that "is the one place that imports provider implementations" in
[`../core/bootstrap.md`](../core/bootstrap.md); and the Phase-4 no-double-effect recognition from the
replayed log ([ADR 0020](./0020-phase-4-reliable-local-runs.md) §5) and the redaction activation
([ADR 0022](./0022-phase-6-real-driver-integration.md) Decision 8, `src/redaction.ts`) this ADR
extends rather than reinvents. The prior-art recipe for a runner-does-push landing boundary and
proven-not-asserted forge behavior is recorded in
[`../notes/prior-art-workflow-kit.md`](../notes/prior-art-workflow-kit.md) lessons 5 and 9, weighed
here and re-derived, never ported.

The v0 contracts remain unfrozen (STOP-003 in
[`../notes/runtime-design-m5a.md`](../notes/runtime-design-m5a.md)); nothing here freezes the
execution-plan or observability-records JSON Schema, mints a public contract package, or ships a real
Forge driver **from this ADR** (this ADR is docs-only; the real Forge adapter lands in the Phase-7
implementation cycle). The four ports stay **jig-internal seams** in `src/` — the same category as
`Worker` and `RecordSink` — not a versioned public contract. The one port-type change this ADR
authorizes — making `LandingRequest.action` a real union (Residual B) — is a **local port-type fix**
that freezes nothing.

### Org reconciliation — Phase 7 is the Forge slice of the M5 "later slice" made real

Org M7 (`.github/MILESTONES.md`, "M7: Real Provider Integration") promotes the M5
`named extension point` seams (agent driver, execution-host driver, **forge driver**, work-source
driver, resume, capability attestation) to `exercised` **with real effects**, behind the contracts M1
owns and jig Phase 5 merged (commit `f59a479`). Phase 7 is the **forge** slice of that promotion. It
introduces **no new org-level seam** and changes **no** org-owned contract shape: the execution-plan v0
and observability-records v0 contracts stay unfrozen, and the four ports keep their merged surfaces —
`ForgePort.land()` is unchanged; only its argument type `LandingRequest.action` is repaired from a
single mis-encoded literal to a real union, a jig-internal seam edit, not an org-owned contract change.
The real-landing outcome maps onto the observability-records v0 **runner-action** families the contract
already names ("pushed, opened PR, posted status, posted comment, merged, skipped repeated effect on
resume" —
[`../contracts/observability-records-contract-v0.md`](../contracts/observability-records-contract-v0.md)),
so no event family is newly minted. No `.github` divergence is routed and no org PR is required; a
routed-back finding (an org seam proves wrong, or real-landing idempotency needs a frozen records
field) goes to `.github/MILESTONES.md`/`ROADMAP.md` and the contract owner, not resolved locally.

### Delivered reality this ADR builds on

Established by Phases 0–6 and confirmed against `src/` at authoring time (the **real as-merged** port
shapes, not the ADR 0021 sketch):

- **The Forge seam is a merged jig-internal port** ([`../../../packages/jig-sdk/src/ports.ts`](../../../../packages/jig-sdk/src/ports.ts)):
  `ForgePort.land(request: LandingRequest): LandingOutcome | Promise<LandingOutcome>`. `LandingRequest`
  is `{ storyId: string; action: 'push|open-pr|merge'; reason?: 'dry-run' }` — **`action` is a single
  string literal containing pipe characters, `'push|open-pr|merge'`, not a union** (Residual B). It is
  unexercised as a discriminator today because the reference adapter is `skipped-on-dry-run`.
  `LandingOutcome` is `Pick<RunEvent, 'family'> & Partial<RunEvent>` — a record-shaped outcome that can
  carry additive fields **without a port surface change**.
- **The runner is already the sole `land()` caller.** In `LocalHarness`
  ([`../../../packages/jig-sdk/src/harness.ts`](../../../../packages/jig-sdk/src/harness.ts) lines 516–529), when a story's evidence passes
  the runner emits `story.done`, constructs the `LandingRequest` (`{ storyId, action:
'push|open-pr|merge', reason: 'dry-run' }`), calls `await this.forge.land(landingRequest)`, and
  records the modeled `runner-action.skipped-on-dry-run` event. The agent path never touches
  `this.forge`. This is the `done → landed` seam, modeled rather than performed — the exact structure
  Phase 7 makes real.
- **The composition root is `composeReferenceRun` in
  [`../../../packages/jig-sdk/src/bootstrap.ts`](../../../../packages/jig-sdk/src/bootstrap.ts)** — already `async`, the sole importer of the
  reference adapters (including `ReferenceForge`), and it fails closed on an unknown driver name
  (`ProviderSelectionError`). It supports `forge=reference` only today (bootstrap.ts driver-name sets);
  a real forge selection is a new named driver, mirroring the Phase-6 `agent=codex` / `executionHost=real`
  pattern.
- **The reference forge models the skip.** `ReferenceForge.land()`
  ([`../../../packages/jig-sdk/src/providers/reference/forge.ts`](../../../../packages/jig-sdk/src/providers/reference/forge.ts)) returns a
  `runner-action.skipped-on-dry-run` outcome; the dry-run path never performs a real effect. This is the
  Phase-7 replacement on the **driven** path only; the default/dry-run path is untouched.
- **No-double-effect is already record-grounded.** The Phase-4 recognition
  ([ADR 0020](./0020-phase-4-reliable-local-runs.md) §5;
  [`../core/orchestration.md`](../core/orchestration.md) "No-double-effect is a records-to-runner
  handoff") already recognizes already-recorded `runner-action.skipped-on-dry-run` actions from the
  replayed log and neither re-runs nor re-appends them. Phase 7 extends this from a modeled skip to a
  **real effect**.
- **Redaction activated in Phase 6.** Real secret-scanning turned on at the boundary real credentials
  first entered play ([ADR 0022](./0022-phase-6-real-driver-integration.md) Decision 8,
  `src/redaction.ts`, with `RedactionAmbiguityError`/`redaction-export-posture-ambiguous`). Phase 7
  **extends** that same mechanism to the landing path; it is not a new mechanism.

## Decision

Six settlements, binding on Phase 7 and later provider phases. Each is a decision, not an open
question.

### 1. The 7a/7b split and its acceptance-criteria assignment

`phases.md` invites an optional 6a/6b-style split. **Settled: Phase 7 splits into two sub-phases with
a fixed internal ordering 7a → 7b**, mirroring the ADR-0022 6a/6b style, because the two halves have
genuinely different risk and can land independently useful:

- **7a — real runner-owned landing.** The real Forge/GitHub adapter behind `ForgePort.land()`
  performs a real push, PR, or merge at `done → landed`, discriminating on the repaired `action` union
  (Decision 2), and a re-run against an already-landed effect is a recorded no-op (Decision 3). 7a is
  **independently useful**: an operator sees an approved, evidenced run become real landed work, and
  re-running does not duplicate it. 7a is the boundary at which **real Forge credentials first enter the
  landing path**, so it carries landing-path redaction (Decision 5) as its safety floor.
- **7b — PR-side block surfacing.** The blocked-work PR surface (Decision 4, MERGE-5): when the runner
  has a safe branch and permission, the real Forge opens/updates the PR, posts status, and records the
  failure reasons as a PR comment; when it cannot safely do so, the block falls back to the durable
  Records path. 7b hardens the operator-visible surface on top of 7a's real landing; it is distinct
  from `land()` (Decision 4) and rides second because it is observability polish over a working real
  landing, not a precondition for it.

**AC assignment** (the thing an implementer would otherwise invent), under the invariant _7a must land
independently useful with real landing + idempotency + landing-path redaction_:

| AC                                                     | Sub-phase | Rationale                                                                                                                                          |
| ------------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P7-AC-1** real runner-owned landing effect + dry-run | **7a**    | The real `done → landed` effect is 7a's whole point; the dry-run `skipped-on-dry-run` regression and the no-`AgentPort`-landing test ride with it. |
| **P7-AC-2** `action` union + fail-closed unknown       | **7a**    | The real adapter cannot discriminate push/PR/merge until `action` is a real union; it is a precondition for 7a's landing.                          |
| **P7-AC-3** real-effect idempotency                    | **7a**    | Idempotency guards the **first** real effect; it must be in place the first time a real landing fires.                                             |
| **P7-AC-4** landing-path secret redaction              | **7a**    | Real Forge credentials first enter through the real landing path, so landing-path redaction activates in 7a — 7a's safety floor.                   |
| **P7-AC-5** PR-side block surfacing + Records fallback | **7b**    | The blocked-work PR surface is observability polish over a working real landing, distinct from `land()`, and safe to land second.                  |

P7-AC-4 rides 7a (not 7b) because the landing-path credential boundary opens the moment the real
adapter authenticates to GitHub, which is the **first** thing 7a does — redaction cannot wait for the
block surface. Both placements are stated here so two implementers do not split them differently.

### 2. Residual B: `LandingRequest.action` becomes the union `'push' | 'open-pr' | 'merge'`

**The open question routed from the repo plan** (`repo-plan-m7.md` open question 2; `phases.md` Phase-7
requirement and stop condition): `LandingRequest.action` in the merged
[`../../../packages/jig-sdk/src/ports.ts`](../../../../packages/jig-sdk/src/ports.ts) is the single string literal `'push|open-pr|merge'` —
one literal containing pipe characters, not a union — so a real Forge cannot discriminate the three
landing actions. **Resolved here: `action` becomes the union `'push' | 'open-pr' | 'merge'`, and the
real adapter discriminates on it; an unknown action fails closed.**

- **This is a local port-type fix, and it freezes nothing.** `LandingRequest` is a jig-internal `src/`
  seam (the same category as `Worker`/`RecordSink`), not a versioned public contract; repairing a
  mis-encoded literal into the union it was always meant to be adds no privileged method, changes no
  invoker, and collapses no port. The composition root, the runner's call site
  ([`../../../packages/jig-sdk/src/harness.ts`](../../../../packages/jig-sdk/src/harness.ts) line 524, which constructs the request
  `as const`), and the reference forge all update mechanically to the union.
- **Unknown action fails closed.** A `LandingRequest` whose `action` is not one of the three union
  members is refused at the seam with a diagnosable stop (FENCE-1 fail-closed posture), never a silent
  fallback or a guessed action.
- **The dry-run modeled-landing record stays byte-identical (compatibility mapping, binding).** The
  Phase-0..4 goldens hard-record the modeled landing as `"action": "push|open-pr|merge"`
  (`tests/fixtures/m5b-local-mvp/golden-run-record-success.json`, `-canonical-triad.json`,
  `-multi-success.json`), because the modeled/dry-run landing (the harness `modeledLandingEvent()` and
  `ReferenceForge.land()`) copies `LandingRequest.action` **verbatim** into the record. Making `action`
  a union and letting the dry-run path emit a single union member (`"push"`) would change that byte and
  break the byte-identity regression anchor. **Settled: the record `action` serialization on the
  `skipped-on-dry-run` path is decoupled from the union member and continues to serialize exactly the
  string `"push|open-pr|merge"`, regardless of the union.** Concretely: the dry-run/reference landing
  path records the fixed literal `"push|open-pr|merge"` (the pre-union modeled value preserved as the
  record's dry-run `action` token), while `LandingRequest.action` as a **typed field** becomes the
  union that the real adapter discriminates on. The type repair does **not** flow into the modeled-record
  bytes; the byte-identity anchor holds unchanged for every field, including `action`. Real landing
  emits its real effect through the already-contracted runner-action families (Contract and records
  posture), in its own new golden — never the modeled `push|open-pr|merge` token. This keeps the hard
  anchor intact (no golden edit) and is the reason no Residual-B golden churn is authorized.
- **The stop condition (binding).** The union itself freezes nothing. **If** discriminating the action
  in the real adapter turned out to require freezing an observability-records field to carry the action
  (e.g. a frozen `action` enum on the landed record), that freeze is contract-owner-owned and routes
  back to design — but the real runner-action families the record already carries ("pushed, opened PR,
  posted status, posted comment, merged" —
  [`../contracts/observability-records-contract-v0.md`](../contracts/observability-records-contract-v0.md))
  already distinguish the three effects, so **no freeze is required by this ADR**; the action is legible
  through the existing family surface with encoding deferred.

### 3. Real-effect idempotency (P7-AC-3): recognize the prior landing from the records

Settles the exact thread [ADR 0021](./0021-phase-5-integrated-provider-runs.md) decision 6 deferred
("idempotency for real effects remain deferred to a later phase") and that
[ADR 0020](./0020-phase-4-reliable-local-runs.md) §5 seeded. It is now due because the effect is real.

- **Recognition is from the replayed records, not a fresh external query.** A re-run or resume against
  an already-landed effect recognizes the prior landing **from the durable run records** — the same
  Phase-4 no-double-effect recognition from the replayed log
  ([`../core/orchestration.md`](../core/orchestration.md) "No-double-effect is a records-to-runner
  handoff"; ADR 0020 §5) that already recognizes recorded `runner-action.*` actions — and the second
  attempt is a **recorded no-op** (the observability-records "skipped repeated effect on resume"
  runner-action family, which the contract already names). No new lifecycle state is minted; `landed`
  stays terminal.
- **The exact-head re-read is the safety property (weighed from prior art).** Prior-gen forge behavior
  (`prior-art-workflow-kit.md` lesson 9 / lesson 10's honesty-probe discipline) refuses to land on a
  **head mismatch**: before treating a prior landing as complete, the adapter re-reads the exact head
  the landing targeted. If the recorded landing and the current head agree, the re-run is a recorded
  no-op; if the head has **changed** out from under the recorded landing, the run does **not** blindly
  no-op **and** does **not** duplicate the effect — it stops diagnosably rather than landing on a head
  it did not adjudicate. Recognition without exact-head re-read would let a changed head be silently
  treated as already-landed.
- **The outcome is additive, no port change.** `LandingOutcome` is `Pick<RunEvent, 'family'> &
Partial<RunEvent>`, so a richer real-landing outcome (the landing identity a re-run recognizes — a
  target ref/head, a landing kind) is **additive** and needs no port surface change. The **meaning** is
  fixed here (a durable, re-run-recognizable record of the real effect that landed); the exact
  landing-identity **field encoding is deferred** to schema freeze, consistent with ADR 0017 decision 5.
  If recognition genuinely required a **frozen** records field, that freeze is the stop routed to the
  contract owner (Decision 2's stop condition), not a local edit.

### 4. PR-side block surfacing (MERGE-5, P7-AC-5): a distinct runner-invoked Forge act, not a `land()` call

Realizes P7-AC-5 and the `providers.md` Forge "Provider implements" MERGE-5 block-surfacing act,
without changing what `blocked` means and without violating "`land()` is invoked only at `done →
landed`" (Decision "landing stays runner-owned", P7-AC-1).

- **Block surfacing is not a landing.** A `blocked` work item never reaches `done → landed`, and none
  of the three `action` union members (`push` / `open-pr` / `merge`) is "post a block comment." So
  block surfacing is settled as a **distinct runner-invoked Forge-seam act**, not a `land()` call —
  keeping `land()` pinned to `done → landed` (P7-AC-1) intact. `providers.md` Forge already carries this
  act as a separate "Provider implements" responsibility, and ADR 0021 decision 6 already states "the
  exact method decomposition may flex," so this is a permitted decomposition, not a new port.
- **The surfacing behavior.** When the runner has a **safe branch and permission to push**, the real
  Forge opens or updates the PR-side surface, posts status, and surfaces the failure reasons as a PR
  comment — so a `blocked` item shows up where the owner already works (MERGE-5,
  [`../core/orchestration.md`](../core/orchestration.md) "Blocks are visible"). It does **not** change
  what `blocked` means: block ownership stays with the runner's state machine (Wave 2), and the Forge
  seam owns only the forge-side act of surfacing an already-blocked condition.
- **The durable Records fallback, always.** When the run **cannot** safely surface PR-side (no safe
  branch, no permission), the block is still recorded through the durable Records fallback and **never
  dropped** — the fallback stays a Records concern, not a local reinvention by the Forge seam
  (`providers.md` Forge). The block is legible to the owner regardless of whether the PR surface
  succeeded.
- **Design altitude, encoding deferred.** The invariants are fixed here (runner-invoked, distinct from
  `land()`, does not change `blocked`, durable-Records fallback when unsafe); the exact method
  decomposition and any candidate `post-status`/`post-comment` method names are deferred to
  implementation. The runner-action families the record carries ("posted status, posted comment") are
  already contracted, so no new family is minted.

### 5. Landing-path secret redaction (P7-AC-4): extend the Phase-6 redaction to the landing path

Extends the Phase-6 redaction activation ([ADR 0022](./0022-phase-6-real-driver-integration.md)
Decision 8, `src/redaction.ts`) to the real landing path; it is **not** a new mechanism.

- **Same scan, new boundary.** Forge/GitHub credentials and tokens surfaced on the real landing path
  (the adapter's authentication material, any token echoed in a landing diagnostic, PR-URL query
  credentials) are scanned and redacted in the **landing records** by the same
  `redaction`/secret-scanning machinery Phase 6 activated. The landing path never leaks a token
  (SEC-1/SEC-3; the Phase-7 stop condition "a Forge credential can appear unredacted in a record").
- **Activation must include forge-only real runs.** Phase 6 activates redaction in the composition root
  only for a real agent or real host (`selection.agent === 'codex' || selection.executionHost ===
'real'`, `src/bootstrap.ts`). A valid Phase-7 config can select only `forge: 'github'` with the agent
  and host left on reference — a **forge-only real run** in which real Forge credentials enter the
  landing path while redaction would be **inactive**. The activation predicate therefore gains the
  real-Forge term so a forge-only real run activates landing-path redaction; scanning the landing path is
  necessary but not sufficient if activation never turns on. Encoding is deferred; the invariant is
  fixed: **any real run that can put a Forge credential on the landing path activates redaction.**
- **Ambiguity is a diagnosable stop.** A redaction **ambiguity on the landing path** — a value that
  cannot be confidently classified as safe — becomes an operator-visible **diagnosable stop**
  (`RedactionAmbiguityError` / `redaction-export-posture-ambiguous`, extending
  [ADR 0020](./0020-phase-4-reliable-local-runs.md) §7 and ADR 0022 Decision 8), not a silent leak.
  Records stay **safe to keep and export** by default (SEC-1, SEE-6). No new redaction machinery, no new
  event family: the existing diagnosable-stop surface carries it.

### 6. Composition-root wiring and the two regression anchors

- **A real forge driver, selected by name, sole-imported.** Phase 7 adds a real Forge/GitHub driver
  behind `ForgePort`, selected through the `composeReferenceRun` successor
  ([`../../../packages/jig-sdk/src/bootstrap.ts`](../../../../packages/jig-sdk/src/bootstrap.ts)) by a config driver name (e.g.
  `forge: 'github'`), mirroring the Phase-6 `agent: 'codex'` / `executionHost: 'real'` selection
  pattern; bootstrap.ts today supports `forge=reference` only and must gain the real name. The
  composition root stays the **sole importer** of the driver; the runner, Fence, and records never
  import it. An unknown forge driver name fails closed (`ProviderSelectionError`), never a silent
  fallback. The default (reference/dry-run) wiring is unchanged, so the real forge is **opt-in**.
- **The two regression anchors ride every Phase-7 sub-phase, not as their own phase:**
  1. **Default-wiring golden byte-identity.** The default (reference/dry-run) wiring reproduces the
     Phase-0..4 record goldens **byte-identically** — the reference forge still emits exactly today's
     `runner-action.skipped-on-dry-run`, and no real-landing field enters the default path. Real-landing
     records (a real push/PR/merge outcome, its landing identity, a redaction-stop) land **only** in a
     real-forge scenario with its **own new golden**. This is the load-bearing regression anchor the
     whole program depends on.
  2. **Conformance-suite fails closed.** The driver conformance suite still fails closed on a broken or
     non-conforming Forge adapter, now including the Phase-7 additions (an adapter that is reachable from
     the `AgentPort`; an adapter that double-applies a real effect on resume; an adapter that leaks an
     unredacted credential; an adapter that accepts an unknown `action`).

## Contract and records posture

- **No v0 freeze.** The execution-plan and observability-records contracts stay v0 and unfrozen. The
  four ports remain internal `src/` seams; the real-landing outcome fields, the landing-identity
  encoding, and the PR-surface method decomposition are design-owned, not fixtures-frozen. The one
  port-type change — `LandingRequest.action` → the union (Decision 2) — is a jig-internal seam edit that
  freezes nothing.
- **Additive records only, and default records are byte-identical.** Under the **default (dry-run)
  wiring** the records are unchanged from Phases 0–6. Any new named field — a real-landing outcome, a
  landing-identity marker a re-run recognizes, a landing-path redaction-ambiguity stop, a PR-surface
  status/comment record — appears **only** in the Phase-7-specific real-forge scenarios that need it,
  and **each such scenario gets its own new golden**. Real landing maps onto the runner-action families
  the observability-records v0 contract **already names** ("pushed, opened PR, posted status, posted
  comment, merged, skipped repeated effect on resume"); **no event family is renamed, removed, or newly
  minted**, and the modeled `runner-action.skipped-on-dry-run` stays exactly as-is on the default path.
  Field meanings are fixed here; exact encoding is deferred (ADR 0017 decision 5). If real-landing
  idempotency recognition genuinely required a **frozen** records field, that freeze is contract-owner-
  owned and routes back to design (Decision 2 / Decision 3 stop condition), not decided locally.

## Required doc updates (this design PR)

- **`providers.md`** — a "Phase 7 realization (ADR 0023)" section carries the real Forge/GitHub adapter
  behind the runner-invoked `ForgePort.land()`, the `LandingRequest.action` union (Residual B), the
  real-effect idempotency from the replayed records with the exact-head re-read, the PR-side block
  surfacing as a distinct runner-invoked act with the durable Records fallback, and the landing-path
  redaction; the matching "Deferred and out of scope" bullet for real Forge landing is retired. (Done in
  this PR.)
- **`orchestration.md`** — a "Phase 7 realization" note at the two-authority split / `done → landed`
  runner-owned landing: `land()` now performs a real push/PR/merge on the driven path, recognized
  idempotently from the records; PR-side block surfacing is a distinct runner-invoked act; the
  default/dry-run path stays modeled and byte-identical. (Done in this PR.)
- **`authorization.md`** — **no change.** Landing is runner-owned at `done → landed`
  ([`../core/orchestration.md`](../core/orchestration.md)'s two-authority split), not a Fence decision;
  real-effect idempotency, PR-surfacing, and landing-path redaction are records/orchestration concerns,
  not landing-authorization changes. The Fence's grant/deny/route adjudication of worker requests is
  unchanged by Phase 7, so `authorization.md` is deliberately untouched.
- No change to the execution-plan or observability-records v0 contracts, and no change to the
  fixtures-README convention snippets (`delivery:check` stays green).

## Consequences

- Phase 7 turns the Forge seam from a modeled, `skipped-on-dry-run` reference adapter into a **real
  Forge/GitHub driver** behind the unchanged, still runner-invoked `ForgePort.land()` — the first phase
  in which `done → landed` performs a **real effect**. The 7a/7b split lands real runner-owned landing
  with idempotency and landing-path redaction first (independently useful), then the PR-side
  block-surfacing polish.
- The change is **additive** to the runtime and records: the default (reference/dry-run) wiring
  reproduces the Phase-0..6 dry-run and goldens exactly, and the conformance suite keeps failing closed.
  The real forge is opt-in; real-landing records land only in their own scenarios with their own
  goldens.
- The load-bearing safety boundaries are all preserved: landing stays runner-owned and structurally
  outside the `AgentPort` (INV-002, FENCE-3, MERGE-2); an unknown `action` fails closed; a re-run against
  a real effect is a recorded no-op that refuses to land on a head mismatch (RESUME-3); a `blocked` item
  is surfaced PR-side or recorded via the durable fallback but never dropped (MERGE-5); and a Forge
  credential never appears unredacted in a record (SEC-1..3). The `LandingRequest.action` union is a
  local port-type fix that freezes nothing.
- Phase 7 implementation adds `src/providers/real/forge.ts` (or equivalent), repairs
  `LandingRequest.action` to the union in `src/ports.ts`, threads real-landing idempotency recognition
  through the runner's records handoff, extends `src/redaction.ts` to the landing path, and adds the
  Phase-7 conformance additions — see the Phase 7 implementation brief
  ([`../../archive/delivery/m7-real-providers/implementation-briefs/phase-7-real-forge-landing.md`](../../delivery/m7-real-providers/implementation-briefs/phase-7-real-forge-landing.md)).
  It touches `src/bootstrap.ts`, `src/harness.ts`, `src/ports.ts`, `src/redaction.ts`, and the
  conformance suite; it does not change the `ForgePort.land()` method surface.
- No JSON Schema freeze, no TypeScript contract package, no public contract package, and no real
  work-source import (Phase 8) or records tamper-evidence and the active re-approval path (Phase 9).
  Hosted, multi-tenant, or remote landing targets stay org-deferred.

- Date: 2026-07-03
- Origin: Phase 7 real-Forge-landing design closure (docs-only, pre-implementation), scoped to the
  forge slice of M7 per the M7 real-providers repo plan.
