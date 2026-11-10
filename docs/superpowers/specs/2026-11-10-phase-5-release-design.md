# Phase 5 — Release et publication

10 novembre 2026 · conception validée en conversation avec Al Moustapha Doumbia · référence : [`docs/plan.md`](../../plan.md), phase 5

## Intention

Jusqu'ici, la méthode s'installe depuis un clone (`--source <clone>`, en `--dev`). Un projet ne peut donc pas figer une version, et le junior d'AVIA devrait cloner ce dépôt pour installer la méthode. La phase 5 rend `npx @artefact-ci/sdd@X.Y.Z init` autonome : l'installeur d'une version installe le preset et l'extension de **la même version**, téléchargés depuis la release GitHub du tag, sans catalogue Spec Kit et sans jeton.

Un tag `vX.Y.Z` publie tout ensemble : les zips du preset et de l'extension sur la release GitHub, et les trois paquets npm. Un projet ne fige qu'un seul numéro.

## Décisions prises en conversation

- **Le dépôt `artefact-ci/speckit-artefact` devient public.** Les zips d'une release de dépôt privé ne se téléchargent pas sans authentification, ce qui casserait `specify preset add --from <url>` chez tout le monde. Le changement de visibilité est fait par Al Moustapha, pas par la CI ni par l'agent qui implémente.
- **Premier tag : `v0.2.0`.** La `v1.0.0` sort seulement après la validation de la phase 6 (non-régression sur le boilerplate). Le critère de fin de la phase 5 devient donc `npx @artefact-ci/sdd@0.2.0 init`.
- **Publication npm par trusted publishing (OIDC), en publication directe** (`--allow-publish`, pas `npm stage publish`). Aucun jeton npm dans le dépôt.
- **Une seule version pour tout le dépôt** (déjà dans le plan) : `preset/preset.yml`, `extension/extension.yml` et les trois `package.json` portent le même numéro que le tag.

## Constats vérifiés

