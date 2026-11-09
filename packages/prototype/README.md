# @artefact-ci/prototype

Maquettes HTML cliquables d'une fonctionnalité, sorties de `pnpm prototype` du boilerplate (`b30bb7b`). C'est la commande `ui.prototype` de `.specify/stack.yml`, lancée par `/speckit-prototype`.

```sh
npx @artefact-ci/prototype specs/004-checkout            # compile styles.css depuis le thème, vérifie les liens
npx @artefact-ci/prototype specs/004-checkout --capture  # puis remplace captures/ (desktop et mobile)
npx @artefact-ci/prototype specs/004-checkout --theme src/app/globals.css  # autre thème que ui.theme
```

À lancer à la racine du dépôt (Node 24.11 ou plus récent). Les pages vivent à plat dans `specs/NNN-<nom>/prototypes/`, `index.html` en entrée ; la commande affiche l'URL `file://` de `index.html`, à ouvrir sans serveur.

- **Liens** : un lien vers une page absente fait échouer ; une page vers laquelle rien ne mène est signalée.
- **Styles** : `styles.css` est compilé par Tailwind 4 depuis le thème du projet (`ui.theme`) et les classes des pages. Les fichiers des paquets importés par le thème (polices `@fontsource`) sont copiés à côté.
- **Captures** : une par page et par format (1440×900, 390×844) dans `captures/`, pleine page sauf pour une page marquée `data-capture="viewport"` (dialogue, toast). Un échec garde les anciennes.

Le CLI Tailwind (`@tailwindcss/cli`) et Playwright sont pris dans le projet s'il les a, sinon dans ce paquet : les styles compilent avec la version de l'app, et les captures trouvent le Chromium déjà installé pour les parcours.

- Le repli ne fournit que le CLI : `tailwindcss` et les paquets que le thème importe se résolvent depuis le thème, donc doivent être installés dans le projet. Il sert au projet qui a `tailwindcss` sans `@tailwindcss/cli` (Next avec `@tailwindcss/postcss`, Vite).
- Quand Chromium manque, la commande affiche celle qui installe le Chromium de la version de Playwright chargée (`npx playwright@<version> install chromium`).
- Il faut Node 24.11 ou plus récent, aussi sur un projet Bun.

## Développer

```sh
pnpm install
pnpm --filter @artefact-ci/prototype test
pnpm --filter @artefact-ci/prototype typecheck
pnpm --filter @artefact-ci/prototype build
```

`src/core.mts` est la logique pure, `src/stack.mts` la lecture de `stack.yml`, `src/cli.mts` les fichiers, Tailwind et Playwright. `src/cli.test.mts` lance la CLI sur un projet jetable qui n'a que `tailwindcss` : compilation réelle, et captures quand le Chromium de Playwright est installé (`pnpm --filter @artefact-ci/prototype exec playwright install chromium` ; sans lui, le test est sauté hors CI).
