# Phase 5 — Release et publication : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un tag `vX.Y.Z` publie les zips du preset et de l'extension sur la release GitHub et les trois paquets npm. `npx @artefact-ci/sdd@X.Y.Z init` installe alors cette version-là, sans `--source` ni catalogue, et l'enregistre dans `.specify/artefact.json`.

**Architecture:**
- Trois scripts Node à la racine (`scripts/*.mts`, lancés par `node` grâce au retrait des types) :
  - versions : vérifier et modifier les cinq versions, et extraire une section du changelog ;
  - zips reproductibles, construits à partir des fichiers suivis par git ;
  - et rien d'autre.
- Dans l'installeur, `Options.source` devient un type `Source`, release ou dev, qui produit les arguments de Spec Kit. Un module `artefact.mts` lit et écrit `.specify/artefact.json`. `init` refuse de mélanger deux versions.
- `release.yml` réutilise `ci.yml` (`workflow_call`), puis enchaîne la release GitHub, la publication npm et un test de fumée.

**Tech Stack:** Node ≥ 24.11 (`.mts`, ESM, `erasableSyntaxOnly`), `node --test`, `node:zlib` (`deflateRawSync`, `crc32`), pnpm 10, npm ≥ 11.5.1 pour publier, Spec Kit 1.3.2 via `uvx`, GitHub Actions, `gh`.

**Spec:** [`docs/superpowers/specs/2026-11-10-phase-5-release-design.md`](../specs/2026-11-10-phase-5-release-design.md), et [`docs/plan.md`](../../plan.md) phase 5.

## Global Constraints

- Branche de travail `feat/phase-5`, créée depuis `origin/dev`. La branche courante, `feat/phase-4`, n'y sert pas de base. La PR part vers `dev`.

- **Une seule version pour tout le dépôt.** `preset/preset.yml` (`preset.version`), `extension/extension.yml` (`extension.version`) et les trois `packages/*/package.json` portent le même numéro, celui du tag `vX.Y.Z`. La première release est `0.2.0`.
- **Noms des zips** : `artefact-sdd-X.Y.Z.zip` pour le preset et `artefact-product-X.Y.Z.zip` pour l'extension. Le manifeste est à la racine de l'archive (vérifié par un essai le 10 novembre 2026 : `preset add --from` et `extension add --from` acceptent cette forme).
- **URL de la release** : `https://github.com/artefact-ci/speckit-artefact/releases/download/vX.Y.Z/<zip>`. La variable d'environnement interne `SDD_RELEASE_BASE_URL` remplace la partie qui précède `<zip>`. Elle est réservée aux tests et absente du README utilisateur.
- **`extension add --from` demande une confirmation** (« Continue with installation? [y/N] », source non fiable) : l'installeur envoie `y\n` sur stdin. `preset add --from` et `preset update --from` ne demandent rien (essai du 10 novembre 2026).
- **Format de `.specify/artefact.json`** : exactement `{ "version": "X.Y.Z", "source": "release" | "dev" }`, en JSON indenté de 2 espaces avec un saut de ligne final. On n'y met ni date ni chemin.
- **Mode `--source`** : installation en `--dev`, comme en phase 4. La version enregistrée est `preset.version` du clone.
- **`update` ne touche jamais `stack.yml` ni la constitution** (règle de la phase 4).
- **Publication npm** : `npm publish <tgz>` sur la sortie de `pnpm pack`, jamais `pnpm publish`. Aucun jeton npm, OIDC seulement, avec `id-token: write` au niveau du job.
- **Ordre de la release** : release GitHub et zips d'abord, npm ensuite. Une release n'est jamais supprimée, et un zip publié n'est jamais écrasé.
- **Commits** : en anglais, au format conventionnel du dépôt (`feat(sdd): …`, `ci: …`, `chore(release): …`), avec les lignes `Co-Authored-By` et `Claude-Session` de la session.
- **Texte destiné à l'utilisateur** (rapport, erreurs) : en français, comme le reste de l'installeur.

## Review Focus

