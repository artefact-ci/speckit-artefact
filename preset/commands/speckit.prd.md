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

The PRD and the index belong to the product, that is to the user. You draft, as the product owner of `docs/agents/po.md`; the `relecteur-produit` agent reviews the draft cold; you show both to the user, and the user decides. Nothing is committed before the user has approved it.

## Steps

1. **Branch.** Stop if the working tree has uncommitted changes. On `dev` (on `main`, switch to `dev` and pull it first), create and switch to `docs/product-<short-name>` (`git switch -c`); on another branch, ask the user before going on.

2. **Read what exists.** `docs/agents/po.md` (the standards you draft by, and the reviewer judges by), `specs/prd.md` and `specs/product.yml` if they exist, and the output of `pnpm -s spec:trace` (states of the requirements and epics). When the user input is a path, read that document: it is the source, the PRD restates it, it does not invent beyond it.

3. **Find the gaps.** Check the source and the existing PRD against each section of the template (`.specify/scripts/bash/resolve-template.sh prd-template` prints its content, not its path): vision, users, problems, scope and non-goals, constraints, success metrics, requirements. Ask at most 5 questions, one at a time, each with a recommended answer and the options, as `/speckit-clarify` does. Ask only what changes the requirements or the scope; anything else goes to **Open Questions**.

4. **Draft the requirements.** One requirement = one capability a user can be given or refused, testable through specs later. For each one:
   - an id `<PREFIX>-<number>` (uppercase prefix, dash, digits: `PAY-03`), the only form `spec:trace` accepts: the source's own id when it has that form, otherwise a short prefix per area (`ACC`, `PAY`, `ORD`) and the next free number of that prefix. When the source numbers its requirements another way (`REQ-1.2`, `F12`), keep the mapping in the PRD, after the title: `**PAY-03** Pay by mobile money (source: REQ-1.2): …`;
   - a short title, the same in the PRD and in the index;
   - no technology, no screen, no data model: those belong to `/speckit-plan`;
   - the other standards of `docs/agents/po.md` (testable, one capability, one actor, the rule that matters).

   Then check the coverage: every problem of the PRD is answered by at least one requirement. A problem left without one is either a missing requirement or a constraint (`order in the evening, delivered the next day`): say which in the draft, do not drop it silently.

   Revising an existing index, ids are never renumbered nor reused. A dropped requirement gets `retired: <reason>` in `specs/product.yml` and is struck through in the PRD with the same reason; a changed requirement keeps its id if its intent stays the same, otherwise the old one is retired and a new one is created.

5. **Write the draft** in place, so that the reviewer reads the real files (step 7 restores them if the user declines):
   - `specs/prd.md` from the template, all placeholders replaced, comments of the template removed. In English, like the specs.
   - In `specs/product.yml`, the `requirements` list only. Keep the existing `epics` and the comments as they are. An entry has `id`, `title` and, once dropped, `retired`; nothing else, the area is a YAML comment above its group. Create the file with this header when it does not exist:

     ```yaml
     # Product index: owned by the product (CODEOWNERS). Ids are never renumbered: retire them.
     # Narrative in specs/prd.md. Checked by `pnpm -s spec:trace`.
     ```

     Entries look like this:

     ```yaml
     requirements:
       # Payments
       - id: PAY-01
         title: Pay by mobile money
       - id: PAY-02
         title: Cash on delivery
         retired: replaced by PAY-05 (payment on pickup only)
     ```

6. **Review.** Launch the `relecteur-produit` subagent in mode `prd`, with the paths only: `specs/prd.md`, `specs/product.yml`, and the source (the path of the requirements document, or the user's own words from the user input, verbatim, never your summary). Never pass your notes nor the user's answers. When it reports a blocking issue, fix the draft once, or keep your version with a proof (the source line, the user's answer); then go on: no second round. With an agent other than Claude Code, ask the user to run `docs/agents/relecteur-produit.md` in a new session and paste its report.

7. **Show the draft, then wait.** Show the user the requirement table (id, title, area, source id, and for a revision: added, changed, retired), a summary of the PRD sections, and in a list of its own what the PRD leaves out of the source and why (a technology choice, a vendor not signed, a vague wish turned into a constraint or an open question). Nothing from the source disappears without the user seeing it. Then the reviewer's verdict: the issues you fixed, and those left or disputed, with their proof. Commit nothing until the user approves; apply their changes to the files and show again if needed. When the user declines, restore the draft: `git checkout -- specs/prd.md specs/product.yml` for the files already tracked, and delete those this run created.

8. **Check.** Run `pnpm -s spec:trace`. When the index already has epics, a new requirement belongs to no epic and spec:trace fails: tell the user that `/speckit-epics` must place it, and go on to the commit anyway (the branch is not merged until it passes). Any other error is yours: fix it.

9. **Commit.** Stage only `specs/prd.md` and `specs/product.yml` (never `git add .`), and commit with a Conventional Commits message in English, such as `docs(product): add the product requirements document` or `docs(product): retire PAY-01`.

10. **Report.** The number of requirements (added, changed, retired), the open questions left, and the next step: `/speckit-epics`.

## Rules

- Never write a state (specified, done, shipped) in the PRD or the index: states are derived from the specs.
- Never edit a spec (`specs/NNN-*/`) from this command. When a retired or changed requirement is cited by a spec, list those specs in the report: changing them is a feature change, with its own spec update.
- The PRD says what and why. Anything about how (domains, endpoints, tables, flags) is out of place here.
