---
title: Wave 4a — story DAG (author-time)
wave: 4a
status: charter draft
---

# Wave 4a — story DAG (author-time)

This is the author-time dependency graph for Wave 4a's four stories. It is the **first** wave in the
design track to carry a `story-dag.md`: Waves 0–3 had no internal author-time dependencies (their
stories ran parallel, seeded by the wave frame), so a DAG would have been a flat list. Wave 4a earns
one because `w4-s4` (bootstrap/composition root) **wires** the other three core parts at launch, so
it must be authored after their shapes settle (D-004).

The dependency is **author-time only**. At frame time all four parts consumed only Waves 1–3 (per the
per-part frames in [`frames/`](./frames/) and [`decisions.md`](./decisions.md) D-004), so framing ran
in one pass; this graph constrains the _authoring_ order, not the framing.

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
    "rankSpacing": 55,
    "defaultRenderer": "elk"
  }
}}%%
flowchart TB

  subgraph roots["Parallel author-time roots — depends_on: []"]
    direction LR
    s1("`**w4-s1** records / observability
tactical-ddd`")
    s2("`**w4-s2** plan / policy / evidence
tactical-ddd`")
    s3("`**w4-s3** authority spine
tactical-ddd`")
  end

  s4("`**w4-s4** bootstrap / composition root
control-plane/runtime`")

  s1 -->|constructs the records store| s4
  s2 -->|wires the plan / policy intake| s4
  s3 -->|wires the authority spine| s4

  classDef coreBox fill:#e3f6f0,stroke:#007a62,stroke-width:2px,color:#003f34,rx:16,ry:16;
  classDef configBox fill:#eeeeff,stroke:#5549d8,stroke-width:2px,color:#29226f,rx:16,ry:16;
  class s1,s2,s3 coreBox;
  class s4 configBox;

  style roots fill:#fbfaf7,stroke:#b8b8b1,stroke-width:2px,color:#2b2b2b,rx:18,ry:18
```

**Parallel vs. wait, in one line:** `w4-s1`, `w4-s2`, and `w4-s3` author in parallel (no shared
state-derivation; their one shared element, the GUARD-2 seam wording across s2/s3, is fixed by the
frames); `w4-s4` waits on all three, because it constructs the records store (`w4-s1`), wires the
plan/policy intake (`w4-s2`), and wires the authority spine (`w4-s3`) at launch and cites their
settled shapes.

## Edges

| From                          | To                                 | Author-time dependency                                                                                              |
| ----------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `w4-s1-records-observability` | `w4-s4-bootstrap-composition-root` | `w4-s4` constructs and wires the records store `w4-s1` defines (the s1↔s4 records-store construction seam)          |
| `w4-s2-plan-policy-evidence`  | `w4-s4-bootstrap-composition-root` | `w4-s4` binds and wires the plan/policy intake `w4-s2` defines                                                      |
| `w4-s3-authority-spine`       | `w4-s4-bootstrap-composition-root` | `w4-s4` wires the Fence/Doorbell `w4-s3` defines with bound policy at launch (the s3↔s4 Fence/Doorbell wiring seam) |

## Related

- [`README.md`](./README.md) — the wave charter (Story order section carries the same DAG in prose).
- [`decisions.md`](./decisions.md) — D-004 (the author-time `depends_on` and the identically-worded
  cross-part seams) this graph encodes.
- [`frames/`](./frames/) — the four per-part frames; `w4-s4`'s frame states the author-time
  `depends_on` and that framing consumed only Waves 1–3.
