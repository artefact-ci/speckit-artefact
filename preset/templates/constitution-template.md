# [PROJECT_NAME] Constitution

<!--
  Artefact CI base: the four principles below and the Development Workflow are common to every
  project of the method. Keep them as they are, with their names: the commands of the
  artefact-sdd preset cite them by name. Add the project's own principles after them (tenant
  isolation, typed errors, module boundaries…), each pointing to the convention file that
  details it (a file listed under `docs` in `.specify/stack.yml`).
-->

The convention files listed under `docs` in `.specify/stack.yml` are the detailed reference for the project's principles below, and they prevail over this text when the two differ on a detail. They never loosen the four principles of the Artefact CI base: a convention that contradicts one of them is a deviation, justified in Complexity Tracking and decided by the user. This constitution names the principles that every spec, plan and task is checked against; it does not restate those files.

## Core Principles

### I. Test-First (NON-NEGOTIABLE)

No production code is written without a test that failed first, for the expected reason. Every change follows red → green → refactor. Every acceptance scenario of a spec is covered by an automated test whose title starts with the scenario id (`003-US1-AS2: …`), which the trace command (`commands.trace` of `.specify/stack.yml`) checks when the project has one. A scenario is never renumbered nor deleted: it is retired, and no test may cite a retired scenario.

[TEST_LEVELS]
<!-- Example: the test levels of the project, from the lowest to browser journeys, with where each lives. -->

### II. Flagged Increments

Every new feature ships behind a feature flag, disabled by default. Each user story is delivered in its own pull request.

### III. Independent Review

Whoever produces the work does not validate it. Before a story is handed over, an independent reviewer, in a fresh context and without the author's summary, applies `.specify/extensions/artefact-product/agents/relecteur.md`; each blocking finding becomes a task, and a disputed one goes to a human.

### IV. Living Specs

Once merged, `spec.md` describes the current behavior and stays current: a pull request that changes a specified behavior updates its spec; the spec's status (`Draft`, `Implemented`, `Shipped`, `Retired`) follows the feature's lifecycle. `plan.md` and `tasks.md` are history and are not updated. When CI runs the trace command, it enforces it.

### [PRINCIPLE_5_NAME]

[PRINCIPLE_5_DESCRIPTION]
<!-- Example: V. Tenant Isolation: every business table carries tenant_id… See AGENTS.md § … -->

## Development Workflow

- Every change of observable behavior starts from a spec. Without a spec: refactoring, chores, documentation, dependencies, performance, and a fix that restores an already specified behavior; a bug that reveals an unspecified behavior adds its scenario to the spec, with its test.
- A feature lives in `specs/NNN-<name>/` (`spec.md`, `plan.md`, `tasks.md` and their companions), written in English.
- A feature is developed on its own branch, `NNN-<name>`, which `/speckit-specify` creates (`before_specify` hook of the git extension) from `branches.base` of `.specify/stack.yml`, and whose name is also the spec directory's.
- `/speckit-implement` and `/speckit-converge` run until converge reports **Converged**, which requires a test for every acceptance scenario and an independent review without open blocking finding.

[PROJECT_WORKFLOW]
<!-- Example: rules of the project's own workflow, or remove this line. -->

## Governance

The convention files are changed first; this constitution follows when a principle changes (`/speckit-constitution`), with a version bump: MAJOR when a principle is removed or redefined, MINOR when one is added, PATCH for wording. The four principles of the Artefact CI base change only through a release of speckit-artefact. A plan that must violate a principle justifies it in its "Complexity Tracking" section, and the review decides.

**Version**: [CONSTITUTION_VERSION] | **Ratified**: [RATIFICATION_DATE] | **Last Amended**: [LAST_AMENDED_DATE]
