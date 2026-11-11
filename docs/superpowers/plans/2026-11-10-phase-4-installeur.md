# Phase 4 — Installeur `@artefact-ci/sdd` : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `npx @artefact-ci/sdd init|update` installe la méthode (Spec Kit 1.3.2, extension git, `artefact-product`, `artefact-sdd`, hooks, fichiers d'agent par outil, `stack.yml` déduit, constitution), de façon idempotente ; les consignes d'agents deviennent neutres et vivent dans l'extension.

**Architecture:** Les consignes passent dans `extension/agents/` avec un `agents.yml` de métadonnées ; Spec Kit les installe dans `.specify/extensions/artefact-product/agents/`. Le paquet `packages/sdd` est une CLI Node faite d'étapes pures et testables (déduction de `stack.yml`, génération des agents, hooks, constitution, rapport des anciens agents) orchestrées par `init`/`update` au-dessus d'un exécuteur `specify` injectable.

**Tech Stack:** Node ≥ 24.11, TypeScript 6 (`.mts`, ESM, `erasableSyntaxOnly`), `node --test`, `yaml` 2.9, pnpm workspace, Spec Kit 1.3.2 via `uvx`.

**Spec:** [`docs/superpowers/specs/2026-11-10-phase-4-installeur-design.md`](../specs/2026-11-10-phase-4-installeur-design.md), et [`docs/plan.md`](../../plan.md) phase 4.

## Global Constraints

- Spec Kit appelé uniquement par `uvx --from specify-cli==1.3.2 specify …`.
- Aucune question interactive ; aucune écriture de `stack.yml` ni de la constitution par `update`.
- `preset/` et `extension/` (README exclus) ne contiennent ni `\bnx\b`, `libs/`, `apps/`, `pnpm` (garde CI existante), ni `Claude`, `Antigravity` (nouvelle garde), hors commentaires d'en-tête de `preset.yml` / `extension.yml`.
- Consignes installées : `.specify/extensions/artefact-product/agents/<nom>.md`.
- Fichiers d'agent : Claude `.claude/agents/<nom>.md` ; Antigravity `.agents/agents/<nom>/agent.md`.
- `docs/agents/` d'un projet n'est jamais supprimé ni modifié.
- Conventions des paquets existants : `package.json` comme `packages/spec-trace/package.json` (licence MIT, `publishConfig.access: public`, `engines.node >=24.11`, `files: ["dist"]`, scripts `build`/`typecheck`/`test`/`prepack`), version `0.1.0`, `bin` `artefact-sdd`.
- Commits en anglais, format conventionnel du dépôt (`feat(sdd): …`), avec les lignes `Co-Authored-By` / `Claude-Session` de la session.

## Review Focus

1. **Dépôt avec des changements non commités** : `init` ne doit rien perdre ; il travaille quand même (Spec Kit ne touche que ses dossiers), mais le rapport le dit. → test dans la tâche 8 (`init` sur dépôt sale garde le fichier modifié intact).
2. **`.specify/extensions.yml` avec commentaires et hooks d'une autre extension** : seuls les hooks `extension: git` sont réécrits, les autres et l'en-tête commenté restent. → test dans la tâche 5.
3. **`package.json` absent ou invalide** (projet non Node) : la déduction écrit le squelette inconnu, sans planter. → test dans la tâche 6.
4. **Intégration installée inconnue** (`copilot`) : aucun fichier d'agent, rapport explicite, pas d'erreur. → test dans la tâche 4.
5. **`.claude/agents/` contenant un agent du projet** (`foo.md`) : jamais touché ; seuls les 4 noms de la méthode sont écrits. → test dans la tâche 4.

---

### Task 1: Consignes génériques dans `extension/agents/`

**Files:**
- Create: `extension/agents/designer.md`, `relecteur.md`, `relecteur-produit.md`, `relecteur-design.md`, `po.md`, `agents.yml`
- Delete: `agents/README.md` (le dossier racine `agents/` disparaît)
- Source : `/Users/almoustaphadoumbia/Documents/Fabric/nx-react-nestjs`, `git show b30bb7b:docs/agents/<nom>.md` et `git show b30bb7b:.claude/agents/<nom>.md`

