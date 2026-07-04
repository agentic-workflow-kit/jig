---
title: "Contracts — the boundary map"
status: draft — stub
---

# Contracts — the boundary map

`contracts/` holds every interface at jig's edge, in three kinds: **driving** (how consumers
drive jig), **data** (what flows in and out), and **providers** (what plugs in). The fixed logic
behind all three lives in [`../core/`](../core/README.md); core is not a seam.

Two later design decisions now refine how those seams are packaged and adapted without changing the
boundary kinds above:

- [ADR 0027](../decisions/0027-packaging-sdk-boundary.md) settles the future internal package
  direction: `jig-sdk` owns the programmatic core/port/factory boundary, `jig-cli` is the terminal
  adapter, and `jig-testkit` owns conformance. The current repo remains one private package with no
  public export or stability promise.
- [ADR 0028](../decisions/0028-codex-app-server-transport.md) settles the first Codex Agent adapter
  transport as an owned stdio app-server process with an internal session-observable seam. The public
  provider boundary remains `AgentPort`; app-server protocol objects do not become Jig contracts.

## Owns

- **Driving** — the CLI / MCP / SDK adapters consumers use to drive jig. See
  [`driving.md`](./driving.md).
- **Data** — the execution-plan contract in and the observability-records contract out, jig's
  one hard input and its durable output:
  [`execution-plan-contract-v0.md`](./execution-plan-contract-v0.md) and
  [`observability-records-contract-v0.md`](./observability-records-contract-v0.md).
- **Providers** — the four swappable seams (agent, execution host, forge, work source). See
  [`providers.md`](./providers.md).
- **Conformance boundary** — the provider adequacy suite is a future `jig-testkit` responsibility
  that tests SDK-owned ports and provider-facing types without entering the production runtime graph.

## Interface

This file is an index, not a port; see the linked files for the ports each boundary kind owns.

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "fontFamily": "Inter, Arial, sans-serif",
    "primaryTextColor": "#2b2b2b",
    "lineColor": "#8a8882",
    "edgeLabelBackground": "#ffffff",
    "clusterBkg": "#fbfaf7",
    "clusterBorder": "#b8b8b1",
    "clusterTextColor": "#2b2b2b"
  },
  "flowchart": {
    "htmlLabels": false,
    "curve": "linear",
    "nodeSpacing": 40,
    "rankSpacing": 45,
    "defaultRenderer": "elk"
  }
}}%%
flowchart TB

  core("`**core/**
the trusted runner`")

  subgraph driving["Driving — how consumers call jig"]
    direction LR
    cli("`**CLI / MCP / SDK**`")
  end

  subgraph data["Data contracts — in and out"]
    direction LR
    planin("`**Execution-plan**
in`") ~~~ recordsout("`**Observability-records**
out`")
  end

  subgraph providers["Providers — four swappable seams"]
    direction LR
    agent("`**Agent**`") ~~~ host("`**Execution host**`") ~~~ forge("`**Forge**`") ~~~ source("`**Work source**`")
  end

  driving --> core
  planin --> core
  core --> recordsout
  providers --- core

  classDef coreBox fill:#e3f6f0,stroke:#007a62,stroke-width:2px,color:#003f34,rx:16,ry:16;
  classDef seamBox fill:#fff0ea,stroke:#a43f22,stroke-width:2px,color:#4d1f12,rx:16,ry:16;
  class core coreBox;
  class cli,planin,recordsout,agent,host,forge,source seamBox;
```

## Notes

- Jig owns the plan and records contracts as versioned seams: changing their shape is a breaking
  change for downstream consumers.
- Package split, export maps, project references, provider publication, and public stability promises
  are outside this index. This page routes to the applied ADRs; it does not make those implementation
  changes.

## Reconciles to

- `STACK-2` — the four provider seams.
- `SEE-2` — records are a structured, machine-readable product surface.
- `docs/product/jig.md` — "The execution plan — Jig's one input."
- ADR 0027 — internal SDK/CLI/testkit package boundary.
- ADR 0028 — Codex app-server adapter remains internal to the Agent provider implementation.
