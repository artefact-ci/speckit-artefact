<!-- artefact-sdd preset (source: preset/ of speckit-artefact). Appended to the core command. -->

## Project Stack (artefact-sdd)

Read `.specify/stack.yml` first: it names this project's branches, commands, test files and convention files. A key that is absent or `null` skips the step that uses it: say so in the report, never invent a command. When the file itself is missing, stop and ask the user to write it.

## Test-First Rules (artefact-sdd)

These rules come from the constitution (Test-First principle) and take precedence over any instruction above that contradicts them.

- Never write production code before the test that requires it.
- The title of a test that covers an acceptance scenario starts with the scenario id: `003-US1-AS2: refuses to cancel a shipped order`. Test titles are in English. A test may cite several ids; the title of an enclosing group counts too.
- Check a test task only after running the test and seeing it FAIL for the expected reason. Quote the relevant failure line in your progress report.
- If a new test passes on its first run, do not check its task: either the behavior already exists or the test does not test it. Rewrite it until it fails for the expected reason. When the behavior really exists already, keep the test only if this change could break it (a guard), say so in the task, and report it; otherwise remove it.
- Write the minimum code that makes the failing test pass, then refactor with the tests green.
- Check an implementation task once the tests it drives pass, run on their own (`commands.test`, filtered to the file when possible). Other red tests of the same story may still fail at that point: that is expected.
- After a task that changes shared code (a path listed under `shared` in `.specify/stack.yml`) or makes an existing route public, run `commands.affected` before the next task: a regression elsewhere shows up there, not at the checkpoint.
- When an existing test blocks a task (it requires the documentation of a new variable that a later task writes, for example), do the smallest part of the later task that unblocks it, and note the move in `tasks.md` under both tasks.
- At the story's refactor task and checkpoint, every test of the story passes and `commands.affected` passes; do not move to the next story before.
- Run integration and end-to-end tests with what they need (`e2e.needs`, and the services the convention files name); never skip or weaken a test to get green.
- When `e2e` is set, the browser journeys live under `e2e.dir`; run `e2e.setup` once the first time. A failing journey blocks the checkpoint like any other test.

## Stopping Before the End (artefact-sdd)

When the command stops before the last task (a question for the user, a task blocked by infrastructure, the end of a session):

- Leave the tree green: the tests of the tasks done pass, and no test task is checked without its failure seen.
- Under the blocked task in `tasks.md`, write why it is blocked and what would unblock it.
- Run the `after_implement` commit hook, so the next session resumes from `tasks.md` and the git history, and say which task comes next.
- A blocker that changes a decision of the plan (an image or a service that is no longer available, a dependency that does not do what `research.md` assumed) is the user's call: show the options, and end your turn.
