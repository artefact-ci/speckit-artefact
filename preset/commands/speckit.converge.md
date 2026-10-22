<!-- Boilerplate preset (source: tools/spec-kit/preset). Appended to the core command. -->

## Test Coverage of Acceptance Scenarios (boilerplate)

These rules come from the constitution (VIII. Test-First) and take precedence over any instruction above that contradicts them. They keep the append-only contract above: existing tasks are never edited or reordered.

- For every acceptance scenario (Given/When/Then) in `spec.md`, identified as `<feature number>-US<story>-AS<n>` (`003-US1-AS1`, …), find the automated test that covers it, at the level given by the plan's Test Strategy.
- Run `pnpm -s spec:trace specs/<feature>` first: it maps each scenario id to the test files whose titles cite it, and lists orphan ids (tests citing a scenario that is not in the spec). Use its matrix as the starting point, then check that each mapped test actually asserts its scenario; a test that cites an id without checking the behavior is a gap.
- A scenario without a covering test is a gap, even when the code seems to implement it. In the Convergence phase you append, emit the test task first, before any implementation task appended for the same scenario.
- An orphan id means the spec changed or the test is mislabeled: append a task to fix the test title or the spec.
- Never report **Converged** while a scenario has no test or while `pnpm -s spec:trace specs/<feature>` exits with an error. Quote its final matrix in your report.
