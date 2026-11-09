<!-- Boilerplate preset (source: tools/spec-kit/preset). Appended to the core command. -->

## Test-First Rules (boilerplate)

These rules come from the constitution (VIII. Test-First) and take precedence over any instruction above that contradicts them.

- Never write production code before the test that requires it.
- The title of a test that covers an acceptance scenario starts with the scenario id: `it('003-US1-AS2: refuses to cancel a shipped order', …)`. Test titles are in English, even in a file whose existing titles are still in French. A test may cite several ids; a `describe` title counts too.
- Check a test task only after running the test and seeing it FAIL for the expected reason. Quote the relevant failure line in your progress report.
- If a new test passes on its first run, do not check its task: either the behavior already exists or the test does not test it. Rewrite it until it fails for the expected reason. When the behavior really exists already, keep the test only if this change could break it (a guard), say so in the task, and report it; otherwise remove it.
- Write the minimum code that makes the failing test pass, then refactor with the tests green.
- Check an implementation task once the tests it drives pass, run on their own (`pnpm nx test <project>`, filtered to the file when possible). Other red tests of the same story may still fail at that point: that is expected.
- After a task that changes shared code (`libs/api/core`, `libs/shared/contracts`, `libs/web/data-access`, `apps/auth`) or makes an existing route public, run `pnpm nx affected -t lint typecheck test` before the next task: a regression in another project shows up there, not at the checkpoint.
- When an existing test blocks a task (it requires the documentation of a new variable that a later task writes, for example), do the smallest part of the later task that unblocks it, and note the move in `tasks.md` under both tasks.
- At the story's refactor task and checkpoint, every test of the story passes and `pnpm nx affected -t lint typecheck test e2e` passes; do not move to the next story before.
- Run integration and end-to-end tests with Docker available (Testcontainers); never skip or weaken a test to get green.
- The `e2e` target runs the Playwright browser journeys (`apps/web-e2e`) only when the front end, the API or the identity service changed, as in CI. It needs Docker and, the first time, `pnpm exec playwright install chromium`. A failing journey blocks the checkpoint like any other test; read its report in `dist/.playwright/apps/web-e2e`.

## Stopping Before the End (boilerplate)

When the command stops before the last task (a question for the user, a task blocked by infrastructure, the end of a session):

- Leave the tree green: the tests of the tasks done pass, and no test task is checked without its failure seen.
- Under the blocked task in `tasks.md`, write why it is blocked and what would unblock it.
- Run the `after_implement` commit hook, so the next session resumes from `tasks.md` and the git history, and say which task comes next.
- A blocker that changes a decision of the plan (an image or a service that is no longer available, a dependency that does not do what `research.md` assumed) is the user's call: show the options, and end your turn.
