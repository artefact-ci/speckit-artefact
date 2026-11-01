<!-- Boilerplate preset (source: tools/spec-kit/preset). Appended to the core command. -->

## Test-First Task Generation (boilerplate)

These rules come from the constitution (VIII. Test-First) and take precedence over any instruction above that contradicts them, including "Tests are OPTIONAL".

- Test tasks are MANDATORY: generate them for every user story, whether or not the spec or the user asks for tests.
- Every acceptance scenario of `spec.md` gets at least one test task, at the level and in the file given by the plan's Test Strategy, and referenced by its id `<feature number>-US<story>-AS<n>` (`003-US1-AS1`, …): the task says the test title starts with that id.
- Within a story, each test task comes before the implementation task it drives, and says to run the test and confirm it FAILS for the expected reason.
- Follow the order and paths of the tasks template: one user story per pull request.

## Before Writing the Tasks (boilerplate)

- **The plan against the code.** Check each path, route, layout and port the plan relies on against the code (`apps/web/src/routes/`, the facades, `api-core`). When the plan contradicts the code (a route under `_authenticated` that this layout would redirect, a facade method that does not exist), stop and show the user the contradiction and what you would do, and end your turn there (the `after_tasks` commit hook waits for the answer); do not settle it alone. A design change goes back to `/speckit-plan`.
- **Existing tests the plan makes wrong.** Search the tests of what the plan changes (a route made public, a rule relaxed, a response reshaped) and add a task to change them, in the story that changes the behavior.
- **Dependencies.** A new dependency is added in the task of its first import, not ahead of it: knip fails in CI on a dependency that nothing imports yet.
- **Configuration.** A new environment variable goes, in the task that adds it to the validated environment, into the `.env.example` of its app, `docs/reference/variables-environnement.md` (for the API and the identity service, a test checks that every variable is documented) and, when it is required in production, `docker-compose.prod.yml`. Not in Polish.
- **Behavior without a scenario.** Production code the plan adds without an acceptance scenario (a role in a claim, a limit in the identity service, a script option) still gets a test task, without a scenario id.

## Phases and Pull Requests (boilerplate)

- The phases are those of the tasks template, not the Setup and Foundational phases above: Phase 1 is Foundational (no Setup phase: the stack is in place), then one phase per user story, then Polish.
- The Foundational phase is delivered in the pull request of the first user story; keep in it only what that story needs too. Something only a later story needs (a domain, a migration) goes in that story.
