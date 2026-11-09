# @artefact-ci/spec-trace

Matrice scénarios → tests des specs Spec Kit, sortie de `tools/dev/spec-trace.mts` du boilerplate (`b30bb7b`) : même logique, même sortie. C'est la commande `commands.trace` de `.specify/stack.yml`.

```sh
npx @artefact-ci/spec-trace                       # toutes les features de specs/ (CI)
npx @artefact-ci/spec-trace specs/003-order-note  # une seule, en mode strict
npx @artefact-ci/spec-trace --base origin/dev     # avertit en plus des tests modifiés sans leur spec
npx @artefact-ci/spec-trace --tests 'src/**/*.test.ts'  # autres fichiers de tests (répétable)
```

À lancer à la racine du dépôt (Node 24.11 ou plus récent, et git).

- Chaque scénario d'acceptation actif `NNN-US<story>-AS<n>` doit être cité par au moins un test ; une spec en `Draft` y échappe, sauf si on la vise. Aucun test ne doit citer un scénario absent ou retiré.
- Si `specs/product.yml` existe, chaque spec nomme ses exigences (`**Product Requirements**:`), et la commande affiche l'état des exigences, des epics et la couverture des parcours (`E03-J1`).
- Code de sortie 1 quand quelque chose manque.

## Fichiers de tests

Ceux de `tests.globs` dans `.specify/stack.yml` ; `--tests` les remplace. Sans l'un ni l'autre : `**/*.spec.ts` et `**/*.spec.tsx`, ceux du boilerplate. Un motif suit la syntaxe de `path.matchesGlob` de Node, et `**/` couvre aussi la racine. Seuls les fichiers suivis par git ou nouveaux (hors `.gitignore`) sont lus.

Le format des ids (`NNN-US<story>-AS<n>`, `E<n>-J<n>`) est celui de la méthode : les commandes du preset et la constitution le citent, il ne se configure pas ici.

## Développer

```sh
pnpm install
pnpm --filter @artefact-ci/spec-trace test        # node --test sur src/*.test.mts
pnpm --filter @artefact-ci/spec-trace typecheck
pnpm --filter @artefact-ci/spec-trace build       # dist/*.mjs, ce que publie le paquet
```

`src/core.mts` est la logique pure, `src/stack.mts` la lecture de `stack.yml`, `src/cli.mts` les fichiers, git et l'affichage.
