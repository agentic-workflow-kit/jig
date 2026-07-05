---
title: "Phase 03 - Codex app-server transport"
status: "merged (#57, #58, #59, #60)"
---

# Phase 03 - Codex app-server transport

## Overview

Implement the production Codex agent transport: a `CodexAgentSession` implementation that owns a
`codex app-server --listen stdio://` process, drives real Codex turns, and translates outcomes
back into Jig's worker/result, authorization, and record vocabulary — wired so `agent: 'codex'`
is selectable from configuration without test-only injection. This realizes ADR 0028 and closes
the N1b implementation debt.

## Background

The real agent is the last unimplemented provider seam. `src/providers/real/agent.ts` wraps an
injected `CodexAgentSession`, but no production implementation exists; the composition root
throws `ProviderSelectionError` when `agent: 'codex'` is selected without an injected session,
and the CLI never injects one. ADR 0028 settled the direction from the N1a evidence: owned stdio
app-server, a session-observable seam internal to the adapter, a compatibility preflight, and
explicit translation rules. The only code that speaks the app-server protocol today is the
evidence probe at `tools/n1a/codex-app-server-probe.mjs`, outside `src/`.

## What To Do

- Implement a production `CodexAgentSession` over the owned stdio app-server: process spawn and
  ownership, JSON-RPC framing, thread start/resume, turn lifecycle, command-item observation,
  approval relay, interrupt, and cleanup on shutdown.
- Implement the compatibility preflight (ADR 0028 decision 1): verify Codex version posture and
  the required methods/notifications before dispatching any turn; fail closed with a structured
  pre-dispatch error otherwise — no silent fallback, no terminal scraping.
- Apply the translation rules (ADR 0028 decision 3): approval requests route to the owner
  through the existing Fence/Doorbell path — the adapter never decides; denial maps from
  denied-item evidence, never from turn completion; interrupt maps to an observable cancellation
  outcome; resume/thread correlation stays adapter-internal state; turn starts are serialized;
  prompt-size limits are checked pre-dispatch or fail with a structured error; on Windows the
  adapter fails closed with an explicit unsupported-platform result.
- Wire selection: `agent: 'codex'` composes the production session via the factory (P01
  options remain available for tests); document the required environment (Codex CLI presence,
  version posture).
- Test in lanes: hermetic tests against a scripted/fake app-server double (extend the hermetic
  guard to catch stray Codex process spawns — it already knows this category); a real-process
  smoke test behind the existing opt-in pattern; conformance for the agent seam unchanged.
- Apply redaction at the transport boundary before anything reaches records.

## Why

- ADR 0028, all four settlements — this phase is its implementation PR.
- `STACK-1..3` — a real, swappable agent behind an unchanged `AgentPort`; `INV-002` stays
  structural (no privileged method on the port).
- `FENCE-3`/`MERGE-2` — the agent gains no landing or credential authority; approvals stay
  owner-routed.
- Unblocks P11 (EVRUN-full needs a real Codex leg) and, downstream, P13.

## Technical Requirements

- Public `AgentPort` is unchanged and final-result oriented; app-server protocol objects and
  lifecycle events do not cross the adapter boundary into runner, Fence, records, Forge, or
  work-source code, and are not exported from the SDK surface.
- Reference/default wiring stays byte-stable: goldens unchanged; hermetic lanes never touch a
  real Codex process.
- Evidence caveats are load-bearing: the N1a evidence is macOS + `codex-cli 0.142.5` specific.
  Do not rely on an app-server busy signal; do not treat the Codex session path as a stable
  cross-host persistence API; do not enable Windows from macOS evidence.
- Credentials/environment for Codex arrive via environment only; transport logs and records are
  redaction-checked; a redaction ambiguity is a diagnosable stop.
- The forbidden-method conformance sweep continues to pass.

## Reference Files

- [ADR 0028](../../../design/decisions/0028-codex-app-server-transport.md)
- N1a evidence records under [`design/evidence/`](../../../design/evidence/README.md)
  (`2026-07-04-n1a-*`), including the deferred probes note (P13/P14)
- [Providers contract](../../../design/contracts/providers.md) (Agent seam),
  [realization roadmap — Phase 6](../../../design/contracts/provider-realization-roadmap.md#phase-6-realization-adr-0022)
- Source: `src/providers/real/agent.ts`, `src/bootstrap.ts`, `src/driver-selection.ts`,
  `src/redaction.ts`; probe reference: `tools/n1a/codex-app-server-probe.mjs`
- Tests: `tests/hermetic/no-real-effects.setup.ts`, agent unit tests, conformance lane

## Dependencies

- **Requires:** P01 (typed factory options); N1a evidence (committed).
- **Soft:** start after P02 lands to avoid source-move churn.
- **Unlocks:** P11 (hard).
- **Parallel:** P04, P05, P06, P08, P09, P10.

## Acceptance Criteria

1. `agent: 'codex'` selected via config composes a working production session on a supported
   host; on an unsupported host or missing/incompatible Codex surface, the run fails closed
   pre-dispatch with a structured, recorded error.
2. The preflight demonstrably rejects an incompatible or absent app-server surface (unit test
   with a double; smoke evidence on the real binary).
3. An approval requested by Codex reaches the owner through the existing decision path and a
   denial is recorded from item-level evidence even when the turn ends `completed`.
4. Interrupting an active turn yields a recorded interruption outcome; a resumed thread
   correlates without exposing app-server state publicly.
5. No app-server protocol type appears in the SDK export surface or in any module outside the
   adapter (grep + boundary check).
6. Goldens byte-identical; hermetic lanes green with the guard extended; smoke lane runs the
   real binary behind opt-in.

## Verification

- `pnpm check`; hermetic guard proves no Codex process in unit/integration/conformance.
- Opt-in smoke run against a real `codex` binary, with version pinned in the PR description.
- Conformance forbidden-method sweep.
- Reviewer axes: translation-rule fidelity against ADR 0028 decision 3 (walk each rule),
  fail-closed paths, redaction posture on transport output.

## Out Of Scope

- EVRUN-full evidence capture (P11).
- Managed app-server daemon support, Windows support, prompt-size behavioral evidence
  (N1A-P13/P14 are open probes; this phase fails closed instead).
- MCP as an agent transport (ADR 0028 explicitly did not select it).
- Any widening of `AgentPort` or new event families.

## Stop Or Escalate If

- Preserving `AgentPort`, the records shape, or the execution-plan contract proves impossible —
  ADR 0028 decision 4 requires stopping and routing the seam-shape question to design
  authority.
- The current Codex CLI's app-server surface has drifted from the N1a evidence in a way the
  preflight cannot bridge — capture fresh evidence per the evidence convention before coding
  around it.
- Turn serialization is insufficient in practice (overlap needed) — that requires new evidence
  (busy semantics were explicitly unproven), not an implementation guess.
