---
title: "2026-07-04 - N1A-P01/P02/P03 app-server surface, readiness, and parentage"
status: captured - N1a evidence
date: 2026-07-04
---

# 2026-07-04 - N1A-P01/P02/P03 app-server surface, readiness, and parentage

## Header

| Field                | Value                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| ISO date             | 2026-07-04                                                                                               |
| Probe IDs            | N1A-P01, N1A-P02, N1A-P03                                                                                |
| Probe titles         | App-server surface discovery and version pin; broker readiness and availability; owned process parentage |
| Author/runner        | codex implementer, N1a capture session                                                                   |
| Target host OS       | macOS 26.5.1, arm64; app-server reported `platformFamily=unix`, `platformOs=macos`                       |
| Target Codex version | `codex-cli 0.142.5`; app-server `userAgent` reported `n1a-probe/0.142.5`                                 |

Grouped record: the same startup, schema, and owned-process captures establish the available surface,
readiness signal, and parent process evidence.

## Supports

- N1A-P01: pins the current app-server schema, method inventory, CLI version, and managed-daemon
  availability.
- N1A-P02: records the readiness signal available over `codex app-server --listen stdio://`.
- N1A-P03: records process parentage for a harness-owned app-server process.
- Feeds the N1b transport ADR and R3 by distinguishing the managed daemon path from the directly
  owned stdio app-server path.

## Method

1. Ran `codex --version`.
2. Ran `codex app-server generate-json-schema --out <tmpdir>` and stored the v2 aggregate schema
   plus derived method inventories.
3. Ran `codex app-server daemon version` before any managed daemon was present.
4. Attempted `codex app-server daemon start && codex app-server daemon version && codex app-server daemon stop`.
5. Started `codex app-server --listen stdio://` from the Node probe harness, sent `initialize`, then
   sent `initialized`.
6. Captured a macOS `ps -o pid,ppid,pgid,sess,stat,command -p <pid>` snapshot from the harness for
   the owned app-server child process.

## Captured material

| Artifact                                                                        | SHA-256                                                            |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/design/evidence/raw/n1a/schema/daemon-version-transcript.txt`             | `f8cee7fe13699d84b24f6b253282a09be764bbc604a898168d87f5024cc9d08f` |
| `docs/design/evidence/raw/n1a/schema/codex_app_server_protocol.v2.schemas.json` | `2d3a7fa3478b83be50135349803face8424172e91412375085bf17445e2a8903` |
| `docs/design/evidence/raw/n1a/schema/client-methods.txt`                        | `31521b2f4bc2b95320f44e042ca299add1b0cc9400c0f84f451cb1a93561d115` |
| `docs/design/evidence/raw/n1a/schema/server-request-methods.txt`                | `a4a2ad13a54a59ed00cae9b33418067927f48b5d1d9a6420db868c6d8f001471` |
| `docs/design/evidence/raw/n1a/schema/server-notification-methods.txt`           | `38132f4918d33da63f0c6ac3ddde00ba59f2c23eaa76d0bb48756fd9619308df` |
| `docs/design/evidence/raw/n1a/p02-handshake.jsonl`                              | `3e9c8d987523385b2131ef81170512cbc163d54772aa0c5d3505396f699382b2` |
| `docs/design/evidence/raw/n1a/p10-cleanup.jsonl`                                | `cd5de0eb1d397a9dc0fc42e7279dad26e31cb05f026253d16037e16ba7f584aa` |

Inventory counts from the derived schema files: 87 client request methods, 10 server request methods,
and 68 server notification methods.

## Result

The app-server schema was generated successfully and includes thread, turn, approval, interrupt,
resume, command, filesystem, account, MCP, and remote-control surfaces. `initialize` over
`--listen stdio://` produced a structured response with `userAgent`, redacted `codexHome`,
`platformFamily=unix`, and `platformOs=macos`, followed by
`remoteControl/status/changed` with status `disabled`.

The managed daemon path could not be started on this host. `daemon version` failed when no control
socket existed, and `daemon start` failed because the standalone Codex installer path was absent.
The directly spawned stdio app-server was usable without the managed daemon.

For parentage, the harness-owned app-server child had an observable PID, PPID, process group, and
session in `ps`. The capture ties that OS process to the same harness run that sent app-server
requests.

## Limitations

This proves the schema and directly owned stdio path available on this macOS host for Codex 0.142.5.
It does not prove the managed daemon lifecycle because the standalone installer-managed daemon was
not available. It also does not prove a stable mapping from every app-server thread or turn ID back
to an OS process; it proves only that the harness owned the app-server process it controlled.

## Redaction

Redaction was applied. The raw captures replace the local home directory, local temp paths, local
hostname, installation ID, thread/session/turn/item/environment IDs, account rate-limit snapshots,
and auth-like fields with placeholders. No unresolved redaction ambiguity remains in this record.

## Decision input

N1b should treat `--listen stdio://` as a live, ownable app-server surface on this host, but should
not assume the managed daemon path is available without the standalone Codex installer. If N1b needs
hard process ownership, the stdio child process path has stronger evidence here than the daemon path.
