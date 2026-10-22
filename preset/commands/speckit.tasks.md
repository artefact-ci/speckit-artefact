<!-- Boilerplate preset (source: tools/spec-kit/preset). Appended to the core command. -->

## Test-First Task Generation (boilerplate)

These rules come from the constitution (VIII. Test-First) and take precedence over any instruction above that contradicts them, including "Tests are OPTIONAL".

- Test tasks are MANDATORY: generate them for every user story, whether or not the spec or the user asks for tests.
- Every acceptance scenario of `spec.md` gets at least one test task, at the level and in the file given by the plan's Test Strategy, and referenced by its id `<feature number>-US<story>-AS<n>` (`003-US1-AS1`, …): the task says the test title starts with that id.
- Within a story, each test task comes before the implementation task it drives, and says to run the test and confirm it FAILS for the expected reason.
- Follow the order and paths of the tasks template: one user story per pull request.
