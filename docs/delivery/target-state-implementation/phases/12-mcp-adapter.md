---
title: "Phase 12 - MCP driving adapter"
status: planned
---

# Phase 12 - MCP driving adapter

## Overview

Deliver the product's second first-party driving surface: an MCP adapter so an owner can
"drive Jig as a tool from your own agent" — a thin realization of the same operator-control
port the CLI uses, exposing the deliberate driving actions as MCP tools, holding no run logic,
importing no provider contracts, and consuming only `jig-sdk`.

## Background

The product boundary names the sequence: "its CLI today, a future MCP surface next," and the
driving contract designs for three adapters (CLI/MCP/SDK) over one port from the start. ADR
0027 expects MCP to be the SDK's second consumer. Nothing MCP-shaped exists in the repo. By
this phase, the SDK package exists (P02) and — if P08/P09 have landed — the port carries the
full action vocabulary; if they have not, the adapter ships the verbs that exist and grows with
the port (that is the soft dependency, and shipping early with partial verbs is a deliberate
choice for the implementer and reviewer to make against the product's "deliberate actions"
framing).

## What To Do

- First, route the placement decision: ADR 0027's package matrix has no MCP package — decide
  (with the design owner, likely a short ADR) whether the MCP adapter lives in `jig-cli`
  (renamed scope), a new `jig-mcp` package, or an SDK-internal module; the decision must keep
  the dependency matrix's spirit — adapters depend on `jig-sdk`, never the reverse.
- Implement the MCP server as a thin adapter: each driving action (start, preview, watch,
  inspect, ask-why, decide, stop, notices, export, setup — whatever the port carries by then)
  maps to one MCP tool that makes one control-plane call and yields one audit event; invalid
  input still produces the audit posture the driving contract requires.
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
- One tool call = one control-plane call = one audit event; no hidden multi-step fan-out.
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
- **Soft:** P08, P09 (verb coverage; shipping with partial verbs is a recorded choice).
- **Unlocks:** feeds P14.
- **Parallel:** P11, P13, and any remaining owner-surface phases.

## Acceptance Criteria

1. The placement decision is recorded (ADR or design-doc deepening) before the implementing PR
   merges, and the implementation matches it.
2. An MCP client can preview, start, inspect, and resume the fixture flow end to end; each
   invocation shows exactly one audit event.
3. Every port verb available at merge time is exposed; unavailable verbs are absent (not
   stubbed); the exposed set is documented.
4. A routed human-category decision arriving via MCP still parks for the owner's decide flow —
   demonstrated by test — and no MCP path reaches provider contracts (boundary check).
5. Behavior parity test: the same action via CLI and via MCP produces equivalent record shapes.
6. Goldens byte-identical; boundary enforcement green; docs updated with the posture statement.

## Verification

- `pnpm check` including the dependency-boundary rules over the new adapter's home.
- Integration tests driving the MCP surface with an in-process client against fixtures.
- Reviewer axes: thinness (diff should be dominated by adapter/presentation code), audit-event
  fidelity, decision-category integrity, parity with CLI semantics.

## Out Of Scope

- Publishing the MCP surface or promising stability.
- Webhook/scheduler triggers (still operator-initiated — the MCP client acts for the operator).
- Setup-integration guidance for MCP (`jig.md` open question; P07 noted it).
- New driving verbs that P08/P09 did not create.

## Stop Or Escalate If

- Placement cannot satisfy the dependency matrix without widening the SDK export surface —
  route to design (ADR 0027's owner) before implementing.
- MCP interaction patterns force a second control plane (session state in the adapter,
  multi-call transactions) — that violates the driving contract's core rule; stop and route.
- Long-running verbs (watch) cannot map to MCP without lifecycle logic at the edge — take the
  design question to the driving-contract owner rather than embedding run logic.