**Interfaces:**
- Produces: `agents.yml` lu par la tâche 4 :
  ```yaml
  # version: 1
  agents:
    - name: relecteur          # = nom du fichier de consigne sans .md
      access: read-only        # read-only | writes
      description: >-          # reprise du frontmatter du boilerplate, sans chemin de stack
        Relecteur indépendant …
  ```
  Entrées : `designer` (`writes`), `relecteur`, `relecteur-produit`, `relecteur-design` (`read-only`). Pas d'entrée `po`.

- [ ] **Step 1: Copier les 5 consignes du boilerplate** dans `extension/agents/`.
- [ ] **Step 2: Les rendre génériques** selon la table de la spec (« Reprises du boilerplate ») : `pnpm -s spec:trace [dossier]` → « la commande `commands.trace` de `.specify/stack.yml` (étape sautée si absente) » ; `pnpm nx test <projet> -- <fichier>` → `commands.test` ; `libs/web/ui`, `theme.css` → `ui.components`, `ui.theme` ; `pnpm prototype` → `ui.prototype` ; `pnpm add`, `knip.json`, `@fontsource` → « comme le disent l'étape Finalize de `/speckit-design` et les fichiers `docs` » ; `apps/web/AGENTS.md`, `libs/web/AGENTS.md`, `lingui.config.ts`, la ligne NestJS/Drizzle/`pg` de la grille du relecteur → « les règles des fichiers `docs` de `stack.yml` et les principes de la constitution du projet ». Les liens entre consignes (`[relecteur produit](relecteur-produit.md)`) restent relatifs. Chaque relecteur garde en tête « Tu ne modifies aucun fichier, ne commites rien » (repris du corps du `.claude/agents/` du boilerplate, puisque l'outil peut ne pas restreindre).
- [ ] **Step 3: Écrire `agents.yml`** (descriptions du boilerplate ; `origin/dev` → « la branche `branches.base` »).
- [ ] **Step 4: Vérifier**
  Run: `grep -rnE '\bnx\b|libs/|apps/|pnpm|NestJS|Drizzle|lingui|knip|[Cc]laude|[Aa]ntigravity' extension/agents/`
  Expected: aucune sortie.
- [ ] **Step 5: Commit** — `feat(extension): ship the agent instructions, stack-neutral`

### Task 2: Commandes et preset pointent vers les consignes de l'extension, sans nommer d'outil

**Files:**
- Modify: `extension/commands/speckit.prd.md`, `speckit.design.md`, `speckit.epics.md`, `speckit.prototype.md`, `preset/commands/speckit.converge.md`, `preset/templates/constitution-template.md`, `.github/workflows/ci.yml`

- [ ] **Step 1: Remplacer `docs/agents/<x>.md` par `.specify/extensions/artefact-product/agents/<x>.md`** partout dans ces fichiers ; « their instructions are in `docs/agents/`, installed with the method » → « … in `.specify/extensions/artefact-product/agents/`, installed with the `artefact-product` extension ».
- [ ] **Step 2: Phrases d'outil** : « With an agent other than Claude Code, ask the user to run `X` in a new session and paste its report » et « In Claude Code, launch the `relecteur` subagent. With another agent, … » deviennent : « Launch the `<nom>` subagent. If your agent cannot launch it, ask the user to run `.specify/extensions/artefact-product/agents/<nom>.md` in a new session, with the same inputs only, and paste its report: the review is never skipped. »
- [ ] **Step 3: Garde CI** : dans le job `preset`, après l'étape « Check that the preset and the extension name no stack », ajouter :
  ```yaml
      - name: Check that the commands and the agents name no tool
        run: |
          if grep -rniE 'claude|antigravity' preset/ extension/ --exclude=README.md --exclude=preset.yml --exclude=extension.yml; then
            echo "::error::a tool is cited: the method must work with any agent"
            exit 1
          fi
  ```
  et, dans « Check the extension skills », vérifier `test -f .specify/extensions/artefact-product/agents/relecteur.md`.
