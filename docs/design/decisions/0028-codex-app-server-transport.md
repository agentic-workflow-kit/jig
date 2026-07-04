---
title: "ADR 0028 — Codex app-server transport and session-observable adapter seam"
status: applied
---

# ADR 0028 — Codex app-server transport and session-observable adapter seam

## Context

The N1a evidence capture tested the current Codex app-server surface on macOS 26.5.1 with
`codex-cli 0.142.5`. It produced dated, redacted, citable evidence for the app-server schema,
directly owned stdio process path, structured turn lifecycle, approval relay and denial, interrupt,
overlap/busy caveats, malformed-request cleanup, and thread resume behavior under
[`docs/design/evidence/`](../evidence/).

The app-server schema and readiness capture distinguishes two transport candidates. The managed daemon
path was not available on this host because the standalone installer-managed daemon was absent, while
`codex app-server --listen stdio://` initialized successfully and gave jig-owned process parentage
evidence ([surface readiness](../evidence/2026-07-04-n1a-p01-p02-p03-surface-readiness-parentage.md)).
The simple turn capture showed structured lifecycle and command-execution events without terminal
scraping ([turn lifecycle](../evidence/2026-07-04-n1a-p04-p05-turn-lifecycle-tool-events.md)).

N1a also made the R3 seam question concrete. Approval requests and decisions were structured,
correlated server requests on the active turn, with denial stable at the command item rather than as
a terminal denied turn state
([approval/denial](../evidence/2026-07-04-n1a-p06-p07-approval-denial.md)). Interrupt was accepted
for an active turn and completed that turn with `status=interrupted`
([interrupt](../evidence/2026-07-04-n1a-p08-interrupt.md)). Resume survived app-server process
restart and returned prior turn state plus a redacted session path
([resume/durability](../evidence/2026-07-04-n1a-p11-p12-resume-durability.md)).

The same evidence also narrows what this ADR must not overclaim. Overlapping turns did not yield an
explicit busy or queued signal, and event attribution was ambiguous; cleanup coverage proved one
malformed protocol error and restart, not failed tool cleanup or broker-kill recovery
([busy/cleanup](../evidence/2026-07-04-n1a-p09-p10-busy-cleanup.md)). The evidence is host- and
version-specific, not a cross-platform or long-term-session-file guarantee.

