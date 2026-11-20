# Changelog

## [0.5.0] - 2026-11-20

### Ajouté

- Un agent peut avoir son propre modèle : la clé facultative `model` de `extension/agents/agents.yml` (alias `sonnet`, `opus`, `haiku`, `fable`, ou identifiant complet) est recopiée dans le fichier d'agent de Claude Code. Sans elle, le sous-agent garde le modèle de la session. L'`implementeur` passe sur `sonnet` : il fait une tâche bornée, vérifiée ensuite par l'agent principal, et plusieurs tournent à la fois. Les relecteurs et le designer gardent le modèle de la session. Antigravity et OpenCode ne reçoivent pas de modèle (aucune clé vérifiée pour Antigravity ; pour OpenCode, le nom dépend du fournisseur du projet). Un projet installé relance `npx @artefact-ci/sdd@0.5.0 update`.

### Corrigé

- `spec-trace` et `artefact-prototype` lisent leurs arguments avec `parseArgs` de Node, comme `artefact-sdd`. Ils acceptent maintenant la forme `--option=valeur` (`spec-trace --base=origin/dev`, `artefact-prototype --theme=src/theme.css`), qu'ils refusaient comme option inconnue. Une option courte inconnue (`spec-trace -x`) est refusée, au lieu d'être prise pour un dossier de feature. Les messages restent en français.
- `artefact-sdd` donne ses erreurs d'arguments en français (`--source` sans valeur, option inconnue), au lieu du message anglais de Node. Sans commande, il dit « Commande manquante : init ou update. » avant l'usage.

## [0.4.0] - 2026-11-19

### Ajouté

- Un agent `implementeur`, généré pour Claude Code, Antigravity et OpenCode (`.claude/agents/implementeur.md`, `.agents/agents/implementeur/agent.md`, `.opencode/agents/implementeur.md`) : il fait une seule tâche de `tasks.md`, test d'abord, dans les fichiers qu'elle cite, sans cocher ni commiter, et rend la ligne d'échec ou de succès de son test. `/speckit-implement --subagents` le lance : les tâches `[P]` consécutives d'une même phase partent par vagues de 4 au plus (jamais deux tâches sur le même fichier, ni des tests qui partagent un service de `tests.needs` sans que les conventions le permettent). Après chaque vague, l'agent principal lance les commandes que le bac à sable a refusées aux sous-agents, vérifie `git status`, relance les tests de la vague, puis coche et commite ; il reprend lui-même les tâches arrêtées. Les tâches sans `[P]`, les refactors et les points de contrôle restent séquentiels. Sans sous-agents, la commande garde son fonctionnement habituel et le dit. Un projet installé relance `npx @artefact-ci/sdd@0.4.0 update`.
- OpenCode (`--integration opencode`) : l'installeur génère les agents de la méthode en sous-agents OpenCode (`.opencode/agents/<nom>.md`, `mode: subagent`). Les relecteurs n'ont ni écriture ni accès web (`edit`, `webfetch` : `deny`) ; aucun agent ne lance d'autre sous-agent (`task: deny`). Les commandes les lancent comme sur Claude Code, au lieu de demander une nouvelle session.
- OpenCode : l'installeur ajoute à `.ignore` les règles `!.specify/` et `!.specify/**`. OpenCode cherche les fichiers avec ripgrep, qui saute les dossiers cachés : sans elles, il ne trouve ni le preset ni les consignes des agents (spec-kit#5028). Les règles déjà présentes dans `.ignore` sont gardées.

### Corrigé

- Le fichier d'agent généré pour le `designer` dit maintenant seulement que la commande qui le lance commite, sans « après l'accord de l'utilisateur » : ce texte sert aussi à l'`implementeur`, dont la commande commite après ses propres vérifications. Les consignes du designer gardent l'accord de l'utilisateur.
- Les renvois d'une commande à une autre (« `/speckit-epics` vient ensuite », le hook `/speckit-git-feature`…) étaient écrits avec le séparateur de Claude Code. Sur un outil à commandes Markdown comme OpenCode, ils citaient des commandes qui n'existent pas (`/speckit-plan` au lieu de `/speckit.plan`). Le preset et l'extension écrivent maintenant les jetons de Spec Kit (`__SPECKIT_COMMAND_PLAN__`), que Spec Kit résout pour chaque outil. Rien ne change sur Claude Code et Antigravity. Un projet installé relance `npx @artefact-ci/sdd@0.4.0 update`.

## [0.3.0] - 2026-11-12

### Ajouté

