<!-- Boilerplate preset (source: tools/spec-kit/preset). Appended to the core command. -->

## Test Coverage of Acceptance Scenarios (boilerplate)

These rules come from the constitution (VIII. Test-First) and take precedence over any instruction above that contradicts them. They keep the append-only contract above: existing tasks are never edited or reordered.

- For every acceptance scenario (Given/When/Then) in `spec.md`, identified as `<feature number>-US<story>-AS<n>` (`003-US1-AS1`, …), find the automated test that covers it, at the level given by the plan's Test Strategy.
- Run `pnpm -s spec:trace specs/<feature>` first: it maps each scenario id to the test files whose titles cite it, and lists orphan ids (tests citing a scenario that is not in the spec). Use its matrix as the starting point, then check that each mapped test actually asserts its scenario; a test that cites an id without checking the behavior is a gap.
- A scenario without a covering test is a gap, even when the code seems to implement it. In the Convergence phase you append, emit the test task first, before any implementation task appended for the same scenario.
- An orphan id means the spec changed or the test is mislabeled: append a task to fix the test title or the spec.
- A test that cites a retired scenario (`N. **Retired** …` in `spec.md`, or any scenario of a `Retired` spec) is stale: append a task to remove the test, or to retire the behavior it checks.
- When every active scenario of the spec has a test and you report **Converged**, set the spec's `**Status**` from `Draft` to `Implemented` (the only edit to `spec.md` allowed here). From then on, `pnpm -s spec:trace` fails in CI if a scenario loses its test.
- Never report **Converged** while a scenario has no test or while `pnpm -s spec:trace specs/<feature>` exits with an error. Quote its final matrix in your report.

## Gaps and Tasks (boilerplate)

These rules also take precedence over the instructions above, including "Little or no code yet: treat the entire specified scope as missing".

- **Already planned.** A gap that an open task of `tasks.md` already covers, unchanged, gets no new task: list it in the summary as "covered by T0xx". Append only what no open task covers, or what an open task gets wrong (then say which one).
- **Partial implementation.** Converge can run after `/speckit-implement` stopped part-way: assess what is done, and treat the open tasks as planned work.
- **Blocked from outside.** A task that cannot be done as planned (an image or a service no longer available, a dependency that does not do what `research.md` assumed) is a decision for the user: append one task that names the blocker and the options, says that the decision goes back to `/speckit-plan`, and comes before the blocked tasks it unblocks.
- **Unrequested but justified.** Code that no task asked for but that a done task made necessary (a test fixed because a route became public), with its reason in the commit or in `tasks.md`, is not a gap.
- **Severity in the task.** End a task appended for a CRITICAL or HIGH finding with its severity: `… per FR-001 (missing, CRITICAL)`.
- **Fresh test runs.** Before reporting **Converged**, run the tests of the story without the Nx cache (`pnpm nx affected -t test --skip-nx-cache`): a cached result proves nothing about the code as it is now.

## Independent Review (boilerplate)

An agent judges its own work generously: the work is reviewed by a reviewer that did not write it, in a fresh context, before converge concludes.

- When this pass finds no remaining gap for the user stories implemented on this branch (one story per pull request), get an independent review following `docs/agents/relecteur.md`, before handing the story over and before reporting **Converged**. In Claude Code, launch the `relecteur` subagent. With another agent, ask the user to run that review in a new session and paste its report.
- Give the reviewer only the base (`origin/main`) and the feature directory: never your summary, your reasoning or your opinion of the work.
- Each blocking finding becomes appended tasks, under the append-only contract above; when it concerns an acceptance scenario, the test task comes first. Do not hand the story over, nor report **Converged**, while a blocking finding is open.
- You may dispute a finding only with evidence (the code or test that disproves it). A disputed finding stays open: report it with that evidence, do not report **Converged**, and let the user decide (they close it, or it becomes a task); never drop it silently.
- Quote the reviewer's verdict, and the items it left to human review, in your report.
