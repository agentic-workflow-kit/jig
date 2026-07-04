---
title: Post-product design reconciliation structure
date: 2026-07-04
source_research: docs/reviews/2026-07-04-post-product-design-reconciliation-research.md
methodology: ddd
methodology_version: "1"
architecture_mode: contract/seam design
ddd_depth: ports-and-adapters
status: approved structure for docs-only reconciliation
---

# Post-product design reconciliation structure - 2026-07-04

> **Scope.** This is the technical-design structure artifact for the post-product Jig design-doc
> reconciliation. It records `InputResolution`, `AgreedSystemModel`, and `DocStructurePlan` for a
> docs-only update. It does not authorize runtime code, package creation, export maps, schema freeze,
> provider manifests, delivery-track deletion, or evidence-record rewrites.

## 1. Source Map

| Source                                                                                | Establishes                                                                                                                                                           | Classification                           |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `docs/reviews/2026-07-04-post-product-design-reconciliation-research.md`              | Point-in-time findings after product PRs #49/#50, including facts, gaps, stale evidence, and stop conditions.                                                         | authoritative research input             |
| `docs/product/jig.md`, `docs/product/concepts.md`, `docs/product/guarantees.md`       | Product posture for private/internal SDK boundary, provider replaceability, compatible custom providers, conformance/testkit promise, and EVRUN-full debt.            | authoritative product input              |
| `.github/MILESTONES.md`, `.github/ROADMAP.md`                                         | Org M7 is done through EVRUN-partial; EVRUN-full remains post-M7 Codex-transport debt; N2 authorizes internal SDK packaging without public publishing.                | authoritative org input                  |
| `docs/design/decisions/0026-conformance-self-report-only.md`                          | Conformance does not prove real-provider truth when the basis is self-report-only.                                                                                    | authoritative design decision            |
| `docs/design/decisions/0027-packaging-sdk-boundary.md`                                | Target internal package matrix: `jig-sdk`, `jig-cli`, `jig-testkit`; root stays private shell; package work is not yet implemented.                                   | authoritative design decision            |
| `docs/design/decisions/0028-codex-app-server-transport.md`                            | Owned stdio app-server is the first Codex transport target; the internal Codex seam must become session-observable; public `AgentPort` remains final-result oriented. | authoritative design decision            |
| `docs/design/README.md`, `docs/design/contracts/**`, `docs/design/evidence/README.md` | Living design front door and contract indexes that lag ADR 0027/0028 and EVRUN-partial evidence state.                                                                | reconciliation target                    |
| `docs/delivery/README.md`, `docs/delivery/m7-real-providers/**`                       | Delivery-track wording that still reads active after org M7 completion and still carries stale `LandingRequest.action` detail.                                        | reconciliation target                    |
| `package.json`, `src/ports.ts`, `src/bootstrap.ts`, `src/providers/real/agent.ts`     | Runtime is still one private package; `LandingAction` is now a real union; `AgentPort` and `CodexAgentSession` remain pre-session-observable implementation facts.    | implementation fact, not contract freeze |

## 2. InputResolution

| Required input                                                 | Source evidence                                | Resolution                                                                                                                                                                                      | Impact                                                                                                      | Approval status                       |
| -------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Package boundary                                               | Product boundary and ADR 0027                  | **provided**: design target is three internal packages later: `jig-sdk`, `jig-cli`, `jig-testkit`; current repo remains one private package with no public `exports`.                           | Living design docs may describe target architecture, but must not claim packages exist.                     | approved for docs-only reconciliation |
| SDK ownership                                                  | ADR 0027                                       | **provided**: SDK boundary owns core run operations, records/storage, plan intake, authorization, composition/factory, provider ports, bundled providers behind the factory, and typed results. | Driving/contracts docs should route readers to this boundary.                                               | approved for docs-only reconciliation |
| CLI ownership                                                  | ADR 0027 and `contracts/driving.md`            | **provided**: CLI is a thin adapter over the same operator-control port and later depends on SDK; it does not own run logic.                                                                    | Driving contract should distinguish adapter layering from package distribution.                             | approved for docs-only reconciliation |
| Testkit/conformance ownership                                  | ADR 0026 and ADR 0027                          | **provided**: `jig-testkit` later owns conformance suite and controlled doubles; SDK owns the tested ports/types; production runtime must not import testkit after split.                       | Provider contract should name conformance purpose without treating it as real-provider proof.               | approved for docs-only reconciliation |
| Provider extension/extractability                              | Product docs and ADR 0027                      | **provided**: bundled providers and compatible custom providers plug behind core-owned seams through SDK/factory hooks, not through deep imports or core forks.                                 | Provider contract should add OCP/extractability mechanics at design altitude.                               | approved for docs-only reconciliation |
| Public vs internal API posture                                 | Product docs, ADR 0027, `package.json`         | **provided**: internal package boundary is allowed; public package, publishing, semver stability, and third-party provider ecosystem remain open.                                               | Docs must avoid public API or stability claims.                                                             | approved for docs-only reconciliation |
| Codex transport seam                                           | ADR 0028 and evidence records                  | **provided**: owned stdio app-server is first target; adapter must preflight and fail closed; internal `CodexAgentSession` widens, while public `AgentPort` stays final-result oriented.        | Provider contract can describe Codex as an Agent adapter implementation detail, not a public protocol leak. | approved for docs-only reconciliation |
| Evidence gates                                                 | ADR 0028, evidence index, EVRUN-partial record | **provided**: prompt-size, Windows/Git Bash, process-tree cleanup, EVRUN-full, and T14 freeze remain gated.                                                                                     | Evidence index and design front door must keep gaps visible.                                                | approved for docs-only reconciliation |
| Delivery sequencing/status                                     | `.github` org docs and research                | **provided**: M7 delivery track is completed for exit via EVRUN-partial; EVRUN-full remains post-M7 debt.                                                                                       | Delivery docs should become historical/completed without deleting the track.                                | approved for docs-only reconciliation |
| Exact type names, package files, export maps, dependency rules | ADR 0027 deferrals                             | **safe assumption**: leave undecided and out of this pass.                                                                                                                                      | Prevents docs from over-specifying implementation PR details.                                               | approved for docs-only reconciliation |

