---
description: 'Optional: write the user journeys of a feature, then a clickable HTML mockup in the theme of the app, with the designer, the design reviewer and the user, before the plan.'
argument-hint: 'Optional: the user stories or screens to prototype, or what to change in the prototype'
---

<!-- artefact-product extension (source: extension/ of speckit-artefact). A command of its own, not part of core Spec Kit. -->

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Project Stack

Read `.specify/stack.yml` first: it names this project's branches, commands and front end. A key that is absent or `null` skips the step that uses it: say so in the report, never invent a command. When the file itself is missing, stop and ask the user to write it.

- With `ui: null` (no front end), there is nothing to prototype: stop and say so. The journeys of the epics, in `specs/product.yml`, still describe the paths across features.
- With `ui` set, `ui.theme` is required: when it is missing, stop and ask the user to add it.
- Without `ui.prototype`, the tool that builds and captures the mockup, run the journeys (step 2) only: say that the mockup needs `ui.prototype`, write `None (no mockup)` under « Components to add to the component library » of `journeys.md`, and go to step 4.

## Goal

Before the technical plan of a feature that has screens, let the user see and judge them: first the user journeys (`specs/NNN-<name>/prototypes/journeys.md`), then a clickable mockup of those journeys, static HTML pages in the real theme of the app (`ui.theme`), with desktop and mobile captures that become the visual contract of `/speckit-plan` and `/speckit-implement`.

This step is optional: the user runs it on the features they judge important, between `/speckit-clarify` and `/speckit-plan`. The `designer` agent produces, the `relecteur-design` agent reviews it cold, you show both to the user, and the user decides, once for the journeys and once for the mockup.

This command works with the agents of the method (`designer`, `relecteur-design`): their instructions are in `.specify/extensions/artefact-product/agents/`, installed with the `artefact-product` extension. When one of these files is missing, stop and tell the user: the review cannot be skipped. If your agent cannot launch a subagent, ask the user to run `.specify/extensions/artefact-product/agents/designer.md` and `.specify/extensions/artefact-product/agents/relecteur-design.md` in new sessions, with the same inputs only, and paste their reports, for each mode: the review is never skipped.

When the user drops the prototype, at any step, remove the files of this run (`git clean -fd specs/NNN-<name>/prototypes/` for a new prototype, `git checkout --` for a revised one): the next command needs a clean tree.

## Steps

1. **Feature.** You are on the branch of the feature (`NNN-<name>`), with a clean working tree, and `specs/NNN-<name>/spec.md` exists without `[NEEDS CLARIFICATION]` markers; otherwise stop and point to `/speckit-specify` or `/speckit-clarify`. Read the spec. When `specs/design.md` does not exist, tell the user that the prototype will follow the current theme and that `/speckit-design` sets the direction of the product, then go on. When a prototype already exists, this run revises it: say so, and keep what the user input does not change.

2. **Journeys.**
   1. Launch the `designer` subagent in mode `parcours`, with the paths to read (`specs/prd.md`, `specs/design.md`, the spec, `specs/product.yml` for the epic journeys) and the user input.
   2. Launch the `relecteur-design` subagent in mode `parcours`, with the paths only, never the designer's report. On a blocking issue, send its report to the `designer` once for a fix, then go on: no second round.
   3. Show the user the journeys (screens, steps, errors and empty states, scenarios covered), the issues left and the ones disputed, with their proof. Wait for their approval; apply their changes and show again if needed.

3. **Mockup.**
   1. Launch the `designer` in mode `maquette`, with the command `ui.prototype` as written in `.specify/stack.yml`. It writes the pages, then runs `<ui.prototype> specs/NNN-<name> --capture`, which compiles the styles of the mockup from the theme and writes the captures.
   2. Launch the `relecteur-design` in mode `maquette`, paths only; one fix round on a blocking issue, as above.
   3. Check that the designer listed the missing components in the « Components to add to the component library » section of `journeys.md`. Show the user the `file://` URL printed by `ui.prototype` (the mockup opens in the browser, without a server), the captures, the components missing from the component library (`ui.components`), and the issues left and disputed. Wait for their approval; apply their changes and show again if needed.

4. **Back to the spec.** What the journeys and the mockup reveal that `spec.md` does not say (a step, an error case, a rule, an empty state) is proposed to the user as a change of `spec.md`: a new scenario takes the next free number of its story, scenarios are never renumbered, and a committed scenario is retired, not deleted. Write it only once the user approves.

5. **Check.** Run the trace command, `commands.trace`, without a spec directory, so that it checks all specs (not this feature alone: before the plan its scenarios have no test yet, which a `Draft` spec tolerates); without it, check the scenario ids of `spec.md` yourself (numbers unique within each story, none renumbered, retired ones kept). When there is a mockup, run `<ui.prototype> specs/NNN-<name>` (no dead link between the pages; a page nothing leads to is reported); fix what fails in the files of this command.

6. **Commit.** Stage only `specs/NNN-<name>/prototypes/` and, when it changed, `specs/NNN-<name>/spec.md` (never `git add .`), and commit with a Conventional Commits message in English, such as `docs(<name>): add the prototype`.

7. **Report.** The journeys and their screens, the `file://` URL, the components to add to the component library, the changes to the spec, and the next step: `/speckit-plan`.

## Rules

- The prototype changes no file outside `specs/NNN-<name>/`: not the theme, not the component library, not the app. A theme change goes through `/speckit-design`.
- Its code is throwaway: it is never copied into the code of the app. The screens are built in the normal cycle, test first, from the plan.
- The spec stays the source of truth: a behavior shown only by the mockup does not exist until `spec.md` says it.
