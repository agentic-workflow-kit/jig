---
title: "2026-07-04 - N1A-P11/P12 resume and durability"
status: captured - N1a evidence
date: 2026-07-04
---

# 2026-07-04 - N1A-P11/P12 resume and durability

## Header

| Field                | Value                                                                              |
| -------------------- | ---------------------------------------------------------------------------------- |
| ISO date             | 2026-07-04                                                                         |
| Probe IDs            | N1A-P11, N1A-P12                                                                   |
| Probe titles         | Persistent thread and session resume; job-state and log durability                 |
| Author/runner        | codex implementer, N1a capture session                                             |
| Target host OS       | macOS 26.5.1, arm64; app-server reported `platformFamily=unix`, `platformOs=macos` |
| Target Codex version | `codex-cli 0.142.5`; app-server `userAgent` reported `n1a-probe/0.142.5`           |

Grouped record: the resume probe necessarily exercises durable thread state by closing one
app-server process, starting another, and resuming by thread ID.

## Supports

- N1A-P11: captures persistent thread creation, app-server restart, `thread/resume`, and continuity.
- N1A-P12: captures that resumed thread state includes a persisted redacted session path and prior
  turn items.
- Feeds the N1b transport ADR and R3 by showing whether thread continuity is an observable session
  behavior.

## Method

1. Started a first app-server stdio process and initialized it.
2. Started a non-ephemeral thread in a disposable temp workspace.
3. Sent a first prompt asking Codex to remember `N1A-RESUME-MARKER-20260704` and reply `ACK`.
4. Waited for completion, then closed the first app-server process.
5. Started a second app-server stdio process and initialized it.
6. Called `thread/resume` with the prior thread ID and the same disposable workspace.
7. Sent a second prompt asking for the remembered marker.
8. Waited for terminal state.

## Captured material

| Artifact                                               | SHA-256                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `docs/design/evidence/raw/n1a/p11-resume-first.jsonl`  | `243a4e5bdbda302b4a356bab0b294f43cd729fa8a3bac68298bcf4abfd32de59` |
| `docs/design/evidence/raw/n1a/p11-resume-second.jsonl` | `d945c7cd2aba975ba7b79c81a3e4bfbb1153cfd56a949f0078f58bc4b4b909f3` |

## Result

The first app-server process created a non-ephemeral thread and completed the first turn with the
assistant response `ACK`. The second app-server process accepted `thread/resume` for the redacted
same thread ID. The resume response included the prior completed turn in `turns`, a redacted
Codex-home session path, and a redacted cwd. The second turn answered
`N1A-RESUME-MARKER-20260704` and completed with `status=completed`.

## Limitations

This proves resume continuity for one non-ephemeral thread on this host, using the same local Codex
home and disposable workspace. It does not prove cross-host resume, long-term retention, corruption
handling, or whether the persisted Codex session file is a stable public contract. The durable path
is observed only as a redacted app-server field, not inspected directly.

## Redaction

Redaction was applied. The raw captures replace the local Codex-home session path, local temp paths,
local host identifiers, thread/session/turn/item IDs, account rate-limit snapshots, and auth-like
fields with placeholders. No unresolved redaction ambiguity remains in this record.

## Decision input

N1b should treat resume as an explicit, correlated app-server behavior that survives app-server
process restart. That is evidence for a session-observable transport shape if jig needs to expose
resume or durable thread correlation beyond one-shot final results.