- Antigravity : l'installeur génère le `designer` (`.agents/agents/designer/agent.md`), avec les outils `read_file`, `write_file`, `edit_file` et `run_command`, vérifiés dans l'app. `/speckit-design` et `/speckit-prototype` le lancent comme sur Claude Code. Le rapport ne dit plus « agy : pas de fichier d'agent designer ».
- Le designer liste dans une section « Commandes à lancer » de son rapport les commandes que son outil lui refuse (sur Antigravity, le bac à sable interdit à une commande d'écrire : `ui.prototype`, l'installation d'une police) ; `/speckit-design` et `/speckit-prototype` les lancent avant la relecture. Sur Claude Code, rien ne change : le designer les lance lui-même.

### Modifié

- Antigravity : les relecteurs déclarent `read_file` et `run_command`, les noms qu'Antigravity résout, au lieu de `view_file`, `grep_search` et `run_command` (`grep_search` était ignoré sans message). Un projet installé relance `npx @artefact-ci/sdd@0.3.0 update`.
- `relecteur-design` : si son outil refuse `ui.prototype`, il juge sur les captures présentes et le signale, sans contourner le bac à sable.
- README : sur Antigravity, chaque commande d'un sous-agent attend un accord (ctrl+k, 60 secondes au plus).

## [0.2.1] - 2026-11-11

### Corrigé

- `init --integration <outil>` sur un projet où Spec Kit est déjà installé avec un autre outil n'installait rien et ne le disait pas. Le rapport le signale maintenant et donne les commandes Spec Kit pour ajouter ou remplacer l'outil, puis `update`. Le README décrit la marche à suivre (« Changer ou ajouter un outil »).
- Un outil ajouté à un projet déjà installé (`specify integration install agy --force`) n'avait ni les commandes de l'extension (`/speckit-prd`, `/speckit-design`, `/speckit-epics`, `/speckit-prototype`, `git.*`) ni la version du preset des commandes du cœur : Spec Kit 1.3.2 ne les enregistre que pour l'outil par défaut, et ce second outil gardait les commandes d'origine de Spec Kit, sans les règles de la méthode. `update` les enregistre maintenant pour chaque outil de `.specify/integration.json`, puis revient à l'outil par défaut, et garde le droit d'exécution des scripts de `.specify/scripts/`. Un projet qui a deux outils relance `npx @artefact-ci/sdd@0.2.1 update`.
- Le rapport disait « agy, designer : pas de fichier d'agent pour cet outil », comme si `designer` était un outil. Il dit maintenant « agy : pas de fichier d'agent designer pour cet outil ».

## [0.2.0] - 2026-11-10

### Ajouté

- `npx @artefact-ci/sdd@0.2.0 init` installe le preset et l'extension depuis les zips de la release GitHub `v0.2.0`, sans `--source` ni catalogue. `--source <clone>` reste possible (installation en `--dev`).
- `.specify/artefact.json` enregistre la version installée et la source : `{ "version": "0.2.0", "source": "release" }`.
- `init` refuse un projet installé à une autre version et renvoie vers `update`.
- CI de release sur tag `vX.Y.Z` : release GitHub avec `artefact-sdd-X.Y.Z.zip` et `artefact-product-X.Y.Z.zip`, puis publication des trois paquets npm avec provenance, sans jeton, et test de fumée.
- Dans la CI de chaque PR : installation des zips construits sur un projet vierge.
- `stack.yml` : clé `flags` (toute nouvelle fonctionnalité derrière un feature flag désactivé par défaut ; absente : pas de flag) et `e2e.fresh` (parcours sans cache, lancés par `/speckit-converge` avant **Converged** ; absente : `e2e.command`). `init` ne devine jamais `flags` : la clé reste à compléter.
- Priorité des epics : `priority` (`P1`, `P2`…) dans `specs/product.yml`, posée par `/speckit-epics` ; `spec-trace` la vérifie et son rapport donne le prochain epic (« Prochain epic : E02. »).
- Langue des documents : `/speckit-prd` demande la langue du projet et l'écrit dans `.specify/memory/language.yml` (code BCP 47, `fr`). Le PRD, le cadrage, les epics, les specs, plans et tâches, la constitution et les parcours sont écrits dans cette langue ; anglais sans le fichier. Les titres des gabarits, les marqueurs lus par les outils, les ids, les messages de commit et le code restent en anglais. Le preset ajoute cette règle à `/speckit-clarify` et `/speckit-checklist`.

### Modifié

- Le principe II du socle de constitution devient **Incremental Delivery** (une story par PR) ; le feature flag n'y est obligatoire que si `flags` vaut `true`. Le plan, les tâches, la spec (`Shipped`) et le relecteur suivent `flags`. Une constitution déjà écrite avec « II. Flagged Increments » est à renommer à la main (`update` ne touche pas la constitution).
- Une seule version pour tout le dépôt : le preset, l'extension et les trois paquets npm portent le même numéro, celui du tag. Le preset `artefact-sdd` et l'extension `artefact-product` **descendent de 1.0.0 à 0.2.0**. Les projets installés avec `--dev` (source clone) gardent un registre Spec Kit en 1.0.0 : relancer `update` pour l'aligner sur 0.2.0.
- **Prototype global** : `/speckit-prototype` complète un seul prototype du produit, `specs/prototype/`, au lieu d'un dossier `specs/NNN-<nom>/prototypes/` par fonctionnalité. Un écran n'a qu'une page ; `index.html` liste les parcours par epic puis par fonctionnalité ; les parcours sont dans `specs/prototype/journeys/NNN-<nom>.md`. `artefact-prototype` ne prend plus de dossier et refuse un argument : `ui.prototype` de `stack.yml` reste la commande sans argument (`npx @artefact-ci/prototype`). Un prototype existant est à déplacer à la main.
- Les captures du prototype figent les animations (spinner) : une page inchangée donne la même capture d'une fois à l'autre.

## [0.1.0] - 2026-11-09

- Première publication à la main, le 9 novembre 2026, de `@artefact-ci/spec-trace` (0.1.0) et `@artefact-ci/prototype` (0.1.0, puis 0.1.1) sur npm. `@artefact-ci/sdd` 0.1.0 (installeur avec `--source`) n'a jamais été publié : sa première version fonctionnelle sur npm est la 0.2.0 (un paquet provisoire `0.0.0-stage` est publié avant, voir [`docs/release.md`](docs/release.md)).
