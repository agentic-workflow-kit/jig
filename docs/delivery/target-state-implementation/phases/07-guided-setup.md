---
title: "Phase 07 - Guided setup"
status: planned
---

# Phase 07 - Guided setup

## Overview

Deliver the guided setup surface: a `jig setup` driving action that maps owner intent to a
starting configuration — provider posture, policy template, work-profile template — with stated
reasoning, always overridable, plus the staleness rule that setup only runs when the workspace
is stale. Ship the first policy/work-profile templates as supported assets.

## Background

The product's "Driving a run" begins with setup: "pick the track you are configuring, choose
the provider posture you want to start with, and get an understandable policy and work profile
from templates before you tune them" (`CFG-5`), with presets as "strong defaults with stated
reasoning" (`CFG-6`) and a stale-workspace-only rule (`CFG-9`). None of this exists: there is no
setup command, no templates, and the fixture policy files are test assets, not owner-facing
starting points. Phase 06 gives this phase its subject matter — validated policy, work-profile,
and floors artifacts to instantiate.

## What To Do

- Add a `setup` driving action as a thin adapter over the operator-control port: an
  intent-to-configuration flow that selects a provider posture (reference/scripted posture
  versus the real drivers that exist by then), emits a policy and work profile from templates
  into the track's configuration location, and explains each preset choice in plain output.
- Author the first template set as supported assets in the SDK/CLI packages (not in
  `tests/fixtures/`): at minimum a conservative manual-gating template and an assisted-mode
  template, each carrying its reasoning inline (`CFG-6` — reasoning is part of the preset).
- Implement the `CFG-9` staleness rule: setup refuses to clobber a current, valid configuration
  and says why; a stale or missing workspace configuration proceeds.
- Leave room for `CFG-8` prompt-strategy guidance in the work-profile template shape (a guided
  field with versioned guidance reference), without authoring the full guidance corpus.
- Update README/AGENTS command surface docs in the same PR.

## Why

- `CFG-5`, `CFG-6`, `CFG-9`, with a hook for `CFG-8`
  ([guarantee 2](../../../product/guarantees.md#2-configuration-ownership)).
- The driving contract's action vocabulary — setup joins as a deliberate, recorded action
  ([driving contract](../../../design/contracts/driving.md)).
- Makes the P06 artifacts adoptable: without templates, only fixture-literate users can
  configure Jig.

## Technical Requirements

- Setup is an edge action: it writes configuration artifacts and records what it did; it holds
  no run logic and makes no policy decisions beyond instantiating a chosen template.
- Every emitted artifact passes the same boundary validation P06 built — templates cannot
  bypass validation.
- Templates are versioned content; a template change is reviewable prose, not code.
- One setup action, one audit-visible record of what was emitted and why (the one-action
  invariant applies to invalid input too).
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

1. `jig setup` on a fresh track produces a valid policy + work profile from a chosen template
   and posture, with printed reasoning for each preset, and the run record/audit trail shows
   one setup action.
2. Every emitted artifact validates under P06 rules (test: emit, then launch a fixture run with
   the emitted config).
3. Setup against a current, valid configuration refuses with an explanation; against a stale or
   missing one it proceeds (`CFG-9` both directions).
4. Headless invocation works (flags/answers file); interactive mode is a presentation layer
   over the same call.
5. Templates live outside `tests/fixtures/`; the fixture-conventions check is untouched.
6. Docs updated: README/AGENTS list `setup`; goldens byte-identical.

## Verification

- `pnpm check`; integration test covering emit-then-run round trip; unit tests for staleness
  and refusal paths.
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
