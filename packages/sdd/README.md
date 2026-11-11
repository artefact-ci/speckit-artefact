# @artefact-ci/sdd

L'installeur de la méthode Artefact CI. Il installe Spec Kit 1.3.2 (via `uvx`), l'extension git, l'extension `artefact-product` et le preset `artefact-sdd`, réapplique les hooks git, génère les fichiers d'agent de l'outil du projet, puis déduit `stack.yml` et écrit la constitution de base. Il ne pose aucune question : il fait, puis affiche un rapport.

## Usage

```sh
npx @artefact-ci/sdd@X.Y.Z init   [--integration <outil>]
npx @artefact-ci/sdd@X.Y.Z update
```

Sans `--source`, l'installeur installe la release GitHub de sa propre version : le preset `artefact-sdd` et l'extension `artefact-product` du tag `vX.Y.Z`. Fixer la version dans la commande (`@X.Y.Z`) fixe donc celle de la méthode.

Pour développer la méthode, `--source` installe en `--dev` depuis un clone :

```sh
artefact-sdd init   --source <clone de speckit-artefact> [--integration <outil>]
artefact-sdd update --source <clone de speckit-artefact>
```

| Option | Rôle |
| --- | --- |
| `--source <dir>` | clone de `speckit-artefact` d'où l'extension (`extension/`) et le preset (`preset/`) sont installés en `--dev`, pour développer la méthode. Sans cette option, la release GitHub de la version de l'installeur est installée. |
| `--integration <outil>` | outil du projet pour `specify init` (`claude` par défaut). Ignoré quand `.specify/` existe : l'intégration du projet est gardée. Ignoré par `update`. |
| `--help` | affiche l'usage |

Il faut [uv](https://docs.astral.sh/uv/) et Node 24.11 ou plus. Depuis ce dépôt : `pnpm --filter @artefact-ci/sdd build`, puis `node packages/sdd/dist/cli.mjs init --source .` dans le projet.

## Ce que `init` touche

| Étape | Effet |
| --- | --- |
| Spec Kit | `specify init --here` si `.specify/` est absent, avec `--force` dès que le dossier n'est pas vide (`.git` compris) |
| Migration | si le preset `boilerplate` est installé, il est retiré (`specify preset remove boilerplate`) |
| Composants | extension git, `artefact-product`, `artefact-sdd` ; déjà installés, ils ne sont pas réinstallés (c'est le rôle d'`update`) |
| Hooks | clé `hooks:` de `.specify/extensions.yml` : les 10 hooks git du boilerplate ; le reste du fichier est gardé |
| Agents | `.claude/agents/<nom>.md` (Claude Code) et `.agents/agents/<nom>/agent.md` (Antigravity, relecteurs seulement) ; ces fichiers lisent les consignes de `.specify/extensions/artefact-product/agents/` |
| `stack.yml` | écrit seulement s'il est absent ; déduit de `nx.json`, `next.config.*`, `bun.lock` et du gestionnaire de paquets ; une clé non déduite reste vide avec `# à compléter` |
| Constitution | `.specify/memory/constitution.md` écrite seulement si elle est absente ou encore le gabarit vierge |
| Version | `.specify/artefact.json` (voir plus bas) |

Un dossier `docs/agents/` hérité du boilerplate n'est jamais supprimé : le rapport le liste comme obsolète et dit si chaque consigne est identique à celle du boilerplate ou modifiée sur place (à reporter alors dans les docs du projet).

`init` lancé deux fois de suite laisse `git status` vide la deuxième fois.

## La version installée : `.specify/artefact.json`

L'installeur enregistre la version de la méthode installée et sa source dans `.specify/artefact.json`, en JSON indenté de 2 espaces :

```json
{
  "version": "0.2.0",
  "source": "release"
}
```

`source` vaut `release` (zips de la release GitHub) ou `dev` (`--source`, la version est alors celle de `preset/preset.yml` du clone). Le fichier ne contient ni date ni chemin. Un fichier illisible ou incomplet arrête `init` et `update` avant toute commande Spec Kit, sans être réécrit.

`init` écrit ce fichier sur un projet neuf (aucun des deux composants installé) et le laisse tel quel quand il donne déjà la même version. Si `.specify/artefact.json` donne une autre version que celle de l'installeur, `init` refuse sans rien installer et renvoie vers `update`, seul à changer de version.

Un projet installé avant ce fichier (phase 4, avec `--source`) a déjà les composants mais pas `.specify/artefact.json` : `init` n'en écrit pas, et son rapport affiche « Version installée inconnue : lance update pour aligner tous les composants ». Lancer `update`, qui réinstalle tout et écrit le fichier.

`update` écrit toujours le fichier, et son rapport donne la version précédente. S'il installe une version plus ancienne que celle enregistrée, il prévient et continue.

## Ce que `update` touche

Il réinstalle l'extension et le preset, puis régénère les fichiers d'agent et réapplique les hooks. Quand `.specify/integration.json` liste plusieurs outils, il lance `specify integration use` pour chaque outil autre que celui par défaut, puis pour l'outil par défaut : Spec Kit n'enregistre les commandes de l'extension et du preset que pour l'outil sélectionné. L'outil par défaut ne change pas, même si un `use` échoue, et les scripts de `.specify/scripts/` gardent leurs droits. Sans `--source`, il les prend dans les zips de la release de sa version : `extension add --from <url du zip> --force` et `preset update artefact-sdd --from <url du zip>`. Avec `--source`, il les prend dans le clone en `--dev` : `extension add --dev … --force` et `preset update artefact-sdd --dev …` (soit un retrait puis un ajout). Si un téléchargement échoue (réseau coupé, version sans release), l'installeur s'arrête en citant l'URL du zip : relancer la même commande une fois le réseau rétabli. `installed_at` change dans les registres de `.specify/` : c'est attendu. Il ne touche jamais `stack.yml` ni la constitution, et s'arrête si `.specify/` est absent.
