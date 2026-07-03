---
title: "M5b feature inventory (r2)"
status: active
---

# M5b feature inventory (r2)

Priority is a client-value planning signal, not a schema, package, or tracker.

- **Delivered** — shipped in Phases 0–2 (see the archived track for the original inventory).
- **P0** — required before new feature work (remediation) or for the next usable milestone.
- **P1** — makes the local MVP genuinely governable and useful.
- **P2** — reliability, safety, recovery, provider maturity, and hardening.
- **P3** — later integrations, dashboards, Learning-loop, analyzers, and polish.

## Delivered (Phases 0–2 + toolchain)

| Feature                                       | Delivered in                   | Notes                                                         |
| --------------------------------------------- | ------------------------------ | ------------------------------------------------------------- |
| Repo delivery foundation                      | Phase 0 (PR #14)               | Fixtures, conventions, `delivery:check`                       |
| `jig run <plan>` CLI                          | Phase 1 (PR #15)               | Local dry-run only                                            |
| Plan validation / invalid-plan rejection      | Phase 1 (PR #15)               | Path-safety pattern fix pending (Phase R)                     |
| Simple config + simple local policy           | Phase 1 (PR #15)               | Policy is a boolean gate — ADR 0018; fence arrives in Phase 3 |
| Scripted-worker stub + dry-run harness        | Phase 1 (PR #15)               |                                                               |
| Local run records (`run.json`/`events.jsonl`) | Phase 1 (PR #15)               | Identity/vocabulary convergence pending (Phase R, ADR 0017)   |
| Human-readable summary + failure capture      | Phase 1 (PR #15)               |                                                               |
| Multi-item plans + dependency blocking        | Phase 2 (PR #16)               |                                                               |
| `jig inspect <run>`                           | Phase 2 (PR #16)               | Replay-based inspect pending (Phase 4)                        |
| Changed-files capture                         | Phase 2 (PR #16)               |                                                               |
| Typed engine + enforced coverage gate         | Toolchain remediation (PR #19) | Closes the org-M5 check-growth criterion                      |

## Remaining

| Feature                                                                       | Client value                                                                 | Priority | Delivery placement                 |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------: | ---------------------------------- |
| Records-contract convergence (ADR 0017)                                       | Records downstream tools can trust: real run identity, actor, stop reasons.  |       P0 | Phase R                            |
| Evidence gate value/shape check                                               | A worker cannot self-report success past the evidence.                       |       P0 | Phase R                            |
| Golden run-record integration tests                                           | Record-shape drift fails CI instead of sailing through.                      |       P0 | Phase R                            |
| Fail-closed CLI flags                                                         | No silently permissive fixture defaults on the product surface.              |       P0 | Phase R                            |
| Safety fixes (path regex, run-dir collision, fixture hygiene, privilege test) | Contained correctness debt paid before new seams.                            |       P0 | Phase R                            |
| Plan preview (`jig preview`)                                                  | See what a run would do before committing to it.                             |       P1 | Phase 3                            |
| Grant / deny / route authorization (fence)                                    | Policy that actually adjudicates each request.                               |       P1 | Phase 3                            |
| Minimal local approval prompt                                                 | Approve or reject routed local actions.                                      |       P1 | Phase 3                            |
| Decision records                                                              | Policy and approval decisions as inspectable evidence.                       |       P1 | Phase 3                            |
| Rule-governing change guard                                                   | Work cannot change its own rules without approval.                           |       P1 | Phase 3                            |
| Canonical §15 golden fixture                                                  | The triad evidenced end-to-end in one asserted artifact.                     |       P1 | Phase 3                            |
| Resume after stop/failure                                                     | Continue interrupted work safely.                                            |       P2 | Phase 4                            |
| No-double-effect recovery proof                                               | Irreversible effects never repeat.                                           |       P2 | Phase 4                            |
| Replay-based inspect (projections)                                            | Crashed runs stay inspectable from the event log.                            |       P2 | Phase 4                            |
| Stop/notice/resume causality                                                  | Recovery and diagnosis reconstructible.                                      |       P2 | Phase 4                            |
| Redaction/export posture                                                      | Safer diagnostics and sharing.                                               |       P2 | Phase 4                            |
| Workspace continuity on resume                                                | No silent execution-environment drift.                                       |       P2 | Phase 4                            |
| Provider ports + composition root (4 seams)                                   | Drivers plug in behind swappable ports; core depends on ports, not adapters. |       P2 | Phase 5 (ADR 0021)                 |
| Provider conformance suite + manifest                                         | A driver is proven before it is trusted; scope is declared, not assumed.     |       P2 | Phase 5 (ADR 0021)                 |
| Capability attestation (Fence input)                                          | Autonomy follows fresh, core-judged proof; a claim never unlocks by itself.  |       P2 | Phase 5 (ADR 0021)                 |
| Execution-host proof model + isolation catalog (reference)                    | Self-report is distinguished from confinement proof; honest SEC-2 posture.   |       P2 | Phase 5 (ADR 0021)                 |
| Runner-invoked Forge seam (modeled) + Work-source seam (reference)            | Landing stays runner-owned; source candidates cross plan intake.             |       P2 | Phase 5 (ADR 0021)                 |
| Resume attestation persist/recover                                            | Resume detects real-driver attestation drift instead of re-deriving it.      |       P2 | Phase 6+                           |
| Real agent + real execution host driver                                       | Move beyond the scripted stub with genuine containment.                      |       P2 | Phase 6                            |
| Forge/GitHub landing (real push/PR/merge)                                     | PR and merge workflows through runner-owned authority.                       |    P2/P3 | Phase 6+                           |
| Work-source integrations (real import/sync)                                   | Import candidates from issue trackers or other sources.                      |       P3 | Phase 6+                           |
| Record/snapshot tamper-evidence                                               | Recorded rules cannot be silently altered between stop and resume.           |       P2 | Records-integrity (post-Phase 5)   |
| TUI/dashboard                                                                 | Live visibility for repeated operator use.                                   |       P3 | Phase 6+                           |
| Learning loop                                                                 | Run records become hardening recommendations.                                |       P3 | After representative records exist |
| Policy analyzer                                                               | Tune policy strictness and noise from run history.                           |       P3 | Later                              |

## Inventory notes

- Phase R is deliberately feature-free: it converts review findings MF2/MF3/MF5 and
  S1/S2/S5/S6 plus ADR 0017 into code and tests, so Phase 3's decision records land on seams
  that hold.
- P1 makes the local runner governable (the fence, preview, approvals) — the org-M5 heart.
- The P0/P1 rows above (records convergence, evidence gate, fence, preview, approvals, decision
  records, resume, replay inspect, redaction, workspace continuity) have since delivered in Phases R,
  3, and 4 — see the [README delivered list](./README.md); they are kept here as the value trace.
- **Re-triaged after Phase 4 (ADR 0021):** the r1 Phase 5 bucket is split. Phase 5 now covers the
  provider **ports + conformance + reference adapters + capability attestation** (the seam machinery);
  **real** drivers, real Forge/GitHub landing, real work-source, tamper-evidence, and the TUI move to
  Phase 6+, as reflected in the placements above and in [`phases.md`](./phases.md).
