---
title: "N1a — Codex transport evidence capture plan"
status: plan — execute nothing
---

# N1a — Codex transport evidence capture plan

N1a captures fresh evidence only. It implements no transport, changes no `CodexAgentSession` seam,
and changes no `AgentPort` contract. Any finding that suggests widening or changing the current
Codex session shape is routed to the N1b transport ADR and the contract owner, not acted on during
N1a.

## Motivation

The current real-agent path is an injected seam. [`src/providers/real/agent.ts`](../../../packages/jig-sdk/src/providers/real/agent.ts)
defines `CodexAgentSession` as:

```ts
export interface CodexAgentSession {
  run(story: Story): Promise<CodexSessionResult>;
}
```

`createCodexAgent` adapts that injected session to `AgentPort`; it does not own app-server, CLI, or
MCP transport code. That is the right boundary for the current implementation, but it leaves the N1
transport decision without fresh evidence about the current Codex app-server behavior.

Prior-generation Codex research is treated as prior art only. It was schema-oriented, pinned to
`codex` 0.141.0, and did not run live probes. N1a re-evidences the transport behavior against the
current locally installed Codex CLI before N1b decides among app-server, CLI observe-and-capture,
and MCP. Each probe record pins the exact Codex CLI version current at probe time, per the evidence
appendix convention.

## Consumer and gate

- **Direct consumer:** the N1b transport ADR, which decides app-server vs. CLI vs. MCP and decides
  whether the current one-shot `CodexAgentSession.run(story)` shape remains sufficient.
- **Downstream gate:** the v0 contract freeze, T14, is gated behind N1b. N1a evidence does not
  freeze a contract by itself.
