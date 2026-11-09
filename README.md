# speckit-artefact

La méthode de développement par specs d'Artefact CI, installable dans n'importe quel projet en une commande, quelle que soit sa stack.

Elle s'appuie sur [Spec Kit](https://github.com/github/spec-kit) 1.3.2, sans fork :

- un preset (`artefact-sdd`) : templates spec, plan, tasks et règles TDD ;
- une extension (`artefact-product`) : `/speckit-prd`, `/speckit-design`, `/speckit-epics`, `/speckit-prototype` ;
- des agents de relecture et de design ;
- un installeur, `npx @artefact-ci/sdd init`, qui pose le tout et un `stack.yml` propre au projet.

Le dépôt est en phase 0. Le plan de création, ses décisions et son calendrier sont dans [`docs/plan.md`](docs/plan.md).
