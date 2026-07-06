---
title: "2026-07-06 — EVRUN-full capture attempt"
status: blocked — EVRUN-full not proven
date: 2026-07-06
---

# 2026-07-06 — EVRUN-full capture attempt

## Probe

P11 attempted to convert the existing EVRUN-partial boundary into EVRUN-full evidence: a real
Codex app-server agent leg, real execution-host confinement evidence, real GitHub Issues / GitHub
Forge effects, records integrity, redaction, adversarial no-phone-home observation, and multi-run
idempotency.

The full path could not be run in this environment because the GitHub sandbox credentials and
records-integrity key required by the real-provider smoke were absent. This record therefore
captures the exact blocker plus the smaller P03/P04 smoke evidence that was available. It does not
claim EVRUN-full.

## Tool Version Pins

| Tool              | Version                                                                             |
| ----------------- | ----------------------------------------------------------------------------------- |
| Node.js           | `v26.4.0`                                                                           |
| pnpm              | `11.9.0`                                                                            |
| GitHub CLI (`gh`) | `2.87.2 (2026-02-20)`                                                               |
| Git               | `2.53.0`                                                                            |
| Codex CLI         | `codex-cli 0.142.5`                                                                 |
| Host              | `Darwin 25.5.0 RELEASE_ARM64_T6000 arm64`                                           |
| Jig checkout      | `95f5fd8785710ba14b9bcab0365438e0d3201012` (`feat: add export audit records (#69)`) |

## Inputs And Prerequisite Check

The capture checked only presence/absence for secret-bearing environment variables. No secret
values were printed or committed.

| Required input                           | Status             | Why it matters                                          |
| ---------------------------------------- | ------------------ | ------------------------------------------------------- |
| `GITHUB_TOKEN`                           | missing            | Required to seed/read the sandbox GitHub issue and PR.  |
| `GH_TOKEN`                               | missing            | Not required directly by the smoke, but no fallback.    |
| `JIG_GITHUB_ISSUES_REPOSITORY`           | missing            | Must point at the disposable sandbox repo.              |
| `JIG_GITHUB_ISSUES_LABEL`                | missing            | Must select the seeded candidate issue.                 |
| `JIG_RECORDS_INTEGRITY_KEY`              | missing            | Required to write and verify the integrity sidecar.     |
| `JIG_RECORDS_INTEGRITY_KEY_ID`           | missing            | Required key identity for interpretable evidence.       |
| `OPENAI_API_KEY`                         | missing            | No API key was available in the environment.            |
| `CODEX_APP_SERVER_SMOKE` / `EVRUN_SMOKE` | missing by default | Opt-in flags were supplied only for the invoked probes. |

## Probe Results

| Probe                                                                           | Result                                   | Evidence boundary                                                                                         |
| ------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `CODEX_APP_SERVER_SMOKE=1 ... codex-app-server.p3.smoke.test.ts` in the sandbox | failed: app-server exited unexpectedly   | Not product evidence; rerun below separated sandbox/process-start friction from the app-server path.      |
| Same Codex app-server smoke outside the sandbox                                 | passed                                   | Supports that the pinned Codex CLI can complete the P03 smoke's real app-server turn on this host.        |
| `EVRUN_SMOKE=1 ... real-host.p4.smoke.test.ts` in the sandbox                   | failed: `listen EPERM` on `127.0.0.1`    | Sandbox prevented the localhost bind needed by the host probe; not a containment result.                  |
| Same real-host smoke outside the sandbox                                        | passed                                   | Supports the P04 compose-time macOS attestation: `real-host`, `process-group`, proven/reported `weak`.    |
| `EVRUN_SMOKE=1 ... evrun-partial.smoke.test.ts`                                 | failed closed before network or mutation | Confirms the real GitHub path cannot run here without `GITHUB_TOKEN` and the other sandbox prerequisites. |

## Content Hashes

| Artifact                                              | SHA-256                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `raw/evrun-full-p11/2026-07-06-capture-transcript.md` | `7162927f31dfbbda7a1508e4e9116fc2d942c7d8c251070d0fd8cc4af7e93515` |

## Redaction

No tokens, API keys, credential URLs, Git askpass paths, or integrity keys are committed in this
record or the raw transcript. The environment check records only `present` / `missing` states for
credential-bearing names. The failed GitHub smoke stopped at the missing-token assertion before any
network call or sandbox repository mutation.

## Supported IDs

- P11-AC-1 is partially satisfied only in the fallback sense allowed by the phase: a dated,
  convention-complete evidence record exists and names exact limitations. It is not an EVRUN-full
  success record.
- P03 evidence refreshed: the pinned `codex-cli 0.142.5` app-server smoke completed successfully
  outside the sandbox.
- P04 evidence refreshed: the real-host macOS process-group attestation smoke completed
  successfully outside the sandbox and continues to prove only an honest `weak` posture.
- `SEC-2`, `RESUME-3`, `MERGE-2`, and `FENCE-3` are not claimed by this record. The combined real
  GitHub, real Codex, real host, integrity, no-phone-home, and idempotency path was not exercised.

## Routed Blockers

- **P11 full-run environment blocker:** provide sandbox-scoped GitHub credentials, sandbox
  repository configuration, and an environment-only integrity key before rerunning the real
  GitHub EVRUN path.
- **P11 scenario blocker:** the current committed smoke inventory has separate P03 app-server,
  P04 real-host, and EVRUN-partial scripted real-provider probes. A future full proof still needs a
  single scenario tying `agent: codex`, `executionHost: real`, `forge: github`,
  `workSource: github-issues`, integrity, redaction, no-phone-home observation, and multi-run
  idempotency together without silently fixing defects during capture.

## Limitations

This record is a blocked P11 capture attempt, not EVRUN-full. It does not demonstrate a real
Codex-edited GitHub PR, a combined real Codex plus real-host plus real Forge run, adversarial
no-phone-home behavior, multi-run idempotency against a landed effect, hosted/remote operation, or
Windows behavior. The successful Codex app-server and real-host probes were run outside the Codex
sandbox after sandbox-specific startup/listen failures; they support their narrow smoke assertions
only. The GitHub smoke did not reach network, Forge, records-integrity, redaction, or cleanup
behavior because required credentials were absent.
