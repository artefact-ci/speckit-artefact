# examples/nx-preset/

Le preset local de nx-react-nestjs : ses templates de plan et de tâches, avec les sections Nx (Domains, Integration Events, Data & Migrations, Access Rules, Constitution Check I à VIII, chemins `libs/api/...`). Ils sont tels qu'ils étaient dans le preset `boilerplate` avant la phase 1. Installé au-dessus d'`artefact-sdd` (priorité 5 contre 10), il remplace ses deux templates génériques.

En phase 6a, ce dossier est copié dans `tools/spec-kit/preset/` du boilerplate, avec `.specify/stack.yml` tiré de [`examples/stack/nx.yml`](../stack/nx.yml) :

```sh
uvx --from specify-cli==1.3.2 specify preset add --dev tools/spec-kit/preset --priority 5
```

## Règles sorties du preset, à retrouver dans les docs du boilerplate

Les commandes d'`artefact-sdd` ne portent plus les règles propres au boilerplate : elles lisent les fichiers listés sous `docs` dans `stack.yml`. En phase 6a, vérifier que chacune y est. La colonne « Déjà cité » vient d'une recherche du mot-clé dans les docs, le 9 novembre 2026 : elle ne garantit pas que la règle y est complète.

| Règle (commande d'origine) | Déjà cité |
| --- | --- |
| Ordre de pagination `(created_at, id)` décroissant (plan) | `AGENTS.md` |
| Chemins sensibles de `CODEOWNERS` : identité, isolation tenant, garanties d'`api-core`, CI (plan) | `AGENTS.md` |
| Domaines d'exemple (`catalog`, `orders`, `notifications`, `storefront`, préfixe `PRD-`) et `pnpm strip:examples` avant la première feature (plan) | `AGENTS.md`, `docs/guides/methode.md` |
| Une dépendance s'ajoute dans la tâche de son premier import, sinon knip échoue (tasks) | `AGENTS.md` (knip) |
| Variable d'environnement : `.env.example` de l'app, `docs/reference/variables-environnement.md` (testé pour l'API et l'identité), `docker-compose.prod.yml` si requise en production (tasks) | `AGENTS.md` |
| Nouveau domaine par `pnpm new:domain`, nouvelle lib front par `pnpm new:web-feature` (tasks) | `AGENTS.md` |
| Route protégée sous `routes/_authenticated`, garde `requireFeature` (tasks) | `apps/web/AGENTS.md` |
| Nouvelle page : contrôle axe dans `accessibility.spec.ts`, flag dans `E2E_FEATURE_FLAGS` (tasks) | `apps/web/AGENTS.md` |
| Tests d'intégration avec Docker (Testcontainers) (implement) | `AGENTS.md` |
| Journeys Playwright lancés seulement si le front, l'API ou l'identité ont changé ; rapport dans `dist/.playwright/apps/web-e2e` (implement) | `AGENTS.md`, `apps/web/AGENTS.md` |
| Titres de test en anglais, même dans un fichier aux titres encore en français (implement) | `AGENTS.md` |
| Modèle tenant et lectures cross-tenant comme décisions de design (plan, analyze) | constitution (Tenant Isolation) |
| Police de `/speckit-design` : paquet `@fontsource-variable/<nom>` (ou `@fontsource/<nom>`) à la racine, `@import` en tête de `theme.css`, `--font-sans` dans le bloc `@theme inline`, paquet ajouté à `ignoreDependencies` de `knip.json` à côté de `tw-animate-css` ; tokens dans `:root` et `.dark` (design) | `AGENTS.md` cite fontsource ; la règle knip (`ignoreDependencies`) est à ajouter |
| Brouillon refusé : `git checkout -- theme.css package.json pnpm-lock.yaml knip.json`, puis `pnpm install` (design) | à ajouter (la commande générique le dit sans les noms de fichiers) |
| `specs/` n'est pas formaté par `pnpm format` (prototype) | `.prettierignore` exclut `specs/` |
| Plan confronté au code : routes et layouts de `apps/web/src/routes/`, facades, `api-core`, service d'identité ; une route sous `_authenticated` que le layout redirigerait (tasks, analyze) | `apps/web/AGENTS.md` (`_authenticated`) ; facades et `api-core` à vérifier |

## Constitution

Le socle d'`artefact-sdd` numérote ses principes I à IV (Test-First, Flagged Increments, Independent Review, Living Specs) ; les commandes les citent par leur nom. En phase 6a, la constitution du boilerplate garde ses principes propres (Tenant Isolation, Typed Business Errors, Secure by Default, Bounded External Calls, Generated Migrations, Domain Boundaries) après le socle, à partir de V : leurs numéros changent. Le Constitution Check de son `plan-template` et les docs du boilerplate qui citent un principe par son numéro (« constitution VIII ») suivent le nouvel ordre, ou le citent par son nom.
