# speckit-artefact

La méthode de développement par specs d'Artefact CI, installable dans n'importe quel projet en une commande, quelle que soit sa stack.

Elle s'appuie sur [Spec Kit](https://github.com/github/spec-kit) 1.3.2, sans fork :

- un preset (`artefact-sdd`) : templates spec, plan, tasks et règles TDD ;
- une extension (`artefact-product`) : `/speckit-prd`, `/speckit-design`, `/speckit-epics`, `/speckit-prototype` ;
- des consignes d'agents de relecture et de design, avec de fins fichiers d'agent générés pour l'outil du projet ;
- un installeur, `npx @artefact-ci/sdd init`, qui pose le tout et un `stack.yml` propre au projet.

Le plan de création, ses décisions et son calendrier sont dans [`docs/plan.md`](docs/plan.md).

## État

Phases 1 à 3 terminées, phase 4 faite sauf la vérification dans l'app Antigravity, phase 5 (release GitHub et publication sur npm) faite dans le code : la première release, la 0.2.0, attend son tag. L'état de npm avant cette release est décrit dans [`docs/release.md`](docs/release.md).

- `preset/` est le preset générique `artefact-sdd`. Ses six commandes et ses templates (spec, plan, tasks, constitution) ne citent plus aucune stack : ils lisent `.specify/stack.yml`, dont le schéma est dans [`docs/stack.md`](docs/stack.md).
- `extension/` est l'extension `artefact-product` : prd, design, epics, prototype. Les anciens noms restent en alias. Ses commandes lisent aussi `stack.yml`, et leurs étapes front dépendent de `ui`. Ses consignes d'agents (designer, relecteurs, PO) sont dans `extension/agents/` : Spec Kit les copie dans `.specify/extensions/artefact-product/agents/`, et les commandes s'arrêtent si elles manquent.
- `examples/stack/` contient des `stack.yml` types, et `examples/nx-preset/` le preset local qui rend au boilerplate ses templates Nx.

- `packages/spec-trace` et `packages/prototype` sont les outils `@artefact-ci/spec-trace` (matrice scénarios → tests) et `@artefact-ci/prototype` (maquettes HTML), sortis du boilerplate. Ils lisent aussi `stack.yml` (`tests.globs`, `ui.theme`). `pnpm install && pnpm test` à la racine les teste.

- `packages/sdd` est l'installeur `@artefact-ci/sdd` (`npx @artefact-ci/sdd@X.Y.Z init|update`, `--source <clone>` pour développer la méthode). Il installe Spec Kit, l'extension git, l'extension et le preset, réapplique les hooks git, génère les fichiers d'agent de l'outil du projet (Claude Code, Antigravity), déduit `stack.yml` et écrit la constitution de base. Voir [`packages/sdd/README.md`](packages/sdd/README.md). Sans `--source`, il installe les zips de la release GitHub de sa propre version ; avec `--source`, il installe un clone en `--dev`.

## Installer sur un projet

Il faut [uv](https://docs.astral.sh/uv/) et Node 24. Dans le dépôt du projet :

```sh
npx @artefact-ci/sdd@0.2.0 init
```

L'installeur télécharge les zips du preset et de l'extension depuis la release `v0.2.0` de ce dépôt et écrit la version installée dans `.specify/artefact.json`. La procédure de release est dans [`docs/release.md`](docs/release.md).

Pour installer depuis un clone de ce dépôt (développement) :

```sh
pnpm --filter @artefact-ci/sdd build   # dans ce clone, une fois
node <chemin vers speckit-artefact>/packages/sdd/dist/cli.mjs init --source <chemin vers speckit-artefact>
```

Le rapport dit ce qui est installé, ce qui a été deviné dans `.specify/stack.yml` et ce qu'il reste à compléter.

## Tester en local à la main

Dans un dossier vide, hors du dépôt :

```sh
uvx --from specify-cli==1.3.2 specify init --here --integration claude --script sh --non-interactive
git init
uvx --from specify-cli==1.3.2 specify preset add --dev <chemin vers speckit-artefact>/preset
uvx --from specify-cli==1.3.2 specify extension add --dev <chemin vers speckit-artefact>/extension
cp <chemin vers speckit-artefact>/examples/stack/nx.yml .specify/stack.yml   # ou bun-hono.yml, nextjs.yml
```

`specify init` passe avant `git init` : avec `--non-interactive`, il refuse un dossier qui n'est pas vide, `.git` compris.

Les skills `.claude/skills/speckit-{specify,plan,tasks,analyze,implement,converge}/SKILL.md` contiennent alors les sections « (artefact-sdd) ». Les skills `speckit-artefact-product-*` sont installées avec leurs alias `speckit-{prd,design,epics,prototype}`.

Pour réinstaller après une modification :

- du preset : `specify preset update artefact-sdd --dev <chemin>/preset` ;
- de l'extension : `specify extension add --dev <chemin>/extension --force`.

La CI (`.github/workflows/ci.yml`) fait la même chose à chaque push et à chaque PR vers `dev` et `main`. Elle vérifie aussi que `preset/` et `extension/` ne citent aucune stack et que le preset local Nx prend bien le pas sur les templates génériques.
