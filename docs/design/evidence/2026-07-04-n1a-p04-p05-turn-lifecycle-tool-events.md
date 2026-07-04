---
title: "2026-07-04 - N1A-P04/P05 turn lifecycle and tool events"
status: captured - N1a evidence
date: 2026-07-04
---

# 2026-07-04 - N1A-P04/P05 turn lifecycle and tool events

## Header

| Field                | Value                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------- |
| ISO date             | 2026-07-04                                                                             |
| Probe IDs            | N1A-P04, N1A-P05                                                                       |
| Probe titles         | Basic turn lifecycle status and result; structured tool-exit and command-result events |
| Author/runner        | codex implementer, N1a capture session                                                 |
| Target host OS       | macOS 26.5.1, arm64; app-server reported `platformFamily=unix`, `platformOs=macos`     |
| Target Codex version | `codex-cli 0.142.5`; app-server `userAgent` reported `n1a-probe/0.142.5`               |

Grouped record: the basic harmless turn naturally produced structured command execution events, so
the same capture supports P04 and the Tier 3 P05 check.

## Supports

- N1A-P04: captures submitted, active, terminal, and final response behavior for a harmless turn.
- N1A-P05: captures structured command execution start/completion, exit code, and output fields.
- Feeds the N1b transport ADR and R3 by showing whether a one-shot `run(story)` adapter can observe
  terminal state and result payloads without terminal scraping.

## Method

1. Started `codex app-server --listen stdio://` through the probe harness.
2. Initialized the app-server and started an ephemeral thread in a disposable temp workspace.
3. Sent one harmless prompt: run `pwd` and `ls -1`, then reply with `N1A-BASIC-DONE`.
4. Used `approvalPolicy=never` and a workspace-write sandbox rooted at the disposable workspace.
5. Waited for `turn/completed`.

## Captured material

| Artifact                                            | SHA-256                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/design/evidence/raw/n1a/p04-basic-turn.jsonl` | `2ca03e0f3c11d33c36b4d8c451cc1b1c8bcc84456623c565d9aa306ca721741d` |
| `docs/design/evidence/raw/n1a/probe-summary.json`   | `20afafb1c0cb28ed92e92589a09d6279e7802a9e08f4d78e62c4b56e55664a59` |

## Result

The turn produced structured lifecycle notifications:

- `thread/started`
- `thread/status/changed` to active
- `turn/started`
- `item/started` and `item/completed` for the user message
- `item/started` and `item/completed` for two `commandExecution` items
- `item/agentMessage/delta` and final `item/completed` for the assistant message
- `thread/status/changed` to idle
- `turn/completed` with `status=completed`

The command execution items included command text, redacted cwd, process ID, source, status,
command action classification, aggregated output where present, `exitCode=0`, and duration. The
assistant final message was `N1A-BASIC-DONE`.

## Limitations

This proves a simple success-path turn exposes enough structured lifecycle and command-exit material
for this prompt. It does not prove every tool type has equivalent structure, that output is always
complete, or that failures have equally useful fields. The prompt involved only local shell commands
inside a disposable workspace.

## Redaction

Redaction was applied. The raw captures replace local paths, local host identifiers,
thread/session/turn/item IDs, account rate-limit snapshots, and auth-like fields with placeholders.
No unresolved redaction ambiguity remains in this record.

## Decision input

N1b can treat app-server as capable of exposing a machine-readable success-path turn lifecycle and
structured shell command exits. This supports a one-shot adapter for basic completion, while broader
tool coverage and failure coverage still need separate contract judgment.
