# Phase 4 — Installeur `@artefact-ci/sdd` et agents multi-outils

10 novembre 2026 · conception validée en conversation avec Al Moustapha Doumbia · référence : [`docs/plan.md`](../../plan.md), phase 4

## Intention

Un projet Artefact CI doit recevoir la méthode en une commande, `npx @artefact-ci/sdd init`, sans copier de fichiers à la main, et pouvoir la mettre à jour sans perdre ce qui lui est propre. La phase 4 livre cet installeur, et règle au passage la question ouverte du plan sur les agents : où vivent leurs consignes, et comment un outil autre que Claude Code (Antigravity d'abord) en profite.

Le premier utilisateur réel est AVIA (phase 6b), précédé par le boilerplate nx-react-nestjs (phase 6a). L'installeur sera lancé par Al Moustapha puis par un junior : il ne pose pas de question, il fait, et il dit clairement ce qu'il a deviné et ce qu'il reste à relire.

## Objectifs

1. `init` installe la méthode complète sur un projet vierge ou existant : Spec Kit 1.3.2 si besoin, extension git, extension `artefact-product`, preset `artefact-sdd`, hooks git du boilerplate, fichiers d'agents de l'outil du projet, `stack.yml` déduit, socle de constitution.
2. `update` réinstalle tout sauf `stack.yml` et la constitution.
3. Les consignes des agents sont neutres vis-à-vis de l'outil et livrées par l'extension ; l'installeur ne génère que de fins fichiers d'agent par outil (Claude Code et Antigravity en v1).
4. Les commandes de la méthode marchent aussi avec un outil sans sous-agents : la relecture indépendante se fait alors en contexte neuf, jamais sautée.

**Fini quand** (critère du plan) : `init` lancé deux fois de suite laisse le dépôt identique (`git status` vide la deuxième fois).

## Non-objectifs

- La release GitHub et les URL de zips par tag : phase 5. En phase 4, l'installeur installe depuis un clone local (`--source`, voir plus bas) ; le code prévoit l'emplacement de la source « release » sans l'implémenter.
- `.specify/artefact.json` (version installée) : phase 5.
- Un catalogue ou un bundle Spec Kit.
- Des fichiers d'agent pour d'autres outils que Claude Code et Antigravity.
- Questions interactives dans le terminal.

## Anti-objectifs (ce qui serait un échec même si ça « marche »)

- Écraser `stack.yml` ou une constitution déjà écrite par le projet.
- Inventer une commande dans `stack.yml` : une commande non déduite reste vide et commentée, les commandes Spec Kit s'arrêteront dessus (comportement déjà défini dans `docs/stack.md`).
- Une relecture sautée parce que l'outil n'a pas de sous-agents.
- Des consignes d'agent qui citent une stack (`nx`, `pnpm`, `libs/`, `apps/`, NestJS…) ou un outil (Claude, Antigravity).
- Un deuxième `init` qui modifie quoi que ce soit.

## Décisions prises

### Agents

- **Source unique, neutre** : les consignes deviennent `extension/agents/` : `designer.md`, `relecteur.md`, `relecteur-produit.md`, `relecteur-design.md`, `po.md`. Spec Kit 1.3.2 copie ce dossier non déclaré dans `.specify/extensions/artefact-product/agents/`, en `--dev` comme depuis un zip servi en HTTP (vérifié le 10 novembre 2026).
- **Reprises du boilerplate** (`nx-react-nestjs`, branche `dev`, `b30bb7b`, `docs/agents/`) et rendues génériques comme les commandes en phase 1 : `pnpm -s spec:trace` → `commands.trace`, `libs/web/ui` → `ui.components`, `theme.css` → `ui.theme`, `pnpm prototype` → `ui.prototype`, `pnpm add` et polices → ce que disent les fichiers `docs` du projet. Les règles propres à une stack (frontières de domaines, NestJS/Drizzle/`pg`, `lingui.config.ts`, knip, `apps/web/AGENTS.md`) sortent de la grille : le relecteur les trouve dans les fichiers `docs` de `stack.yml` et dans la constitution du projet.
- **Plus de `docs/agents/` dans le projet** : toutes les références (`extension/commands/*.md`, `preset/commands/speckit.converge.md`, `preset/templates/constitution-template.md`) pointent vers `.specify/extensions/artefact-product/agents/<nom>.md`. Le relecteur du cœur vit aussi dans l'extension : l'installeur pose toujours les deux. Quand la consigne manque, la commande s'arrête et le dit (règle actuelle, chemin changé).
- **Fichiers d'agent fins, générés par l'installeur** selon l'intégration de `.specify/integration.json` (`integration`, et toutes celles de `installed_integrations`) :
  - Claude Code (`claude`) : `.claude/agents/<nom>.md`, frontmatter `name`, `description`, `tools`, corps « Lis `.specify/extensions/artefact-product/agents/<nom>.md` et applique-le à la lettre », plus les interdits (ne modifie rien / ne commite rien pour les relecteurs). Forme actuelle du boilerplate, chemin changé.
  - Antigravity (`agy`) : `.agents/agents/<nom>/agent.md` (forme dossier, la seule documentée par la CLI), frontmatter `name`, `description`, `tools`, `commandExecutionPolicy`, même corps. Source : https://antigravity.google/docs/subagents et https://antigravity.google/docs/cli/commands/agents.
  - Autre intégration : rien n'est généré, l'installeur le dit.
- **Projets qui ont déjà des agents** (nx-react-nestjs, Afri Café) : `init` et `update` réécrivent les fichiers d'agent de la méthode (`.claude/agents/designer.md`, `relecteur.md`, `relecteur-produit.md`, `relecteur-design.md` : de simples pointeurs) ; ils ne suppriment jamais `docs/agents/`. Le rapport le signale comme obsolète, fichier par fichier, en disant si la consigne est identique à celle du boilerplate (`b30bb7b`, empreintes embarquées dans l'installeur) ou modifiée sur place, auquel cas ses changements sont à reporter dans les `docs` du projet avant de supprimer le dossier à la main. Les mentions de `docs/agents/` dans `AGENTS.md` et les guides du projet sont signalées de la même façon, sans être modifiées. *Décidé par Al Moustapha.*
- **Pas de fichier d'agent pour `po`** : le PO n'est pas un sous-agent, c'est l'agent principal qui applique `po.md` en conversation (comme dans le boilerplate).
- **Métadonnées des agents** dans `extension/agents/agents.yml` : pour chaque sous-agent, `name`, `description` (celle du boilerplate, sans chemin de stack) et un rôle d'accès (`read-only` pour les trois relecteurs, `writes` pour le designer). Chaque générateur traduit ce rôle dans le vocabulaire de son outil. L'installeur lit ce fichier dans la copie installée : les fichiers d'agent suivent la version de l'extension.
- **Commandes neutres** : là où elles disent « lance le sous-agent `relecteur` », elles ajoutent : si l'outil n'a pas de sous-agents, faire la relecture dans un contexte neuf (nouvelle session, ou autre agent) en appliquant la consigne, avec les chemins seulement, sans le résumé ni l'avis de l'auteur ; la relecture ne se saute pas.

