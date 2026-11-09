# speckit-artefact

La méthode de développement par specs d'Artefact CI, installable dans n'importe quel projet en une commande, quelle que soit sa stack.

Elle s'appuie sur [Spec Kit](https://github.com/github/spec-kit) 1.3.2, sans fork :

- un preset (`artefact-sdd`) : templates spec, plan, tasks et règles TDD ;
- une extension (`artefact-product`) : `/speckit-prd`, `/speckit-design`, `/speckit-epics`, `/speckit-prototype` ;
- des agents de relecture et de design ;
- un installeur, `npx @artefact-ci/sdd init`, qui pose le tout et un `stack.yml` propre au projet.

Le plan de création, ses décisions et son calendrier sont dans [`docs/plan.md`](docs/plan.md).

## État

Phase 0 terminée : `preset/` est le preset du boilerplate nx-react-nestjs, importé avec son historique et encore inchangé (id `boilerplate`, chemins Nx). Sa généralisation en `artefact-sdd` est la phase 1. Les autres dossiers (`extension/`, `agents/`, `packages/`, `examples/stack/`) ne contiennent qu'un README qui dit à quelle phase ils se remplissent.

## Tester le preset en local

Il faut [uv](https://docs.astral.sh/uv/). Dans un dossier vide, hors du dépôt :

```sh
uvx --from specify-cli==1.3.2 specify init --here --integration claude --script sh --non-interactive
git init
uvx --from specify-cli==1.3.2 specify preset add --dev <chemin vers speckit-artefact>/preset
```

`specify init` passe avant `git init` : avec `--non-interactive`, il refuse un dossier qui n'est pas vide, `.git` compris. Les skills `.claude/skills/speckit-{specify,plan,tasks,analyze,implement,converge}/SKILL.md` contiennent alors les sections « (boilerplate) » du preset. Après une modification de `preset/`, réinstallez avec `specify preset update boilerplate --dev <chemin>/preset`.

La CI (`.github/workflows/ci.yml`) fait la même chose à chaque push et à chaque PR vers `dev` et `main`.