- **Record home:** each completed probe writes a dated record under
  [`../evidence/`](../evidence/) using the convention in
  [`../conventions.md`](../conventions.md#6-evidence-appendix-convention-committed-records-are-inputs-to-decisions-not-authority).

## Scope

N1a probes only externally observable Codex transport behavior. It does not add source code, tests,
fixtures, tooling, package dependencies, or new runtime commands to jig.

The probe target is the current Codex surface available to the operator at probe time. App-server is
the primary surface to probe because it is the only candidate expected to support live control
channels. CLI behavior is captured only where needed as a fallback comparison or to verify the
installed version. MCP is captured only to confirm whether it is a live control channel candidate,
not to build on it.

## Evidence-record shape

Each probe record uses this minimum shape:

- Header with ISO date, probe ID, probe title, author/runner, target host OS, and target Codex
  version.
- `Supports` list naming the AC, guarantee, invariant, ADR, or decision IDs the record informs.
- `Method` with the exact non-destructive steps and Codex surface used.
- `Captured material` with transcript/output references and content hashes where captures exist.
- `Result` with observed behavior only.
- `Limitations` stating what the evidence proves and does not prove.
- `Redaction` stating whether tokens, credentials, private URLs, or other sensitive material were
  found or redacted. Ambiguity is a stop-and-ask before commit.
- `Decision input` explaining how the result should feed N1b without deciding N1b.

## Probe checklist

| ID        | Probe                                          | Purpose / decision informed                                                                                                                          | Method sketch                                                                                                                                                                                                         | Expected record shape                                                                                                                                                       | Success criteria                                                                                                                         | Failure criteria                                                                                                                                       |
| --------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `N1A-P01` | App-server surface discovery and version pin   | Tells N1b which current Codex protocol surface is actually present and whether later records are comparable.                                         | Start only the documented local Codex app-server or schema/metadata surface available in the installed CLI; capture version, startup command, advertised methods/events, and help/schema output without sending work. | One record with CLI version, app-server version or schema identifier if exposed, command transcript hash, method/event inventory hash, `Limitations`, and redaction status. | Surface can be inventoried, version-pinned, and hashed without credentials or work execution.                                            | Surface cannot be started or inventoried, version cannot be pinned, or inventory requires exposing sensitive local data.                               |
| `N1A-P02` | Broker readiness and availability              | Decides whether an app-server driver would need a broker readiness state before dispatching a turn.                                                  | Launch the app-server through the intended local ownership path; observe readiness, first usable moment, startup errors, and idle health checks without asking Codex to edit files.                                   | Dated record with startup transcript hash, readiness signal, timeout used, host details, `Limitations`, and redaction status.                                               | A deterministic readiness or failure signal is observable before work dispatch.                                                          | Readiness is ambiguous, races with the first turn, or requires relying on sleeps or terminal text that cannot be parsed.                               |
| `N1A-P03` | Owned process parentage                        | Decides whether jig can prove it owns the process it later controls or kills.                                                                        | Start app-server from a parent probe harness or shell; capture parent PID, child PID, process group/session/job-object data available on the host, and the mapping to the Codex session/turn handle.                  | Record with process-tree snapshot hashes, platform commands used, app-server handles, `Limitations`, and redaction status.                                                  | The live Codex process can be tied to an owner and a session/turn handle without ambiguity.                                              | Handles do not map to a process, parentage is lost, or only an unowned desktop/app session can be observed.                                            |
| `N1A-P04` | Basic turn lifecycle status and result         | Decides whether app-server exposes enough lifecycle state for a one-shot `run(story)` adapter.                                                       | Send a harmless prompt in a disposable workspace that does not require network, secrets, or repository mutation; capture submitted, running, terminal status, and final result payload.                               | Record with prompt hash, response/result payload hash, lifecycle event sequence, `Limitations`, and redaction status.                                                       | A complete turn has a stable terminal state and structured result that can map to `completed` or an explicit unavailable/denied outcome. | Terminal status is missing, result payload is unstructured, or the turn can finish without a machine-readable result.                                  |
| `N1A-P05` | Structured tool-exit and command-result events | Decides whether N1b can observe checks/tool exits directly rather than trusting worker prose.                                                        | Ask for a harmless local command or dry action inside a disposable workspace; capture tool-start, tool-exit, exit code, stdout/stderr shape, and any redaction behavior.                                              | Record with event transcript hash, command output hash, observed exit-code fields, `Limitations`, and redaction status.                                                     | Tool exits are structured enough to distinguish pass, fail, and unavailable without prose scraping.                                      | Exit status is absent, only natural-language summaries are available, or output carries sensitive material that cannot be safely redacted.             |
| `N1A-P06` | Approval request relay                         | Decides whether an app-server transport can carry worker requests across jig's Fence path.                                                           | Trigger a non-destructive permission request in a disposable workspace; capture the request payload, request ID, decision channel, and whether a response resumes the same turn.                                      | Record with approval payload hash, request/decision IDs, timing, `Limitations`, and redaction status.                                                                       | Request and response are correlated, structured, and delivered to the same owned turn.                                                   | Approval appears only in terminal UI, lacks a response channel, loses correlation, or resumes a different process/session.                             |
| `N1A-P07` | Denial and park mapping                        | Decides whether a denied capability can map to jig's `capability-denied` / park path without the driver self-widening.                               | Trigger the same non-destructive permission request and deny it; capture resulting turn state, interruption behavior, and final payload.                                                                              | Record with denial payload hash, resulting state, whether the turn remains resumable, `Limitations`, and redaction status.                                                  | Denial produces an explicit denied/interrupted/parkable state without broadening capability.                                             | Denial is indistinguishable from failure, the worker keeps going with wider authority, or the session becomes unrecoverable without an explicit state. |
| `N1A-P08` | Interrupt or cancel delivery                   | Decides whether live steering/interrupt value is real enough to affect the session contract.                                                         | Start a long-running harmless turn; send the app-server interrupt/cancel mechanism; capture whether the same owned turn receives it and how terminal state is reported.                                               | Record with turn ID, interrupt request hash, before/after lifecycle events, timing, `Limitations`, and redaction status.                                                    | Interrupt is delivered to the owned active turn and produces a structured interrupted/cancelled state.                                   | Interrupt is accepted but not delivered, targets a different process, or leaves the turn in an ambiguous running state.                                |
| `N1A-P09` | Broker busy and serialization behavior         | Decides whether a shared app-server must serialize turns and how jig should surface busy states.                                                     | Attempt two overlapping harmless turns against the same broker/app-server; capture whether the second is queued, rejected, or races.                                                                                  | Record with both turn IDs, timing, broker response hashes, `Limitations`, and redaction status.                                                                             | Busy/queued/rejected behavior is explicit and deterministic enough for runner policy.                                                    | Overlap corrupts state, silently interleaves outputs, or returns only a free-form busy message with no stable code.                                    |
| `N1A-P10` | Cleanup on failed turn or broker failure       | Decides whether failed turns leave zombies, stale locks, or poisoned broker state.                                                                   | Induce a safe failure such as malformed request, unsupported method, or killing only the disposable app-server after capture; inspect remaining processes, locks, and subsequent readiness.                           | Record with failure request hash, process snapshots, lock/state file hashes where present, `Limitations`, and redaction status.                                             | Failure reaches a terminal state, owned processes are gone or reusable, and a new turn can start cleanly.                                | Broker remains busy forever, child processes survive without ownership, or state files require manual deletion before reuse.                           |
| `N1A-P11` | Persistent thread and session resume           | Decides whether current app-server resume can be represented as a new turn behind the existing one-shot seam or requires a wider observable session. | Run a harmless first turn with persistence enabled if available; capture thread/session IDs; resume with a second harmless prompt; verify continuity and ownership.                                                   | Record with session/thread IDs redacted if needed, prompt/response hashes, continuity evidence, `Limitations`, and redaction status.                                        | Resume is explicit, correlated to prior state, and can be owned or honestly marked observe-only.                                         | Resume loses ownership, relies only on transcript scraping, or cannot distinguish fresh session from resumed session.                                  |
| `N1A-P12` | Job-state and log durability                   | Decides whether a transport adapter needs its own durable state model beyond Codex transcripts.                                                      | Inspect app-server/job state files or status APIs produced by the harmless turns; capture what survives process restart and what identifiers link logs to turns.                                                      | Record with state file paths redacted where needed, content hashes, restart observation, `Limitations`, and redaction status.                                               | Status/result/log state survives long enough to reconstruct the turn and correlate it to captured evidence.                              | State is memory-only, identifiers drift, logs are not attributable to turns, or paths expose private data that cannot be redacted.                     |
| `N1A-P13` | Prompt-size and bounded-context behavior       | Decides whether N1b needs hard prompt-size guards before transport dispatch.                                                                         | Send bounded, synthetic prompts of increasing size in a disposable session; stop before costly or destructive behavior; capture accepted, rejected, truncated, or failed outcomes.                                    | Record with generated prompt hashes and sizes, outcome table, observed errors, `Limitations`, and redaction status.                                                         | Limits or failure modes are observable enough to set a conservative preflight guard.                                                     | Oversize prompts hang, truncate silently, corrupt state, or expose no reliable error shape.                                                            |
| `N1A-P14` | Windows and Git Bash process-tree termination  | Decides whether N1b can claim cross-platform cleanup or must gate Windows support.                                                                   | On a Windows/Git Bash host, repeat owned-process start, interrupt, failure cleanup, and force termination with a harmless turn; capture process tree/job-object evidence.                                             | Separate dated Windows record with Codex version, shell, OS build, process snapshots, `Limitations`, and redaction status.                                                  | Entire owned process tree terminates or is honestly reported as unsupported with bounded residue.                                        | Descendants survive, Git Bash argument handling changes target behavior, or the probe cannot prove the process tree is empty.                          |

## Lifecycle-edge validation criteria

Any eventual transport must satisfy these subjects before N1b can recommend it as more than
observe-and-capture:

- Broker busy/serialization behavior is explicit and deterministic.
- Interrupt delivery reaches the same owned active turn or is honestly reported unsupported.
- Cleanup on failure removes or quarantines owned processes, locks, and broker state.
- Session resume is correlated and either owned or clearly observe-only.
- Prompt-size limits fail before dispatch or fail with a structured error.
- Process-tree termination on Windows is proven, or Windows support is explicitly gated.

## Limits of this plan

This is a plan, not evidence. It does not prove app-server behavior, does not prefer a transport,
and does not authorize a seam change. It gives N1a a bounded checklist and record shape so N1b can
make the transport ADR from committed evidence rather than stale prior art or local terminal
memory.
