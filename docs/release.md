# Publier une release

Une seule version pour tout le dépôt : `preset/preset.yml`, `extension/extension.yml` et les trois `packages/*/package.json` portent le numéro du tag `vX.Y.Z`.

## À chaque release

1. `pnpm version:set X.Y.Z`, puis `pnpm version:check X.Y.Z` (code 0 attendu).
2. Compléter `CHANGELOG.md` avec une section `## [X.Y.Z] - AAAA-MM-JJ`. Vérifier avec `pnpm --silent notes X.Y.Z` : la section doit s'afficher.
3. PR vers `dev`, puis fusion de `dev` dans `main`.
4. Tag sur le commit de `main` : `git tag vX.Y.Z && git push origin vX.Y.Z`.
5. Suivre `.github/workflows/release.yml` : `verify`, `ci`, `release` (release GitHub et zips), `npm` (publication avec provenance), `smoke` (installation depuis npm).
6. En cas d'échec, relancer le job concerné : chaque étape peut être relancée sans dégât (ce qui est déjà publié est sauté). Une release n'est jamais supprimée et un zip publié n'est jamais écrasé. Si un relancement signale « déjà publié avec un autre contenu » sans que la source ait changé, c'est que la version de Node épinglée dans le job `release` a changé (la sortie deflate dépend du zlib de Node) : remettre la version d'origine.

## Toute première release (0.2.0) : étapes manuelles

Dans l'ordre :

1. **Passer le dépôt en public** : Settings, General, Danger Zone, Change visibility. Avant tout le reste, sinon pas de provenance et des zips illisibles.
2. **Fusionner** la phase 5 dans `dev`, puis `dev` dans `main`.
3. **Publier un paquet provisoire de `@artefact-ci/sdd`.** Il n'existe pas encore sur npm, et npm n'accepte un trusted publisher que pour un paquet existant (spec-trace et prototype ont déjà leur `0.0.0-stage`). Dans un dossier vide, avec un `package.json` `{ "name": "@artefact-ci/sdd", "version": "0.0.0-stage" }` :
   ```sh
   npm publish --access public --tag stage
   ```
   avec la 2FA. Le tag `stage` évite que `latest` pointe sur ce paquet provisoire.
4. **Déclarer le trusted publisher des trois paquets**, au plus 2 jours avant le tag (une déclaration expire au bout de 2 jours sans publication). Sur npmjs.com : Settings, Trusted publishing, GitHub Actions, avec Organization `artefact-ci`, Repository `speckit-artefact`, Workflow filename `release.yml`, sans Environment, et en autorisant la publication directe. Ou en ligne de commande (npm 11.15 ou plus, 2FA activée) :
   ```sh
   for p in sdd spec-trace prototype; do
     npm trust github @artefact-ci/$p --file release.yml --repo artefact-ci/speckit-artefact --allow-publish --yes
     sleep 2
   done
   ```
5. **Pousser le tag `v0.2.0`** sur le commit de `main`, puis suivre `release.yml`. Attendu : cinq jobs verts, release `v0.2.0` avec les deux zips, `npm view @artefact-ci/sdd@0.2.0` répond, provenance visible sur npmjs.com.
6. **Après la publication**, dans Settings, Publishing access de chaque paquet : « Require two-factor authentication and disallow tokens ». Révoquer ensuite le jeton des publications manuelles.

Vérification finale, dans un dossier vide : `git init && npx -y @artefact-ci/sdd@0.2.0 init`. `.specify/artefact.json` doit valoir `{"version":"0.2.0","source":"release"}`, et un deuxième `init` laisse `git status` vide une fois le premier commité.
