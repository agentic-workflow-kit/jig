---
title: "M7 real-providers delivery track"
status: completed via EVRUN-partial
---

# M7 real-providers delivery track

The delivery track for org milestone **M7 — Real Provider Integration**. It derived jig's
real-integration phases (Phases 6-9) from the org M7 milestone
(`.github/MILESTONES.md`, "M7: Real Provider Integration"), per the org derivation contract
("Deriving Repo Plans"). The org milestone carries no story list; that decomposition lives here.

**Status as of 2026-07-04:** org M7 is done through accepted EVRUN-partial evidence. This track is
kept as durable delivery history and phase context. EVRUN-full remains post-M7 Codex-transport debt
and is not closed by this track.

This track picks up where the M5b local-MVP track ends. M5b proved the local dry-run path and, in its
Phase 5, pinned the four provider ports, the composition root, the capability-attestation Fence
input, and the driver conformance suite as **exercised jig-internal seams** — proven with reference
adapters that perform no real behavior. M7 promotes the M5 `named extension point` seams (agent
driver, execution-host driver, forge driver, work-source driver, resume, capability attestation) to
`exercised` **with real effects**, behind those same, unchanged contracts. It introduces no new
org-level seam.

## What M7 is

M7's outcome (org milestone): enable an operator to turn an approved plan into **real landed
work** — a real agent driver doing real edits, a real execution host with proven confinement, real
Forge/GitHub landing, and real work-source intake — recorded in durable, inspectable records under
policy, against a real capability attestation rather than a reference adapter. Real drivers stay
**opt-in**: the default (reference) wiring reproduces the proven Phase-0..4 local path and its
goldens byte-identically.

**Why this track existed:** the M5 slice pinned and merged the four ports, the composition root, the
capability-attestation gate, and the conformance suite (jig Phase 5, commit `f59a479`). With those
contracts stable and merged, real drivers can slot behind them without churning the seams. Sequence
is not serialization: org M5 remains `current`, but M7 consumes the already-merged P5 seams, so this
repo planning proceeded from those seams.

## What jig owns vs. consumes

- **jig owns** the real driver implementations behind the four existing ports, the proven capability
  attestation and the confinement evidence it attests to, the runner-owned real Forge landing,
  real work-source import through `PlanValidator`, and records-integrity over the record chain — all
  behind the M1-owned execution-plan and observability-records contracts, which stay v0 and unfrozen.
- **jig consumes** the execution-plan and observability-records contract shapes (owned by M1, not
  re-decided here) and the P5-pinned ports, composition root, and conformance suite (merged at
  `f59a479`). Learning (M6) consumes the real run records this track emits, but does not block it.

## Org-M7 exit-criteria → phase map

Org M7 names exit criteria the phases below must close. This table is the binding reconciliation; if
a criterion proves to need an org seam change, it is routed back to `.github`, never decided locally.

| Org-M7 exit criterion                                                                                  | Phase(s)                                          |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Real drivers through the composition root perform real effects under policy against a real attestation | P6 (agent+host), P7 (forge), P8 (work-source)     |
| Real effects recorded in durable, inspectable M1-shaped records                                        | P6-P8 (records), P9 (integrity)                   |
| Tamper-evidence over the record chain + an active re-approval path when a plan's basis changes         | **P9**                                            |
| Isolation proven per story in parallel workspaces                                                      | **P6** (P6-AC-4)                                  |
| Freshness decided by a real clock, not a stubbed constant                                              | **P6** (P6-AC-3)                                  |
| Secrets scanned and redacted on the real landing path                                                  | **P7** (P7-AC-4), first surfaced **P6** (P6-AC-6) |
| Driver conformance suite still fails closed on a broken adapter                                        | Evidence anchor across P6-P8                      |
| Phase-0..4 record goldens byte-identical under default (reference) wiring                              | Regression anchor across P6-P9                    |

The last two are M7 exit criteria carried as **regression anchors and evidence requirements across
every phase**, not as their own phase: real drivers must be opt-in and the conformance suite must
keep failing closed.

## The phase ladder

- **Phase 6 — Real driver integration.** Real agent driver (Codex-first) behind `AgentPort` + real
  execution host behind `ExecutionHostPort` supplying a _proven_ `provenIsolationStrength`; a real
  freshness clock; per-story ISO-4 parallel-workspace isolation; and **resume attestation
  persist/recover** (Residual A). Likely splits at design time into **6a — real agent driver** and
  **6b — real execution host**. The keystone: it produces the real trust anchor the later phases need.
