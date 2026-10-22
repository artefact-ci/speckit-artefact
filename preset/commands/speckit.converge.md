<!-- Boilerplate preset (source: tools/spec-kit/preset). Appended to the core command. -->

## Test Coverage of Acceptance Scenarios (boilerplate)

These rules come from the constitution (VIII. Test-First) and take precedence over any instruction above that contradicts them. They keep the append-only contract above: existing tasks are never edited or reordered.

- For every acceptance scenario (Given/When/Then) in `spec.md`, identified as `US<story>-AS<n>` (`US1-AS1`, …), find the automated test that covers it, at the level given by the plan's Test Strategy.
- A scenario without a covering test is a gap, even when the code seems to implement it. In the Convergence phase you append, emit the test task first, before any implementation task appended for the same scenario.
- Never report **Converged** while a scenario has no test.
