# Product Requirements Document: [PRODUCT NAME]

**Last Updated**: [DATE]

<!--
  The why and the what of the whole product, for people: no technology, no screens, no data model.
  The structured part lives in specs/product.yml: every requirement listed under "Requirements"
  below has an entry there with the same id and title, and spec:trace checks that index.
  This document never records a state: what is specified, implemented or shipped is derived from
  the specs (`pnpm -s spec:trace`).
-->

## Vision

[One paragraph: what the product changes for its users, and why now.]

## Users

<!-- Who uses the product, and what each one is trying to get done. One line per kind of user. -->

- **[Kind of user]**: [what they are trying to get done]

## Problems

<!-- What these users struggle with today. Each requirement below answers at least one. -->

1. [Problem]

## Scope

### In Scope

- [Capability the product provides]

### Non-Goals

<!-- What the product deliberately does not do, and why. Out of scope is a decision, not a gap. -->

- [Non-goal]: [reason]

## Constraints

<!-- Regulatory, commercial, operational or contextual facts every feature must respect
     (markets, languages, devices, connectivity, payment means…). No implementation choice. -->

- [Constraint]

## Success Metrics

<!-- How the product is judged once shipped, measurable and technology-agnostic. These are
     judged by people, not by tests. -->

- **[Metric]**: [target]

## Requirements

<!-- Grouped by area. Each id is <PREFIX>-<number> (PAY-03), never renumbered: a dropped
     requirement is retired in specs/product.yml (`retired: <reason>`) and struck through here,
     with the same reason. -->

### [Area]

- **[PREFIX-01]** [Title, as in specs/product.yml]: [what the user can do, and the rule that matters]

## Open Questions

<!-- Decisions not taken yet. Each one names who decides. Empty when the PRD is complete. -->

- [Question] ([who decides])
