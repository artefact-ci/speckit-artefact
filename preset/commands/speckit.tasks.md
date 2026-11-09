<!-- artefact-sdd preset (source: preset/ of speckit-artefact). Appended to the core command. -->

## Project Stack (artefact-sdd)

Read `.specify/stack.yml` first: it names this project's branches, commands, test files and convention files. A key that is absent or `null` skips the step that uses it: say so in the report, never invent a command. When the file itself is missing, stop and ask the user to write it. In `tasks.md`, write the actual commands and paths, not the keys.

## Test-First Task Generation (artefact-sdd)

These rules come from the constitution (Test-First principle) and take precedence over any instruction above that contradicts them, including "Tests are OPTIONAL".

- Test tasks are MANDATORY: generate them for every user story, whether or not the spec or the user asks for tests.
- Every acceptance scenario of `spec.md` gets at least one test task, at the level and in the file given by the plan's Test Strategy, and referenced by its id `<feature number>-US<story>-AS<n>` (`003-US1-AS1`, …): the task says the test title starts with that id.
- Within a story, each test task comes before the implementation task it drives, and says to run the test (`commands.test`) and confirm it FAILS for the expected reason.
- Follow the order and paths of the tasks template: one user story per pull request.

## Before Writing the Tasks (artefact-sdd)

- **The plan against the code.** Check each path, route, layout, module and port the plan relies on against the code, and against the shared code listed under `shared` in `.specify/stack.yml`. When the plan contradicts the code (a route that its layout would redirect, a method that does not exist), stop and show the user the contradiction and what you would do, and end your turn there (the `after_tasks` commit hook waits for the answer); do not settle it alone. A design change goes back to `/speckit-plan`.
- **Existing tests the plan makes wrong.** Search the tests of what the plan changes (a route made public, a rule relaxed, a response reshaped) and add a task to change them, in the story that changes the behavior.
- **Dependencies.** A new dependency is added in the task of its first import, not ahead of it: a dependency that nothing imports yet fails the unused-dependency checks of many projects.
- **Project conventions.** Apply the rules of the convention files listed under `docs` (where a new environment variable is documented, how a module is generated, what a new page must carry) in the task that triggers them, not in Polish.
- **Prototype.** When `ui` is set and `specs/NNN-<name>/prototypes/captures/` exists, a task that builds a screen cites its captures. A component the plan adds to the component library (`ui.components`) gets its own tasks (test, then component and, when `ui.storybook` is true, its Storybook story) before the first screen that uses it.
- **Behavior without a scenario.** Production code the plan adds without an acceptance scenario (a role, a limit, a script option) still gets a test task, without a scenario id.

## Phases and Pull Requests (artefact-sdd)

- The phases are those of the tasks template, not the Setup and Foundational phases above: Phase 1 is Foundational (no Setup phase: the stack is in place), then one phase per user story, then Polish.
- The Foundational phase is delivered in the pull request of the first user story; keep in it only what that story needs too. Something only a later story needs (a module, a migration) goes in that story.
