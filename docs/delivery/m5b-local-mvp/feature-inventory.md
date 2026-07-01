---
title: "M5b feature inventory"
status: draft
---

# M5b feature inventory

Priority is a client-value planning signal, not a schema, package, or tracker.

- **P0** — required for the first client-usable local MVP.
- **P1** — makes the MVP useful for small real local workflows.
- **P2** — reliability, safety, recovery, provider maturity, and hardening.
- **P3** — later integrations, dashboards, Learning-loop, analyzers, and polish.

| Feature                                 | Client value                                                               | Priority | Delivery placement                 |
| --------------------------------------- | -------------------------------------------------------------------------- | -------: | ---------------------------------- |
| Repo delivery foundation                | Lets Jig safely add runtime behavior with fixtures and checks.             |       P0 | Phase 0                            |
| `jig run <plan>` CLI                    | Gives the operator one obvious local entry point.                          |       P0 | Phase 1                            |
| Local plan file work source             | Lets users provide work without Jira, GitHub, Forge, or webhooks.          |       P0 | Phase 1                            |
| Minimal execution-plan parser/validator | Rejects bad input before any run exists.                                   |       P0 | Phase 1                            |
| Simple config                           | Lets users set workspace, agent command, and local run behavior.           |       P0 | Phase 1                            |
| Simple local policy                     | Enables a trusted local MVP without complex approvals.                     |       P0 | Phase 1                            |
| Local process host                      | Runs the configured worker command in a local workspace.                   |       P0 | Phase 1                            |
| Simple CLI-agent adapter                | Lets Jig invoke a local command or script as the worker.                   |       P0 | Phase 1                            |
| Sequential execution engine             | Executes local plan items and records success or failure.                  |       P0 | Phase 1                            |
| Local run logs/events                   | Lets users inspect what happened after a run.                              |       P0 | Phase 1                            |
| Human-readable summary                  | Shows outcome, failed item if any, and record location.                    |       P0 | Phase 1                            |
| Invalid-plan rejection                  | Prevents malformed or incompatible input from becoming a run.              |       P0 | Phase 1                            |
| Agent failure capture                   | Records exit code, stdout/stderr, and failed work item.                    |       P0 | Phase 1                            |
| Basic fixture examples                  | Gives users copyable minimal plan and config examples.                     |       P0 | Phase 1                            |
| Multi-item sequential plans             | Lets users run small real workflows, not only one toy task.                |       P1 | Phase 2                            |
| Simple dependency handling              | Supports non-trivial local ordering without broad DAG hardening.           |       P1 | Phase 2                            |
| `jig inspect <run>`                     | Lets users inspect run state from local records.                           |       P1 | Phase 2                            |
| Better validation diagnostics           | Makes authoring local plans practical.                                     |       P1 | Phase 2                            |
| Workspace diff / changed-files capture  | Shows what the worker changed.                                             |       P1 | Phase 2                            |
| Dry-run versus local-run clarity        | Makes side-effect posture explicit.                                        |       P1 | Phase 2                            |
| Basic policy denial                     | Lets Jig reject unsafe or out-of-scope local requests.                     |       P1 | Phase 3                            |
| Minimal local approval prompt           | Lets users approve or reject routed local actions.                         |       P1 | Phase 3                            |
| Grant / deny / route authorization      | Makes policy meaningful in the local runner.                               |       P1 | Phase 3                            |
| Decision records                        | Captures policy and approval decisions as inspectable evidence.            |    P1/P2 | Phase 3                            |
| Rule-governing change guard             | Prevents work from changing its own rules without approval.                |       P2 | Phase 3 or 4                       |
| Resume after stop/failure               | Lets users continue interrupted work.                                      |       P2 | Phase 4                            |
| No-double-effect recovery proof         | Prevents repeating already-recorded irreversible effects.                  |       P2 | Phase 4                            |
| Stop/notice/resume causality            | Makes recovery and diagnosis reconstructible.                              |       P2 | Phase 4                            |
| Redaction/export posture                | Allows safer diagnostics and sharing.                                      |       P2 | Phase 4                            |
| Workspace continuity on resume          | Prevents silent execution-environment drift.                               |       P2 | Phase 4                            |
| Execution-host containment proof        | Supports honest isolation and SEC-2 claims.                                |       P2 | Phase 5                            |
| Provider conformance gates              | Lets providers plug in without stealing core semantics.                    |       P2 | Phase 5                            |
| Real agent provider integration         | Moves beyond the simple CLI command adapter.                               |       P2 | Phase 5                            |
| Forge/GitHub integration                | Supports PR and merge workflows through runner-owned authority.            |    P2/P3 | Phase 5                            |
| Work-source integrations                | Imports candidates from issue trackers or other sources.                   |       P3 | Phase 5+                           |
| TUI/dashboard                           | Improves live visibility and repeated operator use.                        |       P3 | Phase 5+                           |
| Learning loop                           | Converts representative run records into hardening recommendations.        |       P3 | After representative records exist |
| Policy analyzer                         | Tunes policy strictness and noise from run history.                        |       P3 | Later                              |
| Repo gardening checks                   | Converts recurring doc/design defects into checks, fixtures, or templates. |    P2/P3 | Phase 4 or 5 opportunistically     |

## Inventory Notes

- P0 uses local inputs and local execution only. It must not require GitHub, Forge, remote hosts,
  Learning-loop consumers, provider manifests, or full observability projections.
- P1 turns the first local run into a useful small workflow runner while keeping provider and
  recovery hardening out of the first MVP.
- P2 hardens trust, recovery, and provider seams once the local runner produces real records.
- P3 starts only after the local record corpus is representative enough for integrations and
  analyzers to consume.
