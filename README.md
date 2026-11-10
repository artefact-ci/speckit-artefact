# speckit-artefact

La méthode de développement par specs d'Artefact CI, installable dans n'importe quel projet en une commande, quelle que soit sa stack.

Chaque fonctionnalité part d'une spec écrite et relue. Elle est implémentée test d'abord, une user story par PR, et relue par un agent qui ne l'a pas écrite avant d'être déclarée terminée. La méthode s'appuie sur [Spec Kit](https://github.com/github/spec-kit) 1.3.2, sans fork. Ce dépôt fournit :

| Pièce | Ce qu'elle apporte |
| --- | --- |
| preset `artefact-sdd` | templates spec, plan, tâches et constitution ; règles TDD ajoutées aux commandes du cœur (`/speckit-specify`, `plan`, `tasks`, `analyze`, `implement`, `converge`) |
| extension `artefact-product` | `/speckit-prd`, `/speckit-design`, `/speckit-epics`, `/speckit-prototype`, et les consignes des agents (relecteur, relecteur produit, designer, relecteur design, PO) |
| [`@artefact-ci/sdd`](packages/sdd/README.md) | l'installeur : `npx @artefact-ci/sdd init` et `update` |
| [`@artefact-ci/spec-trace`](packages/spec-trace/README.md) | la matrice scénarios → tests, qui échoue quand un scénario n'a pas de test |
| [`@artefact-ci/prototype`](packages/prototype/README.md) | les maquettes HTML cliquables de `/speckit-prototype`, dans le thème du projet |

Les commandes ne citent aucun outil ni aucun chemin propre à une stack : elles lisent `.specify/stack.yml`, le fichier qui décrit le projet (ses commandes de test, ses branches, ses fichiers de conventions, son front).

## Installer sur un projet

