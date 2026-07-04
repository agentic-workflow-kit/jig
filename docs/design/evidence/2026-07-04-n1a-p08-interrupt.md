---
title: "2026-07-04 - N1A-P08 interrupt delivery"
status: captured - N1a evidence
date: 2026-07-04
---

# 2026-07-04 - N1A-P08 interrupt delivery

## Header

| Field                | Value                                                                              |
| -------------------- | ---------------------------------------------------------------------------------- |
| ISO date             | 2026-07-04                                                                         |
| Probe ID             | N1A-P08                                                                            |
| Probe title          | Interrupt or cancel delivery                                                       |
| Author/runner        | codex implementer, N1a capture session                                             |
| Target host OS       | macOS 26.5.1, arm64; app-server reported `platformFamily=unix`, `platformOs=macos` |
| Target Codex version | `codex-cli 0.142.5`; app-server `userAgent` reported `n1a-probe/0.142.5`           |

## Supports

- N1A-P08: captures interrupt request delivery to an owned active turn.
- Feeds the N1b transport ADR and R3 by showing whether live steering/cancel requires an observable
  session shape beyond one-shot `run(story)`.

## Method

1. Started `codex app-server --listen stdio://` through the probe harness.
2. Started an ephemeral thread in a disposable temp workspace.
3. Sent a harmless long-running prompt: run `sleep 30` and then reply with a marker.
4. After approximately three seconds, sent `turn/interrupt` with the active thread ID and turn ID.
5. Waited for terminal turn state.

## Captured material

| Artifact                                           | SHA-256                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/design/evidence/raw/n1a/p08-interrupt.jsonl` | `b886b7ddb56d7808c838353477775f35e13e89a753ce17ec125b30698cc1d98b` |

## Result

The app-server accepted `turn/interrupt` for the active turn. The thread status changed back to
idle, and `turn/completed` reported the same turn with `status=interrupted`, no error, and a
duration of about three seconds. The prompt marker that would have followed `sleep 30` was not
emitted.

## Limitations

This proves interrupt delivery for a turn before the model emitted or started the `sleep 30` command
in this run. It does not prove interruption of an already running subprocess, forced process-tree
termination, or cancellation behavior for every tool type.

## Redaction

Redaction was applied. The raw capture replaces local paths, local host identifiers,
thread/session/turn/item IDs, account rate-limit snapshots, and auth-like fields with placeholders.
No unresolved redaction ambiguity remains in this record.

## Decision input

N1b should treat app-server interrupt as a real structured control path with a terminal
`interrupted` turn state in this scenario. If jig wants to use this during worker execution, that is
evidence for a session-observable shape rather than only a final-result promise.
