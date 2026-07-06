---
title: "2026-07-06 - EVRUN-full combined smoke"
status: recorded - combined real-provider path passed; stronger probes remain open
date: 2026-07-06
---

# 2026-07-06 - EVRUN-full combined smoke

## Probe

This record captures the first successful combined EVRUN-full smoke path in the disposable
repository `agentic-workflow-kit/jig-smoke-target`: GitHub Issues work source, real Codex
app-server agent leg, macOS real execution-host attestation, real GitHub Forge `open-pr`
landing, records integrity, and redaction checks in one operator-initiated run.

The run used the smoke scenario added on branch `evidence/p11-evrun-full-capture` at
`packages/jig-sdk/tests/smoke/evrun-full.smoke.test.ts`. The base checkout before this branch's
changes was `dcffa56d5059414f50ba32c1d23f225b96b8698c`; the smoke harness itself is part of this
evidence PR. The disposable seed issue was
`https://github.com/agentic-workflow-kit/jig-smoke-target/issues/13`.

## Tool Version Pins

| Tool              | Version                                        |
| ----------------- | ---------------------------------------------- |
| Node.js           | `v26.4.0`                                      |
| pnpm              | `11.9.0`                                       |
| GitHub CLI (`gh`) | `2.87.2 (2026-02-20)`                          |
| Git               | `2.53.0`                                       |
| Codex CLI         | `codex-cli 0.142.5`                            |
| Host              | `Darwin 25.5.0 RELEASE_ARM64_T6000 arm64`      |
| Jig base checkout | `dcffa56d5059414f50ba32c1d23f225b96b8698c`     |
| Jig smoke harness | branch `evidence/p11-evrun-full-capture`       |
| Git transport     | HTTPS with token-backed environment Git config |

## Invocation

The operator supplied GitHub credentials and the records-integrity key via environment variables.
Secret values were not printed.

```bash
GITHUB_TOKEN="$(gh auth token)" \
GH_TOKEN="$(gh auth token)" \
EVRUN_FULL_SMOKE=1 \
EVRUN_FULL_KEEP_ARTIFACTS=1 \
JIG_GITHUB_ISSUES_REPOSITORY=agentic-workflow-kit/jig-smoke-target \
JIG_GITHUB_ISSUES_LABEL=jig-candidate \
JIG_RECORDS_INTEGRITY_KEY="<operator-provided one-off key>" \
JIG_RECORDS_INTEGRITY_KEY_ID="p11-evrun-full-capture-<timestamp>" \
EVRUN_FULL_EVIDENCE_OUT=/private/tmp/jig-p11-evrun-full-evidence.json \
corepack pnpm exec vitest run packages/jig-sdk/tests/smoke/evrun-full.smoke.test.ts
```

Result:

```text
Test Files  1 passed (1)
Tests       1 passed (1)
Duration    66.62s
```

## Result Summary

| Field            | Value                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Run ID           | `run-evrun-full-smoke-1783351643050-94edb35a-5f62-4315-a4b9-79320e60beb8`                  |
| Run status       | `success`                                                                                  |
| Drivers          | `agent: codex`, `executionHost: real`, `forge: github`, `workSource: github-issues`        |
| Smoke PR         | `https://github.com/agentic-workflow-kit/jig-smoke-target/pull/17` (closed during cleanup) |
| Landing outcome  | `opened-pr`                                                                                |
| Landing family   | `runner-action.opened-pr`                                                                  |
| Integrity status | `verified`                                                                                 |
| `run.json` hash  | `30d8ada63f99ef1298e2bed78789f89a4f5eca658f5bd799b3f642783f280a88`                         |
| `integrity` hash | `62a1e7795d880e2057e80b80f6d20a9fa54abfcdc226f46a217626f81a7f7898`                         |

## Observed Codex Leg

The Codex app-server observation reported `driver: codex-app-server`, `cliVersion: 0.142.5`,
`threadResumed: false`, and `finalTurnStatus: completed`.

Codex completed these story commands, including the real edit, commit, and token-backed HTTPS push:

| Command family                 | Outcome     |
| ------------------------------ | ----------- |
| `git rev-parse --abbrev-ref`   | `completed` |
| `git add evrun-full-smoke.txt` | `completed` |
| `git commit -m ...`            | `completed` |
| `git push -u ...`              | `completed` |

The adapter relayed and recorded owner approvals for `git add`, `git commit`, and `git push`.
The smoke then verified that the remote branch head matched the local Codex-authored commit before
accepting the GitHub `open-pr` landing evidence.

## Host Attestation

| Field                            | Value             |
| -------------------------------- | ----------------- |
| Driver ID                        | `real-host`       |
| Run context                      | `local-real-host` |
| Positive                         | `true`            |
| Containment mechanism            | `process-group`   |
| Reported isolation strength      | `weak`            |
| Proven isolation strength        | `weak`            |
| Negative egress observed outcome | `ambiguous`       |

## Redaction

The emitted evidence facts and generated run artifacts were checked for GitHub tokens, `GH_TOKEN`,
`GITHUB_TOKEN`, Git askpass paths, credential URLs, and the records-integrity key. No secret values
are committed in this record. The raw local run directory remains outside the repository under the
operator temp directory and is not a durable source of truth.

## Supported IDs

- P11-AC-1 is now satisfied for the committed evidence-record requirement: this dated record is
  indexed, includes version pins, hashes, redaction posture, and limitations.
- P11-AC-2 is partially satisfied: this run demonstrates real Codex editing through the owned
  app-server transport, real macOS execution-host attestation with honest `weak` strength, real
  GitHub Issues / Forge effects, records integrity, and redaction on the combined path.
- `MERGE-2` and `FENCE-3` gain a real combined-path `open-pr` observation, but held-merge replay
  and block-surfacing legs remain covered by unit or narrower smoke evidence.
- `SEC-2` is not closed by this record because the no-phone-home observation is `ambiguous`, not a
  strong adversarial proof.
- `RESUME-3` is not closed by this record because multi-run idempotency against the same real
  landed effect was not exercised.

## Limitations

This is a successful combined EVRUN-full smoke, not a complete closure of every P11 hard probe. It
does not prove strong no-phone-home behavior, multi-run idempotency against a repeated real effect,
held-merge replay, hosted/remote execution, Windows behavior, or a managed daemon posture. The
landing was intentionally limited to opening and then closing a disposable PR in
`agentic-workflow-kit/jig-smoke-target`; no production repository was touched.
