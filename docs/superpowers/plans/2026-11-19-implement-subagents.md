# `/speckit-implement` en sous-agents : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/speckit-implement --subagents` fait les tâches `[P]` d'une même phase en parallèle, par des sous-agents `implementeur`, l'agent principal gardant `tasks.md`, les vérifications et les commits.

**Architecture:** un nouvel agent de la méthode (`extension/agents/implementeur.md` + une entrée `access: writes` dans `agents.yml`) que l'installeur génère déjà pour Claude Code, Antigravity et OpenCode sans changer de code ; une section « Subagent Mode » ajoutée à `preset/commands/speckit.implement.md`, qui décrit les vagues et ce que fait l'agent principal autour. Le reste est documentation.

**Tech Stack:** Markdown des commandes Spec Kit 1.3.2 (preset `append`), YAML, Node ≥ 24.11 `node --test` pour l'installeur.

**Spec:** [`docs/superpowers/specs/2026-11-19-implement-subagents-design.md`](../specs/2026-11-19-implement-subagents-design.md)

## Global Constraints

- Branche `feat/implement-subagents`, partie de `origin/dev` ; la PR part vers `dev`.
- `preset/` et `extension/` ne citent aucun outil ni aucune stack, hors README et manifestes : `grep -rniE 'claude|antigravity' preset/ extension/ --exclude=README.md --exclude=preset.yml --exclude=extension.yml` et `grep -rnE '\bnx\b|libs/|apps/|pnpm' preset/ extension/ --exclude=README.md` ne sortent rien (vérifié en CI). Dire « un bac à sable », « si ton outil ne peut pas lancer de sous-agent », jamais un nom d'outil.
- Les sections du preset sont en anglais, titrées `## <Titre> (artefact-sdd)` ; les consignes d'agent (`extension/agents/*.md`), le README et le CHANGELOG sont en français.
- Renvoi à une autre commande : jetons Spec Kit (`__SPECKIT_COMMAND_TASKS__`), jamais `/speckit-tasks` en dur.
- Nom de l'agent : `implementeur` (sans accent, comme les autres noms de fichiers). Option : `--subagents`. Taille d'une vague : 4 sous-agents au plus.
- Pas de changement de version ici (MINOR à la prochaine release) : les entrées vont sous `## [Unreleased]` du CHANGELOG.

## Review Focus

1. Deux tâches `[P]` d'une même phase qui citent le même fichier (un `tasks.md` mal marqué) : elles ne doivent pas partir dans la même vague. → règle explicite en Task 2, étape 1.
2. Un test écrit par un sous-agent qui passe dès son premier lancement : la tâche n'est pas cochée, comme en mode séquentiel. → règle dans les consignes (Task 1, étape 3) et vérification par l'agent principal (Task 2, étape 1).
3. Un sous-agent qui modifie `tasks.md`, commite, ou touche un fichier hors de sa tâche : l'agent principal le voit (`git status`, `git log`) avant de cocher. → Task 2, étape 1.
4. Outil sans sous-agents, ou consignes `implementeur.md` absentes : mode séquentiel et une phrase dans le rapport, sans s'arrêter ni demander de session. → Task 2, étape 1.
5. `--subagents` mêlé à d'autres arguments (« US2 --subagents », « en sous-agents ») : le mode s'applique et le reste des arguments garde son sens. → Task 2, étape 1.

---

### Task 1: L'agent `implementeur`