- Spec Kit 1.3.2 : `preset add --from`, `preset update <id> --from` et `extension add --from` acceptent l'URL d'un `.zip` (`--help`, 10 novembre 2026). L'installation depuis un zip servi en HTTP est déjà vérifiée en phase 4 pour l'extension.
- Trusted publishing npm (https://docs.npmjs.com/trusted-publishers, page modifiée le 6 octobre 2026) :
  - le job a besoin de `permissions: id-token: write` ;
  - il faut npm 11.5.1 ou plus récent et Node 22.14 ou plus récent ;
  - seuls les runners hébergés par GitHub sont acceptés ;
  - le `repository.url` de chaque `package.json` doit correspondre exactement au dépôt, ce qui est déjà le cas ;
  - la provenance n'est générée que si le dépôt est public ;
  - une déclaration expire si aucune publication ne réussit dans les 2 jours ;
  - npm ne valide pas la déclaration à l'enregistrement : une erreur n'apparaît qu'à la publication.
- La doc npm ne parle que de `npm publish` : on ne s'appuie pas sur `pnpm publish` pour l'OIDC.

## Objectifs

1. **CI de release** : un workflow `.github/workflows/release.yml`, déclenché par un tag `vX.Y.Z`, qui :
   1. vérifie que le tag correspond aux cinq versions du dépôt, que le commit taggé est contenu dans `origin/main`, et que `CHANGELOG.md` a une section pour cette version ;
   2. lance les mêmes contrôles que `ci.yml`, en réutilisant le workflow plutôt qu'en le recopiant si c'est possible ;
   3. construit `artefact-sdd-X.Y.Z.zip` (le preset) et `artefact-product-X.Y.Z.zip` (l'extension) ;
   4. crée la release GitHub du tag, avec les deux zips en pièces jointes et la section du changelog comme texte ;
   5. publie les trois paquets npm, **après** la release, pour qu'un installeur publié trouve toujours ses zips ;
   6. termine par un test de fumée : dans un dossier vide, `npx @artefact-ci/sdd@X.Y.Z init`, puis on vérifie que le preset et l'extension sont installés en version X.Y.Z.
2. **L'installeur installe la version taguée.** Sans `--source`, `init` et `update` installent depuis `https://github.com/artefact-ci/speckit-artefact/releases/download/vX.Y.Z/<zip>`, où X.Y.Z est la version du paquet `@artefact-ci/sdd` lancé. `--source <clone>` reste disponible pour le développement, toujours en `--dev`.
3. **`.specify/artefact.json`** enregistre la version installée. `update` le lit et affiche le passage d'une version à l'autre.
4. **CI des PR** : en plus des `--dev`, qui existent déjà dans le job `preset` de `ci.yml`, on construit les zips avec le script de la release et on les installe en `--from` sur un projet vierge, servis en local. Un zip mal formé est ainsi détecté avant le tag.
5. **Première release `v0.2.0`**, avec la documentation à jour : README, `docs/plan.md` et `CHANGELOG.md`.

**Fini quand** : `npx @artefact-ci/sdd@0.2.0 init` installe la version taguée sur un projet vierge, sans catalogue (c'est l'étape 1.6 de la CI de release, rejouée une fois à la main).

## Non-objectifs

- Un catalogue ou un bundle Spec Kit (évolution prévue dans le plan, plus tard).
- Les préversions (`v1.0.0-rc.1`), les dist-tags npm autres que `latest`, les releases de maintenance sur une ancienne ligne.
- La `v1.0.0` elle-même : elle vient après la phase 6.
- Le choix interactif d'une version dans l'installeur (`--version`) : pour figer une version, on lance `npx @artefact-ci/sdd@X.Y.Z`.
- Le point Antigravity resté ouvert en phase 4 : il ne fait pas partie de cette phase.

## Anti-objectifs (ce qui serait un échec même si ça « marche »)

- Un installeur publié sur npm dont les zips n'existent pas encore, ou plus : la release est créée avant la publication npm, et on ne supprime jamais une release.
- Un tag qui publie des versions incohérentes, par exemple un preset 1.0.0 dans une release 0.2.0.
- Un jeton npm ou GitHub personnel stocké dans le dépôt ou dans ses secrets pour publier.
- Un deuxième `init` qui modifie le dépôt : `artefact.json` ne contient ni date ni chemin propre à une machine.
- `update` qui touche `stack.yml` ou la constitution (règle de la phase 4, inchangée).

## Comportement attendu

### Versions

Les cinq versions passent de leurs valeurs actuelles (1.0.0 pour le preset et l'extension, 0.1.x pour les paquets) à `0.2.0`. Un script du dépôt les vérifie toutes contre un numéro donné, et la CI de release l'appelle avec le numéro du tag. *Mon choix :* le même script sait aussi les modifier toutes d'un coup (`set <version>`), pour préparer une release sans en oublier une. Comme `stack.yml` fige déjà `@artefact-ci/spec-trace@<version de sdd>` et `@artefact-ci/prototype@<version de sdd>`, une version unique garantit que les versions épinglées existent sur npm.

### Zips

Chaque zip contient le contenu du dossier (`preset/` ou `extension/`), avec le manifeste (`preset.yml` ou `extension.yml`) à la racine de l'archive. Le README du dossier peut en faire partie. Le script de construction est le même pour la CI des PR et pour la release. La forme exacte attendue par Spec Kit (manifeste à la racine ou dans un sous-dossier unique) est à confirmer par le builder : c'est le test `--from` de la CI des PR qui fait foi.

*Mon choix :* les zips sont **reproductibles octet pour octet**. Les fichiers sont dans un ordre trié, avec une date fixe (celle du commit, ou une date constante) et des permissions normalisées. Construire deux fois le même commit donne donc deux zips identiques. La CI des PR le vérifie en construisant deux fois et en comparant les sommes de contrôle.

### Installeur

- **Source** : sans `--source`, l'URL de base est `https://github.com/artefact-ci/speckit-artefact/releases/download/v<version>/`. Une variable d'environnement interne, `SDD_RELEASE_BASE_URL`, la remplace pour les tests, qui servent les zips en local. *Mon choix :* elle est citée dans le code et les tests, mais pas dans le README utilisateur.
- **Commandes Spec Kit en mode release** :
  - `extension add --from <url artefact-product>`, et `--force` en update ;
  - `preset add --from <url artefact-sdd>` ;
  - `preset update artefact-sdd --from <url>`.
  En mode `--source`, rien ne change par rapport à la phase 4.
- **Le message actuel** « la source release arrive en phase 5 » disparaît : l'absence de `--source` est désormais le cas normal.
- **Erreur réseau ou zip absent** (par exemple une version sans release) : Spec Kit échoue, et l'installeur s'arrête en citant l'URL tentée. Il n'y a pas de repli silencieux sur une autre version.
- **`.specify/artefact.json`** :
  ```json
  { "version": "0.2.0", "source": "release" }
  ```
  `source` vaut `"release"`, ou `"dev"` avec `--source`. On n'écrit jamais le chemin du clone, qui dépend de la machine. Le fichier est écrit seulement s'il change, avec la fonction `writeIfChanged` existante.

  La version enregistrée est celle de ce qui a été installé. *Mon choix :* en mode release, c'est la version du paquet `@artefact-ci/sdd` ; avec `--source`, c'est la `version` de `preset/preset.yml` du clone. Le clone peut être en avance ou en retard sur l'installeur lancé, et les cinq versions y sont identiques, ce que vérifie le script de versions.

- **`init` ne mélange jamais deux versions.** *Mon choix*, pour respecter l'anti-objectif « versions incohérentes » :
  - **Si `artefact.json` existe et donne une autre version que celle à installer**, `init` n'installe rien, ne modifie aucun composant, et s'arrête en erreur. Le message donne les deux versions et propose `update`. Les autres étapes de `init` ne sont pas lancées non plus, pour qu'un échec ne laisse pas une installation à moitié faite.
  - **Si `artefact.json` existe avec la même version**, rien ne change par rapport à la phase 4 : les composants absents sont installés, ceux qui sont présents sont sautés, et un deuxième `init` ne produit aucune différence.
  - **Si `artefact.json` est absent et qu'aucun des deux composants `artefact-sdd` et `artefact-product` n'est installé** (premier `init`), `init` installe tout et écrit le fichier.
  - **Si `artefact.json` est absent alors qu'un de ces composants au moins est déjà installé** (installation de la phase 4, ou installation partielle), `init` installe ceux qui manquent mais n'écrit pas le fichier, puisqu'il ne connaît pas la version des composants déjà là. Le rapport dit « version installée inconnue : lance `update` pour aligner tous les composants ».
  - L'extension `git` vient du catalogue de Spec Kit et n'entre pas dans cette règle.
- **`update` réinstalle toujours les deux composants** dans la version de l'installeur, puis écrit `artefact.json`.
- **Rapport** :
  - `init` affiche la version installée et sa source ;
  - `update` affiche `0.2.0 → 0.3.0` d'après `artefact.json`, ou « version précédente inconnue » si le fichier est absent ;
  - *Mon choix :* si la version déjà installée est plus récente que celle de l'installeur (un `npx` qui sert une ancienne version en cache, par exemple), `update` avertit, sans refuser, et continue.

### CI de release

- Déclenchement : `push` d'un tag `v*.*.*`. Runners `ubuntu-latest`, hébergés par GitHub (exigence du trusted publishing).
- Permissions : `contents: write` pour créer la release, `id-token: write` pour le job de publication npm. Ces permissions sont accordées au niveau du job, pas du workflow.
- Publication npm : `pnpm pack` produit les archives, puis `npm publish <tgz>`, avec npm 11.5.1 ou plus récent. Le registre est `https://registry.npmjs.org`, déjà dans `publishConfig`.
- **Relance après un échec partiel** : chaque étape doit pouvoir être relancée sans dégât. Une release déjà créée reçoit les zips qui lui manquent. Un zip déjà présent et identique au zip reconstruit est laissé tel quel. *Mon choix :* un zip déjà présent mais **différent** fait échouer la CI, sans rien écraser, car un installeur déjà publié doit toujours recevoir le même contenu pour le même tag. Si on se retrouve dans ce cas, on sort une nouvelle version. Un paquet dont la version est déjà sur npm est sauté avec un message, sans erreur.
- **Test de fumée** : le registre peut mettre un moment à servir la nouvelle version, donc on attend avec quelques essais espacés. Puis, dans un dossier vide, on lance `init`. On vérifie ensuite que `.specify/artefact.json` contient la bonne version, et que les versions du preset et de l'extension dans les registres de Spec Kit sont X.Y.Z.

### CI des PR

Le job `preset` (ou un nouveau job) construit les zips, les sert sur `localhost` (par exemple avec `python3 -m http.server`) et les installe en `--from` sur un projet vierge. Les mêmes contrôles de skills que pour les `--dev` s'appliquent. Le test de bout en bout de l'installeur (`SDD_E2E=1`) gagne un cas en mode release : `init` sans `--source`, avec `SDD_RELEASE_BASE_URL` qui pointe sur les zips servis en local, puis un deuxième `init` qui ne laisse aucune différence. Il gagne aussi deux autres cas :
- un `init` sur un projet dont `artefact.json` donne une autre version s'arrête sans rien modifier ;
- un `update` écrit la nouvelle version dans `artefact.json`.

## Ce que fait Al Moustapha (hors code), dans l'ordre

1. Passer `artefact-ci/speckit-artefact` en public : **Settings → General → Danger Zone → Change visibility**. Cette étape vient avant tout le reste, sinon pas de provenance et des zips illisibles.
2. Fusionner la phase 5 dans `dev`, puis `dev` dans `main`.
3. **Juste avant le tag** (une déclaration expire au bout de 2 jours sans publication), déclarer le trusted publisher des trois paquets. C'est possible sur npmjs.com : **Settings → Trusted publishing → GitHub Actions**, avec Organization `artefact-ci`, Repository `speckit-artefact`, Workflow filename `release.yml`, sans Environment, et en autorisant la publication directe. C'est aussi possible en ligne de commande, avec npm 11.15 ou plus récent et la 2FA activée :
   ```sh
   for p in sdd spec-trace prototype; do
     npm trust github @artefact-ci/$p --file release.yml --repo artefact-ci/speckit-artefact --allow-publish --yes
     sleep 2
   done
   ```
4. Pousser le tag `v0.2.0` sur le commit de `main`, puis suivre la CI de release.
5. Une fois la publication réussie, dans **Settings → Publishing access** de chaque paquet, choisir « Require two-factor authentication and disallow tokens ». Révoquer ensuite le jeton qui a servi aux publications manuelles de la 0.1.x.

La procédure est reprise dans un guide du dépôt (par exemple `docs/release.md`) pour les releases suivantes : modifier les versions, compléter le changelog, fusionner dans `main`, puis pousser le tag.

## Ce qui reste au choix du builder

- La forme des scripts (Node `.mts` comme le reste du dépôt, ou shell) et leur emplacement.
- La façon de réutiliser `ci.yml` dans `release.yml` (`workflow_call` ou duplication minimale).
- L'outil de création de la release (`gh release create`, ou une action officielle).
- Le format exact des lignes du rapport.
- Le nombre et l'espacement des essais du test de fumée.