No required input remains `blocked` or `requires approval` for the docs-only reconciliation.

## 3. AgreedSystemModel

**Architecture mode:** `contract/seam design`

**Initial DDD depth:** `ports-and-adapters`

| Entity / boundary                      | Responsibilities                                                                                                                                                                    | Owns                                                                       | Reads                                                | Does not own                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| Product layer                          | Product identity, guarantees, no-public-package posture, provider replaceability, EVRUN-full debt.                                                                                  | What and why.                                                              | Design/delivery state for consistency.               | Package layout mechanics or runtime APIs.                                 |
| Living design front door               | Reader orientation, current-vs-target distinction, links to ADR-settled design directions.                                                                                          | Design reading path and drift reconciliation.                              | Product, ADRs, runtime facts, evidence.              | Runtime implementation or package creation.                               |
| `jig-sdk` target boundary              | Later internal programmatic package boundary for core operations, records/storage, plan intake, authorization, factory, provider ports/types, and bundled providers behind factory. | Target SDK package responsibility.                                         | Current `src/` implementation and ADR 0027.          | CLI presentation, testkit-only conformance code, public publish promise.  |
| `jig-cli` target boundary              | Later terminal adapter over SDK/operator-control port.                                                                                                                              | CLI parsing, process I/O, rendering, exit codes, prompt plumbing.          | SDK operations and driving contract.                 | Core run logic, provider selection, records semantics.                    |
| `jig-testkit` target boundary          | Later conformance/test support boundary for provider authors and Jig tests.                                                                                                         | Provider conformance suite, controlled doubles, verdict helpers, fixtures. | SDK ports and provider-facing types.                 | Production runtime graph or real-provider truth claims.                   |
| Operator-control port                  | Single driving boundary behind CLI, MCP, and embedding/SDK adapter realizations.                                                                                                    | Driving action vocabulary and edge invariant.                              | Core operations.                                     | Provider contracts or run logic.                                          |
| Provider registry/factory seam         | Selects and wires provider implementations behind core-owned ports.                                                                                                                 | Concrete provider selection point and fail-closed unknown-driver posture.  | Provider hooks/options, current composition pattern. | Deep-import consumer APIs or provider package publication.                |
| Bundled providers                      | First-party/reference implementations selected behind the factory.                                                                                                                  | Built-in provider behavior behind ports.                                   | SDK factory and provider contracts.                  | Public provider package ecosystem unless later decided.                   |
| Compatible custom providers            | Future/provider-supplied implementations satisfying supported seams.                                                                                                                | Adapter behavior behind ports and conformance basis.                       | SDK ports/options and testkit conformance.           | Core semantics, policy, lifecycle, records, or privileged authority.      |
| Public `AgentPort`                     | Final-result-oriented provider port selected by composition root.                                                                                                                   | Agent outcome boundary.                                                    | Adapter result translation.                          | App-server protocol events or session files.                              |
| Internal Codex session-observable seam | Owned stdio app-server process, preflight, turn/session observation, approval/denial/interrupt/resume correlation.                                                                  | Codex adapter internals.                                                   | N1a evidence, ADR 0028.                              | Runner/Fence/records/Forge/work-source protocol vocabulary or public API. |
| Records/evidence gates                 | Durable evidence, limitations, and proof gaps used by ADRs and later freeze decisions.                                                                                              | Evidence index and limitation visibility.                                  | Evidence records and org milestone status.           | Local `runs/` data or EVRUN-full proof.                                   |
| Delivery track                         | Historical/current sequencing record and acceptance evidence.                                                                                                                       | What shipped when, status, stop conditions.                                | Product, design, org milestone facts.                | Product/design decisions, package layout, runtime code.                   |