- [ ] **Step 4: Vérifier** — les deux `grep` des gardes (stack et outil) ne sortent rien ; `grep -rn 'docs/agents' preset extension` ne sort rien.
- [ ] **Step 5: Commit** — `refactor(method): read the agent instructions from the extension, for any agent`

### Task 3: Squelette du paquet et exécuteur `specify`

**Files:**
- Create: `packages/sdd/package.json`, `tsconfig.json`, `tsconfig.build.json`, `LICENSE` (copie de `packages/spec-trace/`), `src/specify.mts`, `src/specify.test.mts`
- Modify: `pnpm-workspace.yaml` (ajouter `packages/sdd`), `packages/sdd/README.md`

**Interfaces:**
- Produces:
  ```ts
  export const SPECIFY_VERSION = '1.3.2'
  export type Run = (cmd: string, args: string[], opts: { cwd: string; input?: string }) => Promise<{ code: number; stdout: string; stderr: string }>
  export const run: Run                       // child_process.spawn, sans shell
  export function specify(runner: Run, cwd: string, args: string[]): Promise<string>  // uvx --from specify-cli==1.3.2 specify …args ; rejette SpecifyError(code, stderr) si code ≠ 0
  export class SpecifyError extends Error { code: number; stderr: string }
  export function hasUv(runner: Run): Promise<boolean>  // `uvx --version` code 0
  ```
  Dépendance : `yaml` `^2.9.1`.

- [ ] **Step 1: Test** `specify passes the pinned version to uvx` : un `Run` factice enregistre l'appel ; `specify(fake, '/p', ['preset','list'])` → `cmd === 'uvx'`, `args` = `['--from','specify-cli==1.3.2','specify','preset','list']`, `cwd === '/p'`. Test `specify rejects with SpecifyError on a non-zero exit` (code 2, stderr `boom`). Test `hasUv is false when uvx cannot be spawned` (le faux rejette `ENOENT`).
- [ ] **Step 2: Lancer** `pnpm --filter @artefact-ci/sdd test` → FAIL (module absent).
- [ ] **Step 3: Implémenter** `src/specify.mts`.
- [ ] **Step 4: Lancer** → PASS ; `pnpm --filter @artefact-ci/sdd typecheck` → OK.
- [ ] **Step 5: Commit** — `feat(sdd): package skeleton and the pinned specify runner`

### Task 4: Fichiers d'agent par outil

**Files:**
- Create: `packages/sdd/src/agents.mts`, `src/agents.test.mts`

**Interfaces:**
- Consumes: `agents.yml` (tâche 1).
- Produces:
  ```ts
  export type AgentSpec = { name: string; access: 'read-only' | 'writes'; description: string }
  export const INSTRUCTIONS_DIR = '.specify/extensions/artefact-product/agents'
  export function readAgentSpecs(root: string): AgentSpec[]           // lit INSTRUCTIONS_DIR/agents.yml ; erreur claire s'il manque
  export function readIntegrations(root: string): string[]             // .specify/integration.json : installed_integrations, sinon [integration]
  export type FileWrite = { path: string; content: string }            // path relatif à root
  export function agentFiles(integration: string, specs: AgentSpec[]): FileWrite[] | null  // null : outil sans générateur
  ```
- Claude : `.claude/agents/<name>.md`, frontmatter `name`, `description`, `tools` (`read-only` → `Read, Grep, Glob, Bash` ; `writes` → `Read, Grep, Glob, Bash, Write, Edit`), corps : « Lis `.specify/extensions/artefact-product/agents/<name>.md` et applique-le à la lettre : méthode, grille et format du rapport. » + pour `read-only` « Tu n'as pas écrit ce travail. Ne modifie aucun fichier, ne commite rien. Rends uniquement le rapport. »
- Antigravity (`agy`) : `.agents/agents/<name>/agent.md`, frontmatter `name`, `description`, `tools`, `commandExecutionPolicy: sandbox`, même corps. Les noms d'outils (`read-only` : lecture de fichier, recherche, liste de dossier, commande ; `writes` : + écriture et remplacement) sont pris **verbatim** sur https://antigravity.google/docs/subagents avant d'écrire le code (un nom faux bloque le sous-agent) ; noter l'URL et la date en commentaire du générateur.
- Sortie déterministe : YAML du frontmatter par `yaml.stringify` avec `lineWidth: 0`, fin de fichier `\n`.