### Installeur

- **Paquet** `packages/sdd`, Node/TypeScript, mêmes conventions que `spec-trace` et `prototype` (ESM, `.mts`, `node --test`, `tsc`, Node ≥ 24.11, publication publique `@artefact-ci`), ajouté au workspace pnpm et à la CI.
- **Pas de question** : `init` déduit et écrit, puis affiche un rapport (ce qui a été installé, ce qui a été deviné dans `stack.yml`, ce qui reste à relire ou à compléter).
- **`init`, dans l'ordre :**
  1. Vérifie que `uv` (`uvx`) est disponible ; sinon s'arrête avec la commande d'installation.
  2. Si `.specify/` est absent : `uvx --from specify-cli==1.3.2 specify init --here --script sh --non-interactive`, avec `--force` quand le dossier n'est pas vide, et `--integration <x>` (option `--integration` de l'installeur, `claude` par défaut). Si `.specify/` existe, l'intégration du projet est gardée.
  3. Si le preset `boilerplate` est installé : `specify preset remove boilerplate` (étape 1 de la procédure de migration de `docs/plan.md`), puis la suite fait l'étape 2.
  4. Installe l'extension git (`specify extension add git`, version figée par Spec Kit 1.3.2), puis `artefact-product`, puis le preset `artefact-sdd`. Source en phase 4 : `--source <clone de speckit-artefact>` → `--dev <clone>/extension` et `--dev <clone>/preset`. Déjà installé : `init` ne réinstalle pas, il le signale (en 1.3.2, `add` réécrit `installed_at` dans les `.registry` versionnés, ce qui casserait l'idempotence) ; c'est `update` qui réinstalle, par le chemin de mise à jour de Spec Kit, qui garde `installed_at`. *Choix du concepteur.*
  5. Réécrit la clé `hooks:` de `.specify/extensions.yml` avec les 10 hooks du boilerplate, à l'identique (`before_specify` → `speckit.git.feature` ; `after_specify`, `after_clarify`, `after_plan`, `after_tasks`, `after_checklist`, `after_analyze`, `after_implement`, `after_converge`, `after_constitution` → `speckit.git.commit`, avec les prompts et descriptions du boilerplate), et `settings.auto_execute_hooks: true`. Le reste du fichier (`installed`…) est conservé.
  6. Génère les fichiers d'agent de chaque intégration connue.
  7. Si `.specify/stack.yml` est absent : le déduit et l'écrit (voir plus bas).
  8. Si `.specify/memory/constitution.md` est absent ou encore le gabarit vierge de Spec Kit (il contient les marqueurs `[PROJECT_NAME]` et `[PRINCIPLE_1_NAME]` du gabarit du cœur) : y écrit le `constitution-template` du preset, `[PROJECT_NAME]` remplacé par le nom du projet ; les autres marqueurs restent pour `/speckit-constitution`. Sinon, n'y touche pas.