- **Phase 7 — Real Forge/GitHub landing.** The first `done → landed` real effect, with real-effect
  idempotency; fixes the `LandingRequest.action` union (**Residual B**).
- **Phase 8 — Real work-source integration.** Real importer(s) behind `WorkSourcePort`, every
  candidate still crossing `PlanValidator`, with provenance richer than the single `'jig-validated'`
  literal.
- **Phase 9 — Records-integrity.** Tamper-evidence over the launch header + plan/policy snapshots and
  the active `resume-blocked-missing-approval` re-approval path — sequenced after P6 because the real
  trust anchor arrives with real providers.

P7 and P8 are swappable; P7 is placed first because a real `done → landed` is the natural next
increment after a real driver produces real work. Full ID-bearing acceptance criteria, evidence,
stops, and non-goals for each phase live in [`phases.md`](./phases.md). The
[repo plan](./repo-plan-m7.md) is the org handoff.

## The two load-bearing residuals

- **Residual A — resume attestation persist/recover (Phase 6).** Today the launch-captured
  `CapabilityAttestation` is **not** persisted across resume; resume reconstructs a _constant_
  reference-host attestation — safe only because the reference host does not drift. A real driver
  that can drift or self-widen needs true persist-and-recover, parallel to the Phase-4 binding
  mechanism ([ADR 0020](../../../design/decisions/0020-phase-4-reliable-local-runs.md) §3), so resumed
  work is adjudicated against the launch-attested capability. It is an explicit P6 acceptance
  criterion (P6-AC-5).
- **Residual B — the `LandingRequest.action` union (Phase 7).**
  [`../../../src/ports.ts`](../../../../src/ports.ts) now types `action` as the union
  `'push' | 'open-pr' | 'merge'`, so the real Forge path can discriminate actions. This was the
  explicit P7 acceptance criterion (P7-AC-2); the track keeps it here as closeout context rather than
  open debt.

## Source boundaries

This track derives only from org M7 plus jig's product commitments and design status/contracts. It
does not invent product or design facts. Per the delivery Planning Rules
([`../README.md`](../README.md)):

- The execution-plan and observability-records v0 contracts stay cited and **unfrozen**; contract
  freeze is design/contract-owner-owned and is a checkpoint (see [`phases.md`](./phases.md) "Beyond
  this track"), not a phase.
- No TypeScript interfaces, JSON Schema, provider manifests, package layout, exports, or runtime code
  are introduced **from delivery planning**. The **real as-merged port shapes** are cited from
  [`../../../src/ports.ts`](../../../../src/ports.ts) and
  [`../../../src/bootstrap.ts`](../../../../src/bootstrap.ts) as fixed inputs, not redesigned. The one
  provider manifest in scope — the Phase-6 **substrate manifest** — is introduced by the **design**
  layer ([ADR 0022](../../../design/decisions/0022-phase-6-real-driver-integration.md) Decision 7), a
  non-normative fixture with no schema freeze; this track only references it, which keeps the
  delivery-planning rule intact.
- `docs/design/**` is referenced, never edited from here.
- Wave 5 red-team findings ride as stop conditions (substrate trust is not code trust; attested
  isolation must be proven, not declared; real landing must be idempotent).
- Phase names are client-usable increments, not internal proof-surface names.

## Links

- [Phase details](./phases.md) — Phases 6-9, ID-bearing acceptance criteria, evidence, stops,
  non-goals, and the checkpoints/tail.
- [Repo plan for M7](./repo-plan-m7.md) — the org derivation handoff (what jig owns, consumes, must
  not decide, and the open questions routed back to the org roadmap).
- Org milestone: `.github/MILESTONES.md`, "M7: Real Provider Integration".
- EVRUN-partial evidence:
  [`../../design/evidence/2026-07-04-evrun-partial-smoke.md`](../../../design/evidence/2026-07-04-evrun-partial-smoke.md).
- Predecessor track: [`../m5b-local-mvp-r2/`](../m5b-local-mvp-r2/README.md) — the live local-MVP
  track whose provider tail this track replaces.
- Merged P5 seams: [`../../../src/ports.ts`](../../../../src/ports.ts),
  [`../../../src/bootstrap.ts`](../../../../src/bootstrap.ts) (commit `f59a479`);
  [ADR 0021](../../../design/decisions/0021-phase-5-integrated-provider-runs.md).
- Product: [`../../product/jig.md`](../../../product/jig.md),
  [`../../product/guarantees.md`](../../../product/guarantees.md).
- Design: [`../../design/README.md`](../../../design/README.md),
  [`../../design/contracts/providers.md`](../../../design/contracts/providers.md).
