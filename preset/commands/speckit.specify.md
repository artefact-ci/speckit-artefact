<!-- Boilerplate preset (source: tools/spec-kit/preset). Appended to the core command. -->

## Feature Branch (boilerplate)

These rules take precedence over any instruction above that contradicts them. Every feature is developed on its own branch, created by the mandatory `before_specify` hook (`/speckit-git-feature`, git extension).

- Before running the hook, check the working tree with `git status --short` and the current branch. If the tree has uncommitted changes, stop and ask the user what to do with them. If the current branch is not `main`, ask whether the new branch should start from it or from `main`; never stack a feature on another one without the user's consent.
- The hook numbers the branch after the existing `specs/` directories and every local and remote branch, so two features in progress never share a number. Use its `BRANCH_NAME` as the spec directory: `SPECIFY_FEATURE_DIRECTORY` is `specs/<BRANCH_NAME>`, and the feature number of the scenario ids (`NNN-US1-AS1`) is its `FEATURE_NUM`.
- If the hook fails, stop and report its error: do not write the spec on the current branch.

## Product Requirements (boilerplate)

`specs/product.yml` is the product index (the requirements document), owned by the user: `requirements` (`PAY-03`), and optionally `epics` (`E03`) that group them, with `depends_on` (epics to finish first) and `journeys` (end-to-end paths across features, `E03-J1`). When it exists:

- Read it before writing the spec, and fill `**Product Requirements**` with the ids of the requirements this feature implements (`PAY-03, PAY-04`), or `None`. If the description names no requirement and several could match, ask the user which ones, as a clarification question.
- If the description names an epic (`E03`), propose its requirements that no spec covers yet (`pnpm -s spec:trace` shows them as unspecified), and keep the feature within that epic. Never cite a retired requirement.
- If the epic of this feature depends on an epic that is not done yet (`Implemented` or `Shipped` in the `spec:trace` table), tell the user before writing the spec: they may go on, but the order of the epics is theirs to change.
- When the feature makes a step of a journey possible, say so in the spec's assumptions (`Step "pay" of E03-J1`): the journey test itself is written once its epic is complete, not in this feature.
- Never add, rename or remove a requirement, an epic or a journey in the index, and never record a state there: states are derived from the status of the specs (`pnpm -s spec:trace`). If the feature implements a requirement absent from the index, tell the user and keep `None` until they add it.

When the index does not exist, leave `**Product Requirements**: None`.