## 4. Relationships

| From                           | Relation          | To                                                | Notes                                                                      |
| ------------------------------ | ----------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| Product layer                  | constrains        | Living design front door                          | Design reconciles to product and names conflicts.                          |
| ADR 0027                       | settles target    | `jig-sdk` / `jig-cli` / `jig-testkit`             | Design direction only; no package work in this pass.                       |
| `jig-cli`                      | calls             | `jig-sdk`                                         | Later package split preserves thin-edge driving contract.                  |
| CLI / MCP / SDK adapters       | realize           | Operator-control port                             | Same driving surface; no separate control planes.                          |
| `jig-sdk`                      | owns              | Provider ports and factory                        | Consumers use typed options/hooks instead of deep imports.                 |
| Provider registry/factory seam | selects           | Bundled providers and compatible custom providers | Unknown provider selection fails closed.                                   |
| `jig-testkit`                  | tests             | Provider ports/types                              | Conformance is adequacy evidence, not real-provider truth.                 |
| Codex app-server adapter       | implements behind | Public `AgentPort`                                | App-server protocol remains internal adapter detail.                       |
| Codex session-observable seam  | translates to     | Worker result, authorization, records paths       | Denial/interrupt/resume are correlated without widening public port.       |
| Evidence gates                 | constrain         | Delivery and implementation sequencing            | EVRUN-partial is not EVRUN-full; prompt-size and Windows gaps remain open. |
| Org M7 state                   | updates           | Delivery track status                             | M7 can be completed without deleting historical track.                     |

## 5. DocStructurePlan

| File                                                                         | Responsibility                                                                                                                                                | Status after reconciliation         |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `docs/design/README.md`                                                      | Front-door orientation for current design state; link ADR-settled SDK/package and Codex transport directions; distinguish target design from current runtime. | overview                            |
| `docs/design/contracts/README.md`                                            | Boundary-map index; add SDK/package and conformance/testkit routing without changing data contracts.                                                          | overview                            |
| `docs/design/contracts/driving.md`                                           | Explain CLI/MCP/SDK adapter layering versus future `jig-sdk` package distribution; preserve edge-holds-no-run-logic invariant.                                | draft                               |
| `docs/design/contracts/providers.md`                                         | Add provider extractability/OCP, bundled/custom provider posture, conformance/testkit routing, and Codex app-server adapter constraints.                      | draft                               |
| `docs/design/evidence/README.md`                                             | Correct EVRUN-partial index wording and keep open evidence gaps visible.                                                                                      | evidence index                      |
| `docs/delivery/README.md`                                                    | Mark M7 as completed for org exit via EVRUN-partial while naming EVRUN-full debt.                                                                             | delivery index                      |
| `docs/delivery/m7-real-providers/README.md`                                  | Reconcile track status from active to completed/historical, remove stale `LandingRequest.action` bug claim, and keep phase history.                           | historical/completed delivery track |
| `docs/delivery/m7-real-providers/phases.md`                                  | Reconcile the phase ladder status and live `LandingRequest.action` union while preserving the historical phase ladder.                                        | historical/completed delivery track |
| `docs/delivery/m7-real-providers/repo-plan-m7.md`                            | Reconcile org milestone state and the `LandingRequest.action` open-question text while preserving routed contract questions.                                  | historical/completed delivery track |
| `docs/delivery/m7-real-providers/implementation-briefs/phase-{6,7,8,9}-*.md` | Mark implementation briefs as completed history and add closeout notes so readers do not treat them as current active instructions.                           | historical/completed delivery track |

## 6. Out Of Scope

- Creating `jig-sdk`, `jig-cli`, or `jig-testkit` package files.
- Adding `exports`, project references, dependency-cruiser rules, package templates, source moves, or
  tests for package boundaries.
- Changing runtime source, schemas, provider manifests, or golden records.
- Freezing execution-plan or observability-records v0 contracts.
- Rewriting ADR history, deleting the M7 delivery track, or editing `.github` org state.
- Treating EVRUN-partial as EVRUN-full or removing prompt-size / Windows / cleanup evidence gates.

## 7. Validation Plan

- `corepack pnpm check`
- `git diff --check`
- Stale-claim sweep:
  `rg -n "package or source-code layout|provider driver protocols beyond|Pending coordinator-filled|push\\|open-pr\\|merge|status: active" docs/design docs/delivery`
- Technical-design review pass against the sources above, with any blocker routed back to the owner
  rather than silently resolved.
