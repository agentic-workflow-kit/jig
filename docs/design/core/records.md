---
title: "Records — the event-log engine"
status: draft — stub
---

# Records — the event-log engine

Produces the durable, ordered, redaction-aware records that are the evidence itself. State and
summary are never authored directly — they are pure projections replayed from the log.

## Owns

- The append-only event log, with a single leased writer per run.
- Pure projections — state, summary, metrics — replayed from the log, never hand-maintained
  separately.
- Redaction posture recorded per record.
- Export: a write-once, redacted artifact a finished run produces.
- The source data for notices and for "ask why" — both read from the same log, nothing parallel.

## Interface

`RunStore` port — `append(event)` (append-only, no mutation or deletion) and
`project(state | summary | metrics)` (pure replay of the log into a view); plus an `export`
operation producing the write-once redacted artifact.

## Diagram

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
    "nodeSpacing": 30,
    "rankSpacing": 55,
    "defaultRenderer": "elk"
  }
}}%%
flowchart LR

  events("`**Events**
from runner + fence`")
  log("`**Append-only log**
single leased writer`")
  project("`**Project**
pure replay of the log`")
  state("`**State**`")
  summary("`**Summary**`")
  metrics("`**Metrics**`")
  inspect("`**Inspect / ask why**`")
  notices("`**Notices**`")
  export("`**Export**
write-once, redacted`")

  events --> log
  log --> project
  project --> state
  project --> summary
  project --> metrics
  log --> inspect
  log --> notices
  log --> export

  classDef coreBox fill:#e3f6f0,stroke:#007a62,stroke-width:2px,color:#003f34,rx:16,ry:16;
  classDef commonBox fill:#f6f4ed,stroke:#77736d,stroke-width:2px,color:#2b2b2b,rx:16,ry:16;
  class events,log,project coreBox;
  class state,summary,metrics,inspect,notices,export commonBox;
```

## Notes

- The records are the evidence (SEE-3): there is no separate narrative of what happened that can
  drift from the log itself.
- Real secret-scanning is deferred; the redaction-posture field exists on each record now so it
  can be populated later without a schema break.
- Retention richness — how long records live, archival tiers — is deferred.

## Reconciles to

SEE-1, SEE-2, SEE-3, SEE-4, SEE-5, SEE-6, SEC-1.
