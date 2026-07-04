---
title: "Target-state implementation — verification strategy"
status: planned
---

# Verification strategy

The shared verification contract for every phase in this track. Phase docs cite this file and
add phase-specific checks; nothing here may be weakened by a phase to get green.

## The gate

Every phase PR passes the full repo gate locally and in CI, unweakened:

```bash
pnpm install --frozen-lockfile
pnpm check   # biome lint, prettier format:check, tsc -b, delivery:check, vitest with coverage
```

Gate integrity rules (from [`AGENTS.md`](../../../AGENTS.md)):

- No skipped steps, no threshold adjustments, no widened exclusion lists. Coverage stays
  enforced at 90% (aim 95%) across whatever package layout exists after P02.
- After P02 the gate additionally enforces the ADR 0027 dependency matrix (see
  [package boundary checks](#package-boundary-checks)); later phases inherit that check.
- A phase that must change gate mechanics (for example, P02 re-wiring `pnpm check` to fan out
  across workspace packages) changes the mechanics without reducing what is checked, and its PR
  review verifies exactly that.

## Test lanes

The four Vitest lanes in `vitest.config.ts` carry different proof and must not blur:

| Lane        | Proves                                                            | Runs in                             |
| ----------- | ----------------------------------------------------------------- | ----------------------------------- |
| unit        | Module behavior, fail-closed branches                             | `pnpm check`, CI                    |
| integration | CLI end-to-end against fixtures; golden run records               | `pnpm check`, CI                    |
| conformance | Provider seams against the conformance suite (controlled doubles) | `pnpm check`, CI                    |
| smoke       | Real-provider paths (opt-in via `EVRUN_SMOKE`; not hermetic)      | Manually, for evidence capture only |

The **hermetic guard** (`tests/hermetic/no-real-effects.setup.ts`) fails any unit, integration,
or conformance test that reaches the real network, pushes with `git`/`gh`, or spawns a Codex
process. Every phase keeps this guard intact and extends its allow/deny knowledge when it adds a
new real-effect capability (P03 adds Codex process spawning, P04 adds confinement probes, P05
extends forge/work-source effects). Real-effect proof belongs in the smoke lane and in committed
evidence records, never in hermetic lanes.

## Golden-record discipline

The golden run records under `tests/fixtures/m5b-local-mvp/golden-run-record-*.json` are the
byte-level compatibility surface for the observability-records v0 contract.

- **Default: byte-identical.** Any phase not listed below must leave every golden unchanged.
  This realizes the roadmap rule that default/reference wiring stays byte-stable while real
  drivers land behind the same ports.
- **Owned changes only.** A phase that must change what the reference wiring records (candidates:
  P08 and P09 if driving-action audit events or notice events are additive to the reference
  path; P13 if the freeze ratifies encoding changes) must say so in its phase doc and PR
  description, and the golden diff is reviewed as a records-contract change, not a test fixture
  refresh. Additive event families follow the observability-records v0 rules; no event family is
  minted where the roadmap says an existing family carries the outcome.
- **Fixture conventions.** `scripts/check-delivery-foundation.mjs` pins the fixture README
  conventions (no TypeScript interfaces, JSON Schemas, event constants, provider manifests, or
  package exports in fixtures). A phase that legitimately needs to evolve fixtures updates the
  README and the check together, in the open.

## Conformance and testkit posture

- The provider conformance suite is the executable bar for the four seams. After P02 it lives in
  `jig-testkit` and `jig-sdk` must not import it (ADR 0027, decision 3).
- Verdicts follow [ADR 0026](../../design/decisions/0026-conformance-self-report-only.md): a
  `self-report-only` basis is a warning/failure, never an alternate pass. Reviewers of provider
  phases (P03, P04, P05) check that no acceptance criterion is satisfied by a subject's own
  claim where independent observation is required.
- **A green controlled-double suite does not prove real-provider truth.** Real-provider truth
  comes from the smoke lane plus committed evidence records (below). Phase acceptance criteria
  must not cite conformance green as proof of real confinement, credential withholding, egress
  behavior, or forge/source effects.
- The forbidden-method sweep (no push/PR/merge/credential path on `AgentPort`) must pass in
  every phase; P03 in particular must not widen the public agent surface.

## Evidence records and the EVRUN gates

- Committed evidence records follow the
  [evidence appendix convention](../../design/conventions.md#6-evidence-appendix-convention-committed-records-are-inputs-to-decisions-not-authority):
  dated filename and header, exact external tool versions, content hashes for captured
  transcripts, a required `Limitations` section, an explicit redaction statement, and citations
  to the guarantee/invariant/ADR IDs the evidence supports.
- **EVRUN-partial** is the committed baseline. **EVRUN-full** (P11) must prove at minimum: real
  Codex editing through the app-server transport, real execution-host confinement, adversarial
  no-phone-home behavior, and multi-run idempotency — four of the six gaps the
  [evidence boundary](../../design/evidence/README.md#evrun-evidence-boundary) names. The
  remaining two — hosted or remote operation and Windows behavior — stay explicitly out of this
  track (remote is a product deferral; Windows gates on `N1A-P14`); that grouping is this
  track's scoping decision, not the evidence doc's.
- Evidence is host- and version-pinned, and is an input to decisions, not authority. P13's
  freeze package cites evidence records; the contract owner decides.

## Security and redaction checks

Every phase, and pointedly P03–P05 and P10–P11:

- No secrets, tokens, or PII in committed records, goldens, evidence records, logs, or exports.
  Redaction ambiguity is a diagnosable stop, not a best-effort scrub.
- The integrity sidecar (`integrity.json`) requirements hold whenever a real driver is selected;
  `JIG_RECORDS_INTEGRITY_KEY` stays environment-supplied, never committed.
- Credentials reach providers via environment only; the substrate manifest bounds what a driver
  may request, and an out-of-tuple request is a refused, recorded stop.
- Reviewers of any phase touching records or transports check a sample of new record output for
  redaction posture before approving.

## Package boundary checks

From P02 onward:

- The ADR 0027 dependency matrix is mechanically enforced (dependency-cruiser or equivalent,
  introduced in P02 with the split — not before, per ADR 0027 decision 5): `jig-sdk` never
  imports `jig-cli` or `jig-testkit`; `jig-cli` and `jig-testkit` import only `jig-sdk`;
  nothing deep-imports across package boundaries.
- All packages remain `private: true`. CI fails if a publishable posture (missing `private`,
  `publishConfig`) appears — publishing is a product decision this track does not make.
- Export maps expose only the supported SDK surface; a PR that widens an export map names the
  consumer that needs it.

## Docs checks

- `pnpm format:check` (Prettier defaults) governs all Markdown, including this track. Run
  `pnpm format` before pushing.
- Every phase updates the status-bearing docs it invalidates (root `README.md` status section,
  `AGENTS.md` status, `docs/README.md`, package descriptions, `skills/README.md` CLI surface
  list) in the same PR. P14 audits the residue.
- The repo has no Markdown link checker today. Reviewers spot-check relative links in changed
  docs; if a phase adds substantial cross-linking, adding a link-check script to the gate is a
  welcome, separate, small PR — not a silent gate weakening or a blocking requirement.

## Reviewer inspection axes

Beyond CI, each phase PR review verifies:

1. **Boundary honesty** — the change respects the owns/implements/must-not tables of the seams
   it touches; no run logic in adapters, no provider imports at the edge, no authority widening.
2. **Fail-closed posture** — new inputs are validated at the boundary; unknown names, versions,
   or postures refuse with guidance rather than guessing.
3. **Altitude** — implementation PRs don't rewrite product/design claims; docs updates state
   shipped truth only.
4. **Phase scope** — the diff matches the phase doc's What To Do and Out Of Scope; adjacent
   gaps found mid-phase become notes on the relevant phase doc, not scope creep.

## Definition of delivered

The track is delivered when all of the following hold, with evidence:

1. Every phase P01–P14 is merged with its acceptance criteria checked off in review.
2. `pnpm check` is green on `main` with the P02 package layout and boundary enforcement in the
   gate.
3. EVRUN-full is committed under `docs/design/evidence/` and indexed, with its limitations
   honestly stated.
4. The P14 guarantee-coverage audit maps every product ID in
   [`guarantees.md`](../../product/guarantees.md) to shipped behavior plus tests, or to an
   explicitly recorded deferral (remote hosts, triggers, Windows, ecosystem distribution).
5. The v0 contracts are either frozen by an explicit contract-owner decision (P13 accepted) or
   the deferral is recorded with its reasons — silence is not an outcome.
6. Root `README.md` and `AGENTS.md` describe the shipped surface accurately, and the packaging
   posture (private, no publish promise) is restated, not drifted.
