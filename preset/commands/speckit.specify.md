<!-- Boilerplate preset (source: tools/spec-kit/preset). Appended to the core command. -->

## Feature Branch (boilerplate)

These rules take precedence over any instruction above that contradicts them. Every feature is developed on its own branch, created by the mandatory `before_specify` hook (`/speckit-git-feature`, git extension).

- Before running the hook, check the working tree with `git status --short` and the current branch. If the tree has uncommitted changes, stop and ask the user what to do with them. Features start from `dev`, the integration branch, never from `main` (production). If the current branch is `main`, switch to `dev` and pull it (`git switch dev && git pull --ff-only`) before running the hook. If it is another branch, ask whether the new branch should start from it or from `dev`; never stack a feature on another one without the user's consent.
- The hook numbers the branch after the existing `specs/` directories and every local and remote branch, so two features in progress never share a number. Use its `BRANCH_NAME` as the spec directory: `SPECIFY_FEATURE_DIRECTORY` is `specs/<BRANCH_NAME>`, and the feature number of the scenario ids (`NNN-US1-AS1`) is its `FEATURE_NUM`.
- If the hook fails, stop and report its error: do not write the spec on the current branch.
- When the description names an epic, settle which of its requirements this feature takes (see below) before running the hook: the short name of the branch follows from that scope.

## Writing the Spec (boilerplate)

- Resolve the template with `.specify/scripts/bash/resolve-template.sh spec-template`, which prints its content: the `specify` CLI is not installed in a session.
- The limit of 3 `[NEEDS CLARIFICATION]` markers counts questions: one marker per question, not one per place it shows up.
- A scenario or story written in this run and not committed yet can be rewritten or dropped freely. Once committed, it is retired (`**Retired**`), never deleted nor renumbered: another branch may already have a test that cites it.

## Product Requirements (boilerplate)

`specs/product.yml` is the product index (the requirements document), owned by the user: `requirements` (`PAY-03`), and optionally `epics` (`E03`) that group them, with `depends_on` (epics to finish first) and `journeys` (end-to-end paths across features, `E03-J1`). When it exists:

- Read it before writing the spec, with `specs/prd.md` when it exists: the PRD gives what the titles of the index do not (the rule of each requirement, the users, the constraints, the non-goals). Fill `**Product Requirements**` with the ids of the requirements this feature implements (`PAY-03, PAY-04`), or `None`. If the description names no requirement and several could match, ask the user which ones, as a clarification question.
- If the description names an epic (`E03`), propose its requirements that no spec covers yet (`pnpm -s spec:trace` shows them as unspecified), and keep the feature within that epic. Ask the user before creating the branch: all of them, or a part, the rest going to a next feature of the same epic (an epic is done only once all its requirements are). Never cite a retired requirement.
- If the epic of this feature depends on an epic that is not done yet (`Implemented` or `Shipped` in the `spec:trace` table), tell the user before writing the spec: they may go on, but the order of the epics is theirs to change.
- When the feature makes a step of a journey possible, say so in the spec's assumptions (`Step "pay" of E03-J1`): the journey test itself is written once its epic is complete, not in this feature.
- Never add, rename or remove a requirement, an epic or a journey in the index, and never record a state there: states are derived from the status of the specs (`pnpm -s spec:trace`). If the feature implements a requirement absent from the index, tell the user and keep `None` until they add it.

When the index does not exist, leave `**Product Requirements**: None`.
