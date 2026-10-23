---
description: 'Task list template for feature implementation'
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: MANDATORY. Every acceptance scenario of spec.md has a test task, listed BEFORE the implementation it drives (constitution VIII, Test-First). Use the levels and files from the plan's Test Strategy. The title of each test starts with its scenario id, e.g. `it('[###]-US1-AS2: refuses …')`, so that `pnpm -s spec:trace` can map scenarios to tests.

**Organization**: Tasks are grouped by user story. Each user story is delivered in its own pull request.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- API domain: a new domain is created with `pnpm new:domain <domain>` (lib, facade, module registered in the AppModule; first task of the Foundational phase), never by copying another domain's configuration; `libs/api/<domain>/src/lib/{domain,application,infra,http}/`, use cases in `application/use-cases/<use-case>.ts`, one Drizzle schema per domain in `infra/<domain>.schema.ts`, public facade in `libs/api/<domain>/src/index.ts`
- Shared contracts and events: `libs/shared/contracts/src/lib/<domain>/`
- API tests: unit tests next to the code (`domain/<entity>.spec.ts`, `application/<domain>.application.spec.ts` with fakes in `application/testing/`); integration tests `*.int.spec.ts`; API end-to-end `apps/api/tests/<domain>.e2e.spec.ts`
- Front end (see `apps/web/AGENTS.md`, `libs/web/AGENTS.md`): screens and logic in a feature lib `libs/web/<feature>`, created with `pnpm new:web-feature <feature>` (never by copying another lib's configuration), with Vitest + Testing Library component tests next to them; `apps/web/src/routes/` only assembles (a protected page goes in `routes/_authenticated/`, flag guard `beforeLoad: requireFeature('<flag>')`); new strings go through Lingui and the catalogs (`web:i18n-check`)
- Browser journeys (`apps/web-e2e/src/<journey>.spec.ts`, Playwright) only for what Vitest cannot see: redirects between services, emails, cookies, several tenants
- Every new page gets an accessibility check (axe) in `apps/web-e2e/src/accessibility.spec.ts`, with its form in error if it has one; a page behind a flag needs the flag in `E2E_FEATURE_FLAGS` (`apps/web-e2e/src/stack.ts`), or it answers 404
- Run one project's tests: `pnpm nx test <project>`; everything affected: `pnpm nx affected -t lint typecheck test e2e`

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
- [ ] T003 Write the failing unit test for the [aggregate] invariants and `restore` in `libs/api/[domain]/src/lib/domain/[aggregate].spec.ts`; run it and confirm it FAILS
- [ ] T004 Implement the [aggregate] entity with `restore` in `libs/api/[domain]/src/lib/domain/[aggregate].ts` until T003 passes
- [ ] T005 Write the failing integration test for the repository in `libs/api/[domain]/src/lib/infra/drizzle-[aggregate].repository.int.spec.ts`; run it and confirm it FAILS
- [ ] T006 Add the Drizzle tables in `libs/api/[domain]/src/lib/infra/[domain].schema.ts` and generate the migration: `pnpm nx run api:db-generate --name=[topic]`
- [ ] T007 Implement the mapper (`[Aggregate]Mapper`, rebuilds through `restore`) and the repository until T005 passes

**Checkpoint**: Foundation ready; `pnpm nx affected -t lint typecheck test e2e` passes.

---

## Phase 2: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

**Pull request**: this story alone.

### Red: tests for User Story 1 (write first, run, confirm they FAIL)

- [ ] T008 [P] [US1] Unit test for [rule] titled `[###]-US1-AS1: …` in `libs/api/[domain]/src/lib/domain/[aggregate].spec.ts`; run `pnpm nx test api-[domain]` and confirm it FAILS
- [ ] T009 [P] [US1] Unit test for [use case] with in-memory fakes titled `[###]-US1-AS2: …` in `libs/api/[domain]/src/lib/application/[domain].application.spec.ts`; confirm it FAILS
- [ ] T010 [P] [US1] API end-to-end test for [endpoint], including the 404 on another user's resource, in `apps/api/tests/[domain].e2e.spec.ts`; confirm it FAILS

### Green: implementation for User Story 1

- [ ] T011 [US1] Implement [rule] in `libs/api/[domain]/src/lib/domain/[aggregate].ts` until T008 passes
- [ ] T012 [US1] Implement [use case] in `libs/api/[domain]/src/lib/application/use-cases/[use-case].ts` until T009 passes
- [ ] T013 [US1] Add the controller and DTOs in `libs/api/[domain]/src/lib/http/` (`@RequireFeature`, `@RequireRole` if needed) until T010 passes

### Refactor

- [ ] T014 [US1] Refactor with all User Story 1 tests green; `pnpm nx affected -t lint typecheck test e2e` passes

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 3: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

**Pull request**: this story alone.

### Red: tests for User Story 2 (write first, run, confirm they FAIL)

- [ ] T015 [P] [US2] [Test titled `[###]-US2-AS1: …`] in [path]; confirm it FAILS
- [ ] T016 [P] [US2] Component test (Vitest + Testing Library) for [screen] titled `[###]-US2-AS2: …` in `libs/web/[feature]/src/lib/components/[screen].spec.tsx`; confirm it FAILS
- [ ] T017 [P] [US2] Browser journey for [flow that crosses services, emails or tenants] titled `[###]-US2-AS3: …` in `apps/web-e2e/src/[journey].spec.ts`, and the accessibility check of the new page in `apps/web-e2e/src/accessibility.spec.ts` (flag in `E2E_FEATURE_FLAGS`); confirm they FAIL

### Green: implementation for User Story 2

- [ ] T018 [US2] Implement [behavior] in [path] until T015 passes
- [ ] T019 [US2] Implement the screen in `libs/web/[feature]/src/lib/components/[screen].tsx` (strings through Lingui) until T016 passes
- [ ] T020 [US2] Add the thin route in `apps/web/src/routes/_authenticated/[route].tsx` with `beforeLoad: requireFeature('[domain].[feature]')`, update the Lingui catalogs, until T017 passes

### Refactor

- [ ] T021 [US2] Refactor with all User Story 2 tests green; `pnpm nx affected -t lint typecheck test e2e` passes

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
- Check an implementation task once the tests it drives pass; require `pnpm nx affected -t lint typecheck test e2e` at each story's refactor task and checkpoint.
- Commit after each green step or logical group; open one pull request per user story.
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence.
