<!-- Boilerplate preset (source: tools/spec-kit/preset). Appended to the core command. -->

## Test Coverage of Acceptance Scenarios (boilerplate)

These rules come from the constitution (VIII. Test-First) and take precedence over any instruction above that contradicts them.

- For every acceptance scenario (Given/When/Then) in `spec.md`, find the automated test that covers it, at the level given by the plan's Test Strategy.
- A scenario without a covering test is a gap, even when the code seems to implement it. Append a test task for it, placed before any implementation task it drives, in the format of `tasks.md`.
- A test that exists but was never seen failing (for example, written after the code) is reported, not silently accepted.
- Never report **Converged** while a scenario has no test.
