<!-- artefact-sdd preset (source: preset/ of speckit-artefact). Appended to the core command. -->

## Project Stack (artefact-sdd)

Read `.specify/stack.yml` first: it names this project's branches, commands, test files and convention files. `commands.test` and `commands.affected` are required: when one is missing, or the file itself, stop and ask the user to write it. Any other key that is absent or `null` skips the step that uses it: say so in the report, never invent a command. An absent key never removes a test: tests always run, with what `tests.needs` lists.

## Decisions for the User (artefact-sdd)

These rules take precedence over any instruction above that contradicts them. The plan is the agent's proposal; some choices are the user's.

- **Stop and ask** before designing on top of a choice that:
  - deviates from a principle of the constitution or from a convention of the files listed under `docs` in `.specify/stack.yml` (an unchecked box of the Constitution Check);
  - changes a path listed in `.github/CODEOWNERS`, when the repository has one, beyond what the feature obviously needs;
  - adds an infrastructure dependency (a database, a queue, a service the app calls, a cloud SDK, a container image);
  - picks between designs that will be hard to change later (how shared data is partitioned, a new role, where files are stored).

  List each one in **Decisions for the User** of the plan: the question, the options with what each one costs, and your recommendation. Show them to the user and end your turn there: the rest of the command, and its `after_plan` commit hook, run only once every decision has an answer. Then record each answer and its reason in that section, and go on.

- Everything else you settle yourself, in `research.md`, and say so in the report.

## Research (artefact-sdd)

- Resolve the unknowns from the repo first: the convention files listed under `docs` in `.specify/stack.yml` (they prevail over the plan template wherever the two differ), the architecture notes and decision records of the repository, and the existing code. Launching research agents is optional; do it only when it saves reading many files.
- When those docs give rules for the plan (code to remove before the first feature, names already taken, a layout to follow), apply them; a conflict between them and the feature is a decision for the user.

## Test Strategy (artefact-sdd)

- A scenario that needs a later story (a story 2 scenario about products that arrive in story 3) is cited by the test of the story that completes it. The earlier story may test the part it delivers, without the scenario id; say so in the Test Strategy.

## Prototype (artefact-sdd)

When `ui` is set in `.specify/stack.yml` and `specs/NNN-<name>/prototypes/` exists (written by `/speckit-prototype`), the plan builds on it; otherwise nothing changes and nothing blocks.

- Read `prototypes/journeys.md` and look at the captures of `prototypes/captures/`. In the plan, cite next to each screen to build the captures that fix it (`prototypes/captures/cart-desktop.png`, `cart-mobile.png`): they are the visual contract of `/speckit-implement`.
- The components drawn in the mockup that the component library (`ui.components`) lacks, listed in `journeys.md`, are added to that library by the plan, test first and, when `ui.storybook` is true, with their Storybook story, before the screens that use them.
- When the captures are older than the design direction (`git log -1 --format=%cI -- specs/NNN-<name>/prototypes/captures` before `git log -1 --format=%cI -- specs/design.md`), write it in the plan and tell the user: the theme changed since, and `/speckit-prototype` can refresh them.
