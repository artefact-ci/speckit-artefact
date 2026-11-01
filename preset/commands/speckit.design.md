---
description: 'Set or revise the design direction of the product (specs/design.md) and apply it to the theme of the app, with the designer, the design reviewer and the user.'
argument-hint: 'Optional: what to change in the design direction, or references to follow'
---

<!-- Boilerplate preset (source: tools/spec-kit/preset). A command of its own, not part of core Spec Kit. -->

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Produce the design level of the product, between `/speckit-prd` and `/speckit-epics`: `specs/design.md` (users and their contexts, UX principles, voice and tone, accessibility, visual direction) and the theme of the app that applies it (`libs/web/ui/src/lib/styles/theme.css`). Every prototype (`/speckit-prototype`) and every screen inherits it.

The design direction belongs to the product, that is to the user. The `designer` agent drafts, the `relecteur-design` agent reviews it cold, you show both to the user, and the user decides. Nothing is written before the user has approved it.

## Steps

1. **Branch.** Stop if the working tree has uncommitted changes. On a `docs/product-*` branch left by `/speckit-prd`, stay on it. On `dev` (on `main`, switch to `dev` and pull it first), create and switch to `docs/product-design` (`docs/product-design-<short-name>` for a revision, as `/speckit-epics` does; `git switch -c`). On another branch, ask the user before going on.

2. **Read.** `specs/prd.md` (stop and point to `/speckit-prd` if it does not exist), `specs/design.md` if it exists, and `theme.css`.

3. **Ask.** At most 5 questions, one at a time, each with a recommended answer and the options, as `/speckit-clarify` does, and only on what changes the direction: the devices and conditions of use, the image the product must give (references the user likes or dislikes), an existing brand (colors, font), the accessibility level. Skip what the PRD or the user input already answers.

4. **Draft.** Launch the `designer` subagent in mode `cadrage`, with the paths to read and the user's answers. It drafts in place: `specs/design.md`, the tokens of `theme.css`, and a chosen font installed with its `knip.json` entry (see step 7), so that the review and the preview see the real files. With an agent other than Claude Code, ask the user to run `docs/agents/designer.md` in a new session and paste its report.

5. **Review.** Launch the `relecteur-design` subagent in mode `cadrage`, with the paths only, never the designer's report. When it reports a blocking issue, send that report to the `designer` once for a fix, then go on: no second round. With another agent, ask the user to run `docs/agents/relecteur-design.md` in a new session, as for the designer.

6. **Show, then wait.** Show the user:
   - a summary of each section of the draft `design.md`;
   - the token pairs before and after, with their contrast, and the font if one is chosen;
   - a preview of the theme, font included, on the existing components: `pnpm nx run web-ui:storybook` (http://localhost:6006) with the draft `theme.css`;
   - the blocking issues the reviewer left, and the ones the designer disputes, with their proof.

   Write nothing final until the user approves; apply their changes (through the designer when they are more than a value) and show again if needed. When the user declines, restore every file of the draft: `git checkout -- libs/web/ui/src/lib/styles/theme.css package.json pnpm-lock.yaml knip.json`, then `pnpm install`; `specs/design.md` is restored the same way when it was already tracked, and deleted only when this run created it.

7. **Finalize** the draft the user approved (the designer wrote it in step 4; these are the rules it follows):
   - `specs/design.md` from the template (`.specify/scripts/bash/resolve-template.sh design-template` prints its content), all placeholders replaced, template comments removed, in English.
   - `theme.css`: the approved tokens of `:root` and `.dark`, and `--radius`.
   - A font: `pnpm add @fontsource-variable/<name>` (or `@fontsource/<name>` when no variable version exists) at the root, an `@import` of it at the top of `theme.css`, and `--font-sans: '<Family>', ui-sans-serif, system-ui, sans-serif;` set in the `@theme inline` block. knip does not follow CSS imports: add the package to `ignoreDependencies` of `knip.json`, next to `tw-animate-css`.

8. **Stale prototypes.** List the `specs/NNN-*/prototypes/` of the specs whose status is neither `Implemented` nor `Shipped`: their captures no longer show the theme. Name them in the report; `/speckit-plan` warns about them too.

9. **Check.** Run `pnpm check`; fix what fails in the files of this command.

10. **Commit.** Stage only `specs/design.md`, `libs/web/ui/src/lib/styles/theme.css`, and for a font `package.json`, `pnpm-lock.yaml` and `knip.json` (never `git add .`), and commit with a Conventional Commits message in English, such as `docs(product): set the design direction and theme`.

11. **Report.** What changed in the direction and the theme, the disputed issues left to the user, the stale prototypes, and the next step: `/speckit-epics` (or `/speckit-specify` when the epics already exist).

## Rules

- The only code this command changes is `theme.css` and the font dependency (with its `knip.json` entry). What the direction needs beyond them (turning dark mode on or following the system setting, a density the spacing scale cannot give, a new component) goes to the `Deferred` section of `design.md`, to be built by a feature.
- Never edit `specs/prd.md`, `specs/product.yml` or a spec (`specs/NNN-*/`). A requirement the direction calls into question goes back to `/speckit-prd`: say which one in the report.
- Never write a color, radius or font in a component: the direction lives in the theme tokens.
