# Changelog

## [0.2.0] - 2026-11-10

### Ajouté

- `npx @artefact-ci/sdd@0.2.0 init` installe le preset et l'extension depuis les zips de la release GitHub `v0.2.0`, sans `--source` ni catalogue. `--source <clone>` reste possible (installation en `--dev`).
- `.specify/artefact.json` enregistre la version installée et la source : `{ "version": "0.2.0", "source": "release" }`.
- `init` refuse un projet installé à une autre version et renvoie vers `update`.
- CI de release sur tag `vX.Y.Z` : release GitHub avec `artefact-sdd-X.Y.Z.zip` et `artefact-product-X.Y.Z.zip`, puis publication des trois paquets npm avec provenance, sans jeton, et test de fumée.
- Dans la CI de chaque PR : installation des zips construits sur un projet vierge.

### Modifié

- Une seule version pour tout le dépôt : le preset, l'extension et les trois paquets npm portent le même numéro, celui du tag. Le preset `artefact-sdd` et l'extension `artefact-product` **descendent de 1.0.0 à 0.2.0**. Les projets installés avec `--dev` (source clone) gardent un registre Spec Kit en 1.0.0 : relancer `update` pour l'aligner sur 0.2.0.

## [0.1.0] - 2026-11-09

- Première publication à la main de `@artefact-ci/sdd`, `@artefact-ci/spec-trace` et `@artefact-ci/prototype` sur npm (installeur avec `--source`, matrice scénarios → tests, maquettes HTML).
