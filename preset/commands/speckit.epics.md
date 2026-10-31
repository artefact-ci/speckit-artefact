---
description: 'Group the product requirements into epics, order them by their dependencies and declare their end-to-end journeys, in specs/product.yml, with the user.'
argument-hint: 'Optional: the epics to revise, or a constraint on the order'
---

<!-- Boilerplate preset (source: tools/spec-kit/preset). A command of its own, not part of core Spec Kit. -->

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Turn the requirements of `specs/product.yml` into a delivery plan: epics (`E01`), each with a goal, the requirements it groups, the epics it waits for (`depends_on`) and its end-to-end journeys (`E01-J1`). `pnpm -s spec:trace` then derives the state of each epic from the specs, requires a test per journey once an epic is done, and warns when a feature advances on an epic whose dependencies are not done.

The index belongs to the product, that is to the user. You propose; the user decides the grouping and the order. Nothing is written before the user has approved it.

## Steps

1. **Branch.** Stop if the working tree has uncommitted changes. On `main`, create and switch to `docs/product-epics` (or `docs/product-<short-name>` for a revision; `git switch -c`); on a `docs/product-*` branch left by `/speckit-prd`, stay on it; on another branch, ask the user before going on.

2. **Read.** `specs/product.yml` (stop and point to `/speckit-prd` if it does not exist or has no requirement), `specs/prd.md` (vision, users, problems, constraints), and the output of `pnpm -s spec:trace`: the states of the requirements and of the existing epics.

3. **Group.** An epic is a user outcome the product can deliver and demonstrate on its own (`A customer pays and gets refunded without support`), not a technical layer (`database`, `API`, `screens`) nor a team. Each active requirement goes into exactly one epic; a retired one stays where it is, or out of every epic. Aim for epics that a few features, each one a few user stories, can deliver. When a single requirement makes an epic of its own and depends on nothing, say so: it may stay as it is.

4. **Order.** `depends_on` lists the epics whose outcome this one needs before it can be built or used (no payment before an account exists). Only real dependencies: a preference of order is not one. No cycle. Then propose a delivery order: dependencies first, then the epics that bring the most value or remove the most risk, and say why.

5. **Journeys.** For each epic, the paths a user takes across several features to reach its outcome, written as steps a browser test can follow (`sign up`, `order`, `pay by mobile money`, `ask for a refund`). One to three per epic, the ones that prove the outcome. A journey belongs to the epic it completes, even when its first steps come from the epics it depends on. Their tests are written when the epic is done, in `apps/web-e2e`, titled `'<journey id>: …'`.

6. **Show the proposal, then wait.** Show the user a table (epic, goal, requirements, depends on, journeys), the proposed order with its reasons, and for a revision the differences with the current index. Write nothing until the user approves; apply their changes and show again if needed.

7. **Write** the `epics` list of `specs/product.yml`. Keep the `requirements` list and the comments as they are. Revising:
   - ids of epics and journeys are never renumbered nor reused: a new one takes the next free number;
   - a dropped journey gets `retired: <reason>` and keeps its id; an epic is not retired by hand: it is retired once all its requirements are;
   - moving a requirement out of an epic that already has specs is the user's call: name those specs in the proposal.

8. **Check.** Run `pnpm -s spec:trace` and fix every error it reports on the index (requirement in no epic or in two, unknown dependency, cycle, journey id that does not start with its epic id). A journey without test is an error only once its epic is done: if the revision makes a done epic gain a journey, tell the user that its test is now owed.

9. **Commit.** Stage only `specs/product.yml` (never `git add .`), and commit with a Conventional Commits message in English, such as `docs(product): group the requirements into epics`.

10. **Report.** The epics in their delivery order, the first epic with no unfinished dependency, and the next step: `/speckit-specify <epic id>` (for example `/speckit-specify E01`), which takes the requirements of that epic that no spec covers yet.

## Rules

- Never write a state (specified, done, shipped) in the index: states are derived from the specs.
- Never edit `specs/prd.md` from this command, nor a spec (`specs/NNN-*/`). A requirement that is missing, too broad or ambiguous while grouping goes back to `/speckit-prd`: say which one and why.
- An epic says what the user gets, not how it is built: no domain, endpoint, table or flag here.
