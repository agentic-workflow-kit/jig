---
title: "Authorization — fence, doorbell, capability attestation"
status: draft — stub
---

# Authorization — fence, doorbell, capability attestation

The fail-closed control of what the worker may do: authorize every request the worker makes,
escalate the ones that are risky or unproven, and gate autonomy on fresh proof rather than
assertion.

## Owns

- Authorizing every worker request before it executes, fail-closed when a request is not
  declared and approved (FENCE-1).
- Granting, denying, or routing a request by the fixed CFG-10 category boundary.
- Holding policy fixed at launch — the rules in force cannot be loosened mid-run (GUARD-1,
  FENCE-2).
- Escalating routed, risky, or unproven actions to the doorbell, parking the run durably and
  granting narrowly when the owner decides (DOOR-1, DOOR-2, DOOR-3).
- Gating autonomy on capability attestation: fresh, positive proof a driver can perform an
  action safely before that action is auto-grantable (EARN-1, EARN-2, STACK-4, DRIVE-1).

## Interface

`Fence` port — `authorize(request, boundPolicy) → grant | deny | route`. Routed requests cross
the doorbell escalation channel to the owner, who approves, rejects, or overrides.

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
    "nodeSpacing": 40,
    "rankSpacing": 45,
    "defaultRenderer": "elk"
  }
}}%%
flowchart TB

  req("`**Worker request**
wants to act`")
  fence("`**Fence**
fixed category check`")
  grant("`**Grant**
reversible, in scope,
non-privileged`")
  route("`**Route to doorbell**
credentials, push / merge,
rule-governing, irreversible`")
  deny("`**Deny — fail closed**
outside declared scope`")
  owner("`**Owner decides**
approve / reject`")
  runner("`**Runner acts**
performs the privileged action`")

  req --> fence
  fence -->|safe| grant
  fence -->|risky| route
  fence -->|out of scope| deny
  route --> owner
  owner -->|approve| grant
  owner -->|reject| deny
  grant --> runner

  subgraph legend[" "]
    direction LR
    l1(" ") ~~~ lt1["worker (no credentials)"] ~~~ l2(" ") ~~~ lt2["jig-core (fence / runner)"] ~~~ l3(" ") ~~~ lt3["owner / escalation"]
  end
  style legend fill:transparent,stroke:transparent,color:transparent

  runner ~~~ legend

  classDef seamBox fill:#fff0ea,stroke:#a43f22,stroke-width:2px,color:#4d1f12,rx:16,ry:16;
  classDef coreBox fill:#e3f6f0,stroke:#007a62,stroke-width:2px,color:#003f34,rx:16,ry:16;
  classDef commonBox fill:#f6f4ed,stroke:#77736d,stroke-width:2px,color:#2b2b2b,rx:16,ry:16;
  classDef legendSeam fill:#fff0ea,stroke:#a43f22,stroke-width:2px,color:#4d1f12,rx:6,ry:6;
  classDef legendCore fill:#e3f6f0,stroke:#007a62,stroke-width:2px,color:#003f34,rx:6,ry:6;
  classDef legendOwner fill:#f6f4ed,stroke:#77736d,stroke-width:2px,color:#2b2b2b,rx:6,ry:6;
  classDef legendText fill:transparent,stroke:transparent,color:#666666;

  class req seamBox;
  class fence,grant,runner coreBox;
  class route,deny,owner commonBox;
  class l1 legendSeam;
  class l2 legendCore;
  class l3 legendOwner;
  class lt1,lt2,lt3 legendText;

    style ESC fill:#FBFAF7,stroke:#5F5E5A,color:#444441
```

The worker itself never holds credentials; any privileged action a grant authorizes is carried
out by the runner on the worker's behalf.

## Notes

- No model adjudicates this boundary (CFG-10): the grant/deny/route line is a fixed category
  check, never an LLM decision.
- The worker never holds credentials (FENCE-3, SEC-3); authorization decides whether an action
  happens, the runner is what makes it happen.
- Deferred / extension points: the depth of capability-attestation conformance checking, and the
  manual-vs-assisted posture's exact tuning surface, are not specified here.

## Reconciles to

FENCE-1, FENCE-2, FENCE-3, CFG-10, GUARD-1, DOOR-1, DOOR-2, DOOR-3, EARN-1, EARN-2, STACK-4,
DRIVE-1.
