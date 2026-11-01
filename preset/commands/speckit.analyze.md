<!-- Boilerplate preset (source: tools/spec-kit/preset). Appended to the core command. -->

## What to Read (boilerplate)

These rules take precedence over any instruction above that contradicts them, including the progressive loading of only `spec.md`, `plan.md` and `tasks.md`.

- Read also the other design documents of the feature (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`), `AGENTS.md` (the reference behind the constitution) and, for front-end work, `apps/web/AGENTS.md` and `libs/web/AGENTS.md`.
- Check what the plan says about the existing code against the code itself: the routes and layouts of `apps/web/src/routes/`, the facades, `api-core`, the identity service. When the plan relies on how a dependency behaves (a Better Auth option, a library default), check it in its documentation or in `node_modules`, and cite the file.
- When `specs/product.yml` exists, check that `**Product Requirements**` of the spec names requirements of the index, and that the spec does not contradict `specs/prd.md` (scope, non-goals, constraints).

## Scenarios and Severity (boilerplate)

- Trace at the level of the acceptance scenarios, not only the functional requirements: every scenario id `<feature number>-US<story>-AS<n>` has a test task (search the test tasks of `tasks.md` for each id; `pnpm -s spec:trace <feature dir>` lists the scenario ids, and reports them without test as long as nothing is implemented, which is expected here). A scenario without a test task is CRITICAL.
- Success criteria judged by people (a usability target, a business metric) are not expected to have a test: list them as such, not as missing coverage.
- A deviation from the constitution that the plan justifies in Complexity Tracking and that the user approved (Decisions for the User) is not a violation: list it for confirmation, LOW unless the design has changed since. A deviation that is neither justified nor approved stays CRITICAL.

## Remediation and Commit (boilerplate)

- After the report and the remediation offer, end your turn: the `after_analyze` commit hook runs only once the user has accepted or declined the edits. If they accept, apply them, then run the hook, which commits them; if they decline, run it anyway (it commits nothing).
- A finding that changes the design (the tenant model, a role, a new cross-tenant read) goes back to `/speckit-plan`; one that changes behavior goes back to the spec (`/speckit-clarify`). Only what makes `tasks.md` match the plan is edited directly.
