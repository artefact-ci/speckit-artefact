# Preset `artefact-sdd`

Le cœur test-first de la méthode, pour n'importe quelle stack : templates de spec, de plan, de tâches et de constitution, règles ajoutées à `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze`, `/speckit-implement` et `/speckit-converge` (sections « (artefact-sdd) »).

Le preset ne cite aucun outil ni chemin de projet : les commandes lisent `.specify/stack.yml` (schéma : [`docs/stack.md`](../docs/stack.md)) et les fichiers de conventions qu'il liste. Ce dossier fait foi ; la copie installée (`.specify/presets/artefact-sdd/`) et les skills (`.claude/skills/speckit-*`) sont générés.

Après une modification ici :

```sh
uvx --from specify-cli==1.3.2 specify preset update artefact-sdd --dev <chemin>/preset
```
