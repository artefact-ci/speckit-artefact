# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow. Read `.specify/stack.yml` and the convention files it lists under `docs` before filling it: they are the detailed reference behind the constitution, and they prevail over this template.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  Describe the stack as the code and the docs of `.specify/stack.yml` show it: do not choose
  it here. Add a line only for a new dependency (justify it in research.md, and list it in
  Decisions for the User when it is infrastructure).
-->

**Language/Version**: [as in the repo, e.g. TypeScript on Bun 1.2]

**Primary Dependencies**: [frameworks already in use]

**Storage**: [if applicable, or N/A]

**Testing**: [test runners and levels already in use, with the command `commands.test` of `.specify/stack.yml`]

**Performance Goals**: [domain-specific, or N/A]

**Constraints**: [domain-specific, or N/A]

**Scale/Scope**: [domain-specific, or N/A]

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Each unchecked box needs an entry in Complexity Tracking._

<!-- One box per principle of `.specify/memory/constitution.md`, in its order and with its name:
     the four principles of the Artefact CI base first, then the project's own. -->

- [ ] Test-First: every acceptance scenario has a test in the Test Strategy below, written before the code.
- [ ] Flagged Increments: behind a flag disabled by default; each user story is delivered in its own pull request.
- [ ] Independent Review: the work is reviewed by a reviewer that did not write it, before it is handed over.
- [ ] Living Specs: the specs this feature changes are updated in the same pull requests.
- [ ] [Project principle]: [how this plan complies]

## Decisions for the User

<!-- Choices that are the user's (see the command): deviations from the constitution or from
     the project's conventions, CODEOWNERS paths, new infrastructure, designs hard to change
     later. For each: the question, the options and their cost, the recommendation, then the
     user's answer and its reason. "None" when the plan needs no such choice. -->

- **[Question]**: [options and cost] — recommended: [option] — **decided**: [answer, reason]

## Feature Flag

- **Name**: `[feature flag name, following the project's convention]`
- **Default**: disabled
- **Guarded entry points**: [routes, handlers, screens or jobs that check the flag]

## Test Strategy

<!-- One row per acceptance scenario of spec.md (and per edge case worth a test), by its
     id `[###]-US<story>-AS<n>`: the title of each covering test starts with that id.
     Pick the lowest level that proves the behavior, among the levels the project uses;
     the test files match `tests.globs` of `.specify/stack.yml`. -->

| Scenario (spec)             | Level                                                     | Test file           |
| --------------------------- | --------------------------------------------------------- | ------------------- |
| [###]-US1-AS1 [short title] | [unit \| integration \| API end-to-end \| component \| browser journey] | [path of the test] |

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

<!-- Only the paths this feature touches, with real file names, read from the code: the
     layout is the project's, never one invented by the plan. Mark each path new or changed. -->

```text
[path]/                   # [new | changed] [what it holds]
```

**Structure Decision**: [Which of these paths the feature uses, and why]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations, or the plan departs from a convention of the project's docs, that must be justified**

| Violation                 | Why Needed     | Simpler Alternative Rejected Because       |
| ------------------------- | -------------- | ------------------------------------------ |
| [principle or convention] | [current need] | [why the compliant option is insufficient] |