**Files:**
- Create: `extension/agents/implementeur.md`
- Modify: `extension/agents/agents.yml` (nouvelle entrée, après `designer`)
- Modify: `packages/sdd/src/agents.test.mts`, `packages/sdd/src/install.test.mts`, `packages/sdd/test/e2e.test.mts`
- Modify: `README.md` (tableau « Outils », ligne de l'extension en tête), `extension/README.md` (liste des agents), `CHANGELOG.md`

**Interfaces:**
- Produces: un sous-agent nommé `implementeur`, consignes à `.specify/extensions/artefact-product/agents/implementeur.md` une fois installé. Entrées : l'identifiant de la tâche (`T012`), sa ligne exacte de `tasks.md`, le dossier `specs/NNN-<nom>`. Rapport au format fixé à l'étape 3, que Task 2 lit.

- [ ] **Step 1: Écrire les tests qui attendent cinq agents**

Dans `agents.test.mts` :
- `readAgentSpecs reads the 5 agents …` : `assert.equal(specs.length, 5)`.
- nouveau test `implementeur writes files on every tool` :
  - claude : `.claude/agents/implementeur.md` contient `tools: Read, Grep, Glob, Bash, Write, Edit\n`, `Ne commite rien`, `${INSTRUCTIONS_DIR}/implementeur.md`, et pas `Tu n'as pas écrit` ;
  - agy : `.agents/agents/implementeur/agent.md` contient `tools:\n  - read_file\n  - write_file\n  - edit_file\n  - run_command\n` et `commandExecutionPolicy: sandbox` ;
  - opencode : `.opencode/agents/implementeur.md` contient `permission:\n  task: deny\n` et pas `edit: deny`.
- `agy has a designer …` : `assert.equal(files.length, 5)`.

Dans `install.test.mts` : `METHOD_AGENTS` gagne `'.claude/agents/implementeur.md'` ; la liste triée de `readdirSync` gagne `'implementeur.md'` (entre `designer.md` et `mine.md`) ; les deux `report.agents.length, 8` deviennent `10` ; titres « all four agents » → « all five agents », « its four agents » → « its five agents ».

Dans `e2e.test.mts` : `4 fichier\(s\) à jour` → `5 fichier\(s\) à jour`.

- [ ] **Step 2: Les lancer et les voir échouer**

Run: `pnpm --filter @artefact-ci/sdd test`
Expected: FAIL, `4 !== 5` sur `readAgentSpecs`, et le test `implementeur` qui ne trouve pas le fichier (`Cannot read properties of undefined`).

- [ ] **Step 3: Écrire `extension/agents/implementeur.md` et l'entrée de `agents.yml`**

Entrée `agents.yml` : `name: implementeur`, `access: writes`, description (français, une phrase longue comme les autres) : lancé par `/speckit-implement` en mode sous-agents, une tâche de `tasks.md` à la fois, avec l'identifiant et la ligne de la tâche et le dossier `specs/NNN-<nom>` ; écrit le test ou le code de cette tâche seulement, test d'abord ; ne coche rien, ne commite rien ; rend un rapport avec la ligne d'échec ou de succès.

`implementeur.md`, sur le modèle de `designer.md` (titre, paragraphe « pour tout outil : sous-agent `implementeur` si l'outil en a »), sections :
- **Entrées** : les trois de l'Interfaces ci-dessus ; d'autres tâches de la même vague tournent en même temps sur d'autres fichiers.
- **Avant d'écrire** : `.specify/stack.yml`, `plan.md` (stratégie de test, structure), `spec.md` (le scénario cité), les fichiers `docs`, la constitution ; le code voisin.
- **Règles** :
  - tâche de test : écrire le test (titre commençant par l'id du scénario, en anglais), le lancer avec `commands.test` filtré au fichier, voir l'échec pour la raison attendue ; s'il passe du premier coup, ne pas le maquiller : le dire dans « Arrêt » ;
  - tâche d'implémentation : le code minimal jusqu'à ce que les tests qu'elle vise passent, lancés seuls ; d'autres tests rouges de la story peuvent rester rouges ;
  - ne toucher que les fichiers que cite la tâche ; s'il en faut un autre, s'arrêter et le dire ;
  - ne jamais modifier `tasks.md`, ne rien commiter, ne pas lancer d'autre sous-agent ;
  - jamais affaiblir ni sauter un test ;
  - commande refusée par l'outil (bac à sable) : ne pas la contourner, la mettre dans « Commandes à lancer » (même règle que le designer) ;
  - ne pas parler à l'utilisateur ; une information manque → hypothèse raisonnable listée.
- **Rapport** (format fixé, Task 2 le lit) :

```
Tâche : <T0xx> — <terminée | arrêtée>

## Fichiers modifiés
- <chemin>

## Tests
- `<commande lancée>` — <ligne d'échec citée (tâche de test) | ligne de succès (tâche d'implémentation)>

## Commandes à lancer
- `<commande>` — <ce qu'elle doit montrer> (ou « aucune »)

## Arrêt
<pourquoi la tâche n'est pas finie et ce qui la débloquerait : un autre fichier, un test déjà vert, une décision> (ou « aucun »)

## Hypothèses
- <hypothèse> (ou « aucune »)
```

- [ ] **Step 4: Relancer les tests et les vérifications de la CI**

Run: `pnpm --filter @artefact-ci/sdd test && pnpm typecheck`
Expected: PASS.
Run: les deux `grep` des Global Constraints
Expected: aucune sortie.

- [ ] **Step 5: Documentation**

- `README.md` : ligne `extension artefact-product` du tableau de tête, ajouter « implémenteur » à la liste des consignes ; tableau « Outils », ajouter `implementeur` aux trois listes d'agents ; phrase OpenCode : « leurs commandes shell et les écritures du designer et de l'implémenteur suivent les permissions du projet ».
- `extension/README.md` : `implementeur` dans la liste des agents.
- `CHANGELOG.md`, `### Ajouté` de `[Unreleased]` : l'agent `implementeur`, généré pour les trois outils, que `/speckit-implement --subagents` lance (le détail du mode vient en Task 2) ; « Un projet installé relance `update` ».

- [ ] **Step 6: Commit**

```bash
git add extension/agents/ packages/sdd/ README.md extension/README.md CHANGELOG.md
git commit -m "feat(agents): an implementeur subagent that does one task of tasks.md"
```

---

### Task 2: Le mode sous-agents de `/speckit-implement`

**Files:**
- Modify: `preset/commands/speckit.implement.md` (nouvelle section entre « Test-First Rules » et « Stopping Before the End »)
- Modify: `preset/preset.yml` (description de `speckit.implement`)
- Modify: `README.md` (section « Livrer une fonctionnalité »), `CHANGELOG.md`

**Interfaces:**
- Consumes: le sous-agent `implementeur` et son rapport (Task 1, étape 3).

- [ ] **Step 1: Écrire la section `## Subagent Mode (artefact-sdd)`**

En anglais, en puces, avec ces règles et rien de plus :
- **When**: only when the user input asks for it: `--subagents`, or the same request in words. The rest of the input keeps its meaning. Without it, implement as above, one task at a time.
- **Fallback**: if your agent cannot launch subagents, or `.specify/extensions/artefact-product/agents/implementeur.md` is missing, implement one task at a time and say so in the report; do not stop and do not ask for new sessions.
- **Waves**: a wave is a run of consecutive `[P]` tasks of the same phase, at most 4. Never put two tasks that name the same file in one wave: the second waits for the next wave. A task whose tests need a service of `tests.needs` or a browser journey (`e2e`) joins a wave only when the convention files say such tests can run in parallel; otherwise do it on its own. Tasks without `[P]`, refactor tasks and checkpoints are yours, one at a time, as above.
- **Launch**: one `implementeur` subagent per task of the wave, all in the same turn so they run at the same time. Give each one only its task id, its exact line of `tasks.md` and the feature directory.
- **After the wave**, before checking anything:
  1. run the commands listed under « Commandes à lancer », in the order given;
  2. `git status` and `git log`: no commit since the wave started, `tasks.md` unchanged, and only the files the wave's tasks name are changed; anything else, look at it and fix it yourself before going on;
  3. run the wave's tests yourself (`commands.test`, filtered to the files): each test task's test fails for the expected reason (quote the line), each implementation task's tests pass;
  4. then check the tasks and apply the Test-First Rules above (`commands.affected` after shared code, the commit after a green step).
- **Stopped or failed tasks**: a task whose report says « arrêtée », or whose check at step 3 fails, is yours, one at a time, after the wave; never re-launch it in a subagent with the same input. A test that passed on its first run follows the Test-First Rule above.
- **Report**: list the waves and the tasks each one held.

Ajouter aussi, dans « Stopping Before the End », une puce : « In subagent mode, let a running wave finish and do its after-wave checks before stopping. »

- [ ] **Step 2: Description du preset**

`preset/preset.yml`, `speckit.implement` : `'Test-first rules, and an on-demand subagent mode for [P] tasks, appended to implement'`.

- [ ] **Step 3: Vérifier**

Run: les deux `grep` des Global Constraints, puis `pnpm test`
Expected: aucune sortie pour les `grep` ; tests PASS.
Relire la section contre les cinq lignes de la Review Focus : chacune a sa règle.

- [ ] **Step 4: Documentation**

- `README.md`, sous le tableau « Livrer une fonctionnalité » : un paragraphe court sur `/speckit-implement --subagents` (vagues de tâches `[P]`, 4 au plus ; l'agent principal relance les tests, coche et commite ; sans sous-agents, mode habituel ; sur OpenCode `/speckit.implement --subagents`).
- `CHANGELOG.md`, `### Ajouté` : compléter l'entrée de Task 1 avec le mode (vagues, ce qui reste séquentiel, repli).

- [ ] **Step 5: Commit**

```bash
git add preset/ README.md CHANGELOG.md
git commit -m "feat(implement): an on-demand subagent mode that runs [P] tasks in waves"
```

---

## Validation hors plan

Avant la release, à la main (coût d'un vrai lancement) : sur un projet jetable installé avec `--source` (`node packages/sdd/dist/cli.mjs init --source <clone>`), une fonctionnalité dont `tasks.md` a au moins deux tests `[P]`, lancer `/speckit-implement --subagents` et vérifier qu'une vague part, que les tests sont vus en échec par l'agent principal et que `tasks.md` n'est coché que par lui. À consigner dans `docs/plan.md`.
