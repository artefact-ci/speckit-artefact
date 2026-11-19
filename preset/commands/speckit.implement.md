<!-- artefact-sdd preset (source: preset/ of speckit-artefact). Appended to the core command. -->

## Project Stack (artefact-sdd)

Read `.specify/stack.yml` first: it names this project's branches, commands, test files and convention files. `commands.test` and `commands.affected` are required: when one is missing, or the file itself, stop and ask the user to write it. Any other key that is absent or `null` skips the step that uses it: say so in the report, never invent a command. An absent key never removes a test: tests always run, with what `tests.needs` lists.

## Language (artefact-sdd)

Write the artifacts in the project language: `language` in `.specify/memory/language.yml`, a BCP 47 code (`fr`); English when the file does not exist. What stays as the template or the tools write it, in every language: the headings of the templates (`## Requirements`, `### User Story 1 - …`, `## Complexity Tracking`: commands and reviewers find sections by them), the markers that the trace command reads (`**Status**:` and its values `Draft`, `Implemented`, `Shipped`, `Retired`; `**Product Requirements**:`; `**Acceptance Scenarios**`; `**Retired**`), the `[NEEDS CLARIFICATION]` markers that commands look for, the task lines (`- [ ] T001 [P] [US1] …`), the ids (`003-US1-AS2`, `PAY-03`, `E03-J1`, `P1`) and the YAML keys of `specs/product.yml`. Commit messages, code, identifiers and test titles stay in English. A file still written in another language: write what you add or rewrite in the project language, and leave the rest as it is.

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
- At the story's refactor task and checkpoint, every test of the story passes, `commands.affected` passes and, when `e2e` is set, `e2e.command` passes; do not move to the next story before.
- Run integration and end-to-end tests with what they need (`tests.needs`, and the services the convention files name); never skip or weaken a test to get green, and never because a key of `.specify/stack.yml` is absent.
- When `e2e` is set, the browser journeys live under `e2e.dir` and run with `e2e.command` (also to see a new journey fail); run `e2e.setup` once the first time. A failing journey blocks the checkpoint like any other test.

## Subagent Mode (artefact-sdd)

An on-demand mode to go faster: the `[P]` tasks of a phase are done at the same time by `implementeur` subagents, while you keep `tasks.md`, the checks and the commits. The Test-First Rules above still apply to every task.

- **When.** Only when the user input asks for it: `--subagents`, or the same request in words. The rest of the input keeps its meaning. Without it, implement as above, one task at a time.
- **Fallback.** If your agent cannot launch subagents, or `.specify/extensions/artefact-product/agents/implementeur.md` is missing, implement one task at a time and say so in the report; do not stop, and do not ask the user to open new sessions.
- **Waves.** A wave is a run of consecutive `[P]` tasks of the same phase, at most 4. Never put two tasks that name the same file in one wave: the second one waits for the next wave. A task whose tests need a service of `tests.needs`, or a browser journey (`e2e`), joins a wave only when the convention files say such tests can run in parallel; otherwise do it on its own. Tasks without `[P]`, refactor tasks and checkpoints are yours, one at a time, as above.
- **Launch.** One `implementeur` subagent per task of the wave, all launched in the same turn so that they run at the same time. Give each one only its task id, its exact line of `tasks.md` and the feature directory.
- **After the wave**, before checking any task:
  1. run the commands its reports list under « Commandes à lancer », in the order given;
  2. run `git status` and `git log`: no commit since the wave started, `tasks.md` unchanged, and only the files named by the wave's tasks changed. Anything else, look at it and fix it yourself before going on;
  3. run the wave's tests yourself (`commands.test`, filtered to their files): each test task's test fails for the expected reason (quote the line), and the tests of each implementation task pass;
  4. then check the tasks and go on with the Test-First Rules above (`commands.affected` after shared code, the commit after a green step).
- **Stopped or failed tasks.** A task whose report says « arrêtée », or whose check at step 3 fails, is yours, one at a time, after the wave; never launch it again in a subagent with the same input. A test that passed on its first run follows the Test-First Rule above: its task stays unchecked.
- **Report.** List the waves and the tasks each one held, and the tasks you took back.

## Stopping Before the End (artefact-sdd)

When the command stops before the last task (a question for the user, a task blocked by infrastructure, the end of a session):

- In subagent mode, let a running wave finish and do its after-wave checks before stopping.

- Leave the tree green: the tests of the tasks done pass, and no test task is checked without its failure seen.
- Under the blocked task in `tasks.md`, write why it is blocked and what would unblock it.
- Run the `after_implement` commit hook, so the next session resumes from `tasks.md` and the git history, and say which task comes next.
- A blocker that changes a decision of the plan (an image or a service that is no longer available, a dependency that does not do what `research.md` assumed) is the user's call: show the options, and end your turn.
