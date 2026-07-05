---
title: "Phase 07 - Guided setup"
status: planned
---

# Phase 07 - Guided setup

## Overview

Deliver the guided setup surface: `jig setup` maps owner intent to a starting configuration —
provider posture, policy template, work-profile template — with stated reasoning, always
overridable. It also makes the declared workspace setup command explicit so CFG-9 can skip that
command when the workspace is already fresh. Ship the first policy/work-profile templates as
supported assets.

## Background

The product's "Driving a run" begins with setup: "pick the track you are configuring, choose
the provider posture you want to start with, and get an understandable policy and work profile
from templates before you tune them" (`CFG-5`), with presets as "strong defaults with stated
reasoning" (`CFG-6`). Separately, `CFG-9` says the owner declares a workspace setup command
(for example, dependency installation) and Jig runs that command only when the workspace is
stale. None of this exists: there is no guided setup surface, no owner-facing setup-command
declaration, no templates, and the fixture policy files are test assets, not owner-facing
starting points. Phase 06 gives this phase its subject matter — validated policy, work-profile,
floors artifacts, and setup-command configuration to instantiate.

## What To Do

- Route setup placement first: the product requires `jig setup`, but the active driving
  contract does not yet name `setup` as a driving action. Decide with the driving/configuration
  owners whether setup is an operator-control port verb, a configuration operation, or a
  CLI-only guided setup surface, then implement the settled placement.
- Implement the settled intent-to-configuration flow: select a provider posture
  (reference/scripted posture versus the real drivers that exist by then), emit a policy and
  work profile from templates into the track's configuration location, and explain each preset
  choice in plain output.
- Author the first template set as supported assets in the SDK/CLI packages (not in
  `tests/fixtures/`): at minimum a conservative manual-gating template and an assisted-mode
  template, each carrying its reasoning inline (`CFG-6` — reasoning is part of the preset).
- Implement the `CFG-9` setup-command rule separately from guided reconfiguration: capture the
  owner-declared workspace setup command, define the freshness/staleness check P06 can validate,
  and make command execution skip when the workspace is fresh and run only when stale.
- Current valid configuration must not be silently clobbered, but it must not block intentional
  reconfiguration. Re-running guided setup either no-ops with an explanation or requires an
  explicit owner intent to replace/regenerate the selected templates.
- Leave room for `CFG-8` prompt-strategy guidance in the work-profile template shape (a guided
  field with versioned guidance reference), without authoring the full guidance corpus.
- Update README/AGENTS command surface docs in the same PR.

## Why

- `CFG-5`, `CFG-6`, `CFG-9`, with a hook for `CFG-8`
  ([guarantee 2](../../../product/guarantees.md#2-configuration-ownership)).
- Product requires a setup surface, while the driving contract's current action vocabulary does
  not include setup; this phase routes that design placement before implementation
  ([driving contract](../../../design/contracts/driving.md)).
- Makes the P06 artifacts adoptable: without templates, only fixture-literate users can
  configure Jig.

## Technical Requirements

- Setup is an edge/configuration surface: it writes configuration artifacts and records what it
  did in the settled location; it holds no run logic and makes no policy decisions beyond
  instantiating a chosen template.
- Every emitted artifact passes the same boundary validation P06 built — templates cannot
  bypass validation.
- Templates are versioned content; a template change is reviewable prose, not code.
- One setup invocation, one audit-visible record of what was emitted and why; if setup becomes a
  driving action, the one-action invariant applies to invalid input too.
- No interactive-TTY hard dependency: intent can arrive as flags/answers file so the action
  works headlessly (the interactive prompt is presentation).

## Reference Files

- [`product/jig.md` — Driving a run](../../../product/jig.md#driving-a-run);
  [`product/guarantees.md`](../../../product/guarantees.md) `CFG-5/6/8/9`
- [Driving contract](../../../design/contracts/driving.md)
- [`design/domain/configuration-and-work.md`](../../../design/domain/configuration-and-work.md)
- Source: `src/cli.ts` (adapter pattern from P01), P06's validation modules
- Prior art for owner-facing refusals: `src/loaders.ts` error style

## Dependencies

- **Requires:** P06 (hard — the artifacts and validation it instantiates).
- **Soft:** P01's port shape (in place well before this phase).
- **Unlocks:** feeds P14.
- **Parallel:** anything not touching config artifacts (P03, P04, P05, P08–P10, P12).

## Acceptance Criteria

1. The design placement is recorded before implementation. `jig setup` on a new track
   produces a valid policy + work profile from a chosen template and posture, with printed
   reasoning for each preset, and the settled audit trail shows one setup invocation.
2. Every emitted artifact validates under P06 rules (test: emit, then launch a fixture run with
   the emitted config).
3. Re-running guided setup against current valid configuration either no-ops with an explanation
   or requires explicit owner intent before replacing/regenerating templates; no path silently
   clobbers owner configuration.
4. The declared workspace setup command follows `CFG-9` both directions: it skips when freshness
   evidence says the workspace is current and runs only when the workspace is stale or missing
   required setup output.
5. Headless invocation works (flags/answers file); interactive mode is a presentation layer
   over the same call.
6. Templates live outside `tests/fixtures/`; the fixture-conventions check is untouched.
7. Docs updated: README/AGENTS list `setup`; goldens byte-identical.

## Verification

- `pnpm check`; integration test covering emit-then-run round trip; unit tests for guided
  reconfiguration/no-clobber behavior and setup-command freshness/staleness paths.
- Reviewer axes: template reasoning quality (owner-readable), no run logic at the edge,
  validation non-bypass, headless parity.

## Out Of Scope

- The broader setup-integration ordering the product leaves open (MCP surface setup, local
  skills, sibling tools) — see stop rule.
- The full `CFG-8` prompt-strategy guidance corpus.
- Track/multi-track management tooling beyond configuring one track.
- Provider installation or discovery (ecosystem question is out of track scope).

## Stop Or Escalate If

- The template set forces a position on which setup integrations to guide first — the product
  keeps this open ([`jig.md` open questions](../../../product/jig.md#open-questions)); ship the
  policy/work-profile/provider-posture minimum and route the broader ordering to the owner.
- A template needs a policy dimension P06 shipped as bound-but-inert — surface it rather than
  presenting a preset that implies enforcement that does not exist.
