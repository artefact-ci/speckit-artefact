# speckit-artefact

La méthode de développement par specs d'Artefact CI, installable dans n'importe quel projet en une commande, quelle que soit sa stack.

Elle s'appuie sur [Spec Kit](https://github.com/github/spec-kit) 1.3.2, sans fork :

- un preset (`artefact-sdd`) : templates spec, plan, tasks et règles TDD ;
- une extension (`artefact-product`) : `/speckit-prd`, `/speckit-design`, `/speckit-epics`, `/speckit-prototype` ;
- des agents de relecture et de design ;
- un installeur, `npx @artefact-ci/sdd init`, qui pose le tout et un `stack.yml` propre au projet.

Le plan de création, ses décisions et son calendrier sont dans [`docs/plan.md`](docs/plan.md).

## État

Phases 1, 2 et 3 terminées (publication npm en attente du choix du registre) :

- `preset/` est le preset générique `artefact-sdd`. Ses six commandes et ses templates (spec, plan, tasks, constitution) ne citent plus aucune stack : ils lisent `.specify/stack.yml`, dont le schéma est dans [`docs/stack.md`](docs/stack.md).
- `extension/` est l'extension `artefact-product` : prd, design, epics, prototype. Les anciens noms restent en alias. Ses commandes lisent aussi `stack.yml`, et leurs étapes front dépendent de `ui`. Elles ont besoin des consignes d'agents dans `docs/agents/`, que l'installeur posera en phase 4.
- `examples/stack/` contient des `stack.yml` types, et `examples/nx-preset/` le preset local qui rend au boilerplate ses templates Nx.

- `packages/spec-trace` et `packages/prototype` sont les outils `@artefact-ci/spec-trace` (matrice scénarios → tests) et `@artefact-ci/prototype` (maquettes HTML), sortis du boilerplate. Ils lisent aussi `stack.yml` (`tests.globs`, `ui.theme`). `pnpm install && pnpm test` à la racine les teste.

`agents/` et `packages/sdd` ne contiennent qu'un README qui dit à quelle phase ils se remplissent.

## Tester en local

Il faut [uv](https://docs.astral.sh/uv/). Dans un dossier vide, hors du dépôt :

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