- **`update`** : étapes 1, 3 à 6 ; ne touche jamais `stack.yml` ni la constitution ; s'arrête si `.specify/` est absent (« lance `init` »).
- **Déduction de `stack.yml`**, précisions (*choix du concepteur*) :
  - ordre de détection quand les signaux se mélangent : `nx.json` l'emporte (exemple `nx.yml`) ; sinon `next.config.*` (exemple `nextjs.yml`) ; sinon `bun.lock`/`bun.lockb` (exemple `bun-hono.yml`) ; sinon inconnu (squelette commenté). Le gestionnaire de paquets se lit séparément, d'après le lockfile (`bun.lock` > `pnpm-lock.yaml` > `yarn.lock` > `package-lock.json`), et donne le runner des commandes ;
  - Nx : les commandes de l'exemple sont gardées telles quelles (`nx affected -t …` ignore les projets sans la cible) ; l'installeur ne lance pas Nx ;
  - clés qui sont des chemins (`shared`, `ui.components`, `ui.theme`, `e2e.dir`, `docs`) : reprises de l'exemple seulement si le chemin existe, sinon vides et commentées ; `tests.globs` et `tests.needs` reprises de l'exemple, signalées comme devinées ;
  - `ui` : un front détecté (`next.config.*`, ou exemple Nx) écrit toujours l'objet `ui`, jamais `null` ; un thème introuvable laisse `ui.theme` vide avec `# à compléter`, et les commandes front s'arrêtent dessus (clé obligatoire) au lieu de sauter le visuel en silence. `ui: null` seulement quand aucun front n'est détecté, signalé comme deviné ;
  - `trace` et `ui.prototype` : les outils npm à la version de l'installeur, par le runner du projet (`npx -y @artefact-ci/spec-trace@<version>`, `pnpm dlx …`, `bunx …`) ; l'installeur ne touche pas `package.json`. Pour Nx, `pnpm prototype` de l'exemple devient `pnpm dlx @artefact-ci/prototype@<version>` (binaire `artefact-prototype`) si le script `prototype` n'existe pas.
