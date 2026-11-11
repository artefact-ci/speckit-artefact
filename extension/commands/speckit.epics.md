---
description: 'Group the product requirements into epics, order them by their dependencies and declare their end-to-end journeys, in specs/product.yml, with the user.'
argument-hint: 'Optional: the epics to revise, or a constraint on the order'
---

<!-- artefact-product extension (source: extension/ of speckit-artefact). A command of its own, not part of core Spec Kit. -->

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Project Stack

Read `.specify/stack.yml` first: it names this project's branches, commands and front end. A key that is absent or `null` skips the step that uses it: say so in the report, never invent a command. When the file itself is missing, stop and ask the user to write it.

## Goal

Turn the requirements of `specs/product.yml` into a delivery plan: epics (`E01`), each with a goal, the requirements it groups, the epics it waits for (`depends_on`), its priority (`P1`, `P2`…) and its end-to-end journeys (`E01-J1`). The trace command (`commands.trace`) then derives the state of each epic from the specs, sorts the epics by priority and names the next one to deliver, requires a test per journey once an epic is done, and warns when a feature advances on an epic whose dependencies are not done.

The index belongs to the product, that is to the user. You propose, as the product owner of `.specify/extensions/artefact-product/agents/po.md`; the `relecteur-produit` agent reviews the proposal cold; you show both to the user, and the user decides the grouping and the order. Nothing is committed before the user has approved it.

This command works with the agents of the method (`.specify/extensions/artefact-product/agents/po.md`, `relecteur-produit`): their instructions are in `.specify/extensions/artefact-product/agents/`, installed with the `artefact-product` extension. When one of these files is missing, stop and tell the user: the review cannot be skipped.

## Steps

1. **Branch.** Stop if the working tree has uncommitted changes. On `branches.base` of `.specify/stack.yml` (on `branches.production`, switch to `branches.base` and pull it first; without `branches.base`, the default branch of the repository), create and switch to `docs/product-epics` (or `docs/product-<short-name>` for a revision; `git switch -c`); on a `docs/product-*` branch left by `/speckit-prd`, stay on it; on another branch, ask the user before going on.

2. **Read.** `.specify/extensions/artefact-product/agents/po.md` (the standards you propose by, and the reviewer judges by), `specs/product.yml` (stop and point to `/speckit-prd` if it does not exist or has no requirement), `specs/prd.md` (vision, users, problems, constraints), and the output of the trace command: the states of the requirements and of the existing epics (without it, read the `**Status**` and `**Product Requirements**` of the specs).

3. **Group.** An epic is a user outcome the product can deliver and demonstrate on its own (`A customer pays and gets refunded without support`), not a technical layer (`database`, `API`, `screens`) nor a team. Each active requirement goes into exactly one epic; a retired one stays where it is, or out of every epic. Aim for epics that a few features, each one a few user stories, can deliver. When a single requirement makes an epic of its own and depends on nothing, say so: it may stay as it is.

4. **Order.** `depends_on` lists the epics whose outcome this one needs before it can be built or used (no payment before an account exists). Only real dependencies: a preference of order is not one. No cycle. Then give each epic a priority level, `P1` the most urgent (what the first release cannot go without), then `P2`, `P3`…: dependencies first, then the epics that bring the most value or remove the most risk, and say why. Every epic has one, or none does; an epic is never more urgent than an epic it depends on (the trace command refuses it). Among the epics whose dependencies are done, the trace command names those of the most urgent level as the next ones, in the order of the file: write the epics of a level in the order you propose.

5. **Journeys.** For each epic, the paths a user takes across several features to reach its outcome, written as steps an end-to-end test can follow (`sign up`, `order`, `pay by mobile money`, `ask for a refund`). One to three per epic, the ones that prove the outcome. A journey belongs to the epic it completes, even when its first steps come from the epics it depends on. Their tests are written when the epic is done, as end-to-end tests (under `e2e.dir` when the project has browser journeys, otherwise at the level its convention files give), titled `'<journey id>: …'`.

