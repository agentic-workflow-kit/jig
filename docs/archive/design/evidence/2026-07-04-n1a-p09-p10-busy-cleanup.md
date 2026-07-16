---
title: "2026-07-04 - N1A-P09/P10 busy behavior and cleanup"
status: captured - N1a evidence
date: 2026-07-04
---

# 2026-07-04 - N1A-P09/P10 busy behavior and cleanup

## Header

| Field                | Value                                                                              |
| -------------------- | ---------------------------------------------------------------------------------- |
| ISO date             | 2026-07-04                                                                         |
| Probe IDs            | N1A-P09, N1A-P10                                                                   |
| Probe titles         | Broker busy and serialization behavior; cleanup on failed turn or broker failure   |
| Author/runner        | codex implementer, N1a capture session                                             |
| Target host OS       | macOS 26.5.1, arm64; app-server reported `platformFamily=unix`, `platformOs=macos` |
| Target Codex version | `codex-cli 0.142.5`; app-server `userAgent` reported `n1a-probe/0.142.5`           |

Grouped record: the busy probe and malformed-request cleanup probe both test app-server behavior at
lifecycle edges after a valid initialization.

## Supports

- N1A-P09: captures overlapping turn-start behavior against the same app-server thread.
- N1A-P10: captures malformed request handling, process status before/after, and subsequent restart
  readiness.
- Feeds the N1b transport ADR by identifying lifecycle edge cases a transport adapter must handle.

## Method

1. For P09, started one thread and sent a long-running harmless turn prompt (`sleep 10`), then
   immediately sent a second `turn/start` on the same thread asking for `N1A-BUSY-SECOND`.
2. For P10, initialized a separate app-server process, captured a `ps` snapshot, sent unsupported
   method `n1a/unsupported-method`, captured a second `ps` snapshot, closed the server, then started
   and initialized a fresh app-server process.

## Captured material

| Artifact                                                 | SHA-256                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/design/evidence/raw/n1a/p09-busy.jsonl`            | `c2e24bd673cfb4ad5eb1a7e82d25d5d900b8fd7437b4d171a143a85c2b5421a2` |
| `docs/design/evidence/raw/n1a/p10-cleanup.jsonl`         | `cd5de0eb1d397a9dc0fc42e7279dad26e31cb05f026253d16037e16ba7f584aa` |
| `docs/design/evidence/raw/n1a/p10-cleanup-restart.jsonl` | `3a1d76f175ba82003aa55d13b1c732d1d546437b3dea7433c5b4ef2bef7f4342` |

## Result

For P09, the second overlapping `turn/start` returned a structured response with a new turn object,
but subsequent streamed user-message and final assistant-message events were attributed to the first
active turn ID. The final assistant message was `N1A-BUSY-SECOND`, and the observed
`turn/completed` terminal state was for the first turn with `status=completed`. No explicit
busy/queued/rejected status was observed.

For P10, the unsupported method returned a structured JSON-RPC error with code `-32600` and an
allowed-methods message. The process remained alive after the malformed request. After the harness
closed that process, a fresh app-server initialized successfully.

The P10 `ps` snapshots captured PID, PPID, PGID, session, state, and command for the owned
app-server process before and after the malformed request.

## Limitations

P09 is captured with caveats: the observed behavior was not an explicit busy state, and event
attribution for overlapping turns is not straightforward. This single run does not prove whether
overlap is intentionally serialized, folded into the active turn, or subject to race behavior. P10
uses a malformed request, not a failed model/tool turn or forced broker kill, so it proves only that
one protocol error did not poison subsequent stdio app-server startup.

## Redaction

Redaction was applied. The raw captures replace local paths, local host identifiers,
thread/session/turn/item IDs, account rate-limit snapshots, and auth-like fields with placeholders.
No unresolved redaction ambiguity remains in this record.

## Decision input

N1b should not rely on an explicit app-server busy signal from this evidence. A transport adapter
would need to serialize turns itself or further specify overlap behavior. The malformed-request
cleanup evidence is positive for process reuse/restart after one protocol error, but not sufficient
for broad cleanup guarantees.
