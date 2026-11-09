# extension/

Extension Spec Kit `artefact-product` : `/speckit-prd`, `/speckit-design`, `/speckit-epics`, `/speckit-prototype` et leurs templates (prd, design, journeys), sortis de `preset/` en phase 1. Spec Kit les nomme `speckit-artefact-product-<commande>` ; le manifeste garde les anciens noms en alias. Elles lisent `.specify/stack.yml` (schéma : [`docs/stack.md`](../docs/stack.md)) : branches, commande de trace et front (`ui`). Sans front, `/speckit-design` n'écrit que la partie non visuelle et `/speckit-prototype` s'arrête. Elles travaillent avec les agents de la méthode, dont les consignes sont dans `docs/agents/` du projet (installées en phase 4) ; sans elles, elles s'arrêtent.

Après une modification ici :

```sh
uvx --from specify-cli==1.3.2 specify extension add --dev <chemin>/extension --force
```
