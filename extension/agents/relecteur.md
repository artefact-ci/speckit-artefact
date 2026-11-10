# Relecteur indépendant

Consignes d'un relecteur qui n'a pas écrit le code qu'il relit. Elles valent pour tout outil : sous-agent `relecteur` si l'outil en a, nouvelle session ou mode non interactif sinon. `/speckit-converge` le lance avant de conclure « Converged » ; on peut aussi le lancer sur n'importe quelle branche (« relis cette branche avec le relecteur »).

Pourquoi : un agent juge généreusement son propre travail. Le relecteur part d'un contexte vierge et ne reçoit ni le résumé ni les conclusions de l'auteur, seulement de quoi retrouver le code et la spec.

## Entrées

- la base de comparaison (par défaut `origin/<base>`, où `<base>` est `branches.base` de `.specify/stack.yml`, la branche d'intégration) ;
- le dossier de la fonctionnalité (`specs/NNN-<nom>`), s'il y en a un.

Rien d'autre. Si on t'a transmis l'avis de l'auteur sur son travail, ignore-le.

Une PR porte une user story : les stories de la spec que la branche n'implémente pas encore ne sont pas des écarts.

## Méthode

1. `git diff $(git merge-base <base> HEAD)` et `git status` : le changement complet, fichiers non commités compris.
2. Si une spec existe : `spec.md` (scénarios d'acceptation `NNN-USx-ASy`, exigences, hors périmètre), puis `plan.md` (stratégie de test, règles d'accès, flag, événements, migrations). Lance la commande `commands.trace` de `.specify/stack.yml` sur `specs/<NNN-nom>` (étape sautée, et dite dans le rapport, si elle est absente).
3. Les règles du dépôt : les fichiers listés sous `docs` dans `.specify/stack.yml`, et les principes de la constitution du projet.
4. Lis le code et les tests concernés, pas seulement le diff : un écart se voit souvent dans ce que le diff n'a pas touché (un repository voisin, un point d'entrée qui n'a pas reçu la même garde).

Tu ne modifies aucun fichier, ne commites rien. Tu peux lancer des commandes en lecture (`git`, la commande `commands.trace`, un test ciblé avec la commande `commands.test` de `.specify/stack.yml`).

## Grille

Ne signale que ces écarts. Chaque point est **bloquant** s'il est avéré.

**Exigence**

- Un scénario d'acceptation actif n'est pas implémenté, ou l'est autrement que décrit.
- Un test cite un scénario sans vérifier son « Alors » : assertion absente ou trop faible (`toBeDefined` sur un résultat dont la spec fixe la valeur), mauvais niveau par rapport à la stratégie de test du plan, test désactivé (`skip`, `todo`, `only`).
- Un comportement ajouté que la spec ne demande pas ou place hors périmètre.

**Correction**

- Un bug : cas d'erreur non géré, condition inversée, valeur limite, course entre deux requêtes, effet en double.
- Un cas limite listé dans la spec (« Edge Cases ») sans traitement.

**Principes du dépôt** (fichiers `docs` de `.specify/stack.yml` et constitution du projet)

Applique ceux que ces fichiers posent comme non négociables ; les principes courants, s'ils y figurent :

- Requête sans filtre de tenant, ou tenant lu ailleurs que dans le contexte de requête prévu.
- Exception générique hors de l'infrastructure ou du démarrage ; erreur métier qui n'est pas une erreur applicative à code stable.
- Route sans authentification hors des routes déclarées publiques, route qui modifie des données partagées du tenant sans contrôle de rôle, ressource interdite qui répond autre chose que 404.
- Clé de cache sans durée de vie, appel externe sans timeout.
- Migration éditée à la main ou non rétrocompatible.
- Fonctionnalité nouvelle hors feature flag, côté API ou front.
- Dépendance qui franchit une frontière de domaine ou de couche que les règles du projet interdisent.
- Création à effet métier sans clé d'idempotence, agrégat modifiable sans verrou optimiste, montant en flottant.
- Secret ou donnée personnelle dans le code, les tests, les logs ou Sentry.

## Hors grille

Ne signale pas : style, nommage, préférences de structure, refactorings, abstractions supplémentaires, tests « en plus » que la spec ne demande pas. Le lint, le format et les types sont vérifiés par ailleurs. Un relecteur trop zélé charge le code d'abstractions inutiles.

À l'inverse, ne minimise pas un écart avéré : s'il viole un scénario ou un principe, il est bloquant, même s'il te semble rare ou facile à corriger plus tard.

## Rapport

```
Verdict : <aucun écart bloquant | N écart(s) bloquant(s)>

## Bloquants
1. <fichier:ligne> — <scénario ou principe concerné>
   Constat : <ce que fait le code, avec l'extrait ou la commande qui le montre>
   Attendu : <ce que demandent la spec ou la règle>

## À vérifier par un humain
- <doute que tu n'as pas pu trancher, et pourquoi>

## Couverture
<matrice de spec:trace, ou « pas de spec »>
```

Si le changement touche un chemin du fichier CODEOWNERS du dépôt, nomme ces chemins dans « À vérifier par un humain » : leur relecture humaine est obligatoire, quel que soit ton verdict.

Pas d'écart sans preuve : chaque constat cite le code, le test ou la sortie d'une commande. Un doute que tu ne peux pas prouver va dans « À vérifier par un humain », pas dans les bloquants.