- **Déduction de `stack.yml`**, règles générales : repère la stack avec `nx.json`, `bun.lock`/`bun.lockb`, `next.config.*`, et le gestionnaire (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lock`) ; part de l'exemple le plus proche de `examples/stack/` (`nx.yml`, `bun-hono.yml`, `nextjs.yml`) ; ne garde une commande que si le script correspondant existe dans `package.json` (ou, pour Nx, que la cible existe) ; `branches.base`/`production` d'après les branches du dépôt (`dev`, `main`) ; `docs` d'après les fichiers présents (`AGENTS.md`…) ; `trace` = `<runner> @artefact-ci/spec-trace`. Une clé non déduite reste vide avec un commentaire `# à compléter`. Le fichier commence par un commentaire qui dit qu'il a été déduit et doit être relu. Le rapport liste les clés devinées et les clés vides.
- **Idempotence** : chaque étape compare avant d'écrire ; les fichiers générés ont une sortie déterministe (ordre des clés, fin de ligne). Si une commande Spec Kit réécrit des fichiers à l'identique, c'est sans effet sur `git status`.

### Tests

- Unitaires (`node --test`) : déduction de `stack.yml` sur des dépôts factices (Nx, Bun + Hono, Next.js, inconnu), génération des fichiers d'agent Claude et Antigravity depuis `agents.yml`, réécriture des hooks en conservant le reste de `extensions.yml`, détection du gabarit vierge de constitution.
- Bout en bout en CI : sur un dépôt jetable, `init --source $GITHUB_WORKSPACE` deux fois de suite, `git status` vide après la deuxième (après un commit de la première) ; `update` ne change ni `stack.yml` ni la constitution modifiés à la main ; migration d'un projet qui a le preset `boilerplate` (preset installé en `--dev` depuis un dossier de test).
- CI : garde « pas de stack citée » étendue à `extension/agents/` (déjà couvert par le `grep` sur `extension/`, à confirmer) et nouvelle garde « pas d'outil cité » (`Claude`, `Antigravity`) dans les consignes **et** dans les commandes de `preset/` et `extension/` : les mentions actuelles « In Claude Code… » des commandes sont réécrites de façon neutre (objectif 4).
- Antigravity : la CI vérifie la forme des fichiers générés ; le lancement réel d'un sous-agent Antigravity est vérifié une fois à la main, et noté dans `docs/plan.md`.

## Contraintes

- Spec Kit figé en 1.3.2 partout (`uvx --from specify-cli==1.3.2 specify`).
- `extension add --from <url>` demande une confirmation : sans objet en phase 4 (`--dev`), à traiter en phase 5.
- Les commandes de la méthode continuent de passer la garde CI existante (pas de `nx`, `libs/`, `apps/`, `pnpm` dans `preset/` et `extension/`).
- Antigravity : sous-agents documentés pour l'app et la CLI, pas pour les extensions IDE ; un nom d'outil mal écrit dans `tools` peut bloquer le sous-agent : n'utiliser que des noms vérifiés.

## Laissé au builder

- La structure interne du paquet (modules, nommage), les messages exacts du rapport, le format de `agents.yml` au-delà des trois champs.
- Les noms exacts des outils Antigravity et Claude de chaque rôle, à vérifier sur la documentation.
- L'emplacement des exemples de `stack.yml` pour l'installeur (copiés dans le paquet au build, ou embarqués comme données).
- Le découpage en PR et en commits.

## Mise à jour du plan

À la fin de la phase, `docs/plan.md` : phase 4 cochée avec ce qui a été vérifié, question « Les agents » tranchée (consignes dans l'extension, fichiers d'agent générés par outil), cases de la phase 4 réécrites (plus de copie de `docs/agents/`), README de `agents/` et de `packages/sdd/` à jour (le dossier `agents/` racine disparaît au profit de `extension/agents/`).
