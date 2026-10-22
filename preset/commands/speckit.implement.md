<!-- Boilerplate preset (source: tools/spec-kit/preset). Appended to the core command. -->

## Test-First Rules (boilerplate)

These rules come from the constitution (VIII. Test-First) and take precedence over any instruction above that contradicts them.

- Never write production code before the test that requires it.
- Check a test task only after running the test and seeing it FAIL for the expected reason. Quote the relevant failure line in your progress report.
- If a new test passes on its first run, stop and report it: either the behavior already exists or the test does not test it.
- Write the minimum code that makes the failing test pass, then refactor with the tests green.
- Check an implementation task only after its tests pass and `pnpm nx affected -t lint typecheck test` passes.
- Run integration and end-to-end tests with Docker available (Testcontainers); never skip or weaken a test to get green.