Il faut [uv](https://docs.astral.sh/uv/) (Spec Kit est lancé par `uvx`), Node 24.11 ou plus récent, et git. Dans le dépôt du projet, sur un arbre propre :

```sh
npx @artefact-ci/sdd@0.2.0 init
```

L'installeur ne pose aucune question. Il :

1. initialise Spec Kit 1.3.2 si `.specify/` est absent, puis installe l'extension git, l'extension `artefact-product` et le preset `artefact-sdd` (zips de la release `v0.2.0` de ce dépôt) ;
2. branche les hooks git : `/speckit-specify` crée la branche de la fonctionnalité, et chaque commande qui écrit des fichiers commite son résultat ;
3. génère les fichiers d'agent de l'outil du projet (voir [Outils](#outils)) ;
4. déduit `.specify/stack.yml` du dépôt, et écrit la constitution de base si le projet n'en a pas ;
5. écrit la version installée dans `.specify/artefact.json`, puis affiche un rapport : ce qui est installé, ce qui a été deviné, ce qu'il reste à compléter.

Pour un projet Antigravity : `npx @artefact-ci/sdd@0.2.0 init --integration agy`.

Lancé deux fois, `init` ne change rien la deuxième fois.

## Après l'installation : trois fichiers à relire

Ne commitez pas avant de les avoir relus.

**`.specify/stack.yml`.** Corrigez ce que l'installeur a deviné et remplissez chaque clé marquée `# à compléter`. `commands.test` et `commands.affected` sont obligatoires : sans eux, les commandes s'arrêtent. Une autre clé absente ou à `null` fait sauter l'étape qui l'utilise, jamais un test. Décidez en particulier de `flags` : `true` si toute nouvelle fonctionnalité doit être livrée derrière un feature flag désactivé par défaut, `false` sinon ; l'installeur ne le devine jamais. Schéma complet : [`docs/stack.md`](docs/stack.md) ; exemples : [`examples/stack/`](examples/stack/) (Nx, Bun + Hono, Next.js).

```yaml
# .specify/stack.yml : une API Bun + Hono, sans front
version: 1
branches:
  base: dev
  production: main
docs: [AGENTS.md]
commands:
  test: bun test {file}
  affected: bun run lint && bun run typecheck && bun test
  check: bun run check
  trace: bunx @artefact-ci/spec-trace@0.2.0
tests:
  globs: ['src/**/*.test.ts']
flags: false
ui: null # pas de front : /speckit-design n'écrit que la partie non visuelle, /speckit-prototype s'arrête
e2e: null
```

**Les fichiers de conventions** listés sous `docs` (`AGENTS.md`…). Les commandes les lisent avant le plan, les tâches et l'analyse : c'est là que vivent les règles propres au projet (où documenter une variable d'environnement, comment générer un module, les frontières entre modules, ce qu'une nouvelle page doit porter). Une règle qui n'y est pas, l'agent ne la connaît pas.

**`.specify/memory/constitution.md`.** Elle commence par les quatre principes communs à tous les projets, que les commandes citent par leur nom : I. Test-First, II. Incremental Delivery, III. Independent Review, IV. Living Specs. Gardez-les tels quels et ajoutez ceux du projet à partir de V (isolation des tenants, erreurs typées…), chacun renvoyant au fichier de conventions qui le détaille.

## Travailler avec la méthode

Les specs, plans et tâches sont écrits en anglais ; vous pouvez décrire la fonctionnalité en français.

**Cadrer le produit**, une fois au départ puis à chaque révision du cahier des charges, sur une branche `docs/product-*` :

| Commande | Produit |
| --- | --- |
| `/speckit-prd <description ou chemin du cahier des charges>` | `specs/prd.md` et les exigences de `specs/product.yml` (`PAY-03`) |
| `/speckit-design` | `specs/design.md` (utilisateurs, ergonomie, ton, accessibilité, direction visuelle), appliqué au thème quand le projet a un front |
| `/speckit-epics` | les epics de `specs/product.yml`, ordonnés par leurs dépendances, avec leurs parcours de bout en bout |

L'agent propose, un relecteur produit ou design relit à froid, et vous tranchez avant tout commit.

**Livrer une fonctionnalité**, une à la fois, juste avant de l'implémenter :

| Étape | Commande | Vous relisez |
| --- | --- | --- |
| 1. Spécifier | `/speckit-specify <description>` (ou `/speckit-specify E03`) | chaque scénario se vérifie par un test, sans jugement |
| 2. Clarifier | `/speckit-clarify` | les réponses sont reportées dans les exigences |
| (option) Maquetter | `/speckit-prototype` | les parcours et la maquette, avant le plan |
| 3. Planifier | `/speckit-plan` | chaque principe de la constitution ; un test prévu par scénario ; les décisions qu'il vous laisse |
| 4. Découper | `/speckit-tasks`, puis `/speckit-analyze` | les incohérences signalées, corrigées |
| 5. Implémenter | `/speckit-implement` | chaque test vu en échec avant le code |
| 6. Converger | `/speckit-converge` | le rapport du relecteur ; la matrice de `commands.trace` |

On répète 5 et 6 jusqu'à ce que `/speckit-converge` conclue **Converged**. Pour cela, chaque scénario d'acceptation doit avoir un test qui le vérifie, les vérifications doivent passer sans cache, et la relecture indépendante ne doit laisser aucun écart bloquant. Une user story fait une PR ; la dernière passe la spec en `Implemented`.

Quelques règles qui ne se discutent pas :

- **Traçabilité.** Chaque scénario a un identifiant `<feature>-US<story>-AS<n>` (`003-US1-AS2`), que le titre de chaque test qui le couvre cite en tête. `@artefact-ci/spec-trace` vérifie la correspondance, en CI aussi. Un scénario n'est jamais renuméroté ni supprimé : il est retiré.
- **Relecture indépendante.** Celui qui produit ne valide pas. Le relecteur part d'un contexte vierge, sans le résumé de l'auteur. Un écart contesté reste ouvert jusqu'à ce qu'un humain tranche.
- **Specs à jour.** Une fois mergée, `spec.md` décrit le comportement actuel : une PR qui change ce comportement modifie la spec. `plan.md` et `tasks.md` restent l'historique de la construction.

## Outils

| Outil | Ce que génère l'installeur | Relecture et design |
| --- | --- | --- |
| Claude Code (par défaut) | `.claude/agents/` : `relecteur`, `relecteur-produit`, `relecteur-design`, `designer` | les commandes lancent les sous-agents |
| Antigravity (`--integration agy`) | `.agents/agents/` : les trois relecteurs | les relecteurs sont des sous-agents ; le design est fait par l'agent principal, puis relu |
| Autre outil Spec Kit | rien | la commande vous demande de lancer la relecture dans une nouvelle session et d'en coller le rapport : elle ne se saute pas |

Les fichiers d'agent sont fins : ils lisent les consignes, communes à tous les outils, de `.specify/extensions/artefact-product/agents/`.

## Mettre à jour

```sh
npx @artefact-ci/sdd@X.Y.Z update
```

`update` réinstalle l'extension et le preset de la version demandée, régénère les fichiers d'agent et réapplique les hooks git. Il ne touche jamais `.specify/stack.yml` ni la constitution. Relisez le diff avant de commiter, et lisez la section de la version dans [`CHANGELOG.md`](CHANGELOG.md) : elle dit ce qui change pour un projet déjà installé.

Le numéro suit SemVer : MAJOR quand une commande ou une clé de `stack.yml` disparaît ou change de sens, MINOR quand une commande ou une clé est ajoutée, PATCH pour la formulation. Une seule version couvre le preset, l'extension et les trois paquets npm.

Ne modifiez pas à la main `.specify/presets/`, `.specify/extensions/`, `.claude/skills/speckit-*` ni les fichiers d'agent : `update` les régénère. Pour adapter la méthode au projet :

- une règle propre au projet va dans ses fichiers de conventions (`docs` de `stack.yml`) ;
- des templates de plan ou de tâches propres à la stack vont dans un preset local installé au-dessus d'`artefact-sdd` (`uvx --from specify-cli==1.3.2 specify preset add --dev <dossier> --priority 5`) ; l'exemple est [`examples/nx-preset/`](examples/nx-preset/), celui du boilerplate nx-react-nestjs ;
- une règle de la méthode elle-même se change dans ce dépôt, par une PR.

## Migrer depuis le preset `boilerplate`

Un projet issu de nx-react-nestjs qui a encore le preset `boilerplate` (`tools/spec-kit/preset/`) migre avec `init`. L'installeur retire ce preset et installe la méthode ; il ne supprime jamais l'ancien `docs/agents/`, mais le signale dans le rapport, avec les fichiers qui le citent encore. Ensuite :

1. relisez `stack.yml` et la constitution (voir plus haut) ; mettez les quatre principes communs en tête de la constitution ;
2. pour garder les templates Nx de plan et de tâches, remplacez `tools/spec-kit/preset/` par [`examples/nx-preset/`](examples/nx-preset/) et installez-le au-dessus (`--priority 5`) ;
3. dans `AGENTS.md`, les guides et le tutoriel, remplacez `preset update boilerplate` par `npx @artefact-ci/sdd update`, et `docs/agents/` par `.specify/extensions/artefact-product/agents/` ; supprimez ensuite `docs/agents/` ;
4. vérifiez avec `git status` que seuls `.specify/`, `.claude/` et la documentation ont changé.

Les anciens noms de commandes (`/speckit-prd`…) restent valables, en alias. La migration de nx-react-nestjs elle-même sert de référence : [PR #79](https://github.com/AlMoustapha01/monorepo-nx-react-nestjs/pull/79).

## Faire évoluer la méthode

Le dépôt :

```
preset/              artefact-sdd : preset.yml, commands/, templates/
extension/           artefact-product : extension.yml, commands/, templates/, agents/
packages/sdd/        l'installeur
packages/spec-trace/ la matrice scénarios → tests
packages/prototype/  les maquettes
examples/stack/      stack.yml types ; examples/nx-preset/ : le preset local du boilerplate
docs/                stack.md (schéma), release.md (publier), plan.md (historique et décisions)
```

Tester une modification sur un projet, depuis un clone :

```sh
pnpm install && pnpm --filter @artefact-ci/sdd build          # dans ce clone
node <clone>/packages/sdd/dist/cli.mjs init --source <clone>  # dans le projet ; update --source pour réinstaller
```

Avec `--source`, le preset et l'extension sont installés en `--dev` depuis le clone, et `.specify/artefact.json` porte `"source": "dev"`. Pour réinstaller une seule pièce : `specify preset update artefact-sdd --dev <clone>/preset`, ou `specify extension add --dev <clone>/extension --force`.

Vérifier :

```sh
pnpm test && pnpm typecheck                         # tests unitaires des trois paquets et des scripts
SDD_E2E=1 pnpm --filter @artefact-ci/sdd test:e2e   # installeur de bout en bout, avec le vrai Spec Kit
```

La CI (`.github/workflows/ci.yml`) les lance à chaque PR vers `dev` et `main`. Elle vérifie aussi que `preset/` et `extension/` ne citent aucune stack, et que le preset local Nx prend le pas sur les templates génériques. Une modification de la méthode se valide aussi sur le boilerplate nx-react-nestjs, sans régression, avant sa publication.

Publier une version : [`docs/release.md`](docs/release.md). Les PR vont vers `dev`, et chacune est relue par quelqu'un d'autre que son auteur.
