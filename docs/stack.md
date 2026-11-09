# `.specify/stack.yml`

Le fichier qui décrit la stack d'un projet aux commandes de la méthode. Le preset `artefact-sdd` et l'extension `artefact-product` ne citent aucun outil ni aucun chemin : ils lisent ce fichier. Une clé absente ou `null` fait sauter l'étape qui l'utilise, et la commande le dit dans son rapport ; elle n'invente jamais une commande. Sans le fichier, les commandes s'arrêtent et demandent de l'écrire.

Exemples complets dans [`examples/stack/`](../examples/stack/) : `nx.yml` (nx-react-nestjs), `bun-hono.yml`, `nextjs.yml`.

## Clés

| Clé | Type | Rôle | Lue par | Absente |
| --- | --- | --- | --- | --- |
| `version` | entier | version du schéma, `1` | toutes | `1` |
| `branches.base` | branche | branche d'intégration : les features en partent, les PR y vont, le relecteur compare avec `origin/<base>` | specify, converge | branche par défaut du dépôt |
| `branches.production` | branche | branche de production : une feature n'en part jamais | specify | pas de règle |
| `docs` | liste de fichiers | fichiers de conventions du projet (`AGENTS.md`…), lus avant le plan, les tâches et l'analyse ; ils priment sur les templates | plan, tasks, analyze, constitution | seul le code fait référence |
| `commands.test` | commande | lancer un test ou un projet ; `{file}` ou `{project}` est remplacé par l'agent | tasks, implement | l'agent ne lance pas les tests un par un |
| `commands.affected` | commande | lint, types et tests de ce que le changement touche, journeys compris | implement, tasks, converge | étape sautée |
| `commands.fresh` | commande | même chose sans cache, avant **Converged** | converge | `commands.affected` |
| `commands.check` | commande | vérification complète du dépôt, en Polish | tasks | étape sautée |
| `commands.trace` | commande | matrice scénarios → tests (`@artefact-ci/spec-trace`) ; prend un dossier de spec en argument | specify, analyze, converge | l'agent cherche les ids dans les fichiers de `tests.globs` |
| `tests.globs` | liste de motifs | fichiers de tests où chercher les ids de scénario | analyze, converge | — |
| `shared` | liste de chemins | code partagé : après une tâche qui le touche, `commands.affected` tourne tout de suite | implement, tasks, analyze | pas de vérification anticipée |
| `ui` | objet ou `null` | front du projet ; `null` : pas de front, les étapes UI sautent | specify, plan, tasks, extension | `null` |
| `ui.components` | chemin | bibliothèque de composants où le plan ajoute ce que la maquette dessine | plan, tasks | — |
| `ui.storybook` | booléen | un composant ajouté vient avec sa story | plan, tasks | `false` |
| `ui.theme` | chemin | fichier de thème appliqué par `/speckit-design` | extension | — |
| `e2e` | objet ou `null` | parcours navigateur ; `null` : pas de parcours | implement, tasks | `null` |
| `e2e.dir` | chemin | où vivent les parcours | implement, tasks | — |
| `e2e.setup` | commande | à lancer une fois avant le premier parcours | implement | — |
| `e2e.needs` | liste | ce que les tests d'intégration et les parcours exigent (`docker`…) | implement | — |

## Ce qui n'y va pas

Les règles propres à la stack (où documenter une variable d'environnement, comment générer un module, ce qu'une nouvelle page doit porter, les frontières entre modules) restent dans les fichiers de `docs` et la constitution du projet. `stack.yml` dit où les trouver, pas ce qu'elles disent.