6. **Write the draft** in place, so that the reviewer reads the real file (step 8 restores it if the user declines). First check the proposal against `specs/product.yml`: every active requirement is in exactly one epic, every dependency names an epic of the proposal, and no dependency loops; fix it before writing, the trace command must not be the first to find a forgotten requirement. Then write the `epics` list of `specs/product.yml`. Keep the `requirements` list and the comments as they are. Titles, goals and steps are in the project language (see Rules). An epic has `id`, `title`, `goal`, `requirements`, `depends_on` (may be empty), `priority` and `journeys`; a journey has `id`, `title`, `steps` (at least one) and, once dropped, `retired`:

   ```yaml
   epics:
     - id: E01
       title: Shop goes live
       goal: A shop owner opens a storefront, and customers see it once it is approved.
       requirements: [SHP-01, SHP-02, CAT-01]
       depends_on: []
       priority: P1
       journeys:
         - id: E01-J1
           title: A new shop is approved and shown to customers
           steps:
             - the shop owner creates the shop
             - the Boutik team approves the shop
             - a customer sees the shop
   ```

   Revising:
   - ids of epics and journeys are never renumbered nor reused: a new one takes the next free number;
   - a dropped journey gets `retired: <reason>` and keeps its id; an epic is not retired by hand: it is retired once all its requirements are;
   - moving a requirement out of an epic that already has specs is the user's call: name those specs in the proposal.

7. **Review.** Launch the `relecteur-produit` subagent in mode `epics`, with the paths only: `specs/prd.md` and `specs/product.yml`. Never pass your notes nor the reasons of your order. When it reports a blocking issue, fix the draft once, or keep your version with a proof; then go on: no second round. If your agent cannot launch it, ask the user to run `.specify/extensions/artefact-product/agents/relecteur-produit.md` in a new session, with the same inputs only, and paste its report: the review is never skipped.

8. **Show the proposal, then wait.** Show the user a table (epic, goal, requirements, depends on, journeys), the proposed order with its reasons, for a revision the differences with the current index, and the reviewer's verdict: the issues you fixed, and those left or disputed, with their proof. Commit nothing until the user approves; apply their changes to the file and show again if needed. When the user declines, restore the draft: `git checkout -- specs/product.yml`.

9. **Check.** Run the trace command and fix every error it reports on the index (requirement in no epic or in two, unknown dependency, cycle, journey id that does not start with its epic id). A fix that only corrects the writing (a typo in an id, a missing field) is yours. A fix that changes what the user approved (where a requirement goes, a dependency) goes back to the user: show it and wait before committing. A journey without test is an error only once its epic is done: if the revision makes a done epic gain a journey, tell the user that its test is now owed. Without the trace command, check these rules yourself: every active requirement in exactly one epic, every dependency naming an existing epic, no cycle, every journey id starting with its epic id, ids never renumbered; and an epic is done when every one of its requirements is cited by a spec whose `**Status**` is `Implemented` or `Shipped`.

10. **Commit.** Stage only `specs/product.yml` (never `git add .`), and commit with a Conventional Commits message in English, such as `docs(product): group the requirements into epics`.

11. **Report.** The epics in their delivery order, the first epic with no unfinished dependency, and the next step: `/speckit-specify <epic id>` (for example `/speckit-specify E01`), which takes the requirements of that epic that no spec covers yet.

## Rules

- Write the artifacts in the project language: `language` in `.specify/memory/language.yml`, a BCP 47 code (`fr`); English when the file does not exist. What stays as the template or the tools write it, in every language: the headings of the templates (`## Requirements`, `### User Story 1 - …`, `## Complexity Tracking`: commands and reviewers find sections by them), the markers that the trace command reads (`**Status**:` and its values `Draft`, `Implemented`, `Shipped`, `Retired`; `**Product Requirements**:`; `**Acceptance Scenarios**`; `**Retired**`), the `[NEEDS CLARIFICATION]` markers that commands look for, the task lines (`- [ ] T001 [P] [US1] …`), the ids (`003-US1-AS2`, `PAY-03`, `E03-J1`, `P1`) and the YAML keys of `specs/product.yml`. Commit messages, code, identifiers and test titles stay in English. A file still written in another language: write what you add or rewrite in the project language, and leave the rest as it is.

- Never write a state (specified, done, shipped) in the index: states are derived from the specs.
- Never edit `specs/prd.md` from this command, nor a spec (`specs/NNN-*/`). A requirement that is missing, too broad or ambiguous while grouping goes back to `/speckit-prd`: say which one and why, in the proposal and in the report. It does not block the epics: a missing requirement is added by the next `/speckit-prd`, then placed by the next `/speckit-epics`; an ambiguous or too broad one still goes into an epic now, like every active requirement.
- An epic says what the user gets, not how it is built: no domain, endpoint, table or flag here.
