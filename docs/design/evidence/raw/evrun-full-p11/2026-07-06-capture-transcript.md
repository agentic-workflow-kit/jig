# 2026-07-06 P11 EVRUN-full Capture Transcript

This transcript contains redacted, non-secret command output captured for the P11 EVRUN-full
evidence attempt. Secret-bearing variables were checked only for presence/absence.

## Checkout

```text
$ git rev-parse HEAD
95f5fd8785710ba14b9bcab0365438e0d3201012

$ git log -1 --oneline
95f5fd8 feat: add export audit records (#69)
```

## Tool Versions

```text
$ node --version
v26.4.0

$ corepack pnpm --version
11.9.0

$ git --version
git version 2.53.0

$ gh --version
gh version 2.87.2 (2026-02-20)
https://github.com/cli/cli/releases/tag/v2.87.2

$ codex --version
codex-cli 0.142.5
WARNING: proceeding, even though we could not create PATH aliases: Operation not permitted (os error 1)

$ uname -a
Darwin <redacted-hostname> 25.5.0 Darwin Kernel Version 25.5.0: Mon Apr 27 20:38:56 PDT 2026; root:xnu-12377.121.6~2/RELEASE_ARM64_T6000 arm64
```

## Required Environment Availability

```text
$ for name in CODEX_APP_SERVER_SMOKE EVRUN_SMOKE GITHUB_TOKEN GH_TOKEN JIG_GITHUB_ISSUES_REPOSITORY JIG_GITHUB_ISSUES_LABEL JIG_RECORDS_INTEGRITY_KEY JIG_RECORDS_INTEGRITY_KEY_ID OPENAI_API_KEY; do if [ -n "${(P)name}" ]; then print "$name=present"; else print "$name=missing"; fi; done
CODEX_APP_SERVER_SMOKE=missing
EVRUN_SMOKE=missing
GITHUB_TOKEN=missing
GH_TOKEN=missing
JIG_GITHUB_ISSUES_REPOSITORY=missing
JIG_GITHUB_ISSUES_LABEL=missing
JIG_RECORDS_INTEGRITY_KEY=missing
JIG_RECORDS_INTEGRITY_KEY_ID=missing
OPENAI_API_KEY=missing
```

## Codex App-Server Smoke

Sandbox run:

```text
$ CODEX_APP_SERVER_SMOKE=1 corepack pnpm exec vitest run packages/jig-sdk/tests/smoke/codex-app-server.p3.smoke.test.ts

 RUN  v4.1.9 <redacted-worktree>

 ❯ |smoke| packages/jig-sdk/tests/smoke/codex-app-server.p3.smoke.test.ts (1 test | 1 failed) 547ms
     × runs a real Codex app-server turn behind the opt-in smoke gate 546ms

 FAIL  |smoke| packages/jig-sdk/tests/smoke/codex-app-server.p3.smoke.test.ts > Codex app-server smoke > runs a real Codex app-server turn behind the opt-in smoke gate
AssertionError: expected a successful worker outcome, got failure (error: codex app-server exited unexpectedly)

 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  04:13:05
   Duration  676ms (transform 28ms, setup 0ms, import 37ms, tests 547ms, environment 0ms)
```

Rerun outside the sandbox after the process-start failure:

```text
$ CODEX_APP_SERVER_SMOKE=1 corepack pnpm exec vitest run packages/jig-sdk/tests/smoke/codex-app-server.p3.smoke.test.ts

 RUN  v4.1.9 <redacted-worktree>

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  04:13:33
   Duration  12.95s (transform 28ms, setup 0ms, import 37ms, tests 12.82s, environment 0ms)
```

## Real-Host Smoke

Sandbox run:

```text
$ EVRUN_SMOKE=1 corepack pnpm exec vitest run packages/jig-sdk/tests/smoke/real-host.p4.smoke.test.ts

 RUN  v4.1.9 <redacted-worktree>

 ❯ |smoke| packages/jig-sdk/tests/smoke/real-host.p4.smoke.test.ts (1 test | 1 failed) 7ms
     × compose-time macOS probe yields an honest process-group attestation 6ms

 FAIL  |smoke| packages/jig-sdk/tests/smoke/real-host.p4.smoke.test.ts > P04 real-host smoke > compose-time macOS probe yields an honest process-group attestation
Error: listen EPERM: operation not permitted 127.0.0.1

 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  04:13:12
   Duration  206ms (transform 90ms, setup 0ms, import 111ms, tests 7ms, environment 0ms)
```

Rerun outside the sandbox after the localhost bind failure:

```text
$ EVRUN_SMOKE=1 corepack pnpm exec vitest run packages/jig-sdk/tests/smoke/real-host.p4.smoke.test.ts

 RUN  v4.1.9 <redacted-worktree>

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  04:13:23
   Duration  499ms (transform 80ms, setup 0ms, import 103ms, tests 311ms, environment 0ms)
```

## GitHub EVRUN-Partial Smoke Recheck

```text
$ EVRUN_SMOKE=1 corepack pnpm exec vitest run packages/jig-sdk/tests/smoke/evrun-partial.smoke.test.ts

 RUN  v4.1.9 <redacted-worktree>

 ❯ |smoke| packages/jig-sdk/tests/smoke/evrun-partial.smoke.test.ts (1 test | 1 failed) 3ms
     × work-source to real forge landing records and verifies integrity with a scripted agent leg 3ms

 FAIL  |smoke| packages/jig-sdk/tests/smoke/evrun-partial.smoke.test.ts > EVRUN partial real-provider smoke > work-source to real forge landing records and verifies integrity with a scripted agent leg
AssertionError: set GITHUB_TOKEN for the sandbox GitHub smoke run

simple

 Test Files  1 failed (1)
      Tests  1 failed (1)
   Start at  04:13:51
   Duration  226ms (transform 107ms, setup 0ms, import 137ms, tests 3ms, environment 0ms)
```
