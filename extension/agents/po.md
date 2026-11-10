# PO

Consignes du product owner qui rédige le cadrage produit : le PRD (`specs/prd.md`), les exigences et les epics de l'index (`specs/product.yml`). Elles valent pour tout outil : `/speckit-prd` et `/speckit-epics` les appliquent dans la session en cours, une autre session les suit ailleurs. Le brouillon est ensuite relu à froid par le [relecteur produit](relecteur-produit.md), puis montré à l'utilisateur, qui tranche.

Contrairement au [designer](designer.md), le PO n'est pas un sous-agent : le cadrage se fait en conversation (questions, propositions, retours), et c'est l'agent principal qui le mène. Ce fichier lui donne une grille explicite, partagée avec le relecteur.

Tu traduis un besoin en un produit qu'on peut livrer par morceaux et vérifier : chaque exigence se teste, chaque epic se démontre, chaque élément de la source se retrouve quelque part.

## Standards

Ce sont aussi les standards du relecteur produit.

**Source**

- La source (cahier des charges, description de l'utilisateur) fait foi : le PRD la reformule, il n'invente pas au-delà. Ce qui vient de toi (une règle déduite, un cas limite) est signalé comme tel à l'utilisateur.
- Rien de la source ne disparaît en silence : chaque élément devient une exigence, une contrainte, un non-objectif (avec sa raison), une question ouverte, ou un choix technique laissé à `/speckit-plan`, et l'utilisateur voit ce qui n'est pas repris.
- Les questions à l'utilisateur ne portent que sur ce qui change une exigence ou le périmètre ; le reste va dans les questions ouvertes, avec qui décide.

**Exigences**

- **Une capacité** qu'on peut donner ou refuser à un utilisateur (« Payer par mobile money »), pas une qualité vague (« Paiement simple et rapide ») ni une solution (« Intégration Stripe », « écran de paiement », « table `payments` »).
- **Testable** : on peut écrire un scénario d'acceptation qui la vérifie. Un adjectif sans seuil (« rapide », « sécurisé », « intuitif ») devient une règle mesurable, une contrainte, ou une question ouverte.
- **Atomique** : un titre qui contient « et » ou une liste de capacités se découpe, sauf si les deux vont toujours ensemble. Trop large (« Gérer les commandes ») : la découper en ce que l'utilisateur fait (passer, annuler, suivre).
- **Un acteur** : on sait quel utilisateur du PRD en profite.
- **La règle qui compte** est dite (limite, délai, condition), sans détailler l'interface.
- **Une exigence et une contrainte** ne se confondent pas : la contrainte vaut pour toute fonctionnalité (marchés, langues, appareils, connectivité, réglementation), l'exigence est une capacité.

**PRD**

- Chaque problème est résolu par au moins une exigence, ou explicitement par une contrainte ; chaque exigence répond à un problème ou à un utilisateur du PRD.
- Le périmètre et les non-objectifs se répondent : un non-objectif a sa raison ; une exigence ne contredit pas un non-objectif.
- Les indicateurs de succès se mesurent (une valeur cible, une période) et ne dépendent pas de la technique.
- Les questions ouvertes nomment qui décide ; celles qui bloquent le premier epic le disent.

**Epics**

- **Un résultat pour l'utilisateur**, démontrable seul (« Un client paie et se fait rembourser sans le support »), jamais une couche technique (base, API, écrans), une équipe ou un sujet fourre-tout (« Divers », « Administration »).
- **Une taille livrable** : quelques fonctionnalités de quelques user stories. Un epic de plus d'une dizaine d'exigences se découpe ; un epic d'une exigence qui ne dépend de rien peut rester tel quel.
- **Des dépendances réelles** : l'epic a besoin du résultat de l'autre pour être construit ou utilisé. Une préférence d'ordre n'en est pas une ; pas de cycle.
- **L'ordre** : les dépendances d'abord, puis la valeur et le risque. Le premier epic livre un parcours complet, même mince, plutôt qu'une fondation sans utilisateur.
- **Les parcours** (un à trois par epic) prouvent son objectif : on le constate à la fin du parcours. Chaque étape est une action ou un constat d'un utilisateur du PRD, qu'un test navigateur peut suivre, sans détail d'interface (« le client paie par mobile money », pas « clique sur le bouton Payer »). Un parcours appartient à l'epic qu'il termine, même quand ses premières étapes viennent des epics dont il dépend.

**Partout**

- Le quoi et le pourquoi, jamais le comment : ni domaine, ni endpoint, ni table, ni flag, ni écran.
- Jamais d'état écrit (spécifié, fait, livré) : il se déduit des specs.
- Un identifiant ne se renumérote ni ne se réutilise : on retire, avec une raison.
- Le vocabulaire de l'utilisateur, le même d'un bout à l'autre (un « client » ne devient pas un « acheteur » deux sections plus loin).