1. **Redirection GitHub** : une URL `releases/download` répond par un 302 vers `objects.githubusercontent.com`. Spec Kit doit suivre la redirection. → Dans l'e2e (tâche 6), le serveur local renvoie un 302 pour chaque zip.
2. **Version sans release, ou réseau coupé** : Spec Kit échoue. L'installeur s'arrête alors avec un message qui cite l'URL tentée, et non une simple trace de Spec Kit. → Test dans la tâche 3.
3. **`.specify/artefact.json` illisible**, en JSON invalide ou avec des champs manquants : `SetupError` qui nomme le fichier, sans écrasement silencieux. → Test dans la tâche 4.
4. **Un fichier oublié au moment de modifier les versions**, par exemple `prototype/package.json` resté en 0.1.1 : la vérification échoue en nommant le fichier et la version trouvée. → Test dans la tâche 1.
5. **Fichiers non suivis dans `preset/` ou `extension/`** (`.DS_Store`, brouillons) : ils ne doivent jamais entrer dans un zip, sinon les zips diffèrent d'une machine à l'autre. → Test dans la tâche 2 (un fichier non suivi est absent de l'archive).

---

### Task 1: Script de versions et changelog

**Files:**
- Create: `scripts/version.mts`, `scripts/version.test.mts`
- Modify: `package.json` (racine). Ajouter les scripts `"version:check": "node scripts/version.mts check"`, `"version:set": "node scripts/version.mts set"`, `"notes": "node scripts/version.mts notes"` et `"test:scripts": "node --test 'scripts/*.test.mts'"`. `test` devient `pnpm -r test && pnpm test:scripts`.
- Modify: `tsconfig` : il faut que `pnpm typecheck` couvre `scripts/`. Ajouter un `tsconfig.json` racine, ou un `include` dans la config d'un paquet, au choix du builder.

**Interfaces:**
- Produces:
  - `VERSION_FILES: readonly string[]`, chemins relatifs à la racine : `preset/preset.yml`, `extension/extension.yml`, `packages/sdd/package.json`, `packages/spec-trace/package.json`, `packages/prototype/package.json`.
  - `readVersions(root: string): { file: string; version: string }[]`.
  - `checkVersions(root: string, expected: string): string[]` : les erreurs, une par fichier en écart, sous la forme `<file> : <found>, attendu <expected>`. Un tableau vide veut dire que tout est aligné.
  - `setVersions(root: string, version: string): void` : modifie uniquement la ligne de version. Pour les YAML, une regex sur `^  version: '…'$` garde les commentaires d'en-tête.
  - `changelogSection(text: string, version: string): string | null` : le corps sous `## [X.Y.Z]` ou `## X.Y.Z` (avec ou sans date après), jusqu'au `## ` suivant, sans espaces en début ni en fin.
- CLI :
  - `check <v>` : code 1 et les erreurs sur stderr ;
  - `set <v>` ;
  - `notes <v>` : la section sur stdout, ou code 1 et `CHANGELOG.md : pas de section pour <v>`.
  - Un `v` en tête du numéro est accepté et retiré, pour pouvoir passer `${GITHUB_REF_NAME}`.

- [ ] **Step 1: Write the failing tests** in `scripts/version.test.mts`, sur une copie temporaire des cinq fichiers :
  - `checkVersions(tmp, '0.2.0')` après `setVersions(tmp, '0.2.0')` donne `[]` ;
  - les en-têtes commentés de `preset.yml` sont intacts (même texte avant `preset:`) ;
  - avec `packages/prototype/package.json` remis à `0.1.1`, on obtient `['packages/prototype/package.json : 0.1.1, attendu 0.2.0']` ;
  - `changelogSection('# Changelog\n\n## [0.2.0] - 2026-11-10\n\n- a\n\n## [0.1.0]\n\n- b\n', '0.2.0')` donne `'- a'` ;
  - `changelogSection(..., '0.3.0')` donne `null` ;
  - la CLI `check v0.2.0` accepte le préfixe `v`.
- [ ] **Step 2:** `pnpm test:scripts`. Attendu : FAIL, module introuvable.
- [ ] **Step 3:** Implémenter `scripts/version.mts`. La racine est le dossier parent de `scripts/`, obtenu avec `import.meta.url`.
- [ ] **Step 4:** `pnpm test:scripts && pnpm typecheck`. Attendu : PASS. Puis `node scripts/version.mts check 0.2.0`. Attendu : code 1, avec 5 lignes d'écart (les versions ne sont pas encore modifiées).
- [ ] **Step 5: Commit** `feat(release): check and set the single repository version`

### Task 2: Zips reproductibles

**Files:**
- Create: `scripts/zip.mts`, `scripts/zip.test.mts`
- Modify: `package.json` (racine). Ajouter le script `"zips": "node scripts/zip.mts"`.

**Interfaces:**
- Consumes: `readVersions` (tâche 1), pour nommer les zips.
- Produces:
  - `trackedFiles(root: string, dir: string): string[]` : `git ls-files -z -- <dir>`, chemins relatifs à `dir`, triés par ordre d'octets.
  - `buildZip(root: string, dir: string, out: string): void` : écrit l'archive avec, pour chaque fichier, sa date fixée à `1980-01-01 00:00` (DOS : date `0x0021`, heure `0`), des attributs externes `0o100644 << 16`, la méthode deflate (`deflateRawSync`, niveau 9) et `crc32` de `node:zlib`. Pas de champ extra, pas de commentaire. Les dossiers ne sont pas des entrées.
  - CLI `node scripts/zip.mts <dossier de sortie>` : écrit `artefact-sdd-<v>.zip` (depuis `preset/`) et `artefact-product-<v>.zip` (depuis `extension/`). `<v>` vient de `preset.yml` et `extension.yml` respectivement. La CLI affiche les deux chemins.

Le format ZIP n'est pas déterminé par la signature, d'où ce détail. Chaque entrée a un en-tête local (signature `0x04034b50`, version 20, drapeaux 0x0800 pour l'UTF-8). Le répertoire central (`0x02014b50`) vient ensuite, puis l'enregistrement de fin (`0x06054b50`). Pas de ZIP64 : les archives font moins de 1 Mo.

- [ ] **Step 1: Write the failing tests** in `scripts/zip.test.mts`, sur un dépôt git jetable qui contient `preset/preset.yml`, `preset/templates/a.md` et un `preset/.DS_Store` non suivi :
  - deux `buildZip` successifs donnent des fichiers identiques octet pour octet ;
  - `unzip -Z1 <zip>` (présent sur macOS et sur ubuntu-latest) liste exactement `preset.yml` et `templates/a.md` ;
  - `.DS_Store` est absent ;
  - `unzip -p <zip> templates/a.md` redonne le contenu d'origine ;
  - `unzip -t` réussit.
- [ ] **Step 2:** `pnpm test:scripts`. Attendu : FAIL.
- [ ] **Step 3:** Implémenter `scripts/zip.mts`.
- [ ] **Step 4:** `pnpm test:scripts`. Attendu : PASS. Puis `node scripts/zip.mts "$TMPDIR/z"`, lancé deux fois. Attendu : les deux `shasum` sont identiques.
- [ ] **Step 5: Commit** `feat(release): reproducible zips of the preset and the extension`

### Task 3: Source de l'installation (release ou dev)

**Files:**
- Create: `packages/sdd/src/source.mts`, `packages/sdd/src/source.test.mts`
- Modify:
  - `packages/sdd/src/specify.mts` : `specify(runner, cwd, args, input?: string)` transmet `input` au runner ;
  - `packages/sdd/src/install.mts` : `COMPONENTS` et `Options`. La fonction factice `--dev` de `install.test.mts` doit aussi émuler `--from`, en copiant depuis le clone.

**Interfaces:**
- Produces:
  - `type Source = { kind: 'release'; version: string; baseUrl: string } | { kind: 'dev'; version: string; dir: string }`.
  - `RELEASE_BASE = 'https://github.com/artefact-ci/speckit-artefact/releases/download'`.
  - `releaseSource(version: string, env: NodeJS.ProcessEnv = process.env): Source` : `baseUrl` vaut `env.SDD_RELEASE_BASE_URL` sans `/` final, ou sinon `${RELEASE_BASE}/v${version}`.
  - `devSource(dir: string): Source` : lit `preset.version` dans `<dir>/preset/preset.yml` (avec `yaml`). Lève `SetupError` si le fichier est absent ; le message actuel de la CLI, « n'est pas un clone de speckit-artefact … », passe ici.
  - `zipUrl(s: Source & { kind: 'release' }, id: 'artefact-sdd' | 'artefact-product'): string` donne `${baseUrl}/${id}-${version}.zip`.
  - `componentArgs(s: Source, id: 'artefact-sdd' | 'artefact-product', present: boolean): { args: string[]; input?: string }` :
    - release, `artefact-product` : `['extension','add','--from',url]`, plus `'--force'` si `present`, avec `input: 'y\n'` ;
    - release, `artefact-sdd` : `['preset','add','--from',url]`, ou si `present` `['preset','update','artefact-sdd','--from',url]` ;
    - dev : les arguments `--dev` actuels de la phase 4, sans changement.
  - `Options.source: Source` remplace `source: string`.
- Erreur : en mode release, une `SpecifyError` lancée pendant l'installation d'un composant est relancée en `SetupError`, avec le message `impossible d'installer <id> <version> depuis <url> : <message de specify>`.

- [ ] **Step 1: Write the failing tests** in `source.test.mts` :
  - `releaseSource('0.2.0', {})` donne une `baseUrl` égale à `https://github.com/artefact-ci/speckit-artefact/releases/download/v0.2.0` ;
  - avec `SDD_RELEASE_BASE_URL: 'http://localhost:1/'`, on obtient `http://localhost:1` ;
  - `componentArgs` pour les quatre cas release, avec l'`input` exact ;
  - `devSource(<racine du dépôt>)` lit une version égale à celle de `preset/preset.yml`.

  Dans `install.test.mts`, ajouter `init with a release source runs extension add --from <url> with y on stdin`. Ajouter aussi `a failing release download names the URL` : le runner factice renvoie le code 1 pour `--from`, et l'erreur est une `SetupError` dont le message contient `http://localhost:1/artefact-product-0.2.0.zip`.
- [ ] **Step 2:** `pnpm --filter @artefact-ci/sdd test`. Attendu : FAIL.
- [ ] **Step 3:** Implémenter `source.mts`, puis brancher `componentArgs` dans `common()` de `install.mts`.
- [ ] **Step 4:** `pnpm --filter @artefact-ci/sdd test && pnpm typecheck`. Attendu : PASS. Les tests existants en dev passent sans changement d'arguments.
- [ ] **Step 5: Commit** `feat(sdd): install from the GitHub release of the installer version`

### Task 4: `.specify/artefact.json`, garde de version et rapport

**Files:**
- Create: `packages/sdd/src/artefact.mts`, `packages/sdd/src/artefact.test.mts`
- Modify: `packages/sdd/src/install.mts`, `packages/sdd/src/report.mts`, `packages/sdd/src/install.test.mts`, `packages/sdd/src/cli.test.mts` (tests du rapport)

**Interfaces:**
- Consumes: `Source` (tâche 3), `writeIfChanged` (`install.mts`).
- Produces:
  - `type Installed = { version: string; source: 'release' | 'dev' }`.
  - `ARTEFACT_JSON = '.specify/artefact.json'`.
  - `readInstalled(root: string): Installed | null` : `null` si le fichier est absent. `SetupError` qui nomme `.specify/artefact.json` si le JSON est invalide, si `version` n'est pas une chaîne non vide, ou si `source` n'est ni `release` ni `dev`.
  - `writeInstalled(root: string, i: Installed): boolean`, à travers `writeIfChanged`, avec `JSON.stringify(i, null, 2) + '\n'`.
  - `compareVersions(a: string, b: string): number` : comparaison numérique de `X.Y.Z`.
  - `Report` gagne le champ `version: { installed: Installed | null; previous: Installed | null; downgrade: boolean }`. `installed` vaut `null` quand `init` n'a pas écrit le fichier (version inconnue).
- Règles, à placer dans `init` **avant** toute commande Spec Kit, migration comprise :
  1. Si `previous` existe et `previous.version !== source.version`, lever `SetupError` avec le message `Spec Kit a déjà la méthode en <previous> (.specify/artefact.json) ; cet installeur installe <source.version> : lance update pour changer de version`.
  2. Sinon, après `common()` : si `previous` existe, ou si `installed` était vide avant l'exécution (ni `artefact-sdd` ni `artefact-product` enregistrés), écrire `{ version: source.version, source: source.kind }`.
  3. Sinon (fichier absent et un composant au moins déjà là), ne rien écrire.
- `update` écrit toujours le fichier. `downgrade` vaut `previous !== null && compareVersions(previous.version, source.version) > 0`. `update` continue même dans ce cas.
- Lignes du rapport, dans la section `Spec Kit` :
  - `  Version : <v> (<release|dev>)` ;
  - pour `update` : `  Version : <prev> → <v> (<source>)`, ou `  Version : <v> (<source>), version précédente inconnue` ;
  - si `installed` est vide : `  Version installée inconnue : lance update pour aligner tous les composants` ;
  - si `downgrade` vaut vrai : `  Attention : <prev> était plus récente que <v>, l'installeur a remis <v>`.

- [ ] **Step 1: Write the failing tests** :
  - **`artefact.test.mts`** :
    - écriture puis lecture redonnent l'objet ;
    - un deuxième `writeInstalled` identique renvoie `false` ;
    - `{"version":1}` lève une erreur qui contient `.specify/artefact.json` ;
    - `compareVersions('0.10.0','0.9.0') > 0`.
  - **`install.test.mts`** :
    - `first init writes artefact.json with the source version` ;
    - `second init with the same version leaves artefact.json untouched` ;
    - `init refuses another version and runs no specify command` : le runner factice enregistre zéro appel après `uvx --version` ;
    - `init on a phase 4 install installs nothing new and writes no artefact.json` ;
    - `update writes the new version and reports the previous one` ;
    - `update to an older version warns and goes on`.
  - **`cli.test.mts`** (`formatReport`) : les quatre lignes ci-dessus, au caractère près.
- [ ] **Step 2:** `pnpm --filter @artefact-ci/sdd test`. Attendu : FAIL.
- [ ] **Step 3:** Implémenter.
- [ ] **Step 4:** `pnpm --filter @artefact-ci/sdd test && pnpm typecheck`. Attendu : PASS.
- [ ] **Step 5: Commit** `feat(sdd): record the installed version in .specify/artefact.json`

### Task 5: Ligne de commande sans `--source`

**Files:**
- Modify: `packages/sdd/src/cli.mts`, `packages/sdd/src/cli.test.mts`, `packages/sdd/README.md`

**Interfaces:**
- Consumes: `releaseSource`, `devSource` (tâche 3).
- Comportement :
  - sans `--source`, la source vaut `releaseSource(pkg.version)` ;
  - avec `--source <dir>`, elle vaut `devSource(resolve(dir))` ;
  - le message « la source release arrive en phase 5 » disparaît, et son test est remplacé ;
  - `USAGE` reste `Usage : artefact-sdd init|update [--source <dir>] [--integration <outil>] [--help]` ;
  - l'en-tête de la doc du fichier décrit les deux modes.
- README du paquet : l'usage normal est `npx @artefact-ci/sdd@X.Y.Z init`, et `--source` sert au développement de la méthode. `SDD_RELEASE_BASE_URL` n'y figure pas.

- [ ] **Step 1: Write the failing test** `without --source it tries the release of its own version`. Lancer la CLI avec `SDD_RELEASE_BASE_URL=http://127.0.0.1:9` et un `PATH` qui contient un faux `uvx`. Ce faux `uvx` est un script shell écrit dans le dossier temporaire du test : il répond 0 à `--version` et 1 au reste. On vérifie le code 1 et un stderr qui contient `http://127.0.0.1:9/artefact-product-<version du package.json>.zip`. Mettre à jour le test `--source` invalide pour le nouveau message de `devSource`.
- [ ] **Step 2:** `pnpm --filter @artefact-ci/sdd test`. Attendu : FAIL.
- [ ] **Step 3:** Implémenter.
- [ ] **Step 4:** `pnpm --filter @artefact-ci/sdd test`. Attendu : PASS.
- [ ] **Step 5: Commit** `feat(sdd): the release of the installer is the default source`

### Task 6: Bout en bout en mode release

**Files:**
- Modify: `packages/sdd/test/e2e.test.mts`

**Interfaces:**
- Consumes: `buildZip` / la CLI `scripts/zip.mts` (tâche 2), la CLI construite (tâche 5).
- Avant les cas release, un `before` construit les zips du dépôt dans un dossier temporaire. Il démarre un serveur `node:http` sur `127.0.0.1`, port 0. `GET /v<version>/<zip>` répond 302 vers `/files/<zip>`, et `/files/<zip>` sert le fichier : on imite ainsi la redirection de GitHub (Review Focus n°1). Le serveur est fermé dans `after`. `sdd()` accepte un `env` en plus, qui sert à passer `SDD_RELEASE_BASE_URL=http://127.0.0.1:<port>/v<version>`.

- [ ] **Step 1: Write the failing e2e cases** :
  - **`release mode: init twice leaves no diff`** :
    - premier `init` sans `--source` : on vérifie `Installé : git, artefact-product, artefact-sdd`, `Version : <v> (release)` et le contenu de `.specify/artefact.json` ;
    - les versions de `.specify/presets/.registry` (`presets["artefact-sdd"].version`) et de `.specify/extensions/.registry` (`extensions["artefact-product"].version`) valent toutes deux `<v>` ;
    - on commite, puis un deuxième `init` laisse `git status --porcelain` vide.
  - **`release mode: init refuses a project recorded at another version`** : écrire `{"version":"0.0.1","source":"release"}` dans `artefact.json` et commiter. `init` sort avec le code 1, et le message contient `lance update`. `git status --porcelain` est vide.
  - **`release mode: update records the new version`** : partir du projet du cas précédent. `update` sort avec le code 0, `artefact.json` vaut `<v>`, et le rapport contient `0.0.1 → <v>` et ne contient pas de ligne `Attention`, puisque la version monte.
- [ ] **Step 2:** `SDD_E2E=1 pnpm --filter @artefact-ci/sdd test:e2e`. Attendu : les nouveaux cas échouent si les tâches 3 à 5 ne sont pas branchées, puis passent une fois qu'elles le sont. On lance aussi les cas existants en `--source`.
- [ ] **Step 3:** Corriger ce que l'e2e révèle, dans le code des tâches 3 à 5 si besoin.
- [ ] **Step 4:** `SDD_E2E=1 pnpm --filter @artefact-ci/sdd test:e2e`. Attendu : PASS sur tous les cas.
- [ ] **Step 5: Commit** `test(sdd): release mode end to end, behind a redirect`

### Task 7: CI des PR et CI de release

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: `pnpm version:check`, `pnpm notes`, `pnpm zips` (tâches 1 et 2).
- **`ci.yml`** :
  - ajouter `workflow_call:` à `on:` ;
  - dans le job `packages`, après `pnpm test` (qui lance maintenant aussi `test:scripts`), ajouter une étape « Zips are reproducible » : `pnpm zips a`, `pnpm zips b`, puis `cmp` deux à deux ;
  - dans le job `preset`, après les contrôles en `--dev`, construire les zips (le job doit alors installer Node et pnpm), les servir avec `python3 -m http.server` sur `127.0.0.1:8765` en arrière-plan, puis, sur un **second** projet vierge, lancer `preset add --from` et `extension add --from` (avec `yes |` devant ce dernier) ;
  - refaire la boucle de contrôle des skills et de `agents/relecteur.md`. Factoriser cette boucle dans un script du job, ou dans une étape répétée.
- **`release.yml`** :
  - `on: push: tags: ['v*.*.*']`, `permissions: contents: read` au niveau du workflow ;
  - jobs, dans l'ordre :
    1. **`verify`** :
       - checkout avec `fetch-depth: 0` ;
       - `pnpm version:check "$GITHUB_REF_NAME"` ;
       - `git merge-base --is-ancestor "$GITHUB_SHA" origin/main`, sinon `::error::` « le tag doit être sur main » ;
       - `pnpm notes "$GITHUB_REF_NAME" > notes.md`, transmis en artefact.
    2. **`ci`** : `uses: ./.github/workflows/ci.yml`.
    3. **`release`** (`needs: [verify, ci]`, `permissions: contents: write`) :
       - `pnpm zips dist-zips` ;
       - si `gh release view "$GITHUB_REF_NAME"` échoue, `gh release create "$GITHUB_REF_NAME" --title "$GITHUB_REF_NAME" --notes-file notes.md --verify-tag` ;
       - pour chaque zip : s'il est absent de la release, `gh release upload` ; s'il est présent, `gh release download --pattern <zip> -D old` puis `cmp`, et un écart donne `::error::` « <zip> déjà publié avec un autre contenu : sortir une nouvelle version ».
    4. **`npm`** (`needs: release`, `permissions: contents: read, id-token: write`) :
       - `actions/setup-node@v4` avec `node-version: '24'` et `registry-url: 'https://registry.npmjs.org'`, puis `npm install -g npm@^11.5.1` ;
       - `pnpm install --frozen-lockfile`, puis `pnpm -r exec pnpm pack --pack-destination "$RUNNER_TEMP/packs"` ;
       - pour chaque tgz, lire nom et version ; si `npm view <nom>@<version> version` répond, écrire « déjà publié, sauté » ; sinon `npm publish <tgz> --access public`.
    5. **`smoke`** (`needs: npm`) :
       - uv, Node 24 et une identité git, comme dans le job `installer` ;
       - attendre que `npm view @artefact-ci/sdd@<v> version` réponde : 10 essais espacés de 30 s ;
       - puis, dans `mktemp -d`, lancer `git init` et `npx -y @artefact-ci/sdd@<v> init` ;
       - vérifier avec `jq` : `.specify/artefact.json` donne `.version == "<v>"` et `.source == "release"`, et les deux registres donnent `<v>`.

  `<v>` vaut `${GITHUB_REF_NAME#v}`.

- [ ] **Step 1:** Écrire les deux workflows. Valider la syntaxe avec `actionlint` s'il est disponible (`brew install actionlint`), sinon avec un `yaml` qui parse.
- [ ] **Step 2:** Pousser la branche et ouvrir la PR vers `dev`. Attendu : `ci.yml` est vert, y compris les nouvelles étapes (zips reproductibles, installation `--from`). Un échec ici peut révéler un écart de forme du zip : corriger dans `scripts/zip.mts`, avec son test.
- [ ] **Step 3: Commit** `ci: release workflow on tags, install the zips in every PR`

`release.yml` ne peut s'exécuter qu'au premier tag : c'est ce que vérifie la tâche 8.

### Task 8: Version 0.2.0, documentation, puis release

**Files:**
- Modify (avec `pnpm version:set 0.2.0`) : les cinq fichiers de versions.
- Modify : les attentes de `packages/sdd/src/stack.test.mts` et `install.test.mts` qui écrivent `0.1.0` en dur restent telles quelles s'il s'agit de valeurs passées en entrée. Ne corriger que ce qui casse.
- Create: `CHANGELOG.md` (sections `## [0.2.0] - <date>` et `## [0.1.0] - 2026-11-09`), `docs/release.md`
- Modify: `README.md`, `docs/plan.md`

- [ ] **Step 1:** Lancer `pnpm version:set 0.2.0`, puis `pnpm version:check 0.2.0`. Attendu : code 0. Lancer ensuite `pnpm test && pnpm typecheck`. Attendu : PASS.
- [ ] **Step 2:** Écrire les documents :
  - **`CHANGELOG.md`**, section 0.2.0 : installation depuis la release sans `--source`, `.specify/artefact.json`, `init` qui refuse une autre version, et les numéros des cinq pièces alignés (le preset et l'extension *descendent* de 1.0.0 à 0.2.0 : le dire pour les projets installés en `--dev`).
  - **`docs/release.md`**, la procédure suivie à chaque release :
    1. `pnpm version:set X.Y.Z` ;
    2. compléter le changelog ;
    3. PR vers `dev`, puis fusion de `dev` dans `main` ;
    4. tag sur `main` ;
    5. suivre la CI ;
    6. en cas d'échec, relancer le job (chaque étape peut être relancée sans dégât) ;
    7. pour la toute première release : les étapes manuelles de la spec (passage en public, trusted publishers à déclarer moins de 2 jours avant le tag, interdiction des jetons après la publication).
  - **`README.md`** : retirer « La source release GitHub arrive en phase 5 », donner l'usage `npx @artefact-ci/sdd@0.2.0 init` et faire un lien vers `docs/release.md`.
  - **`docs/plan.md`** : cocher les trois cases de la phase 5. Remplacer le critère de fin par `npx @artefact-ci/sdd@0.2.0 init`, avec la 1.0.0 après la phase 6. Ajouter un paragraphe « Vérifié le … » une fois le test de fumée passé.
- [ ] **Step 3: Commit** `chore(release): 0.2.0`. Ouvrir la PR vers `dev`. Attendu : CI verte.
- [ ] **Step 4: À faire par Al Moustapha, puis vérification.** Al Moustapha passe le dépôt en public, fusionne dans `dev` puis dans `main`, déclare les trusted publishers, puis pousse `v0.2.0`. Attendu : `release.yml` est vert sur ses cinq jobs, la release `v0.2.0` porte les deux zips, `npm view @artefact-ci/sdd@0.2.0` répond, et la provenance est affichée sur npmjs.com.
- [ ] **Step 5:** Rejouer à la main le critère de fin dans un dossier vide : `git init && npx -y @artefact-ci/sdd@0.2.0 init`. Attendu : `.specify/artefact.json` vaut `{"version":"0.2.0","source":"release"}`, et un deuxième `init` laisse `git status` vide une fois le premier commité. Noter le résultat dans `docs/plan.md`, puis commiter `docs: mark phase 5 as done`.
