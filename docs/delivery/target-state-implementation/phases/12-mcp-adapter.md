---
title: "Phase 12 - MCP driving adapter"
status: "merged (#71)"
---

# Phase 12 - MCP driving adapter

## Overview

Deliver the product's second first-party driving surface: an MCP adapter so an owner can
"drive Jig as a tool from your own agent" — a thin realization of the same operator-control
port the CLI uses, exposing the deliberate driving actions as MCP tools, holding no run logic,
importing no provider contracts, and consuming only `jig-sdk`.

## Background

The product boundary names the sequence: CLI, private MCP, and SDK, and the driving contract designs
for three adapters (CLI/MCP/SDK) over one port from the start. ADR 0027 expects MCP to be the SDK's
second consumer; ADR 0033 places it in a dedicated private `jig-mcp` adapter package. The SDK
package exists (P02), P08/P09/P10 have landed, and the port carries the current driving-action
vocabulary. Setup stays out because ADR 0029 placed it as configuration, not an operator-control
verb. Resume stays out because it is on the SDK recovery surface, not the operator-control port.

## What To Do

- First, route the placement decision: ADR 0033 places the adapter in a new private `jig-mcp`
  package that depends on `jig-sdk`, never the reverse.
- Implement the MCP server as a thin adapter: each driving action settled on the port by merge
  time (start, preview, watch, inspect, ask-why, decide, stop, plus any explicitly settled
  additions) maps to one MCP tool that makes one SDK operator-control call and preserves the
  SDK-owned record behavior for that action; invalid input still returns through the same
  transport-level error envelope without adding transport-specific audit records.
- Presentation only at the edge: results are the SDK's typed results rendered for tool
  consumption; long-running actions (watch) map to MCP-appropriate patterns without moving
  lifecycle logic into the adapter.
- Owner decisions surfaced over MCP remain owner decisions: the MCP client is the owner's own
  agent acting as their surface — the adapter must not let a driving client widen worker
  authority (`FENCE`/`DOOR` semantics unchanged; the doorbell's categories still route where
  they route).
- Document the surface (README/AGENTS), including its private, no-stability posture.

## Why

- Product: "You run Jig from a terminal, drive it as a tool from your own agent, or embed it in
  your own software" ([`jig.md` — Driving a run](../../../product/jig.md#driving-a-run));
  boundary: "a future MCP surface next"
  ([Product Boundaries](../../../product/jig.md#product-boundaries)).
- [Driving contract](../../../design/contracts/driving.md) — MCP as a thin realization of the
  operator-control port; adapter-drift risk is named there and this phase is where it becomes
  real.
- ADR 0027 — MCP as the SDK's expected second consumer, proving the boundary is consumable.

## Technical Requirements

- The adapter holds no run logic, eligibility, or authorization semantics; it imports `jig-sdk`
  only (boundary check enforces this after placement).
- One tool call = one SDK operator-control call; no hidden multi-step fan-out. Durable audit
  records remain owned by the SDK/operator path for the invoked action, so MCP must not synthesize a
  second transport-specific audit layer.
- The MCP surface is private/unstable like everything else: no stability promise, explicitly
  marked, consistent with the product posture.
- Decision-category integrity: nothing about MCP transport changes what requires a human
  (`CFG-10` fixed categories); an MCP client cannot auto-answer a routed decision unless the
  owner's policy already allows that category to auto-grant.
- Hermetic tests with an in-process MCP client; no network listener requirements in CI.

## Reference Files

- [Driving contract](../../../design/contracts/driving.md);
  [`product/jig.md`](../../../product/jig.md) (Driving a run; Product Boundaries)
- [ADR 0027](../../../design/decisions/0027-packaging-sdk-boundary.md)
- Source: P01's entry module and port; P02's `jig-cli` adapter as the sibling pattern
- [`product/concepts.md`](../../../product/concepts.md) (SDK/providers/conformance concepts)

## Dependencies

- **Requires:** P02 (hard — consumes the SDK package).
- **Soft:** P08, P09 (verb coverage; shipping with partial verbs is a recorded choice), plus
  P07/P10 if their placement decisions expand the port.
- **Unlocks:** feeds P14.
- **Parallel:** P11 and any remaining owner-surface phases.

## Acceptance Criteria

1. The placement decision is recorded (ADR or design-doc deepening) before the implementing PR
   merges, and the implementation matches it.
2. An MCP client can preview, start, and inspect the fixture flow end to end; each MCP invocation
   makes exactly one SDK operator-control call, and durable records match the SDK behavior for that
   action. Resume is covered only if it is available as a settled port verb at merge time.
3. Every port verb available at merge time is exposed; unavailable verbs are absent (not
   stubbed); the exposed set is documented.
4. A routed human-category decision arriving via MCP still parks for the owner's decide flow —
   demonstrated by test — and no MCP path reaches provider contracts (boundary check).
5. Behavior parity test: the same action via CLI and via MCP produces equivalent `run.json` and
   `events.jsonl` record shapes after volatile run IDs, timestamps, and workspace-specific fields are
   normalized.
6. Goldens byte-identical; boundary enforcement green; docs updated with the posture statement.

## Verification

- `pnpm check` including the dependency-boundary rules over the new adapter's home.
- Integration tests driving the MCP surface with an in-process client against fixtures.
- Reviewer axes: thinness (diff should be dominated by adapter/presentation code), SDK record
  fidelity, decision-category integrity, parity with CLI semantics.

## Out Of Scope

- Publishing the MCP surface or promising stability.
- Webhook/scheduler triggers (still operator-initiated — the MCP client acts for the operator).
- Setup-integration guidance for MCP (`jig.md` open question; P07 noted it).
- New driving verbs that P07/P08/P09/P10 did not explicitly settle.

## Stop Or Escalate If

- Placement cannot satisfy the dependency matrix without widening the SDK export surface —
  route to design (ADR 0027's owner) before implementing.
- MCP interaction patterns force a second control plane (session state in the adapter,
  multi-call transactions) — that violates the driving contract's core rule; stop and route.
- Long-running verbs (watch) cannot map to MCP without lifecycle logic at the edge — take the
  design question to the driving-contract owner rather than embedding run logic.
