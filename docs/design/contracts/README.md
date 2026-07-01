---
title: "Contracts — the boundary map"
status: draft — stub
---

# Contracts — the boundary map

`contracts/` holds every interface at jig's edge, in three kinds: **driving** (how consumers
drive jig), **data** (what flows in and out), and **providers** (what plugs in). The fixed logic
behind all three lives in [`../core/`](../core/README.md); core is not a seam.

## Owns

- **Driving** — the CLI / MCP / SDK adapters consumers use to drive jig. See
  [`driving.md`](./driving.md).
- **Data** — the execution-plan contract in and the observability-records contract out, jig's
  one hard input and its durable output:
  [`execution-plan-contract-v0.md`](./execution-plan-contract-v0.md) and
  [`observability-records-contract-v0.md`](./observability-records-contract-v0.md).
- **Providers** — the four swappable seams (agent, execution host, forge, work source). See
  [`providers.md`](./providers.md).

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

## Reconciles to

- `STACK-2` — the four provider seams.
- `SEE-2` — records are a structured, machine-readable product surface.
- `docs/product/jig.md` — "The execution plan — Jig's one input."
