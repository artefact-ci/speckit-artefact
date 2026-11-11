# Publier une release

Une seule version pour tout le dépôt : `preset/preset.yml`, `extension/extension.yml` et les trois `packages/*/package.json` portent le numéro du tag `vX.Y.Z`.

## À chaque release

1. `pnpm version:set X.Y.Z`, puis `pnpm version:check X.Y.Z` (code 0 attendu).
2. Compléter `CHANGELOG.md` avec une section `## [X.Y.Z] - AAAA-MM-JJ`. Vérifier avec `pnpm --silent notes X.Y.Z` : la section doit s'afficher.
3. PR vers `dev`, puis fusion de `dev` dans `main`.
4. Tag sur le commit de `main` : `git tag vX.Y.Z && git push origin vX.Y.Z`.
5. Suivre `.github/workflows/release.yml` : `verify`, `ci`, `release` (release GitHub et zips), `npm` (publication avec provenance), `smoke` (installation depuis npm).
6. En cas d'échec, relancer le job concerné. Un relancement exécute le workflow du commit tagué : les fichiers, et la version de Node épinglée, ne changent pas. Ce qui est déjà publié est sauté ; une release n'est jamais supprimée et un zip publié n'est jamais écrasé. La release est créée en brouillon et publiée seulement une fois les deux zips attachés.
   - `verify` ou `ci` en échec : rien n'est publié. Corriger, supprimer le tag en local et sur GitHub (`git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`), puis le repousser sur le nouveau commit.
   - `npm` en échec sur `403 Forbidden … OIDC permission denied for this action` : la déclaration de trusted publisher du paquet manque ou n'autorise pas la publication directe (voir la toute première release, étape 4). La corriger sur npmjs.com, puis relancer le job : les paquets déjà publiés sont sautés.
   - `smoke` attend que les trois paquets soient installables depuis npm (jusqu'à 10 minutes) : une version qui vient d'être publiée met quelques minutes à l'être, même quand `npm view` la montre déjà. Un échec sur `ETARGET` (`No matching version found`) après ce délai se relance tel quel.
   - `release` en échec sur « déjà publié avec un autre contenu » : la cause probable est un envoi interrompu, qui a laissé un zip incomplet. Tant que la release est encore un brouillon et que `npm` n'a pas tourné, supprimer ce seul zip (`gh release delete-asset vX.Y.Z <zip>`) puis relancer est sans danger. Une fois les paquets publiés sur npm, ne plus toucher à la release : corriger dans une nouvelle version.
7. Le premier vrai téléchargement depuis github.com (recherche de la release via api.github.com, redirection vers un autre hôte) n'est testé que par le job `smoke`.

## Toute première release (0.2.0) : étapes manuelles

Dans l'ordre :

1. **Passer le dépôt en public** : Settings, General, Danger Zone, Change visibility. Avant tout le reste, sinon pas de provenance et des zips illisibles.
2. **Fusionner** la phase 5 dans `dev`, puis `dev` dans `main`.
3. **Publier un paquet provisoire de `@artefact-ci/sdd`.** Il n'existe pas encore sur npm, et npm n'accepte un trusted publisher que pour un paquet existant (spec-trace et prototype ont déjà leur `0.0.0-stage`). Dans un dossier jetable hors du dépôt, après `npm login`, avec un `package.json` `{ "name": "@artefact-ci/sdd", "version": "0.0.0-stage" }` :
   ```sh
   npm publish --access public --tag stage
   ```
   npm demande le code à usage unique de la 2FA : `--otp=<code>`, ou la validation dans le navigateur qu'il propose. Le paquet met quelques minutes à apparaître (`npm view @artefact-ci/sdd dist-tags` répond d'abord 404) : attendre avant l'étape suivante. Si npm refuse le numéro (`403 … You cannot publish using the version`), ce numéro a déjà été publié puis retiré pour ce nom : en prendre un autre, plus petit que la release (`0.0.1-stage`). Le premier paquet publié prend aussi le tag `latest`, que la release déplace ensuite sur sa version.
4. **Déclarer le trusted publisher des trois paquets**, au plus 2 jours avant le tag (une déclaration expire au bout de 2 jours sans publication). Sur npmjs.com : Settings, Trusted publishing, GitHub Actions, avec Organization `artefact-ci`, Repository `speckit-artefact`, Workflow filename `release.yml`, sans Environment, et en autorisant la publication directe. Ou en ligne de commande (npm 11.15 ou plus, 2FA activée) :
   ```sh
   for p in sdd spec-trace prototype; do
     npm trust github @artefact-ci/$p --file release.yml --repo artefact-ci/speckit-artefact --allow-publish --yes
     sleep 2
   done
   ```
   Puis vérifier chaque paquet avec `npm trust list @artefact-ci/<paquet>` : la déclaration doit donner `file: release.yml`, `repository: artefact-ci/speckit-artefact` et **`permissions: publish, stage publish, manageDistTags`**. Sans `publish`, le job `npm` échoue sur `OIDC permission denied`. Une déclaration qui existait déjà n'est pas modifiée par `npm trust github` : la corriger sur npmjs.com (Settings, Trusted publishing, autoriser la publication directe), ou la retirer (`npm trust revoke`) puis la recréer.
5. **Pousser le tag `v0.2.0`** sur le commit de `main`, puis suivre `release.yml`. Attendu : cinq jobs verts, release `v0.2.0` avec les deux zips, `npm view @artefact-ci/sdd@0.2.0` répond, provenance visible sur npmjs.com.
6. **Après la publication**, dans Settings, Publishing access de chaque paquet : « Require two-factor authentication and disallow tokens ». Révoquer ensuite le jeton des publications manuelles.

Vérification finale, dans un dossier vide : `git init && npx -y @artefact-ci/sdd@0.2.0 init`. `.specify/artefact.json` doit valoir `{"version":"0.2.0","source":"release"}`, et un deuxième `init` laisse `git status` vide une fois le premier commité.
