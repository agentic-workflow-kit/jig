---
title: Jig — design decisions
status: draft — design layer
---

# Jig — design decisions

This is jig's running design decision log: one ADR per decision, in the order made. It is seeded
from the M5a local-MVP design slice (M5a's own decisions, plus the round-2 adversarial review's
dispositions) and grows as new design decisions are made.

**How to read this index.** Each group below is one authoring period. The **Gloss** column is a
plain-language one-liner for titles that lean on internal shorthand (`S-00n`, `INV-nnn`, `ISO-n`,
`SURF-nnn`); it restates the ADR's own title/decision, it does not reinterpret it — read the ADR
itself for the binding text. The **Date** column is read from each ADR's own trailing
`- Date:` line; ADRs 0001–0025 carry one, ADRs 0026–0031 do not yet, so those cells are left
blank rather than guessed. **Status** is uniformly `applied` across all 31 ADRs today — see
["What 'applied' means here"](#what-applied-means-here) below before reading it as "shipped in
code."

## What "applied" means here

Every ADR in this log is marked `applied`, but the ADRs themselves are explicit that this means
**the decision is settled and binding on the implementation that follows**, not necessarily
"already running in production code." Several ADRs are self-described as docs-only closures for
work that had not yet landed when the ADR was written — for example
[ADR 0021](./0021-phase-5-integrated-provider-runs.md) ("nothing here … ships a real driver"),
[ADR 0022](./0022-phase-6-real-driver-integration.md) ("this ADR is docs-only; the real drivers
land in the Phase-6 implementation cycle"), and the same pattern in ADRs 0023–0025 and 0027–0028.
`applied` is not fabricated signal here — it is kept as the one status every ADR itself claims —
but it is worth reading as "this decision has taken effect as design," with each ADR's own
"Consequences"/"Contract and records posture" section stating exactly what it does and does not
authorize yet.

## Canonical invariant ledger

The canonical `INV-001..018` invariant ledger lives in
[`../notes/runtime-design-m5a.md`](../notes/runtime-design-m5a.md), not in this folder or in
`evidence/`. See [`../notes/README.md`](../notes/README.md#the-archival-vs-canonical-ledger-tension)
for why it lives there and the open question about relocating it.

## M5a seed decisions (0001–0012)

The M5a dry-run design slice: worker/policy posture, the reuse-trail discipline, the seven
handoff-readiness fixes (`S-001`..`S-007`) exercised against the canonical fixture, and the
neutral "work item" term.

| #    | Title                                                             | Gloss                                                                                              | Date       | Status  |
| ---- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------- | ------- |
| 0001 | Worker posture: scripted-worker stub (modeled evidence)           | The dry-run agent seam is a scripted stub with modeled evidence, not a real worker                 | 2026-07-01 | applied |
| 0002 | Minimum policy posture: assisted (CFG-10 fixed category)          | v0's minimum policy posture is "assisted," with CFG-10's fixed authorization-category boundary     | 2026-07-01 | applied |
| 0003 | Handoff consumer reframed to jig's own M5b implementation         | The design handoff targets jig's own M5b build, not a separate planning-layer consumer             | 2026-07-01 | applied |
| 0004 | Reference-only reuse trail: cite inline + reuse log               | Prior-art (workflow-kit) lessons are cited inline and logged, never ported as architecture         | 2026-07-01 | applied |
| 0005 | S-001 eligibility/DAG exercised; dry-run rule = strict ISO-1 hold | Dependency eligibility is genuinely exercised; a dependent is held until its prerequisite lands    | 2026-07-01 | applied |
| 0006 | S-002 blocked / ISO-3 downstream halt exercised                   | The `blocked` state and its downstream halt are exercised in the canonical fixture                 | 2026-07-01 | applied |
| 0007 | S-003 INV-004 honesty + mergeability field                        | The done-vs-landed distinction (mergeability) is stated honestly rather than silently omitted      | 2026-07-01 | applied |
| 0008 | S-004 `denied` in the canonical fixture                           | The canonical fixture evidences the full request → granted/denied/routed triad, including `denied` | 2026-07-01 | applied |
| 0009 | S-005 escape SURF union-type pipes                                | Escape raw `\|` characters in the handoff summary's union-type fields so the table doesn't break   | 2026-07-01 | applied |
| 0010 | S-006 ENF-004 proof row                                           | Add the missing ENF-004 enforcement-map proof row to the handoff summary                           | 2026-07-01 | applied |
| 0011 | S-007 per-DEL VAL/STOP references                                 | Give each deliverable (`DEL-*`) its own validation/stop references, per the handoff contract       | 2026-07-01 | applied |
| 0012 | Neutral unit term: work item                                      | The design layer uses the neutral term "work item" instead of product's "story"                    | 2026-07-01 | applied |

## Design-layer restructure (0013–0017)

Folder/entity restructuring of the design layer itself: the core-vs-contracts cut, naming the
operator surface and bootstrap as core concerns, the stub-first scaffold decision, and the
records-seam vocabulary reconciliation against the M5b implementation.

| #    | Title                                                                  | Gloss                                                                                                                         | Date       | Status  |
| ---- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------- | ------- |
| 0013 | Design layer organised by fixed logic vs. edge interfaces              | Design folders split into `core/` (fixed logic) and `contracts/` (edge interfaces), replacing the earlier `runtime/` grouping | 2026-07-01 | applied |
| 0014 | Operator surface is a named jig-core entity                            | The CLI/MCP/SDK entry point is promoted to a named core entity instead of an implicit edge                                    | 2026-07-01 | applied |
| 0015 | Bootstrap/init is a distinct core concern                              | Launch/composition (bootstrap) is recognized as its own core concern, not folded into another file                            | 2026-07-01 | applied |
| 0016 | Stub-first scaffold; preserve the M5a record rather than distribute it | Design docs start as short stubs; the dense M5a record is preserved as an archival source to mine later                       | 2026-07-01 | applied |
| 0017 | Records-seam reconciliation: v0 implementation vocabulary and identity | Reconciles the M5b implementation's drifted records vocabulary/run identity back to the design's closed vocabulary            | 2026-07-02 | applied |

## Phase series (0018–0025)

One ADR per delivery phase, settling the concrete implementation choices each phase would
otherwise have to invent: local governance (Phase 2–4), the four provider seams going from
reference to real (Phase 5–8), and records tamper-evidence (Phase 9).

| #    | Title                                                                                                                                                                | Gloss                                                                                                                                                                                        | Date       | Status  |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------- |
| 0018 | Phase-2 policy gate is a recorded simplification of the assisted posture                                                                                             | The Phase 2 single-boolean policy gate is a named walking-skeleton simplification, not a supersession of ADR 0002                                                                            | 2026-07-02 | applied |
| 0019 | Phase 3 local governance scope                                                                                                                                       | Fixes Phase 3's concrete choices: the preview surface, the MVP request-category map, local Doorbell UX, and owner-decision vocabulary                                                        | 2026-07-02 | applied |
| 0020 | Phase 4 reliable local runs: replay, resume, no-double-effect, redaction, workspace                                                                                  | Settles replay/inspect, resume, checkpoint semantics, no-double-effect, workspace continuity, and redaction posture                                                                          | 2026-07-02 | applied |
| 0021 | Phase 5 integrated provider runs: the four ports, the conformance harness, reference adapters                                                                        | Introduces the four provider ports, the composition root, capability attestation, and the conformance suite — reference adapters only, no real drivers yet                                   | 2026-07-03 | applied |
| 0022 | Phase 6 real-driver integration: the 6a/6b split, the real agent driver, proven confinement, substrate authorization                                                 | First real drivers: a real agent at `weak` isolation (6a), then a real execution host with proven `strong` confinement (6b), plus substrate authorization and resume-attestation persistence | 2026-07-03 | applied |
| 0023 | Phase 7 real Forge/GitHub landing: the runner-owned real landing seam, the action union, real-effect idempotency, PR-side block surfacing, landing-path redaction    | Real push/PR/merge lands through the runner-owned Forge seam, with real-effect idempotency, PR-side block surfacing, and landing-path redaction                                              | 2026-07-03 | applied |
| 0024 | Phase 8 real work-source integration: the seed-vs-candidate intake chokepoint, richer provenance, and the two-authorities crossing                                   | Real work-source importers must cross a single validated intake chokepoint; provenance is enriched without the source becoming a second scheduling authority                                 | 2026-07-04 | applied |
| 0025 | Phase 9 records-integrity: sidecar tamper-evidence, active resume-blocked-missing-approval, the tamper-vs-changed-basis split, and the resume driver-binding fold-in | Adds sidecar tamper-evidence (an env-keyed HMAC) over run records and activates the resume re-approval gate for safety-relevant changes                                                      | 2026-07-04 | applied |

## Posture decisions (0026–0031)

Cross-cutting posture settled after the phase series: what a green conformance run does and does
not prove, the packaging/SDK boundary, the Codex transport seam, guided setup, observation
surfaces, and durable control records.

| #    | Title                                                                   | Gloss                                                                                                                                                 | Date | Status  |
| ---- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------- |
| 0026 | Conformance self-report-only basis and controlled-double adequacy bar   | Names "self-report-only" as a conformance-verdict basis; a green mock/controlled-double suite never proves real-provider truth                        | —    | applied |
| 0027 | Packaging and SDK boundary                                              | Settles the three-package target (`jig-sdk` / `jig-cli` / `jig-testkit`) and what each package may and must not depend on                             | —    | applied |
| 0028 | Codex app-server transport and session-observable adapter seam          | Picks the owned stdio Codex app-server transport and widens the internal adapter to a session-observable seam behind the unchanged public `AgentPort` | —    | applied |
| 0029 | Guided setup is a configuration operation                               | Places `jig setup` as a first-party configuration operation that emits validated artifacts, not as an operator-control verb                           | —    | applied |
| 0030 | Observation surfaces are operator projections with owner notice records | Places `watch` and `ask-why` on the operator port and acknowledge/snooze as additive owner notice records                                             | —    | applied |
| 0031 | Owner decisions and stops are durable control records                   | Places `decide` and `stop` on the operator port as additive control records consumed by existing replay/resume semantics                              | —    | applied |

## Open questions

- **ADRs 0026–0031 carry no `- Date:` line.** Every ADR from 0001–0025 has one; 0026–0031 do not.
  Rather than invent a date, the Date column is left blank for those six. Whether to add a
  `- Date:` line to 0026–0031 (and, if so, what date to use — authoring date vs. merge date) is a
  genuine decision about this log's own convention and is not resolved here.
