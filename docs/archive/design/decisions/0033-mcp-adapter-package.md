---
title: "ADR 0033 - MCP adapter lives in a private jig-mcp package"
status: applied
---

# ADR 0033 - MCP adapter lives in a private jig-mcp package

## Context

Phase 12 adds Jig's second first-party driving surface: an MCP adapter for owners who want to drive
Jig as a tool from their own agent. The adapter must be thin, private, and unstable; it must call the
same SDK operator-control port as the CLI and must not import provider contracts or carry run logic.

ADR 0027 settled the package matrix before MCP existed in code. It named MCP as the SDK's expected
second consumer but did not choose its package home. The choices before implementation are:

- place MCP inside `jig-cli`, broadening that package beyond terminal ownership;
- place MCP inside `jig-sdk`, putting an edge adapter inside the runtime/core distribution boundary;
  or
- create a fourth private adapter package, `jig-mcp`, that depends on `jig-sdk` like `jig-cli` does.

## Decision

Create a new private workspace package, `@agentic-workflow-kit/jig-mcp`, for the MCP adapter.

`jig-mcp` owns:

- the MCP server factory;
- the stdio entrypoint;
- MCP-specific tool naming, input validation, and result presentation; and
- in-process MCP integration tests for the adapter.

`jig-mcp` may depend on `@agentic-workflow-kit/jig-sdk` and the MCP TypeScript SDK. It must not
depend on `jig-cli`, `jig-testkit`, provider deep paths, or SDK internals outside the package export.

The adapter exposes only settled operator-control verbs available at merge time: preview, start,
inspect, watch, ask-why, notice acknowledge, notice snooze, decide, stop, and export. It does not
expose `resume` in this phase because resume is on the SDK recovery surface, not the
operator-control port named by the driving contract.

## Consequences

- CLI remains a terminal adapter; MCP does not widen its responsibility or package name.
- SDK remains the core/programmatic boundary and does not import MCP.
- The dependency matrix gains one private adapter package with the same direction as CLI:
  `jig-mcp -> jig-sdk`.
- MCP carries no publish, semver, registry, or stability promise. It is source-checkout tooling only
  until a later owner-visible decision changes that posture.
- Future operator verbs can be added to MCP by exposing the corresponding SDK operator-control call;
  unavailable verbs stay absent rather than stubbed.

## Reconciles to

- ADR 0027 — MCP becomes the SDK's second consumer without changing SDK dependency direction.
- `docs/design/contracts/driving.md` — MCP is a thin operator-surface adapter: one tool call, one
  control-plane call, and one audit/event posture from the SDK path.
- `docs/product/jig.md` — owners can drive Jig from their own agent, while the product keeps the
  current no-public-package and no-stability posture.
