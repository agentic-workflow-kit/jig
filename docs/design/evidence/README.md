---
title: "Evidence — committed design inputs"
status: index — evidence records
---

# Evidence — committed design inputs

This directory holds committed evidence records used as inputs to design decisions. Records here
are durable, citable Markdown artifacts, not local run output. Local runtime data under `runs/`
remains git-ignored.

Records follow the evidence appendix convention in
[`../conventions.md`](../conventions.md#6-evidence-appendix-convention-committed-records-are-inputs-to-decisions-not-authority):
dated filename and header, exact external tool versions, hashes for captured transcripts or outputs
where applicable, a required `Limitations` section, redaction status, and citations to the AC,
guarantee, invariant, or decision IDs the evidence supports.

## Records

| Date       | Record                                                                                                                      | Purpose                                                                                                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-04 | [N1A-P01/P02/P03 app-server surface, readiness, and parentage](./2026-07-04-n1a-p01-p02-p03-surface-readiness-parentage.md) | Codex app-server schema, stdio readiness, managed-daemon availability, and owned-process parentage evidence for N1b.                                                                     |
| 2026-07-04 | [N1A-P04/P05 turn lifecycle and tool events](./2026-07-04-n1a-p04-p05-turn-lifecycle-tool-events.md)                        | Basic harmless turn lifecycle and structured command execution event evidence for N1b.                                                                                                   |
| 2026-07-04 | [N1A-P06/P07 approval relay and denial](./2026-07-04-n1a-p06-p07-approval-denial.md)                                        | Structured approval request, accept, decline, and denial-state evidence for N1b.                                                                                                         |
| 2026-07-04 | [N1A-P08 interrupt delivery](./2026-07-04-n1a-p08-interrupt.md)                                                             | Active-turn interrupt request and terminal interrupted-state evidence for N1b.                                                                                                           |
| 2026-07-04 | [N1A-P09/P10 busy behavior and cleanup](./2026-07-04-n1a-p09-p10-busy-cleanup.md)                                           | Overlapping turn-start behavior, malformed request handling, and restart cleanup evidence for N1b.                                                                                       |
| 2026-07-04 | [N1A-P11/P12 resume and durability](./2026-07-04-n1a-p11-p12-resume-durability.md)                                          | Persistent thread resume and durable app-server session-state evidence for N1b.                                                                                                          |
| 2026-07-04 | [EVRUN partial real-provider smoke evidence](./2026-07-04-evrun-partial-smoke.md)                                           | Applied evidence for one `work-source -> forge -> records-integrity` smoke run against the disposable sandbox, with a scripted/injected agent leg and explicit EVRUN-full limitations.   |
| 2026-07-06 | [EVRUN-full capture attempt](./2026-07-06-evrun-full-capture-attempt.md)                                                    | P11 capture attempt showing successful narrow Codex app-server and real-host smokes, plus the exact missing-prerequisite blocker that kept the combined smoke unproven at that point.    |
| 2026-07-06 | [EVRUN-full combined smoke](./2026-07-06-evrun-full-smoke.md)                                                               | Successful combined GitHub Issues -> real Codex app-server -> real host -> GitHub Forge `open-pr` -> records-integrity smoke, with stronger no-phone-home/idempotency probes still open. |
| 2026-07-06 | [P05 real Forge smoke rerun](./2026-07-06-p05-real-forge-smoke-rerun.md)                                                    | Current-checkout rerun of the real GitHub Issues -> GitHub Forge `open-pr` smoke against the disposable sandbox, with records integrity verified and explicit MERGE-5 limitations.       |

## N1a deferred probes

- `N1A-P13` was not attempted. It was Tier 3 / lowest priority for this capture, and no natural
  opportunity arose during the Tier 1 / Tier 2 app-server session capture to observe prompt-size or
  bounded-context behavior. It remains an open probe for a future N1a follow-up if N1b needs that
  input.
- `N1A-P14` is explicitly out of scope for this capture. The capture ran on macOS only, and no
  Windows / Git Bash host was available. Per the N1a plan, Windows support is therefore not proven;
  any transport decision that wants to claim cross-platform cleanup must gate on running P14
  separately.

## EVRUN evidence boundary

The EVRUN-partial record was enough for the org M7 exit decision, but it is not EVRUN-full. The
2026-07-06 P11 capture attempt records the original missing-prerequisite blocker. The later
2026-07-06 EVRUN-full combined smoke proves the combined real Codex, real GitHub, real
execution-host, records-integrity, and redaction path for an operator-initiated disposable
`open-pr` run. Strong adversarial no-phone-home evidence, multi-run idempotency against a repeated
real effect, hosted/remote operation, and Windows behavior remain unproven.
