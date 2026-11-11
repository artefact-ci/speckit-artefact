<!-- artefact-sdd preset (source: preset/ of speckit-artefact). Appended to the core command. -->

## Project Stack (artefact-sdd)

Read `.specify/stack.yml` first: it names this project's branches, commands, test files and convention files. `commands.test` and `commands.affected` are required: when one is missing, or the file itself, stop and ask the user to write it. Any other key that is absent or `null` skips the step that uses it: say so in the report, never invent a command. An absent key never removes a test: tests always run, with what `tests.needs` lists.

## Language (artefact-sdd)

Write the artifacts in the project language: `language` in `.specify/memory/language.yml`, a BCP 47 code (`fr`); English when the file does not exist. What stays as the template or the tools write it, in every language: the headings of the templates (`## Requirements`, `### User Story 1 - …`, `## Complexity Tracking`: commands and reviewers find sections by them), the markers that the trace command reads (`**Status**:` and its values `Draft`, `Implemented`, `Shipped`, `Retired`; `**Product Requirements**:`; `**Acceptance Scenarios**`; `**Retired**`), the `[NEEDS CLARIFICATION]` markers that commands look for, the task lines (`- [ ] T001 [P] [US1] …`), the ids (`003-US1-AS2`, `PAY-03`, `E03-J1`, `P1`) and the YAML keys of `specs/product.yml`. Commit messages, code, identifiers and test titles stay in English. A file still written in another language: write what you add or rewrite in the project language, and leave the rest as it is.

## What to Read (artefact-sdd)

These rules take precedence over any instruction above that contradicts them, including the progressive loading of only `spec.md`, `plan.md` and `tasks.md`.

- Read also the other design documents of the feature (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`) and the convention files listed under `docs` in `.specify/stack.yml` (the reference behind the constitution).
- Check what the plan says about the existing code against the code itself: routes and layouts, modules and their interfaces, the shared code listed under `shared`. When the plan relies on how a dependency behaves (an option of a library, a default), check it in its documentation or in the installed package, and cite the file.
- When `specs/product.yml` exists, check that `**Product Requirements**` of the spec names requirements of the index, and that the spec does not contradict `specs/prd.md` (scope, non-goals, constraints).

## Scenarios and Severity (artefact-sdd)

- Trace at the level of the acceptance scenarios, not only the functional requirements: every scenario id `<feature number>-US<story>-AS<n>` has a test task (search the test tasks of `tasks.md` for each id). The trace command (`commands.trace <feature dir>`) lists the scenario ids, and reports them without test as long as nothing is implemented, which is expected here; without it, list the ids from `spec.md` yourself. A scenario without a test task is CRITICAL.
- Success criteria judged by people (a usability target, a business metric) are not expected to have a test: list them as such, not as missing coverage.
- A deviation from the constitution that the plan justifies in Complexity Tracking and that the user approved (Decisions for the User) is not a violation: list it for confirmation, LOW unless the design has changed since. A deviation that is neither justified nor approved stays CRITICAL.

## Remediation and Commit (artefact-sdd)

- After the report and the remediation offer, end your turn: the `after_analyze` commit hook runs only once the user has accepted or declined the edits. If they accept, apply them, then run the hook, which commits them; if they decline, run it anyway (it commits nothing).
- A finding that changes the design (how shared data is partitioned, a role, who may read what) goes back to `/speckit-plan`; one that changes behavior goes back to the spec (`/speckit-clarify`). Only what makes `tasks.md` match the plan is edited directly.
