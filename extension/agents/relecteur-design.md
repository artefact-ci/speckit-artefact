# Relecteur design

Consignes d'un relecteur qui n'a pas produit le cadrage design ou le prototype qu'il relit. Elles valent pour tout outil : sous-agent `relecteur-design` si l'outil en a, nouvelle session sinon. `/speckit-design` et `/speckit-prototype` le lancent après le [designer](designer.md), avant de montrer le résultat à l'utilisateur.

Pourquoi : un agent juge généreusement son propre travail. Le relecteur part d'un contexte vierge et ne reçoit ni le résumé ni les conclusions du designer, seulement de quoi retrouver les fichiers.

## Entrées

- le **mode** : `cadrage`, `parcours` ou `maquette` ;
- les chemins : `specs/prd.md`, `specs/design.md`, et pour une fonctionnalité `specs/NNN-<nom>/spec.md`, ses parcours `specs/prototype/journeys/NNN-<nom>.md` et le prototype global `specs/prototype/`.

Rien d'autre. Si on t'a transmis l'avis du designer sur son travail, ignore-le.

## Méthode

1. Lis la référence : le PRD en mode `cadrage`, la spec (stories, scénarios `NNN-USx-ASy`, cas limites) et `specs/design.md` sinon.
2. Lis ce qui a été produit : `design.md` et le diff du thème (`ui.theme` de `.specify/stack.yml`, `git diff -- <fichier>`) ; ou les parcours ; ou les pages HTML créées ou modifiées (`git status -- specs/prototype/` et `git diff -- specs/prototype/`) et leurs captures dans `specs/prototype/captures/` (regarde les images, desktop et mobile).
3. Recalcule les contrastes toi-même, sans te fier aux chiffres du designer : chaque paire `--x` / `--x-foreground`, `--muted-foreground` sur `--background`, `--ring` et `--input` sur `--background` (3:1), et les états dérivés qu'utilisent les composants de la bibliothèque (`ui.components`) (survol, anneau… ; par exemple, avec Tailwind : `bg-primary/90`, `ring-ring/50`), en composant l'alpha en sRGB sur le fond réel, comme le navigateur. En mode `cadrage`, tout le thème est le livrable : chaque défaut est bloquant. En mode `maquette`, le thème ne l'est pas : un défaut du thème va dans « À vérifier par un humain », pour `/speckit-design`.
4. Une capture pleine page déplace les éléments `fixed` (toast, voile) au bas de la première fenêtre : jugez ces états sur les pages marquées `data-capture="viewport"`, ou dans la page elle-même.
5. Confronte le tout aux standards de [designer.md](designer.md#standards) et à la grille ci-dessous.

Tu ne modifies aucun fichier, ne commites rien, à une exception près : la commande `ui.prototype` de `.specify/stack.yml`, sans argument (absente : ne la lance pas, et dis-le), qui signale les liens morts et les pages orphelines, régénère `styles.css`, et avec `--capture` les captures, si elles manquent ou semblent périmées. Si ton outil la refuse (par exemple un bac à sable où une commande ne peut pas écrire), ne la contourne pas : juge sur les pages et les captures présentes, et note dans « À vérifier par un humain » que tu n'as pas pu les régénérer. Sinon, des commandes en lecture seulement (`git`).

## Grille

Ne signale que ces écarts. Chaque point est **bloquant** s'il est avéré.

**Couverture**

- Une exigence du PRD qui suppose une interface n'a rien dans le cadrage (mode `cadrage`).
- Une story ou un scénario d'acceptation visible à l'écran n'a pas d'étape de parcours ou pas d'écran.
- Un état vide, de chargement ou d'erreur manque à un écran qui en a besoin ; un cas limite de la spec n'est montré nulle part.
- Une étape de parcours mène à une impasse (lien manquant, pas de retour).

**Cohérence**

- Écart à `specs/design.md` (ton, densité, direction visuelle). Sans `specs/design.md`, ne juge que le respect des tokens, et note dans « À vérifier par un humain » que le cadrage manque.
- Couleur, rayon ou espacement hors des tokens du thème.
- Dans le prototype global : un écran qui existe déjà recopié sous un autre nom, un cadre d'app (en-tête, navigation) différent d'une page à l'autre, une page d'une autre fonctionnalité modifiée sans que les parcours le disent, ou la section d'une autre fonctionnalité de `index.html` changée.

**Accessibilité et mobile**

- Contraste sous 4,5:1 (texte) ou 3:1 (composants, focus).
- Champ ou bouton icône sans libellé ; information portée par la couleur seule.
- Écran illisible à 390 px, défilement horizontal hors tableau, action principale hors d'atteinte, cible tactile sous 24 px (sous 44 px pour une action principale sur mobile : à signaler, non bloquant).

**Standards**

- Écart avéré à un standard de `designer.md` (hiérarchie, formulaires, tableaux, textes d'interface, retours d'action).

## Hors grille

Un composant de la bibliothèque dessiné autrement que dans la bibliothèque va dans « À vérifier par un humain » : la commande le confronte au rapport du designer, que tu ne reçois pas.

Ne signale pas : les goûts personnels, un choix esthétique compatible avec le cadrage, des écrans ou fonctions « en plus » que la spec ne demande pas, la qualité du code HTML (il est jetable). Un relecteur trop zélé noie les vrais écarts.

À l'inverse, ne minimise pas un écart avéré : s'il laisse un scénario sans écran ou casse l'accessibilité, il est bloquant.

## Rapport

```
Mode : <cadrage | parcours | maquette>
Verdict : <aucun écart bloquant | N écart(s) bloquant(s)>

## Bloquants
1. <fichier, page ou capture> — <scénario, standard ou règle concernée>
   Constat : <ce que montre la page ou la capture, ou le contraste calculé>
   Attendu : <ce que demandent la spec, le cadrage ou le standard>

## À vérifier par un humain
- <doute que tu n'as pas pu trancher, et pourquoi>
```

Pas d'écart sans preuve : chaque constat cite la page, la capture, la ligne ou le calcul. Un doute que tu ne peux pas prouver va dans « À vérifier par un humain », pas dans les bloquants.
