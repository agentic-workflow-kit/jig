# AGENTS.md — active delivery documentation

This directory is the active, documentation-only planning surface for the next Jig generation. It
inherits the repository [`AGENTS.md`](../../AGENTS.md).

## Authority and limits

1. [`docs/product/`](../product/) owns product intent: **what** Jig must deliver and **why**.
2. [`docs/redesign/design/`](../redesign/design/) owns the approved architecture: **how** its
   guarantees, authority, lifecycle, and proof obligations must be realized.
3. The final [readiness gate](../archive/reviews/2026-07-18-empty-repository-implementation-readiness-gate.md)
   establishes the locked design baseline and the archive manifest is recovery-only provenance.
4. [`greenfield/track.json`](./greenfield/track.json) is the exact-set planning source for the 48
   story IDs, phases, dependencies, gates, and machine-readable planning facts. It faithfully
   encodes this track; it cannot override the product or design authority above it.
5. This directory decomposes those governing contracts into reviewable delivery stories. It does
   not alter product or architecture decisions, reopen a `DR-*` choice, or authorize code.

Do not use retired source, archived implementation plans, the archived delivery track, or ignored
remnants to choose architecture, sequencing, package boundaries, or story content. A story may
later consult one bounded archived path only after that story is independently specified and
records the lookup as non-governing provenance.

## Working rules

- Start every implementation story from the mandatory [story contract](./greenfield/story-contract.md).
- Keep immutable planning/authority provenance, the approved delivery-package tuple, each observed
  per-story execution base, and every reviewed implementation candidate distinct. A passing
  package or earlier base is not evidence that a later candidate passed review.
- A provider, adapter, or effect path is unavailable until its named qualification evidence passes;
  configuration must not expose an unqualified path.
- Fail closed on malformed, stale, missing, ambiguous, or unverifiable inputs and evidence. Never
  blindly retry an effect whose outcome is uncertain.
- Preserve exact IDs, authority boundaries, and immutable bindings from the governing design. Raise
  `OWNER_DECISION_REQUIRED` for a material gap rather than inventing a behavior.
- The eight mandatory semantic-to-provider splits are GF-019→GF-020 (`PORT-SOURCE`),
  GF-010→GF-025 (`PORT-LEDGER`), GF-013→GF-026 (`PORT-ARTIFACT`), GF-033→GF-039
  (`PORT-WORKSPACE`), GF-042→GF-047 (`PORT-VERIFY`), GF-034→GF-060 (`PORT-SESSION`),
  GF-041→GF-057 (review-publication `PORT-DELIVERY`), and GF-044→GF-061 (final-delivery
  `PORT-DELIVERY`). Each provider stays unconfigurable until its exact mechanism evidence is
  admitted. The two delivery splits retain disjoint credentials, Operations, evidence, and
  authority subjects despite sharing a port and suite family.
- Product code, product package manifests/scaffolding, and hosted state are outside this
  documentation track. Minimal repository navigation, status, or validation wiring that solely
  supports this documentation track is allowed.

## Focused track gate

Run `pnpm delivery:check` for the machine manifest, full briefs, and delivery-document integrity.
It complements, but does not replace, the applicable formatting, link, exact-candidate, or
independent-review evidence.

## Reader route

Begin at the [delivery index](./README.md), then read the baseline, policy, and story contract.
Reviewers use the self-contained [reviewer packet](./greenfield/reviewer/README.md).
