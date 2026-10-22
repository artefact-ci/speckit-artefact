<!-- Boilerplate preset (source: tools/spec-kit/preset). Appended to the core command. -->

## Test-First Rules (boilerplate)

These rules come from the constitution (VIII. Test-First) and take precedence over any instruction above that contradicts them.

- Never write production code before the test that requires it.
- Check a test task only after running the test and seeing it FAIL for the expected reason. Quote the relevant failure line in your progress report.
- If a new test passes on its first run, stop and report it: either the behavior already exists or the test does not test it.
- Write the minimum code that makes the failing test pass, then refactor with the tests green.
- Check an implementation task once the tests it drives pass, run on their own (`pnpm nx test <project>`, filtered to the file when possible). Other red tests of the same story may still fail at that point: that is expected.
- At the story's refactor task and checkpoint, every test of the story passes and `pnpm nx affected -t lint typecheck test` passes; do not move to the next story before.
- Run integration and end-to-end tests with Docker available (Testcontainers); never skip or weaken a test to get green.
