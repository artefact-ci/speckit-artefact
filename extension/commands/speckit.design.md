---
description: 'Set or revise the design direction of the product (specs/design.md) and apply it to the theme of the app, with the designer, the design reviewer and the user.'
argument-hint: 'Optional: what to change in the design direction, or references to follow'
---

<!-- artefact-product extension (source: extension/ of speckit-artefact). A command of its own, not part of core Spec Kit. -->

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Project Stack

Read `.specify/stack.yml` first: it names this project's branches, commands and front end. A key that is absent or `null` skips the step that uses it: say so in the report, never invent a command. When the file itself is missing, stop and ask the user to write it.

- With `ui` set, this command writes `specs/design.md` and applies its visual direction to the theme file `ui.theme`, which is then required: when it is missing, stop and ask the user to add it.
- With `ui: null` (no front end), it writes `specs/design.md` without visual direction: users and contexts, UX principles, voice and tone (the product still speaks, by message, voice or email), accessibility. The steps marked « (ui) » below are skipped, and the sections Visual Direction and Theme say `N/A: no front end`.

## Goal

Produce the design level of the product, between `/speckit-prd` and `/speckit-epics`: `specs/design.md` (users and their contexts, UX principles, voice and tone, accessibility, visual direction) and the theme of the app that applies it (`ui.theme`). Every prototype (`/speckit-prototype`) and every screen inherits it.

The design direction belongs to the product, that is to the user. The `designer` agent drafts, the `relecteur-design` agent reviews it cold, you show both to the user, and the user decides. Nothing is committed before the user has approved it.

This command works with the agents of the method (`designer`, `relecteur-design`): their instructions are in `docs/agents/`, installed with the method. When one of these files is missing, stop and tell the user: the review cannot be skipped.

## Steps

1. **Branch.** Stop if the working tree has uncommitted changes. On a `docs/product-*` branch left by `/speckit-prd`, stay on it. On `branches.base` of `.specify/stack.yml` (on `branches.production`, switch to `branches.base` and pull it first; without `branches.base`, the default branch of the repository), create and switch to `docs/product-design` (`docs/product-design-<short-name>` for a revision, as `/speckit-epics` does; `git switch -c`). On another branch, ask the user before going on.

2. **Read.** `specs/prd.md` (stop and point to `/speckit-prd` if it does not exist), `specs/design.md` if it exists, the convention files listed under `docs` in `.specify/stack.yml`, and (ui) the theme file `ui.theme`.

3. **Ask.** At most 5 questions, one at a time, each with a recommended answer and the options, as `/speckit-clarify` does, and only on what changes the direction: the devices, channels and conditions of use, the image the product must give (references the user likes or dislikes), an existing brand (colors, font, tone), the accessibility level. Skip what the PRD or the user input already answers.

4. **Draft.** Launch the `designer` subagent in mode `cadrage`, with the paths to read, the user's answers and, when `ui` is `null`, that the project has no front end. It drafts in place: `specs/design.md` and (ui) the tokens of the theme file, with a chosen font installed (see step 7), so that the review and the preview see the real files. With an agent other than Claude Code, ask the user to run `docs/agents/designer.md` in a new session and paste its report.

5. **Review.** Launch the `relecteur-design` subagent in mode `cadrage`, with the paths only and, when `ui` is `null`, the fact that the project has no front end (so Visual Direction and Theme are `N/A` on purpose); never the designer's report. When it reports a blocking issue, send that report to the `designer` once for a fix, then go on: no second round. With another agent, ask the user to run `docs/agents/relecteur-design.md` in a new session, as for the designer.

6. **Show, then wait.** Show the user:
   - a summary of each section of the draft `design.md`;
   - (ui) the token pairs before and after, with their contrast, and the font if one is chosen;
   - (ui) a preview of the theme, font included, on the existing components: start `ui.preview` in the background with the draft theme, give the user the URL it prints, and stop it once the user has decided; without `ui.preview`, say that there is no preview and show the token values;
   - the blocking issues the reviewer left, and the ones the designer disputes, with their proof.

   Write nothing final until the user approves; apply their changes (through the designer when they are more than a value) and show again if needed. When the user declines, restore every file of the draft: `git checkout --` each tracked file it changed and delete each untracked file it created (`git status --short` lists them: the theme, and for a font the manifest, the lockfile and any configuration it touched), then reinstall the dependencies when the lockfile was restored; `specs/design.md` is restored the same way when it was already tracked, and deleted only when this run created it.

7. **Finalize** the draft the user approved (the designer wrote it in step 4; these are the rules it follows):
   - `specs/design.md` from the template (`.specify/scripts/bash/resolve-template.sh design-template` prints its content), all placeholders replaced, template comments removed, in English.
   - (ui) The theme file `ui.theme`: the approved tokens, written in the form the file already uses (light and dark values, radius), never a new mechanism.
   - (ui) A font: added as a dependency of the project, imported and set as the main font where the theme file does it, with a generic fallback after it (`ui-sans-serif, system-ui, sans-serif`), following the convention files (a check of unused dependencies may need to be told about a package imported from CSS only).
   - Installing a font and reinstalling dependencies use the project's package manager, as the convention files or the lockfile show it: that is reading the project, not inventing a command. When neither shows it, ask the user.

8. **Stale prototypes** (ui). List the `specs/NNN-*/prototypes/` of the specs whose status is neither `Implemented` nor `Shipped`: their captures no longer show the theme. Name them in the report; `/speckit-plan` warns about them too.

9. **Check.** Run `commands.check` of `.specify/stack.yml` when it exists, otherwise `commands.affected`; fix what fails in the files of this command.

10. **Commit.** Stage only `specs/design.md` and (ui) the theme file and, for a font, the files the installation changed (never `git add .`), and commit with a Conventional Commits message in English, such as `docs(product): set the design direction and theme`.

11. **Report.** What changed in the direction and the theme, the disputed issues left to the user, the stale prototypes, and the next step: `/speckit-epics` (or `/speckit-specify` when the epics already exist).

## Rules

- The only code this command changes is the theme file and the font dependency (with what its installation needs). What the direction needs beyond them (turning dark mode on or following the system setting, a density the spacing scale cannot give, a new component) goes to the `Deferred` section of `design.md`, to be built by a feature.
- Never edit `specs/prd.md`, `specs/product.yml` or a spec (`specs/NNN-*/`). A requirement the direction calls into question goes back to `/speckit-prd`: say which one in the report.
- Never write a color, radius or font in a component: the direction lives in the theme tokens.
