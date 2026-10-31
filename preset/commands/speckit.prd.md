---
description: 'Write or revise the product requirements document (specs/prd.md) and the requirements of the product index (specs/product.yml), with the user.'
argument-hint: 'Product description, path to a requirements document, or the change to make'
---

<!-- Boilerplate preset (source: tools/spec-kit/preset). A command of its own, not part of core Spec Kit. -->

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Produce the level above the features: `specs/prd.md` (the why and the what of the whole product, for people) and the `requirements` list of `specs/product.yml` (the ids that specs cite and `pnpm -s spec:trace` checks). The epics are not part of this command: `/speckit-epics` comes next.

The PRD and the index belong to the product, that is to the user. You draft; the user decides. Nothing is written before the user has approved it.

## Steps

1. **Branch.** Stop if the working tree has uncommitted changes. On `main`, create and switch to `docs/product-<short-name>` (`git switch -c`); on another branch, ask the user before going on.

2. **Read what exists.** `specs/prd.md` and `specs/product.yml` if they exist, and the output of `pnpm -s spec:trace` (states of the requirements and epics). When the user input is a path, read that document: it is the source, the PRD restates it, it does not invent beyond it.

3. **Find the gaps.** Check the source and the existing PRD against each section of the template (`.specify/scripts/bash/resolve-template.sh prd-template`): vision, users, problems, scope and non-goals, constraints, success metrics, requirements. Ask at most 5 questions, one at a time, each with a recommended answer and the options, as `/speckit-clarify` does. Ask only what changes the requirements or the scope; anything else goes to **Open Questions**.

4. **Draft the requirements.** One requirement = one capability a user can be given or refused, testable through specs later. For each one:
   - an id `<PREFIX>-<number>`: the source's own id if it has one, otherwise a short prefix per area (`ACC`, `PAY`, `ORD`) and the next free number of that prefix;
   - a short title, the same in the PRD and in the index;
   - no technology, no screen, no data model: those belong to `/speckit-plan`.

   Revising an existing index, ids are never renumbered nor reused. A dropped requirement gets `retired: <reason>` in `specs/product.yml` and is struck through in the PRD with the same reason; a changed requirement keeps its id if its intent stays the same, otherwise the old one is retired and a new one is created.

5. **Show the draft, then wait.** Show the user the requirement table (id, title, area, and for a revision: added, changed, retired) and a summary of the PRD sections. Write nothing until the user approves; apply their changes and show again if needed.

6. **Write.**
   - `specs/prd.md` from the template, all placeholders replaced, comments of the template removed. In English, like the specs.
   - In `specs/product.yml`, the `requirements` list only. Keep the existing `epics` and the comments as they are. Create the file with this header when it does not exist:

     ```yaml
     # Product index: owned by the product (CODEOWNERS). Ids are never renumbered: retire them.
     # Narrative in specs/prd.md. Checked by `pnpm -s spec:trace`.
     ```

7. **Check.** Run `pnpm -s spec:trace`. When the index already has epics, a new requirement belongs to no epic and spec:trace fails: tell the user that `/speckit-epics` must place it, and go on to the commit anyway (the branch is not merged until it passes). Any other error is yours: fix it.

8. **Commit.** Stage only `specs/prd.md` and `specs/product.yml` (never `git add .`), and commit with a Conventional Commits message in English, such as `docs(product): add the product requirements document` or `docs(product): retire PAY-01`.

9. **Report.** The number of requirements (added, changed, retired), the open questions left, and the next step: `/speckit-epics`.

## Rules

- Never write a state (specified, done, shipped) in the PRD or the index: states are derived from the specs.
- Never edit a spec (`specs/NNN-*/`) from this command. When a retired or changed requirement is cited by a spec, list those specs in the report: changing them is a feature change, with its own spec update.
- The PRD says what and why. Anything about how (domains, endpoints, tables, flags) is out of place here.
