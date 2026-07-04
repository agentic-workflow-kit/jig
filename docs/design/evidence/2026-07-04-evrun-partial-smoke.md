---
title: "2026-07-04 — EVRUN partial real-provider smoke evidence"
status: applied — coordinator privileged run 2026-07-04
date: 2026-07-04
---

# 2026-07-04 — EVRUN partial real-provider smoke evidence

## Probe

EVRUN-partial exercises one real `work-source -> forge -> records-integrity` run against the
disposable sandbox repository `agentic-workflow-kit/jig-smoke-target`. The work source is GitHub
Issues, the Forge is GitHub, the run record is written by Jig, and the integrity sidecar is verified
over the run directory. The agent leg is scripted/injected through `scriptedOutput`.

This record was authored before the privileged run and filled by the coordinator afterward, from the
values emitted by `tests/smoke/evrun-partial.smoke.test.ts` run with the sandbox-scoped token and a
fresh, uncommitted integrity key. The run's `run.json` and `integrity.json` are git-ignored local
captures (`runs/` is not committed), so per the evidence convention they are cited below by content
hash rather than committed. The pull request the run opened was closed and its branch deleted during
sandbox cleanup after capture; the durable evidence is the content-hashed run record, not the PR.

## Tool Version Pins

| Tool              | Version                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------- |
| Node.js           | `v26.4.0`                                                                                |
| GitHub CLI (`gh`) | `2.87.2 (2026-02-20)`                                                                    |
| Git               | `2.53.0`                                                                                 |
| Jig checkout      | `cef76689252b18296e7e9e1e59fa8ce7a01850b6` (base; run driven by this PR's smoke harness) |

## Inputs

- Smoke repository: `agentic-workflow-kit/jig-smoke-target`
- Seed issue title: `EVRUN partial smoke seed: scripted real-provider run`
- Seed issue label: `jig-candidate`
- Seed issue body:

```json
{
  "plan": {
    "id": "evrun-partial-smoke",
    "version": "execution-plan-shape-v0",
    "stories": [
      {
        "id": "EVRUN-PARTIAL-SMOKE",
        "title": "Apply the EVRUN partial scripted smoke edit",
        "scope": ["evrun-partial-smoke.txt"],
        "authority": {
          "requests": ["edit-files", "run-checks"]
        }
      }
    ]
  }
}
```

## Run Summary

| Field                     | Value                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| Run ID                    | `run-evrun-partial-smoke-1783161353667-4d226400-29a9-47e5-a128-bf387c372921`              |
| Pull request URL          | `https://github.com/agentic-workflow-kit/jig-smoke-target/pull/3` (closed during cleanup) |
| Landing families observed | `runner-action.opened-pr`                                                                 |
| Final status              | `success`                                                                                 |
| Integrity verification    | `verified`                                                                                |

## Content Hashes

| Artifact         | SHA-256                                                            |
| ---------------- | ------------------------------------------------------------------ |
| `run.json`       | `15f2c4a2cda5b074119df525cabea425e874ff5f93a3618e3db3568ba425079b` |
| `integrity.json` | `ba08ea2bcbc149eb5e3f530c3c60be26c2248c6cf57e27076967a9032628adf3` |

## Redaction

No tokens or credentials appear in this record. The sandbox repository name
`agentic-workflow-kit/jig-smoke-target` is named intentionally; the owner confirmed on 2026-07-04
that this disposable sandbox name is safe to cite. The privileged token remained outside this
worktree and was supplied only in the environment of the coordinator's single real-run command. The
smoke test asserts `run.json` and `integrity.json` are free of the token, `x-access-token`, the
askpass path, and credential-URL patterns before hashing them; the emitted evidence facts carry only
run id, PR URL, landing families, status, and the two content hashes. The coordinator additionally
ran an independent secret scan over the emitted facts (token, `x-access-token`, credential-URL,
integrity-key checks) — clean. The integrity HMAC key was a fresh, uncommitted, env-only value and by
construction never enters the record (`integrity.json` carries only the digest and a non-sensitive
`keyId`, `evrun-partial-smoke-2026-07-04`).

## Supported IDs

- M7 exit evidence: supports the local M7 exit criteria that real effects are recorded in durable,
  inspectable records and that records-integrity is present for real-provider runs
  ([M7 README](../../delivery/m7-real-providers/README.md#org-m7-exit-criteria--phase-map);
  [repo plan local exit criteria](../../delivery/m7-real-providers/repo-plan-m7.md#repo-plan-for-m7)).
- Coordinator decision: EVRUN-partial closes M7 per `.github` PR #17 decision 1 / D1 Option A
  supplied by the coordinator for this task. This is partial evidence, not EVRUN-full.
- P7-AC-1: the runner drives a real Forge landing and a real GitHub PR effect occurs.
- P7-AC-2: the smoke selects the concrete `open-pr` landing action from the action union.
- P8-AC-1: the GitHub Issues work-source candidate reaches scheduling only through
  `validateCandidate`.
- P8-AC-3: the run record includes the GitHub Issues candidate origin.
- P9-AC-1: the run writes and verifies the HMAC integrity sidecar over the durable record chain.
- Product guarantees directly exercised by this smoke record: `SEE-1`, `SEE-2`, `SEE-3`.
- Related guarantees intentionally not claimed by this single success-path scripted run: `FENCE-3`,
  `MERGE-2`, `MERGE-5`, `SEC-3`, `STACK-2`, `STACK-5`, and `DRIVE-1`. Those require broader
  phase/conformance evidence outside this record.

## Limitations

This is EVRUN-partial. The agent leg is scripted/injected through `scriptedOutput`; it is not a
Codex-driven real agent run and does not prove EVRUN-full, real Codex editing, real execution-host
confinement, or adversarial no-phone-home behavior. It is a single run against a disposable sandbox,
so it does not prove general GitHub availability, branch-protection behavior, merge-queue behavior,
multi-run idempotency, or hosted/remote operation. It proves only that the current Jig wiring can
import one real issue candidate, land one prepared scripted edit through the real Forge PR path, write
durable records, and verify the integrity sidecar for that run under the pinned tool versions above.
