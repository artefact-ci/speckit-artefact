# extension/

Extension Spec Kit `artefact-product` : `/speckit-prd`, `/speckit-design`, `/speckit-epics`, `/speckit-prototype` et leurs templates (prd, design, journeys), sortis de `preset/` en phase 1. Spec Kit les nomme `speckit-artefact-product-<commande>` ; le manifeste garde les anciens noms en alias. Les commandes citent encore les chemins Nx du boilerplate : elles lisent `stack.yml` à partir de la phase 2.

Après une modification ici :

```sh
uvx --from specify-cli==1.3.2 specify extension add --dev <chemin>/extension --force
```
