---
title: "2026-07-04 - N1A-P06/P07 approval relay and denial"
status: captured - N1a evidence
date: 2026-07-04
---

# 2026-07-04 - N1A-P06/P07 approval relay and denial

## Header

| Field                | Value                                                                              |
| -------------------- | ---------------------------------------------------------------------------------- |
| ISO date             | 2026-07-04                                                                         |
| Probe IDs            | N1A-P06, N1A-P07                                                                   |
| Probe titles         | Approval request relay; denial and park mapping                                    |
| Author/runner        | codex implementer, N1a capture session                                             |
| Target host OS       | macOS 26.5.1, arm64; app-server reported `platformFamily=unix`, `platformOs=macos` |
| Target Codex version | `codex-cli 0.142.5`; app-server `userAgent` reported `n1a-probe/0.142.5`           |

Grouped record: approval and denial used the same non-destructive request shape, once answered
`accept` and once answered `decline`.

## Supports

- N1A-P06: captures approval request relay, decision response, and same-turn resume.
- N1A-P07: captures denial result, command item state, and final turn behavior.
- Feeds the N1b transport ADR and R3 by showing whether approval is a live session-observable
  channel or only terminal UI.

## Method

1. Started two independent app-server stdio sessions through the probe harness.
2. For each, started an ephemeral read-only thread in a disposable temp workspace with
   `approvalPolicy=on-request` and `approvalsReviewer=user`.
3. Prompted Codex to run a harmless local write in the disposable workspace:
   `printf n1a-approval-probe > approval-result.txt`.
4. In the P06 run, the harness replied to the server request with `decision=accept`.
5. In the P07 run, the harness replied to the server request with `decision=decline`.
6. Waited for terminal turn state in both runs.

## Captured material

| Artifact                                                  | SHA-256                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/design/evidence/raw/n1a/p06-approval-accept.jsonl`  | `febb8818fff16b87aa284de9e0268bc53abf747c4f6ca51cc20edd6a24c55a3a` |
| `docs/design/evidence/raw/n1a/p07-approval-decline.jsonl` | `46c4b962210557c32774438324727b3b64a0978921e959dc47f392953ab275b0` |

## Result

The approval request was delivered as structured JSON-RPC server request
`item/commandExecution/requestApproval`. It included a correlated thread ID, turn ID, item ID,
environment ID, command, cwd, reason, command actions, proposed exec policy amendment, and available
decisions. While waiting, the thread status included `activeFlags=["waitingOnApproval"]`.

For P06, the harness response `{ "decision": "accept" }` resumed the same turn. The command item
completed with `status=completed` and `exitCode=0`, and the turn completed with `status=completed`.

For P07, the harness response `{ "decision": "decline" }` resumed the same turn. The command item
completed with `status=declined`, no process ID, and no exit code. The app-server stderr included a
structured rejection message for the command path. The overall turn later completed with
`status=completed`; the denial was explicit at the command item level, not as a terminal denied turn
state.

## Limitations

This proves command-execution approval relay for one local shell command. It does not prove file
change approval, network approval, MCP elicitation, or every decision value. The denial behavior is
not a direct jig park state: the denied command is explicit, but the turn can still finish
`completed`.

## Redaction

Redaction was applied. The raw captures replace local paths, local host identifiers,
thread/session/turn/item/environment IDs, account rate-limit snapshots, and auth-like fields with
placeholders. No unresolved redaction ambiguity remains in this record.

## Decision input

N1b should treat app-server approval as a structured bidirectional channel that can carry request
and decision correlation. For denial mapping, N1b should not assume the whole turn becomes denied or
parked; the stable denied signal observed here is on the command execution item.
