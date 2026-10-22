---
description: 'Task list template for feature implementation'
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: MANDATORY. Every acceptance scenario of spec.md has a test task, listed BEFORE the implementation it drives (constitution VIII, Test-First). Use the levels and files from the plan's Test Strategy.

**Organization**: Tasks are grouped by user story. Each user story is delivered in its own pull request, under 500 changed lines; split a story that would exceed it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- API domain: `libs/api/<domain>/src/lib/{domain,application,infra,http}/`, public facade in `libs/api/<domain>/src/index.ts`
- Shared contracts and events: `libs/shared/contracts/src/lib/<domain>/`
- Unit tests: `*.spec.ts` next to the code; integration tests: `*.int.spec.ts`; API end-to-end: `apps/api/tests/<domain>.e2e.spec.ts`
- Front end: `apps/web/src/routes/`, `libs/web/*`; browser journeys: `apps/web-e2e/src/<journey>.spec.ts`
- Run one project's tests: `pnpm nx test <project>`; everything affected: `pnpm nx affected -t lint typecheck test`

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit-tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - The plan's Domains, Feature Flag, Integration Events, Data & Migrations,
    Access Rules and Test Strategy sections
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

**Purpose**: What every user story needs. No user story work begins before this phase is complete.

- [ ] T001 Declare the `[domain].[feature]` flag (default `false`) in `FEATURE_FLAGS` in `libs/shared/contracts`
- [ ] T002 [P] Add the zod schemas (and `defineIntegrationEvent` declarations, if any) in `libs/shared/contracts/src/lib/[domain]/`
- [ ] T003 Write the failing integration test for the repository in `libs/api/[domain]/src/lib/infra/drizzle-[aggregate].repository.int.spec.ts`; run it and confirm it FAILS
- [ ] T004 Add the Drizzle schema in `libs/api/[domain]/src/lib/infra/[aggregate].schema.ts` and generate the migration: `pnpm nx run api:db-generate --name=[topic]`
- [ ] T005 Implement the mapper and repository until T003 passes

**Checkpoint**: Foundation ready; `pnpm nx affected -t lint typecheck test` passes.

---

## Phase 2: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

**Pull request**: this story alone, under 500 changed lines.

### Red: tests for User Story 1 (write first, run, confirm they FAIL)

- [ ] T006 [P] [US1] Unit test for [rule] (US1-AS1) in `libs/api/[domain]/src/lib/domain/[entity].spec.ts`; run `pnpm nx test api-[domain]` and confirm it FAILS
- [ ] T007 [P] [US1] Unit test for [use case] with in-memory fakes (US1-AS2) in `libs/api/[domain]/src/lib/application/[use-case].spec.ts`; confirm it FAILS
- [ ] T008 [P] [US1] API end-to-end test for [endpoint], including the 404 on another user's resource, in `apps/api/tests/[domain].e2e.spec.ts`; confirm it FAILS

### Green: implementation for User Story 1

- [ ] T009 [US1] Implement [entity] rules in `libs/api/[domain]/src/lib/domain/[entity].ts` until T006 passes
- [ ] T010 [US1] Implement [use case] in `libs/api/[domain]/src/lib/application/[use-case].ts` until T007 passes
- [ ] T011 [US1] Add the controller and DTOs in `libs/api/[domain]/src/lib/http/` (`@RequireFeature`, `@RequireRole` if needed) until T008 passes

### Refactor

- [ ] T012 [US1] Refactor with all User Story 1 tests green; `pnpm nx affected -t lint typecheck test` passes

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 3: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

**Pull request**: this story alone, under 500 changed lines.

### Red: tests for User Story 2 (write first, run, confirm they FAIL)

- [ ] T013 [P] [US2] [Test for US2-AS1] in [path]; confirm it FAILS
- [ ] T014 [P] [US2] Browser journey for [flow] in `apps/web-e2e/src/[journey].spec.ts`; confirm it FAILS

### Green: implementation for User Story 2

- [ ] T015 [US2] Implement [behavior] in [path] until T013 passes
- [ ] T016 [US2] Implement the screen in `apps/web/src/routes/[route].tsx` until T014 passes

### Refactor

- [ ] T017 [US2] Refactor with all User Story 2 tests green

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

[Add more user story phases as needed, following the same red → green → refactor pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

- [ ] TXXX [P] Update `AGENTS.md` if the feature introduces a new convention
- [ ] TXXX Run quickstart.md validation
- [ ] TXXX `pnpm check` passes

---

## Dependencies & Execution Order

- **Foundational (Phase 1)**: blocks all user stories.
- **User stories**: in priority order (P1 → P2 → P3), or in parallel once Foundational is done; each stays independently testable.
- **Within each user story**: red tests first and failing, then green implementation, then refactor. No implementation task starts before its test task has been seen failing.

## Parallel Opportunities

- Test tasks of a story marked [P] can be written in parallel.
- Implementation tasks touching different files can run in parallel once their tests exist and fail.

## Notes

- Never check a test task before seeing the test fail for the expected reason.
- Never check an implementation task before its tests and `pnpm nx affected -t lint typecheck test` pass.
- Commit after each green step or logical group; open one pull request per user story.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence.
