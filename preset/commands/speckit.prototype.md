---
description: 'Optional: write the user journeys of a feature, then a clickable HTML mockup in the theme of the app, with the designer, the design reviewer and the user, before the plan.'
argument-hint: 'Optional: the user stories or screens to prototype, or what to change in the prototype'
---

<!-- Boilerplate preset (source: tools/spec-kit/preset). A command of its own, not part of core Spec Kit. -->

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Before the technical plan of a feature that has screens, let the user see and judge them: first the user journeys (`specs/NNN-<name>/prototypes/journeys.md`), then a clickable mockup of those journeys, static HTML pages in the real theme of the app, with desktop and mobile captures that become the visual contract of `/speckit-plan` and `/speckit-implement`.

This step is optional: the user runs it on the features they judge important, between `/speckit-clarify` and `/speckit-plan`. The `designer` agent produces, the `relecteur-design` agent reviews it cold, you show both to the user, and the user decides, once for the journeys and once for the mockup.

## Steps

1. **Feature.** You are on the branch of the feature (`NNN-<name>`), with a clean working tree, and `specs/NNN-<name>/spec.md` exists without `[NEEDS CLARIFICATION]` markers; otherwise stop and point to `/speckit-specify` or `/speckit-clarify`. Read the spec. When `specs/design.md` does not exist, tell the user that the prototype will follow the current theme and that `/speckit-design` sets the direction of the product, then go on. When a prototype already exists, this run revises it: say so, and keep what the user input does not change.

2. **Journeys.**
   1. Launch the `designer` subagent in mode `parcours`, with the paths to read (`specs/prd.md`, `specs/design.md`, the spec, `specs/product.yml` for the epic journeys) and the user input.
   2. Launch the `relecteur-design` subagent in mode `parcours`, with the paths only, never the designer's report. On a blocking issue, send its report to the `designer` once for a fix, then go on: no second round.
   3. Show the user the journeys (screens, steps, errors and empty states, scenarios covered), the issues left and the ones disputed, with their proof. Wait for their approval; apply their changes and show again if needed.

3. **Mockup.**
   1. Launch the `designer` in mode `maquette`. It writes the pages, then runs `pnpm prototype specs/NNN-<name> --capture`, which compiles `styles.css` from `theme.css` and writes the captures.
   2. Launch the `relecteur-design` in mode `maquette`, paths only; one fix round on a blocking issue, as above.
   3. Check that the designer listed the missing components in the « Components to add to web-ui » section of `journeys.md`. Show the user the `file://` URL printed by `pnpm prototype` (the mockup opens in the browser, without a server), the captures, the components missing from `libs/web/ui`, and the issues left and disputed. Wait for their approval; apply their changes and show again if needed.

   With an agent other than Claude Code, ask the user to run `docs/agents/designer.md` and `docs/agents/relecteur-design.md` in new sessions and paste their reports, for each mode.

   When the user drops the prototype, remove the files of this run (`git clean -fd specs/NNN-<name>/prototypes/` for a new prototype, `git checkout --` for a revised one): the next command needs a clean tree.

4. **Back to the spec.** What the journeys and the mockup reveal that `spec.md` does not say (a step, an error case, a rule, an empty state) is proposed to the user as a change of `spec.md`: a new scenario takes the next free number of its story, scenarios are never renumbered, and a committed scenario is retired, not deleted. Write it only once the user approves.

5. **Check.** Run `pnpm -s spec:trace` (all specs, not the strict run on this feature: before the plan its scenarios have no test yet, which a `Draft` spec tolerates) and `pnpm prototype specs/NNN-<name>` (no dead link between the pages; a page nothing leads to is reported); fix what fails in the files of this command. `specs/` is not formatted by `pnpm format`.

6. **Commit.** Stage only `specs/NNN-<name>/prototypes/` and, when it changed, `specs/NNN-<name>/spec.md` (never `git add .`), and commit with a Conventional Commits message in English, such as `docs(<name>): add the prototype`.

7. **Report.** The journeys and their screens, the `file://` URL, the components to add to `libs/web/ui`, the changes to the spec, and the next step: `/speckit-plan`.

## Rules

- The prototype changes no file outside `specs/NNN-<name>/`: not the theme, not `libs/web/ui`, not `apps/web`. A theme change goes through `/speckit-design`.
- Its code is throwaway: it is never copied into `apps/` or `libs/`. The screens are built in the normal cycle, test first, from the plan.
- The spec stays the source of truth: a behavior shown only by the mockup does not exist until `spec.md` says it.
