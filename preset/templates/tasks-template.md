---
description: 'Task list template for feature implementation'
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: MANDATORY. Every acceptance scenario of spec.md has a test task, listed BEFORE the implementation it drives (Test-First principle of the constitution). Use the levels and files from the plan's Test Strategy. The title of each test starts with its scenario id, e.g. `[###]-US1-AS2: refuses …`, so that the trace command (`commands.trace` of `.specify/stack.yml`) can map scenarios to tests.

**Organization**: Tasks are grouped by user story. Each user story is delivered in its own pull request.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Paths come from the plan's Project Structure and Test Strategy, which follow the code and the convention files listed under `docs` in `.specify/stack.yml`: a task never invents a layout. When those docs give a generator for a new module or screen, the task uses it instead of copying another one's configuration.
- Test files match `tests.globs` of `.specify/stack.yml`.
- Run one test: `commands.test` of `.specify/stack.yml`. Everything the change affects: `commands.affected`. Browser journeys, when `e2e` is set, live under `e2e.dir` and run with `e2e.command`.

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit-tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - The plan's Feature Flag, Test Strategy and Project Structure sections
  - Entities from data-model.md
  - Endpoints from contracts/

  Within each user story, every behavior follows red → green → refactor:
  1. a test task: write the test, run it, and confirm it FAILS for the expected reason;
  2. the implementation task that makes it pass, and nothing more;
  3. a refactor task only when the green code needs it.

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: What every user story needs. No user story work begins before this phase is complete. Delivered in the pull request of the first user story.

- [ ] T001 Declare the `[feature flag]` flag, disabled by default, where the project declares its flags
- [ ] T002 Write the failing test for [shared rule or entity] in [test path]; run it and confirm it FAILS
- [ ] T003 Implement [shared rule or entity] in [path] until T002 passes

**Checkpoint**: Foundation ready; `commands.affected` passes.

---

## Phase 2: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

**Pull request**: this story, with the Foundational phase (Phase 1).

### Red: tests for User Story 1 (write first, run, confirm they FAIL)

- [ ] T004 [P] [US1] [Level] test for [rule] titled `[###]-US1-AS1: …` in [test path]; run it with `commands.test` and confirm it FAILS
- [ ] T005 [P] [US1] [Level] test for [behavior] titled `[###]-US1-AS2: …` in [test path]; confirm it FAILS

### Green: implementation for User Story 1

- [ ] T006 [US1] Implement [rule] in [path] until T004 passes
- [ ] T007 [US1] Implement [behavior] in [path], behind the flag, until T005 passes

### Refactor

- [ ] T008 [US1] Refactor with all User Story 1 tests green; `commands.affected` passes

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 3: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

**Pull request**: this story alone.

### Red: tests for User Story 2 (write first, run, confirm they FAIL)

- [ ] T009 [P] [US2] [Level] test titled `[###]-US2-AS1: …` in [test path]; confirm it FAILS
- [ ] T010 [P] [US2] Browser journey titled `[###]-US2-AS2: …` under `e2e.dir`, only for what the lower levels cannot see (when `e2e` is set); run it with `e2e.command` and confirm it FAILS

### Green: implementation for User Story 2

- [ ] T011 [US2] Implement [behavior] in [path] until T009 passes
- [ ] T012 [US2] Implement [screen or flow] in [path] until T010 passes

### Refactor

- [ ] T013 [US2] Refactor with all User Story 2 tests green; `commands.affected` and `e2e.command` pass

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

[Add more user story phases as needed, following the same red → green → refactor pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

- [ ] TXXX [P] Update the convention files of `docs` if the feature introduces a new convention
- [ ] TXXX Run quickstart.md validation
- [ ] TXXX `commands.check` passes

---

## Dependencies & Execution Order

- **Foundational (Phase 1)**: blocks all user stories.
- **User stories**: in priority order (P1 → P2 → P3), or in parallel once Foundational is done; each stays independently testable.
- **Within each user story**: red tests first and failing, then green implementation, then refactor. No implementation task starts before its test task has been seen failing.

## Parallel Opportunities

- Test tasks of a story marked [P] can be written in parallel.
- Implementation tasks touching different files can run in parallel once their tests exist and fail.

## Notes

- `commands.*`, `tests.*` and `e2e.*` are keys of `.specify/stack.yml`: in the generated tasks.md, write the actual command or path, not the key. A step whose key is absent is left out.
- Never check a test task before seeing the test fail for the expected reason.
- Check an implementation task once the tests it drives pass; require `commands.affected` at each story's refactor task and checkpoint.
- Commit after each green step or logical group; open one pull request per user story.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence.