- [ ] **Step 1: Tests** : `claude files point to the installed instructions` (4 fichiers, chemins exacts, `tools` selon l'accès, le corps contient `INSTRUCTIONS_DIR/relecteur.md`) ; `agy files use the folder form` (`.agents/agents/relecteur/agent.md`, `commandExecutionPolicy: sandbox`) ; `unknown integration has no generator` (`agentFiles('copilot', specs) === null`) ; `readIntegrations reads installed_integrations` ; `agentFiles is deterministic` (deux appels, même sortie) ; Review Focus 5 est couvert à l'écriture (tâche 8).
- [ ] **Step 2: FAIL**, **Step 3: implémenter**, **Step 4: PASS**.
- [ ] **Step 5: Commit** — `feat(sdd): generate thin agent files for Claude Code and Antigravity`

### Task 5: Hooks git du boilerplate

**Files:**
- Create: `packages/sdd/src/hooks.mts`, `src/hooks.test.mts`

**Interfaces:**
- Produces: `export function applyGitHooks(extensionsYml: string): string` — garde `installed`, met `settings.auto_execute_hooks: true`, retire de chaque événement les entrées `extension: git`, ajoute les 10 hooks du boilerplate (copie exacte de `nx-react-nestjs` `b30bb7b:.specify/extensions.yml`, champs `extension, command, enabled, optional, priority, prompt, description, condition`, ordre des événements du boilerplate), supprime un événement devenu vide, conserve les entrées des autres extensions et les commentaires (`yaml.parseDocument`). Ajoute le commentaire d'en-tête des hooks du boilerplate au-dessus de `hooks:` s'il n'y est pas.

- [ ] **Step 1: Tests** : `keeps only the 10 hooks of the boilerplate` (entrée : `extensions.yml` d'un `specify extension add git` frais, 18 hooks — fixture `test/fixture/extensions-18.yml` copiée depuis un projet vierge) → 10 événements, `before_specify` = `speckit.git.feature`, les 9 autres = `speckit.git.commit` ; `is idempotent` (`applyGitHooks(applyGitHooks(x)) === applyGitHooks(x)`) ; `keeps hooks of other extensions and comments` (Review Focus 2) ; `before_constitution and after_taskstoissues are gone`.
- [ ] **Step 2: FAIL**, **Step 3: implémenter**, **Step 4: PASS**.
- [ ] **Step 5: Commit** — `feat(sdd): reapply the 10 git hooks of the boilerplate`

### Task 6: Déduction de `stack.yml`

**Files:**
- Create: `packages/sdd/src/stack.mts`, `src/stack.test.mts`, `test/fixture/repos/{nx,bun-hono,nextjs,unknown}/…` (fichiers minimaux : `nx.json`, lockfiles, `package.json` avec scripts, `next.config.mjs`…)
- Modify: `packages/sdd/package.json` (`build` copie `../../examples/stack/*.yml` dans `dist/examples/`, `files` inclut `dist`)

**Interfaces:**
- Produces:
  ```ts
  export type Deduction = { yaml: string; kind: 'nx' | 'nextjs' | 'bun-hono' | 'unknown'; guessed: string[]; empty: string[] }  // chemins de clés : 'commands.check', 'ui.theme'…
  export function deduceStack(root: string, opts: { examplesDir: string; toolsVersion: string; branches: string[] }): Deduction
  ```
- Règles (spec, « Déduction de `stack.yml` ») : ordre `nx.json` > `next.config.*` > `bun.lock`/`bun.lockb` > inconnu ; runner du lockfile `bun.lock` > `pnpm-lock.yaml` > `yarn.lock` > `package-lock.json` (défaut npm) ; commandes Nx gardées telles quelles ; autres commandes gardées seulement si le script `package.json` correspondant existe (`test`, `lint`/`typecheck` pour `affected`, `check`) ; chemins gardés seulement s'ils existent ; `ui` objet dès qu'un front est détecté, `ui.theme` vide + `# à compléter` si absent ; `ui: null` sinon ; `trace` = `npx -y @artefact-ci/spec-trace@<v>` | `pnpm dlx @artefact-ci/spec-trace@<v>` | `bunx @artefact-ci/spec-trace@<v>` (yarn : `yarn dlx`) ; `ui.prototype` pareil avec `@artefact-ci/prototype@<v>` sauf script `prototype` existant ; `branches.base` = `dev` si présente sinon la branche courante, `production` = `main` si présente et différente. En-tête : `# Déduit par @artefact-ci/sdd <v> : relis chaque clé (voir docs/stack.md).` Clé vide : valeur vide suivie de `# à compléter`.

- [ ] **Step 1: Tests**, un par fixture : `nx repo` → `kind 'nx'`, `commands.affected === 'pnpm nx affected -t lint typecheck test'`, `ui.storybook` repris ; `bun-hono repo` → `commands.test === 'bun test {file}'` (script `test` présent), `ui === null`, `trace === 'bunx @artefact-ci/spec-trace@0.1.0'` ; `nextjs repo without theme` → `ui.theme` dans `empty`, le YAML contient `# à compléter` ; `unknown repo without package.json` → `kind 'unknown'`, `commands.test` et `commands.affected` dans `empty`, pas d'exception (Review Focus 3) ; `nx wins over next.config` ; `the output parses as YAML and is deterministic`.
- [ ] **Step 2: FAIL**, **Step 3: implémenter** (repartir de l'exemple parsé avec `yaml.parseDocument` pour garder ses commentaires), **Step 4: PASS**.
- [ ] **Step 5: Commit** — `feat(sdd): deduce stack.yml from the repository`

### Task 7: Constitution et anciens agents

**Files:**
- Create: `packages/sdd/src/constitution.mts`, `src/legacy.mts`, `src/constitution.test.mts`, `src/legacy.test.mts`

**Interfaces:**
- Produces:
  ```ts
  export function isBlankConstitution(text: string): boolean   // contient '[PROJECT_NAME]' et '[PRINCIPLE_1_NAME]'
  export function baseConstitution(template: string, projectName: string): string  // remplace '[PROJECT_NAME]' seulement
  export type LegacyFinding = { path: string; state: 'unchanged' | 'modified' | 'unknown' }  // unknown : nom hors boilerplate
  export function legacyAgents(root: string): { files: LegacyFinding[]; mentions: string[] }  // mentions : fichiers .md hors docs/agents/, .specify/, node_modules/ qui citent 'docs/agents/'
  ```
- Empreintes SHA-256 du boilerplate `b30bb7b` :
  `designer.md` `01be6c6e3f1f86452bde42fb5117d288604f9757e0cf56c58a645fccc940bb4d`, `po.md` `2a78f6d5509157d26b866ad76de37abd3d075bb11dad63cc3eaae22188858696`, `relecteur-design.md` `3580a65a90e7fa3d8930213c304c18e74217a22e2b72efcb224902ddd3db95c2`, `relecteur-produit.md` `6907b77ab2d049462e9f06c5fbd4c64b901ccf9ba6d77f43a0a6150063c33b28`, `relecteur.md` `39825229e09467c002a60ac73f034a1ca440fbba7e53a9b6413d126e3618038d`.

- [ ] **Step 1: Tests** : `the core template is blank` (texte du `.specify/memory/constitution.md` d'un projet vierge 1.3.2, en fixture) ; `a filled constitution is not blank` ; `baseConstitution keeps the other markers` ; `legacy: boilerplate file is unchanged, edited one is modified` (fixture avec un fichier identique à `b30bb7b` et un modifié) ; `legacy: no docs/agents gives nothing` ; `legacy: AGENTS.md citing docs/agents/ is a mention`.
- [ ] **Step 2: FAIL**, **Step 3: implémenter**, **Step 4: PASS**.
- [ ] **Step 5: Commit** — `feat(sdd): base constitution and report of the old agent files`

### Task 8: `init` et `update`

**Files:**
- Create: `packages/sdd/src/install.mts`, `src/install.test.mts`

**Interfaces:**
- Consumes: tâches 3 à 7.
- Produces:
  ```ts
  export type Options = { root: string; source: string; integration?: string; toolsVersion: string; runner: Run }  // source : clone de speckit-artefact (phase 4)
  export type Report = { installed: string[]; skipped: string[]; agents: string[]; noAgentGenerator: string[]; stack?: Deduction; constitution: 'written' | 'kept'; legacy: ReturnType<typeof legacyAgents>; dirty: boolean }
  export function init(o: Options): Promise<Report>
  export function update(o: Options): Promise<Report>
  ```
- `init`, dans l'ordre de la spec : `hasUv` sinon `SetupError('uv manque : https://docs.astral.sh/uv/getting-started/installation/')` ; `.specify/` absent → `specify init --here --script sh --non-interactive --ignore-agent-tools --integration <integration ?? 'claude'>` (+ `--force` si le dossier n'est pas vide) ; registre `.specify/presets/.registry` contient `boilerplate` → `preset remove boilerplate` ; pour `git` (`extension add git`), `artefact-product` (`extension add --dev <source>/extension`), `artefact-sdd` (`preset add --dev <source>/preset`) : présent dans le `.registry` correspondant → `skipped`, sinon installé ; `extensions.yml` ← `applyGitHooks` (écrit seulement si différent) ; fichiers d'agent de chaque intégration (écrits seulement si différents ; jamais d'autre fichier de `.claude/agents/`) ; `stack.yml` absent → `deduceStack` ; constitution vierge ou absente → `baseConstitution(<.specify/presets/artefact-sdd/templates/constitution-template.md>, basename(root))` ; `legacyAgents` ; `dirty` = `git status --porcelain` non vide avant de commencer.
- `update` : `.specify/` absent → `SetupError('lance init')` ; mêmes étapes sans `specify init`, sans `stack.yml` ni constitution, et en réinstallant : `extension add git --force`, `extension add --dev <source>/extension --force`, `preset update artefact-sdd --dev <source>/preset`.
- Écriture « seulement si différent » : un helper `writeIfChanged(path, content): boolean`.

- [ ] **Step 1: Tests** avec un `Run` factice qui simule Spec Kit (crée `.specify/`, les `.registry`, `extensions.yml` à 18 hooks, `.specify/extensions/artefact-product/agents/agents.yml` depuis `extension/agents/`, le template du preset) dans un dossier temporaire git : `init installs everything in order` (séquence des appels `specify`) ; `second init calls no install and writes nothing` (mtime et contenu identiques, `skipped` = les trois) ; `init keeps an existing stack.yml and constitution` ; `init migrates the boilerplate preset` (`preset remove boilerplate` appelé avant les ajouts) ; `update never writes stack.yml nor the constitution` ; `update without .specify fails` ; `init without uv fails with the install link` ; `init on a dirty repo keeps the modified file and reports dirty` (Review Focus 1) ; `a project agent in .claude/agents is untouched` (Review Focus 5) ; `unknown integration is reported` (Review Focus 4).
- [ ] **Step 2: FAIL**, **Step 3: implémenter**, **Step 4: PASS**.
- [ ] **Step 5: Commit** — `feat(sdd): init and update`

### Task 9: CLI, rapport et bout en bout

**Files:**
- Create: `packages/sdd/src/cli.mts`, `src/report.mts`, `src/cli.test.mts`, `test/e2e.test.mts`
- Modify: `packages/sdd/package.json` (`bin.artefact-sdd: dist/cli.mjs`, script `test:e2e`), `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `artefact-sdd init|update [--source <dir>] [--integration <name>] [--help]` ; sans `--source` en phase 4 : erreur « la source release arrive en phase 5 : passe --source <clone de speckit-artefact> ». `formatReport(r: Report): string` en français : installé / déjà installé ; agents écrits par outil ; outils sans générateur (« relecture en contexte neuf ») ; `stack.yml` déduit (`kind`, clés devinées, clés à compléter) ; constitution ; anciens fichiers `docs/agents/` (état par fichier, et « à reporter dans les `docs` avant de supprimer le dossier » pour `modified`) et mentions ; avertissement si `dirty`. Codes de sortie : 0 succès, 1 erreur d'usage ou `SetupError`/`SpecifyError` (message sur stderr).
- `toolsVersion` = la version du `package.json` de `@artefact-ci/sdd`.

- [ ] **Step 1: Tests CLI** : `--help` affiche `Usage : artefact-sdd` ; commande inconnue → code 1 ; `init` sans `--source` → code 1 et le message phase 5 ; `formatReport` liste un `docs/agents/relecteur.md` `modified` avec la phrase « à reporter ».
- [ ] **Step 2: Test e2e** `test/e2e.test.mts`, sauté sauf si `SDD_E2E=1` : dépôt git jetable sans `.specify/`, `init --source <racine du dépôt>` (vraie CLI construite, vrai `uvx`) ; commit ; deuxième `init` → `git status --porcelain` vide ; modifier `stack.yml` et la constitution, `update` → ces deux fichiers inchangés ; second scénario : projet vierge avec un preset `boilerplate` minimal (fixture `test/fixture/boilerplate-preset/preset.yml`, id `boilerplate`, un template) installé en `--dev` et un `docs/agents/relecteur.md` du boilerplate → après `init`, `specify preset list` ne contient plus `boilerplate`, contient `artefact-sdd`, `docs/agents/relecteur.md` toujours là et rapporté `unchanged`.
- [ ] **Step 3: FAIL**, **Step 4: implémenter** `cli.mts` et `report.mts`, **Step 5: PASS** (`pnpm --filter @artefact-ci/sdd test`, puis `SDD_E2E=1 pnpm --filter @artefact-ci/sdd test:e2e`).
- [ ] **Step 6: CI** : nouveau job `installer` (ubuntu, `setup-uv@v6`, pnpm, Node 24) : `pnpm install --frozen-lockfile`, `pnpm --filter @artefact-ci/sdd build`, `SDD_E2E=1 pnpm --filter @artefact-ci/sdd test:e2e` ; dans le job `packages`, le paquet `sdd` est déjà pris par `pnpm -r` ; ajouter à l'étape « Pack » : `npx -y --package=<tgz sdd> artefact-sdd --help | grep -q 'Usage : artefact-sdd'`.
- [ ] **Step 7: Commit** — `feat(sdd): command line, report and end-to-end check`

### Task 10: Documentation et vérification Antigravity

**Files:**
- Modify: `docs/plan.md` (phase 4 : cases réécrites et cochées avec ce qui est vérifié ; « Les agents » tranché ; procédure de migration : `init` fait les étapes 1 et 2), `README.md`, `extension/README.md`, `packages/sdd/README.md` (usage, options, ce que `init`/`update` touchent), `docs/superpowers/specs/2026-11-10-phase-4-installeur-design.md` (corriger : `update` réinstalle par `extension add --force` et `preset update --dev`, `installed_at` change alors, c'est attendu ; `extension update` de 1.3.2 n'accepte ni `--dev` ni `--from`).

- [ ] **Step 1: Mettre à jour les documents.**
- [ ] **Step 2: Vérification Antigravity, à la main** : sur un projet vierge `specify init --integration agy`, `init --source`, ouvrir dans Antigravity (app ou CLI), lancer `/speckit-converge` sur une petite branche et constater que le sous-agent `relecteur` est invoqué. Noter le résultat (ou l'impossibilité de le faire, avec la raison) dans `docs/plan.md`. Si Al Moustapha doit le faire lui-même, le dire dans le rapport final au lieu de cocher.
- [ ] **Step 3: Vérification finale** : `pnpm typecheck && pnpm test`, `SDD_E2E=1 pnpm --filter @artefact-ci/sdd test:e2e`, les deux gardes `grep` de la CI → tout passe.
- [ ] **Step 4: Commit** — `docs: mark phase 4 as done`