The org post-spine decisions route transport session-observability questions to jig's design authority
and record that `ExecutionHostPort.describe()` open question #1 is already settled by
[ADR 0022](./0022-phase-6-real-driver-integration.md): `describe()` stays synchronous through
prove-then-describe
([M7 post-spine decisions](https://github.com/agentic-workflow-kit/.github/blob/main/MILESTONES.md#M7-real-provider-integration)).
This ADR therefore decides only the Codex agent transport and adapter seam. It does not reopen
`ExecutionHostPort`, the execution-plan contract, or the observability-records contract.

## Decision

Four settlements bind the Codex transport implementation that follows N1b.

### 1. Prefer the owned stdio app-server transport

The Codex transport should use `codex app-server --listen stdio://` as jig's first implementation
target, not the managed daemon and not terminal-output scraping.

The stdio app-server path is the only N1a-proven path that was both available and process-owned by
the harness. It exposes structured JSON-RPC methods and notifications for thread, turn, command,
approval, interrupt, and resume behavior. A CLI-observe-and-capture adapter remains a fallback concept
only if the app-server path regresses or becomes unavailable. MCP is not selected as the first Codex
agent transport because the captured evidence is for the Codex app-server protocol, not an MCP driver
contract.

The implementation may still re-check app-server version and method availability at startup. If the
required app-server methods are unavailable, the adapter must fail closed rather than silently falling
back to terminal scraping.

### 2. R3 resolves to a session-observable internal Codex seam

`CodexAgentSession` should widen from a one-shot `run(story): Promise<CodexSessionResult>` shape to a
minimal session-observable transport seam inside the real Codex adapter.

The reason is not basic completion: a one-shot wrapper can represent a completed turn. The reason is
live control and correlation. Approval relay, denial, interrupt, and resume are meaningful while a
turn is active or across a persisted thread. Burying those behind a final promise would prevent jig's
real Codex adapter from routing owner decisions, interrupting owned work, or correlating durable thread
state without implementation-specific side channels.

This widening is internal to the real Codex adapter boundary. The public provider port remains
`AgentPort`: final-result oriented and selected by the composition root behind the existing provider
seam. The runner, Fence, records, Forge, and work-source paths must not import app-server protocol
objects or app-server lifecycle events directly.

### 3. Translate observability back into jig's existing authority model

The session-observable seam does not grant the agent new authority. The Codex adapter observes and
controls the app-server turn, then translates outcomes back into jig's existing worker/result,
authorization, and record paths.

Required translation rules:

- Approval requests remain owner-routed decisions. The adapter may surface correlated approval items,
  but it does not decide them and does not widen the agent's authority to push, open PRs, merge, read
  credentials, or alter policy.
- Denial maps from the denied command/item evidence. The observed app-server turn can still finish
  `completed`, so implementation must not treat final turn completion as proof that every requested
  command was allowed.
- Interrupt maps to an observable cancellation/interruption outcome for the active Codex turn. N1a
  proves interruption before the `sleep 30` subprocess started; process-tree termination for already
  running tools remains separate evidence.
- Resume and thread correlation may be used as adapter state, but the redacted Codex session path is
  not a public jig contract and must not be treated as a stable cross-host persistence API.
- Turn starts must be serialized by jig's adapter unless later evidence proves safe overlap semantics.
  The adapter must not rely on an app-server busy signal from N1a.

### 4. This ADR authorizes design direction, not implementation or contract freeze

This ADR does not edit `src/`, introduce app-server protocol types, create package exports, change
golden records, freeze v0 contracts, or retire EVRUN-full by itself.

The implementation PR that realizes this ADR must make any concrete type/API changes explicitly and
prove that default/reference wiring remains byte-stable where existing goldens require it. If the
implementation discovers that preserving `AgentPort`, records shape, or the execution-plan contract is
impossible, it must stop and route the seam-shape question back to jig's design authority before
continuing.

## Consequences

- N1b selects a concrete transport direction: owned stdio app-server first, with no dependence on the
  unavailable managed daemon path.
- The real Codex adapter can expose live approval, interrupt, and resume correlation internally without
  widening `AgentPort` or leaking app-server protocol concerns into the runner.
- Transport implementation carries explicit caveats: macOS/Codex 0.142.5 evidence, no Windows
  process-tree proof, no managed-daemon proof, no explicit busy semantics, and limited cleanup proof.
- T14 v0 contract freeze remains gated on the transport implementation/evidence path and the other
  recorded gates. This ADR is an input to that freeze, not the freeze itself.

## Reconciles to

- `CFG-7` — surrounding tools use named extension seams rather than terminal scraping or CLI internals.
- `STACK-1` and `STACK-2` — provider seams remain swappable behind the composition root.
- `FENCE-3` and `MERGE-2` — the agent receives no landing or merge authority; privileged actions stay
  runner/Forge-owned.
- `SEE-1`, `SEE-2`, and `SEE-3` — Codex transport evidence must remain machine-readable and
  inspectable without turning Codex session files into jig records.
- ADR 0022 — `ExecutionHostPort.describe()` stays synchronous by prove-then-describe and is not
  reopened by Codex agent transport evidence.
- ADR 0027 — future SDK/package boundaries may expose supported jig control surfaces, but not raw
  app-server internals as a consumer contract.

## Open questions

- Whether a later platform should support the managed app-server daemon remains open until that path is
  available and evidenced.
- Windows/Git Bash cleanup, already-running subprocess interruption, cross-host resume, long-term
  retention, prompt-size boundaries, and forced broker-failure cleanup remain evidence gaps for future
  implementation or hardening work.
