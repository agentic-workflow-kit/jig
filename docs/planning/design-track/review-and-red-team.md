---
title: "Jig — design-track review and red team"
status: draft — integration
---

# Design-track review and red team

This is the U9 collector for two planning-track concerns:

1. the review checklist a later design authoring session or milestone reviewer should apply across
   the committed wave set;
2. the red-team posture already allocated across Waves 4b, 5, and 6, especially the SEC-2 and
   recovery/records seams.

This file does **not** invent new findings. Where a Wave 5 story only prescribes a future probe, the
collector records scope and routing only.
It supersedes the temporary continuation handoff for review-routing purposes, alongside
[`dependency-dag.md`](./dependency-dag.md), [`waves.md`](./waves.md), and
[`traceability.md`](./traceability.md).

## Design-review checklist

### Track-wide checklist

- [ ] Story ownership matches the committed `reconciles_to` frontmatter; no product ID is silently
      widened, dropped, or re-assigned.
- [ ] `docs/product/**` remains the source of truth for product promises; planning docs route
      contradictions back instead of settling them locally.
- [ ] `docs/design/**` targets are deepened in place where the wave decisions say so, and the two v0
      contracts stay cited and unfrozen.
- [ ] Product IDs, `INV-*`, and M5a handoff categories remain distinct namespaces.
- [ ] New invariant names stay as candidates unless a source has already settled numbering.
- [ ] Cross-wave `D-###` references name the source wave when they refer outside the local unit.

### Core and seam checklist

- [ ] Wave 1 still owns the entity and ownership map; later waves do not redefine Track, Execution
      plan, Policy, Work profile, Repo-level floors, Run, Evidence, or Notice.
- [ ] Wave 2 owns lifecycle sequencing; later waves cite state/guard semantics rather than
      re-authoring them.
- [ ] Wave 3 owns seam shapes; Wave 4a owns core internals; Wave 4b implements providers against
      those seams and consumes Wave 4a contracts read-only.
- [ ] Wave 4a's `w4-s4` remains the only committed internal story DAG; Wave 4b's shared
      `providers.md` file is treated as contention, not as a logical dependency.
- [ ] GUARD-2 keeps the three-way seam from Wave 4a D-003: `w4-s2` rule, `w4-s3` enforcement, Wave
      2 pause point.

### Provider-boundary checklist

- [ ] No provider story redefines core policy, evidence sufficiency, authorization, or lifecycle
      semantics.
- [ ] Agent / Execution host seam sharing is checked for consistent meaning: the worker runs inside
      the execution host, and the host's isolation strength is what SEC-2 is verified against.
- [ ] Provider-side attestation claims stay provider-supplied, while freshness/sufficiency judgment
      stays with `w4-s3`.
- [ ] The open provider file-split question remains a future `DocStructurePlan` decision, not a U9
      planning-track decision.

### Recovery and records checklist

- [ ] Records stay append-only and projection-derived; no recovery flow creates a second narrative of
      what happened.
- [ ] Resume preserves launch bindings, no-double-effect, and the bound evidence model.
- [ ] Bootstrap re-entry, storage preflight, and run-lifecycle semantics remain consistent across
      Wave 2 and Wave 4a.
- [ ] Wave 5 recovery/records probes are routed back to existing owners or U9 rather than silently
      rewritten in place.

## Red-team collection

### SEC-2 collection boundary

The committed planning source splits SEC-2 three ways. U9 keeps that split exact:

| Layer                       | Owner                                                                                                               | What is owned here                                                                                                                                                    | What is explicitly not owned here                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Design posture / proof seed | [`w4-s6-execution-host-provider`](./waves/wave-4b-providers/stories/w4-s6-execution-host-provider.md)               | Confinement must be proven, not asserted; isolation-strength categories; honest containment reporting; the proof requirement/seed that feeds Wave 4a's evidence model | The full adversarial phone-home scenario; U9 collection; freshness/sufficiency judgment in `w4-s3` |
| Adversarial scenario        | [`w5-s1-authority-and-provider-red-team`](./waves/wave-5-red-team/stories/w5-s1-authority-and-provider-red-team.md) | The phone-home attack surface, probe sequence, contradiction checks, and routed gaps                                                                                  | Re-authoring the `w4-s6` design posture or pulling collection into Wave 5                          |
| Integration collector       | this file                                                                                                           | Puts the two prior layers side by side so SEC-2 is neither duplicated nor orphaned                                                                                    | Inventing probe findings that the Wave 5 story only prescribes                                     |

Reviewers should check the SEC-2 seam with four questions:

- [ ] Does the execution-host design require proof of confinement rather than a trusted self-report?
- [ ] Does the red-team scenario stress exactly that proof surface rather than re-owning the design?
- [ ] Does U9 keep the design posture and the adversarial scenario as separate artifacts with a
      single collector view?
- [ ] Does later implementation phasing treat SEC-2 as a hardening/gate input rather than a first
      slice assumption?

### Authority and provider red-team surface

Wave 5's `w5-s1` owns the authority/provider probe package. Its standing review questions are:

- [ ] Can a provider widen its own authority, or does every request still cross the Fence?
- [ ] Are stale or missing capability claims reduced to less autonomy rather than a weakened
      guarantee?
- [ ] Does the provider boundary hold under adversarial pressure: provider reads core contracts,
      core judges the claims?
- [ ] Are `STACK-2`, `STACK-4`, `DRIVE-1`, `DRIVE-3`, `EARN-2`, and `SEC-2` all still covered by an
      actual story owner after the probe is routed?

### Recovery / records / bootstrap integration surface

Wave 5's `w5-s2` owns the recovery/records/bootstrap probe package. The standing checks U9 collects
from that story are:

- [ ] Does a stopped run resume from a safe checkpoint without changing launch bindings?
- [ ] Are irreversible effects recognized and not repeated on resume?
- [ ] Do records remain the evidence, with notices/export/redaction preserved under recovery
      pressure?
- [ ] Does bootstrap re-entry stay coherent with Wave 2's `stopped` / `resumed` semantics and the
      v0 observability contract?
- [ ] Are the Wave 4a candidate seams explicitly pressure-tested read-only: `write-conflict-rejected`,
      `replay-determinism`, `binding-record-append-precedes-run-readiness`,
      `resume-re-entry-preserves-original-binding`?

## Implementation-handoff implications

U9 records the gates that Wave 6 and later delivery work should carry forward from the committed
Wave 4b and Wave 5 sources:

- SEC-2 hardening waits on the `w4-s6` posture plus the `w5-s1` adversarial scenario.
- Recovery/records hardening waits on the `w5-s2` probe package and routed contradictions.
- Contract-preservation checks, golden traces, and conformance expectations belong in later delivery
  phases, not in the planning-track scaffolding itself.

This file is the collector view only. It does not originate those gates, and it does not imply that
Wave 6 inherits authority from U9 rather than from the underlying Wave 4b / Wave 5 artifacts.

## Reviewer watchlist

- The Wave 2 GUARD-2 pause-point wording is a traceability seam, not a settled prose match.
- The work-source candidate appears in both Wave 3 and Wave 4b but is one dedup candidate.
- Reviewers should reject any reintroduction of temporary local-source citations in committed
  planning docs; the durable authorities now live in the track README, wave charters/decisions,
  and the U9 integration docs.
