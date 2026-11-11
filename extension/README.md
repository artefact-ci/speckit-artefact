# extension/

Extension Spec Kit `artefact-product` : `/speckit-prd`, `/speckit-design`, `/speckit-epics`, `/speckit-prototype` et leurs templates (prd, design, journeys), sortis de `preset/` en phase 1. Spec Kit les nomme `speckit-artefact-product-<commande>` ; le manifeste garde les anciens noms en alias. Elles lisent `.specify/stack.yml` (schéma : [`docs/stack.md`](../docs/stack.md)) : branches, commande de trace et front (`ui`). Sans front, `/speckit-design` n'écrit que la partie non visuelle et `/speckit-prototype` s'arrête. Elles travaillent avec les agents de la méthode, dont les consignes sont dans `agents/` (designer, relecteur, relecteur-produit, relecteur-design, po ; métadonnées dans `agents/agents.yml`). Spec Kit les copie dans `.specify/extensions/artefact-product/agents/` ; sans elles, les commandes s'arrêtent. Les fichiers d'agent propres à un outil (`.claude/agents/`, `.agents/agents/`) ne sont pas ici : `@artefact-ci/sdd` les génère à partir de `agents.yml`.

Après une modification ici :

```sh
uvx --from specify-cli==1.3.2 specify extension add --dev <chemin>/extension --force
```
