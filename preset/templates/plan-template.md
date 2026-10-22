# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow. Read `AGENTS.md` (and `apps/web/AGENTS.md`, `libs/web/AGENTS.md` for front-end work) before filling it: they are the detailed reference behind the constitution.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  The stack below is fixed by the boilerplate. Only fill in the bracketed lines,
  and add a line only for a new dependency (justify it in research.md).
-->

**Language/Version**: TypeScript, Node 24 LTS, Nx monorepo (pnpm)

**Back end**: NestJS 11, Drizzle ORM, Postgres (one schema per domain), Redis, BullMQ (transactional outbox), zod contracts in `libs/shared/contracts`

**Front end**: React, TanStack Router and Query, Tailwind 4, shadcn components (`libs/web/ui`), Lingui (i18n)

**Identity**: Better Auth service (`apps/auth`), JWT access tokens carrying `tenant_id` and `roles`

**Testing**: Vitest (API unit tests; front-end component tests with Testing Library), Testcontainers (Postgres, Redis, Mailpit), supertest through `configureApp`, Playwright (`apps/web-e2e`, only for what Vitest cannot see)

**Tenancy**: multi-tenant; every business row carries `tenant_id` taken from `RequestContext`

**Performance Goals**: [domain-specific, or N/A]

**Constraints**: [domain-specific, or N/A]

**Scale/Scope**: [domain-specific, or N/A]

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Each unchecked box needs an entry in Complexity Tracking._

- [ ] I. Tenant Isolation: every new table has `tenant_id`; repositories filter on it.
- [ ] II. Typed Business Errors: every new failure is an `AppError` subclass with a stable code.
- [ ] III. Secure by Default: routes are authenticated; shared-data mutations declare `@RequireRole`; forbidden resources answer 404.
- [ ] IV. Bounded External Calls: Redis keys have a TTL; external calls have a timeout, and slow ones go through a queue.
- [ ] V. Generated, Backward-Compatible Migrations: generated with `db-generate`, expand/contract.
- [ ] VI. Flagged Increments: behind a flag disabled by default; each user story is delivered in its own pull request.
- [ ] VII. Domain Boundaries: facade-only imports, port + adapter, own Postgres schema, events for asynchronous reactions.
- [ ] VIII. Test-First: every acceptance scenario has a test in the Test Strategy below, written before the code.

## Domains

<!-- Domains touched or created. For each: why it owns this behavior, the facade methods
     added, and the ports it needs from other domains (and which facade backs them). -->

- `libs/api/[domain]`: [new | changed] — [responsibility] — facade: [methods] — ports: [Port → OtherFacade]

## Feature Flag

- **Name**: `[domain].[feature]`
- **Default**: `false`
- **Client**: [`true` if the front end reads it through `GET /api/v1/feature-flags`, else `false`]
- **Guarded entry points**: [API routes with `@RequireFeature`, handlers calling `isEnabled`, front routes with `beforeLoad: requireFeature('<flag>')`; `libs/web/*` receive booleans as props and never read flags]

## Integration Events

<!-- Events published or consumed, or "None". A published version never changes: create v2. -->

| Event                     | Published by | Consumed by (handler name) | Payload  |
| ------------------------- | ------------ | -------------------------- | -------- |
| `[domain].[past-fact].v1` | [use case]   | `[domain].[action]`        | [fields] |

## Data & Migrations

- **Tables**: [schema.table — columns, including `tenant_id`, and `version` for a modifiable aggregate]
- **Migration**: `pnpm nx run api:db-generate --name=[topic]`; [expand/contract steps if an existing column changes]
- **Identifiers**: [`<PREFIX>-…` business IDs declared in the domain contracts, or N/A]

## Access Rules

- **Role required**: [route → `staff` | any authenticated client]
- **Visibility rule**: [who may see/change which resource; enforced in the use case; otherwise 404]
- **Idempotency**: [routes creating a business effect carry `@Idempotent({ required: true })`, or N/A]

## Test Strategy

<!-- One row per acceptance scenario of spec.md (and per edge case worth a test), by its
     id `[###]-US<story>-AS<n>`: the title of each covering test starts with that id.
     Pick the lowest level that proves the behavior. -->

| Scenario (spec)             | Level                                                            | Test file                                                                         |
| --------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [###]-US1-AS1 [short title] | [unit \| integration \| API e2e \| component \| browser journey] | [path, e.g. `libs/api/[domain]/src/lib/application/[domain].application.spec.ts`] |

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

<!-- Keep only the paths this feature touches, with real file names. -->

```text
libs/shared/contracts/src/lib/[domain]/   # zod schemas, events (*.events.ts), ID prefix
libs/api/[domain]/src/
├── index.ts                              # facade: module, facade, contract types only
└── lib/
    ├── domain/                           # entities and rules, pure TypeScript
    ├── application/                      # use-cases/<use-case>.ts, ports, facade, testing/ (in-memory fakes)
    ├── infra/                            # <domain>.schema.ts (one per domain), mappers, repositories, adapters
    └── http/                             # thin controllers, zod DTOs
apps/api/migrations/                      # generated migration
apps/api/tests/[domain].e2e.spec.ts       # API end-to-end tests
apps/web/src/routes/_authenticated/       # thin routes only (assembly, requireFeature guard)
libs/web/[feature]/src/lib/components/   # screens and logic, with Vitest + Testing Library tests
libs/web/data-access/                     # API client and queries; Lingui catalogs updated (web:i18n-check)
apps/web-e2e/src/[journey].spec.ts        # browser journeys
```

**Structure Decision**: [Which of these paths the feature uses, and why]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation   | Why Needed     | Simpler Alternative Rejected Because       |
| ----------- | -------------- | ------------------------------------------ |
| [principle] | [current need] | [why the compliant option is insufficient] |
