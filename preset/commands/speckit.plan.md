<!-- Boilerplate preset (source: tools/spec-kit/preset). Appended to the core command. -->

## Decisions for the User (boilerplate)

These rules take precedence over any instruction above that contradicts them. The plan is the agent's proposal; some choices are the user's.

- **Stop and ask** before designing on top of a choice that:
  - deviates from a principle of the constitution or from a convention of `AGENTS.md` (an unchecked box of the Constitution Check, a sort order other than `(created_at, id)` descending);
  - changes a path listed in `.github/CODEOWNERS` beyond what the feature obviously needs (identity, tenant isolation, guarantees of `api-core`, CI);
  - adds an infrastructure dependency (a service in the compose files, a cloud SDK, a Testcontainers image);
  - picks between designs that will be hard to change later (the tenant model, a new role, where files are stored).

  List each one in **Decisions for the User** of the plan: the question, the options with what each one costs, and your recommendation. Show them to the user and end your turn there: the rest of the command, and its `after_plan` commit hook, run only once every decision has an answer. Then record each answer and its reason in that section, and go on.

- Everything else you settle yourself, in `research.md`, and say so in the report.

## Research (boilerplate)

- Resolve the unknowns from the repo first: `AGENTS.md`, `docs/` (architecture, ADR, reference), the example domains. Launching research agents is optional; do it only when it saves reading many files.
- **Example code.** Check whether the example domains are still there (`libs/api/catalog`, `libs/api/orders`, `libs/api/notifications`, `libs/web/storefront`, the `storefront` flag). When a name of the feature collides with them (a domain, a flag, a route, an id prefix such as `PRD-`), make it a decision for the user: run `pnpm strip:examples` first (phase « Initialiser » of `docs/guides/methode.md`), or pick other names.

## Test Strategy (boilerplate)

- A scenario that needs a later story (a story 2 scenario about products that arrive in story 3) is cited by the test of the story that completes it. The earlier story may test the part it delivers, without the scenario id; say so in the Test Strategy.
