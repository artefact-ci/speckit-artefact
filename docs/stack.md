# `.specify/stack.yml`

Le fichier qui décrit la stack d'un projet aux commandes de la méthode. Le preset `artefact-sdd` et l'extension `artefact-product` ne citent aucun outil ni aucun chemin : ils lisent ce fichier. `commands.test` et `commands.affected` sont obligatoires : sans eux, ou sans le fichier, les commandes s'arrêtent et demandent de les écrire. Toute autre clé absente ou `null` fait sauter l'étape qui l'utilise, et la commande le dit dans son rapport ; elle n'invente jamais une commande. Une clé absente ne supprime jamais un test.

Exemples complets dans [`examples/stack/`](../examples/stack/) : `nx.yml` (nx-react-nestjs), `bun-hono.yml`, `nextjs.yml`.

## Clés

| Clé | Type | Rôle | Lue par | Absente |
| --- | --- | --- | --- | --- |
| `version` | entier | version du schéma, `1` | toutes | `1` |
| `branches.base` | branche | branche d'intégration : les features et les branches produit en partent, les PR y vont, le relecteur compare avec `origin/<base>` | specify, converge, prd, epics, design | branche par défaut du dépôt |
| `branches.production` | branche | branche de production : une feature n'en part jamais | specify, prd, epics, design | pas de règle |
| `docs` | liste de fichiers | fichiers de conventions du projet (`AGENTS.md`…), lus avant le plan, les tâches et l'analyse ; ils priment sur les templates | plan, tasks, analyze, design, constitution | seul le code fait référence |
| `commands.test` | commande | lancer un test ou un projet, notamment pour voir un nouveau test échouer ; `{file}` ou `{project}` est remplacé par l'agent | tasks, implement | **obligatoire** |
| `commands.affected` | commande | lint, types et tests (unitaires, intégration) de ce que le changement touche ; sans les parcours navigateur, qui ont `e2e.command` | implement, tasks, converge | **obligatoire** |
| `commands.fresh` | commande | `commands.affected` sans cache, avant **Converged** | converge | `commands.affected` |
| `commands.check` | commande | vérification complète du dépôt, en Polish et après `/speckit-design` | tasks, design | étape sautée (design : `commands.affected`) |
| `commands.trace` | commande | matrice scénarios → tests (`@artefact-ci/spec-trace`) ; prend un dossier de spec en argument | specify, analyze, converge, prd, epics, prototype | specify, prd et epics lisent `**Status**` et `**Product Requirements**` des specs ; analyze et prototype vérifient les ids de `spec.md` ; converge cherche les ids dans les fichiers de `tests.globs` |
| `tests.globs` | liste de motifs | fichiers de tests où chercher les ids de scénario | converge, plan, tasks | — |
| `tests.needs` | liste | ce que les tests d'intégration et les parcours exigent (`docker`…) | implement | rien de particulier |
| `shared` | liste de chemins | code partagé : après une tâche qui le touche, `commands.affected` tourne tout de suite | implement, tasks, analyze | pas de vérification anticipée |
| `ui` | objet ou `null` | front du projet ; `null` : pas de front, `/speckit-design` n'écrit que la partie non visuelle et `/speckit-prototype` s'arrête | specify, plan, tasks, design, prototype | `null` |
| `ui.components` | chemin | bibliothèque de composants où le plan ajoute ce que la maquette dessine | plan, tasks, prototype | — |
| `ui.storybook` | booléen | un composant ajouté vient avec sa story | plan, tasks | `false` |
| `ui.theme` | chemin | fichier de thème appliqué par `/speckit-design` | design, prototype | **obligatoire** quand `ui` est défini |
| `ui.preview` | commande | serveur qui montre les composants existants dans le thème (Storybook…), lancé en arrière-plan pour juger un brouillon ; il affiche son URL | design | pas d'aperçu : les valeurs des tokens seules |
| `ui.prototype` | commande | construit la maquette d'un dossier de spec à partir du thème (`--capture` : captures desktop et mobile), puis vérifie ses liens (`@artefact-ci/prototype`) | prototype | parcours seuls, sans maquette |
| `e2e` | objet ou `null` | parcours navigateur ; `null` : pas de parcours | implement, tasks | `null` |
| `e2e.dir` | chemin | où vivent les parcours | implement, tasks | — |
| `e2e.command` | commande | lancer les parcours (un seul, ou ceux que le changement touche) ; au checkpoint, après `commands.affected` | implement, tasks, converge | — |
| `e2e.setup` | commande | à lancer une fois avant le premier parcours | implement | — |

## Ce qui n'y va pas

Les règles propres à la stack (où documenter une variable d'environnement, comment générer un module, ce qu'une nouvelle page doit porter, les frontières entre modules) restent dans les fichiers de `docs` et la constitution du projet. `stack.yml` dit où les trouver, pas ce qu'elles disent.
