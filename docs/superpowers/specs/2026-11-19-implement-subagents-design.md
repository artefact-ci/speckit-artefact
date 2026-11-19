# `/speckit-implement` en sous-agents, à la demande

## Pourquoi

Aller plus vite : faire avancer en même temps les tâches qui le peuvent, au lieu que l'agent principal les fasse une à une.

## Objectifs, non-objectifs, anti-objectifs

- **Objectif** : sur demande, les tâches `[P]` d'une même phase sont faites en parallèle par des sous-agents ; le reste de la commande ne change pas.
- **Non-objectifs** : paralléliser les stories (une story reste une PR) ; isoler les sous-agents dans des worktrees ; changer `/speckit-tasks`.
- **Anti-objectifs** : un test coché sans son échec vu ; un `tasks.md` ou un historique git abîmé par deux écrivains ; une méthode qui ne marche plus sur un outil sans sous-agents.

## Approches

- **A. Tâches `[P]` en parallèle, dans le même dossier (retenue)** : marche sur Claude Code, Antigravity et OpenCode, sans fusion ; `[P]` garantit déjà des fichiers distincts. Risques : tests d'intégration concurrents sur un même service ; bac à sable d'Antigravity.
- B. Une story par sous-agent, dans son worktree : gain plus fort, mais branches et PR parallèles, fusion, `tasks.md` partagé ; worktree natif sur Claude Code seulement.
- C. Un worktree par tâche `[P]` : tests isolés, mais fusion à chaque vague, Claude Code seulement.

L'utilisateur a choisi A.

## Conception

**Déclenchement.** `/speckit-implement --subagents`, ou la même demande en clair dans les arguments. Sans elle, comportement actuel. Pas de clé dans `stack.yml`.

**Vagues.** L'agent principal forme une vague avec les tâches `[P]` consécutives d'une même phase (typiquement les tests rouges d'une story, puis les implémentations qui touchent des fichiers différents). Il lance un sous-agent `implementeur` par tâche de la vague. Les tâches sans `[P]`, les refactors et les points de contrôle restent faits par l'agent principal, en séquence.

**Le sous-agent `implementeur`** (nouvelle entrée `access: writes` dans `extension/agents/agents.yml`, consignes dans `extension/agents/implementeur.md`) reçoit l'identifiant de la tâche, sa ligne de `tasks.md` et le dossier de la fonctionnalité. Il :

- lit le plan, la spec, `stack.yml` et les fichiers `docs` ;
- applique les règles test d'abord : tâche de test → écrit le test, le lance (`commands.test` filtré au fichier), rend la ligne d'échec ; tâche d'implémentation → code minimal jusqu'au vert de ses tests ;
- ne touche que les fichiers de sa tâche ; s'il lui en faut un autre, il s'arrête et le dit ;
- ne modifie pas `tasks.md`, ne commite rien ;
- rend un rapport : fichiers touchés, commande lancée, ligne d'échec ou de succès, hypothèses, et « Commandes à lancer » pour ce que son outil a refusé.

**Après chaque vague, l'agent principal** lance les commandes refusées listées, relance les tests de la vague (chaque test rouge échoue pour la raison attendue, chaque implémentation est verte), coche les tâches, et suit les règles existantes (`commands.affected` après du code partagé, commit par le hook). Une tâche dont le sous-agent a échoué ou s'est arrêté repasse en séquence, faite par l'agent principal.

**Outil sans sous-agents.** Le mode séquentiel s'applique, et le rapport le dit : contrairement à la relecture, la vitesse ne justifie pas de demander à l'utilisateur d'ouvrir des sessions.

**Installeur.** Les générateurs gèrent déjà `access: writes` pour les trois outils : l'entrée dans `agents.yml` suffit ; tests et rapport de l'installeur mis à jour pour le nouvel agent.

**Documentation.** README (tableau des outils, étape 5), CHANGELOG ; version MINOR (une option et un agent ajoutés).

## Choix faits par Claude (à vérifier)

- Au plus 4 sous-agents à la fois, pour borner le coût et la charge de la machine.
- Tests concurrents : une tâche dont le test a besoin d'un service de `tests.needs` ou d'`e2e` n'entre dans une vague que si les fichiers `docs` disent que les lancements en parallèle sont sûrs ; sinon elle reste séquentielle.
- Antigravity : le sous-agent écrit avec ses outils ; quand le bac à sable refuse son test, il le met dans « Commandes à lancer » et l'agent principal le lance (même schéma que le designer).

## Laissé au constructeur

La formulation exacte des consignes et de la section du preset ; le texte de la description de l'agent.
