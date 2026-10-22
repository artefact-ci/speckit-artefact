<!-- Boilerplate preset (source: tools/spec-kit/preset). Appended to the core command. -->

## Feature Branch (boilerplate)

These rules take precedence over any instruction above that contradicts them. Every feature is developed on its own branch, created by the mandatory `before_specify` hook (`/speckit-git-feature`, git extension).

- Before running the hook, check the working tree with `git status --short` and the current branch. If the tree has uncommitted changes, stop and ask the user what to do with them. If the current branch is not `main`, ask whether the new branch should start from it or from `main`; never stack a feature on another one without the user's consent.
- The hook numbers the branch after the existing `specs/` directories and every local and remote branch, so two features in progress never share a number. Use its `BRANCH_NAME` as the spec directory: `SPECIFY_FEATURE_DIRECTORY` is `specs/<BRANCH_NAME>`, and the feature number of the scenario ids (`NNN-US1-AS1`) is its `FEATURE_NUM`.
- If the hook fails, stop and report its error: do not write the spec on the current branch.
